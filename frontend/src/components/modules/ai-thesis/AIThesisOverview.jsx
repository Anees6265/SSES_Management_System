import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Edit3,
  Save,
  X,
  ExternalLink,
  User,
  LayoutDashboard,
  Layers,
  BookOpen,
  ArrowRight,
  Info,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";

export default function AIThesisOverview({
  assessment,
  studentContext = {},
  isFacultyView = false,
  onOpenMentorFeedbackModal,
  onUpdateFacultyAction,
  onUpdateStatements,
  onStartDiscovery,
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("passions"); // "passions" | "vision" | "evidence" | "careers" | "faculty"
  const [expandedExperiment, setExpandedExperiment] = useState(0);

  // Editable purpose & vision state
  const [isEditingStatements, setIsEditingStatements] = useState(false);
  const [isSavingStatements, setIsSavingStatements] = useState(false);
  const [editPurpose, setEditPurpose] = useState(
    assessment?.confirmedPurpose || assessment?.purposeStatement || ""
  );
  const [editVision, setEditVision] = useState(
    assessment?.confirmedVision || assessment?.visionStatement || ""
  );
  const [edit5Year, setEdit5Year] = useState(assessment?.fiveYearGoal || "");
  const [editBhag, setEditBhag] = useState(assessment?.bhag || "");

  // Sync edits when assessment updates
  useEffect(() => {
    setEditPurpose(assessment?.confirmedPurpose || assessment?.purposeStatement || "");
    setEditVision(assessment?.confirmedVision || assessment?.visionStatement || "");
    setEdit5Year(assessment?.fiveYearGoal || "");
    setEditBhag(assessment?.bhag || "");
  }, [assessment]);

  const [showIndicatorFormulas, setShowIndicatorFormulas] = useState(false);

  // Extract development indicators & alignment scores
  const indicators = assessment?.developmentIndicators || {};
  const scores = assessment?.alignmentScores || {};
  const overallScore = indicators.overallIndex?.score ?? scores.overall ?? 78;

  // Extract evidence validation
  const evidenceValidation = assessment?.evidenceValidation || {};
  const isEvidenceVerified = evidenceValidation?.validationStatus === "Verified";

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

  const handleSaveStatementEdits = async () => {
    if (!onUpdateStatements) return;
    setIsSavingStatements(true);
    try {
      await onUpdateStatements({
        purposeStatement: editPurpose,
        visionStatement: editVision,
        fiveYearGoal: edit5Year,
        bhag: editBhag,
      });
      setIsEditingStatements(false);
      toast.success("Statements updated & confirmed successfully!");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save statement updates");
    } finally {
      setIsSavingStatements(false);
    }
  };

  const archetype =
    assessment?.archetype?.primaryPattern &&
    assessment.archetype.primaryPattern !== "To be discovered"
      ? assessment.archetype
      : {
          primaryPattern: "Problem Solver",
          secondaryPattern: "Builder",
          description:
            "Synthesized developmental profile based on student passions & core values.",
        };

  const topPassions = assessment?.topPassions || [];
  const careerDirections = assessment?.careerDirections || [];
  const discoveryState = assessment?.discoveryState || {};
  const explicitlyStated = discoveryState.explicitlyStated || [];
  const inferredPatterns = discoveryState.inferredPatterns || [];
  const openUncertainties = discoveryState.openUncertainties || [];
  const purposeWhys = discoveryState.purposeWhys || [];
  const understandMyself = assessment?.understandMyself || {};
  const recurringPatterns = assessment?.recurringPatterns || [];
  const visionExercises = assessment?.visionExercises || {};
  const detailedRoadmap = assessment?.detailedRoadmap || {};
  const practicalExperiments = assessment?.practicalExperiments || [];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ── Executive Snapshot Card (Deep Luxury Briefing Card) ── */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left Student Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 bg-orange-400/10 px-2.5 py-0.5 rounded-full border border-orange-400/20">
                AI Developmental Thesis
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                Version {assessment?.assessmentVersion || 1} •{" "}
                {assessment?.status === "finalized" ? "Finalized" : "Active"}
              </span>

              {/* Evidence Validation Status Badge */}
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                  isEvidenceVerified
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                }`}
                title="Institutional Evidence Reconciliation Status"
              >
                <ShieldCheck size={11} />
                <span>
                  {isEvidenceVerified
                    ? "Evidence Verified"
                    : evidenceValidation.validationStatus || "Evidence Reconciled"}
                </span>
              </span>

              {assessment?.confirmedPurpose && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1">
                  <CheckCircle2 size={10} />
                  <span>Student Confirmed</span>
                </span>
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {studentContext.name || "Student"}
            </h3>

            <p className="text-xs text-slate-300 font-medium">
              {studentContext.course || "Degree"} • {studentContext.year || "Year 1"} • Level:{" "}
              {studentContext.currentLevel || "Level 1"}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-xl bg-white/10 text-orange-300 font-bold text-xs border border-white/15 flex items-center gap-1.5 backdrop-blur-xs">
                <BrainCircuit size={14} />
                <span>
                  Archetype: {archetype.primaryPattern} / {archetype.secondaryPattern}
                </span>
              </span>

              {onStartDiscovery && !isFacultyView && (
                <button
                  type="button"
                  onClick={onStartDiscovery}
                  className="px-3 py-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                >
                  <Sparkles size={12} />
                  <span>Resume Discovery Chat</span>
                </button>
              )}
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
                  Guidance Index
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
                  <span
                    className="text-xs font-black text-white truncate max-w-[130px] block"
                    title={topPassions[0].name}
                  >
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
                  <span
                    className="text-xs font-black text-emerald-300 truncate max-w-[130px] block"
                    title={careerDirections[0].title}
                  >
                    {careerDirections[0].title}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Navigation to Profile & Dashboard */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/student-portal/profile")}
              className="hover:text-orange-300 transition flex items-center gap-1 font-semibold cursor-pointer"
            >
              <User size={13} />
              <span>View Student Profile</span>
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => navigate("/student-portal/dashboard")}
              className="hover:text-orange-300 transition flex items-center gap-1 font-semibold cursor-pointer"
            >
              <LayoutDashboard size={13} />
              <span>Back to Dashboard</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-400 italic">
            Mentoring Guidance • Sant Singaji Educational Society
          </span>
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
          <Flame
            size={15}
            className={activeTab === "passions" ? "text-orange-500" : "text-slate-400"}
          />
          <span>Passions & Discovery</span>
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
          <Target
            size={15}
            className={activeTab === "vision" ? "text-indigo-600" : "text-slate-400"}
          />
          <span>Purpose & Vision</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("evidence")}
          className={`flex-1 min-w-[140px] py-2.5 px-3.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "evidence"
              ? "bg-white text-slate-900 shadow-xs font-black ring-1 ring-slate-900/5"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold"
          }`}
        >
          <ShieldCheck
            size={15}
            className={activeTab === "evidence" ? "text-emerald-600" : "text-slate-400"}
          />
          <span>Evidence & Alignment</span>
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
          <Rocket
            size={15}
            className={activeTab === "careers" ? "text-emerald-600" : "text-slate-400"}
          />
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
          <Users
            size={15}
            className={activeTab === "faculty" ? "text-purple-600" : "text-slate-400"}
          />
          <span>{isFacultyView ? "Faculty Review" : "Faculty & Mentorship"}</span>
          {(assessment?.facultyFeedback?.length > 0 ||
            assessment?.facultyInterventions?.length > 0) && (
            <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
          )}
        </button>
      </div>

      {/* ── TAB 1: PASSIONS & DISCOVERY ── */}
      {activeTab === "passions" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Top Passions with Expression Gaps */}
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
                    key={passion.name || idx}
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
                              "{passion.originalStatement}"
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
                        Gap: {gap} pts{" "}
                        {gap >= 4
                          ? "(Needs Focus)"
                          : gap >= 2
                          ? "(Moderate)"
                          : "(Balanced)"}
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
                          <span className="font-bold text-slate-600">Current Engagement:</span>
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

                    {/* Student Evidence & Marker */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {passion.studentEvidence && (
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-slate-700">
                          <strong className="text-[10px] text-slate-400 uppercase block">
                            Student Evidence:
                          </strong>
                          <span className="text-[11px] font-medium">{passion.studentEvidence}</span>
                        </div>
                      )}
                      {passion.markers?.[0] && (
                        <div className="bg-orange-50/60 p-2.5 rounded-xl border border-orange-200/60 text-slate-700 flex items-start gap-2">
                          <Target size={14} className="text-orange-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-[10px] text-orange-800 uppercase block">
                              Weekly Action Marker:
                            </strong>
                            <span className="text-[11px] font-medium">{passion.markers[0]}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tri-Pillar Personal Discovery Insights (Explicit vs Inferred vs Uncertainties) */}
          {(explicitlyStated.length > 0 ||
            inferredPatterns.length > 0 ||
            openUncertainties.length > 0) && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                    Pattern Recognition
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Personal Discovery: What Was Explicit, Inferred & Uncertain
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  Separating student voice from AI deductions
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. Explicitly Stated */}
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-black text-xs uppercase tracking-wide">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Explicitly Stated By You</span>
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1.5 font-medium">
                    {explicitlyStated.length > 0 ? (
                      explicitlyStated.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400 italic">No direct statements recorded yet.</li>
                    )}
                  </ul>
                </div>

                {/* 2. Inferred Patterns */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-indigo-800 font-black text-xs uppercase tracking-wide">
                    <BrainCircuit size={14} className="text-indigo-600" />
                    <span>Inferred AI Patterns</span>
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1.5 font-medium">
                    {inferredPatterns.length > 0 ? (
                      inferredPatterns.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-indigo-500 font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400 italic">No patterns inferred yet.</li>
                    )}
                  </ul>
                </div>

                {/* 3. Open Uncertainties */}
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-800 font-black text-xs uppercase tracking-wide">
                    <HelpCircle size={14} className="text-amber-600" />
                    <span>Open Uncertainties / To Explore</span>
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1.5 font-medium">
                    {openUncertainties.length > 0 ? (
                      openUncertainties.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400 italic">No open uncertainties flagged.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

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

          {/* Stage 1: Understand Myself (Real Experiences & Learning Style) */}
          {(understandMyself?.experiences || understandMyself?.preferredLearningStyle || understandMyself?.activitiesEnjoyed?.length > 0) && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 block">
                    Stage 1 Discovery
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Understand Myself • Authentic Experiences & Learning Style
                  </h3>
                </div>
                <span className="text-xs font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-3 py-1 rounded-xl">
                  Self-Reported Evidence
                </span>
              </div>

              {understandMyself.experiences && (
                <div className="p-4 rounded-2xl bg-cyan-50/40 border border-cyan-100/80 space-y-1.5">
                  <span className="text-xs font-black text-cyan-950 block">Meaningful Real-World Experience:</span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium italic">
                    "{understandMyself.experiences}"
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {understandMyself.activitiesEnjoyed?.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <span className="text-[11px] font-bold text-emerald-700 block uppercase tracking-wide">
                      ⚡ Activities Enjoyed & Engaging:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {understandMyself.activitiesEnjoyed.map((act, i) => (
                        <span key={i} className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                          ✓ {act}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {understandMyself.activitiesDisliked?.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <span className="text-[11px] font-bold text-rose-700 block uppercase tracking-wide">
                      🔋 Energy-Draining Situations:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {understandMyself.activitiesDisliked.map((act, i) => (
                        <span key={i} className="px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-800 text-[11px] font-semibold border border-rose-200">
                          ✕ {act}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {understandMyself.preferredLearningStyle && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">Preferred Learning Approach:</span>
                  <span className="font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    {understandMyself.preferredLearningStyle}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Stage 3: Recurring Behavioral Patterns */}
          {recurringPatterns.length > 0 && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 block">
                    Stage 3 Synthesis
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Recurring Behavioral Patterns & Drives
                  </h3>
                </div>
                <span className="text-xs font-bold text-purple-800 bg-purple-50 border border-purple-200 px-3 py-1 rounded-xl">
                  Student Confirmed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {recurringPatterns.map((pat, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-purple-50/40 border border-purple-100 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-purple-950 text-sm">
                        {idx + 1}. {pat.pattern}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 uppercase">
                        {pat.source === "inferred" ? "Inferred Pattern" : "Explicit"}
                      </span>
                    </div>

                    {pat.supportingAnswers?.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                          Supporting Evidence:
                        </span>
                        <ul className="list-disc pl-4 space-y-0.5 text-slate-700 text-[11px]">
                          {pat.supportingAnswers.map((ans, aIdx) => (
                            <li key={aIdx}>{ans}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {pat.counterExample && (
                      <p className="text-[10px] text-slate-500 italic bg-white p-2 rounded-lg border border-purple-100/60">
                        Counter-reflection: {pat.counterExample}
                      </p>
                    )}
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
          {/* Core Purpose Statement Card with Inline Edit Mode */}
          <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white rounded-3xl p-6 sm:p-8 shadow-sm space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/90 bg-white/20 px-3 py-1 rounded-full backdrop-blur-xs">
                  Core Purpose Statement
                </span>
                {assessment?.confirmedPurpose && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-300/40 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Confirmed by Student
                  </span>
                )}
              </div>

              {!isEditingStatements ? (
                <button
                  type="button"
                  onClick={() => setIsEditingStatements(true)}
                  className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer backdrop-blur-xs active:scale-95"
                >
                  <Edit3 size={13} />
                  <span>Edit My Statement</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingStatements(false)}
                    className="px-3 py-1.5 rounded-xl bg-black/20 hover:bg-black/30 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <X size={13} />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSavingStatements}
                    onClick={handleSaveStatementEdits}
                    className="px-3.5 py-1.5 rounded-xl bg-white text-orange-900 hover:bg-orange-50 text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Save size={13} />
                    <span>{isSavingStatements ? "Saving..." : "Confirm & Save"}</span>
                  </button>
                </div>
              )}
            </div>

            {!isEditingStatements ? (
              <p className="text-base sm:text-lg font-black leading-relaxed text-white">
                "{assessment?.confirmedPurpose ||
                  assessment?.purposeStatement ||
                  "Complete your guided discovery to generate your purpose statement."}"
              </p>
            ) : (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-amber-100 uppercase tracking-wide block">
                  Edit in your own words:
                </label>
                <textarea
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  rows={3}
                  className="w-full p-3.5 rounded-2xl bg-white/95 text-slate-900 text-sm font-semibold border-2 border-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                  placeholder="State why your work matters to you and what contribution you want to make..."
                />
              </div>
            )}
          </div>

          {/* 5-Whys Purpose Exploration Summary */}
          {purposeWhys.length > 0 && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                    Depth of Intention
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    5 Whys Purpose Exploration Breakdown
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {purposeWhys.length} Layers
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {purposeWhys.map((why, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3 text-xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold text-slate-500">
                        {why.question || `Why does layer ${idx + 1} matter to you?`}
                      </p>
                      <p className="font-semibold text-slate-900">{why.answer || why}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vision Horizon & Goals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 5-Year Goal */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                5-Year Horizon
              </span>
              <h4 className="text-sm font-black text-slate-900">Professional Goal</h4>
              {!isEditingStatements ? (
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {assessment?.confirmedVision ||
                    assessment?.fiveYearGoal ||
                    "Defined through your Vision discovery."}
                </p>
              ) : (
                <input
                  type="text"
                  value={edit5Year}
                  onChange={(e) => setEdit5Year(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              )}
            </div>

            {/* 10-Year Horizon */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
                10-Year Horizon
              </span>
              <h4 className="text-sm font-black text-slate-900">Long-Term Impact</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {assessment?.tenYearGoal ||
                  "Assume domain leadership, build impactful solutions, and mentor future peers."}
              </p>
            </div>

            {/* BHAG */}
            <div className="bg-gradient-to-b from-amber-50 to-white rounded-3xl p-5 border border-amber-200 shadow-2xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit">
                <Zap size={12} /> Big Ambitious Goal (BHAG)
              </span>
              <h4 className="text-sm font-black text-amber-950">Milestone of Pride</h4>
              {!isEditingStatements ? (
                <p className="text-xs text-amber-900 font-semibold leading-relaxed">
                  "{assessment?.bhag || "Set your big milestone of pride in the Vision discovery."}"
                </p>
              ) : (
                <input
                  type="text"
                  value={editBhag}
                  onChange={(e) => setEditBhag(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-amber-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              )}
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
                Derived from Discovery Reflection
              </span>
            </div>

            <p className="text-xs text-slate-700 font-medium bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
              "{assessment?.studentCommitment ||
                assessment?.studentReflection ||
                "Complete your discovery conversation to unlock your immediate commitment."}"
            </p>
          </div>

          {/* Structured Vision Exercises (A to E) */}
          {(visionExercises?.idealDay || visionExercises?.futureHeadlines || visionExercises?.futureContribution) && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">
                    Stage 6 Vision Synthesis
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Interactive Vision Discovery Exercises
                  </h3>
                </div>
                <span className="text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl">
                  3–5 Year Horizon
                </span>
              </div>

              {/* Exercise A: My Ideal Day Narrative */}
              {visionExercises.idealDay && (
                <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-indigo-950 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                      <Compass size={13} className="text-indigo-600" /> Exercise A: My Ideal Day
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">Ordinary, satisfying day 3–5 yrs out</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed italic">
                    "{visionExercises.idealDay.narrative || visionExercises.idealDay.activities || "Working in an inspiring, supportive environment solving meaningful challenges."}"
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div className="bg-white p-2 rounded-xl border border-indigo-100/60">
                      <span className="text-slate-500 font-bold block text-[10px]">Environment:</span>
                      <span className="font-semibold text-slate-800">{visionExercises.idealDay.where || "Collaborative workspace"}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-indigo-100/60">
                      <span className="text-slate-500 font-bold block text-[10px]">Collaborators:</span>
                      <span className="font-semibold text-slate-800">{visionExercises.idealDay.people || "Dedicated peers & mentors"}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-indigo-100/60">
                      <span className="text-slate-500 font-bold block text-[10px]">Work-Life Harmony:</span>
                      <span className="font-semibold text-slate-800">{visionExercises.idealDay.balance || "Healthy, sustainable boundaries"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Exercise B: Future Headlines */}
              {visionExercises.futureHeadlines?.headline && (
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-1.5 text-xs">
                  <span className="font-black text-amber-950 uppercase tracking-wide text-[11px] block">
                    📰 Exercise B: Imagined Future Headline (3–5 Years)
                  </span>
                  <div className="p-3 bg-white rounded-xl border border-amber-200 text-sm font-black text-amber-900 shadow-2xs">
                    "{visionExercises.futureHeadlines.headline}"
                  </div>
                </div>
              )}

              {/* Exercise D & E: Contribution & Regret */}
              {(visionExercises.futureContribution?.contribution || visionExercises.regretReflection?.regret) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {visionExercises.futureContribution?.contribution && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                        🌱 Desired Future Contribution:
                      </span>
                      <p className="text-slate-800 font-medium leading-relaxed">
                        {visionExercises.futureContribution.contribution}
                      </p>
                    </div>
                  )}

                  {visionExercises.regretReflection?.regret && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                        🕊️ What I Would Regret Never Trying:
                      </span>
                      <p className="text-slate-800 font-medium leading-relaxed">
                        {visionExercises.regretReflection.regret}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: EVIDENCE & ALIGNMENT ── */}
      {activeTab === "evidence" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Institutional Evidence Audit Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Institutional Evidence & Data Reconciliation
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Strict verification between institutional records and self-reported discovery
                  </p>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-xl text-xs font-black self-start sm:self-auto border flex items-center gap-1.5 ${
                  isEvidenceVerified
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                <ShieldCheck size={14} />
                <span>Status: {evidenceValidation.validationStatus || "Reconciled"}</span>
              </span>
            </div>

            {/* Reconciliation Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Task Completion Rate */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Task Completion Rate
                </span>
                <span className="text-base font-black text-slate-900 block">
                  {evidenceValidation.verifiedTaskCompletionRate !== undefined &&
                  evidenceValidation.verifiedTaskCompletionRate !== null
                    ? `${evidenceValidation.verifiedTaskCompletionRate}%`
                    : "Data unavailable"}
                </span>
                <p className="text-[11px] text-slate-500">
                  Source: Institutional task management logs
                </p>
              </div>

              {/* Verified Attendance */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Institutional Attendance
                </span>
                <span className="text-base font-black text-slate-900 block">
                  {evidenceValidation.verifiedAttendanceRate !== undefined &&
                  evidenceValidation.verifiedAttendanceRate !== null
                    ? `${evidenceValidation.verifiedAttendanceRate}%`
                    : "Data unavailable"}
                </span>
                <p className="text-[11px] text-slate-500">
                  Source: Biometric / session attendance records
                </p>
              </div>

              {/* Academic Performance */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Academic Performance
                </span>
                <span className="text-base font-black text-slate-900 block">
                  {evidenceValidation.verifiedAcademicGrade || "Data unavailable"}
                </span>
                <p className="text-[11px] text-slate-500">
                  Source: Semester academic evaluation
                </p>
              </div>
            </div>

            {/* Reconciliation Notes / Gaps */}
            {evidenceValidation.reconciliationNotes?.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold uppercase tracking-wider text-[11px]">
                  <AlertTriangle size={14} className="text-amber-600" />
                  <span>Validation & Data Gap Observations:</span>
                </div>
                <ul className="space-y-1 text-slate-700 font-medium">
                  {evidenceValidation.reconciliationNotes.map((note, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Transparent Development Indicators (0-100%) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                  Development Guidance
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Transparent Development Indicators (0–100 Scale)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIndicatorFormulas(!showIndicatorFormulas)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Info size={13} className="text-slate-500" />
                <span>{showIndicatorFormulas ? "Hide Formulas" : "View Formulas & Inputs"}</span>
              </button>
            </div>

            {/* Disclaimer Alert */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/70 flex items-start gap-2.5 text-xs text-indigo-900">
              <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {indicators.disclaimer ||
                  "These developmental alignment scores are guidance indicators designed to structure student mentoring and continuous skill progression. They are not psychometric or clinical diagnostic tests."}
              </p>
            </div>

            {/* 6 Dimension Indicator Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {[
                {
                  key: "passionClarity",
                  label: "Passion Clarity",
                  data: indicators.passionClarity || {
                    score: scores.passionClarity || 85,
                    formula: "Top passions count + markers presence + expression gaps",
                    rationale: "Measures clarity and actionability of identified passions.",
                  },
                  color: "orange",
                },
                {
                  key: "purposeClarity",
                  label: "Purpose Clarity",
                  data: indicators.purposeClarity || {
                    score: scores.purposeClarity || 80,
                    formula: "Purpose statement specificity + 5-whys depth",
                    rationale: "Measures internal motivation and societal contribution clarity.",
                  },
                  color: "indigo",
                },
                {
                  key: "visionClarity",
                  label: "Vision Clarity",
                  data: indicators.visionClarity || {
                    score: scores.visionClarity || 82,
                    formula: "Presence of 5-year goal, 10-year goal, and BHAG",
                    rationale: "Measures concrete milestones across horizons.",
                  },
                  color: "blue",
                },
                {
                  key: "skillAlignment",
                  label: "Skill Alignment",
                  data: indicators.skillAlignment || {
                    score: scores.skillAlignment || 75,
                    formula: "Verified performance metrics + matched career competencies",
                    rationale: "Compares aspirations with available evidence.",
                  },
                  color: "emerald",
                },
                {
                  key: "goalAlignment",
                  label: "Goal Alignment",
                  data: indicators.goalAlignment || {
                    score: scores.goalAlignment || 84,
                    formula: "Consistency between chosen values and target directions",
                    rationale: "Measures congruence between guiding principles and aspirations.",
                  },
                  color: "purple",
                },
                {
                  key: "overallIndex",
                  label: "Overall Guidance Index",
                  data: indicators.overallIndex || {
                    score: overallScore,
                    formula: "Weighted blend of clarity, alignment, and evidence verification",
                    rationale: "Holistic development readiness indicator for faculty mentoring.",
                  },
                  color: "amber",
                },
              ].map(({ key, label, data }) => (
                <div
                  key={key}
                  className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-2.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-800">{label}</span>
                    <span className="text-sm font-black text-slate-900">{data.score}%</span>
                  </div>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-900 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, data.score))}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-600 font-medium leading-snug">
                    {data.rationale}
                  </p>

                  {showIndicatorFormulas && data.formula && (
                    <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 space-y-0.5 bg-slate-50 p-2 rounded-xl">
                      <span className="font-bold text-slate-600 block">Formula / Inputs:</span>
                      <span className="font-mono">{data.formula}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: CAREER DIRECTIONS & EXPERIMENTS ── */}
      {activeTab === "careers" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                Strategic Horizons
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Recommended Career Directions & 14-Day Experiments
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
              {careerDirections.length} Career Tracks
            </span>
          </div>

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
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-black text-slate-900">{cd.title}</h4>
                        {cd.fitScore && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {cd.fitScore}% Fit
                          </span>
                        )}
                        {cd.studentInterest && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Interest: {cd.studentInterest}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{cd.whyItFits}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedExperiment(isExpanded ? null : idx)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                  >
                    <span>14-Day Micro Experiment</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* Supporting Student Answers & Skills Chips */}
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

                {/* Growth Areas & Unknowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div>
                    <strong className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
                      Needs Further Development:
                    </strong>
                    <p className="text-[11px] text-slate-700 font-medium">
                      {cd.developmentNeeded ||
                        "Continued project-based exposure and targeted DSA / technical competencies."}
                    </p>
                  </div>
                  <div>
                    <strong className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block mb-1">
                      What is Still Unknown:
                    </strong>
                    <p className="text-[11px] text-slate-700 font-medium">
                      {cd.stillUnknown ||
                        "Direct real-world industry workplace preference and full-stack architecture comfort."}
                    </p>
                  </div>
                </div>

                {/* Expandable 14-Day Micro-Experiment Sprint */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100/60">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                        Week 1: Research & Prototype
                      </span>
                      <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4 font-medium">
                        {(
                          exp.week1 || [
                            `Select one real-world project challenge in ${cd.title}.`,
                            "Research 2 industry references and outline an initial approach.",
                            "Review proposal with peers or faculty mentor.",
                          ]
                        ).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                        Week 2: Execution & Reflection
                      </span>
                      <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4 font-medium">
                        {(
                          exp.week2 || [
                            "Implement basic working prototype or draft case study.",
                            "Present deliverable to 2 peers for direct critique.",
                            "Reflect: Did this problem energize or drain your focus?",
                          ]
                        ).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Multi-Horizon Developmental Roadmap (3 / 6 / 12 Months) */}
          {assessment?.roadmap && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4 mt-6">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">
                Execution Blueprint
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Multi-Horizon Developmental Roadmap
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 3 Months */}
                <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-orange-900 font-black text-xs uppercase tracking-wide">
                    <Clock size={14} className="text-orange-600" />
                    <span>3 Months (Immediate)</span>
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1 font-medium list-disc pl-4">
                    {(
                      assessment.roadmap.threeMonths || [
                        "Establish daily deliberate coding practice.",
                        "Build portfolio project with clean documentation.",
                        "Review progress bi-weekly with mentor.",
                      ]
                    ).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* 6 Months */}
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-indigo-900 font-black text-xs uppercase tracking-wide">
                    <Layers size={14} className="text-indigo-600" />
                    <span>6 Months (Capabilities)</span>
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1 font-medium list-disc pl-4">
                    {(
                      assessment.roadmap.sixMonths || [
                        "Deliver end-to-end capstone system.",
                        "Participate in hackathons or technical events.",
                        "Attain intermediate competencies in core tools.",
                      ]
                    ).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* 12 Months */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-900 font-black text-xs uppercase tracking-wide">
                    <Target size={14} className="text-emerald-600" />
                    <span>12 Months (Readiness)</span>
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1 font-medium list-disc pl-4">
                    {(
                      assessment.roadmap.twelveMonths || [
                        "Secure targeted internship or fellowship.",
                        "Contribute to open source or industry project.",
                        "Complete comprehensive mock interview panels.",
                      ]
                    ).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Stage 8: Structured Practical Experiments */}
          {practicalExperiments.length > 0 && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">
                    Stage 8 Experiments
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Low-Cost Real-World Passion Experiments
                  </h3>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                  Empirical Testing
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {practicalExperiments.map((exp, eIdx) => (
                  <div key={eIdx} className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-emerald-950 text-sm">{exp.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {exp.status || "Planned"}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed font-medium">
                      {exp.whatToDo}
                    </p>
                    <div className="space-y-1 text-[11px] bg-white p-3 rounded-xl border border-emerald-100/60">
                      <div><strong className="text-slate-600">Time Required:</strong> <span className="text-slate-800 font-semibold">{exp.timeRequired}</span></div>
                      <div><strong className="text-slate-600">Expected Learning:</strong> <span className="text-slate-800">{exp.expectedLearning}</span></div>
                      <div><strong className="text-slate-600">Artifact/Evidence:</strong> <span className="text-slate-800">{exp.evidenceToCollect}</span></div>
                    </div>
                    <p className="text-[10px] text-slate-500 italic">
                      Scope: {exp.outcomeScope || "Tests interest empirically; does not restrict career directions."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 30-Day Discovery Actions & Review Plan */}
          {(detailedRoadmap?.thirtyDayActions?.length > 0 || detailedRoadmap?.revisionPlan) && (
            <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50/70 rounded-3xl p-5 sm:p-6 border border-teal-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 block">
                    Immediate Actionable Horizon
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-teal-950">
                    30-Day Discovery Actions & 90-Day Revision Plan
                  </h3>
                </div>
                <span className="text-xs font-bold text-teal-800 bg-white border border-teal-200 px-3 py-1 rounded-xl shadow-2xs">
                  Next Review: {detailedRoadmap.reviewDate ? new Date(detailedRoadmap.reviewDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "90 Days"}
                </span>
              </div>

              {detailedRoadmap.thirtyDayActions?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-black text-teal-900 block uppercase tracking-wide">
                    First 30 Days (Discovery Sprint):
                  </span>
                  <ul className="space-y-1.5 text-xs text-teal-950 font-medium">
                    {detailedRoadmap.thirtyDayActions.map((act, aIdx) => (
                      <li key={aIdx} className="p-2.5 rounded-xl bg-white/90 border border-teal-100 flex items-start gap-2">
                        <span className="text-teal-600 font-bold shrink-0 mt-0.5">✓</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detailedRoadmap.revisionPlan && (
                <div className="p-3 bg-white/80 rounded-xl border border-teal-100 text-[11px] text-teal-900 font-medium leading-relaxed">
                  <strong>Revision Protocol:</strong> {detailedRoadmap.revisionPlan}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: FACULTY REVIEW & MENTORSHIP GUIDANCE ── */}
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
                (assessment?.facultyInterventions?.length > 0 &&
                  assessment.facultyInterventions) || [
                  {
                    actionId: "act-1",
                    title: `Assign Domain Mentor for ${careerDirections[0]?.title || "Software Engineering"}`,
                    category: "Mentorship",
                    status: "Not Started",
                    notes:
                      "Connect student with senior faculty or industry mentor for career direction guidance.",
                  },
                  {
                    actionId: "act-2",
                    title: "Recommend Practical Capstone Project Mentorship",
                    category: "Project",
                    status: "Not Started",
                    notes:
                      "Assign end-to-end capstone project to bridge theoretical knowledge into demonstrable portfolio.",
                  },
                  {
                    actionId: "act-3",
                    title: "Weekly Technical Presentation & Communication Practice",
                    category: "Communication",
                    status: "In Progress",
                    notes:
                      "Encourage student to deliver 5-minute verbal summaries during seminar hours.",
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

                const categoryClass =
                  categoryColorMap[category] || "bg-slate-100 text-slate-700 border-slate-200";

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
                            <h4 className="text-xs sm:text-sm font-black text-slate-900">
                              {title}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${categoryClass}`}
                            >
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
