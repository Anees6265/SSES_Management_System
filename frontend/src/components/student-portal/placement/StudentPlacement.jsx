import { useState } from "react";
import {
    Briefcase, CheckCircle2, Building2, MapPin, Calendar,
    ExternalLink, Clock, Sparkles, Award, TrendingUp,
    FileText, Check, ChevronRight, AlertCircle, Star
} from "lucide-react";
import {
    useGetMyPlacementQuery,
    useGetMyStudentProfileQuery
} from "../../../redux/api/studentApi";

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
};

const formatDateTime = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    return isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
};

const statusBadge = (s = "") => {
    const n = s.toLowerCase();
    if (["selected", "placed", "joined", "cleared", "passed"].includes(n)) {
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    }
    if (["scheduled", "ongoing", "rescheduled", "in progress"].includes(n)) {
        return "bg-blue-50 text-blue-700 border-blue-200/80";
    }
    if (["rejectedbycompany", "rejectedbystudent", "rejected", "failed"].includes(n)) {
        return "bg-rose-50 text-rose-700 border-rose-200/80";
    }
    return "bg-gray-100 text-gray-700 border-gray-200";
};

const STEPS = [
    { label: "Not Ready", desc: "Profile building & syllabus foundations" },
    { label: "In Progress", desc: "Mock interviews, coding tasks & assessments" },
    { label: "Ready", desc: "Resume verified & eligible for campus drives" },
    { label: "Ready for Interview", desc: "Active candidate in ongoing company drives" }
];

