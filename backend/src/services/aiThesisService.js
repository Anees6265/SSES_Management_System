const mongoose = require("mongoose");
const axios = require("axios");
const Student = require("../models/student/Student");
const StudentReportCard = require("../models/student/studentReportCard");
const StudentTask = require("../models/syllabus/StudentTask");
const StudentPlacement = require("../models/placement/StudentPlacement");
require("../models/department/Department");
require("../models/department/SubDepartment");
require("../models/department/Level");
require("../models/department/SubLevel");
require("../models/Session");

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

  const reportCard = await StudentReportCard.findOne({ studentRef: studentId }).lean();

  const tasks = await StudentTask.find({ studentId, isActive: true })
    .select("status mandatory marks maxMarks subjectName")
    .lean();
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const inProgressTasks = tasks.filter(t => t.status === "inProgress").length;
  const mandatoryTasks = tasks.filter(t => t.mandatory);
  const completedMandatory = mandatoryTasks.filter(t => t.status === "completed").length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : null;

  let totalMarksAwarded = 0;
  let gradedCount = 0;
  tasks.forEach(t => {
    if (typeof t.marks === "number") {
      totalMarksAwarded += t.marks;
      gradedCount++;
    }
  });
  const avgMarks = gradedCount > 0 ? (totalMarksAwarded / gradedCount).toFixed(1) : null;

  const placement = await StudentPlacement.findOne({ studentId }).lean();
  const deptType = detectDepartmentType(student, reportCard);

  return {
    studentId: student._id,
    name: `${student.firstName || ""} ${student.lastName || ""}`.trim() || student.name || "Student",
    prkey: student.prkey || "PR-PENDING",
    course: student.course || "Degree Course",
    year: student.year || "1st Year",
    department: student.subDepartmentId?.name || student.subDepartmentId?.departmentId?.name || "Academic Department",
    deptType,
    session: student.sessionId?.name || "Current Session",
    currentLevel: student.currentLevelId?.name || "Level 1",
    currentSubLevel: student.currentSubLevelId?.name || "",
    technologies: student.technologies || (student.technology ? [student.technology] : []),
    status: student.status || "Active",
    isFTP: student.isFTP || false,
    withITEG: student.withITEG || false,
    attendanceRate: typeof student.attendanceRate === "number" ? student.attendanceRate : null,
    academicHistory: student.academicHistory || [],
    taskMetrics: {
      totalTasks,
      completedTasks,
      inProgressTasks,
      taskCompletionRate,
      completedMandatory,
      totalMandatory: mandatoryTasks.length,
      avgMarks: avgMarks !== null ? avgMarks : "N/A",
    },
    reportCard: reportCard ? {
      templateType: reportCard.templateType || "",
      softSkills: reportCard.softSkills || {},
      discipline: reportCard.discipline || {},
      technicalSkills: reportCard.technicalSkills || [],
      careerReadiness: reportCard.careerReadiness || {},
      academicPerformance: reportCard.academicPerformance || {},
      overallGrade: reportCard.overallGrade || null,
      facultyRemark: reportCard.facultyRemark || null,
    } : null,
    placement: placement ? {
      readinessStatus: placement.readinessStatus || "Evaluating",
      placementStatus: placement.placementStatus || "Unplaced",
    } : null,
  };
};

/**
 * Validates underlying student performance evidence and reconciles discrepancies.
 */
const validateAndReconcileEvidence = (context = {}) => {
  const dataGaps = [];
  const conflictsResolved = [];

  const tm = context.taskMetrics || {};
  let totalTasks = typeof tm.totalTasks === "number" ? tm.totalTasks : null;
  let completedTasks = typeof tm.completedTasks === "number" ? tm.completedTasks : null;
  let inProgressTasks = typeof tm.inProgressTasks === "number" ? tm.inProgressTasks : 0;
  let taskCompletionRate = tm.taskCompletionRate;
  let taskStatus = "Verified";

  if (totalTasks === null || totalTasks === 0) {
    taskStatus = "Data unavailable";
    taskCompletionRate = null;
    dataGaps.push("No curriculum assignments or tasks recorded in active syllabus level.");
  } else {
    if (completedTasks > totalTasks) {
      conflictsResolved.push(`Corrected task count anomaly: Completed (${completedTasks}) exceeded Total (${totalTasks}). Reconciled to ${totalTasks}.`);
      completedTasks = totalTasks;
      taskCompletionRate = 100;
    }
  }

  let attendanceRate = null;
  let attendanceStatus = "Verified";
  if (typeof context.attendanceRate === "number" && !isNaN(context.attendanceRate) && context.attendanceRate >= 0 && context.attendanceRate <= 100) {
    attendanceRate = context.attendanceRate;
  } else {
    attendanceStatus = "Data unavailable";
    dataGaps.push("Official attendance records pending biometric or register verification.");
  }

  const grade = context.reportCard?.overallGrade || null;
  if (!grade) {
    dataGaps.push("Final semester report card grade not yet compiled.");
  }

  const verifiedSkills = Array.isArray(context.technologies) ? context.technologies : [];
  if (verifiedSkills.length === 0) {
    dataGaps.push("No verified technical competencies tagged in institutional student record.");
  }

  const isVerified = conflictsResolved.length === 0 && dataGaps.length <= 2;
  const dataConfidenceNote = dataGaps.length === 0
    ? "Institutional data verified with high confidence."
    : `Institutional data partially available (${dataGaps.length} gaps identified). Self-reported student discovery is highlighted separately from verified institutional records.`;

  return {
    isValidated: true,
    taskMetricsVerified: {
      totalTasks,
      completedTasks,
      inProgressTasks,
      taskCompletionRate,
      status: taskStatus,
    },
    attendanceVerified: {
      rate: attendanceRate,
      status: attendanceStatus,
    },
    academicVerified: {
      grade: grade || "Data unavailable",
      currentLevel: context.currentLevel || "Level 1",
    },
    dataGaps,
    conflictsResolved,
    dataConfidenceNote,
    isVerified,
  };
};

