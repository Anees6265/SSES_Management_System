import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGetStudentThesisQuery,
  useGetStudentThesisVersionsQuery,
  useSaveStudentDraftThesisMutation,
  useAnalyzeStudentThesisMutation,
  useStartStudentNewThesisVersionMutation,
  useUpdateStudentThesisStatementsMutation,
  useAddThesisMentorFeedbackMutation,
  useUpdateThesisFacultyActionMutation,
  useSubmitStudentDiscoveryStepMutation,
  useResetStudentDiscoveryMutation,
  useConfirmStudentThesisMutation,
} from "../../../redux/api/authApi";
import {
  useGetMyStudentThesisQuery,
  useGetMyThesisVersionsQuery,
  useSaveMyDraftThesisMutation,
  useAnalyzeMyThesisMutation,
  useStartMyNewThesisVersionMutation,
  useUpdateMyThesisStatementsMutation,
  useSubmitMyDiscoveryStepMutation,
  useResetMyDiscoveryMutation,
  useConfirmMyThesisMutation,
} from "../../../redux/api/studentApi";
import AIThesisOverview from "./AIThesisOverview";
import AIDiscoveryWizard from "./AIDiscoveryWizard";
import PassionTestWizard from "./PassionTestWizard";
import VisionTestWizard from "./VisionTestWizard";
import MentorFeedbackModal from "./MentorFeedbackModal";
import PurposeEvolutionModal from "./PurposeEvolutionModal";
import AIThesisReportPDF from "./AIThesisReportPDF";
import Loader from "../../shared/loader/Loader";
import {
  Flame,
  Compass,
  Sparkles,
  ArrowRight,
  Edit3,
  Clock,
  RefreshCw,
  Printer,
  MessageSquare,
  Award,
  BookOpen,
  User,
  LayoutDashboard,
  Target,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { toast } from "react-toastify";

export default function AIThesisContainer({
  studentId,
  isFacultyView = false,
}) {
  const navigate = useNavigate();
  const [activeTestModal, setActiveTestModal] = useState(null); // "discovery" | "passion" | "vision" | null
  const [viewMode, setViewMode] = useState("report"); // "report" | "tests"
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [isMentorModalOpen, setIsMentorModalOpen] = useState(false);
  const [isEvolutionModalOpen, setIsEvolutionModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Queries & Mutations based on view
  const facultyThesisQuery = useGetStudentThesisQuery(
    { studentId, version: selectedVersion },
    { skip: !isFacultyView || !studentId }
  );
  const studentThesisQuery = useGetMyStudentThesisQuery(
    selectedVersion,
    { skip: isFacultyView }
  );

  const facultyVersionsQuery = useGetStudentThesisVersionsQuery(
    studentId,
    { skip: !isFacultyView || !studentId }
  );
  const studentVersionsQuery = useGetMyThesisVersionsQuery(
    undefined,
    { skip: isFacultyView }
  );

  const currentQuery = isFacultyView ? facultyThesisQuery : studentThesisQuery;
  const versionsQuery = isFacultyView ? facultyVersionsQuery : studentVersionsQuery;

  const { data, isLoading, refetch } = currentQuery;
  const rawVersions = versionsQuery.data?.data || versionsQuery.data || [];
  const versions = Array.isArray(rawVersions) ? rawVersions : [];

  const [saveDraftFaculty, { isLoading: isSavingFaculty }] = useSaveStudentDraftThesisMutation();
  const [saveDraftStudent, { isLoading: isSavingStudent }] = useSaveMyDraftThesisMutation();

  const [analyzeFaculty, { isLoading: isAnalyzingFaculty }] = useAnalyzeStudentThesisMutation();
  const [analyzeStudent, { isLoading: isAnalyzingStudent }] = useAnalyzeMyThesisMutation();

  const [startNewVerFaculty] = useStartStudentNewThesisVersionMutation();
  const [startNewVerStudent] = useStartMyNewThesisVersionMutation();

  const [updateStmtFaculty] = useUpdateStudentThesisStatementsMutation();
  const [updateStmtStudent] = useUpdateMyThesisStatementsMutation();

  const [submitStepFaculty, { isLoading: isSubmittingStepFaculty }] = useSubmitStudentDiscoveryStepMutation();
  const [submitStepStudent, { isLoading: isSubmittingStepStudent }] = useSubmitMyDiscoveryStepMutation();

  const [resetDiscoveryFaculty] = useResetStudentDiscoveryMutation();
  const [resetDiscoveryStudent] = useResetMyDiscoveryMutation();

  const [confirmThesisFaculty, { isLoading: isConfirmingFaculty }] = useConfirmStudentThesisMutation();
  const [confirmThesisStudent, { isLoading: isConfirmingStudent }] = useConfirmMyThesisMutation();

  const [addFeedback, { isLoading: isSubmittingFeedback }] = useAddThesisMentorFeedbackMutation();
  const [updateFacultyAction] = useUpdateThesisFacultyActionMutation();

  const isSaving = isFacultyView ? isSavingFaculty : isSavingStudent;
  const isAnalyzing = isFacultyView ? (isAnalyzingFaculty || isConfirmingFaculty) : (isAnalyzingStudent || isConfirmingStudent);
  const isSubmittingDiscovery = isFacultyView
    ? (isSubmittingStepFaculty || isConfirmingFaculty)
    : (isSubmittingStepStudent || isConfirmingStudent);

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <Loader />
        <p className="text-xs font-bold text-slate-500 mt-4">Loading Passion & Vision Thesis...</p>
      </div>
    );
  }

  const assessment = data?.data?.assessment || data?.assessment || null;
  const studentContext = data?.data?.studentContext || data?.studentContext || {};
  const currentVersionNumber = assessment?.assessmentVersion || 1;

  // Build clean list of unique display versions
  const displayVersionsMap = new Map();
  versions.forEach((v) => displayVersionsMap.set(v.assessmentVersion, v));
  if (assessment && !displayVersionsMap.has(assessment.assessmentVersion)) {
    displayVersionsMap.set(assessment.assessmentVersion, {
      _id: assessment._id,
      assessmentVersion: assessment.assessmentVersion,
      status: assessment.status,
      alignmentScores: assessment.alignmentScores,
      createdAt: assessment.createdAt,
      purposeStatement: assessment.purposeStatement,
      confirmedPurpose: assessment.confirmedPurpose,
      topPassions: assessment.topPassions,
    });
  }
  const displayVersions = Array.from(displayVersionsMap.values()).sort(
    (a, b) => a.assessmentVersion - b.assessmentVersion
  );

  const latestAnalyzedVersion = [...displayVersions]
    .reverse()
    .find((v) => v.status === "analyzed" || v.status === "finalized");

  // Evaluation of completion
  const isPassionTestCompleted = Boolean(
    assessment?.isPassionTestCompleted ||
    (assessment?.topPassions && assessment.topPassions.length >= 1)
  );

  const isVisionTestCompleted = Boolean(
    assessment?.isVisionTestCompleted ||
    (assessment?.coreValues && assessment.coreValues.length >= 2 && assessment?.fiveYearGoal)
  );

  const hasAIAnalysis = Boolean(
    (assessment?.status === "analyzed" || assessment?.status === "finalized") &&
    assessment?.careerDirections &&
    assessment.careerDirections.length > 0 &&
    assessment?.topPassions &&
    assessment.topPassions.length > 0
  );

  const handleSelectVersion = (verNum) => {
    setSelectedVersion(verNum);
    const targetVer = displayVersions.find((item) => item.assessmentVersion === verNum);
    if (targetVer && (targetVer.status === "analyzed" || targetVer.status === "finalized")) {
      setViewMode("report");
    } else {
      setViewMode("tests");
    }
  };

  // Save handler for quick test wizards
  const handleSaveTest = async (testPayload) => {
    try {
      const ver = selectedVersion || currentVersionNumber;
      if (isFacultyView) {
        await saveDraftFaculty({ studentId, version: ver, ...testPayload }).unwrap();
      } else {
        await saveDraftStudent({ version: ver, ...testPayload }).unwrap();
      }
      versionsQuery.refetch?.();
      refetch();
      setActiveTestModal(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save test responses");
    }
  };

  // Discovery turn handler
  const handleSubmitDiscoveryStep = async (stepPayload) => {
    const ver = selectedVersion || currentVersionNumber;
    if (isFacultyView) {
      await submitStepFaculty({ studentId, version: ver, ...stepPayload }).unwrap();
    } else {
      await submitStepStudent({ version: ver, ...stepPayload }).unwrap();
    }
    versionsQuery.refetch?.();
    refetch();
  };

  // Reset discovery handler
  const handleResetDiscovery = async () => {
    const ver = selectedVersion || currentVersionNumber;
    if (isFacultyView) {
      await resetDiscoveryFaculty({ studentId, version: ver }).unwrap();
    } else {
      await resetDiscoveryStudent().unwrap();
    }
    versionsQuery.refetch?.();
    refetch();
  };

  // Confirm thesis handler
  const handleConfirmThesis = async (confirmPayload) => {
    const ver = selectedVersion || currentVersionNumber;
    if (isFacultyView) {
      await confirmThesisFaculty({ studentId, version: ver, ...confirmPayload }).unwrap();
    } else {
      await confirmThesisStudent({ version: ver, ...confirmPayload }).unwrap();
    }
    versionsQuery.refetch?.();
    refetch();
    setViewMode("report");
    setActiveTestModal(null);
  };

  // Run AI Analysis directly
  const handleAnalyzeBoth = async () => {
    try {
      const ver = selectedVersion || currentVersionNumber;
      if (isFacultyView) {
        await analyzeFaculty({ studentId, version: ver }).unwrap();
      } else {
        await analyzeStudent({ version: ver }).unwrap();
      }
      versionsQuery.refetch?.();
      refetch();
      setViewMode("report");
      toast.success("AI synthesized your Passion & Vision successfully!");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to run AI analysis");
    }
  };

  const handleStartNewVersion = async () => {
    if (!window.confirm("Start a new assessment version? Your previous assessment will remain preserved in Version Evolution.")) {
      return;
    }
    try {
      let res;
      if (isFacultyView) {
        res = await startNewVerFaculty(studentId).unwrap();
      } else {
        res = await startNewVerStudent().unwrap();
      }
      const newVer = res?.data?.assessmentVersion;
      if (newVer) {
        setSelectedVersion(newVer);
      }
      versionsQuery.refetch?.();
      refetch();
      setViewMode("tests");
      toast.info(`Version ${newVer || ""} draft initiated. Previous versions are preserved.`);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to start new version");
    }
  };

  const handleUpdateStatements = async (updateData) => {
    try {
      if (isFacultyView) {
        await updateStmtFaculty({ studentId, ...updateData }).unwrap();
      } else {
        await updateStmtStudent(updateData).unwrap();
      }
      refetch();
      toast.success("Statements updated successfully!");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update statement");
    }
  };

  const handleAddMentorFeedback = async (feedbackData) => {
    try {
      const ver = selectedVersion || currentVersionNumber;
      await addFeedback({ studentId, version: ver, ...feedbackData }).unwrap();
      setIsMentorModalOpen(false);
      refetch();
      toast.success("Mentor feedback submitted successfully!");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to submit mentor feedback");
    }
  };

  const handleUpdateFacultyAction = async (actionData) => {
    try {
      const targetId = isFacultyView ? studentId : studentContext.studentId;
      const ver = selectedVersion || currentVersionNumber;
      await updateFacultyAction({ studentId: targetId, version: ver, ...actionData }).unwrap();
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update action");
    }
  };

  // Render Test Modal (Discovery, Passion, or Vision)
  const renderActiveTestModal = () => {
    if (!activeTestModal) return null;

    return (
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-xs sm:p-4 overflow-hidden animate-in fade-in duration-150">
        <div className="w-full sm:max-w-3xl h-[94vh] sm:h-[86vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
          {activeTestModal === "discovery" && (
            <AIDiscoveryWizard
              assessment={assessment || {}}
              studentContext={studentContext || {}}
              onSubmitStep={handleSubmitDiscoveryStep}
              onResetDiscovery={handleResetDiscovery}
              onConfirmThesis={handleConfirmThesis}
              onClose={() => setActiveTestModal(null)}
              isSubmitting={isSubmittingDiscovery}
            />
          )}

          {activeTestModal === "passion" && (
            <PassionTestWizard
              initialData={assessment || {}}
              onSave={handleSaveTest}
              onClose={() => setActiveTestModal(null)}
              isSaving={isSaving}
            />
          )}

          {activeTestModal === "vision" && (
            <VisionTestWizard
              initialData={assessment || {}}
              onSave={handleSaveTest}
              onClose={() => setActiveTestModal(null)}
              isSaving={isSaving}
            />
          )}
        </div>
      </div>
    );
  };

  // ── Starting Test Hub & Interactive Discovery Portal ──
  const renderTestHub = () => (
    <div className="space-y-4 sm:space-y-5">
      {/* Notice when working on a draft while having previous analyzed version */}
      {latestAnalyzedVersion && !hasAIAnalysis && (
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-200/90 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock size={20} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-indigo-950">
                Working on Version {currentVersionNumber} (Draft)
              </h4>
              <p className="text-xs text-indigo-800 font-medium mt-0.5">
                Your analyzed Version {latestAnalyzedVersion.assessmentVersion} thesis is preserved! You can switch back anytime using the version bar above.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleSelectVersion(latestAnalyzedVersion.assessmentVersion)}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-900 hover:bg-indigo-100/60 active:scale-95 text-xs font-black transition shrink-0 shadow-2xs cursor-pointer text-center"
          >
            ← View Version {latestAnalyzedVersion.assessmentVersion} Thesis
          </button>
        </div>
      )}

      {/* ── FEATURED PRIMARY HERO: AI-Guided Discovery Conversation ── */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-sm border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 bg-orange-400/10 px-3 py-1 rounded-full border border-orange-400/20">
              ✨ Recommended Path • AI-Guided Discovery
            </span>
          </div>
          <span className="text-xs text-slate-300 font-medium">
            Personalized reflection in simple English & Hinglish
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
            Discover What Energizes You & Where You Want to Go
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal max-w-2xl">
            Instead of a rigid static test, have a guided discovery conversation with our AI mentor. We break down concepts simply, ask adaptive follow-ups based on your genuine answers, and help you review and edit your own purpose and vision statements.
          </p>
        </div>

        {/* 3 Step Concept Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-orange-400 font-black text-xs">
              <Flame size={15} />
              <span>1. Passion: What Energizes Me?</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Curiosity, problems you like solving, and activities where you lose track of time.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-amber-400 font-black text-xs">
              <Target size={15} />
              <span>2. Purpose: Why Does It Matter?</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Simplified 5-Whys exploration to find what kind of contribution matters to you.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-indigo-400 font-black text-xs">
              <Compass size={15} />
              <span>3. Vision: Where Am I Heading?</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Your 3-5 year horizon, Big Dream milestone (BHAG), and practical career experiments.
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800">
          <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-400" />
            <span>Takes ~5 minutes • You can pause, edit answers, and resume anytime</span>
          </div>

          <button
            type="button"
            onClick={() => setActiveTestModal("discovery")}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20 active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Sparkles size={16} />
            <span>Start My Discovery Conversation ✨</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* 2 Focused Direct Test Cards (For Fast Direct Updates) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Test 1: Passion Test */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4 hover:border-orange-300 transition">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
                <Flame size={22} />
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  isPassionTestCompleted
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {isPassionTestCompleted ? "✓ Completed" : "Not Started"}
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">
                Passion Discovery Test (Direct)
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Choose top passions from library or custom text, and measure your self-rated importance vs current engagement gap.
              </p>
            </div>

            {/* Preview chips if completed */}
            {isPassionTestCompleted && assessment?.topPassions?.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Selected Passions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {assessment.topPassions.map((p, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-orange-50 text-orange-800 border border-orange-200/60"
                    >
                      {p.name || p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveTestModal("passion")}
            className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Edit3 size={14} />
            <span>{isPassionTestCompleted ? "Review / Edit Passion Test" : "Start Passion Test"}</span>
          </button>
        </div>

        {/* Test 2: Vision Test */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4 hover:border-indigo-300 transition">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                <Compass size={22} />
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  isVisionTestCompleted
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-indigo-50 text-indigo-700 border-indigo-200"
                }`}
              >
                {isVisionTestCompleted ? "✓ Completed" : "Not Started"}
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">
                Vision & Purpose Test (Direct)
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Select your core guiding values, state your driving ambition, and define your bold 3-5 year goal.
              </p>
            </div>

            {/* Preview values if completed */}
            {isVisionTestCompleted && assessment?.coreValues?.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Core Values:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {assessment.coreValues.map((v, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200/60"
                    >
                      {v.name || v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveTestModal("vision")}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Edit3 size={14} />
            <span>{isVisionTestCompleted ? "Review / Edit Vision Test" : "Start Vision Test"}</span>
          </button>
        </div>
      </div>

      {/* AI Synthesis Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles size={22} />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900">
              {hasAIAnalysis ? "AI Synthesis Ready" : "Synthesize AI Developmental Thesis"}
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              {isPassionTestCompleted
                ? "Your self-discovery answers are ready! Click below to synthesize your personalized AI developmental thesis."
                : "Complete the guided discovery conversation above to unlock your personalized AI thesis."}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isAnalyzing || !isPassionTestCompleted}
          onClick={handleAnalyzeBoth}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Synthesizing with AI...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>{hasAIAnalysis ? "Re-Synthesize Thesis with AI ✨" : "✨ Generate AI Passion & Vision Thesis"}</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>

      {/* Quick Links Back to Profile & Dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/student-portal/profile")}
            className="hover:text-orange-600 transition flex items-center gap-1 font-semibold cursor-pointer"
          >
            <User size={13} />
            <span>Student Profile</span>
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => navigate("/student-portal/dashboard")}
            className="hover:text-orange-600 transition flex items-center gap-1 font-semibold cursor-pointer"
          >
            <LayoutDashboard size={13} />
            <span>Dashboard</span>
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => navigate("/student-portal/tasks")}
            className="hover:text-orange-600 transition flex items-center gap-1 font-semibold cursor-pointer"
          >
            <BookOpen size={13} />
            <span>My Tasks</span>
          </button>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">
          Sant Singaji Educational Society (SSES)
        </span>
      </div>
    </div>
  );

  // ── Faculty Pending View ──
  const renderFacultyPendingView = () => (
    <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xs space-y-6 text-center max-w-2xl mx-auto my-6 animate-in fade-in duration-200">
      <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
        <Sparkles size={28} />
      </div>
      <div className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full inline-block">
          Assessment Pending
        </span>
        <h3 className="text-lg sm:text-xl font-black text-slate-900">
          Passion & Vision Test Not Taken Yet
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          {studentContext?.name || "This student"} has not yet completed their self-discovery test.
          Once the student completes the Passion and Vision discovery in their student portal, our AI will automatically synthesize their personalized development thesis, core purpose, and career roadmap.
        </p>
      </div>

      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-medium text-slate-600 text-left">
        <div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase">Student</span>
          <strong className="text-slate-900 truncate block">{studentContext?.name || "Student"}</strong>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase">Course</span>
          <strong className="text-slate-900 truncate block">{studentContext?.course || "Degree"}</strong>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase">Current Level</span>
          <strong className="text-slate-900 truncate block">{studentContext?.currentLevel || "Level 1"}</strong>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase">Status</span>
          <span className="font-black text-amber-600">Pending Test</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── Toolbar ── */}
      {displayVersions.length > 0 && (
        <div className="bg-slate-50/90 backdrop-blur-xs rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
          {/* Active Version Status Pill */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-xl text-xs font-black bg-slate-900 text-white shadow-2xs flex items-center gap-1.5">
              <span>Version {currentVersionNumber}</span>
            </span>
            <span
              className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                hasAIAnalysis
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  hasAIAnalysis ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                }`}
              />
              {hasAIAnalysis ? "✓ Analyzed" : "Draft In-Progress"}
            </span>
            {hasAIAnalysis && assessment?.alignmentScores?.overall && (
              <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1">
                <Award size={13} className="text-indigo-600" />
                <span>{assessment.alignmentScores.overall}% Guidance Index</span>
              </span>
            )}
          </div>

          {/* Unified Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Version Switcher Tabs */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl gap-1 text-xs font-bold border border-slate-200/70 overflow-x-auto scrollbar-none max-w-full">
              {displayVersions.map((ver) => {
                const isSelected = ver.assessmentVersion === currentVersionNumber;
                const isVerAnalyzed = ver.status === "analyzed" || ver.status === "finalized";
                return (
                  <button
                    key={ver._id || ver.assessmentVersion}
                    type="button"
                    onClick={() => handleSelectVersion(ver.assessmentVersion)}
                    className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/10 font-black"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-semibold"
                    }`}
                  >
                    <span>v{ver.assessmentVersion}</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isVerAnalyzed ? "bg-emerald-500" : "bg-amber-400"
                      }`}
                    />
                    <span className="text-[10px] opacity-75">
                      {isVerAnalyzed ? "Analyzed" : "Draft"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Compare Evolution Modal Button */}
            {displayVersions.length > 1 && (
              <button
                type="button"
                onClick={() => setIsEvolutionModalOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                title="Compare shifts across versions"
              >
                <Clock size={13} className="text-indigo-600" />
                <span>History</span>
              </button>
            )}

            {/* Export PDF Button (when analyzed) */}
            {hasAIAnalysis && (
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                title="Export report to PDF"
              >
                <Printer size={13} className="text-slate-600" />
                <span>PDF</span>
              </button>
            )}

            {/* Add Feedback (Faculty view) */}
            {isFacultyView && hasAIAnalysis && (
              <button
                type="button"
                onClick={() => setIsMentorModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <MessageSquare size={13} />
                <span>+ Feedback</span>
              </button>
            )}

            {/* New Version Trigger (Student view) */}
            {!isFacultyView && (
              <button
                type="button"
                onClick={handleStartNewVersion}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
              >
                <RefreshCw size={12} />
                <span>+ New Version</span>
              </button>
            )}

            {/* View Mode Toggle (Report vs Tests) */}
            {hasAIAnalysis && (
              <div className="flex items-center bg-orange-50/80 p-1 rounded-2xl gap-1 text-xs font-bold border border-orange-200/60 sm:ml-1">
                <button
                  type="button"
                  onClick={() => setViewMode("report")}
                  className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                    viewMode === "report"
                      ? "bg-white text-orange-950 shadow-2xs font-black"
                      : "text-orange-700 hover:text-orange-900"
                  }`}
                >
                  📊 Thesis
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("tests")}
                  className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                    viewMode === "tests"
                      ? "bg-white text-orange-950 shadow-2xs font-black"
                      : "text-orange-700 hover:text-orange-900"
                  }`}
                >
                  📝 Edit Discovery
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main Content Area ── */}
      {!hasAIAnalysis ? (
        isFacultyView ? renderFacultyPendingView() : renderTestHub()
      ) : viewMode === "tests" ? (
        renderTestHub()
      ) : (
        <AIThesisOverview
          assessment={assessment}
          studentContext={studentContext}
          isFacultyView={isFacultyView}
          onOpenMentorFeedbackModal={() => setIsMentorModalOpen(true)}
          onUpdateFacultyAction={handleUpdateFacultyAction}
          onUpdateStatements={handleUpdateStatements}
          onStartDiscovery={() => setActiveTestModal("discovery")}
        />
      )}

      {/* Test Wizard Modals */}
      {renderActiveTestModal()}

      {/* Other Modals */}
      <MentorFeedbackModal
        isOpen={isMentorModalOpen}
        onClose={() => setIsMentorModalOpen(false)}
        onSubmit={handleAddMentorFeedback}
        isSubmitting={isSubmittingFeedback}
      />

      <PurposeEvolutionModal
        isOpen={isEvolutionModalOpen}
        onClose={() => setIsEvolutionModalOpen(false)}
        versions={versions}
        currentVersion={assessment?.assessmentVersion}
        onSelectVersion={(v) => {
          setSelectedVersion(v);
          setIsEvolutionModalOpen(false);
        }}
      />

      <AIThesisReportPDF
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        assessment={assessment}
        studentContext={studentContext}
      />
    </div>
  );
}
