const ALLOWED_ORIGIN = process.env.APP_ORIGIN; // e.g. https://flowfuel.vercel.app

// Sliding window, in-memory. Good enough for "basic" per-client throttling on
// a single warm serverless instance; it resets on cold start and isn't shared
// across concurrent instances/regions, so treat it as a speed bump, not a hard
// guarantee, against runaway Gemini usage from one source.
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;
const requestLog = new Map(); // clientId -> timestamps[]

export function applyCors(req, res) {
  if (ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Client-Id");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

export function checkRateLimit(clientId) {
  const now = Date.now();
  const timestamps = (requestLog.get(clientId) || []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  requestLog.set(clientId, timestamps);
  return timestamps.length <= MAX_REQUESTS_PER_WINDOW;
}

export function getClientId(req) {
  const headerId = req.headers["x-client-id"];
  if (typeof headerId === "string" && headerId.length > 0 && headerId.length < 200) {
    return headerId;
  }
  const forwardedFor = req.headers["x-forwarded-for"];
  return (typeof forwardedFor === "string" ? forwardedFor.split(",")[0].trim() : null) || "unknown";
}

// Strips anything that looks like it could hold a credential (long
// alphanumeric tokens) before logging, regardless of surrounding context —
// thrown errors can embed request headers verbatim.
export function sanitizeForLog(error) {
  const message = error?.message ? String(error.message) : String(error);
  return message.replace(/[A-Za-z0-9_\-]{20,}/g, "[redacted]");
}
