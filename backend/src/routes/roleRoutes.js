const express = require("express");
const roleController = require("../controllers/role/roleController");
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");

const router = express.Router();

const superAdminOnly = [verifyToken, checkRole(["superadmin"])];
const authOnly = [verifyToken];

// Read — any authenticated user
router.get("/all",     ...authOnly, roleController.getAllRoles);
router.get("/get/:id", ...authOnly, roleController.getRoleById);

// Write — superadmin only
router.post("/create",      ...superAdminOnly, roleController.createRole);
router.patch("/update/:id", ...superAdminOnly, roleController.updateRole);
router.delete("/delete/:id",...superAdminOnly, roleController.deleteRole);

module.exports = router;
