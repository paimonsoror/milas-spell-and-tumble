# Handoff → Children's Game UI / Visual Design Specialist

You are inheriting a working, fully playable spelling game whose *psychology* has
had a pass but whose *interface* has not. The reward loop now works on paper. Your
job is to make it work on screen for an actual 8-year-old.

**You are empowered to change things.** Restyle anything, restructure any screen,
replace the palette, redraw the character. The invariants in §7 are the only hard
limits — and one of them will invalidate most of your normal toolkit, so read that
section before you plan anything.

---

## 1. Who this is for

Mila, age 8, **working on reading and writing**. She loves gymnastics and
cheerleading. Her dad commissioned this for her specifically — one real child, one
real named interest. Optimise for her, not for a market. The profile system
supports siblings and classmates, but she is the design target.

Hold onto that middle clause. It is the most under-served fact in the current UI:
this is a game about the difficulty of reading, and its interface is dense with
text she has to read before she is allowed to play.

The core loop: she hears a word → types it → a cartoon gymnast performs a real
tumbling skill if she's right → she earns stars → she spends stars customising the
gymnast.

## 2. Read this first

- **`CLAUDE.md`** — the engineering manual. Architecture, the avatar rig's angle
  conventions, the save-file contract, testing, and a list of already-fixed bugs
  not to reintroduce. **Read it before touching `js/skills.js` or `js/avatar.js`;**
  the rig has non-obvious geometry rules that will waste your afternoon otherwise.
- **`HANDOFF-ENGAGEMENT.md`** — the brief I worked from. Its §3 table marks which
  numbers are load-bearing and which are placeholders, and its §4 records which
  engagement questions are resolved versus still open. Several open ones are
  squarely yours and I have not touched them.

Open `index.html` to play. No build step. `node tests/check.js` must stay green.
`tests/poses.html` renders every gymnastics skill as a nine-frame strip.
`node tests/screenshots.js` writes self-driving copies of the game into `_debug/`
that put it into specific states (mid-routine, results, studio try-on) — invaluable
for seeing a screen without playing to it. Read the headless-browser section of
`CLAUDE.md` before you point a screenshot tool at them; three specific traps there
cost real time.

## 3. Where you sit in the chain

```
  original build  →  engagement pass (done)  →  YOU  →  educator / curriculum
```

The engagement specialist (me) changed the reward economy, the failure display,
and added progress + returning mechanics. The curriculum specialist after you owns
`js/words.js` and the actual spelling content. **Anything you build that content
must fill — themed seasons, a level map, a daily set, illustrated word cards — you
must hand them as a defined frame**, not as a surprise. See §8.

## 4. What I changed — please don't undo it by accident

These are recent and deliberate. Restyle them freely; keep what they mean.

- **A miss is never marked in red in the persistent HUD.** The dot row showing her
  last 14 answers uses a hollow "still learning" ring for a miss, which fills in
  **gold** once she retypes the word correctly. It reads as a record of what she
  worked through, not a tally of failures. `session.marks` holds
  `"ok" | "learning" | "fixed"`.
- **Asking for a clue is free.** Hints cost nothing; solving unaided pays a visible
  bonus instead. Any UI you build around hints must not imply a cost — no "uses
  left", no depleting meter, no warning colour on the hint button.
- **Stars point at one named thing.** A progress bar toward the next unlock sits on
  the home, game, results and studio screens. It is the main answer to "why am I
  collecting these". If you restructure a screen, it needs somewhere to live.
- **Returning is rewarded.** A day-streak banner on home, and a bonus on the first
  finished routine of each day.

**One inconsistency I left for you deliberately.** I softened the *persistent*
failure display but left the *transient* one alone: the feedback panel still shows
her wrong letters underlined in red (`.feedback .answer u`), and the results recap
still prints "you wrote: …" in red monospace (`.recap-row .typed`). My reasoning
was that a momentary pointer at a specific letter is instruction, while a permanent
tally is judgment. That is a defensible line but it is a *design* line, not an
engineering one, and it is yours to move.

## 5. The UI problems I'd fix, ranked

I'm a psychology pass, not a visual designer. These are observations with file
references, not prescriptions — where I suggest a direction, treat it as one
option, not the answer.

### 1. The Avatar Studio is a spreadsheet, not a dress-up game

This is the biggest single win available and I'd start here.

Every star she earns funnels to one screen, and that screen is **~45 items across 8
slots rendered as text-labelled pills** (`.item`, `css/styles.css` ~505;
`refreshStudio()` in `js/app.js`). To find out what "Curly Puff" or "Sparkle Bow"
*looks* like, she has to read the name, tap it, and look at the preview figure —
one at a time, forty-five times. For a child working on reading, the reward for
spelling correctly is a reading task.

