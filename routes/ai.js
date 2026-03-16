import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

/* SAFE JSON EXTRACTOR */

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);

  if (!match) {
    throw new Error("JSON not found");
  }

  return JSON.parse(match[0]);
}

/* GENERATE QUESTION */

router.post("/generate-question", async (req, res) => {
  try {
    const {
      category = "Groundwater",
      level = 1,
      ageGroup = "college",
      usedQuestions = [],
    } = req.body || {};

    const difficulty =
      level <= 2
        ? "easy"
        : level <= 4
          ? "medium"
          : level <= 6
            ? "hard"
            : "expert";

    const prompt = `
Create ONE ${difficulty} multiple-choice question.

Topic: ${category}
Audience: ${ageGroup}

Rules:
- 4 options only
- One correct answer
- Real-life scenario
- Avoid repeating these questions:
${usedQuestions.slice(-10).join(" || ")}

Return ONLY JSON:
{
 "question": "",
 "options": ["","","",""],
 "answer": ""
}
`;

    const controller = new AbortController();

    /* 8s timeout protection */

    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();

    const raw = data?.choices?.[0]?.message?.content;

    if (!raw) throw new Error("Empty AI response");

    const parsed = extractJSON(raw);

    if (
      !parsed.question ||
      !Array.isArray(parsed.options) ||
      parsed.options.length !== 4 ||
      !parsed.options.includes(parsed.answer)
    ) {
      throw new Error("Invalid AI format");
    }

    return res.json({
      question: parsed.question,
      options: parsed.options,
      answer: parsed.answer,
      xp: level * 10,
      ai: true,
    });
  } catch (err) {
    console.error("AI ERROR:", err.message);

    /* PERMANENT FALLBACK QUESTION */

    return res.json({
      question:
        "How does excessive groundwater extraction affect nearby rivers?",
      options: [
        "It lowers river flow levels",
        "It increases rainfall",
        "It improves water quality",
        "It has no impact",
      ],
      answer: "It lowers river flow levels",
      xp: 10,
      fallback: true,
    });
  }
});

export default router;
