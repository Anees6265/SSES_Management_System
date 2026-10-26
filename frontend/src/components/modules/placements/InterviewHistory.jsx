/* eslint-disable react/prop-types */
import { useState } from "react";
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
import { toast } from "react-toastify";
import {
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  MapPin,
  User,
  Briefcase,
  GraduationCap,
  RotateCcw,
  Plus,
  Sparkles,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Award,
  DollarSign,
  Video,
  Building,
  Phone,
  Mail,
  HelpCircle,
} from "lucide-react";
import Header from "../../shared/sidebar/Header";
import OrangeButton from "../../shared/sidebar/OrangeButton";
import EmptyState from "../../shared/empty-state/EmptyState";

/* ─── Center Confirmation Modal Popup ────────────────────────────── */
const CenterConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  title,
  subtitle,
  icon: Icon = Award,
  iconColor = "text-emerald-600 bg-emerald-50 border-emerald-200",
  confirmText = "Yes, Confirm",
  confirmBtnStyle = "bg-emerald-600 hover:bg-emerald-700 text-white",
  details = [],
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Dark backdrop with subtle blur */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Modal Dialog Card */}
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon */}
        <div className="p-6 pb-3 text-center">
          <div
            className={`w-14 h-14 mx-auto rounded-2xl border flex items-center justify-center mb-3 shadow-xs ${iconColor}`}
          >
            <Icon className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{subtitle}</p>}
        </div>

        {/* Structured Details Preview */}
        {details && details.length > 0 && (
          <div className="px-6 pb-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
              {details.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-medium">{item.label}:</span>
                  {item.isBadge ? (
                    <span className="px-2 py-0.5 rounded-full font-bold bg-white border border-slate-200 text-slate-800 text-[11px]">
                      {item.value}
                    </span>
                  ) : (
                    <span className="font-bold text-slate-900 text-right truncate max-w-[210px]">
                      {item.value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-100 transition cursor-pointer disabled:opacity-50 text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-center ${confirmBtnStyle}`}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─── Company Logo with Fallback Tile ────────────────────────────── */
const CompanyLogo = ({ company, size = "w-12 h-12", rounded = "rounded-xl" }) => {
  const [imgError, setImgError] = useState(false);
  const logoUrl = company?.companyLogo || company?.logo;
  const name = company?.companyName || "Company";
  const initial = name.trim() ? name.trim().charAt(0).toUpperCase() : "C";

  if (logoUrl && !imgError) {
    return (
      <div
        className={`${size} ${rounded} bg-white border border-slate-200/90 shadow-2xs p-1.5 flex items-center justify-center shrink-0 overflow-hidden transition-all duration-200 hover:border-orange-300`}
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
      className={`${size} ${rounded} bg-gradient-to-br from-orange-500 to-amber-600 text-white font-extrabold flex items-center justify-center shrink-0 shadow-xs border border-orange-400/40 text-base`}
      title={name}
    >
      {initial}
    </div>
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
  const studentName = historyData?.data?.studentName || (student ? `${student.firstName || ""} ${student.lastName || ""}`.trim() : "Student");
  const readinessStatus = historyData?.data?.readinessStatus || "In Progress";
  const interviews = historyData?.data?.interviews || [];

  // Drawer Shutter States
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isAddNextRoundModalOpen, setIsAddNextRoundModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isConductedModalOpen, setIsConductedModalOpen] = useState(false);

  // Center Confirmation Modal State
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    isOpen: false,
    title: "",
    subtitle: "",
    icon: Award,
    iconColor: "text-emerald-600 bg-emerald-50 border-emerald-200",
    confirmText: "Yes, Confirm",
    confirmBtnStyle: "bg-emerald-600 hover:bg-emerald-700 text-white",
    details: [],
    onConfirm: () => {},
  });

  // Active Selected Interview for actions
  const [selectedInterview, setSelectedInterview] = useState(null);

  // Conducted Drawer Form State
  const [conductedDate, setConductedDate] = useState(new Date().toISOString().split("T")[0]);
  const [conductedTime, setConductedTime] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [conductedRemarks, setConductedRemarks] = useState("");

  // Result / Selection Drawer Form State
  const [resultStatus, setResultStatus] = useState("Selected");
  const [resultRemark, setResultRemark] = useState("");
  const [salaryPackage, setSalaryPackage] = useState("");
  const [joiningDate, setJoiningDate] = useState("");

  // Add Next Round Drawer Form State
  const [nextRoundData, setNextRoundData] = useState({});
  const [roundName, setRoundName] = useState("");
  const [nextRoundDate, setNextRoundDate] = useState("");
  const [nextRoundTime, setNextRoundTime] = useState("10:00");
  const [nextRoundMode, setNextRoundMode] = useState("Online");
  const [nextRoundInterviewer, setNextRoundInterviewer] = useState("");
  const [nextRoundLocation, setNextRoundLocation] = useState("");
  const [nextRoundFeedback, setNextRoundFeedback] = useState("");

  // Reschedule Drawer Form State
  const [newInterviewDate, setNewInterviewDate] = useState("");
  const [newInterviewTime, setNewInterviewTime] = useState("10:00");
  const [rescheduleReason, setRescheduleReason] = useState("");

  // API Mutations
  const [rescheduleInterview, { isLoading: isRescheduling }] = useRescheduleInterviewMutation();
  const [addInterviewRound, { isLoading: isAddingRound }] = useAddInterviewRoundMutation();
  const [markInterviewConducted, { isLoading: isMarkingConducted }] = useMarkInterviewConductedMutation();
  const [updateFinalResult, { isLoading: isUpdatingResult }] = useUpdateFinalResultMutation();

  /* ─── 1. Mark Conducted Flow ────────────────────────────────────── */
  const handleMarkConductedClick = (interview) => {
    setSelectedInterview({ studentId: id, ...interview });
    const today = new Date().toISOString().split("T")[0];
    const initialTime = interview.rounds?.[0]?.time || "10:30 AM";
    setConductedDate(today);
    setConductedTime(initialTime);
    setInterviewer(interview.rounds?.[0]?.interviewer || "");
    setConductedRemarks("");
    setIsConductedModalOpen(true);
  };

  const handleOpenConductedConfirm = () => {
    if (!conductedDate) {
      toast.error("Please specify the conducted date");
      return;
    }

    setConfirmModalConfig({
      isOpen: true,
      title: "Confirm Interview Conducted",
      subtitle: `Confirm that ${studentName} has completed this interview with ${selectedInterview?.company?.companyName || "Company"}.`,
      icon: CheckCircle,
      iconColor: "text-orange-600 bg-orange-50 border-orange-200",
      confirmText: "Yes, Mark Conducted",
      confirmBtnStyle: "bg-orange-600 hover:bg-orange-700 text-white",
      details: [
        { label: "Candidate", value: studentName },
        { label: "Company", value: selectedInterview?.company?.companyName || "Company" },
        { label: "Conducted Date", value: conductedDate },
        { label: "Conducted Time", value: conductedTime || "TBD" },
        { label: "Interviewer", value: interviewer || "Not specified" },
      ],
      onConfirm: executeMarkConducted,
    });
  };

  const executeMarkConducted = async () => {
    try {
      await markInterviewConducted({
        studentId: id,
        interviewId: selectedInterview._id,
        actualDate: conductedDate,
        actualTime: conductedTime,
        interviewer,
        remarks: conductedRemarks,
      }).unwrap();

      toast.success("Interview marked as Conducted successfully!");
      setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
      setIsConductedModalOpen(false);
      await refetchHistory();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to mark interview as conducted");
    }
  };

  /* ─── 2. Record Result & Selection Flow ─────────────────────────── */
  const handleUpdateClick = (interview) => {
    setSelectedInterview({ studentId: id, ...interview });
    const currentStatus = interview.status || "Selected";
    setResultStatus(currentStatus === "Conducted" ? "Selected" : currentStatus);
    setResultRemark(interview.statusRemark || "");
    setSalaryPackage("");
    setJoiningDate("");
    setIsUpdateModalOpen(true);
  };

  const handleOpenResultConfirm = () => {
    if (!resultStatus) {
      toast.error("Please select a result decision");
      return;
    }

    if (resultStatus === "Placed" && !salaryPackage) {
      toast.error("Please enter the annual salary package (CTC) for placed status");
      return;
    }

    const isPositive = resultStatus === "Selected" || resultStatus === "Placed" || resultStatus === "Cleared";

    setConfirmModalConfig({
      isOpen: true,
      title:
        resultStatus === "Selected"
          ? "Confirm Candidate Selection"
          : resultStatus === "Placed"
          ? "Confirm Candidate Placement"
          : resultStatus === "Cleared"
          ? "Confirm Round Cleared"
          : resultStatus === "Not Selected"
          ? "Confirm Not Selected / Rejected"
          : "Confirm Result Decision",
      subtitle: `Are you sure you want to update the interview decision for ${studentName}?`,
      icon:
        resultStatus === "Selected"
          ? Award
          : resultStatus === "Placed"
          ? Sparkles
          : resultStatus === "Not Selected"
          ? XCircle
          : CheckCircle2,
      iconColor: isPositive
        ? "text-emerald-600 bg-emerald-50 border-emerald-200"
        : "text-rose-600 bg-rose-50 border-rose-200",
      confirmText:
        resultStatus === "Selected"
          ? "Yes, Mark Selected"
          : resultStatus === "Placed"
          ? "Yes, Confirm Placement"
          : resultStatus === "Not Selected"
          ? "Yes, Mark Not Selected"
          : "Yes, Update Status",
      confirmBtnStyle: isPositive
        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
        : "bg-rose-600 hover:bg-rose-700 text-white",
      details: [
        { label: "Candidate", value: studentName },
        { label: "Company", value: selectedInterview?.company?.companyName || "Company" },
        { label: "Job Profile", value: selectedInterview?.jobProfile || "Job Role" },
        { label: "Decision Status", value: resultStatus, isBadge: true },
        ...(resultStatus === "Placed"
          ? [
              { label: "Salary Package", value: `₹ ${salaryPackage} LPA` },
              ...(joiningDate ? [{ label: "Joining Date", value: new Date(joiningDate).toLocaleDateString() }] : []),
            ]
          : []),
      ],
      onConfirm: executeUpdateResult,
    });
  };

  const executeUpdateResult = async () => {
    try {
      let roundResult = "Pending";
      if (resultStatus === "Selected" || resultStatus === "Placed" || resultStatus === "Cleared") {
        roundResult = "Cleared";
      } else if (resultStatus === "Not Selected" || resultStatus === "Rejected") {
        roundResult = "Not Cleared";
      }

      await updateFinalResult({
        studentId: selectedInterview.studentId || id,
        interviewId: selectedInterview._id,
        status: resultStatus === "Cleared" ? "Ongoing" : resultStatus,
        roundResult,
        statusRemark: resultRemark,
        salary: salaryPackage ? Number(salaryPackage) : undefined,
        joiningDate: joiningDate || undefined,
      }).unwrap();

      toast.success(
        resultStatus === "Selected"
          ? "Candidate successfully marked as Selected!"
          : resultStatus === "Placed"
          ? "Candidate successfully Placed!"
          : "Interview result updated successfully"
      );
      setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
      setIsUpdateModalOpen(false);
      await refetchHistory();
    } catch (err) {
      toast.error(err?.data?.message || err?.data?.error || "Failed to update interview result");
    }
  };

  /* ─── 3. Add Next Round Flow ─────────────────────────────────────── */
  const handleAddNextRoundClick = (interview) => {
    const lastRound =
      interview.rounds && interview.rounds.length > 0 ? interview.rounds[interview.rounds.length - 1] : null;
    const isPrevConducted =
      interview.status === "Conducted" || lastRound?.status === "Conducted" || !!lastRound?.conductedDate;
    const isPrevCleared = lastRound?.result === "Cleared" || lastRound?.result === "Passed";

    if (lastRound && (!isPrevConducted || !isPrevCleared)) {
      toast.error(`Cannot schedule next round. Previous round (${lastRound.roundName}) must be Conducted and Cleared.`);
      return;
    }

    const nextRoundNumber = (interview.rounds?.length || 0) + 1;
    setNextRoundData({ baseInterview: interview, companyName: interview.company?.companyName });
    setRoundName(`Round ${nextRoundNumber}: Technical Interview`);
    setNextRoundDate(new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0]);
    setNextRoundTime("11:00");
    setNextRoundMode("Online");
    setNextRoundInterviewer("");
    setNextRoundLocation("");
    setNextRoundFeedback("");
    setIsAddNextRoundModalOpen(true);
  };

  const handleOpenAddRoundConfirm = () => {
    if (!roundName.trim()) {
      toast.error("Please provide a round name");
      return;
    }
    if (!nextRoundDate) {
      toast.error("Please select a date for this round");
      return;
    }

    setConfirmModalConfig({
      isOpen: true,
      title: "Schedule Interview Round",
      subtitle: `Schedule ${roundName} for ${studentName} at ${nextRoundData.companyName || "company"}.`,
      icon: Plus,
      iconColor: "text-slate-800 bg-slate-100 border-slate-300",
      confirmText: "Yes, Schedule Round",
      confirmBtnStyle: "bg-slate-900 hover:bg-slate-800 text-white",
      details: [
        { label: "Candidate", value: studentName },
        { label: "Company", value: nextRoundData.companyName || "Company" },
        { label: "Round Name", value: roundName },
        { label: "Scheduled For", value: `${nextRoundDate} at ${nextRoundTime || "10:00"}` },
        { label: "Interview Mode", value: nextRoundMode, isBadge: true },
        ...(nextRoundInterviewer ? [{ label: "Interviewer", value: nextRoundInterviewer }] : []),
      ],
      onConfirm: executeAddNextRound,
    });
  };

  const executeAddNextRound = async () => {
    try {
      const interviewId = nextRoundData.baseInterview._id;
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
      setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
      setIsAddNextRoundModalOpen(false);
      await refetchHistory();
    } catch (err) {
      toast.error(err?.data?.message || err?.data?.error || "Failed to add round");
    }
  };

  /* ─── 4. Reschedule Flow ─────────────────────────────────────────── */
  const handleRescheduleClick = (interview) => {
    setSelectedInterview({ studentId: id, ...interview });
    const dateToUse = interview.scheduleDate || interview.interviewDate;
    if (dateToUse) {
      const dateObj = new Date(dateToUse);
      setNewInterviewDate(dateObj.toISOString().split("T")[0]);
      setNewInterviewTime(
        `${String(dateObj.getHours()).padStart(2, "0")}:${String(dateObj.getMinutes()).padStart(2, "0")}`
      );
    } else {
      setNewInterviewDate(new Date().toISOString().split("T")[0]);
      setNewInterviewTime("11:00");
    }
    setRescheduleReason("");
    setIsRescheduleModalOpen(true);
  };

  const handleOpenRescheduleConfirm = () => {
    if (!newInterviewDate) {
      toast.error("Please pick a new interview date");
      return;
    }

    setConfirmModalConfig({
      isOpen: true,
      title: "Confirm Interview Reschedule",
      subtitle: `Reschedule interview for ${studentName} with ${selectedInterview?.company?.companyName || "company"}.`,
      icon: RotateCcw,
      iconColor: "text-amber-600 bg-amber-50 border-amber-200",
      confirmText: "Yes, Confirm Reschedule",
      confirmBtnStyle: "bg-amber-600 hover:bg-amber-700 text-white",
      details: [
        { label: "Candidate", value: studentName },
        { label: "Company", value: selectedInterview?.company?.companyName || "Company" },
        {
          label: "Current Date",
          value: selectedInterview?.scheduleDate
            ? new Date(selectedInterview.scheduleDate).toLocaleDateString()
            : "—",
        },
        {
          label: "New Date & Time",
          value: `${new Date(newInterviewDate).toLocaleDateString()} at ${newInterviewTime || "10:00"}`,
        },
        { label: "Reason", value: rescheduleReason || "Requested by Placement Officer" },
      ],
      onConfirm: executeReschedule,
    });
  };

  const executeReschedule = async () => {
    if (isRescheduling) return;

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
      setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
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
          <span className={`${base} bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Selected
          </span>
        );
      case "Placed":
        return (
          <span className={`${base} bg-purple-50 text-purple-700 border border-purple-200/90 shadow-2xs`}>
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Placed
          </span>
        );
      case "Conducted":
        return (
          <span className={`${base} bg-sky-50 text-sky-700 border border-sky-200/90 shadow-2xs`}>
            <CheckCircle className="w-3.5 h-3.5 text-sky-600" />
            Conducted
          </span>
        );
      case "Ongoing":
      case "Interview In Progress":
        return (
          <span className={`${base} bg-orange-50 text-orange-700 border border-orange-200/90 shadow-2xs`}>
            <Clock className="w-3.5 h-3.5 text-orange-600" />
            Ongoing
          </span>
        );
      case "Scheduled":
      case "Interview Scheduled":
        return (
          <span className={`${base} bg-blue-50 text-blue-700 border border-blue-200/90 shadow-2xs`}>
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Scheduled
          </span>
        );
      case "Rescheduled":
      case "Interview Rescheduled":
        return (
          <span className={`${base} bg-amber-50 text-amber-700 border border-amber-200/90 shadow-2xs`}>
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
          <span className={`${base} bg-rose-50 text-rose-700 border border-rose-200/90 shadow-2xs`}>
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Not Selected
          </span>
        );
      default:
        return (
          <span className={`${base} bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs`}>
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            {status || "Pending"}
          </span>
        );
    }
  };

  /* ─── Loading & Error Views ─────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-slate-50/50">
        <Loader />
        <p className="mt-4 text-xs font-semibold text-slate-500">Loading interview records...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl flex items-center gap-4">
          <AlertCircle className="w-8 h-8 text-rose-500 shrink-0" />
          <div>
            <h4 className="font-bold text-base">Error Loading Interview Records</h4>
            <p className="text-xs text-rose-600 mt-1">
              {error?.data?.message || "Could not retrieve student interview history. Please verify the ID."}
            </p>
            <button
              onClick={() => refetchHistory()}
              className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quick stats summary
  const totalInterviewsCount = interviews.length;
  const selectedCount = interviews.filter((i) => i.status === "Selected" || i.status === "Placed").length;
  const scheduledCount = interviews.filter((i) => ["Scheduled", "Rescheduled", "Ongoing"].includes(i.status)).length;

  return (
    <div className="min-h-screen bg-slate-50/40 pb-16">
      <Header
        title="Candidate Interview History"
        subtitle="Manage interview rounds, mark interviews conducted, and record selection results"
        breadcrumbs={[
          { label: "Placements", path: "/placements/dashboard" },
          { label: "Candidates Readiness", path: "/readiness-status" },
          { label: "Interview History" },
        ]}
        onBackClick={() => {
          const activeTab = localStorage.getItem("placementActiveTab") || "Ongoing Interviews";
          localStorage.setItem("placementActiveTab", activeTab);
          navigate("/readiness-status");
        }}
      />

      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 pt-2">
        {/* ─── Student Profile Hero Banner ──────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 transition-all">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Student Info Left */}
            <div className="flex items-center gap-4 sm:gap-5">
              {student?.image ? (
                <img
                  src={student.image}
                  alt={studentName}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border-2 border-orange-200 shadow-xs shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-xs border border-orange-300 shrink-0">
                  {studentName ? studentName.charAt(0).toUpperCase() : "S"}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {studentName}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    {readinessStatus}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                  {(student?.course || student?.stream) && (
                    <span className="flex items-center gap-1 text-slate-600">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      {student.course} {student.stream ? `• ${student.stream}` : ""}
                    </span>
                  )}
                  {student?.studentMobile && (
                    <span className="flex items-center gap-1 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {student.studentMobile}
                    </span>
                  )}
                  {student?.email && (
                    <span className="flex items-center gap-1 text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {student.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Metrics & Actions Right */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
              <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/70">
                <Briefcase className="w-4 h-4 text-slate-500" />
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Interviews</p>
                  <p className="text-sm font-bold text-slate-800">{totalInterviewsCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200/70">
                <Award className="w-4 h-4 text-emerald-600" />
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Selected</p>
                  <p className="text-sm font-bold text-emerald-800">{selectedCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-200/70">
                <Clock className="w-4 h-4 text-blue-600" />
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Active</p>
                  <p className="text-sm font-bold text-blue-800">{scheduledCount}</p>
                </div>
              </div>

              <button
                onClick={() => navigate(`/student-profile/${id}`)}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0 ml-auto lg:ml-0"
              >
                <User className="w-3.5 h-3.5 text-slate-500" />
                View Profile
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── Interview Records Section ───────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Interview Pipeline & Rounds</h3>
              <p className="text-xs text-slate-500">
                All scheduled, conducted, and completed company interviews for this candidate
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg self-start sm:self-auto">
              Total Records: {interviews.length}
            </span>
          </div>

          {interviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <EmptyState
                title="No Interview Records Found"
                subtitle="This candidate has not been scheduled for any campus interview rounds yet. You can schedule new interviews from the Placement Candidates readiness pipeline."
              />
            </div>
          ) : (
            <div className="space-y-5">
              {interviews.map((interview, index) => {
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
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 overflow-hidden"
                  >
                    {/* Card Header Bar */}
                    <div className="bg-gradient-to-r from-slate-50 via-white to-orange-50/30 border-b border-slate-200/80 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <CompanyLogo company={interview.company} size="w-13 h-13" />
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="text-lg font-bold text-slate-900">
                              {interview.company?.companyName || "Company Name"}
                            </h4>
                            {renderStatusBadge(interview.status || "Scheduled")}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                              <Briefcase className="w-3 h-3 text-slate-500" />
                              {interview.jobProfile || "Job Profile"}
                            </span>

                            {interview.company?.location && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {interview.company.location}
                              </span>
                            )}

                            <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-bold text-[11px]">
                              {roundsList.length} Round{roundsList.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-2 self-start md:self-center">
                        <button
                          onClick={() => navigate(`/interview-rounds-history/${id}/${interview._id}`)}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          title="View detailed round-by-round timeline"
                        >
                          <span>Rounds Details</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                      </div>
                    </div>

                    {/* Card Body Grid */}
                    <div className="p-5 sm:p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 1. Schedule & Timing */}
                        <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            Interview Schedule
                          </p>

                          <div>
                            <p className="text-xs text-slate-500 mb-0.5">Scheduled Date & Time</p>
                            <p className="text-sm font-bold text-slate-900">
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
                              <p className="text-xs text-slate-700 font-bold">
                                {new Date(interview.conductedDate).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                          )}

                          <button
                            onClick={() => handleRescheduleClick(interview)}
                            className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-800 bg-white hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 font-bold transition shadow-2xs cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                            Reschedule
                          </button>
                        </div>

                        {/* 2. Rounds Progression */}
                        <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            Rounds Pipeline
                          </p>

                          {roundsList.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">No specific rounds recorded yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {roundsList.map((r, rIdx) => {
                                const isRoundCleared = r.result === "Cleared" || r.result === "Passed";
                                const isRoundFailed = r.result === "Not Cleared" || r.result === "Failed";
                                return (
                                  <div
                                    key={r._id || rIdx}
                                    className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs"
                                  >
                                    <div className="space-y-0.5">
                                      <p className="font-bold text-slate-800">{r.roundName || `Round ${rIdx + 1}`}</p>
                                      <p className="text-[11px] text-slate-500 flex items-center gap-2">
                                        <span>{r.mode || "Offline"}</span>
                                        {r.interviewer && <span>• By {r.interviewer}</span>}
                                      </p>
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 ${
                                        isRoundCleared
                                          ? "bg-emerald-100 text-emerald-800"
                                          : isRoundFailed
                                          ? "bg-rose-100 text-rose-800"
                                          : r.status === "Conducted"
                                          ? "bg-sky-100 text-sky-800"
                                          : "bg-amber-100 text-amber-800"
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

                        {/* 3. Remarks & Notes */}
                        <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-slate-500" />
                            Evaluation Feedback
                          </p>

                          <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs text-slate-700 min-h-[70px] leading-relaxed">
                            {interview.statusRemark || lastRound?.feedback ? (
                              <p className="font-medium text-slate-800">
                                {interview.statusRemark || lastRound?.feedback}
                              </p>
                            ) : (
                              <p className="text-slate-400 italic">
                                No specific remarks or notes recorded for this interview yet.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Reschedule History Timeline (if any) */}
                      {interview.rescheduleHistory && interview.rescheduleHistory.length > 0 && (
                        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
                          <h5 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Reschedule Audit Log ({interview.rescheduleHistory.length})
                          </h5>
                          <div className="space-y-2 divide-y divide-amber-200/60 pt-1">
                            {interview.rescheduleHistory.map((item, rIdx) => (
                              <div
                                key={rIdx}
                                className="pt-2 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                              >
                                <div>
                                  <span>
                                    Original:{" "}
                                    <strong className="line-through text-amber-700">
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

                    {/* Card Action Bar (Footer) */}
                    <div className="bg-slate-50 px-5 sm:px-6 py-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>
                          Interview #{index + 1} • {lastRound ? lastRound.roundName : "Round 1"} (
                          <strong className="text-slate-800">{interview.status}</strong>)
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                        {isFailed ? (
                          <span className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5">
                            <XCircle className="w-4 h-4" /> Process Ended — Candidate did not clear{" "}
                            {lastRound?.roundName || "Interview"}
                          </span>
                        ) : (
                          <>
                            {/* 1. Mark Conducted (If not conducted yet) */}
                            {!isConducted && (
                              <button
                                onClick={() => handleMarkConductedClick(interview)}
                                className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Mark Conducted
                              </button>
                            )}

                            {/* 2. Record Result / Status Change */}
                            <button
                              onClick={() => handleUpdateClick(interview)}
                              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <Award className="w-3.5 h-3.5" />
                              {isSelected ? "Update Status" : "Record Result / Selection"}
                            </button>

                            {/* 3. Add Next Round (For multi-round interviews) */}
                            {!isSelected && (
                              <button
                                onClick={() => handleAddNextRoundClick(interview)}
                                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add Round
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
      </div>

      {/* ─── DRAWER 1: MARK INTERVIEW CONDUCTED ─────────────────────── */}
      <OrangeButton
        isOpen={isConductedModalOpen}
        onClose={() => setIsConductedModalOpen(false)}
        panelTitle="Mark Interview Conducted"
        panelSubtitle="Record actual interview completion details, interviewer notes, and timing"
        maxWidth="sm:max-w-lg lg:max-w-xl"
        showFooter={false}
        drawerContent={
          <div className="space-y-4 pt-2">
            <div className="p-3.5 bg-orange-50 border border-orange-200/80 rounded-xl text-xs text-orange-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-orange-600" />
                Marking Conducted for {selectedInterview?.company?.companyName || "Company"}
              </p>
              <p className="text-[11px] text-orange-700">
                Marking this interview as conducted confirms that the candidate attended the session and enables result recording.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Conducted Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={conductedDate}
                onChange={(e) => setConductedDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-400 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Conducted Time</label>
              <input
                type="text"
                placeholder="e.g. 10:30 AM"
                value={conductedTime}
                onChange={(e) => setConductedTime(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-400 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Interviewer Name / Panel</label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma (Senior Tech Lead)"
                value={interviewer}
                onChange={(e) => setInterviewer(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-400 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Interviewer Remarks & Notes</label>
              <textarea
                rows={4}
                placeholder="Candidate feedback, questions covered, technical readiness notes..."
                value={conductedRemarks}
                onChange={(e) => setConductedRemarks(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-400 outline-none transition resize-none"
              />
            </div>

            {/* Responsive Shutter Bottom Action Bar */}
            <div className="pt-4 mt-6 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setIsConductedModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOpenConductedConfirm}
                disabled={isMarkingConducted}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-center"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirm Conducted</span>
              </button>
            </div>
          </div>
        }
      />

      {/* ─── DRAWER 2: RECORD RESULT / SELECTION (STATUS CHANGE) ────── */}
      <OrangeButton
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        panelTitle="Record Interview Result & Selection"
        panelSubtitle="Update interview decision, mark student selected or placed, and log remarks"
        maxWidth="sm:max-w-lg lg:max-w-xl"
        showFooter={false}
        drawerContent={
          <div className="space-y-4 pt-2">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
              <p className="font-bold text-slate-900">
                Candidate: <span className="text-orange-600">{studentName}</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Company: <strong>{selectedInterview?.company?.companyName || "Company"}</strong> • Role:{" "}
                {selectedInterview?.jobProfile || "Job Role"}
              </p>
            </div>

            {/* Status Selection Cards */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Select Result / Placement Decision <span className="text-rose-500">*</span>
              </label>

              <div className="space-y-2">
                {[
                  {
                    id: "Selected",
                    title: "Selected by Company",
                    desc: "Candidate passed all interview rounds and received selection",
                    badge: "Selected",
                    color: "border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50",
                    activeColor: "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300",
                    icon: Award,
                    iconColor: "text-emerald-600",
                  },
                  {
                    id: "Placed",
                    title: "Offer Accepted & Placed",
                    desc: "Student accepted offer with salary package (Marks student as Placed)",
                    badge: "Final Placement",
                    color: "border-purple-300 bg-purple-50/50 hover:bg-purple-50",
                    activeColor: "border-purple-500 bg-purple-50 ring-2 ring-purple-300",
                    icon: Sparkles,
                    iconColor: "text-purple-600",
                  },
                  {
                    id: "Cleared",
                    title: "Cleared Round (Next Round Needed)",
                    desc: "Candidate passed this round and moves to the next evaluation round",
                    badge: "Round Cleared",
                    color: "border-blue-300 bg-blue-50/50 hover:bg-blue-50",
                    activeColor: "border-blue-500 bg-blue-50 ring-2 ring-blue-300",
                    icon: CheckCircle2,
                    iconColor: "text-blue-600",
                  },
                  {
                    id: "Not Selected",
                    title: "Not Selected / Rejected",
                    desc: "Candidate did not clear this round or final selection",
                    badge: "Rejected",
                    color: "border-rose-300 bg-rose-50/50 hover:bg-rose-50",
                    activeColor: "border-rose-500 bg-rose-50 ring-2 ring-rose-300",
                    icon: XCircle,
                    iconColor: "text-rose-600",
                  },
                  {
                    id: "OnHold",
                    title: "Decision On Hold",
                    desc: "Interview result is awaiting further company or panel feedback",
                    badge: "On Hold",
                    color: "border-amber-300 bg-amber-50/50 hover:bg-amber-50",
                    activeColor: "border-amber-500 bg-amber-50 ring-2 ring-amber-300",
                    icon: HelpCircle,
                    iconColor: "text-amber-600",
                  },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isChecked = resultStatus === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setResultStatus(opt.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isChecked ? opt.activeColor : opt.color
                      }`}
                    >
                      <div className="pt-0.5">
                        <Icon className={`w-4 h-4 ${opt.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-900">{opt.title}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200">
                            {opt.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Placed Extra Details (Package and Joining Date) */}
            {resultStatus === "Placed" && (
              <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl space-y-3">
                <p className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                  Placement Package Details
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Annual Package (CTC in ₹ LPA) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 6.5"
                    value={salaryPackage}
                    onChange={(e) => setSalaryPackage(e.target.value)}
                    className="w-full border border-purple-200 bg-white rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-purple-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expected Joining Date</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full border border-purple-200 bg-white rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-purple-400 outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status Remark & Feedback</label>
              <textarea
                rows={3}
                placeholder="Provide feedback on candidate evaluation, offer details, or rejection reason..."
                value={resultRemark}
                onChange={(e) => setResultRemark(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-400 outline-none transition resize-none"
              />
            </div>

            {/* Responsive Shutter Bottom Action Bar */}
            <div className="pt-4 mt-6 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOpenResultConfirm}
                disabled={isUpdatingResult}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-center"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Result Decision</span>
              </button>
            </div>
          </div>
        }
      />

      {/* ─── DRAWER 3: ADD NEXT ROUND ───────────────────────────────── */}
      <OrangeButton
        isOpen={isAddNextRoundModalOpen}
        onClose={() => setIsAddNextRoundModalOpen(false)}
        panelTitle="Schedule Next Interview Round"
        panelSubtitle={`Add subsequent interview round for ${nextRoundData.companyName || "candidate"}`}
        maxWidth="sm:max-w-lg lg:max-w-xl"
        showFooter={false}
        drawerContent={
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Round Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={roundName}
                onChange={(e) => setRoundName(e.target.value)}
                placeholder="e.g. Round 2: Technical Interview"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-400 outline-none"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["Round 2: Technical", "Round 3: Managerial", "HR Round", "Machine Coding Test"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRoundName(preset)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-orange-50 hover:text-orange-700 text-slate-600 border border-slate-200 transition cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={nextRoundDate}
                  onChange={(e) => setNextRoundDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Time</label>
                <input
                  type="time"
                  value={nextRoundTime}
                  onChange={(e) => setNextRoundTime(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Interview Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "Online", label: "Online", icon: Video },
                  { id: "Offline", label: "In-Person", icon: Building },
                  { id: "Telephonic", label: "Telephonic", icon: Phone },
                ].map((mode) => {
                  const ModeIcon = mode.icon;
                  const isSelectedMode = nextRoundMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setNextRoundMode(mode.id)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                        isSelectedMode
                          ? "border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-400"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <ModeIcon className="w-4 h-4" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Interviewer Name</label>
              <input
                type="text"
                placeholder="e.g. John Doe (Tech Architect)"
                value={nextRoundInterviewer}
                onChange={(e) => setNextRoundInterviewer(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Meeting Link or Location</label>
              <input
                type="text"
                placeholder="e.g. https://meet.google.com/xyz or Conference Room 3"
                value={nextRoundLocation}
                onChange={(e) => setNextRoundLocation(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Round Instructions / Notes</label>
              <textarea
                rows={3}
                placeholder="Topics to prepare, portfolio links, coding test platform instructions..."
                value={nextRoundFeedback}
                onChange={(e) => setNextRoundFeedback(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-400 outline-none resize-none"
              />
            </div>

            {/* Responsive Shutter Bottom Action Bar */}
            <div className="pt-4 mt-6 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setIsAddNextRoundModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOpenAddRoundConfirm}
                disabled={isAddingRound}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-center"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Round</span>
              </button>
            </div>
          </div>
        }
      />

      {/* ─── DRAWER 4: RESCHEDULE INTERVIEW ─────────────────────────── */}
      <OrangeButton
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        panelTitle="Reschedule Interview"
        panelSubtitle="Pick a new date and time and log the reason for schedule revision"
        maxWidth="sm:max-w-lg lg:max-w-xl"
        showFooter={false}
        drawerContent={
          <div className="space-y-4 pt-2">
            <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                Rescheduling {selectedInterview?.company?.companyName || "Interview"}
              </p>
              <p className="text-[11px] text-amber-800">
                Current Date:{" "}
                <strong>
                  {selectedInterview?.scheduleDate
                    ? new Date(selectedInterview.scheduleDate).toLocaleDateString()
                    : "Not set"}
                </strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={newInterviewDate}
                  onChange={(e) => setNewInterviewDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Time</label>
                <input
                  type="time"
                  value={newInterviewTime}
                  onChange={(e) => setNewInterviewTime(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Rescheduling</label>
              <textarea
                rows={3}
                placeholder="Candidate illness, company panel requested alternate slot, university exam clash..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-400 outline-none resize-none"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  "Candidate semester exam clash",
                  "Company panel rescheduled slot",
                  "Candidate personal emergency",
                  "Technical connectivity issue",
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRescheduleReason(reason)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-orange-50 hover:text-orange-700 text-slate-600 border border-slate-200 transition cursor-pointer"
                  >
                    + {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* Responsive Shutter Bottom Action Bar */}
            <div className="pt-4 mt-6 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setIsRescheduleModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOpenRescheduleConfirm}
                disabled={isRescheduling}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-center"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Confirm Reschedule</span>
              </button>
            </div>
          </div>
        }
      />

      {/* ─── CENTER CONFIRMATION MODAL POPUP ────────────────────────── */}
      <CenterConfirmModal
        isOpen={confirmModalConfig.isOpen}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalConfig.onConfirm}
        isLoading={isUpdatingResult || isMarkingConducted || isAddingRound || isRescheduling}
        title={confirmModalConfig.title}
        subtitle={confirmModalConfig.subtitle}
        icon={confirmModalConfig.icon}
        iconColor={confirmModalConfig.iconColor}
        confirmText={confirmModalConfig.confirmText}
        confirmBtnStyle={confirmModalConfig.confirmBtnStyle}
        details={confirmModalConfig.details}
      />
    </div>
  );
};

export default InterviewHistory;