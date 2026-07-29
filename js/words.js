/* Word lists by grade level.
   Each entry: [word, sentence]  — the sentence is read aloud after the word,
   the way a real spelling test works: "word ... sentence ... word."

   This is a designed curriculum, not a difficulty-sorted word dump (see
   docs/HANDOFF-CURRICULUM.md for the full brief and the decisions below).
   Each grade is organized into named clusters that teach or reinforce one
   spelling pattern at a time — the clusters exist for a human reading this
   file, not the game itself: `buildQueue()`/`shuffle()` (js/app.js) draw from
   the whole list at random, so cluster order never affects what she's asked
   in a session. Average word length climbs every grade on purpose
   (tests/check.js asserts it), and no word appears in more than one of
   g1-g5 — "bonus" is the one deliberate exception, since it's cross-grade
   gym/cheer vocabulary by design, not a graded list.

   ---- patterns (docs/HANDOFF-ELEVATION.md §6.1) ----
   Those clusters used to live only in the `//` comments below. CLAUDE.md's
   "Phonics-pattern grouping lives in source comments, not per-word metadata"
   said to promote them to data the day something could actually *use* one,
   and to hang them off the list object rather than growing the [word,
   sentence] tuple — that day arrived: a missed word now gets one line of
   real instruction on its retry card ("**ch** says /ch/ — like in *chin*
   and *lunch*"), which is the moment of maximum attention in the whole app.

   So each g1-g5 list carries a `patterns: [{ id, label, tip, words }]`
   array, and the comment headings below are now captions on that data
   rather than the only record of it. The word membership is written out
   longhand and duplicated from `words` on purpose: tests/check.js asserts
   every g1-g5 word belongs to exactly one pattern and that no pattern
   invents a word its list doesn't have, so the duplication can't silently
   drift — adding a word without classifying it fails the build.

   `bonus` deliberately has no patterns. It is sport vocabulary chosen for
   meaning, not a phonics-designed list (see above), so there is no honest
   cluster to assign; `patternFor()` returns null for anything it can't
   classify and the retry card simply omits the lesson line, which is also
   what happens for a grown-up's custom list. */

