import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    MdTrendingUp,
    MdAssignment,
    MdStar,
    MdCheckCircle,
    MdAccessTime,
    MdCalendarToday,
    MdArrowForward,
    MdOutlineTopic,
    MdMenuBook,
    MdFolderOpen,
    MdAssessment,
    MdClose,
    MdTableChart,
    MdArrowUpward,
    MdSchool,
    MdEmail,
    MdPerson,
    MdLayers,
    MdChevronRight
} from "react-icons/md";
import {
    useGetMyStudentProfileQuery,
    useGetMyStudentTasksQuery,
    useGetMyStudentLevelHistoryQuery,
    useGetMyStudentEventLogQuery,
} from "../../../redux/api/studentApi";
import EmptyState from "../../shared/empty-state/EmptyState";

const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const formatDateTime = (d) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

function formatTimeAgo(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (isNaN(seconds) || seconds < 0) return "Just now";

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
    };

    for (const [unit, value] of Object.entries(intervals)) {
        const count = Math.floor(seconds / value);
        if (count >= 1) return `${count} ${unit}${count > 1 ? "s" : ""} ago`;
    }
    return "Just now";
}

const cleanActivityDesc = (desc, raw) => {
    if (!desc) return "";
    return desc
        .replace(/SubLevel\s+[a-f0-9]{24}\s+to\s+[a-f0-9]{24}/gi, `SubLevel 1A to SubLevel ${raw?.currentSubLevelId?.name || "1B"}`)
        .replace(/SubLevel\s+[a-f0-9]{24}\s+to\.\.\./gi, `SubLevel 1A to SubLevel ${raw?.currentSubLevelId?.name || "1B"}`)
        .replace(/SubLevel\s+[a-f0-9]{24}/gi, `SubLevel ${raw?.currentSubLevelId?.name || "1B"}`)
        .replace(/[a-f0-9]{24}/gi, raw?.currentSubLevelId?.name || "");
};

const activityStyle = (type) => {
    switch (type) {
        case "task":       return { iconColor: "text-violet-600 bg-violet-50 border border-violet-100", icon: "task" };
        case "promotion":  return { iconColor: "text-emerald-600 bg-emerald-50 border border-emerald-100", icon: "promote" };
        case "document":   return { iconColor: "text-blue-600 bg-blue-50 border border-blue-100", icon: "document" };
        case "permission": return { iconColor: "text-orange-600 bg-orange-50 border border-orange-100", icon: "permission" };
        case "email":      return { iconColor: "text-sky-600 bg-sky-50 border border-sky-100", icon: "email" };
        default:           return { iconColor: "text-gray-500 bg-gray-50 border border-gray-100", icon: "note" };
    }
};

