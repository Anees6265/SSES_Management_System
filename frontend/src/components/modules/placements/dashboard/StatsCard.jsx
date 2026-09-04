import React from "react";

const StatsCard = ({ title, value, subtitle, icon, color = "orange", trend, trendColor, sub, onClick }) => {
  const colorMap = {
    orange: {
      bg: "bg-orange-50 text-orange-600 border-orange-100",
      iconBg: "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-orange-200",
    },
    blue: {
      bg: "bg-blue-50 text-blue-600 border-blue-100",
      iconBg: "bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-blue-200",
    },
    green: {
      bg: "bg-green-50 text-green-600 border-green-100",
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-green-200",
    },
    purple: {
      bg: "bg-purple-50 text-purple-600 border-purple-100",
      iconBg: "bg-gradient-to-br from-purple-500 to-violet-500 text-white shadow-purple-200",
    },
    red: {
      bg: "bg-red-50 text-red-600 border-red-100",
      iconBg: "bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-red-200",
    },
    teal: {
      bg: "bg-teal-50 text-teal-600 border-teal-100",
      iconBg: "bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-teal-200",
    },
  };

  const selectedColor = colorMap[color] || colorMap.orange;

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 p-5 flex flex-col justify-between min-h-[135px] shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-extrabold text-gray-800 tracking-tight mt-1">{value ?? "—"}</p>
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-md ${selectedColor.iconBg}`}>
            {icon}
          </div>
        )}
      </div>

      {(trend || sub || subtitle) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-gray-50 text-xs font-medium">
          {trend && (
            <span className={`inline-flex items-center font-bold ${trendColor || "text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded"}`}>
              {trend}
            </span>
          )}
          {(sub || subtitle) && (
            <span className="text-gray-400 font-normal">{sub || subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatsCard;
