import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdSearch, MdArrowForward, MdSchool, MdTrendingUp } from "react-icons/md";

const DepartmentTable = ({ data = [], loading }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="h-4 bg-gray-100 rounded w-44 mb-4 animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-50 rounded-xl mb-2 animate-pulse" />
        ))}
      </div>
    );
  }

  const filteredData = data.filter((dept) =>
    (dept.subDepartmentName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition">
      {/* Table Header Controls */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-orange-50 text-orange-600 rounded-lg text-lg">
            <MdSchool />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-base">Department-Wise Placement Performance</h3>
            <p className="text-xs text-gray-500">Track and compare placement rates across all academic departments</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
          <input
            type="text"
            placeholder="Search department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-48 transition"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wider">
              <th className="px-6 py-3.5 text-left">Department</th>
              <th className="px-6 py-3.5 text-center">Total Students</th>
              <th className="px-6 py-3.5 text-center">Placed</th>
              <th className="px-6 py-3.5 text-left">Placement Rate</th>
              <th className="px-6 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-400 text-sm font-medium">
                  No department placement data found
                </td>
              </tr>
            ) : (
              filteredData.map((dept) => {
                const pct = dept.placementPercentage ?? 0;
                const isHigh = pct >= 75;
                const isMid  = pct >= 50 && pct < 75;

                return (
                  <tr
                    key={dept.subDepartmentId}
                    onClick={() => navigate(`/placements/department/${dept.subDepartmentId}`)}
                    className="hover:bg-orange-50/50 cursor-pointer transition-colors duration-150 group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100/70 text-orange-600 font-bold flex items-center justify-center text-xs border border-orange-200 shrink-0">
                          {(dept.subDepartmentName || "D").charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm group-hover:text-orange-600 transition">
                            {dept.subDepartmentName || "—"}
                          </p>
                          {dept.subDepartmentCode && (
                            <span className="text-[10px] text-gray-400 font-medium uppercase">
                              Code: {dept.subDepartmentCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center font-semibold text-gray-700">
                      {dept.totalStudents ?? 0}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs">
                        <MdTrendingUp /> {dept.placedStudents ?? 0}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="w-36 sm:w-44">
                        <div className="flex justify-between items-center text-xs font-bold mb-1">
                          <span className={isHigh ? "text-emerald-600" : isMid ? "text-amber-600" : "text-rose-500"}>
                            {pct}%
                          </span>
                          <span className="text-[10px] text-gray-400 font-normal">
                            {dept.placedStudents ?? 0}/{dept.totalStudents ?? 0}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-black/5">
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
                      <button className="text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition flex items-center gap-1 text-xs font-semibold ml-auto">
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