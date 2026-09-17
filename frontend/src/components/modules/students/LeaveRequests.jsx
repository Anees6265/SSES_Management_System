import { useMemo, useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  CheckCircle,
  Eye,
  Search,
  XCircle,
  Clock,
  Inbox,
  Check,
  Calendar,
  RotateCcw,
  Phone,
  X
} from "lucide-react";
import {
  useGetLeaveRequestsQuery,
  useResolvePermissionMutation,
} from "../../../redux/api/authApi";
import Avatar from "../../shared/Avatar";
import Header from "../../shared/sidebar/Header";
import Loader from "../../shared/loader/Loader";
import CommonTable from "../../shared/table/CommonTable";
import Pagination from "../../shared/pagination/Pagination";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const statusStyles = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

const getDurationInDays = (fromDate, toDate) => {
  if (!fromDate || !toDate) return 0;
  const start = new Date(fromDate);
  const end = new Date(toDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const diffTime = end.getTime() - start.getTime();
  if (diffTime < 0) return 0;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

const toTitleCase = (str = "") =>
  str
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const ResolveModal = ({ request, decision, onClose }) => {
  const [remark, setRemark] = useState("");
  const [resolvePermission, { isLoading }] = useResolvePermissionMutation();
  const isApprove = decision === "approved";

  const handleSubmit = async () => {
    try {
      await resolvePermission({
        id: request.student._id,
        permissionId: request._id,
        status: decision,
        remark: remark.trim(),
      }).unwrap();
      toast.success(`Leave request ${isApprove ? "approved" : "rejected"} successfully`);
      onClose();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update leave request");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-3 sm:px-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-gray-100 transform transition-all duration-300">
        <div className="border-b border-gray-100 px-4 sm:px-6 py-4 sm:py-5 sticky top-0 bg-white z-10">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
            {isApprove ? (
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            ) : (
              <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            )}
            {isApprove ? "Approve Leave Request" : "Reject Leave Request"}
          </h3>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-gray-500 truncate">
            Student: {toTitleCase(`${request.student?.firstName || ""} ${request.student?.lastName || ""}`)}
          </p>
        </div>

        <div className="space-y-3.5 px-4 sm:px-6 py-4 sm:py-5">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 sm:p-4 text-xs sm:text-sm text-gray-700">
            <p className="font-semibold text-gray-900 border-l-2 border-orange-400 pl-2 italic">
              "{request.reason || "Leave request"}"
            </p>
            <p className="mt-2.5 text-xs text-gray-400 font-semibold flex items-center gap-1">
              <span>Duration:</span>
              <span className="text-gray-600 font-bold">
                {formatDate(request.fromDate)} to {formatDate(request.toDate)}
              </span>
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wider">
              Remark <span className="font-normal text-gray-400 lowercase">(optional)</span>
            </label>
            <textarea
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              rows={3}
              placeholder="Add a note or feedback for the student..."
              className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs sm:text-sm outline-none transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        </div>

        <div className="flex gap-2.5 sm:gap-3 px-4 sm:px-6 pb-4 sm:pb-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 py-2.5 text-xs sm:text-sm font-bold text-gray-600 transition-all duration-200 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className={`flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold text-white transition-all duration-200 disabled:opacity-60 cursor-pointer shadow-xs ${
              isApprove 
                ? "bg-emerald-600 hover:bg-emerald-700" 
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {isApprove ? <CheckCircle size={15} /> : <XCircle size={15} />}
            {isLoading ? "Updating..." : isApprove ? "Approve" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
};

const LeaveRequests = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [resolveState, setResolveState] = useState(null);
  const [mobilePage, setMobilePage] = useState(1);
  const mobilePageSize = 10;

  const { data, isLoading, isError, error } = useGetLeaveRequestsQuery("all");

  const requests = data?.data || [];

  const filteredRequests = useMemo(() => {
    let result = requests;

    // 1. Filter by active tab status
    if (activeTab !== "all") {
      result = result.filter((item) => item.status === activeTab);
    }

    // 2. Filter by search term query
    const query = searchTerm.trim().toLowerCase();
    if (query) {
      result = result.filter((item) => {
        const student = item.student || {};
        return [
          student.firstName,
          student.lastName,
          student.prkey,
          student.studentMobile,
          student.subDepartmentId?.name,
          student.currentLevelId?.name,
          student.currentSubLevelId?.name,
          item.reason,
          item.remark,
          item.status,
        ].join(" ").toLowerCase().includes(query);
      });
    }

    return result;
  }, [requests, activeTab, searchTerm]);

  // Reset mobile page whenever filters or search query change
  useEffect(() => {
    setMobilePage(1);
  }, [activeTab, searchTerm]);

  const paginatedMobileRequests = useMemo(() => {
    const start = (mobilePage - 1) * mobilePageSize;
    return filteredRequests.slice(start, start + mobilePageSize);
  }, [filteredRequests, mobilePage]);

  const counts = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((item) => item.status === "pending").length,
      approved: requests.filter((item) => item.status === "approved").length,
      rejected: requests.filter((item) => item.status === "rejected").length,
    };
  }, [requests]);

  const columns = [
    {
      key: "student",
      label: "Student",
      render: (row) => {
        const student = row.student || {};
        return (
          <div className="flex items-center gap-3">
            <div className="relative rounded-full p-0.5 border border-orange-100 shadow-sm flex-shrink-0">
              <Avatar firstName={student.firstName} lastName={student.lastName} imageUrl={student.image} size="md" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 hover:text-orange-500 transition-colors">
                {toTitleCase(`${student.firstName || ""} ${student.lastName || ""}`)}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 tracking-wider">
                  {student.prkey || "NO PR"}
                </span>
                {student.studentMobile && (
                  <span className="text-[10px] text-gray-400 font-medium">
                    • {student.studentMobile}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "department",
      label: "Department",
      render: (row) => {
        const subDept = row.student?.subDepartmentId?.name || "-";
        const level = row.student?.currentLevelId?.name || "";
        const subLevel = row.student?.currentSubLevelId?.name || "";
        return (
          <div className="text-xs text-gray-700">
            <p className="font-bold text-gray-800">{subDept}</p>
            {(level || subLevel) && (
              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-500 font-semibold bg-gray-50 border border-gray-100 rounded-md px-2 py-0.5 w-fit">
                <span>{level} / {subLevel || "—"}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "dateRange",
      label: "Leave Dates",
      render: (row) => {
        const days = getDurationInDays(row.fromDate, row.toDate);
        return (
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-xs text-gray-700">
              <div className="flex items-center gap-1 text-gray-800 font-semibold">
                <span>{formatDate(row.fromDate)}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold mt-0.5">
                <span>to {formatDate(row.toDate)}</span>
              </div>
            </div>
            {days > 0 && (
              <span className="inline-flex rounded-lg bg-orange-50 px-2.5 py-1 text-[10px] font-extrabold text-orange-600 border border-orange-100">
                {days} {days === 1 ? "Day" : "Days"}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "reason",
      label: "Reason / Remark",
      render: (row) => (
        <div className="max-w-xs whitespace-normal text-xs text-gray-700">
          <p className="font-semibold text-gray-800 border-l-2 border-orange-300 pl-2 py-0.5 italic">
            "{row.reason || "No reason provided"}"
          </p>
          {row.remark && (
            <div className="mt-1.5 flex items-start gap-1 rounded bg-gray-50 p-1.5 border border-gray-100">
              <span className="font-extrabold text-[9px] uppercase tracking-wider text-gray-400 flex-shrink-0 mt-0.5">
                Remark:
              </span>
              <span className="text-[10px] text-gray-500 font-medium">{row.remark}</span>
            </div>
          )}
          {row.assignedFacultyId && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-orange-600 font-bold">
              <span>Assigned to:</span>
              <span className="bg-orange-50 px-1.5 py-0.5 rounded text-[9px] uppercase border border-orange-100">{row.assignedFacultyId.name}</span>
            </div>
          )}
          {row.approvedBy && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold">
              <span>Approved by:</span>
              <span className="bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] uppercase border border-emerald-100">{row.approvedBy}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "applied",
      label: "Applied On",
      render: (row) => (
        <div className="text-xs text-gray-600 font-medium">
          {formatDate(row.uploadDate)}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const status = row.status || "pending";
        const styles = statusStyles[status] || statusStyles.pending;
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold capitalize shadow-sm ${styles}`}>
            {status === "pending" && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500"></span>
              </span>
            )}
            {status === "approved" && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            )}
            {status === "rejected" && (
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
            )}
            {status}
          </span>
        );
      },
    },
  ];

  const actionButton = (row) => {
    const hasDoc = Boolean(row.imageURL);
    const isPending = row.status === "pending";

    if (!hasDoc && !isPending) {
      return <span className="text-gray-400 text-xs font-semibold">—</span>;
    }

    return (
      <div className="flex items-center gap-2">
        {hasDoc && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setPreviewUrl(row.imageURL);
            }}
            className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-300 shadow-sm cursor-pointer"
            title="View document"
          >
            <Eye size={14} />
          </button>
        )}
        {isPending && (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setResolveState({ request: row, decision: "approved" });
              }}
              className="flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-500 hover:text-white border border-emerald-100 shadow-sm transition-all duration-300 cursor-pointer"
            >
              <Check size={12} />
              Approve
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setResolveState({ request: row, decision: "rejected" });
              }}
              className="flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-500 hover:text-white border border-rose-100 shadow-sm transition-all duration-300 cursor-pointer"
            >
              <XCircle size={12} />
              Reject
            </button>
          </>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50/50"><Loader /></div>;
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
        <div className="text-center p-6 bg-white rounded-2xl border border-rose-100 shadow-xl max-w-sm">
          <p className="font-bold text-rose-600 mb-2">Error Loading Requests</p>
          <p className="text-xs text-gray-500">{error?.data?.message || "Failed to load leave requests. Please try again."}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        title="Leave Requests"
        subtitle="Review student leave requests for your department"
        badge={`${counts.total} shown`}
      />

      <div className="min-h-screen bg-gray-50/30 px-3.5 sm:px-5 py-4 sm:py-6">
        {/* Statistics Section */}
        <div className="mb-4 sm:mb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {[
              {
                label: "Total Requests",
                value: counts.total,
                statusKey: "all",
                icon: <Inbox className="text-indigo-500" size={18} />,
                activeBorder: "border-indigo-500 ring-2 ring-indigo-500/10",
              },
              {
                label: "Pending",
                value: counts.pending,
                statusKey: "pending",
                icon: <Clock className="text-amber-500" size={18} />,
                pulse: counts.pending > 0,
                activeBorder: "border-amber-500 ring-2 ring-amber-500/10",
              },
              {
                label: "Approved",
                value: counts.approved,
                statusKey: "approved",
                icon: <CheckCircle className="text-emerald-500" size={18} />,
                activeBorder: "border-emerald-500 ring-2 ring-emerald-500/10",
              },
              {
                label: "Rejected",
                value: counts.rejected,
                statusKey: "rejected",
                icon: <XCircle className="text-rose-500" size={18} />,
                activeBorder: "border-rose-500 ring-2 ring-rose-500/10",
              },
            ].map((item) => {
              const isSelected = activeTab === item.statusKey;
              return (
                <div
                  key={item.label}
                  onClick={() => setActiveTab(item.statusKey)}
                  className={`relative overflow-hidden rounded-2xl border bg-white p-3 sm:p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer ${
                    isSelected ? (item.activeBorder || "border-orange-500 ring-2 ring-orange-500/10") : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">{item.value}</p>
                      <p className="mt-1 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider truncate">{item.label}</p>
                    </div>
                    <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gray-50 border border-gray-100 shrink-0">
                      {item.icon}
                      {item.pulse && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-xs">
          {/* Status Tabs */}
          <div className="flex items-center rounded-xl border border-gray-150 bg-gray-50/80 p-1 overflow-x-auto no-scrollbar scroll-smooth [-webkit-overflow-scrolling:touch]">
            {FILTERS.map((item) => {
              const isActive = activeTab === item.value;
              const count = counts[item.value === "all" ? "total" : item.value];
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setActiveTab(item.value)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 sm:px-4 py-2 text-xs font-bold transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-orange-500 text-white shadow-xs"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-gray-200/80 text-gray-600"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search student, PR key, reason..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/70 pl-9 pr-9 text-xs sm:text-sm font-medium text-gray-800 outline-none transition-all duration-200 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ── DESKTOP & TABLET VIEW: FULL DATA TABLE (>= 768px) ── */}
        <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden p-1">
          <CommonTable
            data={filteredRequests}
            columns={columns}
            editable
            actionButton={actionButton}
            pagination
            rowsPerPage={10}
          />
        </div>

        {/* ── MOBILE VIEW: MODERN LEAVE REQUEST CARDS (< 768px) ── */}
        <div className="md:hidden space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto">
                <Inbox size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">No leave requests found</p>
                <p className="text-xs text-gray-400 mt-1">
                  {searchTerm ? "No requests match your search criteria" : `No ${activeTab} leave requests`}
                </p>
              </div>
              {(searchTerm || activeTab !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setActiveTab("all");
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-3.5 py-2 rounded-xl border border-orange-200 hover:bg-orange-100 transition cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {paginatedMobileRequests.map((row) => {
                const student = row.student || {};
                const studentName = toTitleCase(`${student.firstName || ""} ${student.lastName || ""}`);
                const days = getDurationInDays(row.fromDate, row.toDate);
                const status = row.status || "pending";
                const isPending = status === "pending";
                const hasDoc = Boolean(row.imageURL);
                const subDept = student.subDepartmentId?.name || "";
                const level = student.currentLevelId?.name || "";
                const subLevel = student.currentSubLevelId?.name || "";

                return (
                  <div
                    key={row._id}
                    className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs hover:shadow-sm hover:border-orange-200 transition-all duration-200 space-y-3"
                  >
                    {/* Top Row: Avatar, Student Name, PR Key, Status Badge */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Avatar firstName={student.firstName} lastName={student.lastName} imageUrl={student.image} size="md" />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-gray-900 truncate leading-snug">
                            {studentName || "Unnamed Student"}
                          </h4>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-[10.5px] font-mono font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                              {student.prkey || "NO PR"}
                            </span>
                            {student.studentMobile && (
                              <a
                                href={`tel:${student.studentMobile}`}
                                className="text-[11px] font-medium text-orange-600 hover:underline flex items-center gap-0.5"
                              >
                                <Phone size={10} />
                                <span>{student.studentMobile}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Pill */}
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize shrink-0 ${statusStyles[status] || statusStyles.pending}`}>
                        {status === "pending" && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                          </span>
                        )}
                        {status === "approved" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        )}
                        {status === "rejected" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                        )}
                        {status}
                      </span>
                    </div>

                    {/* Department / Class Pill */}
                    {(subDept || level) && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 flex-wrap">
                        {subDept && (
                          <span className="font-semibold text-gray-800 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md text-[11px]">
                            {subDept}
                          </span>
                        )}
                        {(level || subLevel) && (
                          <span className="text-[10.5px] text-gray-500 font-medium bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                            {level} {subLevel ? `• ${subLevel}` : ""}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Date Range & Duration Highlight Box */}
                    <div className="bg-orange-50/40 rounded-xl p-3 border border-orange-100/80 text-xs flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-gray-800 font-bold text-xs">
                          <Calendar size={13} className="text-orange-500 shrink-0" />
                          <span>{formatDate(row.fromDate)}</span>
                          <span className="text-gray-400 font-normal">→</span>
                          <span>{formatDate(row.toDate)}</span>
                        </div>
                        <p className="text-[10.5px] text-gray-400 font-medium">
                          Applied: <span className="text-gray-600">{formatDate(row.uploadDate)}</span>
                        </p>
                      </div>

                      {days > 0 && (
                        <span className="inline-flex rounded-xl bg-orange-500 text-white px-2.5 py-1 text-xs font-black shrink-0 shadow-2xs">
                          {days} {days === 1 ? "Day" : "Days"}
                        </span>
                      )}
                    </div>

                    {/* Reason / Remark Box */}
                    <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-150 text-xs space-y-2">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Reason:</span>
                        <p className="font-semibold text-gray-800 border-l-2 border-orange-400 pl-2.5 py-0.5 italic text-xs leading-relaxed">
                          "{row.reason || "No reason provided"}"
                        </p>
                      </div>

                      {row.remark && (
                        <div className="pt-2 border-t border-gray-200/70">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Faculty Remark:</span>
                          <p className="text-[11px] text-gray-600 font-medium">{row.remark}</p>
                        </div>
                      )}

                      {(row.assignedFacultyId || row.approvedBy) && (
                        <div className="pt-2 border-t border-gray-200/70 flex items-center gap-2 flex-wrap text-[10.5px]">
                          {row.assignedFacultyId && (
                            <span className="text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md font-semibold">
                              Assigned: {row.assignedFacultyId.name}
                            </span>
                          )}
                          {row.approvedBy && (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-semibold">
                              Approved by: {row.approvedBy}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                      {hasDoc && (
                        <button
                          type="button"
                          onClick={() => setPreviewUrl(row.imageURL)}
                          className={`flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition shadow-2xs cursor-pointer ${
                            isPending ? "flex-initial" : "flex-1"
                          }`}
                        >
                          <Eye size={14} className="text-indigo-600" />
                          <span>View Doc</span>
                        </button>
                      )}

                      {isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => setResolveState({ request: row, decision: "approved" })}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white px-3 py-2 text-xs font-bold shadow-2xs transition cursor-pointer"
                          >
                            <Check size={14} />
                            <span>Approve</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setResolveState({ request: row, decision: "rejected" })}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 active:scale-95 text-rose-700 px-3 py-2 text-xs font-bold shadow-2xs transition cursor-pointer"
                          >
                            <XCircle size={14} />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Mobile Pagination */}
              {filteredRequests.length > mobilePageSize && (
                <div className="bg-white rounded-2xl border border-gray-200 p-3 shadow-xs">
                  <Pagination
                    totalItems={filteredRequests.length}
                    currentPage={mobilePage}
                    pageSize={mobilePageSize}
                    totalPages={Math.max(1, Math.ceil(filteredRequests.length / mobilePageSize))}
                    onPageChange={setMobilePage}
                    label="requests"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Preview Supporting Document Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-3 sm:px-4 transition-opacity duration-300"
          onClick={() => setPreviewUrl("")}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-4 sm:p-5 shadow-2xl border border-gray-100 transform transition-all duration-300"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 sm:mb-4 flex items-center justify-between border-b border-gray-100 pb-2.5 sm:pb-3">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">Supporting Document</h3>
              <button
                onClick={() => setPreviewUrl("")}
                className="text-xl font-extrabold text-gray-400 hover:text-gray-600 transition-colors p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center min-h-[250px] sm:min-h-[300px]">
              {previewUrl.toLowerCase().includes(".pdf") ? (
                <div className="py-10 text-center px-4">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 border border-red-100 shadow-xs">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-gray-800">PDF Document</p>
                  <p className="text-xs text-gray-400 mt-1">This document is ready to be opened in a new tab</p>
                </div>
              ) : (
                <img src={previewUrl} alt="Leave request document" className="max-h-[60vh] w-full object-contain" />
              )}
            </div>
            <div className="mt-3 sm:mt-4 flex justify-end gap-2.5 sm:gap-3 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setPreviewUrl("")}
                className="px-3.5 sm:px-4 py-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-xs font-bold text-gray-600 rounded-xl transition duration-200 cursor-pointer"
              >
                Close
              </button>
              <a 
                href={previewUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-3.5 sm:px-4 py-2 bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white rounded-xl transition duration-200 shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Open in new tab</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {resolveState && (
        <ResolveModal
          request={resolveState.request}
          decision={resolveState.decision}
          onClose={() => setResolveState(null)}
        />
      )}
    </>
  );
};

export default LeaveRequests;
