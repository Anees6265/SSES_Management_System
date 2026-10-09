import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  Download,
  X,
  Sparkles,
  Award,
  Compass,
  Flame,
  CheckCircle2,
  Target,
  TrendingUp,
  UserCheck,
  ShieldCheck,
  FileText,
  Loader2,
  BookOpen,
  ArrowRight,
  Clock,
  Layers,
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export default function AIThesisReportPDF({ isOpen, onClose, assessment, studentContext }) {
  const printAreaRef = useRef(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove("printing-ai-thesis");
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.classList.remove("printing-ai-thesis");
    };
  }, []);

  if (!isOpen) return null;

  // Student Profile Context
  const studentName =
    studentContext?.name ||
    (studentContext?.firstName ? `${studentContext.firstName} ${studentContext.lastName || ""}`.trim() : "Student");
  const prkey = studentContext?.prkey || studentContext?.studentId || "SSES-STU";
  const course = studentContext?.course || studentContext?.program || "Undergraduate Program";
  const level = `${studentContext?.currentLevel || "Level 1"}${studentContext?.currentSubLevel ? ` (${studentContext.currentSubLevel})` : ""}`;

  // Evidence validation & reconciliation layer: do not fabricate placeholders
  const evidenceValidation = assessment?.evidenceValidation || {};
  const isEvidenceVerified = evidenceValidation?.validationStatus === "Verified";
  const attendance =
    evidenceValidation?.verifiedAttendanceRate !== undefined && evidenceValidation?.verifiedAttendanceRate !== null
      ? `${evidenceValidation.verifiedAttendanceRate}%`
      : studentContext?.attendanceRate
      ? `${studentContext.attendanceRate}%`
      : "Data unavailable";
  const taskRate =
    evidenceValidation?.verifiedTaskCompletionRate !== undefined && evidenceValidation?.verifiedTaskCompletionRate !== null
      ? `${evidenceValidation.verifiedTaskCompletionRate}%`
      : studentContext?.taskMetrics?.taskCompletionRate
      ? `${studentContext.taskMetrics.taskCompletionRate}%`
      : "Data unavailable";

  const version = assessment?.assessmentVersion || 1;
  const status = assessment?.status ? assessment.status.toUpperCase() : "ANALYZED";
  const assessmentDate = assessment?.updatedAt
    ? new Date(assessment.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const alignmentScores = assessment?.alignmentScores || {};
  const indicators = assessment?.developmentIndicators || {};
  const archetype = assessment?.archetype || {};
  const topPassions = assessment?.topPassions || [];
  const coreValues = assessment?.coreValues || [];
  const strengths = assessment?.strengths || [];
  const developmentAreas = assessment?.developmentAreas || [];
  const careerDirections = assessment?.careerDirections || [];
  const roadmap = assessment?.roadmap || {};
  const facultyFeedback = assessment?.facultyFeedback || [];
  const facultyInterventions = assessment?.facultyInterventions || [];
  const understandMyself = assessment?.understandMyself || {};
  const recurringPatterns = assessment?.recurringPatterns || [];
  const visionExercises = assessment?.visionExercises || {};
  const detailedRoadmap = assessment?.detailedRoadmap || {};
  const practicalExperiments = assessment?.practicalExperiments || [];

  // Discovery State (Tri-pillar distinction: explicit, inferred, uncertain)
  const discoveryState = assessment?.discoveryState || {};
  const explicitlyStated = discoveryState.explicitlyStated || [];
  const inferredPatterns = discoveryState.inferredPatterns || [];
  const openUncertainties = discoveryState.openUncertainties || [];

  // 1. Browser Native High-Resolution Vector Print / Save as PDF
  const handlePrint = () => {
    document.body.classList.add("printing-ai-thesis");
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove("printing-ai-thesis");
      }, 500);
    }, 100);
  };

  // 2. Direct PDF File Download (.pdf) via html2canvas & jsPDF
  const handleDownloadDirectPDF = async () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const element = printAreaRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1200,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      let heightLeft = contentHeight;
      let position = margin;

      // Page 1
      pdf.addImage(imgData, "JPEG", margin, position, contentWidth, contentHeight, undefined, "FAST");
      heightLeft -= pageHeight - margin * 2;

      // Subsequent pages if document height exceeds single A4
      while (heightLeft > 0) {
        position = heightLeft - contentHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", margin, position, contentWidth, contentHeight, undefined, "FAST");
        heightLeft -= pageHeight - margin * 2;
      }

      const safeName = studentName.replace(/[^a-zA-Z0-9_-]/g, "_");
      pdf.save(`${safeName}_AI_Thesis_Report_v${version}.pdf`);
    } catch (err) {
      console.error("Direct PDF export error, falling back to print dialog:", err);
      handlePrint();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const modalContent = (
    <div
      id="ai-thesis-report-modal"
      className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto print:static print:inset-auto print:bg-white print:p-0 print:m-0 print:overflow-visible print:block print:w-full print:h-auto print:max-h-none print:z-auto"
    >
      <div className="thesis-modal-card bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 print:rounded-none print:shadow-none print:border-none print:max-h-none print:w-full print:max-w-none print:overflow-visible print:p-0 print:m-0">
        
        {/* Modal Controls Toolbar (Hidden in Print) */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-black">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">Student AI Thesis Report</h3>
              <p className="text-[11px] text-slate-500">
                Sant Singaji Educational Society (SSES) • Official Academic Document
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadDirectPDF}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-60"
              title="Download PDF File directly to your device"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Download .PDF</span>
                </>
              )}
            </button>

            {/* Print / Save as PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              title="Open Browser Print & Save as PDF Dialog"
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              title="Close Report Preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div
          ref={printAreaRef}
          id="ai-thesis-printable-document"
          className="p-6 sm:p-10 overflow-y-auto space-y-6 text-slate-900 bg-white print:overflow-visible print:max-h-none print:p-0 print:m-0 print:space-y-5"
        >
          {/* ─────────────────────────────────────────────────────────────
              1. OFFICIAL INSTITUTION LETTERHEAD & SEAL BANNER
          ───────────────────────────────────────────────────────────── */}
          <div className="thesis-print-card border-b-2 border-slate-900 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                {/* Official Seal Emblem */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-600 to-orange-500 text-white flex items-center justify-center font-black shadow-sm shrink-0 border border-orange-700">
                  <div className="text-center">
                    <span className="block text-[14px] leading-tight tracking-wider font-extrabold">SSES</span>
                    <span className="block text-[8px] tracking-widest text-orange-100 uppercase">SANSTHA</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-widest text-orange-600">
                      SANT SINGAJI EDUCATIONAL SOCIETY (SSES)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold uppercase tracking-wider">
                      Accredited
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                    Official Student Purpose, Vision & Development Thesis
                  </h1>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Center for Academic Purpose Intelligence, Leadership & Career Roadmaps
                  </p>
                </div>
              </div>

              {/* Document Reference Box */}
              <div className="text-left sm:text-right text-xs space-y-1 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border sm:border-none border-slate-200">
                <p className="font-mono text-[11px] font-bold text-slate-500">
                  DOC ID: <span className="text-slate-900">SSES-PV-{prkey}-V{version}</span>
                </p>
                <p className="text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800">Date:</span> {assessmentDate}
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                  <ShieldCheck size={11} /> {status}
                </div>
              </div>
            </div>

            {/* Academic Student Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3.5 border-t border-slate-200 text-xs">
              <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Student Name</span>
                <span className="font-black text-slate-900 text-xs sm:text-sm truncate block mt-0.5">
                  {studentName}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">PR: {prkey}</span>
              </div>
              <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Course / Program</span>
                <span className="font-bold text-slate-800 text-xs truncate block mt-0.5">
                  {course}
                </span>
                <span className="text-[10px] text-slate-500">Curriculum Track</span>
              </div>
              <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Academic Level</span>
                <span className="font-bold text-slate-800 text-xs block mt-0.5">
                  {level}
                </span>
                <span className="text-[10px] text-slate-500">Standing Evaluation</span>
              </div>
              <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Execution Metrics</span>
                <span className="font-bold text-slate-800 text-xs block mt-0.5">
                  Tasks: <strong className="text-emerald-600">{taskRate}</strong>
                </span>
                <span className="text-[10px] text-slate-500">
                  Attendance: <strong className="text-indigo-600">{attendance}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              2. EXECUTIVE AI ARCHETYPE & SYNTHESIS
          ───────────────────────────────────────────────────────────── */}
          {(archetype.primaryPattern || assessment?.aiAnalysis?.summary) && (
            <div className="thesis-print-card rounded-2xl bg-gradient-to-r from-orange-50/70 via-amber-50/50 to-indigo-50/50 border border-orange-200/80 p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-orange-600" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                    Executive Orientation & Development Archetype
                  </span>
                </div>
                {archetype.primaryPattern && (
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-black tracking-wide uppercase shadow-2xs">
                    Primary: {archetype.primaryPattern}
                  </span>
                )}
              </div>
              {archetype.secondaryPattern && (
                <p className="text-[11px] font-bold text-slate-600 mb-1">
                  Secondary Complementary Pattern: <span className="text-indigo-700">{archetype.secondaryPattern}</span>
                </p>
              )}
              {archetype.description && (
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {archetype.description}
                </p>
              )}
              {assessment?.aiAnalysis?.summary && (
                <div className="mt-2 pt-2 border-t border-orange-200/60 text-xs text-slate-600 italic">
                  "{assessment.aiAnalysis.summary}"
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              3. CORE PURPOSE & LONG-TERM VISION STATEMENTS
          ───────────────────────────────────────────────────────────── */}
          <div className="thesis-print-card grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Purpose Statement */}
            <div className="border border-orange-200 bg-orange-50/40 rounded-2xl p-4.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Flame size={14} className="text-orange-600" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-orange-800">
                      1. Core Purpose Statement
                    </span>
                  </div>
                  {(assessment?.confirmedPurpose || assessment?.isPurposeAccepted) && (
                    <span className="text-[9px] font-black uppercase tracking-wider bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">
                      ✓ Confirmed by Student
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-black text-slate-900 leading-relaxed">
                  "{assessment?.confirmedPurpose || assessment?.purposeStatement || "Living a life centered on service, problem-solving, and continuous learning."}"
                </p>
              </div>
              <p className="text-[10px] text-orange-700/80 mt-3 font-medium">
                Why I exist, what drives my core contributions, and how I create value for society.
              </p>
            </div>

            {/* Vision Statement */}
            <div className="border border-indigo-200 bg-indigo-50/40 rounded-2xl p-4.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Compass size={14} className="text-indigo-600" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-800">
                      2. Long-Term Vision Statement
                    </span>
                  </div>
                  {(assessment?.confirmedVision || assessment?.isVisionAccepted) && (
                    <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                      ✓ Confirmed by Student
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-black text-slate-900 leading-relaxed">
                  "{assessment?.confirmedVision || assessment?.visionStatement || "To build industry-standard competencies and spearhead transformative technology initiatives."}"
                </p>
              </div>
              <p className="text-[10px] text-indigo-700/80 mt-3 font-medium">
                Where I am heading, my 5-to-10 year strategic horizon, and envisioned impact.
              </p>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              3B. PERSONAL DISCOVERY & EVIDENCE BREAKDOWN (IF PRESENT)
          ───────────────────────────────────────────────────────────── */}
          {(explicitlyStated.length > 0 || inferredPatterns.length > 0 || openUncertainties.length > 0) && (
            <div className="thesis-print-card border border-slate-200 rounded-2xl p-4 bg-slate-50/30">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-indigo-600" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                    Personal Discovery Breakdown: Explicit vs Inferred vs Uncertainties
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 font-semibold uppercase">
                  Transparent AI Insights
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-emerald-100 space-y-1">
                  <strong className="text-[10px] uppercase font-black tracking-wider text-emerald-800 block">
                    ✓ Explicitly Stated:
                  </strong>
                  <ul className="text-[11px] text-slate-700 space-y-0.5 list-disc pl-3">
                    {explicitlyStated.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-indigo-100 space-y-1">
                  <strong className="text-[10px] uppercase font-black tracking-wider text-indigo-800 block">
                    ⚡ Inferred AI Patterns:
                  </strong>
                  <ul className="text-[11px] text-slate-700 space-y-0.5 list-disc pl-3">
                    {inferredPatterns.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-amber-100 space-y-1">
                  <strong className="text-[10px] uppercase font-black tracking-wider text-amber-800 block">
                    ? Open Uncertainties:
                  </strong>
                  <ul className="text-[11px] text-slate-700 space-y-0.5 list-disc pl-3">
                    {openUncertainties.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              4. MULTI-DIMENSIONAL DEVELOPMENT INDICATORS (0-100 SCALE)
          ───────────────────────────────────────────────────────────── */}
          <div className="thesis-print-card border border-slate-200 rounded-2xl p-4.5 bg-slate-50/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target size={15} className="text-slate-700" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                  Transparent Development Indicators (0–100 Scale)
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-500">
                Mentoring Guidance Indicators
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 text-center text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Passion Clarity</span>
                <span className="font-black text-orange-600 text-sm sm:text-base mt-0.5 block">
                  {indicators.passionClarity?.score ?? alignmentScores.passionClarity ?? 85}%
                </span>
                <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-orange-500 h-full rounded-full" style={{ width: `${indicators.passionClarity?.score ?? alignmentScores.passionClarity ?? 85}%` }} />
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Purpose Clarity</span>
                <span className="font-black text-indigo-600 text-sm sm:text-base mt-0.5 block">
                  {indicators.purposeClarity?.score ?? alignmentScores.purposeClarity ?? 80}%
                </span>
                <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${indicators.purposeClarity?.score ?? alignmentScores.purposeClarity ?? 80}%` }} />
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Vision Clarity</span>
                <span className="font-black text-blue-600 text-sm sm:text-base mt-0.5 block">
                  {indicators.visionClarity?.score ?? alignmentScores.visionClarity ?? 82}%
                </span>
                <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${indicators.visionClarity?.score ?? alignmentScores.visionClarity ?? 82}%` }} />
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Skill Alignment</span>
                <span className="font-black text-emerald-600 text-sm sm:text-base mt-0.5 block">
                  {indicators.skillAlignment?.score ?? alignmentScores.skillAlignment ?? 75}%
                </span>
                <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${indicators.skillAlignment?.score ?? alignmentScores.skillAlignment ?? 75}%` }} />
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Goal Alignment</span>
                <span className="font-black text-purple-600 text-sm sm:text-base mt-0.5 block">
                  {indicators.goalAlignment?.score ?? alignmentScores.goalAlignment ?? 84}%
                </span>
                <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${indicators.goalAlignment?.score ?? alignmentScores.goalAlignment ?? 84}%` }} />
                </div>
              </div>

              <div className="p-2.5 bg-orange-50/80 rounded-xl border border-orange-200 shadow-2xs">
                <span className="block text-orange-800 text-[10px] font-black uppercase tracking-wider">Guidance Index</span>
                <span className="font-black text-orange-700 text-sm sm:text-base mt-0.5 block">
                  {indicators.overallIndex?.score ?? alignmentScores.overall ?? 78}%
                </span>
                <div className="w-full bg-orange-200 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-orange-600 h-full rounded-full" style={{ width: `${indicators.overallIndex?.score ?? alignmentScores.overall ?? 78}%` }} />
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 text-center mt-2.5 italic">
              {indicators.disclaimer || "Scores are transparent developmental guidance indicators for student mentoring, not validated psychometric or psychological assessments."}
            </p>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              5. RANKED TOP PASSIONS & CORE LIVING MARKERS
          ───────────────────────────────────────────────────────────── */}
          <div className="thesis-print-card border border-slate-200 rounded-2xl p-4.5">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Flame size={15} className="text-orange-500" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                  3. Ranked Top Passions & Weekly Assessment Markers
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">
                Discovered via Pairwise Priority Assessment
              </span>
            </div>

            <div className="space-y-3">
              {topPassions.length > 0 ? (
                topPassions.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2 font-black text-slate-900">
                        <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] shrink-0 font-extrabold">
                          #{idx + 1}
                        </span>
                        <span className="text-xs sm:text-sm">{p.name}</span>
                      </div>
                      {p.markers && p.markers.length > 0 && (
                        <div className="pl-7 space-y-0.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Observable Weekly Markers:
                          </p>
                          <ul className="text-[11px] text-slate-600 space-y-0.5">
                            {p.markers.map((m, mIdx) => (
                              <li key={mIdx} className="flex items-start gap-1.5">
                                <span className="text-orange-500 font-bold">•</span>
                                <span>{m}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="sm:text-right shrink-0 pl-7 sm:pl-0">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-orange-100 border border-orange-200 font-black text-orange-700 text-xs">
                        Current Living: {p.currentScore ?? 7}/10
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic p-3">No ranked passions recorded in this version.</p>
              )}
            </div>
          </div>

          {/* Understand Myself & Recurring Patterns */}
          {(understandMyself?.experiences || recurringPatterns?.length > 0) && (
            <div className="thesis-print-card border border-slate-200 rounded-2xl p-4.5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UserCheck size={15} className="text-cyan-600" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                    Understand Myself & Recurring Behavioral Drivers
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">
                  Student-Reported Reflections & Inferred Patterns
                </span>
              </div>

              {understandMyself.experiences && (
                <div className="p-3 rounded-xl bg-cyan-50/40 border border-cyan-100 text-xs space-y-1">
                  <strong className="text-[10px] uppercase font-bold text-cyan-900 block">Meaningful Real Experience:</strong>
                  <p className="text-slate-700 italic">"{understandMyself.experiences}"</p>
                </div>
              )}

              {recurringPatterns.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                  {recurringPatterns.map((pat, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-purple-50/40 border border-purple-100 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-purple-950 font-black">{idx + 1}. {pat.pattern}</strong>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 uppercase">
                          {pat.source}
                        </span>
                      </div>
                      {pat.supportingAnswers?.length > 0 && (
                        <p className="text-[10px] text-slate-600">
                          <strong>Evidence:</strong> {pat.supportingAnswers.join(" • ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              6. CORE GUIDING VALUES, BHAG & ENVISIONED FUTURE
          ───────────────────────────────────────────────────────────── */}
          <div className="thesis-print-card grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Core Values */}
            <div className="border border-slate-200 rounded-2xl p-4.5 bg-slate-50/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-200/60">
                  <Award size={14} className="text-slate-700" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                    4. Guiding Core Values
                  </span>
                </div>
                <div className="space-y-2 mt-2">
                  {coreValues.length > 0 ? (
                    coreValues.map((v, i) => (
                      <div key={i} className="p-2 rounded-xl bg-white border border-slate-200 text-xs">
                        <strong className="text-slate-900 font-bold block">{v.name}</strong>
                        {v.whyImportant && (
                          <p className="text-[11px] text-slate-500 mt-0.5 italic">{v.whyImportant}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {["Integrity", "Excellence", "Curiosity", "Empathy", "Accountability"].map((val, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700">
                          {val}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-3">
                Non-negotiable ethical anchors guiding academic decision-making and character.
              </p>
            </div>

            {/* BHAG & Envisioned Future */}
            <div className="border border-indigo-200 bg-indigo-50/20 rounded-2xl p-4.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-indigo-200/60">
                  <Sparkles size={14} className="text-indigo-600" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900">
                    10-Year Big Future Goal (BHAG)
                  </span>
                </div>
                {assessment?.bhag ? (
                  <div className="p-3 bg-white rounded-xl border border-indigo-100 text-xs font-black text-slate-900 leading-snug">
                    "{assessment.bhag}"
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No BHAG defined for this assessment version.</p>
                )}

                {assessment?.vividFuture && (
                  <div className="mt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block mb-1">
                      Envisioned Future Narrative:
                    </span>
                    <p className="text-[11px] text-slate-600 leading-relaxed italic bg-white/70 p-2.5 rounded-xl border border-indigo-100">
                      "{assessment.vividFuture}"
                    </p>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-indigo-700/80 mt-3 font-medium">
                Audacious long-term target that demands persistent continuous improvement.
              </p>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              7. STRENGTHS & DEVELOPMENT AREAS
          ───────────────────────────────────────────────────────────── */}
          <div className="thesis-print-card grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="border border-emerald-200 bg-emerald-50/30 rounded-2xl p-4.5">
              <div className="flex items-center gap-2 mb-2.5 pb-1.5 border-b border-emerald-200">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900">
                  5. Demonstrated Strengths & Core Capabilities
                </span>
              </div>
              <ul className="text-xs space-y-1.5 font-medium text-slate-700">
                {strengths.length > 0 ? (
                  strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-black mt-0.5">✓</span>
                      <span className="leading-snug">{s}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-400 italic">No strengths documented.</li>
                )}
              </ul>
            </div>

            {/* Development Areas */}
            <div className="border border-amber-200 bg-amber-50/30 rounded-2xl p-4.5">
              <div className="flex items-center gap-2 mb-2.5 pb-1.5 border-b border-amber-200">
                <TrendingUp size={14} className="text-amber-700" />
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                  6. Priority Developmental Growth Areas & Skill Gaps
                </span>
              </div>
              <ul className="text-xs space-y-1.5 font-medium text-slate-700">
                {developmentAreas.length > 0 ? (
                  developmentAreas.map((d, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-600 font-black mt-0.5">→</span>
                      <span className="leading-snug">{d}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-400 italic">No priority development areas documented.</li>
                )}
              </ul>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              8. STRATEGIC CAREER DIRECTIONS & MULTI-HORIZON ROADMAP
          ───────────────────────────────────────────────────────────── */}
          <div className="thesis-print-card border border-slate-200 rounded-2xl p-4.5">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Compass size={15} className="text-indigo-600" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                  7. Strategic Career Directions & Multi-Horizon Roadmap
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                AI Alignment Synthesis
              </span>
            </div>

            {/* Recommended Career Tracks */}
            {careerDirections.length > 0 && (
              <div className="mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Targeted Career Pathways & Alignment Rationale:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                  {careerDirections.map((c, i) => (
                    <div key={i} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-black text-slate-900 text-xs sm:text-sm">{c.title}</span>
                          {c.fitScore && (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold shrink-0">
                              {c.fitScore}% Fit
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug mt-1">
                          {c.alignmentRationale}
                        </p>
                      </div>
                      {c.experiments && c.experiments.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[10px] text-indigo-700 font-semibold">
                          14-Day Sprint: {c.experiments[0]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Multi-Horizon Roadmap */}
            <div className="pt-3 border-t border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Multi-Horizon Developmental Action Plan:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* 3 Months */}
                <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-200">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Clock size={12} className="text-orange-600" />
                    <strong className="text-orange-700 text-[11px] font-black uppercase tracking-wider">
                      Horizon 1: 3 Months (Immediate)
                    </strong>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-700">
                    {(roadmap.threeMonths || [
                      "Establish daily deliberate coding/technical practice rituals.",
                      "Build foundation portfolio repository with clean documentation.",
                      "Schedule bi-weekly mentorship review with assigned faculty."
                    ]).map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-orange-500 font-bold">•</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 6 Months */}
                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Layers size={12} className="text-indigo-600" />
                    <strong className="text-indigo-700 text-[11px] font-black uppercase tracking-wider">
                      Horizon 2: 6 Months (Capabilities)
                    </strong>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-700">
                    {(roadmap.sixMonths || [
                      "Deliver two production-ready capstone systems addressing real problems.",
                      "Participate in collegiate hackathons or technical competitions.",
                      "Attain verified intermediate competencies in chosen domain."
                    ]).map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-indigo-500 font-bold">•</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 12 Months */}
                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Target size={12} className="text-emerald-600" />
                    <strong className="text-emerald-700 text-[11px] font-black uppercase tracking-wider">
                      Horizon 3: 12 Months (Readiness)
                    </strong>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-700">
                    {(roadmap.twelveMonths || [
                      "Secure targeted industry internship or competitive technical fellowship.",
                      "Publish technical thesis findings or open-source contribution.",
                      "Complete pre-placement technical and behavioral mock interview panels."
                    ]).map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Structured Practical Experiments & 30-Day Discovery Actions */}
          {(practicalExperiments.length > 0 || detailedRoadmap?.thirtyDayActions?.length > 0) && (
            <div className="thesis-print-card border border-emerald-200 bg-emerald-50/20 rounded-2xl p-4.5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                <div className="flex items-center gap-2">
                  <Target size={15} className="text-emerald-700" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-950">
                    Low-Cost Practical Experiments & 30-Day Discovery Actions
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-800">
                  Empirical Interest Validation
                </span>
              </div>

              {practicalExperiments.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                  {practicalExperiments.map((exp, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1.5">
                      <strong className="text-emerald-900 block font-black text-xs">{exp.title}</strong>
                      <p className="text-[11px] text-slate-700">{exp.whatToDo}</p>
                      <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between">
                        <span><strong>Time:</strong> {exp.timeRequired}</span>
                        <span><strong>Status:</strong> {exp.status || "Planned"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {detailedRoadmap?.thirtyDayActions?.length > 0 && (
                <div className="pt-2 border-t border-emerald-200/60 text-xs">
                  <strong className="text-[10px] uppercase font-bold text-emerald-900 block mb-1">
                    First 30 Days Immediate Action Sprint:
                  </strong>
                  <ul className="space-y-1 text-[11px] text-slate-700">
                    {detailedRoadmap.thirtyDayActions.map((act, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              9. STUDENT COMMITMENT & REFLECTION (IF PRESENT)
          ───────────────────────────────────────────────────────────── */}
          {(assessment?.studentCommitment || assessment?.studentReflection) && (
            <div className="thesis-print-card border border-slate-200 rounded-2xl p-4.5 bg-slate-50/40">
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-200">
                <BookOpen size={14} className="text-slate-700" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                  8. Student Self-Reflection & Personal 14-Day Commitment
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {assessment.studentCommitment && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 block mb-1">
                      Immediate 14-Day Action Commitment:
                    </span>
                    <p className="font-semibold text-slate-800 leading-snug">
                      "{assessment.studentCommitment}"
                    </p>
                  </div>
                )}
                {assessment.studentReflection && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                      Key Self-Discovery Reflection:
                    </span>
                    <p className="text-slate-700 leading-snug italic">
                      "{assessment.studentReflection}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              10. FACULTY MENTORSHIP OBSERVATIONS & INTERVENTIONS (IF PRESENT)
          ───────────────────────────────────────────────────────────── */}
          {(facultyFeedback.length > 0 || facultyInterventions.length > 0) && (
            <div className="thesis-print-card border border-indigo-200 bg-indigo-50/20 rounded-2xl p-4.5">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-indigo-200">
                <UserCheck size={15} className="text-indigo-700" />
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900">
                  9. Faculty Mentorship Observations & Action Milestones
                </span>
              </div>

              {facultyFeedback.length > 0 && (
                <div className="space-y-2 mb-3">
                  {facultyFeedback.map((fb, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white border border-indigo-100 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-slate-900">
                          {fb.facultyName || "Assigned Faculty Advisor"} {fb.facultyRole ? `(${fb.facultyRole})` : ""}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString("en-IN") : ""}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-snug">{fb.comment}</p>
                      {fb.recommendedActions && fb.recommendedActions.length > 0 && (
                        <div className="mt-2 pt-1.5 border-t border-slate-100 text-[11px] text-indigo-700 font-medium">
                          <strong>Recommended Actions:</strong> {fb.recommendedActions.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {facultyInterventions.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 block mb-1.5">
                    Targeted Faculty Interventions & Milestones:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {facultyInterventions.map((act, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                        <div>
                          <strong className="block text-slate-800">{act.title}</strong>
                          <span className="text-[10px] text-slate-500">{act.category || "Skill Development"}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          act.status === "Completed" ? "bg-emerald-100 text-emerald-800" :
                          act.status === "In Progress" ? "bg-amber-100 text-amber-800" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {act.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              11. FORMAL INSTITUTIONAL SIGNATURES & ENDORSEMENT BLOCK
          ───────────────────────────────────────────────────────────── */}
          <div className="thesis-print-card pt-6 border-t-2 border-slate-900 mt-6">
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-8">
                <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                  <span className="text-[11px] font-mono text-slate-400 italic">Signed electronically</span>
                </div>
                <div>
                  <strong className="block text-slate-900 font-bold">{studentName}</strong>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Candidate / Student</span>
                </div>
              </div>

              <div className="space-y-8">
                <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                  <span className="text-[11px] font-mono text-slate-400 italic">Faculty Verified</span>
                </div>
                <div>
                  <strong className="block text-slate-900 font-bold">Faculty Mentor / Advisor</strong>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Purpose Thesis Cell</span>
                </div>
              </div>

              <div className="space-y-8">
                <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                  <span className="text-[11px] font-mono text-slate-400 italic">SSES Seal Authorized</span>
                </div>
                <div>
                  <strong className="block text-slate-900 font-bold">Head of Department / Dean</strong>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Sant Singaji Educational Society</span>
                </div>
              </div>
            </div>

            {/* Official Institutional Footer Notice */}
            <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 space-y-0.5">
              <p className="font-semibold text-slate-600">
                Sant Singaji Educational Society (SSES) • Center for Academic Purpose & Career Intelligence
              </p>
              <p>
                This official assessment thesis document is generated by the SSES Management System. It serves as a continuous developmental roadmap for mentoring, skill building, and career readiness.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
