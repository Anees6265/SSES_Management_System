import { useState } from "react";
import {
  useGetStudentThesisQuery,
  useGetStudentThesisVersionsQuery,
  useSaveStudentDraftThesisMutation,
  useAnalyzeStudentThesisMutation,
  useStartStudentNewThesisVersionMutation,
  useUpdateStudentThesisStatementsMutation,
  useAddThesisMentorFeedbackMutation,
  useUpdateThesisFacultyActionMutation,
} from "../../../redux/api/authApi";
import {
  useGetMyStudentThesisQuery,
  useGetMyThesisVersionsQuery,
  useSaveMyDraftThesisMutation,
  useAnalyzeMyThesisMutation,
  useStartMyNewThesisVersionMutation,
  useUpdateMyThesisStatementsMutation,
} from "../../../redux/api/studentApi";
import AIThesisOverview from "./AIThesisOverview";
import PassionTestWizard from "./PassionTestWizard";
import VisionTestWizard from "./VisionTestWizard";
import MentorFeedbackModal from "./MentorFeedbackModal";
import PurposeEvolutionModal from "./PurposeEvolutionModal";
import AIThesisReportPDF from "./AIThesisReportPDF";
import Loader from "../../shared/loader/Loader";
import { Flame, Compass, Sparkles, ArrowRight, Edit3 } from "lucide-react";
import { toast } from "react-toastify";

