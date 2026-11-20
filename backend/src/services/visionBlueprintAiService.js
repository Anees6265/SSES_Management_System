const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
const mammoth = require("mammoth");

/**
 * Service to extract Blueprint details from uploaded one-pager documents
 * (Images, PDF, Word DOCX/DOC) and generate executive-grade Strategic Vision
 * Alignment Reports using Google Gemini.
 */

const getGeminiClient = () => {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in backend environment variables.");
  }
  return new GoogleGenerativeAI(apiKey);
};

const EXTRACTION_SCHEMA_PROMPT = `
Return strict JSON matching this exact schema:
{
  "studentName": string,
  "academicYear": string,
  "targetSector": string,
  "primaryDomain": string,
  "coreValues": [
    {
      "principle": string,
      "definition": string
    }
  ],
  "corePurpose": string,
  "threeYearGoal": string,
  "fiveYearGoal": string,
  "tenYearGoal": string,
  "vividDescriptionOfSuccess": string,
  "ninetyDayDeliverables": [
    {
      "category": string,
      "details": string
    }
  ]
}

Instructions:
- Transcribe text accurately without dropping any core value or deliverable.
- Extract all bullet points and principle names (e.g. INTEGRITY, RELIABILITY, CURIOSITY, RESILIENCE, LEADERSHIP).
- Ensure package amounts (e.g. ₹15 LPA, ₹25 LPA), domains, and 90-day deliverables are fully retained.`;

/**
 * 1. Extract structured blueprint data from an uploaded Document (Image, PDF, DOCX, DOC)
 */
async function extractBlueprintFromDocument(fileBuffer, mimeType = "image/jpeg", filename = "blueprint.jpg") {
  const genAI = getGeminiClient();
  const ext = path.extname(filename || "").toLowerCase().replace(/^\./, "");
  const isDocx = ext === "docx" || ext === "doc" || mimeType.includes("word") || mimeType.includes("officedocument");
  const isPdf = ext === "pdf" || mimeType.includes("pdf");

  const modelsToTry = ["gemini-3.5-flash", "gemini-3.5-flash-lite"];
  let lastError = null;

  // Case A: Word Document (.docx / .doc)
  if (isDocx) {
    let extractedText = "";
    try {
      const mammothResult = await mammoth.extractRawText({ buffer: fileBuffer });
      extractedText = mammothResult.value || "";
    } catch (docErr) {
      console.warn("[visionBlueprintAiService] Mammoth raw text extraction error:", docErr.message);
      // Fallback: try utf-8 string if plain text
      extractedText = fileBuffer.toString("utf8");
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("Unable to extract readable text from the uploaded Word document.");
    }

    const textPrompt = `You are an expert academic career document analyst.
Extract all structured information from the following student's "MY PERSONAL VISION BLUEPRINT" / Academic & Career Leadership One-Pager document text with 100% precision.

DOCUMENT TEXT:
${extractedText}

${EXTRACTION_SCHEMA_PROMPT}`;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });
        const result = await model.generateContent(textPrompt);
        return JSON.parse(result.response.text());
      } catch (err) {
        lastError = err;
      }
    }
    throw new Error(`Failed to extract blueprint from Word document: ${lastError?.message || "Unknown error"}`);
  }

  // Case B: PDF or Image (Passed directly to Gemini Vision/Multimodal)
  const base64Data = fileBuffer.toString("base64");
  const effectiveMimeType = isPdf ? "application/pdf" : mimeType && mimeType.startsWith("image/") ? mimeType : "image/jpeg";

  const mediaPrompt = `You are an expert OCR and academic career document analyst.
Extract all structured information from this student's "MY PERSONAL VISION BLUEPRINT" / Academic & Career Leadership One-Pager (${isPdf ? "PDF Document" : "Image"}) with 100% precision.

${EXTRACTION_SCHEMA_PROMPT}`;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const result = await model.generateContent([
        mediaPrompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: effectiveMimeType,
          },
        },
      ]);

      return JSON.parse(result.response.text());
    } catch (err) {
      console.warn(`[visionBlueprintAiService] Multimodal extraction failed with ${modelName}:`, err.message);
      lastError = err;
    }
  }

  throw new Error(`Failed to extract blueprint from document: ${lastError?.message || "Unknown error"}`);
}

/**
 * 2. Generate comprehensive Strategic Alignment Report using Gemini
 */
