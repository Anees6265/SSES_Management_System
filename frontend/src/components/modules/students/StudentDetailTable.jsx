import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useGetNewStudentsQuery,
  useGetAllSessionsQuery,
  useGetAllLevelsQuery,
  useGetAllSubLevelsQuery,
  useGetAllSubdepartmentsQuery
} from "../../../redux/api/authApi";
import Loader from "../../shared/loader/Loader";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";
import CommonTable from "../../shared/table/CommonTable";
import TableDownloadDropdown from "../../shared/table/TableDownloadDropdown";
import Header from "../../shared/sidebar/Header";
import Avatar from "../../shared/Avatar";
import Pagination from "../../shared/pagination/Pagination";
import EmptyState from "../../shared/empty-state/EmptyState";
import { getFtpDomainsForStudent } from "../../../utils/ftpConfig";
import { exportStudentsToExcel, exportStudentsToPDF } from "../../../utils/studentExportHelpers";
import { MdTableChart } from "react-icons/md";
import { Search, X, ChevronRight, Phone, RotateCcw, Filter, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "react-toastify";

const toTitle = (str) =>
  str?.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "";

const STATUS_COLORS = {
  Active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Placed: "bg-purple-50 text-purple-700 border border-purple-200",
  Dropped: "bg-rose-50 text-rose-700 border border-rose-200",
  Completed: "bg-blue-50 text-blue-700 border border-blue-200",
  Dummy: "bg-amber-50 text-amber-700 border border-amber-200",
};

const getStoredProgressFilters = (subDeptId) => {
  try {
    const raw = sessionStorage.getItem(`student_progress_filters_${subDeptId || "all"}`);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
};

const StudentDetailTable = () => {
  const navigate = useNavigate();
  const { subDepartmentId } = useParams(); // present for admin, absent for faculty

  const [activeTab, setActiveTab] = useState(() => {
    return getStoredProgressFilters(subDepartmentId)?.activeTab || "All";
  });
  const [selectedStatus, setSelectedStatus] = useState(() => {
    const f = getStoredProgressFilters(subDepartmentId);
    return Array.isArray(f?.selectedStatus) ? f.selectedStatus : [];
  });
  const [selectedSessionId, setSelectedSessionId] = useState(() => {
    return getStoredProgressFilters(subDepartmentId)?.selectedSessionId || "";
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    return getStoredProgressFilters(subDepartmentId)?.selectedYear || "All";
  });
  const [selectedTech, setSelectedTech] = useState(() => {
    return getStoredProgressFilters(subDepartmentId)?.selectedTech || "All";
  });
  const [selectedDomain, setSelectedDomain] = useState(() => {
    return getStoredProgressFilters(subDepartmentId)?.selectedDomain || "All";
  });
  const [searchTerm, setSearchTerm] = useState(() => {
    return getStoredProgressFilters(subDepartmentId)?.searchTerm || "";
  });
  const [currentPage, setCurrentPage] = useState(() => {
    const f = getStoredProgressFilters(subDepartmentId);
    return (typeof f?.currentPage === "number" && f.currentPage >= 1) ? f.currentPage : 1;
  });
  const [mobilePage, setMobilePage] = useState(() => {
    const f = getStoredProgressFilters(subDepartmentId);
    return (typeof f?.mobilePage === "number" && f.mobilePage >= 1) ? f.mobilePage : 1;
  });

  const [selectedIds, setSelectedIds] = useState([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const mobilePageSize = 10;

  // Build query string — if subDepartmentId present, filter by it
  const queryStr = subDepartmentId ? `subDepartmentId=${subDepartmentId}` : "";

  const { data: res = {}, isLoading } = useGetNewStudentsQuery(queryStr, {
    refetchOnMountOrArgChange: true,
  });

  const { data: subDeptsRes = {} } = useGetAllSubdepartmentsQuery();
  const subDepts = subDeptsRes.data || [];

  const { data: sessionsData } = useGetAllSessionsQuery(true);
  const sessions = sessionsData?.data || [];

  const students = res.data || [];

  const { data: allLevelsRes = {}, isLoading: isLevelsLoading } = useGetAllLevelsQuery();
  const allLevels = allLevelsRes.data || [];

  const { data: allSubLevelsRes = {}, isLoading: isSubLevelsLoading } = useGetAllSubLevelsQuery();
  const allSubLevels = allSubLevelsRes.data || [];

  const currentSubDept = useMemo(() => {
    if (!subDepartmentId) return null;
    return subDepts.find((sd) => String(sd._id) === String(subDepartmentId)) || null;
  }, [subDepts, subDepartmentId]);

  const isUiUxPage = useMemo(() => {
    if (currentSubDept?.name) {
      const upper = currentSubDept.name.toUpperCase();
      return upper.includes("UI/UX") || upper.includes("UIUX");
    }
    if (subDepartmentId === "6aafcf7e46338295b1e23aef") return true;
    const directStudent = students.find((s) => {
      const sSubId = s.subDepartmentId?._id || s.subDepartmentId;
      return sSubId && String(sSubId) === String(subDepartmentId);
    });
    const subName = directStudent?.subDepartmentId?.name || "";
    if (subName) {
      const upper = subName.toUpperCase();
      return upper.includes("UI/UX") || upper.includes("UIUX");
    }
    return false;
  }, [currentSubDept, subDepartmentId, students]);

  const deptName = currentSubDept?.name || (isUiUxPage ? "UI/UX" : students[0]?.subDepartmentId?.name) || "Tech";

  // Determine which levels belong to the current subdepartment(s)
  const allowedLevelIds = useMemo(() => {
    let targetSubDeptIds = [];
    if (subDepartmentId) {
      targetSubDeptIds = [subDepartmentId];
    } else {
      targetSubDeptIds = [...new Set(students.map(s => (s.subDepartmentId?._id || s.subDepartmentId)?.toString()).filter(Boolean))];
    }

    return allLevels
      .filter(l => targetSubDeptIds.includes((l.subDepartmentId?._id || l.subDepartmentId)?.toString()))
      .map(l => l._id.toString());
  }, [allLevels, subDepartmentId, students]);

  // Filter sublevels based on allowedLevelIds
  const departmentSubLevels = useMemo(() => {
    return allSubLevels.filter(sl => allowedLevelIds.includes((sl.levelId?._id || sl.levelId)?.toString()));
  }, [allSubLevels, allowedLevelIds]);

  // Dynamic sublevel tabs from departmentSubLevels
  const subLevelTabs = useMemo(() => {
    const names = departmentSubLevels.map(sl => sl.name);
    // Natural sort: e.g., 1A -> 1B -> 1C -> 2A
    names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    if (isUiUxPage) {
      // In UI/UX sub-department: No "Others" tab!
      // Ensure "1A" is present so marked students show under 1A by default
      const uiuxLevelNames = new Set(names);
      uiuxLevelNames.add("1A");
      const sortedUiuxLevels = Array.from(uiuxLevelNames).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );
      return ["All", ...sortedUiuxLevels, "FTP Students"];
    }

    // In student's home department (TECH, Management, Science, etc.):
    // Include "Others" tab where marked UI/UX students appear!
    return ["All", ...new Set(names), "Others", "FTP Students"];
  }, [departmentSubLevels, isUiUxPage]);

  const availableDomains = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.ftpDomain) set.add(s.ftpDomain);
    });
    const sample = students[0] || {};
    getFtpDomainsForStudent(sample).forEach((d) => set.add(d));
    return Array.from(set);
  }, [students]);

  const filteredData = useMemo(() => {
    const rawSearch = String(searchTerm || "").trim().toLowerCase();
    return students.filter((s) => {
      let matchTab = false;
      if (activeTab === "All") {
        matchTab = true;
      } else if (activeTab === "FTP Students") {
        matchTab = Boolean(s.isFTP);
      } else if (isUiUxPage) {
        // In UI/UX sub-department:
        // Marked UI/UX students should show in 1A level tab by default!
        if (activeTab === "1A") {
          matchTab = Boolean(s.isUIUX) || s.currentSubLevelId?.name === "1A";
        } else {
          matchTab = s.currentSubLevelId?.name === activeTab;
        }
      } else {
        // In home department:
        // Marked UI/UX students appear only in "Others" tab, excluded from 1A/2A/etc.
        if (activeTab === "Others") {
          matchTab = Boolean(s.isUIUX);
        } else {
          matchTab = s.currentSubLevelId?.name === activeTab && !s.isUIUX;
        }
      }

      const matchDomain =
        activeTab !== "FTP Students" ||
        selectedDomain === "All" ||
        s.ftpDomain === selectedDomain;
      const matchStatus = selectedStatus.length === 0 || selectedStatus.includes(s.status);
      const studentSessId = s.sessionId?._id || s.sessionId;
      const matchSession = !selectedSessionId || studentSessId === selectedSessionId || s.sessionId?.name === selectedSessionId;
      const matchYear = selectedYear === "All" || (s.year || "1st Year") === selectedYear;
      const stdTech = String(s.track || s.course || "General").toLowerCase();
      const matchTech = selectedTech === "All" || stdTech.includes(selectedTech.toLowerCase());
      const name = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = !searchTerm ||
        name.includes(searchLower) ||
        s.fullName?.toLowerCase().includes(searchLower) ||
        s.prkey?.toLowerCase().includes(searchLower) ||
        s.studentId?.toLowerCase().includes(searchLower) ||
        s.registrationNo?.toLowerCase().includes(searchLower) ||
        s.enrollmentNo?.toLowerCase().includes(searchLower) ||
        s.ftpDomain?.toLowerCase().includes(searchLower) ||
        s.studentMobile?.includes(searchTerm) ||
        s.district?.toLowerCase().includes(searchLower);
      return matchTab && matchDomain && matchStatus && matchSession && matchYear && matchTech && matchSearch;
    });
  }, [students, activeTab, selectedDomain, selectedStatus, selectedSessionId, selectedYear, selectedTech, searchTerm, isUiUxPage]);

  const prevSubDeptRef = useRef(subDepartmentId);

  useEffect(() => {
    if (prevSubDeptRef.current !== subDepartmentId) {
      prevSubDeptRef.current = subDepartmentId;
      const f = getStoredProgressFilters(subDepartmentId);
      setActiveTab(f?.activeTab || "All");
      setSearchTerm(f?.searchTerm || "");
      setSelectedStatus(Array.isArray(f?.selectedStatus) ? f.selectedStatus : []);
      setSelectedSessionId(f?.selectedSessionId || "");
      setSelectedYear(f?.selectedYear || "All");
      setSelectedTech(f?.selectedTech || "All");
      setSelectedDomain(f?.selectedDomain || "All");
      setCurrentPage((typeof f?.currentPage === "number" && f.currentPage >= 1) ? f.currentPage : 1);
      setMobilePage((typeof f?.mobilePage === "number" && f.mobilePage >= 1) ? f.mobilePage : 1);
      setSelectedIds([]);
    }
  }, [subDepartmentId]);

  // Persist active filters to sessionStorage
  useEffect(() => {
    try {
      const dataToSave = {
        activeTab,
        searchTerm,
        selectedStatus,
        selectedSessionId,
        selectedYear,
        selectedTech,
        selectedDomain,
        currentPage,
        mobilePage,
      };
      sessionStorage.setItem(
        `student_progress_filters_${subDepartmentId || "all"}`,
        JSON.stringify(dataToSave)
      );
    } catch (_) {}
  }, [
    subDepartmentId,
    activeTab,
    searchTerm,
    selectedStatus,
    selectedSessionId,
    selectedYear,
    selectedTech,
    selectedDomain,
    currentPage,
    mobilePage,
  ]);

  // Reset mobile & desktop page & selection whenever filters/tabs change (except initial mount)
  const isInitialFilterMount = useRef(true);
  useEffect(() => {
    if (isInitialFilterMount.current) {
      isInitialFilterMount.current = false;
      return;
    }
    setMobilePage(1);
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchTerm, activeTab, selectedDomain, selectedStatus, selectedSessionId, selectedYear, selectedTech]);

  // Ensure active tab is valid for current department tabs (only after sublevels load)
  useEffect(() => {
    if (isLevelsLoading || isSubLevelsLoading) return;
    if (allSubLevels.length === 0) return;
    if (activeTab !== "All" && !subLevelTabs.includes(activeTab)) {
      setActiveTab("All");
    }
  }, [subLevelTabs, activeTab, isLevelsLoading, isSubLevelsLoading, allSubLevels.length]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedTech !== "All") count++;
    if (selectedStatus.length > 0) count++;
    if (selectedSessionId) count++;
    if (selectedYear !== "All") count++;
    if (activeTab === "FTP Students" && selectedDomain !== "All") count++;
    return count;
  }, [selectedTech, selectedStatus, selectedSessionId, selectedYear, activeTab, selectedDomain]);

  const hasActiveFilters = activeFilterCount > 0 || Boolean(searchTerm);

  const handleResetFilters = () => {
    setSearchTerm("");
    setActiveTab("All");
    setSelectedDomain("All");
    setSelectedStatus([]);
    setSelectedSessionId("");
    setSelectedYear("All");
    setSelectedTech("All");
    setSelectedIds([]);
    setCurrentPage(1);
    setMobilePage(1);
    try {
      sessionStorage.removeItem(`student_progress_filters_${subDepartmentId || "all"}`);
    } catch (_) {}
  };

  const currentFilteredIds = useMemo(() => filteredData.map((s) => s._id), [filteredData]);
  const isAllSelected = currentFilteredIds.length > 0 && currentFilteredIds.every((id) => selectedIds.includes(id));
  const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentFilteredIds);
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedStudentsList = useMemo(() => {
    if (selectedIds.length === 0) return [];
    const set = new Set(selectedIds);
    return filteredData.filter((s) => set.has(s._id));
  }, [selectedIds, filteredData]);

  const handleDownloadExcel = (targetStudents = selectedStudentsList) => {
    const toExport = targetStudents && targetStudents.length > 0 ? targetStudents : filteredData;
    if (toExport.length === 0) {
      toast.warning("No students available to download");
      return;
    }
    const cleanDept = deptName.replace(/[^a-zA-Z0-9]/g, "_");
    const cleanTab = activeTab.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${cleanDept}_${cleanTab}_${toExport.length}_Students.xlsx`;
    exportStudentsToExcel(toExport, { filename });
    toast.success(`Exported ${toExport.length} student${toExport.length > 1 ? "s" : ""} to Excel`);
  };

  const handleDownloadPDF = (targetStudents = selectedStudentsList) => {
    const toExport = targetStudents && targetStudents.length > 0 ? targetStudents : filteredData;
    if (toExport.length === 0) {
      toast.warning("No students available to download");
      return;
    }
    const cleanDept = deptName.replace(/[^a-zA-Z0-9]/g, "_");
    const cleanTab = activeTab.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${cleanDept}_${cleanTab}_${toExport.length}_Students.pdf`;
    exportStudentsToPDF(toExport, {
      title: `${deptName} — Student Progress Information Report (${activeTab})`,
      subTitle: `Department: ${deptName} | Tab: ${activeTab}`,
      filename,
    });
    toast.success(`Exported ${toExport.length} student${toExport.length > 1 ? "s" : ""} to PDF`);
  };

  const tableData = useMemo(() => {
    return filteredData.map((item, idx) => ({
      ...item,
      sno: idx + 1,
    }));
  }, [filteredData]);

  const paginatedMobileData = useMemo(() => {
    const start = (mobilePage - 1) * mobilePageSize;
    return tableData.slice(start, start + mobilePageSize);
  }, [tableData, mobilePage]);

  const columns = [
    {
      key: "select",
      label: (
        <div className="flex items-center justify-center py-1">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => {
              if (el) el.indeterminate = isIndeterminate;
            }}
            onChange={(e) => {
              e.stopPropagation();
              handleToggleSelectAll();
            }}
            className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-500 transition"
            title={isAllSelected ? "Deselect All Students" : "Select All Students"}
            aria-label="Select or deselect all students"
          />
        </div>
      ),
      align: "center",
      thClassName: "w-12 px-2 py-3 sm:py-4 text-center",
      cellClassName: "w-12 px-2 py-3 sm:py-4 text-center",
      enableSorting: false,
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={selectedIds.includes(row._id)}
            onChange={() => handleToggleSelectOne(row._id)}
            className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-500 transition"
            aria-label={`Select ${row.firstName || "student"}`}
          />
        </div>
      ),
    },
    {
      key: "sno",
      label: "S.No.",
      align: "center",
      thClassName: "w-16 px-3 py-3 sm:py-4 text-center",
      cellClassName: "w-16 px-3 py-3 sm:py-4 text-center",
      render: (row, sno) => (
        <span className="font-semibold text-gray-500 text-xs sm:text-sm">
          {sno || row.sno}
        </span>
      ),
    },
    {
      key: "name",
      label: "Student",
      accessorFn: (row) => row.fullName || `${row.firstName || ""} ${row.lastName || ""}`.trim(),
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar firstName={row.firstName} lastName={row.lastName} imageUrl={row.image} />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-medium text-gray-800">{toTitle(row.fullName || `${row.firstName} ${row.lastName}`)}</p>
              {row.isUIUX && (
                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs">
                  UI/UX
                </span>
              )}
              {row.isFTP && (
                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-orange-100 text-orange-700 border border-orange-200 shadow-2xs">
                  FTP{row.ftpDomain ? ` • ${row.ftpDomain}` : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "fatherName",
      label: "Father's Name",
      accessorFn: (row) => row.fatherName || "",
      render: (row) => toTitle(row.fatherName || ""),
    },
    {
      key: "studentMobile",
      label: "Mobile",
      align: "center",
      accessorFn: (row) => String(row.studentMobile || "")
    },
    {
      key: "course",
      label: "Course",
      accessorFn: (row) => row.course || "",
      render: (row) => {
        const courseUpper = (row.course || "").toUpperCase();
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-gray-800">{courseUpper || "N/A"}</span>
            {row.withITEG && !courseUpper.includes("ITEG") && !courseUpper.includes("BCA") && !courseUpper.includes("DIPLOMA") && (
              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-orange-100 text-orange-700 border border-orange-200 shadow-2xs">
                + ITEG
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "level",
      label: "Year & Level",
      align: "center",
      accessorFn: (row) => `${row.year || "1st Year"} / ${isUiUxPage && row.isUIUX ? "1A" : (row.currentSubLevelId?.name || row.currentLevelId?.name || "—")}`,
      render: (row) => {
        const year = row.year || "1st Year";
        const level = isUiUxPage && row.isUIUX
          ? "1A"
          : (row.currentSubLevelId?.name || row.currentLevelId?.name || "—");
        return (
          <span className="inline-flex items-center text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-full shadow-2xs whitespace-nowrap">
            {year} / {level}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      accessorFn: (row) => row.status || "",
      render: (row) => (
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[row.status] || "bg-gray-100 text-gray-600"}`}>
          {row.status}
        </span>
      ),
    },
  ];

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;

  return (
    <>
      <Header
        title={deptName ? `${deptName} — Students` : "Student Progress"}
        badge={`${filteredData.length} students`}
        breadcrumbs={[
          { label: "Academics" },
          { label: "Student Progress", path: "/student-detail-table" },
          ...(deptName ? [{ label: deptName }] : []),
        ]}
      />

      {/* SubLevel Tabs */}
      <div className="bg-white border-b px-3 sm:px-6 flex gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar scroll-smooth [-webkit-overflow-scrolling:touch]">
        {subLevelTabs.map((tab) => {
          let tabCount = 0;
          if (tab === "All") {
            tabCount = students.length;
          } else if (tab === "FTP Students") {
            tabCount = students.filter((s) => Boolean(s.isFTP)).length;
          } else if (isUiUxPage) {
            if (tab === "1A") {
              tabCount = students.filter((s) => Boolean(s.isUIUX) || s.currentSubLevelId?.name === "1A").length;
            } else {
              tabCount = students.filter((s) => s.currentSubLevelId?.name === tab).length;
            }
          } else {
            if (tab === "Others") {
              tabCount = students.filter((s) => Boolean(s.isUIUX)).length;
            } else {
              tabCount = students.filter((s) => s.currentSubLevelId?.name === tab && !s.isUIUX).length;
            }
          }

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer flex items-center shrink-0 ${activeTab === tab
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              <span>{tab}</span>
              <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full font-bold transition-colors ${activeTab === tab
                  ? "bg-orange-100 text-orange-700"
                  : "bg-gray-100 text-gray-500"
                }`}>
                {tabCount}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
        {/* Search and Filters Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
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
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${showMobileFilters || activeFilterCount > 0
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
                    onClick={handleResetFilters}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                )}
                <span className="text-xs font-bold text-gray-500">
                  {filteredData.length} {filteredData.length === 1 ? "student" : "students"}
                </span>
              </div>
            </div>

            {/* Dropdown Filters Container */}
            <div className={`${showMobileFilters ? "grid" : "hidden"} md:flex grid-cols-1 sm:grid-cols-3 md:items-center gap-2.5 w-full md:w-auto`}>
              {/* Technology Dropdown (Hidden/Commented) */}
              {/* <SelectDropdown
                value={selectedTech}
                onChange={(val) => setSelectedTech(val)}
                options={[
                  { value: "All", label: "All Technologies" },
                  { value: "Python", label: "Python" },
                  { value: "MERN Stack", label: "MERN Stack" },
                  { value: "Java", label: "Java" },
                  { value: ".NET", label: ".NET" },
                  { value: "UI/UX", label: "UI/UX" },
                  { value: "Data Analytics", label: "Data Analytics" },
                  { value: "Salesforce", label: "Salesforce" },
                  { value: "SAP", label: "SAP" }
                ]}
                className="w-full md:w-auto md:min-w-[145px]"
                buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-gray-200 bg-white rounded-xl text-xs sm:text-sm text-gray-700 font-medium transition-colors cursor-pointer hover:border-gray-400 focus:outline-none shadow-2xs"
              /> */}

              {/* Status Dropdown */}
              <SelectDropdown
                value={selectedStatus[0] || ""}
                onChange={(val) => setSelectedStatus(val ? [val] : [])}
                options={[
                  { value: "", label: "All Status" },
                  { value: "Active", label: "Active" },
                  { value: "Placed", label: "Placed" },
                  { value: "Dropped", label: "Dropped" },
                  { value: "Completed", label: "Completed" },
                  { value: "Dummy", label: "Dummy" }
                ]}
                className="w-full md:w-auto md:min-w-[135px]"
                buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-gray-200 bg-white rounded-xl text-xs sm:text-sm text-gray-700 font-medium transition-colors cursor-pointer hover:border-gray-400 focus:outline-none shadow-2xs"
              />

              {/* Session Dropdown Filter */}
              <SelectDropdown
                value={selectedSessionId}
                onChange={(val) => setSelectedSessionId(val)}
                options={[
                  { value: "", label: "All Sessions" },
                  ...sessions.map((s) => {
                    const statusText = s.status
                      ? s.status.charAt(0).toUpperCase() + s.status.slice(1)
                      : (s.isActive ? 'Active' : 'Inactive');
                    return { value: s._id, label: `${s.name} (${statusText})` };
                  })
                ]}
                className="w-full md:w-auto md:min-w-[145px]"
                buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-gray-200 bg-white rounded-xl text-xs sm:text-sm text-gray-700 font-medium transition-colors cursor-pointer hover:border-gray-400 focus:outline-none shadow-2xs"
              />

              {/* Year Dropdown Filter */}
              <SelectDropdown
                value={selectedYear}
                onChange={(val) => setSelectedYear(val)}
                options={[
                  { value: "All", label: "All Years" },
                  { value: "1st Year", label: "1st Year" },
                  { value: "2nd Year", label: "2nd Year" },
                  { value: "3rd Year", label: "3rd Year" },
                  { value: "4th Year", label: "4th Year" }
                ]}
                className="w-full md:w-auto md:min-w-[130px]"
                buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-gray-200 bg-white rounded-xl text-xs sm:text-sm text-gray-700 font-medium transition-colors cursor-pointer hover:border-gray-400 focus:outline-none shadow-2xs"
              />

              {/* FTP Domain Filter (active when in FTP Students tab) */}
              {activeTab === "FTP Students" && (
                <SelectDropdown
                  value={selectedDomain}
                  onChange={(val) => setSelectedDomain(val)}
                  options={[
                    { value: "All", label: "All Domains" },
                    ...availableDomains.map((d) => ({ value: d, label: d }))
                  ]}
                  className="w-full md:w-auto md:min-w-[155px]"
                  buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-orange-200 bg-orange-50/70 rounded-xl text-xs sm:text-sm text-orange-950 font-bold transition-colors cursor-pointer hover:border-orange-400 focus:outline-none shadow-2xs"
                />
              )}

              {/* Desktop Reset Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="hidden md:inline-flex h-10 px-3 items-center justify-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl border border-orange-200/80 transition cursor-pointer active:scale-95"
                  title="Reset all filters"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              )}

              {/* Quick Export Dropdown in Theme Color */}
              <TableDownloadDropdown
                count={selectedIds.length}
                total={filteredData.length}
                onDownloadExcel={() => handleDownloadExcel()}
                onDownloadPDF={() => handleDownloadPDF()}
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

        {/* ── DESKTOP & TABLET VIEW: FULL DATA TABLE (>= 768px) ── */}
        <div className="hidden md:block">
          <CommonTable
            data={tableData}
            columns={columns}
            pagination
            rowsPerPage={10}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={
              activeTab === "All"
                ? "No data found"
                : activeTab === "FTP Students"
                ? "No FTP students found"
                : activeTab === "Others"
                ? "No students in Others tab"
                : `No students in the sub level ${activeTab}`
            }
            filtersConfig={[
              {
                title: "Status",
                options: ["Active", "Placed", "Dropped", "Completed", "Dummy"],
                selected: selectedStatus,
                setter: setSelectedStatus,
              },
              {
                title: "Session",
                options: sessions.map(s => s.name),
                selected: selectedSessionId ? [sessions.find(s => s._id === selectedSessionId)?.name || selectedSessionId] : [],
                setter: (vals) => {
                  if (vals.length === 0) setSelectedSessionId("");
                  else {
                    const match = sessions.find(s => s.name === vals[0]);
                    setSelectedSessionId(match ? match._id : vals[0]);
                  }
                },
              },
              {
                title: "Year",
                options: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
                selected: selectedYear === "All" ? [] : [selectedYear],
                setter: (vals) => setSelectedYear(vals.length > 0 ? vals[0] : "All"),
              },
              ...(activeTab === "FTP Students" && availableDomains.length > 0
                ? [
                    {
                      title: "Domain",
                      options: availableDomains,
                      selected: selectedDomain === "All" ? [] : [selectedDomain],
                      setter: (vals) => setSelectedDomain(vals.length > 0 ? vals[0] : "All"),
                    },
                  ]
                : []),
            ]}
            extraColumn={{
              header: "Task Board",
              render: (row) => {
                const isDummy = (row?.status || "").toLowerCase() === "dummy";
                return (
                  <button
                    type="button"
                    disabled={isDummy}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (isDummy) {
                        toast.warning("Task board is disabled for dummy students. Reactivate student to access task board.");
                        return;
                      }
                      navigate("/student/task-board", {
                        state: {
                          student: row,
                          level: row.currentLevelId,
                          subdepartment: row.subDepartmentId,
                        },
                      });
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${isDummy
                        ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                        : "border-orange-200 bg-orange-50 text-orange-500 hover:bg-orange-100 cursor-pointer"
                      }`}
                    title={isDummy ? "Task board is disabled for dummy students" : "Open Task Board"}
                  >
                    <MdTableChart size={14} /> Task Board
                  </button>
                );
              },
            }}
            onRowClick={(row) => navigate(`/student-profile/${row._id}`)}
          />
        </div>

        {/* ── MOBILE VIEW: MODERN STUDENT CARDS (< 768px) ── */}
        <div className="md:hidden space-y-3">
          {filteredData.length === 0 ? (
            <EmptyState
              title={
                activeTab === "All"
                  ? "No Students Found"
                  : activeTab === "FTP Students"
                  ? "No FTP Students Found"
                  : activeTab === "Others"
                  ? "No Students in Others"
                  : `No Students in Sub-Level ${activeTab}`
              }
              subtitle={
                searchTerm
                  ? `No students matched "${searchTerm}". Try checking your spelling or reset filters.`
                  : activeTab === "FTP Students"
                  ? "No students have been marked as FTP yet in this department."
                  : activeTab === "Others"
                  ? "No students have been marked as UI/UX yet."
                  : "Try adjusting your search terms, session, or status filters to view records."
              }
              actionText={hasActiveFilters ? "Reset All Filters" : undefined}
              onAction={hasActiveFilters ? handleResetFilters : undefined}
            />
          ) : (
            <>
              {paginatedMobileData.map((row) => (
                <div
                  key={row._id}
                  onClick={() => navigate(`/student-profile/${row._id}`)}
                  className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-xs hover:shadow-sm hover:border-orange-200 transition-all duration-200 active:scale-[0.99] cursor-pointer space-y-3"
                >
                  {/* Top Row: Avatar, Student Name, PR Key, Status Badge */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center pr-0.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row._id)}
                          onChange={() => handleToggleSelectOne(row._id)}
                          className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-500 transition"
                          aria-label={`Select ${row.firstName || "student"}`}
                        />
                      </div>
                      <Avatar firstName={row.firstName} lastName={row.lastName} imageUrl={row.image} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-gray-400">#{row.sno}</span>
                          <h4 className="font-bold text-sm text-gray-900 truncate leading-snug">
                            {toTitle(`${row.firstName} ${row.lastName}`)}
                          </h4>
                          {row.isUIUX && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                              UI/UX
                            </span>
                          )}
                          {row.isFTP && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                              FTP{row.ftpDomain ? ` • ${row.ftpDomain}` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border shrink-0 ${STATUS_COLORS[row.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {row.status}
                    </span>
                  </div>

                  {/* Middle Details Grid */}
                  <div className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-150 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-400 font-medium">Year & Level:</span>
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full">
                        {(row.year || "1st Year")} / {(isUiUxPage && row.isUIUX ? "1A" : (row.currentSubLevelId?.name || row.currentLevelId?.name || "—"))}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-400 font-medium">Course:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 text-[10.5px] uppercase truncate">
                          {row.course || "N/A"}
                        </span>
                        {row.withITEG && !row.course?.toUpperCase().includes("ITEG") && !row.course?.toUpperCase().includes("BCA") && !row.course?.toUpperCase().includes("DIPLOMA") && (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-orange-100 text-orange-700 border border-orange-200">
                            + ITEG
                          </span>
                        )}
                      </div>
                    </div>

                    {row.fatherName && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-400 font-medium">Father's Name:</span>
                        <span className="font-semibold text-gray-700 truncate">
                          {toTitle(row.fatherName)}
                        </span>
                      </div>
                    )}

                    {row.studentMobile && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-400 font-medium">Mobile:</span>
                        <a
                          href={`tel:${row.studentMobile}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1"
                        >
                          <Phone size={11} />
                          <span>{row.studentMobile}</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="flex items-center gap-2 pt-0.5">
                    {(() => {
                      const isDummy = (row?.status || "").toLowerCase() === "dummy";
                      return (
                        <button
                          type="button"
                          disabled={isDummy}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (isDummy) {
                              toast.warning("Task board is disabled for dummy students. Reactivate student to access task board.");
                              return;
                            }
                            navigate("/student/task-board", {
                              state: {
                                student: row,
                                level: row.currentLevelId,
                                subdepartment: row.subDepartmentId,
                              },
                            });
                          }}
                          className={`flex-1 min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition shadow-2xs ${isDummy
                              ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                              : "border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 active:scale-95 cursor-pointer"
                            }`}
                          title={isDummy ? "Task board is disabled for dummy students" : "Open Task Board"}
                        >
                          <MdTableChart size={15} />
                          <span>Task Board</span>
                        </button>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={() => navigate(`/student-profile/${row._id}`)}
                      className="flex-1 min-h-[42px] inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition active:scale-95 cursor-pointer shadow-2xs"
                    >
                      <span>Profile</span>
                      <ChevronRight size={14} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}

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
    </>
  );
};

export default StudentDetailTable;
