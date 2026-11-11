/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiExternalLink,
  FiImage,
  FiInbox,
  FiLayers,
  FiMail,
  FiMessageSquare,
  FiMonitor,
  FiPhone,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiShield,
  FiUser,
  FiX,
} from "react-icons/fi";
import {
  useAddSupportTicketCommentMutation,
  useGetSupportTicketsQuery,
  useUpdateSupportTicketStatusMutation,
} from "../../../../redux/api/authApi";
import {
  SEVERITY_META,
  SEVERITY_OPTIONS,
  STATUS_META,
  formatRelativeDate,
} from "./supportConstants";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const formatRoleLabel = (role) =>
  role ? role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Staff";

const formatTicketType = (type) =>
  type ? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Bug";

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "SP";

function KpiCard({ label, count, icon: Icon, tone, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-2xl border p-4 text-left transition-all ${
        active
          ? `${tone.activeBorder} ${tone.activeBg} shadow-sm`
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-xl border ${tone.iconWrap}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2.5 flex items-baseline justify-between">
        <span className="text-2xl font-bold tracking-tight text-slate-900">{count}</span>
        {tone.pulse && count > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-600" />
            Urgent
          </span>
        )}
      </div>
    </button>
  );
}

function ImageLightbox({ imageUrl, onClose }) {
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-5xl overflow-hidden rounded-2xl bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close screenshot preview"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/80 text-white transition hover:bg-slate-800"
        >
          <FiX className="h-5 w-5" />
        </button>
        <img
          src={imageUrl}
          alt="Support ticket screenshot"
          className="max-h-[88vh] w-auto object-contain"
        />
      </div>
    </div>
  );
}

