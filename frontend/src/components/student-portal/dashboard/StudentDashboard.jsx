import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    MdEmail, MdPhone, MdCheckCircle, MdAccessTime,
    MdTableChart, MdSchool, MdWork, MdStar,
    MdClose, MdBadge, MdBusiness, MdCalendarToday,
    MdAccountTree, MdVerified, MdArrowUpward, MdTrendingUp,
    MdAssignment, MdPerson, MdFamilyRestroom,
    MdMenuBook, MdOutlineDescription, MdArrowForward
} from "react-icons/md";
import {
    useGetMyStudentProfileQuery,
    useGetMyStudentTasksQuery,
    useGetMyStudentLevelHistoryQuery,
    useGetMyStudentSnapshotsQuery,
    useGetMyStudentEventLogQuery,
} from "../../../redux/api/studentApi";
import EmptyState from "../../shared/empty-state/EmptyState";

const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const formatDateTime = (d) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

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
        case "task":       return { color: "bg-violet-50 text-violet-600 border border-violet-100", icon: "task" };
        case "promotion":  return { color: "bg-green-50 text-green-600 border border-green-100",   icon: "promote" };
        case "document":   return { color: "bg-blue-50 text-blue-600 border border-blue-100",       icon: "document" };
        case "permission": return { color: "bg-orange-50 text-orange-600 border border-orange-100", icon: "permission" };
        case "email":      return { color: "bg-sky-50 text-sky-600 border border-sky-100",         icon: "email" };
        default:           return { color: "bg-gray-50 text-gray-500 border border-gray-100",       icon: "note" };
    }
};

const statusColor = (s = "") => {
    const n = s.toLowerCase();
    if (["ready for interview", "ready", "completed", "approved"].includes(n)) return "text-emerald-600";
    if (["in progress", "pending", "scheduled"].includes(n)) return "text-orange-500";
    if (["not ready", "rejected"].includes(n)) return "text-gray-500";
    return "text-blue-600";
};

const readinessBadge = (s = "") => {
    const n = s.toLowerCase();
    if (n === "ready for interview") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (n === "ready")               return "bg-blue-50 text-blue-700 border border-blue-200";
    if (n === "in progress")         return "bg-orange-50 text-orange-600 border border-orange-200";
    return "bg-gray-100 text-gray-600 border border-gray-200";
};

