import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  MdPeople, MdCheckCircle, MdWork, MdTrendingUp, MdPercent, 
  MdWarningAmber, MdTrendingDown, MdBlock, MdArrowBack, MdFilterList,
  MdRefresh, MdFileDownload, MdSearch, MdSchool, MdCheckCircleOutline, MdClose
} from "react-icons/md";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Header from "../../../shared/sidebar/Header";
import StatsCard from "./StatsCard";
import PlacementFunnel from "./PlacementFunnel";
import StatusBreakdown from "./StatusBreakdown";
import TopCompanies from "./TopCompanies";
import EmptyState from "../../../shared/empty-state/EmptyState";
import { useGetAllSessionsQuery } from "../../../../redux/api/authApi";

// ── Dummy / Fallback Data ──────────────────────────────────────
const DUMMY_DEPT_DETAILS = {
  "6a0c462fb827b322a78d5727": { name: "ITEG", code: "ITEG" },
  "6a6476a55a76e696c8d7e64b": { name: "UIUX", code: "UI/UX" },
  "6a5f4cbf24be9c4955b306dd": { name: "ITEG - Software Engineering", code: "SE" },
  "6a5f4cbf24be9c4955b306e0": { name: "AI & Data Science", code: "AI/DS" },
  "6a0eebd80e812b062d541ec4": { name: "MEG", code: "MEG" },
  "6a23de703ae885bdae033748": { name: "FTP", code: "FTP" },
};

const DUMMY = {
  overview: { totalStudents: 40, readyStudents: 15, interviewRunning: 6, placedStudents: 32, placementPercentage: 80.0 },
  funnel: { ready: 15, interview: 6, selected: 4, placed: 32 },
  breakdown: { unmappedCount: 2, readyToProcessCount: 15, onProcessCount: 6, placedCount: 32 },
  alerts: { unmappedStudents: 2 },
  readyStudents: [
    { studentId: "s1", name: "Rahul Sharma", prkey: "PRK-2024-001", levelName: "4th Year", gpa: 8.4, attendance: 88, backlogCount: 0, testPass: true, resumeUploaded: true },
    { studentId: "s2", name: "Priya Patel",  prkey: "PRK-2024-005", levelName: "4th Year", gpa: 8.9, attendance: 92, backlogCount: 0, testPass: true, resumeUploaded: true },
    { studentId: "s3", name: "Amit Kumar",   prkey: "PRK-2024-012", levelName: "3rd Year", gpa: 7.8, attendance: 82, backlogCount: 0, testPass: true, resumeUploaded: true },
  ],
  recentPlacements: [
    { studentId: "6",  studentName: "Anjali Gupta",   prkey: "SS006", companyName: "TCS Pvt Ltd",      salary: 450000, placedDate: "2025-01-05" },
    { studentId: "7",  studentName: "Rohan Mehta",    prkey: "SS007", companyName: "Infosys",          salary: 420000, placedDate: "2025-01-03" },
    { studentId: "8",  studentName: "Kavya Nair",     prkey: "SS008", companyName: "Wipro",            salary: 400000, placedDate: "2024-12-28" },
    { studentId: "9",  studentName: "Arjun Yadav",    prkey: "SS009", companyName: "HCL Technologies", salary: 380000, placedDate: "2024-12-20" },
    { studentId: "10", studentName: "Pooja Sharma",   prkey: "SS010", companyName: "Tech Mahindra",    salary: 360000, placedDate: "2024-12-15" },
  ],
  topCompanies: [
    { companyName: "TCS Pvt Ltd",       totalHires: 10, avgSalary: 450000 },
    { companyName: "Infosys",           totalHires: 8,  avgSalary: 420000 },
    { companyName: "Wipro",             totalHires: 6,  avgSalary: 400000 },
    { companyName: "HCL Technologies",  totalHires: 4,  avgSalary: 380000 },
  ],
  monthlyTrend: [
    { month: 'Jul', placed: 3 },
    { month: 'Aug', placed: 6 },
    { month: 'Sep', placed: 11 },
    { month: 'Oct', placed: 16 },
    { month: 'Nov', placed: 21 },
    { month: 'Dec', placed: 25 },
    { month: 'Jan', placed: 28 },
  ]
};

