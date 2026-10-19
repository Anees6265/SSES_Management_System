/* eslint-disable react/prop-types */
import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  useGetNewReadyStudentsQuery,
  useGetNewSelectedStudentsQuery,
  useGetNewPlacedStudentsQuery,
} from "../../../redux/api/authApi";
import Loader from "../../shared/loader/Loader";
import Pagination from "../../shared/pagination/Pagination";
import Header from "../../shared/sidebar/Header";
import Avatar from "../../shared/Avatar";
import EmptyState from "../../shared/empty-state/EmptyState";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";
import ScheduleInterviewModal from "./ScheduleInterviewModal";
import ConfirmPlacementModal from "./ConfirmPlacementModal";
import CreatePostModal from "./CreatePostModal";
import {
  MdCheckCircle,
  MdWork,
  MdVerifiedUser,
  MdTrendingUp,
  MdSearch,
  MdCalendarToday,
  MdOpenInNew,
  MdClose,
  MdPhone,
  MdEmail,
  MdPerson,
  MdHistory,
  MdAssignment,
  MdBusiness,
  MdAdd,
  MdVisibility,
} from "react-icons/md";
import { FaUserGraduate } from "react-icons/fa";

const toTitle = (str) =>
  str
    ? str
        .toLowerCase()
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "";

const PIPELINE_TABS = [
  { id: "All", label: "All Candidates", icon: FaUserGraduate },
  { id: "Ready", label: "Ready Pool", icon: MdCheckCircle },
  { id: "Interview", label: "In Interviews", icon: MdWork },
  { id: "Selected", label: "Selected (Offers)", icon: MdVerifiedUser },
  { id: "Placed", label: "Confirmed Placed", icon: MdTrendingUp },
];

