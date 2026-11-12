const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const {
  createLoginRateLimiters,
  createAuthenticatedActionLimiter,
} = require("../middlewares/rateLimiters");
const studentAuthController = require("../controllers/student/studentAuthController");

const adminAuth = [verifyToken, checkRole(["superadmin", "admin", "faculty", "hod", "placement_officer"])];
const studentAuth = [verifyToken, checkRole(["student"])];

// Campus-safe login limiters: keyed per-(IP + account email) & counts failed attempts only
const studentLoginLimiters = createLoginRateLimiters({
  windowMs: 15 * 60 * 1000,
  accountMax: 10,
  ipFailedCeiling: 100,
});

// Rate Limiter for Password Change (Max 10 attempts per 15 min per student)
const studentPasswordLimiter = createAuthenticatedActionLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many password change attempts. Please try again after 15 minutes.",
});

// Rate Limiter for Document / Image Uploads (Max 25 uploads per 10 min per student)
const studentUploadLimiter = createAuthenticatedActionLimiter({
  windowMs: 10 * 60 * 1000,
  max: 25,
  message: "Too many upload requests. Please wait a few minutes before trying again.",
});

// Public
router.post("/login", ...studentLoginLimiters, studentAuthController.studentLogin);

// Admin only — set password for a student
router.patch("/:id/set-password", ...adminAuth, studentAuthController.setStudentPassword);

// Student only
router.get("/me", ...studentAuth, studentAuthController.getMyProfile);
router.patch("/me/profile", ...studentAuth, studentAuthController.updateMyProfile);
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
