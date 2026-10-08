const PurposeVisionAssessment = require("../../models/student/PurposeVisionAssessment");
const Student = require("../../models/student/Student");
const aiThesisService = require("../../services/aiThesisService");
const mongoose = require("mongoose");

// Helper to determine the target student ID from request
const resolveStudentId = (req) => {
  if (req.user?.role === "student") {
    return req.user.id || req.user._id;
  }
  return req.params.studentId || req.body.studentId || req.params.id || req.user?.id || req.user?._id;
};

// Safe sanitizer for assessment draft/analysis inputs
const sanitizeAssessmentInputs = (assessment, inputs = {}) => {
  const {
    passionStatements,
    pairwiseComparisons,
    topPassions,
    coreValues,
    purposeAnswers,
    fiveWhys,
    flowAnswers,
    visionAnswers,
    fiveYearGoal,
    tenYearGoal,
    bhag,
    vividFuture,
    purposeStatement,
    visionStatement,
    studentCommitment,
    studentReflection,
    privacyLevel,
    isPassionTestCompleted,
    isVisionTestCompleted,
  } = inputs;

  if (Array.isArray(passionStatements)) {
    assessment.passionStatements = passionStatements.map((item) => {
      if (typeof item === "string") {
        return { text: item, category: "General" };
      }
      if (item && typeof item === "object") {
        return {
          text: item.text || item.name || item.label || "",
          category: item.category || "General",
          createdAt: item.createdAt || new Date(),
        };
      }
      return { text: String(item || ""), category: "General" };
    });
  }

  if (Array.isArray(pairwiseComparisons)) {
    assessment.pairwiseComparisons = pairwiseComparisons;
  }

  if (Array.isArray(topPassions)) {
    assessment.topPassions = topPassions.map((p, idx) => ({
      name: p.name || `Passion ${idx + 1}`,
      originalStatement: p.originalStatement || `When my life is ideal, I am engaged with ${(p.name || "").toLowerCase()}`,
      priority: typeof p.priority === "number" ? p.priority : idx + 1,
      selfRatedImportance: typeof p.selfRatedImportance === "number" ? p.selfRatedImportance : 8,
      currentScore: typeof p.currentScore === "number" ? p.currentScore : 5,
      passionGap: typeof p.passionGap === "number" ? p.passionGap : Math.max(0, (Number(p.selfRatedImportance) || 8) - (Number(p.currentScore) || 5)),
      markers: Array.isArray(p.markers) ? p.markers : (p.marker ? [p.marker] : []),
      gapExplanation: p.gapExplanation || "",
      explanation: p.explanation || "",
      evidence: p.evidence || "",
      aiInterpretation: p.aiInterpretation || "",
    }));
  }

  if (Array.isArray(coreValues)) {
    assessment.coreValues = coreValues.map((v, idx) => {
      if (typeof v === "string") {
        return { name: v, priority: idx + 1, reason: "Guiding value" };
      }
      return {
        name: v.name || `Value ${idx + 1}`,
        priority: typeof v.priority === "number" ? v.priority : idx + 1,
        reason: v.reason || "",
      };
    });
  }

  if (Array.isArray(purposeAnswers)) assessment.purposeAnswers = purposeAnswers;
  if (Array.isArray(fiveWhys)) {
    assessment.fiveWhys = fiveWhys.map((w, idx) => ({
      level: typeof w.level === "number" ? w.level : idx + 1,
      question: w.question || `Why #${idx + 1}`,
      answer: w.answer || "",
    }));
  }
  if (flowAnswers) assessment.flowAnswers = flowAnswers;
  if (visionAnswers) assessment.visionAnswers = visionAnswers;
  if (typeof fiveYearGoal === "string") assessment.fiveYearGoal = fiveYearGoal;
  if (typeof tenYearGoal === "string") assessment.tenYearGoal = tenYearGoal;
  if (typeof bhag === "string") assessment.bhag = bhag;
  if (typeof vividFuture === "string") assessment.vividFuture = vividFuture;
  if (typeof purposeStatement === "string") assessment.purposeStatement = purposeStatement;
  if (typeof visionStatement === "string") assessment.visionStatement = visionStatement;
  if (typeof studentCommitment === "string") assessment.studentCommitment = studentCommitment;
  if (typeof studentReflection === "string") assessment.studentReflection = studentReflection;
  if (privacyLevel) assessment.privacyLevel = privacyLevel;
  if (typeof isPassionTestCompleted === "boolean") assessment.isPassionTestCompleted = isPassionTestCompleted;
  if (typeof isVisionTestCompleted === "boolean") assessment.isVisionTestCompleted = isVisionTestCompleted;
};

