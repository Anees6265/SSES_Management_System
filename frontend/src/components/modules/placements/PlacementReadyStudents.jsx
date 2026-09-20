import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  useGetNewReadyStudentsQuery,
  useGetNewSelectedStudentsQuery,
  useGetNewPlacedStudentsQuery,
} from "../../../redux/api/authApi";
import Loader from "../../shared/loader/Loader";
import CommonTable from "../../shared/table/CommonTable";
import Header from "../../shared/sidebar/Header";
import TabsCommon from "../../shared/table/TabsCommon";
import Avatar from "../../shared/Avatar";
import StatsCard from "./dashboard/StatsCard";
import ScheduleInterviewModal from "./ScheduleInterviewModal";
import ConfirmPlacementModal from "./ConfirmPlacementModal";
import CreatePostModal from "./CreatePostModal";
import { 
  MdCheckCircle, MdWork, MdVerifiedUser, MdTrendingUp, MdSearch, 
  MdCalendarToday, MdAdd, MdFilterList, MdCheckCircleOutline, 
  MdFileDownload, MdOpenInNew, MdClose, MdPhone 
} from "react-icons/md";

const toTitle = (str) =>
  str?.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "";

const TABS = ["Ready for Placement", "Ready for Drive", "Interview", "Selected", "Placed"];

const DEFAULT_TECHNOLOGIES = ["All", "Python", "MERN Stack", "Java", ".NET", "UI/UX", "Data Analytics", "Salesforce", "SAP"];

