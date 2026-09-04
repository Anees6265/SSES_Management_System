const mongoose = require("mongoose");

const studentEventLogSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },
  type: {
    type: String,
    enum: ["promotion", "email", "document", "task", "permission", "note", "placement", "interview"],
    required: true
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ""
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  createdByName: {
    type: String,
    default: ""
  },
  createdByRole: {
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

studentEventLogSchema.index({ studentId: 1, createdAt: -1 });
studentEventLogSchema.index({ studentId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model("StudentEventLog", studentEventLogSchema);
