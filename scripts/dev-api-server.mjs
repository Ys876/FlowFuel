// Local-only dev server that runs the Vercel serverless functions under
// api/*.js so `npm start`'s CRA dev server (proxied via package.json's
// "proxy" field) can hit /api/recommend and /api/analyze-photo without
// needing `vercel dev` / a linked Vercel project. Never used in production —
// Vercel runs api/*.js natively there.
import { createServer } from "node:http";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const PORT = process.env.DEV_API_PORT || 5050;

const routes = {
  "/api/recommend": (await import("../api/recommend.js")).default,
  "/api/analyze-photo": (await import("../api/analyze-photo.js")).default,
};

function adaptResponse(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  };
  return res;
}

const server = createServer(async (req, res) => {
  const handler = routes[req.url.split("?")[0]];
  if (!handler) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString("utf8");
  try {
    req.body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    req.body = {};
  }

  adaptResponse(res);

  try {
    await handler(req, res);
  } catch (error) {
    console.error(`[dev-api] ${req.url} threw:`, error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal error" });
    }
  }
});

server.listen(PORT, () => {
  console.log(`[dev-api] Serving api/*.js locally on http://localhost:${PORT}`);
});
