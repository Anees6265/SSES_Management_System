/* eslint-disable react/prop-types */
import { useState, useMemo } from "react";
import { toast } from "react-toastify";
import { useGetNewPlacedStudentsQuery, useGetAllCompaniesQuery } from "../../../redux/api/authApi";
import { pdf } from "@react-pdf/renderer";
import CreatePostModal from "./CreatePostModal";
import Pagination from "../../shared/pagination/Pagination";
import Loader from "../../shared/loader/Loader";
import Header from "../../shared/sidebar/Header";
import EmptyState from "../../shared/empty-state/EmptyState";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";
import PlacementPostPDF from "./PlacementPostPDF";
import Avatar from "../../shared/Avatar";
import profile from "../../../assets/images/profileImgDummy.jpeg";
import iteg from "../../../assets/images/logo.png";
import ssism from "../../../assets/images/logo-ssism.png";
import { 
  MdSchool, MdBusiness, MdFileDownload, 
  MdSearch, MdGridView, MdViewList, MdEdit, MdTrendingUp,
  MdClose, MdWork, MdStars, MdLocationOn, MdRefresh
} from "react-icons/md";

/* ─── Metric Card Component ───────────────────────────────── */
const PlacementMetricCard = ({ title, count, subtitle, icon: Icon, color = "orange" }) => {
  const colorStyles = {
    orange: "text-orange-500 bg-orange-50 border-orange-100",
    emerald: "text-emerald-500 bg-emerald-50 border-emerald-100",
    purple: "text-purple-500 bg-purple-50 border-purple-100",
    blue: "text-blue-500 bg-blue-50 border-blue-100",
    indigo: "text-indigo-500 bg-indigo-50 border-indigo-100",
  }[color];

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between text-left group">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
          {title}
        </span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${colorStyles}`}>
          <Icon size={17} />
        </div>
      </div>
      <div className="mt-2.5">
        <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{count}</p>
        <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">{subtitle}</p>
      </div>
    </div>
  );
};

/* ─── Company Logo Tile ───────────────────────────────────── */
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
      className={`${size} rounded-xl bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 text-orange-600 border border-orange-200/80 flex items-center justify-center font-black text-xs shadow-2xs shrink-0 select-none`}
      title={name}
    >
      {initial}
    </div>
  );
};

/* ─── Helpers ─────────────────────────────────────────────── */
const toTitleCase = (str) =>
  str
    ?.toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || "";

const smartCapitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/* ─── Main Placed Students Component ──────────────────────── */
const PlacementPost = () => {
  const [isCreatePostModalOpen, setCreatePostModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [packageFilter, setPackageFilter] = useState("All");
  const [downloadingId, setDownloadingId] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(viewMode === "grid" ? 9 : 10);

  const { data: placedRes, isLoading, error, refetch } = useGetNewPlacedStudentsQuery();
  const { data: companiesData } = useGetAllCompaniesQuery();

  const allPlacedStudents = useMemo(() => {
    return placedRes?.data || [];
  }, [placedRes]);

  // Company logo lookup map
  const companyMap = useMemo(() => {
    const map = {};
    const list = companiesData?.data || companiesData || [];
    if (Array.isArray(list)) {
      list.forEach((c) => {
        if (c.companyName) {
          map[c.companyName.toLowerCase().trim()] = c;
        }
      });
    }
    return map;
  }, [companiesData]);

  // Calculate live statistics
  const stats = useMemo(() => {
    const total = allPlacedStudents.length;
    const salaries = allPlacedStudents
      .map((s) => Number(s.placedInfo?.salary))
      .filter((n) => !isNaN(n) && n > 0);

    const maxSalary = salaries.length > 0 ? Math.max(...salaries) : 0;
    const maxSalaryLpa = maxSalary > 0 ? (maxSalary / 100000).toFixed(1) : "0.0";

    const avgSalary =
      salaries.length > 0
        ? (salaries.reduce((acc, v) => acc + v, 0) / salaries.length / 100000).toFixed(1)
        : "0.0";

    const uniqueCompanies = new Set(
      allPlacedStudents
        .map((s) => s.placedInfo?.companyName?.trim())
        .filter(Boolean)
    ).size;

    const uniqueCourses = new Set(
      allPlacedStudents
        .map((s) => s.course?.trim())
        .filter(Boolean)
    ).size;

    return {
      total,
      maxSalaryLpa,
      avgSalaryLpa: avgSalary,
      uniqueCompanies: uniqueCompanies || (companiesData?.data?.length || 0),
      uniqueCourses: uniqueCourses || 0,
    };
  }, [allPlacedStudents, companiesData]);

  // Dynamic filter options
  const companyOptions = useMemo(() => {
    const set = new Set();
    allPlacedStudents.forEach((s) => {
      if (s.placedInfo?.companyName) set.add(s.placedInfo.companyName.trim());
    });
    return [
      { value: "All", label: "All Companies" },
      ...Array.from(set)
        .sort()
        .map((name) => ({ value: name, label: name })),
    ];
  }, [allPlacedStudents]);

  const courseOptions = useMemo(() => {
    const set = new Set();
    allPlacedStudents.forEach((s) => {
      if (s.course) set.add(s.course.trim());
    });
    return [
      { value: "All", label: "All Courses" },
      ...Array.from(set)
        .sort()
        .map((c) => ({ value: c, label: c })),
    ];
  }, [allPlacedStudents]);

  const packageOptions = [
    { value: "All", label: "All Packages (CTC)" },
    { value: "above10", label: "₹10+ LPA (Tier 1)" },
    { value: "5to10", label: "₹5 – ₹10 LPA (Tier 2)" },
    { value: "3to5", label: "₹3 – ₹5 LPA" },
    { value: "below3", label: "Below ₹3 LPA" },
  ];

  // Filtering logic
  const filteredStudents = useMemo(() => {
    return allPlacedStudents.filter((s) => {
      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const fullName = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
        const company = (s.placedInfo?.companyName || "").toLowerCase();
        const role = (s.placedInfo?.jobProfile || "").toLowerCase();
        const course = (s.course || "").toLowerCase();
        const prkey = (s.prkey || "").toLowerCase();

        if (
          !fullName.includes(q) &&
          !company.includes(q) &&
          !role.includes(q) &&
          !course.includes(q) &&
          !prkey.includes(q)
        ) {
          return false;
        }
      }

      // Company filter
      if (
        companyFilter !== "All" &&
        s.placedInfo?.companyName?.toLowerCase() !== companyFilter.toLowerCase()
      ) {
        return false;
      }

      // Course filter
      if (
        courseFilter !== "All" &&
        s.course?.toLowerCase() !== courseFilter.toLowerCase()
      ) {
        return false;
      }

      // Package filter
      if (packageFilter !== "All") {
        const salaryLpa = (Number(s.placedInfo?.salary) || 0) / 100000;
        if (packageFilter === "above10" && salaryLpa < 10) return false;
        if (packageFilter === "5to10" && (salaryLpa < 5 || salaryLpa >= 10)) return false;
        if (packageFilter === "3to5" && (salaryLpa < 3 || salaryLpa >= 5)) return false;
        if (packageFilter === "below3" && salaryLpa >= 3) return false;
      }

      return true;
    });
  }, [allPlacedStudents, searchTerm, companyFilter, courseFilter, packageFilter]);

  // Pagination slice
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    companyFilter !== "All" ||
    courseFilter !== "All" ||
    packageFilter !== "All";

  const clearAllFilters = () => {
    setSearchTerm("");
    setCompanyFilter("All");
    setCourseFilter("All");
    setPackageFilter("All");
    setCurrentPage(1);
  };

  // PDF Download Handler with Toast Feedback
  const downloadPost = async (student) => {
    const sId = student._id || `${student.firstName}_${student.lastName}`;
    try {
      setDownloadingId(sId);
      toast.info(`Generating poster for ${student.firstName}...`, { autoClose: 1500 });
      const blob = await pdf(<PlacementPostPDF student={student} />).toBlob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${student.firstName}_${student.lastName}_placement_post.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success("Placement poster downloaded successfully!");
    } catch (err) {
      console.error("Error downloading post:", err);
      toast.error("Failed to download poster. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Header title="Placed Students & Success Stories" />
        <div className="bg-slate-50 min-h-screen p-4 sm:p-6 flex items-center justify-center">
          <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-3xl border border-red-200 text-center shadow-sm">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <MdClose size={24} />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Failed to Load Placed Students</h3>
            <p className="text-xs text-slate-500 mt-1">
              Could not retrieve placed students records from server.
            </p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <MdRefresh size={16} /> Retry Fetch
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Placed Students & Success Stories"
        breadcrumbs={[
          { label: "Placements", path: "/placements/dashboard" },
          { label: "Placed Students" },
        ]}
      />

      <div className="bg-slate-50 min-h-screen pb-16">
        <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
          {/* ── Top Metric Cards (5 Cards) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
            <PlacementMetricCard
              title="Total Placements"
              count={stats.total}
              subtitle="Confirmed student offers"
              icon={MdSchool}
              color="orange"
            />
            <PlacementMetricCard
              title="Highest CTC Package"
              count={stats.maxSalaryLpa !== "0.0" ? `₹${stats.maxSalaryLpa} LPA` : "—"}
              subtitle="Top offer recorded"
              icon={MdStars}
              color="emerald"
            />
            <PlacementMetricCard
              title="Average Package"
              count={stats.avgSalaryLpa !== "0.0" ? `₹${stats.avgSalaryLpa} LPA` : "—"}
              subtitle="Mean student compensation"
              icon={MdTrendingUp}
              color="purple"
            />
            <PlacementMetricCard
              title="Recruiting Partners"
              count={stats.uniqueCompanies}
              subtitle="Active hiring corporations"
              icon={MdBusiness}
              color="blue"
            />
            <PlacementMetricCard
              title="Academic Streams"
              count={stats.uniqueCourses}
              subtitle="Disciplines with offers"
              icon={MdWork}
              color="indigo"
            />
          </div>

          {/* ── Toolbar: Search, Filters & View Toggle ── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[240px] max-w-lg">
                <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    title="Clear Search"
                  >
                    <MdClose size={15} />
                  </button>
                )}
              </div>

              {/* View Switcher & Result Summary */}
              <div className="flex items-center justify-between lg:justify-end gap-3">
                <div className="text-xs font-medium text-slate-400">
                  Showing <span className="font-extrabold text-slate-700">{filteredStudents.length}</span> of {allPlacedStudents.length} offers
                </div>

                {/* Grid vs Table View Toggle */}
                <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/80">
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
                    <MdGridView className="text-sm" /> Posters
                  </button>
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
                </div>
              </div>
            </div>

            {/* Second Row: Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
              {/* Company Filter */}
              <div className="w-full sm:w-48">
                <SelectDropdown
                  value={companyFilter}
                  onChange={(val) => {
                    setCompanyFilter(val);
                    setCurrentPage(1);
                  }}
                  options={companyOptions}
                  placeholder="All Companies"
                />
              </div>

              {/* Course Filter */}
              <div className="w-full sm:w-44">
                <SelectDropdown
                  value={courseFilter}
                  onChange={(val) => {
                    setCourseFilter(val);
                    setCurrentPage(1);
                  }}
                  options={courseOptions}
                  placeholder="All Courses"
                />
              </div>

              {/* Package CTC Filter */}
              <div className="w-full sm:w-48">
                <SelectDropdown
                  value={packageFilter}
                  onChange={(val) => {
                    setPackageFilter(val);
                    setCurrentPage(1);
                  }}
                  options={packageOptions}
                  placeholder="All Packages"
                />
              </div>

              {/* Reset Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="px-3 py-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl transition cursor-pointer flex items-center gap-1 border border-orange-200"
                >
                  <MdClose size={14} /> Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* ── Content View: Empty State OR Grid OR Table ── */}
          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-8">
              <EmptyState
                icon={MdSchool}
                title={hasActiveFilters ? "No Placed Students Match Your Filters" : "No Placed Students Recorded Yet"}
                subtitle={
                  hasActiveFilters
                    ? "Try adjusting your search criteria, company, course, or package tier filters."
                    : "Confirmed student placement offers and success stories will appear here."
                }
                actionText={hasActiveFilters ? "Clear All Filters" : undefined}
                onAction={hasActiveFilters ? clearAllFilters : undefined}
              />
            </div>
          ) : viewMode === "grid" ? (
            /* ── Poster Cards Grid ── */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginatedStudents.map((student, idx) => {
                  const companyName = student.placedInfo?.companyName || "Hiring Partner";
                  const compObj =
                    student.placedInfo?.companyRef ||
                    companyMap[companyName.toLowerCase().trim()];
                  const logoUrl = compObj?.companyLogo;
                  const isDownloading =
                    downloadingId === (student._id || `${student.firstName}_${student.lastName}`);

                  const salaryLpa = student.placedInfo?.salary
                    ? (Number(student.placedInfo.salary) / 100000).toFixed(1)
                    : null;

                  return (
                    <div
                      key={student._id || idx}
                      className="bg-white rounded-3xl shadow-2xs hover:shadow-xl transition-all duration-300 border border-slate-200/90 flex flex-col justify-between overflow-hidden relative group"
                    >
                      {/* Card Header: Logos & Pill */}
                      <div className="p-4 sm:p-5 bg-gradient-to-b from-orange-50/60 via-slate-50/30 to-white border-b border-slate-100">
                        <div className="flex items-center justify-between gap-2">
                          <img src={iteg} alt="ITEG" className="h-8 sm:h-9 object-contain" />
                          <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                            Placement Offer
                          </span>
                          <img src={ssism} alt="SSISM" className="h-8 sm:h-9 object-contain" />
                        </div>
                      </div>

                      {/* Card Body: Student Photo & Details */}
                      <div className="p-5 flex flex-col items-center text-center flex-1">
                        {/* Student Image with Gold-Orange Ring */}
                        <div className="relative mb-3">
                          <div className="w-24 h-24 sm:w-26 sm:h-26 rounded-full p-1 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 shadow-md">
                            <img
                              src={student.image || profile}
                              alt={`${student.firstName} ${student.lastName}`}
                              className="w-full h-full rounded-full object-cover bg-white"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = profile;
                              }}
                            />
                          </div>
                          {salaryLpa && (
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-emerald-600 text-white font-black text-[11px] px-2.5 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                              ₹{salaryLpa} LPA
                            </span>
                          )}
                        </div>

                        {/* Student Name & Academic Stream */}
                        <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                          {toTitleCase(student.firstName)} {toTitleCase(student.lastName)}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          {student.course || "Degree Stream"}
                          {student.prkey ? ` • ${student.prkey}` : ""}
                        </p>
                        {student.village && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <MdLocationOn size={12} className="text-slate-400" /> {student.village}
                          </span>
                        )}

                        {/* Placed Company & Role Banner */}
                        <div className="w-full mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 text-left">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CompanyLogo companyName={companyName} logoUrl={logoUrl} size="w-10 h-10" />
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                                Placed at
                              </p>
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                {smartCapitalize(companyName)}
                              </h4>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-100/80 block truncate max-w-[120px]">
                              {toTitleCase(student.placedInfo?.jobProfile || "Designation")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Action Buttons */}
                      <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center gap-2">
                        <button
                          onClick={() => downloadPost(student)}
                          disabled={isDownloading}
                          className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold py-2 px-3 rounded-xl transition shadow-xs hover:shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-98"
                          title="Download Offer Poster PDF"
                        >
                          <MdFileDownload size={16} />
                          <span>{isDownloading ? "Generating..." : "Poster PDF"}</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setCreatePostModalOpen(true);
                          }}
                          className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold py-2 px-3.5 rounded-xl transition shadow-2xs hover:shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                          title="Edit Placement Details"
                        >
                          <MdEdit size={14} className="text-orange-500" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid Pagination */}
              {filteredStudents.length > pageSize && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:px-6 sm:py-4 shadow-2xs">
                  <Pagination
                    totalItems={filteredStudents.length}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    label="placement offers"
                  />
                </div>
              )}
            </div>
          ) : (
            /* ── Data Table View ── */
            <div className="space-y-4">
              {/* Desktop Table */}
              <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        <th className="py-3.5 px-5">Placed Student</th>
                        <th className="py-3.5 px-5">Hiring Partner</th>
                        <th className="py-3.5 px-5">Job Profile / Role</th>
                        <th className="py-3.5 px-5">Offered Package</th>
                        <th className="py-3.5 px-5">Job Type</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                      {paginatedStudents.map((student, idx) => {
                        const companyName = student.placedInfo?.companyName || "Company";
                        const compObj =
                          student.placedInfo?.companyRef ||
                          companyMap[companyName.toLowerCase().trim()];
                        const logoUrl = compObj?.companyLogo;
                        const isDownloading =
                          downloadingId === (student._id || `${student.firstName}_${student.lastName}`);

                        return (
                          <tr
                            key={student._id || idx}
                            className="hover:bg-slate-50/70 transition group"
                          >
                            {/* Student Profile */}
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-3">
                                <Avatar
                                  firstName={student.firstName}
                                  lastName={student.lastName}
                                  imageUrl={student.image}
                                />
                                <div>
                                  <p className="font-extrabold text-slate-900 group-hover:text-orange-600 transition truncate max-w-[190px]">
                                    {toTitleCase(student.firstName)} {toTitleCase(student.lastName)}
                                  </p>
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    {student.course || "Course"} {student.prkey ? `• ${student.prkey}` : ""}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Company */}
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-2.5">
                                <CompanyLogo companyName={companyName} logoUrl={logoUrl} size="w-9 h-9" />
                                <div className="min-w-0">
                                  <p className="font-extrabold text-slate-900 truncate max-w-[170px]">
                                    {smartCapitalize(companyName)}
                                  </p>
                                  <span className="text-[11px] text-slate-400 font-medium truncate block max-w-[170px]">
                                    {student.placedInfo?.location || compObj?.location || "Campus Placement"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Job Profile */}
                            <td className="py-3.5 px-5">
                              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100/80 inline-block">
                                {toTitleCase(student.placedInfo?.jobProfile || "Associate")}
                              </span>
                            </td>

                            {/* Salary */}
                            <td className="py-3.5 px-5">
                              {student.placedInfo?.salary ? (
                                <span className="font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs border border-emerald-100/80">
                                  ₹{(Number(student.placedInfo.salary) / 100000).toFixed(1)} LPA
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium">—</span>
                              )}
                            </td>

                            {/* Job Type */}
                            <td className="py-3.5 px-5">
                              <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-[11px] font-bold border border-purple-100">
                                {student.placedInfo?.jobType || "Full-Time"}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => downloadPost(student)}
                                  disabled={isDownloading}
                                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  title="Download Poster PDF"
                                >
                                  <MdFileDownload size={14} />
                                  <span>{isDownloading ? "..." : "Poster"}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedStudent(student);
                                    setCreatePostModalOpen(true);
                                  }}
                                  className="border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1 cursor-pointer"
                                  title="Edit Placement Record"
                                >
                                  <MdEdit size={13} className="text-orange-500" />
                                  <span>Edit</span>
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

              {/* Mobile Table Cards */}
              <div className="md:hidden space-y-3">
                {paginatedStudents.map((student, idx) => {
                  const companyName = student.placedInfo?.companyName || "Company";
                  const compObj =
                    student.placedInfo?.companyRef ||
                    companyMap[companyName.toLowerCase().trim()];
                  const logoUrl = compObj?.companyLogo;
                  const isDownloading =
                    downloadingId === (student._id || `${student.firstName}_${student.lastName}`);

                  return (
                    <div
                      key={student._id || idx}
                      className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          firstName={student.firstName}
                          lastName={student.lastName}
                          imageUrl={student.image}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-slate-900 text-sm truncate">
                            {toTitleCase(student.firstName)} {toTitleCase(student.lastName)}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium truncate">
                            {student.course || "Course"} {student.prkey ? `• ${student.prkey}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <CompanyLogo companyName={companyName} logoUrl={logoUrl} size="w-8 h-8" />
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-xs text-slate-900 truncate">
                            {smartCapitalize(companyName)}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {toTitleCase(student.placedInfo?.jobProfile || "Associate")}
                          </p>
                        </div>
                        {student.placedInfo?.salary && (
                          <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg text-xs border border-emerald-100">
                            ₹{(Number(student.placedInfo.salary) / 100000).toFixed(1)} LPA
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => downloadPost(student)}
                          disabled={isDownloading}
                          className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold py-2 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <MdFileDownload size={15} />
                          <span>{isDownloading ? "..." : "Poster PDF"}</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setCreatePostModalOpen(true);
                          }}
                          className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold py-2 rounded-xl transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MdEdit size={14} className="text-orange-500" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Table Pagination */}
              {filteredStudents.length > pageSize && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:px-6 sm:py-4 shadow-2xs">
                  <Pagination
                    totalItems={filteredStudents.length}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    label="records"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal: Update Placement Post */}
        <CreatePostModal
          isOpen={isCreatePostModalOpen}
          onClose={() => {
            setCreatePostModalOpen(false);
            setSelectedStudent(null);
          }}
          student={selectedStudent}
          isUpdateMode={true}
          onSuccess={refetch}
        />
      </div>
    </>
  );
};

export default PlacementPost;
