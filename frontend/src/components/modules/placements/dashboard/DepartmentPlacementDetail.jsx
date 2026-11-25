import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  MdPeople, MdCheckCircle, MdWork, MdTrendingUp, 
  MdWarningAmber, MdBlock, MdFilterList,
  MdRefresh, MdFileDownload, MdSearch, MdCheckCircleOutline, MdClose
} from "react-icons/md";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Header from "../../../shared/sidebar/Header";
import StatsCard from "./StatsCard";
import PlacementFunnel from "./PlacementFunnel";
import StatusBreakdown from "./StatusBreakdown";
import TopCompanies from "./TopCompanies";
import EmptyState from "../../../shared/empty-state/EmptyState";
import SelectDropdown from "../../../shared/form-fields/SelectDropdown";
import { 
  useGetAllSessionsQuery,
  useGetDeptPlacementDashboardQuery 
} from "../../../../redux/api/authApi";
import { usePersistentState } from "../../../../hooks/usePersistentFilters";

const formatSalary = (n) => n ? `₹${(n / 100000).toFixed(1)} LPA` : "—";
const formatDate   = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const DepartmentPlacementDetail = () => {
  const { subDepartmentId } = useParams();
  const navigate = useNavigate();
  
  const [selectedSessionId, setSelectedSessionId] = usePersistentState(`dept_placement_session_${subDepartmentId || "all"}`, "");
  const [selectedLevel, setSelectedLevel] = usePersistentState(`dept_placement_level_${subDepartmentId || "all"}`, "All");
  const [searchTerm, setSearchTerm] = usePersistentState(`dept_placement_search_${subDepartmentId || "all"}`, "");

  const { data: sessionsData } = useGetAllSessionsQuery(true);
  const sessionsList = useMemo(() => sessionsData?.data || [], [sessionsData]);

  useEffect(() => {
    const stored = sessionStorage.getItem(`filter_val_dept_placement_session_${subDepartmentId || "all"}`);
    if (stored === null && sessionsList.length > 0 && !selectedSessionId) {
      const activeSess = sessionsList.find(s => s.isActive || s.status === 'active') || sessionsList[0];
      if (activeSess) {
        setSelectedSessionId(activeSess._id);
      }
    }
  }, [sessionsList, selectedSessionId, setSelectedSessionId, subDepartmentId]);

  const activeSessionObj = sessionsList.find(s => s._id === selectedSessionId);
  const activeSessionLabel = activeSessionObj 
    ? (activeSessionObj.name.startsWith("AY") ? activeSessionObj.name : `AY ${activeSessionObj.name}`)
    : (selectedSessionId ? "Selected Year" : "All Years");

  // Real-time department placement API query
  const { 
    data: responseData, 
    isLoading, 
    isFetching, 
    refetch 
  } = useGetDeptPlacementDashboardQuery({
    subDepartmentId,
    sessionId: selectedSessionId,
    level: selectedLevel
  });

  const deptData = responseData?.data || {};
  const deptMeta = deptData.subDepartment || { name: "Department", code: "" };
  const overview = deptData.overview || {
    totalStudents: 0,
    readyStudents: 0,
    interviewRunning: 0,
    placedStudents: 0,
    placementPercentage: 0,
  };
  const funnel = deptData.funnel || {
    ready: 0,
    interview: 0,
    selected: 0,
    placed: 0,
  };
  const breakdown = deptData.statusBreakdown || {};
  const alerts = deptData.alerts || {
    readyButNoInterview: 0,
    multipleRejections: 0,
    placementPercentage: 0,
  };
  const readyStudents = deptData.readyStudentsNeedsAttention || [];
  const recentPlacements = deptData.recentPlacements || [];
  const topCompanies = deptData.topCompanies || [];
  const monthlyTrend = deptData.monthlyTrend || [];

  const loading = isLoading || isFetching;

  const handleRefresh = () => {
    refetch();
  };

  const handleDownloadReport = () => {
    window.print();
  };

  const filteredReadyStudents = readyStudents.filter(s =>
    (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.prkey || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const STATS = [
    { 
      title: "Total Dept Batch",     
      value: overview.totalStudents,       
      icon: <MdPeople />,      
      color: "slate",
      trend: overview.totalStudents > 0 ? `${overview.totalStudents} Enrolled` : "No Batch",
      trendColor: "text-slate-700 bg-slate-100 border-slate-200",
      sub: "enrolled in department",
      onClick: () => navigate(`/student-detail-table/${subDepartmentId}`)
    },
    { 
      title: "Ready for Placement",     
      value: overview.readyStudents,        
      icon: <MdCheckCircle />, 
      color: "orange",
      trend: overview.totalStudents > 0 
        ? `${Math.round((overview.readyStudents / overview.totalStudents) * 100)}% Ready` 
        : "Ready pool",
      trendColor: "text-orange-700 bg-orange-50 border-orange-200",
      sub: "cleared syllabus evaluation",
      onClick: () => navigate(`/readiness-status?status=Ready for Placement&subDepartmentId=${subDepartmentId}`)
    },
    { 
      title: "Ready for Drive",     
      value: breakdown.readyForDrive || breakdown.readyForInterview || 0,        
      icon: <MdCheckCircleOutline />, 
      color: "orange",
      trend: "Drive Shortlist",
      trendColor: "text-orange-700 bg-orange-50 border-orange-200",
      sub: "mapped to campus drives",
      onClick: () => navigate(`/readiness-status?status=Ready for Drive&subDepartmentId=${subDepartmentId}`)
    },
    { 
      title: "In Interview Rounds", 
      value: overview.interviewRunning,     
      icon: <MdWork />,        
      color: "amber",
      trend: `${overview.interviewRunning} active`,
      trendColor: "text-amber-700 bg-amber-50 border-amber-200",
      sub: "in live drive interviews",
      onClick: () => navigate(`/readiness-status?status=Interview&subDepartmentId=${subDepartmentId}`)
    },
    { 
      title: "Confirmed Placements",    
      value: overview.placedStudents,       
      icon: <MdTrendingUp />,  
      color: "green",
      trend: `${overview.placementPercentage}% Rate`,
      trendColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
      sub: "verified job offers",
      onClick: () => navigate(`/readiness-status?status=Placed&subDepartmentId=${subDepartmentId}`)
    },
  ];

  return (
    <>
      <Header
        title={`${deptMeta.name} — Placement Dashboard`}
        showBack={false}
        breadcrumbs={[
          { label: "Placements", path: "/placements/dashboard" },
          { label: "Dashboard",  path: "/placements/dashboard" },
          { label: deptMeta.name },
        ]}
      />

      <div className="bg-slate-50 min-h-screen pb-16">
        <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">

          {/* Header Title Banner & Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3.5 sm:space-y-4">
            {/* Top Banner Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-100 pb-3.5 sm:pb-4">
              <div className="flex items-start sm:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">{deptMeta.name}</h1>
                    {deptMeta.code && (
                      <span className="bg-orange-50 text-orange-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-orange-200">
                        {deptMeta.code}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    Department placement metrics, readiness tracking, and company recruitment status
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                <button
                  onClick={handleRefresh}
                  className="p-2.5 border border-slate-200 rounded-xl text-slate-600 hover:text-orange-600 hover:border-orange-300 bg-white transition shadow-2xs cursor-pointer active:scale-95"
                  title="Refresh Department Data"
                >
                  <MdRefresh className={`text-lg ${loading ? "animate-spin text-orange-500" : ""}`} />
                </button>
                <button
                  onClick={handleDownloadReport}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <MdFileDownload className="text-base" /> Print Dept Report
                </button>
              </div>
            </div>

            {/* Controls & Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <MdFilterList className="text-base text-orange-500" /> Filters:
                </span>
                <span className="border border-orange-200 bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                  AY: {activeSessionLabel}
                  {selectedSessionId && (
                    <MdClose 
                      className="cursor-pointer text-sm hover:text-orange-950 ml-0.5" 
                      onClick={() => setSelectedSessionId("")} 
                      title="Clear Year Filter"
                    />
                  )}
                </span>
                {selectedLevel !== "All" && (
                  <span className="border border-slate-200 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                    Level: {selectedLevel}
                    <MdClose className="cursor-pointer text-sm hover:text-slate-900 ml-0.5" onClick={() => setSelectedLevel("All")} />
                  </span>
                )}
                {searchTerm && (
                  <span className="border border-slate-200 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                    Search: "{searchTerm}"
                    <MdClose className="cursor-pointer text-sm hover:text-slate-900 ml-0.5" onClick={() => setSearchTerm("")} />
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                <div className="w-full sm:w-48">
                  <SelectDropdown
                    value={selectedSessionId}
                    onChange={(val) => setSelectedSessionId(val)}
                    options={[
                      { value: "", label: "All Academic Years" },
                      ...sessionsList.map((s) => {
                        const label = s.name.startsWith("AY") ? s.name : `AY ${s.name}`;
                        const statusText = s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : (s.isActive ? 'Active' : 'Inactive');
                        return {
                          value: s._id,
                          label: `${label} (${statusText})`
                        };
                      })
                    ]}
                    placeholder="Academic Year"
                  />
                </div>

                <div className="w-full sm:w-36">
                  <SelectDropdown
                    value={selectedLevel}
                    onChange={(val) => setSelectedLevel(val)}
                    options={[
                      { value: "All", label: "All Levels" },
                      { value: "Level 1", label: "Level 1" },
                      { value: "Level 2", label: "Level 2" },
                      { value: "Level 3", label: "Level 3" },
                      { value: "Level 4", label: "Level 4" },
                    ]}
                    placeholder="All Levels"
                  />
                </div>
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
            <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-6 flex flex-col justify-between hover:shadow-xs transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">{deptMeta.name} — Placement Growth</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Monthly placed hires in {deptMeta.code || deptMeta.name}</p>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                  {overview.placementPercentage}% Conversion
                </span>
              </div>

              <div className="w-full h-60 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="deptPlacedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        borderRadius: '14px', 
                        borderColor: '#e2e8f0', 
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}
                    />
                    <Area type="monotone" dataKey="placed" name="Placed Students" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#deptPlacedGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Academic year tracking</span>
                <span className="text-slate-700 font-semibold">{activeSessionLabel}</span>
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
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-6 hover:shadow-xs transition flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/80 flex items-center justify-center text-lg shrink-0 shadow-2xs">
                    <MdWarningAmber />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Department Insights & Drive Alerts</h3>
                    <p className="text-xs text-slate-500">Live indicators requiring HOD and placement cell action</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3.5 p-3.5 sm:p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl transition hover:border-amber-300">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200 shadow-2xs">
                      <MdWarningAmber className="text-lg" />
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">Ready but No Drive Scheduled</p>
                      <p className="text-xl sm:text-2xl font-black text-amber-800 mt-1">
                        {alerts.readyButNoInterview || 0} <span className="text-xs font-medium text-slate-500">students</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Students fully prepped for placement but not mapped to upcoming interview rounds.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 p-3.5 sm:p-4 bg-rose-50/60 border border-rose-200/80 rounded-xl transition hover:border-rose-300">
                    <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200 shadow-2xs">
                      <MdBlock className="text-lg" />
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">Multiple Rejections</p>
                      <p className="text-xl sm:text-2xl font-black text-rose-800 mt-1">
                        {alerts.multipleRejections || 0} <span className="text-xs font-medium text-slate-500">students</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Students who faced 2 or more rejections in interviews; require mentoring.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 p-3.5 sm:p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl transition hover:border-emerald-300">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200 shadow-2xs">
                      <MdTrendingUp className="text-lg" />
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">Department Placement Rate</p>
                      <p className="text-xl sm:text-2xl font-black text-emerald-800 mt-1">
                        {alerts.placementPercentage || overview.placementPercentage || 0}% <span className="text-xs font-medium text-slate-500">placed</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Current conversion rate for {deptMeta.name}.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
                Monitored against academic targets
              </div>
            </div>

            {/* Top Companies Hiring From Dept */}
            <TopCompanies data={topCompanies} loading={loading} />
          </div>

          {/* ── Table 1: Ready Students — Needs Attention ─────────── */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden hover:shadow-xs transition">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Ready Students — Needs Attention</h3>
                  <span className="bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                    {readyStudents.length} Students
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Students eligible for placements requiring drive mapping or interview scheduling</p>
              </div>

              {/* Quick Search inside Table */}
              <div className="relative w-full sm:w-auto">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 w-full sm:w-56 transition"
                />
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-slate-100">
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
                        <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 font-black text-xs flex items-center justify-center shrink-0 border border-orange-200 shadow-2xs">
                          {(s.name || "S").charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs text-slate-900 truncate">{s.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{s.prkey || "PRN —"}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                        {s.readinessStatus || "Ready"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      {s.hasInterview ? (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {s.interviewStatus || "Interview Active"}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          No Interview Scheduled
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-medium">{formatDate(s.lastActivity)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="px-6 py-3.5">Student</th>
                    <th className="px-6 py-3.5">Readiness Stage</th>
                    <th className="px-6 py-3.5">Interview Status</th>
                    <th className="px-6 py-3.5">Last Activity</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredReadyStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400 text-sm font-medium">
                        {readyStudents.length === 0 
                          ? "No students are currently marked as placement-ready in this department."
                          : "No ready students match search criteria"}
                      </td>
                    </tr>
                  ) : (
                    filteredReadyStudents.map((s) => (
                      <tr
                        key={s.studentId}
                        onClick={() => navigate(`/student-profile/${s.studentId}`)}
                        className="hover:bg-orange-50/25 cursor-pointer transition-colors duration-150 group"
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 font-black text-xs flex items-center justify-center shrink-0 border border-orange-200 shadow-2xs">
                              {(s.name || "S").charAt(0)}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-900 group-hover:text-orange-600 transition">{s.name}</p>
                              {s.prkey && <span className="text-[10px] text-slate-400">{s.prkey}</span>}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-3.5">
                          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                            {s.readinessStatus || "Ready for Placement"}
                          </span>
                        </td>

                        <td className="px-6 py-3.5">
                          {s.hasInterview ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <MdCheckCircleOutline /> {s.interviewStatus || "In Progress"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                              No Interview Scheduled
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-3.5 text-slate-500 text-xs font-medium">
                          {formatDate(s.lastActivity)}
                        </td>

                        <td className="px-6 py-3.5 text-right">
                          <button className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-lg transition cursor-pointer">
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
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden hover:shadow-xs transition">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Recent Department Placements</h3>
                <p className="text-xs text-slate-500">Live feed of students who secured campus job offers in {deptMeta.name}</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                {recentPlacements.length} Confirmed Offers
              </span>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-slate-100">
              {recentPlacements.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    title="No Recent Placements"
                    subtitle="No confirmed placement offers have been recorded yet for this department."
                    compact
                  />
                </div>
              ) : (
                recentPlacements.map((p) => (
                  <div
                    key={p.studentId}
                    onClick={() => navigate(`/student-profile/${p.studentId}`)}
                    className="p-3.5 space-y-2 active:bg-orange-50/40 cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 font-black text-xs flex items-center justify-center shrink-0 border border-orange-200 shadow-2xs">
                          {(p.studentName || "S").charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 truncate">{p.studentName}</p>
                        </div>
                      </div>
                      <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px] shrink-0 border border-emerald-200">
                        {formatSalary(p.salary)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-bold text-slate-700 truncate">{p.companyName}</span>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">{formatDate(p.placedDate)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="px-6 py-3.5">Student</th>
                    <th className="px-6 py-3.5">Hiring Corporate Partner</th>
                    <th className="px-6 py-3.5">Offered Package</th>
                    <th className="px-6 py-3.5">Offer Date</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {recentPlacements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400 text-sm font-medium">
                        No recent placements recorded yet
                      </td>
                    </tr>
                  ) : (
                    recentPlacements.map((p) => (
                      <tr
                        key={p.studentId}
                        onClick={() => navigate(`/student-profile/${p.studentId}`)}
                        className="hover:bg-orange-50/25 cursor-pointer transition-colors duration-150 group"
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 font-black text-xs flex items-center justify-center shrink-0 border border-orange-200 shadow-2xs">
                              {(p.studentName || "S").charAt(0)}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-900 group-hover:text-orange-600 transition">{p.studentName}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-3.5 font-bold text-slate-800">
                          {p.companyName}
                        </td>

                        <td className="px-6 py-3.5">
                          <span className="font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md text-xs">
                            {formatSalary(p.salary)}
                          </span>
                        </td>

                        <td className="px-6 py-3.5 text-slate-500 text-xs font-medium">
                          {formatDate(p.placedDate)}
                        </td>

                        <td className="px-6 py-3.5 text-right">
                          <button className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-lg transition cursor-pointer">
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
    </>
  );
};

export default DepartmentPlacementDetail;
