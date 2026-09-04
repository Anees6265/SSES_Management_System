// studentService.js
// Promotion logic has been moved to promotionService.js to eliminate
// the circular dependency: taskAssignmentService ↔ studentService
//
// This file re-exports from promotionService so any existing code that
// imports from studentService continues to work without changes.

const { syncStudentReadiness, promoteToNextSubLevel } = require("./promotionService");

module.exports = { syncStudentReadiness, promoteToNextSubLevel };
