const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const smartSyllabusController = require('../controllers/syllabus/smartSyllabusController');
const { verifyToken } = require('../middlewares/authMiddleware');

const syllabusUpdateValidation = [
  body('subjects').optional().isArray().withMessage('Subjects must be an array'),
  body('title').optional().isString().withMessage('Title must be a string'),
  body('changeLog').optional().isString().withMessage('Change log must be a string')
];

router.get('/students/:studentId/syllabus/:subLevelId', verifyToken, smartSyllabusController.getStudentSyllabus.bind(smartSyllabusController));
router.put('/syllabus/smart-update/:sessionId/:subLevelId', verifyToken, syllabusUpdateValidation, smartSyllabusController.updateSyllabusSmartly.bind(smartSyllabusController));
router.post('/students/:studentId/complete-level/:subLevelId', verifyToken, smartSyllabusController.completeStudentLevel.bind(smartSyllabusController));
router.get('/syllabus/history/:sessionId/:subLevelId', verifyToken, smartSyllabusController.getSyllabusHistory.bind(smartSyllabusController));
router.get('/syllabus/affected-students/:sessionId/:subLevelId', verifyToken, smartSyllabusController.getAffectedStudents.bind(smartSyllabusController));
router.post('/syllabus/preview-update/:sessionId/:subLevelId', verifyToken, smartSyllabusController.previewUpdateImpact.bind(smartSyllabusController));

module.exports = router;