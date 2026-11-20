const path = require("path");
const cloudinary = require("../../config/cloudinaryConfig");
require("../../models/department/SubDepartment");
require("../../models/Session");
const Student = require("../../models/student/Student");
const VisionBlueprintReport = require("../../models/student/VisionBlueprintReport");
const {
  extractBlueprintFromDocument,
  generateStrategicAlignmentReport,
} = require("../../services/visionBlueprintAiService");

/**
 * Upload buffer to Cloudinary using upload_stream
 */
const uploadBufferToCloudinary = (buffer, filename = `blueprint_${Date.now()}`, resourceType = "auto") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "student_vision_blueprints",
        public_id: filename,
        resource_type: resourceType,
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url || result.url);
      }
    );
    stream.end(buffer);
  });
};

/**
 * POST /api/students/:studentId/vision-blueprint/generate
 * Handles uploading the one-pager document (PDF, Word DOC/DOCX, or Image PNG/JPG/WEBP),
 * extracting data via Gemini / Mammoth, and generating the exhaustive Strategic Alignment Report.
 */
exports.generateVisionBlueprintReport = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.params.id;
    const student = await Student.findById(studentId).populate("subDepartmentId").populate("sessionId");

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    let onePagerImageUrl = "";
    let onePagerFileType = "image";
    let onePagerOriginalName = "";
    let extractedData = null;

    const uploadedFile = req.file || (req.files && req.files[0]);

    // Check if a document or image file was uploaded
    if (uploadedFile) {
      onePagerOriginalName = uploadedFile.originalname || "document";
      const ext = path.extname(onePagerOriginalName).toLowerCase().replace(/^\./, "");
      const isDocx =
        ext === "docx" ||
        ext === "doc" ||
        (uploadedFile.mimetype &&
          (uploadedFile.mimetype.includes("word") || uploadedFile.mimetype.includes("officedocument")));
      const isPdf = ext === "pdf" || (uploadedFile.mimetype && uploadedFile.mimetype.includes("pdf"));

      if (isDocx) {
        onePagerFileType = "docx";
      } else if (isPdf) {
        onePagerFileType = "pdf";
      } else {
        onePagerFileType = "image";
      }

      // 1. Upload to Cloudinary
      const safeName = `blueprint_${student.prkey || studentId}_${Date.now()}`;
      try {
        const resourceType = isDocx ? "raw" : isPdf ? "auto" : "image";
        onePagerImageUrl = await uploadBufferToCloudinary(uploadedFile.buffer, safeName, resourceType);
      } catch (cloudErr) {
        console.warn("Cloudinary upload failed, proceeding without persistent document URL:", cloudErr.message);
      }

      // 2. Extract blueprint fields from document using Gemini Multimodal / Mammoth
      extractedData = await extractBlueprintFromDocument(
        uploadedFile.buffer,
        uploadedFile.mimetype,
        onePagerOriginalName
      );
    } else if (req.body.imageBase64) {
      const base64Data = req.body.imageBase64;
      const buffer = Buffer.from(base64Data.replace(/^data:image\/[a-z]+;base64,/, ""), "base64");
      onePagerFileType = "image";
      onePagerOriginalName = "blueprint_capture.jpg";

      const safeName = `blueprint_${student.prkey || studentId}_${Date.now()}`;
      try {
        onePagerImageUrl = await uploadBufferToCloudinary(buffer, safeName, "image");
      } catch (cloudErr) {
        console.warn("Cloudinary upload failed:", cloudErr.message);
      }

      extractedData = await extractBlueprintFromDocument(buffer, "image/jpeg", "blueprint_capture.jpg");
    } else if (req.body.extractedBlueprint) {
      // Already extracted or manual form submission
      extractedData = req.body.extractedBlueprint;
      onePagerImageUrl = req.body.onePagerImageUrl || "";
      onePagerFileType = req.body.onePagerFileType || "image";
      onePagerOriginalName = req.body.onePagerOriginalName || "";
    } else {
      return res.status(400).json({
        success: false,
        message: "Please upload a one-pager document (PDF, Word .doc/.docx, or Image) or provide blueprint details.",
      });
    }

    // 3. Synthesize the Deep Strategic Alignment Report with Gemini
    const studentProfile = {
      fullName: student.fullName,
      course: student.course,
      departmentName: student.subDepartmentId?.name || "SSES Institute",
      academicYear: student.currentLevelId ? "Active Student" : "Undergraduate",
      prkey: student.prkey,
    };

    const aiReport = await generateStrategicAlignmentReport(extractedData, studentProfile);

    // 4. Save or Update Report in Database
    let reportDoc = await VisionBlueprintReport.findOne({ studentId }).sort({ createdAt: -1 });

    if (!reportDoc) {
      reportDoc = new VisionBlueprintReport({
        studentId,
        onePagerImageUrl,
        onePagerFileType,
        onePagerOriginalName,
        extractedBlueprint: extractedData,
        aiReport,
        status: "completed",
        version: 1,
        lastGeneratedAt: new Date(),
        generatedBy: req.user?.name ? `${req.user.name} (via Gemini 3.5 Flash)` : "AI Leadership Engine (Gemini 3.5 Flash)",
      });
    } else {
      reportDoc.onePagerImageUrl = onePagerImageUrl || reportDoc.onePagerImageUrl;
      reportDoc.onePagerFileType = onePagerFileType || reportDoc.onePagerFileType;
      reportDoc.onePagerOriginalName = onePagerOriginalName || reportDoc.onePagerOriginalName;
      reportDoc.extractedBlueprint = extractedData;
      reportDoc.aiReport = aiReport;
      reportDoc.status = "completed";
      reportDoc.version = (reportDoc.version || 1) + 1;
      reportDoc.lastGeneratedAt = new Date();
      reportDoc.generatedBy = req.user?.name ? `${req.user.name} (via Gemini 3.5 Flash)` : "AI Leadership Engine (Gemini 3.5 Flash)";
    }

    await reportDoc.save();

    return res.status(200).json({
      success: true,
      message: "Vision Blueprint Strategic Alignment Report generated successfully!",
      data: reportDoc,
    });
  } catch (error) {
    console.error("Error generating vision blueprint report:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate report using AI",
    });
  }
};

