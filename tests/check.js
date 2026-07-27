const fs = require("fs");
const vm = require("vm");
const path = require("path").join(__dirname, "..", "js") + "/";

// top-level `const`/`class` in a vm context stay lexical, so run the test body
// inside the very same script rather than reaching in from outside
const mem = new Map();
const localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k)
};
// a hand-cranked frame clock so the Animator can be driven deterministically
const clock = { t: 0, queue: [], next: 1 };
const ctx = vm.createContext({
  console, window: {}, process, localStorage, clock,
  performance: { now: () => clock.t },
  requestAnimationFrame: (cb) => { clock.queue.push({ id: clock.next, cb }); return clock.next++; },
  cancelAnimationFrame: (id) => { clock.queue = clock.queue.filter((j) => j.id !== id); },
  setTimeout, setImmediate, queueMicrotask, Promise,
  // no real network in tests — simulates "offline / no sync server", which
  // reconcileSync()'s own try/catch must swallow without throwing
  fetch: () => Promise.reject(new Error("no network in tests"))
});
const src =
  ["words.js", "letters.js", "avatar.js", "skills.js", "store.js"].map((f) => fs.readFileSync(path + f, "utf8")).join("\n") +
  "\n;globalThis.__done = (" + tests.toString() + ")();";

async function tests() {
const ctx = {
  SKILLS, IDLE, EASINGS, NEUTRAL_POSE, poseFrom, skillsForSport, chooseSkill,
  CATALOG, SKIN_TONES, DEFAULT_LOOK, Store, parseWordList, WORD_LISTS, GRADE_ORDER,
  Animator, SKILL_BY_ID, dayKey, daysBetween,
  LETTERS, LETTER_BY_ID, LETTER_LEVELS, nextLetterLevel, chooseOptionCount, selectLetterPool
};

let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.log("FAIL: " + msg); fails++; } };

/* ---- skills ---- */
for (const s of ctx.SKILLS) {
  ok(s.frames[0].t === 0, `${s.id} starts at t=0`);
  ok(s.frames[s.frames.length - 1].t === 1, `${s.id} ends at t=1`);
  for (let i = 1; i < s.frames.length; i++) {
    ok(s.frames[i].t > s.frames[i - 1].t, `${s.id} frame ${i} time ascending`);
  }
  const lastPx = s.frames[s.frames.length - 1].p.px || 0;
  ok((s.travel || 0) === lastPx, `${s.id} travel ${s.travel || 0} matches final px ${lastPx}`);
  for (const fr of s.frames) {
    for (const k of Object.keys(fr.p)) {
      ok(k in ctx.NEUTRAL_POSE, `${s.id} frame key "${k}" is a real pose key`);
      ok(typeof fr.p[k] === "number" && isFinite(fr.p[k]), `${s.id} ${k} is finite`);
    }
    if (fr.ease) ok(fr.ease in ctx.EASINGS, `${s.id} easing "${fr.ease}" exists`);
  }
}
ok(ctx.IDLE.frames[0].t === 0 && ctx.IDLE.frames.at(-1).t === 1, "idle spans 0..1");

/* ---- skill selection ---- */
for (const sport of ["gym", "cheer", "dance", "both"]) {
  const pool = ctx.skillsForSport(sport);
  ok(pool.length >= 5, `${sport} has enough skills (${pool.length})`);
  ok(pool.every((s) => s.difficulty > 0), `${sport} pool excludes reactions`);
  for (let streak = 0; streak <= 12; streak++) {
    const picked = ctx.chooseSkill(sport, streak, null);
    ok(picked && pool.includes(picked), `chooseSkill(${sport},${streak}) returns a pool skill`);
  }
}
// difficulty should actually escalate
const lowSample = new Set(), highSample = new Set();
for (let i = 0; i < 300; i++) {
  lowSample.add(ctx.chooseSkill("both", 0, null).difficulty);
  highSample.add(ctx.chooseSkill("both", 10, null).difficulty);
}
ok(Math.max(...lowSample) <= 1, `streak 0 stays at difficulty 1 (saw ${[...lowSample]})`);
ok(Math.max(...highSample) === 5, `streak 10 reaches difficulty 5 (saw ${[...highSample]})`);

