/* Quick self-contained check for the sync backend — no test framework, matches
   the project's existing `node tests/check.js` style (plain asserts, exit
   non-zero on failure). Run with: node server/test.js */

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");

const { makeStore, backupFileName, pruneBackups } = require("./db");

let failures = 0;
function ok(cond, msg) {
  if (cond) {
    console.log("  ok - " + msg);
  } else {
    failures++;
    console.error("  FAIL - " + msg);
  }
}

/* ---- db.js: reconcile logic ---- */
{
  const dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "mila-sync-")), "test.db");
  const store = makeStore(dbPath);

  ok(store.get("ABC123") === null, "unknown code returns null");

  const r1 = store.reconcile("ABC123", '{"stars":5}', 1000);
  ok(r1.pulled === false, "first push for a new code is accepted, not pulled");
  ok(store.get("ABC123").snapshot === '{"stars":5}', "the pushed snapshot is stored");

  const r2 = store.reconcile("ABC123", '{"stars":1}', 500); // older than what's stored
  ok(r2.pulled === true, "a stale push (older updatedAt) is rejected");
  ok(r2.snapshot === '{"stars":5}', "a stale push gets the server's newer snapshot back");
  ok(store.get("ABC123").snapshot === '{"stars":5}', "a stale push does not overwrite storage");

  const r3 = store.reconcile("ABC123", '{"stars":9}', 2000); // newer
  ok(r3.pulled === false, "a newer push is accepted");
  ok(store.get("ABC123").snapshot === '{"stars":9}', "a newer push overwrites storage");

  store.delete("ABC123");
  ok(store.get("ABC123") === null, "a deleted code is gone");
  store.close();
}

/* ---- db.js: backup() / pruneBackups() (docs/HANDOFF-ARCHITECTURE.md §11) ---- */
{
  const dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "mila-backup-")), "test.db");
  const store = makeStore(dbPath);
  store.reconcile("BKUP01", '{"stars":7}', 1000);

  const backupDir = path.join(path.dirname(dbPath), "backups");
  const destPath = path.join(backupDir, backupFileName(new Date(2026, 0, 1)));
  store.backup(destPath);
  ok(fs.existsSync(destPath), "backup() creates a file at the given path");

  const restored = makeStore(destPath);
  ok(restored.get("BKUP01").snapshot === '{"stars":7}', "the backup is a fully independent, restorable database");
  restored.close();

  // A later write to the live db must not appear in the already-taken snapshot.
  store.reconcile("BKUP01", '{"stars":99}', 2000);
  const restoredAgain = makeStore(destPath);
  ok(restoredAgain.get("BKUP01").snapshot === '{"stars":7}', "a backup is a point-in-time snapshot, not a live view");
  restoredAgain.close();
  store.close();

  // Retention pruning: 10 fake backups, keep 3, expect exactly the 3 newest to survive.
  const pruneDir = fs.mkdtempSync(path.join(os.tmpdir(), "mila-prune-"));
  const names = [];
  for (let i = 0; i < 10; i++) {
    const name = backupFileName(new Date(2026, 0, 1 + i));
    fs.writeFileSync(path.join(pruneDir, name), "x");
    names.push(name);
  }
  fs.writeFileSync(path.join(pruneDir, "not-a-backup.txt"), "x"); // must survive untouched
  const removed = pruneBackups(pruneDir, 3);
  const remaining = fs.readdirSync(pruneDir).sort();
  ok(removed.length === 7, "pruneBackups() removes exactly the excess count");
  ok(
    remaining.filter((f) => f.startsWith("sync-")).length === 3,
    "pruneBackups() leaves exactly `keep` backup files"
  );
  ok(
    JSON.stringify(remaining.filter((f) => f.startsWith("sync-"))) === JSON.stringify(names.slice(-3)),
    "pruneBackups() keeps the newest ones, not an arbitrary subset"
  );
  ok(remaining.includes("not-a-backup.txt"), "pruneBackups() leaves non-backup files alone");
}

