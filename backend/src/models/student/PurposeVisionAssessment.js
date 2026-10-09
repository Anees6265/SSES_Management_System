const mongoose = require("mongoose");

const pairwiseComparisonSchema = new mongoose.Schema({
  statementA: { type: String, required: true },
  statementB: { type: String, required: true },
  selected: { type: String, required: true },
  stepType: { type: String, enum: ["passion", "values"], default: "passion" },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const topPassionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  originalStatement: { type: String, default: "" },
  priority: { type: Number, default: 1 },
  selfRatedImportance: { type: Number, min: 0, max: 10, default: 8 }, // 0-10 Importance
  currentScore: { type: Number, min: 0, max: 10, default: 5 }, // 0-10 Current Expression
  passionGap: { type: Number, default: 3 }, // Importance - Current Score
  gapExplanation: { type: String, default: "" },
  explanation: { type: String, default: "" },
  markers: [{ type: String }],
  evidence: { type: String, default: "" },
  aiInterpretation: { type: String, default: "" },
}, { _id: false });

const coreValueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  priority: { type: Number, required: true },
  reason: { type: String, default: "" },
}, { _id: false });

const fiveWhySchema = new mongoose.Schema({
  level: { type: Number, required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
}, { _id: false });

const careerExperimentSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  duration: { type: String, default: "14 Days" },
  week1: [{ type: String }],
  week2: [{ type: String }],
  reflectionQuestions: [{ type: String }],
  studentReflection: { type: String, default: "" },
  enjoymentRating: { type: Number, min: 0, max: 10, default: 0 },
}, { _id: false });

const careerDirectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  whyItFits: { type: String, default: "" },
  alignmentRationale: { type: String, default: "" },
  supportingEvidence: [{ type: String }],
  currentStrengths: [{ type: String }],
  missingCapabilities: [{ type: String }],
  riskConcern: { type: String, default: "" },
  careerExperiment: { type: careerExperimentSchema, default: () => ({}) },
}, { _id: false });

