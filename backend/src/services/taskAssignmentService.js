const mongoose = require("mongoose");
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

const buildTaskEntries = async (syllabusVersionId, expectedSessionId = null) => {
  const tasks = await Task.find({ syllabusVersionId, isActive: true })
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  const expectedSessionStr = expectedSessionId ? expectedSessionId.toString() : null;
  const filteredTasks = expectedSessionStr
    ? tasks.filter((task) => !task.sessionId || task.sessionId.toString() === expectedSessionStr)
    : tasks;

  return filteredTasks.map((task) => ({
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
    course: task.course || "All",
    courses: task.courses || (task.course ? [task.course] : ["All"]),
    maxMarks: typeof task.maxMarks === "number" ? Math.min(5, Math.max(1, task.maxMarks)) : 5,
    assignTo: task.assignTo || "all",
    specificStudentIds: task.specificStudentIds || []
  }));
};

const CANONICAL_COURSE_MAP = {
  "itegdiploma": "itegdiploma",
  "itdiploma": "itegdiploma",
  "bca": "bca",
  "bba": "bba",
  "b.com(ca)": "b.com(ca)",
  "bcom(ca)": "b.com(ca)",
  "b.com": "b.com(ca)",
  "bcom": "b.com(ca)",
  "bsc(bt)": "bsc(bt)",
  "bsc(biotechnology)": "bsc(bt)",
  "bscbiotechnology": "bsc(bt)",
  "bscbiotecnology": "bsc(bt)",
  "bsc(micro)": "bsc(micro)",
  "bsc(microbiology)": "bsc(micro)",
  "bscmicrobiology": "bsc(micro)",
  "b.tech(cs)": "b.tech(cs)",
  "btech(cs)": "b.tech(cs)",
  "b.tech(aiml)": "b.tech(aiml)",
  "btech(aiml)": "b.tech(aiml)",
  "b.tech(it)": "b.tech(it)",
  "btech(it)": "b.tech(it)",
};

const normalizeCourse = (val) => {
  if (!val) return "";
  const clean = String(val).trim().toLowerCase().replace(/\s+/g, "");
  return CANONICAL_COURSE_MAP[clean] || clean;
};

const matchesCourse = (studentCourse, targetCourses, targetCourse) => {
  const list = Array.isArray(targetCourses) && targetCourses.length > 0
    ? targetCourses.map((c) => String(c).trim())
    : (targetCourse ? String(targetCourse).split(",").map((c) => c.trim()) : ["All"]);
  if (list.includes("All")) return true;
  if (!studentCourse) return false;

  const sNorm = normalizeCourse(studentCourse);
  return list.some((c) => {
    const cNorm = normalizeCourse(c);
    if (cNorm === sNorm) return true;
    if (cNorm === "b.tech" || cNorm === "btech") {
      return sNorm.startsWith("b.tech") || sNorm.startsWith("btech");
    }
    return false;
  });
};

const getActorDetails = (actor = null) => ({
  id: actor?.id || actor?._id || null,
  name: actor?.name || "",
  role: actor?.role || ""
});

const getSnapshotContext = async ({ student, syllabusVersionId }) => {
  const [session, level, subLevel, syllabusVersion] = await Promise.all([
    student?.sessionId ? Session.findById(student.sessionId).select("name") : null,
    student?.currentLevelId ? Level.findById(student.currentLevelId).select("name") : null,
    student?.currentSubLevelId ? SubLevel.findById(student.currentSubLevelId).select("name") : null,
    syllabusVersionId ? SyllabusVersion.findById(syllabusVersionId).select("title version") : null
  ]);

  return {
    sessionId: student?.sessionId || null,
    sessionName: session?.name || "",
    levelId: student?.currentLevelId || null,
    levelName: level?.name || "",
    subLevelId: student?.currentSubLevelId || null,
    subLevelName: subLevel?.name || "",
    syllabusVersionId: syllabusVersionId || null,
    syllabusVersionTitle: syllabusVersion?.title || "",
    syllabusVersionCode: syllabusVersion?.version || ""
  };
};

const toTaskEntryMap = async (syllabusVersionId) => {
  const entries = await buildTaskEntries(syllabusVersionId);
  return new Map(entries.map((entry) => [entry.taskId.toString(), entry]));
};

const toIdStr = (val) => {
  if (!val) return null;
  return (val._id || val).toString();
};

const isUiUxLevel = async (levelId) => {
  if (!levelId) return false;
  const level = await Level.findById(levelId)
    .populate("subDepartmentId", "name")
    .select("subDepartmentId")
    .lean();
  const subDeptName = level?.subDepartmentId?.name || "";
  return /ui\s*\/?\s*ux/i.test(subDeptName);
};

const isSessionExempt = (student, options = {}) =>
  Boolean(options.allowSessionMismatch || student?.isUIUX);

