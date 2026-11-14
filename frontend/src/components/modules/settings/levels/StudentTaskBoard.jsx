/* eslint-disable react/prop-types, no-unused-vars */
import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    MdCheckCircle,
    MdCalendarToday, MdArrowBack, MdClose, MdStar, MdStarBorder, MdAdd,
    MdSearch, MdNotificationsNone, MdFilterList, MdVerified,
    MdExpandMore, MdCheck, MdHistory, MdDeleteOutline
} from "react-icons/md";
import { Menu } from "lucide-react";
import { toast } from "react-toastify";
import CryptoJS from "crypto-js";
import {
    useGetNotificationsQuery,
    useGetNewStudentTasksQuery,
    useAssignExtraTaskMutation,
    useDeleteStudentTaskMutation,
    useGetSyllabusVersionWithHierarchyQuery,
    useGetStudentLevelHistoryQuery
} from "../../../../redux/api/authApi";
import { useSidebar } from "../../../../contexts/SidebarContext";
import Loader from "../../../shared/loader/Loader";
import OrangeButton from "../../../shared/sidebar/OrangeButton";
import SelectDropdown from "../../../shared/form-fields/SelectDropdown";
import NotificationDrawer from "../../../shared/notifications/NotificationDrawer";
import ActiveFilterChips from "../../../shared/search-export/ActiveFilterChips";
import { usePersistentState } from "../../../../hooks/usePersistentFilters";
import { sortTasksAscending } from "../../../../utils/taskOrderHelpers";
import { API_BASE_URL } from "../../../../config/apiConfig";

const SECRET_KEY = "ITEG@123";
const getToken = () => {
    try {
        const enc = localStorage.getItem("token");
        if (!enc) return "";
        return CryptoJS.AES.decrypt(enc, SECRET_KEY).toString(CryptoJS.enc.Utf8) || "";
    } catch { return ""; }
};

const PRIORITY_BADGES = {
    high: "bg-rose-50 text-rose-600 border border-rose-100",
    medium: "bg-amber-50 text-amber-600 border border-amber-100",
    low: "bg-emerald-50 text-emerald-600 border border-emerald-100",
};