/**
 * GET /api/students/:studentId/vision-blueprint
 * Retrieve the active vision blueprint report for a given student
 */
exports.getStudentVisionBlueprintReport = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.params.id;
    const report = await VisionBlueprintReport.findOne({ studentId })
      .populate("studentId", "fullName rollNo prkey course admissionNo image contact currentLevelId currentSubLevelId")
      .sort({ createdAt: -1 });

    if (!report) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No blueprint report found for this student yet.",
      });
    }

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Error fetching vision blueprint report:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve vision blueprint report",
      error: error.message,
    });
  }
};

/**
 * PUT /api/students/:studentId/vision-blueprint/:reportId
 * Update / refine report contents manually
 */
exports.updateVisionBlueprintReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { extractedBlueprint, aiReport } = req.body;

    const report = await VisionBlueprintReport.findById(reportId);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    if (extractedBlueprint) report.extractedBlueprint = extractedBlueprint;
    if (aiReport) report.aiReport = aiReport;
    report.updatedAt = new Date();

    await report.save();

    return res.status(200).json({
      success: true,
      message: "Report updated successfully",
      data: report,
    });
  } catch (error) {
    console.error("Error updating vision blueprint report:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update report",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/students/:studentId/vision-blueprint/:reportId
 * Delete a blueprint report
 */
exports.deleteVisionBlueprintReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const deleted = await VisionBlueprintReport.findByIdAndDelete(reportId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Vision blueprint report deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting vision blueprint report:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete report",
      error: error.message,
    });
  }
};
