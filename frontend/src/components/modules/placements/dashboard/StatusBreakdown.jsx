import React from "react";

const STATUSES = [
  { key: "notReady",          label: "Not Ready",           color: "bg-gray-100 border-gray-200 text-gray-700",       badge: "bg-gray-200 text-gray-800" },
  { key: "inProgress",        label: "In Progress",         color: "bg-amber-50 border-amber-200 text-amber-800",      badge: "bg-amber-100 text-amber-800" },
  { key: "ready",             label: "Ready",               color: "bg-blue-50 border-blue-200 text-blue-800",         badge: "bg-blue-100 text-blue-800" },
  { key: "readyForInterview", label: "Ready for Drive",     color: "bg-indigo-50 border-indigo-200 text-indigo-800",   badge: "bg-indigo-100 text-indigo-800" },
  { key: "interview",         label: "In Interview",        color: "bg-orange-50 border-orange-200 text-orange-800",   badge: "bg-orange-100 text-orange-800" },
  { key: "selected",          label: "Offer Selected",      color: "bg-purple-50 border-purple-200 text-purple-800",   badge: "bg-purple-100 text-purple-800" },
  { key: "placed",            label: "Placed",              color: "bg-emerald-50 border-emerald-200 text-emerald-800", badge: "bg-emerald-100 text-emerald-800" },
];

const StatusBreakdown = ({ data = {}, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="h-5 bg-gray-100 rounded w-44 mb-4 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-800 text-base">Comprehensive Student Readiness Breakdown</h3>
          <p className="text-xs text-gray-500">Live classification of students across all placement stages</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {STATUSES.map((s) => {
          const val = data[s.key] ?? 0;
          return (
            <div
              key={s.key}
              className={`rounded-xl border p-3.5 flex flex-col justify-between text-center transition-all duration-200 hover:scale-[1.02] shadow-xs ${s.color}`}
            >
              <span className={`self-center text-xs font-extrabold px-2 py-0.5 rounded-full ${s.badge}`}>
                {val}
              </span>
              <p className="text-xs font-bold mt-2 leading-snug">{s.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatusBreakdown;