/* ---- pose interpolation ---- */
const frames = ctx.SKILLS.find((s) => s.id === "cartwheel").frames.map((f) => ({ t: f.t, p: ctx.poseFrom(f.p) }));
for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.99]) {
  let i = 0;
  while (i < frames.length - 2 && t > frames[i + 1].t) i++;
  const k = (t - frames[i].t) / (frames[i + 1].t - frames[i].t);
  const blended = {};
  for (const key of Object.keys(ctx.NEUTRAL_POSE)) {
    blended[key] = frames[i].p[key] + (frames[i + 1].p[key] - frames[i].p[key]) * k;
    ok(isFinite(blended[key]), `cartwheel t=${t} ${key} finite`);
  }
}

/* ---- animator ----
   The Animator only touches setPose/origin/facing/look on the figure, so a
   recording stub is enough to drive it without any DOM. */
function stubGymnast() {
  return {
    origin: { x: 350, y: 250 },
    facing: 1,
    look: { trail: "none" },
    poses: [],
    setPose(p) { this.pose = p; this.poses.push(p); },
    setFacing(d) { this.facing = d; }
  };
}
function pump(frames, dt) {
  for (let i = 0; i < frames; i++) {
    clock.t += dt;
    const due = clock.queue;
    clock.queue = [];
    due.forEach((j) => j.cb(clock.t));
  }
}

{
  const g = stubGymnast();
  const anim = new ctx.Animator(g, { min: 170, max: 530 });

  anim.idle();
  pump(10, 16);
  ok(g.poses.length > 5, "idle keeps posing the figure");

  // the regression that mattered: play() while idling must interrupt the loop
  let resolved = false;
  const skill = ctx.SKILL_BY_ID.cartwheel;
  anim.play(skill).then(() => { resolved = true; });
  pump(2, 16);
  ok(anim.current && anim.current.skill.id === "cartwheel", "play() interrupts the idle loop");

  const before = g.origin.x;
  pump(Math.ceil(skill.dur / 16) + 4, 16);
  ok(g.origin.x === before + skill.travel, `travel applied to origin (${before} -> ${g.origin.x})`);

  // the last keyframe must be emitted exactly, not approached and abandoned
  // (by now g.pose is back to idle, so look through what was emitted)
  const hitEnd = g.poses.some((p) => Math.abs(p.rot - 360) < 0.001 && Math.abs(p.px - skill.travel) < 0.001);
  ok(hitEnd, "the final keyframe is emitted exactly");

  // queued skills run one after another
  const order = [];
  anim.play(ctx.SKILL_BY_ID.toeTouch).then(() => order.push("a"));
  anim.play(ctx.SKILL_BY_ID.herkie).then(() => order.push("b"));
  pump(400, 16);
  await new Promise((r) => setTimeout(r, 0));
  ok(resolved, "play() promise resolves when the skill ends");
  ok(order.join(",") === "a,b", `queued skills resolve in order (got ${order.join(",")})`);

  // travelling far enough must turn her around rather than walk off stage
  const g2 = stubGymnast();
  const anim2 = new ctx.Animator(g2, { min: 170, max: 530 });
  g2.origin.x = 520;
  anim2.idle();
  anim2.play(ctx.SKILL_BY_ID.cartwheel);
  pump(2, 16);
  ok(g2.facing === -1, "flips to face the other way instead of leaving the arena");
  pump(Math.ceil(ctx.SKILL_BY_ID.cartwheel.dur / 16) + 4, 16);
  ok(g2.origin.x === 520 - ctx.SKILL_BY_ID.cartwheel.travel, "mirrored travel moves her back inward");

  // every pose the animator emitted must be finite
  const bad = g.poses.filter((p) => Object.values(p).some((v) => !isFinite(v)));
  ok(bad.length === 0, "no non-finite values in any emitted pose");
}