It should be visual. The good news: `Gymnast` is pure SVG and already renders into
a cropped viewBox — the studio preview uses `viewBox="200 15 330 310"` to frame the
figure tightly (`index.html`, `#studio-gymnast`). A head-only crop for hair and
bows, a hands crop for pom-poms, a full figure for uniforms, is entirely achievable
with the existing rig and no new assets.

**Flag before you commit to it:** 45 live `Gymnast` instances on one screen may be
too heavy. Rendering each item once to a static SVG string, or reusing one shared
mannequin, are both cheaper. Worth prototyping the perf shape early.

### 2. Everything on screen has the same visual weight

The home screen is five tiles in identical treatment (`.home-tile`): Practice Gym,
Competition, Avatar Studio, Coach's Voice, and **Grown-Ups** — a parent dashboard
behind a gate — shouting exactly as loudly as the thing she came to do. The two
verbs she cares about (play, dress up) should dominate; the settings door should
recede to something small in a corner.

The same flatness runs through the setup screen: three sports × six word lists ×
three routine lengths, every one a bold label plus a small-text blurb, all the same
size, all the same colour.

### 3. The character is absent from most of her own game

`Gymnast` appears on **2 of 8 screens** — the arena and the studio. Home, setup,
results, voice, and profiles have no character on them at all.

Results is the worst case, because it's the emotional peak. She has just finished a
routine and the screen shows her a **text emoji medal** (`#res-medal`) and a number.
The athlete who just performed is not on the podium. Character attachment is a large
part of why a child comes back, the figure is already built, and it drops into any
`<svg>` you give it.

### 4. Her face is 13 pixels wide and has four states

`setExpression()` (`js/avatar.js` ~453) offers happy / focused / excited / oops,
each about three SVG paths, plus a fixed blush. No blink. No anticipation before a
skill. No reaction to the outfit she just spent 110 stars on. The head is a
13-unit-radius circle on a 700-unit stage.

The face is where a child reads character, and right now it is the smallest and
least expressive element on screen. Cheap, high-return additions: an idle blink
timer, eyes that glance toward the letter boxes while she types, a look-to-camera
beat before a hard skill, a delighted reaction when a purchase is confirmed.
`setExpression()` rebuilds `features.innerHTML` on every call, so extending the
vocabulary is additive and low-risk.

### 5. Reading load, in a game for a child working on reading

Worth auditing screen by screen with a stopwatch on how much decoding stands
between her and the next word. Current sample: every home tile carries a full
sentence; every setup choice carries a blurb; the studio closes with a two-line
instructional paragraph (`refreshStudio()`); the feedback panel after a miss runs to
four lines plus two buttons.

The one place text is legitimately central is the spelling word itself. Almost
everything else is a candidate for an icon, a picture, or a spoken line — and note
that `Speaker` (`js/audio.js`) already exists and can read *interface* text, not
just spelling words. That's an underused channel for a child who finds reading
effortful.

### 6. Layout shifts at the exact moment she needs to act

`#feedback` toggles from `display:none` to `display:block` beneath the input and
contains the "Next word →" button. On a short viewport — or a tablet with the OS
keyboard raised — that button can land below the fold immediately after she
submits. Reserving the space, or anchoring the continue affordance somewhere
stable, would make the core loop feel solid rather than jumpy.

### 7. The letterforms are a pedagogical decision, not a stylistic one

`--font-letters: "Consolas", "SF Mono", "Courier New", monospace` drives the letter
boxes, the spelling input, and the word recap. Monospace is a good instinct — even
spacing, unambiguous character cells.

But most monospace faces render **double-story `a` and `g`**, while an 8-year-old
is learning the single-story handwritten forms, and `l`/`I`/`1` and `b`/`d`
confusion is a live literacy issue at this age. This is the font she reads her own
spelling in. The no-external-assets invariant rules out loading a school-handwriting
face, which leaves a curated system stack or drawing the 26 letterforms as SVG paths
— the latter is less absurd than it sounds in a codebase that is already mostly SVG.
I'd want a specialist's actual opinion here rather than a guess.

### 8. Nobody knows what device she plays on, and it changes everything

Typing is the core verb. On a laptop the current layout is fine. On a tablet the OS
keyboard covers the lower half of the screen — hiding the arena, and very likely the
feedback panel and its continue button with it. There is no on-screen letter input,
and the stylesheet has exactly **two breakpoints** (640px and 780px).

If she plays on an iPad, this outranks everything above it. **Ask before you plan.**

### 9. Small, free wins

- The dot row distinguishes its three states by colour and fill only. Shape
  differentiation would cost nothing.
- Focus styles exist and are decent (4px gold outline) — she types constantly, so
  Tab is a real navigation path. Don't lose them in a restyle.
