# Handoff → Story Spelling (a second speller-track activity)

You are inheriting a working, fully playable app. The "speller" track (Mila's own
track, `Store.data.stage === "speller"`) has had exactly one activity since the
project started: hear one word, type it, get letter-by-letter feedback. This pass
adds a second one — **Story Spelling** — without touching the first. If you're
reading this to go further, §8 below is where the open work lives.

---

## 1. What this is

She reads a short gym/cheer-themed paragraph with a few words missing. For each
blank, in reading order, she hears the missing word spoken aloud and types it in.
Already-answered blanks show her correct word in place, so the paragraph keeps
reading naturally as she goes; the one blank she's currently on is active
(audible + typeable); everything after it is a plain blank line. This is the
project owner's own illustrative example, almost verbatim:

> "This morning I ___ (hear 'walked') to my school. My ___ (hear 'friends') were
> ___ (hear 'waiting') for me. My friends and I have so ___ (hear 'much') fun
> together."

It lives entirely inside the existing speller track — same profiles, same stars,
same avatar, same judges — as a second activity alongside the original one-word
flow, not a replacement or a toggle on it.

## 2. Where you sit in the chain

```
  engagement (done) → UI (active) → parents (first pass done) → curriculum (done, g1-g5)
                                                                        ↓
                                                                       YOU
```

Running in parallel: architecture (K8s/build-step/sync), and a second branch off
`HANDOFF-EARLY-LEARNER.md` for the explorer track (`HANDOFF-SPEECH-AND-LANGUAGE.md`).
Neither of those is relevant here — this pass is scoped entirely to the speller
track, the same reasoning `HANDOFF-CURRICULUM.md` already established for
`js/words.js`. Nobody was downstream of `HANDOFF-CURRICULUM.md`; this pass is now
downstream of it (reuses grade-appropriate vocabulary for blank words) without
touching `js/words.js` itself. Nobody is downstream of this pass yet.

## 3. Decisions the project owner made before any code was written

These aren't up for re-litigation — they shaped everything below:

1. **New, separate mode with its own home tile.** Not folded into the existing
   spelling screen/session as a toggle. The original single-word flow's scoring,
   streaks, and phase machinery are completely unaffected — reuse only where it
   was clean to.
2. **New, hand-authored prose**, not a mechanical stitch of `js/words.js`'s
   one-sentence-per-word entries. Blank *words* may still lean on grade-appropriate
   vocabulary for curriculum alignment, but the paragraph text itself is new
   writing.
3. **Typing, not multiple choice**, for each blank — the same recall mechanic as
   the existing flow, not the explorer track's tap-to-choose.
4. **Both practice and competition mode from day one.** Competition routes
   through the existing three-judges-out-of-10 system
   (`judgeScores()`/`medalFor()`), not a parallel scoring scheme.

## 4. What shipped

