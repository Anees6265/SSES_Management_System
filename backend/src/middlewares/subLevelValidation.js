const mongoose = require("mongoose");

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Validate SubLevel input
const validateSubLevelInput = (req, res, next) => {
  const { name, order, levelId } = req.body;

  // Check required fields
  if (!name || !order || !levelId) {
    return res.status(400).json({
      success: false,
      message: "Name, order, and levelId are required"
    });
  }

  // Validate levelId format
  if (!isValidObjectId(levelId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid levelId format"
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

// Validate SubLevel update input
const validateSubLevelUpdateInput = (req, res, next) => {
  const { levelId, order } = req.body;

  // If levelId is provided, validate it
  if (levelId && !isValidObjectId(levelId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid levelId format"
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
      message: "Invalid sublevel ID format"
    });
  }

  next();
};

// Validate levelId parameter
const validateLevelIdParam = (req, res, next) => {
  const { levelId } = req.params;

  if (!isValidObjectId(levelId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid level ID format"
    });
  }

  next();
};

module.exports = {
  validateSubLevelInput,
  validateSubLevelUpdateInput,
  validateObjectIdParam,
  validateLevelIdParam
};