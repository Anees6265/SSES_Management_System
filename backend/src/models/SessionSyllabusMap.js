const mongoose = require("mongoose");

const sessionSyllabusMapSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true
    },
    subLevelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubLevel",
      required: true,
      index: true
    },
    syllabusVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SyllabusVersion",
      required: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      trim: true
    }
  },
  { timestamps: true, versionKey: false }
);

// Compound index to ensure one active mapping per session-sublevel
sessionSyllabusMapSchema.index(
  { sessionId: 1, subLevelId: 1, isActive: 1 },
  { 
    unique: true,
    partialFilterExpression: { isActive: true }
  }
);

module.exports = mongoose.model("SessionSyllabusMap", sessionSyllabusMapSchema);