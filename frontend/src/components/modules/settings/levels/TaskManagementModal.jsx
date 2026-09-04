/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { MdAdd, MdEdit, MdDelete, MdAssignment, MdBook, MdTopic, MdSubject } from "react-icons/md";
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

const TASK_TYPES = ["assessment", "project", "assignment", "practice", "reading", "other"];
const PRIORITIES = ["low", "medium", "high"];

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
        payload.levelId = level._id;
        payload.subLevelId = subLevel._id;
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
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    try {
      await deleteTask(taskId).unwrap();
      toast.success("Task deleted successfully!");
      refetchTasks();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete task");
    }
  };

  return (
    <OrangeButton
      isOpen={isOpen}
      onClose={onClose}
      panelTitle="Task Management"
      panelSubtitle={`${level?.name || ""} - ${subLevel?.name || ""}`}
      showFooter={false}
      maxWidth="sm:max-w-xl"
      drawerContent={
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("add")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${activeTab === "add"
                  ? "border-orange-500 text-orange-600 bg-orange-50"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              <MdAdd size={16} className="inline mr-1" />
              {editingTask ? "Edit Task" : "Add Task"}
            </button>
            <button
              onClick={() => setActiveTab("manage")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${activeTab === "manage"
                  ? "border-orange-500 text-orange-600 bg-orange-50"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              <MdEdit size={16} className="inline mr-1" />
              Manage Tasks ({allTasks.length})
            </button>
          </div>

          {activeTab === "add" ? (
            <div className="space-y-4 pt-2">
              {/* Add mode selector */}
              {!editingTask && (
                <div className="flex gap-1 bg-[#F8F7F5] border border-gray-200 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAddMode("manual")}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${addMode === "manual" ? "bg-white text-orange-500 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    Single Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMode("bulk")}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${addMode === "bulk" ? "bg-white text-orange-500 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    Bulk Upload
                  </button>
                </div>
              )}

              {addMode === "manual" || editingTask ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Task Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Task Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setTaskType("syllabus")}
                        className={`p-3 border rounded-xl text-left transition ${taskType === "syllabus"
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-gray-200 hover:border-orange-300"
                          }`}
                      >
                        <MdBook size={18} className="mb-1" />
                        <div className="font-medium text-sm">Syllabus Task</div>
                        <div className="text-xs text-gray-500">Link to topic</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskType("general")}
                        className={`p-3 border rounded-xl text-left transition ${taskType === "general"
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 hover:border-blue-300"
                          }`}
                      >
                        <MdAssignment size={18} className="mb-1" />
                        <div className="font-medium text-sm">General Task</div>
                        <div className="text-xs text-gray-500">For all students</div>
                      </button>
                    </div>
                  </div>

                  {/* Syllabus Selection */}
                  {taskType === "syllabus" && (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <h3 className="font-medium text-sm text-gray-800">Select Syllabus Topic</h3>

                      {/* Session */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Session</label>
                        <select
                          value={selectedSessionId}
                          onChange={(e) => setSelectedSessionId(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                        >
                          <option value="">All Sessions</option>
                          {sessions.map(s => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Version */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Syllabus Version</label>
                        <select
                          value={selectedVersionId}
                          onChange={(e) => setSelectedVersionId(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
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
                          <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                          <select
                            value={selectedSubjectId}
                            onChange={(e) => {
                              setSelectedSubjectId(e.target.value);
                              setSelectedTopicId("");
                              setSelectedSubTopicId("");
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                          >
                            <option value="">Select Subject</option>
                            {subjects.map(s => (
                              <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Topic */}
                      {selectedSubjectId && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Topic *</label>
                          <select
                            value={selectedTopicId}
                            onChange={(e) => {
                              setSelectedTopicId(e.target.value);
                              setSelectedSubTopicId("");
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                            required
                          >
                            <option value="">Select Topic</option>
                            {topics.map(t => (
                              <option key={t._id} value={t._id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* SubTopic */}
                      {selectedTopicId && subTopics.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">SubTopic (Optional)</label>
                          <select
                            value={selectedSubTopicId}
                            onChange={(e) => setSelectedSubTopicId(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                          >
                            <option value="">No SubTopic (Topic Level Task)</option>
                            {subTopics.map(st => (
                              <option key={st._id} value={st._id}>{st.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Summary Path Info */}
                      {selectedTopicId && (
                        <div className="mt-3 p-3 bg-white border border-gray-150 rounded-xl">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Selected Path</p>
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <MdBook size={14} className="text-orange-500" />
                            <span>{subjects.find(s => s._id === selectedSubjectId)?.name}</span>
                            <span className="text-gray-400">›</span>
                            <MdTopic size={14} className="text-blue-500" />
                            <span>{topics.find(t => t._id === selectedTopicId)?.name}</span>
                            {selectedSubTopicId && (
                              <>
                                <span className="text-gray-400">›</span>
                                <MdSubject size={14} className="text-green-500" />
                                <span>{subTopics.find(st => st._id === selectedSubTopicId)?.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Task Details */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-gray-800">Task Information</h3>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Task Title *
                      </label>
                      <input
                        type="text"
                        value={taskForm.title}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                        placeholder="Enter task title"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={taskForm.description}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                        rows={3}
                        placeholder="Task description (optional)"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                        <select
                          value={taskForm.type}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, type: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                        >
                          {TASK_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                        <select
                          value={taskForm.priority}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                        >
                          {PRIORITIES.map(priority => (
                            <option key={priority} value={priority}>{priority}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Max Marks</label>
                        <input
                          type="number"
                          value={taskForm.maxMarks}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, maxMarks: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Time (Days)</label>
                        <input
                          type="number"
                          value={taskForm.timeDays}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, timeDays: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                          min="1"
                          placeholder="Optional"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Due Date (Optional)</label>
                      <input
                        type="date"
                        value={taskForm.dueDate}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Measurable Points</label>
                      <textarea
                        value={taskForm.measurablePoints}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, measurablePoints: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                        rows={2}
                        placeholder="Measurable outcomes..."
                      />
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      disabled={creating || updating}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition"
                    >
                      {creating || updating ? "Saving..." : editingTask ? "Update Task" : "Create Task"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <h3 className="font-medium text-sm text-gray-800">Select Syllabus Version</h3>

                    {/* Session */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Session</label>
                      <select
                        value={selectedSessionId}
                        onChange={(e) => setSelectedSessionId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                      >
                        <option value="">All Sessions</option>
                        {sessions.map(s => (
                          <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Version */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Syllabus Version</label>
                      <select
                        value={selectedVersionId}
                        onChange={(e) => setSelectedVersionId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
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
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Please select a session and syllabus version above to upload tasks in bulk.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Manage Tasks Tab */
            <div className="pt-2">
              <div className="mb-4">
                <p className="text-xs text-gray-500">
                  {allTasks.length} task(s) found for this level
                </p>
              </div>

              {allTasks.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <MdAssignment size={40} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-medium text-gray-600">No tasks found</p>
                  <p className="text-xs text-gray-400 mt-1">Create tasks using the Add Task tab</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allTasks.map(task => (
                    <div key={task._id} className="border border-gray-200 rounded-xl p-4 hover:border-orange-200 transition bg-white shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm text-gray-800">{task.title}</h4>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${task.priority === "high" ? "bg-red-100 text-red-700" :
                                task.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                                  "bg-green-100 text-green-700"
                              }`}>
                              {task.priority}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              {task.type}
                            </span>
                          </div>

                          {task.topicName && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
                              <MdTopic size={13} className="text-orange-500" />
                              <span>{task.subjectName} › {task.topicName}</span>
                              {task.subTopicName && <span>› {task.subTopicName}</span>}
                            </div>
                          )}

                          {task.description && (
                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                          )}

                          <div className="flex items-center gap-3 text-[11px] text-gray-500">
                            {task.maxMarks && <span>Max: {task.maxMarks} marks</span>}
                            {task.timeDays && <span>Time: {task.timeDays}d</span>}
                            {task.dueDate && (
                              <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handleEdit(task)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Task"
                          >
                            <MdEdit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(task._id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete Task"
                          >
                            <MdDelete size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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