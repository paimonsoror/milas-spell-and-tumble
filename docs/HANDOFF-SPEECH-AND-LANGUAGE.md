# Handoff → Speech & Language Practice Specialist

You are inheriting a working, fully playable app with two tracks: a spelling game
for an 8-year-old, and a separate pre-literacy "explorer" track
(`docs/HANDOFF-EARLY-LEARNER.md`) built for her 5-year-old sibling. Your job is to
extend that second track with two new practice activities the project owner
identified from real, current struggles: mixing up "she"/"her" in her own speech
("her is 3 years old"), and confusing "th" and "f" sounds (she says "fermometer"
for "thermometer"), which her speech therapist is actively working on with her
using a specific tactile technique — read §5 before you design anything, it
changes what's actually buildable here.

**You are empowered to change things.** Nobody has built anything like this in the
app yet — there's no grammar-drill content, no articulation content, and no
precedent data shape for either. The invariants in §7 are the hard limits; the
rest is yours to design, the same way every prior specialist in this chain was
asked to make a call and justify it rather than build every option.

---

## 1. Who this is for

The same 5-year-old `docs/HANDOFF-EARLY-LEARNER.md` was written for — not a new
child, not an abstract kindergartner. She's already using this app's "explorer"
stage (`Store.data.stage === "explorer"`) for letter-name and letter-sound
recognition. You're not building her a new track; you're adding to the one she
already has. Two concrete, current struggles, from the project owner directly:

- **Pronoun case.** She swaps subject and object pronouns — "her is 3 years old"
  instead of "she is 3 years old." This is spoken-grammar production, not
  reading or spelling.
- **/θ/ vs /f/ (the "th" and "f" sounds).** She substitutes "f" for "th" —
  "fermometer" for "thermometer." Her speech therapist teaches the distinction
  with a tactile/visual cue: tongue-to-teeth for "th," lower-lip-to-teeth for
  "f." That's a real, specific technique already working for her outside this
  app — read §5 for why that matters to what you build, and §8 for why you
  should ask the project owner for the therapist's actual word list before you
  invent your own.

As with every prior handoff in this chain: this is one specific real child with
a real, current intervention already underway, not a market segment. Where you
can get more detail from the project owner (what her speech therapist's session
actually looks like, which specific words come up, how she's cued at home
today), that beats guessing.

## 2. Read this first

- **`CLAUDE.md`** — the engineering manual: architecture, the save-file contract
  and migration policy, testing. Read the "Save file" section before touching
  `js/store.js` — you're about to add new profile fields, and the existing
  discipline (a default in `blankProfile()`, never rename or repurpose a key)
  is what keeps old saves opening safely.
