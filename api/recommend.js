import { createClient } from "@supabase/supabase-js";
import { applyCors, checkRateLimit, getClientId, sanitizeForLog } from "./_shared.js";

// Service role key: only ever read here, server-side, from GitHub/Vercel
// secrets. Never imported by anything under src/.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GEMINI_MODEL = "gemini-flash-lite-latest";

function buildPrompt({ candidatesByHall, priority, phase, focusNutrient, focusNote, macroGoals }) {
  const lines = [
    "You are picking a balanced meal for a college student at their dining hall,",
    "one option per dining hall so they can compare locations.",
    `Budget priority right now: ${priority}.`,
    phase ? `Self-reported cycle phase: ${phase}.` : "",
    focusNutrient
      ? `${focusNote} When it fits naturally, favor an item or two with more ${focusNutrient} among the choices below — but never force it or sacrifice a balanced combo for it.`
      : "",
    macroGoals
      ? `Rough daily macro goals (approximate, NOT hard limits): ${JSON.stringify(macroGoals)}. Aim the combo's rough totals in that general direction across the day, not this single meal alone.`
      : "",
    "",
    "Menu candidates, grouped by dining hall (JSON, only items actually available",
    "at that hall — never combine items across halls into one meal):",
    JSON.stringify(candidatesByHall),
    "",
    "Pick the best 3 dining halls (fewer if fewer are available). For each,",
    "assemble ONE balanced meal combo of 2-4 items from ONLY that hall's list —",
    "roughly balance protein, carbs, and something else (vegetable/fruit/dairy)",
    "where the hall's options allow it. Write one short, warm rationale per hall",
    "(not per item) explaining why this combo works right now.",
    "",
    "Hard rules: cite only the evidence given above, never invent nutrition facts",
    "not in the candidate data, never state a specific calorie target or say the",
    "student 'needs' to eat a certain amount, and never use restrictive, guilt,",
    "or diet-culture language (no 'good/bad foods', no mention of binging or",
    "restriction). These are suggestions to make choosing easier, not rules.",
    "",
    'Respond as JSON: { "locations": [{ "diningHall": string, "items": string[],',
    '"rationale": string }] }, best hall first.',
  ];
  return lines.filter(Boolean).join("\n");
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  try {
    return JSON.parse(text);
  } catch {
    return { locations: [], raw: text };
  }
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const clientId = getClientId(req);
  if (!checkRateLimit(clientId)) {
    res.status(429).json({ error: "Rate limit exceeded, try again shortly." });
    return;
  }

  try {
    const { candidatesByHall, priority, date, phase, focusNutrient, focusNote, macroGoals } =
      req.body || {};

    if (!candidatesByHall || typeof candidatesByHall !== "object" || !priority || !date) {
      res.status(400).json({ error: "Missing required fields." });
      return;
    }

    // Only cache the generic (no personal macro goals) case — a cached combo
    // built around one student's macro goals shouldn't be served to another
    // student with different (or no) goals.
    const cacheable = !macroGoals;
    const cacheKey = { dining_hall: "all", date, priority, phase: phase || "none" };

    if (cacheable) {
      const { data: cached } = await supabaseAdmin
        .from("recommendation_cache")
        .select("response")
        .match(cacheKey)
        .maybeSingle();

      if (cached) {
        res.status(200).json(cached.response);
        return;
      }
    }

    const prompt = buildPrompt({ candidatesByHall, priority, phase, focusNutrient, focusNote, macroGoals });
    const result = await callGemini(prompt);

    if (cacheable) {
      await supabaseAdmin.from("recommendation_cache").upsert({ ...cacheKey, response: result });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("recommend handler error:", sanitizeForLog(error));
    res.status(500).json({ error: "Failed to generate recommendation." });
  }
}
