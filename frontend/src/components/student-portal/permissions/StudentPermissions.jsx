import { useState, useMemo } from "react";
import { toast } from "react-toastify";
import {
    ShieldCheck, Clock, CheckCircle2, AlertCircle, Calendar,
    Search, Plus, FileText, LayoutGrid, ListFilter,
    X, UploadCloud, Trash2,
    Eye, Printer, ChevronRight,
    Check, RefreshCw, Star
} from "lucide-react";
import {
    useGetMyPermissionsQuery,
    useApplyMyPermissionMutation,
    useGetFacultiesQuery,
    useGetMyStudentProfileQuery
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

const calculateDays = (from, to) => {
    if (!from || !to) return 0;
    const start = new Date(from);
    const end = new Date(to);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

const getRelativeTime = (d) => {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatDate(d);
};

const REASON_PRESETS = [
    { label: "Sick / Medical", text: "Medical leave due to health issues and doctor consultation." },
    { label: "Family Function", text: "Attending important family ceremony / wedding function." },
    { label: "Personal Work", text: "Urgent domestic / personal commitment at hometown." },
    { label: "Exam / Competition", text: "Participating in academic competition / competitive exam." },
    { label: "Campus Drive", text: "Attending off-campus interview / recruitment round." },
    { label: "Hometown Visit", text: "Traveling home for official documentation / family visit." },
];

const STATUS_COLS = [
    {
        key: "pending",
        label: "Pending",
        fullLabel: "Pending Review",
        dot: "bg-amber-400",
        colBg: "bg-amber-50/30",
        border: "border-amber-200/80",
        badge: "bg-amber-100 text-amber-700",
        emptyIcon: "text-amber-300",
        icon: Clock,
    },
    {
        key: "approved",
        label: "Approved",
        fullLabel: "Approved",
        dot: "bg-emerald-400",
        colBg: "bg-emerald-50/30",
        border: "border-emerald-200/80",
        badge: "bg-emerald-100 text-emerald-700",
        emptyIcon: "text-emerald-300",
        icon: CheckCircle2,
    },
    {
        key: "rejected",
        label: "Rejected",
        fullLabel: "Rejected",
        dot: "bg-rose-400",
        colBg: "bg-rose-50/30",
        border: "border-rose-200/80",
        badge: "bg-rose-100 text-rose-700",
        emptyIcon: "text-rose-300",
        icon: AlertCircle,
    },
];

// ── Gate Pass / Official Slip Modal ──────────────────────────────────────────
const GatePassModal = ({ item, student, onClose }) => {
    const days = calculateDays(item.fromDate, item.toDate);
    const passNumber = `SSES-GP-${(item._id || "000000").slice(-6).toUpperCase()}`;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150 my-auto">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-100 bg-gray-50/70">
                    <div className="flex items-center gap-2 text-emerald-600">
                        <ShieldCheck size={18} />
                        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Leave Gate Pass</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Printable Slip Area */}
                <div id="gate-pass-printable-card" className="p-4 sm:p-7 space-y-4 sm:space-y-5">
                    {/* College Banner */}
                    <div className="text-center pb-4 border-b-2 border-dashed border-gray-200">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500 text-white font-black text-base shadow-sm shadow-orange-500/20 mb-1.5">
                            SS
                        </div>
                        <h2 className="text-xs sm:text-sm font-black text-gray-900 tracking-tight leading-snug">
                            SANT SINGAJI INSTITUTE OF SCIENCE & MANAGEMENT
                        </h2>
                        <p className="text-[10px] font-semibold text-gray-500 tracking-wide uppercase mt-0.5">
                            Student Leave & Gate Clearance Pass
                        </p>
                        <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                            <CheckCircle2 size={12} />
                            <span>APPROVED & VERIFIED</span>
                        </div>
                    </div>

                    {/* Pass Details Grid */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 bg-gray-50/80 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-gray-100 text-xs">
                        <div>
                            <span className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Pass Number</span>
                            <span className="font-mono font-bold text-gray-800 text-[11px] sm:text-xs">{passNumber}</span>
                        </div>
                        <div>
                            <span className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Student Name</span>
                            <span className="font-bold text-gray-900 truncate block text-[11px] sm:text-xs">{student?.name || "Student"}</span>
                        </div>
                        <div>
                            <span className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">PR Key / Roll No</span>
                            <span className="font-mono font-bold text-orange-600 text-[11px] sm:text-xs">{student?.prkey || "—"}</span>
                        </div>
                        <div>
                            <span className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Course / Dept</span>
                            <span className="font-medium text-gray-800 truncate block text-[11px] sm:text-xs">{student?.course || student?.department || "Academic"}</span>
                        </div>
                    </div>

                    {/* Leave Period */}
                    <div className="border border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 space-y-2 bg-gradient-to-br from-white to-gray-50/50">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] sm:text-xs font-bold text-gray-600 uppercase tracking-wider">Leave Duration</span>
                            <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 text-[11px] font-bold">
                                {days} {days === 1 ? "Day" : "Days"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                            <div>
                                <span className="text-[9px] text-gray-400 block font-semibold">FROM DATE</span>
                                <span className="font-bold text-gray-900 text-[11px] sm:text-xs">{formatDate(item.fromDate)}</span>
                            </div>
                            <div className="text-gray-300 font-light">→</div>
                            <div className="text-right">
                                <span className="text-[9px] text-gray-400 block font-semibold">TO DATE</span>
                                <span className="font-bold text-gray-900 text-[11px] sm:text-xs">{formatDate(item.toDate)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-1 text-xs">
                        <span className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Purpose / Reason</span>
                        <p className="p-2.5 sm:p-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 text-xs font-medium leading-relaxed">
                            {item.reason}
                        </p>
                    </div>

                    {/* Approver info */}
                    <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                        <div>
                            <span className="text-[9px] text-gray-400 block font-semibold">RECOMMENDED BY</span>
                            <span className="font-bold text-gray-700 text-[11px]">
                                {item.assignedFacultyId?.name || "Assigned Faculty"}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-[9px] text-gray-400 block font-semibold">APPROVED BY</span>
                            <span className="font-bold text-emerald-600 text-[11px]">
                                {item.approvedBy || "Institution Head"}
                            </span>
                        </div>
                    </div>

                    {item.remark && (
                        <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-800 text-[11px]">
                            <span className="font-bold">Note:</span> {item.remark}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center gap-2.5 px-4 sm:px-6 py-3.5 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                        <Printer size={14} />
                        Print / Download
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Detailed Application Modal ────────────────────────────────────────────────
const PermissionDetailModal = ({ item, student, onClose, onOpenGatePass }) => {
    const colCfg = STATUS_COLS.find(c => c.key === item.status) || STATUS_COLS[0];
    const StatusIcon = colCfg.icon;
    const days = calculateDays(item.fromDate, item.toDate);
    const passNumber = `PERM-${(item._id || "000000").slice(-6).toUpperCase()}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150 my-auto">
                
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-100 bg-gray-50/70">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold text-gray-500">{passNumber}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${colCfg.badge}`}>
                                <StatusIcon size={11} />
                                {colCfg.fullLabel}
                            </span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900 mt-0.5">Permission Details</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                    
                    {/* Stepper Progress */}
                    <div className="bg-gray-50/80 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border border-gray-100">
                        <div className="relative flex items-center justify-between px-2">
                            <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-0.5 bg-gray-200 -z-0" />
                            
                            {/* Step 1 */}
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                                    <Check size={12} />
                                </div>
                                <span className="text-[10px] font-bold text-gray-800 mt-1">Submitted</span>
                                <span className="text-[8px] text-gray-400">{formatDate(item.uploadDate)}</span>
                            </div>

                            {/* Step 2 */}
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-xs ${
                                    item.status === "pending" 
                                        ? "bg-amber-500 text-white animate-pulse"
                                        : "bg-emerald-500 text-white"
                                }`}>
                                    {item.status === "pending" ? <Clock size={12} /> : <Check size={12} />}
                                </div>
                                <span className="text-[10px] font-bold text-gray-800 mt-1">Faculty</span>
                                <span className="text-[8px] text-gray-400 max-w-[70px] truncate">
                                    {item.assignedFacultyId?.name || "Assigned"}
                                </span>
                            </div>

                            {/* Step 3 */}
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-xs ${
                                    item.status === "approved"
                                        ? "bg-emerald-500 text-white"
                                        : item.status === "rejected"
                                        ? "bg-rose-500 text-white"
                                        : "bg-gray-200 text-gray-400"
                                }`}>
                                    {item.status === "approved" ? (
                                        <CheckCircle2 size={12} />
                                    ) : item.status === "rejected" ? (
                                        <AlertCircle size={12} />
                                    ) : (
                                        <Clock size={12} />
                                    )}
                                </div>
                                <span className="text-[10px] font-bold text-gray-800 mt-1">
                                    {item.status === "approved" ? "Approved" : item.status === "rejected" ? "Rejected" : "Decision"}
                                </span>
                                <span className="text-[8px] text-gray-400">
                                    {item.approvedAt ? formatDate(item.approvedAt) : (item.status === "pending" ? "Awaiting" : "—")}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Duration Banner */}
                    <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl bg-orange-50/60 border border-orange-200/70">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                <Calendar size={16} />
                            </div>
                            <div>
                                <span className="text-[9px] font-bold text-orange-600 uppercase tracking-wider block">Duration</span>
                                <span className="text-xs font-bold text-gray-900">
                                    {formatDate(item.fromDate)} → {formatDate(item.toDate)}
                                </span>
                            </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-orange-200 text-orange-700 text-xs font-black shadow-2xs">
                            {days} {days === 1 ? "Day" : "Days"}
                        </span>
                    </div>

                    {/* Reason */}
                    <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Reason for Leave
                        </span>
                        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs font-medium text-gray-800 leading-relaxed">
                            {item.reason}
                        </div>
                    </div>

                    {/* Assigned Faculty */}
                    <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Assigned Faculty
                        </span>
                        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {(item.assignedFacultyId?.name || "F")[0].toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-gray-900 truncate">
                                    {item.assignedFacultyId?.name || "Assigned Faculty"}
                                </p>
                                <p className="text-[10px] text-gray-500 truncate">
                                    {item.assignedFacultyId?.position || item.assignedFacultyId?.role?.toUpperCase() || "Faculty Member"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Remarks */}
                    {item.remark && (
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                Official Remarks
                            </span>
                            <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                                item.status === "approved"
                                    ? "bg-emerald-50/60 border-emerald-200/80 text-emerald-900"
                                    : "bg-rose-50/60 border-rose-200/80 text-rose-900"
                            }`}>
                                <span className="font-bold block text-[9px] uppercase tracking-wider mb-0.5">
                                    By {item.approvedBy || "Reviewer"}:
                                </span>
                                {item.remark}
                            </div>
                        </div>
                    )}

                    {/* Attached Document */}
                    {item.imageURL && (
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                Supporting Document
                            </span>
                            <div className="p-2.5 rounded-xl border border-gray-200/80 bg-gray-50 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FileText size={15} className="text-orange-500 shrink-0" />
                                    <span className="text-xs font-bold text-gray-800 truncate">
                                        Attached File / Certificate
                                    </span>
                                </div>
                                <a
                                    href={item.imageURL}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-orange-600 text-xs font-bold hover:bg-orange-50 transition-all flex items-center gap-1 shadow-2xs"
                                >
                                    <Eye size={12} />
                                    View
                                </a>
                            </div>

                            {!item.imageURL.toLowerCase().endsWith(".pdf") && (
                                <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 max-h-40 flex items-center justify-center">
                                    <img
                                        src={item.imageURL}
                                        alt="Attachment"
                                        className="w-full h-full object-contain max-h-40"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2.5 px-4 sm:px-6 py-3.5 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        Close
                    </button>
                    {item.status === "approved" && (
                        <button
                            onClick={() => {
                                onClose();
                                onOpenGatePass(item);
                            }}
                            className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                            <ShieldCheck size={14} />
                            Gate Pass
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Apply For Permission Modal ────────────────────────────────────────────────
const ApplyModal = ({ onClose }) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const [form, setForm] = useState({
        reason: "",
        fromDate: todayStr,
        toDate: todayStr,
        assignedFacultyId: ""
    });
    const [file, setFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [fileErr, setFileErr] = useState("");

    const [applyPermission, { isLoading }] = useApplyMyPermissionMutation();
    const { data: facultiesRes, isLoading: facultiesLoading } = useGetFacultiesQuery();

    const leaveDays = calculateDays(form.fromDate, form.toDate);
    const isDateInvalid = form.fromDate && form.toDate && new Date(form.toDate) < new Date(form.fromDate);

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
    };

    const clearFile = () => {
        setFile(null);
        setFilePreview(null);
        setFileErr("");
    };

    const handlePresetClick = (presetText) => {
        setForm(p => ({
            ...p,
            reason: p.reason ? `${presetText} ${p.reason}`.trim() : presetText
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.reason.trim()) {
            toast.error("Please provide a reason for leave.");
            return;
        }
        if (!form.fromDate || !form.toDate) {
            toast.error("Both From Date and To Date are required.");
            return;
        }
        if (isDateInvalid) {
            toast.error("To Date cannot be before From Date.");
            return;
        }
        if (!form.assignedFacultyId) {
            toast.error("Please assign a reviewing faculty member.");
            return;
        }

        let imageURL = "";
        if (file) {
            imageURL = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (ev) => resolve(ev.target.result);
                reader.readAsDataURL(file);
            });
        }

        try {
            await applyPermission({
                ...form,
                imageURL: imageURL || undefined
            }).unwrap();
            toast.success("Permission request submitted successfully!");
            onClose();
        } catch (err) {
            toast.error(err?.data?.message || "Failed to submit permission application.");
        }
    };

    const inputClasses = "w-full border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-gray-800 focus:outline-none focus:border-orange-400 focus:bg-white bg-gray-50 transition-all";
    const labelClasses = "block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150 my-auto">
                
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-100 bg-gray-50/70 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center shadow-xs">
                            <Plus size={18} />
                        </div>
                        <div>
                            <h3 className="text-xs sm:text-sm font-bold text-gray-900">Apply for Permission</h3>
                            <p className="text-[10px] sm:text-xs text-gray-400">Leave request for faculty endorsement</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-4">
                    
                    {/* Reason Presets */}
                    <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1.5">
                            Quick Reason Presets <span className="text-gray-400 font-normal">(tap to fill)</span>
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {REASON_PRESETS.map((preset, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handlePresetClick(preset.text)}
                                    className="px-2.5 py-1 text-[11px] font-semibold bg-gray-100 hover:bg-orange-50 hover:text-orange-600 border border-transparent hover:border-orange-200 rounded-lg text-gray-600 transition-all text-left"
                                >
                                    + {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reason Textarea */}
                    <div>
                        <label className={labelClasses}>
                            <span>Detailed Reason <span className="text-red-500">*</span></span>
                        </label>
                        <textarea
                            value={form.reason}
                            onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                            rows={3}
                            placeholder="Enter reason for leave / permission..."
                            className={`${inputClasses} resize-none`}
                        />
                    </div>

                    {/* Date Pickers */}
                    <div>
                        <label className={labelClasses}>
                            <span>Leave Period <span className="text-red-500">*</span></span>
                        </label>
                        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                            <div>
                                <span className="text-[10px] text-gray-400 block font-semibold mb-0.5">FROM DATE</span>
                                <input
                                    type="date"
                                    value={form.fromDate}
                                    onChange={e => setForm(p => ({ ...p, fromDate: e.target.value }))}
                                    className={inputClasses}
                                />
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 block font-semibold mb-0.5">TO DATE</span>
                                <input
                                    type="date"
                                    value={form.toDate}
                                    min={form.fromDate}
                                    onChange={e => setForm(p => ({ ...p, toDate: e.target.value }))}
                                    className={inputClasses}
                                />
                            </div>
                        </div>

                        {/* Real-time Duration Pill */}
                        {form.fromDate && form.toDate && (
                            <div className="mt-2">
                                {isDateInvalid ? (
                                    <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
                                        <AlertCircle size={12} />
                                        To Date cannot be earlier than From Date.
                                    </p>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200/60 text-orange-800 text-xs font-medium">
                                        <Calendar size={13} className="text-orange-500 shrink-0" />
                                        <span>
                                            Duration: <strong className="font-bold">{leaveDays} {leaveDays === 1 ? "Day" : "Days"}</strong> ({formatDate(form.fromDate)} → {formatDate(form.toDate)})
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Faculty Assignment */}
                    <div>
                        <label className={labelClasses}>
                            <span>Assign Faculty Member <span className="text-red-500">*</span></span>
                        </label>
                        <div className="relative">
                            <select
                                value={form.assignedFacultyId}
                                onChange={e => setForm(p => ({ ...p, assignedFacultyId: e.target.value }))}
                                className={`${inputClasses} appearance-none cursor-pointer pr-8 font-medium`}
                            >
                                <option value="">— Select Faculty —</option>
                                {(facultiesRes?.data || []).map(fac => (
                                    <option key={fac._id} value={fac._id}>
                                        {fac.name} ({fac.role?.toUpperCase() || "FACULTY"}) {fac.position ? `· ${fac.position}` : ""}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <ChevronRight size={14} className="rotate-90" />
                            </div>
                        </div>
                    </div>

                    {/* File Upload Dropzone */}
                    <div>
                        <label className={labelClasses}>
                            <span>Supporting Document <span className="text-gray-400 font-normal">(Optional)</span></span>
                        </label>
                        
                        {!file ? (
                            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl sm:rounded-2xl p-3.5 cursor-pointer hover:border-orange-400 hover:bg-orange-50/20 transition-all bg-gray-50/60">
                                <UploadCloud size={20} className="text-gray-400 mb-1" />
                                <span className="text-xs font-bold text-gray-700">
                                    Upload Document or Photo
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
                                            {(file.size / 1024).toFixed(1)} KB
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
                </form>

                {/* Modal Footer */}
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
                        onClick={handleSubmit}
                        disabled={isLoading || isDateInvalid || facultiesLoading}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                            isLoading || isDateInvalid
                                ? "bg-orange-300 text-white cursor-not-allowed"
                                : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xs"
                        }`}
                    >
                        {isLoading ? (
                            <>
                                <RefreshCw size={13} className="animate-spin" />
                                <span>Submitting...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={14} />
                                <span>Submit Request</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Permission Card (Kanban & Mobile List) ────────────────────────────────────
const PermissionCard = ({ item, onOpenDetails, onOpenGatePass }) => {
    const colCfg = STATUS_COLS.find(c => c.key === item.status) || STATUS_COLS[0];
    const StatusIcon = colCfg.icon;
    const days = calculateDays(item.fromDate, item.toDate);

    return (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 p-3 sm:p-4 shadow-xs hover:shadow-sm hover:border-orange-200 transition-all duration-200 flex flex-col justify-between group">
            <div>
                {/* Header: Duration Badge + Status */}
                <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-bold">
                        <Calendar size={11} className="text-gray-400" />
                        {days} {days === 1 ? "Day" : "Days"}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border ${colCfg.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${colCfg.dot}`} />
                        {colCfg.label}
                    </span>
                </div>

                {/* Reason */}
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2 mb-1.5 group-hover:text-orange-600 transition-colors">
                    {item.reason || "Permission application"}
                </h4>

                {/* Dates */}
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium mb-2.5">
                    <Clock size={11} className="text-gray-400 shrink-0" />
                    <span>{formatDate(item.fromDate)}</span>
                    <span className="text-gray-300">→</span>
                    <span>{formatDate(item.toDate)}</span>
                </div>

                {/* Assigned Faculty */}
                {item.assignedFacultyId && (
                    <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-50 border border-gray-100 mb-2.5">
                        <div className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-[8px] shrink-0">
                            {(item.assignedFacultyId.name || "F")[0]}
                        </div>
                        <span className="text-[11px] font-semibold text-gray-700 truncate">
                            {item.assignedFacultyId.name}
                        </span>
                    </div>
                )}

                {/* Remark */}
                {item.remark && (
                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-[11px] text-gray-600 mb-2.5 line-clamp-2">
                        <span className="font-bold text-gray-400 text-[9px] uppercase tracking-wider block">Note</span>
                        {item.remark}
                    </div>
                )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2 mt-0.5">
                <span className="text-[10px] text-gray-400 font-medium">
                    {getRelativeTime(item.uploadDate)}
                </span>
                <div className="flex items-center gap-1.5">
                    {item.status === "approved" && (
                        <button
                            onClick={() => onOpenGatePass(item)}
                            className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold transition-colors flex items-center gap-1 border border-emerald-200"
                        >
                            <ShieldCheck size={11} />
                            Pass
                        </button>
                    )}
                    <button
                        onClick={() => onOpenDetails(item)}
                        className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-orange-50 hover:text-orange-600 text-gray-600 text-[11px] font-bold transition-colors flex items-center gap-1"
                    >
                        <Eye size={11} />
                        Details
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Permission Row (List View on Desktop) ─────────────────────────────────────
const PermissionRow = ({ item, onOpenDetails, onOpenGatePass }) => {
    const colCfg = STATUS_COLS.find(c => c.key === item.status) || STATUS_COLS[0];
    const StatusIcon = colCfg.icon;
    const days = calculateDays(item.fromDate, item.toDate);

    return (
        <div className="bg-white rounded-xl border border-gray-200/80 p-3.5 shadow-xs hover:shadow-sm hover:border-orange-200 transition-all duration-200 flex items-center justify-between gap-4">
            
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    item.status === "approved" ? "bg-emerald-50 text-emerald-600" :
                    item.status === "rejected" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                }`}>
                    <StatusIcon size={18} />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[11px] font-bold border ${colCfg.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${colCfg.dot}`} />
                            {colCfg.label}
                        </span>
                        <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded-md">
                            {days} {days === 1 ? "Day" : "Days"}
                        </span>
                        <span className="text-[11px] text-gray-400">
                            {formatDate(item.uploadDate)}
                        </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-1 mb-0.5">
                        {item.reason}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        <div className="flex items-center gap-1 font-medium text-[11px]">
                            <Calendar size={11} className="text-gray-400" />
                            <span>{formatDate(item.fromDate)} → {formatDate(item.toDate)}</span>
                        </div>
                        {item.assignedFacultyId && (
                            <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.2 rounded">
                                Reviewer: {item.assignedFacultyId.name}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
                {item.status === "approved" && (
                    <button
                        onClick={() => onOpenGatePass(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all flex items-center gap-1 border border-emerald-200"
                    >
                        <ShieldCheck size={13} />
                        <span>Pass</span>
                    </button>
                )}
                <button
                    onClick={() => onOpenDetails(item)}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-orange-50 hover:text-orange-600 text-gray-700 text-xs font-bold transition-all flex items-center gap-1"
                >
                    <Eye size={13} />
                    <span>Details</span>
                </button>
            </div>
        </div>
    );
};

// ── Main Page Component ───────────────────────────────────────────────────────
export default function StudentPermissions() {
    const [applyOpen, setApplyOpen] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState(null);
    const [selectedGatePass, setSelectedGatePass] = useState(null);
    const [search, setSearch] = useState("");
    const [mobileTab, setMobileTab] = useState("all"); // "all" | "pending" | "approved" | "rejected"
    const [desktopFilter, setDesktopFilter] = useState("all");
    const [viewMode, setViewMode] = useState("kanban"); // "kanban" | "list"
    const [sortBy, setSortBy] = useState("newest");

    const { data: permissionsRes, isLoading } = useGetMyPermissionsQuery();
    const { data: studentRes } = useGetMyStudentProfileQuery();

    const studentProfile = studentRes?.data || {};
    const permissions = useMemo(() => permissionsRes?.data || [], [permissionsRes]);

    // Metrics
    const totalRequests = permissions.length;
    const pendingCount = permissions.filter(p => p.status === "pending").length;
    const approvedCount = permissions.filter(p => p.status === "approved").length;
    const rejectedCount = permissions.filter(p => p.status === "rejected").length;
    const approvalRate = totalRequests > 0 ? Math.round((approvedCount / totalRequests) * 100) : 0;

    const totalApprovedDays = permissions
        .filter(p => p.status === "approved")
        .reduce((sum, p) => sum + calculateDays(p.fromDate, p.toDate), 0);

    // Filtered by search & sort
    const sortedPermissions = useMemo(() => {
        let list = permissions.filter(p => {
            if (!search) return true;
            const q = search.toLowerCase();
            return (
                p.reason?.toLowerCase().includes(q) ||
                p.assignedFacultyId?.name?.toLowerCase().includes(q) ||
                formatDate(p.fromDate).toLowerCase().includes(q) ||
                formatDate(p.toDate).toLowerCase().includes(q)
            );
        });

        list.sort((a, b) => {
            if (sortBy === "oldest") return new Date(a.uploadDate || 0) - new Date(b.uploadDate || 0);
            if (sortBy === "duration") return calculateDays(b.fromDate, b.toDate) - calculateDays(a.fromDate, a.toDate);
            return new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0);
        });

        return list;
    }, [permissions, search, sortBy]);

    // Split by status for mobile & kanban
    const byStatus = useMemo(() => ({
        pending: sortedPermissions.filter(p => p.status === "pending"),
        approved: sortedPermissions.filter(p => p.status === "approved"),
        rejected: sortedPermissions.filter(p => p.status === "rejected"),
    }), [sortedPermissions]);

    // Desktop filter applied
    const desktopFilteredPermissions = useMemo(() => {
        if (desktopFilter === "all") return sortedPermissions;
        return sortedPermissions.filter(p => p.status === desktopFilter);
    }, [sortedPermissions, desktopFilter]);

    const studentInfo = {
        name: `${studentProfile.firstName || ""} ${studentProfile.lastName || ""}`.trim() || "Student",
        prkey: studentProfile.prkey || "—",
        course: studentProfile.course || studentProfile.subDepartmentId?.name || "Academic",
        department: studentProfile.department || ""
    };

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
            {applyOpen && <ApplyModal onClose={() => setApplyOpen(false)} />}
            
            {selectedDetail && (
                <PermissionDetailModal
                    item={selectedDetail}
                    student={studentInfo}
                    onClose={() => setSelectedDetail(null)}
                    onOpenGatePass={(item) => setSelectedGatePass(item)}
                />
            )}

            {selectedGatePass && (
                <GatePassModal
                    item={selectedGatePass}
                    student={studentInfo}
                    onClose={() => setSelectedGatePass(null)}
                />
            )}

            {/* ── Header Card (Matches StudentTasks Header Style) ── */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400" />
                <div className="p-3.5 sm:p-5">
                    
                    {/* Top Row: Title + Search + Apply */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-bold text-gray-900">Permissions</h2>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                                    {totalRequests}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {approvedCount} approved · {pendingCount} pending review
                            </p>
                        </div>

                        {/* Search & Apply Button */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-60 md:w-64">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search reason or faculty..."
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
                                onClick={() => setApplyOpen(true)}
                                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all duration-200 whitespace-nowrap shadow-xs"
                            >
                                <Plus size={16} />
                                <span>Apply</span>
                            </button>
                        </div>
                    </div>

                    {/* Stat Pills & Progress Bar (Identical to StudentTasks) */}
                    <div className="mt-3.5 pt-3 border-t border-gray-100/80">
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5">
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-50/80 border border-orange-100">
                                <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold text-orange-700 truncate">{approvalRate}% Approved</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-100">
                                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold text-emerald-700 truncate">{approvedCount} Approved</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50/80 border border-amber-100">
                                <Clock size={13} className="text-amber-500 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold text-amber-700 truncate">{pendingCount} Pending</span>
                            </div>
                            {totalApprovedDays > 0 && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-yellow-50/80 border border-yellow-100">
                                    <Calendar size={13} className="text-yellow-600 shrink-0" />
                                    <span className="text-[11px] sm:text-xs font-bold text-yellow-700 truncate">{totalApprovedDays} Days Total</span>
                                </div>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                            <div 
                                className="h-1.5 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500" 
                                style={{ width: `${approvalRate}%` }} 
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* ── Mobile Status Tabs (md:hidden) — Exactly like StudentTasks ── */}
            <div className="md:hidden bg-gray-100/90 p-1 rounded-xl flex gap-1 text-xs font-bold">
                <button
                    onClick={() => setMobileTab("all")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                        mobileTab === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <span>All</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-200 text-gray-700">
                        {sortedPermissions.length}
                    </span>
                </button>
                <button
                    onClick={() => setMobileTab("pending")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                        mobileTab === "pending" ? "bg-white text-amber-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <span>Pending</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
                        {byStatus.pending.length}
                    </span>
                </button>
                <button
                    onClick={() => setMobileTab("approved")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                        mobileTab === "approved" ? "bg-white text-emerald-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <span>Approved</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                        {byStatus.approved.length}
                    </span>
                </button>
                {byStatus.rejected.length > 0 && (
                    <button
                        onClick={() => setMobileTab("rejected")}
                        className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                            mobileTab === "rejected" ? "bg-white text-rose-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        <span>Rejected</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800">
                            {byStatus.rejected.length}
                        </span>
                    </button>
                )}
            </div>

            {/* ── Mobile Permissions List (md:hidden) — Matches StudentTasks ── */}
            <div className="md:hidden space-y-3">
                {mobileTab === "all" ? (
                    // Grouped view for "All" tab on mobile
                    STATUS_COLS.map(col => {
                        const items = byStatus[col.key];
                        if (items.length === 0) return null;
                        return (
                            <div key={col.key} className="space-y-2">
                                <div className="flex items-center gap-2 px-1">
                                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{col.label}</h3>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                                        {items.length}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {items.map(item => (
                                        <PermissionCard
                                            key={item._id}
                                            item={item}
                                            onOpenDetails={(it) => setSelectedDetail(it)}
                                            onOpenGatePass={(it) => setSelectedGatePass(it)}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    // Single status tab view on mobile
                    <div className="space-y-2">
                        {byStatus[mobileTab].length === 0 ? (
                            <EmptyState
                                icon={ShieldCheck}
                                title={`No ${mobileTab} requests found`}
                                subtitle={mobileTab === "pending" ? "Submit a new permission or leave request." : `No ${mobileTab} permission requests to display.`}
                                actionText={mobileTab === "pending" ? "Apply Now" : undefined}
                                onAction={mobileTab === "pending" ? () => setApplyOpen(true) : undefined}
                                compact
                            />
                        ) : (
                            byStatus[mobileTab].map(item => (
                                <PermissionCard
                                    key={item._id}
                                    item={item}
                                    onOpenDetails={(it) => setSelectedDetail(it)}
                                    onOpenGatePass={(it) => setSelectedGatePass(it)}
                                />
                            ))
                        )}
                    </div>
                )}

                {/* Overall Empty State on Mobile */}
                {sortedPermissions.length === 0 && (
                    <EmptyState
                        icon={ShieldCheck}
                        title={search ? "No matching permissions found" : "No permission requests yet"}
                        subtitle={search ? "Try clearing your search query or reset filter." : "Submit a leave request for fast faculty approval."}
                        actionText={!search ? "Apply for Permission" : undefined}
                        onAction={!search ? () => setApplyOpen(true) : undefined}
                    />
                )}
            </div>

            {/* ── Desktop Controls & View (hidden md:block) ── */}
            <div className="hidden md:block space-y-4">
                
                {/* Desktop Filter Bar & View Switcher */}
                <div className="flex items-center justify-between gap-3">
                    {/* Status Filter Chips */}
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setDesktopFilter("all")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                desktopFilter === "all"
                                    ? "bg-gray-900 text-white shadow-xs"
                                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                            }`}
                        >
                            <span>All</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-700 text-white">
                                {sortedPermissions.length}
                            </span>
                        </button>
                        {STATUS_COLS.map(col => {
                            const count = byStatus[col.key].length;
                            const isActive = desktopFilter === col.key;
                            return (
                                <button
                                    key={col.key}
                                    onClick={() => setDesktopFilter(col.key)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                        isActive
                                            ? "bg-orange-500 text-white shadow-xs"
                                            : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                                    }`}
                                >
                                    <span>{col.label}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                        isActive ? "bg-orange-700 text-white" : "bg-gray-100 text-gray-600"
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Sort & View Switcher */}
                    <div className="flex items-center gap-2">
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            className="text-xs font-semibold bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-gray-700 focus:outline-none focus:border-orange-400 cursor-pointer"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="duration">Longest Duration</option>
                        </select>

                        <div className="flex items-center p-0.5 bg-gray-100 rounded-xl border border-gray-200">
                            <button
                                onClick={() => setViewMode("kanban")}
                                className={`p-1.5 rounded-lg transition-colors ${
                                    viewMode === "kanban" ? "bg-white text-orange-600 shadow-2xs" : "text-gray-500 hover:text-gray-700"
                                }`}
                                title="Kanban Board View"
                            >
                                <LayoutGrid size={15} />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`p-1.5 rounded-lg transition-colors ${
                                    viewMode === "list" ? "bg-white text-orange-600 shadow-2xs" : "text-gray-500 hover:text-gray-700"
                                }`}
                                title="List View"
                            >
                                <ListFilter size={15} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* View Content: Kanban vs List */}
                {desktopFilteredPermissions.length === 0 ? (
                    <EmptyState
                        icon={ShieldCheck}
                        title="No permission requests found"
                        subtitle={search ? "Try resetting your search query or filter options." : "Submit a new permission or leave request to get started."}
                        actionText={!search ? "Apply for Permission" : undefined}
                        onAction={!search ? () => setApplyOpen(true) : undefined}
                    />
                ) : viewMode === "list" ? (
                    /* Desktop List View */
                    <div className="space-y-2.5">
                        {desktopFilteredPermissions.map(item => (
                            <PermissionRow
                                key={item._id}
                                item={item}
                                onOpenDetails={(it) => setSelectedDetail(it)}
                                onOpenGatePass={(it) => setSelectedGatePass(it)}
                            />
                        ))}
                    </div>
                ) : (
                    /* Desktop Kanban Columns */
                    <div className="grid md:grid-cols-3 gap-4 items-start">
                        {STATUS_COLS.map(col => {
                            const items = byStatus[col.key];
                            return (
                                <div key={col.key} className={`rounded-2xl border ${col.border} ${col.colBg} p-3.5 space-y-3`}>
                                    
                                    {/* Column Header */}
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{col.label}</h3>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                                            {items.length}
                                        </span>
                                    </div>

                                    {/* Cards */}
                                    <div className="space-y-2.5">
                                        {items.length === 0 ? (
                                            <div className="p-8 text-center bg-white/70 rounded-xl border border-dashed border-gray-200">
                                                <col.icon size={20} className={`${col.emptyIcon} mx-auto mb-1`} />
                                                <p className="text-[11px] font-medium text-gray-400">No {col.label.toLowerCase()} requests</p>
                                                {col.key === "pending" && (
                                                    <button
                                                        onClick={() => setApplyOpen(true)}
                                                        className="mt-2 text-xs font-semibold text-orange-500 hover:underline"
                                                    >
                                                        + Apply now
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            items.map(item => (
                                                <PermissionCard
                                                    key={item._id}
                                                    item={item}
                                                    onOpenDetails={(it) => setSelectedDetail(it)}
                                                    onOpenGatePass={(it) => setSelectedGatePass(it)}
                                                />
                                            ))
                                        )}
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                )}

            </div>

            {/* Print Styling for Gate Pass */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #gate-pass-printable-card, #gate-pass-printable-card * {
                        visibility: visible;
                    }
                    #gate-pass-printable-card {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 20px;
                        border: none !important;
                        box-shadow: none !important;
                    }
                }
            `}} />
        </div>
    );
}
