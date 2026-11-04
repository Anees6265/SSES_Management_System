require("dotenv").config();
const User = require("../../models/user/user");
const Student = require("../../models/student/Student");
const Department = require("../../models/department/Department");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sendResetLinkEmail } = require("../../services/emailService");
const { getPermissionsForRole, allPermissions } = require("../../config/permissions");
const cloudinary = require("../../config/cloudinaryConfig");
const mongoose = require("mongoose");
const { logActivity } = require("../../services/activityLoggerService");

// In-memory brute force tracker (cleared every 15 minutes)
const failedAttemptsMap = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of failedAttemptsMap.entries()) {
    if (now - val.lastTime > 15 * 60 * 1000) {
      failedAttemptsMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

const recordLoginFailure = (key) => {
  const existing = failedAttemptsMap.get(key) || { count: 0, lastTime: Date.now() };
  existing.count += 1;
  existing.lastTime = Date.now();
  failedAttemptsMap.set(key, existing);
  return existing.count;
};

const clearLoginFailure = (key) => {
  failedAttemptsMap.delete(key);
};

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
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

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

    if (["faculty", "hod", "placement_officer", "coordinator"].includes(role) && (!department || department.toLowerCase() === "general")) {
      return res.status(400).json({ message: "Department is required for department staff roles" });
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

    const allowedRoles = ["admin", "superadmin", "faculty", "hod", "placement_officer", "coordinator"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role. Only admin, superadmin, faculty, HOD, Placement Officer, and Coordinator are allowed." });
    }

    // Privilege Protection:
    // If users exist, anonymous registration is blocked.
    // - Only Superadmin can create Superadmin or Admin accounts.
    // - Only Superadmin or Admin can create Faculty, HOD, or Placement Officer accounts.
    const existingUserCount = await User.countDocuments();
    if (existingUserCount > 0) {
      const authHeader = req.header("Authorization");
      let caller = null;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          caller = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
          caller = null;
        }
      }

      if (!caller) {
        return res.status(401).json({
          message: "Authentication required to create a user account. Anonymous registration is disabled."
        });
      }

      const callerRole = String(caller.role || "").toLowerCase();

      if (role === "superadmin" || role === "admin") {
        if (callerRole !== "superadmin") {
          return res.status(403).json({ message: "Only Superadmin can create admin or superadmin accounts." });
        }
      } else {
        if (!["superadmin", "admin"].includes(callerRole)) {
          return res.status(403).json({ message: "Only administrators can create staff accounts." });
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
      } else if (["faculty", "hod", "placement_officer", "coordinator"].includes(role)) {
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
    if (!user) {
      const fails = recordLoginFailure(email);
      logActivity({
        req,
        action: fails >= 5 ? "SECURITY_ALERT" : "LOGIN",
        module: "Auth",
        description: fails >= 5 ? `Repeated login failure (${fails} attempts) for email: ${email}` : `Failed login attempt for non-existent email: ${email}`,
        status: fails >= 5 ? "BLOCKED" : "FAILED",
        severity: fails >= 5 ? "CRITICAL" : "WARNING",
        isSecurityAlert: fails >= 5,
        threatType: fails >= 5 ? "BRUTE_FORCE" : null,
      });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      logActivity({
        req,
        user,
        action: "LOGIN",
        module: "Auth",
        description: `Inactive user ${user.email} attempted login`,
        status: "FAILED",
        severity: "WARNING",
      });
      return res.status(401).json({ message: "Account is inactive. Please contact administrator." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const fails = recordLoginFailure(email);
      logActivity({
        req,
        user: { name: user.name, email: user.email, role: user.role, department: user.department, departmentId: user.departmentId },
        action: fails >= 5 ? "SECURITY_ALERT" : "LOGIN",
        module: "Auth",
        description: fails >= 5 ? `Repeated incorrect password attempts (${fails}) for user: ${user.email}` : `Incorrect password attempt for user: ${user.email}`,
        status: fails >= 5 ? "BLOCKED" : "FAILED",
        severity: fails >= 5 ? "CRITICAL" : "WARNING",
        isSecurityAlert: fails >= 5,
        threatType: fails >= 5 ? "BRUTE_FORCE" : null,
      });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    clearLoginFailure(email);

    // Self-healing: assign default permissions if missing, or merge and upgrade defaults
    const defaultPerms = getPermissionsForRole(user.role);
    if (!user.permissions || user.permissions.length === 0) {
      user.permissions = defaultPerms;
    } else {
      const userPermMap = new Map();
      (user.permissions || []).forEach((p) => {
        if (p && p.feature) userPermMap.set(p.feature, new Set(p.access || []));
      });
      let permsChanged = false;
      for (const def of defaultPerms) {
        if (!userPermMap.has(def.feature)) {
          user.permissions.push(def);
          permsChanged = true;
        } else {
          const existingAccessSet = userPermMap.get(def.feature);
          const missingActions = (def.access || []).filter((a) => !existingAccessSet.has(a));
          if (missingActions.length > 0) {
            const targetPerm = user.permissions.find((p) => p.feature === def.feature);
            if (targetPerm) {
              targetPerm.access = Array.from(new Set([...(targetPerm.access || []), ...missingActions]));
              permsChanged = true;
            }
          }
        }
      }
      if (permsChanged) {
        user.markModified("permissions");
      }
    }

    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    logActivity({
      req,
      user,
      action: "LOGIN",
      module: "Auth",
      description: `${(user.role || "").toUpperCase()} ${user.name} logged into the system`,
      status: "SUCCESS",
      severity: "INFO",
    });

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

    logActivity({
      req,
      user,
      action: "LOGOUT",
      module: "Auth",
      description: `${(user.role || "").toUpperCase()} ${user.name} logged out`,
      status: "SUCCESS",
      severity: "INFO",
    });

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
    } else if (["faculty", "hod", "placement_officer", "coordinator"].includes(targetRole)) {
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
  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ message: "Email is required" });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Search in User collection (case-insensitive regex)
    const escapedEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let target = await User.findOne({
      email: { $regex: new RegExp(`^${escapedEmail}$`, "i") },
    });

    let isStudent = false;

    // 2. If not found in User, search in Student collection
    if (!target) {
      try {
        const Student = require("../../models/student/Student");
        target = await Student.findOne({
          email: { $regex: new RegExp(`^${escapedEmail}$`, "i") },
        });
        if (target) isStudent = true;
      } catch (findErr) {
        console.warn("Student lookup error in forgotPassword:", findErr.message);
      }
    }

    if (!target) {
      return res.status(404).json({ message: "No registered account found with this email address." });
    }

    const token = jwt.sign(
      { id: target._id, role: isStudent ? "student" : target.role, isStudent },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    target.resetPasswordToken = token;
    target.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    target.resetTokenUsed = false;
    await target.save();

    const origin =
      req.headers.origin ||
      (req.headers.referer ? new URL(req.headers.referer).origin : null);

    await sendResetLinkEmail(cleanEmail, token, origin);

    return res.status(200).json({
      success: true,
      message: "Password reset link sent to your email address.",
    });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || !confirmPassword) {
    return res.status(400).json({ message: "Both fields are required" });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let target = await User.findById(decoded.id);
    let isStudent = false;

    if (!target) {
      try {
        const Student = require("../../models/student/Student");
        target = await Student.findById(decoded.id);
        if (target) isStudent = true;
      } catch (err) {
        console.warn("Student findById error:", err.message);
      }
    }

    if (!target || target.resetPasswordToken !== token || target.resetTokenUsed) {
      return res.status(400).json({ message: "Invalid or already used reset token" });
    }
    if (target.resetPasswordExpires && target.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ message: "Reset token has expired. Please request a new link." });
    }

    target.password = await bcrypt.hash(newPassword, 10);
    target.resetTokenUsed = true;
    target.resetPasswordToken = null;
    target.resetPasswordExpires = null;
    await target.save();

    return res.status(200).json({
      success: true,
      message: "Password successfully reset! You can now log in.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(400).json({ message: "Invalid or expired token" });
  }
};

// CHANGE MY PASSWORD (Authenticated User)
exports.changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized. Please log in again." });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current password and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters long." });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "New passwords do not match." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ADMIN RESET USER PASSWORD (Admin / Superadmin only)
exports.adminResetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters long." });
    }

    const requesterRole = String(req.user?.role || "").toLowerCase().trim();
    if (!["superadmin", "admin"].includes(requesterRole)) {
      return res.status(403).json({ success: false, message: "Forbidden: Only administrators can reset user passwords." });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Non-superadmins cannot reset a superadmin's password
    if (targetUser.role === "superadmin" && requesterRole !== "superadmin") {
      return res.status(403).json({ success: false, message: "Forbidden: Only a Superadmin can reset another Superadmin's password." });
    }

    targetUser.password = await bcrypt.hash(newPassword, 10);
    targetUser.resetTokenUsed = true;
    targetUser.resetPasswordToken = null;
    targetUser.resetPasswordExpires = null;
    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: `Password for ${targetUser.name} has been reset successfully.`,
    });
  } catch (error) {
    console.error("Admin Reset Password Error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// GOOGLE AUTH CALLBACK
exports.googleAuthCallback = async (req, res) => {
  try {
    const profile = req.user || {};
    const _json = profile._json || {};
    const email = _json.email || (profile.emails && profile.emails[0]?.value);
    const sub = _json.sub || profile.id;
    const name = _json.name || profile.displayName || (email ? email.split("@")[0] : "User");
    const picture = _json.picture || (profile.photos && profile.photos[0]?.value) || "";

    if (!email) {
      const fallback = process.env.GOOGLE_REDIRECT_URI || "http://localhost:5173/google-success";
      return res.redirect(`${fallback}?error=missing_profile&message=${encodeURIComponent("Could not retrieve profile/email from Google.")}`);
    }

    const cleanEmail = email.toLowerCase().trim();

    // Determine redirect base from state or env
    let redirectBase = "";
    if (req.query.state) {
      try {
        const decodedState = JSON.parse(Buffer.from(req.query.state, "base64").toString("utf-8"));
        if (decodedState?.origin) {
          redirectBase = `${decodedState.origin}/google-success`;
        }
      } catch (e) {
        // ignore state decode error
      }
    }

    if (!redirectBase) {
      redirectBase = process.env.GOOGLE_REDIRECT_URI;
      if (!redirectBase || redirectBase.includes("your-backend-vercel-url")) {
        redirectBase = "http://localhost:5173/google-success";
      }
    }

    // 1. Check if user exists in User collection
    let user = await User.findOne({ email: cleanEmail });

    // 2. Check if student exists in Student collection
    let student = null;
    if (!user) {
      student = await Student.findOne({ email: cleanEmail });
    }

    const isInstitutional = cleanEmail.endsWith("@ssism.org");

    // If neither exists in DB and not an institutional email, disallow unauthorized self-signup
    if (!user && !student && !isInstitutional) {
      return res.redirect(
        `${redirectBase}?error=unauthorized&message=${encodeURIComponent(
          "Your Google email is not registered in the system. Please use your institutional (@ssism.org) email or contact admin."
        )}`
      );
    }

    // A. Student Login
    if (student) {
      if (!student.googleId && sub) {
        student.googleId = sub;
        await student.save();
      }
      const token = jwt.sign(
        { id: student._id, prkey: student.prkey, role: "student" },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
      const refreshToken = jwt.sign(
        { id: student._id, role: "student" },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
      const studentName = `${student.firstName || ""} ${student.lastName || ""}`.trim() || student.email;
      const redirectUrl = `${redirectBase}?token=${token}&refreshToken=${refreshToken}&userId=${student._id}&name=${encodeURIComponent(studentName)}&role=student&email=${encodeURIComponent(student.email)}&isStudent=true&profileImage=${encodeURIComponent(student.image || picture || "")}`;
      return res.redirect(redirectUrl);
    }

    // B. Staff/Admin/Faculty Login or Self-Registration for @ssism.org
    if (!user && isInstitutional) {
      let deptName = "SSISM";
      let deptId = null;
      try {
        const foundDept = await Department.findOne();
        if (foundDept) {
          deptId = foundDept._id;
          deptName = foundDept.name || "SSISM";
        }
      } catch (dErr) {
        // ignore
      }

      const permissions = getPermissionsForRole("faculty");
      user = await User.create({
        googleId: sub,
        email: cleanEmail,
        name: name || cleanEmail.split("@")[0],
        role: "faculty",
        permissions,
        position: "Faculty",
        department: deptName,
        departmentId: deptId,
        mobileNo: "0000000000",
        adharCard: `GOOGLE_${sub || Date.now()}`,
        password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
        profileImage: picture || "",
      });
    } else if (user && !user.googleId && sub) {
      user.googleId = sub;
      await user.save();
    }

    if (user && user.isActive === false) {
      return res.redirect(`${redirectBase}?error=inactive&message=${encodeURIComponent("Your account is deactivated. Contact administrator.")}`);
    }

    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    const redirectUrl = `${redirectBase}?token=${token}&refreshToken=${refreshToken}&userId=${user._id}&name=${encodeURIComponent(user.name)}&role=${user.role}&email=${encodeURIComponent(user.email)}&positionRole=${encodeURIComponent(user.position || "Faculty")}&department=${encodeURIComponent(user.department || "SSISM")}&profileImage=${encodeURIComponent(user.profileImage || "")}`;
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("Google Auth Callback Error:", error);
    const fallbackBase = process.env.GOOGLE_REDIRECT_URI || "http://localhost:5173/google-success";
    return res.redirect(`${fallbackBase}?error=server_error&message=${encodeURIComponent("Login failed due to server error: " + (error?.message || ""))}`);
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
    let filter = {};
    const requesterRole = String(req.user?.role || "").toLowerCase().trim();
    const isDeptStaff = ["hod", "faculty", "placement_officer", "coordinator"].includes(requesterRole);

    if (isDeptStaff) {
      // Find staff department info from DB to guarantee freshest data
      const callerUser = await User.findById(req.user.id || req.user._id).select("department departmentId");
      const deptName = callerUser?.department || req.user.department;
      const deptId = callerUser?.departmentId || req.user.departmentId;

      const deptConditions = [];
      if (deptId) {
        deptConditions.push({ departmentId: deptId });
      }
      if (deptName && deptName.toLowerCase() !== "general") {
        deptConditions.push({ department: new RegExp(`^${escapeRegex(deptName)}$`, "i") });
      }

      filter = {
        role: { $ne: "superadmin" },
        ...(deptConditions.length > 0 ? { $or: deptConditions } : { department: deptName })
      };
    }

    const users = await User.find(filter).select("-password -refreshToken -resetPasswordToken");
    res.status(200).json({ success: true, users, count: users.length });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET ALL POSSIBLE PERMISSIONS
exports.getAllPossiblePermissions = async (req, res) => {
  try {
    const requesterRole = String(req.user?.role || "").toLowerCase().trim();
    const isDeptStaff = ["hod", "faculty", "placement_officer", "coordinator"].includes(requesterRole);

    if (isDeptStaff) {
      // Fetch caller's own current permissions
      const callerUser = await User.findById(req.user.id || req.user._id).select("permissions");
      const userPerms = callerUser?.permissions || [];
      const masterList = allPermissions.superadmin || [];

      // Build master list strictly bounded by caller's own features and access types
      const deptBoundList = [];

      for (const uPerm of userPerms) {
        if (!uPerm.access || !Array.isArray(uPerm.access) || uPerm.access.length === 0) continue;
        const meta = masterList.find((m) => m.feature === uPerm.feature);
        const allowedAccess = meta
          ? uPerm.access.filter((a) => meta.access.includes(a))
          : uPerm.access;

        if (allowedAccess.length > 0) {
          deptBoundList.push({
            feature: uPerm.feature,
            name: meta?.name || uPerm.feature.replace(/^(Page|Tab|Button|Action)_/, '').replace(/([A-Z])/g, ' $1').trim(),
            category: meta?.category || "Other Features",
            description: meta?.description || uPerm.description || "",
            access: allowedAccess,
          });
        }
      }

      return res.status(200).json({
        success: true,
        permissions: {
          superadmin: deptBoundList,
          hod: deptBoundList,
          faculty: deptBoundList,
          placement_officer: deptBoundList,
          coordinator: deptBoundList,
        },
      });
    }

    res.status(200).json({ success: true, permissions: allPermissions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// GET USER PERMISSIONS
exports.getUserPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "User not found" });
    }

    const targetUser = await User.findById(id).select("permissions role department departmentId");
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    const requesterRole = String(req.user?.role || "").toLowerCase().trim();
    const isDeptStaff = ["hod", "faculty", "placement_officer", "coordinator"].includes(requesterRole);

    // Department Scoping Check
    if (isDeptStaff) {
      const callerUser = await User.findById(req.user.id || req.user._id).select("department departmentId");
      const callerDept = (callerUser?.department || req.user.department || "").toLowerCase().trim();
      const callerDeptId = callerUser?.departmentId || req.user.departmentId;

      const targetDept = (targetUser.department || "").toLowerCase().trim();
      const isSameDept =
        (callerDeptId && targetUser.departmentId && String(callerDeptId) === String(targetUser.departmentId)) ||
        (callerDept && targetDept && callerDept === targetDept);

      if (!isSameDept || targetUser.role === "superadmin") {
        return res.status(403).json({
          success: false,
          message: "You can only view permissions for staff members within your department."
        });
      }
    }

    res.status(200).json({ success: true, permissions: targetUser.permissions });
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

    const targetUser = await User.findById(id);
    if (!targetUser) return res.status(404).json({ success: false, message: "User not found" });

    let finalPermissions = permissions;
    const requesterRole = String(req.user?.role || "").toLowerCase().trim();
    const isDeptStaff = ["hod", "faculty", "placement_officer", "coordinator"].includes(requesterRole);

    // Department Staff Privilege & Boundary Check
    if (isDeptStaff) {
      const callerUser = await User.findById(req.user.id || req.user._id).select("department departmentId permissions");
      if (!callerUser) {
        return res.status(403).json({ success: false, message: "Unauthorized account." });
      }

      const callerDept = (callerUser.department || req.user.department || "").toLowerCase().trim();
      const callerDeptId = callerUser.departmentId || req.user.departmentId;

      const targetDept = (targetUser.department || "").toLowerCase().trim();
      const isSameDept =
        (callerDeptId && targetUser.departmentId && String(callerDeptId) === String(targetUser.departmentId)) ||
        (callerDept && targetDept && callerDept === targetDept);

      if (!isSameDept || ["superadmin", "admin"].includes(targetUser.role)) {
        return res.status(403).json({
          success: false,
          message: "You can only manage permissions for staff members within your department."
        });
      }

      // Map caller's own permissions into a map of feature -> Set of allowed actions
      const callerPermissionMap = new Map();
      (callerUser.permissions || []).forEach((p) => {
        if (p.feature && Array.isArray(p.access) && p.access.length > 0) {
          callerPermissionMap.set(p.feature, new Set(p.access));
        }
      });

      // Strict Ceiling Enforcement:
      // Verify that no requested permission contains any feature or action that the caller does not possess
      for (const pReq of (permissions || [])) {
        if (!pReq.feature || !Array.isArray(pReq.access) || pReq.access.length === 0) continue;
        const callerAllowedActions = callerPermissionMap.get(pReq.feature);
        if (!callerAllowedActions || callerAllowedActions.size === 0) {
          return res.status(403).json({
            success: false,
            message: `Forbidden: You cannot grant access to "${pReq.feature}" as you do not possess permissions for this feature.`
          });
        }
        for (const action of pReq.access) {
          if (!callerAllowedActions.has(action)) {
            return res.status(403).json({
              success: false,
              message: `Forbidden: You cannot grant "${action}" access for "${pReq.feature}" as you do not possess this privilege.`
            });
          }
        }
      }

      // Preserve any permissions the target user has for features outside the caller's authority
      const preservedPermissions = (targetUser.permissions || []).filter(
        (p) => !callerPermissionMap.has(p.feature)
      );

      // Filter incoming permissions to valid scoped permissions
      const updatedScopedPermissions = [];
      for (const pReq of (permissions || [])) {
        if (!pReq.feature || !callerPermissionMap.has(pReq.feature)) continue;
        const callerAllowedActions = callerPermissionMap.get(pReq.feature);
        const validAccess = (pReq.access || []).filter((a) => callerAllowedActions.has(a));
        if (validAccess.length > 0) {
          updatedScopedPermissions.push({
            feature: pReq.feature,
            description: pReq.description || "",
            access: validAccess,
          });
        }
      }

      finalPermissions = [...preservedPermissions, ...updatedScopedPermissions];
    }

    targetUser.permissions = finalPermissions;
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: "User permissions updated successfully",
      user: {
        id: targetUser._id,
        name: targetUser.name,
        role: targetUser.role,
        permissions: targetUser.permissions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