async function generateStrategicAlignmentReport(blueprint, studentProfile = {}) {
  const genAI = getGeminiClient();
  const modelsToTry = ["gemini-3.5-flash", "gemini-3.5-flash-lite"];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const synthesisPrompt = `You are a supportive, experienced college career mentor and guide.
The following student has submitted their "Personal Vision Blueprint" containing their Core Values, Core Purpose, 3-5-10 Year Goals, and 90-Day Action Plan.

YOUR TASK:
Create a simple, practical, and inspiring Career & Personal Vision Alignment Report.

CRITICAL LANGUAGE INSTRUCTIONS:
- Use SIMPLE, CLEAR, EVERYDAY ENGLISH that any undergraduate college student and their teachers can easily read and understand.
- DO NOT use complex corporate buzzwords or heavy academic jargon (avoid words like "BHAG", "intrinsic psychological stabilizer", "hegemonic", "systemic risk mitigation", "cognitive dissonance", etc.).
- Write in short, direct sentences, bullet points, and practical examples.
- Explain in plain words:
  1. How the student's Core Purpose motivates them every day.
  2. How their Core Values directly help them reach their 3-year, 5-year, and 10-year goals.
  3. Simple, practical daily habits they should build.
  4. What mistakes to avoid and how to bounce back when things get hard.

STUDENT DETAILS:
- Name: ${blueprint.studentName || studentProfile.fullName || "Student"}
- Course & Academic Year: ${blueprint.academicYear || studentProfile.course || "Undergraduate"}
- Target Sector: ${blueprint.targetSector || "Technology & Consulting"}
- Primary Domain: ${blueprint.primaryDomain || "Technical Excellence"}
- Student Department: ${studentProfile.departmentName || "Engineering & Management"}

BLUEPRINT DATA:
${JSON.stringify(blueprint, null, 2)}

Return strict JSON matching this schema:
{
  "executiveSummary": string (A simple, encouraging 2-3 paragraph summary of the student's vision, why their purpose is strong, and how following these values will lead to career success),
  "corePurposeAlignment": {
    "purposeAnalysis": string (Explain why this purpose is meaningful to the student in simple words),
    "emotionalAndPsychologicalAnchor": string (How this purpose helps the student stay motivated during tough times, exams, or project difficulties),
    "connectionToLongTermBHAG": string (How this purpose connects directly to reaching their 5-year and 10-year career goals)
  },
  "coreValuesPlaybook": [
    {
      "value": string (Principle name, e.g. INTEGRITY, CURIOSITY, RELIABILITY),
      "alignmentWithGoals": string (Simple explanation of how this value helps them achieve their 3, 5, and 10-year goals),
      "dailyBehavioralCode": string (1-2 simple daily habits the student should practice every day),
      "academicAndProjectExecution": string (How to practice this value in college classes, coding projects, and team assignments),
      "riskIfCompromised": string (Simple warning: what happens if the student cuts corners or ignores this value),
      "resilienceProtocol": string (What to do if they make a mistake or face failure)
    }
  ],
  "multiStageRoadmap": {
    "phase1_ThreeYearCapability": {
      "focus": string (Simple title of focus area),
      "howValuesDriveThis": string (How their values help them build skills),
      "criticalMilestones": [string] (3-4 clear, achievable milestones),
      "dailyHabits": [string] (2-3 simple daily habits),
      "measurableKPIS": [string] (2-3 simple ways to measure progress)
    },
    "phase2_FiveYearGrowth": {
      "focus": string,
      "packageTarget": string (e.g. ₹15 LPA),
      "howValuesDriveThis": string,
      "criticalMilestones": [string],
      "careerPositioningStrategy": string (Simple advice on how to get the right role and package),
      "measurableKPIS": [string]
    },
    "phase3_TenYearLegacy": {
      "focus": string,
      "packageTarget": string (e.g. ₹25 LPA),
      "legacyImpact": string (How this helps their family and inspires others),
      "howValuesDriveThis": string,
      "leadershipMaturity": string (Simple qualities of a good team lead or manager),
      "measurableKPIS": [string]
    }
  },
  "ninetyDayActionSprint": [
    {
      "deliverable": string (Name of task or project),
      "category": string (e.g. Technical Skills, Project Leadership, Placement Prep),
      "weeks": string (e.g. Month 1 / Weeks 1-4),
      "concreteMilestones": [string] (2-3 simple action items),
      "coreValuesApplied": string (Which core value helps here),
      "evidenceOfCompletion": string (How the student can prove it is completed, e.g. GitHub link, certificate)
    }
  ],
  "potentialObstaclesAndCountermeasures": [
    {
      "challenge": string (Common problem, e.g. feeling demotivated, exam stress, hard coding problem),
      "underlyingRootCause": string (Why this usually happens in simple words),
      "countermeasureDrivenByValues": string (Simple step-by-step solution to overcome it)
    }
  ],
  "mentorReviewChecklist": [
    {
      "checkpoint": string (Meeting topic, e.g. Monthly Coding Review, Project Progress),
      "questionForStudent": string (Simple question the faculty mentor should ask the student),
      "expectedEvidence": string (What document, code, or proof the student should show)
    }
  ]
}

Keep all language easy to understand, practical, positive, and directly relevant to Indian engineering and management college students.`;

      const result = await model.generateContent(synthesisPrompt);
      const text = result.response.text();
      return JSON.parse(text);
    } catch (err) {
      console.warn(`[visionBlueprintAiService] Alignment report synthesis failed with ${modelName}:`, err.message);
      lastError = err;
    }
  }

  throw new Error(`Failed to generate strategic alignment report: ${lastError?.message || "Unknown error"}`);
}

module.exports = {
  extractBlueprintFromDocument,
  generateStrategicAlignmentReport,
};