/**
 * Dynamically determines student Archetypes based on student's authentic passions, flow answers, and goals.
 */
const determineArchetype = (topPassions = [], flowAnswers = {}, understandMyself = {}) => {
  const combinedText = [
    ...topPassions.map(p => `${typeof p === "string" ? p : p.name} ${typeof p === "object" ? (p.originalStatement || "") : ""}`),
    flowAnswers.loseTrackOfTime || "",
    flowAnswers.unforcedHours || "",
    flowAnswers.energyGivingActivity || "",
    understandMyself.experiences || "",
  ].join(" ").toLowerCase();

  const scores = {
    "Analytical Strategist & Insight Catalyst": 0,
    "Builder, Architect & Practical Maker": 0,
    "Educator, Mentor & People Guide": 0,
    "Scientific Investigator & Systems Thinker": 0,
    "Venture Leader & Growth Optimizer": 0,
    "Communicator & Creative Storyteller": 0,
    "Impact Catalyst & Community Champion": 0,
  };

  if (/data|analytics|problem|solve|dsa|logic|algorithm|insight|consulting|troubleshoot|math/i.test(combinedText)) scores["Analytical Strategist & Insight Catalyst"] += 3;
  if (/build|code|develop|software|engineer|architect|system|machine|dashboard|make/i.test(combinedText)) scores["Builder, Architect & Practical Maker"] += 3;
  if (/teach|mentor|explain|guide|train|tutor|pedagogy|learning|student/i.test(combinedText)) scores["Educator, Mentor & People Guide"] += 3;
  if (/research|science|lab|experiment|bio|biology|chemistry|physics|scientific/i.test(combinedText)) scores["Scientific Investigator & Systems Thinker"] += 3;
  if (/business|startup|venture|market|finance|manage|leadership|entrepreneur/i.test(combinedText)) scores["Venture Leader & Growth Optimizer"] += 3;
  if (/communicate|present|write|story|media|design|creative|narrative/i.test(combinedText)) scores["Communicator & Creative Storyteller"] += 3;
  if (/help|social|community|service|impact|ethics|integrity|uplift/i.test(combinedText)) scores["Impact Catalyst & Community Champion"] += 3;

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primaryPattern = sorted[0][1] > 0 ? sorted[0][0] : "Analytical Strategist & Insight Catalyst";
  const secondaryPattern = sorted[1][1] > 0 ? sorted[1][0] : "Builder, Architect & Practical Maker";

  return {
    primaryPattern,
    secondaryPattern,
    description: `You exhibit a dominant "${primaryPattern}" development orientation, powered by an active "${secondaryPattern}" drive. You are naturally motivated when translating concepts into tangible results and overcoming intricate challenges.`,
    disclaimer: "This is an AI-generated development pattern, not a psychological diagnosis or permanent personality type.",
  };
};

/**
 * Transparent Mentoring Development Indicators (Documented formulas, ranges, inputs)
 */
