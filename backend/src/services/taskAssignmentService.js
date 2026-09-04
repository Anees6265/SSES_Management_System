const Student = require("../models/student/Student");
const Session = require("../models/Session");
const Level = require("../models/department/Level");
const SubLevel = require("../models/department/SubLevel");
const SyllabusVersion = require("../models/syllabus/SyllabusVersion");
const Task = require("../models/syllabus/Task");
const StudentTask = require("../models/syllabus/StudentTask");
const StudentTaskHistory = require("../models/student/StudentTaskHistory");
const StudentProgressSnapshot = require("../models/student/StudentProgressSnapshot");
const StudentEventLog = require("../models/student/StudentEventLog");

const ACTIVE_STUDENT_STATUSES = ["Active"];

const buildTaskEntries = async (syllabusVersionId) => {
  const tasks = await Task.find({ syllabusVersionId, isActive: true }).lean();
  return tasks.map((task) => ({
    taskId: task._id,
    subjectId: task.subjectId,
    topicId: task.topicId,
    subTopicId: task.subTopicId || null,
    subjectName: task.subjectName || "",
    topicName: task.topicName || "",
    subTopicName: task.subTopicName || "",
    taskNodeType: task.taskNodeType,
    title: task.title,
    description: task.description || "",
    type: task.type || "assignment",
    mandatory: task.mandatory !== false,
    maxMarks: typeof task.maxMarks === "number" ? task.maxMarks : 5
  }));
};

const getActorDetails = (actor = null) => ({
  id: actor?.id || actor?._id || null,
  name: actor?.name || "",
  role: actor?.role || ""
});

const getSnapshotContext = async ({ student, syllabusVersionId }) => {
  const [session, level, subLevel, syllabusVersion] = await Promise.all([
    Session.findById(student.sessionId).select("name"),
    Level.findById(student.currentLevelId).select("name"),
    SubLevel.findById(student.currentSubLevelId).select("name"),
    SyllabusVersion.findById(syllabusVersionId).select("title version")
  ]);

  return {
    sessionId: student.sessionId,
    sessionName: session?.name || "",
    levelId: student.currentLevelId,
    levelName: level?.name || "",
    subLevelId: student.currentSubLevelId,
    subLevelName: subLevel?.name || "",
    syllabusVersionId,
    syllabusVersionTitle: syllabusVersion?.title || "",
    syllabusVersionCode: syllabusVersion?.version || ""
  };
};

const toTaskEntryMap = async (syllabusVersionId) => {
  const entries = await buildTaskEntries(syllabusVersionId);
  return new Map(entries.map((entry) => [entry.taskId.toString(), entry]));
};

const getSyllabusVersionForStudent = async (student, syllabusVersionId) => {
  if (syllabusVersionId) {
    const version = await SyllabusVersion.findOne({
      _id: syllabusVersionId,
      isActive: true,
      sessionId: student.sessionId
    });

    if (!version) {
      throw new Error("Syllabus version not found");
    }

    return version;
  }

  if (student.syllabusVersionId) {
    const version = await SyllabusVersion.findOne({
      _id: student.syllabusVersionId,
      isActive: true
    });

    if (version) {
      return version;
    }
  }

  const activeVersion = await SyllabusVersion.findOne({
    sessionId: student.sessionId,
    levelId: student.currentLevelId,
    subLevelId: student.currentSubLevelId,
    status: "active",
    isActive: true
  }).sort({ createdAt: -1 });

  if (!activeVersion) {
    throw new Error("No active syllabus found for this student");
  }

  return activeVersion;
};

const validateStudentVersionMatch = (student, syllabusVersion) => {
  if (student.sessionId.toString() !== syllabusVersion.sessionId.toString()) {
    throw new Error("Student session does not match the syllabus version session");
  }

  if (
    student.currentLevelId.toString() !== syllabusVersion.levelId.toString() ||
    student.currentSubLevelId.toString() !== syllabusVersion.subLevelId.toString()
  ) {
    throw new Error("Student is not currently in the level/sublevel of this syllabus version");
  }
};

