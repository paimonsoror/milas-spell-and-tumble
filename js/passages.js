/* "Story Spelling" content — the speller track's second activity
   (docs/HANDOFF-PARAGRAPH.md). Instead of hearing one isolated word, she
   reads a short gym/cheer-themed paragraph with blanks in it, hears each
   missing word spoken aloud in reading order, and types it into place.

   Deliberately new prose, not a mechanical stitch of js/words.js's one-
   sentence-per-word entries — that file's sentences are short and built to
   showcase a single word in isolation ("Kick your leg up high."), not to
   read as a connected paragraph. This mirrors why js/language.js is its own
   hand-authored content rather than derived from WORD_LISTS or LETTERS (see
   that file's own header). Blank *words* still lean on grade-appropriate
   vocabulary for curriculum alignment — several reuse or echo words that
   also appear in WORD_LISTS for the same grade — but the surrounding prose
   is free to use richer language than the blank words themselves, the same
   way a words.js sentence can use words she isn't being asked to spell.

   ---------------------------------------------------------------------
   Data shape

   Each passage is { id, text, blanks }:
     - `text` is the paragraph with each missing word marked as the literal
       token "{blank}", in reading order.
     - `blanks` is the ordered list of the words that belong in those
       markers, one per occurrence, left to right. Using positional order
       instead of numbered placeholders ({0}, {1}, ...) keeps authoring a
       30-passage file far less error-prone — there is nothing to keep in
       sync by hand beyond "how many blanks did I just write."

   `passageSegments()` below is the one pure parser everything else builds
   on: it turns `text` into an ordered array of `{ type: "text", value }` /
   `{ type: "blank", index, word }` segments. Both the paragraph renderer in
   js/app.js and tests/check.js consume that same parsed shape, so there is
   exactly one place that understands the "{blank}" token.
   --------------------------------------------------------------------- */

