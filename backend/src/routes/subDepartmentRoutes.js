const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const { validateSubDepartmentInput, validateObjectId } = require("../middlewares/subDepartmentValidation");
const subDepartmentController = require("../controllers/department/subDepartmentController");

const allowedRoles = ["superadmin", "admin"];

// SubDepartment CRUD Routes
router.post(
  "/",
  verifyToken,
  checkRole(allowedRoles),
  validateSubDepartmentInput,
  subDepartmentController.createSubDepartment
);

router.get(
  "/",
  verifyToken,
  subDepartmentController.getAllSubDepartments
);

router.get(
  "/department/:departmentId",
  verifyToken,
  validateObjectId,
  subDepartmentController.getSubDepartmentsByDepartment
);

router.get(
  "/:id",
  verifyToken,
  validateObjectId,
  subDepartmentController.getSubDepartmentById
);

router.put(
  "/:id",
  verifyToken,
  checkRole(allowedRoles),
  validateObjectId,
  validateSubDepartmentInput,
  subDepartmentController.updateSubDepartment
);

router.delete(
  "/:id",
  verifyToken,
  checkRole(allowedRoles),
  validateObjectId,
  subDepartmentController.deleteSubDepartment
);

module.exports = router;