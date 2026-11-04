const mongoose = require("mongoose");

const studentLevelProgressSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },
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
  status: {
    type: String,
    enum: ["not_started", "in_progress", "completed"],
    default: "not_started"
  },
  startedAt: { type: Date },
  completedAt: { type: Date },
  
  // Syllabus version snapshot when level was started/completed
  syllabusVersionSnapshot: {
    versionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SyllabusVersion"
    },
    version: String,
    subjects: [], // Complete syllabus structure at time of completion
    frozenAt: { type: Date, default: Date.now }
  },
  
  // Tasks completed in this level
  completedTasks: [{
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    completedAt: { type: Date },
    syllabusVersionUsed: String
  }],
  
  // Performance metrics
  totalTasks: { type: Number, default: 0 },
  completedTasksCount: { type: Number, default: 0 },
  completionPercentage: { type: Number, default: 0 },
  averageMarks: { type: Number, default: 0 },
  rating: { type: Number, default: 0 }, // Out of 5.0
  performanceLevel: { type: String, default: "" }, // "Outstanding", "Excellent", "Very Good", "Good", "Average"
  passPercentage: { type: Number, default: 0 },

  // Subject-wise performance & rating points
  subjectRatings: [{
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", default: null },
    subjectName: { type: String, default: "" },
    rating: { type: Number, default: 0 },
    averageMarks: { type: Number, default: 0 },
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    performanceLevel: { type: String, default: "" }
  }],

  // Promotion evaluation details
  promotedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  promotedByName: { type: String, default: "" },
  promotedByRole: { type: String, default: "" },
  promotedAt: { type: Date, default: null }
}, { timestamps: true });

// Indexes for efficient queries
studentLevelProgressSchema.index({ studentId: 1, sessionId: 1 });
studentLevelProgressSchema.index({ studentId: 1, subLevelId: 1 });
studentLevelProgressSchema.index({ status: 1 });

// Methods
studentLevelProgressSchema.methods.isCompleted = function() {
  return this.status === 'completed';
};

studentLevelProgressSchema.methods.isInProgress = function() {
  return this.status === 'in_progress';
};

studentLevelProgressSchema.methods.markCompleted = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  this.completionPercentage = 100;
};

module.exports = mongoose.model("StudentLevelProgress", studentLevelProgressSchema);