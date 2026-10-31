import React from "react";
import { X, RotateCcw } from "lucide-react";

/**
 * ActiveFilterChips
 *
 * Displays chips for all active filters with a button to remove each filter individually,
 * plus a "Clear All" button.
 *
 * Props:
 * - chips: Array<{ key: string, label: string, value: any, displayValue?: string, onRemove: () => void }>
 *   OR
 * - filters: Object (e.g. { year: '2nd Year', status: 'active', searchTerm: 'test' })
 * - defaultFilters: Object (e.g. { year: 'All', status: '', searchTerm: '' })
 * - labels: Object (e.g. { year: 'Year', status: 'Status', searchTerm: 'Search' })
 * - displayValues: Object or function to format filter values (e.g. { subDepartmentId: (val) => deptMap[val] })
 * - onRemove: (key: string) => void
 * - onClearAll: () => void
 * - className: string
 */
const ActiveFilterChips = ({
  chips = null,
  filters = null,
  defaultFilters = {},
  labels = {},
  displayValues = {},
  onRemove = () => {},
  onClearAll = () => {},
  className = "",
}) => {
  let activeChips = [];

  if (Array.isArray(chips)) {
    activeChips = chips.filter(
      (c) => c && c.value !== undefined && c.value !== null && c.value !== "" && c.value !== "All" && c.value !== "all"
    );
  } else if (filters && typeof filters === "object") {
    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      const defaultVal = defaultFilters[key];

      let isActive = false;

      if (Array.isArray(val)) {
        isActive = val.length > 0 && (!Array.isArray(defaultVal) || val.length !== defaultVal.length);
      } else if (typeof val === "boolean") {
        isActive = val !== (defaultVal ?? false);
      } else if (val !== undefined && val !== null && val !== "") {
        if (defaultVal !== undefined) {
          isActive = String(val).toLowerCase() !== String(defaultVal).toLowerCase();
        } else {
          isActive = String(val).toLowerCase() !== "all";
        }
      }

      if (isActive) {
        let displayVal = val;
        if (displayValues && typeof displayValues[key] === "function") {
          displayVal = displayValues[key](val);
        } else if (displayValues && displayValues[key] && typeof displayValues[key] === "object") {
          displayVal = displayValues[key][val] || val;
        } else if (Array.isArray(val)) {
          displayVal = val.join(", ");
        }

        const label = labels[key] || key.charAt(0).toUpperCase() + key.slice(1);

        activeChips.push({
          key,
          label,
          value: val,
          displayValue: String(displayVal),
          onRemove: () => onRemove(key),
        });
      }
    });
  }

  if (activeChips.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 py-2 px-1 text-xs ${className}`}>
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
        Active Filters:
      </span>

      {activeChips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-orange-50 text-orange-900 border border-orange-200/80 shadow-2xs transition-all hover:bg-orange-100/80 animate-in fade-in"
        >
          <span className="text-orange-600 font-bold">{chip.label}:</span>
          <span className="font-semibold text-slate-800 max-w-[180px] truncate" title={chip.displayValue || chip.value}>
            {chip.displayValue || String(chip.value)}
          </span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="text-orange-400 hover:text-orange-700 hover:bg-orange-200/60 rounded-full p-0.5 transition cursor-pointer"
            aria-label={`Remove ${chip.label} filter`}
            title={`Remove ${chip.label} filter`}
          >
            <X size={12} className="stroke-[2.5]" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 px-2.5 py-1 font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-full border border-red-200/70 transition-colors cursor-pointer shadow-2xs"
        title="Clear all filters"
      >
        <RotateCcw size={11} className="stroke-[2.5]" />
        <span>Clear All</span>
      </button>
    </div>
  );
};

export default ActiveFilterChips;