/* ---- index.js: the actual HTTP routes ---- */
async function httpTests() {
  const dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "mila-sync-http-")), "test.db");
  process.env.DB_PATH = dbPath;
  process.env.PORT = "0";
  process.env.ADMIN_PASSWORD = "topsecret123";
  delete require.cache[require.resolve("./index")];
  const { server } = require("./index");

  await new Promise((resolve) => server.once("listening", resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  const req = (method, urlPath, body, cookie) =>
    new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : null;
      const headers = data ? { "Content-Type": "application/json" } : {};
      if (cookie) headers.Cookie = cookie;
      const r = http.request(base + urlPath, { method, headers }, (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: raw ? JSON.parse(raw) : null }));
      });
      r.on("error", reject);
      if (data) r.write(data);
      r.end();
    });

  const health = await req("GET", "/api/health");
  ok(health.status === 200 && health.body.status === "ok", "GET /api/health returns ok");

  const missing = await req("GET", "/api/profiles/ZZZZ99");
  ok(missing.status === 404, "GET an unknown code returns 404");

  const bad = await req("GET", "/api/profiles/nope!");
  ok(bad.status === 400, "GET an invalid code shape returns 400");

  const sync1 = await req("POST", "/api/profiles/HELLO1/sync", { snapshot: '{"n":1}', updatedAt: 100 });
  ok(sync1.status === 200 && sync1.body.pulled === false, "initial POST sync is accepted");

  const fetched = await req("GET", "/api/profiles/HELLO1");
  ok(fetched.status === 200 && fetched.body.snapshot === '{"n":1}', "GET after sync returns what was pushed");

  const stale = await req("POST", "/api/profiles/HELLO1/sync", { snapshot: '{"n":0}', updatedAt: 1 });
  ok(stale.status === 200 && stale.body.pulled === true, "POSTing a stale snapshot comes back marked pulled");

  const del = await req("DELETE", "/api/profiles/HELLO1");
  ok(del.status === 204, "DELETE returns 204");

  const goneNow = await req("GET", "/api/profiles/HELLO1");
  ok(goneNow.status === 404, "the code is gone after DELETE");

  /* ---- admin: auth gate + overview/raw/detail ---- */
  const snapshot = JSON.stringify({
    name: "Tester",
    stars: 42,
    starsAllTime: 50,
    visit: { dayStreak: 3, bestDayStreak: 5 },
    medals: { gold: 1 },
    stats: { attempts: 10, correct: 8, words: { cat: {}, dog: {} } }
  });
  await req("POST", "/api/profiles/ADMIN1/sync", { snapshot, updatedAt: 1000 });

  const noAuth = await req("GET", "/api/admin/overview");
  ok(noAuth.status === 401, "admin overview without a session cookie is unauthorized");

  const badLogin = await req("POST", "/api/admin/login", { password: "wrong" });
  ok(badLogin.status === 401, "wrong admin password is rejected");

  const goodLogin = await req("POST", "/api/admin/login", { password: "topsecret123" });
  ok(goodLogin.status === 200, "correct admin password is accepted");
  const setCookie = goodLogin.headers["set-cookie"][0];
  const cookie = setCookie.split(";")[0];

  const overview = await req("GET", "/api/admin/overview", null, cookie);
  ok(overview.status === 200, "admin overview with a valid cookie succeeds");
  const row = overview.body.profiles.find((p) => p.code === "ADMIN1");
  ok(!!row, "the synced profile appears in the overview");
  ok(row.stars === 42 && row.dayStreak === 3, "overview reflects the profile's stars and streak");
  ok(row.accuracy === 0.8, "overview computes accuracy from stats.attempts/correct");
  ok(row.wordsTracked === 2, "overview counts tracked words");
  ok(overview.body.backups && overview.body.backups.count >= 1, "overview reports at least the startup backup index.js takes on load");
  ok(overview.body.backups.lastBackupAt !== null, "overview reports when the last backup ran");

  const detail = await req("GET", "/api/admin/profiles/ADMIN1", null, cookie);
  ok(detail.status === 200 && detail.body.profile.name === "Tester", "admin profile detail returns the parsed snapshot");

  const raw = await req("GET", "/api/admin/raw", null, cookie);
  ok(raw.status === 200 && raw.body.rows.some((r) => r.code === "ADMIN1"), "admin raw view lists the stored row");

  await req("POST", "/api/admin/logout", null, cookie);
  const afterLogout = await req("GET", "/api/admin/overview", null, cookie);
  ok(afterLogout.status === 401, "the session cookie is invalid after logout");

  server.close();
}

httpTests().then(() => {
  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
});
