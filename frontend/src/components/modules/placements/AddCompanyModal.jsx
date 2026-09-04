import React, { useState, useEffect } from "react";
import { MdClose, MdBusiness, MdLocationOn, MdPerson, MdErrorOutline, MdCheckCircle, MdVisibility } from "react-icons/md";
import { toast } from "react-toastify";
import {
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useCheckCompanyDuplicateQuery
} from "../../../redux/api/authApi";

const INDUSTRY_OPTIONS = [
  "IT Services",
  "Product Company",
  "Consulting",
  "Startup",
  "MNC",
  "Core Industry",
  "Banking & Finance",
  "E-Commerce",
  "Healthcare & Tech",
  "Other"
];

const COMPANY_TYPES = [
  "IT Services",
  "Product Company",
  "Consulting",
  "Startup",
  "MNC",
  "Core Industry",
  "Other"
];

const AddCompanyModal = ({
  isOpen,
  onClose,
  companyToEdit = null,
  onSuccess,
  onViewCompany
}) => {
  const [formData, setFormData] = useState({
    companyName: "",
    companyLogo: "",
    website: "",
    companyEmail: "",
    companyContact: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    industry: "IT Services",
    companyType: "IT Services",
    description: "",
    contactPersonName: "",
    designation: "",
    contactPersonEmail: "",
    contactPersonPhone: "",
    status: "Active"
  });

  const [errors, setErrors] = useState({});
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const [createCompany, { isLoading: isCreating }] = useCreateCompanyMutation();
  const [updateCompany, { isLoading: isUpdating }] = useUpdateCompanyMutation();

  const isEditMode = Boolean(companyToEdit);

  // Check duplicate hook
  const { data: duplicateRes } = useCheckCompanyDuplicateQuery(formData.companyName, {
    skip: isEditMode || !formData.companyName || formData.companyName.trim().length < 2
  });

  useEffect(() => {
    if (companyToEdit) {
      setFormData({
        companyName: companyToEdit.companyName || "",
        companyLogo: companyToEdit.companyLogo || "",
        website: companyToEdit.website || "",
        companyEmail: companyToEdit.companyEmail || companyToEdit.hrEmail || "",
        companyContact: companyToEdit.companyContact || companyToEdit.hrContact || "",
        address: companyToEdit.address || companyToEdit.headOffice || "",
        city: companyToEdit.city || "",
        state: companyToEdit.state || "",
        country: companyToEdit.country || "India",
        industry: companyToEdit.industry || "IT Services",
        companyType: companyToEdit.companyType || "IT Services",
        description: companyToEdit.description || "",
        contactPersonName: companyToEdit.contactPersonName || "",
        designation: companyToEdit.designation || "",
        contactPersonEmail: companyToEdit.contactPersonEmail || companyToEdit.hrEmail || "",
        contactPersonPhone: companyToEdit.contactPersonPhone || companyToEdit.hrContact || "",
        status: companyToEdit.status || "Active"
      });
    } else {
      setFormData({
        companyName: "",
        companyLogo: "",
        website: "",
        companyEmail: "",
        companyContact: "",
        address: "",
        city: "",
        state: "",
        country: "India",
        industry: "IT Services",
        companyType: "IT Services",
        description: "",
        contactPersonName: "",
        designation: "",
        contactPersonEmail: "",
        contactPersonPhone: "",
        status: "Active"
      });
    }
    setErrors({});
    setDuplicateWarning(null);
  }, [companyToEdit, isOpen]);

  useEffect(() => {
    if (!isEditMode && duplicateRes?.exists && duplicateRes?.existingCompany) {
      setDuplicateWarning(duplicateRes.existingCompany);
    } else if (!isEditMode) {
      setDuplicateWarning(null);
    }
  }, [duplicateRes, isEditMode]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.companyName.trim()) {
      newErrors.companyName = "Company Name is required.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.companyEmail && !emailRegex.test(formData.companyEmail.trim())) {
      newErrors.companyEmail = "Please enter a valid email address.";
    }
    if (formData.contactPersonEmail && !emailRegex.test(formData.contactPersonEmail.trim())) {
      newErrors.contactPersonEmail = "Please enter a valid email address.";
    }

    if (formData.website && !formData.website.startsWith("http://") && !formData.website.startsWith("https://")) {
      // Auto prepends https:// during submit if needed
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      let payload = { ...formData };
      if (payload.website && !payload.website.startsWith("http://") && !payload.website.startsWith("https://")) {
        payload.website = `https://${payload.website}`;
      }

      if (isEditMode) {
        await updateCompany({ id: companyToEdit._id, ...payload }).unwrap();
        toast.success("Company updated successfully!");
      } else {
        const res = await createCompany(payload).unwrap();
        toast.success(res?.message || "Company added successfully.");
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      if (err?.data?.duplicate && err?.data?.existingCompany) {
        setDuplicateWarning(err.data.existingCompany);
        toast.warning(err?.data?.message || "Company already exists.");
      } else {
        toast.error(err?.data?.message || `Failed to ${isEditMode ? 'update' : 'add'} company`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center text-xl font-bold border border-orange-500/30">
              <MdBusiness />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isEditMode ? "Edit Company Master" : "+ Add New Company"}
              </h2>
              <p className="text-xs text-slate-300">
                {isEditMode ? "Update company information in master database" : "Register company into global placement master record"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            <MdClose size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Duplicate Warning Alert Banner */}
          {duplicateWarning && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <MdErrorOutline className="text-amber-600 text-xl shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900 text-xs">Company Already Exists!</h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    A company named <strong>"{duplicateWarning.companyName}"</strong> is already stored in database.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewCompany?.(duplicateWarning);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1.5 shrink-0"
              >
                <MdVisibility size={14} /> View Company
              </button>
            </div>
          )}

          {/* Section 1: Basic Company Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Basic Company Information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="e.g. Tata Consultancy Services"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl font-medium outline-none transition focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${
                    errors.companyName ? "border-red-400 bg-red-50/50" : "border-slate-200"
                  }`}
                />
                {errors.companyName && (
                  <p className="text-[11px] text-red-500 font-semibold mt-1">{errors.companyName}</p>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Company Logo (URL)</label>
                <input
                  type="text"
                  name="companyLogo"
                  value={formData.companyLogo}
                  onChange={handleChange}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none transition focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Company Website</label>
                <input
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://www.tcs.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none transition focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Company Official Email</label>
                <input
                  type="email"
                  name="companyEmail"
                  value={formData.companyEmail}
                  onChange={handleChange}
                  placeholder="careers@company.com"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl font-medium outline-none transition focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${
                    errors.companyEmail ? "border-red-400 bg-red-50/50" : "border-slate-200"
                  }`}
                />
                {errors.companyEmail && (
                  <p className="text-[11px] text-red-500 font-semibold mt-1">{errors.companyEmail}</p>
                )}
              </div>

              <div className="sm:col-span-2 sm:w-1/2">
                <label className="font-bold text-slate-700 block mb-1">Company Contact Phone</label>
                <input
                  type="text"
                  name="companyContact"
                  value={formData.companyContact}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none transition focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Company Address */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Company Address & Location
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <label className="font-bold text-slate-700 block mb-1">Address / Head Office</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street Address, Tech Park, Phase 1"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none transition focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Pune / Bengaluru"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none transition focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g. Maharashtra"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none transition focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="India"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none transition focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Company Details & Category */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Industry & Classification
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Industry Sector</label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none transition focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Company Type</label>
                <select
                  name="companyType"
                  value={formData.companyType}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none transition focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  {COMPANY_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Company Description</label>
                <textarea
                  name="description"
                  rows={2}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief overview of company business domain, tech stack, or tier..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none transition focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Contact Person Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                HR / Primary Contact Person
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Contact Person Name</label>
                <input
                  type="text"
                  name="contactPersonName"
                  value={formData.contactPersonName}
                  onChange={handleChange}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none transition focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Designation</label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  placeholder="e.g. Talent Acquisition Head"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none transition focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Contact Person Email</label>
                <input
                  type="email"
                  name="contactPersonEmail"
                  value={formData.contactPersonEmail}
                  onChange={handleChange}
                  placeholder="rahul.sharma@company.com"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl font-medium outline-none transition focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                    errors.contactPersonEmail ? "border-red-400 bg-red-50/50" : "border-slate-200"
                  }`}
                />
                {errors.contactPersonEmail && (
                  <p className="text-[11px] text-red-500 font-semibold mt-1">{errors.contactPersonEmail}</p>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Contact Person Phone</label>
                <input
                  type="text"
                  name="contactPersonPhone"
                  value={formData.contactPersonPhone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none transition focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || isUpdating}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl transition shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isCreating || isUpdating ? (
                <span>Saving Company...</span>
              ) : (
                <>
                  <MdCheckCircle size={16} />
                  <span>{isEditMode ? "Update Company" : "Save Company"}</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddCompanyModal;
