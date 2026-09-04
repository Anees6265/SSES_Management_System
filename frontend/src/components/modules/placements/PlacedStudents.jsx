import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useGetPlacedStudentsByCompanyQuery } from '../../../redux/api/authApi';
import Loader from '../../shared/loader/Loader';
import CommonTable from '../../shared/table/CommonTable';
import Header from '../../shared/sidebar/Header';
import Avatar from '../../shared/Avatar';
import { MdArrowBack, MdBusiness, MdPeople, MdEmail, MdPhone, MdLocationOn, MdAttachMoney, MdSearch } from 'react-icons/md';

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
          <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/company-details")}
                  className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition"
                >
                  <MdArrowBack className="text-xl" />
                </button>
                <div>
                  <h1 className="text-xl font-extrabold text-gray-800">{apiCompanyName}</h1>
                  <p className="text-xs text-gray-500">Recruiting Partner Placements</p>
                </div>
              </div>
            </div>

            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <MdPeople className="text-5xl text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-800">No Students Placed Yet</h3>
              <p className="text-xs text-gray-400 mt-1">No confirmed offers recorded for {apiCompanyName}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-slate-50 min-h-screen p-6">
        <Header title="Placed Students Error" />
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-red-200 text-center shadow-sm mt-12">
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

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* ── Company Header Banner Card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/company-details")}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition shrink-0"
              title="Back to Company Details"
            >
              <MdArrowBack className="text-xl" />
            </button>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 text-white font-extrabold rounded-2xl flex items-center justify-center text-xl shadow-xs shrink-0">
              {apiCompanyName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">{apiCompanyName}</h1>
                <span className="bg-emerald-100 text-emerald-700 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {totalPlaced} Placed
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">List of all students hired by {apiCompanyName}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input
                type="text"
                placeholder="Search placed student name, role, or stream..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-64 transition"
              />
            </div>
          </div>
        </div>

        {/* ── Main Common Table ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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

      </div>
    </div>
  );
};

export default PlacedStudents;