/* ---- catalog / defaults ---- */
for (const slot of Object.keys(ctx.CATALOG)) {
  const ids = ctx.CATALOG[slot].items.map((i) => i.id);
  ok(new Set(ids).size === ids.length, `${slot} ids unique`);
  ok(ctx.CATALOG[slot].items.some((i) => i.cost === 0), `${slot} has at least one free item`);
  const def = ctx.DEFAULT_LOOK[slot];
  ok(ids.includes(def), `DEFAULT_LOOK.${slot}="${def}" exists in catalog`);
  const item = ctx.CATALOG[slot].items.find((i) => i.id === def);
  ok(item.cost === 0, `DEFAULT_LOOK.${slot} is free`);
}
ok(ctx.SKIN_TONES.some((t) => t.id === ctx.DEFAULT_LOOK.skin), "default skin exists");

/* ---- store ---- */
ctx.Store.load(); // no localStorage in node; must not throw
ok(ctx.Store.data.stars === 0, "fresh save starts at 0 stars");
for (const slot of Object.keys(ctx.CATALOG)) {
  ok(ctx.Store.isOwned(slot, ctx.DEFAULT_LOOK[slot]), `${slot} default owned by default`);
}
const paid = ctx.CATALOG.trail.items.find((i) => i.cost > 0);
ok(ctx.Store.buy("trail", paid.id).reason === "stars", "cannot buy without stars");
ctx.Store.addStars(1000);
ok(ctx.Store.buy("trail", paid.id).ok, "can buy with stars");
ok(ctx.Store.isOwned("trail", paid.id), "purchase is owned");
ok(ctx.Store.buy("skin", "s1").reason === "unknown", "unknown slot rejected, not thrown");

ctx.Store.recordAttempt("cartwheel", false, 4200, false);
ctx.Store.recordAttempt("cartwheel", true, 3000, true);
ctx.Store.recordAttempt("beam", true, 1500, false);
ok(ctx.Store.troubleWords().length === 1 && ctx.Store.troubleWords()[0].word === "cartwheel", "trouble words finds the miss");
ok(ctx.Store.data.stats.words.cartwheel.hints === 1, "hint recorded");

/* ---- goal ---- */
ok(ctx.Store.data.goal === null, "no goal is pinned on a fresh save");
ctx.Store.setGoal("bow", "crown");
ok(ctx.Store.data.goal.slot === "bow" && ctx.Store.data.goal.id === "crown", "a goal can be pinned");
ctx.Store.setGoal(null);
ok(ctx.Store.data.goal === null, "a goal can be cleared");

/* ---- day streak ---- */
{
  const shiftDay = (key, n) => {
    const p = key.split("-").map(Number);
    return ctx.dayKey(Date.UTC(p[0], p[1] - 1, p[2] + n) + 12 * 3600000);
  };
  const today = ctx.dayKey();
  ok(ctx.daysBetween(shiftDay(today, -1), today) === 1, "daysBetween counts a single day");
  ok(ctx.daysBetween(shiftDay(today, -9), today) === 9, "daysBetween counts across a week");

  const v = ctx.Store.data.visit;
  v.lastDay = null; v.dayStreak = 0; v.bestDayStreak = 0; v.lastBonusDay = null;

  let r = ctx.Store.registerVisit();
  ok(r.isNewDay && r.dayStreak === 1, "the first visit starts a one-day streak");
  r = ctx.Store.registerVisit();
  ok(!r.isNewDay && v.dayStreak === 1, "visiting twice in one day does not double-count");

  v.lastDay = shiftDay(today, -1);
  ok(ctx.Store.registerVisit().dayStreak === 2, "a visit the next day extends the streak");
  v.lastDay = shiftDay(today, -3);
  ok(ctx.Store.registerVisit().dayStreak === 1, "a missed day restarts the streak");
  ok(v.bestDayStreak === 2, "the best day streak is remembered");

  // the daily bonus is paid once per day and grows with the streak
  v.dayStreak = 3; v.lastBonusDay = null;
  const before = ctx.Store.data.stars;
  const paidOut = ctx.Store.claimDailyBonus();
  ok(paidOut === 11, `day-3 bonus is 11 stars (got ${paidOut})`);
  ok(ctx.Store.data.stars === before + paidOut, "the daily bonus lands in the balance");
  ok(ctx.Store.claimDailyBonus() === 0, "the daily bonus only pays once a day");
  ok(!ctx.Store.dailyBonusDue(), "a claimed bonus is no longer due");
  v.dayStreak = 40;
  v.lastBonusDay = null;
  ok(ctx.Store.claimDailyBonus() === 15, "the daily bonus is capped");
}

