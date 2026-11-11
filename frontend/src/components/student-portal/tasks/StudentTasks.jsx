import { useState, useMemo, useEffect } from "react";
import { useGetMyStudentTasksQuery, useUpdateMyStudentTaskStatusMutation } from "../../../redux/api/studentApi";
import { 
    MdStar, 
    MdStarBorder, 
    MdAssignment, 
    MdCheckCircle, 
    MdAccessTime, 
    MdSearch, 
    MdArrowForward,
    MdClose, 
    MdRefresh, 
    MdPerson, 
    MdOutlineCalendarToday, 
    MdOutlineTopic, 
    MdHistory, 
    MdLock, 
    MdLayers, 
    MdPlayArrow,
    MdUndo,
    MdFilterList
} from "react-icons/md";
import { toast } from "react-toastify";
import EmptyState from "../../shared/empty-state/EmptyState";

const STATUS_COLS = [
    { 
        key: "pending",    
        label: "Pending",     
        subtitle: "To be started",
        dot: "bg-amber-500",  
        colBg: "bg-amber-50/30",  
        border: "border-amber-200/70", 
        badge: "bg-amber-100/90 text-amber-800 border border-amber-200/80",   
        emptyIcon: "text-amber-300",
        icon: MdAccessTime
    },
    { 
        key: "inProgress", 
        label: "In Progress", 
        subtitle: "Currently working on",
        dot: "bg-blue-500",   
        colBg: "bg-blue-50/30",   
        border: "border-blue-200/70",  
        badge: "bg-blue-100/90 text-blue-800 border border-blue-200/80",     
        emptyIcon: "text-blue-300",
        icon: MdRefresh
    },
    { 
        key: "completed",  
        label: "Completed",   
        subtitle: "Evaluated by faculty",
        dot: "bg-emerald-500",
        colBg: "bg-emerald-50/30",
        border: "border-emerald-200/70",
        badge: "bg-emerald-100/90 text-emerald-800 border border-emerald-200/80",
        emptyIcon: "text-emerald-300",
        icon: MdCheckCircle
    },
];

// Circular progress component for modern hero stats
const TaskProgressRing = ({ pct = 0, size = 64, stroke = 6, color = "#F97316" }) => {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    return (
        <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
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
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                <span className="text-xs font-black text-slate-800 tracking-tight leading-none">
                    {pct}<span className="text-[10px] font-bold text-slate-400 ml-0.5">%</span>
                </span>
            </div>
        </div>
    );
};

