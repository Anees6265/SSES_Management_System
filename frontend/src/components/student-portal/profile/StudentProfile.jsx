import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
    User, GraduationCap, Lock, ShieldCheck, CheckCircle2,
    Phone, Mail, MapPin, Calendar, Building,
    X, Eye, EyeOff, RefreshCw, Award, Layers, BookOpen,
    Clock, HeartHandshake, Sparkles, ChevronRight, AlertCircle
} from "lucide-react";
import {
    useGetMyStudentProfileQuery,
    useChangeMyStudentPasswordMutation,
    useGetMyStudentLevelHistoryQuery,
} from "../../../redux/api/studentApi";

const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const ic = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-orange-500 focus:bg-white bg-gray-50/70 pr-10 transition-all duration-200 text-gray-800 placeholder:text-gray-400";
const lc = "block text-xs font-bold text-gray-700 mb-1.5";

// ── Password Field ────────────────────────────────────────────────────────────
const PasswordField = ({ field, label, showKey, show, setShow, form, setForm }) => (
    <div>
        <label className={lc}>{label} <span className="text-red-500">*</span></label>
        <div className="relative">
            <input
                type={show[showKey] ? "text" : "password"}
                value={form[field]}
                onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                placeholder={label}
                className={ic}
            />
            <button
                type="button"
                onClick={() => setShow(p => ({ ...p, [showKey]: !p[showKey] }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label="Toggle password visibility"
            >
                {show[showKey] ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    </div>
);

// ── Change Password Modal ─────────────────────────────────────────────────────
const ChangePasswordModal = ({ onClose }) => {
    const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [show, setShow] = useState({ current: false, new: false, confirm: false });
    const [changePassword, { isLoading }] = useChangeMyStudentPasswordMutation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
            toast.error("All fields are required");
            return;
        }
        if (form.newPassword.length < 6) {
            toast.error("New password must be at least 6 characters");
            return;
        }
        if (form.newPassword !== form.confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }
        try {
            await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword }).unwrap();
            const rawStored = localStorage.getItem("studentData");
            if (rawStored) {
                try {
                    const current = JSON.parse(rawStored);
                    current.mustChangePassword = false;
                    localStorage.setItem("studentData", JSON.stringify(current));
                } catch (_) {}
            }
            toast.success("Password changed successfully!");
            onClose();
        } catch (err) {
            toast.error(err?.data?.message || "Failed to change password");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150 my-0 sm:my-auto max-h-[92vh] flex flex-col">
                {/* Mobile drag handle */}
                <div className="sm:hidden flex justify-center pt-2.5 pb-1">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100 bg-gray-50/70">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-2xs">
                            <Lock size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Change Password</h3>
                            <p className="text-xs text-gray-400">Update account login security</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto">
                    <PasswordField field="currentPassword" label="Current Password" showKey="current" show={show} setShow={setShow} form={form} setForm={setForm} />
                    <PasswordField field="newPassword" label="New Password (min 6 chars)" showKey="new" show={show} setShow={setShow} form={form} setForm={setForm} />
                    <PasswordField field="confirmPassword" label="Confirm New Password" showKey="confirm" show={show} setShow={setShow} form={form} setForm={setForm} />
                </form>

                {/* Footer */}
                <div className="flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 bg-gray-50/80 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 text-xs sm:text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                            isLoading
                                ? "bg-orange-300 text-white cursor-not-allowed"
                                : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xs active:scale-98"
                        }`}
                    >
                        {isLoading ? (
                            <>
                                <RefreshCw size={13} className="animate-spin" />
                                <span>Updating...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={14} />
                                <span>Update Password</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Detail Tile Component ─────────────────────────────────────────────────────
const DetailTile = ({ icon: Icon, label, value, isLink, linkType, badge, fullWidth, highlight }) => (
    <div
        className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border transition-all duration-150 flex items-start gap-2.5 sm:gap-3 ${
            highlight
                ? "bg-orange-50/40 border-orange-200/80 hover:bg-orange-50/70"
                : "bg-white border-gray-100/90 hover:border-orange-200 hover:bg-orange-50/20"
        } ${fullWidth ? "col-span-1 sm:col-span-2 md:col-span-3" : "col-span-1"}`}
    >
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
            highlight ? "bg-orange-100 text-orange-600" : "bg-gray-50 text-gray-500 border border-gray-100"
        }`}>
            {Icon && <Icon size={14} className="shrink-0" />}
        </div>
        <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block truncate">
                {label}
            </span>
            {badge ? (
                <div className="mt-0.5 sm:mt-1">
                    <span className="inline-flex items-center text-xs font-extrabold px-2 sm:px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 truncate max-w-full">
                        {value || "—"}
                    </span>
                </div>
            ) : isLink && value && value !== "—" ? (
                <a
                    href={linkType === "tel" ? `tel:${value}` : `mailto:${value}`}
                    className="text-xs sm:text-sm font-bold text-orange-600 hover:text-orange-700 hover:underline mt-0.5 block truncate"
                >
                    {value}
                </a>
            ) : (
                <p className="text-xs sm:text-sm font-bold text-gray-900 mt-0.5 break-words">
                    {value || "—"}
                </p>
            )}
        </div>
    </div>
);

// ── Main Student Profile Component ───────────────────────────────────────────
export default function StudentProfile() {
    const navigate = useNavigate();
    const [pwdModal, setPwdModal] = useState(false);
    const [activeTab, setActiveTab] = useState("all"); // "all" | "academic" | "personal" | "prior" | "leaves"

    const { data, isLoading } = useGetMyStudentProfileQuery();
    const { data: levelHistoryResponse } = useGetMyStudentLevelHistoryQuery();

    const raw = data?.data || {};
    const name = `${raw.firstName || ""} ${raw.lastName || ""}`.trim() || "Student";
    const initials = name.split(" ").map(n => n[0] || "").join("").slice(0, 2).toUpperCase() || "ST";

    // Department & Sub Department resolution
    const departmentName = raw.subDepartmentId?.departmentId?.name || raw.departmentId?.name || "ITEG";
    const subDepartmentName = raw.subDepartmentId?.name || "TECH";

    const permissions = Array.isArray(raw.permissions) && raw.permissions.length > 0
        ? raw.permissions
        : (raw.permissionDetails?.status ? [raw.permissionDetails] : []);
    const totalLeaves = raw.leaveStats?.total ?? permissions.length;
    const approvedLeaves = raw.leaveStats?.approved ?? permissions.filter(p => (p.status || "").toLowerCase() === "approved").length;
    const rejectedLeaves = raw.leaveStats?.rejected ?? permissions.filter(p => (p.status || "").toLowerCase() === "rejected").length;
    const pendingLeaves = raw.leaveStats?.pending ?? permissions.filter(p => (p.status || "").toLowerCase() === "pending").length;

    // Time spent in active sublevel
    const daysInSubLevel = useMemo(() => {
        if (!raw) return null;
        const currentSubLevelId = raw.currentSubLevelId?._id || raw.currentSubLevelId;
        if (!currentSubLevelId) return null;

        let entryDate = null;
        const history = levelHistoryResponse?.data;
        if (Array.isArray(history)) {
            const currentProgress = history.find(h =>
                (h.subLevelId?._id || h.subLevelId)?.toString() === currentSubLevelId.toString()
            );
            if (currentProgress) {
                entryDate = currentProgress.startedAt || currentProgress.createdAt;
            }
            if (!entryDate) {
                const completedProgress = [...history]
                    .filter(h => h.status === 'completed' && h.completedAt)
                    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
                if (completedProgress.length > 0) {
                    entryDate = completedProgress[0].completedAt;
                }
            }
        }
        if (!entryDate) {
            entryDate = raw.createdAt;
        }
        if (!entryDate) return null;

        const diffTime = Math.abs(new Date() - new Date(entryDate));
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays === 0 ? "Today" : diffDays === 1 ? "1 Day" : `${diffDays} Days`;
    }, [raw, levelHistoryResponse]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center pt-24 space-y-3">
                <div className="w-9 h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-gray-400">Loading your profile...</p>
            </div>
        );
    }

    const statusStyle =
        raw.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
        raw.status === "Placed" ? "bg-purple-50 text-purple-700 border-purple-200" :
        raw.status === "Dropped" ? "bg-rose-50 text-rose-700 border-rose-200" :
        "bg-gray-100 text-gray-700 border-gray-200";

    return (
        <div className="space-y-3.5 sm:space-y-5 pb-10">
            {pwdModal && <ChangePasswordModal onClose={() => setPwdModal(false)} />}

            {/* ── Unified Hero Profile Banner ── */}
            <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs relative">
                {/* Top Orange Accent Stripe */}
                <div className="h-1.5 sm:h-2 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400" />

                <div className="p-3.5 sm:p-6 lg:p-7">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
                        
                        {/* Left: Avatar + Identity + Tags */}
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3.5 sm:gap-5 text-center sm:text-left w-full sm:w-auto">
                            
                            {/* Photo (Read-only for Student) */}
                            <div className="relative shrink-0">
                                {raw.image ? (
                                    <img
                                        src={raw.image}
                                        alt={name}
                                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl object-cover border-2 border-white shadow-md ring-2 ring-orange-100"
                                    />
                                ) : (
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center text-2xl sm:text-3xl font-black shadow-md ring-2 ring-orange-100">
                                        {initials}
                                    </div>
                                )}
                            </div>

                            {/* Identity and Highlights */}
                            <div className="space-y-1 sm:space-y-1.5 min-w-0 w-full sm:w-auto">
                                <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 flex-wrap">
                                    <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight break-words">
                                        {name}
                                    </h2>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                        <CheckCircle2 size={11} className="text-blue-500" />
                                        Verified Student
                                    </span>
                                </div>

                                {/* Department & Course badges */}
                                <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 flex-wrap pt-0.5">
                                    <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                                        <Building size={11} className="text-orange-500 shrink-0" />
                                        Department: {departmentName}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                                        <Layers size={11} className="text-violet-500 shrink-0" />
                                        Sub Dept: {subDepartmentName}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                        <BookOpen size={11} className="text-gray-500 shrink-0" />
                                        {raw.course || "Course"}
                                    </span>
                                </div>

                                {/* Parents Name Info */}
                                {(raw.fatherName || raw.motherName) && (
                                    <p className="text-[11px] sm:text-xs text-gray-500 pt-0.5 flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                                        <HeartHandshake size={13} className="text-orange-500 shrink-0" />
                                        {raw.fatherName && (
                                            <span>
                                                Father: <strong className="text-gray-800 font-semibold">{raw.fatherName}</strong>
                                            </span>
                                        )}
                                        {raw.fatherName && raw.motherName && <span className="text-gray-300">·</span>}
                                        {raw.motherName && (
                                            <span>
                                                Mother: <strong className="text-gray-800 font-semibold">{raw.motherName}</strong>
                                            </span>
                                        )}
                                    </p>
                                )}

                                {/* Quick Contact Links */}
                                <div className="flex items-center justify-center sm:justify-start gap-2.5 sm:gap-3.5 pt-0.5 text-xs text-gray-600 flex-wrap">
                                    {raw.email && (
                                        <a href={`mailto:${raw.email}`} className="flex items-center gap-1 text-gray-500 hover:text-orange-600 transition-colors max-w-full">
                                            <Mail size={12} className="text-gray-400 shrink-0" />
                                            <span className="font-medium truncate max-w-[200px] sm:max-w-none">{raw.email}</span>
                                        </a>
                                    )}
                                    {raw.studentMobile && (
                                        <a href={`tel:${raw.studentMobile}`} className="flex items-center gap-1 text-gray-500 hover:text-orange-600 transition-colors shrink-0">
                                            <Phone size={12} className="text-gray-400 shrink-0" />
                                            <span className="font-medium">{raw.studentMobile}</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: Actions & Current Status */}
                        <div className="flex flex-col sm:flex-row lg:flex-col items-center sm:items-end justify-between gap-2.5 sm:gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100 w-full sm:w-auto shrink-0">
                            <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap w-full sm:w-auto">
                                <span className={`inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full border ${statusStyle}`}>
                                    <CheckCircle2 size={12} /> {raw.status || "Active"}
                                </span>
                                {raw.isFTP && (
                                    <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                        <Award size={12} /> FTP Track
                                    </span>
                                )}
                            </div>

                            <button
                                onClick={() => setPwdModal(true)}
                                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl transition-all duration-200 shadow-xs active:scale-98 cursor-pointer"
                            >
                                <Lock size={14} />
                                <span>Change Password</span>
                            </button>
                        </div>

                    </div>

                    {/* Quick Stats Pill Strip */}
                    <div className="mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-gray-100">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                            <div className="bg-orange-50/60 border border-orange-100 rounded-xl sm:rounded-2xl p-2 sm:p-3 flex items-center gap-2 sm:gap-2.5">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                                    <Building size={14} className="sm:w-3.5 sm:h-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[9px] sm:text-[10px] uppercase font-bold text-orange-600 block truncate">Department</span>
                                    <span className="text-xs sm:text-sm font-extrabold text-orange-950 truncate block">{departmentName}</span>
                                </div>
                            </div>

                            <div className="bg-violet-50/60 border border-violet-100 rounded-xl sm:rounded-2xl p-2 sm:p-3 flex items-center gap-2 sm:gap-2.5">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-violet-500 text-white flex items-center justify-center shrink-0">
                                    <Layers size={14} className="sm:w-3.5 sm:h-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[9px] sm:text-[10px] uppercase font-bold text-violet-600 block truncate">Sub Dept</span>
                                    <span className="text-xs sm:text-sm font-extrabold text-violet-950 truncate block">{subDepartmentName}</span>
                                </div>
                            </div>

                            <div className="bg-blue-50/60 border border-blue-100 rounded-xl sm:rounded-2xl p-2 sm:p-3 flex items-center gap-2.5">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
                                    <GraduationCap size={14} className="sm:w-3.5 sm:h-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[9px] sm:text-[10px] uppercase font-bold text-blue-600 block truncate">SubLevel</span>
                                    <span className="text-xs sm:text-sm font-extrabold text-blue-950 truncate block">
                                        {raw.currentSubLevelId?.name || "1A"} {daysInSubLevel ? `(${daysInSubLevel})` : ""}
                                    </span>
                                </div>
                            </div>

                            <div
                                onClick={() => navigate("/student-portal/leave-request")}
                                className="bg-amber-50/60 border border-amber-200/80 rounded-xl sm:rounded-2xl p-2 sm:p-3 flex items-center gap-2 sm:gap-2.5 cursor-pointer hover:bg-amber-100/60 transition group"
                                title="Click to view Leave Requests"
                            >
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                                    <Calendar size={14} className="sm:w-3.5 sm:h-3.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[9px] sm:text-[10px] uppercase font-bold text-amber-600 block truncate">Leave Requests</span>
                                    <span className="text-xs sm:text-sm font-extrabold text-amber-950 truncate block flex items-center justify-between">
                                        <span>{totalLeaves} Applied</span>
                                        <ChevronRight size={13} className="text-amber-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* ── Segmented Category Tabs ── */}
            <div className="bg-gray-100/90 p-1 rounded-xl sm:rounded-2xl flex items-center gap-1 text-xs font-bold overflow-x-auto scrollbar-none -mx-0.5 px-1 sm:mx-0 sm:px-1">
                {[
                    { id: "all", label: "All Details", icon: Sparkles },
                    { id: "academic", label: "Academic", icon: GraduationCap },
                    { id: "personal", label: "Personal & Family", icon: User },
                    { id: "prior", label: "Prior Education", icon: Award },
                    { id: "leaves", label: "Leave Requests", icon: Calendar },
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-1.5 px-2.5 sm:py-2 sm:px-3.5 rounded-lg sm:rounded-xl transition-all text-center flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer text-[11px] sm:text-xs ${
                                isActive
                                    ? "bg-white text-orange-700 shadow-xs"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            <Icon size={13} className={isActive ? "text-orange-500" : "text-gray-400"} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── Section 1: Academic & Department Information ── */}
            {(activeTab === "all" || activeTab === "academic") && (
                <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                    <div className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 border-b border-gray-100 flex items-center justify-between bg-orange-50/20 gap-2">
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-2xs shrink-0">
                                <GraduationCap size={15} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wider truncate">
                                    Academic & Department Details
                                </h3>
                                <p className="text-[10px] sm:text-[11px] text-gray-400 truncate">Department affiliation, program and levels</p>
                            </div>
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-white text-orange-700 border border-orange-200 shrink-0">
                            {raw.sessionId?.name || "Active Session"}
                        </span>
                    </div>

                    <div className="p-3 sm:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                        <DetailTile icon={Building} label="Department" value={departmentName} badge highlight />
                        <DetailTile icon={Layers} label="Sub Department" value={subDepartmentName} badge highlight />
                        <DetailTile icon={BookOpen} label="Enrolled Course" value={raw.course} />
                        <DetailTile icon={Award} label="Stream / Specialization" value={raw.stream} />
                        <DetailTile icon={Clock} label="Current Level" value={raw.currentLevelId?.name} />
                        <DetailTile
                            icon={GraduationCap}
                            label="Current SubLevel"
                            value={raw.currentSubLevelId?.name ? `${raw.currentSubLevelId.name}${daysInSubLevel ? ` (${daysInSubLevel})` : ''}` : '—'}
                        />
                        <DetailTile icon={Calendar} label="Academic Session" value={raw.sessionId?.name} />
                        <DetailTile icon={Award} label="Technical Track" value={raw.track || raw.techno} />
                        <DetailTile icon={User} label="Student Category" value={raw.category} />
                        <DetailTile
                            icon={BookOpen}
                            label="Syllabus Version"
                            value={raw.syllabusVersionId?.title || raw.syllabusVersionId?.version || "Active Version"}
                            fullWidth
                        />
                    </div>
                </div>
            )}

            {/* ── Section 2: Personal & Family Information ── */}
            {(activeTab === "all" || activeTab === "personal") && (
                <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                    <div className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 border-b border-gray-100 flex items-center gap-2 sm:gap-2.5 bg-blue-50/20 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-2xs shrink-0">
                            <User size={15} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wider truncate">
                                Personal & Family Information
                            </h3>
                            <p className="text-[10px] sm:text-[11px] text-gray-400 truncate">Identity, parents and permanent address</p>
                        </div>
                    </div>

                    <div className="p-3 sm:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                        <DetailTile icon={User} label="First Name" value={raw.firstName} />
                        <DetailTile icon={User} label="Last Name" value={raw.lastName} />
                        <DetailTile icon={User} label="Gender" value={raw.gender} />
                        <DetailTile icon={HeartHandshake} label="Father Name" value={raw.fatherName} />
                        <DetailTile icon={HeartHandshake} label="Mother Name" value={raw.motherName} />
                        <DetailTile icon={Calendar} label="Date of Birth" value={formatDate(raw.dob)} />
                        <DetailTile icon={Phone} label="Student Mobile" value={raw.studentMobile} isLink linkType="tel" />
                        <DetailTile icon={Phone} label="Parent Mobile" value={raw.parentMobile} isLink linkType="tel" />
                        <DetailTile icon={Mail} label="Email Address" value={raw.email} isLink linkType="email" fullWidth />
                        <DetailTile icon={MapPin} label="Village / Town" value={raw.village} fullWidth />
                        <DetailTile icon={MapPin} label="Permanent Address" value={raw.address} fullWidth />
                    </div>
                </div>
            )}

            {/* ── Section 3: Prior Academic Record ── */}
            {(activeTab === "all" || activeTab === "prior") && (
                <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                    <div className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 border-b border-gray-100 flex items-center gap-2 sm:gap-2.5 bg-amber-50/20 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-2xs shrink-0">
                            <Award size={15} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wider truncate">
                                Prior Academic Record
                            </h3>
                            <p className="text-[10px] sm:text-[11px] text-gray-400 truncate">High school (10th) & Intermediate (12th)</p>
                        </div>
                    </div>

                    <div className="p-3 sm:p-5 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                        <DetailTile
                            icon={Award}
                            label="10th %"
                            value={raw.percent10 ? `${raw.percent10}%` : "—"}
                            highlight
                        />
                        <DetailTile
                            icon={Award}
                            label="12th %"
                            value={raw.percent12 ? `${raw.percent12}%` : "—"}
                            highlight
                        />
                        <DetailTile icon={BookOpen} label="12th Stream" value={raw.subject12} />
                        <DetailTile icon={Calendar} label="Passing Year" value={raw.year12} />
                    </div>
                </div>
            )}

            {/* ── Section 4: Leave Requests Overview ── */}
            {(activeTab === "all" || activeTab === "leaves") && (
                <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                    <div className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between bg-amber-50/20 gap-2.5">
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-2xs shrink-0">
                                <Calendar size={15} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wider truncate">
                                    Leave Requests Overview
                                </h3>
                                <p className="text-[10px] sm:text-[11px] text-gray-400 truncate">Summary of your leave applications</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate("/student-portal/leave-request")}
                            className="w-full sm:w-auto px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                        >
                            <span>Open Leave Requests</span>
                            <ChevronRight size={13} />
                        </button>
                    </div>

                    <div className="p-3 sm:p-5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gray-50 border border-gray-100 text-center">
                                <span className="text-[9px] sm:text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Total Applied</span>
                                <span className="font-black text-gray-800 text-lg sm:text-2xl mt-0.5 sm:mt-1 block">{totalLeaves}</span>
                            </div>
                            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-emerald-50/70 border border-emerald-100 text-center">
                                <span className="text-[9px] sm:text-[10px] text-emerald-600 uppercase font-bold tracking-wider block">Approved</span>
                                <span className="font-black text-emerald-700 text-lg sm:text-2xl mt-0.5 sm:mt-1 block">{approvedLeaves}</span>
                            </div>
                            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-amber-50/70 border border-amber-100 text-center">
                                <span className="text-[9px] sm:text-[10px] text-amber-600 uppercase font-bold tracking-wider block">Pending</span>
                                <span className="font-black text-amber-700 text-lg sm:text-2xl mt-0.5 sm:mt-1 block">{pendingLeaves}</span>
                            </div>
                            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-rose-50/70 border border-rose-100 text-center">
                                <span className="text-[9px] sm:text-[10px] text-rose-600 uppercase font-bold tracking-wider block">Rejected</span>
                                <span className="font-black text-rose-700 text-lg sm:text-2xl mt-0.5 sm:mt-1 block">{rejectedLeaves}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
