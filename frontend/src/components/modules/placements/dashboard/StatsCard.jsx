/* eslint-disable react/prop-types */
import React from "react";
import { MdArrowForward } from "react-icons/md";

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
  // Cohesive, calm palette aligned with the software's orange & slate brand theme
  const colorMap = {
    slate: {
      iconBg: "bg-slate-100 text-slate-700 border-slate-200/90 group-hover:bg-slate-700 group-hover:text-white group-hover:border-slate-700",
      accent: "text-slate-700",
    },
    orange: {
      iconBg: "bg-orange-50 text-orange-600 border-orange-200/80 group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500",
      accent: "text-orange-600",
    },
    amber: {
      iconBg: "bg-amber-50 text-amber-600 border-amber-200/80 group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-500",
      accent: "text-amber-600",
    },
    green: {
      iconBg: "bg-emerald-50 text-emerald-600 border-emerald-200/80 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500",
      accent: "text-emerald-600",
    },
    blue: {
      iconBg: "bg-slate-100 text-slate-700 border-slate-200/90 group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500",
      accent: "text-slate-800",
    },
    purple: {
      iconBg: "bg-orange-50 text-orange-600 border-orange-200/80 group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500",
      accent: "text-orange-600",
    },
    teal: {
      iconBg: "bg-emerald-50 text-emerald-600 border-emerald-200/80 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500",
      accent: "text-emerald-600",
    },
    red: {
      iconBg: "bg-rose-50 text-rose-600 border-rose-200/80 group-hover:bg-rose-500 group-hover:text-white group-hover:border-rose-500",
      accent: "text-rose-600",
    },
  };

  const selectedColor = colorMap[color] || colorMap.orange;

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && e.key === "Enter" && onClick()}
      className={`group relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-col justify-between shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-orange-300 text-left ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {value ?? "—"}
          </p>
        </div>

        {icon && (
          <div
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-lg sm:text-xl shrink-0 border transition-all duration-200 shadow-2xs ${selectedColor.iconBg}`}
          >
            {React.isValidElement(icon)
              ? icon
              : typeof icon === "function" || (typeof icon === "object" && icon !== null)
              ? React.createElement(icon, { size: 22 })
              : icon}
          </div>
        )}
      </div>

      {(trend || sub || subtitle) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100 text-[11px] sm:text-xs">
          {trend && (
            <span
              className={`inline-flex items-center font-bold px-2 py-0.5 rounded-md text-[11px] border ${
                trendColor || "text-slate-700 bg-slate-100 border-slate-200"
              }`}
            >
              {trend}
            </span>
          )}
          {(sub || subtitle) && (
            <span className="text-slate-400 font-medium truncate max-w-full">
              {sub || subtitle}
            </span>
          )}
        </div>
      )}

      {onClick && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-slate-400 group-hover:text-orange-600 transition-colors">
          <span>View records</span>
          <MdArrowForward className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </div>
      )}
    </div>
  );
};

export default StatsCard;