/* ─── Candidate Quick View Drawer ─────────────────────────── */
const CandidateQuickViewDrawer = ({ candidate, onClose, onScheduleInterview, onConfirmPlacement, onPostBanner }) => {
  const navigate = useNavigate();
  if (!candidate) return null;

  const sId = candidate.studentId?._id || candidate._id;
  const resumeURL =
    candidate.resumeURL ||
    candidate.studentId?.documents?.find((d) =>
      (d.title || "").toLowerCase().includes("resume") || d.fileType === "pdf"
    )?.fileURL;

  const interviews = candidate.PlacementinterviewRecord || candidate.interviewRecord || [];
  const placed = candidate.placedInfo;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
              <MdPerson size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-tight">Candidate Profile</h3>
              <p className="text-[11px] text-slate-400 font-mono">ID: {candidate.prkey || "PR-KEY"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            <MdClose size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          
          {/* Identity Card */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3.5">
            <Avatar firstName={candidate.firstName} lastName={candidate.lastName} imageUrl={candidate.image} size="lg" />
            <div className="min-w-0 flex-1">
              <h4 className="text-base font-extrabold text-slate-900 truncate">
                {toTitle(`${candidate.firstName || ""} ${candidate.lastName || ""}`)}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">{candidate.course || "Technical Course"}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {candidate.studentMobile && (
                  <a
                    href={`tel:${candidate.studentMobile}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg hover:border-orange-400 transition"
                  >
                    <MdPhone size={12} className="text-orange-500" /> +91 {candidate.studentMobile}
                  </a>
                )}
                {candidate.email && (
                  <a
                    href={`mailto:${candidate.email}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg hover:border-orange-400 transition"
                  >
                    <MdEmail size={12} className="text-orange-500" /> {candidate.email}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Academic & Stage Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Technology / Track</span>
              <p className="font-extrabold text-slate-800 text-xs truncate">
                {candidate.technology || candidate.track || candidate.course || "General"}
              </p>
            </div>
            <div className="p-3 bg-white border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Stage</span>
              <p className="font-extrabold text-slate-800 text-xs truncate">
                {candidate.currentSubLevel || candidate.currentLevel || "Stage 2A"}
              </p>
            </div>
          </div>

          {/* Resume Section */}
          <div className="p-3.5 bg-orange-50/50 border border-orange-100 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                <MdAssignment size={18} />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-xs">Candidate Resume</p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {resumeURL ? "Resume uploaded & verified" : "No resume uploaded yet"}
                </p>
              </div>
            </div>
            {resumeURL ? (
              <a
                href={resumeURL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 font-extrabold text-xs rounded-xl shadow-2xs transition flex items-center gap-1 shrink-0"
              >
                <MdOpenInNew size={13} /> View
              </a>
            ) : (
              <span className="text-[10px] text-slate-400 italic">Not Uploaded</span>
            )}
          </div>

          {/* Placed Information (If Placed) */}
          {placed && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5">
              <div className="flex items-center gap-2">
                <MdCheckCircle className="text-emerald-600" size={18} />
                <h4 className="font-extrabold text-emerald-950 text-xs">Confirmed Placement Details</h4>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-emerald-700 font-medium">Company</span>
                  <p className="font-bold text-slate-900">{placed.companyName || "—"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 font-medium">Package (CTC)</span>
                  <p className="font-black text-emerald-700">
                    {placed.salary ? `₹${(placed.salary / 100000).toFixed(1)} LPA` : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 font-medium">Job Profile</span>
                  <p className="font-semibold text-slate-800">{placed.jobProfile || "—"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 font-medium">Job Type</span>
                  <p className="font-semibold text-slate-800">{placed.jobType || "Full-Time"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Interview History Timeline */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <MdHistory size={16} className="text-orange-500" />
              Interview Records ({interviews.length})
            </h4>

            {interviews.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-medium">
                No interview drives scheduled yet for this candidate.
              </div>
            ) : (
              <div className="space-y-2">
                {interviews.map((record, index) => {
                  const statusColors = {
                    Scheduled: "bg-blue-50 text-blue-700 border-blue-200",
                    Ongoing: "bg-amber-50 text-amber-700 border-amber-200",
                    Selected: "bg-purple-50 text-purple-700 border-purple-200",
                    Rejected: "bg-rose-50 text-rose-700 border-rose-200",
                    Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  }[record.status] || "bg-slate-100 text-slate-700 border-slate-200";

                  return (
                    <div
                      key={index}
                      className="p-3 bg-white border border-slate-200/80 rounded-xl space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1">
                          <MdBusiness className="text-slate-400" /> {record.companyName || "Company Drive"}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors}`}>
                          {record.status || "Scheduled"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Role: {record.jobProfile || "Standard Profile"}</span>
                        <span>
                          {record.scheduleDate ? new Date(record.scheduleDate).toLocaleDateString() : "—"}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          onClose();
                          navigate(`/interview-history/${sId}`);
                        }}
                        className="w-full py-1 px-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-extrabold text-[11px] rounded-lg transition border border-orange-200/80 flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                      >
                        <MdHistory size={13} /> Update Status & Rounds
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Drawer Action Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-white flex items-center gap-2 justify-end">
          <button
            onClick={() => {
              onClose();
              navigate(`/student-profile/${sId}`);
            }}
            className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Full Profile
          </button>

          {interviews.length > 0 && (
            <button
              onClick={() => {
                onClose();
                navigate(`/interview-history/${sId}`);
              }}
              className="px-3.5 py-2 border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 font-extrabold text-xs rounded-xl shadow-2xs transition cursor-pointer flex items-center gap-1"
            >
              <MdHistory size={15} /> Rounds & Selection
            </button>
          )}

          {!placed && (
            <button
              onClick={() => {
                onClose();
                onScheduleInterview(candidate);
              }}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <MdCalendarToday size={14} /> Schedule Drive
            </button>
          )}

          {candidate.readinessStatus === "Selected" && !placed && (
            <button
              onClick={() => {
                onClose();
                onConfirmPlacement(candidate);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Confirm Placement
            </button>
          )}

          {placed && (
            <button
              onClick={() => {
                onClose();
                onPostBanner(candidate);
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <MdAdd size={15} /> Post Banner
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

/* ─── Metric Card Component ───────────────────────────────── */
const PipelineStatCard = ({ title, count, subtitle, icon: Icon, isActive, onClick, color = "orange" }) => {
  const colorStyles = {
    orange: "text-orange-500 bg-orange-50 border-orange-100",
    blue: "text-blue-500 bg-blue-50 border-blue-100",
    amber: "text-amber-500 bg-amber-50 border-amber-100",
    purple: "text-purple-500 bg-purple-50 border-purple-100",
    emerald: "text-emerald-500 bg-emerald-50 border-emerald-100",
  }[color];

  return (
    <div
      onClick={onClick}
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left flex flex-col justify-between shadow-2xs relative overflow-hidden group ${
        isActive
          ? "bg-white border-orange-500 ring-2 ring-orange-500/10 shadow-sm"
          : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
      }`}
    >
      {isActive && (
        <span className="absolute top-0 left-0 right-0 h-1 bg-orange-500" />
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
          {title}
        </span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${colorStyles}`}>
          <Icon size={17} />
        </div>
      </div>
      <div className="mt-2.5">
        <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{count}</p>
        <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">{subtitle}</p>
      </div>
    </div>
  );
};

/* ─── Main Placement Candidates Page ──────────────────────── */
const PlacementReadyStudents = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const statusParam = searchParams.get("status");

  // Tab State
  const [activeTab, setActiveTab] = useState("All");
  const [readySubFilter, setReadySubFilter] = useState("All"); // All | Stage2A | Stage2B
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTech, setSelectedTech] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Selected candidate state for modals / quick view
  const [quickViewCandidate, setQuickViewCandidate] = useState(null);
  const [selectedStudentForInterview, setSelectedStudentForInterview] = useState(null);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [selectedForPlacement, setSelectedForPlacement] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedForPost, setSelectedForPost] = useState(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  // Queries
  const { data: readyRes = {}, isLoading: loadingReady, refetch: refetchReady } = useGetNewReadyStudentsQuery();
  const { data: selectedRes = {}, isLoading: loadingSelected, refetch: refetchSelected } = useGetNewSelectedStudentsQuery();
  const { data: placedRes = {}, isLoading: loadingPlaced, refetch: refetchPlaced } = useGetNewPlacedStudentsQuery();

  const readyStudents = useMemo(() => readyRes.data || [], [readyRes]);
  const selectedStudents = useMemo(() => selectedRes.data || [], [selectedRes]);
  const placedStudents = useMemo(() => placedRes.data || [], [placedRes]);

  const isLoading = loadingReady || loadingSelected || loadingPlaced;

  const refetchAll = () => {
    refetchReady();
    refetchSelected();
    refetchPlaced();
  };

  // Sync tab with URL search parameter (e.g. from Dashboard click)
  useEffect(() => {
    if (statusParam) {
      if (statusParam === "Ready for Placement" || statusParam === "Ready") {
        setActiveTab("Ready");
        setReadySubFilter("Stage2A");
      } else if (statusParam === "Ready for Drive" || statusParam === "Ready for Interview") {
        setActiveTab("Ready");
        setReadySubFilter("Stage2B");
      } else if (statusParam === "Interview" || statusParam === "Ongoing Interview") {
        setActiveTab("Interview");
      } else if (statusParam === "Selected") {
        setActiveTab("Selected");
      } else if (statusParam === "Placed") {
        setActiveTab("Placed");
      }
    }
  }, [statusParam]);

  // Reset page when tab/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, readySubFilter, selectedTech, searchTerm]);

  // Check if candidate is currently in an active interview round
  const hasActiveInterview = (s) =>
    s.PlacementinterviewRecord?.some((r) =>
      ["Scheduled", "Ongoing", "Rescheduled"].includes(r.status)
    );

  // Categorize Pools
  const readyPool = useMemo(() => {
    return readyStudents.filter((s) => !hasActiveInterview(s));
  }, [readyStudents]);

  const interviewPool = useMemo(() => {
    return readyStudents.filter((s) => hasActiveInterview(s));
  }, [readyStudents]);

  const selectedPool = useMemo(() => selectedStudents, [selectedStudents]);
  const placedPool = useMemo(() => placedStudents, [placedStudents]);

  // Unified Pool of all candidates across categories
  const allPool = useMemo(() => {
    const map = new Map();
    [...readyStudents, ...selectedStudents, ...placedStudents].forEach((s) => {
      const id = s.studentId?._id || s.studentId || s._id;
      if (id && !map.has(id.toString())) {
        map.set(id.toString(), s);
      }
    });
    return Array.from(map.values());
  }, [readyStudents, selectedStudents, placedStudents]);

  // Counts for tabs & stat cards
  const poolCounts = {
    All: allPool.length,
    Ready: readyPool.length,
    Interview: interviewPool.length,
    Selected: selectedPool.length,
    Placed: placedPool.length,
  };

  // Dynamic Technology options
  const availableTechnologies = useMemo(() => {
    const set = new Set(["All"]);
    allPool.forEach((s) => {
      if (s.technology) set.add(s.technology);
      if (s.track) set.add(s.track);
    });
    return Array.from(set);
  }, [allPool]);

  // Filter active dataset based on activeTab, subFilter, tech, and search
  const filteredCandidates = useMemo(() => {
    let dataset = allPool;
    if (activeTab === "Ready") dataset = readyPool;
    else if (activeTab === "Interview") dataset = interviewPool;
    else if (activeTab === "Selected") dataset = selectedPool;
    else if (activeTab === "Placed") dataset = placedPool;

    // Sub-stage filter for Ready pool
    if (activeTab === "Ready" && readySubFilter !== "All") {
      dataset = dataset.filter((s) => {
        const status = s.readinessStatus || "";
        if (readySubFilter === "Stage2A") return status === "Ready" || status === "Ready for Placement";
        if (readySubFilter === "Stage2B") return status === "Ready for Drive" || status === "Ready for Interview";
        return true;
      });
    }

    // Technology Filter
    if (selectedTech && selectedTech !== "All") {
      dataset = dataset.filter((s) => {
        const stdTech = (s.technology || s.track || s.course || "").toLowerCase();
        return stdTech.includes(selectedTech.toLowerCase());
      });
    }

    // Search Filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      dataset = dataset.filter((s) => {
        const fullName = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
        const prkey = (s.prkey || "").toLowerCase();
        const mobile = (s.studentMobile || "").toLowerCase();
        const tech = (s.technology || s.track || "").toLowerCase();
        const company = (s.placedInfo?.companyName || "").toLowerCase();
        return (
          fullName.includes(q) ||
          prkey.includes(q) ||
          mobile.includes(q) ||
          tech.includes(q) ||
          company.includes(q)
        );
      });
    }

    return dataset;
  }, [allPool, readyPool, interviewPool, selectedPool, placedPool, activeTab, readySubFilter, selectedTech, searchTerm]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredCandidates.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredCandidates.slice(startIndex, startIndex + rowsPerPage);

  const hasActiveFilters = Boolean(searchTerm || selectedTech !== "All" || readySubFilter !== "All");

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedTech("All");
    setReadySubFilter("All");
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Loader />
      </div>
    );
  }

  return (
    <>
      <Header
        title="Placement Candidates"
        subtitle="Manage placement readiness pipeline: ready talent pool, interview tracking, and offers"
        badge={`${allPool.length} Candidates`}
        breadcrumbs={[{ label: "Placements", path: "/placements/dashboard" }, { label: "Placement Candidates" }]}
      />

      <div className="p-3 sm:p-5 lg:p-6 w-full min-h-screen bg-gray-50/40 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
        
        {/* ── 1. Top Metrics Cards (5 Cards) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <PipelineStatCard
            title="Total Candidates"
            count={poolCounts.All}
            subtitle="Complete candidate pool"
            icon={FaUserGraduate}
            color="orange"
            isActive={activeTab === "All"}
            onClick={() => setActiveTab("All")}
          />
          <PipelineStatCard
            title="Ready for Drives"
            count={poolCounts.Ready}
            subtitle="Stage 2A & 2B cleared"
            icon={MdCheckCircle}
            color="blue"
            isActive={activeTab === "Ready"}
            onClick={() => setActiveTab("Ready")}
          />
          <PipelineStatCard
            title="In Interviews"
            count={poolCounts.Interview}
            subtitle="Active company drives"
            icon={MdWork}
            color="amber"
            isActive={activeTab === "Interview"}
            onClick={() => setActiveTab("Interview")}
          />
          <PipelineStatCard
            title="Selected (Offers)"
            count={poolCounts.Selected}
            subtitle="Awaiting final confirmation"
            icon={MdVerifiedUser}
            color="purple"
            isActive={activeTab === "Selected"}
            onClick={() => setActiveTab("Selected")}
          />
          <PipelineStatCard
            title="Confirmed Placed"
            count={poolCounts.Placed}
            subtitle="Recruited students"
            icon={MdTrendingUp}
            color="emerald"
            isActive={activeTab === "Placed"}
            onClick={() => setActiveTab("Placed")}
          />
        </div>

        {/* ── 2. Pipeline Navigation & Filter Bar ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3.5">
          
          {/* Top Row: Pipeline Stage Tabs */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 overflow-x-auto -mx-1 px-1">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {PIPELINE_TABS.map((tab) => {
                const isCurrent = activeTab === tab.id;
                const Icon = tab.icon;
                const count = poolCounts[tab.id] || 0;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shrink-0 ${
                      isCurrent
                        ? "bg-orange-500 text-white shadow-xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                    }`}
                  >
                    <Icon size={15} />
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                        isCurrent ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <span className="hidden lg:block text-xs font-bold text-slate-400 shrink-0">
              Showing <strong className="text-slate-800">{filteredCandidates.length}</strong> candidates
            </span>
          </div>

          {/* Bottom Row: Search & Dropdown Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <MdSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search candidate name, PR-Key, technology, company..."
                className="w-full pl-9 pr-8 h-10 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50 hover:bg-white text-slate-800 placeholder-slate-400 transition shadow-2xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <MdClose size={16} />
                </button>
              )}
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* Ready Stage Sub-Filter (Visible only in Ready tab) */}
              {activeTab === "Ready" && (
                <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200/80">
                  <button
                    onClick={() => setReadySubFilter("All")}
                    className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                      readySubFilter === "All" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    All Ready
                  </button>
                  <button
                    onClick={() => setReadySubFilter("Stage2A")}
                    className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                      readySubFilter === "Stage2A" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Stage 2A
                  </button>
                  <button
                    onClick={() => setReadySubFilter("Stage2B")}
                    className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                      readySubFilter === "Stage2B" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Stage 2B
                  </button>
                </div>
              )}

              {/* Technology Filter */}
              <div className="w-44">
                <SelectDropdown
                  value={selectedTech}
                  onChange={(val) => setSelectedTech(val)}
                  options={availableTechnologies.map((t) => ({
                    value: t,
                    label: t === "All" ? "All Technologies" : t,
                  }))}
                  buttonClassName="h-10 w-full flex items-center justify-between gap-1.5 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs hover:border-orange-400 cursor-pointer"
                />
              </div>

              {/* Reset Filter Button */}
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="h-10 px-3 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <MdClose size={15} /> Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. Candidate Data View (Mobile Cards + Desktop Table) ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-2xs overflow-hidden">
          {paginatedData.length === 0 ? (
            <div className="p-6 sm:p-10">
              <EmptyState
                title="No Candidates Found"
                subtitle={
                  searchTerm
                    ? `No candidate matched "${searchTerm}". Try another name, PR-Key, or clear filters.`
                    : "No student records found under the current placement stage and technology filter."
                }
                actionText={hasActiveFilters ? "Reset All Filters" : undefined}
                onAction={hasActiveFilters ? resetFilters : undefined}
              />
            </div>
          ) : (
            <>
              {/* Mobile View: Cards Layout (< 768px) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {paginatedData.map((candidate) => {
                  const sId = candidate.studentId?._id || candidate._id;
                  const resumeURL =
                    candidate.resumeURL ||
                    candidate.studentId?.documents?.find((d) =>
                      (d.title || "").toLowerCase().includes("resume") || d.fileType === "pdf"
                    )?.fileURL;

                  const activeInterview =
                    candidate.PlacementinterviewRecord?.find((r) =>
                      ["Scheduled", "Ongoing", "Rescheduled"].includes(r.status)
                    ) || candidate.PlacementinterviewRecord?.[candidate.PlacementinterviewRecord.length - 1];

                  const isPlaced = Boolean(candidate.placedInfo);
                  const isSelected = candidate.readinessStatus === "Selected" && !isPlaced;

                  return (
                    <div
                      key={sId}
                      className="p-4 space-y-3 hover:bg-slate-50/60 transition cursor-pointer"
                      onClick={() => setQuickViewCandidate(candidate)}
                    >
                      {/* Top: Avatar, Name, Stage */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar firstName={candidate.firstName} lastName={candidate.lastName} imageUrl={candidate.image} size="sm" />
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-xs text-slate-900 truncate">
                              {toTitle(`${candidate.firstName || ""} ${candidate.lastName || ""}`)}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-mono">{candidate.prkey || "PR-KEY"}</p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {isPlaced ? (
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            Placed
                          </span>
                        ) : isSelected ? (
                          <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                            Selected
                          </span>
                        ) : activeInterview ? (
                          <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            Interviewing
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            Ready
                          </span>
                        )}
                      </div>

                      {/* Middle: Tech & Track Details */}
                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                        <span className="font-bold text-slate-700 truncate max-w-[170px]">
                          {candidate.technology || candidate.track || candidate.course || "General"}
                        </span>
                        <span className="text-slate-400 font-medium">
                          {candidate.currentSubLevel || candidate.currentLevel || "Stage 2A"}
                        </span>
                      </div>

                      {/* Detail Pill */}
                      {isPlaced && (
                        <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between text-[11px]">
                          <span className="font-extrabold text-slate-900">{candidate.placedInfo?.companyName || "Placed"}</span>
                          <span className="font-black text-emerald-700">
                            {candidate.placedInfo?.salary ? `₹${(candidate.placedInfo.salary / 100000).toFixed(1)} LPA` : "—"}
                          </span>
                        </div>
                      )}

                      {activeInterview && !isPlaced && (
                        <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between text-[11px]">
                          <span className="font-extrabold text-slate-900">{activeInterview.companyName || "Drive"}</span>
                          <span className="text-amber-800 font-bold">{activeInterview.status || "Scheduled"}</span>
                        </div>
                      )}

                      {/* Actions Bottom Bar */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                        {resumeURL && (
                          <a
                            href={resumeURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-[11px] flex items-center gap-1 shadow-2xs"
                          >
                            <MdOpenInNew size={12} /> Resume
                          </a>
                        )}

                        <button
                          onClick={() => setQuickViewCandidate(candidate)}
                          className="flex-1 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] text-center shadow-2xs cursor-pointer"
                        >
                          View Details
                        </button>

                        {hasActiveInterview(candidate) && !isPlaced && !isSelected && (
                          <button
                            onClick={() => navigate(`/interview-history/${candidate._id}`)}
                            className="px-2.5 py-1.5 rounded-xl border border-orange-200 bg-orange-50 text-orange-700 font-extrabold text-[11px] shadow-2xs cursor-pointer flex items-center justify-center gap-1"
                          >
                            <MdHistory size={13} /> Result
                          </button>
                        )}

                        {!isPlaced && !isSelected && (
                          <button
                            onClick={() => {
                              setSelectedStudentForInterview(candidate);
                              setIsInterviewModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-[11px] shadow-xs cursor-pointer"
                          >
                            Schedule Drive
                          </button>
                        )}

                        {isSelected && (
                          <button
                            onClick={() => {
                              setSelectedForPlacement(candidate);
                              setIsConfirmModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-xs cursor-pointer"
                          >
                            Confirm
                          </button>
                        )}

                        {isPlaced && (
                          <button
                            onClick={() => {
                              setSelectedForPost(candidate);
                              setIsPostModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] shadow-xs cursor-pointer flex items-center gap-1"
                          >
                            <MdAdd size={14} /> Banner
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View: Full Data Table (>= 768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="py-4 px-5">CANDIDATE PROFILE</th>
                      <th className="py-4 px-4">TRACK / TECHNOLOGY</th>
                      <th className="py-4 px-4 text-center">STAGE</th>
                      <th className="py-4 px-5">PLACEMENT PIPELINE STATUS</th>
                      <th className="py-4 px-4 text-center">RESUME</th>
                      <th className="py-4 px-5 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {paginatedData.map((candidate) => {
                      const sId = candidate.studentId?._id || candidate._id;
                      const resumeURL =
                        candidate.resumeURL ||
                        candidate.studentId?.documents?.find((d) =>
                          (d.title || "").toLowerCase().includes("resume") || d.fileType === "pdf"
                        )?.fileURL;

                      const isPlaced = Boolean(candidate.placedInfo);
                      const isSelected = candidate.readinessStatus === "Selected" && !isPlaced;
                      const activeInterview =
                        candidate.PlacementinterviewRecord?.find((r) =>
                          ["Scheduled", "Ongoing", "Rescheduled"].includes(r.status)
                        ) || candidate.PlacementinterviewRecord?.[candidate.PlacementinterviewRecord.length - 1];

                      return (
                        <tr
                          key={sId}
                          onClick={() => setQuickViewCandidate(candidate)}
                          className="hover:bg-slate-50/70 transition cursor-pointer group"
                        >
                          {/* Profile */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <Avatar firstName={candidate.firstName} lastName={candidate.lastName} imageUrl={candidate.image} size="sm" />
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-900 group-hover:text-orange-600 transition truncate max-w-[190px]">
                                  {toTitle(`${candidate.firstName || ""} ${candidate.lastName || ""}`)}
                                </p>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                  <span className="font-mono">{candidate.prkey || "PR-KEY"}</span>
                                  {candidate.studentMobile && (
                                    <>
                                      <span>•</span>
                                      <span>+91 {candidate.studentMobile}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Technology */}
                          <td className="py-4 px-4">
                            <span className="inline-block text-xs font-bold text-slate-700 bg-slate-100/80 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                              {candidate.technology || candidate.track || candidate.course || "General"}
                            </span>
                          </td>

                          {/* Stage */}
                          <td className="py-4 px-4 text-center">
                            <span className="inline-block text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-md">
                              {candidate.currentSubLevel || candidate.currentLevel || "Stage 2A"}
                            </span>
                          </td>

                          {/* Placement Status */}
                          <td className="py-4 px-5">
                            {isPlaced ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="font-extrabold text-slate-900">
                                    {toTitle(candidate.placedInfo?.companyName || "Placed")}
                                  </span>
                                </div>
                                <p className="text-[11px] font-black text-emerald-700 pl-3.5">
                                  {candidate.placedInfo?.salary ? `₹${(candidate.placedInfo.salary / 100000).toFixed(1)} LPA` : "Placed"}
                                </p>
                              </div>
                            ) : isSelected ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                                  <span className="font-bold text-purple-800">Offer Received</span>
                                </div>
                                <p className="text-[11px] text-slate-500 pl-3.5">
                                  {candidate.selectedInterviews?.[0]?.companyRef?.companyName || "Selected"}
                                </p>
                              </div>
                            ) : activeInterview ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                                  <span className="font-bold text-amber-900">
                                    {activeInterview.companyName || "Interviewing"}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 pl-3.5">
                                  {activeInterview.status || "Scheduled"} • {activeInterview.jobProfile || "Drive"}
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md text-[11px]">
                                  Ready for Drives
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Resume */}
                          <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            {resumeURL ? (
                              <a
                                href={resumeURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:border-orange-400 hover:text-orange-600 rounded-lg shadow-2xs transition"
                              >
                                <MdOpenInNew size={13} className="text-orange-500" /> View
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No Resume</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              {/* Direct action to record interview rounds/selection */}
                              {hasActiveInterview(candidate) && !isPlaced && !isSelected && (
                                <button
                                  onClick={() => navigate(`/interview-history/${candidate._id}`)}
                                  className="px-3 py-1.5 bg-white hover:bg-orange-50 border border-orange-200 text-orange-700 font-extrabold text-xs rounded-xl shadow-2xs transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                                  title="Update Interview Rounds & Selection Result"
                                >
                                  <MdHistory size={14} className="text-orange-500" />
                                  <span>Update Result</span>
                                </button>
                              )}

                              {!isPlaced && !isSelected && (
                                <button
                                  onClick={() => {
                                    setSelectedStudentForInterview(candidate);
                                    setIsInterviewModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                                  title="Schedule Drive for this candidate"
                                >
                                  <MdCalendarToday size={13} />
                                  <span>Schedule Drive</span>
                                </button>
                              )}

                              {isSelected && (
                                <button
                                  onClick={() => {
                                    setSelectedForPlacement(candidate);
                                    setIsConfirmModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer active:scale-95"
                                >
                                  Confirm Placement
                                </button>
                              )}

                              {isPlaced && (
                                <button
                                  onClick={() => {
                                    setSelectedForPost(candidate);
                                    setIsPostModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1 active:scale-95"
                                >
                                  <MdAdd size={14} /> Banner
                                </button>
                              )}

                              {/* More Menu */}
                              <button
                                onClick={() => setQuickViewCandidate(candidate)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                title="Quick Overview"
                              >
                                <MdVisibility size={17} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Footer */}
              <div className="border-t border-gray-200 px-3 sm:px-6 py-3 sm:py-4 bg-gray-100 rounded-b-2xl sm:rounded-b-3xl">
                <Pagination
                  totalItems={filteredCandidates.length}
                  currentPage={currentPage}
                  pageSize={rowsPerPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  label="candidates"
                />
              </div>
            </>
          )}
        </div>

      </div>

      {/* ── Candidate Quick View Drawer ── */}
      {quickViewCandidate && (
        <CandidateQuickViewDrawer
          candidate={quickViewCandidate}
          onClose={() => setQuickViewCandidate(null)}
          onScheduleInterview={(c) => {
            setSelectedStudentForInterview(c);
            setIsInterviewModalOpen(true);
          }}
          onConfirmPlacement={(c) => {
            setSelectedForPlacement(c);
            setIsConfirmModalOpen(true);
          }}
          onPostBanner={(c) => {
            setSelectedForPost(c);
            setIsPostModalOpen(true);
          }}
        />
      )}

      {/* ── Schedule Interview Modal ── */}
      <ScheduleInterviewModal
        isOpen={isInterviewModalOpen}
        onClose={() => {
          setIsInterviewModalOpen(false);
          setSelectedStudentForInterview(null);
        }}
        studentId={selectedStudentForInterview?.studentId?._id || selectedStudentForInterview?.studentId || selectedStudentForInterview?._id}
        onSuccess={refetchAll}
      />

      {/* ── Confirm Placement Modal ── */}
      <ConfirmPlacementModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setSelectedForPlacement(null);
        }}
        student={selectedForPlacement}
        onSuccess={refetchAll}
      />

      {/* ── Create Post Modal ── */}
      <CreatePostModal
        isOpen={isPostModalOpen}
        onClose={() => {
          setIsPostModalOpen(false);
          setSelectedForPost(null);
        }}
        student={selectedForPost}
        onSuccess={refetchAll}
      />
    </>
  );
};

export default PlacementReadyStudents;
