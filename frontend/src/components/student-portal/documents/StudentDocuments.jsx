import { useState, useMemo } from "react";
import { toast } from "react-toastify";
import {
    Folder, FileText, UploadCloud, Search, X, Plus,
    ExternalLink, Eye, Trash2, CheckCircle2, ShieldCheck,
    Clock, RefreshCw, File, AlertCircle, Sparkles, Award
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

// ── Quick Preview Modal ───────────────────────────────────────────────────────
const DocPreviewModal = ({ doc, onClose }) => {
    if (!doc) return null;
    const isImage = doc.fileType === "image" || /\.(png|jpe?g|webp|gif)$/i.test(doc.fileURL || "");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150 my-auto flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-100 bg-gray-50/70 shrink-0">
                    <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 uppercase">
                                {doc.fileType || "file"}
                            </span>
                            <span className="text-[11px] text-gray-400">
                                {formatDate(doc.uploadedAt)}
                            </span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate mt-0.5">
                            {doc.title || "Document Preview"}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body Preview */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-gray-100/50 flex flex-col items-center justify-center min-h-[260px]">
                    {isImage ? (
                        <div className="rounded-xl overflow-hidden shadow-sm max-w-full max-h-[60vh] bg-white border border-gray-200">
                            <img
                                src={doc.fileURL}
                                alt={doc.title}
                                className="w-full h-full object-contain max-h-[60vh]"
                            />
                        </div>
                    ) : (
                        <div className="text-center p-8 bg-white rounded-2xl border border-gray-200 shadow-xs max-w-sm w-full">
                            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
                                <FileText size={28} />
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                                {doc.title}
                            </h4>
                            <p className="text-[11px] text-gray-400 mt-1">
                                PDF Document · Click below to view in full resolution
                            </p>
                            <a
                                href={doc.fileURL}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-xs"
                            >
                                <ExternalLink size={14} />
                                Open PDF in New Tab
                            </a>
                        </div>
                    )}

                    {doc.remark && (
                        <div className="w-full max-w-md mt-4 p-3 rounded-xl bg-white border border-gray-200 text-xs text-gray-600">
                            <span className="font-bold text-gray-400 text-[10px] uppercase block mb-0.5">Note:</span>
                            {doc.remark}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-100 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        Close
                    </button>
                    <a
                        href={doc.fileURL}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
                    >
                        <ExternalLink size={13} />
                        Open External
                    </a>
                </div>
            </div>
        </div>
    );
};

// ── Doc Card Component ────────────────────────────────────────────────────────
const DocCard = ({ doc, onPreview }) => {
    const isPdf = doc.fileType === "pdf" || /\.pdf$/i.test(doc.fileURL || "");

    return (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 p-3.5 sm:p-4 shadow-xs hover:shadow-sm hover:border-orange-200 transition-all duration-200 flex flex-col justify-between group">
            <div>
                {/* Header: File Icon + Type Badge */}
                <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isPdf ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
                    }`}>
                        <FileText size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase ${
                                isPdf ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                            }`}>
                                {doc.fileType || "file"}
                            </span>
                            <span className="text-[10px] text-gray-400">
                                {formatDate(doc.uploadedAt)}
                            </span>
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug truncate group-hover:text-orange-600 transition-colors">
                            {doc.title || "Document"}
                        </h4>

                        {doc.remark && (
                            <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">
                                {doc.remark}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions Bottom Bar */}
            <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-gray-100">
                <span className="text-[10px] text-gray-400">
                    {doc.uploadedByName ? `Uploaded by ${doc.uploadedByName}` : "Official Record"}
                </span>
                
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => onPreview(doc)}
                        className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-orange-50 hover:text-orange-600 text-gray-700 text-[11px] font-bold transition-colors flex items-center gap-1"
                    >
                        <Eye size={12} />
                        Preview
                    </button>
                    <a
                        href={doc.fileURL}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-orange-600 text-[11px] font-bold transition-colors flex items-center gap-1"
                        title="Open external link"
                    >
                        <ExternalLink size={12} />
                    </a>
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
                <div className="flex items-center gap-2.5 px-4 sm:px-6 py-3.5 bg-gray-50 border-t border-gray-100 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleUpload}
                        disabled={isLoading}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
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
    const [previewDoc, setPreviewDoc] = useState(null);
    const [mobileTab, setMobileTab] = useState("all"); // "all" | "core" | "extra"

    const { data: profileData, isLoading: profileLoading } = useGetMyStudentProfileQuery();
    const { data: extraData, isLoading: extraLoading, refetch } = useGetMyExtraDocumentsQuery();

    const allDocs = profileData?.data?.documents || [];
    const coreDocs = allDocs.filter(d => !d.isExtra);
    const extraDocs = extraData?.data || allDocs.filter(d => d.isExtra);
    const total = coreDocs.length + extraDocs.length;

    // Search filter
    const filteredCore = useMemo(() => {
        if (!search) return coreDocs;
        const q = search.toLowerCase();
        return coreDocs.filter(d =>
            d.title?.toLowerCase().includes(q) ||
            d.remark?.toLowerCase().includes(q) ||
            d.fileType?.toLowerCase().includes(q)
        );
    }, [coreDocs, search]);

    const filteredExtra = useMemo(() => {
        if (!search) return extraDocs;
        const q = search.toLowerCase();
        return extraDocs.filter(d =>
            d.title?.toLowerCase().includes(q) ||
            d.remark?.toLowerCase().includes(q) ||
            d.fileType?.toLowerCase().includes(q)
        );
    }, [extraDocs, search]);

    const totalFiltered = filteredCore.length + filteredExtra.length;
    const isLoading = profileLoading || extraLoading;

    if (isLoading) {
        return (
            <div className="flex justify-center pt-20">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-5">

            {/* Modals */}
            {uploadOpen && (
                <UploadModal
                    onClose={() => setUploadOpen(false)}
                    onSuccess={refetch}
                />
            )}

            {previewDoc && (
                <DocPreviewModal
                    doc={previewDoc}
                    onClose={() => setPreviewDoc(null)}
                />
            )}

            {/* ── Header Card (Matching StudentTasks & StudentPermissions) ── */}
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
                                {coreDocs.length} core records · {extraDocs.length} certificates & uploads
                            </p>
                        </div>

                        {/* Search & Upload CTA */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-60 md:w-64">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search documents or certificates..."
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
                                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all duration-200 whitespace-nowrap shadow-xs"
                            >
                                <Plus size={16} />
                                <span>Upload</span>
                            </button>
                        </div>
                    </div>

                    {/* Stat Pills & Progress Bar (Identical to StudentTasks / Permissions) */}
                    <div className="mt-3.5 pt-3 border-t border-gray-100/80">
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5">
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-50/80 border border-orange-100">
                                <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold text-orange-700 truncate">{total} Total Files</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50/80 border border-blue-100">
                                <FileText size={13} className="text-blue-500 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold text-blue-700 truncate">{coreDocs.length} Core Docs</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-100">
                                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold text-emerald-700 truncate">{extraDocs.length} Extra Uploads</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-50/80 border border-purple-100">
                                <ShieldCheck size={13} className="text-purple-500 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold text-purple-700 truncate">Verified Safe</span>
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

            {/* ── Mobile Status Tabs (md:hidden) — Matches StudentTasks / Permissions ── */}
            <div className="md:hidden bg-gray-100/90 p-1 rounded-xl flex gap-1 text-xs font-bold">
                <button
                    onClick={() => setMobileTab("all")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                        mobileTab === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <span>All</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-200 text-gray-700">
                        {totalFiltered}
                    </span>
                </button>
                <button
                    onClick={() => setMobileTab("core")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                        mobileTab === "core" ? "bg-white text-blue-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <span>Core</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
                        {filteredCore.length}
                    </span>
                </button>
                <button
                    onClick={() => setMobileTab("extra")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                        mobileTab === "extra" ? "bg-white text-orange-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <span>Extra</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-800">
                        {filteredExtra.length}
                    </span>
                </button>
            </div>

            {/* ── Mobile Documents List (md:hidden) ── */}
            <div className="md:hidden space-y-3">
                {mobileTab === "all" ? (
                    <>
                        {/* Core Documents Section */}
                        {filteredCore.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 px-1">
                                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Core Documents</h3>
                                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-100 text-blue-700">
                                        {filteredCore.length}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {filteredCore.map((doc, i) => (
                                        <DocCard
                                            key={doc._id || i}
                                            doc={doc}
                                            onPreview={setPreviewDoc}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Extra Documents Section */}
                        {filteredExtra.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 px-1">
                                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Extra Uploads & Certs</h3>
                                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-orange-100 text-orange-700">
                                        {filteredExtra.length}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {filteredExtra.map((doc, i) => (
                                        <DocCard
                                            key={doc._id || i}
                                            doc={doc}
                                            onPreview={setPreviewDoc}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : mobileTab === "core" ? (
                    <div className="space-y-2">
                        {filteredCore.length === 0 ? (
                            <EmptyState
                                icon={FileText}
                                title="No core documents found"
                                subtitle="Contact college administration for admission documents."
                                compact
                            />
                        ) : (
                            filteredCore.map((doc, i) => (
                                <DocCard
                                    key={doc._id || i}
                                    doc={doc}
                                    onPreview={setPreviewDoc}
                                />
                            ))
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredExtra.length === 0 ? (
                            <EmptyState
                                icon={Folder}
                                title="No extra documents yet"
                                subtitle="Upload your resume, course certificates or awards."
                                actionText="+ Upload Now"
                                onAction={() => setUploadOpen(true)}
                                compact
                            />
                        ) : (
                            filteredExtra.map((doc, i) => (
                                <DocCard
                                    key={doc._id || i}
                                    doc={doc}
                                    onPreview={setPreviewDoc}
                                />
                            ))
                        )}
                    </div>
                )}

                {/* Overall Empty State on Mobile */}
                {totalFiltered === 0 && (
                    <EmptyState
                        icon={FileText}
                        title={search ? "No matching documents found" : "No documents available"}
                        subtitle={search ? "Try adjusting your search query or reset filter." : "Upload your certificates or resume to get started."}
                        actionText={!search ? "Upload Document" : undefined}
                        onAction={!search ? () => setUploadOpen(true) : undefined}
                    />
                )}
            </div>

            {/* ── Desktop Two-Column View (hidden md:grid md:grid-cols-2 gap-5) ── */}
            <div className="hidden md:grid md:grid-cols-2 gap-5 items-start">

                {/* Left Column: Core Documents */}
                <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-blue-50/20">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                            <div>
                                <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">Core Documents</h3>
                                <p className="text-[11px] text-gray-400">Official college records, admission & identity</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            {filteredCore.length}
                        </span>
                    </div>

                    <div className="p-4">
                        {filteredCore.length === 0 ? (
                            <EmptyState
                                icon={FileText}
                                title="No core documents found"
                                subtitle="Contact college admin for verified records."
                                compact
                            />
                        ) : (
                            <div className="space-y-3">
                                {filteredCore.map((doc, i) => (
                                    <DocCard
                                        key={doc._id || i}
                                        doc={doc}
                                        onPreview={setPreviewDoc}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Extra Documents */}
                <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-orange-50/20">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                            <div>
                                <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">Extra Documents</h3>
                                <p className="text-[11px] text-gray-400">Resume, workshop certificates & achievements</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                {filteredExtra.length}
                            </span>
                            <button
                                onClick={() => setUploadOpen(true)}
                                className="text-[11px] font-bold text-orange-600 hover:text-orange-700"
                            >
                                + Upload
                            </button>
                        </div>
                    </div>

                    <div className="p-4">
                        {filteredExtra.length === 0 ? (
                            <EmptyState
                                icon={Folder}
                                title="No extra documents uploaded"
                                subtitle="Upload your resume, workshop certificates and achievements."
                                actionText="Upload Now"
                                onAction={() => setUploadOpen(true)}
                                compact
                            />
                        ) : (
                            <div className="space-y-3">
                                {filteredExtra.map((doc, i) => (
                                    <DocCard
                                        key={doc._id || i}
                                        doc={doc}
                                        onPreview={setPreviewDoc}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
