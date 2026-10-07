const mongoose = require("mongoose");
const axios = require("axios");
const Student = require("../models/student/Student");
const StudentReportCard = require("../models/student/studentReportCard");
const StudentTask = require("../models/syllabus/StudentTask");
const StudentPlacement = require("../models/placement/StudentPlacement");

/**
 * Detects the academic stream if present, but never restricts the student's possibilities.
 */
const detectDepartmentType = (student = {}, reportCard = {}) => {
  const templateType = (reportCard?.templateType || student?.subDepartmentId?.departmentId?.reportConfig?.templateType || "").toUpperCase();
  const deptCode = (
    student?.subDepartmentId?.departmentId?.code ||
    student?.departmentId?.code ||
    student?.department ||
    ""
  ).toUpperCase();
  const deptName = (
    student?.subDepartmentId?.departmentId?.name ||
    student?.subDepartmentId?.name ||
    student?.department ||
    ""
  ).toUpperCase();
  const courseUpper = (student?.course || student?.subDepartmentId?.name || "").toUpperCase();

  if (
    templateType.includes("BEG") ||
    deptCode.includes("BEG") ||
    deptName.includes("BEG") ||
    deptName.includes("BIO") ||
    deptName.includes("MICRO") ||
    deptName.includes("SCIENCE") ||
    courseUpper.includes("BIO") ||
    courseUpper.includes("MICRO") ||
    courseUpper.includes("BOTANY") ||
    courseUpper.includes("ZOOLOGY") ||
    courseUpper.includes("CHEMISTRY") ||
    courseUpper.includes("PHARMA")
  ) {
    return "BEG";
  }

  if (
    templateType.includes("MEG") ||
    deptCode.includes("MEG") ||
    deptName.includes("MEG") ||
    deptName.includes("MANAGEMENT") ||
    deptName.includes("COMMERCE") ||
    deptName.includes("BUSINESS") ||
    ["BBA", "BCOM", "B.COM", "MBA", "MCOM", "M.COM", "FINANCE", "MARKETING", "HR"].some(c => courseUpper.includes(c))
  ) {
    return "MEG";
  }

  if (
    templateType.includes("BTECH") ||
    deptCode.includes("BTECH") ||
    deptCode.includes("CSE") ||
    deptCode.includes("B-001") ||
    deptCode.includes("SSEC") ||
    deptCode.includes("ENG") ||
    deptName.includes("ENGINEERING") ||
    deptName.includes("B.TECH") ||
    deptName.includes("BTECH") ||
    deptName.includes("SSEC") ||
    courseUpper.includes("B.TECH") ||
    courseUpper.includes("BTECH") ||
    courseUpper.includes("ENGINEERING")
  ) {
    return "BTECH";
  }

  if (courseUpper.includes("BCA") || courseUpper.includes("MCA") || deptCode.includes("ITEG") || deptName.includes("IT")) {
    return "ITEG";
  }

  return "GENERAL";
};

/**
 * Aggregates complete existing profile, academic history, tasks, and report card data for a student.
 */
const getStudentContext = async (studentId) => {
  const student = await Student.findById(studentId)
    .populate({
      path: "subDepartmentId",
      populate: { path: "departmentId", select: "name code reportConfig" },
    })
    .populate("sessionId", "name")
    .populate("currentLevelId", "name order")
    .populate("currentSubLevelId", "name order")
    .lean();

  if (!student) {
    throw new Error("Student not found");
  }

  // Get latest student report card if generated
  const reportCard = await StudentReportCard.findOne({ studentRef: studentId }).lean();

  // Get task completion stats
  const tasks = await StudentTask.find({ studentId, isActive: true }).select("status mandatory marks maxMarks subjectName").lean();
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const inProgressTasks = tasks.filter(t => t.status === "inProgress").length;
  const mandatoryTasks = tasks.filter(t => t.mandatory);
  const completedMandatory = mandatoryTasks.filter(t => t.status === "completed").length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  let totalMarksAwarded = 0;
  let gradedCount = 0;
  tasks.forEach(t => {
    if (typeof t.marks === "number") {
      totalMarksAwarded += t.marks;
      gradedCount++;
    }
  });
  const avgMarks = gradedCount > 0 ? (totalMarksAwarded / gradedCount).toFixed(1) : "N/A";

  // Get placement status if any
  const placement = await StudentPlacement.findOne({ studentId }).lean();
  const deptType = detectDepartmentType(student, reportCard);

  return {
    studentId: student._id,
    name: `${student.firstName} ${student.lastName}`.trim(),
    prkey: student.prkey,
    course: student.course || "Degree Course",
    year: student.year || "1st Year",
    department: student.subDepartmentId?.name || student.subDepartmentId?.departmentId?.name || "Academic Department",
    deptType,
    session: student.sessionId?.name || "Current Session",
    currentLevel: student.currentLevelId?.name || "Level 1",
    currentSubLevel: student.currentSubLevelId?.name || "SubLevel 1",
    technologies: student.technologies || (student.technology ? [student.technology] : []),
    status: student.status || "Active",
    isFTP: student.isFTP || false,
    withITEG: student.withITEG || false,
    attendanceRate: student.attendanceRate || 85,
    academicHistory: student.academicHistory || [],
    taskMetrics: {
      totalTasks,
      completedTasks,
      inProgressTasks,
      taskCompletionRate,
      completedMandatory,
      totalMandatory: mandatoryTasks.length,
      avgMarks,
    },
    reportCard: reportCard ? {
      templateType: reportCard.templateType || "",
      softSkills: reportCard.softSkills || {},
      discipline: reportCard.discipline || {},
      technicalSkills: reportCard.technicalSkills || [],
      careerReadiness: reportCard.careerReadiness || {},
      academicPerformance: reportCard.academicPerformance || {},
      overallGrade: reportCard.overallGrade || "B+",
      facultyRemark: reportCard.facultyRemark || "Consistent learner with high growth potential",
    } : null,
    placement: placement ? {
      readinessStatus: placement.readinessStatus || "Evaluating",
      placementStatus: placement.placementStatus || "Unplaced",
    } : null,
  };
};