/* ---- custom lists ---- */
const parsed = ctx.parseWordList("beautiful | That was beautiful.\n\n  straight  \nbecause|I did because.\n");
ok(parsed.length === 3, `parseWordList found 3 (got ${parsed.length})`);
ok(parsed[0][0] === "beautiful" && parsed[0][1] === "That was beautiful.", "pipe splits word and sentence");
ok(parsed[1][0] === "straight" && /straight/.test(parsed[1][1]), "bare word gets a fallback sentence");
const cl = ctx.Store.addCustomList("Homework", parsed);
ok(ctx.Store.getList(cl.id).words.length === 3, "getList finds the custom list");
ok(ctx.Store.getList("g3").label === "Grade 3", "getList finds a built-in list");
ok(ctx.Store.getList("nope").label === "Grade 3", "getList falls back safely");

/* ---- save round-trip ---- */
ctx.Store.setLook({ hair: "braids", outfitColor: "gold" });
const starsBefore = ctx.Store.data.stars;
ctx.Store.data = null;
ctx.Store.load();
ok(ctx.Store.data.look.hair === "braids", "look survives a reload");
ok(ctx.Store.data.stats.words.cartwheel.wrong === 1, "stats survive a reload");
ok(ctx.Store.data.customLists.length === 1, "custom lists survive a reload");
ok(ctx.Store.data.stars === starsBefore, "star balance survives a reload");
ok(ctx.Store.isOwned("trail", paid.id), "purchases survive a reload");

/* ---- profiles ---- */
const milaId = ctx.Store.file.activeId;
ctx.Store.renameProfile(milaId, "Mila");
const sam = ctx.Store.createProfile("Sam");
ok(ctx.Store.profiles().length === 2, "a second player can be added");
ok(ctx.Store.data.name === "Mila", "adding a player does not switch to them");

ctx.Store.switchProfile(sam.id);
ok(ctx.Store.data.name === "Sam", "switching changes the active player");
ok(ctx.Store.data.stars === 0, "a new player starts with no stars");
ok(ctx.Store.data.stats.attempts === 0, "a new player starts with no history");
ok(!ctx.Store.isOwned("trail", paid.id), "a new player does not inherit purchases");
ok(ctx.Store.isOwned("bow", "small"), "a new player still owns the free items");

ctx.Store.addStars(5);
ctx.Store.recordAttempt("beam", true, 1000, false);
ctx.Store.switchProfile(milaId);
ok(ctx.Store.data.stars === starsBefore, "the first player's stars were untouched");
ok(!ctx.Store.data.stats.words.beam || ctx.Store.data.stats.words.beam.seen === 1,
   "players do not share word history");

ctx.Store.data = null;
ctx.Store.load();
ok(ctx.Store.profiles().length === 2, "both players survive a reload");
ok(ctx.Store.data.name === "Mila", "the active player survives a reload");
ok(ctx.Store.file.profiles[sam.id].stars === 5, "the inactive player's stars survive a reload");

ok(ctx.Store.deleteProfile(sam.id), "a player can be deleted");
ok(ctx.Store.profiles().length === 1, "delete removes exactly one player");
ok(ctx.Store.deleteProfile(milaId) === false, "the last player cannot be deleted");
ok(ctx.Store.data && ctx.Store.data.name === "Mila", "an active player always remains");

// resetting one player must not disturb the others
const two = ctx.Store.createProfile("Ari");
ctx.Store.switchProfile(two.id);
ctx.Store.addStars(42);
ctx.Store.reset();
ok(ctx.Store.data.stars === 0 && ctx.Store.data.name === "Ari", "reset clears the active player but keeps the name");
ctx.Store.switchProfile(milaId);
ok(ctx.Store.data.stars === starsBefore, "reset left the other player alone");
ctx.Store.deleteProfile(two.id);

