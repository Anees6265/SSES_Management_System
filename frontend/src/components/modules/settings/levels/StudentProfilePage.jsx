import { useState, useRef, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    MdEmail, MdPhone, MdCheckCircle, MdAccessTime,
    MdTableChart, MdSchool, MdWork,
    MdStar, MdMoreVert, MdClose, MdEdit,
    MdArrowUpward, MdBadge, MdBusiness, MdCalendarToday,
    MdAccountTree, MdVerified, MdWarning, MdArrowForward,
    MdFileUpload, MdFileDownload, MdHistory, MdFolderSpecial, MdOpenInNew,
    MdBarChart, MdLightbulb, MdSearch, MdNotificationsNone,
    MdTrendingUp, MdCheck, MdFlag, MdAssignment, MdLocationOn,
    MdPerson
} from "react-icons/md";
import { toast } from "react-toastify";
import CryptoJS from "crypto-js";
import { FiCamera, FiCheck } from "react-icons/fi";
import Header from "../../../shared/sidebar/Header";
import OrangeButton from "../../../shared/sidebar/OrangeButton";
import StudentPlacementTimeline from "../../placements/StudentPlacementTimeline";
import OfferJoiningModal from "../../placements/OfferJoiningModal";
import Loader from "../../../shared/loader/Loader";
import {
    useGetNewStudentTasksQuery,
    useGetNewStudentByIdQuery,
    useGetStudentProgressSnapshotsQuery,
    useGetStudentLevelHistoryQuery,
    useGetStudentTaskHistoryQuery,
    useGetStudentActivityQuery,
    useGetLevelsBySubdepartmentQuery,
    useGetAllSubLevelsQuery,
    usePromoteNewStudentMutation,
    useUpdateStudentByIdMutation,
    useUpdatePlacementReadinessMutation,
    useMoveToReadyForPlacementMutation,
    useUploadDocumentMutation,
    useUploadExtraDocumentMutation,
    useMarkStudentDroppedMutation,
    useMarkStudentDummyMutation,
    useGetStudentThesisQuery,
    useUploadStudentThesisMutation,
    useDeleteStudentThesisMutation,
} from "../../../../redux/api/authApi";

const SECRET_KEY = "ITEG@123";
const getToken = () => {
    try {
        const encryptedToken = localStorage.getItem("token");
        if (!encryptedToken) return null;
        const bytes = CryptoJS.AES.decrypt(encryptedToken, SECRET_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.error("Error retrieving token:", e);
        return null;
    }
};

// Formatting helpers
const formatShortDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const getId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value._id || value.$oid || "";
};

