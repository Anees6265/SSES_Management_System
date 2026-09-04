const mongoose = require("mongoose");

const studentTaskHistorySchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
  sessionName: { type: String, default: "" },
  levelId: { type: mongoose.Schema.Types.ObjectId, ref: "Level", required: true },
  levelName: { type: String, default: "" },
  subLevelId: { type: mongoose.Schema.Types.ObjectId, ref: "SubLevel", required: true },
  subLevelName: { type: String, default: "" },
  syllabusVersionId: { type: mongoose.Schema.Types.ObjectId, ref: "SyllabusVersion", required: true },
  syllabusVersionTitle: { type: String, default: "" },
  syllabusVersionCode: { type: String, default: "" },
  subjectId: { type: mongoose.Schema.Types.ObjectId, default: null },
  subjectName: { type: String, default: "" },
  topicId: { type: mongoose.Schema.Types.ObjectId, default: null },
  topicName: { type: String, default: "" },
  subTopicId: { type: mongoose.Schema.Types.ObjectId, default: null },
  subTopicName: { type: String, default: "" },
  taskId: { type: mongoose.Schema.Types.ObjectId, required: true },
  taskTitle: { type: String, default: "" },
  taskNodeType: { type: String, enum: ["topic", "subTopic"], default: "topic" },
  status: {
    type: String,
    enum: ["pending", "inProgress", "completed"],
    required: true
  },
  marks: { type: Number, default: null },
  maxMarks: { type: Number, default: 5 },
  notes: { type: String, default: "" },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  changedByName: { type: String, default: "" },
  changedByRole: { type: String, default: "" },
  changedAt: { type: Date, default: Date.now }
}, { timestamps: true });

studentTaskHistorySchema.index({ studentId: 1, changedAt: -1 });
studentTaskHistorySchema.index({ studentId: 1, taskId: 1, changedAt: -1 });

module.exports = mongoose.model("StudentTaskHistory", studentTaskHistorySchema);
