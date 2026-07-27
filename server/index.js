/* Minimal sync backend for Mila's Spell & Tumble Championship.
   No framework — four routes don't need one. See HANDOFF-ARCHITECTURE.md
   for why this exists and why it stays this small. */

const http = require("http");
const { makeStore } = require("./db");

const PORT = process.env.PORT || 8081;
const DB_PATH = process.env.DB_PATH || "./data/sync.db";
const MAX_BODY_BYTES = 2 * 1024 * 1024; // a profile snapshot is a few KB; this is a generous cap against abuse

const store = makeStore(DB_PATH);

const CODE_RE = /^[A-Z0-9]{4,12}$/;

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const parts = url.pathname.split("/").filter(Boolean); // ["api", "profiles", ":code", ...?]

    if (req.method === "GET" && parts[0] === "api" && parts[1] === "health") {
      return sendJson(res, 200, { status: "ok" });
    }

    if (parts[0] === "api" && parts[1] === "profiles" && parts[2]) {
      const code = parts[2].toUpperCase();
      if (!CODE_RE.test(code)) return sendJson(res, 400, { error: "invalid code" });

      if (req.method === "GET" && parts.length === 3) {
        const row = store.get(code);
        if (!row) return sendJson(res, 404, { error: "not found" });
        return sendJson(res, 200, row);
      }

      if (req.method === "POST" && parts[3] === "sync") {
        const raw = await readBody(req);
        let payload;
        try {
          payload = JSON.parse(raw);
        } catch {
          return sendJson(res, 400, { error: "invalid json" });
        }
        if (typeof payload.snapshot !== "string" || !Number.isFinite(payload.updatedAt)) {
          return sendJson(res, 400, { error: "expected { snapshot: string, updatedAt: number }" });
        }
        const result = store.reconcile(code, payload.snapshot, payload.updatedAt);
        return sendJson(res, 200, result);
      }

      if (req.method === "DELETE" && parts.length === 3) {
        store.delete(code);
        res.writeHead(204);
        return res.end();
      }
    }

    sendJson(res, 404, { error: "not found" });
  } catch (err) {
    if (err.message === "payload too large") return sendJson(res, 413, { error: "payload too large" });
    console.error(err);
    sendJson(res, 500, { error: "internal error" });
  }
});

server.listen(PORT, () => console.log(`sync server listening on :${PORT}, db at ${DB_PATH}`));

process.on("SIGTERM", () => {
  store.close();
  server.close(() => process.exit(0));
});

module.exports = { server };
