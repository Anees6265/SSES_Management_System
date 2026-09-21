import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    MdCheckCircle, MdRadioButtonUnchecked, MdAccessTime,
    MdCalendarToday, MdArrowBack, MdClose, MdStar, MdStarBorder, MdAdd,
    MdSearch, MdNotificationsNone, MdFilterList, MdMoreHoriz, MdVerified
} from "react-icons/md";
import { Menu } from "lucide-react";
import { toast } from "react-toastify";
import CryptoJS from "crypto-js";
import { useGetNewStudentTasksQuery, useAssignExtraTaskMutation, useGetSyllabusVersionWithHierarchyQuery } from "../../../../redux/api/authApi";
import { useSidebar } from "../../../../contexts/SidebarContext";
import Loader from "../../../shared/loader/Loader";
import OrangeButton from "../../../shared/sidebar/OrangeButton";

const SECRET_KEY = "ITEG@123";
const getToken = () => {
    try {
        const enc = localStorage.getItem("token");
        if (!enc) return "";
        return CryptoJS.AES.decrypt(enc, SECRET_KEY).toString(CryptoJS.enc.Utf8) || "";
    } catch { return ""; }
};

const PRIORITY_BADGES = {
    high:   "bg-rose-50 text-rose-600 border border-rose-100",
    medium: "bg-amber-50 text-amber-600 border border-amber-100",
    low:    "bg-emerald-50 text-emerald-600 border border-emerald-100",
};

