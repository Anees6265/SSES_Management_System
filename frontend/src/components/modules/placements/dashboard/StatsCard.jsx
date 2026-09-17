import React from "react";

const StatsCard = ({ title, value, subtitle, icon, color = "orange", trend, trendColor, sub, onClick, className = "" }) => {
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
      className={`bg-white rounded-2xl border border-gray-100 p-3.5 sm:p-5 flex flex-col justify-between min-h-[110px] sm:min-h-[135px] shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 ${onClick ? "cursor-pointer active:scale-[0.99]" : ""} ${className}`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="space-y-0.5 sm:space-y-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider truncate">{title}</p>
          <p className="text-xl sm:text-3xl font-extrabold text-gray-800 tracking-tight mt-0.5 sm:mt-1">{value ?? "—"}</p>
        </div>
        {icon && (
          <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-lg sm:text-2xl shadow-xs shrink-0 ${selectedColor.iconBg}`}>
            {icon}
          </div>
        )}
      </div>

      {(trend || sub || subtitle) && (
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-50 text-[10px] sm:text-xs font-medium">
          {trend && (
            <span className={`inline-flex items-center font-bold ${trendColor || "text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded"}`}>
              {trend}
            </span>
          )}
          {(sub || subtitle) && (
            <span className="text-gray-400 font-normal truncate max-w-full">{sub || subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatsCard;