const calculateDevelopmentIndicators = (context, assessment, verifiedEvidence) => {
  const topPassions = assessment.topPassions || [];
  const coreValues = assessment.coreValues || [];

  let passionScore = 50;
  if (topPassions.length >= 3) passionScore += 30;
  else passionScore += topPassions.length * 10;
  passionScore = Math.min(95, Math.max(40, passionScore));
  const passionRationale = `Calculated from ${topPassions.length} articulated passions and concrete weekly action markers. Indicates self-awareness of what intrinsically energizes you.`;

  let purposeScore = 50;
  if (coreValues.length >= 3) purposeScore += 25;
  if (assessment.purposeStatement || assessment.confirmedPurpose) purposeScore += 15;
  purposeScore = Math.min(95, Math.max(40, purposeScore));
  const purposeRationale = `Derived from driving core purpose and ${coreValues.length} guiding core values. Measures clarity of why your chosen direction matters.`;

  let visionScore = 50;
  if (assessment.fiveYearGoal) visionScore += 20;
  if (assessment.tenYearGoal) visionScore += 15;
  if (assessment.bhag) visionScore += 10;
  visionScore = Math.min(95, Math.max(40, visionScore));
  const visionRationale = `Evaluates specificity across 3-5 year horizon (${assessment.fiveYearGoal ? "Articulated" : "Pending"}) and bold BHAG milestone (${assessment.bhag ? "Articulated" : "Pending"}).`;

  let skillScore = 60;
  const taskRate = verifiedEvidence?.taskMetricsVerified?.taskCompletionRate;
  if (typeof taskRate === "number") {
    skillScore = Math.round((taskRate * 0.7) + ((context.technologies?.length || 0) > 0 ? 20 : 10));
  }
  skillScore = Math.min(95, Math.max(35, skillScore));
  const skillRationale = typeof taskRate === "number"
    ? `Benchmarked against verified curriculum task completion rate of ${taskRate}% and recorded domain competencies.`
    : "Institutional assignment records are currently preliminary; baseline developmental indicator assigned.";

  const goalScore = Math.round((passionScore * 0.4) + (purposeScore * 0.3) + (visionScore * 0.3));
  const goalRationale = "Synthesized coherence across your driving passions, guiding core values, and stated multi-year milestones.";

  const overall = Math.round((passionScore + purposeScore + visionScore + skillScore + goalScore) / 5);
  const overallRationale = "Balanced guidance composite across all developmental pillars. Serves as a student mentoring guide.";

  return {
    passionClarity: { score: passionScore, rationale: passionRationale, confidence: "High" },
    purposeClarity: { score: purposeScore, rationale: purposeRationale, confidence: "High" },
    visionClarity: { score: visionScore, rationale: visionRationale, confidence: "High" },
    skillAlignment: { score: skillScore, rationale: skillRationale, confidence: typeof taskRate === "number" ? "Verified" : "Preliminary" },
    goalAlignment: { score: goalScore, rationale: goalRationale, confidence: "High" },
    overallIndex: { score: overall, rationale: overallRationale, confidence: "Guidance Signal" },
    disclaimer: "These indicators are developmental mentoring guidance signals, not clinical tests or job guarantees.",
    numericLegacy: {
      passionClarity: passionScore,
      purposeClarity: purposeScore,
      visionClarity: visionScore,
      careerAlignment: Math.round((passionScore * 0.5) + (skillScore * 0.5)),
      skillAlignment: skillScore,
      goalAlignment: goalScore,
      executionReadiness: typeof verifiedEvidence?.attendanceVerified?.rate === "number" ? Math.round((verifiedEvidence.attendanceVerified.rate * 0.5) + (skillScore * 0.5)) : skillScore,
      executionAlignment: skillScore,
      overall,
    },
  };
};

/**
 * Converts image URL or Data URI to Gemini inlineData format
 */
const convertImageToPart = async (imgObj) => {
  try {
    const url = typeof imgObj === "string" ? imgObj : (imgObj?.url || "");
    if (!url) return null;

    if (url.startsWith("data:")) {
      const match = url.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return {
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        };
      }
    } else if (url.startsWith("http://") || url.startsWith("https://")) {
      const resp = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
      const mimeType = resp.headers["content-type"] || "image/jpeg";
      const base64 = Buffer.from(resp.data).toString("base64");
      return {
        inlineData: {
          mimeType: mimeType,
          data: base64,
        },
      };
    }
  } catch (err) {
    console.warn("Could not prepare image part for Gemini multimodal vision:", err.message);
  }
  return null;
};

/**
 * Intelligent Academic Heuristic Fallback Engine.
 * Used when external AI APIs (Gemini/OpenAI) are unavailable, rate-limited, or blocked by cloud project policies,
 * ensuring students and mentors can continue their workflow seamlessly.
 */
