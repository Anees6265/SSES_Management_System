import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetDepartmentWisePlacementStatsQuery,
  useGetPlacedStudentsByDepartmentQuery,
} from '../../../redux/api/authApi';
import Loader from '../../shared/loader/Loader';
import Header from '../../shared/sidebar/Header';
import Avatar from '../../shared/Avatar';
import StatsCard from './dashboard/StatsCard';
import { MdPeople, MdWork, MdCheckCircle, MdSearch, MdArrowForward, MdSchool, MdFilterList } from 'react-icons/md';

const DepartmentPlacementOverview = () => {
  const navigate = useNavigate();
  const [selectedDept, setSelectedDept] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;

  const { data: statsData, isLoading: statsLoading } = useGetDepartmentWisePlacementStatsQuery();
  const { data: studentsData, isLoading: studentsLoading } = useGetPlacedStudentsByDepartmentQuery(selectedDept);

  const departments = statsData?.data || [];
  const overall = statsData?.overall || {};
  const placedStudents = studentsData?.data || [];

  const filtered = placedStudents.filter((s) => {
    const text = [s.firstName, s.lastName, s.email, s.course, s.placedInfo?.companyName, s.department?.name]
      .join(' ').toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleDeptSelect = (id) => {
    setSelectedDept(id);
    setCurrentPage(1);
    setSearchTerm('');
  };

  const selectedDeptName = departments.find((d) => d.departmentId === selectedDept)?.departmentName;

  if (statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader />
      </div>
    );
  }

  const overallRate = overall.totalStudents > 0 
    ? Math.round(((overall.placedStudents || 0) / overall.totalStudents) * 100) 
    : 0;

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <Header 
        title="Department Placement Overview" 
        breadcrumbs={[
          { label: "Placements", path: "/placements/dashboard" },
          { label: "Department Overview" }
        ]}
      />

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* ── Overall Top Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Batch Students"
            value={overall.totalStudents ?? 0}
            icon={<MdPeople />}
            color="blue"
            trend="↗ Enrolled Batch"
            trendColor="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded"
            sub="across all departments"
          />
          <StatsCard
            title="Total Placed"
            value={overall.placedStudents ?? 0}
            icon={<MdWork />}
            color="green"
            trend="↗ Confirmed Hires"
            trendColor="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded"
            sub="job offers accepted"
          />
          <StatsCard
            title="Ready for Placement"
            value={overall.readyStudents ?? 0}
            icon={<MdCheckCircle />}
            color="orange"
            trend="⚡ Prepped Students"
            trendColor="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded"
            sub="eligible for drives"
          />
          <StatsCard
            title="Overall Placement Rate"
            value={`${overallRate}%`}
            icon={<MdSchool />}
            color="purple"
            trend="↗ Overall Success"
            trendColor="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded"
            sub="placement benchmark"
          />
        </div>

        {/* ── Department Filter Pills ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <MdFilterList className="text-orange-500 text-lg" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Select Department Filter:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleDeptSelect(null)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                selectedDept === null
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 border border-gray-200 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600'
              }`}
            >
              All Departments
            </button>

            {departments.map((dept) => {
              const isSelected = selectedDept === dept.departmentId;
              return (
                <button
                  key={dept.departmentId}
                  onClick={() => handleDeptSelect(dept.departmentId)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
                    isSelected
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                      : 'bg-gray-50 text-gray-700 border border-gray-200 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600'
                  }`}
                >
                  <span>{dept.departmentName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                    isSelected
                      ? 'bg-white/30 text-white'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {dept.placedStudents} Placed
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Department Breakdown Table ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-800 text-base">Department-Wise Placement Performance</h3>
              <p className="text-xs text-gray-500">Compare placement statistics across academic departments</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-3.5 text-left">Department</th>
                  <th className="px-6 py-3.5 text-center">Total</th>
                  <th className="px-6 py-3.5 text-center">Placed</th>
                  <th className="px-6 py-3.5 text-center">Ready</th>
                  <th className="px-6 py-3.5 text-center">In Interview</th>
                  <th className="px-6 py-3.5 text-left">Avg CTC Package</th>
                  <th className="px-6 py-3.5 text-left">Placement Rate %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-400 text-sm font-medium">
                      No department data found
                    </td>
                  </tr>
                ) : (
                  departments.map((dept) => {
                    const isActive = selectedDept === dept.departmentId;
                    const pct = dept.placementRate ?? 0;
                    const isHigh = pct >= 75;
                    const isMid  = pct >= 50 && pct < 75;

                    return (
                      <tr
                        key={dept.departmentId}
                        onClick={() => handleDeptSelect(dept.departmentId)}
                        className={`border-b border-gray-50 cursor-pointer transition-colors duration-150 group ${
                          isActive ? 'bg-orange-50/70' : 'hover:bg-orange-50/40'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                              isActive ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-600"
                            }`}>
                              {(dept.departmentName || "D").charAt(0)}
                            </div>
                            <div>
                              <p className={`font-semibold text-sm ${isActive ? "text-orange-600" : "text-gray-800"}`}>
                                {dept.departmentName}
                              </p>
                              {dept.departmentCode && (
                                <span className="text-[10px] text-gray-400 font-medium uppercase">
                                  {dept.departmentCode}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center font-bold text-gray-700">{dept.totalStudents}</td>
                        
                        <td className="px-6 py-4 text-center">
                          <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs">
                            {dept.placedStudents}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full text-xs">
                            {dept.readyStudents}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-xs">
                            {dept.interviewStudents}
                          </span>
                        </td>

                        <td className="px-6 py-4 font-bold text-gray-700">
                          {dept.avgSalary > 0 ? `₹${(dept.avgSalary / 100000).toFixed(1)} LPA` : '—'}
                        </td>

                        <td className="px-6 py-4">
                          <div className="w-36">
                            <div className="flex justify-between items-center text-xs font-bold mb-1">
                              <span className={isHigh ? "text-emerald-600" : isMid ? "text-amber-600" : "text-rose-500"}>
                                {pct}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isHigh
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                                    : isMid
                                    ? "bg-gradient-to-r from-amber-400 to-orange-500"
                                    : "bg-gradient-to-r from-rose-400 to-red-500"
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Placed Students Table ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition">
          {/* Section Header Controls */}
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-800 text-base">
                  Placed Students Feed
                </h3>
                {selectedDeptName && (
                  <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-orange-200">
                    {selectedDeptName}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Showing {filtered.length} placed student records</p>
            </div>

            {/* Search */}
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Search placed students..."
                className="pl-9 pr-4 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-56 transition bg-gray-50 font-medium"
              />
            </div>
          </div>

          {/* Table */}
          {studentsLoading ? (
            <div className="flex justify-center py-12">
              <Loader />
            </div>
          ) : paginated.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-gray-400 text-sm font-medium">No placed students found matching search</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-3.5 text-left">Student</th>
                      <th className="px-6 py-3.5 text-left">Department</th>
                      <th className="px-6 py-3.5 text-left">Hiring Company</th>
                      <th className="px-6 py-3.5 text-left">Job Role</th>
                      <th className="px-6 py-3.5 text-left">Offered CTC</th>
                      <th className="px-6 py-3.5 text-left">Placed Date</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginated.map((row) => (
                      <tr
                        key={row._id}
                        onClick={() => navigate(`/student-profile/${row._id}`)}
                        className="border-b border-gray-50 hover:bg-orange-50/40 cursor-pointer transition-colors duration-150 group"
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar firstName={row.firstName} lastName={row.lastName} imageUrl={row.image} />
                            <div>
                              <p className="font-semibold text-gray-800 group-hover:text-orange-600 transition">{row.firstName} {row.lastName}</p>
                              <p className="text-[10px] text-gray-400 font-medium">{row.course || '—'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-3.5">
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">
                            {row.department?.name || 'N/A'}
                          </span>
                        </td>

                        <td className="px-6 py-3.5 text-gray-800 font-bold">
                          {row.placedInfo?.companyName || '—'}
                        </td>

                        <td className="px-6 py-3.5">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold">
                            {row.placedInfo?.jobProfile || '—'}
                          </span>
                        </td>

                        <td className="px-6 py-3.5">
                          <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md text-xs">
                            {row.placedInfo?.salary
                              ? `₹${(row.placedInfo.salary / 100000).toFixed(1)} LPA`
                              : '—'}
                          </span>
                        </td>

                        <td className="px-6 py-3.5 text-gray-500 text-xs font-medium">
                          {row.placedInfo?.placedDate
                            ? new Date(row.placedInfo.placedDate).toLocaleDateString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })
                            : '—'}
                        </td>

                        <td className="px-6 py-3.5 text-right">
                          <button className="text-gray-400 group-hover:text-orange-600 transition flex items-center gap-1 text-xs font-semibold ml-auto">
                            Profile <MdArrowForward />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-3.5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs font-medium text-gray-500">
                    Showing {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, filtered.length)} of {filtered.length} placed students
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                          p === currentPage
                            ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentPlacementOverview;
