const SubLevel = require("../../models/department/SubLevel");
const Level = require("../../models/department/Level");
const Student = require("../../models/student/Student");
const SyllabusVersion = require("../../models/syllabus/SyllabusVersion");
const mongoose = require("mongoose");

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Create SubLevel
exports.createSubLevel = async (req, res) => {
  try {
    const { levelId } = req.body;

    // Check if level exists and is active
    const level = await Level.findOne({ 
      _id: levelId, 
      isActive: true 
    });
    
    if (!level) {
      return res.status(404).json({
        success: false,
        message: "Level not found"
      });
    }

    const subLevel = await SubLevel.create(req.body);
    const populatedSubLevel = await SubLevel.findById(subLevel._id).populate('levelId');
    
    res.status(201).json({
      success: true,
      message: "SubLevel created successfully",
      data: populatedSubLevel
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "SubLevel with this order already exists for this level"
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get SubLevels by Level
exports.getSubLevelsByLevel = async (req, res) => {
  try {
    const { levelId } = req.params;
    
    const subLevels = await SubLevel.find({ 
      levelId, 
      isActive: true 
    }).populate('levelId').sort({ order: 1 });

    const data = [];
    for (const subLevel of subLevels) {
      const studentCount = await Student.countDocuments({ currentSubLevelId: subLevel._id, status: 'Active' });
      const syllabus = await SyllabusVersion.findOne({ subLevelId: subLevel._id, isActive: true }).sort({ versionNumber: -1 });
      const subjects = syllabus ? syllabus.subjects.map(s => s.name) : [];
      data.push({
        ...subLevel.toObject(),
        studentCount,
        subjects
      });
    }
    
    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get All SubLevels
exports.getAllSubLevels = async (req, res) => {
  try {
    const subLevels = await SubLevel.find({ isActive: true })
      .populate('levelId')
      .sort({ levelId: 1, order: 1 });
      
    res.status(200).json({
      success: true,
      data: subLevels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get SubLevel by ID
exports.getSubLevelById = async (req, res) => {
  try {
    const subLevel = await SubLevel.findOne({ 
      _id: req.params.id, 
      isActive: true 
    }).populate('levelId');
    
    if (!subLevel) {
      return res.status(404).json({
        success: false,
        message: "SubLevel not found"
      });
    }
    
    res.status(200).json({
      success: true,
      data: subLevel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update SubLevel
exports.updateSubLevel = async (req, res) => {
  try {
    // If levelId is being updated, validate it exists
    if (req.body.levelId) {
      const level = await Level.findOne({ 
        _id: req.body.levelId, 
        isActive: true 
      });
      
      if (!level) {
        return res.status(404).json({
          success: false,
          message: "Level not found"
        });
      }
    }

    const subLevel = await SubLevel.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      req.body,
      { new: true, runValidators: true }
    ).populate('levelId');
    
    if (!subLevel) {
      return res.status(404).json({
        success: false,
        message: "SubLevel not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "SubLevel updated successfully",
      data: subLevel
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "SubLevel with this order already exists for this level"
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete SubLevel (soft delete)
exports.deleteSubLevel = async (req, res) => {
  try {
    const subLevel = await SubLevel.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { isActive: false },
      { new: true }
    );
    
    if (!subLevel) {
      return res.status(404).json({
        success: false,
        message: "SubLevel not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "SubLevel deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};