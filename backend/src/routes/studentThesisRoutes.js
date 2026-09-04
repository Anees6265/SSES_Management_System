const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const upload = require("../config/multerConfig");
const {
  uploadAndAnalyzeThesis,
  getStudentThesis,
  deleteStudentThesis,
  downloadThesisTemplate,
} = require("../controllers/student/studentThesisController");

const allowedRoles = [
  "superadmin",
  "admin",
  "faculty",
  "hod",
  "placement_officer",
];
const authModify = [verifyToken, checkRole(allowedRoles)];

// Download dummy thesis template
router.get("/template/download", downloadThesisTemplate);

// Upload and analyze thesis (Faculty/Admin only)
router.post("/:studentId", ...authModify, upload.single("thesis"), uploadAndAnalyzeThesis);

// Retrieve thesis analysis (Faculty, Admin, and Student)
router.get("/:studentId", verifyToken, getStudentThesis);

// Delete thesis analysis (Faculty/Admin only)
router.delete("/:studentId", ...authModify, deleteStudentThesis);

module.exports = router;
