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

    const session = await Session.findOne({ 
      _id: req.params.id, 
      isActive: true 
    });
    
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

    // Validate dates if being updated
    if (req.body.startDate || req.body.endDate) {
      const session = await Session.findById(req.params.id);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found"
        });
      }
      
      const startDate = req.body.startDate ? new Date(req.body.startDate) : session.startDate;
      const endDate = req.body.endDate ? new Date(req.body.endDate) : session.endDate;
      
      if (startDate >= endDate) {
        return res.status(400).json({
          success: false,
          message: "End date must be after start date"
        });
      }
    }

    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Session updated successfully",
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

// Delete Session (soft delete)
exports.deleteSession = async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID format"
      });
    }

    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { isActive: false },
      { new: true }
    );
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Session deleted successfully"
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
    const activeSession = await Session.findOne({ 
      isActive: true,
      status: { $in: ['active', 'upcoming'] }
    }).sort({ createdAt: -1 });
    
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

    const session = await Session.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }
    
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