const selectBestSyllabusForStudent = (versions, studentCourse, options = {}) => {
  const { strictCourseMatch = false } = options;
  if (!Array.isArray(versions) || versions.length === 0) return null;
  if (!studentCourse) return versions[0];

  const exactMatch = versions.find((v) => matchesCourse(studentCourse, v.courses, v.course));
  if (exactMatch) return exactMatch;
  return strictCourseMatch ? null : versions[0];
};

const filterStudentTasksBySession = async (tasks, student) => {
  if (!Array.isArray(tasks) || tasks.length === 0) return [];
  const studentSessionStr = toIdStr(student?.sessionId);
  if (!student || student.isUIUX || student.isFTP || !studentSessionStr) {
    return tasks;
  }

  // Batch-check syllabusVersionIds (populated or raw ObjectIds) and general Task master docs
  const svIdSet = new Set();
  const nonSvTaskIdSet = new Set();

  for (const t of tasks) {
    const rawSv = t.syllabusVersionId;
    if (rawSv) {
      if (typeof rawSv === "object" && rawSv.sessionId) {
        continue; // Already populated with sessionId
      }
      const idStr = toIdStr(rawSv);
      if (idStr && mongoose.Types.ObjectId.isValid(idStr)) {
        svIdSet.add(idStr);
      }
    } else if (t.taskId) {
      const tidStr = toIdStr(t.taskId);
      if (tidStr && mongoose.Types.ObjectId.isValid(tidStr)) {
        nonSvTaskIdSet.add(tidStr);
      }
    }
  }

  const [svDocs, masterTaskDocs] = await Promise.all([
    svIdSet.size > 0
      ? SyllabusVersion.find({ _id: { $in: Array.from(svIdSet) } }).select("_id sessionId").lean()
      : [],
    nonSvTaskIdSet.size > 0
      ? Task.find({ _id: { $in: Array.from(nonSvTaskIdSet) } }).select("_id sessionId").lean()
      : []
  ]);

  const svSessionMap = new Map(
    svDocs.map((sv) => [sv._id.toString(), toIdStr(sv.sessionId)])
  );
  const taskSessionMap = new Map(
    masterTaskDocs.map((mt) => [mt._id.toString(), toIdStr(mt.sessionId)])
  );

  return tasks.filter((t) => {
    const rawSv = t.syllabusVersionId;
    if (rawSv) {
      let svSessionStr = null;
      if (typeof rawSv === "object" && rawSv.sessionId) {
        svSessionStr = toIdStr(rawSv.sessionId);
      } else {
        const svIdStr = toIdStr(rawSv);
        svSessionStr = svSessionMap.get(svIdStr) || null;
      }
      if (svSessionStr && svSessionStr !== studentSessionStr) {
        return false;
      }
    } else if (t.taskId) {
      const tidStr = toIdStr(t.taskId);
      const mtSessionStr = taskSessionMap.get(tidStr) || null;
      if (mtSessionStr && mtSessionStr !== studentSessionStr) {
        return false;
      }
    }

    const taskSessionStr = toIdStr(t.sessionId);
    if (taskSessionStr && taskSessionStr !== studentSessionStr) {
      return false;
    }

    return true;
  });
};

const getSyllabusVersionForStudent = async (student, syllabusVersionId, options = {}) => {
  const allowFallback = isSessionExempt(student, options);
  const studentSessionId = student.sessionId?._id || student.sessionId || null;
  const studentSessionStr = toIdStr(studentSessionId);

  if (syllabusVersionId) {
    const version = await SyllabusVersion.findOne({
      _id: syllabusVersionId,
      isActive: true
    });

    if (!version) {
      throw new Error("Syllabus version not found");
    }

    if (
      !allowFallback &&
      studentSessionStr &&
      version.sessionId &&
      toIdStr(version.sessionId) !== studentSessionStr
    ) {
      throw new Error("Student session does not match the syllabus version session");
    }

    return version;
  }

  if (student.syllabusVersionId) {
    const version = await SyllabusVersion.findOne({
      _id: student.syllabusVersionId,
      isActive: true
    });

    const matchesLevel =
      !student.currentSubLevelId ||
      (version?.subLevelId && toIdStr(version.subLevelId) === toIdStr(student.currentSubLevelId));
    const matchesSession =
      allowFallback ||
      !studentSessionStr ||
      !version?.sessionId ||
      toIdStr(version.sessionId) === studentSessionStr;

    if (version && matchesLevel && matchesSession) {
      return version;
    }
  }

  const strictFilter = {
    ...(studentSessionId ? { sessionId: studentSessionId } : {}),
    levelId: student.currentLevelId?._id || student.currentLevelId,
    subLevelId: student.currentSubLevelId?._id || student.currentSubLevelId,
    status: "active",
    isActive: true
  };

  const sessionVersions = await SyllabusVersion.find(strictFilter).sort({ createdAt: -1 });
  let activeVersion = selectBestSyllabusForStudent(sessionVersions, student.course);

  if (!activeVersion && allowFallback) {
    const fallbackVersions = await SyllabusVersion.find({
      levelId: student.currentLevelId?._id || student.currentLevelId,
      subLevelId: student.currentSubLevelId?._id || student.currentSubLevelId,
      status: "active",
      isActive: true
    }).sort({ createdAt: -1 });
    activeVersion = selectBestSyllabusForStudent(fallbackVersions, student.course);
  }

  if (!activeVersion) {
    throw new Error("No active syllabus found for this student");
  }

  return activeVersion;
};

