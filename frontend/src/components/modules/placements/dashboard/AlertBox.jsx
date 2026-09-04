import React from "react";
import { MdWarningAmber, MdTrendingDown, MdNotificationsActive, MdArrowForward } from "react-icons/md";
import { useNavigate } from "react-router-dom";

const AlertBox = ({ data = {}, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="h-5 bg-gray-100 rounded w-36 mb-4 animate-pulse" />
        <div className="h-16 bg-gray-50 rounded-xl mb-3 animate-pulse" />
        <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
      </div>
    );
  }

  const { studentsReadyButNoInterview, lowestPerformingDepartment } = data;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg text-lg">
          <MdNotificationsActive />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 text-base">Alerts & Key Insights</h3>
          <p className="text-xs text-gray-500">Critical attention items requiring TPO & HOD action</p>
        </div>
      </div>

      <div className="space-y-3.5">
        {/* Alert 1 */}
        <div className="flex items-start gap-3.5 p-4 bg-amber-50/80 border border-amber-200/70 rounded-xl transition hover:bg-amber-50">
          <div className="p-2 bg-amber-500 text-white rounded-lg shrink-0 mt-0.5 shadow-sm">
            <MdWarningAmber className="text-lg" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Ready but No Interview</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-amber-600">
                {studentsReadyButNoInterview ?? "0"}
              </span>
              <span className="text-xs font-semibold text-gray-500">eligible students awaiting drive schedule</span>
            </div>
            <button 
              onClick={() => navigate("/readiness-status")}
              className="mt-2 text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 group"
            >
              View Ready Students <MdArrowForward className="group-hover:translate-x-1 transition" />
            </button>
          </div>
        </div>

        {/* Alert 2 */}
        {lowestPerformingDepartment && (
          <div className="flex items-start gap-3.5 p-4 bg-rose-50/80 border border-rose-200/70 rounded-xl transition hover:bg-rose-50">
            <div className="p-2 bg-rose-500 text-white rounded-lg shrink-0 mt-0.5 shadow-sm">
              <MdTrendingDown className="text-lg" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Lowest Placement Rate Dept</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-bold text-rose-600">
                  {lowestPerformingDepartment?.name || "—"}
                </span>
                <span className="text-xs font-extrabold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                  {lowestPerformingDepartment?.placementPercentage ?? 0}% Placed
                </span>
              </div>
              {lowestPerformingDepartment?.subDepartmentId && (
                <button 
                  onClick={() => navigate(`/placements/department/${lowestPerformingDepartment.subDepartmentId}`)}
                  className="mt-2 text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 group"
                >
                  View Department Detail <MdArrowForward className="group-hover:translate-x-1 transition" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertBox;