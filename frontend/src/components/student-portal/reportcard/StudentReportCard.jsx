import React, { useMemo, useState } from "react";
import {
  MdSchool,
  MdStar,
  MdStarBorder,
  MdWork,
  MdCheckCircle,
  MdEmojiEvents,
  MdBarChart,
  MdPerson,
  MdVerified,
  MdSports
} from "react-icons/md";
import {
  FaDownload,
  FaPrint,
  FaGraduationCap,
  FaLaptopCode,
  FaBrain,
  FaClipboardCheck,
  FaRocket,
  FaTrophy,
  FaCheck,
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
  FaUserTie,
  FaProjectDiagram,
  FaAward
} from "react-icons/fa";
import { RiDoubleQuotesL } from "react-icons/ri";
import { useGetMyReportCardQuery, useGetMyStudentProfileQuery } from "../../../redux/api/studentApi";
import collegeLogo from "../../../assets/images/logo-ssism.png";
import itegLogo from "../../../assets/images/iteg-logo.png";
import megLogo from "../../../assets/images/meg-logo.png";
import begLogo from "../../../assets/images/beg-logo.png";
import ssecLogo from "../../../assets/images/ssec-logo.png";
import { PDFDownloadLink } from "@react-pdf/renderer";
import StudentReportPDF from "../../modules/students/StudentReportPDF";
import { detectDepartment, DEPARTMENT_CONFIGS, mapInterviewItemName, getDepartmentLogo } from "../../modules/students/reportCardDepartmentConfig";
import EmptyState from "../../shared/empty-state/EmptyState";

// ── Helpers ───────────────────────────────────────────────────────────────────

const translateLevelName = (name) => {
  if (!name) return "1st Year";
  const cleaned = name.trim().toLowerCase();
  if (cleaned.includes("level 1") || cleaned.includes("1a") || cleaned.includes("1b") || cleaned.includes("1c")) return "1st Year";
  if (cleaned.includes("level 2") || cleaned.includes("2a") || cleaned.includes("2b") || cleaned.includes("2c")) return "2nd Year";
  if (cleaned.includes("level 3") || cleaned.includes("3a") || cleaned.includes("3b") || cleaned.includes("3c")) return "3rd Year";
  if (cleaned.includes("level 4") || cleaned.includes("4a") || cleaned.includes("4b") || cleaned.includes("4c")) return "4th Year";

  const numMatch = name.match(/\d+/);
  if (numMatch) {
    const num = numMatch[0];
    if (num === "1") return "1st Year";
    if (num === "2") return "2nd Year";
    if (num === "3") return "3rd Year";
    if (num === "4") return "4th Year";
    return `${num}th Year`;
  }
  return name;
};

const gradeColor = (g = "") => {
  const u = g.toUpperCase();
  if (["A+", "A"].includes(u)) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (["B+", "B"].includes(u)) return "bg-blue-50 text-blue-700 border-blue-200";
  if (["C+", "C"].includes(u)) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
};

const readinessBadge = (s = "") => {
  if (["Ready", "Created", "Updated", "Completed"].includes(s))
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (["In Progress", "Need to improve"].includes(s))
    return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-600 border-rose-200";
};

const StarRating = ({ rating = 4, max = 5, size = "text-xs" }) => {
  const numericRating = typeof rating === "number" ? rating : parseFloat(rating) || 0;
  return (
    <div className={`flex items-center gap-0.5 text-amber-400 ${size}`}>
      {Array.from({ length: max }, (_, i) => {
        const diff = numericRating - i;
        if (diff >= 1) return <FaStar key={i} />;
        if (diff >= 0.5) return <FaStarHalfAlt key={i} />;
        return <FaRegStar key={i} className="text-slate-200" />;
      })}
    </div>
  );
};

// ── Connected Level Stepper Component (Mobile Responsive) ─────────────────────

