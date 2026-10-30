import { useState, useEffect, useMemo } from "react";
import {
    MdClose,
    MdAssignment,
    MdMenuBook,
    MdAdd,
    MdAccountTree,
    MdInfoOutline,
    MdCheckCircle,
    MdLayers,
} from "react-icons/md";
import { toast } from "react-toastify";
import SelectDropdown from "../../../shared/form-fields/SelectDropdown";
import { buttonStyles } from "../../../../styles/buttonStyles";
import {
    useCreateTaskManualMutation,
    useGetSyllabusVersionsBySubLevelQuery,
    useGetSyllabusVersionWithHierarchyQuery,
} from "../../../../redux/api/authApi";
import { filterSessionsByDepartment, formatSessionLabel } from "../../../../utils/sessionDurationHelpers";

const getId = (item) => {
    if (!item) return "";
    if (typeof item === "object") return String(item._id || item.id || "");
    return String(item);
};

const TASK_TYPES = [
    { value: "assignment", label: "Assignment" },
    { value: "project", label: "Project" },
    { value: "practice", label: "Practice" },
    { value: "reading", label: "Reading" },
    { value: "assessment", label: "Assessment" },
    { value: "other", label: "Other" },
];

const PRIORITIES = [
    { value: "low", label: "Low Priority" },
    { value: "medium", label: "Medium Priority" },
    { value: "high", label: "High Priority" },
];

const AddTaskModal = ({
    isOpen,
    onClose,
    onSuccess,
    sessionsList = [],
    departments = [],
    subDepartments = [],
    levelsList = [],
    subLevelsList = [],
    initialFilters = {},
}) => {
    // Academic hierarchy selections
    const [selectedSessionId, setSelectedSessionId] = useState("");
    const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
    const [selectedSubDepartmentId, setSelectedSubDepartmentId] = useState("");
    const [selectedLevelId, setSelectedLevelId] = useState("");
    const [selectedSubLevelId, setSelectedSubLevelId] = useState("");

    // Task mode: "general" | "syllabus"
    const [taskSource, setTaskSource] = useState("general");

    // Syllabus selections
    const [selectedVersionId, setSelectedVersionId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [selectedTopicId, setSelectedTopicId] = useState("");
    const [selectedSubTopicId, setSelectedSubTopicId] = useState("");

    // Task details
    const [taskForm, setTaskForm] = useState({
        title: "",
        description: "",
        subjectName: "",
        topicName: "",
        type: "assignment",
        priority: "medium",
        maxMarks: 5,
        timeDays: "",
        dueDate: "",
        measurablePoints: "",
    });

    const [createTask, { isLoading: isCreating }] = useCreateTaskManualMutation();

    // Initialize selections from initialFilters and lists when modal opens
    useEffect(() => {
        if (!isOpen) return;

        // Session
        let sId = "";
        if (initialFilters.filterSession) {
            const match = sessionsList.find((s) => s.name === initialFilters.filterSession);
            if (match) sId = match._id;
        } else if (sessionsList.length > 0) {
            const activeSession = sessionsList.find((s) => s.status === "active") || sessionsList[0];
            sId = activeSession._id;
        }
        setSelectedSessionId(sId);

        // Department
        let dId = "";
        if (initialFilters.filterDept) {
            const match = departments.find((d) => d.name === initialFilters.filterDept);
            if (match) dId = match._id;
        }
        setSelectedDepartmentId(dId);

        // SubDepartment
        let sdId = "";
        if (initialFilters.filterSub) {
            const match = subDepartments.find((sd) => sd.name === initialFilters.filterSub);
            if (match) sdId = match._id;
        }
        setSelectedSubDepartmentId(sdId);

        // Level (scoped to SubDepartment if available to prevent wrong matches)
        let lId = "";
        if (initialFilters.filterLevel) {
            const match = levelsList.find((l) => {
                if (l.name !== initialFilters.filterLevel) return false;
                if (sdId) return getId(l.subDepartmentId) === String(sdId);
                return true;
            });
            if (match) lId = match._id;
        }
        setSelectedLevelId(lId);

        // SubLevel (scoped to Level if available)
        let slId = "";
        if (initialFilters.filterSubLevel) {
            const match = subLevelsList.find((sl) => {
                if (sl.name !== initialFilters.filterSubLevel) return false;
                if (lId) return getId(sl.levelId) === String(lId);
                return true;
            });
            if (match) slId = match._id;
        }
        setSelectedSubLevelId(slId);

        // Priority
        if (initialFilters.filterPriority) {
            setTaskForm((prev) => ({ ...prev, priority: initialFilters.filterPriority }));
        }
    }, [isOpen, initialFilters, sessionsList, departments, subDepartments, levelsList, subLevelsList]);

    // Available subDepartments filtered by selected department
    const availableSubDepartments = useMemo(() => {
        if (!selectedDepartmentId) return subDepartments;
        return subDepartments.filter((sd) => getId(sd.departmentId) === String(selectedDepartmentId));
    }, [subDepartments, selectedDepartmentId]);

    // Sessions filtered by selected department
    const filteredSessionsList = useMemo(() => {
        const selectedDept = departments.find((d) => d._id === selectedDepartmentId);
        return filterSessionsByDepartment(sessionsList, selectedDept?.name || selectedDept);
    }, [sessionsList, departments, selectedDepartmentId]);

    // Available levels STRICTLY filtered by selected subDepartment with deduplication
    const availableLevels = useMemo(() => {
        if (!selectedSubDepartmentId) return [];
        const filtered = levelsList.filter((l) => getId(l.subDepartmentId) === String(selectedSubDepartmentId));

        // Deduplicate by name and sort by order
        const seenNames = new Set();
        const unique = [];
        const sorted = [...filtered].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
        for (const l of sorted) {
            const trimmed = (l.name || "").trim();
            if (!seenNames.has(trimmed)) {
                seenNames.add(trimmed);
                unique.push(l);
            }
        }
        return unique;
    }, [levelsList, selectedSubDepartmentId]);

    // Available subLevels STRICTLY filtered by selected level with deduplication
    const availableSubLevels = useMemo(() => {
        if (!selectedLevelId) return [];
        const filtered = subLevelsList.filter((sl) => getId(sl.levelId) === String(selectedLevelId));

        // Deduplicate by name and sort by order
        const seenNames = new Set();
        const unique = [];
        const sorted = [...filtered].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
        for (const sl of sorted) {
            const trimmed = (sl.name || "").trim();
            if (!seenNames.has(trimmed)) {
                seenNames.add(trimmed);
                unique.push(sl);
            }
        }
        return unique;
    }, [subLevelsList, selectedLevelId]);

    // Cascading selection handlers
    const handleDepartmentChange = (deptId) => {
        setSelectedDepartmentId(deptId);
        setSelectedLevelId("");
        setSelectedSubLevelId("");

        // Auto-select sub-dept if department has exactly 1 sub-department
        if (deptId) {
            const subs = subDepartments.filter((sd) => getId(sd.departmentId) === String(deptId));
            if (subs.length === 1) {
                setSelectedSubDepartmentId(getId(subs[0]));
                return;
            }
        }
        setSelectedSubDepartmentId("");
    };

    const handleSubDepartmentChange = (subDeptId) => {
        setSelectedSubDepartmentId(subDeptId);
        setSelectedLevelId("");
        setSelectedSubLevelId("");

        // If user selects sub-dept first, auto-fill department
        if (subDeptId && !selectedDepartmentId) {
            const sub = subDepartments.find((s) => getId(s) === subDeptId);
            if (sub && sub.departmentId) {
                setSelectedDepartmentId(getId(sub.departmentId));
            }
        }
    };

    const handleLevelChange = (levelId) => {
        setSelectedLevelId(levelId);
        setSelectedSubLevelId("");
    };

    const handleSubLevelChange = (subLevelId) => {
        setSelectedSubLevelId(subLevelId);
    };

    // Query syllabus versions for the selected subLevel and session
    const { data: versionsData, isLoading: isLoadingVersions } = useGetSyllabusVersionsBySubLevelQuery(
        { subLevelId: selectedSubLevelId, sessionId: selectedSessionId },
        { skip: !selectedSubLevelId || taskSource !== "syllabus" }
    );
    const versions = versionsData?.data || [];

    // Auto-select active syllabus version
    useEffect(() => {
        if (taskSource === "syllabus" && versions.length > 0) {
            if (!selectedVersionId || !versions.some((v) => v._id === selectedVersionId)) {
                const activeVer = versions.find((v) => v.status === "active") || versions[0];
                setSelectedVersionId(activeVer._id);
            }
        } else if (taskSource === "syllabus" && versions.length === 0 && !isLoadingVersions) {
            setSelectedVersionId("");
        }
    }, [versions, taskSource, selectedVersionId, isLoadingVersions]);

    // Query syllabus hierarchy when version is selected
    const { data: versionDetail, isLoading: isLoadingVersionDetail } = useGetSyllabusVersionWithHierarchyQuery(
        selectedVersionId,
        { skip: !selectedVersionId || taskSource !== "syllabus" }
    );
    const subjects = useMemo(() => {
        if (!selectedVersionId || taskSource !== "syllabus" || !versionDetail?.data?.subjects) return [];
        if (String(versionDetail.data._id) !== String(selectedVersionId)) return [];
        return versionDetail.data.subjects || [];
    }, [selectedVersionId, taskSource, versionDetail]);

    const currentSubject = subjects.find((s) => s._id === selectedSubjectId);
    const topics = currentSubject?.topics || [];
    const currentTopic = topics.find((t) => t._id === selectedTopicId);
    const subTopics = currentTopic?.subTopics || [];

    // Names for preview breadcrumb bar
    const selectedSessionName = sessionsList.find((s) => s._id === selectedSessionId)?.name;
    const selectedDeptName = departments.find((d) => d._id === selectedDepartmentId)?.name;
    const selectedSubDeptName = subDepartments.find((sd) => sd._id === selectedSubDepartmentId)?.name;
    const selectedLevelName = levelsList.find((l) => l._id === selectedLevelId)?.name;
    const selectedSubLevelName = subLevelsList.find((sl) => sl._id === selectedSubLevelId)?.name;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!taskForm.title.trim()) {
            toast.error("Task title is required");
            return;
        }

        if (!selectedLevelId || !selectedSubLevelId) {
            toast.error("Please select a Level and Sub-Level for the task");
            return;
        }

        if (taskSource === "syllabus") {
            if (!selectedVersionId) {
                toast.error("Please select a syllabus version or switch to General Task");
                return;
            }
            if (!selectedSubjectId || !selectedTopicId) {
                toast.error("Please select Subject and Topic for syllabus-based task");
                return;
            }
        }

        try {
            const payload = {
                title: taskForm.title.trim(),
                description: taskForm.description.trim(),
                type: taskForm.type || "assignment",
                priority: taskForm.priority || "medium",
                maxMarks: Number(taskForm.maxMarks) >= 0 ? Number(taskForm.maxMarks) : 5,
                timeDays: taskForm.timeDays ? Number(taskForm.timeDays) : null,
                dueDate: taskForm.dueDate || null,
                measurablePoints: taskForm.measurablePoints.trim(),
                levelId: selectedLevelId,
                subLevelId: selectedSubLevelId,
                sessionId: selectedSessionId || null,
            };

            if (taskSource === "syllabus") {
                payload.syllabusVersionId = selectedVersionId;
                payload.subjectId = selectedSubjectId;
                payload.topicId = selectedTopicId;
                if (selectedSubTopicId) payload.subTopicId = selectedSubTopicId;
            } else {
                payload.isGeneralTask = true;
                payload.subjectName = taskForm.subjectName.trim() || "General";
                payload.topicName = taskForm.topicName.trim() || "";
            }

            await createTask(payload).unwrap();
            toast.success("Task created successfully!");
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error("Create task error:", err);
            toast.error(err?.data?.message || err?.message || "Failed to create task");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
            <div className="fixed inset-0" onClick={onClose} />
            <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] z-10">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-2xs">
                            <MdAdd size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-black text-slate-900">Add New Task</h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    taskSource === "syllabus"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-orange-100 text-orange-800"
                                }`}>
                                    {taskSource === "syllabus" ? "Syllabus Aligned" : "General Task"}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Configure target academic scope, curriculum mapping, and task parameters
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                        aria-label="Close"
                    >
                        <MdClose size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                    
                    {/* ── Section 1: Academic Location & Scope ── */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shadow-2xs">
                                    1
                                </span>
                                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                                    Academic Target Scope
                                </span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium">
                                Level & Sub-Level are strictly filtered by Sub-Department
                            </span>
                        </div>

                        {/* Interactive Scope Path Preview */}
                        <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-white rounded-xl border border-slate-200/80 text-xs shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                                <MdAccountTree className="text-orange-500" size={13} />
                                Target Path:
                            </span>
                            <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                                selectedSessionName ? "bg-orange-50 text-orange-700 border border-orange-200/60" : "bg-slate-100 text-slate-400"
                            }`}>
                                {selectedSessionName || "Session"}
                            </span>
                            <span className="text-slate-300 font-bold">›</span>
                            <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                                selectedDeptName ? "bg-orange-50 text-orange-700 border border-orange-200/60" : "bg-slate-100 text-slate-400"
                            }`}>
                                {selectedDeptName || "Department"}
                            </span>
                            <span className="text-slate-300 font-bold">›</span>
                            <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                                selectedSubDeptName ? "bg-orange-50 text-orange-700 border border-orange-200/60" : "bg-slate-100 text-slate-400"
                            }`}>
                                {selectedSubDeptName || "Sub-Dept"}
                            </span>
                            <span className="text-slate-300 font-bold">›</span>
                            <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                                selectedLevelName ? "bg-orange-50 text-orange-700 border border-orange-200/60" : "bg-slate-100 text-slate-400"
                            }`}>
                                {selectedLevelName || "Level"}
                            </span>
                            <span className="text-slate-300 font-bold">›</span>
                            <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                                selectedSubLevelName ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-slate-100 text-slate-400"
                            }`}>
                                {selectedSubLevelName || "Sub-Level"}
                            </span>
                        </div>

                        {/* Row 1: Session & Department */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative z-30">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Academic Session
                                </label>
                                <SelectDropdown
                                    value={selectedSessionId}
                                    onChange={(val) => {
                                        setSelectedSessionId(val);
                                        setSelectedVersionId("");
                                        setSelectedSubjectId("");
                                        setSelectedTopicId("");
                                        setSelectedSubTopicId("");
                                    }}
                                    options={[
                                        { value: "", label: "Select Session" },
                                        ...filteredSessionsList.map((s) => ({ value: s._id, label: formatSessionLabel(s) })),
                                    ]}
                                    className="w-full"
                                    menuClassName="w-full shadow-xl border border-slate-100"
                                    buttonClassName="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:border-orange-500 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs transition cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Department
                                </label>
                                <SelectDropdown
                                    value={selectedDepartmentId}
                                    onChange={handleDepartmentChange}
                                    options={[
                                        { value: "", label: "Select Department" },
                                        ...departments.map((d) => ({ value: d._id, label: d.name })),
                                    ]}
                                    className="w-full"
                                    menuClassName="w-full shadow-xl border border-slate-100"
                                    buttonClassName="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:border-orange-500 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs transition cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Row 2: Sub-Department, Level, Sub-Level */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 relative z-20">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Sub-Department
                                </label>
                                <SelectDropdown
                                    value={selectedSubDepartmentId}
                                    onChange={handleSubDepartmentChange}
                                    options={[
                                        { value: "", label: "Select Sub-Department" },
                                        ...availableSubDepartments.map((sd) => ({
                                            value: sd._id,
                                            label: selectedDepartmentId
                                                ? sd.name
                                                : `${sd.name}${sd.departmentId?.name ? ` (${sd.departmentId.name})` : ""}`,
                                        })),
                                    ]}
                                    className="w-full"
                                    menuClassName="w-full shadow-xl border border-slate-100"
                                    buttonClassName="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:border-orange-500 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs transition cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                                    <span>Level <span className="text-rose-500">*</span></span>
                                    {!selectedSubDepartmentId && (
                                        <span className="text-[10px] text-amber-600 font-semibold lowercase">
                                            (Pick Sub-Dept First)
                                        </span>
                                    )}
                                </label>
                                <SelectDropdown
                                    value={selectedLevelId}
                                    onChange={handleLevelChange}
                                    options={
                                        !selectedSubDepartmentId
                                            ? [{ value: "", label: "Select Sub-Dept First" }]
                                            : availableLevels.length === 0
                                            ? [{ value: "", label: "No Levels in this Sub-Dept" }]
                                            : [
                                                { value: "", label: "Select Level" },
                                                ...availableLevels.map((l) => ({ value: l._id, label: l.name })),
                                            ]
                                    }
                                    disabled={!selectedSubDepartmentId || availableLevels.length === 0}
                                    placeholder={!selectedSubDepartmentId ? "Select Sub-Dept First" : "Select Level"}
                                    className="w-full"
                                    menuClassName="w-full shadow-xl border border-slate-100"
                                    buttonClassName={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition border ${
                                        !selectedSubDepartmentId
                                            ? "bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed"
                                            : "bg-white border-slate-200 hover:border-orange-500 text-slate-800 shadow-2xs cursor-pointer"
                                    }`}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                                    <span>Sub-Level <span className="text-rose-500">*</span></span>
                                    {!selectedLevelId && (
                                        <span className="text-[10px] text-amber-600 font-semibold lowercase">
                                            (Pick Level First)
                                        </span>
                                    )}
                                </label>
                                <SelectDropdown
                                    value={selectedSubLevelId}
                                    onChange={handleSubLevelChange}
                                    options={
                                        !selectedLevelId
                                            ? [{ value: "", label: "Select Level First" }]
                                            : availableSubLevels.length === 0
                                            ? [{ value: "", label: "No Sub-Levels in this Level" }]
                                            : [
                                                { value: "", label: "Select Sub-Level" },
                                                ...availableSubLevels.map((sl) => ({ value: sl._id, label: sl.name })),
                                            ]
                                    }
                                    disabled={!selectedLevelId || availableSubLevels.length === 0}
                                    placeholder={!selectedLevelId ? "Select Level First" : "Select Sub-Level"}
                                    className="w-full"
                                    menuClassName="w-full shadow-xl border border-slate-100"
                                    buttonClassName={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition border ${
                                        !selectedLevelId
                                            ? "bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed"
                                            : "bg-white border-slate-200 hover:border-orange-500 text-slate-800 shadow-2xs cursor-pointer"
                                    }`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Section 2: Task Source & Alignment Mode ── */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shadow-2xs">
                                2
                            </span>
                            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                                Task Source & Alignment
                            </span>
                        </div>

                        {/* Interactive Mode Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div
                                onClick={() => setTaskSource("general")}
                                className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                                    taskSource === "general"
                                        ? "border-orange-500 bg-orange-50/40 shadow-xs"
                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                                }`}
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    taskSource === "general" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"
                                }`}>
                                    <MdAssignment size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">General Task</h4>
                                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                            taskSource === "general" ? "border-orange-500 bg-orange-500" : "border-slate-300"
                                        }`}>
                                            {taskSource === "general" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                        Custom topic, ad-hoc assignment, lab practice, or extracurricular work
                                    </p>
                                </div>
                            </div>

                            <div
                                onClick={() => setTaskSource("syllabus")}
                                className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                                    taskSource === "syllabus"
                                        ? "border-orange-500 bg-orange-50/40 shadow-xs"
                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                                }`}
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    taskSource === "syllabus" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"
                                }`}>
                                    <MdMenuBook size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">Syllabus Task</h4>
                                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                            taskSource === "syllabus" ? "border-orange-500 bg-orange-500" : "border-slate-300"
                                        }`}>
                                            {taskSource === "syllabus" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                        Aligned to academic curriculum, syllabus versions, subjects & topics
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Mode Specific Inputs */}
                        {taskSource === "syllabus" ? (
                            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5 relative z-10">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                                        <MdMenuBook size={16} className="text-amber-600" />
                                        Curriculum Association
                                    </span>
                                    {isLoadingVersions && (
                                        <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                                            <div className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                            Loading syllabus...
                                        </span>
                                    )}
                                </div>

                                {!selectedSubLevelId ? (
                                    <div className="p-3.5 bg-white/90 border border-amber-200 rounded-xl flex items-center gap-2.5 text-amber-800 text-xs">
                                        <MdInfoOutline size={18} className="text-amber-600 shrink-0" />
                                        <p className="font-medium">
                                            Please select <strong>Department → Sub-Dept → Level → Sub-Level</strong> in Step 1 to load syllabus versions.
                                        </p>
                                    </div>
                                ) : versions.length === 0 && !isLoadingVersions ? (
                                    <div className="p-4 bg-white/90 border border-amber-200 rounded-xl space-y-2">
                                        <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                                            <MdInfoOutline size={18} className="text-amber-600 shrink-0" />
                                            <span>No active syllabus version found for this Sub-Level & Session.</span>
                                        </div>
                                        <p className="text-xs text-slate-500 pl-6">
                                            You can still create this task without curriculum mapping by switching to General Task.
                                        </p>
                                        <div className="pl-6 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => setTaskSource("general")}
                                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition cursor-pointer inline-flex items-center gap-1"
                                            >
                                                <span>Switch to General Task mode</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Syllabus Version <span className="text-rose-500">*</span>
                                            </label>
                                            <SelectDropdown
                                                value={selectedVersionId}
                                                onChange={(verId) => {
                                                    setSelectedVersionId(verId);
                                                    setSelectedSubjectId("");
                                                    setSelectedTopicId("");
                                                    setSelectedSubTopicId("");
                                                }}
                                                options={[
                                                    { value: "", label: "Select Version" },
                                                    ...versions.map((v) => ({
                                                        value: v._id,
                                                        label: `${v.title || "Syllabus"} (${v.version || "v1"}) [${v.status}]`,
                                                    })),
                                                ]}
                                                className="w-full"
                                                menuClassName="w-full shadow-xl border border-slate-100"
                                                buttonClassName="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:border-orange-500 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs transition cursor-pointer"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Subject <span className="text-rose-500">*</span>
                                            </label>
                                            <SelectDropdown
                                                value={selectedSubjectId}
                                                onChange={(sId) => {
                                                    setSelectedSubjectId(sId);
                                                    setSelectedTopicId("");
                                                    setSelectedSubTopicId("");
                                                }}
                                                options={[
                                                    { value: "", label: "Select Subject" },
                                                    ...subjects.map((s) => ({ value: s._id, label: s.name })),
                                                ]}
                                                disabled={!selectedVersionId || subjects.length === 0}
                                                placeholder={!selectedVersionId ? "Select Version First" : "Select Subject"}
                                                className="w-full"
                                                menuClassName="w-full shadow-xl border border-slate-100"
                                                buttonClassName={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition border ${
                                                    !selectedVersionId || subjects.length === 0
                                                        ? "bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed"
                                                        : "bg-white border-slate-200 hover:border-orange-500 text-slate-800 shadow-2xs cursor-pointer"
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Topic <span className="text-rose-500">*</span>
                                            </label>
                                            <SelectDropdown
                                                value={selectedTopicId}
                                                onChange={(tId) => {
                                                    setSelectedTopicId(tId);
                                                    setSelectedSubTopicId("");
                                                }}
                                                options={[
                                                    { value: "", label: "Select Topic" },
                                                    ...topics.map((t) => ({ value: t._id, label: t.name })),
                                                ]}
                                                disabled={!selectedSubjectId || topics.length === 0}
                                                placeholder={!selectedSubjectId ? "Select Subject First" : "Select Topic"}
                                                className="w-full"
                                                menuClassName="w-full shadow-xl border border-slate-100"
                                                buttonClassName={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition border ${
                                                    !selectedSubjectId || topics.length === 0
                                                        ? "bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed"
                                                        : "bg-white border-slate-200 hover:border-orange-500 text-slate-800 shadow-2xs cursor-pointer"
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Sub-Topic <span className="text-slate-400 font-normal">(Optional)</span>
                                            </label>
                                            <SelectDropdown
                                                value={selectedSubTopicId}
                                                onChange={setSelectedSubTopicId}
                                                options={[
                                                    { value: "", label: "None / Overall Topic" },
                                                    ...subTopics.map((st) => ({ value: st._id, label: st.name })),
                                                ]}
                                                disabled={!selectedTopicId || subTopics.length === 0}
                                                placeholder="None / Overall Topic"
                                                className="w-full"
                                                menuClassName="w-full shadow-xl border border-slate-100"
                                                buttonClassName={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition border ${
                                                    !selectedTopicId || subTopics.length === 0
                                                        ? "bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed"
                                                        : "bg-white border-slate-200 hover:border-orange-500 text-slate-800 shadow-2xs cursor-pointer"
                                                }`}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Subject / Category <span className="text-slate-400 font-normal">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={taskForm.subjectName}
                                        onChange={(e) => setTaskForm({ ...taskForm, subjectName: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition"
                                        placeholder="e.g. General / Data Structures / Soft Skills"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Topic / Unit <span className="text-slate-400 font-normal">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={taskForm.topicName}
                                        onChange={(e) => setTaskForm({ ...taskForm, topicName: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition"
                                        placeholder="e.g. Module 1: Sorting Algorithms"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Section 3: Task Details & Evaluation ── */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shadow-2xs">
                                    3
                                </span>
                                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                                    Task Details & Deliverables
                                </span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-semibold">Title & Rubric</span>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Task Title <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={taskForm.title}
                                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-orange-500 transition shadow-2xs placeholder:font-normal placeholder:text-slate-400"
                                placeholder="e.g. Implement Stack operations using Arrays in C++"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Description & Instructions <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <textarea
                                value={taskForm.description}
                                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                                rows={3}
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-orange-500 transition resize-none shadow-2xs placeholder:text-slate-400"
                                placeholder="Detail the problem statement, submission format, test scenarios, or criteria for students..."
                            />
                        </div>

                        {/* Type, Priority, Max Marks, Duration */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Task Type</label>
                                <SelectDropdown
                                    value={taskForm.type}
                                    onChange={(val) => setTaskForm({ ...taskForm, type: val })}
                                    options={TASK_TYPES}
                                    className="w-full"
                                    menuClassName="w-full shadow-xl border border-slate-100"
                                    buttonClassName="w-full flex items-center justify-between gap-1.5 px-3 py-2.5 bg-white border border-slate-200 hover:border-orange-500 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs transition cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                                <SelectDropdown
                                    value={taskForm.priority}
                                    onChange={(val) => setTaskForm({ ...taskForm, priority: val })}
                                    options={PRIORITIES}
                                    className="w-full"
                                    menuClassName="w-full shadow-xl border border-slate-100"
                                    buttonClassName="w-full flex items-center justify-between gap-1.5 px-3 py-2.5 bg-white border border-slate-200 hover:border-orange-500 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs transition cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Max Marks</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={taskForm.maxMarks}
                                    onChange={(e) => setTaskForm({ ...taskForm, maxMarks: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-orange-500 transition shadow-2xs"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Days)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={taskForm.timeDays}
                                    onChange={(e) => setTaskForm({ ...taskForm, timeDays: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-orange-500 transition shadow-2xs"
                                    placeholder="e.g. 7"
                                />
                            </div>
                        </div>

                        {/* Due Date & Passing Criteria */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                                <input
                                    type="date"
                                    value={taskForm.dueDate}
                                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-orange-500 transition shadow-2xs"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Evaluation / Passing Criteria <span className="text-slate-400 font-normal">(Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={taskForm.measurablePoints}
                                    onChange={(e) => setTaskForm({ ...taskForm, measurablePoints: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-orange-500 transition shadow-2xs placeholder:text-slate-400"
                                    placeholder="e.g. Score >= 80%, all test cases passed"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Modal Footer ── */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="hidden sm:flex items-center gap-2">
                            {selectedSubLevelName && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200/80 font-bold text-xs text-orange-800">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Target: {selectedSubDeptName ? `${selectedSubDeptName} • ` : ""}{selectedLevelName ? `${selectedLevelName} • ` : ""}{selectedSubLevelName}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-slate-50 hover:border-gray-400 font-bold tracking-wider uppercase text-xs rounded-xl transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isCreating}
                                className="px-5 py-2 text-xs font-bold tracking-wider uppercase text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 active:scale-[0.97] disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                            >
                                {isCreating ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Creating...</span>
                                    </>
                                ) : (
                                    <>
                                        <MdAdd size={17} />
                                        <span>Create Task</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTaskModal;
