import React, { useState, useEffect, useRef } from "react";
import {
  MdClose,
  MdBusiness,
  MdLocationOn,
  MdPerson,
  MdErrorOutline,
  MdCheckCircle,
  MdVisibility,
  MdLanguage,
  MdEmail,
  MdPhone,
  MdCategory,
  MdCheck
} from "react-icons/md";
import { toast } from "react-toastify";
import {
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useCheckCompanyDuplicateQuery
} from "../../../redux/api/authApi";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";
import { buttonStyles } from "../../../styles/buttonStyles";

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
  "EdTech",
  "Telecommunications",
  "Manufacturing",
  "Automotive",
  "Other"
];

const COMPANY_TYPES = [
  "IT Services",
  "Product Company",
  "Consulting",
  "Startup",
  "MNC",
  "Core Industry",
  "Public Sector / PSU",
  "Non-Profit / NGO",
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
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const [createCompany, { isLoading: isCreating }] = useCreateCompanyMutation();
  const [updateCompany, { isLoading: isUpdating }] = useUpdateCompanyMutation();

  const isEditMode = Boolean(companyToEdit);

  // Check duplicate hook
  const { data: duplicateRes, isFetching: isCheckingDuplicate } = useCheckCompanyDuplicateQuery(
    formData.companyName,
    {
      skip: isEditMode || !formData.companyName || formData.companyName.trim().length < 2
    }
  );

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
    setLogoLoadError(false);
    setActiveTab("all");
  }, [companyToEdit, isOpen]);

  useEffect(() => {
    if (!isEditMode && duplicateRes?.exists && duplicateRes?.existingCompany) {
      setDuplicateWarning(duplicateRes.existingCompany);
    } else if (!isEditMode) {
      setDuplicateWarning(null);
    }
  }, [duplicateRes, isEditMode]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "companyLogo") {
      setLogoLoadError(false);
    }
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
        const res = await updateCompany({ id: companyToEdit._id, ...payload }).unwrap();
        toast.success("Company updated successfully!");
        onSuccess?.(res?.data || payload);
      } else {
        const res = await createCompany(payload).unwrap();
        toast.success(res?.message || "Company added successfully.");
        onSuccess?.(res?.data || payload);
      }

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

  const showLogoImage = Boolean(formData.companyLogo && !logoLoadError);

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header matching Website Design Theme */}
        <div className="px-5 sm:px-6 py-4 border-b border-gray-150 flex items-center justify-between bg-gradient-to-r from-orange-50/70 via-white to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-orange-100/90 text-orange-600 flex items-center justify-center font-bold shrink-0 shadow-2xs border border-orange-200/60">
              <MdBusiness size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>{isEditMode ? "Edit Company Master" : "Add New Company"}</span>
                {isEditMode && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 uppercase tracking-wider">
                    Edit Mode
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isEditMode
                  ? "Update company information in master placement record"
                  : "Register company into global placement drives & recruiter database"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Live Company Identity Banner & Status */}
        <div className="bg-slate-50/90 border-b border-slate-200/70 px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {showLogoImage ? (
              <img
                src={formData.companyLogo}
                alt="Company Logo"
                onError={() => setLogoLoadError(true)}
                className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-200/80 p-1 shadow-2xs shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-white font-extrabold text-base flex items-center justify-center shadow-2xs shrink-0">
                {formData.companyName?.trim()
                  ? formData.companyName.trim().charAt(0).toUpperCase()
                  : "C"}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm truncate">
                {formData.companyName.trim() || "Company Name"}
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                {formData.industry || "IT Services"} • {formData.companyType || "Product Company"}
              </p>
            </div>
          </div>

          {/* Status Toggle Switch */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Status:</span>
            <div className="inline-flex p-0.5 bg-slate-200/70 rounded-xl">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, status: "Active" }))}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  formData.status === "Active"
                    ? "bg-white text-emerald-700 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, status: "Inactive" }))}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  formData.status === "Inactive"
                    ? "bg-white text-rose-600 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Inactive
              </button>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar text-xs">
          
          {/* Duplicate Company Warning Banner */}
          {duplicateWarning && (
            <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <MdErrorOutline size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 text-xs">Company Already Registered!</h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    A company named <strong>"{duplicateWarning.companyName}"</strong> is already in your placement database.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewCompany?.(duplicateWarning);
                }}
                className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <MdVisibility size={14} /> View Company
              </button>
            </div>
          )}

          {/* Section 1: Basic Company Information */}
          <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xs shadow-2xs">
                  <MdBusiness size={14} />
                </div>
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                  Basic Company Information
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Identity & Branding</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Company Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Company Name <span className="text-orange-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="e.g. Tata Consultancy Services, Infosys, Wipro..."
                    className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs ${
                      errors.companyName
                        ? "border-rose-400 bg-rose-50/30"
                        : "border-slate-200 hover:border-orange-300"
                    }`}
                  />
                  {isCheckingDuplicate && (
                    <span className="absolute right-3.5 top-3 text-[11px] font-bold text-slate-400">
                      Checking...
                    </span>
                  )}
                  {!isCheckingDuplicate && formData.companyName.trim().length > 2 && !duplicateWarning && !errors.companyName && (
                    <span className="absolute right-3.5 top-3 text-emerald-500" title="Name is unique">
                      <MdCheck size={18} />
                    </span>
                  )}
                </div>
                {errors.companyName && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.companyName}</p>
                )}
              </div>

              {/* Company Logo URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Company Logo (Image URL)
                </label>
                <input
                  type="text"
                  name="companyLogo"
                  value={formData.companyLogo}
                  onChange={handleChange}
                  placeholder="https://example.com/logo.png"
                  className="w-full h-11 px-3.5 bg-white border border-slate-200 hover:border-orange-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MdLanguage className="text-orange-500" size={14} />
                  <span>Company Website</span>
                </label>
                <input
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="e.g. www.company.com"
                  className="w-full h-11 px-3.5 bg-white border border-slate-200 hover:border-orange-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs"
                />
              </div>

              {/* Official Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MdEmail className="text-orange-500" size={14} />
                  <span>Official Email</span>
                </label>
                <input
                  type="email"
                  name="companyEmail"
                  value={formData.companyEmail}
                  onChange={handleChange}
                  placeholder="careers@company.com"
                  className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs ${
                    errors.companyEmail
                      ? "border-rose-400 bg-rose-50/30"
                      : "border-slate-200 hover:border-orange-300"
                  }`}
                />
                {errors.companyEmail && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.companyEmail}</p>
                )}
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MdPhone className="text-orange-500" size={14} />
                  <span>Company Contact Number</span>
                </label>
                <input
                  type="text"
                  name="companyContact"
                  value={formData.companyContact}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  className="w-full h-11 px-3.5 bg-white border border-slate-200 hover:border-orange-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Company Address & Location */}
          <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xs shadow-2xs">
                  <MdLocationOn size={14} />
                </div>
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                  Company Address & Location
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Head Office Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Office Address / Head Office
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street Address, Tech Park / Tower, Phase 1"
                  className="w-full h-11 px-3.5 bg-white border border-slate-200 hover:border-orange-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Pune, Bengaluru, Indore"
                  className="w-full h-11 px-3.5 bg-white border border-slate-200 hover:border-orange-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g. Maharashtra, MP"
                  className="w-full h-11 px-3.5 bg-white border border-slate-200 hover:border-orange-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="India"
                  className="w-full h-11 px-3.5 bg-white border border-slate-200 hover:border-orange-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Industry & Classification */}
          <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xs shadow-2xs">
                  <MdCategory size={14} />
                </div>
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                  Industry & Classification
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Sector & Category</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Industry Sector
                </label>
                <SelectDropdown
                  value={formData.industry}
                  onChange={(val) => setFormData((prev) => ({ ...prev, industry: val }))}
                  options={INDUSTRY_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                  className="w-full"
                  buttonClassName="w-full h-11 px-3.5 bg-white border border-slate-200 hover:border-orange-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 flex items-center justify-between shadow-2xs transition cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Company Type
                </label>
                <SelectDropdown
                  value={formData.companyType}
                  onChange={(val) => setFormData((prev) => ({ ...prev, companyType: val }))}
                  options={COMPANY_TYPES.map((type) => ({ value: type, label: type }))}
                  className="w-full"
                  buttonClassName="w-full h-11 px-3.5 bg-white border border-slate-200 hover:border-orange-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 flex items-center justify-between shadow-2xs transition cursor-pointer"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Company Description
                </label>
                <textarea
                  name="description"
                  rows={2}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief overview of company business domain, core tech stacks, hiring tiers, or recruitment profile..."
                  className="w-full p-3.5 bg-white border border-slate-200 hover:border-orange-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: HR / Primary Contact Person */}
          <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xs shadow-2xs">
                  <MdPerson size={14} />
                </div>
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                  HR / Primary Contact Person
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Recruiter Coordinator</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  name="contactPersonName"
                  value={formData.contactPersonName}
                  onChange={handleChange}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full h-11 px-3.5 bg-white border border-slate-200 hover:border-orange-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Designation
                </label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  placeholder="e.g. Talent Acquisition Lead / HR"
                  className="w-full h-11 px-3.5 bg-white border border-slate-200 hover:border-orange-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MdEmail className="text-orange-500" size={14} />
                  <span>Contact Person Email</span>
                </label>
                <input
                  type="email"
                  name="contactPersonEmail"
                  value={formData.contactPersonEmail}
                  onChange={handleChange}
                  placeholder="rahul.sharma@company.com"
                  className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs ${
                    errors.contactPersonEmail
                      ? "border-rose-400 bg-rose-50/30"
                      : "border-slate-200 hover:border-orange-300"
                  }`}
                />
                {errors.contactPersonEmail && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.contactPersonEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MdPhone className="text-orange-500" size={14} />
                  <span>Contact Person Phone</span>
                </label>
                <input
                  type="text"
                  name="contactPersonPhone"
                  value={formData.contactPersonPhone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  className="w-full h-11 px-3.5 bg-white border border-slate-200 hover:border-orange-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Footer Action Bar matching Website Design Theme */}
          <div className="pt-2 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 font-medium">
              * Required fields to create company record
            </span>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                className={`${buttonStyles.cancel} px-5 py-2.5 text-xs sm:text-sm text-center flex items-center justify-center`}
              >
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={isCreating || isUpdating}
                className={`${buttonStyles.primary} px-6 py-2.5 text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {isCreating || isUpdating ? (
                  <span>Saving Company...</span>
                ) : (
                  <>
                    <MdCheckCircle size={18} />
                    <span>{isEditMode ? "Update Company" : "Save Company"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddCompanyModal;
