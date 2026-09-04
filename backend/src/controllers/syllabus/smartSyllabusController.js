const smartSyllabusService = require('../../services/smartSyllabusService');
const { validationResult } = require('express-validator');

class SmartSyllabusController {

  async getStudentSyllabus(req, res) {
    try {
      const { studentId, subLevelId } = req.params;
      const result = await smartSyllabusService.getStudentSyllabus(studentId, subLevelId);
      res.status(200).json({ success: true, data: result.version, type: result.type, message: result.message });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateSyllabusSmartly(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }
      const { sessionId, subLevelId } = req.params;
      const result = await smartSyllabusService.updateSyllabus(sessionId, subLevelId, req.body, req.user?.id);
      res.status(200).json({ success: true, data: result.newVersion, affectedStudents: result.affectedCompletedStudents, message: result.message });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async completeStudentLevel(req, res) {
    try {
      const { studentId, subLevelId } = req.params;
      const result = await smartSyllabusService.completeStudentLevel(studentId, subLevelId);
      res.status(200).json({ success: true, message: result.message, frozenVersion: result.frozenVersion });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getSyllabusHistory(req, res) {
    try {
      const { sessionId, subLevelId } = req.params;
      const history = await smartSyllabusService.getSyllabusHistory(sessionId, subLevelId);
      res.status(200).json({ success: true, data: history });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getAffectedStudents(req, res) {
    try {
      const { sessionId, subLevelId } = req.params;
      const students = await smartSyllabusService.getAffectedStudents(sessionId, subLevelId);
      res.status(200).json({ success: true, data: students });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async previewUpdateImpact(req, res) {
    try {
      const { sessionId, subLevelId } = req.params;
      const students = await smartSyllabusService.getAffectedStudents(sessionId, subLevelId);
      res.status(200).json({
        success: true,
        impact: {
          completedStudents: students.completed.length,
          currentStudents: students.current.length,
          totalAffected: students.completed.length + students.current.length,
          preservedVersions: students.completed.filter(s => s.frozenVersion).length
        },
        details: students
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new SmartSyllabusController();
