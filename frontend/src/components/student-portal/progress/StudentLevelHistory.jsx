import { useState, useMemo } from "react";
import { useGetMyStudentLevelHistoryQuery, useGetMyStudentSnapshotsQuery } from "../../../redux/api/studentApi";
import { 
    MdTrendingUp, 
    MdCheckCircle, 
    MdStar, 
    MdAccessTime, 
    MdPerson, 
    MdAssignment, 
    MdMenuBook, 
    MdOutlineCalendarToday, 
    MdExpandMore 
} from "react-icons/md";
import EmptyState from "../../shared/empty-state/EmptyState";

const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const formatDateTime = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const getCleanName = (obj, fallback = "") => {
    if (!obj) return fallback;
    const val = typeof obj === "string" ? obj : obj.name;
    if (!val || typeof val !== "string") return fallback;
    // Guard against showing raw 24-character hex ObjectIds
    if (/^[0-9a-fA-F]{24}$/.test(val.trim())) return fallback;
    return val.trim() || fallback;
};

// ── Circular Progress ─────────────────────────────────────────────────────────
const CircleProgress = ({ pct, size = 44, stroke = 3, color = "#F97316" }) => {
    // Correct SVG circle radius so stroke fits cleanly inside size without clipping
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const isLarge = size >= 50;
    const isTiny = size <= 36;
    return (
        <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
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
                />
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

export default function StudentLevelHistory() {
    const { data: historyData, isLoading } = useGetMyStudentLevelHistoryQuery();
    const { data: snapshotData } = useGetMyStudentSnapshotsQuery();
    const [expandedCards, setExpandedCards] = useState({});

    const toggleCardTopics = (id) => {
        setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const history = historyData?.data || [];
    const snapshots = snapshotData?.data || [];

    // Only show single snapshot per completed task milestone (completedTasks > 0, deduplicated, and only for active levels)
    const overallSnapshots = useMemo(() => {
        const validSubLevelIds = new Set(
            history.map(h => (h.subLevelId?._id || h.subLevelId)?.toString()).filter(Boolean)
        );
        const raw = (snapshots || []).filter(s => {
            const snapSubId = (s.subLevelId?._id || s.subLevelId)?.toString();
            if (snapSubId && validSubLevelIds.size > 0 && !validSubLevelIds.has(snapSubId)) {
                return false;
            }
            return (s.snapshotScope === "overall" || !s.snapshotScope) && (s.completedTasks > 0);
        });
        const deduped = [];
        const seenMilestones = new Set();
        for (const snap of raw) {
            const levelKey = snap.levelId?._id || snap.levelId || snap.levelName || "";
            const subLevelKey = snap.subLevelId?._id || snap.subLevelId || snap.subLevelName || "";
            const milestoneKey = `${levelKey}_${subLevelKey}_${snap.completedTasks}_${snap.totalTasks}`;
            if (!seenMilestones.has(milestoneKey)) {
                seenMilestones.add(milestoneKey);
                deduped.push(snap);
            }
        }
        return deduped;
    }, [snapshots, history]);

    const completedLevels = history.filter(h => h.status !== "in_progress").length;
    const currentLevel = history.find(h => h.status === "in_progress");
    const totalTasks = history.reduce((s, h) => s + (h.totalTasks || 0), 0);
    const completedTasks = history.reduce((s, h) => s + (h.completedTasksCount || 0), 0);
    const overallPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    if (isLoading) return (
        <div className="flex justify-center pt-20">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-5">

            {/* ── Header Card ── */}
            <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs">
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400" />
                <div className="p-3.5 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight truncate">Level History</h2>
                            <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 truncate">{history.length} levels tracked · {completedLevels} completed</p>
                        </div>
                        <CircleProgress pct={overallPct} size={46} stroke={4.5} color="#F97316" />
                    </div>

                    {/* Stat pills */}
                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 mt-3.5 sm:mt-4">
                        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-100">
                            <MdTrendingUp size={13} className="text-orange-500 shrink-0" />
                            <span className="text-xs font-bold text-orange-600 truncate">{history.length} Levels</span>
                        </div>
                        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-green-50 border border-green-100">
                            <MdCheckCircle size={13} className="text-green-500 shrink-0" />
                            <span className="text-xs font-bold text-green-600 truncate">{completedLevels} Completed</span>
                        </div>
                        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-100">
                            <MdStar size={13} className="text-violet-500 shrink-0" />
                            <span className="text-xs font-bold text-violet-600 truncate">{completedTasks}/{totalTasks} Tasks</span>
                        </div>
                        {currentLevel && (
                            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 col-span-2 sm:col-span-1">
                                <MdAccessTime size={13} className="text-blue-500 shrink-0" />
                                <span className="text-xs font-bold text-blue-600 truncate">
                                    Current: {getCleanName(currentLevel.levelId, "Level")} – {getCleanName(currentLevel.subLevelId, "Sub Level")}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Progress line */}
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3 overflow-hidden">
                        <div className="h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-700" style={{ width: `${overallPct}%` }} />
                    </div>
                </div>
            </div>

            {/* ── Two col layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Level Timeline — 2/3 width */}
                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                    <div className="px-3.5 sm:px-5 py-3 sm:py-4 border-b border-gray-50 flex items-center justify-between bg-orange-50/10">
                        <div className="min-w-0">
                            <h3 className="text-xs sm:text-sm font-bold text-gray-800 truncate">Level Journey</h3>
                            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">Complete learning path, promoters & task breakdown</p>
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100 shrink-0">
                            {history.length} Levels
                        </span>
                    </div>

                    <div className="p-3 sm:p-5">
                        {history.length === 0 ? (
                            <EmptyState
                                icon={MdTrendingUp}
                                title="No level history yet"
                                subtitle="Your academic progress and level advancements will appear here."
                                compact
                            />
                        ) : (
                            <div className="relative">
                                <div className="absolute left-[7px] sm:left-[10px] top-4 bottom-4 w-0.5 bg-gray-200/80" />
                                <div className="space-y-3.5 sm:space-y-5">
                                    {history.map((item, i) => {
                                        const isCurrent = item.status === "in_progress";
                                        const isCompleted = item.status === "completed" || (!isCurrent && item.status !== "not_started");
                                        const pct = item.totalTasks > 0
                                            ? Math.round((item.completedTasksCount / item.totalTasks) * 100)
                                            : (isCompleted ? 100 : 0);
                                        const cardKey = item._id || i;
                                        const isCardExpanded = Boolean(expandedCards[cardKey]);

                                        return (
                                            <div key={cardKey} className="flex items-start gap-2.5 sm:gap-4">
                                                {/* Timeline dot */}
                                                <div className={`relative z-10 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex-shrink-0 mt-3 sm:mt-3.5 flex items-center justify-center ${
                                                    isCurrent
                                                        ? "bg-orange-50 border-orange-500 ring-2 sm:ring-4 ring-orange-100"
                                                        : isCompleted
                                                        ? "bg-green-50 border-green-500 ring-2 sm:ring-4 ring-green-100"
                                                        : "bg-white border-gray-300"
                                                }`}>
                                                    {isCurrent ? (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                                    ) : isCompleted ? (
                                                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500" />
                                                    ) : (
                                                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-gray-300" />
                                                    )}
                                                </div>

                                                {/* ── Level Card ── */}
                                                <div className={`flex-1 rounded-xl sm:rounded-2xl border p-3 sm:p-5 transition-all shadow-xs ${
                                                    isCurrent
                                                        ? "border-orange-200 bg-orange-50/30 ring-1 ring-orange-200/60"
                                                        : "border-gray-200/90 bg-white hover:border-gray-300 hover:shadow-xs"
                                                }`}>
                                                    {/* Row 1: Header (Level Title, Status, Progress, Marks) */}
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pb-3 border-b border-gray-100">
                                                        <div className="flex items-start justify-between sm:justify-start gap-2 sm:gap-3 w-full sm:w-auto">
                                                            <div>
                                                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                                                        isCurrent ? "bg-orange-600 text-white" : "bg-slate-900 text-white"
                                                                    }`}>
                                                                        {getCleanName(item.levelId, "Level")}
                                                                    </span>
                                                                    <h4 className="text-sm sm:text-base font-extrabold text-gray-900 tracking-tight">
                                                                        {getCleanName(item.subLevelId, "Sub Level")}
                                                                    </h4>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-gray-400 mt-1 flex-wrap">
                                                                    <span className="flex items-center gap-1 font-medium">
                                                                        <MdAccessTime size={12} className="text-gray-400 shrink-0" />
                                                                        {isCurrent
                                                                            ? `Started: ${formatDate(item.startedAt)}`
                                                                            : `Completed: ${formatDate(item.completedAt || item.promotion?.promotedAt)}`
                                                                        }
                                                                    </span>
                                                                    {item.completedAt && item.startedAt && (
                                                                        <span className="text-gray-300">•</span>
                                                                    )}
                                                                    {item.completedAt && item.startedAt && (
                                                                        <span className="font-semibold text-gray-500">
                                                                            {Math.max(1, Math.round((new Date(item.completedAt) - new Date(item.startedAt)) / (1000 * 60 * 60 * 24)))} days duration
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Circle on mobile top right */}
                                                            <div className="sm:hidden shrink-0">
                                                                <CircleProgress 
                                                                    pct={pct} 
                                                                    size={38} 
                                                                    stroke={3.5} 
                                                                    color={isCurrent ? "#F97316" : "#10b981"} 
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-0.5 sm:pt-0">
                                                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                                                {item.averageMarks != null && (
                                                                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/60 rounded-xl px-2 py-0.5 text-xs font-bold text-amber-800">
                                                                        <MdStar size={13} className="text-amber-500" />
                                                                        <span>{item.averageMarks}</span>
                                                                        <span className="text-[10px] text-amber-600 font-medium">/5</span>
                                                                    </div>
                                                                )}

                                                                {isCurrent ? (
                                                                    <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl bg-orange-100 text-orange-700 border border-orange-200">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                                                        <span>Current Level</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                                                        <MdCheckCircle size={13} className="text-emerald-500" />
                                                                        <span>Completed</span>
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Circle on desktop */}
                                                            <div className="hidden sm:block shrink-0">
                                                                <CircleProgress 
                                                                    pct={pct} 
                                                                    size={42} 
                                                                    stroke={3.5} 
                                                                    color={isCurrent ? "#F97316" : "#10b981"} 
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* ── 1. KISNE PROMOTE KIYA (Promoter Details Strip) ── */}
                                                    <div className="mt-3 p-2.5 sm:p-3 rounded-xl bg-gray-50/80 border border-gray-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-2.5">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-600 font-bold text-xs shrink-0 shadow-2xs">
                                                                <MdPerson size={16} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                                                                    {isCurrent ? "Enrolled / Placed By" : "Promoted By"}
                                                                </p>
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="text-xs font-bold text-gray-900 truncate">
                                                                        {item.promotion?.promotedBy || (isCurrent ? "Academic Department" : "Faculty Evaluator")}
                                                                    </span>
                                                                    {item.promotion?.promotedByRole &&
                                                                     item.promotion.promotedByRole.trim().toLowerCase() !== (item.promotion?.promotedBy || "").trim().toLowerCase() &&
                                                                     item.promotion.promotedByRole.trim().toLowerCase() !== "faculty evaluator" && (
                                                                        <span className="text-[10px] font-semibold text-gray-500 bg-white border border-gray-200/60 px-1.5 py-0.5 rounded-md">
                                                                            {item.promotion.promotedByRole}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-0.5 sm:pt-0">
                                                            {item.promotion?.promotedAt && (
                                                                <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-gray-200/50">
                                                                    <MdOutlineCalendarToday size={11} className="text-gray-400 shrink-0" />
                                                                    <span>{formatDateTime(item.promotion.promotedAt)}</span>
                                                                </span>
                                                            )}
                                                            {item.promotion?.isAuto && (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60">
                                                                    ⚡ Auto
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {item.promotion?.note && !/^[0-9a-fA-F]{24}$/.test(item.promotion.note.trim()) && (
                                                        <p className="text-xs text-gray-600 bg-amber-50/40 p-2 rounded-lg border border-amber-100/60 italic mt-2">
                                                            "{item.promotion.note}"
                                                        </p>
                                                    )}

                                                    {/* ── 2. KIS SUBJECT KE KITNE TASK COMPLETE KARKE AAYA (Subject-wise Breakdown) ── */}
                                                    <div className="mt-4 pt-3.5 border-t border-gray-100">
                                                        <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="w-5 h-5 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                                                    <MdAssignment size={13} />
                                                                </span>
                                                                <span className="text-[11px] sm:text-xs font-extrabold text-gray-800">
                                                                    Subject-wise Task Completion
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 shrink-0">
                                                                {item.completedTasksCount || 0}/{item.totalTasks || 0} Tasks Done ({pct}%)
                                                            </span>
                                                        </div>

                                                        {item.subjectStats && item.subjectStats.length > 0 ? (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {item.subjectStats.map((subj, sIdx) => {
                                                                    const sPct = subj.completionPercentage ?? (subj.totalTasks > 0 ? Math.round((subj.completedTasks / subj.totalTasks) * 100) : 0);
                                                                    const isSubjDone = subj.completedTasks === subj.totalTasks && subj.totalTasks > 0;
                                                                    return (
                                                                        <div key={sIdx} className="bg-white rounded-xl p-2 sm:p-2.5 border border-gray-200/80 shadow-2xs hover:border-gray-300 transition-all">
                                                                            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                                                                <p className="text-[11px] sm:text-xs font-bold text-gray-800 truncate" title={subj.subjectName}>
                                                                                    {subj.subjectName}
                                                                                </p>
                                                                                <span className={`text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                                                                                    isSubjDone 
                                                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" 
                                                                                        : "bg-gray-100 text-gray-700 border border-gray-200/60"
                                                                                }`}>
                                                                                    {subj.completedTasks}/{subj.totalTasks} Done
                                                                                </span>
                                                                            </div>

                                                                            {/* Mini progress bar */}
                                                                            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5">
                                                                                <div 
                                                                                    className={`h-1.5 rounded-full transition-all duration-300 ${isSubjDone ? "bg-emerald-500" : "bg-orange-500"}`}
                                                                                    style={{ width: `${sPct}%` }}
                                                                                />
                                                                            </div>

                                                                            <div className="flex items-center justify-between text-[10px] text-gray-400">
                                                                                <span className="font-semibold text-gray-500">{sPct}% Completed</span>
                                                                                {subj.averageMarks != null && (
                                                                                    <span className="font-bold text-amber-700 flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-100">
                                                                                        <MdStar size={10} className="text-amber-500" />
                                                                                        {subj.averageMarks}/5
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-gray-400 italic">No subject tasks recorded for this level.</p>
                                                        )}
                                                    </div>

                                                    {/* ── 3. KYA KYA PADH KAR AAYA (Curriculum & Topics Covered) ── */}
                                                    <div className="mt-4 pt-3.5 border-t border-gray-100">
                                                        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="w-5 h-5 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                                                    <MdMenuBook size={13} />
                                                                </span>
                                                                <span className="text-[11px] sm:text-xs font-extrabold text-gray-800">
                                                                    Curriculum & Topics Covered ({item.totalTopicsCount || item.topicsStudied?.length || 0})
                                                                </span>
                                                            </div>
                                                            {item.topicsStudied && item.topicsStudied.length > 6 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleCardTopics(cardKey)}
                                                                    className="text-[10px] sm:text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-0.5 cursor-pointer"
                                                                >
                                                                    {isCardExpanded ? "Show Less" : `View All (${item.topicsStudied.length})`}
                                                                    <MdExpandMore size={14} className={`transition-transform duration-200 ${isCardExpanded ? "rotate-180" : ""}`} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {item.topicsStudied && item.topicsStudied.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1 sm:gap-1.5">
                                                                {(isCardExpanded ? item.topicsStudied : item.topicsStudied.slice(0, 6)).map((topic, tIdx) => (
                                                                    <span
                                                                        key={tIdx}
                                                                        className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-gray-700 bg-white px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-gray-200/80 shadow-2xs hover:border-blue-300 transition-colors"
                                                                    >
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                                                        <span className="truncate max-w-[170px] sm:max-w-[260px]">{topic}</span>
                                                                    </span>
                                                                ))}
                                                                {!isCardExpanded && item.topicsStudied.length > 6 && (
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => toggleCardTopics(cardKey)}
                                                                        className="inline-flex items-center text-[10px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-orange-200/60 cursor-pointer transition-colors"
                                                                    >
                                                                        +{item.topicsStudied.length - 6} more topics
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-gray-400 italic">Topics and syllabus modules will appear here as tasks are assigned and evaluated.</p>
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
                </div>

                {/* Progress Snapshots — 1/3 width */}
                <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                    <div className="px-3.5 sm:px-5 py-3 sm:py-4 border-b border-gray-50 flex items-center justify-between bg-orange-50/10">
                        <div className="min-w-0">
                            <h3 className="text-xs sm:text-sm font-bold text-gray-800 truncate">Progress Snapshots</h3>
                            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">{overallSnapshots.length} records</p>
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100 shrink-0">
                            Milestones
                        </span>
                    </div>

                    <div className="p-3 sm:p-4">
                        {overallSnapshots.length === 0 ? (
                            <EmptyState
                                icon={MdStar}
                                title="No snapshots yet"
                                subtitle="Periodic task and syllabus milestones will be recorded here."
                                compact
                            />
                        ) : (
                            <div className="space-y-2 sm:space-y-2.5">
                                {overallSnapshots.slice(0, 20).map((snap, i) => {
                                    const pct = snap.totalTasks > 0
                                        ? Math.round((snap.completedTasks / snap.totalTasks) * 100)
                                        : 0;
                                    return (
                                        <div key={snap._id || i} className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-orange-100 transition-colors">
                                            <CircleProgress pct={pct} size={34} stroke={3} color="#F97316" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-800 truncate">
                                                    {getCleanName(snap.levelName, "Level")} – {getCleanName(snap.subLevelName, "Sub Level")}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                                                    {snap.subjectName ? `${snap.subjectName} · ` : ""}{snap.completedTasks} {snap.completedTasks === 1 ? "task" : "tasks"} completed · {formatDate(snap.changedAt)}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-xs font-bold text-gray-700">{snap.completedTasks}/{snap.totalTasks}</p>
                                                <div className="flex items-center justify-end gap-0.5 mt-0.5">
                                                    <MdStar size={10} className="text-yellow-400" />
                                                    <span className="text-[10px] text-gray-400">{snap.averageMarks || 0}/5</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
