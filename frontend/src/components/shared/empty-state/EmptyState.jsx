/* eslint-disable react/prop-types */
import React from "react";
import { FolderSearch, RotateCcw, Plus } from "lucide-react";

/**
 * Unified, modern EmptyState component used across all pages of the SSES Management System.
 * 
 * Props:
 * - icon: ReactNode | ComponentType | string (optional, defaults to an illustrated FolderSearch badge)
 * - title: string (optional, defaults to "No Data Found")
 * - subtitle: string (optional, defaults to a helpful hint)
 * - actionText: string (optional button text, e.g. "Clear Search", "Reset Filters", "Add Record")
 * - onAction: function (optional callback for the primary action button)
 * - actionIcon: ReactNode | ComponentType (optional icon for action button)
 * - secondaryActionText: string (optional second button text)
 * - onSecondaryAction: function (optional callback)
 * - compact: boolean (tighter padding for table cells, small cards, or modal dialogs)
 * - className: string (extra container styles)
 */
const EmptyState = ({
  icon,
  title = "No Data Found",
  subtitle = "There are no records to display at this moment. Once added or synced, they will appear here.",
  actionText,
  onAction,
  actionIcon,
  secondaryActionText,
  onSecondaryAction,
  compact = false,
  className = "",
}) => {
  const renderIcon = () => {
    if (!icon) {
      return (
        <FolderSearch
          size={compact ? 22 : 32}
          className="text-orange-500 stroke-[1.75]"
        />
      );
    }

    // 1. If it's already a rendered React element (e.g. <FolderSearch size={24} />)
    if (React.isValidElement(icon)) {
      return icon;
    }

    // 2. If it's a React component reference (function or object with $$typeof like react-icons or lucide-react)
    if (typeof icon === "function" || (typeof icon === "object" && icon !== null && (icon.$$typeof || icon.render))) {
      const IconComponent = icon;
      return (
        <IconComponent
          size={compact ? 22 : 32}
          className="text-orange-500 stroke-[1.75]"
        />
      );
    }

    // 3. If it's a string URL or image path
    if (typeof icon === "string") {
      if (icon.startsWith("http") || icon.startsWith("/") || icon.startsWith("data:")) {
        return (
          <img
            src={icon}
            alt={title}
            className={`${compact ? "w-6 h-6" : "w-9 h-9"} object-contain`}
          />
        );
      }
      return <span className={compact ? "text-xl" : "text-3xl"}>{icon}</span>;
    }

    // Default fallback
    return (
      <FolderSearch
        size={compact ? 22 : 32}
        className="text-orange-500 stroke-[1.75]"
      />
    );
  };

  const renderActionIcon = () => {
    if (!actionIcon) {
      return <RotateCcw size={14} className="shrink-0" />;
    }
    if (React.isValidElement(actionIcon)) {
      return actionIcon;
    }
    if (typeof actionIcon === "function" || (typeof actionIcon === "object" && actionIcon !== null)) {
      const ActionComp = actionIcon;
      return <ActionComp size={14} className="shrink-0" />;
    }
    return <RotateCcw size={14} className="shrink-0" />;
  };

  return (
    <div
      className={`w-full flex flex-col items-center justify-center text-center select-none animate-in fade-in zoom-in-95 duration-200 ${
        compact
          ? "py-8 px-4"
          : "py-12 sm:py-16 px-4 sm:px-6 bg-white/70 backdrop-blur-xs rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs my-2"
      } ${className}`}
    >
      {/* Visual Badge Icon */}
      <div className="relative mb-3.5 sm:mb-4">
        <div
          className={`${
            compact ? "w-12 h-12 rounded-2xl" : "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl"
          } bg-gradient-to-b from-orange-50 via-amber-50/40 to-slate-50 border border-orange-200/70 flex items-center justify-center text-orange-500 shadow-sm shadow-orange-500/10 ring-6 sm:ring-8 ring-orange-50/60 transition-transform duration-300 hover:scale-105`}
        >
          {renderIcon()}
        </div>

        {/* Floating subtle dot accent */}
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-60"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500 border-2 border-white"></span>
        </span>
      </div>

      {/* Main Title */}
      <h3
        className={`${
          compact ? "text-sm sm:text-base font-extrabold" : "text-base sm:text-lg font-black"
        } text-slate-800 tracking-tight`}
      >
        {title}
      </h3>

      {/* Descriptive Subtitle */}
      {subtitle && (
        <p
          className={`${
            compact ? "text-[11px] sm:text-xs max-w-xs mt-1" : "text-xs sm:text-sm max-w-md mt-1.5"
          } text-slate-400 font-medium leading-relaxed`}
        >
          {subtitle}
        </p>
      )}

      {/* Action Buttons (if provided) */}
      {(actionText || secondaryActionText) && (
        <div className="flex items-center justify-center gap-2.5 mt-4 sm:mt-5 flex-wrap">
          {actionText && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-2 px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              {renderActionIcon()}
              <span>{actionText}</span>
            </button>
          )}

          {secondaryActionText && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="inline-flex items-center gap-2 px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <Plus size={14} className="shrink-0" />
              <span>{secondaryActionText}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
