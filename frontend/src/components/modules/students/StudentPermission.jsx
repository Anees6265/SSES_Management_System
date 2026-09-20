import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGetDummyStudentsQuery } from "../../../redux/api/authApi";
import Loader from "../../shared/loader/Loader";
import CommonTable from "../../shared/table/CommonTable";
import Header from "../../shared/sidebar/Header";
import Avatar from "../../shared/Avatar";
import Pagination from "../../shared/pagination/Pagination";
import EmptyState from "../../shared/empty-state/EmptyState";
import {
  Search,
  X,
  ChevronRight,
  Phone,
  RotateCcw,
  Calendar,
  Eye,
  FileText,
  AlertCircle
} from "lucide-react";

const STATUS_STYLES = {
  Dummy: "bg-amber-50 text-amber-700 border-amber-200",
};

const toTitleCase = (str = "") =>
  str
    ? str
        .toLowerCase()
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "";

const formatDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "N/A";

const StudentPermission = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);
  const [mobilePage, setMobilePage] = useState(1);
  const mobilePageSize = 10;

  const { data, isLoading, isError, error } = useGetDummyStudentsQuery();
  const students = data?.data || [];

  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return students;
    return students.filter((student) => {
      return [
        student.firstName,
        student.lastName,
        student.studentMobile,
        student.course,
        student.prkey,
        student.currentLevelId?.name,
        student.currentSubLevelId?.name,
        student.dummyDetails?.reason,
        student.dummyDetails?.remark,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [students, searchTerm]);

  // Reset mobile page whenever search changes
  useEffect(() => {
    setMobilePage(1);
  }, [searchTerm]);

  const paginatedMobileData = useMemo(() => {
    const start = (mobilePage - 1) * mobilePageSize;
    return filteredData.slice(start, start + mobilePageSize);
  }, [filteredData, mobilePage]);

  const columns = [
    {
      key: "student",
      label: "Student",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar firstName={row.firstName} lastName={row.lastName} imageUrl={row.image} />
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {toTitleCase(`${row.firstName || ""} ${row.lastName || ""}`)}
            </p>
            <p className="text-xs text-gray-500 font-mono">{row.prkey || row.studentMobile || "N/A"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "level",
      label: "Level",
      render: (row) => (
        <div className="text-sm text-gray-700">
          <p className="font-semibold">{row.currentLevelId?.name || "-"}</p>
          <p className="text-xs text-gray-400">{row.currentSubLevelId?.name || "-"}</p>
        </div>
      ),
    },
    {
      key: "reason",
      label: "Reason / Remark",
      render: (row) => (
        <div className="max-w-xs text-sm text-gray-700">
          <p className="font-medium italic border-l-2 border-orange-300 pl-2 text-xs">
            "{row.dummyDetails?.reason || "No reason provided"}"
          </p>
          {row.dummyDetails?.remark && (
            <p className="mt-1 text-[11px] text-gray-500 bg-gray-50 p-1 rounded border border-gray-100">
              <span className="font-bold text-gray-400 uppercase text-[9px] mr-1">Remark:</span>
              {row.dummyDetails.remark}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "markedAt",
      label: "Marked On",
      render: (row) => (
        <span className="text-xs text-gray-600 font-medium">
          {formatDate(row.dummyDetails?.markedAt)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[row.status] || STATUS_STYLES.Dummy}`}>
          {row.status || "Dummy"}
        </span>
      ),
    },
    {
      key: "application",
      label: "Application",
      render: (row) =>
        row.dummyDetails?.applicationURL ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setPreviewDoc(row.dummyDetails);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg text-xs font-bold hover:bg-orange-100 transition cursor-pointer"
          >
            <Eye size={13} />
            <span>View</span>
          </button>
        ) : (
          <span className="text-xs text-gray-400 italic">No Doc</span>
        ),
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center p-6 bg-white rounded-2xl border border-rose-100 shadow-lg max-w-sm">
          <p className="font-bold text-rose-600 mb-1">Error Loading Data</p>
          <p className="text-xs text-gray-500">{error?.data?.message || "Something went wrong."}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        title="Dummy Students"
        showBack={false}
        badge={`${students.length} dummy students`}
        breadcrumbs={[
          { label: "Academics" },
          { label: "Dummy Students" },
        ]}
      />

      <div className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
        {/* Search and Quick Header Bar */}
        <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search student, PR key, course, or reason..."
                className="w-full h-10 pl-9 pr-9 text-xs sm:text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 transition placeholder:text-gray-400 font-medium text-gray-800"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Count & Reset */}
            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-semibold text-gray-500">
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Reset Search</span>
                </button>
              )}
              <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg font-bold">
                {filteredData.length} {filteredData.length === 1 ? "student" : "students"}
              </span>
            </div>
          </div>
        </div>

        {/* ── DESKTOP & TABLET VIEW: FULL DATA TABLE (>= 768px) ── */}
        <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden p-1">
          <CommonTable
            data={filteredData}
            columns={columns}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onRowClick={(row) => navigate(`/student-profile/${row._id}`)}
            pagination
            rowsPerPage={10}
          />
        </div>

        {/* ── MOBILE VIEW: MODERN DUMMY STUDENT CARDS (< 768px) ── */}
        <div className="md:hidden space-y-3">
          {filteredData.length === 0 ? (
            <EmptyState
              title="No Dummy Students Found"
              subtitle={
                searchTerm
                  ? "No students match your search keywords."
                  : "No students are currently marked as dummy."
              }
              actionText={searchTerm ? "Clear Search" : undefined}
              onAction={searchTerm ? () => setSearchTerm("") : undefined}
            />
          ) : (
            <>
              {paginatedMobileData.map((student) => {
                const studentName = toTitleCase(`${student.firstName || ""} ${student.lastName || ""}`);
                const hasDoc = Boolean(student.dummyDetails?.applicationURL);

                return (
                  <div
                    key={student._id}
                    onClick={() => navigate(`/student-profile/${student._id}`)}
                    className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs hover:shadow-sm hover:border-orange-200 transition-all duration-200 active:scale-[0.99] cursor-pointer space-y-3"
                  >
                    {/* Top Row: Avatar, Student Name, PR Key, Status Badge */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Avatar firstName={student.firstName} lastName={student.lastName} imageUrl={student.image} />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-gray-900 truncate leading-snug">
                            {studentName || "Student"}
                          </h4>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-[10.5px] font-mono font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                              {student.prkey || "NO PR"}
                            </span>
                            {student.studentMobile && (
                              <a
                                href={`tel:${student.studentMobile}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] font-medium text-orange-600 hover:underline flex items-center gap-0.5"
                              >
                                <Phone size={10} />
                                <span>{student.studentMobile}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border shrink-0 ${STATUS_STYLES[student.status] || STATUS_STYLES.Dummy}`}>
                        {student.status || "Dummy"}
                      </span>
                    </div>

                    {/* Details Box */}
                    <div className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-150 text-xs space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-400 font-medium">Level / Sub-Level:</span>
                        <span className="font-bold text-gray-700 truncate">
                          {student.currentLevelId?.name || "—"} {student.currentSubLevelId?.name ? `/ ${student.currentSubLevelId.name}` : ""}
                        </span>
                      </div>

                      {student.course && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-400 font-medium">Course:</span>
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 text-[10.5px] uppercase truncate">
                            {student.course}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-400 font-medium">Marked On:</span>
                        <span className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">
                          <Calendar size={11} className="text-gray-400" />
                          <span>{formatDate(student.dummyDetails?.markedAt)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Reason & Remark Box */}
                    <div className="bg-orange-50/30 rounded-xl p-3 border border-orange-100/70 text-xs space-y-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Reason for Dummy:
                      </span>
                      <p className="font-semibold text-gray-800 border-l-2 border-orange-400 pl-2.5 py-0.5 italic text-xs leading-relaxed">
                        "{student.dummyDetails?.reason || "No reason provided"}"
                      </p>
                      {student.dummyDetails?.remark && (
                        <div className="pt-1.5 border-t border-orange-100/80 text-[11px] text-gray-600">
                          <span className="font-bold text-gray-500 mr-1">Remark:</span>
                          <span>{student.dummyDetails.remark}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="flex items-center gap-2 pt-0.5">
                      {hasDoc && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPreviewDoc(student.dummyDetails);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600 hover:bg-orange-100 transition active:scale-95 cursor-pointer shadow-2xs"
                        >
                          <Eye size={14} />
                          <span>Application</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => navigate(`/student-profile/${student._id}`)}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition active:scale-95 cursor-pointer shadow-2xs"
                      >
                        <span>Profile</span>
                        <ChevronRight size={14} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Mobile Pagination */}
              {filteredData.length > mobilePageSize && (
                <div className="bg-white rounded-2xl border border-gray-200 p-3 shadow-xs">
                  <Pagination
                    totalItems={filteredData.length}
                    currentPage={mobilePage}
                    pageSize={mobilePageSize}
                    totalPages={Math.max(1, Math.ceil(filteredData.length / mobilePageSize))}
                    onPageChange={setMobilePage}
                    label="students"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Preview Document Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-3 sm:px-4 transition-opacity duration-300"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-4 sm:p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-100 transform transition-all duration-300"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2.5">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-1.5">
                <FileText size={18} className="text-orange-500" />
                <span>Dummy Student Application</span>
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-extrabold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {previewDoc.applicationType === "image" ||
            previewDoc.applicationURL?.match(/\.(jpeg|jpg|png|webp|gif)$/i) ? (
              <img
                src={previewDoc.applicationURL}
                alt="Dummy Student Application"
                className="w-full rounded-xl object-contain max-h-[60vh] border border-gray-100 bg-gray-50"
              />
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-600 space-y-2">
                <FileText size={32} className="text-orange-500 mx-auto" />
                <p className="font-bold text-gray-800">Application Document Available</p>
                <p className="text-xs text-gray-400">PDF or external document format</p>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-xs font-bold text-gray-600 rounded-xl transition duration-200 cursor-pointer"
              >
                Close
              </button>
              <a
                href={previewDoc.applicationURL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white rounded-xl transition duration-200 shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Open in new tab</span>
                <ChevronRight size={14} />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentPermission;
