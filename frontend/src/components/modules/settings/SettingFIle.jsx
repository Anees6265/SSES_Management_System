import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    MdSettings, MdPalette, MdTrendingUp, MdCalendarToday,
    MdLock, MdWarning, MdInfo, MdCheck, MdUpload, MdAdd,
    MdToggleOn, MdToggleOff, MdNotificationsNone, MdSearch,
    MdEdit, MdDelete, MdClose, MdSchool, MdSecurity
} from "react-icons/md";
import { toast } from "react-toastify";
import { confirmToast } from "../../../utils/confirmToast";
import {
    useGetAllSessionsQuery,
    useCreateSessionMutation,
    useUpdateSessionMutation,
    useUpdateSessionStatusMutation,
    useActivateSessionMutation,
    useDeleteSessionMutation,
    useGetAllDepartmentsQuery,
    useUpdateDepartmentPassingCriteriaMutation,
} from "./../../../redux/api/authApi";
import Header from "../../shared/sidebar/Header";

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

    // User Role & Permission Checks
    const rawRole = (localStorage.getItem("role") || "").toLowerCase();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const positionRole = (localStorage.getItem("positionRole") || user.position || "").toLowerCase();

    const isSuperAdmin = rawRole === "superadmin";
    const isHOD = rawRole === "hod" || positionRole.includes("hod") || user.role?.toLowerCase() === "hod";

    // Who can change what?
    // Theme: EVERYONE who has access to Settings!
    // Level Passing Criteria: ONLY HOD (for their own department) & SuperAdmin (for any department).
    // Everything else (Maintenance, Sessions, Lock Academic Year, Logo): ONLY SuperAdmin!
    const canManageGlobal = isSuperAdmin;
    const canUpdateCriteria = isSuperAdmin || isHOD;

    // Fetch real sessions from API
    const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useGetAllSessionsQuery(true);
    const sessions = sessionsData?.data || [];

    const [createSession]       = useCreateSessionMutation();
    const [updateSession]       = useUpdateSessionMutation();
    const [updateSessionStatus] = useUpdateSessionStatusMutation();
    const [activateSession]     = useActivateSessionMutation();
    const [deleteSession]       = useDeleteSessionMutation();

    // Fetch real departments from API
    const { data: deptData, isLoading: deptsLoading } = useGetAllDepartmentsQuery();
    const departments = deptData?.data || [];
    const [updatePassingCriteria, { isLoading: isSavingCriteria }] = useUpdateDepartmentPassingCriteriaMutation();

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

    // Department Level Passing Criteria State
    const [selectedDeptId, setSelectedDeptId] = useState("");
    const [minGpa, setMinGpa] = useState("2.5");
    const [minAttendance, setMinAttendance] = useState("75");
    const [backlogLimit, setBacklogLimit] = useState("Maximum 2 subjects");
    const [minTaskCompletion, setMinTaskCompletion] = useState("85");
    const [hasUnsavedCriteria, setHasUnsavedCriteria] = useState(false);

    // Apply active theme to document & localStorage
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", activeTheme);
        localStorage.setItem("theme", activeTheme);
    }, [activeTheme]);

    // Match HOD department or set default department for Superadmin
    useEffect(() => {
        if (!departments.length) return;

        if (isHOD) {
            const userDeptId = user.departmentId ? user.departmentId.toString() : null;
            const userDeptName = (user.department || "").trim().toLowerCase();

            const myDept = departments.find(d => 
                (userDeptId && (d._id === userDeptId || d.id === userDeptId)) ||
                (userDeptName && d.name.trim().toLowerCase() === userDeptName)
            );
            if (myDept) {
                setSelectedDeptId(myDept._id);
            } else if (!selectedDeptId) {
                setSelectedDeptId(departments[0]._id);
            }
        } else if (!selectedDeptId) {
            setSelectedDeptId(departments[0]._id);
        }
    }, [departments, isHOD, user.departmentId, user.department]);

    // Load department's configured criteria when selectedDeptId changes
    useEffect(() => {
        if (!selectedDeptId || !departments.length) return;
        const currentDept = departments.find(d => d._id === selectedDeptId);
        if (currentDept) {
            const criteria = currentDept.levelPassingCriteria || {};
            setMinGpa(criteria.minGpa !== undefined ? String(criteria.minGpa) : "2.5");
            setMinAttendance(criteria.minAttendance !== undefined ? String(criteria.minAttendance) : "75");
            setBacklogLimit(criteria.backlogLimit || "Maximum 2 subjects");
            setMinTaskCompletion(criteria.minTaskCompletion !== undefined ? String(criteria.minTaskCompletion) : "85");
            setHasUnsavedCriteria(false);
        }
    }, [selectedDeptId, departments]);

    const handleThemeChange = (themeId) => {
        setActiveTheme(themeId);
        toast.success(`Theme switched to ${themeId.charAt(0).toUpperCase() + themeId.slice(1)}!`);
    };

    const handleCriteriaChange = () => {
        if (canUpdateCriteria) {
            setHasUnsavedCriteria(true);
        }
    };

    const handleSaveCriteria = async () => {
        if (!canUpdateCriteria) {
            toast.error("Only Department HOD or Superadmin can update level passing criteria.");
            return;
        }
        if (!selectedDeptId) {
            toast.error("Please select a department first.");
            return;
        }

        const gpaNum = parseFloat(minGpa);
        const attNum = parseFloat(minAttendance);
        const taskNum = parseFloat(minTaskCompletion);

        if (isNaN(gpaNum) || gpaNum < 0 || gpaNum > 10) {
            toast.error("Minimum GPA must be a number between 0 and 10.");
            return;
        }
        if (isNaN(attNum) || attNum < 0 || attNum > 100) {
            toast.error("Attendance percentage must be between 0 and 100.");
            return;
        }
        if (isNaN(taskNum) || taskNum < 0 || taskNum > 100) {
            toast.error("Task completion percentage must be between 0 and 100.");
            return;
        }

        try {
            await updatePassingCriteria({
                id: selectedDeptId,
                minGpa: gpaNum,
                minAttendance: attNum,
                backlogLimit,
                minTaskCompletion: taskNum
            }).unwrap();

            const deptName = departments.find(d => d._id === selectedDeptId)?.name || "Department";
            toast.success(`Level passing criteria for ${deptName} updated successfully!`);
            setHasUnsavedCriteria(false);
        } catch (err) {
            toast.error(err?.data?.message || "Failed to update criteria");
        }
    };

    const handleDiscardCriteria = () => {
        const currentDept = departments.find(d => d._id === selectedDeptId);
        if (currentDept) {
            const criteria = currentDept.levelPassingCriteria || {};
            setMinGpa(criteria.minGpa !== undefined ? String(criteria.minGpa) : "2.5");
            setMinAttendance(criteria.minAttendance !== undefined ? String(criteria.minAttendance) : "75");
            setBacklogLimit(criteria.backlogLimit || "Maximum 2 subjects");
            setMinTaskCompletion(criteria.minTaskCompletion !== undefined ? String(criteria.minTaskCompletion) : "85");
        }
        setHasUnsavedCriteria(false);
        toast.info("Changes discarded.");
    };

    // Session CRUD handlers
    const openAddSessionModal = () => {
        if (!canManageGlobal) {
            toast.warning("Only Superadmin can add new academic sessions.");
            return;
        }
        setEditingSession(null);
        setSessionFormData({ name: "", startDate: "", endDate: "", description: "" });
        setShowSessionModal(true);
    };

    const openEditSessionModal = (s) => {
        if (!canManageGlobal) {
            toast.warning("Only Superadmin can edit academic sessions.");
            return;
        }
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
        if (!canManageGlobal) {
            toast.error("Only Superadmin can perform session modifications.");
            return;
        }
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
        if (!canManageGlobal) {
            toast.warning("Only Superadmin can change session status.");
            return;
        }
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

    const handleDeleteSession = async (sess) => {
        if (!canManageGlobal) {
            toast.warning("Only Superadmin can delete sessions.");
            return;
        }
        const id = sess?._id || sess;
        const name = sess?.name || "this session";
        if (!(await confirmToast(`Delete session "${name}"?`, { confirmButtonClass: "bg-red-500 hover:bg-red-600 text-white" }))) return;
        try {
            await deleteSession(id).unwrap();
            toast.success("Session deleted successfully!");
            refetchSessions();
        } catch (err) {
            if (err?.data?.hasStudents) {
                const confirmForce = await confirmToast(
                    `Session "${name}" has ${err.data.studentCount} enrolled student(s).\n\n` +
                    `Deleting it will reassign these students to the active session.\n\n` +
                    `Do you want to proceed with deleting this session?`,
                    { confirmButtonClass: "bg-red-500 hover:bg-red-600 text-white", confirmText: "Delete & Reassign" }
                );
                if (confirmForce) {
                    try {
                        await deleteSession({ id, force: true }).unwrap();
                        toast.success("Session deleted and students reassigned successfully!");
                        refetchSessions();
                    } catch (forceErr) {
                        toast.error(forceErr?.data?.message || "Delete failed");
                    }
                }
            } else {
                toast.error(err?.data?.message || "Delete failed");
            }
        }
    };

    const selectedDept = departments.find(d => d._id === selectedDeptId);

    return (
        <>
            <Header
                title="Settings"
                subtitle="System configuration, academic lifecycles & personalization"
                breadcrumbs={[
                    { label: "Administration" },
                    { label: "Settings", path: "/settings" }
                ]}
            />

            <div className="bg-[#F8F9FA] min-h-screen p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 pb-24 relative">

                {/* SUB-HEADER & STATUS SECTION */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xs">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">System Configuration</h2>
                            {isSuperAdmin && (
                                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                                    SUPERADMIN
                                </span>
                            )}
                            {isHOD && !isSuperAdmin && (
                                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                                    HOD ({user.department || "Department"})
                                </span>
                            )}
                            {!isSuperAdmin && !isHOD && (
                                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                    LIMITED PERMISSION
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-0.5">
                            {!isSuperAdmin && !isHOD
                                ? "Settings permissions granted: You can customize your UI theme."
                                : isHOD && !isSuperAdmin
                                ? "Configure your department's level passing criteria and personalize UI theme."
                                : "Manage institutional global rules, branding, and academic lifecycles."}
                        </p>
                    </div>

                    {/* Maintenance Mode Toggle Card */}
                    <div className="flex items-center justify-between sm:justify-start gap-3 bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl">
                        <div className="text-left sm:text-right">
                            <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                MAINTENANCE MODE {!canManageGlobal && <span className="text-rose-500">(LOCKED)</span>}
                            </p>
                            <p className={`text-xs font-extrabold ${maintenanceMode ? "text-amber-600" : "text-emerald-600"}`}>
                                {maintenanceMode ? "Maintenance On" : "System Live"}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                if (!canManageGlobal) {
                                    toast.warning("Only Superadmin can toggle maintenance mode.");
                                    return;
                                }
                                setMaintenanceMode(p => !p);
                            }}
                            disabled={!canManageGlobal}
                            title={!canManageGlobal ? "Only Superadmin can change maintenance mode" : "Toggle Maintenance Mode"}
                            className={`transition shrink-0 ${!canManageGlobal ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                            {maintenanceMode ? (
                                <MdToggleOn size={34} className="text-amber-500" />
                            ) : (
                                <MdToggleOff size={34} className="text-slate-300" />
                            )}
                        </button>
                    </div>
                </div>

                {/* 2X2 GRID OF CONFIGURATION CARDS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

                    {/* CARD 1: Academic Year Management */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-4 sm:space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center shrink-0">
                                    <MdCalendarToday size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-black text-slate-900">Academic Year Management</h3>
                                    {!canManageGlobal && (
                                        <span className="text-[10px] font-bold text-slate-400">View Only (Superadmin Restricted)</span>
                                    )}
                                </div>
                            </div>
                            {canManageGlobal ? (
                                <button
                                    onClick={openAddSessionModal}
                                    className="text-xs font-extrabold text-orange-500 hover:text-orange-600 transition flex items-center gap-1 cursor-pointer bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-xl shadow-2xs"
                                >
                                    <MdAdd size={16} /> Add New
                                </button>
                            ) : (
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                                    <MdLock size={12} /> Read-only
                                </span>
                            )}
                        </div>

                        {/* Cycles List */}
                        <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                            {sessionsLoading ? (
                                <p className="text-xs font-semibold text-slate-400">Loading sessions...</p>
                            ) : sessions.length === 0 ? (
                                <p className="text-xs font-semibold text-slate-400">No sessions found in system.</p>
                            ) : (
                                sessions.map((sess) => {
                                    const statusStr = (sess.isActive || sess.status === 'active') ? 'active' : (sess.status || 'upcoming').toLowerCase();
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
                                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border ${statusStr === 'active'
                                                    ? "border-orange-200/80 bg-orange-50/40"
                                                    : "border-slate-100 bg-slate-50/50"
                                                }`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                                                    {sess.name.startsWith("AY") ? sess.name : `AY ${sess.name}`}
                                                </h4>
                                                <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-0.5 truncate">
                                                    {sess.description || (statusStr === 'active' ? 'Current Active Cycle' : `${statusStr.charAt(0).toUpperCase() + statusStr.slice(1)} Cycle`)}
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                                                {/* Interactive Status Select Dropdown (Superadmin only) */}
                                                {canManageGlobal ? (
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
                                                ) : (
                                                    <span className={`border font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider ${statusBadgeCls}`}>
                                                        {statusStr.toUpperCase()}
                                                    </span>
                                                )}

                                                {canManageGlobal && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditSessionModal(sess)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                                            title="Edit Session Details"
                                                        >
                                                            <MdEdit size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteSession(sess)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                                            title="Delete Session"
                                                        >
                                                            <MdDelete size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* CARD 2: Department Level Passing Criteria */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-4 sm:space-y-5">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center shrink-0">
                                    <MdTrendingUp size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-black text-slate-900">Level Passing Criteria</h3>
                                    <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400">Department promotion rules & thresholds</p>
                                </div>
                            </div>

                            {/* Status Badge */}
                            {isSuperAdmin ? (
                                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                    Superadmin Mode
                                </span>
                            ) : isHOD ? (
                                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                    <MdCheck size={12} /> HOD Authorized
                                </span>
                            ) : (
                                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                                    <MdLock size={12} /> Read-Only
                                </span>
                            )}
                        </div>

                        {/* Department Context Selector / Banner */}
                        {isSuperAdmin ? (
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-1.5">
                                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                                    SELECT DEPARTMENT TO CONFIGURE
                                </label>
                                <select
                                    value={selectedDeptId}
                                    onChange={(e) => setSelectedDeptId(e.target.value)}
                                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-400 shadow-2xs cursor-pointer"
                                >
                                    {departments.map(d => (
                                        <option key={d._id} value={d._id}>
                                            {d.name} {d.code ? `(${d.code})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : isHOD ? (
                            <div className="p-3 bg-orange-50/70 border border-orange-100 rounded-2xl flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <MdSchool size={18} className="text-orange-500 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600">ASSIGNED DEPARTMENT</p>
                                        <p className="text-xs font-black text-slate-900 truncate">
                                            {selectedDept?.name || user.department || "Your Department"}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-orange-700 bg-white border border-orange-200 px-2.5 py-1 rounded-lg shrink-0">
                                    Only HOD Updates
                                </span>
                            </div>
                        ) : (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-2.5 text-xs text-slate-600">
                                <MdLock size={16} className="text-slate-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-slate-800">Criteria Update Locked</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Only the respective department HOD or Superadmin can update passing criteria.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Criteria Input Fields */}
                        <div className="space-y-3.5 sm:space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                                        MINIMUM GPA (0 - 10)
                                    </label>
                                    <input
                                        type="text"
                                        value={minGpa}
                                        disabled={!canUpdateCriteria}
                                        onChange={(e) => { setMinGpa(e.target.value); handleCriteriaChange(); }}
                                        className={`w-full h-10 px-3.5 border rounded-xl text-xs font-bold transition ${
                                            canUpdateCriteria
                                                ? "bg-white border-slate-200 text-slate-800 focus:outline-none focus:border-orange-400 shadow-2xs"
                                                : "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
                                        }`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                                        ATTENDANCE % (0 - 100)
                                    </label>
                                    <input
                                        type="text"
                                        value={minAttendance}
                                        disabled={!canUpdateCriteria}
                                        onChange={(e) => { setMinAttendance(e.target.value); handleCriteriaChange(); }}
                                        className={`w-full h-10 px-3.5 border rounded-xl text-xs font-bold transition ${
                                            canUpdateCriteria
                                                ? "bg-white border-slate-200 text-slate-800 focus:outline-none focus:border-orange-400 shadow-2xs"
                                                : "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
                                        }`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                                        BACKLOG LIMIT
                                    </label>
                                    <select
                                        value={backlogLimit}
                                        disabled={!canUpdateCriteria}
                                        onChange={(e) => { setBacklogLimit(e.target.value); handleCriteriaChange(); }}
                                        className={`w-full h-10 px-3.5 border rounded-xl text-xs font-bold transition ${
                                            canUpdateCriteria
                                                ? "bg-white border-slate-200 text-slate-800 focus:outline-none focus:border-orange-400 shadow-2xs cursor-pointer"
                                                : "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
                                        }`}
                                    >
                                        <option value="Maximum 1 subject">Maximum 1 subject</option>
                                        <option value="Maximum 2 subjects">Maximum 2 subjects</option>
                                        <option value="Maximum 3 subjects">Maximum 3 subjects</option>
                                        <option value="No Backlog Allowed">No Backlog Allowed</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                                        TASK COMPLETION %
                                    </label>
                                    <input
                                        type="text"
                                        value={minTaskCompletion}
                                        disabled={!canUpdateCriteria}
                                        onChange={(e) => { setMinTaskCompletion(e.target.value); handleCriteriaChange(); }}
                                        className={`w-full h-10 px-3.5 border rounded-xl text-xs font-bold transition ${
                                            canUpdateCriteria
                                                ? "bg-white border-slate-200 text-slate-800 focus:outline-none focus:border-orange-400 shadow-2xs"
                                                : "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Save Criteria Button for HOD / Superadmin */}
                            {canUpdateCriteria && (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                                    <p className="text-[11px] font-semibold text-slate-400">
                                        {hasUnsavedCriteria ? "⚠️ You have unsaved criteria changes" : "Changes will apply to level promotions"}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleSaveCriteria}
                                        disabled={isSavingCriteria || !hasUnsavedCriteria}
                                        className="w-full sm:w-auto px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        {isSavingCriteria ? "Saving..." : "Save Department Criteria"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CARD 3: Society Logo & Branding (THEME COLOR SELECTOR) */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-4 sm:space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center shrink-0">
                                    <MdPalette size={18} />
                                </div>
                                <h3 className="text-sm sm:text-base font-black text-slate-900">Society Logo & Branding</h3>
                            </div>
                            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                                Theme Customizer Active
                            </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 p-3.5 sm:p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-orange-100 text-orange-600 font-black flex items-center justify-center text-lg sm:text-xl border border-orange-200 flex-shrink-0 shadow-2xs">
                                ITEG
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-xs font-black text-slate-900">Official Society Logo</h4>
                                <p className="text-[11px] font-semibold text-slate-400">
                                    {canManageGlobal
                                        ? "Upload high-res PNG or SVG. Max 2MB."
                                        : "Society logo management is restricted to Superadmin."}
                                </p>
                                {canManageGlobal ? (
                                    <button
                                        type="button"
                                        onClick={() => toast.info("Select new logo file")}
                                        className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                                    >
                                        <MdUpload size={14} /> Change Logo
                                    </button>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg mt-1 border border-slate-200">
                                        <MdLock size={12} /> Superadmin Only
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* THEME COLOR SELECTOR - ACCESSIBLE TO ALL USERS WITH SETTINGS PERMISSION */}
                        <div className="space-y-2 pt-1 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
                                    THEME PRIMARY COLOR (PERSONAL ACCENT)
                                </label>
                                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                                    Always Editable
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
                                {themes.map((t) => {
                                    const isActive = activeTheme === t.id;
                                    return (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => handleThemeChange(t.id)}
                                            title={t.label}
                                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                                isActive ? "ring-4 ring-orange-200 scale-110 shadow-md" : "hover:scale-105"
                                            }`}
                                            style={{ backgroundColor: t.color }}
                                        >
                                            {isActive && <MdCheck size={18} className="text-white" />}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-[11px] font-medium text-slate-400 mt-1">
                                Current active theme: <strong className="text-slate-700 capitalize">{activeTheme}</strong>. Applies instantly across all modules.
                            </p>
                        </div>
                    </div>

                    {/* CARD 4: Lock Academic Year */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-4 sm:space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center shrink-0">
                                    <MdLock size={18} />
                                </div>
                                <h3 className="text-sm sm:text-base font-black text-slate-900">Lock Academic Year</h3>
                            </div>
                            {!canManageGlobal && (
                                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                                    <MdLock size={12} /> Superadmin Only
                                </span>
                            )}
                        </div>

                        <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50/70 border border-rose-100 text-xs font-semibold text-rose-700 flex items-start gap-3">
                            <MdWarning size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
                            <p className="leading-relaxed">
                                Locking the academic year <strong>({sessions[0]?.name || 'Current Session'})</strong> will freeze all marks, attendance, and faculty records. This action is <u>irreversible</u> and ensures data integrity for audits.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                            <div>
                                <p className="text-xs font-black text-slate-900">Ready for Finalization?</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">STATUS: READ-ONLY LOCK</p>
                            </div>
                            <button
                                type="button"
                                disabled={!canManageGlobal}
                                onClick={async () => {
                                    if (!canManageGlobal) {
                                        toast.warning("Only Superadmin can lock an academic year.");
                                        return;
                                    }
                                    const targetName = sessions[0]?.name || 'Current Session';
                                    if (await confirmToast(`Are you sure you want to lock ${targetName}? This cannot be undone.`, { confirmButtonClass: "bg-rose-600 hover:bg-rose-700 text-white" })) {
                                        toast.success(`${targetName} locked successfully`);
                                    }
                                }}
                                className={`w-full sm:w-auto px-5 py-2.5 text-white rounded-xl text-xs font-extrabold shadow-2xs transition ${
                                    canManageGlobal
                                        ? "bg-rose-600 hover:bg-rose-700 cursor-pointer"
                                        : "bg-slate-300 cursor-not-allowed"
                                }`}
                            >
                                Lock {sessions[0]?.name || 'Academic Year'}
                            </button>
                        </div>
                    </div>

                </div>

                {/* FLOATING STICKY SAVE BAR FOR CRITERIA */}
                {hasUnsavedCriteria && canUpdateCriteria && (
                    <div className="fixed bottom-4 sm:bottom-6 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 bg-slate-900 text-white p-3 sm:px-6 sm:py-3.5 rounded-2xl sm:rounded-full shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-slate-800 max-w-lg mx-auto">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 text-center sm:text-left">
                            <MdInfo size={18} className="text-orange-400 shrink-0" />
                            <span>Unsaved changes in {selectedDept?.name || "Department"} criteria</span>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <button
                                type="button"
                                onClick={handleDiscardCriteria}
                                className="flex-1 sm:flex-none text-xs font-bold text-slate-400 hover:text-white transition py-1.5 px-3 rounded-lg cursor-pointer text-center"
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveCriteria}
                                disabled={isSavingCriteria}
                                className="flex-1 sm:flex-none px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl sm:rounded-full shadow-md transition cursor-pointer disabled:opacity-50 text-center"
                            >
                                {isSavingCriteria ? "Saving..." : "Save Criteria"}
                            </button>
                        </div>
                    </div>
                )}

                {/* SESSION ADD / EDIT MODAL (Superadmin Only) */}
                {showSessionModal && canManageGlobal && (
                    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
                        <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full p-4 sm:p-6 space-y-4 sm:space-y-5 animate-scale-in">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="text-sm font-black text-slate-900">
                                    {editingSession ? "Edit Academic Year Session" : "Add New Academic Year Session"}
                                </h3>
                                <button
                                    onClick={() => setShowSessionModal(false)}
                                    className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
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

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submittingSession}
                                        className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-orange-500 hover:bg-orange-600 shadow-2xs transition disabled:opacity-50 cursor-pointer"
                                    >
                                        {submittingSession ? "Saving..." : editingSession ? "Update Session" : "Create Session"}
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

export default SettingFIle;
