/* eslint-disable react/prop-types */
import { MdBusiness, MdAttachMoney, MdArrowForward } from "react-icons/md";
import { useNavigate } from "react-router-dom";

const formatSalary = (n) => (n ? `₹${(n / 100000).toFixed(1)} LPA` : null);

const TopCompanies = ({ data = [], loading, className = "" }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 ${className}`}>
        <div className="h-5 bg-slate-100 rounded-lg w-40 mb-4 animate-pulse" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const maxHires =
    data.length > 0
      ? Math.max(...data.map((c) => c.totalHires || c.hires || 1))
      : 1;

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-6 transition-all duration-200 hover:shadow-xs flex flex-col justify-between h-full ${className}`}>
      <div>
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-5 gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/80 flex items-center justify-center text-lg shrink-0 shadow-2xs">
              <MdBusiness />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                Top Corporate Recruiters
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Major industry partners actively hiring from campus drives
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 shrink-0">
            {data.length} Companies
          </span>
        </div>

        {/* Company List */}
        {data.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs sm:text-sm font-medium">
            No campus recruiter records available yet
          </div>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {data.map((company, i) => {
              const hires = company.totalHires || company.hires || 0;
              const salary = company.avgSalary || company.salary;
              const pct = Math.round((hires / maxHires) * 100);

              const rankBadge =
                i === 0
                  ? "bg-amber-50 text-amber-800 border-amber-300 font-black"
                  : i === 1
                  ? "bg-slate-100 text-slate-700 border-slate-300 font-bold"
                  : i === 2
                  ? "bg-orange-50 text-orange-800 border-orange-200 font-bold"
                  : "bg-slate-50 text-slate-600 border-slate-200 font-semibold";

              return (
                <div
                  key={i}
                  className="group p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-orange-200 hover:shadow-2xs transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg text-xs flex items-center justify-center shrink-0 border ${rankBadge}`}
                      >
                        #{i + 1}
                      </span>
                      <span className="font-extrabold text-slate-800 text-xs sm:text-sm truncate group-hover:text-orange-600 transition">
                        {company.companyName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {salary && (
                        <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-0.5 border border-emerald-200">
                          <MdAttachMoney className="text-xs" /> {formatSalary(salary)}
                        </span>
                      )}
                      <span className="text-[11px] sm:text-xs font-black text-slate-800 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md shadow-2xs">
                        {hires} {hires === 1 ? "hire" : "hires"}
                      </span>
                    </div>
                  </div>

                  {/* Clean Brand Progress Bar */}
                  <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(8, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="pt-3.5 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">Verified company hiring data</span>
        <button
          onClick={() => navigate("/company-details")}
          className="font-bold text-slate-600 hover:text-orange-600 transition flex items-center gap-1 cursor-pointer group"
        >
          View all companies <MdArrowForward className="group-hover:translate-x-1 transition" />
        </button>
      </div>
    </div>
  );
};

export default TopCompanies;
