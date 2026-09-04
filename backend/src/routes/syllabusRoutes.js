const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const embeddedSyllabusController = require("../controllers/syllabus/embeddedSyllabusController");
const taskAssignmentController = require("../controllers/syllabus/taskAssignmentController");
const taskMasterBulkController = require("../controllers/syllabus/taskMasterBulkController");
const excelUpload = require("../config/excelUploadConfig");
const SyllabusVersion = require("../models/syllabus/SyllabusVersion");
const StudentTask = require("../models/syllabus/StudentTask");
const { updateStudentTaskStatus } = require("../services/taskAssignmentService");

const writeRoles = ["superadmin", "admin", "faculty", "hod"];

// ── Bulk Task Upload ──
router.post("/bulk-upload-tasks", verifyToken, checkRole(writeRoles), taskMasterBulkController.bulkUploadTasks);

// ── Combined Syllabus + Tasks Upload (one Excel) ──
router.post("/upload-combined", verifyToken, checkRole(writeRoles), embeddedSyllabusController.uploadCombined);

// ── Syllabus Version CRUD ──
router.post("/", verifyToken, checkRole(writeRoles), embeddedSyllabusController.createSyllabusVersion);
router.get("/", verifyToken, embeddedSyllabusController.getAllSyllabusVersions);

// ── Sublevel filter (must be before /:id) ──
router.get("/sublevel/:subLevelId", verifyToken, async (req, res) => {
  try {
    const { subLevelId } = req.params;
    const { sessionId } = req.query;
    const filter = { subLevelId, isActive: true };
    if (sessionId) filter.sessionId = sessionId;
    const versions = await SyllabusVersion.find(filter)
      .populate("sessionId", "name startDate endDate status")
      .populate({
        path: "levelId",
        select: "name order subDepartmentId",
        populate: {
          path: "subDepartmentId",
          select: "name departmentId",
          populate: { path: "departmentId", select: "name" }
        }
      })
      .populate("subLevelId", "name order")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: versions.length, data: versions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Assignment routes (must be before /:id) ──
router.post("/assignments/student", verifyToken, checkRole(writeRoles), taskAssignmentController.assignTasksToStudent);
router.post("/assignments/bulk", verifyToken, checkRole(writeRoles), taskAssignmentController.assignTasksToMultipleStudents);
router.post("/assignments/manual", verifyToken, checkRole(writeRoles), taskAssignmentController.assignSelectedTasksToStudents);
router.post("/assignments/session-level", verifyToken, checkRole(writeRoles), taskAssignmentController.assignTasksToSessionLevel);

// ── Student task routes (must be before /:id) ──
router.get("/students/:studentId/tasks", verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { syllabusVersionId, status } = req.query;
    if (!syllabusVersionId) return res.status(400).json({ success: false, message: "syllabusVersionId is required" });
    const query = { studentId, syllabusVersionId, isActive: true };
    if (status) query.status = status;
    const tasks = await StudentTask.find(query).sort({ assignedAt: -1, createdAt: -1 });
    res.json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/students/:studentId/tasks/summary", verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { syllabusVersionId } = req.query;
    if (!syllabusVersionId) return res.status(400).json({ success: false, message: "syllabusVersionId is required" });
    const tasks = await StudentTask.find({ studentId, syllabusVersionId, isActive: true });
    const summary = { total: tasks.length, pending: 0, inProgress: 0, completed: 0, progressPercent: 0 };
    tasks.forEach(t => { summary[t.status] = (summary[t.status] || 0) + 1; });
    if (summary.total > 0) summary.progressPercent = Math.round((summary.completed / summary.total) * 100);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch("/students/:studentId/tasks/:taskId", verifyToken, checkRole(writeRoles), async (req, res) => {
  try {
    const result = await updateStudentTaskStatus(req.params.studentId, req.params.taskId, { ...req.body, actor: req.user });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── Version by ID ──
router.get("/:id", verifyToken, embeddedSyllabusController.getSyllabusVersionById);
router.patch("/:id", verifyToken, checkRole(writeRoles), embeddedSyllabusController.updateDraftSyllabusVersion);
router.delete("/:id", verifyToken, checkRole(writeRoles), async (req, res) => {
  try {
    const sv = await SyllabusVersion.findById(req.params.id);
    if (!sv || !sv.isActive) return res.status(404).json({ success: false, message: "Not found" });
    if (sv.status === "active") return res.status(400).json({ success: false, message: "Cannot delete active syllabus" });
    sv.isActive = false;
    await sv.save();
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.patch("/:id/activate", verifyToken, checkRole(writeRoles), embeddedSyllabusController.activateSyllabusVersion);
router.patch("/:id/archive", verifyToken, checkRole(writeRoles), embeddedSyllabusController.archiveSyllabusVersion);

// ── Subject upload ──
router.post("/:id/subjects/upload", verifyToken, checkRole(writeRoles), embeddedSyllabusController.uploadSubjectWiseSyllabus);
router.post("/:id/subjects/upload-excel", verifyToken, checkRole(writeRoles), excelUpload.single("file"), embeddedSyllabusController.uploadSubjectWiseSyllabusExcel);

// ── Subject CRUD ──
router.post("/:id/subjects", verifyToken, checkRole(writeRoles), embeddedSyllabusController.addSubjectToSyllabusVersion);
router.patch("/:id/subjects/:subjectId", verifyToken, checkRole(writeRoles), embeddedSyllabusController.updateSubjectInSyllabusVersion);
router.patch("/:id/subjects/:subjectId/active", verifyToken, checkRole(writeRoles), embeddedSyllabusController.toggleSubjectActive);

// ── Topic CRUD ──
router.post("/:id/subjects/:subjectId/topics", verifyToken, checkRole(writeRoles), embeddedSyllabusController.addTopicToSyllabusVersion);
router.patch("/:id/subjects/:subjectId/topics/:topicId", verifyToken, checkRole(writeRoles), embeddedSyllabusController.updateTopicInSyllabusVersion);
router.patch("/:id/subjects/:subjectId/topics/:topicId/active", verifyToken, checkRole(writeRoles), embeddedSyllabusController.toggleTopicActive);

// ── SubTopic CRUD ──
router.post("/:id/subjects/:subjectId/topics/:topicId/subtopics", verifyToken, checkRole(writeRoles), embeddedSyllabusController.addSubTopicToSyllabusVersion);
router.patch("/:id/subjects/:subjectId/topics/:topicId/subtopics/:subTopicId", verifyToken, checkRole(writeRoles), embeddedSyllabusController.updateSubTopicInSyllabusVersion);
router.patch("/:id/subjects/:subjectId/topics/:topicId/subtopics/:subTopicId/active", verifyToken, checkRole(writeRoles), embeddedSyllabusController.toggleSubTopicActive);

// ── Task CRUD ──
router.get("/:id/tasks", verifyToken, embeddedSyllabusController.getTasksBySyllabusVersion);
router.post("/:id/tasks", verifyToken, checkRole(writeRoles), embeddedSyllabusController.addTaskToSyllabusVersion);
router.patch("/:id/tasks/:taskId/active", verifyToken, checkRole(writeRoles), embeddedSyllabusController.toggleTaskActive);

module.exports = router;