// ── Circular Progress (Matching StudentLevelHistory & Dashboard Theme) ───────
const CircleProgress = ({ pct, size = 48, stroke = 4, color = "#F97316" }) => {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const isLarge = size >= 50;
    return (
        <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={`${(pct / 100) * circ} ${circ}`}
                    className="transition-all duration-700 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <span className={`font-black text-gray-800 tracking-tight flex items-baseline justify-center ${
                    isLarge ? "text-xs" : "text-[10px]"
                }`}>
                    {pct}
                    <span className="font-bold text-gray-400 text-[8px] ml-0.5">%</span>
                </span>
            </div>
        </div>
    );
};

export default function StudentDashboard() {
    const navigate = useNavigate();
    const [activityOpen, setActivityOpen] = useState(false);

    const { data: profileData, isLoading: profileLoading } = useGetMyStudentProfileQuery();
    const { data: taskData }     = useGetMyStudentTasksQuery();
    const { data: historyData }  = useGetMyStudentLevelHistoryQuery();
    const { data: eventData }    = useGetMyStudentEventLogQuery();

    const storedStudent = (() => {
        try {
            return JSON.parse(localStorage.getItem("studentData") || "{}");
        } catch {
            return {};
        }
    })();

    const raw = {
        ...storedStudent,
        ...(profileData?.data || {}),
    };

    const firstName = raw.firstName || "Student";
    const deptName = raw.departmentId?.name || raw.subDepartmentId?.departmentId?.name || "ITEG";
    const subDeptName = raw.subDepartmentId?.name || "TECH";

    const totalTasks     = taskData?.totalTasks     || 0;
    const completedTasks = taskData?.completedTasks || 0;
    const pendingTasks   = taskData?.pendingTasks   || 0;
    const inProgressTasks = taskData?.inProgressTasks || 0;
    const taskPct        = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Active pending/in-progress tasks for Action Center
    const allTasks = useMemo(() => {
        if (taskData?.tasks && Array.isArray(taskData.tasks) && taskData.tasks.length > 0) {
            return taskData.tasks;
        }
        const subjectGroups = taskData?.groupedBySubject || {};
        return Object.values(subjectGroups).flatMap(g => g.tasks || []);
    }, [taskData]);

    const activeTodoTasks = useMemo(() => {
        return allTasks
            .filter(t => t.status === "inProgress" || t.status === "pending")
            .sort((a, b) => {
                if (a.status === "inProgress" && b.status !== "inProgress") return -1;
                if (b.status === "inProgress" && a.status !== "inProgress") return 1;
                return new Date(b.assignedAt || b.createdAt || 0) - new Date(a.assignedAt || a.createdAt || 0);
            })
            .slice(0, 4);
    }, [allTasks]);

    // Subject breakdown
    const subjectGroups = taskData?.groupedBySubject || {};
    const subjects = useMemo(() => {
        return Object.entries(subjectGroups).map(([sName, group]) => {
            const tasks = group.tasks || [];
            const done  = tasks.filter(t => t.status === "completed").length;
            return {
                name: sName,
                total: tasks.length,
                done,
                pct: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
            };
        });
    }, [subjectGroups]);

    // Average marks
    const evaluatedTasks = allTasks.filter(t => typeof t.marks === "number" && t.marks > 0);
    const levelHistory = historyData?.data || [];

    const displayAvgMarks = useMemo(() => {
        if (evaluatedTasks.length > 0) {
            const sum = evaluatedTasks.reduce((s, t) => s + Number(t.marks), 0);
            return (sum / evaluatedTasks.length).toFixed(1);
        }
        const historyWithMarks = levelHistory.filter(h => typeof h.averageMarks === "number" && h.averageMarks > 0);
        if (historyWithMarks.length > 0) {
            const sum = historyWithMarks.reduce((acc, h) => acc + h.averageMarks, 0);
            return (sum / historyWithMarks.length).toFixed(1);
        }
        return completedTasks > 0 ? "4.0" : "—";
    }, [evaluatedTasks, levelHistory, completedTasks]);

    let evalBadge = "Good";
    const numericAvg = parseFloat(displayAvgMarks) || 0;
    if (numericAvg >= 4.5) evalBadge = "Outstanding";
    else if (numericAvg >= 4.0) evalBadge = "Very Good";
    else if (numericAvg >= 3.5) evalBadge = "Good";
    else if (numericAvg >= 3.0) evalBadge = "Satisfactory";
    else evalBadge = "In Progress";

    // Leaves / permissions
    const permissions = Array.isArray(raw.permissions) && raw.permissions.length > 0
        ? raw.permissions
        : (raw.permissionDetails?.status ? [raw.permissionDetails] : []);
    const totalLeaves = raw.leaveStats?.total ?? permissions.length;
    const approvedLeaves = raw.leaveStats?.approved ?? permissions.filter(p => (p.status || "").toLowerCase() === "approved").length;
    const pendingLeaves = raw.leaveStats?.pending ?? permissions.filter(p => (p.status || "").toLowerCase() === "pending").length;

    // Days in current sublevel
    let daysInSubLevel = 0;
    const currentProgress = levelHistory.find(item => 
        item.status === "in_progress" || 
        (item.subLevelId?._id && raw.currentSubLevelId?._id && item.subLevelId._id.toString() === raw.currentSubLevelId._id.toString())
    );
    const startDateVal = currentProgress?.startedAt || raw.createdAt;
    if (startDateVal) {
        const timeDiff = Date.now() - new Date(startDateVal).getTime();
        if (!isNaN(timeDiff)) {
            daysInSubLevel = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
        }
    }

    const activityItems = useMemo(() => {
        return (eventData?.data || []).map(item => ({
            ...item,
            ...activityStyle(item.type),
            time: item.createdAt,
            cleanDesc: cleanActivityDesc(item.description, raw)
        }));
    }, [eventData, raw]);

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 17) return "Good afternoon";
        return "Good evening";
    }, []);

    if (profileLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
                <div className="w-9 h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-gray-400">Loading your dashboard...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-5 pb-10">

            {/* ── 1. Unified Hero Header Card (Matching Student Portal Theme) ── */}
            <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs relative">
                {/* Top Orange Accent Stripe (Theme signature across all pages) */}
                <div className="h-1.5 sm:h-2 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400" />

                <div className="p-3.5 sm:p-6 lg:p-7">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
                        
                        {/* Left: Greeting & Academic Scope */}
                        <div className="space-y-1.5 sm:space-y-2 max-w-2xl">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                                    <MdCheckCircle size={12} className="text-orange-500" />
                                    Student Dashboard
                                </span>
                                <span className="text-gray-300">·</span>
                                <span className="text-[11px] sm:text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Session {raw.sessionId?.name || "2024–25"} (Active)
                                </span>
                            </div>

                            <h1 className="text-lg sm:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight leading-tight">
                                {greeting}, {firstName}
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500 font-normal leading-relaxed">
                                Track your academic coursework, prioritize assigned tasks, and monitor continuous faculty evaluations for your current level.
                            </p>

                            {/* Clean Academic Badges */}
                            <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 rounded-xl bg-orange-50 text-orange-800 border border-orange-200/80 shadow-2xs">
                                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                                    <span>{raw.currentLevelId?.name || "Level 1"}</span>
                                    <span className="text-orange-300">›</span>
                                    <span>SubLevel {raw.currentSubLevelId?.name || "1A"}</span>
                                </span>

                                <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 rounded-xl bg-violet-50 text-violet-700 border border-violet-200/70">
                                    <MdLayers size={13} className="text-violet-500" />
                                    <span>{deptName} ({subDeptName})</span>
                                </span>

                                {daysInSubLevel >= 0 && (
                                    <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/70">
                                        <MdAccessTime size={13} className="text-teal-600" />
                                        <span>{daysInSubLevel} {daysInSubLevel === 1 ? "day" : "days"} enrolled</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Right: Circular Progress & CTAs */}
                        <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3.5 pt-3.5 lg:pt-0 border-t lg:border-t-0 border-gray-100 shrink-0 w-full lg:w-auto">
                            <div className="flex items-center gap-3">
                                <CircleProgress pct={taskPct} size={52} stroke={4.5} color="#F97316" />
                                <div>
                                    <p className="text-xs font-bold text-gray-900">Level Completion</p>
                                    <p className="text-[11px] text-gray-400 font-medium">
                                        {completedTasks} of {totalTasks} tasks completed
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button
                                    onClick={() => navigate("/student-portal/tasks")}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl transition shadow-xs active:scale-98 cursor-pointer"
                                >
                                    <span>My Tasks</span>
                                    <MdArrowForward size={14} />
                                </button>
                                <button
                                    onClick={() => navigate("/student-portal/syllabus")}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition cursor-pointer"
                                >
                                    <MdMenuBook size={14} className="text-gray-500" />
                                    <span>Syllabus</span>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* ── 2. Metric KPI Cards Grid (Matching Theme) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                
                {/* 1. Action Tasks */}
                <div 
                    onClick={() => navigate("/student-portal/tasks")}
                    className="bg-white border border-gray-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs hover:border-orange-200 hover:bg-orange-50/10 transition-all duration-150 flex flex-col justify-between cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400">Action Tasks</span>
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <MdAssignment size={16} />
                        </div>
                    </div>
                    <div>
                        <div className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight leading-none">
                            {pendingTasks + inProgressTasks}
                        </div>
                        <div className="flex items-center justify-between gap-1.5 mt-2">
                            <span className="text-[11px] text-gray-500 font-medium truncate">
                                {pendingTasks} pending · {inProgressTasks} active
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                pendingTasks > 0 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}>
                                {pendingTasks > 0 ? "Pending" : "Done"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Level Progress */}
                <div 
                    onClick={() => navigate("/student-portal/tasks")}
                    className="bg-white border border-gray-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs hover:border-orange-200 hover:bg-orange-50/10 transition-all duration-150 flex flex-col justify-between cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400">Level Progress</span>
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <MdTrendingUp size={16} />
                        </div>
                    </div>
                    <div>
                        <div className="text-lg sm:text-2xl font-black text-orange-600 tracking-tight leading-none">
                            {taskPct}%
                        </div>
                        <div className="flex items-center justify-between gap-1.5 mt-2">
                            <span className="text-[11px] text-gray-500 font-medium truncate">
                                {completedTasks} of {totalTasks} completed
                            </span>
                        </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3 overflow-hidden">
                        <div 
                            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500" 
                            style={{ width: `${taskPct}%` }} 
                        />
                    </div>
                </div>

                {/* 3. Academic Evaluation */}
                <div 
                    onClick={() => navigate("/student-portal/report-card")}
                    className="bg-white border border-gray-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs hover:border-orange-200 hover:bg-orange-50/10 transition-all duration-150 flex flex-col justify-between cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400">Faculty Score</span>
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <MdStar size={16} />
                        </div>
                    </div>
                    <div>
                        <div className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight leading-none">
                            {displayAvgMarks !== "—" ? `${displayAvgMarks} / 5` : "Pending"}
                        </div>
                        <div className="flex items-center justify-between gap-1.5 mt-2">
                            <span className="text-[11px] text-gray-500 font-medium truncate">
                                {evaluatedTasks.length} evaluated tasks
                            </span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                {displayAvgMarks !== "—" ? evalBadge : "In Progress"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Leaves & Permissions */}
                <div 
                    onClick={() => navigate("/student-portal/leave-request")}
                    className="bg-white border border-gray-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs hover:border-orange-200 hover:bg-orange-50/10 transition-all duration-150 flex flex-col justify-between cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400">Leave Requests</span>
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <MdCalendarToday size={15} />
                        </div>
                    </div>
                    <div>
                        <div className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight leading-none">
                            {approvedLeaves} <span className="text-xs font-bold text-gray-400">Approved</span>
                        </div>
                        <div className="flex items-center justify-between gap-1.5 mt-2">
                            <span className="text-[11px] text-gray-500 font-medium truncate">
                                {pendingLeaves} pending · {totalLeaves} total
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                pendingLeaves > 0 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}>
                                {pendingLeaves > 0 ? `${pendingLeaves} Pending` : "Normal"}
                            </span>
                        </div>
                    </div>
                </div>

            </div>

            {/* ── 3. Core Dashboard Layout (Action Center & Analytics) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-5">

                {/* ── Left Column (2 Cols): Tasks Action Center & Subject Mastery ── */}
                <div className="lg:col-span-2 space-y-3.5 sm:space-y-5">

                    {/* Section A: Assigned Priority Tasks */}
                    <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                            <div>
                                <h2 className="text-xs sm:text-sm font-bold text-gray-900 tracking-tight">Assigned Tasks</h2>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Coursework assigned by faculties for your current level</p>
                            </div>

                            <button
                                onClick={() => navigate("/student-portal/tasks")}
                                className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-0.5 cursor-pointer"
                            >
                                <span>View All</span>
                                <MdChevronRight size={16} />
                            </button>
                        </div>

                        <div className="p-3.5 sm:p-5">
                            {activeTodoTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 bg-gray-50/60 border border-dashed border-gray-200 rounded-2xl text-center">
                                    <MdCheckCircle size={26} className="text-emerald-500 mb-2" />
                                    <h3 className="text-sm font-bold text-gray-800">No active tasks pending</h3>
                                    <p className="text-xs text-gray-400 mt-0.5 max-w-sm">
                                        You have completed all active assignments for your current level.
                                    </p>
                                    <button
                                        onClick={() => navigate("/student-portal/syllabus")}
                                        className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer shadow-2xs"
                                    >
                                        <MdMenuBook size={14} className="text-gray-400" />
                                        <span>Browse Syllabus</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {activeTodoTasks.map((task) => (
                                        <div
                                            key={task._id}
                                            onClick={() => navigate("/student-portal/tasks")}
                                            className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-gray-200/80 bg-white hover:border-orange-300 hover:bg-orange-50/20 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 cursor-pointer group shadow-2xs ${
                                                task.status === "inProgress" ? "border-l-4 border-l-blue-500" : "border-l-4 border-l-amber-500"
                                            }`}
                                        >
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {task.subjectName && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100/70 truncate">
                                                            {task.subjectName}
                                                        </span>
                                                    )}
                                                    {task.status === "inProgress" ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                            In Progress
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                            Pending
                                                        </span>
                                                    )}
                                                </div>

                                                <h4 className="text-xs sm:text-sm font-bold text-gray-800 group-hover:text-orange-600 transition-colors line-clamp-1">
                                                    {task.title}
                                                </h4>

                                                {task.topicName && (
                                                    <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1 truncate">
                                                        <MdOutlineTopic size={13} className="text-orange-500 shrink-0" />
                                                        <span className="truncate">{task.topicName}</span>
                                                        {task.subTopicName && (
                                                            <>
                                                                <span className="text-gray-300">›</span>
                                                                <span className="truncate text-gray-500">{task.subTopicName}</span>
                                                            </>
                                                        )}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
                                                <div className="text-left sm:text-right">
                                                    <span className="text-xs font-semibold text-gray-600 block truncate">
                                                        {task.assignedByName || "Faculty"}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {formatTimeAgo(task.assignedAt || task.createdAt)}
                                                    </span>
                                                </div>

                                                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-orange-600 group-hover:text-orange-700">
                                                    <span>View</span>
                                                    <MdChevronRight size={14} />
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section B: Curriculum & Subject Mastery */}
                    <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                            <div>
                                <h3 className="text-xs sm:text-sm font-bold text-gray-900 tracking-tight">Curriculum Mastery</h3>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Task completion by syllabus subject</p>
                            </div>
                            <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                                {subjects.length} Subjects
                            </span>
                        </div>

                        <div className="p-4 sm:p-6">
                            {subjects.length === 0 ? (
                                <EmptyState
                                    icon={MdMenuBook}
                                    title="No subjects assigned yet"
                                    subtitle="Syllabus subjects for your sublevel will be displayed here."
                                    compact
                                />
                            ) : (
                                <div className="space-y-3.5">
                                    {subjects.map((subj) => (
                                        <div key={subj.name} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs font-bold">
                                                <span className="text-gray-800 truncate pr-2">{subj.name}</span>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-[11px] text-gray-400 font-medium">
                                                        {subj.done} of {subj.total} tasks
                                                    </span>
                                                    <span className="font-mono text-gray-900 font-extrabold">{subj.pct}%</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        subj.pct === 100 
                                                            ? "bg-emerald-500" 
                                                            : "bg-gradient-to-r from-orange-500 to-amber-500"
                                                    }`}
                                                    style={{ width: `${subj.pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* ── Right Column (1 Col): Quick Navigation, Level Stepper & Activity ── */}
                <div className="space-y-3.5 sm:space-y-5">

                    {/* Section 1: Quick Navigation List (Matching Theme) */}
                    <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-gray-100 bg-gray-50/60">
                            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                                Quick Navigation
                            </h3>
                        </div>
                        <div className="p-2 sm:p-2.5 divide-y divide-gray-100">
                            {[
                                { title: "My Tasks", desc: "Manage assignments", path: "/student-portal/tasks", icon: MdAssignment, iconColor: "text-blue-600 bg-blue-50" },
                                { title: "My Syllabus", desc: "Curriculum topics", path: "/student-portal/syllabus", icon: MdMenuBook, iconColor: "text-orange-600 bg-orange-50" },
                                { title: "Leave Request", desc: "Apply and track leaves", path: "/student-portal/leave-request", icon: MdCalendarToday, iconColor: "text-emerald-600 bg-emerald-50" },
                                { title: "Level History", desc: "Academic milestones", path: "/student-portal/progress", icon: MdTrendingUp, iconColor: "text-indigo-600 bg-indigo-50" },
                                { title: "Documents", desc: "Student records", path: "/student-portal/documents", icon: MdFolderOpen, iconColor: "text-teal-600 bg-teal-50" },
                                { title: "Report Card", desc: "Evaluation grades", path: "/student-portal/report-card", icon: MdAssessment, iconColor: "text-violet-600 bg-violet-50" },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.title}
                                        onClick={() => navigate(item.path)}
                                        className="w-full py-2.5 px-3 flex items-center justify-between text-left hover:bg-orange-50/40 rounded-xl transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${item.iconColor} group-hover:scale-105 transition-transform`}>
                                                <Icon size={14} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-800 group-hover:text-orange-600 transition-colors leading-tight">
                                                    {item.title}
                                                </p>
                                                <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                                                    {item.desc}
                                                </p>
                                            </div>
                                        </div>
                                        <MdChevronRight size={16} className="text-gray-300 group-hover:text-orange-500 transition-colors shrink-0" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Section 2: Level Milestones Stepper (Matching StudentLevelHistory) */}
                    <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                            <div>
                                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Milestones</h3>
                                <p className="text-[10px] text-gray-400 mt-0.5">Academic promotion track</p>
                            </div>
                            <button
                                onClick={() => navigate("/student-portal/progress")}
                                className="text-xs font-bold text-orange-600 hover:text-orange-700 transition cursor-pointer"
                            >
                                All →
                            </button>
                        </div>

                        <div className="p-4 sm:p-5">
                            {levelHistory.length === 0 ? (
                                <EmptyState
                                    icon={MdTrendingUp}
                                    title="No milestones recorded"
                                    subtitle="Ongoing milestones will appear here."
                                    compact
                                />
                            ) : (
                                <div className="relative pl-3.5 space-y-3.5 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
                                    {levelHistory.slice(0, 4).map((item, i) => {
                                        const isCurrent = item.status === "in_progress";
                                        return (
                                            <div key={item._id || i} className="relative flex items-start gap-2.5">
                                                <span className={`absolute -left-3.5 top-1.5 w-2.5 h-2.5 rounded-full ${
                                                    isCurrent 
                                                        ? "bg-orange-500 ring-4 ring-orange-100" 
                                                        : "bg-emerald-500"
                                                }`} />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <p className={`text-xs font-bold truncate ${isCurrent ? "text-orange-600" : "text-gray-800"}`}>
                                                            {item.levelId?.name || "Level"} – {item.subLevelId?.name || "SubLevel"}
                                                        </p>
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                                                            isCurrent ? "bg-orange-50 text-orange-700 border border-orange-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                        }`}>
                                                            {isCurrent ? "Current" : "Done"}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                                        {item.totalTasks > 0 ? `${item.completedTasksCount || 0}/${item.totalTasks} tasks` : "Enrolled"}
                                                        {item.averageMarks != null ? ` · Avg ${item.averageMarks}/5` : ""}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 3: Recent Activity Log */}
                    <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Activity Log</h3>
                            <button
                                type="button"
                                onClick={() => setActivityOpen(true)}
                                className="text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                            >
                                All →
                            </button>
                        </div>

                        <div className="p-3 sm:p-4">
                            {activityItems.length === 0 ? (
                                <EmptyState
                                    icon={MdAccessTime}
                                    title="No activity recorded"
                                    subtitle="Updates from faculties will appear here."
                                    compact
                                />
                            ) : (
                                <div className="space-y-2">
                                    {activityItems.slice(0, 4).map((item, i) => (
                                        <div key={item._id || i} className="flex items-start gap-2.5 p-1.5 rounded-xl hover:bg-gray-50/80 transition">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${item.iconColor}`}>
                                                {item.icon === "task"       && <MdTableChart size={13} />}
                                                {item.icon === "promote"    && <MdArrowUpward size={13} />}
                                                {item.icon === "document"   && <MdSchool size={13} />}
                                                {item.icon === "permission" && <MdCalendarToday size={13} />}
                                                {item.icon === "email"      && <MdEmail size={13} />}
                                                {item.icon === "note"       && <MdAccessTime size={13} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-800 leading-snug truncate">{item.title}</p>
                                                {item.cleanDesc && (
                                                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{item.cleanDesc}</p>
                                                )}
                                                <p className="text-[10px] text-gray-400 mt-0.5">{formatTimeAgo(item.time)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

            </div>

            {/* ── Activity Modal ── */}
            {activityOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4">
                    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-gray-900">Student Activity Log</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Timeline of tasks, evaluations and approvals</p>
                            </div>
                            <button 
                                onClick={() => setActivityOpen(false)} 
                                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                            >
                                <MdClose size={18} />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-5 space-y-2.5">
                            {activityItems.length === 0 ? (
                                <EmptyState
                                    icon={MdAccessTime}
                                    title="No activity recorded"
                                    subtitle="Updates from faculties will appear here."
                                    compact
                                />
                            ) : (
                                activityItems.map((item, i) => (
                                    <div key={item._id || i} className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50/70 border border-gray-100">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.iconColor}`}>
                                            {item.icon === "task"       && <MdTableChart size={14} />}
                                            {item.icon === "promote"    && <MdArrowUpward size={14} />}
                                            {item.icon === "document"   && <MdSchool size={14} />}
                                            {item.icon === "permission" && <MdCalendarToday size={14} />}
                                            {item.icon === "email"      && <MdEmail size={14} />}
                                            {item.icon === "note"       && <MdAccessTime size={14} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-900">{item.title}</p>
                                            {item.cleanDesc && (
                                                <p className="text-xs text-gray-600 mt-0.5 break-words">{item.cleanDesc}</p>
                                            )}
                                            <p className="text-[10px] text-gray-400 mt-0.5 font-medium">{formatDateTime(item.time)}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
