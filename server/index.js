/* Minimal sync backend for Mila's Spell & Tumble Championship.
   No framework — four routes don't need one. See HANDOFF-ARCHITECTURE.md
   for why this exists and why it stays this small. */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { makeStore } = require("./db");

const PORT = process.env.PORT || 8081;
const DB_PATH = process.env.DB_PATH || "./data/sync.db";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const MAX_BODY_BYTES = 2 * 1024 * 1024; // a profile snapshot is a few KB; this is a generous cap against abuse

const store = makeStore(DB_PATH);
const bootTime = Date.now();
const ADMIN_HTML = fs.readFileSync(path.join(__dirname, "admin.html"));

const CODE_RE = /^[A-Z0-9]{4,12}$/;

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) });
  res.end(data);
}

function sendHtml(res, status, body) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}

/* Admin auth: one shared password (env var, from a K8s Secret — never
   committed) gates login; a random per-login session token, kept in memory
   only, is the actual cookie — so logout (or a restart) really ends a
   session instead of a replayable deterministic value living forever. No
   accounts, matching this project's avoidance of them everywhere else. */
const adminSessions = new Set();

function passwordMatches(candidate) {
  if (typeof candidate !== "string" || !ADMIN_PASSWORD) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(ADMIN_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sessionCookie(req) {
  const cookieHeader = req.headers.cookie || "";
  const found = cookieHeader
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("admin_session="));
  return found ? found.slice("admin_session=".length) : null;
}

function isAdmin(req) {
  const token = sessionCookie(req);
  return !!token && adminSessions.has(token);
}

function setAdminCookie(res) {
  const token = crypto.randomBytes(24).toString("hex");
  adminSessions.add(token);
  res.setHeader("Set-Cookie", `admin_session=${token}; HttpOnly; Path=/; SameSite=Strict; Secure; Max-Age=2592000`);
}

function clearAdminCookie(req, res) {
  const token = sessionCookie(req);
  if (token) adminSessions.delete(token);
  res.setHeader("Set-Cookie", "admin_session=; HttpOnly; Path=/; SameSite=Strict; Secure; Max-Age=0");
}

/* Parses each stored snapshot for the overview table; a row that fails to
   parse is reported rather than allowed to crash the whole endpoint. */
function buildOverview() {
  const rows = store.listAll();
  const profiles = rows.map((row) => {
    const updatedAt = Number(row.updated_at);
    const snapshotBytes = Buffer.byteLength(row.snapshot);
    try {
      const p = JSON.parse(row.snapshot);
      const attempts = (p.stats && p.stats.attempts) || 0;
      const correct = (p.stats && p.stats.correct) || 0;
      return {
        code: row.code,
        name: p.name || null,
        stars: p.stars || 0,
        starsAllTime: p.starsAllTime || 0,
        dayStreak: (p.visit && p.visit.dayStreak) || 0,
        bestDayStreak: (p.visit && p.visit.bestDayStreak) || 0,
        medals: p.medals || null,
        attempts,
        accuracy: attempts ? correct / attempts : null,
        wordsTracked: p.stats && p.stats.words ? Object.keys(p.stats.words).length : 0,
        updatedAt,
        snapshotBytes,
        parseError: false
      };
    } catch {
      return { code: row.code, updatedAt, snapshotBytes, parseError: true };
    }
  });

  let dbSizeBytes = 0;
  try {
    dbSizeBytes = fs.statSync(DB_PATH).size;
  } catch {
    // db file not created yet — report 0 rather than failing the endpoint
  }

  return {
    server: {
      uptimeSeconds: Math.floor((Date.now() - bootTime) / 1000),
      nodeVersion: process.version,
      dbSizeBytes,
      rowCount: rows.length
    },
    profiles
  };
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

    if (req.method === "GET" && parts[0] === "admin" && parts.length === 1) {
      return sendHtml(res, 200, ADMIN_HTML);
    }

    if (parts[0] === "api" && parts[1] === "admin") {
      if (req.method === "POST" && parts[2] === "login") {
        const raw = await readBody(req);
        let payload;
        try {
          payload = JSON.parse(raw);
        } catch {
          return sendJson(res, 400, { error: "invalid json" });
        }
        if (!passwordMatches(payload.password)) return sendJson(res, 401, { error: "invalid password" });
        setAdminCookie(res);
        return sendJson(res, 200, { ok: true });
      }

      if (req.method === "POST" && parts[2] === "logout") {
        clearAdminCookie(req, res);
        return sendJson(res, 200, { ok: true });
      }

      if (!isAdmin(req)) return sendJson(res, 401, { error: "unauthorized" });

      if (req.method === "GET" && parts[2] === "overview") {
        return sendJson(res, 200, buildOverview());
      }

      if (req.method === "GET" && parts[2] === "raw") {
        const rows = store.listAll().map((r) => ({ code: r.code, snapshot: r.snapshot, updatedAt: Number(r.updated_at) }));
        return sendJson(res, 200, { rows });
      }

      if (req.method === "GET" && parts[2] === "profiles" && parts[3]) {
        const code = parts[3].toUpperCase();
        const row = store.get(code);
        if (!row) return sendJson(res, 404, { error: "not found" });
        try {
          return sendJson(res, 200, { code, updatedAt: row.updatedAt, profile: JSON.parse(row.snapshot) });
        } catch {
          return sendJson(res, 200, { code, updatedAt: row.updatedAt, parseError: true, raw: row.snapshot });
        }
      }
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
