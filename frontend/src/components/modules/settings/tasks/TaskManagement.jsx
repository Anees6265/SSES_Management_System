import { useMemo, useState } from "react";
import {
    MdMoreVert, MdSearch, MdAdd, MdFilterList,
    MdExpandMore, MdClose, MdViewList, MdGridView,
    MdChevronLeft, MdChevronRight
} from "react-icons/md";
import { toast } from "react-toastify";
import Header from "../../../shared/sidebar/Header";
import SelectDropdown from "../../../shared/form-fields/SelectDropdown";
import {
    useDeleteTaskMutation,
    useGetAllTasksQuery,
} from "../../../../redux/api/authApi";

const getOptionValues = (items, key) => (
    [...new Set(items.map((item) => item[key]).filter(Boolean))]
        .sort((a, b) => String(a).localeCompare(String(b)))
);

const PRIORITY_STYLES = {
    high: "bg-rose-50 text-rose-700 border-rose-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const ActionMenu = ({ task, onDelete, onViewDetails }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative flex justify-end">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((p) => !p);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                aria-label="Actions"
            >
                <MdMoreVert size={18} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-8 z-40 bg-white border border-slate-200 rounded-xl shadow-xl w-38 py-1.5 overflow-hidden text-xs font-semibold text-slate-700">
                        {onViewDetails && (
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    onViewDetails(task);
                                }}
                                className="w-full px-4 py-2 text-left transition text-slate-700 hover:bg-slate-50 font-bold cursor-pointer"
                            >
                                View Details
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="w-full px-4 py-2 text-left transition text-slate-300 cursor-not-allowed"
                            disabled
                        >
                            Edit Task
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setOpen(false);
                                onDelete(task);
                            }}
                            className="w-full px-4 py-2 text-left transition text-rose-600 hover:bg-rose-50 font-bold cursor-pointer"
                        >
                            Delete Task
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

