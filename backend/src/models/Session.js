const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, trim: true, unique: true },
    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },
    isActive:  { type: Boolean, default: true, index: true },
    status:    { type: String, enum: ['upcoming', 'active', 'completed', 'archived'], default: 'upcoming' },
    description: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Session", sessionSchema);
