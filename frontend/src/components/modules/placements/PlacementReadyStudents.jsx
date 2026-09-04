import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { MdCheckCircle, MdWork, MdVerifiedUser, MdTrendingUp, MdSearch, MdCalendarToday, MdAdd, MdFilterList, MdCheckCircleOutline, MdFileDownload, MdOpenInNew } from "react-icons/md";

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

  const [selectedStudent, setSelectedStudent]           = useState(null);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen]     = useState(false);
  const [isPostModalOpen, setIsPostModalOpen]           = useState(false);
  const [selectedForPlacement, setSelectedForPlacement] = useState(null);
  const [selectedForPost, setSelectedForPost]           = useState(null);

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
            <p className="font-bold text-gray-800 hover:text-orange-600 transition cursor-pointer">
              {toTitle(`${row.firstName || ""} ${row.lastName || ""}`)}
            </p>
            <p className="text-[11px] text-gray-400 font-medium">{row.prkey || "PR-KEY"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "technology",
      label: "Technology / Track",
      render: (row) => (
        <span className="text-xs font-semibold text-gray-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
          {row.technology || row.track || row.course || "General"}
        </span>
      ),
    },
    {
      key: "level",
      label: "Current Stage",
      align: "center",
      render: (row) => (
        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-100">
          {row.currentSubLevel || row.currentLevel || "Stage 2A"}
        </span>
      ),
    },
    { 
      key: "studentMobile", 
      label: "Contact", 
      align: "center",
      render: (row) => (
        <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
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
          "Ready for Placement": "bg-emerald-50 text-emerald-700 border-emerald-200",
          "Ready for Drive":     "bg-indigo-50 text-indigo-700 border-indigo-200",
          "Interview":           "bg-amber-50 text-amber-700 border-amber-200",
          "Selected":            "bg-purple-50 text-purple-700 border-purple-200",
          "Placed":              "bg-teal-50 text-teal-700 border-teal-200",
        }[label] || "bg-emerald-50 text-emerald-700 border-emerald-200";

        return (
          <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${badgeStyle}`}>
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
              else alert("Resume not uploaded yet.");
            }}
            className={`text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition ${
              resumeURL 
                ? "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100" 
                : "bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed"
            }`}
          >
            <MdOpenInNew size={12} /> {resumeURL ? "View Resume" : "No Resume"}
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
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1"
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
          className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1"
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
            <p className="text-xs font-bold text-gray-800">{active?.jobProfile || "Drive In Progress"}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold mt-0.5 inline-block ${
              active?.status === "Ongoing" ? "bg-amber-100 text-amber-800 border border-amber-200" :
              active?.status === "Rescheduled" ? "bg-purple-100 text-purple-800 border border-purple-200" :
              "bg-blue-100 text-blue-800 border border-blue-200"
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
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-200 transition"
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
          <span className="font-bold text-gray-800 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg border border-purple-100 text-xs">
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
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold px-2.5 py-1.5 rounded-xl transition flex items-center gap-1"
          >
            <MdAdd /> Next Round
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setSelectedForPlacement(row); setIsConfirmModalOpen(true); }}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-xs"
          >
            Confirm Placement
          </button>
        </div>
      ),
    },
  ];

  const placedColumns = [
    ...baseColumns,
    { key: "company",    label: "Company",  render: (row) => <span className="font-bold text-gray-800">{toTitle(row.placedInfo?.companyName || "—")}</span> },
    { key: "jobProfile", label: "Job Role",     render: (row) => <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md">{toTitle(row.placedInfo?.jobProfile || "—")}</span> },
    { key: "salary",     label: "Package",      render: (row) => <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">{row.placedInfo?.salary ? `₹${(row.placedInfo.salary / 100000).toFixed(1)} LPA` : "—"}</span> },
    {
      key: "action", 
      label: "Actions",
      render: (row) => (
        <button 
          onClick={(e) => { e.stopPropagation(); setSelectedForPost(row); setIsPostModalOpen(true); }}
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1"
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

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <Header
        title="Placement Candidates"
        subtitle="Manage ready pool, interview schedules, and confirmed placements"
        breadcrumbs={[{ label: "Placements", path: "/placements/dashboard" }, { label: "Candidates" }]}
      />

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* ── Summary Stats Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
          />
        </div>

        {/* ── Tabs & Search Toolbar Container ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 overflow-x-auto">
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
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {/* Technology Filter */}
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700">
                <MdFilterList className="text-gray-400 text-sm" />
                <span>Technology:</span>
                <select
                  value={selectedTech}
                  onChange={(e) => setSelectedTech(e.target.value)}
                  className="bg-transparent font-bold text-orange-600 focus:outline-none cursor-pointer"
                >
                  {availableTechnologies.map((tech) => (
                    <option key={tech} value={tech}>
                      {tech}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Input */}
              <div className="relative shrink-0">
                <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                <input
                  type="text"
                  placeholder="Search candidate name or PR-Key..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-64 transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Data Table ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <CommonTable
            columns={getColumns()}
            data={getActiveData()}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            pagination
            rowsPerPage={10}
            onRowClick={handleRowClick}
          />
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
