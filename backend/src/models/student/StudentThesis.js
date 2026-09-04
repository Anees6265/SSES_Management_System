const mongoose = require("mongoose");

const StudentThesisSchema = new mongoose.Schema(
  {
    studentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      unique: true,
    },
    thesisUrl: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    analysis: {
      summary: {
        type: String,
        required: true,
      },
      strengths: {
        type: [String],
        default: [],
      },
      weaknesses: {
        type: [String],
        default: [],
      },
      recommendations: {
        type: [String],
        default: [],
      },
      effortLevel: {
        type: String,
        enum: ["Low", "Medium", "High", "Critical"],
        required: true,
      },
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "completed",
    },
    error: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudentThesis", StudentThesisSchema);
