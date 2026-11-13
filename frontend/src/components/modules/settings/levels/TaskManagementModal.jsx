/* eslint-disable react/prop-types */
import { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { confirmToast } from "../../../../utils/confirmToast";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdAssignment,
  MdBook,
  MdTopic,
  MdSearch,
  MdCalendarToday,
  MdCloudUpload,
  MdCheckCircle,
  MdChevronRight,
  MdCheck,
  MdClose,
  MdAccountTree,
  MdArrowBack
} from "react-icons/md";
import {
  useGetSyllabusVersionsBySubLevelQuery,
  useGetSyllabusVersionWithHierarchyQuery,
  useCreateTaskManualMutation,
  useGetTasksByLevelQuery,
  useUpdateTaskMasterMutation,
  useDeleteTaskMutation,
  useGetAllSessionsQuery
} from "../../../../redux/api/authApi";
import SelectDropdown from "../../../shared/form-fields/SelectDropdown";
import CourseMultiSelect from "../../../shared/form-fields/CourseMultiSelect";
import StudentAssignPicker from "../../../shared/form-fields/StudentAssignPicker";
import { TaskUploadDrawer } from "./SyllabusTab";
import { filterSessionsByDepartment, formatSessionLabel } from "../../../../utils/sessionDurationHelpers";
import { getDomainsForDepartment } from "../../../../utils/ftpConfig";
import { sortTasksAscending, sortByOrderAsc } from "../../../../utils/taskOrderHelpers";

const TASK_TYPES = [
  { value: "assessment", label: "Assessment" },
  { value: "project", label: "Project" },
  { value: "assignment", label: "Assignment" },
  { value: "practice", label: "Practice" },
  { value: "reading", label: "Reading" },
  { value: "writtenExam", label: "Written Exam" },
  { value: "interview", label: "Interview" },
  { value: "presentation", label: "Presentation" },
  { value: "learning", label: "Learning" },
  { value: "other", label: "Other" }
];

const PRIORITIES = [
  { value: "low", label: "Low", color: "emerald" },
  { value: "medium", label: "Medium", color: "amber" },
  { value: "high", label: "High", color: "rose" }
];

const selectBtnCls = "w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs sm:text-sm border border-gray-200/90 hover:border-orange-400 bg-white rounded-xl text-gray-800 font-medium transition-all shadow-2xs focus:outline-none cursor-pointer";
const inputCls = "w-full border border-gray-200/90 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder-gray-400 font-medium text-gray-800 shadow-2xs";
const labelCls = "block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5";

