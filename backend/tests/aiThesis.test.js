const aiThesisService = require("../src/services/aiThesisService");
const PurposeVisionAssessment = require("../src/models/student/PurposeVisionAssessment");
const aiThesisController = require("../src/controllers/student/aiThesisController");

describe("Handwritten Visionary Exercise & AI Thesis Engine", () => {
  const mockContext = {
    studentId: "60c72b2f9b1d8b2badbee001",
    name: "Aman Sharma",
    prkey: "PR202601",
    course: "BCA",
    year: "2nd Year",
    department: "Computer Applications",
    currentLevel: "Level 2",
    currentSubLevel: "SubLevel 2A",
    technologies: ["React", "Node.js", "MongoDB"],
    status: "Active",
    attendanceRate: 90,
    taskMetrics: {
      totalTasks: 20,
      completedTasks: 18,
      inProgressTasks: 2,
      taskCompletionRate: 90,
      avgMarks: "4.5",
    },
    reportCard: {
      overallGrade: "A",
      facultyRemark: "High diligence and strong problem solving",
    },
  };

  const mockAssessment = {
    studentId: "60c72b2f9b1d8b2badbee001",
    assessmentVersion: 1,
    status: "draft",
    handwrittenSubmission: {
      images: [
        {
          pageNumber: 1,
          url: "https://res.cloudinary.com/demo/image/upload/sample_sheet.jpg",
          fileName: "sheet_p1.jpg",
          uploadedAt: new Date(),
        },
      ],
      studentNotes: "Completed visionary blueprint sheet",
      status: "uploaded",
    },
    topPassions: [
      {
        name: "Software Architecture",
        originalStatement: "Designing scalable real-time systems",
        priority: 1,
        currentScore: 9,
      },
    ],
    coreValues: [
      { name: "Craftsmanship", priority: 1, definition: "Striving for clean, elegant code" },
      { name: "Integrity", priority: 2, definition: "Honest in communication" },
    ],
    fiveYearGoal: "Lead a high-performing backend engineering team",
    bhag: "Build an open educational platform serving 1,000,000 learners",
  };

  test("validateAndReconcileEvidence handles missing tasks and attendance without fabricating data", () => {
    const emptyContext = {
      name: "Rohan Verma",
      course: "B.Tech CSE",
      taskMetrics: { totalTasks: 0, completedTasks: 0 },
      attendanceRate: null,
      technologies: [],
    };

    const evidence = aiThesisService.validateAndReconcileEvidence(emptyContext);
    expect(evidence.isValidated).toBe(true);
    expect(evidence.taskMetricsVerified.taskCompletionRate).toBeNull();
    expect(evidence.taskMetricsVerified.status).toBe("Data unavailable");
    expect(evidence.attendanceVerified.rate).toBeNull();
    expect(evidence.attendanceVerified.status).toBe("Data unavailable");
    expect(evidence.dataGaps.length).toBeGreaterThanOrEqual(2);
  });

  test("calculateDevelopmentIndicators computes authentic index scores", () => {
    const verifiedEvidence = aiThesisService.validateAndReconcileEvidence(mockContext);
    const indicators = aiThesisService.calculateDevelopmentIndicators(mockContext, mockAssessment, verifiedEvidence);

    expect(indicators).toHaveProperty("purposeClarity");
    expect(indicators).toHaveProperty("passionClarity");
    expect(indicators).toHaveProperty("overallIndex");
    expect(indicators.purposeClarity.score).toBeGreaterThanOrEqual(0);
    expect(indicators.purposeClarity.score).toBeLessThanOrEqual(100);
    expect(indicators.overallIndex.score).toBeGreaterThanOrEqual(0);
  });

  test("determineArchetype maps passions and skills accurately", () => {
    const techArchetype = aiThesisService.determineArchetype(
      [{ name: "Full-Stack Development" }],
      [{ name: "Innovation" }],
      mockContext
    );
    expect(techArchetype.primaryPattern).toBe("Builder, Architect & Practical Maker");

    const researchArchetype = aiThesisService.determineArchetype(
      [{ name: "Biochemistry & Genetics Research" }],
      [{ name: "Scientific Rigor" }],
      { ...mockContext, course: "B.Sc Biotechnology" }
    );
    expect(researchArchetype.primaryPattern).toBe("Scientific Investigator & Systems Thinker");
  });

  test("compareAssessmentVersions generates coherent evolution summary", () => {
    const prev = {
      assessmentVersion: 1,
      topPassions: [{ name: "Learning Code" }],
      coreValues: [{ name: "Innovation" }],
      alignmentScores: { overall: 70 },
      bhag: "Learn full stack development",
    };

    const current = {
      assessmentVersion: 2,
      topPassions: [{ name: "Building Useful Technology" }],
      coreValues: [{ name: "Innovation" }, { name: "Discipline" }],
      alignmentScores: { overall: 85 },
      bhag: "Empower 100,000 learners",
    };

    const diff = aiThesisService.compareAssessmentVersions(prev, current);
    expect(diff).toContain("Version 1 to Version 2 Evolution");
    expect(diff).toContain("+15 points");
  });

  test("detectDepartmentType detects stream hints without restricting possibilities", () => {
    expect(aiThesisService.detectDepartmentType({ course: "B.Tech CSE" })).toBe("BTECH");
    expect(aiThesisService.detectDepartmentType({ course: "B.Sc Microbiology" })).toBe("BEG");
    expect(aiThesisService.detectDepartmentType({ course: "BBA" })).toBe("MEG");
    expect(aiThesisService.detectDepartmentType({ course: "BCA" })).toBe("ITEG");
    expect(aiThesisService.detectDepartmentType({ course: "BA History" })).toBe("GENERAL");
  });

  test("uploadHandwrittenExercise uploads pages and deletes pages cleanly", async () => {
    const testStudentId = "60c72b2f9b1d8b2badbee099";
    await PurposeVisionAssessment.deleteMany({ studentId: testStudentId });

    // 1. Upload 2 pages
    const uploadReq = {
      user: { id: testStudentId, role: "student" },
      body: {
        images: [
          { url: "https://res.cloudinary.com/demo/image/upload/sample1.jpg", fileName: "page1.jpg" },
          { url: "https://res.cloudinary.com/demo/image/upload/sample2.jpg", fileName: "page2.jpg" },
        ],
        studentNotes: "Handwritten visionary worksheet 2026",
      },
    };

    let statusCode = null;
    let responseBody = null;
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseBody = data;
          },
        };
      },
    };

    await aiThesisController.uploadHandwrittenExercise(uploadReq, res);
    expect(statusCode).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data.handwrittenSubmission.status).toBe("uploaded");
    expect(responseBody.data.handwrittenSubmission.images.length).toBe(2);
    expect(responseBody.data.handwrittenSubmission.images[0].pageNumber).toBe(1);
    expect(responseBody.data.handwrittenSubmission.images[1].pageNumber).toBe(2);

    // 2. Delete page 1
    const delReq = {
      user: { id: testStudentId, role: "student" },
      body: { pageNumber: 1 },
    };
    await aiThesisController.deleteHandwrittenPage(delReq, res);
    expect(statusCode).toBe(200);
    expect(responseBody.data.handwrittenSubmission.images.length).toBe(1);
    expect(responseBody.data.handwrittenSubmission.images[0].pageNumber).toBe(1);

    await PurposeVisionAssessment.deleteMany({ studentId: testStudentId });
  });

  test("updateStatements allows editing confirmed purpose, vision, and goals", async () => {
    const testStudentId = "60c72b2f9b1d8b2badbee098";
    await PurposeVisionAssessment.deleteMany({ studentId: testStudentId });

    await PurposeVisionAssessment.create({
      studentId: testStudentId,
      assessmentVersion: 1,
      status: "draft",
      purposeStatement: "Initial draft purpose",
    });

    const updateReq = {
      user: { id: testStudentId, role: "student" },
      body: {
        purposeStatement: "My authentic confirmed life purpose statement",
        visionStatement: "My 10-year vivid vision statement",
        fiveYearGoal: "Establish independent AI consultancy",
        bhag: "Positively influence 50,000 engineers",
        studentCommitment: "Daily execution for 2 hours",
      },
    };

    let statusCode = null;
    let responseBody = null;
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseBody = data;
          },
        };
      },
    };

    await aiThesisController.updateStatements(updateReq, res);
    expect(statusCode).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data.purposeStatement).toBe("My authentic confirmed life purpose statement");
    expect(responseBody.data.visionStatement).toBe("My 10-year vivid vision statement");
    expect(responseBody.data.fiveYearGoal).toBe("Establish independent AI consultancy");
    expect(responseBody.data.bhag).toBe("Positively influence 50,000 engineers");

    await PurposeVisionAssessment.deleteMany({ studentId: testStudentId });
  });

  test("addMentorFeedback allows faculty mentors to record guidance comments", async () => {
    const testStudentId = "60c72b2f9b1d8b2badbee097";
    await PurposeVisionAssessment.deleteMany({ studentId: testStudentId });

    await PurposeVisionAssessment.create({
      studentId: testStudentId,
      assessmentVersion: 1,
      status: "analyzed",
    });

    const feedbackReq = {
      user: { id: "60c72b2f9b1d8b2badbee888", role: "faculty", name: "Dr. Sharma" },
      params: { studentId: testStudentId },
      body: {
        comment: "Excellent alignment between stated passions and academic project performance.",
        recommendedActions: ["Publish paper", "Attend national hackathon"],
      },
    };

    let statusCode = null;
    let responseBody = null;
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseBody = data;
          },
        };
      },
    };

    await aiThesisController.addMentorFeedback(feedbackReq, res);
    expect(statusCode).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data.mentorFeedback.length).toBe(1);
    expect(responseBody.data.mentorFeedback[0].facultyName).toBe("Dr. Sharma");
    expect(responseBody.data.mentorFeedback[0].comment).toContain("Excellent alignment");

    await PurposeVisionAssessment.deleteMany({ studentId: testStudentId });
  });

  test("analyzeHandwrittenVisionaryExercise throws explicit error when no API key is provided and NO hardcoded fallback is used", async () => {
    const assessmentWithoutSheets = {
      handwrittenSubmission: { images: [] },
    };

    await expect(
      aiThesisService.analyzeHandwrittenVisionaryExercise(mockContext, assessmentWithoutSheets)
    ).rejects.toThrow(/Please upload at least one page/i);

    const assessmentWithSheets = {
      handwrittenSubmission: {
        images: [{ url: "https://example.com/sheet.png", pageNumber: 1 }],
      },
    };

    // With invalid or dummy API keys, it MUST throw an informative error rather than silently fabricating hardcoded templates
    const originalGeminiKey = process.env.GEMINI_API_KEY;
    const originalOpenAiKey = process.env.OPENAI_API_KEY;
    process.env.GEMINI_API_KEY = "dummy_invalid_key";
    delete process.env.OPENAI_API_KEY;

    try {
      await expect(
        aiThesisService.analyzeHandwrittenVisionaryExercise(mockContext, assessmentWithSheets)
      ).rejects.toThrow(/AI Vision Analysis Error/i);
    } finally {
      process.env.GEMINI_API_KEY = originalGeminiKey;
      if (originalOpenAiKey) process.env.OPENAI_API_KEY = originalOpenAiKey;
    }
  });

  it("analyzeHandwrittenVisionaryExercise synthesizes structured thesis when ENABLE_AI_HEURISTIC_FALLBACK=true and AI is unavailable", async () => {
    const mockContext = {
      name: "Aman Sharma",
      course: "BCA",
      department: "IT Education Group",
      currentLevel: "Level 1",
      taskMetrics: { taskCompletionRate: 85 },
    };

    const assessmentWithSheets = {
      handwrittenSubmission: {
        images: [{ url: "https://example.com/sheet.png", pageNumber: 1 }],
        studentNotes: "Interest in Full Stack Development and AI algorithms",
      },
    };

    const originalGeminiKey = process.env.GEMINI_API_KEY;
    const originalFallback = process.env.ENABLE_AI_HEURISTIC_FALLBACK;
    process.env.GEMINI_API_KEY = "dummy_invalid_key";
    process.env.ENABLE_AI_HEURISTIC_FALLBACK = "true";

    try {
      const result = await aiThesisService.analyzeHandwrittenVisionaryExercise(mockContext, assessmentWithSheets);
      expect(result).toBeDefined();
      expect(result.topPassions.length).toBeGreaterThan(0);
      expect(result.careerDirections.length).toBe(3);
      expect(result.roadmap.threeMonths.length).toBeGreaterThan(0);
      expect(result.isHeuristicFallback).toBe(true);
    } finally {
      process.env.GEMINI_API_KEY = originalGeminiKey;
      if (originalFallback !== undefined) {
        process.env.ENABLE_AI_HEURISTIC_FALLBACK = originalFallback;
      } else {
        delete process.env.ENABLE_AI_HEURISTIC_FALLBACK;
      }
    }
  });
});