- `prefers-reduced-motion` is honoured in one blanket rule (`css/styles.css` ~641).
  Worth a more considered treatment than "make everything instant" if you add
  motion.

## 6. Open questions I could not answer

Carried forward from the engagement brief. These are yours.

**Palette.** High-saturation purple / pink / teal / gold. Two concerns: whether
it's overstimulating for sustained use, and whether it's coded strongly enough to
narrow who feels invited in — the profile system explicitly supports siblings and
classmates.

> **Gotcha before you re-theme.** "Everything routes through `:root` custom
> properties" is *almost* true and the exceptions are the visible ones. The arena
> scenery SVG has hardcoded hex fills (`index.html`, the `<defs>` and scenery
> block — wall gradients, floor mat, banner, barrier). The crowd shirt colours are a
> hardcoded array in `buildCrowd()` and the judges' skin/suit fills are literals in
> `buildJudges()` (`js/app.js`). A `:root` edit alone will re-theme the chrome and
> leave the arena — the largest coloured surface in the game — untouched.

**Background motion during typing.** The crowd bobs on a continuous 2.4s loop and
the gymnast has an idle breathing animation, both running while she is reading the
prompt and typing. Charming, or attention-splitting at exactly the wrong moment?

**Letter boxes.** One empty box per letter, which reveals word length. Genuine
scaffolding or a crutch that lets her count instead of spell? There's a toggle in
the grown-ups settings; the default is the real decision, and it's currently on.

**Social evaluation.** Competition mode ends with three judges revealing scores one
at a time. For some children that's the best part; for others it's the thing that
makes them stop playing. There is currently no way to have competition structure
*without* a scoring panel.

**Onboarding.** There is none. She lands on a menu and works it out.

**Practice mode never ends.** Endless by design — she stops when she wants. No
natural stopping point, no "you've done 20 words, want to keep going?"

**Nothing adapts to struggling.** A long losing run produces the same experience as
a good one, minus the skills. No difficulty easing, no encouragement escalation, no
offer to switch to an easier list.

**Competition and practice look nearly identical** apart from scoring. Competition
could feel like an *event* — an entrance, an introduction, a crowd that builds.

## 7. Invariants — these are hard

**1. It stays a double-clickable folder. This is the one that will hurt.**

No build step, no bundler, no CDN, no external assets of any kind. That means: **no
icon font, no illustration pack, no Google Fonts, no Tailwind or any CSS framework,
no image files, no audio files.** Plain `<script>` tags, because ES modules don't
load over `file://`. Everything visual is either SVG written into the repo, a system
font, or CSS. Every sound is synthesised in WebAudio (`Sfx` in `js/audio.js`).

This exists so her dad can hand her a folder with zero setup and it works offline
forever. It is not negotiable, and it will invalidate a normal design workflow, so
please plan around it from the start rather than discovering it at implementation.

**2. `node tests/check.js` stays green.** If you change values it asserts, update
the assertions rather than deleting them.

**3. Old save files keep opening.** New settings get a default in `blankProfile()`;
never rename or repurpose an existing key. See the migration section of `CLAUDE.md`.

**4. Speech stays optional.** Fully playable when the Web Speech API is missing or
muted — it currently falls back to flashing the word on screen. If you build UI that
speaks, it needs the same fallback.

**5. The word-list data contract stays stable.** `js/words.js` exports `WORD_LISTS`,
keyed by list id, each `{ label, blurb, words }` where `words` is an array of
`[word, sentence]` pairs. The curriculum specialist depends on this shape.

**6. Accessibility floor.** Visible focus outlines, `aria-pressed` on toggle
buttons, and `prefers-reduced-motion` support are all present today. Keep them.

## 8. Your handoff onward → Educator / Curriculum Specialist

They own `js/words.js` and the actual spelling content, and their job should be
*content*, not archaeology. Tell them:

- **Any structure you introduce that content must fill** — themed seasons, a level
  map, illustrated word cards, a daily set, a mastery ladder. If you build a frame,
  hand them the frame and its shape, explicitly.
- **If your design needs per-word metadata** — a picture, a phonics pattern, a
  syllable count, a difficulty tier — that is a change to the data contract in §7.5.
  It's a reasonable change to make, but it must be *inherited*, not discovered:
  update `parseWordList()` in `js/store.js`, the validator in `tests/check.js`, and
  `CLAUDE.md` to match, and say so plainly in your handoff.
- **Whatever you learn about session length, pacing, and visual/cognitive load**,
  because it constrains how many words a list should hold and how they sequence.
- Every word needs a sentence — it's read aloud between the two sayings of the
  word, in real spelling-test cadence. Current sentences lean on gym and cheer
  imagery to match her interests; that's worth keeping.
- The current 252 words are a reasonable placeholder written by a generalist, not a
  designed curriculum. They should feel free to replace all of them.

