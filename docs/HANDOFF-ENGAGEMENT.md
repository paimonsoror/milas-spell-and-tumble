# Handoff → Child Engagement & UI Specialist

You are inheriting a working, fully playable spelling game. Your job is to make it
genuinely *hold* an 8-year-old's attention and keep her coming back.

**You are empowered to change things.** This is not production. Nothing here is
sacred except the small list of invariants in the last section. Rip out the colour
scheme, retime the animations, restructure the reward economy, rewrite the copy,
add screens. You know things about how children engage that the current build only
guesses at.

---

## 1. Who this is for

Mila, age 8, working on reading and writing. She loves gymnastics and cheerleading.
Her dad commissioned this. That is the entire audience — one real child, with a real
named interest — so optimise for *her*, not for a general market. The profile system
supports siblings and classmates, but she is the design target.

The core loop: she hears a word → types it → a cartoon gymnast performs a real
tumbling skill if she's right → she earns stars → she spends stars customising the
gymnast.

## 2. Read this first

`CLAUDE.md` in this repo is the engineering manual: architecture, the avatar rig's
angle conventions, the save-file contract, testing, and a list of already-fixed bugs
not to reintroduce. **Read it before editing `js/skills.js` or `js/store.js`** — the
rig has non-obvious geometry rules, and the save format has a migration policy.

Everything else below is yours.

Open `index.html` to play. No build step. `node tests/check.js` must stay green.
`tests/poses.html` renders every gymnastics skill as a nine-frame strip — the fastest
way to judge whether a move actually reads as a cartwheel.

## 3. What is deliberate vs. what is arbitrary

This matters more than anything else in this document. Some choices have reasoning
behind them and you should override them knowingly; others are placeholders I picked
because *something* had to be picked.

### Deliberate — override only on purpose

- **A wrong answer is a teaching moment, never a punishment.** She sees the correct
  spelling with her wrong letters underlined, hears it spelled aloud, and types it
  once correctly for a star. The error sound is a soft two-note "hmm", explicitly not
  a buzzer. The copy never says "wrong".
- **Everyone medals.** Below bronze is a participation ribbon worth 4 stars.
- **No timer anywhere.** Nothing counts down, nothing pressures. Time-per-word is
  recorded silently for the parent dashboard only.
- **Missed words come back.** `buildQueue()` seeds roughly a third of each routine
  from words she has previously got wrong.
- **Hard skills are earned.** Difficulty is gated on streak, so a back tuck is a
  reward for a run of correct answers, not a random event.

- **Asking for help is never punished.** *(added by the engagement pass)* Hints
  cost nothing. Solving a word unaided pays a visible bonus instead. Anywhere you
  are tempted to deduct for hint use, add for solo work instead — the arithmetic
  is similar and the message to an 8-year-old is not.

- **The dot row shows progress, not failure.** *(added by the engagement pass)* It
  is on screen all session, so a miss is a hollow ring, not a red mark, and it
  fills in gold once she has retyped the word correctly.

### Arbitrary — I picked a number, please interrogate it

Rows marked ⟳ were changed by the engagement pass; the rationale is in
`CLAUDE.md` under "Decisions worth knowing".

| Thing | Current value | Where |
|---|---|---|
| Stars per correct word ⟳ | 2, **+1 if no hint was used** | `app.js` `handleCorrect()` |
| Streak bonus | +3 stars every 5th correct in a row | `app.js` `handleCorrect()` |
| Points per word ⟳ | `10 + min(streak,6)*2 + 2 if unaided` | `app.js` `handleCorrect()` |
| Medal star bonus | gold 25 / silver 15 / bronze 8 / ribbon 4 | `app.js` `finishSession()` |
| Daily bonus ⟳ | `5 + min(dayStreak,5)*2` → 7–15, first finished routine of the day | `store.js` `claimDailyBonus()` |
| Unlock costs | 10 – 150 stars | `avatar.js` `CATALOG` |
| Medal thresholds | ≥9.0 / ≥8.0 / ≥6.5 out of 10 | `app.js` `medalFor()` |
| Judge score formula ⟳ | `2.7 + accuracy*6 + streak*0.8 + solo*0.5` | `app.js` `judgeScores()` |
| Difficulty ceiling by streak | 0→1, 2→2, 4→3, 6→4, 9→5 | `skills.js` `chooseSkill()` |
| Auto-advance after a correct word | 550 ms after the skill ends | `app.js` `handleCorrect()` |
| Auto-advance after a fixed word | 1800 ms | `app.js` `checkFix()` |
| Skill durations | 1150–2100 ms | `skills.js` `dur:` |
| Routine lengths offered | 6 / 10 / 16 words | `index.html` setup screen |
| Palette | purple / pink / teal / gold | `css/styles.css` `:root` |

