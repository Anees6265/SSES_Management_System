import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    MdPalette, MdTrendingUp, MdSchool, MdSecurity,
    MdCheck, MdUpload, MdToggleOn, MdToggleOff,
    MdInfo, MdLock, MdArrowForward
} from "react-icons/md";
import { toast } from "react-toastify";
import {
    useGetAllDepartmentsQuery,
    useUpdateDepartmentPassingCriteriaMutation,
} from "../../../redux/api/authApi";
import Header from "../../shared/sidebar/Header";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";

const themes = [
    { id: "orange", label: "Orange (SSES)", color: "#F97316", shade: "#FFEDD5", description: "Default institutional theme" },
    { id: "blue", label: "Ocean Blue", color: "#3B82F6", shade: "#DBEAFE", description: "Modern professional blue" },
    { id: "green", label: "Emerald Green", color: "#22C55E", shade: "#DCFCE7", description: "Vibrant emerald green" },
    { id: "purple", label: "Royal Purple", color: "#8B5CF6", shade: "#EDE9FE", description: "Elegant royal purple" },
    { id: "rose", label: "Rose Pink", color: "#F43F5E", shade: "#FFE4E6", description: "Warm rose accent" },
    { id: "indigo", label: "Deep Indigo", color: "#6366F1", shade: "#E0E7FF", description: "Refined dark indigo" },
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

    const canManageGlobal = isSuperAdmin;
    const canUpdateCriteria = isSuperAdmin || isHOD;

    // Fetch real departments from API
    const { data: deptData } = useGetAllDepartmentsQuery();
    const departments = deptData?.data || [];
    const [updatePassingCriteria, { isLoading: isSavingCriteria }] = useUpdateDepartmentPassingCriteriaMutation();

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

    const selectedDept = departments.find(d => d._id === selectedDeptId);

    return (
        <>
            <Header
                title="Settings"
                badge="System Configuration"
                breadcrumbs={[
                    { label: "Administration" },
                    { label: "Settings", path: "/settings" }
                ]}
            />

            <div className="bg-gray-50/40 min-h-screen p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 pb-24 relative">

                {/* SUB-HEADER & STATUS SECTION */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white border border-slate-200/80 p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-2xs">
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">System Configuration</h2>
                            {isSuperAdmin && (
                                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                    SUPERADMIN
                                </span>
                            )}
                            {isHOD && !isSuperAdmin && (
                                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                                    HOD ({user.department || "Department"})
                                </span>
                            )}
                            {!isSuperAdmin && !isHOD && (
                                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                    LIMITED PERMISSION
                                </span>
                            )}
                        </div>
                        <p className="text-xs font-semibold text-slate-400 mt-1">
                            {!isSuperAdmin && !isHOD
                                ? "Settings permissions granted: Customize your UI color theme."
                                : isHOD && !isSuperAdmin
                                ? "Configure your department's level passing criteria and personalize UI theme."
                                : "Manage institutional passing criteria, theme appearance, branding, and system safeguards."}
                        </p>
                    </div>

                    {/* Maintenance Mode Toggle Card */}
                    <div className="flex items-center justify-between sm:justify-start gap-3 bg-slate-50/80 border border-slate-200/80 px-4 py-2.5 rounded-xl sm:rounded-2xl shrink-0">
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
                                <MdToggleOn size={36} className="text-amber-500" />
                            ) : (
                                <MdToggleOff size={36} className="text-slate-300 hover:text-slate-400" />
                            )}
                        </button>
                    </div>
                </div>

                {/* 2-COLUMN GRID OF CONFIGURATION CARDS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

                    {/* CARD 1: Department Level Passing Criteria */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center shrink-0 shadow-2xs">
                                    <MdTrendingUp size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">Level Passing Criteria</h3>
                                    <p className="text-[11px] font-semibold text-slate-400">Department promotion rules & thresholds</p>
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
                            <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl space-y-1.5">
                                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                                    Select Department to Configure
                                </label>
                                <SelectDropdown
                                    value={selectedDeptId}
                                    onChange={(val) => setSelectedDeptId(val)}
                                    options={departments.map(d => ({
                                        value: d._id,
                                        label: `${d.name}${d.code ? ` (${d.code})` : ""}`
                                    }))}
                                    placeholder="Select Department..."
                                    className="w-full"
                                    buttonClassName="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:border-orange-400 cursor-pointer flex items-center justify-between gap-1.5 shadow-2xs"
                                />
                            </div>
                        ) : isHOD ? (
                            <div className="p-3.5 bg-orange-50/60 border border-orange-100 rounded-2xl flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                        <MdSchool size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600">Assigned Department</p>
                                        <p className="text-xs font-black text-slate-900 truncate">
                                            {selectedDept?.name || user.department || "Your Department"}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-extrabold text-orange-700 bg-white border border-orange-200 px-2.5 py-1 rounded-xl shrink-0">
                                    Only HOD Updates
                                </span>
                            </div>
                        ) : (
                            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-2.5 text-xs text-slate-600">
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
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                                <div>
                                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Minimum GPA (0 - 10)
                                    </label>
                                    <input
                                        type="text"
                                        value={minGpa}
                                        disabled={!canUpdateCriteria}
                                        onChange={(e) => { setMinGpa(e.target.value); handleCriteriaChange(); }}
                                        className={`w-full h-10 px-3.5 border rounded-xl text-xs sm:text-sm font-semibold transition ${
                                            canUpdateCriteria
                                                ? "bg-white border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-2xs"
                                                : "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
                                        }`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Attendance % (0 - 100)
                                    </label>
                                    <input
                                        type="text"
                                        value={minAttendance}
                                        disabled={!canUpdateCriteria}
                                        onChange={(e) => { setMinAttendance(e.target.value); handleCriteriaChange(); }}
                                        className={`w-full h-10 px-3.5 border rounded-xl text-xs sm:text-sm font-semibold transition ${
                                            canUpdateCriteria
                                                ? "bg-white border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-2xs"
                                                : "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
                                        }`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                                <div>
                                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Backlog Limit
                                    </label>
                                    <SelectDropdown
                                        value={backlogLimit}
                                        disabled={!canUpdateCriteria}
                                        onChange={(val) => { setBacklogLimit(val); handleCriteriaChange(); }}
                                        options={[
                                            { value: "Maximum 1 subject", label: "Maximum 1 subject" },
                                            { value: "Maximum 2 subjects", label: "Maximum 2 subjects" },
                                            { value: "Maximum 3 subjects", label: "Maximum 3 subjects" },
                                            { value: "No Backlog Allowed", label: "No Backlog Allowed" },
                                        ]}
                                        placeholder="Select Backlog Limit"
                                        className="w-full"
                                        buttonClassName={`w-full border rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold flex items-center justify-between gap-1.5 shadow-2xs transition ${
                                            canUpdateCriteria
                                                ? "bg-white border-slate-200 text-slate-700 hover:border-orange-400 cursor-pointer"
                                                : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                                        }`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Task Completion % (0 - 100)
                                    </label>
                                    <input
                                        type="text"
                                        value={minTaskCompletion}
                                        disabled={!canUpdateCriteria}
                                        onChange={(e) => { setMinTaskCompletion(e.target.value); handleCriteriaChange(); }}
                                        className={`w-full h-10 px-3.5 border rounded-xl text-xs sm:text-sm font-semibold transition ${
                                            canUpdateCriteria
                                                ? "bg-white border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-2xs"
                                                : "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Save Criteria Footer for HOD / Superadmin */}
                            {canUpdateCriteria && (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                                    <p className="text-[11px] font-semibold text-slate-400">
                                        {hasUnsavedCriteria ? "⚠️ Unsaved changes pending" : "Changes will apply to sublevel promotions"}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        {hasUnsavedCriteria && (
                                            <button
                                                type="button"
                                                onClick={handleDiscardCriteria}
                                                className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                                            >
                                                Discard
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleSaveCriteria}
                                            disabled={isSavingCriteria || !hasUnsavedCriteria}
                                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            {isSavingCriteria ? "Saving..." : "Save Criteria"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CARD 2: Theme Customization & Personal Accent */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center shrink-0 shadow-2xs">
                                    <MdPalette size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">Theme & Appearance</h3>
                                    <p className="text-[11px] font-semibold text-slate-400">Personal accent & user interface theme</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Instant Apply
                            </span>
                        </div>

                        {/* Theme Palette Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {themes.map((t) => {
                                const isActive = activeTheme === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => handleThemeChange(t.id)}
                                        className={`p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                                            isActive
                                                ? "border-orange-500 bg-orange-50/40 shadow-xs ring-2 ring-orange-500/20"
                                                : "border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span
                                                className="w-6 h-6 rounded-full flex items-center justify-center shadow-xs"
                                                style={{ backgroundColor: t.color }}
                                            >
                                                {isActive && <MdCheck size={14} className="text-white" />}
                                            </span>
                                            {isActive && (
                                                <span className="text-[9px] font-black uppercase tracking-wider text-orange-600 bg-white px-2 py-0.5 rounded-md border border-orange-200">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-900">{t.label}</p>
                                            <p className="text-[10px] font-semibold text-slate-400 mt-0.5 truncate">{t.description}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-xs text-slate-600 flex items-center justify-between">
                            <span className="font-semibold text-slate-500">
                                Active accent: <strong className="text-slate-900 capitalize font-black">{activeTheme}</strong>
                            </span>
                            <span className="text-[10px] font-extrabold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100">
                                Persisted to profile
                            </span>
                        </div>
                    </div>

                    {/* CARD 3: Society Logo & Institutional Branding */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center shrink-0 shadow-2xs">
                                    <MdSchool size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">Society Logo & Branding</h3>
                                    <p className="text-[11px] font-semibold text-slate-400">Sant Singaji Educational Society institutional branding</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                Official Branding
                            </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50">
                            <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 font-black flex items-center justify-center text-xl border border-orange-200 shrink-0 shadow-2xs">
                                SSES
                            </div>
                            <div className="space-y-1 flex-1">
                                <h4 className="text-xs font-black text-slate-900">Sant Singaji Educational Society (SSES)</h4>
                                <p className="text-[11px] font-semibold text-slate-400">
                                    Official logo displayed on portal headers, report cards, and student documents.
                                </p>
                                <div className="pt-1">
                                    {canManageGlobal ? (
                                        <button
                                            type="button"
                                            onClick={() => toast.info("Select new official logo file (PNG or SVG, max 2MB)")}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                                        >
                                            <MdUpload size={14} /> Change Logo
                                        </button>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                            <MdLock size={12} /> Superadmin Only
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="text-[11px] font-medium text-slate-400">
                            Recommended resolution: 512x512px transparent PNG. Uploaded logos synchronize with PDF export engines.
                        </div>
                    </div>

                    {/* CARD 4: System Operations & Navigation */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center shrink-0 shadow-2xs">
                                    <MdSecurity size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">System Operations</h3>
                                    <p className="text-[11px] font-semibold text-slate-400">Platform operational status and session portal</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <MdCheck size={12} /> System Healthy
                            </span>
                        </div>

                        {/* Quick Jump to Dedicated Session Page */}
                        <div className="p-4 rounded-2xl border border-orange-200/80 bg-orange-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-0.5">
                                <h4 className="text-xs font-black text-slate-900">Academic Session Management</h4>
                                <p className="text-[11px] font-semibold text-slate-500">
                                    Manage academic cycles, batches, and enrollment in the dedicated Session portal.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate("/session-management")}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition cursor-pointer shrink-0 self-start sm:self-auto"
                            >
                                Open Sessions <MdArrowForward size={14} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                                <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Database Status</p>
                                <p className="text-xs font-black text-emerald-600 mt-0.5">Connected</p>
                            </div>
                            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                                <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Role Enforcement</p>
                                <p className="text-xs font-black text-slate-800 mt-0.5 capitalize">{rawRole || "Staff"}</p>
                            </div>
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

            </div>
        </>
    );
};

export default SettingFIle;
