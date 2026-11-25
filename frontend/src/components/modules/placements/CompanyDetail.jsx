/* eslint-disable react/prop-types */
import { useState, useMemo, useEffect } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  useGetAllCompaniesQuery,
  useToggleCompanyStatusMutation,
} from "../../../redux/api/authApi";
import Loader from "../../shared/loader/Loader";
import Pagination from "../../shared/pagination/Pagination";
import Header from "../../shared/sidebar/Header";
import EmptyState from "../../shared/empty-state/EmptyState";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";
import ActiveFilterChips from "../../shared/search-export/ActiveFilterChips";
import { usePersistentFilters } from "../../../hooks/usePersistentFilters";
import AddCompanyModal from "./AddCompanyModal";
import CompanyProfileModal from "./CompanyProfileModal";
import {
  MdPeople,
  MdLocationOn,
  MdEmail,
  MdPhone,
  MdSearch,
  MdAdd,
  MdEdit,
  MdVisibility,
  MdToggleOn,
  MdToggleOff,
  MdClose,
  MdCheckCircle,
  MdApartment,
  MdRefresh,
} from "react-icons/md";

/* ─── Company Logo Component ──────────────────────────────── */
const CompanyLogo = ({ company, size = "w-12 h-12", iconSize = "text-sm", rounded = "rounded-xl" }) => {
  const [imgError, setImgError] = useState(false);
  const logoUrl = company?.companyLogo || company?.logo;
  const name = company?.companyName || "Company";
  const initial = name.trim() ? name.trim().charAt(0).toUpperCase() : "C";

  if (logoUrl && !imgError) {
    return (
      <div
        className={`${size} ${rounded} bg-white border border-slate-200/90 shadow-2xs p-1.5 flex items-center justify-center shrink-0 overflow-hidden transition-all duration-200 group-hover:scale-105 group-hover:shadow-xs group-hover:border-orange-200`}
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
      className={`${size} ${rounded} bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 text-orange-600 border border-orange-200/80 flex items-center justify-center font-black ${iconSize} shadow-2xs shrink-0 select-none group-hover:scale-105 transition-all duration-200 group-hover:border-orange-300`}
      title={name}
    >
      {initial}
    </div>
  );
};

/* ─── Main Company Details Page ───────────────────────────── */
const CompanyDetail = () => {
  const { user } = useSelector((state) => state.auth || {});

  // Roles authorized to add / edit companies
  const isAuthorizedToManage = ["superadmin", "admin", "placement_officer", "hod"].includes(user?.role);

  const { data: companiesRes, isLoading, error, refetch } = useGetAllCompaniesQuery();
  const [toggleStatus] = useToggleCompanyStatusMutation();

  const companies = useMemo(() => {
    return companiesRes?.data || companiesRes || [];
  }, [companiesRes]);

  // Tab & Filters State
  const defaultCompanyFilters = useMemo(() => ({
    activeTab: "All",
    searchTerm: "",
    industryFilter: "All",
    locationFilter: "All",
  }), []);

  const {
    filters: companyFilters,
    updateFilter: updateCompanyFilter,
    resetAllFilters: resetAllCompanyFilters,
  } = usePersistentFilters("company_detail_filters", defaultCompanyFilters);

  const activeTab = companyFilters.activeTab || "All";
  const searchTerm = companyFilters.searchTerm || "";
  const industryFilter = companyFilters.industryFilter || "All";
  const locationFilter = companyFilters.locationFilter || "All";

  const setActiveTab = (t) => {
    updateCompanyFilter("activeTab", t);
    setCurrentPage(1);
  };
  const setSearchTerm = (s) => {
    updateCompanyFilter("searchTerm", s);
    setCurrentPage(1);
  };
  const setIndustryFilter = (ind) => {
    updateCompanyFilter("industryFilter", ind);
    setCurrentPage(1);
  };
  const setLocationFilter = (loc) => {
    updateCompanyFilter("locationFilter", loc);
    setCurrentPage(1);
  };

  const activeCompanyChips = useMemo(() => {
    const chips = [];
    if (activeTab !== "All") {
      chips.push({
        key: "tab",
        label: "Status",
        value: activeTab,
        displayValue: activeTab,
        onRemove: () => setActiveTab("All"),
      });
    }
    if (industryFilter !== "All") {
      chips.push({
        key: "industry",
        label: "Industry",
        value: industryFilter,
        displayValue: industryFilter,
        onRemove: () => setIndustryFilter("All"),
      });
    }
    if (locationFilter !== "All") {
      chips.push({
        key: "location",
        label: "Location",
        value: locationFilter,
        displayValue: locationFilter,
        onRemove: () => setLocationFilter("All"),
      });
    }
    if (searchTerm.trim()) {
      chips.push({
        key: "search",
        label: "Search",
        value: searchTerm,
        displayValue: `"${searchTerm}"`,
        onRemove: () => setSearchTerm(""),
      });
    }
    return chips;
  }, [activeTab, industryFilter, locationFilter, searchTerm]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState(null);
  const [profileCompanyId, setProfileCompanyId] = useState(null);

  // Dynamic dropdown options
  const industryOptions = useMemo(() => {
    const list = companies.map((c) => c.industry).filter(Boolean);
    return ["All", ...new Set(list)].sort();
  }, [companies]);

  const locationOptions = useMemo(() => {
    const list = companies.map((c) => c.location || c.city).filter(Boolean);
    return ["All", ...new Set(list)].sort();
  }, [companies]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, industryFilter, locationFilter]);

  // Stats calculation
  const activeCount = useMemo(() => companies.filter((c) => (c.status || "Active") === "Active").length, [companies]);
  const inactiveCount = useMemo(() => companies.filter((c) => c.status === "Inactive").length, [companies]);

  // Status Filter Options for Dropdown
  const statusOptions = useMemo(() => [
    { value: "All", label: `All Partners (${companies.length})` },
    { value: "Active", label: `Active (${activeCount})` },
    { value: "Inactive", label: `Inactive (${inactiveCount})` },
  ], [companies.length, activeCount, inactiveCount]);

  const handleOpenAddModal = () => {
    setCompanyToEdit(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (company) => {
    setCompanyToEdit(company);
    setIsAddModalOpen(true);
  };

  const handleViewProfile = (company) => {
    setProfileCompanyId(company._id);
  };

  const handleToggleStatus = async (company) => {
    try {
      const newStatus = company.status === "Inactive" ? "Active" : "Inactive";
      await toggleStatus({ id: company._id, status: newStatus }).unwrap();
      toast.success(`${company.companyName || "Company"} status changed to ${newStatus}`);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update company status");
    }
  };

  // Filtered dataset
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      // Tab status filter
      if (activeTab === "Active" && (c.status || "Active") !== "Active") return false;
      if (activeTab === "Inactive" && c.status !== "Inactive") return false;

      // Industry filter
      if (industryFilter !== "All" && c.industry !== industryFilter) return false;

      // Location filter
      if (locationFilter !== "All" && c.location !== locationFilter && c.city !== locationFilter) return false;

      // Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matches =
          (c.companyName || "").toLowerCase().includes(q) ||
          (c.hrEmail || "").toLowerCase().includes(q) ||
          (c.companyEmail || "").toLowerCase().includes(q) ||
          (c.location || c.city || "").toLowerCase().includes(q) ||
          (c.contactPersonName || "").toLowerCase().includes(q) ||
          (c.industry || "").toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [companies, activeTab, industryFilter, locationFilter, searchTerm]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredCompanies.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredCompanies.slice(startIndex, startIndex + rowsPerPage);

  const hasActiveFilters = Boolean(searchTerm || industryFilter !== "All" || locationFilter !== "All" || activeTab !== "All");

  const resetFilters = () => {
    resetAllCompanyFilters();
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Header title="Company Details" />
        <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-red-200 text-center shadow-sm space-y-3">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <h3 className="text-base font-extrabold text-slate-800">Error Loading Companies</h3>
            <p className="text-xs text-red-500 font-medium">{error?.data?.message || "Failed to load partner companies directory"}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Retry Loading
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Company Details"
        badge={`${companies.length} Companies`}
        breadcrumbs={[{ label: "Placements", path: "/placements/dashboard" }, { label: "Company Details" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Refresh Directory"
            >
              <MdRefresh size={16} />
              {/* <span className="hidden sm:inline">Refresh</span> */}
            </button>
            {isAuthorizedToManage && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="h-9 px-3.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <MdAdd size={17} />
                <span>Add Company</span>
              </button>
            )}
          </div>
        }
      />

      <div className="p-3.5 sm:p-5 lg:p-6 w-full min-h-screen bg-gray-50/40 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">

        {/* Top Control Bar: Search Input & Filter Dropdowns */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xs">

          {/* Search Input on Left - Standard width (relative flex-1 max-w-full md:max-w-md) */}
          <div className="relative flex-1 max-w-full md:max-w-md">
            <MdSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search companies by name, HR, email, location..."
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

          {/* Filter Dropdowns on Right */}
          <div className="flex flex-wrap items-center gap-2.5">

            {/* Status Dropdown */}
            <div className="w-full sm:w-44">
              <SelectDropdown
                value={activeTab}
                onChange={(val) => {
                  setActiveTab(val);
                  setCurrentPage(1);
                }}
                options={statusOptions}
                placeholder="All Partners"
                className="w-full"
                buttonClassName="h-10 w-full flex items-center justify-between gap-1.5 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs hover:border-orange-500 cursor-pointer"
                menuClassName="w-full min-w-[180px] z-50 shadow-xl border border-slate-100 rounded-xl"
              />
            </div>

            {/* Industry Dropdown */}
            <div className="w-full sm:w-44">
              <SelectDropdown
                value={industryFilter}
                onChange={(val) => {
                  setIndustryFilter(val);
                  setCurrentPage(1);
                }}
                options={industryOptions.map((ind) => ({
                  value: ind,
                  label: ind === "All" ? "All Industries" : ind,
                }))}
                placeholder="All Industries"
                className="w-full"
                buttonClassName="h-10 w-full flex items-center justify-between gap-1.5 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs hover:border-orange-500 cursor-pointer"
                menuClassName="w-full min-w-[190px] z-50 shadow-xl border border-slate-100 rounded-xl max-h-60"
              />
            </div>

            {/* Location Dropdown */}
            <div className="w-full sm:w-44">
              <SelectDropdown
                value={locationFilter}
                onChange={(val) => {
                  setLocationFilter(val);
                  setCurrentPage(1);
                }}
                options={locationOptions.map((loc) => ({
                  value: loc,
                  label: loc === "All" ? "All Locations" : loc,
                }))}
                placeholder="All Locations"
                className="w-full"
                buttonClassName="h-10 w-full flex items-center justify-between gap-1.5 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs hover:border-orange-500 cursor-pointer"
                menuClassName="w-full min-w-[190px] z-50 shadow-xl border border-slate-100 rounded-xl max-h-60"
              />
            </div>

            {/* Reset Filters */}
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
          </div>
        </div>

        {activeCompanyChips.length > 0 && (
          <ActiveFilterChips
            chips={activeCompanyChips}
            onClearAll={resetFilters}
          />
        )}

        {/* ── 3. Companies Data View (Mobile Cards + Desktop Table) ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-2xs overflow-hidden">
          {paginatedData.length === 0 ? (
            <div className="p-6 sm:p-10">
              <EmptyState
                title="No Partner Companies Found"
                subtitle={
                  searchTerm
                    ? `No companies matched "${searchTerm}". Try another search term or reset filters.`
                    : "No corporate recruiters match the selected industry and location filters."
                }
                actionText={hasActiveFilters ? "Reset All Filters" : undefined}
                onAction={hasActiveFilters ? resetFilters : undefined}
              />
            </div>
          ) : (
            <>
              {/* Mobile View: Cards Layout (< 768px) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {paginatedData.map((company) => {
                  const isActive = (company.status || "Active") === "Active";

                  return (
                    <div
                      key={company._id}
                      className="p-4 space-y-3 hover:bg-slate-50/60 transition cursor-pointer"
                      onClick={() => handleViewProfile(company)}
                    >
                      {/* Top: Logo + Name + Status */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CompanyLogo company={company} size="w-11 h-11" iconSize="text-xs" rounded="rounded-xl" />
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-xs text-slate-900 truncate">
                              {company.companyName}
                            </h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                              {company.industry || "IT Services"} • {company.companyType || "Partner"}
                            </p>
                          </div>
                        </div>

                        {/* Status Toggle & Badge */}
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                          >
                            {company.status || "Active"}
                          </span>
                          {isAuthorizedToManage && (
                            <button
                              onClick={() => handleToggleStatus(company)}
                              className={`transition cursor-pointer ${isActive ? "text-emerald-600 hover:text-emerald-700" : "text-slate-400 hover:text-slate-600"
                                }`}
                              title={isActive ? "Deactivate company" : "Activate company"}
                            >
                              {isActive ? <MdToggleOn size={24} /> : <MdToggleOff size={24} />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Middle: Contact & Location Info */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-800 text-[11px] truncate">
                            {company.contactPersonName || company.hrEmail?.split("@")[0] || "Corporate HR"}
                          </p>
                          {(company.contactPersonEmail || company.companyEmail || company.hrEmail) && (
                            <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                              <MdEmail className="text-slate-400 shrink-0" />
                              {company.contactPersonEmail || company.companyEmail || company.hrEmail}
                            </p>
                          )}
                        </div>

                        <span className="text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                          <MdLocationOn size={12} className="text-orange-500" />
                          {company.location || company.city || "Pan-India"}
                        </span>
                      </div>

                      {/* Bottom Action Bar */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                        {company.contactPersonPhone || company.companyContact || company.hrContact ? (
                          <a
                            href={`tel:${company.contactPersonPhone || company.companyContact || company.hrContact}`}
                            className="text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition hover:border-orange-400"
                          >
                            <MdPhone size={12} className="text-orange-500" />
                            {company.contactPersonPhone || company.companyContact || company.hrContact}
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No contact phone</span>
                        )}

                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            onClick={() => handleViewProfile(company)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] transition shadow-2xs cursor-pointer flex items-center gap-1"
                          >
                            <MdVisibility size={13} /> View
                          </button>
                          {isAuthorizedToManage && (
                            <button
                              onClick={() => handleOpenEditModal(company)}
                              className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-[11px] transition shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <MdEdit size={13} /> Edit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View: Full Data Table (>= 768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      <th className="py-4 px-3 w-14 text-center">S.No.</th>
                      <th className="py-4 px-5 text-center">Company Profile</th>
                      <th className="py-4 px-5 text-center">HR / Point of Contact</th>
                      <th className="py-4 px-4 text-center">Location</th>
                      <th className="py-4 px-4 text-center">Status</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {paginatedData.map((company, idx) => {
                      const isActive = (company.status || "Active") === "Active";
                      const hrEmail = company.contactPersonEmail || company.companyEmail || company.hrEmail;
                      const hrPhone = company.contactPersonPhone || company.companyContact || company.hrContact;
                      const hrName = company.contactPersonName || (hrEmail ? hrEmail.split("@")[0] : "—");

                      return (
                        <tr
                          key={company._id}
                          onClick={() => handleViewProfile(company)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group border-b border-slate-100"
                        >
                          {/* S.No. */}
                          <td className="py-4 px-3 text-center align-middle font-semibold text-slate-500 text-xs">
                            {startIndex + idx + 1}
                          </td>

                          {/* Company Name & Logo */}
                          <td className="py-4 px-5 text-left align-middle">
                            <div className="flex items-center gap-3">
                              <CompanyLogo company={company} size="w-10 h-10" iconSize="text-xs" rounded="rounded-xl" />
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 group-hover:text-orange-600 transition truncate text-xs sm:text-sm">
                                  {company.companyName}
                                </p>
                                <p className="text-[11px] text-slate-400 font-medium truncate">
                                  {company.industry || "IT Services"} {company.companyType ? `• ${company.companyType}` : ""}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* HR Liaison */}
                          <td className="py-4 px-5 text-left align-middle">
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-800 text-xs truncate">
                                {hrName}
                              </p>
                              <div className="flex items-center gap-2.5 text-[11px] text-slate-500 flex-wrap">
                                {hrEmail && (
                                  <span className="inline-flex items-center gap-1 text-slate-500 truncate" title={hrEmail}>
                                    <MdEmail className="text-slate-400 shrink-0" size={13} />
                                    <span className="truncate max-w-[170px]">{hrEmail}</span>
                                  </span>
                                )}
                                {hrPhone && (
                                  <span className="inline-flex items-center gap-1 text-slate-500" title={hrPhone}>
                                    <MdPhone className="text-slate-400 shrink-0" size={13} />
                                    <span>{hrPhone}</span>
                                  </span>
                                )}
                                {!hrEmail && !hrPhone && (
                                  <span className="text-slate-400 italic text-[11px]">—</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Location */}
                          <td className="py-4 px-4 text-center align-middle">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg shadow-2xs">
                              <MdLocationOn className="text-orange-500 shrink-0" size={13} />
                              <span className="truncate max-w-[140px]">{company.location || company.city || "Pan-India"}</span>
                            </span>
                          </td>

                          {/* Status & Toggle */}
                          <td className="py-4 px-4 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-2 justify-center">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold shadow-2xs ${isActive
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                                {company.status || "Active"}
                              </span>

                              {isAuthorizedToManage && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(company)}
                                  className={`p-0.5 rounded-lg transition cursor-pointer hover:bg-slate-100 ${isActive ? "text-emerald-600 hover:text-emerald-700" : "text-slate-400 hover:text-slate-600"
                                    }`}
                                  title={isActive ? "Mark company as Inactive" : "Mark company as Active"}
                                >
                                  {isActive ? <MdToggleOn size={22} /> : <MdToggleOff size={22} />}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-4 px-6 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleViewProfile(company)}
                                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 text-slate-700 font-bold text-xs transition shadow-2xs cursor-pointer flex items-center gap-1 active:scale-95"
                                title="View Company Profile"
                              >
                                <MdVisibility size={14} /> <span>View</span>
                              </button>

                              {isAuthorizedToManage && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(company)}
                                  className="px-2.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition shadow-2xs cursor-pointer flex items-center gap-1 active:scale-95"
                                  title="Edit Company Details"
                                >
                                  <MdEdit size={14} /> <span>Edit</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Footer */}
              <div className="border-t border-slate-200/80 px-3 sm:px-6 py-3 sm:py-4 bg-white rounded-b-2xl sm:rounded-b-3xl">
                <Pagination
                  totalItems={filteredCompanies.length}
                  currentPage={currentPage}
                  pageSize={rowsPerPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  label="companies"
                />
              </div>
            </>
          )}
        </div>

      </div>

      {/* ── Add / Edit Company Modal ── */}
      <AddCompanyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        companyToEdit={companyToEdit}
        onSuccess={() => refetch()}
        onViewCompany={(comp) => setProfileCompanyId(comp._id)}
      />

      {/* ── View Company Profile Modal / Drawer ── */}
      <CompanyProfileModal
        isOpen={Boolean(profileCompanyId)}
        onClose={() => setProfileCompanyId(null)}
        companyId={profileCompanyId}
        onEdit={(comp) => handleOpenEditModal(comp)}
      />
    </>
  );
};

export default CompanyDetail;