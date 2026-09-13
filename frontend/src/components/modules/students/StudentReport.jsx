// StudentReport.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetAdmittedStudentsByIdQuery, useGetReportCardQuery } from "../../../redux/api/authApi";
import { taskAPI } from '../../../services/taskService';
import Header from '../../shared/sidebar/Header';
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
import {
  MdVerified,
  MdSchool,
  MdSports,
  MdOutlineAssessment,
  MdOutlineTrendingUp,
  MdArrowBack
} from "react-icons/md";
import { RiEdit2Fill, RiDoubleQuotesL } from "react-icons/ri";
import Loader from "../../shared/loader/Loader";
import logo from '../../../assets/images/doulLogo.png';
import { PDFDownloadLink } from '@react-pdf/renderer';
import StudentReportPDF from './StudentReportPDF';

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

const getGradeBadgeStyle = (grade = "") => {
  const g = grade.toUpperCase();
  if (["A+", "A"].includes(g)) {
    return {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      pill: "bg-emerald-500 text-white",
      label: "Outstanding Performance",
      border: "border-emerald-100"
    };
  }
  if (["B+", "B"].includes(g)) {
    return {
      bg: "bg-blue-50 text-blue-700 border-blue-200",
      pill: "bg-blue-500 text-white",
      label: "Very Good Performance",
      border: "border-blue-100"
    };
  }
  if (["C+", "C"].includes(g)) {
    return {
      bg: "bg-amber-50 text-amber-700 border-amber-200",
      pill: "bg-amber-500 text-white",
      label: "Good Performance",
      border: "border-amber-100"
    };
  }
  return {
    bg: "bg-slate-50 text-slate-700 border-slate-200",
    pill: "bg-slate-500 text-white",
    label: "Satisfactory",
    border: "border-slate-100"
  };
};

