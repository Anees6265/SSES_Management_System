import React, { useState, useEffect } from "react";
import { 
  MdPeople, MdCheckCircle, MdWork, MdTrendingUp, MdPercent, 
  MdRefresh, MdFileDownload, MdFilterList, MdClose,
  MdAttachMoney
} from "react-icons/md";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Header from "../../../shared/sidebar/Header";
import StatsCard from "./StatsCard";
import DepartmentTable from "./DepartmentTable";
import PlacementFunnel from "./PlacementFunnel";
import TopCompanies from "./TopCompanies";
import AlertBox from "./AlertBox";
import { 
  useGetAllSessionsQuery,
  useGetAllSubdepartmentsQuery,
  useGetGlobalPlacementDashboardQuery 
} from "../../../../redux/api/authApi";

const PlacementDashboard = () => {
  const { data: sessionsData } = useGetAllSessionsQuery(true);
  const sessionsList = sessionsData?.data || [];

  const { data: subDeptsData } = useGetAllSubdepartmentsQuery();
  const subDeptsList = subDeptsData?.data || [];

  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("All");

  useEffect(() => {
    if (sessionsList.length > 0 && !selectedSessionId) {
      const activeSess = sessionsList.find(s => s.isActive || s.status === 'active') || sessionsList[0];
      if (activeSess) {
        setSelectedSessionId(activeSess._id);
      }
    }
  }, [sessionsList, selectedSessionId]);

  const activeSessionObj = sessionsList.find(s => s._id === selectedSessionId);
  const activeSessionLabel = activeSessionObj 
    ? (activeSessionObj.name.startsWith("AY") ? activeSessionObj.name : `AY ${activeSessionObj.name}`)
    : (selectedSessionId ? "Selected Year" : "All Years");

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
      title: "Total Students",     
      value: overview.totalStudents,                    
      icon: <MdPeople />,      
      color: "blue",
      trend: overview.totalStudents > 0 ? `${overview.totalStudents} Batch` : "No Students",
      trendColor: "text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded",
      sub: "total enrolled batch"
    },
    { 
      title: "Placement Ready",     
      value: overview.readyStudents,                    
      icon: <MdCheckCircle />, 
      color: "green",
      trend: overview.totalStudents > 0 
        ? `${Math.round((overview.readyStudents / overview.totalStudents) * 100)}% of batch`
        : "0% of batch",
      trendColor: "text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded",
      sub: "cleared readiness criteria"
    },
    { 
      title: "Active Drives / Interviews", 
      value: overview.interviewRunning,                 
      icon: <MdWork />,        
      color: "orange",
      trend: `${overview.interviewRunning} in progress`,
      trendColor: "text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded",
      sub: "students in interview rounds"
    },
    { 
      title: "Total Students Placed",       
      value: overview.totalPlaced,                      
      icon: <MdTrendingUp />,  
      color: "purple",
      trend: `${overview.totalPlaced} Confirmed`,
      trendColor: "text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded",
      sub: "confirmed job offers"
    },
    { 
      title: "Overall Placement %",        
      value: `${overview.placementPercentage}%`,        
      icon: <MdPercent />,     
      color: "teal",
      trend: `${overview.totalPlaced} of ${overview.totalStudents} placed`,
      trendColor: "text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded",
      sub: "placement conversion rate"
    },
  ];

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <Header
        title="Placement Dashboard"
        breadcrumbs={[
          { label: "Placements" },
          { label: "Dashboard" },
        ]}
      />

      {/* Main Container */}
      <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
        
        {/* Top Control & Filter Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3.5 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <MdFilterList className="text-base text-orange-500" /> Filters:
            </span>

            {/* Active Chip */}
            <span className="border border-orange-200 bg-orange-50 text-orange-700 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1 shadow-xs">
              Academic Year: {activeSessionLabel}
              {selectedSessionId && (
                <MdClose 
                  className="cursor-pointer text-sm hover:text-orange-900 ml-0.5" 
                  onClick={() => setSelectedSessionId("")} 
                  title="Clear Year Filter"
                />
              )}
            </span>

            {selectedDeptFilter !== "All" && (
              <span className="border border-blue-200 bg-blue-50 text-blue-700 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1 shadow-xs">
                Dept: {selectedDeptLabel}
                <MdClose className="cursor-pointer text-sm hover:text-blue-900 ml-0.5" onClick={() => setSelectedDeptFilter("All")} />
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5">
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
              {/* Academic Year Select */}
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full sm:w-auto bg-gray-50 border border-gray-200 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition cursor-pointer"
              >
                <option value="">All Academic Years</option>
                {sessionsList.map((s) => {
                  const label = s.name.startsWith("AY") ? s.name : `AY ${s.name}`;
                  const statusText = s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : (s.isActive ? 'Active' : 'Inactive');
                  return (
                    <option key={s._id} value={s._id}>
                      {label} ({statusText})
                    </option>
                  );
                })}
              </select>

              {/* Department Select */}
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="w-full sm:w-auto bg-gray-50 border border-gray-200 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition cursor-pointer"
              >
                <option value="All">All Departments</option>
                {subDeptsList.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 justify-end">
              {/* Refresh */}
              <button
                onClick={handleRefresh}
                title="Refresh Data"
                className="p-2 border border-gray-200 rounded-xl text-gray-600 hover:text-orange-600 hover:border-orange-200 bg-white transition shadow-xs cursor-pointer"
              >
                <MdRefresh className={`text-lg ${loading ? "animate-spin text-orange-500" : ""}`} />
              </button>

              {/* Export Report */}
              <button
                onClick={handleDownloadReport}
                className="flex-1 sm:flex-initial justify-center bg-gradient-to-r from-orange-500 to-amber-500 text-white px-3.5 sm:px-4 py-1.5 rounded-xl text-xs font-bold hover:shadow-md hover:from-orange-600 hover:to-amber-600 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <MdFileDownload className="text-base" /> Export Report
              </button>
            </div>
          </div>
        </div>

        {/* ── Top Row: 5 Stat Cards (2x2 Grid on mobile with 5th card full-width) ── */}
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
              className={idx === STATS.length - 1 ? "col-span-2 sm:col-span-2 lg:col-span-1" : ""}
            />
          ))}
        </div>

        {/* ── Middle Row: Recharts Placement Trend + Funnel Pipeline ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
          {/* Recharts Area Chart (7 cols) */}
          <div className="xl:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col justify-between hover:shadow-md transition">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
              <div>
                <h3 className="font-bold text-gray-800 text-sm sm:text-base">Monthly Placement Growth & Drives</h3>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">Cumulative placed students vs placement drives conducted</p>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-orange-600">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-orange-500 inline-block" /> Total Placed
                </span>
                <span className="flex items-center gap-1.5 text-blue-600">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500 inline-block" /> Active Drives
                </span>
              </div>
            </div>

            <div className="w-full h-60 sm:h-72">
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
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
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
          <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg text-lg shrink-0">
                <MdAttachMoney />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-sm sm:text-base">Package & CTC Highlights</h3>
                <p className="text-[11px] sm:text-xs text-gray-500">Highest & average salary statistics</p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4 my-2">
              <div className="p-3.5 sm:p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white shadow-md">
                <p className="text-[10px] sm:text-xs uppercase tracking-wider font-bold opacity-80">Highest Package Offered</p>
                <p className="text-2xl sm:text-3xl font-extrabold mt-0.5 sm:mt-1">
                  {formatLPA(packageHighlights.highestPackage)}
                </p>
                <p className="text-[11px] sm:text-xs mt-1 font-medium opacity-90 truncate">
                  {packageHighlights.highestPackage > 0 && packageHighlights.highestPackageCompany !== "—"
                    ? `Offered by ${packageHighlights.highestPackageCompany}`
                    : "No placement offers recorded yet"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div className="p-3 sm:p-3.5 bg-blue-50/80 border border-blue-100 rounded-xl">
                  <p className="text-[10px] sm:text-[11px] font-bold text-blue-600 uppercase">Average CTC</p>
                  <p className="text-lg sm:text-xl font-extrabold text-gray-800 mt-0.5">
                    {formatLPA(packageHighlights.averageSalary)}
                  </p>
                  <p className="text-[10px] text-gray-400">across placed offers</p>
                </div>
                <div className="p-3 sm:p-3.5 bg-purple-50/80 border border-purple-100 rounded-xl">
                  <p className="text-[10px] sm:text-[11px] font-bold text-purple-600 uppercase">Drives Conducted</p>
                  <p className="text-lg sm:text-xl font-extrabold text-gray-800 mt-0.5">
                    {packageHighlights.drivesConducted} Drives
                  </p>
                  <p className="text-[10px] text-gray-400">campus recruitment drives</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] sm:text-xs text-gray-500">
              <span>Live records</span>
              <span className="font-bold text-emerald-600">
                {packageHighlights.acceptanceRate}% Placement Rate
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PlacementDashboard;