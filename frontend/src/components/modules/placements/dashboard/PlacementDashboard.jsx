import React, { useState, useEffect } from "react";
import { 
  MdPeople, MdCheckCircle, MdWork, MdTrendingUp, MdPercent, 
  MdRefresh, MdFileDownload, MdFilterList, MdSearch, MdClose,
  MdAttachMoney, MdBusinessCenter
} from "react-icons/md";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Header from "../../../shared/sidebar/Header";
import StatsCard from "./StatsCard";
import DepartmentTable from "./DepartmentTable";
import PlacementFunnel from "./PlacementFunnel";
import TopCompanies from "./TopCompanies";
import AlertBox from "./AlertBox";
import { useGetAllSessionsQuery } from "../../../../redux/api/authApi";

// ── Dummy / Demo Data ─────────────────────────────────────────
const DUMMY_OVERVIEW = {
  totalStudents: 120,
  readyStudents: 45,
  interviewRunning: 18,
  totalPlaced: 85,
  placementPercentage: 70.83,
};

const DUMMY_DEPARTMENTS = [
  { subDepartmentId: "6a0c462fb827b322a78d5727", subDepartmentName: "ITEG", subDepartmentCode: "ITEG", totalStudents: 40, placedStudents: 32, placementPercentage: 80.0 },
  { subDepartmentId: "6a6476a55a76e696c8d7e64b", subDepartmentName: "UIUX", subDepartmentCode: "UI/UX", totalStudents: 20, placedStudents: 15, placementPercentage: 75.0 },
  { subDepartmentId: "6a5f4cbf24be9c4955b306dd", subDepartmentName: "ITEG - Software Engineering", subDepartmentCode: "SE", totalStudents: 35, placedStudents: 25, placementPercentage: 71.4 },
  { subDepartmentId: "6a5f4cbf24be9c4955b306e0", subDepartmentName: "AI & Data Science", subDepartmentCode: "AI/DS", totalStudents: 25, placedStudents: 18, placementPercentage: 72.0 },
  { subDepartmentId: "6a0eebd80e812b062d541ec4", subDepartmentName: "MEG", subDepartmentCode: "MEG", totalStudents: 20, placedStudents: 6, placementPercentage: 30.0 },
  { subDepartmentId: "6a23de703ae885bdae033748", subDepartmentName: "FTP", subDepartmentCode: "FTP", totalStudents: 15, placedStudents: 10, placementPercentage: 66.7 },
];

const DUMMY_FUNNEL = [
  { stage: 'Total Eligible Batch', count: 120, fill: '#3b82f6' },
  { stage: 'Industry Ready',      count: 45,  fill: '#06b6d4' },
  { stage: 'Interview Process',   count: 18,  fill: '#f59e0b' },
  { stage: 'Offers Confirmed',    count: 85,  fill: '#10b981' },
];

const DUMMY_COMPANIES = [
  { companyName: "TCS Pvt Ltd",       totalHires: 22, avgSalary: 450000 },
  { companyName: "Infosys",           totalHires: 18, avgSalary: 420000 },
  { companyName: "Wipro",             totalHires: 15, avgSalary: 400000 },
  { companyName: "HCL Technologies",  totalHires: 12, avgSalary: 380000 },
  { companyName: "Tech Mahindra",     totalHires: 8,  avgSalary: 360000 },
];

const DUMMY_ALERTS = {
  studentsReadyButNoInterview: 12,
  lowestPerformingDepartment: { subDepartmentId: "6a0eebd80e812b062d541ec4", name: "MEG", placementPercentage: 30.0 },
};

// Monthly placement trend for Recharts
const PLACEMENT_TREND_DATA = [
  { month: 'Jul', drives: 4, placed: 8 },
  { month: 'Aug', drives: 7, placed: 15 },
  { month: 'Sep', drives: 12, placed: 24 },
  { month: 'Oct', drives: 10, placed: 38 },
  { month: 'Nov', drives: 15, placed: 55 },
  { month: 'Dec', drives: 18, placed: 72 },
  { month: 'Jan', drives: 14, placed: 85 },
];