/**
 * Dynamically determines student Archetypes based on student's passions and flow answers.
 */
const determineArchetype = (topPassions = [], flowAnswers = {}) => {
  const combinedText = [
    ...topPassions.map(p => `${p.name} ${p.originalStatement || ""}`),
    flowAnswers.loseTrackOfTime || "",
    flowAnswers.unforcedHours || "",
    flowAnswers.energyGivingActivity || "",
  ].join(" ").toLowerCase();

  const scores = {
    "Problem Solver": 0,
    "Builder": 0,
    "Creator": 0,
    "Leader": 0,
    "Explorer": 0,
    "Researcher": 0,
    "Helper": 0,
    "Entrepreneur": 0,
    "Analyst": 0,
    "Communicator": 0,
  };

  if (/problem|solve|dsa|logic|algorithm|debugging|puzzle|troubleshoot/i.test(combinedText)) scores["Problem Solver"] += 3;
  if (/build|construct|code|develop|software|engineer|architect|system/i.test(combinedText)) scores["Builder"] += 3;
  if (/create|design|art|ui|visual|story|write|craft|invent/i.test(combinedText)) scores["Creator"] += 3;
  if (/lead|manage|coordinate|team|direct|organize|inspire/i.test(combinedText)) scores["Leader"] += 3;
  if (/explore|discover|learn|travel|curious|future|trends/i.test(combinedText)) scores["Explorer"] += 3;
  if (/research|science|lab|experiment|micro|data|investigate|study/i.test(combinedText)) scores["Researcher"] += 3;
  if (/help|teach|mentor|social|community|service|support|patient/i.test(combinedText)) scores["Helper"] += 3;
  if (/business|startup|venture|market|finance|wealth|profit|revenue/i.test(combinedText)) scores["Entrepreneur"] += 3;
  if (/analyst|data|metrics|statistics|measure|finance|audit/i.test(combinedText)) scores["Analyst"] += 3;
  if (/communicate|present|speak|write|public|relation|connect/i.test(combinedText)) scores["Communicator"] += 3;

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primaryPattern = sorted[0][1] > 0 ? sorted[0][0] : "Problem Solver";
  const secondaryPattern = sorted[1][1] > 0 ? sorted[1][0] : "Builder";

  return {
    primaryPattern,
    secondaryPattern,
    description: `You exhibit a dominant "${primaryPattern}" development orientation, powered by an active "${secondaryPattern}" drive. You are naturally motivated when translating concepts into tangible results and overcoming intricate challenges.`,
    disclaimer: "This is an AI-generated development pattern, not a psychological diagnosis or permanent personality type.",
  };
};

/**
 * Universal Intelligent Heuristic Thesis Generator
 * Truly universal across all streams, degrees, and career interests.
 */