const WORD_LISTS = {
  g1: {
    label: "Grade 1",
    blurb: "Short vowels, blends & digraphs, first sight words",
    words: [
      // short vowels (CVC)
      ["cat", "The cat sat on my gym bag."],
      ["bag", "Pack your leotard in the bag."],
      ["hand", "Put your hand on the mat."],
      ["red", "She wore a red bow."],
      ["bed", "I made my bed today."],
      ["ten", "Count to ten on the beam."],
      ["big", "That is a big jump."],
      ["win", "Our team can win today."],
      ["sit", "Please sit on the bench."],
      ["hop", "I can hop on one foot."],
      ["top", "I climbed to the top."],
      ["run", "I run fast down the mat."],
      // consonant blends
      ["stop", "We stop when the coach claps."],
      ["flip", "She did a flip in the air."],
      ["grab", "Grab the bar with both hands."],
      ["swim", "We swim on the weekend."],
      ["trip", "Careful not to trip on the mat."],
      ["drop", "Don't drop your pompom."],
      ["spin", "She can spin on one toe."],
      ["stand", "Stand tall before you start."],
      ["clap", "Clap when she sticks the landing."],
      ["jump", "Watch me jump up high."],
      // digraphs (sh, ch, th, wh)
      ["shop", "We shop for a new leotard."],
      ["wish", "I wish I could do a split."],
      ["chin", "Tuck your chin to your chest."],
      ["that", "That was a great cartwheel."],
      ["this", "This is my favorite skill."],
      ["much", "I like gym so much."],
      ["when", "Smile when you land."],
      ["whip", "Don't whip your arms too fast."],
      // -ck, -ng, -nk endings
      ["kick", "Kick your leg up high."],
      ["sock", "Pull up your gym sock."],
      ["sing", "We sing our team song."],
      ["ring", "Ring the bell when you win."],
      ["pink", "My new bow is pink."],
      ["thank", "Thank your coach after practice."],
      // first sight words
      ["like", "I like doing cartwheels."],
      ["look", "Look at my handstand."],
      ["play", "We play in the gym."],
      ["was", "It was a great practice."],
      ["went", "We went to the meet."],
      ["said", "The coach said good job."],
      ["they", "They cheered for our team."],
      ["have", "I have a new leotard."],
      ["your", "Point your toes."],
      ["see", "I see the finish line."]
    ],
    patterns: [
      {
        id: "g1-short-vowels",
        label: "Short vowel words",
        tip: "Say it slowly and write one letter for every sound you hear.",
        words: ["cat", "bag", "hand", "red", "bed", "ten", "big", "win", "sit", "hop", "top", "run"]
      },
      {
        id: "g1-blends",
        label: "Blends",
        tip: "Two letters at the start, but you still say both of them — s-t-op.",
        words: ["stop", "flip", "grab", "swim", "trip", "drop", "spin", "stand", "clap", "jump"]
      },
      {
        id: "g1-digraphs",
        label: "Digraphs",
        tip: "Two letters, one sound: sh, ch, th and wh each make a single sound.",
        words: ["shop", "wish", "chin", "that", "this", "much", "when", "whip"]
      },
      {
        id: "g1-endings",
        label: "-ck, -ng and -nk endings",
        tip: "These endings travel as a pair — keep both letters together at the end.",
        words: ["kick", "sock", "sing", "ring", "pink", "thank"]
      },
      {
        id: "g1-sight",
        label: "Sight words",
        tip: "This one doesn't sound the way it looks, so it's a word to remember by heart.",
        words: ["like", "look", "play", "was", "went", "said", "they", "have", "your", "see"]
      }
    ]
  },

  g2: {
    label: "Grade 2",
    blurb: "Silent e, vowel teams, Bossy R words & tricky little words",
    words: [
      // silent e (a_e, i_e, o_e, u_e)
      ["made", "I made the team."],
      ["time", "It is almost time to compete."],
      ["smile", "Smile big for the judges."],
      ["shape", "Stretching keeps you in shape."],
      ["hope", "I hope to land it clean."],
      ["side", "Cartwheel to the side of the mat."],
      ["prize", "She won a prize for best routine."],
      ["cute", "My new bow is so cute."],
      // vowel teams (ai/ay, ee/ea, oa/ow, ie)
      ["rain", "We practice even in the rain."],
      ["day", "Today is a big meet day."],
      ["team", "Our team wore matching bows."],
      ["seat", "Take your seat before your turn."],
      ["clean", "Keep your landing clean."],
      ["speak", "Speak up when you answer."],
      ["coach", "My coach taught me a new skill."],
      ["float", "Float your arms up slowly."],
      ["throw", "Throw your arms overhead."],
      ["tie", "Tie your shoe before you run."],
      // r-controlled vowels (ar, or, er/ir/ur)
      ["start", "Take your start position."],
      ["sharp", "Point your toes into a sharp line."],
      ["sport", "Gymnastics is her favorite sport."],
      ["short", "The routine felt short today."],
      ["first", "She went first on the beam."],
      ["turn", "It is your turn to try."],
      ["hurt", "Tell me if anything hurts."],
      ["bird", "She landed light as a bird."],
      // compounds & suffixes built on words she already knows
      ["inside", "We practice inside the gym."],
      ["outside", "We stretch outside before we start."],
      ["upside", "She held herself upside down."],
      ["anything", "You can do anything with practice."],
      ["jumping", "Keep jumping until the whistle blows."],
      ["cheering", "The whole crowd was cheering."],
      ["making", "She is making great progress."],
      // tricky little words worth memorizing whole
      ["because", "I smiled because I landed it."],
      ["before", "Warm up before you tumble."],
      ["could", "I could hold the handstand."],
      ["every", "Every gymnast gets a turn."],
      ["found", "I found my missing sock."],
      ["going", "We are going to the gym."],
      ["happy", "I felt happy on the podium."],
      ["house", "My friend lives in that house."],
      ["kind", "Be kind to your teammates."],
      ["might", "It might rain later."],
      ["night", "The meet is on Friday night."],
      ["once", "We practiced it once more."],
      ["only", "Only two turns are left."],
      ["other", "Use your other foot."]
    ],
    patterns: [
      {
        id: "g2-silent-e",
        label: "Silent e",
        tip: "The e on the end says nothing — its job is to make the vowel say its own name.",
        words: ["made", "time", "smile", "shape", "hope", "side", "prize", "cute"]
      },
      {
        id: "g2-vowel-teams",
        label: "Vowel teams",
        tip: "Two vowels together make one sound — keep the pair side by side.",
        words: ["rain", "day", "team", "seat", "clean", "speak", "coach", "float", "throw", "tie"]
      },
      {
        id: "g2-bossy-r",
        label: "Bossy R",
        tip: "The r bosses the vowel around, so ar, or, er, ir and ur don't sound like plain vowels.",
        words: ["start", "sharp", "sport", "short", "first", "turn", "hurt", "bird"]
      },
      {
        id: "g2-built",
        label: "Words you can build",
        tip: "Break it into the smaller word and the ending you already know, then spell each part.",
        words: ["inside", "outside", "upside", "anything", "jumping", "cheering", "making"]
      },
      {
        id: "g2-tricky",
        label: "Tricky words",
        tip: "This one breaks the rules — picture the whole word and remember it in one piece.",
        words: ["because", "before", "could", "every", "found", "going", "happy", "house",
                "kind", "might", "night", "once", "only", "other"]
      }
    ]
  },

  g3: {
    label: "Grade 3",
    blurb: "Word beginnings & endings, the doubling rule, silent letters",
    words: [
      // prefixes (un-, re-, dis-)
      ["unable", "She felt unable to stop smiling."],
      ["replay", "Let's replay that routine."],
      ["redo", "I want to redo my last turn."],
      ["unfair", "It felt unfair to stop early."],
      ["disagree", "The judges did not disagree."],
      ["discover", "You might discover a new talent."],
      // suffixes (-ful, -less, -ly, -ness, -er, -est)
      ["careful", "Be careful on the landing."],
      ["fearless", "She looked fearless on the beam."],
      ["quickly", "Chalk your hands quickly."],
      ["kindness", "Her kindness helped the new girl."],
      ["brightest", "Her smile was the brightest one."],
      ["biggest", "That was her biggest jump yet."],
      ["faster", "Run faster toward the vault."],
      ["stronger", "Practice makes you stronger."],
      ["happiness", "Winning brought her real happiness."],
      ["carefully", "Land carefully every single time."],
      // doubling the final consonant before a suffix
      ["running", "She kept running across the floor."],
      ["stopped", "The music stopped right on cue."],
      ["clapping", "The crowd was clapping loudly."],
      ["skipping", "We are skipping rope for warm-up."],
      ["gripped", "She gripped the bar tightly."],
      ["tapping", "Her toes were tapping the beat."],
      // silent letters (kn, wr, mb, gh)
      ["knee", "She held the bridge on one knee."],
      ["wrist", "Wrap your wrist before the bars."],
      ["climb", "Climb up onto the beam slowly."],
      ["though", "She smiled, though her legs were tired."],
      ["knew", "I knew I could land it."],
      ["wrong", "Nothing about that routine felt wrong."],
      // soft c and soft g
      ["circle", "We sat in a circle to stretch."],
      ["gymnast", "The gymnast saluted the judges."],
      ["giant", "She took one giant leap."],
      ["cent", "It didn't cost a single cent to practice."],
      ["century", "Gymnastics has been a sport for over a century."],
      ["gentle", "Use a gentle landing on your feet."],
      // words that are easy to mix up with a homophone
      ["their", "Their team wore matching bows."],
      ["here", "Come here and show me your split."],
      ["new", "She has a new leotard."],
      ["whole", "Practice the whole routine again."],
      // longer words worth learning whole
      ["address", "I wrote my address on the form."],
      ["animal", "A cheetah is a fast animal."],
      ["answer", "Raise your hand to answer."],
      ["balance", "Keep your balance on the beam."],
      ["beautiful", "That was a beautiful routine."],
      ["believe", "I believe in you."],
      ["between", "Stand between the two mats."],
      ["breakfast", "Eat breakfast before the meet."],
      ["brother", "My brother came to cheer."],
      ["favorite", "The beam is my favorite event."]
    ],
    patterns: [
      {
        id: "g3-prefixes",
        label: "Prefixes",
        tip: "The prefix stays whole and the base word stays whole — just join them up.",
        words: ["unable", "replay", "redo", "unfair", "disagree", "discover"]
      },
      {
        id: "g3-suffixes",
        label: "Suffixes",
        tip: "Find the base word first, then add the ending onto the end of it.",
        words: ["careful", "fearless", "quickly", "kindness", "brightest", "biggest",
                "faster", "stronger", "happiness", "carefully"]
      },
      {
        id: "g3-doubling",
        label: "The doubling rule",
        tip: "Short vowel plus one last consonant? Double that consonant before -ing or -ed.",
        words: ["running", "stopped", "clapping", "skipping", "gripped", "tapping"]
      },
      {
        id: "g3-silent-letters",
        label: "Silent letters",
        tip: "There's a letter in here you never say — but it still has to be written.",
        words: ["knee", "wrist", "climb", "though", "knew", "wrong"]
      },
      {
        id: "g3-soft-cg",
        label: "Soft c and soft g",
        tip: "Before e, i or y, c says /s/ and g says /j/.",
        words: ["circle", "gymnast", "giant", "cent", "century", "gentle"]
      },
      {
        id: "g3-homophones",
        label: "Sound-alike words",
        tip: "Another word sounds exactly the same — listen to the sentence to know which one it wants.",
        words: ["their", "here", "new", "whole"]
      },
      {
        id: "g3-whole",
        label: "Words worth learning whole",
        tip: "Clap it into syllables and spell one chunk at a time.",
        words: ["address", "animal", "answer", "balance", "beautiful", "believe",
                "between", "breakfast", "brother", "favorite"]
      }
    ]
  },

  g4: {
    label: "Grade 4",
    blurb: "Big endings like -tion and -ous, plus long words worth knowing",
    words: [
      // -tion / -sion
      ["attention", "Pay attention to the coach."],
      ["competition", "The competition starts at noon."],
      ["direction", "Follow her direction across the floor."],
      ["motion", "Keep your motion smooth and slow."],
      ["decision", "Judging is a difficult decision."],
      ["action", "Every action counts in a routine."],
      ["celebration", "The medal ceremony felt like a celebration."],
      ["tension", "Hold the tension in your arms."],
      // -able / -ible
      ["comfortable", "These shoes are comfortable."],
      ["flexible", "Stretching makes you flexible."],
      ["incredible", "That vault was incredible."],
      ["capable", "She is capable of so much."],
      ["reliable", "A good spotter is reliable."],
      ["adjustable", "The bars are adjustable."],
      // -ous / -ious
      ["famous", "She is a famous gymnast."],
      ["nervous", "Everyone feels nervous before a meet."],
      ["curious", "She was curious about the new skill."],
      ["gorgeous", "Your new leotard is gorgeous."],
      ["courageous", "That first flip took a courageous try."],
      ["serious", "She gave the judges a serious look."],
      // -ment / -ness
      ["movement", "Every movement should look smooth."],
      ["excitement", "The whole gym buzzed with excitement."],
      ["achievement", "Landing it clean felt like an achievement."],
      ["awkwardness", "The awkwardness faded after practice."],
      ["agreement", "The judges reached an agreement."],
      ["statement", "Her routine made a bold statement."],
      // prefixes (non-, pre-, mis-, over-)
      ["nonstop", "She practiced nonstop all week."],
      ["prepare", "Prepare your mind before you compete."],
      ["mistake", "Everyone makes a mistake sometimes."],
      ["overcome", "She learned to overcome her nerves."],
      ["preview", "We got a preview of the new routine."],
      ["misplace", "Try not to misplace your grip tape."],
      // academic and sport vocabulary
      ["athlete", "Every athlete warmed up."],
      ["audience", "The audience clapped loudly."],
      ["average", "Her average score was high."],
      ["calendar", "The meet is on the calendar."],
      ["champion", "She is the state champion."],
      ["character", "Good sportsmanship shows character."],
      ["confident", "Walk in feeling confident."],
      ["experience", "Meets give you experience."],
      ["schedule", "Check the practice schedule."],
      ["journey", "Learning a skill is a journey."],
      ["energy", "Cheerleaders have so much energy."],
      ["environment", "The gym is a safe environment."],
      ["rhythm", "Cheer needs good rhythm."],
      ["muscle", "You need muscle for the bars."]
    ],
    patterns: [
      {
        id: "g4-tion",
        label: "-tion and -sion",
        tip: "That /shun/ sound on the end is almost always spelled -tion.",
        words: ["attention", "competition", "direction", "motion", "decision",
                "action", "celebration", "tension"]
      },
      {
        id: "g4-able",
        label: "-able and -ible",
        tip: "-able is the common one; -ible turns up when the part in front isn't a whole word by itself.",
        words: ["comfortable", "flexible", "incredible", "capable", "reliable", "adjustable"]
      },
      {
        id: "g4-ous",
        label: "-ous",
        tip: "When a describing word ends in that 'us' sound, spell it -ous.",
        words: ["famous", "nervous", "curious", "gorgeous", "courageous", "serious"]
      },
      {
        id: "g4-ment-ness",
        label: "-ment and -ness",
        tip: "These endings turn a word into a thing, and the base word underneath never changes.",
        words: ["movement", "excitement", "achievement", "awkwardness", "agreement", "statement"]
      },
      {
        id: "g4-prefixes",
        label: "Prefixes",
        tip: "Add the prefix to the front without changing a single letter of the base word.",
        words: ["nonstop", "prepare", "mistake", "overcome", "preview", "misplace"]
      },
      {
        id: "g4-vocabulary",
        label: "Words worth learning whole",
        tip: "Say it syllable by syllable and spell each chunk in turn.",
        words: ["athlete", "audience", "average", "calendar", "champion", "character",
                "confident", "experience", "schedule", "journey", "energy", "environment",
                "rhythm", "muscle"]
      }
    ]
  },

  g5: {
    label: "Grade 5",
    blurb: "Championship-level endings, long roots & competition words",
    words: [
      // -tious / -cious
      ["cautious", "Be cautious on a new skill."],
      ["gracious", "She was gracious after losing first place."],
      ["spacious", "The new gym feels spacious."],
      ["delicious", "The team celebrated with a delicious cake."],
      // -ance / -ence
      ["endurance", "Cheer takes endurance."],
      ["confidence", "Her confidence is growing."],
      ["performance", "That was her best performance yet."],
      ["persistence", "Her persistence finally paid off."],
      ["excellence", "She trains for excellence, not perfection."],
      ["brilliance", "Her brilliance on the beam surprised everyone."],
      // -ary / -ery / -ory
      ["necessary", "A spotter is necessary."],
      ["temporary", "The soreness is only temporary."],
      ["victory", "The victory felt amazing."],
      ["mandatory", "Stretching is mandatory before practice."],
      ["memory", "She has a memory for every routine."],
      // advanced roots and challenge vocabulary
      ["accomplish", "You can accomplish anything."],
      ["acrobatic", "She did an acrobatic leap."],
      ["appreciate", "I appreciate your hard work."],
      ["athletic", "He is very athletic."],
      ["brilliant", "That was a brilliant routine."],
      ["choreography", "The choreography was creative."],
      ["committee", "The committee chose the winners."],
      ["competitive", "She is very competitive."],
      ["concentrate", "Concentrate on the landing."],
      ["determination", "Her determination paid off."],
      ["disciplined", "Great gymnasts are disciplined."],
      ["enthusiasm", "She cheered with enthusiasm."],
      // competition-day vocabulary
      ["definitely", "I definitely want to compete."],
      ["dramatic", "The ending was dramatic."],
      ["equipment", "Put the equipment away."],
      ["exhausted", "We were exhausted after practice."],
      ["extraordinary", "That vault was extraordinary."],
      ["gracefully", "She landed gracefully."],
      ["gymnastics", "Gymnastics is my favorite sport."],
      ["immediately", "Chalk your hands immediately."],
      ["independent", "She is an independent learner."],
      ["magnificent", "The floor routine was magnificent."],
      ["opportunity", "This is a great opportunity."],
      ["perseverance", "Perseverance wins medals."],
      ["precision", "Her timing had real precision."],
      ["rehearsal", "We had one last rehearsal."],
      ["technique", "Work on your technique."]
    ],
    patterns: [
      {
        id: "g5-cious",
        label: "-cious and -tious",
        tip: "Both endings say /shus/ — never spell that sound the way it sounds.",
        words: ["cautious", "gracious", "spacious", "delicious"]
      },
      {
        id: "g5-ance-ence",
        label: "-ance and -ence",
        tip: "These two endings sound identical, so this is one to picture and remember.",
        words: ["endurance", "confidence", "performance", "persistence", "excellence", "brilliance"]
      },
      {
        id: "g5-ary-ory",
        label: "-ary, -ery and -ory",
        tip: "The vowel in this ending is almost silent when you say it — remember which one belongs here.",
        words: ["necessary", "temporary", "victory", "mandatory", "memory"]
      },
      {
        id: "g5-roots",
        label: "Big words from roots",
        tip: "Break it at the syllables and spell one piece at a time.",
        words: ["accomplish", "acrobatic", "appreciate", "athletic", "brilliant", "choreography",
                "committee", "competitive", "concentrate", "determination", "disciplined", "enthusiasm"]
      },
      {
        id: "g5-competition",
        label: "Competition words",
        tip: "A long word you'll use a lot — clap the syllables, then spell each one.",
        words: ["definitely", "dramatic", "equipment", "exhausted", "extraordinary", "gracefully",
                "gymnastics", "immediately", "independent", "magnificent", "opportunity",
                "perseverance", "precision", "rehearsal", "technique"]
      }
    ]
  },

  bonus: {
    label: "Gym & Cheer Words",
    blurb: "All the words from her sport",
    words: [
      ["arabesque", "She held a beautiful arabesque."],
      ["backflip", "He landed the backflip."],
      ["beam", "The balance beam is four inches wide."],
      ["bars", "She swings on the uneven bars."],
      ["bow", "My bow matches my uniform."],
      ["cartwheel", "Show me your best cartwheel."],
      ["chalk", "Put chalk on your hands."],
      ["cheer", "We cheer for our team."],
      ["dismount", "Stick the dismount."],
      ["floor", "The floor routine has music."],
      ["handspring", "She did a back handspring."],
      ["handstand", "Hold the handstand steady."],
      ["herkie", "A herkie is a cheer jump."],
      ["kick", "Kick your leg up high."],
      ["landing", "The landing was solid."],
      ["leap", "She took a giant leap."],
      ["leotard", "My leotard is sparkly."],
      ["megaphone", "She shouted into the megaphone."],
      ["pike", "Squeeze your legs in the pike."],
      ["pompom", "Shake your pompom high."],
      ["pyramid", "Our pyramid held steady."],
      ["salute", "Salute the judges when you finish."],
      ["somersault", "I rolled into a somersault."],
      ["split", "She can do a full split."],
      ["spotter", "The spotter kept her safe."],
      ["squad", "Our squad practices Tuesdays."],
      ["stunt", "That stunt needs three people."],
      ["trampoline", "We bounced on the trampoline."],
      ["tuck", "Pull your knees into a tuck."],
      ["tumble", "She loves to tumble."],
      ["vault", "She ran fast at the vault."],
      ["stretch", "Stretch your arms overhead."]
    ]
  }
};

