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
 * Seed initial real notifications from recent student task activities if collection is empty
 */
const seedInitialNotificationsIfNeeded = async () => {
  try {
    const count = await Notification.countDocuments();
    if (count > 0) return; // Already has notifications

    // Look for recent student tasks to convert to notifications
    const recentTasks = await StudentTask.find({ isActive: true })
      .populate("studentId", "firstName lastName prkey")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    if (recentTasks && recentTasks.length > 0) {
      const initialDocs = recentTasks.map((t) => {
        const studentName = t.studentId
          ? `${t.studentId.firstName || ""} ${t.studentId.lastName || ""}`.trim()
          : "Student";
        const prkey = t.studentId?.prkey ? ` (${t.studentId.prkey})` : "";
        const isCompleted = t.status === "completed";

        return {
          title: isCompleted ? "Task Completed" : "Task Assigned",
          message: isCompleted
            ? `Task "${t.title}" completed by ${studentName}${prkey}`
            : `Task "${t.title}" assigned to ${studentName}${prkey}`,
          type: isCompleted ? "success" : "info",
          category: "task",
          recipientRole: "all",
          studentId: t.studentId?._id || null,
          metadata: { taskId: t._id, status: t.status, marks: t.marks },
          isActive: true,
          clearedBy: [],
          readBy: [],
          createdAt: t.updatedAt || t.createdAt || new Date(),
        };
      });

      await Notification.insertMany(initialDocs);
    } else {
      // General system start notification
      await Notification.create({
        title: "System Ready",
        message: "Real-time activity and task alerts are now active.",
        type: "info",
        category: "system",
        recipientRole: "all",
        isActive: true,
        clearedBy: [],
        readBy: [],
      });
    }
  } catch (err) {
    console.error("seedInitialNotificationsIfNeeded error:", err.message);
  }
};

module.exports = {
  createNotification,
  seedInitialNotificationsIfNeeded,
};

