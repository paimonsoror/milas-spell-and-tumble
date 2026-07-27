# Mila's Spell & Tumble Championship

A browser spelling game for an 8-year-old who loves gymnastics and cheer. She hears
a word, types it, and a customisable cartoon gymnast performs a skill — cartwheel,
back handspring, toe touch — when she gets it right. Correct answers earn stars that
unlock avatar items; competition mode scores a routine out of 10 with three judges.

> **Handoff chain:** specialists work this file in sequence, each briefing the next.
> Read the relevant brief before making design changes so you don't undo something
> on purpose-by-accident.
>
> 1. `HANDOFF-ENGAGEMENT.md` — child engagement / reward psychology. **Done.** Its
>    §3 table marks which numbers are load-bearing and which are placeholders; §4
>    records which questions it resolved and which are still open.
> 2. `HANDOFF-UI.md` — children's-game UI and visual design. **Active.** Ranked
>    interface problems, the open visual questions, and the hard constraints that
>    invalidate a normal design toolkit.
> 3. `HANDOFF-PARENTS.md` — parental controls / child app management. **First
>    pass done.** Added a Focus tab (review-mix slider, word pinning, a
>    freeform note), per-word "needed help" tracking, and a read-only
>    cross-profile peek. Its §8 tells the curriculum specialist exactly what
>    hook to extend for real pattern/phonics targeting.
> 4. Curriculum specialist, who will own `js/words.js` and the word content.
>
> Running **in parallel** to the content chain above, since it's an
> infrastructure question, not a gameplay one:
>
> - `HANDOFF-ARCHITECTURE.md` — cloud-native architecture review of the
>   Kubernetes deployment. **First pass built.** "No server" no longer holds:
>   a minimal Node.js + SQLite backend (`server/`) now enables cross-device
>   save sync and a read-only remote parent view via a pairing code, both
>   opt-in and both fire-and-forget from the client's side, so the offline
>   zero-server folder copy of this game is unaffected either way. Its §10
>   is the exact hook for whoever touches this next.

## Running it

Open `index.html` — double-click it, no build step, no server, no dependencies.
Everything is plain `<script>` tags (deliberately **not** ES modules, which browsers
refuse to load over `file://`). Progress lives in `localStorage`.

Chrome, Edge, or Safari are needed for read-aloud; the game detects a missing
Web Speech API and flashes the word on screen instead.

## Layout

| File | Responsibility |
|---|---|
| `index.html` | All seven screens as `<section class="screen">`, plus the arena scenery SVG |
| `css/styles.css` | Everything visual. No framework. |
| `js/words.js` | 252 words across grades 1–5 + a gym/cheer list, each with a sentence |
| `js/avatar.js` | The jointed SVG figure (`Gymnast`), the unlock catalog, pose helpers |
| `js/skills.js` | Skill keyframe data + the `Animator` that tweens between poses |
| `js/audio.js` | `Speaker` (Web Speech) and `Sfx` (synthesised WebAudio), voice presets |
| `js/store.js` | localStorage persistence, profiles, stats, custom word lists |
| `js/app.js` | Screens, game loop, avatar studio, coach's voice, grown-ups dashboard |
| `server/` | Optional cross-device sync backend (Node.js + SQLite, zero npm deps) — see `docs/HANDOFF-ARCHITECTURE.md`. Also serves the hidden `/admin` operator page (`server/admin.html`). |

Load order matters — `app.js` last, `words.js` first. They share globals rather than
importing.

`server/` is a separate deployable, not part of the client bundle — the game itself
still has no build step and still runs from a double-clicked `index.html` with zero
setup. It only ever gets talked to if a profile opts into sync (`Store.enableSync()`);
every call to it is fire-and-forget from `js/store.js`, so a missing or unreachable
server changes nothing about how the game plays.

## The avatar rig — read this before touching a skill

`Gymnast` builds one SVG figure from nested `<g>` joints. Geometry is local to the
hips, defined in `RIG`.

