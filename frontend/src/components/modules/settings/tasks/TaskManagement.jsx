import { useMemo, useState } from "react";
import {
    MdMoreVert, MdSearch, MdNotificationsNone, MdAdd, MdRefresh,
    MdCheckCircle, MdCancel, MdChevronLeft, MdChevronRight
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

const formatValue = (value) => {
    if (!value) return "-";
    return String(value)
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
};

const ActionMenu = ({ task, onDelete }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative flex justify-end">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((p) => !p);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
                <MdMoreVert size={18} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-8 z-20 bg-white border border-slate-100 rounded-2xl shadow-xl w-36 py-1.5 overflow-hidden text-xs font-semibold text-slate-700">
                        <button
                            onClick={() => setOpen(false)}
                            className="w-full px-4 py-2 text-left transition text-slate-300 cursor-not-allowed"
                            disabled
                        >
                            Edit Task
                        </button>
                        <button
                            onClick={() => {
                                setOpen(false);
                                onDelete(task);
                            }}
                            className="w-full px-4 py-2 text-left transition text-rose-600 hover:bg-rose-50 font-bold"
                        >
                            Delete Task
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

const TaskManagement = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterYear, setFilterYear] = useState("");
    const [filterSession, setFilterSession] = useState("");
    const [filterDept, setFilterDept] = useState("");
    const [filterSub, setFilterSub] = useState("");
    const [filterLevel, setFilterLevel] = useState("");
    const [filterSubLevel, setFilterSubLevel] = useState("");
    const [filterPriority, setFilterPriority] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    const { data: tasksResponse, isLoading, isFetching, isError, refetch } = useGetAllTasksQuery({ status: "all" });
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
        searchTerm || filterYear || filterSession || filterDept || filterSub || filterLevel || filterSubLevel || filterPriority || filterStatus
    );

    const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedData = filtered.slice(startIndex, startIndex + rowsPerPage);

    return (
        <div className="bg-[#F8F9FA] min-h-screen px-8 py-6 space-y-6">

            {/* TOP HEADER SECTION (EXACT REFERENCE REPLICA) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Task Management</h1>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">
                        Manage and monitor sub-level tasks across departments and sessions
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={refetch}
                        className="h-10 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-sm transition flex items-center gap-2"
                    >
                        <MdAdd size={18} /> Add New Task
                    </button>
                </div>
            </div>

            {/* FILTER CARD CONTAINER (EXACT REFERENCE REPLICA) */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                {/* Top Filter Selectors Row (Spans Across Full Container) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 w-full">
                    {/* Academic Year */}
                    <SelectDropdown
                        value={filterYear}
                        onChange={(val) => { setFilterYear(val); setCurrentPage(1); }}
                        options={[
                            { value: "", label: "Academic Year" },
                            ...years.map((y) => ({ value: y, label: y }))
                        ]}
                        className="w-full"
                        buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-medium transition-colors cursor-pointer focus:outline-none hover:border-slate-350 shadow-sm"
                    />

                    {/* Session */}
                    <SelectDropdown
                        value={filterSession}
                        onChange={(val) => { setFilterSession(val); setCurrentPage(1); }}
                        options={[
                            { value: "", label: "Session" },
                            ...sessions.map((s) => ({ value: s, label: s }))
                        ]}
                        className="w-full"
                        buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-medium transition-colors cursor-pointer focus:outline-none hover:border-slate-350 shadow-sm"
                    />

                    {/* Department */}
                    <SelectDropdown
                        value={filterDept}
                        onChange={(val) => { setFilterDept(val); setCurrentPage(1); }}
                        options={[
                            { value: "", label: "Department" },
                            ...depts.map((d) => ({ value: d, label: d }))
                        ]}
                        className="w-full"
                        buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-medium transition-colors cursor-pointer focus:outline-none hover:border-slate-350 shadow-sm"
                    />

                    {/* Sub-Dept */}
                    <SelectDropdown
                        value={filterSub}
                        onChange={(val) => { setFilterSub(val); setCurrentPage(1); }}
                        options={[
                            { value: "", label: "Sub-Dept" },
                            ...subDepts.map((sd) => ({ value: sd, label: sd }))
                        ]}
                        className="w-full"
                        buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-medium transition-colors cursor-pointer focus:outline-none hover:border-slate-350 shadow-sm"
                    />

                    {/* Level */}
                    <SelectDropdown
                        value={filterLevel}
                        onChange={(val) => { setFilterLevel(val); setCurrentPage(1); }}
                        options={[
                            { value: "", label: "Level" },
                            ...levels.map((l) => ({ value: l, label: l }))
                        ]}
                        className="w-full"
                        buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-medium transition-colors cursor-pointer focus:outline-none hover:border-slate-350 shadow-sm"
                    />

                    {/* Sub-Level */}
                    <SelectDropdown
                        value={filterSubLevel}
                        onChange={(val) => { setFilterSubLevel(val); setCurrentPage(1); }}
                        options={[
                            { value: "", label: "Sub-Level" },
                            ...subLevels.map((sl) => ({ value: sl, label: sl }))
                        ]}
                        className="w-full"
                        buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-medium transition-colors cursor-pointer focus:outline-none hover:border-slate-350 shadow-sm"
                    />

                    {/* Priority */}
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
                        buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-medium transition-colors cursor-pointer focus:outline-none hover:border-slate-350 shadow-sm"
                    />

                    {/* Status */}
                    <SelectDropdown
                        value={filterStatus}
                        onChange={(val) => { setFilterStatus(val); setCurrentPage(1); }}
                        options={[
                            { value: "", label: "Status" },
                            { value: "active", label: "Active" },
                            { value: "inactive", label: "Disabled" }
                        ]}
                        className="w-full"
                        buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-medium transition-colors cursor-pointer focus:outline-none hover:border-slate-350 shadow-sm"
                    />
                </div>

                {/* Bottom Full-Width Search Bar */}
                <div className="flex items-center h-10 w-full bg-slate-100/60 border border-slate-200/80 rounded-xl px-3.5 shadow-sm hover:border-slate-300 focus-within:border-orange-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-400/20 transition-all">
                    <MdSearch className="text-slate-400 flex-shrink-0 mr-2" size={18} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        placeholder="Search tasks by title, subject, or ID..."
                        className="w-full h-full bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none focus:border-none text-xs font-medium text-slate-800 placeholder-slate-400 p-0 shadow-none"
                    />
                </div>

                {hasActiveFilters && (
                    <div className="pt-1 flex items-center justify-end">
                        <button
                            onClick={resetFilters}
                            className="text-xs font-extrabold text-orange-500 hover:text-orange-600 transition flex items-center gap-1 cursor-pointer"
                        >
                            Reset Filters
                        </button>
                    </div>
                )}
            </div>

            {/* DATA TABLE CONTAINER (EXACT REFERENCE REPLICA) */}
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="py-20 text-center text-xs font-semibold text-slate-400">Loading tasks database...</div>
                ) : isError ? (
                    <div className="py-20 text-center space-y-3">
                        <p className="text-xs font-bold text-rose-500">Failed to load tasks records</p>
                        <button onClick={refetch} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold shadow-sm">
                            Retry Loading
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                        <th className="py-4 px-6">ACADEMIC YEAR</th>
                                        <th className="py-4 px-4">SESSION</th>
                                        <th className="py-4 px-6">DEPARTMENT</th>
                                        <th className="py-4 px-6">SUB-DEPT</th>
                                        <th className="py-4 px-4">LEVEL</th>
                                        <th className="py-4 px-4">SUB-LEVEL</th>
                                        <th className="py-4 px-6">TASK TITLE</th>
                                        <th className="py-4 px-6 text-right">ACTION</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                                    {paginatedData.length > 0 ? (
                                        paginatedData.map((r) => (
                                            <tr key={r.id} className="hover:bg-slate-50/80 transition">
                                                {/* Academic Year */}
                                                <td className="py-4 px-6 font-extrabold text-slate-900">
                                                    {r.academicYear}
                                                </td>

                                                {/* Session */}
                                                <td className="py-4 px-4 text-slate-600 font-medium">
                                                    {r.session}
                                                </td>

                                                {/* Department */}
                                                <td className="py-4 px-6 font-bold text-slate-900">
                                                    {r.department}
                                                </td>

                                                {/* Sub-Dept */}
                                                <td className="py-4 px-6 text-slate-500 font-medium">
                                                    {r.subDept}
                                                </td>

                                                {/* Level */}
                                                <td className="py-4 px-4 font-bold text-slate-800">
                                                    {r.level}
                                                </td>

                                                {/* Sub-Level */}
                                                <td className="py-4 px-4 text-slate-600 font-medium">
                                                    {r.subLevel}
                                                </td>

                                                {/* Task Title */}
                                                <td className="py-4 px-6">
                                                    <div className="font-extrabold text-slate-900 text-sm line-clamp-1">{r.taskTitle}</div>
                                                </td>

                                                {/* Action Menu */}
                                                <td className="py-4 px-6 text-right">
                                                    <ActionMenu task={r} onDelete={handleDelete} />
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-slate-400">
                                                No task records matching selected filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* TABLE FOOTER / PAGINATION ROW */}
                        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-semibold text-slate-500">
                            <div>
                                Showing {filtered.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + rowsPerPage, filtered.length)} of {filtered.length} tasks
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition text-slate-700 font-bold"
                                >
                                    Previous
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                                    <button
                                        key={pg}
                                        onClick={() => setCurrentPage(pg)}
                                        className={`w-8 h-8 rounded-xl font-bold transition text-xs ${
                                            currentPage === pg
                                                ? "bg-orange-500 text-white shadow-sm"
                                                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                                        }`}
                                    >
                                        {pg}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition text-slate-700 font-bold"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

        </div>
    );
};

export default TaskManagement;
