const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');
const {
  saveStudentReportCard,
  getStudentReportCard,
  getStudentReportCardForEdit,
  getAllReportCards,
  updateStudentReportCard,
} = require('../controllers/student/studentReportCardController');

const allowedRoles = ['superadmin', 'admin', 'faculty', 'hod', 'placement_officer'];
const auth = [verifyToken, checkRole(allowedRoles)];

router.post('/', ...auth, saveStudentReportCard);
router.get('/', ...auth, getAllReportCards);
router.get('/:studentId/edit', ...auth, getStudentReportCardForEdit);
router.get('/:studentId', ...auth, getStudentReportCard);
router.put('/:id', ...auth, updateStudentReportCard);

module.exports = router;