function LevelJourneyStepper({ levels = ['1A', '1B', '1C', '2A', '2B', '2C'], currentLevel = '1A' }) {
  const currentIndex = useMemo(() => {
    const idx = levels.indexOf(currentLevel);
    return idx === -1 ? 0 : idx;
  }, [levels, currentLevel]);

  const fillPercent = useMemo(() => {
    if (levels.length <= 1) return 0;
    return (currentIndex / (levels.length - 1)) * 100;
  }, [levels.length, currentIndex]);

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-7 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <h3 className="text-sm sm:text-base font-bold text-slate-800">Academic Progression</h3>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Current: <span className="font-bold text-orange-600">Level {currentLevel}</span> · SSISM Milestone Tracker
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 sm:py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
            {Math.round(fillPercent)}% Completed
          </span>
        </div>
      </div>

      {/* Horizontal Scroll wrapper on small mobile */}
      <div className="overflow-x-auto pb-2 pt-6 sm:pt-8 scrollbar-none touch-pan-x -mx-1 px-1">
        <div className="min-w-[440px] sm:min-w-0 px-2 sm:px-6">
          <div className="relative flex items-center justify-between">
            {/* Track Background */}
            <div className="absolute left-5 right-5 top-1/2 -translate-y-1/2 h-1.5 bg-slate-100 rounded-full z-0" />

            {/* Filled Progress Line */}
            <div
              className="absolute left-5 top-1/2 -translate-y-1/2 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-orange-500 rounded-full transition-all duration-700 z-0"
              style={{ width: `calc((100% - 40px) * ${fillPercent / 100})` }}
            />

            {/* Stepper Nodes */}
            {levels.map((lvl, i) => {
              const isPassed = i < currentIndex;
              const isCurrent = i === currentIndex;
              const isUpcoming = i > currentIndex;

              return (
                <div key={lvl} className="flex flex-col items-center relative z-10">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 shadow-xs ${isPassed
                        ? "bg-emerald-500 text-white shadow-emerald-200 shadow-sm"
                        : isCurrent
                          ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white ring-4 ring-orange-100 shadow-md scale-105"
                          : "bg-white text-slate-400 border border-slate-200"
                      }`}
                  >
                    {isPassed ? <FaCheck className="text-[10px] sm:text-xs" /> : lvl}
                  </div>

                  <div className="flex flex-col items-center mt-1.5">
                    <span
                      className={`text-[10px] sm:text-[11px] font-bold ${isCurrent
                          ? "text-orange-600"
                          : isPassed
                            ? "text-emerald-700"
                            : "text-slate-400"
                        }`}
                    >
                      {lvl}
                    </span>

                    {isPassed && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5" />
                    )}
                    {isCurrent && (
                      <span className="text-[8px] font-extrabold uppercase tracking-wider px-1 py-0.2 rounded bg-orange-100 text-orange-700 mt-0.5">
                        Now
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="text-[8px] text-slate-300 mt-0.5">—</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Final Placement Goal */}
            <div className="flex flex-col items-center relative z-10">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-sm shadow-amber-200">
                <FaTrophy className="text-xs sm:text-sm" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-600 mt-1.5">Goal</span>
              <span className="text-[8px] font-medium text-slate-400 mt-0.5">Placed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Main StudentReportCard Component ──────────────────────────────────────────

export default function StudentReportCard() {
  const [mobileTab, setMobileTab] = useState("overview"); // "overview" | "subjects" | "skills" | "feedback"

  const { data: rcData, isLoading: rcLoading } = useGetMyReportCardQuery();
  const { data: profileData, isLoading: profileLoading } = useGetMyStudentProfileQuery();


  const isLoading = rcLoading || profileLoading;

  const raw = profileData?.data || {};
  const rc = rcData?.data || null;
  const name = `${raw.firstName || ""} ${raw.lastName || ""}`.trim() || "Student";
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "ST";
  const currentSubLevel = raw.currentSubLevelId?.name || raw.currentLevel || "1A";
  const currentYear = translateLevelName(raw.currentLevelId?.name || raw.currentLevel);
  const deptType = detectDepartment(raw, rc);
  const deptConfig = DEPARTMENT_CONFIGS[deptType] || DEPARTMENT_CONFIGS.ITEG;
  const isMeg = deptType === "MEG";
  const isBeg = deptType === "BEG";
  const isBTech = deptType === "BTECH";
  const departmentName = raw.subDepartmentId?.departmentId?.name || raw.subDepartmentId?.departmentId?.code || deptConfig.name;
  const departmentLogo = getDepartmentLogo(deptType);
  const collegeName = isBTech ? "Sant Singaji Engineering College" : "Sant Singaji Institute of Science & Management";
  const batchYear = rc?.batchYear || raw.batchYear || raw.sessionId?.name || "2025–26";
  const overallGrade = rc?.overallGrade || "A";

  // Parse Dynamic Sections if available
  const dynamicSections = rc?.dynamicSections || [];
  const getSection = (type) => dynamicSections.find(s => s.sectionType === type);

  const subjectPerformanceSection = getSection("SubjectPerformanceTable");
  const softSkillsSection = getSection("SoftSkillsRating");
  const interviewSection = getSection("InterviewRating");
  const careerReadinessSection = getSection("CareerStatus");
  const strengthsImprovementSection = getSection("StrengthsImprovement");

  const interviewItemsList = useMemo(() => {
    return (interviewSection?.items?.length > 0 ? interviewSection.items : deptConfig.interviewItems) || [];
  }, [interviewSection, deptConfig]);

  const avgInterviewScore = useMemo(() => {
    if (!interviewItemsList.length) return null;
    const total = interviewItemsList.reduce((acc, it) => acc + (parseFloat(it.value) || 0), 0);
    return (total / interviewItemsList.length).toFixed(1);
  }, [interviewItemsList]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center pt-24 space-y-3">
        <div className="w-9 h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Loading student report card...</p>
      </div>
    );
  }

  // Academic SGPA & CGPA
  const cgpaValue = rc?.academicPerformance?.cgpa || 7.5;
  const sgpaList = rc?.academicPerformance?.yearWiseSGPA || [
    { year: "FY", sgpa: 7.5 },
    { year: "SY", sgpa: 7.5 },
    { year: "TY", sgpa: 0 }
  ];

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">

      {/* ── Header Card ── */}
      <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs">
        <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500" />

        <div className="p-3.5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5 sm:gap-3.5 flex-wrap sm:flex-nowrap">
              {/* College Logo */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 p-1 flex items-center justify-center shrink-0 shadow-2xs" title="SSISM College Logo">
                <img src={collegeLogo} alt="SSISM Logo" className="w-full h-full object-contain" />
              </div>

              {/* Department Logo */}
              <div className="h-10 px-2 sm:h-12 sm:px-2.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 p-1 flex items-center justify-center shrink-0 shadow-2xs" title="Department Logo">
                <img src={departmentLogo} alt="Department Logo" className="h-full w-auto max-w-[75px] sm:max-w-[95px] object-contain" />
              </div>

              <div className="min-w-0">
                <h1 className="text-xs sm:text-base font-black text-slate-900 uppercase tracking-tight truncate">
                  {collegeName}
                </h1>
                <p className="text-[10px] sm:text-xs font-semibold text-orange-500 uppercase tracking-wider truncate">
                  {departmentName} · Performance Report Card · Session {raw.sessionId?.name || "AY 2025-26"}{batchYear ? ` (Batch ${batchYear})` : ""}
                </p>
              </div>
            </div>

            {/* Actions & Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {rc?.overallGrade && (
                <span className={`text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full border ${gradeColor(rc.overallGrade)}`}>
                  Grade: {rc.overallGrade}
                </span>
              )}
              {rc?.isFinalReport ? (
                <span className="text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <MdVerified size={12} /> Final
                </span>
              ) : (
                <span className="text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> Evaluation
                </span>
              )}

              {rc && (
                <PDFDownloadLink
                  document={<StudentReportPDF studentData={raw} reportCardData={rc} />}
                  fileName={`${raw.firstName || 'Student'}_${raw.lastName || 'Report'}_Report_Card.pdf`}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] sm:text-xs font-bold transition shadow-2xs"
                >
                  {({ loading }) =>
                    loading ? (
                      <span className="text-xs">⏳</span>
                    ) : (
                      <>
                        <FaDownload size={10} />
                        <span>PDF</span>
                      </>
                    )
                  }
                </PDFDownloadLink>
              )}
            </div>
          </div>

          {/* Student Info Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 mt-4">
            <div className="flex items-center gap-3">
              {raw.image ? (
                <img
                  src={raw.image}
                  alt={name}
                  className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl object-cover border-2 border-white shadow-xs shrink-0"
                />
              ) : (
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center text-sm sm:text-lg font-black shadow-xs border-2 border-white shrink-0">
                  {initials}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black text-slate-900 truncate">{name}</h2>
                  <MdVerified size={14} className="text-blue-500 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-bold px-2 py-0.2 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                    Lvl {currentSubLevel}
                  </span>
                </div>

                <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5 truncate">
                  {raw.course || "BCA"} · {departmentName} · {currentYear}
                </p>

                {raw.prkey && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.2 rounded bg-slate-50 text-slate-600 border border-slate-100">
                      PR: <strong className="text-slate-800">{raw.prkey}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50/80 rounded-xl p-2.5 sm:p-3 border border-slate-100 text-left sm:text-right self-start sm:self-auto min-w-[170px]">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Evaluation Date</span>
              <p className="text-xs font-bold text-slate-800 mt-0.5">
                {rc?.createdAt
                  ? new Date(rc.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                  : new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              {rc?.generatedByName && (
                <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                  By: <strong className="text-slate-600">{rc.generatedByName}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── No Report Card Fallback ── */}
      {!rc ? (
        <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl shadow-xs">
          <EmptyState
            icon={MdSchool}
            title="Report Card Not Available Yet"
            subtitle="Your official evaluation report card will appear here once finalized by your department faculties."
          />
        </div>
      ) : (
        <>
          {/* ── Executive Scorecard KPI Strip ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {/* Metric 1: Overall Grade */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-3.5 sm:p-5 shadow-xs space-y-1 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">GRADE</span>
                <div className="w-7 h-7 rounded-lg sm:rounded-xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center">
                  <FaTrophy size={12} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-orange-600 transition">
                  {overallGrade}
                </h3>
                <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full ${gradeColor(overallGrade)}`}>
                  Top
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 pt-0.5 truncate">
                Overall Evaluation
              </p>
            </div>

            {/* Metric 2: CGPA */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-3.5 sm:p-5 shadow-xs space-y-1 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">CGPA</span>
                <div className="w-7 h-7 rounded-lg sm:rounded-xl bg-blue-50 text-blue-500 border border-blue-100 flex items-center justify-center">
                  <FaGraduationCap size={12} />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-blue-600 transition">
                  {cgpaValue}
                </h3>
                <span className="text-[10px] font-bold text-slate-400">/ 10</span>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 pt-0.5 truncate">
                University Scale
              </p>
            </div>

            {/* Metric 3: Discipline */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-3.5 sm:p-5 shadow-xs space-y-1 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">DISCIPLINE</span>
                <div className="w-7 h-7 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center">
                  <FaClipboardCheck size={12} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-emerald-600 transition">
                  {rc.discipline?.totalDisciplineMarks ?? 28}
                </h3>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700">
                  Good
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 pt-0.5 truncate">
                Conduct & Attendance
              </p>
            </div>

            {/* Metric 4: Placement Ready */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-3.5 sm:p-5 shadow-xs space-y-1 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">READINESS</span>
                <div className="w-7 h-7 rounded-lg sm:rounded-xl bg-violet-50 text-violet-500 border border-violet-100 flex items-center justify-center">
                  <FaRocket size={12} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-violet-600 transition truncate">
                  {rc.careerReadiness?.placementReady || "Ready"}
                </h3>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 pt-0.5 truncate">
                Drive Eligibility
              </p>
            </div>
          </div>

          {/* ── Mobile Segmented Tabs (`md:hidden`) ── */}
          <div className="md:hidden bg-slate-100/90 p-1 rounded-xl flex gap-1 text-xs font-bold">
            <button
              onClick={() => setMobileTab("overview")}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                mobileTab === "overview" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setMobileTab("subjects")}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                mobileTab === "subjects" ? "bg-white text-orange-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Subjects
            </button>
            <button
              onClick={() => setMobileTab("skills")}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                mobileTab === "skills" ? "bg-white text-violet-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Skills & Mock
            </button>
            <button
              onClick={() => setMobileTab("feedback")}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                mobileTab === "feedback" ? "bg-white text-emerald-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Feedback
            </button>
          </div>

          {/* ── Mobile Tab 1: Overview ── */}
          <div className={`space-y-4 md:hidden ${mobileTab === "overview" ? "block" : "hidden"}`}>
            
            {/* Level Stepper */}
            <LevelJourneyStepper
              levels={['1A', '1B', '1C', '2A', '2B', '2C']}
              currentLevel={currentSubLevel}
            />

            {/* SGPA & CGPA Cards */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FaGraduationCap className="text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-800">SGPA & CGPA Summary</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  CGPA: {cgpaValue}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {sgpaList.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                    <span className="text-[9px] font-bold text-slate-400 block">{item.year}</span>
                    <span className="text-sm font-black text-slate-800 mt-0.5 block">{item.sgpa || "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Career Milestones */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 space-y-2.5">
              <h3 className="text-xs font-bold text-slate-800 pb-2 border-b border-slate-100">
                Career Milestones
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {(careerReadinessSection?.items?.length > 0
                  ? careerReadinessSection.items
                  : [
                    { itemName: "Resume", value: rc.careerReadiness?.resumeStatus || "Created" },
                    { itemName: "LinkedIn", value: rc.careerReadiness?.linkedinStatus || "Created" },
                    { itemName: "Aptitude", value: rc.careerReadiness?.aptitudeStatus || "In Progress" },
                    { itemName: "Placement Ready", value: rc.careerReadiness?.placementReady || "Ready" }
                  ]
                ).map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-2 rounded-lg text-center">
                    <span className="text-[10px] text-slate-400 block font-semibold truncate">{item.itemName}</span>
                    <span className={`text-[10px] font-bold mt-0.5 inline-block px-2 py-0.2 rounded-full border ${readinessBadge(item.value)}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── Mobile Tab 2: Subjects ── */}
          <div className={`space-y-3 md:hidden ${mobileTab === "subjects" ? "block" : "hidden"}`}>
            {(subjectPerformanceSection?.items?.length > 0 || rc.technicalSkills?.length > 0) && (
              <div className="space-y-2.5">
                {subjectPerformanceSection?.items?.length > 0 ? (
                  subjectPerformanceSection.items.map((item, idx) => {
                    const evaluated = item.score ?? 0;
                    const total = item.maxMarks || 100;
                    const pct = total > 0 ? Math.round((evaluated / total) * 100) : 0;
                    const rating = parseFloat(item.remark) || 4.0;
                    const level = item.value || "Good";

                    return (
                      <div key={idx} className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-slate-900 truncate">{item.itemName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            {level}
                          </span>
                        </div>

                        {/* Task progress */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Task Completion</span>
                            <span className="font-bold text-slate-700">{evaluated} / {total}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <StarRating rating={rating} size="text-[11px]" />
                          <span className="font-black text-slate-800">{rating.toFixed(1)} / 5.0</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  rc.technicalSkills.map((skill, idx) => (
                    <div key={idx} className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">{skill.skillName}</h4>
                        <span className="text-[11px] text-slate-400">Theory: {skill.theoryMarks}★ · Practical: {skill.practicalMarks}★</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600">{skill.totalPercentage}%</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ── Mobile Tab 3: Skills & Mock ── */}
          <div className={`space-y-3.5 md:hidden ${mobileTab === "skills" ? "block" : "hidden"}`}>
            
            {/* Soft Skills */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-800 pb-2 border-b border-slate-100">
                Soft Skills & Behaviour
              </h3>
              <div className="space-y-2.5">
                {(softSkillsSection?.items?.length > 0
                  ? softSkillsSection.items
                  : [
                    { itemName: "Communication Skills", value: 4.2 },
                    { itemName: "Team Collaboration", value: 4.1 },
                    { itemName: "Presentation Clarity", value: 4.0 },
                    { itemName: "Time Management", value: 4.3 }
                  ]
                ).map((item, idx) => {
                  const score = parseFloat(item.value) || 0;
                  const pct = Math.min(Math.round((score / 5) * 100), 100);
                  return (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-700">{item.itemName}</span>
                        <span className="font-black text-slate-800">{score.toFixed(1)} / 5</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1">
                        <div className="h-1 rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interview Mock Assessment */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FaUserTie className="text-orange-500 shrink-0" size={13} />
                  <h3 className="text-xs font-bold text-slate-800 truncate">
                    Interview Mock Ratings
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 shrink-0 whitespace-nowrap">
                  <FaStar className="text-amber-500 text-[9px]" />
                  Panel Rating
                  {avgInterviewScore && <span className="font-extrabold text-orange-900">({avgInterviewScore})</span>}
                </span>
              </div>
              <div className="space-y-2.5">
                {interviewItemsList.map((item, idx) => {
                  const score = parseFloat(item.value) || 0;
                  const displayName = mapInterviewItemName(item.itemName, deptType);
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-xs gap-2">
                      <span className="font-semibold text-slate-700 truncate min-w-0 flex-1">{displayName}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StarRating rating={score} size="text-[10px]" />
                        <span className="font-bold text-slate-800">{score.toFixed(1)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ── Mobile Tab 4: Feedback & Mentorship ── */}
          <div className={`space-y-3.5 md:hidden ${mobileTab === "feedback" ? "block" : "hidden"}`}>
            
            {/* Faculty Remark Card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <RiDoubleQuotesL className="text-orange-500" size={18} />
                <h4 className="text-xs font-bold text-slate-800">Faculty Mentorship Note</h4>
              </div>
              <p className="text-xs italic text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                "{rc.facultyRemark || `${name} exhibits strong conceptual understanding, high academic discipline, and proactive engagement.`}"
              </p>
              <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-between pt-1">
                <span>By: {rc.generatedByName || "Faculty Mentor"}</span>
                <span className="text-emerald-600 font-bold">Recommended</span>
              </div>
            </div>

            {/* Strengths & Improvement Cards */}
            <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-3.5 space-y-2">
              <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <span>💪</span> Demonstrated Strengths
              </h4>
              <ul className="space-y-1.5 text-xs text-emerald-900 font-medium">
                {(() => {
                  const rawStrengths = strengthsImprovementSection?.items?.find(i => i.itemName.toLowerCase().includes("strength"))?.value;
                  const points = rawStrengths
                    ? rawStrengths.split(/[.,]\s+/).filter(Boolean)
                    : (isMeg
                      ? [
                        "Demonstrated business acumen, case analysis & presentation excellence",
                        "Consistent assignment completion & active seminar participation"
                      ]
                      : [
                        "Consistent task completion & laboratory participation",
                        "Sound programming fundamentals and problem solving"
                      ]
                    );
                  return points.map((p, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <FaCheck className="text-emerald-500 text-[10px] mt-0.5 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ));
                })()}
              </ul>
            </div>

            <div className="bg-amber-50/50 rounded-2xl border border-amber-100 p-3.5 space-y-2">
              <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <span>🎯</span> Growth Focus Areas
              </h4>
              <ul className="space-y-1.5 text-xs text-amber-900 font-medium">
                {(() => {
                  const rawAreas = strengthsImprovementSection?.items?.find(i => i.itemName.toLowerCase().includes("improve") || i.itemName.toLowerCase().includes("growth"))?.value;
                  const points = rawAreas
                    ? rawAreas.split(/[.,]\s+/).filter(Boolean)
                    : (isMeg
                      ? [
                        "Financial modeling, data analytics & spreadsheet simulation practice",
                        "Executive mock interview composure and structured case answering"
                      ]
                      : [
                        "Advanced competitive coding and timed test practice",
                        "Mock interview composure and technical answering"
                      ]
                    );
                  return points.map((p, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ));
                })()}
              </ul>
            </div>

            {/* Co-Curricular */}
            {rc.coCurricular?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-2">
                <h4 className="text-xs font-bold text-slate-800 pb-2 border-b border-slate-100">
                  Co-Curricular ({rc.coCurricular.length})
                </h4>
                <div className="space-y-2">
                  {rc.coCurricular.map((item, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <p className="font-bold text-slate-800">{item.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.category} · {item.remark}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}


          </div>

          {/* ── Desktop View (`hidden md:block space-y-6`) ── */}
          <div className="hidden md:block space-y-6">

            {/* Connected Level Journey Stepper */}
            <LevelJourneyStepper
              levels={['1A', '1B', '1C', '2A', '2B', '2C']}
              currentLevel={currentSubLevel}
            />

            {/* Academic SGPA & CGPA Breakdown */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-sm">
                    <FaGraduationCap size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Academic SGPA & CGPA Breakdown</h3>
                    <p className="text-xs text-slate-400">Yearly semester performance on 10.0 scale</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Scale: 10.0
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {sgpaList.map((item, idx) => {
                    const yearTitle = item.year === "FY" ? "First Year (FY)" : item.year === "SY" ? "Second Year (SY)" : item.year === "TY" ? "Third Year (TY)" : item.year;
                    const score = item.sgpa || "N/A";
                    return (
                      <div key={idx} className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 hover:bg-slate-50 transition">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{yearTitle}</p>
                        <div className="flex items-baseline justify-between mt-2">
                          <span className="text-2xl font-black text-slate-800">{score}</span>
                          <span className="text-xs font-bold text-slate-400">SGPA</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 mt-3 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                            style={{ width: `${(parseFloat(score) || 0) * 10}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 text-center shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-xl pointer-events-none" />
                  <p className="text-[11px] uppercase font-bold tracking-widest text-slate-400">CUMULATIVE CGPA</p>
                  <p className="text-4xl font-black text-white mt-1.5 tracking-tight">{cgpaValue}</p>
                  <div className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-orange-400 bg-white/10 px-2.5 py-0.5 rounded-full">
                    <span>Distinction Class</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subject-Wise Performance Matrix */}
            {(subjectPerformanceSection?.items?.length > 0 || rc.technicalSkills?.length > 0) && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 sm:p-7 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shadow-sm">
                      {isMeg ? <FaGraduationCap size={18} /> : <FaLaptopCode size={18} />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">
                        {isMeg ? "Subject-Wise Performance & Academic Excellence" : "Subject-Wise Performance & Technical Mastery"}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {isMeg ? "Curriculum task completion, case studies & domain evaluations" : "Task completion, practical evaluations & subject ratings"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200 self-start sm:self-auto">
                    Evaluated Continuous Tasks
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Subject / Skill</th>
                        <th className="py-3.5 px-4 text-center">Tasks Completion</th>
                        <th className="py-3.5 px-4 text-center">Average Rating</th>
                        <th className="py-3.5 px-6 text-center">Proficiency Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80">
                      {subjectPerformanceSection?.items?.length > 0 ? (
                        subjectPerformanceSection.items.map((item, idx) => {
                          const evaluated = item.score ?? 0;
                          const total = item.maxMarks || 100;
                          const pct = total > 0 ? Math.round((evaluated / total) * 100) : 0;
                          const rating = parseFloat(item.remark) || 4.0;
                          const level = item.value || "Good";

                          const levelColor =
                            level === "Outstanding" || level === "Excellent"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : level === "Very Good"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-amber-50 text-amber-700 border-amber-200";

                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 transition">
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                                    {item.itemName.slice(0, 2).toUpperCase()}
                                  </div>
                                  <span className="font-bold text-slate-800">{item.itemName}</span>
                                </div>
                              </td>

                              <td className="py-4 px-4 text-center">
                                <div className="inline-flex flex-col items-center">
                                  <span className="text-xs font-bold text-slate-700">
                                    {evaluated} / {total} tasks
                                  </span>
                                  <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1.5">
                                    <div
                                      className="h-1.5 rounded-full bg-orange-500"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-4 text-center">
                                <div className="inline-flex flex-col items-center">
                                  <StarRating rating={rating} size="text-xs" />
                                  <span className="text-xs font-bold text-slate-800 mt-1">
                                    {rating.toFixed(2)} <span className="text-slate-400 font-normal">/ 5.0</span>
                                  </span>
                                </div>
                              </td>

                              <td className="py-4 px-6 text-center">
                                <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full border ${levelColor}`}>
                                  {level}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        rc.technicalSkills.map((skill, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition">
                            <td className="py-4 px-6 font-bold text-slate-800">{skill.skillName}</td>
                            <td className="py-4 px-4 text-center font-bold text-slate-700">
                              Theory: {skill.theoryMarks}★ · Practical: {skill.practicalMarks}★
                            </td>
                            <td className="py-4 px-4 text-center font-bold text-slate-800">
                              {skill.totalPercentage}%
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {skill.remark || "Good"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Soft Skills & Interview Assessment */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Soft Skills */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center shadow-sm">
                      <FaBrain size={17} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">Soft Skills & Behavioural Evaluation</h3>
                      <p className="text-xs text-slate-400">Interpersonal and communication mastery</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                    Max 5.0
                  </span>
                </div>

                <div className="space-y-4">
                  {(softSkillsSection?.items?.length > 0
                    ? softSkillsSection.items
                    : [
                      { itemName: "Communication Skills", value: 4.2 },
                      { itemName: "Team Collaboration", value: 4.1 },
                      { itemName: "Presentation Clarity", value: 4.0 },
                      { itemName: "Time Management", value: 4.3 }
                    ]
                  ).map((item, idx) => {
                    const score = parseFloat(item.value) || 0;
                    const max = item.maxMarks || 5;
                    const pct = Math.min(Math.round((score / max) * 100), 100);

                    return (
                      <div key={idx} className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-700">{item.itemName}</span>
                          <div className="flex items-center gap-2">
                            <StarRating rating={score} size="text-[11px]" />
                            <span className="text-xs font-black text-slate-800">
                              {score.toFixed(1)} <span className="text-slate-400 font-normal">/ {max}</span>
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Interview Assessment */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-7 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shadow-xs shrink-0">
                      <FaUserTie size={17} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-slate-800 truncate">
                        Interview Readiness & Mock Assessment
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {deptConfig.interviewSubtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 shadow-2xs whitespace-nowrap">
                      <FaStar className="text-amber-500 text-[10px]" />
                      Panel Rating
                      {avgInterviewScore && (
                        <span className="bg-orange-200/70 text-orange-900 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ml-0.5">
                          {avgInterviewScore} / 5
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {interviewItemsList.map((item, idx) => {
                    const score = parseFloat(item.value) || 0;
                    const max = item.maxMarks || 5;
                    const pct = Math.min(Math.round((score / max) * 100), 100);
                    const displayName = mapInterviewItemName(item.itemName, deptType);

                    return (
                      <div key={idx} className="bg-slate-50/70 hover:bg-slate-50 rounded-2xl p-3.5 border border-slate-100 transition">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-bold text-slate-700 truncate min-w-0 flex-1" title={displayName}>
                            {displayName}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <StarRating rating={score} size="text-[11px]" />
                            <span className="text-xs font-black text-slate-800">
                              {score.toFixed(1)} <span className="text-slate-400 font-normal">/ {max}</span>
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Career Readiness Milestones */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-sm">
                    <FaRocket size={17} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Placement & Career Readiness Milestones</h3>
                    <p className="text-xs text-slate-400">Profile verification & recruitment preparedness</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  T&P Cell
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(careerReadinessSection?.items?.length > 0
                  ? careerReadinessSection.items
                  : [
                    { itemName: "Resume", value: rc.careerReadiness?.resumeStatus || "Created" },
                    { itemName: "LinkedIn Profile", value: rc.careerReadiness?.linkedinStatus || "Created" },
                    { itemName: "Aptitude Score", value: rc.careerReadiness?.aptitudeStatus || "In Progress" },
                    { itemName: "Placement Ready", value: rc.careerReadiness?.placementReady || "Ready" }
                  ]
                ).map((item, idx) => {
                  const val = item.value || "In Progress";
                  const isReady = ["Created", "Updated", "Ready", "Completed"].includes(val);

                  return (
                    <div key={idx} className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100 text-center hover:bg-slate-50 transition">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        {item.itemName}
                      </p>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${readinessBadge(val)}`}>
                        {isReady ? <FaCheck size={10} /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                        {val}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Strengths & Improvement Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-emerald-50/40 rounded-3xl border border-emerald-100 p-6 sm:p-7 space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
                    💪
                  </span>
                  <h4 className="text-base font-bold text-emerald-950">Demonstrated Strengths</h4>
                </div>
                <p className="text-xs text-emerald-700/80">Key positive student traits observed by faculties</p>

                <ul className="space-y-2 pt-2">
                  {(() => {
                    const rawStrengths = strengthsImprovementSection?.items?.find(i => i.itemName.toLowerCase().includes("strength"))?.value;
                    const points = rawStrengths
                      ? rawStrengths.split(/[.,]\s+/).filter(Boolean)
                      : (isMeg
                        ? [
                          "Demonstrated business acumen, case analysis & presentation excellence",
                          "Consistent assignment completion & active seminar participation",
                          "Constructive team peer coordination and managerial leadership"
                        ]
                        : [
                          "Consistent task completion and active laboratory participation",
                          "Sound programming fundamentals and algorithmic problem solving",
                          "Constructive team peer coordination and leadership"
                        ]
                      );
                    return points.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs font-semibold text-emerald-900">
                        <FaCheck className="text-emerald-500 text-xs mt-0.5 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ));
                  })()}
                </ul>
              </div>

              <div className="bg-amber-50/40 rounded-3xl border border-amber-100 p-6 sm:p-7 space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">
                    🎯
                  </span>
                  <h4 className="text-base font-bold text-amber-950">Areas for Focused Growth</h4>
                </div>
                <p className="text-xs text-amber-700/80">Target developmental areas prior to final drives</p>

                <ul className="space-y-2 pt-2">
                  {(() => {
                    const rawAreas = strengthsImprovementSection?.items?.find(i => i.itemName.toLowerCase().includes("improve") || i.itemName.toLowerCase().includes("growth"))?.value;
                    const points = rawAreas
                      ? rawAreas.split(/[.,]\s+/).filter(Boolean)
                      : deptConfig.mockGrowthAreas;
                    return points.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs font-semibold text-amber-900">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ));
                  })()}
                </ul>
              </div>
            </div>

            {/* Faculty / Mentor Feedback */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center">
                    <RiDoubleQuotesL size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-800">Faculty Mentorship & Recommendation</h4>
                    <p className="text-xs text-slate-400">Formal observation recorded by Academic Evaluator</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StarRating rating={4.5} />
                  <span className="text-xs font-bold text-slate-700">Recommended for Placement</span>
                </div>
              </div>

              <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-100/80 relative">
                <p className="text-slate-700 text-sm italic leading-relaxed">
                  "{rc.facultyRemark ||
                    `${name} exhibits strong conceptual understanding, high academic discipline, and proactive engagement across both coursework and project assignments.`}"
                </p>

                <div className="mt-4 pt-3.5 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-orange-500 text-white font-bold text-[10px] flex items-center justify-center">
                      {(rc.generatedByName || "FA").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-slate-800 font-bold">{rc.generatedByName || "Prof. Himanshu Vishwakarma"}</span>
                    <span className="text-slate-400">· Senior Faculty Mentor</span>
                  </div>
                  <span className="text-slate-400">Official {isBTech ? "SSEC" : "SSISM"} Evaluation</span>
                </div>
              </div>
            </div>

            {/* Co-Curricular */}
            {rc.coCurricular?.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <FaAward size={16} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">Co-Curricular & Certifications</h4>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {rc.coCurricular.length} Activities Recorded
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {rc.coCurricular.map((item, i) => (
                    <div key={i} className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                        {item.category?.toLowerCase().includes("sport") ? <MdSports size={16} /> : <FaProjectDiagram size={13} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{item.title}</p>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">{item.category} · {item.remark}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


          </div>

        </>
      )}
    </div>
  );
}