const buildStudentTaskPayload = (student, syllabusVersion, entry, assignmentMeta = {}) => ({
  sessionId: student.sessionId,
  levelId: syllabusVersion.levelId,
  subLevelId: syllabusVersion.subLevelId,
  syllabusVersionId: syllabusVersion._id,
  subjectId: entry.subjectId,
  topicId: entry.topicId,
  subTopicId: entry.subTopicId,
  subjectName: entry.subjectName,
  topicName: entry.topicName,
  subTopicName: entry.subTopicName,
  taskNodeType: entry.taskNodeType,
  title: entry.title,
  description: entry.description,
  type: entry.type,
  mandatory: entry.mandatory,
  maxMarks: entry.maxMarks,
  isActive: true,
  assignedType: assignmentMeta.assignedType || "auto",
  assignedBy: assignmentMeta.assignedBy || null,
  assignedByName: assignmentMeta.assignedByName || "",
  assignedByRole: assignmentMeta.assignedByRole || "",
  assignedAt: assignmentMeta.assignedAt || new Date()
});

const ensureManualAssignmentState = (studentTask, assignmentMeta) => {
  if (!studentTask) {
    return;
  }

  studentTask.assignedType = "manual";
  studentTask.assignedBy = assignmentMeta.assignedBy || null;
  studentTask.assignedByName = assignmentMeta.assignedByName || "";
  studentTask.assignedByRole = assignmentMeta.assignedByRole || "";
  studentTask.assignedAt = assignmentMeta.assignedAt || new Date();
};

const assignTasksToStudent = async (studentId, syllabusVersionId, options = {}) => {
  const student = await Student.findById(studentId);

  if (!student) {
    throw new Error("Student not found");
  }

  const syllabusVersion = await getSyllabusVersionForStudent(student, syllabusVersionId);
  validateStudentVersionMatch(student, syllabusVersion);
  const taskEntries = await buildTaskEntries(syllabusVersion._id);

  if (taskEntries.length === 0) {
    throw new Error("No active tasks found in syllabus");
  }

  const existingTasks = await StudentTask.find({
    studentId: student._id,
    syllabusVersionId: syllabusVersion._id
  }).select("_id taskId");

  const existingMap = new Map(
    existingTasks.map((item) => [item.taskId.toString(), item])
  );

  let createdCount = 0;
  let updatedCount = 0;

  for (const entry of taskEntries) {
    const payload = buildStudentTaskPayload(student, syllabusVersion, entry, {
      assignedType: "auto"
    });

    const existing = existingMap.get(entry.taskId.toString());

    if (existing) {
      const existingTask = await StudentTask.findById(existing._id);
      if (!existingTask) {
        continue;
      }

      if (existingTask.assignedType === "manual") {
        delete payload.assignedType;
        delete payload.assignedBy;
        delete payload.assignedByName;
        delete payload.assignedByRole;
        delete payload.assignedAt;
      }

      await StudentTask.updateOne(
        { _id: existing._id },
        { $set: payload }
      );
      updatedCount += 1;
      continue;
    }

    await StudentTask.create({
      studentId: student._id,
      taskId: entry.taskId,
      ...payload
    });
    createdCount += 1;
  }

  const activeTaskIds = taskEntries.map((task) => task.taskId);

  await StudentTask.updateMany(
    {
      studentId: student._id,
      syllabusVersionId: syllabusVersion._id,
      taskId: { $nin: activeTaskIds }
    },
    { $set: { isActive: false } }
  );

  if (!student.syllabusVersionId || student.syllabusVersionId.toString() !== syllabusVersion._id.toString()) {
    student.syllabusVersionId = syllabusVersion._id;
    await student.save();
  }

  await syncStudentLevelProgressStats(student._id);

  return {
    studentId: student._id,
    syllabusVersionId: syllabusVersion._id,
    createdCount,
    updatedCount,
    totalTasks: taskEntries.length
  };
};

