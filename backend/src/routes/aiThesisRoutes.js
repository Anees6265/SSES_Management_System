const express = require("express");
const router = express.Router();
const multer = require("multer");
const aiThesisController = require("../controllers/student/aiThesisController");
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");

// Multer storage for handwritten visionary exercise sheets (up to 15MB per page, max 10 pages)
const uploadHandwritten = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|pdf/i;
    if (allowed.test(file.mimetype) || allowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Only images (JPG, PNG, WEBP) and PDF files are allowed"), false);
    }
  },
});

// All AI Thesis routes require authentication
router.use(verifyToken);

// ── Student Self-Access Endpoints ───────────────────────────────────────────
router.get("/my-thesis", aiThesisController.getStudentThesis);
router.get("/my-versions", aiThesisController.getThesisVersions);
router.post("/upload-handwritten", uploadHandwritten.array("images", 10), aiThesisController.uploadHandwrittenExercise);
router.post("/delete-handwritten-page", aiThesisController.deleteHandwrittenPage);
router.post("/draft", aiThesisController.saveDraftAssessment);
router.post("/save", aiThesisController.saveDraftAssessment);
router.post("/start", aiThesisController.startNewVersion);
router.post("/analyze", aiThesisController.analyzeAndGenerateThesis);
router.post("/discovery-step", aiThesisController.submitDiscoveryStep);
router.post("/discovery-reset", aiThesisController.resetDiscovery);
router.post("/confirm", aiThesisController.confirmThesis);
router.post("/new-version", aiThesisController.startNewVersion);
router.put("/statements", aiThesisController.updateStatements);
router.post("/reflect", aiThesisController.submitReflection);

// ── Role-Based / Faculty Access Endpoints by Student ID or Assessment ID ──────
router.get("/:studentId", aiThesisController.getStudentThesis);
router.get("/:studentId/versions", aiThesisController.getThesisVersions);
router.get("/:studentId/history", aiThesisController.getThesisVersions);
router.post("/:studentId/upload-handwritten", uploadHandwritten.array("images", 10), aiThesisController.uploadHandwrittenExercise);
router.post("/:studentId/delete-handwritten-page", aiThesisController.deleteHandwrittenPage);
router.post("/:studentId/draft", aiThesisController.saveDraftAssessment);
router.post("/:studentId/save", aiThesisController.saveDraftAssessment);
router.post("/:studentId/analyze", aiThesisController.analyzeAndGenerateThesis);
router.post("/:studentId/discovery-step", aiThesisController.submitDiscoveryStep);
router.post("/:studentId/discovery-reset", aiThesisController.resetDiscovery);
router.post("/:studentId/confirm", aiThesisController.confirmThesis);
router.post("/:studentId/new-version", aiThesisController.startNewVersion);
router.put("/:studentId/statements", aiThesisController.updateStatements);
router.put("/:studentId", aiThesisController.updateStatements);
router.post("/:studentId/reflect", aiThesisController.submitReflection);

// Mentor Feedback & Interventions (Faculty / Admin / HOD / Superadmin)
router.post(
  "/:studentId/mentor-feedback",
  checkRole(["superadmin", "admin", "faculty", "hod", "placement_officer"]),
  aiThesisController.addMentorFeedback
);
router.post(
  "/:studentId/faculty-feedback",
  checkRole(["superadmin", "admin", "faculty", "hod", "placement_officer"]),
  aiThesisController.addMentorFeedback
);
router.put(
  "/:studentId/faculty-actions",
  checkRole(["superadmin", "admin", "faculty", "hod", "placement_officer"]),
  aiThesisController.updateFacultyActionStatus
);

module.exports = router;