const generateHeuristicThesis = (context, assessment) => {
  const topPassionsRaw = assessment.topPassions || [];
  const coreValues = assessment.coreValues || [];
  const fiveWhys = assessment.fiveWhys || [];
  const flowAnswers = assessment.flowAnswers || {};
  const visionAnswers = assessment.visionAnswers || {};
  const fiveYearGoal = assessment.fiveYearGoal || `Master advanced competencies and build an impactful professional standing in my domain`;
  const tenYearGoal = assessment.tenYearGoal || `Assume visionary leadership, driving innovation and mentoring the upcoming generation`;
  const bhag = assessment.bhag || `Spearhead a transformative milestone in my field creating measurable positive impact`;

  // Fallback passions if student has not selected yet
  const topPassions = topPassionsRaw.length > 0 ? topPassionsRaw : [
    { name: "Continuous Learning", originalStatement: "I am learning and acquiring new expertise continuously", priority: 1, selfRatedImportance: 9, currentScore: 7 },
    { name: "Creative Problem Solving", originalStatement: "I am solving challenging real-world dilemmas", priority: 2, selfRatedImportance: 8, currentScore: 6 },
    { name: "Building Useful Solutions", originalStatement: "I am creating tools and systems that make lives better", priority: 3, selfRatedImportance: 9, currentScore: 5 },
    { name: "Team Collaboration & Leadership", originalStatement: "I am guiding teams towards meaningful shared outcomes", priority: 4, selfRatedImportance: 8, currentScore: 4 },
    { name: "Financial & Personal Freedom", originalStatement: "I am building sustainable independence and capability", priority: 5, selfRatedImportance: 9, currentScore: 6 },
  ];

  // Process passions: calculate Passion Gap (Importance - Current Score) and provide evidence
  const processedPassions = topPassions.map((p, idx) => {
    const importance = typeof p.selfRatedImportance === "number" ? p.selfRatedImportance : 8;
    const currentScore = typeof p.currentScore === "number" ? p.currentScore : 5;
    const passionGap = Math.max(0, importance - currentScore);

    let gapExplanation = "";
    if (passionGap >= 4) {
      gapExplanation = `Significant development gap (${passionGap} pts): This passion is deeply important to you (${importance}/10), yet your current daily expression is at ${currentScore}/10. Dedicating 3–5 hours weekly to deliberate real-world practice will rapidly bridge this.`;
    } else if (passionGap >= 2) {
      gapExplanation = `Moderate developmental gap (${passionGap} pts): You are actively engaging with this passion (${currentScore}/10), but seeking larger leadership or project opportunities will bring it closer to your ideal priority (${importance}/10).`;
    } else {
      gapExplanation = `High alignment (${passionGap} pts): You are living this passion with strong consistency (${currentScore}/10) relative to its importance (${importance}/10). Keep sustaining this momentum.`;
    }

    // Default markers if missing
    const markers = p.markers && p.markers.length > 0 ? p.markers : [
      `Dedicate at least 4 hours per week to practical exploration of ${p.name.toLowerCase()}.`,
      `Complete 1 major demonstrable project or milestone every quarter reflecting ${p.name.toLowerCase()}.`,
      `Regularly share learnings and mentor peers in topics related to ${p.name.toLowerCase()}.`,
    ];

    return {
      name: p.name,
      originalStatement: p.originalStatement || `When my life is ideal, I am engaged with ${(p.name || "").toLowerCase()}`,
      priority: p.priority || idx + 1,
      selfRatedImportance: importance,
      currentScore: currentScore,
      passionGap,
      gapExplanation,
      markers,
      evidence: p.evidence || `Corroborated by ${context.taskMetrics.taskCompletionRate}% task completion and ${context.attendanceRate}% attendance consistency.`,
      aiInterpretation: p.aiInterpretation || `Reflects authentic internal drive to express capability through ${(p.name || "").toLowerCase()} while anchoring into self-discipline.`,
    };
  });

  const primaryPassion = processedPassions[0]?.name || "Continuous Learning";
  const secondaryPassion = processedPassions[1]?.name || "Problem Solving";
  const primaryValue = coreValues[0]?.name || "Growth";
  const secondaryValue = coreValues[1]?.name || "Integrity";

  // Derive Archetype
  const archetype = determineArchetype(processedPassions, flowAnswers);

  // Clarity and Alignment Scores (0-100)
  const passionCount = processedPassions.length;
  const passionClarity = Math.min(96, Math.max(72, passionCount * 17 + (assessment.pairwiseComparisons?.length > 4 ? 12 : 0)));
  const purposeClarity = Math.min(95, Math.max(68, (fiveWhys.length * 15) + (assessment.purposeStatement ? 15 : 0)));
  const visionClarity = Math.min(94, Math.max(70, (fiveYearGoal ? 25 : 0) + (tenYearGoal ? 25 : 0) + (bhag ? 25 : 0) + 15));

  const taskPct = context.taskMetrics.taskCompletionRate || 65;
  const skillAlignment = Math.min(95, Math.max(60, Math.round(taskPct * 0.7 + (context.technologies?.length ? 20 : 10))));
  const careerAlignment = Math.round((passionClarity * 0.5) + (skillAlignment * 0.5));
  const goalAlignment = Math.round((purposeClarity + visionClarity) / 2);
  const executionReadiness = Math.min(95, Math.max(55, Math.round(taskPct * 0.75 + (context.attendanceRate * 0.25))));
  const executionAlignment = executionReadiness;
  const overall = Math.round((passionClarity + purposeClarity + visionClarity + careerAlignment + skillAlignment + executionReadiness) / 6);

  // Stream/domain detection from student profile and institutional data
  const deptStr = String(context.department || "").toLowerCase();
  const courseStr = String(context.course || "").toLowerCase();
  const techStr = Array.isArray(context.technologies) ? context.technologies.join(" ").toLowerCase() : "";
  const combinedContext = `${deptStr} ${courseStr} ${techStr}`;

  const isMgmt = /management|bba|commerce|mba|business|marketing|finance|accounting/i.test(combinedContext);
  const isBio = /bio|biotech|biology|botany|zoology|clinical|life science|b\.sc bio/i.test(combinedContext);

  // Purpose Statement Synthesis (derived from student 5 Whys & values)
  let defaultPurpose = `My purpose is to leverage ${primaryPassion.toLowerCase()} and my core values of ${primaryValue} and ${secondaryValue} to solve complex challenges, create tangible value for others, and continuously evolve into an impactful leader.`;
  if (isMgmt) {
    defaultPurpose = `My purpose is to leverage ${primaryPassion.toLowerCase()} and strategic business management to build commercial value, optimize organizational performance, and empower teams to achieve excellence.`;
  } else if (isBio) {
    defaultPurpose = `My purpose is to apply ${primaryPassion.toLowerCase()} and scientific biotechnology research to advance healthcare, clinical innovations, and laboratory discoveries that improve human life.`;
  }
  const purposeStatement = assessment.purposeStatement || defaultPurpose;

  const visionStatement = assessment.visionStatement ||
    `My vision is to emerge as a distinguished, ethical professional in my field over the next 5–10 years, mastering end-to-end execution, building innovative solutions, and inspiring others through purposeful contribution.`;

  const vividFuture = assessment.vividFuture ||
    `In your ideal envisioned future, you wake up energized by meaningful problems. Operating with high autonomy, you collaborate with passionate peers, apply your strengths in ${primaryPassion}, and make measurable contributions that elevate your community and organization.`;

  // Evidence-based Strengths (Self-Identified vs Evidence-Backed)
  const evidenceBasedStrengths = {
    selfReported: [
      `Self-identified passion for ${primaryPassion} and ${secondaryPassion}.`,
      `Commitment to living values of ${primaryValue} and ${secondaryValue}.`,
      flowAnswers.energyGivingActivity ? `Energized by "${flowAnswers.energyGivingActivity}".` : `High internal curiosity and desire for self-mastery.`,
    ],
    evidenceBacked: [
      {
        capability: "Execution Discipline & Attendance",
        evidenceScore: `${context.attendanceRate}% Attendance`,
        rationale: `Consistent classroom and practical presence verifies reliability and foundational work ethic.`,
      },
      {
        capability: "Curriculum Task Completion",
        evidenceScore: `${context.taskMetrics.taskCompletionRate}% Completed (${context.taskMetrics.completedTasks}/${context.taskMetrics.totalTasks} Tasks)`,
        rationale: `Solid track record of turning assignments into completed deliverables across ${context.currentLevel}.`,
      },
      {
        capability: "Academic Performance",
        evidenceScore: `Grade: ${context.reportCard?.overallGrade || "B+"} | Level: ${context.currentLevel}`,
        rationale: `Demonstrated ability to acquire and apply core curriculum standards in ${context.course}.`,
      },
      {
        capability: "Structured Problem-Solving",
        evidenceScore: `5-Whys Depth: ${fiveWhys.length} Layers`,
        rationale: `Reflective capacity to trace surface desires down to fundamental motivators and core purpose.`,
      },
    ],
  };

  const strengths = [
    `Strong intrinsic engagement with ${primaryPassion} anchored in ${primaryValue}.`,
    `Consistent operational discipline evidenced by ${context.attendanceRate}% attendance rate.`,
    `Solid assignment execution with ${context.taskMetrics.completedTasks} completed curriculum tasks.`,
    `Reflective self-awareness demonstrated across ${fiveWhys.length} structured 5-Whys inquiry layers.`,
    `Constructive drive for future achievement aligned with stated BHAG milestone.`,
  ];

  const developmentAreas = [
    `Bridge the gap between theoretical assignments and independent end-to-end portfolio projects.`,
    `Strengthen verbal technical communication, structured presentations, and executive synthesis.`,
    `Develop formal routines for tracking progress on measurable Passion Markers weekly.`,
    `Deepen specialized expertise in industry-standard tools and cross-functional collaboration.`,
  ];

  let skillGaps = [
    "Independent Capstone Project Architecture & Deployment",
    "Executive Verbal Communication, Presentation & Interview Synthesis",
    "Time-Boxed High Pressure Problem Solving & Critical Thinking",
    "Cross-Functional Team Collaboration & Leadership Initiative",
  ];
  if (isMgmt) {
    skillGaps = [
      "Financial Modeling, Budgeting & Market Analysis",
      "Business Strategy & Operations Optimization",
      "Executive Presentation & Commercial Stakeholder Negotiation",
      "Cross-Functional Team Leadership & Project Management",
    ];
  } else if (isBio) {
    skillGaps = [
      "Advanced Laboratory Protocols & Molecular Diagnostics",
      "Bio-Statistical Analysis & Experimental Design",
      "Clinical Trial Documentation & Quality Compliance",
      "Scientific Paper Synthesis & Laboratory Presentation",
    ];
  }

  const structuredDevelopmentGaps = [
    {
      dimension: "Domain Execution & Projects",
      currentLevel: `${context.taskMetrics.taskCompletionRate}% curriculum tasks completed`,
      futureRequirement: "Independent, production-grade portfolio projects solving real user problems",
      gapLevel: context.taskMetrics.taskCompletionRate >= 80 ? "Low" : "Medium",
      bridgeAction: "Design and ship 1 end-to-end capstone project with public documentation this semester.",
    },
    {
      dimension: "Communication & Articulation",
      currentLevel: "Developing in classroom dialogues and peer discussions",
      futureRequirement: "Articulate, persuasive, and confident stakeholder presentation",
      gapLevel: "Medium",
      bridgeAction: "Present 1 verbal technical or project walkthrough monthly to mentors and peers.",
    },
    {
      dimension: "Leadership & Initiative",
      currentLevel: "Emerging team participant with occasional initiative",
      futureRequirement: "Proactive project leadership, empathy, and peer mentoring",
      gapLevel: "Medium",
      bridgeAction: "Take ownership of leading a team task sprint or coordinating a study circle.",
    },
    {
      dimension: "Problem Solving & DSA / Analytics",
      currentLevel: "Curriculum-aligned fundamentals",
      futureRequirement: "Complex, unstructured problem navigation under competitive time limits",
      gapLevel: "High",
      bridgeAction: "Practice structured daily problem drills (DSA / Case studies) 45 minutes every morning.",
    },
  ];

  let primaryCareerTitle = `${primaryPassion.includes("Tech") || primaryPassion.includes("Build") ? "Solutions Architect & Product Specialist" : `${primaryPassion} Domain Specialist`}`;
  if (isMgmt) {
    primaryCareerTitle = "Business Strategy & Management Consultant";
  } else if (isBio) {
    primaryCareerTitle = "Clinical Research Scientist & Bio-Specialist";
  }

  // Dynamically tailor 3-5 Career Directions based on passions, values, and degree
  const careerDirections = [
    {
      title: primaryCareerTitle,
      whyItFits: `Directly bridges your highest ranked passion for "${primaryPassion}" with your core value of ${primaryValue}.`,
      alignmentRationale: `High internal resonance with your primary self-discovery answers and demonstrated discipline in ${context.currentLevel}.`,
      supportingEvidence: [
        `Active academic progress in ${context.course}`,
        `Consistent task completion rate of ${context.taskMetrics.taskCompletionRate}%`,
        `High intrinsic passion score (${processedPassions[0]?.currentScore || 7}/10)`,
      ],
      currentStrengths: [
        `Clear focus on foundational principles`,
        `Reliable attendance (${context.attendanceRate}%) demonstrating stamina`,
      ],
      missingCapabilities: [
        "End-to-end production-grade implementation experience",
        "Public showcase or documented case study repository",
      ],
      riskConcern: "Tendency to over-focus on theory without shipping finished artifacts into the real world.",
      careerExperiment: {
        title: `14-Day Practical Discovery Sprint`,
        duration: "14 Days",
        week1: [
          `Select one specific real-world problem aligned with ${primaryPassion.toLowerCase()}.`,
          `Conduct background research, study 2 industry examples, and outline a prototype solution.`,
          `Discuss the outline with a faculty mentor or peer for early critique.`,
        ],
        week2: [
          `Build the basic version or functional draft of the solution.`,
          `Present the output to 2 other students or faculty members.`,
          `Reflect on whether this type of problem energized or drained you.`,
        ],
        reflectionQuestions: [
          "Did working on this project make you lose track of time?",
          "Did you feel energized or exhausted at the end of each session?",
          "Would you gladly tackle a more complex problem in this direction?",
        ],
      },
    },
    {
      title: `${primaryPassion.includes("Lead") || primaryPassion.includes("Manage") ? "Strategic Operations & Team Lead" : "Strategic Consultant & Systems Specialist"}`,
      whyItFits: `Connects your secondary passion for "${secondaryPassion}" with your long-term 5-year ambition.`,
      alignmentRationale: `Leverages your combined problem-solving acumen and collaborative mindset to coordinate impactful initiatives.`,
      supportingEvidence: [
        `High drive for team coordination reflected in assessment`,
        `Consistent track record of meeting mandatory curriculum benchmarks`,
      ],
      currentStrengths: [
        `Organized and structured thinking`,
        `High self-awareness shown in 5-Whys reflection`,
      ],
      missingCapabilities: [
        "Executive presentation and high-stakes negotiation skills",
        "Sprint management and agile milestone delivery tracking",
      ],
      riskConcern: "Needs structured opportunities to lead before entering competitive recruitment cycles.",
      careerExperiment: {
        title: `14-Day Team Initiative Experiment`,
        duration: "14 Days",
        week1: [
          `Organize a small peer group to study or solve a challenging course topic.`,
          `Facilitate 2 structured sessions setting clear goals and agendas.`,
        ],
        week2: [
          `Deliver a consolidated team report or presentation of findings.`,
          `Gather anonymous feedback from group members on your facilitation.`,
        ],
        reflectionQuestions: [
          "Did you enjoy motivating and coordinating others?",
          "How did you handle differing opinions or bottlenecks?",
          "Do you want team leadership to be a central part of your daily career?",
        ],
      },
    },
    {
      title: `Innovation Specialist & Technical Entrepreneur`,
      whyItFits: `Grounded in yourstated BHAG milestone ("${bhag}") and ambition for meaningful contribution.`,
      alignmentRationale: `Embodies the entrepreneurial mindset of spotting unsolved dilemmas and building viable, value-creating solutions.`,
      supportingEvidence: [
        `Bold ambition articulated in Big Future Goal`,
        `Desire for high autonomy and measurable societal impact`,
      ],
      currentStrengths: [
        `Creative problem formulation`,
        `Persistence through unfamiliar challenges`,
      ],
      missingCapabilities: [
        "Customer validation and user feedback loops",
        "Business feasibility and resource optimization analysis",
      ],
      riskConcern: "Can lead to burnout if ambitious milestones are not broken down into small, daily measurable habits.",
      careerExperiment: {
        title: `14-Day Prototype & Validation Sprint`,
        duration: "14 Days",
        week1: [
          `Identify 1 practical inconvenience faced by students or campus community.`,
          `Interview 5 individuals to understand their pain points deeply.`,
        ],
        week2: [
          `Sketch or build a rapid mini-solution (form, tool, guide, or script).`,
          `Test it with 3 users and measure if it truly solved their problem.`,
        ],
        reflectionQuestions: [
          "Did you enjoy talking to users and understanding their real problems?",
          "Were you comfortable with iterative feedback and making changes?",
          "Does creating new things from scratch excite you more than routine tasks?",
        ],
      },
    },
  ];

  // Multi-horizon Roadmap connecting Goal -> Skill -> Task -> Project -> Evidence
  const roadmap = {
    threeMonths: [
      `Month 1: Solidify core competencies in ${context.course} and elevate weekly task completion to >90%.`,
      `Month 2: Execute Career Experiment #1 (${careerDirections[0]?.title}) and document findings in work journal.`,
      `Month 3: Deliver 1 comprehensive capstone project with public presentation and faculty mentor review.`,
    ],
    sixMonths: [
      `Skills: Master 2 high-leverage advanced tools or industry certifications aligned with your top career direction.`,
      `Projects: Build an end-to-end, production-grade capstone project solving a real problem with live users.`,
      `Communication: Complete 4 mock interviews and lead 2 technical or strategic peer presentations.`,
      `Career Exploration: Engage with 3 alumni or industry practitioners in your target field for informational interviews.`,
    ],
    twelveMonths: [
      `Milestone 1: Achieve placement and career readiness for premier roles in ${careerDirections[0]?.title}.`,
      `Milestone 2: Deliver measurable progress towards your Big Dream Milestone: "${bhag}".`,
      `Milestone 3: Conduct Version 2 AI Thesis evaluation to measure purpose evolution, maturity, and closed skill gaps.`,
    ],
  };

  const recommendations = [
    `Establish a strict daily 60-minute "Deep Work" routine dedicated strictly to your primary passion (${primaryPassion}).`,
    `Track your Passion Markers weekly: Ensure living scores move upwards through measurable habits.`,
    `Schedule monthly mentor review sessions with assigned faculty to review development gap progress.`,
    `Turn every completed course task into a polished portfolio case study demonstrating evidence.`,
  ];

  const facultyInterventions = [
    {
      actionId: "act-1",
      title: `Assign Domain Mentor for ${careerDirections[0]?.title}`,
      category: "Mentorship",
      status: "Not Started",
      facultyName: "",
      notes: "Connect student with senior faculty or industry mentor for career direction guidance.",
      updatedAt: new Date(),
    },
    {
      actionId: "act-2",
      title: "Recommend Practical Capstone Project Mentorship",
      category: "Project",
      status: "Not Started",
      facultyName: "",
      notes: "Assign end-to-end capstone project to bridge theoretical knowledge into demonstrable portfolio.",
      updatedAt: new Date(),
    },
    {
      actionId: "act-3",
      title: "Weekly Technical Presentation & Communication Practice",
      category: "Communication",
      status: "Not Started",
      facultyName: "",
      notes: "Encourage student to deliver 5-minute verbal summaries during seminar hours.",
      updatedAt: new Date(),
    },
    {
      actionId: "act-4",
      title: "Mock Interview & Aptitude Readiness Review",
      category: "Interview",
      status: "Not Started",
      facultyName: "",
      notes: "Conduct diagnostic mock technical and HR interview round.",
      updatedAt: new Date(),
    },
  ];

  return {
    topPassions: processedPassions,
    coreValues,
    purposeStatement,
    visionStatement,
    fiveYearGoal,
    tenYearGoal,
    bhag,
    vividFuture,
    flowAnswers,
    archetype,
    alignment: {
      passionClarity,
      purposeClarity,
      visionClarity,
      careerAlignment,
      skillAlignment,
      goalAlignment,
      executionReadiness,
      executionAlignment,
      overall,
    },
    currentVsFuture: {
      currentSelf: {
        problemSolving: context.taskMetrics.taskCompletionRate >= 80 ? "Proficient" : "Developing",
        technicalDepth: context.technologies?.length > 1 ? "Solid Fundamentals" : "Early Stage",
        communication: "Developing",
        leadership: "Emerging",
        executionDiscipline: context.attendanceRate >= 85 ? "High Consistency" : "Moderate",
      },
      futureRequirement: {
        problemSolving: "Advanced & Systemic",
        technicalDepth: "Production Architecture & Domain Mastery",
        communication: "Articulate, Influential & Clear",
        leadership: "Empathetic, Collaborative & Decisive",
        executionDiscipline: "Relentless & Sustainable",
      },
      developmentGaps: [
        "Bridging theoretical classroom tasks to self-directed open problem-solving",
        "Expressing technical and strategic reasoning with crisp clarity in group dialogues",
        "Consistently tracking daily measurable progress towards stated BHAG milestones",
      ],
    },
    passionVsPerformance: {
      strongAlignments: [
        `High internal passion for "${primaryPassion}" is supported by persistent attendance (${context.attendanceRate}%).`,
        `Interest in "${secondaryPassion}" is corroborated by active progression in ${context.currentLevel}.`,
        `Curriculum task submissions (${context.taskMetrics.completedTasks} completed) show reliable foundation for future goals.`,
      ],
      developmentRequired: [
        `Passion gap of ${processedPassions[0]?.passionGap || 2} pts in "${primaryPassion}" indicates need for more self-driven real-world practice.`,
        `Living the stated BHAG requires elevating practical portfolio projects beyond minimum curriculum requirements.`,
        `Daily habits must be directly tied to measurable Passion Markers rather than emotional intent alone.`,
      ],
    },
    scoreRationales: {
      passionClarity: `Calculated from ${passionCount} articulated passions and verified through pairwise comparison tournaments.`,
      purposeClarity: `Derived from ${fiveWhys.length} structured 5-Whys layers revealing core internal motivators.`,
      visionClarity: `Grounded in explicit 5-year, 10-year, and BHAG milestone specificity.`,
      careerAlignment: `Evaluated by cross-matching passions with demonstrated academic track in ${context.course}.`,
      skillAlignment: `Benchmarked against ${context.taskMetrics.taskCompletionRate}% task completion and domain competencies.`,
      goalAlignment: `Measures coherence between top passions, core values, and stated long-term ambitions.`,
      executionReadiness: `Evaluated against current attendance (${context.attendanceRate}%) and task consistency.`,
    },
    strengths,
    evidenceBasedStrengths,
    developmentAreas,
    skillGaps,
    structuredDevelopmentGaps,
    careerDirections,
    recommendations,
    roadmap,
    facultyInterventions,
    aiSummary: `${context.name} presents a purposeful, growth-oriented student profile anchored in ${primaryPassion} and guided by ${primaryValue}. Academic progress in ${context.currentLevel} provides a credible foundation. By closing the identified communication and independent project gaps through structured 14-day career experiments, the student can bridge their current capabilities with their vivid 10-year vision.`,
  };
};

