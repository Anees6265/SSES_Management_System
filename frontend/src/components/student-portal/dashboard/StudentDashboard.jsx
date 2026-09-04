import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    MdEmail, MdPhone, MdCheckCircle, MdAccessTime,
    MdTableChart, MdSchool, MdWork, MdStar,
    MdClose, MdBadge, MdBusiness, MdCalendarToday,
    MdAccountTree, MdVerified, MdArrowUpward, MdTrendingUp,
    MdAssignment, MdStarBorder,
} from "react-icons/md";
import {
    useGetMyStudentProfileQuery,
    useGetMyStudentTasksQuery,
    useGetMyStudentLevelHistoryQuery,
    useGetMyStudentSnapshotsQuery,
    useGetMyStudentEventLogQuery,
} from "../../../redux/api/studentApi";

const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const formatDateTime = (d) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const activityStyle = (type) => {
    switch (type) {
        case "task":       return { color: "bg-violet-50 text-violet-500", icon: "task" };
        case "promotion":  return { color: "bg-green-50 text-green-600",   icon: "promote" };
        case "document":   return { color: "bg-blue-50 text-blue-500",     icon: "document" };
        case "permission": return { color: "bg-orange-50 text-orange-500", icon: "permission" };
        case "email":      return { color: "bg-sky-50 text-sky-500",       icon: "email" };
        default:           return { color: "bg-gray-50 text-gray-400",     icon: "note" };
    }
};

const statusColor = (s = "") => {
    const n = s.toLowerCase();
    if (["ready for interview", "ready", "completed", "approved"].includes(n)) return "text-green-600";
    if (["in progress", "pending", "scheduled"].includes(n)) return "text-orange-500";
    if (["not ready", "rejected"].includes(n)) return "text-gray-400";
    return "text-blue-600";
};

const readinessBadge = (s = "") => {
    const n = s.toLowerCase();
    if (n === "ready for interview") return "bg-green-50 text-green-700 border border-green-200";
    if (n === "ready")               return "bg-blue-50 text-blue-700 border border-blue-200";
    if (n === "in progress")         return "bg-orange-50 text-orange-600 border border-orange-200";
    return "bg-gray-100 text-gray-500 border border-gray-200";
};

// ── Circular Progress ─────────────────────────────────────────────────────────
const CircleProgress = ({ pct, size = 56, stroke = 5, color = "#FDA92D" }) => {
    const r = (size - stroke * 2) / 2;
    const circ = 2 * Math.PI * r;
    return (
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
                    strokeWidth={stroke} strokeLinecap="round"
                    strokeDasharray={`${(pct / 100) * circ} ${circ}`} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">{pct}%</span>
        </div>
    );
};

