# Handoff → Grades 1–5 Curriculum Specialist

You are inheriting a working, fully playable spelling game built for one 8-year-old,
Mila, plus a second, separate track just finished for her 5-year-old sibling. Your
job is the one `CLAUDE.md` has been pointing at since before either of you existed:
`js/words.js`'s 252 words are placeholders, grouped by grade in name only, and need
to become an actual designed spelling curriculum for an already-reading child.

**You are empowered to change things.** The invariants in §6 are the hard limits —
read them before you plan anything. The most important one is the one this handoff
exists to draw clearly: **`js/words.js` is your surface. `js/letters.js` is not, and
never was meant to be.**

---

## 1. Who this is for

Same two real children as every other handoff in this chain:

- **Mila, 8** — reading and writing, loves gymnastics and cheerleading. The entire
  spelling game (`js/words.js`, the practice/competition modes, the whole reward
  economy) was built for her. This is still, unambiguously, her curriculum to design.
- **Her sibling, 5** — has their own separate track now (`js/letters.js`, the
  "explorer" stage, the Letter Play screen), covered by `HANDOFF-EARLY-LEARNER.md`.
  You do not own their content and should not need to touch it. The only thing you
  inherit from that track is the seam where it ends and grade 1 could begin — see §5.

## 2. Read this first

- **`CLAUDE.md`** — the engineering manual, especially the "Save file" section and
  the word-list / `Store.getList()` machinery `buildQueue()` already relies on.
- **`HANDOFF-ENGAGEMENT.md`** — the reward-psychology brief. Nothing about scoring,
  hints, or the never-punitive tone should change because of a curriculum change;
  if a word is genuinely too hard for its grade, that's a §3 curriculum problem to
  fix by moving the word, not a reward-economy problem.
- **`HANDOFF-UI.md`** and **`HANDOFF-PARENTS.md`** — for how word lists surface in
  the setup screen and the grown-ups dashboard (custom lists, pinning, review mix).
  You're extending `WORD_LISTS`, not building new UI for it — the setup screen,
  `Store.selectReviewPool()`, and the Focus tab all already work against whatever
  is in `WORD_LISTS`/`GRADE_ORDER`.
- **`HANDOFF-EARLY-LEARNER.md`** §9 and §5 below — the early-learner specialist's
  own account of where their track ends, written for you specifically.

Open `index.html`, play through a practice round on a couple of grades, and read
the actual word lists in `js/words.js`. `node tests/check.js` must stay green —
it already asserts every word is lowercase-only, has a sentence that contains the
word, and that each grade has at least 30 words; you will likely be tightening
those checks, not just satisfying them.

## 3. Where you sit in the chain

```
  engagement (done) → UI (active) → parents (first pass done) → early-learner (done)
                                                                        ↓
                                                                       YOU
```

Nobody is downstream of you yet. If that changes (a middle-school track, a
non-English list, whatever), leave the same kind of note for whoever's next that
every specialist before you has left.

## 4. What exists today — and why it's a placeholder, not a design

`js/words.js` holds six lists (`g1`…`g5`, plus a `bonus` gym/cheer list) totaling
252 `[word, sentence]` pairs. They were written to be *functional* — real English
words, roughly sorted by length and familiarity, each with a sentence that contains
it — not to reflect any actual grade-level spelling scope-and-sequence. There's no
phonics pattern grouping, no distinction between decodable words and sight words
that have to be memorized whole, and no signal for which words share a spelling
rule worth teaching together (e.g. silent-e, -tion endings, doubled consonants
before a suffix). That's the gap you're filling.

What you can build on without touching:

- **`GRADE_ORDER`** — the array that drives list order in the setup screen and the
  grown-ups dashboard's "Default word list" dropdown. Add to it if you add lists;
  don't reorder existing entries without checking both of those surfaces.
- **`Store.getList(key)`**, **`buildQueue()`**, **`Store.selectReviewPool()`** —
  the whole selection/review pipeline is already generic over "a list of
  `[word, sentence]` pairs." You shouldn't need to touch any of it.
- **The `bonus` list** — gym/cheer vocabulary, deliberately cross-grade. Leave its
  shape and purpose alone unless you have a specific reason tied to your work.

## 5. The seam: where the early-learner track ends and grade 1 could begin

The early-learner specialist's track (`js/letters.js`, `HANDOFF-EARLY-LEARNER.md`)
is a recognition task — hear/see a letter, tap the matching one from a few
choices — not spelling recall. It deliberately stops at letter names and sounds
and does **not** build CVC blending or any word-level task. Concretely:

