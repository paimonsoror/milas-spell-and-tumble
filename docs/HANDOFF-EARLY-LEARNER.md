# Handoff → Preschool / Kindergarten Curriculum & Age-Tailoring Specialist

You are inheriting a working, fully playable spelling game built for one 8-year-old,
Mila. Her younger sibling, age 5, has seen her play and wants in. Your job is that
child's experience specifically: picking what a genuinely appropriate activity for a
5-year-old looks like, and making the app able to tell the two children apart at all
— today it cannot.

**You are empowered to change things**, including adding a new interaction mode
alongside the existing spelling game. The invariants in §7 are the hard limits —
read them before you plan anything, especially the one about not regressing Mila's
save file, because the riskiest part of this brief is retrofitting an "age" concept
onto a save format that has never had one.

---

## 1. Who this is for

Two real children now, not one:

- **Mila, 8**, the game's original and current design target. Reading and writing,
  loves gymnastics and cheerleading. Everything in `CLAUDE.md` and the existing
  handoffs (`HANDOFF-ENGAGEMENT.md`, `HANDOFF-UI.md`, `HANDOFF-PARENTS.md`) was
  written for her. **Nothing about her experience should change because of your
  work** unless you have a specific reason tied to the age feature itself (e.g. a
  profile picker that now shows two kinds of card).
- **Her sibling, 5**, preschool/kindergarten age, who is the actual audience for
  this brief. Their dad — the project owner — is not a professional educator and is
  relying on you to know what a real pre-literacy curriculum looks like and what
  holds a 5-year-old's attention, the same way `HANDOFF-ENGAGEMENT.md` relied on its
  author's judgment about child engagement generally. Where you have expertise the
  previous specialists didn't, use it; don't hedge into a generic "kids' app" that
  could be for either child.

As with the earlier briefs: this is one specific real child, not a market segment.
If you can get more detail from the project owner about this child specifically
(pre-reader vs. already knows some letter sounds, attention span, whether they've
seen the game and what they reacted to), that beats designing for an abstract
kindergartner.

## 2. Read this first

- **`CLAUDE.md`** — the engineering manual. Architecture, the save-file contract and
  migration policy, the avatar rig, testing. **Read the save-file section before
  touching `js/store.js`** — you are about to add a new profile field, and the
  existing migration discipline (new settings get a default in `blankProfile()`,
  never rename or repurpose a key) is exactly what will keep this safe.
- **`HANDOFF-ENGAGEMENT.md`** — the reward-psychology brief. Its principles (never
  punitive, everyone medals, hints are free, praise over deduction) apply *more*
  strongly at 5 than at 8, not less. Read it as the emotional floor for whatever you
  design, not just prior art.
- **`HANDOFF-PARENTS.md`** §5 and §8 — shows the pattern for adding a new
  per-profile preference (`prefs` object, `blankProfile()` default, a dashboard
  surface for a grown-up to set it). Your age field is the same kind of change:
  additive, defaulted, and it should slot into the existing Grown-Ups dashboard
  rather than inventing a new settings surface.
- **`HANDOFF-UI.md`** §7 — the no-external-assets invariant and the accessibility
  floor apply to any new screen or mode you build exactly as they do to the
  existing ones.

Open `index.html` to play — see what a 5-year-old would actually be looking at.
`node tests/check.js` must stay green; you will likely be *adding* assertions, not
just preserving old ones, if you add a new profile field or a new data shape.

## 3. Where you sit in the chain

```
  engagement (done) → UI (active) → parents (first pass done) → YOU
                                                                  ↓
                                            grades 1–5 curriculum specialist
                                              (not started — owns js/words.js)
```

You are new territory: no prior specialist has touched age, and the curriculum
specialist mentioned in `CLAUDE.md`'s handoff chain (item 4, who will own
`js/words.js`) hasn't started yet either. That specialist's job — replacing the
252 placeholder grade 1–5 words with a designed curriculum for an already-reading
8-year-old — is a **different job from yours** and you should not touch
`js/words.js` or the `WORD_LISTS` shape. You're building a separate, younger track
that sits alongside it, for a child who in most cases isn't decoding words yet at
all.

Tell that specialist, when they start, whatever data shape you land on for
pre-literacy content (§5) and the age field itself (§6), so they inherit it instead
of discovering it — the same courtesy every prior handoff in this repo extends to
the next one.

## 4. The core problem, stated plainly