export default function AIThesisContainer({
  studentId,
  isFacultyView = false,
}) {
  const [activeTestModal, setActiveTestModal] = useState(null); // "passion" | "vision" | null
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
  const versions = versionsQuery.data?.data || versionsQuery.data || [];

  const [saveDraftFaculty, { isLoading: isSavingFaculty }] = useSaveStudentDraftThesisMutation();
  const [saveDraftStudent, { isLoading: isSavingStudent }] = useSaveMyDraftThesisMutation();

  const [analyzeFaculty, { isLoading: isAnalyzingFaculty }] = useAnalyzeStudentThesisMutation();
  const [analyzeStudent, { isLoading: isAnalyzingStudent }] = useAnalyzeMyThesisMutation();

  const [startNewVerFaculty] = useStartStudentNewThesisVersionMutation();
  const [startNewVerStudent] = useStartMyNewThesisVersionMutation();

  const [updateStmtFaculty] = useUpdateStudentThesisStatementsMutation();
  const [updateStmtStudent] = useUpdateMyThesisStatementsMutation();

  const [addFeedback, { isLoading: isSubmittingFeedback }] = useAddThesisMentorFeedbackMutation();
  const [updateFacultyAction] = useUpdateThesisFacultyActionMutation();

  const isSaving = isFacultyView ? isSavingFaculty : isSavingStudent;
  const isAnalyzing = isFacultyView ? isAnalyzingFaculty : isAnalyzingStudent;

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

  // Evaluation of completion
  const isPassionTestCompleted = Boolean(
    assessment?.isPassionTestCompleted ||
    (assessment?.topPassions && assessment.topPassions.length >= 3)
  );

  const isVisionTestCompleted = Boolean(
    assessment?.isVisionTestCompleted ||
    (assessment?.coreValues && assessment.coreValues.length >= 2 && assessment?.fiveYearGoal)
  );

  const hasAIAnalysis = Boolean(
    assessment?.aiAnalysis ||
    (assessment?.careerDirections && assessment.careerDirections.length > 0)
  );

  // Save handler for either test
  const handleSaveTest = async (testPayload) => {
    try {
      if (isFacultyView) {
        await saveDraftFaculty({ studentId, ...testPayload }).unwrap();
      } else {
        await saveDraftStudent(testPayload).unwrap();
      }
      refetch();
      setActiveTestModal(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save test responses");
    }
  };

  // Run AI Analysis on both tests
  const handleAnalyzeBoth = async () => {
    try {
      if (isFacultyView) {
        await analyzeFaculty({ studentId }).unwrap();
      } else {
        await analyzeStudent().unwrap();
      }
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
      if (isFacultyView) {
        await startNewVerFaculty(studentId).unwrap();
      } else {
        await startNewVerStudent().unwrap();
      }
      setSelectedVersion(null);
      refetch();
      toast.info("New assessment version initiated.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to start new version");
    }
  };

  const handleUpdateStatements = async (updateData) => {
    if (isFacultyView) {
      return updateStmtFaculty({ studentId, ...updateData }).unwrap();
    }
    return updateStmtStudent(updateData).unwrap();
  };

  const handleAddMentorFeedback = async (feedbackData) => {
    try {
      await addFeedback({ studentId, ...feedbackData }).unwrap();
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
      await updateFacultyAction({ studentId: targetId, ...actionData }).unwrap();
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update action");
    }
  };

  // Render Test Modal (Passion or Vision)
  const renderActiveTestModal = () => {
    if (!activeTestModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
        <div className="w-full max-w-4xl my-auto">
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

  // ── Clean & Minimal Starting Test Hub (Less Data Upfront) ──
  const renderTestHub = () => (
    <div className="space-y-5">
      {/* Friendly Hero Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-3xl p-5 sm:p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-white/80 bg-white/20 px-2.5 py-0.5 rounded-full inline-block">
            Self-Discovery
          </span>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
            Passion & Vision Discovery
          </h2>
          <p className="text-xs text-white/90 font-medium">
            Take these two short tests to uncover what energizes you and clarify where you're headed.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto bg-white/15 backdrop-blur-xs px-3.5 py-2 rounded-2xl border border-white/20 text-xs font-bold shrink-0">
          <span>Status:</span>
          <span className="font-black text-amber-100">
            {(isPassionTestCompleted ? 1 : 0) + (isVisionTestCompleted ? 1 : 0)} of 2 Completed
          </span>
        </div>
      </div>

      {/* 2 Clean & Focused Test Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Test 1: Passion Test */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-orange-300 transition">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
                <Flame size={22} />
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isPassionTestCompleted
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {isPassionTestCompleted ? "✓ Completed" : "Not Started"}
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-gray-900">
                1. Passion Test
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Discover what naturally energizes you, pick your top passions, and see your current focus gap.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTestModal("passion")}
            className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
          >
            <Edit3 size={14} />
            <span>{isPassionTestCompleted ? "Review / Edit Passion Test" : "Start Passion Test"}</span>
          </button>
        </div>

        {/* Test 2: Vision Test */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-300 transition">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                <Compass size={22} />
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isVisionTestCompleted
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                }`}
              >
                {isVisionTestCompleted ? "✓ Completed" : "Not Started"}
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-gray-900">
                2. Vision Test
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Select your core guiding values, state your driving purpose, and set your 5-year goal.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTestModal("vision")}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
          >
            <Edit3 size={14} />
            <span>{isVisionTestCompleted ? "Review / Edit Vision Test" : "Start Vision Test"}</span>
          </button>
        </div>
      </div>

      {/* AI Synthesis Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black text-gray-900">
              {hasAIAnalysis ? "AI Result Ready" : "Generate AI Result"}
            </h4>
            <p className="text-xs text-gray-500 font-medium">
              {isPassionTestCompleted || isVisionTestCompleted
                ? "Combine your tests with AI to reveal your personalized career directions."
                : "Complete at least one test above to generate your AI discovery result."}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isAnalyzing || (!isPassionTestCompleted && !isVisionTestCompleted)}
          onClick={handleAnalyzeBoth}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap self-start sm:self-auto shrink-0"
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Analyzing with AI...</span>
            </>
          ) : (
            <>
              <Sparkles size={15} />
              <span>{hasAIAnalysis ? "Re-Analyze & Update" : "Analyze & View Result"}</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Top Header Bar & Mode Toggle (Shown when report exists) ── */}
      {hasAIAnalysis && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-gray-900">Passion & Vision</h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  Version {assessment?.assessmentVersion || 1}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Student Purpose, Passion, Vision & Career Discovery
              </p>
            </div>
          </div>

          <div className="flex items-center bg-gray-100 p-1 rounded-2xl gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode("report")}
              className={`px-4 py-2 rounded-xl transition ${
                viewMode === "report"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              📊 Result & Thesis
            </button>
            <button
              type="button"
              onClick={() => setViewMode("tests")}
              className={`px-4 py-2 rounded-xl transition ${
                viewMode === "tests"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              📝 Manage Tests
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content Area ── */}
      {!hasAIAnalysis || viewMode === "tests" ? (
        renderTestHub()
      ) : (
        <div className="space-y-6">
          {/* Quick banner to edit tests if in report view */}
          <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-orange-950">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-orange-500 shrink-0" />
              <span>
                Want to refine your answers? You can update your <strong>Passion Test</strong> or <strong>Vision Test</strong> anytime and re-run the AI analysis.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setViewMode("tests")}
              className="font-black text-orange-700 hover:underline shrink-0 text-left"
            >
              Manage Tests →
            </button>
          </div>

          <AIThesisOverview
            assessment={assessment}
            studentContext={studentContext}
            isFacultyView={isFacultyView}
            onUpdateStatements={handleUpdateStatements}
            onStartNewVersion={handleStartNewVersion}
            onOpenEvolutionModal={() => setIsEvolutionModalOpen(true)}
            onOpenMentorFeedbackModal={() => setIsMentorModalOpen(true)}
            onPrintReport={() => setIsPdfModalOpen(true)}
            onUpdateFacultyAction={handleUpdateFacultyAction}
          />
        </div>
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
