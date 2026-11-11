import { useState, useMemo } from "react";
import { toast } from "react-toastify";
import {
    Folder, FileText, UploadCloud, Search, X, Plus,
    ExternalLink, Eye, Trash2, CheckCircle2, ShieldCheck,
    Clock, RefreshCw, File, AlertCircle, Sparkles, Award,
    Download
} from "lucide-react";
import {
    useGetMyStudentProfileQuery,
    useGetMyExtraDocumentsQuery,
    useUploadMyExtraDocumentMutation,
} from "../../../redux/api/studentApi";
import EmptyState from "../../shared/empty-state/EmptyState";

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
};

const formatDateTime = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    return isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
};

const DOC_PRESETS = [
    "Resume / CV",
    "Internship Certificate",
    "Course Certification",
    "Academic Marksheet",
    "Identity / Aadhaar",
    "Project Report"
];

/**
 * Preview document directly in a new browser tab without triggering download.
 * Fetches the document as a typed Blob to bypass Cloudinary's Content-Disposition: attachment header,
 * with fallbacks to Google Docs Viewer.
 */
const previewDocumentInNewTab = async (doc) => {
    if (!doc?.fileURL) {
        toast.error("Document URL not found");
        return;
    }

    const fileUrl = doc.fileURL;
    const title = doc.title || "Document";
    const isImage = doc.fileType === "image" || /\.(png|jpe?g|webp|gif|svg)$/i.test(fileUrl);
    const isPdf = doc.fileType === "pdf" || /\.pdf$/i.test(fileUrl);

    // Pre-open new tab to avoid browser popup blockers
    const newTab = window.open("about:blank", "_blank");
    if (newTab) {
        try {
            newTab.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${title} - Preview</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        * { box-sizing: border-box; }
                        body {
                            margin: 0;
                            height: 100vh;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background-color: #0f172a;
                            color: #f8fafc;
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        }
                        .loader-box { text-align: center; padding: 24px; }
                        .spinner {
                            width: 38px;
                            height: 38px;
                            border: 3.5px solid rgba(255,255,255,0.15);
                            border-top-color: #f97316;
                            border-radius: 50%;
                            animation: spin 0.8s linear infinite;
                            margin: 0 auto 14px;
                        }
                        @keyframes spin { to { transform: rotate(360deg); } }
                        p { margin: 0; font-size: 13.5px; font-weight: 600; color: #cbd5e1; }
                    </style>
                </head>
                <body>
                    <div class="loader-box">
                        <div class="spinner"></div>
                        <p>Opening ${title}...</p>
                    </div>
                </body>
                </html>
            `);
        } catch {
            // Document write can be restricted in sandboxed tabs
        }
    }

    try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const blob = await response.blob();

        let mimeType = "application/pdf";
        if (isImage) {
            mimeType = blob.type && blob.type.startsWith("image/") ? blob.type : "image/jpeg";
        } else if (isPdf) {
            mimeType = "application/pdf";
        } else {
            mimeType = blob.type || "application/pdf";
        }

        const fileBlob = new Blob([blob], { type: mimeType });
        const blobUrl = URL.createObjectURL(fileBlob);

        if (newTab && !newTab.closed) {
            newTab.location.href = blobUrl;
        } else {
            window.open(blobUrl, "_blank");
        }

        setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
    } catch (error) {
        console.warn("Direct blob preview failed, falling back:", error);

        let fallbackUrl = fileUrl;
        if (fallbackUrl.includes("/upload/") && !fallbackUrl.includes("/fl_inline/")) {
            fallbackUrl = fallbackUrl.replace("/upload/", "/upload/fl_inline/");
        }

        // For Cloudinary raw upload URLs or PDFs that force attachment, Google Docs Viewer renders inline
        if (fallbackUrl.includes("/raw/upload/") || isPdf) {
            fallbackUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fallbackUrl)}&embedded=false`;
        }

        if (newTab && !newTab.closed) {
            newTab.location.href = fallbackUrl;
        } else {
            window.open(fallbackUrl, "_blank", "noopener,noreferrer");
        }
    }
};

/**
 * Dedicated download function with clean naming and fallback.
 */
const downloadDocumentFile = async (doc) => {
    if (!doc?.fileURL) {
        toast.error("Document URL not found");
        return;
    }

    const fileUrl = doc.fileURL;
    const title = doc.title || "Document";
    const isPdf = doc.fileType === "pdf" || /\.pdf$/i.test(fileUrl);
    const isImage = doc.fileType === "image" || /\.(png|jpe?g|webp|gif)$/i.test(fileUrl);

    try {
        toast.info("Downloading document...", { autoClose: 2000 });
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = blobUrl;

        // Clean file name
        let cleanTitle = (title || "Document")
            .trim()
            .replace(/[^a-zA-Z0-9_\s-]/g, "")
            .replace(/\s+/g, "_");

        let ext = "";
        if (isPdf && !cleanTitle.toLowerCase().endsWith(".pdf")) {
            ext = ".pdf";
        } else if (isImage && !/\.(png|jpe?g|webp|gif)$/i.test(cleanTitle)) {
            ext = blob.type?.includes("png") ? ".png" : ".jpg";
        }

        a.download = `${cleanTitle}${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        toast.success("Download complete");
    } catch (err) {
        console.warn("Direct blob download failed, falling back to anchor:", err);

        // Fallback for download: Add fl_attachment if Cloudinary
        let dlUrl = fileUrl;
        if (dlUrl.includes("/upload/") && !dlUrl.includes("/fl_attachment")) {
            dlUrl = dlUrl.replace("/upload/", "/upload/fl_attachment/");
        }

        const a = document.createElement("a");
        a.href = dlUrl;
        a.download = title || "Document";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
};

// ── Doc Card Component ────────────────────────────────────────────────────────
const DocCard = ({ doc, onPreview, onDownload }) => {
    const isPdf = doc.fileType === "pdf" || /\.pdf$/i.test(doc.fileURL || "");
    const isVerified = !doc.isExtra;

    return (
        <div className="bg-white rounded-2xl border border-gray-150 p-4 shadow-2xs hover:shadow-md hover:border-orange-300 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden">
            {/* Top decorative accent on hover */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div>
                {/* Header: File Icon + Badges */}
                <div className="flex items-start justify-between gap-2.5">
                    <button
                        type="button"
                        onClick={() => onPreview(doc)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs cursor-pointer ${
                            isPdf ? "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" : "bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100"
                        }`}
                        title="Click to preview in new tab"
                    >
                        <FileText size={20} />
                    </button>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {isVerified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ShieldCheck size={11} className="text-emerald-600" />
                                Verified
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                <Sparkles size={10} className="text-amber-500" />
                                Upload
                            </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isPdf ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                        }`}>
                            {doc.fileType || (isPdf ? "PDF" : "FILE")}
                        </span>
                    </div>
                </div>

                {/* Title & Metadata */}
                <div className="mt-3">
                    <h4
                        onClick={() => onPreview(doc)}
                        className="text-xs sm:text-sm font-extrabold text-gray-900 leading-snug truncate group-hover:text-orange-600 transition-colors cursor-pointer"
                        title={doc.title}
                    >
                        {doc.title || "Document"}
                    </h4>

                    <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                        <Clock size={12} className="text-gray-400 shrink-0" />
                        <span>{formatDate(doc.uploadedAt || doc.createdAt)}</span>
                        {doc.uploadedByName && (
                            <span className="truncate">· by {doc.uploadedByName}</span>
                        )}
                    </p>

                    {doc.remark && (
                        <p className="text-[11px] text-gray-600 mt-2 p-2 rounded-xl bg-gray-50 border border-gray-100 line-clamp-2 italic">
                            {doc.remark}
                        </p>
                    )}
                </div>
            </div>

            {/* Actions Bottom Bar */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 gap-2">
                <span className="text-[10px] font-semibold text-gray-400 truncate max-w-[80px] sm:max-w-[100px]">
                    {isVerified ? "Verified Record" : "Student Upload"}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Preview Button (Direct New Tab) */}
                    <button
                        type="button"
                        onClick={() => onPreview(doc)}
                        className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-500 hover:text-white text-orange-600 border border-orange-200/70 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                        title="Open preview in new tab"
                    >
                        <Eye size={13} />
                        <span>Preview</span>
                    </button>

                    {/* Dedicated Download Button */}
                    <button
                        type="button"
                        onClick={() => onDownload(doc)}
                        className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 hover:text-gray-900 text-gray-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                        title="Download file"
                    >
                        <Download size={13} />
                        <span>Download</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Upload Modal ──────────────────────────────────────────────────────────────
const UploadModal = ({ onClose, onSuccess }) => {
    const [title, setTitle] = useState("");
    const [remark, setRemark] = useState("");
    const [file, setFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [fileErr, setFileErr] = useState("");
    const [uploadDoc, { isLoading }] = useUploadMyExtraDocumentMutation();

    const handleFile = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        if (!f.type.startsWith("image/") && f.type !== "application/pdf") {
            setFileErr("Only images (PNG, JPG) or PDF files are allowed.");
            return;
        }
        if (f.size > 5 * 1024 * 1024) {
            setFileErr("File size must be under 5 MB.");
            return;
        }
        setFileErr("");
        setFile(f);

        if (f.type.startsWith("image/")) {
            const previewUrl = URL.createObjectURL(f);
            setFilePreview(previewUrl);
        } else {
            setFilePreview(null);
        }

        if (!title.trim()) {
            setTitle(f.name.replace(/\.[^/.]+$/, ""));
        }
    };

    const clearFile = () => {
        setFile(null);
        setFilePreview(null);
        setFileErr("");
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error("Please enter a document title.");
            return;
        }
        if (!file) {
            toast.error("Please select a file to upload.");
            return;
        }

        const fileData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.readAsDataURL(file);
        });

        try {
            await uploadDoc({
                title: title.trim(),
                fileData,
                fileType: file.type === "application/pdf" ? "pdf" : "image",
                remark: remark.trim() || undefined,
            }).unwrap();
            toast.success("Document uploaded successfully!");
            onSuccess?.();
            onClose();
        } catch (err) {
            toast.error(err?.data?.message || "Document upload failed.");
        }
    };

    const inputClasses = "w-full border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-gray-800 focus:outline-none focus:border-orange-400 focus:bg-white bg-gray-50 transition-all";
    const labelClasses = "block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[92vh] overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150 my-auto">
                
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-100 bg-gray-50/70 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center shadow-xs">
                            <UploadCloud size={18} />
                        </div>
                        <div>
                            <h3 className="text-xs sm:text-sm font-bold text-gray-900">Upload Document</h3>
                            <p className="text-[10px] sm:text-xs text-gray-400">Add certificate, resume or records</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleUpload} className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-4">
                    
                    {/* Quick Presets */}
                    <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1.5">
                            Suggested Titles <span className="text-gray-400 font-normal">(tap to pick)</span>
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {DOC_PRESETS.map((p, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setTitle(p)}
                                    className="px-2.5 py-1 text-[11px] font-semibold bg-gray-100 hover:bg-orange-50 hover:text-orange-600 border border-transparent hover:border-orange-200 rounded-lg text-gray-600 transition-all text-left"
                                >
                                    + {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title Input */}
                    <div>
                        <label className={labelClasses}>
                            <span>Document Title <span className="text-red-500">*</span></span>
                        </label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. AWS Certificate, BCA 1st Year Marksheet"
                            className={inputClasses}
                        />
                    </div>

                    {/* File Dropzone */}
                    <div>
                        <label className={labelClasses}>
                            <span>Select File <span className="text-red-500">*</span></span>
                            <span className="text-[10px] text-gray-400 font-normal">Max 5 MB</span>
                        </label>

                        {!file ? (
                            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl sm:rounded-2xl p-4 cursor-pointer hover:border-orange-400 hover:bg-orange-50/20 transition-all bg-gray-50/60">
                                <UploadCloud size={22} className="text-gray-400 mb-1" />
                                <span className="text-xs font-bold text-gray-700">
                                    Click or Drag File to Upload
                                </span>
                                <span className="text-[10px] text-gray-400 mt-0.5">
                                    PNG, JPG, PDF up to 5 MB
                                </span>
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={handleFile}
                                    className="hidden"
                                />
                            </label>
                        ) : (
                            <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between gap-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                    {filePreview ? (
                                        <img
                                            src={filePreview}
                                            alt="Preview"
                                            className="w-8 h-8 rounded-lg object-cover border border-emerald-300"
                                        />
                                    ) : (
                                        <FileText size={18} className="text-emerald-600 shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-emerald-950 truncate">{file.name}</p>
                                        <p className="text-[10px] text-emerald-600">
                                            {(file.size / 1024).toFixed(1)} KB • Ready to upload
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={clearFile}
                                    className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        )}
                        {fileErr && <p className="text-[11px] font-semibold text-rose-500 mt-1">{fileErr}</p>}
                    </div>

                    {/* Remark Input */}
                    <div>
                        <label className={labelClasses}>
                            <span>Remark / Note <span className="text-gray-400 font-normal">(Optional)</span></span>
                        </label>
                        <input
                            value={remark}
                            onChange={e => setRemark(e.target.value)}
                            placeholder="Optional description or details..."
                            className={inputClasses}
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 px-4 sm:px-6 py-3.5 bg-gray-50 border-t border-gray-100 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:flex-1 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors inline-flex items-center justify-center shrink-0 cursor-pointer"
                    >
                        <span>Cancel</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleUpload}
                        disabled={isLoading}
                        className={`w-full sm:flex-1 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl inline-flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                            isLoading
                                ? "bg-orange-300 text-white cursor-not-allowed"
                                : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xs"
                        }`}
                    >
                        {isLoading ? (
                            <>
                                <RefreshCw size={13} className="animate-spin" />
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                <UploadCloud size={14} />
                                <span>Upload File</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Main StudentDocuments Component ───────────────────────────────────────────
export default function StudentDocuments() {
    const [uploadOpen, setUploadOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("all"); // "all" | "pdf" | "image" | "verified" | "extra"

    const { data: profileData, isLoading: profileLoading } = useGetMyStudentProfileQuery();
    const { data: extraData, isLoading: extraLoading, refetch } = useGetMyExtraDocumentsQuery();

    const profileDocs = profileData?.data?.documents || [];
    const extraDocs = extraData?.data || [];

    // Unified deduplicated documents list sorted by newest first
    const allDocs = useMemo(() => {
        const list = [];
        const seen = new Set();

        (profileDocs || []).forEach(doc => {
            const key = String(doc._id || doc.id || doc.fileURL);
            if (!seen.has(key)) {
                seen.add(key);
                list.push({ ...doc, isExtra: doc.isExtra ?? false });
            }
        });

        (extraDocs || []).forEach(doc => {
            const key = String(doc._id || doc.id || doc.fileURL);
            if (!seen.has(key)) {
                seen.add(key);
                list.push({ ...doc, isExtra: true });
            }
        });

        return list.sort((a, b) => new Date(b.uploadedAt || b.createdAt || 0) - new Date(a.uploadedAt || a.createdAt || 0));
    }, [profileDocs, extraDocs]);

    const total = allDocs.length;
    const verifiedCount = useMemo(() => allDocs.filter(d => !d.isExtra).length, [allDocs]);
    const extraCount = useMemo(() => allDocs.filter(d => d.isExtra).length, [allDocs]);
    const pdfCount = useMemo(() => allDocs.filter(d => d.fileType === "pdf" || /\.pdf$/i.test(d.fileURL || "")).length, [allDocs]);
    const imgCount = useMemo(() => allDocs.filter(d => d.fileType === "image" || /\.(png|jpe?g|webp|gif)$/i.test(d.fileURL || "")).length, [allDocs]);

    // Search and filter logic
    const filteredDocs = useMemo(() => {
        let list = allDocs;

        if (filterType === "pdf") {
            list = list.filter(d => d.fileType === "pdf" || /\.pdf$/i.test(d.fileURL || ""));
        } else if (filterType === "image") {
            list = list.filter(d => d.fileType === "image" || /\.(png|jpe?g|webp|gif)$/i.test(d.fileURL || ""));
        } else if (filterType === "verified") {
            list = list.filter(d => !d.isExtra);
        } else if (filterType === "extra") {
            list = list.filter(d => d.isExtra);
        }

        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(d =>
                d.title?.toLowerCase().includes(q) ||
                d.remark?.toLowerCase().includes(q) ||
                d.fileType?.toLowerCase().includes(q) ||
                d.uploadedByName?.toLowerCase().includes(q)
            );
        }

        return list;
    }, [allDocs, filterType, search]);

    const isLoading = profileLoading || extraLoading;

    if (isLoading) {
        return (
            <div className="flex justify-center pt-20">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const filterTabs = [
        { key: "all", label: "All", count: total },
        { key: "pdf", label: "PDFs", count: pdfCount },
        { key: "image", label: "Images", count: imgCount },
        { key: "verified", label: "Verified Records", count: verifiedCount },
        { key: "extra", label: "Uploads", count: extraCount },
    ];

    return (
        <div className="space-y-4 sm:space-y-5">

            {/* Modals */}
            {uploadOpen && (
                <UploadModal
                    onClose={() => setUploadOpen(false)}
                    onSuccess={refetch}
                />
            )}

            {/* ── Top Hero Stats Card ── */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400" />
                <div className="p-3.5 sm:p-5">
                    
                    {/* Top Row: Title + Search + Upload */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-bold text-gray-900">My Documents</h2>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                                    {total}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {verifiedCount} official verified records · {extraCount} certificates & uploads
                            </p>
                        </div>

                        {/* Search & Upload CTA */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-60 md:w-64">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search documents..."
                                    className="w-full pl-8 pr-8 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white bg-gray-50 text-gray-800 transition-all duration-200 placeholder:text-gray-400"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => setUploadOpen(true)}
                                className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl transition-all duration-200 whitespace-nowrap shadow-xs active:scale-95 cursor-pointer"
                            >
                                <Plus size={16} />
                                <span>Upload</span>
                            </button>
                        </div>
                    </div>

                    {/* Stat Pills & Progress Bar */}
                    <div className="mt-3.5 pt-3 border-t border-gray-100/80">
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5">
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-50/80 border border-orange-100">
                                <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold text-orange-700 truncate">{total} Total Files</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-100">
                                <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold text-emerald-700 truncate">{verifiedCount} Verified</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50/80 border border-blue-100">
                                <FileText size={13} className="text-blue-500 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold text-blue-700 truncate">{pdfCount} PDFs</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-50/80 border border-purple-100">
                                <Sparkles size={13} className="text-purple-500 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold text-purple-700 truncate">{extraCount} Student Uploads</span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                            <div 
                                className="h-1.5 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500" 
                                style={{ width: `${total > 0 ? 100 : 0}%` }} 
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* ── Single Unified Card: All Documents ── */}
            <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col">
                
                {/* Card Header & Filter Bar */}
                <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50/30 via-white to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/70 flex items-center justify-center text-orange-600 shrink-0 shadow-2xs">
                            <Folder size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm sm:text-base font-black text-gray-900 tracking-tight">All Documents</h3>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                                    {filteredDocs.length}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Official verified records, marksheets, certificates & student uploads
                            </p>
                        </div>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                        {filterTabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setFilterType(tab.key)}
                                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                    filterType === tab.key
                                        ? "bg-orange-500 text-white shadow-xs"
                                        : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                    filterType === tab.key
                                        ? "bg-white/20 text-white"
                                        : "bg-white text-gray-700"
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Card Body: Unified Documents Grid */}
                <div className="p-4 sm:p-6 flex-1">
                    {filteredDocs.length === 0 ? (
                        <EmptyState
                            icon={Folder}
                            title={search || filterType !== "all" ? "No matching documents found" : "No documents available"}
                            subtitle={
                                search || filterType !== "all"
                                    ? "Try clearing your search query or selecting another filter."
                                    : "Upload your resume, certificates or internship proof to get started."
                            }
                            actionText={search || filterType !== "all" ? "Reset Filter" : "+ Upload Document"}
                            onAction={
                                search || filterType !== "all"
                                    ? () => { setSearch(""); setFilterType("all"); }
                                    : () => setUploadOpen(true)
                            }
                        />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                            {filteredDocs.map((doc, i) => (
                                <DocCard
                                    key={doc._id || doc.id || i}
                                    doc={doc}
                                    onPreview={previewDocumentInNewTab}
                                    onDownload={downloadDocumentFile}
                                />
                            ))}
                        </div>
                    )}
                </div>

            </div>

        </div>
    );
}
