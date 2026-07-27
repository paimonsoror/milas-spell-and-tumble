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
      updated_at INTEGER NOT NULL
    )
  `);
  return db;
}

/* Wraps the raw DatabaseSync handle with the three operations the API needs. */
function makeStore(dbPath) {
  const db = openDb(dbPath);
  const getStmt = db.prepare("SELECT snapshot, updated_at FROM profiles WHERE code = ?");
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

    close() {
      db.close();
    }
  };
}

module.exports = { makeStore };
