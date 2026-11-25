/* eslint-disable react/prop-types */
import { useNavigate } from "react-router-dom";
import { MdArrowForward, MdSchool, MdTrendingUp } from "react-icons/md";

const DepartmentTable = ({ data = [], loading, className = "" }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 ${className}`}>
        <div className="h-5 bg-slate-100 rounded-lg w-48 mb-4 animate-pulse" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Filter out UI/UX sub-department and display direct departments
  const filteredData = data.filter((dept) => {
    const name = (dept.subDepartmentName || dept.departmentName || dept.name || "").toUpperCase();
    const code = (dept.subDepartmentCode || dept.departmentCode || dept.code || "").toUpperCase();
    const isUiUx = name.includes("UI/UX") || name.includes("UIUX") || code.includes("UI/UX") || code.includes("UIUX");
    return !isUiUx;
  });

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all duration-200 hover:shadow-xs ${className}`}>
      {/* Table Header Controls */}
      <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/80 flex items-center justify-center text-lg shrink-0 shadow-2xs">
            <MdSchool />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
              Department Placement Performance
            </h3>
            <p className="text-xs text-slate-500">
              Track and compare placement conversion across academic departments
            </p>
          </div>
        </div>

        {/* Count Badge */}
        <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full self-start sm:self-auto shrink-0 shadow-2xs">
          {filteredData.length} Departments
        </span>
      </div>

      {/* Mobile Cards View (< 768px) */}
      <div className="md:hidden p-3.5 space-y-3">
        {filteredData.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-medium">
            No department placement data found
          </div>
        ) : (
          filteredData.map((dept) => {
            const deptName = dept.subDepartmentName || dept.departmentName || dept.name || "—";
            const pct = dept.placementPercentage ?? 0;
            const isHigh = pct >= 75;
            const isMid = pct >= 50 && pct < 75;

            return (
              <div
                key={dept.subDepartmentId || dept._id}
                onClick={() => navigate(`/placements/department/${dept.subDepartmentId || dept._id}`)}
                className="bg-white border border-slate-200/90 rounded-xl p-4 space-y-3 shadow-2xs hover:border-orange-300 transition-all cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 font-black flex items-center justify-center text-xs border border-orange-200/80 shrink-0">
                      {deptName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-900 text-xs truncate">
                        {deptName}
                      </p>
                      {dept.subDepartmentCode && (
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          {dept.subDepartmentCode}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md text-[11px] shrink-0">
                    <MdTrendingUp className="text-orange-500" /> {dept.placedStudents ?? 0} placed
                  </span>
                </div>

                {/* Progress Bar & Stats */}
                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-500 text-[11px]">Placement Rate:</span>
                    <span
                      className={
                        isHigh ? "text-emerald-700" : isMid ? "text-orange-600" : "text-slate-700"
                      }
                    >
                      {pct}% ({dept.placedStudents ?? 0}/{dept.totalStudents ?? 0} students)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isHigh ? "bg-emerald-600" : isMid ? "bg-orange-500" : "bg-slate-400"
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5 text-xs">
                  <span className="text-[11px] text-slate-400">
                    Total batch: <strong className="text-slate-700">{dept.totalStudents ?? 0}</strong>
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
            <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 text-[11px] font-extrabold uppercase tracking-wider">
              <th className="px-6 py-3.5">Department</th>
              <th className="px-6 py-3.5 text-center">Batch Strength</th>
              <th className="px-6 py-3.5 text-center">Offers Confirmed</th>
              <th className="px-6 py-3.5 text-left">Placement Conversion</th>
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
                const deptName = dept.subDepartmentName || dept.departmentName || dept.name || "—";
                const pct = dept.placementPercentage ?? 0;
                const isHigh = pct >= 75;
                const isMid = pct >= 50 && pct < 75;

                return (
                  <tr
                    key={dept.subDepartmentId || dept._id}
                    onClick={() => navigate(`/placements/department/${dept.subDepartmentId || dept._id}`)}
                    className="hover:bg-orange-50/25 cursor-pointer transition-colors duration-150 group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 font-black flex items-center justify-center text-xs border border-orange-200/80 shrink-0">
                          {deptName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm group-hover:text-orange-600 transition">
                            {deptName}
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
                      <span className="inline-flex items-center gap-1 font-extrabold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md text-xs">
                        <MdTrendingUp className="text-orange-500" /> {dept.placedStudents ?? 0}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="w-36 sm:w-44">
                        <div className="flex justify-between items-center text-xs font-bold mb-1">
                          <span
                            className={
                              isHigh
                                ? "text-emerald-700 font-black"
                                : isMid
                                ? "text-orange-600 font-black"
                                : "text-slate-700 font-black"
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
                              isHigh ? "bg-emerald-600" : isMid ? "bg-orange-500" : "bg-slate-400"
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
