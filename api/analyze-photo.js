import { applyCors, checkRateLimit, getClientId, sanitizeForLog } from "./_shared.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
// Base64 inflates raw bytes by ~4/3, and Vercel's default serverless body
// limit is ~4.5MB — cap the *decoded* size well under that so a
// maximally-sized upload doesn't get rejected at the platform level before
// this validation even runs.
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const GEMINI_MODEL = "gemini-flash-lite-latest";

function estimateDecodedBytes(base64) {
  return Math.floor((base64.length * 3) / 4);
}

async function callGeminiVision(mimeType, base64Data) {
  const apiKey = process.env.GEMINI_API_KEY;
  const prompt =
    "Identify the foods in this meal photo and estimate calories, protein (g), " +
    "fat (g), carbs (g), iron (% daily value), and calcium (% daily value) for " +
    'the meal as a whole. Respond as JSON: { "identifiedFoods": string[], ' +
    '"estimatedMacros": { "calories": number, "protein": number, "fat": number, ' +
    '"carb": number, "iron": number, "calcium": number }, ' +
    '"confidence": "low"|"medium"|"high" }. These are estimates, not precise lab ' +
    "values — approximate is fine. Do not state calorie targets or use " +
    "restrictive or judgmental language about the food.";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Data } },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`Gemini vision request failed with status ${response.status}`);
  }
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  try {
    return JSON.parse(text);
  } catch {
    return { identifiedFoods: [], estimatedMacros: null, confidence: "low", raw: text };
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: "5mb" },
  },
};

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
    const { mimeType, base64Data } = req.body || {};

    if (!mimeType || !base64Data) {
      res.status(400).json({ error: "Missing image data." });
      return;
    }
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      res.status(415).json({ error: "Unsupported image type." });
      return;
    }
    if (estimateDecodedBytes(base64Data) > MAX_IMAGE_BYTES) {
      res.status(413).json({ error: "Image too large." });
      return;
    }

    const result = await callGeminiVision(mimeType, base64Data);
    res.status(200).json(result);
  } catch (error) {
    console.error("analyze-photo handler error:", sanitizeForLog(error));
    res.status(500).json({ error: "Failed to analyze photo." });
  }
}
