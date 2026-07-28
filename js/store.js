/* Everything that survives a page reload. One localStorage key.
   Items that cost 0 stars count as owned without ever being bought.

   The file holds several players; each player's data has exactly the shape the
   whole save used to have, and `Store.data` always points at the active one —
   so every caller can keep saying Store.data.stars without caring about
   profiles. `Store.file` is the thing that actually gets written to disk. */

import { CATALOG, DEFAULT_LOOK } from "./avatar.js";
import { LETTERS, LETTER_LEVELS, nextLetterLevel, selectLetterPool } from "./letters.js";
import { selectPronounPool, selectSoundPool } from "./language.js";
import { WORD_LISTS } from "./words.js";

const SAVE_KEY = "mila-cartwheel-save-v1";
const SAVE_VERSION = 2;

function freebies() {
  const owned = {};
  for (const slot of Object.keys(CATALOG)) {
    owned[slot] = CATALOG[slot].items.filter((i) => i.cost === 0).map((i) => i.id);
  }
  return owned;
}

function newId() {
  return "p" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
}

/* Local calendar day as YYYY-MM-DD. Local, not UTC: "did I play today" has to
   mean her day, not Greenwich's. */
function dayKey(ts) {
  const d = ts == null ? new Date() : new Date(ts);
  return (
    d.getFullYear() +
    "-" + String(d.getMonth() + 1).padStart(2, "0") +
    "-" + String(d.getDate()).padStart(2, "0")
  );
}

/* Whole days from one dayKey to another, counted on the calendar rather than in
   milliseconds so daylight saving can't turn a return visit into a broken streak. */
function daysBetween(from, to) {
  const a = from.split("-").map(Number);
  const b = to.split("-").map(Number);
  return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000);
}

function blankProfile(name) {
  return {
    id: newId(),
    name: name || "Player 1",
    createdAt: Date.now(),
    look: Object.assign({}, DEFAULT_LOOK),
    owned: freebies(),
    stars: 0,
    starsAllTime: 0,
    // what she is saving up for: { slot, id }, or null to auto-pick
    goal: null,
    // coming back on consecutive days is its own reward
    visit: { lastDay: null, dayStreak: 0, bestDayStreak: 0, lastBonusDay: null },
    settings: {
      grade: "g3",
      sport: "gym",
      mode: "practice",
      routineLength: 10,
      speech: true,
      sfx: true,
      autoSpeak: true,
      voicePreset: "coach",
      voiceName: null,
      voiceRate: 0.9,
      voicePitch: 1.0,
      letterBoxes: true,
      customListId: null
    },
    medals: { gold: 0, silver: 0, bronze: 0, ribbon: 0 },
    best: { score: 0, streak: 0 },
    stats: { words: {}, sessions: [], attempts: 0, correct: 0 },
    customLists: [],
    // what a grown-up has asked the game to concentrate on for this profile —
    // per-profile, same as everything else here. focusNote is display-only:
    // it never feeds buildQueue(), it's a note for a person, not the algorithm.
    prefs: { pinned: {}, reviewMix: 0.34, focusNote: "" },
    // cross-device sync — see HANDOFF-ARCHITECTURE.md. On by default: every
    // profile gets a pairing code the moment it exists (Store._autoProvisionSync())
    // and every save() opportunistically pushes to it, so progress and the
    // avatar follow her to any device that has the code. localOnly is the
    // deliberate opt-out a grown-up flips in Settings — while it's true,
    // load()/createProfile() leave code alone instead of re-provisioning one.
    // `pending`/`lastError` make push failures visible instead of silently
    // dropped (see syncOnBoot() below) — `pending` true means the last
    // attempted push never got a confirmed response, so it's retried on the
    // next boot instead of being lost; `lastError` is display-only, read by
    // the Grown-Ups dashboard's Settings tab.
    sync: { code: null, lastSyncedAt: null, localOnly: false, pending: false, lastError: null },
    // "speller" is the original game this whole file used to be exclusively
    // about; "explorer" is the pre-literacy letters track for a younger
    // sibling (see HANDOFF-EARLY-LEARNER.md). This is a grown-up's explicit,
    // per-profile choice — never inferred from an age field, because a
    // struggling older reader or a precocious younger one can need the other
    // track. Defaulting to "speller" means every save written before this
    // feature existed keeps opening into exactly the experience it always
    // has; nothing about an existing profile changes on its own.
    stage: "speller",
    // progress data for the explorer track only; a "speller" profile just
    // carries this around unused, same as it would carry any other default.
    earlyLearner: {
      level: "upper", // "upper" -> "lower" -> "sound", see nextLetterLevel()
      levelProgress: {
        upper: { attempts: 0, right: 0 },
        lower: { attempts: 0, right: 0 },
        sound: { attempts: 0, right: 0 }
      },
      letters: {}, // per letter id: { seen, right, wrong }
      roundsCompleted: 0
    },
    // progress for the two "Language Play" activities (HANDOFF-SPEECH-AND-
    // LANGUAGE.md) — its own bucket, not folded into earlyLearner above,
    // since that field is scoped narrowly to the letters track (see its own
    // comment) and these are a separate pair of activities on pronoun case
    // and th/f discrimination. A "speller" profile carries this around
    // unused, same as earlyLearner already does.
    languagePlay: {
      pronoun: { items: {}, roundsCompleted: 0 }, // per pronoun-item id: { seen, right, wrong }
      sound: { pairs: {}, roundsCompleted: 0 } // per sound-pair id: { seen, right, wrong }
    }
  };
}

