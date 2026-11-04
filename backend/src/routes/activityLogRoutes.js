const express = require("express");
const router = express.Router();
const activityLogController = require("../controllers/activity/activityLogController");
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");

const allowedRoles = ["superadmin", "admin", "hod", "faculty", "placement_officer", "coordinator"];

// All activity logs routes require authentication and superadmin/admin/hod role
router.use(verifyToken, checkRole(allowedRoles));

// GET /api/activity-logs (Paginated logs with filters)
router.get("/", activityLogController.getActivityLogs);

// GET /api/activity-logs/stats (Top metric cards)
router.get("/stats", activityLogController.getActivityStats);

// GET /api/activity-logs/users (Distinct active users list)
router.get("/users", activityLogController.getActivityLogUsers);

module.exports = router;

