import { useState } from "react";
import { useGetMyStudentTasksQuery, useUpdateMyStudentTaskStatusMutation } from "../../../redux/api/studentApi";
import { 
    MdStar, 
    MdStarBorder, 
    MdAssignment, 
    MdCheckCircle, 
    MdAccessTime, 
    MdSearch, 
    MdDragIndicator,
    MdArrowForward,
    MdClose,
    MdInfoOutline,
    MdRefresh,
    MdPerson,
    MdOutlineCalendarToday,
    MdOutlineTopic
} from "react-icons/md";
import { toast } from "react-toastify";

const STATUS_COLS = [
    { key: "pending",    label: "Pending",     dot: "bg-amber-400",  colBg: "bg-amber-50/30",  border: "border-amber-200/80", badge: "bg-amber-100 text-amber-700",   emptyIcon: "text-amber-200" },
    { key: "inProgress", label: "In Progress", dot: "bg-blue-400",   colBg: "bg-blue-50/30",   border: "border-blue-200/80",  badge: "bg-blue-100 text-blue-700",     emptyIcon: "text-blue-200" },
    { key: "completed",  label: "Completed",   dot: "bg-emerald-400",colBg: "bg-emerald-50/30",border: "border-emerald-200/80",badge: "bg-emerald-100 text-emerald-700",emptyIcon: "text-emerald-200" },
];

