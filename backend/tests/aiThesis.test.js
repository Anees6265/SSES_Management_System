const aiThesisService = require("../src/services/aiThesisService");

describe("AI Thesis Service Test Suite", () => {
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
    topPassions: [
      {
        name: "Building Useful Technology",
        originalStatement: "When my life is ideal, I am building technology that solves real-world human problems.",
        priority: 1,
        currentScore: 8,
        markers: ["Ship 3 full-stack projects", "Code 5 days a week"],
      },
      {
        name: "Financial Independence",
        originalStatement: "When my life is ideal, I am financially independent.",
        priority: 2,
        currentScore: 6,
        markers: ["Secure engineering placement"],
      },
    ],
    coreValues: [
      { name: "Innovation", priority: 1, reason: "Drives new solutions" },
      { name: "Discipline", priority: 2, reason: "Ensures consistency" },
      { name: "Learning", priority: 3, reason: "Expands knowledge" },
    ],
    fiveWhys: [
      { level: 1, question: "Why technology?", answer: "Because I like building solutions" },
      { level: 2, question: "Why building solutions?", answer: "To solve real problems" },
    ],
    fiveYearGoal: "Lead a high-performing backend engineering team",
    tenYearGoal: "Architect distributed enterprise systems and mentor youth",
    bhag: "Empower 100,000 learners with smart educational software",
    vividFuture: "Working with inspiring builders to create global digital public goods.",
  };

  test("generateHeuristicThesis returns complete structured JSON matching schema", () => {
    const result = aiThesisService.generateHeuristicThesis(mockContext, mockAssessment);

    expect(result).toHaveProperty("purposeStatement");
    expect(result.purposeStatement).toMatch(/My purpose is to/i);

    expect(result).toHaveProperty("visionStatement");
    expect(result.visionStatement).toMatch(/My vision is to/i);

    expect(result).toHaveProperty("alignment");
    expect(result.alignment.overall).toBeGreaterThanOrEqual(60);
    expect(result.alignment.overall).toBeLessThanOrEqual(100);

    expect(result.strengths.length).toBeGreaterThanOrEqual(3);
    expect(result.developmentAreas.length).toBeGreaterThanOrEqual(2);
    expect(result.careerDirections.length).toBeGreaterThanOrEqual(2);

    expect(result.roadmap).toHaveProperty("threeMonths");
    expect(result.roadmap).toHaveProperty("sixMonths");
    expect(result.roadmap).toHaveProperty("twelveMonths");
    expect(result.roadmap.threeMonths.length).toBeGreaterThan(0);
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

  test("generateHeuristicThesis generates management-specific thesis for MEG students", () => {
    const mgmtContext = {
      ...mockContext,
      course: "BBA",
      department: "Management Studies",
      technologies: ["Business Analytics", "Marketing", "Financial Accounting"],
    };

    const result = aiThesisService.generateHeuristicThesis(mgmtContext, mockAssessment);
    expect(result.careerDirections[0].title).toMatch(/Business|Management|Consultant|Strategy/i);
    expect(result.purposeStatement).toMatch(/business|commercial/i);
    expect(result.skillGaps.some(g => g.includes("Financial") || g.includes("Market"))).toBe(true);
  });

  test("generateHeuristicThesis generates bio-sciences-specific thesis for BEG students", () => {
    const bioContext = {
      ...mockContext,
      course: "B.Sc Biotechnology",
      department: "Bio-Sciences",
      technologies: ["Microbiology", "Biochemistry", "Genetics"],
    };

    const result = aiThesisService.generateHeuristicThesis(bioContext, mockAssessment);
    expect(result.careerDirections[0].title).toMatch(/Clinical|Laboratory|Scientist|Bio/i);
    expect(result.purposeStatement).toMatch(/scientific|healthcare|biotechnology/i);
    expect(result.skillGaps.some(g => g.includes("Laboratory") || g.includes("Molecular"))).toBe(true);
  });

  test("saveDraftAssessment handles raw string arrays in passionStatements without 500 error", async () => {
    const aiThesisController = require("../src/controllers/student/aiThesisController");
    const PurposeVisionAssessment = require("../src/models/student/PurposeVisionAssessment");

    const dummyStudentId = "60c72b2f9b1d8b2badbee001";
    const req = {
      user: { id: dummyStudentId, role: "student" },
      body: {
        passionStatements: ["Solving complex algorithms", "Building UI components"],
        topPassions: [
          { name: "Building UI components", selfRatedImportance: 9, currentScore: 7 }
        ],
        isPassionTestCompleted: true,
      },
    };

    let responseStatus = null;
    let responseData = null;
    const res = {
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => {
            responseData = data;
          },
        };
      },
    };

    // Save mock in DB
    await aiThesisController.saveDraftAssessment(req, res);
    expect(responseStatus).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.data.passionStatements[0].text).toBe("Solving complex algorithms");
    expect(responseData.data.isPassionTestCompleted).toBe(true);

    // Retrieve via getStudentThesis
    const getReq = {
      user: { id: dummyStudentId, role: "student" },
      query: {},
    };
    let getStatus = null;
    let getData = null;
    const getRes = {
      status: (code) => {
        getStatus = code;
        return {
          json: (data) => {
            getData = data;
          },
        };
      },
    };
    await aiThesisController.getStudentThesis(getReq, getRes);
    expect(getStatus).toBe(200);
    expect(getData.success).toBe(true);
    expect(getData.data.assessment).toBeDefined();

    // Clean up
    await PurposeVisionAssessment.deleteMany({ studentId: dummyStudentId });
  });
});
