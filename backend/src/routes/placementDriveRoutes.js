const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const { departmentFilter } = require("../middlewares/departmentFilter");
const ctrl = require("../controllers/placement/placementDriveController");

const allowedRoles = ["superadmin", "admin", "faculty", "hod", "placement_officer"];
const auth = [verifyToken, checkRole(allowedRoles), departmentFilter];

router.post("/", ...auth, ctrl.createDrive);
router.get("/", ...auth, ctrl.getAllDrives);
router.get("/:id", ...auth, ctrl.getDriveById);
router.post("/:driveId/shortlist", ...auth, ctrl.shortlistStudents);
router.post("/:driveId/share-resumes", ...auth, ctrl.shareResumes);
router.patch("/:driveId/resumes/:studentId/status", ...auth, ctrl.updateResumeShareStatus);

module.exports = router;
