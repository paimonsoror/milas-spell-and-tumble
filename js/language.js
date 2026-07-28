/* "Language Play" content for the explorer track (HANDOFF-SPEECH-AND-LANGUAGE.md) —
   a second branch off the pre-literacy track in js/letters.js, for the same
   5-year-old, targeting two specific, current struggles: mixing up subject/
   object pronouns ("her is 3 years old") and substituting "f" for "th"
   ("fermometer" for "thermometer"). Deliberately not LETTERS or WORD_LISTS:
   this is sentence- and word-pair-level content, so it gets its own shape,
   same reasoning js/letters.js's own header gives for not reusing WORD_LISTS.

   No microphone anywhere in this app (see CLAUDE.md / HANDOFF-SPEECH-AND-
   LANGUAGE.md §5) — both activities below are receptive/selection tasks by
   design, never a grader of her actual speech. */

/* ---------- Part A: pronoun case (she/her, he/him, they/them) ----------
   Scope is deliberately all three pairs, not just she/her: the project owner
   confirmed the swap is worth practicing across pronouns generally, not only
   the one that prompted this. Each item is a sentence with a blank spoken in
   full by TTS ("blank" stands in for the missing word — an ordinary word,
   not an isolated phoneme, so this has none of Part B's TTS constraint), and
   two choices: the grammatically correct pronoun and the wrong case for the
   same referent. `set` groups she/her, he/him, they/them so a round can draw
   from all three rather than drilling one pair only; `case` is "subject" or
   "object", kept as data (not levels — see selectPronounPool()'s header). */
const PRONOUN_ITEMS = [
  { id: "she-age", text: "___ is three years old.", correct: "she", wrong: "her", set: "she", case: "subject", icon: "👧" },
  { id: "she-jump", text: "___ likes to jump.", correct: "she", wrong: "her", set: "she", case: "subject", icon: "👧" },
  { id: "her-ball", text: "I gave the ball to ___.", correct: "her", wrong: "she", set: "she", case: "object", icon: "👧" },
  { id: "her-book", text: "Mom read a book to ___.", correct: "her", wrong: "she", set: "she", case: "object", icon: "👧" },
  { id: "he-brother", text: "___ is my brother.", correct: "he", wrong: "him", set: "he", case: "subject", icon: "👦" },
  { id: "he-outside", text: "___ wants to play outside.", correct: "he", wrong: "him", set: "he", case: "subject", icon: "👦" },
  { id: "him-toy", text: "I gave the toy to ___.", correct: "him", wrong: "he", set: "he", case: "object", icon: "👦" },
  { id: "him-play", text: "Dad played with ___.", correct: "him", wrong: "he", set: "he", case: "object", icon: "👦" },
  { id: "they-friends", text: "___ are my friends.", correct: "they", wrong: "them", set: "they", case: "subject", icon: "👫" },
  { id: "they-playing", text: "___ are playing with the ball.", correct: "they", wrong: "them", set: "they", case: "subject", icon: "👫" },
  { id: "them-crayons", text: "I gave the crayons to ___.", correct: "them", wrong: "they", set: "they", case: "object", icon: "👫" },
  { id: "them-played", text: "We played with ___.", correct: "them", wrong: "they", set: "they", case: "object", icon: "👫" }
];

const PRONOUN_BY_ID = PRONOUN_ITEMS.reduce((m, p) => ((m[p.id] = p), m), {});

/* Ordinary text-to-speech: replace the blank with the spoken word "blank"
   and let the TTS voice read the whole sentence naturally. No SSML pause
   trick needed — a spoken placeholder word reads fine on its own. */
function spokenPronounPrompt(item) {
  return item.text.replace("___", "blank");
}

/* ---------- Part B: "th" vs "f" discrimination ----------
   Pedagogically chosen pairs, not just orthographically similar ones: true
   minimal pairs first (differ only in the th/f sound), then near-pairs of
   two real, common words that still isolate the same initial- or final-
   position contrast, when a true minimal pair doesn't exist in a 5-year-
   old's vocabulary. No nonsense words on either side — every option has to
   be a real, picturable word, since asking her to discriminate a real word
   from a made-up one tests word recognition, not the sound. */
