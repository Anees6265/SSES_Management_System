const Student = require("../models/student/Student");
const mongoose = require("mongoose");
const Level = require("../models/department/Level");
const SubLevel = require("../models/department/SubLevel");
const StudentTask = require("../models/syllabus/StudentTask");
const SyllabusVersion = require("../models/syllabus/SyllabusVersion");
const Session = require("../models/Session");
const StudentEventLog = require("../models/student/StudentEventLog");
const StudentProgressSnapshot = require("../models/student/StudentProgressSnapshot");
const StudentPlacement = require("../models/placement/StudentPlacement");
const { withTransaction } = require("../utils/withTransaction");

const toClientError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getActorId = (actorUser = null) => {
  const actorId = actorUser?.id || actorUser?._id || null;
  return actorId && mongoose.Types.ObjectId.isValid(actorId) ? actorId : null;
};

const markPlacementReady = async (studentId, subDepartmentId) => {
  const placement = await StudentPlacement.findOneAndUpdate(
    { studentId },
    {
      $set: { readinessStatus: "Ready" },
      $setOnInsert: { studentId, subDepartmentId },
    },
    { new: true, upsert: true, runValidators: true }
  );

  return placement;
};

// Called after every task status update.
// If all mandatory tasks in current sublevel are completed -> auto-promote.
// If student has completed all levels -> mark Ready and create placement record.
const syncStudentReadiness = async (studentId) => {
  const student = await Student.findById(studentId).select(
    "currentLevelId currentSubLevelId syllabusVersionId sessionId subDepartmentId status promotionPending"
  );
  if (!student || student.status !== "Active") return;

  // Atomic lock - prevents race condition when two task updates arrive simultaneously
  const locked = await Student.findOneAndUpdate(
    { _id: studentId, promotionPending: false, status: "Active" },
    { $set: { promotionPending: true } },
    { new: false }
  );
  if (!locked) return;

  try {
    const tasks = await StudentTask.find({
      studentId,
      syllabusVersionId: student.syllabusVersionId,
      subLevelId: student.currentSubLevelId,
      isActive: true,
    }).select("status mandatory");

    if (tasks.length === 0) return;

    const mandatoryTasks = tasks.filter((t) => t.mandatory);
    if (mandatoryTasks.length === 0) return;

    const allMandatoryDone = mandatoryTasks.every((t) => t.status === "completed");
    if (!allMandatoryDone) return;

    await promoteToNextSubLevel(studentId, null, { isAuto: true });

  } catch (err) {
    if (err.message.includes("already completed all levels")) {
      const freshStudent = await Student.findById(studentId).select("subDepartmentId");

      const existing = await StudentPlacement.findOne({ studentId });
      if (!existing && freshStudent) {
        await StudentPlacement.create({
          studentId,
          subDepartmentId: freshStudent.subDepartmentId,
          readinessStatus: "Ready",
        });
      } else if (existing && existing.readinessStatus === "Not Ready") {
        existing.readinessStatus = "Ready";
        await existing.save();
      }

      await StudentEventLog.create({
        studentId,
        type: "promotion",
        action: "all_levels_completed",
        title: "All levels completed",
        description: "Student has completed all levels and is ready for placement",
        meta: {},
      });
    }
    // All other errors are silently swallowed - promotion is best-effort on auto-trigger
  } finally {
    await Student.findByIdAndUpdate(studentId, { $set: { promotionPending: false } });
  }
};

