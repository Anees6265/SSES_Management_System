const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const controller = require("../controllers/release/releaseNotesController");

const STAFF_ROLES = [
  "superadmin",
  "admin",
  "faculty",
  "hod",
  "placement_officer",
  "coordinator",
];

// Visible to all authenticated staff / admin roles
router.get("/", verifyToken, checkRole(STAFF_ROLES), controller.getReleaseNotes);

// Add new release note with image upload (authorized developers / superadmin only)
router.post("/", verifyToken, checkRole(STAFF_ROLES), controller.addReleaseNote);

// Edit existing release note (authorized developers / superadmin only)
router.put("/:id", verifyToken, checkRole(STAFF_ROLES), controller.updateReleaseNote);

// Delete release note (authorized developers / superadmin only)
router.delete("/:id", verifyToken, checkRole(STAFF_ROLES), controller.deleteReleaseNote);

module.exports = router;
