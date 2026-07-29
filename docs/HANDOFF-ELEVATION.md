# HANDOFF-ELEVATION — live-play review, and the brief for the elevation pass

**Status: review done; first elevation pass shipped (see §9).** §1-§8 below are
the original review and brief, left exactly as written. §9 is the addendum
recording what the first pass actually did against them, and what's left.

This document is different
from every other handoff in this folder: it was written by an agent that
*played the deployed game* (https://spelltumble.sororlab.dev/) in a real
browser — clicked every tile, spelled words right and wrong, walked the
teaching-moment ladder to the multiple-choice floor, played Story Spelling
through a full passage, bought an avatar item, and unlocked the Grown-Ups
dashboard. Everything below is grounded in that live session (July 28, 2026,
desktop Chrome, ~1568×639 effective viewport), not in reading the source.

The second half is the actual handoff: a ranked, concrete brief for the next
agent — how to elevate this app graphically and educationally without
breaking what already works. Read CLAUDE.md's handoff chain first; every
prior brief still binds you.

---

## 1. The honest verdict, in one paragraph

This is a genuinely good learning tool wearing noticeably homemade clothes.
The engagement architecture — stars pointed at one named unlock, try-before-
you-buy, everyone medals, streaks that never punish, the teaching-moment
ladder — is *better designed than most commercial children's apps*, and I
verified in play that every one of those systems works as documented. The
educational core (typed recall from dictation, sentence context, phonics-
organized curriculum, missed-word review weighting, parent steering) is
sound and real. What holds it back is the presentation layer: the visual
world is flat, sparse, and inconsistent between screens — and the newest
screen (Story Spelling) shipped with essentially no scenery at all — plus a
handful of small verified UX defects. None of the problems are structural.
The elevation job is real but bounded: make the world feel alive, and make
the misses teach more than they currently do.

## 2. What I actually did (so you can re-verify)

Created a throwaway profile ("ReviewBot") to avoid polluting the real
family's synced saves — **note: the owner still needs to delete it from
Grown-Ups → Players** (an agent cannot; profile deletion is permanent and
was correctly left to a human). Then, in order: Practice Gym (Gymnastics ×
Grade 1) — spelled `jump` correctly on try 1, watched the skill, then missed
`much` three ways (`wrng`, `muhc`, `mch`) to walk the full ladder into
multiple-choice; finished, checked Results; Story Practice — played passage
`g1-mat` end-to-end (`flip`, `land`, `jump`), watched the story chain to
passage 2; Avatar Studio — tried on and (accidentally, informatively)
bought Double Buns, confirming balance/goal repaint; Grown-Ups — passed the
math gate, read Progress (trend chart, Still practicing table) and Players.
Console was clean throughout — zero errors logged in the entire session.

## 3. Live-verified strengths — protect these

- **The reward loop reads on screen exactly as designed on paper.** Correct
  word → letter tiles flip green → gymnast performs → score/stars/streak
  tick → goal bar inches forward, all visible in one glance. The +11-star
  first-routine-of-the-day bonus fired and was *explained* in copy.
- **The teaching ladder is exemplary.** Miss one: letters mark in place,
  "So close — check the highlighted letters. 2 tries left," soft tone, no
  buzzer, streak quietly resets, correct spelling never shown. Miss three:
  "Let's pick it together! Tap the way you hear it spelled." — four
  plausible choices, and the fix still pays a star and upgrades the dot.
  This is textbook errorless-adjacent learning and it all works.
- **Story Spelling's core mechanic lands.** The active blank highlights,
  the typed word fills into the paragraph *in green, in place*, and the
  next blank activates in reading order. The story chains to a fresh
  passage on completion. Sessions log to the dashboard as "Grade 1
  Stories". The fundamental idea — spelling inside connected prose —
  works and feels different from word mode in the right way.
- **The Grown-Ups dashboard is legitimately good.** Six stat cards, an
  accuracy trend chart, a "Still practicing" table with per-word
  boost/ease-off buttons, per-player management with rename/peek, and a
  math gate that regenerates its question. Parents can actually steer.
- **Avatar Studio economics teach delayed gratification.** Affordable
  items glow with a gold dashed border; try-on shows exact cost and
  remaining balance before Buy; the goal bar re-targets instantly after a
  purchase. Verified end-to-end.

## 4. Live-verified defects (ranked; fix before or during elevation)

1. **The Story Spelling arena is an empty dark room.** No crowd, no
   banner, no judges, no bench — a flat navy void with a purple mat, and
   the gymnast stands off-center right. Word mode's arena (crowd, STATE
   CHAMPIONSHIP banner, judges' table, bench) makes this screen look
   unfinished by comparison. HANDOFF-PARAGRAPH deliberately scoped
   graphics out; that bill is now due. This is the single highest-impact
   visual fix available.
2. **The game screens don't fit a laptop viewport.** At ~1568×639 the
   arena, prompt row, and input box never fit on screen together — the
   child must scroll between *watching the reward* and *typing the
   answer*, on both word and story screens. The core loop's payoff
   (gymnast performs because I typed the word) is invisible at the moment
   of typing. The arena needs to scale (vh-clamped height, smaller zoom)
   so input + figure are always co-visible. This is the tablet-layout
   question HANDOFF-UI §5 left open, now confirmed as a real-world hit on
   desktop too.
3. **The answer input is live during the reveal pause.** Typing during the
   celebration/advance window leaks characters into the box and they
   persist into the next word (reproduced: typed "jump" mid-reveal, box
   showed "lajumpnd"). A fast or excited child will hit this constantly.
   Disable or hard-clear the input for the duration of `phase !== 
   "spelling"`, and flush it on `advance()`.
4. **Page-level freezes during screen transitions.** Three times in one
   session the renderer hung 5–30s (once entering Story Practice the first
   time — the screen appeared with HUD but no story content until a
   reload; twice around dashboard interactions). No console errors. Two
   candidate causes worth ruling out: `speechSynthesis` calls stalling on
   voice enumeration, and the confetti/rAF pipeline during
   `showScreen()` transitions. Also note: profile-delete uses native
   `confirm()`, which hard-blocks the page and looks nothing like the
   game — replace with an in-design modal.
5. **First-blank content bug class:** the story screen once rendered with
   an empty `#para-text` (before a reload); if the TTS prompt fires before
   the passage renders, she's asked to spell into a blank she can't see.
   Guard `startParagraphSession()` so render completes before the first
   `speakCurrent`-equivalent fires.
6. **Copy nit:** "So close — check the highlighted letters" appears even
   when *every* letter is red (typed `wrng` for `much`). Vary the copy by
   distance (e.g. all-wrong → "Let's hear it again 🔊 — listen for the
   first sound").
7. **Stale-bundle discrepancy:** the deployed `dist/game.js` exposes a
   `window.__app` *without* `paragraphSession`/`startParagraphSession`,
   but the repo's `js/app.js` exports both — the live build appears to be
   one commit behind the repo. Check the CI image tag against `main`
   before starting work, or you'll debug ghosts.

## 5. Graphics elevation brief (ranked)

The constraints that still bind you (CLAUDE.md "Decisions worth knowing"):
local assets only — **no CDN, no third-party network fetch**; SVG and CSS
are the medium; `prefers-reduced-motion` must keep being honored; a
re-theme must stay a `:root` edit. Within that, in order of impact:

1. **Give Story Spelling its own place, not a void.** Don't clone the
   competition arena — a *story* setting is the chance to differentiate:
   a cozy reading-corner-meets-gym backdrop (mats stacked like cushions,
   a banner reading STORY TIME, soft spotlight), crowd optional. Reuse
   the `--arena-*` custom-property pattern so it re-themes with
   everything else. Center the gymnast, or better, seat her "listening"
   until a blank is answered, then let her run her skill across the mat.
2. **Solve the viewport once, structurally.** Make the arena SVG height
   `clamp()`-driven so arena + prompt + input always share the screen at
   ≥600px-tall viewports; below that, shrink the arena rather than
   pushing the input below the fold. This one layout fix pays on every
   screen including the two Story ones, and closes HANDOFF-UI's tablet
   question for desktop at the same time.
3. **Make the crowd alive, cheaply.** The stands are three rows of
   identical static capsules in candy colors. A CSS-only idle sway
   (staggered `transform: translateY` keyframes on row groups), a wave
   on skill completion, and 4–5 silhouette variants (arms up, foam
   finger, bow) would transform perceived production value for near-zero
   runtime cost. Gate all of it behind `prefersReducedMotion()` like the
   blink already is.
4. **Give the judges faces and reactions.** They're featureless blobs at
   a pink table. Three tiny expression states (neutral, impressed,
   score-card-raised at routine end) tie directly into the existing
   `judgeScores()` moment and make competition mode feel judged.
5. **Polish the figure's joints.** The rig's rounded-rect limbs show
   overlap seams at elbows/knees in stills and read stiff mid-tween.
   Options in ascending effort: darker joint circles that read as
   deliberate (leotard seams/knee tape); slight limb tapering; or easing
   tweaks (`easeOutBack` on landings) so mid-frames spend less time in
   awkward positions. The five expressions + blink already added are
   good — use them more (e.g. concentrating face while a word is being
   typed, proud face on streaks).
6. **Differentiate blank states in story text harder.** Filled (green) is
   clear; active vs upcoming (light purple vs gray underscores) is too
   subtle at reading distance for a 8-year-old. Give the active blank a
   gentle pulse and a leading 🔊 glyph; keep upcoming blanks flat.
7. **Results podium moment.** The waist-up mascot + medal works; a
   podium riser, falling confetti that matches medal tier (already
   wired), and the three judges holding up score cards would make the
   payoff screen feel like a ceremony. Low risk: it's a static screen.

What NOT to do: don't introduce a component framework, an asset pipeline
beyond the existing esbuild step, raster art that fights the SVG look, or
any animation that can't be disabled by reduced-motion. Don't touch the
explorer/Language Play screens in this pass — same scoping discipline every
prior handoff used.

## 6. Educational elevation brief (ranked)

The app currently teaches by *practice with kind feedback*. The next tier
is teaching by *instruction at the moment of error*. Ranked:

1. **Pattern moments — the highest-value change in this document.** When
   she misses `much` → `muhc`, the game shows red letters but never says
   *why*. The curriculum already organizes every word into named phonics
   clusters — but only as source comments (CLAUDE.md records this
   decision and its extension point). Promote cluster labels to data on
   the list object (per HANDOFF-PARENTS §8's sketch, *on the list, not
   the tuple*), and on a miss whose pattern is known, add one line to the
   retry card: "**ch** says /ch/ — like in *chin* and *lunch*." This
   converts every miss from a retry into a lesson, at the exact moment of
   maximum attention, with content that already exists.
2. **Make Story Spelling exercise comprehension, not just dictation.**
   Today the paragraph is context *decoration* — she hears the word, so
   she never needs to read the sentence. Add a "predict" beat: before
   TTS speaks, highlight the active blank and offer "What word do you
   think goes here? 🔊 Tap to hear it" — even if she always taps
   through, the pause invites reading; and a future variant can score
   the prediction (cloze with typed recall after, the gold standard).
   This closes the gap between what the mode looks like it teaches
   (reading) and what it currently teaches (listening + spelling).
3. **A writing surface.** Everything in the app is single-word entry.
   Lowest-cost addition with real writing value: after a routine, offer
   one optional "champion sentence" — she types her own sentence using
   one word she spelled, it's saved unscored to the profile, and the
   Grown-Ups dashboard shows it. No grading engine needed; the parent is
   the audience. (New profile field — follow the `blankProfile()`
   merge-on-load convention.)
4. **Dyslexia-conscious options.** Add a Grown-Ups toggle for: a rounder,
   high-x-height letter face for the letter tiles (self-hosted font file —
   allowed under the relaxed asset rule as long as it's local), increased
   letter-box spacing, and b/d-confusion-aware feedback (when the typed
   letter is the mirror of the target, the retry hint can say "b or d?
   Check which way the bump points"). None of this changes scoring.
5. **Close the loop the dashboard already hints at.** `summary.activity`
   tags exist on every recorded session but nothing reads them
   (HANDOFF-PARAGRAPH §8 deferred it). Add a Story vs Words split to the
   Progress tab so a parent can see whether story-context spelling lags
   or leads isolated spelling — that's a genuinely diagnostic signal and
   the data is already being written.
6. **Grade-jargon copy pass.** Setup-screen blurbs ("r-controlled vowels,"
   "Latin suffixes") speak to parents in a screen the child drives. Keep
   the precision for Grown-Ups; give the child-facing tiles child-facing
   promises ("Bossy R words!").
7. **TTS ceiling.** Browser voices are the single biggest quality variable
   in the whole experience and vary wildly per device. The no-third-party
   rule forecloses cloud TTS, but a future pass could ship recorded
   word/sentence audio for the finite word list as static local assets
   (261 words + sentences is recordable in an afternoon by one parent —
   which would also be adorable). Flag for the owner; don't build
   speculatively.

## 7. Suggested order of work

Fix defects 2–3 (viewport + input locking) first — they're small and
every later screenshot you take will be judged through them. Then the
Story arena (§5.1) and pattern moments (§6.1) as the two flagship items —
one visual, one educational, both high-impact and independent. Then crowd/
judges (§5.3–5.4), story-blank states (§5.6), dashboard split (§6.5), and
outward from there by the rankings. Bump `APP_VERSION` and `sw.js`'s
`CACHE_NAME` together when you ship (CLAUDE.md documents why), and add
your own §-numbered addendum to this file recording what you actually did
— the chain convention applies to you too.

## 8. Open questions for the project owner

1. May a self-hosted font file (e.g. a dyslexia-friendly face for letter
   tiles) join `assets/`? The relaxed asset rule appears to allow it, but
   it's the first *font* through that door.
2. Is recorded-audio-by-a-parent (§6.7) appealing enough to schedule? It
   obsoletes the TTS-quality ceiling entirely for the fixed curriculum.
3. Should ReviewBot's leftover profile simply be deleted (Grown-Ups →
   Players → Delete), or kept as a demo/test profile? It holds 2 sessions,
   5 stars, and one purchased hairstyle, and syncs like any other profile.
4. The live bundle appears one commit behind `main` (§4.7) — is CI
   auto-deploying, or does a deploy need a manual trigger?

---

## 9. Addendum — first elevation pass (shipped)

Worked §7's suggested order. Shipped as `APP_VERSION` **1.1.0** (`sw.js`'s
`CACHE_NAME` bumped to `mila-cache-v2` in the same change, per CLAUDE.md).
`node tests/check.js` passes; `npm run typecheck` reports no errors that
weren't already there on `main`.

### 9.1 Defects

| # | Status | What changed |
|---|---|---|
| 1 | **Fixed** | See §9.2 — the Story arena. |
| 2 | **Fixed** | `.arena` now caps its *height* against the viewport (`--arena-h`, `clamp(150px, 38dvh, 420px)`) and derives `max-width` from it, so the box shrinks whole rather than being cropped by `preserveAspectRatio="slice"`. Verified at 1568×639: arena, prompt, letter boxes and input are co-visible on both game screens. `#screen-paragraph`'s arena overrides to a tighter `24dvh` because that screen also carries a paragraph. |
| 3 | **Fixed** | `lockSpellInput()` / `lockParaInput()` disable input+submit+hint for the whole non-`spelling` window; `advance()` / `advanceParaBlank()` flush the box on the way out. Disabled rather than cleared on lock, deliberately, so her answer stays readable next to the green/red boxes during the reveal. |
| 4 | **Partly fixed** | The native `confirm()` half is done: all ten call sites now use `askConfirm()`, a promise-returning in-design modal (Escape and backdrop cancel, the *dismissing* button takes focus, destructive calls colour the confirming button). The intermittent renderer freezes are **not** diagnosed — see §9.5. Two unguarded `setTimeout`s that could throw inside a timer (leaving a session screen during the 700ms whistle beat) were found and guarded while in there; whether that was one of the freezes is unproven. |
| 5 | **Fixed** | `startParagraphSession()` now renders the passage and HUD *before* the whistle beat, so `#para-text` is populated from the first frame and can't be spoken into while empty. |
| 6 | **Fixed** | `retryOpener()` picks copy by how close she got: ≥60% of positions right → "So close"; some right → "Some of it is right"; **nothing** right → "Let's hear it again 🔊 — listen for the very first sound." The `wrng`-for-`much` case from §4.6 was used as the screenshot fixture. |
| 7 | **Not addressed** | A deploy/CI question, not a code one. Still open — see §8.4. |

### 9.2 Graphics (§5)

- **§5.1 Story stage — done.** `#screen-paragraph` has a reading-corner-in-a-gym
  rather than a recolour of the competition arena: bookshelf with three shelves
  of books, a floor lamp throwing a warm pool of light, mats stacked like
  cushions, bunting, and a STORY TIME banner. Every colour is a class routed
  through a new `--story-*` block in `:root`, so a re-theme is still one edit —
  no inline hex was added. Her floor contact stays at `y=312`, so the shared
  `Gymnast`/`Animator` setup needed no per-screen tuning. **Not done:** seating
  her "listening" between blanks, which needs new pose data; she idles.
- **§5.2 Viewport — done**, see defect 2.
- **§5.3 Crowd — done.** Five silhouettes (plain, arms raised, foam finger,
  hair bow, pennant) instead of one repeated capsule, plus a stadium wave that
  ripples left to right when she lands a difficulty-3+ skill. Both delays are
  CSS custom properties set in `buildCrowd()` rather than an inline
  `animation-delay` — an inline declaration would have beaten the wave rule and
  flattened the ripple into one synchronised jump. `crowdWave()` returns early
  under `prefersReducedMotion()` rather than relying on the blanket CSS rule,
  which would otherwise fire all ~50 spectators at once.
- **§5.4 Judges — done, with one deliberate change.** They have eyes, a mouth
  with calm/impressed states, and score cards that raise. The trigger is **not**
  routine end as the brief suggested: `showScreen("results")` has already hidden
  that screen by then, so a card raised there would never be seen. They react
  mid-routine instead, on the same difficulty ladder the confetti and crowd
  volume already use. The cards carry a star, not a number — `judgeScores()`
  owns the only scoring in this game and a second set of numbers would read as
  a competing score.
- **§5.5 Figure joints — not done.** Untouched; still open exactly as written.
- **§5.6 Blank states — done.** The active blank now differs on four channels at
  once (solid tinted chip, thicker border, a leading 🔊, and a glow that
  breathes) while upcoming blanks went flatter. The pulse animates `box-shadow`
  rather than `transform: scale`, because scaling an inline-block inside a
  paragraph nudges the whole line of text as it breathes.
- **§5.7 Results podium — not done.** Untouched.

### 9.3 Education (§6)

- **§6.1 Pattern moments — done, the flagship of this pass.** Each `g1`-`g5`
  list in `js/words.js` now carries `patterns: [{ id, label, tip, words }]`,
  promoted from what were only `//` comments — on the list object, not the
  tuple, exactly as CLAUDE.md and HANDOFF-PARENTS §8 specified. All 261 words
  are classified into 28 clusters. A miss adds one line to the retry card:
  "💡 **Digraphs** — Two letters, one sound: sh, ch, th and wh each make a
  single sound. Like *shop* and *that*." Examples are drawn from the pattern's
  own words minus the missed one, so the card still never prints the answer she
  is trying to recall. It also appears on the multiple-choice reveal, which is
  the first moment the spelling is legitimately on screen.
  - The lookup (`patternFor`/`patternHint`) is **global across lists**, not
    scoped to the list being played. A word lands in exactly one of `g1`-`g5`
    (already enforced), so it's unambiguous — and it means Story Spelling's
    blank words, which come from `js/passages.js` and belong to no `WORD_LISTS`
    list, get the same lesson for free. Verified in a screenshot: a missed story
    blank `team` produces the g2 "Vowel teams" lesson.
  - `bonus` is deliberately left unclassified: it's sport vocabulary chosen for
    meaning, not a phonics-designed list, so there's no honest cluster for it.
    Unclassified words (bonus, custom lists, off-curriculum story words) return
    null and the card degrades to what it always showed.
  - The word membership is duplicated between `words` and `patterns[].words`.
    `tests/check.js` is the other half of that trade: it asserts every `g1`-`g5`
    word is in exactly one pattern, that no pattern invents a word its list
    doesn't have, that every pattern has 3+ words so two examples are always
    available, and that `patternHint()` returns two distinct non-answer examples
    for all 261 words. Adding a word without classifying it fails the build.
- **§6.5 Words vs. Stories — done.** `Store.activitySplit()` (pure and tested,
  same shape as `selectReviewPool`/`sessionTrend`) reads the `summary.activity`
  tag nothing had ever read. The Progress tab gets an accuracy-per-activity pair
  of cards plus a plain-English verdict, and Recent sessions gains an Activity
  column. Renders **nothing** until she's played both — a "no data" card beside
  a real one is noise for a household that only uses word mode, and the
  comparison is the whole point. Sessions recorded before Story Spelling existed
  carry no tag and count as word mode, which is what they were; there's a test
  for that.
- **§6.6 Grade-jargon copy — done (the cheap half).** The four setup-screen
  blurbs lost their parent-register jargon ("r-controlled vowels" → "Bossy R
  words", "Latin suffixes" → "Big endings like -tion and -ous"). Pattern
  *labels* deliberately keep classroom-standard terms where a teacher would use
  them (Silent e, Vowel teams, Digraphs, Prefixes) — echoing her teacher's
  vocabulary is a bridge, not jargon; the register §6.6 complained about was the
  linguistics one, and "Bossy R" is literally that section's own example.
- **§6.2 (comprehension "predict" beat), §6.3 (champion sentence), §6.4
  (dyslexia-conscious options), §6.7 (recorded audio) — not done.** All four are
  still open exactly as ranked. §6.4 and §6.7 both wait on §8.1/§8.2 anyway.

### 9.4 Changes this pass made that weren't in the brief

- `showFeedback()` scrolls a **"bad"** card into view (`block: "nearest"`, so a
  no-op on a tall window). Fixing defect 2 made the arena+input fit, but the
  feedback card appears *below* all of it — so on a 639px window the retry card,
  and with it §6.1's whole lesson, landed under the fold. Only "bad" scrolls: a
  correct answer's card sits under the arena on purpose, because the payoff
  there is watching her perform, and scrolling away would take it off screen.
- `tests/screenshots.js` gained four drivers — `story-play`, `story-lesson`,
  `game-lesson`, `modal-confirm`. The Story screen had **no** driver at all
  before, which is part of why §4.1 went unnoticed for a whole handoff. Every
  claim in §9.1-§9.3 was checked against headless Edge screenshots at 1568×639
  (the review's own viewport) and at 1100×1000.

### 9.5 Still open — read this before picking up the next pass

1. **Defect 4's freezes are undiagnosed.** The native `confirm()` half is fixed
   and two unguarded timers were closed, but nobody reproduced the 5-30s
   renderer hangs. Both candidate causes the review named (`speechSynthesis`
   stalling on voice enumeration; the confetti/rAF pipeline during
   `showScreen()`) are still unexamined. This needs a live session with a
   performance profile running, which is not something a headless screenshot
   pass can do.
2. **§5.5 (figure joints), §5.7 (results podium), §6.2, §6.3, §6.4, §6.7** are
   untouched and their rankings still stand.
3. **§8's four questions are all still open** — none were this pass's to answer.
   In particular the live bundle being one commit behind `main` (§8.4) was never
   confirmed either way, and ReviewBot is presumably still there.
4. **The story arena has no crowd**, on purpose (§5.1 said crowd optional), so
   `crowdWave()`/`reactJudges()` are word-mode-only. If a future pass wants the
   story stage to react too, it needs its own idea of what reacts — the books
   and the lamp, maybe — rather than importing the stands.
