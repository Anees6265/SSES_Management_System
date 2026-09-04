const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const Task = require("../models/syllabus/Task");
const { syncTasksToSubLevelStudents } = require("../services/taskAssignmentService");

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
router.get("/", verifyToken, async (req, res) => {
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
router.get("/level/:subLevelId", verifyToken, async (req, res) => {
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

module.exports = router;