const validateStudentVersionMatch = (student, syllabusVersion, options = {}) => {
  const studentSessionStr = toIdStr(student.sessionId);
  const svSessionStr = toIdStr(syllabusVersion.sessionId);
  if (
    !options.allowSessionMismatch &&
    !student.isUIUX &&
    studentSessionStr &&
    svSessionStr &&
    studentSessionStr !== svSessionStr
  ) {
    throw new Error("Student session does not match the syllabus version session");
  }

  if (
    !options.allowLevelMismatch &&
    !student.isFTP &&
    !student.isUIUX &&
    (toIdStr(student.currentLevelId) !== toIdStr(syllabusVersion.levelId) ||
    toIdStr(student.currentSubLevelId) !== toIdStr(syllabusVersion.subLevelId))
  ) {
    throw new Error("Student is not currently in the level/sublevel of this syllabus version");
  }
};

const buildStudentTaskPayload = (student, syllabusVersion, entry, assignmentMeta = {}) => ({
  sessionId: student.sessionId,
  levelId: syllabusVersion.levelId,
  subLevelId: syllabusVersion.subLevelId,
  syllabusVersionId: syllabusVersion._id,
  taskId: entry.taskId,
  course: entry.course || "All",
  courses: entry.courses || (entry.course ? [entry.course] : ["All"]),
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
  maxMarks: typeof entry.maxMarks === "number" ? Math.min(5, Math.max(1, entry.maxMarks)) : 5,
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
  const student = options.student || await Student.findById(studentId);

  if (!student) {
    throw new Error("Student not found");
  }

  const syllabusVersion = options.syllabusVersion || await getSyllabusVersionForStudent(student, syllabusVersionId, options);
  validateStudentVersionMatch(student, syllabusVersion, options);

  // If syllabus version is targeted to specific course(s), ensure student matches
  if (!matchesCourse(student.course, syllabusVersion.courses, syllabusVersion.course)) {
    return {
      studentId: student._id,
      syllabusVersionId: syllabusVersion._id,
      createdCount: 0,
      updatedCount: 0,
      totalTasks: 0,
      skippedReason: "Course mismatch with syllabus version"
    };
  }

  const expectedSessionId = isSessionExempt(student, options) ? null : (syllabusVersion.sessionId || student.sessionId);
  const taskEntries = options.taskEntries || await buildTaskEntries(syllabusVersion._id, expectedSessionId);

  if (taskEntries.length === 0) {
    throw new Error("No active tasks found in syllabus");
  }

  const existingTasks = await StudentTask.find({
    studentId: student._id,
    syllabusVersionId: syllabusVersion._id
  }).select("_id taskId assignedType");

  const existingMap = new Map(
    existingTasks.map((item) => [item.taskId.toString(), item])
  );

  let createdCount = 0;
  let updatedCount = 0;
  let firstCreatedTitle = "";
  const bulkOps = [];
  const baseAssignedMs = Date.now();

  for (let entryIdx = 0; entryIdx < taskEntries.length; entryIdx++) {
    const entry = taskEntries[entryIdx];

    // Check if task is restricted to specific students
    if (entry.assignTo === "specific" && Array.isArray(entry.specificStudentIds) && entry.specificStudentIds.length > 0) {
      const studentIdStr = student._id.toString();
      if (!entry.specificStudentIds.some((id) => (id.toString ? id.toString() : String(id)) === studentIdStr)) {
        continue;
      }
    }

    // Course-wise task assignment check (e.g. BBA vs B.Com)
    if (!matchesCourse(student.course, entry.courses, entry.course)) {
      continue; // Skip task not matching student's course
    }

    const payload = buildStudentTaskPayload(student, syllabusVersion, entry, {
      assignedType: "auto",
      assignedAt: new Date(baseAssignedMs + entryIdx)
    });

    const existing = existingMap.get(entry.taskId.toString());

    if (existing) {
      delete payload.assignedAt;
      if (existing.assignedType === "manual") {
        delete payload.assignedType;
        delete payload.assignedBy;
        delete payload.assignedByName;
        delete payload.assignedByRole;
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: existing._id },
          update: { $set: payload }
        }
      });
      updatedCount += 1;
      continue;
    }

    bulkOps.push({
      insertOne: {
        document: {
          studentId: student._id,
          taskId: entry.taskId,
          ...payload
        }
      }
    });
    if (!firstCreatedTitle && entry.title) {
      firstCreatedTitle = entry.title;
    }
    createdCount += 1;
  }

  if (bulkOps.length > 0) {
    await StudentTask.bulkWrite(bulkOps, { ordered: true });
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

  // Clean up any stale cross-session syllabus tasks previously assigned in this sublevel
  if (!isSessionExempt(student, options) && !student.isFTP && student.sessionId && syllabusVersion.subLevelId) {
    const otherSvIds = await StudentTask.distinct("syllabusVersionId", {
      studentId: student._id,
      subLevelId: syllabusVersion.subLevelId,
      syllabusVersionId: { $ne: null, $ne: syllabusVersion._id },
      isActive: true
    });
    if (otherSvIds.length > 0) {
      const studentSessionObjId = student.sessionId?._id || student.sessionId;
      const foreignSvs = await SyllabusVersion.find({
        _id: { $in: otherSvIds },
        sessionId: { $ne: null, $ne: studentSessionObjId }
      }).select("_id").lean();
      if (foreignSvs.length > 0) {
        await StudentTask.updateMany(
          {
            studentId: student._id,
            subLevelId: syllabusVersion.subLevelId,
            syllabusVersionId: { $in: foreignSvs.map((s) => s._id) }
          },
          { $set: { isActive: false } }
        );
      }
    }
  }

  if (!student.syllabusVersionId || student.syllabusVersionId.toString() !== syllabusVersion._id.toString()) {
    student.syllabusVersionId = syllabusVersion._id;
    await student.save();
  }

  await syncStudentLevelProgressStats(student._id);

  if (!options.skipTaskNotification && createdCount > 0) {
    try {
      const { createNotification } = require("./notificationService");
      createNotification({
        title: createdCount === 1 ? "New Task Assigned" : "New Tasks Assigned",
        message:
          createdCount === 1 && firstCreatedTitle
            ? `Task "${firstCreatedTitle}" has been added to your task board.`
            : `${createdCount} new tasks have been added to your task board.`,
        type: "info",
        category: "task",
        studentId: student._id,
        recipientRole: "student",
        metadata: { syllabusVersionId: syllabusVersion._id, createdCount },
      }).catch((err) => console.error("Task assignment notification error:", err));
    } catch (notifErr) {
      console.error("Failed to trigger task assignment notification:", notifErr);
    }
  }

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
      let firstCreatedTitle = "";

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
        if (!firstCreatedTitle && entry.title) {
          firstCreatedTitle = entry.title;
        }
        createdCount += 1;
      }

      if (createdCount > 0) {
        try {
          const { createNotification } = require("./notificationService");
          createNotification({
            title: createdCount === 1 ? "New Task Assigned" : "New Tasks Assigned",
            message:
              createdCount === 1 && firstCreatedTitle
                ? `Task "${firstCreatedTitle}" has been assigned to you.`
                : `${createdCount} new tasks have been assigned to you.`,
            type: "info",
            category: "task",
            studentId: student._id,
            recipientRole: "student",
            actorId: assignmentMeta.assignedBy,
            actorName: assignmentMeta.assignedByName,
            actorRole: assignmentMeta.assignedByRole,
            metadata: { syllabusVersionId: syllabusVersion._id, createdCount },
          }).catch((err) => console.error("Manual task notification error:", err));
        } catch (notifErr) {
          console.error("Failed to trigger manual task notification:", notifErr);
        }
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
  let effectiveSessionId = sessionId;
  if (!effectiveSessionId && syllabusVersionId) {
    const sv = await SyllabusVersion.findById(syllabusVersionId).select("sessionId").lean();
    effectiveSessionId = sv?.sessionId || null;
  }

  if (!effectiveSessionId) {
    throw new Error("Session ID is required for session-level task assignment");
  }

  const filter = {
    sessionId: effectiveSessionId,
    status: { $in: ACTIVE_STUDENT_STATUSES }
  };

  if (levelId) filter.currentLevelId = levelId;
  if (subLevelId) filter.currentSubLevelId = subLevelId;

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
    assignedAt: 1,
    createdAt: 1,
    _id: 1
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
  try {
    const student = await Student.findById(studentId).select("sessionId currentLevelId currentSubLevelId syllabusVersionId");
    if (!student) {
      return [];
    }

    const effectiveVersionId = syllabusVersionId || student.syllabusVersionId || null;

    const query = {
      studentId,
      isActive: true
    };
    if (student.sessionId) query.sessionId = student.sessionId;
    if (student.currentLevelId) query.levelId = student.currentLevelId;
    if (student.currentSubLevelId) query.subLevelId = student.currentSubLevelId;
    if (effectiveVersionId) query.syllabusVersionId = effectiveVersionId;

    const tasks = await StudentTask.find(query).select("status marks subjectId subjectName");

    // Only create progress snapshots when there are completed tasks
    const completedTasksList = tasks.filter((t) => t.status === "completed");
    if (completedTasksList.length === 0) {
      return [];
    }

    const actorDetails = getActorDetails(actor);
    const context = await getSnapshotContext({ student, syllabusVersionId: effectiveVersionId });

    // Single overall milestone snapshot per completed task state (no duplicate subject snapshot)
    const snapshotData = buildProgressSnapshot({
      tasks,
      actorDetails,
      context,
      snapshotScope: "overall"
    });

    await Student.findByIdAndUpdate(studentId, {
      $set: { updatedAt: new Date() }
    });

    // Check if a snapshot for this student and completion milestone already exists
    const existingSnapshot = await StudentProgressSnapshot.findOne({
      studentId,
      subLevelId: student.currentSubLevelId || context.subLevelId,
      completedTasks: snapshotData.completedTasks,
      snapshotScope: "overall"
    }).sort({ changedAt: -1 });

    let finalDoc;
    if (existingSnapshot) {
      // Update existing snapshot rather than creating a duplicate
      existingSnapshot.totalTasks = snapshotData.totalTasks;
      existingSnapshot.pendingTasks = snapshotData.pendingTasks;
      existingSnapshot.inProgressTasks = snapshotData.inProgressTasks;
      existingSnapshot.averageMarks = snapshotData.averageMarks;
      existingSnapshot.changedBy = actorDetails.changedBy;
      existingSnapshot.changedByName = actorDetails.changedByName;
      existingSnapshot.changedByRole = actorDetails.changedByRole;
      existingSnapshot.changedAt = new Date();
      finalDoc = await existingSnapshot.save();
    } else {
      finalDoc = await StudentProgressSnapshot.create({
        studentId,
        ...snapshotData
      });
    }

    return [finalDoc];
  } catch (snapshotErr) {
    console.warn("createProgressSnapshot warning:", snapshotErr.message);
    return [];
  }
};

