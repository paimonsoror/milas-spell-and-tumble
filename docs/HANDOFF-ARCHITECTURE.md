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

If you recommend adding server-side state, the curriculum specialist (still
next in the content chain, not yet engaged) and any future UI/parents work
should inherit a clear, explicit description of: what moved server-side, what
stayed in `localStorage`, and what a client does when it's offline. Write that
down the same way `HANDOFF-PARENTS.md` §8 wrote down its hook for the next
specialist — a function/module name, not just a paragraph of intent.
