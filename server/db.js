/* Storage for the sync backend. One table, one row per pairing code, the
   whole profile snapshot as a JSON blob — see CLAUDE.md / HANDOFF-ARCHITECTURE.md
   for why this stays whole-blob (no per-field merging) rather than a real schema:
   a single child can't play on two devices at once, so real conflicts are a
   near-impossible edge case, and the simplicity is worth that trade-off. */

const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

function openDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      code TEXT PRIMARY KEY,
      snapshot TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      pin_hash TEXT
    )
  `);
  // The PIN gate (see docs/HANDOFF-ARCHITECTURE.md's dated addendum) shipped
  // after the real household database already had 11 rows — CREATE TABLE IF
  // NOT EXISTS above is a no-op against a table that already exists, so it
  // never actually adds this column there. ALTER TABLE does, and is safe to
  // run every boot: it throws "duplicate column name" once the column is
  // already present (true for every fresh DB created after this line
  // shipped, since the CREATE TABLE above already includes it), which is
  // fine to swallow — the desired end state (a pin_hash column existing,
  // every pre-existing row starting out NULL) is already true either way.
  try {
    db.exec("ALTER TABLE profiles ADD COLUMN pin_hash TEXT");
  } catch (err) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
  return db;
}

/* Wraps the raw DatabaseSync handle with the operations the API needs. */
function makeStore(dbPath) {
  const db = openDb(dbPath);
  const getStmt = db.prepare("SELECT snapshot, updated_at FROM profiles WHERE code = ?");
  const getPinStmt = db.prepare("SELECT pin_hash FROM profiles WHERE code = ?");
  const claimPinStmt = db.prepare("UPDATE profiles SET pin_hash = ? WHERE code = ? AND pin_hash IS NULL");
  const upsertStmt = db.prepare(
    "INSERT INTO profiles (code, snapshot, updated_at) VALUES (?, ?, ?) " +
      "ON CONFLICT(code) DO UPDATE SET snapshot = excluded.snapshot, updated_at = excluded.updated_at"
  );
  const deleteStmt = db.prepare("DELETE FROM profiles WHERE code = ?");

  return {
    get(code) {
      const row = getStmt.get(code);
      if (!row) return null;
      return { snapshot: row.snapshot, updatedAt: Number(row.updated_at) };
    },

    /* undefined = no such profile at all; null = profile exists but has no
       PIN yet (true of every profile that existed before this pass);
       otherwise the stored "salt:hash" string. Never sent to a client as-is
       — index.js only ever derives a boolean `hasPin` from it. */
    getPinHash(code) {
      const row = getPinStmt.get(code);
      return row ? row.pin_hash : undefined;
    },

    /* Claim-only, matching the API surface: succeeds exactly when the row
       exists and has no PIN set yet. Returns false (not an error) for an
       unknown code or one that's already claimed — index.js checks both
       cases explicitly beforehand to give the client a precise 404 vs 409,
       so by the time this runs it's really only guarding the rare race of
       two claims landing at once. */
    claimPin(code, pinHash) {
      const info = claimPinStmt.run(pinHash, code);
      return info.changes > 0;
    },

    /* Reconciles an incoming snapshot against whatever's stored: the side
       with the later timestamp wins outright. Returns the winning
       {snapshot, updatedAt} plus whether the client should pull it (i.e.
       the client's own submission lost). */
    reconcile(code, snapshot, updatedAt) {
      const existing = getStmt.get(code);
      if (!existing || Number(existing.updated_at) <= updatedAt) {
        upsertStmt.run(code, snapshot, updatedAt);
        return { snapshot, updatedAt, pulled: false };
      }
      return { snapshot: existing.snapshot, updatedAt: Number(existing.updated_at), pulled: true };
    },

    delete(code) {
      deleteStmt.run(code);
    },

    /* Every row, newest first — backs the admin page's overview/raw views and
       the new household directory endpoint. pin_hash rides along so the
       directory can compute a boolean `hasPin` without a second query per
       row; nothing forwards the hash itself to a client. */
    listAll() {
      return db.prepare("SELECT code, snapshot, updated_at, pin_hash FROM profiles ORDER BY updated_at DESC").all();
    },

    /* A consistent, defragmented snapshot of the live database — SQLite's
       own built-in mechanism for this, so it needs no WAL mode and no
       external tool, and is safe to run while the server keeps handling
       requests. Tier 1 of the backup story in docs/HANDOFF-ARCHITECTURE.md
       §11: protects against in-app mistakes (an accidental/malicious hit to
       the unauthenticated DELETE /api/profiles/:code route, a bad future
       migration), not node/disk loss, since the destination is meant to be
       the same PVC the live database is on. */
    backup(destPath) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      db.prepare("VACUUM INTO ?").run(destPath);
    },

    close() {
      db.close();
    }
  };
}

/* ISO timestamps with `:`/`.` swapped for `-` sort chronologically as plain
   strings and are safe filenames on every OS the game or its CI ever runs on. */
function backupFileName(date) {
  return `sync-${(date || new Date()).toISOString().replace(/[:.]/g, "-")}.db`;
}

/* Deletes the oldest backup files in `dir` beyond the newest `keep`. A pure
   filesystem operation kept separate from `makeStore()` so it's reachable
   from server/test.js without a live DatabaseSync. */
function pruneBackups(dir, keep) {
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("sync-") && f.endsWith(".db"))
    .sort();
  const excess = Math.max(0, files.length - keep);
  const removed = files.slice(0, excess);
  for (const f of removed) fs.unlinkSync(path.join(dir, f));
  return removed;
}

module.exports = { makeStore, backupFileName, pruneBackups };
