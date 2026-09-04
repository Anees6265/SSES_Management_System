/* eslint-disable react/prop-types */
import { useParams, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { HiArrowNarrowLeft } from "react-icons/hi";
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaChevronDown, FaChevronRight } from "react-icons/fa";
import * as XLSX from 'xlsx';
import { taskAPI, studentAPI } from '../../../services/taskService';

export default function TaskList() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const fileInputRef = useRef(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    subject: "",
    customSubject: "",
    priority: "2nd",
    dueDate: new Date().toISOString().split('T')[0]
  });

  // Fetch student tasks on component mount
  useEffect(() => {
    fetchStudentTasks();
    fetchStudentInfo();
  }, [id]);

  const fetchStudentTasks = async () => {
    try {
      const result = await taskAPI.getStudentTasks(id);
      console.log('API Response:', result); // Debug log
      
      // Handle both response formats for backward compatibility
      const tasksData = result.tasks || result;
      
      const formattedTasks = tasksData.map(st => ({
        id: st._id,
        title: st.taskId?.title || 'Untitled Task',
        description: st.taskId?.description || 'No description',
        subject: st.taskId?.subject || 'General',
        status: st.status,
        priority: st.taskId?.priority || 'medium',
        dueDate: st.taskId?.dueDate ? st.taskId.dueDate.split('T')[0] : new Date().toISOString().split('T')[0],
        taskId: st.taskId?._id,
        studentTaskId: st._id,
        notes: st.notes || '',
        assignedByName: st.assignedByName || '',
        assignedAt: st.assignedAt || st.createdAt
      }));
      
      // Sort tasks by assignedAt/createdAt descending (latest first)
      formattedTasks.sort((a, b) => new Date(b.assignedAt || b.createdAt || 0) - new Date(a.assignedAt || a.createdAt || 0));

      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentInfo = async () => {
    try {
      const student = await studentAPI.getStudentById(id);
      setStudentInfo(student);
    } catch (error) {
      console.error('Error fetching student info:', error);
    }
  };

  const handleAddTask = async () => {
    const finalSubject = newTask.subject === 'Other' ? newTask.customSubject : newTask.subject;
    
    if (newTask.title.trim() && newTask.description.trim() && finalSubject.trim()) {
      try {
        const taskData = {
          title: newTask.title,
          description: newTask.description,
          subject: finalSubject,
          priority: newTask.priority,
          dueDate: newTask.dueDate || new Date().toISOString().split('T')[0]
        };

        const result = await taskAPI.createIndividualTask(id, taskData);
        
        // Add the new task to the local state
        const formattedTask = {
          id: result.task._id,
          title: result.task.taskId.title,
          description: result.task.taskId.description,
          subject: result.task.taskId.subject,
          status: result.task.status,
          priority: result.task.taskId.priority,
          dueDate: result.task.taskId.dueDate.split('T')[0],
          taskId: result.task.taskId._id,
          studentTaskId: result.task._id,
          notes: result.task.notes || '',
          assignedByName: result.task.assignedByName || '',
          assignedAt: result.task.assignedAt || result.task.createdAt
        };

        setTasks([formattedTask, ...tasks]);
        setNewTask({ title: "", description: "", subject: "", customSubject: "", priority: "2nd", dueDate: new Date().toISOString().split('T')[0] });
        setAddModalOpen(false);
        
        alert('Task created successfully!');
      } catch (error) {
        console.error('Error creating task:', error);
        alert('Error creating task. Please try again.');
      }
    } else {
      alert('Please fill in title, description, and subject.');
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description,
      subject: task.subject || '',
      customSubject: '',
      priority: task.priority,
      dueDate: task.dueDate
    });
    setAddModalOpen(true);
  };

  const handleUpdateTask = () => {
    if (newTask.title.trim()) {
      setTasks(tasks.map(task => 
        task.id === editingTask.id 
          ? { ...task, ...newTask }
          : task
      ));
      setNewTask({ title: "", description: "", priority: "medium", dueDate: "" });
      setEditingTask(null);
      setAddModalOpen(false);
    }
  };

  const handleDeleteTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      await taskAPI.updateStudentTaskStatus(id, task.taskId, newStatus);
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, status: newStatus }
          : task
      ));
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Error updating task status');
    }
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, columnStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnStatus);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (draggedTask && draggedTask.status !== newStatus) {
      await handleStatusChange(draggedTask.id, newStatus);
    }
    setDraggedTask(null);
  };

  const handleBulkUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const newTasks = jsonData.map((row, index) => ({
          id: Date.now() + index,
          title: row.Title || row.title || `Task ${index + 1}`,
          description: row.Description || row.description || '',
          subject: row.Subject || row.subject || 'General',
          priority: (row.Priority || row.priority || '2nd').toLowerCase().trim(),
          dueDate: row.DueDate || row.dueDate || new Date().toISOString().split('T')[0],
          status: 'pending'
        }));

        setTasks([...tasks, ...newTasks]);
        setBulkUploadModalOpen(false);
        event.target.value = '';
      } catch (error) {
        alert('Error reading file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = (format) => {
    const templateData = [
      { Title: 'Sample Task 1', Description: 'This is a sample task description', Subject: 'JavaScript', Priority: '1st', DueDate: '2024-01-15' },
      { Title: 'Sample Task 2', Description: 'Another sample task', Subject: 'React', Priority: '2nd', DueDate: '2024-01-20' }
    ];

    if (format === 'excel') {
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
      XLSX.writeFile(wb, 'task_template.xlsx');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case '1st':
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case '2nd':
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '3rd':
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FDA92D] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  const pendingTasks = tasks.filter(task => task.status === 'pending');
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress');
  const completedTasks = tasks.filter(task => task.status === 'completed');

  return (
    <div className="min-h-screen bg-white p-4">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/student-profile/${id}`)}
              className="group flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 text-gray-700 hover:text-gray-900"
            >
              <HiArrowNarrowLeft className="text-lg group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">Back to Profile</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-black">Task List</h1>
              <p className="text-sm text-gray-600">
                {studentInfo ? 
                  `Manage tasks for ${studentInfo.firstName} ${studentInfo.lastName} (Level ${studentInfo.currentLevel})` : 
                  'Manage student tasks and assignments'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#FDA92D] hover:bg-[#E6941A] text-white rounded-lg font-medium transition-colors"
            >
              <FaPlus className="text-sm" />
              <span>Add Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
              <p className="text-2xl font-bold text-gray-800">{pendingTasks.length}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <FaTimes className="text-gray-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-800">{inProgressTasks.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FaEdit className="text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Completed</p>
              <p className="text-2xl font-bold text-green-800">{completedTasks.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FaCheck className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Task Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Tasks */}
        <TaskColumn
          title="Pending"
          tasks={pendingTasks}
          color="gray"
          status="pending"
          onStatusChange={handleStatusChange}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          getPriorityColor={getPriorityColor}
          getStatusColor={getStatusColor}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          dragOverColumn={dragOverColumn}
        />

        {/* In Progress Tasks */}
        <TaskColumn
          title="In Progress"
          tasks={inProgressTasks}
          color="blue"
          status="in-progress"
          onStatusChange={handleStatusChange}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          getPriorityColor={getPriorityColor}
          getStatusColor={getStatusColor}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          dragOverColumn={dragOverColumn}
        />

        {/* Completed Tasks */}
        <TaskColumn
          title="Completed"
          tasks={completedTasks}
          color="green"
          status="completed"
          onStatusChange={handleStatusChange}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          getPriorityColor={getPriorityColor}
          getStatusColor={getStatusColor}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          dragOverColumn={dragOverColumn}
        />
      </div>

      {/* Add/Edit Task Modal */}
      {isAddModalOpen && (
        <TaskModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setAddModalOpen(false);
            setEditingTask(null);
            setNewTask({ title: "", description: "", subject: "", customSubject: "", priority: "2nd", dueDate: new Date().toISOString().split('T')[0] });
          }}
          task={newTask}
          setTask={setNewTask}
          onSave={editingTask ? handleUpdateTask : handleAddTask}
          isEditing={!!editingTask}
        />
      )}
    </div>
  );
}

// Task Column Component
const TaskColumn = ({ title, tasks, color, status, onStatusChange, onEdit, onDelete, getPriorityColor, getStatusColor, onDragStart, onDragOver, onDragLeave, onDrop, dragOverColumn }) => {
  const [expandedSubjects, setExpandedSubjects] = useState({});

  const getColumnColor = (color) => {
    switch (color) {
      case 'blue': return 'border-blue-200 bg-blue-50';
      case 'green': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const isDragOver = dragOverColumn === status;

  // Group tasks by subject
  const tasksBySubject = tasks.reduce((acc, task) => {
    const subject = task.subject || 'General';
    if (!acc[subject]) {
      acc[subject] = [];
    }
    acc[subject].push(task);
    return acc;
  }, {});

  const toggleSubject = (subject) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subject]: !prev[subject]
    }));
  };

  return (
    <div 
      className={`rounded-xl border-2 p-4 transition-all duration-200 flex flex-col h-[calc(100vh-300px)] ${
        getColumnColor(color)
      } ${isDragOver ? 'border-dashed border-4 border-blue-400 bg-blue-100' : ''}`}
      onDragOver={(e) => onDragOver(e, status)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, status)}
    >
      <h3 className="font-semibold text-lg mb-4 text-gray-800 flex-shrink-0">{title} ({tasks.length})</h3>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {Object.keys(tasksBySubject).length > 0 ? (
          Object.entries(tasksBySubject).map(([subject, subjectTasks]) => {
            const isExpanded = expandedSubjects[subject] !== false; // Default to expanded
            return (
              <div key={subject} className="space-y-2">
                <button
                  onClick={() => toggleSubject(subject)}
                  className="flex items-center justify-between w-full p-2 bg-white rounded-md border hover:bg-gray-50 transition-colors flex-shrink-0"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <FaChevronDown className="text-xs text-gray-500" />
                    ) : (
                      <FaChevronRight className="text-xs text-gray-500" />
                    )}
                    <span className="font-medium text-sm text-gray-700">
                      {subject}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {subjectTasks.length}
                  </span>
                </button>
                {isExpanded && (
                  <div className="space-y-3 pl-4">
                    {subjectTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={onStatusChange}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        getPriorityColor={getPriorityColor}
                        getStatusColor={getStatusColor}
                        onDragStart={onDragStart}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No {title.toLowerCase()} tasks</p>
          </div>
        )}
      </div>
    </div>
  );
};

function formatTimeAgo(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (isNaN(seconds)) return "";
  if (seconds < 0) return "Just now";

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  };

  for (const [unit, value] of Object.entries(intervals)) {
    const count = Math.floor(seconds / value);
    if (count >= 1) {
      return `${count} ${unit}${count > 1 ? "s" : ""} ago`;
    }
  }
  return "Just now";
}

// Task Card Component
const TaskCard = ({ task, onStatusChange, onEdit, onDelete, getPriorityColor, getStatusColor, onDragStart }) => {
  return (
    <div 
      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-move"
      draggable
      onDragStart={(e) => onDragStart(e, task)}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-800 flex-1">{task.title}</h4>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{task.description}</p>
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            {task.subject}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          Due: {new Date(task.dueDate).toLocaleDateString()}
        </span>
      </div>

      {/* Given by & Time ago */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-3 pt-2 border-t border-gray-100">
        {task.assignedByName ? (
          <span className="truncate max-w-[60%]" title={task.assignedByName}>
            <span className="font-semibold text-gray-500">By: </span>
            {task.assignedByName}
          </span>
        ) : (
          <span className="font-semibold text-gray-500">Auto-assigned</span>
        )}
        {(task.assignedAt || task.createdAt) && (
          <span>{formatTimeAgo(task.assignedAt || task.createdAt)}</span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          className="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
        >
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
    </div>
  );
};

// Task Modal Component
const TaskModal = ({ isOpen, onClose, task, setTask, onSave, isEditing }) => {
  return (
    <OrangeButton
      isOpen={isOpen}
      onClose={onClose}
      panelTitle={isEditing ? 'Edit Task' : 'Add New Task'}
      panelSubtitle="Fill in details to manage task"
      leftBtnText="Cancel"
      rightBtnText={isEditing ? 'Update Task' : 'Add Task'}
      onLeftClick={onClose}
      onRightClick={onSave}
      drawerContent={
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={task.title}
              onChange={(e) => setTask({ ...task, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#FDA92D]"
              placeholder="Enter task title"
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Description *</label>
            <textarea
              value={task.description}
              onChange={(e) => setTask({ ...task, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#FDA92D]"
              rows="3"
              placeholder="Enter task description"
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Subject *</label>
            <select
              value={task.subject}
              onChange={(e) => setTask({ ...task, subject: e.target.value, customSubject: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#FDA92D]"
            >
              <option value="">Select Subject</option>
              <option value="HTML/CSS">HTML/CSS</option>
              <option value="Java">Java</option>
              <option value="JavaScript">JavaScript</option>
              <option value="React">React</option>
              <option value="Node.js">Node.js</option>
              <option value="Database">Database</option>
              <option value="Data Structures">Data Structures</option>
              <option value="System Design">System Design</option>
              <option value="Algorithms">Algorithms</option>
              <option value="Machine Learning">Machine Learning</option>
              <option value="Project Work">Project Work</option>
              <option value="Soft Skills">Soft Skills</option>
              <option value="Interview Prep">Interview Prep</option>
              <option value="Other">Other</option>
            </select>
            {task.subject === 'Other' && (
              <input
                type="text"
                value={task.customSubject || ''}
                onChange={(e) => setTask({ ...task, customSubject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#FDA92D] mt-2"
                placeholder="Enter custom subject"
              />
            )}
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
            <select
              value={task.priority}
              onChange={(e) => setTask({ ...task, priority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#FDA92D]"
            >
              <option value="1st">1st</option>
              <option value="2nd">2nd</option>
              <option value="3rd">3rd</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={task.dueDate}
              onChange={(e) => setTask({ ...task, dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#FDA92D]"
            />
          </div>
        </div>
      }
    />
  );
};

// Bulk Upload Modal Component
const BulkUploadModal = ({ isOpen, onClose, onUpload, onDownloadTemplate, fileInputRef }) => {
  return (
    <OrangeButton
      isOpen={isOpen}
      onClose={onClose}
      panelTitle="Bulk Upload Tasks"
      panelSubtitle="Upload tasks in bulk using Excel or CSV files"
      leftBtnText="Cancel"
      rightBtnText=""
      onLeftClick={onClose}
      drawerContent={
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p className="text-xs text-gray-500">Required columns: Title, Description, Subject, Priority (High/Medium/Low), DueDate (YYYY-MM-DD)</p>
          </div>
          
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-600 mb-3">Click to upload or drag and drop</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-[#FDA92D] hover:bg-[#E6941A] text-white rounded-lg text-sm font-medium"
            >
              Choose File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onUpload}
              className="hidden"
            />
          </div>
          
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Download Template:</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onDownloadTemplate('excel')}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
              >
                Excel Template
              </button>
            </div>
          </div>
        </div>
      }
    />
  );
};