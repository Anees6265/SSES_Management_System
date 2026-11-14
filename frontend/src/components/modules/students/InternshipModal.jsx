/* eslint-disable react/prop-types */
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  MdClose,
  MdCheckCircle,
  MdSchool,
  MdWork,
  MdLocationOn,
  MdAttachMoney,
  MdCalendarToday,
} from "react-icons/md";
import { useMarkStudentInternshipMutation } from "../../../redux/api/authApi";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";

const INTERNSHIP_TYPE_OPTIONS = [
  { value: "Paid", label: "Paid Internship" },
  { value: "Unpaid", label: "Unpaid Internship" },
];

const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const InternshipModal = ({ isOpen, onClose, student, onSuccess }) => {
  const [markInternship, { isLoading }] = useMarkStudentInternshipMutation();

  // Form State - Local state guarantees values will never be wiped out while typing
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [location, setLocation] = useState("");
  const [internshipType, setInternshipType] = useState("Paid");
  const [stipend, setStipend] = useState("");
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState("");
  const [errors, setErrors] = useState({});

  // Reset form only when modal opens fresh with a student
  useEffect(() => {
    if (isOpen) {
      setCompanyName("");
      setPosition("");
      setLocation("");
      setInternshipType("Paid");
      setStipend("");
      setStartDate(getTodayString());
      setEndDate("");
      setErrors({});
    }
  }, [isOpen, student?._id]);

  if (!isOpen) return null;

  const studentName = student
    ? `${student.firstName || ""} ${student.lastName || ""}`.trim()
    : "Student";
  const studentLevel =
    student?.currentLevelName ||
    student?.currentLevelId?.name ||
    student?.level ||
    student?.levelName ||
    "—";
  const departmentName =
    student?.subDepartmentId?.departmentId?.name ||
    student?.subDepartmentId?.name ||
    student?.departmentName ||
    student?.department ||
    "—";

  const validate = () => {
    const newErrors = {};
    if (!companyName.trim()) newErrors.companyName = "Company name is required";
    if (!position.trim()) newErrors.position = "Position / Role is required";
    if (!location.trim()) newErrors.location = "Location is required";
    if (internshipType === "Paid" && !stipend.trim()) {
      newErrors.stipend = "Stipend amount is required for paid internship";
    }
    if (!startDate) newErrors.startDate = "Start date is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const studentId = student?._id;
    if (!studentId) {
      toast.error("Student ID is missing");
      return;
    }

    try {
      await markInternship({
        id: studentId,
        data: {
          companyName: companyName.trim(),
          position: position.trim(),
          location: location.trim(),
          internshipType,
          stipend: internshipType === "Paid" ? stipend.trim() : "",
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
        },
      }).unwrap();

      toast.success(`${studentName} marked as Internship successfully!`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to mark student to Internship");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                <MdWork size={18} />
              </span>
              Mark Student to Internship
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {studentName} • {student?.prkey || student?.studentId || "Student"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition shrink-0 cursor-pointer"
            title="Close"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {/* Pre-filled Student Info Card */}
          <div className="p-3.5 bg-gradient-to-br from-sky-50 via-slate-50 to-blue-50/50 rounded-2xl border border-sky-100/80 shadow-2xs">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold text-xs">
                <MdSchool size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{studentName}</h4>
                <p className="text-[10px] text-slate-500">Student Profile Summary</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px] pt-1.5 border-t border-sky-100/60">
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">
                  PR Key / Roll
                </span>
                <span className="font-bold text-slate-800">
                  {student?.prkey || student?.studentId || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">
                  Course
                </span>
                <span className="font-bold text-slate-800 truncate block">
                  {student?.course || "—"} {student?.branch ? `(${student.branch})` : ""}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">
                  Department
                </span>
                <span className="font-bold text-slate-800 truncate block">{departmentName}</span>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">
                  Current Level (Will restore here if reverted)
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {studentLevel}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} id="internship-form" className="space-y-3.5">
            {/* Company & Position */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. TCS, Infosys, TechCorp"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: "" }));
                  }}
                  className={`w-full h-11 px-3 rounded-xl border bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:bg-white transition ${
                    errors.companyName ? "border-rose-400 focus:border-rose-500 bg-rose-50/30" : "border-slate-200 focus:border-orange-500"
                  }`}
                />
                {errors.companyName && (
                  <p className="text-rose-500 text-[11px] mt-1">{errors.companyName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Position / Role <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Web Dev Intern, UI/UX Intern"
                  value={position}
                  onChange={(e) => {
                    setPosition(e.target.value);
                    if (errors.position) setErrors((prev) => ({ ...prev, position: "" }));
                  }}
                  className={`w-full h-11 px-3 rounded-xl border bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:bg-white transition ${
                    errors.position ? "border-rose-400 focus:border-rose-500 bg-rose-50/30" : "border-slate-200 focus:border-orange-500"
                  }`}
                />
                {errors.position && (
                  <p className="text-rose-500 text-[11px] mt-1">{errors.position}</p>
                )}
              </div>
            </div>

            {/* Location & Internship Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MdLocationOn className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type="text"
                    placeholder="e.g. Indore, Bhopal, Remote"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      if (errors.location) setErrors((prev) => ({ ...prev, location: "" }));
                    }}
                    className={`w-full h-11 pl-9 pr-3 rounded-xl border bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:bg-white transition ${
                      errors.location ? "border-rose-400 focus:border-rose-500 bg-rose-50/30" : "border-slate-200 focus:border-orange-500"
                    }`}
                  />
                </div>
                {errors.location && (
                  <p className="text-rose-500 text-[11px] mt-1">{errors.location}</p>
                )}
              </div>

              <div className="relative z-30">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internship Type <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 z-10">
                    <MdWork size={17} />
                  </div>
                  <SelectDropdown
                    value={internshipType}
                    onChange={(val) => {
                      setInternshipType(val);
                      if (val === "Unpaid") setStipend("");
                      if (errors.stipend) setErrors((prev) => ({ ...prev, stipend: "" }));
                    }}
                    options={INTERNSHIP_TYPE_OPTIONS}
                    placeholder="Select Internship Type"
                    className="w-full"
                    buttonClassName="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 hover:border-orange-500 bg-slate-50 hover:bg-white text-xs sm:text-sm font-semibold text-slate-800 flex items-center justify-between transition shadow-2xs cursor-pointer"
                    menuClassName="w-full min-w-full z-50 shadow-xl border border-slate-100 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Stipend Input (Only if Paid) */}
            {internshipType === "Paid" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Stipend Amount (per month) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MdAttachMoney className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type="text"
                    placeholder="e.g. ₹10,000 / month or 15000"
                    value={stipend}
                    onChange={(e) => {
                      setStipend(e.target.value);
                      if (errors.stipend) setErrors((prev) => ({ ...prev, stipend: "" }));
                    }}
                    className={`w-full h-11 pl-9 pr-3 rounded-xl border bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:bg-white transition ${
                      errors.stipend ? "border-rose-400 focus:border-rose-500 bg-rose-50/30" : "border-slate-200 focus:border-orange-500"
                    }`}
                  />
                </div>
                {errors.stipend && (
                  <p className="text-rose-500 text-[11px] mt-1">{errors.stipend}</p>
                )}
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start / Joining Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: "" }));
                    }}
                    className={`w-full h-11 px-3 rounded-xl border bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:bg-white transition ${
                      errors.startDate ? "border-rose-400 focus:border-rose-500" : "border-slate-200 focus:border-orange-500"
                    }`}
                  />
                </div>
                {errors.startDate && (
                  <p className="text-rose-500 text-[11px] mt-1">{errors.startDate}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expected End Date (Optional)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-[11px] text-amber-800 leading-relaxed">
              <span className="font-bold">Note:</span> Student ko Internship me shift karne per wo current academic level se remove hokar <strong>Placements → Internship</strong> page par dikhega. In case student wapas aata hai to use previous level me revert kiya ja sakta hai, ya permanent hone par <strong>Shift to Placed</strong> kiya ja sakta hai.
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-bold uppercase text-xs rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="internship-form"
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold uppercase text-xs text-white bg-orange-500 hover:bg-orange-600 transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <MdCheckCircle size={16} />
            <span>{isLoading ? "Saving..." : "Confirm & Move to Internship"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InternshipModal;
