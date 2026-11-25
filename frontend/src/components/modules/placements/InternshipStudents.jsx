/* eslint-disable react/prop-types */
import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  MdWork,
  MdSchool,
  MdAttachMoney,
  MdSearch,
  MdRefresh,
  MdCheckCircle,
  MdUndo,
  MdVisibility,
  MdLocationOn,
  MdCalendarToday,
  MdBusiness,
  MdClose,
  MdGridView,
  MdViewList,
  MdEmail,
  MdPhone,
  MdTrendingUp,
  MdOpenInNew,
  MdMoreVert,
} from "react-icons/md";
import Header from "../../shared/sidebar/Header";
import Avatar from "../../shared/Avatar";
import EmptyState from "../../shared/empty-state/EmptyState";
import Loader from "../../shared/loader/Loader";
import Pagination from "../../shared/pagination/Pagination";
import TableDownloadDropdown from "../../shared/table/TableDownloadDropdown";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";
import ActiveFilterChips from "../../shared/search-export/ActiveFilterChips";
import ConfirmPlacementModal from "./ConfirmPlacementModal";
import {
  useGetInternshipStudentsQuery,
  useRevertStudentInternshipMutation,
  useGetAllDepartmentsQuery,
} from "../../../redux/api/authApi";

/* ─── Company Logo / Avatar Tile ─────────────────────────── */
const CompanyLogo = ({ companyName, logoUrl, size = "w-10 h-10" }) => {
  const [imgError, setImgError] = useState(false);
  const name = companyName || "Company";
  const initial = name.trim() ? name.trim().charAt(0).toUpperCase() : "C";

  if (logoUrl && !imgError) {
    return (
      <div
        className={`${size} rounded-xl bg-white border border-slate-200/90 shadow-2xs p-1 flex items-center justify-center shrink-0 overflow-hidden transition-all duration-200`}
        title={name}
      >
        <img
          src={logoUrl}
          alt={name}
          onError={() => setImgError(true)}
          className="w-full h-full object-contain object-center"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`${size} rounded-xl bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 text-orange-700 border border-orange-200/80 flex items-center justify-center font-black text-xs shadow-2xs shrink-0 select-none`}
      title={name}
    >
      {initial}
    </div>
  );
};

