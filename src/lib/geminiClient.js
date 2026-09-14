import { getDeviceId } from "./deviceId";

// The client never holds a Gemini key — both calls go through the proxy,
// which is the only thing that reads GEMINI_API_KEY from its environment.
async function postToProxy(path, body, signal) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": getDeviceId(),
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed with status ${response.status}`);
  }
  return response.json();
}

export function analyzePhoto({ mimeType, base64Data }, signal) {
  return postToProxy("/api/analyze-photo", { mimeType, base64Data }, signal);
}

export function getRecommendations(
  { candidatesByHall, priority, date, phase, focusNutrient, focusNote, macroGoals },
  signal
) {
  return postToProxy(
    "/api/recommend",
    { candidatesByHall, priority, date, phase, focusNutrient, focusNote, macroGoals },
    signal
  );
}
