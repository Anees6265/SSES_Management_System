import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  Clock,
  ClipboardList,
  Layers,
  Calendar,
  ArrowRight,
  Search,
  RefreshCw,
  Bell,
  Building2,
  UserX,
  UserCheck,
  ChevronRight,
  Printer,
  ShieldCheck,
  Award,
  BookOpen,
  X
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import Header from "../../shared/sidebar/Header";
import api from "../../../utils/axiosInstance";
import { useGetAllSessionsQuery } from "../../../redux/api/authApi";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";

// ── Clean, Calm Stat Card Component ──────────────────────────
const CleanStatCard = ({
  title,
  value,
  icon: Icon,
  subtitle,
  badgeText,
  badgeType = "neutral", // "neutral", "success", "warning"
  onClick,
  className = "",
}) => {
  const badgeStyles = {
    neutral: "bg-gray-100 text-gray-700 border-gray-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
  }[badgeType] || "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && e.key === "Enter" && onClick()}
      className={`relative overflow-hidden rounded-2xl bg-white border border-gray-200/90 p-4 sm:p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-orange-300 ${
        onClick ? "cursor-pointer group" : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider truncate">
            {title}
          </p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {value ?? 0}
            </h3>
          </div>
          {badgeText && (
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md border ${badgeStyles}`}
              >
                {badgeText}
              </span>
              {subtitle && (
                <span className="text-xs text-gray-400 font-medium truncate">
                  {subtitle}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Clean, Subtle Icon Container */}
        <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-orange-50 border border-orange-100/80 text-orange-600 flex items-center justify-center transition-colors group-hover:bg-orange-500 group-hover:text-white shadow-2xs">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>

      {onClick && (
        <div className="mt-3.5 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-400 group-hover:text-orange-600 transition-colors">
          <span>View records</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </div>
      )}
    </div>
  );
};

// ── Skeleton Loader ──────────────────────────────────────────
const SkeletonLoader = ({ h = "h-32", className = "" }) => (
  <div className={`${h} bg-gray-100/80 rounded-2xl animate-pulse ${className}`} />
);

