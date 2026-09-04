const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const SyllabusVersion = require("../../models/syllabus/SyllabusVersion");
const Task = require("../../models/syllabus/Task");
const { syncSyllabusTasksToStudents, syncTasksToSubLevelStudents } = require("../../services/taskAssignmentService");

const ensureObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const getSubjectOrNull = (syllabusVersion, subjectId) =>
  ensureObjectId(subjectId) ? syllabusVersion.subjects.id(subjectId) : null;

const getTopicOrNull = (subject, topicId) =>
  subject && ensureObjectId(topicId) ? subject.topics.id(topicId) : null;

const getSubTopicOrNull = (topic, subTopicId) =>
  topic && ensureObjectId(subTopicId) ? topic.subTopics.id(subTopicId) : null;

const normalizeSubjects = (subjects = []) =>
  subjects.map((subject, si) => ({
    name: subject.name,
    code: subject.code || "",
    description: subject.description || "",
    order: subject.order || si + 1,
    isActive: subject.isActive !== false,
    includeInReportCard: subject.includeInReportCard === true,
    reportCategory: ["technical", "softskill"].includes(subject.reportCategory) ? subject.reportCategory : "",
    topics: (subject.topics || []).map((topic, ti) => ({
      name: topic.name,
      description: topic.description || "",
      order: topic.order || ti + 1,
      isActive: topic.isActive !== false,
      subTopics: (topic.subTopics || []).map((st, sti) => ({
        name: st.name,
        description: st.description || "",
        order: st.order || sti + 1,
        isActive: st.isActive !== false
      }))
    }))
  }));

const syncIfActive = async (syllabusVersionId) => {
  return syncTasksToSubLevelStudents(syllabusVersionId);
};

const normalizeBoolean = (value, def = true) => {
  if (value === undefined || value === null || value === "") return def;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (["true", "yes", "1", "active", "mandatory"].includes(s)) return true;
  if (["false", "no", "0", "inactive", "optional"].includes(s)) return false;
  return def;
};

const normalizeNumber = (value, def) => {
  if (value === undefined || value === null || value === "") return def;
  const n = Number(value);
  return Number.isNaN(n) ? def : n;
};

const resolveMatchingSubject = (syllabusVersion, payload) => {
  if (ensureObjectId(payload.subjectId)) return syllabusVersion.subjects.id(payload.subjectId);
  if (payload.code) return syllabusVersion.subjects.find((s) => s.code && s.code === payload.code) || null;
  return syllabusVersion.subjects.find((s) => s.name === payload.name) || null;
};

const validateSubjectPayload = (subject) => {
  if (!subject?.name || typeof subject.name !== "string") throw new Error("subject.name is required");
  for (const topic of subject.topics || []) {
    if (!topic.name || typeof topic.name !== "string") throw new Error("Each topic must have a name");
    for (const st of topic.subTopics || []) {
      if (!st.name || typeof st.name !== "string") throw new Error("Each subTopic must have a name");
    }
  }
};

const upsertSubjectTree = (syllabusVersion, inputSubjects) => {
  const result = [];
  inputSubjects.forEach(validateSubjectPayload);
  for (const [i, payload] of inputSubjects.entries()) {
    const normalized = {
      name: payload.name,
      code: payload.code || "",
      description: payload.description || "",
      order: typeof payload.order === "number" ? payload.order : syllabusVersion.subjects.length + i + 1,
      isActive: payload.isActive !== false,
      includeInReportCard: payload.includeInReportCard === true,
      reportCategory: ["technical", "softskill"].includes(payload.reportCategory) ? payload.reportCategory : "",
      topics: (payload.topics || []).map((t, ti) => ({
        name: t.name,
        description: t.description || "",
        order: typeof t.order === "number" ? t.order : ti + 1,
        isActive: t.isActive !== false,
        subTopics: (t.subTopics || []).map((st, sti) => ({
          name: st.name,
          description: st.description || "",
          order: typeof st.order === "number" ? st.order : sti + 1,
          isActive: st.isActive !== false
        }))
      }))
    };
    const existing = resolveMatchingSubject(syllabusVersion, payload);
    if (existing) {
      Object.assign(existing, normalized);
      result.push({ action: "updated", subjectId: existing._id, name: existing.name });
    } else {
      syllabusVersion.subjects.push(normalized);
      const created = syllabusVersion.subjects[syllabusVersion.subjects.length - 1];
      result.push({ action: "created", subjectId: created._id, name: created.name });
    }
  }
  return result;
};

