/* eslint-disable react/prop-types */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdSearch, MdArrowForward, MdSchool, MdTrendingUp, MdClose } from "react-icons/md";

const DepartmentTable = ({ data = [], loading }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5">
        <div className="h-4 bg-slate-100 rounded w-44 mb-4 animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-50 rounded-xl mb-2 animate-pulse" />
        ))}
      </div>
    );
  }

  const filteredData = data.filter((dept) =>
    (dept.subDepartmentName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden hover:shadow-xs transition">
      {/* Table Header Controls */}
      <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-orange-50 text-orange-600 rounded-xl text-lg shrink-0 border border-orange-100">
            <MdSchool />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
              Department-Wise Placement Performance
            </h3>
            <p className="text-xs text-slate-500">
              Track and compare placement conversion across all academic departments
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
          <input
            type="text"
            placeholder="Search departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 w-full sm:w-52 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <MdClose size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Cards View (< 768px) */}
      <div className="md:hidden p-3.5 space-y-3">
        {filteredData.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-medium">
            No department placement data found
          </div>
        ) : (
          filteredData.map((dept) => {
            const pct = dept.placementPercentage ?? 0;
            const isHigh = pct >= 75;
            const isMid = pct >= 50 && pct < 75;

            return (
              <div
                key={dept.subDepartmentId}
                onClick={() => navigate(`/placements/department/${dept.subDepartmentId}`)}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-2xs hover:border-orange-200 transition cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 font-black flex items-center justify-center text-xs border border-orange-200/80 shrink-0">
                      {(dept.subDepartmentName || "D").charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-900 text-xs truncate">
                        {dept.subDepartmentName || "—"}
                      </p>
                      {dept.subDepartmentCode && (
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          {dept.subDepartmentCode}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-[11px] shrink-0 border border-emerald-100">
                    <MdTrendingUp /> {dept.placedStudents ?? 0} placed
                  </span>
                </div>

                {/* Progress Bar & Stats */}
                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-500 text-[11px]">Placement Rate:</span>
                    <span
                      className={
                        isHigh ? "text-emerald-600" : isMid ? "text-amber-600" : "text-rose-500"
                      }
                    >
                      {pct}% ({dept.placedStudents ?? 0}/{dept.totalStudents ?? 0} students)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
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

                <div className="flex items-center justify-between pt-0.5 text-xs">
                  <span className="text-[11px] text-slate-400">
                    Total: <strong className="text-slate-700">{dept.totalStudents ?? 0}</strong>
                  </span>
                  <span className="text-orange-600 font-bold flex items-center gap-0.5 text-[11px]">
                    View Department <MdArrowForward size={14} />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table Content (>= 768px) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 text-[11px] font-extrabold uppercase tracking-wider">
              <th className="px-6 py-3.5">Department</th>
              <th className="px-6 py-3.5 text-center">Total Students</th>
              <th className="px-6 py-3.5 text-center">Placed</th>
              <th className="px-6 py-3.5 text-left">Placement Rate</th>
              <th className="px-6 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400 text-sm font-medium">
                  No department placement data found
                </td>
              </tr>
            ) : (
              filteredData.map((dept) => {
                const pct = dept.placementPercentage ?? 0;
                const isHigh = pct >= 75;
                const isMid = pct >= 50 && pct < 75;

                return (
                  <tr
                    key={dept.subDepartmentId}
                    onClick={() => navigate(`/placements/department/${dept.subDepartmentId}`)}
                    className="hover:bg-orange-50/40 cursor-pointer transition-colors duration-150 group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 font-black flex items-center justify-center text-xs border border-orange-200/80 shrink-0">
                          {(dept.subDepartmentName || "D").charAt(0)}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-800 text-sm group-hover:text-orange-600 transition">
                            {dept.subDepartmentName || "—"}
                          </p>
                          {dept.subDepartmentCode && (
                            <span className="text-[10px] text-slate-400 font-medium uppercase">
                              Code: {dept.subDepartmentCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center font-extrabold text-slate-800">
                      {dept.totalStudents ?? 0}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-xs border border-emerald-100">
                        <MdTrendingUp /> {dept.placedStudents ?? 0}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="w-36 sm:w-44">
                        <div className="flex justify-between items-center text-xs font-bold mb-1">
                          <span
                            className={
                              isHigh
                                ? "text-emerald-600 font-black"
                                : isMid
                                ? "text-amber-600 font-black"
                                : "text-rose-500 font-black"
                            }
                          >
                            {pct}%
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {dept.placedStudents ?? 0}/{dept.totalStudents ?? 0}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
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

                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 group-hover:text-orange-600 group-hover:translate-x-1 transition flex items-center gap-1 text-xs font-bold ml-auto cursor-pointer">
                        Details <MdArrowForward />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DepartmentTable;