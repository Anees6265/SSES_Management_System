const StudentReportCard = require('../../models/student/studentReportCard');
const mongoose = require('mongoose');

const calcSoftSkillMarks = (softSkills) => {
  let total = 0;
  if (softSkills?.categories?.length > 0) {
    softSkills.categories = softSkills.categories.map((cat) => {
      const checked = cat.subcategories.filter((s) => s.value === true).length;
      const score = Math.round((checked / (cat.subcategories.length || 1)) * (cat.maxMarks || 10));
      total += score;
      return { ...cat, score };
    });
  }
  return total;
};

const calcDisciplineMarks = (discipline) => {
  let total = 0;
  if (discipline?.categories?.length > 0) {
    discipline.categories = discipline.categories.map((cat) => {
      const checked = cat.subcategories.filter((s) => s.value === true).length;
      const score = Math.round((checked / (cat.subcategories.length || 1)) * (cat.maxMarks || 10));
      total += score;
      return { ...cat, score };
    });
  }
  return total;
};

const syncReportCardLive = async (studentId, reportCard) => {
  try {
    const Student = mongoose.model("Student");
    const StudentTask = mongoose.model("StudentTask");
    const Level = mongoose.model("Level");
    const SubLevel = mongoose.model("SubLevel");

    const student = await Student.findById(studentId);
    if (!student) return;

    // Get all sub-levels of this student's sub-department
    const allDeptLevels = await Level.find({ subDepartmentId: student.subDepartmentId, isActive: true }).sort({ order: 1 });
    const allDeptLevelIds = allDeptLevels.map(l => l._id);
    const allDeptSubLevels = await SubLevel.find({ levelId: { $in: allDeptLevelIds }, isActive: true }).lean();

    allDeptSubLevels.sort((a, b) => {
      const lvlA = allDeptLevels.find(l => l._id.toString() === a.levelId.toString());
      const lvlB = allDeptLevels.find(l => l._id.toString() === b.levelId.toString());
      if (lvlA && lvlB && lvlA.order !== lvlB.order) {
        return lvlA.order - lvlB.order;
      }
      return a.order - b.order;
    });

    const LEVEL_STEPS = allDeptSubLevels.map(sl => sl.name.trim().toUpperCase());
    const currentSubLevel = await SubLevel.findById(student.currentSubLevelId);
    if (!currentSubLevel) return;
    const currentSubName = (currentSubLevel.name || "").trim().toUpperCase();
    const currentIdx = LEVEL_STEPS.indexOf(currentSubName);

    // 1. Re-calculate "Level Progress"
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

    const levelProgressItemsMap = new Map();
    if (levelProgressSec.items && levelProgressSec.items.length > 0) {
      levelProgressSec.items.forEach(item => {
        levelProgressItemsMap.set(item.itemName.trim().toUpperCase(), item);
      });
    }

    for (let idx = 0; idx < allDeptSubLevels.length; idx++) {
      const sl = allDeptSubLevels[idx];
      const slName = (sl.name || "").trim().toUpperCase();
      const lvl = allDeptLevels.find(l => l._id.toString() === sl.levelId.toString());
      const lvlOrder = lvl?.order || 1;

      if (idx < currentIdx) {
        const prevTasks = await StudentTask.find({ studentId, subLevelId: sl._id, isActive: true });
        const completedTasks = prevTasks.filter(t => t.status === "completed");
        const completedWithMarks = completedTasks.filter(t => typeof t.marks === "number");
        const averageMarks = completedWithMarks.length > 0
          ? Number((completedWithMarks.reduce((sum, t) => sum + t.marks, 0) / completedWithMarks.length).toFixed(2))
          : 0;
        const percent = prevTasks.length > 0 ? Math.round((completedTasks.length / prevTasks.length) * 100) : 100;
        const rating = averageMarks > 0 ? averageMarks.toFixed(2) : "4.00";

        levelProgressItemsMap.set(slName, {
          itemName: sl.name,
          value: "Completed",
          score: percent,
          remark: rating,
          maxMarks: lvlOrder
        });
      } else if (idx === currentIdx) {
        const currTasks = await StudentTask.find({ studentId, subLevelId: sl._id, isActive: true });
        const completedTasks = currTasks.filter(t => t.status === "completed");
        const completedWithMarks = completedTasks.filter(t => typeof t.marks === "number");
        const averageMarks = completedWithMarks.length > 0
          ? Number((completedWithMarks.reduce((sum, t) => sum + t.marks, 0) / completedWithMarks.length).toFixed(2))
          : 0;
        const percent = currTasks.length > 0 ? Math.round((completedTasks.length / currTasks.length) * 100) : 0;
        const rating = averageMarks > 0 ? averageMarks.toFixed(2) : "—";

        levelProgressItemsMap.set(slName, {
          itemName: sl.name,
          value: "Current",
          score: percent,
          remark: rating,
          maxMarks: lvlOrder
        });
      } else {
        levelProgressItemsMap.set(slName, {
          itemName: sl.name,
          value: "Upcoming",
          score: 0,
          remark: "—",
          maxMarks: lvlOrder
        });
      }
    }

    const sortedLpItems = [];
    allDeptSubLevels.forEach(sl => {
      const nameKey = (sl.name || "").trim().toUpperCase();
      if (levelProgressItemsMap.has(nameKey)) {
        sortedLpItems.push(levelProgressItemsMap.get(nameKey));
      }
    });
    levelProgressSec.items = sortedLpItems;

    // 2. Re-calculate "Subject-wise Performance"
    const tasks = await StudentTask.find({ studentId, isActive: true })
      .populate("subLevelId", "name")
      .sort({ assignedAt: -1, createdAt: -1 });

    if (tasks.length > 0) {
      const grouped = {};
      tasks.forEach(t => {
        const subLevelName = t.subLevelId?.name || "";
        const key = subLevelName ? `${t.subjectName || "Other"} (${subLevelName})` : (t.subjectName || "Other");
        if (!grouped[key]) grouped[key] = { tasks: [] };
        grouped[key].tasks.push(t);
      });

      let subjectPerformanceSec = reportCard.dynamicSections.find(
        (s) => s.sectionName === "Subject-wise Performance" || s.sectionType === "SubjectPerformanceTable"
      );

      if (!subjectPerformanceSec) {
        subjectPerformanceSec = {
          sectionName: "Subject-wise Performance",
          sectionType: "SubjectPerformanceTable",
          items: []
        };
        reportCard.dynamicSections.push(subjectPerformanceSec);
      }

      const subjectItems = [];
      Object.keys(grouped).forEach(subjectName => {
        if (subjectName.trim() === "" || subjectName.toLowerCase() === "other" || subjectName.toLowerCase().startsWith("other")) return;

        const subjectTasks = grouped[subjectName].tasks || [];
        const totalTasks = subjectTasks.length;
        if (totalTasks === 0) return;

        const completedTasks = subjectTasks.filter(t => t.status === "completed");
        const completedCount = completedTasks.length;

        const completedWithMarks = completedTasks.filter(t => typeof t.marks === "number");
        const averageMarks = completedWithMarks.length > 0
          ? Number((completedWithMarks.reduce((sum, t) => sum + t.marks, 0) / completedWithMarks.length).toFixed(2))
          : 0;

        let performanceLevel = "Needs Improvement";
        if (averageMarks >= 4.5) performanceLevel = "Outstanding";
        else if (averageMarks >= 4.0) performanceLevel = "Excellent";
        else if (averageMarks >= 3.5) performanceLevel = "Very Good";
        else if (averageMarks >= 3.0) performanceLevel = "Good";
        else if (averageMarks >= 2.5) performanceLevel = "Average";

        const ratingStr = averageMarks > 0 ? averageMarks.toFixed(2) : "4.00";

        subjectItems.push({
          itemName: subjectName,
          value: performanceLevel,
          maxMarks: totalTasks,
          score: completedCount,
          remark: ratingStr
        });
      });

      subjectItems.sort((a, b) => a.itemName.localeCompare(b.itemName));
      subjectPerformanceSec.items = subjectItems;
    }

    await reportCard.save({ validateBeforeSave: false });
  } catch (err) {
    console.error("Error in syncReportCardLive:", err);
  }
};

