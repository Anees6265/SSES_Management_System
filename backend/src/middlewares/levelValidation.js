const mongoose = require("mongoose");

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Validate Level input
const validateLevelInput = (req, res, next) => {
  const { name, order, subDepartmentId } = req.body;

  // Check required fields
  if (!name || !order || !subDepartmentId) {
    return res.status(400).json({
      success: false,
      message: "Name, order, and subDepartmentId are required"
    });
  }

  // Validate subDepartmentId format
  if (!isValidObjectId(subDepartmentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid subDepartmentId format"
    });
  }

  // Validate order is a number
  if (isNaN(order) || order < 1) {
    return res.status(400).json({
      success: false,
      message: "Order must be a positive number"
    });
  }

  next();
};

// Validate Level update input
const validateLevelUpdateInput = (req, res, next) => {
  const { subDepartmentId, order } = req.body;

  // If subDepartmentId is provided, validate it
  if (subDepartmentId && !isValidObjectId(subDepartmentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid subDepartmentId format"
    });
  }

  // If order is provided, validate it
  if (order !== undefined && (isNaN(order) || order < 1)) {
    return res.status(400).json({
      success: false,
      message: "Order must be a positive number"
    });
  }

  next();
};

// Validate ObjectId parameter
const validateObjectIdParam = (req, res, next) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid level ID format"
    });
  }

  next();
};

// Validate subDepartmentId parameter
const validateSubDepartmentIdParam = (req, res, next) => {
  const { subDepartmentId } = req.params;

  if (!isValidObjectId(subDepartmentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid subDepartment ID format"
    });
  }

  next();
};

module.exports = {
  validateLevelInput,
  validateLevelUpdateInput,
  validateObjectIdParam,
  validateSubDepartmentIdParam
};