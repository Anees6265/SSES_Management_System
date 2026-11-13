import { useState, useEffect, useMemo } from "react";
import {
    MdClose,
    MdAssignment,
    MdMenuBook,
    MdAdd,
    MdAccountTree,
    MdInfoOutline,
    MdCheckCircle,
    MdCheck,
    MdLayers,
    MdArrowBack,
    MdChevronRight
} from "react-icons/md";
import { toast } from "react-toastify";
import SelectDropdown from "../../../shared/form-fields/SelectDropdown";
import CourseMultiSelect from "../../../shared/form-fields/CourseMultiSelect";
import StudentAssignPicker from "../../../shared/form-fields/StudentAssignPicker";
import {
    useCreateTaskManualMutation,
    useGetSyllabusVersionsBySubLevelQuery,
    useGetSyllabusVersionWithHierarchyQuery,
} from "../../../../redux/api/authApi";
import { filterSessionsByDepartment, formatSessionLabel } from "../../../../utils/sessionDurationHelpers";
import { getDomainsForDepartment } from "../../../../utils/ftpConfig";
import { sortByOrderAsc } from "../../../../utils/taskOrderHelpers";

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
    { value: "low", label: "Low", activeColor: "bg-emerald-50 text-emerald-700 border-emerald-500 ring-2 ring-emerald-500/20 font-black", dot: "bg-emerald-500" },
    { value: "medium", label: "Medium", activeColor: "bg-amber-50 text-amber-700 border-amber-500 ring-2 ring-amber-500/20 font-black", dot: "bg-amber-500" },
    { value: "high", label: "High", activeColor: "bg-rose-50 text-rose-700 border-rose-500 ring-2 ring-rose-500/20 font-black", dot: "bg-rose-500" },
];

