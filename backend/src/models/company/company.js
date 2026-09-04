const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  companyName: { type: String, required: true, trim: true },
  normalizedName: { type: String, trim: true, lowercase: true, index: true },
  hrEmail: { type: String, trim: true, default: "" },
  hrContact: { type: String, trim: true, default: "" },
  companyEmail: { type: String, trim: true, default: "" },
  companyContact: { type: String, trim: true, default: "" },
  location: { type: String, trim: true, default: "Not provided" },
  headOffice: { type: String, trim: true, default: "" },
  address: { type: String, trim: true, default: "" },
  city: { type: String, trim: true, default: "" },
  state: { type: String, trim: true, default: "" },
  country: { type: String, trim: true, default: "" },
  companyLogo: { type: String, default: "" },
  industry: { type: String, trim: true, default: "IT Services" },
  companyType: {
    type: String,
    enum: ["IT Services", "Product Company", "Consulting", "Startup", "MNC", "Core Industry", "Other"],
    default: "IT Services"
  },
  website: { type: String, trim: true, default: "" },
  description: { type: String, trim: true, default: "" },
  contactPersonName: { type: String, trim: true, default: "" },
  designation: { type: String, trim: true, default: "" },
  contactPersonEmail: { type: String, trim: true, default: "" },
  contactPersonPhone: { type: String, trim: true, default: "" },
  status: {
    type: String,
    enum: ["Active", "Inactive"],
    default: "Active"
  }
}, { timestamps: true });

companySchema.pre("save", function (next) {
  if (this.companyName) {
    this.normalizedName = this.companyName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  if (!this.location || this.location === "Not provided") {
    const locParts = [this.city, this.state, this.country].filter(Boolean);
    if (locParts.length > 0) {
      this.location = locParts.join(", ");
    }
  }
  if (this.contactPersonEmail && !this.hrEmail) {
    this.hrEmail = this.contactPersonEmail;
  }
  if (this.contactPersonPhone && !this.hrContact) {
    this.hrContact = this.contactPersonPhone;
  }
  next();
});

module.exports = mongoose.model("Company", companySchema);