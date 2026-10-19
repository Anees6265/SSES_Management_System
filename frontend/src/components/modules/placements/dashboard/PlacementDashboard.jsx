import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  MdPeople, MdCheckCircle, MdWork, MdTrendingUp, MdPercent, 
  MdRefresh, MdFileDownload, MdFilterList, MdClose,
  MdAttachMoney, MdStars, MdApartment, MdSchool
} from "react-icons/md";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Header from "../../../shared/sidebar/Header";
import StatsCard from "./StatsCard";
import DepartmentTable from "./DepartmentTable";
import PlacementFunnel from "./PlacementFunnel";
import TopCompanies from "./TopCompanies";
import AlertBox from "./AlertBox";
import SelectDropdown from "../../../shared/form-fields/SelectDropdown";
import { 
  useGetAllSessionsQuery,
  useGetAllSubdepartmentsQuery,
  useGetGlobalPlacementDashboardQuery 
} from "../../../../redux/api/authApi";

const PlacementDashboard = () => {
  const navigate = useNavigate();

  const { data: sessionsData } = useGetAllSessionsQuery(true);
  const sessionsList = useMemo(() => sessionsData?.data || [], [sessionsData]);

  const { data: subDeptsData } = useGetAllSubdepartmentsQuery();
  const subDeptsList = useMemo(() => subDeptsData?.data || [], [subDeptsData]);

  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("All");

  useEffect(() => {
    if (sessionsList.length > 0 && !selectedSessionId) {
      const activeSess = sessionsList.find(s => s.isActive || s.status === "active") || sessionsList[0];
      if (activeSess) {
        setSelectedSessionId(activeSess._id);
      }
    }
  }, [sessionsList, selectedSessionId]);

  const activeSessionObj = sessionsList.find(s => s._id === selectedSessionId);
  const activeSessionLabel = activeSessionObj 
    ? (activeSessionObj.name.startsWith("AY") ? activeSessionObj.name : `AY ${activeSessionObj.name}`)
    : (selectedSessionId ? "Selected Year" : "All Academic Years");

  const selectedDeptObj = subDeptsList.find(d => d._id === selectedDeptFilter);
  const selectedDeptLabel = selectedDeptObj ? selectedDeptObj.name : selectedDeptFilter;

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
  const alerts = dashboardData.alerts || {
    studentsReadyButNoInterview: 0,
    lowestPerformingDepartment: null,
  };
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

  const STATS = [
    { 
      title: "Total Batch Students",     
      value: overview.totalStudents,                    
      icon: MdPeople,      
      color: "blue",
      trend: overview.totalStudents > 0 ? `${overview.totalStudents} Enrolled` : "No Students",
      trendColor: "text-blue-700 bg-blue-50 border border-blue-100",
      sub: "eligible graduating batch",
      onClick: () => navigate("/readiness-status")
    },
    { 
      title: "Placement Ready Pool",     
      value: overview.readyStudents,                    
      icon: MdCheckCircle, 
      color: "green",
      trend: overview.totalStudents > 0 
        ? `${Math.round((overview.readyStudents / overview.totalStudents) * 100)}% of batch`
        : "0% of batch",
      trendColor: "text-emerald-700 bg-emerald-50 border border-emerald-100",
      sub: "cleared syllabus & readiness",
      onClick: () => navigate("/readiness-status")
    },
    { 
      title: "Active Drives / Interviews", 
      value: overview.interviewRunning,                 
      icon: MdWork,        
      color: "amber",
      trend: `${overview.interviewRunning} in progress`,
      trendColor: "text-amber-700 bg-amber-50 border border-amber-100",
      sub: "students in interview rounds",
      onClick: () => navigate("/readiness-status")
    },
    { 
      title: "Confirmed Placements",       
      value: overview.totalPlaced,                      
      icon: MdTrendingUp,  
      color: "orange",
      trend: `${overview.totalPlaced} Offers`,
      trendColor: "text-orange-700 bg-orange-50 border border-orange-100",
      sub: "published campus offers",
      onClick: () => navigate("/placement-post")
    },
    { 
      title: "Overall Placement %",        
      value: `${overview.placementPercentage}%`,        
      icon: MdPercent,     
      color: "teal",
      trend: `${overview.totalPlaced} of ${overview.totalStudents} placed`,
      trendColor: "text-teal-700 bg-teal-50 border border-teal-100",
      sub: "placement conversion rate",
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
      />

      <div className="bg-slate-50 min-h-screen pb-16">
        {/* Main Container */}
        <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
        
          {/* Top Control & Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <MdFilterList className="text-base text-orange-500" /> Active Scope:
              </span>

              {/* Active Academic Year Chip */}
              <span className="border border-orange-200 bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-2xs">
                Year: {activeSessionLabel}
                {selectedSessionId && (
                  <MdClose 
                    className="cursor-pointer text-sm hover:text-orange-900 ml-0.5" 
                    onClick={() => setSelectedSessionId("")} 
                    title="Clear Year Filter"
                  />
                )}
              </span>

              {/* Active Department Chip */}
              {selectedDeptFilter !== "All" && (
                <span className="border border-blue-200 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-2xs">
                  Dept: {selectedDeptLabel}
                  <MdClose 
                    className="cursor-pointer text-sm hover:text-blue-900 ml-0.5" 
                    onClick={() => setSelectedDeptFilter("All")} 
                    title="Clear Department Filter"
                  />
                </span>
              )}
            </div>

            {/* Filter Dropdowns & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
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

              <div className="flex items-center gap-2 justify-end">
                {/* Refresh */}
                <button
                  onClick={handleRefresh}
                  title="Refresh Dashboard Data"
                  className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:text-orange-600 hover:border-orange-300 bg-white transition shadow-2xs cursor-pointer active:scale-95"
                >
                  <MdRefresh className={`text-lg ${loading ? "animate-spin text-orange-500" : ""}`} />
                </button>

                {/* Export Report */}
                <button
                  onClick={handleDownloadReport}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold hover:shadow-md hover:from-orange-600 hover:to-amber-600 transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                  title="Print or Export Dashboard Summary"
                >
                  <MdFileDownload className="text-base" />
                  <span>Print Report</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Navigation Shortcuts */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Links:</span>
            <button
              onClick={() => navigate("/readiness-status")}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-orange-600 hover:border-orange-300 transition shadow-2xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <MdSchool size={14} className="text-orange-500" /> Placement Candidates
            </button>
            <button
              onClick={() => navigate("/company-details")}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-orange-600 hover:border-orange-300 transition shadow-2xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <MdApartment size={14} className="text-blue-500" /> Recruiting Companies
            </button>
            <button
              onClick={() => navigate("/placement-post")}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-orange-600 hover:border-orange-300 transition shadow-2xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <MdStars size={14} className="text-emerald-500" /> Placed Student Stories
            </button>
          </div>

          {/* ── Top Row: 5 Metric Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-4">
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
                className={idx === STATS.length - 1 ? "col-span-2 sm:col-span-2 lg:col-span-1" : ""}
              />
            ))}
          </div>

          {/* ── Middle Row: Placement Growth Area Chart + Funnel Pipeline ── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
            {/* Recharts Area Chart (7 cols) */}
            <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-6 flex flex-col justify-between hover:shadow-xs transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Monthly Placement Growth & Drives
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    Cumulative placed offers vs campus recruitment drives conducted
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-orange-600">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-orange-500 inline-block" /> Placed Offers
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-600">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500 inline-block" /> Campus Drives
                  </span>
                </div>
              </div>

              <div className="w-full h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="placedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="drivesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#ffffff", 
                        borderRadius: "16px", 
                        borderColor: "#e2e8f0", 
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                        fontSize: "12px",
                        fontWeight: "600"
                      }}
                    />
                    <Area type="monotone" dataKey="placed" name="Placed Students" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#placedGradient)" />
                    <Area type="monotone" dataKey="drives" name="Campus Drives" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#drivesGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Funnel Pipeline (5 cols) */}
            <div className="xl:col-span-5">
              <PlacementFunnel data={funnel} loading={loading} />
            </div>
          </div>

          {/* ── Third Row: Department Table + Alerts ────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
            <div className="xl:col-span-8">
              <DepartmentTable data={departments} loading={loading} />
            </div>
            <div className="xl:col-span-4">
              <AlertBox data={alerts} loading={loading} />
            </div>
          </div>

          {/* ── Fourth Row: Top Hiring Companies + Package Analytics ─ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Top Companies (8 cols) */}
            <div className="lg:col-span-8">
              <TopCompanies data={companies} loading={loading} />
            </div>

            {/* CTC Package Highlights (4 cols) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-6 flex flex-col justify-between hover:shadow-xs transition">
              <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl text-lg shrink-0 border border-emerald-100">
                  <MdAttachMoney />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Package & CTC Highlights</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">Highest & average salary statistics</p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4 my-2">
                <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 rounded-2xl text-white shadow-md relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-[10px] sm:text-xs uppercase tracking-wider font-extrabold opacity-80">
                      Highest Package Offered
                    </p>
                    <p className="text-2xl sm:text-3xl font-black mt-1">
                      {formatLPA(packageHighlights.highestPackage)}
                    </p>
                    <p className="text-xs mt-1.5 font-medium opacity-90 truncate">
                      {packageHighlights.highestPackage > 0 && packageHighlights.highestPackageCompany !== "—"
                        ? `Offered by ${packageHighlights.highestPackageCompany}`
                        : "No placement offers recorded yet"}
                    </p>
                  </div>
                  <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-10 text-white">
                    <MdStars size={120} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <div className="p-3 sm:p-3.5 bg-blue-50/80 border border-blue-100 rounded-xl">
                    <p className="text-[10px] sm:text-[11px] font-bold text-blue-600 uppercase tracking-wider">Average CTC</p>
                    <p className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                      {formatLPA(packageHighlights.averageSalary)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">across verified offers</p>
                  </div>
                  <div className="p-3 sm:p-3.5 bg-purple-50/80 border border-purple-100 rounded-xl">
                    <p className="text-[10px] sm:text-[11px] font-bold text-purple-600 uppercase tracking-wider">Drives Conducted</p>
                    <p className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                      {packageHighlights.drivesConducted} Drives
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">campus recruitment drives</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Verified live offers</span>
                <span className="font-extrabold text-emerald-600">
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