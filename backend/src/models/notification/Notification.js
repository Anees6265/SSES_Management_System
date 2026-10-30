const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["info", "success", "warning", "error"],
      default: "info",
    },
    category: {
      type: String,
      enum: [
        "task",
        "profile",
        "level",
        "reportCard",
        "attendance",
        "permission",
        "placement",
        "system",
        "general",
      ],
      default: "general",
    },
    // Target audience: 'all', 'superadmin', 'admin', 'faculty', 'hod', 'placement_officer', 'student', 'staff'
    recipientRole: {
      type: String,
      enum: [
        "all",
        "superadmin",
        "admin",
        "faculty",
        "hod",
        "placement_officer",
        "student",
        "staff",
      ],
      default: "all",
    },
    // Specific targeted student
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    // Specific targeted user
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // Creator or actor info
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    actorName: {
      type: String,
      default: "",
    },
    actorRole: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // List of user or student IDs who have cleared / dismissed this notification
    clearedBy: [
      {
        type: String,
        index: true,
      },
    ],
    // List of user or student IDs who have marked this notification as read
    readBy: [
      {
        type: String,
        index: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipientRole: 1, createdAt: -1 });
notificationSchema.index({ studentId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);

