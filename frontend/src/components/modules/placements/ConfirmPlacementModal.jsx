/* eslint-disable react/prop-types */
import React, { useState, useEffect, useRef } from "react";
import {
  MdClose,
  MdCheckCircle,
  MdBusiness,
  MdWork,
  MdLocationOn,
  MdAttachMoney,
  MdCalendarToday,
  MdDeleteOutline,
  MdUploadFile,
  MdSchool,
} from "react-icons/md";
import { IoCloudUploadOutline, IoDocumentTextOutline } from "react-icons/io5";
import { toast } from "react-toastify";
import { useConfirmPlacementMutation } from "../../../redux/api/authApi";
import { buttonStyles } from "../../../styles/buttonStyles";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";

const JOB_TYPE_OPTIONS = [
  { value: "Full-Time", label: "Full-Time" },
  { value: "Internship", label: "Internship" },
  { value: "Internship + PPO", label: "Internship + PPO" },
  { value: "Contract", label: "Contract" },
  { value: "Part-Time", label: "Part-Time" },
];

const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatFileSize = (bytes) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const ConfirmPlacementModal = ({ isOpen, onClose, student, onSuccess }) => {
  const [confirmPlacement] = useConfirmPlacementMutation();
  const fileInputRef = useRef(null);

  // Form states
  const [companyName, setCompanyName] = useState("");
  const [salary, setSalary] = useState("");
  const [location, setLocation] = useState("");
  const [jobProfile, setJobProfile] = useState("");
  const [jobType, setJobType] = useState("Full-Time");
  const [joiningDate, setJoiningDate] = useState(getTodayString());
  const [offerLetterFile, setOfferLetterFile] = useState(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Resolve student details safely
  const studentObj = student?.studentId?._id ? student.studentId : (student || {});
  const studentId = studentObj._id || student?._id;
  const firstName = studentObj.firstName || student?.firstName || "";
  const lastName = studentObj.lastName || student?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim() || "Student";
  const email = studentObj.email || student?.email || "";
  const prKey = studentObj.prKey || student?.prKey || "";
  const profilePic = studentObj.profilePic || student?.profilePic || "";
  const course =
    studentObj.course ||
    studentObj.technology ||
    studentObj.subDepartmentId?.name ||
    student?.course ||
    student?.technology ||
    "";
  const isFromInternship =
    studentObj.status === "Internship" ||
    student?.status === "Internship" ||
    !!studentObj.internshipDetails?.companyName ||
    !!student?.internshipDetails?.companyName;

  // Initialize form values whenever modal opens or target student changes
  useEffect(() => {
    if (isOpen) {
      const comp =
        studentObj.internshipDetails?.companyName ||
        student?.internshipDetails?.companyName ||
        studentObj.placedInfo?.companyName ||
        student?.placedInfo?.companyName ||
        student?.selectedInterview?.companyName ||
        student?.activeInterview?.companyName ||
        "";
      const prof =
        studentObj.internshipDetails?.position ||
        student?.internshipDetails?.position ||
        studentObj.placedInfo?.jobProfile ||
        student?.placedInfo?.jobProfile ||
        student?.selectedInterview?.jobProfile ||
        "";
      const loc =
        studentObj.internshipDetails?.location ||
        student?.internshipDetails?.location ||
        studentObj.placedInfo?.location ||
        student?.placedInfo?.location ||
        "";
      const sal =
        studentObj.placedInfo?.salary ||
        student?.placedInfo?.salary ||
        (studentObj.internshipDetails?.stipend && !isNaN(studentObj.internshipDetails.stipend)
          ? Number(studentObj.internshipDetails.stipend) * 12
          : "") ||
        "";

      setCompanyName(comp);
      setJobProfile(prof);
      setLocation(loc);
      setSalary(sal ? String(sal) : "");
      setJobType("Full-Time");
      setJoiningDate(getTodayString());
      setOfferLetterFile(null);
      setErrors({});
      setIsDragging(false);
    }
  }, [isOpen, studentId]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setOfferLetterFile(null);
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    const allowedExtensions = ["pdf", "doc", "docx"];
    if (!allowedExtensions.includes(ext)) {
      toast.error("Please upload an offer letter in PDF, DOC, or DOCX format");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Offer letter file size should not exceed 15MB");
      return;
    }
    setOfferLetterFile(file);
    if (errors.offerLetter) {
      setErrors((prev) => ({ ...prev, offerLetter: undefined }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!companyName.trim()) newErrors.companyName = "Company name is required";
    if (!salary || isNaN(salary) || Number(salary) <= 0) {
      newErrors.salary = "Please enter a valid salary package";
    }
    if (!location.trim()) newErrors.location = "Job location is required";
    if (!jobProfile.trim()) newErrors.jobProfile = "Job profile / designation is required";
    if (!jobType) newErrors.jobType = "Job type is required";
    if (!joiningDate) newErrors.joiningDate = "Joining date is required";
    if (!offerLetterFile) newErrors.offerLetter = "Offer letter is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please complete all required fields and upload the Offer Letter");
      return;
    }

    if (!studentId) {
      toast.error("Student ID missing. Unable to confirm placement.");
      return;
    }

    try {
      setIsSubmitting(true);
      const placementData = new FormData();
      placementData.append("studentId", studentId);
      placementData.append("companyName", companyName.trim());
      placementData.append("salary", salary);
      placementData.append("location", location.trim());
      placementData.append("jobProfile", jobProfile.trim());
      placementData.append("jobType", jobType);
      placementData.append("joiningDate", joiningDate);
      placementData.append("offerLetterFile", offerLetterFile);

      await confirmPlacement(placementData).unwrap();

      toast.success("Placement confirmed successfully!");
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Error confirming placement:", error);
      toast.error(error?.data?.message || "Error confirming placement. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Computed LPA representation
  const numericSalary = Number(salary);
  const lpaPreview =
    !isNaN(numericSalary) && numericSalary > 0
      ? `₹${(numericSalary / 100000).toFixed(2)} LPA (approx ₹${Math.round(numericSalary / 12).toLocaleString()}/mo)`
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 my-auto animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-orange-50/30 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
              <MdWork size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                Confirm Placement
              </h2>
              <p className="text-xs text-slate-500">
                Record student placement package & upload offer letter
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Student Banner */}
        <div className="px-6 pt-4 pb-1">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 via-orange-50/20 to-slate-50 border border-slate-200/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {profilePic ? (
                <img
                  src={profilePic}
                  alt={fullName}
                  className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                  {fullName.charAt(0) || "S"}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-extrabold text-slate-900 truncate">
                    {fullName}
                  </h4>
                  {isFromInternship && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold uppercase tracking-wider">
                      From Internship
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-500 mt-0.5 truncate">
                  {prKey && <span className="font-semibold text-slate-700">{prKey}</span>}
                  {email && <span className="truncate">{email}</span>}
                </div>
              </div>
            </div>
            {course && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shrink-0 shadow-2xs">
                <MdSchool className="text-orange-500" size={15} />
                <span className="truncate max-w-[140px]">{course}</span>
              </div>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-20">
            {/* Company Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Company Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MdBusiness size={18} />
                </div>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: undefined }));
                  }}
                  placeholder="e.g. Google, TCS, Infosys"
                  className={`w-full h-11 pl-10 pr-3.5 bg-slate-50 border ${
                    errors.companyName ? "border-red-400 bg-red-50/20" : "border-slate-200 focus:border-orange-500"
                  } rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none transition-all`}
                />
              </div>
              {errors.companyName && (
                <p className="text-[11px] font-semibold text-red-500 mt-1">{errors.companyName}</p>
              )}
            </div>

            {/* Salary Package */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Yearly Package (INR) <span className="text-red-500">*</span>
                </label>
                {lpaPreview && (
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {lpaPreview}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <span className="font-bold text-base leading-none">₹</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={salary}
                  onChange={(e) => {
                    setSalary(e.target.value);
                    if (errors.salary) setErrors((prev) => ({ ...prev, salary: undefined }));
                  }}
                  placeholder="e.g. 600000 (6 LPA)"
                  className={`w-full h-11 pl-10 pr-3.5 bg-slate-50 border ${
                    errors.salary ? "border-red-400 bg-red-50/20" : "border-slate-200 focus:border-orange-500"
                  } rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none transition-all`}
                />
              </div>
              {errors.salary && (
                <p className="text-[11px] font-semibold text-red-500 mt-1">{errors.salary}</p>
              )}
            </div>

            {/* Job Profile / Role */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Job Profile / Designation <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MdWork size={18} />
                </div>
                <input
                  type="text"
                  value={jobProfile}
                  onChange={(e) => {
                    setJobProfile(e.target.value);
                    if (errors.jobProfile) setErrors((prev) => ({ ...prev, jobProfile: undefined }));
                  }}
                  placeholder="e.g. Full Stack Developer, SDE 1"
                  className={`w-full h-11 pl-10 pr-3.5 bg-slate-50 border ${
                    errors.jobProfile ? "border-red-400 bg-red-50/20" : "border-slate-200 focus:border-orange-500"
                  } rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none transition-all`}
                />
              </div>
              {errors.jobProfile && (
                <p className="text-[11px] font-semibold text-red-500 mt-1">{errors.jobProfile}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Job Location <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MdLocationOn size={18} />
                </div>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    if (errors.location) setErrors((prev) => ({ ...prev, location: undefined }));
                  }}
                  placeholder="e.g. Bangalore, Indore, Remote"
                  className={`w-full h-11 pl-10 pr-3.5 bg-slate-50 border ${
                    errors.location ? "border-red-400 bg-red-50/20" : "border-slate-200 focus:border-orange-500"
                  } rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none transition-all`}
                />
              </div>
              {errors.location && (
                <p className="text-[11px] font-semibold text-red-500 mt-1">{errors.location}</p>
              )}
            </div>

            {/* Job Type Dropdown */}
            <div className="relative z-30">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Job Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 z-10">
                  <MdWork size={18} />
                </div>
                <SelectDropdown
                  value={jobType}
                  onChange={(val) => {
                    setJobType(val);
                    if (errors.jobType) setErrors((prev) => ({ ...prev, jobType: undefined }));
                  }}
                  options={JOB_TYPE_OPTIONS}
                  placeholder="Select Job Type"
                  className="w-full"
                  buttonClassName="w-full h-11 pl-10 pr-3.5 bg-slate-50 hover:bg-white border border-slate-200 hover:border-orange-500 rounded-xl text-sm font-semibold text-slate-800 flex items-center justify-between transition-all cursor-pointer shadow-2xs"
                  menuClassName="w-full min-w-full z-50 shadow-xl border border-slate-100 rounded-xl"
                />
              </div>
              {errors.jobType && (
                <p className="text-[11px] font-semibold text-red-500 mt-1">{errors.jobType}</p>
              )}
            </div>

            {/* Joining Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Joining Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MdCalendarToday size={18} />
                </div>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => {
                    setJoiningDate(e.target.value);
                    if (errors.joiningDate) setErrors((prev) => ({ ...prev, joiningDate: undefined }));
                  }}
                  className={`w-full h-11 pl-10 pr-3.5 bg-slate-50 border ${
                    errors.joiningDate ? "border-red-400 bg-red-50/20" : "border-slate-200 focus:border-orange-500"
                  } rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none transition-all cursor-pointer`}
                />
              </div>
              {errors.joiningDate && (
                <p className="text-[11px] font-semibold text-red-500 mt-1">{errors.joiningDate}</p>
              )}
            </div>
          </div>

          {/* Offer Letter Upload ONLY */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Offer Letter Document <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-medium text-slate-400">
                Supported: PDF, DOC, DOCX (Max 15MB)
              </span>
            </div>

            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {!offerLetterFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? "border-orange-500 bg-orange-50/60 scale-[1.01]"
                    : errors.offerLetter
                    ? "border-red-400 bg-red-50/20 hover:border-red-500"
                    : "border-slate-200 hover:border-orange-400 hover:bg-orange-50/30 bg-slate-50/50"
                }`}
              >
                <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                  <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-2xs">
                    <IoCloudUploadOutline size={22} />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-700 mt-1">
                    Click to browse or drag & drop offer letter
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Official candidate appointment or offer letter file
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative border-2 border-emerald-400 bg-emerald-50/50 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <IoDocumentTextOutline size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                      {offerLetterFile.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-semibold text-slate-500">
                        {formatFileSize(offerLetterFile.size)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                        <MdCheckCircle size={12} />
                        Ready to upload
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => setOfferLetterFile(null)}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Remove file"
                  >
                    <MdDeleteOutline size={18} />
                  </button>
                </div>
              </div>
            )}

            {errors.offerLetter && (
              <p className="text-[11px] font-semibold text-red-500 mt-1.5">{errors.offerLetter}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm ${buttonStyles.cancel}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm flex items-center justify-center gap-2 ${buttonStyles.primary} ${
                isSubmitting ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Confirming...</span>
                </>
              ) : (
                <>
                  <MdCheckCircle size={18} />
                  <span>Confirm Placement</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfirmPlacementModal;
