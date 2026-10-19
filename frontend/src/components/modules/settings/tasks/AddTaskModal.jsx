import { useState, useEffect, useMemo } from "react";
import { MdClose, MdAssignment, MdMenuBook, MdAdd } from "react-icons/md";
import { toast } from "react-toastify";
import SelectDropdown from "../../../shared/form-fields/SelectDropdown";
import { buttonStyles } from "../../../../styles/buttonStyles";
import {
    useCreateTaskManualMutation,
    useGetSyllabusVersionsBySubLevelQuery,
    useGetSyllabusVersionWithHierarchyQuery,
} from "../../../../redux/api/authApi";

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
        if (initialFilters.filterSession) {
            const match = sessionsList.find((s) => s.name === initialFilters.filterSession);
            if (match) setSelectedSessionId(match._id);
        } else if (sessionsList.length > 0) {
            const activeSession = sessionsList.find((s) => s.status === "active") || sessionsList[0];
            setSelectedSessionId(activeSession._id);
        }

        // Department
        if (initialFilters.filterDept) {
            const match = departments.find((d) => d.name === initialFilters.filterDept);
            if (match) setSelectedDepartmentId(match._id);
        }

        // SubDepartment
        if (initialFilters.filterSub) {
            const match = subDepartments.find((sd) => sd.name === initialFilters.filterSub);
            if (match) setSelectedSubDepartmentId(match._id);
        }

        // Level
        if (initialFilters.filterLevel) {
            const match = levelsList.find((l) => l.name === initialFilters.filterLevel);
            if (match) setSelectedLevelId(match._id);
        }

        // SubLevel
        if (initialFilters.filterSubLevel) {
            const match = subLevelsList.find((sl) => sl.name === initialFilters.filterSubLevel);
            if (match) setSelectedSubLevelId(match._id);
        }

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

    // Available levels filtered by selected subDepartment or department
    const availableLevels = useMemo(() => {
        if (selectedSubDepartmentId) {
            return levelsList.filter((l) => getId(l.subDepartmentId) === String(selectedSubDepartmentId));
        }
        if (selectedDepartmentId) {
            const validSubIds = new Set(availableSubDepartments.map((sd) => getId(sd)));
            return levelsList.filter((l) => validSubIds.has(getId(l.subDepartmentId)));
        }
        return levelsList;
    }, [levelsList, selectedSubDepartmentId, selectedDepartmentId, availableSubDepartments]);

    // Available subLevels filtered by selected level
    const availableSubLevels = useMemo(() => {
        if (selectedLevelId) {
            return subLevelsList.filter((sl) => getId(sl.levelId) === String(selectedLevelId));
        }
        const validLevelIds = new Set(availableLevels.map((l) => getId(l)));
        return subLevelsList.filter((sl) => validLevelIds.has(getId(sl.levelId)));
    }, [subLevelsList, selectedLevelId, availableLevels]);

    // Cascading changes
    const handleDepartmentChange = (deptId) => {
        setSelectedDepartmentId(deptId);
        setSelectedSubDepartmentId("");
        setSelectedLevelId("");
        setSelectedSubLevelId("");
    };

    const handleSubDepartmentChange = (subDeptId) => {
        setSelectedSubDepartmentId(subDeptId);
        if (subDeptId && !selectedDepartmentId) {
            const sub = subDepartments.find((s) => getId(s) === subDeptId);
            if (sub && sub.departmentId) {
                setSelectedDepartmentId(getId(sub.departmentId));
            }
        }
        setSelectedLevelId("");
        setSelectedSubLevelId("");
    };

    const handleLevelChange = (levelId) => {
        setSelectedLevelId(levelId);
        if (levelId) {
            const lvl = levelsList.find((l) => getId(l) === levelId);
            if (lvl && lvl.subDepartmentId) {
                const subId = getId(lvl.subDepartmentId);
                setSelectedSubDepartmentId(subId);
                const sub = subDepartments.find((s) => getId(s) === subId);
                if (sub && sub.departmentId && !selectedDepartmentId) {
                    setSelectedDepartmentId(getId(sub.departmentId));
                }
            }
        }
        setSelectedSubLevelId("");
    };

    const handleSubLevelChange = (subLevelId) => {
        setSelectedSubLevelId(subLevelId);
        if (subLevelId) {
            const sl = subLevelsList.find((s) => getId(s) === subLevelId);
            if (sl && sl.levelId) {
                const lvlId = getId(sl.levelId);
                setSelectedLevelId(lvlId);
                const lvl = levelsList.find((l) => getId(l) === lvlId);
                if (lvl && lvl.subDepartmentId) {
                    const subId = getId(lvl.subDepartmentId);
                    setSelectedSubDepartmentId(subId);
                    const sub = subDepartments.find((s) => getId(s) === subId);
                    if (sub && sub.departmentId && !selectedDepartmentId) {
                        setSelectedDepartmentId(getId(sub.departmentId));
                    }
                }
            }
        }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in duration-150">
            <div className="fixed inset-0" onClick={onClose} />
            <div className="relative bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] z-10">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                            <MdAdd size={22} />
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base font-black text-slate-900">Add New Task</h3>
                            <p className="text-xs text-slate-500">Create and assign a task to students in a level / sub-level</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        aria-label="Close"
                    >
                        <MdClose size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto">
                    {/* Section 1: Academic Location & Scope */}
                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 space-y-3.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-orange-500" />
                                1. Academic Target Scope
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">
                                Required for task assignment
                            </span>
                        </div>

                        {/* Session & Department */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
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
                                        ...sessionsList.map((s) => ({ value: s._id, label: s.name })),
                                    ]}
                                    className="w-full"
                                    buttonClassName="w-full px-3 py-2 bg-white border border-slate-200 hover:border-orange-400 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between gap-1 shadow-2xs transition cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
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
                                    buttonClassName="w-full px-3 py-2 bg-white border border-slate-200 hover:border-orange-400 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between gap-1 shadow-2xs transition cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* SubDepartment, Level, SubLevel */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Sub-Department
                                </label>
                                <SelectDropdown
                                    value={selectedSubDepartmentId}
                                    onChange={handleSubDepartmentChange}
                                    options={[
                                        { value: "", label: "Select Sub-Dept" },
                                        ...availableSubDepartments.map((sd) => ({ value: sd._id, label: sd.name })),
                                    ]}
                                    className="w-full"
                                    buttonClassName="w-full px-3 py-2 bg-white border border-slate-200 hover:border-orange-400 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between gap-1 shadow-2xs transition cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Level <span className="text-rose-500">*</span>
                                </label>
                                <SelectDropdown
                                    value={selectedLevelId}
                                    onChange={handleLevelChange}
                                    options={[
                                        { value: "", label: "Select Level" },
                                        ...availableLevels.map((l) => ({ value: l._id, label: l.name })),
                                    ]}
                                    className="w-full"
                                    buttonClassName="w-full px-3 py-2 bg-white border border-slate-200 hover:border-orange-400 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between gap-1 shadow-2xs transition cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Sub-Level <span className="text-rose-500">*</span>
                                </label>
                                <SelectDropdown
                                    value={selectedSubLevelId}
                                    onChange={handleSubLevelChange}
                                    options={[
                                        { value: "", label: "Select Sub-Level" },
                                        ...availableSubLevels.map((sl) => ({ value: sl._id, label: sl.name })),
                                    ]}
                                    className="w-full"
                                    buttonClassName="w-full px-3 py-2 bg-white border border-slate-200 hover:border-orange-400 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between gap-1 shadow-2xs transition cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Task Type / Mode Switcher */}
                    <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            2. Task Source & Type
                        </label>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                            <button
                                type="button"
                                onClick={() => setTaskSource("general")}
                                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                    taskSource === "general"
                                        ? "bg-white text-orange-600 shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                <MdAssignment size={16} />
                                <span>General Task (Direct)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setTaskSource("syllabus")}
                                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                    taskSource === "syllabus"
                                        ? "bg-white text-orange-600 shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                <MdMenuBook size={16} />
                                <span>Syllabus Task (Curriculum)</span>
                            </button>
                        </div>
                    </div>

                    {/* Section 2B: Syllabus Pickers OR General Inputs */}
                    {taskSource === "syllabus" ? (
                        <div className="bg-amber-50/50 border border-amber-200/70 rounded-2xl p-3.5 sm:p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <MdMenuBook size={15} className="text-amber-600" />
                                    Curriculum Association
                                </span>
                                {isLoadingVersions && (
                                    <span className="text-[10px] font-semibold text-amber-600">Loading syllabus...</span>
                                )}
                            </div>

                            {!selectedSubLevelId ? (
                                <p className="text-xs text-amber-700">
                                    Please select a Sub-Level above to view available syllabus versions and subjects.
                                </p>
                            ) : versions.length === 0 && !isLoadingVersions ? (
                                <div className="p-3 bg-white border border-amber-200 rounded-xl space-y-2">
                                    <p className="text-xs text-amber-800">
                                        No active syllabus version found for this Sub-Level & Session. You can still create this as a General Task.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setTaskSource("general")}
                                        className="text-xs font-bold text-orange-600 underline cursor-pointer"
                                    >
                                        Switch to General Task mode
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
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
                                            buttonClassName="w-full px-3 py-2 bg-white border border-slate-200 hover:border-orange-400 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between gap-1 shadow-2xs transition cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
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
                                            className="w-full"
                                            buttonClassName="w-full px-3 py-2 bg-white border border-slate-200 hover:border-orange-400 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between gap-1 shadow-2xs transition cursor-pointer disabled:bg-slate-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
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
                                            className="w-full"
                                            buttonClassName="w-full px-3 py-2 bg-white border border-slate-200 hover:border-orange-400 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between gap-1 shadow-2xs transition cursor-pointer disabled:bg-slate-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                            Sub-Topic (Optional)
                                        </label>
                                        <SelectDropdown
                                            value={selectedSubTopicId}
                                            onChange={setSelectedSubTopicId}
                                            options={[
                                                { value: "", label: "None / Overall Topic" },
                                                ...subTopics.map((st) => ({ value: st._id, label: st.name })),
                                            ]}
                                            disabled={!selectedTopicId || subTopics.length === 0}
                                            className="w-full"
                                            buttonClassName="w-full px-3 py-2 bg-white border border-slate-200 hover:border-orange-400 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between gap-1 shadow-2xs transition cursor-pointer disabled:bg-slate-100"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Subject Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={taskForm.subjectName}
                                    onChange={(e) => setTaskForm({ ...taskForm, subjectName: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition"
                                    placeholder="e.g., General / Technical / Soft Skills"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Topic / Chapter (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={taskForm.topicName}
                                    onChange={(e) => setTaskForm({ ...taskForm, topicName: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition"
                                    placeholder="e.g., Introduction / Module 1"
                                />
                            </div>
                        </div>
                    )}

                    {/* Section 3: Task Details */}
                    <div className="space-y-3.5 pt-2 border-t border-slate-100">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                            3. Task Details
                        </span>

                        {/* Title */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Task Title <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={taskForm.title}
                                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition"
                                placeholder="e.g., Implement Linked List operations in C++"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Description
                            </label>
                            <textarea
                                value={taskForm.description}
                                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                                rows={3}
                                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition resize-none"
                                placeholder="Provide detailed instructions, assignment criteria, or deliverables..."
                            />
                        </div>

                        {/* Type & Priority */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Task Type
                                </label>
                                <SelectDropdown
                                    value={taskForm.type}
                                    onChange={(val) => setTaskForm({ ...taskForm, type: val })}
                                    options={TASK_TYPES}
                                    className="w-full"
                                    buttonClassName="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-orange-400 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between gap-1 shadow-2xs transition cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Priority
                                </label>
                                <SelectDropdown
                                    value={taskForm.priority}
                                    onChange={(val) => setTaskForm({ ...taskForm, priority: val })}
                                    options={PRIORITIES}
                                    className="w-full"
                                    buttonClassName="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-orange-400 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between gap-1 shadow-2xs transition cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Max Marks, Duration, Due Date */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Max Marks
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={taskForm.maxMarks}
                                    onChange={(e) => setTaskForm({ ...taskForm, maxMarks: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Duration (Days)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={taskForm.timeDays}
                                    onChange={(e) => setTaskForm({ ...taskForm, timeDays: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition"
                                    placeholder="e.g., 5"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Due Date
                                </label>
                                <input
                                    type="date"
                                    value={taskForm.dueDate}
                                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition"
                                />
                            </div>
                        </div>

                        {/* Measurable Points */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Evaluation / Passing Criteria
                            </label>
                            <input
                                type="text"
                                value={taskForm.measurablePoints}
                                onChange={(e) => setTaskForm({ ...taskForm, measurablePoints: e.target.value })}
                                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition"
                                placeholder="e.g., Score >= 80%, all test cases passed, proper code documentation"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm flex items-center justify-center text-center ${buttonStyles.cancel}`}
                        >
                            <span>Cancel</span>
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating}
                            className={`px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 text-center ${buttonStyles.primary}`}
                        >
                            <MdAdd size={16} />
                            <span>{isCreating ? "Creating..." : "Create Task"}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTaskModal;
