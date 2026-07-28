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
> 2. `HANDOFF-UI.md` — children's-game UI and visual design. **Active — a
>    graphics-focused pass just landed.** Ranked interface problems, the open
>    visual questions, and the hard constraints that invalidate a normal design
>    toolkit. Its §9 records what a later graphics pass shipped: the Avatar
>    Studio visual dress-up turned out to already be done (nobody had marked it
>    so); new work added a fifth facial expression plus an idle blink to
>    `Gymnast`, put her on the Results and Home screens for the first time, and
>    fixed the arena's colours (and a real invisible-confetti bug) so they route
>    through `:root` instead of hardcoded hex. Tablet layout, palette
>    saturation, tile hierarchy, and the monospace-letterform question are all
>    still exactly as open as §5/§6 originally found them — this pass was
>    scoped to graphics, not layout or interaction.
> 3. `HANDOFF-PARENTS.md` — parental controls / child app management. **First
>    pass done.** Added a Focus tab (review-mix slider, word pinning, a
>    freeform note), per-word "needed help" tracking, and a read-only
>    cross-profile peek. Its §8 tells the curriculum specialist exactly what
>    hook to extend for real pattern/phonics targeting.
> 4. `HANDOFF-CURRICULUM.md` — the curriculum specialist who owns `js/words.js`
>    and the word content. **Done.** All 261 words across `g1`-`g5` and `bonus`
>    were reorganized into named phonics/morphology clusters (short vowels →
>    blends/digraphs → silent e/vowel teams → prefixes/suffixes/doubling →
>    Latin suffixes/roots), sentences were audited against misleading
>    homophones, and `tests/check.js` now enforces the design (no word repeats
>    across `g1`-`g5`, no word repeats within a list, average word length
>    climbs every grade). Nobody is downstream yet — see its own §7 for the
>    two open questions it resolved (no `g1`/explorer bridge is needed, and
>    pattern clusters live as source comments, not new per-word metadata) and
>    why.
>
> Running **in parallel** to the content chain above, since it's an
> infrastructure question, not a gameplay one:
>
> - `HANDOFF-ARCHITECTURE.md` — cloud-native architecture review of the
>   Kubernetes deployment. **Second pass built.** The first pass's "no
>   server" invariant already fell (a minimal Node.js + SQLite backend now
>   enables cross-device save sync and a read-only remote parent view). This
>   pass retired a second invariant, explicitly this time, by the project
>   owner's own call: the double-clicked, zero-build `index.html` folder
>   copy no longer needs to keep working, since the game is deployed to a
>   real Kubernetes platform now. That unlocked a real build step (esbuild +
>   ES modules, replacing the 8-`<script>`-tag global-scope setup), flipped
>   the sync server from a best-effort mirror to the authoritative copy
>   (`Store.syncOnBoot()`), and added a real backup story for the SQLite
>   database (in-process `VACUUM INTO` snapshots + retention). Its §11 is
>   the addendum recording exactly what shipped and what's still deferred
>   (off-node backup shipping, `.ts` conversion beyond JSDoc checking).
>
> Also ran **in parallel**, triggered by a second, younger sibling (age 5)
> now wanting to play:
>
> - `HANDOFF-EARLY-LEARNER.md` — preschool/kindergarten curriculum and
>   age-tailored experience. **Done.** Added a whole separate "explorer" track
>   (`js/letters.js`, a Letter Play screen, its own home-screen tiles) for
>   letter-name and letter-sound recognition, plus the age/stage-awareness the
>   app never had — a per-profile `stage` field (`"speller"` | `"explorer"`,
>   grown-up-set, defaulting to `"speller"` so no existing save changed) and an
>   `earlyLearner` progress bucket in `js/store.js`. Deliberately did not touch
>   `js/words.js`/`WORD_LISTS`, and Mila's own experience and save are
>   unregressed. Its §5/§9 record the open seam between this track and item 4
>   above — read that before assuming `g1` is the automatic next step after it.
> - `HANDOFF-SPEECH-AND-LANGUAGE.md` — a second branch off the early-learner
>   track, for the same 5-year-old: pronoun-case practice ("she" vs. "her",
>   widened to also cover "he"/"him" and "they"/"them" per the project
>   owner) and a "th"-vs-"f" listening-discrimination activity that echoes
>   her actual speech therapist's tactile cue. **Done.** Added `js/language.js`
>   (its own content shape, deliberately not `WORD_LISTS` or `LETTERS`) and one
>   new "Language Play" screen covering both activities — picking a home tile
>   picks the activity, so the two share a screen without a mid-session mode
>   switch. Both are receptive tap-to-choose tasks, always exactly two
>   choices (a real binary, not `chooseOptionCount()`'s 2-4), no explicit
>   levels (neither task has a real difficulty ladder the way letter
>   name-then-sound does — weighted item selection alone carries difficulty),
>   and the same every-4th-correct reward cadence as Letter Play. No
>   microphone anywhere in this app, so the "th"/"f" activity — and the
>   Grown-Ups dashboard note about it — are explicit that it tests whether
>   she can *hear* the difference, never a grader of her actual speech.
>   Nobody is downstream of this yet.

## Running it

**This changed.** Through the graphics/curriculum/early-learner handoff chain
above, this section said "double-click `index.html`, no build step, no
dependencies" — that was true because the game had to keep working as a
folder someone could hand off with zero setup. Once the game was deployed to
a real Kubernetes platform, the project owner made the explicit call to
retire that invariant (`docs/HANDOFF-ARCHITECTURE.md`'s second pass) in favor
of a real build step. **For local development**, run `npm install` once,
then `npm run build` to produce `dist/game.js`, and open `index.html` as
before — it now loads that one bundled script instead of eight separate
`<script>` tags. Progress still lives in `localStorage` (see "Save file"
below for how that interacts with sync).

`js/*.js` are real ES modules now (`import`/`export`), bundled with esbuild
(`build.js`) into a single classic script — so the *built* `dist/game.js`
still loads with a plain `<script src="dist/game.js">`, no `type="module"`,
no CORS/`file://` restrictions to work around. The source files themselves
do use `import`/`export`, though, so opening `index.html` without running
`npm run build` first will not work — the double-click-the-raw-folder story
is what got retired here, deliberately.

Chrome, Edge, or Safari are needed for read-aloud; the game detects a missing
Web Speech API and flashes the word on screen instead.

**Version.** `APP_VERSION` (`js/app.js`, top of file) is still a hand-bumped
string — there's now a build step, but still no git-derived or CI-derived
build number wired up to replace it, so it remains the one manual signal for
"which copy of the app is this," shown in a quiet corner badge on every
screen and again in the Grown-Ups dashboard's Settings tab. Bump it whenever
you ship a change worth being able to tell apart from the last one; it's
unrelated to `SAVE_VERSION` in `js/store.js`, which versions the save-file
*shape*, not the code.

## Layout

| File | Responsibility |
|---|---|
| `index.html` | All nine screens as `<section class="screen">`, plus the arena scenery SVG |
| `css/styles.css` | Everything visual. No framework. |
| `js/words.js` | 261 words across grades 1–5 + a gym/cheer list, each with a sentence — a designed curriculum organized into phonics/morphology clusters, see `docs/HANDOFF-CURRICULUM.md` |
| `js/letters.js` | The "explorer" track's content — 26 letters (name + sound clue) — and its pure helpers (`nextLetterLevel`, `chooseOptionCount`, `selectLetterPool`). Separate from `js/words.js` on purpose; see `docs/HANDOFF-EARLY-LEARNER.md`. |
| `js/language.js` | The explorer track's second activity set — pronoun-case sentences (she/her, he/him, they/them) and "th"/"f" minimal-pair words, plus their pure selection helpers and the inline-SVG mouth-shape icon. Separate from `js/letters.js`/`WORD_LISTS` on purpose; see `docs/HANDOFF-SPEECH-AND-LANGUAGE.md`. |
| `js/avatar.js` | The jointed SVG figure (`Gymnast`), the unlock catalog, pose helpers |
| `js/skills.js` | Skill keyframe data + the `Animator` that tweens between poses |
| `js/audio.js` | `Speaker` (Web Speech) and `Sfx` (synthesised WebAudio), voice presets |
| `js/store.js` | localStorage persistence, profiles, stats, custom word lists |
| `js/app.js` | Screens, game loop, avatar studio, coach's voice, grown-ups dashboard |
| `build.js` | esbuild config — bundles `js/app.js` (which imports everything else) into `dist/game.js` |
| `server/` | Cross-device sync backend, authoritative (Node.js + SQLite, zero npm deps) — see `docs/HANDOFF-ARCHITECTURE.md`. Also serves the hidden `/admin` operator page (`server/admin.html`). |

`js/*.js` are ES modules with an explicit dependency graph now, not
load-order-dependent globals: `words.js`, `letters.js`, `language.js`,
`avatar.js`, and `audio.js` are leaves (no imports of their own); `skills.js`
imports from `avatar.js`; `store.js` imports from `avatar.js`/`letters.js`/
`language.js`/`words.js`; `app.js` imports from all of the above. `build.js`
bundles from `app.js` as the single entry point. `tests/check.js` bundles a
separate small entry (`tests/testEntry.js`, a barrel re-exporting the 6
non-DOM files) since it needs those exports without `audio.js`/`app.js`'s
DOM dependency — see "Testing" below.

`js/app.js` exposes a deliberate, minimal `window.__app` surface (`Store`,
`arena`, `session`, a handful of functions) purely for
`tests/screenshots.js` to drive — now that app.js's top-level bindings are
module-scoped rather than implicit page globals, this is how a test harness
still reaches in. Nothing else should read or write `window.__app`; it's a
test hook, not a public API.

`server/` is a separate deployable, not part of the client bundle. Unlike
the game's own build step, it still ships with zero npm dependencies
(`node:http` + `node:sqlite` only). It's no longer a best-effort mirror —
`Store.syncOnBoot()` treats it as authoritative on boot when reachable, with
`localStorage` as a resilience cache for when it isn't (see "Save file"
below). It also now runs a periodic in-process backup of its own database
(see "Server backups" below).

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
- **`sync`** — `{ code, lastSyncedAt, localOnly, pending, lastError }`.
  Cross-device sync is **on by default** — see
  `docs/HANDOFF-ARCHITECTURE.md`. Every profile gets a `code` the moment it
  exists (`Store._autoProvisionSync()`, called from `load()` for every
  profile and from `createProfile()`), and `Store.save()` debounces an
  opportunistic push after every change — no dashboard visit required.
  `localOnly` is the deliberate opt-out a grown-up flips from Settings
  ("Play offline only"); while it's `true`, provisioning leaves the profile
  alone instead of re-enabling it. **The server is authoritative on boot**
  now (`Store.syncOnBoot()`, called from `app.js`'s `init()` right after
  `load()`, bounded by an internal timeout) — `localStorage` is the
  fallback used only when the server can't be reached in time, not the
  thing trusted by default the way it used to be (see
  `docs/HANDOFF-ARCHITECTURE.md` §11). `pending` is true whenever the last
  attempted push hasn't been confirmed yet, so a failure gets retried on the
  next boot instead of silently lost; `lastError` is display-only, read by
  the Grown-Ups dashboard's Settings tab (`renderSyncSection()`). Every sync
  call still silently no-ops without a reachable server — that resilience
  didn't change, only which side is treated as the source of truth.
- **`stage`** — `"speller"` or `"explorer"`. Which of the two tracks this profile
  plays: the original spelling game, or the pre-literacy letters track for a
  younger sibling (see `docs/HANDOFF-EARLY-LEARNER.md`). Always defaults to
  `"speller"` and is only ever changed explicitly — at profile creation via the
  picker in `renderProfiles()`, or later from the Grown-Ups dashboard's Settings
  tab (`Store.setStage()`) — never inferred from an age or anything else.
  `refreshHome()` reads it to decide which home-screen tiles to show.
- **`earlyLearner`** — `{ level, levelProgress, letters, roundsCompleted }`.
  Progress for the explorer track only; a `"speller"` profile carries it around
  unused. `level` is `"upper"` → `"lower"` → `"sound"` (`LETTER_LEVELS` in
  `js/letters.js`) and advances on its own via `nextLetterLevel()` once a level
  has enough reps at good accuracy, though a grown-up can override it directly.
  `letters` is per-letter-id `{ seen, right, wrong }`, the explorer-track
  equivalent of `stats.words`.
- **`languagePlay`** — `{ pronoun: { items, roundsCompleted }, sound: { pairs,
  roundsCompleted } }` (see `docs/HANDOFF-SPEECH-AND-LANGUAGE.md`). A second,
  separate explorer-track bucket alongside `earlyLearner`, not folded into it —
  `items`/`pairs` are per-content-id `{ seen, right, wrong }`, one map for the
  pronoun-case sentences and one for the th/f word pairs, tracked independently
  since they're unrelated skills with unrelated content ids.

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

**The explorer track asks about a whole word's sound, never a bare phoneme.**
There is no reliable cross-browser way to make the Web Speech API say an isolated
sound like "mmm" — asking it to speak a single letter reliably produces the
letter's *name* instead ("em"), which is exactly what the letter-name levels
want, but is the wrong tool for testing sounds. Rather than fight that, the
`"sound"` level in `js/letters.js` asks "which letter makes the first sound in
the word ___" using an ordinary, fully-formed sentence read by TTS as normal —
sidestepping the constraint instead of working around it with scripted phonetic
spellings. Reward cadence is deliberately not "every correct answer": the avatar
performs a skill every 4th correct pick in a round, not every one, because a
5-year-old's payoff needs to stay legible rather than constant-and-cheap. A wrong
tap just disables that one choice and lets her keep trying the rest in place —
no three-strikes climb like the speller track, since that reads as too many
steps at this age.

**Language Play is one screen for two activities, not two screens.** Picking
"Which Word?" or "Th or F?" from the home grid already picks the activity, so
`renderLanguageChoices()`/`speakLanguagePrompt()`/`pickLanguageChoice()` branch
internally on `languageSession.kind` instead of asking her to choose a mode
mid-screen — the two activities differ in content (sentences vs. word pairs),
not in the underlying tap-two-choices mechanic, so splitting the screen would
have duplicated markup and wiring for no gain. Both are pinned to exactly two
choices, never `chooseOptionCount()`'s 2–4, because pronoun case and th/f are
each a genuine binary — a third option would be an invented distraction, not a
fair harder step. Neither activity has explicit levels the way letters has
upper→lower→sound: there's no real difficulty ladder for either skill, so
weighted item selection (`js/language.js`'s `selectPronounPool`/
`selectSoundPool`, same "circle back to the shaky ones" shape as
`selectLetterPool`) carries all of the adaptation on its own. The "Th or F?"
activity's mouth-shape SVG (tongue-between-teeth vs. lip-under-teeth) is a
deliberate visual echo of her actual speech therapist's tactile cue, not an
invented one — and because there is no microphone anywhere in this app (see
§7.2 of `docs/HANDOFF-SPEECH-AND-LANGUAGE.md`), it can only ever test whether
she can *hear* the difference, never grade her own speech; the Grown-Ups
dashboard says so explicitly rather than letting a parent overtrust it.

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

**No external assets — relaxed to "none used yet," not "forbidden."** The rule
was: no fonts, images, or audio files; the figure is SVG, sound effects are
synthesised in WebAudio, the crowd is generated. That kept it a single
double-clickable folder that works offline. The project owner explicitly
opened this up during the graphics pass (`docs/HANDOFF-UI.md` §9) — real
image/SVG asset files are now allowed, since a Docker-built, `nginx`-served
folder tree still works exactly the same double-clickable, offline way even
with an `assets/`-style subfolder of local files, as long as nothing fetches
from a network. Nothing added any, though: every graphics improvement in that
pass was achievable with existing inline SVG plus new CSS custom properties,
so there was no concrete reason to add a file yet. **Update, later pass:**
"no build step" also stopped being an invariant once the game was deployed
to Kubernetes for good (see "Running it" above) — there's now an esbuild
step, deliberately, by the project owner's own call. What's still hard: no
CDN, no third-party network fetch, and no child-identifying data leaving the
household's own infrastructure (`docs/HANDOFF-ARCHITECTURE.md` §8.2) — the
build step and the sync server are both self-hosted, not outsourced to
someone else's cloud.

**Cross-device sync is whole-snapshot and timestamp-wins, on purpose.** A single
child can't play on two devices at the same instant, so a real conflict between
devices is a near-impossible edge case — not worth field-level merging, CRDTs, or
an operation log. `Store.reconcileSync()` sends the whole profile; whichever side
(the device or the server) has the later timestamp wins outright, and the loser's
differences are gone. If that assumption ever stops holding — e.g. two kids
sharing one synced profile from different devices at once — revisit this rather
than patching around it.

**Update, later pass: the server checks in on boot instead of only after
changes.** The model above (whole-snapshot, timestamp-wins) is unchanged —
what changed is *when* the server gets consulted. It used to be purely
reactive: `reconcileSync()` only ran after a local change, so a correction
from another device could sit unseen until the next save. `Store.syncOnBoot()`
now runs once at startup, before the app renders, and pulls the server's
copy within a bounded timeout if it's newer — `localStorage` is the
fallback for when the server can't be reached in time, not the assumed-good
copy it used to be. See `docs/HANDOFF-ARCHITECTURE.md` §11 for the full
reasoning; this was a deliberate, scoped reversal of the offline-first
posture that shaped every sync decision before it, not a redesign of the
conflict model itself.

**Sync flipped from opt-in to opt-out.** It shipped (§ above) as something a
grown-up had to turn on per profile. It's now the default: `Store.load()` and
`Store.createProfile()` auto-provision a pairing code for every profile via
`Store._autoProvisionSync()`, and `Store.save()` — the one function every
mutation already funnels through — debounces a `reconcileSync()` after itself,
so any change (a session's stars, an avatar purchase, a Focus-tab edit) pushes
on its own instead of only at the handful of call sites that used to remember
to call `debouncedSync()`. A grown-up who wants a device to stay offline flips
`sync.localOnly` from Settings (`Store.setLocalOnly(true)`) — that's the one
piece that has to stay a deliberate, explicit choice rather than a default,
since it's the thing that decides whether a profile's data leaves the device
at all. **What this doesn't change:** there's still no account system — a
brand-new, never-before-seen device still needs the profile's pairing code
once (`Store.linkWithCode()`) to know which profile to pull. "Automatic" means
continuous background sync after that one lightweight pairing step, not
zero-touch discovery across an arbitrary unpaired device.

That last point was originally a documented limitation rather than a wired-up
path: the only place `linkWithCode()` was reachable from was Settings, which a
brand-new device can't reach without first creating (and thus diverging from)
a placeholder profile of its own. The profile picker (`renderProfiles()` in
`js/app.js`) now surfaces "Already playing on another device?" directly on
the first-run name screen — reachable before anything is claimed, replaces
the still-unclaimed placeholder rather than creating a second profile, and is
deliberately absent from the "add another player" version of that same
screen, since linking there would silently overwrite whichever profile
happens to be active on that device.

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

**Server backups are automatic, same-volume snapshots — Tier 1 only, on
purpose.** `server/index.js` runs `store.backup()` (`server/db.js`, SQLite's
own `VACUUM INTO`) once at startup and then on a `BACKUP_INTERVAL_MS`
interval (default 24h), writing timestamped, independently-openable snapshot
files to a `backups/` subdirectory next to the live database, and pruning
down to the newest `BACKUP_RETENTION` (default 7) afterward. No WAL mode or
external tool is needed — `VACUUM INTO` is SQLite's own mechanism for a
consistent point-in-time copy of a live database. This protects against
in-app mistakes (an accidental or malicious hit to the unauthenticated
`DELETE /api/profiles/:code` route, a bad future migration) but explicitly
**not** node/disk loss, since the backups live on the same PVC as the
database they're backing up — shipping them off-node is deferred until this
cluster actually has somewhere to ship them to (see
`docs/HANDOFF-ARCHITECTURE.md` §11). `GET /api/admin/overview` reports
`backups: { lastBackupAt, lastBackupError, count, totalBytes }` so this is
visible from the existing admin page rather than needing a new one.
**To restore**: stop the server pod, copy the chosen
`backups/sync-<timestamp>.db` over the live `sync.db` path, restart — there's
no automated restore path, deliberately, since an untested one-click restore
button is worse than a documented manual step that's actually been tried at
this scale.

**Phonics-pattern grouping lives in source comments, not per-word metadata.**
`js/words.js` groups each grade's words into named clusters (e.g. g3's
prefixes → suffixes → doubled consonants → silent letters → soft c/g), but the
`[word, sentence]` tuple itself never grew a `pattern` field. Two reasons:
`buildQueue()`/`shuffle()` (`js/app.js`) draw from a whole list at random, so
cluster order is invisible in an actual session — there is no in-game
mechanism a pattern tag would currently feed. And the setup screen only lets a
parent pick a whole grade, never a sub-pattern, so there's no UI to expose one
either. If a future dashboard feature wants to target a specific pattern
(`HANDOFF-PARENTS.md` §8 sketches `Store.selectReviewPool()` as the extension
point), add the metadata then, onto the list object rather than the tuple —
don't carry it speculatively today.

**There is no `g1`/explorer bridge list, on purpose.** `HANDOFF-EARLY-LEARNER.md`
flagged a gap between the explorer track's top level (matching a letter to a
sound) and `g1`'s CVC recall-typing. The gap turned out to be about
*interaction mode* — tap-to-choose vs. type-and-recall — not word difficulty:
`g1`'s words are already the simplest a spelling-recall task can meaningfully
use. A new, even-easier word list would still demand typing a whole word
unaided, so it wouldn't actually close the gap; closing it means changing the
explorer track's own interaction, which is `HANDOFF-EARLY-LEARNER.md`'s
territory, not `js/words.js`'s. "Graduating" a profile stays the manual
`Store.setStage()` toggle it already is.

