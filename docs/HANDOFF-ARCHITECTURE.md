# Handoff → Architecture Review

You are being asked to review a real, working deployment — not a greenfield design.
Your job is to look at what's actually running, tell us where it's solid, where
it's actually fragile, and what's genuinely worth adding for performance,
reliability, and flexibility. **Calibrate hard to the actual scale before you
recommend anything** — see §1, then §6, before you reach for enterprise patterns.

---

## 1. Scale reality — read this before anything else

This is a spelling game one dad built for his 8-year-old, now self-hosted on his
home Kubernetes cluster. The realistic concurrent user count is **1–3 children in
one household**, on at most a couple of devices each. There is no growth plan, no
other tenants, no public launch. This is closer to "a smart home automation" than
"a SaaS product" in every dimension that matters for architecture decisions.

State that plainly to yourself before proposing anything: a recommendation sized
for thousands of concurrent users is a recommendation for the wrong project, even
if it would be correct advice at a different scale. Where you'd normally reach
for Redis/Postgres/message queues/HPA/multi-region — ask "does this specific
household-scale problem need that, or does it need the smallest thing that
works?" every time.

## 2. Read this first

- **`CLAUDE.md`** — engineering manual: architecture, the save-file contract and
  migration policy, the avatar rig, testing.
- **`docs/HANDOFF-ENGAGEMENT.md`**, **`docs/HANDOFF-UI.md`**,
  **`docs/HANDOFF-PARENTS.md`** — the three prior specialist passes. All three
  independently ran into, and explicitly documented, the same constraint:
  **this app has no server.** `HANDOFF-PARENTS.md` §6.1 is the most direct
  statement of it — it ruled out remote parent visibility and cross-device sync
  *specifically because* no backend existed. That constraint is the thing your
  review is now, deliberately, being asked to reopen. Read that section in full;
  don't rediscover the reasoning from scratch, engage with it directly.

## 3. Where you sit

This review is **orthogonal to the content/UX chain** (engagement → UI →
parents → curriculum), not a link in it — you're being asked about
infrastructure and data architecture, not gameplay or curriculum. Nothing here
should block or be blocked by the curriculum specialist's work, unless your
recommendations touch the word-list data contract (unlikely, but see §7).

## 4. What's actually running today

