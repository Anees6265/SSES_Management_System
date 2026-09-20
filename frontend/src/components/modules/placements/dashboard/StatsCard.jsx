import React from "react";

const StatsCard = ({ title, value, subtitle, icon, color = "orange", trend, trendColor, sub, onClick, className = "" }) => {
  const colorMap = {
    slate: {
      iconBg: "bg-slate-100 text-slate-700 border border-slate-200/60",
    },
    orange: {
      iconBg: "bg-amber-50 text-amber-700 border border-amber-100/80",
    },
    blue: {
      iconBg: "bg-sky-50 text-sky-700 border border-sky-100/80",
    },
    green: {
      iconBg: "bg-emerald-50 text-emerald-700 border border-emerald-100/80",
    },
    purple: {
      iconBg: "bg-violet-50 text-violet-700 border border-violet-100/80",
    },
    red: {
      iconBg: "bg-rose-50 text-rose-700 border border-rose-100/80",
    },
    teal: {
      iconBg: "bg-teal-50 text-teal-700 border border-teal-100/80",
    },
  };

  const selectedColor = colorMap[color] || colorMap.slate;

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex flex-col justify-between min-h-[110px] sm:min-h-[130px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-slate-300 transition-all duration-200 ${onClick ? "cursor-pointer active:scale-[0.99]" : ""} ${className}`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{value ?? "—"}</p>
        </div>
        {icon && (
          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-lg sm:text-xl shrink-0 ${selectedColor.iconBg}`}>
            {React.isValidElement(icon)
              ? icon
              : typeof icon === "function" || (typeof icon === "object" && icon !== null)
              ? React.createElement(icon, { size: 20 })
              : icon}
          </div>
        )}
      </div>

      {(trend || sub || subtitle) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100 text-[11px] sm:text-xs font-medium">
          {trend && (
            <span className={`inline-flex items-center font-semibold px-2 py-0.5 rounded-md ${trendColor || "text-slate-700 bg-slate-100"}`}>
              {trend}
            </span>
          )}
          {(sub || subtitle) && (
            <span className="text-slate-400 font-normal truncate max-w-full">{sub || subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatsCard;
