import { useState } from "react";
import {
  Compass,
  Target,
  CheckCircle2,
  Clock,
  Printer,
  MessageSquare,
  Users,
  Flame,
  Rocket,
  ChevronDown,
  ChevronUp,
  Zap,
  BrainCircuit,
  Award,
  Sparkles,
} from "lucide-react";
import { toast } from "react-toastify";

export default function AIThesisOverview({
  assessment,
  studentContext = {},
  isFacultyView = false,
  onOpenMentorFeedbackModal,
  onUpdateFacultyAction,
}) {
  const [activeTab, setActiveTab] = useState("passions"); // "passions" | "vision" | "careers" | "faculty"
  const [expandedExperiment, setExpandedExperiment] = useState(0);

  const scores = assessment?.alignmentScores || {};
  const overallScore = scores.overall || 78;

  const handleToggleActionStatus = async (actionId, currentStatus) => {
    if (!onUpdateFacultyAction) return;
    const nextStatus =
      currentStatus === "Not Started"
        ? "In Progress"
        : currentStatus === "In Progress"
        ? "Completed"
        : "Not Started";

    try {
      await onUpdateFacultyAction({ actionId, status: nextStatus });
      toast.success(`Action marked as ${nextStatus}`);
    } catch {
      toast.error("Failed to update action status");
    }
  };

  const archetype =
    assessment?.archetype?.primaryPattern && assessment.archetype.primaryPattern !== "To be discovered"
      ? assessment.archetype
      : {
          primaryPattern: "Problem Solver",
          secondaryPattern: "Builder",
          description: "Synthesized developmental profile based on student passions & core values.",
        };

  const topPassions = assessment?.topPassions || [];
  const careerDirections = assessment?.careerDirections || [];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ── Executive Snapshot Card (Deep Luxury Briefing Card) ── */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left Student Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 bg-orange-400/10 px-2.5 py-0.5 rounded-full border border-orange-400/20">
                AI Developmental Thesis
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                Version {assessment?.assessmentVersion || 1} • {assessment?.status === "finalized" ? "Finalized" : "Active"}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {studentContext.name || "Student"}
            </h3>

            <p className="text-xs text-slate-300 font-medium">
              {studentContext.course || "Degree"} • {studentContext.year || "Year 1"} • Level: {studentContext.currentLevel || "Level 1"}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-xl bg-white/10 text-orange-300 font-bold text-xs border border-white/15 flex items-center gap-1.5 backdrop-blur-xs">
                <BrainCircuit size={14} />
                <span>Archetype: {archetype.primaryPattern} / {archetype.secondaryPattern}</span>
              </span>
            </div>
          </div>

          {/* Right Highlights Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0">
            {/* 1. Overall Alignment */}
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 border border-orange-400/30">
                <Award size={20} />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Overall Alignment
                </span>
                <span className="text-base font-black text-white block">
                  {overallScore}%
                </span>
              </div>
            </div>

            {/* 2. Top Passion */}
            {topPassions[0] && (
              <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/30">
                  <Flame size={20} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    #1 Top Passion
                  </span>
                  <span className="text-xs font-black text-white truncate max-w-[130px] block" title={topPassions[0].name}>
                    {topPassions[0].name}
                  </span>
                </div>
              </div>
            )}

            {/* 3. Top Career Match */}
            {careerDirections[0] && (
              <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-400/30">
                  <Rocket size={20} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Top Career Match
                  </span>
                  <span className="text-xs font-black text-emerald-300 truncate max-w-[130px] block" title={careerDirections[0].title}>
                    {careerDirections[0].title}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Segmented Navigation Tabs ── */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("passions")}
          className={`flex-1 min-w-[140px] py-2.5 px-3.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "passions"
              ? "bg-white text-slate-900 shadow-xs font-black ring-1 ring-slate-900/5"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold"
          }`}
        >
          <Flame size={15} className={activeTab === "passions" ? "text-orange-500" : "text-slate-400"} />
          <span>Passions & Values</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("vision")}
          className={`flex-1 min-w-[140px] py-2.5 px-3.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "vision"
              ? "bg-white text-slate-900 shadow-xs font-black ring-1 ring-slate-900/5"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold"
          }`}
        >
          <Target size={15} className={activeTab === "vision" ? "text-indigo-600" : "text-slate-400"} />
          <span>Purpose & Vision</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("careers")}
          className={`flex-1 min-w-[140px] py-2.5 px-3.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "careers"
              ? "bg-white text-slate-900 shadow-xs font-black ring-1 ring-slate-900/5"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold"
          }`}
        >
          <Rocket size={15} className={activeTab === "careers" ? "text-emerald-600" : "text-slate-400"} />
          <span>Career Directions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("faculty")}
          className={`flex-1 min-w-[140px] py-2.5 px-3.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "faculty"
              ? "bg-white text-slate-900 shadow-xs font-black ring-1 ring-slate-900/5"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold"
          }`}
        >
          <Users size={15} className={activeTab === "faculty" ? "text-purple-600" : "text-slate-400"} />
          <span>{isFacultyView ? "Faculty Review" : "Faculty & Mentorship"}</span>
          {(assessment?.facultyFeedback?.length > 0 || assessment?.facultyInterventions?.length > 0) && (
            <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
          )}
        </button>
      </div>

      {/* ── TAB 1: PASSIONS & VALUES ── */}
      {activeTab === "passions" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Top 5 Passions with Expression Gaps */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">
                  Priority Discovery
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Ranked Passions & Expression Gaps
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                {topPassions.length} Ranked Passions
              </span>
            </div>

            <div className="space-y-3">
              {topPassions.map((passion, idx) => {
                const importance = Number(passion.selfRatedImportance) || 8;
                const current = Number(passion.currentScore) || 5;
                const gap =
                  typeof passion.passionGap === "number"
                    ? passion.passionGap
                    : Math.max(0, importance - current);

                return (
                  <div
                    key={passion.name}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-orange-300 transition shadow-2xs space-y-3.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-orange-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          #{idx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">{passion.name}</h4>
                          {passion.originalStatement && (
                            <p className="text-[11px] text-slate-500 italic mt-0.5">
                              {passion.originalStatement}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Gap Badge */}
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black self-start sm:self-auto border ${
                          gap >= 4
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : gap >= 2
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        Gap: {gap} pts {gap >= 4 ? "(Needs Focus)" : gap >= 2 ? "(Moderate)" : "(Balanced)"}
                      </span>
                    </div>

                    {/* Progress Metrics Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-slate-600">Self-Rated Importance:</span>
                          <span className="font-black text-orange-600">{importance}/10</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${importance * 10}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-slate-600">Current Time & Living:</span>
                          <span className="font-black text-indigo-600">{current}/10</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${current * 10}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Measurable Target / Marker */}
                    {passion.markers?.[0] && (
                      <div className="text-xs bg-orange-50/60 p-3 rounded-xl border border-orange-200/60 flex items-center gap-2 text-slate-700">
                        <Target size={15} className="text-orange-600 shrink-0" />
                        <span>
                          <strong>Weekly Action Marker:</strong> {passion.markers[0]}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Core Values */}
          {assessment?.coreValues?.length > 0 && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">
                Guiding Principles
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Guiding Core Values
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {assessment.coreValues.map((val, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/80 space-y-1"
                  >
                    <span className="text-xs font-black text-indigo-800 block">{val.name}</span>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      {val.reason || "Core guiding value for career decisions."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: PURPOSE & VISION ── */}
      {activeTab === "vision" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Core Purpose Statement Card */}
          <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white rounded-3xl p-6 sm:p-8 shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/90 bg-white/20 px-3 py-1 rounded-full backdrop-blur-xs">
                Core Purpose Statement
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-100 bg-black/20 px-2.5 py-0.5 rounded-full">
                ✨ AI Synthesized
              </span>
            </div>

            <p className="text-base sm:text-lg font-black leading-relaxed text-white">
              "{assessment?.purposeStatement || "Complete your test to generate your purpose statement."}"
            </p>
          </div>

          {/* 5-Year & 10-Year Goals & BHAG */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 5-Year */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                5-Year Horizon
              </span>
              <h4 className="text-sm font-black text-slate-900">Professional Goal</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {assessment?.fiveYearGoal || "Defined through your Vision test."}
              </p>
            </div>

            {/* 10-Year */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
                10-Year Horizon
              </span>
              <h4 className="text-sm font-black text-slate-900">Long-Term Impact</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {assessment?.tenYearGoal || "Assume domain leadership, build impactful solutions, and mentor future peers."}
              </p>
            </div>

            {/* BHAG */}
            <div className="bg-gradient-to-b from-amber-50 to-white rounded-3xl p-5 border border-amber-200 shadow-2xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit">
                <Zap size={12} /> Big Ambitious Goal (BHAG)
              </span>
              <h4 className="text-sm font-black text-amber-950">Milestone of Pride</h4>
              <p className="text-xs text-amber-900 font-semibold leading-relaxed">
                "{assessment?.bhag || "Set your big milestone of pride in the Vision test."}"
              </p>
            </div>
          </div>

          {/* Student Commitment Note */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-orange-500" />
                <span>My Next Commitment: What I Commit to Doing Now</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                Derived from Highest Passion Gap
              </span>
            </div>

            <p className="text-xs text-slate-700 font-medium bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
              "{assessment?.studentCommitment || "Complete your test to unlock your immediate commitment."}"
            </p>
          </div>
        </div>
      )}

      {/* ── TAB 3: CAREER DIRECTIONS & EXPERIMENTS ── */}
      {activeTab === "careers" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {careerDirections.map((cd, idx) => {
            const isExpanded = expandedExperiment === idx;
            const exp = cd.careerExperiment || {};

            return (
              <div
                key={idx}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4 hover:border-emerald-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-base font-black text-slate-900">{cd.title}</h4>
                      <p className="text-xs text-slate-500">{cd.whyItFits}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedExperiment(isExpanded ? null : idx)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                  >
                    <span>14-Day Discovery Experiment</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* Supporting Evidence Chips */}
                {cd.supportingEvidence?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cd.supportingEvidence.map((ev, eIdx) => (
                      <span
                        key={eIdx}
                        className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600"
                      >
                        ✓ {ev}
                      </span>
                    ))}
                  </div>
                )}

                {/* Expandable 14-Day Micro-Experiment Sprint */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100/60">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                        Week 1: Research & Outline
                      </span>
                      <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4 font-medium">
                        {(exp.week1 || [
                          `Select one real-world project challenge in ${cd.title}.`,
                          "Research 2 industry references and outline an initial approach.",
                          "Review proposal with peers or faculty mentor.",
                        ]).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                        Week 2: Execution & Reflection
                      </span>
                      <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4 font-medium">
                        {(exp.week2 || [
                          "Implement basic working prototype or draft case study.",
                          "Present deliverable to 2 peers for direct critique.",
                          "Reflect: Did this problem energize or drain your focus?",
                        ]).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 4: FACULTY REVIEW & MENTORSHIP GUIDANCE ── */}
      {activeTab === "faculty" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Section 1: Faculty Observations & Mentoring Comments */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">
                      Mentor Observations & Guidance
                    </h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60">
                      {assessment?.facultyFeedback?.length || 0} Notes Recorded
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Constructive faculty notes, strengths noticed, and developmental direction
                  </p>
                </div>
              </div>

              {isFacultyView && onOpenMentorFeedbackModal && (
                <button
                  type="button"
                  onClick={onOpenMentorFeedbackModal}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  <MessageSquare size={13} />
                  <span>+ Add Feedback</span>
                </button>
              )}
            </div>

            {/* List of Feedback Notes */}
            {assessment?.facultyFeedback?.length > 0 ? (
              <div className="space-y-3">
                {assessment.facultyFeedback.map((fb, idx) => (
                  <div
                    key={fb._id || idx}
                    className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/30 border border-purple-100 shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100/60 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {(fb.facultyName || "F")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">
                              {fb.facultyName || "Faculty Mentor"}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                              {fb.facultyRole || "Faculty"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[11px] font-semibold text-slate-400">
                        {new Date(fb.createdAt || Date.now()).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Mentor Comment Quote */}
                    <div className="bg-white/80 p-3.5 rounded-xl border border-purple-100/80 text-xs text-slate-800 font-medium leading-relaxed italic">
                      "{fb.comment}"
                    </div>

                    {/* Recommended Actions */}
                    {fb.recommendedActions?.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-black uppercase tracking-wider text-purple-900 block">
                          Recommended Actions:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {fb.recommendedActions.map((act, aIdx) => (
                            <span
                              key={aIdx}
                              className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-purple-100/80 text-purple-900 border border-purple-200/60 flex items-center gap-1.5"
                            >
                              <CheckCircle2 size={12} className="text-purple-600 shrink-0" />
                              <span>{act}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                  <MessageSquare size={18} />
                </div>
                <h4 className="text-xs sm:text-sm font-black text-slate-800">
                  No Mentor Feedback Notes Recorded Yet
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                  {isFacultyView
                    ? "As a mentor or faculty, you can click '+ Add Feedback' above to guide this student's learning and career roadmap."
                    : "Your assigned mentor or faculty will provide personalized observations and recommendations here."}
                </p>
                {isFacultyView && onOpenMentorFeedbackModal && (
                  <button
                    type="button"
                    onClick={onOpenMentorFeedbackModal}
                    className="mt-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition cursor-pointer"
                  >
                    + Add First Observation
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Faculty Intervention Actions & Milestones */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <Target size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Targeted Faculty Interventions & Actions
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Developmental milestones assigned to bridge key skill and career gaps
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                {(assessment?.facultyInterventions?.length || 4)} Milestones
              </span>
            </div>

            <div className="space-y-3">
              {(
                (assessment?.facultyInterventions?.length > 0 && assessment.facultyInterventions) || [
                  {
                    actionId: "act-1",
                    title: `Assign Domain Mentor for ${careerDirections[0]?.title || "Software Engineering"}`,
                    category: "Mentorship",
                    status: "Not Started",
                    notes: "Connect student with senior faculty or industry mentor for career direction guidance.",
                  },
                  {
                    actionId: "act-2",
                    title: "Recommend Practical Capstone Project Mentorship",
                    category: "Project",
                    status: "Not Started",
                    notes: "Assign end-to-end capstone project to bridge theoretical knowledge into demonstrable portfolio.",
                  },
                  {
                    actionId: "act-3",
                    title: "Weekly Technical Presentation & Communication Practice",
                    category: "Communication",
                    status: "In Progress",
                    notes: "Encourage student to deliver 5-minute verbal summaries during seminar hours.",
                  },
                  {
                    actionId: "act-4",
                    title: "Mock Interview & Aptitude Readiness Review",
                    category: "Interview",
                    status: "Not Started",
                    notes: "Conduct diagnostic mock technical and HR interview round.",
                  },
                ]
              ).map((act, aIdx) => {
                const actId = act.actionId || act._id || `act-${aIdx}`;
                const title = act.title || act.actionTitle || "Developmental Action";
                const category = act.category || act.actionType || "Mentorship";
                const status = act.status || "Not Started";
                const notes = act.notes || "";

                const categoryColorMap = {
                  Mentorship: "bg-indigo-50 text-indigo-700 border-indigo-200",
                  Project: "bg-orange-50 text-orange-700 border-orange-200",
                  Communication: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  Interview: "bg-purple-50 text-purple-700 border-purple-200",
                  "Mentor Recommendation": "bg-amber-50 text-amber-800 border-amber-200",
                };

                const categoryClass = categoryColorMap[category] || "bg-slate-100 text-slate-700 border-slate-200";

                return (
                  <div
                    key={actId}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-indigo-300 transition shadow-2xs space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-start sm:items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          #{aIdx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-black text-slate-900">{title}</h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${categoryClass}`}>
                              {category}
                            </span>
                          </div>
                          {notes && (
                            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                              {notes}
                            </p>
                          )}
                          {act.facultyName && (
                            <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                              Assigned by: {act.facultyName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Toggle Button / Badge */}
                      {isFacultyView ? (
                        <button
                          type="button"
                          onClick={() => handleToggleActionStatus(actId, status)}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer self-start sm:self-auto shadow-2xs active:scale-95 border flex items-center gap-1.5 shrink-0 ${
                            status === "Completed"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                              : status === "In Progress"
                              ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                          title="Click to cycle status (Not Started → In Progress → Completed)"
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              status === "Completed"
                                ? "bg-emerald-500"
                                : status === "In Progress"
                                ? "bg-amber-500 animate-pulse"
                                : "bg-slate-400"
                            }`}
                          />
                          <span>{status}</span>
                          <span className="text-[10px] opacity-60">↻</span>
                        </button>
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-xl font-black text-xs border flex items-center gap-1.5 self-start sm:self-auto shrink-0 ${
                            status === "Completed"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : status === "In Progress"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              status === "Completed"
                                ? "bg-emerald-500"
                                : status === "In Progress"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            }`}
                          />
                          <span>{status}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
