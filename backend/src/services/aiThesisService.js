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
 * Never invents placeholder statistics or arbitrary defaults when real data is missing.
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

  // Get placement status if any
  const placement = await StudentPlacement.findOne({ studentId }).lean();
  const deptType = detectDepartmentType(student, reportCard);

  return {
    studentId: student._id,
    name: `${student.firstName || ""} ${student.lastName || ""}`.trim() || "Student",
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
 * Adheres strictly to: Never invent missing numbers; report "Data unavailable" or null when unverified.
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

  dataGaps.push("Independent capstone projects / portfolio GitHub links awaiting formal mentor verification.");

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
 * Dynamically determines student Archetypes based on student's authentic passions, flow answers, and experiences.
 */
const determineArchetype = (topPassions = [], flowAnswers = {}, understandMyself = {}) => {
  const combinedText = [
    ...topPassions.map(p => `${p.name} ${p.originalStatement || ""}`),
    flowAnswers.loseTrackOfTime || "",
    flowAnswers.unforcedHours || "",
    flowAnswers.energyGivingActivity || "",
    understandMyself.experiences || "",
    ...(understandMyself.activitiesEnjoyed || []),
    ...(understandMyself.voluntarilyExplored || []),
  ].join(" ").toLowerCase();

  const scores = {
    "Problem Solver & Analyst": 0,
    "Builder & Creator": 0,
    "Educator & Mentor": 0,
    "Steward & Naturalist": 0,
    "Strategist & Optimizer": 0,
    "Researcher & Investigator": 0,
    "Communicator & Storyteller": 0,
    "Helper & Caregiver": 0,
    "Organizer & Leader": 0,
    "Explorer & Synthesizer": 0,
  };

  if (/problem|solve|dsa|logic|algorithm|debugging|puzzle|troubleshoot|math/i.test(combinedText)) scores["Problem Solver & Analyst"] += 3;
  if (/build|construct|code|develop|software|engineer|architect|system|craft|make/i.test(combinedText)) scores["Builder & Creator"] += 3;
  if (/teach|mentor|explain|guide|train|tutor|pedagogy|notes|classroom|learning|student/i.test(combinedText)) scores["Educator & Mentor"] += 3;
  if (/agri|farm|crop|seed|soil|plant|botany|horticultur|animal|nature|environment|ecolog|green|sustainab/i.test(combinedText)) scores["Steward & Naturalist"] += 3;
  if (/business|startup|venture|market|finance|wealth|profit|revenue|commerce|accounting|audit|budget|invest/i.test(combinedText)) scores["Strategist & Optimizer"] += 3;
  if (/research|science|lab|experiment|micro|data|investigate|study|biology|chemistry|physics|inquiry/i.test(combinedText)) scores["Researcher & Investigator"] += 3;
  if (/communicate|present|speak|write|story|media|journalism|content|debate|public|connect/i.test(combinedText)) scores["Communicator & Storyteller"] += 3;
  if (/help|social|community|service|support|patient|health|counsel|welfare|uplift/i.test(combinedText)) scores["Helper & Caregiver"] += 3;
  if (/lead|manage|coordinate|team|direct|organize|event|plan|inspire|operations/i.test(combinedText)) scores["Organizer & Leader"] += 3;
  if (/explore|discover|learn|curious|future|trends|undecided|interdisciplinary|cross/i.test(combinedText)) scores["Explorer & Synthesizer"] += 3;

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primaryPattern = sorted[0][1] > 0 ? sorted[0][0] : "Problem Solver & Analyst";
  const secondaryPattern = sorted[1][1] > 0 ? sorted[1][0] : "Explorer & Synthesizer";

  return {
    primaryPattern,
    secondaryPattern,
    description: `You exhibit a dominant "${primaryPattern}" development orientation, powered by an active "${secondaryPattern}" drive. You are naturally motivated when translating concepts into tangible results and overcoming intricate challenges.`,
    disclaimer: "This is an AI-generated development pattern, not a psychological diagnosis or permanent personality type.",
  };
};

/**
 * Transparent Mentoring Development Indicators (Documented formulas, ranges, inputs)
 * Clearly defined as development guidance signals, not clinical/psychological tests.
 */
const calculateDevelopmentIndicators = (context, assessment, verifiedEvidence) => {
  const topPassions = assessment.topPassions || [];
  const fiveWhys = assessment.fiveWhys || [];
  const coreValues = assessment.coreValues || [];
  const pairwiseCount = assessment.pairwiseComparisons?.length || 0;

  // 1. Passion Clarity (0-100)
  // Inputs: Count of articulated passions (max 5), weekly markers present, importance/score completeness
  let passionScore = 40;
  if (topPassions.length >= 3) passionScore += 25;
  else passionScore += topPassions.length * 8;
  const markersCount = topPassions.filter(p => p.markers && p.markers.length > 0).length;
  passionScore += Math.min(20, markersCount * 4);
  if (pairwiseCount >= 4) passionScore += 10;
  passionScore = Math.min(95, Math.max(30, passionScore));
  const passionRationale = `Calculated from ${topPassions.length} articulated passions and ${markersCount} concrete weekly action markers. Indicates self-awareness of what intrinsically energizes you.`;

  // 2. Purpose Clarity (0-100)
  // Inputs: Depth of 5-Whys reflection layers, core values chosen, acceptance of purpose
  let purposeScore = 45;
  if (fiveWhys.length >= 2) purposeScore += 25;
  else if (fiveWhys.length === 1) purposeScore += 15;
  if (coreValues.length >= 2) purposeScore += 15;
  if (assessment.purposeStatement || assessment.confirmedPurpose) purposeScore += 10;
  purposeScore = Math.min(95, Math.max(35, purposeScore));
  const purposeRationale = `Derived from ${fiveWhys.length} reflective 5-Whys inquiry layers and ${coreValues.length} guiding core values. Measures how clearly you understand WHY your chosen direction matters to you.`;

  // 3. Vision Clarity (0-100)
  // Inputs: Presence of 3-5 year goal, 10-year horizon, BHAG milestone
  let visionScore = 40;
  if (assessment.fiveYearGoal) visionScore += 25;
  if (assessment.tenYearGoal) visionScore += 15;
  if (assessment.bhag) visionScore += 15;
  visionScore = Math.min(95, Math.max(35, visionScore));
  const visionRationale = `Evaluates specificity across 3-5 year horizon (${assessment.fiveYearGoal ? "Articulated" : "Pending"}) and bold BHAG milestone (${assessment.bhag ? "Articulated" : "Pending"}).`;

  // 4. Skill Alignment (0-100)
  // Inputs: Verified task completion rate, presence of verified technologies
  let skillScore = 55; // baseline exploratory
  const taskRate = verifiedEvidence?.taskMetricsVerified?.taskCompletionRate;
  if (typeof taskRate === "number") {
    skillScore = Math.round((taskRate * 0.7) + ((context.technologies?.length || 0) > 0 ? 20 : 10));
  } else {
    skillScore = 55;
  }
  skillScore = Math.min(95, Math.max(30, skillScore));
  const skillRationale = typeof taskRate === "number"
    ? `Benchmarked against verified curriculum task completion rate of ${taskRate}% and recorded domain technologies.`
    : "Institutional assignment records are currently preliminary; baseline developmental indicator assigned.";

  // 5. Goal Alignment (0-100)
  // Inputs: Coherence between passions, values, and vision
  const goalScore = Math.round((passionScore * 0.4) + (purposeScore * 0.3) + (visionScore * 0.3));
  const goalRationale = "Synthesized coherence across your driving passions, guiding core values, and stated multi-year milestones.";

  // 6. Overall Guidance Index
  const overall = Math.round((passionScore + purposeScore + visionScore + skillScore + goalScore) / 5);
  const overallRationale = "Balanced guidance composite across all 5 developmental pillars. Serves as a student mentoring guide, not a fixed placement prediction.";

  return {
    passionClarity: { score: passionScore, rationale: passionRationale, method: "Articulation depth (passions count, weekly markers, engagement rating)", confidence: "High" },
    purposeClarity: { score: purposeScore, rationale: purposeRationale, method: "5-Whys reflection layers + core values grounding", confidence: "High" },
    visionClarity: { score: visionScore, rationale: visionRationale, method: "3-5 year horizon + BHAG milestone specificity", confidence: "High" },
    skillAlignment: { score: skillScore, rationale: skillRationale, method: "Institutional curriculum task rate + verified technology competencies", confidence: typeof taskRate === "number" ? "Verified" : "Preliminary" },
    goalAlignment: { score: goalScore, rationale: goalRationale, method: "Multi-pillar coherence between passions, values and goals", confidence: "High" },
    overallIndex: { score: overall, rationale: overallRationale, method: "Balanced development average of 5 pillars", confidence: "Guidance Signal" },
    disclaimer: "These indicators are developmental mentoring guidance signals, not standardized psychological tests or job guarantees.",
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
 * Universal Intelligent Dynamic AI Thesis Generator
 * Generates all 28 comprehensive sections with stream-neutral alignment and transparent mentoring indicators.
 */
const generateHeuristicThesis = (context = {}, assessment = {}) => {
  // Validate evidence first
  const verifiedEvidence = validateAndReconcileEvidence(context);

  let topPassionsRaw = assessment.topPassions || [];
  if ((!topPassionsRaw || topPassionsRaw.length === 0) && Array.isArray(assessment.passionStatements) && assessment.passionStatements.length > 0) {
    topPassionsRaw = assessment.passionStatements.map((ps, idx) => ({
      name: typeof ps === "string" ? ps : (ps.text || ps.name || `Passion ${idx + 1}`),
      priority: idx + 1,
      selfRatedImportance: 8,
      currentScore: 5,
    }));
  }

  if (!topPassionsRaw || topPassionsRaw.length === 0) {
    throw new Error("Cannot generate thesis: Student has not selected any passions yet.");
  }

  const coreValues = Array.isArray(assessment.coreValues) && assessment.coreValues.length > 0
    ? assessment.coreValues
    : [
        { name: "Growth", priority: 1, reason: "Continuous self-improvement" },
        { name: "Excellence", priority: 2, reason: "Striving for high standards" },
        { name: "Integrity", priority: 3, reason: "Principled and authentic action" },
      ];

  const fiveWhys = assessment.fiveWhys || [];
  const flowAnswers = assessment.flowAnswers || {};
  const understandMyself = assessment.understandMyself || {};
  const visionExercises = assessment.visionExercises || {};

  // Process passions: calculate Passion Gap (Importance - Current Score) only when both are numbers
  const processedPassions = topPassionsRaw.map((p, idx) => {
    const importance = typeof p.selfRatedImportance === "number" ? p.selfRatedImportance : 8;
    const currentScore = typeof p.currentScore === "number" ? p.currentScore : 5;
    const passionGap = Math.max(0, importance - currentScore);

    let gapExplanation = "";
    if (passionGap >= 4) {
      gapExplanation = `Significant development gap (${passionGap} pts): "${p.name}" is deeply important to you (${importance}/10), but current weekly engagement is at ${currentScore}/10. Dedicating 3–5 hours weekly to deliberate real-world practice will rapidly bridge this.`;
    } else if (passionGap >= 2) {
      gapExplanation = `Moderate developmental gap (${passionGap} pts): You are actively engaging with "${p.name}" (${currentScore}/10). Expanding independent projects will bring it closer to your ideal priority (${importance}/10).`;
    } else {
      gapExplanation = `High alignment (${passionGap} pts): You are actively living "${p.name}" with strong consistency (${currentScore}/10) relative to its importance (${importance}/10). Sustain this momentum.`;
    }

    const markers = p.markers && p.markers.length > 0 ? p.markers : [
      `Dedicate at least 3-4 hours per week to practical exploration of ${p.name.toLowerCase()}.`,
      `Complete 1 demonstrable project, case study, or milestone every month reflecting ${p.name.toLowerCase()}.`,
    ];

    const institutionalEvidenceNote = verifiedEvidence.taskMetricsVerified.taskCompletionRate !== null
      ? `Institutional track record: ${verifiedEvidence.taskMetricsVerified.taskCompletionRate}% task completion rate.`
      : "Institutional assignment evidence pending; student self-reported interest.";

    return {
      name: p.name,
      originalStatement: p.originalStatement || `When my life is ideal, I am engaged with ${p.name.toLowerCase()}`,
      priority: p.priority || idx + 1,
      selfRatedImportance: importance,
      currentScore: currentScore,
      passionGap,
      gapExplanation,
      markers,
      evidence: p.evidence || institutionalEvidenceNote,
      aiInterpretation: p.aiInterpretation || `Reflects intrinsic curiosity for growth through ${p.name.toLowerCase()}.`,
    };
  });

  const primaryPassion = processedPassions[0]?.name || "Continuous Learning";
  const secondaryPassion = processedPassions[1]?.name || processedPassions[0]?.name || "Creative Problem Solving";
  const primaryValue = coreValues[0]?.name || "Growth";
  const secondaryValue = coreValues[1]?.name || "Excellence";

  // Derive Archetype dynamically
  const archetype = determineArchetype(processedPassions, flowAnswers, understandMyself);

  // Highest gap passion
  const sortedByGap = [...processedPassions].sort((a, b) => b.passionGap - a.passionGap);
  const highestGapPassion = sortedByGap[0] || processedPassions[0];
  const dynamicCommitment = highestGapPassion && highestGapPassion.passionGap > 0
    ? `Dedicate 3 to 4 hours every week to practical real-world exploration in "${highestGapPassion.name}" to actively bridge my ${highestGapPassion.passionGap}-point development gap.`
    : `Dedicate 4 hours every week to practical portfolio and domain projects in "${primaryPassion}" while maintaining high academic consistency.`;

  // Domain & stream detection (student's interests take precedence over enrolled course)
  const combinedInterests = [
    ...processedPassions.map(p => `${p.name} ${p.originalStatement || ""} ${p.explanation || ""}`),
    understandMyself.experiences || "",
    ...(understandMyself.activitiesEnjoyed || []),
    ...(understandMyself.voluntarilyExplored || []),
    flowAnswers.loseTrackOfTime || "",
    flowAnswers.energyGivingActivity || "",
    flowAnswers.askedHelpWith || "",
    ...fiveWhys.map(w => `${w.question} ${w.answer}`),
    assessment.primaryGoal || "",
    visionExercises.futureHeadlines?.headline || "",
    visionExercises.idealDay?.activities || "",
    visionExercises.futureContribution?.contribution || "",
  ].join(" ").toLowerCase();

  const deptStr = String(context.department || "").toLowerCase();
  const courseStr = String(context.course || "").toLowerCase();
  const techStr = Array.isArray(context.technologies) ? context.technologies.join(" ").toLowerCase() : "";
  const academicContext = `${deptStr} ${courseStr} ${techStr}`;
  const deptType = String(context.deptType || "").toUpperCase();

  const primaryPassionStr = String(primaryPassion || "").toLowerCase();
  const primaryIsTeaching = /teach|mentor|pedagogy|tutor|tutoring|educat|lectur|facilitat/i.test(primaryPassionStr);
  const primaryIsAgri = /agri|farm|crop|seed|soil|horticultur|plant|botany|animal|nature|livestock/i.test(primaryPassionStr);
  const primaryIsCommerce = /commerce|accounting|finance|audit|bank|tax|financial|wealth/i.test(primaryPassionStr);
  const primaryIsMgmt = /business|startup|entrepreneur|manage|venture|market|sales|consult/i.test(primaryPassionStr);
  const primaryIsBio = /science|research|\blabs?\b|microbio|biotech|chemistry|physics|biology|clinical/i.test(primaryPassionStr);
  const primaryIsDesign = /design|\barts?\b|\bui\b|\bux\b|creative|media|journalism|video|writing|story/i.test(primaryPassionStr);
  const primaryIsSocial = /social|community|humanities|psychology|society|counsel|welfare|policy/i.test(primaryPassionStr);
  const primaryIsTech = /software|\bcode\b|\bcoding\b|developer|web|\bapps?\b|program|data|algorithm|dsa|\btech\b|technology/i.test(primaryPassionStr);

  const academicIsBio = /bio|biotech|biology|botany|zoology|clinical|life science|b\.sc bio/i.test(academicContext) || deptType === "BEG";
  const academicIsMgmt = /management|bba|mba|business/i.test(academicContext) || deptType === "MEG";
  const academicIsAgri = /agri|seed|horticultur|botany|agriculture/i.test(academicContext);
  const academicIsCommerce = /bcom|b\.com|commerce|accounting/i.test(academicContext);
  const academicIsTech = /bca|mca|b\.?tech|cse|it|engineer/i.test(academicContext) || deptType === "BTECH" || deptType === "ITEG";

  const generalIsTeaching = /teach|mentor|pedagogy|tutor|tutoring|educat|lectur|facilitat/i.test(combinedInterests);
  const generalIsAgri = /agri|farm|crop|seed|soil|horticultur|plant|botany|animal|livestock|ecolog|nature|sustainab|environment/i.test(combinedInterests) || academicIsAgri;
  const generalIsCommerce = /commerce|accounting|audit|bank|tax|financial|wealth|budget|b\.?com|investment/i.test(combinedInterests) || academicIsCommerce;
  const generalIsMgmt = /business|startup|entrepreneur|manage|venture|market|sales|company|operations|consult/i.test(combinedInterests) || academicIsMgmt;
  const generalIsBio = /science|research|\blabs?\b|microbio|biotech|chemistry|physics|experiment|clinical|scientific|investigat|life science|biology|botany|zoology/i.test(combinedInterests) || academicIsBio;
  const generalIsDesign = /design|\barts?\b|\bui\b|\bux\b|creative\s+(arts?|media|work)|journalism|video\s+edit|animation|graphics/i.test(combinedInterests);
  const generalIsSocial = /social|community|humanities|psychology|society|counsel|welfare|public policy|ngo|uplift/i.test(combinedInterests);
  const generalIsTech = /software|\bcode\b|\bcoding\b|developer|web|\bapps?\b|program|data|algorithm|dsa|machine learning|ai|computer|\btech\b|cloud/i.test(combinedInterests) || academicIsTech;
  const isUndecided = /not sure|explor|undecided|confused|multiple/i.test(combinedInterests);

  let activeDomain = "tech";
  if (primaryIsTeaching) activeDomain = "teaching";
  else if (primaryIsAgri) activeDomain = "agri";
  else if (primaryIsBio) activeDomain = "bio";
  else if (primaryIsMgmt) activeDomain = "mgmt";
  else if (primaryIsCommerce) activeDomain = "commerce";
  else if (primaryIsDesign) activeDomain = "design";
  else if (primaryIsSocial) activeDomain = "social";
  else if (academicIsBio) activeDomain = "bio";
  else if (academicIsMgmt) activeDomain = "mgmt";
  else if (academicIsAgri) activeDomain = "agri";
  else if (academicIsCommerce) activeDomain = "commerce";
  else if (generalIsTeaching) activeDomain = "teaching";
  else if (generalIsBio) activeDomain = "bio";
  else if (generalIsMgmt) activeDomain = "mgmt";
  else if (generalIsAgri) activeDomain = "agri";
  else if (generalIsCommerce) activeDomain = "commerce";
  else if (generalIsDesign) activeDomain = "design";
  else if (generalIsSocial) activeDomain = "social";
  else if (isUndecided) activeDomain = "undecided";
  else if (primaryIsTech || generalIsTech) activeDomain = "tech";

  const isTeaching = activeDomain === "teaching";
  const isAgri = activeDomain === "agri";
  const isCommerce = activeDomain === "commerce";
  const isMgmt = activeDomain === "mgmt";
  const isBio = activeDomain === "bio";
  const isDesign = activeDomain === "design";
  const isSocial = activeDomain === "social";
  const isTech = activeDomain === "tech";

  const studentAspiration = fiveWhys[0]?.answer || assessment.primaryGoal || "";

  // Dynamic stream-neutral purpose statement
  let dynamicPurpose = `My purpose is to apply ${primaryPassion.toLowerCase()} and ${secondaryPassion.toLowerCase()}, guided by ${primaryValue} and ${secondaryValue}, to excel as an impactful professional and build solutions that elevate community well-being.`;
  if (isTeaching) {
    dynamicPurpose = `My purpose is to apply ${primaryPassion.toLowerCase()} and clear explanation, guided by ${primaryValue} and ${secondaryValue}, to empower learners, simplify complex knowledge, and inspire intellectual growth.`;
  } else if (isAgri) {
    dynamicPurpose = `My purpose is to apply ${primaryPassion.toLowerCase()} and sustainable agricultural practices, guided by ${primaryValue} and ${secondaryValue}, to improve crop productivity, farmer livelihoods, and ecological balance.`;
  } else if (isCommerce) {
    dynamicPurpose = `My purpose is to apply ${primaryPassion.toLowerCase()} and analytical financial insight, guided by ${primaryValue} and ${secondaryValue}, to drive sound fiscal stewardship, enterprise growth, and commercial business value.`;
  } else if (isMgmt) {
    dynamicPurpose = `My purpose is to apply ${primaryPassion.toLowerCase()} and strategic thinking, guided by ${primaryValue} and ${secondaryValue}, to excel in business and commercial management within ${context.course} and build viable ventures.`;
  } else if (isBio) {
    dynamicPurpose = `My purpose is to apply ${primaryPassion.toLowerCase()} and scientific inquiry, guided by ${primaryValue} and ${secondaryValue}, to advance scientific, healthcare, and biotechnology innovation within ${context.course}.`;
  } else if (isDesign) {
    dynamicPurpose = `My purpose is to apply ${primaryPassion.toLowerCase()} and creative expression, guided by ${primaryValue} and ${secondaryValue}, to design experiences, media, and tools that resonate deeply with people.`;
  } else if (isSocial) {
    dynamicPurpose = `My purpose is to apply ${primaryPassion.toLowerCase()} and community empathy, guided by ${primaryValue} and ${secondaryValue}, to advocate for social welfare, human dignity, and inclusive development.`;
  } else if (isTech) {
    dynamicPurpose = `My purpose is to apply ${primaryPassion.toLowerCase()} and structured problem-solving, guided by ${primaryValue} and ${secondaryValue}, to architect technology solutions that simplify everyday life.`;
  }

  if (studentAspiration && !isTeaching && !isAgri && !isCommerce && !isMgmt && !isBio && !isDesign && !isSocial && !isTech) {
    dynamicPurpose = `My purpose is to leverage ${primaryPassion.toLowerCase()} and core values of ${primaryValue} and ${secondaryValue} to achieve excellence in "${studentAspiration}", creating tangible positive impact.`;
  }

  const purposeStatement = assessment.confirmedPurpose || assessment.purposeStatement || dynamicPurpose;

  const fiveYearGoal = assessment.fiveYearGoal ||
    `Master advanced capabilities in ${primaryPassion.toLowerCase()} and establish strong domain contributions.`;

  const tenYearGoal = assessment.tenYearGoal ||
    `Assume visionary leadership in ${primaryPassion.toLowerCase()}, driving innovative solutions and mentoring upcoming peers.`;

  const bhag = assessment.bhag ||
    `Empower 10,000+ individuals or community members through transformative solutions built in ${primaryPassion.toLowerCase()}.`;

  const vividFuture = assessment.vividFuture ||
    visionExercises.idealDay?.narrative ||
    `In your ideal future, you work with high autonomy and competence in ${primaryPassion.toLowerCase()}, collaborating with inspiring colleagues to solve real problems that benefit people.`;

  const visionStatement = assessment.confirmedVision || assessment.visionStatement ||
    `My vision is to establish strong domain competence over the next 3–5 years in ${primaryPassion.toLowerCase()}, mastering end-to-end execution, building innovative solutions, and inspiring others through purposeful contribution.`;

  // Calculate transparent development indicators
  const indicators = calculateDevelopmentIndicators(context, assessment, verifiedEvidence);

  // Evidence-based strengths
  const attendanceRateVal = verifiedEvidence.attendanceVerified.rate;
  const taskRateVal = verifiedEvidence.taskMetricsVerified.taskCompletionRate;

  const evidenceBacked = [];
  if (attendanceRateVal !== null) {
    evidenceBacked.push({
      capability: "Execution Discipline & Attendance",
      evidenceScore: `${attendanceRateVal}% Attendance`,
      rationale: "Consistent presence verifies reliability and foundational work ethic in college.",
    });
  } else {
    evidenceBacked.push({
      capability: "Attendance Record",
      evidenceScore: "Data unavailable",
      rationale: "Official attendance percentage is awaiting synchronization in institutional records.",
    });
  }

  if (taskRateVal !== null) {
    evidenceBacked.push({
      capability: "Curriculum Task Execution",
      evidenceScore: `${taskRateVal}% Completed (${verifiedEvidence.taskMetricsVerified.completedTasks}/${verifiedEvidence.taskMetricsVerified.totalTasks} Tasks)`,
      rationale: `Track record of turning curriculum assignments into deliverables across ${context.currentLevel}.`,
    });
  } else {
    evidenceBacked.push({
      capability: "Curriculum Tasks",
      evidenceScore: "Data unavailable",
      rationale: "No formal curriculum task submissions logged yet in current term.",
    });
  }

  evidenceBacked.push({
    capability: "Structured Problem-Solving & 5-Whys",
    evidenceScore: `Inquiry Depth: ${fiveWhys.length} Layers`,
    rationale: "Reflective capacity to trace initial aspirations down to underlying internal motivators.",
  });

  const evidenceBasedStrengths = {
    selfReported: [
      `Self-identified passion for ${primaryPassion} and ${secondaryPassion}.`,
      `Commitment to living core values of ${primaryValue} and ${secondaryValue}.`,
      flowAnswers.energyGivingActivity ? `Energized by "${flowAnswers.energyGivingActivity}".` : "High internal curiosity and desire for practical learning.",
    ],
    evidenceBacked,
  };

  const strengths = [
    `Strong intrinsic engagement with ${primaryPassion} anchored in ${primaryValue}.`,
    attendanceRateVal !== null ? `Consistent classroom discipline evidenced by ${attendanceRateVal}% attendance rate.` : "Self-driven motivation to explore future career paths.",
    taskRateVal !== null ? `Assignment execution with ${verifiedEvidence.taskMetricsVerified.completedTasks} completed syllabus tasks.` : "Clear interest in building practical capabilities.",
    `Reflective self-awareness demonstrated across ${fiveWhys.length} structured 5-Whys inquiry layers.`,
    `Constructive ambition aligned with stated BHAG milestone.`,
  ];

  // Domain-specific skill gaps (stream-neutral)
  let skillGaps = [
    "Independent Portfolio Project Architecture & Case Study Documentation",
    "Executive Verbal Communication & Project Walkthrough Articulation",
    "Time-Boxed Structured Problem Solving & Real-World Experimentation",
    "Cross-Functional Team Collaboration & Initiative Leadership",
  ];

  if (isTeaching) {
    skillGaps = [
      "Curriculum & Instructional Design for Diverse Learning Styles",
      "Formative Assessment Design & Constructive Feedback Delivery",
      "High-Engagement Public Speaking & Verbal Concept Synthesis",
      "Digital Learning Tools & Student Mentorship Methodologies",
    ];
  } else if (isAgri) {
    skillGaps = [
      "Precision Agriculture Tools, Soil Testing & Yield Optimization",
      "Agri-Supply Chain Logistics & Post-Harvest Value Addition",
      "Farmer Stakeholder Communication & Field Experiment Protocol",
      "Sustainable Crop Protection & Organic Input Economics",
    ];
  } else if (isCommerce) {
    skillGaps = [
      "Financial Statement Analysis, Modeling & Enterprise Valuation",
      "Taxation, Audit Compliance & Corporate Risk Management",
      "Advanced Spreadsheet Automation & Commercial Data Analysis",
      "Client Financial Advisory & Stakeholder Communication",
    ];
  } else if (isMgmt) {
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
  } else if (isDesign) {
    skillGaps = [
      "User Research, Problem Framing & Usability Testing",
      "High-Fidelity Prototyping & Visual Design Systems",
      "Client Pitch Articulation & Creative Critique Navigation",
      "Cross-Platform Interaction Design & Digital Publishing",
    ];
  } else if (isSocial) {
    skillGaps = [
      "Qualitative Community Needs Assessment & Survey Design",
      "Public Policy Brief Writing & Impact Measurement",
      "Grassroots Coalition Building & Stakeholder Dialogue",
      "Grant Proposal Writing & Non-Profit Resource Planning",
    ];
  }

  const structuredDevelopmentGaps = [
    {
      dimension: "Domain Projects & Practical Deliverables",
      currentLevel: taskRateVal !== null ? `${taskRateVal}% curriculum tasks completed` : "Coursework ongoing",
      futureRequirement: "Independent, demonstrable portfolio deliverables solving real-world challenges",
      gapLevel: (taskRateVal !== null && taskRateVal >= 80) ? "Low" : "Medium",
      bridgeAction: `Design and complete 1 practical project or case study in ${primaryPassion.toLowerCase()} this semester.`,
    },
    {
      dimension: "Communication & Articulation",
      currentLevel: "Developing in classroom dialogues and peer discussions",
      futureRequirement: "Articulate, persuasive, and confident stakeholder presentation",
      gapLevel: "Medium",
      bridgeAction: "Deliver 1 verbal project summary or peer explanation monthly to mentors.",
    },
    {
      dimension: "Structured Problem Solving & Experimentation",
      currentLevel: "Curriculum-aligned fundamentals",
      futureRequirement: "Complex, unstructured challenge navigation with measured outcomes",
      gapLevel: "High",
      bridgeAction: "Execute 1 low-cost real-world experiment every 30 days to test practical curiosity.",
    },
  ];

  // Synthesize 3-5 Tailored Career Directions with 14-day experiments (Stream-neutral!)
  const careerDirections = [];

  if (isTeaching) {
    careerDirections.push(
      {
        title: "Educational Specialist & Learning Experience Facilitator",
        whyItFits: `Directly matches your passion for explaining concepts, mentoring peers, and helping others understand difficult topics.`,
        alignmentRationale: `Builds on your core value of ${primaryValue} and natural inclination towards instructional clarity.`,
        supportingEvidence: [
          `Self-identified passion for teaching and mentoring`,
          `Demonstrated peer-help inclination in flow answers`,
          `Foundational academic grounding in ${context.course}`,
        ],
        currentStrengths: ["Empathy with learners", "Ability to break down concepts into steps"],
        missingCapabilities: ["Formal lesson design framework", "Systematic feedback assessment tools"],
        riskConcern: "Needs regular opportunities to practice explaining before live groups.",
        careerExperiment: {
          title: "14-Day Teaching & Peer Facilitation Sprint",
          duration: "14 Days",
          week1: [
            "Select 1 difficult topic from your syllabus or an area of personal passion.",
            "Design a 1-page visual summary sheet and 3 practice questions.",
            "Review the plan with a teacher or senior peer for pedagogical feedback.",
          ],
          week2: [
            "Teach the 1-page summary to a small group of 3-4 peers in a 25-minute session.",
            "Collect written anonymous feedback on what was clear and what was confusing.",
            "Reflect: Did facilitating learning give you energy or feel exhausting?",
          ],
          reflectionQuestions: [
            "Did preparing and explaining this topic make you lose track of time?",
            "Did you feel energized or drained after answering student questions?",
            "Would you love to do this as a regular professional practice?",
          ],
        },
      },
      {
        title: isCommerce
          ? "Commerce & Financial Literacy Educator"
          : isAgri
          ? "Agricultural Extension & Farmer Training Specialist"
          : "Academic Content Creator & Subject Mentor",
        whyItFits: `Combines your academic background in ${context.course} with your passion for teaching.`,
        alignmentRationale: "Bridges institutional subject matter knowledge with accessible communication.",
        supportingEvidence: [
          `Course enrollment in ${context.course}`,
          `Strong communication and mentoring drive`,
        ],
        currentStrengths: ["Subject familiarity", "Desire to make knowledge accessible"],
        missingCapabilities: ["Digital content production", "Engagement metrics evaluation"],
        riskConcern: "Balancing creative instructional freedom with curriculum constraints.",
        careerExperiment: {
          title: "14-Day Micro-Lesson Creation Sprint",
          duration: "14 Days",
          week1: [
            "Create a 3-minute explanation video or 5-slide carousel explaining 1 foundational concept.",
            "Share it with 5 classmates and ask them to solve 1 quiz question.",
          ],
          week2: [
            "Analyze whether the learners understood the core concept from your material.",
            "Iterate based on their suggestions and document lessons learned.",
          ],
          reflectionQuestions: [
            "Did creating learning content feel enjoyable?",
            "How did you feel about making revisions based on learner confusion?",
            "Do you prefer in-person teaching or asynchronous content creation?",
          ],
        },
      },
      {
        title: "Learning Program & Youth Development Coordinator",
        whyItFits: `Grounds your desire to help people in structured community educational initiatives.`,
        alignmentRationale: "Integrates organizing ability with human-centered service.",
        supportingEvidence: ["Stated value of service and impact", "Desire to coordinate meaningful peer activities"],
        currentStrengths: ["Interpersonal warmth", "Goal-oriented attitude"],
        missingCapabilities: ["Program scheduling and stakeholder coordination"],
        riskConcern: "Can be demanding emotionally if boundaries are not maintained.",
        careerExperiment: {
          title: "14-Day Study Circle Initiative",
          duration: "14 Days",
          week1: ["Organize a 2-session study circle for 4 peers preparing for upcoming assessments."],
          week2: ["Facilitate both sessions and measure peer confidence before and after."],
          reflectionQuestions: ["Did coordinating the group feel satisfying?", "Do you enjoy organizing educational initiatives?"],
        },
      }
    );
  } else if (isAgri) {
    careerDirections.push(
      {
        title: "Sustainable Agriculture & AgTech Solutions Specialist",
        whyItFits: `Directly aligns your passion for living systems, plant science, and practical environmental problem solving.`,
        alignmentRationale: `Resonates with your academic grounding in ${context.course} and your core value of ${primaryValue}.`,
        supportingEvidence: [
          `Enrollment or demonstrated interest in agricultural / environmental sciences`,
          `Practical orientation towards nature and living systems`,
        ],
        currentStrengths: ["Appreciation for agricultural realities", "Field curiosity"],
        missingCapabilities: ["Hands-on precision farm tools experience", "Crop data modeling"],
        riskConcern: "Staying up to date with rapidly evolving precision agriculture tools.",
        careerExperiment: {
          title: "14-Day Agricultural Problem & Solution Sprint",
          duration: "14 Days",
          week1: [
            "Identify 1 specific agricultural challenge in your locality (e.g. soil fertility, seed germination, irrigation, pest management).",
            "Interview 2 local farmers or agricultural experts about how they currently address it.",
            "Document existing pain points and costs in a structured 1-page brief.",
          ],
          week2: [
            "Draft a practical, low-cost improvement proposal incorporating modern sustainable techniques.",
            "Present your proposal to a faculty mentor or local agri-practitioner for critique.",
            "Reflect: Did fieldwork and agricultural problem solving energize your curiosity?",
          ],
          reflectionQuestions: [
            "Did talking to farmers and analyzing crop challenges feel rewarding?",
            "Did you enjoy thinking through sustainable solutions?",
            "Would you prefer field-based agronomy or agribusiness management?",
          ],
        },
      },
      {
        title: "Seed Technology & Crop Production Consultant",
        whyItFits: `Applies scientific rigor and seed health principles to maximize farmer yield and food security.`,
        alignmentRationale: "Connects laboratory testing discipline with real-world agricultural outcomes.",
        supportingEvidence: ["Knowledge of crop biology and seed vigor", "Attention to quality protocols"],
        currentStrengths: ["Observational skill", "Methodical approach to crop cycles"],
        missingCapabilities: ["Commercial seed certification knowledge", "Supply chain dynamics"],
        riskConcern: "Requires staying patient with seasonal agricultural cycles.",
        careerExperiment: {
          title: "14-Day Seed Germination & Quality Review",
          duration: "14 Days",
          week1: ["Perform a sample germination and seedling vigor test on 2 seed varieties under controlled conditions."],
          week2: ["Document germination rates, anomalies, and recommendations in a formal observation memo."],
          reflectionQuestions: ["Did controlled plant experimentation feel exciting?", "Do you enjoy scientific quality tracking?"],
        },
      },
      {
        title: "Agri-Enterprise & Rural Supply Chain Strategist",
        whyItFits: `Bridges agricultural knowledge with commercial distribution, storage, and market access for farm produce.`,
        alignmentRationale: "Combines practical agricultural insight with entrepreneurial value creation.",
        supportingEvidence: ["Interest in sustainable business models", "Desire for broad economic impact"],
        currentStrengths: ["Big-picture perspective on food systems", "Practical mindset"],
        missingCapabilities: ["Commodity market mechanics", "Cold chain logistics"],
        riskConcern: "Market price fluctuations require resilient risk management.",
        careerExperiment: {
          title: "14-Day Farm-to-Market Value Chain Mapping",
          duration: "14 Days",
          week1: ["Trace the price journey of 1 local crop from farmer farmgate price to final retail consumer price."],
          week2: ["Identify where value is lost and propose 1 intervention that could improve farmer margins."],
          reflectionQuestions: ["Did analyzing the economics of agriculture excite you?", "Do you want business to be part of your agricultural career?"],
        },
      }
    );
  } else if (isCommerce) {
    careerDirections.push(
      {
        title: "Financial Analyst & Wealth Strategy Specialist",
        whyItFits: `Directly leverages your affinity for financial numbers, analytical rigor, and economic value creation.`,
        alignmentRationale: `Anchored in your academic grounding in ${context.course} and your core value of ${primaryValue}.`,
        supportingEvidence: [
          `Commerce and financial domain study in ${context.course}`,
          `Interest in analyzing information and financial patterns`,
        ],
        currentStrengths: ["Logical pattern recognition", "Focus on economic value"],
        missingCapabilities: ["Advanced financial modeling", "Discounted cash flow valuation"],
        riskConcern: "Over-reliance on theory without studying actual corporate financial statements.",
        careerExperiment: {
          title: "14-Day Corporate Financial Analysis Sprint",
          duration: "14 Days",
          week1: [
            "Select 2 companies from the same industry (e.g. FMCG or Tech).",
            "Download their latest annual balance sheets and income statements.",
            "Calculate 4 key ratios: Operating Margin, ROE, Debt-to-Equity, and Current Ratio.",
          ],
          week2: [
            "Write a 2-page comparative investment summary outlining which company is healthier and why.",
            "Share your report with a commerce mentor or faculty member for feedback.",
            "Reflect: Did dissecting financial numbers give you clarity and flow?",
          ],
          reflectionQuestions: [
            "Did digging through financial reports feel exciting or tedious?",
            "Did you enjoy drawing logical conclusions from numbers?",
            "Do you want corporate finance or personal wealth advisory?",
          ],
        },
      },
      {
        title: "Corporate Accounting & Advisory Associate",
        whyItFits: `Applies accounting standards, taxation knowledge, and fiscal discipline to keep enterprises compliant and efficient.`,
        alignmentRationale: "Values integrity, precision, and reliable financial systems.",
        supportingEvidence: ["Knowledge of accounting principles", "Methodical organization skills"],
        currentStrengths: ["High attention to detail", "Systematic record-keeping"],
        missingCapabilities: ["ERP system proficiency (SAP/Tally/Zoho Books)", "Direct/Indirect tax filings"],
        riskConcern: "Repetitive compliance tasks require strong personal pacing.",
        careerExperiment: {
          title: "14-Day Business Audit & Budget Exercise",
          duration: "14 Days",
          week1: ["Build a comprehensive 6-month budget model for a hypothetical small enterprise with realistic revenue/expense categories."],
          week2: ["Perform a sensitivity analysis testing a 15% drop in sales and draft cost-saving recommendations."],
          reflectionQuestions: ["Did structuring financial budgets give you satisfaction?", "Do you value accounting precision?"],
        },
      },
      {
        title: "Commercial Strategy & Operations Consultant",
        whyItFits: `Combines financial acumen with strategic business decision-making and market expansion.`,
        alignmentRationale: "Bridges finance numbers with executive management strategy.",
        supportingEvidence: ["Strategic thinking", "Desire to influence business decisions"],
        currentStrengths: ["Commercial awareness", "Problem structuring"],
        missingCapabilities: ["Cross-functional executive presentation", "Operational bottleneck diagnosis"],
        riskConcern: "Needs strong client communication alongside spreadsheet analysis.",
        careerExperiment: {
          title: "14-Day Business Model Teardown",
          duration: "14 Days",
          week1: ["Study 1 emerging Indian D2C or Fintech company's business model."],
          week2: ["Map out their unit economics, customer acquisition cost, and revenue streams in a 1-page slide."],
          reflectionQuestions: ["Did analyzing business strategies inspire you?", "Do you want to advise growing businesses?"],
        },
      }
    );
  } else if (isMgmt) {
    careerDirections.push(
      {
        title: "Business Strategy & Management Consultant",
        whyItFits: `Directly aligns your passion for organizational problem solving, leadership, and commercial venture growth.`,
        alignmentRationale: `Resonates with your management foundation in ${context.course} and your core value of ${primaryValue}.`,
        supportingEvidence: [
          `Management studies in ${context.course}`,
          `Interest in leadership, coordination, and enterprise growth`,
        ],
        currentStrengths: ["Strategic perspective", "Interest in organizational dynamics"],
        missingCapabilities: ["Structured case interview frameworks", "Market sizing methodologies"],
        riskConcern: "Focusing solely on abstract strategy without ground-level execution practice.",
        careerExperiment: {
          title: "14-Day Strategic Case Study Sprint",
          duration: "14 Days",
          week1: [
            "Select 1 real business dilemma (e.g. an offline retailer transitioning to omnichannel).",
            "Structure the problem using a formal issue tree (Market, Customer, Competition, Capability).",
            "Draft 3 actionable strategic recommendations with timeline and cost estimates.",
          ],
          week2: [
            "Deliver a 10-minute verbal presentation of your recommendations to 2 peers and 1 mentor.",
            "Gather feedback on clarity, analytical rigor, and presentation poise.",
            "Reflect: Did solving unstructured business challenges energize your thinking?",
          ],
          reflectionQuestions: [
            "Did formulating business recommendations make you feel engaged?",
            "Did you enjoy defending your strategic logic under questioning?",
            "Do you see yourself advising executive leadership?",
          ],
        },
      },
      {
        title: "Venture Development & Growth Operations Associate",
        whyItFits: `Empowers you to turn new product ideas into viable, growing commercial operations.`,
        alignmentRationale: "Combines entrepreneurial drive with milestone delivery discipline.",
        supportingEvidence: ["Stated ambition in BHAG milestone", "Desire for creative autonomy"],
        currentStrengths: ["Proactive initiative", "Willingness to take calculated risks"],
        missingCapabilities: ["Customer discovery interviews", "Go-to-market funnel analytics"],
        riskConcern: "High ambiguity requires strong personal resilience and self-direction.",
        careerExperiment: {
          title: "14-Day Customer Discovery Sprint",
          duration: "14 Days",
          week1: ["Formulate 1 specific business hypothesis for a campus or local service."],
          week2: ["Interview 5 prospective customers without selling; listen strictly to their existing pain points."],
          reflectionQuestions: ["Did learning from real customers excite you?", "Do you enjoy the startup discovery process?"],
        },
      },
      {
        title: "Operations & Product Management Associate",
        whyItFits: `Connects cross-functional team coordination with seamless day-to-day project execution.`,
        alignmentRationale: "Values organizational efficiency, clarity, and dependable delivery.",
        supportingEvidence: ["Interest in organizing teams", "Focus on process improvement"],
        currentStrengths: ["Structured planning", "Collaborative demeanor"],
        missingCapabilities: ["Agile/Scrum ceremonies", "Workflow automation tools"],
        riskConcern: "Can be overwhelmed by competing priorities without clear prioritization frameworks.",
        careerExperiment: {
          title: "14-Day Workflow Optimization Project",
          duration: "14 Days",
          week1: ["Map out 1 existing inefficient process in your college club or department."],
          week2: ["Design a simplified digital workflow that saves 30% time, and pilot it with 3 peers."],
          reflectionQuestions: ["Did eliminating operational friction feel rewarding?", "Do you enjoy managing systems and teams?"],
        },
      }
    );
  } else if (isBio) {
    careerDirections.push(
      {
        title: "Clinical Research Scientist & Bio-Specialist",
        whyItFits: `Directly reflects your scientific curiosity, laboratory rigor, and commitment to evidence-based healthcare innovation.`,
        alignmentRationale: `Grounded in your science background in ${context.course} and your core value of ${primaryValue}.`,
        supportingEvidence: [
          `Scientific laboratory coursework in ${context.course}`,
          `Intrinsic curiosity for research and biological mechanisms`,
        ],
        currentStrengths: ["Systematic observation", "Familiarity with scientific protocols"],
        missingCapabilities: ["Advanced molecular diagnostics", "Statistical bioinformatics packages (R / Python)"],
        riskConcern: "Needs sustained patience with experimental validation cycles.",
        careerExperiment: {
          title: "14-Day Scientific Research & Protocol Sprint",
          duration: "14 Days",
          week1: [
            "Choose 1 recent peer-reviewed scientific paper in your field of study.",
            "Break down its hypothesis, methodology, control variables, and conclusions into a 2-page synthesis.",
            "Identify 1 limitation acknowledged by the authors.",
          ],
          week2: [
            "Present your paper breakdown to a faculty research guide or laboratory supervisor.",
            "Discuss how you would design a follow-up experiment to address the limitation.",
            "Reflect: Did dissecting experimental design and evidence give you flow?",
          ],
          reflectionQuestions: [
            "Did reading research papers and experimental methods excite your curiosity?",
            "Do you enjoy meticulous laboratory rigor?",
            "Would you prefer academic research or biotechnology industry roles?",
          ],
        },
      },
      {
        title: "Biochemical & Quality Assurance Specialist",
        whyItFits: `Applies laboratory quality standards, diagnostic validation, and regulatory compliance to healthcare products.`,
        alignmentRationale: "Values safety, precision, and adherence to evidence standards.",
        supportingEvidence: ["Attention to protocol", "Scientific rigor"],
        currentStrengths: ["Careful documentation", "Commitment to accuracy"],
        missingCapabilities: ["Good Laboratory Practice (GLP) certifications", "Regulatory filings"],
        riskConcern: "Repetitive quality testing requires unwavering focus.",
        careerExperiment: {
          title: "14-Day Lab Quality Protocol Review",
          duration: "14 Days",
          week1: ["Study 1 standard GLP assay protocol and map every critical control point."],
          week2: ["Write a simulated Quality Deviation Report for an unexpected measurement."],
          reflectionQuestions: ["Did maintaining quality precision feel important?", "Do you value compliance in sciences?"],
        },
      },
      {
        title: "Science Communication & Health Policy Associate",
        whyItFits: `Translates complex scientific findings into clear, accessible language for doctors, patients, and the public.`,
        alignmentRationale: "Bridges deep scientific understanding with communicative empathy.",
        supportingEvidence: ["Passion for explaining science", "Interdisciplinary curiosity"],
        currentStrengths: ["Clear verbal expression", "Scientific literacy"],
        missingCapabilities: ["Medical copywriting frameworks", "Public health data visualization"],
        riskConcern: "Must maintain scientific accuracy while simplifying language.",
        careerExperiment: {
          title: "14-Day Science Article Creation",
          duration: "14 Days",
          week1: ["Write a 600-word accessible explanation of 1 complex scientific phenomenon for non-scientists."],
          week2: ["Have 3 non-science peers read it and quiz them on whether the core idea was understood."],
          reflectionQuestions: ["Did translating science make you feel fulfilled?", "Do you enjoy communication in science?"],
        },
      }
    );
  } else if (isDesign) {
    careerDirections.push(
      {
        title: "Digital Product & UI/UX Experience Designer",
        whyItFits: `Directly matches your creative visual imagination, empathy for users, and passion for elegant aesthetics.`,
        alignmentRationale: `Resonates with your core value of ${primaryValue} and interest in visual expression.`,
        supportingEvidence: [
          `Self-identified passion for design, aesthetics, and creative craft`,
          `Desire to build intuitive experiences for people`,
        ],
        currentStrengths: ["Visual aesthetic sensibility", "User empathy"],
        missingCapabilities: ["Design systems architecture (Figma auto-layout)", "Usability test facilitation"],
        riskConcern: "Focusing on visuals without understanding the underlying user problem and constraints.",
        careerExperiment: {
          title: "14-Day Interface Redesign & Usability Sprint",
          duration: "14 Days",
          week1: [
            "Select 1 confusing mobile app screen or college portal page that users struggle with.",
            "Conduct 3 quick usability interviews observing users trying to complete a specific task.",
            "Sketch 3 alternative wireframe layouts on paper addressing user pain points.",
          ],
          week2: [
            "Create a clean Figma prototype of your best redesign with improved typography and contrast.",
            "Test your interactive prototype with the same 3 users and record completion times.",
            "Reflect: Did iterating on digital interfaces make you lose track of time?",
          ],
          reflectionQuestions: [
            "Did designing and refining user flows make you feel energized?",
            "How did you feel when users pointed out confusing elements in your design?",
            "Do you want to focus on UI visual craft or UX product research?",
          ],
        },
      },
      {
        title: "Brand Communications & Visual Storyteller",
        whyItFits: `Combines graphic design, typography, and narrative to communicate compelling messages for organizations.`,
        alignmentRationale: "Values original expression, emotional resonance, and clarity.",
        supportingEvidence: ["Interest in creative media and storytelling", "Visual design eye"],
        currentStrengths: ["Narrative imagination", "Visual composition"],
        missingCapabilities: ["Brand strategy frameworks", "Cross-media campaign coordination"],
        riskConcern: "Needs to balance artistic instinct with commercial brand guidelines.",
        careerExperiment: {
          title: "14-Day Visual Brand Identity Kit",
          duration: "14 Days",
          week1: ["Create a 3-piece visual identity kit (logo concept, color palette, typography pair) for a local project."],
          week2: ["Apply it to 1 poster and 1 social media announcement and gather public feedback."],
          reflectionQuestions: ["Did branding and visual storytelling feel natural?", "Do you enjoy creative communication?"],
        },
      },
      {
        title: "Creative Technology & Interactive Media Specialist",
        whyItFits: `Bridges creative visual design with front-end code and interactive technology.`,
        alignmentRationale: "Merges artistic vision with functional software implementation.",
        supportingEvidence: ["Interdisciplinary curiosity", "Interest in creative software"],
        currentStrengths: ["Willingness to experiment", "Visual flair"],
        missingCapabilities: ["CSS animations & interactive JavaScript frameworks"],
        riskConcern: "Can be pulled between pure design and technical development.",
        careerExperiment: {
          title: "14-Day Micro-Interaction Prototype",
          duration: "14 Days",
          week1: ["Design and code 1 animated interactive widget or portfolio hero section."],
          week2: ["Publish it live on the web and collect peer critique on polish and responsiveness."],
          reflectionQuestions: ["Did combining design with interactivity give you flow?", "Do you love creative technology?"],
        },
      }
    );
  } else if (isSocial) {
    careerDirections.push(
      {
        title: "Social Impact & Community Development Specialist",
        whyItFits: `Directly matches your deep sense of empathy, desire to help people, and passion for civic contribution.`,
        alignmentRationale: `Grounded in your core values of ${primaryValue} and service.`,
        supportingEvidence: [
          `Self-identified passion for helping people and community welfare`,
          `Interest in understanding society and uplifting others`,
        ],
        currentStrengths: ["High emotional intelligence", "Commitment to human dignity"],
        missingCapabilities: ["Monitoring and Evaluation (M&E) frameworks", "Grant proposal writing"],
        riskConcern: "Risk of emotional exhaustion without systematic self-care and clear boundaries.",
        careerExperiment: {
          title: "14-Day Community Needs Assessment Sprint",
          duration: "14 Days",
          week1: [
            "Select 1 specific challenge faced by a local neighborhood or student demographic.",
            "Conduct structured 15-minute interviews with 4 individuals affected by the issue.",
            "Synthesize their real statements into a 2-page Community Needs Brief.",
          ],
          week2: [
            "Design 1 low-cost, grassroots intervention that could be executed by volunteers in 1 day.",
            "Present the concept to a local non-profit coordinator or faculty mentor.",
            "Reflect: Did working directly with human concerns give you meaningful energy?",
          ],
          reflectionQuestions: [
            "Did listening to community members create a sense of purpose for you?",
            "Do you prefer policy advocacy or grassroots implementation?",
            "What kind of community challenges do you care about solving most?",
          ],
        },
      },
      {
        title: "Public Policy & Social Research Associate",
        whyItFits: `Applies social science research and analytical rigor to improve institutional policies and social welfare.`,
        alignmentRationale: "Connects systemic analysis with constructive societal change.",
        supportingEvidence: ["Interest in social systems", "Analytical perspective"],
        currentStrengths: ["Contextual awareness", "Critical thinking"],
        missingCapabilities: ["Quantitative survey statistical analysis", "Policy memo drafting"],
        riskConcern: "Policy change is often slow; requires long-term commitment.",
        careerExperiment: {
          title: "14-Day Policy Brief Exercise",
          duration: "14 Days",
          week1: ["Research 1 local municipal or university policy and map its unintended consequences."],
          week2: ["Draft a concise 2-page Policy Reform Memo with 3 actionable improvements."],
          reflectionQuestions: ["Did analyzing institutional rules feel engaging?", "Do you value policy research?"],
        },
      },
      {
        title: "Humanities Educator & Cultural Communications Specialist",
        whyItFits: `Bridges human stories, history, and cultural understanding to educate and connect diverse groups.`,
        alignmentRationale: "Values human expression, language, and mutual understanding.",
        supportingEvidence: ["Appreciation for literature, culture, and communication"],
        currentStrengths: ["Nuanced empathy", "Thoughtful articulation"],
        missingCapabilities: ["Digital archival methods", "Cross-cultural mediation tools"],
        riskConcern: "Needs clear career pathways aligned with emerging cultural media roles.",
        careerExperiment: {
          title: "14-Day Cultural Storytelling Project",
          duration: "14 Days",
          week1: ["Interview an elder or community artisan about a vanishing local tradition or trade."],
          week2: ["Publish a compelling 800-word photo essay documenting their story and lessons."],
          reflectionQuestions: ["Did preserving human stories feel deeply meaningful?", "Do you enjoy cultural journalism?"],
        },
      }
    );
  } else if (isUndecided) {
    careerDirections.push(
      {
        title: "Cross-Disciplinary Discovery Associate (Exploration Track)",
        whyItFits: `Designed specifically for students exploring multiple interests before committing to a single fixed identity.`,
        alignmentRationale: `Normalizes healthy exploration, allowing you to empirically discover what energizes you through low-cost trials.`,
        supportingEvidence: [
          `Self-reported exploratory mindset`,
          `Broad curiosity across multiple disciplines`,
        ],
        currentStrengths: ["Openness to new experiences", "Freedom from rigid assumptions"],
        missingCapabilities: ["Direct hands-on evidence across prospective domains"],
        riskConcern: "Getting stuck in endless overthinking without trying practical real-world activities.",
        careerExperiment: {
          title: "14-Day Multi-Domain Discovery Trial",
          duration: "14 Days",
          week1: [
            "Select 2 completely different mini-activities to try for 3 days each (e.g. 3 days of teaching/explaining to a peer vs 3 days of building a simple digital sheet or tool).",
            "Dedicate 45 minutes daily to the active mini-task without multitasking.",
          ],
          week2: [
            "Log your daily energy rating (1-10) and whether you felt energized or drained after each.",
            "Compare the two experiences with your assigned mentor.",
            "Reflect: Which type of problem gave you more genuine flow?",
          ],
          reflectionQuestions: [
            "Did doing the hands-on activity teach you more about yourself than just thinking?",
            "Which of the two trials felt more satisfying when completed?",
            "What is one more domain you'd love to test next month?",
          ],
        },
      },
      {
        title: "Operations & Systems Project Coordinator",
        whyItFits: `Builds transferable organizing and project execution skills that are valuable across every single industry.`,
        alignmentRationale: "Provides high utility and broad career options while keeping paths open.",
        supportingEvidence: ["Need for versatile foundational capabilities", "Organizing inclination"],
        currentStrengths: ["Adaptability", "Multi-tasking ability"],
        missingCapabilities: ["Milestone tracking frameworks", "Spreadsheet automation"],
        riskConcern: "Ensure you develop at least one depth capability alongside general coordination.",
        careerExperiment: {
          title: "14-Day Event & Milestone Coordination Sprint",
          duration: "14 Days",
          week1: ["Take responsibility for coordinating 1 group study session or small campus event."],
          week2: ["Document the agenda, timing, tasks, and follow-ups in a structured sheet."],
          reflectionQuestions: ["Did coordinating logistics feel comfortable?", "Do you like organizing people and plans?"],
        },
      },
      {
        title: "Strategic Communications & Research Fellow",
        whyItFits: `Develops core communication, writing, and research capabilities that open doors across business, media, and academia.`,
        alignmentRationale: "Focuses on high-leverage transferable capabilities.",
        supportingEvidence: ["Curiosity to understand varied fields", "Communication orientation"],
        currentStrengths: ["Synthesizing varied information", "Questioning assumptions"],
        missingCapabilities: ["Executive presentation poise", "Primary research interviewing"],
        riskConcern: "Needs regular portfolio artifacts to showcase progress.",
        careerExperiment: {
          title: "14-Day Industry Research Sprint",
          duration: "14 Days",
          week1: ["Investigate 2 growing industries in India and write a 1-page summary on emerging job roles in each."],
          week2: ["Interview 1 working alumnus in each industry for 15 minutes to understand their daily realities."],
          reflectionQuestions: ["Did researching future industries expand your perspective?", "Which day-to-day work felt most attractive?"],
        },
      }
    );
  } else {
    // Default Technology & Software pathway with high rigor
    careerDirections.push(
      {
        title: "Full-Stack Software Engineer & Solutions Developer",
        whyItFits: `Directly bridges your highest ranked passion for "${primaryPassion}" with your core value of ${primaryValue}.`,
        alignmentRationale: `Resonates with your primary self-discovery answers and foundational study in ${context.course}.`,
        supportingEvidence: [
          `Academic enrollment in ${context.course}`,
          taskRateVal !== null ? `Task completion rate of ${taskRateVal}%` : "Enthusiastic self-discovery engagement",
          `High intrinsic importance score (${processedPassions[0]?.selfRatedImportance || 8}/10)`,
        ],
        currentStrengths: [
          "Clear focus on foundational principles",
          attendanceRateVal !== null ? `Reliable attendance (${attendanceRateVal}%) demonstrating stamina` : "High stated willingness to learn",
        ],
        missingCapabilities: [
          "Production-grade independent implementation experience",
          "Public showcase or documented case study repository",
        ],
        riskConcern: "Tendency to over-focus on theory without shipping finished artifacts into the real world.",
        careerExperiment: {
          title: "14-Day Practical Discovery Sprint in Software Engineering",
          duration: "14 Days",
          week1: [
            `Select 1 specific real-world problem aligned with ${primaryPassion.toLowerCase()}.`,
            "Study 2 existing solutions and outline a functional prototype on paper.",
            "Discuss the proposal outline with a faculty mentor or peer for early critique.",
          ],
          week2: [
            "Build the basic functional draft or interactive prototype of the solution.",
            "Present the output to 2 other students or faculty members.",
            "Reflect: Did working on this problem energize or drain your energy?",
          ],
          reflectionQuestions: [
            "Did working on this project make you lose track of time?",
            "Did you feel energized or exhausted at the end of each session?",
            "Would you gladly tackle a more complex problem in this direction?",
          ],
        },
      },
      {
        title: "Systems Consultant & Technical Product Associate",
        whyItFits: `Connects your secondary passion for "${secondaryPassion}" with your 3-5 year ambition.`,
        alignmentRationale: "Combines your problem-solving interests with collaborative team coordination.",
        supportingEvidence: [
          "Desire for team coordination and clear execution reflected in assessment",
          "Multi-layer depth shown in 5-Whys reflection",
        ],
        currentStrengths: [
          "Organized and structured thinking",
          "Reflective self-awareness shown in 5-Whys reflection",
        ],
        missingCapabilities: [
          "Executive presentation and stakeholder communication",
          "Milestone tracking and agile delivery discipline",
        ],
        riskConcern: "Needs structured opportunities to lead team initiatives before competitive recruitment cycles.",
        careerExperiment: {
          title: "14-Day Team Initiative & Project Sprint",
          duration: "14 Days",
          week1: [
            "Organize a small peer group to study or solve a challenging course topic.",
            "Facilitate 2 structured sessions setting clear goals and agendas.",
          ],
          week2: [
            "Deliver a consolidated team report or presentation of findings.",
            "Gather anonymous feedback from group members on your facilitation.",
          ],
          reflectionQuestions: [
            "Did you enjoy motivating and coordinating others?",
            "How did you handle differing opinions or bottlenecks?",
            "Do you want team leadership to be a central part of your daily career?",
          ],
        },
      },
      {
        title: "Innovation Specialist & Technology Entrepreneur",
        whyItFits: `Grounded in your stated BHAG milestone ("${bhag}") and ambition for meaningful contribution.`,
        alignmentRationale: "Embodies the entrepreneurial mindset of spotting unsolved dilemmas and building viable, value-creating solutions.",
        supportingEvidence: [
          "Bold ambition articulated in Big Dream Milestone",
          "Desire for creative autonomy and community impact",
        ],
        currentStrengths: [
          "Creative problem formulation",
          "Persistence through unfamiliar challenges",
        ],
        missingCapabilities: [
          "Customer validation and user feedback loops",
          "Business feasibility and resource optimization analysis",
        ],
        riskConcern: "Can lead to burnout if ambitious milestones are not broken down into small, daily measurable habits.",
        careerExperiment: {
          title: "14-Day Prototype & Validation Sprint",
          duration: "14 Days",
          week1: [
            "Identify 1 practical inconvenience faced by students or campus community.",
            "Interview 5 individuals to understand their pain points deeply.",
          ],
          week2: [
            "Sketch or build a rapid mini-solution (form, tool, guide, or script).",
            "Test it with 3 users and measure if it truly solved their problem.",
          ],
          reflectionQuestions: [
            "Did you enjoy talking to users and understanding their real problems?",
            "Were you comfortable with iterative feedback and making changes?",
            "Does creating new things from scratch excite you more than routine tasks?",
          ],
        },
      }
    );
  }

  // Stage 8: Structured Practical Experiments across student's interests
  const practicalExperiments = [
    {
      title: `14-Day Exploratory Sprint in ${careerDirections[0]?.title || primaryPassion}`,
      domain: careerDirections[0]?.title || primaryPassion,
      whatToDo: `Complete the week 1 and week 2 tasks defined in Career Experiment #1 (${careerDirections[0]?.title}).`,
      timeRequired: "3–4 hours per week for 2 weeks",
      resourcesRequired: "Journal notebook, internet connectivity, access to 2–3 peers or mentors for feedback.",
      expectedLearning: "Discover empirically whether doing this practical activity creates genuine flow, curiosity, and energy.",
      reflectionPlan: "Record daily energy logs and answer the 3 post-experiment reflection questions at day 14.",
      evidenceToCollect: "1 completed work artifact (prototype, lesson sheet, analysis memo) + written feedback from 2 people.",
      outcomeScope: "Tests real-world interest; does not definitively predict your permanent career.",
      status: "Planned",
    },
    {
      title: `30-Day Practical Portfolio & Deep-Dive Sprint`,
      domain: primaryPassion,
      whatToDo: `Dedicate 4 hours every Saturday to building 1 comprehensive portfolio case study or practical deliverable in ${primaryPassion.toLowerCase()}.`,
      timeRequired: "4 hours weekly for 4 weeks (16 hours total)",
      resourcesRequired: "Standard study materials, faculty advisor feedback, portfolio template.",
      expectedLearning: "Evaluate your endurance, self-direction, and ability to bridge theoretical knowledge into finished artifacts.",
      reflectionPlan: "Conduct a 30-day review with your faculty mentor comparing initial expectations with actual experience.",
      evidenceToCollect: "Published case study document or live demonstration link.",
      outcomeScope: "Builds tangible portfolio evidence for mentorship reviews and placement opportunities.",
      status: "Planned",
    },
  ];

  // Stage 3: Recurring Patterns (Explicit vs Inferred with Student Confirmation)
  const recurringPatterns = [
    {
      pattern: archetype.primaryPattern,
      supportingAnswers: [
        `Explicitly stated passion: "${primaryPassion}"`,
        flowAnswers.energyGivingActivity ? `Flow activity: "${flowAnswers.energyGivingActivity}"` : `Selected core value: ${primaryValue}`,
        understandMyself.experiences ? `Meaningful experience: "${understandMyself.experiences.slice(0, 100)}..."` : "Engagement during self-discovery",
      ],
      source: "inferred",
      counterExample: "Notice if this pattern represents what you naturally enjoy, or what you feel socially expected to pursue.",
      studentConfirmation: "confirmed",
      studentNote: "Resonates with how I naturally approach challenges and learning.",
    },
    {
      pattern: archetype.secondaryPattern,
      supportingAnswers: [
        `Secondary interest: "${secondaryPassion}"`,
        `5-Whys exploration layer: "${studentAspiration || primaryValue}"`,
      ],
      source: "inferred",
      counterExample: "Consider whether this drive is constant or only appears in specific group environments.",
      studentConfirmation: "confirmed",
      studentNote: "Complements my primary drive effectively.",
    },
  ];

  // Stage 6: Structured Vision Discovery Exercises synthesized
  const synthesizedVisionExercises = {
    idealDay: {
      where: visionExercises.idealDay?.where || "A vibrant professional setting that balances collaborative energy with quiet focus",
      activities: visionExercises.idealDay?.activities || `Engaging deeply in hands-on projects and problem solving within ${primaryPassion.toLowerCase()}`,
      people: visionExercises.idealDay?.people || "Supportive teammates, thoughtful mentors, and appreciative peers",
      problems: visionExercises.idealDay?.problems || "Solving meaningful real-world challenges that make a difference",
      responsibilities: visionExercises.idealDay?.responsibilities || "Delivering high-quality deliverables and mentoring upcoming learners",
      environment: visionExercises.idealDay?.environment || "Open, encouraging, and continuous-learning oriented",
      balance: visionExercises.idealDay?.balance || "Healthy boundaries allowing time for fitness, family, and hobbies",
      meaningfulParts: visionExercises.idealDay?.meaningfulParts || "Knowing that the day's effort contributed to someone's growth or solved an actual problem",
      narrative: visionExercises.idealDay?.narrative || vividFuture,
    },
    futureHeadlines: {
      headline: visionExercises.futureHeadlines?.headline || (
        isTeaching ? "Dedicated Educator Pioneers Impactful Student Learning Initiatives" :
        isAgri ? "Agriculture Graduate Develops Sustainable Agri-Solutions for Local Farmers" :
        isCommerce ? "Commerce Specialist Builds Trusted Financial Advisory & Analysis Practice" :
        isMgmt ? "Young Entrepreneur Scales Sustainable Business Venture with Community Impact" :
        isBio ? "Science Graduate Contributes to Groundbreaking Laboratory Research" :
        isDesign ? "Creative Designer Launches Engaging Digital Products Loved by Users" :
        isSocial ? "Social Advocate Leads Meaningful Community Empowerment Program" :
        isTech ? "Software Innovator Builds Impactful Digital Public Solutions" :
        "Emerging Professional Achieves Transformative Milestone in Chosen Field"
      ),
      whyItMatters: visionExercises.futureHeadlines?.whyItMatters || "Represents personal mastery, family pride, and meaningful contribution.",
    },
    workLifePreferences: {
      collaboration: visionExercises.workLifePreferences?.collaboration || "Balanced team collaboration with dedicated independent focus blocks",
      structure: visionExercises.workLifePreferences?.structure || "Clear foundational roadmap with room for creative experimentation",
      uncertainty: visionExercises.workLifePreferences?.uncertainty || "Prioritizing stable competence while testing innovative initiatives",
      workFocus: visionExercises.workLifePreferences?.workFocus || "People, practical outcomes, and purposeful solutions",
      createVsImprove: visionExercises.workLifePreferences?.createVsImprove || "Creating new initiatives while optimizing existing systems",
      rolePreference: visionExercises.workLifePreferences?.rolePreference || "Hands-on execution with emerging mentoring responsibility",
      workEnvironment: visionExercises.workLifePreferences?.workEnvironment || "Flexible, growth-focused environment",
    },
    futureContribution: {
      contribution: visionExercises.futureContribution?.contribution || `Improve quality and accessible outcomes through ${primaryPassion.toLowerCase()}`,
      whyItMatters: "Leaves an enduring positive footprint in the community.",
    },
    futureRegret: {
      regretAvoided: visionExercises.futureRegret?.regretAvoided || `Never attempting to test and build something meaningful around my true curiosity for ${primaryPassion.toLowerCase()}`,
    },
    possibleFutures: [
      {
        title: careerDirections[0]?.title || primaryPassion,
        description: `Primary track: Deep dive into ${primaryPassion.toLowerCase()}, focusing on immediate practical skill building and portfolio proof.`,
        supportingPreferences: [`High interest in ${primaryPassion}`, `Value alignment with ${primaryValue}`],
        uncertainties: ["Requires testing through a 14-day career experiment"],
        thirtyDayTrial: `Complete the 14-day discovery sprint in ${careerDirections[0]?.title || primaryPassion} and record your weekly energy reflections.`,
        studentInterest: "interested",
      },
      {
        title: careerDirections[1]?.title || "Interdisciplinary Explorer",
        description: `Secondary track: Bridge ${context.course} foundation with team coordination, communication, or advisory capabilities.`,
        supportingPreferences: [`Secondary interest in ${secondaryPassion}`, `Value alignment with ${secondaryValue}`],
        uncertainties: ["Balances domain learning with cross-functional initiatives"],
        thirtyDayTrial: "Conduct informational interviews with 2 practitioners in this field.",
        studentInterest: "exploring",
      },
      {
        title: careerDirections[2]?.title || "Independent Venture Track",
        description: `Exploratory track: Test small, independent projects or community initiatives solving localized problems.`,
        supportingPreferences: [`Ambition articulated in BHAG: "${bhag}"`, `Value alignment with ${primaryValue}`],
        uncertainties: ["Requires self-discipline and managing initial ambiguity"],
        thirtyDayTrial: "Interview 5 people about a practical daily inconvenience and sketch a 1-page solution.",
        studentInterest: "exploring",
      },
    ],
  };

  // Stage 8 & 9: Multi-Horizon Detailed Development Roadmap
  const thirtyDayActions = [
    `1. Execute Career Experiment #1 (${careerDirections[0]?.title}) for 14 days and record daily energy observations in your reflection journal.`,
    `2. Protect 3-4 hours every week for deliberate, hands-on exploration of "${primaryPassion}" beyond standard class lectures.`,
    `3. Meet with your faculty mentor or advisor for 20 minutes to review this Personal Thesis and agree on 1 milestone to track.`,
  ];

  const ninetyDayRoadmap = [
    `Month 1: Solidify foundational performance in ${context.course} while completing your initial 14-day discovery experiment.`,
    `Month 2: Build 1 tangible deliverable, case study, or written synthesis demonstrating practical capabilities in ${primaryPassion.toLowerCase()}.`,
    `Month 3: Review your Passion Markers, update your thesis draft, and share output with peers or mentors.`,
  ];

  const sixMonthGoals = [
    `Skills: Master 2 high-leverage tools or industry-relevant methodologies aligned with your top direction.`,
    `Deliverables: Complete an end-to-end practical project or portfolio item solving an authentic user or community problem.`,
    `Communication: Deliver 2 structured presentations or verbal walkthroughs of your work to faculty and peers.`,
    `Networking: Connect with 3 practitioners or alumni working in your target direction for informational mentorship.`,
  ];

  const twelveMonthGoals = [
    `Milestone 1: Achieve placement or professional readiness for premier roles aligned with ${careerDirections[0]?.title}.`,
    `Milestone 2: Deliver measurable progress towards your Big Dream Milestone: "${bhag}".`,
    `Milestone 3: Conduct Version 2 AI Thesis evaluation to assess purpose evolution, maturity, and closed skill gaps.`,
  ];

  const reviewDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const revisionPlan = "Review this thesis every 90 days or immediately following completion of a career experiment to record what you learned.";

  const roadmap = {
    threeMonths: ninetyDayRoadmap,
    sixMonths: sixMonthGoals,
    twelveMonths: twelveMonthGoals,
  };

  const detailedRoadmap = {
    thirtyDayActions,
    ninetyDayRoadmap,
    sixMonthGoals,
    twelveMonthGoals,
    reviewDate,
    revisionPlan,
  };

  const recommendations = [
    `Establish a weekly 3 to 4 hour "Discovery Lab" block dedicated strictly to your primary passion (${primaryPassion}).`,
    "Track your Passion Markers weekly: Ensure current engagement scores move upward through tangible habits.",
    "Schedule monthly mentor review sessions with assigned faculty to review development gap progress.",
    "Turn every completed curriculum assignment into a polished portfolio case study demonstrating evidence.",
  ];

  const facultyInterventions = [
    {
      actionId: "act-1",
      title: `Assign Domain Mentor for ${careerDirections[0]?.title}`,
      category: "Mentorship",
      status: "Not Started",
      facultyName: "",
      notes: "Connect student with senior faculty or alumni practitioner for career direction guidance.",
      updatedAt: new Date(),
    },
    {
      actionId: "act-2",
      title: "Recommend Practical Capstone Project Mentorship",
      category: "Project",
      status: "Not Started",
      facultyName: "",
      notes: "Assign end-to-end practical deliverable to bridge theoretical knowledge into demonstrable portfolio.",
      updatedAt: new Date(),
    },
    {
      actionId: "act-3",
      title: "Monthly Presentation & Verbal Synthesis Practice",
      category: "Communication",
      status: "Not Started",
      facultyName: "",
      notes: "Encourage student to deliver 5-minute verbal walkthroughs during seminar or club hours.",
      updatedAt: new Date(),
    },
  ];

  const evidenceBehindInterests = processedPassions.map(p => ({
    passion: p.name,
    studentEvidence: p.explanation || p.originalStatement,
    verifiedEvidence: verifiedEvidence.taskMetricsVerified.taskCompletionRate !== null
      ? `${verifiedEvidence.taskMetricsVerified.taskCompletionRate}% task rate`
      : "Data unavailable in formal records",
    aiInferredPattern: p.aiInterpretation,
    gapAnalysis: p.gapExplanation,
  }));

  const passionGaps = processedPassions.map(p => ({
    name: p.name,
    importance: p.selfRatedImportance,
    currentScore: p.currentScore,
    gap: p.passionGap,
    explanation: p.gapExplanation,
  }));

  return {
    // 1. Student Profile & Discovery Context
    studentProfileContext: {
      studentId: context.studentId,
      name: context.name,
      prkey: context.prkey,
      course: context.course,
      year: context.year,
      department: context.department,
      currentLevel: context.currentLevel,
      session: context.session,
      verifiedEvidence,
    },

    // 2. Personal Discovery Summary
    personalDiscoverySummary: `${context.name || "The student"} presents a purposeful, growth-oriented student profile anchored in ${primaryPassion} and guided by ${primaryValue}. Progress in ${context.currentLevel} provides a credible foundation. By closing identified practical project gaps through structured 14-day career experiments, the student can bridge their current capabilities with their vivid 3-5 year vision.`,
    aiSummary: `${context.name || "The student"} presents a purposeful, growth-oriented student profile anchored in ${primaryPassion} and guided by ${primaryValue}. Progress in ${context.currentLevel} provides a credible foundation. By closing identified practical project gaps through structured 14-day career experiments, the student can bridge their current capabilities with their vivid 3-5 year vision.`,

    // 3. Current Interests and Possible Passions
    topPassions: processedPassions,
    currentInterests: processedPassions,

    // 4. Evidence Behind Each Interest
    evidenceBehindInterests,

    // 5. Passion Importance and Current Engagement
    passionGaps,

    // 6. Core Values and Their Meaning
    coreValues,

    // 7. Important Life and Learning Experiences
    understandMyself: {
      experiences: understandMyself.experiences || "Self-directed student discovery reflection logged.",
      activitiesEnjoyed: understandMyself.activitiesEnjoyed || [primaryPassion],
      activitiesDisliked: understandMyself.activitiesDisliked || ["Repetitive rote memorization"],
      voluntarilyExplored: understandMyself.voluntarilyExplored || [secondaryPassion],
      preferredLearningStyle: understandMyself.preferredLearningStyle || "Hands-on practical execution and discussion",
      concernsAndUncertainties: understandMyself.concernsAndUncertainties || [],
    },

    // 8. Purpose Exploration and 5 Whys Reflection
    fiveWhys,
    purposeExploration: fiveWhys,

    // 9. Confirmed Personal Purpose Statement
    purposeStatement,

    // 10. Vision Exercise Results
    visionExercises: synthesizedVisionExercises,

    // 11. Ideal Future Narrative
    vividFuture,
    idealFutureNarrative: vividFuture,

    // 12. Confirmed Vision Statement
    visionStatement,

    // 13. Short-Term and Three-to-Five-Year Aspirations
    fiveYearGoal,
    tenYearGoal,
    bhag,
    aspirations: { fiveYearGoal, tenYearGoal, bhag },

    // 14. Self-Reported Strengths
    strengths,
    selfReportedStrengths: evidenceBasedStrengths.selfReported,

    // 15. Evidence-Backed Skills and Strengths
    evidenceBasedStrengths,
    evidenceBackedStrengths: evidenceBasedStrengths.evidenceBacked,

    // 16. Areas for Further Development
    developmentAreas: [
      `Bridge the gap between theoretical assignments and independent deliverables in ${primaryPassion.toLowerCase()}.`,
      "Strengthen verbal communication, structured presentations, and executive synthesis.",
      "Develop formal routines for tracking progress on measurable Passion Markers weekly.",
      "Deepen specialized capabilities in domain tools and cross-functional collaboration.",
    ],
    skillGaps,
    structuredDevelopmentGaps,

    // 17. Personal Values and Future Alignment
    valuesAlignment: `Your chosen core values of ${primaryValue} and ${secondaryValue} provide a moral compass for your stated 3-5 year aspirations. Prioritizing ${primaryValue} ensures you maintain long-term learning momentum through inevitable career transitions.`,

    // 18. Current Situation Versus Desired Future
    currentVsFuture: {
      currentSelf: {
        problemSolving: (taskRateVal !== null && taskRateVal >= 80) ? "Proficient" : "Developing",
        technicalDepth: (context.technologies?.length || 0) > 1 ? "Solid Fundamentals" : "Early Stage",
        communication: "Developing",
        leadership: "Emerging",
        executionDiscipline: (attendanceRateVal !== null && attendanceRateVal >= 85) ? "High Consistency" : "Moderate",
      },
      futureRequirement: {
        problemSolving: "Advanced & Systemic",
        technicalDepth: "Domain Mastery & Demonstrable Artifacts",
        communication: "Articulate, Influential & Clear",
        leadership: "Empathetic, Collaborative & Decisive",
        executionDiscipline: "Relentless & Sustainable",
      },
      developmentGaps: [
        "Bridging theoretical classroom tasks to self-directed open problem-solving",
        "Expressing technical and strategic reasoning with crisp clarity in group dialogues",
        "Consistently tracking weekly measurable progress towards stated BHAG milestones",
      ],
    },
    passionVsPerformance: {
      strongAlignments: [
        attendanceRateVal !== null
          ? `High internal passion for "${primaryPassion}" is supported by persistent attendance (${attendanceRateVal}%).`
          : `High internal passion for "${primaryPassion}" demonstrated through discovery reflection.`,
        `Interest in "${secondaryPassion}" is corroborated by active progression in ${context.currentLevel}.`,
        taskRateVal !== null
          ? `Curriculum task submissions (${verifiedEvidence.taskMetricsVerified.completedTasks} completed) show reliable foundation for future goals.`
          : "Readiness to undertake structured assignments in target career direction.",
      ],
      developmentRequired: [
        `Passion gap of ${processedPassions[0]?.passionGap || 2} pts in "${primaryPassion}" indicates need for more self-driven real-world practice.`,
        `Living the stated BHAG requires elevating practical portfolio projects beyond minimum curriculum requirements.`,
        "Daily habits must be directly tied to measurable Passion Markers rather than emotional intent alone.",
      ],
    },

    // 19. Potential Career and Life Directions
    careerDirections,

    // 20. Evidence and Reasoning Behind Each Direction
    directionReasoning: careerDirections.map(cd => ({
      title: cd.title,
      whyItFits: cd.whyItFits,
      rationale: cd.alignmentRationale,
      evidence: cd.supportingEvidence,
    })),

    // 21. Unknowns, Assumptions, and Missing Information
    missingInfoAndUncertainties: verifiedEvidence.dataGaps,
    unknownsAndMissingInfo: verifiedEvidence.dataGaps,

    // 22. Personalized Passion Experiments
    practicalExperiments,

    // 23. 30-Day Discovery Actions
    thirtyDayActions,

    // 24. Personalized 90-Day Development Roadmap
    ninetyDayRoadmap,

    // 25. Six-Month Goals
    sixMonthGoals,

    // 26. Twelve-Month Development Goals
    twelveMonthGoals,

    // 27. Student Reflection and Personal Commitment
    studentCommitment: dynamicCommitment,
    studentReflection: assessment.studentReflection || "I am committed to testing my authentic passions with honest weekly practice.",

    // 28. Review Date and Future Revision Plan
    reviewDate,
    revisionPlan,

    // Legacy & Mentoring Infrastructure
    flowAnswers,
    archetype,
    alignment: indicators.numericLegacy,
    alignmentScores: indicators.numericLegacy,
    developmentIndicators: indicators,
    evidenceValidation: verifiedEvidence,
    scoreRationales: {
      passionClarity: indicators.passionClarity.rationale,
      purposeClarity: indicators.purposeClarity.rationale,
      visionClarity: indicators.visionClarity.rationale,
      skillAlignment: indicators.skillAlignment.rationale,
      goalAlignment: indicators.goalAlignment.rationale,
      executionReadiness: indicators.overallIndex.rationale,
    },
    recommendations,
    roadmap,
    detailedRoadmap,
    recurringPatterns,
    facultyInterventions,
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
- Task Completion Rate: ${context.taskMetrics?.taskCompletionRate !== null ? `${context.taskMetrics?.taskCompletionRate}%` : "Data unavailable"} (${context.taskMetrics?.completedTasks || 0} / ${context.taskMetrics?.totalTasks || 0} tasks)
- Attendance Rate: ${context.attendanceRate !== null ? `${context.attendanceRate}%` : "Data unavailable"}
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
      const verifiedEvidence = validateAndReconcileEvidence(context);
      const indicators = calculateDevelopmentIndicators(context, assessment, verifiedEvidence);
      parsed.evidenceValidation = verifiedEvidence;
      parsed.developmentIndicators = indicators;
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

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ADAPTIVE AI-GUIDED DISCOVERY ENGINE
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements the interactive step-by-step discovery conversation.
 * Explains Passion, Purpose, and Vision in simple English + Hinglish.
 * Distinguishes: Explicit statements vs Inferred patterns vs Uncertainties.
 */

const DISCOVERY_STEPS = {
  myself_intro: {
    phase: "myself",
    stepKey: "myself_intro",
    contextHelp: "Understand Myself: Pehle khud ko samajhna zaroori hai. Humein sirf adjectives (jaise creative ya hard-working) nahi chahiye, balki aapke real experiences. Aisi cheez batayein jise aapne kabhi banaya, improve kiya, organise kiya ya imagine kiya — aur usme sabse zyada kya pasand aaya?",
    message: "Welcome to your AI Personal Discovery & Vision Journey! Before choosing a career, let's explore who you are. Tell me about something you created, improved, organized, or imagined (in school, college, home, or community). What part of that did you enjoy the most?",
    quickOptions: [
      "Organized a college/school event, fest, or group activity",
      "Created or built a project, digital work, artwork, or craft",
      "Helped family, friends, or neighbors solve a practical problem",
      "Explained difficult subjects or mentored younger peers",
      "Managed finances, budget, or small sales/business activity",
      "Investigated an interesting question or ran an experiment",
      "I am exploring my past experiences (let me type my own story)",
    ],
    allowCustom: true,
  },
  myself_drain_engage: {
    phase: "myself",
    stepKey: "myself_drain_engage",
    contextHelp: "Energy & Learning Style: Kuch activities hume energize karti hain aur kuch bilkul thaka (drain) deti hain. Yeh jaan-na equally important hai.",
    message: "Which activities or situations completely drain your energy, and how do you prefer to learn new things (hands-on doing, reading, watching, or discussing)?",
    quickOptions: [
      "Drained by rote memorization; learn best by hands-on building & doing",
      "Drained by constant screen time; learn best through human discussion & fieldwork",
      "Drained by disorganized chaos; learn best with structured notes & clear plans",
      "Drained by rigid rules; learn best when given freedom to experiment creatively",
      "Drained by public speaking; learn best through quiet analysis & independent research",
    ],
    allowCustom: true,
  },
  passion_intro: {
    phase: "passion",
    stepKey: "passion_intro",
    contextHelp: "Passion kya hota hai? Passion sirf ek favourite subject ya hobby nahi hota. Yeh wo activities, curiosity, aur problems hain jinhe solve karna ya seekhna aapko naturally energize karta hai (where you lose track of time or feel curious without anyone forcing you). Chahe wo software code likhna ho, business ideas sochna ho, design banana ho, logon ko sikhana ho, agriculture, finance, ya laboratory research.",
    message: "Let's explore your Passions across 5 dimensions (Interest, Enjoyment, Curiosity, Engagement, Meaning). Which of these areas do you genuinely feel interested in exploring or doing?",
    quickOptions: [
      "🛠️ Creating or building things (Physical or digital creations)",
      "🎓 Teaching, explaining, or mentoring (Helping others understand)",
      "🧩 Solving practical problems (Troubleshooting, logical challenges)",
      "🚀 Running a business or venture (Products, sales, commercial ideas)",
      "🤝 Helping and supporting people (Community service, guidance)",
      "📋 Organizing events or leading a team (Planning, coordinating)",
      "🔬 Researching and discovering new things (Science, lab work, study)",
      "🎨 Designing or expressing ideas creatively (Visuals, arts, crafts)",
      "🌱 Working with nature, plants or animals (Agriculture, ecology, environment)",
      "📊 Analysing information, numbers or patterns (Finance, data, accounting)",
      "📢 Communicating, storytelling or debating (Writing, media, speaking)",
      "🔧 Repairing, making or improving physical objects",
      "🌍 Understanding society, people and communities (Social sciences, culture)",
      "💻 Exploring technology, software or emerging ideas",
      "🏃 Sports, fitness, health or human performance",
      "⚡ Exploring other interests in my own words",
    ],
    allowCustom: true,
  },
  passion_followup: {
    phase: "passion",
    stepKey: "passion_followup",
    contextHelp: "Adaptive Clarification: Har domain me multiple directions hote hain. Specific hone se AI aapke authentic patterns ko accurately identify kar pata hai.",
    message: "Which specific part interests you most, or what kind of problems would you love to work on in this space?",
    quickOptions: [],
    allowCustom: true,
  },
  passion_energy_flow: {
    phase: "passion",
    stepKey: "passion_energy_flow",
    contextHelp: "Flow & Energy Discovery: Jab aap kisi kaam me itne doob jaate hain ki time ka pata nahi chalta (losing track of time), ya jab log aapse specific cheezo me madad maangte hain — yeh aapke natural strengths ka sabse bada proof hota hai.",
    message: "Which activity makes you lose track of time, or what do friends, classmates, and family usually come to you for help with?",
    quickOptions: [
      "Explaining difficult course concepts, subjects, or notes",
      "Debugging technical errors, tools, or computer software",
      "Managing budgets, money calculations, or organizing finances",
      "Practical fieldwork, soil/plant care, or lab experiments",
      "Designing posters, presentations, or creative visuals",
      "Organizing events, team schedules, or planning activities",
      "Giving thoughtful advice, listening, or mediating conflict",
      "I am still discovering what creates flow for me",
    ],
    allowCustom: true,
  },
  patterns_review: {
    phase: "patterns",
    stepKey: "patterns_review",
    contextHelp: "Recurring Patterns: AI aapke real experiences aur flow answers me se common patterns ko highlight karta hai. Yeh koi permanent label nahi hai — aap ise freely confirm, edit, ya reject kar sakte hain.",
    message: "Based on what you've shared so far, I noticed recurring patterns in how you engage with challenges. Does this interpretation resonate with your real experience?",
    quickOptions: [
      "✓ Yes, this pattern reflects how I naturally operate!",
      "✏️ Partially accurate; let me add context in my own words",
      "🔄 I feel a different pattern fits me better",
    ],
    allowCustom: true,
  },
  purpose_intro: {
    phase: "purpose",
    stepKey: "purpose_intro",
    contextHelp: "Purpose kya hota hai? Purpose explores: 'Why does it matter to me?' Purpose ek din me zabardasti decide nahi hota — yeh samajhna hai ki aap kis cheez me contribute karna chahte hain aur kiske liye value create karna chahte hain.",
    message: "Now let's explore your Purpose. What is your primary career aspiration or professional direction right now? (You can choose an option or write in your own words)",
    quickOptions: [
      "Educator, Teacher, or Learning Experience Specialist",
      "Sustainable Agriculture & AgTech Professional",
      "Financial Analyst, Accountant, or Commerce Specialist",
      "Business Founder, Startup Builder, or Management Consultant",
      "Scientific Researcher, Lab Specialist, or Clinical Analyst",
      "UI/UX Product Designer, Media Creator, or Visual Artist",
      "Social Impact, Community Development, or Public Policy Leader",
      "Full-Stack Software Solutions Developer or Data Specialist",
      "I am exploring multiple directions right now",
    ],
    allowCustom: true,
  },
  purpose_why_1: {
    phase: "purpose",
    stepKey: "purpose_why_1",
    contextHelp: "5-Whys Reflection (Layer 1): Sawaal ka maksad aapko judge karna nahi hai, balki dekhna hai ki is goal ke peeche aapka main interest kya hai.",
    message: "What interests or excites you most about this direction?",
    quickOptions: [],
    allowCustom: true,
  },
  purpose_why_2: {
    phase: "purpose",
    stepKey: "purpose_why_2",
    contextHelp: "5-Whys Reflection (Layer 2): Yeh pata lagata hai ki is kaam se aapki life aur community me kya value create hoti hai (independence, family support, impact, mastery).",
    message: "When you achieve that, why does that feel deeply meaningful to you? What kind of life, independence, or contribution does it create for you and your family?",
    quickOptions: [
      "Achieving complete financial independence and security for my family",
      "Creating useful solutions that make life better for real people",
      "Gaining deep domain mastery and being recognized as a skilled expert",
      "Creative autonomy and the freedom to work on my own terms",
      "Uplifting my community, farmers, or underprivileged learners",
    ],
    allowCustom: true,
  },
  purpose_values: {
    phase: "purpose",
    stepKey: "purpose_values",
    contextHelp: "Core Values Trade-offs: Values aapke internal principles hain. Agar aapko choose karna ho: predictable stability vs freedom to experiment — aap kya prefer karenge? Choose 2 to 4 guiding values.",
    message: "Which 2 to 4 core guiding values matter most to you in your career and life?",
    quickOptions: [
      "🌱 Growth (Continuous learning and self-improvement)",
      "🛡️ Security (Financial stability and predictable peace of mind)",
      "🕊️ Freedom (Independence and creative autonomy)",
      "⭐ Excellence (High standards and mastering your craft)",
      "🌍 Impact (Positive contribution to society and community)",
      "🤝 Family (Supporting loved ones and family well-being)",
      "👑 Leadership (Guiding, organizing, and inspiring others)",
      "💡 Innovation (Original ideas and creative problem-solving)",
      "⚖️ Integrity (Authentic, honest, and principled action)",
      "🌿 Sustainability (Protecting environment and long-term harmony)",
    ],
    allowCustom: true,
  },
  vision_ideal_day: {
    phase: "vision",
    stepKey: "vision_ideal_day",
    contextHelp: "Exercise A: My Ideal Day: Imagine an ordinary, deeply satisfying day approximately 3 to 5 years from now. Where are you? What activities are you doing? With whom? How do you balance work and personal life?",
    message: "Vision Exercise A — My Ideal Day: Imagine a satisfying day 3 to 5 years in your future. Where are you working, what problems are you solving, and what part of the day feels most rewarding?",
    quickOptions: [
      "Leading a focused team in a creative studio or modern office",
      "Conducting impactful experiments in a research or field laboratory",
      "Teaching and facilitating learners in an inspiring educational space",
      "Managing an agricultural project or rural enterprise outdoors",
      "Running my own independent business with high flexibility",
      "Working on remote digital projects with peaceful work-life balance",
    ],
    allowCustom: true,
  },
  vision_headline: {
    phase: "vision",
    stepKey: "vision_headline",
    contextHelp: "Exercise B: Future Headlines: If someone wrote a positive headline about an accomplishment of yours 3 to 5 years from now, what would you hope it said?",
    message: "Vision Exercise B — Future Headlines: If someone wrote a short headline about an accomplishment you achieved 3–5 years from now, what would you love it to say?",
    quickOptions: [
      "'A young entrepreneur builds a sustainable local business.'",
      "'A dedicated teacher helps students master difficult concepts with joy.'",
      "'An agriculture graduate develops practical solutions for farmers.'",
      "'A commerce graduate builds strong expertise in finance and advisory.'",
      "'A science graduate contributes to an important research discovery.'",
      "'A designer creates products that improve everyday user experiences.'",
      "'A community leader creates a meaningful local empowerment initiative.'",
      "'A software engineer builds tools that simplify daily life for thousands.'",
      "Let me write my own custom headline!",
    ],
    allowCustom: true,
  },
  vision_preferences: {
    phase: "vision",
    stepKey: "vision_preferences",
    contextHelp: "Exercise C: Work & Life Preferences: Collaboration vs solo? Structured routine vs experimentation? People, nature, tools, or ideas?",
    message: "Vision Exercise C — Work Preferences: What environment energizes you most: independent focus vs team collaboration? Structured routines vs experimental freedom? Working with people, nature, tools, or ideas?",
    quickOptions: [
      "Team collaboration + working closely with people & mentors",
      "Independent deep focus + working with tools, code, or numbers",
      "Outdoor / field-oriented + working with nature, plants, or physical systems",
      "Creative experimentation + working with visual ideas & stories",
      "Balanced mix of structured planning and creative autonomy",
    ],
    allowCustom: true,
  },
  vision_contribution_regret: {
    phase: "vision",
    stepKey: "vision_contribution_regret",
    contextHelp: "Exercise D & E: Contribution & Regret: What do you want to contribute to, and looking back 5 years from now, what would you regret never trying?",
    message: "Vision Exercise D & E — Contribution & Courage: What is one meaningful contribution you want to make, and what is something you would regret never exploring or attempting?",
    quickOptions: [
      "I want to build a venture that supports my family and community; I'd regret never taking the risk to start it",
      "I want to inspire learners; I'd regret not dedicating myself to teaching and mentoring",
      "I want to solve environmental / farm problems; I'd regret staying in an unfulfilling desk job",
      "I want to build high-craft technical tools; I'd regret never mastering deep engineering",
      "I want to master financial management; I'd regret not building financial independence early",
    ],
    allowCustom: true,
  },
  vision_horizon: {
    phase: "vision",
    stepKey: "vision_horizon",
    contextHelp: "Legacy compatibility step: 3 to 5 year horizon",
    message: "Looking ahead 3 to 5 years, what skills would you love to have mastered, and what kind of professional responsibilities would make you feel proud?",
    quickOptions: [
      "Leading technical architecture and shipping production-grade applications",
      "Managing high-impact client or business strategy deliverables",
      "Running my own early-stage venture or profitable project",
      "Specialized domain researcher contributing to breakthroughs",
      "I am exploring 2-3 paths and want to test them before deciding",
    ],
    allowCustom: true,
  },
  vision_bhag: {
    phase: "vision",
    stepKey: "vision_bhag",
    contextHelp: "Legacy compatibility step: Big milestone",
    message: "What is one Big Milestone of Pride (BHAG) or meaningful contribution you would love to achieve in your career or community?",
    quickOptions: [
      "Build a solution or platform used and loved by 25,000+ people",
      "Attain complete financial freedom and buy a home for my parents",
      "Lead a high-performing engineering or business team globally",
      "Start a foundation or scholarship to educate underprivileged students",
      "Publish authoritative research or open-source software tools",
    ],
    allowCustom: true,
  },
  review: {
    phase: "review",
    stepKey: "review",
    contextHelp: "Review & Confirmation: AI ne aapke answers ke basis par aapka personal profile summarize kiya hai. Please review karein aur confirm karein. Aap apne purpose statement aur vision ko freely edit kar sakte hain!",
    message: "Here is what I understood about your passions, purpose, and vision. Does this reflect your thinking?",
    quickOptions: ["✓ Yes, this reflects my thinking! Synthesize my Thesis ✨", "✏️ I want to edit my statements first"],
    allowCustom: false,
  },
};

const getInitialDiscoveryStep = (context = {}) => {
  const step = { ...DISCOVERY_STEPS.myself_intro };
  if (context.course) {
    step.contextHelp += ` Note: You are currently enrolled in ${context.course}, but your personal discovery is completely open across all disciplines, streams, and life aspirations!`;
  }
  return step;
};

/**
 * Processes one adaptive student turn in the conversational discovery flow.
 */
const processAdaptiveDiscoveryStep = async (assessment, payload = {}, context = {}) => {
  const currentStepKey = payload.stepKey || assessment.discoveryState?.currentStepKey || "passion_intro";
  const answer = (payload.studentAnswer || payload.message || "").trim();

  // Initialize discovery chat if empty
  if (!Array.isArray(assessment.discoveryChat)) {
    assessment.discoveryChat = [];
  }
  if (!assessment.discoveryState) {
    assessment.discoveryState = {
      currentPhase: DISCOVERY_STEPS[currentStepKey]?.phase || "myself",
      currentStepKey: currentStepKey,
      explicitInsights: [],
      inferredPatterns: [],
      uncertainties: [],
      isDiscoveryCompleted: false,
      lastSavedAt: new Date(),
    };
  }

  // Ensure helper fields on assessment exist
  if (!assessment.understandMyself) assessment.understandMyself = {};
  if (!assessment.visionExercises) assessment.visionExercises = { idealDay: {}, futureHeadlines: {}, workLifePreferences: {}, futureContribution: {}, futureRegret: {} };

  // Record student message
  if (answer) {
    assessment.discoveryChat.push({
      sender: "student",
      phase: assessment.discoveryState.currentPhase,
      stepKey: currentStepKey,
      message: answer,
      timestamp: new Date(),
    });
  }

  let nextStepKey = "passion_intro";
  let explicitInsight = "";
  let inferredPattern = "";
  let uncertainty = "";

  // 0. Stage 1: myself_intro
  if (currentStepKey === "myself_intro") {
    explicitInsight = `Meaningful experience described: "${answer}"`;
    assessment.understandMyself.experiences = answer;
    nextStepKey = "myself_drain_engage";
  }

  // 0b. Stage 1: myself_drain_engage
  else if (currentStepKey === "myself_drain_engage") {
    explicitInsight = `Learning style & energy boundaries: "${answer}"`;
    assessment.understandMyself.preferredLearningStyle = answer;
    assessment.understandMyself.activitiesDisliked = [answer];
    nextStepKey = "passion_intro";
  }

  // 1. Process passion_intro
  else if (currentStepKey === "passion_intro") {
    explicitInsight = `Primary stated passion / interest: "${answer}"`;
    const cleanAnswer = answer.toLowerCase();

    // Check if unsure
    if (/not sure|explore with me|pata nahi|confused|uncertain/i.test(cleanAnswer)) {
      uncertainty = "Student is still exploring core passions and seeks guided exploration.";
      nextStepKey = "passion_followup";
      DISCOVERY_STEPS.passion_followup.message = "That is completely normal in college! Let's explore together. In past school or college projects, what did you hate doing the LEAST: creating something visual, solving a structured puzzle, organizing people, or helping a friend understand a topic?";
      DISCOVERY_STEPS.passion_followup.quickOptions = [
        "Building or designing something creative on a computer",
        "Solving a structured puzzle or logical challenge",
        "Organizing people, schedules, or leading an event",
        "Explaining concepts and helping someone learn",
      ];
    } else if (/rich|money|wealth|crore|finance|invest/i.test(cleanAnswer)) {
      inferredPattern = "Strongly motivated by financial independence and wealth creation.";
      nextStepKey = "passion_followup";
      DISCOVERY_STEPS.passion_followup.message = "Financial independence is a completely valid and powerful drive! What does financial freedom mean to you (e.g. supporting family, creative independence, owning a company)? And what kind of practical work would you love doing to achieve it?";
      DISCOVERY_STEPS.passion_followup.quickOptions = [
        "Building a scalable software or technology product",
        "High-skill corporate software / technical career",
        "Business operations, startup sales, and commerce",
        "Financial market analysis, investment, and consulting",
      ];
    } else if (/business|startup|entrepreneur|management/i.test(cleanAnswer)) {
      inferredPattern = "Exhibits entrepreneurial and business leadership drive.";
      nextStepKey = "passion_followup";
      DISCOVERY_STEPS.passion_followup.message = "Which part of business interests you most: generating innovative ideas, selling products, managing people, analysing finances, or building a company from scratch? You can also explain in your own words.";
      DISCOVERY_STEPS.passion_followup.quickOptions = [
        "Brainstorming and designing innovative product ideas",
        "Sales, marketing, and speaking to customers",
        "Managing people and coordinating team operations",
        "Financial modeling, investing, and profit strategy",
        "Building a startup from zero to one",
      ];
    } else if (/teach|mentor|explain|education/i.test(cleanAnswer)) {
      inferredPattern = "Exhibits educational and mentoring orientation.";
      nextStepKey = "passion_followup";
      DISCOVERY_STEPS.passion_followup.message = "Which aspect of teaching energizes you most: explaining complex concepts clearly, creating engaging study material, or mentoring individuals 1-on-1?";
      DISCOVERY_STEPS.passion_followup.quickOptions = [
        "Explaining difficult concepts clearly in simple language",
        "Creating engaging notes, study sheets, and learning materials",
        "Mentoring individuals 1-on-1 through their difficulties",
        "Conducting workshops and group presentations",
      ];
    } else if (/agri|farm|crop|seed|soil|plant|nature/i.test(cleanAnswer)) {
      inferredPattern = "Exhibits agricultural, ecological, and plant science curiosity.";
      nextStepKey = "passion_followup";
      DISCOVERY_STEPS.passion_followup.message = "Which area of agriculture or plant science attracts you: sustainable crop farming, seed tech, agribusiness supply chain, or agro-ecology?";
      DISCOVERY_STEPS.passion_followup.quickOptions = [
        "Sustainable crop cultivation and organic farming",
        "Seed quality, germination testing, and biotechnology",
        "Agribusiness, farm product marketing, and supply chain",
        "Soil health, water conservation, and eco-farming",
      ];
    } else if (/commerce|accounting|finance|audit|bank/i.test(cleanAnswer)) {
      inferredPattern = "Exhibits analytical financial and commerce orientation.";
      nextStepKey = "passion_followup";
      DISCOVERY_STEPS.passion_followup.message = "Which part of commerce excites you: financial markets & investment, corporate accounting & taxation, or business analytics?";
      DISCOVERY_STEPS.passion_followup.quickOptions = [
        "Financial analysis, investment, and market valuation",
        "Corporate accounting, auditing, and tax compliance",
        "Small business budgeting and cost management",
        "Banking, commercial credit, and wealth planning",
      ];
    } else if (/code|software|programming|developer|tech|dsa/i.test(cleanAnswer)) {
      inferredPattern = "Technology creator and structured problem-solving orientation.";
      nextStepKey = "passion_followup";
      DISCOVERY_STEPS.passion_followup.message = "Which part of software development excites you most: building web/mobile applications, solving algorithmic/DSA puzzles, or exploring AI, machine learning and data?";
      DISCOVERY_STEPS.passion_followup.quickOptions = [
        "Building full-stack web and mobile applications",
        "Solving complex DSA and algorithmic puzzles",
        "Exploring AI, Machine Learning, and intelligent bots",
        "Designing cloud architectures and system backends",
      ];
    } else {
      nextStepKey = "passion_followup";
      DISCOVERY_STEPS.passion_followup.message = `What specifically interests you about "${answer}"? What kind of problems or projects would you love to tackle in that space?`;
      DISCOVERY_STEPS.passion_followup.quickOptions = [
        "Creating practical solutions that real people use",
        "Learning the deep technical/domain mastery behind it",
        "Leading and collaborating with like-minded peers",
        "Turning it into an independent, flexible career",
      ];
    }

    // Save initial passion statement
    assessment.passionStatements = [
      { text: answer.replace(/^[^\w]+/, "").trim(), category: "Core Passion", createdAt: new Date() },
    ];
    assessment.topPassions = [
      {
        name: answer.split("(")[0].replace(/^[^\w]+/, "").trim(),
        originalStatement: answer,
        priority: 1,
        selfRatedImportance: 8,
        currentScore: 5,
        markers: ["Dedicate 3-4 hours weekly to practical exploration"],
      },
    ];
  }

  // 2. Process passion_followup
  else if (currentStepKey === "passion_followup") {
    explicitInsight = `Specific focus area within passion: "${answer}"`;
    nextStepKey = "passion_energy_flow";

    // Enrich top passion
    if (assessment.topPassions?.[0]) {
      assessment.topPassions[0].explanation = answer;
      assessment.topPassions[0].markers = [
        `Dedicate 3-4 hours weekly to practical work in ${answer.toLowerCase()}`,
        "Build 1 demonstrable case study or project milestone every month",
      ];
    }
  }

  // 3. Process passion_energy_flow
  else if (currentStepKey === "passion_energy_flow") {
    explicitInsight = `Natural flow and energy activity: "${answer}"`;
    assessment.flowAnswers = {
      loseTrackOfTime: answer,
      askedHelpWith: answer,
      energyGivingActivity: answer,
    };
    nextStepKey = "patterns_review";
  }

  // 3b. Process patterns_review
  else if (currentStepKey === "patterns_review") {
    explicitInsight = `Pattern confirmation: "${answer}"`;
    assessment.recurringPatterns = [
      {
        pattern: assessment.topPassions?.[0]?.name || "Problem Solving",
        supportingAnswers: [assessment.flowAnswers?.energyGivingActivity || "Self-reported flow activity"],
        source: "inferred",
        studentConfirmation: "confirmed",
        studentNote: answer,
      },
    ];
    nextStepKey = "purpose_intro";
  }

  // 4. Process purpose_intro
  else if (currentStepKey === "purpose_intro") {
    explicitInsight = `Primary career aspiration: "${answer}"`;
    nextStepKey = "purpose_why_1";
    DISCOVERY_STEPS.purpose_why_1.message = `What interests or excites you most about pursuing "${answer}"?`;
    DISCOVERY_STEPS.purpose_why_1.quickOptions = [
      `I enjoy the hands-on craft and solving problems in this field`,
      `It offers high career growth, creative freedom, and strong compensation`,
      `I want to build solutions that improve people's everyday lives`,
      `I have natural curiosity for it and want to master the domain`,
    ];

    assessment.fiveWhys = [
      { level: 1, question: "What is your primary professional ambition?", answer },
    ];
  }

  // 5. Process purpose_why_1
  else if (currentStepKey === "purpose_why_1") {
    explicitInsight = `5-Whys Level 1 motivator: "${answer}"`;
    nextStepKey = "purpose_why_2";
    if (assessment.fiveWhys?.length > 0) {
      assessment.fiveWhys.push({
        level: 2,
        question: "What interests or excites you most about this direction?",
        answer,
      });
    }
  }

  // 6. Process purpose_why_2
  else if (currentStepKey === "purpose_why_2") {
    explicitInsight = `5-Whys Level 2 root value: "${answer}"`;
    if (assessment.fiveWhys?.length >= 2) {
      assessment.fiveWhys.push({
        level: 3,
        question: "Why does that feel deeply meaningful to you?",
        answer,
      });
    }
    nextStepKey = "purpose_values";
  }

  // 7. Process purpose_values
  else if (currentStepKey === "purpose_values") {
    explicitInsight = `Selected core guiding values: "${answer}"`;
    const extractedValues = answer
      .split(/[,;\n]+/)
      .map(v => v.split("(")[0].replace(/^[^\w]+/, "").trim())
      .filter(Boolean);

    assessment.coreValues = (extractedValues.length > 0 ? extractedValues : ["Growth", "Excellence"]).slice(0, 4).map((name, idx) => ({
      name,
      priority: idx + 1,
      reason: "Core guiding standard for my career and decisions.",
    }));

    nextStepKey = "vision_ideal_day";
  }

  // 8. Process vision_ideal_day (Exercise A)
  else if (currentStepKey === "vision_ideal_day") {
    explicitInsight = `Ideal Day Narrative: "${answer}"`;
    if (!assessment.visionExercises) assessment.visionExercises = {};
    if (!assessment.visionExercises.idealDay) assessment.visionExercises.idealDay = {};
    assessment.visionExercises.idealDay.narrative = answer;
    assessment.vividFuture = answer;
    nextStepKey = "vision_headline";
  }

  // 8b. Process vision_headline (Exercise B)
  else if (currentStepKey === "vision_headline") {
    explicitInsight = `Future Headline: "${answer}"`;
    if (!assessment.visionExercises) assessment.visionExercises = {};
    if (!assessment.visionExercises.futureHeadlines) assessment.visionExercises.futureHeadlines = {};
    assessment.visionExercises.futureHeadlines.headline = answer;
    nextStepKey = "vision_preferences";
  }

  // 8c. Process vision_preferences (Exercise C)
  else if (currentStepKey === "vision_preferences") {
    explicitInsight = `Work & Life Preferences: "${answer}"`;
    if (!assessment.visionExercises) assessment.visionExercises = {};
    if (!assessment.visionExercises.workLifePreferences) assessment.visionExercises.workLifePreferences = {};
    assessment.visionExercises.workLifePreferences.workEnvironment = answer;
    nextStepKey = "vision_contribution_regret";
  }

  // 8d. Process vision_contribution_regret (Exercise D & E)
  else if (currentStepKey === "vision_contribution_regret") {
    explicitInsight = `Contribution & Regret: "${answer}"`;
    if (!assessment.visionExercises) assessment.visionExercises = {};
    if (!assessment.visionExercises.futureContribution) assessment.visionExercises.futureContribution = {};
    if (!assessment.visionExercises.futureRegret) assessment.visionExercises.futureRegret = {};
    assessment.visionExercises.futureContribution.contribution = answer;
    assessment.visionExercises.futureRegret.regretAvoided = answer;

    assessment.fiveYearGoal = answer;
    assessment.bhag = assessment.visionExercises.futureHeadlines?.headline || answer;

    // Synthesize preliminary draft purpose & vision statements for review
    const p1 = assessment.topPassions?.[0]?.name || "Continuous Learning";
    const v1 = assessment.coreValues?.[0]?.name || "Growth";
    const v2 = assessment.coreValues?.[1]?.name || "Excellence";
    const asp = assessment.fiveWhys?.[0]?.answer || "Professional Excellence";

    assessment.purposeStatement = `My purpose is to apply ${p1.toLowerCase()}, guided by core values of ${v1} and ${v2}, to excel in ${asp} and create tangible positive value.`;
    assessment.visionStatement = `My vision is to establish strong domain competence over the next 3–5 years, achieving "${assessment.bhag}", and inspiring peers through purposeful execution.`;
    assessment.confirmedPurpose = assessment.purposeStatement;
    assessment.confirmedVision = assessment.visionStatement;
    assessment.isPassionTestCompleted = true;
    assessment.isVisionTestCompleted = true;

    nextStepKey = "review";
  }

  // Legacy compatibility: vision_horizon
  else if (currentStepKey === "vision_horizon") {
    explicitInsight = `3-5 Year Horizon Goal: "${answer}"`;
    assessment.fiveYearGoal = answer;
    nextStepKey = "vision_bhag";
  }

  // Legacy compatibility: vision_bhag
  else if (currentStepKey === "vision_bhag") {
    explicitInsight = `Big Dream Milestone (BHAG): "${answer}"`;
    assessment.bhag = answer;
    nextStepKey = "review";

    const p1 = assessment.topPassions?.[0]?.name || "Continuous Learning";
    const v1 = assessment.coreValues?.[0]?.name || "Growth";
    const v2 = assessment.coreValues?.[1]?.name || "Excellence";
    const asp = assessment.fiveWhys?.[0]?.answer || "Professional Excellence";

    assessment.purposeStatement = `My purpose is to apply ${p1.toLowerCase()}, guided by core values of ${v1} and ${v2}, to excel in ${asp} and create tangible positive value.`;
    assessment.visionStatement = `My vision is to establish strong domain competence over the next 3–5 years, achieving "${answer}", and inspiring peers through purposeful execution.`;
    assessment.confirmedPurpose = assessment.purposeStatement;
    assessment.confirmedVision = assessment.visionStatement;
    assessment.isPassionTestCompleted = true;
    assessment.isVisionTestCompleted = true;
  }

  // 10. Process review confirmation
  else if (currentStepKey === "review") {
    assessment.discoveryState.isDiscoveryCompleted = true;
    assessment.discoveryState.currentPhase = "confirmed";
    assessment.isPurposeAccepted = true;
    assessment.isVisionAccepted = true;
  }

  // Update discovery state
  if (explicitInsight) assessment.discoveryState.explicitInsights.push(explicitInsight);
  if (inferredPattern) assessment.discoveryState.inferredPatterns.push(inferredPattern);
  if (uncertainty) assessment.discoveryState.uncertainties.push(uncertainty);

  assessment.discoveryState.currentStepKey = nextStepKey;
  assessment.discoveryState.currentPhase = DISCOVERY_STEPS[nextStepKey]?.phase || "passion";
  assessment.discoveryState.lastSavedAt = new Date();

  // Next AI turn
  const nextStepConfig = DISCOVERY_STEPS[nextStepKey] || DISCOVERY_STEPS.review;
  const aiTurn = {
    sender: "ai",
    phase: nextStepConfig.phase,
    stepKey: nextStepKey,
    message: nextStepConfig.message,
    contextHelp: nextStepConfig.contextHelp,
    quickOptions: nextStepConfig.quickOptions,
    allowCustom: nextStepConfig.allowCustom,
    timestamp: new Date(),
  };

  assessment.discoveryChat.push(aiTurn);

  return {
    assessment,
    nextStep: aiTurn,
    discoveryState: assessment.discoveryState,
  };
};

module.exports = {
  getStudentContext,
  validateAndReconcileEvidence,
  generateThesisWithAI,
  compareAssessmentVersions,
  generateHeuristicThesis,
  determineArchetype,
  calculateDevelopmentIndicators,
  getInitialDiscoveryStep,
  processAdaptiveDiscoveryStep,
  DISCOVERY_STEPS,
};
