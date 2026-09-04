const mongoose = require("mongoose");

const subDepartmentSchema = new mongoose.Schema({
  name: { type: String, required: true },

  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true
  },

  allowedCourses: [String],

  isActive: { type: Boolean, default: true }
}, { timestamps: true });

subDepartmentSchema.index(
  { departmentId: 1, name: 1 },
  { unique: true }
);

module.exports = mongoose.model("SubDepartment", subDepartmentSchema);