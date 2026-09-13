import { useState, useRef, useMemo } from "react";
import { toast } from "react-toastify";
import {
    User, GraduationCap, Lock, ShieldCheck, CheckCircle2,
    Camera, Phone, Mail, MapPin, Calendar, Building,
    X, Eye, EyeOff, Check, AlertCircle, RefreshCw, Award
} from "lucide-react";
import {
    useGetMyStudentProfileQuery,
    useUpdateMyStudentProfileImageMutation,
    useChangeMyStudentPasswordMutation,
    useGetMyStudentLevelHistoryQuery,
} from "../../../redux/api/studentApi";

const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const ic = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-orange-400 focus:bg-white bg-gray-50 pr-10 transition-all duration-200";
const lc = "block text-xs font-bold text-gray-700 mb-1";

// ── Password Field ────────────────────────────────────────────────────────────
const PasswordField = ({ field, label, showKey, show, setShow, form, setForm }) => (
    <div>
        <label className={lc}>{label} <span className="text-red-400">*</span></label>
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
            >
                {show[showKey] ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    </div>
);

// ── Change Password Modal (Bottom-sheet on mobile, centered on desktop) ────────
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
            toast.success("Password changed successfully!");
            onClose();
        } catch (err) {
            toast.error(err?.data?.message || "Failed to change password");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150 my-0 sm:my-auto max-h-[92vh] flex flex-col">
                
                {/* Mobile drag handle */}
                <div className="sm:hidden flex justify-center pt-2.5 pb-1">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-100 bg-gray-50/80">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                            <Lock size={15} />
                        </div>
                        <div>
                            <h3 className="text-xs sm:text-sm font-bold text-gray-900">Change Password</h3>
                            <p className="text-[10px] sm:text-xs text-gray-400">Update account access password</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 overflow-y-auto">
                    <PasswordField field="currentPassword" label="Current Password" showKey="current" show={show} setShow={setShow} form={form} setForm={setForm} />
                    <PasswordField field="newPassword" label="New Password" showKey="new" show={show} setShow={setShow} form={form} setForm={setForm} />
                    <PasswordField field="confirmPassword" label="Confirm Password" showKey="confirm" show={show} setShow={setShow} form={form} setForm={setForm} />
                </form>

                {/* Footer */}
                <div className="flex items-center gap-2.5 px-4 sm:px-6 py-3.5 bg-gray-50 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                            isLoading
                                ? "bg-orange-300 text-white cursor-not-allowed"
                                : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm"
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

// ── Responsive Info Grid ──────────────────────────────────────────────────────
const InfoGrid = ({ fields }) => (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3.5 p-3.5 sm:p-5">
        {fields.map(({ label, value, fullWidth, isLink, linkType }) => (
            <div
                key={label}
                className={`bg-gray-50/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-gray-100 hover:bg-orange-50/30 hover:border-orange-100 transition-all duration-150 ${
                    fullWidth ? "col-span-2 md:col-span-3" : "col-span-1"
                }`}
            >
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">{label}</span>
                {isLink && value && value !== "—" ? (
                    <a
                        href={linkType === "tel" ? `tel:${value}` : `mailto:${value}`}
                        className="text-xs sm:text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline mt-1 block break-words"
                    >
                        {value}
                    </a>
                ) : (
                    <p className="text-xs sm:text-sm font-semibold text-gray-800 mt-1 break-words">{value || "—"}</p>
                )}
            </div>
        ))}
    </div>
);

// ── Main Page Component ───────────────────────────────────────────────────────
export default function StudentProfile() {
    const [pwdModal, setPwdModal] = useState(false);
    const [mobileTab, setMobileTab] = useState("overview"); // "overview" | "personal" | "academic"
    const fileRef = useRef(null);

    const { data, isLoading, refetch } = useGetMyStudentProfileQuery();
    const [updateImage, { isLoading: uploading }] = useUpdateMyStudentProfileImageMutation();
    const { data: levelHistoryResponse } = useGetMyStudentLevelHistoryQuery();

    const raw = data?.data || {};
    const name = `${raw.firstName || ""} ${raw.lastName || ""}`.trim() || "Student";
    const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "ST";

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

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) { toast.error("Only image files allowed"); return; }
        if (file.size > 3 * 1024 * 1024) { toast.error("Image must be under 3 MB"); return; }
        const image = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.readAsDataURL(file);
        });
        try {
            await updateImage({ image }).unwrap();
            toast.success("Profile image updated!");
            refetch();
        } catch (err) {
            toast.error(err?.data?.message || "Image update failed");
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center pt-20">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const personalFields = [
        { label: "PR Key", value: raw.prkey },
        { label: "Gender", value: raw.gender },
        { label: "First Name", value: raw.firstName },
        { label: "Last Name", value: raw.lastName },
        { label: "Father Name", value: raw.fatherName },
        { label: "Date of Birth", value: formatDate(raw.dob) },
        { label: "Email Address", value: raw.email, fullWidth: true, isLink: true, linkType: "email" },
        { label: "Student Mobile", value: raw.studentMobile, isLink: true, linkType: "tel" },
        { label: "Parent Mobile", value: raw.parentMobile, isLink: true, linkType: "tel" },
        { label: "Village / Town", value: raw.village, fullWidth: true },
        { label: "Permanent Address", value: raw.address, fullWidth: true },
    ];

    const academicFields = [
        { label: "Enrolled Course", value: raw.course },
        { label: "Stream / Spec", value: raw.stream },
        { label: "Student Category", value: raw.category },
        { label: "Technical Track", value: raw.track || raw.techno || "—" },
        { label: "10th Percentage", value: raw.percent10 ? `${raw.percent10}%` : "—" },
        { label: "12th Percentage", value: raw.percent12 ? `${raw.percent12}%` : "—" },
        { label: "12th Stream / Subject", value: raw.subject12 },
        { label: "12th Passing Year", value: raw.year12 },
        { label: "Current Level", value: raw.currentLevelId?.name },
        { label: "Current SubLevel", value: raw.currentSubLevelId?.name ? `${raw.currentSubLevelId.name}${daysInSubLevel ? ` (${daysInSubLevel})` : ''}` : '—' },
        { label: "Academic Session", value: raw.sessionId?.name },
        { label: "Sub Department", value: raw.subDepartmentId?.name },
    ];

    const statusStyle =
        raw.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200/80" :
        raw.status === "Placed" ? "bg-purple-50 text-purple-700 border-purple-200/80" :
        raw.status === "Dropped" ? "bg-rose-50 text-rose-700 border-rose-200/80" :
        "bg-gray-100 text-gray-700 border-gray-200";

    return (
        <div className="space-y-4 sm:space-y-5 pb-10">
            {pwdModal && <ChangePasswordModal onClose={() => setPwdModal(false)} />}

            {/* ── Header Card (Matching StudentTasks Design System) ── */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400" />
                <div className="p-3.5 sm:p-5">
                    
                    {/* Top Row: Title + Password CTA */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-bold text-gray-900">My Profile</h2>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                                    {raw.prkey || "Student"}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {raw.course || "Academic"} · {raw.sessionId?.name || "Current Session"}
                            </p>
                        </div>

                        <button
                            onClick={() => setPwdModal(true)}
                            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all duration-200 whitespace-nowrap shadow-sm active:scale-98"
                        >
                            <Lock size={14} />
                            <span>Change Password</span>
                        </button>
                    </div>

                    {/* Stat Pills & Progress Bar (Parity with StudentTasks) */}
                    <div className="mt-3.5 pt-3 border-t border-gray-100/80">
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5">
                            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${statusStyle}`}>
                                <CheckCircle2 size={13} className="shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold truncate">{raw.status || "Active"}</span>
                            </div>

                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-50/80 border border-orange-100">
                                <GraduationCap size={13} className="text-orange-500 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold text-orange-700 truncate">{raw.currentLevelId?.name || "Level"}</span>
                            </div>

                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-violet-50/80 border border-violet-100">
                                <ShieldCheck size={13} className="text-violet-500 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-bold text-violet-700 truncate">
                                    {raw.currentSubLevelId?.name || "SubLevel"} {daysInSubLevel ? `• ${daysInSubLevel}` : ''}
                                </span>
                            </div>

                            {raw.isFTP && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50/80 border border-blue-100">
                                    <Award size={13} className="text-blue-500 shrink-0" />
                                    <span className="text-[11px] sm:text-xs font-bold text-blue-700 truncate">FTP Track</span>
                                </div>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                            <div 
                                className="h-1.5 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500" 
                                style={{ width: "100%" }} 
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* ── Avatar Hero Card (Touch-Friendly Photo Upload) ── */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
                
                {/* Photo & Upload Button */}
                <div className="relative shrink-0">
                    {raw.image ? (
                        <img
                            src={raw.image}
                            alt={name}
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-gray-100 shadow-sm"
                        />
                    ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center text-2xl sm:text-3xl font-black shadow-sm">
                            {initials}
                        </div>
                    )}
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="absolute -bottom-1 -right-1 w-8 h-8 bg-orange-500 hover:bg-orange-600 text-white rounded-xl flex items-center justify-center shadow-md transition-all duration-150 active:scale-95 border-2 border-white"
                        title="Upload new profile picture"
                    >
                        {uploading ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Camera size={14} />
                        )}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </div>

                {/* Identity & Contact Chips */}
                <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-black text-gray-900">{name}</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            Verified Student
                        </span>
                    </div>

                    <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 text-xs text-gray-500 flex-wrap">
                        <span className="font-semibold text-gray-700">Roll: {raw.prkey || "—"}</span>
                        <span>•</span>
                        <span>{raw.course || "BCA"}</span>
                        <span>•</span>
                        <span>{raw.subDepartmentId?.name || "ITEG"}</span>
                    </div>

                    <div className="flex items-center justify-center sm:justify-start gap-3 pt-1 text-xs text-gray-600 flex-wrap">
                        {raw.email && (
                            <a href={`mailto:${raw.email}`} className="flex items-center gap-1 hover:text-orange-600 transition-colors">
                                <Mail size={12} className="text-gray-400" />
                                <span className="truncate max-w-[200px] sm:max-w-none">{raw.email}</span>
                            </a>
                        )}
                        {raw.studentMobile && (
                            <a href={`tel:${raw.studentMobile}`} className="flex items-center gap-1 hover:text-orange-600 transition-colors">
                                <Phone size={12} className="text-gray-400" />
                                <span>{raw.studentMobile}</span>
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Mobile Segmented Tabs (`md:hidden`) ── */}
            <div className="md:hidden bg-gray-100/90 p-1 rounded-xl flex gap-1 text-xs font-bold">
                <button
                    onClick={() => setMobileTab("overview")}
                    className={`flex-1 py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                        mobileTab === "overview" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <Award size={13} className={mobileTab === "overview" ? "text-orange-500" : "text-gray-400"} />
                    <span>Overview</span>
                </button>
                <button
                    onClick={() => setMobileTab("personal")}
                    className={`flex-1 py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                        mobileTab === "personal" ? "bg-white text-orange-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <User size={13} className={mobileTab === "personal" ? "text-orange-500" : "text-gray-400"} />
                    <span>Personal</span>
                </button>
                <button
                    onClick={() => setMobileTab("academic")}
                    className={`flex-1 py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                        mobileTab === "academic" ? "bg-white text-violet-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <GraduationCap size={13} className={mobileTab === "academic" ? "text-violet-500" : "text-gray-400"} />
                    <span>Academic</span>
                </button>
            </div>

            {/* ── Mobile Tab 1: Overview ── */}
            <div className={`md:hidden space-y-3.5 ${mobileTab === "overview" ? "block" : "hidden"}`}>
                
                {/* Quick Academic Snapshot */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-2.5">
                    <h4 className="text-xs font-bold text-gray-800 pb-2 border-b border-gray-100 flex items-center gap-1.5">
                        <GraduationCap size={15} className="text-orange-500" />
                        <span>Academic Snapshot</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-gray-50">
                            <span className="text-[10px] text-gray-400 block font-bold uppercase">Current Level</span>
                            <span className="font-bold text-gray-800">{raw.currentLevelId?.name || "—"}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-gray-50">
                            <span className="text-[10px] text-gray-400 block font-bold uppercase">SubLevel</span>
                            <span className="font-bold text-gray-800">{raw.currentSubLevelId?.name || "—"}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-gray-50">
                            <span className="text-[10px] text-gray-400 block font-bold uppercase">Session</span>
                            <span className="font-bold text-gray-800">{raw.sessionId?.name || "—"}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-gray-50">
                            <span className="text-[10px] text-gray-400 block font-bold uppercase">Time in SubLevel</span>
                            <span className="font-bold text-orange-600">{daysInSubLevel || "—"}</span>
                        </div>
                    </div>
                </div>

                {/* Prior Academic Record Snapshot */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-2.5">
                    <h4 className="text-xs font-bold text-gray-800 pb-2 border-b border-gray-100 flex items-center gap-1.5">
                        <Award size={15} className="text-amber-500" />
                        <span>Prior Academic Record</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-gray-50">
                            <span className="text-[10px] text-gray-400 block font-bold uppercase">10th Percentage</span>
                            <span className="font-bold text-gray-800">{raw.percent10 ? `${raw.percent10}%` : "—"}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-gray-50">
                            <span className="text-[10px] text-gray-400 block font-bold uppercase">12th Percentage</span>
                            <span className="font-bold text-gray-800">{raw.percent12 ? `${raw.percent12}%` : "—"}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-gray-50">
                            <span className="text-[10px] text-gray-400 block font-bold uppercase">12th Stream</span>
                            <span className="font-bold text-gray-800 truncate">{raw.subject12 || "—"}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-gray-50">
                            <span className="text-[10px] text-gray-400 block font-bold uppercase">12th Passing Year</span>
                            <span className="font-bold text-gray-800">{raw.year12 || "—"}</span>
                        </div>
                    </div>
                </div>

                {/* Quick Contact & Emergency Call Card */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-2.5">
                    <h4 className="text-xs font-bold text-gray-800 pb-2 border-b border-gray-100 flex items-center gap-1.5">
                        <User size={15} className="text-blue-500" />
                        <span>Contact & Address</span>
                    </h4>
                    <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                            <span className="text-gray-400">Student Mobile</span>
                            {raw.studentMobile ? (
                                <a href={`tel:${raw.studentMobile}`} className="font-bold text-orange-600 flex items-center gap-1 hover:underline">
                                    <Phone size={12} />
                                    <span>{raw.studentMobile}</span>
                                </a>
                            ) : (
                                <span className="font-bold text-gray-800">—</span>
                            )}
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                            <span className="text-gray-400">Parent Mobile</span>
                            {raw.parentMobile ? (
                                <a href={`tel:${raw.parentMobile}`} className="font-bold text-orange-600 flex items-center gap-1 hover:underline">
                                    <Phone size={12} />
                                    <span>{raw.parentMobile}</span>
                                </a>
                            ) : (
                                <span className="font-bold text-gray-800">—</span>
                            )}
                        </div>
                        <div className="p-2.5 rounded-xl bg-gray-50">
                            <span className="text-[10px] text-gray-400 block uppercase font-bold">Address</span>
                            <span className="font-semibold text-gray-800 block mt-0.5">{raw.address || "—"}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* ── Mobile Tab 2: Personal Info ── */}
            <div className={`md:hidden ${mobileTab === "personal" ? "block" : "hidden"}`}>
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2 bg-orange-50/20">
                        <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                            <User size={14} />
                        </div>
                        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Personal Details</h3>
                    </div>
                    <InfoGrid fields={personalFields} />
                </div>
            </div>

            {/* ── Mobile Tab 3: Academic Info ── */}
            <div className={`md:hidden ${mobileTab === "academic" ? "block" : "hidden"}`}>
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2 bg-violet-50/20">
                        <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                            <GraduationCap size={14} />
                        </div>
                        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Academic Records</h3>
                    </div>
                    <InfoGrid fields={academicFields} />
                </div>
            </div>

            {/* ── Desktop Full View (`hidden md:block space-y-5`) ── */}
            <div className="hidden md:block space-y-5">
                
                {/* Personal Info Card */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2 bg-orange-50/20">
                        <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                            <User size={14} />
                        </div>
                        <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">Personal Information</h3>
                    </div>
                    <InfoGrid fields={personalFields} />
                </div>

                {/* Academic Info Card */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2 bg-violet-50/20">
                        <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                            <GraduationCap size={14} />
                        </div>
                        <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">Academic Details</h3>
                    </div>
                    <InfoGrid fields={academicFields} />
                </div>

            </div>

        </div>
    );
}

