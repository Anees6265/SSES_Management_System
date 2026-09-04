const mongoose = require("mongoose");

const placementInterviewSchema = new mongoose.Schema({
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Student", 
    required: true 
  },

  companyName: { type: String, required: true },
  jobProfile: { type: String, required: true },
  scheduleDate: { type: Date, required: true },

  status: {
    type: String,
    enum: ["Scheduled", "Ongoing", "Selected", "RejectedByCompany", "RejectedByStudent", "OnHold"],
    default: "Scheduled"
  },

  rounds: [
    {
      roundName: String,
      date: Date,
      mode: { type: String, enum: ["Online", "Offline", "Telephonic"] },
      feedback: String,
      result: { type: String, enum: ["Passed", "Failed", "Pending"] }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("PlacementInterview", placementInterviewSchema);