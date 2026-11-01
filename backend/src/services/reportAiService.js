let GoogleGenerativeAI = null;
try {
  const genAiModule = require('@google/generative-ai');
  GoogleGenerativeAI = genAiModule.GoogleGenerativeAI;
} catch (e) {
  // Graceful fallback if @google/generative-ai is not installed in node_modules
}

/**
 * Generate heuristic rule-based feedback from the 6 evaluation cards
 * Used as a 100% deterministic fallback if Gemini API is unreachable or rate-limited.
 */
function generateHeuristicFeedback(evaluationData) {
  const {
    studentName = "Student",
    departmentName = "",
    course = "",
    levelProgress = {},
    subjectPerformance = [],
    softSkills = [],
    interviewRatings = [],
    careerReadiness = {},
    overallPerformance = {}
  } = evaluationData;

  const strengths = [];
  const growthAreas = [];

  // 1. Subject-wise Performance Analysis
  const subjects = Array.isArray(subjectPerformance) ? subjectPerformance : [];
  const strongSubjects = subjects.filter(s => {
    const r = parseFloat(s.averageRating || s.remark || s.rating);
    const lvl = String(s.performanceLevel || s.value || "").toLowerCase();
    return (!isNaN(r) && r >= 3.5) || lvl === "outstanding" || lvl === "excellent";
  });
  const weakSubjects = subjects.filter(s => {
    const r = parseFloat(s.averageRating || s.remark || s.rating);
    const lvl = String(s.performanceLevel || s.value || "").toLowerCase();
    const evaluated = Number(s.evaluatedTasks ?? s.score ?? 0);
    const total = Number(s.totalTasks ?? s.maxMarks ?? 0);
    const pct = total > 0 ? (evaluated / total) : 1;
    return (!isNaN(r) && r < 3.0) || lvl === "needs improvement" || pct < 0.5;
  });

  if (strongSubjects.length > 0) {
    const details = strongSubjects.slice(0, 2).map(s => {
      const name = s.subjectName || s.itemName || s.name;
      const r = s.averageRating || s.remark;
      return r && r !== "—" ? `${name} (Rating: ${r}/5)` : name;
    }).join(" and ");
    strengths.push(`Demonstrated solid conceptual foundation and high task completion in ${details}.`);
  }

  if (weakSubjects.length > 0) {
    const names = weakSubjects.slice(0, 2).map(s => s.subjectName || s.itemName || s.name).join(" and ");
    growthAreas.push(`Requires focused revision and consistent task submission in ${names} to improve subject mastery.`);
  }

  // 2. Soft Skills & Behavioural Evaluation
  const soft = Array.isArray(softSkills) ? softSkills : [];
  const strongSoft = soft.filter(s => Number(s.scoreOutOf5 ?? s.value ?? 0) >= 3.5);
  const weakSoft = soft.filter(s => {
    const val = Number(s.scoreOutOf5 ?? s.value ?? 0);
    return val > 0 && val < 3.5;
  });

  if (strongSoft.length > 0) {
    const names = strongSoft.slice(0, 2).map(s => s.skillName || s.itemName).join(" and ");
    strengths.push(`Exhibits positive professional and interpersonal conduct with strong scores in ${names}.`);
  }
  if (weakSoft.length > 0) {
    const names = weakSoft.slice(0, 2).map(s => s.skillName || s.itemName).join(" and ");
    growthAreas.push(`Enhance professional communication, confidence, and presentation delivery in ${names}.`);
  }

  // 3. Technical Interview & Mock Assessment
  const interviews = Array.isArray(interviewRatings) ? interviewRatings : [];
  const strongInterview = interviews.filter(i => Number(i.scoreOutOf5 ?? i.value ?? 0) >= 3.5);
  const weakInterview = interviews.filter(i => {
    const val = Number(i.scoreOutOf5 ?? i.value ?? 0);
    return val > 0 && val < 3.5;
  });
  const zeroInterview = interviews.filter(i => Number(i.scoreOutOf5 ?? i.value ?? 0) === 0);

  if (strongInterview.length > 0) {
    const names = strongInterview.slice(0, 2).map(i => i.parameterName || i.itemName).join(" and ");
    strengths.push(`Commendable technical mock interview performance, demonstrating problem-solving clarity in ${names}.`);
  }
  if (weakInterview.length > 0) {
    const names = weakInterview.slice(0, 2).map(i => i.parameterName || i.itemName).join(" and ");
    growthAreas.push(`Requires targeted practice and structured answering techniques in ${names} for technical rounds.`);
  } else if (zeroInterview.length > 0 && strongInterview.length === 0) {
    growthAreas.push("Needs to participate actively in scheduled mock technical interviews and live assessment rounds.");
  }

  // 4. Level Progress
  const currentLvl = levelProgress.currentLevel || (levelProgress.items?.find(i => i.value === "Current")?.itemName) || "Current Level";
  const completionPct = Number(levelProgress.completionPercentage) || 0;
  if (completionPct >= 75) {
    strengths.push(`Consistent syllabus advancement with ${completionPct}% task completion achieved in ${currentLvl}.`);
  } else if (completionPct > 0 && completionPct < 60) {
    growthAreas.push(`Accelerate daily task submission in ${currentLvl} to achieve benchmark syllabus completion rate.`);
  }

  // 5. Career Readiness
  const resume = String(careerReadiness.resume || careerReadiness.Resume || "").toLowerCase();
  const linkedin = String(careerReadiness.linkedin || careerReadiness.LinkedIn || "").toLowerCase();
  const aptitude = String(careerReadiness.aptitude || careerReadiness.Aptitude || "").toLowerCase();
  const placementReady = String(careerReadiness["placement ready"] || careerReadiness["Placement Ready"] || careerReadiness.placementReady || "").toLowerCase();

  if (resume.includes("uploaded") || resume.includes("verified") || resume.includes("ready")) {
    strengths.push("Professional technical resume prepared and verified for upcoming campus placement opportunities.");
  } else {
    growthAreas.push("Must finalize and upload a verified industry-standard resume for placement drive eligibility.");
  }

  if (linkedin.includes("created") || linkedin.includes("active") || linkedin.includes("http")) {
    strengths.push("Professional LinkedIn profile established to showcase academic projects and technical credentials.");
  } else {
    growthAreas.push("Establish and optimize a professional LinkedIn profile highlighting projects and technical coursework.");
  }

  if (!aptitude.includes("ready") && (aptitude.includes("progress") || aptitude.includes("started") || aptitude.includes("not"))) {
    growthAreas.push("Accelerate aptitude training and solve quantitative reasoning modules to attain placement clearance.");
  }

  // 6. Overall Performance
  const overallRating = Number(overallPerformance.overallRating ?? overallPerformance.value ?? 0);
  const overallRemark = overallPerformance.overallRemark || overallPerformance.remark || "";
  if (overallRating >= 3.5) {
    strengths.push(`Maintains a solid aggregate standing of ${overallRating}/5.0 with an '${overallRemark || "Very Good"}' rating.`);
  }

  return {
    strengths: strengths.slice(0, 4),
    growthAreas: growthAreas.slice(0, 4),
    source: "heuristic"
  };
}

