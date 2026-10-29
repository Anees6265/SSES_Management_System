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
  // 🎓 Personal & Identification Details (Supports External Integrations)
  prkey: { type: String, required: true, unique: true, trim: true },
  studentId: { type: String, trim: true, default: "" },
  registrationNo: { type: String, trim: true, default: "" },
  enrollmentNo: { type: String, trim: true, default: "" },
  image: { type: String, default: "" },

  // 👤 Names
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, default: "", trim: true },
  fullName: { type: String, trim: true, default: "" },
  fatherName: { type: String, default: "", trim: true },

  // 📞 Contact Info
  email: { type: String, trim: true, default: "" },
  studentMobile: { type: String, required: true, trim: true },
  parentMobile: { type: String, default: "", trim: true },
  fatherContactNumber: { type: String, default: "", trim: true },

  // 📋 Personal Info
  gender: { type: String, default: "" },
  category: { type: String, default: "" },
  dob: { type: Date, default: null },
  dobString: { type: String, trim: true, default: "" },
  aadharCard: { type: String, trim: true, default: "" },
  aadharNo: { type: String, trim: true, default: "" },

  // 🏠 Address & Location Details
  address: { type: String, default: "" },
  fullAddress: { type: String, default: "" },
  village: { type: String, default: "" },
  tehsil: { type: String, default: "" },
  district: { type: String, default: "" },
  pincode: { type: String, default: "" },

  // 🚌 Transport & Group
  trackBus: { type: String, default: "" },
  sponsorshipType: { type: String, default: "" },
  ssismGroup: { type: String, default: "" },

  // 📚 Course, Branch & Academic Position
  course: { type: String, required: true, default: "General", trim: true },
  branch: { type: String, default: "", trim: true },
  currentYear: { type: String, default: "1st Year", trim: true },
  year: {
    type: String,
    default: "1st Year",
    trim: true
  },
  currentSemester: { type: String, default: "", trim: true },
  batch: { type: String, default: "", trim: true },
  batchYear: {
    type: String,
    trim: true,
    default: null
  },

  track: { type: String, default: "" },
  techno: { type: String, default: "" },
  technology: { type: String, default: "" },
  technologies: [{ type: String }],
  stream: { type: String, default: "" },
  subject12: { type: String, default: "" },
  year12: { type: String, default: "" },
  percent12: { type: String, default: "" },
  percent10: { type: String, default: "" },

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
    default: null
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
  ftpDomain: { type: String, default: "", trim: true },
  withITEG: { type: Boolean, default: false },

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
studentSchema.index({ batchYear: 1 });
studentSchema.index({ currentSubLevelId: 1, syllabusVersionId: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ "permissionDetails.status": 1 });
studentSchema.index({ withITEG: 1 });
studentSchema.index({ studentId: 1 });
studentSchema.index({ registrationNo: 1 });
studentSchema.index({ enrollmentNo: 1 });
studentSchema.index({ aadharNo: 1 });

module.exports = mongoose.model("Student", studentSchema);