const assignTasksToMultipleStudents = async (studentIds, syllabusVersionId) => {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw new Error("studentIds must be a non-empty array");
  }

  // Run up to 10 assignments concurrently instead of sequentially.
  // For 200 students this reduces wall-clock time by ~10x.
  const CONCURRENCY = 10;
  const results = [];
  for (let i = 0; i < studentIds.length; i += CONCURRENCY) {
    const batch = studentIds.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map((studentId) => assignTasksToStudent(studentId, syllabusVersionId))
    );
    batchResults.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        results.push({ success: true, studentId: batch[idx], ...r.value });
      } else {
        results.push({ success: false, studentId: batch[idx], message: r.reason?.message || "Unknown error" });
      }
    });
  }

  return results;
};

const assignSelectedTasksToStudents = async ({ studentIds, taskIds, syllabusVersionId, actor }) => {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw new Error("studentIds must be a non-empty array");
  }

  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    throw new Error("taskIds must be a non-empty array");
  }

  const assignmentMeta = {
    assignedType: "manual",
    assignedAt: new Date(),
    assignedBy: actor?.id || actor?._id || null,
    assignedByName: actor?.name || "",
    assignedByRole: actor?.role || ""
  };

  const results = [];

  for (const studentId of studentIds) {
    try {
      const student = await Student.findById(studentId);
      if (!student) {
        throw new Error("Student not found");
      }

      const syllabusVersion = await getSyllabusVersionForStudent(student, syllabusVersionId);
      validateStudentVersionMatch(student, syllabusVersion);
      const taskEntryMap = await toTaskEntryMap(syllabusVersion._id);

      let createdCount = 0;
      let updatedCount = 0;

      for (const taskId of taskIds) {
        const entry = taskEntryMap.get(taskId.toString());
        if (!entry) {
          throw new Error(`Task ${taskId} not found in syllabus version`);
        }

        const payload = buildStudentTaskPayload(student, syllabusVersion, entry, assignmentMeta);
        const existingTask = await StudentTask.findOne({
          studentId: student._id,
          taskId: entry.taskId
        });

        if (existingTask) {
          Object.assign(existingTask, payload);
          ensureManualAssignmentState(existingTask, assignmentMeta);
          existingTask.isActive = true;
          await existingTask.save();
          updatedCount += 1;
          continue;
        }

        await StudentTask.create({
          studentId: student._id,
          taskId: entry.taskId,
          ...payload
        });
        createdCount += 1;
      }

      results.push({
        success: true,
        studentId,
        syllabusVersionId: syllabusVersion._id,
        createdCount,
        updatedCount,
        totalTasks: taskIds.length
      });
    } catch (error) {
      results.push({
        success: false,
        studentId,
        message: error.message
      });
    }
  }

  return results;
};

const assignTasksToSessionLevel = async (sessionId, levelId, subLevelId, syllabusVersionId) => {
  const filter = {};

  if (sessionId) filter.sessionId = sessionId;
  if (levelId) filter.currentLevelId = levelId;
  if (subLevelId) filter.currentSubLevelId = subLevelId;
  filter.status = { $in: ACTIVE_STUDENT_STATUSES };

  const students = await Student.find(filter).select("_id");

  if (students.length === 0) {
    return [];
  }

  return assignTasksToMultipleStudents(
    students.map((student) => student._id),
    syllabusVersionId
  );
};

const getStudentTasks = async (studentId, syllabusVersionId, filters = {}) => {
  const student = await Student.findById(studentId).select("sessionId currentLevelId currentSubLevelId");
  if (!student) {
    throw new Error("Student not found");
  }

  const syllabusVersion = await SyllabusVersion.findById(syllabusVersionId).select("sessionId levelId subLevelId");
  if (!syllabusVersion) {
    throw new Error("Syllabus version not found");
  }

  const query = {
    studentId,
    syllabusVersionId,
    sessionId: filters.sessionId || syllabusVersion.sessionId || student.sessionId,
    levelId: filters.levelId || syllabusVersion.levelId || student.currentLevelId,
    subLevelId: filters.subLevelId || syllabusVersion.subLevelId || student.currentSubLevelId,
    isActive: true
  };

  if (filters.status) query.status = filters.status;
  if (filters.subjectId) query.subjectId = filters.subjectId;
  if (filters.topicId) query.topicId = filters.topicId;
  if (filters.subTopicId) query.subTopicId = filters.subTopicId;

  const tasks = await StudentTask.find(query).sort({
    assignedAt: -1,
    createdAt: -1
  });

  return tasks;
};

