const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const dashboard = require("../controllers/placement/superAdminDashboardController");


const allowedRoles = ["superadmin", "admin"];


// ── Super Admin Placement Dashboard ─────────────────────────
router.get("/overview",            verifyToken, checkRole(allowedRoles), dashboard.getOverview);
router.get("/departments",         verifyToken, checkRole(allowedRoles), dashboard.getDepartmentStats);
router.get("/funnel",              verifyToken, checkRole(allowedRoles), dashboard.getPlacementFunnel);
router.get("/top-companies",       verifyToken, checkRole(allowedRoles), dashboard.getTopCompanies);
router.get("/alerts",              verifyToken, checkRole(allowedRoles), dashboard.getAlerts);


module.exports = router;