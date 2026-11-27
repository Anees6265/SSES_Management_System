/* eslint-disable react/prop-types */
import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import {
  useGetInterviewHistoryQuery,
  useRescheduleInterviewMutation,
  useAddInterviewRoundMutation,
  useMarkInterviewConductedMutation,
  useUpdateFinalResultMutation,
} from "../../../redux/api/authApi";
import Loader from "../../shared/loader/Loader";
import Header from "../../shared/sidebar/Header";
import EmptyState from "../../shared/empty-state/EmptyState";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";
import { toast } from "react-toastify";
import {
  CheckCircle2,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  MapPin,
  User,
  Briefcase,
  RotateCcw,
  Plus,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Award,
  Search,
  X,
  RefreshCw,
  FileText,
  HelpCircle,
} from "lucide-react";

/* ─── Company Logo with Fallback Tile ────────────────────────────── */
const CompanyLogo = ({ company, size = "w-12 h-12", rounded = "rounded-xl" }) => {
  const [imgError, setImgError] = useState(false);
  const logoUrl = company?.companyLogo || company?.logo;
  const name = company?.companyName || "Company";
  const initial = name.trim() ? name.trim().charAt(0).toUpperCase() : "C";

  if (logoUrl && !imgError) {
    return (
      <div
        className={`${size} ${rounded} bg-white border border-gray-200 shadow-2xs p-1.5 flex items-center justify-center shrink-0 overflow-hidden transition-all duration-200`}
        title={name}
      >
        <img
          src={logoUrl}
          alt={name}
          onError={() => setImgError(true)}
          className="w-full h-full object-contain object-center"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`${size} ${rounded} bg-orange-50 border border-orange-200 text-orange-600 font-extrabold flex items-center justify-center shrink-0 shadow-2xs text-lg`}
      title={name}
    >
      {initial}
    </div>
  );
};

