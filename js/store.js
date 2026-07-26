/* Everything that survives a page reload. One localStorage key.
   Items that cost 0 stars count as owned without ever being bought.

   The file holds several players; each player's data has exactly the shape the
   whole save used to have, and `Store.data` always points at the active one —
   so every caller can keep saying Store.data.stars without caring about
   profiles. `Store.file` is the thing that actually gets written to disk. */

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
    customLists: []
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
    return this.data;
  },

  _syncActive() {
    this.data = this.file.profiles[this.file.activeId];
  },

  save() {
    try {
      this.file.v = SAVE_VERSION;
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.file));
    } catch (e) {
      console.warn("Could not write the save file.", e);
    }
  },

  /* ---- profiles ---- */

  profiles() {
    return this.file.order.map((id) => this.file.profiles[id]).filter(Boolean);
  },

  activeProfile() {
    return this.data;
  },

  createProfile(name) {
    const p = blankProfile(name);
    this.file.profiles[p.id] = p;
    this.file.order.push(p.id);
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
    this.save();
  },

  resetAll() {
    this.file = blankFile();
    const p = blankProfile("Player 1");
    this.file.profiles[p.id] = p;
    this.file.order = [p.id];
    this.file.activeId = p.id;
    this._syncActive();
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

  /* ---- stats ---- */

  recordAttempt(word, wasRight, msTaken, usedHint) {
    const w = (this.data.stats.words[word] = this.data.stats.words[word] || {
      seen: 0, right: 0, wrong: 0, hints: 0, lastSeen: 0, totalMs: 0
    });
    w.seen++;
    w.lastSeen = Date.now();
    w.totalMs += msTaken || 0;
    if (usedHint) w.hints++;
    if (wasRight) w.right++;
    else w.wrong++;
    this.data.stats.attempts++;
    if (wasRight) this.data.stats.correct++;
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