const getStudentTaskSummary = async (studentId, syllabusVersionId) => {
  const tasks = await getStudentTasks(studentId, syllabusVersionId);

  const summary = {
    total: tasks.length,
    pending: 0,
    inProgress: 0,
    completed: 0,
    progressPercent: 0,
    averageMarks: 0
  };

  let marksTotal = 0;
  let completedWithMarks = 0;

  for (const task of tasks) {
    summary[task.status] += 1;
    if (task.status === "completed" && typeof task.marks === "number") {
      marksTotal += task.marks;
      completedWithMarks += 1;
    }
  }

  if (summary.total > 0) {
    summary.progressPercent = Math.round((summary.completed / summary.total) * 100);
  }

  if (completedWithMarks > 0) {
    summary.averageMarks = Number((marksTotal / completedWithMarks).toFixed(2));
  }

  return summary;
};

const buildProgressSnapshot = ({ tasks, actorDetails, context, snapshotScope = "overall", subject = null }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const inProgressTasks = tasks.filter((task) => task.status === "inProgress").length;
  const pendingTasks = tasks.filter((task) => task.status === "pending").length;
  const completedWithMarks = tasks.filter((task) => task.status === "completed" && typeof task.marks === "number");
  const averageMarks = completedWithMarks.length > 0
    ? Number((completedWithMarks.reduce((sum, task) => sum + task.marks, 0) / completedWithMarks.length).toFixed(2))
    : 0;

  return {
    snapshotScope,
    ...context,
    subjectId: subject?.subjectId || null,
    subjectName: subject?.subjectName || "",
    totalTasks,
    completedTasks,
    pendingTasks,
    inProgressTasks,
    averageMarks,
    changedBy: actorDetails.id,
    changedByName: actorDetails.name,
    changedByRole: actorDetails.role,
    changedAt: new Date()
  };
};

const createProgressSnapshot = async (studentId, syllabusVersionId, actor = null, updatedTask = null) => {
  const student = await Student.findById(studentId).select("sessionId currentLevelId currentSubLevelId");
  if (!student) {
    throw new Error("Student not found");
  }

  const tasks = await StudentTask.find({
    studentId,
    sessionId: student.sessionId,
    levelId: student.currentLevelId,
    subLevelId: student.currentSubLevelId,
    syllabusVersionId,
    isActive: true
  }).select("status marks subjectId subjectName");

  const actorDetails = getActorDetails(actor);
  const context = await getSnapshotContext({ student, syllabusVersionId });
  const snapshots = [
    buildProgressSnapshot({
      tasks,
      actorDetails,
      context,
      snapshotScope: "overall"
    })
  ];

  if (updatedTask?.subjectId) {
    const subjectTasks = tasks.filter(
      (task) => task.subjectId?.toString() === updatedTask.subjectId.toString()
    );

    snapshots.push(
      buildProgressSnapshot({
        tasks: subjectTasks,
        actorDetails,
        context,
        snapshotScope: "subject",
        subject: {
          subjectId: updatedTask.subjectId,
          subjectName: updatedTask.subjectName
        }
      })
    );
  }

  await Student.findByIdAndUpdate(studentId, {
    $set: { updatedAt: new Date() }
  });

  await StudentProgressSnapshot.insertMany(
    snapshots.map((snapshot) => ({
      studentId,
      ...snapshot
    }))
  );

  return snapshots;
};

