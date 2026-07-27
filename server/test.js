/* Quick self-contained check for the sync backend — no test framework, matches
   the project's existing `node tests/check.js` style (plain asserts, exit
   non-zero on failure). Run with: node server/test.js */

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");

const { makeStore } = require("./db");

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

/* ---- index.js: the actual HTTP routes ---- */
async function httpTests() {
  const dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "mila-sync-http-")), "test.db");
  process.env.DB_PATH = dbPath;
  process.env.PORT = "0";
  delete require.cache[require.resolve("./index")];
  const { server } = require("./index");

  await new Promise((resolve) => server.once("listening", resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  const req = (method, urlPath, body) =>
    new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : null;
      const r = http.request(
        base + urlPath,
        { method, headers: data ? { "Content-Type": "application/json" } : {} },
        (res) => {
          let raw = "";
          res.on("data", (c) => (raw += c));
          res.on("end", () => resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null }));
        }
      );
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

  server.close();
}

httpTests().then(() => {
  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
});
