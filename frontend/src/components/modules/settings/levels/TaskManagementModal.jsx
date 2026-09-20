/* eslint-disable react/prop-types */
import { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { confirmToast } from "../../../../utils/confirmToast";
import {
  MdAdd, MdEdit, MdDelete, MdAssignment, MdBook, MdTopic, MdSubject,
  MdSearch, MdCalendarToday, MdAccessTime, MdCloudUpload,
  MdCheckCircle, MdChevronRight, MdFileDownload
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
import { TaskUploadDrawer } from "./SyllabusTab";

const TASK_TYPES = ["assessment", "project", "assignment", "practice", "reading", "writtenExam", "interview", "presentation", "learning", "other"];
const PRIORITIES = ["low", "medium", "high"];

const selectCls = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-800 disabled:bg-gray-50 disabled:text-gray-400 cursor-pointer";
const inputCls = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder-gray-400 font-medium text-gray-800";
const labelCls = "block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5";

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
    { skip: !subLevel?._id }
  );
  const versions = versionsData?.data || [];

  const { data: versionDetail } = useGetSyllabusVersionWithHierarchyQuery(
    selectedVersionId,
    { skip: !selectedVersionId }
  );
  const subjects = versionDetail?.data?.subjects || [];
  const topics = subjects.find(s => s._id === selectedSubjectId)?.topics || [];
  const subTopics = topics.find(t => t._id === selectedTopicId)?.subTopics || [];

  const { data: tasksData, refetch: refetchTasks } = useGetTasksByLevelQuery(
    { subLevelId: subLevel?._id, syllabusVersionId: selectedVersionId },
    { skip: !subLevel?._id }
  );
  const allTasks = tasksData?.data || [];

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
  }, [selectedVersionId]);

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
      panelTitle={editingTask ? "Edit Task" : "Task Management"}
      panelSubtitle={subLevel?.name ? `${level?.name || "Level"} · ${subLevel.name}` : (level?.name || "Tasks")}
      showFooter={false}
      maxWidth="sm:max-w-2xl lg:max-w-3xl"
      drawerContent={
        <div className="space-y-5 pb-6">
          {/* Top Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab("add")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "add"
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <MdAdd size={16} />
              <span>{editingTask ? "Edit Task" : "Add Task"}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("manage")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "manage"
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <MdAssignment size={16} />
              <span>Manage Tasks ({allTasks.length})</span>
            </button>
          </div>

          {activeTab === "add" ? (
            <div className="space-y-5">
              {/* Add mode selector */}
              {!editingTask && (
                <div className="flex bg-slate-100/70 p-1 rounded-xl border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setAddMode("manual")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      addMode === "manual"
                        ? "bg-white text-orange-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <MdEdit size={14} /> Single Task Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMode("bulk")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      addMode === "bulk"
                        ? "bg-white text-orange-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <MdCloudUpload size={14} /> Bulk Excel Upload
                  </button>
                </div>
              )}

              {addMode === "manual" || editingTask ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Task Scope Selection */}
                  <div className="space-y-2">
                    <label className={labelCls}>Task Scope & Category</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setTaskType("syllabus")}
                        className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-start gap-3.5 ${
                          taskType === "syllabus"
                            ? "border-orange-500 bg-orange-50/50 shadow-sm ring-2 ring-orange-500/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className={`p-2 rounded-xl flex-shrink-0 ${taskType === "syllabus" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                          <MdBook size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">Syllabus Task</p>
                          <p className="text-xs text-slate-500 mt-0.5">Link to subject, topic & lesson</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskType("general")}
                        className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-start gap-3.5 ${
                          taskType === "general"
                            ? "border-blue-500 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className={`p-2 rounded-xl flex-shrink-0 ${taskType === "general" ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                          <MdAssignment size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">General Task</p>
                          <p className="text-xs text-slate-500 mt-0.5">Activity for all students in sublevel</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Syllabus Hierarchy Selection */}
                  {taskType === "syllabus" && (
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                        <MdBook size={16} className="text-orange-500" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Curriculum Hierarchy</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Session */}
                        <div>
                          <label className={labelCls}>Academic Session</label>
                          <select
                            value={selectedSessionId}
                            onChange={(e) => setSelectedSessionId(e.target.value)}
                            className={selectCls}
                          >
                            <option value="">All Sessions</option>
                            {sessions.map(s => (
                              <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Version */}
                        <div>
                          <label className={labelCls}>Syllabus Version *</label>
                          <select
                            value={selectedVersionId}
                            onChange={(e) => setSelectedVersionId(e.target.value)}
                            className={selectCls}
                            required
                          >
                            <option value="">Select Version</option>
                            {versions.map(v => (
                              <option key={v._id} value={v._id}>
                                {v.title || v.version} ({v.status})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Subject */}
                        {selectedVersionId && (
                          <div>
                            <label className={labelCls}>Subject *</label>
                            <select
                              value={selectedSubjectId}
                              onChange={(e) => {
                                setSelectedSubjectId(e.target.value);
                                setSelectedTopicId("");
                                setSelectedSubTopicId("");
                              }}
                              className={selectCls}
                              required
                            >
                              <option value="">-- Select Subject --</option>
                              {subjects.map(s => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Topic */}
                        {selectedSubjectId && (
                          <div>
                            <label className={labelCls}>Topic *</label>
                            <select
                              value={selectedTopicId}
                              onChange={(e) => {
                                setSelectedTopicId(e.target.value);
                                setSelectedSubTopicId("");
                              }}
                              className={selectCls}
                              required
                            >
                              <option value="">-- Select Topic --</option>
                              {topics.map(t => (
                                <option key={t._id} value={t._id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* SubTopic */}
                      {selectedTopicId && subTopics.length > 0 && (
                        <div>
                          <label className={labelCls}>SubTopic (Optional)</label>
                          <select
                            value={selectedSubTopicId}
                            onChange={(e) => setSelectedSubTopicId(e.target.value)}
                            className={selectCls}
                          >
                            <option value="">No SubTopic (Topic Level Task)</option>
                            {subTopics.map(st => (
                              <option key={st._id} value={st._id}>{st.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Path Preview */}
                      {selectedTopicId && (
                        <div className="p-3 bg-white border border-orange-100 rounded-xl flex items-center gap-2 text-xs flex-wrap">
                          <span className="text-[10px] font-black uppercase tracking-wider text-orange-500">Path:</span>
                          <span className="font-bold text-slate-800">{subjects.find(s => s._id === selectedSubjectId)?.name}</span>
                          <MdChevronRight size={14} className="text-slate-300" />
                          <span className="font-bold text-slate-800">{topics.find(t => t._id === selectedTopicId)?.name}</span>
                          {selectedSubTopicId && (
                            <>
                              <MdChevronRight size={14} className="text-slate-300" />
                              <span className="font-semibold text-slate-600">{subTopics.find(st => st._id === selectedSubTopicId)?.name}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Task Details Card */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <MdEdit size={16} className="text-orange-500" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Task Information</h4>
                    </div>

                    {/* Title */}
                    <div>
                      <label className={labelCls}>Task Title *</label>
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
                      <label className={labelCls}>Description (Optional)</label>
                      <textarea
                        value={taskForm.description}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                        className={inputCls}
                        rows={3}
                        placeholder="Detailed instructions or guidelines for this task..."
                      />
                    </div>

                    {/* Type & Priority */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Task Type</label>
                        <select
                          value={taskForm.type}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, type: e.target.value }))}
                          className={selectCls}
                        >
                          {TASK_TYPES.map(type => (
                            <option key={type} value={type}>{type.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelCls}>Priority</label>
                        <div className="flex gap-2">
                          {PRIORITIES.map(priority => {
                            const active = taskForm.priority === priority;
                            const colors = {
                              high: active ? "bg-rose-50 border-rose-500 text-rose-700 ring-1 ring-rose-500" : "hover:border-rose-300 text-slate-600",
                              medium: active ? "bg-amber-50 border-amber-500 text-amber-700 ring-1 ring-amber-500" : "hover:border-amber-300 text-slate-600",
                              low: active ? "bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500" : "hover:border-emerald-300 text-slate-600",
                            };
                            return (
                              <button
                                key={priority}
                                type="button"
                                onClick={() => setTaskForm(prev => ({ ...prev, priority }))}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all uppercase tracking-wider cursor-pointer ${colors[priority]}`}
                              >
                                {priority}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={labelCls}>Max Marks</label>
                        <input
                          type="number"
                          value={taskForm.maxMarks}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, maxMarks: e.target.value }))}
                          className={inputCls}
                          min="1"
                        />
                      </div>

                      <div>
                        <label className={labelCls}>Duration (Days)</label>
                        <input
                          type="number"
                          value={taskForm.timeDays}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, timeDays: e.target.value }))}
                          className={inputCls}
                          min="1"
                          placeholder="e.g. 3"
                        />
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

                    {/* Measurable Points */}
                    <div>
                      <label className={labelCls}>Measurable Outcomes & Criteria</label>
                      <textarea
                        value={taskForm.measurablePoints}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, measurablePoints: e.target.value }))}
                        className={inputCls}
                        rows={3}
                        placeholder="1. Student can define state&#10;2. Student correctly handles onClick events"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Separate points with new lines or numbers (1., 2., etc.)</p>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-5 py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                    >
                      {editingTask ? "Cancel Edit" : "Reset Form"}
                    </button>
                    <button
                      type="submit"
                      disabled={creating || updating}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] disabled:opacity-50 text-white text-xs font-bold py-3 px-6 rounded-xl transition shadow-md shadow-orange-500/20 cursor-pointer flex items-center justify-center gap-2"
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
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                      <MdCloudUpload size={16} className="text-orange-500" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Select Syllabus Target for Bulk Upload</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Session</label>
                        <select
                          value={selectedSessionId}
                          onChange={(e) => setSelectedSessionId(e.target.value)}
                          className={selectCls}
                        >
                          <option value="">All Sessions</option>
                          {sessions.map(s => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelCls}>Syllabus Version *</label>
                        <select
                          value={selectedVersionId}
                          onChange={(e) => setSelectedVersionId(e.target.value)}
                          className={selectCls}
                        >
                          <option value="">Select Version</option>
                          {versions.map(v => (
                            <option key={v._id} value={v._id}>
                              {v.title || v.version} ({v.status})
                            </option>
                          ))}
                        </select>
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
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-700 font-medium">
                      Please select an academic session and syllabus version above to unlock bulk Excel upload.
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
                  placeholder="Search tasks by title, subject, topic..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                />
              </div>

              {filteredTasks.length === 0 ? (
                <div className="text-center py-16 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                  <MdAssignment size={36} className="mx-auto text-slate-300 mb-2" />
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
                    return (
                      <div
                        key={task._id}
                        className="border border-slate-200/80 rounded-2xl p-4 hover:border-orange-200 hover:shadow-sm transition-all bg-white flex flex-col sm:flex-row items-start justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0 space-y-2 w-full">
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              className="font-extrabold text-sm text-slate-800 leading-snug line-clamp-2 break-words min-w-0 flex-1"
                              title={task.title}
                            >
                              {task.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${pColors[pKey] || pColors.medium}`}>
                              {pKey}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              {task.type}
                            </span>
                          </div>

                          {task.topicName && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
                              <MdTopic size={13} className="text-orange-500" />
                              <span className="font-semibold text-slate-700">{task.subjectName}</span>
                              <MdChevronRight size={13} className="text-slate-300" />
                              <span className="text-slate-600">{task.topicName}</span>
                              {task.subTopicName && (
                                <>
                                  <MdChevronRight size={13} className="text-slate-300" />
                                  <span className="text-slate-400">{task.subTopicName}</span>
                                </>
                              )}
                            </div>
                          )}

                          {task.description && (
                            <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>
                          )}

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 flex-wrap">
                            {task.maxMarks && <span>Max: <strong className="text-slate-600">{task.maxMarks}</strong> marks</span>}
                            {task.timeDays && <span>Time: <strong className="text-slate-600">{task.timeDays}</strong>d</span>}
                            {task.dueDate && (
                              <span className="inline-flex items-center gap-1 text-gray-500">
                                <MdCalendarToday size={11} />
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleEdit(task)}
                            className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition cursor-pointer"
                            title="Edit Task"
                          >
                            <MdEdit size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(task._id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
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