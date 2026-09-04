const mongoose = require("mongoose");

const resumeShareSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  resumeURL: { type: String, default: "" },
  sharedAt: { type: Date, default: Date.now },
  sharedBy: { type: String, default: "" },
  status: {
    type: String,
    enum: ["Not Shared", "Shared", "Company Reviewed", "Shortlisted for Interview"],
    default: "Shared"
  }
}, { timestamps: true });

const placementDriveSchema = new mongoose.Schema({
  companyRef: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  companyName: { type: String, required: true },
  companyLogo: { type: String, default: "" },
  companyWebsite: { type: String, default: "" },
  jobRole: { type: String, required: true },
  technology: { type: String, default: "" },
  jobDescription: { type: String, default: "" },
  jobDescriptionURL: { type: String, default: "" },
  requiredSkills: [{ type: String }],
  packageCTC: { type: String, required: true },
  jobLocation: { type: String, required: true },
  workMode: {
    type: String,
    enum: ["WFO", "Hybrid", "Remote"],
    default: "WFO"
  },
  driveDate: { type: Date, required: true },
  applicationDeadline: { type: Date },
  selectionProcess: { type: String, default: "" },
  vacancies: { type: Number, default: 1 },
  eligibleSubDepartments: [{ type: mongoose.Schema.Types.ObjectId, ref: "SubDepartment" }],
  eligibleTechnologies: [{ type: String }],
  minimumCriteria: { type: String, default: "" },
  shortlistedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
  resumeSharedStudents: [resumeShareSchema],
  subDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: "SubDepartment" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

placementDriveSchema.index({ subDepartmentId: 1, driveDate: -1 });

module.exports = mongoose.model("PlacementDrive", placementDriveSchema);
