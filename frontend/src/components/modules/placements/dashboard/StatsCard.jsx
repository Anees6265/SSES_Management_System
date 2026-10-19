/* eslint-disable react/prop-types */
import React from "react";

const StatsCard = ({
  title,
  value,
  subtitle,
  icon,
  color = "orange",
  trend,
  trendColor,
  sub,
  onClick,
  className = "",
}) => {
  const colorMap = {
    slate: {
      iconBg: "bg-slate-100 text-slate-700 border border-slate-200/80",
    },
    orange: {
      iconBg: "bg-orange-50 text-orange-600 border border-orange-200/70",
    },
    blue: {
      iconBg: "bg-sky-50 text-sky-600 border border-sky-200/70",
    },
    green: {
      iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-200/70",
    },
    purple: {
      iconBg: "bg-purple-50 text-purple-600 border border-purple-200/70",
    },
    red: {
      iconBg: "bg-rose-50 text-rose-600 border border-rose-200/70",
    },
    teal: {
      iconBg: "bg-teal-50 text-teal-600 border border-teal-200/70",
    },
    amber: {
      iconBg: "bg-amber-50 text-amber-600 border border-amber-200/70",
    },
  };

  const selectedColor = colorMap[color] || colorMap.orange;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all duration-200 text-left ${
        onClick ? "cursor-pointer active:scale-[0.99]" : ""
      } ${className}`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {value ?? "—"}
          </p>
        </div>
        {icon && (
          <div
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-lg sm:text-xl shrink-0 ${selectedColor.iconBg}`}
          >
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
            <span
              className={`inline-flex items-center font-bold px-2 py-0.5 rounded-md text-[11px] ${
                trendColor || "text-slate-700 bg-slate-100"
              }`}
            >
              {trend}
            </span>
          )}
          {(sub || subtitle) && (
            <span className="text-slate-400 font-normal truncate max-w-full">
              {sub || subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatsCard;