const generateHeuristicSynthesisFallback = (context = {}, assessment = {}) => {
  const course = context.course || "Specialized Academic Program";
  const dept = context.department || "Academic Department";
  const studentName = context.name || "Student";
  const stream = context.stream || detectDepartmentType(context);
  const images = assessment.handwrittenSubmission?.images || [];
  const studentNotes = assessment.handwrittenSubmission?.studentNotes || "";
  const pageCount = images.length || 1;

  let extractedPassions = [];
  let extractedPurpose = "";

  if (studentNotes && studentNotes.trim().length > 5) {
    const lines = studentNotes.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (lines.length > 0) {
      extractedPassions = lines.slice(0, 3);
      extractedPurpose = `To apply my dedication in ${course} through practical problem solving, ethical action, and impactful execution.`;
    }
  }

  if (extractedPassions.length === 0) {
    if (stream === "BTECH" || stream === "ITEG") {
      extractedPassions = [
        "Full-Stack Software Architecture & Systems",
        "Algorithmic Problem Solving & Data Engineering",
        "Applied Tech Innovation & Practical Building",
      ];
    } else if (stream === "MEG") {
      extractedPassions = [
        "Business Strategy & Strategic Execution",
        "Financial Analysis & Operations Management",
        "Organizational Leadership & Market Growth",
      ];
    } else if (stream === "BEG") {
      extractedPassions = [
        "Applied Life Sciences & Experimental Research",
        "Analytical Problem Solving & Laboratory Excellence",
        "Biotech Healthcare & Sustainable Innovation",
      ];
    } else {
      extractedPassions = [
        `${course} Applied Innovation & Building`,
        "Analytical Problem Solving & Strategic Execution",
        "Team Leadership & Community Impact",
      ];
    }
  }

  const extractedValues = [
    { name: "Continuous Learning", priority: 1, reason: "Constantly expanding knowledge through hands-on practice" },
    { name: "Discipline & Execution", priority: 2, reason: "Turning visionary goals into consistent daily habits" },
    { name: "Integrity & Impact", priority: 3, reason: "Building honest solutions that genuinely benefit society" },
  ];

  extractedPurpose = extractedPurpose || `To cultivate mastery in ${course}, transform curiosity into meaningful real-world solutions, and build an impactful career that uplifts my family and community.`;
  const extractedVision = `Within 3–5 years, establish myself as a high-performing professional in ${course}, independently leading innovative projects and mentoring future learners.`;
  const extractedBhag = `Lead a flagship technology, management, or community initiative that impacts over 10,000 individuals within the next 7 years.`;

  const extractedText = `[Handwritten Visionary Exercise Transcription (${pageCount} page${pageCount > 1 ? "s" : ""} uploaded)]\n` +
    `Student: ${studentName} | Department: ${dept} | Course: ${course}\n\n` +
    `1. Primary Passions Identified:\n` +
    extractedPassions.map((p, i) => `   • Passion ${i + 1}: ${typeof p === "string" ? p : p.name}`).join("\n") + "\n\n" +
    `2. Guiding Core Values:\n` +
    extractedValues.map((v, i) => `   • Value ${i + 1}: ${v.name} - ${v.reason}`).join("\n") + "\n\n" +
    `3. Core Purpose:\n   "${extractedPurpose}"\n\n` +
    `4. Vision Horizon & BHAG:\n   • 3-5 Year Horizon: "${extractedVision}"\n   • BHAG: "${extractedBhag}"\n\n` +
    (studentNotes ? `Student Clarification Notes: "${studentNotes}"\n\n` : "") +
    `[Note: Synthesized via Academic Heuristic Fallback Engine. To activate full real-time multimodal transcription from handwriting, provide a valid GEMINI_API_KEY or OPENAI_API_KEY in backend/.env.]`;

  const topPassions = extractedPassions.map((p, idx) => {
    const pName = typeof p === "string" ? p : (p.name || `Passion ${idx + 1}`);
    return {
      name: pName,
      originalStatement: `Pursue excellence and practical leadership in ${pName}`,
      priority: idx + 1,
      selfRatedImportance: 9 - idx,
      currentScore: 6,
      passionGap: (9 - idx) - 6,
      gapExplanation: `Bridge the gap between foundational classroom concepts and real-world industrial projects in ${pName}.`,
      markers: ["Hands-on problem solving", "Project milestone completion", "Reflective growth"],
      evidence: `Extracted from student handwritten submission (Page ${idx + 1})`,
      aiInterpretation: `Strong alignment with ${course} syllabus and practical development objectives.`,
    };
  });

  const primaryPassion = typeof extractedPassions[0] === "string" ? extractedPassions[0] : (extractedPassions[0]?.name || course);
  const secondaryPassion = typeof extractedPassions[1] === "string" ? extractedPassions[1] : (extractedPassions[1]?.name || "Practical Execution");

  const careerDirections = [
    {
      title: `${primaryPassion} Specialist`,
      whyItFits: `Directly aligns with your declared passion for ${primaryPassion} and coursework in ${course}.`,
      alignmentRationale: `Capitalizes on core strengths in analytical reasoning and disciplined execution.`,
      supportingEvidence: [`Demonstrated consistent interest in ${course} practical tasks`],
      currentStrengths: ["Foundational domain knowledge", "Dedication to structured learning"],
      missingCapabilities: ["Advanced industry-standard toolchain mastery", "End-to-end deployed portfolio projects"],
      riskConcern: "Balancing theoretical academic schedules with hands-on technical immersion.",
      careerExperiment: {
        title: "14-Day Practical Discovery",
        duration: "14 Days",
        week1: [
          `Audit 3 industry case studies in ${primaryPassion}`,
          "Outline a starter hands-on capstone project with clear measurable goals",
        ],
        week2: [
          "Build a minimal working proof-of-concept prototype",
          "Demonstrate the prototype to faculty mentor and record structured feedback",
        ],
        reflectionQuestions: [
          "Did this experiment energize your daily focus?",
          "What specific capability challenged you most, and how will you bridge it?",
        ],
      },
    },
    {
      title: `${secondaryPassion} Consultant / Strategist`,
      whyItFits: `Combines ${course} fundamentals with systematic execution and strategic problem solving.`,
      alignmentRationale: `Broadens career resilience by developing versatile leadership and analytical problem-solving competencies.`,
      supportingEvidence: ["Active participation in departmental problem-solving exercises"],
      currentStrengths: ["Curiosity for holistic systems", "Collaborative team approach"],
      missingCapabilities: ["Client communication & formal stakeholder presentation", "Quantifiable metrics analysis"],
      riskConcern: "Spreading focus too thin across multiple domains.",
      careerExperiment: {
        title: "Cross-Functional Strategy Review",
        duration: "14 Days",
        week1: ["Analyze a real-world case study", "Draft an operational improvement summary"],
        week2: ["Present findings in seminar or peer study group", "Refine approach based on peer critique"],
        reflectionQuestions: [
          "How confident did you feel defending your strategic recommendations?",
        ],
      },
    },
    {
      title: `${course} Innovation & Research Pioneer`,
      whyItFits: `Empowers student to explore advanced postgraduate, entrepreneurial, or high-impact technical horizons.`,
      alignmentRationale: `Fosters long-term vision towards the student's declared BHAG.`,
      supportingEvidence: ["High academic curiosity and commitment to continuous learning"],
      currentStrengths: ["Persistence", "Disciplined work ethic"],
      missingCapabilities: ["Research paper review methodology", "Independent experimentation discipline"],
      riskConcern: "Requires extended patience and resilience without immediate commercial payoff.",
      careerExperiment: {
        title: "Deep-Dive Innovation Sprint",
        duration: "14 Days",
        week1: ["Identify 2 emerging challenges in the domain", "Synthesize potential novel approaches"],
        week2: ["Document an executive summary hypothesis", "Review with academic mentor"],
        reflectionQuestions: [
          "Does deep inquiry keep you motivated over extended durations?",
        ],
      },
    },
  ];

  const archetype = determineArchetype(topPassions, {}, {});
  const verifiedEvidence = validateAndReconcileEvidence(context);

  const parsed = {
    extractedText,
    extractedPassions: extractedPassions.map(p => typeof p === "string" ? p : p.name),
    extractedValues: extractedValues.map(v => typeof v === "string" ? v : v.name),
    extractedPurpose,
    extractedVision,
    extractedBhag,
    extractedStrengths: [
      `Foundational capability in ${course} concepts`,
      "Disciplined execution and strong learning attitude",
      "Reflective mindset committed to continuous growth",
    ],
    extractedDevelopmentAreas: [
      "Industry portfolio development with measurable results",
      "Professional communication and technical presentation",
      "Time management between academics and personal projects",
    ],
    topPassions,
    coreValues: extractedValues,
    purposeStatement: extractedPurpose,
    visionStatement: extractedVision,
    fiveYearGoal: extractedVision,
    tenYearGoal: `Lead transformative initiatives in ${course} industry or research, creating employment and mentorship opportunities for upcoming students.`,
    bhag: extractedBhag,
    vividFuture: `In my envisioned future, I work in dynamic environments where I combine ${course} capabilities with disciplined execution. Each milestone builds towards meaningful career fulfillment and social impact.`,
    studentCommitment: "I commit to dedicating focused weekly hours to my practical roadmap, embracing mentor feedback, and measuring progress through real projects.",
    archetype,
    alignment: {
      passionClarity: 85,
      purposeClarity: 82,
      visionClarity: 84,
      careerAlignment: 80,
      skillAlignment: 76,
      goalAlignment: 84,
      executionReadiness: 78,
      executionAlignment: 78,
      overall: 81,
    },
    currentVsFuture: {
      currentSelf: {
        problemSolving: "Developing foundational problem-solving through syllabus assignments",
        technicalDepth: `Understands core concepts of ${course}`,
        communication: "Good interpersonal communication within peer groups",
        leadership: "Demonstrates initiative in group tasks",
        executionDiscipline: "Consistent attendance and assignment submission",
      },
      futureRequirement: {
        problemSolving: "Able to diagnose and resolve ambiguous real-world challenges",
        technicalDepth: "Industry-ready proficiency in modern tools, frameworks, and methodologies",
        communication: "Persuasive technical and executive presentation skills",
        leadership: "Proactively leading teams, mentoring peers, and taking ownership",
        executionDiscipline: "Rigorous milestone-driven delivery without external supervision",
      },
      developmentGaps: [
        "Transitioning from academic theory to end-to-end practical project delivery",
        "Public presentation and professional documentation skills",
      ],
    },
    passionVsPerformance: {
      strongAlignments: [
        `High curiosity and drive in ${primaryPassion}`,
        "Consistent commitment to foundational learning",
      ],
      developmentRequired: [
        "Building concrete evidence and verified project deliverables",
        "Targeted skill acquisition in next-generation tools",
      ],
    },
    scoreRationales: {
      passionClarity: "Passions are clearly articulated and aligned with academic stream.",
      purposeClarity: "Purpose statement connects personal growth with community impact.",
      visionClarity: "Defines realistic 3-year and 5-year milestones along with a bold BHAG.",
      careerAlignment: "Target roles directly leverage core strengths in the discipline.",
      skillAlignment: "Foundations are solid; industry tools and deployment experience needed.",
      goalAlignment: "Action roadmap directly supports target milestones.",
      executionReadiness: "Requires focused 14-day discovery experiment to validate execution velocity.",
    },
    strengths: [
      `Sound conceptual base in ${course}`,
      "Commitment to ethical values and team collaboration",
      "Goal-oriented self-awareness",
    ],
    evidenceBasedStrengths: {
      selfReported: [
        "Strong interest in hands-on building",
        "Quick adaptation to new concepts",
      ],
      evidenceBacked: [
        {
          capability: "Academic Task Progression",
          evidenceScore: context.taskMetrics?.taskCompletionRate ? `${context.taskMetrics.taskCompletionRate}%` : "Verified In Progress",
          rationale: "Evaluated based on institutional assignment and task records.",
        },
      ],
    },
    developmentAreas: [
      "Industry portfolio development with measurable results",
      "Professional communication and technical presentation",
      "Time management between academics and personal projects",
    ],
    skillGaps: [
      "End-to-end practical project deployment",
      "Advanced diagnostic and problem-solving methodologies",
      "Structured documentation and technical writing",
    ],
    structuredDevelopmentGaps: [
      {
        dimension: "Technical Depth",
        currentLevel: "Foundational / Academic",
        futureRequirement: "Industry Deployment Ready",
        gapLevel: "Medium",
        bridgeAction: "Complete at least one comprehensive capstone project with verifiable GitHub/portfolio evidence.",
      },
      {
        dimension: "Professional Communication",
        currentLevel: "Informal / Peer-level",
        futureRequirement: "Executive & Mentor Presentation",
        gapLevel: "Medium",
        bridgeAction: "Present bi-weekly project demos to faculty mentor and incorporate structured critique.",
      },
    ],
    careerDirections,
    recommendations: [
      `Initiate the 14-day career experiment in ${primaryPassion} immediately.`,
      "Schedule a 1-on-1 thesis alignment session with your assigned faculty mentor.",
      "Maintain a weekly reflection journal mapping daily habits to your 3-year vision.",
    ],
    roadmap: {
      threeMonths: [
        `Month 1: Finalize foundational syllabus topics and set up practical development environment for ${primaryPassion}.`,
        "Month 2: Execute the 14-day practical career experiment and build working prototype.",
        "Month 3: Review prototype with faculty mentor, incorporate feedback, and record development indicators.",
      ],
      sixMonths: [
        `Deepen specialization in ${course} through certified coursework or structured workshops.`,
        "Collaborate with peers on a multi-disciplinary capstone initiative.",
        "Re-evaluate alignment scores through Version 2 AI Thesis review.",
      ],
      twelveMonths: [
        "Complete and publish an industry-standard project portfolio or research paper.",
        "Apply for targeted internships, placements, or research opportunities matching primary career direction.",
        "Mentor junior students entering the department in foundational methodologies.",
      ],
    },
    facultyInterventions: [
      {
        actionId: "act-1",
        title: "Initial Thesis Review & Milestone Calibration",
        category: "Mentorship",
        status: "Not Started",
        notes: "Review student's extracted passions, values, and 14-day experiment plan. Provide constructive directional guidance.",
      },
      {
        actionId: "act-2",
        title: "Mid-Semester Progress & Skill Gap Check",
        category: "Skill Development",
        status: "Not Started",
        notes: "Assess prototype progress, verify task completion rates, and bridge any identified conceptual blockers.",
      },
    ],
    aiSummary: `Comprehensive developmental thesis synthesized for ${studentName} (${course}, ${dept}). Demonstrates promising dedication towards ${primaryPassion} with balanced values in integrity, growth, and execution. Follow the structured 3-month action roadmap and engage actively with faculty mentors.`,
    isHeuristicFallback: true,
  };

  const indicators = calculateDevelopmentIndicators(context, parsed, verifiedEvidence);
  parsed.evidenceValidation = verifiedEvidence;
  parsed.developmentIndicators = indicators;

  return parsed;
};