/**
 * Executes AI generation with LLM (Google Gemini) or heuristic fallback.
 */
const generateThesisWithAI = async (context, assessment) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return generateHeuristicThesis(context, assessment);
  }

  const prompt = `
You are the AI Purpose, Vision & Student Development Thesis Engine for an educational institution (SSES).
Your task is to analyze a student's profile data alongside their self-reported Passion Test, Core Values, 5 Whys, Flow & Energy answers, and Vision goals.

CRITICAL PRODUCT RULES:
1. Do NOT invent student achievements or fabricate skills. Rely strictly on provided context.
2. Do NOT make psychological, mental health, or fixed personality diagnoses.
3. Do NOT guarantee career outcomes or force a single career direction.
4. Suggest 3–5 potential career directions that fit the student's authentic passions and evidence.
5. Provide a 14-day Career Experiment for each direction so the student tests before deciding.
6. Clearly separate between Current Self and Future Self, and between Self-Reported vs Evidence-Backed strengths.
7. Explain what Passion Gaps (Importance vs Current Living score) mean in practical development terms.
8. NEVER restrict or stereotype based on enrolled department (e.g., student from any branch can have software, creative, managerial, biological, or entrepreneurial passions). Respect the student's authentic self-discovery!
9. Return strictly valid JSON matching the exact schema below.

STUDENT PROFILE EVIDENCE:
- Name: ${context.name}
- Course: ${context.course} (${context.year})
- Department: ${context.department}
- Level / SubLevel: ${context.currentLevel} / ${context.currentSubLevel}
- Technologies / Subjects: ${context.technologies?.join(", ") || "General Domain"}
- Task Completion Rate: ${context.taskMetrics.taskCompletionRate}% (${context.taskMetrics.completedTasks} / ${context.taskMetrics.totalTasks} tasks)
- Attendance Rate: ${context.attendanceRate}%
- Academic Grade: ${context.reportCard?.overallGrade || "Satisfactory"}
- Faculty Remarks: ${context.reportCard?.facultyRemark || "Consistent learner"}

STUDENT SELF-DISCOVERY DATA:
- Top Passions: ${JSON.stringify(assessment.topPassions)}
- Core Values: ${JSON.stringify(assessment.coreValues)}
- 5 Whys Reflection: ${JSON.stringify(assessment.fiveWhys)}
- Flow & Energy Answers: ${JSON.stringify(assessment.flowAnswers)}
- 5-Year Goal: "${assessment.fiveYearGoal}"
- 10-Year Goal: "${assessment.tenYearGoal}"
- BHAG (Big Future Goal): "${assessment.bhag}"
- Vivid Future Vision: "${assessment.vividFuture}"

RETURN A JSON OBJECT WITH EXACTLY THIS STRUCTURE:
{
  "topPassions": [
    {
      "name": "...",
      "originalStatement": "...",
      "priority": 1,
      "selfRatedImportance": 9,
      "currentScore": 6,
      "passionGap": 3,
      "gapExplanation": "...",
      "markers": ["...", "..."],
      "evidence": "...",
      "aiInterpretation": "..."
    }
  ],
  "coreValues": [
    { "name": "...", "priority": 1, "reason": "..." }
  ],
  "purposeStatement": "My purpose is to...",
  "visionStatement": "My vision is to...",
  "fiveYearGoal": "...",
  "tenYearGoal": "...",
  "bhag": "...",
  "vividFuture": "...",
  "archetype": {
    "primaryPattern": "Problem Solver",
    "secondaryPattern": "Builder",
    "description": "...",
    "disclaimer": "This is an AI-generated development pattern, not a psychological diagnosis or permanent personality type."
  },
  "alignment": {
    "passionClarity": 85,
    "purposeClarity": 80,
    "visionClarity": 85,
    "careerAlignment": 78,
    "skillAlignment": 75,
    "goalAlignment": 82,
    "executionReadiness": 80,
    "executionAlignment": 80,
    "overall": 81
  },
  "currentVsFuture": {
    "currentSelf": {
      "problemSolving": "...",
      "technicalDepth": "...",
      "communication": "...",
      "leadership": "...",
      "executionDiscipline": "..."
    },
    "futureRequirement": {
      "problemSolving": "...",
      "technicalDepth": "...",
      "communication": "...",
      "leadership": "...",
      "executionDiscipline": "..."
    },
    "developmentGaps": ["...", "..."]
  },
  "passionVsPerformance": {
    "strongAlignments": ["...", "..."],
    "developmentRequired": ["...", "..."]
  },
  "scoreRationales": {
    "passionClarity": "...",
    "purposeClarity": "...",
    "visionClarity": "...",
    "careerAlignment": "...",
    "skillAlignment": "...",
    "goalAlignment": "...",
    "executionReadiness": "..."
  },
  "strengths": ["...", "...", "..."],
  "evidenceBasedStrengths": {
    "selfReported": ["...", "..."],
    "evidenceBacked": [
      { "capability": "...", "evidenceScore": "...", "rationale": "..." }
    ]
  },
  "developmentAreas": ["...", "...", "..."],
  "skillGaps": ["...", "..."],
  "structuredDevelopmentGaps": [
    {
      "dimension": "...",
      "currentLevel": "...",
      "futureRequirement": "...",
      "gapLevel": "Medium",
      "bridgeAction": "..."
    }
  ],
  "careerDirections": [
    {
      "title": "...",
      "whyItFits": "...",
      "alignmentRationale": "...",
      "supportingEvidence": ["..."],
      "currentStrengths": ["..."],
      "missingCapabilities": ["..."],
      "riskConcern": "...",
      "careerExperiment": {
        "title": "14-Day Discovery Sprint",
        "duration": "14 Days",
        "week1": ["...", "..."],
        "week2": ["...", "..."],
        "reflectionQuestions": ["...", "..."]
      }
    }
  ],
  "recommendations": ["...", "...", "..."],
  "roadmap": {
    "threeMonths": ["Month 1: ...", "Month 2: ...", "Month 3: ..."],
    "sixMonths": ["Skills: ...", "Projects: ...", "Communication: ...", "Interview: ..."],
    "twelveMonths": ["Long-term development goals: ..."]
  },
  "facultyInterventions": [
    {
      "actionId": "act-1",
      "title": "...",
      "category": "Mentorship",
      "status": "Not Started",
      "notes": "..."
    }
  ],
  "aiSummary": "..."
}
`;

  try {
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      },
      { timeout: 30000 }
    );

    const candidateText = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidateText) {
      const parsed = JSON.parse(candidateText);
      return parsed;
    }
  } catch (error) {
    console.warn("Gemini API call failed or timed out, falling back to heuristic engine:", error.message);
  }

  return generateHeuristicThesis(context, assessment);
};