**Blinking is a `setTimeout` loop, not a rAF tick.** `Gymnast._scheduleBlink()`
swaps `.gy-features` to shut-eyes for ~130ms on a randomized 2.6–5.8s cadence,
then restores whatever expression was already showing — it never calls
`setExpression()` itself, so it can't clobber the current look. A blink is a
single discrete swap, not something that needs per-frame interpolation, so it
doesn't need the Animator's rAF machinery at all. It's skipped outright under
`prefers-reduced-motion` (`avatar.js`'s `prefersReducedMotion()`), which is
also the first place in this codebase that checks that media query from JS
rather than leaning on the one blanket CSS rule.

**The Results podium reuses the skills' own landing pose, on purpose.**
`#res-gymnast` (a plain `Gymnast`, no `Animator` — she's posed once,
statically, not animated) uses `poseFrom({ shL: 170, shR: 190, head: -6 })`,
the same arms-up salute every skill in `js/skills.js` already ends its last
frame on. That was a deliberate reuse, not a shortcut: inventing a second
"victory" pose risked looking like a different character on the two screens
that matter most. She's cropped waist-up (`origin.y: 250, zoom: 1.9`,
`viewBox="255 15 190 205"`) rather than shown full-length — a full standing
figure at card size makes the face illegible, and the face is the whole point
of putting her there. The Home-screen mascot (`#home-gymnast`) uses the same
crop for the same reason.

