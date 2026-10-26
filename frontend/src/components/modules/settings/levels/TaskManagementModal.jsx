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
  MdSubject,
  MdSearch,
  MdCalendarToday,
  MdAccessTime,
  MdCloudUpload,
  MdCheckCircle,
  MdChevronRight,
  MdFileDownload,
  MdCheck,
  MdClose,
  MdOutlineCategory,
  MdLayers
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
import OrangeButton from "../../../shared/sidebar/OrangeButton";
import SelectDropdown from "../../../shared/form-fields/SelectDropdown";
import { TaskUploadDrawer } from "./SyllabusTab";

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

const TaskManagementModal = ({ isOpen, onClose, level, subLevel, onSuccess }) => {
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
    description: "",
    type: "assessment",
    priority: "medium",
    maxMarks: 5,
    timeDays: "",
    measurablePoints: "",
    dueDate: ""
  });

  const { data: sessionsData } = useGetAllSessionsQuery(true);
  const sessions = sessionsData?.data || [];

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
    return versionDetail.data.subjects || [];
  }, [effectiveVersionId, versionDetail]);

  const topics = useMemo(() => {
    return subjects.find(s => s._id === selectedSubjectId)?.topics || [];
  }, [subjects, selectedSubjectId]);

  const subTopics = useMemo(() => {
    return topics.find(t => t._id === selectedTopicId)?.subTopics || [];
  }, [topics, selectedTopicId]);

  const { data: tasksData, refetch: refetchTasks } = useGetTasksByLevelQuery(
    { subLevelId: subLevel?._id, syllabusVersionId: effectiveVersionId },
    { skip: !subLevel?._id || (Boolean(selectedSessionId) && !effectiveVersionId) }
  );
  const allTasks = useMemo(() => {
    if (selectedSessionId && !effectiveVersionId) return [];
    return tasksData?.data || [];
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
      description: "",
      type: "assessment",
      priority: "medium",
      maxMarks: 5,
      timeDays: "",
      measurablePoints: "",
      dueDate: ""
    });
    setSelectedSubjectId("");
    setSelectedTopicId("");
    setSelectedSubTopicId("");
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

    try {
      const payload = {
        ...taskForm,
        title: taskForm.title.trim(),
        timeDays: taskForm.timeDays ? Number(taskForm.timeDays) : null,
        maxMarks: Number(taskForm.maxMarks) || 5
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
    setTaskForm({
      title: task.title || "",
      description: task.description || "",
      type: task.type || "assessment",
      priority: task.priority || "medium",
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
    setActiveTab("add");
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

  return (
    <OrangeButton
      isOpen={isOpen}
      onClose={() => { resetForm(); onClose?.(); }}
      panelTitle={editingTask ? "Edit Task" : activeTab === "manage" ? "Manage Tasks" : "Task Management"}
      panelSubtitle={subLevel?.name ? `${level?.name || "Level"} · Sub-Level ${subLevel.name}` : (level?.name || "Tasks")}
      showFooter={false}
      maxWidth="sm:max-w-2xl lg:max-w-3xl"
      drawerContent={
        <div className="space-y-5 pb-6">
          {/* Segmented Tab Switcher */}
          <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/70 flex gap-1.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("add")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "add"
                  ? "bg-white text-orange-600 shadow-xs border border-orange-100/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center ${activeTab === "add" ? "bg-orange-100 text-orange-600" : "bg-slate-200 text-slate-500"}`}>
                <MdAdd size={14} />
              </div>
              <span>{editingTask ? "Edit Task" : "Add Task"}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("manage")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "manage"
                  ? "bg-white text-orange-600 shadow-xs border border-orange-100/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center ${activeTab === "manage" ? "bg-orange-100 text-orange-600" : "bg-slate-200 text-slate-500"}`}>
                <MdAssignment size={14} />
              </div>
              <span>Manage Tasks</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${activeTab === "manage" ? "bg-orange-100 text-orange-700" : "bg-slate-200 text-slate-600"}`}>
                {allTasks.length}
              </span>
            </button>
          </div>

          {activeTab === "add" ? (
            <div className="space-y-5">
              {/* Add mode selector */}
              {!editingTask && (
                <div className="flex bg-slate-50 border border-slate-200/80 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setAddMode("manual")}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      addMode === "manual"
                        ? "bg-white text-orange-600 shadow-2xs border border-orange-200/60"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                    }`}
                  >
                    <MdEdit size={14} className={addMode === "manual" ? "text-orange-500" : "text-slate-400"} />
                    <span>Single Task Entry</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMode("bulk")}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      addMode === "bulk"
                        ? "bg-white text-orange-600 shadow-2xs border border-orange-200/60"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                    }`}
                  >
                    <MdCloudUpload size={14} className={addMode === "bulk" ? "text-orange-500" : "text-slate-400"} />
                    <span>Bulk Excel Upload</span>
                  </button>
                </div>
              )}

              {addMode === "manual" || editingTask ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Task Scope Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className={labelCls}>Task Scope & Category</label>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Choose mapping</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Syllabus Task */}
                      <div
                        onClick={() => setTaskType("syllabus")}
                        className={`relative p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 ${
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
                            <p className="font-extrabold text-xs sm:text-sm text-slate-900">Syllabus Task</p>
                            {taskType === "syllabus" && (
                              <span className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center">
                                <MdCheck size={12} />
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Mapped to Subject, Topic & SubTopic from curriculum</p>
                        </div>
                      </div>

                      {/* General Task */}
                      <div
                        onClick={() => setTaskType("general")}
                        className={`relative p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 ${
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
                            <p className="font-extrabold text-xs sm:text-sm text-slate-900">General Task</p>
                            {taskType === "general" && (
                              <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center">
                                <MdCheck size={12} />
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Level-wide activity for all students in sublevel</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Syllabus Hierarchy Selection */}
                  {taskType === "syllabus" && (
                    <div className="bg-gradient-to-br from-orange-50/40 via-white to-amber-50/20 border border-orange-100 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                      <div className="flex items-center justify-between pb-2.5 border-b border-orange-100/80">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                            <MdBook size={15} />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Curriculum Hierarchy</h4>
                            <p className="text-[10px] text-slate-400">Select where this task belongs in the syllabus</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100/70 text-orange-700 px-2.5 py-0.5 rounded-full border border-orange-200/50">
                          Required
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                              ...sessions.map(s => ({ value: s._id, label: s.name }))
                            ]}
                            placeholder="All Sessions"
                            buttonClassName={selectBtnCls}
                          />
                        </div>

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
                        {selectedVersionId && (
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
                              placeholder="-- Select Subject --"
                              buttonClassName={selectBtnCls}
                            />
                          </div>
                        )}

                        {/* Topic */}
                        {selectedSubjectId && (
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
                              placeholder="-- Select Topic --"
                              buttonClassName={selectBtnCls}
                            />
                          </div>
                        )}
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

                  {/* Task Details Card */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                          <MdEdit size={15} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Task Information</h4>
                          <p className="text-[10px] text-slate-400">Define title, type, priority, and completion criteria</p>
                        </div>
                      </div>
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

                    {/* Description */}
                    <div>
                      <label className={labelCls}>Description <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
                      <textarea
                        value={taskForm.description}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                        className={inputCls}
                        rows={2}
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className={labelCls}>Max Marks</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={taskForm.maxMarks}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, maxMarks: e.target.value }))}
                            className={`${inputCls} pr-14`}
                            min="1"
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
                            type="number"
                            value={taskForm.timeDays}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, timeDays: e.target.value }))}
                            className={`${inputCls} pr-12`}
                            min="1"
                            placeholder="e.g. 3"
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

                  {/* Actions footer */}
                  <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98] inline-flex items-center justify-center shrink-0"
                    >
                      <span>{editingTask ? "Cancel Edit" : "Reset Form"}</span>
                    </button>
                    <button
                      type="submit"
                      disabled={creating || updating}
                      className="w-full sm:flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] disabled:opacity-50 text-white text-xs sm:text-sm font-bold py-2 sm:py-2.5 px-4 sm:px-6 rounded-xl transition shadow-xs hover:shadow-md cursor-pointer inline-flex items-center justify-center gap-1.5 sm:gap-2 shrink-0"
                    >
                      {creating || updating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Saving Task...</span>
                        </>
                      ) : editingTask ? (
                        <>
                          <MdCheckCircle size={16} />
                          <span>Update Task</span>
                        </>
                      ) : (
                        <>
                          <MdAdd size={16} />
                          <span>Create Task</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* Bulk Upload Mode */
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-orange-50/40 via-white to-amber-50/20 border border-orange-100 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-orange-100/80">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                        <MdCloudUpload size={16} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Select Syllabus Target for Bulk Upload</h4>
                        <p className="text-[10px] text-slate-400">Tasks will be mapped to the selected academic curriculum</p>
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
                            ...sessions.map(s => ({ value: s._id, label: s.name }))
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
                      onSaved={() => {
                        refetchTasks();
                        onSuccess?.();
                      }}
                    />
                  ) : (
                    <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl text-xs text-amber-800 font-medium flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span>Please select an academic session and syllabus version above to unlock bulk Excel upload.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Manage Tasks Tab */
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <MdSearch size={18} />
                </span>
                <input
                  type="text"
                  value={manageSearch}
                  onChange={(e) => setManageSearch(e.target.value)}
                  placeholder="Search tasks..."
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

              {filteredTasks.length === 0 ? (
                <div className="text-center py-16 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <MdAssignment size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-700">No tasks found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {manageSearch ? "Try adjusting your search query" : "Create your first task using the Add Task tab"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {filteredTasks.map(task => {
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
                        className="border border-slate-200/90 rounded-2xl p-4 hover:border-orange-300 hover:shadow-xs transition-all bg-white flex flex-col sm:flex-row items-start justify-between gap-4 shadow-2xs"
                      >
                        <div className="flex-1 min-w-0 space-y-2 w-full">
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2 break-words min-w-0 flex-1"
                              title={task.title}
                            >
                              {task.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${pColors[pKey] || pColors.medium}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${dotColors[pKey] || dotColors.medium}`} />
                              <span>{pKey}</span>
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              {task.type}
                            </span>
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

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 flex-wrap">
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

                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEdit(task)}
                            className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition cursor-pointer border border-transparent hover:border-orange-200"
                            title="Edit Task"
                          >
                            <MdEdit size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(task._id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer border border-transparent hover:border-red-200"
                            title="Delete Task"
                          >
                            <MdDelete size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      }
    />
  );
};

export default TaskManagementModal;