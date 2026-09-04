const {
  assignTasksToStudent,
  assignTasksToMultipleStudents,
  getStudentTasks,
  getTaskSummary,
  updateProgress,
  submitTask,
  evaluateTask
} = require("../../services/studentTaskService");

// ==================== ASSIGN TASKS TO STUDENT ====================
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

// ==================== GET STUDENT TASKS (PROFILE VIEW) ====================
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

// ==================== GET TASK SUMMARY ====================
exports.getTaskSummary = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { syllabusVersionId } = req.query;

    if (!syllabusVersionId) {
      return res.status(400).json({
        success: false,
        message: "syllabusVersionId is required"
      });
    }

    const summary = await getTaskSummary(studentId, syllabusVersionId);

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

// ==================== UPDATE PROGRESS ====================
exports.updateProgress = async (req, res) => {
  try {
    const { studentId, taskMasterId } = req.params;
    const { progressPercentage } = req.body;

    if (progressPercentage === undefined || progressPercentage < 0 || progressPercentage > 100) {
      return res.status(400).json({
        success: false,
        message: "progressPercentage must be between 0 and 100"
      });
    }

    const task = await updateProgress(studentId, taskMasterId, progressPercentage);

    res.status(200).json({
      success: true,
      message: "Progress updated successfully",
      data: task
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== SUBMIT TASK ====================
exports.submitTask = async (req, res) => {
  try {
    const { studentId, taskMasterId } = req.params;
    const { submissionUrl, studentNotes } = req.body;

    const task = await submitTask(studentId, taskMasterId, {
      submissionUrl,
      studentNotes
    });

    res.status(200).json({
      success: true,
      message: "Task submitted successfully",
      data: task
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== EVALUATE TASK (TEACHER) ====================
exports.evaluateTask = async (req, res) => {
  try {
    const { studentId, taskMasterId } = req.params;
    const { marksObtained, feedback } = req.body;
    const evaluatedBy = req.user?._id; // From auth middleware

    if (marksObtained === undefined) {
      return res.status(400).json({
        success: false,
        message: "marksObtained is required"
      });
    }

    const task = await evaluateTask(studentId, taskMasterId, marksObtained, feedback, evaluatedBy);

    res.status(200).json({
      success: true,
      message: "Task evaluated successfully",
      data: task
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
