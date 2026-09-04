import { useState } from "react";
import { toast } from "react-toastify";
import {
    MdClose, MdCheckCircle, MdAccessTime, MdWarning,
    MdArrowUpward, MdSecurity, MdOpenInNew, MdSearch, MdAdd
} from "react-icons/md";
import {
    useGetMyPermissionsQuery,
    useApplyMyPermissionMutation,
    useGetFacultiesQuery,
} from "../../../redux/api/studentApi";

const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const STATUS_COLS = [
    { key: "pending",  label: "Pending",  dot: "bg-orange-400", colBg: "bg-orange-50",  border: "border-orange-100", badge: "bg-orange-100 text-orange-600",  emptyColor: "text-orange-200" },
    { key: "approved", label: "Approved", dot: "bg-green-400",  colBg: "bg-green-50",   border: "border-green-100",  badge: "bg-green-100 text-green-600",   emptyColor: "text-green-200"  },
    { key: "rejected", label: "Rejected", dot: "bg-red-400",    colBg: "bg-red-50",     border: "border-red-100",    badge: "bg-red-100 text-red-500",       emptyColor: "text-red-200"    },
];

const statusIcon = (s) => {
    if (s === "approved") return <MdCheckCircle size={16} className="text-green-500" />;
    if (s === "rejected") return <MdWarning size={16} className="text-red-500" />;
    return <MdAccessTime size={16} className="text-orange-500" />;
};

