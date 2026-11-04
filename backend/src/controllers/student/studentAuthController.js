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
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      { id: student._id, role: "student" },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
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
        fatherName: student.fatherName,
        motherName: student.motherName,
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
    const StudentTask = require("../../models/syllabus/StudentTask");
    const Task = require("../../models/syllabus/Task");
    const SyllabusVersion = require("../../models/syllabus/SyllabusVersion");
    const Level = require("../../models/department/Level");
    const SubLevel = require("../../models/department/SubLevel");
    const Session = require("../../models/Session");
    const SessionSyllabusMap = require("../../models/SessionSyllabusMap");
    const { findOrCreateSessionFromBatch } = require("../../utils/sessionHelper");
    const { assignTasksToStudent } = require("../../services/taskAssignmentService");

    const student = await Student.findById(req.user.id)
      .populate("sessionId", "name")
      .populate("currentLevelId", "name order subDepartmentId")
      .populate("currentSubLevelId", "name order levelId")
      .populate("subDepartmentId", "name departmentId");

    if (!student) return res.status(404).json({ message: "Student not found" });

    // 1. Resolve current level & sublevel
    let currentLevel = student.currentLevelId;
    let currentSubLevel = student.currentSubLevelId;

    if (!currentLevel && student.subDepartmentId?._id) {
      currentLevel = await Level.findOne({
        subDepartmentId: student.subDepartmentId._id,
        isActive: true
      }).sort({ order: 1 });
    }

    if (currentLevel && !currentSubLevel) {
      currentSubLevel = await SubLevel.findOne({
        levelId: currentLevel._id,
        isActive: true
      }).sort({ order: 1 });
    }

    const currentLevelId = currentLevel?._id;
    const currentSubLevelId = currentSubLevel?._id;

    // 2. Resolve candidate sessions matching student's batch year (e.g., "2025-28", "2025-2028")
    const batchStr = String(student.batchYear || student.batch || student.sessionId?.name || "").trim();
    const candidateSessionIdSet = new Set();
    if (student.sessionId?._id) {
      candidateSessionIdSet.add(student.sessionId._id.toString());
    }

    if (batchStr) {
      try {
        const batchSessionId = await findOrCreateSessionFromBatch(batchStr, student.sessionId?._id, {
          course: student.course,
          subDepartmentId: student.subDepartmentId?._id
        });
        if (batchSessionId) {
          candidateSessionIdSet.add(batchSessionId.toString());
        }
      } catch (_) {}

      const rangeMatch = batchStr.match(/\b(20\d\d)\s*[-/]\s*(\d{2,4})\b/);
      if (rangeMatch) {
        const startY = rangeMatch[1];
        const rawEnd = rangeMatch[2];
        const endY = rawEnd.length === 2 ? rawEnd : rawEnd.slice(-2);
        try {
          const sessionsByRegex = await Session.find({
            $or: [
              { name: { $regex: new RegExp(`^${startY}[-/](${endY}|20${endY})`, "i") } },
              { name: { $regex: new RegExp(`^AY\\s*${startY}[-/](${endY}|20${endY})`, "i") } },
              { name: { $regex: new RegExp(`^${startY}`, "i") } }
            ]
          }).select("_id name").lean();
          sessionsByRegex.forEach(s => candidateSessionIdSet.add(s._id.toString()));
        } catch (_) {}
      }
    }
    const candidateSessionIds = Array.from(candidateSessionIdSet);

    // 3. Hierarchy and Previous Levels identification
    const allDeptLevels = await Level.find({
      subDepartmentId: student.subDepartmentId?._id || student.subDepartmentId,
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
    const curLvlOrder = currentLevel?.order || 1;
    const curSubOrder = currentSubLevel?.order || 1;

    // Identify previous sublevels (strictly before current level/sublevel in sequence)
    const prevSubLevels = sortedSubLevels.filter(sl => {
      if (sl._id.toString() === curSubIdStr) return false;
      return sl.levelOrder < curLvlOrder || (sl.levelOrder === curLvlOrder && sl.order < curSubOrder);
    });

    const prevSubLevelIds = prevSubLevels.map(sl => sl._id);
    const prevLevelIds = Array.from(new Set(
      allDeptLevels
        .filter(l => l.order < curLvlOrder)
        .map(l => l._id)
    ));

    // Compute previousLevels summary (with task counts for each)
    const previousLevels = await Promise.all(prevSubLevels.map(async (prevSL) => {
      const prevLvlCond = [{ subLevelId: prevSL._id }];
      if (prevSL.levelOrder < curLvlOrder) {
        prevLvlCond.push({ levelId: prevSL.levelId, subLevelId: { $in: [null, undefined] } });
      }

      const studentTasksCount = await StudentTask.countDocuments({
        studentId: student._id,
        isActive: { $ne: false },
        $or: prevLvlCond
      });

      const completedCount = await StudentTask.countDocuments({
        studentId: student._id,
        isActive: { $ne: false },
        status: "completed",
        $or: prevLvlCond
      });

      const pendingCount = await StudentTask.countDocuments({
        studentId: student._id,
        isActive: { $ne: false },
        status: "pending",
        $or: prevLvlCond
      });

      let totalTasks = studentTasksCount;
      if (totalTasks === 0) {
        // Fallback count from master tasks if not individually assigned
        totalTasks = await Task.countDocuments({
          isActive: true,
          $or: prevLvlCond
        });
      }

      return {
        levelId: prevSL.levelId,
        levelName: prevSL.levelName,
        levelOrder: prevSL.levelOrder,
        subLevelId: prevSL._id,
        subLevelName: prevSL.name,
        subLevelOrder: prevSL.order,
        totalTasks,
        completedTasks: completedCount,
        pendingTasks: pendingCount,
        isReadOnly: true
      };
    }));

    // 4. Check if a previous level is being requested
    const { status, subLevelId } = req.query;
    let isTargetPrevious = false;
    let targetSubLevel = currentSubLevel;
    let targetLevel = currentLevel;

    if (subLevelId) {
      const foundPrev = prevSubLevels.find(sl => sl._id.toString() === subLevelId.toString());
      if (foundPrev) {
        isTargetPrevious = true;
        targetSubLevel = { _id: foundPrev._id, name: foundPrev.name, order: foundPrev.order };
        targetLevel = { _id: foundPrev.levelId, name: foundPrev.levelName, order: foundPrev.levelOrder };
      }
    }

    // ── CASE A: Previous Level Tasks (Read-Only / View Only) ──
    if (isTargetPrevious) {
      const targetCond = [{ subLevelId: targetSubLevel._id }];
      if (targetLevel.order < curLvlOrder) {
        targetCond.push({ levelId: targetLevel._id, subLevelId: { $in: [null, undefined] } });
      }

      let tasks = await StudentTask.find({
        studentId: student._id,
        isActive: { $ne: false },
        $or: targetCond,
        ...(status ? { status } : {})
      })
        .populate("subLevelId", "name order")
        .populate("levelId", "name order")
        .sort({ assignedAt: -1, createdAt: -1 })
        .lean();

      // If student had no tasks in StudentTask for this past level, query master tasks so they can view curriculum tasks
      if (tasks.length === 0) {
        const masterTasks = await Task.find({
          isActive: true,
          $or: targetCond
        }).sort({ createdAt: 1 }).lean();

        tasks = masterTasks.map(mt => ({
          _id: mt._id,
          title: mt.title,
          description: mt.description || "",
          subjectName: mt.subjectName || "General",
          topicName: mt.topicName || "General",
          subTopicName: mt.subTopicName || null,
          type: mt.type || "assignment",
          priority: mt.priority || "medium",
          mandatory: mt.mandatory !== false,
          maxMarks: typeof mt.maxMarks === "number" ? mt.maxMarks : 5,
          status: "completed",
          marks: null,
          isReadOnly: true,
          isArchivedLevelTask: true,
          levelId: targetLevel,
          subLevelId: targetSubLevel,
          assignedAt: mt.createdAt,
        }));
      } else {
        tasks = tasks.map(t => ({
          ...t,
          isReadOnly: true,
          isArchivedLevelTask: true
        }));
      }

      const grouped = {};
      tasks.forEach(t => {
        const key = t.subjectName || "Other";
        if (!grouped[key]) grouped[key] = { tasks: [] };
        grouped[key].tasks.push(t);
      });

      return res.status(200).json({
        isReadOnly: true,
        isPreviousLevel: true,
        currentLevel: currentLevel ? { _id: currentLevel._id, name: currentLevel.name, order: currentLevel.order } : null,
        currentSubLevel: currentSubLevel ? { _id: currentSubLevel._id, name: currentSubLevel.name, order: currentSubLevel.order } : null,
        selectedLevel: targetLevel,
        selectedSubLevel: targetSubLevel,
        previousLevels,
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === "completed").length,
        pendingTasks: tasks.filter(t => t.status === "pending").length,
        inProgressTasks: tasks.filter(t => t.status === "inProgress").length,
        groupedBySubject: grouped,
      });
    }

    // ── CASE B: Current Level Tasks (Active / Interactive) ──

    // 5. Find the best matching SyllabusVersion for current level & batch
    let effectiveSyllabus = null;

    // A: Check pinned version if it matches level and batch session
    if (student.syllabusVersionId) {
      const pinned = await SyllabusVersion.findById(student.syllabusVersionId).lean();
      if (pinned && pinned.isActive) {
        const matchesLevel = (!currentSubLevelId || pinned.subLevelId?.toString() === currentSubLevelId.toString()) &&
                             (!currentLevelId || pinned.levelId?.toString() === currentLevelId.toString());
        const matchesSession = candidateSessionIds.length === 0 ||
                               candidateSessionIds.includes(pinned.sessionId?.toString());
        if (matchesLevel && matchesSession) {
          effectiveSyllabus = pinned;
        }
      }
    }

    // B: Check SessionSyllabusMap
    if (!effectiveSyllabus && candidateSessionIds.length > 0 && currentSubLevelId) {
      const mapped = await SessionSyllabusMap.findOne({
        sessionId: { $in: candidateSessionIds },
        subLevelId: currentSubLevelId,
        isActive: true
      }).populate("syllabusVersionId").lean();

      if (mapped?.syllabusVersionId && mapped.syllabusVersionId.isActive) {
        effectiveSyllabus = mapped.syllabusVersionId;
      }
    }

    // C: Query SyllabusVersion by subLevelId & candidate batch sessions
    if (!effectiveSyllabus && candidateSessionIds.length > 0 && currentSubLevelId) {
      const versions = await SyllabusVersion.find({
        subLevelId: currentSubLevelId,
        sessionId: { $in: candidateSessionIds },
        isActive: true
      }).sort({ versionNumber: -1, createdAt: -1 }).lean();

      if (versions.length > 0) {
        if (student.course) {
          const courseMatch = versions.find(v => {
            const list = Array.isArray(v.courses) && v.courses.length > 0 ? v.courses : (v.course ? [v.course] : ["All"]);
            return list.some(c => c === "All" || String(c).trim().toLowerCase() === String(student.course).trim().toLowerCase());
          });
          effectiveSyllabus = courseMatch || versions[0];
        } else {
          effectiveSyllabus = versions[0];
        }
      }
    }

    // D: Query SyllabusVersion by levelId & candidate batch sessions
    if (!effectiveSyllabus && candidateSessionIds.length > 0 && currentLevelId) {
      const versions = await SyllabusVersion.find({
        levelId: currentLevelId,
        sessionId: { $in: candidateSessionIds },
        isActive: true
      }).sort({ versionNumber: -1, createdAt: -1 }).lean();

      if (versions.length > 0) {
        if (student.course) {
          const courseMatch = versions.find(v => {
            const list = Array.isArray(v.courses) && v.courses.length > 0 ? v.courses : (v.course ? [v.course] : ["All"]);
            return list.some(c => c === "All" || String(c).trim().toLowerCase() === String(student.course).trim().toLowerCase());
          });
          effectiveSyllabus = courseMatch || versions[0];
        } else {
          effectiveSyllabus = versions[0];
        }
      }
    }

    // E: Fallback by subLevelId or levelId
    if (!effectiveSyllabus && currentSubLevelId) {
      const versions = await SyllabusVersion.find({
        subLevelId: currentSubLevelId,
        isActive: true
      }).sort({ versionNumber: -1, createdAt: -1 }).lean();
      if (versions.length > 0) effectiveSyllabus = versions[0];
    }
    if (!effectiveSyllabus && currentLevelId) {
      const versions = await SyllabusVersion.find({
        levelId: currentLevelId,
        isActive: true
      }).sort({ versionNumber: -1, createdAt: -1 }).lean();
      if (versions.length > 0) effectiveSyllabus = versions[0];
    }

    const effectiveSyllabusId = effectiveSyllabus?._id || student.syllabusVersionId;

    // Self-healing student.syllabusVersionId
    if (effectiveSyllabus?._id && (!student.syllabusVersionId || student.syllabusVersionId.toString() !== effectiveSyllabus._id.toString())) {
      await Student.findByIdAndUpdate(student._id, { $set: { syllabusVersionId: effectiveSyllabus._id } });
    }

    // 6. Check if student has current-level tasks in StudentTask
    const curLevelConditions = [];
    if (currentSubLevelId) {
      curLevelConditions.push({ subLevelId: currentSubLevelId });
      curLevelConditions.push({ levelId: currentLevelId, subLevelId: { $in: [null, undefined] } });
    } else if (currentLevelId) {
      curLevelConditions.push({ levelId: currentLevelId });
    }

    let existingTaskCount = 0;
    if (curLevelConditions.length > 0) {
      const existingFilter = {
        studentId: student._id,
        isActive: { $ne: false },
        isArchived: { $ne: true },
        $or: curLevelConditions
      };
      if (prevSubLevelIds.length > 0) {
        existingFilter.subLevelId = { $nin: prevSubLevelIds };
      }
      if (prevLevelIds.length > 0) {
        existingFilter.levelId = { $nin: prevLevelIds };
      }
      existingTaskCount = await StudentTask.countDocuments(existingFilter);
    }

    // 7. If NO tasks exist for current level in StudentTask, auto-sync tasks from Task collection
    if (existingTaskCount === 0) {
      // 7a. Auto-assign syllabus tasks
      if (effectiveSyllabusId) {
        try {
          await assignTasksToStudent(student._id, effectiveSyllabusId, {
            student,
            allowSessionMismatch: true,
            allowLevelMismatch: true
          });
        } catch (_) {}
      }

      // 7b. Auto-assign any standalone or general tasks for current sublevel/level
      try {
        const masterOr = [];
        if (currentSubLevelId) masterOr.push({ subLevelId: currentSubLevelId });
        if (currentLevelId) masterOr.push({ levelId: currentLevelId, subLevelId: { $in: [null, undefined] } });
        if (effectiveSyllabusId) masterOr.push({ syllabusVersionId: effectiveSyllabusId });

        const masterTasks = await Task.find({
          isActive: true,
          $or: masterOr
        }).lean();

        if (masterTasks.length > 0) {
          const existingIds = await StudentTask.distinct("taskId", {
            studentId: student._id,
            $or: curLevelConditions
          });
          const existingIdSet = new Set(existingIds.map(id => id ? id.toString() : ""));

          const newStudentTasks = [];
          for (const mt of masterTasks) {
            if (existingIdSet.has(mt._id.toString())) continue;

            const tCourses = Array.isArray(mt.courses) && mt.courses.length > 0
              ? mt.courses
              : (mt.course ? String(mt.course).split(",").map(c => c.trim()).filter(Boolean) : ["All"]);

            if (!tCourses.includes("All") && student.course) {
              const matched = tCourses.some(c => String(c).trim().toLowerCase() === String(student.course).trim().toLowerCase());
              if (!matched) continue;
            }

            newStudentTasks.push({
              studentId: student._id,
              sessionId: student.sessionId?._id || student.sessionId || mt.sessionId,
              levelId: currentLevelId || mt.levelId,
              subLevelId: currentSubLevelId || mt.subLevelId,
              syllabusVersionId: mt.syllabusVersionId || effectiveSyllabusId || null,
              taskId: mt._id,
              subjectId: mt.subjectId || null,
              topicId: mt.topicId || null,
              subTopicId: mt.subTopicId || null,
              subjectName: mt.subjectName || "General",
              topicName: mt.topicName || "General",
              subTopicName: mt.subTopicName || null,
              taskNodeType: mt.taskNodeType || (mt.isGeneralTask ? "general" : "topic"),
              title: mt.title,
              description: mt.description || "",
              type: mt.type || "assignment",
              priority: mt.priority || "medium",
              mandatory: mt.mandatory !== false,
              maxMarks: typeof mt.maxMarks === "number" ? mt.maxMarks : 5,
              timeDays: mt.timeDays || null,
              dueDate: mt.dueDate || null,
              status: "pending",
              isGeneralTask: Boolean(mt.isGeneralTask),
              isActive: true,
              assignedType: "auto",
              assignedByName: "System",
              assignedAt: new Date()
            });
          }

          if (newStudentTasks.length > 0) {
            await StudentTask.insertMany(newStudentTasks, { ordered: false }).catch(() => {});
          }
        }
      } catch (_) {}
    }

    // 8. Build the final query filter for current level (strictly isolates current level/sublevel)
    const queryOr = [];
    if (currentSubLevelId) {
      queryOr.push({ subLevelId: currentSubLevelId });
      queryOr.push({ levelId: currentLevelId, subLevelId: { $in: [null, undefined] } });
    } else if (currentLevelId) {
      queryOr.push({ levelId: currentLevelId });
    } else if (effectiveSyllabusId) {
      queryOr.push({ syllabusVersionId: effectiveSyllabusId });
    }
    // Allow extra tasks that were assigned with no level/sublevel
    queryOr.push({ isExtra: true, levelId: null, subLevelId: null });

    const filter = {
      studentId: req.user.id,
      isActive: { $ne: false },
      isArchived: { $ne: true }
    };

    if (queryOr.length > 0) {
      filter.$or = queryOr;
    }

    // Strictly exclude previous sublevels and previous levels
    if (prevSubLevelIds.length > 0) {
      filter.subLevelId = { $nin: prevSubLevelIds };
    }
    if (prevLevelIds.length > 0) {
      filter.levelId = { $nin: prevLevelIds };
    }

    if (status) filter.status = status;

    const tasks = await StudentTask.find(filter)
      .populate("subLevelId", "name order")
      .populate("levelId", "name order")
      .sort({ assignedAt: -1, createdAt: -1 });

    const grouped = {};
    tasks.forEach(t => {
      const key = t.subjectName || "Other";
      if (!grouped[key]) grouped[key] = { tasks: [] };
      grouped[key].tasks.push(t);
    });

    return res.status(200).json({
      isReadOnly: false,
      isPreviousLevel: false,
      currentLevel: currentLevel ? { _id: currentLevel._id, name: currentLevel.name, order: currentLevel.order } : null,
      currentSubLevel: currentSubLevel ? { _id: currentSubLevel._id, name: currentSubLevel.name, order: currentSubLevel.order } : null,
      selectedLevel: currentLevel ? { _id: currentLevel._id, name: currentLevel.name, order: currentLevel.order } : null,
      selectedSubLevel: currentSubLevel ? { _id: currentSubLevel._id, name: currentSubLevel.name, order: currentSubLevel.order } : null,
      previousLevels,
      totalTasks:     tasks.length,
      completedTasks: tasks.filter(t => t.status === "completed").length,
      pendingTasks:   tasks.filter(t => t.status === "pending").length,
      inProgressTasks:tasks.filter(t => t.status === "inProgress").length,
      groupedBySubject: grouped,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get My Level History (Student)
exports.getMyLevelHistory = async (req, res) => {
  try {
    const StudentLevelProgress = require("../../models/student/StudentLevelProgress");
    const StudentProgressSnapshot = require("../../models/student/StudentProgressSnapshot");
    const StudentEventLog = require("../../models/student/StudentEventLog");
    const StudentTask = require("../../models/syllabus/StudentTask");
    const SubLevel = require("../../models/department/SubLevel");

    let history = await StudentLevelProgress.find({ studentId: req.user.id })
      .populate("levelId", "name order")
      .populate("subLevelId", "name order")
      .populate("sessionId", "name")
      .populate("promotedBy", "name role")
      .lean();

    // Check if student has tasks in sublevels not recorded in StudentLevelProgress
    const recordedSubLevelIds = new Set(
      history
        .map(h => (h.subLevelId?._id || h.subLevelId)?.toString())
        .filter(Boolean)
    );

    const taskSubLevelIds = await StudentTask.distinct("subLevelId", { studentId: req.user.id });
    for (const sId of taskSubLevelIds) {
      if (sId && !recordedSubLevelIds.has(sId.toString())) {
        const subLevel = await SubLevel.findById(sId).populate("levelId", "name order").lean();
        if (subLevel) {
          const totalTasks = await StudentTask.countDocuments({ studentId: req.user.id, subLevelId: sId });
          const completedTasksCount = await StudentTask.countDocuments({ studentId: req.user.id, subLevelId: sId, status: "completed" });
          const completionPercentage = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

          history.push({
            _id: `task_sublevel_${sId}`,
            studentId: req.user.id,
            subLevelId: subLevel,
            levelId: subLevel.levelId,
            status: completionPercentage === 100 ? "completed" : "in_progress",
            totalTasks,
            completedTasksCount,
            completionPercentage,
            createdAt: new Date(0)
          });
        }
      }
    }

    // Pre-fetch snapshots & event logs for fallback/enrichment
    const [snapshots, eventLogs] = await Promise.all([
      StudentProgressSnapshot.find({ studentId: req.user.id, snapshotScope: { $in: ["overall", "promotion"] } })
        .sort({ changedAt: -1 })
        .lean(),
      StudentEventLog.find({ studentId: req.user.id, type: "promotion" })
        .populate("createdBy", "name role")
        .sort({ createdAt: -1 })
        .lean()
    ]);

    // Enrich each record with promotedBy, rating, and performanceLevel
    for (const item of history) {
      const sIdStr = (item.subLevelId?._id || item.subLevelId)?.toString();

      // 1. Resolve promotedByName and promotedByRole if missing
      if (!item.promotedByName && !item.promotedBy?.name) {
        // Find snapshot for this sublevel
        const snap = snapshots.find(s => s.subLevelId?.toString() === sIdStr && s.changedByName);
        if (snap) {
          item.promotedByName = snap.changedByName;
          item.promotedByRole = snap.changedByRole || "Faculty";
          item.promotedAt = item.promotedAt || snap.changedAt;
        } else {
          // Check event log
          const log = eventLogs.find(l => 
            l.meta?.prevSubLevelId?.toString() === sIdStr || 
            l.meta?.newSubLevelId?.toString() === sIdStr
          );
          if (log) {
            item.promotedByName = log.createdByName || log.createdBy?.name || log.meta?.promotedByName || "Faculty Evaluator";
            item.promotedByRole = log.createdByRole || log.createdBy?.role || log.meta?.promotedByRole || "Faculty";
            item.promotedAt = item.promotedAt || log.createdAt;
          }
        }
      } else if (!item.promotedByName && item.promotedBy?.name) {
        item.promotedByName = item.promotedBy.name;
        item.promotedByRole = item.promotedBy.role || item.promotedByRole || "Faculty";
      }

      // 2. Resolve rating / averageMarks if missing
      if (typeof item.rating !== "number" || item.rating === 0) {
        const snap = snapshots.find(s => s.subLevelId?.toString() === sIdStr && typeof s.averageMarks === "number" && s.averageMarks > 0);
        if (snap) {
          item.rating = snap.averageMarks;
          item.averageMarks = snap.averageMarks;
        } else if (sIdStr) {
          // Calculate dynamically from completed student tasks with marks
          const tasksWithMarks = await StudentTask.find({
            studentId: req.user.id,
            subLevelId: sIdStr,
            status: "completed",
            marks: { $ne: null }
          }).select("marks").lean();

          if (tasksWithMarks.length > 0) {
            const sum = tasksWithMarks.reduce((acc, t) => acc + (typeof t.marks === "number" ? t.marks : 0), 0);
            const avg = Number((sum / tasksWithMarks.length).toFixed(1));
            item.rating = avg;
            item.averageMarks = avg;
          }
        }
      }

      // 3. Performance Level Remark
      if (!item.performanceLevel && item.rating > 0) {
        if (item.rating >= 4.5) item.performanceLevel = "Outstanding";
        else if (item.rating >= 4.0) item.performanceLevel = "Excellent";
        else if (item.rating >= 3.5) item.performanceLevel = "Very Good";
        else if (item.rating >= 3.0) item.performanceLevel = "Good";
        else if (item.rating >= 2.0) item.performanceLevel = "Average";
        else item.performanceLevel = "Needs Improvement";
      }

      // 4. Resolve subject-wise rating points (subjectRatings)
      if ((!item.subjectRatings || item.subjectRatings.length === 0) && sIdStr) {
        const subTasks = await StudentTask.find({
          studentId: req.user.id,
          subLevelId: sIdStr,
          isActive: { $ne: false }
        }).select("subjectId subjectName status marks").lean();

        if (subTasks.length > 0) {
          const sMap = {};
          subTasks.forEach(t => {
            const key = (t.subjectName || "General").trim();
            if (!sMap[key]) sMap[key] = { subjectId: t.subjectId, subjectName: key, tasks: [] };
            sMap[key].tasks.push(t);
          });

          item.subjectRatings = Object.values(sMap).map(({ subjectId, subjectName, tasks }) => {
            const sDone = tasks.filter(t => t.status === "completed");
            const sMarks = sDone.filter(t => typeof t.marks === "number");
            const sAvg = sMarks.length > 0
              ? Number((sMarks.reduce((acc, t) => acc + t.marks, 0) / sMarks.length).toFixed(1))
              : 0;

            let sPerf = "";
            if (sAvg >= 4.5) sPerf = "Outstanding";
            else if (sAvg >= 4.0) sPerf = "Excellent";
            else if (sAvg >= 3.5) sPerf = "Very Good";
            else if (sAvg >= 3.0) sPerf = "Good";
            else if (sAvg >= 2.0) sPerf = "Average";
            else if (sAvg > 0) sPerf = "Needs Improvement";

            return {
              subjectId: subjectId || null,
              subjectName,
              rating: sAvg,
              averageMarks: sAvg,
              totalTasks: tasks.length,
              completedTasks: sDone.length,
              performanceLevel: sPerf
            };
          });
        }
      }
    }

    // Sort history by level order, then sublevel order
    history.sort((a, b) => {
      const lvlOrderA = a.levelId?.order ?? 0;
      const lvlOrderB = b.levelId?.order ?? 0;
      if (lvlOrderA !== lvlOrderB) return lvlOrderA - lvlOrderB;
      const subOrderA = a.subLevelId?.order ?? 0;
      const subOrderB = b.subLevelId?.order ?? 0;
      return subOrderA - subOrderB;
    });

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
    const Session = require("../../models/Session");
    const SessionSyllabusMap = require("../../models/SessionSyllabusMap");
    const { findOrCreateSessionFromBatch } = require("../../utils/sessionHelper");

    const student = await Student.findById(req.user.id)
      .populate("sessionId", "name startDate endDate")
      .populate("currentLevelId", "name order subDepartmentId")
      .populate("currentSubLevelId", "name order levelId")
      .populate("subDepartmentId", "name departmentId");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // 0. Resolve the student's actual current level and sublevel
    let currentLevel = student.currentLevelId;
    let currentSubLevel = student.currentSubLevelId;

    if (!currentLevel && student.subDepartmentId?._id) {
      currentLevel = await Level.findOne({
        subDepartmentId: student.subDepartmentId._id,
        isActive: true
      }).sort({ order: 1 });
    }

    if (currentLevel && !currentSubLevel) {
      currentSubLevel = await SubLevel.findOne({
        levelId: currentLevel._id,
        isActive: true
      }).sort({ order: 1 });
    }

    const currentLevelId = currentLevel?._id;
    const currentSubLevelId = currentSubLevel?._id;

    // 1. Resolve candidate sessions matching student's batch year (e.g., "2025-28", "2025-2028")
    const batchStr = String(student.batchYear || student.batch || student.sessionId?.name || "").trim();
    const candidateSessionIdSet = new Set();
    if (student.sessionId?._id) {
      candidateSessionIdSet.add(student.sessionId._id.toString());
    }

    let resolvedBatchSessionId = null;
    if (batchStr) {
      try {
        resolvedBatchSessionId = await findOrCreateSessionFromBatch(batchStr, student.sessionId?._id, {
          course: student.course,
          subDepartmentId: student.subDepartmentId?._id
        });
        if (resolvedBatchSessionId) {
          candidateSessionIdSet.add(resolvedBatchSessionId.toString());
        }
      } catch (_) {}

      // Find sessions matching batch year range (e.g. 2025-28 or 2025-2028 or 2025)
      const rangeMatch = batchStr.match(/\b(20\d\d)\s*[-/]\s*(\d{2,4})\b/);
      if (rangeMatch) {
        const startY = rangeMatch[1];
        const rawEnd = rangeMatch[2];
        const endY = rawEnd.length === 2 ? rawEnd : rawEnd.slice(-2);
        try {
          const sessionsByRegex = await Session.find({
            $or: [
              { name: { $regex: new RegExp(`^${startY}[-/](${endY}|20${endY})`, "i") } },
              { name: { $regex: new RegExp(`^AY\\s*${startY}[-/](${endY}|20${endY})`, "i") } },
              { name: { $regex: new RegExp(`^${startY}`, "i") } }
            ]
          }).select("_id name").lean();
          sessionsByRegex.forEach(s => candidateSessionIdSet.add(s._id.toString()));
        } catch (_) {}
      }
    }

    const candidateSessionIds = Array.from(candidateSessionIdSet);

    // Helper: Find best matching SyllabusVersion for a given target level & sublevel
    const findBestSyllabus = async ({ targetSubLevelId, targetLevelId, pinnedVersionId = null }) => {
      // Step A: Check pinned version if provided and matches target level & batch session
      if (pinnedVersionId) {
        const pinned = await SyllabusVersion.findById(pinnedVersionId).lean();
        if (pinned && pinned.isActive) {
          const matchesLevel = (!targetSubLevelId || pinned.subLevelId?.toString() === targetSubLevelId.toString()) &&
                               (!targetLevelId || pinned.levelId?.toString() === targetLevelId.toString());
          const matchesSession = candidateSessionIds.length === 0 ||
                                 candidateSessionIds.includes(pinned.sessionId?.toString());
          if (matchesLevel && matchesSession) {
            return pinned;
          }
        }
      }

      // Step B: Check SessionSyllabusMap for target sublevel & candidate batch sessions
      if (candidateSessionIds.length > 0 && targetSubLevelId) {
        const mapped = await SessionSyllabusMap.findOne({
          sessionId: { $in: candidateSessionIds },
          subLevelId: targetSubLevelId,
          isActive: true
        }).populate("syllabusVersionId").lean();

        if (mapped?.syllabusVersionId && mapped.syllabusVersionId.isActive) {
          return mapped.syllabusVersionId;
        }
      }

      // Step C: Query SyllabusVersion by subLevelId & candidate batch sessions
      if (candidateSessionIds.length > 0 && targetSubLevelId) {
        const versions = await SyllabusVersion.find({
          subLevelId: targetSubLevelId,
          sessionId: { $in: candidateSessionIds },
          isActive: true
        }).sort({ versionNumber: -1, createdAt: -1 }).lean();

        if (versions.length > 0) {
          if (student.course) {
            const courseMatch = versions.find(v => {
              const list = Array.isArray(v.courses) && v.courses.length > 0 ? v.courses : (v.course ? [v.course] : ["All"]);
              return list.some(c => c === "All" || String(c).trim().toLowerCase() === String(student.course).trim().toLowerCase());
            });
            if (courseMatch) return courseMatch;
          }
          return versions[0];
        }
      }

      // Step D: Query SyllabusVersion by levelId & candidate batch sessions
      if (candidateSessionIds.length > 0 && targetLevelId) {
        const versions = await SyllabusVersion.find({
          levelId: targetLevelId,
          sessionId: { $in: candidateSessionIds },
          isActive: true
        }).sort({ versionNumber: -1, createdAt: -1 }).lean();

        if (versions.length > 0) {
          if (student.course) {
            const courseMatch = versions.find(v => {
              const list = Array.isArray(v.courses) && v.courses.length > 0 ? v.courses : (v.course ? [v.course] : ["All"]);
              return list.some(c => c === "All" || String(c).trim().toLowerCase() === String(student.course).trim().toLowerCase());
            });
            if (courseMatch) return courseMatch;
          }
          return versions[0];
        }
      }

      // Step E: Fallback - active syllabus for targetSubLevelId regardless of session (prefer course match)
      if (targetSubLevelId) {
        const versions = await SyllabusVersion.find({
          subLevelId: targetSubLevelId,
          isActive: true
        }).sort({ versionNumber: -1, createdAt: -1 }).lean();

        if (versions.length > 0) {
          if (student.course) {
            const courseMatch = versions.find(v => {
              const list = Array.isArray(v.courses) && v.courses.length > 0 ? v.courses : (v.course ? [v.course] : ["All"]);
              return list.some(c => c === "All" || String(c).trim().toLowerCase() === String(student.course).trim().toLowerCase());
            });
            if (courseMatch) return courseMatch;
          }
          return versions[0];
        }
      }

      // Step F: Fallback - active syllabus for targetLevelId
      if (targetLevelId) {
        const versions = await SyllabusVersion.find({
          levelId: targetLevelId,
          isActive: true
        }).sort({ versionNumber: -1, createdAt: -1 }).lean();

        if (versions.length > 0) return versions[0];
      }

      return null;
    };

    // 2. Fetch Current Level Syllabus according to student's current level & batch
    const currentSyllabus = await findBestSyllabus({
      targetSubLevelId: currentSubLevelId,
      targetLevelId: currentLevelId,
      pinnedVersionId: student.syllabusVersionId
    });

    // Self-healing: if student's saved syllabusVersionId or sessionId is missing/outdated, repair it
    if (currentSyllabus?._id) {
      const updateFields = {};
      if (!student.syllabusVersionId || student.syllabusVersionId.toString() !== currentSyllabus._id.toString()) {
        updateFields.syllabusVersionId = currentSyllabus._id;
      }
      if (!student.sessionId && currentSyllabus.sessionId) {
        updateFields.sessionId = currentSyllabus.sessionId;
      } else if (!student.sessionId && resolvedBatchSessionId) {
        updateFields.sessionId = resolvedBatchSessionId;
      }
      if (Object.keys(updateFields).length > 0) {
        await Student.findByIdAndUpdate(student._id, { $set: updateFields });
      }
    }

    // Format Current Level Subjects -> Topics -> SubTopics (pure syllabus, NO tasks)
    const currentSubjects = (currentSyllabus?.subjects || []).map((subject, sIdx) => ({
      _id: subject._id,
      name: subject.name,
      code: subject.code || "",
      description: subject.description || "",
      order: subject.order || sIdx + 1,
      reportCategory: subject.reportCategory || "",
      topics: (subject.topics || []).map((topic, tIdx) => ({
        _id: topic._id,
        name: topic.name,
        description: topic.description || "",
        order: topic.order || tIdx + 1,
        subTopics: (topic.subTopics || []).map((st, stIdx) => ({
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
      levelId: currentLevelId,
      levelName: currentLevel?.name || "Current Level",
      levelOrder: currentLevel?.order || 1,
      subLevelId: currentSubLevelId,
      subLevelName: currentSubLevel?.name || "",
      subLevelOrder: currentSubLevel?.order || 1,
      syllabusVersion: currentSyllabus ? {
        _id: currentSyllabus._id,
        version: currentSyllabus.version,
        title: currentSyllabus.title || `${currentLevel?.name || "Level"} Syllabus`,
        status: currentSyllabus.status
      } : null,
      subjects: currentSubjects,
      summary: {
        totalSubjects: currentSubjects.length,
        totalTopics: totalCurrentTopics,
        totalSubTopics: totalCurrentSubTopics
      }
    };

    // 3. Hierarchy and Previous Levels
    const allDeptLevels = await Level.find({
      subDepartmentId: student.subDepartmentId?._id || student.subDepartmentId,
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
    const curLvlOrder = currentLevel?.order || 1;
    const curSubOrder = currentSubLevel?.order || 1;

    // Identify previous sublevels
    const prevSubLevels = sortedSubLevels.filter(sl => {
      if (sl._id.toString() === curSubIdStr) return false;
      return sl.levelOrder < curLvlOrder || (sl.levelOrder === curLvlOrder && sl.order < curSubOrder);
    });

    const previousLevels = [];
    for (const prevSL of prevSubLevels) {
      const pastSyllabus = await findBestSyllabus({
        targetSubLevelId: prevSL._id,
        targetLevelId: prevSL.levelId,
        pinnedVersionId: null
      });

      const pastSubjects = (pastSyllabus?.subjects || []).map((subject, sIdx) => ({
        _id: subject._id,
        name: subject.name,
        code: subject.code || "",
        description: subject.description || "",
        order: subject.order || sIdx + 1,
        reportCategory: subject.reportCategory || "",
        topics: (subject.topics || []).map((topic, tIdx) => ({
          _id: topic._id,
          name: topic.name,
          description: topic.description || "",
          order: topic.order || tIdx + 1,
          subTopics: (topic.subTopics || []).map((st, stIdx) => ({
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

    // 4. Roadmap of all levels
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

    const displayBatch = student.batchYear || student.batch || batchStr || student.sessionId?.name || "";

    return res.status(200).json({
      success: true,
      data: {
        student: {
          _id: student._id,
          prkey: student.prkey,
          name: `${student.firstName} ${student.lastName}`.trim(),
          sessionName: student.sessionId?.name || displayBatch,
          batchYear: displayBatch,
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
      StudentEventLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      StudentEventLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      total, page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: events,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get Active Faculties / Admin Staff list for Student Assignment
exports.getFaculties = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select("subDepartmentId");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const subDept = await SubDepartment.findById(student.subDepartmentId).select("departmentId");
    if (!subDept) {
      return res.status(404).json({ message: "Sub-department not found for student" });
    }

    const faculties = await User.find({
      departmentId: subDept.departmentId,
      role: { $in: ["faculty", "hod", "admin", "superadmin"] },
      isActive: true,
    }).select("name role position email mobileNo profileImage");

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

    // Safety check: Prevent modifying tasks that belong to a previous level
    const student = await Student.findById(req.user.id).select("currentLevelId currentSubLevelId firstName lastName");
    if (student?.currentSubLevelId && task.subLevelId && task.subLevelId.toString() !== student.currentSubLevelId.toString()) {
      return res.status(403).json({ message: "Previous level tasks are view-only and cannot be modified." });
    }

    task.status = status;
    if (status === "inProgress" && !task.startedAt) {
      task.startedAt = new Date();
    }
    await task.save();

    // Log event
    const StudentEventLog = require("../../models/student/StudentEventLog");
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