- **`docs/HANDOFF-EARLY-LEARNER.md`**, in full. It's the reason the explorer
  stage exists at all: the age-tailoring reasoning, the never-punitive tone
  ("doubly so" at this age — its words), the tap-to-choose interaction it chose
  over typing, and the TTS constraint it already solved once (a browser voice
  asked to speak a bare letter says the letter's *name*, not an isolated sound
  — there's no reliable cross-browser way around that). You are extending this
  child's track, not starting a third one; read how the first two decisions
  were made before making a third.
- **`js/letters.js`**, in full — it's short. It's the closest precedent for
  what you're building: a small, self-contained content file with pure helper
  functions (`nextLetterLevel`, `chooseOptionCount`, `selectLetterPool`) kept
  separate from the game/DOM code specifically so `tests/check.js` can exercise
  them without a live `Store` or a browser. Match that shape.
- **`docs/HANDOFF-ENGAGEMENT.md`** — the reward-psychology brief. Its
  never-punitive principles (soft wrong-answer sound, no timer, hints free,
  praise over deduction) apply here at least as strongly as they did for the
  explorer track generally, and more so for the "th"/"f" activity specifically
  — see §7.5.

Open `index.html`, switch a profile to the "Little Learner" stage from the
Grown-Ups dashboard's Settings tab, and play a round of Letter Play
(`startLetterRound()` in `js/app.js` ~1361) end to end. `node tests/check.js`
must stay green; you will be adding assertions, not just preserving old ones.

## 3. Where you sit in the chain

```
  engagement (done) → UI (active) → parents (first pass done) → early-learner (done)
                                                                        ↓
                                                          curriculum (done, g1-g5)
                                                                        ↓
                                                                       YOU
```

You're a second branch off `HANDOFF-EARLY-LEARNER.md`, not a continuation of the
grades 1-5 curriculum chain — you don't touch `js/words.js`, and nothing in
`docs/HANDOFF-CURRICULUM.md` constrains you. Nobody is downstream of you yet. If
that changes, leave the same kind of note for whoever's next that every
specialist before you has left.

## 4. What exists today that you can build on

The explorer track's actual game loop, all in `js/app.js`, is a good template
even though your content isn't letters:

- **`startLetterRound()`** (~1361) picks a weighted set of items
  (`Store.selectLetterPoolForRound()` → `selectLetterPool()` in `js/letters.js`),
  builds a session object, and shows the `#screen-letters` screen.
- **`renderLetterChoices()`** (~1397) renders 2-4 tappable buttons
  (`chooseOptionCount()` flexes the count with her current streak/miss-streak),
  one correct.
- **`speakLetterPrompt()`** (~1418) speaks the prompt via `Speaker.say()`, with
  a text/flashcard fallback when speech is unavailable or muted — speech is
  never required to play.
- **`pickLetter()`** (~1450) grades the tap, updates streak/accuracy bookkeeping
  via `Store.recordLetterAttempt()`, and triggers the avatar's reward cadence
  (every 4th correct pick, not every one — a deliberate choice, see
  `docs/HANDOFF-EARLY-LEARNER.md` §5).
- **The screen markup** (`index.html` `#screen-letters`, ~299-328): a HUD
  (streak dots, star count), an avatar preview, a prompt, a "hear it again"
  button, a choice grid, and a summary panel. `css/styles.css`'s
  `.letter-choice-grid`/`.letter-choice` classes style the tap targets.
- **The stage-visibility pattern**: home-screen tiles carry a `stage-explorer`
  or `stage-speller` class, and `css/styles.css` hides whichever doesn't match
  the active profile's stage (`.home-grid.explorer .stage-speller { display:
  none }` and the mirror rule). The "Letter Play" tile (`index.html` ~50) is
  the existing example. New activities slot into this the same way.
- **The save shape**: `blankProfile()` in `js/store.js` (~94) has an
  `earlyLearner: { level, levelProgress, letters, roundsCompleted }` bucket,
  narrowly scoped to the letter track. **Don't repurpose it** — your two new
  activities need their own shape(s); see §6's data-shape note.
- **The dashboard**: `renderLettersProgressTab()` (`js/app.js` ~1996) is what an
  explorer profile sees instead of the word-spelling Progress tab, since
  `Store.data.stats` is never touched by that track. Whatever you build needs
  an equivalent, or an extension of it.

## 5. The hard constraint that shapes everything here: there is no microphone

Read this before you design either activity — it rules out the most obvious
idea for the "th"/"f" work.

`js/audio.js`'s `Speaker` class wraps `speechSynthesis` only. There is no
`SpeechRecognition`, no `getUserMedia`, no microphone access anywhere in this
codebase, and adding one would be a much bigger scope change than this handoff
is asking for (permissions, browser support gaps, and — for a child — real
privacy weight around recording audio, which invariant §7.2 rules out anyway).

**That means this app can never listen to her say a word and grade her
pronunciation.** It can only test *receptive* skills: can she pick the right
word when she hears it, can she tell two sounds apart, can she recognize which
mouth shape goes with which sound. It cannot evaluate — and must never imply it
evaluates — her actual spoken production. That's a real, meaningful limitation
for the "th"/"f" activity specifically, since the real-world problem
(`"fermometer"`) is about what she *says*, not what she recognizes. Design
around this honestly:

- Build the strongest receptive/discrimination version you can (§6, Part B) —
  it's genuinely useful, phonological awareness is a real prerequisite to
  correcting production, and it's what her speech therapist is *also* building
  toward, not a consolation prize.
- Say so explicitly in whatever the grown-up sees about this activity (a
  Settings blurb, a dashboard note) — something like "reinforces telling the
  two sounds apart; doesn't listen to or grade her speech" — so a parent
  doesn't overtrust what the game can tell them. This mirrors how
  `docs/HANDOFF-CURRICULUM.md` §7 flagged its own sentence-homophone audit as
  "not mechanically checkable, so it's a one-time audit, not an enforced
  guarantee" — say the honest thing about what the feature does and doesn't
  do, in the feature itself.

The pronoun activity doesn't have this problem — picking the right word for a
sentence blank is a receptive/selection task by nature, not a production one,
so a tap-to-choose interaction tests the real skill directly.

## 6. The ask, in two parts

### Part A — Pronoun practice (subject vs. object case)

Build a practice activity for the "she"/"her" (and, at your discretion, "he"/
"him", "they"/"them" — see §8) confusion: a sentence with a blank, spoken in
full by TTS, with 2-3 pronoun choices to tap, one grammatically correct. For
example (illustrative, not a curriculum — that's your job):

- "___ is three years old." → **She** (subject position) / *Her* (wrong)
- "I gave the ball to ___." → **her** (object position) / *she* (wrong)
- "___ likes to jump." → **She** / *Her*

This is entirely an audio/spoken-language task — it needs no reading ability at
all if you keep choices short and pair them with an icon or large glyph, which
fits a pre-reader far better than the letter track's text-forward moments do.
TTS speaking a full sentence with a natural pause (or a spoken placeholder like
"blank") for the missing word is ordinary text-to-speech — no isolated-phoneme
problem here, unlike §5's constraint for Part B.

Concretely, this needs:

- **A new content shape** — not `LETTERS`, not `WORD_LISTS`. Something like a
  list of `{ id, sentence template, blank position or two full sentence
  variants, correct pronoun, distractor pronoun(s), maybe a case tag }`. Your
  call on the exact shape; keep it in its own file (e.g. `js/grammar.js`),
  matching the reasoning `js/letters.js`'s own header comment gives for why
  it isn't `WORD_LISTS`.
- **A selection strategy** — `selectLetterPool()` in `js/letters.js` (~98) is a
  reasonable template to adapt: weight items by how shaky she's been on them,
  bias unseen items to show up early. It's written as a pure function for
  exactly this kind of reuse.
- **A UI** — either a new mode alongside "Letter Play" reusing the tap-to-choose
  mechanics wholesale, or a new "type" within a broadened letters-style screen.
  Given how different the content is (sentences and words, not single glyphs),
  a new screen is probably cleaner than bending `#screen-letters` to fit — but
  make that call and say why, the way `docs/HANDOFF-EARLY-LEARNER.md` §6 was
  asked to for typing vs. tapping.

