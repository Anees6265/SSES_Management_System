const Level = require("../../models/department/Level");
const SubDepartment = require("../../models/department/SubDepartment");
const mongoose = require("mongoose");

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Create Level
exports.createLevel = async (req, res) => {
  try {
    const { subDepartmentId } = req.body;

    // Check if subDepartment exists and is active
    const subDepartment = await SubDepartment.findOne({ 
      _id: subDepartmentId, 
      isActive: true 
    });
    
    
    if (!subDepartment) {
      return res.status(404).json({
        success: false,
        message: "SubDepartment not found"
      });
    }

    const level = await Level.create(req.body);
    const populatedLevel = await Level.findById(level._id)
      .populate('subDepartmentId');
    
    res.status(201).json({
      success: true,
      message: "Level created successfully",
      data: populatedLevel
    });
  } catch (error) {
    // Handle duplicate key error (unique index violation)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Level with this order already exists for this subdepartment"
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get Levels by SubDepartment
exports.getLevelsBySubDepartment = async (req, res) => {
  try {
    const { subDepartmentId } = req.params;
    
    const levels = await Level.find({ subDepartmentId })
      .populate('subDepartmentId')
      .sort({ order: 1 });
    
    res.status(200).json({
      success: true,
      data: levels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get All Levels
exports.getAllLevels = async (req, res) => {
  try {
    const levels = await Level.find({})
      .populate('subDepartmentId')
      .sort({ subDepartmentId: 1, order: 1 });
      
    res.status(200).json({
      success: true,
      data: levels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get Level by ID
exports.getLevelById = async (req, res) => {
  try {
    const level = await Level.findOne({ 
      _id: req.params.id, 
      isActive: true 
    })
      .populate('subDepartmentId');
      
    if (!level) {
      return res.status(404).json({
        success: false,
        message: "Level not found"
      });
    }
    
    res.status(200).json({
      success: true,
      data: level
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update Level
exports.updateLevel = async (req, res) => {
  try {
    // If subDepartmentId is being updated, validate it exists
    if (req.body.subDepartmentId) {
      const subDepartment = await SubDepartment.findOne({ 
        _id: req.body.subDepartmentId, 
        isActive: true 
      });
      
      if (!subDepartment) {
        return res.status(404).json({
          success: false,
          message: "SubDepartment not found"
        });
      }
    }

    const level = await Level.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    ).populate('subDepartmentId');
    
    if (!level) {
      return res.status(404).json({
        success: false,
        message: "Level not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Level updated successfully",
      data: level
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Level with this order already exists for this subdepartment"
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete Level (soft delete)
exports.deleteLevel = async (req, res) => {
  try {
    const level = await Level.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { isActive: false },
      { new: true }
    );
    
    if (!level) {
      return res.status(404).json({
        success: false,
        message: "Level not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Level deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};