export default function StudentPlacement() {
    const [mobileTab, setMobileTab] = useState("overview"); // "overview" | "readiness" | "interviews" | "company"

    const { data: placementRes, isLoading: placementLoading } = useGetMyPlacementQuery();
    const { data: profileRes, isLoading: profileLoading } = useGetMyStudentProfileQuery();

    const placement = placementRes?.data || profileRes?.data?.placement || {};
    const placedInfo = placement.placedInfo || {};
    const interviews = placement.PlacementinterviewRecord || [];
    const readiness = placement.readinessStatus || "Not Ready";
    const isPlaced = !!placedInfo.companyName;

    const currentIdx = STEPS.findIndex(s => s.label.toLowerCase() === readiness.toLowerCase());
    const safeIdx = currentIdx >= 0 ? currentIdx : 0;
    const progressPercent = Math.round(((safeIdx + 1) / STEPS.length) * 100);

    const isLoading = placementLoading || profileLoading;

    if (isLoading) {
        return (
            <div className="flex justify-center pt-20">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-5">

            {/* ── Header Card (Matching StudentTasks & StudentPermissions) ── */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400" />
                <div className="p-3.5 sm:p-5">
                    
                    {/* Top Row: Title + Placement Status Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-bold text-gray-900">Placement & Careers</h2>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                                    {isPlaced ? "Placed" : readiness}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {interviews.length} drive {interviews.length === 1 ? "interview" : "interviews"} · {isPlaced ? `Placed at ${placedInfo.companyName}` : "Campus placement preparation"}
                            </p>
                        </div>

                        {/* Top Right Action: Resume / Placed Tag */}
                        <div className="flex items-center gap-2">
                            {placement.resumeURL && (
                                <button
                                    onClick={() => window.open(placement.resumeURL, "_blank", "noopener,noreferrer")}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-orange-50 hover:text-orange-600 border border-gray-200 hover:border-orange-200 rounded-xl transition-all shadow-2xs"
                                >
                                    <FileText size={13} className="text-orange-500" />
                                    <span>My Resume</span>
                                    <ExternalLink size={11} className="text-gray-400" />
                                </button>
                            )}

                            {isPlaced && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-2xs">
                                    <Sparkles size={13} className="text-emerald-500" />
                                    <span>Placed Candidate</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Stat Pills & Progress Bar (Identical to StudentTasks) */}
                    <div className="mt-3.5 pt-3 border-t border-gray-100/80">
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5">
                            
                            {/* Readiness Pill */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-50/80 border border-orange-100">
                                <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold text-orange-700 truncate">{readiness}</span>
                            </div>

                            {/* Interviews Pill */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50/80 border border-blue-100">
                                <Building2 size={13} className="text-blue-500 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold text-blue-700 truncate">{interviews.length} Interviews</span>
                            </div>

                            {/* Stage Number Pill */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50/80 border border-amber-100">
                                <TrendingUp size={13} className="text-amber-500 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold text-amber-700 truncate">Stage {safeIdx + 1} of {STEPS.length}</span>
                            </div>

                            {/* Status Result Pill */}
                            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${
                                isPlaced ? "bg-emerald-50/80 border-emerald-100 text-emerald-700" : "bg-purple-50/80 border-purple-100 text-purple-700"
                            }`}>
                                <Award size={13} className="shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold truncate">
                                    {isPlaced ? "Placed in Drive" : "Actively Preparing"}
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                            <div 
                                className="h-1.5 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500" 
                                style={{ width: `${progressPercent}%` }} 
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* ── Mobile Status Tabs (`md:hidden`) — Matches StudentTasks ── */}
            <div className="md:hidden bg-gray-100/90 p-1 rounded-xl flex gap-1 text-xs font-bold">
                <button
                    onClick={() => setMobileTab("overview")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                        mobileTab === "overview" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <span>Overview</span>
                </button>
                <button
                    onClick={() => setMobileTab("readiness")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                        mobileTab === "readiness" ? "bg-white text-orange-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <span>Journey</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-800">
                        {safeIdx + 1}/4
                    </span>
                </button>
                <button
                    onClick={() => setMobileTab("interviews")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                        mobileTab === "interviews" ? "bg-white text-blue-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <span>Drives</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
                        {interviews.length}
                    </span>
                </button>
                {isPlaced && (
                    <button
                        onClick={() => setMobileTab("company")}
                        className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                            mobileTab === "company" ? "bg-white text-emerald-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        <span>Offer</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                            ✓
                        </span>
                    </button>
                )}
            </div>

            {/* ── Mobile Views Area (`md:hidden`) ── */}
            <div className="md:hidden space-y-3.5">
                
                {/* 1. Mobile Overview Tab */}
                {mobileTab === "overview" && (
                    <div className="space-y-3.5">
                        
                        {/* Placed Highlight Banner (if placed) */}
                        {isPlaced && (
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-md shadow-emerald-500/15">
                                <div className="flex items-center gap-2 text-emerald-100 text-[11px] font-bold uppercase tracking-wider mb-1">
                                    <Sparkles size={14} className="text-yellow-300" />
                                    <span>Congratulations! Placed</span>
                                </div>
                                <h3 className="text-base font-black tracking-tight">{placedInfo.companyName}</h3>
                                <p className="text-xs text-emerald-100 mt-0.5 font-medium">
                                    {placedInfo.jobProfile} · {placedInfo.jobType || "Full-Time"}
                                </p>
                                
                                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-emerald-400/40 text-[11px]">
                                    {placedInfo.location && (
                                        <div className="flex items-center gap-1 text-emerald-50">
                                            <MapPin size={12} />
                                            <span className="truncate">{placedInfo.location}</span>
                                        </div>
                                    )}
                                    {placedInfo.joiningDate && (
                                        <div className="flex items-center gap-1 text-emerald-50">
                                            <Calendar size={12} />
                                            <span>Joining: {formatDate(placedInfo.joiningDate)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Current Stage Highlight Card */}
                        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Placement Stage</span>
                                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                                    Stage {safeIdx + 1} of 4
                                </span>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900">{STEPS[safeIdx].label}</h4>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{STEPS[safeIdx].desc}</p>
                            
                            <button
                                onClick={() => setMobileTab("readiness")}
                                className="mt-3 w-full py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                            >
                                <span>View Full Journey</span>
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        {/* Recent Interviews Snippet */}
                        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-800">Campus Drives & Interviews</span>
                                <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                    {interviews.length} Total
                                </span>
                            </div>

                            {interviews.length === 0 ? (
                                <div className="text-center py-6 text-gray-400 text-xs">
                                    <Building2 size={24} className="mx-auto text-gray-300 mb-1.5" />
                                    <p>No interview records yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {interviews.slice(0, 2).map((rec, i) => (
                                        <div key={rec._id || i} className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                                            <div className="flex items-center justify-between gap-1 mb-1">
                                                <span className="font-bold text-gray-900 truncate">{rec.jobProfile || "Drive"}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${statusBadge(rec.status)}`}>
                                                    {rec.status}
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-gray-400 block">{formatDate(rec.scheduleDate)}</span>
                                        </div>
                                    ))}
                                    {interviews.length > 2 && (
                                        <button
                                            onClick={() => setMobileTab("interviews")}
                                            className="w-full text-center py-1.5 text-xs font-bold text-orange-600 hover:underline"
                                        >
                                            View all {interviews.length} interviews →
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                )}

                {/* 2. Mobile Readiness Journey Tab */}
                {mobileTab === "readiness" && (
                    <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                            <div>
                                <h3 className="text-xs font-bold text-gray-800">Placement Roadmap</h3>
                                <p className="text-[10px] text-gray-400 mt-0.5">Step-by-step readiness milestones</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                                {progressPercent}% Completed
                            </span>
                        </div>

                        <div className="relative space-y-3.5">
                            {/* Vertical connector line */}
                            <div className="absolute left-[13px] top-3 bottom-3 w-0.5 bg-gray-200 -translate-x-1/2 pointer-events-none" />

                            {STEPS.map((step, i) => {
                                const isDone = i < safeIdx;
                                const isActive = i === safeIdx;
                                return (
                                    <div key={step.label} className="relative z-10 flex items-start gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 shrink-0 mt-0.5 transition-all ${
                                            isDone ? "bg-emerald-500 border-emerald-500 text-white shadow-2xs" :
                                            isActive ? "bg-orange-500 border-orange-500 text-white shadow-xs ring-4 ring-orange-100" :
                                            "bg-white border-gray-300 text-gray-400"
                                        }`}>
                                            {isDone ? <Check size={12} /> : i + 1}
                                        </div>
                                        <div className={`flex-1 p-3 rounded-xl border transition-all ${
                                            isActive ? "bg-orange-50/70 border-orange-200" :
                                            isDone ? "bg-emerald-50/40 border-emerald-100" :
                                            "bg-gray-50/50 border-gray-100"
                                        }`}>
                                            <div className="flex items-center justify-between">
                                                <h4 className={`text-xs font-bold ${
                                                    isActive ? "text-orange-700" : isDone ? "text-emerald-800" : "text-gray-500"
                                                }`}>
                                                    {step.label}
                                                </h4>
                                                {isActive && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-700">
                                                        Current
                                                    </span>
                                                )}
                                                {isDone && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700">
                                                        Cleared
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-500 mt-1 leading-snug">{step.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 3. Mobile Interviews Tab */}
                {mobileTab === "interviews" && (
                    <div className="space-y-3">
                        {interviews.length === 0 ? (
                            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
                                <Building2 size={28} className="text-gray-300 mx-auto mb-2" />
                                <h4 className="text-xs font-bold text-gray-700">No interview drives scheduled yet</h4>
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Upcoming interview dates and drive evaluation rounds will show here.
                                </p>
                            </div>
                        ) : (
                            interviews.map((rec, i) => (
                                <div
                                    key={rec._id || i}
                                    className="bg-white rounded-xl border border-gray-200/80 p-3.5 shadow-xs space-y-2.5"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                <Building2 size={16} />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-900">{rec.jobProfile || "Drive"}</h4>
                                                <span className="text-[10px] text-gray-400">{formatDate(rec.scheduleDate)}</span>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge(rec.status)}`}>
                                            {rec.status}
                                        </span>
                                    </div>

                                    {/* Rounds Sublist */}
                                    {rec.rounds?.length > 0 && (
                                        <div className="pt-2 border-t border-gray-100 space-y-1.5">
                                            {rec.rounds.map((round, rIdx) => (
                                                <div key={rIdx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-[11px]">
                                                    <div>
                                                        <span className="font-bold text-gray-800">{round.roundName}</span>
                                                        <span className="text-[10px] text-gray-400 block">{round.mode}</span>
                                                    </div>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${statusBadge(round.result)}`}>
                                                        {round.result}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* 4. Mobile Company Offer Tab */}
                {mobileTab === "company" && isPlaced && (
                    <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-xs space-y-3">
                        <div className="flex items-center gap-2 text-emerald-600 pb-2 border-b border-gray-100">
                            <Sparkles size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Placement Offer Details</span>
                        </div>

                        <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs space-y-2">
                            <div>
                                <span className="text-[10px] text-gray-400 block uppercase font-bold">Company</span>
                                <span className="font-black text-emerald-950 text-sm">{placedInfo.companyName}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 block uppercase font-bold">Role & Profile</span>
                                <span className="font-bold text-gray-800">{placedInfo.jobProfile} ({placedInfo.jobType || "Full Time"})</span>
                            </div>
                            {placedInfo.location && (
                                <div>
                                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Work Location</span>
                                    <span className="font-medium text-gray-700">{placedInfo.location}</span>
                                </div>
                            )}
                            {placedInfo.joiningDate && (
                                <div>
                                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Joining Date</span>
                                    <span className="font-medium text-gray-700">{formatDate(placedInfo.joiningDate)}</span>
                                </div>
                            )}
                            {placedInfo.placedDate && (
                                <div>
                                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Date of Offer</span>
                                    <span className="font-medium text-gray-700">{formatDate(placedInfo.placedDate)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* ── Desktop Two-Column View (`hidden md:grid md:grid-cols-2 gap-5`) ── */}
            <div className="hidden md:grid md:grid-cols-2 gap-5 items-start">
                
                {/* Left Column: Readiness Roadmap & Placed Info */}
                <div className="space-y-5">
                    
                    {/* Readiness Journey Card */}
                    <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-orange-50/20">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                <div>
                                    <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">Placement Readiness</h3>
                                    <p className="text-[11px] text-gray-400">Preparation milestones and interview eligibility</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                Stage {safeIdx + 1} of {STEPS.length}
                            </span>
                        </div>

                        <div className="p-5">
                            <div className="relative space-y-4">
                                {/* Vertical line */}
                                <div className="absolute left-[14px] top-3 bottom-3 w-0.5 bg-gray-200 -translate-x-1/2 pointer-events-none" />

                                {STEPS.map((step, i) => {
                                    const isDone = i < safeIdx;
                                    const isActive = i === safeIdx;
                                    return (
                                        <div key={step.label} className="relative z-10 flex items-start gap-3.5">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 shrink-0 mt-0.5 transition-all ${
                                                isDone ? "bg-emerald-500 border-emerald-500 text-white shadow-2xs" :
                                                isActive ? "bg-orange-500 border-orange-500 text-white shadow-xs ring-4 ring-orange-100" :
                                                "bg-white border-gray-300 text-gray-400"
                                            }`}>
                                                {isDone ? <Check size={14} /> : i + 1}
                                            </div>
                                            <div className={`flex-1 p-3.5 rounded-xl border transition-all ${
                                                isActive ? "bg-orange-50/70 border-orange-200 shadow-2xs" :
                                                isDone ? "bg-emerald-50/40 border-emerald-100" :
                                                "bg-gray-50/50 border-gray-100"
                                            }`}>
                                                <div className="flex items-center justify-between">
                                                    <h4 className={`text-xs font-bold ${
                                                        isActive ? "text-orange-700" : isDone ? "text-emerald-800" : "text-gray-500"
                                                    }`}>
                                                        {step.label}
                                                    </h4>
                                                    {isActive && (
                                                        <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-orange-100 text-orange-700">
                                                            Current Stage
                                                        </span>
                                                    )}
                                                    {isDone && (
                                                        <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-700">
                                                            Cleared
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1 leading-snug">{step.desc}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Placed Card (if placed) */}
                    {isPlaced && (
                        <div className="bg-white border border-emerald-100 rounded-2xl shadow-xs overflow-hidden">
                            <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
                            <div className="p-5">
                                <div className="flex items-center gap-3 mb-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                        <Briefcase size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-black text-emerald-900">{placedInfo.companyName}</span>
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-700">
                                                PLACED
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">{placedInfo.jobProfile} · {placedInfo.jobType || "Full-Time"}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-xs">
                                    {placedInfo.location && (
                                        <div className="flex items-center gap-1.5 text-gray-600">
                                            <MapPin size={13} className="text-gray-400 shrink-0" />
                                            <span className="truncate">{placedInfo.location}</span>
                                        </div>
                                    )}
                                    {placedInfo.joiningDate && (
                                        <div className="flex items-center gap-1.5 text-gray-600">
                                            <Calendar size={13} className="text-gray-400 shrink-0" />
                                            <span>Joining: {formatDate(placedInfo.joiningDate)}</span>
                                        </div>
                                    )}
                                    {placedInfo.placedDate && (
                                        <div className="flex items-center gap-1.5 text-gray-600">
                                            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                            <span>Offer: {formatDate(placedInfo.placedDate)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Right Column: Campus Drives & Interview History */}
                <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-blue-50/20">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                            <div>
                                <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">Interview Drives</h3>
                                <p className="text-[11px] text-gray-400">Scheduled campus visits, rounds & results</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            {interviews.length}
                        </span>
                    </div>

                    <div className="p-4">
                        {interviews.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-300 flex items-center justify-center mb-2.5">
                                    <Building2 size={24} />
                                </div>
                                <h4 className="text-xs font-bold text-gray-700">No interview history yet</h4>
                                <p className="text-[11px] text-gray-400 mt-0.5 max-w-xs leading-relaxed">
                                    As company drives are scheduled for your department, interview schedules and feedback rounds will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                                {interviews.map((rec, i) => (
                                    <div
                                        key={rec._id || i}
                                        className="bg-white rounded-xl border border-gray-200/70 p-3.5 shadow-xs hover:border-orange-200 transition-all duration-150 space-y-2.5"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Building2 size={16} />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-900">{rec.jobProfile || "Company Drive"}</h4>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                                                        <Clock size={11} />
                                                        <span>{formatDate(rec.scheduleDate)}</span>
                                                        {rec.rescheduleDate && (
                                                            <span className="text-orange-500">· Rescheduled {formatDate(rec.rescheduleDate)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusBadge(rec.status)}`}>
                                                {rec.status}
                                            </span>
                                        </div>

                                        {/* Rounds */}
                                        {rec.rounds?.length > 0 && (
                                            <div className="pt-2 border-t border-gray-100 space-y-1.5">
                                                {rec.rounds.map((round, rIdx) => (
                                                    <div key={rIdx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-xs">
                                                        <div>
                                                            <span className="font-bold text-gray-700">{round.roundName}</span>
                                                            <span className="text-[10px] text-gray-400 block">{formatDate(round.date)} · {round.mode}</span>
                                                        </div>
                                                        <span className={`text-[9px] font-bold px-2 py-0.2 rounded-full ${statusBadge(round.result)}`}>
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
