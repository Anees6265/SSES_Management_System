const axios = require("axios");

class GeminiService {
  async analyzeThesis(pdfBuffer) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables");
    }

    const base64Data = pdfBuffer.toString("base64");

    const prompt = `
You are an expert student mentor, counselor, and academic evaluator. Analyze the attached student portfolio document (which covers their self-description, schooling/educational history, past achievements, family background, hobbies, and short-term & long-term goals).

Generate a comprehensive assessment of the student to guide their overall development:
1. Summary: A concise evaluation of the student's background, current status, and ambition.
2. Strengths: Identify positive academic achievements, useful hobbies, valuable soft skills, and healthy habits.
3. Weaknesses/Gaps: Identify gaps in education, obstacles in family support, limiting habits/hobbies, lack of clarity in goals, or areas where they currently lack knowledge.
4. Recommendations: Actionable steps they need to take in both "Studies/Academics" (padai) and "Soft Skills" to achieve their short-term and long-term goals.
5. Effort Level: Determine how much mentoring and self-dedication (Low, Medium, High, Critical) they require to bridge the gap and become perfect.

You must return a structured JSON response matching the following JSON Schema:
{
  "summary": "A concise paragraph summarizing the student's background, current potential, and target career direction.",
  "strengths": ["Strength/Positive highlight 1", "Strength/Positive highlight 2", ...],
  "weaknesses": ["Gaps/Issues/Concerns 1", "Gaps/Issues/Concerns 2", ...],
  "recommendations": ["Studies/Soft-skills recommendation 1", "Studies/Soft-skills recommendation 2", ...],
  "effortLevel": "Low" | "Medium" | "High" | "Critical"
}

Provide clear, encouraging, and highly specific points in English. Do not include markdown blocks like \`\`\`json. Return raw JSON only.
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            summary: { type: "STRING" },
            strengths: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
            weaknesses: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
            recommendations: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
            effortLevel: {
              type: "STRING",
              enum: ["Low", "Medium", "High", "Critical"],
            },
          },
          required: [
            "summary",
            "strengths",
            "weaknesses",
            "recommendations",
            "effortLevel",
          ],
        },
      },
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const candidate = response.data?.candidates?.[0];
      const textResponse = candidate?.content?.parts?.[0]?.text;

      if (!textResponse) {
        throw new Error("Empty response from Gemini API");
      }

      return JSON.parse(textResponse.trim());
    } catch (error) {
      console.error(
        "Gemini API Error details:",
        error.response?.data || error.message
      );
      throw new Error(
        `Gemini AI analysis failed: ${
          error.response?.data?.error?.message || error.message
        }`
      );
    }
  }
}

module.exports = new GeminiService();
