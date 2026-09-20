import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  useGetAllCompaniesQuery,
  useToggleCompanyStatusMutation
} from '../../../redux/api/authApi';
import Loader from '../../shared/loader/Loader';
import CommonTable from '../../shared/table/CommonTable';
import Header from '../../shared/sidebar/Header';
import StatsCard from './dashboard/StatsCard';
import AddCompanyModal from './AddCompanyModal';
import CompanyProfileModal from './CompanyProfileModal';
import EmptyState from '../../shared/empty-state/EmptyState';
import {
  MdBusiness, MdPeople, MdLocationOn, MdEmail, MdPhone,
  MdSearch, MdAdd, MdEdit, MdVisibility, MdToggleOn, MdToggleOff, MdFilterList, MdClose
} from 'react-icons/md';

const CompanyDetail = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth || {});

  // Roles authorized to manage companies
  const isAuthorizedToManage = ["superadmin", "admin", "placement_officer"].includes(user?.role);

  const { data, isLoading, error, refetch } = useGetAllCompaniesQuery();
  const [toggleStatus] = useToggleCompanyStatusMutation();

  const companies = data?.data || data || [];

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [mobilePage, setMobilePage] = useState(1);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState(null);
  const [profileCompanyId, setProfileCompanyId] = useState(null);

  // Dynamic filter dropdown options
  const industryOptions = ['All', ...new Set(companies.map(c => c.industry).filter(Boolean))];
  const locationOptions = ['All', ...new Set(companies.map(c => c.location || c.city).filter(Boolean))];

  // Reset mobile page on filter change
  React.useEffect(() => {
    setMobilePage(1);
  }, [searchTerm, industryFilter, locationFilter, statusFilter]);

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
      toast.success(`Company status changed to ${newStatus}`);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to toggle status");
    }
  };

  const filteredCompanies = companies.filter((c) => {
    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchesSearch = (
        c.companyName?.toLowerCase().includes(q) ||
        c.hrEmail?.toLowerCase().includes(q) ||
        c.companyEmail?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q) ||
        c.contactPersonName?.toLowerCase().includes(q) ||
        c.industry?.toLowerCase().includes(q)
      );
      if (!matchesSearch) return false;
    }

    // Industry Filter
    if (industryFilter !== 'All' && c.industry !== industryFilter) {
      return false;
    }

    // Location Filter
    if (locationFilter !== 'All' && (c.location !== locationFilter && c.city !== locationFilter)) {
      return false;
    }

    // Status Filter
    if (statusFilter !== 'All') {
      const compStatus = c.status || 'Active';
      if (compStatus !== statusFilter) return false;
    }

    return true;
  });

  const columns = [
    {
      key: "profile",
      label: "Company Name",
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.companyLogo ? (
            <img
              src={row.companyLogo}
              alt={row.companyName}
              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
            />
          ) : (
            <div className="w-10 h-10 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
              {row.companyName?.charAt(0)?.toUpperCase() || 'C'}
            </div>
          )}
          <div>
            <p
              onClick={() => handleViewProfile(row)}
              className="font-semibold text-slate-900 text-xs sm:text-sm hover:text-slate-700 cursor-pointer transition"
            >
              {row.companyName}
            </p>
            <span className="text-[11px] text-slate-400 font-medium">
              {row.industry || 'IT Services'} • {row.companyType || 'Partner Company'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "contactPerson",
      label: "Contact Person / HR",
      render: (row) => (
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-slate-800">
            {row.contactPersonName || row.hrEmail?.split('@')[0] || "TPO Liaison"}
          </p>
          <span className="text-[11px] font-normal text-slate-500 flex items-center gap-1">
            <MdEmail className="text-slate-400" /> {row.contactPersonEmail || row.companyEmail || row.hrEmail || "—"}
          </span>
        </div>
      )
    },
    {
      key: "hrContact",
      label: "Contact Phone",
      render: (row) => (
        <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
          <MdPhone className="text-slate-400" /> {row.contactPersonPhone || row.companyContact || row.hrContact || '—'}
        </span>
      ),
    },
    {
      key: "location",
      label: "Location",
      render: (row) => (
        <span className="text-xs font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 flex items-center gap-1.5 w-fit">
          <MdLocationOn className="text-slate-400" /> {row.location || row.city || "—"}
        </span>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const isActive = (row.status || 'Active') === 'Active';
        return (
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {row.status || 'Active'}
            </span>

            {isAuthorizedToManage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleStatus(row);
                }}
                title={isActive ? "Mark as Inactive" : "Mark as Active"}
                className={`text-lg transition cursor-pointer ${isActive ? "text-emerald-600 hover:text-emerald-700" : "text-slate-400 hover:text-slate-600"}`}
              >
                {isActive ? <MdToggleOn size={24} /> : <MdToggleOff size={24} />}
              </button>
            )}
          </div>
        );
      }
    },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleViewProfile(row)}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium px-3 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1"
          >
            <MdVisibility size={14} /> View
          </button>

          {isAuthorizedToManage && (
            <button
              onClick={() => handleOpenEditModal(row)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium px-3 py-1.5 rounded-xl transition flex items-center gap-1"
            >
              <MdEdit size={14} /> Edit
            </button>
          )}
        </div>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-50 min-h-screen p-6">
        <Header title="Company Details" />
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-red-200 text-center shadow-sm mt-12">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl mb-3">
            ⚠️
          </div>
          <h3 className="text-base font-bold text-gray-800">Error Loading Companies</h3>
          <p className="text-xs text-red-500 mt-1">{error?.data?.message || 'Something went wrong while fetching companies'}</p>
        </div>
      </div>
    );
  }

  const totalMobilePages = Math.ceil(filteredCompanies.length / 10) || 1;
  const paginatedMobileCompanies = filteredCompanies.slice((mobilePage - 1) * 10, mobilePage * 10);

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <Header 
        title="Company Details" 
        breadcrumbs={[{ label: "Placements", path: "/placements/dashboard" }, { label: "Companies" }]}
      />

      <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">

        {/* ── Top Summary Stats Cards (2x2 on mobile) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard
            title="Total Companies"
            value={companies.length}
            icon={<MdBusiness />}
            color="slate"
            trend="Recruiter Network"
            sub="registered partners"
          />
          <StatsCard
            title="Active Partners"
            value={companies.filter(c => (c.status || 'Active') === 'Active').length}
            icon={<MdPeople />}
            color="green"
            trend="Active Status"
            sub="eligible for drives"
          />
          <StatsCard
            title="Drive Locations"
            value={new Set(companies.map(c => c.location || c.city).filter(Boolean)).size || 1}
            icon={<MdLocationOn />}
            color="blue"
            trend="Pan-India Drives"
            sub="hiring hubs"
          />
          <StatsCard
            title="Corporate Contacts"
            value={companies.filter(c => c.contactPersonName || c.hrEmail).length}
            icon={<MdEmail />}
            color="purple"
            trend="Verified HRs"
            sub="active TPO contacts"
          />
        </div>

        {/* ── Toolbar: Action Button + Search & Filters ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-3.5 sm:p-4 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm sm:text-base">Corporate Recruiting Master Database</h3>
              <p className="text-xs text-slate-500">Centralized database of placement partner companies and recruiters</p>
            </div>

            {isAuthorizedToManage && (
              <button
                onClick={handleOpenAddModal}
                className="bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium text-xs px-4 py-2.5 rounded-xl transition shadow-2xs flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto cursor-pointer"
              >
                <MdAdd size={18} /> Add Company
              </button>
            )}
          </div>

          {/* Search Bar & Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-2 border-t border-slate-100">
            {/* Search Input */}
            <div className="relative">
              <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
              <input
                type="text"
                placeholder="Search company, HR, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white w-full transition"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <MdClose size={16} />
                </button>
              )}
            </div>

            {/* Industry Filter */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl">
              <MdFilterList className="text-slate-400 shrink-0" />
              <span className="text-[11px] font-medium text-slate-500 shrink-0">Industry:</span>
              <select
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-800 outline-none w-full cursor-pointer truncate"
              >
                {industryOptions.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl">
              <MdLocationOn className="text-slate-400 shrink-0" />
              <span className="text-[11px] font-medium text-slate-500 shrink-0">Location:</span>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-800 outline-none w-full cursor-pointer truncate"
              >
                {locationOptions.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-medium text-slate-500 shrink-0">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-800 outline-none w-full cursor-pointer truncate"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Main Content View (Mobile Cards + Desktop Table) ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-slate-100">
            {paginatedMobileCompanies.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No Companies Found"
                  subtitle={
                    searchTerm
                      ? `No companies match "${searchTerm}". Try a different keyword.`
                      : "No registered companies are currently available in the directory."
                  }
                  actionText={searchTerm ? "Clear Search" : undefined}
                  onAction={searchTerm ? () => setSearchTerm("") : undefined}
                />
              </div>
            ) : (
              paginatedMobileCompanies.map((row) => {
                const isActive = (row.status || 'Active') === 'Active';

                return (
                  <div
                    key={row._id}
                    className="p-4 space-y-3 hover:bg-slate-50/50 transition border-b border-slate-100 last:border-0"
                  >
                    {/* Header: Logo + Name + Status */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {row.companyLogo ? (
                          <img
                            src={row.companyLogo}
                            alt={row.companyName}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
                            {row.companyName?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p
                            onClick={() => handleViewProfile(row)}
                            className="font-semibold text-xs text-slate-900 hover:text-slate-700 transition cursor-pointer truncate"
                          >
                            {row.companyName}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {row.industry || 'IT Services'} • {row.companyType || 'Partner'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[9px] font-medium px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {row.status || 'Active'}
                        </span>
                        {isAuthorizedToManage && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(row);
                            }}
                            className={`text-lg cursor-pointer ${isActive ? "text-emerald-600 hover:text-emerald-700" : "text-slate-400 hover:text-slate-600"}`}
                          >
                            {isActive ? <MdToggleOn size={22} /> : <MdToggleOff size={22} />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Contact & Location Info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-[11px] truncate">
                          {row.contactPersonName || row.hrEmail?.split('@')[0] || "HR Liaison"}
                        </p>
                        {(row.contactPersonEmail || row.companyEmail || row.hrEmail) && (
                          <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                            <MdEmail className="text-slate-400 shrink-0" /> {row.contactPersonEmail || row.companyEmail || row.hrEmail}
                          </p>
                        )}
                      </div>

                      <span className="text-[10px] font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1 shrink-0">
                        <MdLocationOn size={12} className="text-slate-400" /> {row.location || row.city || "—"}
                      </span>
                    </div>

                    {/* Contact Phone & Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                      {row.contactPersonPhone || row.companyContact || row.hrContact ? (
                        <a
                          href={`tel:${row.contactPersonPhone || row.companyContact || row.hrContact}`}
                          className="text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                        >
                          <MdPhone size={12} className="text-slate-400" /> {row.contactPersonPhone || row.companyContact || row.hrContact}
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400">No phone</span>
                      )}

                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          onClick={() => handleViewProfile(row)}
                          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium px-2.5 py-1 rounded-xl transition shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                          <MdVisibility size={13} /> View
                        </button>
                        {isAuthorizedToManage && (
                          <button
                            onClick={() => handleOpenEditModal(row)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium px-2.5 py-1 rounded-xl transition flex items-center gap-1 cursor-pointer"
                          >
                            <MdEdit size={13} /> Edit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Mobile Pagination */}
            {filteredCompanies.length > 10 && (
              <div className="flex items-center justify-between p-3 border-t border-gray-100 bg-gray-50/60 text-xs">
                <button
                  onClick={() => setMobilePage(p => Math.max(1, p - 1))}
                  disabled={mobilePage === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-bold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                >
                  Previous
                </button>
                <span className="text-gray-500 font-medium text-[11px]">
                  Page <strong className="text-gray-800">{mobilePage}</strong> of {totalMobilePages}
                </span>
                <button
                  onClick={() => setMobilePage(p => Math.min(totalMobilePages, p + 1))}
                  disabled={mobilePage >= totalMobilePages}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-bold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <CommonTable
              columns={columns}
              data={filteredCompanies}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onRowClick={handleViewProfile}
              pagination
              rowsPerPage={10}
            />
          </div>
        </div>

      </div>

      {/* Add / Edit Company Modal */}
      <AddCompanyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        companyToEdit={companyToEdit}
        onSuccess={() => refetch()}
        onViewCompany={(comp) => setProfileCompanyId(comp._id)}
      />

      {/* View Company Profile Drawer / Modal */}
      <CompanyProfileModal
        isOpen={Boolean(profileCompanyId)}
        onClose={() => setProfileCompanyId(null)}
        companyId={profileCompanyId}
        onEdit={(comp) => handleOpenEditModal(comp)}
      />
    </div>
  );
};

export default CompanyDetail;