### Part B — "th" vs "f" discrimination

Build a listening-discrimination activity around the /θ/-vs-/f/ confusion,
honest about the constraint in §5. The concrete, achievable version:

- **Minimal-pair or near-minimal-pair word choices.** TTS says a real word
  (e.g. "thumb"), she picks the matching option from 2 choices, where the
  distractor is the /f/-substituted confusion where a real one exists (e.g.
  "thin" vs. "fin," "thought" vs. "fought") — again, illustrative, not a
  finished list; build this with real pedagogical care about which pairs are
  genuinely confusable for a 5-year-old, not just orthographically similar.
- **A visual echo of the tactile cue her speech therapist already uses.**
  Since the game can't hear her say the word, it can still reinforce the
  *mouth-shape* distinction visually: tongue-between-teeth for "th" vs.
  lower-lip-to-teeth for "f." A simple inline SVG diagram (a face/mouth
  cross-section, or even a stylized icon pair) shown alongside each choice
  would echo a technique that's already proven to work for her specifically,
  rather than inventing a new one. `js/avatar.js`'s `Gymnast` is this
  codebase's existing precedent for hand-built inline SVG (no external image
  assets, per invariant §7.1) — not something to reuse directly, but proof
  the toolchain here can do this kind of drawing. Treat this as a strong
  direction, not a guaranteed deliverable — flag honestly in your own handoff
  if you scope it out.
