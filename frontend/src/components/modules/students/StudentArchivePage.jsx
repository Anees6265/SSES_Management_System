/* eslint-disable react/prop-types */
import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MdArrowBack,
  MdArchive,
  MdCheckCircle,
  MdAccessTime,
  MdBook,
  MdTopic,
  MdSubject,
  MdSearch,
  MdTrendingUp,
  MdSchool,
  MdStar,
  MdOutlineAssignment,
  MdLayers,
  MdChevronRight,
  MdOutlineHelpOutline,
  MdVerified,
  MdEmail,
  MdPhone,
  MdCalendarToday,
  MdBadge,
  MdRefresh,
  MdPerson,
  MdAssignment
} from "react-icons/md";
import Header from "../../shared/sidebar/Header";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";
import { useGetStudentArchivedTasksQuery } from "../../../redux/api/authApi";

const STATUS_CONFIG = {
  completed: {
    label: "Completed",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    icon: MdCheckCircle
  },
  inProgress: {
    label: "In Progress",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    icon: MdAccessTime
  },
  pending: {
    label: "Pending",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    icon: MdOutlineHelpOutline
  }
};

const StudentArchivePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("tasks"); // "tasks" | "syllabus"
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [expandedCriteria, setExpandedCriteria] = useState({});

  const { data: archiveResponse, isLoading, error, refetch, isFetching } = useGetStudentArchivedTasksQuery(id, {
    skip: !id,
    refetchOnMountOrArgChange: true
  });

  const archiveData = archiveResponse?.data || {};
  const student = archiveData.student || {};
  const tasks = useMemo(() => {
    const raw = archiveData.tasks || [];
    return [...raw].sort((a, b) => {
      const timeA = new Date(a.archivedAt || a.createdAt || (a._id ? parseInt(a._id.toString().substring(0, 8), 16) * 1000 : 0)).getTime();
      const timeB = new Date(b.archivedAt || b.createdAt || (b._id ? parseInt(b._id.toString().substring(0, 8), 16) * 1000 : 0)).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return (b._id || "").toString().localeCompare((a._id || "").toString());
    });
  }, [archiveData.tasks]);
  const previousSyllabus = archiveData.previousSyllabus || null;

  const studentName = student.fullName || `${student.firstName || ""} ${student.lastName || ""}`.trim() || "Student";
  const initials = useMemo(() => {
    const parts = studentName.split(" ").filter(Boolean);
    if (!parts.length) return "ST";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [studentName]);

  const subjectOptions = useMemo(() => {
    const set = new Set();
    tasks.forEach(t => {
      if (t.subjectName) set.add(t.subjectName);
    });
    return [
      { value: "", label: "All Subjects" },
      ...Array.from(set).map(s => ({ value: s, label: s }))
    ];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (selectedStatus && t.status !== selectedStatus) return false;
      if (selectedSubject && t.subjectName !== selectedSubject) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchTitle = (t.title || "").toLowerCase().includes(q);
        const matchSubject = (t.subjectName || "").toLowerCase().includes(q);
        const matchTopic = (t.topicName || "").toLowerCase().includes(q);
        const matchSubTopic = (t.subTopicName || "").toLowerCase().includes(q);
        if (!matchTitle && !matchSubject && !matchTopic && !matchSubTopic) return false;
      }
      return true;
    });
  }, [tasks, selectedStatus, selectedSubject, search]);

  const toggleCriteria = (taskId) => {
    setExpandedCriteria(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const completionPercentage = useMemo(() => {
    if (!archiveData.totalTasks) return 0;
    return Math.round((archiveData.completedTasks / archiveData.totalTasks) * 100);
  }, [archiveData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Student Archive...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] p-6 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
            <MdArchive size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Failed to Load Archive Data</h3>
            <p className="text-xs text-slate-500 mt-1">{error?.data?.message || error?.message || "An unexpected error occurred"}</p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition hover:bg-slate-50 cursor-pointer"
            >
              Go Back
            </button>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* STANDARD SSES APP HEADER */}
      <Header
        title={`${studentName} — Archive`}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Students", href: "/student-detail-table" },
          { label: studentName, href: `/student-profile/${id}` },
          { label: "Archive" }
        ]}
        showBack={true}
        onBack={() => navigate(-1)}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9 sm:h-10 px-3 sm:px-4 flex items-center justify-center gap-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-500 hover:border-orange-300 shadow-2xs transition-all text-xs font-bold cursor-pointer active:scale-95 disabled:opacity-50"
              title="Refresh Archive Data"
            >
              <MdRefresh size={16} className={isFetching ? "animate-spin text-orange-500" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/student-profile/${id}`)}
              className="h-9 sm:h-10 px-3.5 sm:px-4 flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-xs transition-all text-xs font-bold cursor-pointer active:scale-95"
            >
              <MdPerson size={16} />
              <span>Student Profile</span>
            </button>
          </div>
        }
      />

      {/* MAIN FULL-PAGE CONTAINER (IDENTICAL PADDING & MAX-WIDTH TO STUDENT PROFILE PAGE) */}
      <div className="bg-[#F8F9FA] min-h-screen p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto pb-16">

        {/* 1. HERO PROFILE CARD */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
              {/* Avatar with Status Ring */}
              <div className="relative flex-shrink-0 self-center sm:self-auto">
                {student.image ? (
                  <img src={student.image} alt={studentName} className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-slate-100 shadow-sm" />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xl sm:text-2xl font-black border-4 border-slate-100 shadow-sm">
                    {initials}
                  </div>
                )}
                <span
                  className="absolute bottom-1 right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-emerald-500 border-2 border-white rounded-full"
                  title="Archive Mode Active"
                />
              </div>

              {/* Info Section */}
              <div className="space-y-1 text-center sm:text-left min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight break-words">{studentName}</h2>
                  <MdVerified size={20} className="text-orange-500 shrink-0" />
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0 shadow-2xs">
                    <MdArchive size={13} className="text-amber-600" />
                    <span>PREVIOUS LEVEL ARCHIVE</span>
                  </span>
                  {student.isFTP && (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border border-orange-200 shrink-0 shadow-2xs">
                      <MdTrendingUp size={12} className="text-orange-600" />
                      <span>FTP ACTIVE{student.ftpDomain ? ` • ${student.ftpDomain}` : ""}</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2 text-xs font-bold text-orange-500">
                  <span>{student.course || "Course"} • Current Level: {student.currentLevel} ({student.currentSubLevel})</span>
                  {student.session && (
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 text-[11px] font-bold">
                      Session: {student.session}
                    </span>
                  )}
                </div>

                {/* Previous Level Badge */}
                <div className="pt-1 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-200 text-[11px] sm:text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    <MdSchool size={14} className="text-slate-500" />
                    PREVIOUS STAGE: {student.previousLevel !== "N/A" ? `${student.previousLevel} · ${student.previousSubLevel}` : "Pre-FTP Assignment"}
                  </span>
                  {previousSyllabus && (
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full">
                      <MdBook size={14} className="text-amber-600" />
                      {previousSyllabus.title || previousSyllabus.version || "Syllabus Version"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Quick Action Buttons */}
            <div className="flex sm:flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 w-full lg:w-auto mt-2 lg:mt-0">
              <button
                type="button"
                onClick={() => navigate(`/student-profile/${id}`)}
                className="flex items-center justify-center gap-1.5 sm:gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-3.5 sm:px-4 py-2.5 rounded-xl text-xs transition active:scale-[0.98] cursor-pointer shadow-2xs"
              >
                <MdArrowBack size={16} /> Back to Profile
              </button>

              <button
                type="button"
                onClick={() => navigate(`/student/${id}/task-list`)}
                className="flex items-center justify-center gap-1.5 sm:gap-2 border-2 border-orange-400 text-orange-500 hover:bg-orange-50 font-bold px-3.5 sm:px-4 py-2.5 rounded-xl text-xs transition shadow-2xs active:scale-[0.98] cursor-pointer"
                title="View Active Task Board"
              >
                <MdAssignment size={16} /> Current Tasks
              </button>
            </div>
          </div>
        </div>

        {/* 2. DEDICATED STUDENT ARCHIVE HIGHLIGHT INFORMATION CARD */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-5 lg:p-6 shadow-xs space-y-3.5 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 sm:pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <MdBadge size={17} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Student Details & Context</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-normal">Contact channels, academic registration & previous timeline</p>
              </div>
            </div>
            {student.session && (
              <div className="self-start sm:self-auto">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-orange-50/70 border border-orange-200/80 px-3 py-1 rounded-full shadow-2xs">
                  <MdCalendarToday size={13} className="text-orange-500 shrink-0" />
                  <span>Session: <strong className="text-slate-900 font-bold">{student.session}</strong></span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100/90 px-1.5 py-0.5 rounded-md">
                    Archived View
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            {/* Student ID */}
            {student.studentId && (
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 transition shadow-2xs flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 border border-orange-100/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <MdBadge size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Student ID</span>
                  <span className="text-xs sm:text-[13px] font-bold text-slate-800 block mt-0.5 truncate">{student.studentId}</span>
                </div>
              </div>
            )}

            {/* Email */}
            {student.email && (
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 transition shadow-2xs flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 border border-orange-100/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <MdEmail size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Email</span>
                  <a href={`mailto:${student.email}`} className="text-xs sm:text-[13px] font-bold text-slate-800 truncate block mt-0.5 hover:text-orange-600 transition">
                    {student.email}
                  </a>
                </div>
              </div>
            )}

            {/* Mobile */}
            {student.studentMobile && (
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 transition shadow-2xs flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 border border-orange-100/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <MdPhone size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Contact</span>
                  <span className="text-xs sm:text-[13px] font-bold text-slate-800 block mt-0.5">{student.studentMobile}</span>
                </div>
              </div>
            )}

            {/* Department */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 transition shadow-2xs flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 border border-orange-100/80 flex items-center justify-center shrink-0 shadow-2xs">
                <MdSchool size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Department / Stream</span>
                <span className="text-xs sm:text-[13px] font-bold text-slate-800 block mt-0.5 truncate">{student.department || student.course || "Standard"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. PERFORMANCE STATS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Archived</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <MdOutlineAssignment size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{archiveData.totalTasks || 0}</p>
            <p className="text-[11px] text-slate-400">Tasks preserved in archive</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Completed</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MdCheckCircle size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600">{archiveData.completedTasks || 0}</p>
            <div className="flex items-center gap-2 pt-0.5">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${completionPercentage}%` }} />
              </div>
              <span className="text-xs font-bold text-slate-600">{completionPercentage}%</span>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">In Progress / Pending</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <MdAccessTime size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">
              {(archiveData.inProgressTasks || 0) + (archiveData.pendingTasks || 0)}
            </p>
            <p className="text-[11px] text-slate-400">
              {archiveData.inProgressTasks || 0} ongoing · {archiveData.pendingTasks || 0} pending
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Average Score</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <MdStar size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-600">
              {archiveData.averageMarks ? `${archiveData.averageMarks} / 5` : "N/A"}
            </p>
            <p className="text-[11px] text-slate-400">Across completed tasks</p>
          </div>
        </div>

        {/* 4. MAIN ARCHIVE CONTENT CARD WITH SEGMENTED TABS & FILTERS */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-5">
          {/* Header & Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <MdArchive size={20} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Archived Curriculum & Task Records</h3>
                <p className="text-xs text-slate-500">Inspect previous task evaluation scores, milestones & syllabus tree</p>
              </div>
            </div>

            {/* Segmented Tab Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/70 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("tasks")}
                className={`px-4 sm:px-5 py-2 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "tasks" ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <MdOutlineAssignment size={16} />
                <span>Archived Tasks ({tasks.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("syllabus")}
                className={`px-4 sm:px-5 py-2 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "syllabus" ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <MdBook size={16} />
                <span>Previous Syllabus Hierarchy</span>
              </button>
            </div>
          </div>

          {/* TAB 1: ARCHIVED TASKS */}
          {activeTab === "tasks" && (
            <div className="space-y-4">
              {/* Filter Row */}
              <div className="bg-slate-50/70 rounded-2xl border border-slate-200/70 p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <MdSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by task title, subject, or topic..."
                    className="w-full h-11 pl-9 pr-3 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-slate-800 shadow-2xs transition"
                  />
                </div>

                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                  <div className="w-full sm:w-48">
                    <SelectDropdown
                      value={selectedSubject}
                      onChange={(val) => setSelectedSubject(val)}
                      options={subjectOptions}
                      placeholder="All Subjects"
                      buttonClassName="w-full h-11 text-xs font-bold border border-slate-200 rounded-xl px-3 bg-white shadow-2xs hover:border-orange-400"
                    />
                  </div>

                  <div className="w-full sm:w-40">
                    <SelectDropdown
                      value={selectedStatus}
                      onChange={(val) => setSelectedStatus(val)}
                      options={[
                        { value: "", label: "All Status" },
                        { value: "completed", label: "Completed" },
                        { value: "inProgress", label: "In Progress" },
                        { value: "pending", label: "Pending" }
                      ]}
                      placeholder="All Status"
                      buttonClassName="w-full h-11 text-xs font-bold border border-slate-200 rounded-xl px-3 bg-white shadow-2xs hover:border-orange-400"
                    />
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              {filteredTasks.length === 0 ? (
                <div className="bg-slate-50/60 rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto border border-amber-100">
                    <MdArchive size={26} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No Archived Tasks Found</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    {tasks.length === 0
                      ? "No previous level tasks have been archived for this student yet."
                      : "No archived tasks matched your current search and filter selections."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:gap-3.5">
                  {filteredTasks.map((t, idx) => {
                    const statusConf = STATUS_CONFIG[t.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConf.icon;
                    const isExpanded = Boolean(expandedCriteria[t._id || idx]);

                    return (
                      <div
                        key={t._id || idx}
                        className="bg-white rounded-2xl border border-slate-200 hover:border-orange-300 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-black shrink-0 shadow-2xs">
                                #{idx + 1}
                              </span>
                              <span className="text-xs font-black text-orange-600 bg-orange-50 border border-orange-200/70 px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                                {t.subjectName || "Subject"}
                              </span>
                              {t.subLevelId?.name && (
                                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                                  Level {t.subLevelId.name}
                                </span>
                              )}
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 ${statusConf.badge}`}>
                                <StatusIcon size={12} />
                                {statusConf.label}
                              </span>
                            </div>

                            <h3 className="text-sm sm:text-base font-black text-slate-900 break-words">{t.title}</h3>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                            {t.status === "completed" && typeof t.marks === "number" ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-300 px-3.5 py-1.5 rounded-xl shadow-2xs">
                                <MdStar size={15} className="text-emerald-600" />
                                Marks: {t.marks} / {t.maxMarks || 5}
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                                Max: {t.maxMarks || 5} marks
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Topic / Subtopic Path */}
                        {(t.topicName || t.subTopicName) && (
                          <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/80 flex-wrap">
                            <MdTopic size={14} className="text-orange-500 shrink-0" />
                            <span className="font-bold text-slate-900">{t.topicName}</span>
                            {t.subTopicName && (
                              <>
                                <MdChevronRight size={14} className="text-slate-400" />
                                <span className="text-slate-600 font-medium">{t.subTopicName}</span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Measurable Criteria */}
                        {t.measurablePoints && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => toggleCriteria(t._id || idx)}
                              className="text-xs font-bold text-slate-500 hover:text-orange-600 flex items-center gap-1 cursor-pointer transition select-none"
                            >
                              <span>{isExpanded ? "Hide Measurable Criteria" : "View Measurable Criteria"}</span>
                              <MdChevronRight size={14} className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                            </button>
                            {isExpanded && (
                              <div className="mt-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 whitespace-pre-wrap leading-relaxed shadow-2xs">
                                {t.measurablePoints}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Footer context */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2.5 border-t border-slate-100 flex-wrap gap-2">
                          <span>
                            {t.archivedReason ? (
                              <span>Archived Context: <strong className="text-slate-700 font-semibold">{t.archivedReason}</strong></span>
                            ) : (
                              <span>Preserved from previous level progress</span>
                            )}
                          </span>
                          {t.archivedAt && (
                            <span>
                              Archived on: {new Date(t.archivedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PREVIOUS SYLLABUS HIERARCHY */}
          {activeTab === "syllabus" && (
            <div className="space-y-4">
              {previousSyllabus ? (
                <div className="space-y-4">
                  {/* Banner */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-50/80 via-amber-50/60 to-white border border-orange-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-slate-900">
                          {previousSyllabus.title || "Previous Curriculum Version"}
                        </h3>
                        <span className="text-xs font-black bg-orange-500 text-white px-2.5 py-0.5 rounded-lg shadow-2xs">
                          {previousSyllabus.version || "v1.0"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Session: <strong>{previousSyllabus.sessionId?.name || "Session"}</strong> · Level: <strong>{previousSyllabus.levelId?.name || "N/A"}</strong> · SubLevel: <strong>{previousSyllabus.subLevelId?.name || "N/A"}</strong>
                      </p>
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-xl bg-white text-orange-700 border border-orange-200 shrink-0 self-start sm:self-auto shadow-2xs">
                      {previousSyllabus.subjects?.length || 0} Subjects Included
                    </span>
                  </div>

                  {/* Subjects breakdown list */}
                  <div className="space-y-3.5 pt-1">
                    {(previousSyllabus.subjects || []).map((subj, si) => (
                      <div key={subj._id || si} className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-slate-50/50 space-y-3.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-xl bg-orange-500 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                              {si + 1}
                            </span>
                            <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">{subj.name}</h4>
                          </div>
                          <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                            {subj.topics?.length || 0} Topics
                          </span>
                        </div>

                        {subj.topics && subj.topics.length > 0 && (
                          <div className="pl-3 sm:pl-8 space-y-2.5 border-l-2 border-slate-200 ml-3.5">
                            {subj.topics.map((top, ti) => (
                              <div key={top._id || ti} className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-2 shadow-2xs">
                                <div className="flex items-center gap-2 font-black text-slate-800">
                                  <span className="text-orange-500">{ti + 1}.</span>
                                  <span>{top.name}</span>
                                </div>
                                {top.subTopics && top.subTopics.length > 0 && (
                                  <div className="pl-4 space-y-1.5 border-l border-slate-100 ml-1.5">
                                    {top.subTopics.map((st, sti) => (
                                      <div key={st._id || sti} className="text-xs text-slate-600 flex items-center gap-2 font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                                        <span>{st.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center space-y-3 bg-slate-50/60 rounded-3xl border border-dashed border-slate-200">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <MdBook size={26} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No Previous Syllabus Record Found</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    A previous syllabus hierarchy was not linked for this student record. You can still inspect their previous evaluated tasks under the Archived Tasks tab.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentArchivePage;