function TicketDetailModal({
  ticket,
  canManageTickets,
  onClose,
  onTicketUpdated,
  onPreviewImage,
}) {
  const [nextStatus, setNextStatus] = useState(ticket.status || "open");
  const [developerNote, setDeveloperNote] = useState("");
  const [commentMessage, setCommentMessage] = useState("");

  const [updateTicketStatus, { isLoading: isUpdatingStatus }] =
    useUpdateSupportTicketStatusMutation();
  const [addComment, { isLoading: isPostingComment }] =
    useAddSupportTicketCommentMutation();

  useEffect(() => {
    setNextStatus(ticket.status || "open");
    setDeveloperNote("");
  }, [ticket._id, ticket.status]);

  const statusMeta = STATUS_META[ticket.status] || STATUS_META.open;
  const severityMeta = SEVERITY_META[ticket.severity] || SEVERITY_META.medium;
  const hasStatusChange = nextStatus !== ticket.status || developerNote.trim().length > 0;

  const handleStatusSave = async (e) => {
    e.preventDefault();
    if (!hasStatusChange) return;

    try {
      const res = await updateTicketStatus({
        id: ticket._id,
        status: nextStatus,
        developerNote: developerNote.trim(),
      }).unwrap();
      toast.success(res?.message || `Ticket ${ticket.ticketCode} updated`);
      setDeveloperNote("");
      if (res?.data) onTicketUpdated(res.data);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update ticket");
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    const trimmed = commentMessage.trim();
    if (!trimmed) {
      toast.warning("Please enter a comment message first");
      return;
    }

    try {
      const res = await addComment({ id: ticket._id, message: trimmed }).unwrap();
      toast.success("Comment added");
      setCommentMessage("");
      if (res?.data) onTicketUpdated(res.data);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to add comment");
    }
  };

  const env = ticket.environmentInfo || {};
  const hasEnvInfo = env.browser || env.platform || env.screenResolution;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 flex-shrink-0" />
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-orange-50/30 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-lg bg-orange-500 px-2.5 py-1 font-mono text-xs font-bold text-white shadow-2xs">
              {ticket.ticketCode}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusMeta.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
              {statusMeta.label}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${severityMeta.pill}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${severityMeta.dot}`} />
              {severityMeta.label} Priority
            </span>
            <span className="text-xs text-slate-500">
              Reported {formatRelativeDate(ticket.createdAt)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close ticket modal"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-5 lg:grid-cols-12">
          {/* Left Main Column */}
          <div className="space-y-5 lg:col-span-8">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
                  {ticket.module || "Other"}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {formatTicketType(ticket.type)}
                </span>
                {ticket.source === "direct_mail" && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    <FiMail className="h-3 w-3" />
                    Direct Mail
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900">{ticket.subject}</h3>
              {ticket.pageUrl && (
                <p className="mt-1 inline-flex items-center gap-1.5 break-all text-xs text-slate-500">
                  <FiExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>Page: {ticket.pageUrl}</span>
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Issue Description
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {ticket.description}
              </p>
            </div>

            {ticket.developerNote && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
                    <FiCheckCircle className="h-3.5 w-3.5" />
                    Latest Resolution Note
                  </p>
                  {ticket.resolvedBy?.name && (
                    <span className="text-xs font-medium text-emerald-700">
                      Updated by {ticket.resolvedBy.name}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-emerald-950">
                  {ticket.developerNote}
                </p>
              </div>
            )}

            {/* Screenshots */}
            {Array.isArray(ticket.screenshots) && ticket.screenshots.length > 0 && (
              <div>
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <FiImage className="h-3.5 w-3.5" />
                  Attached Screenshots ({ticket.screenshots.length})
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {ticket.screenshots.map((shot, idx) => (
                    <button
                      key={shot._id || `${shot.url}-${idx}`}
                      type="button"
                      onClick={() => onPreviewImage(shot.url)}
                      className="group relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-left transition hover:border-orange-400"
                    >
                      <img
                        src={shot.url}
                        alt={`Screenshot ${idx + 1}`}
                        className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                      />
                      <span className="absolute bottom-1.5 right-1.5 rounded-md bg-slate-900/75 px-2 py-0.5 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                        Zoom
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Environment Info */}
            {hasEnvInfo && (
              <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <FiMonitor className="h-3.5 w-3.5" />
                  Auto-Captured Browser Diagnostics
                </p>
                <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-3">
                  <div>
                    <span className="font-semibold text-slate-700">Browser:</span>{" "}
                    {env.browser || "—"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Platform:</span>{" "}
                    {env.platform || "—"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Screen:</span>{" "}
                    {env.screenResolution || "—"}
                  </div>
                </div>
              </div>
            )}

            {/* Comments Thread */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <FiMessageSquare className="h-3.5 w-3.5" />
                Activity & Replies ({ticket.comments?.length || 0})
              </p>

              {ticket.comments?.length > 0 ? (
                <div className="mb-4 max-h-64 space-y-2.5 overflow-y-auto pr-1">
                  {ticket.comments.map((comment, idx) => (
                    <div
                      key={comment._id || idx}
                      className={`rounded-xl border p-3 ${
                        comment.isDeveloperReply
                          ? "border-orange-200 bg-orange-50/50"
                          : "border-slate-200 bg-slate-50/70"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {comment.authorName}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              comment.isDeveloperReply
                                ? "bg-orange-100 text-orange-700"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {comment.isDeveloperReply
                              ? "Support / Resolver"
                              : formatRoleLabel(comment.authorRole)}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {formatRelativeDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">
                        {comment.message}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                  No replies yet. Add a follow-up note or clarification below.
                </p>
              )}

              <form onSubmit={handleCommentSubmit} className="space-y-2">
                <textarea
                  rows={2}
                  value={commentMessage}
                  onChange={(e) => setCommentMessage(e.target.value)}
                  placeholder="Add a follow-up note or reply..."
                  maxLength={3000}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isPostingComment || !commentMessage.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-orange-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    <FiSend className="h-3.5 w-3.5" />
                    {isPostingComment ? "Sending..." : "Post Reply"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4 lg:col-span-4">
            {/* Reporter Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Reported By
              </p>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-xs font-bold text-orange-700">
                  {getInitials(ticket.reportedBy?.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {ticket.reportedBy?.name || "Portal User"}
                  </p>
                  <p className="text-xs text-slate-600">
                    {formatRoleLabel(ticket.reportedBy?.role)}
                    {ticket.reportedBy?.department
                      ? ` • ${ticket.reportedBy.department}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {ticket.reportedBy?.email && (
                  <a
                    href={`mailto:${ticket.reportedBy.email}?subject=${encodeURIComponent(
                      `Re: [${ticket.ticketCode}] ${ticket.subject}`
                    )}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
                  >
                    <FiMail className="h-3.5 w-3.5" />
                    Email Reporter
                  </a>
                )}
                {ticket.reportedBy?.mobileNo && (
                  <a
                    href={`tel:${ticket.reportedBy.mobileNo}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                  >
                    <FiPhone className="h-3.5 w-3.5" />
                    Call
                  </a>
                )}
              </div>
            </div>

            {/* Assignment & Delivery Metadata */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs">
              <p className="mb-2.5 font-semibold uppercase tracking-wider text-slate-500">
                Routing & Delivery
              </p>
              <div className="space-y-2 text-slate-600">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500">Assigned To:</span>
                  <span className="text-right font-semibold text-slate-800">
                    {ticket.assignedToNames?.join(" & ") || "Lead Developers"}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500">Email Alert:</span>
                  <span
                    className={`font-semibold ${
                      ticket.emailDelivery?.sent ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {ticket.emailDelivery?.sent ? "Delivered via SMTP" : "Portal Logged"}
                  </span>
                </div>
                {ticket.resolvedAt && (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-500">Resolved:</span>
                    <span className="font-semibold text-slate-800">
                      {formatRelativeDate(ticket.resolvedAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Resolution Control Panel (SuperAdmin + Developers + HOD only) */}
            {canManageTickets ? (
              <form
                onSubmit={handleStatusSave}
                className="rounded-xl border border-orange-200 bg-orange-50/40 p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <FiShield className="h-4 w-4 text-orange-600" />
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-900">
                    Resolution Controls
                  </p>
                </div>

                <label className="block text-xs font-semibold text-slate-700">
                  Ticket Status
                </label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>

                <label className="mt-3 block text-xs font-semibold text-slate-700">
                  Resolution Note (optional)
                </label>
                <textarea
                  rows={3}
                  value={developerNote}
                  onChange={(e) => setDeveloperNote(e.target.value)}
                  placeholder="Write a resolution summary or update note for the reporter..."
                  maxLength={3000}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
                />

                <button
                  type="submit"
                  disabled={isUpdatingStatus || !hasStatusChange}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-orange-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  <FiCheckCircle className="h-4 w-4" />
                  {isUpdatingStatus ? "Updating..." : "Save Resolution Update"}
                </button>
              </form>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-500">
                Ticket status updates are restricted to SuperAdmin, Portal Developers, and Department HODs. For urgent follow-ups, post a reply or call the developers directly.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TicketTracker({ onReportNewBug }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [scope, setScope] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTicketSnapshot, setSelectedTicketSnapshot] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const {
    data: ticketRes,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetSupportTicketsQuery({
    status: statusFilter,
    severity: severityFilter,
    search: debouncedSearch,
    scope,
  });

  const tickets = useMemo(() => ticketRes?.data || [], [ticketRes?.data]);
  const canManageTickets = Boolean(ticketRes?.canManageTickets);
  const stats = ticketRes?.stats || {
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    criticalOpen: 0,
  };

  // Prefer live query ticket so comments/status reflect immediately after RTK invalidation
  const activeTicket = useMemo(() => {
    if (!selectedTicketSnapshot) return null;
    return (
      tickets.find((t) => t._id === selectedTicketSnapshot._id) || selectedTicketSnapshot
    );
  }, [tickets, selectedTicketSnapshot]);

  const kpiCards = [
    {
      key: "total",
      label: "Total Tickets",
      count: stats.total,
      icon: FiLayers,
      active: statusFilter === "all" && severityFilter === "all",
      onClick: () => {
        setStatusFilter("all");
        setSeverityFilter("all");
      },
      tone: {
        activeBorder: "border-orange-500 ring-2 ring-orange-500/15",
        activeBg: "bg-orange-50/40",
        iconWrap: "border-orange-200 bg-orange-50 text-orange-600",
      },
    },
    {
      key: "open",
      label: "Open",
      count: stats.open,
      icon: FiInbox,
      active: statusFilter === "open",
      onClick: () => setStatusFilter((prev) => (prev === "open" ? "all" : "open")),
      tone: {
        activeBorder: "border-rose-300",
        activeBg: "bg-rose-50/40",
        iconWrap: "border-rose-200 bg-rose-50 text-rose-600",
      },
    },
    {
      key: "in_progress",
      label: "In Progress",
      count: stats.in_progress,
      icon: FiClock,
      active: statusFilter === "in_progress",
      onClick: () =>
        setStatusFilter((prev) => (prev === "in_progress" ? "all" : "in_progress")),
      tone: {
        activeBorder: "border-amber-300",
        activeBg: "bg-amber-50/40",
        iconWrap: "border-amber-200 bg-amber-50 text-amber-600",
      },
    },
    {
      key: "resolved",
      label: "Resolved",
      count: stats.resolved,
      icon: FiCheckCircle,
      active: statusFilter === "resolved",
      onClick: () =>
        setStatusFilter((prev) => (prev === "resolved" ? "all" : "resolved")),
      tone: {
        activeBorder: "border-emerald-300",
        activeBg: "bg-emerald-50/40",
        iconWrap: "border-emerald-200 bg-emerald-50 text-emerald-600",
      },
    },
    {
      key: "critical",
      label: "Critical Active",
      count: stats.criticalOpen,
      icon: FiAlertTriangle,
      active: severityFilter === "critical",
      onClick: () =>
        setSeverityFilter((prev) => (prev === "critical" ? "all" : "critical")),
      tone: {
        pulse: true,
        activeBorder: "border-rose-400",
        activeBg: "bg-rose-50/60",
        iconWrap: "border-rose-200 bg-rose-50 text-rose-600",
      },
    },
  ];

  const hasActiveFilters =
    statusFilter !== "all" || severityFilter !== "all" || debouncedSearch.length > 0;

  return (
    <div className="space-y-5">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((card) => (
          <KpiCard key={card.key} {...card} />
        ))}
      </div>

      {/* Filters & Scope Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search + Severity */}
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px] flex-1">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by ticket code (SUP-...), subject, module, reporter..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-8 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/15"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <FiX className="h-4 w-4" />
                </button>
              )}
            </div>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              aria-label="Filter by severity"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
            >
              <option value="all">All Severities</option>
              {SEVERITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={refetch}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <FiRefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Scope Toggle for Resolvers */}
          {canManageTickets && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                <FiShield className="h-3.5 w-3.5" />
                Resolver Mode
              </span>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1">
                <button
                  type="button"
                  onClick={() => setScope("all")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                    scope === "all"
                      ? "bg-orange-500 text-white shadow-2xs"
                      : "text-slate-600 hover:text-orange-600"
                  }`}
                >
                  All Scoped Tickets
                </button>
                <button
                  type="button"
                  onClick={() => setScope("mine")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                    scope === "mine"
                      ? "bg-orange-500 text-white shadow-2xs"
                      : "text-slate-600 hover:text-orange-600"
                  }`}
                >
                  My Submitted
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  statusFilter === opt.value
                    ? "bg-orange-500 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setSeverityFilter("all");
                setSearchInput("");
              }}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Tickets List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((row) => (
            <div
              key={row}
              className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center">
          <p className="text-sm font-semibold text-rose-800">
            Unable to load support tickets:{" "}
            {error?.data?.message || "Please try again"}
          </p>
          <button
            type="button"
            onClick={refetch}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
          >
            <FiRefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <FiInbox className="h-6 w-6" />
          </div>
          <h4 className="mt-3 text-base font-bold text-slate-900">
            {hasActiveFilters ? "No matching tickets found" : "No support tickets yet"}
          </h4>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            {hasActiveFilters
              ? "Try adjusting your filters or search keyword."
              : "Raise a new ticket whenever you encounter a portal bug, UI issue, or data mismatch."}
          </p>
          {onReportNewBug && (
            <button
              type="button"
              onClick={onReportNewBug}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-orange-600 active:scale-[0.98] cursor-pointer"
            >
              <FiPlus className="h-4 w-4" />
              Report New Issue
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const statusMeta = STATUS_META[ticket.status] || STATUS_META.open;
            const severityMeta = SEVERITY_META[ticket.severity] || SEVERITY_META.medium;
            const screenshotCount = ticket.screenshots?.length || 0;
            const commentCount = ticket.comments?.length || 0;

            const statusBorderAccent =
              ticket.status === "open"
                ? "border-l-4 border-l-rose-500"
                : ticket.status === "in_progress"
                ? "border-l-4 border-l-amber-500"
                : ticket.status === "resolved"
                ? "border-l-4 border-l-emerald-500"
                : "border-l-4 border-l-slate-300";

            return (
              <div
                key={ticket._id}
                onClick={() => setSelectedTicketSnapshot(ticket)}
                className={`group cursor-pointer rounded-2xl border border-slate-200/90 ${statusBorderAccent} bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md sm:p-5`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-0.5 font-mono text-xs font-extrabold text-orange-700">
                        {ticket.ticketCode}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusMeta.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                        {statusMeta.label}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${severityMeta.pill}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${severityMeta.dot}`} />
                        {severityMeta.label}
                      </span>
                      <span className="rounded-md bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
                        {ticket.module || "Other"}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {formatTicketType(ticket.type)}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 transition group-hover:text-orange-600">
                      {ticket.subject}
                    </h4>
                    <p className="line-clamp-2 text-sm text-slate-600">
                      {ticket.description}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-row items-center justify-between gap-2 sm:flex-col sm:items-end">
                    <span className="text-xs font-medium text-slate-500">
                      {formatRelativeDate(ticket.createdAt)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTicketSnapshot(ticket);
                      }}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition group-hover:border-orange-300 group-hover:bg-orange-50 group-hover:text-orange-700"
                    >
                      {canManageTickets ? "View / Resolve" : "View Thread"}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                      <FiUser className="h-3.5 w-3.5 text-slate-400" />
                      {ticket.reportedBy?.name || "Portal User"}
                      {ticket.reportedBy?.role
                        ? ` (${formatRoleLabel(ticket.reportedBy.role)})`
                        : ""}
                    </span>
                    <span>
                      Assigned:{" "}
                      <strong className="font-semibold text-slate-700">
                        {ticket.assignedToNames?.join(" & ") || "Developers"}
                      </strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {screenshotCount > 0 && (
                      <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                        <FiImage className="h-3.5 w-3.5 text-slate-400" />
                        {screenshotCount}
                      </span>
                    )}
                    {commentCount > 0 && (
                      <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                        <FiMessageSquare className="h-3.5 w-3.5 text-slate-400" />
                        {commentCount}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        ticket.emailDelivery?.sent
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                      title={
                        ticket.emailDelivery?.sent
                          ? "SMTP email alert delivered to developers"
                          : "Ticket logged in portal; portal notification dispatched"
                      }
                    >
                      <FiMail className="h-3.5 w-3.5" />
                      {ticket.emailDelivery?.sent ? "Mail Sent" : "Portal Logged"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTicket && (
        <TicketDetailModal
          ticket={activeTicket}
          canManageTickets={canManageTickets}
          onClose={() => setSelectedTicketSnapshot(null)}
          onTicketUpdated={(updated) => setSelectedTicketSnapshot(updated)}
          onPreviewImage={(url) => setLightboxUrl(url)}
        />
      )}

      <ImageLightbox imageUrl={lightboxUrl} onClose={() => setLightboxUrl("")} />
    </div>
  );
}