/* ─── MODAL 1: Mark Conducted Modal ──────────────────────────────── */
const MarkConductedModal = ({ isOpen, onClose, interview, studentName, onConfirm, isLoading }) => {
  const [conductedDate, setConductedDate] = useState(new Date().toISOString().split("T")[0]);
  const [conductedTime, setConductedTime] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [conductedRemarks, setConductedRemarks] = useState("");

  useEffect(() => {
    if (isOpen) {
      setConductedDate(new Date().toISOString().split("T")[0]);
      setConductedTime("");
      setInterviewer("");
      setConductedRemarks("");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!conductedDate) {
      toast.error("Please specify the conducted date");
      return;
    }
    onConfirm({ conductedDate, conductedTime, interviewer, conductedRemarks });
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={!isLoading ? onClose : undefined} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Mark Interview Conducted</h3>
              <p className="text-xs text-gray-500">Record attendance, interview time, and feedback</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 pt-4">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs flex items-center justify-between">
            <div>
              <span className="text-gray-500">Candidate:</span>{" "}
              <strong className="text-gray-900 font-semibold">{studentName}</strong>
            </div>
            <div>
              <span className="text-gray-500">Company:</span>{" "}
              <strong className="text-orange-600 font-semibold">{interview?.company?.companyName || "Company"}</strong>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Conducted Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={conductedDate}
                onChange={(e) => setConductedDate(e.target.value)}
                className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-orange-500 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Conducted Time</label>
              <input
                type="text"
                placeholder="e.g. 11:30 AM"
                value={conductedTime}
                onChange={(e) => setConductedTime(e.target.value)}
                className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-orange-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Interviewer Name / Panel</label>
            <input
              type="text"
              placeholder="e.g. Rahul Sharma (Senior Tech Lead)"
              value={interviewer}
              onChange={(e) => setInterviewer(e.target.value)}
              className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-orange-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Interviewer Remarks & Notes</label>
            <textarea
              rows={3}
              placeholder="Candidate feedback, questions covered, technical readiness notes..."
              value={conductedRemarks}
              onChange={(e) => setConductedRemarks(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-orange-500 focus:outline-none transition resize-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isLoading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>Confirm Conducted</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

/* ─── MODAL 2: Record Result & Selection Modal ───────────────────── */
const ResultSelectionModal = ({ isOpen, onClose, interview, studentName, onConfirm, isLoading }) => {
  const [resultStatus, setResultStatus] = useState("Selected");
  const [resultRemark, setResultRemark] = useState("");
  const [salaryPackage, setSalaryPackage] = useState("");
  const [joiningDate, setJoiningDate] = useState("");

  useEffect(() => {
    if (isOpen) {
      setResultStatus("Selected");
      setResultRemark(interview?.statusRemark || "");
      setSalaryPackage("");
      setJoiningDate("");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, interview]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!resultStatus) {
      toast.error("Please select a result decision");
      return;
    }
    if (resultStatus === "Placed" && (!salaryPackage || Number(salaryPackage) <= 0)) {
      toast.error("Please enter the annual salary package (CTC in ₹ LPA) for placed status");
      return;
    }
    onConfirm({ resultStatus, resultRemark, salaryPackage, joiningDate });
  };

  const statusOptions = [
    {
      id: "Selected",
      title: "Selected by Company",
      desc: "Candidate cleared all evaluation rounds and received selection",
      badge: "Selected",
      activeBg: "border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-1 ring-emerald-500",
      inactiveBg: "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 text-gray-800",
      icon: Award,
      iconColor: "text-emerald-600",
    },
    {
      id: "Placed",
      title: "Offer Accepted & Placed",
      desc: "Student accepted offer with salary package (Marks candidate as Placed)",
      badge: "Final Placement",
      activeBg: "border-purple-500 bg-purple-50/70 text-purple-900 ring-1 ring-purple-500",
      inactiveBg: "border-gray-200 hover:border-purple-300 hover:bg-purple-50/30 text-gray-800",
      icon: Sparkles,
      iconColor: "text-purple-600",
    },
    {
      id: "Cleared",
      title: "Cleared Round (Proceed to Next)",
      desc: "Candidate passed this stage and moves to the next evaluation round",
      badge: "Round Cleared",
      activeBg: "border-blue-500 bg-blue-50/70 text-blue-900 ring-1 ring-blue-500",
      inactiveBg: "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 text-gray-800",
      icon: CheckCircle2,
      iconColor: "text-blue-600",
    },
    {
      id: "Not Selected",
      title: "Not Selected / Rejected",
      desc: "Candidate did not clear this round or final company selection",
      badge: "Not Selected",
      activeBg: "border-rose-500 bg-rose-50/70 text-rose-900 ring-1 ring-rose-500",
      inactiveBg: "border-gray-200 hover:border-rose-300 hover:bg-rose-50/30 text-gray-800",
      icon: XCircle,
      iconColor: "text-rose-600",
    },
    {
      id: "OnHold",
      title: "Decision On Hold",
      desc: "Interview result is awaiting further company panel feedback",
      badge: "On Hold",
      activeBg: "border-amber-500 bg-amber-50/70 text-amber-900 ring-1 ring-amber-500",
      inactiveBg: "border-gray-200 hover:border-amber-300 hover:bg-amber-50/30 text-gray-800",
      icon: HelpCircle,
      iconColor: "text-amber-600",
    },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={!isLoading ? onClose : undefined} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Record Interview Result</h3>
              <p className="text-xs text-gray-500">Update outcome or record candidate placement</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 pt-4">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs flex items-center justify-between">
            <div>
              <span className="text-gray-500">Candidate:</span>{" "}
              <strong className="text-gray-900 font-semibold">{studentName}</strong>
            </div>
            <div>
              <span className="text-gray-500">Company:</span>{" "}
              <strong className="text-orange-600 font-semibold">{interview?.company?.companyName || "Company"}</strong>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Select Decision / Status <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-2">
              {statusOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = resultStatus === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setResultStatus(opt.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected ? opt.activeBg : opt.inactiveBg
                    }`}
                  >
                    <div className="pt-0.5">
                      <Icon className={`w-4 h-4 ${opt.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold">{opt.title}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Placed Extra Details */}
          {resultStatus === "Placed" && (
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3 animate-in fade-in duration-150">
              <p className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Placement Offer Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Annual Package (CTC in ₹ LPA) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 6.5"
                    value={salaryPackage}
                    onChange={(e) => setSalaryPackage(e.target.value)}
                    className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-orange-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Expected Joining Date</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-orange-500 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks & Evaluation Summary</label>
            <textarea
              rows={3}
              placeholder="Record final feedback, panel comments, or offer acceptance details..."
              value={resultRemark}
              onChange={(e) => setResultRemark(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-orange-500 focus:outline-none transition resize-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isLoading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>Save Decision</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

/* ─── MODAL 3: Add Next Round Modal ──────────────────────────────── */
const AddNextRoundModal = ({ isOpen, onClose, interview, studentName, onConfirm, isLoading }) => {
  const [roundName, setRoundName] = useState("");
  const [nextRoundDate, setNextRoundDate] = useState("");
  const [nextRoundTime, setNextRoundTime] = useState("10:00");
  const [nextRoundMode, setNextRoundMode] = useState("Online");
  const [nextRoundInterviewer, setNextRoundInterviewer] = useState("");
  const [nextRoundLocation, setNextRoundLocation] = useState("");
  const [nextRoundFeedback, setNextRoundFeedback] = useState("");

  const existingRoundsCount = interview?.rounds?.length || 0;

  useEffect(() => {
    if (isOpen) {
      setRoundName(`Round ${existingRoundsCount + 1}`);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setNextRoundDate(tomorrow.toISOString().split("T")[0]);
      setNextRoundTime("10:00");
      setNextRoundMode("Online");
      setNextRoundInterviewer("");
      setNextRoundLocation("");
      setNextRoundFeedback("");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, existingRoundsCount]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!roundName.trim()) {
      toast.error("Please provide a round name");
      return;
    }
    if (!nextRoundDate) {
      toast.error("Please select a date for this round");
      return;
    }
    onConfirm({
      roundName: roundName.trim(),
      nextRoundDate,
      nextRoundTime,
      nextRoundMode,
      nextRoundInterviewer: nextRoundInterviewer.trim(),
      nextRoundLocation: nextRoundLocation.trim(),
      nextRoundFeedback: nextRoundFeedback.trim(),
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={!isLoading ? onClose : undefined} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Schedule Next Round</h3>
              <p className="text-xs text-gray-500">Add evaluation stage for {interview?.company?.companyName || "Company"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 pt-4">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs flex items-center justify-between">
            <div>
              <span className="text-gray-500">Candidate:</span>{" "}
              <strong className="text-gray-900 font-semibold">{studentName}</strong>
            </div>
            <div>
              <span className="text-gray-500">Current Stage:</span>{" "}
              <strong className="text-blue-600 font-semibold">{existingRoundsCount} Round{existingRoundsCount !== 1 ? "s" : ""} Completed</strong>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Round Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Technical Round 2, HR Discussion, Coding Test"
              value={roundName}
              onChange={(e) => setRoundName(e.target.value)}
              className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-orange-500 focus:outline-none transition"
            />
            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {["Technical Round 1", "Technical Round 2", "HR Interview", "Managerial Round", "Coding Assessment"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRoundName(s)}
                  className="text-[11px] px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-orange-50 hover:text-orange-700 text-gray-600 border border-gray-200 transition cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Round Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={nextRoundDate}
                onChange={(e) => setNextRoundDate(e.target.value)}
                className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-orange-500 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Time Slot</label>
              <input
                type="time"
                value={nextRoundTime}
                onChange={(e) => setNextRoundTime(e.target.value)}
                className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-orange-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Interview Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {["Online", "Offline", "Hybrid"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setNextRoundMode(mode)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition cursor-pointer text-center ${
                    nextRoundMode === mode
                      ? "bg-orange-50 border-orange-500 text-orange-700 font-bold"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Interviewer Name / Panel</label>
            <input
              type="text"
              placeholder="e.g. Srikant Verma (VP Engineering)"
              value={nextRoundInterviewer}
              onChange={(e) => setNextRoundInterviewer(e.target.value)}
              className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-orange-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Location or Meeting Link</label>
            <input
              type="text"
              placeholder="e.g. Google Meet URL or Main Boardroom"
              value={nextRoundLocation}
              onChange={(e) => setNextRoundLocation(e.target.value)}
              className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-orange-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Special Instructions & Topics</label>
            <textarea
              rows={2}
              placeholder="Topics covered, candidate instructions, preparation notes..."
              value={nextRoundFeedback}
              onChange={(e) => setNextRoundFeedback(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-orange-500 focus:outline-none transition resize-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isLoading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>Schedule Round</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

/* ─── MODAL 4: Reschedule Interview Modal ────────────────────────── */
const RescheduleModal = ({ isOpen, onClose, interview, studentName, onConfirm, isLoading }) => {
  const [newInterviewDate, setNewInterviewDate] = useState("");
  const [newInterviewTime, setNewInterviewTime] = useState("10:00");
  const [rescheduleReason, setRescheduleReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      const dateToUse = interview?.scheduleDate || interview?.interviewDate;
      if (dateToUse) {
        const dateObj = new Date(dateToUse);
        setNewInterviewDate(dateObj.toISOString().split("T")[0]);
        setNewInterviewTime(
          `${String(dateObj.getHours()).padStart(2, "0")}:${String(dateObj.getMinutes()).padStart(2, "0")}`
        );
      } else {
        setNewInterviewDate(new Date().toISOString().split("T")[0]);
        setNewInterviewTime("10:00");
      }
      setRescheduleReason("");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, interview]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newInterviewDate) {
      toast.error("Please pick a new interview date");
      return;
    }
    onConfirm({ newInterviewDate, newInterviewTime, rescheduleReason });
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={!isLoading ? onClose : undefined} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Reschedule Interview</h3>
              <p className="text-xs text-gray-500">Adjust date and time for {interview?.company?.companyName || "Company"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Schedule Banner */}
        <div className="px-6 pt-4">
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs space-y-1 text-amber-900">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-800">Candidate: {studentName}</span>
              <span className="font-semibold text-amber-800">
                Current:{" "}
                <strong>
                  {interview?.scheduleDate
                    ? new Date(interview.scheduleDate).toLocaleDateString()
                    : "Not set"}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                New Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={newInterviewDate}
                onChange={(e) => setNewInterviewDate(e.target.value)}
                className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-orange-500 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">New Time</label>
              <input
                type="time"
                value={newInterviewTime}
                onChange={(e) => setNewInterviewTime(e.target.value)}
                className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-orange-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Rescheduling</label>
            <textarea
              rows={3}
              placeholder="Candidate illness, company panel requested alternate slot, university exam clash..."
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-orange-500 focus:outline-none transition resize-none"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                "Candidate semester exam clash",
                "Company panel rescheduled slot",
                "Candidate medical emergency",
                "Technical connectivity issue",
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setRescheduleReason(reason)}
                  className="text-[11px] px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-orange-50 hover:text-orange-700 text-gray-600 border border-gray-200 transition cursor-pointer"
                >
                  + {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isLoading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>Confirm Reschedule</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

/* ─── Main Component ────────────────────────────────────────────── */
const InterviewHistory = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: historyData,
    isLoading,
    isError,
    error,
    refetch: refetchHistory,
  } = useGetInterviewHistoryQuery(id, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const student = historyData?.data?.student || null;
  const studentName =
    historyData?.data?.studentName ||
    (student ? `${student.firstName || ""} ${student.lastName || ""}`.trim() : "");
  const interviews = historyData?.data?.interviews || [];

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal Dialog States
  const [isConductedModalOpen, setIsConductedModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isAddNextRoundModalOpen, setIsAddNextRoundModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

  // Active selected interview for actions
  const [selectedInterview, setSelectedInterview] = useState(null);

  // API Mutations
  const [rescheduleInterview, { isLoading: isRescheduling }] = useRescheduleInterviewMutation();
  const [addInterviewRound, { isLoading: isAddingRound }] = useAddInterviewRoundMutation();
  const [markInterviewConducted, { isLoading: isMarkingConducted }] = useMarkInterviewConductedMutation();
  const [updateFinalResult, { isLoading: isUpdatingResult }] = useUpdateFinalResultMutation();

  /* ─── Action Handlers ────────────────────────────────────────────── */
  const handleMarkConductedClick = (interview) => {
    setSelectedInterview({ studentId: id, ...interview });
    setIsConductedModalOpen(true);
  };

  const handleExecuteConducted = async ({ conductedDate, conductedTime, interviewer, conductedRemarks }) => {
    try {
      // Safe ISO date formatting without string concat RangeError
      let formattedDate = new Date().toISOString();
      if (conductedDate) {
        const parts = conductedDate.split("-");
        if (parts.length === 3) {
          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
          if (!isNaN(d.getTime())) {
            formattedDate = d.toISOString();
          }
        }
      }

      await markInterviewConducted({
        studentId: id,
        interviewId: selectedInterview._id,
        actualDate: formattedDate,
        conductedDate: formattedDate,
        actualTime: conductedTime ? conductedTime.trim() : "",
        conductedTime: conductedTime ? conductedTime.trim() : "",
        interviewer: interviewer ? interviewer.trim() : "",
        remarks: conductedRemarks ? conductedRemarks.trim() : "",
        conductedRemarks: conductedRemarks ? conductedRemarks.trim() : "",
      }).unwrap();

      toast.success("Interview marked as Conducted successfully!");
      setIsConductedModalOpen(false);
      await refetchHistory();
    } catch (err) {
      toast.error(err?.data?.message || err?.data?.error || err?.message || "Failed to mark interview as conducted");
    }
  };

  const handleUpdateClick = (interview) => {
    setSelectedInterview({ studentId: id, ...interview });
    setIsUpdateModalOpen(true);
  };

  const handleExecuteResult = async ({ resultStatus, resultRemark, salaryPackage, joiningDate }) => {
    try {
      await updateFinalResult({
        studentId: id,
        interviewId: selectedInterview._id,
        finalResult: resultStatus,
        remarks: resultRemark.trim() || undefined,
        salaryPackage: resultStatus === "Placed" && salaryPackage ? Number(salaryPackage) : undefined,
        joiningDate: resultStatus === "Placed" && joiningDate ? new Date(joiningDate).toISOString() : undefined,
      }).unwrap();

      toast.success(
        resultStatus === "Placed"
          ? "Candidate officially placed with offer recorded!"
          : resultStatus === "Selected"
          ? "Candidate marked as Selected!"
          : "Interview outcome updated successfully!"
      );
      setIsUpdateModalOpen(false);
      await refetchHistory();
    } catch (err) {
      toast.error(err?.data?.message || err?.data?.error || "Failed to update interview result");
    }
  };

  const handleAddNextRoundClick = (interview) => {
    const roundsList = interview.rounds || [];
    const lastRound = roundsList.length > 0 ? roundsList[roundsList.length - 1] : null;

    if (lastRound && lastRound.result && ["Not Cleared", "Failed", "Rejected"].includes(lastRound.result)) {
      toast.error(`Cannot schedule next round. Previous round was marked ${lastRound.result}.`);
      return;
    }

    setSelectedInterview({ studentId: id, ...interview });
    setIsAddNextRoundModalOpen(true);
  };

  const handleExecuteAddNextRound = async ({
    roundName,
    nextRoundDate,
    nextRoundTime,
    nextRoundMode,
    nextRoundInterviewer,
    nextRoundLocation,
    nextRoundFeedback,
  }) => {
    try {
      const interviewId = selectedInterview._id;
      const combinedDate = `${nextRoundDate}T${nextRoundTime || "10:00"}:00`;

      await addInterviewRound({
        studentId: id,
        interviewId,
        roundName,
        date: new Date(combinedDate).toISOString(),
        time: nextRoundTime,
        mode: nextRoundMode,
        interviewer: nextRoundInterviewer,
        location: nextRoundLocation,
        feedback: nextRoundFeedback,
        result: "Pending",
      }).unwrap();

      toast.success(`${roundName} scheduled successfully!`);
      setIsAddNextRoundModalOpen(false);
      await refetchHistory();
    } catch (err) {
      toast.error(err?.data?.message || err?.data?.error || "Failed to add round");
    }
  };

  const handleRescheduleClick = (interview) => {
    setSelectedInterview({ studentId: id, ...interview });
    setIsRescheduleModalOpen(true);
  };

  const handleExecuteReschedule = async ({ newInterviewDate, newInterviewTime, rescheduleReason }) => {
    try {
      const combinedDateTime = `${newInterviewDate}T${newInterviewTime || "10:00"}:00`;

      await rescheduleInterview({
        studentId: selectedInterview.studentId,
        interviewId: selectedInterview._id,
        newDate: new Date(combinedDateTime).toISOString(),
        newTime: newInterviewTime,
        originalDate: selectedInterview.scheduleDate,
        reason: rescheduleReason || "Requested by Placement Officer",
      }).unwrap();

      toast.success("Interview rescheduled successfully!");
      setIsRescheduleModalOpen(false);
      await refetchHistory();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to reschedule interview");
    }
  };

  /* ─── Status Badge Renderer ─────────────────────────────────────── */
  const renderStatusBadge = (status) => {
    const base = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shrink-0";
    switch (status) {
      case "Selected":
        return (
          <span className={`${base} bg-emerald-50 text-emerald-700 border border-emerald-200`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Selected
          </span>
        );
      case "Placed":
        return (
          <span className={`${base} bg-purple-50 text-purple-700 border border-purple-200`}>
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Placed
          </span>
        );
      case "Conducted":
        return (
          <span className={`${base} bg-sky-50 text-sky-700 border border-sky-200`}>
            <CheckCircle className="w-3.5 h-3.5 text-sky-600" />
            Conducted
          </span>
        );
      case "Ongoing":
      case "Interview In Progress":
        return (
          <span className={`${base} bg-orange-50 text-orange-700 border border-orange-200`}>
            <Clock className="w-3.5 h-3.5 text-orange-600" />
            Ongoing
          </span>
        );
      case "Scheduled":
      case "Interview Scheduled":
        return (
          <span className={`${base} bg-blue-50 text-blue-700 border border-blue-200`}>
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Scheduled
          </span>
        );
      case "Rescheduled":
      case "Interview Rescheduled":
        return (
          <span className={`${base} bg-amber-50 text-amber-700 border border-amber-200`}>
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            Rescheduled
          </span>
        );
      case "Not Selected":
      case "Reject":
      case "Rejected":
      case "Failed":
      case "RejectedByCompany":
      case "RejectedByStudent":
        return (
          <span className={`${base} bg-rose-50 text-rose-700 border border-rose-200`}>
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Not Selected
          </span>
        );
      default:
        return (
          <span className={`${base} bg-gray-100 text-gray-700 border border-gray-200`}>
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            {status || "Pending"}
          </span>
        );
    }
  };

  // Quick stats summary
  const totalInterviewsCount = interviews.length;
  const selectedCount = interviews.filter((i) => i.status === "Selected" || i.status === "Placed").length;
  const scheduledCount = interviews.filter((i) => ["Scheduled", "Rescheduled", "Ongoing"].includes(i.status)).length;
  const rejectedCount = interviews.filter((i) =>
    ["Not Selected", "Rejected", "Failed", "Reject"].includes(i.status)
  ).length;

  // Filter options for SelectDropdown
  const filterOptions = useMemo(
    () => [
      { value: "ALL", label: `All Statuses (${totalInterviewsCount})` },
      { value: "ACTIVE", label: `Scheduled / Active (${scheduledCount})` },
      { value: "SELECTED", label: `Selected / Placed (${selectedCount})` },
      { value: "REJECTED", label: `Not Selected (${rejectedCount})` },
    ],
    [totalInterviewsCount, scheduledCount, selectedCount, rejectedCount]
  );

  // Filtered interviews list
  const filteredInterviews = useMemo(() => {
    return interviews.filter((item) => {
      // Status filter
      if (statusFilter === "ACTIVE" && !["Scheduled", "Rescheduled", "Ongoing"].includes(item.status)) {
        return false;
      }
      if (statusFilter === "SELECTED" && !["Selected", "Placed"].includes(item.status)) {
        return false;
      }
      if (statusFilter === "REJECTED" && !["Not Selected", "Rejected", "Failed", "Reject"].includes(item.status)) {
        return false;
      }

      // Search query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const companyMatch = item.company?.companyName?.toLowerCase().includes(query);
        const roleMatch = item.jobProfile?.toLowerCase().includes(query);
        const locationMatch = item.company?.location?.toLowerCase().includes(query);
        return companyMatch || roleMatch || locationMatch;
      }

      return true;
    });
  }, [interviews, statusFilter, searchTerm]);

  /* ─── Loading & Error Views ─────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-gray-50">
        <Loader />
        <p className="mt-4 text-xs font-semibold text-gray-500">Loading interview records...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16">
        <Header
          title={studentName ? `Interview History - ${studentName}` : "Interview History"}
          showBack={true}
          onBackClick={() => navigate(-1)}
        />
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl flex items-center gap-4">
            <AlertCircle className="w-8 h-8 text-rose-500 shrink-0" />
            <div>
              <h4 className="font-bold text-base">Error Loading Interview Records</h4>
              <p className="text-xs text-rose-600 mt-1">
                {error?.data?.message || "Could not retrieve student interview history. Please verify the candidate ID."}
              </p>
              <button
                onClick={() => refetchHistory()}
                className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pageSubtitle = [
    student?.course && `${student.course}${student?.stream ? ` • ${student.stream}` : ""}`,
    student?.email,
    student?.studentMobile,
  ]
    .filter(Boolean)
    .join(" • ") || "Candidate evaluation timeline, rounds progress, and interview records";

  return (
    <div className="min-h-screen bg-gray-50/60 pb-16 w-full">
      {/* ─── Top Header with Student Name ────────────────────────────── */}
      <Header
        title={studentName ? `Interview History - ${studentName}` : "Candidate Interview History"}
        subtitle={pageSubtitle}
        showBack={true}
        onBackClick={() => navigate(-1)}
        breadcrumbs={[
          { label: "Placements", path: "/placements/dashboard" },
          { label: "Placement Readiness", path: "/readiness-status" },
          { label: studentName || "Candidate", path: `/student-profile/${id}` },
          { label: "Interview History" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchHistory()}
              className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 border border-gray-200 rounded-xl transition cursor-pointer"
              title="Refresh Records"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(`/student-profile/${id}`)}
              className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-gray-500" />
              <span>View Profile</span>
            </button>
          </div>
        }
      />

      {/* ─── Full-Width Controls & Records Container ────────────────── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-4 pt-4">
        {/* ─── Search & Dropdown Filter Toolbar ──────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-xs">
          {/* Search Box on Left */}
          <div className="relative w-full sm:w-80 md:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by company, job role, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-8 text-xs sm:text-sm rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 focus:outline-none transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Dropdown on Right */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="w-full sm:w-64">
              <SelectDropdown
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={filterOptions}
                placeholder="Filter by status..."
                usePortal={true}
              />
            </div>
          </div>
        </div>

        {/* ─── Interview Records List ───────────────────────────────── */}
        {filteredInterviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-xs">
            <EmptyState
              title={
                searchTerm || statusFilter !== "ALL"
                  ? "No Matching Interviews Found"
                  : "No Interview Records Found"
              }
              subtitle={
                searchTerm || statusFilter !== "ALL"
                  ? "Try clearing your search query or changing the status filter dropdown to view records."
                  : "This candidate has not been scheduled for any campus interview rounds yet."
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInterviews.map((interview, index) => {
              const roundsList = interview.rounds || [];
              const lastRound = roundsList.length > 0 ? roundsList[roundsList.length - 1] : null;
              const isConducted =
                interview.status === "Conducted" ||
                lastRound?.status === "Conducted" ||
                !!lastRound?.conductedDate ||
                !!interview.conductedDate;
              const isFailed =
                interview.status === "Not Selected" ||
                interview.status === "Rejected" ||
                interview.status === "Failed" ||
                lastRound?.result === "Not Cleared" ||
                lastRound?.result === "Failed" ||
                lastRound?.result === "Rejected";
              const isSelected = interview.status === "Selected" || interview.status === "Placed";

              return (
                <div
                  key={interview._id || index}
                  className="bg-white rounded-2xl border border-gray-200 shadow-xs hover:shadow-sm transition-all duration-200 overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="bg-gray-50/70 border-b border-gray-100 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <CompanyLogo company={interview.company} size="w-12 h-12" />
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="text-base sm:text-lg font-bold text-gray-900">
                            {interview.company?.companyName || "Company Name"}
                          </h4>
                          {renderStatusBadge(interview.status || "Scheduled")}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1 font-semibold text-gray-700 bg-white border border-gray-200 px-2 py-0.5 rounded-md shadow-2xs">
                            <Briefcase className="w-3 h-3 text-gray-400" />
                            {interview.jobProfile || "Job Profile"}
                          </span>

                          {interview.company?.location && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              {interview.company.location}
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-bold text-[11px]">
                            {roundsList.length} Round{roundsList.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Header Action: View Full Timeline */}
                    <div className="flex items-center gap-2 self-start md:self-center">
                      <button
                        onClick={() => navigate(`/interview-rounds-history/${id}/${interview._id}`)}
                        className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        title="View detailed round-by-round timeline"
                      >
                        <span>Timeline Details</span>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 sm:p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                      {/* Column 1: Schedule & Timing */}
                      <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100 space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          Interview Schedule
                        </p>

                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Scheduled Slot</p>
                          <p className="text-xs sm:text-sm font-bold text-gray-900">
                            {interview.scheduleDate
                              ? new Date(interview.scheduleDate).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Date not set"}
                            {interview.rounds?.[0]?.time && ` at ${interview.rounds[0].time}`}
                          </p>
                        </div>

                        {interview.conductedDate && (
                          <div>
                            <p className="text-xs text-emerald-700 font-semibold mb-0.5">Conducted On</p>
                            <p className="text-xs text-gray-700 font-bold">
                              {new Date(interview.conductedDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        )}

                        <div>
                          <button
                            type="button"
                            onClick={() => handleRescheduleClick(interview)}
                            className="inline-flex items-center gap-1.5 text-xs text-gray-700 hover:text-orange-600 hover:bg-orange-50 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 font-semibold transition shadow-2xs cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                            <span>Reschedule Slot</span>
                          </button>
                        </div>
                      </div>

                      {/* Column 2: Rounds Pipeline */}
                      <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100 space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          Rounds Progression
                        </p>

                        {roundsList.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No specific rounds recorded yet.</p>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {roundsList.map((r, rIdx) => {
                              const isRoundCleared = r.result === "Cleared" || r.result === "Passed";
                              const isRoundFailed = r.result === "Not Cleared" || r.result === "Failed";
                              return (
                                <div
                                  key={r._id || rIdx}
                                  className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-gray-200 shadow-2xs"
                                >
                                  <div className="space-y-0.5 min-w-0 pr-2">
                                    <p className="font-bold text-gray-800 truncate">
                                      {r.roundName || `Round ${rIdx + 1}`}
                                    </p>
                                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5 truncate">
                                      <span>{r.mode || "Offline"}</span>
                                      {r.interviewer && <span>• {r.interviewer}</span>}
                                    </p>
                                  </div>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                      isRoundCleared
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : isRoundFailed
                                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                                        : r.status === "Conducted"
                                        ? "bg-sky-50 text-sky-700 border border-sky-200"
                                        : "bg-amber-50 text-amber-700 border border-amber-200"
                                    }`}
                                  >
                                    {r.result && r.result !== "Pending" ? r.result : r.status || "Scheduled"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Column 3: Evaluation Remarks & Offer */}
                      <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100 space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-gray-500" />
                          Evaluation Notes
                        </p>

                        <div className="bg-white p-3 rounded-xl border border-gray-200 text-xs text-gray-700 min-h-[75px] leading-relaxed">
                          {interview.statusRemark || lastRound?.feedback ? (
                            <p className="font-medium text-gray-800">
                              {interview.statusRemark || lastRound?.feedback}
                            </p>
                          ) : (
                            <p className="text-gray-400 italic">
                              No specific remarks or notes recorded for this interview yet.
                            </p>
                          )}
                        </div>

                        {interview.salaryPackage && (
                          <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between text-xs">
                            <span className="font-semibold text-purple-900">Package Offered:</span>
                            <span className="font-bold text-purple-700">₹ {interview.salaryPackage} LPA</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reschedule Audit History */}
                    {interview.rescheduleHistory && interview.rescheduleHistory.length > 0 && (
                      <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
                        <h5 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                          Reschedule History ({interview.rescheduleHistory.length})
                        </h5>
                        <div className="space-y-1.5 divide-y divide-amber-200/60 pt-1">
                          {interview.rescheduleHistory.map((item, rIdx) => (
                            <div
                              key={rIdx}
                              className="pt-1.5 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                            >
                              <div>
                                <span>
                                  Original:{" "}
                                  <strong className="line-through text-amber-700 font-semibold">
                                    {item.originalDate ? new Date(item.originalDate).toLocaleDateString() : "—"}{" "}
                                    {item.originalTime}
                                  </strong>
                                </span>
                                <span className="mx-2 font-bold text-amber-600">➔</span>
                                <span>
                                  New:{" "}
                                  <strong className="text-amber-950 font-bold">
                                    {item.newDate ? new Date(item.newDate).toLocaleDateString() : "—"} {item.newTime}
                                  </strong>
                                </span>
                              </div>
                              <div className="text-[11px] text-amber-800 font-medium">
                                <span>Reason: &quot;{item.reason || "Rescheduled"}&quot;</span> •{" "}
                                <span>By: {item.rescheduledBy || "Placement Officer"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Action Footer */}
                  <div className="bg-gray-50/80 px-5 sm:px-6 py-3.5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        Stage:{" "}
                        <strong className="text-gray-800">
                          {lastRound ? lastRound.roundName : "Initial Stage"}
                        </strong>{" "}
                        ({interview.status})
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                      {isFailed ? (
                        <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5">
                          <XCircle className="w-4 h-4 text-rose-600" /> Candidate did not clear{" "}
                          {lastRound?.roundName || "Interview"}
                        </span>
                      ) : (
                        <>
                          {/* 1. Mark Conducted */}
                          {!isConducted && (
                            <button
                              type="button"
                              onClick={() => handleMarkConductedClick(interview)}
                              className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Mark Conducted</span>
                            </button>
                          )}

                          {/* 2. Record Result / Status Change */}
                          <button
                            type="button"
                            onClick={() => handleUpdateClick(interview)}
                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl text-xs font-semibold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>{isSelected ? "Update Status" : "Record Result"}</span>
                          </button>

                          {/* 3. Add Next Round */}
                          {!isSelected && (
                            <button
                              type="button"
                              onClick={() => handleAddNextRoundClick(interview)}
                              className="px-3.5 py-2 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 text-gray-500" />
                              <span>Add Round</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── MODAL 1: MARK CONDUCTED ─────────────────────────────────── */}
      <MarkConductedModal
        isOpen={isConductedModalOpen}
        onClose={() => setIsConductedModalOpen(false)}
        interview={selectedInterview}
        studentName={studentName}
        onConfirm={handleExecuteConducted}
        isLoading={isMarkingConducted}
      />

      {/* ─── MODAL 2: RECORD RESULT / SELECTION ─────────────────────── */}
      <ResultSelectionModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        interview={selectedInterview}
        studentName={studentName}
        onConfirm={handleExecuteResult}
        isLoading={isUpdatingResult}
      />

      {/* ─── MODAL 3: ADD NEXT ROUND ─────────────────────────────────── */}
      <AddNextRoundModal
        isOpen={isAddNextRoundModalOpen}
        onClose={() => setIsAddNextRoundModalOpen(false)}
        interview={selectedInterview}
        studentName={studentName}
        onConfirm={handleExecuteAddNextRound}
        isLoading={isAddingRound}
      />

      {/* ─── MODAL 4: RESCHEDULE INTERVIEW ───────────────────────────── */}
      <RescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        interview={selectedInterview}
        studentName={studentName}
        onConfirm={handleExecuteReschedule}
        isLoading={isRescheduling}
      />
    </div>
  );
};

export default InterviewHistory;