- **`js/passages.js`** — a new, leaf ES module (no imports of its own, same
  pattern as `words.js`/`letters.js`/`language.js`). `PASSAGE_LISTS` holds 30
  passages across `g1`-`g5` (6 per grade), grade-keyed the same way
  `WORD_LISTS` is so the concept of "her current grade" generalizes across both
  activities. Each passage is `{ id, text, blanks }`: `text` is the paragraph
  with every missing word marked as the literal token `"{blank}"`, and `blanks`
  is the ordered list of words those markers resolve to, left to right — see
  the file's own header for why this is positional rather than numbered
  (`{0}`/`{1}`) placeholders. `passageSegments(passage)` is the one pure parser
  that turns that into an ordered `{ type: "text" | "blank", ... }` array;
  everything else (the renderer in `js/app.js`, the tests) consumes that same
  shape rather than each re-deriving it from the raw token.

  Also in this file, all pure and DOM-free so they barrel-export into
  `tests/testEntry.js` cleanly: `shufflePassages`, `pickPassages` (draws N
  passages without repeating one until the pool is exhausted, then reshuffles
  — same trick `js/app.js`'s own `shuffle()`/`currentWord()` already use for
  word mode), `buildBlankQueue` (flattens an ordered list of passages into one
  ordered queue of blanks to play, with an optional `startIndex` so a
  practice-mode session can extend its queue without renumbering what already
  played), and `allBlankWords` (every distinct blank word in a grade, for the
  multiple-choice fallback's distractor pool).

  Blank count per passage climbs by grade the same way `js/words.js`'s average
  word length does — `tests/check.js` now asserts it (`g1` averages 3.0
  blanks/passage up to `g5`'s 5.33).

- **`#screen-paragraph`** (`index.html`) — a new screen, structurally a peer of
  `#screen-game`: a HUD bar (score/stars/streak/dot-row/progress/quit — same
  markup shape and CSS classes as the original, new element ids), a stage
  reusing the `.arena` class directly (full `0 0 700 380` viewBox and the same
  `{min:170,max:530}` travel bounds as the main arena, since `chooseSkill()`'s
  whole escalating-difficulty pool — including travelling skills — is reused
  here too, unlike the explorer track's confined, non-travel-only stage), and
  a story panel reusing `.spell`/`.letter-boxes`/`.spell-input-row`/`.feedback`/
  `.mc-choices` wholesale. Only the story text itself
  (`.para-text-card`/`.para-story-text`/`.para-blank`) and one flat-fill CSS
  rule (`.para-mat`) are genuinely new styling — see §6 for why the stage
  skips the main arena's crowd/judges/banner scenery.

- **Two new home tiles**, "Story Practice" and "Story Competition"
  (`stage-speller`, so they're invisible to explorer-stage profiles exactly
  like the original Practice Gym/Competition tiles), each launching
  `startParagraphSession({ mode, sport, grade })` directly — see §7 for why
  there's no setup screen in between.

- **Session logic in `js/app.js`** — `paragraphSession`, a parallel session
  object to `session`, driven by a parallel set of functions
  (`nextParaBlank()`, `submitParaAnswer()`, `handleParaCorrect()`,
  `promptParaRetry()`, `startParaMultipleChoice()`, `rewardParaFix()`,
  `advanceParaBlank()`) that mirror the original word-mode functions closely
  enough to read side-by-side, but target `#screen-paragraph`'s own DOM ids
  and a paragraph instead of a bare word. See §6 for exactly what's forked
  and what's genuinely shared.

## 5. What a "routine" means here (the required decision)

A Story Spelling competition routine is **`PARAGRAPH_ROUTINE_LENGTH` (currently
a fixed constant, `3`) whole passages**, each played to its natural end — not a
target blank count. Word-mode's `routineLength` (6/10/16) counts words because
every word is a self-contained unit that can end a routine cleanly. A paragraph
isn't: hitting an exact blank-count target would mean cutting a passage off
mid-sentence, leaving a half-finished blank line on screen at the end of a
routine, which reads as broken rather than deliberately finished. Counting whole
passages instead means every story she starts in a competition, she finishes.
`paragraphSession.total` is still the *blank* count (`buildBlankQueue()`'s
length for those 3 passages) — that's what the HUD's progress readout and
`judgeScores()`'s accuracy math actually use — but which passages make up the
routine is decided up front, by story count, not blank count.

Practice mode is open-ended, the same shape as word-mode's `currentWord()`:
`currentParaBlank()` picks two more passages and extends the queue once the
current one runs out, rather than ending the session.

## 6. What's forked vs. genuinely reused

Read `js/app.js`'s own header comment above the Story Spelling section before
changing any of this — it's not a summary, it's the actual reasoning, kept next
to the code it explains.

**Forked** (a parallel implementation, not a mode flag through the original):
the whole three-tries → multiple-choice-fallback teaching-moment ladder
(`submitAnswer`/`handleCorrect`/`promptRetry`/`startMultipleChoice`/`rewardFix`
→ their `*Para*` counterparts). `session`'s phase machinery is tightly wired to
"one word, no surrounding text" and to `#screen-game`'s own DOM ids;
retrofitting a multi-blank paragraph into it risked breaking the flow players
already trust, for no real savings. This is the exact same call
`HANDOFF-EARLY-LEARNER.md` made for Letter Play not bending `session` either —
read `startLetterRound()`'s header comment, it's the same reasoning one level
removed.

**Genuinely reused, unchanged**: `markLetters()` (pure), `chooseSkill()`,
`judgeScores()`, `medalFor()`, the point/star reward formulas (copied verbatim
into the `*Para*` functions since they're small and the two ladders needed to
stay independently editable, not shared through an indirection that would make
either one harder to change safely later), `Store.recordAttempt()`/
`recordFixOutcome()`/`addStars()`/`claimDailyBonus()`/`recordSession()`,
`paintGoal()`, `burstConfetti()` (already took a `container` parameter),
`escapeHtml()`.

**Genuinely reused, lightly generalized** (2-3 line changes, backward
compatible): `showFeedback()`/`hideFeedback()`/`announceSkill()` now take an
optional target element instead of hardcoding `#feedback`/`#skill-name`, so
`showParaFeedback()`/`hideParaFeedback()` are one-line wrappers instead of
duplicate implementations.

**The big one — `finishRoutine(s, activity, clearFn)`**: `finishSession()`'s
entire body (judge scoring, medal assignment, daily bonus, `Store.recordSession()`,
`renderResults()`, sync) was pulled out into a shared function taking the
session object, an `activity` tag, and a callback to null out whichever
module-level variable actually owns it. `finishSession()` and
`finishParagraphSession()` are now both a few lines calling it. This was safe
specifically because `paragraphSession` was designed to carry the exact same
field names `finishRoutine()`/`renderResults()` already read
(`mode`/`sport`/`listKey`/`listLabel`/`correct`/`wrong`/`hints`/`hintedWords`/
`bestStreak`/`startTs`/`stars`/`results`) — `results` entries are
`{ word, typed, right, ms, hint }`, identical shape to word-mode's, since a
blank's target word plays exactly the same role a whole word does there.
`#screen-results` needed zero changes. The one new field, `summary.activity`
(`"spelling"` or `"paragraph"`), is a pure display/future-dashboard tag —
nothing in game logic reads it back, and `Store.sessionTrend()` ignores fields
it doesn't recognize, so this is a safe additive field for old saves.

The `#screen-results` "Again!" button now checks a small `lastFinishedActivity`
module variable (set by `finishRoutine()`) to know which activity to restart,
since the results screen is now shared by both.

## 7. Why there's no dedicated setup screen

Word-mode's `#screen-setup` exists because it has three independently
meaningful per-session choices: sport, grade, routine length. Story Spelling
only varies mode (practice/competition), and its two home tiles already encode
that directly — tapping "Story Practice" or "Story Competition" launches
straight into `startParagraphSession()`, no picker in between. This follows
Letter Play/Language Play's precedent (jump straight from the home tile into
the activity) rather than word-mode's (which has a setup screen specifically
*because* it has more than one thing to configure per session). Grade and sport
ride on the exact same `settings.grade`/`settings.sport` a grown-up or she
already set from word-mode's own setup screen — deliberately not a second,
independent "which stories should I get" concept. `getPassageList()` falls back
to `g3` for an unrecognized or custom-list grade key, mirroring
`Store.getList()`'s own fallback for word mode.

## 8. Open questions — yours, if you're the next pass here

- **A length/grade picker.** `PARAGRAPH_ROUTINE_LENGTH` is a hardcoded `3`;
  there's no UI anywhere to change it, or to pick a specific grade for a
  one-off Story Spelling session independent of word-mode's own grade
  setting. If a grown-up or an older player wants that control, it's a
  self-contained addition — a small setup screen or a dashboard setting, your
  call, with the same "say why" standard every prior choice in this chain was
  held to.
- **Grown-Ups dashboard visibility.** `summary.activity` is recorded on every
  session but nothing reads it back yet — the Progress tab's session-trend
  chart, word-list breakdowns, and the admin page's session history all
  currently show Story Spelling sessions mixed in with word-mode ones,
  indistinguishably. Whether that's fine (arguably it is — both are the same
  underlying skill) or worth a filter/badge is an open call for whoever owns
  the dashboard next.
