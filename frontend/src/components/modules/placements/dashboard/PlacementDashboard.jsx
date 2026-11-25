import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  MdPeople, MdCheckCircle, MdWork, MdTrendingUp, MdPercent, 
  MdRefresh, MdFileDownload,
  MdAttachMoney, MdStars
} from "react-icons/md";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Header from "../../../shared/sidebar/Header";
import StatsCard from "./StatsCard";
import DepartmentTable from "./DepartmentTable";
import PlacementFunnel from "./PlacementFunnel";
import TopCompanies from "./TopCompanies";
import SelectDropdown from "../../../shared/form-fields/SelectDropdown";
import { 
  useGetAllSessionsQuery,
  useGetAllSubdepartmentsQuery,
  useGetGlobalPlacementDashboardQuery 
} from "../../../../redux/api/authApi";
import { usePersistentState } from "../../../../hooks/usePersistentFilters";

const PlacementDashboard = () => {
  const navigate = useNavigate();

  const { data: sessionsData } = useGetAllSessionsQuery(true);
  const sessionsList = useMemo(() => sessionsData?.data || [], [sessionsData]);

  const { data: subDeptsData } = useGetAllSubdepartmentsQuery();
  const subDeptsList = useMemo(() => subDeptsData?.data || [], [subDeptsData]);

  const [selectedSessionId, setSelectedSessionId] = usePersistentState("placement_dashboard_session", "");
  const [selectedDeptFilter, setSelectedDeptFilter] = usePersistentState("placement_dashboard_dept", "All");

  useEffect(() => {
    const stored = sessionStorage.getItem("filter_val_placement_dashboard_session");
    if (stored === null && sessionsList.length > 0 && !selectedSessionId) {
      const activeSess = sessionsList.find(s => s.isActive || s.status === "active") || sessionsList[0];
      if (activeSess) {
        setSelectedSessionId(activeSess._id);
      }
    }
  }, [sessionsList, selectedSessionId, setSelectedSessionId]);

  const activeSessionObj = sessionsList.find(s => s._id === selectedSessionId);
  const activeSessionLabel = activeSessionObj 
    ? (activeSessionObj.name.startsWith("AY") ? activeSessionObj.name : `AY ${activeSessionObj.name}`)
    : (selectedSessionId ? "Selected Year" : "All Academic Years");

  // Real-time API query
  const { 
    data: responseData, 
    isLoading, 
    isFetching, 
    refetch 
  } = useGetGlobalPlacementDashboardQuery({
    sessionId: selectedSessionId,
    subDepartmentId: selectedDeptFilter,
  });

  const dashboardData = responseData?.data || {};
  const overview = dashboardData.overview || {
    totalStudents: 0,
    readyStudents: 0,
    interviewRunning: 0,
    totalPlaced: 0,
    placementPercentage: 0,
  };
  const funnel = dashboardData.funnel || {
    ready: 0,
    readyPlacement: 0,
    readyDrive: 0,
    interview: 0,
    selected: 0,
    placed: 0,
  };
  const departments = dashboardData.departments || [];
  const companies = dashboardData.companies || [];
  const monthlyTrend = dashboardData.monthlyTrend || [];
  const packageHighlights = dashboardData.packageHighlights || {
    highestPackage: 0,
    highestPackageCompany: "—",
    averageSalary: 0,
    drivesConducted: 0,
    acceptanceRate: 0,
  };

  const loading = isLoading || isFetching;

  const handleRefresh = () => {
    refetch();
  };

  const handleDownloadReport = () => {
    window.print();
  };

  const formatLPA = (amount) => {
    if (!amount || amount <= 0) return "—";
    return `₹${(amount / 100000).toFixed(1)} LPA`;
  };

  // Cohesive 5 KPI Cards aligned with the software design system
  const STATS = [
    { 
      title: "Total Batch Strength",     
      value: overview.totalStudents,                    
      icon: MdPeople,      
      color: "slate",
      trend: overview.totalStudents > 0 ? `${overview.totalStudents} Enrolled` : "No Students",
      trendColor: "text-slate-700 bg-slate-100 border-slate-200",
      sub: "graduating cohort",
      onClick: () => navigate("/readiness-status")
    },
    { 
      title: "Placement Ready Pool",     
      value: overview.readyStudents,                    
      icon: MdCheckCircle, 
      color: "orange",
      trend: overview.totalStudents > 0 
        ? `${Math.round((overview.readyStudents / overview.totalStudents) * 100)}% of batch`
        : "0% of batch",
      trendColor: "text-orange-700 bg-orange-50 border-orange-200",
      sub: "cleared syllabus & criteria",
      onClick: () => navigate("/readiness-status")
    },
    { 
      title: "Active In Drives / Interviews", 
      value: overview.interviewRunning,                 
      icon: MdWork,        
      color: "amber",
      trend: `${overview.interviewRunning} in progress`,
      trendColor: "text-amber-700 bg-amber-50 border-amber-200",
      sub: "in active rounds",
      onClick: () => navigate("/readiness-status")
    },
    { 
      title: "Confirmed Placements",       
      value: overview.totalPlaced,                      
      icon: MdTrendingUp,  
      color: "green",
      trend: `${overview.totalPlaced} Offers`,
      trendColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
      sub: "published campus offers",
      onClick: () => navigate("/placement-post")
    },
    { 
      title: "Overall Placement Rate",        
      value: `${overview.placementPercentage}%`,        
      icon: MdPercent,     
      color: "orange",
      trend: `${overview.totalPlaced} of ${overview.totalStudents} placed`,
      trendColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
      sub: "pool conversion rate",
      onClick: () => navigate("/placement-post")
    },
  ];

  return (
    <>
      <Header
        title="Placement Analytics & Executive Dashboard"
        showBack={false}
        breadcrumbs={[
          { label: "Placements" },
          { label: "Executive Dashboard" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              onClick={handleRefresh}
              title="Refresh Dashboard Data"
              className="w-9 h-9 flex items-center justify-center border border-slate-200 rounded-xl text-slate-600 hover:text-orange-600 hover:border-orange-300 bg-white transition shadow-2xs cursor-pointer active:scale-95"
            >
              <MdRefresh className={`text-lg ${loading ? "animate-spin text-orange-500" : ""}`} />
            </button>

            {/* Print / Export Report */}
            <button
              onClick={handleDownloadReport}
              className="bg-orange-500 hover:bg-orange-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
              title="Print or Export Dashboard Summary"
            >
              <MdFileDownload className="text-base" />
              <span className="hidden sm:inline">Print Report</span>
            </button>
          </div>
        }
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
          {/* Academic Year Select */}
          <div className="w-full sm:w-48">
            <SelectDropdown
              value={selectedSessionId}
              onChange={(val) => setSelectedSessionId(val)}
              options={[
                { value: "", label: "All Academic Years" },
                ...sessionsList.map((s) => {
                  const label = s.name.startsWith("AY") ? s.name : `AY ${s.name}`;
                  const statusText = s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : (s.isActive ? "Active" : "Inactive");
                  return {
                    value: s._id,
                    label: `${label} (${statusText})`
                  };
                })
              ]}
              placeholder="Academic Year"
            />
          </div>

          {/* Department Select */}
          <div className="w-full sm:w-48">
            <SelectDropdown
              value={selectedDeptFilter}
              onChange={(val) => setSelectedDeptFilter(val)}
              options={[
                { value: "All", label: "All Departments" },
                ...subDeptsList.map((dept) => ({
                  value: dept._id,
                  label: dept.name
                }))
              ]}
              placeholder="All Departments"
            />
          </div>
        </div>
      </Header>

      <div className="bg-slate-50 min-h-screen pb-16">
        {/* Main Content Container */}
        <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">

          {/* ── Row 1: 5 Executive KPI Metric Cards (Uniform Alignment) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 items-stretch">
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
                className={`h-full ${idx === STATS.length - 1 ? "col-span-2 sm:col-span-2 lg:col-span-1" : ""}`}
              />
            ))}
          </div>

          {/* ── Row 2: Monthly Placement Trend Area Chart + Placement Pipeline Funnel (Stretched Equal Height) ── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 items-stretch">
            {/* Recharts Area Chart (7 cols) */}
            <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-6 flex flex-col justify-between hover:shadow-xs transition h-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Monthly Placement Trend & Drives
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    Cumulative placed offers vs campus recruitment drives conducted
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-orange-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> Placed Offers
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" /> Campus Drives
                  </span>
                </div>
              </div>

              <div className="w-full h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="placedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="drivesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748b" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#64748b" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#ffffff", 
                        borderRadius: "14px", 
                        borderColor: "#e2e8f0", 
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.08)",
                        fontSize: "12px",
                        fontWeight: "600"
                      }}
                    />
                    <Area type="monotone" dataKey="placed" name="Placed Students" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#placedGradient)" />
                    <Area type="monotone" dataKey="drives" name="Campus Drives" stroke="#64748b" strokeWidth={2} fillOpacity={1} fill="url(#drivesGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Real-time academic session trend</span>
                <span className="text-slate-600 font-semibold">{activeSessionLabel}</span>
              </div>
            </div>

            {/* Funnel Pipeline (5 cols) */}
            <div className="xl:col-span-5 flex flex-col h-full">
              <PlacementFunnel data={funnel} loading={loading} className="h-full" />
            </div>
          </div>

          {/* ── Row 3: Department Placement Performance Table (Full-Width, Direct Departments) ── */}
          <div className="w-full">
            <DepartmentTable data={departments} loading={loading} />
          </div>

          {/* ── Row 4: Top Corporate Recruiters + CTC Package Highlights (Stretched Equal Height) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
            {/* Top Companies (7 cols) */}
            <div className="lg:col-span-7 flex flex-col h-full">
              <TopCompanies data={companies} loading={loading} className="h-full" />
            </div>

            {/* CTC Package Highlights (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-6 flex flex-col justify-between hover:shadow-xs transition h-full">
              <div>
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/80 flex items-center justify-center text-lg shrink-0 shadow-2xs">
                    <MdAttachMoney />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">CTC & Salary Highlights</h3>
                    <p className="text-[11px] sm:text-xs text-slate-500">Highest package & compensation stats</p>
                  </div>
                </div>

                <div className="space-y-3.5 my-2">
                  {/* Top Highlight Box: Highest Package Offered */}
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm relative overflow-hidden border border-slate-800">
                    <div className="relative z-10">
                      <p className="text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold text-orange-400">
                        Highest Package Offered
                      </p>
                      <p className="text-2xl sm:text-3xl font-black mt-1 tracking-tight text-white">
                        {formatLPA(packageHighlights.highestPackage)}
                      </p>
                      <p className="text-xs mt-1.5 font-medium text-slate-300 truncate">
                        {packageHighlights.highestPackage > 0 && packageHighlights.highestPackageCompany !== "—"
                          ? `Offered by ${packageHighlights.highestPackageCompany}`
                          : "No placement offers recorded yet"}
                      </p>
                    </div>
                    <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-10 text-white pointer-events-none">
                      <MdStars size={110} />
                    </div>
                  </div>

                  {/* Sub Metrics: Average CTC & Drives */}
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    <div className="p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-xl">
                      <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Average CTC</p>
                      <p className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                        {formatLPA(packageHighlights.averageSalary)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">verified offers</p>
                    </div>
                    <div className="p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-xl">
                      <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Campus Drives</p>
                      <p className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                        {packageHighlights.drivesConducted} Drives
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">drives conducted</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversion Rate Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Placement conversion</span>
                <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                  {packageHighlights.acceptanceRate}% Conversion Rate
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default PlacementDashboard;
