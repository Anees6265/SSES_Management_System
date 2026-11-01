const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    userName: {
      type: String,
      default: "System",
      trim: true,
    },
    userEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      default: "unknown",
      trim: true,
      lowercase: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    departmentName: {
      type: String,
      default: "",
      trim: true,
    },
    action: {
      type: String,
      enum: ["LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "SECURITY_ALERT", "EXPORT"],
      required: true,
      index: true,
    },
    module: {
      type: String,
      enum: [
        "Auth",
        "Students",
        "Task Management",
        "Curriculum",
        "Report Cards",
        "User Management",
        "Placements",
        "System",
      ],
      default: "System",
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED", "BLOCKED", "WARNING"],
      default: "SUCCESS",
      index: true,
    },
    severity: {
      type: String,
      enum: ["INFO", "WARNING", "CRITICAL"],
      default: "INFO",
      index: true,
    },
    isSecurityAlert: {
      type: Boolean,
      default: false,
      index: true,
    },
    threatType: {
      type: String,
      default: null,
      trim: true,
    },
    ipAddress: {
      type: String,
      default: "",
      trim: true,
    },
    userAgent: {
      type: String,
      default: "",
      trim: true,
    },
    device: {
      type: String,
      default: "",
      trim: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ departmentId: 1, createdAt: -1 });
activityLogSchema.index({ isSecurityAlert: 1, createdAt: -1 });
activityLogSchema.index({ role: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);

