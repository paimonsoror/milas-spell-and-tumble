/* Minimal sync backend for Mila's Spell & Tumble Championship.
   No framework — four routes don't need one. See HANDOFF-ARCHITECTURE.md
   for why this exists and why it stays this small. */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { makeStore, backupFileName, pruneBackups } = require("./db");

const PORT = process.env.PORT || 8081;
const DB_PATH = process.env.DB_PATH || "./data/sync.db";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const MAX_BODY_BYTES = 2 * 1024 * 1024; // a profile snapshot is a few KB; this is a generous cap against abuse

// Tier 1 backup story (docs/HANDOFF-ARCHITECTURE.md §11): consistent
// VACUUM INTO snapshots on the same PVC as the live database, with
// retention pruning. Deliberately not a second container/image — see that
// doc for why (the CI pipeline's blanket `sed` over every `tag:` key in
// values.yaml would clobber a second image's tag).
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(path.dirname(DB_PATH), "backups");
const BACKUP_INTERVAL_MS = Number(process.env.BACKUP_INTERVAL_MS) || 24 * 60 * 60 * 1000;
const BACKUP_RETENTION = Number(process.env.BACKUP_RETENTION) || 7;

const store = makeStore(DB_PATH);
const bootTime = Date.now();
const ADMIN_HTML = fs.readFileSync(path.join(__dirname, "admin.html"));

const backupState = { lastBackupAt: null, lastBackupError: null };

function runBackup() {
  try {
    store.backup(path.join(BACKUP_DIR, backupFileName()));
    pruneBackups(BACKUP_DIR, BACKUP_RETENTION);
    backupState.lastBackupAt = Date.now();
    backupState.lastBackupError = null;
  } catch (err) {
    console.error("backup failed:", err);
    backupState.lastBackupError = err.message;
  }
}

runBackup(); // don't make a freshly deployed server wait a full interval for its first snapshot
const backupTimer = setInterval(runBackup, BACKUP_INTERVAL_MS);
if (backupTimer.unref) backupTimer.unref(); // same reasoning as store.js's _scheduleSync(): never hold the process open on its own

function backupStats() {
  let count = 0;
  let totalBytes = 0;
  try {
    for (const f of fs.readdirSync(BACKUP_DIR)) {
      if (!f.startsWith("sync-") || !f.endsWith(".db")) continue;
      count++;
      totalBytes += fs.statSync(path.join(BACKUP_DIR, f)).size;
    }
  } catch {
    // backups dir doesn't exist yet — report zero rather than failing the endpoint
  }
  return { ...backupState, count, totalBytes };
}

const CODE_RE = /^[A-Z0-9]{4,12}$/;

/* ---- household profile directory + PIN gate ----
   See docs/HANDOFF-ARCHITECTURE.md's dated addendum for the why. PINs are
   hashed with Node's built-in crypto.scryptSync — no new dependency, same
   reasoning as this server's zero-npm-deps rule (see package.json). A
   random per-profile salt is stored alongside the hash as "salt:hash" in
   the one pin_hash column, verified with crypto.timingSafeEqual — the same
   pattern passwordMatches() already uses for the admin password above. */
function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPin(pin, stored) {
  if (typeof stored !== "string") return false;
  const sep = stored.indexOf(":");
  if (sep === -1) return false;
  const salt = stored.slice(0, sep);
  const hashHex = stored.slice(sep + 1);
  let candidate;
  try {
    candidate = crypto.scryptSync(pin, salt, 64);
  } catch {
    return false;
  }
  const stored64 = Buffer.from(hashHex, "hex");
  return stored64.length === candidate.length && crypto.timingSafeEqual(stored64, candidate);
}

function pinLooksValid(pin) {
  return typeof pin === "string" && pin.length >= 4 && pin.length <= 8;
}

/* Best-effort speed bump against PIN guessing, not real security — this is
   an in-memory, per-process counter with no persistence and no distinction
   between IPs, appropriate to a household tool behind a home LAN, not a
   public auth boundary. 5 wrong PINs for one profile code locks that code
   out for a minute; a successful unlock (or the lockout naturally expiring)
   clears it. */
const UNLOCK_MAX_ATTEMPTS = 5;
const UNLOCK_LOCKOUT_MS = 60 * 1000;
const unlockAttempts = new Map(); // code -> { count, lockedUntil }

function isUnlockLocked(code) {
  const entry = unlockAttempts.get(code);
  if (!entry || !entry.lockedUntil) return false;
  if (Date.now() >= entry.lockedUntil) {
    unlockAttempts.delete(code); // lockout window passed — start clean
    return false;
  }
  return true;
}

function recordUnlockFailure(code) {
  const entry = unlockAttempts.get(code) || { count: 0, lockedUntil: null };
  entry.count++;
  if (entry.count >= UNLOCK_MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + UNLOCK_LOCKOUT_MS;
    entry.count = 0;
  }
  unlockAttempts.set(code, entry);
}

function recordUnlockSuccess(code) {
  unlockAttempts.delete(code);
}