export default function StudentTasks() {
    const { data: taskData, isLoading } = useGetMyStudentTasksQuery();
    const [updateTaskStatus] = useUpdateMyStudentTaskStatusMutation();
    const [search, setSearch] = useState("");
    const [activeSubject, setActiveSubject] = useState("All");
    const [dragOverCol, setDragOverCol] = useState(null);
    const [mobileTab, setMobileTab] = useState("all");
    const [selectedTask, setSelectedTask] = useState(null);

    const subjectGroups = taskData?.groupedBySubject || {};
    const allSubjects   = Object.keys(subjectGroups);
    const allTasks      = Object.values(subjectGroups).flatMap(g => g.tasks || []);

    // Sort allTasks by assignedAt/createdAt descending (latest first)
    const sortedTasks = [...allTasks].sort((a, b) => {
        const dateA = new Date(a.assignedAt || a.createdAt || 0);
        const dateB = new Date(b.assignedAt || b.createdAt || 0);
        return dateB - dateA;
    });

    const filtered = sortedTasks.filter(t => {
        const matchSearch  = t.title?.toLowerCase().includes(search.toLowerCase()) ||
                             t.subjectName?.toLowerCase().includes(search.toLowerCase()) ||
                             t.topicName?.toLowerCase().includes(search.toLowerCase());
        const matchSubject = activeSubject === "All" || t.subjectName === activeSubject;
        return matchSearch && matchSubject;
    });

    const byStatus = {
        pending:    filtered.filter(t => t.status === "pending"),
        inProgress: filtered.filter(t => t.status === "inProgress"),
        completed:  filtered.filter(t => t.status === "completed"),
    };

    const totalTasks     = taskData?.totalTasks     || 0;
    const completedTasks = taskData?.completedTasks || 0;
    const pendingTasks   = taskData?.pendingTasks   || 0;
    const taskPct        = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const evaluated = allTasks.filter(t => typeof t.marks === "number");
    const avgMarks  = evaluated.length > 0
        ? (evaluated.reduce((s, t) => s + t.marks, 0) / evaluated.length).toFixed(1)
        : null;

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await updateTaskStatus({ taskId, status: newStatus }).unwrap();
            toast.success(`Task status updated to ${newStatus === "inProgress" ? "In Progress" : "Pending"}`);
            if (selectedTask && selectedTask._id === taskId) {
                setSelectedTask(prev => ({ ...prev, status: newStatus }));
            }
        } catch (err) {
            toast.error(err?.data?.message || "Failed to update task status");
        }
    };

    const handleDragStart = (e, task) => {
        e.dataTransfer.setData("taskId", task._id);
        e.dataTransfer.setData("sourceStatus", task.status);
    };

    const handleDrop = async (e, targetStatus) => {
        const taskId = e.dataTransfer.getData("taskId");
        const sourceStatus = e.dataTransfer.getData("sourceStatus");

        if (!taskId || sourceStatus === targetStatus) return;

        // Validation: Block direct student completions
        if (targetStatus === "completed") {
            toast.error("Only faculty members can mark tasks as completed.");
            return;
        }
        if (sourceStatus === "completed") {
            toast.error("Completed tasks are evaluated and locked.");
            return;
        }

        await handleStatusChange(taskId, targetStatus);
    };

    if (isLoading) return (
        <div className="flex justify-center pt-20">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-4 sm:space-y-5">

            {/* ── Header Card ── */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400" />
                <div className="p-3.5 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-bold text-gray-900">My Tasks</h2>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                                    {totalTasks}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {completedTasks} completed · {pendingTasks} pending
                            </p>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-60 md:w-64">
                            <MdSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search tasks or subject..."
                                className="w-full pl-8 pr-8 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white bg-gray-50 text-gray-800 transition-all duration-200 placeholder:text-gray-400"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <MdClose size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stat Pills & Progress Bar */}
                    <div className="mt-3.5 pt-3 border-t border-gray-100/80">
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5">
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-50/80 border border-orange-100">
                                <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold text-orange-700 truncate">{taskPct}% Complete</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-100">
                                <MdCheckCircle size={13} className="text-emerald-500 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold text-emerald-700 truncate">{completedTasks} Done</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50/80 border border-amber-100">
                                <MdAccessTime size={13} className="text-amber-500 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold text-amber-700 truncate">{pendingTasks} Pending</span>
                            </div>
                            {avgMarks && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-yellow-50/80 border border-yellow-100">
                                    <MdStar size={13} className="text-yellow-500 shrink-0" />
                                    <span className="text-[11px] sm:text-xs font-bold text-yellow-700 truncate">Avg {avgMarks}/5</span>
                                </div>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                            <div 
                                className="h-1.5 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500" 
                                style={{ width: `${taskPct}%` }} 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Subject Filter Bar (Touch-friendly horizontal scroll) ── */}
            {allSubjects.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x -mx-1 px-1">
                    {["All", ...allSubjects].map(subj => {
                        const isActive = activeSubject === subj;
                        return (
                            <button
                                key={subj}
                                onClick={() => setActiveSubject(subj)}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all duration-150 shrink-0 ${
                                    isActive
                                        ? "bg-orange-500 text-white border-orange-500 shadow-xs"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600"
                                }`}
                            >
                                {subj}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Mobile Status Tabs (md:hidden) ── */}
            <div className="md:hidden bg-gray-100/90 p-1 rounded-xl flex gap-1 text-xs font-bold">
                <button
                    onClick={() => setMobileTab("all")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                        mobileTab === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <span>All</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-200 text-gray-700">
                        {filtered.length}
                    </span>
                </button>
                <button
                    onClick={() => setMobileTab("pending")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                        mobileTab === "pending" ? "bg-white text-amber-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <span>Pending</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
                        {byStatus.pending.length}
                    </span>
                </button>
                <button
                    onClick={() => setMobileTab("inProgress")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                        mobileTab === "inProgress" ? "bg-white text-blue-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <span>In Prog</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
                        {byStatus.inProgress.length}
                    </span>
                </button>
                <button
                    onClick={() => setMobileTab("completed")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                        mobileTab === "completed" ? "bg-white text-emerald-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <span>Done</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                        {byStatus.completed.length}
                    </span>
                </button>
            </div>

            {/* ── Mobile Tasks List (md:hidden) ── */}
            <div className="md:hidden space-y-3">
                {mobileTab === "all" ? (
                    // Grouped view for "All" tab on mobile
                    STATUS_COLS.map(col => {
                        const tasks = byStatus[col.key];
                        if (tasks.length === 0) return null;
                        return (
                            <div key={col.key} className="space-y-2">
                                <div className="flex items-center gap-2 px-1">
                                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{col.label}</h3>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                                        {tasks.length}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {tasks.map(task => (
                                        <TaskCard
                                            key={task._id}
                                            task={task}
                                            onStatusChange={handleStatusChange}
                                            onSelectTask={setSelectedTask}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    // Single status tab view on mobile
                    <div className="space-y-2">
                        {byStatus[mobileTab].length === 0 ? (
                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl py-12 bg-white/70">
                                <MdAssignment size={28} className="text-gray-300" />
                                <p className="text-xs text-gray-400 mt-2 font-medium">
                                    No {mobileTab === "inProgress" ? "in-progress" : mobileTab} tasks found
                                </p>
                            </div>
                        ) : (
                            byStatus[mobileTab].map(task => (
                                <TaskCard
                                    key={task._id}
                                    task={task}
                                    onStatusChange={handleStatusChange}
                                    onSelectTask={setSelectedTask}
                                />
                            ))
                        )}
                    </div>
                )}

                {/* Overall Empty State on Mobile */}
                {filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl py-12 bg-white/70">
                        <MdAssignment size={30} className="text-gray-300" />
                        <p className="text-xs text-gray-400 mt-2 font-semibold">No matching tasks found</p>
                    </div>
                )}
            </div>

            {/* ── Desktop Kanban Columns (hidden md:grid) ── */}
            <div className="hidden md:grid md:grid-cols-3 gap-4">
                {STATUS_COLS.map(col => (
                    <div 
                        key={col.key}
                        onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
                        onDragLeave={() => setDragOverCol(null)}
                        onDrop={async (e) => {
                            setDragOverCol(null);
                            await handleDrop(e, col.key);
                        }}
                        className={`rounded-2xl border transition-all duration-200 ${
                            dragOverCol === col.key 
                                ? "border-orange-400 bg-orange-50/50 shadow-md scale-[1.01]" 
                                : `${col.border} ${col.colBg}`
                        } p-3.5`}
                    >
                        {/* Column Header */}
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                            <h3 className="text-sm font-bold text-gray-700">{col.label}</h3>
                            <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                                {byStatus[col.key].length}
                            </span>
                        </div>

                        {/* Column Task Cards */}
                        <div className="space-y-2.5 min-h-[350px]">
                            {byStatus[col.key].length === 0 ? (
                                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200/80 rounded-xl py-10 bg-white/60">
                                    <MdAssignment size={24} className={col.emptyIcon} />
                                    <p className="text-xs text-gray-400 mt-2 font-medium">No {col.label.toLowerCase()} tasks</p>
                                </div>
                            ) : byStatus[col.key].map(task => (
                                <TaskCard 
                                    key={task._id} 
                                    task={task} 
                                    onDragStart={(e) => handleDragStart(e, task)} 
                                    onStatusChange={handleStatusChange}
                                    onSelectTask={setSelectedTask}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Task Details Modal ── */}
            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onStatusChange={handleStatusChange}
                />
            )}
        </div>
    );
}

function formatTimeAgo(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (isNaN(seconds)) return "";
    if (seconds < 0) return "Just now";

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
        second: 1
    };

    for (const [unit, value] of Object.entries(intervals)) {
        const count = Math.floor(seconds / value);
        if (count >= 1) {
            return `${count} ${unit}${count > 1 ? "s" : ""} ago`;
        }
    }
    return "Just now";
}

function formatDate(dateString) {
    if (!dateString) return "";
    try {
        const d = new Date(dateString);
        return d.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    } catch {
        return "";
    }
}

// ── Responsive Task Card ──
function TaskCard({ task, onDragStart, onStatusChange, onSelectTask }) {
    const max = task.maxMarks || 5;

    const statusConfig = {
        pending: {
            borderClass: "border-l-4 border-l-amber-500 hover:border-amber-600",
            bgClass: "hover:bg-amber-50/20",
            badge: "bg-amber-50 text-amber-700 border-amber-200/60",
            dot: "bg-amber-500",
            label: "Pending"
        },
        inProgress: {
            borderClass: "border-l-4 border-l-blue-500 hover:border-blue-600",
            bgClass: "hover:bg-blue-50/20",
            badge: "bg-blue-50 text-blue-700 border-blue-200/60",
            dot: "bg-blue-500",
            label: "In Progress"
        },
        completed: {
            borderClass: "border-l-4 border-l-emerald-500 hover:border-emerald-600",
            bgClass: "hover:bg-emerald-50/20",
            badge: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
            dot: "bg-emerald-500",
            label: "Completed"
        }
    };

    const cfg = statusConfig[task.status] || statusConfig.pending;

    return (
        <div>
            {/* ── Mobile Card View (md:hidden) ── */}
            {/* Minimal, uncluttered, touch-optimized */}
            <div 
                className={`md:hidden bg-white rounded-xl border border-gray-200/80 p-3 shadow-2xs hover:shadow-xs transition-all ${cfg.borderClass}`}
            >
                {/* Row 1: Subject Tag & Status / Score */}
                <div className="flex items-center justify-between gap-2">
                    {task.subjectName ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100/60 truncate max-w-[65%]">
                            {task.subjectName}
                        </span>
                    ) : <span />}

                    {task.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                            <MdCheckCircle size={12} className="text-emerald-500 shrink-0" />
                            <span>{task.marks != null ? `${task.marks}/${max}` : "Done"}</span>
                        </span>
                    ) : task.status === "inProgress" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                            <span>In Progress</span>
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>Pending</span>
                        </span>
                    )}
                </div>

                {/* Row 2: Task Title */}
                <h4 
                    onClick={() => onSelectTask(task)} 
                    className="text-xs font-bold text-gray-800 leading-snug line-clamp-2 mt-2 cursor-pointer hover:text-orange-600 transition-colors"
                >
                    {task.title}
                </h4>

                {/* Row 3: Action & Details Button */}
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100">
                    <div>
                        {task.status === "pending" && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStatusChange(task._id, "inProgress");
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 active:scale-95 px-2.5 py-1 rounded-lg transition-all border border-orange-200/60"
                            >
                                <span>Start Task</span>
                                <MdArrowForward size={12} />
                            </button>
                        )}
                        {task.status === "inProgress" && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStatusChange(task._id, "pending");
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:scale-95 px-2 py-1 rounded-lg transition-all"
                            >
                                <MdRefresh size={12} />
                                <span>Move to Pending</span>
                            </button>
                        )}
                        {task.status === "completed" && (
                            <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                                <MdCheckCircle size={12} />
                                <span>Graded by Faculty</span>
                            </span>
                        )}
                    </div>

                    <button
                        onClick={() => onSelectTask(task)}
                        className="text-[11px] font-bold text-gray-500 hover:text-orange-600 flex items-center gap-0.5 py-1 px-1.5 rounded-lg hover:bg-gray-50 transition"
                    >
                        <span>Details</span>
                        <span className="text-gray-400 font-bold">›</span>
                    </button>
                </div>
            </div>

            {/* ── Desktop Card View (hidden md:flex) ── */}
            {/* Full featured with drag-and-drop & metadata */}
            <div 
                draggable={task.status !== "completed"}
                onDragStart={onDragStart}
                className={`hidden md:flex bg-white rounded-xl border border-gray-200 p-4 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex-col justify-between h-full min-h-[155px] ${cfg.borderClass} ${cfg.bgClass} ${
                    task.status !== "completed" ? "cursor-grab active:cursor-grabbing" : ""
                }`}
            >
                <div>
                    {/* Subject tag + Drag Handle */}
                    <div className="flex items-center justify-between mb-2">
                        {task.subjectName ? (
                            <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                                {task.subjectName}
                            </span>
                        ) : <span />}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => onSelectTask(task)}
                                title="View details"
                                className="text-gray-300 hover:text-gray-600 p-0.5 rounded"
                            >
                                <MdInfoOutline size={14} />
                            </button>
                            {task.status !== "completed" && (
                                <MdDragIndicator className="text-gray-300 hover:text-gray-400 shrink-0" size={14} />
                            )}
                        </div>
                    </div>

                    <h4 
                        onClick={() => onSelectTask(task)}
                        className="text-xs font-extrabold text-gray-800 leading-snug tracking-tight line-clamp-2 cursor-pointer hover:text-orange-600 transition-colors"
                    >
                        {task.title}
                    </h4>

                    {task.topicName && (
                        <p className="text-[10px] text-gray-400 font-semibold mt-1.5 flex items-center gap-1">
                            <span className="text-gray-300 font-bold">›</span> {task.topicName}
                        </p>
                    )}
                </div>

                {/* Status Dropdown/Badge */}
                {task.status !== "completed" ? (
                    <div className="mt-3">
                        <label className="text-[9px] font-bold text-gray-400 block mb-1">Status</label>
                        <select
                            value={task.status}
                            onChange={(e) => onStatusChange(task._id, e.target.value)}
                            className="w-full text-xs font-bold px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-orange-500 focus:bg-white text-gray-700 transition cursor-pointer"
                        >
                            <option value="pending">Pending</option>
                            <option value="inProgress">In Progress</option>
                        </select>
                    </div>
                ) : (
                    <div className="mt-3 flex items-center gap-1 text-emerald-600">
                        <MdCheckCircle size={14} />
                        <span className="text-[9px] font-extrabold uppercase tracking-wider">Completed</span>
                    </div>
                )}

                {/* Bottom Row */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-2">
                    {/* Given by & Time ago */}
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span className="flex items-center gap-1 font-medium bg-gray-50 border border-gray-200/50 rounded-full px-2 py-0.5 max-w-[65%]">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                            <span className="truncate" title={task.assignedByName || "Auto-assigned"}>
                                {task.assignedByName || "Auto-assigned"}
                            </span>
                        </span>
                        {(task.assignedAt || task.createdAt) && (
                            <span className="font-semibold text-gray-400/90 whitespace-nowrap">
                                {formatTimeAgo(task.assignedAt || task.createdAt)}
                            </span>
                        )}
                    </div>

                    {/* Marks (If completed) */}
                    {task.status === "completed" && task.marks != null && (
                        <div className="flex items-center justify-between mt-1 bg-orange-50/40 border border-orange-100/50 rounded-xl px-2.5 py-1.5 shadow-2xs">
                            <span className="text-[10px] font-extrabold text-orange-600/90 uppercase tracking-wider">Score</span>
                            <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-0.5">
                                    {Array.from({ length: max }, (_, i) => (
                                        i < task.marks
                                            ? <MdStar key={i} size={11} className="text-orange-400" />
                                            : <MdStarBorder key={i} size={11} className="text-gray-200" />
                                    ))}
                                </div>
                                <span className="text-[11px] font-black text-gray-700">{task.marks}<span className="text-gray-400 font-medium">/{max}</span></span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Task Details Modal ──
function TaskDetailModal({ task, onClose, onStatusChange }) {
    const max = task.maxMarks || 5;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            <div 
                className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                    <div className="flex items-center gap-2">
                        {task.subjectName && (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {task.subjectName}
                            </span>
                        )}
                        {task.status === "completed" ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                Completed
                            </span>
                        ) : task.status === "inProgress" ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                In Progress
                            </span>
                        ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                Pending
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
                    >
                        <MdClose size={16} />
                    </button>
                </div>

                {/* Modal Scrollable Content */}
                <div className="p-5 overflow-y-auto space-y-4">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 leading-snug">
                            {task.title}
                        </h3>
                        {task.topicName && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mt-2 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                                <MdOutlineTopic size={14} className="text-orange-500 shrink-0" />
                                <span>{task.topicName} {task.subTopicName ? `› ${task.subTopicName}` : ""}</span>
                            </div>
                        )}
                    </div>

                    {/* Description / Instructions */}
                    {task.description && (
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                Description & Instructions
                            </label>
                            <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed whitespace-pre-wrap">
                                {task.description}
                            </p>
                        </div>
                    )}

                    {/* Assignment Metadata */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-gray-600">
                            <span className="flex items-center gap-1.5 text-gray-400">
                                <MdPerson size={14} /> Assigned By:
                            </span>
                            <span className="font-semibold text-gray-800">
                                {task.assignedByName || "Auto-assigned"} {task.assignedByRole ? `(${task.assignedByRole})` : ""}
                            </span>
                        </div>
                        {(task.assignedAt || task.createdAt) && (
                            <div className="flex items-center justify-between text-gray-600">
                                <span className="flex items-center gap-1.5 text-gray-400">
                                    <MdOutlineCalendarToday size={13} /> Assigned On:
                                </span>
                                <span className="font-medium text-gray-700">
                                    {formatDate(task.assignedAt || task.createdAt)} ({formatTimeAgo(task.assignedAt || task.createdAt)})
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Evaluated Score & Remarks */}
                    {task.status === "completed" && (
                        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Evaluation Score</span>
                                <div className="flex items-center gap-1.5">
                                    <div className="flex items-center gap-0.5">
                                        {Array.from({ length: max }, (_, i) => (
                                            i < (task.marks || 0)
                                                ? <MdStar key={i} size={14} className="text-orange-400" />
                                                : <MdStarBorder key={i} size={14} className="text-gray-300" />
                                        ))}
                                    </div>
                                    <span className="text-xs font-black text-emerald-900">
                                        {task.marks != null ? `${task.marks}/${max}` : "Evaluated"}
                                    </span>
                                </div>
                            </div>
                            {task.notes && (
                                <div className="pt-2 border-t border-emerald-100 text-xs text-emerald-800">
                                    <span className="font-bold block mb-0.5">Faculty Remarks:</span>
                                    <p className="italic">{task.notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal Footer Actions */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
                    {task.status === "pending" ? (
                        <button
                            onClick={() => {
                                onStatusChange(task._id, "inProgress");
                                onClose();
                            }}
                            className="flex-1 py-2 px-3 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
                        >
                            <span>Start Task (In Progress)</span>
                            <MdArrowForward size={14} />
                        </button>
                    ) : task.status === "inProgress" ? (
                        <button
                            onClick={() => {
                                onStatusChange(task._id, "pending");
                                onClose();
                            }}
                            className="flex-1 py-2 px-3 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
                        >
                            <MdRefresh size={14} />
                            <span>Move Back to Pending</span>
                        </button>
                    ) : (
                        <div className="flex-1 text-center text-xs font-bold text-emerald-700 bg-emerald-100/70 py-2 rounded-xl">
                            ✓ Task completed & locked
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="py-2 px-4 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
