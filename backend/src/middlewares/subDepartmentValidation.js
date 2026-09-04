const mongoose = require("mongoose");

// Validation middleware for subdepartment operations
const validateSubDepartmentInput = (req, res, next) => {
  const { name, departmentId } = req.body;

  // For POST requests, validate required fields
  if (req.method === 'POST') {
    if (!name || !departmentId) {
      return res.status(400).json({
        success: false,
        message: "Name and departmentId are required"
      });
    }
  }

  // Validate departmentId format if provided
  if (departmentId && !mongoose.Types.ObjectId.isValid(departmentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid departmentId format"
    });
  }

  next();
};

// Validation middleware for ObjectId parameters
const validateObjectId = (req, res, next) => {
  const { id, departmentId } = req.params;
  const paramId = id || departmentId;
  
  if (!mongoose.Types.ObjectId.isValid(paramId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format"
    });
  }
  
  next();
};

module.exports = {
  validateSubDepartmentInput,
  validateObjectId
};