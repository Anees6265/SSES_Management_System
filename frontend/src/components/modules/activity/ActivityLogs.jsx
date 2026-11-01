import { useState, useMemo } from "react";
import Header from "../../shared/sidebar/Header";
import TabsCommon from "../../shared/table/TabsCommon";
import SearchBox from "../../shared/search-export/SearchBox";
import TableDownloadDropdown from "../../shared/table/TableDownloadDropdown";
import ActiveFilterChips from "../../shared/search-export/ActiveFilterChips";
import Pagination from "../../shared/pagination/Pagination";
import EmptyState from "../../shared/empty-state/EmptyState";
import Loader from "../../shared/loader/Loader";
import {
  useGetActivityLogsQuery,
  useGetActivityLogStatsQuery,
  useGetActivityLogUsersQuery,
  useGetAllUsersQuery,
} from "../../../redux/api/authApi";
import {
  RotateCcw,
  ShieldAlert,
  LogIn,
  LogOut,
  Plus,
  Edit,
  Trash2,
  FileSpreadsheet,
  Laptop,
  X,
  Info,
  Calendar,
  Activity,
  Layers,
} from "lucide-react";
import { exportGenericToExcel, exportGenericToPDF } from "../../../utils/studentExportHelpers";

const ACTION_BADGES = {
  LOGIN: "bg-purple-50 text-purple-700 border-purple-200",
  LOGOUT: "bg-gray-100 text-gray-700 border-gray-200",
  CREATE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  UPDATE: "bg-blue-50 text-blue-700 border-blue-200",
  DELETE: "bg-rose-50 text-rose-700 border-rose-200",
  SECURITY_ALERT: "bg-red-50 text-red-700 border-red-200 font-bold",
  EXPORT: "bg-amber-50 text-amber-700 border-amber-200",
};

