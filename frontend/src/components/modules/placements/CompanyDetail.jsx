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
} from "react-icons/md";

const STATUS_TABS = [
  { id: "All", label: "All Partners", icon: MdApartment },
  { id: "Active", label: "Active Recruiters", icon: MdCheckCircle },
  { id: "Inactive", label: "Inactive / Paused", icon: MdToggleOff },
];

/* ─── Metric Card Component ───────────────────────────────── */
const CompanyStatCard = ({ title, count, subtitle, icon: Icon, isActive, onClick, color = "orange" }) => {
  const colorStyles = {
    orange: "text-orange-500 bg-orange-50 border-orange-100",
    emerald: "text-emerald-500 bg-emerald-50 border-emerald-100",
    slate: "text-slate-500 bg-slate-50 border-slate-200",
    blue: "text-blue-500 bg-blue-50 border-blue-100",
    purple: "text-purple-500 bg-purple-50 border-purple-100",
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
      {isActive && (
        <span className="absolute top-0 left-0 right-0 h-1 bg-orange-500" />
      )}
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
  const [activeTab, setActiveTab] = useState("All"); // All | Active | Inactive
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
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
  const locationCount = useMemo(() => new Set(companies.map((c) => c.location || c.city).filter(Boolean)).size, [companies]);
  const contactCount = useMemo(() => companies.filter((c) => c.contactPersonName || c.hrEmail).length, [companies]);

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
    setSearchTerm("");
    setIndustryFilter("All");
    setLocationFilter("All");
    setActiveTab("All");
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
      />

      <div className="p-3 sm:p-5 lg:p-6 w-full min-h-screen bg-gray-50/40 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
        
        {/* ── 1. Top Metrics Cards (5 Cards) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <CompanyStatCard
            title="Total Partners"
            count={companies.length}
            subtitle="Registered recruiting network"
            icon={MdApartment}
            color="orange"
            isActive={activeTab === "All"}
            onClick={() => setActiveTab("All")}
          />
          <CompanyStatCard
            title="Active Recruiters"
            count={activeCount}
            subtitle="Eligible for campus drives"
            icon={MdCheckCircle}
            color="emerald"
            isActive={activeTab === "Active"}
            onClick={() => setActiveTab("Active")}
          />
          <CompanyStatCard
            title="Inactive / On Hold"
            count={inactiveCount}
            subtitle="Paused corporate accounts"
            icon={MdToggleOff}
            color="slate"
            isActive={activeTab === "Inactive"}
            onClick={() => setActiveTab("Inactive")}
          />
          <CompanyStatCard
            title="Drive Locations"
            count={locationCount}
            subtitle="Pan-India hiring hubs"
            icon={MdLocationOn}
            color="blue"
            isActive={false}
          />
          <CompanyStatCard
            title="Verified HRs"
            count={contactCount}
            subtitle="Active liaison contacts"
            icon={MdPeople}
            color="purple"
            isActive={false}
          />
        </div>

        {/* ── 2. Navigation Tabs & Filter Bar ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3.5">
          
          {/* Top Row: Status Tabs & Add Company Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1">
              {STATUS_TABS.map((tab) => {
                const isCurrent = activeTab === tab.id;
                const Icon = tab.icon;
                const count =
                  tab.id === "All"
                    ? companies.length
                    : tab.id === "Active"
                    ? activeCount
                    : inactiveCount;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shrink-0 ${
                      isCurrent
                        ? "bg-orange-500 text-white shadow-xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                    }`}
                  >
                    <Icon size={15} />
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                        isCurrent ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {isAuthorizedToManage && (
              <button
                onClick={handleOpenAddModal}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer shrink-0"
              >
                <MdAdd size={17} />
                <span>Add Company</span>
              </button>
            )}
          </div>

          {/* Bottom Row: Search & Multi-Dropdown Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <MdSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search companies..."
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

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* Industry Dropdown */}
              <div className="w-40 sm:w-44">
                <SelectDropdown
                  value={industryFilter}
                  onChange={(val) => setIndustryFilter(val)}
                  options={industryOptions.map((ind) => ({
                    value: ind,
                    label: ind === "All" ? "All Industries" : ind,
                  }))}
                  buttonClassName="h-10 w-full flex items-center justify-between gap-1.5 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs hover:border-orange-400 cursor-pointer"
                />
              </div>

              {/* Location Dropdown */}
              <div className="w-40 sm:w-44">
                <SelectDropdown
                  value={locationFilter}
                  onChange={(val) => setLocationFilter(val)}
                  options={locationOptions.map((loc) => ({
                    value: loc,
                    label: loc === "All" ? "All Locations" : loc,
                  }))}
                  buttonClassName="h-10 w-full flex items-center justify-between gap-1.5 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs hover:border-orange-400 cursor-pointer"
                />
              </div>

              {/* Reset Filters */}
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="h-10 px-3 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <MdClose size={15} /> Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

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
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {company.status || "Active"}
                          </span>
                          {isAuthorizedToManage && (
                            <button
                              onClick={() => handleToggleStatus(company)}
                              className={`transition cursor-pointer ${
                                isActive ? "text-emerald-600 hover:text-emerald-700" : "text-slate-400 hover:text-slate-600"
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
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="py-4 px-5">COMPANY PROFILE</th>
                      <th className="py-4 px-5">HR / LIAISON CONTACT</th>
                      <th className="py-4 px-4">LOCATION</th>
                      <th className="py-4 px-4">STATUS</th>
                      <th className="py-4 px-5 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {paginatedData.map((company) => {
                      const isActive = (company.status || "Active") === "Active";

                      return (
                        <tr
                          key={company._id}
                          onClick={() => handleViewProfile(company)}
                          className="hover:bg-slate-50/70 transition cursor-pointer group"
                        >
                          {/* Company Name & Logo */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <CompanyLogo company={company} size="w-12 h-12" iconSize="text-sm" rounded="rounded-xl" />
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-900 group-hover:text-orange-600 transition truncate max-w-[200px]">
                                  {company.companyName}
                                </p>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {company.industry || "IT Services"} • {company.companyType || "Partner Company"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* HR Liaison */}
                          <td className="py-4 px-5">
                            <div className="space-y-0.5">
                              <p className="font-extrabold text-slate-900 text-xs truncate max-w-[190px]">
                                {company.contactPersonName || company.hrEmail?.split("@")[0] || "TPO Liaison"}
                              </p>
                              <div className="flex flex-col gap-0.5 text-[11px] text-slate-400">
                                {(company.contactPersonEmail || company.companyEmail || company.hrEmail) && (
                                  <span className="flex items-center gap-1 text-slate-500 truncate max-w-[190px]">
                                    <MdEmail className="text-slate-400 shrink-0" />
                                    {company.contactPersonEmail || company.companyEmail || company.hrEmail}
                                  </span>
                                )}
                                {(company.contactPersonPhone || company.companyContact || company.hrContact) && (
                                  <span className="flex items-center gap-1 text-slate-500">
                                    <MdPhone className="text-slate-400 shrink-0" />
                                    {company.contactPersonPhone || company.companyContact || company.hrContact}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Location */}
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                              <MdLocationOn className="text-orange-500 shrink-0" />
                              {company.location || company.city || "Pan-India"}
                            </span>
                          </td>

                          {/* Status & Toggle */}
                          <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider flex items-center gap-1 ${
                                  isActive
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                                {company.status || "Active"}
                              </span>

                              {isAuthorizedToManage && (
                                <button
                                  onClick={() => handleToggleStatus(company)}
                                  className={`transition cursor-pointer ${
                                    isActive ? "text-emerald-600 hover:text-emerald-700" : "text-slate-400 hover:text-slate-600"
                                  }`}
                                  title={isActive ? "Mark company as Inactive" : "Mark company as Active"}
                                >
                                  {isActive ? <MdToggleOn size={24} /> : <MdToggleOff size={24} />}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleViewProfile(company)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition shadow-2xs cursor-pointer flex items-center gap-1 active:scale-95"
                              >
                                <MdVisibility size={14} /> View
                              </button>

                              {isAuthorizedToManage && (
                                <button
                                  onClick={() => handleOpenEditModal(company)}
                                  className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs transition shadow-xs cursor-pointer flex items-center gap-1 active:scale-95"
                                >
                                  <MdEdit size={14} /> Edit
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
              <div className="border-t border-gray-200 px-3 sm:px-6 py-3 sm:py-4 bg-gray-100 rounded-b-2xl sm:rounded-b-3xl">
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