const Notification = require("../../models/notification/Notification");
const { seedInitialNotificationsIfNeeded } = require("../../services/notificationService");

const formatTimeAgo = (date) => {
  if (!date) return "";
  const diffMs = Date.now() - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

const buildUserFilter = (req) => {
  const userId = String(req.user?.id || req.user?._id || "");
  const role = String(req.user?.role || "").toLowerCase().trim();
  const studentId = req.query?.studentId || req.body?.studentId;

  const baseFilter = {
    isActive: { $ne: false },
    clearedBy: { $ne: userId },
  };

  if (studentId) {
    baseFilter.studentId = studentId;
    return baseFilter;
  }

  if (role === "student") {
    baseFilter.$or = [
      { studentId: userId },
      { recipientId: userId },
      { recipientRole: { $in: ["all", "student"] } },
    ];
  } else if (["superadmin", "admin"].includes(role)) {
    baseFilter.$or = [
      { recipientRole: { $in: ["all", "superadmin", "admin", "staff", "faculty"] } },
      { recipientId: userId },
      { studentId: { $ne: null } },
    ];
  } else if (["faculty", "hod"].includes(role)) {
    baseFilter.$or = [
      { recipientRole: { $in: ["all", "faculty", "hod", "staff"] } },
      { recipientId: userId },
      { studentId: { $ne: null } },
    ];
  } else {
    baseFilter.$or = [
      { recipientRole: { $in: ["all", role, "staff"] } },
      { recipientId: userId },
      { studentId: { $ne: null } },
    ];
  }

  return baseFilter;
};

// GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const userId = String(req.user?.id || req.user?._id || "");
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    // Seed on first run if DB is empty
    await seedInitialNotificationsIfNeeded();

    const filter = buildUserFilter(req);
    const limit = Math.min(Number(req.query?.limit) || 50, 100);

    const notifs = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formatted = notifs.map((n) => ({
      id: String(n._id),
      _id: String(n._id),
      title: n.title,
      message: n.message,
      type: n.type || "info",
      category: n.category || "general",
      time: formatTimeAgo(n.createdAt),
      createdAt: n.createdAt,
      isRead: Array.isArray(n.readBy) && n.readBy.includes(userId),
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("getNotifications error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/notifications/clear-all
exports.clearAllNotifications = async (req, res) => {
  try {
    const userId = String(req.user?.id || req.user?._id || "");
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const filter = buildUserFilter(req);

    // Add userId to clearedBy array of all matching notifications
    const result = await Notification.updateMany(filter, {
      $addToSet: { clearedBy: userId },
    });

    return res.status(200).json({
      success: true,
      message: "All notifications cleared permanently",
      clearedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("clearAllNotifications error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/notifications/:id
exports.dismissNotification = async (req, res) => {
  try {
    const userId = String(req.user?.id || req.user?._id || "");
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, {
      $addToSet: { clearedBy: userId },
    });

    return res.status(200).json({
      success: true,
      message: "Notification dismissed",
    });
  } catch (error) {
    console.error("dismissNotification error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const userId = String(req.user?.id || req.user?._id || "");
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, {
      $addToSet: { readBy: userId },
    });

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("markAsRead error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

