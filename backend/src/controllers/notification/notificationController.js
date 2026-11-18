const mongoose = require("mongoose");
const Notification = require("../../models/notification/Notification");

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

  // 1. Student Side: ONLY receives Promotion notifications (category: "level")
  if (role === "student" || studentId) {
    const studentObjId = mongoose.Types.ObjectId.isValid(studentId || userId)
      ? new mongoose.Types.ObjectId(studentId || userId)
      : (studentId || userId);

    baseFilter.$or = [
      { studentId: studentObjId },
      { recipientId: studentObjId },
      {
        studentId: null,
        recipientId: null,
        recipientRole: "student",
      },
    ];
    baseFilter.category = "level";
    return baseFilter;
  }

  // 2. Faculty Side: ONLY receives Student Promotion ("level") and Student Leave ("permission")
  if (["faculty", "hod", "coordinator"].includes(role)) {
    const facultyObjId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    baseFilter.$or = [
      { recipientRole: { $in: ["faculty", "all"] } },
      { recipientId: facultyObjId },
      { recipientId: userId },
    ];
    baseFilter.category = { $in: ["level", "permission"] };
    return baseFilter;
  }

  // 3. Admin & Super Admin Side
  if (["superadmin", "admin"].includes(role)) {
    baseFilter.$or = [
      { recipientRole: { $in: ["all", "superadmin", "admin", "staff", "faculty"] } },
      { recipientId: userId },
      { studentId: { $ne: null } },
    ];
    return baseFilter;
  }

  baseFilter.$or = [
    { recipientRole: { $in: ["all", role, "staff"] } },
    { recipientId: userId },
    { studentId: { $ne: null } },
  ];

  return baseFilter;
};

// GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const userId = String(req.user?.id || req.user?._id || "");
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

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

// DELETE /api/notifications/purge-unnecessary
exports.purgeUnnecessaryNotifications = async (req, res) => {
  try {
    const userRole = String(req.user?.role || "").toLowerCase().trim();
    if (!["superadmin", "admin"].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Only superadmin and admin can purge unnecessary notifications.",
      });
    }

    // Keep ONLY promotions ("level") and student leaves ("permission")
    const result = await Notification.deleteMany({
      category: { $nin: ["level", "permission"] },
    });

    return res.status(200).json({
      success: true,
      message: `Successfully purged ${result.deletedCount} unnecessary notifications from database.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("purgeUnnecessaryNotifications error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