const updateStudentTaskStatus = async (studentId, taskId, payload) => {
  const student = await Student.findById(studentId).select("sessionId currentLevelId currentSubLevelId syllabusVersionId");
  if (!student) {
    throw new Error("Student not found");
  }

  let studentTask = await StudentTask.findOne({
    studentId,
    taskId,
    sessionId: student.sessionId,
    levelId: student.currentLevelId,
    subLevelId: student.currentSubLevelId,
    syllabusVersionId: student.syllabusVersionId,
    isActive: true
  });

  if (!studentTask) {
    studentTask = await StudentTask.findOne({
      studentId,
      $or: [{ taskId }, { _id: taskId }],
      isActive: true
    });
  }

  if (!studentTask) {
    throw new Error("Student task not found");
  }

  const nextStatus = payload.status || studentTask.status;
  const hasExplicitMarks = payload.marks !== undefined;
  const nextMarks = hasExplicitMarks ? payload.marks : studentTask.marks;

  if (nextStatus === "completed" && (nextMarks === null || nextMarks === undefined)) {
    throw new Error("Marks are required when task status is completed");
  }

  if (nextMarks !== null && nextMarks !== undefined) {
    const effectiveMax = Math.min(5, studentTask.maxMarks || 5);
    if (nextMarks > effectiveMax) {
      throw new Error(`Marks cannot exceed maximum marks (${effectiveMax})`);
    }
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

  let progressSnapshots = [];
  // Only create/record progress snapshots when task status is completed
  if (studentTask.status === "completed" || nextStatus === "completed") {
    try {
      progressSnapshots = await createProgressSnapshot(
        studentId,
        studentTask.syllabusVersionId,
        payload.actor,
        studentTask
      );
    } catch (snapErr) {
      console.warn("createProgressSnapshot warning:", snapErr.message);
    }
  }

  const snapshotContext = await getSnapshotContext({
    student,
    syllabusVersionId: studentTask.syllabusVersionId
  });

  const validTaskId = (studentTask.taskId && mongoose.Types.ObjectId.isValid(studentTask.taskId))
    ? studentTask.taskId
    : (studentTask._id && mongoose.Types.ObjectId.isValid(studentTask._id) ? studentTask._id : new mongoose.Types.ObjectId());

  const validSubjectId = (studentTask.subjectId && mongoose.Types.ObjectId.isValid(studentTask.subjectId))
    ? studentTask.subjectId
    : null;

  const validTopicId = (studentTask.topicId && mongoose.Types.ObjectId.isValid(studentTask.topicId))
    ? studentTask.topicId
    : null;

  await Promise.all([
    Student.findByIdAndUpdate(studentId, { $set: { updatedAt: new Date() } }),
    StudentTaskHistory.create({
      studentId,
      ...snapshotContext,
      subjectId: validSubjectId,
      subjectName: studentTask.subjectName || "",
      topicId: validTopicId,
      topicName: studentTask.topicName || "",
      subTopicId: studentTask.subTopicId || null,
      subTopicName: studentTask.subTopicName || "",
      taskId: validTaskId,
      taskTitle: studentTask.title || "",
      taskNodeType: studentTask.taskNodeType || (studentTask.isGeneralTask ? "general" : "topic"),
      status: studentTask.status,
      marks: studentTask.marks,
      maxMarks: studentTask.maxMarks,
      notes: studentTask.notes || "",
      changedBy: actorId,
      changedByName: actorName,
      changedByRole: actorRole,
      changedAt: new Date()
    }).catch(err => console.warn("Task history logging warning:", err.message)),
    StudentEventLog.create({
      studentId,
      type: "task",
      action: "task_status_updated",
      title: `Task ${studentTask.status}`,
      description: `${studentTask.title} updated to ${studentTask.status}`,
      meta: {
        taskId: validTaskId,
        status: studentTask.status,
        marks: studentTask.marks,
        maxMarks: studentTask.maxMarks,
        taskNodeType: studentTask.taskNodeType || (studentTask.isGeneralTask ? "general" : "topic"),
        progressSnapshots
      },
      createdBy: actorId,
      createdByName: actorName,
      createdByRole: actorRole,
      createdAt: new Date()
    }).catch(err => console.warn("Task event log warning:", err.message))
  ]);

  try {
    const { createNotification } = require("./notificationService");
    const statusLabel = studentTask.status === "completed" ? "completed" : studentTask.status === "inProgress" ? "started" : studentTask.status;
    createNotification({
      title: studentTask.status === "completed" ? "Task Completed" : "Task Status Updated",
      message: `Task "${studentTask.title}" has been marked as ${statusLabel}${studentTask.marks ? ` (${studentTask.marks}/${studentTask.maxMarks || 5} marks)` : ""}`,
      type: studentTask.status === "completed" ? "success" : "info",
      category: "task",
      studentId,
      recipientRole: "staff",
      actorId,
      actorName,
      actorRole,
      metadata: { taskId: studentTask._id, status: studentTask.status, marks: studentTask.marks },
    }).catch((err) => console.error("Notification creation error:", err));
  } catch (notifErr) {
    console.error("Failed to trigger task notification:", notifErr);
  }

  const { syncStudentReadiness } = require("./promotionService");
  await syncStudentReadiness(studentId);
  await syncStudentLevelProgressStats(studentId);

  return studentTask;
};

/**
 * Delete an individual task from a specific student's task board.
 * IMPORTANT: This only removes the task for the target student (StudentTask document).
 * Master Task (syllabus) and other students' tasks are NOT affected.
 */
const deleteStudentTaskService = async (studentId, taskId, actor = null) => {
  if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(taskId)) {
    throw new Error("Invalid student ID or task ID");
  }

  const student = await Student.findById(studentId).select("firstName lastName name prkey sessionId currentLevelId currentSubLevelId");
  if (!student) {
    throw new Error("Student not found");
  }

  // Find this student's specific task (by studentTaskId _id or taskId)
  const studentTask = await StudentTask.findOne({
    studentId,
    $or: [{ _id: taskId }, { taskId }]
  });

  if (!studentTask) {
    throw new Error("Task not found on this student's board");
  }

  const taskTitle = studentTask.title || "Task";
  const studentDisplayName = `${student.firstName || student.name || "Student"} ${student.lastName || ""}`.trim();

  // Delete ONLY this student's task document
  await StudentTask.deleteOne({ _id: studentTask._id });

  // Recalculate level progress stats for this student
  await syncStudentLevelProgressStats(studentId).catch(() => {});

  // Audit event log
  try {
    const actorId = actor?.id || actor?._id || null;
    const actorName = actor?.name || "Staff";
    const actorRole = actor?.role || "";

    await StudentEventLog.create({
      studentId,
      type: "task",
      action: "task_deleted_from_board",
      title: "Task Deleted from Student Board",
      description: `Task "${taskTitle}" was deleted from ${studentDisplayName}'s board by ${actorName}`,
      meta: {
        studentTaskId: studentTask._id,
        taskId: studentTask.taskId,
        taskTitle,
        subjectName: studentTask.subjectName,
        status: studentTask.status,
        isExtra: Boolean(studentTask.isExtra)
      },
      createdBy: actorId,
      createdByName: actorName,
      createdByRole: actorRole,
      createdAt: new Date()
    });
  } catch (logErr) {
    console.warn("Failed to create task deletion event log:", logErr.message);
  }

  return {
    success: true,
    message: `Task "${taskTitle}" deleted for ${studentDisplayName}`,
    deletedTaskId: studentTask._id
  };
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
const syncTasksToSubLevelStudents = async (syllabusVersionId, subLevelId = null) => {
  let syllabusVersion = null;
  if (syllabusVersionId) {
    syllabusVersion = await SyllabusVersion.findById(syllabusVersionId)
      .select("sessionId levelId subLevelId status courses course");
  } else if (subLevelId) {
    syllabusVersion = await SyllabusVersion.findOne({
      subLevelId,
      status: "active",
      isActive: true
    }).sort({ createdAt: -1 }).select("sessionId levelId subLevelId status courses course");
  }

  if (!syllabusVersion) throw new Error("Syllabus version not found");

  const effectiveVersionId = syllabusVersion._id;
  const uiUxTarget = await isUiUxLevel(syllabusVersion.levelId);

  if (!syllabusVersion.sessionId && !uiUxTarget) {
    throw new Error("Syllabus version is missing sessionId");
  }

  // Find active students currently in this subLevel belonging to the syllabus version's session
  const studentFilter = {
    currentSubLevelId: syllabusVersion.subLevelId,
    currentLevelId: syllabusVersion.levelId,
    status: { $in: ACTIVE_STUDENT_STATUSES }
  };
  if (syllabusVersion.sessionId && !uiUxTarget) {
    studentFilter.sessionId = syllabusVersion.sessionId;
  }

  const allStudents = await Student.find(studentFilter);

  if (allStudents.length === 0) return [];

  // Filter students who match this syllabus version's course(s)
  const students = allStudents.filter((s) =>
    matchesCourse(s.course, syllabusVersion.courses, syllabusVersion.course)
  );

  if (students.length === 0) return [];

  // Pin syllabusVersionId on students who don't have it set yet
  const unpinned = students.filter(
    (s) => !s.syllabusVersionId || s.syllabusVersionId.toString() !== effectiveVersionId.toString()
  );
  if (unpinned.length > 0) {
    await Student.updateMany(
      { _id: { $in: unpinned.map((s) => s._id) } },
      { $set: { syllabusVersionId: effectiveVersionId } }
    );
  }

  const taskEntries = await buildTaskEntries(
    effectiveVersionId,
    uiUxTarget ? null : syllabusVersion.sessionId
  );

  // Run in concurrency batches of 10
  const CONCURRENCY = 10;
  const results = [];
  for (let i = 0; i < students.length; i += CONCURRENCY) {
    const batch = students.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map((student) =>
        assignTasksToStudent(student._id, effectiveVersionId, {
          student,
          syllabusVersion,
          taskEntries,
          ...(uiUxTarget ? { allowSessionMismatch: true } : {})
        })
      )
    );
    batchResults.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        results.push({ success: true, studentId: batch[idx]._id, ...r.value });
      } else {
        results.push({ success: false, studentId: batch[idx]._id, message: r.reason?.message || "Unknown error" });
      }
    });
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

