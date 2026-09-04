const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const { departmentFilter } = require("../middlewares/departmentFilter");

const studentController = require("../controllers/student/studentController");
const placementController = require("../controllers/placement/placementController");
const attendanceController = require("../controllers/student/attendanceController");
const upload = require("../config/multerConfig");

const allowedRoles = ["superadmin", "faculty", "admin", "hod", "placement_officer"];
const { studentAccessFilter } = require("../middlewares/studentAccessFilter");
const auth = [verifyToken, checkRole(allowedRoles), departmentFilter, studentAccessFilter];

// =============================================================
// STUDENT BASIC CRUD  (mounted at /api/students)
// =============================================================

router.post("/", ...auth, studentController.createStudent);
router.get("/", ...auth, studentController.getAllStudents);
router.get("/getall", ...auth, studentController.getAllStudents);
router.get("/stats", ...auth, studentController.getStudentStats);

// Permission
router.get("/permission/list", ...auth, studentController.getPermissionStudents);
router.get("/leave-requests", ...auth, studentController.getLeaveRequests);

// Dummy Students
router.get("/dummy/list", ...auth, studentController.getDummyStudents);

// Placement: Ready / Selected / Placed lists
router.get("/Ready_Students", ...auth, placementController.getReadyStudents);
router.get("/selected_students", ...auth, placementController.getSelectedStudents);
router.get("/placed_students", ...auth, placementController.getPlacedStudents);

// Placement: Interview Management
router.post("/interviews/:id", ...auth, placementController.createInterview);
router.patch("/update/interviews/:studentId/:interviewId", ...auth, placementController.updateInterviewStatus);
router.post("/interviews/:studentId/:interviewId/add_round", ...auth, placementController.addInterviewRound);
router.patch("/reschedule/interview/:studentId/:interviewId", ...auth, placementController.rescheduleInterview);
router.patch("/cancel/interview/:studentId/:interviewId", ...auth, placementController.cancelInterview);
router.patch("/interviews/:studentId/:interviewId/conduct", ...auth, placementController.markInterviewConducted);
router.patch("/interviews/:studentId/:interviewId/final-result", ...auth, placementController.updateFinalResult);
router.get("/interview_history/:studentId", ...auth, placementController.getStudentInterviewHistory);

// Placement: Confirm & Manage
router.post("/confirm_placement", ...auth,
  upload.fields([{ name: "applicationFile", maxCount: 1 }, { name: "offerLetterFile", maxCount: 1 }]),
  placementController.confirmPlacement
);
router.patch("/update_job_type", ...auth, placementController.updateJobType);
router.patch("/update-placement/:id", ...auth, placementController.updatePlacementInfo);

// Placement: Post
router.post("/placement_post", ...auth, placementController.createPlacementPost);
router.post("/placement_post/update/:studentId", ...auth, placementController.updatePlacementPost);

// Placement: Documents & Resume
router.post("/placement_documents", ...auth, placementController.uploadPlacementDocuments);
router.get("/placement_documents/:studentId", ...auth, placementController.getPlacementDocuments);
router.post("/upload_Resume_Base64", ...auth, placementController.uploadResumeBase64);

// Companies
router.get("/companies", ...auth, placementController.getAllCompanies);
router.get("/companies/check-duplicate", ...auth, placementController.checkCompanyDuplicate);
router.get("/companies/placed_students/:companyId", ...auth, placementController.getPlacedStudentsByCompany);
router.get("/companies/detail/:id", ...auth, placementController.getCompanyById);
router.get("/companies/:companyName", ...auth, placementController.getCompanyByName);
router.post("/companies", ...auth, placementController.createCompany);
router.put("/companies/:id", ...auth, placementController.updateCompany);
router.patch("/companies/:id/status", ...auth, placementController.toggleCompanyStatus);

// Attendance
router.get("/attendance/stats", ...auth, attendanceController.getOverallAttendanceStats);

// =============================================================
// STUDENT BY ID  (keep /:id routes after all static routes)
// =============================================================

router.get("/:id", ...auth, studentController.getStudentById);
router.patch("/:id", ...auth, studentController.updateStudent);
router.patch("/update_technology/:id", ...auth, studentController.updateTechnology);
router.patch("/:id/technology", ...auth, studentController.updateTechnology);

// Readiness & Promotion
router.patch("/:id/readiness-status", ...auth, studentController.updateReadinessStatus);
router.post("/:id/promote", ...auth, studentController.promoteStudent);
router.get("/:id/level-history", ...auth, studentController.getStudentLevelHistory);

// Profile Image
router.patch("/:id/profile-image", ...auth, studentController.updateProfileImage);

// Student Documents
router.post("/:id/documents", ...auth, studentController.uploadDocument);
router.delete("/:id/documents/:docId", ...auth, studentController.deleteDocument);

// Extra Documents
router.post("/:id/extra-documents", ...auth, studentController.uploadExtraDocument);
router.get("/:id/extra-documents", ...auth, studentController.getExtraDocuments);
router.delete("/:id/documents/:docId", ...auth, studentController.deleteDocument);

// Permission (history-based flow)
router.post("/:id/permissions", ...auth, studentController.applyPermission);
router.get("/:id/permissions", ...auth, studentController.getPermissions);
router.patch("/:id/permissions/:permissionId/resolve", ...auth, studentController.resolvePermission);

// Permission (legacy)
router.patch("/:id/permission", ...auth, studentController.updatePermission);
router.patch("/:id/permission/status", ...auth, studentController.updatePermissionStatus);

// Placement Readiness (updates StudentPlacement.readinessStatus, creates record if missing)
router.patch("/:id/placement-readiness", ...auth, studentController.updatePlacementReadiness);
router.post("/:id/move-ready-for-placement", ...auth, studentController.moveToReadyForPlacement);

// Mark Dropped (with document upload)
router.patch("/:id/mark-dropped", ...auth, studentController.markDropped);
router.patch("/:id/mark-dummy", ...auth, studentController.markDummy);

// Syllabus Tasks
router.get("/:id/tasks", ...auth, studentController.getStudentTasks);
router.get("/:id/tasks/sublevel/:subLevelId", ...auth, studentController.getStudentTasksBySubLevel);

// Extra Tasks (outside syllabus, individual student only)
router.post("/:id/extra-tasks", ...auth, studentController.assignExtraTask);
router.get("/:id/extra-tasks", ...auth, studentController.getExtraTasks);

// History & Snapshots
router.get("/:id/task-history", ...auth, studentController.getStudentTaskHistory);
router.get("/:id/progress-snapshots", ...auth, studentController.getStudentProgressSnapshots);
router.get("/:id/activity", ...auth, studentController.getStudentActivity);

// SubLevel progress
router.get("/sublevel/:subLevelId/progress", ...auth, studentController.getSubLevelStudentsProgress);

module.exports = router;