Star income rose roughly 30% for a strong player (2 → 3 per word). That was
deliberate: it pulls the first unlock closer, which was flagged below as an open
question. Unlock costs were **not** rebalanced to compensate — if the cheapest
items now arrive too fast to feel earned, raise the floor in `CATALOG` rather than
clawing the stars back.

## 4. Open questions in your domain

These are the things I could not answer and you can. I have flagged my suspicion
where I have one, but I am guessing and you are not.

> **Engagement pass, first round — four of these are now answered.** They are kept
> below with their resolutions so you can see what was decided and why, rather than
> finding the code and having to guess. Everything unmarked is still open.

**Reward schedule.** ✅ *Partly resolved.* The abstract balance now has a named
target: a progress bar toward the next unlock on the home, game, results and studio
screens, showing `have / cost` and how many stars remain. She can pin a specific
item in the studio ("🎯 Save up for it"); otherwise it auto-picks the cheapest thing
she cannot yet afford, so there is always a near goal. **Still open:** the *ratio*
is still fixed at 2–3 stars per word. Whether a variable or escalating schedule
would sustain interest better is untested.

**Cost curve.** ⚠️ *Moved, not settled.* Star income went up ~30%, so the cheapest
10-star item is now ~3–4 words away and the 150-star Comet ~50. The first unlock
almost certainly arrives soon enough now. The top end is still a guess.

**Does penalising help-seeking backfire?** ✅ *Resolved — your framing was right.*
Hints are free. The bonus is for not needing one: +1 ⭐ and +2 points for solving a
word unaided, shown explicitly as "+1 ⭐ for doing it all by yourself" so the rule
is learnable. `judgeScores()` was reshaped the same way, from a `− hintRate*0.7`
deduction to a `+ soloRate*0.5` bonus. That formula also had a latent bug: it
divided raw hint *presses* by the word count, so two clues on one word could push
the deduction past 100%. It now counts hinted words.

**The public failure record.** ✅ *Resolved.* The dots are no longer red. A missed
word is a hollow "still learning" ring, and it fills in **gold** once she retypes it
correctly — so the row reads as a record of what she has worked through rather than
a tally of failures. **Still open:** whether the row should be there at all.

**Nothing marks returning.** ✅ *Resolved.* Consecutive-day visits build a day
streak, shown on the home screen ("🔥 4 days in a row"). The first *finished*
routine of each day pays a bonus that grows with the streak (7–15 stars). It is
paid for doing the work, not for opening the app. Each profile has its own streak.
**Still open:** nothing else distinguishes today from yesterday — no daily set, no
new-content hook.

**Is the fix-it star right?** After a miss she retypes the word correctly for +1 star.
It rewards recovery and keeps the tone positive — but it also means a wrong answer
still pays out, which may blunt the signal. Or that may be exactly right at 8.

**Social evaluation.** Competition mode ends with three judges revealing scores one
at a time. For some kids that's the best part; for others it's the thing that makes
them stop playing. There is currently no way to have competition structure *without*
being scored by a panel.

**Letter boxes.** By default she sees one empty box per letter, which reveals word
length. Genuine scaffolding, or a crutch that lets her count instead of spell?
There's a toggle in the grown-ups settings; the default is the real decision.

**Background motion during typing.** The crowd bobs on a continuous 2.4 s loop and
the gymnast has an idle breathing animation, both while she is reading and typing.
Charming, or attention-splitting at exactly the wrong moment?

**Palette.** Currently high-saturation purple/pink/teal. Two concerns I can't judge:
whether it's overstimulating for sustained use, and whether it's so coded that it
narrows who feels invited in. Everything routes through CSS custom properties in
`:root`, so a full re-theme is a small edit.

**Practice mode never ends.** It's endless by design — she stops when she wants. But
there's no natural stopping point, no "you've done 20 words, want to keep going?"
An 8-year-old may need the scaffolding of an ending.

**Nothing adapts to struggling.** A long losing run produces the same experience as
a good one, minus the skills. There is no difficulty easing, no encouragement
escalation, no offer to switch to an easier list.

**There is no onboarding.** She lands on a menu and has to work it out. Whether that
matters depends on things you know better than I do.

## 5. Levers you have

- **Colour and type** — `css/styles.css` `:root`. Every colour is a variable.
- **Copy and praise** — `handleCorrect()` and `handleWrong()` in `app.js` hold the
  cheer/encouragement arrays. Praise already uses her name on every third correct
  answer; that ratio is a guess.
- **Reward economy** — the table in §3.
- **Animation feel** — per-skill `dur` in `skills.js`; easing curves in `EASINGS`;
  confetti in `burstConfetti()`; particle trails in `Animator._spawnTrail()`.