/**
 * Sync an individual task (general or syllabus) directly to active students in the target sublevel/session/level.
 * @param {Object|String} task - Task document or Task ID
 */
const syncTaskToStudents = async (task, targetStudentIds = null) => {
  const Task = require("../models/syllabus/Task");
  const Student = require("../models/student/Student");
  const StudentTask = require("../models/syllabus/StudentTask");

  const taskDoc = typeof task === "object" && task._id ? task : await Task.findById(task);
  if (!taskDoc || !taskDoc.subLevelId) return { success: false, message: "Task or subLevelId missing" };

  // Find all active students in this sublevel (and session / level if specified)
  const studentQuery = {
    currentSubLevelId: taskDoc.subLevelId,
    status: { $in: ["Active", "active"] }
  };

  const specificIds = targetStudentIds || (taskDoc.assignTo === "specific" ? taskDoc.specificStudentIds : null);
  if (Array.isArray(specificIds) && specificIds.length > 0) {
    const validIds = specificIds.map(id => id.toString ? id.toString() : String(id));
    studentQuery._id = { $in: validIds };
  } else if (taskDoc.assignTo === "specific") {
    return { success: true, count: 0, message: "No specific students specified for this task" };
  }

  let effectiveSessionId = taskDoc.sessionId;
  if (!effectiveSessionId && taskDoc.syllabusVersionId) {
    const parentSv = await SyllabusVersion.findById(taskDoc.syllabusVersionId).select("sessionId").lean();
    effectiveSessionId = parentSv?.sessionId || null;
  }

  const uiUxTarget = await isUiUxLevel(taskDoc.levelId);
  if (effectiveSessionId) {
    if (uiUxTarget) {
      studentQuery.$or = [
        { sessionId: effectiveSessionId },
        { isUIUX: true }
      ];
    } else {
      studentQuery.sessionId = effectiveSessionId;
    }
  }
  if (taskDoc.levelId) {
    studentQuery.currentLevelId = taskDoc.levelId;
  }
  const taskCourses = Array.isArray(taskDoc.courses) && taskDoc.courses.length > 0
    ? taskDoc.courses
    : (taskDoc.course ? String(taskDoc.course).split(",").map(c => c.trim()).filter(Boolean) : ["All"]);

  if (!taskCourses.includes("All")) {
    const courseRegexes = [];
    for (const c of taskCourses) {
      const trimmed = c.trim();
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      courseRegexes.push(new RegExp(`^${escaped}$`, "i"));
      // Add tolerant variants
      if (/b\.?com/i.test(trimmed)) {
        courseRegexes.push(/^B\.?com(\(CA\))?$/i);
      }
      if (/bsc.*bt/i.test(trimmed) || /biotech/i.test(trimmed)) {
        courseRegexes.push(/^BSC(\(BT\)|\(Biotechnology\))$/i);
      }
      if (/bsc.*micro/i.test(trimmed)) {
        courseRegexes.push(/^BSC(\(Micro\)|\(Microbiology\))$/i);
      }
      if (/iteg.*diploma/i.test(trimmed) || /it.*diploma/i.test(trimmed)) {
        courseRegexes.push(/^(ITEG|IT)\s*Diploma$/i);
      }
      if (/b\.?tech$/i.test(trimmed)) {
        courseRegexes.push(/^B\.?Tech.*$/i);
      }
    }
    studentQuery.course = { $in: courseRegexes };
  }

  const students = await Student.find(studentQuery).select("_id course sessionId currentLevelId currentSubLevelId syllabusVersionId");
  if (students.length === 0) {
    return { success: true, count: 0, message: "No matching active students found" };
  }

  const bulkOps = students.map((student) => {
    const payload = {
      sessionId: student.sessionId || taskDoc.sessionId,
      levelId: student.currentLevelId || taskDoc.levelId,
      subLevelId: student.currentSubLevelId || taskDoc.subLevelId,
      syllabusVersionId: taskDoc.syllabusVersionId || student.syllabusVersionId || null,
      course: taskDoc.course || student.course || "All",
      courses: taskCourses,
      subjectId: taskDoc.subjectId || null,
      topicId: taskDoc.topicId || null,
      subTopicId: taskDoc.subTopicId || null,
      subjectName: taskDoc.subjectName || "General",
      topicName: taskDoc.topicName || "General",
      subTopicName: taskDoc.subTopicName || null,
      taskNodeType: taskDoc.taskNodeType || (taskDoc.isGeneralTask ? "general" : "topic"),
      title: taskDoc.title,
      description: taskDoc.description || "",
      type: taskDoc.type || "assignment",
      priority: taskDoc.priority || "medium",
      mandatory: taskDoc.mandatory !== false,
      maxMarks: typeof taskDoc.maxMarks === "number" ? Math.min(5, Math.max(1, taskDoc.maxMarks)) : 5,
      timeDays: taskDoc.timeDays || null,
      dueDate: taskDoc.dueDate || null,
      measurablePoints: taskDoc.measurablePoints || "",
      isGeneralTask: Boolean(taskDoc.isGeneralTask),
      isActive: taskDoc.isActive !== false,
      assignedType: "auto",
      assignedByName: taskDoc.assignedByName || "System",
      assignedAt: taskDoc.createdAt || new Date()
    };

    return {
      updateOne: {
        filter: { studentId: student._id, taskId: taskDoc._id },
        update: {
          $set: payload,
          $setOnInsert: {
            status: "pending",
            marks: null
          }
        },
        upsert: true
      }
    };
  });

  if (bulkOps.length > 0) {
    const bulkRes = await StudentTask.bulkWrite(bulkOps, { ordered: false });
    const upsertedMap = bulkRes?.upsertedIds || {};
    const newlyAssignedIndices = Object.keys(upsertedMap).map(Number).filter((idx) => !Number.isNaN(idx) && students[idx]);
    if (newlyAssignedIndices.length > 0 && taskDoc.isActive !== false) {
      const { createBulkNotifications } = require("./notificationService");
      createBulkNotifications(
        newlyAssignedIndices.map((idx) => ({
          title: "New Task Assigned",
          message: `Task "${taskDoc.title}" has been added to your task board.`,
          type: "info",
          category: "task",
          studentId: students[idx]._id,
          recipientRole: "student",
          actorName: taskDoc.assignedByName || "Faculty",
          metadata: { taskId: taskDoc._id, title: taskDoc.title },
        }))
      ).catch((err) => console.error("Bulk task notification error:", err));
    }
  }

  // Update progress stats for affected students asynchronously
  setImmediate(() => {
    students.forEach((s) => {
      syncStudentLevelProgressStats(s._id).catch(() => {});
    });
  });

  return { success: true, count: students.length };
};

module.exports = {
  buildTaskEntries,
  matchesCourse,
  isUiUxLevel,
  selectBestSyllabusForStudent,
  filterStudentTasksBySession,
  assignTasksToStudent,
  assignTasksToMultipleStudents,
  assignSelectedTasksToStudents,
  assignTasksToSessionLevel,
  getStudentTasks,
  getStudentTaskSummary,
  createProgressSnapshot,
  updateStudentTaskStatus,
  deleteStudentTaskService,
  syncSyllabusTasksToStudents,
  syncTasksToSubLevelStudents,
  syncTaskToStudents,
};