- Same data-shape and selection-strategy guidance as Part A: its own content
  file, a weighted pure selection helper, and your own call on UI (a third mode,
  or a unified "Language Play" screen covering both A and B — again, your call,
  say why).

## 7. Invariants — these are hard

1. **No build step, no external assets, still.** Same folder-of-files,
   `file://`-loadable, zero-dependency constraint as everything else in this
   repo. Any diagram or icon is inline SVG or CSS, not an image file.
2. **No microphone, no audio recording, ever.** Not a partial version, not
   behind a flag. This is a hard line for a child user regardless of how useful
   speech input might seem — see §5.
3. **`node tests/check.js` stays green.** Add assertions for your new pure
   helpers and content shape(s), the same way `selectLetterPool()` and
   `nextLetterLevel()` are already covered.
4. **Old save files keep opening, unchanged in behavior.** New profile fields
   get a default in `blankProfile()`; never rename or repurpose an existing
   key (`earlyLearner` stays exactly what it already means).
5. **The never-punitive tone applies here at least as strongly as
   `docs/HANDOFF-EARLY-LEARNER.md` demanded for the letter track — arguably
   more.** A wrong tap on a pronoun or a "th"/"f" pair must never read as
   "your speech is wrong." She's mid-intervention with a real speech
   therapist on exactly this; a careless tone here risks undermining that
   work in a way a wrong spelling guess never could. Soft wrong-answer sound,
   no red marks, no "incorrect," full credit for trying — non-negotiable.
6. **Nothing here changes the letter track or Mila's speller experience.**
   You're adding to the explorer stage, not modifying `js/letters.js`'s
   existing content or `js/words.js` at all.
7. **Accessibility floor.** Visible focus outlines, `aria-pressed` patterns,
   `prefers-reduced-motion` support — keep them in anything new, matching
   what already exists in the dashboard and letters screen.

## 8. Open questions — yours to answer, and to push back on

- **Scope of pronoun pairs.** Just "she"/"her," or also "he"/"him,"
  "they"/"them," "I"/"me"? The project owner named "she"/"her" specifically as
  the current, live struggle — starting narrow and saying why is a legitimate
  answer, the same as every prior "pick a starting point" call in this chain.
- **Ask the project owner for the speech therapist's actual word list**,
  before inventing your own "th"/"f" minimal pairs. A real, in-progress speech
  therapy program almost certainly already has specific target words in use at
  home — reusing them (a) is more likely to actually help, since it reinforces
  rather than competes with real practice, and (b) is a much stronger footing
  than a generated list a game designer guessed at. If that's not available,
  say so and proceed with your own reasoned list, but ask first.
- **One combined "Language Play" screen, or two separate activities?** Given
  how different pronoun-sentences and th/f-word-pairs are as content, a shared
  screen might mean a "which kind of question is this" branch that's more
  complexity than it saves. Your call, the same way `docs/HANDOFF-EARLY-LEARNER.md`
  §6 was asked to justify typing vs. tapping rather than assume.
- **Reward cadence.** Letter Play rewards every 4th correct pick, deliberately
  not every one (`docs/HANDOFF-EARLY-LEARNER.md` §5's open question, resolved
  there). Does that cadence still fit a task with fewer, harder items per
  round, or does a sentence-completion task need its own rhythm? Get this
  wrong and, per that same doc, the payoff reads as either cheap or too
  distant to connect to the answer.
- **Does either activity want its own "level" progression**, the way letters
  moves upper → lower → sound? Or is difficulty better handled by
  `selectLetterPool()`-style weighting alone, with no explicit levels? Say
  which and why.
- **Is there a "graduating" story for either activity**, or are these
  open-ended practice with no endpoint (more like Practice Gym than Letter
  Play's level ladder)? Even "no, and here's why" is a useful thing to leave
  for whoever's next, per the standing convention in this chain.
