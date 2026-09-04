const Student = require("../../models/student/Student");
const StudentTask = require("../../models/syllabus/StudentTask");
const StudentProgressSnapshot = require("../../models/student/StudentProgressSnapshot");
const StudentTaskHistory = require("../../models/student/StudentTaskHistory");
const StudentEventLog = require("../../models/student/StudentEventLog");
const SubDepartment = require("../../models/department/SubDepartment");
const Level = require("../../models/department/Level");
const SubLevel = require("../../models/department/SubLevel");
const Session = require("../../models/Session");
const SyllabusVersion = require("../../models/syllabus/SyllabusVersion");
const { assignTasksToStudent } = require("../../services/taskAssignmentService");
const { promoteToNextSubLevel } = require("../../services/studentService");
const { findOrCreateSessionByName } = require("../../utils/sessionHelper");
const cloudinary = require("../../config/cloudinaryConfig");
const mongoose = require("mongoose");


// ✅ Create Student
exports.createStudent = async (req, res) => {
  try {
    const { subDepartmentId, session, year, academicYear, sessionId: inputSessionId } = req.body;

    // Duplicate check
    const existing = await Student.findOne({ prkey: req.body.prkey });
    if (existing) return res.status(409).json({ message: "Student with this prkey already exists" });

    // Validate subDepartment
    const subDept = await SubDepartment.findById(subDepartmentId);
    if (!subDept) return res.status(404).json({ message: "SubDepartment not found" });

    // 1️⃣ First Level (lowest order) under this subDepartment
    const firstLevel = await Level.findOne({ subDepartmentId, isActive: true }).sort({ order: 1 });
    if (!firstLevel) return res.status(404).json({ message: "No active level found for this subDepartment" });

    // 2️⃣ First SubLevel (lowest order) under that Level
    const firstSubLevel = await SubLevel.findOne({ levelId: firstLevel._id, isActive: true }).sort({ order: 1 });
    if (!firstSubLevel) return res.status(404).json({ message: "No active sub-level found for this level" });

    // 3️⃣ Determine Session (Find or auto-create from session/year string, or fallback to latest active session)
    let targetSessionId = null;
    const sessionInput = inputSessionId || session || year || academicYear;
    if (sessionInput) {
      targetSessionId = await findOrCreateSessionByName(sessionInput);
    }

    if (!targetSessionId) {
      const latestSession = await Session.findOne({ isActive: true }).sort({ createdAt: -1 });
      if (!latestSession) return res.status(404).json({ message: "No active session found" });
      targetSessionId = latestSession._id;
    }

    const targetSession = await Session.findById(targetSessionId);

    // 4️⃣ Latest active SyllabusVersion for this session + level + sublevel (or fallback to any active for level+sublevel)
    let latestSyllabus = await SyllabusVersion.findOne({
      sessionId: targetSessionId,
      levelId: firstLevel._id,
      subLevelId: firstSubLevel._id,
      status: "active",
      isActive: true
    }).sort({ createdAt: -1 });

    if (!latestSyllabus) {
      latestSyllabus = await SyllabusVersion.findOne({
        levelId: firstLevel._id,
        subLevelId: firstSubLevel._id,
        status: "active",
        isActive: true
      }).sort({ createdAt: -1 });
    }

    if (!latestSyllabus) return res.status(404).json({ message: "No active syllabus version found for this session/level/sublevel" });

    const student = new Student({
      ...req.body,
      sessionId: targetSessionId,
      currentLevelId: firstLevel._id,
      currentSubLevelId: firstSubLevel._id,
      syllabusVersionId: latestSyllabus._id
    });

    await student.save();

    // 5️⃣ Auto-assign tasks of this syllabus version to the student
    let taskAssignmentResult = null;
    try {
      taskAssignmentResult = await assignTasksToStudent(student._id, latestSyllabus._id);
    } catch (taskErr) {
      // Task assignment failure should not block student creation
    }

    return res.status(201).json({
      message: "Student created successfully",
      data: student,
      meta: {
        sessionName: targetSession ? targetSession.name : "N/A",
        levelName: firstLevel.name,
        subLevelName: firstSubLevel.name,
        syllabusVersion: latestSyllabus.version,
        tasksAssigned: taskAssignmentResult ? taskAssignmentResult.totalTasks : 0
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Get All Students (with department-based access control)
exports.getAllStudents = async (req, res) => {
  try {
    const { sessionId, currentLevelId, currentSubLevelId, status } = req.query;

    // req.subDeptFilter is set by departmentFilter middleware
    // null = no restriction (admin/superadmin), object = restricted to allowed subDepts
    const filter = req.subDeptFilter ? { ...req.subDeptFilter } : {};

    if (sessionId) filter.sessionId = sessionId;
    if (currentLevelId) filter.currentLevelId = currentLevelId;
    if (currentSubLevelId) filter.currentSubLevelId = currentSubLevelId;
    if (status) {
      filter.status = status;
    } else {
      filter.status = { $nin: ["Dummy", "Dropped"] };
    }

    const students = await Student.find(filter)
      .populate("subDepartmentId", "name departmentId")
      .populate("sessionId", "name startDate endDate status isActive")
      .populate("currentLevelId", "name order")
      .populate("currentSubLevelId", "name order")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: students.length, data: students });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Get Student by ID
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate({
        path: "subDepartmentId",
        select: "name departmentId",
        populate: {
          path: "departmentId",
          select: "name code reportConfig"
        }
      })
      .populate("sessionId", "name")
      .populate("syllabusVersionId", "version title")
      .populate("currentLevelId", "name order")
      .populate("currentSubLevelId", "name order");

    if (!student) return res.status(404).json({ message: "Student not found" });

    // Resolve student's actual technology from database
    let actualTech = "Technology Not Updated";
    if (Array.isArray(student.technologies) && student.technologies.filter(Boolean).length > 0) {
      actualTech = student.technologies.filter(Boolean).join(" | ");
    } else if (Array.isArray(student.technology) && student.technology.filter(Boolean).length > 0) {
      actualTech = student.technology.filter(Boolean).join(" | ");
    } else {
      const techVal = student.techno || student.technology || student.track;
      if (techVal && typeof techVal === "string" && techVal.trim()) {
        actualTech = techVal.trim();
      }
    }

    // Attach placement readiness
    const StudentPlacement = require("../../models/placement/StudentPlacement");
    const placement = await StudentPlacement.findOne({ studentId: req.params.id })
      .select("readinessStatus placedInfo PlacementinterviewRecord resumeURL offerLetter commitmentApplication");

    // Attach overall task progress (all non-extra tasks)
    const allTasks = await StudentTask.find({ studentId: req.params.id, isExtra: false });
    const overallTotal     = allTasks.length;
    const overallCompleted = allTasks.filter(t => t.status === "completed").length;
    const overallPct       = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;

    const studentObj = student.toObject();
    studentObj.technology = actualTech;
    studentObj.techno = student.techno || student.technology || student.track || (actualTech !== "Technology Not Updated" ? actualTech : "");
    studentObj.track = student.track || (actualTech !== "Technology Not Updated" ? actualTech : "");

    return res.status(200).json({
      data: {
        ...studentObj,
        placement: placement || null,
        overallProgress: { total: overallTotal, completed: overallCompleted, percentage: overallPct },
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Update Student Elective Technology
exports.updateTechnology = async (req, res) => {
  try {
    const { techno, technology, track, technologies } = req.body;
    const techVal = techno || technology || track || (Array.isArray(technologies) ? technologies.join(" | ") : null);
    if (!techVal) return res.status(400).json({ message: "Technology field is required" });

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    student.techno = techVal;
    student.technology = techVal;
    student.track = techVal;
    if (Array.isArray(technologies)) {
      student.technologies = technologies;
    }
    await student.save();

    return res.status(200).json({ message: "Technology updated successfully", data: student });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};



// ✅ Update Student Basic Info
exports.updateStudent = async (req, res) => {
  try {
    const allowedFields = [
      "firstName", "lastName", "fatherName", "email", "studentMobile",
      "parentMobile", "gender", "dob", "aadharCard", "address", "track",
      "village", "stream", "course", "category", "subject12", "year12",
      "percent12", "percent10", "status", "isFTP"
    ];
    const updateData = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });

    const sessionInput = req.body.sessionId || req.body.session || req.body.year || req.body.academicYear;
    if (sessionInput) {
      const targetSessionId = await findOrCreateSessionByName(sessionInput);
      if (targetSessionId) {
        updateData.sessionId = targetSessionId;
      }
    }

    const student = await Student.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ message: "Student not found" });
    return res.status(200).json({ message: "Student updated successfully", data: student });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Update Profile Image
exports.updateProfileImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: "Image is required" });
    if (!/^data:image\/(png|jpeg|jpg|gif);base64,/.test(image))
      return res.status(400).json({ message: "Invalid image format. Must be base64 encoded." });


    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });


    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });


    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: "student_profiles",
      public_id: `student_${req.params.id}`,
      overwrite: true,
    });


    student.image = uploadResponse.secure_url;
    await student.save();
    return res.status(200).json({ message: "Profile image updated successfully", imageURL: student.image });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Upload Document (image or pdf)