const mentorFeedbackSchema = new mongoose.Schema({
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  facultyName: { type: String, default: "" },
  facultyRole: { type: String, default: "" },
  comment: { type: String, required: true },
  recommendedActions: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

const facultyInterventionSchema = new mongoose.Schema({
  actionId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  title: { type: String, required: true },
  category: { type: String, default: "Skill Development" }, // Mentorship, Project, Course, Communication, Leadership, DSA, Interview
  status: { type: String, enum: ["Not Started", "In Progress", "Completed"], default: "Not Started" },
  facultyName: { type: String, default: "" },
  notes: { type: String, default: "" },
  updatedAt: { type: Date, default: Date.now },
});

const developmentGapSchema = new mongoose.Schema({
  dimension: { type: String, required: true }, // Technical, Problem Solving, Communication, Leadership, Projects, Interview, Behavioral
  currentLevel: { type: String, default: "" },
  futureRequirement: { type: String, default: "" },
  gapLevel: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
  bridgeAction: { type: String, default: "" },
}, { _id: false });

const purposeVisionAssessmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
    index: true,
  },
  assessmentVersion: {
    type: Number,
    default: 1,
  },
  status: {
    type: String,
    enum: ["draft", "analyzed", "finalized"],
    default: "draft",
  },
  privacyLevel: {
    type: String,
    enum: ["Student Only", "Student + Assigned Mentor", "Student + Faculty", "Admin"],
    default: "Student + Faculty",
  },

  // 1. Passion Statements (10-15 statements starting with "When my life is ideal, I am...")
  passionStatements: [{
    text: { type: String, default: "" },
    category: { type: String, default: "General" },
    createdAt: { type: Date, default: Date.now },
  }],

  // 2. Pairwise Comparison Engine History
  pairwiseComparisons: [pairwiseComparisonSchema],

  // 3. Top 5 Passions with Importance, Current Living & Gap
  topPassions: [topPassionSchema],

  // 4. Core Values (Top 3-5 with explanations)
  coreValues: [coreValueSchema],

  // 5. Purpose Assessment & 5 Whys
  purposeAnswers: [{ type: String }],
  fiveWhys: [fiveWhySchema],
  identifiedThemes: [{ type: String }],

  // 6. Flow & Energy Discovery
  flowAnswers: {
    loseTrackOfTime: { type: String, default: "" },
    unforcedHours: { type: String, default: "" },
    askedHelpWith: { type: String, default: "" },
    unrewardedWork: { type: String, default: "" },
    energyGivingActivity: { type: String, default: "" },
  },

  // 0. Stage 1: Understand Myself
  understandMyself: {
    experiences: { type: String, default: "" }, // Real meaningful experiences described
    activitiesEnjoyed: [{ type: String }],
    activitiesDisliked: [{ type: String }], // Draining activities
    voluntarilyExplored: [{ type: String }],
    preferredLearningStyle: { type: String, default: "" },
    concernsAndUncertainties: [{ type: String }],
    whatToUnderstand: { type: String, default: "" },
  },

  // Stage 3: Recurring Patterns (Explicit vs Inferred with Student Confirmation)
  recurringPatterns: [{
    pattern: { type: String, required: true },
    supportingAnswers: [{ type: String }],
    source: { type: String, enum: ["explicit", "inferred"], default: "inferred" },
    counterExample: { type: String, default: "" },
    studentConfirmation: { type: String, enum: ["confirmed", "edited", "rejected", "uncertain"], default: "confirmed" },
    studentNote: { type: String, default: "" },
  }],

  // Stage 6: Structured Vision Discovery Exercises
  visionExercises: {
    idealDay: {
      type: Object,
      default: () => ({
        where: "",
        activities: "",
        people: "",
        problems: "",
        responsibilities: "",
        environment: "",
        balance: "",
        meaningfulParts: "",
        narrative: "",
      }),
    },
    futureHeadlines: {
      type: Object,
      default: () => ({
        headline: "",
        whyItMatters: "",
      }),
    },
    workLifePreferences: {
      type: Object,
      default: () => ({
        collaboration: "",
        structure: "",
        uncertainty: "",
        practicalVsConceptual: "",
        workFocus: "",
        createVsImprove: "",
        rolePreference: "",
        workEnvironment: "",
      }),
    },
    futureContribution: {
      type: Object,
      default: () => ({
        contribution: "",
        whyItMatters: "",
      }),
    },
    futureRegret: {
      type: Object,
      default: () => ({
        regretAvoided: "",
      }),
    },
    possibleFutures: [{
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      supportingPreferences: [{ type: String }],
      uncertainties: [{ type: String }],
      thirtyDayTrial: { type: String, default: "" },
      studentInterest: { type: String, enum: ["interested", "exploring", "unsuitable"], default: "exploring" },
    }],
  },

  // Practical Experiments (Stage 8)
  practicalExperiments: [{
    title: { type: String, required: true },
    domain: { type: String, default: "General" },
    whatToDo: { type: String, default: "" },
    timeRequired: { type: String, default: "2-4 hours" },
    resourcesRequired: { type: String, default: "" },
    expectedLearning: { type: String, default: "" },
    reflectionPlan: { type: String, default: "" },
    evidenceToCollect: { type: String, default: "" },
    outcomeScope: { type: String, default: "" },
    status: { type: String, enum: ["Planned", "In Progress", "Completed"], default: "Planned" },
  }],

  // Multi-horizon Roadmap
  detailedRoadmap: {
    thirtyDayActions: [{ type: String }],
    ninetyDayRoadmap: [{ type: String }],
    sixMonthGoals: [{ type: String }],
    twelveMonthGoals: [{ type: String }],
    reviewDate: { type: Date },
    revisionPlan: { type: String, default: "" },
  },

  // 7. Vision: Core Ideology & Envisioned Future
  visionAnswers: { type: mongoose.Schema.Types.Mixed, default: {} },
  fiveYearGoal: { type: String, default: "" },
  tenYearGoal: { type: String, default: "" },
  bhag: { type: String, default: "" }, // Big Future Goal
  vividFuture: { type: String, default: "" }, // "My Ideal Future" narrative

  // 8. Statements (AI Draft vs Student Confirmed)
  purposeStatement: { type: String, default: "" }, // AI Draft
  visionStatement: { type: String, default: "" }, // AI Draft
  confirmedPurpose: { type: String, default: "" }, // Student Confirmed & Edited
  confirmedVision: { type: String, default: "" }, // Student Confirmed & Edited
  isPurposeAccepted: { type: Boolean, default: false },
  isVisionAccepted: { type: Boolean, default: false },

  // Interactive AI Discovery Conversation State & History
  discoveryChat: [{
    sender: { type: String, enum: ["ai", "student"], required: true },
    phase: { type: String, default: "passion" },
    stepKey: { type: String, default: "" },
    message: { type: String, required: true },
    contextHelp: { type: String, default: "" }, // Hinglish & simple English explanations
    quickOptions: [{ type: String }],
    allowCustom: { type: Boolean, default: true },
    timestamp: { type: Date, default: Date.now },
  }],

  discoveryState: {
    currentPhase: { type: String, default: "passion" },
    currentStepKey: { type: String, default: "myself_intro" },
    explicitInsights: [{ type: String }],
    inferredPatterns: [{ type: String }],
    uncertainties: [{ type: String }],
    isDiscoveryCompleted: { type: Boolean, default: false },
    lastSavedAt: { type: Date, default: Date.now },
  },

  confirmedCareerDirections: [{
    title: { type: String, required: true },
    interestStatus: { type: String, enum: ["interested", "exploring", "not_interested"], default: "exploring" },
    studentNote: { type: String, default: "" },
  }],

  // Evidence & Data Validation Layer
  evidenceValidation: {
    isValidated: { type: Boolean, default: false },
    taskMetricsVerified: {
      totalTasks: { type: Number, default: null },
      completedTasks: { type: Number, default: null },
      taskCompletionRate: { type: Number, default: null },
      status: { type: String, default: "Verified" },
    },
    attendanceVerified: {
      rate: { type: Number, default: null },
      status: { type: String, default: "Verified" },
    },
    academicVerified: {
      grade: { type: String, default: "" },
      currentLevel: { type: String, default: "" },
    },
    dataGaps: [{ type: String }],
    dataConfidenceNote: { type: String, default: "" },
  },

  // Transparent Mentoring Development Indicators (Documented formulas, ranges, inputs)
  developmentIndicators: {
    passionClarity: { score: { type: Number, default: 0 }, rationale: { type: String, default: "" }, method: { type: String, default: "" }, confidence: { type: String, default: "" } },
    purposeClarity: { score: { type: Number, default: 0 }, rationale: { type: String, default: "" }, method: { type: String, default: "" }, confidence: { type: String, default: "" } },
    visionClarity: { score: { type: Number, default: 0 }, rationale: { type: String, default: "" }, method: { type: String, default: "" }, confidence: { type: String, default: "" } },
    skillAlignment: { score: { type: Number, default: 0 }, rationale: { type: String, default: "" }, method: { type: String, default: "" }, confidence: { type: String, default: "" } },
    goalAlignment: { score: { type: Number, default: 0 }, rationale: { type: String, default: "" }, method: { type: String, default: "" }, confidence: { type: String, default: "" } },
    overallIndex: { score: { type: Number, default: 0 }, rationale: { type: String, default: "" }, method: { type: String, default: "" }, confidence: { type: String, default: "" } },
    disclaimer: {
      type: String,
      default: "These indicators are developmental mentoring guidance signals, not standardized psychological tests or job guarantees.",
    },
  },

  // 9. AI Archetype
  archetype: {
    primaryPattern: { type: String, default: "" },
    secondaryPattern: { type: String, default: "" },
    description: { type: String, default: "" },
    disclaimer: {
      type: String,
      default: "This is an AI-generated development pattern, not a psychological diagnosis or permanent personality type.",
    },
  },

  // 10. AI Scores & Alignment Breakdown (0-100)
  alignmentScores: {
    passionClarity: { type: Number, default: 0 },
    purposeClarity: { type: Number, default: 0 },
    visionClarity: { type: Number, default: 0 },
    careerAlignment: { type: Number, default: 0 },
    skillAlignment: { type: Number, default: 0 },
    goalAlignment: { type: Number, default: 0 },
    executionReadiness: { type: Number, default: 0 },
    executionAlignment: { type: Number, default: 0 },
    overall: { type: Number, default: 0 },
  },

  // 11. Current Self vs Future Self & Detailed Analysis
  aiAnalysis: {
    summary: { type: String, default: "" },
    currentVsFuture: {
      currentSelf: { type: mongoose.Schema.Types.Mixed, default: {} },
      futureRequirement: { type: mongoose.Schema.Types.Mixed, default: {} },
      developmentGaps: [{ type: String }],
    },
    passionVsPerformance: {
      strongAlignments: [{ type: String }],
      developmentRequired: [{ type: String }],
    },
    scoreRationales: { type: mongoose.Schema.Types.Mixed, default: {} },
  },

  // 12. Evidence-based Strengths & Development Areas
  strengths: [{ type: String }],
  evidenceBasedStrengths: {
    selfReported: [{ type: String }],
    evidenceBacked: [{
      capability: { type: String },
      evidenceScore: { type: String },
      rationale: { type: String },
    }],
  },
  developmentAreas: [{ type: String }],
  skillGaps: [{ type: String }],
  structuredDevelopmentGaps: [developmentGapSchema],

  // 13. Career Directions & Career Experiments
  careerDirections: [careerDirectionSchema],
  recommendations: [{ type: String }],

  // 14. Multi-horizon Roadmap
  roadmap: {
    threeMonths: [{ type: String }],
    sixMonths: [{ type: String }],
    twelveMonths: [{ type: String }],
  },

  // 15. Student Commitment & Reflection
  studentCommitment: { type: String, default: "" }, // "What is the one thing you commit to doing next?"
  studentReflection: { type: String, default: "" }, // "What did I learn about myself?"

  facultyFeedback: [mentorFeedbackSchema],
  facultyInterventions: [facultyInterventionSchema],
  evolutionNotes: { type: String, default: "" },

  // Test completion flags
  isPassionTestCompleted: { type: Boolean, default: false },
  isVisionTestCompleted: { type: Boolean, default: false },
}, { timestamps: true });

purposeVisionAssessmentSchema.index({ studentId: 1, assessmentVersion: -1 });

module.exports = mongoose.model("PurposeVisionAssessment", purposeVisionAssessmentSchema);