const TaskManagementModal = ({ isOpen, onClose, level, subLevel, departmentName, departmentId, subdepartment, onSuccess }) => {
  const [activeTab, setActiveTab] = useState("add"); // add, manage
  const [addMode, setAddMode] = useState("manual"); // manual, bulk
  const [taskType, setTaskType] = useState("syllabus"); // syllabus, general
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [selectedSubTopicId, setSelectedSubTopicId] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  const [manageSearch, setManageSearch] = useState("");

  const [taskForm, setTaskForm] = useState({
    title: "",
    domain: "",
    description: "",
    type: "assessment",
    priority: "medium",
    course: "All",
    maxMarks: 5,
    timeDays: "",
    measurablePoints: "",
    dueDate: ""
  });
  const [selectedCourses, setSelectedCourses] = useState(["All"]);
  const [assignTarget, setAssignTarget] = useState("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        resetForm();
        onClose?.();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  const { data: sessionsData } = useGetAllSessionsQuery(true);
  const rawSessions = sessionsData?.data || [];
  const deptIdentifier = departmentName || subdepartment?.departmentId?.name || (typeof level?.subDepartmentId === "object" ? level.subDepartmentId.departmentId?.name : "") || "";
  const sessions = useMemo(() => filterSessionsByDepartment(rawSessions, deptIdentifier), [rawSessions, deptIdentifier]);

  const isLevel2B = useMemo(() => {
    const sName = String(subLevel?.name || "").trim().toUpperCase();
    const lName = String(level?.name || "").trim().toUpperCase();
    return (
      sName === "2B" || sName.includes("2B") || lName === "2B" || lName.includes("2B") ||
      sName === "2A" || sName.includes("2A") || lName === "2A" || lName.includes("2A")
    );
  }, [level, subLevel]);

  const departmentDomains = useMemo(() => {
    return getDomainsForDepartment(deptIdentifier);
  }, [deptIdentifier]);

  useEffect(() => {
    if (selectedSessionId && sessions.length > 0) {
      const exists = sessions.some((s) => s._id === selectedSessionId);
      if (!exists) setSelectedSessionId("");
    }
  }, [selectedSessionId, sessions]);

  const { data: versionsData } = useGetSyllabusVersionsBySubLevelQuery(
    { subLevelId: subLevel?._id, sessionId: selectedSessionId },
    { skip: !subLevel?._id, refetchOnMountOrArgChange: true }
  );
  const rawVersions = versionsData?.data || [];
  const versions = useMemo(() => {
    if (!selectedSessionId) return rawVersions;
    return rawVersions.filter((v) => {
      const vSessionId = typeof v.sessionId === "object" ? v.sessionId?._id : v.sessionId;
      return String(vSessionId) === String(selectedSessionId);
    });
  }, [rawVersions, selectedSessionId]);

  const effectiveVersionId = useMemo(() => {
    if (!versions.length) return "";
    const found = versions.find(v => v._id === selectedVersionId);
    if (found) return found._id;
    const activeVersion = versions.find(v => v.status === "active") || versions[0];
    return activeVersion?._id || "";
  }, [versions, selectedVersionId]);

  const { data: versionDetail } = useGetSyllabusVersionWithHierarchyQuery(
    effectiveVersionId,
    { skip: !effectiveVersionId }
  );
  const subjects = useMemo(() => {
    if (!effectiveVersionId || !versionDetail?.data?.subjects) return [];
    if (String(versionDetail.data._id) !== String(effectiveVersionId)) return [];
    return sortByOrderAsc(versionDetail.data.subjects || []);
  }, [effectiveVersionId, versionDetail]);

  const topics = useMemo(() => {
    return sortByOrderAsc(subjects.find(s => s._id === selectedSubjectId)?.topics || []);
  }, [subjects, selectedSubjectId]);

  const subTopics = useMemo(() => {
    return sortByOrderAsc(topics.find(t => t._id === selectedTopicId)?.subTopics || []);
  }, [topics, selectedTopicId]);

  const { data: tasksData, refetch: refetchTasks } = useGetTasksByLevelQuery(
    {
      subLevelId: subLevel?._id,
      syllabusVersionId: effectiveVersionId,
      sessionId: selectedSessionId || undefined,
    },
    { skip: !subLevel?._id || (Boolean(selectedSessionId) && !effectiveVersionId) }
  );
  const allTasks = useMemo(() => {
    if (selectedSessionId && !effectiveVersionId) return [];
    const list = tasksData?.data || [];
    return sortTasksAscending(list);
  }, [selectedSessionId, effectiveVersionId, tasksData]);

  const [createTask, { isLoading: creating }] = useCreateTaskManualMutation();
  const [updateTask, { isLoading: updating }] = useUpdateTaskMasterMutation();
  const [deleteTask] = useDeleteTaskMutation();

  useEffect(() => {
    if (versions.length > 0) {
      if (!selectedVersionId || !versions.some(v => v._id === selectedVersionId)) {
        const activeVersion = versions.find(v => v.status === "active") || versions[0];
        setSelectedVersionId(activeVersion._id);
      }
    } else {
      setSelectedVersionId("");
    }
  }, [versions, selectedVersionId]);

  useEffect(() => {
    setSelectedSubjectId("");
    setSelectedTopicId("");
    setSelectedSubTopicId("");
  }, [effectiveVersionId]);

  const resetForm = () => {
    setTaskForm({
      title: "",
      domain: "",
      description: "",
      type: "assessment",
      priority: "medium",
      course: "All",
      maxMarks: 5,
      timeDays: "",
      measurablePoints: "",
      dueDate: ""
    });
    setSelectedSubjectId("");
    setSelectedTopicId("");
    setSelectedSubTopicId("");
    setSelectedCourses(["All"]);
    setAssignTarget("all");
    setSelectedStudentIds([]);
    setEditingTask(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    if (taskType === "syllabus" && (!selectedTopicId)) {
      toast.error("Please select a topic for syllabus-based task");
      return;
    }

    if (assignTarget === "specific" && selectedStudentIds.length === 0) {
      toast.error("Please select at least one student or choose 'All Students'");
      return;
    }

    try {
      const coursesList = selectedCourses && selectedCourses.length > 0 ? selectedCourses : ["All"];
      const courseStr = coursesList.includes("All") ? "All" : coursesList.join(", ");
      const payload = {
        ...taskForm,
        title: taskForm.title.trim(),
        domain: isLevel2B ? (taskForm.domain || "").trim() : "",
        course: courseStr,
        courses: coursesList,
        timeDays: taskForm.timeDays ? String(taskForm.timeDays).trim() : null,
        maxMarks: Math.min(5, Math.max(1, Number(taskForm.maxMarks) || 5)),
        assignTo: assignTarget,
        studentIds: assignTarget === "specific" ? selectedStudentIds : [],
      };

      if (taskType === "syllabus") {
        payload.syllabusVersionId = selectedVersionId;
        payload.subjectId = selectedSubjectId;
        payload.topicId = selectedTopicId;
        if (selectedSubTopicId) {
          payload.subTopicId = selectedSubTopicId;
        }
      } else {
        payload.levelId = level?._id;
        payload.subLevelId = subLevel?._id;
        payload.sessionId = selectedSessionId || null;
        payload.isGeneralTask = true;
      }

      if (editingTask) {
        await updateTask({ taskId: editingTask._id, ...payload }).unwrap();
        toast.success("Task updated successfully!");
      } else {
        await createTask(payload).unwrap();
        toast.success("Task created successfully!");
      }

      resetForm();
      refetchTasks();
      onSuccess?.();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to save task");
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    let taskCourses = ["All"];
    if (Array.isArray(task.courses) && task.courses.length > 0) {
      taskCourses = task.courses;
    } else if (task.course && task.course !== "All") {
      taskCourses = task.course.split(",").map((c) => c.trim()).filter(Boolean);
    }
    setSelectedCourses(taskCourses.length > 0 ? taskCourses : ["All"]);

    setTaskForm({
      title: task.title || "",
      domain: task.domain || "",
      description: task.description || "",
      type: task.type || "assessment",
      priority: task.priority || "medium",
      course: task.course || "All",
      maxMarks: task.maxMarks || 5,
      timeDays: task.timeDays || "",
      measurablePoints: task.measurablePoints || "",
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : ""
    });

    if (task.syllabusVersionId) {
      setTaskType("syllabus");
      setSelectedVersionId(task.syllabusVersionId);
      setSelectedSubjectId(task.subjectId || "");
      setSelectedTopicId(task.topicId || "");
      setSelectedSubTopicId(task.subTopicId || "");
    } else {
      setTaskType("general");
    }

    if (task.assignTo) {
      setAssignTarget(task.assignTo);
      setSelectedStudentIds(Array.isArray(task.specificStudentIds) ? task.specificStudentIds.map(String) : []);
    }

    setActiveTab("add");
    setAddMode("manual");
  };

  const handleDelete = async (taskId) => {
    if (!(await confirmToast("Are you sure you want to delete this task?", { confirmButtonClass: "bg-red-500 hover:bg-red-600 text-white" }))) return;

    try {
      await deleteTask(taskId).unwrap();
      toast.success("Task deleted successfully!");
      refetchTasks();
      onSuccess?.();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete task");
    }
  };

  const filteredTasks = useMemo(() => {
    if (!manageSearch.trim()) return allTasks;
    const q = manageSearch.toLowerCase();
    return allTasks.filter(t =>
      t.title?.toLowerCase().includes(q) ||
      t.subjectName?.toLowerCase().includes(q) ||
      t.topicName?.toLowerCase().includes(q) ||
      t.subTopicName?.toLowerCase().includes(q) ||
      t.type?.toLowerCase().includes(q)
    );
  }, [allTasks, manageSearch]);

  if (!isOpen) return null;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150">
      {/* ── Top Page Action Bar (Preserving App Layout, Sidebar & Navbar) ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Back button + Title & Badges */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => { resetForm(); onClose?.(); }}
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer shadow-2xs active:scale-[0.98]"
            title="Back to Tasks"
          >
            <MdArrowBack size={18} />
            <span>Back to Tasks</span>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {editingTask ? "Edit Task" : activeTab === "manage" ? "Manage Tasks" : "Task Management"}
              </h2>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200/60">
                {subLevel?.name ? `Sub-Level ${subLevel.name}` : (level?.name || "Level")}
              </span>
              {deptIdentifier && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {deptIdentifier}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {subLevel?.name ? `${level?.name || "Level"} · Sub-Level ${subLevel.name}` : (level?.name || "Tasks")} — Academic scope, syllabus mapping, evaluation parameters, and student assignments
            </p>
          </div>
        </div>

        {/* Right: Tab Switcher & Close button */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("add")}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "add"
                  ? "bg-white text-orange-600 shadow-2xs border border-orange-100 font-extrabold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <MdAdd size={15} />
              <span>{editingTask ? "Edit Task" : "Add Task"}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("manage")}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "manage"
                  ? "bg-white text-orange-600 shadow-2xs border border-orange-100 font-extrabold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <MdAssignment size={15} />
              <span>Manage Tasks</span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                activeTab === "manage" ? "bg-orange-100 text-orange-700" : "bg-slate-200 text-slate-600"
              }`}>
                {allTasks.length}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => { resetForm(); onClose?.(); }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close"
            title="Close"
          >
            <MdClose size={20} />
          </button>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="w-full">
        {activeTab === "add" ? (
          <div className="space-y-6">
            {/* Mode Switcher: Single Task Entry vs Bulk Excel Upload */}
            {!editingTask && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
                <div className="inline-flex bg-slate-100/90 border border-slate-200 p-1 rounded-xl gap-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setAddMode("manual")}
                    className={`py-2 px-4 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                      addMode === "manual"
                        ? "bg-white text-orange-600 shadow-2xs border border-orange-200/60 font-extrabold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                    }`}
                  >
                    <MdEdit size={15} className={addMode === "manual" ? "text-orange-500" : "text-slate-400"} />
                    <span>Single Task Entry</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMode("bulk")}
                    className={`py-2 px-4 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                      addMode === "bulk"
                        ? "bg-white text-orange-600 shadow-2xs border border-orange-200/60 font-extrabold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                    }`}
                  >
                    <MdCloudUpload size={15} className={addMode === "bulk" ? "text-orange-500" : "text-slate-400"} />
                    <span>Bulk Excel Upload</span>
                  </button>
                </div>

                <div className="text-xs text-slate-500">
                  {addMode === "manual" ? (
                    <span>Add individual task with detailed rubrics & targeted student assignments</span>
                  ) : (
                    <span>Upload multiple tasks at once via standardized Excel template</span>
                  )}
                </div>
              </div>
            )}

            {addMode === "manual" || editingTask ? (
              /* ── Form with 2-Column Responsive Layout ── */
              <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ── Left Column: Form Steps ── */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Step 1: Academic Scope & Target Course */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-orange-500 text-white text-xs font-black flex items-center justify-center shadow-2xs">
                          1
                        </span>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900">
                            Academic Scope & Target Course
                          </h3>
                          <p className="text-xs text-slate-500">
                            Target session aur target courses select karein jinko task assign karna hai
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full border border-orange-200">
                        Step 1
                      </span>
                    </div>

                    {/* Department, Level, Sublevel fixed path chips */}
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                        <MdAccountTree className="text-orange-500" size={14} />
                        Target Location:
                      </span>
                      <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-white text-orange-700 border border-orange-200/80 shadow-2xs">
                        {deptIdentifier || "Department"}
                      </span>
                      <span className="text-slate-300 font-bold">›</span>
                      <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-white text-orange-700 border border-orange-200/80 shadow-2xs">
                        Level {level?.name}
                      </span>
                      <span className="text-slate-300 font-bold">›</span>
                      <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                        Sub-Level {subLevel?.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* Session */}
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
                            { value: "", label: "All Sessions" },
                            ...sessions.map(s => ({ value: s._id, label: formatSessionLabel(s) }))
                          ]}
                          placeholder="All Sessions"
                          buttonClassName={selectBtnCls}
                        />
                      </div>

                      {/* Course Selection */}
                      <div>
                        <CourseMultiSelect
                          department={deptIdentifier}
                          selectedCourses={selectedCourses}
                          onChange={setSelectedCourses}
                          label="Target Course(s)"
                          hint="Assign to all courses or select specific course(s)."
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Task Source & Mapping */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-orange-500 text-white text-xs font-black flex items-center justify-center shadow-2xs">
                          2
                        </span>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900">
                            Task Source & Hierarchy Mapping
                          </h3>
                          <p className="text-xs text-slate-500">
                            Choose whether this task aligns to the academic syllabus or is a general sub-level task
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full border border-orange-200">
                        Step 2
                      </span>
                    </div>

                    {/* Mode Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Syllabus Task */}
                      <div
                        onClick={() => setTaskType("syllabus")}
                        className={`relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 ${
                          taskType === "syllabus"
                            ? "border-orange-500 bg-gradient-to-br from-orange-50/70 via-white to-amber-50/30 shadow-xs ring-2 ring-orange-500/20"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          taskType === "syllabus"
                            ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-xs shadow-orange-500/30"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          <MdBook size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-extrabold text-sm text-slate-900">Syllabus Task</p>
                            {taskType === "syllabus" && (
                              <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-2xs">
                                <MdCheck size={14} />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-snug">Mapped to Subject, Topic & SubTopic from curriculum</p>
                        </div>
                      </div>

                      {/* General Task */}
                      <div
                        onClick={() => setTaskType("general")}
                        className={`relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 ${
                          taskType === "general"
                            ? "border-blue-500 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/30 shadow-xs ring-2 ring-blue-500/20"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          taskType === "general"
                            ? "bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-xs shadow-blue-500/30"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          <MdAssignment size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-extrabold text-sm text-slate-900">General Task</p>
                            {taskType === "general" && (
                              <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-2xs">
                                <MdCheck size={14} />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-snug">Level-wide activity for all students in sublevel</p>
                        </div>
                      </div>
                    </div>

                    {/* Syllabus Hierarchy Selection */}
                    {taskType === "syllabus" && (
                      <div className="bg-gradient-to-br from-orange-50/40 via-white to-amber-50/20 border border-orange-100 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs mt-3">
                        <div className="flex items-center justify-between pb-2.5 border-b border-orange-100/80">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                              <MdBook size={15} />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Curriculum Hierarchy Mapping</h4>
                              <p className="text-[10px] text-slate-500">Select version, subject, and topic for this task</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100/70 text-orange-700 px-2.5 py-0.5 rounded-full border border-orange-200/50">
                            Required
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {/* Version */}
                          <div>
                            <label className={labelCls}>Syllabus Version <span className="text-red-500">*</span></label>
                            <SelectDropdown
                              value={selectedVersionId}
                              onChange={(val) => setSelectedVersionId(val)}
                              options={[
                                { value: "", label: "Select Version" },
                                ...versions.map(v => ({
                                  value: v._id,
                                  label: `${v.title || v.version} (${v.status})`
                                }))
                              ]}
                              placeholder="Select Version"
                              buttonClassName={selectBtnCls}
                            />
                          </div>

                          {/* Subject */}
                          <div>
                            <label className={labelCls}>Subject <span className="text-red-500">*</span></label>
                            <SelectDropdown
                              value={selectedSubjectId}
                              onChange={(val) => {
                                setSelectedSubjectId(val);
                                setSelectedTopicId("");
                                setSelectedSubTopicId("");
                              }}
                              options={[
                                { value: "", label: "-- Select Subject --" },
                                ...subjects.map(s => ({ value: s._id, label: s.name }))
                              ]}
                              disabled={!selectedVersionId}
                              placeholder={!selectedVersionId ? "Select Version First" : "-- Select Subject --"}
                              buttonClassName={selectBtnCls}
                            />
                          </div>

                          {/* Topic */}
                          <div>
                            <label className={labelCls}>Topic <span className="text-red-500">*</span></label>
                            <SelectDropdown
                              value={selectedTopicId}
                              onChange={(val) => {
                                setSelectedTopicId(val);
                                setSelectedSubTopicId("");
                              }}
                              options={[
                                { value: "", label: "-- Select Topic --" },
                                ...topics.map(t => ({ value: t._id, label: t.name }))
                              ]}
                              disabled={!selectedSubjectId}
                              placeholder={!selectedSubjectId ? "Select Subject First" : "-- Select Topic --"}
                              buttonClassName={selectBtnCls}
                            />
                          </div>
                        </div>

                        {/* SubTopic (Optional) */}
                        {selectedTopicId && subTopics.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className={labelCls}>SubTopic (Optional)</label>
                              <span className="text-[10px] text-slate-400">Leave blank for topic-level task</span>
                            </div>
                            <SelectDropdown
                              value={selectedSubTopicId}
                              onChange={(val) => setSelectedSubTopicId(val)}
                              options={[
                                { value: "", label: "No SubTopic (Topic Level Task)" },
                                ...subTopics.map(st => ({ value: st._id, label: st.name }))
                              ]}
                              placeholder="No SubTopic (Topic Level Task)"
                              buttonClassName={selectBtnCls}
                            />
                          </div>
                        )}

                        {/* Path Preview Breadcrumb */}
                        {selectedTopicId && (
                          <div className="p-3 bg-white border border-orange-100 rounded-xl flex items-center gap-2 text-xs flex-wrap shadow-2xs">
                            <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/60">
                              Target Path
                            </span>
                            <span className="font-bold text-slate-800">{subjects.find(s => s._id === selectedSubjectId)?.name}</span>
                            <MdChevronRight size={14} className="text-orange-400" />
                            <span className="font-bold text-slate-800">{topics.find(t => t._id === selectedTopicId)?.name}</span>
                            {selectedSubTopicId && (
                              <>
                                <MdChevronRight size={14} className="text-orange-400" />
                                <span className="font-semibold text-slate-600">{subTopics.find(st => st._id === selectedSubTopicId)?.name}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Step 3: Task Details & Evaluation */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-orange-500 text-white text-xs font-black flex items-center justify-center shadow-2xs">
                          3
                        </span>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900">Task Information & Evaluation</h3>
                          <p className="text-xs text-slate-500">Define title, priority, marks, duration, and measurable criteria</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full border border-orange-200">
                        Step 3
                      </span>
                    </div>

                    {/* Title */}
                    <div>
                      <label className={labelCls}>Task Title <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={taskForm.title}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                        className={inputCls}
                        placeholder="e.g. Build Counter Component with useState"
                        required
                      />
                    </div>

                    {/* Optional Domain for Level 2A / 2B */}
                    {isLevel2B && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className={labelCls}>
                            Domain <span className="text-slate-400 normal-case font-normal">(optional)</span>
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

                    {/* Description */}
                    <div>
                      <label className={labelCls}>Description <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
                      <textarea
                        value={taskForm.description}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                        className={inputCls}
                        rows={3}
                        placeholder="Detailed instructions or guidelines for students..."
                      />
                    </div>

                    {/* Type & Priority Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Task Type</label>
                        <SelectDropdown
                          value={taskForm.type}
                          onChange={(val) => setTaskForm(prev => ({ ...prev, type: val }))}
                          options={TASK_TYPES}
                          placeholder="Select Task Type"
                          buttonClassName={selectBtnCls}
                        />
                      </div>

                      <div>
                        <label className={labelCls}>Priority</label>
                        <div className="grid grid-cols-3 gap-2">
                          {PRIORITIES.map(priority => {
                            const active = taskForm.priority === priority.value;
                            const styles = {
                              low: active
                                ? "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20 font-black shadow-2xs"
                                : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/30",
                              medium: active
                                ? "bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-500/20 font-black shadow-2xs"
                                : "border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50/30",
                              high: active
                                ? "bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20 font-black shadow-2xs"
                                : "border-slate-200 text-slate-600 hover:border-rose-300 hover:bg-rose-50/30",
                            };
                            const dotColors = {
                              low: "bg-emerald-500",
                              medium: "bg-amber-500",
                              high: "bg-rose-500"
                            };
                            return (
                              <button
                                key={priority.value}
                                type="button"
                                onClick={() => setTaskForm(prev => ({ ...prev, priority: priority.value }))}
                                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider ${styles[priority.value]}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${dotColors[priority.value]}`} />
                                <span>{priority.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Metrics Row: Max Marks, Duration, Due Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={labelCls}>Max Marks (Max 5)</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={taskForm.maxMarks}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "") {
                                setTaskForm(prev => ({ ...prev, maxMarks: "" }));
                                return;
                              }
                              const num = Number(val);
                              setTaskForm(prev => ({ ...prev, maxMarks: Math.min(5, Math.max(1, num)) }));
                            }}
                            className={`${inputCls} pr-14`}
                            min="1"
                            max="5"
                            placeholder="5"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                            Marks
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className={labelCls}>Duration</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={taskForm.timeDays}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, timeDays: e.target.value }))}
                            className={`${inputCls} pr-12`}
                            placeholder="e.g. 3 or 3 days"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                            Days
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className={labelCls}>Due Date</label>
                        <input
                          type="date"
                          value={taskForm.dueDate}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    {/* Measurable Outcomes & Criteria */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={labelCls}>Measurable Outcomes & Criteria</label>
                        <span className="text-[10px] text-slate-400">1 per line or numbered</span>
                      </div>
                      <textarea
                        value={taskForm.measurablePoints}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, measurablePoints: e.target.value }))}
                        className={inputCls}
                        rows={3}
                        placeholder="1. Student can define state&#10;2. Student correctly handles onClick events"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Criteria by which the faculty or mentor assesses completion of this task.
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Right Column: Target Students & Summary Actions ── */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Target Student Assignment Card */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
                    <StudentAssignPicker
                      subLevelId={subLevel?._id}
                      selectedCourses={selectedCourses}
                      assignTarget={assignTarget}
                      onAssignTargetChange={setAssignTarget}
                      selectedStudentIds={selectedStudentIds}
                      onSelectedStudentIdsChange={setSelectedStudentIds}
                      label="Assign Task To"
                    />
                  </div>

                  {/* Summary & Submit Card (Sticky) */}
                  <div className="sticky top-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Task Summary
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        taskType === "syllabus"
                          ? "bg-orange-100 text-orange-700 border border-orange-200/60"
                          : "bg-blue-100 text-blue-700 border border-blue-200/60"
                      }`}>
                        {taskType === "syllabus" ? "Syllabus Aligned" : "General Task"}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Target:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[170px]" title={`${deptIdentifier} • Sub-Level ${subLevel?.name}`}>
                          {deptIdentifier} › {subLevel?.name}
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
                        <span>Students:</span>
                        <span className={`font-bold ${assignTarget === "all" ? "text-slate-800" : "text-orange-600"}`}>
                          {assignTarget === "all" ? "All Students" : `${selectedStudentIds.length} Selected`}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2.5 pt-3 border-t border-slate-100">
                      <button
                        type="submit"
                        disabled={creating || updating}
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] disabled:opacity-50 text-white text-xs sm:text-sm font-bold py-2.5 sm:py-3 px-4 rounded-xl transition shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
                      >
                        {creating || updating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Saving Task...</span>
                          </>
                        ) : editingTask ? (
                          <>
                            <MdCheckCircle size={18} />
                            <span>Update Task</span>
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
                        onClick={resetForm}
                        className="w-full py-2 sm:py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer text-center"
                      >
                        {editingTask ? "Cancel Edit" : "Reset Form"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              /* ── Bulk Upload Mode ── */
              <div className="w-full space-y-6">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-2xs">
                      <MdCloudUpload size={18} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">Select Syllabus Target for Bulk Upload</h3>
                      <p className="text-xs text-slate-500">Tasks will be imported and mapped to the selected academic curriculum</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Session</label>
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
                          { value: "", label: "All Sessions" },
                          ...sessions.map(s => ({ value: s._id, label: formatSessionLabel(s) }))
                        ]}
                        placeholder="All Sessions"
                        buttonClassName={selectBtnCls}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Syllabus Version <span className="text-red-500">*</span></label>
                      <SelectDropdown
                        value={selectedVersionId}
                        onChange={(val) => setSelectedVersionId(val)}
                        options={[
                          { value: "", label: "Select Version" },
                          ...versions.map(v => ({
                            value: v._id,
                            label: `${v.title || v.version} (${v.status})`
                          }))
                        ]}
                        placeholder="Select Version"
                        buttonClassName={selectBtnCls}
                      />
                    </div>
                  </div>
                </div>

                {selectedVersionId ? (
                  <TaskUploadDrawer
                    syllabusVersionId={selectedVersionId}
                    subjectName={subLevel?.name || ""}
                    version={versions.find(v => v._id === selectedVersionId)?.version || ""}
                    level={level}
                    subLevel={subLevel}
                    departmentName={deptIdentifier}
                    departmentId={departmentId}
                    subdepartment={subdepartment}
                    onSaved={() => {
                      refetchTasks();
                      onSuccess?.();
                    }}
                  />
                ) : (
                  <div className="p-5 bg-amber-50 border border-amber-200/90 rounded-2xl text-xs text-amber-800 font-medium flex items-center gap-3 shadow-2xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Please select an academic session and syllabus version above to unlock bulk Excel upload.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ── Manage Tasks Tab ── */
          <div className="space-y-6">
            {/* Top Toolbar: Search & Task Count */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <MdSearch size={18} />
                </span>
                <input
                  type="text"
                  value={manageSearch}
                  onChange={(e) => setManageSearch(e.target.value)}
                  placeholder="Search tasks by title, subject, topic, type..."
                  className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white placeholder-slate-400 shadow-2xs transition"
                />
                {manageSearch && (
                  <button
                    type="button"
                    onClick={() => setManageSearch("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <MdClose size={16} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>
                  Showing <strong className="text-slate-800">{filteredTasks.length}</strong> of <strong className="text-slate-800">{allTasks.length}</strong> tasks
                </span>
                <button
                  type="button"
                  onClick={() => { resetForm(); setActiveTab("add"); }}
                  className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition shadow-2xs hover:shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <MdAdd size={16} />
                  <span>New Task</span>
                </button>
              </div>
            </div>

            {/* Tasks List */}
            {filteredTasks.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 shadow-2xs">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                  <MdAssignment size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-800">No tasks found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {manageSearch ? "Try adjusting your search query" : "Create your first task using the Add Task tab above"}
                </p>
                {!manageSearch && (
                  <button
                    type="button"
                    onClick={() => { resetForm(); setActiveTab("add"); }}
                    className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                  >
                    + Add Task Now
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTasks.map((task, idx) => {
                  const pKey = (task.priority || "medium").toLowerCase();
                  const pColors = {
                    high: "bg-rose-50 text-rose-700 border-rose-200",
                    medium: "bg-amber-50 text-amber-700 border-amber-200",
                    low: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  };
                  const dotColors = {
                    high: "bg-rose-500",
                    medium: "bg-amber-500",
                    low: "bg-emerald-500"
                  };
                  return (
                    <div
                      key={task._id}
                      className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 hover:border-orange-300 hover:shadow-xs transition-all bg-white flex flex-col justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-black shrink-0 shadow-2xs">
                              #{idx + 1}
                            </span>
                            <h4
                              className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2 break-words"
                              title={task.title}
                            >
                              {task.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEdit(task)}
                              className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition cursor-pointer border border-transparent hover:border-orange-200"
                              title="Edit Task"
                            >
                              <MdEdit size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(task._id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer border border-transparent hover:border-red-200"
                              title="Delete Task"
                            >
                              <MdDelete size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${pColors[pKey] || pColors.medium}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColors[pKey] || dotColors.medium}`} />
                            <span>{pKey}</span>
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {task.type}
                          </span>
                          {task.assignTo === "specific" ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                              Targeted ({task.specificStudentIds?.length || 0} students)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              All Students
                            </span>
                          )}
                        </div>

                        {task.topicName && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-xl w-fit">
                            <MdTopic size={13} className="text-orange-500 shrink-0" />
                            <span className="font-semibold text-slate-700">{task.subjectName}</span>
                            <MdChevronRight size={13} className="text-slate-300 shrink-0" />
                            <span className="text-slate-600 font-medium">{task.topicName}</span>
                            {task.subTopicName && (
                              <>
                                <MdChevronRight size={13} className="text-slate-300 shrink-0" />
                                <span className="text-slate-400">{task.subTopicName}</span>
                              </>
                            )}
                          </div>
                        )}

                        {task.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex-wrap">
                        {task.maxMarks && <span>Max: <strong className="text-slate-700 font-bold">{task.maxMarks}</strong> marks</span>}
                        {task.timeDays && <span>Time: <strong className="text-slate-700 font-bold">{task.timeDays}</strong>d</span>}
                        {task.dueDate && (
                          <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                            <MdCalendarToday size={12} className="text-orange-500" />
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskManagementModal;
