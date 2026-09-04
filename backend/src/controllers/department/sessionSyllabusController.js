const SessionSyllabusMap = require("../../models/SessionSyllabusMap");
const Session = require("../../models/Session");
const SubLevel = require("../../models/department/SubLevel");
const SyllabusVersion = require("../../models/syllabus/SyllabusVersion");

// Create session-syllabus mapping
exports.createMapping = async (req, res) => {
  try {
    const { sessionId, subLevelId, syllabusVersionId, notes } = req.body;
    
    if (!sessionId || !subLevelId || !syllabusVersionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID, SubLevel ID, and Syllabus Version ID are required"
      });
    }

    // Verify entities exist
    const [session, subLevel, syllabusVersion] = await Promise.all([
      Session.findById(sessionId),
      SubLevel.findById(subLevelId),
      SyllabusVersion.findById(syllabusVersionId)
    ]);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    if (!subLevel) {
      return res.status(404).json({
        success: false,
        message: "SubLevel not found"
      });
    }

    if (!syllabusVersion) {
      return res.status(404).json({
        success: false,
        message: "Syllabus version not found"
      });
    }

    // Deactivate existing mapping for this session-sublevel
    await SessionSyllabusMap.updateMany(
      { sessionId, subLevelId, isActive: true },
      { isActive: false }
    );

    // Create new mapping
    const mapping = await SessionSyllabusMap.create({
      sessionId,
      subLevelId,
      syllabusVersionId,
      notes,
      assignedBy: req.user.id
    });

    const populatedMapping = await SessionSyllabusMap.findById(mapping._id)
      .populate('sessionId', 'name startDate endDate')
      .populate('subLevelId', 'name levelId')
      .populate('syllabusVersionId', 'name version status')
      .populate('assignedBy', 'name email');

    res.status(201).json({
      success: true,
      message: "Session-syllabus mapping created successfully",
      data: populatedMapping
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get all mappings
exports.getAllMappings = async (req, res) => {
  try {
    const { sessionId, subLevelId, active } = req.query;
    
    let filter = {};
    if (sessionId) filter.sessionId = sessionId;
    if (subLevelId) filter.subLevelId = subLevelId;
    if (active !== undefined) filter.isActive = active === 'true';

    const mappings = await SessionSyllabusMap.find(filter)
      .populate('sessionId', 'name startDate endDate status')
      .populate('subLevelId', 'name levelId')
      .populate('syllabusVersionId', 'name version status')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: mappings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get mapping by ID
exports.getMappingById = async (req, res) => {
  try {
    const mapping = await SessionSyllabusMap.findById(req.params.id)
      .populate('sessionId', 'name startDate endDate status')
      .populate('subLevelId', 'name levelId')
      .populate('syllabusVersionId', 'name version status subjects')
      .populate('assignedBy', 'name email');

    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: "Mapping not found"
      });
    }

    res.status(200).json({
      success: true,
      data: mapping
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update mapping
exports.updateMapping = async (req, res) => {
  try {
    const { syllabusVersionId, notes } = req.body;
    
    const updateData = {};
    if (syllabusVersionId) updateData.syllabusVersionId = syllabusVersionId;
    if (notes !== undefined) updateData.notes = notes;

    const mapping = await SessionSyllabusMap.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('sessionId', 'name startDate endDate')
      .populate('subLevelId', 'name levelId')
      .populate('syllabusVersionId', 'name version status')
      .populate('assignedBy', 'name email');

    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: "Mapping not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Mapping updated successfully",
      data: mapping
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Deactivate mapping
exports.deactivateMapping = async (req, res) => {
  try {
    const mapping = await SessionSyllabusMap.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: "Mapping not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Mapping deactivated successfully",
      data: mapping
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get active syllabus for session and sublevel
exports.getActiveSyllabus = async (req, res) => {
  try {
    const { sessionId, subLevelId } = req.params;

    const mapping = await SessionSyllabusMap.findOne({
      sessionId,
      subLevelId,
      isActive: true
    }).populate('syllabusVersionId');

    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: "No active syllabus mapping found for this session and level"
      });
    }

    res.status(200).json({
      success: true,
      data: mapping.syllabusVersionId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get curriculum overview for session
exports.getSessionCurriculumOverview = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const mappings = await SessionSyllabusMap.find({
      sessionId,
      isActive: true
    })
    .populate({
      path: 'subLevelId',
      populate: {
        path: 'levelId',
        populate: {
          path: 'subdepartmentId',
          populate: {
            path: 'departmentId'
          }
        }
      }
    })
    .populate('syllabusVersionId', 'name version status subjects')
    .sort({ 'subLevelId.name': 1 });

    // Group by department and subdepartment
    const overview = {};
    mappings.forEach(mapping => {
      const dept = mapping.subLevelId.levelId.subdepartmentId.departmentId;
      const subDept = mapping.subLevelId.levelId.subdepartmentId;
      const level = mapping.subLevelId.levelId;
      const subLevel = mapping.subLevelId;

      if (!overview[dept._id]) {
        overview[dept._id] = {
          department: dept,
          subdepartments: {}
        };
      }

      if (!overview[dept._id].subdepartments[subDept._id]) {
        overview[dept._id].subdepartments[subDept._id] = {
          subdepartment: subDept,
          levels: {}
        };
      }

      if (!overview[dept._id].subdepartments[subDept._id].levels[level._id]) {
        overview[dept._id].subdepartments[subDept._id].levels[level._id] = {
          level: level,
          sublevels: []
        };
      }

      overview[dept._id].subdepartments[subDept._id].levels[level._id].sublevels.push({
        sublevel: subLevel,
        syllabus: mapping.syllabusVersionId,
        mapping: mapping
      });
    });

    res.status(200).json({
      success: true,
      data: overview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};