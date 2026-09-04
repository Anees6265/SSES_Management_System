import React, { useState } from 'react';
import { MdAdd, MdAssignment, MdBook } from 'react-icons/md';
import TaskManagementModal from './TaskManagementModal';

const TaskManagementDemo = () => {
  const [showModal, setShowModal] = useState(false);

  // Mock data for demo
  const mockLevel = { _id: '1', name: 'Level 1' };
  const mockSubLevel = { _id: '1A', name: 'Sub-Level 1A' };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Task Management System</h1>
              <p className="text-gray-600 mt-1">
                Manage tasks for {mockLevel.name} - {mockSubLevel.name}
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg transition"
            >
              <MdAdd size={20} />
              Add Task
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Syllabus-based Tasks */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <MdBook className="text-orange-500" size={20} />
                <h3 className="font-semibold text-gray-800">Syllabus Tasks</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Tasks linked to specific topics and subtopics from the syllabus
              </p>
              <div className="space-y-2">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="font-medium text-sm text-gray-800">JavaScript → Functions</div>
                  <div className="text-xs text-gray-600 mt-1">Build a calculator using functions</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="font-medium text-sm text-gray-800">React → Hooks → useState</div>
                  <div className="text-xs text-gray-600 mt-1">Create a counter component</div>
                </div>
              </div>
            </div>

            {/* General Tasks */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <MdAssignment className="text-blue-500" size={20} />
                <h3 className="font-semibold text-gray-800">General Tasks</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Tasks for all students in this level, not tied to specific topics
              </p>
              <div className="space-y-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="font-medium text-sm text-gray-800">Weekly Code Review</div>
                  <div className="text-xs text-gray-600 mt-1">Submit your best code for peer review</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="font-medium text-sm text-gray-800">Portfolio Update</div>
                  <div className="text-xs text-gray-600 mt-1">Update your GitHub portfolio</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <h4 className="font-semibold text-gray-800 mb-2">Features:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Create tasks linked to syllabus topics/subtopics</li>
              <li>• Create general tasks for all students in a level</li>
              <li>• Set priority, type, due dates, and measurable points</li>
              <li>• Edit and delete existing tasks</li>
              <li>• Automatic assignment to students</li>
            </ul>
          </div>
        </div>
      </div>

      <TaskManagementModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        level={mockLevel}
        subLevel={mockSubLevel}
        onSuccess={() => {
          setShowModal(false);
          // Refresh tasks
        }}
      />
    </div>
  );
};

export default TaskManagementDemo;