- **A UI/graphics pass over `#screen-paragraph`.** This was built to match the
  existing visual language exactly (reused CSS classes wherever they fit), not
  audited by a design-focused pass the way `HANDOFF-UI.md`'s graphics pass did
  for the rest of the app. The stage deliberately drops the main arena's
  crowd/judges/banner scenery to leave room for the story text — whether that
  reads as a deliberate, coherent simplification or as "the paragraph screen
  looks unfinished next to the others" is worth a second, design-focused set
  of eyes.
- **Does the explorer track ever want something like this?** Nothing here
  assumes it should — a paragraph-with-blanks task is a recall-typing task,
  the exact interaction `HANDOFF-EARLY-LEARNER.md` and
  `HANDOFF-SPEECH-AND-LANGUAGE.md` both deliberately kept out of the explorer
  track in favor of tap-to-choose. If that ever changes, it's a new decision
  for whoever owns that track, not an extension of this file.
- **Passage variety over time.** Six passages per grade means a competition
  routine (3 stories) can repeat within a handful of sessions, and practice
  mode's wraparound (`pickPassages()`) will start reshowing passages fairly
  quickly too. This mirrors `js/words.js`'s own word-count-per-grade tradeoff
  at launch — more content is easy to add later (append to `PASSAGE_LISTS`,
  keep authoring new prose per §3.2) but wasn't the bottleneck for shipping
  this pass.
