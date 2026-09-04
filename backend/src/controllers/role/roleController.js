const Role = require("../../models/role/role");

// ✅ CREATE ROLE
exports.createRole = async (req, res) => {
  try {
    const { roleName, description } = req.body;

    if (!roleName || !description) {
      return res.status(400).json({ message: "Role name and description are required" });
    }

    // Check if role already exists
    const existingRole = await Role.findOne({ 
      roleName: { $regex: new RegExp(`^${roleName}$`, 'i') } 
    });
    
    if (existingRole) {
      return res.status(400).json({ message: "Role with this name already exists" });
    }

    const newRole = new Role({
      roleName: roleName.toLowerCase(),
      description,
    });

    await newRole.save();

    res.status(201).json({
      message: "Role created successfully",
      role: {
        id: newRole._id,
        roleName: newRole.roleName,
        description: newRole.description,
        isActive: newRole.isActive,
      },
    });
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

// ✅ GET ALL ROLES
exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find({}).select("-__v");
    
    const formattedRoles = roles.map(role => ({
      ...role._doc,
      id: role._id,
    }));
    
    formattedRoles.forEach(role => {
      delete role._id;
    });

    res.status(200).json({ 
      success: true, 
      roles: formattedRoles,
      count: formattedRoles.length 
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ GET ROLE BY ID
exports.getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id).select("-__v");
    if (!role) return res.status(404).json({ message: "Role not found" });

    const formattedRole = {
      ...role._doc,
      id: role._id,
    };
    delete formattedRole._id;

    res.status(200).json({ success: true, role: formattedRole });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ UPDATE ROLE
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleName, description, isActive } = req.body;

    const updatedData = {
      ...(roleName && { roleName: roleName.toLowerCase() }),
      ...(description && { description }),
      ...(typeof isActive === "boolean" && { isActive }),
      updatedAt: new Date(),
    };

    const updatedRole = await Role.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedRole) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    res.status(200).json({
      success: true,
      message: "Role updated successfully",
      role: updatedRole,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

// ✅ DELETE ROLE
exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedRole = await Role.findByIdAndDelete(id);

    if (!deletedRole) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
};