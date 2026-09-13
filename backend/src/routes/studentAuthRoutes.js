const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const studentAuthController = require("../controllers/student/studentAuthController");

const adminAuth = [verifyToken, checkRole(["superadmin", "admin", "faculty", "hod", "placement_officer"])];
const studentAuth = [verifyToken, checkRole(["student"])];

// Rate Limiter for Login (Anti-Brute Force: Max 10 attempts per 15 min per IP)
const studentLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts from this IP. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiter for Password Change (Max 5 attempts per 15 min)
const studentPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many password change attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiter for Document / Image Uploads (Max 20 uploads per 10 min)
const studentUploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { message: "Too many upload requests. Please wait a few minutes before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public
router.post("/login", studentLoginLimiter, studentAuthController.studentLogin);

// Admin only — set password for a student
router.patch("/:id/set-password", ...adminAuth, studentAuthController.setStudentPassword);

// Student only
router.get("/me", ...studentAuth, studentAuthController.getMyProfile);
router.patch("/me/profile-image", ...studentAuth, studentUploadLimiter, studentAuthController.updateMyProfileImage);
router.patch("/me/change-password", ...studentAuth, studentPasswordLimiter, studentAuthController.changeMyPassword);
router.get("/me/tasks", ...studentAuth, studentAuthController.getMyTasks);
router.patch("/me/tasks/:taskId", ...studentAuth, studentAuthController.updateMyTaskStatus);
router.get("/me/level-history", ...studentAuth, studentAuthController.getMyLevelHistory);
router.get("/me/syllabus", ...studentAuth, studentAuthController.getMySyllabus);
router.get("/me/snapshots", ...studentAuth, studentAuthController.getMySnapshots);
router.get("/me/event-log", ...studentAuth, studentAuthController.getMyEventLog);
router.post("/me/permissions", ...studentAuth, studentUploadLimiter, studentAuthController.applyMyPermission);
router.get("/me/permissions", ...studentAuth, studentAuthController.getMyPermissions);
router.post("/me/extra-documents", ...studentAuth, studentUploadLimiter, studentAuthController.uploadMyExtraDocument);
router.get("/me/extra-documents", ...studentAuth, studentAuthController.getMyExtraDocuments);
router.get("/me/placement", ...studentAuth, studentAuthController.getMyPlacement);
router.get("/me/report-card", ...studentAuth, studentAuthController.getMyReportCard);

router.get("/faculties", ...studentAuth, studentAuthController.getFaculties);

module.exports = router;
