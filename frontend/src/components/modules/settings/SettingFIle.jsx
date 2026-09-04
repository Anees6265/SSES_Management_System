import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    MdSettings, MdPalette, MdTrendingUp, MdCalendarToday,
    MdLock, MdWarning, MdInfo, MdCheck, MdUpload, MdAdd,
    MdToggleOn, MdToggleOff, MdNotificationsNone, MdSearch,
    MdEdit, MdDelete, MdClose
} from "react-icons/md";
import { toast } from "react-toastify";
import {
    useGetAllSessionsQuery,
    useCreateSessionMutation,
    useUpdateSessionMutation,
    useUpdateSessionStatusMutation,
    useActivateSessionMutation,
    useDeleteSessionMutation,
} from "./../../../redux/api/authApi";

const themes = [
    { id: "orange", label: "Orange", color: "#F97316", shade: "#FFEDD5" },
    { id: "blue", label: "Blue", color: "#3B82F6", shade: "#DBEAFE" },
    { id: "green", label: "Green", color: "#22C55E", shade: "#DCFCE7" },
    { id: "purple", label: "Purple", color: "#8B5CF6", shade: "#EDE9FE" },
    { id: "rose", label: "Rose", color: "#F43F5E", shade: "#FFE4E6" },
    { id: "indigo", label: "Indigo", color: "#6366F1", shade: "#E0E7FF" },
];