const SOUND_PAIRS = [
  { id: "thin-fin", th: "thin", f: "fin", position: "initial", pairType: "minimal" },
  { id: "three-free", th: "three", f: "free", position: "initial", pairType: "minimal" },
  { id: "thought-fought", th: "thought", f: "fought", position: "initial", pairType: "minimal" },
  { id: "thumb-fun", th: "thumb", f: "fun", position: "initial", pairType: "near" },
  { id: "thank-fan", th: "thank", f: "fan", position: "initial", pairType: "near" },
  { id: "bath-half", th: "bath", f: "half", position: "final", pairType: "near" },
  { id: "tooth-tough", th: "tooth", f: "tough", position: "final", pairType: "near" }
];

const SOUND_PAIR_BY_ID = SOUND_PAIRS.reduce((m, p) => ((m[p.id] = p), m), {});

/* Resolves a pair into one round item: which word is spoken (the target)
   and which is the wrong tap (the distractor), chosen 50/50 each time a
   pair comes up so the activity tests both directions of the confusion —
   not just "always pick the th word" — rather than baking a fixed
   direction into the content itself. */
function resolveSoundItem(pair) {
  const thIsTarget = Math.random() < 0.5;
  return {
    pairId: pair.id,
    target: thIsTarget ? pair.th : pair.f,
    distractor: thIsTarget ? pair.f : pair.th,
    targetSound: thIsTarget ? "th" : "f",
    position: pair.position
  };
}

/* A small inline SVG echo of the tactile cue her speech therapist already
   uses: tongue between the teeth for "th", lower lip tucked under the top
   teeth for "f". Not a new technique — a visual replay of one that's
   already working for her, per HANDOFF-SPEECH-AND-LANGUAGE.md §6 Part B.
   Pure and DOM-free so it's just a string, same as everything else here. */
function mouthShapeIcon(sound) {
  const label = sound === "th" ? "Tongue between the teeth, for the th sound" : "Lower lip under the top teeth, for the f sound";
  const tongueOrLip =
    sound === "th"
      ? '<ellipse cx="30" cy="34" rx="12" ry="7" fill="#f0879a"/>'
      : '<path d="M14 30 Q30 44 46 30 L46 40 Q30 50 14 40 Z" fill="#f0879a"/>';
  return `<svg class="mouth-icon" viewBox="0 0 60 46" role="img" aria-label="${label}">
    <rect x="10" y="8" width="40" height="10" rx="4" fill="#fff" stroke="#c9c2e8" stroke-width="2"/>
    ${tongueOrLip}
    <rect x="10" y="30" width="40" height="10" rx="4" fill="#fff" stroke="#c9c2e8" stroke-width="2"/>
  </svg>`;
}

function shuffleLanguageItems(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Same "circle back to the shaky ones" weighting as selectLetterPool() in
   letters.js: unseen items are worth more, low-accuracy items stay worth
   more than mastered ones. Deliberately no notion of a "level" here (unlike
   LETTER_LEVELS) — neither pronoun case nor th/f has a real difficulty
   ladder the way letter-name-then-sound does, so this weighting alone
   carries all the difficulty adaptation, same as letters.js's own comment
   explains for why it's a pure, reusable shape. */
function weightedPoolPick(ids, progress, count) {
  const prog = progress || {};
  const weight = (id) => {
    const s = prog[id];
    if (!s || !s.seen) return 3;
    const acc = s.right / s.seen;
    return acc >= 0.9 ? 1 : acc >= 0.6 ? 2 : 3;
  };
  const bag = [];
  for (const id of ids) {
    for (let i = 0; i < weight(id); i++) bag.push(id);
  }
  const picked = [];
  const used = new Set();
  for (const id of shuffleLanguageItems(bag)) {
    if (used.has(id)) continue;
    used.add(id);
    picked.push(id);
    if (picked.length >= count) break;
  }
  if (picked.length < count) {
    for (const id of shuffleLanguageItems(ids)) {
      if (used.has(id)) continue;
      used.add(id);
      picked.push(id);
      if (picked.length >= count) break;
    }
  }
  return picked;
}

function selectPronounPool(progress, count) {
  return weightedPoolPick(PRONOUN_ITEMS.map((p) => p.id), progress, count);
}

function selectSoundPool(progress, count) {
  return weightedPoolPick(SOUND_PAIRS.map((p) => p.id), progress, count);
}

export {
  PRONOUN_ITEMS, PRONOUN_BY_ID, spokenPronounPrompt,
  SOUND_PAIRS, SOUND_PAIR_BY_ID, resolveSoundItem, mouthShapeIcon,
  shuffleLanguageItems, weightedPoolPick, selectPronounPool, selectSoundPool
};