// a v1 save (a bare player object, no wrapper) must migrate into a profile
localStorage.setItem("mila-cartwheel-save-v1", JSON.stringify({ v: 1, stars: 7, look: { hair: "bun" } }));
ctx.Store.data = null;
ctx.Store.load();
ok(ctx.Store.file.v === 2, "an old save is upgraded to the current version");
ok(ctx.Store.profiles().length === 1, "an old save becomes exactly one player");
ok(ctx.Store.data.stars === 7, "an old save keeps its own values");
ok(ctx.Store.data.look.hair === "bun", "an old save keeps its avatar");
ok(ctx.Store.data.settings.grade === "g3", "an old save gains missing defaults");
ok(ctx.Store.data.settings.voicePreset === "coach", "an old save gains newly added settings");
ok(ctx.Store.data.stats.sessions.length === 0, "an old save gains missing structures");
ok(ctx.Store.data.goal === null, "an old save gains the goal field");
ok(ctx.Store.data.visit && ctx.Store.data.visit.dayStreak === 0, "an old save gains the visit record");
ok(ctx.Store.isOwned("bow", "small"), "free items are owned after migrating an old save");
ok(ctx.Store.data.prefs && ctx.Store.data.prefs.reviewMix === 0.34, "an old save gains the prefs default review mix");
ok(Object.keys(ctx.Store.data.prefs.pinned).length === 0, "an old save gains an empty pinned list");
ok(ctx.Store.data.prefs.focusNote === "", "an old save gains an empty focus note");
ok(ctx.Store.data.sync && ctx.Store.data.sync.code === null, "an old save gains sync, opted out by default");
ok(ctx.Store.data.sync.lastSyncedAt === null, "an old save's sync has never synced");
ok(ctx.Store.data.stage === "speller", "an old save defaults to the speller stage — never silently downgraded");
ok(ctx.Store.data.earlyLearner && ctx.Store.data.earlyLearner.level === "upper", "an old save gains the earlyLearner bucket");
ok(Object.keys(ctx.Store.data.earlyLearner.letters).length === 0, "an old save's earlyLearner starts with no letter history");

/* ---- cross-device sync: must never throw or block when offline ---- */
{
  const code = ctx.Store.enableSync();
  ok(/^[A-Z0-9]{6}$/.test(code), `enableSync() returns a 6-char code (got "${code}")`);
  ok(ctx.Store.data.sync.code === code, "enableSync() stores the code on the active profile");
  await new Promise((r) => setImmediate(r)); // let the fire-and-forget reconcileSync() settle
  ok(true, "enableSync()/reconcileSync() did not throw with no network reachable");

  const linked = await ctx.Store.linkWithCode("NOPE99");
  ok(linked === false, "linkWithCode() resolves false, rather than throwing, when the server is unreachable");
}

/* ---- selectReviewPool ---- */
{
  const list = { words: [["cat", ""], ["dog", ""], ["bird", ""], ["fish", ""]] };
  const statsWords = {
    cat: { seen: 4, right: 1, wrong: 3 },  // genuinely missed
    dog: { seen: 4, right: 4, wrong: 0 }   // never missed
  };

  const plain = ctx.Store.selectReviewPool(list, { pinned: {} }, statsWords);
  ok(plain.hard.length === 1 && plain.hard[0][0] === "cat", "selectReviewPool puts only missed words in the hard pool");
  ok(plain.rest.length === 3, "selectReviewPool puts everything else in rest");

  const boosted = ctx.Store.selectReviewPool(list, { pinned: { bird: "boost" } }, statsWords);
  ok(boosted.hard.some((p) => p[0] === "bird"), "a boosted word joins the hard pool even with no misses recorded");
  ok(boosted.hard.some((p) => p[0] === "cat"), "boosting doesn't drop a genuinely missed word");

  const retired = ctx.Store.selectReviewPool(list, { pinned: { cat: "retire" } }, statsWords);
  ok(!retired.hard.some((p) => p[0] === "cat"), "a retired word is excluded from the hard pool");
  ok(retired.rest.some((p) => p[0] === "cat"), "a retired word still appears in rest, not removed from her curriculum");
}

