/* Two unrelated jobs that both happen to make noise:
   Speaker  — reads words aloud with the Web Speech API
   Sfx      — synthesises chimes and crowd noise with WebAudio (no asset files) */

/* Named "coach" voices. Each is a system voice plus a pitch/speed treatment,
   because the actual installed voices differ wildly between machines — the
   `match` patterns are preferences, not requirements, and a preset still works
   (just less distinctly) when none of them are installed. */
const VOICE_PRESETS = [
  {
    id: "coach", name: "Coach Riley", emoji: "🏅",
    blurb: "Clear and steady, like a real coach",
    rate: 0.9, pitch: 1.0,
    match: [/Aria/i, /Jenny/i, /Samantha/i, /Google US English/i, /Zira/i]
  },
  {
    id: "bubbly", name: "Bubbly Bella", emoji: "🎀",
    blurb: "Bright, fast and peppy",
    rate: 1.02, pitch: 1.45,
    match: [/Zira/i, /Samantha/i, /Google US English/i, /Aria/i]
  },
  {
    id: "announcer", name: "Big Announcer", emoji: "📣",
    blurb: "Booming voice of the arena",
    rate: 0.84, pitch: 0.65,
    match: [/David/i, /Guy/i, /Mark/i, /Google UK English Male/i, /Daniel/i]
  },
  {
    id: "gentle", name: "Gentle Grace", emoji: "🌸",
    blurb: "Soft and slow — good for tricky words",
    rate: 0.68, pitch: 1.12,
    match: [/Michelle/i, /Karen/i, /Moira/i, /Samantha/i]
  },
  {
    id: "robot", name: "Robo Coach", emoji: "🤖",
    blurb: "Beep boop. S-P-E-L-L it.",
    rate: 1.06, pitch: 0.42,
    match: [/David/i, /Mark/i, /Guy/i]
  },
  {
    id: "custom", name: "Make Your Own", emoji: "🎛️",
    blurb: "Choose any voice and set the speed yourself",
    rate: 0.9, pitch: 1.0,
    match: []
  }
];

const VOICE_PRESET_BY_ID = VOICE_PRESETS.reduce((m, p) => ((m[p.id] = p), m), {});

class Speaker {
  constructor() {
    this.supported = typeof speechSynthesis !== "undefined";
    this.voice = null;
    this.preferredName = null;
    this.rate = 0.9;
    this.pitch = 1.0;
    this.enabled = true;
    if (this.supported) {
      this._pickVoice();
      // voices almost always arrive after first paint, so re-resolve on load
      speechSynthesis.addEventListener("voiceschanged", () => this._pickVoice());
    }
  }

  _pickVoice() {
    const voices = this.listVoices();
    if (!voices.length) return;
    // an explicit choice always wins, once that voice actually exists
    if (this.preferredName) {
      const exact = voices.find((v) => v.name === this.preferredName);
      if (exact) { this.voice = exact; return; }
    }
    const preferred = [
      /Google US English/i, /Samantha/i, /Microsoft Aria/i, /Microsoft Jenny/i,
      /Microsoft Zira/i, /Microsoft Michelle/i, /Karen/i, /Moira/i
    ];
    for (const rx of preferred) {
      const hit = voices.find((v) => rx.test(v.name));
      if (hit) { this.voice = hit; return; }
    }
    this.voice = voices.find((v) => /en[-_]US/i.test(v.lang)) || voices[0];
  }

