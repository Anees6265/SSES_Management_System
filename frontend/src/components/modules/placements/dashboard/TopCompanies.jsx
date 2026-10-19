/* eslint-disable react/prop-types */
import { MdBusiness, MdAttachMoney } from "react-icons/md";

const formatSalary = (n) => (n ? `₹${(n / 100000).toFixed(1)} LPA` : null);

const TopCompanies = ({ data = [], loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6">
        <div className="h-5 bg-slate-100 rounded w-36 mb-4 animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 bg-slate-50 rounded-xl mb-2 animate-pulse" />
        ))}
      </div>
    );
  }

  const maxHires =
    data.length > 0
      ? Math.max(...data.map((c) => c.totalHires || c.hires || 1))
      : 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-6 hover:shadow-xs transition">
      <div className="flex items-center justify-between mb-4 sm:mb-5 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-xl text-lg shrink-0 border border-purple-100">
            <MdBusiness />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
              Top Corporate Recruiters
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Major industry partners hiring from our campus recruitment drives
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100 shrink-0">
          {data.length} Companies
        </span>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs sm:text-sm font-medium">
          No campus recruiter records available yet
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {data.map((company, i) => {
            const hires = company.totalHires || company.hires || 0;
            const salary = company.avgSalary || company.salary;
            const pct = Math.round((hires / maxHires) * 100);

            const rankBadge =
              i === 0
                ? "bg-amber-100 text-amber-800 border-amber-300 font-black"
                : i === 1
                ? "bg-slate-200 text-slate-800 border-slate-300 font-black"
                : i === 2
                ? "bg-orange-100 text-orange-800 border-orange-300 font-black"
                : "bg-slate-100 text-slate-600 border-slate-200 font-bold";

            return (
              <div
                key={i}
                className="group p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-2xs transition-all duration-200"
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
                      <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-0.5 border border-emerald-100">
                        <MdAttachMoney className="text-xs" /> {formatSalary(salary)}
                      </span>
                    )}
                    <span className="text-[11px] sm:text-xs font-black text-slate-800 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md shadow-2xs">
                      {hires} hires
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(8, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TopCompanies;