exports.saveStudentReportCard = async (req, res) => {
  try {
    const {
      studentRef, batchYear, generatedByName,
      softSkills, discipline, technicalSkills,
      careerReadiness, academicPerformance, coCurricular,
      overallGrade, facultyRemark, isFinalReport,
      templateType, dynamicSections,
    } = req.body;

    const totalSoftSkillMarks = calcSoftSkillMarks(softSkills);
    const totalDisciplineMarks = calcDisciplineMarks(discipline);

    const reportCardData = {
      studentRef, batchYear, generatedByName,
      softSkills: { ...softSkills, totalSoftSkillMarks },
      discipline: { ...discipline, totalDisciplineMarks },
      technicalSkills, careerReadiness, academicPerformance,
      coCurricular, overallGrade, facultyRemark, isFinalReport,
      templateType, dynamicSections,
    };

    const saved = await StudentReportCard.findOneAndUpdate(
      { studentRef },
      reportCardData,
      { new: true, upsert: true }
    );

    res.status(201).json({ success: true, message: 'Report card saved successfully', data: saved });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error while saving report card', error: error.message });
  }
};

exports.getStudentReportCard = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID' });
    }

    const reportCard = await StudentReportCard.findOne({ studentRef: studentId }).populate('studentRef', 'firstName lastName prkey');
    if (!reportCard) {
      return res.status(404).json({ success: false, message: 'Report card not found for this student' });
    }

    // Sync live task performance
    await syncReportCardLive(studentId, reportCard);

    res.status(200).json({ success: true, data: reportCard });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