const updateStudentTaskStatus = async (studentId, taskId, payload) => {
  const student = await Student.findById(studentId).select("sessionId currentLevelId currentSubLevelId syllabusVersionId");
  if (!student) {
    throw new Error("Student not found");
  }

  const studentTask = await StudentTask.findOne({
    studentId,
    taskId,
    sessionId: student.sessionId,
    levelId: student.currentLevelId,
    subLevelId: student.currentSubLevelId,
    syllabusVersionId: student.syllabusVersionId,
    isActive: true
  });

  if (!studentTask) {
    throw new Error("Student task not found");
  }

  const nextStatus = payload.status || studentTask.status;
  const hasExplicitMarks = payload.marks !== undefined;
  const nextMarks = hasExplicitMarks ? payload.marks : studentTask.marks;

  if (nextStatus === "completed" && (nextMarks === null || nextMarks === undefined)) {
    throw new Error("Marks are required when task status is completed");
  }

  if (nextMarks !== null && nextMarks !== undefined && nextMarks > studentTask.maxMarks) {
    throw new Error("Marks cannot exceed maxMarks");
  }

  if (payload.status) {
    studentTask.status = nextStatus;

    if (payload.status === "inProgress" && !studentTask.startedAt) {
      studentTask.startedAt = new Date();
    }

    if (payload.status === "completed") {
      studentTask.completedAt = new Date();
      if (!studentTask.startedAt) {
        studentTask.startedAt = new Date();
      }
    }

    if (payload.status !== "completed") {
      studentTask.completedAt = null;
    }
  }

  if (nextStatus === "pending") {
    studentTask.marks = null;
  } else if (payload.marks !== undefined) {
    studentTask.marks = payload.marks;
  }

  if (payload.notes !== undefined) {
    studentTask.notes = payload.notes;
  }

  await studentTask.save();
  const actorId = payload.actor?.id || payload.actor?._id || null;
  const actorName = payload.actor?.name || "";
  const actorRole = payload.actor?.role || "";

  const progressSnapshots = await createProgressSnapshot(
    studentId,
    studentTask.syllabusVersionId,
    payload.actor,
    studentTask
  );
  const snapshotContext = await getSnapshotContext({
    student,
    syllabusVersionId: studentTask.syllabusVersionId
  });

  await Promise.all([
    Student.findByIdAndUpdate(studentId, { $set: { updatedAt: new Date() } }),
    StudentTaskHistory.create({
      studentId,
      ...snapshotContext,
      subjectId: studentTask.subjectId,
      subjectName: studentTask.subjectName,
      topicId: studentTask.topicId,
      topicName: studentTask.topicName,
      subTopicId: studentTask.subTopicId,
      subTopicName: studentTask.subTopicName || "",
      taskId: studentTask.taskId,
      taskTitle: studentTask.title,
      taskNodeType: studentTask.taskNodeType,
      status: studentTask.status,
      marks: studentTask.marks,
      maxMarks: studentTask.maxMarks,
      notes: studentTask.notes,
      changedBy: actorId,
      changedByName: actorName,
      changedByRole: actorRole,
      changedAt: new Date()
    }),
    StudentEventLog.create({
      studentId,
      type: "task",
      action: "task_status_updated",
      title: `Task ${studentTask.status}`,
      description: `${studentTask.title} updated to ${studentTask.status}`,
      meta: {
        taskId: studentTask.taskId,
        status: studentTask.status,
        marks: studentTask.marks,
        maxMarks: studentTask.maxMarks,
        taskNodeType: studentTask.taskNodeType,
        progressSnapshots
      },
      createdBy: actorId,
      createdByName: actorName,
      createdByRole: actorRole,
      createdAt: new Date()
    })
  ]);

  const { syncStudentReadiness } = require("./promotionService");
  await syncStudentReadiness(studentId);
  await syncStudentLevelProgressStats(studentId);

  return studentTask;
};