const extractRowsFromWorksheet = (worksheet) => {
  const headers = [];
  const rows = [];
  worksheet.getRow(1).eachCell((cell, col) => { headers[col] = String(cell.value || "").trim(); });
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const rowData = {};
    let hasValues = false;
    headers.forEach((header, col) => {
      if (!header) return;
      const val = row.getCell(col).value;
      const normalized = val && typeof val === "object" && val.text !== undefined ? val.text : val;
      if (normalized !== null && normalized !== undefined && normalized !== "") hasValues = true;
      rowData[header] = normalized;
    });
    if (hasValues) rows.push(rowData);
  });
  return rows;
};

// ── Syllabus Version CRUD ──────────────────────────────────

exports.createSyllabusVersion = async (req, res) => {
  try {
    const { sessionId, levelId, subLevelId, version: versionInput, title, subjects } = req.body;
    if (!sessionId || !levelId || !subLevelId) {
      return res.status(400).json({ success: false, message: "sessionId, levelId, subLevelId are required" });
    }
    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ success: false, message: "subjects must be a non-empty array" });
    }

    let resolvedVersion = versionInput?.trim();

    if (!resolvedVersion) {
      // Auto-detect: find latest existing version for this subLevel
      const existing = await SyllabusVersion.findOne(
        { subLevelId, isActive: true },
        { version: 1 },
        { sort: { createdAt: -1 } }
      );
      if (existing) {
        // Same version — new subject goes into same version doc
        resolvedVersion = existing.version;
      } else {
        resolvedVersion = "v1.0";
      }
    }

    // Check if a version with this subLevelId + resolvedVersion already exists
    const existingVersion = await SyllabusVersion.findOne({
      sessionId, levelId, subLevelId, version: resolvedVersion, isActive: true
    });

    if (existingVersion) {
      // Add subjects to existing version instead of creating new
      upsertSubjectTree(existingVersion, subjects);
      await existingVersion.save();
      return res.status(200).json({
        success: true,
        message: `Subjects added to existing version ${resolvedVersion}`,
        data: existingVersion
      });
    }

    const syllabusVersion = await SyllabusVersion.create({
      sessionId, levelId, subLevelId,
      version: resolvedVersion,
      title: title || "",
      subjects: normalizeSubjects(subjects)
    });
    res.status(201).json({ success: true, message: "Syllabus version created successfully", data: syllabusVersion });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "This syllabus version already exists for the selected session/level/sublevel" });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getAllSyllabusVersions = async (req, res) => {
  try {
    const { sessionId, levelId, subLevelId, status } = req.query;
    const filter = { isActive: true };
    if (sessionId) filter.sessionId = sessionId;
    if (levelId) filter.levelId = levelId;
    if (subLevelId) filter.subLevelId = subLevelId;
    if (status) filter.status = status;
    const versions = await SyllabusVersion.find(filter)
      .populate("sessionId", "name startDate endDate status")
      .populate({
        path: "levelId",
        select: "name order subDepartmentId",
        populate: {
          path: "subDepartmentId",
          select: "name departmentId",
          populate: { path: "departmentId", select: "name" }
        }
      })
      .populate("subLevelId", "name order")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: versions.length, data: versions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSyllabusVersionById = async (req, res) => {
  try {
    const sv = await SyllabusVersion.findById(req.params.id)
      .populate("sessionId", "name startDate endDate status")
      .populate({
        path: "levelId",
        select: "name order subDepartmentId",
        populate: {
          path: "subDepartmentId",
          select: "name departmentId",
          populate: { path: "departmentId", select: "name" }
        }
      })
      .populate("subLevelId", "name order");
    if (!sv || !sv.isActive) return res.status(404).json({ success: false, message: "Syllabus version not found" });
    res.status(200).json({ success: true, data: sv });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateDraftSyllabusVersion = async (req, res) => {
  try {
    const sv = await SyllabusVersion.findById(req.params.id);
    if (!sv || !sv.isActive) return res.status(404).json({ success: false, message: "Syllabus version not found" });
    if (sv.status !== "draft") return res.status(400).json({ success: false, message: "Only draft syllabus versions can be updated directly" });
    if (req.body.title !== undefined) sv.title = req.body.title;
    if (req.body.subjects !== undefined) {
      if (!Array.isArray(req.body.subjects) || req.body.subjects.length === 0) {
        return res.status(400).json({ success: false, message: "subjects must be a non-empty array" });
      }
      sv.subjects = normalizeSubjects(req.body.subjects);
    }
    await sv.save();
    res.status(200).json({ success: true, message: "Draft syllabus updated successfully", data: sv });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.activateSyllabusVersion = async (req, res) => {
  try {
    const sv = await SyllabusVersion.findById(req.params.id);
    if (!sv || !sv.isActive) return res.status(404).json({ success: false, message: "Syllabus version not found" });
    await SyllabusVersion.updateMany(
      { sessionId: sv.sessionId, levelId: sv.levelId, subLevelId: sv.subLevelId, status: "active", _id: { $ne: sv._id } },
      { $set: { status: "archived" } }
    );
    sv.status = "active";
    await sv.save();
    res.status(200).json({ success: true, message: "Syllabus version activated successfully", data: sv });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.archiveSyllabusVersion = async (req, res) => {
  try {
    const sv = await SyllabusVersion.findById(req.params.id);
    if (!sv || !sv.isActive) return res.status(404).json({ success: false, message: "Syllabus version not found" });
    sv.status = "archived";
    await sv.save();
    res.status(200).json({ success: true, message: "Syllabus version archived successfully", data: sv });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Task CRUD (separate Task collection) ──────────────────

exports.addTaskToSyllabusVersion = async (req, res) => {
  try {
    const { subjectId, topicId, subTopicId, title, description, type, mandatory, maxMarks, timeDays, measurablePoints } = req.body;
    if (!ensureObjectId(subjectId) || !ensureObjectId(topicId) || !title) {
      return res.status(400).json({ success: false, message: "subjectId, topicId and title are required" });
    }
    const sv = await SyllabusVersion.findById(req.params.id);
    if (!sv || !sv.isActive) return res.status(404).json({ success: false, message: "Syllabus version not found" });

    const subject = sv.subjects.id(subjectId);
    const topic = subject?.topics.id(topicId);
    if (!topic) return res.status(404).json({ success: false, message: "Subject/topic not found" });

    let subTopic = null;
    if (subTopicId) {
      subTopic = topic.subTopics.id(subTopicId);
      if (!subTopic) return res.status(404).json({ success: false, message: "SubTopic not found" });
    }

    const taskCount = await Task.countDocuments({ syllabusVersionId: sv._id, topicId, subTopicId: subTopicId || null });

    const task = await Task.create({
      syllabusVersionId: sv._id,
      subjectId,
      subjectName: subject.name,
      topicId,
      topicName: topic.name,
      subTopicId: subTopicId || null,
      subTopicName: subTopic?.name || "",
      taskNodeType: subTopicId ? "subTopic" : "topic",
      title,
      description: description || "",
      type: type || "assignment",
      mandatory: mandatory !== false,
      maxMarks: typeof maxMarks === "number" ? maxMarks : 5,
      timeDays: timeDays ? Number(timeDays) : null,
      measurablePoints: measurablePoints || "",
      order: taskCount + 1,
      assignedByName: req.user?.name || "System",
      isActive: true
    });

    const syncResults = await syncIfActive(sv._id);

    res.status(201).json({
      success: true,
      message: "Task added successfully",
      data: {
        task,
        syncedStudents: syncResults.filter((r) => r.success).length
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getTasksBySyllabusVersion = async (req, res) => {
  try {
    const { subjectId, topicId, subTopicId } = req.query;
    const filter = { syllabusVersionId: req.params.id, isActive: true };
    if (subjectId) filter.subjectId = subjectId;
    if (topicId) filter.topicId = topicId;
    if (subTopicId) filter.subTopicId = subTopicId;
    const tasks = await Task.find(filter).sort({ order: 1, createdAt: 1 });
    res.status(200).json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleTaskActive = async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.taskId, syllabusVersionId: req.params.id },
      { $set: { isActive: Boolean(req.body.isActive) } },
      { new: true }
    );
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    const sv = await SyllabusVersion.findById(req.params.id).select("status");
    const syncResults = await syncIfActive(req.params.id);
    res.status(200).json({ success: true, message: "Task updated", data: { task, syncedStudents: syncResults.filter((r) => r.success).length } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ── Subject CRUD ───────────────────────────────────────────

exports.addSubjectToSyllabusVersion = async (req, res) => {
  try {
    const { name, code, description, order, isActive } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "name is required" });
    const sv = await SyllabusVersion.findById(req.params.id);
    if (!sv || !sv.isActive) return res.status(404).json({ success: false, message: "Syllabus version not found" });
    sv.subjects.push({ name, code: code || "", description: description || "", order: typeof order === "number" ? order : sv.subjects.length + 1, isActive: isActive !== false, topics: [] });
    await sv.save();
    res.status(201).json({ success: true, message: "Subject added successfully", data: sv.subjects[sv.subjects.length - 1] });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateSubjectInSyllabusVersion = async (req, res) => {
  try {
    const sv = await SyllabusVersion.findById(req.params.id);
    if (!sv || !sv.isActive) return res.status(404).json({ success: false, message: "Syllabus version not found" });
    const subject = getSubjectOrNull(sv, req.params.subjectId);
    if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });
    for (const f of ["name", "code", "description", "order", "isActive"]) {
      if (req.body[f] !== undefined) subject[f] = req.body[f];
    }
    await sv.save();
    res.status(200).json({ success: true, message: "Subject updated", data: subject });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.toggleSubjectActive = async (req, res) => {
  try {
    const sv = await SyllabusVersion.findById(req.params.id);
    if (!sv || !sv.isActive) return res.status(404).json({ success: false, message: "Syllabus version not found" });
    const subject = getSubjectOrNull(sv, req.params.subjectId);
    if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });
    subject.isActive = Boolean(req.body.isActive);
    await sv.save();
    res.status(200).json({ success: true, data: subject });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ── Topic CRUD ─────────────────────────────────────────────

exports.addTopicToSyllabusVersion = async (req, res) => {
  try {
    const { name, description, order, isActive } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "name is required" });
    const sv = await SyllabusVersion.findById(req.params.id);
    if (!sv || !sv.isActive) return res.status(404).json({ success: false, message: "Syllabus version not found" });
    const subject = getSubjectOrNull(sv, req.params.subjectId);
    if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });
    subject.topics.push({ name, description: description || "", order: typeof order === "number" ? order : subject.topics.length + 1, isActive: isActive !== false, subTopics: [] });
    await sv.save();
    res.status(201).json({ success: true, message: "Topic added successfully", data: subject.topics[subject.topics.length - 1] });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateTopicInSyllabusVersion = async (req, res) => {
  try {
    const sv = await SyllabusVersion.findById(req.params.id);
    if (!sv || !sv.isActive) return res.status(404).json({ success: false, message: "Syllabus version not found" });
    const subject = getSubjectOrNull(sv, req.params.subjectId);
    const topic = getTopicOrNull(subject, req.params.topicId);
    if (!topic) return res.status(404).json({ success: false, message: "Topic not found" });
    for (const f of ["name", "description", "order", "isActive"]) {
      if (req.body[f] !== undefined) topic[f] = req.body[f];
    }
    await sv.save();
    res.status(200).json({ success: true, message: "Topic updated", data: topic });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.toggleTopicActive = async (req, res) => {
  try {
    const sv = await SyllabusVersion.findById(req.params.id);
    if (!sv || !sv.isActive) return res.status(404).json({ success: false, message: "Syllabus version not found" });
    const subject = getSubjectOrNull(sv, req.params.subjectId);
    const topic = getTopicOrNull(subject, req.params.topicId);
    if (!topic) return res.status(404).json({ success: false, message: "Topic not found" });
    topic.isActive = Boolean(req.body.isActive);
    await sv.save();
    res.status(200).json({ success: true, data: topic });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ── SubTopic CRUD ──────────────────────────────────────────

exports.addSubTopicToSyllabusVersion = async (req, res) => {
  try {
    const { name, description, order, isActive } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "name is required" });
    const sv = await SyllabusVersion.findById(req.params.id);
    if (!sv || !sv.isActive) return res.status(404).json({ success: false, message: "Syllabus version not found" });
    const subject = getSubjectOrNull(sv, req.params.subjectId);
    const topic = getTopicOrNull(subject, req.params.topicId);
    if (!topic) return res.status(404).json({ success: false, message: "Topic not found" });
    topic.subTopics.push({ name, description: description || "", order: typeof order === "number" ? order : topic.subTopics.length + 1, isActive: isActive !== false });
    await sv.save();
    res.status(201).json({ success: true, message: "SubTopic added successfully", data: topic.subTopics[topic.subTopics.length - 1] });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateSubTopicInSyllabusVersion = async (req, res) => {
  try {
    const sv = await SyllabusVersion.findById(req.params.id);
    if (!sv || !sv.isActive) return res.status(404).json({ success: false, message: "Syllabus version not found" });
    const subject = getSubjectOrNull(sv, req.params.subjectId);
    const topic = getTopicOrNull(subject, req.params.topicId);
    const subTopic = getSubTopicOrNull(topic, req.params.subTopicId);
    if (!subTopic) return res.status(404).json({ success: false, message: "SubTopic not found" });
    for (const f of ["name", "description", "order", "isActive"]) {
      if (req.body[f] !== undefined) subTopic[f] = req.body[f];
    }
    await sv.save();
    res.status(200).json({ success: true, message: "SubTopic updated", data: subTopic });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.toggleSubTopicActive = async (req, res) => {
  try {
    const sv = await SyllabusVersion.findById(req.params.id);
    if (!sv || !sv.isActive) return res.status(404).json({ success: false, message: "Syllabus version not found" });
    const subject = getSubjectOrNull(sv, req.params.subjectId);
    const topic = getTopicOrNull(subject, req.params.topicId);
    const subTopic = getSubTopicOrNull(topic, req.params.subTopicId);
    if (!subTopic) return res.status(404).json({ success: false, message: "SubTopic not found" });
    subTopic.isActive = Boolean(req.body.isActive);
    await sv.save();
    res.status(200).json({ success: true, data: subTopic });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ── Combined Upload: Syllabus + Tasks from one Excel ─────
// POST /syllabus/versions/upload-combined
// Body: { sessionId, levelId, subLevelId, tasks: [...parsed rows] }
// Each row: { subject, topic, subTopic, taskTitle, taskType, timeDays, measurablePoints }
// Rows with empty taskTitle = syllabus-only rows
// Rows with taskTitle = syllabus + task
exports.uploadCombined = async (req, res) => {
  try {
    const { sessionId, levelId, subLevelId, tasks: rows, subjectMeta = [] } = req.body;
    if (!sessionId || !levelId || !subLevelId)
      return res.status(400).json({ success: false, message: "sessionId, levelId, subLevelId are required" });
    if (!Array.isArray(rows) || rows.length === 0)
      return res.status(400).json({ success: false, message: "tasks array is required" });

    // Build a quick lookup: subjectName → { includeInReportCard, reportCategory }
    const metaMap = {};
    (Array.isArray(subjectMeta) ? subjectMeta : []).forEach(m => {
      if (m.name) metaMap[m.name.trim()] = {
        includeInReportCard: m.includeInReportCard === true,
        reportCategory: ["technical", "softskill"].includes(m.reportCategory) ? m.reportCategory : ""
      };
    });

    // Step 1: Build syllabus hierarchy from rows
    const subjectMap = new Map();
    let validRowCount = 0;
    
    for (const row of rows) {
      const subjectName  = (row.subject  || "").trim();
      const topicName    = (row.topic    || "").trim();
      const subTopicName = (row.subTopic || "").trim();
      
      if (!subjectName || !topicName) {
        console.warn('Skipping row with missing subject/topic:', row);
        continue;
      }
      
      validRowCount++;
      if (!subjectMap.has(subjectName)) subjectMap.set(subjectName, new Map());
      const topicMap = subjectMap.get(subjectName);
      if (!topicMap.has(topicName)) topicMap.set(topicName, new Set());
      if (subTopicName) topicMap.get(topicName).add(subTopicName);
    }

    if (validRowCount === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "No valid rows found. Please ensure Subject and Topic columns are filled." 
      });
    }

    const subjects = Array.from(subjectMap.entries()).map(([sName, topicMap], si) => ({
      name: sName,
      order: si + 1,
      ...(metaMap[sName] || {}),
      topics: Array.from(topicMap.entries()).map(([tName, stSet], ti) => ({
        name: tName,
        order: ti + 1,
        subTopics: Array.from(stSet).map((stName, sti) => ({ name: stName, order: sti + 1 }))
      }))
    }));

    if (subjects.length === 0)
      return res.status(400).json({ success: false, message: "No valid subject/topic rows found" });

    // Step 2: Create or update SyllabusVersion
    let sv = await SyllabusVersion.findOne({ sessionId, levelId, subLevelId, isActive: true }).sort({ createdAt: -1 });
    if (sv) {
      upsertSubjectTree(sv, subjects);
      await sv.save();
    } else {
      sv = await SyllabusVersion.create({ sessionId, levelId, subLevelId, version: "v1.0", subjects: normalizeSubjects(subjects) });
    }

    // Step 3: Create tasks for rows that have taskTitle
    const taskRows = rows.filter(r => (r.taskTitle || "").trim());
    const taskDocs = [];
    const taskErrors = [];

    for (let i = 0; i < taskRows.length; i++) {
      const row = taskRows[i];
      const subjectName  = (row.subject  || row.Subject || "").trim();
      const topicName    = (row.topic    || row.Topic || "").trim();
      const subTopicName = (row.subTopic || row["Sub Topic"] || row.SubTopic || "").trim();
      const taskTitle    = (row.taskTitle || row["Task Title"] || row.TaskTitle || "").trim();
      const taskType     = (row.taskType || row["Task Type"] || row.TaskType || "assessment").trim().toLowerCase();
      const maxMarks     = Number(row.maxMarks || row["Max Marks"]) || 5;
      const timeDays     = row.timeDays || row["Time Days"] ? Number(row.timeDays || row["Time Days"]) : null;
      const measurablePoints = (row.measurablePoints || row["Measurable Points"] || "").trim();

      // Find subject in saved sv
      const foundSubject = subjectName
        ? sv.subjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase())
        : sv.subjects.find(s => s.topics.some(t => t.name.toLowerCase() === topicName.toLowerCase()));

      if (!foundSubject) { taskErrors.push(`Row ${i + 2}: Subject "${subjectName}" not found`); continue; }

      const foundTopic = foundSubject.topics.find(t => t.name.toLowerCase() === topicName.toLowerCase());
      if (!foundTopic) { taskErrors.push(`Row ${i + 2}: Topic "${topicName}" not found`); continue; }

      let foundSubTopic = null;
      if (subTopicName) {
        foundSubTopic = foundTopic.subTopics.find(st => st.name.toLowerCase() === subTopicName.toLowerCase());
        if (!foundSubTopic) { taskErrors.push(`Row ${i + 2}: SubTopic "${subTopicName}" not found`); continue; }
      }

      // Skip duplicate tasks
      const exists = await Task.findOne({
        syllabusVersionId: sv._id,
        topicId: foundTopic._id,
        subTopicId: foundSubTopic?._id || null,
        title: taskTitle,
        isActive: true
      });
      if (exists) { taskErrors.push(`Row ${i + 2}: Task "${taskTitle}" already exists`); continue; }

      const taskCount = await Task.countDocuments({ syllabusVersionId: sv._id, topicId: foundTopic._id, subTopicId: foundSubTopic?._id || null });

      taskDocs.push({
        syllabusVersionId: sv._id,
        subjectId:    foundSubject._id,
        subjectName:  foundSubject.name,
        topicId:      foundTopic._id,
        topicName:    foundTopic.name,
        subTopicId:   foundSubTopic?._id || null,
        subTopicName: foundSubTopic?.name || "",
        taskNodeType: foundSubTopic ? "subTopic" : "topic",
        title:        taskTitle,
        type:         ["assignment","project","practice","reading","assessment","other"].includes(taskType) ? taskType : "assessment",
        maxMarks,
        timeDays,
        measurablePoints,
        order:        taskCount + 1,
        assignedByName: req.user?.name || "System",
        isActive:     true
      });
    }

    let insertedTasks = 0;
    if (taskDocs.length > 0) {
      await Task.insertMany(taskDocs);
      insertedTasks = taskDocs.length;
      await syncTasksToSubLevelStudents(sv._id).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: `Syllabus saved with ${subjects.length} subject(s). ${insertedTasks} task(s) created.`,
      data: {
        syllabusVersionId: sv._id,
        syllabusStatus: sv.status,
        subjectsCount: subjects.length,
        tasksInserted: insertedTasks,
        tasksSkipped: taskErrors.length,
        errors: taskErrors
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ── Subject Upload ─────────────────────────────────────────

exports.uploadSubjectWiseSyllabus = async (req, res) => {
  try {
    const sv = await SyllabusVersion.findById(req.params.id);
    if (!sv || !sv.isActive) return res.status(404).json({ success: false, message: "Syllabus version not found" });
    const inputSubjects = Array.isArray(req.body.subjects) ? req.body.subjects : req.body.subject ? [req.body.subject] : [];
    if (inputSubjects.length === 0) return res.status(400).json({ success: false, message: "subject or subjects payload is required" });
    const uploadedSubjects = upsertSubjectTree(sv, inputSubjects);
    await sv.save();
    res.status(200).json({ success: true, message: "Subject-wise syllabus uploaded successfully", data: { syllabusVersionId: sv._id, uploadedSubjects } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.uploadSubjectWiseSyllabusExcel = async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ success: false, message: "Excel file is required" });
    const sv = await SyllabusVersion.findById(req.params.id);
    if (!sv || !sv.isActive) return res.status(404).json({ success: false, message: "Syllabus version not found" });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return res.status(400).json({ success: false, message: "Excel sheet is empty" });
    const rows = extractRowsFromWorksheet(worksheet);
    if (rows.length === 0) return res.status(400).json({ success: false, message: "Excel file does not contain data rows" });
    const subjects = rows.reduce((acc, row) => {
      const subjectName = row.subjectName?.trim();
      const topicName = row.topicName?.trim();
      if (!subjectName || !topicName) return acc;
      let subject = acc.find((s) => s.name === subjectName);
      if (!subject) { subject = { name: subjectName, topics: [] }; acc.push(subject); }
      let topic = subject.topics.find((t) => t.name === topicName);
      if (!topic) { topic = { name: topicName, subTopics: [] }; subject.topics.push(topic); }
      const stName = row.subTopicName?.trim();
      if (stName && !topic.subTopics.find((st) => st.name === stName)) {
        topic.subTopics.push({ name: stName });
      }
      return acc;
    }, []);
    if (subjects.length === 0) return res.status(400).json({ success: false, message: "No valid subject rows found" });
    const uploadedSubjects = upsertSubjectTree(sv, subjects);
    await sv.save();
    res.status(200).json({ success: true, message: "Excel syllabus uploaded successfully", data: { syllabusVersionId: sv._id, uploadedSubjects, rowsProcessed: rows.length } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
