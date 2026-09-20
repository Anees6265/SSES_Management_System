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

const escapeRegex = (str) => (str ? str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "");

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

    name = typeof name === "string" ? name.trim() : name;
    email = typeof email === "string" ? email.trim().toLowerCase() : email;
    mobileNo = mobileNo !== undefined && mobileNo !== null ? String(mobileNo).trim() : "";
    adharCard = adharCard !== undefined && adharCard !== null ? String(adharCard).trim() : "";
    position = typeof position === "string" ? position.trim() : position;
    role = typeof role === "string" ? role.trim().toLowerCase() : role;
    department = typeof department === "string" ? department.trim() : department;

    if (!name || !email || !mobileNo || !password || !adharCard || !position || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (["faculty", "hod"].includes(role) && (!department || department.toLowerCase() === "general")) {
      return res.status(400).json({ message: "Department is required for faculty/HOD" });
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNo)) {
      return res.status(400).json({ message: "Mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9." });
    }

    const aadharRegex = /^\d{12}$/;
    if (!aadharRegex.test(adharCard)) {
      return res.status(400).json({ message: "Aadhar card number must be exactly 12 digits." });
    }

    const collegeEmailRegex = /^[a-zA-Z0-9._%+-]+@ssism\.org$/;
    if (!collegeEmailRegex.test(email)) {
      return res.status(400).json({ message: "Only institutional emails (@ssism.org) are allowed." });
    }

    const allowedRoles = ["admin", "superadmin", "faculty", "hod", "placement_officer"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role. Only admin, superadmin, faculty, HOD, and Placement Officer are allowed." });
    }

    // Privilege Protection: Only superadmin can create superadmin or admin accounts.
    // Allow initial bootstrap if no users exist in the database yet.
    if (role === "superadmin" || role === "admin") {
      const existingUserCount = await User.countDocuments();
      if (existingUserCount > 0) {
        const authHeader = req.header("Authorization");
        let isSuperAdmin = false;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.split(" ")[1];
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.role === "superadmin") {
              isSuperAdmin = true;
            }
          } catch {
            isSuperAdmin = false;
          }
        }
        if (!isSuperAdmin) {
          return res.status(403).json({ message: "Only Superadmin can create admin or superadmin accounts." });
        }
      }
    }

    // Resolve departmentId from department name for department-scoped roles
    let departmentId = null;
    let resolvedDepartment = department || "General";

    if (["superadmin", "admin"].includes(role)) {
      resolvedDepartment = "SSISM";
      departmentId = null;
    } else if (department && department.toLowerCase() !== "general") {
      const isObjId = mongoose.Types.ObjectId.isValid(department) && /^[0-9a-fA-F]{24}$/.test(department);
      const queryOr = isObjId
        ? [{ _id: department }, { name: new RegExp(`^${escapeRegex(department)}$`, "i") }]
        : [{ name: new RegExp(`^${escapeRegex(department)}$`, "i") }];

      if (/^b\.?tech$/i.test(department)) {
        queryOr.push({ name: new RegExp("^B\\.?Tech$", "i") });
      }

      const deptDoc = await Department.findOne({
        isActive: true,
        $or: queryOr,
      }).select("_id name");

      if (deptDoc) {
        departmentId = deptDoc._id;
        resolvedDepartment = deptDoc.name;
      } else if (["faculty", "hod", "placement_officer"].includes(role)) {
        return res.status(400).json({ message: `Selected department "${department}" does not exist or is inactive.` });
      }
    }

    // Check for duplicate user across all unique fields (email, mobileNo, adharCard)
    const existing = await User.findOne({
      $or: [{ email }, { mobileNo }, { adharCard }],
    });

    if (existing) {
      if (existing.email && existing.email.toLowerCase() === email) {
        return res.status(400).json({ message: "A user with this email address already exists." });
      }
      if (existing.mobileNo && existing.mobileNo === mobileNo) {
        return res.status(400).json({ message: "A user with this mobile number already exists." });
      }
      if (existing.adharCard && existing.adharCard === adharCard) {
        return res.status(400).json({ message: "A user with this Aadhar number already exists." });
      }
      return res.status(400).json({ message: "User with this email, mobile number, or Aadhar already exists." });
    }

    const newUserId = new mongoose.Types.ObjectId();
    let uploadedImageUrl = profileImage;
    if (profileImage && typeof profileImage === "string" && /^data:image\/[a-zA-Z0-9+.-]+;(?:[^;]+;)*base64,/i.test(profileImage)) {
      try {
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
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
      } catch (cloudErr) {
        console.warn("Cloudinary upload failed in createUser (proceeding without image):", cloudErr.message);
        uploadedImageUrl = null;
      }
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const permissions = getPermissionsForRole(role);

    const newUser = new User({
      _id: newUserId,
      profileImage: uploadedImageUrl,
      name,
      email,
      mobileNo,
      password: hashedPassword,
      adharCard,
      department: resolvedDepartment,
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
    console.error("Error in createUser:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || "";
      const fieldMap = {
        email: "Email address",
        mobileNo: "Mobile number",
        adharCard: "Aadhar card number",
      };
      const label = fieldMap[field] || "A user with these details";
      return res.status(400).json({
        message: `${label} already exists in the system.`,
      });
    }
    if (error.name === "ValidationError") {
      const firstErr = Object.values(error.errors || {})[0];
      return res.status(400).json({ message: firstErr?.message || error.message });
    }
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
        department: ["superadmin", "admin"].includes(user.role) ? "SSISM" : user.department,
        departmentId: ["superadmin", "admin"].includes(user.role) ? null : user.departmentId,
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

    const requesterRole = req.user ? req.user.role : null;
    const requesterId = req.user ? (req.user.id || req.user._id) : null;
    const isSuperAdmin = requesterRole === "superadmin";
    const isAdmin = requesterRole === "admin";
    const isSelf = requesterId && requesterId.toString() === id.toString();

    // If caller is neither an administrator nor the account owner, forbid
    if (!isSuperAdmin && !isAdmin && !isSelf) {
      return res.status(403).json({ success: false, message: "Forbidden: You are not authorized to update another user's profile." });
    }

    const { name, position, role, department, isActive, profileImage, mobileNo, adharCard } = req.body;

    if (mobileNo !== undefined && mobileNo !== null && String(mobileNo).trim() !== "") {
      const cleanMobile = String(mobileNo).trim();
      if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
        return res.status(400).json({ success: false, message: "Mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9." });
      }
      const existingMobile = await User.findOne({ mobileNo: cleanMobile, _id: { $ne: id } });
      if (existingMobile) {
        return res.status(400).json({ success: false, message: "A user with this mobile number already exists." });
      }
    }

    if (adharCard !== undefined && adharCard !== null && String(adharCard).trim() !== "") {
      const cleanAdhar = String(adharCard).trim();
      if (!/^\d{12}$/.test(cleanAdhar)) {
        return res.status(400).json({ success: false, message: "Aadhar card number must be exactly 12 digits." });
      }
      const existingAdhar = await User.findOne({ adharCard: cleanAdhar, _id: { $ne: id } });
      if (existingAdhar) {
        return res.status(400).json({ success: false, message: "A user with this Aadhar number already exists." });
      }
    }

    // Privilege Escalation Protection:
    // Only superadmin or admin can change roles or status
    if (role !== undefined || isActive !== undefined) {
      if (!isSuperAdmin && !isAdmin) {
        return res.status(403).json({ success: false, message: "Forbidden: Only administrators can change role or account status." });
      }
      // Non-superadmins cannot grant or escalate to superadmin role
      if (role === "superadmin" && !isSuperAdmin) {
        return res.status(403).json({ success: false, message: "Forbidden: Only Superadmin can grant superadmin role." });
      }
    }

    let uploadedImageUrl = profileImage;
    if (profileImage && typeof profileImage === "string" && /^data:image\/[a-zA-Z0-9+.-]+;(?:[^;]+;)*base64,/i.test(profileImage)) {
      try {
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
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
      } catch (cloudErr) {
        console.warn("Cloudinary upload failed in updateUserFields:", cloudErr.message);
      }
    }

    const updateData = {
      ...(name && { name: typeof name === "string" ? name.trim() : name }),
      ...(mobileNo !== undefined && mobileNo !== null && { mobileNo: String(mobileNo).trim() }),
      ...(adharCard !== undefined && adharCard !== null && { adharCard: String(adharCard).trim() }),
      ...(position && { position: typeof position === "string" ? position.trim() : position }),
      ...(role && { role: typeof role === "string" ? role.trim().toLowerCase() : role }),
      ...(department !== undefined && { department: typeof department === "string" ? department.trim() : department }),
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

    if (["superadmin", "admin"].includes(targetRole)) {
      updateData.department = "SSISM";
      updateData.departmentId = null;
    } else if (["faculty", "hod", "placement_officer"].includes(targetRole)) {
      if (targetDept) {
        const deptDoc = await Department.findOne({
          isActive: true,
          name: new RegExp(`^${escapeRegex(targetDept)}$`, "i")
        }).select("_id");
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
    console.error("Error in updateUserFields:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || "";
      const fieldMap = {
        email: "Email address",
        mobileNo: "Mobile number",
        adharCard: "Aadhar card number",
      };
      const label = fieldMap[field] || "A user with these details";
      return res.status(400).json({
        success: false,
        message: `${label} already exists in the system.`,
      });
    }
    if (error.name === "ValidationError") {
      const firstErr = Object.values(error.errors || {})[0];
      return res.status(400).json({ success: false, message: firstErr?.message || error.message });
    }
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

    const requesterId = req.user ? (req.user.id || req.user._id) : null;
    if (requesterId && requesterId.toString() === id.toString()) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account." });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) return res.status(404).json({ success: false, message: "User not found" });

    if (targetUser.role === "superadmin") {
      const superAdminCount = await User.countDocuments({ role: "superadmin" });
      if (superAdminCount <= 1) {
        return res.status(400).json({ success: false, message: "Cannot delete the only Superadmin in the system." });
      }
    }

    await User.findByIdAndDelete(id);
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
  } catch (error) {
    console.error("Reset Password Error:", error);
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
      const permissions = getPermissionsForRole("faculty");
      user = await User.create({
        googleId: sub,
        email,
        name,
        role: "faculty",
        permissions,
        position: "Faculty",
        department: "General",
        mobileNo: "0000000000",
        adharCard: `GOOGLE_${sub}`,
        password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
        profileImage: _json.picture || "",
      });
    } else if (!user.googleId) {
      user.googleId = sub;
    }

    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    const redirectUrl = `${process.env.GOOGLE_REDIRECT_URI}?token=${token}&refreshToken=${refreshToken}&userId=${user._id}&name=${encodeURIComponent(user.name)}&role=${user.role}&email=${user.email}&positionRole=${user.position || "Faculty"}&profileImage=${encodeURIComponent(user.profileImage || "")}`;
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("Google Auth Callback Error:", error);
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