exports.uploadDocument = async (req, res) => {
  try {
    const { title, fileData, fileType } = req.body;
    if (!title || !fileData || !fileType)
      return res.status(400).json({ message: "title, fileData, and fileType are required" });
    if (!["image", "pdf"].includes(fileType))
      return res.status(400).json({ message: "fileType must be 'image' or 'pdf'" });


    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });


    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });


    const uploadOptions = {
      folder: "student_documents",
      resource_type: fileType === "pdf" ? "raw" : "image",
      public_id: `doc_${req.params.id}_${Date.now()}`,
    };


    const uploadResponse = await cloudinary.uploader.upload(fileData, uploadOptions);


    const doc = {
      title,
      fileURL: uploadResponse.secure_url,
      fileType,
      uploadedBy: req.user?._id || null,
      uploadedByName: req.user?.name || "",
      uploadedAt: new Date(),
    };


    student.documents.push(doc);
    await student.save();


    return res.status(201).json({ message: "Document uploaded successfully", data: doc });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Delete Document
exports.deleteDocument = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });


    const docIndex = student.documents.findIndex(d => d._id.toString() === req.params.docId);
    if (docIndex === -1) return res.status(404).json({ message: "Document not found" });


    student.documents.splice(docIndex, 1);
    await student.save();
    return res.status(200).json({ message: "Document deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Update Permission Details
exports.updatePermission = async (req, res) => {
  try {
    const { imageURL, remark, approved_by } = req.body;
    if (!imageURL || !approved_by) return res.status(400).json({ message: "imageURL and approved_by are required" });
    if (!["super admin", "admin", "faculty"].includes(approved_by))
      return res.status(400).json({ message: "Invalid approved_by role" });


    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });


    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });


    const uploadResponse = await cloudinary.uploader.upload(imageURL, { folder: "permission_applications" });


    student.permissionDetails = {
      imageURL: uploadResponse.secure_url,
      remark: remark || "",
      approved_by,
      uploadDate: new Date(),
    };
    await student.save();
    return res.status(200).json({ message: "Permission updated successfully", data: student.permissionDetails });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Get Students with Permission (filterable by status)