const PlacementReadyStudents = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const statusParam = searchParams.get("status");

  const [activeTab, setActiveTab]       = useState("Ready for Placement");
  const [searchTerm, setSearchTerm]     = useState("");
  const [selectedTech, setSelectedTech] = useState("All");
  const [mobilePage, setMobilePage]     = useState(1);

  const [selectedStudent, setSelectedStudent]           = useState(null);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen]     = useState(false);
  const [isPostModalOpen, setIsPostModalOpen]           = useState(false);
  const [selectedForPlacement, setSelectedForPlacement] = useState(null);
  const [selectedForPost, setSelectedForPost]           = useState(null);

  // Reset mobile page on filter change
  useEffect(() => {
    setMobilePage(1);
  }, [activeTab, selectedTech, searchTerm]);

  // Sync tab with URL status parameter if passed from dashboard click
  useEffect(() => {
    if (statusParam) {
      if (statusParam === "Ready for Placement" || statusParam === "Ready") {
        setActiveTab("Ready for Placement");
      } else if (statusParam === "Ready for Drive" || statusParam === "Ready for Interview") {
        setActiveTab("Ready for Drive");
      } else if (statusParam === "Interview" || statusParam === "Interviews Running") {
        setActiveTab("Interview");
      } else if (statusParam === "Selected") {
        setActiveTab("Selected");
      } else if (statusParam === "Placed" || statusParam === "Placed Students") {
        setActiveTab("Placed");
      }
    }
  }, [statusParam]);

  const { data: readyRes    = {}, isLoading: loadingReady,    refetch: refetchReady    } = useGetNewReadyStudentsQuery();
  const { data: selectedRes = {}, isLoading: loadingSelected, refetch: refetchSelected } = useGetNewSelectedStudentsQuery();
  const { data: placedRes   = {}, isLoading: loadingPlaced,   refetch: refetchPlaced   } = useGetNewPlacedStudentsQuery();

  const readyStudents    = readyRes.data    || [];
  const selectedStudents = selectedRes.data || [];
  const placedStudents   = placedRes.data   || [];

  const isLoading = loadingReady || loadingSelected || loadingPlaced;

  // Categorize ready students into "Ready for Placement" and "Ready for Drive"
  const readyForPlacementStudents = useMemo(() =>
    readyStudents.filter((s) => {
      const status = s.readinessStatus || "Ready";
      const hasActiveInterview = s.PlacementinterviewRecord?.some((r) =>
        ["Scheduled", "Ongoing", "Rescheduled"].includes(r.status)
      );
      return (status === "Ready" || status === "Ready for Placement") && !hasActiveInterview;
    }), [readyStudents]);

  const readyForDriveStudents = useMemo(() =>
    readyStudents.filter((s) => {
      const status = s.readinessStatus || "";
      const hasActiveInterview = s.PlacementinterviewRecord?.some((r) =>
        ["Scheduled", "Ongoing", "Rescheduled"].includes(r.status)
      );
      return (status === "Ready for Drive" || status === "Ready for Interview") && !hasActiveInterview;
    }), [readyStudents]);

  const interviewStudents = useMemo(() =>
    readyStudents.filter((s) =>
      s.PlacementinterviewRecord?.some((r) =>
        ["Scheduled", "Ongoing", "Rescheduled"].includes(r.status)
      )
    ), [readyStudents]);

  const tabCounts = {
    "Ready for Placement": readyForPlacementStudents.length,
    "Ready for Drive":     readyForDriveStudents.length,
    "Interview":           interviewStudents.length,
    "Selected":            selectedStudents.length,
    "Placed":              placedStudents.length,
  };

  // Build dynamic technology list from student data
  const availableTechnologies = useMemo(() => {
    const techSet = new Set(DEFAULT_TECHNOLOGIES);
    [...readyStudents, ...selectedStudents, ...placedStudents].forEach((s) => {
      if (s.track) techSet.add(s.track);
      if (s.technology) techSet.add(s.technology);
      if (s.course) techSet.add(s.course);
    });
    return Array.from(techSet);
  }, [readyStudents, selectedStudents, placedStudents]);

  const getActiveData = () => {
    const map = {
      "Ready for Placement": readyForPlacementStudents,
      "Ready for Drive":     readyForDriveStudents,
      "Interview":           interviewStudents,
      "Selected":            selectedStudents,
      "Placed":              placedStudents,
    };
    let data = map[activeTab] || [];

    // Technology Filter
    if (selectedTech && selectedTech !== "All") {
      data = data.filter((s) => {
        const stdTech = (s.technology || s.track || s.course || "").toLowerCase();
        return stdTech.includes(selectedTech.toLowerCase());
      });
    }

    // Search Filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      data = data.filter((s) => {
        const name = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
        return (
          name.includes(q) ||
          s.prkey?.toLowerCase().includes(q) ||
          s.studentMobile?.includes(q) ||
          s.course?.toLowerCase().includes(q)
        );
      });
    }

    return data;
  };

  const baseColumns = [
    {
      key: "name",
      label: "Student Profile",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar firstName={row.firstName} lastName={row.lastName} imageUrl={row.image} />
          <div>
            <p className="font-semibold text-slate-900 hover:text-slate-700 transition cursor-pointer text-xs sm:text-sm">
              {toTitle(`${row.firstName || ""} ${row.lastName || ""}`)}
            </p>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{row.prkey || "PR-KEY"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "technology",
      label: "Technology / Track",
      render: (row) => (
        <span className="text-xs font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
          {row.technology || row.track || row.course || "General"}
        </span>
      ),
    },
    {
      key: "level",
      label: "Current Stage",
      align: "center",
      render: (row) => (
        <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
          {row.currentSubLevel || row.currentLevel || "Stage 2A"}
        </span>
      ),
    },
    { 
      key: "studentMobile", 
      label: "Contact", 
      align: "center",
      render: (row) => (
        <span className="text-xs font-medium text-slate-600">
          {row.studentMobile ? `+91 ${row.studentMobile}` : "—"}
        </span>
      )
    },
    {
      key: "readinessStatus",
      label: "Placement Status",
      render: (row) => {
        let label = row.readinessStatus || "Ready for Placement";
        if (row.placedInfo) label = "Placed";
        else if (label === "Ready") label = "Ready for Placement";
        else if (label === "Ready for Interview") label = "Ready for Drive";

        const badgeStyle = {
          "Ready for Placement": "bg-emerald-50 text-emerald-700 border-emerald-200/80",
          "Ready for Drive":     "bg-sky-50 text-sky-700 border-sky-200/80",
          "Interview":           "bg-amber-50 text-amber-700 border-amber-200/80",
          "Selected":            "bg-violet-50 text-violet-700 border-violet-200/80",
          "Placed":              "bg-teal-50 text-teal-700 border-teal-200/80",
        }[label] || "bg-slate-100 text-slate-700 border-slate-200";

        return (
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${badgeStyle}`}>
            {label}
          </span>
        );
      },
    },
    {
      key: "resume",
      label: "Resume",
      align: "center",
      render: (row) => {
        const resumeURL = row.resumeURL || row.studentId?.documents?.find(d => (d.title || "").toLowerCase().includes("resume"))?.fileURL;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (resumeURL) window.open(resumeURL, "_blank", "noopener,noreferrer");
              else toast.info("Resume not uploaded yet.");
            }}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition ${
              resumeURL 
                ? "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs" 
                : "bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed"
            }`}
          >
            <MdOpenInNew size={13} /> {resumeURL ? "View Resume" : "No Resume"}
          </button>
        );
      }
    }
  ];

  const readyForPlacementColumns = [
    ...baseColumns,
    {
      key: "action",
      label: "Actions",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedStudent(row);
            setIsInterviewModalOpen(true);
          }}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-3.5 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1.5"
        >
          <MdCalendarToday className="text-sm" /> Schedule Drive
        </button>
      ),
    },
  ];

  const readyForDriveColumns = [
    ...baseColumns,
    {
      key: "action",
      label: "Actions",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedStudent(row);
            setIsInterviewModalOpen(true);
          }}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-3.5 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1.5"
        >
          <MdCalendarToday className="text-sm" /> Schedule Drive
        </button>
      ),
    },
  ];

  const interviewColumns = [
    ...baseColumns,
    {
      key: "interviews", 
      label: "Active Drive Status",
      render: (row) => {
        const active = row.PlacementinterviewRecord?.find((r) =>
          ["Scheduled", "Ongoing", "Rescheduled"].includes(r.status)
        );
        return (
          <div>
            <p className="text-xs font-semibold text-slate-800">{active?.jobProfile || "Drive In Progress"}</p>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block ${
              active?.status === "Ongoing" ? "bg-amber-50 text-amber-700 border border-amber-200" :
              active?.status === "Rescheduled" ? "bg-violet-50 text-violet-700 border border-violet-200" :
              "bg-slate-100 text-slate-700 border border-slate-200"
            }`}>{active?.status || "Scheduled"}</span>
          </div>
        );
      },
    },
    {
      key: "action", 
      label: "Actions",
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/interview-history/${row.studentId?._id || row._id}`); }}
          className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-200 transition shadow-2xs"
        >
          View History
        </button>
      ),
    },
  ];

  const selectedColumns = [
    ...baseColumns,
    { 
      key: "company", 
      label: "Recruiting Company",
      render: (row) => {
        const sel = row.selectedInterviews?.[0];
        return (
          <span className="font-medium text-slate-800 bg-slate-50 text-xs px-2.5 py-1 rounded-lg border border-slate-200">
            {toTitle(sel?.companyRef?.companyName || "Selected Company")}
          </span>
        );
      }
    },
    {
      key: "actions", 
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); setSelectedStudent(row); setIsInterviewModalOpen(true); }}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium px-2.5 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1"
          >
            <MdAdd /> Next Round
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setSelectedForPlacement(row); setIsConfirmModalOpen(true); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-1.5 rounded-xl transition shadow-2xs"
          >
            Confirm Placement
          </button>
        </div>
      ),
    },
  ];

  const placedColumns = [
    ...baseColumns,
    { key: "company",    label: "Company",  render: (row) => <span className="font-semibold text-slate-800">{toTitle(row.placedInfo?.companyName || "—")}</span> },
    { key: "jobProfile", label: "Job Role",     render: (row) => <span className="text-xs font-medium bg-slate-50 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">{toTitle(row.placedInfo?.jobProfile || "—")}</span> },
    { key: "salary",     label: "Package",      render: (row) => <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80">{row.placedInfo?.salary ? `₹${(row.placedInfo.salary / 100000).toFixed(1)} LPA` : "—"}</span> },
    {
      key: "action", 
      label: "Actions",
      render: (row) => (
        <button 
          onClick={(e) => { e.stopPropagation(); setSelectedForPost(row); setIsPostModalOpen(true); }}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-3 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1"
        >
          <MdAdd /> Post Banner
        </button>
      ),
    },
  ];

  const getColumns = () => {
    if (activeTab === "Placed")              return placedColumns;
    if (activeTab === "Selected")            return selectedColumns;
    if (activeTab === "Interview")           return interviewColumns;
    if (activeTab === "Ready for Drive")     return readyForDriveColumns;
    return readyForPlacementColumns;
  };

  const handleRowClick = (row) => {
    const sId = row.studentId?._id || row._id;
    if (sId) {
      navigate(`/student-profile/${sId}`);
    }
  };

  const refetchAll = () => { refetchReady(); refetchSelected(); refetchPlaced(); };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader />
      </div>
    );
  }

  const activeData = getActiveData();
  const totalMobilePages = Math.ceil(activeData.length / 10) || 1;
  const paginatedMobileData = activeData.slice((mobilePage - 1) * 10, mobilePage * 10);

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <Header
        title="Placement Candidates"
        subtitle="Manage ready pool, interview schedules, and confirmed placements"
        breadcrumbs={[{ label: "Placements", path: "/placements/dashboard" }, { label: "Candidates" }]}
      />

      <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">

        {/* ── Summary Stats Row (2x2 on mobile, 5th card spans full width) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <StatsCard
            title="Ready for Placement"
            value={readyForPlacementStudents.length}
            icon={<MdCheckCircle />}
            color="green"
            trend="Stage 2A Cleared"
            sub="ready pool"
            onClick={() => setActiveTab("Ready for Placement")}
          />
          <StatsCard
            title="Ready for Drive"
            value={readyForDriveStudents.length}
            icon={<MdCheckCircleOutline />}
            color="blue"
            trend="Stage 2B Cleared"
            sub="eligible for drives"
            onClick={() => setActiveTab("Ready for Drive")}
          />
          <StatsCard
            title="Interview"
            value={interviewStudents.length}
            icon={<MdWork />}
            color="orange"
            trend="Active Drives"
            sub="in evaluation"
            onClick={() => setActiveTab("Interview")}
          />
          <StatsCard
            title="Selected"
            value={selectedStudents.length}
            icon={<MdVerifiedUser />}
            color="purple"
            trend="Offer Received"
            sub="awaiting confirmation"
            onClick={() => setActiveTab("Selected")}
          />
          <StatsCard
            title="Placed"
            value={placedStudents.length}
            icon={<MdTrendingUp />}
            color="teal"
            trend="Confirmed Offers"
            sub="hired students"
            onClick={() => setActiveTab("Placed")}
            className="col-span-2 sm:col-span-2 lg:col-span-1"
          />
        </div>

        {/* ── Tabs & Search Toolbar Container ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-3.5 sm:p-4 space-y-3 sm:space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div className="flex-1 overflow-x-auto -mx-1 px-1">
              <TabsCommon 
                tabs={TABS.map(t => `${t} (${tabCounts[t] || 0})`)} 
                activeTab={`${activeTab} (${tabCounts[activeTab] || 0})`} 
                onTabChange={(tabWithCount) => {
                  const rawTab = TABS.find(t => tabWithCount.startsWith(t)) || TABS[0];
                  setActiveTab(rawTab);
                }} 
              />
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 shrink-0">
              {/* Technology Filter */}
              <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 sm:py-1.5 text-xs font-medium text-slate-700">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <MdFilterList className="text-slate-400 text-sm" />
                  <span>Technology:</span>
                </div>
                <select
                  value={selectedTech}
                  onChange={(e) => setSelectedTech(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[150px] truncate text-right sm:text-left"
                >
                  {availableTechnologies.map((tech) => (
                    <option key={tech} value={tech}>
                      {tech}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                <input
                  type="text"
                  placeholder="Search candidate name or PR-Key..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white w-full transition"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm("")} 
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title="Clear search"
                  >
                    <MdClose size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Data View (Mobile Cards + Desktop Table) ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Mobile Card List View */}
          <div className="block md:hidden divide-y divide-slate-100">
            {paginatedMobileData.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-medium">
                No candidates found matching filters.
              </div>
            ) : (
              paginatedMobileData.map((row) => {
                const sId = row.studentId?._id || row._id;
                const resumeURL = row.resumeURL || row.studentId?.documents?.find(d => (d.title || "").toLowerCase().includes("resume"))?.fileURL;
                
                let label = row.readinessStatus || "Ready for Placement";
                if (row.placedInfo) label = "Placed";
                else if (label === "Ready") label = "Ready for Placement";
                else if (label === "Ready for Interview") label = "Ready for Drive";

                const badgeStyle = {
                  "Ready for Placement": "bg-emerald-50 text-emerald-700 border-emerald-200/80",
                  "Ready for Drive":     "bg-sky-50 text-sky-700 border-sky-200/80",
                  "Interview":           "bg-amber-50 text-amber-700 border-amber-200/80",
                  "Selected":            "bg-violet-50 text-violet-700 border-violet-200/80",
                  "Placed":              "bg-teal-50 text-teal-700 border-teal-200/80",
                }[label] || "bg-slate-100 text-slate-700 border-slate-200";

                return (
                  <div
                    key={sId}
                    className="p-4 space-y-3 hover:bg-slate-50/50 transition"
                  >
                    {/* Header Row: Profile + Current Stage */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar firstName={row.firstName} lastName={row.lastName} imageUrl={row.image} />
                        <div className="min-w-0">
                          <p 
                            onClick={() => handleRowClick(row)}
                            className="font-semibold text-xs text-slate-900 hover:text-slate-700 transition cursor-pointer truncate"
                          >
                            {toTitle(`${row.firstName || ""} ${row.lastName || ""}`)}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">{row.prkey || "PR-KEY"}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                        {row.currentSubLevel || row.currentLevel || "Stage 2A"}
                      </span>
                    </div>

                    {/* Tags & Contact Row */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
                      <span className="text-[10px] font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[140px]">
                        {row.technology || row.track || row.course || "General"}
                      </span>

                      {row.studentMobile && (
                        <a 
                          href={`tel:${row.studentMobile}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition"
                        >
                          <MdPhone size={10} /> +91 {row.studentMobile}
                        </a>
                      )}

                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ml-auto ${badgeStyle}`}>
                        {label}
                      </span>
                    </div>

                    {/* Resume + Extra Details Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                      <div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (resumeURL) window.open(resumeURL, "_blank", "noopener,noreferrer");
                            else toast.info("Resume not uploaded yet.");
                          }}
                          className={`text-[10px] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition ${
                            resumeURL 
                              ? "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-2xs" 
                              : "bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed"
                          }`}
                        >
                          <MdOpenInNew size={11} /> {resumeURL ? "View Resume" : "No Resume"}
                        </button>
                      </div>

                      {activeTab === "Interview" && (() => {
                        const active = row.PlacementinterviewRecord?.find((r) =>
                          ["Scheduled", "Ongoing", "Rescheduled"].includes(r.status)
                        );
                        return (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            active?.status === "Ongoing" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                            active?.status === "Rescheduled" ? "bg-violet-50 text-violet-700 border border-violet-200" :
                            "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}>
                            {active?.jobProfile || "Drive"} • {active?.status || "Scheduled"}
                          </span>
                        );
                      })()}

                      {activeTab === "Selected" && (() => {
                        const sel = row.selectedInterviews?.[0];
                        return (
                          <span className="font-medium text-slate-800 bg-slate-100 text-[10px] px-2 py-0.5 rounded-md border border-slate-200">
                            {toTitle(sel?.companyRef?.companyName || "Selected")}
                          </span>
                        );
                      })()}

                      {activeTab === "Placed" && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="font-medium text-slate-800 truncate max-w-[120px]">{toTitle(row.placedInfo?.companyName || "—")}</span>
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                            {row.placedInfo?.salary ? `₹${(row.placedInfo.salary / 100000).toFixed(1)} LPA` : "—"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      {(activeTab === "Ready for Placement" || activeTab === "Ready for Drive") && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudent(row);
                            setIsInterviewModalOpen(true);
                          }}
                          className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-medium py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <MdCalendarToday className="text-sm" /> Schedule Drive
                        </button>
                      )}

                      {activeTab === "Interview" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/interview-history/${row.studentId?._id || row._id}`);
                          }}
                          className="w-full bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium py-2 rounded-xl border border-slate-200 transition text-center shadow-2xs cursor-pointer"
                        >
                          View History
                        </button>
                      )}

                      {activeTab === "Selected" && (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedStudent(row); setIsInterviewModalOpen(true); }}
                            className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium py-2 rounded-xl transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <MdAdd /> Next Round
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedForPlacement(row); setIsConfirmModalOpen(true); }}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium py-2 rounded-xl transition shadow-2xs text-center cursor-pointer"
                          >
                            Confirm Placement
                          </button>
                        </>
                      )}

                      {activeTab === "Placed" && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedForPost(row); setIsPostModalOpen(true); }}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium py-2 rounded-xl transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MdAdd /> Post Banner
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Mobile Pagination Bar */}
            {activeData.length > 10 && (
              <div className="flex items-center justify-between p-3 border-t border-gray-100 bg-gray-50/60 text-xs">
                <button
                  onClick={() => setMobilePage(p => Math.max(1, p - 1))}
                  disabled={mobilePage === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-bold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                >
                  Previous
                </button>
                <span className="text-gray-500 font-medium text-[11px]">
                  Page <strong className="text-gray-800">{mobilePage}</strong> of {totalMobilePages}
                </span>
                <button
                  onClick={() => setMobilePage(p => Math.min(totalMobilePages, p + 1))}
                  disabled={mobilePage >= totalMobilePages}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-bold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <CommonTable
              columns={getColumns()}
              data={activeData}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              pagination
              rowsPerPage={10}
              onRowClick={handleRowClick}
            />
          </div>
        </div>

      </div>

      <ScheduleInterviewModal
        isOpen={isInterviewModalOpen}
        onClose={() => { setIsInterviewModalOpen(false); setSelectedStudent(null); }}
        studentId={selectedStudent?.studentId?._id || selectedStudent?._id}
        onSuccess={refetchAll}
      />
      <ConfirmPlacementModal
        isOpen={isConfirmModalOpen}
        onClose={() => { setIsConfirmModalOpen(false); setSelectedForPlacement(null); }}
        student={selectedForPlacement}
        onSuccess={refetchAll}
      />
      <CreatePostModal
        isOpen={isPostModalOpen}
        onClose={() => { setIsPostModalOpen(false); setSelectedForPost(null); }}
        student={selectedForPost}
        onSuccess={refetchAll}
      />
    </div>
  );
};

export default PlacementReadyStudents;
