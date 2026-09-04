const Task            = require("../../models/syllabus/Task");
const SyllabusVersion = require("../../models/syllabus/SyllabusVersion");
const { syncSyllabusTasksToStudents, syncTasksToSubLevelStudents } = require("../../services/taskAssignmentService");

const VALID_TYPES    = ["assignment", "project", "practice", "reading", "assessment", "other"];
const VALID_PRIORITY = ["low", "medium", "high"];

// POST /syllabus/versions/bulk-upload-tasks
// Body: { syllabusVersionId, tasks: [{ topic, subTopic, taskTitle, taskType, priority, maxMarks, timeDays, measurablePoints }] }
exports.bulkUploadTasks = async (req, res) => {
  try {
    const { syllabusVersionId, tasks } = req.body;

    if (!syllabusVersionId)
      return res.status(400).json({ success: false, message: "syllabusVersionId is required" });
    if (!Array.isArray(tasks) || tasks.length === 0)
      return res.status(400).json({ success: false, message: "tasks array is required" });

    const sv = await SyllabusVersion.findById(syllabusVersionId);
    if (!sv || !sv.isActive)
      return res.status(404).json({ success: false, message: "SyllabusVersion not found" });

    const errors   = [];
    const taskDocs = [];

    for (let i = 0; i < tasks.length; i++) {
      const row    = tasks[i];
      const rowNum = i + 2;

      const subjectName    = (row.subject          || row.Subject || "").trim();
      const topicName       = (row.topic            || row.Topic || "").trim();
      const subTopicName    = (row.subTopic          || row["Sub Topic"] || row.SubTopic || "").trim();
      const taskTitle       = (row.taskTitle         || row["Task Title"] || row.TaskTitle || "").trim();
      const taskType        = (row.taskType          || row["Task Type"] || row.TaskType || "assessment").trim().toLowerCase();
      const priority        = (row.priority          || row.Priority || "medium").trim().toLowerCase();
      const maxMarks        = Number(row.maxMarks)   || Number(row["Max Marks"]) || 5;
      const timeDays        = row.timeDays           || row["Time Days"] ? Number(row.timeDays || row["Time Days"]) : null;
      const measurablePoints = (row.measurablePoints || row["Measurable Points"] || "").trim();

      if (!topicName || !taskTitle) {
        errors.push(`Row ${rowNum}: topic and taskTitle are required`);
        continue;
      }

      const resolvedType = VALID_TYPES.includes(taskType) ? taskType : "assessment";
      if (!VALID_PRIORITY.includes(priority)) {
        errors.push(`Row ${rowNum}: Invalid priority "${priority}". Allowed: ${VALID_PRIORITY.join(", ")}`);
        continue;
      }

      // Find subject, topic, subtopic from embedded SyllabusVersion
      // If subject column provided, filter by subject name first for accuracy
      let foundSubject  = null;
      let foundTopic    = null;
      let foundSubTopic = null;

      const subjectsToSearch = subjectName
        ? (sv.subjects || []).filter(s => s.name.trim().toLowerCase() === subjectName.toLowerCase())
        : (sv.subjects || []);

      for (const subj of subjectsToSearch) {
        const topic = (subj.topics || []).find(
          (t) => t.name.trim().toLowerCase() === topicName.toLowerCase()
        );
        if (topic) {
          foundSubject = subj;
          foundTopic   = topic;
          if (subTopicName) {
            foundSubTopic = (topic.subTopics || []).find(
              (st) => st.name.trim().toLowerCase() === subTopicName.toLowerCase()
            ) || null;
          }
          break;
        }
      }

      if (!foundTopic) {
        errors.push(`Row ${rowNum}: Topic "${topicName}" not found in syllabus`);
        continue;
      }
      if (subTopicName && !foundSubTopic) {
        errors.push(`Row ${rowNum}: SubTopic "${subTopicName}" not found under topic "${topicName}"`);
        continue;
      }

      // Check duplicate
      const exists = await Task.findOne({
        syllabusVersionId,
        topicId:    foundTopic._id,
        subTopicId: foundSubTopic?._id || null,
        title:      taskTitle,
        isActive:   true,
      });
      if (exists) {
        errors.push(`Row ${rowNum}: Task "${taskTitle}" already exists for this topic/subtopic`);
        continue;
      }

      const taskCount = await Task.countDocuments({
        syllabusVersionId,
        topicId:    foundTopic._id,
        subTopicId: foundSubTopic?._id || null,
      });

      taskDocs.push({
        syllabusVersionId,
        subjectId:        foundSubject._id,
        subjectName:      foundSubject.name,
        topicId:          foundTopic._id,
        topicName:        foundTopic.name,
        subTopicId:       foundSubTopic?._id || null,
        subTopicName:     foundSubTopic?.name || "",
        taskNodeType:     foundSubTopic ? "subTopic" : "topic",
        title:            taskTitle,
        type:             resolvedType,
        maxMarks,
        timeDays,
        measurablePoints,
        order:            taskCount + 1,
        assignedByName:   req.user?.name || "System",
        isActive:         true,
      });
    }

    if (taskDocs.length === 0)
      return res.status(400).json({ success: false, message: "No valid tasks to insert", errors });

    const inserted = await Task.insertMany(taskDocs);

    // Always sync to all active students in this subLevel
    await syncTasksToSubLevelStudents(syllabusVersionId).catch(() => {});

    res.status(201).json({
      success:  true,
      message:  `${inserted.length} task(s) uploaded successfully`,
      inserted: inserted.length,
      skipped:  errors.length,
      errors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
