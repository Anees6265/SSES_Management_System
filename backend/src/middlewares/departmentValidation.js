const mongoose = require("mongoose");

const parseField = (value) => {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
};

// Validation middleware for department operations
const validateDepartmentInput = (req, res, next) => {
  const name = req.body.name;
  const universityName = req.body.universityName;
  const allowedCourses = parseField(req.body.allowedCourses);

  if (allowedCourses) req.body.allowedCourses = allowedCourses;

  if (req.method === 'POST') {
    if (!name || !universityName) {
      return res.status(400).json({
        success: false,
        message: "Name and universityName are required"
      });
    }
  }

  if (allowedCourses && Array.isArray(allowedCourses)) {
    const validList = allowedCourses
      .filter(c => c && c.courseName && String(c.courseName).trim())
      .map(c => ({
        courseName: String(c.courseName).trim(),
        durationInYears: Math.max(1, Number(c.durationInYears) || 3)
      }));
    req.body.allowedCourses = validList;
  }

  next();
};

// Validation middleware for ObjectId parameters
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format"
    });
  }
  
  next();
};

module.exports = {
  validateDepartmentInput,
  validateObjectId
};