const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const { departmentFilter } = require("../middlewares/departmentFilter");
const { getDashboardOverview } = require("../controllers/dashboard/dashboardController");

const auth = [verifyToken, checkRole(["superadmin", "admin", "faculty", "hod", "placement_officer"]), departmentFilter];

router.get("/overview", ...auth, getDashboardOverview);

module.exports = router;