const STATUS_COLUMNS = [
    { key: "pending",    label: "Pending",     badgeBg: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
    { key: "inProgress", label: "In Progress", badgeBg: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
    { key: "completed",  label: "Completed",   badgeBg: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
];

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

// ── Task Card ─────────────────────────────────────────────────────────────────
const TaskCard = ({ task, onDragStart, onStatusChange }) => {
    const priority    = task.priority || "medium";
    const isCompleted = task.status === "completed";
    const isInProgress = task.status === "inProgress";

    // Accent lines and colors
    const statusConfig = {
        pending: "border-l-4 border-l-amber-500/80 hover:border-amber-500 hover:shadow-amber-500/5",
        inProgress: "border-l-4 border-l-orange-500/80 hover:border-orange-500 hover:shadow-orange-500/5",
        completed: "border-l-4 border-l-emerald-500/80 hover:border-emerald-500 hover:shadow-emerald-500/5"
    };
    const activeBorderClass = statusConfig[task.status] || statusConfig.pending;

    return (
        <div
            draggable
            onDragStart={() => onDragStart(task)}
            className={`bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-grab active:cursor-grabbing select-none space-y-3 ${activeBorderClass}`}
        >
            {/* Header: Priority Badge + Status Dropdown */}
            <div className="flex items-center justify-between gap-2 pb-0.5">
                <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full border shadow-2xs ${
                    isCompleted ? "bg-slate-50 text-slate-400 border-slate-200" : (PRIORITY_BADGES[priority] || PRIORITY_BADGES.medium)
                }`}>
                    {isCompleted ? "COMPLETED" : `${priority} PRIORITY`}
                </span>

                <div className="relative shrink-0">
                    <select
                        value={task.status || "pending"}
                        onChange={(e) => onStatusChange(task, e.target.value)}
                        className="!h-auto !py-1 !px-2 !border !border-slate-200/70 !rounded-lg text-[10px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-800 bg-slate-50/80 outline-none focus:outline-none focus:ring-1 focus:ring-orange-400 cursor-pointer transition shadow-2xs"
                    >
                        <option value="pending">PENDING ▾</option>
                        <option value="inProgress">IN PROGRESS ▾</option>
                        <option value="completed">DONE ▾</option>
                    </select>
                </div>
            </div>

            {/* Title */}
            <div className="min-w-0">
                <h4
                    className={`text-xs sm:text-sm font-extrabold text-slate-800 leading-snug tracking-tight break-words ${isCompleted ? "line-through text-slate-400" : ""}`}
                    style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                >
                    {task.title}
                </h4>
                {(task.subjectName || task.description) && (
                    <p className="text-[10.5px] sm:text-[11px] text-slate-400 mt-1 line-clamp-2 font-medium leading-relaxed break-words">
                        {task.description || (task.subjectName ? `${task.subjectName}${task.topicName ? ` › ${task.topicName}` : ""}` : "")}
                    </p>
                )}
            </div>

            {/* Given by & Time ago */}
            <div className="flex items-center justify-between text-[9.5px] sm:text-[10px] text-slate-400 font-semibold pt-2 border-t border-slate-100/70 gap-2 flex-wrap sm:flex-nowrap">
                {task.assignedByName ? (
                    <span className="truncate max-w-[70%] sm:max-w-[60%] flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full" title={task.assignedByName}>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                        <span className="text-slate-600 font-bold truncate">{task.assignedByName}</span>
                    </span>
                ) : (
                    <span className="text-slate-400 font-bold bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">Auto-assigned</span>
                )}
                {(task.assignedAt || task.createdAt) && (
                    <span className="text-slate-400/90 font-medium shrink-0">{formatTimeAgo(task.assignedAt || task.createdAt)}</span>
                )}
            </div>

            {/* Marks & Rating Badge - Only shown when inProgress or completed */}
            {(isInProgress || isCompleted) && (
                <div className="flex items-center justify-between pt-1 text-xs">
                    {isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-black text-[10px] tracking-wider bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                            <MdVerified size={12} /> VERIFIED
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-orange-600 font-black text-[10px] tracking-wider bg-orange-50 border border-orange-100 rounded-full px-2 py-0.5">
                            RATING
                        </span>
                    )}

                    <div className="flex items-center gap-0.5">
                        {Array.from({ length: task.maxMarks || 5 }, (_, i) => i + 1).map(star => {
                            const isSelected = star <= (task.marks || 0);
                            return (
                                <button
                                    key={star}
                                    type="button"
                                    disabled={isCompleted}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onStatusChange(task, task.status, { marks: star });
                                    }}
                                    className={`p-0.5 transition ${isCompleted ? "cursor-default" : "hover:scale-125 cursor-pointer"}`}
                                >
                                    {isSelected ? (
                                        <MdStar size={15} className="text-orange-400" />
                                    ) : (
                                        <MdStarBorder size={15} className="text-slate-300" />
                                    )}
                                </button>
                            );
                        })}
                        <span className="ml-1 text-[10px] font-black text-slate-500">
                            {task.marks || 0}/{task.maxMarks || 5}
                        </span>
                    </div>
                </div>
            )}

            {/* Footer Row */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100/70 text-[10px] font-bold text-slate-400">
                <div className="flex items-center gap-1.5 text-slate-400/90">
                    <MdCalendarToday size={12} className="text-slate-400 shrink-0" />
                    <span>
                        {task.dueDate
                            ? new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                            : task.timeDays ? `${task.timeDays} Days` : "No deadline"
                        }
                    </span>
                </div>

                <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/45 font-black flex items-center justify-center text-[9px] shadow-2xs shrink-0" title={`Type: ${task.type || "Task"}`}>
                    {task.type?.[0]?.toUpperCase() || "T"}
                </div>
            </div>
        </div>
    );
};

// ── Extra Task Modal ──────────────────────────────────────────────────────────
const TASK_TYPES = ["assignment", "writtenExam", "interview", "project", "presentation", "learning", "assessment"];
const PRIORITIES = ["low", "medium", "high"];
const EMPTY_EXTRA = { title: "", description: "", type: "assessment", priority: "medium", maxMarks: 5, timeDays: "", dueDate: "", measurablePoints: "", subjectName: "" };

const ExtraTaskModal = ({ student, onClose, onSuccess, defaultSubjects = [] }) => {
    const [form, setForm] = useState(EMPTY_EXTRA);
    const [assignExtraTask, { isLoading }] = useAssignExtraTaskMutation();

    const rawVersionId = student?.syllabusVersionId;
    const versionId = typeof rawVersionId === "object" && rawVersionId !== null
        ? (rawVersionId._id || rawVersionId.id)
        : (typeof rawVersionId === "string" && rawVersionId.trim() && rawVersionId !== "[object Object]" ? rawVersionId.trim() : null);

    const { data: versionData } = useGetSyllabusVersionWithHierarchyQuery(
        versionId,
        { skip: !versionId }
    );
    const versionSubjects = (versionData?.data?.subjects || []).map(s => s?.name).filter(Boolean);
    const availableSubjects = Array.from(new Set([...versionSubjects, ...(defaultSubjects || [])])).filter(Boolean);

    const ic = "w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-400 bg-white";
    const lc = "block text-xs font-semibold text-slate-700 mb-1";
    const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) { toast.error("Task title is required"); return; }
        const studentId = student?._id || student?.id;
        if (!studentId) { toast.error("Invalid student ID"); return; }
        try {
            await assignExtraTask({
                id: studentId,
                title: form.title,
                description: form.description || undefined,
                type: form.type,
                maxMarks: Number(form.maxMarks),
                subjectName: form.subjectName || undefined,
                measurablePoints: form.measurablePoints || undefined,
                timeDays: form.timeDays ? Number(form.timeDays) : undefined,
                dueDate: form.dueDate || undefined,
                priority: form.priority,
            }).unwrap();
            toast.success("Extra task assigned successfully!");
            onSuccess();
        } catch (err) {
            toast.error(err?.data?.message || "Failed to assign task");
        }
    };

    const studentDisplayName = `${student?.firstName || student?.name || "Student"} ${student?.lastName || ""}`.trim();

    return (
        <OrangeButton
            isOpen={true}
            onClose={onClose}
            panelTitle="Assign New Task"
            panelSubtitle={studentDisplayName}
            showFooter={false}
            drawerContent={
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={lc}>Task Title <span className="text-rose-500">*</span></label>
                        <input className={ic} value={form.title} onChange={set("title")} placeholder="Enter task title..." />
                    </div>

                    <div>
                        <label className={lc}>Description</label>
                        <textarea className={`${ic} resize-none`} rows={2} value={form.description} onChange={set("description")} placeholder="Task description..." />
                    </div>

                    <div>
                        <label className={lc}>Subject</label>
                        <select className={ic} value={form.subjectName} onChange={set("subjectName")}>
                            <option value="">Select Subject</option>
                            {availableSubjects.map((sName, idx) => <option key={`${sName}-${idx}`} value={sName}>{sName}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className={lc}>Type</label>
                            <select className={ic} value={form.type} onChange={set("type")}>
                                {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={lc}>Priority</label>
                            <select className={ic} value={form.priority} onChange={set("priority")}>
                                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className={lc}>Max Marks</label>
                            <input type="number" min={1} max={10} className={ic} value={form.maxMarks} onChange={set("maxMarks")} />
                        </div>
                        <div>
                            <label className={lc}>Time (Days)</label>
                            <input type="number" min={1} className={ic} value={form.timeDays} onChange={set("timeDays")} placeholder="Optional" />
                        </div>
                    </div>

                    <div>
                        <label className={lc}>Due Date</label>
                        <input type="date" className={ic} value={form.dueDate} onChange={set("dueDate")} />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer">Cancel</button>
                        <button type="submit" disabled={isLoading} className="flex-1 py-2.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
                            {isLoading ? "Assigning..." : "Assign Task"}
                        </button>
                    </div>
                </form>
            }
        />
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const StudentTaskBoard = () => {
    const location   = useLocation();
    const navigate   = useNavigate();
    const sidebarContext = useSidebar();
    const openMobileSidebar = sidebarContext?.openMobileSidebar;

    const { student, level, subdepartment } = location.state || {};

    const [search,            setSearch]            = useState("");
    const [subjectFilter,     setSubjectFilter]     = useState("");
    const [showFilterDrawer,  setShowFilterDrawer]  = useState(false);
    const [tasks,             setTasks]             = useState(null);
    const [dragTask,          setDragTask]          = useState(null);
    const [dragOver,          setDragOver]          = useState(null);
    const [saving,            setSaving]            = useState(false);
    const [showExtraModal,    setShowExtraModal]    = useState(false);
    const [activeMobileTab,   setActiveMobileTab]   = useState("all");

    useEffect(() => {
        setTasks(null);
    }, [student?._id]);

    const { data, isLoading, refetch } = useGetNewStudentTasksQuery(
        { id: student?._id },
        { skip: !student?._id }
    );

    const allTasks = tasks
        ?? Object.values(data?.groupedBySubject || {}).flatMap(g => g.tasks || []);

    // Sort allTasks by assignedAt/createdAt descending (latest first)
    const sortedTasks = [...allTasks].sort((a, b) => {
        const dateA = new Date(a.assignedAt || a.createdAt || 0);
        const dateB = new Date(b.assignedAt || b.createdAt || 0);
        return dateB - dateA;
    });

    // Extract unique clean subject names directly from allTasks and groups
    const subjectsFromGroups = Object.keys(data?.groupedBySubject || {}).map(k => k.replace(/\s*\([^)]*\)$/, '').trim());
    const subjects = Array.from(new Set([
        ...allTasks.map(t => t.subjectName?.trim()).filter(Boolean),
        ...subjectsFromGroups.filter(Boolean)
    ])).sort((a, b) => a.localeCompare(b));

    // Calculate count of tasks per subject for display in filter dropdown
    const subjectTaskCounts = useMemo(() => {
        const counts = {};
        allTasks.forEach(t => {
            const sName = t.subjectName?.trim();
            if (sName) {
                counts[sName] = (counts[sName] || 0) + 1;
            }
        });
        return counts;
    }, [allTasks]);

    const filtered = sortedTasks.filter(t => {
        const matchSearch = !search ||
            t.title?.toLowerCase().includes(search.toLowerCase()) ||
            t.subjectName?.toLowerCase().includes(search.toLowerCase()) ||
            t.topicName?.toLowerCase().includes(search.toLowerCase());

        const taskSubName = t.subjectName?.trim().toLowerCase() || "";
        const filterSubName = subjectFilter?.trim().toLowerCase() || "";

        const matchSubject = !subjectFilter || (
            taskSubName === filterSubName ||
            (taskSubName && filterSubName && filterSubName.startsWith(taskSubName)) ||
            (taskSubName && filterSubName && taskSubName.startsWith(filterSubName))
        );
        return matchSearch && matchSubject;
    });

    const byStatus = {
        pending:    filtered.filter(t => t.status === "pending" || !t.status),
        inProgress: filtered.filter(t => t.status === "inProgress"),
        completed:  filtered.filter(t => t.status === "completed"),
    };

    const total     = filtered.length;
    const completed = filtered.filter(t => t.status === "completed").length;
    const inProgressCount = filtered.filter(t => t.status === "inProgress").length;
    const pendingCount = filtered.filter(t => t.status === "pending" || !t.status).length;
    const percent   = total > 0 ? Math.round((completed / total) * 100) : 0;

    const handleDragStart = (task) => setDragTask(task);

    const handleDragOver = (e, colKey) => {
        e.preventDefault();
        setDragOver(colKey);
    };

    const handleDrop = (e, targetStatus) => {
        e.preventDefault();
        setDragOver(null);
        if (!dragTask || dragTask.status === targetStatus) { setDragTask(null); return; }

        if (targetStatus === "completed" && (dragTask.marks === null || dragTask.marks === undefined)) {
            toast.error("Please rate/mark the task before completing it!");
            setDragTask(null);
            return;
        }
        const finalMarks = targetStatus === "pending"
            ? null
            : dragTask.marks;

        applyStatusChange(dragTask, targetStatus, { marks: finalMarks });
        setDragTask(null);
    };

    const applyStatusChange = async (task, newStatus, extra) => {
        const studentId = student._id;
        const taskId    = task.taskId || task._id;

        const mongoIdRegex = /^[a-f\d]{24}$/i;
        if (!mongoIdRegex.test(studentId) || !mongoIdRegex.test(taskId)) {
            toast.error("Invalid task or student ID");
            return;
        }

        const updated = allTasks.map(t =>
            t._id === task._id ? { ...t, status: newStatus, ...extra } : t
        );
        setTasks(updated);

        setSaving(true);
        try {
            const body = { status: newStatus, ...extra };
            const baseUrl = import.meta.env.VITE_API_URL;
            const url = `${baseUrl}/syllabus/versions/students/${studentId}/tasks/${taskId}`;

            const r = await fetch(url, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify(body)
            });

            if (!r.ok) {
                const errData = await r.json();
                throw new Error(errData.message || "Update failed");
            }

            toast.success(`Task moved to ${newStatus === "inProgress" ? "In Progress" : newStatus}`);
            await refetch();
        } catch (err) {
            toast.error(err.message || "Failed to update task");
            refetch();
            setTasks(null);
        } finally {
            setSaving(false);
        }
    };

    if (!student) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-3">
                    <MdArrowBack size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-800">No Student Data Found</h3>
                <p className="text-slate-400 text-xs mt-1 max-w-xs">Please access the task board from the student profile or student details table.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const studentName = `${student.firstName || ""} ${student.lastName || ""}`.trim() || "Student";
    const initials = studentName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

    const mobileTabs = [
        { key: "all",        label: "All",         count: filtered.length },
        { key: "pending",    label: "Pending",     count: byStatus.pending.length,    dot: "bg-slate-400" },
        { key: "inProgress", label: "In Progress", count: byStatus.inProgress.length, dot: "bg-amber-500" },
        { key: "completed",  label: "Completed",   count: byStatus.completed.length,  dot: "bg-emerald-500" },
    ];

    return (
        <div className="min-h-screen bg-[#F8F9FA] px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">

            {/* Modals */}
            {showExtraModal && (
                <ExtraTaskModal
                    student={student}
                    defaultSubjects={subjects}
                    onClose={() => setShowExtraModal(false)}
                    onSuccess={() => { setShowExtraModal(false); refetch(); }}
                />
            )}

            {/* TOP NAVIGATION & SEARCH BAR */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {/* Back Button */}
                        <button
                            onClick={() => navigate(-1)}
                            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-orange-500 hover:border-orange-200 hover:bg-orange-50/50 shadow-xs transition shrink-0 cursor-pointer"
                            title="Go Back"
                            aria-label="Go Back"
                        >
                            <MdArrowBack size={18} />
                        </button>

                        {/* Mobile Sidebar Hamburger Toggle */}
                        {openMobileSidebar && (
                            <button
                                onClick={openMobileSidebar}
                                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-orange-500 hover:bg-orange-50/50 shadow-xs transition shrink-0 cursor-pointer"
                                title="Open Sidebar"
                                aria-label="Open Sidebar"
                            >
                                <Menu size={18} />
                            </button>
                        )}

                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight truncate">Student Record</h1>
                                {student.prkey && (
                                    <span className="bg-slate-100 text-slate-700 text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-md border border-slate-200 shrink-0">
                                        ID: {student.prkey}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Notifications Button on Mobile */}
                    <div className="flex items-center gap-2 sm:hidden">
                        <button
                            type="button"
                            className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-xs relative shrink-0"
                            title="Notifications"
                        >
                            <MdNotificationsNone size={18} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white" />
                        </button>
                    </div>
                </div>

                {/* Search Bar & Desktop Notification */}
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <div className="flex items-center h-9 sm:h-10 w-full sm:w-72 lg:w-80 bg-white border border-slate-200 rounded-xl px-3 shadow-xs hover:border-slate-300 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-400/20 transition-all">
                        <MdSearch className="text-slate-400 shrink-0 mr-2" size={17} />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search tasks..."
                            className="w-full h-full bg-transparent border-none outline-none ring-0 focus:ring-0 text-xs font-medium text-slate-800 placeholder-slate-400 p-0 shadow-none"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                            >
                                <MdClose size={14} />
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition relative shrink-0 cursor-pointer"
                        title="Notifications"
                    >
                        <MdNotificationsNone size={18} />
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white" />
                    </button>
                </div>
            </div>

            {/* BREADCRUMB & HEADER CONTAINER */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs p-3.5 sm:p-5 md:p-6 space-y-3 sm:space-y-4">
                {/* Breadcrumb Row */}
                <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-slate-400 flex-wrap">
                    <button onClick={() => navigate(-1)} className="hover:text-slate-700 transition flex items-center gap-1 cursor-pointer">
                        ← Student Record
                    </button>
                    <span>/</span>
                    <span className="text-slate-600 font-bold truncate max-w-[150px] sm:max-w-none">{studentName}</span>
                    <span>/</span>
                    <span className="text-slate-900 font-black">Task Board</span>
                </div>

                {/* Student Tag Line */}
                <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold text-xs flex items-center justify-center border border-orange-200 shrink-0">
                        {initials}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-extrabold flex-wrap">
                        <span className="text-slate-900">{studentName}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-500">{student.course || "Course"} {level?.name ? `- ${level.name}` : ""}</span>
                        <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] px-2.5 py-0.5 rounded-full uppercase font-black">
                            ACTIVE
                        </span>
                    </div>
                </div>

                {/* Title & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100/70">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Task Board</h2>
                            {saving && (
                                <span className="text-[10px] font-bold text-orange-500 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full animate-pulse">
                                    Saving...
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-400 font-medium">Manage and track student assignments & evaluations</p>
                    </div>

                    <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        {/* + New Task Button */}
                        <button
                            onClick={() => setShowExtraModal(true)}
                            className="flex items-center justify-center gap-1.5 sm:gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold px-3 sm:px-4 py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer"
                        >
                            <MdAdd size={16} /> <span>New Task</span>
                        </button>

                        {/* Filter Button / Subject Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowFilterDrawer(p => !p)}
                                className={`w-full flex items-center justify-center gap-1.5 sm:gap-2 border font-bold px-3 sm:px-4 py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer ${
                                    subjectFilter
                                        ? "bg-orange-50 border-orange-300 text-orange-600"
                                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                <MdFilterList size={16} />
                                <span className="truncate max-w-[110px] sm:max-w-none">{subjectFilter || "Filter"}</span>
                                {subjectFilter && (
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSubjectFilter("");
                                        }}
                                        className="ml-0.5 hover:bg-orange-200/70 p-0.5 rounded-full"
                                        title="Clear filter"
                                    >
                                        <MdClose size={13} />
                                    </span>
                                )}
                            </button>
                            {showFilterDrawer && (
                                <>
                                    <div className="fixed inset-0 z-20" onClick={() => setShowFilterDrawer(false)} />
                                    <div className="absolute right-0 top-11 z-30 bg-white border border-slate-100 rounded-2xl shadow-xl w-60 max-w-[calc(100vw-2rem)] py-2 text-slate-700 text-xs font-semibold">
                                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Filter by Subject</div>
                                        <button
                                            onClick={() => { setSubjectFilter(""); setShowFilterDrawer(false); }}
                                            className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 cursor-pointer ${!subjectFilter ? "text-orange-500 font-bold bg-orange-50/50" : ""}`}
                                        >
                                            <span>All Subjects</span>
                                            <span className="text-[10px] font-extrabold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                                {allTasks.length}
                                            </span>
                                        </button>
                                        {subjects.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => { setSubjectFilter(s); setShowFilterDrawer(false); }}
                                                className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 cursor-pointer ${subjectFilter === s ? "text-orange-500 font-bold bg-orange-50/50" : ""}`}
                                            >
                                                <span className="truncate">{s}</span>
                                                {subjectTaskCounts[s] !== undefined && (
                                                    <span className="text-[10px] font-extrabold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full ml-2">
                                                        {subjectTaskCounts[s]}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Progress Stats Summary Banner */}
                <div className="pt-2 sm:pt-3 border-t border-slate-100/70">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-2.5">
                        <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Tasks</span>
                            <span className="text-base sm:text-lg font-black text-slate-800">{total}</span>
                        </div>
                        <div className="bg-amber-50/60 rounded-xl p-2.5 border border-amber-100/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Pending</span>
                            <span className="text-base sm:text-lg font-black text-amber-700">{pendingCount}</span>
                        </div>
                        <div className="bg-orange-50/60 rounded-xl p-2.5 border border-orange-100/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 block">In Progress</span>
                            <span className="text-base sm:text-lg font-black text-orange-700">{inProgressCount}</span>
                        </div>
                        <div className="bg-emerald-50/60 rounded-xl p-2.5 border border-emerald-100/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Completed</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-base sm:text-lg font-black text-emerald-700">{completed}</span>
                                <span className="text-[10px] font-bold text-emerald-600">({percent}%)</span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                        <div
                            className="bg-emerald-500 h-full transition-all duration-300"
                            style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                            title={`Completed: ${completed}`}
                        />
                        <div
                            className="bg-orange-500 h-full transition-all duration-300"
                            style={{ width: `${total > 0 ? (inProgressCount / total) * 100 : 0}%` }}
                            title={`In Progress: ${inProgressCount}`}
                        />
                        <div
                            className="bg-slate-300 h-full transition-all duration-300"
                            style={{ width: `${total > 0 ? (pendingCount / total) * 100 : 0}%` }}
                            title={`Pending: ${pendingCount}`}
                        />
                    </div>
                </div>
            </div>

            {/* KANBAN BOARD 3 COLUMNS */}
            {isLoading ? (
                <div className="flex justify-center pt-20"><Loader /></div>
            ) : (
                <div className="space-y-3.5 sm:space-y-4">
                    {/* Mobile Status Tabs (md:hidden) */}
                    <div className="md:hidden">
                        <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-2xl overflow-x-auto no-scrollbar">
                            {mobileTabs.map(tab => {
                                const isActive = activeMobileTab === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setActiveMobileTab(tab.key)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                                            isActive
                                                ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80"
                                                : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                                        }`}
                                    >
                                        {tab.dot && <span className={`w-2 h-2 rounded-full ${tab.dot}`} />}
                                        <span>{tab.label}</span>
                                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                                            isActive ? "bg-orange-100 text-orange-700" : "bg-slate-300/60 text-slate-600"
                                        }`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Columns Grid: md:grid-cols-3, on mobile respects activeMobileTab */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                        {STATUS_COLUMNS.map(col => {
                            const isHiddenOnMobile = activeMobileTab !== "all" && activeMobileTab !== col.key;
                            return (
                                <div
                                    key={col.key}
                                    onDragOver={e => handleDragOver(e, col.key)}
                                    onDragLeave={() => setDragOver(null)}
                                    onDrop={e => handleDrop(e, col.key)}
                                    className={`space-y-3 sm:space-y-4 rounded-2xl sm:rounded-3xl p-2 sm:p-2.5 transition-all duration-200 ${
                                        isHiddenOnMobile ? "hidden md:block" : "block"
                                    } ${
                                        dragOver === col.key ? "ring-2 ring-orange-400 bg-orange-50/50" : "bg-slate-100/40"
                                    }`}
                                >
                                    {/* Column Header */}
                                    <div className="flex items-center justify-between px-2 py-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                                            <h3 className="text-sm font-black text-slate-900">{col.label}</h3>
                                            <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${col.badgeBg}`}>
                                                {byStatus[col.key].length}
                                            </span>
                                        </div>
                                        <button className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                                            <MdMoreHoriz size={18} />
                                        </button>
                                    </div>

                                    {/* Task Cards List */}
                                    <div className="space-y-3 min-h-[160px] sm:min-h-[300px]">
                                        {byStatus[col.key].length === 0 ? (
                                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 sm:p-8 text-center bg-white/70">
                                                <p className="text-xs font-bold text-slate-400">
                                                    {dragOver === col.key ? "Drop task here" : `No ${col.label.toLowerCase()} tasks`}
                                                </p>
                                            </div>
                                        ) : (
                                            byStatus[col.key].map(task => (
                                                <TaskCard
                                                    key={task._id}
                                                    task={task}
                                                    onDragStart={handleDragStart}
                                                    onStatusChange={(t, st, extra = {}) => {
                                                        if (st === "completed" && (t.marks === null || t.marks === undefined) && extra.marks === undefined) {
                                                            toast.error("Please rate/mark the task before completing it!");
                                                            return;
                                                        }
                                                        const finalMarks = extra.marks !== undefined
                                                            ? extra.marks
                                                            : (st === "pending" ? null : t.marks);
                                                        applyStatusChange(t, st, { marks: finalMarks, ...extra });
                                                    }}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentTaskBoard;
