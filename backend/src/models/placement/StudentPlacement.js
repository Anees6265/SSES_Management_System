const mongoose = require("mongoose");
const { placedInfoSchema, interviewRecordSchema } = require("./PlacementSchema");


const studentPlacementSchema = new mongoose.Schema({
  // 🔗 Link to Student
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
    unique: true
  },


  // 🏢 Department reference (for department-wise filtering)
  subDepartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubDepartment",
    required: true
  },


  // 🚦 Readiness
  readinessStatus: {
    type: String,
    enum: ["Not Ready", "In Progress", "Ready", "Ready for Interview", "Ready for Placement", "Ready for Drive"],
    default: "Not Ready"
  },


  resumeURL: { type: String, default: "" },


  // 🗓️ Interview Records
  PlacementinterviewRecord: { type: [interviewRecordSchema], default: [] },


  // 🧑‍💼 Placed Info (set when confirmed placed)
  placedInfo: { type: placedInfoSchema, default: null },


  // 📄 Placement Documents
  offerLetter: { type: String, default: "" },
  commitmentApplication: { type: String, default: "" },
  documentsUploadedBy: { type: String, default: "" },
  documentsUploadedAt: { type: Date, default: null }


}, { timestamps: true });


studentPlacementSchema.index({ subDepartmentId: 1, readinessStatus: 1 });
studentPlacementSchema.index({ subDepartmentId: 1, "placedInfo": 1 });


module.exports = mongoose.model("StudentPlacement", studentPlacementSchema);