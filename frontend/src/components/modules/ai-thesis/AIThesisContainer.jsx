import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGetStudentThesisQuery,
  useGetStudentThesisVersionsQuery,
  useUploadStudentHandwrittenExerciseMutation,
  useDeleteStudentHandwrittenPageMutation,
  useAnalyzeStudentThesisMutation,
  useStartStudentNewThesisVersionMutation,
  useUpdateStudentThesisStatementsMutation,
  useAddThesisMentorFeedbackMutation,
  useUpdateThesisFacultyActionMutation,
} from "../../../redux/api/authApi";
import {
  useGetMyStudentThesisQuery,
  useGetMyThesisVersionsQuery,
  useUploadMyHandwrittenExerciseMutation,
  useDeleteMyHandwrittenPageMutation,
  useAnalyzeMyThesisMutation,
  useStartMyNewThesisVersionMutation,
  useUpdateMyThesisStatementsMutation,
} from "../../../redux/api/studentApi";
import AIThesisOverview from "./AIThesisOverview";
import HandwrittenVisionaryUpload from "./HandwrittenVisionaryUpload";
import MentorFeedbackModal from "./MentorFeedbackModal";
import PurposeEvolutionModal from "./PurposeEvolutionModal";
import AIThesisReportPDF from "./AIThesisReportPDF";
import Loader from "../../shared/loader/Loader";
import {
  Sparkles,
  ArrowRight,
  Clock,
  RefreshCw,
  Printer,
  MessageSquare,
  Award,
  BookOpen,
  User,
  LayoutDashboard,
  FileText,
  UploadCloud,
} from "lucide-react";
import { toast } from "react-toastify";

export default function AIThesisContainer({
  studentId,
  isFacultyView = false,
}) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("report"); // "report" | "upload"
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

  const [uploadFaculty, { isLoading: isUploadingFaculty }] = useUploadStudentHandwrittenExerciseMutation();
  const [uploadStudent, { isLoading: isUploadingStudent }] = useUploadMyHandwrittenExerciseMutation();

  const [deletePageFaculty] = useDeleteStudentHandwrittenPageMutation();
  const [deletePageStudent] = useDeleteMyHandwrittenPageMutation();

  const [analyzeFaculty, { isLoading: isAnalyzingFaculty }] = useAnalyzeStudentThesisMutation();
  const [analyzeStudent, { isLoading: isAnalyzingStudent }] = useAnalyzeMyThesisMutation();

  const [startNewVerFaculty] = useStartStudentNewThesisVersionMutation();
  const [startNewVerStudent] = useStartMyNewThesisVersionMutation();

  const [updateStmtFaculty] = useUpdateStudentThesisStatementsMutation();
  const [updateStmtStudent] = useUpdateMyThesisStatementsMutation();

  const [addFeedback, { isLoading: isSubmittingFeedback }] = useAddThesisMentorFeedbackMutation();
  const [updateFacultyAction] = useUpdateThesisFacultyActionMutation();

  const isUploading = isFacultyView ? isUploadingFaculty : isUploadingStudent;
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
      setViewMode("upload");
    }
  };

  // Upload handwritten pages handler
  const handleUploadHandwritten = async (formDataOrData) => {
    try {
      const ver = selectedVersion || currentVersionNumber;
      if (isFacultyView) {
        if (formDataOrData instanceof FormData) {
          formDataOrData.append("studentId", studentId);
          await uploadFaculty({ studentId, data: formDataOrData }).unwrap();
        } else {
          await uploadFaculty({ studentId, version: ver, ...formDataOrData }).unwrap();
        }
      } else {
        await uploadStudent(formDataOrData).unwrap();
      }
      versionsQuery.refetch?.();
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to upload handwritten pages");
      throw err;
    }
  };

  // Delete page handler
  const handleDeleteHandwrittenPage = async (payload) => {
    try {
      if (isFacultyView) {
        await deletePageFaculty({ studentId, ...payload }).unwrap();
      } else {
        await deletePageStudent(payload).unwrap();
      }
      versionsQuery.refetch?.();
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to delete page");
      throw err;
    }
  };

  // Run AI analysis on handwritten exercise
  const handleAnalyzeHandwrittenExercise = async (payload = {}) => {
    try {
      const ver = selectedVersion || currentVersionNumber;
      if (isFacultyView) {
        await analyzeFaculty({ studentId, version: ver, ...payload }).unwrap();
      } else {
        await analyzeStudent({ version: ver, ...payload }).unwrap();
      }
      versionsQuery.refetch?.();
      refetch();
      setViewMode("report");
      toast.success("Multimodal AI analyzed your handwritten exercise and generated your thesis! ✨");
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to analyze handwritten exercise");
      throw err;
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
      setViewMode("upload");
      toast.info(`Version ${newVer || ""} draft initiated. You can upload fresh handwritten exercise sheets.`);
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
              {hasAIAnalysis ? "✓ AI Thesis Analyzed" : "Handwritten Exercise Draft"}
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

            {/* View Mode Toggle (Report vs Upload) */}
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
                  📊 Thesis Report
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("upload")}
                  className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                    viewMode === "upload"
                      ? "bg-white text-orange-950 shadow-2xs font-black"
                      : "text-orange-700 hover:text-orange-900"
                  }`}
                >
                  ✍️ Handwritten Sheets
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main Content Area ── */}
      {!hasAIAnalysis || viewMode === "upload" ? (
        <HandwrittenVisionaryUpload
          assessment={assessment}
          studentContext={studentContext}
          isFacultyView={isFacultyView}
          studentId={studentId}
          onUploadExercise={handleUploadHandwritten}
          onDeletePage={handleDeleteHandwrittenPage}
          onAnalyzeExercise={handleAnalyzeHandwrittenExercise}
          isAnalyzing={isAnalyzing}
          isUploading={isUploading}
          onSwitchToReport={hasAIAnalysis ? () => setViewMode("report") : null}
        />
      ) : (
        <AIThesisOverview
          assessment={assessment}
          studentContext={studentContext}
          isFacultyView={isFacultyView}
          onOpenMentorFeedbackModal={() => setIsMentorModalOpen(true)}
          onUpdateFacultyAction={handleUpdateFacultyAction}
          onUpdateStatements={handleUpdateStatements}
          onSwitchToUpload={() => setViewMode("upload")}
        />
      )}

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

      {/* Modals */}
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
