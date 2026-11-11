const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    authorName: { type: String, required: true, trim: true },
    authorEmail: { type: String, default: "", trim: true },
    authorRole: { type: String, default: "", trim: true },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    isDeveloperReply: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["bug_report", "direct_mail"],
      default: "bug_report",
    },
    type: {
      type: String,
      enum: ["bug", "ui_ux", "data_issue", "access_issue", "feature_request", "direct_query", "other"],
      default: "bug",
    },
    module: {
      type: String,
      default: "Other",
      trim: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 6000,
    },
    pageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    targetDeveloper: {
      type: String,
      enum: ["both", "anees", "himanshu"],
      default: "both",
    },
    assignedToNames: {
      type: [String],
      default: ["Anees Khan", "Himanshu Vishwakarma"],
    },
    screenshots: [
      {
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    environmentInfo: {
      browser: { type: String, default: "" },
      platform: { type: String, default: "" },
      screenResolution: { type: String, default: "" },
      userAgent: { type: String, default: "" },
    },
    reportedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      name: { type: String, required: true, trim: true },
      email: { type: String, default: "", trim: true, lowercase: true },
      role: { type: String, default: "", trim: true, lowercase: true },
      department: { type: String, default: "", trim: true },
      departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        default: null,
      },
      mobileNo: { type: String, default: "", trim: true },
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
      index: true,
    },
    developerNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000,
    },
    comments: {
      type: [commentSchema],
      default: [],
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      role: { type: String, default: "" },
    },
    emailDelivery: {
      attempted: { type: Boolean, default: false },
      sent: { type: Boolean, default: false },
      recipients: { type: [String], default: [] },
      error: { type: String, default: "" },
      sentAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ "reportedBy.departmentId": 1, status: 1 });

module.exports = mongoose.model("SupportTicket", supportTicketSchema);

