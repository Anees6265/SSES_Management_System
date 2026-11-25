/* eslint-disable react/prop-types */
import { MdWarningAmber, MdTrendingDown, MdNotificationsActive, MdArrowForward, MdCheckCircle } from "react-icons/md";
import { useNavigate } from "react-router-dom";

const AlertBox = ({ data = {}, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
        <div className="h-5 bg-slate-100 rounded-lg w-40 mb-4 animate-pulse" />
        <div className="h-20 bg-slate-50 rounded-xl mb-3 animate-pulse" />
        <div className="h-20 bg-slate-50 rounded-xl animate-pulse" />
      </div>
    );
  }

  const { studentsReadyButNoInterview, lowestPerformingDepartment } = data;
  const hasAlerts = (studentsReadyButNoInterview > 0) || Boolean(lowestPerformingDepartment?.name);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-6 transition-all duration-200 hover:shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4 sm:mb-5 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/80 flex items-center justify-center text-lg shrink-0 shadow-2xs">
            <MdNotificationsActive />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
              Alerts & Action Items
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Critical items requiring TPO & faculty intervention
            </p>
          </div>
        </div>

        {/* Alert Cards Container */}
        <div className="space-y-3 sm:space-y-3.5">
          {/* Alert 1: Ready but No Interview */}
          <div className="flex items-start gap-3 p-3.5 sm:p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl transition-all hover:bg-amber-50/90 hover:border-amber-300">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200 shadow-2xs">
              <MdWarningAmber className="text-lg" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Eligible & Ready Awaiting Drive
              </p>
              <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                <span className="text-2xl font-black text-amber-800 tracking-tight">
                  {studentsReadyButNoInterview ?? "0"}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  students cleared syllabus, pending drive invite
                </span>
              </div>
              <button 
                onClick={() => navigate("/readiness-status")}
                className="mt-2.5 text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 group cursor-pointer"
              >
                Schedule / View candidates <MdArrowForward className="group-hover:translate-x-1 transition" />
              </button>
            </div>
          </div>

          {/* Alert 2: Lowest Performing Department */}
          {lowestPerformingDepartment && (
            <div className="flex items-start gap-3 p-3.5 sm:p-4 bg-rose-50/60 border border-rose-200/80 rounded-xl transition-all hover:bg-rose-50/90 hover:border-rose-300">
              <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5 border border-rose-200 shadow-2xs">
                <MdTrendingDown className="text-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Needs Placement Intervention
                </p>
                <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                  <span className="text-base font-extrabold text-slate-900 truncate">
                    {lowestPerformingDepartment?.name || "—"}
                  </span>
                  <span className="text-[10px] sm:text-xs font-black text-rose-700 bg-rose-100/90 border border-rose-200 px-2 py-0.5 rounded-full">
                    {lowestPerformingDepartment?.placementPercentage ?? 0}% Placed
                  </span>
                </div>
                {lowestPerformingDepartment?.subDepartmentId && (
                  <button 
                    onClick={() => navigate(`/placements/department/${lowestPerformingDepartment.subDepartmentId}`)}
                    className="mt-2.5 text-xs font-bold text-rose-800 hover:text-rose-950 flex items-center gap-1 group cursor-pointer"
                  >
                    View department analysis <MdArrowForward className="group-hover:translate-x-1 transition" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Empty / All Good State */}
          {!hasAlerts && (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <MdCheckCircle className="text-lg" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900">Placement Operations Healthy</p>
                <p className="text-[11px] text-slate-500">All ready students are scheduled and conversion rates are on target.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
        Updated in real-time from active placement drives
      </div>
    </div>
  );
};

export default AlertBox;