exports.getStudentReportCardForEdit = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID' });
    }

    const reportCard = await StudentReportCard.findOne({ studentRef: studentId });
    if (reportCard) {
      // Sync live task performance
      await syncReportCardLive(studentId, reportCard);
    }
    
    res.status(200).json({
      success: true,
      message: reportCard ? 'Report card data retrieved for editing' : 'No existing report card found',
      data: reportCard || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

exports.getAllReportCards = async (req, res) => {
  try {
    const { batchYear, isFinalReport } = req.query;
    const filter = {};
    if (batchYear) filter.batchYear = batchYear;
    if (isFinalReport !== undefined) filter.isFinalReport = isFinalReport === 'true';

    const reportCards = await StudentReportCard.find(filter)
      .populate('studentRef', 'firstName lastName prkey')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reportCards.length, data: reportCards });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

exports.updateStudentReportCard = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      softSkills, discipline, technicalSkills, careerReadiness,
      academicPerformance, coCurricular, overallGrade,
      facultyRemark, isFinalReport, generatedByName, batchYear,
      templateType, dynamicSections,
    } = req.body;

    const totalSoftSkillMarks = calcSoftSkillMarks(softSkills);
    const totalDisciplineMarks = calcDisciplineMarks(discipline);

    const updatedData = {
      generatedByName, batchYear, templateType, dynamicSections,
      ...(softSkills && { softSkills: { ...softSkills, totalSoftSkillMarks } }),
      ...(discipline && { discipline: { ...discipline, totalDisciplineMarks } }),
      technicalSkills, careerReadiness, academicPerformance,
      coCurricular, overallGrade, facultyRemark, isFinalReport,
    };

    Object.keys(updatedData).forEach((key) => updatedData[key] === undefined && delete updatedData[key]);

    const updated = await StudentReportCard.findOneAndUpdate(
      { _id: id },
      updatedData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Report card not found' });
    }

    res.status(200).json({ success: true, message: 'Report card updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error while updating report card', error: error.message });
  }
};
