import { useState, useMemo, useRef, useEffect } from "react";
import {
  MdCalendarMonth,
  MdAdd,
  MdEdit,
  MdDelete,
  MdCheckCircle,
  MdSchedule,
  MdArchive,
  MdSearch,
  MdClose,
  MdExpandMore,
} from "react-icons/md";
import { toast } from "react-toastify";
import {
  useGetAllSessionsQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
  useActivateSessionMutation,
  useUpdateSessionStatusMutation,
} from "../../../../redux/api/authApi";
import Header from "../../../shared/sidebar/Header";
import Loader from "../../../shared/loader/Loader";

const STATUS_TABS = [
  { id: "all", label: "All Sessions" },
  { id: "active", label: "Active" },
  { id: "upcoming", label: "Upcoming" },
  { id: "archived", label: "Archived" },
  { id: "completed", label: "Completed" },
];

const SessionStatusBadge = ({ status, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const config = {
    active: {
      label: "Active",
      buttonBg: "bg-emerald-50 hover:bg-emerald-100/90 text-emerald-700 border-emerald-200/90 hover:border-emerald-300 shadow-emerald-500/5",
      dot: (
        <span className="relative flex h-2 w-2 mr-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      ),
      dotColor: "bg-emerald-500",
    },
    upcoming: {
      label: "Upcoming",
      buttonBg: "bg-blue-50 hover:bg-blue-100/90 text-blue-700 border-blue-200/90 hover:border-blue-300 shadow-blue-500/5",
      dot: <span className="inline-flex rounded-full h-2 w-2 bg-blue-500 mr-1.5 shrink-0"></span>,
      dotColor: "bg-blue-500",
    },
    completed: {
      label: "Completed",
      buttonBg: "bg-amber-50 hover:bg-amber-100/90 text-amber-700 border-amber-200/90 hover:border-amber-300 shadow-amber-500/5",
      dot: <span className="inline-flex rounded-full h-2 w-2 bg-amber-500 mr-1.5 shrink-0"></span>,
      dotColor: "bg-amber-500",
    },
    archived: {
      label: "Archived",
      buttonBg: "bg-slate-100 hover:bg-slate-200/80 text-slate-600 border-slate-200/90 hover:border-slate-300",
      dot: <span className="inline-flex rounded-full h-2 w-2 bg-slate-400 mr-1.5 shrink-0"></span>,
      dotColor: "bg-slate-400",
    },
  };

  const current = config[status] || config.upcoming;

  const options = [
    { value: "active", label: "Active", dotColor: "bg-emerald-500" },
    { value: "upcoming", label: "Upcoming", dotColor: "bg-blue-500" },
    { value: "completed", label: "Completed", dotColor: "bg-amber-500" },
    { value: "archived", label: "Archived", dotColor: "bg-slate-400" },
  ];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-full border text-[11px] sm:text-xs font-bold transition-all duration-200 flex items-center justify-between gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer select-none ${current.buttonBg}`}
        title="Click to update session status"
      >
        <div className="flex items-center">
          {current.dot}
          <span className="tracking-wide">{current.label}</span>
        </div>
        <MdExpandMore
          size={16}
          className={`transition-transform duration-200 shrink-0 opacity-75 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-36 sm:w-40 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 z-40 animate-fadeIn">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1">Set Status</p>
          {options.map((opt) => {
            const isSelected = opt.value === status;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onStatusChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-slate-100 text-slate-900 font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${opt.dotColor}`}></span>
                  <span>{opt.label}</span>
                </div>
                {isSelected && <MdCheckCircle size={14} className="text-emerald-500" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SessionManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Pass all=true so admin can see all sessions (active, upcoming, archived, completed)
  const { data, isLoading, refetch } = useGetAllSessionsQuery(true);
  const sessions = data?.data || [];

  const [createSession] = useCreateSessionMutation();
  const [updateSession] = useUpdateSessionMutation();
  const [deleteSession] = useDeleteSessionMutation();
  const [activateSession] = useActivateSessionMutation();
  const [updateSessionStatus] = useUpdateSessionStatusMutation();

  const getComputedStatus = (session) => {
    if (session.isActive || session.status === "active") return "active";
    if (session.status) return session.status;
    const now = new Date();
    const start = new Date(session.startDate);
    const end = new Date(session.endDate);
    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "active";
    return "completed";
  };

  const stats = useMemo(() => {
    const total = sessions.length;
    let active = 0;
    let upcoming = 0;
    let completed = 0;
    let archived = 0;

    sessions.forEach((s) => {
      const st = getComputedStatus(s);
      if (st === "active") active++;
      else if (st === "upcoming") upcoming++;
      else if (st === "completed") completed++;
      else if (st === "archived") archived++;
    });

    return { total, active, upcoming, completed, archived };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const computedStatus = getComputedStatus(s);
      const matchStatus = statusFilter === "all" || computedStatus === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [sessions, searchQuery, statusFilter]);

  const openAdd = () => {
    setEditingSession(null);
    setFormData({ name: "", startDate: "", endDate: "", description: "" });
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditingSession(s);
    setFormData({
      name: s.name,
      startDate: s.startDate ? new Date(s.startDate).toISOString().split("T")[0] : "",
      endDate: s.endDate ? new Date(s.endDate).toISOString().split("T")[0] : "",
      description: s.description || "",
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSession(null);
    setFormData({ name: "", startDate: "", endDate: "", description: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.startDate || !formData.endDate) {
      toast.error("Name, start date, and end date are required");
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast.error("End date must be after start date");
      return;
    }

    setSubmitting(true);
    try {
      if (editingSession) {
        await updateSession({ id: editingSession._id, ...formData }).unwrap();
        toast.success("Session updated successfully!");
      } else {
        await createSession(formData).unwrap();
        toast.success("Session created successfully!");
      }
      handleCancel();
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (session) => {
    const id = session?._id || session;
    const sessionName = session?.name || "this session";
    if (!window.confirm(`Delete session "${sessionName}"?`)) return;
    try {
      await deleteSession(id).unwrap();
      toast.success("Session deleted successfully!");
      refetch();
    } catch (err) {
      if (err?.data?.hasStudents) {
        const confirmForce = window.confirm(
          `Session "${sessionName}" has ${err.data.studentCount} enrolled student(s).\n\n` +
          `Deleting it will reassign these students to the active session.\n\n` +
          `Do you want to proceed with deleting this session?`
        );
        if (confirmForce) {
          try {
            await deleteSession({ id, force: true }).unwrap();
            toast.success("Session deleted and students reassigned successfully!");
            refetch();
          } catch (forceErr) {
            toast.error(forceErr?.data?.message || "Failed to delete session");
          }
        }
      } else {
        toast.error(err?.data?.message || "Delete failed");
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      if (newStatus === "active") {
        await activateSession(id).unwrap();
      } else {
        await updateSessionStatus({ id, status: newStatus }).unwrap();
      }
      toast.success(`Session status updated to ${newStatus}!`);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Status update failed");
    }
  };

  if (isLoading) return <Loader />;

  return (
    <>
      <Header
        title="Session Management"
        subtitle="Academic year lifecycle, calendar schedules & session statuses"
        badge={`${sessions.length} total sessions`}
        breadcrumbs={[{ label: "Settings" }, { label: "Sessions", path: "/session-management" }]}
      />

      <div className="p-3 sm:p-5 lg:p-6 w-full min-h-screen bg-gray-50/40 space-y-4 sm:space-y-6">

        {/* Quick Statistics Bar (2x2 Grid on Mobile, 4-Cols on Desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider truncate">
                Total Sessions
              </p>
              <p className="text-lg sm:text-2xl font-black text-slate-800 mt-0.5">{stats.total}</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center shrink-0">
              <MdCalendarMonth size={18} />
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider truncate">
                Active Session
              </p>
              <p className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5">{stats.active}</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <MdCheckCircle size={18} />
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider truncate">
                Upcoming
              </p>
              <p className="text-lg sm:text-2xl font-black text-blue-600 mt-0.5">{stats.upcoming}</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <MdSchedule size={18} />
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider truncate">
                Past / Archived
              </p>
              <p className="text-lg sm:text-2xl font-black text-amber-600 mt-0.5">
                {stats.completed + stats.archived}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
              <MdArchive size={18} />
            </div>
          </div>
        </div>

        {/* Top actions layout */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xs">
          <button
            onClick={openAdd}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs active:scale-95 cursor-pointer"
          >
            <MdAdd size={18} /> Add New Session
          </button>

          {sessions.length > 0 && (
            <div className="relative w-full sm:w-72 md:w-80">
              <MdSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sessions by name or details..."
                className="w-full pl-9 pr-8 h-10 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50 hover:bg-white text-slate-800 placeholder-slate-400 transition shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  aria-label="Clear search"
                >
                  <MdClose size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Status Tabs with styled count badges */}
        <div className="overflow-x-auto pb-1 -mb-1">
          <div className="flex gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 w-fit min-w-full sm:min-w-0">
            {STATUS_TABS.map((tab) => {
              const count =
                tab.id === "all"
                  ? sessions.length
                  : sessions.filter((s) => getComputedStatus(s) === tab.id).length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
                    statusFilter === tab.id
                      ? "bg-white text-orange-600 shadow-2xs font-extrabold"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                      statusFilter === tab.id
                        ? "bg-orange-100 text-orange-600"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* List of filtered session cards */}
        {filteredSessions.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center py-16 text-center shadow-2xs p-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mb-3 border border-orange-100">
              <MdCalendarMonth size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">No sessions match filters</h3>
            <p className="text-xs text-slate-400 font-medium max-w-sm">
              Try adjusting your search query or create a new academic session.
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-3 text-xs font-bold text-orange-500 hover:text-orange-600 cursor-pointer"
              >
                Clear search query
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {filteredSessions.map((session) => {
              const currentStatus = getComputedStatus(session);
              return (
                <div
                  key={session._id}
                  className="bg-white border border-slate-200/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-2xs hover:shadow-xs hover:border-orange-200/80 transition-all space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4"
                >
                  {/* Left Section: Icon + Title + Dates + Description */}
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-50 flex items-center justify-center shrink-0 border border-orange-100 text-orange-500 shadow-2xs">
                      <MdCalendarMonth size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-sm text-slate-900 truncate">
                          {session.name}
                        </h4>
                        {/* Mobile Status Badge on top-right */}
                        <div className="sm:hidden ml-auto">
                          <SessionStatusBadge
                            status={currentStatus}
                            onStatusChange={(val) => handleStatusChange(session._id, val)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                          {session.startDate && session.endDate ? (
                            `${new Date(session.startDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })} - ${new Date(session.endDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}`
                          ) : (
                            `Created ${new Date(session.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}`
                          )}
                        </span>
                        {session.description && (
                          <span className="text-[11px] text-slate-400 font-medium truncate">
                            • {session.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Section: Status Badge (desktop) & Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* Desktop Status Badge */}
                    <div className="hidden sm:block">
                      <SessionStatusBadge
                        status={currentStatus}
                        onStatusChange={(val) => handleStatusChange(session._id, val)}
                      />
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                      <button
                        onClick={() => openEdit(session)}
                        className="p-2 rounded-xl text-slate-500 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 sm:border-transparent hover:border-blue-100 transition flex items-center justify-center cursor-pointer shadow-2xs sm:shadow-none"
                        title="Edit Session Parameters"
                        aria-label="Edit Session"
                      >
                        <MdEdit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(session)}
                        className="p-2 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 border border-slate-200 sm:border-transparent hover:border-red-100 transition flex items-center justify-center cursor-pointer shadow-2xs sm:shadow-none"
                        title="Delete Session"
                        aria-label="Delete Session"
                      >
                        <MdDelete size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Overlay Form */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-4">
            <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full p-4 sm:p-6 relative animate-in fade-in zoom-in duration-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                  {editingSession ? "Edit Session Records" : "Create New Session"}
                </h3>
                <button
                  onClick={handleCancel}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <MdClose size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Session Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. AY 2025-26"
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-700 transition"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional details..."
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-700 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-700 transition cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-700 transition cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="w-full sm:flex-1 h-10 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold tracking-wider uppercase transition flex items-center justify-center cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:flex-1 h-10 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition shadow-2xs hover:shadow-xs flex items-center justify-center cursor-pointer"
                  >
                    {submitting ? "Saving Records..." : editingSession ? "Update Session" : "Create Session"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default SessionManagement;