const formatSalary = (n) => n ? `₹${(n / 100000).toFixed(1)} LPA` : "—";
const formatDate   = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const DepartmentPlacementDetail = () => {
  const { subDepartmentId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [academicYear, setAcademicYear] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: sessionsData } = useGetAllSessionsQuery(true);
  const sessionsList = sessionsData?.data || [];

  useEffect(() => {
    if (sessionsList.length > 0 && !academicYear) {
      const activeSess = sessionsList.find(s => s.isActive || s.status === 'active') || sessionsList[0];
      const activeLabel = activeSess.name.startsWith("AY") ? activeSess.name : `AY ${activeSess.name}`;
      setAcademicYear(activeLabel);
    }
  }, [sessionsList, academicYear]);

  const deptMeta = DUMMY_DEPT_DETAILS[subDepartmentId] || { 
    name: `Department #${subDepartmentId}`, 
    code: "DEPT" 
  };

  const { overview, funnel, breakdown, alerts, readyStudents, recentPlacements, topCompanies, monthlyTrend } = DUMMY;

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 400);
  };

  const handleDownloadReport = () => {
    window.print();
  };

  const filteredReadyStudents = readyStudents.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.prkey.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const STATS = [
    { 
      title: "Total Dept Students",     
      value: overview.totalStudents,       
      icon: <MdPeople />,      
      color: "blue",
      trend: "↗ Batch Size",
      trendColor: "text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded",
      sub: "enrolled in department",
      onClick: () => navigate(`/student-detail-table/${subDepartmentId}`)
    },
    { 
      title: "Ready for Placement",     
      value: overview.readyStudents,        
      icon: <MdCheckCircle />, 
      color: "green",
      trend: "↗ Ready students",
      trendColor: "text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded",
      sub: "ready for placement",
      onClick: () => navigate(`/readiness-status?status=Ready for Placement&subDepartmentId=${subDepartmentId}`)
    },
    { 
      title: "Ready for Drive",     
      value: breakdown.readyForDrive || breakdown.readyForInterview || 0,        
      icon: <MdCheckCircleOutline />, 
      color: "teal",
      trend: "⚡ Drive ready",
      trendColor: "text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded",
      sub: "eligible for drives",
      onClick: () => navigate(`/readiness-status?status=Ready for Drive&subDepartmentId=${subDepartmentId}`)
    },
    { 
      title: "Interview", 
      value: overview.interviewRunning,     
      icon: <MdWork />,        
      color: "orange",
      trend: "⚡ Active Drives",
      trendColor: "text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded",
      sub: "students in rounds",
      onClick: () => navigate(`/readiness-status?status=Interview&subDepartmentId=${subDepartmentId}`)
    },
    { 
      title: "Placed",    
      value: overview.placedStudents,       
      icon: <MdTrendingUp />,  
      color: "purple",
      trend: "↗ Placed",
      trendColor: "text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded",
      sub: "confirmed offers",
      onClick: () => navigate(`/readiness-status?status=Placed&subDepartmentId=${subDepartmentId}`)
    },
  ];

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <Header
        title={`${deptMeta.name} — Placement Dashboard`}
        breadcrumbs={[
          { label: "Placements", path: "/placements/dashboard" },
          { label: "Dashboard",  path: "/placements/dashboard" },
          { label: deptMeta.name },
        ]}
      />

      <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">

        {/* Header Title Banner & Filter Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm space-y-3.5 sm:space-y-4">
          {/* Top Banner Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-gray-100 pb-3.5 sm:pb-4">
            <div className="flex items-start sm:items-center gap-3">
              <button
                onClick={() => navigate("/placements/dashboard")}
                className="p-2 sm:p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition shrink-0 mt-0.5 sm:mt-0"
                title="Back to Overall Placement Dashboard"
              >
                <MdArrowBack className="text-lg sm:text-xl" />
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-extrabold text-gray-800 tracking-tight">{deptMeta.name}</h1>
                  <span className="bg-orange-100 text-orange-700 text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border border-orange-200">
                    {deptMeta.code}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">Department placement metrics, readiness tracking, and company hires</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <button
                onClick={handleRefresh}
                className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:border-slate-300 bg-white transition shadow-2xs"
                title="Refresh Department Data"
              >
                <MdRefresh className={`text-lg ${loading ? "animate-spin text-slate-500" : ""}`} />
              </button>
              <button
                onClick={handleDownloadReport}
                className="flex-1 sm:flex-none justify-center bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <MdFileDownload className="text-base" /> Export Dept Report
              </button>
            </div>
          </div>

          {/* Controls & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <MdFilterList className="text-base text-slate-400" /> Filters:
              </span>
              <span className="border border-slate-200 bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                AY: {academicYear}
              </span>
              {selectedLevel !== "All" && (
                <span className="border border-slate-200 bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                  Level: {selectedLevel}
                  <MdClose className="cursor-pointer text-sm text-slate-400 hover:text-slate-600" onClick={() => setSelectedLevel("All")} />
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition cursor-pointer"
              >
                {sessionsList.length === 0 ? (
                  <option value="">No Sessions Found</option>
                ) : (
                  sessionsList.map((s) => {
                    const label = s.name.startsWith("AY") ? s.name : `AY ${s.name}`;
                    const statusText = s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : (s.isActive ? 'Active' : 'Inactive');
                    return (
                      <option key={s._id} value={label}>
                        {label} ({statusText})
                      </option>
                    );
                  })
                )}
              </select>

              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition cursor-pointer"
              >
                <option value="All">All Levels</option>
                <option value="Level 1">Level 1</option>
                <option value="Level 2">Level 2</option>
                <option value="Level 3">Level 3</option>
                <option value="Level 4">Level 4</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Top Row: 5 Department Stat Cards ───────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          {STATS.map((s, idx) => (
            <StatsCard 
              key={s.title} 
              title={s.title} 
              value={s.value} 
              icon={s.icon} 
              color={s.color} 
              trend={s.trend}
              trendColor={s.trendColor}
              sub={s.sub}
              onClick={s.onClick}
              className={idx === 4 ? "col-span-2 sm:col-span-2 lg:col-span-1 xl:col-span-1" : ""}
            />
          ))}
        </div>

        {/* ── Middle Row: Department Growth Chart + Funnel ───────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
          {/* Department Placement Trend Recharts (7 cols) */}
          <div className="xl:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col justify-between hover:shadow-md transition">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
              <div>
                <h3 className="font-bold text-gray-800 text-sm sm:text-base">{deptMeta.name} — Placement Growth</h3>
                <p className="text-xs text-gray-500 mt-0.5">Monthly cumulative hires in {deptMeta.code}</p>
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 self-start sm:self-auto">
                Target: 85% Placed
              </span>
            </div>

            <div className="w-full h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="deptPlacedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="placed" name="Placed Students" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#deptPlacedGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Placement Funnel (5 cols) */}
          <div className="xl:col-span-5">
            <PlacementFunnel data={funnel} loading={loading} />
          </div>
        </div>

        {/* ── Status Breakdown ──────────────────────────────────── */}
        <StatusBreakdown data={breakdown} loading={loading} />

        {/* ── Department Alerts & Top Hiring Companies ─────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">

          {/* Department Alert Cards */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 sm:p-6 hover:shadow-sm transition">
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base mb-3.5 sm:mb-4">Department Insights & Drive Alerts</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 sm:gap-3.5 p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <MdWarningAmber className="text-amber-600 text-xl sm:text-2xl mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider">Ready but No Drive Scheduled</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1">
                    {alerts.readyButNoInterview || 0} <span className="text-xs font-normal text-slate-500">students</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Students fully prepped for placement but not mapped to upcoming interview rounds.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-3.5 p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <MdBlock className="text-rose-600 text-xl sm:text-2xl mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider">Multiple Rejections</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1">
                    {alerts.multipleRejections || 0} <span className="text-xs font-normal text-slate-500">students</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Students who rejected 2 or more drive offers; require counselling.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-3.5 p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <MdTrendingUp className="text-emerald-600 text-xl sm:text-2xl mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider">Department Placement Rate</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1">
                    {alerts.placementPercentage || overview.placementPercentage || 0}% <span className="text-xs font-normal text-slate-500">placed</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Current conversion rate for {deptMeta.name}.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Companies Hiring From Dept */}
          <TopCompanies data={topCompanies} loading={loading} />
        </div>

        {/* ── Table 1: Ready Students — Needs Attention ─────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-800 text-sm sm:text-base">Ready Students — Needs Attention</h3>
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                  {readyStudents.length} Students
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Students eligible for placements requiring interview scheduling</p>
            </div>

            {/* Quick Search inside Table */}
            <div className="relative w-full sm:w-auto">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input
                type="text"
                placeholder="Search ready student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-48 transition"
              />
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-gray-100">
            {filteredReadyStudents.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No Ready Students Found"
                  subtitle={
                    searchTerm
                      ? `No students match "${searchTerm}". Try checking your spelling or clear search.`
                      : "No students are currently marked as placement-ready for this department."
                  }
                  actionText={searchTerm ? "Clear Search" : undefined}
                  onAction={searchTerm ? () => setSearchTerm("") : undefined}
                  compact
                />
              </div>
            ) : (
              filteredReadyStudents.map((s) => (
                <div
                  key={s.studentId}
                  onClick={() => navigate(`/student-profile/${s.studentId}`)}
                  className="p-3.5 space-y-2.5 active:bg-orange-50/40 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {s.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-gray-800 truncate">{s.name}</p>
                        <p className="text-[10px] text-gray-400">{s.prkey} • {s.levelName || "Ready"}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/student-profile/${s.studentId}`);
                      }}
                      className="text-[11px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg shrink-0 transition"
                    >
                      Profile →
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      s.readinessStatus === "Ready for Interview"
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}>
                      {s.readinessStatus || "Ready for Placement"}
                    </span>

                    {s.hasInterview ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.interviewStatus === "Ongoing"   ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : s.interviewStatus === "Selected" ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        <MdCheckCircleOutline className="text-xs" /> {s.interviewStatus}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        ❗ No Interview Scheduled
                      </span>
                    )}

                    <span className="text-[10px] text-gray-400 ml-auto font-medium">
                      {formatDate(s.lastActivity)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-3.5 text-left">Student</th>
                  <th className="px-6 py-3.5 text-left">Readiness Status</th>
                  <th className="px-6 py-3.5 text-left">Interview Status</th>
                  <th className="px-6 py-3.5 text-left">Last Activity</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredReadyStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400 text-sm font-medium">
                      No ready students match search
                    </td>
                  </tr>
                ) : (
                  filteredReadyStudents.map((s) => (
                    <tr
                      key={s.studentId}
                      onClick={() => navigate(`/student-profile/${s.studentId}`)}
                      className="hover:bg-orange-50/50 cursor-pointer transition duration-150 group"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 group-hover:text-orange-600 transition">{s.name}</p>
                            <p className="text-[10px] text-gray-400 font-medium">{s.prkey}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-3.5">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                          s.readinessStatus === "Ready for Interview"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                          {s.readinessStatus || "Ready for Placement"}
                        </span>
                      </td>

                      <td className="px-6 py-3.5">
                        {s.hasInterview ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            s.interviewStatus === "Ongoing"   ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : s.interviewStatus === "Selected" ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            <MdCheckCircleOutline /> {s.interviewStatus}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                            ❗ No Interview Scheduled
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-3.5 text-gray-500 text-xs font-medium">
                        {formatDate(s.lastActivity)}
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        <button className="text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1 rounded-lg transition">
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Table 2: Recent Department Placements ─────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-gray-800 text-sm sm:text-base">Recent Department Placements</h3>
              <p className="text-xs text-gray-500">Live feed of students who secured job offers in {deptMeta.name}</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 self-start sm:self-auto">
              {recentPlacements.length} Confirmed Placements
            </span>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-gray-100">
            {recentPlacements.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs font-medium">
                No recent placements recorded yet
              </div>
            ) : (
              recentPlacements.map((p) => (
                <div
                  key={p.studentId}
                  onClick={() => navigate(`/student-profile/${p.studentId}`)}
                  className="p-3.5 space-y-2 active:bg-emerald-50/40 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {p.studentName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-gray-800 truncate">{p.studentName}</p>
                        <p className="text-[10px] text-gray-400">{p.prkey}</p>
                      </div>
                    </div>
                    <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px] shrink-0 border border-emerald-100">
                      {formatSalary(p.salary)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="font-bold text-gray-700 truncate">{p.companyName}</span>
                    <span className="text-[10px] text-gray-400 shrink-0 font-medium">{formatDate(p.placedDate)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-3.5 text-left">Student</th>
                  <th className="px-6 py-3.5 text-left">Hiring Company</th>
                  <th className="px-6 py-3.5 text-left">Offered CTC</th>
                  <th className="px-6 py-3.5 text-left">Placed Date</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentPlacements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400 text-sm font-medium">
                      No recent placements recorded yet
                    </td>
                  </tr>
                ) : (
                  recentPlacements.map((p) => (
                    <tr
                      key={p.studentId}
                      onClick={() => navigate(`/student-profile/${p.studentId}`)}
                      className="hover:bg-emerald-50/40 cursor-pointer transition duration-150 group"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {p.studentName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 group-hover:text-emerald-600 transition">{p.studentName}</p>
                            <p className="text-[10px] text-gray-400 font-medium">{p.prkey}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 font-bold text-gray-700">
                        {p.companyName}
                      </td>

                      <td className="px-6 py-3.5">
                        <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-xs">
                          {formatSalary(p.salary)}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-gray-500 text-xs font-medium">
                        {formatDate(p.placedDate)}
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        <button className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-lg transition">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DepartmentPlacementDetail;