exports.getPermissionStudents = async (req, res) => {
  try {
    const { status = "pending" } = req.query;
    const validStatuses = ["pending", "approved", "rejected"];
    const statusFilter = validStatuses.includes(status) ? status : "pending";

    const filter = req.subDeptFilter ? { ...req.subDeptFilter } : {};
    filter["permissionDetails"] = { $ne: null };
    filter["permissionDetails.status"] = statusFilter;

    const students = await Student.find(filter)
      .select("prkey firstName lastName email studentMobile permissionDetails currentLevelId currentSubLevelId subDepartmentId")
      .populate("currentLevelId", "name")
      .populate("currentSubLevelId", "name")
      .sort({ updatedAt: -1 });
    return res.status(200).json({ count: students.length, data: students });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Approve or Reject Leave Permission (legacy single permission workflow)
exports.updatePermissionStatus = async (req, res) => {
  try {
    const { status, remark } = req.body;
    const validStatuses = ["approved", "rejected"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${validStatuses.join(", ")}` });
    }

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (!student.permissionDetails) {
      return res.status(400).json({ message: "No permission request found for this student" });
    }

    student.permissionDetails.status = status;
    if (remark !== undefined) student.permissionDetails.remark = remark;
    await student.save();

    return res.status(200).json({
      message: `Permission ${status} successfully`,
      data: student.permissionDetails,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Get Student Tasks (level-wise / sublevel-wise)
exports.getStudentTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const { subLevelId, status } = req.query;


    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: "Student not found" });


    const filter = {
      studentId: id,
    };
    if (subLevelId === "all") {
      // Return all tasks across all sublevels/syllabus versions
    } else if (subLevelId) {
      filter.subLevelId = subLevelId;
    } else {
      filter.syllabusVersionId = student.syllabusVersionId;
    }
    if (status) filter.status = status;


    const tasks = await StudentTask.find(filter)
      .populate("subLevelId", "name")
      .sort({ assignedAt: -1, createdAt: -1 });


    // Group by subject
    const grouped = {};
    tasks.forEach(t => {
      const subLevelName = t.subLevelId?.name || "";
      const key = subLevelName ? `${t.subjectName || "Other"} (${subLevelName})` : (t.subjectName || "Other");
      if (!grouped[key]) grouped[key] = { subjectId: t.subjectId, tasks: [] };
      grouped[key].tasks.push(t);
    });


    return res.status(200).json({
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === "completed").length,
      pendingTasks: tasks.filter(t => t.status === "pending").length,
      inProgressTasks: tasks.filter(t => t.status === "inProgress").length,
      groupedBySubject: grouped,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Get Student Tasks by SubLevel
exports.getStudentTasksBySubLevel = async (req, res) => {
  try {
    const { id, subLevelId } = req.params;


    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: "Student not found" });


    const tasks = await StudentTask.find({
      studentId: id,
      subLevelId,
    }).sort({ subjectName: 1, topicName: 1 });


    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === "completed").length,
      pending: tasks.filter(t => t.status === "pending").length,
      inProgress: tasks.filter(t => t.status === "inProgress").length,
      averageMarks: 0,
    };


    const completedWithMarks = tasks.filter(t => t.status === "completed" && t.marks !== null);
    if (completedWithMarks.length > 0) {
      stats.averageMarks = parseFloat(
        (completedWithMarks.reduce((sum, t) => sum + t.marks, 0) / completedWithMarks.length).toFixed(2)
      );
    }


    return res.status(200).json({ stats, tasks });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Get Student Task History
exports.getStudentTaskHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { taskId, subLevelId, page = 1, limit = 20 } = req.query;


    const filter = { studentId: id };
    if (taskId) filter.taskId = taskId;
    if (subLevelId) filter.subLevelId = subLevelId;


    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [history, total] = await Promise.all([
      StudentTaskHistory.find(filter).sort({ changedAt: -1 }).skip(skip).limit(parseInt(limit)),
      StudentTaskHistory.countDocuments(filter),
    ]);


    return res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: history,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Get Student Progress Snapshots
exports.getStudentProgressSnapshots = async (req, res) => {
  try {
    const { id } = req.params;
    const { subLevelId, scope, page = 1, limit = 20 } = req.query;


    const filter = { studentId: id };
    if (subLevelId) filter.subLevelId = subLevelId;
    if (scope) filter.snapshotScope = scope;


    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [snapshots, total] = await Promise.all([
      StudentProgressSnapshot.find(filter).sort({ changedAt: -1 }).skip(skip).limit(parseInt(limit)),
      StudentProgressSnapshot.countDocuments(filter),
    ]);


    return res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: snapshots,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Promote Student to Next SubLevel (Manual or Auto-triggered)
// ✅ Get Student Activity Feed
exports.getStudentActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, page = 1, limit = 20 } = req.query;

    const filter = { studentId: id };
    if (type) filter.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [activity, total] = await Promise.all([
      StudentEventLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      StudentEventLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: activity,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get leave permission requests from the history-based permissions array.
// Department filtering is handled by departmentFilter middleware.
exports.getLeaveRequests = async (req, res) => {
  try {
    const { status = "pending" } = req.query;
    const validStatuses = ["pending", "approved", "rejected", "all"];
    const statusFilter = validStatuses.includes(status) ? status : "pending";

    const filter = req.subDeptFilter ? { ...req.subDeptFilter } : {};
    filter["permissions.0"] = { $exists: true };
    if (statusFilter !== "all") filter["permissions.status"] = statusFilter;

    const isFacultyOnly = req.user && req.user.role === "faculty";

    const students = await Student.find(filter)
      .select("prkey firstName lastName image email studentMobile permissions currentLevelId currentSubLevelId subDepartmentId")
      .populate("subDepartmentId", "name departmentId")
      .populate("currentLevelId", "name order")
      .populate("currentSubLevelId", "name order")
      .populate("permissions.assignedFacultyId", "name role position email")
      .sort({ updatedAt: -1 });

    const requests = students.flatMap((student) => {
      const studentObj = student.toObject();
      return (studentObj.permissions || [])
        .filter((permission) => {
          const matchesStatus = statusFilter === "all" || permission.status === statusFilter;
          if (!matchesStatus) return false;

          // If the logged-in user is just a faculty member, they only see leave requests assigned to them
          if (isFacultyOnly) {
            const assignedId = permission.assignedFacultyId?._id || permission.assignedFacultyId;
            return assignedId && assignedId.toString() === req.user.id.toString();
          }
          return true;
        })
        .map((permission) => ({
          ...permission,
          student: {
            _id: studentObj._id,
            prkey: studentObj.prkey,
            firstName: studentObj.firstName,
            lastName: studentObj.lastName,
            image: studentObj.image,
            email: studentObj.email,
            studentMobile: studentObj.studentMobile,
            subDepartmentId: studentObj.subDepartmentId,
            currentLevelId: studentObj.currentLevelId,
            currentSubLevelId: studentObj.currentSubLevelId,
          },
        }));
    }).sort((a, b) => new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0));

    return res.status(200).json({ count: requests.length, data: requests });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get Dummy Students
exports.getDummyStudents = async (req, res) => {
  try {
    const filter = req.subDeptFilter ? { ...req.subDeptFilter } : {};
    filter.status = { $in: ["Dummy", "Dropped"] };

    const students = await Student.find(filter)
      .select("prkey firstName lastName email studentMobile course status dummyDetails currentLevelId currentSubLevelId subDepartmentId")
      .populate("subDepartmentId", "name departmentId")
      .populate("currentLevelId", "name order")
      .populate("currentSubLevelId", "name order")
      .sort({ "dummyDetails.markedAt": -1, updatedAt: -1 });

    return res.status(200).json({ count: students.length, data: students });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.promoteStudent = async (req, res) => {
  try {
    const result = await promoteToNextSubLevel(req.params.id, req.user);
    return res.status(200).json({
      message: result.completedAllLevels
        ? "Student completed all levels and is ready for placement"
        : result.promotedToNewLevel
        ? "Student promoted to next level"
        : "Student promoted to next sub-level",
      data: result,
    });
  } catch (error) {
    const status = error.statusCode
      || (error.message.includes("not found") ? 404
      : error.message.includes("already completed") ? 400
      : error.message.includes("Only active") ? 400
      : 500);
    return res.status(status).json({ message: error.message });
  }
};


// ✅ Update Readiness Status
exports.updateReadinessStatus = async (req, res) => {
  try {
    const { readinessStatus } = req.body;
    const validStatuses = ["Ready", "Not Ready", "In Progress", "Ready for Interview"];
    if (!readinessStatus || !validStatuses.includes(readinessStatus))
      return res.status(400).json({ message: `readinessStatus must be one of: ${validStatuses.join(", ")}` });


    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { readinessStatus },
      { new: true, runValidators: true }
    ).select("_id prkey firstName lastName readinessStatus");


    if (!student) return res.status(404).json({ message: "Student not found" });
    return res.status(200).json({ message: "Readiness status updated", data: student });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Update Placement Readiness Status
// Updates StudentPlacement.readinessStatus.
// Creates a StudentPlacement record if one doesn't exist yet.
// This is the correct endpoint for toggling placement readiness from the student profile.
exports.updatePlacementReadiness = async (req, res) => {
  try {
    const { id } = req.params;
    const { readinessStatus } = req.body;

    const validStatuses = ["Not Ready", "In Progress", "Ready", "Ready for Interview", "Ready for Placement", "Ready for Drive"];
    if (!readinessStatus || !validStatuses.includes(readinessStatus)) {
      return res.status(400).json({ message: `readinessStatus must be one of: ${validStatuses.join(", ")}` });
    }

    const student = await Student.findById(id).select("subDepartmentId status");
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.status === "Dropped") {
      return res.status(400).json({ message: "Cannot update readiness for a dropped student" });
    }

    const StudentPlacement = require("../../models/placement/StudentPlacement");

    const placement = await StudentPlacement.findOneAndUpdate(
      { studentId: id },
      {
        $set: { readinessStatus },
        $setOnInsert: { studentId: id, subDepartmentId: student.subDepartmentId }
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      message: "Placement readiness updated successfully",
      data: { studentId: id, readinessStatus: placement.readinessStatus },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ HOD Move Student to "Ready for Placement" after Level 2A
exports.moveToReadyForPlacement = async (req, res) => {
  try {
    const { id } = req.params;
    const actorRole = (req.user?.role || "").toLowerCase();

    // 1. Role permission check: HOD, SuperAdmin, Admin
    const allowedRoles = ["hod", "superadmin", "admin"];
    if (!allowedRoles.includes(actorRole)) {
      return res.status(403).json({ success: false, message: "Unauthorized. Only HOD or Admin can move student to Ready for Placement." });
    }

    // 2. Find student
    const student = await Student.findById(id)
      .populate("currentLevelId", "name order")
      .populate("currentSubLevelId", "name order levelId");

    if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    if (student.status !== "Active") {
      return res.status(400).json({ success: false, message: "Only active students can be moved to Ready for Placement" });
    }

    // 3. Verify student has completed Level 2A
    const StudentLevelProgress = require("../../models/student/StudentLevelProgress");
    const SubLevel = require("../../models/department/SubLevel");
    const StudentEventLog = require("../../models/student/StudentEventLog");
    const StudentPlacement = require("../../models/placement/StudentPlacement");

    // Find SubLevel matching 2A
    const subLevel2A = await SubLevel.findOne({
      name: { $regex: /2A/i },
      isActive: true,
    });

    let completedLevel2A = false;

    if (subLevel2A) {
      const progress2A = await StudentLevelProgress.findOne({
        studentId: id,
        subLevelId: subLevel2A._id,
        status: "completed",
      });
      if (progress2A) {
        completedLevel2A = true;
      }
    }

    // Secondary check: if current sublevel is past 2A (e.g., 2B, 2C, or higher order)
    if (!completedLevel2A && student.currentSubLevelId) {
      const curSubName = (student.currentSubLevelId.name || "").toUpperCase();
      const curLevelOrder = student.currentLevelId?.order || 0;
      if (curSubName.includes("2B") || curSubName.includes("2C") || curLevelOrder > 2) {
        completedLevel2A = true;
      } else if (subLevel2A && student.currentSubLevelId.order > subLevel2A.order && (student.currentSubLevelId.levelId?.toString() === subLevel2A.levelId?.toString() || curLevelOrder >= 2)) {
        completedLevel2A = true;
      }
    }

    if (!completedLevel2A) {
      return res.status(400).json({
        success: false,
        message: "Student has not completed Level 2A yet. Cannot move to Ready for Placement.",
      });
    }

    // 4. Prevent duplicate status changes
    let placement = await StudentPlacement.findOne({ studentId: id });
    if (placement && ["Ready for Placement", "Ready for Drive", "Ready for Interview", "Placed"].includes(placement.readinessStatus)) {
      return res.status(400).json({
        success: false,
        message: `Student is already in "${placement.readinessStatus}" stage or beyond.`,
      });
    }

    // 5. Update or create StudentPlacement status
    if (!placement) {
      placement = new StudentPlacement({
        studentId: id,
        subDepartmentId: student.subDepartmentId,
        readinessStatus: "Ready for Placement",
      });
    } else {
      placement.readinessStatus = "Ready for Placement";
    }
    await placement.save();

    // 6. Log audit event
    await StudentEventLog.create({
      studentId: id,
      type: "promotion",
      action: "moved_to_ready_for_placement",
      title: "Moved to Ready for Placement",
      description: `HOD (${req.user?.name || "Authorized User"}) moved student to Ready for Placement after Level 2A completion`,
      createdBy: req.user?.id || req.user?._id || null,
      createdByName: req.user?.name || "",
      createdByRole: req.user?.role || "",
    });

    return res.status(200).json({
      success: true,
      message: "Student moved to Ready for Placement successfully",
      data: {
        studentId: id,
        readinessStatus: placement.readinessStatus,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ✅ Assign Extra Task to Individual Student (outside syllabus)
// Extra tasks appear only on that student's profile.
// They do not affect syllabus progress or auto-promotion.
exports.assignExtraTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, maxMarks, subjectName, topicName, notes } = req.body;

    if (!title) return res.status(400).json({ message: "title is required" });

    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.status !== "Active") return res.status(400).json({ message: "Only active students can receive extra tasks" });

    const extraTask = await StudentTask.create({
      studentId: student._id,
      // syllabus fields are null for extra tasks
      sessionId: student.sessionId || null,
      levelId: student.currentLevelId || null,
      subLevelId: student.currentSubLevelId || null,
      syllabusVersionId: student.syllabusVersionId || null,
      taskId: null,
      subjectId: null,
      topicId: null,
      subTopicId: null,
      subjectName: subjectName || "Extra",
      topicName: topicName || "Extra Task",
      subTopicName: null,
      taskNodeType: "topic",
      title,
      description: description || "",
      type: type || "assignment",
      mandatory: false,
      maxMarks: typeof maxMarks === "number" ? maxMarks : 5,
      notes: notes || "",
      assignedType: "manual",
      assignedBy: req.user?.id || req.user?._id || null,
      assignedByName: req.user?.name || "",
      assignedByRole: req.user?.role || "",
      assignedAt: new Date(),
      isExtra: true,
      isActive: true,
    });

    return res.status(201).json({
      message: "Extra task assigned successfully",
      data: extraTask,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get Extra Tasks for a Student
exports.getExtraTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const tasks = await StudentTask.find({
      studentId: id,
      isExtra: true,
      isActive: true,
    }).sort({ assignedAt: -1 });

    return res.status(200).json({
      total: tasks.length,
      completed: tasks.filter(t => t.status === "completed").length,
      pending: tasks.filter(t => t.status === "pending").length,
      data: tasks,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Upload Extra Document (with remark)
exports.uploadExtraDocument = async (req, res) => {
  try {
    const { title, fileData, fileType, remark } = req.body;
    if (!title || !fileData || !fileType)
      return res.status(400).json({ message: "title, fileData, and fileType are required" });
    if (!["image", "pdf"].includes(fileType))
      return res.status(400).json({ message: "fileType must be 'image' or 'pdf'" });

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadResponse = await cloudinary.uploader.upload(fileData, {
      folder: "student_extra_documents",
      resource_type: fileType === "pdf" ? "raw" : "image",
      public_id: `extradoc_${req.params.id}_${Date.now()}`,
    });

    const doc = {
      title,
      fileURL: uploadResponse.secure_url,
      fileType,
      remark: remark || "",
      isExtra: true,
      uploadedBy: req.user?._id || null,
      uploadedByName: req.user?.name || "",
      uploadedAt: new Date(),
    };

    student.documents.push(doc);
    await student.save();
    return res.status(201).json({ message: "Extra document uploaded successfully", data: doc });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get Extra Documents
exports.getExtraDocuments = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select("documents");
    if (!student) return res.status(404).json({ message: "Student not found" });
    const extraDocs = student.documents.filter(d => d.isExtra === true);
    return res.status(200).json({ count: extraDocs.length, data: extraDocs });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Apply for Permission (student-initiated flow)
exports.applyPermission = async (req, res) => {
  try {
    const { reason, fromDate, toDate, imageURL, assignedFacultyId } = req.body;
    if (!reason || !fromDate || !toDate)
      return res.status(400).json({ message: "reason, fromDate, toDate are required" });

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    let uploadedImageURL = "";
    if (imageURL) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      const uploadResponse = await cloudinary.uploader.upload(imageURL, { folder: "permission_applications" });
      uploadedImageURL = uploadResponse.secure_url;
    }

    const permission = {
      imageURL: uploadedImageURL,
      reason,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      status: "pending",
      uploadDate: new Date(),
      assignedFacultyId: assignedFacultyId || null
    };

    student.permissions.push(permission);
    await student.save();
    const addedPermission = student.permissions[student.permissions.length - 1];

    await StudentEventLog.create({
      studentId: student._id,
      type: "permission",
      action: "leave_request_submitted",
      title: "Leave request submitted",
      description: reason,
      meta: {
        permissionId: addedPermission._id,
        status: "pending",
        fromDate: permission.fromDate,
        toDate: permission.toDate,
        hasDocument: Boolean(uploadedImageURL),
        assignedFacultyId: addedPermission.assignedFacultyId,
      },
      createdBy: req.user?.id || req.user?._id || null,
      createdByName: req.user?.name || `${student.firstName || ""} ${student.lastName || ""}`.trim(),
      createdByRole: req.user?.role || "student",
    });

    return res.status(201).json({
      message: "Permission applied successfully",
      data: addedPermission,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get Permission History
exports.getPermissions = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .select("permissions")
      .populate("permissions.assignedFacultyId", "name role position email");
    if (!student) return res.status(404).json({ message: "Student not found" });
    return res.status(200).json({
      count: student.permissions.length,
      data: student.permissions.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Approve / Reject Permission
exports.resolvePermission = async (req, res) => {
  try {
    const { status, remark } = req.body;
    if (!["approved", "rejected"].includes(status))
      return res.status(400).json({ message: "status must be 'approved' or 'rejected'" });

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const permission = student.permissions.id(req.params.permissionId);
    if (!permission) return res.status(404).json({ message: "Permission not found" });
    if (permission.status !== "pending")
      return res.status(400).json({ message: "Permission already resolved" });

    // Role and Assignment Validation
    const isAuthorized = 
      ["superadmin", "hod", "admin"].includes(req.user.role) ||
      (permission.assignedFacultyId && permission.assignedFacultyId.toString() === req.user.id.toString());

    if (!isAuthorized) {
      return res.status(403).json({ 
        message: "You are not authorized to resolve this leave request. Only the assigned faculty member, HOD, or Superadmin can resolve it." 
      });
    }

    permission.status = status;
    permission.remark = remark || "";
    permission.approvedBy = req.user?.name || "";
    permission.approvedAt = new Date();

    await student.save();
    await StudentEventLog.create({
      studentId: student._id,
      type: "permission",
      action: `leave_request_${status}`,
      title: `Leave request ${status}`,
      description: remark || permission.reason || "",
      meta: {
        permissionId: permission._id,
        status,
        reason: permission.reason,
        remark: remark || "",
        fromDate: permission.fromDate,
        toDate: permission.toDate,
      },
      createdBy: req.user?.id || req.user?._id || null,
      createdByName: req.user?.name || "",
      createdByRole: req.user?.role || "",
    });

    return res.status(200).json({ message: `Permission ${status}`, data: permission });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Mark Student as Dropped (with application document upload)
exports.markDropped = async (req, res) => {
  try {
    const { remark, fileData, fileType } = req.body;
    if (!remark) return res.status(400).json({ message: "remark is required" });
    if (!fileData || !fileType) return res.status(400).json({ message: "Application document is required" });
    if (!["image", "pdf"].includes(fileType)) return res.status(400).json({ message: "fileType must be image or pdf" });

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.status === "Dropped") return res.status(400).json({ message: "Student is already dropped" });

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadResponse = await cloudinary.uploader.upload(fileData, {
      folder: "drop_applications",
      resource_type: fileType === "pdf" ? "raw" : "image",
      public_id: `drop_${req.params.id}_${Date.now()}`,
    });

    // Store document in student.documents with isExtra: false
    student.documents.push({
      title: `Drop Application`,
      fileURL: uploadResponse.secure_url,
      fileType,
      remark,
      isExtra: false,
      uploadedBy: req.user?._id || null,
      uploadedByName: req.user?.name || "",
      uploadedAt: new Date(),
    });

    student.status = "Dropped";
    await student.save();

    return res.status(200).json({
      message: "Student marked as Dropped",
      data: { studentId: student._id, status: student.status },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get Student Dashboard Stats (department-aware)
// ✅ Mark Student as Dummy (separate from dropped and leave permission)
exports.markDummy = async (req, res) => {
  try {
    const { reason, remark, fileData, fileType } = req.body;
    if (!reason) return res.status(400).json({ message: "reason is required" });
    if (!fileData || !fileType) return res.status(400).json({ message: "Application document is required" });
    if (!["image", "pdf"].includes(fileType)) return res.status(400).json({ message: "fileType must be image or pdf" });

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.status === "Dummy") return res.status(400).json({ message: "Student is already marked as dummy" });

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadResponse = await cloudinary.uploader.upload(fileData, {
      folder: "dummy_applications",
      resource_type: fileType === "pdf" ? "raw" : "image",
      public_id: `dummy_${req.params.id}_${Date.now()}`,
    });

    student.dummyDetails = {
      reason,
      remark: remark || "",
      applicationURL: uploadResponse.secure_url,
      applicationType: fileType,
      markedBy: req.user?._id || null,
      markedByName: req.user?.name || "",
      markedAt: new Date(),
    };

    student.documents.push({
      title: "Dummy Student Application",
      fileURL: uploadResponse.secure_url,
      fileType,
      remark: remark || reason,
      isExtra: false,
      uploadedBy: req.user?._id || null,
      uploadedByName: req.user?.name || "",
      uploadedAt: new Date(),
    });

    student.status = "Dummy";
    await student.save();

    return res.status(200).json({
      message: "Student marked as Dummy",
      data: { studentId: student._id, status: student.status, dummyDetails: student.dummyDetails },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getStudentStats = async (req, res) => {
  try {
    const base = req.subDeptFilter ? { ...req.subDeptFilter } : {};

    const [total, active, placed, dropped, dummy] = await Promise.all([
      Student.countDocuments(base),
      Student.countDocuments({ ...base, status: "Active" }),
      Student.countDocuments({ ...base, status: "Placed" }),
      Student.countDocuments({ ...base, status: "Dropped" }),
      Student.countDocuments({ ...base, status: "Dummy" }),
    ]);
    return res.status(200).json({ total, active, placed, dropped, dummy });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getSubLevelStudentsProgress = async (req, res) => {
  try {
    const { subLevelId } = req.params;

    const students = await Student.find({
      currentSubLevelId: subLevelId,
      status: { $nin: ["Dummy", "Dropped"] },
    })
      .populate("currentSubLevelId", "name")
      .select("firstName lastName prkey status currentSubLevelId image attendanceRate");

    const studentIds = students.map(s => s._id);

    const tasks = await StudentTask.find({
      studentId: { $in: studentIds },
      subLevelId: subLevelId,
      isExtra: false,
      isActive: true
    }).select("studentId subjectId subjectName status");

    const tasksByStudent = {};
    studentIds.forEach(id => {
      tasksByStudent[id.toString()] = [];
    });
    tasks.forEach(t => {
      const sIdStr = t.studentId.toString();
      if (tasksByStudent[sIdStr]) {
        tasksByStudent[sIdStr].push(t);
      }
    });

    const data = students.map(student => {
      const sIdStr = student._id.toString();
      const sTasks = tasksByStudent[sIdStr] || [];

      const total = sTasks.length;
      const completed = sTasks.filter(t => t.status === "completed").length;
      const inProgress = sTasks.filter(t => t.status === "inProgress").length;
      const pending = sTasks.filter(t => t.status === "pending").length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      const subjectsMap = {};
      sTasks.forEach(t => {
        const subName = t.subjectName || "Unknown";
        if (!subjectsMap[subName]) {
          subjectsMap[subName] = [];
        }
        subjectsMap[subName].push(t);
      });

      const subjectProgress = Object.entries(subjectsMap).map(([subjectName, subTasks]) => {
        const subTotal = subTasks.length;
        const subCompleted = subTasks.filter(t => t.status === "completed").length;
        const subInProgress = subTasks.filter(t => t.status === "inProgress").length;

        let status = "pending";
        if (subCompleted === subTotal && subTotal > 0) {
          status = "completed";
        } else if (subCompleted > 0 || subInProgress > 0) {
          status = "inProgress";
        }

        return { subjectName, status };
      });

      return {
        _id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        firstName: student.firstName,
        lastName: student.lastName,
        image: student.image,
        level: student.currentSubLevelId?.name || "—",
        prkey: student.prkey,
        currentStatus: student.status,
        attendanceRate: student.attendanceRate ?? 100,
        taskProgress: { completed, total, percentage },
        subjectProgress,
        statusCounters: { pending, inProgress, completed }
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get Student Level History (Admin / Faculty)
exports.getStudentLevelHistory = async (req, res) => {
  try {
    const StudentLevelProgress = require("../../models/student/StudentLevelProgress");
    const history = await StudentLevelProgress.find({ studentId: req.params.id })
      .populate("levelId", "name order")
      .populate("subLevelId", "name order")
      .populate("sessionId", "name")
      .sort({ createdAt: 1 });

    return res.status(200).json({ count: history.length, data: history });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