// ── Apply Modal ───────────────────────────────────────────────────────────────
const ApplyModal = ({ onClose }) => {
    const [form, setForm]       = useState({ reason: "", fromDate: "", toDate: "", assignedFacultyId: "" });
    const [file, setFile]       = useState(null);
    const [fileErr, setFileErr] = useState("");
    const [applyPermission, { isLoading }] = useApplyMyPermissionMutation();
    const { data: facultiesRes } = useGetFacultiesQuery();

    const handleFile = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        if (!f.type.startsWith("image/") && f.type !== "application/pdf") {
            setFileErr("Only image or PDF allowed"); return;
        }
        if (f.size > 5 * 1024 * 1024) { setFileErr("File must be under 5 MB"); return; }
        setFileErr(""); setFile(f);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.reason.trim() || !form.fromDate || !form.toDate || !form.assignedFacultyId) {
            toast.error("Reason, From Date, To Date and Assigned Faculty are required"); return;
        }
        if (new Date(form.toDate) < new Date(form.fromDate)) {
            toast.error("To Date must be after From Date"); return;
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
            await applyPermission({ ...form, imageURL: imageURL || undefined }).unwrap();
            toast.success("Permission applied successfully!");
            onClose();
        } catch (err) {
            toast.error(err?.data?.message || "Failed to apply permission");
        }
    };

    const ic = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-gray-50 transition-all duration-200";
    const lc = "block text-xs font-semibold text-gray-600 mb-1.5";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800">Apply for Permission</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Fill in the details below</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                        <MdClose size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                    <div>
                        <label className={lc}>Reason <span className="text-red-400">*</span></label>
                        <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                            rows={3} placeholder="Enter reason for permission..."
                            className={`${ic} resize-none`} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={lc}>From Date <span className="text-red-400">*</span></label>
                            <input type="date" value={form.fromDate} onChange={e => setForm(p => ({ ...p, fromDate: e.target.value }))} className={ic} />
                        </div>
                        <div>
                            <label className={lc}>To Date <span className="text-red-400">*</span></label>
                            <input type="date" value={form.toDate} onChange={e => setForm(p => ({ ...p, toDate: e.target.value }))} className={ic} />
                        </div>
                    </div>
                    <div>
                        <label className={lc}>Assign Faculty <span className="text-red-400">*</span></label>
                        <select 
                            value={form.assignedFacultyId} 
                            onChange={e => setForm(p => ({ ...p, assignedFacultyId: e.target.value }))}
                            className={ic}
                        >
                            <option value="">Select Faculty Member</option>
                            {(facultiesRes?.data || []).map(fac => (
                                <option key={fac._id} value={fac._id}>
                                    {fac.name} ({fac.role.toUpperCase()}) {fac.position ? `- ${fac.position}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={lc}>Supporting Document <span className="text-gray-400 font-normal ml-1">(optional)</span></label>
                        <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-all duration-200 ${
                            file ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-orange-300 bg-gray-50"
                        }`}>
                            <MdArrowUpward size={18} className={file ? "text-green-500" : "text-gray-400"} />
                            <p className={`text-xs ${file ? "font-semibold text-green-700" : "text-gray-500"}`}>
                                {file ? file.name : "Click to upload image or PDF"}
                            </p>
                            <input type="file" accept="image/*,.pdf" onChange={handleFile} className="hidden" />
                        </label>
                        {fileErr && <p className="text-[11px] text-red-500 mt-1">{fileErr}</p>}
                    </div>
                </form>

                <div className="flex gap-3 px-5 pb-5 flex-shrink-0">
                    <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={isLoading}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
                            isLoading ? "bg-orange-300 text-white cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600 text-white"
                        }`}>
                        {isLoading
                            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <MdCheckCircle size={15} />}
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Permission Card ───────────────────────────────────────────────────────────
const PermissionCard = ({ item }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md hover:border-orange-100 transition-all duration-200">
        <div className="flex items-start gap-2.5 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                item.status === "approved" ? "bg-green-50" :
                item.status === "rejected" ? "bg-red-50" : "bg-orange-50"
            }`}>
                {statusIcon(item.status)}
            </div>
            <p className="text-sm font-bold text-gray-800 leading-snug pt-0.5">
                {item.reason || "Permission request"}
            </p>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-2 pl-0.5">
            <MdAccessTime size={11} className="text-gray-400 flex-shrink-0" />
            <span>{formatDate(item.fromDate)}</span>
            <span className="text-gray-300">→</span>
            <span>{formatDate(item.toDate)}</span>
        </div>

        {item.remark && (
            <div className="flex items-start gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 mb-2">
                <span className="text-[9px] font-bold text-gray-400 mt-0.5 flex-shrink-0 uppercase tracking-wide">Remark</span>
                <p className="text-[11px] text-gray-600 leading-snug">{item.remark}</p>
            </div>
        )}

        {item.assignedFacultyId && (
            <p className="text-[11px] text-orange-600 font-semibold mb-2">👉 Assigned: {item.assignedFacultyId.name}</p>
        )}

        {item.approvedBy && (
            <p className="text-[11px] text-green-600 font-medium mb-2">✓ {item.approvedBy}</p>
        )}

        <div className="flex items-center justify-between pt-2.5 border-t border-gray-50 mt-1">
            <span className="text-[10px] text-gray-400">Applied {formatDate(item.uploadDate)}</span>
            {item.imageURL && (
                <button onClick={() => window.open(item.imageURL, "_blank")}
                    className="flex items-center gap-1 text-[11px] font-semibold text-orange-500 hover:text-orange-600 transition-colors">
                    <MdOpenInNew size={11} /> View Doc
                </button>
            )}
        </div>
    </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentPermissions() {
    const [applyOpen, setApplyOpen] = useState(false);
    const [search, setSearch]       = useState("");
    const { data, isLoading }       = useGetMyPermissionsQuery();

    const permissions = data?.data || [];
    const pending     = permissions.filter(p => p.status === "pending").length;
    const approved    = permissions.filter(p => p.status === "approved").length;
    const total       = permissions.length;
    const percent     = total > 0 ? Math.round((approved / total) * 100) : 0;

    const filtered = permissions.filter(p =>
        !search ||
        p.reason?.toLowerCase().includes(search.toLowerCase()) ||
        formatDate(p.fromDate).toLowerCase().includes(search.toLowerCase())
    );

    const byStatus = {
        pending:  filtered.filter(p => p.status === "pending"),
        approved: filtered.filter(p => p.status === "approved"),
        rejected: filtered.filter(p => p.status === "rejected"),
    };

    return (
        <div className="space-y-5">
            {applyOpen && <ApplyModal onClose={() => setApplyOpen(false)} />}

            {/* ── Header Card — same as Tasks & LevelHistory ── */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="h-1.5 w-full bg-orange-500" />
                <div className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Permissions</h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {total} total · {pending} pending · {approved} approved
                            </p>
                        </div>
                        {/* Search + Apply */}
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <MdSearch size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search..."
                                    className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 bg-gray-50 w-44 transition-all duration-200"
                                />
                            </div>
                            <button onClick={() => setApplyOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all duration-200 whitespace-nowrap">
                                <MdAdd size={15} /> Apply
                            </button>
                        </div>
                    </div>

                    {/* Stat pills — same as Tasks page */}
                    <div className="flex items-center gap-3 mt-4 flex-wrap">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200">
                            <MdSecurity size={12} className="text-gray-500" />
                            <span className="text-xs font-bold text-gray-600">{total} Total</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-100">
                            <MdAccessTime size={12} className="text-orange-500" />
                            <span className="text-xs font-bold text-orange-600">{pending} Pending</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-50 border border-green-100">
                            <MdCheckCircle size={12} className="text-green-500" />
                            <span className="text-xs font-bold text-green-600">{approved} Approved</span>
                        </div>
                        {byStatus.rejected.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-100">
                                <MdWarning size={12} className="text-red-500" />
                                <span className="text-xs font-bold text-red-600">{byStatus.rejected.length} Rejected</span>
                            </div>
                        )}
                        {/* progress bar */}
                        <div className="flex-1 min-w-[120px]">
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-orange-400 transition-all duration-700" style={{ width: `${percent}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Kanban Columns ── */}
            {isLoading ? (
                <div className="flex justify-center pt-20">
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {STATUS_COLS.map(col => (
                        <div key={col.key} className={`rounded-2xl border ${col.border} ${col.colBg} p-3`}>

                            {/* Column header */}
                            <div className="flex items-center gap-2 mb-3 px-1">
                                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                                <h3 className="text-sm font-bold text-gray-700">{col.label}</h3>
                                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                                    {byStatus[col.key].length}
                                </span>
                            </div>

                            {/* Cards */}
                            <div className="space-y-2.5">
                                {byStatus[col.key].length === 0 ? (
                                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl py-10 bg-white/60">
                                        <MdSecurity size={24} className={col.emptyColor} />
                                        <p className="text-xs text-gray-400 mt-2">No {col.label.toLowerCase()}</p>
                                        {col.key === "pending" && (
                                            <button onClick={() => setApplyOpen(true)}
                                                className="mt-2 text-xs font-semibold text-orange-500 hover:text-orange-600 underline underline-offset-2 transition-colors">
                                                Apply now →
                                            </button>
                                        )}
                                    </div>
                                ) : byStatus[col.key].map((item, i) => (
                                    <PermissionCard key={item._id || i} item={item} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