function blankFile() {
  return { v: SAVE_VERSION, activeId: null, order: [], profiles: {} };
}

/* Brings any older save forward: a v1 file was a single player's data with no
   wrapper, so it becomes this file's first profile. */
function migrate(parsed) {
  if (parsed && parsed.profiles && parsed.order) return parsed;
  const file = blankFile();
  if (parsed && (parsed.look || parsed.stars != null || parsed.stats)) {
    const p = deepMerge(blankProfile("Mila"), parsed);
    p.id = p.id || newId();
    p.name = p.name || (parsed.look && parsed.look.name) || "Mila";
    file.profiles[p.id] = p;
    file.order = [p.id];
    file.activeId = p.id;
  }
  return file;
}

const Store = {
  file: blankFile(),
  data: null,
  firstRun: false,
  _syncTimer: null,

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      this.file = raw ? migrate(JSON.parse(raw)) : blankFile();
    } catch (e) {
      console.warn("Could not read the save file, starting fresh.", e);
      this.file = blankFile();
    }

    if (!this.file.order.length) {
      this.firstRun = true;
      const p = blankProfile("Player 1");
      this.file.profiles[p.id] = p;
      this.file.order = [p.id];
      this.file.activeId = p.id;
    }
    if (!this.file.profiles[this.file.activeId]) this.file.activeId = this.file.order[0];

    // merge each profile onto a blank one so saves from older builds still open
    for (const id of this.file.order) {
      const merged = deepMerge(blankProfile(), this.file.profiles[id]);
      merged.id = id;
      // newly added free items must show up as owned
      const free = freebies();
      for (const slot of Object.keys(free)) {
        merged.owned[slot] = Array.from(new Set((merged.owned[slot] || []).concat(free[slot])));
      }
      this.file.profiles[id] = merged;
    }

    this._syncActive();

    // sync is on by default: a profile from a build before this existed just
    // gained `sync.localOnly: false` above via the blankProfile() merge, so it
    // gets provisioned here exactly once, same as a brand-new profile does —
    // nobody has to visit Settings for cross-device sync to start working.
    for (const id of this.file.order) this._autoProvisionSync(this.file.profiles[id]);

    return this.data;
  },

  /* Gives a profile a pairing code (in memory) and attempts to push its
     first snapshot, unless it already has a code or a grown-up deliberately
     turned sync off for it. Safe to call on any profile, active or not —
     reconcileSync() takes the profile explicitly rather than assuming
     this.data, so provisioning a profile that isn't currently active never
     touches the wrong save.

     Deliberately does NOT call _saveLocalOnly() itself: load() runs this for
     every profile on every page view, including the throwaway "Player 1"
     placeholder a brand-new visitor hasn't claimed yet, and load() must stay
     side-effect-free the way it always was — otherwise merely opening (or
     refreshing) the page before anyone types a name silently writes that
     placeholder to localStorage, and a refresh lands straight in "Player 1"
     instead of showing the name screen again. Persistence still happens
     normally: createProfile()/reset()/resetAll() call save() right after
     this, and reconcileSync() below persists on its own once a push
     actually succeeds. */
  _autoProvisionSync(profile) {
    if (!profile || profile.sync.localOnly || profile.sync.code) return;
    profile.sync.code = this._syncCode();
    this.reconcileSync(profile);
  },

  _syncActive() {
    this.data = this.file.profiles[this.file.activeId];
  },

  save() {
    this._saveLocalOnly();
    this._scheduleSync();
  },

  /* The localStorage write alone, no network follow-up. localStorage stays
     the thing every call site actually reads and writes; sync is layered on
     top opportunistically, never a requirement for save() to "succeed". Used
     directly (instead of save()) by the sync round trip itself so a
     reconcile's own bookkeeping write doesn't schedule another reconcile. */
  _saveLocalOnly() {
    try {
      this.file.v = SAVE_VERSION;
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.file));
    } catch (e) {
      console.warn("Could not write the save file.", e);
    }
  },

  /* Every save() now doubles as "something changed, worth telling the
     server" — debounced so a burst of writes (typing out a routine, tapping
     through the studio) costs one round trip, not one per keystroke. A
     no-op for a profile that's local-only or hasn't been provisioned yet. */
  _scheduleSync() {
    if (!this.data || !this.data.sync || !this.data.sync.code) return;
    clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => this.reconcileSync(), 2000);
    // Node's Timeout (unlike a browser's numeric handle) keeps the event loop
    // alive until it fires — irrelevant in a page, but it turns a background
    // sync into something that stalls process exit in tests/scripts.
    if (this._syncTimer && typeof this._syncTimer.unref === "function") this._syncTimer.unref();
  },

  /* ---- profiles ---- */

  profiles() {
    return this.file.order.map((id) => this.file.profiles[id]).filter(Boolean);
  },

  activeProfile() {
    return this.data;
  },

  createProfile(name, stage) {
    const p = blankProfile(name);
    if (stage === "explorer") p.stage = "explorer";
    this.file.profiles[p.id] = p;
    this.file.order.push(p.id);
    this._autoProvisionSync(p);
    this.save();
    return p;
  },

  switchProfile(id) {
    if (!this.file.profiles[id]) return false;
    this.file.activeId = id;
    this._syncActive();
    this.save();
    return true;
  },

  renameProfile(id, name) {
    const p = this.file.profiles[id];
    if (!p) return;
    p.name = String(name || "").trim() || p.name;
    this.save();
  },

  /* Refuses to remove the last player — there always has to be someone to be. */
  deleteProfile(id) {
    if (this.file.order.length <= 1) return false;
    delete this.file.profiles[id];
    this.file.order = this.file.order.filter((x) => x !== id);
    if (this.file.activeId === id) this.file.activeId = this.file.order[0];
    this._syncActive();
    this.save();
    return true;
  },

  /* Wipes the active player only; the others are untouched. */
  reset() {
    const id = this.file.activeId;
    const name = this.data ? this.data.name : "Player 1";
    const fresh = blankProfile(name);
    fresh.id = id;
    this.file.profiles[id] = fresh;
    this._syncActive();
    this._autoProvisionSync(this.data);
    this.save();
  },

  resetAll() {
    this.file = blankFile();
    const p = blankProfile("Player 1");
    this.file.profiles[p.id] = p;
    this.file.order = [p.id];
    this.file.activeId = p.id;
    this._syncActive();
    this._autoProvisionSync(this.data);
    this.save();
  },

  /* ---- unlocks ---- */

  isOwned(slot, id) {
    const item = CATALOG[slot] && CATALOG[slot].items.find((i) => i.id === id);
    if (item && item.cost === 0) return true;
    return (this.data.owned[slot] || []).indexOf(id) !== -1;
  },

  buy(slot, id) {
    if (!CATALOG[slot]) return { ok: false, reason: "unknown" };
    const item = CATALOG[slot].items.find((i) => i.id === id);
    if (!item || this.isOwned(slot, id)) return { ok: false, reason: "owned" };
    if (this.data.stars < item.cost) return { ok: false, reason: "stars", short: item.cost - this.data.stars };
    this.data.stars -= item.cost;
    (this.data.owned[slot] = this.data.owned[slot] || []).push(id);
    this.save();
    return { ok: true, item };
  },

  addStars(n) {
    this.data.stars += n;
    this.data.starsAllTime += n;
    this.save();
  },

  /* The item she is saving for. Pass nothing to go back to auto-picking. */
  setGoal(slot, id) {
    this.data.goal = slot && id ? { slot, id } : null;
    this.save();
  },

  /* ---- coming back tomorrow ---- */

  /* Called once when a player becomes active. Consecutive calendar days build a
     streak; any gap starts a new one. Returns what the welcome message needs. */
  registerVisit() {
    const v = this.data.visit;
    const today = dayKey();
    if (v.lastDay === today) return { isNewDay: false, dayStreak: v.dayStreak, gap: 0 };
    const gap = v.lastDay ? daysBetween(v.lastDay, today) : null;
    v.dayStreak = gap === 1 ? v.dayStreak + 1 : 1;
    v.lastDay = today;
    if (v.dayStreak > v.bestDayStreak) v.bestDayStreak = v.dayStreak;
    this.save();
    return { isNewDay: true, dayStreak: v.dayStreak, gap };
  },

  dailyBonusDue() {
    return this.data.visit.lastBonusDay !== dayKey();
  },

  /* Paid out for finishing the first routine of the day, not for opening the
     app — the bonus is for doing the work, and it grows with the day streak. */
  claimDailyBonus() {
    if (!this.dailyBonusDue()) return 0;
    // finishing a routine is itself a visit; registering it here means the
    // bonus can never be paid against a day streak of zero
    this.registerVisit();
    const n = 5 + Math.min(this.data.visit.dayStreak, 5) * 2;
    this.data.visit.lastBonusDay = dayKey();
    this.addStars(n);
    return n;
  },

  setLook(patch) {
    Object.assign(this.data.look, patch);
    this.save();
  },

  setSetting(key, value) {
    this.data.settings[key] = value;
    this.save();
  },

  /* ---- explorer track (pre-literacy letters, HANDOFF-EARLY-LEARNER.md) ----
     Kept separate from the stats/prefs above, which are all about a "speller"
     profile's words. A grown-up sets/overrides stage explicitly from the
     dashboard; it is never inferred from anything else. */

  setStage(stage) {
    this.data.stage = stage === "explorer" ? "explorer" : "speller";
    this.save();
  },

  setLetterLevel(level) {
    if (LETTER_LEVELS.indexOf(level) === -1) return;
    this.data.earlyLearner.level = level;
    this.save();
  },

  /* Picks a round's worth of letter ids, weighted toward the current level's
     weaker/unseen letters. Pure over its arguments — see selectLetterPool()
     in letters.js — this is just the this.data-reading wrapper around it,
     same split as buildQueue()/selectReviewPool() for the spelling side. */
  selectLetterPoolForRound(count) {
    const el = this.data.earlyLearner;
    return selectLetterPool(LETTERS, el.letters, count);
  },

  /* wasRight is "did she land on it eventually" — see recordLetterOutcome()
     for whether it took more than one try. level is the level it was asked
     at (upper/lower/sound), which is what levelProgress advances on. */
  recordLetterAttempt(letterId, level, wasRight) {
    const el = this.data.earlyLearner;
    const l = (el.letters[letterId] = el.letters[letterId] || { seen: 0, right: 0, wrong: 0 });
    l.seen++;
    if (wasRight) l.right++;
    else l.wrong++;
    const lp = (el.levelProgress[level] = el.levelProgress[level] || { attempts: 0, right: 0 });
    lp.attempts++;
    if (wasRight) lp.right++;
    el.level = nextLetterLevel(el);
    this.save();
  },

  finishLetterRound() {
    this.data.earlyLearner.roundsCompleted++;
    this.save();
  },

  /* ---- language play (pronoun case + th/f discrimination,
     HANDOFF-SPEECH-AND-LANGUAGE.md) ---- */

  selectPronounPoolForRound(count) {
    return selectPronounPool(this.data.languagePlay.pronoun.items, count);
  },

  selectSoundPoolForRound(count) {
    return selectSoundPool(this.data.languagePlay.sound.pairs, count);
  },

  recordPronounAttempt(itemId, wasRight) {
    const items = this.data.languagePlay.pronoun.items;
    const s = (items[itemId] = items[itemId] || { seen: 0, right: 0, wrong: 0 });
    s.seen++;
    if (wasRight) s.right++;
    else s.wrong++;
    this.save();
  },

  recordSoundAttempt(pairId, wasRight) {
    const pairs = this.data.languagePlay.sound.pairs;
    const s = (pairs[pairId] = pairs[pairId] || { seen: 0, right: 0, wrong: 0 });
    s.seen++;
    if (wasRight) s.right++;
    else s.wrong++;
    this.save();
  },

  finishLanguageRound(kind) {
    this.data.languagePlay[kind].roundsCompleted++;
    this.save();
  },

  /* ---- stats ---- */

  recordAttempt(word, wasRight, msTaken, usedHint) {
    const w = (this.data.stats.words[word] = this.data.stats.words[word] || {
      seen: 0, right: 0, wrong: 0, hints: 0, lastSeen: 0, totalMs: 0
    });
    w.seen++;
    w.lastSeen = Date.now();
    w.totalMs += msTaken || 0;
    if (usedHint) w.hints++;
    if (wasRight) {
      w.right++;
      w.firstTry = (w.firstTry || 0) + 1;
    } else {
      w.wrong++;
    }
    this.data.stats.attempts++;
    if (wasRight) this.data.stats.correct++;
    this.save();
  },

  /* How she eventually got a word right (or didn't) after the first miss —
     firstTry itself is recorded above; this only covers what happened next.
     Additive counters read with (w.field||0), so words already in an older
     save just start counting from zero — no migration needed. */
  recordFixOutcome(word, tier) {
    const w = this.data.stats.words[word];
    if (!w) return;
    if (tier === "retried") w.retried = (w.retried || 0) + 1;
    else if (tier === "multipleChoice") w.multipleChoice = (w.multipleChoice || 0) + 1;
    else if (tier === "unresolved") w.unresolved = (w.unresolved || 0) + 1;
    this.save();
  },

  recordSession(summary) {
    this.data.stats.sessions.push(summary);
    if (this.data.stats.sessions.length > 250) this.data.stats.sessions.shift();
    if (summary.medal) this.data.medals[summary.medal] = (this.data.medals[summary.medal] || 0) + 1;
    if (summary.score > this.data.best.score) this.data.best.score = summary.score;
    if (summary.bestStreak > this.data.best.streak) this.data.best.streak = summary.bestStreak;
    this.save();
  },

  /* Words she has missed at least once, worst first. */
  troubleWords(limit) {
    const rows = Object.entries(this.data.stats.words)
      .map(([word, s]) => ({
        word,
        ...s,
        accuracy: s.seen ? s.right / s.seen : 0,
        missRate: s.seen ? s.wrong / s.seen : 0
      }))
      .filter((r) => r.wrong > 0)
      .sort((a, b) => b.wrong - a.wrong || b.missRate - a.missRate || a.word.localeCompare(b.word));
    return limit ? rows.slice(0, limit) : rows;
  },

  masteredWords(limit) {
    const rows = Object.entries(this.data.stats.words)
      .map(([word, s]) => ({ word, ...s, accuracy: s.seen ? s.right / s.seen : 0 }))
      .filter((r) => r.seen >= 2 && r.wrong === 0)
      .sort((a, b) => b.seen - a.seen || a.word.localeCompare(b.word));
    return limit ? rows.slice(0, limit) : rows;
  },

  /* Buckets session history into a chart-ready trend, one point per session.
     Accuracy (correct/total) is the metric, not score — score is
     competition-only and stays 0 in practice mode (see CLAUDE.md's
     "Everyone medals"), so charting it against practice sessions on the
     same axis would be misleading. `rangeDays` filters to the trailing N
     days; omit it (or pass a falsy value) for the full cached history (up
     to 250 sessions — recordSession()'s own cap). Takes `sessions`
     explicitly rather than reading `this.data`, same reasoning as
     selectReviewPool() above: pure, testable, and reusable — in spirit
     shared with server/admin.html's own small copy of this same shape,
     since that page is a separate deployable that can't import this file
     (see docs/HANDOFF-ARCHITECTURE.md §11 / CLAUDE.md's Layout table). */
  sessionTrend(sessions, rangeDays) {
    const cutoff = rangeDays ? Date.now() - rangeDays * 86400000 : 0;
    return (sessions || [])
      .filter((s) => s.ts >= cutoff)
      .map((s) => ({
        ts: s.ts,
        accuracy: s.total ? s.correct / s.total : 0,
        mode: s.mode,
        listLabel: s.listLabel,
        score: s.score || 0,
        medal: s.medal || null
      }))
      .sort((a, b) => a.ts - b.ts);
  },

  /* ---- focus / review preferences (grown-ups dashboard) ---- */

  setPinned(word, mode) {
    // mode: "boost" | "retire" | null (unpin)
    if (mode) this.data.prefs.pinned[word] = mode;
    else delete this.data.prefs.pinned[word];
    this.save();
  },

  setReviewMix(value) {
    this.data.prefs.reviewMix = Math.max(0, Math.min(0.6, value));
    this.save();
  },

  setFocusNote(text) {
    this.data.prefs.focusNote = text;
    this.save();
  },

  /* Splits a word list into a weighted-review pool and the rest, folding in
     whatever a grown-up has pinned from the dashboard. Boosted words join the
     review pool regardless of measured accuracy; retired words are pulled out
     of it — they still appear at the normal random rate in "rest", because
     retiring softens over-focus, it never removes a word from her curriculum.
     A pure function of its arguments (doesn't read `this.data`), so it's
     testable without a live Store and reachable from any word list. */
  selectReviewPool(list, prefs, statsWords) {
    const pinned = (prefs && prefs.pinned) || {};
    const missed = new Set(
      Object.keys(statsWords || {}).filter((w) => statsWords[w].wrong > 0)
    );
    for (const w of Object.keys(pinned)) {
      if (pinned[w] === "boost") missed.add(w);
    }
    const isHard = (w) => missed.has(w) && pinned[w] !== "retire";
    const hard = list.words.filter((pair) => isHard(pair[0]));
    const rest = list.words.filter((pair) => !isHard(pair[0]));
    return { hard, rest };
  },

  /* ---- custom word lists ---- */

  addCustomList(name, entries) {
    const list = { id: "c" + Date.now().toString(36), name, words: entries };
    this.data.customLists.push(list);
    this.save();
    return list;
  },

  updateCustomList(id, name, entries) {
    const list = this.data.customLists.find((l) => l.id === id);
    if (!list) return null;
    list.name = name;
    list.words = entries;
    this.save();
    return list;
  },

  deleteCustomList(id) {
    this.data.customLists = this.data.customLists.filter((l) => l.id !== id);
    if (this.data.settings.customListId === id) this.data.settings.customListId = null;
    this.save();
  },

  getList(key) {
    if (key && key.startsWith("c")) {
      const custom = this.data.customLists.find((l) => l.id === key);
      if (custom) return { label: custom.name, blurb: "Your own list", words: custom.words };
    }
    return WORD_LISTS[key] || WORD_LISTS.g3;
  },

  exportJSON() {
    return JSON.stringify(this.file, null, 2);
  },

  importJSON(text) {
    this.file = migrate(JSON.parse(text));
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.file));
    this.load();
  },

  /* ---- cross-device sync (on by default — see HANDOFF-ARCHITECTURE.md) ----
     Whole-profile snapshots, timestamp-wins, never per-field merging: a
     single child can't play on two devices at the same instant, so a real
     conflict is a near-impossible edge case, and that's worth the
     simplicity. Every call here is fire-and-forget from the caller's side —
     localStorage stays the thing gameplay actually reads and writes; this
     only ever updates it opportunistically alongside that, and silently
     does nothing if there's no network or no sync server (the offline,
     zero-server folder copy of this game keeps working exactly as before).
     "Opt-in" flipped to "opt-out" with the localOnly flag on the profile:
     _autoProvisionSync() gives every profile a code unless that's set. */

  _syncCode() {
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — easier to read aloud or type in
    let code = "";
    for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    return code;
  },

  /* id and sync bookkeeping are always locally controlled — an incoming
     snapshot from another device only ever replaces the gameplay content.
     Takes the profile explicitly (defaulting to the active one) so the
     load()-time provisioning sweep can reconcile a profile that isn't
     active without disturbing this.data. */
  _adoptSnapshot(json, profile) {
    const p = profile || this.data;
    const localId = p.id;
    const localSync = p.sync;
    const incoming = JSON.parse(json);
    Object.assign(p, incoming);
    p.id = localId;
    p.sync = localSync;
    this._saveLocalOnly();
  },

  /* Turns sync on (or off) for the active profile — the Settings-page
     "Play offline only" toggle. Turning it back on re-provisions a fresh
     code rather than resurrecting the old one, matching rotateSyncCode()'s
     reasoning: a code that's been sitting disabled has had more chances to
     leak than one just generated. */
  setLocalOnly(flag) {
    if (flag) {
      this.disableSync();
      this.data.sync.localOnly = true;
      this.save();
    } else {
      this.data.sync.localOnly = false;
      this.enableSync();
    }
  },

  enableSync() {
    this.data.sync.code = this._syncCode();
    this.data.sync.localOnly = false;
    this._saveLocalOnly();
    this.reconcileSync();
    return this.data.sync.code;
  },

  rotateSyncCode() {
    const old = this.data.sync.code;
    if (old) fetch(`/api/profiles/${old}`, { method: "DELETE" }).catch(() => {});
    return this.enableSync();
  },

  disableSync() {
    const old = this.data.sync.code;
    if (old) fetch(`/api/profiles/${old}`, { method: "DELETE" }).catch(() => {});
    this.data.sync.code = null;
    this.save();
  },

  /* Pulls another device's synced profile down and replaces this profile's
     local data with it — for onboarding a second device. Destructive to
     whatever was here before; the caller must confirm with the parent first.
     Resolves true/false rather than throwing, since a failed link is an
     expected, recoverable outcome (wrong code, offline), not an error state. */
  async linkWithCode(code) {
    try {
      const res = await fetch(`/api/profiles/${code}`);
      if (!res.ok) return false;
      const { snapshot } = await res.json();
      this._adoptSnapshot(snapshot);
      this.data.sync.code = code;
      this.data.sync.localOnly = false;
      this.data.sync.lastSyncedAt = Date.now();
      this.save();
      return true;
    } catch {
      return false;
    }
  },

  /* The push/pull round trip. No-ops silently if this profile hasn't been
     provisioned (or was deliberately set local-only), or the server isn't
     reachable. Takes an explicit profile, defaulting to the active one, so
     _autoProvisionSync() can drive this for a profile that isn't active —
     e.g. provisioning every profile at load(), not just whichever one is
     open on this device.

     `pending` is set in memory immediately, but deliberately only persisted
     to disk once the round trip settles (success or failure) — load() calls
     this fire-and-forget for every profile via _autoProvisionSync(), and
     load() must stay synchronously side-effect-free (see its own comment)
     or merely opening the page could write a save file on its own. Since
     fetch() is always at least one tick away from settling, this doesn't
     lose the property that matters: a push that actually *fails* leaves
     `pending: true` on disk, so syncOnBoot() retries it next launch instead
     of silently losing it. `lastError` is display-only, surfaced in the
     Grown-Ups dashboard. */
  async reconcileSync(profile) {
    const p = profile || this.data;
    const code = p.sync.code;
    if (!code) return;
    p.sync.pending = true;
    try {
      const res = await fetch(`/api/profiles/${code}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot: JSON.stringify(p), updatedAt: Date.now() })
      });
      if (!res.ok) {
        p.sync.lastError = `sync failed (${res.status})`;
        this._saveLocalOnly();
        return;
      }
      const result = await res.json();
      if (result.pulled) this._adoptSnapshot(result.snapshot, p);
      p.sync.pending = false;
      p.sync.lastError = null;
      p.sync.lastSyncedAt = Date.now();
      this._saveLocalOnly();
    } catch (e) {
      // offline, or the sync server isn't there — pending stays true, so
      // this is retried next trigger or (if the app closes first) next boot
      p.sync.lastError = (e && e.message) || "network error";
      this._saveLocalOnly();
    }
  },

  /* Resolves to the settled value of `promise`, or `null` if `ms` elapses
     first (on timeout, or on any rejection). Never throws. Used so a slow
     or unreachable server can't hold up boot past a bounded wait — the
     promise itself is left to settle in the background either way. */
  _raceTimeout(promise, ms) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), ms);
      promise.then(
        (v) => { clearTimeout(timer); resolve(v); },
        () => { clearTimeout(timer); resolve(null); }
      );
    });
  },

  /* The authority flip (docs/HANDOFF-ARCHITECTURE.md §11): called once at
     boot, right after load() and before the app renders. Retries any push
     that never confirmed last session, then pulls the server's copy within
     a bounded timeout and adopts it if newer. localStorage is the fallback
     used only when the server can't be reached in time — not, as before,
     the thing trusted by default. Resolves either way; a slow or offline
     server just means the existing local copy stands, which is exactly the
     "cache" behavior this flip is about.

     Both steps go through _raceTimeout, not just the pull — reconcileSync()
     has no bounded wait of its own, so an unreachable server during the
     retry step would otherwise hang boot indefinitely, defeating the entire
     point of a bounded timeout here. The retry keeps running in the
     background even if it's timed out on; nothing here depends on it
     finishing before the pull check runs. */
  async syncOnBoot(profile, timeoutMs) {
    const p = profile || this.data;
    if (!p || !p.sync.code || p.sync.localOnly) return;
    const ms = timeoutMs || 1500;

    if (p.sync.pending) await this._raceTimeout(this.reconcileSync(p), ms);

    const res = await this._raceTimeout(fetch(`/api/profiles/${p.sync.code}`), ms);
    if (!res || !res.ok) return;
    try {
      const { snapshot, updatedAt } = await res.json();
      if (updatedAt > (p.sync.lastSyncedAt || 0)) {
        this._adoptSnapshot(snapshot, p);
        p.sync.lastSyncedAt = updatedAt;
        this._saveLocalOnly();
      }
    } catch {
      // malformed response — treat like unreachable, local copy stands
    }
  }
};

function deepMerge(base, patch) {
  if (Array.isArray(base)) return Array.isArray(patch) ? patch.slice() : base;
  if (base && typeof base === "object" && patch && typeof patch === "object") {
    const out = {};
    for (const k of new Set([...Object.keys(base), ...Object.keys(patch)])) {
      out[k] = k in patch ? deepMerge(k in base ? base[k] : patch[k], patch[k]) : base[k];
    }
    return out;
  }
  return patch === undefined ? base : patch;
}

/* Parses the parent dashboard's textarea: one word per line, with an
   optional sentence after a pipe. */
function parseWordList(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [word, sentence] = line.split("|").map((s) => (s || "").trim());
      return [word, sentence || `Can you spell ${word}?`];
    })
    .filter(([w]) => w.length > 0);
}

export { SAVE_KEY, SAVE_VERSION, freebies, newId, dayKey, daysBetween, blankProfile, blankFile, migrate, Store, deepMerge, parseWordList };
