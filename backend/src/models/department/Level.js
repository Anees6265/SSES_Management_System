const mongoose = require("mongoose");

const levelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  order: { type: Number, required: true },

  subDepartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubDepartment",
    required: true
  },

  isActive: { type: Boolean, default: true }
}, { timestamps: true });

levelSchema.index(
  { subDepartmentId: 1, order: 1 },
  { unique: true }
);

module.exports = mongoose.model("Level", levelSchema);