/**
 * Retrieve active thesis & assessment along with student context
 */
exports.getStudentThesis = async (req, res) => {
  try {
    const studentId = resolveStudentId(req);
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Valid studentId is required" });
    }

    const { version } = req.query;
    let assessment;

    if (version) {
      assessment = await PurposeVisionAssessment.findOne({
        studentId,
        assessmentVersion: Number(version),
      });
    } else {
      // Prefer latest analyzed thesis so generated thesis never disappears behind an in-progress draft
      const latestAnalyzed = await PurposeVisionAssessment.findOne({
        studentId,
        status: { $in: ["analyzed", "finalized"] },
      }).sort({ assessmentVersion: -1 });

      if (latestAnalyzed) {
        assessment = latestAnalyzed;
      } else {
        assessment = await PurposeVisionAssessment.findOne({ studentId }).sort({ assessmentVersion: -1 });
      }
    }

    if (!assessment) {
      assessment = new PurposeVisionAssessment({
        studentId,
        assessmentVersion: 1,
        status: "draft",
      });
      await assessment.save();
    }

    let studentContext = {};
    try {
      studentContext = await aiThesisService.getStudentContext(studentId);
    } catch (ctxErr) {
      console.warn("Could not load full student context:", ctxErr.message);
    }

    return res.status(200).json({
      success: true,
      data: {
        assessment,
        studentContext,
      },
    });
  } catch (error) {
    console.error("Error in getStudentThesis:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Retrieve all thesis assessment versions for student
 */
exports.getThesisVersions = async (req, res) => {
  try {
    const studentId = resolveStudentId(req);
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Valid studentId is required" });
    }

    const versions = await PurposeVisionAssessment.find({ studentId })
      .select("assessmentVersion status alignmentScores.overall createdAt updatedAt isPassionTestCompleted isVisionTestCompleted purposeStatement topPassions bhag fiveYearGoal")
      .sort({ assessmentVersion: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: versions,
    });
  } catch (error) {
    console.error("Error in getThesisVersions:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Save in-progress draft assessment answers
 */
exports.saveDraftAssessment = async (req, res) => {
  try {
    const studentId = resolveStudentId(req);
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Valid studentId is required" });
    }

    const targetVersion = req.body?.version || req.query?.version;
    let assessment;

    if (targetVersion) {
      assessment = await PurposeVisionAssessment.findOne({ studentId, assessmentVersion: Number(targetVersion) });
    } else {
      assessment = await PurposeVisionAssessment.findOne({ studentId }).sort({ assessmentVersion: -1 });
    }

    if (!assessment || assessment.status === "finalized") {
      const nextVersion = assessment ? assessment.assessmentVersion + 1 : 1;
      assessment = new PurposeVisionAssessment({
        studentId,
        assessmentVersion: nextVersion,
        status: "draft",
      });
    }

    sanitizeAssessmentInputs(assessment, req.body);

    await assessment.save();

    return res.status(200).json({
      success: true,
      message: "Draft saved successfully",
      data: assessment,
    });
  } catch (error) {
    console.error("Error in saveDraftAssessment:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Execute AI Analysis on the student's profile & assessment data
 */
exports.analyzeAndGenerateThesis = async (req, res) => {
  try {
    const studentId = resolveStudentId(req);
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Valid studentId is required" });
    }

    // Load student context
    const studentContext = await aiThesisService.getStudentContext(studentId);

    const targetVersion = req.body?.version || req.query?.version;
    let assessment;

    if (targetVersion) {
      assessment = await PurposeVisionAssessment.findOne({ studentId, assessmentVersion: Number(targetVersion) });
    } else {
      assessment = await PurposeVisionAssessment.findOne({ studentId }).sort({ assessmentVersion: -1 });
    }

    if (!assessment) {
      assessment = new PurposeVisionAssessment({
        studentId,
        assessmentVersion: 1,
        status: "draft",
      });
    }

    // Update with any answers submitted in body safely
    sanitizeAssessmentInputs(assessment, req.body);

    // Validate that student has actually provided passions before AI analysis
    const hasPassions = (assessment.topPassions && assessment.topPassions.length > 0) ||
                        (assessment.passionStatements && assessment.passionStatements.length > 0);

    if (!hasPassions) {
      return res.status(400).json({
        success: false,
        message: "Please complete the Passion Discovery Test before running AI analysis.",
      });
    }

    // Run AI Engine
    const aiResult = await aiThesisService.generateThesisWithAI(studentContext, assessment);

    // Apply generated insights
    assessment.topPassions = aiResult.topPassions || assessment.topPassions;
    if (aiResult.coreValues?.length) assessment.coreValues = aiResult.coreValues;
    if (!assessment.isPurposeAccepted || !assessment.purposeStatement) {
      assessment.purposeStatement = aiResult.purposeStatement || assessment.purposeStatement;
    }
    if (!assessment.isVisionAccepted || !assessment.visionStatement) {
      assessment.visionStatement = aiResult.visionStatement || assessment.visionStatement;
    }
    assessment.fiveYearGoal = aiResult.fiveYearGoal || assessment.fiveYearGoal;
    assessment.tenYearGoal = aiResult.tenYearGoal || assessment.tenYearGoal;
    assessment.bhag = aiResult.bhag || assessment.bhag;
    assessment.vividFuture = aiResult.vividFuture || assessment.vividFuture;
    if (aiResult.studentCommitment) assessment.studentCommitment = aiResult.studentCommitment;
    if (aiResult.archetype) assessment.archetype = aiResult.archetype;

    assessment.alignmentScores = {
      passionClarity: aiResult.alignment?.passionClarity || 85,
      purposeClarity: aiResult.alignment?.purposeClarity || 80,
      visionClarity: aiResult.alignment?.visionClarity || 82,
      careerAlignment: aiResult.alignment?.careerAlignment || 78,
      skillAlignment: aiResult.alignment?.skillAlignment || 75,
      goalAlignment: aiResult.alignment?.goalAlignment || 82,
      executionReadiness: aiResult.alignment?.executionReadiness || 78,
      executionAlignment: aiResult.alignment?.executionAlignment || 78,
      overall: aiResult.alignment?.overall || 80,
    };

    assessment.aiAnalysis = {
      summary: aiResult.aiSummary || "",
      currentVsFuture: aiResult.currentVsFuture || {},
      passionVsPerformance: aiResult.passionVsPerformance || {},
      scoreRationales: aiResult.scoreRationales || {},
    };

    assessment.strengths = aiResult.strengths || [];
    assessment.evidenceBasedStrengths = aiResult.evidenceBasedStrengths || { selfReported: [], evidenceBacked: [] };
    assessment.developmentAreas = aiResult.developmentAreas || [];
    assessment.skillGaps = aiResult.skillGaps || [];
    assessment.structuredDevelopmentGaps = aiResult.structuredDevelopmentGaps || [];
    assessment.careerDirections = aiResult.careerDirections || [];
    assessment.recommendations = aiResult.recommendations || [];
    assessment.roadmap = aiResult.roadmap || { threeMonths: [], sixMonths: [], twelveMonths: [] };

    // Initialize faculty interventions if none exist
    if (!assessment.facultyInterventions?.length && aiResult.facultyInterventions?.length) {
      assessment.facultyInterventions = aiResult.facultyInterventions;
    }

    // Compare with prior version if available
    if (assessment.assessmentVersion > 1) {
      const prevVersion = await PurposeVisionAssessment.findOne({
        studentId,
        assessmentVersion: assessment.assessmentVersion - 1,
      }).lean();
      if (prevVersion) {
        assessment.evolutionNotes = aiThesisService.compareAssessmentVersions(prevVersion, assessment);
      }
    }

    assessment.status = "analyzed";
    await assessment.save();

    return res.status(200).json({
      success: true,
      message: "AI Thesis generated successfully",
      data: assessment,
      studentContext,
    });
  } catch (error) {
    console.error("Error in analyzeAndGenerateThesis:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Start a new assessment version for student purpose evolution
 */
exports.startNewVersion = async (req, res) => {
  try {
    const studentId = resolveStudentId(req);
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Valid studentId is required" });
    }

    const latest = await PurposeVisionAssessment.findOne({ studentId }).sort({ assessmentVersion: -1 });

    // If the latest is ALREADY an un-started blank draft, reuse it rather than accumulating empty drafts
    if (
      latest &&
      latest.status === "draft" &&
      (!latest.topPassions || latest.topPassions.length === 0) &&
      !latest.isPassionTestCompleted
    ) {
      return res.status(200).json({
        success: true,
        message: `Version ${latest.assessmentVersion} draft is ready`,
        data: latest,
      });
    }

    const nextVersion = latest ? latest.assessmentVersion + 1 : 1;

    // Carry forward previous baseline answers so the student can evolve them without starting from a blank slate
    const newAssessment = new PurposeVisionAssessment({
      studentId,
      assessmentVersion: nextVersion,
      status: "draft",
      passionStatements: latest?.passionStatements || [],
      pairwiseComparisons: latest?.pairwiseComparisons || [],
      topPassions: latest?.topPassions || [],
      coreValues: latest?.coreValues || [],
      fiveWhys: latest?.fiveWhys || [],
      fiveYearGoal: latest?.fiveYearGoal || "",
      tenYearGoal: latest?.tenYearGoal || "",
      bhag: latest?.bhag || "",
      vividFuture: latest?.vividFuture || "",
      studentCommitment: latest?.studentCommitment || "",
      isPassionTestCompleted: Boolean(latest?.isPassionTestCompleted),
      isVisionTestCompleted: Boolean(latest?.isVisionTestCompleted),
    });

    await newAssessment.save();

    return res.status(201).json({
      success: true,
      message: `Initiated Version ${nextVersion} AI Thesis`,
      data: newAssessment,
    });
  } catch (error) {
    console.error("Error in startNewVersion:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Edit, accept, or finalize purpose/vision statements & reflections
 */
exports.updateStatements = async (req, res) => {
  try {
    const studentId = resolveStudentId(req);
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Valid studentId is required" });
    }

    // Students can only take tests; statements and goals are generated by AI
    if (req.user?.role === "student") {
      return res.status(403).json({
        success: false,
        message: "Students cannot manually edit thesis statements. Your thesis is automatically synthesized by AI based on your test answers. Please retake the test to re-synthesize.",
      });
    }

    const {
      purposeStatement,
      visionStatement,
      isPurposeAccepted,
      isVisionAccepted,
      studentCommitment,
      studentReflection,
      privacyLevel,
      finalize,
    } = req.body;

    const assessment = await PurposeVisionAssessment.findOne({ studentId }).sort({ assessmentVersion: -1 });
    if (!assessment) {
      return res.status(404).json({ success: false, message: "No active thesis found" });
    }

    if (typeof purposeStatement === "string") assessment.purposeStatement = purposeStatement;
    if (typeof visionStatement === "string") assessment.visionStatement = visionStatement;
    if (typeof isPurposeAccepted === "boolean") assessment.isPurposeAccepted = isPurposeAccepted;
    if (typeof isVisionAccepted === "boolean") assessment.isVisionAccepted = isVisionAccepted;
    if (typeof studentCommitment === "string") assessment.studentCommitment = studentCommitment;
    if (typeof studentReflection === "string") assessment.studentReflection = studentReflection;
    if (privacyLevel) assessment.privacyLevel = privacyLevel;

    if (finalize) {
      assessment.status = "finalized";
    }

    await assessment.save();

    return res.status(200).json({
      success: true,
      message: "Statements updated successfully",
      data: assessment,
    });
  } catch (error) {
    console.error("Error in updateStatements:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Submit or update student reflection & commitment
 */
exports.submitReflection = async (req, res) => {
  try {
    const studentId = resolveStudentId(req);
    const { studentReflection, studentCommitment } = req.body;

    const assessment = await PurposeVisionAssessment.findOne({ studentId }).sort({ assessmentVersion: -1 });
    if (!assessment) {
      return res.status(404).json({ success: false, message: "No active thesis found" });
    }

    if (typeof studentReflection === "string") assessment.studentReflection = studentReflection;
    if (typeof studentCommitment === "string") assessment.studentCommitment = studentCommitment;

    await assessment.save();

    return res.status(200).json({
      success: true,
      message: "Reflection and commitment saved successfully",
      data: assessment,
    });
  } catch (error) {
    console.error("Error in submitReflection:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Add Mentor Feedback from Faculty / Admin
 */
exports.addMentorFeedback = async (req, res) => {
  try {
    const studentId = resolveStudentId(req);
    const { comment, recommendedActions, version } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: "Mentor feedback comment is required" });
    }

    let assessment;
    if (version) {
      assessment = await PurposeVisionAssessment.findOne({ studentId, assessmentVersion: Number(version) });
    }
    if (!assessment) {
      assessment = await PurposeVisionAssessment.findOne({ studentId, status: { $in: ["analyzed", "finalized"] } }).sort({ assessmentVersion: -1 });
    }
    if (!assessment) {
      assessment = await PurposeVisionAssessment.findOne({ studentId }).sort({ assessmentVersion: -1 });
    }

    if (!assessment) {
      return res.status(404).json({ success: false, message: "No AI Thesis found for this student" });
    }

    const feedbackEntry = {
      facultyId: req.user?.id || null,
      facultyName: req.user?.name || "Faculty Mentor",
      facultyRole: req.user?.role || "faculty",
      comment: comment.trim(),
      recommendedActions: Array.isArray(recommendedActions) ? recommendedActions : [],
      createdAt: new Date(),
    };

    assessment.facultyFeedback.push(feedbackEntry);

    // If faculty recommended actions are provided, also add to facultyInterventions
    if (Array.isArray(recommendedActions)) {
      recommendedActions.forEach((act) => {
        assessment.facultyInterventions.push({
          actionId: new mongoose.Types.ObjectId().toString(),
          title: act,
          category: "Mentor Recommendation",
          status: "Not Started",
          facultyName: req.user?.name || "Faculty Mentor",
          notes: comment.trim(),
          updatedAt: new Date(),
        });
      });
    }

    await assessment.save();

    return res.status(200).json({
      success: true,
      message: "Mentor feedback added successfully",
      data: assessment,
    });
  } catch (error) {
    console.error("Error in addMentorFeedback:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Faculty Intervention Action status (Completed / In Progress / Not Started)
 */
exports.updateFacultyActionStatus = async (req, res) => {
  try {
    const studentId = resolveStudentId(req);
    const { actionId, status, notes, version } = req.body;

    if (!actionId || !status) {
      return res.status(400).json({ success: false, message: "actionId and status are required" });
    }

    let assessment;
    if (version) {
      assessment = await PurposeVisionAssessment.findOne({ studentId, assessmentVersion: Number(version) });
    }
    if (!assessment) {
      assessment = await PurposeVisionAssessment.findOne({
        studentId,
        "facultyInterventions.actionId": actionId,
      });
    }
    if (!assessment) {
      assessment = await PurposeVisionAssessment.findOne({
        studentId,
        "facultyInterventions._id": actionId,
      });
    }
    if (!assessment) {
      assessment = await PurposeVisionAssessment.findOne({ studentId, status: { $in: ["analyzed", "finalized"] } }).sort({ assessmentVersion: -1 });
    }
    if (!assessment) {
      assessment = await PurposeVisionAssessment.findOne({ studentId }).sort({ assessmentVersion: -1 });
    }

    if (!assessment) {
      return res.status(404).json({ success: false, message: "No AI Thesis found for this student" });
    }

    const action = assessment.facultyInterventions.find((a) => a.actionId === actionId || a._id?.toString() === actionId);
    if (!action) {
      return res.status(404).json({ success: false, message: "Intervention action not found" });
    }

    action.status = status;
    if (notes) action.notes = notes;
    action.updatedAt = new Date();
    if (req.user?.name) action.facultyName = req.user.name;

    await assessment.save();

    return res.status(200).json({
      success: true,
      message: `Action updated to ${status}`,
      data: assessment,
    });
  } catch (error) {
    console.error("Error in updateFacultyActionStatus:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