/**
 * Generate AI Feedback using Google Gemini API
 * Strictly grounded, deterministic, zero-hallucination mapping.
 */
async function generateStudentFeedback(evaluationData) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!GoogleGenerativeAI) {
    console.warn("[reportAiService] @google/generative-ai is not installed. Falling back to heuristic generator.");
    return generateHeuristicFeedback(evaluationData);
  }

  if (!apiKey) {
    console.warn("[reportAiService] No GEMINI_API_KEY configured. Falling back to heuristic generator.");
    return generateHeuristicFeedback(evaluationData);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.0,
        seed: 42
      }
    });

    const {
      studentName = "Student",
      departmentName = "",
      course = "",
      levelProgress = {},
      subjectPerformance = [],
      softSkills = [],
      interviewRatings = [],
      careerReadiness = {},
      overallPerformance = {}
    } = evaluationData;

    const currentLvl = levelProgress.currentLevel || "Current Level";
    const completionPct = levelProgress.completionPercentage !== undefined ? `${levelProgress.completionPercentage}%` : "Not specified";

    const prompt = `You are a senior academic director and industry placement evaluator reviewing this college student's semester report card:

Student Profile:
- Name: ${studentName}
- Department: ${departmentName || "Academic Department"}
- Course: ${course || "Undergraduate"}

Evaluation Data from 6 Assessment Cards:
1. Level Progress: Current Level ${currentLvl} (${completionPct} tasks completed).
2. Subject-wise Performance:
${JSON.stringify(subjectPerformance, null, 2)}
3. Soft Skills & Behavioural Evaluation (scores out of 5):
${JSON.stringify(softSkills, null, 2)}
4. Technical Interview & Mock Assessment (scores out of 5):
${JSON.stringify(interviewRatings, null, 2)}
5. Career Readiness Status:
${JSON.stringify(careerReadiness, null, 2)}
6. Overall Performance:
${JSON.stringify(overallPerformance, null, 2)}

STRICT EVALUATION & GROUNDING RULES:
1. STRICT DATA FIDELITY (NO HALLUCINATIONS):
   - ONLY reference subjects, skills, and parameters explicitly listed in the data above.
   - NEVER invent or hallucinate technologies (e.g. do NOT mention HTML, CSS, JavaScript, Git, React, Python, Java, etc. unless they appear verbatim in the subject or interview list above).
2. CONSISTENCY & DETERMINISM:
   - Use clear, professional, direct academic English.
   - Always produce consistent, factual points grounded in the numbers provided.
3. STRENGTHS (Generate exactly 3 to 4 points):
   - Point 1: Highlight the highest-scoring subject(s) by name with rating or performance level.
   - Point 2: Highlight strong soft skills or technical interview parameters (rated >= 3.5 out of 5).
   - Point 3: Highlight solid Level Progress completion or positive Overall Rating/Remark.
   - Point 4: Highlight verified Career Readiness assets (e.g. Uploaded Resume, Active LinkedIn) or second top subject/skill.
4. AREAS FOR FOCUSED GROWTH (Generate exactly 3 to 4 points):
   - Point 1: Highlight the specific subject(s) marked "Needs Improvement" or having the lowest ratings by name.
   - Point 2: Highlight technical interview parameter(s) or soft skill(s) scoring below 3.5 by name.
   - Point 3: Highlight missing or in-progress Career Readiness deliverables (e.g. Resume not uploaded, LinkedIn not created, Aptitude in progress/not started).
   - Point 4: Suggest targeted action (e.g. Level progress task submission pacing, scheduled mock interview practice).

OUTPUT FORMAT:
Return strictly a valid JSON object matching this schema:
{
  "strengths": [
    "point 1",
    "point 2",
    "point 3",
    "point 4"
  ],
  "growthAreas": [
    "point 1",
    "point 2",
    "point 3",
    "point 4"
  ]
}
Each point must be 12 to 24 words long. Do not output markdown, preambles, or explanations. Pure JSON only.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed.strengths) && Array.isArray(parsed.growthAreas)) {
      const cleanStrengths = parsed.strengths.filter(s => typeof s === "string" && s.trim());
      const cleanGrowth = parsed.growthAreas.filter(g => typeof g === "string" && g.trim());

      if (cleanStrengths.length > 0 && cleanGrowth.length > 0) {
        return {
          strengths: cleanStrengths,
          growthAreas: cleanGrowth,
          source: "gemini"
        };
      }
    }

    throw new Error("Invalid structure returned by Gemini");
  } catch (err) {
    console.error("[reportAiService] Gemini generation error:", err.message);
    if (process.env.ENABLE_AI_HEURISTIC_FALLBACK !== "false") {
      console.log("[reportAiService] Falling back to intelligent heuristic feedback.");
      return generateHeuristicFeedback(evaluationData);
    }
    throw err;
  }
}

module.exports = {
  generateStudentFeedback,
  generateHeuristicFeedback
};
