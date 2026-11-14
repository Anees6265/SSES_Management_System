/* eslint-disable react/prop-types */
import React, { useState, useMemo } from "react";
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
} from "react-icons/md";
import { FaUserGraduate } from "react-icons/fa";
import Header from "../../shared/sidebar/Header";
import Avatar from "../../shared/Avatar";
import EmptyState from "../../shared/empty-state/EmptyState";
import Loader from "../../shared/loader/Loader";
import Pagination from "../../shared/pagination/Pagination";
import TableDownloadDropdown from "../../shared/table/TableDownloadDropdown";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";
import ConfirmPlacementModal from "./ConfirmPlacementModal";
import CreatePostModal from "./CreatePostModal";
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
      className={`${size} rounded-xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 text-sky-700 border border-sky-200/80 flex items-center justify-center font-black text-xs shadow-2xs shrink-0 select-none`}
      title={name}
    >
      {initial}
    </div>
  );
};

/* ─── Interactive Stat / Filter Card ──────────────────────── */
const StatCard = ({ title, count, subtitle, icon: Icon, isActive, onClick, color = "sky" }) => {
  const colorStyles = {
    sky: "text-sky-600 bg-sky-50 border-sky-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    purple: "text-purple-600 bg-purple-50 border-purple-100",
    orange: "text-orange-600 bg-orange-50 border-orange-100",
  }[color];

  return (
    <div
      onClick={onClick}
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left flex flex-col justify-between shadow-2xs relative overflow-hidden group ${
        isActive
          ? "bg-white border-orange-500 ring-2 ring-orange-500/10 shadow-sm"
          : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
      }`}
    >
      {isActive && <span className="absolute top-0 left-0 right-0 h-1 bg-orange-500" />}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
          {title}
        </span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${colorStyles}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="mt-2.5">
        <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{count}</p>
        <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">{subtitle}</p>
      </div>
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
    candidate.internshipFromLevelId?.name || candidate.currentLevelId?.name || "—";
  const fromSubLevelName =
    candidate.internshipFromSubLevelId?.name || candidate.currentSubLevelId?.name || "";
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
              <p className="text-xs text-slate-500 font-medium">
                {candidate.prkey || candidate.studentId || "—"} • {candidate.course}
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
  const [selectedForPost, setSelectedForPost] = useState(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
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

  // Export to Excel
  const handleDownloadExcel = () => {
    if (filteredStudents.length === 0) {
      toast.warning("No data to export");
      return;
    }

    const rows = filteredStudents.map((s, index) => {
      const d = s.internshipDetails || {};
      return {
        "S.No": index + 1,
        "Student Name": `${s.firstName || ""} ${s.lastName || ""}`.trim(),
        "PR Key / Roll": s.prkey || s.studentId || "—",
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
    XLSX.writeFile(workbook, `Internship_Students_${Date.now()}.xlsx`);
    toast.success("Excel report downloaded successfully!");
  };

  // Export to PDF
  const handleDownloadPDF = () => {
    if (filteredStudents.length === 0) {
      toast.warning("No data to export");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("SSES - Internship Students Report", 14, 15);
    doc.setFontSize(10);
    doc.text(
      `Generated on: ${new Date().toLocaleDateString("en-IN")} | Total Interns: ${filteredStudents.length}`,
      14,
      22
    );

    const headers = [
      ["#", "Student Name", "PR Key", "Course", "From Level", "Company", "Role", "Type", "Stipend", "Location"],
    ];
    const data = filteredStudents.map((s, i) => {
      const d = s.internshipDetails || {};
      return [
        i + 1,
        `${s.firstName || ""} ${s.lastName || ""}`.trim(),
        s.prkey || s.studentId || "—",
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

    doc.save(`Internship_Students_${Date.now()}.pdf`);
    toast.success("PDF report downloaded successfully!");
  };

  const hasActiveFilters = searchTerm || selectedDept !== "all" || activeTab !== "All";

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedDept("all");
    setActiveTab("All");
    setCurrentPage(1);
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <Header
        title="Internship Students"
        badge={`${students.length} Interns`}
        breadcrumbs={[
          { label: "Placements", path: "/placements/dashboard" },
          { label: "Internship" },
        ]}
      />

      <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
        {/* ── 1. Top Metrics Cards (4 Cards) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <StatCard
            title="Total on Internship"
            count={metrics.total}
            subtitle="All active student interns"
            icon={FaUserGraduate}
            color="orange"
            isActive={activeTab === "All"}
            onClick={() => {
              setActiveTab("All");
              setCurrentPage(1);
            }}
          />
          <StatCard
            title="Paid Internships"
            count={metrics.paid}
            subtitle="Receiving monthly stipends"
            icon={MdAttachMoney}
            color="emerald"
            isActive={activeTab === "Paid"}
            onClick={() => {
              setActiveTab("Paid");
              setCurrentPage(1);
            }}
          />
          <StatCard
            title="Unpaid Internships"
            count={metrics.unpaid}
            subtitle="Industrial training"
            icon={MdSchool}
            color="amber"
            isActive={activeTab === "Unpaid"}
            onClick={() => {
              setActiveTab("Unpaid");
              setCurrentPage(1);
            }}
          />
          <StatCard
            title="Partner Companies"
            count={metrics.companiesCount}
            subtitle="Offering internship roles"
            icon={MdBusiness}
            color="purple"
            isActive={false}
          />
        </div>

        {/* ── 2. Navigation & Filter Bar ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3.5 relative z-20">
          {/* Top Row: Pipeline Stage Tabs & View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "All", label: "All Interns", icon: FaUserGraduate, count: metrics.total },
                { id: "Paid", label: "Paid Only", icon: MdAttachMoney, count: metrics.paid },
                { id: "Unpaid", label: "Unpaid Only", icon: MdSchool, count: metrics.unpaid },
              ].map((tab) => {
                const isCurrent = activeTab === tab.id;
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shrink-0 ${
                      isCurrent
                        ? "bg-orange-500 text-white shadow-xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                    }`}
                  >
                    <Icon size={15} />
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                        isCurrent ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* View Switcher & Result Summary */}
            <div className="flex items-center justify-between sm:justify-end gap-3">
              <span className="hidden md:block text-xs font-semibold text-slate-400">
                Showing <strong className="text-slate-800">{filteredStudents.length}</strong> of {students.length} interns
              </span>

              <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/80">
                <button
                  onClick={() => {
                    setViewMode("table");
                    setPageSize(10);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "table"
                      ? "bg-white text-orange-600 shadow-2xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <MdViewList className="text-sm" /> Table
                </button>
                <button
                  onClick={() => {
                    setViewMode("grid");
                    setPageSize(9);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-white text-orange-600 shadow-2xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <MdGridView className="text-sm" /> Cards
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row: Search & Dropdown Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <MdSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by student name, company, position, course, PR key..."
                className="w-full pl-9 pr-8 h-10 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50 hover:bg-white text-slate-800 placeholder-slate-400 transition shadow-2xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <MdClose size={16} />
                </button>
              )}
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Department Filter Dropdown */}
              <div className="w-full sm:w-56">
                <SelectDropdown
                  value={selectedDept}
                  onChange={(val) => {
                    setSelectedDept(val);
                    setCurrentPage(1);
                  }}
                  options={departmentOptions}
                  placeholder="All Departments"
                  className="w-full"
                  buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3.5 bg-white border border-slate-200 hover:border-orange-500 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition cursor-pointer"
                  menuClassName="w-full min-w-[220px] z-50 shadow-xl border border-slate-100 rounded-xl max-h-64"
                />
              </div>

              {/* Reset Filter Button */}
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="h-10 px-3 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <MdClose size={15} /> Clear Filters
                </button>
              )}

              {/* Download Dropdown */}
              <TableDownloadDropdown
                count={filteredStudents.length}
                total={students.length}
                onDownloadExcel={handleDownloadExcel}
                onDownloadPDF={handleDownloadPDF}
                size="md"
              />

              {/* Refresh Button */}
              <button
                onClick={() => refetch()}
                className="h-10 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                title="Refresh"
              >
                <MdRefresh size={16} />
              </button>
            </div>
          </div>
        </div>

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
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Student</th>
                        <th className="py-3.5 px-3">Academic Level</th>
                        <th className="py-3.5 px-4">Company & Role</th>
                        <th className="py-3.5 px-3">Location</th>
                        <th className="py-3.5 px-3">Type & Stipend</th>
                        <th className="py-3.5 px-3">Start Date</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {paginatedStudents.map((student) => {
                        const details = student.internshipDetails || {};
                        const fromLevelName =
                          student.internshipFromLevelId?.name ||
                          student.currentLevelId?.name ||
                          "—";
                        const fromSubLevelName =
                          student.internshipFromSubLevelId?.name ||
                          student.currentSubLevelId?.name ||
                          "";

                        return (
                          <tr
                            key={student._id}
                            className="hover:bg-slate-50/60 transition group cursor-pointer"
                            onClick={() => setQuickViewCandidate(student)}
                          >
                            {/* Student */}
                            <td className="py-3.5 px-4">
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
                                    className="font-bold text-slate-900 hover:text-orange-600 truncate transition"
                                  >
                                    {student.firstName} {student.lastName}
                                  </p>
                                  <p className="text-[11px] text-slate-400 font-medium truncate">
                                    {student.prkey || student.studentId || "—"} • {student.course}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Academic Level */}
                            <td className="py-3.5 px-3">
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-[11px]"
                                title="Reverting will restore student to this level"
                              >
                                <MdUndo size={13} className="text-emerald-600" />
                                {fromLevelName} {fromSubLevelName ? `(${fromSubLevelName})` : ""}
                              </span>
                            </td>

                            {/* Company & Role */}
                            <td className="py-3.5 px-4">
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
                            <td className="py-3.5 px-3">
                              <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                                <MdLocationOn size={14} className="text-slate-400 shrink-0" />
                                <span className="truncate max-w-[120px]">{details.location || "—"}</span>
                              </span>
                            </td>

                            {/* Type & Stipend */}
                            <td className="py-3.5 px-3">
                              {details.internshipType === "Paid" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Paid {details.stipend ? `• ${details.stipend}` : ""}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  Unpaid
                                </span>
                              )}
                            </td>

                            {/* Start Date */}
                            <td className="py-3.5 px-3 text-slate-500 text-[11px]">
                              {details.startDate ? (
                                <span className="inline-flex items-center gap-1">
                                  <MdCalendarToday size={12} className="text-slate-400" />
                                  {new Date(details.startDate).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                {/* Shift to Placed */}
                                <button
                                  onClick={() => {
                                    setSelectedForPlacement(student);
                                    setIsConfirmModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] shadow-2xs transition flex items-center gap-1 cursor-pointer"
                                  title="Shift to Permanent Placement"
                                >
                                  <MdCheckCircle size={14} />
                                  <span>Shift to Placed</span>
                                </button>

                                {/* Revert to Level */}
                                <button
                                  onClick={() => setStudentToRevert(student)}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                                  title={`Shift back to ${fromLevelName}`}
                                >
                                  <MdUndo size={14} />
                                  <span>Revert</span>
                                </button>

                                {/* View Profile */}
                                <button
                                  onClick={() => navigate(`/student-profile/${student._id}`)}
                                  className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                                  title="View Profile"
                                >
                                  <MdVisibility size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* ── GRID / CARDS VIEW (Desktop & Tablet) ── */
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedStudents.map((student) => {
                  const details = student.internshipDetails || {};
                  const fromLevelName =
                    student.internshipFromLevelId?.name ||
                    student.currentLevelId?.name ||
                    "—";
                  const fromSubLevelName =
                    student.internshipFromSubLevelId?.name ||
                    student.currentSubLevelId?.name ||
                    "";

                  return (
                    <div
                      key={student._id}
                      onClick={() => setQuickViewCandidate(student)}
                      className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs hover:border-slate-300 transition cursor-pointer space-y-3.5 flex flex-col justify-between"
                    >
                      {/* Top Row: Avatar, Student Info, Type Pill */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar firstName={student.firstName} lastName={student.lastName} imageUrl={student.image} size="md" />
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-sm text-slate-900 truncate">
                              {student.firstName} {student.lastName}
                            </h4>
                            <p className="text-[11px] text-slate-400 font-medium truncate">
                              {student.prkey || student.studentId || "—"} • {student.course}
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
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedForPlacement(student);
                            setIsConfirmModalOpen(true);
                          }}
                          className="flex-1 py-2 px-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MdCheckCircle size={14} />
                          <span>Shift to Placed</span>
                        </button>
                        <button
                          onClick={() => setStudentToRevert(student)}
                          className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                          title={`Restore to ${fromLevelName}`}
                        >
                          <MdUndo size={14} /> Revert
                        </button>
                        <button
                          onClick={() => navigate(`/student-profile/${student._id}`)}
                          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                          title="View Profile"
                        >
                          <MdVisibility size={16} />
                        </button>
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
                  student.internshipFromLevelId?.name || student.currentLevelId?.name || "—";

                return (
                  <div
                    key={student._id}
                    onClick={() => setQuickViewCandidate(student)}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar firstName={student.firstName} lastName={student.lastName} imageUrl={student.image} size="sm" />
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-xs text-slate-900 truncate">
                            {student.firstName} {student.lastName}
                          </h4>
                          <p className="text-[10px] text-slate-400 truncate">
                            {student.prkey || student.studentId || "—"} • {student.course}
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

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedForPlacement(student);
                          setIsConfirmModalOpen(true);
                        }}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1"
                      >
                        <MdCheckCircle size={14} /> Shift to Placed
                      </button>
                      <button
                        onClick={() => setStudentToRevert(student)}
                        className="py-1.5 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center gap-1"
                      >
                        <MdUndo size={14} /> Revert
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => setCurrentPage(page)}
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
            const studentThatWasPlaced = selectedForPlacement;
            refetch();
            if (studentThatWasPlaced) {
              setSelectedForPost(studentThatWasPlaced);
              setIsPostModalOpen(true);
            }
          }}
        />
      )}

      {/* ── Create Placement Post Modal (Auto-opens after Shift to Placed) ── */}
      {isPostModalOpen && (
        <CreatePostModal
          isOpen={isPostModalOpen}
          onClose={() => {
            setIsPostModalOpen(false);
            setSelectedForPost(null);
          }}
          student={selectedForPost}
          onSuccess={() => {
            refetch();
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