## 9. Status — a graphics pass shipped against §5

A later pass picked several items off the ranked list in §5 and the open
questions in §6, specifically as a *graphics* brief (character, face, arena,
palette) rather than a layout/interaction one. Read this before assuming any
of §5 or §6 is still fully open.

**Done:**

- **§5.1, Avatar Studio.** Already done by the time this pass started —
  `buildThumbnail()` in `js/avatar.js` replaced the text-pill grid with real
  SVG previews per item (hair, bow, outfit, hands all render actual shapes;
  colour slots show swatches). Its own comment cites this exact section.
  Nobody had updated this file or `CLAUDE.md`'s chain note to say so — if
  you're reading this before touching the studio, check the code before
  redoing the work.
- **§5.3, character presence.** She's now on 4 of 8 screens instead of 2:
  the Results screen has a static, waist-up `Gymnast` instance
  (`#res-gymnast`) posed in the same landing-salute the skills already end
  on, standing in for the old text-emoji-only medal; Home has a small idling
  one in the corner of the title (`#home-gymnast`, hidden under 640px so it
  never fights the tiles for space per §5.2's "let the verbs dominate").
  Letters/Language Play already had their own figures from the early-learner
  and speech-and-language passes. Setup, Voice, and Profiles are still
  character-free — genuinely open if someone wants to keep pushing this.
- **§5.4, face expressiveness.** `Gymnast` now blinks on an idle timer
  (`_scheduleBlink()`, off under `prefers-reduced-motion`), every expression
  has eyebrows instead of just eyes+mouth, and there's a fifth expression
  (`"proud"` — closed confident smile, raised brows, a small sparkle accent)
  used for the results podium and available for studio-unlock moments. Eyes
  glancing at the letter boxes while typing and a pre-hard-skill anticipation
  beat are still open, per the original list.
- **§6, arena colour routing.** The gotcha this section flagged — a `:root`
  edit not reaching the arena — is fixed. The SVG's gradient stops and flat
  fills now carry classes (`.arena-wall-top-stop`, `.arena-barrier`, etc.)
  styled from new `--arena-*`/`--crowd-*`/`--judge-*` custom properties in
  `:root` (see `css/styles.css`), and `buildCrowd()`/`buildJudges()`
  (`js/app.js`) read the same properties via a `cssVar()` helper instead of
  carrying their own literal arrays. One palette, in one place, same look as
  before — the actual hues weren't changed, just where they live.
- A small sparkle accent was added to the arena spotlight, and every medal
  tier (not just gold/silver) now gets a confetti burst on Results — see the
  bug this uncovered, below.
- A real bug, found while wiring the above: the gold/silver confetti burst on
  Results called `burstConfetti(n)` with no container, which defaults to
  `#fx-layer` — an element that lives in the *game* screen, already hidden
  by the time Results is showing. That confetti had never been visible.
  Fixed by passing `.results-stage` explicitly, matching how the studio and
  letters/language screens already did it correctly.

**Still open, deliberately not touched by this pass:**

- **§5.8 / §6, tablet layout.** The project owner confirmed Mila plays on an
  iPad. This pass was scoped to graphics (character, face, arena, colour
  plumbing), not layout or input, so the OS-keyboard-covers-the-lower-half
  problem, the two-breakpoint stylesheet, and on-screen input are all
  exactly as open as §5.8 originally found them. Don't read the tablet
  answer above as "layout is handled" — it isn't yet.
- **§6, palette saturation and profile inclusivity.** Still an open judgment
  call. One data point for whoever picks it up: nothing about the existing
  purple/pink/teal/gold reads as narrowly gendered on its own — the risk is
  more about intensity/saturation for sustained use than hue choice — but
  that's a read, not a resolution, and it wasn't tested with an actual
  sibling or classmate profile.
- **§5.2, tile hierarchy** (home tiles and setup choices all one visual
  weight) and **§5.6, layout shift** on the feedback panel are both
  unchanged — this pass added a character to the home screen without
  restructuring the tiles underneath it.
- **§5.7, letterforms.** Untouched; still the double-story monospace font
  flagged as a literacy concern.

**Architecture note for whoever's next:** the project owner opened up the
"no external asset files" invariant in `CLAUDE.md` §7.1/this doc's §7.1 for
this pass specifically (real image/SVG asset files are now allowed, not just
inline SVG-in-JS/HTML). This pass didn't end up needing any — every
improvement above was achievable with existing inline SVG plus new CSS
custom properties — so nothing was added under a new `assets/`-style folder.
The door is open if a future pass has a concrete reason to walk through it
(a hand-illustrated backdrop, a sprite sheet), but "we're allowed to now"
isn't itself a reason to add files. See `CLAUDE.md`'s own note on this for
the exact constraint that changed.