  listVoices() {
    return this.supported ? speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang)) : [];
  }

  setVoiceByName(name) {
    this.preferredName = name || null;
    this._pickVoice();
  }

  /* Best installed voice for a preset, or null to leave the default alone. */
  voiceForPreset(preset) {
    const voices = this.listVoices();
    for (const rx of preset.match || []) {
      const hit = voices.find((v) => rx.test(v.name));
      if (hit) return hit.name;
    }
    return null;
  }

  applyProfile(settings) {
    this.rate = settings.voiceRate != null ? settings.voiceRate : 0.9;
    this.pitch = settings.voicePitch != null ? settings.voicePitch : 1.0;
    this.setVoiceByName(settings.voiceName);
  }

  cancel() {
    if (this.supported) speechSynthesis.cancel();
  }

  say(text, opts) {
    const o = opts || {};
    if (!this.supported || !this.enabled) return Promise.resolve();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      if (this.voice) u.voice = this.voice;
      // callers pass multipliers, not absolutes, so the chosen coach voice
      // still colours "slowly" and "spell it out"
      u.rate = clampRate((o.rate != null ? o.rate : 1) * this.rate);
      u.pitch = clampPitch((o.pitch != null ? o.pitch : 1) * this.pitch);
      u.volume = 1;
      u.onend = resolve;
      u.onerror = resolve;
      speechSynthesis.speak(u);
    });
  }

  pause(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  /* The classic spelling-test cadence: word, sentence, word again. */
  async prompt(word, sentence, opts) {
    const o = opts || {};
    this.cancel();
    await this.say(word, { rate: o.slow ? 0.7 : 1 });
    if (sentence && !o.wordOnly) {
      await this.pause(220);
      await this.say(sentence);
      await this.pause(220);
      await this.say(word, { rate: o.slow ? 0.7 : 1 });
    }
  }

  /* Reads the letters one at a time, for showing how a missed word is built. */
  async spellOut(word) {
    this.cancel();
    for (const ch of word.toUpperCase()) {
      await this.say(ch, { rate: 0.8, pitch: 1.08 });
      await this.pause(90);
    }
    await this.pause(200);
    await this.say(word, { rate: 0.88 });
  }
}

function clampRate(r) {
  return Math.max(0.1, Math.min(2, r));
}
function clampPitch(p) {
  return Math.max(0, Math.min(2, p));
}

class Sfx {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }

  _ac() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  _tone(freq, start, dur, gain, type) {
    const ac = this._ac();
    if (!ac) return;
    const t0 = ac.currentTime + start;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  _slide(f1, f2, start, dur, gain) {
    const ac = this._ac();
    if (!ac) return;
    const t0 = ac.currentTime + start;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(f1, t0);
    osc.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  correct() {
    this._tone(784, 0, 0.14, 0.16, "triangle");
    this._tone(1046, 0.09, 0.18, 0.14, "triangle");
    this._tone(1318, 0.18, 0.3, 0.11, "sine");
  }

  wrong() {
    // deliberately gentle — a soft "hmm", not a buzzer
    this._tone(330, 0, 0.16, 0.12, "sine");
    this._tone(262, 0.13, 0.28, 0.1, "sine");
  }

  star() {
    this._tone(1568, 0, 0.09, 0.1, "sine");
    this._tone(2093, 0.06, 0.14, 0.08, "sine");
  }

  whoosh() {
    const ac = this._ac();
    if (!ac) return;
    const t0 = ac.currentTime;
    const buf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(400, t0);
    bp.frequency.exponentialRampToValueAtTime(2200, t0 + 0.35);
    bp.Q.value = 1.2;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.12, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
    src.connect(bp).connect(g).connect(ac.destination);
    src.start(t0);
  }

  crowd(seconds, level) {
    const ac = this._ac();
    if (!ac) return;
    const dur = seconds || 1.6;
    const t0 = ac.currentTime;
    const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1100;
    bp.Q.value = 0.7;
    const g = ac.createGain();
    const peak = (level || 1) * 0.14;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.18);
    g.gain.setValueAtTime(peak, t0 + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    // a slow wobble so it breathes like a real crowd
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = 3.5;
    lfoGain.gain.value = peak * 0.35;
    lfo.connect(lfoGain).connect(g.gain);
    src.connect(bp).connect(g).connect(ac.destination);
    src.start(t0);
    lfo.start(t0);
    lfo.stop(t0 + dur);
  }

  whistle() {
    this._slide(1800, 2600, 0, 0.18, 0.1);
    this._slide(2600, 1900, 0.2, 0.22, 0.09);
  }

  fanfare(tier) {
    const melodies = {
      gold: [523, 659, 784, 1046, 1318],
      silver: [523, 659, 784, 988],
      bronze: [440, 554, 659],
      ribbon: [392, 494]
    };
    const notes = melodies[tier] || melodies.ribbon;
    notes.forEach((f, i) => this._tone(f, i * 0.13, 0.42, 0.15, "triangle"));
    this.crowd(2.2, tier === "gold" ? 1.3 : 1);
  }
}