const GRADE_ORDER = ["g1", "g2", "g3", "g4", "g5", "bonus"];

/* ---- pattern lookup (docs/HANDOFF-ELEVATION.md §6.1) ----

   Deliberately keyed by word across every list rather than scoped to the
   list she happens to be playing, for two reasons. A word lands in exactly
   one of g1-g5 (tests/check.js has always enforced that), so a global map is
   unambiguous by construction. And Story Spelling's blank words come from
   js/passages.js, not from any WORD_LISTS list at all — a global lookup is
   what lets the same lesson line appear on both activities' retry cards
   without either one having to know which grade a word "belongs" to. Words
   with no classification — the whole `bonus` list, a grown-up's custom list,
   a story word that isn't in the curriculum — simply return null, and the
   caller shows the retry card it always showed. */
const PATTERN_BY_WORD = (() => {
  const map = new Map();
  for (const key of GRADE_ORDER) {
    for (const p of WORD_LISTS[key].patterns || []) {
      for (const w of p.words) if (!map.has(w)) map.set(w, p);
    }
  }
  return map;
})();

function patternFor(word) {
  return PATTERN_BY_WORD.get(String(word || "").toLowerCase()) || null;
}

/* The retry card's one line of instruction. `examples` are drawn from the
   pattern's own word list minus the word she just missed, so they're always
   words that genuinely share the pattern and never the answer she's still
   trying to recall. Returns null — not an empty shape — when the word isn't
   classified, so the caller can branch on presence alone. */
function patternHint(word, exampleCount) {
  const p = patternFor(word);
  if (!p) return null;
  const w = String(word).toLowerCase();
  const pool = p.words.filter((x) => x !== w);
  const want = Math.min(exampleCount == null ? 2 : exampleCount, pool.length);
  const picked = [];
  const taken = new Set();
  while (picked.length < want) {
    const i = Math.floor(Math.random() * pool.length);
    if (taken.has(i)) continue;
    taken.add(i);
    picked.push(pool[i]);
  }
  return { id: p.id, label: p.label, tip: p.tip, examples: picked };
}

export { WORD_LISTS, GRADE_ORDER, patternFor, patternHint };
