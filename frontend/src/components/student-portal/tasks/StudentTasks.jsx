import { useState } from "react";
import { useGetMyStudentTasksQuery, useUpdateMyStudentTaskStatusMutation } from "../../../redux/api/studentApi";
import { MdStar, MdStarBorder, MdAssignment, MdCheckCircle, MdAccessTime, MdSearch, MdDragIndicator } from "react-icons/md";
import { toast } from "react-toastify";

const STATUS_COLS = [
    { key: "pending",    label: "Pending",     dot: "bg-gray-400",   colBg: "bg-gray-50",   border: "border-gray-200",  badge: "bg-gray-100 text-gray-600",   emptyIcon: "text-gray-300" },
    { key: "inProgress", label: "In Progress", dot: "bg-blue-400",   colBg: "bg-blue-50",   border: "border-blue-100",  badge: "bg-blue-100 text-blue-600",   emptyIcon: "text-blue-200" },
    { key: "completed",  label: "Completed",   dot: "bg-green-400",  colBg: "bg-green-50",  border: "border-green-100", badge: "bg-green-100 text-green-600", emptyIcon: "text-green-200" },
];

export default function StudentTasks() {
    const { data: taskData, isLoading } = useGetMyStudentTasksQuery();
    const [updateTaskStatus] = useUpdateMyStudentTaskStatusMutation();
    const [search, setSearch] = useState("");
    const [activeSubject, setActiveSubject] = useState("All");
    const [dragOverCol, setDragOverCol] = useState(null);

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
                             t.subjectName?.toLowerCase().includes(search.toLowerCase());
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

        try {
            await updateTaskStatus({ taskId, status: targetStatus }).unwrap();
            toast.success(`Task status updated to ${targetStatus === "inProgress" ? "In Progress" : "Pending"}`);
        } catch (err) {
            toast.error(err?.data?.message || "Failed to update task status");
        }
    };

    if (isLoading) return (
        <div className="flex justify-center pt-20">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-5">

            {/* ── Header ── */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="h-1.5 w-full bg-orange-500" />
                <div className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">My Tasks</h2>
                            <p className="text-xs text-gray-400 mt-0.5">{totalTasks} total · {completedTasks} completed · {pendingTasks} pending</p>
                        </div>
                        {/* search */}
                        <div className="relative">
                            <MdSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search tasks..."
                                className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 bg-gray-50 w-56 transition-all duration-200"
                            />
                        </div>
                    </div>

                    {/* Stat pills */}
                    <div className="flex items-center gap-3 mt-4 flex-wrap">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            <span className="text-xs font-bold text-orange-600">{taskPct}% Complete</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-50 border border-green-100">
                            <MdCheckCircle size={12} className="text-green-500" />
                            <span className="text-xs font-bold text-green-600">{completedTasks} Done</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200">
                            <MdAccessTime size={12} className="text-gray-400" />
                            <span className="text-xs font-bold text-gray-600">{pendingTasks} Pending</span>
                        </div>
                        {avgMarks && (
                            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-yellow-50 border border-yellow-100">
                                <MdStar size={12} className="text-yellow-500" />
                                <span className="text-xs font-bold text-yellow-600">Avg {avgMarks}/5</span>
                            </div>
                        )}
                        {/* progress bar */}
                        <div className="flex-1 min-w-[120px]">
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-orange-400 transition-all duration-700" style={{ width: `${taskPct}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Subject Filter ── */}
            {allSubjects.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    {["All", ...allSubjects].map(subj => (
                        <button
                            key={subj}
                            onClick={() => setActiveSubject(subj)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all duration-150 ${
                                activeSubject === subj
                                    ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                                    : "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-500"
                            }`}
                        >
                            {subj}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Kanban Columns ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        } p-3`}
                    >

                        {/* Column header */}
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                            <h3 className="text-sm font-bold text-gray-700">{col.label}</h3>
                            <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                                {byStatus[col.key].length}
                            </span>
                        </div>

                        {/* Cards */}
                        <div className="space-y-2.5 min-h-[400px]">
                            {byStatus[col.key].length === 0 ? (
                                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl py-8 bg-white/60 animate-fade-in">
                                    <MdAssignment size={24} className={col.emptyIcon} />
                                    <p className="text-xs text-gray-400 mt-2">No {col.label.toLowerCase()} tasks</p>
                                </div>
                            ) : byStatus[col.key].map(task => (
                                <TaskCard 
                                    key={task._id} 
                                    task={task} 
                                    onDragStart={(e) => handleDragStart(e, task)} 
                                    updateTaskStatus={updateTaskStatus}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
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

function TaskCard({ task, onDragStart, updateTaskStatus }) {
    const max = task.maxMarks || 5;

    // Define status-based styles
    const statusConfig = {
        pending: {
            borderClass: "border-l-4 border-l-amber-500/80 hover:border-amber-500",
            bgClass: "hover:bg-amber-50/10",
            iconColor: "text-amber-500"
        },
        inProgress: {
            borderClass: "border-l-4 border-l-orange-500/80 hover:border-orange-500",
            bgClass: "hover:bg-orange-50/10",
            iconColor: "text-orange-500"
        },
        completed: {
            borderClass: "border-l-4 border-l-emerald-500/80 hover:border-emerald-500",
            bgClass: "hover:bg-emerald-50/10",
            iconColor: "text-emerald-500"
        }
    };

    const cfg = statusConfig[task.status] || statusConfig.pending;

    const handleStatusSelect = async (newStatus) => {
        if (newStatus === task.status) return;
        try {
            await updateTaskStatus({ taskId: task._id, status: newStatus }).unwrap();
            toast.success(`Task status updated to ${newStatus === "inProgress" ? "In Progress" : "Pending"}`);
        } catch (err) {
            toast.error(err?.data?.message || "Failed to update task status");
        }
    };

    return (
        <div 
            draggable={task.status !== "completed"}
            onDragStart={onDragStart}
            className={`bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ease-out flex flex-col justify-between h-full min-h-[145px] ${cfg.borderClass} ${cfg.bgClass} ${
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
                    {task.status !== "completed" && (
                        <MdDragIndicator className="text-gray-300 hover:text-gray-400 shrink-0" size={14} />
                    )}
                </div>

                <h4 className="text-xs font-extrabold text-gray-800 leading-snug tracking-tight line-clamp-2">
                    {task.title}
                </h4>

                {task.topicName && (
                    <p className="text-[10px] text-gray-400 font-semibold mt-1.5 flex items-center gap-1">
                        <span className="text-gray-300 font-bold">›</span> {task.topicName}
                    </p>
                )}
            </div>

            {/* Status Dropdown/Badge for Student */}
            {task.status !== "completed" ? (
                <div className="mt-3">
                    <label className="text-[9px] font-bold text-gray-400 block mb-1">Status Dropdown</label>
                    <select
                        value={task.status}
                        onChange={(e) => handleStatusSelect(e.target.value)}
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
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
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

                {/* Marks */}
                {task.status === "completed" && task.marks != null && (
                    <div className="flex items-center justify-between mt-1 bg-orange-50/40 border border-orange-100/50 rounded-xl px-2.5 py-1.5 shadow-sm">
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
    );
}
