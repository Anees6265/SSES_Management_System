const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const notificationController = require("../controllers/notification/notificationController");

// All notification routes require authenticated user (student, faculty, admin, superadmin, etc.)
router.use(verifyToken);

router.get("/", notificationController.getNotifications);
router.post("/clear-all", notificationController.clearAllNotifications);
router.delete("/:id", notificationController.dismissNotification);
router.patch("/:id/read", notificationController.markAsRead);

module.exports = router;