- **Celebration intensity** — currently scaled by skill difficulty: crowd volume
  rises with it, confetti fires at difficulty ≥3, more at ≥5.
- **New skills** — `SKILLS` in `skills.js`, but read the rig conventions in
  `CLAUDE.md` first, and verify with `tests/poses.html`.
- **New screens** — add a `<section class="screen" id="screen-x">` and a case in
  `showScreen()`.
- **Sound** — `Sfx` in `audio.js` synthesises everything in WebAudio; no asset files
  to source. Adding a new cue is a few lines.
- **The avatar itself** — `CATALOG` in `avatar.js` defines every unlockable slot and
  item. Adding items is data, not code.

## 6. Invariants — please preserve these

1. **It stays a double-clickable folder.** No build step, no bundler, no CDN, no
   external assets. Plain `<script>` tags, because ES modules don't load over
   `file://`. This is what lets her dad hand it to her with zero setup.
2. **`node tests/check.js` stays green.** If you change the reward numbers, update
   any assertions rather than deleting them.
3. **Old save files keep opening.** New settings get a default in `blankProfile()`;
   never rename or repurpose an existing key. See the migration section of
   `CLAUDE.md`.
4. **Speech stays optional.** The game must remain fully playable when the Web
   Speech API is missing or muted — it currently falls back to flashing the word.
5. **The word-list data contract stays stable** — see below. The educator agent
   depends on it.

## 7. Your handoff onward → UI Specialist, then Educator / Curriculum Specialist

> **Status:** the engagement pass is done, and the onward handoff was split in two.
> The interface work went to a children's-game UI specialist first — see
> **`HANDOFF-UI.md`**, which carries forward every unresolved visual question from
> §4 below (palette, background motion, letter boxes, onboarding, judging panel)
> plus a ranked list of interface problems. The curriculum brief below still stands
> and is now third in the chain; `HANDOFF-UI.md` §8 restates it and adds what the
> UI pass owes them.

When the interface work is done, this goes to an agent specialising in building
word curricula across grades and skill levels. Please leave things in a state where
their job is mostly *content*, not archaeology.

**The contract they'll rely on.** `js/words.js` exports `WORD_LISTS`, keyed by list
id, each `{ label, blurb, words }` where `words` is an array of `[word, sentence]`
pairs. `GRADE_ORDER` controls the order shown on the setup screen. Parents can also
paste custom lists in the dashboard, parsed by `parseWordList()` in `store.js`
(`word | sentence` per line). `tests/check.js` validates that every word is plain
lowercase letters and that every sentence actually contains its word.

**If you change that shape, say so explicitly in your handoff**, and update
`parseWordList()`, the validator in `tests/check.js`, and `CLAUDE.md` to match. For
example, if you decide difficulty should drive pacing or reward, words may need
per-item metadata (phonics pattern, syllable count, difficulty tier) — that is a
reasonable change, but it's a contract change and the educator agent must inherit
the new shape, not discover it.

**Also tell them:**

- Which lists currently exist (grades 1–5, ~40–50 words each, plus a 32-word
  gymnastics/cheer themed list) and that the current words are a *reasonable
  placeholder written by a generalist*, not a designed curriculum. They should feel
  free to replace all 252.
- Every word needs a sentence — it's read aloud between the two sayings of the word,
  in real spelling-test cadence. Sentences currently lean on gym/cheer imagery to
  match her interests; that's worth keeping.
- Whatever you learn about session length, pacing, and cognitive load, because it
  constrains how many words a list should hold and how they should be sequenced.
- Any structure you introduce that content must fill — levels, themed "seasons",
  daily sets, a mastery ladder. If you build a frame, hand them the frame.

## 8. Known weak spots, unprompted

Things I'd flag whether or not you asked:

- **Skill variety runs out.** 16 scoring skills, but only 9 gym and 7 cheer — and
  `chooseSkill()` gates on difficulty, so early in a routine she is drawing from a
  handful. In a 16-word routine she will see repeats, and repetition is the main
  threat to the core reward. (This doc previously said 14; it is 16.)
- **The gymnast is stylised** — a jointed figure with round-cap limbs. She reads
  clearly and animates well, but she is not a polished character, and character
  attachment is a big part of why a child returns.
- **The avatar barely reacts between skills.** She has four facial expressions and an
  idle loop. She never celebrates spontaneously, reacts to a near-miss, or acknowledges
  a new outfit.
- **Returning is marked, but thinly.** There is now a day streak and a daily bonus,
  and that is all. The *content* of today is identical to yesterday's — no daily
  set, no reason beyond the streak counter to come back specifically today.
- **Competition and practice are nearly identical** apart from scoring. Competition
  could feel like an *event* — an entrance, an introduction, a crowd that builds.
