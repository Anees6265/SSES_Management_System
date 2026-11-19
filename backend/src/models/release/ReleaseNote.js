const mongoose = require("mongoose");

const featureItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    image: { type: String, default: "", trim: true },
    imageCaption: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const releaseNoteSchema = new mongoose.Schema(
  {
    releaseId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    version: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    developer: {
      type: String,
      default: "Anees Khan",
      trim: true,
    },
    author: {
      type: String,
      default: "SSES Product Team",
      trim: true,
    },
    badge: {
      type: String,
      default: "Production",
      trim: true,
    },
    archiveMonth: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    features: {
      type: [featureItemSchema],
      default: [],
    },
    bugFixes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

releaseNoteSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ReleaseNote", releaseNoteSchema);
