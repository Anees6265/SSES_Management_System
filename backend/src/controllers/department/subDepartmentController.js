const SubDepartment = require("../../models/department/SubDepartment");
const Department = require("../../models/department/Department");
const Student = require("../../models/student/Student");
const Level = require("../../models/department/Level");
const SubLevel = require("../../models/department/SubLevel");
const User = require("../../models/user/user");
const mongoose = require("mongoose");
const { invalidateDeptCache } = require("../../middlewares/departmentFilter");

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Create SubDepartment
exports.createSubDepartment = async (req, res) => {
  try {
    // Validate required fields
    const { name, departmentId } = req.body;
    if (!name || !departmentId) {
      return res.status(400).json({
        success: false,
        message: "Name and departmentId are required"
      });
    }

    // Validate departmentId format
    if (!isValidObjectId(departmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid departmentId format"
      });
    }

    // Check if department exists and is active
    const department = await Department.findOne({ 
      _id: departmentId, 
      isActive: true 
    });
    
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    const subDepartment = await SubDepartment.create(req.body);
    const populatedSubDept = await SubDepartment.findById(subDepartment._id).populate('departmentId');
    invalidateDeptCache(req.body.departmentId);
    res.status(201).json({
      success: true,
      message: "SubDepartment created successfully",
      data: populatedSubDept
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "SubDepartment with this name already exists in this department"
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get SubDepartments by Department
exports.getSubDepartmentsByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    // Validate ObjectId format
    if (!isValidObjectId(departmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID format"
      });
    }
    
    if (!["superadmin", "admin"].includes(req.user?.role)) {
      let userDepartmentId = req.user?.departmentId?.toString();

      if (!userDepartmentId && req.user?.department) {
        const department = await Department.findOne({ name: req.user.department, isActive: true }).select("_id");
        userDepartmentId = department?._id?.toString();
      }

      if (!userDepartmentId) {
        return res.status(403).json({
          success: false,
          message: "Department not assigned to your account."
        });
      }

      if (userDepartmentId !== departmentId) {
        return res.status(403).json({
          success: false,
          message: "Access denied for this department"
        });
      }
    }

    const subDepartments = await SubDepartment.find({
      departmentId
    }).populate('departmentId');

    const subDepartmentsWithCounts = await Promise.all(
      subDepartments.map(async (subDepartment) => {
        const totalStudents = await Student.countDocuments({ subDepartmentId: subDepartment._id });
        
        // Fetch levels for this sub-department
        const levels = await Level.find({ subDepartmentId: subDepartment._id, isActive: true }).sort({ order: 1 });
        const levelCounts = await Promise.all(
          levels.map(async (lvl) => {
            const count = await Student.countDocuments({
              subDepartmentId: subDepartment._id,
              currentLevelId: lvl._id
            });
            return {
              levelId: lvl._id,
              levelName: lvl.name,
              order: lvl.order,
              studentCount: count
            };
          })
        );

        // Fetch sublevels for these levels
        const subLevels = await SubLevel.find({
          levelId: { $in: levels.map(l => l._id) },
          isActive: true
        }).sort({ order: 1 });

        const subLevelCounts = await Promise.all(
          subLevels.map(async (slvl) => {
            const count = await Student.countDocuments({
              subDepartmentId: subDepartment._id,
              currentSubLevelId: slvl._id
            });
            return {
              subLevelId: slvl._id,
              subLevelName: slvl.name,
              order: slvl.order,
              studentCount: count
            };
          })
        );

        // Fetch faculties of the parent department
        const deptId = subDepartment.departmentId?._id || subDepartment.departmentId;
        const faculties = await User.find({
          departmentId: deptId,
          role: { $in: ["faculty", "hod"] },
          isActive: true
        }).select("name profileImage position email mobileNo");

        return { 
          ...subDepartment.toObject(), 
          totalStudents,
          faculties,
          levelCounts,
          subLevelCounts
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: subDepartmentsWithCounts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get All SubDepartments
exports.getAllSubDepartments = async (req, res) => {
  try {
    const filter = {};

    if (!["superadmin", "admin"].includes(req.user?.role)) {
      let departmentId = req.user?.departmentId || null;

      if (!departmentId && req.user?.department) {
        const department = await Department.findOne({ name: req.user.department, isActive: true }).select("_id");
        departmentId = department?._id || null;
      }

      if (!departmentId) {
        return res.status(403).json({
          success: false,
          message: "Department not assigned to your account."
        });
      }

      filter.departmentId = departmentId;
    }

    const subDepartments = await SubDepartment.find(filter).populate('departmentId');
    const subDepartmentsWithCounts = await Promise.all(
      subDepartments.map(async (subDepartment) => {
        const totalStudents = await Student.countDocuments({ subDepartmentId: subDepartment._id });

        // Fetch levels for this sub-department
        const levels = await Level.find({ subDepartmentId: subDepartment._id, isActive: true }).sort({ order: 1 });
        const levelCounts = await Promise.all(
          levels.map(async (lvl) => {
            const count = await Student.countDocuments({
              subDepartmentId: subDepartment._id,
              currentLevelId: lvl._id
            });
            return {
              levelId: lvl._id,
              levelName: lvl.name,
              order: lvl.order,
              studentCount: count
            };
          })
        );

        // Fetch sublevels for these levels
        const subLevels = await SubLevel.find({
          levelId: { $in: levels.map(l => l._id) },
          isActive: true
        }).sort({ order: 1 });

        const subLevelCounts = await Promise.all(
          subLevels.map(async (slvl) => {
            const count = await Student.countDocuments({
              subDepartmentId: subDepartment._id,
              currentSubLevelId: slvl._id
            });
            return {
              subLevelId: slvl._id,
              subLevelName: slvl.name,
              order: slvl.order,
              studentCount: count
            };
          })
        );

        // Fetch faculties of the parent department
        const deptId = subDepartment.departmentId?._id || subDepartment.departmentId;
        const faculties = await User.find({
          departmentId: deptId,
          role: { $in: ["faculty", "hod"] },
          isActive: true
        }).select("name profileImage position email mobileNo");

        return { 
          ...subDepartment.toObject(), 
          totalStudents,
          faculties,
          levelCounts,
          subLevelCounts
        };
      })
    );

    res.status(200).json({
      success: true,
      data: subDepartmentsWithCounts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get SubDepartment by ID
exports.getSubDepartmentById = async (req, res) => {
  try {
    // Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subdepartment ID format"
      });
    }

    const subDepartment = await SubDepartment.findById(req.params.id).populate('departmentId');
    
    if (!subDepartment) {
      return res.status(404).json({
        success: false,
        message: "SubDepartment not found"
      });
    }

    // Restrict non-admin users (faculty, hod) to their own department's subdepartments
    if (!["superadmin", "admin"].includes(req.user?.role)) {
      let departmentId = req.user?.departmentId || null;
      if (!departmentId && req.user?.department) {
        const department = await Department.findOne({ name: req.user.department, isActive: true }).select("_id");
        departmentId = department?._id || null;
      }
      const subDeptDeptId = subDepartment.departmentId._id ? subDepartment.departmentId._id.toString() : subDepartment.departmentId.toString();
      if (!departmentId || subDeptDeptId !== departmentId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied for this department"
        });
      }
    }
    
    const totalStudents = await Student.countDocuments({ subDepartmentId: subDepartment._id });

    // Fetch levels for this sub-department
    const levels = await Level.find({ subDepartmentId: subDepartment._id, isActive: true }).sort({ order: 1 });
    const levelCounts = await Promise.all(
      levels.map(async (lvl) => {
        const count = await Student.countDocuments({
          subDepartmentId: subDepartment._id,
          currentLevelId: lvl._id
        });
        return {
          levelId: lvl._id,
          levelName: lvl.name,
          order: lvl.order,
          studentCount: count
        };
      })
    );

    // Fetch sublevels for these levels
    const subLevels = await SubLevel.find({
      levelId: { $in: levels.map(l => l._id) },
      isActive: true
    }).sort({ order: 1 });

    const subLevelCounts = await Promise.all(
      subLevels.map(async (slvl) => {
        const count = await Student.countDocuments({
          subDepartmentId: subDepartment._id,
          currentSubLevelId: slvl._id
        });
        return {
          subLevelId: slvl._id,
          subLevelName: slvl.name,
          order: slvl.order,
          studentCount: count
        };
      })
    );

    // Fetch faculties of the parent department
    const deptId = subDepartment.departmentId?._id || subDepartment.departmentId;
    const faculties = await User.find({
      departmentId: deptId,
      role: { $in: ["faculty", "hod"] },
      isActive: true
    }).select("name profileImage position email mobileNo");

    res.status(200).json({
      success: true,
      data: {
        ...subDepartment.toObject(),
        totalStudents,
        faculties,
        levelCounts,
        subLevelCounts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update SubDepartment
exports.updateSubDepartment = async (req, res) => {
  try {
    // Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subdepartment ID format"
      });
    }

    // If departmentId is being updated, validate it
    if (req.body.departmentId) {
      if (!isValidObjectId(req.body.departmentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid departmentId format"
        });
      }

      // Check if department exists and is active
      const department = await Department.findOne({ 
        _id: req.body.departmentId, 
        isActive: true 
      });
      
      if (!department) {
        return res.status(404).json({
          success: false,
          message: "Department not found"
        });
      }
    }

    const subDepartment = await SubDepartment.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    ).populate('departmentId');
    
    if (!subDepartment) {
      return res.status(404).json({ success: false, message: "SubDepartment not found" });
    }

    invalidateDeptCache(subDepartment.departmentId);
    res.status(200).json({
      success: true,
      message: "SubDepartment updated successfully",
      data: subDepartment
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "SubDepartment with this name already exists in this department" });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete SubDepartment (soft delete)
exports.deleteSubDepartment = async (req, res) => {
  try {
    // Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subdepartment ID format"
      });
    }

    const subDepartment = await SubDepartment.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { isActive: false },
      { new: true }
    );
    
    if (!subDepartment) {
      return res.status(404).json({ success: false, message: "SubDepartment not found" });
    }

    invalidateDeptCache(subDepartment.departmentId);
    res.status(200).json({ success: true, message: "SubDepartment deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