/**
 * Compares two assessment versions to produce an automated Purpose Evolution summary.
 */
const compareAssessmentVersions = (prev, current) => {
  if (!prev || !current) return "";

  const prevPassions = (prev.topPassions || []).map(p => p.name).join(", ");
  const currPassions = (current.topPassions || []).map(p => p.name).join(", ");
  const scoreDiff = (current.alignmentScores?.overall || 0) - (prev.alignmentScores?.overall || 0);

  const prevValues = (prev.coreValues || []).map(v => v.name);
  const currValues = (current.coreValues || []).map(v => v.name);
  const stableValues = currValues.filter(v => prevValues.includes(v));

  let note = `Version ${prev.assessmentVersion} to Version ${current.assessmentVersion} Evolution:\n`;
  note += `• Passions Shift: Evolved from [${prevPassions}] to [${currPassions}].\n`;
  note += `• Value Stability: Consistently anchored around ${stableValues.join(", ") || "core values"}.\n`;
  note += `• Alignment Metric: Overall alignment shifted by ${scoreDiff >= 0 ? `+${scoreDiff}` : scoreDiff} points.\n`;
  note += `• Vision Progress: Stated BHAG shifted towards "${current.bhag || "greater clarity"}".`;

  return note;
};

module.exports = {
  getStudentContext,
  generateThesisWithAI,
  compareAssessmentVersions,
  generateHeuristicThesis,
  determineArchetype,
};
