const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const studentAuthController = require("../controllers/student/studentAuthController");

const adminAuth = [verifyToken, checkRole(["superadmin", "admin", "faculty", "hod", "placement_officer"])];
const studentAuth = [verifyToken, checkRole(["student"])];

// Public
router.post("/login", studentAuthController.studentLogin);

// Admin only — set password for a student
router.patch("/:id/set-password", ...adminAuth, studentAuthController.setStudentPassword);

// Student only
router.get("/me", ...studentAuth, studentAuthController.getMyProfile);
router.patch("/me/profile-image", ...studentAuth, studentAuthController.updateMyProfileImage);
router.patch("/me/change-password", ...studentAuth, studentAuthController.changeMyPassword);
router.get("/me/tasks", ...studentAuth, studentAuthController.getMyTasks);
router.patch("/me/tasks/:taskId", ...studentAuth, studentAuthController.updateMyTaskStatus);
router.get("/me/level-history", ...studentAuth, studentAuthController.getMyLevelHistory);
router.get("/me/snapshots", ...studentAuth, studentAuthController.getMySnapshots);
router.get("/me/event-log", ...studentAuth, studentAuthController.getMyEventLog);
router.post("/me/permissions", ...studentAuth, studentAuthController.applyMyPermission);
router.get("/me/permissions", ...studentAuth, studentAuthController.getMyPermissions);
router.post("/me/extra-documents", ...studentAuth, studentAuthController.uploadMyExtraDocument);
router.get("/me/extra-documents", ...studentAuth, studentAuthController.getMyExtraDocuments);
router.get("/me/placement", ...studentAuth, studentAuthController.getMyPlacement);
router.get("/me/report-card", ...studentAuth, studentAuthController.getMyReportCard);

router.get("/faculties", ...studentAuth, studentAuthController.getFaculties);

module.exports = router;
