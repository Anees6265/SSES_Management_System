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
}) => {

  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([]);

  useEffect(() => {
    setGlobalFilter(searchTerm || "");
  }, [searchTerm]);

  const tableColumns = useMemo(() => {
    const cols = columns.map((col) => ({
      header: col.label,
      accessorKey: col.key,
      align: col.align,
      cell: ({ row }) =>
        col.render ? col.render(row.original) : row.original[col.key],
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

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-gray-200 shadow-sm">

        {/* ================= TABLE ================= */}
        <div className="overflow-x-auto w-full rounded-t-2xl">
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
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length} className="text-center py-10 text-gray-400">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`px-3 sm:px-6 py-3 sm:py-4 text-gray-700 whitespace-nowrap ${
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
                ))
              )}
            </tbody>

          </table>
        </div>

        {/* ================= PAGINATION ================= */}
        {pagination && (
          <div className="border-t border-gray-200 px-3 sm:px-6 py-3 sm:py-4 bg-gray-100">
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
