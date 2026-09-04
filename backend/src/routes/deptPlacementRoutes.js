const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const { departmentFilter } = require("../middlewares/departmentFilter");
const ctrl = require("../controllers/placement/deptPlacementController");

// superadmin + admin see all; faculty/hod restricted to own dept (guard inside controller)
const allowedRoles = ["superadmin", "admin", "faculty", "hod", "placement_officer"];
const auth = [verifyToken, checkRole(allowedRoles), departmentFilter];

router.get("/:id/overview",          ...auth, ctrl.getDeptOverview);
router.get("/:id/funnel",            ...auth, ctrl.getDeptFunnel);
router.get("/:id/status-breakdown",  ...auth, ctrl.getDeptStatusBreakdown);
router.get("/:id/alerts",            ...auth, ctrl.getDeptAlerts);
router.get("/:id/ready-students",    ...auth, ctrl.getDeptReadyStudents);
router.get("/:id/recent-placements", ...auth, ctrl.getDeptRecentPlacements);
router.get("/:id/top-companies",     ...auth, ctrl.getDeptTopCompanies);

module.exports = router;
