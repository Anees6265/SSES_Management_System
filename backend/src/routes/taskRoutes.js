const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const Task = require("../models/syllabus/Task");
const StudentTask = require("../models/syllabus/StudentTask");
const Student = require("../models/student/Student");
const { syncTasksToSubLevelStudents, updateStudentTaskStatus } = require("../services/taskAssignmentService");

const writeRoles = ["superadmin", "admin", "faculty", "hod"];

const populateTaskContext = [
  {
    path: "levelId",
    select: "name order subDepartmentId",
    populate: {
      path: "subDepartmentId",
      select: "name departmentId",
      populate: { path: "departmentId", select: "name" }
    }
  },
  { path: "subLevelId", select: "name order levelId" },
  {
    path: "syllabusVersionId",
    select: "sessionId levelId subLevelId version title status",
    populate: [
      { path: "sessionId", select: "name startDate endDate status" },
      {
        path: "levelId",
        select: "name order subDepartmentId",
        populate: {
          path: "subDepartmentId",
          select: "name departmentId",
          populate: { path: "departmentId", select: "name" }
        }
      },
      { path: "subLevelId", select: "name order levelId" }
    ]
  }
];

const buildAcademicYear = (session) => {
  if (!session?.startDate || !session?.endDate) return "";
  const startYear = new Date(session.startDate).getFullYear();
  const endYear = new Date(session.endDate).getFullYear();
  if (!startYear || !endYear) return "";
  return `${startYear}-${String(endYear).slice(-2)}`;
};

const serializeTask = (task) => {
  const version = task.syllabusVersionId || null;
  const level = task.levelId || version?.levelId || null;
  const subLevel = task.subLevelId || version?.subLevelId || null;
  const subDepartment = level?.subDepartmentId || null;
  const department = subDepartment?.departmentId || null;
  const session = version?.sessionId || null;

  return {
    ...task,
    context: {
      academicYear: buildAcademicYear(session),
      session: session ? { _id: session._id, name: session.name, status: session.status } : null,
      department: department ? { _id: department._id, name: department.name } : null,
      subDepartment: subDepartment ? { _id: subDepartment._id, name: subDepartment.name } : null,
      level: level ? { _id: level._id, name: level.name, order: level.order } : null,
      subLevel: subLevel ? { _id: subLevel._id, name: subLevel.name, order: subLevel.order } : null,
      syllabusVersion: version ? {
        _id: version._id,
        title: version.title,
        version: version.version,
        status: version.status
      } : null
    }
  };
};