const PASSAGE_LISTS = {
  g1: {
    label: "Grade 1",
    blurb: "Short, simple stories about the gym",
    passages: [
      {
        id: "g1-warmup",
        text: "We stretch before gym starts. Then we {blank} in a big circle to warm up. My coach said I can {blank} on one foot now. I like to {blank} the highest of anyone on my team.",
        blanks: ["run", "hop", "jump"]
      },
      {
        id: "g1-bows",
        text: "My team got new bows today. Mine is bright {blank} and so pretty. We {blank} for every teammate before her turn. After the meet we {blank} hands and say good job.",
        blanks: ["pink", "clap", "grab"]
      },
      {
        id: "g1-mat",
        text: "The mat in the gym is soft and red. I like to {blank} across it during practice. When I {blank} on it, my coach says thank you. I want to try a big {blank} next time.",
        blanks: ["flip", "land", "jump"]
      },
      {
        id: "g1-cheer",
        text: "Our squad likes to {blank} loud at every game. We {blank} our pompoms high in the air. Then we {blank} down low before our big jump.",
        blanks: ["sing", "wave", "bend"]
      },
      {
        id: "g1-practice",
        text: "It is time to go to the gym. I {blank} my bag by the door. My coach will {blank} me a new skill today. I {blank} that I can land it.",
        blanks: ["drop", "teach", "wish"]
      },
      {
        id: "g1-friends",
        text: "My friends and I {blank} to the gym after school. We {blank} on the trampoline until it is time to go. Then we {blank} bye and head home.",
        blanks: ["walk", "play", "wave"]
      }
    ]
  },

  g2: {
    label: "Grade 2",
    blurb: "Stories with a few more twists and turns",
    passages: [
      {
        id: "g2-rain",
        text: "Our {blank} practices even when it starts to rain. My coach said we could {blank} the mats before we begin. I felt so {blank} when she gave us extra time to stretch.",
        blanks: ["team", "clean", "happy"]
      },
      {
        id: "g2-firstmeet",
        text: "This is my {blank} meet of the season. I hope I can {blank} up before my turn. My whole family came to {blank} for me tonight.",
        blanks: ["first", "warm", "cheer"]
      },
      {
        id: "g2-newskill",
        text: "Today my coach taught me a brand new skill. At {blank} I was scared to try it. She said to keep my body {blank} and my eyes forward. I took a deep breath and gave it my {blank}. When I landed it clean, everyone started to {blank}.",
        blanks: ["first", "tall", "best", "cheer"]
      },
      {
        id: "g2-outside",
        text: "We practice {blank} the gym on sunny days. My coach likes for us to {blank} early before it gets hot. I try to make my landing {blank} every single time. By the {blank} of practice I am always tired but happy.",
        blanks: ["outside", "start", "clean", "end"]
      },
      {
        id: "g2-turn",
        text: "It is finally my {blank} to compete. I try to stay {blank} even though my stomach feels a little nervous. When I hear my name, I walk out and {blank} at the judges.",
        blanks: ["turn", "calm", "smile"]
      },
      {
        id: "g2-teamspirit",
        text: "Our whole team wore matching bows for the {blank}. Before we walked out, we all held hands in a {blank}. My coach told us to keep our chins up and {blank} the whole time. Winning is fun, but I love this team more than {blank}.",
        blanks: ["meet", "circle", "smile", "anything"]
      }
    ]
  },

  g3: {
    label: "Grade 3",
    blurb: "Stories that pull in trickier spelling patterns",
    passages: [
      {
        id: "g3-balance",
        text: "Learning to {blank} on the beam took a lot of practice. At first it felt {blank}, like I would fall any second. My coach reminded me to move {blank} instead of rushing. Now I feel {blank} every time I step up.",
        blanks: ["balance", "wrong", "carefully", "fearless"]
      },
      {
        id: "g3-newgirl",
        text: "A new {blank} joined our gym this week. Everyone showed her {blank} and helped her learn the rules. She was nervous at {blank}, but she is quickly becoming one of the {blank} kids on the team.",
        blanks: ["gymnast", "kindness", "first", "brightest"]
      },
      {
        id: "g3-vault",
        text: "The vault is my favorite event this {blank}. I {blank} down the runway as fast as I can. Right before I jump, I take one {blank} breath. Sticking the landing makes my whole team {blank}.",
        blanks: ["century", "race", "giant", "cheer"]
      },
      {
        id: "g3-injury",
        text: "Last week I hurt my {blank} during practice. My coach said to rest and be extra {blank} for a few days. Though it was hard to sit and watch, I knew it was the right {blank}. My {blank} came to every practice to cheer me on anyway. Now that I am better, I feel {blank} to get back out there.",
        blanks: ["knee", "careful", "call", "brother", "ready"]
      },
      {
        id: "g3-breakfast",
        text: "On meet days I always eat a good {blank}. My mom makes sure I have enough {blank} for a long day. Between events, I like to {blank} quietly and picture my whole routine. I truly {blank} that a calm mind helps me perform my best.",
        blanks: ["breakfast", "time", "sit", "believe"]
      },
      {
        id: "g3-address",
        text: "Our team is traveling to a meet, and coach texted everyone the {blank} of the new gym so no one gets lost. I always feel a {blank} of nerves the night before a trip like this. My whole family is coming, even my {blank}, who never misses a meet. When we {blank} at the gym, the floor looks bigger than I imagined. I take a deep breath and remind myself I have practiced this a {blank} times.",
        blanks: ["address", "giant", "brother", "arrive", "hundred"]
      }
    ]
  },

  g4: {
    label: "Grade 4",
    blurb: "Stories built around bigger academic and sport words",
    passages: [
      {
        id: "g4-focus",
        text: "Before every routine, I take a moment to {blank} my mind. My coach taught me to pay close {blank} to my breathing. It helps calm the {blank} in my shoulders before I begin. Staying {blank} makes the whole routine feel easier.",
        blanks: ["prepare", "attention", "tension", "confident"]
      },
      {
        id: "g4-competitionday",
        text: "The {blank} starts early in the morning, so we warm up before the sun is even up. Every {blank} in the gym is nervous but excited. My coach reminds us that a small {blank} early on does not decide the whole day. I try to stay {blank} and trust the hours of practice behind me. When my name is called, the {blank} claps loudly for our whole team.",
        blanks: ["competition", "athlete", "mistake", "confident", "audience"]
      },
      {
        id: "g4-flexibility",
        text: "Being {blank} is one of the most important parts of gymnastics. I stretch every {blank} before I even touch the mat. My splits used to hurt, but now they feel almost {blank}. My coach says my {blank} has grown so much this year. I never {blank} how much stronger stretching would make me.",
        blanks: ["flexible", "muscle", "comfortable", "movement", "imagined"]
      },
      {
        id: "g4-champion",
        text: "Everyone in the gym looks up to our reigning {blank}. She trains with total {blank}, never skipping a single practice. Her {blank} on the beam is so smooth it looks effortless. Watching her compete gives me real {blank} for my own routine. I hope that with enough hard work, I can build that same kind of {blank} someday.",
        blanks: ["champion", "focus", "rhythm", "energy", "character"]
      },
      {
        id: "g4-schedule",
        text: "Our gym posted the new practice {blank} on the wall today. I checked the {blank} to see which days I have off. Between school and practice, my {blank} feels busier than ever. Still, I would not trade this {blank} for anything.",
        blanks: ["schedule", "calendar", "week", "journey"]
      },
      {
        id: "g4-teamspirit2",
        text: "Our whole squad felt pure {blank} before the big meet. Everyone was talking at once, full of {blank} energy we could barely contain. Our captain, who is always so {blank}, calmed us down with a quick pep talk. She reminded us that we are more than just teammates; we are like a whole extra {blank}. By the time we walked out, every single {blank} on the team felt ready.",
        blanks: ["excitement", "nonstop", "confident", "family", "athlete"]
      }
    ]
  },

  g5: {
    label: "Grade 5",
    blurb: "Longer stories with challenge-level competition vocabulary",
    passages: [
      {
        id: "g5-technique",
        text: "Every great gymnast eventually realizes that {blank} matters more than raw power alone. My coach drills the same skill over and over until my {blank} finally starts to feel automatic. It takes real {blank} to keep trying after a hard fall. Some days I feel {blank}, but I remind myself that champions are simply people who refused to quit. With enough {blank}, even the hardest skills start to feel possible.",
        blanks: ["technique", "precision", "determination", "exhausted", "perseverance"]
      },
      {
        id: "g5-rehearsal",
        text: "Our final {blank} before the competition ran long into the evening. The whole {blank} watched quietly from the folding chairs near the door. My {blank} needed one more adjustment before the big meet. I could tell my coach was proud, even though she stayed {blank} about it. Walking out of the gym that night, I finally felt {blank} that we were ready.",
        blanks: ["rehearsal", "committee", "equipment", "cautious", "confident"]
      },
      {
        id: "g5-bigmeet",
        text: "The state {blank} finally arrived after months of hard work, and walking into the {blank} arena, I felt my heart pound with nervous energy. I told myself to {blank} on nothing except my own routine. My floor music started, and every {blank} movement felt like it belonged to someone braver than me. When I landed my last pass {blank}, the whole crowd rose to their feet. That moment of pure {blank} is something I will remember forever.",
        blanks: ["competition", "spacious", "concentrate", "acrobatic", "gracefully", "brilliance"]
      },
      {
        id: "g5-newteammate",
        text: "A new teammate joined us this season, and she is incredibly {blank}. At first she seemed {blank} about showing anyone her full routine. Slowly, the whole team started to {blank} how hard she works every single day. Her {blank} on the uneven bars is honestly {blank}.",
        blanks: ["athletic", "cautious", "appreciate", "technique", "extraordinary"]
      },
      {
        id: "g5-endurance",
        text: "Building real {blank} takes months of {blank} training, not just one good week. Some days the {blank} feels endless, and I want to quit halfway through conditioning. My coach says that kind of {blank} is exactly what separates good gymnasts from {blank} ones. I try to {blank} on how far I have already come instead of how tired I feel right now.",
        blanks: ["endurance", "disciplined", "rehearsal", "persistence", "average", "concentrate"]
      },
      {
        id: "g5-magnificent",
        text: "Our coach called our group routine truly {blank} after we finally cleaned up the transitions. It took real {blank} to memorize every count of the {blank}. I am proud that our whole squad stayed {blank} through every single practice this month. When the judges score us, I hope they notice how much {blank} we put into every detail.",
        blanks: ["magnificent", "precision", "choreography", "disciplined", "enthusiasm"]
      }
    ]
  }
};