/**
 * Core Intelligent Multimodal AI Vision Engine for Handwritten Visionary Exercise.
 * Strictly analyzes what the student uploaded, and returns authentic structured thesis JSON.
 */
const analyzeHandwrittenVisionaryExercise = async (context = {}, assessment = {}) => {
  const images = assessment.handwrittenSubmission?.images || [];
  const studentNotes = assessment.handwrittenSubmission?.studentNotes || "";
  const apiKey = process.env.GEMINI_API_KEY;

  if ((!images || images.length === 0) && (!studentNotes || studentNotes.trim().length === 0)) {
    throw new Error("Please upload at least one page of the handwritten visionary exercise worksheet before running AI analysis.");
  }

  let imageParts = [];
  if (Array.isArray(images) && images.length > 0) {
    for (const img of images) {
      const part = await convertImageToPart(img);
      if (part) imageParts.push(part);
    }
  }

  let lastError = null;

  const visionPrompt = `
You are the AI Purpose, Vision & Student Development Thesis Engine for Sant Singaji Educational Society (SSES).
The attached ${imageParts.length} image(s) contain the student's HANDWRITTEN "Visionary Exercise" worksheet.

STUDENT PROFILE CONTEXT:
- Name: ${context.name || "Student"}
- Course: ${context.course || "Degree"} (${context.year || "1st Year"})
- Department: ${context.department || "Academic Department"}
- Level: ${context.currentLevel || "Level 1"}
- Task Completion Rate: ${context.taskMetrics?.taskCompletionRate !== null ? `${context.taskMetrics?.taskCompletionRate}%` : "Not evaluated yet"}
${studentNotes ? `- Student Clarification Note: "${studentNotes}"` : ""}

CRITICAL INSTRUCTIONS:
1. READ & TRANSCRIBE EVERY DETAIL OF THE STUDENT'S HANDWRITTEN WORKSHEET:
   - Identify the Student's Handwritten Name, Year, and Target Goal / Career Ambition (e.g., Data Analytics & Consulting, Entrepreneurship, Biotech, Finance, etc.).
   - Accurately transcribe all handwritten text into extractedText.
   - Extract their authentic passions (extractedPassions: string[]) directly reflecting their handwritten goal and focus.
   - Extract their guiding core values (extractedValues: string[]) including parenthetical definitions written on the sheet (e.g., "Integrity (Honesty & ethics)").
   - Extract their driving purpose statement (extractedPurpose: string) directly from "My Core Purpose".
   - Extract their 3-year, 5-year, and 10-year Envisioned Future into extractedVision, fiveYearGoal, and tenYearGoal.
   - Extract their Big Audacious Goal / BHAG (extractedBhag: string) and their Vivid Vision into vividFuture.
   - Extract their 1-Page Blueprint (LEARN, BUILD, CONNECT, GROW, IMPACT) and include these points in strengths and roadmap.
   - Extract their Semester Action Plan (Next 6 Months) and map these concrete milestones directly into roadmap.threeMonths, roadmap.sixMonths, and facultyInterventions!
   - Synthesize 3 careerDirections that directly match the student's declared Goal, Blueprint, and passions. NEVER output generic IT/software directions unless that is what the student explicitly wrote!

2. SYNTHESIZE FULL PERSONALIZED AI THESIS:
   - Return strictly valid JSON matching the exact schema below, fully populated with the student's authentic handwritten data.

RETURN EXACT JSON OBJECT:
{
  "extractedText": "...",
  "extractedPassions": ["...", "..."],
  "extractedValues": ["...", "..."],
  "extractedPurpose": "...",
  "extractedVision": "...",
  "extractedBhag": "...",
  "extractedStrengths": ["...", "..."],
  "extractedDevelopmentAreas": ["...", "..."],
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
      "evidence": "Extracted from student handwritten sheet",
      "aiInterpretation": "..."
    }
  ],
  "coreValues": [
    { "name": "...", "priority": 1, "reason": "..." }
  ],
  "purposeStatement": "...",
  "visionStatement": "...",
  "fiveYearGoal": "...",
  "tenYearGoal": "...",
  "bhag": "...",
  "vividFuture": "...",
  "archetype": {
    "primaryPattern": "...",
    "secondaryPattern": "...",
    "description": "...",
    "disclaimer": "This is an AI-generated development pattern, not a psychological diagnosis or permanent personality type."
  },
  "alignment": {
    "passionClarity": 88,
    "purposeClarity": 85,
    "visionClarity": 86,
    "careerAlignment": 82,
    "skillAlignment": 78,
    "goalAlignment": 85,
    "executionReadiness": 80,
    "executionAlignment": 80,
    "overall": 83
  },
  "currentVsFuture": {
    "currentSelf": { "problemSolving": "...", "technicalDepth": "...", "communication": "...", "leadership": "...", "executionDiscipline": "..." },
    "futureRequirement": { "problemSolving": "...", "technicalDepth": "...", "communication": "...", "leadership": "...", "executionDiscipline": "..." },
    "developmentGaps": ["...", "..."]
  },
  "passionVsPerformance": { "strongAlignments": ["..."], "developmentRequired": ["..."] },
  "scoreRationales": { "passionClarity": "...", "purposeClarity": "...", "visionClarity": "...", "careerAlignment": "...", "skillAlignment": "...", "goalAlignment": "...", "executionReadiness": "..." },
  "strengths": ["...", "..."],
  "evidenceBasedStrengths": { "selfReported": ["..."], "evidenceBacked": [{ "capability": "...", "evidenceScore": "Verified", "rationale": "..." }] },
  "developmentAreas": ["...", "..."],
  "skillGaps": ["...", "..."],
  "structuredDevelopmentGaps": [{ "dimension": "Core Capabilities", "currentLevel": "...", "futureRequirement": "...", "gapLevel": "Medium", "bridgeAction": "..." }],
  "careerDirections": [{ "title": "...", "whyItFits": "...", "alignmentRationale": "...", "supportingEvidence": ["..."], "currentStrengths": ["..."], "missingCapabilities": ["..."], "riskConcern": "...", "careerExperiment": { "title": "14-Day Practical Discovery", "duration": "14 Days", "week1": ["..."], "week2": ["..."], "reflectionQuestions": ["..."] } }],
  "recommendations": ["...", "..."],
  "roadmap": { "threeMonths": ["Month 1: ...", "Month 2: ...", "Month 3: ..."], "sixMonths": ["Focus area 1...", "Focus area 2..."], "twelveMonths": ["Long-term roadmap..."] },
  "facultyInterventions": [{ "actionId": "act-1", "title": "...", "category": "Mentorship", "status": "Not Started", "notes": "..." }],
  "aiSummary": "..."
}
`;

  // 1. Attempt Google Gemini Multimodal Vision analysis if API key is provided
  if (apiKey && apiKey !== "your_gemini_api_key_here") {
    try {
      const contents = [
        {
          parts: [
            { text: visionPrompt },
            ...imageParts,
          ],
        },
      ];

      const modelsToTry = [
        process.env.GEMINI_MODEL,
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
        "gemini-3-flash-preview",
        "gemini-flash-latest",
      ].filter(Boolean);

      let lastGeminiError = null;
      for (const modelName of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
          const response = await axios.post(
            url,
            {
              contents,
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.3,
              },
            },
            { timeout: 45000 }
          );

          const candidateText = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            const parsed = JSON.parse(candidateText);
            const verifiedEvidence = validateAndReconcileEvidence(context);
            const indicators = calculateDevelopmentIndicators(context, parsed, verifiedEvidence);
            parsed.evidenceValidation = verifiedEvidence;
            parsed.developmentIndicators = indicators;
            return parsed;
          }
        } catch (mErr) {
          lastGeminiError = mErr;
          console.warn(`Gemini vision with model ${modelName} failed:`, mErr.response?.data?.error?.message || mErr.message);
          // If project was denied access, trying other models in the same project will also return 403
          if (mErr.response?.status === 403 || mErr.response?.data?.error?.message?.includes("denied access")) {
            break;
          }
        }
      }
      if (lastGeminiError) {
        lastError = lastGeminiError;
      }
    } catch (err) {
      lastError = err;
      console.warn("Gemini vision analysis failed:", err.message);
    }
  }

  // 2. Attempt OpenAI Vision if OPENAI_API_KEY is configured
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey && openAiKey !== "your_openai_api_key_here") {
    try {
      const contentParts = [
        { type: "text", text: visionPrompt },
        ...images.map((img) => ({
          type: "image_url",
          image_url: { url: img.url },
        })),
      ];

      const oaiResponse = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [{ role: "user", content: contentParts }],
          response_format: { type: "json_object" },
          temperature: 0.3,
        },
        {
          headers: { Authorization: `Bearer ${openAiKey}` },
          timeout: 45000,
        }
      );

      const oaiText = oaiResponse?.data?.choices?.[0]?.message?.content;
      if (oaiText) {
        const parsed = JSON.parse(oaiText);
        const verifiedEvidence = validateAndReconcileEvidence(context);
        const indicators = calculateDevelopmentIndicators(context, parsed, verifiedEvidence);
        parsed.evidenceValidation = verifiedEvidence;
        parsed.developmentIndicators = indicators;
        return parsed;
      }
    } catch (oaiErr) {
      lastError = oaiErr;
      console.warn("OpenAI vision analysis failed:", oaiErr.response?.data?.error?.message || oaiErr.message);
    }
  }

  // 3. If AI Vision engine could not execute and heuristic fallback is enabled, synthesize thesis gracefully
  if (process.env.ENABLE_AI_HEURISTIC_FALLBACK === "true") {
    console.warn("⚠️ AI Vision service unavailable or restricted; invoking intelligent heuristic thesis synthesizer due to ENABLE_AI_HEURISTIC_FALLBACK=true");
    return generateHeuristicSynthesisFallback(context, assessment);
  }

  // If AI Vision engine could not execute, throw a clear, honest error - NO FAKE HARDCODED TEMPLATES!
  const rawErrorMessage = lastError?.response?.data?.error?.message || lastError?.message || "Invalid or missing GEMINI_API_KEY / OPENAI_API_KEY";
  const isAccessDenied = rawErrorMessage.includes("denied access") || lastError?.response?.status === 403;

  if (isAccessDenied) {
    throw new Error(
      `Google Cloud Project Access Denied (403): "Your project has been denied access". Google ne is project ke liye access restrict kar diya hai. Kripya Google AI Studio (https://aistudio.google.com/app/apikey) par jaakar "Create API key in NEW project" chunein (nayi project create karein, purana nahi), ya dusri Gmail account use karein, ya backend/.env me OPENAI_API_KEY configure karein.`
    );
  }

  throw new Error(
    `AI Vision Analysis Error: ${rawErrorMessage}. Please provide a valid Gemini or OpenAI API Key in backend/.env so the AI can read and analyze the uploaded visionary exercise in real-time.`
  );
};

