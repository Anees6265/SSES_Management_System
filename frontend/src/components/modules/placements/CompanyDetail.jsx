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
import {
  MdBusiness, MdPeople, MdLocationOn, MdEmail, MdPhone,
  MdSearch, MdAdd, MdEdit, MdVisibility, MdToggleOn, MdToggleOff, MdFilterList
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

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState(null);
  const [profileCompanyId, setProfileCompanyId] = useState(null);

  // Dynamic filter dropdown options
  const industryOptions = ['All', ...new Set(companies.map(c => c.industry).filter(Boolean))];
  const locationOptions = ['All', ...new Set(companies.map(c => c.location || c.city).filter(Boolean))];

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
              className="w-10 h-10 rounded-xl object-cover border border-gray-100 shadow-xs"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
              {row.companyName?.charAt(0)?.toUpperCase() || 'C'}
            </div>
          )}
          <div>
            <p
              onClick={() => handleViewProfile(row)}
              className="font-bold text-gray-800 text-sm hover:text-orange-600 cursor-pointer transition"
            >
              {row.companyName}
            </p>
            <span className="text-[10px] text-gray-400 font-medium">
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
          <p className="text-xs font-bold text-gray-800">
            {row.contactPersonName || row.hrEmail?.split('@')[0] || "TPO Liaison"}
          </p>
          <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
            <MdEmail className="text-gray-400" /> {row.contactPersonEmail || row.companyEmail || row.hrEmail || "—"}
          </span>
        </div>
      )
    },
    {
      key: "hrContact",
      label: "Contact Phone",
      render: (row) => (
        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
          <MdPhone className="text-gray-400" /> {row.contactPersonPhone || row.companyContact || row.hrContact || 'N/A'}
        </span>
      ),
    },
    {
      key: "location",
      label: "Location",
      render: (row) => (
        <span className="text-xs font-bold text-gray-700 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100 flex items-center gap-1 w-fit">
          <MdLocationOn /> {row.location || row.city || "N/A"}
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
              className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-red-50 text-red-600 border-red-200"
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
                className={`text-lg transition ${isActive ? "text-emerald-500 hover:text-emerald-700" : "text-gray-400 hover:text-gray-600"}`}
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
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1"
          >
            <MdVisibility size={14} /> View
          </button>

          {isAuthorizedToManage && (
            <button
              onClick={() => handleOpenEditModal(row)}
              className="bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1"
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

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <Header 
        title="Company Details" 
        breadcrumbs={[{ label: "Placements", path: "/placements/dashboard" }, { label: "Companies" }]}
      />

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* ── Top Summary Stats Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Recruiting Companies"
            value={companies.length}
            icon={<MdBusiness />}
            color="orange"
            trend="Recruiter Network"
            sub="registered campus partners"
          />
          <StatsCard
            title="Active Hiring Partners"
            value={companies.filter(c => (c.status || 'Active') === 'Active').length}
            icon={<MdPeople />}
            color="green"
            trend="Active Status"
            sub="eligible for new drives"
          />
          <StatsCard
            title="Active Drive Locations"
            value={new Set(companies.map(c => c.location || c.city).filter(Boolean)).size || 1}
            icon={<MdLocationOn />}
            color="blue"
            trend="Pan-India Drives"
            sub="hiring hub locations"
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-800 text-base">Corporate Recruiting Master Database</h3>
              <p className="text-xs text-gray-500">Centralized database of placement partner companies and recruiters</p>
            </div>

            {isAuthorizedToManage && (
              <button
                onClick={handleOpenAddModal}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm flex items-center gap-2 shrink-0 self-start sm:self-auto"
              >
                <MdAdd size={18} /> + Add Company
              </button>
            )}
          </div>

          {/* Search Bar & Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            {/* Search Input */}
            <div className="relative">
              <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input
                type="text"
                placeholder="Search company, HR, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 w-full transition"
              />
            </div>

            {/* Industry Filter */}
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 border border-gray-200 rounded-xl">
              <MdFilterList className="text-gray-400 shrink-0" />
              <span className="text-[11px] font-bold text-gray-500 shrink-0">Industry:</span>
              <select
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-700 outline-none w-full cursor-pointer"
              >
                {industryOptions.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 border border-gray-200 rounded-xl">
              <MdLocationOn className="text-gray-400 shrink-0" />
              <span className="text-[11px] font-bold text-gray-500 shrink-0">Location:</span>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-700 outline-none w-full cursor-pointer"
              >
                {locationOptions.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 border border-gray-200 rounded-xl">
              <span className="text-[11px] font-bold text-gray-500 shrink-0">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-700 outline-none w-full cursor-pointer"
              >
                <option value="All">All Companies</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Data Table View ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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