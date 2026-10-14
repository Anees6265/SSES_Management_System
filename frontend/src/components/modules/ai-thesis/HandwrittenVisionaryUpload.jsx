import { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Trash2,
  Maximize2,
  X,
  Sparkles,
  CheckCircle2,
  Printer,
  Camera,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  BookOpen,
  Eye,
  RefreshCw,
  Clock,
  Layers,
} from "lucide-react";
import { toast } from "react-toastify";

export default function HandwrittenVisionaryUpload({
  assessment,
  studentContext,
  isFacultyView = false,
  studentId,
  onUploadExercise,
  onDeletePage,
  onAnalyzeExercise,
  isAnalyzing = false,
  isUploading = false,
  onSwitchToReport,
}) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [studentNotes, setStudentNotes] = useState(
    assessment?.handwrittenSubmission?.studentNotes || ""
  );
  const [selectedPreviewImage, setSelectedPreviewImage] = useState(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  const images = assessment?.handwrittenSubmission?.images || [];
  const submissionStatus = assessment?.handwrittenSubmission?.status || "pending_upload";
  const hasUploadedSheets = images.length > 0;
  const isAnalyzed = assessment?.status === "analyzed" || assessment?.status === "finalized";

  // Handle files selection
  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;

    const validFiles = [];
    const maxSizeBytes = 15 * 1024 * 1024; // 15MB

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxSizeBytes) {
        toast.error(`"${file.name}" exceeds the 15MB limit. Please upload a compressed image.`);
        continue;
      }
      const isImg = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
      if (!isImg && !isPdf) {
        toast.error(`"${file.name}" is not a supported file type. Only JPG, PNG, WEBP, and PDF are allowed.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    try {
      const formData = new FormData();
      validFiles.forEach((file) => {
        formData.append("images", file);
      });
      if (studentNotes) {
        formData.append("studentNotes", studentNotes);
      }
      formData.append("version", assessment?.assessmentVersion || 1);

      await onUploadExercise(formData);
      toast.success(`${validFiles.length} handwritten page(s) uploaded!`);
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to upload pages");
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDeletePage = async (pageNumber, url) => {
    if (!window.confirm(`Are you sure you want to remove Page ${pageNumber}?`)) return;
    try {
      await onDeletePage({
        pageNumber,
        url,
        version: assessment?.assessmentVersion || 1,
      });
      toast.info(`Page ${pageNumber} removed.`);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete page");
    }
  };

  const handleTriggerAnalysis = async () => {
    if (!hasUploadedSheets) {
      toast.warning("Please upload at least one handwritten sheet before running AI analysis.");
      return;
    }
    try {
      await onAnalyzeExercise({
        version: assessment?.assessmentVersion || 1,
        studentNotes,
      });
    } catch (err) {
      toast.error(err?.data?.message || "Failed to run AI analysis");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Top Hero: Handwritten Visionary Exercise Header ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 border border-slate-800 shadow-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-orange-400 bg-orange-400/10 px-3.5 py-1 rounded-full border border-orange-400/20 inline-flex items-center gap-1.5">
              <span>✍️ Handwritten Visionary Exercise</span>
              <span className="text-white/40">•</span>
              <span>AI Multimodal Reading</span>
            </span>

            <button
              type="button"
              onClick={() => setIsGuideModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 border border-white/15 cursor-pointer backdrop-blur-xs"
            >
              <BookOpen size={14} className="text-orange-400" />
              <span>Worksheet Guidelines & Prompts</span>
            </button>
          </div>

          <div className="space-y-2 max-w-3xl">
            <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              Write by Hand. Upload Your Sheet. Let AI Synthesize Your Thesis.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              No online tests or static forms. Take your time to write your genuine passions, driving purpose, core values, and 3-5 year vision on paper with your own hand. Upload clear photos of your pages, and our multimodal AI will read your handwriting to generate your personalized AI Developmental Thesis!
            </p>
          </div>

          {/* 4 Step Process Visual */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3">
            <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-wider">Step 1</span>
              <h5 className="text-xs font-bold text-white">Write on Paper</h5>
              <p className="text-[11px] text-slate-300 leading-snug">
                Write your passions, purpose, core values & 5-year vision in simple words.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Step 2</span>
              <h5 className="text-xs font-bold text-white">Capture / Scan</h5>
              <p className="text-[11px] text-slate-300 leading-snug">
                Take clean, well-lit photos of each page or save as PDF.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Step 3</span>
              <h5 className="text-xs font-bold text-white">Upload Sheets</h5>
              <p className="text-[11px] text-slate-300 leading-snug">
                Drop your pages below. You can preview, zoom, or delete anytime.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Step 4</span>
              <h5 className="text-xs font-bold text-white">AI Synthesis</h5>
              <p className="text-[11px] text-slate-300 leading-snug">
                AI transcribes handwriting, detects patterns, and generates your thesis!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Upload & Gallery Section ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>Handwritten Pages</span>
              <span className="text-xs font-bold text-slate-400">({images.length} uploaded)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload all pages of your handwritten exercise. Multi-page submissions (1 to 10 pages) supported.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isUploading}
              className="sm:hidden px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Camera size={14} className="text-orange-500" />
              <span>Camera</span>
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <UploadCloud size={15} />
              <span>{images.length > 0 ? "+ Add More Pages" : "Upload Pages"}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </div>

        {/* Dropzone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3 ${
            dragActive
              ? "border-orange-500 bg-orange-50/60 scale-[1.01]"
              : "border-slate-200 hover:border-orange-300 hover:bg-slate-50/60 bg-slate-50/30"
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-orange-100/80 text-orange-600 flex items-center justify-center shadow-xs">
            {isUploading ? (
              <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud size={28} />
            )}
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800">
              {isUploading ? "Uploading pages..." : "Drag & drop photos of your handwritten sheets here"}
            </h4>
            <p className="text-xs text-slate-500">
              or <span className="text-orange-600 font-bold hover:underline">browse files</span> from your phone or computer
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] font-medium text-slate-400">
            <span>JPG, PNG, WEBP, PDF</span>
            <span>•</span>
            <span>Max 15MB per page</span>
            <span>•</span>
            <span>Clear lighting & readable handwriting recommended</span>
          </div>
        </div>

        {/* Uploaded Gallery Grid */}
        {hasUploadedSheets && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Uploaded Pages ({images.length})
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Click any page to preview full size
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {images.map((img, idx) => {
                const isPdf = img.url?.includes(".pdf") || img.fileName?.endsWith(".pdf");
                return (
                  <div
                    key={idx}
                    className="group relative bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col"
                  >
                    {/* Top Page Badge */}
                    <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-lg bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-black tracking-wide">
                      Page {img.pageNumber || idx + 1}
                    </div>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePage(img.pageNumber || idx + 1, img.url);
                      }}
                      className="absolute top-2 right-2 z-10 w-7 h-7 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center shadow-xs transition active:scale-90 cursor-pointer"
                      title="Delete page"
                    >
                      <Trash2 size={13} />
                    </button>

                    {/* Preview Area */}
                    <div
                      onClick={() => setSelectedPreviewImage(img)}
                      className="h-36 sm:h-44 bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer relative"
                    >
                      {isPdf ? (
                        <div className="flex flex-col items-center justify-center text-rose-500 gap-1.5 p-3 text-center">
                          <FileText size={36} />
                          <span className="text-[11px] font-bold text-slate-700 truncate max-w-[120px]">
                            {img.fileName || "PDF Document"}
                          </span>
                        </div>
                      ) : (
                        <img
                          src={img.url}
                          alt={`Handwritten Sheet Page ${img.pageNumber || idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        />
                      )}

                      {/* Zoom Overlay on Hover */}
                      <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                        <div className="px-2.5 py-1 rounded-lg bg-slate-900/80 text-xs font-bold flex items-center gap-1 backdrop-blur-xs">
                          <Maximize2 size={13} />
                          <span>View</span>
                        </div>
                      </div>
                    </div>

                    {/* Page Meta */}
                    <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 font-semibold truncate">
                        {img.fileName || `Page ${img.pageNumber || idx + 1}`}
                      </span>
                      {img.uploadedAt && (
                        <span className="text-slate-400 text-[10px] shrink-0">
                          {new Date(img.uploadedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Optional Student Clarification Notes */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>Student Clarification Notes / Transcription Highlights</span>
              <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Helpful if handwriting is in Hindi or faint
            </span>
          </label>
          <textarea
            value={studentNotes}
            onChange={(e) => setStudentNotes(e.target.value)}
            placeholder="Example: 'On Page 1, my primary passion is web development and solving logistics problems. On Page 2, my 5-year goal is to build an edtech startup in Madhya Pradesh...'"
            rows={3}
            className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition resize-y font-normal"
          />
        </div>

        {/* AI Analysis Action Footer */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  hasUploadedSheets ? "bg-emerald-500" : "bg-amber-400"
                }`}
              />
              <span className="text-xs font-bold text-slate-800">
                {hasUploadedSheets
                  ? `${images.length} Page${images.length > 1 ? "s" : ""} Ready for AI Multimodal Analysis`
                  : "Upload at least 1 handwritten page to unlock AI analysis"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Multimodal AI reads your handwriting, extracts your passions & purpose, and builds your complete thesis.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {isAnalyzed && onSwitchToReport && (
              <button
                type="button"
                onClick={onSwitchToReport}
                className="px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>View Generated Thesis Report</span>
                <ArrowRight size={14} />
              </button>
            )}

            <button
              type="button"
              disabled={isAnalyzing || !hasUploadedSheets}
              onClick={handleTriggerAnalysis}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>AI Reading & Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>
                    {isAnalyzed
                      ? "Re-Analyze Handwritten Exercise with AI ✨"
                      : "✨ Analyze Handwritten Exercise with AI"}
                  </span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Animated Progress Overlay when Analyzing */}
        {isAnalyzing && (
          <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-indigo-50 border border-orange-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                <Sparkles size={20} />
              </div>
              <div className="space-y-0.5">
                <h5 className="text-xs sm:text-sm font-black text-slate-900">
                  Multimodal AI Analysis in Progress...
                </h5>
                <p className="text-xs text-slate-600">
                  Transcribing handwriting • Extracting passions & values • Synthesizing purpose statement & career roadmap
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-orange-700 bg-white px-3 py-1.5 rounded-xl border border-orange-200">
                ~10 to 15 seconds
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Image Lightbox Modal ── */}
      {selectedPreviewImage && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="relative max-w-4xl max-h-[92vh] w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-800">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-orange-500 text-white text-xs font-black">
                  Page {selectedPreviewImage.pageNumber || 1}
                </span>
                <span className="text-xs text-slate-300 font-semibold truncate max-w-md">
                  {selectedPreviewImage.fileName || "Handwritten Sheet"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPreviewImage(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content View */}
            <div className="p-3 sm:p-4 overflow-auto max-h-[78vh] flex items-center justify-center bg-slate-950">
              {(() => {
                const isPdf =
                  selectedPreviewImage.url?.toLowerCase().includes(".pdf") ||
                  selectedPreviewImage.fileName?.toLowerCase().endsWith(".pdf") ||
                  selectedPreviewImage.url?.startsWith("data:application/pdf");

                if (isPdf) {
                  return (
                    <div className="w-full h-[72vh] flex flex-col items-center justify-center gap-3">
                      <iframe
                        src={selectedPreviewImage.url}
                        title={selectedPreviewImage.fileName || "PDF Sheet"}
                        className="w-full h-full rounded-2xl bg-white border border-slate-800 shadow-xl"
                      />
                      <a
                        href={selectedPreviewImage.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
                      >
                        <ExternalLink size={14} />
                        <span>Open PDF in New Window / Download</span>
                      </a>
                    </div>
                  );
                }

                return (
                  <img
                    src={selectedPreviewImage.url}
                    alt={`Handwritten Sheet Page ${selectedPreviewImage.pageNumber || 1}`}
                    className="max-h-[74vh] max-w-full object-contain rounded-xl shadow-lg"
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Printable Worksheet Guidelines & Prompts Modal ── */}
      {isGuideModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="relative max-w-3xl max-h-[92vh] w-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Handwritten Visionary Exercise Guidelines
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    What to write on your sheets before capturing and uploading
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Prompts Content */}
            <div className="p-6 overflow-y-auto max-h-[72vh] space-y-5 text-slate-800 text-xs sm:text-sm">
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200/70 space-y-1">
                <h4 className="font-black text-orange-900 text-xs sm:text-sm">
                  Instructions for Students
                </h4>
                <p className="text-xs text-orange-800 leading-relaxed font-medium">
                  Take a clean notebook or white A4 sheet. Use any comfortable language (English, Hindi, or Hinglish). Write honestly and reflectively. There are no wrong answers!
                </p>
              </div>

              {/* 5 Questions */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-orange-600 block">
                    Section 1: My Genuine Passions (What Energizes Me?)
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Write down 3 to 5 activities or problems where you lose track of time. What topics or skills do you explore without anyone forcing you? What real-world challenges do you feel curious about solving?
                  </p>
                  <span className="text-[11px] text-slate-400 italic block">
                    Example: "When my life is ideal, I am building practical software systems / managing community events / exploring biological research..."
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 block">
                    Section 2: Driving Purpose & Why (Why Does It Matter?)
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Why does this work matter to you? Who do you want to help or impact? How will this fulfill your life, uplift your family, or benefit your community?
                  </p>
                  <span className="text-[11px] text-slate-400 italic block">
                    Example: "My purpose is to master engineering to provide financial independence for my parents and create accessible technology for rural schools..."
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 block">
                    Section 3: Guiding Core Values (Top 3-5 Principles)
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    What 3 to 5 core values define how you make decisions? (e.g., Discipline, Curiosity, Integrity, Empathy, Continuous Learning, Excellence). Write a brief one-line reason for each.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 block">
                    Section 4: 3-5 Year Vision & BHAG (Big Audacious Goal)
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Where do you see yourself 3 to 5 years from now? What is your boldest milestone or dream achievement (BHAG) that inspires you to work hard every day?
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-purple-600 block">
                    Section 5: Strengths & Development Areas
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    What are 2-3 capabilities you already feel strong in? And what 2-3 capabilities do you honestly need to build or bridge in the next 6-12 months?
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                Sant Singaji Educational Society (SSES) • Student Mentoring Division
              </span>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Printer size={14} />
                <span>Print Worksheet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