const STATUS_COLUMNS = [
    { key: "pending", label: "Pending", badgeBg: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
    { key: "inProgress", label: "In Progress", badgeBg: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
    { key: "completed", label: "Completed", badgeBg: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
];

function formatTimeAgo(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (isNaN(seconds)) return "";
    if (seconds < 0) return "Just now";

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
        second: 1
    };

    for (const [unit, value] of Object.entries(intervals)) {
        const count = Math.floor(seconds / value);
        if (count >= 1) {
            return `${count} ${unit}${count > 1 ? "s" : ""} ago`;
        }
    }
    return "Just now";
}

// ── Status Dropdown for Task Cards ───────────────────────────────────────────
const STATUS_OPTIONS = [
    {
        value: "pending",
        label: "Pending",
        dotColor: "bg-amber-500",
        badgeStyle: "bg-amber-50 text-amber-700 border-amber-200/90 hover:bg-amber-100/60",
    },
    {
        value: "inProgress",
        label: "In Progress",
        dotColor: "bg-blue-500",
        badgeStyle: "bg-blue-50 text-blue-700 border-blue-200/90 hover:bg-blue-100/60",
    },
    {
        value: "completed",
        label: "Done",
        dotColor: "bg-emerald-500",
        badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200/90 hover:bg-emerald-100/60",
    },
];

const StatusDropdown = ({ currentStatus, onStatusChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const activeConfig = STATUS_OPTIONS.find(s => s.value === currentStatus) || STATUS_OPTIONS[0];

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div
            ref={dropdownRef}
            className="relative shrink-0"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <button
                type="button"
                onClick={() => setIsOpen((p) => !p)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all duration-150 shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer select-none ${activeConfig.badgeStyle}`}
            >
                <span className={`w-1.5 h-1.5 rounded-full ${activeConfig.dotColor} shrink-0`} />
                <span>{activeConfig.label}</span>
                <MdExpandMore
                    size={13}
                    className={`transition-transform duration-200 shrink-0 opacity-70 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-xl shadow-lg border border-slate-200/90 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-0.5">
                        Change Status
                    </div>
                    {STATUS_OPTIONS.map((opt) => {
                        const isSelected = opt.value === currentStatus;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    if (opt.value !== currentStatus) {
                                        onStatusChange(opt.value);
                                    }
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold transition-colors duration-100 cursor-pointer ${isSelected
                                        ? "bg-slate-100 text-slate-900 font-bold"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${opt.dotColor} shrink-0`} />
                                    <span>{opt.label}</span>
                                </div>
                                {isSelected && <MdCheck size={14} className="text-orange-500 shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ── Task Card ─────────────────────────────────────────────────────────────────
const TaskCard = ({
    task,
    index,
    isSelected = false,
    onToggleSelect,
    onDragStart,
    onStatusChange,
    onDeleteTask
}) => {
    const priority = task.priority || "medium";
    const isCompleted = task.status === "completed";
    const isInProgress = task.status === "inProgress";

    // Accent lines and colors
    const statusConfig = {
        pending: "border-l-4 border-l-amber-500/80 hover:border-amber-500 hover:shadow-amber-500/5",
        inProgress: "border-l-4 border-l-orange-500/80 hover:border-orange-500 hover:shadow-orange-500/5",
        completed: "border-l-4 border-l-emerald-500/80 hover:border-emerald-500 hover:shadow-emerald-500/5"
    };
    const activeBorderClass = statusConfig[task.status] || statusConfig.pending;

    return (
        <div
            draggable
            onDragStart={() => onDragStart(task)}
            className={`bg-white rounded-xl border p-3.5 sm:p-4 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-grab active:cursor-grabbing select-none space-y-3 ${
                isSelected
                    ? "ring-2 ring-orange-500 border-orange-400 bg-orange-50/25 shadow-orange-500/10"
                    : `border-slate-200 ${activeBorderClass}`
            }`}
        >
            {/* Header: Select Checkbox + S.No + Priority Badge + Status Dropdown + Delete Option */}
            <div className="flex items-center justify-between gap-2 pb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelect?.(task._id);
                        }}
                        className={`w-4 h-4 rounded-[5px] flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0 border ${
                            isSelected
                                ? "bg-orange-500 border-orange-500 text-white shadow-2xs"
                                : "bg-white border-slate-300 hover:border-orange-400 text-transparent"
                        }`}
                        title={isSelected ? "Deselect task" : "Select task"}
                        aria-label={isSelected ? "Deselect task" : "Select task"}
                    >
                        <MdCheck size={12} className={isSelected ? "opacity-100" : "opacity-0"} />
                    </button>
                    <span
                        className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-md bg-slate-900 text-white text-[10px] font-black shrink-0 shadow-2xs"
                        title={`Serial No. ${task.sno || (typeof index === "number" ? index + 1 : 1)}`}
                    >
                        #{task.sno || (typeof index === "number" ? index + 1 : 1)}
                    </span>
                    <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full border shadow-2xs truncate ${isCompleted ? "bg-slate-50 text-slate-400 border-slate-200" : (PRIORITY_BADGES[priority] || PRIORITY_BADGES.medium)
                        }`}>
                        {isCompleted ? "COMPLETED" : `${priority} PRIORITY`}
                    </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <StatusDropdown
                        currentStatus={task.status || "pending"}
                        onStatusChange={(newStatus) => onStatusChange(task, newStatus)}
                    />
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTask?.(task);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150 cursor-pointer"
                        title="Delete task for this student"
                    >
                        <MdDeleteOutline size={15} />
                    </button>
                </div>
            </div>

            {/* Title */}
            <div className="min-w-0">
                <h4
                    className={`text-xs sm:text-sm font-extrabold text-slate-800 leading-snug tracking-tight break-words ${isCompleted ? "line-through text-slate-400" : ""}`}
                    style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                >
                    {task.title}
                </h4>
                {(task.subjectName || task.description) && (
                    <p className="text-[10.5px] sm:text-[11px] text-slate-400 mt-1 line-clamp-2 font-medium leading-relaxed break-words">
                        {task.description || (task.subjectName ? `${task.subjectName}${task.topicName ? ` › ${task.topicName}` : ""}` : "")}
                    </p>
                )}
            </div>

            {/* Given by & Time ago */}
            <div className="flex items-center justify-between text-[9.5px] sm:text-[10px] text-slate-400 font-semibold pt-2 border-t border-slate-100/70 gap-2 flex-wrap sm:flex-nowrap">
                {task.assignedByName ? (
                    <span className="truncate max-w-[70%] sm:max-w-[60%] flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full" title={task.assignedByName}>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                        <span className="text-slate-600 font-bold truncate">{task.assignedByName}</span>
                    </span>
                ) : (
                    <span className="text-slate-400 font-bold bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">Auto-assigned</span>
                )}
                {(task.assignedAt || task.createdAt) && (
                    <span className="text-slate-400/90 font-medium shrink-0">{formatTimeAgo(task.assignedAt || task.createdAt)}</span>
                )}
            </div>

            {/* Marks & Rating Badge */}
            <div className="flex items-center justify-between pt-1 text-xs">
                {isCompleted ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-black text-[10px] tracking-wider bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                        <MdVerified size={12} /> VERIFIED
                    </span>
                ) : isInProgress ? (
                    <span className="inline-flex items-center gap-1 text-orange-600 font-black text-[10px] tracking-wider bg-orange-50 border border-orange-100 rounded-full px-2 py-0.5">
                        RATING
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-slate-500 font-bold text-[10px] tracking-wider bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">
                        PENDING
                    </span>
                )}

                <div className="flex items-center gap-1">
                    {isInProgress ? (
                        <div className="flex items-center gap-0.5" title="Give rating in progress">
                            {Array.from({ length: Math.min(5, task.maxMarks || 5) }, (_, i) => i + 1).map(star => {
                                const isSelected = star <= (task.marks || 0);
                                return (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onStatusChange(task, task.status, { marks: star });
                                        }}
                                        className="p-0.5 transition hover:scale-125 cursor-pointer"
                                        title={`Give rating: ${star}/${Math.min(5, task.maxMarks || 5)}`}
                                    >
                                        {isSelected ? (
                                            <MdStar size={15} className="text-orange-400" />
                                        ) : (
                                            <MdStarBorder size={15} className="text-slate-300" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ) : isCompleted ? (
                        <div className="flex items-center gap-0.5" title="Completed rating">
                            {Array.from({ length: Math.min(5, task.maxMarks || 5) }, (_, i) => i + 1).map(star => {
                                const isSelected = star <= (task.marks || 0);
                                return (
                                    <span key={star} className="p-0.5 cursor-default">
                                        {isSelected ? (
                                            <MdStar size={15} className="text-emerald-500" />
                                        ) : (
                                            <MdStarBorder size={15} className="text-slate-200" />
                                        )}
                                    </span>
                                );
                            })}
                        </div>
                    ) : (
                        <span className="text-[10px] font-semibold text-slate-400 italic">
                            Move to In Progress to rate
                        </span>
                    )}

                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${task.marks !== null && task.marks !== undefined
                            ? isCompleted
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                        Marks: {task.marks !== null && task.marks !== undefined ? task.marks : 0}/{Math.min(5, task.maxMarks || 5)}
                    </span>
                </div>
            </div>

            {/* Footer Row */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100/70 text-[10px] font-bold text-slate-400">
                <div className="flex items-center gap-1.5 text-slate-400/90">
                    <MdCalendarToday size={12} className="text-slate-400 shrink-0" />
                    <span>
                        {task.dueDate
                            ? new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                            : task.timeDays ? `${task.timeDays}${String(task.timeDays).toLowerCase().includes("day") ? "" : " Days"}` : "No deadline"
                        }
                    </span>
                </div>

                <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/45 font-black flex items-center justify-center text-[9px] shadow-2xs shrink-0" title={`Type: ${task.type || "Task"}`}>
                    {task.type?.[0]?.toUpperCase() || "T"}
                </div>
            </div>
        </div>
    );
};

// ── Extra Task Modal ──────────────────────────────────────────────────────────
const TASK_TYPE_OPTIONS = [
    { value: "assessment", label: "Assessment" },
    { value: "assignment", label: "Assignment" },
    { value: "project", label: "Project" },
    { value: "writtenExam", label: "Written Exam" },
    { value: "interview", label: "Interview" },
    { value: "presentation", label: "Presentation" },
    { value: "learning", label: "Learning" },
    { value: "practice", label: "Practice" },
    { value: "other", label: "Other" }
];

const PRIORITY_OPTIONS = [
    { value: "low", label: "Low Priority" },
    { value: "medium", label: "Medium Priority" },
    { value: "high", label: "High Priority" }
];

const EMPTY_EXTRA = { title: "", description: "", type: "assessment", priority: "medium", maxMarks: 5, timeDays: "", dueDate: "", measurablePoints: "", subjectName: "" };

const selectBtnCls = "w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs sm:text-sm border border-gray-200/90 hover:border-orange-400 bg-white rounded-xl text-gray-800 font-medium transition-all shadow-2xs focus:outline-none cursor-pointer";
const inputCls = "w-full border border-gray-200/90 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder-gray-400 font-medium text-gray-800 shadow-2xs";
const labelCls = "block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5";

const ExtraTaskModal = ({ student, selectedSubLevelId, selectedLevelInfo, onClose, onSuccess, defaultSubjects = [] }) => {
    const [form, setForm] = useState(EMPTY_EXTRA);
    const [assignExtraTask, { isLoading }] = useAssignExtraTaskMutation();

    const activeSubId = selectedSubLevelId || (typeof student?.currentSubLevelId === "object" ? student.currentSubLevelId?._id : student?.currentSubLevelId) || undefined;
    const activeLvlId = (selectedSubLevelId ? (selectedLevelInfo?.levelId?._id || selectedLevelInfo?.levelId) : (typeof student?.currentLevelId === "object" ? student.currentLevelId?._id : student?.currentLevelId)) || undefined;

    const rawVersionId = selectedLevelInfo?.syllabusVersionId || student?.syllabusVersionId;
    const versionId = typeof rawVersionId === "object" && rawVersionId !== null
        ? (rawVersionId._id || rawVersionId.id)
        : (typeof rawVersionId === "string" && rawVersionId.trim() && rawVersionId !== "[object Object]" ? rawVersionId.trim() : null);

    const { data: versionData } = useGetSyllabusVersionWithHierarchyQuery(
        versionId,
        { skip: !versionId }
    );
    const versionSubjects = (versionData?.data?.subjects || []).map(s => s?.name).filter(Boolean);
    const availableSubjects = Array.from(new Set([...versionSubjects, ...(defaultSubjects || [])])).filter(Boolean);

    const subjectOptions = useMemo(() => [
        { value: "", label: "Select Subject (Optional)" },
        ...availableSubjects.map((sName) => ({ value: sName, label: sName }))
    ], [availableSubjects]);

    const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) { toast.error("Task title is required"); return; }
        const studentId = student?._id || student?.id;
        if (!studentId) { toast.error("Invalid student ID"); return; }
        try {
            await assignExtraTask({
                id: studentId,
                title: form.title,
                description: form.description || undefined,
                type: form.type,
                maxMarks: Math.min(5, Math.max(1, Number(form.maxMarks) || 5)),
                subjectName: form.subjectName || undefined,
                measurablePoints: form.measurablePoints || undefined,
                timeDays: form.timeDays ? String(form.timeDays).trim() : undefined,
                dueDate: form.dueDate || undefined,
                priority: form.priority,
                subLevelId: activeSubId,
                levelId: activeLvlId
            }).unwrap();
            toast.success("Extra task assigned successfully!");
            onSuccess();
        } catch (err) {
            toast.error(err?.data?.message || "Failed to assign task");
        }
    };

    const studentDisplayName = `${student?.firstName || student?.name || "Student"} ${student?.lastName || ""}`.trim();
    const levelTag = selectedLevelInfo
        ? `${selectedLevelInfo.levelId?.name || "Level"} (${selectedLevelInfo.subLevelId?.name || ""})`
        : `${student?.currentLevelId?.name || ""} ${student?.currentSubLevelId?.name ? `(${student.currentSubLevelId.name})` : ""}`.trim();
    const subtitleText = levelTag ? `${studentDisplayName} · ${levelTag}` : studentDisplayName;

    return (
        <OrangeButton
            isOpen={true}
            onClose={onClose}
            panelTitle="Assign New Task"
            panelSubtitle={subtitleText}
            showFooter={true}
            customFooter={
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-5 py-2 sm:py-2.5 border border-gray-200 text-gray-700 bg-white hover:bg-slate-50 hover:border-gray-400 font-bold tracking-wider uppercase text-xs sm:text-sm rounded-xl transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer inline-flex items-center justify-center shrink-0"
                    >
                        <span>Cancel</span>
                    </button>
                    <button
                        type="submit"
                        form="assign-task-form"
                        disabled={isLoading}
                        className="w-full sm:w-auto px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold tracking-wider uppercase text-white bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 rounded-xl transition-all duration-200 active:scale-[0.97] inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-xs hover:shadow-md cursor-pointer shrink-0"
                    >
                        {isLoading ? (
                            "Assigning..."
                        ) : (
                            <>
                                <MdAdd size={16} />
                                <span>Assign Task</span>
                            </>
                        )}
                    </button>
                </div>
            }
            drawerContent={
                <form id="assign-task-form" onSubmit={handleSubmit} className="space-y-4 pb-2">
                    <div>
                        <label className={labelCls}>
                            Task Title <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            className={inputCls}
                            value={form.title}
                            onChange={set("title")}
                            placeholder="Enter task title..."
                            required
                        />
                    </div>

                    <div>
                        <label className={labelCls}>
                            Description <span className="text-slate-400 normal-case font-normal">(optional)</span>
                        </label>
                        <textarea
                            className={`${inputCls} resize-none`}
                            rows={3}
                            value={form.description}
                            onChange={set("description")}
                            placeholder="Task description, instructions or guidelines..."
                        />
                    </div>

                    <div>
                        <label className={labelCls}>
                            Subject <span className="text-slate-400 normal-case font-normal">(optional)</span>
                        </label>
                        <SelectDropdown
                            value={form.subjectName}
                            onChange={(val) => setForm((p) => ({ ...p, subjectName: val }))}
                            options={subjectOptions}
                            placeholder="Select Subject"
                            buttonClassName={selectBtnCls}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className={labelCls}>Task Type</label>
                            <SelectDropdown
                                value={form.type}
                                onChange={(val) => setForm((p) => ({ ...p, type: val }))}
                                options={TASK_TYPE_OPTIONS}
                                placeholder="Select Type"
                                buttonClassName={selectBtnCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Priority</label>
                            <SelectDropdown
                                value={form.priority}
                                onChange={(val) => setForm((p) => ({ ...p, priority: val }))}
                                options={PRIORITY_OPTIONS}
                                placeholder="Select Priority"
                                buttonClassName={selectBtnCls}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className={labelCls}>Max Marks (Max 5)</label>
                            <input
                                type="number"
                                min={1}
                                max={5}
                                className={inputCls}
                                value={form.maxMarks}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "") {
                                        setForm(p => ({ ...p, maxMarks: "" }));
                                        return;
                                    }
                                    setForm(p => ({ ...p, maxMarks: Math.min(5, Math.max(1, Number(val))) }));
                                }}
                                placeholder="5"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Time (Days)</label>
                            <input
                                type="text"
                                className={inputCls}
                                value={form.timeDays}
                                onChange={set("timeDays")}
                                placeholder="e.g. 3 or 3 days"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className={labelCls}>Due Date</label>
                            <input
                                type="date"
                                className={inputCls}
                                value={form.dueDate}
                                onChange={set("dueDate")}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>
                                Measurable Points <span className="text-slate-400 normal-case font-normal">(optional)</span>
                            </label>
                            <input
                                type="text"
                                className={inputCls}
                                value={form.measurablePoints}
                                onChange={set("measurablePoints")}
                                placeholder="e.g. Accuracy, code quality"
                            />
                        </div>
                    </div>
                </form>
            }
        />
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const StudentTaskBoard = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const sidebarContext = useSidebar();
    const openMobileSidebar = sidebarContext?.openMobileSidebar;

    const { student, level, subdepartment, subLevel } = location.state || {};

    const studentId = student?._id || student?.id || null;
    const studentName = `${student?.firstName || ""} ${student?.lastName || ""}`.trim() || "Student";
    const levelName = level?.name || student?.currentLevelId?.name || "Level";
    const subLevelName = subLevel?.name || student?.currentSubLevelId?.name || "";

    const [selectedSubLevelId, setSelectedSubLevelId] = useState(null);
    const [showPreviousDropdown, setShowPreviousDropdown] = useState(false);
    const [search, setSearch] = usePersistentState(`taskboard_search_${student?._id || "all"}`, "");
    const [subjectFilter, setSubjectFilter] = usePersistentState(`taskboard_subject_${student?._id || "all"}`, "");
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [tasks, setTasks] = useState(null);
    const [dragTask, setDragTask] = useState(null);
    const [dragOver, setDragOver] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showExtraModal, setShowExtraModal] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [deletingTask, setDeletingTask] = useState(false);
    const [deleteStudentTaskMutation] = useDeleteStudentTaskMutation();
    const [activeMobileTab, setActiveMobileTab] = useState("all");
    const [showNotifications, setShowNotifications] = useState(false);

    // Multi-select & bulk shift state
    const [selectedTaskIds, setSelectedTaskIds] = useState([]);
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [showBulkCompleteModal, setShowBulkCompleteModal] = useState(false);
    const [individualMarks, setIndividualMarks] = useState({});
    const [bulkNotes, setBulkNotes] = useState("");

    const { data: boardNotifsData } = useGetNotificationsQuery(
        studentId ? { studentId } : undefined,
        { skip: !studentId, pollingInterval: 20000, refetchOnMountOrArgChange: true }
    );
    const boardNotifCount = boardNotifsData?.data?.length || 0;

    useEffect(() => {
        setTasks(null);
        setSelectedSubLevelId(null);
        setSelectedTaskIds([]);
    }, [student?._id]);

    const studentStatus = (student?.status || "").toLowerCase();
    const isDummy = studentStatus === "dummy";
    const isDropped = studentStatus === "dropped";
    const isInactive = isDummy || isDropped;

    const { data: levelHistoryData } = useGetStudentLevelHistoryQuery(
        student?._id,
        { skip: !student?._id || isInactive }
    );

    const { data, isLoading, refetch } = useGetNewStudentTasksQuery(
        { id: student?._id, subLevelId: selectedSubLevelId || undefined },
        { skip: !student?._id || isInactive }
    );

    const levelHistory = levelHistoryData?.data || [];
    const currentSubLevelIdStr = (student?.currentSubLevelId?._id || student?.currentSubLevelId)?.toString();

    // Identify previous levels: any sublevel in history that is not the current active sublevel
    const previousLevels = useMemo(() => {
        return levelHistory.filter(h => {
            const hSubId = (h.subLevelId?._id || h.subLevelId)?.toString();
            return hSubId && hSubId !== currentSubLevelIdStr;
        });
    }, [levelHistory, currentSubLevelIdStr]);

    const isViewingPrevious = Boolean(selectedSubLevelId);

    // Selected level record when viewing previous
    const selectedLevelInfo = useMemo(() => {
        if (!selectedSubLevelId) return null;
        return levelHistory.find(h => {
            const hSubId = (h.subLevelId?._id || h.subLevelId)?.toString();
            return hSubId === selectedSubLevelId.toString();
        });
    }, [selectedSubLevelId, levelHistory]);

    const activeLevelName = isViewingPrevious
        ? (selectedLevelInfo?.levelId?.name || "Previous Level")
        : levelName;
    const activeSubLevelName = isViewingPrevious
        ? (selectedLevelInfo?.subLevelId?.name || "")
        : subLevelName;

    const handleSelectSubLevel = (subId) => {
        setSelectedSubLevelId(subId);
        setTasks(null);
        setSelectedTaskIds([]);
        setShowPreviousDropdown(false);
        setSubjectFilter("");
    };

    const allTasks = tasks
        ?? Object.values(data?.groupedBySubject || {}).flatMap(g => g.tasks || []);

    // Sort allTasks in ascending upload / assignment order (first row = #1)
    const sortedTasks = useMemo(() => {
        return sortTasksAscending(allTasks);
    }, [allTasks]);

    // Assign sequential serial numbers in ascending Excel / creation order
    const tasksWithSno = useMemo(() => {
        return sortedTasks.map((t, idx) => ({
            ...t,
            sno: idx + 1
        }));
    }, [sortedTasks]);

    // Extract unique clean subject names directly from allTasks and groups
    const subjectsFromGroups = Object.keys(data?.groupedBySubject || {}).map(k => k.replace(/\s*\([^)]*\)$/, '').trim());
    const subjects = Array.from(new Set([
        ...allTasks.map(t => t.subjectName?.trim()).filter(Boolean),
        ...subjectsFromGroups.filter(Boolean)
    ])).sort((a, b) => a.localeCompare(b));

    // Calculate count of tasks per subject for display in filter dropdown
    const subjectTaskCounts = useMemo(() => {
        const counts = {};
        allTasks.forEach(t => {
            const sName = t.subjectName?.trim();
            if (sName) {
                counts[sName] = (counts[sName] || 0) + 1;
            }
        });
        return counts;
    }, [allTasks]);

    const filtered = useMemo(() => {
        return tasksWithSno.filter(t => {
            const matchSearch = !search ||
                t.title?.toLowerCase().includes(search.toLowerCase()) ||
                t.subjectName?.toLowerCase().includes(search.toLowerCase()) ||
                t.topicName?.toLowerCase().includes(search.toLowerCase());

            const taskSubName = t.subjectName?.trim().toLowerCase() || "";
            const filterSubName = subjectFilter?.trim().toLowerCase() || "";

            const matchSubject = !subjectFilter || (
                taskSubName === filterSubName ||
                (taskSubName && filterSubName && filterSubName.startsWith(taskSubName)) ||
                (taskSubName && filterSubName && taskSubName.startsWith(filterSubName))
            );
            return matchSearch && matchSubject;
        });
    }, [tasksWithSno, search, subjectFilter]);

    const activeBoardChips = useMemo(() => {
        const chips = [];
        if (subjectFilter) {
            chips.push({
                key: "subject",
                label: "Subject",
                value: subjectFilter,
                displayValue: subjectFilter,
                onRemove: () => setSubjectFilter(""),
            });
        }
        if (search) {
            chips.push({
                key: "search",
                label: "Search",
                value: search,
                displayValue: `"${search}"`,
                onRemove: () => setSearch(""),
            });
        }
        return chips;
    }, [subjectFilter, search]);

    const byStatus = useMemo(() => ({
        pending: filtered.filter(t => t.status === "pending" || !t.status),
        inProgress: filtered.filter(t => t.status === "inProgress"),
        completed: filtered.filter(t => t.status === "completed"),
    }), [filtered]);

    const total = filtered.length;
    const completed = filtered.filter(t => t.status === "completed").length;
    const inProgressCount = filtered.filter(t => t.status === "inProgress").length;
    const pendingCount = filtered.filter(t => t.status === "pending" || !t.status).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const handleDragStart = (task) => setDragTask(task);

    const handleDragOver = (e, colKey) => {
        e.preventDefault();
        setDragOver(colKey);
    };

    const handleDrop = (e, targetStatus) => {
        e.preventDefault();
        setDragOver(null);
        if (!dragTask || dragTask.status === targetStatus) { setDragTask(null); return; }

        if (targetStatus === "completed" && (dragTask.marks === null || dragTask.marks === undefined)) {
            toast.error("Please rate/mark the task before completing it!");
            setDragTask(null);
            return;
        }
        const finalMarks = targetStatus === "pending"
            ? null
            : dragTask.marks;

        applyStatusChange(dragTask, targetStatus, { marks: finalMarks });
        setDragTask(null);
    };

    const applyStatusChange = async (task, newStatus, extra) => {
        const studentId = student._id;
        const taskId = task.taskId || task._id;

        const mongoIdRegex = /^[a-f\d]{24}$/i;
        if (!mongoIdRegex.test(studentId) || !mongoIdRegex.test(taskId)) {
            toast.error("Invalid task or student ID");
            return;
        }

        const oldStatus = task.status || "pending";
        const hasStatusChanged = oldStatus !== newStatus;

        const updated = allTasks.map(t =>
            t._id === task._id ? { ...t, status: newStatus, ...extra } : t
        );
        setTasks(updated);

        setSaving(true);
        try {
            const body = { status: newStatus, ...extra };
            const url = `${API_BASE_URL}/syllabus/versions/students/${studentId}/tasks/${taskId}`;

            const r = await fetch(url, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify(body)
            });

            if (!r.ok) {
                const errData = await r.json();
                throw new Error(errData.message || "Update failed");
            }

            if (hasStatusChanged) {
                const statusLabel =
                    newStatus === "inProgress"
                        ? "In Progress"
                        : newStatus === "completed"
                        ? "Completed"
                        : "Pending";
                toast.success(`Task moved to ${statusLabel}`);
            }
            await refetch();
        } catch (err) {
            toast.error(err.message || "Failed to update task");
            refetch();
            setTasks(null);
        } finally {
            setSaving(false);
        }
    };

    // ── Multi-Select Helpers ───────────────────────────────────────────────────
    const handleToggleSelectTask = (taskId) => {
        setSelectedTaskIds(prev =>
            prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
        );
    };

    const isColumnFullySelected = (colKey) => {
        const colTasks = byStatus[colKey] || [];
        if (colTasks.length === 0) return false;
        return colTasks.every(t => selectedTaskIds.includes(t._id));
    };

    const isColumnPartiallySelected = (colKey) => {
        const colTasks = byStatus[colKey] || [];
        if (colTasks.length === 0) return false;
        const selectedCount = colTasks.filter(t => selectedTaskIds.includes(t._id)).length;
        return selectedCount > 0 && selectedCount < colTasks.length;
    };

    const handleToggleColumnSelection = (colKey) => {
        const colTasks = byStatus[colKey] || [];
        if (colTasks.length === 0) return;
        const colTaskIds = colTasks.map(t => t._id);
        const allSelected = colTaskIds.every(id => selectedTaskIds.includes(id));

        if (allSelected) {
            setSelectedTaskIds(prev => prev.filter(id => !colTaskIds.includes(id)));
        } else {
            setSelectedTaskIds(prev => {
                const next = new Set([...prev, ...colTaskIds]);
                return Array.from(next);
            });
        }
    };

    const handleSelectAllFiltered = () => {
        const filteredIds = filtered.map(t => t._id);
        const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedTaskIds.includes(id));
        if (allSelected) {
            setSelectedTaskIds([]);
        } else {
            setSelectedTaskIds(filteredIds);
        }
    };

    const handleDeselectAll = () => {
        setSelectedTaskIds([]);
    };

    const selectedTasksList = useMemo(() => {
        const list = tasks || allTasks;
        return list.filter(t => selectedTaskIds.includes(t._id));
    }, [tasks, allTasks, selectedTaskIds]);

    const unratedTasksCount = useMemo(() => {
        return selectedTasksList.filter(t => {
            const mark = individualMarks[t._id] !== undefined ? individualMarks[t._id] : t.marks;
            return mark === null || mark === undefined || mark <= 0;
        }).length;
    }, [selectedTasksList, individualMarks]);

    const allTasksRated = selectedTasksList.length > 0 && unratedTasksCount === 0;

    const handleOpenBulkCompleteModal = () => {
        const currentList = tasks || allTasks;
        const initialMarks = {};
        selectedTaskIds.forEach(id => {
            const t = currentList.find(x => x._id === id);
            if (t && t.marks !== null && t.marks !== undefined) {
                initialMarks[id] = t.marks;
            }
        });
        setIndividualMarks(initialMarks);
        setShowBulkCompleteModal(true);
    };

    // ── Bulk Shift Tasks ───────────────────────────────────────────────────────
    const executeBulkShift = async (targetStatus, marksMapOverride, notes) => {
        if (!studentId || selectedTaskIds.length === 0) return;

        const count = selectedTaskIds.length;
        const statusLabel =
            targetStatus === "inProgress"
                ? "In Progress"
                : targetStatus === "completed"
                ? "Completed"
                : "Pending";

        const prevTasks = tasks || allTasks;

        // Effective marks map for completed status
        const effectiveMarksMap = {};
        if (targetStatus === "completed") {
            const currentMarksMap = marksMapOverride || individualMarks;
            for (const id of selectedTaskIds) {
                const t = prevTasks.find(x => x._id === id);
                const mark = currentMarksMap[id] !== undefined ? currentMarksMap[id] : t?.marks;
                if (mark === null || mark === undefined || mark <= 0) {
                    toast.error("Please assign individual marks to all selected tasks before completing!");
                    return;
                }
                effectiveMarksMap[id] = mark;
            }
        }

        setBulkUpdating(true);

        const updated = prevTasks.map(t => {
            if (!selectedTaskIds.includes(t._id)) return t;
            let finalMarks;
            if (targetStatus === "pending") {
                finalMarks = null;
            } else if (targetStatus === "completed") {
                finalMarks = effectiveMarksMap[t._id];
            } else {
                finalMarks = t.marks;
            }

            return {
                ...t,
                status: targetStatus,
                marks: finalMarks,
                notes: notes !== undefined ? notes : t.notes
            };
        });
        setTasks(updated);

        try {
            const body = {
                taskIds: selectedTaskIds,
                status: targetStatus,
                taskMarksMap: targetStatus === "completed" ? effectiveMarksMap : undefined,
                notes
            };
            const url = `${API_BASE_URL}/syllabus/versions/students/${studentId}/tasks-bulk`;
            const r = await fetch(url, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify(body)
            });

            if (!r.ok) {
                const errData = await r.json().catch(() => ({}));
                throw new Error(errData.message || "Failed to shift tasks in bulk");
            }

            toast.success(`Successfully shifted ${count} task${count > 1 ? "s" : ""} to ${statusLabel}!`);
            setSelectedTaskIds([]);
            setShowBulkCompleteModal(false);
            setIndividualMarks({});
            setBulkNotes("");
            await refetch();
        } catch (err) {
            toast.error(err.message || "Bulk status shift failed");
            setTasks(prevTasks);
            refetch();
        } finally {
            setBulkUpdating(false);
        }
    };

    const confirmDeleteTask = async (task) => {
        if (!task || !studentId) return;
        setDeletingTask(true);
        try {
            const targetTaskId = task._id || task.taskId;
            await deleteStudentTaskMutation({
                studentId,
                taskId: targetTaskId
            }).unwrap();

            // Optimistically update local tasks state
            setTasks(prev => {
                const base = prev || allTasks;
                return base.filter(t => t._id !== task._id);
            });

            toast.success("Task removed from student's board successfully!");
            setTaskToDelete(null);
            await refetch();
        } catch (err) {
            toast.error(err?.data?.message || err?.message || "Failed to delete task");
        } finally {
            setDeletingTask(false);
        }
    };

    if (!student) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-3">
                    <MdArrowBack size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-800">No Student Data Found</h3>
                <p className="text-slate-400 text-xs mt-1 max-w-xs">Please access the task board from the student profile or student details table.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                    Go Back
                </button>
            </div>
        );
    }

    if (isInactive) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
                <div className={`bg-white rounded-3xl p-8 max-w-md w-full border shadow-xl space-y-4 ${isDropped ? "border-rose-200" : "border-amber-200"}`}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black ${isDropped ? "bg-rose-50 text-rose-500" : "bg-amber-50 text-amber-500"}`}>
                        ⚠️
                    </div>
                    <div>
                        <h3 className="text-lg font-extrabold text-slate-800">Task Board Disabled</h3>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                            <strong className="text-slate-800">{studentName}</strong> is currently marked as{" "}
                            <strong className={isDropped ? "text-rose-600 font-black" : "text-amber-600 font-black"}>
                                {isDropped ? "Dropped" : "Dummy (Non-Attending)"}
                            </strong>.
                            Task Board is not accessible for {isDropped ? "dropped" : "dummy"} students. Reactivate or return student to an active level to enable the task board.
                        </p>
                    </div>
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition shadow-xs cursor-pointer inline-flex items-center justify-center gap-2"
                        >
                            <MdArrowBack size={16} /> Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const initials = studentName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

    const mobileTabs = [
        { key: "all", label: "All", count: filtered.length },
        { key: "pending", label: "Pending", count: byStatus.pending.length, dot: "bg-slate-400" },
        { key: "inProgress", label: "In Progress", count: byStatus.inProgress.length, dot: "bg-amber-500" },
        { key: "completed", label: "Completed", count: byStatus.completed.length, dot: "bg-emerald-500" },
    ];

    return (
        <>
            {/* Modals */}
            {showExtraModal && (
                <ExtraTaskModal
                    student={student}
                    selectedSubLevelId={selectedSubLevelId}
                    selectedLevelInfo={selectedLevelInfo}
                    defaultSubjects={subjects}
                    onClose={() => setShowExtraModal(false)}
                    onSuccess={() => { setShowExtraModal(false); refetch(); }}
                />
            )}

            {/* TOP NAVIGATION & SEARCH BAR */}
            <div className="sticky top-0 z-20 bg-[#F8F9FA] py-2 sm:py-3 px-3 sm:px-6 lg:px-8 border-b border-slate-200/80 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-xs">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {/* Back Button */}
                        <button
                            onClick={() => navigate(-1)}
                            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-orange-500 hover:border-orange-200 hover:bg-orange-50/50 shadow-xs transition shrink-0 cursor-pointer"
                            title="Go Back"
                            aria-label="Go Back"
                        >
                            <MdArrowBack size={18} />
                        </button>

                        {/* Mobile Sidebar Hamburger Toggle */}
                        {openMobileSidebar && (
                            <button
                                onClick={openMobileSidebar}
                                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-orange-500 hover:bg-orange-50/50 shadow-xs transition shrink-0 cursor-pointer"
                                title="Open Sidebar"
                                aria-label="Open Sidebar"
                            >
                                <Menu size={18} />
                            </button>
                        )}

                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                                    {studentName ? `${studentName} — Task Board` : "Task Board"}
                                </h1>
                            </div>
                        </div>
                    </div>

                    {/* Notifications Button on Mobile */}
                    <div className="flex items-center gap-2 sm:hidden">
                        <button
                            type="button"
                            onClick={() => setShowNotifications(true)}
                            className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-500 hover:border-orange-300 shadow-xs relative shrink-0 cursor-pointer active:scale-95"
                            title="Notifications & Alerts"
                        >
                            <MdNotificationsNone size={18} />
                            {boardNotifCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-2xs">
                                    {boardNotifCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Search Bar & Desktop Notification */}
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <div className="flex items-center h-9 sm:h-10 w-full sm:w-72 lg:w-80 bg-white border border-slate-200 rounded-xl px-3 shadow-xs hover:border-slate-300 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-400/20 transition-all">
                        <MdSearch className="text-slate-400 shrink-0 mr-2" size={17} />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search tasks..."
                            className="w-full h-full bg-transparent border-none outline-none ring-0 focus:ring-0 text-xs font-medium text-slate-800 placeholder-slate-400 p-0 shadow-none"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                            >
                                <MdClose size={14} />
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowNotifications(true)}
                        className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-500 hover:border-orange-300 shadow-xs transition relative shrink-0 cursor-pointer active:scale-95"
                        title="Notifications & Alerts"
                    >
                        <MdNotificationsNone size={19} />
                        {boardNotifCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-2xs">
                                {boardNotifCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            <div className="min-h-screen bg-[#F8F9FA] px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6">
                {/* BREADCRUMB & HEADER CONTAINER */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs p-3.5 sm:p-5 md:p-6 space-y-3 sm:space-y-4">
                    {/* Breadcrumb Row */}
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-slate-400 flex-wrap">
                        <span className="text-slate-500">Student Record</span>
                        <span>/</span>
                        <span className="text-slate-600 font-bold truncate max-w-[150px] sm:max-w-none">{studentName}</span>
                        <span>/</span>
                        <span className="text-slate-900 font-black">Task Board</span>
                        {isViewingPrevious && (
                            <>
                                <span>/</span>
                                <span className="text-amber-600 font-extrabold">{activeLevelName} {activeSubLevelName ? `(${activeSubLevelName})` : ""}</span>
                            </>
                        )}
                    </div>

                    {/* Student Tag Line */}
                    <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold text-xs flex items-center justify-center border border-orange-200 shrink-0">
                            {initials}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-extrabold flex-wrap">
                            <span className="text-slate-900">{studentName}</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-500">
                                {student.course || "Course"} {activeLevelName ? `- ${activeLevelName}` : ""} {activeSubLevelName ? `(${activeSubLevelName})` : ""}
                            </span>
                            {isViewingPrevious ? (
                                <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] px-2.5 py-0.5 rounded-full uppercase font-black">
                                    PREVIOUS LEVEL
                                </span>
                            ) : (
                                <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] px-2.5 py-0.5 rounded-full uppercase font-black">
                                    ACTIVE
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Title & Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100/70">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Task Board</h2>
                                {saving && (
                                    <span className="text-[10px] font-bold text-orange-500 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full animate-pulse">
                                        Saving...
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] sm:text-xs text-slate-400 font-medium">Manage and track student assignments & evaluations</p>
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                            {/* Previous Tasks Dropdown */}
                            <div className="relative flex-1 sm:flex-initial">
                                <button
                                    type="button"
                                    onClick={() => setShowPreviousDropdown(p => !p)}
                                    className={`w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 font-bold px-3 sm:px-4 py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer border ${isViewingPrevious
                                            ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100/70"
                                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                                        }`}
                                    title="View previous tasks by level"
                                >
                                    <MdHistory size={16} className={isViewingPrevious ? "text-amber-600" : "text-slate-500"} />
                                    <span className="truncate max-w-[130px] sm:max-w-none">
                                        {isViewingPrevious
                                            ? `Previous: ${activeSubLevelName ? `${activeLevelName} (${activeSubLevelName})` : activeLevelName}`
                                            : "Previous Tasks"}
                                    </span>
                                    {isViewingPrevious ? (
                                        <span
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelectSubLevel(null);
                                            }}
                                            className="ml-0.5 hover:bg-amber-200/80 p-0.5 rounded-full text-amber-700 cursor-pointer"
                                            title="Back to current level"
                                        >
                                            <MdClose size={13} />
                                        </span>
                                    ) : (
                                        previousLevels.length > 0 && (
                                            <span className="text-[10px] font-extrabold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full">
                                                {previousLevels.length}
                                            </span>
                                        )
                                    )}
                                    <MdExpandMore size={15} className={`transition-transform duration-200 opacity-60 ${showPreviousDropdown ? "rotate-180" : ""}`} />
                                </button>

                                {showPreviousDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-20" onClick={() => setShowPreviousDropdown(false)} />
                                        <div className="absolute right-0 top-11 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl w-72 max-w-[calc(100vw-2rem)] py-2 text-slate-700 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100">
                                            <div className="px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                                Select Level / Tasks
                                            </div>

                                            {/* Current Level Option */}
                                            <button
                                                type="button"
                                                onClick={() => handleSelectSubLevel(null)}
                                                className={`w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 cursor-pointer text-left transition ${!isViewingPrevious ? "bg-orange-50/60 text-orange-700 font-bold" : "text-slate-800"
                                                    }`}
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="truncate font-bold text-slate-900">
                                                            {levelName} {subLevelName ? `(${subLevelName})` : ""}
                                                        </span>
                                                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700">
                                                            Current
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 block mt-0.5">
                                                        Active Level Tasks
                                                    </span>
                                                </div>
                                                {!isViewingPrevious && <MdCheck size={16} className="text-orange-500 shrink-0" />}
                                            </button>

                                            {/* Previous Levels Section */}
                                            <div className="px-3.5 pt-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-t border-slate-100 flex items-center justify-between">
                                                <span>Previous Levels</span>
                                                <span className="text-[9px] font-bold text-slate-400">
                                                    {previousLevels.length} available
                                                </span>
                                            </div>

                                            {previousLevels.length === 0 ? (
                                                <div className="px-4 py-3 text-center text-xs text-slate-400 italic font-medium">
                                                    No previous levels for this student
                                                </div>
                                            ) : (
                                                <div className="max-h-60 overflow-y-auto no-scrollbar py-0.5">
                                                    {previousLevels.map(h => {
                                                        const subId = (h.subLevelId?._id || h.subLevelId)?.toString();
                                                        const isSelected = selectedSubLevelId === subId;
                                                        const lName = h.levelId?.name || "Level";
                                                        const slName = h.subLevelId?.name || "";
                                                        const pct = h.totalTasks > 0
                                                            ? Math.round(((h.completedTasksCount || 0) / h.totalTasks) * 100)
                                                            : (h.completionPercentage ?? 100);

                                                        return (
                                                            <button
                                                                key={h._id || subId}
                                                                type="button"
                                                                onClick={() => handleSelectSubLevel(subId)}
                                                                className={`w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 cursor-pointer text-left transition ${isSelected ? "bg-amber-50 text-amber-900 font-bold" : "text-slate-800"
                                                                    }`}
                                                            >
                                                                <div className="min-w-0 pr-2">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <span className="font-bold text-slate-900">
                                                                            {lName} {slName ? `— ${slName}` : ""}
                                                                        </span>
                                                                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                                                                            {h.status === "completed" ? "Completed" : "Previous"}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                                                                        {h.completedTasksCount ?? 0} of {h.totalTasks ?? 0} Tasks • {pct}%
                                                                    </span>
                                                                </div>
                                                                {isSelected && <MdCheck size={16} className="text-amber-600 shrink-0" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* + New Task Button */}
                            <button
                                onClick={() => setShowExtraModal(true)}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold px-3 sm:px-4 py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer"
                            >
                                <MdAdd size={16} /> <span>New Task</span>
                            </button>

                            {/* Filter Button / Subject Dropdown */}
                            <div className="relative flex-1 sm:flex-initial">
                                <button
                                    onClick={() => setShowFilterDrawer(p => !p)}
                                    className={`w-full flex items-center justify-center gap-1.5 sm:gap-2 border font-bold px-3 sm:px-4 py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer ${subjectFilter
                                            ? "bg-orange-50 border-orange-300 text-orange-600"
                                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                        }`}
                                >
                                    <MdFilterList size={16} />
                                    <span className="truncate max-w-[110px] sm:max-w-none">{subjectFilter || "Filter"}</span>
                                    {subjectFilter && (
                                        <span
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSubjectFilter("");
                                            }}
                                            className="ml-0.5 hover:bg-orange-200/70 p-0.5 rounded-full"
                                            title="Clear filter"
                                        >
                                            <MdClose size={13} />
                                        </span>
                                    )}
                                </button>
                                {showFilterDrawer && (
                                    <>
                                        <div className="fixed inset-0 z-20" onClick={() => setShowFilterDrawer(false)} />
                                        <div className="absolute right-0 top-11 z-30 bg-white border border-slate-100 rounded-2xl shadow-xl w-60 max-w-[calc(100vw-2rem)] py-2 text-slate-700 text-xs font-semibold">
                                            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Filter by Subject</div>
                                            <button
                                                onClick={() => { setSubjectFilter(""); setShowFilterDrawer(false); }}
                                                className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 cursor-pointer ${!subjectFilter ? "text-orange-500 font-bold bg-orange-50/50" : ""}`}
                                            >
                                                <span>All Subjects</span>
                                                <span className="text-[10px] font-extrabold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                                    {allTasks.length}
                                                </span>
                                            </button>
                                            {subjects.map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => { setSubjectFilter(s); setShowFilterDrawer(false); }}
                                                    className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 cursor-pointer ${subjectFilter === s ? "text-orange-500 font-bold bg-orange-50/50" : ""}`}
                                                >
                                                    <span className="truncate">{s}</span>
                                                    {subjectTaskCounts[s] !== undefined && (
                                                        <span className="text-[10px] font-extrabold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full ml-2">
                                                            {subjectTaskCounts[s]}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Progress Stats Summary Banner */}
                    <div className="pt-2 sm:pt-3 border-t border-slate-100/70">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-2.5">
                            <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Tasks</span>
                                <span className="text-base sm:text-lg font-black text-slate-800">{total}</span>
                            </div>
                            <div className="bg-amber-50/60 rounded-xl p-2.5 border border-amber-100/80">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Pending</span>
                                <span className="text-base sm:text-lg font-black text-amber-700">{pendingCount}</span>
                            </div>
                            <div className="bg-orange-50/60 rounded-xl p-2.5 border border-orange-100/80">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 block">In Progress</span>
                                <span className="text-base sm:text-lg font-black text-orange-700">{inProgressCount}</span>
                            </div>
                            <div className="bg-emerald-50/60 rounded-xl p-2.5 border border-emerald-100/80">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Completed</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-base sm:text-lg font-black text-emerald-700">{completed}</span>
                                    <span className="text-[10px] font-bold text-emerald-600">({percent}%)</span>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                            <div
                                className="bg-emerald-500 h-full transition-all duration-300"
                                style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                                title={`Completed: ${completed}`}
                            />
                            <div
                                className="bg-orange-500 h-full transition-all duration-300"
                                style={{ width: `${total > 0 ? (inProgressCount / total) * 100 : 0}%` }}
                                title={`In Progress: ${inProgressCount}`}
                            />
                            <div
                                className="bg-slate-300 h-full transition-all duration-300"
                                style={{ width: `${total > 0 ? (pendingCount / total) * 100 : 0}%` }}
                                title={`Pending: ${pendingCount}`}
                            />
                        </div>
                    </div>
                </div>

                {/* Active Filter Chips */}
                <ActiveFilterChips
                    chips={activeBoardChips}
                    onClearAll={() => {
                        setSubjectFilter("");
                        setSearch("");
                    }}
                    className="mb-2"
                />

                {/* KANBAN BOARD 3 COLUMNS */}
                {isLoading ? (
                    <div className="flex justify-center pt-20"><Loader /></div>
                ) : (
                    <div className="space-y-3.5 sm:space-y-4">
                        {/* Previous Level Alert Banner */}
                        {isViewingPrevious && (
                            <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/90 border border-amber-200/90 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                                        <MdHistory size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-xs sm:text-sm font-extrabold text-amber-950">
                                                Viewing Previous Level: {activeLevelName} {activeSubLevelName ? `(${activeSubLevelName})` : ""}
                                            </h3>
                                            <span className="bg-amber-100 text-amber-800 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                Archive Record
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-amber-800/80 font-medium mt-0.5">
                                            Displaying historical tasks, evaluation scores, and markings recorded for this level.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleSelectSubLevel(null)}
                                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-100/80 hover:border-amber-400 transition shadow-2xs self-start sm:self-auto cursor-pointer shrink-0"
                                >
                                    <MdArrowBack size={14} />
                                    <span>Back to Current Level ({subLevelName || "Current"})</span>
                                </button>
                            </div>
                        )}
                        {/* Mobile Status Tabs (md:hidden) */}
                        <div className="md:hidden">
                            <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-2xl overflow-x-auto no-scrollbar">
                                {mobileTabs.map(tab => {
                                    const isActive = activeMobileTab === tab.key;
                                    return (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            onClick={() => setActiveMobileTab(tab.key)}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${isActive
                                                    ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80"
                                                    : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                                                }`}
                                        >
                                            {tab.dot && <span className={`w-2 h-2 rounded-full ${tab.dot}`} />}
                                            <span>{tab.label}</span>
                                            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${isActive ? "bg-orange-100 text-orange-700" : "bg-slate-300/60 text-slate-600"
                                                }`}>
                                                {tab.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                            {STATUS_COLUMNS.map(col => {
                                const isHiddenOnMobile = activeMobileTab !== "all" && activeMobileTab !== col.key;
                                return (
                                    <div
                                        key={col.key}
                                        onDragOver={e => handleDragOver(e, col.key)}
                                        onDragLeave={() => setDragOver(null)}
                                        onDrop={e => handleDrop(e, col.key)}
                                        className={`space-y-3 sm:space-y-4 rounded-2xl sm:rounded-3xl p-2 sm:p-2.5 transition-all duration-200 ${isHiddenOnMobile ? "hidden md:block" : "block"
                                            } ${dragOver === col.key ? "ring-2 ring-orange-400 bg-orange-50/50" : "bg-slate-100/40"
                                            }`}
                                    >
                                        {/* Column Header */}
                                        <div className="flex items-center justify-between px-2 py-1">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleColumnSelection(col.key)}
                                                    disabled={byStatus[col.key].length === 0}
                                                    className={`w-4 h-4 rounded-[5px] flex items-center justify-center transition-all duration-150 shrink-0 border cursor-pointer ${
                                                        isColumnFullySelected(col.key)
                                                            ? "bg-orange-500 border-orange-500 text-white shadow-2xs"
                                                            : isColumnPartiallySelected(col.key)
                                                            ? "bg-orange-100 border-orange-400 text-orange-600"
                                                            : "bg-white border-slate-300 hover:border-slate-400 text-transparent"
                                                    } ${byStatus[col.key].length === 0 ? "opacity-30 cursor-not-allowed" : ""}`}
                                                    title={
                                                        isColumnFullySelected(col.key)
                                                            ? `Deselect all ${col.label} tasks`
                                                            : `Select all ${col.label} tasks`
                                                    }
                                                    aria-label={`Select all ${col.label} tasks`}
                                                >
                                                    {isColumnFullySelected(col.key) ? (
                                                        <MdCheck size={12} />
                                                    ) : isColumnPartiallySelected(col.key) ? (
                                                        <span className="w-2 h-0.5 bg-orange-600 rounded-full" />
                                                    ) : null}
                                                </button>
                                                <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                                                <h3 className="text-sm font-black text-slate-900">{col.label}</h3>
                                                <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${col.badgeBg}`}>
                                                    {byStatus[col.key].length}
                                                </span>
                                            </div>
                                            {byStatus[col.key].length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleColumnSelection(col.key)}
                                                    className="text-[10.5px] font-bold text-slate-400 hover:text-orange-600 px-1.5 py-0.5 rounded hover:bg-orange-50/70 transition cursor-pointer"
                                                >
                                                    {isColumnFullySelected(col.key) ? "Deselect" : "Select all"}
                                                </button>
                                            )}
                                        </div>

                                        {/* Task Cards List */}
                                        <div className="space-y-3 min-h-[160px] sm:min-h-[300px]">
                                            {byStatus[col.key].length === 0 ? (
                                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 sm:p-8 text-center bg-white/70">
                                                    <p className="text-xs font-bold text-slate-400">
                                                        {dragOver === col.key ? "Drop task here" : `No ${col.label.toLowerCase()} tasks`}
                                                    </p>
                                                </div>
                                            ) : (
                                                byStatus[col.key].map((task, colIdx) => (
                                                    <TaskCard
                                                        key={task._id}
                                                        task={task}
                                                        index={colIdx}
                                                        isSelected={selectedTaskIds.includes(task._id)}
                                                        onToggleSelect={handleToggleSelectTask}
                                                        onDragStart={handleDragStart}
                                                        onDeleteTask={(t) => setTaskToDelete(t)}
                                                        onStatusChange={(t, st, extra = {}) => {
                                                            if (st === "completed" && (t.marks === null || t.marks === undefined) && extra.marks === undefined) {
                                                                toast.error("Please rate/mark the task before completing it!");
                                                                return;
                                                            }
                                                            const finalMarks = extra.marks !== undefined
                                                                ? extra.marks
                                                                : (st === "pending" ? null : t.marks);
                                                            applyStatusChange(t, st, { marks: finalMarks, ...extra });
                                                        }}
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
            <NotificationDrawer
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                studentId={studentId}
                title="Task Board Notifications"
                subtitle={`${studentName} • Practical task alerts & level status`}
            />

            {/* Floating Bulk Shift Action Bar */}
            {selectedTaskIds.length > 0 && (
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-3xl bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3 sm:px-5 sm:py-3.5 shadow-2xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                        <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0 font-black text-xs">
                                {selectedTaskIds.length}
                            </span>
                            <div>
                                <span className="text-xs sm:text-sm font-extrabold text-white">
                                    {selectedTaskIds.length} Task{selectedTaskIds.length > 1 ? "s" : ""} Selected
                                </span>
                                <span className="hidden sm:inline-block text-[11px] text-slate-400 font-medium ml-1.5">
                                    (of {filtered.length} visible)
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={handleSelectAllFiltered}
                                className="text-[11px] font-bold text-slate-300 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                            >
                                {selectedTaskIds.length === filtered.length ? "Deselect All" : "Select All"}
                            </button>
                            <button
                                type="button"
                                onClick={handleDeselectAll}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                                title="Clear selection"
                            >
                                <MdClose size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Shift Buttons */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 hidden sm:inline">
                            Shift to:
                        </span>

                        {/* Shift to Pending */}
                        <button
                            type="button"
                            disabled={bulkUpdating}
                            onClick={() => executeBulkShift("pending", null)}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition cursor-pointer disabled:opacity-50 shadow-xs"
                        >
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            <span>Pending</span>
                        </button>

                        {/* Shift to In Progress */}
                        <button
                            type="button"
                            disabled={bulkUpdating}
                            onClick={() => executeBulkShift("inProgress", undefined)}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition cursor-pointer disabled:opacity-50 shadow-xs"
                        >
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            <span>In Progress</span>
                        </button>

                        {/* Shift to Completed */}
                        <button
                            type="button"
                            disabled={bulkUpdating}
                            onClick={handleOpenBulkCompleteModal}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer disabled:opacity-50 shadow-xs"
                        >
                            <MdCheckCircle size={15} />
                            <span>Completed</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Bulk Complete Confirmation & Rating Modal */}
            {showBulkCompleteModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
                    onClick={() => !bulkUpdating && setShowBulkCompleteModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                                <MdVerified size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                                    Complete {selectedTaskIds.length} Task{selectedTaskIds.length > 1 ? "s" : ""} with Individual Marks
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                    Each task must have an individual evaluation score before moving to Completed.
                                </p>
                            </div>
                        </div>

                        {/* Rating Status & Quick Rate Banner */}
                        <div className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border flex-wrap text-xs font-bold transition-all ${
                            allTasksRated
                                ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                                : "bg-amber-50/70 border-amber-200 text-amber-900"
                        }`}>
                            <div className="flex items-center gap-1.5">
                                {allTasksRated ? (
                                    <>
                                        <MdCheckCircle size={16} className="text-emerald-600 shrink-0" />
                                        <span>All {selectedTasksList.length} tasks have individual marks assigned</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                                        <span>{unratedTasksCount} task{unratedTasksCount > 1 ? "s" : ""} require marks before completing</span>
                                    </>
                                )}
                            </div>

                            {/* Quick Preset for Unrated Tasks */}
                            {!allTasksRated && (
                                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                    <span>Quick rate:</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIndividualMarks(prev => {
                                                const next = { ...prev };
                                                selectedTasksList.forEach(t => {
                                                    const cur = next[t._id] !== undefined ? next[t._id] : t.marks;
                                                    if (!cur) next[t._id] = 4;
                                                });
                                                return next;
                                            });
                                        }}
                                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-orange-400 text-slate-700 hover:text-orange-600 transition cursor-pointer font-bold"
                                    >
                                        4 ★
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIndividualMarks(prev => {
                                                const next = { ...prev };
                                                selectedTasksList.forEach(t => {
                                                    const cur = next[t._id] !== undefined ? next[t._id] : t.marks;
                                                    if (!cur) next[t._id] = 5;
                                                });
                                                return next;
                                            });
                                        }}
                                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-orange-400 text-slate-700 hover:text-orange-600 transition cursor-pointer font-bold"
                                    >
                                        5 ★
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Individual Tasks List */}
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {selectedTasksList.map((t, idx) => {
                                const mark = individualMarks[t._id] !== undefined ? individualMarks[t._id] : (t.marks || null);
                                const maxMarks = Math.min(5, t.maxMarks || 5);
                                const isRated = mark !== null && mark !== undefined && mark > 0;

                                return (
                                    <div
                                        key={t._id}
                                        className={`p-3 rounded-xl border transition-colors duration-150 ${
                                            isRated
                                                ? "bg-slate-50/70 border-slate-200"
                                                : "bg-rose-50/40 border-rose-200/90"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="inline-flex items-center justify-center min-w-[20px] h-4.5 px-1 rounded bg-slate-900 text-white text-[9.5px] font-black shrink-0">
                                                        #{t.sno || idx + 1}
                                                    </span>
                                                    <h4 className="text-xs font-extrabold text-slate-800 truncate max-w-[280px]" title={t.title}>
                                                        {t.title}
                                                    </h4>
                                                </div>
                                                {t.subjectName && (
                                                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
                                                        {t.subjectName}{t.topicName ? ` › ${t.topicName}` : ""}
                                                    </p>
                                                )}
                                            </div>

                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border shrink-0 ${
                                                isRated
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : "bg-rose-50 text-rose-600 border-rose-200 animate-pulse"
                                            }`}>
                                                {isRated ? `${mark}/${maxMarks} Marks` : "Rating Required"}
                                            </span>
                                        </div>

                                        {/* Interactive Star Rating for this specific task */}
                                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200/60">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                Individual Marks:
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: maxMarks }, (_, i) => i + 1).map((star) => {
                                                    const isFilled = star <= (mark || 0);
                                                    return (
                                                        <button
                                                            key={star}
                                                            type="button"
                                                            onClick={() => {
                                                                setIndividualMarks(prev => ({ ...prev, [t._id]: star }));
                                                            }}
                                                            className="p-0.5 transition hover:scale-125 cursor-pointer"
                                                            title={`Rate ${star}/${maxMarks} for "${t.title}"`}
                                                        >
                                                            {isFilled ? (
                                                                <MdStar size={20} className="text-amber-400" />
                                                            ) : (
                                                                <MdStarBorder size={20} className="text-slate-300 hover:text-amber-300" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Evaluation Notes (optional) */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                Evaluation Notes <span className="text-slate-400 font-normal lowercase">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={bulkNotes}
                                onChange={(e) => setBulkNotes(e.target.value)}
                                placeholder="e.g. Batch evaluated and verified"
                                className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 placeholder:text-slate-400"
                            />
                        </div>

                        <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                disabled={bulkUpdating}
                                onClick={() => setShowBulkCompleteModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={bulkUpdating || !allTasksRated}
                                onClick={() => executeBulkShift("completed", individualMarks, bulkNotes)}
                                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer ${
                                    allTasksRated
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                }`}
                                title={!allTasksRated ? "Assign individual marks to all tasks before completing" : ""}
                            >
                                {bulkUpdating ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Completing...</span>
                                    </>
                                ) : (
                                    <>
                                        <MdCheckCircle size={15} />
                                        <span>Confirm & Complete ({selectedTaskIds.length})</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Task Confirmation Modal */}
            {taskToDelete && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
                    onClick={() => !deletingTask && setTaskToDelete(null)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                                <MdDeleteOutline size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                                    Delete Task from Board?
                                </h3>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Are you sure you want to remove this task from <strong className="text-slate-800">{studentName}</strong>&apos;s task board?
                                </p>
                            </div>
                        </div>

                        {/* Task Details Box */}
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs space-y-2">
                            <div className="font-extrabold text-slate-800 leading-snug break-words">
                                {taskToDelete.title}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 font-semibold">
                                {taskToDelete.subjectName && (
                                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">
                                        {taskToDelete.subjectName}
                                    </span>
                                )}
                                {taskToDelete.status && (
                                    <span className={`px-2 py-0.5 rounded-md uppercase font-bold text-[9px] tracking-wider ${
                                        taskToDelete.status === "completed"
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : taskToDelete.status === "inProgress"
                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                            : "bg-slate-100 text-slate-700 border border-slate-200"
                                    }`}>
                                        {taskToDelete.status === "inProgress" ? "In Progress" : taskToDelete.status}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Student-only Deletion Notice */}
                        <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-3 text-[11.5px] text-amber-900 leading-relaxed font-medium flex items-start gap-2.5">
                            <span className="text-amber-600 text-sm mt-0.5 shrink-0">ℹ️</span>
                            <span>
                                <strong>Note:</strong> This task will only be deleted from <span className="font-bold underline">{studentName}</span>&apos;s task board. Other students and the master curriculum will remain unaffected.
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2.5 pt-1">
                            <button
                                type="button"
                                disabled={deletingTask}
                                onClick={() => setTaskToDelete(null)}
                                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={deletingTask}
                                onClick={() => confirmDeleteTask(taskToDelete)}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {deletingTask ? (
                                    "Deleting..."
                                ) : (
                                    <>
                                        <MdDeleteOutline size={15} />
                                        <span>Delete Task</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default StudentTaskBoard;