/* ─── Internship Action Menu (Three Dots Dropdown) ────────── */
const InternshipActionMenu = ({
  student,
  onView,
  onShiftToPlaced,
  onRevert,
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  const sId = student.studentId?._id || student.studentId || student._id;
  const resumeURL =
    student.resumeURL ||
    student.studentId?.documents?.find((d) =>
      (d.title || "").toLowerCase().includes("resume") || d.fileType === "pdf"
    )?.fileURL;

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 190;
      const menuHeight = 200;
      const left = Math.max(10, rect.right - menuWidth);
      const openUpward = window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight;
      const top = openUpward ? rect.top - menuHeight : rect.bottom + 6;
      setMenuPosition({ top, left });
    }
    setOpen((prev) => !prev);
  };

  return (
    <div className="relative inline-flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`p-1.5 sm:p-2 rounded-xl transition cursor-pointer ${open
          ? "bg-orange-50 text-orange-600 ring-2 ring-orange-500/20"
          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          }`}
        title="Internship Actions"
        aria-label="Actions"
      >
        <MdMoreVert size={18} />
      </button>

      {open &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[99998]"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
            />
            <div
              style={{
                position: "fixed",
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
              }}
              className="w-48 bg-white border border-slate-200/90 rounded-2xl shadow-xl py-1.5 z-[99999] animate-in fade-in duration-150 text-xs font-semibold text-slate-700 divide-y divide-slate-100"
            >
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onView(student);
                  }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-left hover:bg-orange-50/70 hover:text-orange-600 transition cursor-pointer font-bold text-slate-700"
                >
                  <MdVisibility size={15} className="text-slate-400" />
                  <span>Quick Overview</span>
                </button>

                {resumeURL && (
                  <a
                    href={resumeURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-left hover:bg-orange-50/70 hover:text-orange-600 transition cursor-pointer font-bold text-slate-700"
                  >
                    <MdOpenInNew size={15} className="text-orange-500" />
                    <span>View Resume</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate(`/student-profile/${sId}`);
                  }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-left hover:bg-orange-50/70 hover:text-orange-600 transition cursor-pointer font-bold text-slate-700"
                >
                  <MdSchool size={15} className="text-slate-400" />
                  <span>Full Profile</span>
                </button>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onShiftToPlaced(student);
                  }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-left hover:bg-orange-50 hover:text-orange-600 transition cursor-pointer font-bold text-orange-600"
                >
                  <MdCheckCircle size={15} className="text-orange-500" />
                  <span>Shift to Placed</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onRevert(student);
                  }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-left hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer font-bold text-slate-700"
                >
                  <MdUndo size={15} className="text-slate-400" />
                  <span>Revert to Level</span>
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
};

/* ─── Candidate Quick View Drawer ─────────────────────────── */
const CandidateQuickViewDrawer = ({
  candidate,
  onClose,
  onShiftToPlaced,
  onRevertToLevel,
}) => {
  const navigate = useNavigate();
  if (!candidate) return null;

  const details = candidate.internshipDetails || {};
  const fromLevelName =
    candidate.internshipFromLevelId?.name || candidate.currentLevelId?.name || candidate.levelName || candidate.currentLevelName || "—";
  const fromSubLevelName =
    candidate.internshipFromSubLevelId?.name || candidate.currentSubLevelId?.name || candidate.subLevelName || candidate.currentSubLevelName || "";
  const levelDisplay = fromLevelName !== "—"
    ? `${fromLevelName}${fromSubLevelName ? ` (${fromSubLevelName})` : ""}`
    : (candidate.levelName || candidate.currentLevelName || "");
  const deptName =
    candidate.subDepartmentId?.departmentId?.name ||
    candidate.subDepartmentId?.name ||
    "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <Avatar firstName={candidate.firstName} lastName={candidate.lastName} imageUrl={candidate.image} size="md" />
            <div>
              <h3 className="font-black text-base text-slate-900 tracking-tight">
                {candidate.firstName} {candidate.lastName}
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate">
                {levelDisplay ? `${levelDisplay} • ` : ""}{candidate.course || "—"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Company & Role Card */}
          <div className="p-4 bg-gradient-to-br from-sky-50 via-blue-50 to-slate-50 rounded-2xl border border-sky-100 flex items-center gap-3.5">
            <CompanyLogo companyName={details.companyName} size="w-12 h-12" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 block">
                Company & Role
              </span>
              <h4 className="font-black text-slate-900 text-sm truncate">{details.companyName || "—"}</h4>
              <p className="text-xs text-slate-600 font-semibold truncate">{details.position || "Intern"}</p>
            </div>
            <div>
              {details.internshipType === "Paid" ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-black text-xs shadow-2xs">
                  <MdAttachMoney size={14} /> Paid {details.stipend ? `• ${details.stipend}` : ""}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-black text-xs shadow-2xs">
                  <MdWork size={12} /> Unpaid
                </span>
              )}
            </div>
          </div>

          {/* Academic & Revert Info */}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5">
            <h5 className="font-black text-slate-800 text-xs uppercase tracking-wider">
              Academic & Revert Level
            </h5>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Department</span>
                <p className="font-bold text-slate-800 truncate">{deptName}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Academic Level</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs mt-0.5">
                  <MdUndo size={13} /> {fromLevelName} {fromSubLevelName ? `(${fromSubLevelName})` : ""}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Location</span>
                <p className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <MdLocationOn className="text-slate-400" size={14} /> {details.location || "—"}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Start Date</span>
                <p className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <MdCalendarToday className="text-slate-400" size={13} />{" "}
                  {details.startDate
                    ? new Date(details.startDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-2">
              <MdEmail className="text-slate-400" size={16} />
              <span className="truncate text-slate-700 font-medium">{candidate.email || "No email"}</span>
            </div>
            <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-2">
              <MdPhone className="text-slate-400" size={16} />
              <span className="text-slate-700 font-bold">{candidate.studentMobile || "No phone"}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <button
            onClick={() => {
              onClose();
              navigate(`/student-profile/${candidate._id}`);
            }}
            className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
          >
            <MdOpenInNew size={14} /> View Full Profile
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onRevertToLevel(candidate);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs transition flex items-center gap-1.5"
            >
              <MdUndo size={15} /> Revert to Level
            </button>
            <button
              onClick={() => {
                onClose();
                onShiftToPlaced(candidate);
              }}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
            >
              <MdCheckCircle size={15} /> Shift to Placed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ──────────────────────────────────────── */
const InternshipStudents = () => {
  const navigate = useNavigate();

  // Queries & Mutations
  const { data: internshipData, isLoading, refetch } = useGetInternshipStudentsQuery();
  const { data: departmentsData } = useGetAllDepartmentsQuery();
  const [revertInternship, { isLoading: isReverting }] = useRevertStudentInternshipMutation();

  const students = internshipData?.data || [];
  const departments = useMemo(() => {
    return departmentsData?.data || departmentsData?.departments || (Array.isArray(departmentsData) ? departmentsData : []);
  }, [departmentsData]);

  // Department Dropdown Options
  const departmentOptions = useMemo(() => {
    const list = [{ value: "all", label: "All Departments" }];
    departments.forEach((dept) => {
      if (dept && (dept.name || dept.departmentName)) {
        list.push({
          value: String(dept._id || dept.id),
          label: dept.name || dept.departmentName,
        });
      }
    });
    return list;
  }, [departments]);

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [activeTab, setActiveTab] = useState("All"); // All | Paid | Unpaid
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'grid'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [selectedForPlacement, setSelectedForPlacement] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [studentToRevert, setStudentToRevert] = useState(null);
  const [quickViewCandidate, setQuickViewCandidate] = useState(null);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    const selectedDeptObj = departments.find((d) => String(d._id) === String(selectedDept));
    const selectedDeptName = selectedDeptObj?.name || "";

    return students.filter((s) => {
      const details = s.internshipDetails || {};
      const searchStr = [
        s.firstName,
        s.lastName,
        s.email,
        s.studentMobile,
        s.prkey,
        s.course,
        details.companyName,
        details.position,
        details.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !searchTerm.trim() || searchStr.includes(searchTerm.toLowerCase().trim());

      const studentDeptId = String(
        s.subDepartmentId?.departmentId?._id ||
        s.subDepartmentId?.departmentId ||
        s.departmentId?._id ||
        s.departmentId ||
        ""
      );
      const studentDeptName = (
        s.subDepartmentId?.departmentId?.name ||
        s.departmentName ||
        s.department ||
        ""
      ).toLowerCase().trim();

      const matchesDept =
        selectedDept === "all" ||
        studentDeptId === String(selectedDept) ||
        (selectedDeptName && studentDeptName === selectedDeptName.toLowerCase().trim());

      const matchesTab = activeTab === "All" || details.internshipType === activeTab;

      return matchesSearch && matchesDept && matchesTab;
    });
  }, [students, searchTerm, selectedDept, activeTab, departments]);

  // Metrics
  const metrics = useMemo(() => {
    const total = students.length;
    let paid = 0;
    let unpaid = 0;
    const companySet = new Set();

    students.forEach((s) => {
      const d = s.internshipDetails || {};
      if (d.internshipType === "Paid") paid += 1;
      else if (d.internshipType === "Unpaid") unpaid += 1;
      if (d.companyName) companySet.add(d.companyName.trim().toLowerCase());
    });

    return {
      total,
      paid,
      unpaid,
      companiesCount: companySet.size,
    };
  }, [students]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Revert Student Handler
  const handleConfirmRevert = async () => {
    if (!studentToRevert) return;
    try {
      await revertInternship({ id: studentToRevert._id }).unwrap();
      const levelName =
        studentToRevert.internshipFromLevelId?.name ||
        studentToRevert.currentLevelId?.name ||
        "previous level";
      toast.success(`${studentToRevert.firstName} shifted back to ${levelName} successfully!`);
      setStudentToRevert(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to revert student to level");
    }
  };

  // Selection state & actions for selective download
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Reset selection when search or filters change
  useEffect(() => {
    setSelectedStudentIds([]);
  }, [searchTerm, selectedDept, activeTab]);

  const allStudentIds = useMemo(() => {
    return filteredStudents.map((s) => s._id);
  }, [filteredStudents]);

  const isAllStudentsSelected =
    allStudentIds.length > 0 && allStudentIds.every((id) => selectedStudentIds.includes(id));
  const isStudentIndeterminate =
    selectedStudentIds.length > 0 && !isAllStudentsSelected;

  const handleToggleSelectAllStudents = () => {
    if (isAllStudentsSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(allStudentIds);
    }
  };

  const handleToggleSelectStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getSelectedOrAllStudents = () => {
    if (selectedStudentIds.length === 0) return filteredStudents;
    const set = new Set(selectedStudentIds);
    return filteredStudents.filter((s) => set.has(s._id));
  };

  // Export to Excel
  const handleDownloadExcel = () => {
    const list = getSelectedOrAllStudents();
    if (list.length === 0) {
      toast.warning("No data to export");
      return;
    }

    const rows = list.map((s, index) => {
      const d = s.internshipDetails || {};
      return {
        "S.No": index + 1,
        "Student Name": `${s.firstName || ""} ${s.lastName || ""}`.trim(),
        Course: s.course || "—",
        Department:
          s.subDepartmentId?.departmentId?.name || s.subDepartmentId?.name || "—",
        "Joined From Level":
          s.internshipFromLevelId?.name || s.currentLevelId?.name || "—",
        Company: d.companyName || "—",
        "Position / Role": d.position || "—",
        Location: d.location || "—",
        "Internship Type": d.internshipType || "—",
        Stipend: d.stipend || "—",
        "Start Date": d.startDate
          ? new Date(d.startDate).toLocaleDateString("en-IN")
          : "—",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Internship_Students");
    const countLabel =
      selectedStudentIds.length > 0
        ? `${selectedStudentIds.length}_Selected`
        : `All_${list.length}`;
    XLSX.writeFile(workbook, `Internship_Students_${countLabel}_${Date.now()}.xlsx`);
    toast.success(`Excel report downloaded (${list.length} interns)!`);
  };

  // Export to PDF
  const handleDownloadPDF = () => {
    const list = getSelectedOrAllStudents();
    if (list.length === 0) {
      toast.warning("No data to export");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("SSES - Internship Students Report", 14, 15);
    doc.setFontSize(10);
    doc.text(
      `Generated on: ${new Date().toLocaleDateString("en-IN")} | ${
        selectedStudentIds.length > 0
          ? `Selected Interns: ${list.length}`
          : `Total Interns: ${list.length}`
      }`,
      14,
      22
    );

    const headers = [
      ["#", "Student Name", "Course", "From Level", "Company", "Role", "Type", "Stipend", "Location"],
    ];
    const data = list.map((s, i) => {
      const d = s.internshipDetails || {};
      return [
        i + 1,
        `${s.firstName || ""} ${s.lastName || ""}`.trim(),
        s.course || "—",
        s.internshipFromLevelId?.name || s.currentLevelId?.name || "—",
        d.companyName || "—",
        d.position || "—",
        d.internshipType || "—",
        d.stipend || "—",
        d.location || "—",
      ];
    });

    autoTable(doc, {
      startY: 28,
      head: headers,
      body: data,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [249, 115, 22] },
    });

    const countLabel =
      selectedStudentIds.length > 0
        ? `${selectedStudentIds.length}_Selected`
        : `All_${list.length}`;
    doc.save(`Internship_Students_${countLabel}_${Date.now()}.pdf`);
    toast.success(`PDF report downloaded (${list.length} interns)!`);
  };

  const hasActiveFilters = searchTerm || selectedDept !== "all" || activeTab !== "All";

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedDept("all");
    setActiveTab("All");
    setCurrentPage(1);
  };

  const typeFilterOptions = useMemo(() => [
    { value: "All", label: `All Interns (${metrics.total})` },
    { value: "Paid", label: `Paid Only (${metrics.paid})` },
    { value: "Unpaid", label: `Unpaid Only (${metrics.unpaid})` },
  ], [metrics.total, metrics.paid, metrics.unpaid]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (activeTab !== "All") {
      chips.push({
        key: "activeTab",
        label: "Type",
        value: activeTab,
        displayValue: activeTab === "Paid" ? "Paid Internships" : "Unpaid Internships",
        onRemove: () => {
          setActiveTab("All");
          setCurrentPage(1);
        },
      });
    }
    if (selectedDept !== "all") {
      const deptObj = departments.find((d) => String(d._id) === String(selectedDept));
      chips.push({
        key: "selectedDept",
        label: "Department",
        value: selectedDept,
        displayValue: deptObj?.name || deptObj?.departmentName || selectedDept,
        onRemove: () => {
          setSelectedDept("all");
          setCurrentPage(1);
        },
      });
    }
    if (searchTerm) {
      chips.push({
        key: "searchTerm",
        label: "Search",
        value: searchTerm,
        displayValue: `"${searchTerm}"`,
        onRemove: () => {
          setSearchTerm("");
          setCurrentPage(1);
        },
      });
    }
    return chips;
  }, [activeTab, selectedDept, searchTerm, departments]);

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <Header
        title="Internship Students"
        badge={`${students.length} Interns`}
        breadcrumbs={[
          { label: "Placements", path: "/placements/dashboard" },
          { label: "Internship" },
        ]}
        actions={
          <button
            onClick={() => refetch()}
            className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Refresh Internship Data"
          >
            <MdRefresh size={16} />
            {/* <span className="hidden sm:inline">Refresh</span> */}
          </button>
        }
      />

      <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
        {/* Top Control Bar: Search Input & Filter Dropdowns */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xs">
          {/* Search Input on Left - Matching standard width (flex-1 max-w-full md:max-w-md) */}
          <div className="relative flex-1 max-w-full md:max-w-md">
            <MdSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by student name, company, position, course..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 h-10 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50 hover:bg-white text-slate-800 placeholder-slate-400 transition shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Clear Search"
              >
                <MdClose size={16} />
              </button>
            )}
          </div>

          {/* Filter Controls on Right */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Internship Type Filter Dropdown */}
            <div className="w-full sm:w-44">
              <SelectDropdown
                value={activeTab}
                onChange={(val) => {
                  setActiveTab(val);
                  setCurrentPage(1);
                }}
                options={typeFilterOptions}
                placeholder="All Interns"
                className="w-full"
                buttonClassName="h-10 w-full flex items-center justify-between gap-1.5 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs hover:border-orange-500 cursor-pointer"
                menuClassName="w-full min-w-[180px] z-50 shadow-xl border border-slate-100 rounded-xl"
              />
            </div>

            {/* Department Filter Dropdown */}
            <div className="w-full sm:w-48">
              <SelectDropdown
                value={selectedDept}
                onChange={(val) => {
                  setSelectedDept(val);
                  setCurrentPage(1);
                }}
                options={departmentOptions}
                placeholder="All Departments"
                className="w-full"
                buttonClassName="h-10 w-full flex items-center justify-between gap-1.5 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs hover:border-orange-500 cursor-pointer"
                menuClassName="w-full min-w-[210px] z-50 shadow-xl border border-slate-100 rounded-xl max-h-64"
              />
            </div>

            {/* Reset Filter Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="h-10 px-3 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                title="Reset Filters"
              >
                <MdClose size={15} /> Clear Filters
              </button>
            )}

            {/* Clear Selection Button */}
            {selectedStudentIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedStudentIds([])}
                className="h-10 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Clear Selection"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{selectedStudentIds.length} Selected</span>
                <MdClose size={14} className="ml-0.5 text-amber-600" />
              </button>
            )}

            {/* Download Dropdown */}
            <TableDownloadDropdown
              count={selectedStudentIds.length}
              total={filteredStudents.length}
              onDownloadExcel={handleDownloadExcel}
              onDownloadPDF={handleDownloadPDF}
              size="md"
            />

            {/* View Mode Switcher (Table / Cards) */}
            {/* <div className="hidden sm:flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 h-10 items-center">
              <button
                type="button"
                onClick={() => {
                  setViewMode("table");
                  setPageSize(10);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 px-2.5 h-8.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === "table"
                    ? "bg-white text-orange-600 shadow-2xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-900"
                  }`}
                title="Table View"
              >
                <MdViewList className="text-sm" /> Table
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("grid");
                  setPageSize(9);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 px-2.5 h-8.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === "grid"
                    ? "bg-white text-orange-600 shadow-2xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-900"
                  }`}
                title="Cards View"
              >
                <MdGridView className="text-sm" /> Cards
              </button>
            </div> */}
          </div>
        </div>

        {/* Active Filter Chips */}
        <ActiveFilterChips chips={activeChips} onClearAll={resetFilters} className="mb-2" />

        {/* ── 3. Candidate Data View (Table / Grid View + Mobile Cards) ── */}
        {isLoading ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-16 flex justify-center shadow-2xs">
            <Loader />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-8 sm:p-12 shadow-2xs">
            <EmptyState
              title="No Internship Students Found"
              subtitle={
                hasActiveFilters
                  ? "No student records match your active search and filter criteria. Try adjusting or clearing filters."
                  : "Currently there are no students on internship. You can mark students to internship from their profile action button."
              }
              actionText={hasActiveFilters ? "Reset Filters" : undefined}
              onAction={hasActiveFilters ? resetFilters : undefined}
            />
          </div>
        ) : (
          <>
            {/* ── TABLE VIEW (Desktop) ── */}
            {viewMode === "table" ? (
              <div className="hidden md:block bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-4 px-3 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={isAllStudentsSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = isStudentIndeterminate;
                            }}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleSelectAllStudents();
                            }}
                            className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-500 transition"
                            title={isAllStudentsSelected ? "Deselect All" : "Select All"}
                          />
                        </th>
                        <th className="py-4 px-3 text-center w-14">S.No.</th>
                        <th className="py-4 px-4 text-left">Student</th>
                        <th className="py-4 px-4 text-left">Company & Role</th>
                        <th className="py-4 px-4 text-left">Location</th>
                        <th className="py-4 px-4 text-left">Type & Stipend</th>
                        <th className="py-4 px-4 text-left">Start Date</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {paginatedStudents.map((student, idx) => {
                        const details = student.internshipDetails || {};
                        const fromLevelName =
                          student.internshipFromLevelId?.name ||
                          student.currentLevelId?.name ||
                          student.levelName ||
                          student.currentLevelName ||
                          "—";
                        const fromSubLevelName =
                          student.internshipFromSubLevelId?.name ||
                          student.currentSubLevelId?.name ||
                          student.subLevelName ||
                          student.currentSubLevelName ||
                          "";
                        const levelDisplay = fromLevelName !== "—"
                          ? `${fromLevelName}${fromSubLevelName ? ` (${fromSubLevelName})` : ""}`
                          : (student.levelName || student.currentLevelName || "");

                        return (
                          <tr
                            key={student._id}
                            className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors group cursor-pointer ${
                              selectedStudentIds.includes(student._id) ? "bg-orange-50/40" : ""
                            }`}
                            onClick={() => navigate(`/student-profile/${student._id}`)}
                          >
                            {/* Checkbox */}
                            <td className="py-4 px-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedStudentIds.includes(student._id)}
                                onChange={() => handleToggleSelectStudent(student._id)}
                                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-500 transition"
                                aria-label={`Select ${student.firstName} ${student.lastName}`}
                              />
                            </td>

                            {/* S.No. */}
                            <td className="py-4 px-3 text-center align-middle font-semibold text-slate-500 text-xs">
                              {(currentPage - 1) * pageSize + idx + 1}
                            </td>

                            {/* Student */}
                            <td className="py-4 px-4 text-left align-middle">
                              <div className="flex items-center gap-3">
                                <Avatar
                                  firstName={student.firstName}
                                  lastName={student.lastName}
                                  imageUrl={student.image}
                                  size="sm"
                                />
                                <div className="min-w-0">
                                  <p
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/student-profile/${student._id}`);
                                    }}
                                    className="font-bold text-slate-900 hover:text-orange-600 truncate transition text-xs"
                                  >
                                    {student.firstName} {student.lastName}
                                  </p>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] text-slate-400 font-medium truncate max-w-[150px]">
                                      {student.course || "—"}
                                    </span>
                                    {levelDisplay && levelDisplay !== "—" && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 rounded-md shadow-2xs">
                                        <MdUndo size={11} className="text-indigo-500" />
                                        {levelDisplay}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Company & Role */}
                            <td className="py-4 px-4 text-left align-middle">
                              <div className="flex items-center gap-2.5">
                                <CompanyLogo companyName={details.companyName} size="w-8 h-8" />
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-800 text-xs truncate">
                                    {details.companyName || "—"}
                                  </p>
                                  <p className="text-[11px] text-slate-500 font-medium truncate">
                                    {details.position || "Intern"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Location */}
                            <td className="py-4 px-4 text-left align-middle">
                              <div className="flex items-center gap-1 text-slate-600 font-medium text-xs">
                                <MdLocationOn size={14} className="text-slate-400 shrink-0" />
                                <span className="truncate max-w-[130px]">{details.location || "—"}</span>
                              </div>
                            </td>

                            {/* Type & Stipend */}
                            <td className="py-4 px-4 text-left align-middle">
                              <div className="flex items-center">
                                {details.internshipType === "Paid" ? (
                                  <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Paid {details.stipend ? `• ${details.stipend}` : ""}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px] shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    Unpaid
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Start Date */}
                            <td className="py-4 px-4 text-left text-slate-500 text-[11px] align-middle font-medium">
                              <div className="flex items-center gap-1">
                                {details.startDate ? (
                                  <>
                                    <MdCalendarToday size={12} className="text-slate-400 shrink-0" />
                                    <span>
                                      {new Date(details.startDate).toLocaleDateString("en-IN", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </span>
                                  </>
                                ) : (
                                  "—"
                                )}
                              </div>
                            </td>

                            {/* Actions - Three Dots Dropdown Menu */}
                            <td className="py-3 px-6 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                              <InternshipActionMenu
                                student={student}
                                onView={(s) => setQuickViewCandidate(s)}
                                onShiftToPlaced={(s) => {
                                  setSelectedForPlacement(s);
                                  setIsConfirmModalOpen(true);
                                }}
                                onRevert={(s) => setStudentToRevert(s)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination Footer */}
                {totalPages > 1 && (
                  <div className="border-t border-slate-200/80 px-3 sm:px-6 py-3 sm:py-4 bg-white rounded-b-2xl sm:rounded-b-3xl">
                    <Pagination
                      totalItems={filteredStudents.length}
                      currentPage={currentPage}
                      pageSize={pageSize}
                      totalPages={totalPages}
                      onPageChange={(page) => setCurrentPage(page)}
                      label="interns"
                    />
                  </div>
                )}
              </div>
            ) : (
              /* ── GRID / CARDS VIEW (Desktop & Tablet) ── */
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedStudents.map((student) => {
                  const details = student.internshipDetails || {};
                  const fromLevelName =
                    student.internshipFromLevelId?.name ||
                    student.currentLevelId?.name ||
                    student.levelName ||
                    student.currentLevelName ||
                    "—";
                  const fromSubLevelName =
                    student.internshipFromSubLevelId?.name ||
                    student.currentSubLevelId?.name ||
                    student.subLevelName ||
                    student.currentSubLevelName ||
                    "";
                  const levelDisplay = fromLevelName !== "—"
                    ? `${fromLevelName}${fromSubLevelName ? ` (${fromSubLevelName})` : ""}`
                    : (student.levelName || student.currentLevelName || "");

                  return (
                    <div
                      key={student._id}
                      onClick={() => navigate(`/student-profile/${student._id}`)}
                      className={`bg-white rounded-2xl border transition cursor-pointer space-y-3.5 flex flex-col justify-between p-4 shadow-2xs hover:shadow-xs ${
                        selectedStudentIds.includes(student._id)
                          ? "border-orange-400 ring-2 ring-orange-500/20"
                          : "border-slate-200/80 hover:border-slate-300"
                      }`}
                    >
                      {/* Top Row: Checkbox, Avatar, Student Info, Type Pill */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center pr-0.5">
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.includes(student._id)}
                              onChange={() => handleToggleSelectStudent(student._id)}
                              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-500 transition"
                              aria-label={`Select ${student.firstName} ${student.lastName}`}
                            />
                          </div>
                          <Avatar firstName={student.firstName} lastName={student.lastName} imageUrl={student.image} size="md" />
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-sm text-slate-900 truncate">
                              {student.firstName} {student.lastName}
                            </h4>
                            <p className="text-[11px] text-slate-400 font-medium truncate">
                              {levelDisplay ? `${levelDisplay} • ` : ""}{student.course || "—"}
                            </p>
                          </div>
                        </div>

                        {details.internshipType === "Paid" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px] shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Unpaid
                          </span>
                        )}
                      </div>

                      {/* Company & Role Card */}
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
                        <CompanyLogo companyName={details.companyName} size="w-9 h-9" />
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-xs text-slate-900 truncate">
                            {details.companyName || "—"}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">{details.position || "Intern"}</p>
                        </div>
                        {details.internshipType === "Paid" && details.stipend && (
                          <span className="font-bold text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 shrink-0">
                            {details.stipend}
                          </span>
                        )}
                      </div>

                      {/* Details Strip: From Level & Location */}
                      <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-slate-100">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                          <MdUndo size={13} className="text-emerald-600" />
                          {fromLevelName} {fromSubLevelName ? `(${fromSubLevelName})` : ""}
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-500 font-medium truncate">
                          <MdLocationOn size={13} className="text-slate-400" />
                          {details.location || "—"}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setQuickViewCandidate(student)}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-orange-600 border border-slate-200 hover:border-orange-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MdVisibility size={14} /> View Details
                        </button>
                        <InternshipActionMenu
                          student={student}
                          onView={(s) => setQuickViewCandidate(s)}
                          onShiftToPlaced={(s) => {
                            setSelectedForPlacement(s);
                            setIsConfirmModalOpen(true);
                          }}
                          onRevert={(s) => setStudentToRevert(s)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── MOBILE CARDS VIEW (< 768px) ── */}
            <div className="block md:hidden space-y-3">
              {paginatedStudents.map((student) => {
                const details = student.internshipDetails || {};
                const fromLevelName =
                  student.internshipFromLevelId?.name || student.currentLevelId?.name || student.levelName || student.currentLevelName || "—";
                const fromSubLevelName =
                  student.internshipFromSubLevelId?.name || student.currentSubLevelId?.name || student.subLevelName || student.currentSubLevelName || "";
                const levelDisplay = fromLevelName !== "—"
                  ? `${fromLevelName}${fromSubLevelName ? ` (${fromSubLevelName})` : ""}`
                  : (student.levelName || student.currentLevelName || "");

                return (
                  <div
                    key={student._id}
                    onClick={() => navigate(`/student-profile/${student._id}`)}
                    className={`bg-white rounded-2xl border p-4 shadow-2xs space-y-3 cursor-pointer transition ${
                      selectedStudentIds.includes(student._id)
                        ? "border-orange-400 ring-2 ring-orange-500/20"
                        : "border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center pr-0.5">
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(student._id)}
                            onChange={() => handleToggleSelectStudent(student._id)}
                            className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-500 transition"
                            aria-label={`Select ${student.firstName} ${student.lastName}`}
                          />
                        </div>
                        <Avatar firstName={student.firstName} lastName={student.lastName} imageUrl={student.image} size="sm" />
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-xs text-slate-900 truncate">
                            {student.firstName} {student.lastName}
                          </h4>
                          <p className="text-[10px] text-slate-400 truncate">
                            {levelDisplay ? `${levelDisplay} • ` : ""}{student.course || "—"}
                          </p>
                        </div>
                      </div>

                      {details.internshipType === "Paid" ? (
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                          Paid {details.stipend ? `• ${details.stipend}` : ""}
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                          Unpaid
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <CompanyLogo companyName={details.companyName} size="w-8 h-8" />
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-xs text-slate-900 truncate">{details.companyName || "—"}</p>
                        <p className="text-[10px] text-slate-500 truncate">{details.position || "Intern"}</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {details.location || "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                        <MdUndo size={12} /> From {fromLevelName}
                      </span>
                      {details.startDate && (
                        <span>
                          {new Date(details.startDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setQuickViewCandidate(student)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-orange-600 border border-slate-200 hover:border-orange-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MdVisibility size={14} /> View Details
                      </button>
                      <InternshipActionMenu
                        student={student}
                        onView={(s) => setQuickViewCandidate(s)}
                        onShiftToPlaced={(s) => {
                          setSelectedForPlacement(s);
                          setIsConfirmModalOpen(true);
                        }}
                        onRevert={(s) => setStudentToRevert(s)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Pagination for Grid & Mobile ── */}
            {totalPages > 1 && (
              <div className={`bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs ${viewMode === "table" ? "md:hidden" : ""}`}>
                <Pagination
                  totalItems={filteredStudents.length}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalPages={totalPages}
                  onPageChange={(page) => setCurrentPage(page)}
                  label="interns"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Candidate Quick View Drawer ── */}
      {quickViewCandidate && (
        <CandidateQuickViewDrawer
          candidate={quickViewCandidate}
          onClose={() => setQuickViewCandidate(null)}
          onShiftToPlaced={(c) => {
            setSelectedForPlacement(c);
            setIsConfirmModalOpen(true);
          }}
          onRevertToLevel={(c) => {
            setStudentToRevert(c);
          }}
        />
      )}

      {/* ── Confirm Placement Modal (Shift to Placed) ── */}
      {isConfirmModalOpen && (
        <ConfirmPlacementModal
          isOpen={isConfirmModalOpen}
          onClose={() => {
            setIsConfirmModalOpen(false);
            setSelectedForPlacement(null);
          }}
          student={selectedForPlacement}
          onSuccess={() => {
            setIsConfirmModalOpen(false);
            setSelectedForPlacement(null);
            refetch();
            navigate("/placement-post");
          }}
        />
      )}

      {/* ── Revert to Level Confirmation Dialog ── */}
      {studentToRevert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <MdUndo size={24} />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Shift Student Back to Level?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Student <strong className="text-slate-800">{studentToRevert.firstName} {studentToRevert.lastName}</strong> will be moved from Internship back to{" "}
                <strong className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                  {studentToRevert.internshipFromLevelId?.name || studentToRevert.currentLevelId?.name || "Previous Level"}
                </strong>
                . They will become <strong>Active</strong> in that academic level again and be removed from the Internship list.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStudentToRevert(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-bold uppercase text-[11px] rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevert}
                disabled={isReverting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-[11px] rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <MdCheckCircle size={15} />
                <span>{isReverting ? "Restoring..." : "Yes, Restore to Level"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternshipStudents;