const SettingFIle = () => {
    const navigate = useNavigate();
    const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem("theme") || "orange");
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [hasUnsaved, setHasUnsaved] = useState(false);

    // Fetch real sessions from API
    const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useGetAllSessionsQuery(true);
    const sessions = sessionsData?.data || [];

    const [createSession]       = useCreateSessionMutation();
    const [updateSession]       = useUpdateSessionMutation();
    const [updateSessionStatus] = useUpdateSessionStatusMutation();
    const [activateSession]     = useActivateSessionMutation();
    const [deleteSession]       = useDeleteSessionMutation();

    // Session Modal State
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [editingSession,   setEditingSession]   = useState(null);
    const [sessionFormData,  setSessionFormData]  = useState({
        name: "",
        startDate: "",
        endDate: "",
        description: ""
    });
    const [submittingSession, setSubmittingSession] = useState(false);

    // Form states
    const [minGpa, setMinGpa] = useState("2.5");
    const [minAttendance, setMinAttendance] = useState("75");
    const [backlogLimit, setBacklogLimit] = useState("Maximum 2 subjects");

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", activeTheme);
        localStorage.setItem("theme", activeTheme);
    }, [activeTheme]);

    const handleThemeChange = (themeId) => {
        setActiveTheme(themeId);
        setHasUnsaved(true);
    };

    const handleFormChange = () => {
        setHasUnsaved(true);
    };

    const handleSaveAll = () => {
        toast.success("System configuration saved successfully!");
        setHasUnsaved(false);
    };

    const handleDiscard = () => {
        setMinGpa("2.5");
        setMinAttendance("75");
        setBacklogLimit("Maximum 2 subjects");
        setHasUnsaved(false);
        toast.info("Changes discarded.");
    };

    // Session CRUD handlers
    const openAddSessionModal = () => {
        setEditingSession(null);
        setSessionFormData({ name: "", startDate: "", endDate: "", description: "" });
        setShowSessionModal(true);
    };

    const openEditSessionModal = (s) => {
        setEditingSession(s);
        setSessionFormData({
            name: s.name,
            startDate: s.startDate ? new Date(s.startDate).toISOString().split('T')[0] : "",
            endDate: s.endDate ? new Date(s.endDate).toISOString().split('T')[0] : "",
            description: s.description || ""
        });
        setShowSessionModal(true);
    };

    const handleSessionSubmit = async (e) => {
        e.preventDefault();
        if (!sessionFormData.name.trim() || !sessionFormData.startDate || !sessionFormData.endDate) {
            toast.error("Name, start date, and end date are required");
            return;
        }

        if (new Date(sessionFormData.startDate) >= new Date(sessionFormData.endDate)) {
            toast.error("End date must be after start date");
            return;
        }

        setSubmittingSession(true);
        try {
            if (editingSession) {
                await updateSession({ id: editingSession._id, ...sessionFormData }).unwrap();
                toast.success("Session updated successfully!");
            } else {
                await createSession(sessionFormData).unwrap();
                toast.success("Session created successfully!");
            }
            setShowSessionModal(false);
            refetchSessions();
        } catch (err) {
            toast.error(err?.data?.message || "Operation failed");
        } finally {
            setSubmittingSession(false);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            if (newStatus === 'active') {
                await activateSession(id).unwrap();
            } else {
                await updateSessionStatus({ id, status: newStatus }).unwrap();
            }
            toast.success(`Session status changed to ${newStatus.toUpperCase()}`);
            refetchSessions();
        } catch (err) {
            toast.error(err?.data?.message || "Status change failed");
        }
    };

    const handleDeleteSession = async (id) => {
        if (!window.confirm("Delete this session?")) return;
        try {
            await deleteSession(id).unwrap();
            toast.success("Session deleted successfully!");
            refetchSessions();
        } catch (err) {
            toast.error(err?.data?.message || "Delete failed");
        }
    };

    return (
        <div className="bg-[#F8F9FA] min-h-screen px-8 py-6 space-y-6 pb-24 relative">

            {/* TOP HEADER SECTION */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Configuration</h1>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">
                        Manage institutional global rules, branding, and academic lifecycles.
                    </p>
                </div>

                {/* Maintenance Mode Toggle Card */}
                <div className="flex items-center gap-3.5 bg-white border border-slate-100 px-4 py-2.5 rounded-2xl shadow-sm">
                    <div className="text-right">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">MAINTENANCE MODE</p>
                        <p className={`text-xs font-extrabold ${maintenanceMode ? "text-amber-600" : "text-emerald-600"}`}>
                            {maintenanceMode ? "Maintenance On" : "System Live"}
                        </p>
                    </div>
                    <button
                        onClick={() => { setMaintenanceMode(p => !p); setHasUnsaved(true); }}
                        className="text-slate-400 hover:text-slate-600 transition"
                    >
                        {maintenanceMode ? (
                            <MdToggleOn size={36} className="text-amber-500" />
                        ) : (
                            <MdToggleOff size={36} className="text-slate-300" />
                        )}
                    </button>
                </div>
            </div>

            {/* 2X2 GRID OF CONFIGURATION CARDS (EXACT REFERENCE ASPECT RATIO) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* CARD 1: Academic Year Management */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center">
                                <MdCalendarToday size={18} />
                            </div>
                            <h3 className="text-base font-black text-slate-900">Academic Year Management</h3>
                        </div>
                        <button
                            onClick={openAddSessionModal}
                            className="text-xs font-extrabold text-orange-500 hover:text-orange-600 transition flex items-center gap-1 cursor-pointer bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-xl"
                        >
                            <MdAdd size={16} /> Add New
                        </button>
                    </div>

                    {/* Cycles List */}
                    <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                        {sessionsLoading ? (
                            <p className="text-xs font-semibold text-slate-400">Loading sessions...</p>
                        ) : sessions.length === 0 ? (
                            <p className="text-xs font-semibold text-slate-400">No sessions found in system.</p>
                        ) : (
                            sessions.map((sess) => {
                                const statusStr = (sess.status || (sess.isActive ? 'active' : 'inactive')).toLowerCase();
                                let statusBadgeCls = "bg-slate-100 text-slate-700 border-slate-200";
                                if (statusStr === 'active') {
                                    statusBadgeCls = "bg-emerald-50 text-emerald-600 border-emerald-200";
                                } else if (statusStr === 'upcoming') {
                                    statusBadgeCls = "bg-blue-50 text-blue-600 border-blue-200";
                                } else if (statusStr === 'archived') {
                                    statusBadgeCls = "bg-slate-100 text-slate-600 border-slate-200";
                                } else if (statusStr === 'completed') {
                                    statusBadgeCls = "bg-orange-50 text-orange-600 border-orange-200";
                                }

                                return (
                                    <div
                                        key={sess._id}
                                        className={`flex items-center justify-between p-4 rounded-2xl border ${statusStr === 'active'
                                                ? "border-orange-200/80 bg-orange-50/40"
                                                : "border-slate-100 bg-slate-50/50"
                                            }`}
                                    >
                                        <div className="min-w-0 flex-1 pr-2">
                                            <h4 className="text-sm font-extrabold text-slate-900 truncate">
                                                {sess.name.startsWith("AY") ? sess.name : `AY ${sess.name}`}
                                            </h4>
                                            <p className="text-xs font-semibold text-slate-400 mt-0.5 truncate">
                                                {sess.description || (statusStr === 'active' ? 'Current Active Cycle' : `${statusStr.charAt(0).toUpperCase() + statusStr.slice(1)} Cycle`)}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {/* Interactive Status Select Dropdown */}
                                            <select
                                                value={statusStr}
                                                onChange={(e) => handleStatusChange(sess._id, e.target.value)}
                                                className={`border font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider cursor-pointer focus:outline-none hover:opacity-80 transition ${statusBadgeCls}`}
                                                title="Click to edit session status"
                                            >
                                                <option value="active">ACTIVE</option>
                                                <option value="upcoming">UPCOMING</option>
                                                <option value="archived">ARCHIVED</option>
                                                <option value="completed">COMPLETED</option>
                                            </select>

                                            <button
                                                type="button"
                                                onClick={() => openEditSessionModal(sess)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                                                title="Edit Session Details"
                                            >
                                                <MdEdit size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteSession(sess._id)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                                title="Delete Session"
                                            >
                                                <MdDelete size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* CARD 2: Promotion Rules */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center">
                            <MdTrendingUp size={18} />
                        </div>
                        <h3 className="text-base font-black text-slate-900">Promotion Rules</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                                    MINIMUM GPA
                                </label>
                                <input
                                    type="text"
                                    value={minGpa}
                                    onChange={(e) => { setMinGpa(e.target.value); handleFormChange(); }}
                                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-400 shadow-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                                    ATTENDANCE %
                                </label>
                                <input
                                    type="text"
                                    value={minAttendance}
                                    onChange={(e) => { setMinAttendance(e.target.value); handleFormChange(); }}
                                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-400 shadow-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                                BACKLOG LIMIT
                            </label>
                            <select
                                value={backlogLimit}
                                onChange={(e) => { setBacklogLimit(e.target.value); handleFormChange(); }}
                                className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-400 shadow-sm cursor-pointer"
                            >
                                <option value="Maximum 1 subject">Maximum 1 subject</option>
                                <option value="Maximum 2 subjects">Maximum 2 subjects</option>
                                <option value="Maximum 3 subjects">Maximum 3 subjects</option>
                                <option value="No Backlog Allowed">No Backlog Allowed</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* CARD 3: Society Logo & Branding (THEME COLOR SELECTOR) */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center">
                            <MdPalette size={18} />
                        </div>
                        <h3 className="text-base font-black text-slate-900">Society Logo & Branding</h3>
                    </div>

                    <div className="flex items-center gap-5 p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                        <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 font-black flex items-center justify-center text-xl border border-orange-200 flex-shrink-0">
                            ITEG
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-xs font-black text-slate-900">Official Society Logo</h4>
                            <p className="text-[11px] font-semibold text-slate-400">Upload high-res PNG or SVG. Max 2MB.</p>
                            <button
                                type="button"
                                onClick={() => toast.info("Select new logo file")}
                                className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm transition"
                            >
                                <MdUpload size={14} /> Change Logo
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2 pt-1">
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            THEME PRIMARY COLOR
                        </label>
                        <div className="flex items-center gap-3">
                            {themes.map((t) => {
                                const isActive = activeTheme === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => handleThemeChange(t.id)}
                                        title={t.label}
                                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isActive ? "ring-4 ring-orange-200 scale-110 shadow-md" : "hover:scale-105"
                                            }`}
                                        style={{ backgroundColor: t.color }}
                                    >
                                        {isActive && <MdCheck size={18} className="text-white" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* CARD 4: Lock Academic Year */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center">
                            <MdLock size={18} />
                        </div>
                        <h3 className="text-base font-black text-slate-900">Lock Academic Year</h3>
                    </div>

                    <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 text-xs font-semibold text-rose-700 flex items-start gap-3">
                        <MdWarning size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                            Locking the academic year <strong>({sessions[0]?.name || 'Current Session'})</strong> will freeze all marks, attendance, and faculty records. This action is <u>irreversible</u> and ensures data integrity for audits.
                        </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div>
                            <p className="text-xs font-black text-slate-900">Ready for Finalization?</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">STATUS: READ-ONLY LOCK</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                const targetName = sessions[0]?.name || 'Current Session';
                                if (window.confirm(`Are you sure you want to lock ${targetName}? This cannot be undone.`)) {
                                    toast.success(`${targetName} locked successfully`);
                                }
                            }}
                            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer"
                        >
                            Lock {sessions[0]?.name || 'Academic Year'}
                        </button>
                    </div>
                </div>

            </div>

            {/* FLOATING STICKY SAVE BAR */}
            {hasUnsaved && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-6 border border-slate-800 animate-bounce-short">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                        <MdInfo size={18} className="text-orange-400" />
                        <span>You have unsaved changes in System Settings</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleDiscard}
                            className="text-xs font-bold text-slate-400 hover:text-white transition"
                        >
                            Discard
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveAll}
                            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-full shadow-md transition"
                        >
                            Save All Settings
                        </button>
                    </div>
                </div>
            )}

            {/* SESSION ADD / EDIT MODAL */}
            {showSessionModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-100 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-scale-in">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-sm font-black text-slate-900">
                                {editingSession ? "Edit Academic Year Session" : "Add New Academic Year Session"}
                            </h3>
                            <button
                                onClick={() => setShowSessionModal(false)}
                                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                            >
                                <MdClose size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSessionSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                                    Session Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={sessionFormData.name}
                                    onChange={(e) => setSessionFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. 2025-26 or AY 2025-26"
                                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-400"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    value={sessionFormData.description}
                                    onChange={(e) => setSessionFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="e.g. Academic Session 2025 - 2026"
                                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-400"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                                        Start Date <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={sessionFormData.startDate}
                                        onChange={(e) => setSessionFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-400"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                                        End Date <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={sessionFormData.endDate}
                                        onChange={(e) => setSessionFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-400"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowSessionModal(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingSession}
                                    className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-orange-500 hover:bg-orange-600 shadow-sm transition disabled:opacity-50"
                                >
                                    {submittingSession ? "Saving..." : editingSession ? "Update Session" : "Create Session"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SettingFIle;
