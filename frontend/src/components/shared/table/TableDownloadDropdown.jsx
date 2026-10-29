/* eslint-disable react/prop-types */
import { useState, useRef, useEffect } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { MdExpandMore } from "react-icons/md";

const TableDownloadDropdown = ({
  count = 0,
  total = 0,
  onDownloadExcel,
  onDownloadPDF,
  className = "",
  label = "Download",
  align = "right",
  disabled = false,
  size = "md", // "sm" | "md"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasSelected = count > 0;
  const buttonText = hasSelected
    ? `${label} (${count})`
    : total > 0
    ? `${label} (All)`
    : label;

  const btnHeight = size === "sm" ? "h-9 text-xs px-3" : "h-10 text-xs sm:text-sm px-3.5 sm:px-4";

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className} ${isOpen ? "z-50" : ""}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`${btnHeight} rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all duration-200 shadow-xs hover:shadow flex items-center justify-between gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? "ring-4 ring-orange-500/20" : ""
        }`}
        title={hasSelected ? `Download ${count} selected records` : `Download all ${total || "available"} records`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Download size={15} className="shrink-0" />
          <span className="truncate">{buttonText}</span>
        </div>
        <MdExpandMore
          size={18}
          className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            align === "left" ? "left-0" : "right-0"
          } mt-1.5 w-56 sm:w-60 bg-white rounded-2xl shadow-xl border border-orange-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-orange-600/80 border-b border-orange-50 flex items-center justify-between">
            <span>Export Format</span>
            <span className="text-slate-400 font-semibold">{hasSelected ? `${count} Selected` : `${total} Total`}</span>
          </div>

          {/* Download as Excel */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onDownloadExcel?.();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200 group-hover:scale-105 transition-transform shadow-2xs">
              <FileSpreadsheet size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-slate-800 group-hover:text-orange-600">Download Excel</div>
              <div className="text-[10px] text-slate-400 font-medium">.xlsx spreadsheet format</div>
            </div>
          </button>

          {/* Download as PDF */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onDownloadPDF?.();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200 group-hover:scale-105 transition-transform shadow-2xs">
              <FileText size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-slate-800 group-hover:text-orange-600">Download PDF</div>
              <div className="text-[10px] text-slate-400 font-medium">.pdf document format</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default TableDownloadDropdown;