**Angle conventions.** Every limb segment is drawn pointing straight down from its
pivot, so `0` always means "hanging down", and SVG's positive rotation is clockwise
on screen:

- **arms** — `0` at her side, `180` straight overhead, `-90` forward
- **legs** — `0` straight down, negative = forward, positive = behind
- **knees** — positive brings the heel up behind her
- **torso** — negative leans forward
- **rot** — whole-body rotation. `180` is upside down (handstand).
- **py** — negative is airborne; **px** — travel along the floor
- **sq** — landing squash, `0..1`

Two rules that are easy to get wrong:

1. **`travel` must equal the final frame's `px`.** The animator adds `travel` to
   `origin.x` when a skill ends; if they disagree she teleports. `tests/check.js`
   asserts this for every skill.
2. **Hands only reach the floor at specific angles.** Her palms sit 72 units from
   the hip along the body axis, so at `rot: 180` the hip must be ~18 above standing
   (`py: -19`) for a handstand to look planted, and at `rot: 118` it must be ~16
   below (`py: 16`). The handstand skill has explicit hands-planted keyframes for
   exactly this reason — without them she floats horizontally through mid-air.

**Zoom.** `opts.zoom` wraps the figure in a group that scales about a pivot on the
floor, so she gets bigger without lifting off the mat. The arena uses `1.2`. This
means arena travel bounds are *pre-zoom* and must stay well inside `0..700`, and
tall jumps (basket toss) get amplified — its peak is capped so her head stays in
frame.

### Adding a skill

Append to `SKILLS` in `js/skills.js`. Frames are partial poses — anything omitted
snaps back to `NEUTRAL_POSE`, which keeps them readable. Then:

```
node tests/check.js          # validates frame times, travel, pose keys, easing names
```

and open `tests/poses.html` in a browser: it renders every skill as a strip of nine
interpolated frames. That contact sheet is by far the fastest way to see whether a
move reads correctly — it is how the handstand float and the "bow looks like cat
ears" problems were caught.

`difficulty` (1–5) gates when a skill appears: `chooseSkill()` raises the ceiling as
her streak grows, so hard skills are a reward for a run of correct answers.

## Save file

One localStorage key, `mila-cartwheel-save-v1`, holding **version 2** of the shape.

```
{ v: 2, activeId, order: [ids], profiles: { id: <player data> } }
```

Each player's data has exactly the shape the entire save used to have, and
`Store.data` always points at the active player. That is deliberate: every call site
says `Store.data.stars` and does not know profiles exist. `Store.file` is what gets
written.

Two profile fields drive the engagement loop and are worth knowing about:

- **`goal`** — `{ slot, id }` or `null`. The item she pinned in the studio. `null`
  means "auto", and `nextGoal()` in `app.js` falls back to the cheapest item she
  cannot yet afford, so the progress bar always has something just out of reach.
- **`visit`** — `{ lastDay, dayStreak, bestDayStreak, lastBonusDay }`. Days are
  local `YYYY-MM-DD` keys compared with `daysBetween()`, which counts calendar
  days rather than milliseconds so daylight saving cannot break a streak.
  `registerVisit()` is idempotent within a day and is called from
  `applyProfileSettings()` — every profile has its own streak.
- **`prefs`** — `{ pinned: { [word]: "boost"|"retire" }, reviewMix, focusNote }`.
  What a grown-up has asked the game to concentrate on, from the Grown-Ups
  dashboard's Focus tab. `Store.selectReviewPool()` is the one function that
  reads `pinned`/`reviewMix`; `focusNote` is display-only and never read by
  the game itself.
- **`sync`** — `{ code, lastSyncedAt }`. Cross-device sync opt-in — see
  `docs/HANDOFF-ARCHITECTURE.md`. `code` is `null` until a grown-up turns sync
  on; every sync call is fire-and-forget and silently no-ops without one.

