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

  // 7. Vision: Core Ideology & Envisioned Future
  visionAnswers: { type: mongoose.Schema.Types.Mixed, default: {} },
  fiveYearGoal: { type: String, default: "" },
  tenYearGoal: { type: String, default: "" },
  bhag: { type: String, default: "" }, // Big Future Goal
  vividFuture: { type: String, default: "" }, // "My Ideal Future" narrative

  // 8. Statements
  purposeStatement: { type: String, default: "" },
  visionStatement: { type: String, default: "" },
  isPurposeAccepted: { type: Boolean, default: false },
  isVisionAccepted: { type: Boolean, default: false },

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
