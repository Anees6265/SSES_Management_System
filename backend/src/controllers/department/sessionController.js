const Session = require("../../models/Session");

// Create Session
exports.createSession = async (req, res) => {
  try {
    // Validate required fields
    const { name, startDate, endDate } = req.body;
    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Name, start date, and end date are required"
      });
    }

    // Validate date format and logic
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format"
      });
    }
    
    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date"
      });
    }

    // Auto-determine status based on dates
    const now = new Date();
    let status = 'upcoming';
    if (now >= start && now <= end) {
      status = 'active';
    } else if (now > end) {
      status = 'completed';
    }

    const session = await Session.create({
      ...req.body,
      startDate: start,
      endDate: end,
      status
    });
    
    res.status(201).json({
      success: true,
      message: "Session created successfully",
      data: session
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Session with this name already exists"
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get All Sessions
exports.getAllSessions = async (req, res) => {
  try {
    const { all, status } = req.query;
    let filter = {};
    
    // If 'all' is true or not specified as false, include inactive/archived sessions
    if (all !== 'true' && all !== undefined) {
      filter.isActive = true;
    }
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    const sessions = await Session.find(filter)
      .sort({ createdAt: -1 });
      
    res.status(200).json({
      success: true,
      data: sessions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get Session by ID
exports.getSessionById = async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID format"
      });
    }

    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }
    
    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update Session
exports.updateSession = async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID format"
      });
    }

    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    // Validate dates if being updated
    if (req.body.startDate || req.body.endDate) {
      const startDate = req.body.startDate ? new Date(req.body.startDate) : session.startDate;
      const endDate = req.body.endDate ? new Date(req.body.endDate) : session.endDate;
      
      if (startDate >= endDate) {
        return res.status(400).json({
          success: false,
          message: "End date must be after start date"
        });
      }
    }

    const updatedSession = await Session.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: "Session updated successfully",
      data: updatedSession
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Session with this name already exists"
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete Session
exports.deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    // Validate ObjectId format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID format"
      });
    }

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    // Check for enrolled students
    const Student = require("../../models/student/Student");
    const studentCount = await Student.countDocuments({ sessionId: id });

    if (studentCount > 0 && force !== 'true') {
      return res.status(400).json({
        success: false,
        hasStudents: true,
        studentCount,
        message: `Cannot delete session '${session.name}' because ${studentCount} student(s) are currently enrolled in it. Please reassign the students or archive the session.`
      });
    }

    // If force delete with students, reassign students to another session
    if (studentCount > 0 && force === 'true') {
      const fallbackSession = await Session.findOne({ _id: { $ne: id }, isActive: true }) ||
                              await Session.findOne({ _id: { $ne: id } }).sort({ startDate: -1 });
      
      if (!fallbackSession) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete this session because there is no other session to reassign enrolled students to."
        });
      }

      await Student.updateMany(
        { sessionId: id },
        { $set: { sessionId: fallbackSession._id } }
      );
    }

    // If the session being deleted was active, activate another session if available
    if (session.isActive) {
      const nextActiveSession = await Session.findOne({ _id: { $ne: id } }).sort({ startDate: -1 });
      if (nextActiveSession) {
        nextActiveSession.isActive = true;
        if (nextActiveSession.status === 'upcoming') {
          nextActiveSession.status = 'active';
        }
        await nextActiveSession.save();
      }
    }

    // Clean up SessionSyllabusMap if exists
    try {
      const SessionSyllabusMap = require("../../models/SessionSyllabusMap");
      await SessionSyllabusMap.deleteMany({ sessionId: id });
    } catch (_) {}

    // Delete the session permanently
    await Session.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: `Session '${session.name}' deleted successfully.`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get Active Session
exports.getActiveSession = async (req, res) => {
  try {
    let activeSession = await Session.findOne({ isActive: true });
    
    // Fallback if no session has isActive: true
    if (!activeSession) {
      activeSession = await Session.findOne({ status: 'active' });
    }
    
    // Further fallback to newest session
    if (!activeSession) {
      activeSession = await Session.findOne({}).sort({ startDate: -1 });
    }
    
    if (!activeSession) {
      return res.status(404).json({
        success: false,
        message: "No active session found"
      });
    }
    
    res.status(200).json({
      success: true,
      data: activeSession
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update Session Status
exports.updateSessionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['upcoming', 'active', 'completed', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be: upcoming, active, completed, or archived"
      });
    }

    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    const now = new Date();

    if (status === 'active') {
      // Deactivate all other sessions and reset any other that had status 'active'
      const otherSessions = await Session.find({ _id: { $ne: req.params.id } });
      for (const other of otherSessions) {
        let changed = false;
        if (other.isActive) {
          other.isActive = false;
          changed = true;
        }
        if (other.status === 'active') {
          other.status = now > new Date(other.endDate) ? 'completed' : 'upcoming';
          changed = true;
        }
        if (changed) {
          await other.save();
        }
      }

      session.isActive = true;
      session.status = 'active';
    } else {
      session.status = status;
      if (status === 'archived' || status === 'completed') {
        session.isActive = false;
      }
    }

    await session.save();
    
    res.status(200).json({
      success: true,
      message: "Session status updated successfully",
      data: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};