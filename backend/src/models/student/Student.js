const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema({
  imageURL: { type: String, default: "" },
  remark: { type: String, default: "" },
  reason: { type: String, default: "" },
  fromDate: { type: Date, default: null },
  toDate: { type: Date, default: null },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  uploadDate: { type: Date, default: Date.now },
  approvedBy: { type: String, default: "" },
  approvedAt: { type: Date, default: null },
  assignedFacultyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
});

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  fileURL: { type: String, required: true },
  fileType: {
    type: String,
    enum: ["image", "pdf"],
    required: true
  },
  remark: { type: String, default: "" },
  isExtra: { type: Boolean, default: false },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  uploadedByName: { type: String, default: "" },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

const dummyDetailsSchema = new mongoose.Schema({
  reason: { type: String, default: "" },
  remark: { type: String, default: "" },
  applicationURL: { type: String, default: "" },
  applicationType: {
    type: String,
    enum: ["image", "pdf", ""],
    default: ""
  },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  markedByName: { type: String, default: "" },
  markedAt: { type: Date, default: null }
}, { _id: false });

const studentSchema = new mongoose.Schema({
  // 🎓 Personal Details
  prkey: { type: String, required: true, unique: true },
  image: { type: String, default: "" },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  fatherName: { type: String, required: true },
  email: { type: String },
  studentMobile: { type: String, required: true },
  parentMobile: { type: String, required: true },
  gender: { type: String },
  dob: { type: Date },
  aadharCard: { type: String },
  address: { type: String, required: true },
  track: { type: String },
  techno: { type: String },
  technology: { type: String },
  technologies: [{ type: String }],
  village: { type: String, required: true },
  stream: { type: String },
  course: { type: String, required: true },
  category: { type: String },
  subject12: { type: String },
  year12: { type: String },
  percent12: { type: String },
  percent10: { type: String },

  // 🏢 Organizational Assignment
  subDepartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubDepartment",
    required: true
  },

  // 📅 Session & Syllabus Version (frozen at enrollment)
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session",
    required: true
  },
  syllabusVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SyllabusVersion",
    required: true
  },

  // 📍 Current Position
  currentLevelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Level",
    required: true
  },
  currentSubLevelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubLevel",
    required: true
  },

  // 🔒 Auth
  password: { type: String, default: null },

  // 🚦 Status
  status: {
    type: String,
    enum: ["Active", "Completed", "Dropped", "Placed", "Dummy"],
    default: "Active"
  },
  isFTP: { type: Boolean, default: false },

  // 🔒 Promotion Lock (prevents race condition on concurrent task updates)
  promotionPending: { type: Boolean, default: false },

  // 🔐 Permissions (history array)
  permissions: { type: [permissionSchema], default: [] },

  // 🔐 Permission (legacy single — kept for backward compat)
  permissionDetails: { type: permissionSchema, default: null },

  // 🧾 Dummy student workflow (separate from leave permissions and dropped students)
  dummyDetails: { type: dummyDetailsSchema, default: null },

  // 📁 Student Documents (images & PDFs)
  documents: { type: [documentSchema], default: [] },

  // 📚 Academic History
  academicHistory: [
    {
      yearName: String,
      percentage: Number,
      result: { type: String, enum: ["Pass", "Fail"] },
      updatedAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

studentSchema.index({ sessionId: 1, subDepartmentId: 1 });
studentSchema.index({ currentSubLevelId: 1, syllabusVersionId: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ "permissionDetails.status": 1 });

module.exports = mongoose.model("Student", studentSchema);