The entire existing loop assumes a child who can already **decode and recall
whole words**: she hears a word, holds it in memory, and types every letter of it
correctly from a physical keyboard. Even the easiest existing list (`g1` in
`js/words.js` — "cat", "dog", "run") assumes she can already blend three sounds
into a word and find the right keys among 26 to reproduce it. That is a fair
assumption for an 8-year-old working on spelling. It is not a fair assumption for
most 5-year-olds, many of whom are still learning:

- what the 26 letters look like and are called (letter recognition / letter
  naming),
- what sound each one makes (phonemic awareness — the actual prerequisite skill
  under "hearing a letter and selecting the proper one"),
- at the advanced end of this age band, blending 2–3 of those sounds into a simple
  word (CVC blending) — which is where the existing `g1` list would eventually
  become reachable, not where a 5-year-old starts.

This is why "pick easier words" is the wrong frame for this brief. A 6th, easier
grade tier in `words.js` would still be a *spelling-recall* task, and spelling
recall of whole words isn't the activity to build for a pre-reader. What you're
building is a **different interaction**, not an easier version of the existing one:
recognition and matching (see a letter or hear a sound, pick the right one from a
few options) rather than recall and reproduction (remember a whole word, type every
letter of it unaided).

Concretely, that likely means the core loop for this track looks more like *hear a
letter name or sound → tap the matching letter from a small set of choices* than
*hear a word → type it*. Whether it should extend further (simple CVC blending, a
handful of the very easiest sight words) is a real curriculum decision — see §6 —
but don't design for skills a typical 5-year-old hasn't reached yet just because the
existing `g1` list is sitting right there.

## 5. What already exists that you can build on

You don't need to invent an interaction model from scratch. The existing game
already has pieces that map onto recognition-and-matching gameplay:

- **`startMultipleChoice()`** (`js/app.js` ~991) — the existing tap-to-pick UI:
  a shuffled set of buttons, one correct answer, `pickChoice()` handling the tap.
  It currently offers whole *words* as the four options (used as a last-resort
  scaffold after three failed typing attempts — see `submitAnswer()`, `js/app.js`
  ~824). The tap-button mechanics are a closer starting point for a letter-choice
  mode than the typing flow is; the four-words-including-the-real-one pattern is
  exactly the shape of "hear a letter, pick it from a few options" if you swap the
  option set from words to letters.
- **`markLetters()` / `renderBoxes()`** (`js/app.js`) — the existing letter-box
  rendering (one box per letter, green/red per-position feedback). Worth looking at
  for how the game already visualizes individual letters, even though it's wired
  for a full typed word today.
- **`Speaker`** (`js/audio.js`) — reads arbitrary text aloud via the Web Speech
  API. **Flag for your curriculum decision:** asking it to speak a bare letter
  produces the letter's *name* ("ess"), not its phonetic *sound* ("sss") — the Web
  Speech API has no standard, cross-browser way to request an isolated phoneme.
  If your curriculum leads with sounds before names (a common synthetic-phonics
  approach), you'll need to work around this — e.g. scripted phrases like "sss,
  like snake" are just ordinary text-to-speech and will work fine, but there's no
  clean way to make the TTS voice produce a pure, isolated "sss" on demand. This is
  a real constraint to design around, not a bug to file.
- **`Sfx`** (`js/audio.js`) — synthesized WebAudio cues (correct/wrong/crowd/
  fanfare). Reusable as-is; keep the tone non-punitive per `HANDOFF-ENGAGEMENT.md`
  §3, doubly so at 5 — the wrong-answer sound is deliberately a soft "hmm", never a
  buzzer, and that matters even more here.
- **The avatar rig and reward economy** (`Gymnast`/`SKILLS` in `js/avatar.js` /
  `js/skills.js`, stars, `CATALOG`) — shared infrastructure across all profiles
  today. Reuse the same stars-and-avatar economy so the two siblings feel like
  they're playing the same game, just at their own level, rather than the younger
  child getting a visibly separate, lesser app. **Open design question:** whether
  the avatar performs a full skill after *every correct letter* (likely too
  frequent — it would cheapen the payoff that currently rewards a whole correct
  word) or only after completing a short round of several correct answers. Pick a
  cadence deliberately; don't default to "same as Mila's" without checking it
  actually fits a much shorter per-item task.