- `migrate()` wraps a bare v1 save (no `profiles` key) into the file's first profile.
- Every profile is merged onto a fresh `blankProfile()` on load, so saves written by
  older builds gain newly added settings instead of breaking. **Keep doing this** —
  add new settings with a default in `blankProfile()` and old saves pick them up.
- Items costing 0 stars are owned implicitly, never written to `owned`, so adding a
  new free item retroactively unlocks it.
- All localStorage access is wrapped in try/catch; the game runs fine (just without
  saving) in private-browsing modes that throw.

## Decisions worth knowing

**Missing a word is a teaching moment, not a penalty.** She gets three real
attempts at a word before anything is revealed. Each miss highlights her typed
letters green/wrong in place (`markLetters()` + `.lb.ok`/`.lb.bad` in
`js/app.js`/`css/styles.css`) without ever printing the correct spelling — the
point is to keep her recalling it, not copying it. Only after the third miss
does it fall back to a multiple-choice pick (`startMultipleChoice()`) as a
last scaffold, which is also the first moment the correct spelling appears on
screen. Streak resets on the *first* miss only — a second or third try that
also misses doesn't pile on. Getting there on try 2, try 3, or the
multiple-choice pick all pay the same modest "+1 ⭐ for learning it"
(`rewardFix()`); only a clean first try pays the full points/streak/skill
reward. The tone never turns punitive at any step — the wrong-answer sound is
a soft two-note "hmm", never a buzzer.

**Asking for a clue is free.** Hints used to cost 4 points and halve the star
award, which penalised exactly the child who most needs support. Now every correct
word pays 2 stars whichever way she got there, and working it out unaided pays a
visible **+1 bonus** on top. `judgeScores()` follows the same shape — a `soloRate`
bonus, never a hint deduction — so a score can't drop below what her accuracy
earned. Its base constant came down from 3.2 to 2.7 to make room, because bolting
the bonus on top pushed a 5-of-6 routine into gold.

**The dot row records progress, not failure.** It sits on screen the whole
session, so a miss is a hollow "still learning" ring, never a red mark — and it
fills in gold once she retypes the word correctly. `session.marks` holds
`"ok" | "learning" | "fixed"`, and `checkFix()` upgrades the last entry.

**Stars point at one named thing.** An abstract balance is hard to want, so a
progress bar toward the next unlock appears on the home, game, results and studio
screens. `paintGoal()` patches the numbers in place while the goal is unchanged —
rebuilding the markup would restart the CSS width transition, and the HUD repaints
after every word.

**Coming back is rewarded.** Consecutive days build `visit.dayStreak`, and the
first *finished* routine of a day pays `5 + min(dayStreak,5)*2` stars. The bonus is
for doing the work, not for opening the app.

**Everyone medals.** Below bronze is a participation ribbon, worth 4 stars. The
scoring in `judgeScores()` is deliberately generous.

**Word choice is weighted, and a parent can steer it.** `buildQueue()` fills part
of a routine from words she has previously missed (about a third by default),
so practice circles back to the hard ones. The actual pool-splitting logic is
`Store.selectReviewPool()` (`js/store.js`), kept separate from `buildQueue()`
specifically so it's reachable from `tests/check.js`'s vm context. A grown-up
can adjust the ratio and pin individual words as "practice more" or "ease off"
from the dashboard's Focus tab (`js/store.js` `prefs.reviewMix`/`prefs.pinned`);
easing off a word only lowers how often it's weighted in, it never removes it
from her curriculum entirely.

**Try before you buy.** Tapping a locked studio item previews it on the figure;
stars are only spent on the explicit Buy button. The arena figure always shows what
she actually owns, never the try-on.

**Letter boxes reveal word length**, which is a real hint. It is on by default
because it helps at this age, and there is a toggle in the grown-ups settings.

**Voices are presets, not raw voices.** Installed system voices differ wildly per
machine, so `VOICE_PRESETS` pairs a *preference list* of voice-name patterns with a
pitch/speed treatment. A preset still works when none of its preferred voices exist —
it just sounds less distinct. `say()` takes rate/pitch as **multipliers** of the
chosen coach voice so "slowly" and "spell it out" stay in character.

