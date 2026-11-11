const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Student = require("../../models/student/Student");
const StudentEventLog = require("../../models/student/StudentEventLog");
const cloudinary = require("../../config/cloudinaryConfig");
const User = require("../../models/user/user");
const SubDepartment = require("../../models/department/SubDepartment");
const { logActivity } = require("../../services/activityLoggerService");

// ✅ Student Login (Only Student Email + Password)
exports.studentLogin = async (req, res) => {
  try {
    const rawEmail = req.body.email || req.body.prkey;
    const { password } = req.body;
    if (!rawEmail || !password)
      return res.status(400).json({ message: "Student email and password are required" });

    const trimmedEmail = String(rawEmail).trim().toLowerCase();

    // Check if input is a valid @ssism.org email
    if (!/^[a-zA-Z0-9._%+-]+@ssism\.org$/i.test(trimmedEmail)) {
      return res.status(400).json({
        message: "Students can only login using their official @ssism.org email address"
      });
    }

    const student = await Student.findOne({
      email: { $regex: new RegExp(`^${trimmedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") }
    })
      .populate("subDepartmentId", "name")
      .populate("sessionId", "name")
      .populate("currentLevelId", "name order")
      .populate("currentSubLevelId", "name order");

    if (!student)
      return res.status(404).json({ message: "Student not found with this email" });

    if (student.status === "Dropped")
      return res.status(403).json({ message: "Your account has been deactivated. Contact admin." });

    let isMatch = false;
    if (student.password) {
      // If student has a password set, strictly verify with bcrypt hash
      isMatch = await bcrypt.compare(password, student.password);
    } else {
      // Default initial password only for first-time login when password is not yet set
      if (password === "ssism@123") {
        isMatch = true;
      }
    }

    if (!isMatch) {
      logActivity({
        req,
        user: {
          id: student._id,
          name: `${student.firstName || ""} ${student.lastName || ""}`.trim() || student.email,
          email: student.email,
          role: "student",
          department: student.subDepartmentId?.name || "Student",
        },
        action: "LOGIN",
        module: "Auth",
        description: `Failed student login attempt for ${student.email}`,
        status: "FAILED",
        severity: "WARNING",
      });
      return res.status(401).json({ message: "Invalid credentials" });
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

    const isDefaultPassword = (password === "ssism@123");

    // Log student login in ActivityLog
    logActivity({
      req,
      user: {
        id: student._id,
        name: `${student.firstName || ""} ${student.lastName || ""}`.trim() || student.email,
        email: student.email,
        role: "student",
        department: student.subDepartmentId?.name || "Student",
        departmentId: student.subDepartmentId?._id || null,
      },
      action: "LOGIN",
      module: "Auth",
      description: `Student ${student.firstName || ""} ${student.lastName || ""} (${student.email}) logged in`,
      status: "SUCCESS",
      severity: "INFO",
    });

    return res.status(200).json({
      message: "Login successful",
      token,
      refreshToken,
      mustChangePassword: isDefaultPassword,
      student: {
        _id: student._id,
        prkey: student.prkey,
        firstName: student.firstName,
        lastName: student.lastName,
        fatherName: student.fatherName || "",
        motherName: student.motherName || "",
        parentMobile: student.parentMobile || student.fatherContactNumber || "",
        email: student.email,
        studentMobile: student.studentMobile,
        image: student.image,
        course: student.course,
        status: student.status,
        isFTP: student.isFTP,
        subDepartmentId: student.subDepartmentId,
        sessionId: student.sessionId,
        currentLevelId: student.currentLevelId,
        currentSubLevelId: student.currentSubLevelId,
        mustChangePassword: isDefaultPassword,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Set / Reset Student Password (Admin only)
exports.setStudentPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    const hashed = await bcrypt.hash(password, 10);
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { password: hashed },
      { new: true }
    ).select("_id prkey firstName lastName");

    if (!student) return res.status(404).json({ message: "Student not found" });

    return res.status(200).json({ message: "Password set successfully", data: student });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get My Profile (Student)
exports.getMyProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id)
      .populate({
        path: "subDepartmentId",
        select: "name departmentId",
        populate: {
          path: "departmentId",
          select: "name code reportConfig logo"
        }
      })
      .populate("sessionId", "name")
      .populate("syllabusVersionId", "version title")
      .populate("currentLevelId", "name order")
      .populate("currentSubLevelId", "name order")
      .populate("permissions.assignedFacultyId", "name role position email")
      .select("-password");

    if (!student) return res.status(404).json({ message: "Student not found" });

    // Attach placement data
    const StudentPlacement = require("../../models/placement/StudentPlacement");
    const placement = await StudentPlacement.findOne({ studentId: req.user.id })
      .select("readinessStatus placedInfo PlacementinterviewRecord resumeURL");

    const leaveRequests = Array.isArray(student.permissions) ? student.permissions : (student.permissionDetails?.status ? [student.permissionDetails] : []);
    const leaveStats = {
      total: leaveRequests.length,
      approved: leaveRequests.filter(p => (p.status || "").toLowerCase() === "approved").length,
      rejected: leaveRequests.filter(p => (p.status || "").toLowerCase() === "rejected").length,
      pending: leaveRequests.filter(p => (p.status || "").toLowerCase() === "pending").length,
    };

    return res.status(200).json({
      data: {
        ...student.toObject(),
        placement: placement || null,
        leaveStats,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Update My Profile Image (Student)
exports.updateMyProfileImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: "Image is required" });
    if (!/^data:image\/[a-zA-Z0-9+.-]+;(?:[^;]+;)*base64,/i.test(image))
      return res.status(400).json({ message: "Invalid image format. Supported formats: PNG, JPEG, JPG, WEBP, GIF" });

    // Validate payload size (Max 3MB)
    const base64Data = image.split(",")[1] || "";
    const sizeInBytes = (base64Data.length * 3) / 4;
    if (sizeInBytes > 3 * 1024 * 1024) {
      return res.status(400).json({ message: "Profile image exceeds the 3 MB size limit" });
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: "student_profiles",
      public_id: `student_${req.user.id}`,
      overwrite: true,
    });

    const student = await Student.findByIdAndUpdate(
      req.user.id,
      { image: uploadResponse.secure_url },
      { new: true }
    ).select("_id image");

    return res.status(200).json({ message: "Profile image updated", imageURL: student.image });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Change My Password (Student)
exports.changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "currentPassword and newPassword are required" });
    if (newPassword.length < 6)
      return res.status(400).json({ message: "New password must be at least 6 characters" });

    const student = await Student.findById(req.user.id).select("password");
    if (!student) return res.status(404).json({ message: "Student not found" });

    let isMatch = false;
    if (student.password) {
      isMatch = await bcrypt.compare(currentPassword, student.password);
    } else {
      // Allow initial default password if password was not set yet
      isMatch = (currentPassword === "ssism@123");
    }

    if (!isMatch) return res.status(401).json({ message: "Current password is incorrect" });

    student.password = await bcrypt.hash(newPassword, 10);
    await student.save();

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get My Tasks (Student)
exports.getMyTasks = async (req, res) => {
  try {
    const SyllabusVersion = require("../../models/syllabus/SyllabusVersion");
    const StudentTask = require("../../models/syllabus/StudentTask");
    const Level = require("../../models/department/Level");
    const mongoose = require("mongoose");

    const student = await Student.findById(req.user.id)
      .populate("currentLevelId", "name order subDepartmentId")
      .populate("currentSubLevelId", "name order levelId")
      .populate("sessionId", "name");

    if (!student) return res.status(404).json({ message: "Student not found" });

    // Ensure currentLevelId and currentSubLevelId stay in sync
    if (student.currentSubLevelId?.levelId) {
      const parentLevelId = student.currentSubLevelId.levelId._id || student.currentSubLevelId.levelId;
      if (!student.currentLevelId || student.currentLevelId._id.toString() !== parentLevelId.toString()) {
        const actualLevel = await Level.findById(parentLevelId).lean();
        if (actualLevel) {
          student.currentLevelId = actualLevel;
        }
      }
    }

    const currentSubLevelId = student.currentSubLevelId?._id || student.currentSubLevelId;
    const currentLevelId = student.currentLevelId?._id || student.currentLevelId;
    const currentSessionId = student.sessionId?._id || student.sessionId;
    const studentCourse = (student.course || "").trim();

    const { status, subLevelId } = req.query;
    const targetSubLevelId = subLevelId || currentSubLevelId;

    // 1. Resolve Current Syllabus Version strictly matching the student's current sublevel/level
    let currentSyllabusId = student.syllabusVersionId;

    // Check if student.syllabusVersionId matches the current sublevel
    if (currentSyllabusId) {
      const sv = await SyllabusVersion.findById(currentSyllabusId).lean();
      if (!sv || (currentSubLevelId && sv.subLevelId?.toString() !== currentSubLevelId.toString())) {
        currentSyllabusId = null;
      }
    }

    // Check if student already has active tasks for current sublevel pointing to a syllabusVersion
    if (!currentSyllabusId && currentSubLevelId) {
      const taskWithSv = await StudentTask.findOne({
        studentId: student._id,
        subLevelId: currentSubLevelId,
        syllabusVersionId: { $ne: null },
        isActive: { $ne: false },
      }).select("syllabusVersionId").lean();

      if (taskWithSv?.syllabusVersionId) {
        const svFromTask = await SyllabusVersion.findById(taskWithSv.syllabusVersionId).lean();
        if (svFromTask && svFromTask.subLevelId?.toString() === currentSubLevelId.toString()) {
          currentSyllabusId = svFromTask._id;
        }
      }
    }

    // Search active SyllabusVersion by subLevelId with course priority
    if (!currentSyllabusId && currentSubLevelId) {
      const courseConditions = studentCourse && studentCourse !== "All"
        ? [{ courses: studentCourse }, { courses: "All" }, { course: studentCourse }, { course: "All" }, { courses: { $size: 0 } }, { courses: { $exists: false } }]
        : [];

      let sv = null;
      if (currentSessionId && courseConditions.length > 0) {
        sv = await SyllabusVersion.findOne({
          subLevelId: currentSubLevelId,
          sessionId: currentSessionId,
          status: "active",
          isActive: true,
          $or: courseConditions,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }

      if (!sv && currentSessionId) {
        sv = await SyllabusVersion.findOne({
          subLevelId: currentSubLevelId,
          sessionId: currentSessionId,
          status: "active",
          isActive: true,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }

      if (!sv && currentSessionId) {
        sv = await SyllabusVersion.findOne({
          subLevelId: currentSubLevelId,
          sessionId: currentSessionId,
          isActive: true,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }

      if (!sv && courseConditions.length > 0) {
        sv = await SyllabusVersion.findOne({
          subLevelId: currentSubLevelId,
          status: "active",
          isActive: true,
          $or: courseConditions,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }

      if (!sv) {
        sv = await SyllabusVersion.findOne({
          subLevelId: currentSubLevelId,
          status: "active",
          isActive: true,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }

      if (!sv) {
        sv = await SyllabusVersion.findOne({
          subLevelId: currentSubLevelId,
          isActive: true,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }

      if (!sv) {
        sv = await SyllabusVersion.findOne({
          subLevelId: currentSubLevelId,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }

      if (sv) {
        currentSyllabusId = sv._id;
      }
    }

    // Fallback: search by levelId if sublevel has no syllabus
    if (!currentSyllabusId && currentLevelId) {
      let sv = null;
      if (currentSessionId) {
        sv = await SyllabusVersion.findOne({
          levelId: currentLevelId,
          sessionId: currentSessionId,
          status: "active",
          isActive: true,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }
      if (!sv) {
        sv = await SyllabusVersion.findOne({
          levelId: currentLevelId,
          isActive: true,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }
      if (!sv) {
        sv = await SyllabusVersion.findOne({
          levelId: currentLevelId,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }
      if (sv) {
        currentSyllabusId = sv._id;
      }
    }

    // Self-heal: update student's syllabusVersionId to the current active syllabus
    if (currentSyllabusId && (!student.syllabusVersionId || student.syllabusVersionId.toString() !== currentSyllabusId.toString())) {
      Student.findByIdAndUpdate(student._id, { $set: { syllabusVersionId: currentSyllabusId } }).exec();
    }

    // 2. Auto-assign tasks if student has 0 tasks assigned for current level/sublevel
    if (currentSyllabusId) {
      const currentTasksCount = await StudentTask.countDocuments({
        studentId: student._id,
        isActive: { $ne: false },
        $or: [
          ...(targetSubLevelId ? [{ subLevelId: targetSubLevelId }] : []),
          { syllabusVersionId: currentSyllabusId }
        ]
      });

      if (currentTasksCount === 0) {
        try {
          const { assignTasksToStudent } = require("../../services/taskAssignmentService");
          await assignTasksToStudent(student._id, currentSyllabusId, {
            student,
            allowSessionMismatch: true,
            allowLevelMismatch: true
          });
        } catch (assignErr) {
          console.error("Auto-assign tasks in getMyTasks error:", assignErr.message);
        }
      }
    }

    // 3. Build filter for fetching current level tasks
    const filter = {
      studentId: student._id,
      isActive: { $ne: false },
      isArchived: { $ne: true },
    };

    if (status) filter.status = status;

    if (subLevelId) {
      filter.subLevelId = subLevelId;
    } else {
      const currentOrConditions = [];

      if (targetSubLevelId) {
        currentOrConditions.push({ subLevelId: targetSubLevelId });
      }
      if (currentSyllabusId) {
        currentOrConditions.push({ syllabusVersionId: currentSyllabusId });
      }
      if (student.syllabusVersionId) {
        currentOrConditions.push({ syllabusVersionId: student.syllabusVersionId });
      }
      if (currentLevelId) {
        currentOrConditions.push({
          levelId: currentLevelId,
          subLevelId: null,
          $or: [{ isExtra: true }, { isGeneralTask: true }]
        });
        currentOrConditions.push({
          levelId: currentLevelId,
          subLevelId: { $exists: false },
          $or: [{ isExtra: true }, { isGeneralTask: true }]
        });
        if (targetSubLevelId) {
          currentOrConditions.push({ levelId: currentLevelId, subLevelId: targetSubLevelId });
        }
      }

      if (currentOrConditions.length === 0) {
        currentOrConditions.push({ isExtra: true }, { isGeneralTask: true });
      }

      filter.$or = currentOrConditions;
    }

    let tasks = await StudentTask.find(filter).sort({ assignedAt: -1, createdAt: -1 });

    // Fallback: If 0 tasks found and no specific subLevelId query was given, check by currentLevelId
    if (tasks.length === 0 && !subLevelId && currentLevelId) {
      const levelTasks = await StudentTask.find({
        studentId: student._id,
        levelId: currentLevelId,
        isActive: { $ne: false },
        isArchived: { $ne: true },
        ...(status ? { status } : {})
      }).sort({ assignedAt: -1, createdAt: -1 });

      if (levelTasks.length > 0) {
        tasks = levelTasks;
      }
    }

    // Final Fallback: If still 0 and student has any active tasks, return them
    if (tasks.length === 0 && !subLevelId) {
      const allActiveTasks = await StudentTask.find({
        studentId: student._id,
        isActive: { $ne: false },
        isArchived: { $ne: true },
        ...(status ? { status } : {})
      }).sort({ assignedAt: -1, createdAt: -1 });

      if (allActiveTasks.length > 0) {
        tasks = allActiveTasks;
      }
    }

    const grouped = {};
    tasks.forEach(t => {
      const key = (t.subjectName || "Other").trim() || "Other";
      if (!grouped[key]) grouped[key] = { tasks: [] };
      grouped[key].tasks.push(t);
    });

    // 4. Resolve Previous Levels and their tasks (for read-only history view)
    let previousLevels = [];
    try {
      const SubLevel = require("../../models/department/SubLevel");
      const targetSubDeptId = student.subDepartmentId?._id || student.subDepartmentId || student.currentLevelId?.subDepartmentId;

      const allDeptLevels = await Level.find({
        ...(targetSubDeptId ? { subDepartmentId: targetSubDeptId } : {}),
        isActive: true
      }).sort({ order: 1 }).lean();

      const allDeptSubLevels = await SubLevel.find({
        levelId: { $in: allDeptLevels.map(l => l._id) },
        isActive: true
      }).sort({ order: 1 }).lean();

      const sortedSubLevels = allDeptSubLevels.map(sl => {
        const parentLvl = allDeptLevels.find(l => l._id.toString() === sl.levelId.toString());
        return {
          _id: sl._id,
          name: sl.name,
          order: sl.order,
          levelId: sl.levelId,
          levelName: parentLvl?.name || "",
          levelOrder: parentLvl?.order || 1
        };
      }).sort((a, b) => {
        if (a.levelOrder !== b.levelOrder) return a.levelOrder - b.levelOrder;
        return a.order - b.order;
      });

      const curSubIdStr = currentSubLevelId?.toString();
      const curLvlOrder = student.currentLevelId?.order || 1;
      const curSubOrder = student.currentSubLevelId?.order || 1;

      // Identify previous sublevels
      const prevSubLevels = sortedSubLevels.filter(sl => {
        if (sl._id.toString() === curSubIdStr) return false;
        return sl.levelOrder < curLvlOrder || (sl.levelOrder === curLvlOrder && sl.order < curSubOrder);
      });

      const currentTaskIds = new Set(tasks.map(t => t._id.toString()));

      // Fetch all past tasks of this student that are not in current tasks
      const allPastTasks = await StudentTask.find({
        studentId: student._id,
        _id: { $nin: Array.from(currentTaskIds) },
        isActive: { $ne: false },
        isArchived: { $ne: true }
      }).sort({ assignedAt: -1, createdAt: -1 }).lean();

      const accountedPastTaskIds = new Set();

      for (const prevSL of prevSubLevels) {
        const pTasks = allPastTasks.filter(t => {
          if (accountedPastTaskIds.has(t._id.toString())) return false;
          if (t.subLevelId && t.subLevelId.toString() === prevSL._id.toString()) return true;
          if (!t.subLevelId && t.levelId && t.levelId.toString() === prevSL.levelId.toString()) return true;
          return false;
        });

        pTasks.forEach(t => accountedPastTaskIds.add(t._id.toString()));

        const pGrouped = {};
        pTasks.forEach(t => {
          const key = (t.subjectName || "Other").trim() || "Other";
          if (!pGrouped[key]) pGrouped[key] = { tasks: [] };
          pGrouped[key].tasks.push(t);
        });

        previousLevels.push({
          levelId: prevSL.levelId,
          levelName: prevSL.levelName,
          subLevelId: prevSL._id,
          subLevelName: prevSL.name,
          levelOrder: prevSL.levelOrder,
          subLevelOrder: prevSL.order,
          totalTasks: pTasks.length,
          completedTasks: pTasks.filter(t => t.status === "completed").length,
          pendingTasks: pTasks.filter(t => t.status === "pending").length,
          inProgressTasks: pTasks.filter(t => t.status === "inProgress").length,
          groupedBySubject: pGrouped,
          tasks: pTasks,
        });
      }

      // Check for any remaining past tasks not mapped to prevSubLevels
      const leftoverPastTasks = allPastTasks.filter(t => !accountedPastTaskIds.has(t._id.toString()));
      if (leftoverPastTasks.length > 0) {
        const byLvl = {};
        leftoverPastTasks.forEach(t => {
          const lKey = t.levelId ? t.levelId.toString() : "other";
          if (!byLvl[lKey]) byLvl[lKey] = [];
          byLvl[lKey].push(t);
        });

        for (const [lvlKey, lTasks] of Object.entries(byLvl)) {
          const lvlDoc = allDeptLevels.find(l => l._id.toString() === lvlKey);
          const pGrouped = {};
          lTasks.forEach(t => {
            const key = (t.subjectName || "Other").trim() || "Other";
            if (!pGrouped[key]) pGrouped[key] = { tasks: [] };
            pGrouped[key].tasks.push(t);
          });

          previousLevels.push({
            levelId: lvlKey !== "other" ? lvlKey : null,
            levelName: lvlDoc?.name || "Previous Level",
            subLevelId: null,
            subLevelName: "Archived Tasks",
            levelOrder: lvlDoc?.order || 0,
            subLevelOrder: 0,
            totalTasks: lTasks.length,
            completedTasks: lTasks.filter(t => t.status === "completed").length,
            pendingTasks: lTasks.filter(t => t.status === "pending").length,
            inProgressTasks: lTasks.filter(t => t.status === "inProgress").length,
            groupedBySubject: pGrouped,
            tasks: lTasks,
          });
        }
      }
    } catch (prevErr) {
      console.error("Error gathering previous level tasks in getMyTasks:", prevErr.message);
    }

    return res.status(200).json({
      totalTasks:     tasks.length,
      completedTasks: tasks.filter(t => t.status === "completed").length,
      pendingTasks:   tasks.filter(t => t.status === "pending").length,
      inProgressTasks:tasks.filter(t => t.status === "inProgress").length,
      groupedBySubject: grouped,
      tasks:          tasks,
      previousLevels: previousLevels,
      currentLevel: {
        levelId: currentLevelId,
        levelName: student.currentLevelId?.name || "Current Level",
        subLevelId: currentSubLevelId,
        subLevelName: student.currentSubLevelId?.name || "",
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === "completed").length,
        pendingTasks: tasks.filter(t => t.status === "pending").length,
        inProgressTasks: tasks.filter(t => t.status === "inProgress").length,
        groupedBySubject: grouped,
        tasks: tasks,
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get My Level History (Student with Promoter info, Topics studied & Subject-wise task breakdown)
exports.getMyLevelHistory = async (req, res) => {
  try {
    const { getEnrichedStudentLevelHistory } = require("../../services/promotionService");
    const history = await getEnrichedStudentLevelHistory(req.user.id);
    return res.status(200).json({ count: history.length, data: history });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get My Syllabus & Previous Level Syllabi (Pure Academic Curriculum - No Tasks)
exports.getMySyllabus = async (req, res) => {
  try {
    const SyllabusVersion = require("../../models/syllabus/SyllabusVersion");
    const Level = require("../../models/department/Level");
    const SubLevel = require("../../models/department/SubLevel");
    const StudentTask = require("../../models/syllabus/StudentTask");

    const student = await Student.findById(req.user.id)
      .populate("sessionId", "name startDate endDate")
      .populate("currentLevelId", "name order subDepartmentId")
      .populate("currentSubLevelId", "name order levelId")
      .populate("subDepartmentId", "name departmentId");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Ensure currentLevelId and currentSubLevelId stay in sync
    if (student.currentSubLevelId?.levelId) {
      const parentLevelId = student.currentSubLevelId.levelId._id || student.currentSubLevelId.levelId;
      if (!student.currentLevelId || student.currentLevelId._id.toString() !== parentLevelId.toString()) {
        const actualLevel = await Level.findById(parentLevelId).lean();
        if (actualLevel) {
          student.currentLevelId = actualLevel;
        }
      }
    }

    const currentSubLevelId = student.currentSubLevelId?._id || student.currentSubLevelId;
    const currentLevelId = student.currentLevelId?._id || student.currentLevelId;
    const currentSessionId = student.sessionId?._id || student.sessionId;
    const studentCourse = (student.course || "").trim();

    // 1. Fetch Current Syllabus Version strictly matching the student's current sublevel/level
    let currentSyllabus = null;

    // A. Check student.syllabusVersionId ONLY if it matches the student's current sublevel
    if (student.syllabusVersionId) {
      const sv = await SyllabusVersion.findById(student.syllabusVersionId).lean();
      if (sv && currentSubLevelId && sv.subLevelId?.toString() === currentSubLevelId.toString()) {
        currentSyllabus = sv;
      }
    }

    // B. Check if student has active tasks assigned for this current sublevel that specify a syllabusVersionId
    if (!currentSyllabus && currentSubLevelId) {
      const taskWithSv = await StudentTask.findOne({
        studentId: student._id,
        subLevelId: currentSubLevelId,
        syllabusVersionId: { $ne: null },
        isActive: { $ne: false },
      }).select("syllabusVersionId").lean();

      if (taskWithSv?.syllabusVersionId) {
        const svFromTask = await SyllabusVersion.findById(taskWithSv.syllabusVersionId).lean();
        if (svFromTask && svFromTask.subLevelId?.toString() === currentSubLevelId.toString()) {
          currentSyllabus = svFromTask;
        }
      }
    }

    // C. Search SyllabusVersion for currentSubLevelId with course & session priority
    if (!currentSyllabus && currentSubLevelId) {
      const courseConditions = studentCourse && studentCourse !== "All"
        ? [{ courses: studentCourse }, { courses: "All" }, { course: studentCourse }, { course: "All" }, { courses: { $size: 0 } }, { courses: { $exists: false } }]
        : [];

      // 1) Match subLevelId + sessionId + course + active status
      if (currentSessionId && courseConditions.length > 0) {
        currentSyllabus = await SyllabusVersion.findOne({
          subLevelId: currentSubLevelId,
          sessionId: currentSessionId,
          status: "active",
          isActive: true,
          $or: courseConditions,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }

      // 2) Match subLevelId + sessionId + active status
      if (!currentSyllabus && currentSessionId) {
        currentSyllabus = await SyllabusVersion.findOne({
          subLevelId: currentSubLevelId,
          sessionId: currentSessionId,
          status: "active",
          isActive: true,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }

      // 3) Match subLevelId + sessionId + isActive true
      if (!currentSyllabus && currentSessionId) {
        currentSyllabus = await SyllabusVersion.findOne({
          subLevelId: currentSubLevelId,
          sessionId: currentSessionId,
          isActive: true,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }

      // 4) Match subLevelId + course + active status (across sessions)
      if (!currentSyllabus && courseConditions.length > 0) {
        currentSyllabus = await SyllabusVersion.findOne({
          subLevelId: currentSubLevelId,
          status: "active",
          isActive: true,
          $or: courseConditions,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }

      // 5) Match subLevelId + status: "active" + isActive: true
      if (!currentSyllabus) {
        currentSyllabus = await SyllabusVersion.findOne({
          subLevelId: currentSubLevelId,
          status: "active",
          isActive: true,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }

      // 6) Match subLevelId + isActive: true
      if (!currentSyllabus) {
        currentSyllabus = await SyllabusVersion.findOne({
          subLevelId: currentSubLevelId,
          isActive: true,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }

      // 7) Any latest syllabus for subLevelId
      if (!currentSyllabus) {
        currentSyllabus = await SyllabusVersion.findOne({
          subLevelId: currentSubLevelId,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }
    }

    // D. Fallback: Search by levelId if sublevel has no specific syllabus
    if (!currentSyllabus && currentLevelId) {
      if (currentSessionId) {
        currentSyllabus = await SyllabusVersion.findOne({
          levelId: currentLevelId,
          sessionId: currentSessionId,
          status: "active",
          isActive: true,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }

      if (!currentSyllabus) {
        currentSyllabus = await SyllabusVersion.findOne({
          levelId: currentLevelId,
          isActive: true,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }

      if (!currentSyllabus) {
        currentSyllabus = await SyllabusVersion.findOne({
          levelId: currentLevelId,
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }
    }

    // Self-heal: update student's syllabusVersionId to the verified current version
    if (currentSyllabus && (!student.syllabusVersionId || student.syllabusVersionId.toString() !== currentSyllabus._id.toString())) {
      Student.findByIdAndUpdate(student._id, { $set: { syllabusVersionId: currentSyllabus._id } }).exec();
    }

    // Format Current Level Subjects -> Topics -> SubTopics (filtering active items)
    const currentSubjects = (currentSyllabus?.subjects || [])
      .filter((subject) => subject && subject.isActive !== false)
      .map((subject, sIdx) => ({
        _id: subject._id,
        name: subject.name,
        code: subject.code || "",
        description: subject.description || "",
        order: subject.order || sIdx + 1,
        reportCategory: subject.reportCategory || "",
        topics: (subject.topics || [])
          .filter((topic) => topic && topic.isActive !== false)
          .map((topic, tIdx) => ({
            _id: topic._id,
            name: topic.name,
            description: topic.description || "",
            order: topic.order || tIdx + 1,
            subTopics: (topic.subTopics || [])
              .filter((st) => st && st.isActive !== false)
              .map((st, stIdx) => ({
                _id: st._id,
                name: st.name,
                description: st.description || "",
                order: st.order || stIdx + 1,
              }))
          }))
      }));

    const totalCurrentTopics = currentSubjects.reduce((acc, s) => acc + (s.topics?.length || 0), 0);
    const totalCurrentSubTopics = currentSubjects.reduce(
      (acc, s) => acc + (s.topics?.reduce((tAcc, t) => tAcc + (t.subTopics?.length || 0), 0) || 0),
      0
    );

    const currentLevelData = {
      levelId: student.currentLevelId?._id || currentLevelId,
      levelName: student.currentLevelId?.name || "Current Level",
      levelOrder: student.currentLevelId?.order || 1,
      subLevelId: student.currentSubLevelId?._id || currentSubLevelId,
      subLevelName: student.currentSubLevelId?.name || "",
      subLevelOrder: student.currentSubLevelId?.order || 1,
      syllabusVersion: currentSyllabus ? {
        _id: currentSyllabus._id,
        version: currentSyllabus.version,
        title: currentSyllabus.title || `${student.currentLevelId?.name || "Level"} Syllabus`,
        status: currentSyllabus.status
      } : null,
      subjects: currentSubjects,
      summary: {
        totalSubjects: currentSubjects.length,
        totalTopics: totalCurrentTopics,
        totalSubTopics: totalCurrentSubTopics
      }
    };

    // 2. Hierarchy and Previous Levels
    const targetSubDeptId = student.subDepartmentId?._id || student.subDepartmentId || student.currentLevelId?.subDepartmentId;

    const allDeptLevels = await Level.find({
      ...(targetSubDeptId ? { subDepartmentId: targetSubDeptId } : {}),
      isActive: true
    }).sort({ order: 1 }).lean();

    const allDeptSubLevels = await SubLevel.find({
      levelId: { $in: allDeptLevels.map(l => l._id) },
      isActive: true
    }).sort({ order: 1 }).lean();

    const sortedSubLevels = allDeptSubLevels.map(sl => {
      const parentLvl = allDeptLevels.find(l => l._id.toString() === sl.levelId.toString());
      return {
        _id: sl._id,
        name: sl.name,
        order: sl.order,
        levelId: sl.levelId,
        levelName: parentLvl?.name || "",
        levelOrder: parentLvl?.order || 1
      };
    }).sort((a, b) => {
      if (a.levelOrder !== b.levelOrder) return a.levelOrder - b.levelOrder;
      return a.order - b.order;
    });

    const curSubIdStr = currentSubLevelId?.toString();
    const curLvlOrder = student.currentLevelId?.order || 1;
    const curSubOrder = student.currentSubLevelId?.order || 1;

    // Identify previous sublevels
    const prevSubLevels = sortedSubLevels.filter(sl => {
      if (sl._id.toString() === curSubIdStr) return false;
      return sl.levelOrder < curLvlOrder || (sl.levelOrder === curLvlOrder && sl.order < curSubOrder);
    });

    const previousLevels = [];
    for (const prevSL of prevSubLevels) {
      // Find syllabus version for this past sublevel
      let pastSyllabus = await SyllabusVersion.findOne({
        subLevelId: prevSL._id,
        ...(currentSessionId ? { sessionId: currentSessionId } : {}),
        status: "active",
        isActive: true
      }).sort({ createdAt: -1, versionNumber: -1 }).lean();

      if (!pastSyllabus && currentSessionId) {
        pastSyllabus = await SyllabusVersion.findOne({
          subLevelId: prevSL._id,
          sessionId: currentSessionId,
          isActive: true
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }

      if (!pastSyllabus) {
        pastSyllabus = await SyllabusVersion.findOne({
          subLevelId: prevSL._id,
          status: "active",
          isActive: true
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }

      if (!pastSyllabus) {
        pastSyllabus = await SyllabusVersion.findOne({
          subLevelId: prevSL._id,
          isActive: true
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }

      if (!pastSyllabus) {
        pastSyllabus = await SyllabusVersion.findOne({
          subLevelId: prevSL._id
        }).sort({ createdAt: -1, versionNumber: -1 }).lean();
      }

      const pastSubjects = (pastSyllabus?.subjects || [])
        .filter((subject) => subject && subject.isActive !== false)
        .map((subject, sIdx) => ({
          _id: subject._id,
          name: subject.name,
          code: subject.code || "",
          description: subject.description || "",
          order: subject.order || sIdx + 1,
          reportCategory: subject.reportCategory || "",
          topics: (subject.topics || [])
            .filter((topic) => topic && topic.isActive !== false)
            .map((topic, tIdx) => ({
              _id: topic._id,
              name: topic.name,
              description: topic.description || "",
              order: topic.order || tIdx + 1,
              subTopics: (topic.subTopics || [])
                .filter((st) => st && st.isActive !== false)
                .map((st, stIdx) => ({
                  _id: st._id,
                  name: st.name,
                  description: st.description || "",
                  order: st.order || stIdx + 1,
                }))
            }))
        }));

      const totalTopics = pastSubjects.reduce((acc, s) => acc + (s.topics?.length || 0), 0);
      const totalSubTopics = pastSubjects.reduce(
        (acc, s) => acc + (s.topics?.reduce((tAcc, t) => tAcc + (t.subTopics?.length || 0), 0) || 0),
        0
      );

      previousLevels.push({
        levelId: prevSL.levelId,
        levelName: prevSL.levelName,
        levelOrder: prevSL.levelOrder,
        subLevelId: prevSL._id,
        subLevelName: prevSL.name,
        subLevelOrder: prevSL.order,
        syllabusVersionTitle: pastSyllabus?.title || `${prevSL.levelName} - ${prevSL.name} Syllabus`,
        syllabusVersionCode: pastSyllabus?.version || "1.0",
        totalSubjects: pastSubjects.length,
        totalTopics: totalTopics,
        totalSubTopics: totalSubTopics,
        subjects: pastSubjects
      });
    }

    // 3. Roadmap of all levels
    const roadmap = sortedSubLevels.map(sl => {
      const isCurrent = sl._id.toString() === curSubIdStr;
      const isPast = sl.levelOrder < curLvlOrder || (sl.levelOrder === curLvlOrder && sl.order < curSubOrder);
      return {
        levelId: sl.levelId,
        levelName: sl.levelName,
        subLevelId: sl._id,
        subLevelName: sl.name,
        status: isCurrent ? "current" : isPast ? "completed" : "upcoming"
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        student: {
          _id: student._id,
          prkey: student.prkey,
          name: `${student.firstName} ${student.lastName}`.trim(),
          sessionName: student.sessionId?.name || "",
          course: student.course || "",
          subDepartmentName: student.subDepartmentId?.name || ""
        },
        currentLevel: currentLevelData,
        previousLevels: previousLevels,
        roadmap: roadmap
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get My Progress Snapshots (Student)
exports.getMySnapshots = async (req, res) => {
  try {
    const StudentProgressSnapshot = require("../../models/student/StudentProgressSnapshot");
    const { scope, page = 1, limit = 20 } = req.query;
    const filter = { studentId: req.user.id, isArchived: false };
    if (scope) filter.snapshotScope = scope;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [snapshots, total] = await Promise.all([
      StudentProgressSnapshot.find(filter).sort({ changedAt: -1 }).skip(skip).limit(parseInt(limit)),
      StudentProgressSnapshot.countDocuments(filter),
    ]);

    return res.status(200).json({
      total, page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: snapshots,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Apply for Permission (Student self-service)
exports.applyMyPermission = async (req, res) => {
  try {
    const { reason, fromDate, toDate, imageURL, assignedFacultyId } = req.body;
    if (!reason || !fromDate || !toDate || !assignedFacultyId)
      return res.status(400).json({ message: "reason, fromDate, toDate, and assignedFacultyId are required" });

    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    let uploadedImageURL = "";
    if (imageURL) {
      if (typeof imageURL !== "string") {
        return res.status(400).json({ message: "Invalid document data format" });
      }

      if (imageURL.startsWith("data:")) {
        if (!/^data:(image\/(png|jpeg|jpg|webp)|application\/pdf);base64,/.test(imageURL)) {
          return res.status(400).json({ message: "Supporting document must be PNG, JPEG, WEBP, or PDF" });
        }
        const base64Data = imageURL.split(",")[1] || "";
        const sizeInBytes = (base64Data.length * 3) / 4;
        if (sizeInBytes > 5 * 1024 * 1024) {
          return res.status(400).json({ message: "Supporting document exceeds the 5 MB size limit" });
        }
      } else if (!imageURL.startsWith("https://res.cloudinary.com/")) {
        return res.status(400).json({ message: "Invalid document source URL" });
      }

      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      const uploadResponse = await cloudinary.uploader.upload(imageURL, { folder: "permission_applications" });
      uploadedImageURL = uploadResponse.secure_url;
    }

    student.permissions.push({
      imageURL: uploadedImageURL,
      reason,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      status: "pending",
      uploadDate: new Date(),
      assignedFacultyId: assignedFacultyId,
    });
    await student.save();

    const added = student.permissions[student.permissions.length - 1];
    await StudentEventLog.create({
      studentId: student._id,
      type: "permission",
      action: "leave_request_submitted",
      title: "Leave request submitted",
      description: reason,
      meta: {
        permissionId: added._id,
        status: "pending",
        fromDate: added.fromDate,
        toDate: added.toDate,
        hasDocument: Boolean(uploadedImageURL),
        assignedFacultyId: added.assignedFacultyId,
      },
      createdBy: null,
      createdByName: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
      createdByRole: "student",
    });

    return res.status(201).json({ message: "Permission applied successfully", data: added });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get My Permission History (Student)
exports.getMyPermissions = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id)
      .select("permissions")
      .populate("permissions.assignedFacultyId", "name role position email");
    if (!student) return res.status(404).json({ message: "Student not found" });
    const sorted = [...student.permissions].sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    return res.status(200).json({ count: sorted.length, data: sorted });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Upload My Extra Document (Student)
exports.uploadMyExtraDocument = async (req, res) => {
  try {
    const { title, fileData, fileType, remark } = req.body;
    if (!title || !fileData || !fileType)
      return res.status(400).json({ message: "title, fileData, and fileType are required" });
    if (!["image", "pdf"].includes(fileType))
      return res.status(400).json({ message: "fileType must be 'image' or 'pdf'" });

    // Validate payload size and MIME format
    if (fileType === "image" && !/^data:image\/[a-zA-Z0-9+.-]+;(?:[^;]+;)*base64,/i.test(fileData)) {
      return res.status(400).json({ message: "Invalid image format. Supported formats: PNG, JPEG, JPG, WEBP, GIF" });
    }
    if (fileType === "pdf" && !/^data:application\/pdf;base64,/.test(fileData)) {
      return res.status(400).json({ message: "Invalid PDF format. File must be a valid PDF document" });
    }

    const base64Data = fileData.split(",")[1] || "";
    const sizeInBytes = (base64Data.length * 3) / 4;
    if (sizeInBytes > 5 * 1024 * 1024) {
      return res.status(400).json({ message: "Document file size exceeds the 5 MB limit" });
    }

    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadResponse = await cloudinary.uploader.upload(fileData, {
      folder: "student_extra_documents",
      resource_type: fileType === "pdf" ? "raw" : "image",
      public_id: `extradoc_${req.user.id}_${Date.now()}`,
    });

    const doc = {
      title: title.trim(),
      fileURL: uploadResponse.secure_url,
      fileType,
      remark: remark ? remark.trim() : "",
      isExtra: true,
      uploadedAt: new Date(),
    };

    student.documents.push(doc);
    await student.save();
    return res.status(201).json({ message: "Document uploaded successfully", data: doc });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get My Placement Status + Interview History (Student)
exports.getMyPlacement = async (req, res) => {
  try {
    const StudentPlacement = require("../../models/placement/StudentPlacement");
    const placement = await StudentPlacement.findOne({ studentId: req.user.id })
      .populate("PlacementinterviewRecord.companyRef", "name")
      .select("-__v");

    if (!placement)
      return res.status(200).json({ data: null, message: "No placement record found" });

    return res.status(200).json({ data: placement });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get My Report Card (Student)
exports.getMyReportCard = async (req, res) => {
  try {
    const StudentReportCard = require("../../models/student/studentReportCard");
    const reportCard = await StudentReportCard.findOne({ studentRef: req.user.id })
      .populate("studentRef", "firstName lastName prkey");

    if (!reportCard)
      return res.status(200).json({ data: null, message: "Report card not generated yet" });

    // Live-sync tasks and performance so student always sees real evaluated progress
    try {
      const { syncReportCardLive } = require("./studentReportCardController");
      if (typeof syncReportCardLive === "function") {
        await syncReportCardLive(req.user.id, reportCard);
      }
    } catch (syncErr) {
      console.error("[getMyReportCard] sync error:", syncErr.message);
    }

    return res.status(200).json({ data: reportCard });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get My Extra Documents (Student)
exports.getMyExtraDocuments = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select("documents");
    if (!student) return res.status(404).json({ message: "Student not found" });
    const extraDocs = student.documents.filter(d => d.isExtra === true);
    return res.status(200).json({ count: extraDocs.length, data: extraDocs });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get My Event Log / Activity Timeline (Student)
exports.getMyEventLog = async (req, res) => {
  try {
    const { type, page = 1, limit = 15 } = req.query;
    const filter = { studentId: req.user.id };
    if (type) filter.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [events, total] = await Promise.all([
      StudentEventLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      StudentEventLog.countDocuments(filter),
    ]);

    // Resolve any raw SubLevel ObjectIds in promotion descriptions
    const SubLevel = require("../../models/department/SubLevel");
    const idRegex = /[a-f\d]{24}/g;
    const allIds = new Set();
    events.forEach(e => {
      if (typeof e.description === "string") {
        const matches = e.description.match(idRegex);
        if (matches) matches.forEach(id => allIds.add(id));
      }
    });

    if (allIds.size > 0) {
      const subLevels = await SubLevel.find({ _id: { $in: Array.from(allIds) } }).select("_id name").lean();
      const subLevelMap = new Map(subLevels.map(sl => [sl._id.toString(), sl.name]));

      events.forEach(e => {
        if (typeof e.description === "string" && e.description.includes("SubLevel")) {
          e.description = e.description.replace(idRegex, (match) => {
            return subLevelMap.get(match) || match;
          });
        }
      });
    }

    return res.status(200).json({
      total, page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: events,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get Active Faculties / Leadership / Placement / Admin Staff list for Student
exports.getFaculties = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select("subDepartmentId");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    let departmentId = null;
    if (student.subDepartmentId) {
      const subDept = await SubDepartment.findById(student.subDepartmentId).select("departmentId");
      if (subDept?.departmentId) {
        departmentId = subDept.departmentId;
      }
    }

    // Include:
    // 1. College Leadership: Chairman, CEO, or users with leadership position/role
    // 2. Department staff: HOD, Faculty, Coordinator, Placement Officer of student's department
    // 3. College-wide Placement Officers & Coordinators
    const orConditions = [
      { position: { $regex: /chairman|ceo/i } },
      { role: { $in: ["chairman", "ceo"] } },
      {
        departmentId: null,
        role: { $in: ["placement_officer", "coordinator", "cordinator"] }
      }
    ];

    if (departmentId) {
      orConditions.push({
        departmentId: departmentId,
        role: { $in: ["faculty", "hod", "coordinator", "cordinator", "placement_officer", "admin"] }
      });
    } else {
      orConditions.push({
        role: { $in: ["faculty", "hod", "coordinator", "cordinator", "placement_officer"] }
      });
    }

    const faculties = await User.find({
      isActive: true,
      $or: orConditions
    })
      .select("name role position email mobileNo profileImage departmentId")
      .populate("departmentId", "name code")
      .lean();

    const getHierarchyRank = (user) => {
      const pos = (user.position || "").toLowerCase();
      const role = (user.role || "").toLowerCase();
      if (pos.includes("chairman") || role === "chairman") return 1;
      if (pos.includes("ceo") || role === "ceo") return 2;
      if (role === "hod" || pos.includes("head of department") || pos.includes("hod")) return 3;
      if (role === "coordinator" || role === "cordinator" || pos.includes("coordinator")) return 4;
      if (role === "placement_officer" || pos.includes("placement")) return 5;
      if (role === "faculty" || pos.includes("professor")) return 6;
      return 7;
    };

    faculties.sort((a, b) => {
      const rankDiff = getHierarchyRank(a) - getHierarchyRank(b);
      if (rankDiff !== 0) return rankDiff;
      return (a.name || "").localeCompare(b.name || "");
    });

    return res.status(200).json({ success: true, data: faculties });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Update My Task Status (Student self-service: pending <-> inProgress ONLY!)
exports.updateMyTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!["pending", "inProgress"].includes(status)) {
      return res.status(400).json({ message: "Students can only change task status to pending or inProgress" });
    }

    const StudentTask = require("../../models/syllabus/StudentTask");
    const task = await StudentTask.findOne({ _id: taskId, studentId: req.user.id });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status === "completed") {
      return res.status(400).json({ message: "Completed tasks cannot be modified by students" });
    }

    // Previous level tasks are strictly read-only
    const studentForTask = await Student.findById(req.user.id).select("currentLevelId currentSubLevelId");
    if (studentForTask) {
      const isPastSubLevel = task.subLevelId && studentForTask.currentSubLevelId && task.subLevelId.toString() !== studentForTask.currentSubLevelId.toString();
      const isPastLevel = task.levelId && studentForTask.currentLevelId && task.levelId.toString() !== studentForTask.currentLevelId.toString();
      if (isPastSubLevel || isPastLevel) {
        return res.status(403).json({ message: "Previous level tasks are locked in read-only mode and cannot be modified." });
      }
    }

    task.status = status;
    if (status === "inProgress" && !task.startedAt) {
      task.startedAt = new Date();
    }
    await task.save();

    // Log event
    const StudentEventLog = require("../../models/student/StudentEventLog");
    const student = await Student.findById(req.user.id).select("firstName lastName");
    await StudentEventLog.create({
      studentId: req.user.id,
      type: "task",
      action: status === "inProgress" ? "task_started" : "task_moved_to_pending",
      title: status === "inProgress" ? "Task Started" : "Task Moved to Pending",
      description: `Task "${task.title}" updated to ${status === "inProgress" ? "In Progress" : "Pending"}`,
      meta: { taskId, status },
      createdBy: null,
      createdByName: `${student?.firstName || ""} ${student?.lastName || ""}`.trim(),
      createdByRole: "student",
    });

    return res.status(200).json({ message: "Task status updated successfully", data: task });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Update My Profile Details (Student)
exports.updateMyProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const allowed = ["motherName", "village", "address"];
    allowed.forEach(f => {
      if (req.body[f] !== undefined) student[f] = req.body[f];
    });
    await student.save();
    return res.status(200).json({ success: true, message: "Profile updated successfully", data: student });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