const selectBtnCls = "w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200/90 hover:border-orange-400 bg-white rounded-xl text-slate-800 font-medium transition-all shadow-2xs focus:outline-none cursor-pointer";
const inputCls = "w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder-slate-400 font-medium text-slate-800 shadow-2xs";
const labelCls = "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5";

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
        course: "All",
        domain: "",
        type: "assignment",
        priority: "medium",
        maxMarks: 5,
        timeDays: "",
        dueDate: "",
        measurablePoints: "",
    });
    const [selectedCourses, setSelectedCourses] = useState(["All"]);

    // Target Audience (All Students vs Specific Students)
    const [assignTarget, setAssignTarget] = useState("all");
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);

    const [createTask, { isLoading: isCreating }] = useCreateTaskManualMutation();

    // Keyboard shortcut: Escape to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                onClose?.();
            }
        };
        if (isOpen) {
            window.addEventListener("keydown", handleKeyDown);
            return () => window.removeEventListener("keydown", handleKeyDown);
        }
    }, [isOpen, onClose]);

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
            const targetDept = String(initialFilters.filterDept).trim().toLowerCase();
            const match = departments.find((d) => String(d.name || "").trim().toLowerCase() === targetDept);
            if (match) dId = match._id;
        }
        if (!dId && departments.length === 1) {
            dId = departments[0]._id;
        }
        setSelectedDepartmentId(dId);

        // SubDepartment
        let sdId = "";
        if (initialFilters.filterSub) {
            const targetSub = String(initialFilters.filterSub).trim().toLowerCase();
            const match = subDepartments.find((sd) => String(sd.name || "").trim().toLowerCase() === targetSub);
            if (match) sdId = match._id;
        }
        if (!sdId && dId) {
            const deptSubs = subDepartments.filter((sd) => getId(sd.departmentId) === String(dId));
            if (deptSubs.length === 1) {
                sdId = getId(deptSubs[0]);
            }
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
        setSelectedCourses(["All"]);
        setSelectedLevelId("");
        setSelectedSubLevelId("");

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
    const { data: versionDetail } = useGetSyllabusVersionWithHierarchyQuery(
        selectedVersionId,
        { skip: !selectedVersionId || taskSource !== "syllabus" }
    );
    const subjects = useMemo(() => {
        if (!selectedVersionId || taskSource !== "syllabus" || !versionDetail?.data?.subjects) return [];
        if (String(versionDetail.data._id) !== String(selectedVersionId)) return [];
        return sortByOrderAsc(versionDetail.data.subjects || []);
    }, [selectedVersionId, taskSource, versionDetail]);

    const currentSubject = subjects.find((s) => s._id === selectedSubjectId);
    const topics = sortByOrderAsc(currentSubject?.topics || []);
    const currentTopic = topics.find((t) => t._id === selectedTopicId);
    const subTopics = sortByOrderAsc(currentTopic?.subTopics || []);

    // Names for preview breadcrumb bar
    const selectedSessionName = sessionsList.find((s) => s._id === selectedSessionId)?.name;
    const selectedDeptName = departments.find((d) => d._id === selectedDepartmentId)?.name;
    const selectedSubDeptName = subDepartments.find((sd) => sd._id === selectedSubDepartmentId)?.name;
    const selectedLevelName = levelsList.find((l) => l._id === selectedLevelId)?.name;
    const selectedSubLevelName = subLevelsList.find((sl) => sl._id === selectedSubLevelId)?.name;

    const isLevel2Aor2B = useMemo(() => {
        const sName = String(selectedSubLevelName || "").trim().toUpperCase();
        const lName = String(selectedLevelName || "").trim().toUpperCase();
        return (
            sName === "2B" || sName.includes("2B") || lName === "2B" || lName.includes("2B") ||
            sName === "2A" || sName.includes("2A") || lName === "2A" || lName.includes("2A")
        );
    }, [selectedSubLevelName, selectedLevelName]);

    const departmentDomains = useMemo(() => {
        const subName = selectedSubDeptName || "";
        if (subName.toUpperCase().includes("UI/UX") || subName.toUpperCase().includes("UIUX")) {
            return getDomainsForDepartment("UI/UX");
        }
        return getDomainsForDepartment(selectedDeptName || subName);
    }, [selectedDeptName, selectedSubDeptName]);

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

        if (assignTarget === "specific" && selectedStudentIds.length === 0) {
            toast.error("Please select at least one student or choose 'All Students'");
            return;
        }

        try {
            const coursesList = selectedCourses && selectedCourses.length > 0 ? selectedCourses : ["All"];
            const courseStr = coursesList.includes("All") ? "All" : coursesList.join(", ");

            const payload = {
                title: taskForm.title.trim(),
                description: taskForm.description.trim(),
                type: taskForm.type || "assignment",
                priority: taskForm.priority || "medium",
                course: courseStr,
                courses: coursesList,
                domain: isLevel2Aor2B ? (taskForm.domain || "").trim() : "",
                maxMarks: Math.min(5, Math.max(1, Number(taskForm.maxMarks) || 5)),
                timeDays: taskForm.timeDays ? String(taskForm.timeDays).trim() : null,
                dueDate: taskForm.dueDate || null,
                measurablePoints: taskForm.measurablePoints.trim(),
                levelId: selectedLevelId,
                subLevelId: selectedSubLevelId,
                sessionId: selectedSessionId || null,
                assignTo: assignTarget,
                studentIds: assignTarget === "specific" ? selectedStudentIds : [],
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
        <div className="w-full space-y-6 animate-in fade-in duration-150">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ── Left Column: Form Steps ── */}
                <div className="lg:col-span-8 space-y-6">
                        {/* ── Section 1: Academic Location & Scope ── */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-lg bg-orange-500 text-white text-xs font-black flex items-center justify-center shadow-2xs">
                                        1
                                    </span>
                                    <div>
                                        <h3 className="font-extrabold text-sm text-slate-900">
                                            Academic Target Scope
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            Select session, department, courses, level and sub-level for this task
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full border border-orange-200">
                                    Step 1
                                </span>
                            </div>

                            {/* Interactive Scope Path Preview */}
                            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs shadow-2xs">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                                    <MdAccountTree className="text-orange-500" size={14} />
                                    Target Path:
                                </span>
                                <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                                    selectedSessionName ? "bg-white text-orange-700 border border-orange-200/80 shadow-2xs" : "bg-slate-100 text-slate-400"
                                }`}>
                                    {selectedSessionName || "Session"}
                                </span>
                                <span className="text-slate-300 font-bold">›</span>
                                <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                                    selectedDeptName ? "bg-white text-orange-700 border border-orange-200/80 shadow-2xs" : "bg-slate-100 text-slate-400"
                                }`}>
                                    {selectedDeptName || "Department"}
                                </span>
                                <span className="text-slate-300 font-bold">›</span>
                                <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                                    selectedCourses.includes("All")
                                        ? "bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs"
                                        : "bg-purple-100 text-purple-800 border border-purple-300 shadow-2xs"
                                }`}>
                                    {selectedCourses.includes("All") ? "All Courses" : selectedCourses.join(", ")}
                                </span>
                                <span className="text-slate-300 font-bold">›</span>
                                <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                                    selectedSubDeptName ? "bg-white text-orange-700 border border-orange-200/80 shadow-2xs" : "bg-slate-100 text-slate-400"
                                }`}>
                                    {selectedSubDeptName || "Sub-Dept"}
                                </span>
                                <span className="text-slate-300 font-bold">›</span>
                                <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                                    selectedLevelName ? "bg-white text-orange-700 border border-orange-200/80 shadow-2xs" : "bg-slate-100 text-slate-400"
                                }`}>
                                    {selectedLevelName || "Level"}
                                </span>
                                <span className="text-slate-300 font-bold">›</span>
                                <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                                    selectedSubLevelName ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs" : "bg-slate-100 text-slate-400"
                                }`}>
                                    {selectedSubLevelName || "Sub-Level"}
                                </span>
                            </div>

                            {/* Row 1: Session & Department */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Academic Session</label>
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
                                        placeholder="Select Session"
                                        buttonClassName={selectBtnCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Department</label>
                                    <SelectDropdown
                                        value={selectedDepartmentId}
                                        onChange={handleDepartmentChange}
                                        options={[
                                            { value: "", label: "Select Department" },
                                            ...departments.map((d) => ({ value: d._id, label: d.name })),
                                        ]}
                                        placeholder="Select Department"
                                        buttonClassName={selectBtnCls}
                                    />
                                </div>
                            </div>

                            {/* Course Selection */}
                            <div>
                                <CourseMultiSelect
                                    department={departments.find((d) => d._id === selectedDepartmentId)}
                                    selectedCourses={selectedCourses}
                                    onChange={setSelectedCourses}
                                    label="Target Course(s)"
                                    hint="Select 'All Courses' to assign to everyone, or pick specific course(s) like BCA, BBA, B.Com, etc."
                                    size="sm"
                                />
                            </div>

                            {/* Row 2: Sub-Department, Level, Sub-Level */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelCls}>Sub-Department</label>
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
                                        placeholder="Select Sub-Department"
                                        buttonClassName={selectBtnCls}
                                    />
                                </div>
                                <div>
                                    <label className={`${labelCls} flex items-center justify-between`}>
                                        <span>Level <span className="text-red-500">*</span></span>
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
                                        buttonClassName={`${selectBtnCls} ${!selectedSubDepartmentId ? "opacity-60 cursor-not-allowed bg-slate-50" : ""}`}
                                    />
                                </div>
                                <div>
                                    <label className={`${labelCls} flex items-center justify-between`}>
                                        <span>Sub-Level <span className="text-red-500">*</span></span>
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
                                        buttonClassName={`${selectBtnCls} ${!selectedLevelId ? "opacity-60 cursor-not-allowed bg-slate-50" : ""}`}
                                    />
                                </div>
                            </div>

                            {/* Optional Domain for Level 2A / 2B */}
                            {isLevel2Aor2B && (
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex items-center justify-between">
                                        <label className={labelCls}>
                                            Domain <span className="text-slate-400 font-normal lowercase">(optional)</span>
                                        </label>
                                        <span className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full border border-blue-100">
                                            Level 2A / 2B Specialization
                                        </span>
                                    </div>
                                    <SelectDropdown
                                        value={taskForm.domain}
                                        onChange={(val) => setTaskForm((prev) => ({ ...prev, domain: val }))}
                                        options={[
                                            { value: "", label: "-- Select Domain (Optional) --" },
                                            ...departmentDomains.map((d) => ({ value: d, label: d }))
                                        ]}
                                        placeholder="-- Select Domain (Optional) --"
                                        buttonClassName={selectBtnCls}
                                    />
                                </div>
                            )}
                        </div>

                        {/* ── Section 2: Task Source & Alignment Mode ── */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-lg bg-orange-500 text-white text-xs font-black flex items-center justify-center shadow-2xs">
                                        2
                                    </span>
                                    <div>
                                        <h3 className="font-extrabold text-sm text-slate-900">
                                            Task Source & Alignment
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            Choose curriculum-aligned task with syllabus mapping or an ad-hoc general task
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full border border-orange-200">
                                    Step 2
                                </span>
                            </div>

                            {/* Interactive Mode Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div
                                    onClick={() => setTaskSource("general")}
                                    className={`relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 ${
                                        taskSource === "general"
                                            ? "border-blue-500 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/30 shadow-xs ring-2 ring-blue-500/20"
                                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                        taskSource === "general" ? "bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-xs shadow-blue-500/30" : "bg-slate-100 text-slate-500"
                                    }`}>
                                        <MdAssignment size={20} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                            <h4 className="font-extrabold text-sm text-slate-900">General Task</h4>
                                            {taskSource === "general" && (
                                                <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-2xs">
                                                    <MdCheck size={14} />
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1 leading-snug">
                                            Ad-hoc assignment, lab practice, or level-wide extracurricular activity
                                        </p>
                                    </div>
                                </div>

                                <div
                                    onClick={() => setTaskSource("syllabus")}
                                    className={`relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 ${
                                        taskSource === "syllabus"
                                            ? "border-orange-500 bg-gradient-to-br from-orange-50/70 via-white to-amber-50/30 shadow-xs ring-2 ring-orange-500/20"
                                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                        taskSource === "syllabus" ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-xs shadow-orange-500/30" : "bg-slate-100 text-slate-500"
                                    }`}>
                                        <MdMenuBook size={20} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                            <h4 className="font-extrabold text-sm text-slate-900">Syllabus Task</h4>
                                            {taskSource === "syllabus" && (
                                                <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-2xs">
                                                    <MdCheck size={14} />
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1 leading-snug">
                                            Strictly mapped to academic curriculum, subjects, and topics
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Mode Specific Inputs */}
                            {taskSource === "syllabus" ? (
                                <div className="bg-gradient-to-br from-orange-50/40 via-white to-amber-50/20 border border-orange-100 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs mt-3">
                                    <div className="flex items-center justify-between pb-2.5 border-b border-orange-100/80">
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
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelCls}>
                                                    Syllabus Version <span className="text-red-500">*</span>
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
                                                    placeholder="Select Version"
                                                    buttonClassName={selectBtnCls}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelCls}>
                                                    Subject <span className="text-red-500">*</span>
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
                                                    buttonClassName={`${selectBtnCls} ${!selectedVersionId || subjects.length === 0 ? "opacity-60 cursor-not-allowed bg-slate-50" : ""}`}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelCls}>
                                                    Topic <span className="text-red-500">*</span>
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
                                                    buttonClassName={`${selectBtnCls} ${!selectedSubjectId || topics.length === 0 ? "opacity-60 cursor-not-allowed bg-slate-50" : ""}`}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelCls}>
                                                    Sub-Topic <span className="text-slate-400 font-normal lowercase">(optional)</span>
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
                                                    buttonClassName={`${selectBtnCls} ${!selectedTopicId || subTopics.length === 0 ? "opacity-60 cursor-not-allowed bg-slate-50" : ""}`}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>
                                            Subject / Category <span className="text-slate-400 font-normal lowercase">(optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={taskForm.subjectName}
                                            onChange={(e) => setTaskForm({ ...taskForm, subjectName: e.target.value })}
                                            className={inputCls}
                                            placeholder="e.g. General / Data Structures / Soft Skills"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>
                                            Topic / Unit <span className="text-slate-400 font-normal lowercase">(optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={taskForm.topicName}
                                            onChange={(e) => setTaskForm({ ...taskForm, topicName: e.target.value })}
                                            className={inputCls}
                                            placeholder="e.g. Module 1: Sorting Algorithms"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Section 3: Task Details & Evaluation ── */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-lg bg-orange-500 text-white text-xs font-black flex items-center justify-center shadow-2xs">
                                        3
                                    </span>
                                    <div>
                                        <h3 className="font-extrabold text-sm text-slate-900">
                                            Task Details & Deliverables
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            Define task title, instructions, scoring criteria, and priority
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full border border-orange-200">
                                    Step 3
                                </span>
                            </div>

                            {/* Title */}
                            <div>
                                <label className={labelCls}>
                                    Task Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={taskForm.title}
                                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                                    className={inputCls}
                                    placeholder="e.g. Implement Stack operations using Arrays in C++"
                                    required
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className={labelCls}>
                                    Description & Instructions <span className="text-slate-400 font-normal lowercase">(optional)</span>
                                </label>
                                <textarea
                                    value={taskForm.description}
                                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                                    rows={3}
                                    className={inputCls}
                                    placeholder="Detail the problem statement, submission format, test scenarios, or guidelines for students..."
                                />
                            </div>

                            {/* Type, Priority, Max Marks, Duration */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                <div className="sm:col-span-3">
                                    <label className={labelCls}>Task Type</label>
                                    <SelectDropdown
                                        value={taskForm.type}
                                        onChange={(val) => setTaskForm({ ...taskForm, type: val })}
                                        options={TASK_TYPES}
                                        placeholder="Select Type"
                                        buttonClassName={selectBtnCls}
                                    />
                                </div>
                                <div className="sm:col-span-5">
                                    <label className={labelCls}>Priority</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {PRIORITIES.map((p) => {
                                            const active = taskForm.priority === p.value;
                                            return (
                                                <button
                                                    key={p.value}
                                                    type="button"
                                                    onClick={() => setTaskForm({ ...taskForm, priority: p.value })}
                                                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                                                        active
                                                            ? p.activeColor
                                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                                    }`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                                                    <span>{p.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelCls}>Max Marks (Max 5)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="5"
                                        value={taskForm.maxMarks}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === "") {
                                                setTaskForm({ ...taskForm, maxMarks: "" });
                                                return;
                                            }
                                            const num = Number(val);
                                            setTaskForm({ ...taskForm, maxMarks: Math.min(5, Math.max(1, num)) });
                                        }}
                                        className={inputCls}
                                        placeholder="5"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelCls}>Duration (Days)</label>
                                    <input
                                        type="text"
                                        value={taskForm.timeDays}
                                        onChange={(e) => setTaskForm({ ...taskForm, timeDays: e.target.value })}
                                        className={inputCls}
                                        placeholder="e.g. 7"
                                    />
                                </div>
                            </div>

                            {/* Due Date & Passing Criteria */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Due Date</label>
                                    <input
                                        type="date"
                                        value={taskForm.dueDate}
                                        onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>
                                        Evaluation / Passing Criteria <span className="text-slate-400 font-normal lowercase">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={taskForm.measurablePoints}
                                        onChange={(e) => setTaskForm({ ...taskForm, measurablePoints: e.target.value })}
                                        className={inputCls}
                                        placeholder="e.g. Score >= 80%, all test cases passed"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Right Column: Target Students & Summary Actions ── */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Target Student Assignment Card */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
                            <StudentAssignPicker
                                subLevelId={selectedSubLevelId}
                                selectedCourses={selectedCourses}
                                assignTarget={assignTarget}
                                onAssignTargetChange={setAssignTarget}
                                selectedStudentIds={selectedStudentIds}
                                onSelectedStudentIdsChange={setSelectedStudentIds}
                                label="Target Students"
                            />
                        </div>

                        {/* Summary & Submit Card (Sticky) */}
                        <div className="sticky top-20 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                    Task Summary
                                </h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    taskSource === "syllabus"
                                        ? "bg-amber-100 text-amber-800 border border-amber-200/60"
                                        : "bg-blue-100 text-blue-800 border border-blue-200/60"
                                }`}>
                                    {taskSource === "syllabus" ? "Syllabus Aligned" : "General Task"}
                                </span>
                            </div>

                            <div className="space-y-2.5 text-xs">
                                <div className="flex items-center justify-between text-slate-500">
                                    <span>Target Location:</span>
                                    <span className="font-bold text-slate-800 truncate max-w-[170px]" title={`${selectedDeptName || "Dept"} › ${selectedLevelName || "Level"} › ${selectedSubLevelName || "Sub-Level"}`}>
                                        {selectedDeptName || "Dept"} › {selectedSubLevelName || "Sub-Level"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-500">
                                    <span>Courses:</span>
                                    <span className="font-semibold text-slate-800 truncate max-w-[170px]" title={selectedCourses.join(", ")}>
                                        {selectedCourses.includes("All") ? "All Courses" : selectedCourses.join(", ")}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-500">
                                    <span>Priority & Type:</span>
                                    <span className="font-semibold text-slate-800 capitalize">
                                        {taskForm.priority} • {taskForm.type}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-500">
                                    <span>Evaluation:</span>
                                    <span className="font-semibold text-slate-800">
                                        {taskForm.maxMarks || 0} Marks {taskForm.timeDays ? `• ${taskForm.timeDays}d` : ""}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-500">
                                    <span>Target Students:</span>
                                    <span className={`font-bold ${assignTarget === "all" ? "text-slate-800" : "text-orange-600"}`}>
                                        {assignTarget === "all" ? "All Students" : `${selectedStudentIds.length} Selected`}
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2.5 pt-3 border-t border-slate-100">
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] disabled:opacity-50 text-white text-xs sm:text-sm font-bold py-2.5 sm:py-3 px-4 rounded-xl transition shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
                                >
                                    {isCreating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Creating Task...</span>
                                        </>
                                    ) : (
                                        <>
                                            <MdAdd size={18} />
                                            <span>Create Task</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-full py-2 sm:py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer text-center"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
        </div>
    );
};

export default AddTaskModal;
