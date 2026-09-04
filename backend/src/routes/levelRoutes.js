const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const {
  validateLevelInput,
  validateLevelUpdateInput,
  validateObjectIdParam,
  validateSubDepartmentIdParam
} = require("../middlewares/levelValidation");
const levelController = require("../controllers/department/levelController");

const allowedRoles = ["superadmin", "admin"];

// Level CRUD Routes
router.post(
  "/",
  verifyToken,
  checkRole(allowedRoles),
  validateLevelInput,
  levelController.createLevel
);

router.get(
  "/",
  verifyToken,
  levelController.getAllLevels
);

router.get(
  "/subdepartment/:subDepartmentId",
  verifyToken,
  validateSubDepartmentIdParam,
  levelController.getLevelsBySubDepartment
);

router.get(
  "/:id",
  verifyToken,
  validateObjectIdParam,
  levelController.getLevelById
);

router.put(
  "/:id",
  verifyToken,
  checkRole(allowedRoles),
  validateObjectIdParam,
  validateLevelUpdateInput,
  levelController.updateLevel
);

router.delete(
  "/:id",
  verifyToken,
  checkRole(allowedRoles),
  validateObjectIdParam,
  levelController.deleteLevel
);

module.exports = router;