- Its top level is `"sound"` (`LETTER_LEVELS` in `js/letters.js`): matching a
  letter to the first sound of a spoken clue word. There is no level after it.
- **"Graduating" out of the explorer track today is a manual, parent-set action**:
  the Grown-Ups dashboard's Settings tab has a "Learning track" toggle
  (`Store.setStage()`) that switches a profile between `"explorer"` and
  `"speller"` outright. There is no automatic hand-off, no partial-credit blend
  screen, and nothing that currently points a graduating explorer profile at
  `g1` specifically over any other list.
- This means **the gap between "knows letter sounds" and "grade 1 in `js/words.js`"
  is currently unaddressed** — `g1` (`cat`, `dog`, `run`, …) already assumes CVC
  blending and full recall-typing on a keyboard, which is a real jump up from
  matching a letter to a sound. Whether that gap needs a bridge (a CVC-blending
  level bolted onto the explorer track, an even-easier `g0` word list, or nothing
  at all because most kids close that gap between visits) is an open question
  neither prior specialist resolved — flagged here rather than left for you to
  discover by surprise.
- If you do decide `g1` needs to get easier or a bridge list needs to exist,
  build it as an ordinary addition to `WORD_LISTS`/`GRADE_ORDER` — the explorer
  track's data shape (`js/letters.js`, one row per *letter*, not per word) is not
  something to extend or repurpose for this; a word-level bridge list belongs in
  your file, not theirs, exactly the same as every other grade.

## 6. Invariants — these are hard

1. **`js/letters.js` and the `earlyLearner`/`stage` profile fields are not
   yours.** Read them if the seam in §5 requires it; don't modify them. If your
   design needs something from that track to change, that's a conversation to
   flag back up, not a change to make unilaterally in someone else's file.
2. **`node tests/check.js` stays green.** Its word-content checks
   (`GRADE_ORDER`/`WORD_LISTS` loop near the bottom of `tests/check.js`) currently
   require: lowercase-letters-only words, a sentence containing the word, and at
   least 30 words per list. Tighten these if your curriculum wants stronger
   guarantees (e.g. "every word in a phonics-pattern list actually contains that
   pattern"); don't loosen them.
3. **The `[word, sentence]` shape stays.** `buildQueue()`, `Store.getList()`, the
   custom-list importer, and the Focus/Word-Detail dashboard tabs all assume it.
   If a phonics-pattern grouping needs more metadata than that pair carries (e.g.
   which rule a word teaches), extend a *list's* shape (it's already an object
   with `label`/`blurb`/`words`), not the per-word tuple, and confirm nothing
   downstream breaks before committing to it.
4. **No external assets, still.** Same folder-of-files, `file://`-loadable,
   zero-dependency constraint as everything else in this repo.
5. **The reward economy is not yours to retune.** Word difficulty is a curriculum
   concern; if a word is landing wrong (too easy for its grade, too hard, a
   sentence that gives away the spelling), fix the word or its list placement —
   don't reach into `js/app.js`'s scoring in `handleCorrect()`/`judgeScores()` to
   compensate.
6. **Mila's save data keeps meaning what it already means.** `settings.grade`
   stores whichever list key was last chosen; if you rename or remove a list key,
   every existing save pointing at it needs to keep resolving to something
   sensible (`Store.getList()` already falls back to `g3` for an unknown key —
   don't rely on silently changing what a *known* key means instead).

## 7. Open questions — yours to answer, and to push back on

- **Phonics-pattern grouping vs. pure difficulty grouping** — should lists (or
  sub-lists within a grade) be organized around a spelling rule (silent-e, vowel
  teams, -tion/-sion, doubled consonants) the way real spelling curricula usually
  are, or is difficulty-only grouping fine for how this game is actually used
  (a parent picking "grade 3" for practice, not working through a syllabus in
  order)? Your call, the same way every prior specialist in this chain was asked
  to make and justify one.
- **The `g1`/explorer seam from §5** — does it need a bridge, and if so what
  shape? Even a "no, and here's why the gap is fine" is a useful answer to leave
  for whoever reads this next.
- **Sentence quality** — the existing sentences were written to be functional
  (contain the word, sound like a real sentence) rather than pedagogically
  considered (e.g. never accidentally rhyme with or contain a homophone of the
  target word in a way that could mislead). Worth auditing if you're touching a
  list anyway.
- **Should `bonus` (the gym/cheer list) get the same rigor**, or is it fine to
  stay a themed grab-bag since it's explicitly cross-grade and opt-in?
