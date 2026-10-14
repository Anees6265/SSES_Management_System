const PurposeVisionAssessment = require("../../models/student/PurposeVisionAssessment");
const Student = require("../../models/student/Student");
const aiThesisService = require("../../services/aiThesisService");
const cloudinary = require("../../config/cloudinaryConfig");
const mongoose = require("mongoose");

// Helper to determine the target student ID from request
const resolveStudentId = (req) => {
  if (req.user?.role === "student") {
    return req.user.id || req.user._id;
  }
  return req.params.studentId || req.body.studentId || req.params.id || req.user?.id || req.user?._id;
};

// Safe subdocument merging helper
const safeMergeSubdoc = (target, source) => {
  const current = typeof target?.toObject === "function" ? target.toObject() : (target || {});
  const incoming = typeof source?.toObject === "function" ? source.toObject() : (source || {});
  return { ...current, ...incoming };
};

/**
 * Get student thesis assessment & student profile context
 */
exports.getStudentThesis = async (req, res) => {
  try {
    const studentId = resolveStudentId(req);
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Valid studentId is required" });
    }

    let studentContext = {};
    try {
      studentContext = await aiThesisService.getStudentContext(studentId);
    } catch (ctxErr) {
      console.warn("Could not load full student context:", ctxErr.message);
    }

    const targetVersion = req.query?.version || req.body?.version;
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
        handwrittenSubmission: {
          images: [],
          studentNotes: "",
          status: "pending_upload",
        },
      });
      await assessment.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        assessment,
        studentContext,
        evidenceValidation: assessment.evidenceValidation || {},
        developmentIndicators: assessment.developmentIndicators || {},
      },
    });
  } catch (error) {
    console.error("Error in getStudentThesis:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all versions history for a student
 */
exports.getThesisVersions = async (req, res) => {
  try {
    const studentId = resolveStudentId(req);
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Valid studentId is required" });
    }

    const versions = await PurposeVisionAssessment.find({ studentId })
      .select("assessmentVersion status alignmentScores createdAt confirmedPurpose purposeStatement topPassions handwrittenSubmission")
      .sort({ assessmentVersion: 1 })
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
 * Upload handwritten visionary exercise sheet(s)
 */
exports.uploadHandwrittenExercise = async (req, res) => {
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

    if (!assessment.handwrittenSubmission) {
      assessment.handwrittenSubmission = { images: [], status: "pending_upload" };
    }

    const existingImages = Array.isArray(assessment.handwrittenSubmission.images)
      ? [...assessment.handwrittenSubmission.images]
      : [];

    let newImages = [];

    // 1. If files sent via multer (req.files)
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const pageNumber = existingImages.length + i + 1;
        let fileUrl = "";
        let publicId = "";

        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
          try {
            const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
            const cloudRes = await cloudinary.uploader.upload(dataUri, {
              folder: "sses/handwritten_visionary",
              resource_type: "auto",
            });
            fileUrl = cloudRes.secure_url || cloudRes.url;
            publicId = cloudRes.public_id || "";
          } catch (cloudErr) {
            console.warn("Cloudinary upload failed, falling back to base64 Data URI:", cloudErr.message);
          }
        }

        if (!fileUrl) {
          fileUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        }

        newImages.push({
          url: fileUrl,
          publicId,
          pageNumber,
          fileName: file.originalname || `page-${pageNumber}`,
          fileSize: file.size || 0,
          uploadedAt: new Date(),
        });
      }
    }
    // 2. If images sent in body (base64 or URLs array)
    else if (req.body?.images && Array.isArray(req.body.images)) {
      for (let i = 0; i < req.body.images.length; i++) {
        const img = req.body.images[i];
        const pageNumber = existingImages.length + i + 1;
        const urlStr = typeof img === "string" ? img : (img.url || "");
        if (!urlStr) continue;

        newImages.push({
          url: urlStr,
          publicId: typeof img === "object" ? (img.publicId || "") : "",
          pageNumber: typeof img === "object" && img.pageNumber ? img.pageNumber : pageNumber,
          fileName: typeof img === "object" ? (img.fileName || `page-${pageNumber}`) : `page-${pageNumber}`,
          fileSize: typeof img === "object" ? (img.fileSize || 0) : 0,
          uploadedAt: new Date(),
        });
      }
    }

    if (newImages.length > 0) {
      assessment.handwrittenSubmission.images = [...existingImages, ...newImages];
      assessment.handwrittenSubmission.status = "uploaded";
    }

    if (typeof req.body?.studentNotes === "string") {
      assessment.handwrittenSubmission.studentNotes = req.body.studentNotes.trim();
    }

    await assessment.save();

    return res.status(200).json({
      success: true,
      message: `${newImages.length} handwritten sheet page(s) uploaded successfully`,
      data: assessment,
    });
  } catch (error) {
    console.error("Error in uploadHandwrittenExercise:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a single page from handwritten exercise submission
 */
exports.deleteHandwrittenPage = async (req, res) => {
  try {
    const studentId = resolveStudentId(req);
    const { pageNumber, url } = req.body;
    const targetVersion = req.body?.version;

    let assessment;
    if (targetVersion) {
      assessment = await PurposeVisionAssessment.findOne({ studentId, assessmentVersion: Number(targetVersion) });
    } else {
      assessment = await PurposeVisionAssessment.findOne({ studentId }).sort({ assessmentVersion: -1 });
    }

    if (!assessment || !assessment.handwrittenSubmission?.images) {
      return res.status(404).json({ success: false, message: "No handwritten submission found" });
    }

    let filtered = assessment.handwrittenSubmission.images.filter((img) => {
      if (typeof pageNumber === "number" && img.pageNumber === pageNumber) return false;
      if (url && img.url === url) return false;
      return true;
    });

    // Re-index remaining pages
    filtered = filtered.map((img, idx) => {
      if (typeof img.toObject === "function") {
        const obj = img.toObject();
        obj.pageNumber = idx + 1;
        return obj;
      }
      return { ...img, pageNumber: idx + 1 };
    });

    assessment.handwrittenSubmission.images = filtered;
    if (filtered.length === 0) {
      assessment.handwrittenSubmission.status = "pending_upload";
    }

    await assessment.save();

    return res.status(200).json({
      success: true,
      message: "Handwritten sheet page removed",
      data: assessment,
    });
  } catch (error) {
    console.error("Error in deleteHandwrittenPage:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Execute Multimodal AI Analysis on uploaded handwritten exercise
 */
exports.analyzeAndGenerateThesis = async (req, res) => {
  try {
    const studentId = resolveStudentId(req);
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Valid studentId is required" });
    }

    let studentContext = {};
    try {
      studentContext = await aiThesisService.getStudentContext(studentId);
    } catch (ctxErr) {
      console.warn("Could not load full student context in analyzeAndGenerateThesis:", ctxErr.message);
      studentContext = { studentId };
    }

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

    if (typeof req.body?.studentNotes === "string" && req.body.studentNotes.trim()) {
      if (!assessment.handwrittenSubmission) assessment.handwrittenSubmission = {};
      assessment.handwrittenSubmission.studentNotes = req.body.studentNotes.trim();
    }

    const hasImages = Array.isArray(assessment.handwrittenSubmission?.images) && assessment.handwrittenSubmission.images.length > 0;
    const hasNotes = Boolean(assessment.handwrittenSubmission?.studentNotes);

    if (!hasImages && !hasNotes) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one handwritten visionary exercise sheet before running AI analysis.",
      });
    }

    // Run Multimodal AI Vision Engine
    const aiResult = await aiThesisService.analyzeHandwrittenVisionaryExercise(studentContext, assessment);

    // Apply extracted handwritten transcriptions and insights
    if (!assessment.handwrittenSubmission) assessment.handwrittenSubmission = {};
    if (aiResult.extractedText) assessment.handwrittenSubmission.extractedText = aiResult.extractedText;
    if (aiResult.extractedPassions) assessment.handwrittenSubmission.extractedPassions = aiResult.extractedPassions;
    if (aiResult.extractedValues) assessment.handwrittenSubmission.extractedValues = aiResult.extractedValues;
    if (aiResult.extractedPurpose) assessment.handwrittenSubmission.extractedPurpose = aiResult.extractedPurpose;
    if (aiResult.extractedVision) assessment.handwrittenSubmission.extractedVision = aiResult.extractedVision;
    if (aiResult.extractedBhag) assessment.handwrittenSubmission.extractedBhag = aiResult.extractedBhag;
    if (aiResult.extractedStrengths) assessment.handwrittenSubmission.extractedStrengths = aiResult.extractedStrengths;
    if (aiResult.extractedDevelopmentAreas) assessment.handwrittenSubmission.extractedDevelopmentAreas = aiResult.extractedDevelopmentAreas;
    assessment.handwrittenSubmission.status = "analyzed";
    assessment.handwrittenSubmission.analyzedAt = new Date();

    // Populate structured fields directly from AI extraction
    assessment.topPassions = aiResult.topPassions || assessment.topPassions;
    if (aiResult.coreValues?.length) assessment.coreValues = aiResult.coreValues;
    if (!assessment.isPurposeAccepted || !assessment.purposeStatement) {
      assessment.purposeStatement = aiResult.purposeStatement || assessment.purposeStatement;
    }
    if (!assessment.isVisionAccepted || !assessment.visionStatement) {
      assessment.visionStatement = aiResult.visionStatement || assessment.visionStatement;
    }
    if (!assessment.confirmedPurpose) {
      assessment.confirmedPurpose = assessment.purposeStatement;
    }
    if (!assessment.confirmedVision) {
      assessment.confirmedVision = assessment.visionStatement;
    }

    assessment.fiveYearGoal = aiResult.fiveYearGoal || assessment.fiveYearGoal;
    assessment.tenYearGoal = aiResult.tenYearGoal || assessment.tenYearGoal;
    assessment.bhag = aiResult.bhag || assessment.bhag;
    assessment.vividFuture = aiResult.vividFuture || assessment.vividFuture;
    if (aiResult.studentCommitment) assessment.studentCommitment = aiResult.studentCommitment;
    if (aiResult.archetype) assessment.archetype = aiResult.archetype;
    if (aiResult.developmentIndicators) assessment.developmentIndicators = aiResult.developmentIndicators;
    if (aiResult.evidenceValidation) assessment.evidenceValidation = aiResult.evidenceValidation;

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

    if (aiResult.facultyInterventions?.length) {
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
      message: "AI Multimodal Analysis completed and thesis synthesized successfully",
      data: assessment,
      studentContext,
    });
  } catch (error) {
    console.error("Error in analyzeAndGenerateThesis:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Start a new assessment version
 */
exports.startNewVersion = async (req, res) => {
  try {
    const studentId = resolveStudentId(req);
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Valid studentId is required" });
    }

    const latest = await PurposeVisionAssessment.findOne({ studentId }).sort({ assessmentVersion: -1 });

    // If latest is an unstarted blank draft, reuse it
    if (
      latest &&
      latest.status === "draft" &&
      (!latest.topPassions || latest.topPassions.length === 0) &&
      (!latest.handwrittenSubmission?.images || latest.handwrittenSubmission.images.length === 0)
    ) {
      return res.status(200).json({
        success: true,
        message: `Version ${latest.assessmentVersion} draft is ready`,
        data: latest,
      });
    }

    const nextVersion = latest ? latest.assessmentVersion + 1 : 1;

    const newAssessment = new PurposeVisionAssessment({
      studentId,
      assessmentVersion: nextVersion,
      status: "draft",
      handwrittenSubmission: {
        images: [],
        studentNotes: "",
        extractedText: "",
        extractedPassions: [],
        extractedValues: [],
        extractedPurpose: "",
        extractedVision: "",
        extractedBhag: "",
        extractedStrengths: [],
        extractedDevelopmentAreas: [],
        status: "pending_upload",
      },
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

    const {
      purposeStatement,
      visionStatement,
      confirmedPurpose,
      confirmedVision,
      fiveYearGoal,
      bhag,
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

    if (typeof purposeStatement === "string") {
      assessment.purposeStatement = purposeStatement.trim();
      assessment.confirmedPurpose = purposeStatement.trim();
    }
    if (typeof confirmedPurpose === "string") {
      assessment.confirmedPurpose = confirmedPurpose.trim();
      assessment.purposeStatement = confirmedPurpose.trim();
    }
    if (typeof visionStatement === "string") {
      assessment.visionStatement = visionStatement.trim();
      assessment.confirmedVision = visionStatement.trim();
    }
    if (typeof confirmedVision === "string") {
      assessment.confirmedVision = confirmedVision.trim();
      assessment.visionStatement = confirmedVision.trim();
    }
    if (typeof fiveYearGoal === "string") assessment.fiveYearGoal = fiveYearGoal.trim();
    if (typeof bhag === "string") assessment.bhag = bhag.trim();
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
 * Add Mentor Feedback from Faculty / Admin
 */
exports.addMentorFeedback = async (req, res) => {
  try {
    const studentId = resolveStudentId(req);
    const { comment, recommendedActions } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: "Mentor feedback comment is required" });
    }

    const assessment = await PurposeVisionAssessment.findOne({ studentId }).sort({ assessmentVersion: -1 });
    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found" });
    }

    if (!Array.isArray(assessment.mentorFeedback)) {
      assessment.mentorFeedback = [];
    }

    const facultyUser = req.user || {};
    assessment.mentorFeedback.push({
      facultyId: facultyUser.id || facultyUser._id || null,
      facultyName: facultyUser.name || `${facultyUser.firstName || ""} ${facultyUser.lastName || ""}`.trim() || "Faculty Mentor",
      facultyRole: facultyUser.role || "Mentor",
      comment: comment.trim(),
      recommendedActions: Array.isArray(recommendedActions) ? recommendedActions : [],
      createdAt: new Date(),
    });

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
 * Update Faculty Intervention status
 */
exports.updateFacultyActionStatus = async (req, res) => {
  try {
    const studentId = resolveStudentId(req);
    const { actionId, status, notes } = req.body;

    if (!actionId || !status) {
      return res.status(400).json({ success: false, message: "actionId and status are required" });
    }

    const assessment = await PurposeVisionAssessment.findOne({ studentId }).sort({ assessmentVersion: -1 });
    if (!assessment || !Array.isArray(assessment.facultyInterventions)) {
      return res.status(404).json({ success: false, message: "Assessment or faculty interventions not found" });
    }

    const targetAction = assessment.facultyInterventions.find((a) => a.actionId === actionId);
    if (!targetAction) {
      return res.status(404).json({ success: false, message: "Faculty action item not found" });
    }

    targetAction.status = status;
    if (notes) targetAction.notes = notes;
    targetAction.updatedAt = new Date();

    await assessment.save();

    return res.status(200).json({
      success: true,
      message: "Faculty action status updated",
      data: assessment,
    });
  } catch (error) {
    console.error("Error in updateFacultyActionStatus:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

