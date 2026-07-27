# Handoff → Parental Controls / Child App Management Specialist

You are inheriting a working, fully playable spelling game with a basic parent-facing
dashboard already in place. Your job is to make that dashboard genuinely useful for a
parent trying to understand how their kid is doing and steer what she practices next.

**You are empowered to change things**, including restructuring the existing
dashboard. The invariants in §6 are the hard limits — read them before you plan
anything, especially §6.1, because it rules out a lot of what "parental controls"
normally means.

---

## 1. Who this is for

Mila, age 8, working on reading and writing. Her dad — the actual "parent user"
you're designing for — commissioned this and is also the one who will use whatever
you build. The profile system supports siblings/classmates too, so "each profile"
in your brief is plural in practice, not just Mila.

The core loop, so the dashboard's purpose is clear: she hears a word → types it →
a cartoon gymnast performs a skill if she's right → she earns stars → she spends
stars customizing the gymnast. Everything the dashboard shows is downstream of
that loop.

## 2. Read this first

- **`CLAUDE.md`** — engineering manual: architecture, the save-file contract and
  migration policy, testing. **Read the save-file section before touching
  `js/store.js`.**
- **`docs/HANDOFF-ENGAGEMENT.md`** — the reward-economy brief. Explains *why* the
  scoring, streaks, and star payouts work the way they do. You'll be displaying
  these numbers back to a parent; know what they mean before you chart them.
