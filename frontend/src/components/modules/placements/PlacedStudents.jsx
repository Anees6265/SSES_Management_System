import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useGetPlacedStudentsByCompanyQuery } from '../../../redux/api/authApi';
import Loader from '../../shared/loader/Loader';
import CommonTable from '../../shared/table/CommonTable';
import Header from '../../shared/sidebar/Header';
import Avatar from '../../shared/Avatar';
import EmptyState from '../../shared/empty-state/EmptyState';
import { 
  MdArrowBack, MdBusiness, MdPeople, MdEmail, MdPhone, 
  MdLocationOn, MdAttachMoney, MdSearch, MdClose, 
  MdChevronLeft, MdChevronRight, MdCalendarToday, MdArrowForward 
} from 'react-icons/md';

const PlacedStudents = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const companyName = location.state?.companyName || 'Company';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { data, isLoading, error } = useGetPlacedStudentsByCompanyQuery(companyId);
  const students = data?.students || [];
  const apiCompanyName = data?.company || companyName;
  const totalPlaced = data?.totalPlaced || students.length;

  const [searchTerm, setSearchTerm] = useState('');
  const [mobilePage, setMobilePage] = useState(1);
  const MOBILE_PAGE_SIZE = 10;

  const filteredStudents = students.filter((student) => {
    const searchableValues = [
      student.firstName,
      student.lastName,
      student.email,
      student.studentMobile,
      student.course,
      student.stream,
      student.placedInfo?.jobProfile,
      student.placedInfo?.jobType,
      student.placedInfo?.location,
    ].join(' ').toLowerCase();
    return searchableValues.includes(searchTerm.toLowerCase());
  });

  const totalMobilePages = Math.ceil(filteredStudents.length / MOBILE_PAGE_SIZE) || 1;
  const paginatedStudents = filteredStudents.slice(
    (mobilePage - 1) * MOBILE_PAGE_SIZE,
    mobilePage * MOBILE_PAGE_SIZE
  );

  const columns = [
    {
      key: "profile",
      label: "Student Name",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar firstName={row.firstName} lastName={row.lastName} imageUrl={row.profileImage} />
          <div>
            <p className="font-bold text-gray-800 text-sm hover:text-orange-600 transition">
              {`${row.firstName} ${row.lastName}`}
            </p>
            <p className="text-[11px] text-gray-400 font-medium">
              {row.course || 'Course'} {row.stream ? `• ${row.stream}` : ''}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (row) => (
        <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
          <MdEmail className="text-gray-400" /> {row.email}
        </span>
      ),
    },
    {
      key: "studentMobile",
      label: "Phone",
      render: (row) => (
        <span className="text-xs font-semibold text-gray-600">
          {row.studentMobile ? `+91 ${row.studentMobile}` : '—'}
        </span>
      ),
    },
    {
      key: "jobProfile",
      label: "Job Profile / Role",
      render: (row) => (
        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100">
          {row.placedInfo?.jobProfile || 'Job Profile'}
        </span>
      ),
    },
    {
      key: "jobType",
      label: "Offer Type",
      render: (row) => (
        <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold border border-purple-100">
          {row.placedInfo?.jobType || 'Full-Time'}
        </span>
      ),
    },
    {
      key: "salary",
      label: "Offered CTC",
      render: (row) => (
        <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs border border-emerald-100">
          {row.placedInfo?.salary ? `₹${(row.placedInfo.salary / 100000).toFixed(1)} LPA` : '—'}
        </span>
      ),
    },
    {
      key: "placedDate",
      label: "Placed Date",
      render: (row) => (
        <span className="text-xs text-gray-500 font-medium">
          {row.placedInfo?.placedDate 
            ? new Date(row.placedInfo.placedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—'}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader />
      </div>
    );
  }

  if (error) {
    const isNoStudentsError = error?.status === 404 || error?.data?.message?.includes('No students found');
    
    if (isNoStudentsError) {
      return (
        <div className="bg-slate-50 min-h-screen pb-12">
          <Header title={`Placed Students — ${apiCompanyName}`} />
          <div className="p-3.5 sm:p-5 lg:p-6 max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/company-details")}
                  className="p-2 sm:p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition"
                  title="Back to Company Details"
                >
                  <MdArrowBack className="text-lg sm:text-xl" />
                </button>
                <div>
                  <h1 className="text-lg sm:text-xl font-extrabold text-gray-800">{apiCompanyName}</h1>
                  <p className="text-xs text-gray-500">Recruiting Partner Placements</p>
                </div>
              </div>
            </div>

            <EmptyState
              icon={MdPeople}
              title="No Students Placed Yet"
              subtitle={`No confirmed offers recorded for ${apiCompanyName} yet.`}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="bg-slate-50 min-h-screen p-3.5 sm:p-6">
        <Header title="Placed Students Error" />
        <div className="max-w-md mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-red-200 text-center shadow-sm mt-8 sm:mt-12">
          <h3 className="text-base font-bold text-gray-800">Error Loading Students</h3>
          <p className="text-xs text-red-500 mt-1">{error?.data?.message || 'Something went wrong'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <Header
        title={`Placed Students — ${apiCompanyName}`}
        breadcrumbs={[
          { label: "Placements", path: "/placements/dashboard" },
          { label: "Companies", path: "/company-details" },
          { label: apiCompanyName },
        ]}
      />

      <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">

        {/* ── Company Header Banner Card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={() => navigate("/company-details")}
              className="p-2 sm:p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition shrink-0"
              title="Back to Company Details"
            >
              <MdArrowBack className="text-lg sm:text-xl" />
            </button>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-400 to-amber-500 text-white font-extrabold rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-xl shadow-xs shrink-0">
              {apiCompanyName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-gray-800 tracking-tight truncate">{apiCompanyName}</h1>
                <span className="bg-emerald-100 text-emerald-700 text-[11px] sm:text-xs font-extrabold px-2 sm:px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                  {totalPlaced} Placed
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">List of all students hired by {apiCompanyName}</p>
            </div>
          </div>

          <div className="relative w-full md:w-64">
            <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input
              type="text"
              placeholder="Search name, role, stream..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setMobilePage(1);
              }}
              className="pl-10 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 w-full transition"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setMobilePage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                title="Clear Search"
              >
                <MdClose size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ── Desktop View: Common Table ── */}
        <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <CommonTable
            columns={columns}
            data={filteredStudents}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onRowClick={(row) => navigate(`/student-profile/${row._id}`)}
            pagination
            rowsPerPage={10}
          />
        </div>

        {/* ── Mobile View: Cards List ── */}
        <div className="md:hidden space-y-3">
          {filteredStudents.length === 0 ? (
            <EmptyState
              icon={MdPeople}
              title="No Matching Students Found"
              subtitle={searchTerm ? `No placed students match "${searchTerm}".` : "No placed students available."}
              actionText={searchTerm ? "Clear Search" : undefined}
              onAction={searchTerm ? () => setSearchTerm('') : undefined}
              compact
            />
          ) : (
            paginatedStudents.map((row) => (
              <div
                key={row._id}
                onClick={() => navigate(`/student-profile/${row._id}`)}
                className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm space-y-3 active:scale-[0.99] transition-transform cursor-pointer"
              >
                {/* Student Avatar + Name + Link */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar firstName={row.firstName} lastName={row.lastName} imageUrl={row.profileImage} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-800 text-sm truncate">
                        {row.firstName} {row.lastName}
                      </p>
                      <p className="text-[11px] text-gray-400 font-medium truncate">
                        {row.course || 'Course'} {row.stream ? `• ${row.stream}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-gray-300 hover:text-orange-500 text-sm shrink-0">
                    <MdArrowForward size={16} />
                  </span>
                </div>

                {/* Badges / Highlights */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-50 text-xs">
                  {row.placedInfo?.salary && (
                    <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px] border border-emerald-100">
                      ₹{(row.placedInfo.salary / 100000).toFixed(1)} LPA
                    </span>
                  )}
                  {row.placedInfo?.jobProfile && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[11px] font-bold border border-blue-100">
                      {row.placedInfo.jobProfile}
                    </span>
                  )}
                  {row.placedInfo?.jobType && (
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[11px] font-bold border border-purple-100">
                      {row.placedInfo.jobType}
                    </span>
                  )}
                </div>

                {/* Contact info & Placed Date */}
                <div className="space-y-1 pt-2 border-t border-gray-50 text-xs text-gray-600">
                  {row.email && (
                    <a
                      href={`mailto:${row.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 text-[11px] text-gray-600 hover:text-orange-600 truncate"
                    >
                      <MdEmail className="text-gray-400 shrink-0 text-xs" />
                      <span className="truncate">{row.email}</span>
                    </a>
                  )}
                  {row.studentMobile && (
                    <a
                      href={`tel:+91${row.studentMobile}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 text-[11px] text-gray-600 hover:text-orange-600"
                    >
                      <MdPhone className="text-gray-400 shrink-0 text-xs" />
                      <span>+91 {row.studentMobile}</span>
                    </a>
                  )}
                  {row.placedInfo?.placedDate && (
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 pt-0.5">
                      <MdCalendarToday className="shrink-0 text-xs" />
                      <span>
                        Placed: {new Date(row.placedInfo.placedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Mobile Pagination */}
          {filteredStudents.length > MOBILE_PAGE_SIZE && (
            <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-xs flex items-center justify-between text-xs">
              <span className="text-gray-500 text-[11px] font-medium">
                Showing {(mobilePage - 1) * MOBILE_PAGE_SIZE + 1}–
                {Math.min(mobilePage * MOBILE_PAGE_SIZE, filteredStudents.length)} of {filteredStudents.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setMobilePage((p) => Math.max(1, p - 1))}
                  disabled={mobilePage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-30 disabled:pointer-events-none hover:bg-gray-50"
                >
                  <MdChevronLeft size={16} />
                </button>
                <span className="font-bold text-gray-700 px-1">
                  {mobilePage} / {totalMobilePages}
                </span>
                <button
                  onClick={() => setMobilePage((p) => Math.min(totalMobilePages, p + 1))}
                  disabled={mobilePage === totalMobilePages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-30 disabled:pointer-events-none hover:bg-gray-50"
                >
                  <MdChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PlacedStudents;