const StudentThesis = require("../../models/student/StudentThesis");
const Student = require("../../models/student/Student");
const geminiService = require("../../services/geminiService");
const cloudinary = require("../../config/cloudinaryConfig");
const mongoose = require("mongoose");

exports.uploadAndAnalyzeThesis = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid student ID" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Please upload a PDF file" });
    }

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    // Ensure Cloudinary config is configured properly in this execution context
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // 1. Upload to Cloudinary as "raw" PDF
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "student_theses",
            resource_type: "raw",
            public_id: `thesis_${studentId}_${Date.now()}`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(req.file.buffer);
    });

    // 2. Perform AI analysis using Gemini REST API
    let analysisResult;
    try {
      analysisResult = await geminiService.analyzeThesis(req.file.buffer);
    } catch (aiError) {
      console.error("AI Analysis Error:", aiError);
      return res.status(500).json({
        success: false,
        message: `Failed to analyze thesis with AI: ${aiError.message}`,
        pdfUrl: uploadResult.secure_url,
      });
    }

    // 3. Save or update record in database
    let thesis = await StudentThesis.findOne({ studentRef: studentId });
    if (thesis) {
      thesis.thesisUrl = uploadResult.secure_url;
      thesis.fileName = req.file.originalname;
      thesis.analysis = analysisResult;
      thesis.status = "completed";
      thesis.error = null;
      await thesis.save();
    } else {
      thesis = await StudentThesis.create({
        studentRef: studentId,
        thesisUrl: uploadResult.secure_url,
        fileName: req.file.originalname,
        analysis: analysisResult,
        status: "completed",
      });
    }

    res.status(200).json({
      success: true,
      message: "Thesis uploaded and analyzed successfully",
      data: thesis,
    });
  } catch (error) {
    console.error("Thesis Upload/Analyze Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getStudentThesis = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid student ID" });
    }

    const thesis = await StudentThesis.findOne({ studentRef: studentId });
    if (!thesis) {
      return res.status(404).json({
        success: false,
        message: "No thesis found for this student",
      });
    }

    res.status(200).json({ success: true, data: thesis });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.deleteStudentThesis = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid student ID" });
    }

    const thesis = await StudentThesis.findOneAndDelete({
      studentRef: studentId,
    });
    if (!thesis) {
      return res
        .status(404)
        .json({ success: false, message: "No thesis found to delete" });
    }

    res
      .status(200)
      .json({ success: true, message: "Thesis record deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.downloadThesisTemplate = (req, res) => {
  const path = require("path");
  const fs = require("fs");
  const filePath = path.join(__dirname, "../../../Sample_Student_Thesis.pdf");
  
  if (fs.existsSync(filePath)) {
    res.download(filePath, "Sample_Student_Thesis.pdf");
  } else {
    res.status(404).json({ success: false, message: "Template thesis file not found" });
  }
};