const PlacementDashboard = () => {
  const [loading, setLoading] = useState(false);
  const { data: sessionsData } = useGetAllSessionsQuery(true);
  const sessionsList = sessionsData?.data || [];

  const [academicYear, setAcademicYear] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("All");

  useEffect(() => {
    if (sessionsList.length > 0 && !academicYear) {
      const activeSess = sessionsList.find(s => s.isActive || s.status === 'active') || sessionsList[0];
      if (activeSess) {
        setAcademicYear(activeSess.name.startsWith("AY") ? activeSess.name : `AY ${activeSess.name}`);
      }
    }
  }, [sessionsList, academicYear]);

  const overview    = DUMMY_OVERVIEW;
  const departments = selectedDeptFilter === "All" 
    ? DUMMY_DEPARTMENTS 
    : DUMMY_DEPARTMENTS.filter(d => d.subDepartmentName === selectedDeptFilter);
  const funnel      = DUMMY_FUNNEL;
  const companies   = DUMMY_COMPANIES;
  const alerts      = DUMMY_ALERTS;

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  const handleDownloadReport = () => {
    window.print();
  };

  const STATS = [
    { 
      title: "Total Students",     
      value: overview.totalStudents,                    
      icon: <MdPeople />,      
      color: "blue",
      trend: "↗ +8.5%",
      trendColor: "text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded",
      sub: "total enrolled batch"
    },
    { 
      title: "Placement Ready",     
      value: overview.readyStudents,                    
      icon: <MdCheckCircle />, 
      color: "green",
      trend: "↗ +12.3%",
      trendColor: "text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded",
      sub: "cleared readiness evaluation"
    },
    { 
      title: "Active Drives / Interviews", 
      value: overview.interviewRunning,                 
      icon: <MdWork />,        
      color: "orange",
      trend: "⚡ 5 Active Drives",
      trendColor: "text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded",
      sub: "currently in progress"
    },
    { 
      title: "Total Students Placed",       
      value: overview.totalPlaced,                      
      icon: <MdTrendingUp />,  
      color: "purple",
      trend: "↗ +15.4%",
      trendColor: "text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded",
      sub: "confirmed job offers"
    },
    { 
      title: "Overall Placement %",        
      value: `${overview.placementPercentage}%`,        
      icon: <MdPercent />,     
      color: "teal",
      trend: "↗ +4.2%",
      trendColor: "text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded",
      sub: "target benchmark > 75%"
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
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        
        {/* Top Control & Filter Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <MdFilterList className="text-base text-orange-500" /> Filters:
            </span>

            {/* Active Chip */}
            <span className="border border-orange-200 bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs">
              Academic Year: {academicYear}
            </span>

            {selectedDeptFilter !== "All" && (
              <span className="border border-blue-200 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                Dept: {selectedDeptFilter}
                <MdClose className="cursor-pointer text-sm hover:text-blue-900" onClick={() => setSelectedDeptFilter("All")} />
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Academic Year Select */}
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition cursor-pointer"
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

            {/* Department Select */}
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
            >
              <option value="All">All Departments</option>
              <option value="ITEG">ITEG</option>
              <option value="UIUX">UIUX</option>
              <option value="ITEG - Software Engineering">ITEG - Software Engineering</option>
              <option value="AI & Data Science">AI & Data Science</option>
              <option value="MEG">MEG</option>
              <option value="FTP">FTP</option>
            </select>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              title="Refresh Data"
              className="p-2 border border-gray-200 rounded-xl text-gray-600 hover:text-orange-600 hover:border-orange-200 bg-white transition shadow-xs"
            >
              <MdRefresh className={`text-lg ${loading ? "animate-spin text-orange-500" : ""}`} />
            </button>

            {/* Export Report */}
            <button
              onClick={handleDownloadReport}
              className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold hover:shadow-md hover:from-orange-600 hover:to-amber-600 transition flex items-center gap-1.5 shadow-sm"
            >
              <MdFileDownload className="text-base" /> Export Report
            </button>
          </div>
        </div>

        {/* ── Top Row: 5 Stat Cards ─────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {STATS.map((s) => (
            <StatsCard 
              key={s.title} 
              title={s.title} 
              value={s.value} 
              icon={s.icon} 
              color={s.color} 
              trend={s.trend}
              trendColor={s.trendColor}
              sub={s.sub}
            />
          ))}
        </div>

        {/* ── Middle Row: Recharts Placement Trend + Funnel Pipeline ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Recharts Area Chart (7 cols) */}
          <div className="xl:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="font-bold text-gray-800 text-base">Monthly Placement Growth & Drives</h3>
                <p className="text-xs text-gray-500 mt-0.5">Cumulative placed students vs placement drives conducted</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-orange-600">
                  <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> Total Placed
                </span>
                <span className="flex items-center gap-1.5 text-blue-600">
                  <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Active Drives
                </span>
              </div>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={PLACEMENT_TREND_DATA} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
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
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8">
            <DepartmentTable data={departments} loading={loading} />
          </div>
          <div className="xl:col-span-4">
            <AlertBox data={alerts} loading={loading} />
          </div>
        </div>

        {/* ── Fourth Row: Top Hiring Companies + Package Analytics ─ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Top Companies (8 cols) */}
          <div className="lg:col-span-8">
            <TopCompanies data={companies} loading={loading} />
          </div>

          {/* CTC Package Highlights (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg text-lg">
                <MdAttachMoney />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-base">Package & CTC Highlights</h3>
                <p className="text-xs text-gray-500">Highest & average salary statistics</p>
              </div>
            </div>

            <div className="space-y-4 my-2">
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white shadow-md">
                <p className="text-xs uppercase tracking-wider font-bold opacity-80">Highest Package Offered</p>
                <p className="text-3xl font-extrabold mt-1">₹18.0 LPA</p>
                <p className="text-xs mt-1 font-medium opacity-90">Offered by TCS Digital & Microsoft</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-blue-50/80 border border-blue-100 rounded-xl">
                  <p className="text-[11px] font-bold text-blue-600 uppercase">Average CTC</p>
                  <p className="text-xl font-extrabold text-gray-800 mt-0.5">₹4.2 LPA</p>
                  <p className="text-[10px] text-gray-400">across all drives</p>
                </div>
                <div className="p-3.5 bg-purple-50/80 border border-purple-100 rounded-xl">
                  <p className="text-[11px] font-bold text-purple-600 uppercase">Drives Conducted</p>
                  <p className="text-xl font-extrabold text-gray-800 mt-0.5">28 Companies</p>
                  <p className="text-[10px] text-gray-400">this academic year</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Updated live from placement records</span>
              <span className="font-bold text-emerald-600">88% Acceptance Rate</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PlacementDashboard;