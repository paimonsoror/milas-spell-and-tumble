/* Pre-literacy content for the "explorer" track (HANDOFF-EARLY-LEARNER.md) —
   a separate, younger sibling to the spelling game, for a child who mostly
   isn't decoding whole words yet. Deliberately not WORD_LISTS: this is a
   recognition-and-matching task (hear/see a letter, pick it from a few
   choices), not spelling recall, so it needs its own shape. Never touch
   words.js/WORD_LISTS from here — see CLAUDE.md's handoff chain.

   Letter names lead sounds here: most kids arrive already able to recite
   some of the alphabet by name (from an ABC song, blocks, fridge magnets)
   before they reliably know sounds, and it plays to a strength of the Web
   Speech API rather than a weakness — speaking a bare letter reliably
   produces its *name* ("bee"), which is exactly the level-1/2 prompt. Sounds
   come after, and are asked as "which letter starts the word ___" rather
   than trying to coax an isolated phoneme out of TTS text (there's no
   reliable cross-browser way to make a voice say a bare "mmm"), which
   sidesteps that constraint entirely instead of fighting it. */

const LETTERS = [
  { id: "A", upper: "A", lower: "a", clueWord: "apple" },
  { id: "B", upper: "B", lower: "b", clueWord: "ball" },
  { id: "C", upper: "C", lower: "c", clueWord: "cat" },
  { id: "D", upper: "D", lower: "d", clueWord: "dog" },
  { id: "E", upper: "E", lower: "e", clueWord: "egg" },
  { id: "F", upper: "F", lower: "f", clueWord: "fish" },
  { id: "G", upper: "G", lower: "g", clueWord: "goat" },
  { id: "H", upper: "H", lower: "h", clueWord: "hat" },
  { id: "I", upper: "I", lower: "i", clueWord: "igloo" },
  { id: "J", upper: "J", lower: "j", clueWord: "jump" },
  { id: "K", upper: "K", lower: "k", clueWord: "kite" },
  { id: "L", upper: "L", lower: "l", clueWord: "leaf" },
  { id: "M", upper: "M", lower: "m", clueWord: "moon" },
  { id: "N", upper: "N", lower: "n", clueWord: "nest" },
  { id: "O", upper: "O", lower: "o", clueWord: "octopus" },
  { id: "P", upper: "P", lower: "p", clueWord: "pig" },
  { id: "Q", upper: "Q", lower: "q", clueWord: "queen" },
  { id: "R", upper: "R", lower: "r", clueWord: "rabbit" },
  { id: "S", upper: "S", lower: "s", clueWord: "sun" },
  { id: "T", upper: "T", lower: "t", clueWord: "top" },
  { id: "U", upper: "U", lower: "u", clueWord: "umbrella" },
  { id: "V", upper: "V", lower: "v", clueWord: "van" },
  { id: "W", upper: "W", lower: "w", clueWord: "web" },
  { id: "X", upper: "X", lower: "x", clueWord: "x-ray" },
  { id: "Y", upper: "Y", lower: "y", clueWord: "yo-yo" },
  { id: "Z", upper: "Z", lower: "z", clueWord: "zebra" }
];

const LETTER_BY_ID = LETTERS.reduce((m, l) => ((m[l.id] = l), m), {});

/* upper -> lower -> sound. Only ever moves forward on its own — dropping a
   child back down a level is left to a grown-up's explicit override in the
   dashboard (HANDOFF-EARLY-LEARNER.md §8), never inferred silently. Simple
   blending (CVC words) is deliberately not a fourth level here; that's the
   seam handed to the next curriculum specialist, see HANDOFF-CURRICULUM.md. */
const LETTER_LEVELS = ["upper", "lower", "sound"];

/* A level "graduates" once she's had a real number of reps at solid
   accuracy — 40 attempts is roughly five rounds, and 0.8 leaves room for a
   few misses without gating on a lucky streak. */
function levelMastered(levelProgress) {
  const p = levelProgress || { attempts: 0, right: 0 };
  return p.attempts >= 40 && p.right / p.attempts >= 0.8;
}

function nextLetterLevel(earlyLearner) {
  const level = earlyLearner.level;
  const i = LETTER_LEVELS.indexOf(level);
  if (i < 0 || i === LETTER_LEVELS.length - 1) return level;
  return levelMastered(earlyLearner.levelProgress[level]) ? LETTER_LEVELS[i + 1] : level;
}

/* How many choices to show at once. Starts at 3 (this track assumes she
   already knows some letters, not zero) and flexes with how the round is
   actually going, the same way chooseSkill() flexes with a spelling streak —
   a run of correct answers raises the ceiling, a couple of misses in a row
   lowers it, so the task keeps matching her in the moment rather than
   whatever she showed up already knowing. */
function chooseOptionCount(streak, missStreak) {
  if (missStreak >= 2) return 2;
  if (streak >= 6) return 4;
  return 3;
}

function shuffleLetters(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Picks `count` distinct letter ids for a round, weighted toward whichever
   letters are weaker or unseen at this level — same "circle back to the
   hard ones" idea as Store.selectReviewPool(), just over 26 letters instead
   of a word list. A pure function of its arguments (no `this`), so it's
   reachable from tests/check.js's vm context without a live Store, same
   reasoning as selectReviewPool. */
function selectLetterPool(letters, progress, count) {
  const prog = progress || {};
  const weight = (id) => {
    const s = prog[id];
    if (!s || !s.seen) return 3; // never seen — worth showing early
    const acc = s.right / s.seen;
    return acc >= 0.9 ? 1 : acc >= 0.6 ? 2 : 3; // shakier letters come up more
  };
  const bag = [];
  for (const l of letters) {
    for (let i = 0; i < weight(l.id); i++) bag.push(l.id);
  }
  const picked = [];
  const used = new Set();
  const shuffled = shuffleLetters(bag);
  for (const id of shuffled) {
    if (used.has(id)) continue;
    used.add(id);
    picked.push(id);
    if (picked.length >= count) break;
  }
  // the weighted bag can run out before `count` is reached if it's an early
  // round with a short letter set — top up from whatever's left, unweighted
  if (picked.length < count) {
    for (const l of shuffleLetters(letters)) {
      if (used.has(l.id)) continue;
      used.add(l.id);
      picked.push(l.id);
      if (picked.length >= count) break;
    }
  }
  return picked;
}

export { LETTERS, LETTER_BY_ID, LETTER_LEVELS, levelMastered, nextLetterLevel, chooseOptionCount, shuffleLetters, selectLetterPool };
