import React from "react";
import { MdBusiness, MdAttachMoney } from "react-icons/md";

const formatSalary = (n) => n ? `₹${(n / 100000).toFixed(1)} LPA` : null;

const TopCompanies = ({ data = [], loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="h-5 bg-gray-100 rounded w-36 mb-4 animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-50 rounded-xl mb-2 animate-pulse" />
        ))}
      </div>
    );
  }

  const maxHires = data.length > 0 ? Math.max(...data.map(c => c.totalHires || c.hires || 1)) : 1;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg text-lg">
            <MdBusiness />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-base">Top Recruiting Companies</h3>
            <p className="text-xs text-gray-500">Major corporate partners hiring from our campus drives</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
          {data.length} Companies
        </span>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm font-medium">
          No placement records available yet
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((company, i) => {
            const hires = company.totalHires || company.hires || 0;
            const salary = company.avgSalary || company.salary;
            const pct = Math.round((hires / maxHires) * 100);

            return (
              <div key={i} className="group p-3 rounded-xl border border-gray-50 bg-gray-50/50 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all duration-200">
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-2.5 truncate max-w-[65%]">
                    <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 font-extrabold text-xs flex items-center justify-center shrink-0">
                      #{i + 1}
                    </span>
                    <span className="font-bold text-gray-800 truncate group-hover:text-orange-600 transition">
                      {company.companyName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {salary && (
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                        <MdAttachMoney className="text-xs" /> {formatSalary(salary)}
                      </span>
                    )}
                    <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                      {hires} hires
                    </span>
                  </div>
                </div>

                <div className="w-full bg-gray-200/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-400 to-amber-500 h-2 rounded-full transition-all duration-500"
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