// ── Hero Card ─────────────────────────────────────────────────────────────────
const HeroCard = ({ raw, name, initials, readinessStatus, overallPct, daysInSubLevel }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* top orange strip */}
        <div className="h-1.5 w-full bg-orange-500" />
        <div className="p-5">
            <div className="flex flex-col sm:flex-row items-start gap-5">

                {/* Avatar + name */}
                <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="relative">
                        {raw.image ? (
                            <img src={raw.image} alt={name} className="w-16 h-16 rounded-2xl object-cover border-2 border-gray-100 shadow-sm" />
                        ) : (
                            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center text-xl font-bold border border-orange-100">{initials}</div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <h1 className="text-base font-bold text-gray-900">{name}</h1>
                            <MdVerified size={15} className="text-blue-500 flex-shrink-0" />
                            {raw.isFTP && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">FTP</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{raw.course || "—"}</p>
                        <span className={`mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${readinessBadge(readinessStatus)}`}>
                            <MdCheckCircle size={10} /> {readinessStatus}
                        </span>
                    </div>
                </div>

                <div className="hidden sm:block w-px self-stretch bg-gray-100" />

                {/* Info grid */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                    {[
                        { icon: <MdBadge size={11} />, label: "PR Key",       value: raw.prkey },
                        { icon: <MdEmail size={11} />, label: "Email",         value: raw.email },
                        { icon: <MdPhone size={11} />, label: "Mobile",        value: raw.studentMobile },
                        { icon: <MdBusiness size={11} />, label: "Department",  value: raw.departmentId?.name },
                        { icon: <MdAccountTree size={11} />, label: "Sub Dept", value: raw.subDepartmentId?.name },
                        { icon: <MdCalendarToday size={11} />, label: "Session", value: raw.sessionId?.name },
                    ].map(({ icon, label, value }) => (
                        <div key={label}>
                            <p className="text-[10px] text-gray-400 flex items-center gap-1 mb-0.5 font-medium">{icon} {label}</p>
                            <p className="text-xs font-semibold text-gray-800 truncate">{value || "—"}</p>
                        </div>
                    ))}
                </div>

                <div className="hidden md:block w-px self-stretch bg-gray-100" />

                {/* Overall progress */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <CircleProgress pct={overallPct} size={64} stroke={5} color="#FDA92D" />
                    <p className="text-[10px] text-gray-400 font-medium text-center">Overall<br/>Progress</p>
                </div>
            </div>

            {/* Level pills */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
                <span className="text-[10px] text-gray-400 font-medium">Currently in:</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                    {raw.currentLevelId?.name || "—"}
                </span>
                <span className="text-gray-300 text-xs">›</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100">
                    {raw.currentSubLevelId?.name || "—"}
                </span>
                {raw.sessionId?.name && (
                    <>
                        <span className="text-gray-300 text-xs">·</span>
                        <span className="text-[11px] font-semibold text-gray-500">{raw.sessionId.name} <span className="text-green-500">(Active)</span></span>
                    </>
                )}
                {typeof daysInSubLevel === "number" && (
                    <>
                        <span className="text-gray-300 text-xs">·</span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-100">
                            {daysInSubLevel} {daysInSubLevel === 1 ? "day" : "days"} in this sub-level
                        </span>
                    </>
                )}
            </div>
        </div>
    </div>
);

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, iconBg, valueColor = "text-gray-900" }) => (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-[11px] text-gray-400 font-medium truncate">{label}</p>
            <p className={`text-xl font-bold leading-tight ${valueColor}`}>{value}</p>
            {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
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
    const { data: eventData }    = useGetMyStudentEventLogQuery();

    if (profileLoading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const raw      = profileData?.data || {};
    const name     = `${raw.firstName || ""} ${raw.lastName || ""}`.trim() || "Student";
    const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    const readinessStatus = raw.placement?.readinessStatus || "Not Ready";

    const totalTasks     = taskData?.totalTasks     || 0;
    const completedTasks = taskData?.completedTasks || 0;
    const pendingTasks   = taskData?.pendingTasks   || 0;
    const taskPct        = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const overallPct     = raw.overallProgress?.percentage ?? taskPct;

    const subjectGroups = taskData?.groupedBySubject || {};
    const subjects = Object.entries(subjectGroups).map(([sName, group]) => {
        const tasks = group.tasks || [];
        const done  = tasks.filter(t => t.status === "completed").length;
        return { name: sName, pct: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0 };
    });

    const allTasks  = Object.values(subjectGroups).flatMap(g => g.tasks || []);
    const evaluated = allTasks.filter(t => typeof t.marks === "number");
    const avgMarks  = evaluated.length > 0
        ? (evaluated.reduce((s, t) => s + t.marks, 0) / evaluated.length).toFixed(1)
        : null;

    const levelHistory  = historyData?.data || [];
    const activityItems = (eventData?.data || []).map(item => ({
        ...item, ...activityStyle(item.type), time: item.createdAt,
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
        <div className="space-y-5">

            {/* ── Hero ── */}
            <HeroCard 
                raw={raw} 
                name={name} 
                initials={initials} 
                readinessStatus={readinessStatus} 
                overallPct={overallPct} 
                daysInSubLevel={daysInSubLevel} 
            />

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    icon={<MdTrendingUp size={20} className="text-orange-500" />}
                    iconBg="bg-orange-50"
                    label="Level Progress"
                    value={`${taskPct}%`}
                    valueColor="text-orange-500"
                    sub={`${raw.currentLevelId?.name || "—"} · ${raw.currentSubLevelId?.name || "—"}`}
                />
                <StatCard
                    icon={<MdAssignment size={20} className="text-violet-500" />}
                    iconBg="bg-violet-50"
                    label="Total Tasks"
                    value={totalTasks}
                    sub={`${completedTasks} done · ${pendingTasks} pending`}
                />
                <StatCard
                    icon={<MdStar size={20} className="text-yellow-500" />}
                    iconBg="bg-yellow-50"
                    label="Average Marks"
                    value={avgMarks ? `${avgMarks}/5` : "—"}
                    valueColor="text-yellow-600"
                    sub={evaluated.length > 0 ? `${evaluated.length} tasks evaluated` : "No evaluations yet"}
                />
                <StatCard
                    icon={<MdWork size={20} className="text-blue-500" />}
                    iconBg="bg-blue-50"
                    label="Placement Status"
                    value={readinessStatus}
                    valueColor={statusColor(readinessStatus)}
                    sub={raw.placement?.placedInfo?.companyName || ""}
                />
            </div>

            {/* ── 3-col section ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Task Progress */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-gray-800">Task Progress</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{raw.currentLevelId?.name || "—"} · {raw.currentSubLevelId?.name || "—"}</p>
                        </div>
                        <CircleProgress pct={taskPct} size={44} stroke={4} color="#FDA92D" />
                    </div>

                    {/* Donut + Legend */}
                    <div className="flex items-center justify-center gap-6 py-3">
                        <div className="relative w-28 h-28 flex-shrink-0">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="48" fill="none" stroke="#f3f4f6" strokeWidth="16" />
                                <circle cx="60" cy="60" r="48" fill="none" stroke="#22c55e" strokeWidth="16"
                                    strokeDasharray={`${totalTasks > 0 ? (completedTasks / totalTasks) * 301.6 : 0} 301.6`} strokeLinecap="butt" />
                                <circle cx="60" cy="60" r="48" fill="none" stroke="#FDA92D" strokeWidth="16"
                                    strokeDasharray={`${totalTasks > 0 ? (pendingTasks / totalTasks) * 301.6 : 0} 301.6`}
                                    strokeDashoffset={`-${totalTasks > 0 ? (completedTasks / totalTasks) * 301.6 : 0}`} strokeLinecap="butt" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <p className="text-[10px] text-gray-400">Total</p>
                                <p className="text-2xl font-bold text-gray-800">{totalTasks}</p>
                            </div>
                        </div>
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-gray-800">{completedTasks}</p>
                                    <p className="text-[10px] text-gray-400">Completed</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-gray-800">{pendingTasks}</p>
                                    <p className="text-[10px] text-gray-400">Pending</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Subject bars */}
                    {subjects.length > 0 && (
                        <div className="mt-3 space-y-2.5 border-t border-gray-50 pt-3">
                            <p className="text-[11px] font-bold text-gray-600">Subject Wise</p>
                            {subjects.slice(0, 4).map(s => (
                                <div key={s.name}>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-[11px] text-gray-600 truncate max-w-[120px]">{s.name}</span>
                                        <span className="text-[11px] font-semibold text-gray-700">{s.pct}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                        <div className="h-1.5 rounded-full bg-orange-400 transition-all duration-500" style={{ width: `${s.pct}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <button onClick={() => navigate("/student-portal/tasks")}
                        className="mt-4 w-full py-2 text-xs font-semibold text-orange-500 border border-orange-200 rounded-xl hover:bg-orange-500 hover:!text-white transition-all duration-200">
                        View All Tasks →
                    </button>
                </div>

                {/* Level History */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-800">Level Journey</h3>
                        <button onClick={() => navigate("/student-portal/progress")}
                            className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors">
                            View All →
                        </button>
                    </div>

                    {levelHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-2">
                                <MdTrendingUp size={20} className="text-gray-300" />
                            </div>
                            <p className="text-xs text-gray-400">No level history yet</p>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gray-100" />
                            <div className="space-y-4">
                                {levelHistory.slice(0, 5).map((item, i) => {
                                    const isCurrent = item.status === "in_progress";
                                    return (
                                        <div key={item._id || i} className="flex items-start gap-3.5">
                                            <div className={`relative z-10 w-4.5 h-4.5 rounded-full border-2 flex-shrink-0 mt-0.5 w-[18px] h-[18px]
                                                ${isCurrent ? "bg-orange-500 border-orange-500" : "bg-white border-gray-300"}`} />
                                            <div className={`flex-1 rounded-xl px-3 py-2.5 border ${isCurrent ? "border-orange-100 bg-orange-50" : "border-gray-100 bg-gray-50"}`}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className={`text-xs font-bold truncate ${isCurrent ? "text-orange-600" : "text-gray-700"}`}>
                                                        {item.levelId?.name || "Level"} – {item.subLevelId?.name || "Sub Level"}
                                                    </p>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${isCurrent ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"}`}>
                                                        {isCurrent ? "Current" : "Done"}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    {isCurrent ? "In Progress" : `Completed ${formatDate(item.completedAt)}`}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Activity */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-800">Recent Activity</h3>
                        {activityItems.length > 5 && (
                            <button onClick={() => setActivityOpen(true)}
                                className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors">
                                View All →
                            </button>
                        )}
                    </div>

                    {activityItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-2">
                                <MdAccessTime size={20} className="text-gray-300" />
                            </div>
                            <p className="text-xs text-gray-400">No activity yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activityItems.slice(0, 6).map((item, i) => (
                                <div key={item._id || i} className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
                                        {item.icon === "task"       && <MdTableChart size={14} />}
                                        {item.icon === "promote"    && <MdArrowUpward size={14} />}
                                        {item.icon === "document"   && <MdSchool size={14} />}
                                        {item.icon === "permission" && <MdCalendarToday size={14} />}
                                        {item.icon === "email"      && <MdEmail size={14} />}
                                        {item.icon === "note"       && <MdAccessTime size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-800 leading-snug">{item.title}</p>
                                        {item.description && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{item.description}</p>}
                                        <p className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(item.time)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Activity Modal */}
            {activityOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <h3 className="text-sm font-bold text-gray-800">All Activity</h3>
                            <button onClick={() => setActivityOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                                <MdClose size={18} />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
                            {activityItems.map((item, i) => (
                                <div key={item._id || i} className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
                                        {item.icon === "task"       && <MdTableChart size={14} />}
                                        {item.icon === "promote"    && <MdArrowUpward size={14} />}
                                        {item.icon === "document"   && <MdSchool size={14} />}
                                        {item.icon === "permission" && <MdCalendarToday size={14} />}
                                        {item.icon === "email"      && <MdEmail size={14} />}
                                        {item.icon === "note"       && <MdAccessTime size={14} />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-800">{item.title}</p>
                                        {item.description && <p className="text-[11px] text-gray-400 mt-0.5">{item.description}</p>}
                                        <p className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(item.time)}</p>
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
