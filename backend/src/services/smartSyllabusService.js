const SyllabusVersion = require('../models/syllabus/SyllabusVersion');
const StudentLevelProgress = require('../models/student/StudentLevelProgress');
const Student = require('../models/student/Student');

class SmartSyllabusService {
  
  /**
   * Get syllabus for student based on their progress
   * Returns frozen version for completed levels, latest for upcoming
   */
  async getStudentSyllabus(studentId, subLevelId) {
    try {
      const student = await Student.findById(studentId).populate('sessionId');
      if (!student) {
        throw new Error('Student not found');
      }

      // Check if student has completed this level
      const progress = await StudentLevelProgress.findOne({
        studentId,
        subLevelId,
        status: 'completed'
      });

      if (progress && progress.syllabusVersionSnapshot) {
        // Return frozen syllabus version for completed level
        return {
          type: 'frozen',
          version: progress.syllabusVersionSnapshot,
          message: 'This is your completed syllabus version'
        };
      }

      // Return latest syllabus version for current/upcoming levels
      const latestSyllabus = await SyllabusVersion.findOne({
        sessionId: student.sessionId._id,
        subLevelId,
        status: 'active'
      }).sort({ versionNumber: -1 });

      if (!latestSyllabus) {
        throw new Error('No syllabus found for this level');
      }

      return {
        type: 'dynamic',
        version: latestSyllabus,
        message: 'This is the latest syllabus version'
      };

    } catch (error) {
      throw new Error(`Error getting student syllabus: ${error.message}`);
    }
  }

  /**
   * Update syllabus with smart versioning
   * Creates new version while preserving completed student progress
   */
  async updateSyllabus(sessionId, subLevelId, updateData, updatedBy) {
    try {
      // Get current active syllabus
      const currentSyllabus = await SyllabusVersion.findOne({
        sessionId,
        subLevelId,
        status: 'active'
      });

      if (!currentSyllabus) {
        throw new Error('No active syllabus found to update');
      }

      // Check which students have completed this level
      const completedStudents = await StudentLevelProgress.find({
        subLevelId,
        status: 'completed'
      }).populate('studentId');

      // Create syllabus snapshot for completed students if not exists
      for (const progress of completedStudents) {
        if (!progress.syllabusVersionSnapshot.versionId) {
          progress.syllabusVersionSnapshot = {
            versionId: currentSyllabus._id,
            version: currentSyllabus.version,
            subjects: currentSyllabus.subjects,
            frozenAt: new Date()
          };
          await progress.save();
        }
      }

      // Create new version for upcoming students
      const newVersionNumber = currentSyllabus.versionNumber + 1;
      const newVersion = `v${newVersionNumber}.0`;

      const newSyllabus = new SyllabusVersion({
        sessionId,
        levelId: currentSyllabus.levelId,
        subLevelId,
        version: newVersion,
        title: updateData.title || currentSyllabus.title,
        subjects: updateData.subjects || currentSyllabus.subjects,
        status: 'active',
        versionNumber: newVersionNumber,
        parentVersionId: currentSyllabus._id,
        effectiveFrom: new Date(),
        appliesTo: 'upcoming',
        changeLog: updateData.changeLog || 'Syllabus updated',
        updatedBy
      });

      // Archive old version
      currentSyllabus.status = 'archived';
      currentSyllabus.isActive = false;

      // Save both versions
      await currentSyllabus.save();
      await newSyllabus.save();

      return {
        success: true,
        newVersion: newSyllabus,
        affectedCompletedStudents: completedStudents.length,
        message: `Syllabus updated to ${newVersion}. ${completedStudents.length} completed students preserved with original version.`
      };

    } catch (error) {
      throw new Error(`Error updating syllabus: ${error.message}`);
    }
  }

  /**
   * Mark student level as completed and freeze syllabus
   */
  async completeStudentLevel(studentId, subLevelId) {
    try {
      const student = await Student.findById(studentId);
      if (!student) {
        throw new Error('Student not found');
      }

      // Get current syllabus version
      const currentSyllabus = await SyllabusVersion.findOne({
        sessionId: student.sessionId,
        subLevelId,
        status: 'active'
      });

      // Find or create progress record
      let progress = await StudentLevelProgress.findOne({
        studentId,
        subLevelId
      });

      if (!progress) {
        progress = new StudentLevelProgress({
          studentId,
          sessionId: student.sessionId,
          levelId: student.currentLevelId,
          subLevelId
        });
      }

      // Mark as completed and freeze syllabus
      progress.markCompleted();
      progress.syllabusVersionSnapshot = {
        versionId: currentSyllabus._id,
        version: currentSyllabus.version,
        subjects: currentSyllabus.subjects,
        frozenAt: new Date()
      };

      await progress.save();

      return {
        success: true,
        message: 'Level completed and syllabus frozen',
        frozenVersion: currentSyllabus.version
      };

    } catch (error) {
      throw new Error(`Error completing student level: ${error.message}`);
    }
  }

  /**
   * Get syllabus version history for a level
   */
  async getSyllabusHistory(sessionId, subLevelId) {
    try {
      const versions = await SyllabusVersion.find({
        sessionId,
        subLevelId
      }).sort({ versionNumber: -1 }).populate('updatedBy', 'name');

      return versions.map(version => ({
        id: version._id,
        version: version.version,
        status: version.status,
        effectiveFrom: version.effectiveFrom,
        changeLog: version.changeLog,
        updatedBy: version.updatedBy?.name || 'System',
        createdAt: version.createdAt
      }));

    } catch (error) {
      throw new Error(`Error getting syllabus history: ${error.message}`);
    }
  }

  /**
   * Get students affected by syllabus updates
   */
  async getAffectedStudents(sessionId, subLevelId) {
    try {
      const completedStudents = await StudentLevelProgress.find({
        sessionId,
        subLevelId,
        status: 'completed'
      }).populate('studentId', 'firstName lastName prkey');

      const currentStudents = await Student.find({
        sessionId,
        currentSubLevelId: subLevelId,
        status: 'Active'
      }).select('firstName lastName prkey');

      return {
        completed: completedStudents.map(p => ({
          id: p.studentId._id,
          name: `${p.studentId.firstName} ${p.studentId.lastName}`,
          prkey: p.studentId.prkey,
          completedAt: p.completedAt,
          frozenVersion: p.syllabusVersionSnapshot?.version
        })),
        current: currentStudents.map(s => ({
          id: s._id,
          name: `${s.firstName} ${s.lastName}`,
          prkey: s.prkey,
          willGetUpdates: true
        }))
      };

    } catch (error) {
      throw new Error(`Error getting affected students: ${error.message}`);
    }
  }
}

module.exports = new SmartSyllabusService();