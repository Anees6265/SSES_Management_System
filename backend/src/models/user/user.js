const mongoose = require("mongoose");

const permissionEntrySchema = new mongoose.Schema({
  feature: { type: String, required: true },
  description: { type: String, default: "" },
  access: { type: [String], default: [] },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  position:     { type: String, required: true },
  profileImage: { type: String },
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  mobileNo:     { type: String, required: true },
  adharCard:    { type: String, required: true, unique: true },
  password:     { type: String, required: true },
  role:         { type: String, default: "admin" },

  // String kept for backward compat — new users should use departmentId
  department:   { type: String, required: true },

  // ObjectId ref added in Phase 2.2 — used by departmentFilter for O(1) cache lookup
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    default: null,
  },

  refreshToken:          { type: String },
  resetPasswordToken:    { type: String },
  resetPasswordExpires:  { type: Date },
  resetTokenUsed:        { type: Boolean, default: false },
  googleId:              { type: String },
  faceDescriptor:        { type: Array },

  // Typed permission array — replaces untyped [Object]
  permissions: { type: [permissionEntrySchema], default: [] },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

UserSchema.index({ role: 1, isActive: 1 });

module.exports = mongoose.model("User", UserSchema);
