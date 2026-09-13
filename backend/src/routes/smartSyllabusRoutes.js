const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const smartSyllabusController = require('../controllers/syllabus/smartSyllabusController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

const academicStaffRoles = ["superadmin", "admin", "faculty", "hod"];

const studentOrStaff = (req, res, next) => {
  const isStaff = academicStaffRoles.includes(req.user?.role);
  const isSelf = req.user?.role === "student" && req.user?.id?.toString() === req.params.studentId?.toString();
  if (isStaff || isSelf) {
    return next();
  }
  return res.status(403).json({ success: false, message: "Access Denied. Unauthorized." });
};

const syllabusUpdateValidation = [
  body('subjects').optional().isArray().withMessage('Subjects must be an array'),
  body('title').optional().isString().withMessage('Title must be a string'),
  body('changeLog').optional().isString().withMessage('Change log must be a string')
];

// Student can view their own syllabus; academic staff can view any student's syllabus
router.get('/students/:studentId/syllabus/:subLevelId', verifyToken, studentOrStaff, smartSyllabusController.getStudentSyllabus.bind(smartSyllabusController));

// Academic staff only (Superadmin, Admin, Faculty, HOD)
router.put('/syllabus/smart-update/:sessionId/:subLevelId', verifyToken, checkRole(academicStaffRoles), syllabusUpdateValidation, smartSyllabusController.updateSyllabusSmartly.bind(smartSyllabusController));
router.post('/students/:studentId/complete-level/:subLevelId', verifyToken, checkRole(academicStaffRoles), smartSyllabusController.completeStudentLevel.bind(smartSyllabusController));
router.get('/syllabus/history/:sessionId/:subLevelId', verifyToken, checkRole(academicStaffRoles), smartSyllabusController.getSyllabusHistory.bind(smartSyllabusController));
router.get('/syllabus/affected-students/:sessionId/:subLevelId', verifyToken, checkRole(academicStaffRoles), smartSyllabusController.getAffectedStudents.bind(smartSyllabusController));
router.post('/syllabus/preview-update/:sessionId/:subLevelId', verifyToken, checkRole(academicStaffRoles), smartSyllabusController.previewUpdateImpact.bind(smartSyllabusController));

module.exports = router;