import { useState, useRef, useMemo } from "react";
import { toast } from "react-toastify";
import {
    MdVerified, MdEdit, MdClose, MdCheckCircle,
    MdVisibility, MdVisibilityOff, MdPerson, MdSchool, MdLock,
    MdPeople, MdEmail, MdPhone
} from "react-icons/md";
import {
    useGetMyStudentProfileQuery,
    useUpdateMyStudentProfileImageMutation,
    useChangeMyStudentPasswordMutation,
    useGetMyStudentLevelHistoryQuery,
} from "../../../redux/api/studentApi";

const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const ic = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-gray-50 pr-10 transition-all duration-200";
const lc = "block text-xs font-semibold text-gray-600 mb-1.5";

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
                onMouseDown={e => { e.preventDefault(); setShow(p => ({ ...p, [showKey]: !p[showKey] })); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {show[showKey] ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
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
            toast.error("All fields are required"); return;
        }
        if (form.newPassword.length < 6) {
            toast.error("New password must be at least 6 characters"); return;
        }
        if (form.newPassword !== form.confirmPassword) {
            toast.error("New passwords do not match"); return;
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800">Change Password</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Update your account password</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                        <MdClose size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                    <PasswordField field="currentPassword" label="Current Password" showKey="current" show={show} setShow={setShow} form={form} setForm={setForm} />
                    <PasswordField field="newPassword"     label="New Password"     showKey="new"     show={show} setShow={setShow} form={form} setForm={setForm} />
                    <PasswordField field="confirmPassword" label="Confirm Password" showKey="confirm" show={show} setShow={setShow} form={form} setForm={setForm} />
                </form>
                <div className="flex gap-3 px-5 pb-5">
                    <button onClick={onClose}
                        className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={isLoading}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
                            isLoading ? "bg-orange-300 text-white cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600 text-white"
                        }`}>
                        {isLoading
                            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <MdCheckCircle size={15} />}
                        Update
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Info Grid ─────────────────────────────────────────────────────────────────
const InfoGrid = ({ fields }) => (
    <div className="grid grid-cols-2 gap-2 p-4">
        {fields.map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl px-3 py-2.5 hover:bg-orange-50 hover:border-orange-100 border border-transparent transition-all duration-150">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
                <p className="text-xs font-semibold text-gray-800 mt-0.5">{value || "—"}</p>
            </div>
        ))}
    </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentProfile() {
    const [pwdModal, setPwdModal] = useState(false);
    const fileRef = useRef(null);

    const { data, isLoading, refetch }             = useGetMyStudentProfileQuery();
    const [updateImage, { isLoading: uploading }]  = useUpdateMyStudentProfileImageMutation();
    const { data: levelHistoryResponse }           = useGetMyStudentLevelHistoryQuery();

    const raw      = data?.data || {};
    const name     = `${raw.firstName || ""} ${raw.lastName || ""}`.trim() || "Student";
    const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

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
        if (file.size > 3 * 1024 * 1024)    { toast.error("Image must be under 3 MB"); return; }
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

    if (isLoading) return (
        <div className="flex justify-center pt-20">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const personalFields = [
        { label: "PR Key",        value: raw.prkey },
        { label: "First Name",    value: raw.firstName },
        { label: "Last Name",     value: raw.lastName },
        { label: "Father Name",   value: raw.fatherName },
        { label: "Gender",        value: raw.gender },
        { label: "Date of Birth", value: formatDate(raw.dob) },
        { label: "Email",         value: raw.email },
        { label: "Mobile",        value: raw.studentMobile },
        { label: "Parent Mobile", value: raw.parentMobile },
        { label: "Village",       value: raw.village },
        { label: "Address",       value: raw.address },
    ];

    const academicFields = [
        { label: "Course",           value: raw.course },
        { label: "Stream",           value: raw.stream },
        { label: "Category",         value: raw.category },
        { label: "10th %",           value: raw.percent10 },
        { label: "12th %",           value: raw.percent12 },
        { label: "12th Subject",     value: raw.subject12 },
        { label: "12th Year",        value: raw.year12 },
        { label: "Current Level",    value: raw.currentLevelId?.name },
        { label: "Current SubLevel", value: raw.currentSubLevelId?.name ? `${raw.currentSubLevelId.name}${daysInSubLevel ? ` (${daysInSubLevel})` : ''}` : '—' },
        { label: "Session",          value: raw.sessionId?.name },
        { label: "Sub Department",   value: raw.subDepartmentId?.name },
    ];

    const statusStyle =
        raw.status === "Active"  ? "bg-green-50 text-green-600 border border-green-100" :
        raw.status === "Placed"  ? "bg-purple-50 text-purple-600 border border-purple-100" :
        raw.status === "Dropped" ? "bg-red-50 text-red-500 border border-red-100" :
        "bg-gray-50 text-gray-500 border border-gray-200";

    return (
        <div className="space-y-5">
            {pwdModal && <ChangePasswordModal onClose={() => setPwdModal(false)} />}

            {/* ── Header Card ── */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="h-1.5 w-full bg-orange-500" />
                <div className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">My Profile</h2>
                            <p className="text-xs text-gray-400 mt-0.5">{raw.course || "—"} · {raw.sessionId?.name || "—"}</p>
                        </div>
                        <button onClick={() => setPwdModal(true)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all duration-200 whitespace-nowrap self-start sm:self-auto">
                            <MdLock size={14} /> Change Password
                        </button>
                    </div>

                    {/* Stat pills */}
                    <div className="flex items-center gap-3 mt-4 flex-wrap">
                        <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${statusStyle}`}>
                            <MdCheckCircle size={11} /> {raw.status || "—"}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                            {raw.currentLevelId?.name || "—"}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 border border-violet-100">
                            {raw.currentSubLevelId?.name || "—"} {daysInSubLevel ? `• ${daysInSubLevel}` : ''}
                        </span>
                        {raw.isFTP && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">FTP</span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Avatar card ── */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row items-center gap-5">
                <div className="relative shrink-0">
                    {raw.image ? (
                        <img src={raw.image} alt={name}
                            className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-100 shadow-sm" />
                    ) : (
                        <div className="w-20 h-20 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center text-3xl font-bold border border-orange-100">
                            {initials}
                        </div>
                    )}
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                        className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange-500 hover:bg-orange-600 text-white rounded-xl flex items-center justify-center shadow-md transition-all duration-200">
                        {uploading
                            ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <MdEdit size={13} />}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </div>
                <div className="text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-1">
                        <h3 className="text-base font-bold text-gray-900">{name}</h3>
                        <MdVerified size={16} className="text-blue-500" />
                    </div>
                    <p className="text-xs text-gray-500">{raw.prkey || "—"}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{raw.email || "—"}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{raw.studentMobile || "—"}</p>
                    <p className="text-[10px] text-gray-400 mt-1">Click the edit icon to update your photo</p>
                </div>
            </div>

            {/* ── Personal + Academic ── */}
            <div className="space-y-5">

                {/* Personal Info */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
                        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                                <MdPerson size={15} className="text-orange-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-800">Personal Information</h3>
                            </div>
                        </div>
                        <InfoGrid fields={personalFields} />
                </div>

                {/* Academic Info */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
                        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                                <MdSchool size={15} className="text-violet-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-800">Academic Information</h3>
                            </div>
                        </div>
                        <InfoGrid fields={academicFields} />
                </div>



            </div>
        </div>
    );
}
