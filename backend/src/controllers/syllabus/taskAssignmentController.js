const {
  assignTasksToStudent,
  assignTasksToMultipleStudents,
  assignSelectedTasksToStudents,
  assignTasksToSessionLevel,
  getStudentTasks,
  getStudentTaskSummary
} = require("../../services/taskAssignmentService");


// ==================== ASSIGN TASKS TO SINGLE STUDENT ====================
exports.assignTasksToStudent = async (req, res) => {
  try {
    const { studentId, syllabusVersionId } = req.body;


    const result = await assignTasksToStudent(studentId, syllabusVersionId);


    res.status(200).json({
      success: true,
      message: "Tasks assigned to student successfully",
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


// ==================== ASSIGN TASKS TO MULTIPLE STUDENTS ====================
exports.assignTasksToMultipleStudents = async (req, res) => {
  try {
    const { studentIds, syllabusVersionId } = req.body;


    const results = await assignTasksToMultipleStudents(studentIds, syllabusVersionId);


    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;


    res.status(200).json({
      success: true,
      message: `Tasks assigned: ${successCount} succeeded, ${failCount} failed`,
      data: results
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


exports.assignSelectedTasksToStudents = async (req, res) => {
  try {
    const { studentIds, taskIds, syllabusVersionId } = req.body;


    const results = await assignSelectedTasksToStudents({
      studentIds,
      taskIds,
      syllabusVersionId,
      actor: req.user
    });


    const successCount = results.filter((item) => item.success).length;
    const failCount = results.filter((item) => !item.success).length;


    res.status(200).json({
      success: true,
      message: `Manual task assignment completed: ${successCount} succeeded, ${failCount} failed`,
      data: results
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


// ==================== ASSIGN TASKS TO SESSION/LEVEL ====================
exports.assignTasksToSessionLevel = async (req, res) => {
  try {
    const { sessionId, levelId, subLevelId, syllabusVersionId } = req.body;


    const results = await assignTasksToSessionLevel(
      sessionId,
      levelId,
      subLevelId,
      syllabusVersionId
    );


    const successCount = results.filter(r => r.success).length;


    res.status(200).json({
      success: true,
      message: `Tasks assigned to ${successCount} students`,
      data: results
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


// ==================== GET STUDENT TASKS (VIEW ONLY) ====================
exports.getStudentTasks = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { syllabusVersionId, subjectName, status } = req.query;


    if (!syllabusVersionId) {
      return res.status(400).json({
        success: false,
        message: "syllabusVersionId is required"
      });
    }


    const filters = {};
    if (subjectName) filters.subjectName = subjectName;
    if (status) filters.status = status;


    const result = await getStudentTasks(studentId, syllabusVersionId, filters);


    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ==================== GET STUDENT TASK SUMMARY ====================
exports.getStudentTaskSummary = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { syllabusVersionId } = req.query;


    if (!syllabusVersionId) {
      return res.status(400).json({
        success: false,
        message: "syllabusVersionId is required"
      });
    }


    const summary = await getStudentTaskSummary(studentId, syllabusVersionId);


    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};