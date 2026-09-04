const mongoose = require("mongoose");

const subLevelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  order: { type: Number, required: true },

  levelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Level",
    required: true
  },

  isActive: { type: Boolean, default: true }
}, { timestamps: true });

subLevelSchema.index(
  { levelId: 1, order: 1 },
  { unique: true }
);

module.exports = mongoose.model("SubLevel", subLevelSchema);