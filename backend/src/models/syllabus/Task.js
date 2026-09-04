const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  syllabusVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SyllabusVersion",
    required: false // Made optional for general tasks
  },
  levelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Level",
    required: false // For general tasks
  },
  subLevelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubLevel",
    required: false // For general tasks
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false // Made optional for general tasks
  },
  subjectName: { type: String, default: "" },
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false // Made optional for general tasks
  },
  topicName: { type: String, default: "" },
  subTopicId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  subTopicName: { type: String, default: "" },
  taskNodeType: {
    type: String,
    enum: ["topic", "subTopic", "general"],
    required: true
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  type: {
    type: String,
    enum: ["assignment", "project", "practice", "reading", "assessment", "other"],
    default: "assignment"
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium"
  },
  mandatory: { type: Boolean, default: true },
  maxMarks: { type: Number, min: 0, default: 5 },
  order: { type: Number, default: 1 },
  timeDays: { type: Number, default: null },
  measurablePoints: { type: String, default: "" },
  dueDate: { type: Date, default: null },
  isGeneralTask: { type: Boolean, default: false }, // Flag for general tasks
  assignedByName: { type: String, default: "" },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Indexes
taskSchema.index({ syllabusVersionId: 1, subjectId: 1, topicId: 1 });
taskSchema.index({ syllabusVersionId: 1, subTopicId: 1 });
taskSchema.index({ syllabusVersionId: 1, isActive: 1 });
taskSchema.index({ levelId: 1, subLevelId: 1, isGeneralTask: 1 });
taskSchema.index({ isActive: 1, deletedAt: 1 });

module.exports = mongoose.model("Task", taskSchema);
