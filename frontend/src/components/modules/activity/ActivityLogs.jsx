import { useState, useMemo } from "react";
import Header from "../../shared/sidebar/Header";
import TabsCommon from "../../shared/table/TabsCommon";
import SearchBox from "../../shared/search-export/SearchBox";
import TableDownloadDropdown from "../../shared/table/TableDownloadDropdown";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";
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
  Filter,
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

  // Blocked Threats option turned off for now (code commented as requested)
  // const threatOnly = activeTab === "Security Threats (Alerts)";
  const threatOnly = false;

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

  // Dropdown options matching software design
  const userOptions = useMemo(
    () => [
      { value: "ALL", label: "All Users / Sources" },
      ...availableUsers.map((u) => ({
        value: u.name,
        label: u.name,
      })),
    ],
    [availableUsers]
  );

  const roleOptions = [
    { value: "ALL", label: "All Roles" },
    { value: "superadmin", label: "Super Admin" },
    { value: "admin", label: "Admin" },
    { value: "hod", label: "HOD" },
    { value: "faculty", label: "Faculty" },
    { value: "student", label: "Student" },
  ];

  const actionOptions = [
    { value: "ALL", label: "All Actions" },
    { value: "LOGIN", label: "LOGIN" },
    { value: "LOGOUT", label: "LOGOUT" },
    { value: "CREATE", label: "CREATE / ADD" },
    { value: "UPDATE", label: "UPDATE / EDIT" },
    { value: "DELETE", label: "DELETE / REMOVE" },
    { value: "SECURITY_ALERT", label: "🚨 SECURITY ALERT" },
    { value: "EXPORT", label: "EXPORT" },
  ];

  const moduleOptions = [
    { value: "ALL", label: "All Modules" },
    { value: "Auth", label: "Auth & Sessions" },
    { value: "Students", label: "Students & Admissions" },
    { value: "Task Management", label: "Task Management" },
    { value: "Curriculum", label: "Curriculum & Syllabus" },
    { value: "Report Cards", label: "Report Cards" },
    { value: "User Management", label: "Users & Roles" },
    { value: "Placements", label: "Placements" },
    { value: "System", label: "System & Hierarchy" },
  ];

  const dateOptions = [
    { value: "", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "7days", label: "Last 7 Days" },
    { value: "30days", label: "Last 30 Days" },
  ];

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
        title="Activity Logs"
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
            // Blocked Threats option turned off for now (commented out as requested)
            // tabs={["All Logs", "Security Threats (Alerts)"]}
            tabs={["All Logs"]}
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
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between transition-all hover:border-orange-200 hover:shadow-xs">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Activities Today
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {stats.totalToday.toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Logged actions</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shadow-2xs">
              <Activity size={22} />
            </div>
          </div>

          {/* Card 2: Logins Today */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between transition-all hover:border-purple-200 hover:shadow-xs">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Logins Today
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {stats.loginsToday.toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Active sessions</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-2xs">
              <LogIn size={22} />
            </div>
          </div>

          {/* Card 3: Data Changes */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between transition-all hover:border-blue-200 hover:shadow-xs">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Data Changes
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {stats.modificationsToday.toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Create, Update & Delete</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <Edit size={22} />
            </div>
          </div>

          {/* Card 4: Blocked Threats (Alert Card) - Toggle option temporarily disabled */}
          <div
            /* onClick={() => {
              setActiveTab(threatOnly ? "All Logs" : "Security Threats (Alerts)");
              setPage(1);
            }} */
            className={`rounded-2xl p-4 sm:p-5 border transition-all shadow-2xs flex items-center justify-between ${stats.blockedThreatsToday > 0
                ? "bg-rose-50/70 border-rose-200 text-rose-900"
                : "bg-white border-slate-200/90 text-slate-900"
              }`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold uppercase tracking-wider text-rose-600">
                  Blocked Threats
                </p>
                {stats.blockedThreatsToday > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                )}
              </div>
              <h3 className="text-2xl sm:text-3xl font-black mt-1 text-rose-700">
                {stats.blockedThreatsToday.toLocaleString()}
              </h3>
              <p className="text-[11px] mt-0.5 font-medium text-rose-600/80">
                Scanners & probes blocked
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl border flex items-center justify-center shadow-2xs bg-rose-100 border-rose-200 text-rose-600">
              <ShieldAlert size={22} />
            </div>
          </div>
        </div>

        {/* ── FILTER CONTROLS BAR (Software Theme with SelectDropdown) ── */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs w-full space-y-3.5">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200/60 flex items-center justify-center text-orange-600">
                <Filter size={14} />
              </span>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Filter Activity Logs
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">
                  Refine logs by user identity, role, action, module, or time period
                </p>
              </div>
            </div>
            {activeChips.length > 0 && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer flex items-center gap-1 transition"
              >
                <RotateCcw size={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Filter by User / Source */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                User / Source
              </label>
              <SelectDropdown
                value={userNameFilter}
                onChange={(val) => {
                  setUserNameFilter(val);
                  setPage(1);
                }}
                options={userOptions}
                placeholder="All Users / Sources"
                buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs sm:text-sm text-slate-700 font-semibold cursor-pointer shadow-2xs hover:border-orange-500"
              />
            </div>

            {/* Filter by Role */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Role
              </label>
              <SelectDropdown
                value={roleFilter}
                onChange={(val) => {
                  setRoleFilter(val);
                  setPage(1);
                }}
                options={roleOptions}
                placeholder="All Roles"
                buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs sm:text-sm text-slate-700 font-semibold cursor-pointer shadow-2xs hover:border-orange-500"
              />
            </div>

            {/* Filter by Action */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Action Type
              </label>
              <SelectDropdown
                value={actionFilter}
                onChange={(val) => {
                  setActionFilter(val);
                  setPage(1);
                }}
                options={actionOptions}
                placeholder="All Actions"
                buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs sm:text-sm text-slate-700 font-semibold cursor-pointer shadow-2xs hover:border-orange-500"
              />
            </div>

            {/* Filter by Module */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Module
              </label>
              <SelectDropdown
                value={moduleFilter}
                onChange={(val) => {
                  setModuleFilter(val);
                  setPage(1);
                }}
                options={moduleOptions}
                placeholder="All Modules"
                buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs sm:text-sm text-slate-700 font-semibold cursor-pointer shadow-2xs hover:border-orange-500"
              />
            </div>

            {/* Filter by Date */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Date Range
              </label>
              <SelectDropdown
                value={dateRange}
                onChange={(val) => {
                  setDateRange(val);
                  setPage(1);
                }}
                options={dateOptions}
                placeholder="All Time"
                buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs sm:text-sm text-slate-700 font-semibold cursor-pointer shadow-2xs hover:border-orange-500"
              />
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
        <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
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
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider">
                      <th className="py-3.5 px-4 whitespace-nowrap">Date & Time</th>
                      <th className="py-3.5 px-4">User / Source</th>
                      <th className="py-3.5 px-4">Action</th>
                      <th className="py-3.5 px-4">Module</th>
                      <th className="py-3.5 px-4 min-w-[240px]">Activity Description</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">IP & Device</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
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
                          className={`transition cursor-pointer ${isThreat
                              ? "bg-rose-50/40 hover:bg-rose-50/70"
                              : "hover:bg-orange-50/30"
                            }`}
                          title="Click to view full inspection"
                        >
                          {/* Date & Time */}
                          <td className="py-3 px-4 whitespace-nowrap text-xs font-medium text-slate-600">
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
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 border transition shadow-2xs ${isThreat
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
                                  className="font-bold text-slate-900 hover:text-orange-600 transition truncate text-xs sm:text-sm max-w-[160px] text-left block cursor-pointer"
                                  title={log.userName ? `Click to filter logs for ${log.userName}` : undefined}
                                >
                                  {log.userName}
                                </button>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${isThreat
                                        ? "bg-rose-100 text-rose-800 border-rose-200"
                                        : "bg-slate-100 text-slate-600 border-slate-200"
                                      }`}
                                  >
                                    {log.role || "unknown"}
                                  </span>
                                  {log.departmentName && (
                                    <span className="text-[11px] text-slate-500 truncate">
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
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${ACTION_BADGES[log.action] || "bg-slate-100 text-slate-700 border-slate-200"
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
                              className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold border ${MODULE_BADGES[log.module] || "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                            >
                              {log.module}
                            </span>
                          </td>

                          {/* Activity Description */}
                          <td className="py-3 px-4 text-slate-700">
                            <p className="line-clamp-2 leading-snug text-xs sm:text-sm font-medium">
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
                              <span className="font-mono font-bold text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">
                                {log.ipAddress || "—"}
                              </span>
                              <p className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
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
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${log.status === "SUCCESS"
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
              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${selectedLog.isSecurityAlert
                      ? "bg-rose-100 text-rose-600 border border-rose-200"
                      : "bg-orange-100 text-orange-600 border border-orange-200"
                    }`}
                >
                  {selectedLog.isSecurityAlert ? <ShieldAlert size={20} /> : <Info size={20} />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Activity Inspection
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    ID: {selectedLog._id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">User</span>
                  <p className="font-bold text-slate-800">{selectedLog.userName} ({selectedLog.role})</p>
                  <p className="text-slate-500 text-xs font-medium">{selectedLog.userEmail || "No email"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timestamp</span>
                  <p className="font-bold text-slate-800">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </p>
                  <p className="text-slate-500 text-xs font-medium">{selectedLog.departmentName || "No Department"}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activity Summary</span>
                <p className="font-semibold text-slate-800 mt-0.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                  {selectedLog.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Action & Module</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedLog.action} • {selectedLog.module}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status & Severity</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedLog.status} ({selectedLog.severity})</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client & Origin</span>
                <p className="font-mono font-bold text-slate-800">IP: {selectedLog.ipAddress}</p>
                <p className="text-slate-600 font-medium">Device: {selectedLog.device}</p>
                {selectedLog.userAgent && (
                  <p className="text-[11px] text-slate-400 truncate font-mono" title={selectedLog.userAgent}>
                    UA: {selectedLog.userAgent}
                  </p>
                )}
              </div>

              {selectedLog.meta && Object.keys(selectedLog.meta).length > 0 && (
                <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-36 border border-slate-800">
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
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-orange-500 hover:bg-orange-600 text-white transition cursor-pointer shadow-xs"
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