const MODULE_BADGES = {
  Auth: "bg-purple-50 text-purple-700 border-purple-200",
  Students: "bg-teal-50 text-teal-700 border-teal-200",
  "Task Management": "bg-cyan-50 text-cyan-700 border-cyan-200",
  Curriculum: "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Report Cards": "bg-amber-50 text-amber-700 border-amber-200",
  "User Management": "bg-sky-50 text-sky-700 border-sky-200",
  Placements: "bg-emerald-50 text-emerald-700 border-emerald-200",
  System: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function ActivityLogs() {
  const [activeTab, setActiveTab] = useState("All Logs");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [search, setSearch] = useState("");
  const [userNameFilter, setUserNameFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isHod = (loggedInUser?.role || "").toLowerCase() === "hod";

  const threatOnly = activeTab === "Security Threats (Alerts)";

  // Fetch unique users from activity logs and user directory for filter dropdown
  const { data: logUsersData } = useGetActivityLogUsersQuery();
  const { data: allUsersData } = useGetAllUsersQuery();

  const availableUsers = useMemo(() => {
    const map = new Map();
    // From active log entries
    (logUsersData?.users || []).forEach((u) => {
      if (u.userName && u.userName !== "System" && u.userName !== "Suspicious Client") {
        map.set(u.userName.toLowerCase(), {
          name: u.userName,
          role: u.role || "",
          department: u.departmentName || "",
        });
      }
    });
    // From system user directory (HOD scoped if HOD)
    (allUsersData?.users || []).forEach((u) => {
      if (u.name) {
        map.set(u.name.toLowerCase(), {
          name: u.name,
          role: u.role || "",
          department: u.department || "",
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [logUsersData, allUsersData]);

  // Fetch Activity Logs
  const {
    data: logsData,
    isLoading,
    isFetching,
    refetch,
  } = useGetActivityLogsQuery(
    {
      page,
      limit: pageSize,
      search: search.trim(),
      userName: userNameFilter !== "ALL" ? userNameFilter : "",
      role: roleFilter,
      action: actionFilter,
      module: moduleFilter,
      dateRange,
      threatOnly: threatOnly ? "true" : "false",
    },
    { refetchOnMountOrArgChange: true }
  );

  const { data: statsData } = useGetActivityLogStatsQuery(undefined, {
    pollingInterval: 30000,
  });

  const logs = logsData?.data?.logs || [];
  const pagination = logsData?.data?.pagination || { total: 0, totalPages: 1 };
  const stats = statsData?.data || logsData?.data?.stats || {
    totalToday: 0,
    loginsToday: 0,
    modificationsToday: 0,
    blockedThreatsToday: 0,
    totalAlerts: 0,
  };

  const handleClearFilters = () => {
    setSearch("");
    setUserNameFilter("ALL");
    setRoleFilter("ALL");
    setActionFilter("ALL");
    setModuleFilter("ALL");
    setDateRange("");
    setPage(1);
  };

  // Build active filter chips
  const activeChips = useMemo(() => {
    const chips = [];
    if (search) {
      chips.push({
        key: "search",
        label: "Search",
        value: search,
        displayValue: `"${search}"`,
        onRemove: () => setSearch(""),
      });
    }
    if (userNameFilter !== "ALL") {
      chips.push({
        key: "userName",
        label: "User",
        value: userNameFilter,
        displayValue: userNameFilter,
        onRemove: () => setUserNameFilter("ALL"),
      });
    }
    if (roleFilter !== "ALL") {
      chips.push({
        key: "role",
        label: "Role",
        value: roleFilter,
        displayValue: roleFilter.toUpperCase(),
        onRemove: () => setRoleFilter("ALL"),
      });
    }
    if (actionFilter !== "ALL") {
      chips.push({
        key: "action",
        label: "Action",
        value: actionFilter,
        displayValue: actionFilter,
        onRemove: () => setActionFilter("ALL"),
      });
    }
    if (moduleFilter !== "ALL") {
      chips.push({
        key: "module",
        label: "Module",
        value: moduleFilter,
        displayValue: moduleFilter,
        onRemove: () => setModuleFilter("ALL"),
      });
    }
    if (dateRange) {
      chips.push({
        key: "dateRange",
        label: "Date",
        value: dateRange,
        displayValue:
          dateRange === "today"
            ? "Today"
            : dateRange === "yesterday"
            ? "Yesterday"
            : dateRange === "7days"
            ? "Last 7 Days"
            : "Last 30 Days",
        onRemove: () => setDateRange(""),
      });
    }
    return chips;
  }, [search, roleFilter, actionFilter, moduleFilter, dateRange]);

  // Export handlers
  const exportColumns = [
    { header: "Date & Time", accessor: "formattedDate" },
    { header: "User", accessor: "userName" },
    { header: "Email", accessor: "userEmail" },
    { header: "Role", accessor: "role" },
    { header: "Department", accessor: "departmentName" },
    { header: "Action", accessor: "action" },
    { header: "Module", accessor: "module" },
    { header: "Description", accessor: "description" },
    { header: "Status", accessor: "status" },
    { header: "IP Address", accessor: "ipAddress" },
    { header: "Device", accessor: "device" },
  ];

  const handleExportExcel = () => {
    const formatted = logs.map((l) => ({
      ...l,
      formattedDate: new Date(l.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    }));
    exportGenericToExcel(formatted, exportColumns, {
      fileName: `Activity_Audit_Logs_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: "Activity Logs",
    });
  };

  const handleExportPDF = () => {
    const formatted = logs.map((l) => ({
      ...l,
      formattedDate: new Date(l.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    }));
    exportGenericToPDF(formatted, exportColumns, {
      fileName: `Activity_Audit_Logs_${new Date().toISOString().slice(0, 10)}.pdf`,
      title: "System Activity & Audit Logs",
      subtitle: isHod
        ? `Department: ${loggedInUser?.department || "Department"}`
        : "Institutional Security & Activity Trail",
    });
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50/60 min-h-screen">
      {/* ── TOP HEADER (With Standard Action Buttons) ── */}
      <Header
        title="Activity & Audit Logs"
        subtitle={
          isHod
            ? `Department: ${loggedInUser?.department || "HOD Scope"}`
            : "Complete institutional activity tracking and security shield logs"
        }
      >
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => refetch()}
            className="h-10 px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-2xs"
            title="Refresh logs"
          >
            <RotateCcw
              size={15}
              className={isFetching ? "animate-spin text-orange-600" : "text-gray-500"}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Standard Orange Download Dropdown */}
          <TableDownloadDropdown
            total={pagination.total}
            label="Download"
            onDownloadExcel={handleExportExcel}
            onDownloadPDF={handleExportPDF}
          />
        </div>
      </Header>

      {/* ── SUB-HEADER WITH TABS & SEARCH (Standard App Pattern) ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-gray-200 bg-white px-3 sm:px-6 py-1 sm:py-0 gap-2 w-full">
        <div className="flex-1 min-w-0">
          <TabsCommon
            tabs={["All Logs", "Security Threats (Alerts)"]}
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              setPage(1);
            }}
          />
        </div>
        <div className="flex-shrink-0 self-end sm:self-auto py-1">
          <SearchBox
            searchTerm={search}
            setSearchTerm={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search by user, action, IP..."
          />
        </div>
      </div>

      {/* ── FULL WIDTH MAIN CONTENT AREA ── */}
      <div className="w-full p-2.5 sm:p-4 md:p-6 space-y-4 flex-1">
        {/* ── TOP KPI SUMMARY CARDS (Consistent App Card Theme) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
          {/* Card 1: Activities Today */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex items-center justify-between transition hover:shadow-sm">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Activities Today
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
                {stats.totalToday.toLocaleString()}
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Logged actions</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
              <Activity size={20} />
            </div>
          </div>

          {/* Card 2: Logins Today */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex items-center justify-between transition hover:shadow-sm">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Logins Today
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
                {stats.loginsToday.toLocaleString()}
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Active sessions</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <LogIn size={20} />
            </div>
          </div>

          {/* Card 3: Data Changes */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex items-center justify-between transition hover:shadow-sm">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Data Changes
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
                {stats.modificationsToday.toLocaleString()}
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Create, Update & Delete</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Edit size={20} />
            </div>
          </div>

          {/* Card 4: Blocked Threats (Alert Card) */}
          <div
            onClick={() => {
              setActiveTab(threatOnly ? "All Logs" : "Security Threats (Alerts)");
              setPage(1);
            }}
            className={`rounded-xl p-4 sm:p-5 border transition cursor-pointer shadow-2xs flex items-center justify-between ${
              threatOnly
                ? "bg-rose-500 text-white border-rose-600 ring-2 ring-rose-400"
                : stats.blockedThreatsToday > 0
                ? "bg-rose-50/70 border-rose-200 text-rose-900 hover:bg-rose-100/60"
                : "bg-white border-slate-200/80 text-gray-900 hover:shadow-sm"
            }`}
            title="Click to toggle Security Threats view"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <p
                  className={`text-xs font-bold uppercase tracking-wider ${
                    threatOnly ? "text-rose-100" : "text-rose-600"
                  }`}
                >
                  Blocked Threats
                </p>
                {stats.blockedThreatsToday > 0 && !threatOnly && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                )}
              </div>
              <h3
                className={`text-2xl sm:text-3xl font-extrabold mt-1 ${
                  threatOnly ? "text-white" : "text-rose-700"
                }`}
              >
                {stats.blockedThreatsToday.toLocaleString()}
              </h3>
              <p
                className={`text-[11px] mt-0.5 ${
                  threatOnly ? "text-rose-100" : "text-rose-600/80"
                }`}
              >
                {threatOnly ? "Showing security attacks" : "Scanners & probes blocked"}
              </p>
            </div>
            <div
              className={`w-11 h-11 rounded-xl border flex items-center justify-center ${
                threatOnly
                  ? "bg-rose-600 border-rose-400 text-white"
                  : "bg-rose-100 border-rose-200 text-rose-600"
              }`}
            >
              <ShieldAlert size={20} />
            </div>
          </div>
        </div>

        {/* ── FILTER CONTROLS BAR ── */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-gray-200 shadow-2xs w-full">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Filter by User / Source */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                User / Source
              </label>
              <select
                value={userNameFilter}
                onChange={(e) => {
                  setUserNameFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 font-medium text-gray-700 transition"
              >
                <option value="ALL">All Users / Sources</option>
                {availableUsers.map((u) => (
                  <option key={u.name} value={u.name}>
                    {u.name} {u.role ? `(${u.role})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Role */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 font-medium text-gray-700 transition"
              >
                <option value="ALL">All Roles</option>
                <option value="superadmin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="hod">HOD</option>
                <option value="faculty">Faculty</option>
                <option value="student">Student</option>
              </select>
            </div>

            {/* Filter by Action */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Action Type
              </label>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 font-medium text-gray-700 transition"
              >
                <option value="ALL">All Actions</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="CREATE">CREATE / ADD</option>
                <option value="UPDATE">UPDATE / EDIT</option>
                <option value="DELETE">DELETE / REMOVE</option>
                <option value="SECURITY_ALERT">🚨 SECURITY ALERT</option>
              </select>
            </div>

            {/* Filter by Module */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Module
              </label>
              <select
                value={moduleFilter}
                onChange={(e) => {
                  setModuleFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 font-medium text-gray-700 transition"
              >
                <option value="ALL">All Modules</option>
                <option value="Auth">Auth & Sessions</option>
                <option value="Students">Students & Admissions</option>
                <option value="Task Management">Task Management</option>
                <option value="Curriculum">Curriculum & Syllabus</option>
                <option value="Report Cards">Report Cards</option>
                <option value="User Management">Users & Roles</option>
                <option value="Placements">Placements</option>
                <option value="System">System & Hierarchy</option>
              </select>
            </div>

            {/* Filter by Date */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 font-medium text-gray-700 transition"
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── ACTIVE FILTER CHIPS (Standard App Component) ── */}
        {activeChips.length > 0 && (
          <ActiveFilterChips
            chips={activeChips}
            onClearAll={handleClearFilters}
            className="my-1"
          />
        )}

        {/* ── DATA TABLE CONTAINER (Full Width, Styled like CommonTable) ── */}
        <div className="w-full bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          {isLoading ? (
            <div className="p-16 flex justify-center items-center">
              <Loader />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="No Activity Logs Found"
                subtitle={
                  activeChips.length > 0
                    ? "No logs match your currently selected filters. Clear some filters to view records."
                    : "No system activities or security events recorded yet."
                }
                actionText={activeChips.length > 0 ? "Clear Filters" : undefined}
                onAction={activeChips.length > 0 ? handleClearFilters : undefined}
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-600 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 whitespace-nowrap">Date & Time</th>
                      <th className="py-3 px-4">User / Source</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Module</th>
                      <th className="py-3 px-4 min-w-[240px]">Activity Description</th>
                      <th className="py-3 px-4 whitespace-nowrap">IP & Device</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => {
                      const isThreat = log.isSecurityAlert || log.action === "SECURITY_ALERT";
                      const formattedDate = new Date(log.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      });

                      return (
                        <tr
                          key={log._id}
                          onClick={() => setSelectedLog(log)}
                          className={`transition cursor-pointer ${
                            isThreat
                              ? "bg-rose-50/40 hover:bg-rose-50/70"
                              : "hover:bg-orange-50/30"
                          }`}
                          title="Click to view full inspection"
                        >
                          {/* Date & Time */}
                          <td className="py-3 px-4 whitespace-nowrap text-xs font-medium text-gray-600">
                            {formattedDate}
                          </td>

                          {/* User & Department */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                onClick={(e) => {
                                  if (log.userName && log.userName !== "System" && log.userName !== "Suspicious Client") {
                                    e.stopPropagation();
                                    setUserNameFilter(log.userName);
                                    setPage(1);
                                  }
                                }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border transition ${
                                  isThreat
                                    ? "bg-rose-100 text-rose-800 border-rose-200"
                                    : "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200 hover:scale-105"
                                }`}
                                title={log.userName ? `Click to filter logs for ${log.userName}` : undefined}
                              >
                                {log.userName?.charAt(0)?.toUpperCase() || "S"}
                              </div>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    if (log.userName && log.userName !== "System" && log.userName !== "Suspicious Client") {
                                      e.stopPropagation();
                                      setUserNameFilter(log.userName);
                                      setPage(1);
                                    }
                                  }}
                                  className="font-bold text-gray-900 hover:text-orange-600 transition truncate text-xs sm:text-sm max-w-[160px] text-left block cursor-pointer"
                                  title={log.userName ? `Click to filter logs for ${log.userName}` : undefined}
                                >
                                  {log.userName}
                                </button>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                      isThreat
                                        ? "bg-rose-100 text-rose-800 border-rose-200"
                                        : "bg-gray-100 text-gray-600 border-gray-200"
                                    }`}
                                  >
                                    {log.role || "unknown"}
                                  </span>
                                  {log.departmentName && (
                                    <span className="text-[11px] text-gray-500 truncate">
                                      • {log.departmentName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Action Badge */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                ACTION_BADGES[log.action] || "bg-gray-100 text-gray-700 border-gray-200"
                              }`}
                            >
                              {log.action === "SECURITY_ALERT" && (
                                <ShieldAlert size={12} className="text-red-600" />
                              )}
                              <span>{log.action}</span>
                            </span>
                          </td>

                          {/* Module */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                                MODULE_BADGES[log.module] || "bg-gray-100 text-gray-600 border-gray-200"
                              }`}
                            >
                              {log.module}
                            </span>
                          </td>

                          {/* Activity Description */}
                          <td className="py-3 px-4 text-gray-700">
                            <p className="line-clamp-2 leading-snug text-xs sm:text-sm">
                              {log.description}
                            </p>
                            {log.threatType && (
                              <span className="inline-block mt-1 text-[10px] font-bold uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-200">
                                Threat: {log.threatType}
                              </span>
                            )}
                          </td>

                          {/* IP & Device */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <span className="font-mono font-bold text-gray-800 text-xs bg-gray-100 px-2 py-0.5 rounded border border-gray-200 inline-block">
                                {log.ipAddress || "—"}
                              </span>
                              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                <Laptop size={11} />
                                <span className="truncate max-w-[140px]" title={log.device}>
                                  {log.device || "Unknown Device"}
                                </span>
                              </p>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                log.status === "SUCCESS"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : log.status === "BLOCKED"
                                  ? "bg-rose-100 text-rose-800 border-rose-300 font-bold"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── STANDARD APP PAGINATION ── */}
              <div className="px-4 py-2 border-t border-gray-100 bg-white">
                <Pagination
                  totalItems={pagination.total}
                  currentPage={page}
                  pageSize={pageSize}
                  totalPages={pagination.totalPages}
                  onPageChange={(newPage) => setPage(newPage)}
                  label="activity logs"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── INSPECTION DETAIL MODAL ── */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                    selectedLog.isSecurityAlert
                      ? "bg-rose-100 text-rose-600 border border-rose-200"
                      : "bg-orange-100 text-orange-600 border border-orange-200"
                  }`}
                >
                  {selectedLog.isSecurityAlert ? <ShieldAlert size={20} /> : <Info size={20} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Activity Inspection
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">
                    ID: {selectedLog._id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">User</span>
                  <p className="font-bold text-gray-800">{selectedLog.userName} ({selectedLog.role})</p>
                  <p className="text-gray-500 text-xs">{selectedLog.userEmail || "No email"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Timestamp</span>
                  <p className="font-bold text-gray-800">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </p>
                  <p className="text-gray-500 text-xs">{selectedLog.departmentName || "No Department"}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Activity Summary</span>
                <p className="font-semibold text-gray-800 mt-0.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  {selectedLog.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Action & Module</span>
                  <p className="font-bold text-gray-800 mt-0.5">{selectedLog.action} • {selectedLog.module}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Status & Severity</span>
                  <p className="font-bold text-gray-800 mt-0.5">{selectedLog.status} ({selectedLog.severity})</p>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Client & Origin</span>
                <p className="font-mono text-gray-800">IP: {selectedLog.ipAddress}</p>
                <p className="text-gray-600">Device: {selectedLog.device}</p>
                {selectedLog.userAgent && (
                  <p className="text-[11px] text-gray-400 truncate" title={selectedLog.userAgent}>
                    UA: {selectedLog.userAgent}
                  </p>
                )}
              </div>

              {selectedLog.meta && Object.keys(selectedLog.meta).length > 0 && (
                <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-36">
                  <p className="text-slate-400 text-[10px] font-sans font-bold uppercase mb-1">
                    Metadata Payload
                  </p>
                  <pre>{JSON.stringify(selectedLog.meta, null, 2)}</pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