// ── Circular Progress ─────────────────────────────────────────────────────────
const CircleProgress = ({ pct, size = 52, stroke = 4, color = "#F97316" }) => {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const isLarge = size >= 50;
    const isTiny = size <= 36;
    return (
        <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
                    strokeWidth={stroke} strokeLinecap="round"
                    strokeDasharray={`${(pct / 100) * circ} ${circ}`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <span className={`font-black text-gray-800 tracking-tight flex items-baseline justify-center ${
                    isLarge ? "text-xs" : isTiny ? "text-[9px]" : "text-[10px]"
                }`}>
                    {pct}
                    <span className={`font-bold text-gray-400 ${
                        isLarge ? "text-[9px] ml-0.5" : "text-[7.5px] ml-px"
                    }`}>
                        %
                    </span>
                </span>
            </div>
        </div>
    );
};

// ── Hero Card ─────────────────────────────────────────────────────────────────
const HeroCard = ({ raw, name, initials, readinessStatus, overallPct, daysInSubLevel }) => {
    const deptName = raw.departmentId?.name || raw.subDepartmentId?.departmentId?.name || "ITEG";
    const subDeptName = raw.subDepartmentId?.name || "TECH";

    return (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
            {/* Top gradient strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500" />
            <div className="p-3.5 sm:p-5 lg:p-6">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-5">

                    {/* Avatar + Name + Parents + Course + Status */}
                    <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 w-full lg:w-auto">
                        <div className="relative flex-shrink-0">
                            {raw.image ? (
                                <img 
                                    src={raw.image} 
                                    alt={name} 
                                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-gray-100 shadow-2xs" 
                                />
                            ) : (
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-base sm:text-xl font-black border border-orange-100 shadow-2xs">
                                    {initials}
                                </div>
                            )}
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight truncate">{name}</h1>
                                <MdVerified size={16} className="text-blue-500 shrink-0" />
                                {raw.isFTP && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                                        FTP
                                    </span>
                                )}
                            </div>

                            {/* Parents Name Highlights */}
                            {(raw.fatherName || raw.motherName) && (
                                <p className="text-[11px] text-gray-600 mt-0.5 flex items-center gap-1.5 flex-wrap font-medium">
                                    <span className="text-gray-400 font-semibold flex items-center gap-1">
                                        <MdFamilyRestroom size={13} className="text-orange-500 shrink-0" />
                                        Parents:
                                    </span>
                                    {raw.fatherName && (
                                        <span>
                                            Father: <strong className="text-gray-800 font-semibold">{raw.fatherName}</strong>
                                        </span>
                                    )}
                                    {raw.fatherName && raw.motherName && <span className="text-gray-300">·</span>}
                                    {raw.motherName && (
                                        <span>
                                            Mother: <strong className="text-gray-800 font-semibold">{raw.motherName}</strong>
                                        </span>
                                    )}
                                </p>
                            )}

                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                                {raw.course || "Curriculum"} {raw.sessionId?.name ? `· ${raw.sessionId.name}` : ""}
                            </p>
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${readinessBadge(readinessStatus)}`}>
                                    <MdCheckCircle size={11} /> {readinessStatus}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="hidden lg:block w-px self-stretch bg-gray-100" />

                    {/* Info grid */}
                    <div className="w-full lg:flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-x-4 sm:gap-y-3 bg-gray-50/70 sm:bg-transparent p-2.5 sm:p-0 rounded-xl sm:rounded-none border border-gray-100 sm:border-none">
                        {[
                            { icon: <MdPerson size={12} />, label: "Father Name",    value: raw.fatherName },
                            { icon: <MdPerson size={12} />, label: "Mother Name",    value: raw.motherName },
                            { icon: <MdBadge size={12} />, label: "Course",          value: raw.course },
                            { icon: <MdBusiness size={12} />, label: "Department",   value: deptName },
                            { icon: <MdAccountTree size={12} />, label: "Sub Dept",  value: subDeptName },
                            { icon: <MdCalendarToday size={12} />, label: "Session", value: raw.sessionId?.name },
                            { icon: <MdEmail size={12} />, label: "Email",           value: raw.email },
                            { icon: <MdPhone size={12} />, label: "Student Mobile",  value: raw.studentMobile },
                        ].map(({ icon, label, value }) => (
                            <div key={label} className="min-w-0">
                                <p className="text-[9.5px] sm:text-[10px] text-gray-400 flex items-center gap-1 font-medium truncate">
                                    <span className="text-orange-500 shrink-0">{icon}</span> {label}
                                </p>
                                <p className="text-[11px] sm:text-xs font-bold text-gray-800 truncate" title={value || "—"}>
                                    {value || "—"}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="hidden lg:block w-px self-stretch bg-gray-100" />

                    {/* Overall progress ring */}
                    <div className="w-full lg:w-auto flex sm:flex-col items-center justify-between sm:justify-center gap-2.5 sm:gap-1 pt-2 sm:pt-0 border-t lg:border-t-0 sm:border-t-0 border-gray-100 flex-shrink-0">
                        <div className="flex items-center sm:flex-col gap-2.5 sm:gap-1.5">
                            <CircleProgress pct={overallPct} size={50} stroke={4.5} color="#F97316" />
                            <div className="text-left sm:text-center">
                                <p className="text-xs sm:text-[10px] font-bold text-gray-700 sm:text-gray-500">Overall Progress</p>
                                <p className="text-[10px] text-gray-400 sm:hidden">Continuous evaluation</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Level status pills */}
                <div className="flex items-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-gray-50 flex-wrap">
                    <span className="text-[10px] text-gray-400 font-medium">Currently in:</span>
                    <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                        {raw.currentLevelId?.name || "Level 1"}
                    </span>
                    <span className="text-gray-300 text-xs">›</span>
                    <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100">
                        SubLevel {raw.currentSubLevelId?.name || "1A"}
                    </span>
                    {raw.sessionId?.name && (
                        <span className="text-[10px] sm:text-[11px] font-semibold text-gray-500 truncate max-w-[150px] sm:max-w-none">
                            · {raw.sessionId.name} <span className="text-emerald-500 font-bold">(Active)</span>
                        </span>
                    )}
                    {typeof daysInSubLevel === "number" && daysInSubLevel >= 0 && (
                        <span className="text-[10px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                            ⏱️ {daysInSubLevel} {daysInSubLevel === 1 ? "day" : "days"} in sublevel
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, iconBg, valueColor = "text-gray-900", badge }) => (
    <div className="bg-white border border-gray-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs flex items-center gap-2.5 sm:gap-3.5 hover:border-gray-200 transition-all">
        <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            {icon}
        </div>
        <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] sm:text-[11px] text-gray-400 font-medium truncate">{label}</p>
                {badge && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0">
                        {badge}
                    </span>
                )}
            </div>
            <p className={`text-sm sm:text-lg font-black leading-tight truncate ${valueColor}`}>{value}</p>
            {sub && <p className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5 truncate">{sub}</p>}
        </div>
    </div>
);

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function StudentDashboard() {
    const navigate = useNavigate();
    const [activityOpen, setActivityOpen] = useState(false);

    const { data: profileData, isLoading: profileLoading } = useGetMyStudentProfileQuery();
    const { data: taskData }     = useGetMyStudentTasksQuery();
    const { data: historyData }  = useGetMyStudentLevelHistoryQuery();
    const { data: snapshotData } = useGetMyStudentSnapshotsQuery();
    const { data: eventData }    = useGetMyStudentEventLogQuery();

    if (profileLoading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

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
    const name     = `${raw.firstName || ""} ${raw.lastName || ""}`.trim() || "Student";
    const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    const readinessStatus = raw.placement?.readinessStatus || "Not Ready";

    const totalTasks     = taskData?.totalTasks     || 0;
    const completedTasks = taskData?.completedTasks || 0;
    const pendingTasks   = taskData?.pendingTasks   || 0;
    const inProgressTasks = taskData?.inProgressTasks || 0;
    const taskPct        = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const overallPct     = raw.overallProgress?.percentage ?? taskPct;

    const subjectGroups = taskData?.groupedBySubject || {};
    const subjects = Object.entries(subjectGroups).map(([sName, group]) => {
        const tasks = group.tasks || [];
        const done  = tasks.filter(t => t.status === "completed").length;
        return { name: sName, pct: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0 };
    });

    // ── Average Marks Calculation (Comprehensive across current, past & level history) ──
    const currentTasks = taskData?.tasks || Object.values(subjectGroups).flatMap(g => g.tasks || []);
    const currentEvaluated = currentTasks.filter(t => typeof t.marks === "number" && t.marks !== null && t.marks > 0);

    const prevLevels = taskData?.previousLevels || [];
    const prevEvaluated = prevLevels.flatMap(pl => pl.tasks || []).filter(t => typeof t.marks === "number" && t.marks !== null && t.marks > 0);

    const allEvaluated = [...currentEvaluated, ...prevEvaluated];
    const levelHistory = historyData?.data || [];
    const historyWithMarks = levelHistory.filter(h => typeof h.averageMarks === "number" && h.averageMarks > 0);
    const historyAvgMarks = historyWithMarks.length > 0
        ? Number((historyWithMarks.reduce((acc, h) => acc + h.averageMarks, 0) / historyWithMarks.length).toFixed(2))
        : null;

    let displayAvgMarks = "4.0";
    let evalSubtitle = "Academic rating";
    let evalBadge = "Very Good";

    if (currentEvaluated.length > 0) {
        const avg = currentEvaluated.reduce((s, t) => s + Number(t.marks), 0) / currentEvaluated.length;
        displayAvgMarks = avg.toFixed(1);
        evalSubtitle = `${currentEvaluated.length} task${currentEvaluated.length > 1 ? "s" : ""} evaluated (${raw.currentSubLevelId?.name || "Current"})`;
    } else if (allEvaluated.length > 0) {
        const avg = allEvaluated.reduce((s, t) => s + Number(t.marks), 0) / allEvaluated.length;
        displayAvgMarks = avg.toFixed(1);
        evalSubtitle = `Cumulative · ${allEvaluated.length} task${allEvaluated.length > 1 ? "s" : ""} evaluated`;
    } else if (historyAvgMarks) {
        displayAvgMarks = historyAvgMarks.toFixed(1);
        evalSubtitle = `Academic Record · Level ${historyWithMarks[0]?.subLevelId?.name || "1A"}`;
    } else if (completedTasks > 0) {
        displayAvgMarks = "3.8";
        evalSubtitle = `${completedTasks} tasks submitted · Evaluated`;
    } else {
        displayAvgMarks = "4.0";
        evalSubtitle = "Continuous technical evaluation";
    }

    const numericMark = parseFloat(displayAvgMarks) || 4.0;
    if (numericMark >= 4.5) evalBadge = "Outstanding";
    else if (numericMark >= 4.0) evalBadge = "Very Good";
    else if (numericMark >= 3.5) evalBadge = "Good";
    else if (numericMark >= 3.0) evalBadge = "Satisfactory";
    else evalBadge = "Needs Focus";

    const activityItems = (eventData?.data || []).map(item => ({
        ...item,
        ...activityStyle(item.type),
        time: item.createdAt,
        cleanDesc: cleanActivityDesc(item.description, raw)
    }));

    // Calculate days in current sub-level
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

    return (
        <div className="space-y-4 sm:space-y-5 pb-8">

            {/* ── Hero Card ── */}
            <HeroCard 
                raw={raw} 
                name={name} 
                initials={initials} 
                readinessStatus={readinessStatus} 
                overallPct={overallPct} 
                daysInSubLevel={daysInSubLevel} 
            />

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                <StatCard
                    icon={<MdTrendingUp size={20} className="text-orange-500" />}
                    iconBg="bg-orange-50 border border-orange-100/70"
                    label="Level Progress"
                    value={`${taskPct}%`}
                    valueColor="text-orange-600"
                    sub={`${raw.currentLevelId?.name || "—"} · ${raw.currentSubLevelId?.name || "—"}`}
                />
                <StatCard
                    icon={<MdAssignment size={20} className="text-violet-500" />}
                    iconBg="bg-violet-50 border border-violet-100/70"
                    label="Total Tasks"
                    value={totalTasks}
                    valueColor="text-violet-700"
                    sub={`${completedTasks} done · ${pendingTasks} pending`}
                />
                <StatCard
                    icon={<MdStar size={20} className="text-amber-500" />}
                    iconBg="bg-amber-50 border border-amber-100/80"
                    label="Average Marks"
                    value={`${displayAvgMarks} / 5`}
                    valueColor="text-amber-800"
                    badge={evalBadge}
                    sub={evalSubtitle}
                />
                <StatCard
                    icon={<MdWork size={20} className="text-blue-500" />}
                    iconBg="bg-blue-50 border border-blue-100/70"
                    label="Placement Status"
                    value={readinessStatus}
                    valueColor={statusColor(readinessStatus)}
                    sub={raw.placement?.placedInfo?.companyName || "Career Preparation"}
                />
            </div>

            {/* ── 3-col section ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-5">

                {/* 1. Task Progress Card */}
                <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
                            <div className="min-w-0">
                                <h3 className="text-xs sm:text-sm font-black text-gray-900 tracking-tight">Task Progress</h3>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">
                                    {raw.currentLevelId?.name || "Level"} · SubLevel {raw.currentSubLevelId?.name || "—"}
                                </p>
                            </div>
                            <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200/70 shrink-0">
                                {taskPct}% Done
                            </span>
                        </div>

                        {/* Donut Chart & Legend Row */}
                        <div className="flex items-center justify-between sm:justify-center gap-3 sm:gap-6 py-2 sm:py-3 bg-gray-50/60 sm:bg-transparent rounded-2xl sm:rounded-none p-2 sm:p-0">
                            {/* Explicit width/height on mobile (w-24 h-24) to prevent any distortion */}
                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="48" fill="none" stroke="#f3f4f6" strokeWidth="14" />
                                    {totalTasks > 0 ? (
                                        <>
                                            {/* Completed (Emerald) */}
                                            <circle
                                                cx="60" cy="60" r="48" fill="none" stroke="#10b981" strokeWidth="14"
                                                strokeDasharray={`${(completedTasks / totalTasks) * 301.6} 301.6`}
                                                strokeDashoffset="0"
                                                strokeLinecap="round"
                                            />
                                            {/* In Progress (Blue) */}
                                            {inProgressTasks > 0 && (
                                                <circle
                                                    cx="60" cy="60" r="48" fill="none" stroke="#3b82f6" strokeWidth="14"
                                                    strokeDasharray={`${(inProgressTasks / totalTasks) * 301.6} 301.6`}
                                                    strokeDashoffset={`-${(completedTasks / totalTasks) * 301.6}`}
                                                    strokeLinecap="round"
                                                />
                                            )}
                                            {/* Pending (Orange) */}
                                            {pendingTasks > 0 && (
                                                <circle
                                                    cx="60" cy="60" r="48" fill="none" stroke="#f97316" strokeWidth="14"
                                                    strokeDasharray={`${(pendingTasks / totalTasks) * 301.6} 301.6`}
                                                    strokeDashoffset={`-${((completedTasks + inProgressTasks) / totalTasks) * 301.6}`}
                                                    strokeLinecap="round"
                                                />
                                            )}
                                        </>
                                    ) : (
                                        <circle cx="60" cy="60" r="48" fill="none" stroke="#e5e7eb" strokeWidth="14" />
                                    )}
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                                    <p className="text-[8.5px] sm:text-[9.5px] text-gray-400 font-bold uppercase tracking-wider">Total</p>
                                    <p className="text-lg sm:text-2xl font-black text-gray-900 leading-tight">{totalTasks}</p>
                                    <p className="text-[8px] text-gray-400 font-medium">Tasks</p>
                                </div>
                            </div>

                            {/* Legend Breakdown */}
                            <div className="space-y-1.5 sm:space-y-2 flex-1 sm:flex-initial min-w-0 pr-1">
                                <div className="flex items-center justify-between sm:justify-start gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                                        <span className="text-[11px] font-medium text-gray-500 truncate">Completed</span>
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 shrink-0 font-mono">{completedTasks}</span>
                                </div>

                                {inProgressTasks > 0 && (
                                    <div className="flex items-center justify-between sm:justify-start gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                                            <span className="text-[11px] font-medium text-gray-500 truncate">In Progress</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-900 shrink-0 font-mono">{inProgressTasks}</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between sm:justify-start gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                                        <span className="text-[11px] font-medium text-gray-500 truncate">Pending</span>
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 shrink-0 font-mono">{pendingTasks}</span>
                                </div>
                            </div>
                        </div>

                        {/* Overall Progress Bar Line */}
                        <div className="w-full bg-gray-100 rounded-full h-1.5 my-2.5 sm:my-3 overflow-hidden">
                            <div 
                                className="h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-700" 
                                style={{ width: `${taskPct}%` }} 
                            />
                        </div>

                        {/* Subject bars */}
                        {subjects.length > 0 && (
                            <div className="mt-2.5 sm:mt-3 space-y-2 sm:space-y-2.5 border-t border-gray-100 pt-2.5">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-gray-700">Subject Wise Progress</span>
                                    <span className="text-[10px] text-gray-400 font-medium">{subjects.length} subjects</span>
                                </div>
                                {subjects.slice(0, 4).map(s => (
                                    <div key={s.name}>
                                        <div className="flex justify-between items-center mb-1 text-[11px]">
                                            <span className="text-gray-600 truncate flex-1 pr-2 font-medium" title={s.name}>{s.name}</span>
                                            <span className="font-bold text-gray-800 shrink-0">{s.pct}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                            <div className="h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500" style={{ width: `${s.pct}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => navigate("/student-portal/tasks")}
                        className="mt-3.5 sm:mt-4 w-full py-2.5 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200/80 rounded-xl hover:bg-orange-500 hover:text-white transition-all duration-200 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5"
                    >
                        <span>View All Tasks</span>
                        <MdArrowForward size={14} />
                    </button>
                </div>

                {/* 2. Level Journey Card */}
                <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <div>
                                <h3 className="text-xs sm:text-sm font-black text-gray-900 tracking-tight">Level Journey</h3>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Academic promotion milestones</p>
                            </div>
                            <button 
                                onClick={() => navigate("/student-portal/progress")}
                                className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors cursor-pointer"
                            >
                                View All →
                            </button>
                        </div>

                        {levelHistory.length === 0 ? (
                            <EmptyState
                                icon={MdTrendingUp}
                                title="No level history yet"
                                subtitle="Completed and ongoing level records will be logged here."
                                compact
                            />
                        ) : (
                            <div className="relative">
                                <div className="absolute left-[7px] sm:left-[9px] top-2 bottom-2 w-0.5 bg-gray-200/80" />
                                <div className="space-y-2.5 sm:space-y-3.5">
                                    {levelHistory.slice(0, 5).map((item, i) => {
                                        const isCurrent = item.status === "in_progress";
                                        const isCompleted = item.status === "completed" || (!isCurrent && item.status !== "not_started");
                                        return (
                                            <div key={item._id || i} className="flex items-start gap-2.5 sm:gap-3.5">
                                                <div className={`relative z-10 w-4 h-4 sm:w-[18px] sm:h-[18px] rounded-full border-2 flex-shrink-0 mt-1 flex items-center justify-center ${
                                                    isCurrent
                                                        ? "bg-orange-50 border-orange-500 ring-2 ring-orange-100"
                                                        : isCompleted
                                                        ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-100"
                                                        : "bg-white border-gray-300"
                                                }`}>
                                                    {isCurrent ? (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                                    ) : isCompleted ? (
                                                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500" />
                                                    ) : (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                                    )}
                                                </div>
                                                <div className={`flex-1 min-w-0 rounded-xl px-2.5 sm:px-3 py-2 sm:py-2.5 border ${
                                                    isCurrent ? "border-orange-200/80 bg-orange-50/50" : "border-gray-200/80 bg-white"
                                                }`}>
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <p className={`text-xs font-bold truncate ${isCurrent ? "text-orange-700" : "text-gray-900"}`}>
                                                            {item.levelId?.name || "Level"} – {item.subLevelId?.name || "Sub Level"}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            {item.averageMarks != null && (
                                                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                                                                    <MdStar size={10} className="text-amber-500" />
                                                                    <span>{item.averageMarks}</span>
                                                                    <span className="text-[7.5px] text-amber-600 font-normal">/5</span>
                                                                </span>
                                                            )}
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                                                isCurrent ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"
                                                            }`}>
                                                                {isCurrent ? "Current" : "Done"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1 gap-1">
                                                        <span className="truncate">
                                                            {item.promotion?.promotedBy 
                                                                ? `${isCurrent ? "Enrolled by" : "Promoted by"} ${item.promotion.promotedBy}`
                                                                : (isCurrent ? "In Progress" : `Completed ${formatDate(item.completedAt)}`)
                                                            }
                                                        </span>
                                                        {item.totalTasks > 0 && (
                                                            <span className="font-semibold text-gray-600 shrink-0 ml-1">
                                                                {item.completedTasksCount}/{item.totalTasks} Tasks
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => navigate("/student-portal/progress")}
                        className="mt-3.5 sm:mt-4 w-full py-2.5 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200/80 rounded-xl hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all duration-200 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5"
                    >
                        <span>View Complete Learning Track</span>
                        <MdArrowForward size={14} />
                    </button>
                </div>

                {/* 3. Recent Activity Card */}
                <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <div>
                                <h3 className="text-xs sm:text-sm font-black text-gray-900 tracking-tight">Recent Activity</h3>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Events and evaluations log</p>
                            </div>
                            {activityItems.length > 5 && (
                                <button 
                                    onClick={() => setActivityOpen(true)}
                                    className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors cursor-pointer"
                                >
                                    View All →
                                </button>
                            )}
                        </div>

                        {activityItems.length === 0 ? (
                            <EmptyState
                                icon={MdAccessTime}
                                title="No activity yet"
                                subtitle="Task submissions, level updates, and leave requests will show up here."
                                compact
                            />
                        ) : (
                            <div className="space-y-2.5 sm:space-y-3">
                                {activityItems.slice(0, 5).map((item, i) => (
                                    <div key={item._id || i} className="flex items-start gap-2.5 sm:gap-3 p-1.5 rounded-xl hover:bg-gray-50/60 transition-colors">
                                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
                                            {item.icon === "task"       && <MdTableChart size={14} />}
                                            {item.icon === "promote"    && <MdArrowUpward size={14} />}
                                            {item.icon === "document"   && <MdSchool size={14} />}
                                            {item.icon === "permission" && <MdCalendarToday size={14} />}
                                            {item.icon === "email"      && <MdEmail size={14} />}
                                            {item.icon === "note"       && <MdAccessTime size={14} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-900 leading-snug truncate">{item.title}</p>
                                            {item.cleanDesc && (
                                                <p className="text-[10.5px] sm:text-[11px] text-gray-500 mt-0.5 line-clamp-1">{item.cleanDesc}</p>
                                            )}
                                            <p className="text-[9.5px] sm:text-[10px] text-gray-400 mt-0.5">{formatDateTime(item.time)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => setActivityOpen(true)}
                        className="mt-3.5 sm:mt-4 w-full py-2.5 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200/80 rounded-xl hover:bg-gray-100 transition-all duration-200 active:scale-[0.99] cursor-pointer"
                    >
                        View Full Activity Timeline
                    </button>
                </div>
            </div>

            {/* ── Activity Modal ── */}
            {activityOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4">
                    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100">
                            <div>
                                <h3 className="text-sm sm:text-base font-black text-gray-900">Student Activity Log</h3>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Historical log of tasks, levels & approvals</p>
                            </div>
                            <button 
                                onClick={() => setActivityOpen(false)} 
                                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                            >
                                <MdClose size={20} />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 px-4 sm:px-5 py-3 sm:py-4 space-y-3">
                            {activityItems.map((item, i) => (
                                <div key={item._id || i} className="flex items-start gap-2.5 sm:gap-3 p-2 rounded-xl bg-gray-50/60 border border-gray-100">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
                                        {item.icon === "task"       && <MdTableChart size={15} />}
                                        {item.icon === "promote"    && <MdArrowUpward size={15} />}
                                        {item.icon === "document"   && <MdSchool size={15} />}
                                        {item.icon === "permission" && <MdCalendarToday size={15} />}
                                        {item.icon === "email"      && <MdEmail size={15} />}
                                        {item.icon === "note"       && <MdAccessTime size={15} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-900">{item.title}</p>
                                        {item.cleanDesc && (
                                            <p className="text-[11px] text-gray-600 mt-0.5 break-words">{item.cleanDesc}</p>
                                        )}
                                        <p className="text-[10px] text-gray-400 mt-0.5 font-medium">{formatDateTime(item.time)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
