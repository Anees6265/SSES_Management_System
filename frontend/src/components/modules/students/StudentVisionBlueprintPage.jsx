import React, { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  useGetStudentVisionBlueprintQuery,
  useGenerateVisionBlueprintMutation,
  useDeleteVisionBlueprintMutation,
} from "../../../redux/api/authApi";
import {
  MdArrowBack,
  MdCloudUpload,
  MdPrint,
  MdDelete,
  MdAutoAwesome,
  MdCheckCircle,
  MdWarning,
  MdSchool,
  MdWork,
  MdFlag,
  MdFactCheck,
  MdLightbulb,
  MdTimeline,
  MdZoomIn,
  MdClose,
  MdOutlineShield,
  MdPsychology,
  MdCalendarToday,
  MdPictureAsPdf,
  MdDescription,
  MdOpenInNew,
  MdDownload,
} from "react-icons/md";
import { FaBrain, FaCompass, FaGem, FaAward, FaUserTie, FaFilePdf, FaFileWord, FaFileImage } from "react-icons/fa";

export default function StudentVisionBlueprintPage() {
  const { id: studentId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const { data: blueprintRes, isLoading, refetch } = useGetStudentVisionBlueprintQuery(studentId);
  const [generateBlueprint, { isLoading: isGenerating }] = useGenerateVisionBlueprintMutation();
  const [deleteBlueprint, { isLoading: isDeleting }] = useDeleteVisionBlueprintMutation();

  const [activeTab, setActiveTab] = useState("overview"); // overview | values | roadmap | sprint | obstacles | mentor | original
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileMeta, setFileMeta] = useState(null); // { type: 'image' | 'pdf' | 'docx', name: string, size: number, previewUrl?: string }

  const report = blueprintRes?.data || null;
  const blueprint = report?.extractedBlueprint || null;
  const aiReport = report?.aiReport || null;
  const student = report?.studentId || null;

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Handle local file selection (PDF, Word DOCX/DOC, Images)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name || "";
    const ext = fileName.split(".").pop().toLowerCase();
    const isImage = file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext);
    const isPdf = file.type === "application/pdf" || ext === "pdf";
    const isWord =
      ext === "docx" ||
      ext === "doc" ||
      file.type.includes("word") ||
      file.type.includes("officedocument");

    if (!isImage && !isPdf && !isWord) {
      toast.warn("Please select a valid document: PDF (.pdf), Word (.doc, .docx), or Image (PNG, JPG, WEBP).");
      return;
    }

    setSelectedFile(file);

    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        setFileMeta({
          type: "image",
          name: file.name,
          size: file.size,
          previewUrl: reader.result,
        });
      };
      reader.readAsDataURL(file);
    } else if (isPdf) {
      setFileMeta({
        type: "pdf",
        name: file.name,
        size: file.size,
        previewUrl: null,
      });
    } else {
      setFileMeta({
        type: "docx",
        name: file.name,
        size: file.size,
        previewUrl: null,
      });
    }
  };

  // Upload and generate report using Gemini
  const handleUploadAndGenerate = async () => {
    if (!selectedFile && !fileMeta) {
      toast.warn("Please select or drop a Vision Blueprint document (PDF, Word, or Image) first.");
      return;
    }

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append("file", selectedFile);
        formData.append("image", selectedFile);
      } else if (fileMeta?.type === "image" && fileMeta.previewUrl) {
        formData.append("imageBase64", fileMeta.previewUrl);
      }

      const res = await generateBlueprint({ studentId, formData }).unwrap();
      toast.success(res.message || "Vision Blueprint Report generated with Gemini AI!");
      setSelectedFile(null);
      setFileMeta(null);
      refetch();
    } catch (err) {
      console.error("AI Generation failed:", err);
      toast.error(err?.data?.message || err?.message || "Failed to generate AI report");
    }
  };

  // Delete report
  const handleDelete = async () => {
    if (!report?._id) return;
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this Vision Blueprint Report? You can always upload and regenerate it later."
    );
    if (!confirmDelete) return;

    try {
      await deleteBlueprint({ studentId, reportId: report._id }).unwrap();
      toast.success("Report deleted successfully");
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete report");
    }
  };

  // Trigger browser print
  const handlePrint = () => {
    const studentName = blueprint?.studentName || student?.fullName || "Student";
    const originalTitle = document.title;
    document.title = `${studentName} - Personal Vision & Career Roadmap`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16 print:min-h-0 print:bg-white print:p-0 print:m-0 print:pb-0">
      {/* ── TOP ACTION BAR (Hidden in print) ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-2xs print:hidden blueprint-print-hide">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/student-profile/${studentId}`)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Return to Student Profile"
            >
              <MdArrowBack size={18} />
              <span className="hidden sm:inline">Back to Profile</span>
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-orange-100 text-orange-600">
                  <FaCompass size={14} />
                </span>
                <h1 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
                  Personal Vision & Career Roadmap
                </h1>
              </div>
              <p className="text-[11px] text-gray-500 hidden sm:block">
                Strategic Career Alignment & Mentorship Guide • Powered by AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {report && (
              <>
                <button
                  onClick={handlePrint}
                  className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Print or Save as PDF"
                >
                  <MdPrint size={16} className="text-gray-500" />
                  <span className="hidden sm:inline">Print / Save PDF</span>
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition flex items-center cursor-pointer disabled:opacity-50"
                  title="Delete Report"
                >
                  <MdDelete size={17} />
                </button>
              </>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isGenerating}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <MdAutoAwesome size={15} className={isGenerating ? "animate-spin" : ""} />
              <span>{isGenerating ? "Analyzing with AI..." : report ? "Upload New One-Pager" : "Upload One-Pager"}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 space-y-6 print:p-0 print:m-0 print:space-y-4 blueprint-print-container">
        {/* ── OFFICIAL PRINT HEADER (Visible ONLY in Print / PDF export) ── */}
        <div className="hidden print:block pb-3 mb-2 border-b-2 border-orange-500 blueprint-avoid-break">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">
                Personal Vision & Career Roadmap
              </h1>
              <p className="text-xs text-gray-600 font-medium mt-0.5">
                Academic & Career Strategic Alignment Report • Sant Singaji Institute of Science and Management
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider block">
                Official Student Record
              </span>
              <span className="text-[10px] text-gray-500">
                Date: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>
        {/* ── STUDENT SUMMARY BANNER ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4 blueprint-print-card blueprint-avoid-break">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-sm uppercase">
              {blueprint?.studentName?.slice(0, 2) || student?.fullName?.slice(0, 2) || "ST"}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  {blueprint?.studentName || student?.fullName || "Student"}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-100">
                  {blueprint?.academicYear || student?.course || "Academic Blueprint"}
                </span>
              </div>
              <div className="text-xs text-gray-600 flex items-center gap-3 mt-1 flex-wrap">
                <span>Target Sector: <strong className="text-gray-900">{blueprint?.targetSector || "Technology & Consulting"}</strong></span>
                <span>•</span>
                <span>Focus Domain: <strong className="text-orange-600 font-bold">{blueprint?.primaryDomain || "Leadership & Analytics"}</strong></span>
              </div>
            </div>
          </div>

          {report && (
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <MdCheckCircle size={14} /> Active Career Plan
              </span>
              <p className="text-[11px] text-gray-400 mt-1">
                Version {report.version || 1} • {new Date(report.lastGeneratedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          )}
        </div>

        {/* ── FILE SELECTED FOR GENERATION POPUP / BANNER (Supports Image, PDF, DOCX) ── */}
        {fileMeta && (
          <div className="bg-orange-50 border-2 border-dashed border-orange-300 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-4">
              {fileMeta.type === "image" && fileMeta.previewUrl ? (
                <img
                  src={fileMeta.previewUrl}
                  alt="Selected one pager"
                  className="w-16 h-20 object-cover rounded-xl border border-orange-200 shadow-sm cursor-pointer hover:opacity-90"
                  onClick={() => setLightboxOpen(true)}
                />
              ) : fileMeta.type === "pdf" ? (
                <div className="w-16 h-20 rounded-xl bg-red-100 border border-red-200 flex flex-col items-center justify-center text-red-600 shadow-sm">
                  <FaFilePdf size={28} />
                  <span className="text-[9px] font-black uppercase tracking-wider mt-1">PDF</span>
                </div>
              ) : (
                <div className="w-16 h-20 rounded-xl bg-blue-100 border border-blue-200 flex flex-col items-center justify-center text-blue-600 shadow-sm">
                  <FaFileWord size={28} />
                  <span className="text-[9px] font-black uppercase tracking-wider mt-1">DOCX</span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-orange-950">One-Pager Selected: {fileMeta.name}</h3>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    fileMeta.type === "pdf"
                      ? "bg-red-100 text-red-700"
                      : fileMeta.type === "docx"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {fileMeta.type === "pdf" ? "PDF Document" : fileMeta.type === "docx" ? "Word Document" : "Image"} • {formatBytes(fileMeta.size)}
                  </span>
                </div>
                <p className="text-xs text-orange-700 mt-0.5">
                  Ready to send to Google Gemini. Gemini will parse the Core Values, Core Purpose, 3-5-10 Year Goals, and formulate an in-depth strategic alignment report.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSelectedFile(null); setFileMeta(null); }}
                className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadAndGenerate}
                disabled={isGenerating}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <MdAutoAwesome className={isGenerating ? "animate-spin" : ""} size={16} />
                <span>{isGenerating ? "Analyzing with Gemini AI..." : "Generate AI Strategic Report"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── LOADING STATE ── */}
        {isLoading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-700">Loading Vision Blueprint & AI Strategic Report...</p>
          </div>
        )}

        {/* ── EMPTY STATE (NO REPORT YET) ── */}
        {!isLoading && !report && !fileMeta && (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-300 p-12 text-center shadow-sm">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-orange-100 to-amber-100 text-orange-600 flex items-center justify-center mx-auto mb-5 shadow-inner">
              <FaBrain size={36} />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              No Vision Blueprint Report Uploaded Yet
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm max-w-xl mx-auto mt-2 leading-relaxed">
              Upload the student's <strong>Personal Vision Blueprint One-Pager</strong> in <strong>PDF (.pdf)</strong>, <strong>Word Document (.doc, .docx)</strong>, or <strong>Image</strong> format. Google Gemini AI will extract their <strong>Core Purpose</strong> and <strong>Core Values</strong>, and synthesize an executive-grade alignment roadmap for their <strong>3-Year, 5-Year, and 10-Year Goals</strong>.
            </p>

            <div className="mt-8 flex justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-2xl text-sm font-bold shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <MdCloudUpload size={20} />
                <span>Upload Student's Blueprint (PDF, DOCX, Image)</span>
              </button>
            </div>
          </div>
        )}

        {/* ── ACTIVE REPORT VIEW ── */}
        {!isLoading && report && (
          <div className="space-y-6">
            {/* 1. CORE PURPOSE CARD (Clean, Light Theme) */}
            <div className="bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-white rounded-2xl border border-orange-200/90 p-5 sm:p-6 shadow-2xs space-y-4 blueprint-print-card blueprint-avoid-break">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500 text-white shadow-2xs">
                  <FaCompass size={12} /> Student&apos;s Core Purpose
                </span>
                <span className="text-xs text-gray-500 font-medium">Why they want to succeed</span>
              </div>

              <blockquote className="text-base sm:text-lg font-serif italic text-gray-900 leading-snug">
                &ldquo;{blueprint?.corePurpose || "To achieve high-stakes milestones through ethical leadership and technical excellence."}&rdquo;
              </blockquote>

              {/* Simple Guidance Breakdown */}
              {aiReport?.corePurposeAlignment && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-orange-100 text-xs">
                  <div className="bg-white/90 p-3.5 rounded-xl border border-orange-100 shadow-2xs space-y-1">
                    <span className="font-bold text-orange-700 flex items-center gap-1.5 text-xs">
                      <MdLightbulb size={15} /> How to Stay Motivated:
                    </span>
                    <p className="text-gray-600 leading-relaxed text-[11px] sm:text-xs">
                      {aiReport.corePurposeAlignment.emotionalAndPsychologicalAnchor}
                    </p>
                  </div>
                  <div className="bg-white/90 p-3.5 rounded-xl border border-orange-100 shadow-2xs space-y-1">
                    <span className="font-bold text-emerald-700 flex items-center gap-1.5 text-xs">
                      <MdFlag size={15} /> Path to the 10-Year Goal:
                    </span>
                    <p className="text-gray-600 leading-relaxed text-[11px] sm:text-xs">
                      {aiReport.corePurposeAlignment.connectionToLongTermBHAG}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 2. TAB NAVIGATION (Equal width, aligned & formatted across full container) */}
            <div className="bg-white rounded-2xl border border-gray-200 p-1.5 shadow-2xs print:hidden blueprint-print-hide">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
                {[
                  { id: "overview", label: "Summary", icon: MdFactCheck },
                  { id: "values", label: "Core Values & Habits", icon: FaGem },
                  { id: "roadmap", label: "3, 5 & 10 Year Goals", icon: MdTimeline },
                  { id: "sprint", label: "Next 90 Days Plan", icon: MdCalendarToday },
                  { id: "obstacles", label: "Challenges & Solutions", icon: MdOutlineShield },
                  { id: "mentor", label: "Mentor Guide", icon: FaUserTie },
                  { id: "original", label: "Original Document", icon: MdZoomIn },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`group w-full flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer text-center ${
                        isActive
                          ? "bg-orange-500 text-white shadow-xs"
                          : "text-gray-600 hover:text-orange-600 hover:bg-orange-50/70 border border-transparent hover:border-orange-100"
                      }`}
                      title={tab.label}
                    >
                      <Icon
                        size={15}
                        className={isActive ? "text-white shrink-0" : "text-gray-400 group-hover:text-orange-500 shrink-0 transition-colors"}
                      />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── SECTION 1: SUMMARY ── */}
            <div className={`space-y-6 blueprint-print-section blueprint-page-break-after ${activeTab === "overview" ? "block" : "hidden print:block"}`}>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs space-y-5 blueprint-print-card blueprint-avoid-break">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 blueprint-section-header blueprint-avoid-break">
                  <span className="p-2 rounded-xl bg-orange-50 text-orange-600">
                    <MdFactCheck size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Overview & Career Direction</h3>
                    <p className="text-xs text-gray-500">A clear summary of the student&apos;s vision, goals, and how their values guide them</p>
                  </div>
                </div>

                <div className="prose prose-slate max-w-none text-gray-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                  {aiReport?.executiveSummary || "The career alignment report evaluates student vision against their core values."}
                </div>

                {/* Vivid Description of Success */}
                {blueprint?.vividDescriptionOfSuccess && (
                  <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 blueprint-avoid-break">
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block mb-1">
                      Final Vision of Success (End Goal):
                    </span>
                    <p className="text-xs font-medium text-gray-800 italic">
                      &ldquo;{blueprint.vividDescriptionOfSuccess}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── SECTION 2: CORE VALUES & HABITS ── */}
            <div className={`space-y-6 blueprint-print-section blueprint-page-break-after ${activeTab === "values" ? "block" : "hidden print:block"}`}>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs space-y-6 blueprint-print-card">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 blueprint-section-header blueprint-avoid-break">
                  <span className="p-2 rounded-xl bg-orange-50 text-orange-600">
                    <FaGem size={16} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Core Values & How to Practice Them</h3>
                    <p className="text-xs text-gray-500">Practical habits and rules to follow every day to reach your goals</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 print:grid print:grid-cols-2 print:gap-3">
                  {(aiReport?.coreValuesPlaybook || []).map((val, idx) => (
                    <div
                      key={idx}
                      className={`bg-gray-50/70 rounded-2xl border border-gray-200 p-5 space-y-3 hover:border-orange-200 transition blueprint-card-item blueprint-avoid-break ${idx === 4 ? "print:col-span-2" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-lg bg-orange-100 text-orange-800 text-xs font-bold uppercase">
                          {val.value}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-400">Value #{idx + 1}</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-gray-700 block">Why this matters for your goals:</span>
                        <p className="text-xs text-gray-600 leading-relaxed">{val.alignmentWithGoals}</p>
                      </div>

                      <div className="p-3 bg-orange-50/50 rounded-xl border border-orange-100 space-y-1">
                        <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider flex items-center gap-1">
                          <MdLightbulb size={13} /> Daily Habit to Practice:
                        </span>
                        <p className="text-xs text-gray-800 font-medium">{val.dailyBehavioralCode}</p>
                      </div>

                      <div className="space-y-1 text-xs">
                        <span className="text-[11px] font-bold text-gray-700 block">In College & Technical Projects:</span>
                        <p className="text-gray-600 text-[11px]">{val.academicAndProjectExecution}</p>
                      </div>

                      {/* Warning if neglected */}
                      <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-100 text-xs space-y-1">
                        <span className="font-bold text-rose-800 text-[11px] flex items-center gap-1">
                          <MdWarning size={13} /> Mistakes to Avoid (Warning):
                        </span>
                        <p className="text-rose-700 text-[11px]">{val.riskIfCompromised}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── SECTION 3: 3, 5 & 10 YEARS GOALS ── */}
            <div className={`space-y-6 blueprint-print-section ${activeTab === "roadmap" ? "block" : "hidden print:block"}`}>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs space-y-6 blueprint-print-card">
                <div className="pb-3 border-b border-gray-100 flex items-center gap-2.5 blueprint-section-header blueprint-avoid-break">
                  <span className="p-2 rounded-xl bg-orange-50 text-orange-600">
                    <MdTimeline size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Career Goals (3, 5 & 10 Years Plan)</h3>
                    <p className="text-xs text-gray-500">Step-by-step career path from college foundation to leadership</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* PHASE 1: 3-YEAR GOAL */}
                  <div className="bg-blue-50/40 rounded-2xl border border-blue-200/80 p-5 space-y-3 blueprint-card-item blueprint-avoid-break">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider">
                        Phase 1 • 3-Year Foundation Goal
                      </span>
                      <span className="text-xs font-bold text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-full">
                        Skill Mastery & Foundation
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-gray-900">
                      Goal: {blueprint?.threeYearGoal}
                    </p>

                    <div className="text-xs text-gray-600 space-y-2 pt-2 border-t border-blue-100">
                      <p><strong className="text-gray-800">How Values Help:</strong> {aiReport?.multiStageRoadmap?.phase1_ThreeYearCapability?.howValuesDriveThis}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="bg-white p-3 rounded-xl border border-blue-100">
                          <span className="text-[11px] font-bold text-blue-800 block mb-1">Key Milestones to Reach:</span>
                          <ul className="list-disc list-inside text-[11px] text-gray-600 space-y-0.5">
                            {aiReport?.multiStageRoadmap?.phase1_ThreeYearCapability?.criticalMilestones?.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-blue-100">
                          <span className="text-[11px] font-bold text-blue-800 block mb-1">Simple Daily Habits:</span>
                          <ul className="list-disc list-inside text-[11px] text-gray-600 space-y-0.5">
                            {aiReport?.multiStageRoadmap?.phase1_ThreeYearCapability?.dailyHabits?.map((h, i) => (
                              <li key={i}>{h}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PHASE 2: 5-YEAR GOAL */}
                  <div className="bg-emerald-50/40 rounded-2xl border border-emerald-200/80 p-5 space-y-3 blueprint-card-item blueprint-avoid-break">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider">
                        Phase 2 • 5-Year Growth Goal
                      </span>
                      <span className="text-xs font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        Target: {aiReport?.multiStageRoadmap?.phase2_FiveYearGrowth?.packageTarget || "₹15 LPA"}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-gray-900">
                      Goal: {blueprint?.fiveYearGoal}
                    </p>

                    <div className="text-xs text-gray-600 space-y-2 pt-2 border-t border-emerald-100">
                      <p><strong className="text-gray-800">How Values Help:</strong> {aiReport?.multiStageRoadmap?.phase2_FiveYearGrowth?.howValuesDriveThis}</p>
                      <p><strong className="text-gray-800">How to Position Yourself for this Role:</strong> {aiReport?.multiStageRoadmap?.phase2_FiveYearGrowth?.careerPositioningStrategy}</p>
                    </div>
                  </div>

                  {/* PHASE 3: 10-YEAR GOAL */}
                  <div className="bg-amber-50/40 rounded-2xl border border-amber-200/90 p-5 space-y-3 blueprint-card-item blueprint-avoid-break">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider">
                        Phase 3 • 10-Year Leadership Goal
                      </span>
                      <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                        Target: {aiReport?.multiStageRoadmap?.phase3_TenYearLegacy?.packageTarget || "₹25 LPA"}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-gray-900">
                      Goal: {blueprint?.tenYearGoal}
                    </p>

                    <div className="text-xs text-gray-600 space-y-2 pt-2 border-t border-amber-100">
                      <p><strong className="text-gray-800">Family & Long-Term Impact:</strong> {aiReport?.multiStageRoadmap?.phase3_TenYearLegacy?.legacyImpact}</p>
                      <p><strong className="text-gray-800">How Values Help:</strong> {aiReport?.multiStageRoadmap?.phase3_TenYearLegacy?.howValuesDriveThis}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── SECTION 4: NEXT 90 DAYS PLAN ── */}
            <div className={`space-y-6 blueprint-print-section blueprint-page-break-after ${activeTab === "sprint" ? "block" : "hidden print:block"}`}>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs space-y-6 blueprint-print-card">
                <div className="pb-3 border-b border-gray-100 flex items-center gap-2.5 blueprint-section-header blueprint-avoid-break">
                  <span className="p-2 rounded-xl bg-orange-50 text-orange-600">
                    <MdCalendarToday size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Next 90 Days Plan (Immediate Steps)</h3>
                    <p className="text-xs text-gray-500">Actionable tasks and milestones to complete in the next 3 months</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid print:grid-cols-3 print:gap-3">
                  {(aiReport?.ninetyDayActionSprint || []).map((sprint, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-50/70 rounded-2xl border border-gray-200 p-5 space-y-3 flex flex-col justify-between blueprint-card-item blueprint-avoid-break"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-md bg-orange-100 text-orange-800 text-[10px] font-bold uppercase">
                            {sprint.category || `Sprint ${idx + 1}`}
                          </span>
                          <span className="text-[11px] font-mono text-gray-400 font-semibold">{sprint.weeks || "Weeks 1-4"}</span>
                        </div>
                        <h4 className="font-bold text-gray-900 text-xs sm:text-sm">{sprint.deliverable}</h4>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Action Items:</span>
                          <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                            {(sprint.concreteMilestones || []).map((m, mIdx) => (
                              <li key={mIdx}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-200 space-y-1.5 text-xs">
                        <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                          <span className="text-[10px] font-bold text-emerald-700 block uppercase">How to prove completion:</span>
                          <span className="text-[11px] text-gray-700 font-medium">{sprint.evidenceOfCompletion}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── SECTION 5: CHALLENGES & SOLUTIONS ── */}
            <div className={`space-y-6 blueprint-print-section ${activeTab === "obstacles" ? "block" : "hidden print:block"}`}>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs space-y-6 blueprint-print-card">
                <div className="pb-3 border-b border-gray-100 flex items-center gap-2.5 blueprint-section-header blueprint-avoid-break">
                  <span className="p-2 rounded-xl bg-orange-50 text-orange-600">
                    <MdOutlineShield size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Challenges & How to Overcome Them</h3>
                    <p className="text-xs text-gray-500">Practical advice on handling difficult situations, pressure, or setbacks</p>
                  </div>
                </div>

                <div className="space-y-4 print:space-y-3">
                  {(aiReport?.potentialObstaclesAndCountermeasures || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-gray-50/70 border border-gray-200 space-y-2 text-xs blueprint-card-item blueprint-avoid-break"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[10px]">
                          !
                        </span>
                        <h4 className="font-bold text-gray-900 text-xs sm:text-sm">{item.challenge}</h4>
                      </div>
                      <p className="text-gray-500 text-xs pl-7">
                        <strong>Why this happens:</strong> {item.underlyingRootCause}
                      </p>
                      <div className="ml-7 p-3 bg-white rounded-xl border border-emerald-100 text-emerald-950">
                        <strong className="text-emerald-700 block text-[11px] uppercase tracking-wider mb-0.5">
                          Best Action / Solution:
                        </strong>
                        {item.countermeasureDrivenByValues}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── SECTION 6: MENTOR REVIEW GUIDE ── */}
            <div className={`space-y-6 blueprint-print-section ${activeTab === "mentor" ? "block" : "hidden print:block"}`}>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs space-y-6 blueprint-print-card">
                <div className="pb-3 border-b border-gray-100 flex items-center gap-2.5 blueprint-section-header blueprint-avoid-break">
                  <span className="p-2 rounded-xl bg-orange-50 text-orange-600">
                    <FaUserTie size={16} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Faculty Mentor Guide & Questions</h3>
                    <p className="text-xs text-gray-500">Simple questions for monthly 1-on-1 mentorship discussions</p>
                  </div>
                </div>

                <div className="divide-y divide-gray-100 print:divide-y-0 print:space-y-2.5">
                  {(aiReport?.mentorReviewChecklist || []).map((chk, idx) => (
                    <div key={idx} className="py-4 space-y-2 text-xs first:pt-0 last:pb-0 blueprint-card-item blueprint-avoid-break print:p-3 print:border print:border-gray-200 print:rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 text-xs sm:text-sm">{chk.checkpoint}</span>
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-mono text-[10px]">Checkpoint {idx + 1}</span>
                      </div>
                      <p className="text-gray-700 italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                        &ldquo;{chk.questionForStudent}&rdquo;
                      </p>
                      <p className="text-gray-500 text-[11px]">
                        <strong>What to check:</strong> {chk.expectedEvidence}
                      </p>
                    </div>
                  ))}
                </div>

                {/* SIGNATURE BLOCK FOR PRINT */}
                <div className="hidden print:block pt-10 mt-6 border-t border-gray-300 blueprint-avoid-break">
                  <div className="flex justify-between items-end text-xs font-semibold text-gray-800">
                    <div className="text-center w-48 border-t border-gray-400 pt-2">
                      Student Signature
                    </div>
                    <div className="text-center w-48 border-t border-gray-400 pt-2">
                      Faculty Mentor Signature
                    </div>
                    <div className="text-center w-48 border-t border-gray-400 pt-2">
                      HOD / Academic Stamp
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── SECTION 7: VIEW ORIGINAL ONE-PAGER ── */}
            <div className={`space-y-6 print:hidden blueprint-print-hide ${activeTab === "original" ? "block" : "hidden"}`}>
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-4">
                {(() => {
                  const docUrl = report?.onePagerImageUrl || "";
                  const docType = report?.onePagerFileType || (
                    docUrl.endsWith(".pdf") ? "pdf" :
                    (docUrl.endsWith(".docx") || docUrl.endsWith(".doc")) ? "docx" :
                    "image"
                  );
                  const docName = report?.onePagerOriginalName || (
                    docType === "pdf" ? "Vision_Blueprint.pdf" :
                    docType === "docx" ? "Vision_Blueprint.docx" :
                    "Vision_Blueprint.jpg"
                  );

                  return (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-gray-900">
                              Original Submitted Document
                            </h3>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              docType === "pdf"
                                ? "bg-red-100 text-red-700"
                                : docType === "docx"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {docType === "pdf" ? "PDF Document" : docType === "docx" ? "Word Document" : "Image File"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {docName} • Submitted by student & analyzed by AI
                          </p>
                        </div>

                        {docUrl && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {docType === "image" && (
                              <button
                                onClick={() => setLightboxOpen(true)}
                                className="px-3.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700 flex items-center gap-1.5 cursor-pointer"
                              >
                                <MdZoomIn size={16} /> View Fullscreen
                              </button>
                            )}
                            <a
                              href={docUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-xs font-bold text-orange-700 border border-orange-200 flex items-center gap-1.5 cursor-pointer transition"
                            >
                              <MdOpenInNew size={15} /> Open in New Tab
                            </a>
                            <a
                              href={docUrl}
                              download={docName}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                            >
                              <MdDownload size={15} /> Download
                            </a>
                          </div>
                        )}
                      </div>

                      {docUrl ? (
                        docType === "pdf" ? (
                          <div className="space-y-3">
                            <div className="h-[750px] w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50">
                              <iframe
                                src={docUrl}
                                title="Original PDF Document"
                                className="w-full h-full border-0"
                              />
                            </div>
                            <p className="text-[11px] text-gray-500 text-center">
                              If the PDF does not display in your browser, click &quot;Open in New Tab&quot; or &quot;Download&quot; above.
                            </p>
                          </div>
                        ) : docType === "docx" ? (
                          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                              <FaFileWord size={36} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-900">{docName}</h4>
                              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                                Microsoft Word Document submitted by student. Gemini parsed the structured principles, goals, and deliverables directly from this document.
                              </p>
                            </div>
                            <div className="flex justify-center pt-2">
                              <a
                                href={docUrl}
                                download={docName}
                                target="_blank"
                                rel="noreferrer"
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
                              >
                                <MdDownload size={16} /> Download Word Document
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-center bg-gray-50 p-4 rounded-2xl border border-gray-200">
                            <img
                              src={docUrl}
                              alt="Personal Vision Blueprint One Pager"
                              className="max-h-[650px] w-auto rounded-xl shadow-md border border-gray-300 cursor-pointer hover:opacity-95"
                              onClick={() => setLightboxOpen(true)}
                            />
                          </div>
                        )
                      ) : (
                        <p className="text-xs text-gray-400 py-8 text-center">No original document attached to this report.</p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── LIGHTBOX POPUP FOR FULL IMAGE ── */}
      {lightboxOpen && (report?.onePagerImageUrl || fileMeta?.previewUrl) && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-auto rounded-2xl bg-white p-2">
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 cursor-pointer z-10"
            >
              <MdClose size={20} />
            </button>
            <img
              src={report?.onePagerImageUrl || fileMeta?.previewUrl}
              alt="Fullscreen Blueprint"
              className="w-full h-auto rounded-xl"
            />
          </div>
        </div>
      )}

      {/* ── PRINT STYLESHEET OVERRIDES FOR COMPLETE MULTI-SECTION PDF EXPORT ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
          }

          /* Hide UI interactive buttons & tabs */
          .print\\:hidden,
          .blueprint-print-hide {
            display: none !important;
          }

          /* Force full container width */
          .blueprint-print-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Force all 6 strategic report sections to display in full */
          .blueprint-print-section {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            margin-bottom: 16px !important;
          }

          /* Clean page breaks between major report chapters */
          .blueprint-page-break-after {
            page-break-after: always !important;
            break-after: page !important;
          }

          .blueprint-page-break-before {
            page-break-before: always !important;
            break-before: page !important;
          }

          /* CRITICAL: Never slice cards horizontally across page boundaries */
          .blueprint-avoid-break,
          .blueprint-card-item,
          .blueprint-print-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-column-break-inside: avoid !important;
            box-shadow: none !important;
          }

          /* Prevent headings from being orphaned at the bottom of a page */
          .blueprint-section-header,
          h1, h2, h3, h4 {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* Clean card styling for crisp print */
          .blueprint-card-item {
            box-shadow: none !important;
          }

          /* Print grid adjustments */
          .blueprint-print-section .print\\:grid-cols-2 {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
          }

          .blueprint-print-section .print\\:grid-cols-3 {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 10px !important;
          }

          /* Exact color reproduction */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
    </div>
  );
}
