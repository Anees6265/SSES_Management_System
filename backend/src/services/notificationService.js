const Notification = require("../models/notification/Notification");
const StudentTask = require("../models/syllabus/StudentTask");
const Student = require("../models/student/Student");

/**
 * Create a new notification in the database
 */
const createNotification = async ({
  title,
  message,
  type = "info",
  category = "general",
  recipientRole = "all",
  recipientId = null,
  studentId = null,
  actorId = null,
  actorName = "",
  actorRole = "",
  metadata = {},
}) => {
  try {
    if (!title || !message) return null;

    const notif = await Notification.create({
      title: title.trim(),
      message: message.trim(),
      type,
      category,
      recipientRole,
      recipientId: recipientId || null,
      studentId: studentId || null,
      actorId: actorId || null,
      actorName: actorName || "",
      actorRole: actorRole || "",
      metadata,
      isActive: true,
      clearedBy: [],
      readBy: [],
    });

    return notif;
  } catch (err) {
    console.error("createNotification error:", err.message);
    return null;
  }
};

/**
 * Bulk-create notifications efficiently (used when assigning tasks/announcements to multiple students)
 */
const createBulkNotifications = async (items = []) => {
  try {
    if (!Array.isArray(items) || items.length === 0) return [];
    const docs = items
      .filter((item) => item && item.title && item.message)
      .map((item) => ({
        title: String(item.title).trim(),
        message: String(item.message).trim(),
        type: item.type || "info",
        category: item.category || "general",
        recipientRole: item.recipientRole || "student",
        recipientId: item.recipientId || null,
        studentId: item.studentId || null,
        actorId: item.actorId || null,
        actorName: item.actorName || "",
        actorRole: item.actorRole || "",
        metadata: item.metadata || {},
        isActive: true,
        clearedBy: [],
        readBy: [],
      }));
    if (docs.length === 0) return [];
    return await Notification.insertMany(docs, { ordered: false });
  } catch (err) {
    console.error("createBulkNotifications error:", err.message);
    return [];
  }
};

/**
 * Disabled auto-seeding of dummy/task-completion alerts so students only see real notifications.
 */
const seedInitialNotificationsIfNeeded = async () => {
  return;
};

module.exports = {
  createNotification,
  createBulkNotifications,
  seedInitialNotificationsIfNeeded,
};

