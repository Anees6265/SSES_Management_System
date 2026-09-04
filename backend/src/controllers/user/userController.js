require("dotenv").config();
const User = require("../../models/user/user");
const Department = require("../../models/department/Department");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sendResetLinkEmail } = require("../../services/emailService");
const { getPermissionsForRole, allPermissions } = require("../../config/permissions");
const cloudinary = require("../../config/cloudinaryConfig");
const mongoose = require("mongoose");

// Builds the JWT payload — single source of truth used by login, refresh, and Google auth
const buildTokenPayload = (user) => ({
  id: user._id,
  role: user.role,
  name: user.name,
  department: user.department,
  departmentId: user.departmentId || null,
  permissions: user.permissions,
});

const generateAccessToken = (user) =>
  jwt.sign(buildTokenPayload(user), process.env.JWT_SECRET, { expiresIn: "1h" });

const generateRefreshToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

// CREATE USER
exports.createUser = async (req, res) => {
  try {
    let { profileImage, name, email, mobileNo, password, adharCard, department, position, role, isActive } = req.body;

    if (!name || !email || !mobileNo || !password || !adharCard || !position || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (["faculty", "hod"].includes(role) && !department) {
      return res.status(400).json({ message: "Department is required for faculty/HOD" });
    }

    const collegeEmailRegex = /^[a-zA-Z0-9._%+-]+@ssism\.org$/;
    if (!collegeEmailRegex.test(email)) {
      return res.status(400).json({ message: "Only institutional emails (@ssism.org) are allowed." });
    }

    email = email.toLowerCase();

    const allowedRoles = ["admin", "superadmin", "faculty", "hod", "placement_officer"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role. Only admin, superadmin, faculty, HOD, and Placement Officer are allowed." });
    }

    // Resolve departmentId from department name for department-scoped roles
    let departmentId = null;
    if (["faculty", "hod", "placement_officer"].includes(role) && department) {
      const deptDoc = await Department.findOne({ name: department, isActive: true }).select("_id");
      if (!deptDoc) return res.status(400).json({ message: "Selected department does not exist" });
      departmentId = deptDoc._id;
    }

    const newUserId = new mongoose.Types.ObjectId();
    let uploadedImageUrl = profileImage;
    if (profileImage && /^data:image\/(png|jpeg|jpg|gif);base64,/.test(profileImage)) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      const uploadResponse = await cloudinary.uploader.upload(profileImage, {
        folder: "user_profiles",
        public_id: `user_${newUserId}`,
        overwrite: true,
      });
      uploadedImageUrl = uploadResponse.secure_url;
    }

    const existing = await User.findOne({ $or: [{ email }, { adharCard }] });
    if (existing) return res.status(400).json({ message: "User with this email or Aadhar already exists." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const permissions = getPermissionsForRole(role);

    const newUser = new User({
      _id: newUserId,
      profileImage: uploadedImageUrl,
      name,
      email,
      mobileNo,
      password: hashedPassword,
      adharCard,
      department: department || "General",
      departmentId,
      position,
      role,
      permissions,
      isActive: isActive !== undefined ? isActive : true,
    });

    await newUser.save();

    res.status(201).json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully!`,
      user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role, isActive: newUser.isActive },
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;

    const collegeEmailRegex = /^[a-zA-Z0-9._%+-]+@ssism\.org$/;
    if (!collegeEmailRegex.test(email)) {
      return res.status(403).json({ message: "Only institutional emails (@ssism.org) are allowed to login." });
    }

    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    email = email.toLowerCase();
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });
    if (!user.isActive) return res.status(401).json({ message: "Account is inactive. Please contact administrator." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    // Self-healing: assign default permissions if missing, or merge new defaults
    const defaultPerms = getPermissionsForRole(user.role);
    if (!user.permissions || user.permissions.length === 0) {
      user.permissions = defaultPerms;
    } else {
      const userFeatureKeys = new Set(user.permissions.map((p) => p.feature));
      const missingPerms = defaultPerms.filter((p) => !userFeatureKeys.has(p.feature));
      if (missingPerms.length > 0) {
        user.permissions = [...user.permissions, ...missingPerms];
      }
    }

    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      message: "Login successful",
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        position: user.position,
        department: user.department,
        departmentId: user.departmentId,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// REFRESH ACCESS TOKEN
exports.refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: "Refresh token required" });

    const user = await User.findOne({ refreshToken });
    if (!user) return res.status(403).json({ message: "Invalid refresh token" });

    jwt.verify(refreshToken, process.env.JWT_SECRET, (err) => {
      if (err) return res.status(403).json({ message: "Invalid or expired refresh token" });

      // Include full payload so frontend has permissions after refresh
      const newAccessToken = generateAccessToken(user);
      res.status(200).json({ message: "Access token refreshed", accessToken: newAccessToken });
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// LOGOUT
exports.logout = async (req, res) => {
  try {
    const userId = req.body.id || req.body._id;
    if (!userId) return res.status(400).json({ message: "User ID is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.refreshToken = null;
    await user.save();
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET USER BY ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password -refreshToken -resetPasswordToken");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// UPDATE USER FIELDS
// When role changes, permissions are automatically synced to the new role's defaults
exports.updateUserFields = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { name, position, role, department, isActive, profileImage } = req.body;

    let uploadedImageUrl = profileImage;
    if (profileImage && /^data:image\/(png|jpeg|jpg|gif);base64,/.test(profileImage)) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      const uploadResponse = await cloudinary.uploader.upload(profileImage, {
        folder: "user_profiles",
        public_id: `user_${id}`,
        overwrite: true,
      });
      uploadedImageUrl = uploadResponse.secure_url;
    }

    const updateData = {
      ...(name && { name }),
      ...(position && { position }),
      ...(role && { role }),
      ...(department !== undefined && { department }),
      ...(typeof isActive === "boolean" && { isActive }),
      ...(profileImage && { profileImage: uploadedImageUrl }),
    };

    // When role changes, sync permissions to new role defaults
    if (role) {
      updateData.permissions = getPermissionsForRole(role);
    }

    // Resolve departmentId if role becomes department-scoped or department name changes
    let targetRole = role;
    let targetDept = department;
    
    if (!targetRole || !targetDept) {
      const existingUser = await User.findById(id).select("role department");
      if (existingUser) {
        if (!targetRole) targetRole = existingUser.role;
        if (!targetDept) targetDept = existingUser.department;
      }
    }

    if (["faculty", "hod", "placement_officer"].includes(targetRole)) {
      if (targetDept) {
        const deptDoc = await Department.findOne({ name: targetDept, isActive: true }).select("_id");
        if (deptDoc) {
          updateData.departmentId = deptDoc._id;
        } else {
          updateData.departmentId = null;
        }
      }
    } else {
      updateData.departmentId = null;
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .select("-password -refreshToken -resetPasswordToken");

    if (!updatedUser) return res.status(404).json({ success: false, message: "User not found" });

    res.status(200).json({ success: true, message: "User updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// DELETE USER
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "User not found" });

    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    user.resetTokenUsed = false;
    await user.save();

    await sendResetLinkEmail(email, token);
    res.status(200).json({ message: "Reset link sent to your email." });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || !confirmPassword) return res.status(400).json({ message: "Both fields are required" });
  if (newPassword !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.resetPasswordToken !== token || user.resetTokenUsed) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    if (user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ message: "Token has expired" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetTokenUsed = true;
    await user.save();

    res.status(200).json({ message: "Password successfully reset" });
  } catch {
    return res.status(400).json({ message: "Invalid or expired token" });
  }
};

// GOOGLE AUTH CALLBACK
exports.googleAuthCallback = async (req, res) => {
  try {
    const { _json } = req.user;
    const { sub, email, name } = _json;

    if (!email.endsWith("@ssism.org")) {
      return res.redirect(`${process.env.GOOGLE_REDIRECT_URI}?error=unauthorized&message=Only institutional emails are allowed`);
    }

    let user = await User.findOne({ email });

    if (!user) {
      const permissions = getPermissionsForRole("superadmin");
      user = await User.create({
        googleId: sub,
        email,
        name,
        role: "superadmin",
        permissions,
        position: "admin",
        department: "IT",
        mobileNo: "0000000000",
        adharCard: `GOOGLE_${sub}`,
        password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
        profileImage: _json.picture || "",
      });
    }

    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    const redirectUrl = `${process.env.GOOGLE_REDIRECT_URI}?token=${token}&refreshToken=${refreshToken}&userId=${user._id}&name=${encodeURIComponent(user.name)}&role=${user.role}&email=${user.email}&positionRole=${user.position || "admin"}&profileImage=${encodeURIComponent(user.profileImage || "")}`;
    return res.redirect(redirectUrl);
  } catch {
    return res.redirect(`${process.env.GOOGLE_REDIRECT_URI}?error=server_error&message=Login failed`);
  }
};

// GET CURRENT USER
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -refreshToken -resetPasswordToken");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET ALL USERS
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password -refreshToken -resetPasswordToken");
    res.status(200).json({ success: true, users, count: users.length });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET ALL POSSIBLE PERMISSIONS
exports.getAllPossiblePermissions = (req, res) => {
  res.status(200).json({ success: true, permissions: allPermissions });
};

// GET USER PERMISSIONS
exports.getUserPermissions = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("permissions");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ success: true, permissions: user.permissions });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// UPDATE USER PERMISSIONS (per-user override)
exports.updateUserPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { permissions },
      { new: true, runValidators: true }
    ).select("name role permissions");

    if (!updatedUser) return res.status(404).json({ success: false, message: "User not found" });

    res.status(200).json({ success: true, message: "User permissions updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