- **`docs/HANDOFF-UI.md`** — the UI/visual-design brief. Its §5.2 flagged the
  Grown-Ups tile as something that should visually recede on the home screen
  (settings shouldn't shout as loud as "play"); if that's landed by the time you
  start, don't undo it. Its own "open questions" section is a model for how to
  write yours — use the same format.

Open `index.html` to play. `node tests/check.js` must stay green. The Grown-Ups
dashboard lives behind Home → the small gear-ish tile → a one-question math gate
(`renderGate()` in `js/app.js`) that exists only to keep a curious 8-year-old from
wandering in, not as real access control — see §6.1.

## 3. Where you sit in the chain

```
  engagement pass (done) → UI pass → YOU → curriculum specialist
```

The curriculum specialist (next in line) owns `js/words.js` and the actual word
content. **Your brief and theirs overlap** — a "concentrate on these patterns"
feedback mechanism is only as good as whatever structure (or lack of structure)
exists in the word data — so §5 below is deliberately unresolved. Whatever you
decide, tell them explicitly what you need from word data, the same way
`HANDOFF-UI.md` §8 told the curriculum specialist what the UI pass expected of
them.

## 4. What exists today

**The Grown-Ups Dashboard** (`#screen-parents` in `index.html`, ~line 295) is five
tabs, all rendered by functions in `js/app.js`:

| Tab | Function | Shows |
|---|---|---|
| Progress | `renderProgressTab()` | Six stat tiles (attempts, accuracy, mastered, best streak, sessions, stars), a per-session accuracy bar chart (last 24), a "words she finds hardest" table, recent sessions table |
| Word Detail | `renderWordsTab()` | Every word ever attempted, with tries/right/wrong/hints/avg time/accuracy, filterable by a text box |
| Custom Lists | `renderListsTab()` | Parent-authored word lists (`word \| sentence` per line, parsed by `parseWordList()`) |
| Players | `renderPlayersTab()` | One row per profile: name (editable), words attempted, accuracy, sessions, stars, switch/delete |
| Settings | `renderSettingsTab()` | Default list/sport/routine length, voice, toggles (speech, autospeak, letter boxes, sfx), save export/import, reset |

**The stats data already collected**, per profile, in `Store.data.stats`
(`js/store.js`):

```
stats: {
  words: { [word]: { seen, right, wrong, hints, lastSeen, totalMs } },
  sessions: [ { ts, mode, sport, listKey, listLabel, total, correct, hints,
                bestStreak, ms, score, medal } ],
  attempts, correct
}
```

`Store.troubleWords(limit)` and `Store.masteredWords(limit)` already rank words by
accuracy from that map. `buildQueue()` (`js/app.js` ~539) already seeds roughly a
third of a practice/competition routine from trouble words — **there is already a
missed-word feedback loop**, just not one a parent can see or steer directly.

**What a word *is*, today:** `js/words.js` exports `WORD_LISTS`, keyed by list id,
each `{ label, blurb, words }` where `words` is a flat array of `[word, sentence]`
pairs. **No metadata beyond that** — no phonics pattern, no syllable count, no
difficulty tier, no category tag. This is the exact contract `HANDOFF-UI.md` §7.5
called stable and told the curriculum specialist not to break silently. It is the
main thing standing between "parent expresses a preference" and "the game acts on
it" — see §5.

**Recent, relevant changes already in the game** (don't be surprised by these when
you read the stats):

- Spelling now allows **3 tries with per-letter highlighting** before falling
  back to a multiple-choice pick (`submitAnswer()`/`promptRetry()`/
  `startMultipleChoice()` in `js/app.js`). Only the *first* attempt is recorded
  into `stats.words`/`session.marks` — retries only ever upgrade that same word's
  mark from `"learning"` to `"fixed"`. If you build anything that reasons about
  "how many tries did she need," that information is **not currently persisted**
  per-attempt, only the eventual outcome. That may be worth changing — flag it if
  your design needs it (see §7).
- Sport is now **Gymnastics / Cheerleading / Dance / Mix**, tagged per-skill and
  per-outfit. Not directly relevant to progress reporting, but it's a settings
  option you'll see in `renderSettingsTab()`.

## 5. The ask, and why it's not fully specified

Two things, from the project owner:

1. **An extensive parents portal to assess performance of each profile.** The
   Progress/Word Detail/Players tabs are a start, not this. Think about what's
   actually missing — cross-profile comparison? Trends over weeks, not just the
   last 24 sessions? Time-of-day/session-length patterns? A "what should we work
   on this week" summary instead of a raw sortable table? You have more child-app
   and parent-reporting design experience than the previous specialists brought;
   this is squarely your call.

2. **A mechanism for parents to tell the system what word types or patterns to
   concentrate on**, feeding back into what she actually practices. This is the
   harder one, because **it's a curriculum-customization feature wearing a
   parental-controls hat**, and there are several genuinely different ways to
   build it, at very different costs:

   - **Word-level pinning** — parent marks specific existing words (from the
     Word Detail tab, which already lists every word she's seen) as
     priority/de-prioritized. Zero data-contract changes; slots into
     `buildQueue()`'s existing trouble-word weighting almost directly.
   - **List/category-level weighting** — parent adjusts the mix between grade
     lists, the gym/cheer list, and custom lists (e.g., "more custom list, less
     grade 3"). Also no new word metadata; works at the granularity that already
     exists (`WORD_LISTS` keys).
   - **Pattern/tag-based** — parent picks from phonics/spelling-rule categories
     ("silent e", "-tion endings", "double consonants"). This is what "patterns"
     most naturally suggests, and it's the one that **requires new per-word
     metadata in `js/words.js`** — a real data-contract change, which is exactly
     the kind of thing `HANDOFF-UI.md` §7.5 said must be inherited by the
     curriculum specialist, not discovered by them.
   - **Freeform notes** — parent writes a note ("focus on homophones this week").
     Cheapest to build, most flexible, but doesn't mechanically steer
     `buildQueue()` on its own — it's a message to a human (the curriculum
     specialist, or future-you), not to the algorithm, unless you also build
     something that parses/tags it.

   These aren't mutually exclusive, but they're not the same size of project
   either. **Pick a starting point and say why** — don't try to build all four.

## 6. Invariants — these are hard

1. **No server, no accounts, no network, no cloud.** Everything is a
   double-clickable folder — plain `<script>` tags, no build step, no bundler, no
   external assets. This means **"parental controls" here cannot mean remote
   monitoring, cross-device sync, screen-time enforcement, or anything requiring
   a backend** — all of that needs infrastructure this project deliberately
   doesn't have. What you're building is a **local, in-app reporting and
   preference panel**, not a parental-control platform in the App
   Store/Google Family Link sense. Set that expectation early, including with the
   project owner if your first instinct reaches for something server-shaped.
2. **The parent gate is a speed bump, not security.** `renderGate()` is a
   one-off multiplication question with no rate limiting, no password, nothing
   persisted. It exists so a curious 8-year-old doesn't wander in, not to keep
   Mila out on purpose. Don't build features on top of it that assume it's a
   real access-control boundary (e.g., don't gate something safety-critical
   behind it, and don't make it harder to bypass in a way that would lock a
   parent out of their own kid's save file).
3. **`node tests/check.js` stays green.** If you touch the save shape, update
   assertions rather than deleting them.
4. **Old save files keep opening.** Any new per-profile field needs a default in
   `blankProfile()` (`js/store.js`); never rename or repurpose an existing key.
   This applies directly to whatever preference data you add for §5.2.
5. **The word-list data contract stays stable unless you explicitly change it.**
   If you do change it (§5's pattern/tag option requires this), that's a
   contract change per `HANDOFF-UI.md` §7.5: update `parseWordList()`
   (`js/store.js`), the validator in `tests/check.js`, `CLAUDE.md`, and say so
   explicitly in your handoff to the curriculum specialist.
6. **Preserve the emotional tone already established**, even though your
   background is "parental controls," which in most products leans toward
   restriction and red flags. This project has deliberately gone the other way:
   the dot row is never red, a miss is "still learning" not a failure, hints are
   free, everyone medals. A parent-facing performance view should feel like
   insight, not a report card with a failing grade. Don't let "trouble words"
   read as an accusation.
7. **Accessibility floor.** Focus outlines, `aria-pressed`/`role="tab"` patterns,
   and `prefers-reduced-motion` support are already present in the dashboard.
   Keep them if you rebuild markup.

## 7. Open questions — yours to answer, and to push back on

These are genuinely open. Where you have a strong recommendation, make it and
say why; where you need a decision only the project owner can make, ask before
you build rather than guessing:

- **Which of the four §5.2 mechanisms (or combination) should ship first?** This
  is the biggest open question in this brief.
- **Does "assess performance of each profile" want a comparison view across
  siblings**, or is per-profile-in-isolation (switch profile, view its
  dashboard) enough? The Players tab currently only shows a summary row per
  profile, not a way to drill into one child's detail without switching to them.
- **Should per-attempt data (not just per-word outcome) be tracked** — e.g., "she
  needed the 3rd try / multiple choice" — to power a more precise "how hard is
  this actually for her" view? That's a `Store.recordAttempt()`/session shape
  change, not just a new UI.
- **How far back should trend reporting go**, and does that require capping or
  paginating `stats.sessions` differently than the current unbounded array (see
  `recordSession()` in `js/store.js`)?
- **Is there an appetite for the dashboard to explain *why* the game picked a
  word** (e.g., "in rotation because you flagged double-consonant words")? That's
  a nice trust-building feature if you go the tag-based route, but adds
  complexity.
- **Multi-child households**: is a "this week's focus" setting per-profile only,
  or could a parent want one applied across all profiles at once? Given each
  profile already keeps fully separate `settings`/`stats`, per-profile is the
  path of least resistance — confirm that's actually what's wanted before
  building a cross-profile setting that doesn't exist anywhere else in the save
  shape.

## 8. Your handoff onward → Curriculum Specialist

**Status: done, first pass.** Answers to §7 came back as: include the freeform
note (clearly labeled as not mechanically wired), peek-only cross-profile
comparison, yes to per-attempt tier tracking, and per-profile-only focus
preferences. Built accordingly — no `js/words.js` changes were made.

- **No new word metadata.** `WORD_LISTS`'s `{ label, blurb, words: [[word,
  sentence], ...] }` shape (`js/words.js`) is untouched — this pass deliberately
  stayed one level below phonics/pattern tagging.
- **What "concentrate on X" means mechanically today:** a new per-profile
  `prefs` object in `js/store.js` (`blankProfile()`) —
  `{ pinned: { [word]: "boost"|"retire" }, reviewMix, focusNote }`. The hook to
  extend is `Store.selectReviewPool(list, prefs, statsWords)` (`js/store.js`) —
  it's the one function that decides which words get review-weighted, called
  from `buildQueue()` in `js/app.js`. It currently only reasons about
  `stats.words` accuracy and `prefs.pinned`. If you add per-word metadata (a
  phonics pattern, a difficulty tier, whatever shape you land on), the natural
  extension is a third input here — e.g. words matching a parent-chosen pattern
  join the `hard` pool the same way a boosted word does — without touching
  `buildQueue()` or any dashboard rendering code.
- **`focusNote` is a landing spot, not a mechanism.** It's a freeform string a
  parent writes, displayed back to them in the Focus tab, and explicitly never
  read by the game. If your pattern-tagging work makes it possible to actually
  act on a note like "work on -tion endings," that's a real feature (parsing or
  structuring that note into something `selectReviewPool` can consume) — right
  now it's intentionally just a place for a parent's intent to live.
- **Per-word stats grew three new counters**, additive and safe to ignore:
  `retried`, `multipleChoice`, `unresolved` on `stats.words[word]` (alongside
  the existing `seen/right/wrong/hints`), tracking how she eventually got a word
  right after missing it the first time. Not relevant to curriculum content,
  but flagged in case future reporting wants to correlate "words that need a
  pattern lesson" with "words that take her multiple tries."
- Nothing here changes session length, pacing, or list structure — nothing to
  constrain your work on that front.