const PASSAGE_GRADE_ORDER = ["g1", "g2", "g3", "g4", "g5"];

/* Parses `passage.text` into an ordered list of text/blank segments. Pure
   and DOM-free, same reasoning as every other pure helper in this file —
   both the real renderer (js/app.js) and tests/check.js consume this same
   shape instead of each re-deriving it from the raw "{blank}" token. */
function passageSegments(passage) {
  const parts = passage.text.split("{blank}");
  const segments = [];
  parts.forEach((value, i) => {
    if (value) segments.push({ type: "text", value });
    if (i < parts.length - 1) {
      segments.push({ type: "blank", index: i, word: passage.blanks[i] });
    }
  });
  return segments;
}

function passageBlankCount(passage) {
  return passage.blanks.length;
}

function shufflePassages(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Picks `count` passages from `passages`, shuffled, without repeating one
   until every other passage in the list has had a turn — the same "reshuffle
   once the bag empties" trick js/app.js's currentWord() uses for practice
   mode, just over passages instead of single words. Works even when
   `count` exceeds `passages.length` (a routine longer than the grade's
   whole passage list), which is why this is a loop with its own internal
   reshuffle rather than a single slice(). */
function pickPassages(passages, count) {
  const out = [];
  let pool = [];
  while (out.length < count) {
    if (!pool.length) pool = shufflePassages(passages);
    out.push(pool.shift());
  }
  return out;
}

/* Flattens an ordered list of passages into one ordered queue of blanks to
   play through, in reading order within each passage and passage order
   across the list. `startIndex` offsets `passageIndex` so a practice
   session can extend an existing queue with freshly picked passages
   without renumbering what already played — see startParagraphSession()/
   currentParaBlank() in js/app.js, which is the only caller that needs the
   offset; a fresh routine always calls this with the default 0. */
function buildBlankQueue(passages, startIndex) {
  const offset = startIndex || 0;
  const queue = [];
  passages.forEach((p, i) => {
    for (const seg of passageSegments(p)) {
      if (seg.type !== "blank") continue;
      queue.push({ passageIndex: offset + i, passageId: p.id, blankIndex: seg.index, word: seg.word });
    }
  });
  return queue;
}

/* Every distinct blank word used anywhere in a grade's passages, for the
   multiple-choice fallback's distractor pool (mirrors how word-mode's
   startMultipleChoice() draws distractors from the rest of the active word
   list) — deliberately the whole grade's passages, not just the words in
   the current routine, so a short routine still has enough distractors. */
function allBlankWords(list) {
  const words = new Set();
  for (const p of list.passages) {
    for (const w of p.blanks) words.add(w);
  }
  return Array.from(words);
}

export {
  PASSAGE_LISTS, PASSAGE_GRADE_ORDER,
  passageSegments, passageBlankCount, shufflePassages, pickPassages, buildBlankQueue, allBlankWords
};