// ── Course & Year Matrix Table Sub-Component ─────────────────
const CourseYearMatrixTable = ({ matrix }) => {
  const [viewMode, setViewMode] = useState("level"); // "level" (Year-wise) or "session" (Batch-wise)
  const [searchFilter, setSearchFilter] = useState("");

  if (!matrix || !matrix.courses || matrix.courses.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-8 text-center text-gray-400">
        <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-3 text-gray-400">
          <BookOpen className="w-6 h-6" />
        </div>
        <p className="font-semibold text-gray-700 text-sm">No course-wise strength data available.</p>
        <p className="text-xs text-gray-400 mt-1">Enroll students with active courses to view the distribution matrix.</p>
      </div>
    );
  }

  const { courses, sessions, levels, sessionCounts, levelCounts } = matrix;

  const translateLevelName = (name) => {
    if (!name) return "";
    const cleaned = name.trim().toLowerCase();
    if (cleaned.includes("level 1") || cleaned.includes("1a") || cleaned.includes("1b") || cleaned.includes("1c") || cleaned.includes("foundation")) return "1st Year";
    if (cleaned.includes("level 2") || cleaned.includes("2a") || cleaned.includes("2b") || cleaned.includes("2c") || cleaned.includes("intermediate")) return "2nd Year";
    if (cleaned.includes("level 3") || cleaned.includes("3a") || cleaned.includes("3b") || cleaned.includes("3c")) return "3rd Year";
    if (cleaned.includes("level 4") || cleaned.includes("4a") || cleaned.includes("4b") || cleaned.includes("4c")) return "4th Year";

    const numMatch = name.match(/\d+/);
    if (numMatch) {
      const num = numMatch[0];
      if (num === "1") return "1st Year";
      if (num === "2") return "2nd Year";
      if (num === "3") return "3rd Year";
      if (num === "4") return "4th Year";
      return `${num}th Year`;
    }
    return name;
  };

  let columns = [];
  if (viewMode === "session") {
    columns = sessions;
  } else {
    const defaultYears = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    const yearNames = [...new Set([...defaultYears, ...levels.map(l => translateLevelName(l.name))])];
    const yearOrder = { "1st Year": 1, "2nd Year": 2, "3rd Year": 3, "4th Year": 4 };
    yearNames.sort((a, b) => (yearOrder[a] || 99) - (yearOrder[b] || 99));
    columns = yearNames.map(name => ({ id: name, name }));
  }

  const getStudentCount = (courseId, colId) => {
    if (viewMode === "session") {
      const match = sessionCounts.find(
        (c) => c.subDepartmentId === courseId && c.sessionId === colId
      );
      return match ? match.count : 0;
    } else {
      const matchingLevelIds = levels
        .filter((l) => translateLevelName(l.name) === colId)
        .map((l) => l.id);

      return levelCounts
        .filter(
          (c) =>
            c.subDepartmentId === courseId && matchingLevelIds.includes(c.levelId)
        )
        .reduce((sum, item) => sum + item.count, 0);
    }
  };

  const filteredCourses = courses.filter((c) =>
    c.name.toLowerCase().includes(searchFilter.toLowerCase().trim())
  );

  const colTotals = columns.map((col) => {
    return filteredCourses.reduce((sum, course) => sum + getStudentCount(course.id, col.id), 0);
  });

  const grandTotal = colTotals.reduce((sum, val) => sum + val, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-gray-100 text-gray-700">
              <Layers className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-gray-800 text-sm sm:text-base">
              Course-wise & Year-wise Student Strength
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Student counts distributed by course and {viewMode === "level" ? "academic year" : "batch session"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search course..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition w-full sm:w-44"
            />
          </div>

          {/* Toggle Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("level")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "level"
                  ? "bg-white text-gray-800 shadow-2xs"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              By Year
            </button>
            <button
              onClick={() => setViewMode("session")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "session"
                  ? "bg-white text-gray-800 shadow-2xs"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              By Batch
            </button>
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[580px] text-xs sm:text-sm">
          <thead className="bg-gray-50/90 text-gray-500 text-[11px] sm:text-xs uppercase font-bold tracking-wider">
            <tr>
              <th className="px-4 sm:px-6 py-3.5 text-left">Course / Sub-Department</th>
              {columns.map((col) => (
                <th key={col.id} className="px-3 sm:px-4 py-3.5 text-center font-bold">
                  {col.name}
                </th>
              ))}
              <th className="px-4 sm:px-6 py-3.5 text-center bg-gray-100 font-extrabold text-gray-800">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredCourses.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="text-center py-8 text-gray-400 text-xs">
                  No courses match your search criteria.
                </td>
              </tr>
            ) : (
              filteredCourses.map((course) => {
                const rowTotal = columns.reduce(
                  (sum, col) => sum + getStudentCount(course.id, col.id),
                  0
                );
                return (
                  <tr key={course.id} className="transition-colors hover:bg-gray-50/70">
                    <td className="px-4 sm:px-6 py-3.5 font-semibold text-gray-800">
                      {course.name}
                    </td>
                    {columns.map((col) => {
                      const count = getStudentCount(course.id, col.id);
                      return (
                        <td key={col.id} className="px-3 sm:px-4 py-3.5 text-center text-gray-600 font-medium">
                          {count > 0 ? (
                            <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 text-xs font-bold border border-gray-200">
                              {count}
                            </span>
                          ) : (
                            <span className="text-gray-300 font-normal">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 sm:px-6 py-3.5 text-center font-extrabold text-gray-900 bg-gray-50">
                      {rowTotal}
                    </td>
                  </tr>
                );
              })
            )}

            {/* Grand Total Footer */}
            <tr className="bg-gray-50 font-extrabold border-t border-gray-200">
              <td className="px-4 sm:px-6 py-3.5 text-gray-800 uppercase text-xs">Grand Total</td>
              {colTotals.map((total, idx) => (
                <td key={idx} className="px-3 sm:px-4 py-3.5 text-center text-gray-800 font-bold">
                  {total}
                </td>
              ))}
              <td className="px-4 sm:px-6 py-3.5 text-center text-orange-600 bg-orange-50/70 text-sm sm:text-base font-black">
                {grandTotal}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Clean Quick Action Button Component ───────────────────────
const CleanQuickActionButton = ({ icon: Icon, title, description, badge, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="group flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border border-gray-200/90 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs hover:border-orange-300 hover:bg-orange-50/10 text-left w-full cursor-pointer"
    >
      <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 shrink-0 transition-colors group-hover:bg-orange-50 group-hover:text-orange-600 group-hover:border-orange-200">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1.5">
          <h4 className="text-xs sm:text-sm font-bold text-gray-800 group-hover:text-orange-600 transition-colors truncate">
            {title}
          </h4>
          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 shrink-0">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 line-clamp-1">
          {description}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all self-center shrink-0" />
    </button>
  );
};

// ── Main Dashboard Component ─────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const userObj = JSON.parse(localStorage.getItem("user") || "{}");

  const isDepartmentUser = ["hod", "faculty", "placement_officer"].includes(role);
  const departmentName = userObj.department || "ITEG";
  const departmentSubtext =
    departmentName === "ITEG" ? "IT & ENGINEERING" : `${departmentName} DEPARTMENT`;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Department Table Search
  const [deptSearch, setDeptSearch] = useState("");

  // Real academic sessions from backend
  const { data: sessionsData } = useGetAllSessionsQuery(true);
  const sessionsList = sessionsData?.data || [];

  // Filter States
  const [selectedSessionId, setSelectedSessionId] = useState(() => {
    return localStorage.getItem("dashboard_selectedSessionId") || "all";
  });
  const [academicYearLabel, setAcademicYearLabel] = useState(() => {
    return localStorage.getItem("dashboard_academicYearLabel") || "All Sessions";
  });
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [showNotification, setShowNotification] = useState(false);

  // Sync filters to local storage
  useEffect(() => {
    localStorage.setItem("dashboard_selectedSessionId", selectedSessionId);
    localStorage.setItem("dashboard_academicYearLabel", academicYearLabel);
  }, [selectedSessionId, academicYearLabel]);

  // Default to active session if not selected
  useEffect(() => {
    if (sessionsList.length > 0) {
      const currentSavedId = localStorage.getItem("dashboard_selectedSessionId") || "all";
      if (currentSavedId === "all") {
        const activeSess = sessionsList.find((s) => s.isActive || s.status === "active");
        if (activeSess) {
          setSelectedSessionId(activeSess._id);
          const label = activeSess.name.startsWith("AY") ? activeSess.name : `AY ${activeSess.name}`;
          setAcademicYearLabel(label);
        }
      } else {
        const found = sessionsList.find((s) => s._id === currentSavedId);
        if (found) {
          setSelectedSessionId(currentSavedId);
          const label = found.name.startsWith("AY") ? found.name : `AY ${found.name}`;
          setAcademicYearLabel(label);
        }
      }
    }
  }, [sessionsList]);

  const handleSessionChange = (e) => {
    const newId = e.target.value;
    setSelectedSessionId(newId);
    if (newId === "all") {
      setAcademicYearLabel("All Sessions");
    } else {
      const found = sessionsList.find((s) => s._id === newId);
      if (found) {
        const label = found.name.startsWith("AY") ? found.name : `AY ${found.name}`;
        setAcademicYearLabel(label);
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedSessionId && selectedSessionId !== "all") params.sessionId = selectedSessionId;
      if (selectedLevel && selectedLevel !== "All") params.level = selectedLevel;

      const res = await api.get("/dashboard/overview", { params });
      setData(res.data.data);
    } catch {
      setError("Failed to load dashboard data. Please refresh or try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSessionId, selectedLevel]);

  const s = data?.studentStats || {};
  const g = data?.genderBreakdown || {};
  const p = data?.placementSummary || {};
  const depts = data?.departments || [];

  const totalGender = (g.male || 0) + (g.female || 0);
  const malePct = totalGender > 0 ? Math.round((g.male / totalGender) * 100) : 0;
  const femalePct = totalGender > 0 ? Math.round((g.female / totalGender) * 100) : 0;

  // Canonicalized level distribution
  const distributionData = data?.levelDistribution?.length > 0 ? data.levelDistribution : [
    { name: "Level 1", students: 0 },
    { name: "Level 2", students: 0 },
    { name: "Level 3", students: 0 },
    { name: "Level 4", students: 0 },
  ];

  // Filtered departments for table
  const filteredDepts = useMemo(() => {
    if (!deptSearch.trim()) return depts;
    return depts.filter((d) =>
      d.name.toLowerCase().includes(deptSearch.toLowerCase().trim())
    );
  }, [depts, deptSearch]);

  const handlePrint = () => {
    window.print();
  };

  // ─────────────────────────────────────────────────────────────
  // ── 1. RENDER DEPARTMENT (HOD & FACULTY) DASHBOARD ───────────
  // ─────────────────────────────────────────────────────────────
  if (isDepartmentUser) {
    return (
      <div className="bg-slate-50 min-h-screen">
        {/* Header Bar */}
        <Header
          title="Department Dashboard"
          subtitle={`${departmentName} · ${departmentSubtext}`}
          badge={departmentName}
          showBack={false}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                disabled={loading}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:text-orange-500 hover:border-orange-300 transition bg-white cursor-pointer shadow-2xs"
                title="Refresh Dashboard"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-orange-500" : ""}`} />
              </button>
              <button
                onClick={() => setShowNotification(!showNotification)}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:text-orange-500 hover:border-orange-300 transition bg-white cursor-pointer shadow-2xs"
                title="Information"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>
          }
        >
          {/* Header Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
            <SelectDropdown
              value={selectedSessionId}
              onChange={(val) => handleSessionChange({ target: { value: val } })}
              options={[
                { value: "all", label: "All Sessions" },
                ...sessionsList.map((s) => {
                  const label = s.name.startsWith("AY") ? s.name : `AY ${s.name}`;
                  const statusText = s.status
                    ? s.status.charAt(0).toUpperCase() + s.status.slice(1)
                    : s.isActive
                    ? "Active"
                    : "Inactive";
                  return { value: s._id, label: `${label} (${statusText})` };
                }),
              ]}
              className="w-full sm:w-auto sm:min-w-[175px]"
              buttonClassName="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:border-orange-400 cursor-pointer flex items-center justify-between gap-1.5 shadow-2xs"
            />

            <SelectDropdown
              value={selectedLevel}
              onChange={(val) => setSelectedLevel(val)}
              align="right"
              options={[
                { value: "All", label: "All Levels" },
                { value: "Level 1", label: "Level 1" },
                { value: "Level 2", label: "Level 2" },
                { value: "Level 3", label: "Level 3" },
                { value: "Level 4", label: "Level 4" },
              ]}
              className="w-full sm:w-auto sm:min-w-[130px]"
              buttonClassName="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:border-orange-400 cursor-pointer flex items-center justify-between gap-1.5 shadow-2xs"
            />
          </div>
        </Header>

        {/* Info Notification Toast */}
        {showNotification && (
          <div className="mx-3 sm:mx-6 mt-4 p-3.5 bg-orange-50 border border-orange-200 text-orange-800 rounded-2xl text-xs sm:text-sm flex justify-between items-center shadow-2xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
              <span>
                Logged in as <strong>{userObj.name || "Faculty"}</strong> ({role.toUpperCase()}) for the{" "}
                <strong>{departmentName}</strong> department. Active session: <strong>{academicYearLabel}</strong>.
              </span>
            </div>
            <button
              onClick={() => setShowNotification(false)}
              className="text-orange-400 hover:text-orange-900 cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-3.5 sm:p-5 lg:p-6 space-y-5 sm:space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <UserX className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Clean, Elegant Welcome Banner (White Card) ── */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200/60 text-[11px] font-bold mb-2">
                <Building2 className="w-3.5 h-3.5" />
                <span>{departmentName} Operations</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Welcome back, {userObj.name || "Professor"}!
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-xl">
                Track student attendance, approve pending permissions, review task progress, and monitor placement readiness.
              </p>
            </div>

            {/* Quick Jump Buttons inside Banner */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => navigate("/attendance-details")}
                className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Take Attendance
              </button>
              <button
                onClick={() => navigate("/student-detail-table")}
                className="px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs border border-gray-200 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-gray-500" />
                Students
              </button>
              <button
                onClick={() => navigate("/student-permission")}
                className="px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs border border-gray-200 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                Permissions
              </button>
            </div>
          </div>

          {/* ── 1. KPI Stat Cards (Clean & Consistent Theme) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {loading ? (
              Array(5)
                .fill(0)
                .map((_, i) => (
                  <SkeletonLoader
                    key={i}
                    className={i === 4 ? "col-span-2 sm:col-span-1" : ""}
                  />
                ))
            ) : (
              <>
                <CleanStatCard
                  title="Dept Students"
                  value={s.total ?? 0}
                  icon={Users}
                  badgeText={`${s.active ?? 0} active`}
                  subtitle="enrolled"
                  onClick={() => navigate("/student-detail-table")}
                />
                <CleanStatCard
                  title="Active Strength"
                  value={s.active ?? 0}
                  icon={UserCheck}
                  badgeText={s.total ? `${Math.round(((s.active ?? 0) / s.total) * 100)}%` : "100%"}
                  badgeType="success"
                  subtitle="regular status"
                  onClick={() => navigate("/student-detail-table")}
                />
                <CleanStatCard
                  title="Placed in Dept"
                  value={p.totalPlaced ?? s.placed ?? 0}
                  icon={Briefcase}
                  badgeText={`${p.placementRate ?? 0}%`}
                  badgeType="neutral"
                  subtitle="success rate"
                  onClick={() => navigate("/readiness-status?status=Placed")}
                />
                <CleanStatCard
                  title="On Leave / Permission"
                  value={s.onPermission ?? 0}
                  icon={Clock}
                  badgeText={s.onPermission > 0 ? "Pending Review" : "Clear"}
                  badgeType={s.onPermission > 0 ? "warning" : "success"}
                  subtitle="active passes"
                  onClick={() => navigate("/student-permission")}
                />
                <CleanStatCard
                  title="Faculty & Staff"
                  value={s.facultyCount ?? 0}
                  icon={GraduationCap}
                  badgeText="Registered"
                  subtitle="instructors"
                  onClick={() => navigate("/user-management")}
                  className="col-span-2 sm:col-span-1"
                />
              </>
            )}
          </div>

          {/* ── 2. Middle Row: Student Academic Progression & Placement Funnel ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left Col: Student Level Distribution (Col span 2) */}
            <div className="lg:col-span-2 min-w-0 bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-gray-100 text-gray-700">
                      <Layers className="w-4 h-4" />
                    </span>
                    <h3 className="font-bold text-gray-800 text-sm sm:text-base">
                      Student Academic Distribution by Level
                    </h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Student counts currently enrolled across academic levels
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                  Total: {s.total ?? 0} Students
                </span>
              </div>

              <div className="w-full h-60 sm:h-64">
                {loading ? (
                  <SkeletonLoader h="h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={distributionData}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                      />
                      <Tooltip
                        cursor={{ fill: "#f8fafc" }}
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          borderRadius: "10px",
                          border: "none",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                        itemStyle={{ color: "#fff" }}
                        formatter={(val) => [`${val} Students`, "Enrolled"]}
                      />
                      {/* Clean, Uniform Institutional Orange Bars */}
                      <Bar dataKey="students" fill="#f97316" radius={[6, 6, 0, 0]} barSize={34} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Level Summary Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 mt-2 border-t border-gray-100">
                {distributionData.slice(0, 4).map((lvl, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-center">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">
                      {lvl.name}
                    </span>
                    <span className="text-sm font-extrabold text-gray-800">
                      {lvl.students} <span className="text-[11px] font-normal text-gray-400">students</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Col: Placement & Readiness Funnel (Col span 1) */}
            <div className="min-w-0 bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="p-1.5 rounded-lg bg-gray-100 text-gray-700">
                    <Award className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-gray-800 text-sm sm:text-base">
                    Placement & Drive Funnel
                  </h3>
                </div>
                <p className="text-xs text-gray-400 mb-4 sm:mb-5">
                  Drive readiness status for {departmentName}
                </p>

                {loading ? (
                  <SkeletonLoader h="h-44" />
                ) : (
                  <div className="space-y-3">
                    {/* Ready for Placement */}
                    <div
                      onClick={() => navigate("/readiness-status?status=Ready for Placement")}
                      className="p-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-orange-300 transition cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors flex items-center justify-center font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">Drive Ready</p>
                          <p className="text-[11px] text-gray-400">Eligible for interview drives</p>
                        </div>
                      </div>
                      <span className="text-base font-extrabold text-gray-900">
                        {p.readyForPlacement ?? 0}
                      </span>
                    </div>

                    {/* Interview Ongoing */}
                    <div
                      onClick={() => navigate("/readiness-status?status=Ongoing Interview")}
                      className="p-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-orange-300 transition cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors flex items-center justify-center font-bold text-xs">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">Interviews Active</p>
                          <p className="text-[11px] text-gray-400">Currently in rounds</p>
                        </div>
                      </div>
                      <span className="text-base font-extrabold text-gray-900">
                        {p.interviewRunning ?? 0}
                      </span>
                    </div>

                    {/* Total Placed */}
                    <div
                      onClick={() => navigate("/readiness-status?status=Placed")}
                      className="p-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-orange-300 transition cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors flex items-center justify-center font-bold text-xs">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">Placed Candidates</p>
                          <p className="text-[11px] text-gray-400">Offer letter accepted</p>
                        </div>
                      </div>
                      <span className="text-base font-extrabold text-orange-600">
                        {p.totalPlaced ?? s.placed ?? 0}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Placement Success Rate</span>
                <span className="text-sm font-black text-gray-900">{p.placementRate ?? 0}%</span>
              </div>
            </div>
          </div>

          {/* ── 3. Quick Action Hub for Department Users ── */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-800 text-sm sm:text-base">
                  Department Quick Actions & Workflows
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Frequently used modules for instructors and department administrators
                </p>
              </div>
              <span className="hidden sm:inline-flex text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
                Shortcuts
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <CleanQuickActionButton
                icon={ClipboardList}
                title="Mark / View Attendance"
                description="Daily logs, punch-ins, and subject attendance"
                badge="Daily"
                onClick={() => navigate("/attendance-details")}
              />
              <CleanQuickActionButton
                icon={Users}
                title="Student Roster"
                description="Detailed student records, marks, and profiles"
                badge="Directory"
                onClick={() => navigate("/student-detail-table")}
              />
              <CleanQuickActionButton
                icon={Clock}
                title="Permissions & Leaves"
                description="Review student gate passes and leave requests"
                badge={s.onPermission ? `${s.onPermission} Pending` : "Approvals"}
                onClick={() => navigate("/student-permission")}
              />
              <CleanQuickActionButton
                icon={Layers}
                title="Task Management & Board"
                description="Assign syllabus tasks and monitor completion"
                badge="Syllabus"
                onClick={() => navigate("/task-management")}
              />
              <CleanQuickActionButton
                icon={Award}
                title="Placement Readiness"
                description="Evaluate mock interviews and drive status"
                badge="Placements"
                onClick={() => navigate("/readiness-status")}
              />
              <CleanQuickActionButton
                icon={BookOpen}
                title="Sub-Level Management"
                description="Curriculum sub-levels and subject mapping"
                badge="Academic"
                onClick={() => navigate("/show-sublevel-tables")}
              />
            </div>
          </div>

          {/* ── 4. Course & Year Strength Matrix ── */}
          <CourseYearMatrixTable matrix={data?.courseYearMatrix} />

          {/* ── 5. Bottom Report Download Card ── */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-sm">Download Academic Report</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Print or save a formatted overview report for {departmentName} ({academicYearLabel}).
                </p>
              </div>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 transition text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-2xs cursor-pointer w-full sm:w-auto shrink-0"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // ── 2. RENDER SUPER ADMIN / ADMIN GLOBAL DASHBOARD ───────────
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header Section */}
      <Header
        title={role === "superadmin" ? "Super Admin Dashboard" : "Admin Dashboard"}
        subtitle="SSES INSTITUTIONAL MANAGEMENT SYSTEM · GOVERNANCE OVERVIEW"
        badge={role === "superadmin" ? "SUPER ADMIN" : "ADMIN"}
        showBack={false}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:text-orange-500 hover:border-orange-300 transition bg-white cursor-pointer shadow-2xs"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-orange-500" : ""}`} />
            </button>
            <button
              onClick={() => setShowNotification(!showNotification)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:text-orange-500 hover:border-orange-300 transition bg-white cursor-pointer shadow-2xs"
              title="System Information"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>
        }
      >
        {/* Header Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <SelectDropdown
            value={selectedSessionId}
            onChange={(val) => handleSessionChange({ target: { value: val } })}
            options={[
              { value: "all", label: "All Sessions" },
              ...sessionsList.map((s) => {
                const label = s.name.startsWith("AY") ? s.name : `AY ${s.name}`;
                const statusText = s.status
                  ? s.status.charAt(0).toUpperCase() + s.status.slice(1)
                  : s.isActive
                  ? "Active"
                  : "Inactive";
                return { value: s._id, label: `${label} (${statusText})` };
              }),
            ]}
            className="w-full sm:w-auto sm:min-w-[175px]"
            buttonClassName="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:border-orange-400 cursor-pointer flex items-center justify-between gap-1.5 shadow-2xs"
          />

          <SelectDropdown
            value={selectedLevel}
            onChange={(val) => setSelectedLevel(val)}
            align="right"
            options={[
              { value: "All", label: "All Levels" },
              { value: "Level 1", label: "Level 1" },
              { value: "Level 2", label: "Level 2" },
              { value: "Level 3", label: "Level 3" },
              { value: "Level 4", label: "Level 4" },
            ]}
            className="w-full sm:w-auto sm:min-w-[130px]"
            buttonClassName="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:border-orange-400 cursor-pointer flex items-center justify-between gap-1.5 shadow-2xs"
          />
        </div>
      </Header>

      {/* Welcome Notification Panel */}
      {showNotification && (
        <div className="mx-3 sm:mx-6 mt-4 p-3.5 bg-orange-50 border border-orange-200 text-orange-800 rounded-2xl text-xs sm:text-sm flex justify-between items-center shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
            <span>
              Welcome back, <strong>{userObj.name || "Administrator"}</strong>! Institutional privileges active across all{" "}
              <strong>{depts.length} departments</strong>. Selected session: <strong>{academicYearLabel}</strong>.
            </span>
          </div>
          <button
            onClick={() => setShowNotification(false)}
            className="text-orange-400 hover:text-orange-900 cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="p-3.5 sm:p-5 lg:p-6 space-y-5 sm:space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
            <UserX className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Super Admin Top 5 Stat Cards (Clean & Consistent) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {loading ? (
            Array(5)
              .fill(0)
              .map((_, i) => (
                <SkeletonLoader
                  key={i}
                  className={i === 4 ? "col-span-2 sm:col-span-1" : ""}
                />
              ))
          ) : (
            <>
              <CleanStatCard
                title="Total Students"
                value={s.total ?? 0}
                icon={Users}
                badgeText={`${s.active ?? 0} active`}
                subtitle="system-wide"
                onClick={() => navigate("/student-detail-table")}
              />
              <CleanStatCard
                title="Active Enrolled"
                value={s.active ?? 0}
                icon={UserCheck}
                badgeText={s.total ? `${Math.round(((s.active ?? 0) / s.total) * 100)}%` : "100%"}
                badgeType="success"
                subtitle="regular standing"
                onClick={() => navigate("/student-detail-table")}
              />
              <CleanStatCard
                title="Placed Candidates"
                value={p.totalPlaced ?? s.placed ?? 0}
                icon={Briefcase}
                badgeText={`${p.placementRate ?? 0}%`}
                badgeType="neutral"
                subtitle="placement rate"
                onClick={() => navigate("/readiness-status?status=Placed")}
              />
              <CleanStatCard
                title="On Leave / Permission"
                value={s.onPermission ?? 0}
                icon={Clock}
                badgeText={s.onPermission > 0 ? "Review Needed" : "Clear"}
                badgeType={s.onPermission > 0 ? "warning" : "success"}
                subtitle="active passes"
                onClick={() => navigate("/student-permission")}
              />
              <CleanStatCard
                title="Faculty & Staff"
                value={s.facultyCount ?? 0}
                icon={GraduationCap}
                badgeText={`${depts.length} Depts`}
                subtitle="teaching staff"
                onClick={() => navigate("/user-management")}
                className="col-span-2 sm:col-span-1"
              />
            </>
          )}
        </div>

        {/* ── Middle Row: Department Statistics & Gender Demographics ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column: Department Student & Placement Comparison (Col span 2) */}
          <div className="lg:col-span-2 min-w-0 bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-gray-100 text-gray-700">
                    <Building2 className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-gray-800 text-sm sm:text-base">
                    Department Student Strength & Placements
                  </h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Total enrolled students compared to placed candidates
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />
                  Total Enrolled
                </span>
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                  Placed
                </span>
              </div>
            </div>

            <div className="w-full h-60 sm:h-72">
              {loading ? (
                <SkeletonLoader h="h-full" />
              ) : depts.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  No department records found
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={depts.map((d) => ({
                      name: d.name.length > 18 ? d.name.substring(0, 18) + "..." : d.name,
                      Total: d.total || 0,
                      Placed: d.placed || 0,
                    }))}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8fafc" }}
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        borderRadius: "10px",
                        border: "none",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="Total" fill="#475569" radius={[6, 6, 0, 0]} barSize={22} />
                    <Bar dataKey="Placed" fill="#f97316" radius={[6, 6, 0, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Right Column: Gender Demographics (Col span 1) */}
          <div className="min-w-0 bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-lg bg-gray-100 text-gray-700">
                  <Users className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-gray-800 text-sm sm:text-base">
                  Gender Breakdown
                </h3>
              </div>
              <p className="text-xs text-gray-400 mb-4 sm:mb-6">
                System-wide student ratio
              </p>

              {loading ? (
                <SkeletonLoader h="h-48" />
              ) : (
                <div className="space-y-4 sm:space-y-5 my-auto">
                  {/* Male */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-700">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-xs">
                          M
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-gray-800">
                          Male Students
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-gray-900">{g.male ?? 0}</span>
                        <span className="text-[11px] text-gray-400 block font-semibold">
                          {malePct}% of total
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-slate-700 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${malePct}%` }}
                      />
                    </div>
                  </div>

                  {/* Female */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-700">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center font-bold text-xs text-orange-600">
                          F
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-gray-800">
                          Female Students
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-orange-600">{g.female ?? 0}</span>
                        <span className="text-[11px] text-gray-400 block font-semibold">
                          {femalePct}% of total
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${femalePct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-3 sm:pt-4 mt-4 text-center">
              <span className="text-xs text-gray-400 font-semibold">
                Total Profiled: <strong>{totalGender}</strong> students
              </span>
            </div>
          </div>
        </div>

        {/* ── Bottom Row: Department Overview Table & Quick Actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Department-wise Overview Table (Col span 2) */}
          <div className="lg:col-span-2 min-w-0 bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-gray-100 text-gray-700">
                      <Building2 className="w-4 h-4" />
                    </span>
                    <h3 className="font-bold text-gray-800 text-sm sm:text-base">
                      Department-wise Performance Table
                    </h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Click any department to inspect detailed placement records
                  </p>
                </div>

                {/* Table Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search department..."
                    value={deptSearch}
                    onChange={(e) => setDeptSearch(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition w-full sm:w-48"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-xs sm:text-sm">
                  <thead className="bg-gray-50/90 text-gray-500 text-[11px] sm:text-xs uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-4 sm:px-5 py-3.5 text-left">Department</th>
                      <th className="px-3 sm:px-4 py-3.5 text-center">Total</th>
                      <th className="px-3 sm:px-4 py-3.5 text-center">Active</th>
                      <th className="px-3 sm:px-4 py-3.5 text-center">Placed</th>
                      <th className="px-3 sm:px-4 py-3.5 text-center">Dropped</th>
                      <th className="px-3 sm:px-5 py-3.5 text-left">Placement Rate</th>
                      <th className="px-3 py-3.5 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      Array(4)
                        .fill(0)
                        .map((_, i) => (
                          <tr key={i}>
                            {Array(7)
                              .fill(0)
                              .map((_, j) => (
                                <td key={j} className="px-4 py-3.5">
                                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                                </td>
                              ))}
                          </tr>
                        ))
                    ) : filteredDepts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-gray-400 text-xs sm:text-sm">
                          No department data found.
                        </td>
                      </tr>
                    ) : (
                      filteredDepts.map((d) => {
                        const pct = d.placementRate;
                        const barColor =
                          pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-rose-400";
                        const textColor =
                          pct >= 70 ? "text-emerald-700" : pct >= 40 ? "text-amber-700" : "text-rose-700";

                        return (
                          <tr
                            key={d.subDepartmentId}
                            className="transition-colors hover:bg-gray-50/70 cursor-pointer group"
                            onClick={() => navigate(`/placements/department/${d.subDepartmentId}`)}
                          >
                            <td className="px-4 sm:px-5 py-3.5 font-bold text-gray-800 group-hover:text-orange-600 transition-colors">
                              {d.name}
                            </td>
                            <td className="px-3 sm:px-4 py-3.5 text-center text-gray-700 font-semibold">
                              {d.total}
                            </td>
                            <td className="px-3 sm:px-4 py-3.5 text-center text-gray-800 font-bold">
                              {d.active}
                            </td>
                            <td className="px-3 sm:px-4 py-3.5 text-center text-orange-600 font-bold">
                              {d.placed}
                            </td>
                            <td className="px-3 sm:px-4 py-3.5 text-center text-gray-400 font-medium">
                              {d.dropped}
                            </td>
                            <td className="px-3 sm:px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 rounded-full h-2 min-w-[70px]">
                                  <div
                                    className={`${barColor} h-2 rounded-full`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-black w-10 text-right ${textColor}`}>
                                  {pct}%
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-orange-600 group-hover:translate-x-1 transition-all mx-auto" />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Showing {filteredDepts.length} departments</span>
              <button
                onClick={() => navigate("/department-management")}
                className="font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
              >
                Manage Departments <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Actions (Col span 1) */}
          <div className="min-w-0 bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-lg bg-gray-100 text-gray-700">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-gray-800 text-sm sm:text-base">
                  Quick Administration
                </h3>
              </div>
              <p className="text-xs text-gray-400 mb-4 sm:mb-5">
                Fast navigation to core system management
              </p>

              <div className="space-y-2.5">
                <CleanQuickActionButton
                  icon={Building2}
                  title="Department Management"
                  description="Add or edit faculties and courses"
                  badge="Structure"
                  onClick={() => navigate("/department-management")}
                />
                <CleanQuickActionButton
                  icon={Users}
                  title="User Accounts & Roles"
                  description="HOD, Faculty, and Admin permissions"
                  badge="Security"
                  onClick={() => navigate("/user-management")}
                />
                <CleanQuickActionButton
                  icon={ClipboardList}
                  title="Student Progress Table"
                  description="Filterable student roster and reports"
                  badge="Students"
                  onClick={() => navigate("/student-detail-table")}
                />
                <CleanQuickActionButton
                  icon={Calendar}
                  title="Session Management"
                  description="Academic intake years and syllabus"
                  badge="Sessions"
                  onClick={() => navigate("/session-management")}
                />
                <CleanQuickActionButton
                  icon={Briefcase}
                  title="Placement Drives"
                  description="Company registrations and interviews"
                  badge="Placements"
                  onClick={() => navigate("/placements/drives")}
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 mt-4 text-center">
              <span className="text-[11px] text-gray-400 font-medium">
                Advanced settings available in sidebar navigation
              </span>
            </div>
          </div>
        </div>

        {/* ── Course-wise & Year-wise Student Strength Matrix ── */}
        <CourseYearMatrixTable matrix={data?.courseYearMatrix} />
      </div>
    </div>
  );
};

export default AdminDashboard;
