/* eslint-disable react/prop-types */
import { ChevronLeft, ChevronRight } from "lucide-react";

const Pagination = ({
  totalItems = 0,
  currentPage = 1,
  pageSize = 10,
  totalPages,
  onPageChange,
  label = "entries",
  leftSlot = null,
  className = "",
}) => {
  const safePageSize = Math.max(1, pageSize);
  const computedTotalPages =
    totalPages && totalPages > 0
      ? totalPages
      : Math.max(1, Math.ceil(totalItems / safePageSize));

  const safeCurrentPage = Math.max(
    1,
    Math.min(currentPage || 1, computedTotalPages)
  );

  const start = totalItems === 0 ? 0 : (safeCurrentPage - 1) * safePageSize + 1;
  const end = Math.min(safeCurrentPage * safePageSize, totalItems);

  const handlePageChange = (newPage) => {
    if (!onPageChange) return;
    if (newPage < 1 || newPage > computedTotalPages || newPage === safeCurrentPage) {
      return;
    }
    onPageChange(newPage);
  };

  const getVisiblePages = () => {
    const pages = [];
    const maxVisible = 4;

    if (computedTotalPages <= maxVisible + 2) {
      for (let i = 1; i <= computedTotalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    if (safeCurrentPage <= 3) {
      for (let i = 2; i <= Math.min(maxVisible, computedTotalPages - 1); i++) {
        pages.push(i);
      }
      pages.push("...");
    } else if (safeCurrentPage >= computedTotalPages - 2) {
      pages.push("...");
      for (
        let i = Math.max(computedTotalPages - maxVisible + 1, 2);
        i < computedTotalPages;
        i++
      ) {
        pages.push(i);
      }
    } else {
      pages.push("...");
      pages.push(safeCurrentPage - 1);
      pages.push(safeCurrentPage);
      pages.push(safeCurrentPage + 1);
      pages.push("...");
    }

    pages.push(computedTotalPages);
    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between w-full gap-3 ${className}`}
    >
      {/* Left text / info */}
      <div className="flex flex-wrap items-center gap-3 text-center sm:text-left">
        {leftSlot}
        <div className="text-xs sm:text-sm text-slate-500 font-medium">
          Showing {start} to {end} of {totalItems} {label}
        </div>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 select-none">
        {/* Previous button */}
        <button
          type="button"
          onClick={() => handlePageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          aria-label="Previous Page"
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center border border-gray-200 rounded-lg bg-white text-slate-600 hover:bg-gray-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-600 transition-colors shadow-2xs cursor-pointer"
        >
          <ChevronLeft size={16} className="sm:w-4 sm:h-4 text-slate-600" />
        </button>

        {/* Page buttons */}
        {visiblePages.map((p, idx) =>
          p === "..." ? (
            <span
              key={`ellipsis-${idx}`}
              className="w-6 sm:w-8 h-8 sm:h-9 flex items-center justify-center text-slate-400 text-xs sm:text-sm font-semibold select-none"
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => handlePageChange(p)}
              aria-label={`Page ${p}`}
              aria-current={safeCurrentPage === p ? "page" : undefined}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center ${
                safeCurrentPage === p
                  ? "bg-[#FDA92D] text-white border border-[#FDA92D] shadow-2xs"
                  : "bg-white text-slate-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-2xs"
              }`}
            >
              {p}
            </button>
          )
        )}

        {/* Next button */}
        <button
          type="button"
          onClick={() => handlePageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === computedTotalPages}
          aria-label="Next Page"
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center border border-gray-200 rounded-lg bg-white text-slate-600 hover:bg-gray-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-600 transition-colors shadow-2xs cursor-pointer"
        >
          <ChevronRight size={16} className="sm:w-4 sm:h-4 text-slate-600" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
