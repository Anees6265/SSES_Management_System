const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const {
  validateSubLevelInput,
  validateSubLevelUpdateInput,
  validateObjectIdParam,
  validateLevelIdParam
} = require("../middlewares/subLevelValidation");
const subLevelController = require("../controllers/department/subLevelController");

const allowedRoles = ["superadmin", "admin"];

// SubLevel CRUD Routes
router.post(
  "/",
  verifyToken,
  checkRole(allowedRoles),
  validateSubLevelInput,
  subLevelController.createSubLevel
);

router.get(
  "/",
  verifyToken,
  subLevelController.getAllSubLevels
);

router.get(
  "/level/:levelId",
  verifyToken,
  validateLevelIdParam,
  subLevelController.getSubLevelsByLevel
);

router.get(
  "/:id",
  verifyToken,
  validateObjectIdParam,
  subLevelController.getSubLevelById
);

router.put(
  "/:id",
  verifyToken,
  checkRole(allowedRoles),
  validateObjectIdParam,
  validateSubLevelUpdateInput,
  subLevelController.updateSubLevel
);

router.delete(
  "/:id",
  verifyToken,
  checkRole(allowedRoles),
  validateObjectIdParam,
  subLevelController.deleteSubLevel
);

module.exports = router;