// Get all active tasks with academic context for management page
router.get("/", verifyToken, checkRole([...writeRoles, "placement_officer"]), async (req, res) => {
  try {
    const { priority, type, status, search } = req.query;
    const filter = { deletedAt: null };

    if (status === "all") {
      // keep both active and inactive records, but still exclude soft-deleted rows
    } else if (status === "active") filter.isActive = true;
    else if (status === "inactive") filter.isActive = false;
    else filter.isActive = true;

    if (priority) filter.priority = priority;
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { subjectName: { $regex: search, $options: "i" } },
        { topicName: { $regex: search, $options: "i" } }
      ];
    }

    const tasks = await Task.find(filter)
      .populate(populateTaskContext)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks.map(serializeTask)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create general task (not tied to syllabus)
router.post("/general", verifyToken, checkRole(writeRoles), async (req, res) => {
  try {
    const { levelId, subLevelId, title, description, type, priority, maxMarks, timeDays, measurablePoints, dueDate } = req.body;
    
    if (!levelId || !subLevelId || !title) {
      return res.status(400).json({ 
        success: false, 
        message: "levelId, subLevelId and title are required" 
      });
    }

    const task = await Task.create({
      levelId,
      subLevelId,
      title: title.trim(),
      description: description || "",
      type: type || "assignment",
      priority: priority || "medium",
      maxMarks: typeof maxMarks === "number" ? maxMarks : 5,
      timeDays: timeDays ? Number(timeDays) : null,
      measurablePoints: measurablePoints || "",
      dueDate: dueDate || null,
      isGeneralTask: true,
      taskNodeType: "general",
      assignedByName: req.user?.name || "System",
      isActive: true
    });

    // Sync to all students in this sublevel
    await syncTasksToSubLevelStudents(null, subLevelId).catch(() => {});

    res.status(201).json({
      success: true,
      message: "General task created successfully",
      data: task
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update task
router.patch("/:taskId", verifyToken, checkRole(writeRoles), async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.taskId,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Sync changes to students
    if (task.syllabusVersionId) {
      await syncTasksToSubLevelStudents(task.syllabusVersionId).catch(() => {});
    } else if (task.subLevelId) {
      await syncTasksToSubLevelStudents(null, task.subLevelId).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: task
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete task (soft delete)
router.delete("/:taskId", verifyToken, checkRole(writeRoles), async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.taskId,
      { isActive: false, deletedAt: new Date() },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    res.status(200).json({
      success: true,
      message: "Task deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get tasks by level/sublevel (including general tasks)
router.get("/level/:subLevelId", verifyToken, checkRole([...writeRoles, "placement_officer"]), async (req, res) => {
  try {
    const { subLevelId } = req.params;
    const { syllabusVersionId } = req.query;

    let filter = { 
      $or: [
        { subLevelId, isGeneralTask: true },
        { syllabusVersionId }
      ],
      isActive: true 
    };

    if (!syllabusVersionId) {
      filter = { subLevelId, isGeneralTask: true, isActive: true };
    }

    const tasks = await Task.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Student Task Endpoints ──────────────────────────────────────────────────
// Get student task performance (Subject-wise metrics & completion rate)
router.get("/student/:studentId/performance", verifyToken, checkRole([...writeRoles, "placement_officer", "student"]), async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid student ID" });
    }

    const tasks = await StudentTask.find({ studentId, isActive: true })
      .populate("subLevelId", "name")
      .sort({ assignedAt: -1, createdAt: -1 });

    const grouped = {};
    tasks.forEach(t => {
      const subLevelName = t.subLevelId?.name || "";
      const key = subLevelName ? `${t.subjectName || "Technical Course"} (${subLevelName})` : (t.subjectName || "Technical Course");
      if (!grouped[key]) grouped[key] = { tasks: [] };
      grouped[key].tasks.push(t);
    });

    const technicalSkills = [];
    let totalAllTasks = 0;
    let completedAllTasks = 0;

    Object.keys(grouped).forEach(subjectName => {
      if (subjectName.trim() === "" || subjectName.toLowerCase() === "other") return;

      const subjectTasks = grouped[subjectName].tasks || [];
      const totalTasks = subjectTasks.length;
      if (totalTasks === 0) return;

      totalAllTasks += totalTasks;
      const completedTasks = subjectTasks.filter(t => t.status === "completed");
      const completedCount = completedTasks.length;
      completedAllTasks += completedCount;

      const completedWithMarks = completedTasks.filter(t => typeof t.marks === "number");
      const averageMarks = completedWithMarks.length > 0
        ? Number((completedWithMarks.reduce((sum, t) => sum + t.marks, 0) / completedWithMarks.length).toFixed(2))
        : 0;

      let performanceLevel = "Needs Improvement";
      if (averageMarks >= 4.5) performanceLevel = "Outstanding";
      else if (averageMarks >= 4.0) performanceLevel = "Excellent";
      else if (averageMarks >= 3.5) performanceLevel = "Very Good";
      else if (averageMarks >= 3.0) performanceLevel = "Good";
      else if (averageMarks >= 2.5) performanceLevel = "Average";
      else if (completedCount > 0) performanceLevel = "Good";

      const pct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
      const rating = averageMarks > 0 ? averageMarks : 4.0;

      technicalSkills.push({
        skillName: subjectName,
        completedTasks: completedCount,
        totalTasks: totalTasks,
        totalPercentage: pct,
        rating: rating,
        remark: performanceLevel
      });
    });

    technicalSkills.sort((a, b) => a.skillName.localeCompare(b.skillName));

    const overallPct = totalAllTasks > 0 ? Math.round((completedAllTasks / totalAllTasks) * 100) : 0;

    res.status(200).json({
      success: true,
      performance: {
        totalTasks: totalAllTasks,
        completedTasks: completedAllTasks,
        completionRate: overallPct,
        technicalSkills
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get tasks for a specific student
router.get("/student/:studentId", verifyToken, checkRole([...writeRoles, "placement_officer", "student"]), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid student ID" });
    }

    const filter = { studentId, isActive: true };
    if (status) filter.status = status;

    const tasks = await StudentTask.find(filter)
      .populate("subLevelId", "name")
      .populate("levelId", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update student task status
router.put("/student/:studentId/task/:taskId", verifyToken, checkRole([...writeRoles, "placement_officer"]), async (req, res) => {
  try {
    const { studentId, taskId } = req.params;
    const { status, notes, marks } = req.body;

    const result = await updateStudentTaskStatus(studentId, taskId, {
      status,
      notes,
      marks: marks !== undefined ? marks : (status === "completed" ? 4 : null),
      actor: req.user
    });

    res.status(200).json({
      success: true,
      message: "Student task updated successfully",
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Create individual task for a student
router.post("/student/:studentId/create", verifyToken, checkRole(writeRoles), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { title, description, subjectName, topicName, maxMarks, dueDate, priority } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const task = await StudentTask.create({
      studentId,
      sessionId: student.sessionId || null,
      levelId: student.currentLevelId || null,
      subLevelId: student.currentSubLevelId || null,
      syllabusVersionId: student.syllabusVersionId || null,
      title: title?.trim() || "Individual Assignment",
      description: description || "",
      subjectName: subjectName || "General",
      topicName: topicName || "Assessment",
      taskNodeType: "topic",
      maxMarks: typeof maxMarks === "number" ? maxMarks : 5,
      dueDate: dueDate || null,
      priority: priority || "medium",
      isExtra: true,
      assignedType: "manual",
      assignedBy: req.user?._id || null,
      assignedByName: req.user?.name || "Faculty",
      assignedByRole: req.user?.role || "faculty",
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: "Task created for student successfully",
      data: task
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
