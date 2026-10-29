/* eslint-disable react/prop-types */
import { useMemo, useEffect, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import { ChevronUp, ChevronDown } from "lucide-react";
import Pagination from "../pagination/Pagination";
import EmptyState from "../empty-state/EmptyState";

const CommonTable = ({
  columns,
  data,
  editable,
  pagination,
  rowsPerPage = 10,
  searchTerm = "",
  actionButton,
  extraColumn,
  onRowClick,
  emptyMessage = "No data found",
  minRows = 0,
  className = "",
  wrapperClassName = "",
}) => {

  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([]);

  useEffect(() => {
    setGlobalFilter(searchTerm || "");
  }, [searchTerm]);

  const tableColumns = useMemo(() => {
    const cols = columns.map((col) => ({
      ...col,
      header: col.label,
      ...(col.accessorFn ? { accessorFn: col.accessorFn } : { accessorKey: col.key }),
      align: col.align,
      cell: ({ row }) =>
        col.render ? col.render(row.original) : (col.accessorFn ? col.accessorFn(row.original) : row.original[col.key]),
    }));

    if (editable && actionButton) {
      cols.push({
        header: "Action",
        id: "action",
        enableSorting: false,
        cell: ({ row }) => actionButton(row.original),
      });
    }

    if (extraColumn) {
      cols.push({
        header: extraColumn.header,
        id: "extra",
        enableSorting: false,
        cell: ({ row }) => extraColumn.render?.(row.original),
      });
    }

    return cols;
  }, [columns, editable, actionButton, extraColumn]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: rowsPerPage } },
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();

  const currentRows = table.getRowModel().rows;
  const currentRowsCount = currentRows.length;
  const emptyRowsCount = (minRows && currentRowsCount > 0 && currentRowsCount < minRows)
    ? minRows - currentRowsCount
    : 0;

  return (
    <div className={`w-full ${className}`}>
      <div className={`rounded-2xl border border-gray-200 shadow-sm ${wrapperClassName}`}>

        {/* ================= TABLE ================= */}
        <div className="overflow-x-auto w-full rounded-t-2xl flex-1 bg-white">
          <table className="min-w-[700px] w-full text-sm">

            <thead className="border-b border-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="text-xs uppercase tracking-wider text-gray-500 font-semibold bg-gray-100"
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={`px-3 sm:px-6 py-3 sm:py-4 ${
                        header.column.columnDef.align === "center"
                          ? "text-center"
                          : header.column.columnDef.align === "right"
                          ? "text-right"
                          : "text-left"
                      }`}
                    >
                      <div className={`flex items-center gap-2 whitespace-nowrap ${
                        header.column.columnDef.align === "center"
                          ? "justify-center"
                          : header.column.columnDef.align === "right"
                          ? "justify-end"
                          : "justify-start"
                      }`}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="text-gray-400">
                            {header.column.getIsSorted() === "asc" ? (
                              <ChevronUp size={14} />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ChevronDown size={14} />
                            ) : (
                              <ChevronDown size={14} className="opacity-30" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody className="bg-white">
              {currentRowsCount === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length} className="p-4 sm:p-8 bg-white text-center">
                    <div className="min-h-[350px] flex items-center justify-center">
                      <EmptyState
                        title={typeof emptyMessage === "string" ? emptyMessage : "No Data Found"}
                        subtitle={
                          searchTerm
                            ? `No records matching "${searchTerm}". Try checking your spelling or clear your search filter.`
                            : "There are no records available in this table right now."
                        }
                        actionText={searchTerm ? "Clear Search" : undefined}
                        onAction={searchTerm ? () => setGlobalFilter("") : undefined}
                        compact
                      />
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {currentRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => onRowClick?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={`px-3 sm:px-6 py-3 sm:py-4 text-gray-700 ${
                            cell.column.columnDef.verticalAlign || "align-middle"
                          } ${
                            cell.column.columnDef.cellClassName ||
                            (cell.column.columnDef.wrap ? "whitespace-normal break-words" : "whitespace-nowrap")
                          } ${
                            cell.column.columnDef.align === "center"
                              ? "text-center"
                              : cell.column.columnDef.align === "right"
                              ? "text-right"
                              : "text-left"
                          }`}
                          onClick={(e) => {
                            if (cell.column.id === "action") e.stopPropagation();
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {Array.from({ length: emptyRowsCount }).map((_, idx) => (
                    <tr
                      key={`empty-row-${idx}`}
                      className="border-b border-gray-100/60 h-[58px] select-none pointer-events-none"
                    >
                      {tableColumns.map((col, cIdx) => (
                        <td key={col.id || col.accessorKey || cIdx} className="px-3 sm:px-6 py-3.5">&nbsp;</td>
                      ))}
                    </tr>
                  ))}
                </>
              )}
            </tbody>

          </table>
        </div>

        {/* ================= PAGINATION ================= */}
        {pagination && (
          <div className="border-t border-gray-200 px-3 sm:px-6 py-3 sm:py-4 bg-gray-100 rounded-b-2xl mt-auto">
            <Pagination
              totalItems={table.getFilteredRowModel().rows.length}
              currentPage={pageIndex + 1}
              pageSize={pageSize}
              totalPages={pageCount}
              onPageChange={(page) => table.setPageIndex(page - 1)}
              label="entries"
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default CommonTable;