const getTime = (value) => {
    const date = new Date(value || 0);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const formatDateTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatStatus = (status) => {
    if (status === "inProgress") return "In Progress";
    if (!status) return "Updated";
    return status.charAt(0).toUpperCase() + status.slice(1);
};

const openFile = (url) => {
    if (!url) {
        toast.info("No file available.");
        return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
};

const readUploadFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

// Modals
const FullStudentActivityModal = ({ isOpen, onClose, name, activityItems }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">Student Activity Log</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{name}</p>
                    </div>
                    <button onClick={onClose} className="rounded-xl p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
                        <MdClose size={18} />
                    </button>
                </div>

                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3 bg-gray-50/50">
                    <p className="text-xs font-semibold text-gray-500">All recorded activity events</p>
                    <span className="rounded-full bg-orange-50 border border-orange-100 px-3 py-0.5 text-xs font-bold text-orange-600">{activityItems.length} events</span>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="space-y-4">
                        {activityItems.length > 0 ? activityItems.map(item => (
                            <div key={item._id} className="flex items-start gap-3 border-b border-gray-50 pb-3">
                                <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <MdAccessTime size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-800">{item.title}</p>
                                    {item.sub && <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>}
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        {formatDateTime(item.time)}{item.createdByName ? ` • ${item.createdByName}` : ""}
                                    </p>
                                </div>
                            </div>
                        )) : (
                            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
                                <p className="text-xs font-semibold text-gray-500">No student activity logged yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProfileSectionModal = ({ isOpen, onClose, title, subtitle, countLabel, children, footer }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">{title}</h2>
                        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="rounded-xl p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
                        <MdClose size={18} />
                    </button>
                </div>

                {countLabel && (
                    <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3 bg-gray-50/50">
                        <p className="text-xs font-semibold text-gray-500">Summary View</p>
                        <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-bold text-gray-600">{countLabel}</span>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {children}
                </div>

                {footer && (
                    <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/30">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

const DocumentRow = ({ doc }) => (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm hover:border-gray-200 transition mb-2">
        <div className="flex min-w-0 items-start gap-3">
            <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${doc.fileType === "pdf" ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-600"
                }`}>
                <MdBadge size={18} />
            </div>
            <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-900">{doc.title || "Document"}</p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                    {(doc.fileType || "file").toUpperCase()}{doc.uploadedAt ? ` • ${formatShortDate(doc.uploadedAt)}` : ""}
                </p>
                {doc.remark && <p className="mt-1 text-xs text-gray-600">{doc.remark}</p>}
                {doc.uploadedByName && <p className="mt-1 text-[10px] font-semibold text-gray-400">By {doc.uploadedByName}</p>}
            </div>
        </div>
        <button
            type="button"
            onClick={() => openFile(doc.fileURL)}
            className="flex-shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-1"
        >
            <MdOpenInNew size={13} /> Open
        </button>
    </div>
);

const DocumentUploadPanel = ({ type = "document", loading, onUpload }) => {
    const isExtra = type === "extra";
    const [title, setTitle] = useState("");
    const [remark, setRemark] = useState("");
    const [file, setFile] = useState(null);
    const [fileError, setFileError] = useState("");

    const handleFile = (event) => {
        const selected = event.target.files?.[0];
        if (!selected) return;

        const isPdf = selected.type === "application/pdf";
        const isImage = selected.type.startsWith("image/");
        if (!isPdf && !isImage) {
            setFile(null);
            setFileError("Only image or PDF files are allowed.");
            return;
        }
        if (selected.size > 5 * 1024 * 1024) {
            setFile(null);
            setFileError("File must be under 5 MB.");
            return;
        }

        setFileError("");
        setFile(selected);
        if (!title.trim()) {
            setTitle(selected.name.replace(/\.[^/.]+$/, ""));
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error("Document title is required");
            return;
        }
        if (!file) {
            toast.error("Please select a document file");
            return;
        }

        try {
            const fileData = await readUploadFile(file);
            await onUpload({
                title: title.trim(),
                fileData,
                fileType: file.type === "application/pdf" ? "pdf" : "image",
                remark: isExtra ? remark.trim() : undefined,
            });
            setTitle("");
            setRemark("");
            setFile(null);
            setFileError("");
        } catch (error) {
            setFileError(error?.data?.message || "Upload failed. Please try again.");
        }
    };

    return (
        <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-4 mb-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-gray-900">Upload {isExtra ? "Extra Document" : "Document"}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Image or PDF, max 5 MB</p>
                </div>
                <MdFileUpload size={20} className="text-orange-500" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">Document Title</label>
                    <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder={isExtra ? "Resume, Certificate..." : "Aadhar card, Marksheet..."}
                        className="w-full !h-10 !border !border-gray-200 !rounded-xl bg-white !px-3 !py-2 text-xs focus:border-orange-400 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">Select File</label>
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFile}
                        className="w-full !h-10 !border !border-gray-200 !rounded-xl bg-white !px-3 !py-1.5 text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-gray-100 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-gray-600 focus:border-orange-400 focus:outline-none"
                    />
                </div>
                {isExtra && (
                    <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-semibold text-gray-600">Remark</label>
                        <textarea
                            value={remark}
                            onChange={(event) => setRemark(event.target.value)}
                            rows={2}
                            placeholder="Add brief description or remark..."
                            className="w-full resize-none !border !border-gray-200 !rounded-xl bg-white !px-3 !py-2 text-xs focus:border-orange-400 focus:outline-none"
                        />
                    </div>
                )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
                <p className={`text-[11px] font-medium ${fileError ? "text-red-500" : "text-gray-500"}`}>
                    {fileError || (file ? file.name : "No file selected")}
                </p>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:bg-orange-300"
                >
                    {loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <MdCheckCircle size={14} />}
                    Upload File
                </button>
            </div>
        </div>
    );
};

// Shift Readiness Modal
const ReadyStudentModal = ({ name, currentStatus, onConfirm, onCancel, loading }) => {
    const statuses = ["Not Ready", "In Progress", "Ready", "Ready for Interview"];
    const [selected, setSelected] = useState(currentStatus || "Ready");
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800">Update Placement Readiness</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{name}</p>
                    </div>
                    <button onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><MdClose size={18} /></button>
                </div>
                <div className="p-6 space-y-2">
                    {statuses.map(s => (
                        <button key={s} onClick={() => setSelected(s)}
                            className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-semibold border transition ${selected === s
                                ? "bg-orange-50 border-orange-300 text-orange-700 shadow-sm"
                                : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                }`}>
                            {s}
                        </button>
                    ))}
                </div>
                <div className="flex gap-3 px-6 pb-6">
                    <button onClick={onCancel} className="flex-1 py-2.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Cancel</button>
                    <button onClick={() => onConfirm(selected)} disabled={loading}
                        className="flex-1 py-2.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm">
                        {loading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <MdCheckCircle size={15} />}
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

const EditProfileModal = ({ raw, onConfirm, onCancel, loading }) => {
    const fileInputRef = useRef(null);
    const [form, setForm] = useState({
        firstName: raw.firstName || "",
        lastName: raw.lastName || "",
        email: raw.email || "",
        studentMobile: raw.studentMobile || "",
        parentMobile: raw.parentMobile || "",
        fatherName: raw.fatherName || "",
        village: raw.village || "",
        address: raw.address || "",
        course: raw.course || "",
        gender: raw.gender || "",
        image: raw.image || "",
    });
    const ic = "w-full !h-10 !border !border-gray-200 !rounded-xl !px-3 !py-2 text-xs focus:outline-none focus:border-orange-400 bg-white";
    const lc = "block text-xs font-semibold text-gray-600 mb-1";
    const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
    const triggerImageUpload = () => { fileInputRef.current?.click(); };

    return (
        <OrangeButton
            isOpen={true}
            onClose={onCancel}
            panelTitle="Edit Profile"
            panelSubtitle={raw.firstName && raw.lastName ? `${raw.firstName} ${raw.lastName}` : "Student"}
            leftBtnText="Cancel"
            rightBtnText={loading ? "Saving..." : "Save Changes"}
            onLeftClick={onCancel}
            onRightClick={() => onConfirm(form)}
            maxWidth="sm:max-w-lg"
            drawerContent={
                <div className="space-y-4">
                    {/* Profile Header & Image Upload */}
                    <div className="-mx-6 -mt-6 mb-6 p-6 flex flex-col items-center border-b border-gray-100 bg-white">
                        <div className="relative group flex flex-col items-center">
                            {/* Avatar Container */}
                            <div
                                onClick={triggerImageUpload}
                                className="relative cursor-pointer group/avatar rounded-full p-1 transition-all duration-300 hover:scale-[1.02]"
                                title="Click to change profile picture"
                            >
                                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-orange-400 shadow-md ring-4 ring-orange-500/10 group-hover/avatar:ring-orange-500/30 transition-all duration-300">
                                    {form.image ? (
                                        <img
                                            src={form.image}
                                            alt="Profile Preview"
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover/avatar:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-orange-100 text-orange-600 flex items-center justify-center text-2xl font-bold transition-transform duration-300 group-hover/avatar:scale-105">
                                            {(form.firstName?.[0] || "").toUpperCase()}{(form.lastName?.[0] || "").toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                {/* Floating Camera Badge */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        triggerImageUpload();
                                    }}
                                    className="absolute bottom-1 right-1 bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-full shadow-md transition-transform duration-200 hover:scale-110 active:scale-95"
                                    title="Upload new photo"
                                >
                                    <FiCamera className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Preview Selected Status */}
                            {form.image && form.image.startsWith("data:image/") && (
                                <div className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md animate-fade-in">
                                    <FiCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>New photo selected</span>
                                </div>
                            )}
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    if (!file.type.startsWith("image/")) {
                                        toast.error("Please select a valid image file");
                                        return;
                                    }
                                    if (file.size > 5 * 1024 * 1024) {
                                        toast.error("Image size should be less than 5MB");
                                        return;
                                    }
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                        setForm(prev => ({ ...prev, image: reader.result }));
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />

                        {raw.email && (
                            <p className="text-xs text-gray-500 mt-3 font-medium bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                {raw.email}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {[{ k: "firstName", l: "First Name" }, { k: "lastName", l: "Last Name" }, { k: "fatherName", l: "Father Name" }, { k: "email", l: "Email" }, { k: "studentMobile", l: "Student Mobile" }, { k: "parentMobile", l: "Parent Mobile" }, { k: "village", l: "Village" }, { k: "course", l: "Course" }].map(({ k, l }) => (
                            <div key={k}>
                                <label className={lc}>{l}</label>
                                <input className={ic} value={form[k]} onChange={set(k)} placeholder={l} />
                            </div>
                        ))}
                        <div className="col-span-2">
                            <label className={lc}>Address</label>
                            <textarea className={`${ic} resize-none`} rows={2} value={form.address} onChange={set("address")} />
                        </div>
                        <div>
                            <label className={lc}>Gender</label>
                            <select className={ic} value={form.gender} onChange={set("gender")}>
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>
            }
        />
    );
};

// Helper component to render subjects and tasks details for a level
const LevelTasksList = ({ studentId, subLevelId }) => {
    const { data, isLoading } = useGetNewStudentTasksQuery({ id: studentId, subLevelId });

    if (isLoading) {
        return (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-center py-4">
                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-2" />
                <span className="text-[10px] text-slate-400 font-semibold animate-pulse">Loading syllabus details...</span>
            </div>
        );
    }

    const grouped = data?.groupedBySubject || {};
    const subjects = Object.entries(grouped);

    if (subjects.length === 0) {
        return (
            <div className="mt-3 pt-3 border-t border-slate-100 text-center py-2">
                <p className="text-[10px] text-slate-450 italic font-semibold">No syllabus tasks assigned in this level.</p>
            </div>
        );
    }

    return (
        <div className="mt-3.5 pt-3.5 border-t border-slate-100 space-y-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Syllabus Details:</p>
            <div className="space-y-2">
                {subjects.map(([subjectName, group]) => {
                    const tasks = group.tasks || [];
                    const completed = tasks.filter(t => t.status === "completed").length;
                    const pct = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
                    return (
                        <div key={subjectName} className="bg-slate-50 border border-slate-150 rounded-xl p-3">
                            <div className="flex justify-between items-center">
                                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-tight">{subjectName}</span>
                                <span className="text-[10px] font-bold text-slate-500">
                                    {completed} of {tasks.length} Completed ({pct}%)
                                </span>
                            </div>
                            <div className="w-full bg-slate-150 rounded-full h-1 mt-2">
                                <div
                                    className="h-1 rounded-full bg-emerald-500"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Collapsible item container for level history
const LevelHistoryItem = ({ item, student, idx }) => {
    const [expanded, setExpanded] = useState(false);
    const isCurrent = item.status === "in_progress";
    const pct = item.totalTasks > 0
        ? Math.round((item.completedTasksCount / item.totalTasks) * 100)
        : 0;

    return (
        <div className="flex items-start gap-4 relative">
            {/* dot indicator */}
            <div className={`relative z-10 w-4 h-4 rounded-full border-2 mt-1.5 flex-shrink-0 flex items-center justify-center ${isCurrent
                ? "bg-orange-500 border-orange-500 shadow-md ring-4 ring-orange-500/10"
                : "bg-white border-slate-350"
                }`}>
                {!isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-slate-350" />}
            </div>

            {/* card content */}
            <div className={`flex-1 rounded-2xl border p-4 shadow-sm transition-all duration-300 ${isCurrent
                ? "border-orange-150 bg-orange-50/20"
                : "border-slate-100 bg-white hover:border-slate-200"
                }`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                            {item.levelId?.name || "Level"}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-450 mt-0.5 uppercase tracking-widest">
                            {item.subLevelId?.name || "Sub Level"}
                        </p>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-sm ${isCurrent
                        ? "bg-orange-50 text-orange-600 border-orange-100"
                        : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        }`}>
                        {isCurrent ? "CURRENT" : "COMPLETED"}
                    </span>
                </div>

                {/* Stats progress bar */}
                {item.totalTasks > 0 && (
                    <div className="mt-3.5 space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                            <span>{item.completedTasksCount} of {item.totalTasks} Tasks</span>
                            <span className={isCurrent ? "text-orange-500" : "text-emerald-500"}>{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div
                                className={`h-1.5 rounded-full ${isCurrent ? "bg-orange-500" : "bg-emerald-500"}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Collapsible Details list */}
                {expanded && (
                    <LevelTasksList studentId={student._id || student.raw?._id} subLevelId={item.subLevelId?._id} />
                )}

                {/* Footer with dates and toggle */}
                <div className="mt-3 flex items-center justify-between text-[9px] text-slate-400 font-semibold pt-2.5 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        className="text-orange-500 hover:text-orange-600 font-extrabold flex items-center gap-0.5 transition"
                    >
                        {expanded ? "Hide Details" : "Show Details"}
                    </button>
                    <div className="flex items-center gap-2">
                        <span>
                            {item.startedAt ? `Started: ${new Date(item.startedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : ""}
                        </span>
                        {item.completedAt && (
                            <span>
                                • Ended: {new Date(item.completedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};



// Level History Drawer for Admin/Faculty
const LevelHistoryDrawer = ({ isOpen, onClose, levelHistory = [], student }) => {
    const history = levelHistory || [];
    const completedLevels = history.filter(h => h.status === "completed").length;

    return (
        <OrangeButton
            isOpen={isOpen}
            onClose={onClose}
            panelTitle="Level History"
            panelSubtitle={`${student.firstName || ""} ${student.lastName || ""}`}
            showFooter={false}
            maxWidth="sm:max-w-lg"
            drawerContent={
                <div className="space-y-6">
                    {/* Header stats bar */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-150 p-4 rounded-2xl">
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Levels</p>
                            <p className="text-lg font-black text-slate-800 mt-1">{history.length}</p>
                        </div>
                        <div className="text-center border-l border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Completed</p>
                            <p className="text-lg font-black text-emerald-600 mt-1">{completedLevels}</p>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="relative pl-4">
                        <div className="absolute left-6 top-3 bottom-3 w-0.5 bg-slate-100" />
                        <div className="space-y-5">
                            {history.length === 0 ? (
                                <div className="text-center py-10">
                                    <p className="text-xs font-semibold text-slate-400">No level history recorded yet.</p>
                                </div>
                            ) : (
                                history.map((item, idx) => (
                                    <LevelHistoryItem
                                        key={item._id || idx}
                                        item={item}
                                        student={student}
                                        idx={idx}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            }
        />
    );
};

// Mark Dropped / Dummy Modal
const MarkDroppedModal = ({ name, onConfirm, onCancel, loading, variant = "dropped" }) => {
    const isDummy = variant === "dummy";
    const [reason, setReason] = useState("");
    const [remark, setRemark] = useState("");
    const [fileData, setFileData] = useState(null);
    const [fileType, setFileType] = useState("");
    const [fileName, setFileName] = useState("");
    const [fileErr, setFileErr] = useState("");

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const isPdf = file.type === "application/pdf";
        const isImg = file.type.startsWith("image/");
        if (!isPdf && !isImg) { setFileErr("Only image or PDF allowed"); return; }
        if (file.size > 5 * 1024 * 1024) { setFileErr("File must be under 5 MB"); return; }
        setFileErr("");
        setFileName(file.name);
        setFileType(isPdf ? "pdf" : "image");
        const reader = new FileReader();
        reader.onload = (ev) => setFileData(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = () => {
        if (isDummy && !reason.trim()) { toast.error("Reason is required"); return; }
        if (!isDummy && !remark.trim()) { toast.error("Reason is required"); return; }
        if (!fileData) { toast.error("Application document is required"); return; }
        onConfirm({ reason, remark, fileData, fileType, fileName });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800">{isDummy ? "Mark as Dummy" : "Mark as Dropped"}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{name}</p>
                    </div>
                    <button onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><MdClose size={18} /></button>
                </div>
                <div className="p-6 space-y-3.5">
                    <div className={`flex items-start gap-2.5 p-3 rounded-xl border ${isDummy ? "bg-orange-50 border-orange-100 text-orange-700" : "bg-red-50 border-red-100 text-red-700"}`}>
                        <MdWarning size={18} className={`${isDummy ? "text-orange-500" : "text-red-500"} flex-shrink-0 mt-0.5`} />
                        <p className="text-xs">
                            This will mark the student as <strong>{isDummy ? "Dummy" : "Dropped"}</strong>.
                        </p>
                    </div>

                    {isDummy && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Reason <span className="text-red-400">*</span></label>
                            <input
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="Enter dummy student reason..."
                                className="w-full !h-10 !border !border-gray-200 !rounded-xl !px-3 !py-2 text-xs focus:outline-none focus:border-orange-400 bg-white"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            {isDummy ? "Remark" : "Reason"} {!isDummy && <span className="text-red-400">*</span>}
                        </label>
                        <textarea value={remark} onChange={e => setRemark(e.target.value)}
                            rows={3} placeholder={isDummy ? "Add remark..." : "Enter reason for dropping..."}
                            className="w-full !border !border-gray-200 !rounded-xl !px-3 !py-2 text-xs focus:outline-none focus:border-red-400 resize-none bg-white" />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Application Document <span className="text-red-400">*</span>
                            <span className="text-gray-400 font-normal ml-1">(image/PDF max 5MB)</span>
                        </label>
                        <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl p-3 cursor-pointer transition ${fileData ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-gray-300 bg-gray-50"
                            }`}>
                            <MdFileUpload size={18} className={fileData ? "text-green-500" : "text-gray-400"} />
                            <div className="flex-1 min-w-0">
                                {fileData ? (
                                    <p className="text-xs font-semibold text-green-700 truncate">{fileName}</p>
                                ) : (
                                    <p className="text-xs text-gray-500">Click to upload application</p>
                                )}
                            </div>
                            <input type="file" accept="image/*,.pdf" onChange={handleFile} className="hidden" />
                        </label>
                        {fileErr && <p className="text-[11px] text-red-500 mt-1">{fileErr}</p>}
                    </div>
                </div>
                <div className="flex gap-3 px-6 pb-6">
                    <button onClick={onCancel} className="flex-1 py-2.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Cancel</button>
                    <button onClick={handleSubmit} disabled={loading}
                        className={`flex-1 py-2.5 text-xs font-semibold text-white rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-60 shadow-sm ${isDummy ? "bg-orange-500 hover:bg-orange-600" : "bg-red-500 hover:bg-red-600"}`}>
                        {loading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <MdWarning size={15} />}
                        {isDummy ? "Confirm Dummy" : "Confirm Drop"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Promote Modal
const PromoteModal = ({ name, onConfirm, onCancel, loading }) => {
    const [remark, setRemark] = useState("");
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800">Promote Student</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{name}</p>
                    </div>
                    <button onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><MdClose size={18} /></button>
                </div>
                <div className="p-6">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Remark <span className="text-gray-400 font-normal">(optional)</span></label>
                    <textarea
                        value={remark} onChange={e => setRemark(e.target.value)}
                        rows={3} placeholder="Add a promotion remark..."
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-400 resize-none"
                    />
                </div>
                <div className="flex gap-3 px-6 pb-6">
                    <button onClick={onCancel} className="flex-1 py-2.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Cancel</button>
                    <button onClick={() => onConfirm(remark)} disabled={loading}
                        className="flex-1 py-2.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 disabled:bg-green-300 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm">
                        {loading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <MdArrowUpward size={15} />}
                        Promote
                    </button>
                </div>
            </div>
        </div>
    );
};

const PlacementHistorySection = ({ raw, readinessStatus }) => {
    const records = useMemo(() => {
        if (raw?.PlacementinterviewRecord?.length > 0) return raw.PlacementinterviewRecord;
        if (raw?.placement?.PlacementinterviewRecord?.length > 0) return raw.placement.PlacementinterviewRecord;
        return [];
    }, [raw]);

    const stats = useMemo(() => {
        let totalCompanies = records.length;
        let totalRounds = records.reduce((sum, r) => sum + (r.rounds?.length || 0), 0);
        let selectedCount = records.filter(r => r.status === "Selected" || r.status === "Placed").length;
        let notSelectedCount = records.filter(r => r.status === "Not Selected" || r.status === "RejectedByCompany").length;
        let offersCount = records.filter(r => r.status === "Offer Received" || r.status === "Selected" || r.status === "Placed").length;
        let declinedCount = records.filter(r => r.status === "Offer Declined").length;
        let notJoinedCount = records.filter(r => r.status === "Did Not Join").length;
        let inProcessCount = records.filter(r => ["Scheduled", "Interview Scheduled", "Ongoing", "Interview In Progress", "Rescheduled"].includes(r.status)).length;

        return { totalCompanies, totalRounds, selectedCount, notSelectedCount, offersCount, declinedCount, notJoinedCount, inProcessCount };
    }, [records]);

    return (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <MdWork className="text-orange-500" size={20} /> Placement History & Company Drives
                    </h3>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">Comprehensive multi-company attempt history, dynamic rounds, and feedback</p>
                </div>
                <span className="bg-orange-50 text-orange-600 border border-orange-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Placement Stage: {readinessStatus}
                </span>
            </div>

            {/* PLACEMENT STATS GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase">Companies</p>
                    <p className="text-base font-black text-slate-900 mt-1">{stats.totalCompanies}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase">Rounds</p>
                    <p className="text-base font-black text-slate-900 mt-1">{stats.totalRounds}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center">
                    <p className="text-[10px] font-extrabold text-emerald-600 uppercase">Selected</p>
                    <p className="text-base font-black text-emerald-700 mt-1">{stats.selectedCount}</p>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 text-center">
                    <p className="text-[10px] font-extrabold text-rose-600 uppercase">Not Selected</p>
                    <p className="text-base font-black text-rose-700 mt-1">{stats.notSelectedCount}</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 text-center">
                    <p className="text-[10px] font-extrabold text-indigo-600 uppercase">Offers</p>
                    <p className="text-base font-black text-indigo-700 mt-1">{stats.offersCount}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-center">
                    <p className="text-[10px] font-extrabold text-amber-600 uppercase">Declined</p>
                    <p className="text-base font-black text-amber-700 mt-1">{stats.declinedCount}</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3 text-center">
                    <p className="text-[10px] font-extrabold text-purple-600 uppercase">Did Not Join</p>
                    <p className="text-base font-black text-purple-700 mt-1">{stats.notJoinedCount}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-center">
                    <p className="text-[10px] font-extrabold text-blue-600 uppercase">In Process</p>
                    <p className="text-base font-black text-blue-700 mt-1">{stats.inProcessCount}</p>
                </div>
            </div>

            {/* COMPANY ATTEMPTS LIST */}
            <div className="space-y-4">
                {records.length > 0 ? (
                    records.map((rec, idx) => (
                        <div key={rec._id || idx} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 font-black flex items-center justify-center text-sm">
                                        {(rec.companyName || "C")[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-extrabold text-slate-900 text-sm">{rec.companyName || "Company Drive"}</h4>
                                        <p className="text-xs font-medium text-slate-500">{rec.jobProfile || "Job Role"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                                        {rec.scheduleDate ? formatShortDate(rec.scheduleDate) : "Scheduled"}
                                    </span>
                                    <span className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${rec.status === "Selected" || rec.status === "Placed" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                                        rec.status === "Not Selected" || rec.status === "RejectedByCompany" ? "bg-rose-100 text-rose-800 border border-rose-200" :
                                            rec.status === "Offer Received" ? "bg-indigo-100 text-indigo-800 border border-indigo-200" :
                                                "bg-amber-100 text-amber-800 border border-amber-200"
                                        }`}>
                                        {rec.status}
                                    </span>
                                </div>
                            </div>

                            {rec.statusRemark && (
                                <p className="text-xs font-medium text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
                                    <span className="font-bold text-slate-800">Remark: </span>{rec.statusRemark}
                                </p>
                            )}

                            {rec.notJoiningReason && (
                                <p className="text-xs font-medium text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                                    <span className="font-bold">Reason for not joining: </span>{rec.notJoiningReason} {rec.notJoiningRemarks ? `(${rec.notJoiningRemarks})` : ""}
                                </p>
                            )}

                            {/* INTERVIEW ROUNDS BREAKDOWN */}
                            {rec.rounds?.length > 0 && (
                                <div className="space-y-2 pt-1">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Interview Rounds</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                        {rec.rounds.map((rnd, rIdx) => (
                                            <div key={rnd._id || rIdx} className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-bold text-slate-900">{rnd.roundName}</span>
                                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${rnd.result === "Cleared" || rnd.result === "Passed" || rnd.result === "Selected" ? "bg-emerald-100 text-emerald-800" :
                                                        rnd.result === "Not Cleared" || rnd.result === "Failed" || rnd.result === "Rejected" ? "bg-rose-100 text-rose-800" :
                                                            "bg-amber-100 text-amber-800"
                                                        }`}>
                                                        {rnd.result || "Pending"}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] font-medium text-slate-500">
                                                    {rnd.date ? formatShortDate(rnd.date) : ""} • Mode: {rnd.mode || "Offline"}
                                                </p>
                                                {rnd.feedback && (
                                                    <p className="text-[11px] font-semibold text-slate-600 pt-0.5">
                                                        Feedback: {rnd.feedback}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                        <p className="text-xs font-semibold text-slate-500">No placement drives attempted yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const translateLevelName = (name) => {
    if (!name) return "";
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

// MAIN STUDENT PROFILE PAGE (Clean 100% Dynamic API Data + Reference UI Template)
const StudentProfilePage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { id } = useParams();
    const { student, level, subdepartment } = location.state || {};
    const studentId = id || student?._id || student?.raw?._id;

    const [moreOpen, setMoreOpen] = useState(false);
    const [promoteModal, setPromoteModal] = useState(false);
    const [readyModal, setReadyModal] = useState(false);
    const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
    const [editModal, setEditModal] = useState(false);
    const [dropModal, setDropModal] = useState(false);
    const [dummyModal, setDummyModal] = useState(false);
    const [activityModal, setActivityModal] = useState(false);
    const [sectionModal, setSectionModal] = useState(null);
    const [ftpLoading, setFtpLoading] = useState(false);
    const [readyLoading, setReadyLoading] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [dropLoading, setDropLoading] = useState(false);
    const [dummyLoading, setDummyLoading] = useState(false);

    // Thesis AI Evaluation Hooks & States
    const [activeTab, setActiveTab] = useState("overview");
    const { data: thesisResponse, isLoading: isThesisLoading, refetch: refetchThesis } = useGetStudentThesisQuery(studentId);
    const thesisData = thesisResponse?.data;
    const [uploadThesis] = useUploadStudentThesisMutation();
    const [deleteThesis, { isLoading: isDeletingThesis }] = useDeleteStudentThesisMutation();

    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadStage, setUploadStage] = useState('');
    const thesisFileInputRef = useRef(null);

    const handleThesisFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== "application/pdf") {
                toast.error("Only PDF files are allowed!");
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                toast.error("File size cannot exceed 10MB!");
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleThesisFileDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            if (file.type !== "application/pdf") {
                toast.error("Only PDF files are allowed!");
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                toast.error("File size cannot exceed 10MB!");
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleThesisUploadAndAnalyze = async () => {
        if (!selectedFile) return;

        setUploadStage('Uploading thesis PDF to secure storage...');
        const messageSequence = [
            'Sending thesis document to Google Gemini 1.5 Flash...',
            'Analyzing content structure and research quality...',
            'Identifying student strengths & technical knowledge...',
            'Scanning for areas of academic concern & issues...',
            'Formulating professional improvement recommendations...',
            'Structuring evaluation report into dynamic schema...',
            'Saving thesis assessment to dashboard database...'
        ];

        let msgIdx = 0;
        const interval = setInterval(() => {
            if (msgIdx < messageSequence.length) {
                setUploadStage(messageSequence[msgIdx]);
                msgIdx++;
            }
        }, 2500);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('thesis', selectedFile);

            const response = await uploadThesis({
                studentId: studentId,
                formData: formDataToSend
            }).unwrap();

            clearInterval(interval);
            setUploadStage('');
            setSelectedFile(null);
            toast.success(response.message || 'Thesis analyzed successfully!');
            refetchThesis();
        } catch (err) {
            clearInterval(interval);
            setUploadStage('');
            console.error(err);
            toast.error(err.data?.message || err.message || 'Failed to upload and analyze thesis');
        }
    };

    const handleThesisDelete = async () => {
        if (window.confirm("Are you sure you want to delete this thesis and its AI analysis? This action cannot be undone.")) {
            try {
                const response = await deleteThesis(studentId).unwrap();
                toast.success(response.message || "Thesis deleted successfully");
                refetchThesis();
            } catch (err) {
                console.error(err);
                toast.error(err.data?.message || err.message || "Failed to delete thesis");
            }
        }
    };

    const handleDownloadTemplate = () => {
        const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        window.open(`${baseUrl}/thesis/template/download`, "_blank");
    };

    const [promoteStudent, { isLoading: promoting }] = usePromoteNewStudentMutation();
    const [updateStudent] = useUpdateStudentByIdMutation();
    const [updatePlacementReadiness] = useUpdatePlacementReadinessMutation();
    const [moveToReadyForPlacement, { isLoading: movingToReady }] = useMoveToReadyForPlacementMutation();
    const [uploadDocument, { isLoading: uploadingDocument }] = useUploadDocumentMutation();
    const [uploadExtraDocument, { isLoading: uploadingExtraDocument }] = useUploadExtraDocumentMutation();
    const [markStudentDropped] = useMarkStudentDroppedMutation();
    const [markStudentDummy] = useMarkStudentDummyMutation();

    const { data: taskData } = useGetNewStudentTasksQuery(
        { id: studentId },
        { skip: !studentId }
    );

    const { data: studentFull, isLoading: loadingStudentFull } = useGetNewStudentByIdQuery(
        studentId,
        { skip: !studentId }
    );

    const dummyFallbackStudent = useMemo(() => ({
        _id: studentId || "65a1234567890abcdef12345",
        prkey: student?.prkey || "ITEG-2024-889",
        firstName: student?.firstName || "Rahul",
        lastName: student?.lastName || "Sharma",
        email: student?.email || "rahul.sharma@iteg.edu.in",
        studentMobile: student?.studentMobile || "9876543210",
        parentMobile: "9876500000",
        fatherName: "Suresh Sharma",
        village: "Indore",
        course: student?.course || "Full Stack Web Development",
        techno: student?.techno || student?.technology || student?.track || "MERN Stack",
        technology: student?.technology || student?.techno || student?.track || "MERN Stack",
        track: student?.track || student?.techno || "MERN Stack",
        gender: "Male",
        status: "Active",
        isFTP: false,
        currentLevelId: student?.currentLevelId || { _id: "level2a", name: "Level 2", order: 2 },
        currentSubLevelId: student?.currentSubLevelId || { _id: "sublevel2a", name: "Level 2A", order: 4 },
        subDepartmentId: student?.subDepartmentId || { _id: "subdept1", name: "Information Technology", departmentId: { name: "Engineering" } },
        sessionId: { name: "2024-2025" },
        placement: { readinessStatus: "Ready for Placement" },
        readinessStatus: "Ready for Placement",
        attendanceRate: 96,
        documents: [
            { _id: "d1", title: "Student Resume", fileType: "pdf", fileURL: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", uploadedAt: new Date() },
            { _id: "d2", title: "Aadhar Card", fileType: "image", fileURL: "", uploadedAt: new Date() },
            { _id: "d3", title: "10th Marksheet", fileType: "image", fileURL: "", uploadedAt: new Date() },
            { _id: "d4", title: "12th Marksheet", fileType: "image", fileURL: "", uploadedAt: new Date() }
        ],
        academicHistory: [
            { title: "React & Redux Masterclass", year: "2024", institute: "ITEG Academy" },
            { title: "Full Stack MERN Certification", year: "2023", institute: "ITEG Academy" }
        ]
    }), [studentId, student]);

    const fetchedStudent = studentFull?.data || (studentFull?.firstName ? studentFull : null);
    const baseStudent = fetchedStudent || (student?.firstName ? student : null) || (student?.raw?.firstName ? student.raw : null) || dummyFallbackStudent;
    const subDepartmentId = getId(baseStudent?.subDepartmentId);


    const { data: progressSnapshotsResponse } = useGetStudentProgressSnapshotsQuery(
        { id: studentId, limit: 100 },
        { skip: !studentId }
    );

    const { data: levelHistoryResponse } = useGetStudentLevelHistoryQuery(
        studentId,
        { skip: !studentId }
    );

    const { data: taskHistoryResponse } = useGetStudentTaskHistoryQuery(
        { id: studentId, limit: 100 },
        { skip: !studentId }
    );

    const { data: activityResponse } = useGetStudentActivityQuery(
        { id: studentId, limit: 100 },
        { skip: !studentId }
    );

    const { data: levelsResponse } = useGetLevelsBySubdepartmentQuery(
        subDepartmentId,
        { skip: !subDepartmentId }
    );

    const { data: subLevelsResponse } = useGetAllSubLevelsQuery(undefined, {
        skip: !subDepartmentId,
    });

    const raw = baseStudent || {};
    const name = `${raw.firstName || ""} ${raw.lastName || ""}`.trim() || "Student";
    const initials = (name.split(" ").map(n => n[0]).filter(Boolean).join("").slice(0, 2) || "ST").toUpperCase();
    const readinessStatus = (typeof raw.placement === "object" ? raw.placement?.readinessStatus : null) || raw.readinessStatus || "Not Ready";

    const resumeURL = useMemo(() => {
        return (
            raw?.placement?.resumeURL ||
            raw?.studentPlacement?.resumeURL ||
            raw?.resumeURL ||
            raw?.documents?.find(d => (d.title || "").toLowerCase().includes("resume") || d.fileType === "pdf")?.fileURL ||
            raw?.studentId?.documents?.find(d => (d.title || "").toLowerCase().includes("resume"))?.fileURL ||
            ""
        );
    }, [raw]);

    const dummyTaskData = useMemo(() => ({
        totalTasks: 20,
        completedTasks: 16,
        pendingTasks: 3,
        overdueTasks: 1,
        groupedBySubject: {
            "Frontend Development (React.js)": {
                tasks: [
                    { status: "completed", marks: 92 },
                    { status: "completed", marks: 88 },
                    { status: "completed", marks: 95 },
                    { status: "pending" }
                ]
            },
            "Backend Engineering (Node.js / Express)": {
                tasks: [
                    { status: "completed", marks: 90 },
                    { status: "completed", marks: 85 },
                    { status: "completed", marks: 89 }
                ]
            },
            "Database & APIs (MongoDB)": {
                tasks: [
                    { status: "completed", marks: 94 },
                    { status: "pending" },
                    { status: "overdue" }
                ]
            }
        }
    }), []);

    const effectiveTaskData = taskData || { totalTasks: 0, completedTasks: 0, pendingTasks: 0, overdueTasks: 0, groupedBySubject: {} };

    const totalTasks = effectiveTaskData.totalTasks || 0;
    const completedTasks = effectiveTaskData.completedTasks || 0;
    const pendingTasks = effectiveTaskData.pendingTasks || 0;
    const overdueTasks = effectiveTaskData.overdueTasks || effectiveTaskData.overDueTasks || 0;
    const subjectGroups = effectiveTaskData.groupedBySubject || {};

    const subjects = Object.entries(subjectGroups).map(([sName, group]) => {
        const tasks = group.tasks || [];
        const done = tasks.filter(t => t.status === "completed").length;
        return {
            name: sName,
            pct: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0,
            tasksCount: tasks.length,
            completedCount: done
        };
    });

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const allSubjectTasks = Object.values(subjectGroups).flatMap(group => group.tasks || []);
    const evaluatedTasks = allSubjectTasks.filter(t => typeof t.marks === "number");
    const averageMarks = evaluatedTasks.length > 0
        ? (evaluatedTasks.reduce((sum, t) => sum + t.marks, 0) / evaluatedTasks.length).toFixed(1)
        : null;

    const currentSubLevelName = raw.currentSubLevelId?.name || level?.currentSubLevelName || "—";
    const currentLevelLabel = raw.currentLevelId?.name || level?.name || "—";

    // Helper to get student's actual technology from database
    const getActualStudentTechnology = (student) => {
        if (!student) return "Technology Not Updated";
        if (Array.isArray(student.technologies) && student.technologies.filter(Boolean).length > 0) {
            return student.technologies.filter(Boolean).join(" | ");
        }
        if (Array.isArray(student.technology) && student.technology.filter(Boolean).length > 0) {
            return student.technology.filter(Boolean).join(" | ");
        }
        const t = student.techno || student.technology || student.track;
        if (t && typeof t === "string" && t.trim()) {
            return t.trim();
        }
        return "Technology Not Updated";
    };

    const trackName = getActualStudentTechnology(raw);
    const subLevelName = currentSubLevelName;
    const levelName = currentLevelLabel;


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

    const isEligibleForPlacement = (() => {
        const levelOrder = raw?.currentLevelId?.order || level?.order;
        if (typeof levelOrder === "number") {
            return levelOrder > 1;
        }
        const levelName = (raw?.currentLevelId?.name || level?.name || "").toUpperCase();
        if (levelName.includes("LEVEL 1") || levelName === "—" || levelName === "") {
            return false;
        }
        return true;
    })();

    const dummyLevelHistory = useMemo(() => [
        { _id: "h1", subLevelId: { name: "Level 1A" }, status: "completed" },
        { _id: "h2", subLevelId: { name: "Level 1B" }, status: "completed" },
        { _id: "h3", subLevelId: { name: "Level 1C" }, status: "completed" },
        { _id: "h4", subLevelId: { name: "Level 2A" }, status: "completed" },
    ], []);

    const effectiveLevelHistory = levelHistoryResponse?.data || [];

    const isLevel2ACompleted = useMemo(() => {
        const history = effectiveLevelHistory;
        const progress2A = history.find(h => (h.subLevelId?.name || "").toUpperCase().includes("2A") && h.status === "completed");
        if (progress2A) return true;
        const curSubName = (raw?.currentSubLevelId?.name || "").toUpperCase();
        const curLevelOrder = raw?.currentLevelId?.order || 0;
        if (curSubName.includes("2B") || curSubName.includes("2C") || curLevelOrder > 2) return true;
        return false;
    }, [raw, effectiveLevelHistory]);

    const handleMoveToReadyForPlacement = async () => {
        try {
            await moveToReadyForPlacement(raw._id).unwrap();
            toast.success(`${name} has been moved to "Ready for Placement" successfully!`);
            setMoreOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || "Move to Ready for Placement failed");
        }
    };

    const activityItems = (activityResponse?.data || []).map((item) => ({
        ...item,
        time: item.createdAt,
    }));

    const documents = Array.isArray(raw.documents) ? raw.documents : [];
    const regularDocs = documents.filter(doc => !doc.isExtra);
    const extraDocs = documents.filter(doc => doc.isExtra);
    const permissionHistory = Array.isArray(raw.permissions) ? raw.permissions : [];
    const pendingPermissions = permissionHistory.filter(item => item.status === "pending").length;

    const goToTaskBoard = () => {
        navigate("/student/task-board", {
            state: {
                student: raw,
                level: level || raw.currentLevelId,
                subdepartment: subdepartment || raw.subDepartmentId,
            },
        });
    };

    const handlePromote = async (remark) => {
        try {
            await promoteStudent(raw._id).unwrap();
            toast.success(`${name} promoted successfully!`);
            setPromoteModal(false);
            navigate(-1);
        } catch (err) {
            toast.error(err?.data?.message || "Promotion failed");
        }
    };

    const handleFtpToggle = async () => {
        setFtpLoading(true);
        try {
            await updateStudent({ id: raw._id, data: { isFTP: !raw.isFTP } }).unwrap();
            toast.success(raw.isFTP ? "FTP status removed" : "Student shifted to FTP");
            navigate(0);
        } catch (err) {
            toast.error(err?.data?.message || "FTP update failed");
        } finally {
            setFtpLoading(false);
        }
    };

    const handleReadiness = async (status) => {
        setReadyLoading(true);
        try {
            await updatePlacementReadiness({ id: raw._id, readinessStatus: status }).unwrap();
            toast.success(`Placement status updated to "${status}"`);
            setReadyModal(false);
        } catch (err) {
            toast.error(err?.data?.message || "Update failed");
        } finally {
            setReadyLoading(false);
        }
    };

    const handleEditProfile = async (form) => {
        setEditLoading(true);
        try {
            if (form.image && form.image.startsWith("data:image/")) {
                const baseUrl = import.meta.env.VITE_API_URL;
                const url = `${baseUrl}/students/${raw._id}/profile-image`;
                const r = await fetch(url, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({ image: form.image })
                });
                if (!r.ok) {
                    const errData = await r.json();
                    throw new Error(errData.message || "Failed to update profile photo");
                }
            }

            const { image, ...otherFields } = form;
            await updateStudent({ id: raw._id, data: otherFields }).unwrap();
            toast.success("Profile updated successfully");
            setEditModal(false);
            navigate(0);
        } catch (err) {
            toast.error(err?.message || err?.data?.message || "Update failed");
        } finally {
            setEditLoading(false);
        }
    };

    const handleMarkDropped = async ({ remark, fileData, fileType }) => {
        setDropLoading(true);
        try {
            await markStudentDropped({ id: raw._id, remark, fileData, fileType }).unwrap();
            toast.success(`${name} marked as Dropped`);
            setDropModal(false);
            navigate(-1);
        } catch (err) {
            toast.error(err?.data?.message || "Update failed");
        } finally {
            setDropLoading(false);
        }
    };

    const handleMarkDummy = async ({ reason, remark, fileData, fileType }) => {
        setDummyLoading(true);
        try {
            await markStudentDummy({ id: raw._id, reason, remark, fileData, fileType }).unwrap();
            toast.success(`${name} marked as Dummy`);
            setDummyModal(false);
            navigate("/student-permission");
        } catch (err) {
            toast.error(err?.data?.message || "Update failed");
        } finally {
            setDummyLoading(false);
        }
    };

    const handleMarkActive = async () => {
        try {
            await updateStudent({ id: raw._id, data: { status: "Active" } }).unwrap();
            toast.success(`${name} marked as Active`);
            navigate(0);
        } catch (err) {
            toast.error(err?.data?.message || "Failed to mark as Active");
        }
    };

    const handleDocumentUpload = async (payload) => {
        try {
            await uploadDocument({ id: raw._id, ...payload }).unwrap();
            toast.success("Document uploaded successfully");
        } catch (err) {
            toast.error(err?.data?.message || "Document upload failed");
            throw err;
        }
    };

    const handleExtraDocumentUpload = async (payload) => {
        try {
            await uploadExtraDocument({ id: raw._id, ...payload }).unwrap();
            toast.success("Extra document uploaded successfully");
        } catch (err) {
            toast.error(err?.data?.message || "Extra document upload failed");
            throw err;
        }
    };

    if (loadingStudentFull || (studentFull && studentFull._id !== studentId)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
                <Loader />
            </div>
        );
    }

    return (
        <>
            {promoteModal && (
                <PromoteModal name={name} onConfirm={handlePromote} onCancel={() => setPromoteModal(false)} loading={promoting} />
            )}
            {readyModal && (
                <ReadyStudentModal name={name} currentStatus={readinessStatus} onConfirm={handleReadiness} onCancel={() => setReadyModal(false)} loading={readyLoading} />
            )}
            {editModal && (
                <EditProfileModal raw={raw} onConfirm={handleEditProfile} onCancel={() => setEditModal(false)} loading={editLoading} />
            )}
            {historyDrawerOpen && (
                <LevelHistoryDrawer
                    isOpen={historyDrawerOpen}
                    onClose={() => setHistoryDrawerOpen(false)}
                    levelHistory={levelHistoryResponse?.data || []}
                    student={raw}
                />
            )}
            {dropModal && (
                <MarkDroppedModal name={name} onConfirm={handleMarkDropped} onCancel={() => setDropModal(false)} loading={dropLoading} />
            )}
            {dummyModal && (
                <MarkDroppedModal name={name} onConfirm={handleMarkDummy} onCancel={() => setDummyModal(false)} loading={dummyLoading} variant="dummy" />
            )}
            <FullStudentActivityModal
                isOpen={activityModal}
                onClose={() => setActivityModal(false)}
                name={name}
                activityItems={activityItems}
            />
            <ProfileSectionModal
                isOpen={sectionModal === "documents"}
                onClose={() => setSectionModal(null)}
                title="Core Documents"
                subtitle={name}
                countLabel={`${regularDocs.length} Documents`}
            >
                <DocumentUploadPanel type="document" loading={uploadingDocument} onUpload={handleDocumentUpload} />
                {regularDocs.map(doc => <DocumentRow key={doc._id || doc.fileURL} doc={doc} />)}
            </ProfileSectionModal>
            <ProfileSectionModal
                isOpen={sectionModal === "extraDocuments"}
                onClose={() => setSectionModal(null)}
                title="Extra Supporting Documents"
                subtitle={name}
                countLabel={`${extraDocs.length} Supporting Files`}
            >
                <DocumentUploadPanel type="extra" loading={uploadingExtraDocument} onUpload={handleExtraDocumentUpload} />
                {extraDocs.map(doc => <DocumentRow key={doc._id || doc.fileURL} doc={doc} />)}
            </ProfileSectionModal>

            {/* TOP TITLE BAR WITH SEARCH & ID */}
            <div className="bg-[#F8F9FA] min-h-screen px-8 py-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Student Record</h1>
                        {raw.prkey && (
                            <span className="bg-slate-200/70 text-slate-700 text-xs font-semibold px-3 py-1 rounded-md border border-slate-300/50">
                                ID: {raw.prkey}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search Bar Flex Container */}
                        <div className="flex items-center h-10 w-72 sm:w-80 bg-white border border-slate-200/90 rounded-xl px-3.5 shadow-sm hover:border-slate-300 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-400/20 transition-all duration-200">
                            <MdSearch className="text-slate-400 flex-shrink-0 mr-2.5" size={18} />
                            <input
                                type="text"
                                placeholder="Search student records..."
                                className="w-full !h-full bg-transparent !border-none !outline-none !ring-0 focus:!ring-0 focus:!outline-none focus:!border-none text-xs font-medium text-slate-800 placeholder-slate-400 !p-0 !shadow-none"
                            />
                        </div>

                        {/* Notification Button */}
                        <button
                            type="button"
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all duration-200 relative flex-shrink-0"
                            title="Notifications"
                        >
                            <MdNotificationsNone size={18} />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white" />
                        </button>
                    </div>
                </div>

                {/* HERO CARD */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                            {/* Avatar with Status Ring */}
                            <div className="relative flex-shrink-0">
                                {raw.image ? (
                                    <img src={raw.image} alt={name} className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 shadow-sm" />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-2xl font-bold border-4 border-slate-100 shadow-sm">
                                        {initials}
                                    </div>
                                )}
                                <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                            </div>

                            {/* Info Section */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{name}</h2>
                                    <MdVerified size={20} className="text-orange-500" />
                                    {raw.isFTP && (
                                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                                            FTP
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-orange-500">
                                    <span>{raw.course || "Course"} • {translateLevelName(currentLevelLabel)} • {currentLevelLabel} ({currentSubLevelName}){daysInSubLevel ? ` • ${daysInSubLevel}` : ''}</span>
                                    <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md border border-slate-200 text-[11px] font-bold">
                                        Technology: {trackName}
                                    </span>

                                </div>

                                {/* Placement Badge */}
                                <div className="pt-1 flex items-center gap-2 flex-wrap">
                                    {(() => {
                                        let label = readinessStatus;
                                        if (label === "Ready") label = "Ready for Placement";
                                        else if (label === "Ready for Interview") label = "Ready for Drive";

                                        let badgeCls = "bg-purple-50 text-purple-600 border border-purple-100";
                                        let icon = <MdCheckCircle size={14} />;

                                        if (label === "Ready for Placement") {
                                            badgeCls = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                                        } else if (label === "Ready for Drive") {
                                            badgeCls = "bg-indigo-50 text-indigo-700 border border-indigo-200";
                                        } else if (label === "Not Ready") {
                                            badgeCls = "bg-rose-50 text-rose-600 border border-rose-100";
                                            icon = <MdWarning size={14} />;
                                        } else if (label === "In Progress") {
                                            badgeCls = "bg-amber-50 text-amber-600 border border-amber-100";
                                            icon = <MdAccessTime size={14} />;
                                        }

                                        return (
                                            <span className={`inline-flex items-center gap-1.5 ${badgeCls} text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider`}>
                                                {icon} PLACEMENT {label}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Right Buttons */}
                        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
                            {isLevel2ACompleted && !["Ready for Placement", "Ready for Drive", "Placed"].includes(readinessStatus) && (
                                <button
                                    onClick={handleMoveToReadyForPlacement}
                                    disabled={movingToReady}
                                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm disabled:opacity-50"
                                >
                                    <MdCheckCircle size={16} /> {movingToReady ? "Moving..." : "Move to Ready for Placement"}
                                </button>
                            )}

                            <button
                                onClick={goToTaskBoard}
                                className="flex items-center gap-2 border-2 border-orange-400 text-orange-500 hover:bg-orange-50 font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm"
                            >
                                <MdAssignment size={16} /> Task Board
                            </button>
                            <button
                                onClick={() => setEditModal(true)}
                                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm"
                            >
                                <MdEdit size={16} /> Edit Profile
                            </button>

                            {/* Actions Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setMoreOpen(p => !p)}
                                    className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition flex items-center gap-1 text-xs font-bold"
                                >
                                    Actions <MdMoreVert size={18} />
                                </button>
                                {moreOpen && (
                                    <>
                                        <div className="fixed inset-0 z-20" onClick={() => setMoreOpen(false)} />
                                        <div className="absolute right-0 top-11 z-30 bg-white border border-slate-100 rounded-2xl shadow-xl w-56 py-1.5 text-slate-700 text-xs font-semibold">
                                            {isLevel2ACompleted && !["Ready for Placement", "Ready for Drive", "Placed"].includes(readinessStatus) && (
                                                <button onClick={handleMoveToReadyForPlacement} className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-emerald-600 flex items-center gap-2 font-bold">
                                                    <MdCheckCircle size={14} /> Move to Ready for Placement
                                                </button>
                                            )}
                                            <button onClick={() => { setMoreOpen(false); setPromoteModal(true); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-emerald-600 flex items-center gap-2">
                                                <MdArrowUpward size={14} /> Promote Student
                                            </button>
                                            <button onClick={handleFtpToggle} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-orange-600 flex items-center gap-2">
                                                <MdArrowUpward size={14} /> {raw.isFTP ? "Remove FTP" : "Shift to FTP"}
                                            </button>
                                            {isEligibleForPlacement && (
                                                <button onClick={() => { setMoreOpen(false); setReadyModal(true); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2">
                                                    <MdCheckCircle size={14} /> Shift Placement Status
                                                </button>
                                            )}
                                            <button onClick={() => { setMoreOpen(false); navigate(`/student/${raw._id}/report`); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2">
                                                <MdBarChart size={14} /> View Report Card
                                            </button>
                                            <div className="border-t border-slate-100 my-1" />
                                            {["Dummy", "Dropped"].includes(raw.status) ? (
                                                <button onClick={handleMarkActive} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-emerald-600 flex items-center gap-2 font-bold">
                                                    <MdCheckCircle size={14} /> Mark Active
                                                </button>
                                            ) : (
                                                <>
                                                    <button onClick={() => { setMoreOpen(false); setDummyModal(true); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-amber-600 flex items-center gap-2">
                                                        <MdWarning size={14} /> Mark Dummy
                                                    </button>
                                                    <button onClick={() => { setMoreOpen(false); setDropModal(true); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-rose-600 flex items-center gap-2">
                                                        <MdWarning size={14} /> Mark Dropped
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Full Contact & Student Personal Info Row */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-700">
                        {raw.email && (
                            <div className="flex items-center gap-2">
                                <MdEmail className="text-orange-500" size={16} />
                                <span>{raw.email}</span>
                            </div>
                        )}
                        {raw.studentMobile && (
                            <div className="flex items-center gap-2">
                                <MdPhone className="text-orange-500" size={16} />
                                <span>{raw.studentMobile}</span>
                            </div>
                        )}
                        {raw.parentMobile && (
                            <div className="flex items-center gap-2">
                                <MdPhone className="text-emerald-500" size={16} />
                                <span>Parent: {raw.parentMobile}</span>
                            </div>
                        )}
                        {raw.fatherName && (
                            <div className="flex items-center gap-2">
                                <MdPerson className="text-orange-500" size={16} />
                                <span>Father: {raw.fatherName}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <MdBusiness className="text-orange-500" size={16} />
                            <span>Dept: {raw.subDepartmentId?.departmentId?.name || "Dept"} / {subdepartment?.name || raw.subDepartmentId?.name || "Sub Dept"}</span>
                        </div>
                        {raw.sessionId?.name && (
                            <div className="flex items-center gap-2">
                                <MdCalendarToday className="text-orange-500" size={16} />
                                <span>Session: {raw.sessionId.name} <span className="text-emerald-600 font-bold">(Active)</span></span>
                            </div>
                        )}
                        {raw.village && (
                            <div className="flex items-center gap-2">
                                <MdLocationOn className="text-orange-500" size={16} />
                                <span>Village: {raw.village}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* PLACEMENT JOURNEY & TIMELINE */}
                <StudentPlacementTimeline student={raw} placement={raw.studentPlacement || raw} />

                {/* Tab Buttons */}
                <div className="flex border-b border-slate-200 mb-6">
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={`pb-3 text-sm font-bold transition-all duration-200 border-b-2 mr-6 ${activeTab === "overview"
                                ? "border-orange-500 text-orange-500 font-black"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        Profile Overview
                    </button>
                    <button
                        onClick={() => setActiveTab("thesis")}
                        className={`pb-3 text-sm font-bold transition-all duration-200 border-b-2 ${activeTab === "thesis"
                                ? "border-orange-500 text-orange-500 font-black"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        🎓 Thesis AI Evaluation
                    </button>
                </div>

                {activeTab === "overview" ? (
                    <>
                        {/* 4 STAT CARDS ROW */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                            {/* Card 1: LEVEL HISTORY */}
                            <div
                                onClick={() => setHistoryDrawerOpen(true)}
                                className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-2 cursor-pointer hover:border-orange-200 transition group"
                            >
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-orange-500 transition">LEVEL HISTORY</p>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black text-slate-900 group-hover:text-orange-500 transition">
                                        {currentLevelLabel} {daysInSubLevel ? `(${daysInSubLevel})` : ''}
                                    </h3>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPromoteModal(true);
                                        }}
                                        className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full transition"
                                    >
                                        +1 Level Up
                                    </button>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 pt-1">
                                    <div className="h-1.5 rounded-full bg-orange-500" style={{ width: `${completionRate}%` }} />
                                </div>
                            </div>

                            {/* Card 2: REPORT */}
                            <div
                                onClick={() => navigate(`/student/${raw._id}/report`)}
                                className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-1 cursor-pointer hover:border-orange-200 transition group"
                            >
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">REPORT</p>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black text-slate-900 group-hover:text-orange-500 transition">View</h3>
                                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center">
                                        <MdBarChart size={18} />
                                    </div>
                                </div>
                                <p className="text-xs font-semibold text-slate-400">Student Report card</p>
                            </div>

                            {/* Card 3: ATTENDANCE RATE */}
                            <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ATTENDANCE RATE</p>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black text-slate-900">{raw.attendanceRate ? `${raw.attendanceRate}%` : "100%"}</h3>
                                    <span className="bg-orange-50 text-orange-600 border border-orange-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                        <MdCheckCircle size={12} /> Active
                                    </span>
                                </div>
                                <p className="text-xs font-semibold text-slate-400">Monthly attendance tracker</p>
                            </div>

                            {/* Card 4: OVERALL PERFORMANCE */}
                            <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">OVERALL PERFORMANCE</p>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black text-slate-900">{averageMarks ? `${averageMarks}%` : `${completionRate}%`}</h3>
                                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                        <MdTrendingUp size={12} /> Task Score
                                    </span>
                                </div>
                                <p className="text-xs font-semibold text-slate-400">Rating: {averageMarks || "N/A"}</p>
                            </div>
                        </div>

                        {/* MIDDLE ROW (ATTENDANCE & TASK TREND + TASK COMPLETION) */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Box: Attendance & Task Trend Chart (2 Cols) */}
                            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-base font-black text-slate-900">Task & Attendance Trend</h3>
                                        <p className="text-xs text-slate-400 font-medium">Monthly progress across assigned subjects</p>
                                    </div>
                                    <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                                        Active Level Progress
                                    </span>
                                </div>

                                {/* Line Area Chart SVG */}
                                <div className="relative h-56 w-full pt-4">
                                    <svg className="w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
                                                <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                                            </linearGradient>
                                        </defs>
                                        <path
                                            d="M 0 120 Q 80 80, 160 110 T 320 60 T 500 30 L 500 160 L 0 160 Z"
                                            fill="url(#orangeGrad)"
                                        />
                                        <path
                                            d="M 0 120 Q 80 80, 160 110 T 320 60 T 500 30"
                                            fill="none"
                                            stroke="#f97316"
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-2 px-2">
                                        <span>Level Start</span>
                                        <span>Mid Progress</span>
                                        <span>Current Level</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Box: Task Completion (1 Col) */}
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="text-base font-black text-slate-900 mb-4">Task Completion</h3>

                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="relative w-20 h-20 flex-shrink-0">
                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                                <circle cx="60" cy="60" r="48" fill="none" stroke="#f1f5f9" strokeWidth="14" />
                                                <circle cx="60" cy="60" r="48" fill="none" stroke="#f97316" strokeWidth="14"
                                                    strokeDasharray={`${(completionRate / 100) * 301.6} 301.6`} strokeLinecap="round" />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-sm font-black text-slate-900">{completionRate}%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-slate-900">{currentSubLevelName} Tasks</h4>
                                            <p className="text-xs font-semibold text-slate-400 mt-0.5">{completedTasks} of {totalTasks} completed</p>
                                        </div>
                                    </div>

                                    {/* Progress Bars */}
                                    <div className="space-y-3.5">
                                        <div>
                                            <div className="flex justify-between text-xs font-bold mb-1">
                                                <span className="text-slate-700">Completed Tasks</span>
                                                <span className="text-emerald-500">{completionRate}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${completionRate}%` }} />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-xs font-bold mb-1">
                                                <span className="text-slate-700">Pending Tasks</span>
                                                <span className="text-orange-500">{totalTasks > 0 ? Math.round((pendingTasks / totalTasks) * 100) : 0}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div className="h-2 rounded-full bg-orange-500" style={{ width: `${totalTasks > 0 ? (pendingTasks / totalTasks) * 100 : 0}%` }} />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-xs font-bold mb-1">
                                                <span className="text-slate-700">Overdue Tasks</span>
                                                <span className="text-rose-500">{totalTasks > 0 ? Math.round((overdueTasks / totalTasks) * 100) : 0}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div className="h-2 rounded-full bg-rose-500" style={{ width: `${totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BOTTOM ROW (TECHNOLOGIES + PROJECTS) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Box: Technologies */}
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-5">
                                        <div>
                                            <h3 className="text-base font-black text-slate-900">Technologies</h3>
                                            <p className="text-xs font-semibold text-slate-400 mt-0.5">Key technical skills & domain proficiency</p>
                                        </div>
                                        <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                                            {trackName}
                                        </span>
                                    </div>
                                    {subjects.length > 0 ? (
                                        <>
                                            <div className="space-y-4">
                                                {subjects.map((sub, idx) => (
                                                    <div key={sub.name} className="flex items-center gap-4">
                                                        <span className="w-44 text-xs font-bold text-slate-700 truncate">{sub.name}</span>
                                                        <div className="flex-1 bg-slate-100 rounded-full h-3">
                                                            <div
                                                                className={`h-3 rounded-full ${idx % 2 === 0 ? "bg-orange-500" : "bg-blue-500"}`}
                                                                style={{ width: `${sub.pct}%` }}
                                                            />
                                                        </div>
                                                        <span className="w-8 text-right text-xs font-black text-slate-900">{sub.pct}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-slate-100 text-xs font-bold text-slate-400">
                                                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Completed Modules</span>
                                                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Core Tech Stack</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center flex flex-col items-center justify-center min-h-[220px]">
                                            <MdLightbulb className="text-slate-300 mb-2" size={32} />
                                            <p className="text-xs font-bold text-slate-700">No Learning Stats</p>
                                            <p className="text-[11px] font-semibold text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                                                No subjects or technology training records have been completed yet.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Box: Projects */}
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-5">
                                        <div>
                                            <h3 className="text-base font-black text-slate-900">Projects</h3>
                                            <p className="text-xs font-semibold text-slate-400 mt-0.5">Capstone & production application portfolio</p>
                                        </div>
                                        <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
                                            0 Projects
                                        </span>
                                    </div>

                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center flex flex-col items-center justify-center min-h-[220px]">
                                        <MdFolderSpecial className="text-slate-300 mb-2" size={32} />
                                        <p className="text-xs font-bold text-slate-700">No Projects Available</p>
                                        <p className="text-[11px] font-semibold text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                                            No major capstone projects have been registered for this student yet.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* PLACEMENT STAGE INFO & RESUME SECTION */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Placement Stage Info Card */}
                            <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mb-4">
                                        <MdWork className="text-orange-500" size={20} /> Placement Stage Info
                                    </h3>
                                    <div className="space-y-3.5 text-xs">
                                        <div>
                                            <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">Placement Stage</span>
                                            <span className="font-extrabold text-slate-800 text-sm">{readinessStatus || "Not Ready"}</span>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">Technology / Track</span>
                                            <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md inline-block mt-0.5">{trackName}</span>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">Academic Level</span>
                                            <span className="font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-md inline-block mt-0.5">{subLevelName} ({levelName})</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Dedicated Resume Card */}
                            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                                        <div>
                                            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                                <MdBadge className="text-blue-500" size={20} /> Resume
                                            </h3>
                                            <p className="text-xs font-medium text-slate-400 mt-0.5">Latest uploaded student resume document</p>
                                        </div>
                                        <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border ${resumeURL
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-amber-50 text-amber-700 border-amber-200"
                                            }`}>
                                            {resumeURL ? "Resume Available" : "Resume Not Available"}
                                        </span>
                                    </div>

                                    {resumeURL ? (
                                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                                                    <MdFileDownload size={22} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-extrabold text-slate-800">Latest Resume</p>
                                                    <p className="text-[11px] font-medium text-slate-400">PDF / Document File</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => window.open(resumeURL, "_blank", "noopener,noreferrer")}
                                                    className="px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                                                >
                                                    <MdOpenInNew size={14} /> View Resume
                                                </button>
                                                <a
                                                    href={resumeURL}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    download="Student_Resume.pdf"
                                                    className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                                                >
                                                    <MdFileDownload size={14} /> Download Resume
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                                            <p className="text-xs font-semibold text-slate-500">Resume not available</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* PLACEMENT HISTORY & COMPANY DRIVES SECTION */}
                        <PlacementHistorySection raw={raw} readinessStatus={readinessStatus} />

                        {/* BOTTOM QUICK ACCESS MODULE CARDS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 pt-2 pb-6">
                            <div
                                onClick={() => setSectionModal("documents")}
                                className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:border-orange-200 transition cursor-pointer flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center font-bold">
                                        <MdBadge size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-extrabold text-slate-900 group-hover:text-orange-500 transition">Core Documents</p>
                                        <p className="text-[11px] font-semibold text-slate-400">{regularDocs.length} files uploaded</p>
                                    </div>
                                </div>
                                <MdArrowForward size={16} className="text-slate-400 group-hover:text-orange-500 group-hover:translate-x-1 transition" />
                            </div>

                            <div
                                onClick={() => setSectionModal("extraDocuments")}
                                className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:border-orange-200 transition cursor-pointer flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
                                        <MdFolderSpecial size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-extrabold text-slate-900 group-hover:text-orange-500 transition">Extra Documents</p>
                                        <p className="text-[11px] font-semibold text-slate-400">{extraDocs.length} supporting files</p>
                                    </div>
                                </div>
                                <MdArrowForward size={16} className="text-slate-400 group-hover:text-orange-500 group-hover:translate-x-1 transition" />
                            </div>

                            <div
                                onClick={() => setReadyModal(true)}
                                className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:border-orange-200 transition cursor-pointer flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold">
                                        <MdWork size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-extrabold text-slate-900 group-hover:text-orange-500 transition">Placement Status</p>
                                        <p className="text-[11px] font-semibold text-slate-400">{readinessStatus}</p>
                                    </div>
                                </div>
                                <MdArrowForward size={16} className="text-slate-400 group-hover:text-orange-500 group-hover:translate-x-1 transition" />
                            </div>

                            <div
                                onClick={() => navigate("/leave-requests")}
                                className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:border-orange-200 transition cursor-pointer flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold">
                                        <MdCalendarToday size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-extrabold text-slate-900 group-hover:text-orange-500 transition">Leave Permissions</p>
                                        <p className="text-[11px] font-semibold text-slate-400">{pendingPermissions} pending requests</p>
                                    </div>
                                </div>
                                <MdArrowForward size={16} className="text-slate-400 group-hover:text-orange-500 group-hover:translate-x-1 transition" />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
                        <div className="flex justify-between items-center border-b pb-4 border-slate-100">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Student Thesis AI Analysis</h3>
                                <p className="text-xs text-slate-500 mt-1">Upload and generate structured academic evaluation points using Google Gemini AI</p>
                            </div>
                        </div>

                        {isThesisLoading ? (
                            <div className="py-12 flex justify-center"><Loader /></div>
                        ) : thesisData ? (
                            <div className="space-y-6">
                                {/* Thesis file info */}
                                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">📄</span>
                                        <div>
                                            <p className="font-semibold text-slate-800">{thesisData.fileName || "Student Thesis"}</p>
                                            <p className="text-xs text-slate-500">Uploaded on {new Date(thesisData.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <a
                                            href={thesisData.thesisUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors bg-white shadow-sm"
                                        >
                                            View PDF
                                        </a>
                                        <button
                                            type="button"
                                            onClick={handleThesisDelete}
                                            disabled={isDeletingThesis}
                                            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors border border-rose-100"
                                        >
                                            {isDeletingThesis ? "Deleting..." : "Delete & Re-upload"}
                                        </button>
                                    </div>
                                </div>

                                {/* AI Analysis Grid */}
                                <div className="space-y-4">
                                    {/* Overall Summary */}
                                    <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                                        <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2 text-sm">
                                            <span>✨</span> AI Overall Summary
                                        </h4>
                                        <p className="text-xs text-purple-900 leading-relaxed font-semibold">{thesisData.analysis?.summary}</p>
                                    </div>

                                    {/* Strengths and Weaknesses side-by-side */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                            <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2 text-sm">
                                                <span>✅</span> Strengths (Positive Aspects)
                                            </h4>
                                            <ul className="space-y-2">
                                                {thesisData.analysis?.strengths?.map((str, idx) => (
                                                    <li key={idx} className="flex gap-2 text-xs text-emerald-900 leading-relaxed">
                                                        <span className="text-emerald-500 font-bold">•</span>
                                                        <span>{str}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                                            <h4 className="font-bold text-rose-800 mb-3 flex items-center gap-2 text-sm">
                                                <span>⚠️</span> Key Gaps & Issues
                                            </h4>
                                            <ul className="space-y-2">
                                                {thesisData.analysis?.weaknesses?.map((weak, idx) => (
                                                    <li key={idx} className="flex gap-2 text-xs text-rose-900 leading-relaxed">
                                                        <span className="text-rose-550 font-bold">•</span>
                                                        <span>{weak}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Recommendations */}
                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                        <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2 text-sm">
                                            <span>💡</span> Actionable Recommendations
                                        </h4>
                                        <ul className="space-y-2">
                                            {thesisData.analysis?.recommendations?.map((rec, idx) => (
                                                <li key={idx} className="flex gap-2 text-xs text-amber-900 leading-relaxed font-semibold">
                                                    <span className="text-amber-500 font-bold">•</span>
                                                    <span>{rec}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Effort Level */}
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2 text-sm">
                                                <span>⚡</span> Recommended Effort Level
                                            </h4>
                                            <p className="text-[10px] text-slate-500">Degree of student effort required to achieve perfection.</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${thesisData.analysis?.effortLevel === "Low" ? "bg-emerald-100 text-emerald-800 border border-emerald-250" :
                                                    thesisData.analysis?.effortLevel === "Medium" ? "bg-yellow-100 text-yellow-800 border border-yellow-250" :
                                                        thesisData.analysis?.effortLevel === "High" ? "bg-orange-100 text-orange-800 border border-orange-205" :
                                                            "bg-rose-100 text-rose-800 border border-rose-200"
                                                }`}>
                                                {thesisData.analysis?.effortLevel || "Medium"} Effort
                                            </span>
                                            <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden border">
                                                <div className={`h-full ${thesisData.analysis?.effortLevel === "Low" ? "bg-emerald-500 w-1/4" :
                                                        thesisData.analysis?.effortLevel === "Medium" ? "bg-yellow-500 w-2/4" :
                                                            thesisData.analysis?.effortLevel === "High" ? "bg-orange-500 w-3/4" :
                                                                "bg-rose-600 w-full"
                                                    }`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div
                                    onClick={() => thesisFileInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleThesisFileDrop}
                                    className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-200 ${isDragging ? "border-orange-500 bg-orange-50" : "border-slate-300 hover:border-orange-400 bg-slate-50"
                                        }`}
                                >
                                    <input
                                        type="file"
                                        ref={thesisFileInputRef}
                                        onChange={handleThesisFileSelect}
                                        accept="application/pdf"
                                        className="hidden"
                                    />
                                    <div className="text-5xl mb-4">📁</div>
                                    <p className="text-base font-semibold text-slate-700">
                                        {selectedFile ? `Selected: ${selectedFile.name}` : "Drag and drop student thesis PDF here, or click to browse"}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-2">Only PDF files up to 10MB are supported.</p>
                                </div>

                                <div className="flex justify-between items-center bg-orange-50/50 p-4 rounded-2xl border border-orange-100/60 mt-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">🎓</span>
                                        <div className="text-left">
                                            <p className="text-xs font-bold text-slate-800">Need a Sample Template?</p>
                                            <p className="text-[11px] text-slate-500">Download the standard thesis document layout to verify formatting constraints.</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleDownloadTemplate}
                                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0"
                                    >
                                        <span>📥</span> Download Sample PDF
                                    </button>
                                </div>

                                {selectedFile && !uploadStage && (
                                    <div className="flex justify-end gap-3 animate-fadeIn">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedFile(null)}
                                            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                                        >
                                            Clear File
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleThesisUploadAndAnalyze}
                                            className="px-5 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 text-xs font-semibold shadow-sm hover:shadow-md transition-shadow"
                                        >
                                            Upload & Analyze Thesis
                                        </button>
                                    </div>
                                )}

                                {uploadStage && (
                                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/50 text-center space-y-6 animate-scaleIn">
                                            <div className="relative w-20 h-20 mx-auto">
                                                <div className="absolute inset-0 border-4 border-orange-100 rounded-full" />
                                                <div className="absolute inset-0 border-4 border-t-orange-500 border-r-orange-550 rounded-full animate-spin" />
                                                <span className="absolute inset-0 flex items-center justify-center text-2xl">🤖</span>
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-slate-800">AI Thesis Evaluation in Progress</h4>
                                                <p className="text-xs text-slate-605 mt-2 min-h-[40px] flex items-center justify-center font-semibold animate-pulse">
                                                    {uploadStage}
                                                </p>
                                            </div>
                                            <div className="w-full bg-slate-150 rounded-full h-1.5 overflow-hidden">
                                                <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-full rounded-full transition-all duration-1000 w-[80%] animate-pulse" />
                                            </div>
                                            <p className="text-[10px] text-slate-400">Gemini is reading pages, summarizing content, and structure-mapping academic feedback...</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default StudentProfilePage;