- **The never-punitive design language** in `HANDOFF-ENGAGEMENT.md` §3 (soft
  wrong-answer sound, no timer, everyone medals, hints free) — inherit all of it.
  The existing 3-tries-then-reveal flow (`submitAnswer()` → `promptRetry()` →
  `startMultipleChoice()`) is almost certainly too many steps and too much reading
  for a 5-year-old; a recognition task probably wants a flatter, faster
  right/try-again loop, not the same three-strikes structure transplanted wholesale.

## 6. The ask, in two parts

### Part A — Pick the actual curriculum

You are the domain expert here; the project owner explicitly said they're relying
on you rather than guessing themselves. Concretely own:

- The developmental sequence: most likely letter recognition (uppercase and
  lowercase) → letter names and/or sounds → simple blending, but the exact order
  and pacing is a real, debated question in early-literacy pedagogy (letter-names-
  first vs. sounds-first curricula both have currency) — pick one and say why,
  the same way `HANDOFF-PARENTS.md` §5 was told to "pick a starting point and say
  why" rather than build every option.
- Session shape for a 5-year-old's attention span: almost certainly shorter and
  faster-reward than Mila's 6/10/16-word routines (`index.html` setup screen) —
  say what a round looks like (how many items, how long that takes, how the loop
  ends) for this age band specifically.
- Whether this is a single flat "starter" experience or needs its own internal
  levels — a 5-year-old who already knows all 26 letters is a different design
  target from one who knows five. If you can find out which this particular child
  is closer to, use that; otherwise design the easiest reasonable entry point and
  say explicitly what "graduating" from it should look like (does it lead into the
  existing `g1` list eventually?).

### Part B — Make the app able to tell the children apart

Today, nothing distinguishes a profile by age; `blankProfile()` (`js/store.js`
~43) has a `settings.grade` field, but that's a parent's choice of *which existing
grade word list to practice*, not the child's *developmental stage* — conflating
the two would mean a parent who puts a struggling 8-year-old reader on the `g1`
list accidentally triggers toddler-mode UI. Keep them as separate concerns.

Concretely, you'll likely need to touch:

- **`blankProfile()`** (`js/store.js` ~43) — a new field (an age, an age-band, or
  a simple mode flag — your call, document why) with a default that **does not
  change any existing profile's behavior**. Every save written before this feature
  existed has no opinion on age; it must default to the current ("big kid")
  experience, never silently downgrade an existing player into the new mode.
- **`renderProfiles()`** (`js/app.js` ~361) and the `#profile-new` markup — profile
  creation currently asks only for a name. It needs some way for a grown-up to set
  this — a simple age picker at profile-creation time is the obvious option, but
  whatever you choose, make sure an existing parent adding a *second* profile for
  an older kid isn't forced through it in a way that reads as babyish for their
  8-year-old.
- **A new session mode**, not a bent version of the existing one. The current
  `session.phase` machinery (`spelling` → `reveal` / `multipleChoice`, driven by
  `submitAnswer()` in `js/app.js`) is tightly wired around typing a complete word;
  retrofitting letter-level recognition into it is more likely to break the
  existing flow than to save you time. Build the new interaction as its own mode
  alongside "practice"/"competition", reusing lower-level pieces (§5) rather than
  the `spelling` phase itself.
- Whatever content data your curriculum needs (letters, sounds, maybe a small
  matching-pairs set) is very likely **not** the `WORD_LISTS` shape in
  `js/words.js` — say so explicitly and pick your own shape rather than distorting
  that contract. `HANDOFF-UI.md` §7.5 and `HANDOFF-PARENTS.md` §6.5 both flagged
  that contract as something to change deliberately and loudly if changed at all;
  the cleanest outcome here is probably that you don't touch it at all and instead
  add a parallel, separate data file.

## 7. Invariants — these are hard

1. **It stays a double-clickable folder.** No build step, no bundler, no CDN, no
   external assets — no icon fonts, image files, or audio files. Plain `<script>`
   tags, because ES modules don't load over `file://`. Everything visual is SVG,
   system fonts, or CSS; everything audible is synthesized WebAudio or the Web
   Speech API. This is what lets the game be handed to either child with zero
   setup, and it's non-negotiable.
2. **`node tests/check.js` stays green.** Add assertions for whatever you add;
   don't delete existing ones.
3. **Old save files keep opening, unchanged in behavior.** This is the one most
   likely to go wrong here specifically: a save with no age field must load into
   exactly the experience it loads into today. New fields get a default in
   `blankProfile()`; never rename or repurpose an existing key. Test this against
   an actual pre-existing save, not just a freshly created profile.
