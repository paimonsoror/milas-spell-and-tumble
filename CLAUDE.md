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
>    climbs every grade). See its own §7 for the two open questions it
>    resolved (no `g1`/explorer bridge is needed, and pattern clusters live as
>    source comments, not new per-word metadata) and why. Item 5 below is now
>    downstream of it, though it deliberately doesn't touch `js/words.js`.
> 5. `HANDOFF-PARAGRAPH.md` — a second speller-track activity: "Story
>    Spelling," where she reads a short gym/cheer paragraph with blanks in
>    it, hears each missing word spoken in reading order, and types it into
>    place. **Done.** Added `js/passages.js` (30 new, hand-authored passages
>    across `g1`-`g5`, gym/cheer-themed like `js/words.js` but genuinely new
>    prose, not derived from it — see that file's own header) and one new
>    `#screen-paragraph`, reachable from two new home tiles ("Story
>    Practice"/"Story Competition") mirroring the existing Practice
>    Gym/Competition pair. Deliberately forks the word-by-word teaching-
>    moment ladder (three tries → multiple-choice fallback) into its own
>    functions rather than bending `session`'s — the same call
>    `HANDOFF-EARLY-LEARNER.md` made for Letter Play — but genuinely reuses
>    `markLetters()`, `chooseSkill()`, `judgeScores()`, `medalFor()`, and,
>    via a new shared `finishRoutine()`, the entire finish/results pipeline,
>    so a Story Spelling competition is judged and medaled exactly like a
>    word one on the same `#screen-results`. No new profile field: blank-word
>    accuracy rides on the same `Store.data.stats.words` word-mode already
>    uses, on purpose. Its own §7/§8 record what's open: no length/grade
>    picker screen yet (grade rides on `settings.grade`, routine length is a
>    fixed 3 stories), and Grown-Ups dashboard visibility beyond the raw
>    `summary.activity` tag is deferred to a future pass.
>
> 6. `HANDOFF-ELEVATION.md` — a live-play review of the deployed game
>    (graphics, UX, and educational value), plus the ranked brief for the
>    next elevation pass. **Review done; first elevation pass shipped.** An
>    agent played the production deployment end-to-end and recorded
>    verified strengths, verified defects (a viewport-fit problem on both
>    game screens, an input-not-locked-during-reveal bug, the Story
>    screen's bare arena, intermittent transition freezes), and ranked
>    graphics + educational elevation plans. A later pass worked that
>    ranking and recorded exactly what it did in its own **§9**: the
>    viewport and input-lock defects are fixed, Story Spelling has a real
>    stage (a reading corner, not a clone of the competition arena), the
>    crowd and judges react to what she lands, and — the flagship —
>    `js/words.js`'s phonics clusters were promoted from source comments to
>    real `patterns` data so a missed word gets one line of actual
>    instruction on its retry card. Read §9.5 before picking anything else
>    up: the intermittent freezes are still undiagnosed, and §5.5, §5.7,
>    §6.2, §6.3, §6.4 and §6.7 are untouched with their rankings intact.
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

**It's installable.** Once a permanent build step existed, the natural next
step was making the game a real installable PWA rather than just a hosted
page — see "PWA installability" below for the manifest/service-worker/icon
details.

**Version.** `APP_VERSION` (`js/app.js`, top of file) is still a hand-bumped
string — there's now a build step, but still no git-derived or CI-derived
build number wired up to replace it, so it remains the one manual signal for
"which copy of the app is this," shown in a quiet corner badge on every
screen and again in the Grown-Ups dashboard's Settings tab. Bump it whenever
you ship a change worth being able to tell apart from the last one; it's
unrelated to `SAVE_VERSION` in `js/store.js`, which versions the save-file
*shape*, not the code. `sw.js`'s own `CACHE_NAME` version string is a second,
separate manual bump with the same reasoning — see "PWA installability"
below — worth doing in the same commit as an `APP_VERSION` bump so an old
cached bundle doesn't linger on installed devices.

## Layout

| File | Responsibility |
|---|---|
| `index.html` | All eleven screens as `<section class="screen">`, plus the arena scenery SVG |
| `css/styles.css` | Everything visual. No framework. |
| `js/words.js` | 261 words across grades 1–5 + a gym/cheer list, each with a sentence — a designed curriculum organized into phonics/morphology clusters, see `docs/HANDOFF-CURRICULUM.md`. Those clusters are now real `patterns` data on each list object, plus the `patternFor`/`patternHint` lookup the retry card's lesson line reads |
| `js/letters.js` | The "explorer" track's content — 26 letters (name + sound clue) — and its pure helpers (`nextLetterLevel`, `chooseOptionCount`, `selectLetterPool`). Separate from `js/words.js` on purpose; see `docs/HANDOFF-EARLY-LEARNER.md`. |
| `js/language.js` | The explorer track's second activity set — pronoun-case sentences (she/her, he/him, they/them) and "th"/"f" minimal-pair words, plus their pure selection helpers and the inline-SVG mouth-shape icon. Separate from `js/letters.js`/`WORD_LISTS` on purpose; see `docs/HANDOFF-SPEECH-AND-LANGUAGE.md`. |
| `js/passages.js` | "Story Spelling" — the speller track's second activity: 30 new gym/cheer paragraphs across `g1`-`g5`, each with `{blank}`-marked missing words, plus the pure helpers that parse a passage and build a session's blank queue (`passageSegments`, `pickPassages`, `buildBlankQueue`, `allBlankWords`). Genuinely new prose, not derived from `js/words.js`; see `docs/HANDOFF-PARAGRAPH.md`. |
| `js/avatar.js` | The jointed SVG figure (`Gymnast`), the unlock catalog, pose helpers |
| `js/skills.js` | Skill keyframe data + the `Animator` that tweens between poses |
| `js/audio.js` | `Speaker` (Web Speech) and `Sfx` (synthesised WebAudio), voice presets |
| `js/store.js` | localStorage persistence, profiles, stats, custom word lists |
| `js/app.js` | Screens, game loop, avatar studio, coach's voice, grown-ups dashboard |
| `build.js` | esbuild config — bundles `js/app.js` (which imports everything else) into `dist/game.js`, and rasterizes `assets/icon.svg` into `dist/icons/*.png` (via `sharp`, the one runtime-adjacent devDependency this needs) |
| `assets/icon.svg` | The one hand-authored image asset in the repo — source for the PWA's home-screen icon. See "PWA installability" below for why it's simple/flat rather than a render of the `Gymnast` rig. |
| `manifest.webmanifest`, `sw.js` | PWA installability — see "PWA installability" below. Both are plain static files at repo root, not part of the esbuild bundle. |
| `server/` | Cross-device sync backend, authoritative (Node.js + SQLite, zero npm deps) — see `docs/HANDOFF-ARCHITECTURE.md`. Also serves the hidden `/admin` operator page (`server/admin.html`), which now includes a session-history trend chart — see "Session-trend chart" below. |

`js/*.js` are ES modules with an explicit dependency graph now, not
load-order-dependent globals: `words.js`, `letters.js`, `language.js`,
`passages.js`, `avatar.js`, and `audio.js` are leaves (no imports of their
own); `skills.js` imports from `avatar.js`; `store.js` imports from
`avatar.js`/`letters.js`/`language.js`/`words.js` (not `passages.js` — see
`docs/HANDOFF-PARAGRAPH.md` for why Story Spelling needed no new save-file
bucket); `app.js` imports from all of the above. `build.js` bundles from
`app.js` as the single entry point. `tests/check.js` bundles a separate
small entry (`tests/testEntry.js`, a barrel re-exporting the 7 non-DOM
files) since it needs those exports without `audio.js`/`app.js`'s DOM
dependency — see "Testing" below.

`js/app.js` exposes a deliberate, minimal `window.__app` surface (`Store`,
`arena`, `session`, `paragraphSession`, a handful of functions) purely for
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
screen. Two later additions sharpen the moment without changing the ladder:
the retry card's opener now varies by *how close she got* (`retryOpener()` —
"So close" is only said when it's true; a wholly wrong attempt gets "listen
for the very first sound" instead), and a classified word gets one line of
real instruction under it (`patternLessonHtml()`, see the phonics-pattern
entry below). The lesson's worked examples are drawn from other words sharing
the pattern, never the word itself, so the card still doesn't leak the answer. Streak resets on the *first* miss only — a second or third try that
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

**Update, later pass: the explorer track's home screen now has its own
sport picker.** Both Letter Play's and Language Play's milestone-skill
animation already read `Store.data.settings.sport` — the same setting the
speller track's `#screen-setup` writes — but nothing on the explorer side
ever wrote to it, so a "Little Learner" profile was stuck showing whatever
sport a grown-up last set (or the `"gym"` default) with no way to change it
herself. The younger sibling this track was built for asked for the same
choice the big kids get, directly. Rather than reopening the "no dedicated
setup screen" call above with a whole new screen, the four sport buttons
(identical to word-mode's, same icons and blurbs) now live inline on the
home screen itself, shown only when `Store.data.stage === "explorer"`
(`#home-sport-field`, toggled the same way `refreshHome()` already toggles
`.explorer` on `.home-grid`). Picking one calls the same
`Store.setSetting("sport", ...)` word-mode's setup screen calls, so it's
the same persisted per-profile value, not a parallel one — Letter Play and
Language Play needed no changes at all, since they were already reading it.
This keeps the explorer track's own precedent (jump straight from a home
tile into the activity) intact; it just makes the one choice that already
existed for her, and was already being used to pick her reward animations,
actually hers to make.

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
from a network. Nothing added any at the time: every graphics improvement in
that pass was achievable with existing inline SVG plus new CSS custom
properties, so there was no concrete reason to add a file yet.
**Update, later pass:** "no build step" also stopped being an invariant once
the game was deployed to Kubernetes for good (see "Running it" above) —
there's now an esbuild step, deliberately, by the project owner's own call.
**Update, one pass later still:** `assets/icon.svg` is the first file
actually added under that door — the PWA installability pass needed a home-
screen icon and had a concrete reason to add exactly one asset file (see
"PWA installability" below). What's still hard: no CDN, no third-party
network fetch, and no child-identifying data leaving the household's own
infrastructure (`docs/HANDOFF-ARCHITECTURE.md` §8.2) — the build step and
the sync server are both self-hosted, not outsourced to someone else's
cloud.

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

**Update, later pass: it's no longer absent there — a real family hit this
gap.** A household with more than one child playing hits exactly the
scenario the paragraph above accepted as a limitation: a brand-new device
can link in *one* existing profile via its code on the first-run screen,
but every sibling after the first has no path in — "add another player"
only ever created a brand-new blank profile, so a parent typing a second
child's name there got an empty profile, not her real one, with no error
or explanation. `Store.linkAdditionalProfile(code)` (`js/store.js`, next to
`linkWithCode()`) closes this without touching the unsafe primitive: where
`linkWithCode()`/`_adoptSnapshot()` intentionally mutate the *active*
profile in place (correct for the first-run case, since the placeholder
being overwritten isn't real data yet), `linkAdditionalProfile()` instead
builds a fresh local profile directly from `blankProfile()` — skipping
`createProfile()`'s own auto-provisioning so it doesn't push a throwaway
row to the server first — and adopts the fetched snapshot onto *that*, so
whichever profile is already active on the device is never touched. The
"add another player" screen now shows the same "Already playing on another
device?" code field the first-run screen does; `wireProfiles()`'s handler
branches on `Store.firstRun` to call the right one. Verified live: cleared
a real device's storage entirely, linked one profile by code (the
first-run path, unchanged), then used the *new* path to bring a second,
different profile onto that same already-claimed device without touching
the first — both profiles showed up correctly on the picker screen
afterward. Re-linking a code already present on this device switches to
the existing local copy rather than creating a duplicate.

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

**PWA installability — a simple hand-authored icon, not a render of the
avatar rig.** `Gymnast` (`js/avatar.js`) has no function that renders a
static frame to a string — it only ever mutates a live `<svg>` element via
DOM APIs — so building a whole render pipeline just to extract one icon
would have been a disproportionate side-project. `assets/icon.svg` (a
purple square, a white star — stars being the actual core currency of this
game) is a new, small, hand-authored asset instead, rasterized by `build.js`
via `sharp` into `dist/icons/*.png` at the sizes Android's manifest and
iOS's `apple-touch-icon` each expect. It's a **full-bleed square with no
pre-rounded corners or transparency**, deliberately — both platforms apply
their own corner/shape mask on top, and pre-rounding fights that; the star
sits inside Android's maskable safe zone so the same file serves both
`any` and `maskable` purposes. `sw.js` (repo root, not under `dist/`, so its
default scope covers the whole site) precaches the built assets and serves
them stale-while-revalidate — instant and offline-capable, refetching in
the background to stay current. It explicitly leaves `/api/*` alone, so
sync/backup traffic always hits the network live rather than risking a
stale cached response. iOS has no programmatic install prompt (unlike
Android's automatic banner) — Safari's Share → "Add to Home Screen" is the
only path, so a small dismissible hint appears in the Grown-Ups dashboard's
Settings tab (`shouldShowIosInstallHint()`/`renderSettingsTab()` in
`js/app.js`) when `navigator.standalone` says the app isn't installed yet.
Its dismissed-state is a plain `localStorage` key, not part of `Store`'s
synced save file — it's about this browser, not this child, and installing
on one device shouldn't silently mark the hint dismissed on another.

**Session-trend chart — one real chart, in two places that can't share a
module.** The Grown-Ups dashboard's Progress tab used to show two separate
CSS-div bar charts on fixed windows (last 24 sessions, last 10 weeks); the
admin page (`/admin`) showed no chart at all, despite already receiving the
same session history (`stats.sessions`, capped at 250 by
`Store.recordSession()`) inside every synced snapshot — no new schema or
sync plumbing was needed for either surface. Both now render the same small
hand-rolled SVG line chart (no charting library) with a 4-weeks/12-weeks/
all-time range selector, charting **accuracy** (correct/total) rather than
competition `score` — score is competition-only and stays `0` in practice
mode, so plotting it against practice sessions on the same axis would be
misleading (`Store.sessionTrend()`'s own comment explains this). Hover
detail is a native SVG `<title>` per point, the same technique the bars it
replaced already used via the HTML `title` attribute, rather than a bespoke
crosshair/tooltip layer. `server/admin.html` and `js/app.js` are separate
deployables (`server/` is never part of the client bundle — see the Layout
table) and can't literally share an ES module, so the bucketing function
(`Store.sessionTrend()` in `js/store.js`, tested in `tests/check.js` the
same way `selectReviewPool()` was pulled out for testability) and the chart
renderer are each duplicated as a small, self-contained copy in
`server/admin.html`'s own inline script — a deliberate, tiny exception to
"don't duplicate code," not an oversight.

**Phonics-pattern grouping is real data now — on the list, never on the
tuple.** This entry used to say the clusters lived only in `js/words.js`'s
source comments, because nothing in the game could use one, and that a
future feature needing them should add the metadata *then*, onto the list
object rather than the `[word, sentence]` tuple. That happened
(`docs/HANDOFF-ELEVATION.md` §6.1): each `g1`-`g5` list now carries
`patterns: [{ id, label, tip, words }]`, and a missed word gets one line of
instruction on its retry card — "**Digraphs** — Two letters, one sound: sh,
ch, th and wh each make a single sound. Like *shop* and *that*." The tuple
still never grew a field, exactly as called.

Three things worth knowing before editing it. **The lookup is global**
(`patternFor`/`patternHint` in `js/words.js`), not scoped to the list being
played: a word lands in exactly one of `g1`-`g5` (already enforced) so it's
unambiguous, and it means Story Spelling's blank words — which come from
`js/passages.js` and belong to no `WORD_LISTS` list — get the same lesson
for free. **`bonus` is deliberately unclassified**, being sport vocabulary
chosen for meaning rather than a phonics-designed list; unclassified words
return null and the retry card degrades to what it always showed, which is
also what happens for a grown-up's custom list. And **the word membership is
duplicated** between `words` and `patterns[].words` on purpose —
`tests/check.js` asserts every `g1`-`g5` word is in exactly one pattern and
that no pattern invents a word its list doesn't have, so adding a word
without classifying it fails the build rather than silently shipping a
child a missing or wrong lesson.

Still true: `buildQueue()`/`shuffle()` draw from a whole list at random and
the setup screen only picks a whole grade, so **cluster order remains
invisible in a session** and there is still no way to practise one pattern
on purpose. `HANDOFF-PARENTS.md` §8's `Store.selectReviewPool()` sketch is
still the extension point if that's ever wanted — the data it would need
now exists.

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

**The arena sizes itself off the viewport's height, not just its width.**
`.arena` used to be `width: 100%` plus `aspect-ratio: 700/380`, which on a
639px-tall laptop made the stage so tall that the gymnast and the answer box
were never on screen together — she had to scroll between watching the reward
and typing, which is the one loop the whole game is built on
(`docs/HANDOFF-ELEVATION.md` §4.2). It now caps `--arena-h` against `dvh` and
derives `max-width` from that, so the box shrinks *whole* rather than being
cropped by its own `preserveAspectRatio="slice"`; width is still the binding
constraint on narrow/tall screens, where the arena was never the problem.
`#screen-paragraph` overrides `--arena-h` tighter, because that screen also
carries a paragraph of reading material and there the story text — not the
figure — is what has to stay co-visible with the input.

Its companion: `showFeedback()` scrolls a **"bad"** card into view, since the
feedback panel sits below all of that and the retry card (with its pattern
lesson) would otherwise land under the fold on exactly the screens the sizing
fix was for. Only "bad" — a correct answer's card stays put on purpose,
because the payoff there is watching her perform and scrolling away would
take it off screen.

**Story Spelling has its own stage, not a recolour of the arena.** The
screen shipped with a bare mat on a flat void (`HANDOFF-PARAGRAPH.md` scoped
graphics out; §4.1/§5.1 of the elevation review called the bill due). Rather
than clone the competition arena, `#screen-paragraph` is a reading corner
that happens to be in a gym — bookshelf, floor lamp, mats stacked like
cushions, bunting, a STORY TIME banner, no crowd — so the two speller-track
activities read as different *places* rather than one place with different
text under it. Same discipline as the arena though: every colour is a class
routed through a `--story-*` block in `:root`, and her floor contact stays at
`y=312` so the shared `Gymnast`/`Animator` setup needed no per-screen tuning.
Because there's no crowd there, `crowdWave()`/`reactJudges()` are word-mode
only.

**Arena colours route through `:root`, all the way this time.** The SVG's
gradient stops and flat fills carry classes styled from `--arena-*`/
`--crowd-*`/`--judge-*` custom properties instead of inline hex, and
`buildCrowd()`/`buildJudges()` (`js/app.js`) read those same properties via a
`cssVar()` helper (one `getComputedStyle()` read per boot call, not per
crowd member) instead of carrying a second, separate copy of the palette in
JS. A future re-theme is a `:root` edit and nothing else — no more "chrome
changed, arena didn't."

**Story Spelling's blank marker is positional (`{blank}`), not numbered.**
`js/passages.js`'s passages could have used `{0}`/`{1}` placeholders keyed
into the `blanks` array by index, but with 30 hand-authored passages to
write, the one thing worth optimising away was "keep two parallel lists of
numbers in sync by hand." Every `{blank}` token instead resolves to
`blanks[i]` by its left-to-right occurrence order, and `passageSegments()`
is the one parser both the renderer and `tests/check.js` share, so there is
exactly one place that understands the token.

**A Story Spelling "routine" is measured in whole stories, not raw blank
count.** `routineLength` for word-mode competition (6/10/16) counts words
because every word is a self-contained unit. A paragraph isn't: cutting a
passage off mid-blank to hit an exact blank-count target would leave a
half-finished sentence on screen at the end of a routine, which reads as
broken rather than deliberately finished. `PARAGRAPH_ROUTINE_LENGTH`
(`js/app.js`, currently a fixed `3`) instead counts whole passages, each
played to its natural end — see `docs/HANDOFF-PARAGRAPH.md` §4 for why this
is a constant today rather than a picker like word-mode's setup screen.

**Story Spelling forks the teaching-moment ladder instead of bending
`session`'s.** Three tries then a multiple-choice fallback, non-punitive
tone throughout, streak resets only on the first miss, hints always
free — every rule from "Missing a word is a teaching moment, not a
penalty" above applies per blank exactly as it does per word, but the
implementation is a parallel set of functions (`submitParaAnswer()`,
`handleParaCorrect()`, `promptParaRetry()`, `startParaMultipleChoice()`,
`rewardParaFix()`) targeting `#screen-paragraph`'s own DOM ids, not a mode
flag threaded through `submitAnswer()` and friends. That mirrors
`startLetterRound()`'s own reasoning for why Letter Play doesn't bend
`session` either — retrofitting a multi-blank paragraph into machinery
built around "one word, no surrounding text" risked breaking the existing
flow players already trust. What's shared is whatever genuinely fits as-is:
`markLetters()`, `chooseSkill()`, the reward/star formulas, and — via a new
`finishRoutine(s, activity, clearFn)` both `finishSession()` and
`finishParagraphSession()` call — the entire judging/results pipeline,
`judgeScores()` included, so a Story Spelling competition is scored and
medaled exactly like a word one on the one shared `#screen-results`.

**A resolved-by-giving-up blank still gets filled in.** Word mode's
multiple-choice fallback simply reveals the answer and moves on, because
each word is independent. A Story Spelling blank stays visible on screen
for the rest of that passage, so `pickParaChoice()`'s wrong-pick branch
writes the correct word into `answered` (and re-renders) even when she
never actually typed or tapped it correctly — otherwise the story would be
left with a permanently broken blank line for every blank she didn't solve.

**Blank-word accuracy rides on the exact same `Store.data.stats.words`
word-mode already writes to — no new per-profile bucket.** Both activities
ask her to spell real words from memory, so `Store.recordAttempt()`/
`recordFixOutcome()` are called identically from both; a word she misses in
a story is exactly as "hard" to `Store.selectReviewPool()` next time she
plays word-mode, and vice versa. This was a genuine "can the existing shape
represent this" check, not a default: the alternative (a separate
`storySpelling` stats bucket, following `earlyLearner`'s precedent) would
have fragmented one child's word-level progress across two views of the
same underlying skill for no real benefit, since — unlike the explorer
track — both activities are the same reading age, the same recall
mechanic, and the same curriculum. Session-level summaries (medals, best
score, `stats.sessions`) are likewise one shared pool, not split by
activity; `finishRoutine()` tags each recorded session with `activity:
"spelling"` or `"paragraph"`.

**Update, later pass: something reads that tag now.** It shipped as a pure
display hint for a future dashboard pass, unread by any game logic — the
Grown-Ups dashboard's Progress tab now has a "Words vs. Stories" section
built on it (`Store.activitySplit()`, `docs/HANDOFF-ELEVATION.md` §6.5),
because whether spelling inside connected prose lags or leads isolated
spelling is a genuinely diagnostic signal and the data was already being
written. Nothing about the storage decision above changed: it's still one
shared `stats.words`, one shared session pool, and the tag is still only
ever *read for display* — no game logic branches on it. Two details worth
keeping if you touch it: a session recorded before Story Spelling existed
carries no tag at all and must count as word mode (it was), and the section
renders nothing until she's played both, since a "no data" card beside a
real one is noise for a household that only uses word mode.

**Destructive questions use an in-design modal, not native `confirm()`.**
`askConfirm()` (`js/app.js`) is a promise-returning dialog every "are you
sure" in the app now goes through. Native `confirm()` hard-blocks the
renderer — it froze the page mid-animation and mid-speech — and looks like
an operating-system error rather than anything in this game, which is a
jarring thing to put in front of a child on the one screen where she might
be deleting her own progress. Defaults are deliberately safe: the
*dismissing* button takes focus, Escape and a backdrop click both cancel,
and `danger: true` colours the confirming button rather than the dismissing
one. Because it's non-blocking, callers that could have their subject change
underneath them while she decides re-check after the `await` — the two
competition "give up" buttons re-check that the session still exists, since
a routine can finish on its own timers mid-question.

**No dedicated setup screen for Story Spelling.** Word-mode's `#screen-setup`
exists because it has three independently meaningful per-session choices
(sport, grade, routine length). Story Spelling only varies mode
(practice/competition), which its two home tiles already encode directly —
so it follows Letter Play/Language Play's precedent (jump straight from the
home tile into the activity) rather than inventing a picker screen for a
single remaining choice. Grade and sport ride on the exact same
`settings.grade`/`settings.sport` she already set for word-mode, deliberately
not a second, independent "current level" concept. `docs/HANDOFF-PARAGRAPH.md`
§8 flags a length/grade picker as open work if that turns out to matter.

## Testing

```
npm run build                # bundles js/app.js -> dist/game.js (esbuild)
node tests/check.js          # logic: skills, animator, store, profiles, word lists
node tests/screenshots.js    # writes self-driving copies of index.html to _debug/
npm run typecheck            # tsc --noEmit over js/*.js via JSDoc + checkJs; non-blocking in CI
```

`tests/check.js` needs `dist/game.js` to not exist for it to still work — it doesn't
run the bundle at all. Instead it bundles its **own** small entry
(`tests/testEntry.js`, which re-exports everything from the 7 non-DOM files:
`words.js`, `letters.js`, `language.js`, `passages.js`, `avatar.js`, `skills.js`,
`store.js`) via esbuild into an IIFE exposing a `TestCore` global, then runs that inside
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