const syncSyllabusTasksToStudents = async (syllabusVersionId) => {
  const syllabusVersion = await SyllabusVersion.findById(syllabusVersionId).select("sessionId levelId subLevelId");
  if (!syllabusVersion) {
    throw new Error("Syllabus version not found");
  }

  const students = await Student.find({
    syllabusVersionId,
    sessionId: syllabusVersion.sessionId,
    currentLevelId: syllabusVersion.levelId,
    currentSubLevelId: syllabusVersion.subLevelId,
    status: { $in: ACTIVE_STUDENT_STATUSES }
  }).select("_id");

  const results = [];
  for (const student of students) {
    try {
      const result = await assignTasksToStudent(student._id, syllabusVersionId);
      results.push({ success: true, studentId: student._id, ...result });
    } catch (error) {
      results.push({ success: false, studentId: student._id, message: error.message });
    }
  }

  return results;
};

// Sync tasks to ALL active students in a subLevel when new tasks are uploaded.
// Finds the active SyllabusVersion for the subLevel, then assigns tasks to every
// active student currently in that subLevel — regardless of whether they already
// have a syllabusVersionId set.
const syncTasksToSubLevelStudents = async (syllabusVersionId) => {
  const syllabusVersion = await SyllabusVersion.findById(syllabusVersionId)
    .select("sessionId levelId subLevelId status");
  if (!syllabusVersion) throw new Error("Syllabus version not found");

  // Find all active students currently in this subLevel
  const students = await Student.find({
    currentSubLevelId: syllabusVersion.subLevelId,
    currentLevelId:    syllabusVersion.levelId,
    status:            { $in: ACTIVE_STUDENT_STATUSES }
  }).select("_id syllabusVersionId");

  if (students.length === 0) return [];

  // Pin syllabusVersionId on students who don't have it set yet
  const unpinned = students.filter(
    (s) => !s.syllabusVersionId || s.syllabusVersionId.toString() !== syllabusVersionId.toString()
  );
  if (unpinned.length > 0) {
    await Student.updateMany(
      { _id: { $in: unpinned.map((s) => s._id) } },
      { $set: { syllabusVersionId } }
    );
  }

  const results = [];
  for (const student of students) {
    try {
      const result = await assignTasksToStudent(student._id, syllabusVersionId);
      results.push({ success: true, studentId: student._id, ...result });
    } catch (error) {
      results.push({ success: false, studentId: student._id, message: error.message });
    }
  }
  return results;
};

const syncStudentLevelProgressStats = async (studentId) => {
  try {
    const Student = require("../models/student/Student");
    const StudentTask = require("../models/syllabus/StudentTask");
    const StudentLevelProgress = require("../models/student/StudentLevelProgress");

    const student = await Student.findById(studentId).select("sessionId currentLevelId currentSubLevelId syllabusVersionId");
    if (!student) return;

    const tasks = await StudentTask.find({
      studentId,
      syllabusVersionId: student.syllabusVersionId,
      subLevelId: student.currentSubLevelId,
      isActive: true
    }).select("status");

    const totalTasks = tasks.length;
    const completedTasksCount = tasks.filter(t => t.status === "completed").length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

    await StudentLevelProgress.findOneAndUpdate(
      { studentId, subLevelId: student.currentSubLevelId },
      {
        $set: {
          totalTasks,
          completedTasksCount,
          completionPercentage,
          status: completionPercentage === 100 ? "completed" : "in_progress",
          ...(completionPercentage === 100 ? { completedAt: new Date() } : {})
        },
        $setOnInsert: {
          studentId,
          sessionId: student.sessionId,
          levelId: student.currentLevelId,
          subLevelId: student.currentSubLevelId,
          startedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    // Suppress errors to not block main thread
  }
};

module.exports = {
  buildTaskEntries,
  assignTasksToStudent,
  assignTasksToMultipleStudents,
  assignSelectedTasksToStudents,
  assignTasksToSessionLevel,
  getStudentTasks,
  getStudentTaskSummary,
  createProgressSnapshot,
  updateStudentTaskStatus,
  syncSyllabusTasksToStudents,
  syncTasksToSubLevelStudents,
};