export default function StudentTasks() {
    const { data: taskData, isLoading } = useGetMyStudentTasksQuery();
    const [updateTaskStatus] = useUpdateMyStudentTaskStatusMutation();
    const [selectedLevelTab, setSelectedLevelTab] = useState("current"); // "current" | "previous"
    const [selectedPrevIndex, setSelectedPrevIndex] = useState(0);
    const [search, setSearch] = useState("");
    const [activeSubject, setActiveSubject] = useState("All");
    const [dragOverCol, setDragOverCol] = useState(null);
    const [mobileTab, setMobileTab] = useState("all");
    const [selectedTask, setSelectedTask] = useState(null);

    const isPreviousMode = selectedLevelTab === "previous";
    const previousLevels = taskData?.previousLevels || [];
    const activePrevLevel = previousLevels[selectedPrevIndex] || previousLevels[0] || null;

    const totalPreviousTasksCount = useMemo(() => {
        return previousLevels.reduce((sum, pl) => sum + (pl.totalTasks || pl.tasks?.length || 0), 0);
    }, [previousLevels]);

    // Active tasks to display based on level tab
    const activeLevelTasks = useMemo(() => {
        if (isPreviousMode) {
            return activePrevLevel?.tasks || [];
        }
        if (taskData?.tasks && Array.isArray(taskData.tasks) && taskData.tasks.length > 0) {
            return taskData.tasks;
        }
        const subjectGroups = taskData?.groupedBySubject || {};
        return Object.values(subjectGroups).flatMap(g => g.tasks || []);
    }, [isPreviousMode, activePrevLevel, taskData]);

    const activeSubjectGroups = useMemo(() => {
        if (isPreviousMode) {
            return activePrevLevel?.groupedBySubject || {};
        }
        return taskData?.groupedBySubject || {};
    }, [isPreviousMode, activePrevLevel, taskData]);

    const allSubjects = useMemo(() => {
        const fromGroups = Object.keys(activeSubjectGroups);
        if (fromGroups.length > 0) return fromGroups;
        const unique = [...new Set((activeLevelTasks || []).map(t => (t.subjectName || "Other").trim()))];
        return unique.filter(Boolean);
    }, [activeSubjectGroups, activeLevelTasks]);

    useEffect(() => {
        if (activeSubject !== "All" && allSubjects.length > 0 && !allSubjects.includes(activeSubject)) {
            setActiveSubject("All");
        }
    }, [allSubjects, activeSubject]);

    // Sort active tasks strictly by assignedAt/createdAt descending (latest first)
    const sortedTasks = useMemo(() => {
        return [...activeLevelTasks].sort((a, b) => {
            const timeA = new Date(a.assignedAt || a.createdAt || (a._id ? parseInt(a._id.toString().substring(0, 8), 16) * 1000 : 0)).getTime();
            const timeB = new Date(b.assignedAt || b.createdAt || (b._id ? parseInt(b._id.toString().substring(0, 8), 16) * 1000 : 0)).getTime();
            if (timeB !== timeA) return timeB - timeA;
            return (b._id || "").toString().localeCompare((a._id || "").toString());
        });
    }, [activeLevelTasks]);

    // Assign sequential serial numbers (1 is latest overall task)
    const tasksWithSno = useMemo(() => {
        return sortedTasks.map((t, idx) => ({
            ...t,
            sno: idx + 1
        }));
    }, [sortedTasks]);

    const filtered = tasksWithSno.filter(t => {
        const matchSearch = t.title?.toLowerCase().includes(search.toLowerCase()) ||
                            t.subjectName?.toLowerCase().includes(search.toLowerCase()) ||
                            t.topicName?.toLowerCase().includes(search.toLowerCase());
        const taskSubj = (t.subjectName || "").trim().toLowerCase();
        const matchSubject = activeSubject === "All" || taskSubj === activeSubject.trim().toLowerCase();
        return matchSearch && matchSubject;
    });

    // Subject task counts for pills
    const subjectCounts = useMemo(() => {
        const counts = { All: tasksWithSno.length };
        tasksWithSno.forEach(t => {
            const subj = (t.subjectName || "Other").trim();
            counts[subj] = (counts[subj] || 0) + 1;
        });
        return counts;
    }, [tasksWithSno]);

    const byStatus = {
        pending:    filtered.filter(t => t.status === "pending"),
        inProgress: filtered.filter(t => t.status === "inProgress"),
        completed:  filtered.filter(t => t.status === "completed"),
    };

    const totalTasks     = isPreviousMode 
        ? (activePrevLevel?.totalTasks || activeLevelTasks.length) 
        : (taskData?.totalTasks || activeLevelTasks.length);
    const completedTasks = isPreviousMode 
        ? (activePrevLevel?.completedTasks || activeLevelTasks.filter(t => t.status === "completed").length) 
        : (taskData?.completedTasks || 0);
    const pendingTasks   = isPreviousMode 
        ? (activePrevLevel?.pendingTasks || activeLevelTasks.filter(t => t.status === "pending").length) 
        : (taskData?.pendingTasks || 0);
    const inProgressTasks = isPreviousMode
        ? activeLevelTasks.filter(t => t.status === "inProgress").length
        : (taskData?.inProgressTasks || activeLevelTasks.filter(t => t.status === "inProgress").length || 0);

    const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const evaluated = activeLevelTasks.filter(t => typeof t.marks === "number");
    const avgMarks  = evaluated.length > 0
        ? (evaluated.reduce((s, t) => s + t.marks, 0) / evaluated.length).toFixed(1)
        : null;

    const handleStatusChange = async (taskId, newStatus) => {
        if (isPreviousMode) {
            toast.info("Previous level tasks are locked in read-only mode.");
            return;
        }
        try {
            await updateTaskStatus({ taskId, status: newStatus }).unwrap();
            toast.success(`Task marked as ${newStatus === "inProgress" ? "In Progress" : "Pending"}`);
            if (selectedTask && selectedTask._id === taskId) {
                setSelectedTask(prev => ({ ...prev, status: newStatus }));
            }
        } catch (err) {
            toast.error(err?.data?.message || "Failed to update task status");
        }
    };

    const handleDragStart = (e, task) => {
        if (isPreviousMode) return;
        e.dataTransfer.setData("taskId", task._id);
        e.dataTransfer.setData("sourceStatus", task.status);
    };

    const handleDrop = async (e, targetStatus) => {
        if (isPreviousMode) {
            toast.info("Previous level tasks cannot be modified.");
            return;
        }
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
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
            <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-400">Loading your tasks...</p>
        </div>
    );

    const currentSubLevelTitle = taskData?.studentInfo?.subLevel || taskData?.subLevelName || "Current Level";

    return (
        <div className="space-y-5">

            {/* ── Level Scope Segmented Control ── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200/70 shadow-2xs">
                    <button
                        onClick={() => {
                            setSelectedLevelTab("current");
                            setActiveSubject("All");
                            setSearch("");
                        }}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-2 ${
                            !isPreviousMode
                                ? "bg-white text-slate-900 shadow-xs border border-slate-100"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full bg-orange-500 ring-2 ring-orange-200" />
                        <span>Current Level</span>
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100/80">
                            {taskData?.totalTasks || 0}
                        </span>
                    </button>

                    <button
                        onClick={() => {
                            setSelectedLevelTab("previous");
                            setActiveSubject("All");
                            setSearch("");
                        }}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-2 ${
                            isPreviousMode
                                ? "bg-white text-slate-900 shadow-xs border border-slate-100"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <MdHistory size={16} className={isPreviousMode ? "text-indigo-600" : "text-slate-400"} />
                        <span>Previous Levels</span>
                        <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                            totalPreviousTasksCount > 0 
                                ? "bg-indigo-50 text-indigo-600 border border-indigo-100/80" 
                                : "bg-slate-200/80 text-slate-500"
                        }`}>
                            {totalPreviousTasksCount}
                        </span>
                    </button>
                </div>

                {/* Read-only pill indicator when in previous mode */}
                {isPreviousMode ? (
                    <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold shadow-2xs">
                        <MdLock size={14} className="text-amber-600 shrink-0" />
                        <span>Previous Level · Read Only</span>
                    </div>
                ) : (
                    <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Real-time Task Tracking</span>
                    </div>
                )}
            </div>

            {/* ── Previous Levels Ribbon ── */}
            {isPreviousMode && previousLevels.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x -mx-1 px-1">
                    {previousLevels.map((pl, idx) => (
                        <button
                            key={pl.subLevelId || pl.levelId || idx}
                            onClick={() => {
                                setSelectedPrevIndex(idx);
                                setActiveSubject("All");
                            }}
                            className={`text-xs font-bold px-3.5 py-2 rounded-xl border whitespace-nowrap transition-all duration-150 shrink-0 flex items-center gap-2 ${
                                selectedPrevIndex === idx
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                            }`}
                        >
                            <MdLayers size={14} className={selectedPrevIndex === idx ? "text-white" : "text-slate-400"} />
                            <span>{pl.levelName} – {pl.subLevelName}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                selectedPrevIndex === idx ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                            }`}>
                                {pl.totalTasks}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* ── Empty State for Previous Levels when none exist ── */}
            {isPreviousMode && previousLevels.length === 0 ? (
                <EmptyState
                    icon={MdHistory}
                    title="No previous level tasks"
                    subtitle="You are currently at your starting level, or there are no historical tasks recorded for previous levels."
                    actionText="Back to Current Level Tasks"
                    onAction={() => setSelectedLevelTab("current")}
                />
            ) : (
                <>
                    {/* ── Modern Hero Header Card ── */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                        {/* Top Accent Gradient Line */}
                        <div className={`h-1.5 w-full ${
                            isPreviousMode 
                                ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400" 
                                : "bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400"
                        }`} />

                        <div className="p-4 sm:p-6">
                            {/* Row 1: Title, Scope Subtitle & Integrated Search */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                                            {isPreviousMode 
                                                ? `${activePrevLevel?.levelName || "Previous Level"} Tasks`
                                                : "My Tasks"
                                            }
                                        </h2>
                                        <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs ${
                                            isPreviousMode
                                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                : "bg-orange-50 text-orange-700 border-orange-200"
                                        }`}>
                                            {totalTasks} Total
                                        </span>
                                        {!isPreviousMode && (
                                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80">
                                                {currentSubLevelTitle}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">
                                        {isPreviousMode 
                                            ? "Historical archive of tasks and evaluations completed in previous sublevels."
                                            : "Track, prioritize, and manage tasks assigned by your faculties for this sublevel."
                                        }
                                    </p>
                                </div>

                                {/* Search Bar */}
                                <div className="relative w-full md:w-72">
                                    <MdSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Search by title, subject, topic..."
                                        className="w-full pl-9 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-3 focus:ring-orange-100 text-slate-800 transition-all duration-150 placeholder:text-slate-400 font-medium"
                                    />
                                    {search && (
                                        <button
                                            onClick={() => setSearch("")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded-md hover:bg-slate-200 transition"
                                            title="Clear search"
                                        >
                                            <MdClose size={15} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Row 2: Visual Stats & Progress Bar */}
                            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <TaskProgressRing 
                                        pct={taskPct} 
                                        color={isPreviousMode ? "#6366F1" : "#F97316"} 
                                    />
                                    <div>
                                        <p className="text-xs font-black text-slate-900 tracking-tight">
                                            {taskPct}% Level Completion
                                        </p>
                                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                            {completedTasks} of {totalTasks} tasks completed
                                        </p>
                                    </div>
                                </div>

                                {/* Stat Chips Grid */}
                                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5">
                                    {/* Pending */}
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-200/80 shadow-2xs">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                                        <div>
                                            <span className="text-[10px] font-bold text-amber-600 block uppercase tracking-wider leading-none">Pending</span>
                                            <span className="text-xs sm:text-sm font-black text-amber-900 leading-tight">{pendingTasks}</span>
                                        </div>
                                    </div>

                                    {/* In Progress */}
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50/70 border border-blue-200/80 shadow-2xs">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                                        <div>
                                            <span className="text-[10px] font-bold text-blue-600 block uppercase tracking-wider leading-none">In Progress</span>
                                            <span className="text-xs sm:text-sm font-black text-blue-900 leading-tight">{inProgressTasks}</span>
                                        </div>
                                    </div>

                                    {/* Completed */}
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 shadow-2xs">
                                        <MdCheckCircle size={15} className="text-emerald-600 shrink-0" />
                                        <div>
                                            <span className="text-[10px] font-bold text-emerald-600 block uppercase tracking-wider leading-none">Completed</span>
                                            <span className="text-xs sm:text-sm font-black text-emerald-900 leading-tight">{completedTasks}</span>
                                        </div>
                                    </div>

                                    {/* Average Score */}
                                    {avgMarks && (
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50/70 border border-orange-200/80 shadow-2xs">
                                            <MdStar size={16} className="text-orange-500 shrink-0" />
                                            <div>
                                                <span className="text-[10px] font-bold text-orange-600 block uppercase tracking-wider leading-none">Avg Score</span>
                                                <span className="text-xs sm:text-sm font-black text-orange-900 leading-tight">{avgMarks} <span className="text-[10px] text-orange-400 font-semibold">/ 5</span></span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Full-width Gradient Progress Bar */}
                            <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden p-0.5">
                                <div 
                                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                                        isPreviousMode 
                                            ? "bg-gradient-to-r from-indigo-500 to-purple-500" 
                                            : "bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500"
                                    }`} 
                                    style={{ width: `${taskPct}%` }} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Subject Filter Bar (Touch-friendly horizontal scroll) ── */}
                    {allSubjects.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x -mx-1 px-1">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 pl-1 pr-1">
                                <MdFilterList size={14} /> Subject:
                            </span>
                            {["All", ...allSubjects].map(subj => {
                                const isActive = activeSubject === subj;
                                const count = subjectCounts[subj] || 0;
                                return (
                                    <button
                                        key={subj}
                                        onClick={() => setActiveSubject(subj)}
                                        className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border whitespace-nowrap transition-all duration-150 shrink-0 flex items-center gap-2 ${
                                            isActive
                                                ? isPreviousMode 
                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" 
                                                    : "bg-orange-500 text-white border-orange-500 shadow-xs"
                                                : "bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-600 shadow-2xs"
                                        }`}
                                    >
                                        <span>{subj}</span>
                                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                                            isActive 
                                                ? "bg-white/20 text-white" 
                                                : "bg-slate-100 text-slate-600"
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* ── Mobile Status Selector Tabs (md:hidden) ── */}
                    <div className="md:hidden bg-slate-100 p-1 rounded-2xl flex gap-1 text-xs font-bold shadow-2xs">
                        <button
                            onClick={() => setMobileTab("all")}
                            className={`flex-1 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
                                mobileTab === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            <span>All</span>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                                {filtered.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setMobileTab("pending")}
                            className={`flex-1 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
                                mobileTab === "pending" ? "bg-white text-amber-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Pending</span>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
                                {byStatus.pending.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setMobileTab("inProgress")}
                            className={`flex-1 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
                                mobileTab === "inProgress" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span>In Prog</span>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
                                {byStatus.inProgress.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setMobileTab("completed")}
                            className={`flex-1 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
                                mobileTab === "completed" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Done</span>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                                {byStatus.completed.length}
                            </span>
                        </button>
                    </div>

                    {/* ── Mobile Tasks List (md:hidden) ── */}
                    <div className="md:hidden space-y-3">
                        {mobileTab === "all" ? (
                            STATUS_COLS.map(col => {
                                const tasks = byStatus[col.key];
                                if (tasks.length === 0) return null;
                                return (
                                    <div key={col.key} className="space-y-2.5">
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{col.label}</h3>
                                            </div>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${col.badge}`}>
                                                {tasks.length}
                                            </span>
                                        </div>
                                        <div className="space-y-2.5">
                                            {tasks.map(task => (
                                                <TaskCard
                                                    key={task._id}
                                                    task={task}
                                                    onStatusChange={handleStatusChange}
                                                    onSelectTask={setSelectedTask}
                                                    isReadOnly={isPreviousMode}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="space-y-2.5">
                                {byStatus[mobileTab].length === 0 ? (
                                    <EmptyState
                                        icon={MdAssignment}
                                        title={`No ${mobileTab === "inProgress" ? "in-progress" : mobileTab} tasks found`}
                                        subtitle="Tasks assigned in this status will appear here."
                                        compact
                                    />
                                ) : (
                                    byStatus[mobileTab].map(task => (
                                        <TaskCard
                                            key={task._id}
                                            task={task}
                                            onStatusChange={handleStatusChange}
                                            onSelectTask={setSelectedTask}
                                            isReadOnly={isPreviousMode}
                                        />
                                    ))
                                )}
                            </div>
                        )}

                        {/* Overall Empty State on Mobile */}
                        {filtered.length === 0 && (
                            <EmptyState
                                icon={MdAssignment}
                                title="No matching tasks found"
                                subtitle={search ? "Try searching for another topic or clear the search query." : (isPreviousMode ? "No tasks found for this previous level." : "No tasks assigned for your current level yet.")}
                                actionText={search ? "Clear Search" : undefined}
                                onAction={search ? () => setSearch("") : undefined}
                            />
                        )}
                    </div>

                    {/* ── Desktop Kanban Columns (hidden md:grid) ── */}
                    <div className="hidden md:grid md:grid-cols-3 gap-5">
                        {STATUS_COLS.map(col => {
                            const ColIcon = col.icon;
                            return (
                                <div 
                                    key={col.key}
                                    onDragOver={(e) => {
                                        if (isPreviousMode) return;
                                        e.preventDefault();
                                        setDragOverCol(col.key);
                                    }}
                                    onDragLeave={() => setDragOverCol(null)}
                                    onDrop={async (e) => {
                                        setDragOverCol(null);
                                        if (isPreviousMode) return;
                                        await handleDrop(e, col.key);
                                    }}
                                    className={`rounded-2xl sm:rounded-3xl border transition-all duration-200 flex flex-col ${
                                        dragOverCol === col.key 
                                            ? "border-orange-400 bg-orange-50/50 shadow-md scale-[1.01]" 
                                            : `${col.border} ${col.colBg}`
                                    } p-4`}
                                >
                                    {/* Column Header Card */}
                                    <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-200/50">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-white shadow-2xs border border-slate-200/60 flex items-center justify-center">
                                                <ColIcon size={15} className={col.key === "pending" ? "text-amber-500" : col.key === "inProgress" ? "text-blue-500" : "text-emerald-500"} />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">{col.label}</h3>
                                                <p className="text-[10px] text-slate-400 font-medium">{col.subtitle}</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${col.badge} shadow-2xs`}>
                                            {byStatus[col.key].length}
                                        </span>
                                    </div>

                                    {/* Column Tasks Container */}
                                    <div className="space-y-3 min-h-[400px] flex-1">
                                        {byStatus[col.key].length === 0 ? (
                                            <div className="h-full min-h-[280px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200/70 rounded-2xl p-6 bg-white/50 text-center">
                                                <div className="w-12 h-12 rounded-2xl bg-white shadow-2xs border border-slate-100 flex items-center justify-center mb-2.5">
                                                    <MdAssignment size={22} className={col.emptyIcon} />
                                                </div>
                                                <p className="text-xs font-bold text-slate-600">No {col.label.toLowerCase()} tasks</p>
                                                <p className="text-[11px] text-slate-400 mt-1 max-w-[180px]">
                                                    {col.key === "pending" ? "All current tasks are in progress or finished!" : col.key === "inProgress" ? "Drag or click 'Start' on a task to work on it." : "Completed tasks evaluated by faculty appear here."}
                                                </p>
                                            </div>
                                        ) : byStatus[col.key].map(task => (
                                            <TaskCard 
                                                key={task._id} 
                                                task={task} 
                                                onDragStart={(e) => handleDragStart(e, task)} 
                                                onStatusChange={handleStatusChange}
                                                onSelectTask={setSelectedTask}
                                                isReadOnly={isPreviousMode}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* ── Task Details Modal ── */}
            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onStatusChange={handleStatusChange}
                    isReadOnly={isPreviousMode}
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

// ── Responsive Modern Task Card ──
function TaskCard({ task, onDragStart, onStatusChange, onSelectTask, isReadOnly = false }) {
    const max = task.maxMarks || 5;

    const statusConfig = {
        pending: {
            borderClass: "border-l-4 border-l-amber-500",
            hoverClass: "hover:border-amber-300",
            badge: "bg-amber-50 text-amber-700 border-amber-200/80",
            dot: "bg-amber-500",
            label: "Pending"
        },
        inProgress: {
            borderClass: "border-l-4 border-l-blue-500",
            hoverClass: "hover:border-blue-300",
            badge: "bg-blue-50 text-blue-700 border-blue-200/80",
            dot: "bg-blue-500",
            label: "In Progress"
        },
        completed: {
            borderClass: "border-l-4 border-l-emerald-500",
            hoverClass: "hover:border-emerald-300",
            badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
            dot: "bg-emerald-500",
            label: "Completed"
        }
    };

    const cfg = statusConfig[task.status] || statusConfig.pending;

    return (
        <div 
            draggable={!isReadOnly && task.status !== "completed"}
            onDragStart={isReadOnly ? undefined : onDragStart}
            className={`bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md transition-all duration-200 relative group flex flex-col justify-between ${cfg.borderClass} ${cfg.hoverClass} ${
                !isReadOnly && task.status !== "completed" ? "cursor-grab active:cursor-grabbing hover:-translate-y-0.5" : ""
            }`}
        >
            {/* Top Row: SNO, Subject pill & Status/Grade indicator */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-md bg-slate-900 text-white text-[10px] font-black shrink-0 shadow-2xs">
                        #{task.sno || 1}
                    </span>
                    {task.subjectName ? (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100/80 truncate max-w-[140px]">
                            {task.subjectName}
                        </span>
                    ) : null}
                </div>

                {/* Status or Score Pill */}
                {task.status === "completed" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
                        <MdCheckCircle size={12} className="text-emerald-500 shrink-0" />
                        <span>{task.marks != null ? `${task.marks}/${max}` : "Done"}</span>
                    </span>
                ) : task.status === "inProgress" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                        <span>In Progress</span>
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>Pending</span>
                    </span>
                )}
            </div>

            {/* Task Title (Clickable to open modal) */}
            <div>
                <h4 
                    onClick={() => onSelectTask(task)} 
                    className="text-xs sm:text-sm font-bold text-slate-800 leading-snug line-clamp-2 cursor-pointer hover:text-orange-600 transition-colors tracking-tight"
                >
                    {task.title}
                </h4>

                {/* Topic / Subtopic Breadcrumb */}
                {task.topicName && (
                    <p className="text-[11px] text-slate-400 font-semibold mt-1.5 flex items-center gap-1 truncate">
                        <MdOutlineTopic size={13} className="text-orange-500 shrink-0" />
                        <span className="truncate">{task.topicName}</span>
                        {task.subTopicName && (
                            <>
                                <span className="text-slate-300">›</span>
                                <span className="truncate text-slate-500">{task.subTopicName}</span>
                            </>
                        )}
                    </p>
                )}
            </div>

            {/* Quick Action Button & Details Link */}
            <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div>
                    {isReadOnly ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/60">
                            <MdLock size={11} className="text-slate-400" />
                            <span>Read Only</span>
                        </span>
                    ) : task.status === "pending" ? (
                        <button
                            onClick={() => onStatusChange(task._id, "inProgress")}
                            className="inline-flex items-center gap-1 text-[11px] font-black text-white bg-orange-500 hover:bg-orange-600 active:scale-95 px-2.5 py-1 rounded-lg shadow-2xs transition-all duration-150"
                            title="Mark as In Progress"
                        >
                            <MdPlayArrow size={13} />
                            <span>Start Task</span>
                        </button>
                    ) : task.status === "inProgress" ? (
                        <button
                            onClick={() => onStatusChange(task._id, "pending")}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95 px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-2xs transition-all duration-150"
                            title="Revert to Pending"
                        >
                            <MdUndo size={12} className="text-slate-500" />
                            <span>Move to Pending</span>
                        </button>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                            <MdCheckCircle size={12} className="text-emerald-600" />
                            <span>Evaluated</span>
                        </span>
                    )}
                </div>

                <button
                    onClick={() => onSelectTask(task)}
                    className="text-[11px] font-bold text-slate-500 hover:text-orange-600 flex items-center gap-0.5 py-1 px-1.5 rounded-lg hover:bg-slate-50 transition"
                >
                    <span>View Details</span>
                    <MdArrowForward size={12} />
                </button>
            </div>

            {/* Footer Row: Assigned By & Time Ago */}
            <div className="mt-2.5 pt-2 border-t border-slate-100/70 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1 font-medium truncate max-w-[65%]" title={task.assignedByName || "Faculty"}>
                    <MdPerson size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">{task.assignedByName || "Faculty"}</span>
                </span>
                {(task.assignedAt || task.createdAt) && (
                    <span className="font-semibold text-slate-400 shrink-0">
                        {formatTimeAgo(task.assignedAt || task.createdAt)}
                    </span>
                )}
            </div>

            {/* Marks & Star Rating (If completed) */}
            {task.status === "completed" && task.marks != null && (
                <div className="mt-2 flex items-center justify-between bg-orange-50/50 border border-orange-100/60 rounded-xl px-2.5 py-1 shadow-2xs">
                    <span className="text-[10px] font-black text-orange-700 uppercase tracking-wider">Score</span>
                    <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                            {Array.from({ length: max }, (_, i) => (
                                i < task.marks
                                    ? <MdStar key={i} size={11} className="text-orange-400" />
                                    : <MdStarBorder key={i} size={11} className="text-slate-200" />
                            ))}
                        </div>
                        <span className="text-[11px] font-black text-slate-700">
                            {task.marks}<span className="text-slate-400 font-medium">/{max}</span>
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Refined Task Details Modal ──
function TaskDetailModal({ task, onClose, onStatusChange, isReadOnly = false }) {
    const max = task.maxMarks || 5;

    return (
        <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-black shadow-2xs">
                            #{task.sno || 1}
                        </span>
                        {task.subjectName && (
                            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {task.subjectName}
                            </span>
                        )}
                        {task.status === "completed" ? (
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                Completed
                            </span>
                        ) : task.status === "inProgress" ? (
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                                In Progress
                            </span>
                        ) : (
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                Pending
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                    >
                        <MdClose size={16} />
                    </button>
                </div>

                {/* Modal Scrollable Content */}
                <div className="p-6 overflow-y-auto space-y-4">
                    <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug tracking-tight">
                            {task.title}
                        </h3>
                        {task.topicName && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold mt-2.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/70">
                                <MdOutlineTopic size={16} className="text-orange-500 shrink-0" />
                                <span>{task.topicName} {task.subTopicName ? `› ${task.subTopicName}` : ""}</span>
                            </div>
                        )}
                    </div>

                    {/* Description / Instructions */}
                    {task.description && (
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                                Description & Instructions
                            </label>
                            <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200/70 leading-relaxed whitespace-pre-wrap font-normal">
                                {task.description}
                            </p>
                        </div>
                    )}

                    {/* Assignment Metadata */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                            <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                                <MdPerson size={15} /> Assigned By:
                            </span>
                            <span className="font-bold text-slate-800">
                                {task.assignedByName || "Faculty"} {task.assignedByRole ? `(${task.assignedByRole})` : ""}
                            </span>
                        </div>
                        {(task.assignedAt || task.createdAt) && (
                            <div className="flex items-center justify-between text-slate-600">
                                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                                    <MdOutlineCalendarToday size={14} /> Assigned On:
                                </span>
                                <span className="font-semibold text-slate-700">
                                    {formatDate(task.assignedAt || task.createdAt)} ({formatTimeAgo(task.assignedAt || task.createdAt)})
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Evaluated Score & Remarks */}
                    {task.status === "completed" && (
                        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">Evaluation Score</span>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-0.5">
                                        {Array.from({ length: max }, (_, i) => (
                                            i < (task.marks || 0)
                                                ? <MdStar key={i} size={16} className="text-orange-400" />
                                                : <MdStarBorder key={i} size={16} className="text-slate-300" />
                                        ))}
                                    </div>
                                    <span className="text-sm font-black text-emerald-950">
                                        {task.marks != null ? `${task.marks}/${max}` : "Evaluated"}
                                    </span>
                                </div>
                            </div>
                            {task.notes && (
                                <div className="pt-2.5 border-t border-emerald-100 text-xs text-emerald-900">
                                    <span className="font-bold block mb-1">Faculty Remarks:</span>
                                    <p className="italic bg-white/70 p-2.5 rounded-xl border border-emerald-100">{task.notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal Footer Actions */}
                <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                    {isReadOnly ? (
                        <div className="flex-1 text-center text-xs font-bold text-slate-500 bg-slate-100 py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 border border-slate-200/60">
                            <MdLock size={15} className="text-slate-400" />
                            <span>Previous Level Task · Read Only</span>
                        </div>
                    ) : task.status === "pending" ? (
                        <button
                            onClick={() => {
                                onStatusChange(task._id, "inProgress");
                                onClose();
                            }}
                            className="flex-1 py-2.5 px-4 text-xs font-black text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition shadow-xs flex items-center justify-center gap-2"
                        >
                            <MdPlayArrow size={16} />
                            <span>Start Task (Move to In Progress)</span>
                        </button>
                    ) : task.status === "inProgress" ? (
                        <button
                            onClick={() => {
                                onStatusChange(task._id, "pending");
                                onClose();
                            }}
                            className="flex-1 py-2.5 px-4 text-xs font-black text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition shadow-xs flex items-center justify-center gap-2"
                        >
                            <MdUndo size={15} />
                            <span>Move Back to Pending</span>
                        </button>
                    ) : (
                        <div className="flex-1 text-center text-xs font-black text-emerald-800 bg-emerald-100/80 py-2.5 rounded-xl border border-emerald-200">
                            ✓ Task evaluated & completed by faculty
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="py-2.5 px-5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition border border-transparent"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
