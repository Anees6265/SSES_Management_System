/* eslint-disable react/prop-types */
import { useState, useRef, useEffect, useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";
import { ChevronRight } from "lucide-react";

/**
 * FilterButton — side-panel dropdown
 *
 * Props:
 *  data              : row objects array
 *  filterableColumns : [{ label: "Course", key: "course" }, ...]
 *  onFilteredData    : (filteredRows) => void
 */
const FilterButton = ({ data = [], filterableColumns = [], onFilteredData }) => {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [selected, setSelected] = useState({});
  const ref = useRef(null);

  useEffect(() => {
    if (filterableColumns.length > 0 && !activeCategory) {
      setActiveCategory(filterableColumns[0].key);
    }
  }, [filterableColumns]);

  useEffect(() => {
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Dynamic unique options per column
  const optionsMap = useMemo(() => {
    const map = {};
    filterableColumns.forEach(({ key }) => {
      map[key] = [
        ...new Set(
          data
            .map((row) => row[key])
            .filter((v) => v !== undefined && v !== null && v !== "")
        ),
      ].sort((a, b) => String(a).localeCompare(String(b)));
    });
    return map;
  }, [data, filterableColumns]);

  // Emit filtered data whenever selection changes
  useEffect(() => {
    const filtered = data.filter((row) =>
      filterableColumns.every(({ key }) => {
        const sel = selected[key];
        return !sel || sel.size === 0 || sel.has(row[key]);
      })
    );
    onFilteredData?.(filtered);
  }, [selected, data]);

  const toggle = (key, value) => {
    setSelected((prev) => {
      const current = new Set(prev[key] || []);
      current.has(value) ? current.delete(value) : current.add(value);
      return { ...prev, [key]: current };
    });
  };

  const clearAll = () => setSelected({});

  const totalSelected = Object.values(selected).reduce(
    (acc, s) => acc + (s?.size || 0),
    0
  );

  const activeOptions = activeCategory ? optionsMap[activeCategory] || [] : [];
  const activeSelected = activeCategory ? selected[activeCategory] || new Set() : new Set();

  return (
    <div className="relative" ref={ref}>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 h-10 text-sm border border-gray-200 rounded-md bg-white hover:bg-gray-50 text-gray-700 shadow-sm"
      >
        <SlidersHorizontal size={14} />
        Filter
        {totalSelected > 0 && (
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-gray-600 text-white text-[10px] font-semibold">
            {totalSelected}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg z-50 flex"
          style={{ minWidth: "360px" }}
        >
          {/* LEFT — Categories */}
          <div className="w-36 border-r flex flex-col py-1">
            {filterableColumns.map(({ label, key }) => {
              const count = selected[key]?.size || 0;
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                    activeCategory === key
                      ? "bg-gray-100 text-gray-800 font-medium"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {label}
                    {count > 0 && (
                      <span className="flex items-center justify-center w-4 h-4 rounded-full bg-gray-600 text-white text-[10px] font-semibold">
                        {count}
                      </span>
                    )}
                  </span>
                  <ChevronRight size={13} className="text-gray-400 flex-shrink-0" />
                </button>
              );
            })}

            {totalSelected > 0 && (
              <button
                onClick={clearAll}
                className="mt-auto px-3 py-2 text-xs text-red-500 hover:bg-red-50 text-left border-t"
              >
                Clear all
              </button>
            )}
          </div>

          {/* RIGHT — Options */}
          <div className="flex-1 py-2 px-2 max-h-60 overflow-y-auto">
            {activeOptions.length === 0 ? (
              <p className="text-xs text-gray-400 px-2 py-3">No options</p>
            ) : (
              activeOptions.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded"
                >
                  <input
                    type="checkbox"
                    className="accent-gray-700 w-3.5 h-3.5"
                    checked={activeSelected.has(opt)}
                    onChange={() => toggle(activeCategory, opt)}
                  />
                  {String(opt)}
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterButton;