/* Lean directory for the household profile picker (js/app.js's
   renderProfiles()) — every synced profile's name/stars/medals/streak plus
   whether it's PIN-protected yet, never the hash itself. Tolerant of a row
   that fails to parse, same reasoning as buildOverview() above: report it
   rather than crash the whole endpoint over one bad row. Unauthenticated,
   same as every other /api/profiles route — this app's threat model is
   "internal household use only" (see docs/HANDOFF-ARCHITECTURE.md), and the
   directory is exactly what the picker screen needs to show cards before a
   PIN is even entered. */
function buildDirectory() {
  return store.listAll().map((row) => {
    const updatedAt = Number(row.updated_at);
    const hasPin = row.pin_hash != null;
    try {
      const p = JSON.parse(row.snapshot);
      return {
        code: row.code,
        name: p.name || null,
        stars: p.stars || 0,
        medals: p.medals || null,
        dayStreak: (p.visit && p.visit.dayStreak) || 0,
        hasPin,
        updatedAt
      };
    } catch {
      return { code: row.code, name: null, stars: 0, medals: null, dayStreak: 0, hasPin, updatedAt, parseError: true };
    }
  });
}

/* Normalizes a name for comparison the same way js/app.js's client-side
   duplicate-name guard does: trim + lowercase. Defense-in-depth for the
   incident this pass fixes (three "Mila"/four "Layla" duplicate rows in the
   live database) — the client already blocks creating a second profile
   whose name collides with one already in the fetched directory, but that's
   a point-in-time check, not a guarantee. Deliberately simple, matching
   this project's existing "timestamp-wins, not a real conflict system"
   spirit: a genuine race between two devices creating the same name at the
   same instant is an accepted edge case here, same as everywhere else in
   this sync design. */
function normalizeName(name) {
  return typeof name === "string" ? name.trim().toLowerCase() : "";
}

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
    backups: backupStats(),
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

    // Household directory for the profile picker (js/app.js renderProfiles()).
    // Sits ahead of the /api/profiles/:code block below: this one matches
    // exactly two path segments (no code), that one requires a third.
    if (req.method === "GET" && parts[0] === "api" && parts[1] === "profiles" && parts.length === 2) {
      return sendJson(res, 200, buildDirectory());
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

        // Defense-in-depth against the duplicate-name incident (see
        // buildDirectory()'s comment above and docs/HANDOFF-ARCHITECTURE.md's
        // dated addendum): reject a push whose name collides with a
        // *different* existing profile's name, rather than silently storing
        // a second row under a name that's already taken.
        let incomingName = null;
        try {
          incomingName = JSON.parse(payload.snapshot).name;
        } catch {
          incomingName = null; // malformed snapshot JSON — let reconcile() below store/report it as-is
        }
        const normalizedIncoming = normalizeName(incomingName);
        if (normalizedIncoming) {
          const collision = store.listAll().some((row) => {
            if (row.code === code) return false; // this profile's own re-sync of its own name is not a collision
            try {
              return normalizeName(JSON.parse(row.snapshot).name) === normalizedIncoming;
            } catch {
              return false;
            }
          });
          if (collision) {
            return sendJson(res, 409, { error: "name already taken", name: incomingName });
          }
        }

        const result = store.reconcile(code, payload.snapshot, payload.updatedAt);
        return sendJson(res, 200, result);
      }

      // Claim-only: sets a PIN the first time, never changes one that's
      // already set. A "change my PIN" or "forgot my PIN" flow is
      // deliberately out of scope for this pass — see the dated addendum in
      // docs/HANDOFF-ARCHITECTURE.md for why that's a real product decision
      // for the project owner, not something to guess at here.
      if (req.method === "POST" && parts[3] === "pin") {
        const raw = await readBody(req);
        let payload;
        try {
          payload = JSON.parse(raw);
        } catch {
          return sendJson(res, 400, { error: "invalid json" });
        }
        const row = store.get(code);
        if (!row) return sendJson(res, 404, { error: "not found" });
        if (store.getPinHash(code)) return sendJson(res, 409, { error: "pin already set" });
        if (!pinLooksValid(payload.pin)) return sendJson(res, 400, { error: "pin must be 4-8 characters" });
        const claimed = store.claimPin(code, hashPin(payload.pin));
        if (!claimed) return sendJson(res, 409, { error: "pin already set" }); // lost a race with a concurrent claim
        return sendJson(res, 200, { ok: true });
      }

      if (req.method === "POST" && parts[3] === "unlock") {
        if (isUnlockLocked(code)) {
          return sendJson(res, 429, { error: "too many attempts — try again in a minute" });
        }
        const raw = await readBody(req);
        let payload;
        try {
          payload = JSON.parse(raw);
        } catch {
          return sendJson(res, 400, { error: "invalid json" });
        }
        const row = store.get(code);
        if (!row) return sendJson(res, 404, { error: "not found" });
        const pinHash = store.getPinHash(code);
        if (!pinHash) return sendJson(res, 409, { error: "no pin set" });
        if (!verifyPin(payload.pin, pinHash)) {
          recordUnlockFailure(code);
          return sendJson(res, 401, { error: "wrong pin" });
        }
        recordUnlockSuccess(code);
        return sendJson(res, 200, { code, updatedAt: row.updatedAt, snapshot: row.snapshot });
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
  clearInterval(backupTimer);
  store.close();
  server.close(() => process.exit(0));
});

module.exports = { server, runBackup, backupStats };