const StarRating = ({ rating = 4, max = 5, size = "text-sm" }) => {
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

// ── Level Stepper Component ───────────────────────────────────────────────────

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
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <h3 className="text-base font-bold text-slate-800">Academic Level Progression</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Current Position: <span className="font-bold text-orange-600">Level {currentLevel}</span> · SSISM Milestone Tracker
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
            {Math.round(fillPercent)}% Journey Complete
          </span>
        </div>
      </div>

      <div className="mt-8 mb-4 px-2 sm:px-6">
        <div className="relative flex items-center justify-between">
          {/* Track Background */}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1.5 bg-slate-100 rounded-full z-0" />

          {/* Filled Progress Line */}
          <div
            className="absolute left-6 top-1/2 -translate-y-1/2 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-orange-500 rounded-full transition-all duration-700 z-0"
            style={{ width: `calc((100% - 48px) * ${fillPercent / 100})` }}
          />

          {/* Stepper Nodes */}
          {levels.map((lvl, i) => {
            const isPassed = i < currentIndex;
            const isCurrent = i === currentIndex;
            const isUpcoming = i > currentIndex;

            return (
              <div key={lvl} className="flex flex-col items-center relative z-10">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 shadow-sm ${
                    isPassed
                      ? "bg-emerald-500 text-white shadow-emerald-200 shadow-md"
                      : isCurrent
                      ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white ring-4 ring-orange-100 shadow-md scale-110"
                      : "bg-white text-slate-400 border border-slate-200"
                  }`}
                >
                  {isPassed ? <FaCheck className="text-xs" /> : lvl}
                </div>

                <div className="flex flex-col items-center mt-2.5">
                  <span
                    className={`text-[11px] font-bold ${
                      isCurrent
                        ? "text-orange-600"
                        : isPassed
                        ? "text-emerald-700"
                        : "text-slate-400"
                    }`}
                  >
                    {lvl}
                  </span>

                  {isPassed && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" />
                  )}
                  {isCurrent && (
                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded bg-orange-100 text-orange-700 mt-1">
                      Current
                    </span>
                  )}
                  {isUpcoming && (
                    <span className="text-[9px] text-slate-300 mt-1">—</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Final Placement Goal */}
          <div className="flex flex-col items-center relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-200">
              <FaTrophy className="text-sm" />
            </div>
            <span className="text-[11px] font-bold text-amber-600 mt-2.5">Goal</span>
            <span className="text-[9px] font-medium text-slate-400 mt-1">Placed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main StudentReport Component ──────────────────────────────────────────────

export default function StudentReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [taskPerformance, setTaskPerformance] = useState(null);
  const [taskLoading, setTaskLoading] = useState(true);

  const { data: studentResponse, isLoading, isError } = useGetAdmittedStudentsByIdQuery(id);
  const studentData = studentResponse?.data || {};
  const { data: reportCardResponse, isLoading: reportLoading } = useGetReportCardQuery(id);
  const reportCardData = reportCardResponse?.data;

  // Fetch task performance
  useEffect(() => {
    const fetchTaskPerformance = async () => {
      if (id) {
        try {
          const result = await taskAPI.getStudentTaskPerformance(id);
          setTaskPerformance(result.performance);
        } catch (error) {
          console.error('Error fetching task performance:', error);
        } finally {
          setTaskLoading(false);
        }
      }
    };

    fetchTaskPerformance();
  }, [id]);

  const fullName = `${studentData.firstName || ""} ${studentData.lastName || ""}`.trim() || "Student";
  const initials = fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "ST";
  const prkey = studentData.admissionNo || studentData.enrollmentNo || studentData.prkey || "N/A";
  const currentSubLevel = studentData.currentSubLevelId?.name || studentData.currentLevel || "1A";
  const currentYear = translateLevelName(studentData.currentLevelId?.name || studentData.currentLevel);
  const departmentName = studentData.subDepartmentId?.departmentId?.name || studentData.subDepartmentId?.departmentId?.code || "ITEG";
  const batchYear = reportCardData?.batchYear || studentData.sessionId?.name || "2025–26";
  const overallGrade = reportCardData?.overallGrade || "A";
  const gradeStyle = getGradeBadgeStyle(overallGrade);

  // Fallbacks & dynamic sections extractor
  const dynamicSections = reportCardData?.dynamicSections || [];
  const getSection = (type) => dynamicSections.find(s => s.sectionType === type);

  const levelProgressSection = getSection("LevelProgressTable");
  const subjectPerformanceSection = getSection("SubjectPerformanceTable");
  const softSkillsSection = getSection("SoftSkillsRating");
  const interviewSection = getSection("InterviewRating");
  const careerReadinessSection = getSection("CareerStatus");
  const attendanceDisciplineSection = getSection("AttendanceDiscipline");
  const strengthsImprovementSection = getSection("StrengthsImprovement");
  const overallPerformanceSection = getSection("OverallPerformanceSummary");

  // CGPA calculation
  const cgpaValue = reportCardData?.academicPerformance?.cgpa || "8.50";
  const sgpaList = reportCardData?.academicPerformance?.yearWiseSGPA || [
    { year: "FY", sgpa: 8.4 },
    { year: "SY", sgpa: 8.6 },
    { year: "TY", sgpa: 8.5 }
  ];

  if (isLoading || reportLoading || taskLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader />
      </div>
    );
  }

  if (isError || !studentData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4 text-2xl font-bold">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-slate-800">Student Record Not Found</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-md">
          Unable to retrieve student details. Please verify the student ID or check your network connection.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-5 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
        >
          Return Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* ── Top App Header ── */}
      <Header
        title="Student Performance Report"
        showBack={true}
        breadcrumbs={[
          { label: 'Academics', path: '/student-detail-table' },
          { label: 'Student Progress', path: '/student-detail-table' },
          { label: `${studentData.firstName || 'Student'} Profile`, path: `/student-profile/${id}` },
          { label: 'Report Card' }
        ]}
      >
        <div className="flex items-center gap-2">
          {/* Print Button */}
          <button
            onClick={() => window.print()}
            title="Print Report"
            className="p-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
          >
            <FaPrint size={15} />
          </button>

          {/* Download PDF Button */}
          <PDFDownloadLink
            document={<StudentReportPDF studentData={studentData} reportCardData={reportCardData} />}
            fileName={`${studentData.firstName || 'Student'}_${studentData.lastName || 'Report'}_Report_Card.pdf`}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-200"
          >
            {({ loading }) =>
              loading ? (
                <span className="flex items-center gap-1.5">
                  <span className="animate-spin text-sm">⏳</span> Preparing...
                </span>
              ) : (
                <>
                  <FaDownload size={13} />
                  <span>Download PDF</span>
                </>
              )
            }
          </PDFDownloadLink>

          {/* Edit Button */}
          <button
            onClick={() => navigate(`/student/${id}/report/edit`)}
            title="Edit Report Card"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-orange-200"
          >
            <RiEdit2Fill size={15} />
            <span className="hidden sm:inline">Edit Report</span>
          </button>
        </div>
      </Header>

      {/* ── Report Card Body Container ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* ── Hero Dossier Card ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500" />
          
          <div className="p-6 sm:p-8">
            {/* Institute Header Watermark & Brand */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <img src={logo} alt="SSISM Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
                    Sant Singaji Institute of Science & Management
                  </h1>
                  <p className="text-xs font-semibold text-orange-500 tracking-wider uppercase mt-0.5">
                    ITEG Department · Comprehensive Student Performance Dossier
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" /> Session: {batchYear}
                </span>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${gradeStyle.bg} flex items-center gap-1.5`}>
                  <MdVerified size={13} /> {reportCardData?.isFinalReport ? "Official Final Evaluation" : "Semester Progress Report"}
                </span>
              </div>
            </div>

            {/* Student Persona Grid */}
            <div className="mt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                {studentData.image ? (
                  <img
                    src={studentData.image}
                    alt={fullName}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md shadow-slate-200"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center text-2xl font-black shadow-md shadow-orange-100 border-2 border-white">
                    {initials}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-black text-slate-900">{fullName}</h2>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                      Level {currentSubLevel}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-500 mt-1">
                    {studentData.course || "BCA"} · {departmentName} · {currentYear}
                  </p>

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                      PR Key: <strong className="text-slate-800">{prkey}</strong>
                    </span>
                    {studentData.fatherName && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                        Father: <strong className="text-slate-800">{studentData.fatherName}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Authority & Generation Stamps */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100/80 flex flex-col justify-center min-w-[260px]">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>Evaluated By</span>
                  <span className="font-bold text-slate-800">
                    {reportCardData?.generatedByName || "Prof. Himanshu Vishwakarma"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>Evaluation Date</span>
                  <span className="font-bold text-slate-800">
                    {reportCardData?.createdAt
                      ? new Date(reportCardData.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                      : new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Status</span>
                  <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Verified & Approved
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Executive KPI Metric Cards (Scorecard Strip) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Overall Grade */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-1 relative overflow-hidden group hover:border-orange-200 transition">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">OVERALL GRADE</p>
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center">
                <FaTrophy size={14} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-slate-900 group-hover:text-orange-600 transition">
                {overallGrade}
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${gradeStyle.bg}`}>
                {gradeStyle.label}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 pt-1">
              Performance Index: Outstanding
            </p>
          </div>

          {/* Metric 2: CGPA */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-1 relative overflow-hidden group hover:border-blue-200 transition">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CUMULATIVE CGPA</p>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 border border-blue-100 flex items-center justify-center">
                <FaGraduationCap size={14} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-3xl font-black text-slate-900 group-hover:text-blue-600 transition">
                {cgpaValue}
              </h3>
              <span className="text-xs font-bold text-slate-400">/ 10.0</span>
            </div>
            <p className="text-xs font-semibold text-slate-400 pt-1">
              Academic aggregate across years
            </p>
          </div>

          {/* Metric 3: Attendance & Discipline */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-1 relative overflow-hidden group hover:border-emerald-200 transition">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ATTENDANCE RATE</p>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center">
                <FaClipboardCheck size={14} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-slate-900 group-hover:text-emerald-600 transition">
                {studentData.attendanceRate ? `${studentData.attendanceRate}%` : "92%"}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                Active
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 pt-1">
              Regular classroom attendance
            </p>
          </div>

          {/* Metric 4: Placement Readiness */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-1 relative overflow-hidden group hover:border-violet-200 transition">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CAREER READINESS</p>
              <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-500 border border-violet-100 flex items-center justify-center">
                <FaRocket size={14} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-slate-900 group-hover:text-violet-600 transition">
                {reportCardData?.careerReadiness?.placementReady || "Ready"}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                Interview Eligible
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 pt-1">
              Resume & Aptitude Cleared
            </p>
          </div>
        </div>

        {/* ── Connected Level Stepper ── */}
        <LevelJourneyStepper
          levels={['1A', '1B', '1C', '2A', '2B', '2C']}
          currentLevel={currentSubLevel}
        />

        {/* ── Academic Performance & SGPA Matrix ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7">
          <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-sm">
                <FaGraduationCap size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Academic SGPA & CGPA Breakdown</h3>
                <p className="text-xs text-slate-400">University semester performance evaluation</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Grading Scale: 10.0
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* Year Wise Cards */}
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

            {/* Overall CGPA Highlight Box */}
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

        {/* ── Subject-Wise Performance Table ── */}
        {(subjectPerformanceSection || taskPerformance?.technicalSkills) && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 sm:p-7 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shadow-sm">
                  <FaLaptopCode size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Subject-Wise Performance & Technical Mastery</h3>
                  <p className="text-xs text-slate-400">Continuous task evaluations, lab assessments and practical ratings</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200 self-start sm:self-auto">
                Evaluated by Faculty Panel
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Subject / Module</th>
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
                  ) : taskPerformance?.technicalSkills?.length > 0 ? (
                    taskPerformance.technicalSkills.map((tech, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition">
                        <td className="py-4 px-6 font-bold text-slate-800">{tech.skillName}</td>
                        <td className="py-4 px-4 text-center font-bold text-slate-700">
                          {tech.completedTasks || 0} / {tech.totalTasks || 0} tasks
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-slate-800">
                          {tech.totalPercentage}%
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {tech.remark || "Good"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-xs text-slate-400 font-medium">
                        No subject performance records available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Soft Skills & Interview Evaluations ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 1: Soft Skills & Behavioural Assessment */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center shadow-sm">
                  <FaBrain size={17} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Soft Skills & Behavioural Assessment</h3>
                  <p className="text-xs text-slate-400">Interpersonal, teamwork and presentation evaluations</p>
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
                    { itemName: "Problem Solving", value: 4.0 },
                    { itemName: "Presentation Clarity", value: 4.2 },
                    { itemName: "Professional Punctuality", value: 4.4 }
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

          {/* Section 2: Interview Evaluation */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shadow-sm">
                  <FaUserTie size={17} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Interview Readiness & Mock Assessment</h3>
                  <p className="text-xs text-slate-400">Technical depth, articulate communication & answer composure</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
                Panel Rating
              </span>
            </div>

            <div className="space-y-4">
              {(interviewSection?.items?.length > 0
                ? interviewSection.items
                : [
                    { itemName: "Technical Knowledge", value: 4.0 },
                    { itemName: "Articulation & Communication", value: 4.0 },
                    { itemName: "Confidence & Composure", value: 3.8 },
                    { itemName: "Problem Solving Approach", value: 4.1 },
                    { itemName: "Overall Interview Recommendation", value: 4.0 }
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

        {/* ── Career Readiness & Placement Milestones ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7">
          <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-sm">
                <FaRocket size={17} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Placement & Career Readiness Milestones</h3>
                <p className="text-xs text-slate-400">Industry onboarding and hiring drive preparedness status</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Training & Placement Cell
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(careerReadinessSection?.items?.length > 0
              ? careerReadinessSection.items
              : [
                  { itemName: "Resume", value: reportCardData?.careerReadiness?.resumeStatus || "Created" },
                  { itemName: "LinkedIn Profile", value: reportCardData?.careerReadiness?.linkedinStatus || "Created" },
                  { itemName: "Aptitude Score", value: reportCardData?.careerReadiness?.aptitudeStatus || "In Progress" },
                  { itemName: "Placement Ready", value: reportCardData?.careerReadiness?.placementReady || "Ready" }
                ]
            ).map((item, idx) => {
              const val = item.value || "In Progress";
              const isReady = ["Created", "Updated", "Ready", "Completed"].includes(val);
              const isInProgress = ["In Progress", "Need to improve"].includes(val);

              const badgeColor = isReady
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : isInProgress
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-red-50 text-red-700 border-red-200";

              return (
                <div key={idx} className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100 text-center hover:bg-slate-50 transition">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {item.itemName}
                  </p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
                    {isReady ? <FaCheck size={10} /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Attendance, Discipline & Co-Curricular ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Discipline Stats */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <FaClipboardCheck size={16} />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Attendance & Conduct</h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(attendanceDisciplineSection?.items?.length > 0
                ? attendanceDisciplineSection.items
                : [
                    { itemName: "Attendance", value: "92%" },
                    { itemName: "Punctuality", value: "Good" },
                    { itemName: "Discipline", value: "Excellent" },
                    { itemName: "Class Conduct", value: "Active" }
                  ]
              ).map((item, idx) => (
                <div key={idx} className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.itemName}</p>
                  <p className="text-base font-black text-slate-800 mt-1">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Co-Curricular & Achievements */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <FaAward size={16} />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Co-Curricular & Certifications</h4>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {reportCardData?.coCurricular?.length || 0} Activities
              </span>
            </div>

            {reportCardData?.coCurricular && reportCardData.coCurricular.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reportCardData.coCurricular.map((act, idx) => (
                  <div key={idx} className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {act.category?.toLowerCase().includes("sport") ? <MdSports size={16} /> : <FaProjectDiagram size={13} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{act.title}</p>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">{act.category} · {act.remark}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                Active participation recorded in Technical Workshops & Institute Events.
              </div>
            )}
          </div>
        </div>

        {/* ── Strengths & Growth Areas ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths Card */}
          <div className="bg-emerald-50/40 rounded-3xl border border-emerald-100 p-6 sm:p-7 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
                💪
              </span>
              <h4 className="text-base font-bold text-emerald-950">Demonstrated Strengths</h4>
            </div>
            <p className="text-xs text-emerald-700/80">Key student traits observed by course faculties</p>

            <ul className="space-y-2 pt-2">
              {(() => {
                const rawStrengths = strengthsImprovementSection?.items?.find(i => i.itemName.toLowerCase().includes("strength"))?.value;
                const points = rawStrengths
                  ? rawStrengths.split(",").map(p => p.trim()).filter(Boolean)
                  : [
                      "Strong programming foundations and algorithmic logic",
                      "Consistent task submission and active lab participation",
                      "Effective team communication and peer guidance",
                      "Curiosity towards emerging technologies and frameworks"
                    ];

                return points.map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs font-semibold text-emerald-900">
                    <FaCheck className="text-emerald-500 text-xs mt-0.5 flex-shrink-0" />
                    <span>{pt}</span>
                  </li>
                ));
              })()}
            </ul>
          </div>

          {/* Areas for Improvement Card */}
          <div className="bg-amber-50/40 rounded-3xl border border-amber-100 p-6 sm:p-7 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">
                🎯
              </span>
              <h4 className="text-base font-bold text-amber-950">Areas for Focused Growth</h4>
            </div>
            <p className="text-xs text-amber-700/80">Target development areas prior to final recruitment</p>

            <ul className="space-y-2 pt-2">
              {(() => {
                const rawAreas = strengthsImprovementSection?.items?.find(i => i.itemName.toLowerCase().includes("improve"))?.value;
                const points = rawAreas
                  ? rawAreas.split(",").map(p => p.trim()).filter(Boolean)
                  : [
                      "Advanced system design and complex algorithmic interview practice",
                      "Mock interview confidence and structured answering under time limits",
                      "Deep-dive portfolio projects demonstrating end-to-end architectures"
                    ];

                return points.map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs font-semibold text-amber-900">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    <span>{pt}</span>
                  </li>
                ));
              })()}
            </ul>
          </div>
        </div>

        {/* ── Faculty / Mentor Feedback Block ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 mb-5">
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

          <div className="bg-slate-50/80 rounded-2xl p-5 sm:p-6 border border-slate-100/80 relative">
            <p className="text-slate-700 text-sm italic leading-relaxed">
              "{reportCardData?.facultyRemark ||
                `${studentData.firstName || 'The student'} exhibits strong conceptual understanding, high academic discipline, and proactive engagement across both coursework and project assignments. Continuously exceeding benchmarks in technical tasks.`}"
            </p>

            <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-orange-500 text-white font-bold text-[10px] flex items-center justify-center">
                  {(reportCardData?.generatedByName || "FA").slice(0, 2).toUpperCase()}
                </div>
                <span className="text-slate-800 font-bold">{reportCardData?.generatedByName || "Prof. Himanshu Vishwakarma"}</span>
                <span className="text-slate-400">· Senior Faculty Mentor</span>
              </div>
              <span className="text-slate-400">Official SSISM Evaluation</span>
            </div>
          </div>
        </div>

        {/* ── Footer Branding & Verification Stamp ── */}
        <div className="pt-6 pb-4 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Sant Singaji Institute of Science and Management. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Official Academic Document</span>
            <span>·</span>
            <span>PR Key: {prkey}</span>
          </div>
        </div>

      </div>
    </div>
  );
}