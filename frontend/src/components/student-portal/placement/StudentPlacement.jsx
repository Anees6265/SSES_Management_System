import { useGetMyPlacementQuery, useGetMyStudentProfileQuery } from "../../../redux/api/studentApi";
import { MdWork, MdCheckCircle, MdBusiness, MdLocationOn, MdCalendarToday, MdOpenInNew, MdAccessTime } from "react-icons/md";

const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const statusBadge = (s = "") => {
    const n = s.toLowerCase();
    if (["selected", "placed", "joined"].includes(n))                     return "bg-green-50 text-green-600 border border-green-100";
    if (["scheduled", "ongoing", "rescheduled"].includes(n))              return "bg-blue-50 text-blue-600 border border-blue-100";
    if (["rejectedbycompany", "rejectedbystudent"].includes(n))           return "bg-red-50 text-red-500 border border-red-100";
    return "bg-gray-50 text-gray-500 border border-gray-200";
};

const STEPS = ["Not Ready", "In Progress", "Ready", "Ready for Interview"];

export default function StudentPlacement() {
    const { data: placementRes } = useGetMyPlacementQuery();
    const { data: profileRes }   = useGetMyStudentProfileQuery();

    const placement  = placementRes?.data || profileRes?.data?.placement || {};
    const placedInfo = placement.placedInfo || {};
    const interviews = placement.PlacementinterviewRecord || [];
    const readiness  = placement.readinessStatus || "Not Ready";
    const isPlaced   = !!placedInfo.companyName;

    const currentIdx = STEPS.indexOf(readiness);
    const percent    = Math.round(((currentIdx + 1) / STEPS.length) * 100);

    return (
        <div className="space-y-5">

            {/* ── Header Card ── */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="h-1.5 w-full bg-orange-500" />
                <div className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Placement</h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {interviews.length} interview{interviews.length !== 1 ? "s" : ""} · {isPlaced ? "Placed" : "Not Placed"}
                            </p>
                        </div>
                        {isPlaced && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 border border-green-100 text-xs font-bold text-green-600">
                                <MdCheckCircle size={13} /> Placed at {placedInfo.companyName}
                            </span>
                        )}
                    </div>

                    {/* Stat pills */}
                    <div className="flex items-center gap-3 mt-4 flex-wrap">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-100">
                            <MdWork size={12} className="text-orange-500" />
                            <span className="text-xs font-bold text-orange-600">{readiness}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100">
                            <MdBusiness size={12} className="text-blue-500" />
                            <span className="text-xs font-bold text-blue-600">{interviews.length} Interviews</span>
                        </div>
                        {placement.resumeURL && (
                            <button onClick={() => window.open(placement.resumeURL, "_blank")}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-600 hover:border-orange-300 hover:text-orange-500 transition-colors">
                                <MdOpenInNew size={12} /> View Resume
                            </button>
                        )}
                        <div className="flex-1 min-w-[120px]">
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-orange-400 transition-all duration-700"
                                    style={{ width: `${percent}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Two col layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Left — Readiness + Placed Info */}
                <div className="space-y-5">

                    {/* Readiness Steps */}
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
                        <div className="px-5 py-4 border-b border-gray-50">
                            <h3 className="text-sm font-bold text-gray-800">Readiness Status</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Your placement journey</p>
                        </div>
                        <div className="p-5">
                            <div className="space-y-3">
                                {STEPS.map((step, i) => {
                                    const done   = i < currentIdx;
                                    const active = i === currentIdx;
                                    return (
                                        <div key={step} className="flex items-center gap-3">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 flex-shrink-0 ${
                                                done   ? "bg-green-500 border-green-500 text-white" :
                                                active ? "bg-orange-500 border-orange-500 text-white" :
                                                         "bg-white border-gray-200 text-gray-400"
                                            }`}>
                                                {done ? <MdCheckCircle size={13} /> : i + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-xs font-bold ${
                                                    active ? "text-orange-600" : done ? "text-green-600" : "text-gray-400"
                                                }`}>{step}</p>
                                                {active && (
                                                    <p className="text-[10px] text-gray-400 mt-0.5">Current stage</p>
                                                )}
                                            </div>
                                            {active && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-500 border border-orange-100">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Placed Info */}
                    {isPlaced && (
                        <div className="bg-white border border-green-100 rounded-2xl shadow-sm overflow-hidden">
                            <div className="h-1 bg-green-500" />
                            <div className="p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                                        <MdWork size={18} className="text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">{placedInfo.companyName}</p>
                                        <p className="text-xs text-gray-500">{placedInfo.jobProfile} · {placedInfo.jobType}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 pt-2 border-t border-gray-50">
                                    {placedInfo.location && (
                                        <div className="flex items-center gap-2">
                                            <MdLocationOn size={12} className="text-gray-400 flex-shrink-0" />
                                            <span className="text-xs text-gray-600">{placedInfo.location}</span>
                                        </div>
                                    )}
                                    {placedInfo.joiningDate && (
                                        <div className="flex items-center gap-2">
                                            <MdCalendarToday size={12} className="text-gray-400 flex-shrink-0" />
                                            <span className="text-xs text-gray-600">Joining: {formatDate(placedInfo.joiningDate)}</span>
                                        </div>
                                    )}
                                    {placedInfo.placedDate && (
                                        <div className="flex items-center gap-2">
                                            <MdCheckCircle size={12} className="text-green-400 flex-shrink-0" />
                                            <span className="text-xs text-gray-600">Placed: {formatDate(placedInfo.placedDate)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right — Interview History (2/3) */}
                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-50">
                        <h3 className="text-sm font-bold text-gray-800">Interview History</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{interviews.length} record{interviews.length !== 1 ? "s" : ""}</p>
                    </div>

                    <div className="p-3">
                        {interviews.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                                    <MdBusiness size={24} className="text-gray-300" />
                                </div>
                                <p className="text-sm font-semibold text-gray-500">No interview records yet</p>
                                <p className="text-xs text-gray-400 mt-1">Your interview history will appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {interviews.map((rec, i) => (
                                    <div key={rec._id || i}
                                        className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md hover:border-orange-100 transition-all duration-200">

                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex items-start gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                    <MdBusiness size={16} className="text-blue-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">{rec.jobProfile || "Interview"}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <MdAccessTime size={10} className="text-gray-400" />
                                                        <span className="text-[11px] text-gray-400">
                                                            {formatDate(rec.scheduleDate)}
                                                            {rec.rescheduleDate ? ` · Rescheduled ${formatDate(rec.rescheduleDate)}` : ""}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusBadge(rec.status)}`}>
                                                {rec.status}
                                            </span>
                                        </div>

                                        {/* Rounds */}
                                        {rec.rounds?.length > 0 && (
                                            <div className="mt-2.5 space-y-1.5 pt-2.5 border-t border-gray-50">
                                                {rec.rounds.map((round, j) => (
                                                    <div key={j} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                                        <div>
                                                            <p className="text-xs font-semibold text-gray-700">{round.roundName}</p>
                                                            <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(round.date)} · {round.mode}</p>
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge(round.result)}`}>
                                                            {round.result}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
