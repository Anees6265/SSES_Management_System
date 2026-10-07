import { useState } from "react";
import {
  Compass, Target, CheckCircle2, Clock, Edit3, RefreshCw, Printer,
  MessageSquare, Users, Flame, Rocket, ChevronDown, ChevronUp, Zap, BrainCircuit
} from "lucide-react";
import { toast } from "react-toastify";

export default function AIThesisOverview({
  assessment,
  studentContext,
  isFacultyView = false,
  onUpdateStatements,
  onStartNewVersion,
  onOpenEvolutionModal,
  onOpenMentorFeedbackModal,
  onPrintReport,
  onUpdateFacultyAction,
}) {
  const [activeTab, setActiveTab] = useState("passions"); // "passions" | "vision" | "careers" | "faculty"

  const [editingPurpose, setEditingPurpose] = useState(false);
  const [purposeDraft, setPurposeDraft] = useState(assessment?.purposeStatement || "");

  const [editingVision, setEditingVision] = useState(false);
  const [visionDraft, setVisionDraft] = useState(assessment?.visionStatement || "");

  const [editingReflection, setEditingReflection] = useState(false);
  const [reflectionDraft, setReflectionDraft] = useState(assessment?.studentReflection || "");
  const [commitmentDraft, setCommitmentDraft] = useState(assessment?.studentCommitment || "");

  const [expandedExperiment, setExpandedExperiment] = useState(0);
  const [savingStatements, setSavingStatements] = useState(false);

  const scores = assessment?.alignmentScores || {};
  const overallScore = scores.overall || 80;

  const handleSavePurpose = async () => {
    setSavingStatements(true);
    try {
      await onUpdateStatements({
        purposeStatement: purposeDraft,
        isPurposeAccepted: true,
      });
      setEditingPurpose(false);
      toast.success("Purpose statement updated and accepted!");
    } catch {
      toast.error("Failed to update purpose statement");
    } finally {
      setSavingStatements(false);
    }
  };

  const handleSaveVision = async () => {
    setSavingStatements(true);
    try {
      await onUpdateStatements({
        visionStatement: visionDraft,
        isVisionAccepted: true,
      });
      setEditingVision(false);
      toast.success("Vision statement updated and accepted!");
    } catch {
      toast.error("Failed to update vision statement");
    } finally {
      setSavingStatements(false);
    }
  };

  const handleSaveReflection = async () => {
    setSavingStatements(true);
    try {
      await onUpdateStatements({
        studentReflection: reflectionDraft,
        studentCommitment: commitmentDraft,
      });
      setEditingReflection(false);
      toast.success("Commitment & reflection saved successfully!");
    } catch {
      toast.error("Failed to save reflection");
    } finally {
      setSavingStatements(false);
    }
  };

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

  const archetype = assessment?.archetype || {
    primaryPattern: "Problem Solver",
    secondaryPattern: "Builder",
    description: "You possess a strong analytical problem-solving foundation, translating ideas into working solutions.",
    disclaimer: "This is an AI-generated development pattern, not a psychological diagnosis or permanent personality type.",
  };

  const topPassions = assessment?.topPassions || [];
  const careerDirections = assessment?.careerDirections || [];

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-200">
      {/* ── Top Bar / Action Controls ── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-sm">
            <Compass size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Passion & Vision Thesis
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-extrabold text-[11px]">
                Version {assessment?.assessmentVersion || 1}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                {assessment?.status === "finalized" ? "Finalized" : "Active Thesis"}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Personal discovery, career experiments & developmental intelligence
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenEvolutionModal && (
            <button
              type="button"
              onClick={onOpenEvolutionModal}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <Clock size={14} className="text-indigo-600" />
              <span>Version Evolution</span>
            </button>
          )}

          {onPrintReport && (
            <button
              type="button"
              onClick={onPrintReport}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <Printer size={14} className="text-slate-600" />
              <span>Export PDF</span>
            </button>
          )}

          {isFacultyView && onOpenMentorFeedbackModal && (
            <button
              type="button"
              onClick={onOpenMentorFeedbackModal}
              className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-orange-500/20"
            >
              <MessageSquare size={14} />
              <span>Add Feedback</span>
            </button>
          )}

          {!isFacultyView && onStartNewVersion && (
            <button
              type="button"
              onClick={onStartNewVersion}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw size={13} />
              <span>New Version</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Executive Snapshot Card (Digestible At-a-Glance) ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">
              Student Purpose & Vision
            </span>
            <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
              {studentContext.name || "Student"}
            </h3>
            <p className="text-xs text-slate-300 font-medium">
              {studentContext.course} • {studentContext.year} • Level: {studentContext.currentLevel}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-xl bg-white/10 text-orange-300 font-bold text-xs border border-white/15 flex items-center gap-1.5">
                <BrainCircuit size={13} />
                Archetype: {archetype.primaryPattern} / {archetype.secondaryPattern}
              </span>
            </div>
          </div>

          {/* Quick 2-Pill Focus Highlights */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            {topPassions[0] && (
              <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-white/15 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/30 text-orange-400 flex items-center justify-center shrink-0">
                  <Flame size={16} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Top Passion</span>
                  <span className="text-xs font-black text-white truncate max-w-[160px] block">
                    {topPassions[0].name}
                  </span>
                </div>
              </div>
            )}

            {careerDirections[0] && (
              <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-white/15 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <Rocket size={16} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Top Match</span>
                  <span className="text-xs font-black text-emerald-300 truncate max-w-[160px] block">
                    {careerDirections[0].title}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section Navigation Tabs (3 Clean Tabs) ── */}
      <div className="bg-white p-1.5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xs flex flex-wrap gap-1 text-xs font-bold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("passions")}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === "passions"
              ? "bg-orange-500 text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Flame size={15} />
          <span>Passions & Values</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("vision")}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === "vision"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Target size={15} />
          <span>Purpose & Vision</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("careers")}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === "careers"
              ? "bg-emerald-600 text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Rocket size={15} />
          <span>Career Directions</span>
        </button>

        {isFacultyView && (
          <button
            type="button"
            onClick={() => setActiveTab("faculty")}
            className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === "faculty"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Users size={15} />
            <span>Faculty Review</span>
          </button>
        )}
      </div>

      {/* ── TAB 1: PASSIONS & VALUES ── */}
      {activeTab === "passions" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Top 5 Passions with calculated Gaps */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">
                  Priority Discovery
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  My Top 5 Passions & Expression Gaps
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {topPassions.length} Ranked Passions
              </span>
            </div>

            <div className="space-y-3">
              {topPassions.map((passion, idx) => {
                const importance = Number(passion.selfRatedImportance) || 8;
                const current = Number(passion.currentScore) || 5;
                const gap = typeof passion.passionGap === "number" ? passion.passionGap : Math.max(0, importance - current);

                return (
                  <div
                    key={passion.name}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-orange-200 transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-orange-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <h4 className="text-sm font-black text-slate-900">{passion.name}</h4>
                      </div>

                      {/* Gap Badge */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[11px] font-bold text-slate-400">
                          Importance: <strong className="text-slate-700">{importance}/10</strong> • Living: <strong className="text-slate-700">{current}/10</strong>
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                            gap >= 4
                              ? "bg-rose-100 text-rose-700"
                              : gap >= 2
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          Gap: {gap} pts
                        </span>
                      </div>
                    </div>

                    {/* Marker */}
                    {passion.markers?.[0] && (
                      <div className="text-xs bg-white p-2.5 rounded-xl border border-slate-100 flex items-center gap-2 text-slate-600">
                        <Target size={14} className="text-orange-500 shrink-0" />
                        <span><strong>Measurable Marker:</strong> {passion.markers[0]}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Core Values */}
          {assessment?.coreValues?.length > 0 && (
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">
                Guiding Principles
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                My Core Values
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {assessment.coreValues.map((val, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/80 space-y-1">
                    <span className="text-xs font-black text-indigo-700 block">{val.name}</span>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      {val.reason || "Guides my daily work and decisions."}
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
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Purpose Statement Card */}
          <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/80 bg-white/20 px-3 py-1 rounded-full">
                Core Purpose Statement
              </span>
              {!isFacultyView && (
                <button
                  type="button"
                  onClick={() => setEditingPurpose(p => !p)}
                  className="px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Edit3 size={13} />
                  <span>{editingPurpose ? "Cancel" : "Edit Statement"}</span>
                </button>
              )}
            </div>

            {editingPurpose ? (
              <div className="space-y-3">
                <textarea
                  rows={3}
                  value={purposeDraft}
                  onChange={e => setPurposeDraft(e.target.value)}
                  className="w-full bg-white text-slate-900 rounded-2xl p-4 text-sm font-semibold focus:outline-none"
                />
                <button
                  type="button"
                  disabled={savingStatements}
                  onClick={handleSavePurpose}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  Save Purpose
                </button>
              </div>
            ) : (
              <p className="text-base sm:text-lg font-bold leading-relaxed">
                "{assessment?.purposeStatement || "To apply problem-solving and technology to build useful solutions that elevate community well-being."}"
              </p>
            )}
          </div>

          {/* 5-Year & 10-Year Goals & BHAG */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 5-Year */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                5-Year Horizon
              </span>
              <h4 className="text-sm font-black text-slate-900">Professional Goal</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {assessment?.fiveYearGoal || "Master specialized capabilities and establish strong domain leadership."}
              </p>
            </div>

            {/* 10-Year */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
                10-Year Horizon
              </span>
              <h4 className="text-sm font-black text-slate-900">Long-Term Impact</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {assessment?.tenYearGoal || "Assume transformative leadership, mentoring upcoming generations and building sustainable value."}
              </p>
            </div>

            {/* BHAG */}
            <div className="bg-gradient-to-b from-amber-50 to-white rounded-3xl p-5 border border-amber-200 shadow-xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit">
                <Zap size={12} /> Big Ambitious Goal (BHAG)
              </span>
              <h4 className="text-sm font-black text-amber-950">Milestone of Pride</h4>
              <p className="text-xs text-amber-900 font-semibold leading-relaxed">
                "{assessment?.bhag || "Empower 50,000+ individuals through transformative innovative solutions."}"
              </p>
            </div>
          </div>

          {/* Student Commitment Note */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-orange-500" />
                My Next Commitment: What I Commit to Doing Now
              </span>
              {!isFacultyView && (
                <button
                  type="button"
                  onClick={() => setEditingReflection(p => !p)}
                  className="text-xs font-bold text-orange-600 hover:underline"
                >
                  {editingReflection ? "Cancel" : "Edit Commitment"}
                </button>
              )}
            </div>

            {editingReflection ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={commitmentDraft}
                  onChange={e => setCommitmentDraft(e.target.value)}
                  placeholder="What is your immediate next commitment?"
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:outline-none"
                />
                <button
                  type="button"
                  disabled={savingStatements}
                  onClick={handleSaveReflection}
                  className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Save Commitment
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-700 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                "{assessment?.studentCommitment || "Dedicate 5 hours every week to practical portfolio project building and deliberate practice."}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: CAREER DIRECTIONS & EXPERIMENTS ── */}
      {activeTab === "careers" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="space-y-4">
            {careerDirections.map((cd, idx) => {
              const isExpanded = expandedExperiment === idx;
              const exp = cd.careerExperiment || {};

              return (
                <div
                  key={idx}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4 hover:border-emerald-300 transition"
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
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition flex items-center gap-1 self-start sm:self-auto"
                    >
                      <span>14-Day Experiment</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* Supporting Evidence Chips */}
                  {cd.supportingEvidence?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {cd.supportingEvidence.map((ev, eIdx) => (
                        <span key={eIdx} className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                          ✓ {ev}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expandable 14-Day Practical Experiment Sprint */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 bg-emerald-50/40 p-4 rounded-2xl border">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                          Week 1: Research & Outline
                        </span>
                        <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4 font-medium">
                          {(exp.week1 || [
                            `Select one real-world challenge aligned with ${cd.title}.`,
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
        </div>
      )}

      {/* ── TAB 5: FACULTY REVIEW (Only visible if isFacultyView) ── */}
      {activeTab === "faculty" && isFacultyView && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Intervention Management
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Recommended Faculty Actions
            </h3>

            <div className="space-y-3">
              {(assessment?.facultyInterventions || [
                { _id: "1", actionType: "Project Mentorship", actionTitle: "Assign Project Mentor for Applied Capstone", status: "Not Started" },
                { _id: "2", actionType: "Communication Practice", actionTitle: "Schedule Technical Presentation / Mock Interview", status: "In Progress" },
                { _id: "3", actionType: "Skill Development", actionTitle: "Track Weekly DSA / Logic Problem Practice", status: "Not Started" },
              ]).map(act => (
                <div
                  key={act._id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">{act.actionTitle}</span>
                    <span className="text-[11px] text-slate-400">{act.actionType}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleActionStatus(act._id, act.status)}
                    className={`px-3 py-1 rounded-xl font-black text-xs transition ${
                      act.status === "Completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : act.status === "In Progress"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {act.status} ↻
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
