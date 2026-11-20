const mongoose = require("mongoose");

const coreValueItemSchema = new mongoose.Schema(
  {
    principle: { type: String, required: true, trim: true },
    definition: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const deliverableItemSchema = new mongoose.Schema(
  {
    category: { type: String, default: "", trim: true },
    details: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const visionBlueprintReportSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    onePagerImageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    onePagerFileType: {
      type: String,
      default: "image", // image | pdf | docx | doc
      trim: true,
    },
    onePagerOriginalName: {
      type: String,
      default: "",
      trim: true,
    },
    extractedBlueprint: {
      studentName: { type: String, default: "", trim: true },
      academicYear: { type: String, default: "", trim: true },
      targetSector: { type: String, default: "", trim: true },
      primaryDomain: { type: String, default: "", trim: true },
      coreValues: { type: [coreValueItemSchema], default: [] },
      corePurpose: { type: String, default: "", trim: true },
      threeYearGoal: { type: String, default: "", trim: true },
      fiveYearGoal: { type: String, default: "", trim: true },
      tenYearGoal: { type: String, default: "", trim: true },
      vividDescriptionOfSuccess: { type: String, default: "", trim: true },
      ninetyDayDeliverables: { type: [deliverableItemSchema], default: [] },
    },
    aiReport: {
      executiveSummary: { type: String, default: "" },
      corePurposeAlignment: {
        purposeAnalysis: { type: String, default: "" },
        emotionalAndPsychologicalAnchor: { type: String, default: "" },
        connectionToLongTermBHAG: { type: String, default: "" },
      },
      coreValuesPlaybook: [
        {
          value: { type: String, default: "" },
          alignmentWithGoals: { type: String, default: "" },
          dailyBehavioralCode: { type: String, default: "" },
          academicAndProjectExecution: { type: String, default: "" },
          riskIfCompromised: { type: String, default: "" },
          resilienceProtocol: { type: String, default: "" },
        },
      ],
      multiStageRoadmap: {
        phase1_ThreeYearCapability: {
          focus: { type: String, default: "" },
          howValuesDriveThis: { type: String, default: "" },
          criticalMilestones: { type: [String], default: [] },
          dailyHabits: { type: [String], default: [] },
          measurableKPIS: { type: [String], default: [] },
        },
        phase2_FiveYearGrowth: {
          focus: { type: String, default: "" },
          packageTarget: { type: String, default: "" },
          howValuesDriveThis: { type: String, default: "" },
          criticalMilestones: { type: [String], default: [] },
          careerPositioningStrategy: { type: String, default: "" },
          measurableKPIS: { type: [String], default: [] },
        },
        phase3_TenYearLegacy: {
          focus: { type: String, default: "" },
          packageTarget: { type: String, default: "" },
          legacyImpact: { type: String, default: "" },
          howValuesDriveThis: { type: String, default: "" },
          leadershipMaturity: { type: String, default: "" },
          measurableKPIS: { type: [String], default: [] },
        },
      },
      ninetyDayActionSprint: [
        {
          deliverable: { type: String, default: "" },
          category: { type: String, default: "" },
          weeks: { type: String, default: "" },
          concreteMilestones: { type: [String], default: [] },
          coreValuesApplied: { type: String, default: "" },
          evidenceOfCompletion: { type: String, default: "" },
        },
      ],
      potentialObstaclesAndCountermeasures: [
        {
          challenge: { type: String, default: "" },
          underlyingRootCause: { type: String, default: "" },
          countermeasureDrivenByValues: { type: String, default: "" },
        },
      ],
      mentorReviewChecklist: [
        {
          checkpoint: { type: String, default: "" },
          questionForStudent: { type: String, default: "" },
          expectedEvidence: { type: String, default: "" },
        },
      ],
    },
    status: {
      type: String,
      enum: ["draft", "generating", "completed", "failed"],
      default: "completed",
    },
    version: {
      type: Number,
      default: 1,
    },
    modelUsed: {
      type: String,
      default: "gemini-3.5-flash",
    },
    lastGeneratedAt: {
      type: Date,
      default: Date.now,
    },
    generatedBy: {
      type: String,
      default: "AI Career Leadership Engine (Gemini)",
    },
  },
  {
    timestamps: true,
  }
);

visionBlueprintReportSchema.index({ studentId: 1, createdAt: -1 });

module.exports = mongoose.model("VisionBlueprintReport", visionBlueprintReportSchema);
