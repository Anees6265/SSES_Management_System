import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  useGetDummyStudentsQuery,
  useUpdateDummyDetailsMutation,
  useGetAllDepartmentsQuery,
} from "../../../redux/api/authApi";
import Loader from "../../shared/loader/Loader";
import CommonTable from "../../shared/table/CommonTable";
import Header from "../../shared/sidebar/Header";
import Avatar from "../../shared/Avatar";
import Pagination from "../../shared/pagination/Pagination";
import EmptyState from "../../shared/empty-state/EmptyState";
import TableDownloadDropdown from "../../shared/table/TableDownloadDropdown";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";
import { exportGenericToExcel, exportGenericToPDF } from "../../../utils/studentExportHelpers";
import { usePersistentState } from "../../../hooks/usePersistentFilters";
import ActiveFilterChips from "../../shared/search-export/ActiveFilterChips";
import {
  Search,
  X,
  ChevronRight,
  Phone,
  RotateCcw,
  Calendar,
  Eye,
  FileText,
  AlertCircle,
  Pencil,
  Upload,
  Trash2,
  Loader2,
  Filter,
} from "lucide-react";

const STATUS_STYLES = {
  Dummy: "bg-amber-50 text-amber-700 border-amber-200",
  dummy: "bg-amber-50 text-amber-700 border-amber-200",
  Dropped: "bg-rose-50 text-rose-700 border-rose-200",
  dropped: "bg-rose-50 text-rose-700 border-rose-200",
};

const toTitleCase = (str = "") =>
  str
    ? str
        .toLowerCase()
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "";

const formatDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "N/A";

const DUMMY_EXPORT_COLUMNS = [
  { key: "studentName", label: "Student Name" },
  { key: "mobile", label: "Mobile" },
  { key: "department", label: "Department" },
  { key: "course", label: "Course" },
  { key: "level", label: "Level / Class" },
  { key: "reason", label: "Dummy / Drop Reason" },
  { key: "remark", label: "Remark" },
  { key: "markedAt", label: "Marked On" },
  { key: "status", label: "Status" },
];

const formatDummyForExport = (list) => {
  return (list || []).map((s, idx) => ({
    sno: idx + 1,
    studentName: toTitleCase(`${s.firstName || ""} ${s.lastName || ""}`.trim()) || "—",
    mobile: s.studentMobile || "—",
    department: s.subDepartmentId?.departmentId?.name || s.subDepartmentId?.name || "—",
    course: s.course || "—",
    level: `${s.currentLevelId?.name || "—"} ${s.currentSubLevelId?.name ? `/ ${s.currentSubLevelId.name}` : ""}`.trim(),
    reason: s.dummyDetails?.reason?.trim() || s.dummyDetails?.remark?.trim() || (s.status === "Dropped" || s.status === "dropped" ? "Dropped by staff" : "No reason provided"),
    remark: s.dummyDetails?.remark?.trim() || "—",
    markedAt: formatDate(s.dummyDetails?.markedAt || s.updatedAt || s.createdAt),
    status: s.status || "Dummy",
  }));
};

