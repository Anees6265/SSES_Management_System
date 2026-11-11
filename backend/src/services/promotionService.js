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

    let minCompletionPercent = 85;
    if (student.subDepartmentId) {
      try {
        const SubDepartment = require("../models/department/SubDepartment");
        const Department = require("../models/department/Department");
        const subDept = await SubDepartment.findById(student.subDepartmentId).select("departmentId");
        if (subDept?.departmentId) {
          const dept = await Department.findById(subDept.departmentId).select("levelPassingCriteria");
          if (dept?.levelPassingCriteria?.minTaskCompletion) {
            minCompletionPercent = dept.levelPassingCriteria.minTaskCompletion;
          }
        }
      } catch (err) {
        console.warn("Could not fetch department passing criteria, defaulting to 85%:", err.message);
      }
    }

    const failedSubjects = [];

    for (const [subName, stats] of Object.entries(subjectTasks)) {
      const percent = (stats.completed / stats.total) * 100;
      if (percent < minCompletionPercent) {
        failedSubjects.push(`${subName} (${Math.round(percent)}% completed, minimum ${minCompletionPercent}% required)`);
      }
    }

    if (failedSubjects.length > 0) {
      throw toClientError(
        `Promotion blocked. Student must complete at least ${minCompletionPercent}% of tasks in each subject. Failed subjects: ${failedSubjects.join(", ")}`,
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

    let targetSubDeptId = student.subDepartmentId;
    if (student.isUIUX) {
      const SubDepartment = require("../models/department/SubDepartment");
      const uiuxSubDept = await SubDepartment.findOne({ name: /UI\/UX|UIUX/i });
      if (uiuxSubDept) {
        targetSubDeptId = uiuxSubDept._id;
      }
    }

    nextLevel = await Level.findOne({
      subDepartmentId: targetSubDeptId,
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
            promotedBy: actorId,
            promotedByName: actorUser?.name || (isAuto ? "System (Auto Promotion)" : "Faculty Evaluator"),
            promotedByRole: actorUser?.role || (isAuto ? "system" : "faculty"),
            promotedAt: new Date(),
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
      
      const actorName = actorUser?.name && actorUser.name.toLowerCase() !== "system" ? actorUser.name : "Faculty Evaluator";
      if (!reportCard) {
        reportCard = new StudentReportCard({
          studentRef: studentId,
          batchYear: student.batchYear || prevSession?.name || new Date().getFullYear().toString(),
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
      if (reportCard.isNew) {
        await reportCard.save({ validateBeforeSave: false });
      } else {
        await StudentReportCard.updateOne(
          { _id: reportCard._id },
          { $set: { dynamicSections: reportCard.dynamicSections } }
        );
      }
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
  const fromSubLevelName = prevSubLevel?.name || "previous sub-level";
  const toSubLevelName = newSubLevelDoc?.name || nextSubLevel?.name || "next sub-level";
  const fromLevelName = prevLevel?.name || "previous level";
  const toLevelName = newLevelDoc?.name || "new level";

  const promoTitle = promotedToNewLevel
    ? `Promoted to ${toLevelName} (${toSubLevelName})`
    : `Promoted to SubLevel ${toSubLevelName}`;

  const promoDescription = promotedToNewLevel
    ? `Student promoted from ${fromLevelName} (${fromSubLevelName}) to ${toLevelName} (${toSubLevelName})`
    : `Student moved from SubLevel ${fromSubLevelName} to ${toSubLevelName}`;

  await StudentEventLog.create({
    studentId,
    type: "promotion",
    action: isAuto ? "auto_promoted" : "manual_promoted",
    title: promoTitle,
    description: promoDescription,
    meta: {
      prevLevelId,
      prevLevelName: fromLevelName,
      prevSubLevelId,
      prevSubLevelName: fromSubLevelName,
      prevSyllabusVersionId,
      newLevelId: targetLevelId,
      newLevelName: toLevelName,
      newSubLevelId: nextSubLevel._id,
      newSubLevelName: toSubLevelName,
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

/**
 * Demote student to previous sub-level / level.
 * Used when a student was mistakenly promoted.
 * Removes current level's tasks and syllabus, restores previous level's tasks and syllabus.
 */
const demoteToPreviousSubLevel = async (studentId, actorUser = null, options = {}) => {
  const actorId = getActorId(actorUser);

  const student = await Student.findById(studentId);
  if (!student) throw toClientError("Student not found", 404);
  if (student.status !== "Active") throw toClientError("Only active students can be demoted");

  const currentLevel = await Level.findById(student.currentLevelId);
  if (!currentLevel) throw toClientError("Current level not found", 404);
  const currentSubLevel = await SubLevel.findById(student.currentSubLevelId);
  if (!currentSubLevel) throw toClientError("Current sub-level not found", 404);

  // Step 1: Look for previous SubLevel in the same Level (by order)
  let targetLevel = currentLevel;
  let prevSubLevel = await SubLevel.findOne({
    levelId: currentLevel._id,
    order: { $lt: currentSubLevel.order },
    isActive: true,
  }).sort({ order: -1 });

  let demotedToPrevLevel = false;

  // Step 2: No lower sublevel in current level -> look for previous Level in the same subdepartment
  if (!prevSubLevel) {
    let targetSubDeptId = student.subDepartmentId;
    if (student.isUIUX) {
      const SubDepartment = require("../models/department/SubDepartment");
      const uiuxSubDept = await SubDepartment.findOne({ name: /UI\/UX|UIUX/i });
      if (uiuxSubDept) {
        targetSubDeptId = uiuxSubDept._id;
      }
    }

    const prevLevel = await Level.findOne({
      subDepartmentId: targetSubDeptId,
      order: { $lt: currentLevel.order },
      isActive: true,
    }).sort({ order: -1 });

    if (!prevLevel) {
      throw toClientError(`Student is already at the lowest level (${currentSubLevel.name}). Cannot demote further.`, 400);
    }

    targetLevel = prevLevel;
    demotedToPrevLevel = true;

    // In previous level, find the highest (last) sublevel
    prevSubLevel = await SubLevel.findOne({
      levelId: prevLevel._id,
      isActive: true,
    }).sort({ order: -1 });

    if (!prevSubLevel) {
      throw toClientError("No active sub-level found in previous level", 404);
    }
  }

  // Step 3: Find active SyllabusVersion for the target previous SubLevel
  const targetSessionId = student.sessionId || (await Session.findOne({ isActive: true }).sort({ createdAt: -1 }))?._id;

  const lastPromotionLog = await StudentEventLog.findOne({
    studentId,
    type: "promotion",
    action: { $in: ["manual_promoted", "auto_promoted"] }
  }).sort({ createdAt: -1 });

  let targetSyllabus = null;
  if (lastPromotionLog?.meta?.prevSyllabusVersionId && String(lastPromotionLog.meta.prevSubLevelId) === String(prevSubLevel._id)) {
    targetSyllabus = await SyllabusVersion.findOne({
      _id: lastPromotionLog.meta.prevSyllabusVersionId,
      isActive: true
    });
  }

  if (!targetSyllabus) {
    targetSyllabus = await SyllabusVersion.findOne({
      sessionId: targetSessionId,
      levelId: targetLevel._id,
      subLevelId: prevSubLevel._id,
      status: "active",
      isActive: true
    }).sort({ createdAt: -1 });
  }

  if (!targetSyllabus) {
    targetSyllabus = await SyllabusVersion.findOne({
      levelId: targetLevel._id,
      subLevelId: prevSubLevel._id,
      isActive: true
    }).sort({ createdAt: -1 });
  }

  if (!targetSyllabus) {
    throw toClientError(`No active syllabus found for previous sub-level (${prevSubLevel.name})`, 404);
  }

  const fromLevelId = currentLevel._id;
  const fromSubLevelId = currentSubLevel._id;
  const fromSyllabusVersionId = student.syllabusVersionId;

  // Step 4: Remove current (mistaken) level's tasks from the student's task board
  await StudentTask.deleteMany({
    studentId,
    $or: [
      { subLevelId: currentSubLevel._id },
      ...(fromSyllabusVersionId ? [{ syllabusVersionId: fromSyllabusVersionId }] : [])
    ]
  });

  // Step 5: Restore / Activate previous level's tasks
  await StudentTask.updateMany(
    {
      studentId,
      $or: [
        { subLevelId: prevSubLevel._id },
        { syllabusVersionId: targetSyllabus._id }
      ]
    },
    { $set: { isActive: true } }
  );

  // Populate any missing tasks for the previous sublevel without overwriting existing tasks
  try {
    const { assignTasksToStudent } = require("./taskAssignmentService");
    await assignTasksToStudent(student._id, targetSyllabus._id);
  } catch (err) {
    console.warn("Task assignment on demote warning:", err.message);
  }

  // Step 6: Atomically update student position
  await withTransaction(async (session) => {
    student.currentLevelId = targetLevel._id;
    student.currentSubLevelId = prevSubLevel._id;
    student.syllabusVersionId = targetSyllabus._id;
    student.sessionId = targetSessionId;
    await student.save({ session });
  });

  // Step 7: Reset StudentLevelProgress
  try {
    const StudentLevelProgress = require("../models/student/StudentLevelProgress");
    await StudentLevelProgress.deleteOne({ studentId, subLevelId: currentSubLevel._id });

    const existingPrevTasks = await StudentTask.find({
      studentId,
      subLevelId: prevSubLevel._id,
      isActive: true
    });
    const completedCount = existingPrevTasks.filter(t => t.status === "completed").length;
    await StudentLevelProgress.findOneAndUpdate(
      { studentId, subLevelId: prevSubLevel._id },
      {
        $set: {
          status: "in_progress",
          completedAt: null,
          totalTasks: existingPrevTasks.length,
          completedTasksCount: completedCount,
          completionPercentage: existingPrevTasks.length > 0 ? Math.round((completedCount / existingPrevTasks.length) * 100) : 0
        }
      }
    );
  } catch (lvlErr) {
    // Non-blocking
  }

  // Step 8: Update Report Card
  try {
    const StudentReportCard = require("../models/student/studentReportCard");
    const reportCard = await StudentReportCard.findOne({ studentRef: studentId });
    if (reportCard) {
      const levelProgressSec = reportCard.dynamicSections?.find(
        (s) => s.sectionName === "Level Progress" || s.sectionType === "LevelProgressTable"
      );
      if (levelProgressSec && Array.isArray(levelProgressSec.items)) {
        const currentSubName = (currentSubLevel.name || "").trim().toUpperCase();
        const prevSubName = (prevSubLevel.name || "").trim().toUpperCase();

        const existingPrevTasks = await StudentTask.find({
          studentId,
          subLevelId: prevSubLevel._id,
          isActive: true
        });
        const completedCount = existingPrevTasks.filter(t => t.status === "completed").length;
        const prevPercent = existingPrevTasks.length > 0 ? Math.round((completedCount / existingPrevTasks.length) * 100) : 0;

        levelProgressSec.items.forEach(item => {
          const itemName = (item.itemName || "").trim().toUpperCase();
          if (itemName === currentSubName) {
            item.value = "Upcoming";
            item.score = 0;
            item.remark = "—";
          } else if (itemName === prevSubName) {
            item.value = "Current";
            item.score = prevPercent;
          }
        });
        await StudentReportCard.updateOne(
          { _id: reportCard._id },
          { $set: { dynamicSections: reportCard.dynamicSections } }
        );
      }
    }
  } catch (rcErr) {
    console.warn("Report card update failed on demotion:", rcErr.message);
  }

  // Step 9: Revert Ready for Drive if demoted before 2B
  const prevSubNameUpper = (prevSubLevel.name || "").toUpperCase();
  if (!prevSubNameUpper.includes("2B") && !prevSubNameUpper.includes("3") && !prevSubNameUpper.includes("4")) {
    try {
      await StudentPlacement.findOneAndUpdate(
        { studentId, readinessStatus: "Ready for Drive" },
        { $set: { readinessStatus: "Not Ready" } }
      );
    } catch {
      // Non-blocking
    }
  }

  // Step 10: Log demotion event in StudentEventLog
  try {
    await StudentEventLog.create({
      studentId,
      type: "demotion",
      action: "manual_demoted",
      title: `Demoted to ${demotedToPrevLevel ? "previous level" : "previous sub-level"}`,
      description: `Student demoted back from SubLevel ${currentSubLevel.name} (${currentLevel.name}) to ${prevSubLevel.name} (${targetLevel.name})${options.remark ? `. Remark: ${options.remark}` : ""}`,
      meta: {
        fromLevelId,
        fromSubLevelId,
        fromSyllabusVersionId,
        toLevelId: targetLevel._id,
        toSubLevelId: prevSubLevel._id,
        toSyllabusVersionId: targetSyllabus._id,
        demotedToPrevLevel,
        remark: options.remark || "",
      },
      createdBy: actorId,
      createdByName: actorUser?.name || "",
      createdByRole: actorUser?.role || "",
    });
  } catch (logErr) {
    console.warn("Demotion event log warning:", logErr.message);
  }

  return {
    demotedToPrevLevel,
    newLevelId: targetLevel._id,
    newLevelName: targetLevel.name,
    newSubLevelId: prevSubLevel._id,
    newSubLevelName: prevSubLevel.name,
    newSyllabusVersionId: targetSyllabus._id,
    syllabusVersionTitle: targetSyllabus.title,
  };
};

/**
 * Get Enriched Student Level History
 * Returns comprehensive journey for every level the student has been through or is currently in:
 * 1. Kisne promote kiya (Promoter name, role, timestamp, auto/manual flag, notes)
 * 2. Kya kya padh kar aaya (Curriculum & topics covered in that level)
 * 3. Kis subject ke kitne task complete karke aaya (Subject-wise task stats, marks, and completion %)
 */
const getEnrichedStudentLevelHistory = async (studentId) => {
  const StudentLevelProgress = require("../models/student/StudentLevelProgress");

  const student = await Student.findById(studentId)
    .populate("sessionId", "name")
    .populate("currentLevelId", "name order")
    .populate("currentSubLevelId", "name order levelId")
    .populate("subDepartmentId", "name departmentId")
    .lean();

  if (!student) {
    return [];
  }

  // 1. Fetch raw StudentLevelProgress records
  let history = await StudentLevelProgress.find({ studentId })
    .populate("levelId", "name order")
    .populate("subLevelId", "name order levelId")
    .populate("sessionId", "name")
    .sort({ createdAt: 1 })
    .lean();

  // 2. Fetch all student tasks across all levels
  const allTasks = await StudentTask.find({ studentId, isActive: true })
    .populate("levelId", "name order")
    .populate("subLevelId", "name order levelId")
    .sort({ createdAt: 1 })
    .lean();

  // 3. Fetch all promotion & level change logs from StudentEventLog
  const promotionLogs = await StudentEventLog.find({
    studentId,
    type: { $in: ["promotion", "demotion"] }
  }).sort({ createdAt: -1 }).lean();

  // 4. Fetch all progress snapshots
  const snapshots = await StudentProgressSnapshot.find({
    studentId
  }).sort({ changedAt: -1 }).lean();

  // Ensure currentSubLevel is in history
  const recordedSubLevelIds = new Set(
    history.map(h => (h.subLevelId?._id || h.subLevelId)?.toString()).filter(Boolean)
  );

  const curSubId = (student.currentSubLevelId?._id || student.currentSubLevelId)?.toString();
  if (curSubId && !recordedSubLevelIds.has(curSubId)) {
    const curLevel = student.currentLevelId || (student.currentSubLevelId?.levelId ? await Level.findById(student.currentSubLevelId.levelId).lean() : null);
    history.push({
      _id: `current_sublevel_${curSubId}`,
      studentId,
      subLevelId: student.currentSubLevelId,
      levelId: curLevel,
      sessionId: student.sessionId,
      status: "in_progress",
      startedAt: student.createdAt,
      totalTasks: 0,
      completedTasksCount: 0,
      completionPercentage: 0
    });
    recordedSubLevelIds.add(curSubId);
  }

  // Also include any sublevels where tasks exist but no StudentLevelProgress entry was created
  const taskSubLevelMap = new Map();
  allTasks.forEach(t => {
    const sId = (t.subLevelId?._id || t.subLevelId)?.toString();
    if (sId && !taskSubLevelMap.has(sId)) {
      taskSubLevelMap.set(sId, {
        subLevel: t.subLevelId,
        level: t.levelId
      });
    }
  });

  for (const [sId, { subLevel, level }] of taskSubLevelMap.entries()) {
    if (!recordedSubLevelIds.has(sId)) {
      const fetchedSubLevel = subLevel || await SubLevel.findById(sId).populate("levelId", "name order").lean();
      const fetchedLevel = level || (fetchedSubLevel?.levelId ? await Level.findById(fetchedSubLevel.levelId).lean() : null);
      history.push({
        _id: `task_sublevel_${sId}`,
        studentId,
        subLevelId: fetchedSubLevel,
        levelId: fetchedLevel,
        sessionId: student.sessionId,
        status: "completed",
        startedAt: null,
        completedAt: null,
        totalTasks: 0,
        completedTasksCount: 0,
        completionPercentage: 0
      });
      recordedSubLevelIds.add(sId);
    }
  }

  // Sort history hierarchically: level.order, then sublevel.order
  history.sort((a, b) => {
    const lvlOrderA = a.levelId?.order ?? 0;
    const lvlOrderB = b.levelId?.order ?? 0;
    if (lvlOrderA !== lvlOrderB) return lvlOrderA - lvlOrderB;
    const subOrderA = a.subLevelId?.order ?? 0;
    const subOrderB = b.subLevelId?.order ?? 0;
    return subOrderA - subOrderB;
  });

  // Mark currently active sublevel
  history.forEach(item => {
    const sId = (item.subLevelId?._id || item.subLevelId)?.toString();
    if (sId && curSubId && sId === curSubId) {
      item.status = "in_progress";
      item.isCurrent = true;
    } else {
      item.isCurrent = false;
      if (item.status === "in_progress" && sId !== curSubId) {
        item.status = "completed";
      }
    }
  });

  // 5. Enrich each level history entry
  const enrichedHistory = await Promise.all(history.map(async (item, index) => {
    const subLevelIdStr = (item.subLevelId?._id || item.subLevelId)?.toString();
    const levelIdStr = (item.levelId?._id || item.levelId)?.toString();

    // A. Tasks in this sublevel
    const subTasks = allTasks.filter(t => (t.subLevelId?._id || t.subLevelId)?.toString() === subLevelIdStr);

    // B. Snapshots in this sublevel
    const subSnapshots = snapshots.filter(s => 
      (s.subLevelId?._id || s.subLevelId)?.toString() === subLevelIdStr ||
      (s.levelId?._id || s.levelId)?.toString() === levelIdStr
    );

    // C. Promotion info: "KISNE PROMOTE KIYA"
    const exitPromotionLog = promotionLogs.find(l => 
      l.meta?.prevSubLevelId?.toString() === subLevelIdStr ||
      (l.action?.includes("promoted") && l.description?.includes(subLevelIdStr))
    );

    const entryPromotionLog = promotionLogs.find(l => 
      l.meta?.newSubLevelId?.toString() === subLevelIdStr
    );

    const exitSnapshot = subSnapshots.find(s => s.snapshotScope === "overall" && s.changedByName);
    const entrySnapshot = subSnapshots.find(s => s.snapshotScope === "promotion" && s.changedByName);

    let promoterName = "";
    let promoterRole = "";
    let promotionDate = null;
    let promotionTitle = "";
    let promotionNote = "";
    let promotionType = "manual";

    if (item.isCurrent) {
      if (entryPromotionLog) {
        promoterName = entryPromotionLog.createdByName || "";
        promoterRole = entryPromotionLog.createdByRole || "";
        promotionDate = entryPromotionLog.createdAt;
        promotionTitle = entryPromotionLog.title || `Promoted to ${item.subLevelId?.name || "current level"}`;
        promotionNote = entryPromotionLog.description || "";
        promotionType = entryPromotionLog.meta?.isAuto ? "auto" : "manual";
      } else if (entrySnapshot) {
        promoterName = entrySnapshot.changedByName || "";
        promoterRole = entrySnapshot.changedByRole || "";
        promotionDate = entrySnapshot.changedAt;
        promotionTitle = `Promoted to ${item.subLevelId?.name || "current level"}`;
      } else if (index === 0) {
        promoterName = "Academic Department";
        promoterRole = "Initial Enrollment";
        promotionDate = student.createdAt;
        promotionTitle = "Starting Level";
        promotionType = "initial";
      } else {
        const prevItem = history[index - 1];
        const prevSubId = (prevItem?.subLevelId?._id || prevItem?.subLevelId)?.toString();
        const prevExitLog = promotionLogs.find(l => l.meta?.prevSubLevelId?.toString() === prevSubId);
        if (prevExitLog) {
          promoterName = prevExitLog.createdByName || "";
          promoterRole = prevExitLog.createdByRole || "";
          promotionDate = prevExitLog.createdAt;
          promotionTitle = `Promoted to ${item.subLevelId?.name || "level"}`;
          promotionType = prevExitLog.meta?.isAuto ? "auto" : "manual";
        }
      }
    } else {
      if (exitPromotionLog) {
        promoterName = exitPromotionLog.createdByName || "";
        promoterRole = exitPromotionLog.createdByRole || "";
        promotionDate = exitPromotionLog.createdAt;
        promotionTitle = exitPromotionLog.title || "Promoted to Next Level";
        promotionNote = exitPromotionLog.description || "";
        promotionType = exitPromotionLog.meta?.isAuto ? "auto" : "manual";
      } else if (exitSnapshot) {
        promoterName = exitSnapshot.changedByName || "";
        promoterRole = exitSnapshot.changedByRole || "";
        promotionDate = exitSnapshot.changedAt;
        promotionTitle = "Evaluated & Promoted";
      } else if (item.promotedByName) {
        promoterName = item.promotedByName;
        promoterRole = item.promotedByRole || "Faculty Evaluator";
        promotionDate = item.completedAt || item.promotedAt;
      } else {
        const evaluatedTask = subTasks.find(t => t.status === "completed" && t.assignedByName);
        if (evaluatedTask) {
          promoterName = evaluatedTask.assignedByName;
          promoterRole = evaluatedTask.assignedByRole || "Faculty Evaluator";
          promotionDate = item.completedAt || evaluatedTask.completedAt;
          promotionTitle = "Completed & Promoted";
        } else if (index === 0) {
          promoterName = "Academic Department";
          promoterRole = "Faculty Coordinator";
          promotionDate = item.completedAt || student.createdAt;
          promotionTitle = "Level Completed";
        }
      }
    }

    if (!promoterName) {
      promoterName = item.status === "completed" ? "Faculty Evaluator" : "Academic Department";
      promoterRole = item.status === "completed" ? "Faculty Evaluator" : "Academic Coordinator";
      promotionDate = item.completedAt || item.startedAt || student.createdAt;
    }

    if (promoterRole) {
      const lower = promoterRole.toLowerCase();
      if (lower === "superadmin") promoterRole = "Super Admin";
      else if (lower === "admin") promoterRole = "Administrator";
      else if (lower === "faculty") promoterRole = "Faculty Evaluator";
      else if (lower === "system") promoterRole = "System Automation";
    }

    // D. Subject-wise tasks breakdown: "KIS SUBJECT KE KITNE TASK COMPLETE KARKE AAYA"
    const subjectMap = new Map();

    subTasks.forEach(task => {
      const sName = (task.subjectName || "General").trim();
      if (!subjectMap.has(sName)) {
        subjectMap.set(sName, {
          subjectId: task.subjectId || null,
          subjectName: sName,
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          inProgressTasks: 0,
          marksSum: 0,
          marksCount: 0,
          topicsSet: new Set()
        });
      }
      const sStat = subjectMap.get(sName);
      sStat.totalTasks++;
      if (task.status === "completed") {
        sStat.completedTasks++;
      } else if (task.status === "inProgress") {
        sStat.inProgressTasks++;
      } else {
        sStat.pendingTasks++;
      }

      if (typeof task.marks === "number" && !isNaN(task.marks)) {
        sStat.marksSum += task.marks;
        sStat.marksCount++;
      }
      if (task.topicName && task.topicName.trim()) {
        sStat.topicsSet.add(task.topicName.trim());
      }
      if (task.subTopicName && task.subTopicName.trim()) {
        sStat.topicsSet.add(task.subTopicName.trim());
      }
    });

    if (subjectMap.size === 0) {
      const subjSnapshots = subSnapshots.filter(s => s.snapshotScope === "subject");
      subjSnapshots.forEach(s => {
        const sName = (s.subjectName || "General").trim();
        if (!subjectMap.has(sName)) {
          subjectMap.set(sName, {
            subjectId: s.subjectId || null,
            subjectName: sName,
            totalTasks: s.totalTasks || 0,
            completedTasks: s.completedTasks || 0,
            pendingTasks: s.pendingTasks || 0,
            inProgressTasks: s.inProgressTasks || 0,
            marksSum: (s.averageMarks || 0) * (s.completedTasks || 0),
            marksCount: s.completedTasks || 0,
            topicsSet: new Set()
          });
        }
      });
    }

    // E. Curriculum & Topics Studied: "KYA KYA PADH KAR AAYA"
    try {
      const syllabus = await SyllabusVersion.findOne({
        levelId: item.levelId?._id || item.levelId,
        subLevelId: item.subLevelId?._id || item.subLevelId
      }).select("subjects").lean();

      if (syllabus?.subjects) {
        syllabus.subjects.forEach(subj => {
          const sName = (subj.name || subj.title || "").trim();
          if (sName) {
            if (!subjectMap.has(sName) && subj.topics?.length) {
              subjectMap.set(sName, {
                subjectId: subj._id || null,
                subjectName: sName,
                totalTasks: 0,
                completedTasks: 0,
                pendingTasks: 0,
                inProgressTasks: 0,
                marksSum: 0,
                marksCount: 0,
                topicsSet: new Set()
              });
            }
            if (subjectMap.has(sName)) {
              (subj.topics || []).forEach(t => {
                if (t.name) subjectMap.get(sName).topicsSet.add(t.name.trim());
              });
            }
          }
        });
      }
    } catch (_) {}

    const subjectStats = Array.from(subjectMap.values()).map(s => {
      const topicsList = Array.from(s.topicsSet);
      return {
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        totalTasks: s.totalTasks,
        completedTasks: s.completedTasks,
        pendingTasks: s.pendingTasks,
        inProgressTasks: s.inProgressTasks,
        completionPercentage: s.totalTasks > 0 ? Math.round((s.completedTasks / s.totalTasks) * 100) : (item.status === "completed" ? 100 : 0),
        averageMarks: s.marksCount > 0 ? Number((s.marksSum / s.marksCount).toFixed(1)) : null,
        topics: topicsList,
        topicsCount: topicsList.length
      };
    });

    const allTopicsStudied = Array.from(new Set(
      subjectStats.flatMap(s => s.topics)
    ));

    const totalTasks = subTasks.length > 0
      ? subTasks.length
      : subjectStats.reduce((acc, s) => acc + s.totalTasks, 0) || item.totalTasks || 0;

    const completedTasksCount = subTasks.length > 0
      ? subTasks.filter(t => t.status === "completed").length
      : subjectStats.reduce((acc, s) => acc + s.completedTasks, 0) || item.completedTasksCount || 0;

    const completionPercentage = totalTasks > 0
      ? Math.round((completedTasksCount / totalTasks) * 100)
      : (item.status === "completed" ? 100 : item.completionPercentage || 0);

    const evaluatedTasks = subTasks.filter(t => typeof t.marks === "number");
    const averageMarks = evaluatedTasks.length > 0
      ? Number((evaluatedTasks.reduce((s, t) => s + t.marks, 0) / evaluatedTasks.length).toFixed(1))
      : null;

    return {
      _id: item._id,
      levelId: item.levelId,
      subLevelId: item.subLevelId,
      sessionId: item.sessionId,
      status: item.status,
      isCurrent: item.isCurrent,
      startedAt: item.startedAt,
      completedAt: item.completedAt || (item.status === "completed" ? promotionDate : null),
      
      // Promotion details ("kisne promote kiya")
      promotion: {
        promotedBy: promoterName,
        promotedByRole: promoterRole,
        promotedAt: promotionDate,
        title: promotionTitle,
        note: promotionNote,
        action: promotionType,
        isAuto: promotionType === "auto"
      },

      // Subject-wise tasks breakdown ("kis subject ke kitne task complete karke aaya")
      subjectStats,

      // Topics studied ("kya kya padh kar aaya")
      topicsStudied: allTopicsStudied,
      totalTopicsCount: allTopicsStudied.length,

      // Overall metrics
      totalTasks,
      completedTasksCount,
      completionPercentage,
      averageMarks
    };
  }));

  return enrichedHistory;
};

module.exports = { 
  syncStudentReadiness, 
  promoteToNextSubLevel, 
  demoteToPreviousSubLevel,
  getEnrichedStudentLevelHistory 
};
