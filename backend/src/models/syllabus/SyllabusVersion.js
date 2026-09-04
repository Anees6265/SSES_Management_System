const mongoose = require("mongoose");

const subTopicSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  order: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true }
}, { _id: true });

const topicSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  order: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  subTopics: { type: [subTopicSchema], default: [] }
}, { _id: true });

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, default: "" },
  description: { type: String, default: "" },
  order: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  topics: { type: [topicSchema], default: [] },
  // Report card metadata (set during syllabus upload)
  includeInReportCard: { type: Boolean, default: false },
  reportCategory: { type: String, enum: ["technical", "softskill", ""], default: "" }
}, { _id: true });

const syllabusVersionSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session",
    required: true
  },
  levelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Level",
    required: true
  },
  subLevelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubLevel",
    required: true
  },
  version: { type: String, required: true, trim: true },
  title: { type: String, default: "", trim: true },
  status: {
    type: String,
    enum: ["draft", "active", "archived"],
    default: "draft"
  },
  subjects: { type: [subjectSchema], default: [] },
  isActive: { type: Boolean, default: true },
  
  // Versioning and update tracking
  versionNumber: { type: Number, default: 1 },
  parentVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SyllabusVersion",
    default: null
  },
  effectiveFrom: { type: Date, default: Date.now },
  appliesTo: {
    type: String,
    enum: ["all", "upcoming", "new_admissions"],
    default: "all"
  },
  changeLog: {
    type: String,
    default: ""
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }
}, { timestamps: true });

syllabusVersionSchema.index(
  { sessionId: 1, levelId: 1, subLevelId: 1, version: 1 },
  { unique: true }
);

module.exports = mongoose.model("SyllabusVersion", syllabusVersionSchema);