/* ---- early-learner letters content ---- */
{
  ok(ctx.LETTERS.length === 26, `26 letters (got ${ctx.LETTERS.length})`);
  const ids = ctx.LETTERS.map((l) => l.id);
  ok(new Set(ids).size === 26, "letter ids unique");
  for (const l of ctx.LETTERS) {
    ok(/^[A-Z]$/.test(l.upper) && l.upper === l.id, `${l.id} upper is a single matching capital`);
    ok(l.lower === l.upper.toLowerCase(), `${l.id} lower matches upper`);
    ok(typeof l.clueWord === "string" && l.clueWord.length > 1, `${l.id} has a clue word`);
  }
  ok(ctx.LETTER_LEVELS.join(",") === "upper,lower,sound", "levels run upper -> lower -> sound");

  /* ---- chooseOptionCount ---- */
  ok(ctx.chooseOptionCount(0, 0) === 3, "starts at 3 choices");
  ok(ctx.chooseOptionCount(6, 0) === 4, "a streak of 6 raises the ceiling to 4");
  ok(ctx.chooseOptionCount(6, 2) === 2, "two misses in a row drop it back down, even mid-streak");
  ok(ctx.chooseOptionCount(0, 2) === 2, "struggling drops it to the easiest, 2 choices");

  /* ---- nextLetterLevel ---- */
  const fresh = { level: "upper", levelProgress: { upper: { attempts: 0, right: 0 }, lower: { attempts: 0, right: 0 }, sound: { attempts: 0, right: 0 } } };
  ok(ctx.nextLetterLevel(fresh) === "upper", "no progress yet stays on upper");
  const almost = { level: "upper", levelProgress: { upper: { attempts: 39, right: 39 }, lower: { attempts: 0, right: 0 }, sound: { attempts: 0, right: 0 } } };
  ok(ctx.nextLetterLevel(almost) === "upper", "not enough reps yet, even at perfect accuracy, stays on upper");
  const shaky = { level: "upper", levelProgress: { upper: { attempts: 40, right: 20 }, lower: { attempts: 0, right: 0 }, sound: { attempts: 0, right: 0 } } };
  ok(ctx.nextLetterLevel(shaky) === "upper", "enough reps but weak accuracy stays on upper");
  const ready = { level: "upper", levelProgress: { upper: { attempts: 40, right: 33 }, lower: { attempts: 0, right: 0 }, sound: { attempts: 0, right: 0 } } };
  ok(ctx.nextLetterLevel(ready) === "lower", "enough reps at 80%+ graduates upper -> lower");
  const topped = { level: "sound", levelProgress: { upper: { attempts: 40, right: 40 }, lower: { attempts: 40, right: 40 }, sound: { attempts: 40, right: 40 } } };
  ok(ctx.nextLetterLevel(topped) === "sound", "sound is the top level — mastering it doesn't advance further");

  /* ---- selectLetterPool ---- */
  const noProgress = ctx.selectLetterPool(ctx.LETTERS, {}, 8);
  ok(noProgress.length === 8, `selectLetterPool returns the requested count (got ${noProgress.length})`);
  ok(new Set(noProgress).size === 8, "selectLetterPool never repeats a letter within a round");
  ok(noProgress.every((id) => ctx.LETTER_BY_ID[id]), "every picked id is a real letter");

  const all26 = ctx.selectLetterPool(ctx.LETTERS, {}, 26);
  ok(all26.length === 26, "selectLetterPool can fill a round the size of the whole alphabet");

  // a letter she's shaky on should come up more often than one she's mastered
  const skewedProgress = { A: { seen: 20, right: 2, wrong: 18 }, B: { seen: 20, right: 20, wrong: 0 } };
  let aCount = 0, bCount = 0;
  for (let i = 0; i < 300; i++) {
    const pool = ctx.selectLetterPool(ctx.LETTERS, skewedProgress, 6);
    if (pool.includes("A")) aCount++;
    if (pool.includes("B")) bCount++;
  }
  ok(aCount > bCount, `a shaky letter (${aCount}/300) is weighted above a mastered one (${bCount}/300)`);
}