// ── REASON / REMARK CELL WITH ELLIPSIS & RICH HOVER TOOLTIP ──────────────────
const DummyReasonCell = ({ row }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, showBelow: false });
  const textRef = useRef(null);

  const handleMouseEnter = () => {
    if (!textRef.current) return;
    const rect = textRef.current.getBoundingClientRect();
    const tooltipEstimatedHeight = 160;
    const showBelow = rect.top < tooltipEstimatedHeight;
    setCoords({
      top: showBelow ? rect.bottom + 8 : rect.top - 8,
      left: Math.max(16, Math.min(rect.left, window.innerWidth - 340)),
      showBelow,
    });
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  useEffect(() => {
    if (!showTooltip) return;
    const handleScroll = () => setShowTooltip(false);
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [showTooltip]);

  const rawReason =
    row.dummyDetails?.reason?.trim() ||
    row.dummyDetails?.remark?.trim() ||
    (row.status === "Dropped" || row.status === "dropped" ? "Dropped by staff" : "No reason provided");
  const singleLineReason = rawReason.replace(/\s+/g, " ");
  const studentName = toTitleCase(`${row.firstName || ""} ${row.lastName || ""}`);
  const remark = row.dummyDetails?.remark?.trim() || "";
  const markedAt = row.dummyDetails?.markedAt || row.updatedAt || row.createdAt;
  const markedByName = row.dummyDetails?.markedByName;
  const isDropped = row.status === "Dropped" || row.status === "dropped";

  return (
    <div className="w-[130px] sm:w-[150px] max-w-[165px]">
      {/* Truncated single-line reason with ellipsis (...) */}
      <div
        ref={textRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="group/reason inline-flex items-center gap-1.5 max-w-full cursor-help py-0.5"
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 group-hover/reason:scale-125 transition-transform ${isDropped ? "bg-rose-400" : "bg-orange-400"}`} />
        <span className={`text-xs font-semibold italic truncate transition-colors block ${isDropped ? "text-rose-950 group-hover/reason:text-rose-700" : "text-gray-800 group-hover/reason:text-orange-600"}`}>
          "{singleLineReason}"
        </span>
      </div>

      {/* Remark (compact, 1-line truncate if present and distinct) */}
      {remark && remark.toLowerCase() !== rawReason.toLowerCase() && (
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-500 font-medium">
          <span className="font-extrabold text-[9px] uppercase tracking-wider text-gray-400 shrink-0">
            Remark:
          </span>
          <span className="truncate max-w-[110px] text-gray-600 font-semibold">
            {remark}
          </span>
        </div>
      )}

      {/* Floating Hover Tooltip Portal */}
      {showTooltip &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: coords.showBelow ? "none" : "translateY(-100%)",
            }}
            className="pointer-events-none z-[999999] w-72 sm:w-84 rounded-2xl bg-slate-900/95 text-white p-3.5 shadow-2xl backdrop-blur-md border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150 text-xs"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isDropped ? "bg-rose-400" : "bg-orange-400"}`} />
                <span className={`text-[10px] font-black uppercase tracking-wider ${isDropped ? "text-rose-400" : "text-orange-400"}`}>
                  {isDropped ? "Drop Status Reason" : "Dummy Status Reason"}
                </span>
              </div>
              {studentName && (
                <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[140px]">
                  {studentName}
                </span>
              )}
            </div>

            {/* Reason Body */}
            <p className="text-slate-200 text-xs font-medium leading-relaxed italic whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
              "{rawReason}"
            </p>

            {/* Remark if present and different */}
            {remark && remark.toLowerCase() !== rawReason.toLowerCase() && (
              <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 block mb-0.5">
                  Faculty Remark:
                </span>
                <p className="text-slate-300 text-[11px] font-medium leading-snug whitespace-pre-wrap break-words">
                  {remark}
                </p>
              </div>
            )}

            {/* Footer with Marked Info */}
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
              <span>Marked: {formatDate(markedAt)}</span>
              {markedByName && (
                <span className="text-slate-300">By: {markedByName}</span>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

const MAX_APPLICATION_FILE_SIZE = 5 * 1024 * 1024;

const EditDummyModal = ({ student, onClose, onSaved }) => {
  const dialogRef = useRef(null);
  const reasonInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const [reason, setReason] = useState(student?.dummyDetails?.reason || student?.dummyDetails?.remark || "");
  const [remark, setRemark] = useState(student?.dummyDetails?.remark || "");
  const [fileData, setFileData] = useState(null);
  const [fileType, setFileType] = useState("");
  const [fileName, setFileName] = useState("");
  const [removeDocument, setRemoveDocument] = useState(false);
  const [reasonError, setReasonError] = useState("");
  const [hasReasonBlurred, setHasReasonBlurred] = useState(false);

  const [updateDummyDetails, { isLoading: isSaving }] = useUpdateDummyDetailsMutation();

  const existingDocUrl = student?.dummyDetails?.applicationURL || "";
  const existingDocType = student?.dummyDetails?.applicationType || "";
  const isExistingImage =
    existingDocType === "image" || Boolean(existingDocUrl.match(/\.(jpeg|jpg|png|webp|gif)$/i));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      dialog.showModal();
    }
  }, [student?._id]);

  const validateReasonValue = (val) => {
    if (!val || !val.trim()) {
      return "Please enter the reason for marking this student as dummy.";
    }
    return "";
  };

  const handleReasonChange = (event) => {
    const nextValue = event.target.value;
    setReason(nextValue);
    if (hasReasonBlurred || reasonError) {
      setReasonError(validateReasonValue(nextValue));
    }
  };

  const handleReasonBlur = () => {
    setHasReasonBlurred(true);
    setReasonError(validateReasonValue(reason));
  };

  const handleReasonInvalid = (event) => {
    event.preventDefault();
    setHasReasonBlurred(true);
    setReasonError(validateReasonValue(reason));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_APPLICATION_FILE_SIZE) {
      toast.error("File size must be under 5 MB");
      event.target.value = "";
      return;
    }

    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      toast.error("Only image or PDF files are allowed");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFileData(reader.result);
      setFileType(isPdf ? "pdf" : "image");
      setFileName(file.name);
      setRemoveDocument(false);
    };
    reader.readAsDataURL(file);
  };

  const handleClearSelectedFile = () => {
    setFileData(null);
    setFileType("");
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDialogCancel = (event) => {
    if (isSaving) {
      event.preventDefault();
      return;
    }
    onClose();
  };

  const handleDialogBackdropClick = (event) => {
    if (isSaving) return;
    const dialog = dialogRef.current;
    if (!dialog || event.target !== dialog) return;
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      const rect = dialog.getBoundingClientRect();
      const clickedInside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!clickedInside) {
        dialog.close();
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) return;

    const validationMsg = validateReasonValue(reason);
    if (validationMsg) {
      setHasReasonBlurred(true);
      setReasonError(validationMsg);
      reasonInputRef.current?.focus();
      return;
    }

    try {
      await updateDummyDetails({
        id: student._id,
        reason: reason.trim(),
        remark: remark.trim(),
        ...(fileData ? { fileData, fileType } : {}),
        ...(removeDocument && !fileData ? { removeDocument: true } : {}),
      }).unwrap();
      toast.success("Dummy student details updated successfully");
      onSaved();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update dummy student details");
    }
  };

  const studentFullName = toTitleCase(`${student?.firstName || ""} ${student?.lastName || ""}`.trim());

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="edit-dummy-dialog-title"
      onCancel={handleDialogCancel}
      onClose={onClose}
      onClick={handleDialogBackdropClick}
      className="dummy-edit-dialog"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-orange-50/40 shrink-0">
          <div className="min-w-0">
            <h2
              id="edit-dummy-dialog-title"
              className="text-base font-bold text-gray-900 flex items-center gap-2"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-600 shrink-0">
                <Pencil size={15} aria-hidden="true" />
              </span>
              <span>Edit Dummy Student Details</span>
            </h2>
            {studentFullName && (
              <p className="text-xs text-gray-500 mt-0.5 ml-10 truncate">
                {studentFullName}
                {student?.currentLevelId?.name ? ` · ${student.currentLevelId.name}` : ""}
                {student?.currentSubLevelId?.name ? ` (${student.currentSubLevelId.name})` : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => !isSaving && onClose()}
            disabled={isSaving}
            aria-label="Close edit dialog"
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer disabled:opacity-40"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Reason Field */}
          <div>
            <label
              htmlFor="edit-dummy-reason"
              className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5"
            >
              Reason <span className="text-red-500" aria-hidden="true">*</span>
              <span className="sr-only"> (required)</span>
            </label>
            <input
              ref={reasonInputRef}
              id="edit-dummy-reason"
              name="reason"
              type="text"
              required
              value={reason}
              onChange={handleReasonChange}
              onBlur={handleReasonBlur}
              onInvalid={handleReasonInvalid}
              aria-invalid={reasonError ? "true" : "false"}
              aria-errormessage={reasonError ? "edit-dummy-reason-error" : undefined}
              placeholder="e.g., Health issue, exam preparation, personal reason"
              className={`dummy-required-field w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition ${
                reasonError ? "user-invalid-fallback" : ""
              }`}
            />
            {reasonError && (
              <p
                id="edit-dummy-reason-error"
                role="alert"
                className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600"
              >
                <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
                <span>{reasonError}</span>
              </p>
            )}
          </div>

          {/* Remark Field */}
          <div>
            <label
              htmlFor="edit-dummy-remark"
              className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5"
            >
              Remark <span className="text-gray-400 font-medium normal-case">(optional)</span>
            </label>
            <textarea
              id="edit-dummy-remark"
              name="remark"
              rows={3}
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              placeholder="Add additional faculty note or clarification..."
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition resize-y min-h-[84px]"
            />
          </div>

          {/* Application Document Section */}
          <div>
            <label
              htmlFor="edit-dummy-application-file"
              className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5"
            >
              Application Document <span className="text-gray-400 font-medium normal-case">(Image or PDF, max 5 MB)</span>
            </label>

            {/* Current saved document preview (if any, and not marked for removal / replacement) */}
            {existingDocUrl && !fileData && !removeDocument && (
              <div className="mb-2.5 rounded-xl border border-gray-200 bg-gray-50/80 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {isExistingImage ? (
                    <img
                      src={existingDocUrl}
                      alt="Current application document"
                      className="h-10 w-10 rounded-lg object-cover border border-gray-200 shrink-0 bg-white"
                    />
                  ) : (
                    <span className="h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                      <FileText size={18} aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">Current Document Attached</p>
                    <p className="text-[11px] text-gray-500 uppercase font-medium">
                      {isExistingImage ? "Image" : "PDF / Document"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={existingDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
                  >
                    <Eye size={13} aria-hidden="true" />
                    <span>View</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setRemoveDocument(true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition cursor-pointer"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            )}

            {/* Pending document removal notice */}
            {existingDocUrl && removeDocument && !fileData && (
              <div className="mb-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-amber-800">
                  Existing document will be removed when you save.
                </span>
                <button
                  type="button"
                  onClick={() => setRemoveDocument(false)}
                  className="font-bold text-amber-900 underline hover:no-underline cursor-pointer shrink-0"
                >
                  Undo
                </button>
              </div>
            )}

            {/* Newly chosen replacement / upload preview */}
            {fileData ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {fileType === "image" ? (
                    <img
                      src={fileData}
                      alt="Selected replacement preview"
                      className="h-10 w-10 rounded-lg object-cover border border-emerald-200 shrink-0 bg-white"
                    />
                  ) : (
                    <span className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileText size={18} aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-900 truncate">{fileName}</p>
                    <p className="text-[11px] text-emerald-700 font-medium">Ready to upload</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelectedFile}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer shrink-0"
                >
                  <X size={13} aria-hidden="true" />
                  <span>Clear</span>
                </button>
              </div>
            ) : (
              <label
                htmlFor="edit-dummy-application-file"
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/60 px-4 py-4 text-center hover:border-orange-400 hover:bg-orange-50/30 transition cursor-pointer"
              >
                <Upload size={18} className="text-orange-500" aria-hidden="true" />
                <span className="text-xs font-bold text-gray-700">
                  {existingDocUrl ? "Click to replace document" : "Click to upload image or PDF"}
                </span>
                <span className="text-[11px] text-gray-400">PNG, JPG, WEBP, or PDF up to 5 MB</span>
              </label>
            )}

            <input
              ref={fileInputRef}
              id="edit-dummy-application-file"
              name="applicationFile"
              type="file"
              accept="image/*,.pdf,application/pdf"
              onChange={handleFileChange}
              className="sr-only"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => !isSaving && onClose()}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              aria-busy={isSaving}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white shadow-xs transition cursor-pointer"
            >
              {isSaving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};

const StudentPermission = () => {
  const navigate = useNavigate();

  // Role detection
  const { user, role: authRole } = useSelector((state) => state.auth || {});
  const role = (
    authRole ||
    user?.role ||
    localStorage.getItem("role") ||
    (() => {
      try {
        return JSON.parse(localStorage.getItem("user") || "{}")?.role;
      } catch {
        return "";
      }
    })() ||
    ""
  ).toLowerCase().trim();

  const isSuperAdminOrAdmin = ["superadmin", "admin"].includes(role);

  // Persistent filter states
  const [searchTerm, setSearchTerm] = usePersistentState("student_permission_search", "");
  const [selectedDept, setSelectedDept] = usePersistentState("student_permission_dept", "");
  const [selectedStatus, setSelectedStatus] = usePersistentState("student_permission_status", "");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [previewDoc, setPreviewDoc] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [mobilePage, setMobilePage] = useState(1);
  const mobilePageSize = 10;

  // Fetch departments only for superadmin / admin
  const { data: deptRes } = useGetAllDepartmentsQuery(undefined, {
    skip: !isSuperAdminOrAdmin,
  });
  const departments = deptRes?.data || [];

  const departmentOptions = useMemo(() => {
    return [
      { value: "", label: "All Departments" },
      ...departments.map((d) => ({
        value: String(d._id),
        label: d.name,
      })),
    ];
  }, [departments]);

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "Dummy", label: "Dummy" },
    { value: "Dropped", label: "Dropped" },
  ];

  const { data, isLoading, isError, error } = useGetDummyStudentsQuery();
  const students = data?.data || [];

  const filteredData = useMemo(() => {
    return students.filter((student) => {
      // 1. Status Filter - applies to all roles
      if (selectedStatus && selectedStatus !== "all" && selectedStatus !== "") {
        const studentStatus = (student.status || "Dummy").toLowerCase();
        if (studentStatus !== selectedStatus.toLowerCase()) {
          return false;
        }
      }

      // 2. Department Filter - applies ONLY to superadmin & admin
      if (isSuperAdminOrAdmin && selectedDept && selectedDept !== "all" && selectedDept !== "") {
        const deptId =
          student.subDepartmentId?.departmentId?._id
            ? String(student.subDepartmentId.departmentId._id)
            : student.subDepartmentId?.departmentId
            ? String(student.subDepartmentId.departmentId)
            : student.departmentId?._id
            ? String(student.departmentId._id)
            : student.departmentId
            ? String(student.departmentId)
            : "";

        if (deptId !== String(selectedDept)) {
          return false;
        }
      }

      // 3. Search query filter
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      const tokens = q.split(/\s+/).filter(Boolean);
      const deptName = student.subDepartmentId?.departmentId?.name || "";
      const subDeptName = student.subDepartmentId?.name || "";
      const targetStr = [
        student.firstName,
        student.lastName,
        student.studentMobile,
        student.course,
        student.prkey,
        student.status,
        deptName,
        subDeptName,
        student.currentLevelId?.name,
        student.currentSubLevelId?.name,
        student.dummyDetails?.reason,
        student.dummyDetails?.remark,
        student.dummyDetails?.markedByName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return tokens.every((token) => targetStr.includes(token));
    });
  }, [students, selectedStatus, selectedDept, isSuperAdminOrAdmin, searchTerm]);

  // Reset mobile page whenever filters change
  useEffect(() => {
    setMobilePage(1);
  }, [searchTerm, selectedDept, selectedStatus]);

  const paginatedMobileData = useMemo(() => {
    const start = (mobilePage - 1) * mobilePageSize;
    return filteredData.slice(start, start + mobilePageSize);
  }, [filteredData, mobilePage]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (isSuperAdminOrAdmin && selectedDept && selectedDept !== "all" && selectedDept !== "") count += 1;
    if (selectedStatus && selectedStatus !== "all" && selectedStatus !== "") count += 1;
    return count;
  }, [isSuperAdminOrAdmin, selectedDept, selectedStatus]);

  const hasActiveFilters = Boolean(
    searchTerm ||
    (isSuperAdminOrAdmin && selectedDept && selectedDept !== "all" && selectedDept !== "") ||
    (selectedStatus && selectedStatus !== "all" && selectedStatus !== "")
  );

  const handleClearAllFilters = () => {
    setSearchTerm("");
    if (isSuperAdminOrAdmin) setSelectedDept("");
    setSelectedStatus("");
  };

  const activeChips = useMemo(() => {
    const chips = [];
    if (searchTerm) {
      chips.push({
        key: "search",
        label: "Search",
        value: searchTerm,
        displayValue: `"${searchTerm}"`,
        onRemove: () => setSearchTerm(""),
      });
    }
    if (isSuperAdminOrAdmin && selectedDept && selectedDept !== "all" && selectedDept !== "") {
      const foundDept = departments.find((d) => String(d._id) === String(selectedDept));
      chips.push({
        key: "department",
        label: "Department",
        value: selectedDept,
        displayValue: foundDept ? foundDept.name : "Selected Dept",
        onRemove: () => setSelectedDept(""),
      });
    }
    if (selectedStatus && selectedStatus !== "all" && selectedStatus !== "") {
      chips.push({
        key: "status",
        label: "Status",
        value: selectedStatus,
        displayValue: selectedStatus,
        onRemove: () => setSelectedStatus(""),
      });
    }
    return chips;
  }, [searchTerm, isSuperAdminOrAdmin, selectedDept, departments, selectedStatus, setSearchTerm, setSelectedDept, setSelectedStatus]);

  const handleDownloadExcel = (customList) => {
    const list = Array.isArray(customList) && customList.length ? customList : filteredData;
    if (!list || list.length === 0) {
      toast.info("No dummy or dropped students to export.");
      return;
    }
    const formatted = formatDummyForExport(list);
    exportGenericToExcel(formatted, DUMMY_EXPORT_COLUMNS, {
      filename: `Dummy_and_Dropped_Students_${new Date().toISOString().slice(0, 10)}.xlsx`,
    });
  };

  const handleDownloadPDF = (customList) => {
    const list = Array.isArray(customList) && customList.length ? customList : filteredData;
    if (!list || list.length === 0) {
      toast.info("No dummy or dropped students to export.");
      return;
    }
    const formatted = formatDummyForExport(list);
    exportGenericToPDF(formatted, DUMMY_EXPORT_COLUMNS, {
      title: "Dummy & Dropped Students Report",
      filename: `Dummy_and_Dropped_Students_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

  const columns = [
    {
      key: "student",
      label: "Student",
      thClassName: "px-3 py-3 sm:py-4 min-w-[160px] max-w-[200px]",
      cellClassName: "px-3 py-3 sm:py-4 min-w-[160px] max-w-[200px]",
      accessorFn: (row) => `${row.firstName || ""} ${row.lastName || ""}`.trim(),
      render: (row) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar firstName={row.firstName} lastName={row.lastName} imageUrl={row.image} />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {toTitleCase(`${row.firstName || ""} ${row.lastName || ""}`)}
            </p>
            <p className="text-xs text-gray-500 truncate">{row.studentMobile || row.course || "Student"}</p>
          </div>
        </div>
      ),
    },
    ...(isSuperAdminOrAdmin
      ? [
          {
            key: "department",
            label: "Department",
            thClassName: "px-2.5 py-3 sm:py-4 min-w-[110px] max-w-[135px]",
            cellClassName: "px-2.5 py-3 sm:py-4 min-w-[110px] max-w-[135px]",
            accessorFn: (row) =>
              row.subDepartmentId?.departmentId?.name || row.subDepartmentId?.name || "—",
            render: (row) => {
              const deptName =
                row.subDepartmentId?.departmentId?.name || row.subDepartmentId?.name || "—";
              const subDeptName = row.subDepartmentId?.departmentId?.name
                ? row.subDepartmentId?.name
                : "";
              return (
                <div className="text-xs min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{deptName}</p>
                  {subDeptName && <p className="text-[11px] text-gray-400 truncate">{subDeptName}</p>}
                </div>
              );
            },
          },
        ]
      : []),
    {
      key: "level",
      label: "Level",
      thClassName: "px-2.5 py-3 sm:py-4 min-w-[90px] max-w-[110px]",
      cellClassName: "px-2.5 py-3 sm:py-4 min-w-[90px] max-w-[110px]",
      accessorFn: (row) => `${row.currentLevelId?.name || ""} ${row.currentSubLevelId?.name || ""}`.trim(),
      render: (row) => (
        <div className="text-sm text-gray-700 min-w-0">
          <p className="font-semibold truncate">{row.currentLevelId?.name || "-"}</p>
          <p className="text-xs text-gray-400 truncate">{row.currentSubLevelId?.name || "-"}</p>
        </div>
      ),
    },
    {
      key: "reason",
      label: "Reason / Remark",
      thClassName: "px-2.5 py-3 sm:py-4 w-[150px] max-w-[165px]",
      cellClassName: "px-2.5 py-3 sm:py-4 w-[150px] max-w-[165px]",
      accessorFn: (row) => `${row.dummyDetails?.reason || ""} ${row.dummyDetails?.remark || ""}`.trim(),
      render: (row) => <DummyReasonCell row={row} />,
    },
    {
      key: "markedAt",
      label: "Marked On",
      thClassName: "px-2.5 py-3 sm:py-4 whitespace-nowrap min-w-[95px]",
      cellClassName: "px-2.5 py-3 sm:py-4 whitespace-nowrap min-w-[95px]",
      accessorFn: (row) => row.dummyDetails?.markedAt || row.updatedAt || row.createdAt || "",
      render: (row) => (
        <span className="text-xs text-gray-600 font-medium">
          {formatDate(row.dummyDetails?.markedAt || row.updatedAt || row.createdAt)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      thClassName: "px-2 py-3 sm:py-4 text-center w-[85px]",
      cellClassName: "px-2 py-3 sm:py-4 text-center w-[85px]",
      accessorFn: (row) => row.status || "Dummy",
      render: (row) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[row.status] || STATUS_STYLES.Dummy}`}>
          {row.status || "Dummy"}
        </span>
      ),
    },
    {
      key: "application",
      label: "Application",
      align: "center",
      thClassName: "px-2 py-3 sm:py-4 text-center w-[85px]",
      cellClassName: "px-2 py-3 sm:py-4 text-center w-[85px]",
      enableSorting: false,
      render: (row) =>
        row.dummyDetails?.applicationURL ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setPreviewDoc(row.dummyDetails);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-700 bg-white hover:bg-slate-50 hover:border-gray-400 font-bold tracking-wider uppercase text-xs rounded-xl transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer"
          >
            <Eye size={12} />
            <span>VIEW</span>
          </button>
        ) : (
          <span className="text-xs text-gray-400 italic">No Doc</span>
        ),
    },
    {
      key: "actions",
      label: "Action",
      align: "center",
      thClassName: "px-2 py-3 sm:py-4 text-center w-[75px]",
      cellClassName: "px-2 py-3 sm:py-4 text-center w-[75px]",
      enableSorting: false,
      render: (row) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setEditingStudent(row);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 hover:border-orange-300 font-bold tracking-wider uppercase text-xs rounded-xl transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer"
          aria-label={`Edit dummy details for ${row.firstName || "student"}`}
        >
          <Pencil size={12} aria-hidden="true" />
          <span>Edit</span>
        </button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center p-6 bg-white rounded-2xl border border-rose-100 shadow-lg max-w-sm">
          <p className="font-bold text-rose-600 mb-1">Error Loading Data</p>
          <p className="text-xs text-gray-500">{error?.data?.message || "Something went wrong."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-1px)] flex flex-col">
      <Header
        title="Dummy & Dropped Students"
        showBack={false}
        badge={`${students.length} dummy & dropped`}
        breadcrumbs={[
          { label: "Academics" },
          { label: "Dummy & Dropped Students" },
        ]}
      />

      <div className="p-3.5 sm:p-5 flex-1 flex flex-col space-y-3.5 sm:space-y-4">
        {/* Search and Filters Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-full md:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search students..."
                className="w-full h-10 pl-9 pr-9 text-xs sm:text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 transition placeholder:text-gray-400 font-medium text-gray-800"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Mobile Filter Toggle Button */}
            <div className="flex items-center justify-between md:hidden gap-2">
              <button
                type="button"
                onClick={() => setShowMobileFilters((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  showMobileFilters || activeFilterCount > 0
                    ? "bg-orange-50 border-orange-200 text-orange-600"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Filter size={14} />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-4.5 h-4.5 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-extrabold ml-0.5">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Dropdown Filters Container */}
            <div className={`${showMobileFilters ? "grid" : "hidden"} md:flex grid-cols-1 sm:grid-cols-2 md:items-center gap-2.5 w-full md:w-auto`}>
              {/* Department Dropdown (Superadmin & Admin only) */}
              {isSuperAdminOrAdmin && (
                <SelectDropdown
                  value={selectedDept === "all" ? "" : selectedDept}
                  onChange={(val) => setSelectedDept(val || "")}
                  options={departmentOptions}
                  placeholder="All Departments"
                  className="w-full md:w-auto md:min-w-[175px]"
                  buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-gray-200 bg-white rounded-xl text-xs sm:text-sm text-gray-700 font-medium transition-colors cursor-pointer hover:border-gray-400 focus:outline-none shadow-2xs"
                />
              )}

              {/* Status Dropdown */}
              <SelectDropdown
                value={selectedStatus === "all" ? "" : selectedStatus}
                onChange={(val) => setSelectedStatus(val || "")}
                options={statusOptions}
                placeholder="All Status"
                className="w-full md:w-auto md:min-w-[135px]"
                buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-gray-200 bg-white rounded-xl text-xs sm:text-sm text-gray-700 font-medium transition-colors cursor-pointer hover:border-gray-400 focus:outline-none shadow-2xs"
              />

              {/* Desktop Reset Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="hidden md:inline-flex h-10 px-3 items-center justify-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl border border-orange-200/80 transition cursor-pointer active:scale-95"
                  title="Reset all filters"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              )}

              {/* Export Dropdown (Matches size="md" of student detail table) */}
              <TableDownloadDropdown
                total={filteredData.length}
                onDownloadExcel={() => handleDownloadExcel(filteredData)}
                onDownloadPDF={() => handleDownloadPDF(filteredData)}
                size="md"
              />

              {/* Mobile Close/Apply Filters Button */}
              {showMobileFilters && (
                <button
                  type="button"
                  onClick={() => setShowMobileFilters(false)}
                  className="md:hidden w-full h-10 flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs active:scale-95 transition"
                >
                  <span>Apply Filters</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeChips.length > 0 && (
          <ActiveFilterChips
            chips={activeChips}
            onClearAll={handleClearAllFilters}
            className="mb-2"
          />
        )}

        {/* ── DESKTOP & TABLET VIEW: FULL DATA TABLE (>= 768px) ── */}
        <div className="hidden md:flex flex-col flex-1 min-h-[580px]">
          <CommonTable
            data={filteredData}
            columns={columns}
            onRowClick={(row) => navigate(`/student-profile/${row._id}`)}
            pagination
            rowsPerPage={10}
            minRows={10}
            className="flex-1 flex flex-col h-full"
            wrapperClassName="flex-1 flex flex-col justify-between h-full bg-white"
            exportTitle="Dummy_and_Dropped_Students"
            onExportExcel={handleDownloadExcel}
            onExportPDF={handleDownloadPDF}
            emptyMessage={
              hasActiveFilters
                ? "No dummy or dropped students match the selected filters"
                : "No students are currently marked as dummy or dropped"
            }
          />
        </div>

        {/* ── MOBILE VIEW: MODERN DUMMY STUDENT CARDS (< 768px) ── */}
        <div className="md:hidden space-y-3">
          {filteredData.length === 0 ? (
            <EmptyState
              title="No Dummy or Dropped Students Found"
              subtitle={
                hasActiveFilters
                  ? "No students match your filter criteria."
                  : "No students are currently marked as dummy or dropped."
              }
              actionText={hasActiveFilters ? "Reset Filters" : undefined}
              onAction={hasActiveFilters ? handleClearAllFilters : undefined}
            />
          ) : (
            <>
              {paginatedMobileData.map((student) => {
                const studentName = toTitleCase(`${student.firstName || ""} ${student.lastName || ""}`);
                const hasDoc = Boolean(student.dummyDetails?.applicationURL);

                return (
                  <div
                    key={student._id}
                    onClick={() => navigate(`/student-profile/${student._id}`)}
                    className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs hover:shadow-sm hover:border-orange-200 transition-all duration-200 active:scale-[0.99] cursor-pointer space-y-3"
                  >
                    {/* Top Row: Avatar, Student Name, PR Key, Status Badge */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Avatar firstName={student.firstName} lastName={student.lastName} imageUrl={student.image} />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-gray-900 truncate leading-snug">
                            {studentName || "Student"}
                          </h4>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {student.studentMobile && (
                              <a
                                href={`tel:${student.studentMobile}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] font-medium text-orange-600 hover:underline flex items-center gap-0.5"
                              >
                                <Phone size={10} />
                                <span>{student.studentMobile}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border shrink-0 ${STATUS_STYLES[student.status] || STATUS_STYLES.Dummy}`}>
                        {student.status || "Dummy"}
                      </span>
                    </div>

                    {/* Details Box */}
                    <div className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-150 text-xs space-y-1.5">
                      {isSuperAdminOrAdmin && (student.subDepartmentId?.departmentId?.name || student.subDepartmentId?.name) && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-400 font-medium">Department:</span>
                          <span className="font-bold text-gray-700 truncate">
                            {student.subDepartmentId?.departmentId?.name || student.subDepartmentId?.name}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-400 font-medium">Level / Sub-Level:</span>
                        <span className="font-bold text-gray-700 truncate">
                          {student.currentLevelId?.name || "—"} {student.currentSubLevelId?.name ? `/ ${student.currentSubLevelId.name}` : ""}
                        </span>
                      </div>

                      {student.course && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-400 font-medium">Course:</span>
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 text-[10.5px] uppercase truncate">
                            {student.course}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-400 font-medium">Marked On:</span>
                        <span className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">
                          <Calendar size={11} className="text-gray-400" />
                          <span>{formatDate(student.dummyDetails?.markedAt || student.updatedAt || student.createdAt)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Reason & Remark Box */}
                    <div className="bg-orange-50/30 rounded-xl p-3 border border-orange-100/70 text-xs space-y-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        {student.status === "Dropped" || student.status === "dropped" ? "Reason for Drop:" : "Reason for Dummy:"}
                      </span>
                      <p className="font-semibold text-gray-800 border-l-2 border-orange-400 pl-2.5 py-0.5 italic text-xs leading-relaxed line-clamp-3">
                        "{student.dummyDetails?.reason?.trim() || student.dummyDetails?.remark?.trim() || (student.status === "Dropped" || student.status === "dropped" ? "Dropped by staff" : "No reason provided")}"
                      </p>
                      {student.dummyDetails?.remark && student.dummyDetails.remark.trim().toLowerCase() !== (student.dummyDetails?.reason || "").trim().toLowerCase() && (
                        <div className="pt-1.5 border-t border-orange-100/80 text-[11px] text-gray-600 line-clamp-2">
                          <span className="font-bold text-gray-500 mr-1">Remark:</span>
                          <span>{student.dummyDetails.remark}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="flex items-center gap-2 pt-0.5">
                      {hasDoc && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPreviewDoc(student.dummyDetails);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600 hover:bg-orange-100 transition active:scale-95 cursor-pointer shadow-2xs"
                        >
                          <Eye size={14} />
                          <span>Application</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingStudent(student);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100 transition active:scale-95 cursor-pointer shadow-2xs"
                      >
                        <Pencil size={13} aria-hidden="true" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/student-profile/${student._id}`)}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition active:scale-95 cursor-pointer shadow-2xs"
                      >
                        <span>Profile</span>
                        <ChevronRight size={14} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Mobile Pagination */}
              {filteredData.length > mobilePageSize && (
                <div className="bg-gray-100 rounded-2xl border border-gray-200 p-3 sm:px-6 sm:py-4 shadow-xs">
                  <Pagination
                    totalItems={filteredData.length}
                    currentPage={mobilePage}
                    pageSize={mobilePageSize}
                    totalPages={Math.max(1, Math.ceil(filteredData.length / mobilePageSize))}
                    onPageChange={setMobilePage}
                    label="entries"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Preview Document Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-3 sm:px-4 transition-opacity duration-300"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-4 sm:p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-100 transform transition-all duration-300"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2.5">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-1.5">
                <FileText size={18} className="text-orange-500" />
                <span>Dummy Student Application</span>
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-extrabold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {previewDoc.applicationType === "image" ||
            previewDoc.applicationURL?.match(/\.(jpeg|jpg|png|webp|gif)$/i) ? (
              <img
                src={previewDoc.applicationURL}
                alt="Dummy Student Application"
                className="w-full rounded-xl object-contain max-h-[60vh] border border-gray-100 bg-gray-50"
              />
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-600 space-y-2">
                <FileText size={32} className="text-orange-500 mx-auto" />
                <p className="font-bold text-gray-800">Application Document Available</p>
                <p className="text-xs text-gray-400">PDF or external document format</p>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-xs font-bold text-gray-600 rounded-xl transition duration-200 cursor-pointer"
              >
                Close
              </button>
              <a
                href={previewDoc.applicationURL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white rounded-xl transition duration-200 shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Open in new tab</span>
                <ChevronRight size={14} />
              </a>
            </div>
          </div>
        </div>
      )}
      {/* Edit Dummy Student Details Dialog */}
      {editingStudent &&
        createPortal(
          <EditDummyModal
            key={editingStudent._id}
            student={editingStudent}
            onClose={() => setEditingStudent(null)}
            onSaved={() => setEditingStudent(null)}
          />,
          document.body
        )}
    </div>
  );
};

export default StudentPermission;