4. **Speech stays optional.** The game must stay fully playable with the Web
   Speech API missing or muted (it currently falls back to flashing the word on
   screen). Whatever you build that relies on hearing a letter or sound needs the
   same fallback — for this age band, probably an on-screen letter shown large
   rather than just flashed text.
5. **Don't touch `js/words.js` / the `WORD_LISTS` contract.** That's the next
   specialist's surface, for the other child's curriculum. Build your content as
   its own, separate data shape.
6. **Accessibility floor.** Visible focus outlines, `aria-pressed`-style patterns,
   and `prefers-reduced-motion` support already exist in the dashboard and setup
   screens. Keep them in anything new.
7. **Mila's experience doesn't regress.** She is still the primary, proven design
   target of this whole project. Nothing you build for her sibling should change
   her loop, her save data's meaning, or add friction (extra screens, extra
   questions) to her existing path through the app.

## 8. Open questions — yours to answer, and to push back on

- **Letter names vs. letter sounds first** — a genuinely debated phonics-pedagogy
  question. Make the call and say why, the way every prior handoff in this repo
  was asked to.
- **Typing vs. tapping.** A physical keyboard is itself an obstacle at this age —
  finding one letter among 26 unlabeled-by-sound keys is a skill in itself, separate
  from knowing the letter. Tap-to-choose (`startMultipleChoice()` is the closest
  existing precedent) is very likely the right interaction, but it's your call to
  make and defend, not assume.
- **How many answer choices at once?** Multiple choice with 4 options (the existing
  pattern) may be too many for a first-time letter-recognition task; 2 or 3 might
  be more appropriate at the easiest level, scaling up as the child improves.
- **Reward cadence** — does the avatar perform a skill after every correct
  match, every few, or only at the end of a short round? Get this wrong and the
  payoff either feels constant-and-cheap or too delayed for a 5-year-old to
  connect the dots.
- **Is gymnastics/cheer still the right theme for a 5-year-old**, or does the
  younger sibling need their own theme entirely? Probably fine to keep — ask
  rather than assume, and it's a cheap thing to get an actual answer on from the
  project owner.
- **What does "graduating" out of this mode look like?** Nothing today marks the
  transition from pre-reader to the existing `g1` list. Even a rough answer
  (a star threshold, a manual parent toggle, an explicit level-up moment) is more
  useful to hand forward than leaving it unanswered.
- **Should a grown-up be able to preview or override the age-based mode**, the
  same way `HANDOFF-PARENTS.md`'s dashboard already exposes other per-profile
  settings? Likely yes, for the case where a precocious 5-year-old is actually
  ready for more, or a struggling 6-year-old needs this track longer than their
  literal age would suggest — which is also the reason this should be an
  explicit, parent-set field rather than something inferred silently from a
  birthdate.

## 9. Your handoff onward → grades 1–5 curriculum specialist

**When you finish, write `docs/HANDOFF-CURRICULUM.md`** — a new handoff file, the
same way the engagement specialist's pass ended by writing `HANDOFF-UI.md` for the
next specialist rather than leaving it implied. That file is what actually launches
`CLAUDE.md`'s item 4 (owning `js/words.js`, replacing the placeholder grade 1–5
words with a designed curriculum for an already-reading child). Until it exists,
that specialist has nothing to start from — don't treat this section as the
handoff itself, treat it as the brief for the handoff you're about to write.

Follow the format the other docs in `docs/` already use (who this is for, read
this first, what exists today, the ask, invariants, open questions). It needs to
tell them, explicitly:

- The data shape you chose for pre-literacy content, and confirmation it's
  separate from `WORD_LISTS` — so they know it's not something they inherited or
  need to reconcile with.
- Whatever "graduating" mechanism you defined (§8), since the top of your track
  and the bottom of theirs (`g1`) are the seam between the two curricula — even if
  you leave it unresolved, tell them it's unresolved rather than leaving them to
  discover the gap.
- The age field's shape and location in `blankProfile()`, so their work (if it
  ever reasons about a profile's stage) doesn't reinvent it or collide with it.

Once `docs/HANDOFF-CURRICULUM.md` exists, update the handoff-chain note at the top
of `CLAUDE.md` the same way this document's own arrival was recorded there —
mark yourself done and point at the new file, so the project owner can see at a
glance that the grades 1–5 specialist is ready to be brought in next.
