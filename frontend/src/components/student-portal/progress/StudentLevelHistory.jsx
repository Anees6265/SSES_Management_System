import { useGetMyStudentLevelHistoryQuery, useGetMyStudentSnapshotsQuery } from "../../../redux/api/studentApi";
import { MdTrendingUp, MdCheckCircle, MdStar, MdAccessTime } from "react-icons/md";

const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

// ── Circular Progress ─────────────────────────────────────────────────────────
const CircleProgress = ({ pct, size = 44, stroke = 4, color = "#FDA92D" }) => {
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
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">{pct}%</span>
        </div>
    );
};

export default function StudentLevelHistory() {
    const { data: historyData, isLoading } = useGetMyStudentLevelHistoryQuery();
    const { data: snapshotData } = useGetMyStudentSnapshotsQuery();

    const history = historyData?.data || [];
    const snapshots = snapshotData?.data || [];
    const overallSnapshots = snapshots.filter(s => s.snapshotScope === "overall");

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
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="h-1.5 w-full bg-orange-500" />
                <div className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Level History</h2>
                            <p className="text-xs text-gray-400 mt-0.5">{history.length} levels tracked · {completedLevels} completed</p>
                        </div>
                        <CircleProgress pct={overallPct} size={52} stroke={5} color="#FDA92D" />
                    </div>

                    {/* Stat pills */}
                    <div className="flex items-center gap-3 mt-4 flex-wrap">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-100">
                            <MdTrendingUp size={12} className="text-orange-500" />
                            <span className="text-xs font-bold text-orange-600">{history.length} Levels</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-50 border border-green-100">
                            <MdCheckCircle size={12} className="text-green-500" />
                            <span className="text-xs font-bold text-green-600">{completedLevels} Completed</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-100">
                            <MdStar size={12} className="text-violet-500" />
                            <span className="text-xs font-bold text-violet-600">{completedTasks}/{totalTasks} Tasks</span>
                        </div>
                        {currentLevel && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100">
                                <MdAccessTime size={12} className="text-blue-500" />
                                <span className="text-xs font-bold text-blue-600">
                                    Current: {currentLevel.levelId?.name} – {currentLevel.subLevelId?.name}
                                </span>
                            </div>
                        )}
                        <div className="flex-1 min-w-[120px]">
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-orange-400 transition-all duration-700" style={{ width: `${overallPct}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Two col layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Level Timeline — 2/3 width */}
                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-50">
                        <h3 className="text-sm font-bold text-gray-800">Level Journey</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Your complete learning path</p>
                    </div>

                    <div className="p-5">
                        {history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                                    <MdTrendingUp size={24} className="text-gray-300" />
                                </div>
                                <p className="text-sm font-semibold text-gray-500">No level history yet</p>
                                <p className="text-xs text-gray-400 mt-1">Your progress will appear here</p>
                            </div>
                        ) : (
                            <div className="relative">
                                <div className="absolute left-[10px] top-3 bottom-3 w-0.5 bg-gray-100" />
                                <div className="space-y-4">
                                    {history.map((item, i) => {
                                        const isCurrent = item.status === "in_progress";
                                        const pct = item.totalTasks > 0
                                            ? Math.round((item.completedTasksCount / item.totalTasks) * 100)
                                            : 0;
                                        return (
                                            <div key={item._id || i} className="flex items-start gap-4">
                                                {/* dot */}
                                                <div className={`relative z-10 w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 flex items-center justify-center
                                                    ${isCurrent ? "bg-orange-500 border-orange-500" : "bg-white border-gray-300"}`}>
                                                    {!isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                                                </div>

                                                {/* card */}
                                                <div className={`flex-1 rounded-xl border p-4 transition-all ${isCurrent
                                                        ? "border-orange-100 bg-orange-50 shadow-sm"
                                                        : "border-gray-100 bg-gray-50 hover:border-gray-200"
                                                    }`}>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className={`text-sm font-bold ${isCurrent ? "text-orange-600" : "text-gray-800"}`}>
                                                                {item.levelId?.name || "Level"}
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                {item.subLevelId?.name || "Sub Level"}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            {isCurrent
                                                                ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200">Current</span>
                                                                : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-100">
                                                                    <MdCheckCircle size={10} className="inline mr-0.5" />Done
                                                                </span>
                                                            }
                                                            {item.totalTasks > 0 && (
                                                                <CircleProgress pct={pct} size={36} stroke={3.5}
                                                                    color={isCurrent ? "#FDA92D" : "#22c55e"} />
                                                            )}
                                                        </div>
                                                    </div>

                                                    <p className="text-[11px] text-gray-400 mt-2">
                                                        {isCurrent
                                                            ? `Started ${formatDate(item.startedAt)}`
                                                            : `Completed ${formatDate(item.completedAt)}`}
                                                    </p>

                                                    {item.totalTasks > 0 && (
                                                        <div className="mt-3">
                                                            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                                                <span>{item.completedTasksCount}/{item.totalTasks} tasks</span>
                                                                <span>{pct}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 rounded-full h-1">
                                                                <div
                                                                    className={`h-1 rounded-full transition-all duration-500 ${isCurrent ? "bg-orange-400" : "bg-green-400"}`}
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
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
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-50">
                        <h3 className="text-sm font-bold text-gray-800">Progress Snapshots</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{overallSnapshots.length} records</p>
                    </div>

                    <div className="p-4">
                        {overallSnapshots.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-2">
                                    <MdStar size={20} className="text-gray-300" />
                                </div>
                                <p className="text-xs text-gray-400">No snapshots yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {overallSnapshots.slice(0, 10).map((snap, i) => {
                                    const pct = snap.totalTasks > 0
                                        ? Math.round((snap.completedTasks / snap.totalTasks) * 100)
                                        : 0;
                                    return (
                                        <div key={snap._id || i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-orange-100 transition-colors">
                                            <CircleProgress pct={pct} size={36} stroke={3} color="#FDA92D" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-800 truncate">
                                                    {snap.levelName} – {snap.subLevelName}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    {snap.subjectName || "Overall"} · {formatDate(snap.changedAt)}
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