**The application** (`js/*.js`, `index.html`, `css/styles.css`): a fully
client-side spelling game. Zero build step, zero framework, zero network calls
except the browser's own Web Speech API. All game state — profiles, stars,
avatar customization, word stats, session history, parent-set preferences —
lives in exactly one `localStorage` key (`mila-cartwheel-save-v1`, versioned,
see `CLAUDE.md`'s save-file section). No accounts, no auth, no cloud, by design:
*"Open `index.html` — double-click it, no build step, no server, no
dependencies... works offline."* That sentence has been true since the project
started and is still true today — the Kubernetes deployment didn't change the
app, it just puts a web server in front of the same static files.

**The deployment** (Helm chart at the repo root — `Chart.yaml`, `values.yaml`,
`templates/`):

- A single Deployment, **1 replica**, running `nginxinc/nginx-unprivileged`
  serving the static files verbatim — no server-side logic exists to serve.
- A ClusterIP Service + an Ingress (`ingressClassName: cilium`,
  `cert-manager.io` for a real Let's Encrypt cert via Route53 DNS-01), reachable
  at `spelltumble.sororlab.dev`.
- Basic liveness/readiness probes on `/`. Resource requests/limits are set
  (10m/32Mi requests, 200m/128Mi limits) but never tuned against real load —
  they're guesses appropriate to "serves static files," not measurements.
- **`imagePullPolicy: Always` with `image.tag: latest`** — flag this yourself,
  don't wait for the agent to find it: the CI workflow
  (`.github/workflows/build.yml`) already pushes an immutable
  `:${{ github.sha }}` tag alongside `:latest`, but the Helm values never
  reference it. Today, a pod restarting for *any* reason (node drain, OOM,
  manual delete) can silently pull a newer image than whatever the last ArgoCD
  sync deployed — which quietly defeats the entire point of GitOps
  reproducibility. This is a real, low-risk, low-cost fix regardless of
  whatever else this review recommends.
- Deployed via ArgoCD, GitOps-managed from `homelab-charts`
  (`charts/argocd-apps/values.yaml`), `syncPolicy.automated` — see the git log
  of this repo for the full deployment story if useful context.
- **No persistent volume, no database, no cache, no message queue, no
  observability stack beyond whatever's cluster-wide already** (this cluster
  does run Prometheus/Loki/Grafana for other apps — this app emits nothing to
  them yet, not even basic request metrics).

## 5. The ask, and the fork it represents

"Best practices to expand for performance/reliability/flexibility" is being
asked *because* the app is now cloud-native-deployed, and the project owner
suspects — correctly, probably — that real flexibility gains here mean
**some kind of server-side state**, which is the one thing every prior
specialist treated as off the table. That's not a contradiction to paper over;
it's the actual decision in front of you. Two honest framings, both legitimate,
and it's your job to help pick:

- **"The static app now has a home; keep it exactly what it's always been,
  just hosted."** Performance/reliability improvements stay entirely
  infrastructure-side (§6) — no new data anywhere, `localStorage` stays the
  only save, the "double-clickable folder" story stays 100% intact as a
  fallback, and the Kubernetes deployment is purely a convenience wrapper.
- **"Now that a server exists, use it for the two things localStorage
  structurally can't do."** Concretely, those are almost certainly (a)
  **cross-device sync** — Mila's progress is invisible to any second device
  today — and (b) **remote parent visibility** — a parent dashboard reachable
  without being handed Mila's device, which `HANDOFF-PARENTS.md` explicitly
  wanted and explicitly couldn't have. Both need some minimal backend: identity
  (not necessarily real accounts — a per-profile pairing code/PIN is probably
  enough at this scale), a small datastore, and a sync/merge strategy.

Both are legitimate answers. Recommend one, or a specific narrow slice of the
second (e.g., "add remote read-only parent viewing without touching the save
model yet"), and say why — don't design for both simultaneously.

## 6. What's probably already fine — don't manufacture problems

At 1–3 users on a home LAN:

- A single nginx replica serving static files has no meaningful performance
  ceiling worth optimizing. If you want reliability headroom, `replicas: 2` +
  a `PodDisruptionBudget` is proportionate; a CDN, edge caching, or autoscaling
  is not.
- Cache-control headers on static assets are a real, cheap win (today's nginx
  config sets none, so browsers likely re-fetch on every visit) — worth doing
  regardless of which fork in §5 gets picked.
- There is no load to benchmark against. Don't ask for load-testing
  infrastructure before there's a reason to believe load is a problem.

## 7. If you do recommend a datastore

A few things to weigh in on explicitly, since "a cache or a lightweight
database" covers a wide range of very different amounts of new operational
surface:

- **What actually needs to move server-side** — the whole save file, or just
  the two things localStorage can't do (§5)? Moving everything is a much bigger
  migration (save-version bump, migration path for existing localStorage saves,
  offline-play story) than moving a thin sync/visibility layer that
  localStorage remains the source of truth for.
- **Consistency needs are almost certainly trivial here** — one child, one or
  two devices, essentially never played concurrently on both at once. Last-
  write-wins per profile is probably sufficient; don't reach for
  conflict-free replicated data types or strong-consistency machinery for a
  problem this small.
- **Operational cost is real even at this scale.** A database means backups,
  a schema/migration story, and something new that can go down. A cache
  (Redis or similar) means another stateful thing to run for what might just
  be session data that doesn't need to survive a restart. Weigh a lightweight
  embedded option (SQLite behind a small API, a single Postgres instance
  already used by other apps in this cluster if one exists) against running a
  whole new stateful service, and say which you'd actually pick and why.
- **Auth is the part with real child-safety weight**, however minimal — even a
  "device pairing code" design should not leak one family's data to another,
  and shouldn't require the kind of account system (email/password, OAuth)
  this project has deliberately avoided for a child user. This is worth its
  own explicit recommendation, not an afterthought.
- **If any of this touches what a word *is*** (unlikely, but flag if your
  design implies it) — that's `js/words.js`'s data contract, owned by the
  curriculum specialist; say so explicitly rather than silently assuming it.

## 8. Invariants — check before you break any of these

1. **The offline, zero-server, double-clickable-folder mode must keep
   working**, even if a hosted/synced mode is added alongside it. Her dad
   should still be able to hand someone a copy of this folder and have it work
   with no setup, no account, and no network — that's not negotiable, it's
   the reason this project exists in its current form.
2. **No child-identifying data leaves the household's own infrastructure.**
   Whatever you propose runs on this homelab cluster, not a third-party cloud
   service, and doesn't phone home anywhere.
3. **`node tests/check.js` stays green**, and any new save-shape or sync
   behavior gets equivalent test coverage, matching how `Store.selectReviewPool()`
   was pulled out specifically to be testable (see `CLAUDE.md`'s "Word choice is
   weighted" section for that precedent).
4. **This is not a multi-tenant product.** Don't design an architecture that
   assumes other families will ever use this deployment — that's a hypothetical
   future requirement this project has no reason to carry the cost of today.

## 9. Open questions — yours to answer, and to push back on

- Which fork in §5 — infra-only, or a specific backend-enabled capability?
  If the latter, cross-device sync, remote parent view, or both?
- If a datastore is recommended: what's the smallest thing that actually works
  here, and what's the honest ongoing maintenance cost of running it on a
  homelab (backups, upgrades, someone has to care when it's down)?
- Is "reachable outside the home LAN" actually wanted at all right now, or is
  the current `spelltumble.sororlab.dev` ingress only ever accessed from
  inside the house? That materially changes how much "reliability" and
  "flexibility" are worth investing in right now versus later.
- Anything in §4's deployment (probes, resource sizing, the `latest` tag issue)
  worth fixing regardless of which direction the bigger question goes?

## 10. Onward

**Status: built.** The project owner's answers went further than this
review's own recommendation — real two-way sync, LAN-only, with the database
sharing authority rather than staying a disposable mirror. What shipped:

- A minimal Node.js + `node:sqlite` backend (`server/`, zero npm dependencies
  on purpose — nothing to native-compile in Docker) with four routes:
  `GET /api/health`, `GET /api/profiles/:code`,
  `POST /api/profiles/:code/sync`, `DELETE /api/profiles/:code`.
- **Whole-snapshot, timestamp-wins reconciliation** — deliberately not
  per-field merging or a CRDT, because a single child can't play on two
  devices at the same instant, so a real conflict is a near-impossible edge
  case. `Store.reconcileSync()` (`js/store.js`) is the client-side hook; it's
  fire-and-forget, and silently does nothing offline or with sync off — the
  zero-server folder copy of this game is unaffected either way.
- A pairing code (`Store.enableSync()`/`rotateSyncCode()`/`disableSync()`) is
  both the server-side lookup key and the bearer credential — no accounts,
  matching this project's deliberate avoidance of them for a child user.
- The read-only remote parent view this review originally scoped for came
  along for free once the backend existed: `index.html`'s bootstrap checks
  for `?code=`, and `initRemoteView()` in `js/app.js` reuses the existing
  Progress/Word Detail render functions in a stripped-down mode rather than
  building a parallel display surface.
- Deployed as a second Deployment/Service/PVC in the same Helm chart, routed
  on the same host via a new `/api` ingress path — no new hostname or DNS
  record needed. The `latest`-tag/`imagePullPolicy: Always` issue flagged in
  §4 is fixed: CI now pins both images to the build's immutable commit sha
  and commits that back to `values.yaml` (`[skip ci]`, so it doesn't loop).
- **Not built, by explicit scope decision**: the Docker-build repo-leak and
  `replicas: 2`/PodDisruptionBudget items from §3 are still open — worth a
  fast follow, they just weren't bundled into this pass.

Nothing here touched `js/words.js` — flagging that explicitly for the
curriculum specialist, same as `HANDOFF-PARENTS.md` did.

**Addendum: sync flipped from opt-in to opt-out.** The project owner wanted
sync to be the primary mode, not a dashboard setting a grown-up has to
discover — "no matter what device we use, it has the latest profiles and
avatar designs" — with "run local-only" as the deliberate toggle instead.
Shipped as: every profile gets a pairing code the moment it exists
(`Store._autoProvisionSync()`, called from `load()` for every profile in the
file — not just the active one — and from `createProfile()`), and
`Store.save()` itself now debounces a `reconcileSync()` push, so syncing
piggybacks on the one chokepoint nearly every mutation already calls instead
of requiring each call site to remember to trigger it (that gap was real: the
old wiring only synced after Focus-tab edits, never after a session's stars
or an avatar purchase). Existing profiles from before this shipped are
auto-provisioned too, on their next load — the project owner explicitly chose
that over a one-time consent prompt or leaving old profiles opted out. A new
`sync.localOnly` flag is the opt-out, flipped from Settings ("Play offline
only"); `_autoProvisionSync()` respects it and leaves a local-only profile
alone. Invariant §8.1 (offline mode keeps working) and §8.2 (no data leaves
the household's own infra) are both unaffected — this only changes the
default polarity of an already-self-hosted, already-fire-and-forget
mechanism, not what it talks to or whether offline play still works.
**Unchanged, and worth being explicit about:** there is still no account
system, so a device that has never seen a given profile still needs that
profile's pairing code once (`Store.linkWithCode()`) to link to it —
"automatic" describes what happens after that one pairing step, not
discovery across an arbitrary unpaired device.

## 11. Second pass — the project owner retires §8.1

Everything above this section was written when §8.1 ("the offline,
zero-server, double-clickable-folder mode must keep working") was treated as
non-negotiable. It was the single biggest constraint shaping every decision
in this doc — why sync stayed fire-and-forget, why `localStorage` stayed
authoritative, why there was no build step. The project owner revisited that
specifically, on the grounds that the game is now deployed to a real
Kubernetes platform and doesn't need to also work as a folder someone
double-clicks with zero setup. That's a deliberate reversal of §8.1, not an
oversight — everything else in §8 (no child-identifying data leaving the
household's infra, `node tests/check.js` staying green, no multi-tenant
assumptions) is unaffected and still holds.

Three things shipped once that constraint was gone, in order of increasing
risk:

**A real build step + ES modules.** The reason `js/*.js` used classic
`<script>` tags sharing one global scope instead of `import`/`export` was
specifically that browsers refuse ES modules over `file://` — that's the
exact mechanism §8.1 required. With it gone, `js/*.js` became real ES
modules with an explicit dependency graph (see the "Layout" section of
`CLAUDE.md`), bundled by `build.js` (esbuild) into `dist/game.js`, which
`index.html` loads with one plain `<script>` tag. `tests/check.js`'s
classic-script-concatenation trick for its 6 non-DOM files broke under real
modules and was replaced with a small esbuild-bundled barrel entry
(`tests/testEntry.js`); `tests/screenshots.js` similarly moved from reaching
into implicit page globals to reading an explicit `window.__app` debug
surface `app.js` now exposes on purpose. TypeScript was added as a
type-*checking* pass only (JSDoc + `tsc --noEmit`, non-blocking in CI for
now) — not a `.ts` rewrite, which would have been disproportionate risk for
6,300 lines of tightly-coupled existing code in one pass. The root
`Dockerfile` became multi-stage (build in `node:22-alpine`, serve from
`nginx-unprivileged`), and `.github/workflows/build.yml` gained its first
test coverage ever (`npm test` now gates both image pushes; it previously
had none).

**Server-authoritative sync**, narrowly scoped: only *when* the server is
trusted over the local copy changed, not the whole-snapshot/timestamp-wins
model itself (still correct at this scale — see §7's own reasoning, which
doesn't change here). `Store.syncOnBoot()` — testable the same way
`Store.selectReviewPool()` was pulled out for testability — pulls from the
server on boot with a bounded timeout before the app renders, adopting the
server's copy if it's newer; `localStorage` is now explicitly the fallback
used when the authoritative source can't be reached in time, not the thing
trusted by default. `app.js`'s `init()` became `async` to `await` this — the
only boot-order change. Two new profile fields, `sync.pending` and
`sync.lastError`, make push failures visible in the Grown-Ups dashboard
instead of silently dropped, and a push that never confirmed retries on the
next boot instead of being lost. No server route or schema changes were
needed — this is entirely a client-side behavior change in `store.js` plus
one call site in `app.js`. `sync.localOnly` stays supported as a degraded
mode (a flaky home network is still real), just reframed from "the
sanctioned alternative to a server that might not exist" to "an explicit
opt-out."

**A real backup story for the SQLite database**, Tier 1 only. The database
had zero backup mechanism before this — a single file on a single-replica
PVC. `server/db.js` gained a `backup()` function using SQLite's own
`VACUUM INTO`, producing consistent snapshots with no WAL mode and no
external tools needed; `server/index.js` runs it on an interval with
retention pruning, writing to a `backups/` subdirectory on the *existing*
PVC — deliberately not a new container image, since `.github/workflows/build.yml`'s
CI does a blanket `sed` rewrite of every `tag:` key in `values.yaml` to the
app's own git sha, which would silently clobber a second image's tag if one
were introduced. This protects against in-app mistakes (the unauthenticated
`DELETE /api/profiles/:code` route, a bad future migration) but explicitly
**not** node/disk loss, since it's the same physical volume. Off-node
shipping (litestream + object storage, restic, rclone) is flagged as
follow-up work, not solved here — confirmed with the project owner that no
S3/MinIO/NFS exists yet in this cluster to ship to. When that changes, the
CI `sed` regex needs revisiting at the same time, for the reason above.

**Deliberately not done in this pass:** Postgres, Redis, or any other
shared datastore — no shared Postgres exists in this cluster, and the scale
calibration in §1 is completely unchanged by any of this. Retiring §8.1 was
about where the game runs and how its state is authoritative, not about how
many users it serves.

## 12. Third pass — a real incident, and PIN-gated profile selection

This pass was triggered by an actual data-integrity incident, not a planned
follow-up. The live database (11 rows) had accumulated three "Mila" profiles
and four "Layla" profiles — mostly empty accidental duplicates — plus one row
literally named "Vak3ns", because someone had typed a pairing code into the
plain-text "name" field on the "add another player" screen, which was the
only input that screen offered. The root cause: "add another player" always
called `createProfile()` and built a brand-new blank profile. There was no
path to bring an *existing* profile to a new or cleared device except typing
its exact 6-character code into a small text field — a code nobody in the
household had memorized, so in practice every new device just got named
again, and the household's data fragmented across more and more empty rows.
Cleaning up the existing duplicates was explicitly left to the project
owner, via the existing `/admin` page — this pass does not delete, merge, or
rename any existing server row, by deliberate scope decision.

**What shipped: a household profile directory, PIN-gated selection.** The
project owner's own framing: "I like the pin system. The profiles should be
shown, but to actually select they need to use a pin (or set one if it
wasn't set, for example the existing profiles)." Concretely:

- `server/db.js`'s `profiles` table gained a nullable `pin_hash TEXT`
  column. Since `CREATE TABLE IF NOT EXISTS` is a no-op against the already-
  existing 11-row live table, `openDb()` also runs an `ALTER TABLE ... ADD
  COLUMN`, wrapped in a try/catch that treats "duplicate column name" as
  success — safe against both a brand-new database (which already has the
  column from the `CREATE TABLE` itself) and the real deployed one. Every
  pre-existing row ends up with `pin_hash = NULL`, meaning "no PIN claimed
  yet" — true of every profile that existed before this pass, by
  construction.
- PINs are hashed with Node's built-in `crypto.scryptSync(pin, salt, 64)`
  (a random salt per profile, stored as `salt:hash` in the one column) and
  verified with `crypto.timingSafeEqual` — the exact same pattern
  `passwordMatches()` already used for the admin password, and zero new
  dependencies, matching this server's existing zero-npm-deps rule.
- Three new routes, all in `server/index.js`: `GET /api/profiles` (a lean,
  unauthenticated directory — `{ code, name, stars, medals, dayStreak,
  hasPin, updatedAt }` per row, never the hash itself), `POST
  /api/profiles/:code/pin` (claim-only — 404 unknown code, 409 if a PIN is
  already set, 400 on a bad PIN shape, otherwise hashes and stores it), and
  `POST /api/profiles/:code/unlock` (verifies a PIN and, on success, returns
  the same `{ code, updatedAt, snapshot }` shape `GET /api/profiles/:code`
  already returns, so the client's adoption logic could be shared). All
  three are unauthenticated, same as every other `/api/profiles` route —
  this app's threat model has always been "internal household use only,"
  not a public auth boundary, and the two existing machine-to-machine sync
  routes (plain `GET /api/profiles/:code`, `POST /api/profiles/:code/sync`,
  used by `Store.reconcileSync()`/`Store.syncOnBoot()`) were not touched at
  all — the PIN gate is specifically for the human "which profile am I"
  moment, not the background sync loop.
- `/unlock` carries an in-memory, per-process rate limit (5 wrong PINs locks
  a code out for a minute) — a comment in `server/index.js` is explicit that
  this is a best-effort speed bump appropriate to a household tool behind a
  home LAN, not a claim of real security. It has no persistence and resets
  on a server restart, same reasoning as the admin session `Set`.
- **Why PINs, not something heavier:** an account system (email/password,
  OAuth) is exactly what this project has deliberately avoided for a child
  user from the start (see §7's own reasoning). A short numeric PIN, shown
  as a card the household already recognizes by name/stars/medals rather
  than a bare code, is proportionate to "stop a kid from picking the wrong
  sibling's profile or overwriting it by accident" — which is the actual
  failure mode this incident exposed — without pretending to be real
  authentication against an outside attacker. It's also literally what the
  project owner asked for.
- **Client (`js/store.js`):** `Store.fetchDirectory()` wraps `GET
  /api/profiles`, returning `[]` on any failure rather than throwing, same
  as every other sync call in this file. `Store.claimPin()`/
  `Store.unlockProfile()` wrap the two new routes.  `unlockProfile()`
  reuses the exact dedup guard `linkAdditionalProfile()` used to have (an
  already-linked code reuses its existing local profile rather than
  duplicating it) but, unlike that function, also switches the active
  profile — a human just explicitly picked a name and typed a PIN, which is
  a deliberate "play as her now" action. `linkAdditionalProfile()` itself
  is retired (no caller survives it); `linkWithCode()` is **not** retired —
  it's still the mechanism behind the Settings tab's "already have this
  profile's code" re-link flow for an already-claimed device, which is a
  different, still-valid feature this pass didn't touch.
- **Client (`js/app.js`, `css/styles.css`):** `renderProfiles()`/
  `wireProfiles()` were rewritten. The picker (both the first-run version
  and the "switch player" version — they now share one code path) fetches
  the household directory every time it opens and renders every row as a
  card, merged with any purely local `sync.localOnly` profiles on this
  device (those deliberately never have a server row — see
  `blankProfile()`'s own comment — so they'd otherwise vanish from the
  list entirely). Clicking a card with `hasPin: true` opens an inline PIN
  box; clicking one with `hasPin: false` opens an inline "set a PIN for
  {name}" box instead — both styled after the Grown-Ups dashboard's own
  math gate (`renderGate()`) for visual consistency, not a new bespoke
  component. The old "Already playing on another device? [CODE] [Link this
  device]" text field is gone entirely, superseded by the directory itself.
  Creating a brand-new profile (first-run "Let's go" or "+ Add player") now
  also asks for a PIN as part of the same form, and claims it in the
  background right after the profile's pairing code is confirmed to exist
  on the server (an explicit `reconcileSync()` call first, since
  `_autoProvisionSync()`'s own push is fire-and-forget and the row might
  not have landed yet) — best-effort: if the server isn't reachable at
  profile-creation time, she still gets to play immediately, and the very
  next time a grown-up picks her from the directory, the same "no PIN yet"
  retrofit prompt an old profile gets covers it.
- **Local-only profiles are deliberately never PIN-gated.** They have no
  server row by definition (that's what local-only means), so there's
  nothing to hang a server-verified PIN off of. Selecting one from the
  picker just switches to it directly, exactly like every card behaved
  before this pass. A future pass could invent a client-only PIN for this
  case; nobody asked for it, and the risk it protects against (mixing up
  which profile is active on one shared, offline-only device) is smaller
  than what motivated this pass in the first place.

**Duplicate-name prevention**, the direct fix for tonight's actual incident:

- **Client-side**: before creating any profile, the typed name is trimmed,
  lowercased, and checked against every name already known to this device —
  the fetched directory rows plus every local profile (`nameCollides()` in
  `js/app.js`). A collision blocks creation with an inline message ("That
  name's already taken — try another, or find them in the list above")
  instead of silently producing a duplicate. The one deliberate carve-out:
  the first-run "Let's go" flow renames the still-unclaimed placeholder
  profile in place rather than creating a new one (existing precedent,
  unrelated to this pass), so the collision check excludes that placeholder
  from the local comparison — otherwise typing the default "Player 1" back
  as your own name would flag itself as a collision.
- **Server-side, defense-in-depth**: `POST /api/profiles/:code/sync` now
  parses the incoming snapshot's `name`, normalizes it the same way, and
  rejects the push with `409 { error: "name already taken", name }` if any
  *other* row already has that name. `Store.reconcileSync()` surfaces this
  as a distinct, readable `sync.lastError` ("another profile is already
  named "X" — rename this one to sync again") rather than the generic
  "sync failed (409)" every other non-2xx status gets, so a parent checking
  Settings can actually tell what happened and act on it. This is
  deliberately simple, matching this project's existing "timestamp-wins,
  not a real conflict system" spirit (§7, §11 above) — a genuine race
  between two devices creating the same name at the same instant is an
  accepted edge case here, same as everywhere else in this sync design. It
  is **not** retroactive: the household's existing duplicate "Mila"/"Layla"
  rows keep syncing exactly as before (their own re-syncs never collide
  with themselves), and cleaning those up is still the project owner's own
  job via `/admin`, untouched by this pass.

**Verification.** `node server/test.js` covers the directory endpoint
reflecting `hasPin` before/after a claim, claiming a PIN (fresh profile,
then a second claim 409ing), unlocking with the right/wrong/no-PIN-yet PIN,
an unknown code, the rate limit actually tripping after 5 wrong attempts
(rejecting even the *correct* PIN while locked out), and the sync
duplicate-name guard (rejecting a collision, allowing a profile to re-sync
its own unchanged name). `node tests/check.js`, `npm run build`, and `npm
run typecheck` were all re-run clean — typecheck's pre-existing 22 errors
(untyped `SKILL_BY_ID`, `window.__app`, etc., all present in the exact same
form in the pre-this-pass `HEAD` commit) are unchanged in count and kind;
nothing new was introduced.

**Deliberately deferred, on purpose:**

- **A "change my PIN" or "forgot my PIN" flow.** The claim-only route is
  intentional — this pass only had to solve "every existing profile has no
  PIN yet," not "a PIN was set and needs to change." A recovery story for a
  forgotten PIN on a household tool (email reset doesn't exist here; SMS
  doesn't either) is a real product decision the project owner should make
  deliberately — e.g. "the admin page can clear a PIN" — rather than
  something to guess at while fixing a duplicate-profile incident.
- **Ghost placeholder rows.** `Store._autoProvisionSync()` (unchanged by
  this pass, and out of scope to change) pushes a profile's first snapshot
  to the server the moment `load()` runs, *before* a first-run visitor has
  typed a real name — meaning a "Player 1" row can land on the server from
  someone who opened the game once and never named themselves. This is
  very likely a real contributor to the duplicate-row count in the live
  database, and the new directory now makes those rows visible as cards
  too. Worth a future pass revisiting whether `_autoProvisionSync()` should
  wait for a real name before its first push — not fixed here, since it's a
  different mechanism than the one this pass was scoped to (profile
  *selection*, not profile *provisioning*), and changing it risks the same
  "load() must stay side-effect-free" invariant documented in CLAUDE.md's
  bug-fix list.
- **Cleaning up the 11 existing rows.** Explicitly the project owner's own
  job via the existing `/admin` page, per their own instruction. No code in
  this pass deletes, merges, or renames a server row.
