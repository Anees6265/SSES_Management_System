// API service functions for task management
import CryptoJS from 'crypto-js';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Decrypt function for token
const decrypt = (encrypted) => {
  try {
    if (!encrypted || typeof encrypted !== "string") return null;
    const secretKey = "ITEG@123";
    const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || null;
  } catch (err) {
    console.error("Decryption failed:", err);
    return null;
  }
};

// Get authorization headers
const getAuthHeaders = () => {
  const encryptedToken = localStorage.getItem('token');
  const token = decrypt(encryptedToken);
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// Task API functions
export const taskAPI = {
  // Create a single task
  createTask: async (taskData) => {
    const response = await fetch(`${API_BASE_URL}/tasks/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(taskData)
    });
    return response.json();
  },

  // Bulk upload tasks for a level
  bulkUploadTasks: async (level, tasks) => {
    const response = await fetch(`${API_BASE_URL}/tasks/bulk-upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ level, tasks })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Bulk upload tasks to selected students
  bulkUploadTasksToSelectedStudents: async (level, tasks, studentIds) => {
    const response = await fetch(`${API_BASE_URL}/tasks/bulk-upload-selected`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ level, tasks, studentIds })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Get tasks by level
  getTasksByLevel: async (level) => {
    const response = await fetch(`${API_BASE_URL}/tasks/level/${level}`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Get tasks for a specific student
  getStudentTasks: async (studentId, status = null) => {
    const url = status 
      ? `${API_BASE_URL}/tasks/student/${studentId}?status=${status}`
      : `${API_BASE_URL}/tasks/student/${studentId}`;
    
    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  // Update student task status
  updateStudentTaskStatus: async (studentId, taskId, status, notes = '') => {
    const response = await fetch(`${API_BASE_URL}/tasks/student/${studentId}/task/${taskId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, notes })
    });
    return response.json();
  },

  // Get students by level with task statistics
  getStudentsByLevelWithTasks: async (level) => {
    const response = await fetch(`${API_BASE_URL}/tasks/level/${level}/students`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Update a task
  updateTask: async (taskId, taskData) => {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(taskData)
    });
    return response.json();
  },

  // Delete a task
  deleteTask: async (taskId) => {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Get student task performance
  getStudentTaskPerformance: async (studentId) => {
    const response = await fetch(`${API_BASE_URL}/tasks/student/${studentId}/performance`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  // Create individual task for a student
  createIndividualTask: async (studentId, taskData) => {
    const response = await fetch(`${API_BASE_URL}/tasks/student/${studentId}/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(taskData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
};

// Student API functions
export const studentAPI = {
  // Get student by ID
  getStudentById: async (studentId) => {
    const response = await fetch(`${API_BASE_URL}/admitted/students/${studentId}`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Get students by level
  getStudentsByLevel: async (level) => {
    const response = await fetch(`${API_BASE_URL}/admitted/students/level/${level}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
};