// Core promotion logic - used by both auto (syncStudentReadiness) and manual (studentController.promoteStudent).
//
// Flow:
//   1. Find next SubLevel in same Level (by order)
//   2. If none -> find next Level -> first SubLevel of that Level
//   3. Find active SyllabusVersion for new position
//   4. Save exit snapshot of previous sublevel (overall + per-subject)
//   5. Update student position atomically (withTransaction)
//   6. Auto-assign tasks for new sublevel
//   7. Save promotion entry snapshot
//   8. Log promotion event
const promoteToNextSubLevel = async (studentId, actorUser = null, options = {}) => {
  const { isAuto = false } = options;
  const actorId = getActorId(actorUser);

  const student = await Student.findById(studentId);
  if (!student) throw toClientError("Student not found", 404);
  if (student.status !== "Active") throw toClientError("Only active students can be promoted");

  // Validate that the student has completed at least 85% of tasks per subject in the current sublevel
  const currentTasks = await StudentTask.find({
    studentId,
    syllabusVersionId: student.syllabusVersionId,
    subLevelId: student.currentSubLevelId,
    isActive: true,
  });

  if (currentTasks.length > 0) {
    const subjectTasks = {};
    currentTasks.forEach((task) => {
      const subName = task.subjectName || "General";
      if (!subjectTasks[subName]) {
        subjectTasks[subName] = { total: 0, completed: 0 };
      }
      subjectTasks[subName].total++;
      if (task.status === "completed") {
        subjectTasks[subName].completed++;
      }
    });

    const MIN_COMPLETION_PERCENT = 85;
    const failedSubjects = [];

    for (const [subName, stats] of Object.entries(subjectTasks)) {
      const percent = (stats.completed / stats.total) * 100;
      if (percent < MIN_COMPLETION_PERCENT) {
        failedSubjects.push(`${subName} (${Math.round(percent)}% completed, minimum ${MIN_COMPLETION_PERCENT}% required)`);
      }
    }

    if (failedSubjects.length > 0) {
      throw toClientError(
        `Promotion blocked. Student must complete at least ${MIN_COMPLETION_PERCENT}% of tasks in each subject. Failed subjects: ${failedSubjects.join(", ")}`,
        400
      );
    }
  }

  // Step 1: Find next SubLevel in same Level
  const currentSubLevel = await SubLevel.findById(student.currentSubLevelId);
  if (!currentSubLevel) throw toClientError("Current sub-level not found");

  // Automatic "Ready for Drive" transition upon completing Level 2B
  const currentSubName = (currentSubLevel.name || "").toUpperCase();
  if (currentSubName.includes("2B")) {
    await StudentPlacement.findOneAndUpdate(
      { studentId },
      {
        $set: { readinessStatus: "Ready for Drive" },
        $setOnInsert: { studentId, subDepartmentId: student.subDepartmentId }
      },
      { new: true, upsert: true }
    );

    await StudentEventLog.create({
      studentId,
      type: "promotion",
      action: "auto_ready_for_drive",
      title: "Moved to Ready for Drive",
      description: "Student successfully completed Level 2B and was automatically moved to Ready for Drive stage",
      createdBy: actorId,
      createdByName: actorUser?.name || "System",
      createdByRole: actorUser?.role || "system",
    }).catch(() => {});
  }

  let nextSubLevel = await SubLevel.findOne({
    levelId: student.currentLevelId,
    order: { $gt: currentSubLevel.order },
    isActive: true,
  }).sort({ order: 1 });

  let nextLevel = null;
  let promotedToNewLevel = false;

  // Step 2: No next sublevel -> find next Level
  if (!nextSubLevel) {
    const currentLevel = await Level.findById(student.currentLevelId);
    if (!currentLevel) throw toClientError("Current level not found");

    nextLevel = await Level.findOne({
      subDepartmentId: student.subDepartmentId,
      order: { $gt: currentLevel.order },
      isActive: true,
    }).sort({ order: 1 });

    if (!nextLevel) {
      await markPlacementReady(studentId, student.subDepartmentId);

      await StudentEventLog.create({
        studentId,
        type: "promotion",
        action: isAuto ? "auto_all_levels_completed" : "manual_all_levels_completed",
        title: "All levels completed",
        description: "Student has completed all levels and is ready for placement",
        meta: { placementReady: true, isAuto },
        createdBy: actorId,
        createdByName: actorUser?.name || "",
        createdByRole: actorUser?.role || "",
      });

      return {
        promotedToNewLevel: false,
        completedAllLevels: true,
        placementReady: true,
        newLevelId: student.currentLevelId,
        newSubLevelId: student.currentSubLevelId,
        newSyllabusVersionId: student.syllabusVersionId,
        tasksAssigned: 0,
        isAuto,
      };
    }

    nextSubLevel = await SubLevel.findOne({
      levelId: nextLevel._id,
      isActive: true,
    }).sort({ order: 1 });

    if (!nextSubLevel) throw toClientError("No active sub-level found in next level");
    promotedToNewLevel = true;
  }

  const targetLevelId = promotedToNewLevel ? nextLevel._id : student.currentLevelId;

  // Step 3: Find active SyllabusVersion for new position
  const latestSession = await Session.findOne({ isActive: true }).sort({ createdAt: -1 });
  if (!latestSession) throw toClientError("No active session found");
  const targetSessionId = student.sessionId || latestSession._id;

  const newSyllabus = await SyllabusVersion.findOne({
    sessionId: targetSessionId,
    levelId: targetLevelId,
    subLevelId: nextSubLevel._id,
    status: "active",
    isActive: true,
  }).sort({ createdAt: -1 });

  if (!newSyllabus) throw toClientError("No active syllabus found for the next sub-level");

  const prevLevelId = student.currentLevelId;
  const prevSubLevelId = student.currentSubLevelId;
  const prevSyllabusVersionId = student.syllabusVersionId;

  // Step 4: Save exit snapshot of previous sublevel
  try {
    const prevTasks = await StudentTask.find({
      studentId,
      syllabusVersionId: prevSyllabusVersionId,
      subLevelId: prevSubLevelId,
      isActive: true,
    }).select("status marks subjectId subjectName");

    const [prevSession, prevLevel, prevSubLevel, prevSyllabus] = await Promise.all([
      Session.findById(student.sessionId).select("name"),
      Level.findById(prevLevelId).select("name"),
      SubLevel.findById(prevSubLevelId).select("name"),
      SyllabusVersion.findById(prevSyllabusVersionId).select("title version"),
    ]);

    const completedTasks = prevTasks.filter((t) => t.status === "completed");
    const completedWithMarks = completedTasks.filter((t) => typeof t.marks === "number");
    const averageMarks =
      completedWithMarks.length > 0
        ? Number((completedWithMarks.reduce((s, t) => s + t.marks, 0) / completedWithMarks.length).toFixed(2))
        : 0;

    const baseContext = {
      sessionId: student.sessionId,
      sessionName: prevSession?.name || "",
      levelId: prevLevelId,
      levelName: prevLevel?.name || "",
      subLevelId: prevSubLevelId,
      subLevelName: prevSubLevel?.name || "",
      syllabusVersionId: prevSyllabusVersionId,
      syllabusVersionTitle: prevSyllabus?.title || "",
      syllabusVersionCode: prevSyllabus?.version || "",
    };

    const snapshotsToSave = [
      {
        studentId,
        snapshotScope: "overall",
        ...baseContext,
        totalTasks: prevTasks.length,
        completedTasks: completedTasks.length,
        pendingTasks: prevTasks.filter((t) => t.status === "pending").length,
        inProgressTasks: prevTasks.filter((t) => t.status === "inProgress").length,
        averageMarks,
        changedBy: actorId,
        changedByName: actorUser?.name || "",
        changedByRole: actorUser?.role || "",
        changedAt: new Date(),
      },
    ];

    const subjectMap = {};
    prevTasks.forEach((t) => {
      const key = t.subjectId?.toString();
      if (!key) return;
      if (!subjectMap[key])
        subjectMap[key] = { subjectId: t.subjectId, subjectName: t.subjectName, tasks: [] };
      subjectMap[key].tasks.push(t);
    });

    Object.values(subjectMap).forEach(({ subjectId, subjectName, tasks }) => {
      const sDone = tasks.filter((t) => t.status === "completed");
      const sMarks = sDone.filter((t) => typeof t.marks === "number");
      snapshotsToSave.push({
        studentId,
        snapshotScope: "subject",
        ...baseContext,
        subjectId,
        subjectName,
        totalTasks: tasks.length,
        completedTasks: sDone.length,
        pendingTasks: tasks.filter((t) => t.status === "pending").length,
        inProgressTasks: tasks.filter((t) => t.status === "inProgress").length,
        averageMarks:
          sMarks.length > 0
            ? Number((sMarks.reduce((s, t) => s + t.marks, 0) / sMarks.length).toFixed(2))
            : 0,
        changedBy: actorId,
        changedByName: actorUser?.name || "",
        changedByRole: actorUser?.role || "",
        changedAt: new Date(),
      });
    });

    await StudentProgressSnapshot.insertMany(snapshotsToSave);

    try {
      const StudentLevelProgress = require("../models/student/StudentLevelProgress");
      await StudentLevelProgress.findOneAndUpdate(
        { studentId, subLevelId: prevSubLevelId },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
            totalTasks: prevTasks.length,
            completedTasksCount: completedTasks.length,
            completionPercentage: prevTasks.length > 0 ? Math.round((completedTasks.length / prevTasks.length) * 100) : 0
          },
          $setOnInsert: {
            studentId,
            sessionId: student.sessionId,
            levelId: prevLevelId,
            subLevelId: prevSubLevelId,
            startedAt: new Date()
          }
        },
        { upsert: true, new: true }
      );
    } catch (lvlProgressErr) {
      // Must never block promotion
    }

    // Automatic Report Card population for completed sublevel
    try {
      const StudentReportCard = require("../models/student/studentReportCard");
      let reportCard = await StudentReportCard.findOne({ studentRef: studentId });
      
      const actorName = actorUser?.name || "System";
      if (!reportCard) {
        reportCard = new StudentReportCard({
          studentRef: studentId,
          batchYear: prevSession?.name || new Date().getFullYear().toString(),
          generatedByName: actorName,
          templateType: "ITEG_STANDARD",
          dynamicSections: []
        });
      }

      const allDeptLevels = await Level.find({ subDepartmentId: student.subDepartmentId, isActive: true }).sort({ order: 1 });
      const allDeptLevelIds = allDeptLevels.map(l => l._id);
      const allDeptSubLevels = await SubLevel.find({ levelId: { $in: allDeptLevelIds }, isActive: true }).lean();
      
      // Sort sublevels by level order, then by sublevel order
      allDeptSubLevels.sort((a, b) => {
        const lvlA = allDeptLevels.find(l => l._id.toString() === a.levelId.toString());
        const lvlB = allDeptLevels.find(l => l._id.toString() === b.levelId.toString());
        if (lvlA && lvlB && lvlA.order !== lvlB.order) {
          return lvlA.order - lvlB.order;
        }
        return a.order - b.order;
      });

      let levelProgressSec = reportCard.dynamicSections.find(
        (s) => s.sectionName === "Level Progress" || s.sectionType === "LevelProgressTable"
      );

      if (!levelProgressSec) {
        levelProgressSec = {
          sectionName: "Level Progress",
          sectionType: "LevelProgressTable",
          items: []
        };
        reportCard.dynamicSections.push(levelProgressSec);
      }

      const itemsMap = new Map();
      if (levelProgressSec.items && levelProgressSec.items.length > 0) {
        levelProgressSec.items.forEach(item => {
          itemsMap.set(item.itemName.trim().toUpperCase(), item);
        });
      }

      const prevSubName = (prevSubLevel?.name || "").trim().toUpperCase();
      const prevPercent = prevTasks.length > 0 ? Math.round((completedTasks.length / prevTasks.length) * 100) : 100;
      const prevRating = averageMarks > 0 ? averageMarks.toFixed(2) : "—";
      const prevLvlOrder = prevLevel?.order || 1;

      itemsMap.set(prevSubName, {
        itemName: prevSubLevel?.name || "1A",
        value: "Completed",
        score: prevPercent,
        remark: prevRating,
        maxMarks: prevLvlOrder
      });

      const nextSubName = (nextSubLevel?.name || "").trim().toUpperCase();
      const nextLvlOrder = (promotedToNewLevel ? nextLevel?.order : prevLevel?.order) || 1;
      const existingNext = itemsMap.get(nextSubName);
      if (!existingNext || existingNext.value !== "Completed") {
        itemsMap.set(nextSubName, {
          itemName: nextSubLevel?.name || "1B",
          value: "Current",
          score: 0,
          remark: "—",
          maxMarks: nextLvlOrder
        });
      }

      allDeptSubLevels.forEach(sl => {
        const nameKey = (sl.name || "").trim().toUpperCase();
        if (!itemsMap.has(nameKey)) {
          const lvl = allDeptLevels.find(l => l._id.toString() === sl.levelId.toString());
          itemsMap.set(nameKey, {
            itemName: sl.name,
            value: "Upcoming",
            score: 0,
            remark: "—",
            maxMarks: lvl?.order || 1
          });
        }
      });

      const sortedItems = [];
      allDeptSubLevels.forEach(sl => {
        const nameKey = (sl.name || "").trim().toUpperCase();
        if (itemsMap.has(nameKey)) {
          sortedItems.push(itemsMap.get(nameKey));
        }
      });

      levelProgressSec.items = sortedItems;
      await reportCard.save({ validateBeforeSave: false });
    } catch (rcErr) {
      console.error("Auto report card update failed on promotion:", rcErr.message);
    }
  } catch (snapErr) {
    // Snapshot failure must never block promotion
  }

  // Step 5: Update student position atomically
  // withTransaction falls back gracefully on standalone MongoDB (local dev)
  await withTransaction(async (session) => {
    student.currentLevelId = targetLevelId;
    student.currentSubLevelId = nextSubLevel._id;
    student.syllabusVersionId = newSyllabus._id;
    student.sessionId = targetSessionId;
    await student.save({ session });
  });

  // Step 6: Auto-assign tasks for new sublevel
  // Inline require avoids circular dependency at module load time
  let tasksAssigned = 0;
  try {
    const { assignTasksToStudent } = require("./taskAssignmentService");
    const result = await assignTasksToStudent(student._id, newSyllabus._id);
    tasksAssigned = result.totalTasks;
  } catch (err) {
    // Task assignment failure must never block promotion
  }

  // Step 7: Save promotion entry snapshot
  try {
    const [newLevelDoc, newSubLevelDoc, newSessionDoc, newSyllabusDoc] = await Promise.all([
      Level.findById(targetLevelId).select("name"),
      SubLevel.findById(nextSubLevel._id).select("name"),
      Session.findById(targetSessionId).select("name"),
      SyllabusVersion.findById(newSyllabus._id).select("title version"),
    ]);

    await StudentProgressSnapshot.create({
      studentId,
      snapshotScope: "promotion",
      sessionId: targetSessionId,
      sessionName: newSessionDoc?.name || "",
      levelId: targetLevelId,
      levelName: newLevelDoc?.name || "",
      subLevelId: nextSubLevel._id,
      subLevelName: newSubLevelDoc?.name || "",
      syllabusVersionId: newSyllabus._id,
      syllabusVersionTitle: newSyllabusDoc?.title || "",
      syllabusVersionCode: newSyllabusDoc?.version || "",
      subjectId: null,
      subjectName: "",
      totalTasks: tasksAssigned,
      completedTasks: 0,
      pendingTasks: tasksAssigned,
      inProgressTasks: 0,
      averageMarks: 0,
      changedBy: actorId,
      changedByName: actorUser?.name || "",
      changedByRole: actorUser?.role || "",
      changedAt: new Date(),
    });
  } catch (snapErr) {
    // Snapshot failure must never block promotion
  }

  // Step 8: Log promotion event
  await StudentEventLog.create({
    studentId,
    type: "promotion",
    action: isAuto ? "auto_promoted" : "manual_promoted",
    title: `Promoted to ${promotedToNewLevel ? "new level" : "next sub-level"}`,
    description: `Student moved from SubLevel ${prevSubLevelId} to ${nextSubLevel._id}`,
    meta: {
      prevLevelId,
      prevSubLevelId,
      prevSyllabusVersionId,
      newLevelId: targetLevelId,
      newSubLevelId: nextSubLevel._id,
      newSyllabusVersionId: newSyllabus._id,
      promotedToNewLevel,
      tasksAssigned,
      isAuto,
    },
    createdBy: actorId,
    createdByName: actorUser?.name || "",
    createdByRole: actorUser?.role || "",
  });

  return {
    promotedToNewLevel,
    newLevelId: targetLevelId,
    newSubLevelId: nextSubLevel._id,
    newSyllabusVersionId: newSyllabus._id,
    tasksAssigned,
    isAuto,
  };
};

module.exports = { syncStudentReadiness, promoteToNextSubLevel };