/* ---- Store: explorer track ---- */
{
  ctx.Store.resetAll();
  ok(ctx.Store.data.stage === "speller", "a fresh profile defaults to speller");

  ctx.Store.setStage("explorer");
  ok(ctx.Store.data.stage === "explorer", "setStage switches the active profile");
  ctx.Store.setStage("nonsense");
  ok(ctx.Store.data.stage === "speller", "an unrecognised stage falls back to speller, not left invalid");
  ctx.Store.setStage("explorer");

  const pool = ctx.Store.selectLetterPoolForRound(8);
  ok(pool.length === 8 && new Set(pool).size === 8, "selectLetterPoolForRound draws 8 distinct letters");

  ctx.Store.recordLetterAttempt("A", "upper", true);
  ctx.Store.recordLetterAttempt("A", "upper", false);
  ok(ctx.Store.data.earlyLearner.letters.A.seen === 2, "per-letter attempts accumulate");
  ok(ctx.Store.data.earlyLearner.letters.A.right === 1 && ctx.Store.data.earlyLearner.letters.A.wrong === 1, "right/wrong tracked per letter");
  ok(ctx.Store.data.earlyLearner.levelProgress.upper.attempts === 2, "level progress accumulates alongside per-letter stats");

  for (let i = 0; i < 40; i++) ctx.Store.recordLetterAttempt("B", "upper", true);
  ok(ctx.Store.data.earlyLearner.level === "lower", "enough solid reps at a level auto-advances it");

  ctx.Store.setLetterLevel("sound");
  ok(ctx.Store.data.earlyLearner.level === "sound", "a grown-up can override the level directly");
  ctx.Store.setLetterLevel("bogus");
  ok(ctx.Store.data.earlyLearner.level === "sound", "an unrecognised level is ignored, not applied");

  const beforeRounds = ctx.Store.data.earlyLearner.roundsCompleted;
  ctx.Store.finishLetterRound();
  ok(ctx.Store.data.earlyLearner.roundsCompleted === beforeRounds + 1, "finishing a round counts it");

  const explorerKid = ctx.Store.createProfile("Tiny", "explorer");
  ok(explorerKid.stage === "explorer", "createProfile can set the stage of a brand-new profile");
  ok(ctx.Store.data.stage === "explorer", "creating a profile doesn't switch to it or touch the active one's stage");
  ctx.Store.deleteProfile(explorerKid.id);

  ctx.Store.setStage("speller"); // leave the fixture profile as the later tests below expect
}

// export/import must round-trip every player
ctx.Store.createProfile("Backup Buddy");
const dump = ctx.Store.exportJSON();
ctx.Store.resetAll();
ok(ctx.Store.profiles().length === 1, "resetAll leaves a single fresh player");
ctx.Store.importJSON(dump);
ok(ctx.Store.profiles().length === 2, "import restores every player");
ok(ctx.Store.profiles().some((p) => p.name === "Backup Buddy"), "import restores player names");

/* ---- word content ---- */
let wordCount = 0, missingWord = [];
for (const key of ctx.GRADE_ORDER) {
  const list = ctx.WORD_LISTS[key];
  ok(list && list.words.length >= 30, `${key} has enough words`);
  const seen = new Set();
  for (const [w, s] of list.words) {
    wordCount++;
    ok(/^[a-z]+$/.test(w), `"${w}" in ${key} is a plain lowercase word`);
    ok(typeof s === "string" && s.length > 5, `"${w}" has a sentence`);
    if (!new RegExp(`\\b${w}`, "i").test(s)) missingWord.push(`${key}:${w}`);
    if (seen.has(w)) console.log(`  note: ${key} repeats "${w}"`);
    seen.add(w);
  }
}
ok(missingWord.length === 0, `every sentence contains its word (missing: ${missingWord.join(", ")})`);

console.log(`\nchecked ${ctx.SKILLS.length} skills, ${wordCount} words across ${ctx.GRADE_ORDER.length} lists`);
console.log(fails === 0 ? "ALL CHECKS PASSED" : `${fails} FAILURES`);
process.exitCode = fails ? 1 : 0;
}

vm.runInContext(src, ctx, { filename: "bundle.js" });
ctx.__done.catch((e) => { console.error(e); process.exitCode = 1; });