**The Home mascot hides below 640px, and the heading reserves her a lane
above it.** `.home-hero`'s symmetric `padding: 0 100px` (only above 640px)
keeps the centered `<h1>` centered while leaving room on the right so a long
player name doesn't run underneath her — removing the padding without also
hiding her would let "Firstname Lastname's Spell & Tumble Championship" wrap
under her face at in-between widths.

**Arena colours route through `:root`, all the way this time.** The SVG's
gradient stops and flat fills carry classes styled from `--arena-*`/
`--crowd-*`/`--judge-*` custom properties instead of inline hex, and
`buildCrowd()`/`buildJudges()` (`js/app.js`) read those same properties via a
`cssVar()` helper (one `getComputedStyle()` read per boot call, not per
crowd member) instead of carrying a second, separate copy of the palette in
JS. A future re-theme is a `:root` edit and nothing else — no more "chrome
changed, arena didn't."

## Testing

```
npm run build                # bundles js/app.js -> dist/game.js (esbuild)
node tests/check.js          # logic: skills, animator, store, profiles, word lists
node tests/screenshots.js    # writes self-driving copies of index.html to _debug/
npm run typecheck            # tsc --noEmit over js/*.js via JSDoc + checkJs; non-blocking in CI
```

`tests/check.js` needs `dist/game.js` to not exist for it to still work — it doesn't
run the bundle at all. Instead it bundles its **own** small entry
(`tests/testEntry.js`, which re-exports everything from the 6 non-DOM files:
`words.js`, `letters.js`, `language.js`, `avatar.js`, `skills.js`, `store.js`)
via esbuild into an IIFE exposing a `TestCore` global, then runs that inside
a `vm` context with a stubbed `localStorage` and a **hand-cranked frame
clock**, so the `Animator` can be driven deterministically without a DOM.
This replaced an older trick (concatenating those 6 files as classic scripts
sharing one global scope) that stopped working once they became real ES
modules — `export`/`import` aren't valid inside a non-module `vm` script.
`tests/check.js`'s own ~600 lines of assertions didn't need to change, only
its ~15-line loader. It covers the animator regressions specifically — idle
hand-off, travel accounting, promise ordering, facing flips.

