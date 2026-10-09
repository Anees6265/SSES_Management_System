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

  test("generateHeuristicThesis generates agriculture-specific thesis for Agriculture / Seed Tech students", () => {
    const agriContext = {
      ...mockContext,
      course: "B.Sc Agriculture",
      department: "Agricultural Sciences",
      technologies: ["Soil Science", "Crop Physiology", "Seed Production"],
    };
    const agriAssessment = {
      ...mockAssessment,
      topPassions: [
        { name: "Sustainable Agriculture & Living Systems", originalStatement: "Working with crops, soil health and farming communities" },
        { name: "Organic Farm Solutions", originalStatement: "Improving farmer yield" },
      ],
    };

    const result = aiThesisService.generateHeuristicThesis(agriContext, agriAssessment);
    expect(result.careerDirections[0].title).toMatch(/Agriculture|AgTech|Crop|Seed|Farming/i);
    expect(result.purposeStatement).toMatch(/crop|agricultural|farmer/i);
    expect(result.skillGaps.some(g => g.includes("Soil") || g.includes("Crop") || g.includes("Agri"))).toBe(true);
    expect(result.practicalExperiments.length).toBeGreaterThan(0);
    expect(result.detailedRoadmap).toHaveProperty("thirtyDayActions");
  });

  test("generateHeuristicThesis supports stream-neutrality (e.g. B.Com student whose primary passion is Teaching)", () => {
    const bcomContext = {
      ...mockContext,
      course: "B.Com Honors",
      department: "Commerce",
      technologies: ["Financial Accounting", "Corporate Law", "Taxation"],
    };
    const teachingAssessment = {
      ...mockAssessment,
      topPassions: [
        { name: "Teaching, Mentoring and Explaining Concepts", originalStatement: "I love simplifying difficult topics and tutoring junior students" },
        { name: "Educational Content Creation", originalStatement: "Creating visual notes for learners" },
      ],
    };

    const result = aiThesisService.generateHeuristicThesis(bcomContext, teachingAssessment);
    // Student's stated passion (Teaching) overrides enrolled academic course (Commerce)!
    expect(result.careerDirections[0].title).toMatch(/Educat|Teacher|Mentor|Learning Facilitator/i);
    expect(result.purposeStatement).toMatch(/learners|knowledge|intellectual growth|pedagogy/i);
    expect(result.skillGaps.some(g => g.includes("Instructional") || g.includes("Speaking") || g.includes("Curriculum"))).toBe(true);
  });

  test("generateHeuristicThesis provides gentle guided exploration for undecided students", () => {
    const undecidedContext = {
      ...mockContext,
      course: "BA General",
      department: "Humanities",
      technologies: [],
    };
    const undecidedAssessment = {
      ...mockAssessment,
      topPassions: [
        { name: "Exploring Multiple Fields (Not Sure Yet)", originalStatement: "I have not decided on a single career path yet" },
      ],
      flowAnswers: {
        loseTrackOfTime: "Reading books and discussing ideas with friends",
      },
    };

    const result = aiThesisService.generateHeuristicThesis(undecidedContext, undecidedAssessment);
    expect(result.careerDirections.some(c => c.title.includes("Explor") || c.title.includes("Synthesizer") || c.title.includes("Specialist") || c.title.includes("Consultant"))).toBe(true);
    expect(result.practicalExperiments.length).toBeGreaterThan(0);
    expect(result.roadmap.threeMonths.length).toBeGreaterThan(0);
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

  test("processAdaptiveDiscoveryStep generates adaptive follow-up and tracks explicit vs inferred insights", async () => {
    const assessment = {
      discoveryChat: [],
      discoveryState: {
        currentPhase: "passion",
        currentStepKey: "passion_intro",
        explicitInsights: [],
        inferredPatterns: [],
        uncertainties: [],
      },
    };

    // Turn 1: Student mentions business
    const res1 = await aiThesisService.processAdaptiveDiscoveryStep(
      assessment,
      { stepKey: "passion_intro", studentAnswer: "Business, Startups & Entrepreneurship" },
      mockContext
    );

    expect(res1.nextStep.stepKey).toBe("passion_followup");
    expect(res1.nextStep.message).toContain("Which part of business interests you most");
    expect(res1.discoveryState.explicitInsights.some(i => i.includes("Business"))).toBe(true);
    expect(res1.discoveryState.inferredPatterns.length).toBeGreaterThan(0);

    // Turn 2: Student clarifies
    const res2 = await aiThesisService.processAdaptiveDiscoveryStep(
      assessment,
      { stepKey: "passion_followup", studentAnswer: "Building a startup from scratch" },
      mockContext
    );
    expect(res2.nextStep.stepKey).toBe("passion_energy_flow");
  });

  test("processAdaptiveDiscoveryStep supports unsure students with gentle exploration options", async () => {
    const assessment = {
      discoveryChat: [],
      discoveryState: {
        currentPhase: "passion",
        currentStepKey: "passion_intro",
        explicitInsights: [],
        inferredPatterns: [],
        uncertainties: [],
      },
    };

    const res = await aiThesisService.processAdaptiveDiscoveryStep(
      assessment,
      { stepKey: "passion_intro", studentAnswer: "I am not sure yet (Help me explore)" },
      mockContext
    );

    expect(res.nextStep.stepKey).toBe("passion_followup");
    expect(res.nextStep.message).toMatch(/normal in college|explore together/i);
    expect(res.discoveryState.uncertainties.length).toBeGreaterThan(0);
  });

  test("students are allowed to edit and confirm their purpose & vision statements without 403 Forbidden", async () => {
    const aiThesisController = require("../src/controllers/student/aiThesisController");
    const PurposeVisionAssessment = require("../src/models/student/PurposeVisionAssessment");

    const testStudentId = "60c72b2f9b1d8b2badbee002";
    await PurposeVisionAssessment.create({
      studentId: testStudentId,
      assessmentVersion: 1,
      status: "draft",
      purposeStatement: "Old draft statement",
    });

    const updateReq = {
      user: { id: testStudentId, role: "student" },
      body: {
        confirmedPurpose: "My personalized and confirmed student purpose statement",
        isPurposeAccepted: true,
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
    expect(responseBody.data.confirmedPurpose).toBe("My personalized and confirmed student purpose statement");

    // Clean up
    await PurposeVisionAssessment.deleteMany({ studentId: testStudentId });
  });

  test("saveDraftAssessment saves visionExercises without casting error on workLifePreferences", async () => {
    const aiThesisController = require("../src/controllers/student/aiThesisController");
    const PurposeVisionAssessment = require("../src/models/student/PurposeVisionAssessment");

    const testStudentId = "60c72b2f9b1d8b2badbee003";
    await PurposeVisionAssessment.create({
      studentId: testStudentId,
      assessmentVersion: 1,
      status: "draft",
      visionExercises: {
        idealDay: { where: "Lab" },
      },
    });

    const updateReq = {
      user: { id: testStudentId, role: "student" },
      body: {
        isVisionTestCompleted: true,
        fiveYearGoal: "Lead sustainable research",
        visionExercises: {
          workLifePreferences: {
            collaboration: "Balanced team collaboration",
          },
        },
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

    await aiThesisController.saveDraftAssessment(updateReq, res);
    expect(statusCode).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data.visionExercises.workLifePreferences.collaboration).toBe("Balanced team collaboration");

    // Clean up
    await PurposeVisionAssessment.deleteMany({ studentId: testStudentId });
  });

  test("confirmThesis merges aiResult.visionExercises cleanly without Mongoose subdoc casting error", async () => {
    const aiThesisController = require("../src/controllers/student/aiThesisController");
    const PurposeVisionAssessment = require("../src/models/student/PurposeVisionAssessment");

    const testStudentId = "60c72b2f9b1d8b2badbee004";
    await PurposeVisionAssessment.create({
      studentId: testStudentId,
      assessmentVersion: 1,
      status: "draft",
      topPassions: [
        {
          name: "Sustainable Agriculture",
          originalStatement: "When my life is ideal, I am developing sustainable agriculture solutions",
          priority: 1,
          currentScore: 8,
          markers: ["Farmer advisory"],
        },
      ],
      coreValues: [{ name: "Sustainability", priority: 1 }],
      fiveWhys: [{ level: 1, question: "Why?", answer: "To help community" }],
      fiveYearGoal: "Regional manager",
      bhag: "Empower 1000 farming families",
    });

    const confirmReq = {
      user: { id: testStudentId, role: "student" },
      body: {
        confirmedPurpose: "My validated agriculture purpose",
        confirmedVision: "My vision for local agriculture",
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

    await aiThesisController.confirmThesis(confirmReq, res);
    expect(statusCode).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data.status).toBe("analyzed");
    expect(responseBody.data.visionExercises.workLifePreferences).toBeDefined();
    expect(typeof responseBody.data.visionExercises.workLifePreferences).toBe("object");

    // Clean up
    await PurposeVisionAssessment.deleteMany({ studentId: testStudentId });
  });
});