const TaskDetailModal = ({ task, onClose, onDelete }) => {
    if (!task) return null;

    const formattedDate = task.createdAt
        ? new Date(task.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
        : "-";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in duration-150">
            <div
                className="fixed inset-0"
                onClick={onClose}
            />
            <div className="relative bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] z-10">
                {/* Header */}
                <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70">
                    <div className="space-y-1.5 pr-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                                {task.academicYear} • {task.session}
                            </span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>
                                {task.priority}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                task.status === "active"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}>
                                {task.status}
                            </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug break-words">
                            {task.taskTitle}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
                        aria-label="Close"
                    >
                        <MdClose size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
                    {/* Curriculum Context Path */}
                    {(task.subject || task.topic) && (
                        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Subject & Topic
                            </p>
                            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                <span className="text-orange-600 font-bold">{task.subject}</span>
                                {task.topic && (
                                    <>
                                        <span className="text-slate-300">›</span>
                                        <span>{task.topic}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Academic Parameters Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-2.5 space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Department</p>
                            <p className="font-bold text-slate-800 break-words">{task.department}</p>
                        </div>
                        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-2.5 space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Sub-Department</p>
                            <p className="font-bold text-slate-800 break-words">{task.subDept}</p>
                        </div>
                        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-2.5 space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Level</p>
                            <p className="font-bold text-slate-800">{task.level}</p>
                        </div>
                        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-2.5 space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Sub-Level</p>
                            <p className="font-bold text-slate-800">{task.subLevel}</p>
                        </div>
                    </div>

                    {/* Metadata: Created & ID */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-between gap-2 text-[11px] text-slate-500 flex-wrap">
                        <span>Created: <span className="font-semibold text-slate-700">{formattedDate}</span></span>
                        <span className="text-slate-400 font-mono text-[10px]">ID: {task.id?.slice(-8)}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3.5 sm:p-4 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onDelete(task);
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                        Delete Task
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const TaskManagement = () => {
    const role = (
        localStorage.getItem("role") ||
        (() => {
            try {
                return JSON.parse(localStorage.getItem("user") || "{}")?.role;
            } catch {
                return "";
            }
        })() ||
        ""
    ).toLowerCase();
    const isFaculty = role === "faculty";

    const [searchTerm, setSearchTerm] = useState("");
    const [filterYear, setFilterYear] = useState("");
    const [filterSession, setFilterSession] = useState("");
    const [filterDept, setFilterDept] = useState("");
    const [filterSub, setFilterSub] = useState("");
    const [filterLevel, setFilterLevel] = useState("");
    const [filterSubLevel, setFilterSubLevel] = useState("");
    const [filterPriority, setFilterPriority] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [viewMode, setViewMode] = useState("table");
    const [selectedTask, setSelectedTask] = useState(null);

    const { data: tasksResponse, isLoading, isError, refetch } = useGetAllTasksQuery({ status: "all" });
    const [deleteTask, { isLoading: deleting }] = useDeleteTaskMutation();

    const taskRows = useMemo(() => {
        const tasks = tasksResponse?.data || [];
        return tasks.map((task) => {
            const context = task.context || {};
            return {
                id: task._id,
                academicYear: context.academicYear || "-",
                session: context.session?.name || "-",
                department: context.department?.name || "-",
                subDept: context.subDepartment?.name || "-",
                level: context.level?.name || "-",
                subLevel: context.subLevel?.name || "-",
                taskTitle: task.title || "-",
                subject: task.subjectName || "General",
                topic: task.topicName || "",
                priority: task.priority || "medium",
                status: task.isActive ? "active" : "inactive",
                type: task.type || "assignment",
                createdAt: task.createdAt,
                raw: task,
            };
        });
    }, [tasksResponse]);

    const years = getOptionValues(taskRows, "academicYear").filter((v) => v !== "-");
    const sessions = getOptionValues(taskRows, "session").filter((v) => v !== "-");
    const depts = getOptionValues(taskRows, "department").filter((v) => v !== "-");
    const subDepts = getOptionValues(taskRows, "subDept").filter((v) => v !== "-");
    const levels = getOptionValues(taskRows, "level").filter((v) => v !== "-");
    const subLevels = getOptionValues(taskRows, "subLevel").filter((v) => v !== "-");

    const activeFilterCount = [
        Boolean(filterYear),
        Boolean(filterSession),
        Boolean(filterDept),
        Boolean(filterSub),
        Boolean(filterLevel),
        Boolean(filterSubLevel),
        Boolean(filterPriority),
        Boolean(filterStatus),
    ].filter(Boolean).length;

    const filtered = useMemo(() => {
        return taskRows.filter((task) => {
            const q = searchTerm.trim().toLowerCase();
            const searchable = [
                task.taskTitle,
                task.subject,
                task.topic,
                task.department,
                task.subDept,
                task.id,
            ].join(" ").toLowerCase();

            return (
                (!q || searchable.includes(q)) &&
                (!filterYear || task.academicYear === filterYear) &&
                (!filterSession || task.session === filterSession) &&
                (!filterDept || task.department === filterDept) &&
                (!filterSub || task.subDept === filterSub) &&
                (!filterLevel || task.level === filterLevel) &&
                (!filterSubLevel || task.subLevel === filterSubLevel) &&
                (!filterPriority || task.priority === filterPriority) &&
                (!filterStatus || task.status === filterStatus)
            );
        });
    }, [taskRows, searchTerm, filterYear, filterSession, filterDept, filterSub, filterLevel, filterSubLevel, filterPriority, filterStatus]);

    const resetFilters = () => {
        setSearchTerm("");
        setFilterYear("");
        setFilterSession("");
        setFilterDept("");
        setFilterSub("");
        setFilterLevel("");
        setFilterSubLevel("");
        setFilterPriority("");
        setFilterStatus("");
        setCurrentPage(1);
    };

    const handleDelete = async (task) => {
        if (!task?.id || deleting) return;
        if (!window.confirm(`Delete task "${task.taskTitle}"?`)) return;

        try {
            await deleteTask(task.id).unwrap();
            toast.success("Task deleted successfully");
            refetch();
        } catch (error) {
            toast.error(error?.data?.message || "Failed to delete task");
        }
    };

    const hasActiveFilters = Boolean(
        searchTerm || activeFilterCount > 0
    );

    const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedData = filtered.slice(startIndex, startIndex + rowsPerPage);

    return (
        <>
            <Header
                title="Task Management"
                subtitle="Manage and monitor sub-level tasks across departments and sessions"
                badge={`${taskRows.length} tasks`}
                breadcrumbs={[
                    { label: "Academics" },
                    { label: "Task Management" },
                ]}
            />

            <div className="p-3.5 sm:p-5 lg:p-6 w-full min-h-screen bg-gray-50/40 space-y-4 sm:space-y-6">

                {/* Top Action & Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xs">
                    {!isFaculty && (
                        <button
                            onClick={refetch}
                            className="w-full sm:w-auto h-10 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
                        >
                            <MdAdd size={18} />
                            <span>Add New Task</span>
                        </button>
                    )}

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-72 md:w-80">
                            <MdSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder="Search tasks by title, subject, or ID..."
                                className="w-full pl-9 pr-8 h-10 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50 hover:bg-white text-slate-800 placeholder-slate-400 transition shadow-2xs"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm("");
                                        setCurrentPage(1);
                                    }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                    aria-label="Clear search"
                                >
                                    <MdClose size={16} />
                                </button>
                            )}
                        </div>

                        {/* Mobile Filters Toggle Button */}
                        <button
                            type="button"
                            onClick={() => setShowMobileFilters((p) => !p)}
                            className={`md:hidden h-10 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                                showMobileFilters || activeFilterCount > 0
                                    ? "bg-orange-50 border-orange-200 text-orange-600"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            <MdFilterList size={17} />
                            <span>Filters</span>
                            {activeFilterCount > 0 && (
                                <span className="w-4.5 h-4.5 rounded-full bg-orange-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                            <MdExpandMore
                                size={16}
                                className={`transition-transform duration-200 ${showMobileFilters ? "rotate-180" : ""}`}
                            />
                        </button>
                    </div>
                </div>

                {/* Desktop Filters: Full Grid (>= 768px) */}
                <div className="hidden md:block bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Filter by Parameters {activeFilterCount > 0 && `(${activeFilterCount} active)`}
                        </p>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="text-xs font-bold text-orange-500 hover:text-orange-600 transition flex items-center gap-1 cursor-pointer"
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-4 lg:grid-cols-8 gap-2.5">
                        <SelectDropdown
                            value={filterYear}
                            onChange={(val) => { setFilterYear(val); setCurrentPage(1); }}
                            options={[{ value: "", label: "Academic Year" }, ...years.map((y) => ({ value: y, label: y }))]}
                            className="w-full"
                            buttonClassName="h-9 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold transition-colors cursor-pointer hover:border-orange-400 shadow-2xs"
                        />
                        <SelectDropdown
                            value={filterSession}
                            onChange={(val) => { setFilterSession(val); setCurrentPage(1); }}
                            options={[{ value: "", label: "Session" }, ...sessions.map((s) => ({ value: s, label: s }))]}
                            className="w-full"
                            buttonClassName="h-9 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold transition-colors cursor-pointer hover:border-orange-400 shadow-2xs"
                        />
                        <SelectDropdown
                            value={filterDept}
                            onChange={(val) => { setFilterDept(val); setCurrentPage(1); }}
                            options={[{ value: "", label: "Department" }, ...depts.map((d) => ({ value: d, label: d }))]}
                            className="w-full"
                            buttonClassName="h-9 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold transition-colors cursor-pointer hover:border-orange-400 shadow-2xs"
                        />
                        <SelectDropdown
                            value={filterSub}
                            onChange={(val) => { setFilterSub(val); setCurrentPage(1); }}
                            options={[{ value: "", label: "Sub-Dept" }, ...subDepts.map((sd) => ({ value: sd, label: sd }))]}
                            className="w-full"
                            buttonClassName="h-9 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold transition-colors cursor-pointer hover:border-orange-400 shadow-2xs"
                        />
                        <SelectDropdown
                            value={filterLevel}
                            onChange={(val) => { setFilterLevel(val); setCurrentPage(1); }}
                            options={[{ value: "", label: "Level" }, ...levels.map((l) => ({ value: l, label: l }))]}
                            className="w-full"
                            buttonClassName="h-9 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold transition-colors cursor-pointer hover:border-orange-400 shadow-2xs"
                        />
                        <SelectDropdown
                            value={filterSubLevel}
                            onChange={(val) => { setFilterSubLevel(val); setCurrentPage(1); }}
                            options={[{ value: "", label: "Sub-Level" }, ...subLevels.map((sl) => ({ value: sl, label: sl }))]}
                            className="w-full"
                            buttonClassName="h-9 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold transition-colors cursor-pointer hover:border-orange-400 shadow-2xs"
                        />
                        <SelectDropdown
                            value={filterPriority}
                            onChange={(val) => { setFilterPriority(val); setCurrentPage(1); }}
                            options={[
                                { value: "", label: "Priority" },
                                { value: "high", label: "High" },
                                { value: "medium", label: "Medium" },
                                { value: "low", label: "Low" }
                            ]}
                            className="w-full"
                            buttonClassName="h-9 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold transition-colors cursor-pointer hover:border-orange-400 shadow-2xs"
                        />
                        <SelectDropdown
                            value={filterStatus}
                            onChange={(val) => { setFilterStatus(val); setCurrentPage(1); }}
                            options={[
                                { value: "", label: "Status" },
                                { value: "active", label: "Active" },
                                { value: "inactive", label: "Disabled" }
                            ]}
                            className="w-full"
                            buttonClassName="h-9 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold transition-colors cursor-pointer hover:border-orange-400 shadow-2xs"
                        />
                    </div>
                </div>

                {/* Mobile Filters: Collapsible Card (< 768px) */}
                {showMobileFilters && (
                    <div className="md:hidden bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                Filter Options {activeFilterCount > 0 && `(${activeFilterCount} active)`}
                            </p>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="text-xs font-bold text-orange-500 hover:text-orange-600 transition cursor-pointer"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                            <SelectDropdown
                                value={filterYear}
                                onChange={(val) => { setFilterYear(val); setCurrentPage(1); }}
                                options={[{ value: "", label: "Academic Year" }, ...years.map((y) => ({ value: y, label: y }))]}
                                className="w-full"
                                buttonClassName="h-9 w-full flex items-center justify-between gap-1.5 px-2.5 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs"
                            />
                            <SelectDropdown
                                value={filterSession}
                                onChange={(val) => { setFilterSession(val); setCurrentPage(1); }}
                                options={[{ value: "", label: "Session" }, ...sessions.map((s) => ({ value: s, label: s }))]}
                                className="w-full"
                                buttonClassName="h-9 w-full flex items-center justify-between gap-1.5 px-2.5 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs"
                            />
                            <SelectDropdown
                                value={filterDept}
                                onChange={(val) => { setFilterDept(val); setCurrentPage(1); }}
                                options={[{ value: "", label: "Department" }, ...depts.map((d) => ({ value: d, label: d }))]}
                                className="w-full"
                                buttonClassName="h-9 w-full flex items-center justify-between gap-1.5 px-2.5 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs"
                            />
                            <SelectDropdown
                                value={filterSub}
                                onChange={(val) => { setFilterSub(val); setCurrentPage(1); }}
                                options={[{ value: "", label: "Sub-Dept" }, ...subDepts.map((sd) => ({ value: sd, label: sd }))]}
                                className="w-full"
                                buttonClassName="h-9 w-full flex items-center justify-between gap-1.5 px-2.5 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs"
                            />
                            <SelectDropdown
                                value={filterLevel}
                                onChange={(val) => { setFilterLevel(val); setCurrentPage(1); }}
                                options={[{ value: "", label: "Level" }, ...levels.map((l) => ({ value: l, label: l }))]}
                                className="w-full"
                                buttonClassName="h-9 w-full flex items-center justify-between gap-1.5 px-2.5 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs"
                            />
                            <SelectDropdown
                                value={filterSubLevel}
                                onChange={(val) => { setFilterSubLevel(val); setCurrentPage(1); }}
                                options={[{ value: "", label: "Sub-Level" }, ...subLevels.map((sl) => ({ value: sl, label: sl }))]}
                                className="w-full"
                                buttonClassName="h-9 w-full flex items-center justify-between gap-1.5 px-2.5 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs"
                            />
                            <SelectDropdown
                                value={filterPriority}
                                onChange={(val) => { setFilterPriority(val); setCurrentPage(1); }}
                                options={[
                                    { value: "", label: "Priority" },
                                    { value: "high", label: "High" },
                                    { value: "medium", label: "Medium" },
                                    { value: "low", label: "Low" }
                                ]}
                                className="w-full"
                                buttonClassName="h-9 w-full flex items-center justify-between gap-1.5 px-2.5 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs"
                            />
                            <SelectDropdown
                                value={filterStatus}
                                onChange={(val) => { setFilterStatus(val); setCurrentPage(1); }}
                                options={[
                                    { value: "", label: "Status" },
                                    { value: "active", label: "Active" },
                                    { value: "inactive", label: "Disabled" }
                                ]}
                                className="w-full"
                                buttonClassName="h-9 w-full flex items-center justify-between gap-1.5 px-2.5 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs"
                            />
                        </div>
                    </div>
                )}

                {/* ── DATA SECTION ── */}
                <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-2xs overflow-hidden">
                    {isLoading ? (
                        <div className="py-20 text-center text-xs font-semibold text-slate-400">Loading tasks database...</div>
                    ) : isError ? (
                        <div className="py-20 text-center space-y-3">
                            <p className="text-xs font-bold text-rose-500">Failed to load tasks records</p>
                            <button onClick={refetch} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer">
                                Retry Loading
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Data Bar: Title, Count, Swipe Hint & Mobile View Toggle */}
                            <div className="px-3.5 sm:px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 bg-white">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-800">
                                        Tasks Database
                                    </span>
                                    <span className="text-[11px] font-extrabold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">
                                        {filtered.length} {filtered.length === 1 ? "task" : "tasks"}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Mobile Horizontal Swipe Hint (when in Table view) */}
                                    {viewMode === "table" && (
                                        <span className="md:hidden text-[10px] font-semibold text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                            <span>Swipe table ⇄</span>
                                        </span>
                                    )}

                                    {/* View Switcher for mobile screens (< 768px) */}
                                    <div className="md:hidden flex items-center p-0.5 bg-slate-100/90 rounded-xl border border-slate-200/70">
                                        <button
                                            type="button"
                                            onClick={() => setViewMode("table")}
                                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                                viewMode === "table"
                                                    ? "bg-white text-orange-600 shadow-2xs"
                                                    : "text-slate-500 hover:text-slate-800"
                                            }`}
                                            title="Compact Table View"
                                        >
                                            <MdViewList size={16} />
                                            <span>Table</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode("cards")}
                                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                                viewMode === "cards"
                                                    ? "bg-white text-orange-600 shadow-2xs"
                                                    : "text-slate-500 hover:text-slate-800"
                                            }`}
                                            title="Card View"
                                        >
                                            <MdGridView size={16} />
                                            <span>Cards</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Empty State */}
                            {paginatedData.length === 0 ? (
                                <div className="py-14 text-center text-slate-400 px-4 space-y-2">
                                    <p className="text-xs font-bold text-slate-700">No task records matching selected filters</p>
                                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">Try clearing search query or reset filter selections.</p>
                                    {hasActiveFilters && (
                                        <button
                                            type="button"
                                            onClick={resetFilters}
                                            className="mt-2 text-xs font-bold text-orange-500 hover:text-orange-600 cursor-pointer"
                                        >
                                            Clear All Filters
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* Mobile Cards Mode (Active only when user explicitly toggles to 'cards' on mobile) */}
                                    {viewMode === "cards" ? (
                                        <div className="md:hidden p-3 space-y-3">
                                            {paginatedData.map((r) => (
                                                <div
                                                    key={r.id}
                                                    className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3 hover:border-orange-200 transition"
                                                >
                                                    {/* Top Row: Year/Session Chip + Priority Pill + Action */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="text-[10px] font-extrabold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md">
                                                                {r.academicYear} • {r.session}
                                                            </span>
                                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${PRIORITY_STYLES[r.priority] || PRIORITY_STYLES.medium}`}>
                                                                {r.priority}
                                                            </span>
                                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                                                r.status === "active"
                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                                                }`}>
                                                                {r.status}
                                                            </span>
                                                        </div>
                                                        <ActionMenu task={r} onDelete={handleDelete} onViewDetails={setSelectedTask} />
                                                    </div>

                                                    {/* Task Title & Subject */}
                                                    <div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedTask(r)}
                                                            className="text-left text-sm font-extrabold text-slate-900 leading-snug hover:text-orange-600 transition cursor-pointer break-words block w-full"
                                                            title={`Click to view details: ${r.taskTitle}`}
                                                        >
                                                            {r.taskTitle}
                                                        </button>
                                                        {(r.subject || r.topic) && (
                                                            <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1 flex-wrap">
                                                                <span className="text-orange-600 font-bold">{r.subject}</span>
                                                                {r.topic && (
                                                                    <>
                                                                        <span className="text-slate-300">›</span>
                                                                        <span className="text-slate-600">{r.topic}</span>
                                                                    </>
                                                                )}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Department & Level Hierarchy Box */}
                                                    <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 text-xs space-y-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-slate-400 font-medium">Department:</span>
                                                            <span className="font-bold text-slate-800 truncate">{r.department} / {r.subDept}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-slate-400 font-medium">Level:</span>
                                                            <span className="font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200/60 text-[11px]">
                                                                {r.level} ({r.subLevel})
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        /* Compact Sticky-Column Table (Default for Mobile & Desktop) */
                                        <div className="overflow-x-auto [-webkit-overflow-scrolling:touch] relative">
                                            <table className="w-full text-left border-collapse min-w-[780px] sm:min-w-[860px]">
                                                <thead>
                                                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                                        {/* Sticky Left: Task Info */}
                                                        <th className="sticky left-0 z-20 bg-slate-50/95 backdrop-blur-xs py-3 sm:py-3.5 px-3 sm:px-4 border-r border-slate-200/80 shadow-[3px_0_6px_-3px_rgba(0,0,0,0.08)] min-w-[170px] sm:min-w-[220px] max-w-[210px] sm:max-w-[280px]">
                                                            TASK INFO
                                                        </th>
                                                        <th className="py-3 sm:py-3.5 px-3 sm:px-4 whitespace-nowrap">ACADEMIC YEAR</th>
                                                        <th className="py-3 sm:py-3.5 px-3 sm:px-4 whitespace-nowrap">SESSION</th>
                                                        <th className="py-3 sm:py-3.5 px-3 sm:px-4 whitespace-nowrap">DEPARTMENT</th>
                                                        <th className="py-3 sm:py-3.5 px-3 sm:px-4 whitespace-nowrap">SUB-DEPT</th>
                                                        <th className="py-3 sm:py-3.5 px-3 sm:px-4 whitespace-nowrap">LEVEL</th>
                                                        <th className="py-3 sm:py-3.5 px-3 sm:px-4 whitespace-nowrap">SUB-LEVEL</th>
                                                        <th className="py-3 sm:py-3.5 px-3 sm:px-4 whitespace-nowrap">STATUS</th>
                                                        {/* Sticky Right: Action */}
                                                        <th className="sticky right-0 z-20 bg-slate-50/95 backdrop-blur-xs py-3 sm:py-3.5 px-3 border-l border-slate-200/80 shadow-[-3px_0_6px_-3px_rgba(0,0,0,0.08)] text-right min-w-[56px] sm:min-w-[64px]">
                                                            ACTION
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                                                    {paginatedData.map((r) => (
                                                        <tr key={r.id} className="group hover:bg-slate-50/80 transition-colors">
                                                            {/* Sticky Left Column: Task Title + Subject + Priority */}
                                                            <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/95 py-2.5 sm:py-3.5 px-3 sm:px-4 border-r border-slate-200/80 shadow-[3px_0_6px_-3px_rgba(0,0,0,0.08)] min-w-[170px] sm:min-w-[220px] max-w-[210px] sm:max-w-[280px] transition-colors">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedTask(r)}
                                                                    className="text-left font-extrabold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug hover:text-orange-600 transition cursor-pointer break-words block w-full group/title"
                                                                    title={`Click to view full details: ${r.taskTitle}`}
                                                                >
                                                                    <span className="group-hover/title:underline">{r.taskTitle}</span>
                                                                </button>
                                                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                                    <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.2 rounded truncate max-w-[100px]" title={r.subject}>
                                                                        {r.subject}
                                                                    </span>
                                                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${PRIORITY_STYLES[r.priority] || PRIORITY_STYLES.medium}`}>
                                                                        {r.priority}
                                                                    </span>
                                                                </div>
                                                            </td>

                                                            {/* Scrollable Middle Columns */}
                                                            <td className="py-2.5 sm:py-3.5 px-3 sm:px-4 font-extrabold text-slate-900 whitespace-nowrap">
                                                                {r.academicYear}
                                                            </td>
                                                            <td className="py-2.5 sm:py-3.5 px-3 sm:px-4 text-slate-600 font-medium whitespace-nowrap">
                                                                {r.session}
                                                            </td>
                                                            <td className="py-2.5 sm:py-3.5 px-3 sm:px-4 font-bold text-slate-900 whitespace-nowrap">
                                                                {r.department}
                                                            </td>
                                                            <td className="py-2.5 sm:py-3.5 px-3 sm:px-4 text-slate-500 font-medium whitespace-nowrap">
                                                                {r.subDept}
                                                            </td>
                                                            <td className="py-2.5 sm:py-3.5 px-3 sm:px-4 font-bold text-slate-800 whitespace-nowrap">
                                                                {r.level}
                                                            </td>
                                                            <td className="py-2.5 sm:py-3.5 px-3 sm:px-4 text-slate-600 font-medium whitespace-nowrap">
                                                                {r.subLevel}
                                                            </td>
                                                            <td className="py-2.5 sm:py-3.5 px-3 sm:px-4 whitespace-nowrap">
                                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                                                    r.status === "active"
                                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                        : "bg-slate-100 text-slate-600 border-slate-200"
                                                                }`}>
                                                                    {r.status}
                                                                </span>
                                                            </td>

                                                            {/* Sticky Right Column: Action */}
                                                            <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50/95 py-2.5 sm:py-3.5 px-3 border-l border-slate-200/80 shadow-[-3px_0_6px_-3px_rgba(0,0,0,0.08)] text-right min-w-[56px] sm:min-w-[64px] transition-colors">
                                                                <ActionMenu task={r} onDelete={handleDelete} onViewDetails={setSelectedTask} />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Responsive Pagination Row with Rows-Per-Page Selector */}
                            <div className="px-3.5 sm:px-6 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                                <div className="flex items-center justify-between sm:justify-start gap-4">
                                    {/* Rows Per Page Selector */}
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-semibold text-slate-500">Show:</span>
                                        <select
                                            value={rowsPerPage}
                                            onChange={(e) => {
                                                setRowsPerPage(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="h-7 sm:h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-orange-500 cursor-pointer shadow-2xs"
                                        >
                                            <option value={10}>10</option>
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </select>
                                    </div>

                                    <div className="text-[11px] sm:text-xs text-slate-500">
                                        Showing <span className="font-bold text-slate-700">{filtered.length > 0 ? startIndex + 1 : 0}</span> to{" "}
                                        <span className="font-bold text-slate-700">{Math.min(startIndex + rowsPerPage, filtered.length)}</span> of{" "}
                                        <span className="font-bold text-slate-700">{filtered.length}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center sm:justify-end gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="h-8 px-2.5 sm:px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition text-slate-700 font-bold text-xs cursor-pointer shadow-2xs flex items-center gap-1"
                                    >
                                        <MdChevronLeft size={16} />
                                        <span className="hidden sm:inline">Previous</span>
                                    </button>

                                    {/* Mobile: Condensed page count */}
                                    <div className="sm:hidden px-2 text-xs font-bold text-slate-700">
                                        {currentPage} / {totalPages}
                                    </div>

                                    {/* Desktop: Numbered buttons */}
                                    <div className="hidden sm:flex items-center gap-1">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                                            .filter((pg) => {
                                                if (totalPages <= 7) return true;
                                                return pg === 1 || pg === totalPages || Math.abs(pg - currentPage) <= 1;
                                            })
                                            .map((pg, idx, arr) => {
                                                const prev = arr[idx - 1];
                                                const showEllipsis = prev && pg - prev > 1;
                                                return (
                                                    <div key={pg} className="flex items-center gap-1">
                                                        {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                                                        <button
                                                            type="button"
                                                            onClick={() => setCurrentPage(pg)}
                                                            className={`w-8 h-8 rounded-xl font-bold transition text-xs cursor-pointer ${
                                                                currentPage === pg
                                                                    ? "bg-orange-500 text-white shadow-2xs"
                                                                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                                                            }`}
                                                        >
                                                            {pg}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="h-8 px-2.5 sm:px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition text-slate-700 font-bold text-xs cursor-pointer shadow-2xs flex items-center gap-1"
                                    >
                                        <span className="hidden sm:inline">Next</span>
                                        <MdChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Task Detail Modal */}
            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onDelete={handleDelete}
                />
            )}
        </>
    );
};

export default TaskManagement;