`tests/screenshots.js` similarly can't rely on `app.js`'s top-level bindings
being page globals anymore — it destructures the stable ones (`Store`,
`arena`, functions) once from the `window.__app` debug surface `app.js`
exposes, but deliberately does *not* destructure `session`/`letterSession`
(they're reassigned wholesale by `startSession()`/`startLetterRound()`, so a
one-time destructure would go stale — it reads `window.__app.session` fresh
each time instead).

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
- **A refresh on the "what's your name?" screen silently logged in as "Player 1".**
  `load()` must stay side-effect-free until something real happens — it's always
  been allowed to conjure a blank first-run placeholder in memory, but never to
  write it to `localStorage` on its own. Two things broke that: sync
  auto-provisioning's `_autoProvisionSync()` used to call `_saveLocalOnly()`
  eagerly for every profile including the unclaimed placeholder, and
  `applyProfileSettings()` called `Store.registerVisit()` (which persists)
  unconditionally on every `init()`, firstRun or not. Both are now guarded —
  provisioning persists only once a push actually succeeds, and
  `registerVisit()` is skipped while `Store.firstRun` is still true — so a
  page that's never been named stays unsaved, and a refresh asks again
  instead of dropping straight into a nameless "Player 1".
- **The gold/silver medal confetti on Results was never visible.**
  `burstConfetti(n)` with no `container` argument defaults to `#fx-layer`,
  which lives inside the *game* screen — already `display:none` by the time
  `renderResults()`'s `setTimeout` fires, since `showScreen("results")` has
  already run. Every other call site (studio, letters, language) passed its
  own screen's container correctly; this one didn't. Fixed by passing
  `.results-stage` explicitly, and while at it, every medal tier now gets a
  confetti burst, not just gold/silver — see "Everyone medals" above.
- **`syncOnBoot()`'s bounded timeout wasn't actually bounded.** Its first
  step — retrying a push left `pending` from last session — called
  `await this.reconcileSync(p)` directly. `reconcileSync()` has no timeout
  of its own; when the server was unreachable, that `await` hung
  indefinitely, and since it ran *before* the timed pull step, the whole
  point of `_raceTimeout` never got a chance to apply. Both steps now go
  through `_raceTimeout`, not just the pull. Caught by a test asserting the
  whole call resolves quickly when the server never responds — worth
  keeping that kind of test whenever a new `await` gets added to this
  function, since "add a step that skips the timeout wrapper" is an easy
  mistake to reintroduce here.