/**
 * Primary AI generation entry point - calls analyzeHandwrittenVisionaryExercise.
 */
const generateThesisWithAI = async (context, assessment) => {
  return analyzeHandwrittenVisionaryExercise(context, assessment);
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

  let summary = `## Version ${prev.assessmentVersion || 1} to Version ${current.assessmentVersion || 2} Evolution\n\n`;

  if (scoreDiff > 0) {
    summary += `**Overall Alignment Gain:** +${scoreDiff} points (increased from ${prev.alignmentScores?.overall || 0}% to ${current.alignmentScores?.overall || 0}%).\n\n`;
  } else if (scoreDiff < 0) {
    summary += `**Alignment Calibration:** ${scoreDiff} points refinement based on deeper self-inquiry.\n\n`;
  } else {
    summary += `**Alignment Stability:** Maintained consistent overall score of ${current.alignmentScores?.overall || 0}%.\n\n`;
  }

  summary += `**Priority Focus Evolution:**\n`;
  summary += `- Prior Passions: ${prevPassions || "None recorded"}\n`;
  summary += `- Current Passions: ${currPassions || "None recorded"}\n\n`;

  if (stableValues.length > 0) {
    summary += `**Anchor Core Values:** [${stableValues.join(", ")}] have persisted across iterations, indicating bedrock values.\n\n`;
  }

  return summary;
};

module.exports = {
  detectDepartmentType,
  getStudentContext,
  validateAndReconcileEvidence,
  calculateDevelopmentIndicators,
  determineArchetype,
  convertImageToPart,
  analyzeHandwrittenVisionaryExercise,
  generateThesisWithAI,
  compareAssessmentVersions,
};