**No external assets.** No fonts, images, or audio files — the figure is SVG, sound
effects are synthesised in WebAudio, the crowd is generated. Keeps it a single
double-clickable folder that works offline.

**Cross-device sync is whole-snapshot and timestamp-wins, on purpose.** A single
child can't play on two devices at the same instant, so a real conflict between
devices is a near-impossible edge case — not worth field-level merging, CRDTs, or
an operation log. `Store.reconcileSync()` sends the whole profile; whichever side
(the device or the server) has the later timestamp wins outright, and the loser's
differences are gone. If that assumption ever stops holding — e.g. two kids
sharing one synced profile from different devices at once — revisit this rather
than patching around it.

**The `/admin` page is a household-owner tool, not a player-facing surface.**
It's server-rendered by `server/index.js` (`GET /admin`, plus a small
`/api/admin/*` API) and shows, across every synced profile: stars, streaks,
accuracy, per-profile drill-down (the full parsed snapshot as a collapsible
tree), and a raw dump of the SQLite `profiles` table — deliberately fixed
views rather than an ad-hoc SQL box, since the schema is one table. It's
gated by a single shared password: `POST /api/admin/login` checks it against
`ADMIN_PASSWORD` (a K8s Secret, never committed) and hands back a random
session token kept in an in-memory `Set` — real logout, at the cost of every
session ending on a server restart, which is fine since re-entering the
password is the whole interaction. The page is disabled outright
(`ADMIN_PASSWORD` unset) unless `server.adminPasswordSecretName` is set in
the Helm values, so it stays off by default rather than accidentally exposed.
Deleting a profile from the page reuses the existing public
`DELETE /api/profiles/:code` route rather than a duplicate admin-only one.

## Testing

```
node tests/check.js          # logic: skills, animator, store, profiles, word lists
node tests/screenshots.js    # writes self-driving copies of index.html to _debug/
```

`tests/check.js` runs the real game files in a `vm` context with a stubbed
`localStorage` and a **hand-cranked frame clock**, so the `Animator` can be driven
deterministically without a DOM. It covers the animator regressions specifically —
idle hand-off, travel accounting, promise ordering, facing flips.

`_debug/` is generated output and safe to delete.

### Headless browser gotchas

Screenshots were taken with `msedge --headless=new --screenshot`. Three traps cost
real time here, so if you go back to it:

- **`--virtual-time-budget` barely advances `performance.now()` and fires almost no
  rAF** (measured: 3 callbacks and 29 ms of `performance.now()` across 4 s of
  `setTimeout` time). Animations cannot run. Drivers must call `advance()` themselves
  rather than waiting for a skill to finish, and pose the figure by hand.
- **CSS animations are stuck at 0%** for the same reason, so anything with
  `fadeUp` renders at `opacity: 0` and looks blank or washed out. Inject
  `* { animation: none !important }` before screenshotting.
- **Edge caches `file://` pages in a reused `--user-data-dir`.** Use a fresh profile
  directory per run or you will screenshot stale HTML.

## Bugs already fixed — don't reintroduce

- **The idle loop blocked every skill.** `Animator.play()` only called `_next()` when
  nothing was playing, but the idle animation loops forever and so never yields. No
  skill ever animated. `play()` now also interrupts when `current.loop` is set.
- **"Next word →" replayed the same word.** The button advanced without incrementing
  `session.index`, while the auto-advance path did. There is now exactly one
  `advance()`, it is idempotent per word, and every path funnels through it.
- **Stacked listeners on re-render.** Tab panels are re-rendered by replacing
  `innerHTML`, so handlers bound *inside* a render function accumulate one copy per
  render. Delegated handlers for `#tab-lists` and `#tab-players` live in
  `wireParents()` and are bound once.
- **Triangular bows read as cat ears** at avatar scale; they are rounded loops now.
- **Her head overlapped the crowd.** The stands are three rows, not four, leaving a
  clean barrier wall behind her.
