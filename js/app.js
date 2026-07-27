/* Screens, game loop, avatar studio, and the grown-ups dashboard. */

/* Bump this by hand whenever a meaningfully-shipped change goes out. There's
   no build step and no git-derived build number here on purpose (same
   philosophy as everywhere else in this repo), so this is the one manual
   signal for "which copy of the app is this" when opening the page on a
   given device — shown in the corner badge (index.html #app-version) and in
   the Grown-Ups dashboard's Settings tab. Not the same thing as
   SAVE_VERSION in store.js, which versions the save-file *shape*, not the
   code. */
const APP_VERSION = "1.0.0";

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

const speaker = new Speaker();
const sfx = new Sfx();

let arena = null;   // { gymnast, animator }
let studio = null;  // { gymnast, animator }
let lettersArena = null; // { gymnast, animator } — the early-learner track's own stage, see startLetterRound()
let languageArena = null; // { gymnast, animator } — "Language Play", see startLanguageRound() (HANDOFF-SPEECH-AND-LANGUAGE.md)
let session = null;
let letterSession = null;
let languageSession = null;
let newProfileStage = "speller"; // set by the picker in renderProfiles(), read when a profile is created
let parentsUnlocked = false;
// true only in the ?code=XXXXXX remote-view boot path (see initRemoteView) —
// a parent looking at a synced profile from another device, read-only,
// never able to write anything back to it
let remoteReadOnly = false;

/* ============================================================
   boot
   ============================================================ */

function init() {
  $("#app-version").textContent = "v" + APP_VERSION;

  const remoteCode = new URLSearchParams(location.search).get("code");
  if (remoteCode) return initRemoteView(remoteCode);

  Store.load();
  applyProfileSettings();

  buildCrowd();
  buildJudges();

  // y is chosen so the rounded end of the shin stroke — not the bare ankle
  // joint — lands on the mat's top edge at 312 once zoom is applied
  const aG = new Gymnast($("#arena-gymnast"), { x: 350, y: 251, zoom: 1.2 });
  // bounds are pre-zoom, so keep them well inside 0..700 or she scales off-stage
  arena = { gymnast: aG, animator: new Animator(aG, { min: 170, max: 530 }) };
  arena.gymnast.setLook(Store.data.look);
  arena.animator.onSkillStart = (skill) => announceSkill(skill);
  arena.animator.idle();

  const sG = new Gymnast($("#studio-gymnast"), { x: 350, y: 250, zoom: 1.25 });
  studio = { gymnast: sG, animator: new Animator(sG, { min: 340, max: 360 }) };
  studio.gymnast.setLook(Store.data.look);
  studio.animator.idle();

  // stationary, like the studio figure — the letters track never needs
  // travel, so it borrows the same "lock her in place" bounds trick
  const lG = new Gymnast($("#letters-gymnast"), { x: 350, y: 250, zoom: 1.25 });
  lettersArena = { gymnast: lG, animator: new Animator(lG, { min: 340, max: 360 }) };
  lettersArena.gymnast.setLook(Store.data.look);
  lettersArena.animator.idle();

  // same "stationary, like the studio figure" trick as lettersArena above —
  // Language Play never needs travel either
  const gG = new Gymnast($("#language-gymnast"), { x: 350, y: 250, zoom: 1.25 });
  languageArena = { gymnast: gG, animator: new Animator(gG, { min: 340, max: 360 }) };
  languageArena.gymnast.setLook(Store.data.look);
  languageArena.animator.idle();

  wireNav();
  wireSetup();
  wireGame();
  wireStudio();
  wireLetters();
  wireLanguage();
  wireVoice();
  wireProfiles();
  wireParents();
  refreshHome();

  if (Store.firstRun) showScreen("profiles");

  // opportunistic and fire-and-forget — no-ops instantly if this profile is
  // set to play offline only, and silently does nothing if there's no
  // network or no sync server, so the offline folder copy of this game is
  // unaffected. Store.load() already auto-provisioned a code for every
  // profile in the file if one didn't exist yet — this is just the first
  // real push/pull for whichever one is active on this device.
  Store.reconcileSync();
}

/* A parent viewing a synced profile from another device, via a link like
   spelltumble.sororlab.dev/?code=ABC123 — read-only, no local save touched,
   no math-question gate (having the code is already the credential). Reuses
   the same dashboard render functions as the local Grown-Ups dashboard;
   pinButtons()/wirePinButtons() check `remoteReadOnly` themselves so nothing
   here can write back to the fetched profile. */
async function initRemoteView(code) {
  remoteReadOnly = true;
  try {
    const res = await fetch(`/api/profiles/${code}`);
    if (!res.ok) throw new Error("not found");
    const { snapshot } = await res.json();
    const profile = JSON.parse(snapshot);
    Store.file = { v: 2, activeId: profile.id, order: [profile.id], profiles: { [profile.id]: profile } };
    Store.data = profile;
  } catch {
    document.body.innerHTML =
      '<div class="card" style="max-width:480px;margin:60px auto;text-align:center">' +
      "<h2>Can't load this view</h2>" +
      '<p class="muted">The code may be wrong, or the sync server isn\'t reachable right now.</p></div>';
    return;
  }

  wireParents();
  parentsUnlocked = true;
  $$(".tab").forEach((t) => {
    if (!["progress", "words"].includes(t.dataset.tab)) t.style.display = "none";
  });
  renderParents();
  showScreen("parents");
  const back = $('#screen-parents [data-go="home"]');
  if (back) back.style.display = "none";
}

/* Everything that has to follow the active player when profiles are switched. */
function applyProfileSettings() {
  const s = Store.data.settings;
  speaker.enabled = s.speech;
  sfx.enabled = s.sfx;
  speaker.applyProfile(s);
  // installed voices usually appear a beat after first paint
  setTimeout(() => speaker.applyProfile(Store.data.settings), 700);
  if (arena) arena.gymnast.setLook(Store.data.look);
  if (studio) studio.gymnast.setLook(Store.data.look);
  if (lettersArena) lettersArena.gymnast.setLook(Store.data.look);
  if (languageArena) languageArena.gymnast.setLook(Store.data.look);
  document.title = `${Store.data.name}'s Spell & Tumble Championship`;
  // every player keeps their own day streak, so this follows the switch —
  // but skipped for a still-unclaimed firstRun placeholder: registerVisit()
  // persists (it calls Store.save()), and running it before she's even typed
  // a name would silently write that placeholder to localStorage, turning a
  // page refresh on the name screen into an unwanted "Player 1" login.
  if (!Store.firstRun) visitInfo = Store.registerVisit();
}

function playerName() {
  return (Store.data && Store.data.name) || "Champ";
}

function buildCrowd() {
  const g = $("#crowd");
  const shirts = ["#f472b6", "#fbbf24", "#34d399", "#60a5fa", "#f87171", "#c084fc", "#fb923c", "#a3e635"];
  let out = "";
  // three rows only: a fourth pushed the stands down far enough that her head
  // overlapped the audience instead of a clean wall
  for (let row = 0; row < 3; row++) {
    const y = 78 + row * 32;
    const step = 40 - row * 2;
    for (let x = 14; x < 700; x += step) {
      const jx = x + (row % 2) * 14 + Math.random() * 8 - 4;
      const c = shirts[Math.floor(Math.random() * shirts.length)];
      const delay = (Math.random() * 2).toFixed(2);
      out += `<g class="crowd-person" style="animation-delay:${delay}s">
                <rect x="${jx - 9}" y="${y}" width="18" height="20" rx="6" fill="${c}" opacity=".85"/>
                <circle cx="${jx}" cy="${y - 4}" r="7" fill="#f8d3b8" opacity=".8"/>
              </g>`;
    }
    out += `<rect x="0" y="${y + 20}" width="700" height="7" fill="#241e5c" opacity=".85"/>`;
  }
  g.innerHTML = out;
}

function buildJudges() {
  const g = $("#judge-heads");
  g.innerHTML = [46, 89, 132]
    .map(
      (x, i) => `<g class="judge-figure" data-judge="${i}">
        <circle cx="${x}" cy="266" r="9" fill="#f8d3b8"/>
        <rect x="${x - 10}" y="275" width="20" height="14" rx="4" fill="#1f2937"/>
      </g>`
    )
    .join("");
}

/* ============================================================
   navigation
   ============================================================ */

function showScreen(name) {
  $$(".screen").forEach((s) => s.classList.toggle("active", s.id === "screen-" + name));
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (name !== "studio") clearPreview(); // never carry a try-on out of the studio
  if (name !== "letters" && letterSession) { speaker.cancel(); letterSession = null; }
  if (name !== "language" && languageSession) { speaker.cancel(); languageSession = null; }
  if (name === "studio") refreshStudio();
  if (name === "home") refreshHome();
  if (name === "voice") renderVoice();
  if (name === "profiles") renderProfiles();
}

function wireNav() {
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-go]");
    if (!el) return;
    const dest = el.dataset.go;
    if (dest === "setup") openSetup(el.dataset.mode || Store.data.settings.mode);
    else if (dest === "letters") startLetterRound();
    else if (dest === "language-pronoun") startLanguageRound("pronoun");
    else if (dest === "language-sound") startLanguageRound("sound");
    else showScreen(dest);
  });

  $("#btn-parents").addEventListener("click", () => {
    showScreen("parents");
    renderParents();
  });
}

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2700);
}

/* ============================================================
   "what am I saving for"
   ============================================================ */

/* An abstract star balance is hard to want. This turns it into one named thing
   that is visibly getting closer: whatever she pinned in the studio, or failing
   that the cheapest item still out of reach, so there is always a near goal. */
function nextGoal() {
  const stars = Store.data.stars;
  const row = (slot, item, pinned) => ({
    slot,
    item,
    pinned,
    cost: item.cost,
    have: stars,
    short: Math.max(0, item.cost - stars),
    pct: item.cost > 0 ? Math.max(0, Math.min(1, stars / item.cost)) : 1
  });

  const g = Store.data.goal;
  if (g && CATALOG[g.slot]) {
    const item = CATALOG[g.slot].items.find((i) => i.id === g.id);
    if (item && !Store.isOwned(g.slot, g.id)) return row(g.slot, item, true);
  }

  let cheapestLocked = null;
  let cheapestUnowned = null;
  for (const slot of Object.keys(CATALOG)) {
    for (const item of CATALOG[slot].items) {
      if (item.cost <= 0 || Store.isOwned(slot, item.id)) continue;
      if (!cheapestUnowned || item.cost < cheapestUnowned.item.cost) cheapestUnowned = { slot, item };
      if (item.cost <= stars) continue;
      if (!cheapestLocked || item.cost < cheapestLocked.item.cost) cheapestLocked = { slot, item };
    }
  }
  const pick = cheapestLocked || cheapestUnowned;
  return pick ? row(pick.slot, pick.item, false) : null;
}

/* Paints the goal into a container. Rebuilding the markup would restart the
   bar's CSS width transition, and in the HUD this runs after every word — so
   while the goal is the same item we patch the numbers in place and let the
   fill actually slide. */
function paintGoal(el, opts) {
  if (!el) return;
  const o = opts || {};
  const g = nextGoal();

  if (!g) {
    el.innerHTML = `<div class="goal done">✨ You have unlocked <b>every single thing</b>. Superstar.</div>`;
    el.dataset.goalKey = "";
    return;
  }

  const key = g.slot + ":" + g.item.id + (o.compact ? ":c" : "");
  const ready = g.short === 0;
  // a full bar reading "34 / 20" looks like a mistake, so cap the numerator
  const have = Math.min(g.have, g.cost);
  const sub = ready
    ? "You can buy it right now — head to the studio! ✨"
    : `${g.short} more ${g.short === 1 ? "star" : "stars"} to go`;

  if (el.dataset.goalKey === key) {
    const box = el.firstElementChild;
    box.classList.toggle("ready", ready);
    $(".goal-count", box).textContent = `${have} / ${g.cost} ⭐`;
    $(".goal-bar i", box).style.width = (g.pct * 100).toFixed(1) + "%";
    const subEl = $(".goal-sub", box);
    if (subEl) subEl.textContent = sub;
    return;
  }

  el.dataset.goalKey = key;
  el.innerHTML = `<div class="goal${ready ? " ready" : ""}">
      <div class="goal-top">
        <span class="goal-label">${g.pinned ? "🎯 Saving for" : "Next unlock"}</span>
        <b>${escapeHtml(g.item.name)}</b>
        <span class="spacer"></span>
        <span class="goal-count">${have} / ${g.cost} ⭐</span>
      </div>
      <div class="goal-bar"><i style="width:${(g.pct * 100).toFixed(1)}%"></i></div>
      ${o.compact ? "" : `<div class="goal-sub">${sub}</div>`}
    </div>`;
}

/* ============================================================
   home
   ============================================================ */

/* What registerVisit() said when this player became active, so the home screen
   can say something about her coming back. */
let visitInfo = null;

function welcomeHtml() {
  const v = Store.data.visit;
  const who = escapeHtml(playerName());
  if (!v || !v.dayStreak) return "";
  if (v.dayStreak > 1) {
    const tail = Store.dailyBonusDue()
      ? "Finish a routine today for a bonus ⭐."
      : "Today's bonus is already in the bank ⭐.";
    return `<div class="welcome streaky">🔥 <b>${v.dayStreak} days in a row</b>, ${who}! ${tail}</div>`;
  }
  if (visitInfo && visitInfo.gap > 1) {
    return `<div class="welcome">👋 Welcome back, ${who} — the crowd missed you. Let's start a new streak!</div>`;
  }
  return "";
}

function refreshHome() {
  $("#home-title").textContent = `${playerName()}'s Spell & Tumble Championship`;
  $("#home-player").textContent = playerName();
  $("#home-stars").textContent = Store.data.stars;
  $("#home-welcome").innerHTML = welcomeHtml();
  paintGoal($("#home-goal"));
  // which tiles show depends on stage, not word-list grade — see
  // HANDOFF-EARLY-LEARNER.md. The class only toggles visibility in CSS,
  // nothing here rebuilds the tile markup.
  const grid = $(".home-grid");
  if (grid) grid.classList.toggle("explorer", Store.data.stage === "explorer");
  const m = Store.data.medals;
  const b = Store.data.best;
  const parts = [];
  if (m.gold) parts.push(`🥇 <b>${m.gold}</b>`);
  if (m.silver) parts.push(`🥈 <b>${m.silver}</b>`);
  if (m.bronze) parts.push(`🥉 <b>${m.bronze}</b>`);
  if (m.ribbon) parts.push(`🎀 <b>${m.ribbon}</b>`);
  if (b.score) parts.push(`Best score <b>${b.score.toFixed(1)}</b>`);
  if (b.streak) parts.push(`Best streak <b>${b.streak}</b>`);
  $("#home-trophies").innerHTML = parts.length
    ? parts.join("&nbsp;&nbsp;·&nbsp;&nbsp;")
    : "No medals yet — your first one is waiting! 🎀";
}

/* ============================================================
   profiles
   ============================================================ */

function wireProfiles() {
  $("#btn-switch-player").addEventListener("click", () => {
    Store.firstRun = false;
    showScreen("profiles");
  });

  $("#profile-list").addEventListener("click", (e) => {
    const card = e.target.closest("[data-profile]");
    if (!card) return;
    Store.switchProfile(card.dataset.profile);
    applyProfileSettings();
    sfx.star();
    toast(`Hi ${playerName()}! 👋`);
    showScreen("home");
  });

  $("#profile-new").addEventListener("click", (e) => {
    if (!e.target.closest("#btn-profile-create")) return;
    const input = $("#profile-name");
    const name = input.value.trim();
    if (!name) {
      input.focus();
      toast("Type a name first.");
      return;
    }
    if (Store.firstRun) {
      // the blank first-run profile gets named rather than duplicated
      Store.renameProfile(Store.file.activeId, name);
      Store.setStage(newProfileStage);
      Store.firstRun = false;
    } else {
      const p = Store.createProfile(name, newProfileStage);
      Store.switchProfile(p.id);
    }
    applyProfileSettings();
    sfx.fanfare("bronze");
    toast(`Welcome, ${name}! ⭐`);
    showScreen("home");
  });

  // Only reachable on the first-run screen (see renderProfiles()) — linking
  // here replaces the still-unclaimed placeholder profile, which is exactly
  // what a brand-new device should do with an existing profile's code.
  // Elsewhere (adding a second player on a device that already has real
  // profiles) this button doesn't exist, since linking there would silently
  // overwrite whichever profile happens to be active — a much more
  // surprising thing to do from an "add a player" flow.
  $("#profile-new").addEventListener("click", async (e) => {
    if (!e.target.closest("#btn-profile-link")) return;
    const code = $("#profile-link-code").value.trim().toUpperCase();
    if (!code) return toast("Type a code first.");
    const ok = await Store.linkWithCode(code);
    if (ok) {
      Store.firstRun = false; // the placeholder is now a real, claimed profile
      applyProfileSettings();
      sfx.fanfare("bronze");
      toast(`Welcome back, ${playerName()}! ⭐`);
      showScreen("home");
    } else {
      toast("Couldn't find that code — check it and try again.");
    }
  });
}

function renderProfiles() {
  const first = Store.firstRun;
  $("#profiles-title").textContent = first ? "Welcome! What's your name?" : "Who's spelling today?";
  $("#profiles-sub").textContent = first
    ? "Your stars, medals and avatar are all saved under your name."
    : "Pick your name to load your stars, medals and avatar.";

  $("#profile-list").innerHTML = first
    ? ""
    : Store.profiles()
        .map((p) => {
          const m = p.medals || {};
          const badges = [
            m.gold ? `🥇${m.gold}` : "", m.silver ? `🥈${m.silver}` : "",
            m.bronze ? `🥉${m.bronze}` : "", m.ribbon ? `🎀${m.ribbon}` : ""
          ].filter(Boolean).join(" ");
          const active = p.id === Store.file.activeId;
          const acc = p.stats && p.stats.attempts ? Math.round((p.stats.correct / p.stats.attempts) * 100) + "% accuracy" : "no words yet";
          return `<button class="voice-card" data-profile="${p.id}" aria-pressed="${active}">
              <span class="emoji">${active ? "⭐" : "👤"}</span>
              <span><b>${escapeHtml(p.name)}</b>
                <small>${p.stars} stars · ${acc}</small>
                ${badges ? `<span class="using">${badges}</span>` : ""}
              </span></button>`;
        })
        .join("");

  $("#profile-new").innerHTML = `
    <div class="field" style="margin-top:${first ? 0 : 16}px;margin-bottom:14px">
      <label>What kind of player?</label>
      <div class="choices" id="profile-stage-choice">
        <button type="button" class="choice" data-stage="speller" aria-pressed="true">
          <span class="emoji">🎀</span><b>Big Kid</b><small>Reading &amp; spelling words</small></button>
        <button type="button" class="choice" data-stage="explorer" aria-pressed="false">
          <span class="emoji">🔤</span><b>Little Learner</b><small>Letters &amp; sounds</small></button>
      </div>
    </div>
    <div class="slider-row">
      <label for="profile-name">${first ? "Your name" : "New player"}</label>
      <input type="text" class="text-line" id="profile-name" maxlength="18"
             placeholder="Type a name" style="flex:1 1 200px" autocomplete="off">
      <button class="btn" id="btn-profile-create">${first ? "Let's go! 🎀" : "＋ Add player"}</button>
    </div>
    ${first ? "" : '<div class="row center" style="margin-top:10px"><button class="btn ghost small" data-go="home">← Back</button></div>'}
    ${
      first
        ? `<div class="field" style="margin-top:18px;border-top:1px solid var(--line,#e5e5e5);padding-top:14px">
             <label>Already playing on another device?</label>
             <p class="muted" style="font-size:13px;margin:2px 0 8px">
               Bring that profile here with its code, instead of starting a new one.</p>
             <div class="row">
               <input type="text" class="text-line" id="profile-link-code" maxlength="6"
                      placeholder="ABC123" style="width:140px;text-transform:uppercase">
               <button class="btn small ghost" id="btn-profile-link">Link this device</button>
             </div>
           </div>`
        : ""
    }`;

  // resets on every render — a new profile always starts from "Big Kid"
  // pre-selected, so an existing parent adding a second, older player never
  // has to touch this to get the experience they already expect
  newProfileStage = "speller";
  $("#profile-stage-choice").addEventListener("click", (e) => {
    const b = e.target.closest(".choice");
    if (!b) return;
    newProfileStage = b.dataset.stage;
    $$(".choice", $("#profile-stage-choice")).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  });

  const input = $("#profile-name");
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("#btn-profile-create").click();
  });
  if (first) input.focus();
}

/* ============================================================
   coach's voice
   ============================================================ */

function wireVoice() {
  $("#voice-presets").addEventListener("click", (e) => {
    const card = e.target.closest("[data-preset]");
    if (!card) return;
    const preset = VOICE_PRESET_BY_ID[card.dataset.preset];
    Store.setSetting("voicePreset", preset.id);
    if (preset.id !== "custom") {
      Store.setSetting("voiceRate", preset.rate);
      Store.setSetting("voicePitch", preset.pitch);
      Store.setSetting("voiceName", speaker.voiceForPreset(preset));
    }
    speaker.applyProfile(Store.data.settings);
    renderVoice();
    speaker.say(`Hi ${playerName()}! I'm ${preset.name}. Let's spell!`);
  });

  $("#voice-tune").addEventListener("input", (e) => {
    const el = e.target;
    if (el.id === "voice-rate") Store.setSetting("voiceRate", Number(el.value));
    else if (el.id === "voice-pitch") Store.setSetting("voicePitch", Number(el.value));
    else return;
    Store.setSetting("voicePreset", "custom");
    speaker.applyProfile(Store.data.settings);
    updateVoiceReadouts();
  });

  $("#voice-tune").addEventListener("change", (e) => {
    if (e.target.id !== "voice-system") return;
    Store.setSetting("voiceName", e.target.value || null);
    Store.setSetting("voicePreset", "custom");
    speaker.applyProfile(Store.data.settings);
    renderVoice();
    speaker.say(`This is how I sound, ${playerName()}.`);
  });

  $("#btn-voice-test").addEventListener("click", () => {
    speaker.prompt("cartwheel", "She did a beautiful cartwheel.");
  });
}

function updateVoiceReadouts() {
  const s = Store.data.settings;
  const rate = $("#out-rate");
  const pitch = $("#out-pitch");
  if (rate) rate.textContent = s.voiceRate < 0.75 ? "slow" : s.voiceRate > 1.1 ? "fast" : "normal";
  if (pitch) pitch.textContent = s.voicePitch < 0.8 ? "low" : s.voicePitch > 1.25 ? "high" : "normal";
}

function renderVoice() {
  const s = Store.data.settings;
  const voices = speaker.listVoices();

  $("#voice-warning").innerHTML = !speaker.supported
    ? `<div class="notice warn">This browser can't speak out loud, so words will flash on screen instead.
       Chrome, Edge and Safari all support reading aloud.</div>`
    : !voices.length
    ? `<div class="notice warn">No voices have loaded yet. Try reloading the page — some browsers
       fetch them a moment after startup.</div>`
    : "";

  $("#voice-presets").innerHTML = VOICE_PRESETS.map((p) => {
    const picked = s.voicePreset === p.id;
    const using = p.id === "custom" ? s.voiceName || "system default" : speaker.voiceForPreset(p) || "system default";
    return `<button class="voice-card" data-preset="${p.id}" aria-pressed="${picked}">
        <span class="emoji">${p.emoji}</span>
        <span><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.blurb)}</small>
          <span class="using">${picked ? "▶ " : ""}uses: ${escapeHtml(using)}</span></span>
      </button>`;
  }).join("");

  $("#voice-tune").innerHTML = `
    <h3 style="margin-top:6px">Fine tune</h3>
    <div class="slider-row">
      <label for="voice-system">Voice</label>
      <select class="select" id="voice-system" style="flex:1 1 220px">
        <option value="">Automatic</option>
        ${voices.map((v) => `<option value="${escapeHtml(v.name)}" ${s.voiceName === v.name ? "selected" : ""}>${escapeHtml(v.name)}</option>`).join("")}
      </select>
    </div>
    <div class="slider-row">
      <label for="voice-rate">Speed</label>
      <input type="range" id="voice-rate" min="0.5" max="1.4" step="0.02" value="${s.voiceRate}">
      <output id="out-rate"></output>
    </div>
    <div class="slider-row">
      <label for="voice-pitch">Pitch</label>
      <input type="range" id="voice-pitch" min="0.3" max="1.8" step="0.02" value="${s.voicePitch}">
      <output id="out-pitch"></output>
    </div>`;
  updateVoiceReadouts();
}

/* ============================================================
   setup screen
   ============================================================ */

let setupChoice = { mode: "practice", sport: "gym", list: "g3", length: 10 };

function openSetup(mode) {
  const s = Store.data.settings;
  setupChoice = { mode, sport: s.sport, list: s.grade, length: s.routineLength };
  $("#setup-title").textContent = mode === "competition" ? "Get ready to compete! 🏅" : "Warm up in the practice gym 🏟️";
  $("#setup-sub").textContent =
    mode === "competition"
      ? "Three judges are watching. Every word you spell adds a skill to your routine."
      : "No judges, no pressure. Spell as many as you like and build your streak.";
  $("#field-length").style.display = mode === "competition" ? "" : "none";
  renderGradeChoices();
  syncSetupButtons();
  showScreen("setup");
}

function renderGradeChoices() {
  const wrap = $("#choose-grade");
  const built = GRADE_ORDER.map((key) => {
    const l = WORD_LISTS[key];
    return `<button class="choice" data-list="${key}"><b>${l.label}</b><small>${l.blurb}</small></button>`;
  });
  const custom = Store.data.customLists.map(
    (l) =>
      `<button class="choice" data-list="${l.id}"><span class="emoji">📝</span><b>${escapeHtml(l.name)}</b><small>${l.words.length} words</small></button>`
  );
  wrap.innerHTML = built.concat(custom).join("");
}

function syncSetupButtons() {
  $$("#choose-sport .choice").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.sport === setupChoice.sport))
  );
  $$("#choose-grade .choice").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.list === setupChoice.list))
  );
  $$("#choose-length .choice").forEach((b) =>
    b.setAttribute("aria-pressed", String(Number(b.dataset.length) === setupChoice.length))
  );
}

function wireSetup() {
  $("#choose-sport").addEventListener("click", (e) => {
    const b = e.target.closest(".choice");
    if (!b) return;
    setupChoice.sport = b.dataset.sport;
    Store.setSetting("sport", b.dataset.sport);
    syncSetupButtons();
  });
  $("#choose-grade").addEventListener("click", (e) => {
    const b = e.target.closest(".choice");
    if (!b) return;
    setupChoice.list = b.dataset.list;
    Store.setSetting("grade", b.dataset.list);
    syncSetupButtons();
  });
  $("#choose-length").addEventListener("click", (e) => {
    const b = e.target.closest(".choice");
    if (!b) return;
    setupChoice.length = Number(b.dataset.length);
    Store.setSetting("routineLength", setupChoice.length);
    syncSetupButtons();
  });
  $("#btn-start").addEventListener("click", () => startSession(setupChoice));
}

/* ============================================================
   word queue
   ============================================================ */

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Roughly a third of a routine is drawn from words she has missed before,
   so practice keeps circling back to the hard ones. */
function buildQueue(list, count) {
  const pool = list.words;
  const { hard: hardPairs, rest: restPairs } = Store.selectReviewPool(list, Store.data.prefs, Store.data.stats.words);
  const hard = shuffle(hardPairs);
  const rest = shuffle(restPairs);
  const wantHard = Math.min(hard.length, Math.floor(count * Store.data.prefs.reviewMix));
  const picked = hard.slice(0, wantHard).concat(rest.slice(0, count - wantHard));
  return shuffle(picked.length ? picked : shuffle(pool).slice(0, count));
}

/* ============================================================
   game session
   ============================================================ */

function startSession(cfg) {
  const list = Store.getList(cfg.list);
  const isComp = cfg.mode === "competition";
  const queue = isComp ? buildQueue(list, cfg.length) : shuffle(list.words);
  session = {
    mode: cfg.mode,
    sport: cfg.sport,
    listKey: cfg.list,
    listLabel: list.label,
    list,
    queue,
    index: 0,
    // a short custom list can be smaller than the requested routine
    total: isComp ? Math.min(cfg.length, queue.length) : 0,
    correct: 0,
    wrong: 0,
    hints: 0,        // hint presses
    hintedWords: 0,  // words that took at least one — hints can be pressed twice
    score: 0,
    stars: 0,
    streak: 0,
    bestStreak: 0,
    marks: [],
    results: [],
    lastSkillId: null,
    startTs: Date.now(),
    phase: "idle",
    hintLevel: 0,
    wordStart: 0,
    tries: 0
  };

  Store.setSetting("mode", cfg.mode);
  $("#hud-progress-wrap").style.display = isComp ? "" : "none";
  $("#btn-quit").textContent = isComp ? "Give up" : "Finish";
  arena.gymnast.setLook(Store.data.look);
  arena.animator.reset();
  showScreen("game");

  if (!speaker.supported) {
    showFeedback("bad", "This browser can't read words out loud, so the word will flash on screen instead. Watch closely!");
  }
  sfx.whistle();
  setTimeout(() => nextWord(), 700);
}

function currentWord() {
  if (session.mode === "practice" && session.index >= session.queue.length) {
    session.queue = session.queue.concat(shuffle(session.list.words));
  }
  return session.queue[session.index % session.queue.length];
}

function nextWord() {
  if (session.mode === "competition" && session.index >= session.total) {
    finishSession();
    return;
  }
  const [word, sentence] = currentWord();
  session.phase = "spelling";
  session.hintLevel = 0;
  session.tries = 0;
  session.wordStart = performance.now();
  session.usedHint = false;

  hideFeedback();
  $("#mc-choices").innerHTML = "";
  $("#mc-choices").style.display = "none";
  $("#spell-form").style.display = "";
  $("#spell-input").value = "";
  $("#spell-input").disabled = false;
  $("#btn-submit").disabled = false;
  $("#btn-submit").textContent = "Spell it! ✓";
  $("#btn-hint").disabled = false;
  $("#btn-hint").textContent = "💡 Hint";
  renderBoxes();
  updateHud();
  $("#spell-hint").innerHTML = `Word <em>${session.index + 1}</em>${
    session.mode === "competition" ? ` of <em>${session.total}</em>` : ""
  } — listen, then type what you hear.`;
  $("#spell-input").focus();

  if (Store.data.settings.autoSpeak) speakCurrent();
  if (!speaker.supported || !speaker.enabled) revealWordBriefly(word);
}

/* The one way to move to the next word. Everything that can end a word — the
   Next button, the skill animation finishing, the skip link, the fix-it timer —
   funnels through here, and it no-ops once a word has already been left. */
function advance() {
  if (!session) return;
  if (session.phase !== "reveal" && session.phase !== "fixing") return;
  session.phase = "advancing";
  session.index++;
  nextWord();
}

function speakCurrent(opts) {
  const [word, sentence] = currentWord();
  speaker.prompt(word, sentence, opts || {});
}

function revealWordBriefly(word) {
  const hint = $("#spell-hint");
  const original = hint.innerHTML;
  hint.innerHTML = `Spell: <em style="font-size:1.5em;letter-spacing:.1em">${escapeHtml(word)}</em>`;
  setTimeout(() => {
    if (session && session.phase === "spelling") hint.innerHTML = original;
  }, 2600);
}

function updateHud() {
  $("#hud-score").textContent = session.score;
  $("#hud-stars").textContent = Store.data.stars;
  const pill = $("#hud-streak");
  pill.textContent = `Streak ${session.streak}`;
  pill.classList.toggle("hot", session.streak >= 3);
  if (session.mode === "competition") {
    $("#hud-progress").textContent = `${Math.min(session.index + 1, session.total)}/${session.total}`;
  }
  // a miss is a hollow "still learning" dot, never a red mark, and it fills in
  // gold once she has typed the word correctly — the row records progress, not
  // failure, because it sits on screen for the whole session
  const dots = session.marks
    .slice(-14)
    .map((m) => `<i class="${m === "ok" ? "on" : m === "fixed" ? "fixed" : "learning"}"></i>`)
    .join("");
  $("#hud-dots").innerHTML = dots;
  paintGoal($("#hud-goal"), { compact: true });
}

/* ---- letter boxes ---- */

function renderBoxes(opts) {
  const o = opts || {};
  const [word] = currentWord();
  const typed = ($("#spell-input").value || "").toLowerCase();
  const box = $("#letter-boxes");
  // the right/wrong highlight is the point of this feature, so it always
  // shows regardless of the parent's "reveal word length" preference
  const showSlots = Store.data.settings.letterBoxes || o.marks;

  if (!showSlots) {
    box.innerHTML = typed
      .split("")
      .map((ch) => `<span class="lb filled">${escapeHtml(ch)}</span>`)
      .join("");
    return;
  }

  const len = Math.max(word.length, typed.length);
  let html = "";
  for (let i = 0; i < len; i++) {
    let cls = "lb";
    let ch = "";
    if (o.marks) {
      // never fall back to the answer letter here — tries 1/2 must not leak
      // letters she didn't actually type
      ch = typed[i] || "";
      cls += o.marks[i] === true ? " ok" : o.marks[i] === false ? " bad" : "";
    } else if (typed[i]) {
      ch = typed[i];
      cls += " filled";
    } else if (i < session.hintLevel && word[i]) {
      ch = word[i];
      cls += " filled";
    }
    html += `<span class="${cls}">${escapeHtml(ch)}</span>`;
  }
  box.innerHTML = html;
}

/* ---- submitting ---- */

function wireGame() {
  $("#spell-form").addEventListener("submit", (e) => {
    e.preventDefault();
    submitAnswer();
  });
  $("#spell-input").addEventListener("input", () => {
    if (session && session.phase === "spelling") renderBoxes();
  });
  $("#btn-say").addEventListener("click", () => {
    if (!session) return;
    if (session.phase === "spelling") speakCurrent();
    else speaker.say(currentWord()[0]);
  });
  $("#btn-slow").addEventListener("click", () => {
    if (!session) return;
    speaker.prompt(currentWord()[0], null, { slow: true, wordOnly: true });
  });
  $("#btn-hint").addEventListener("click", useHint);
  $("#btn-quit").addEventListener("click", () => {
    if (session && session.mode === "competition" && session.index < session.total) {
      if (!confirm("Leave the competition early? Your routine won't be scored.")) return;
      session = null;
      speaker.cancel();
      showScreen("home");
      return;
    }
    finishSession();
  });
  $("#btn-again").addEventListener("click", () => {
    const last = Store.data.settings;
    startSession({ mode: last.mode, sport: last.sport, list: last.grade, length: last.routineLength });
  });
}

function useHint() {
  if (!session || session.phase !== "spelling") return;
  const [word] = currentWord();
  if (session.hintLevel >= word.length - 1) {
    speaker.spellOut(word);
    return;
  }
  session.hintLevel++;
  session.hints++;
  session.usedHint = true;
  sfx.star();
  renderBoxes();
  const shown = word.slice(0, session.hintLevel);
  $("#spell-hint").innerHTML = `It starts with <em>${escapeHtml(shown.toUpperCase())}</em> …`;
  if (session.hintLevel >= word.length - 1) $("#btn-hint").textContent = "🔡 Spell it out";
}

function submitAnswer() {
  if (!session) return;
  if (session.phase !== "spelling") return;

  const [word, sentence] = currentWord();
  const typed = $("#spell-input").value.trim().toLowerCase();
  if (!typed) {
    $("#spell-input").focus();
    return;
  }

  const ms = performance.now() - session.wordStart;
  const right = typed === word.toLowerCase();
  session.tries++;
  speaker.cancel();

  // only the first attempt counts toward stats, the dot row, and the recap —
  // tries 2/3 only ever upgrade that same dot to "fixed" below
  if (session.tries === 1) {
    Store.recordAttempt(word, right, ms, session.usedHint);
    session.marks.push(right ? "ok" : "learning");
    session.results.push({ word, typed, right, ms, hint: session.usedHint });
    if (session.usedHint) session.hintedWords++;
  }

  const marks = markLetters(word, typed);
  renderBoxes({ marks });

  if (right && session.tries === 1) {
    session.phase = "reveal";
    $("#btn-submit").disabled = true;
    $("#btn-hint").disabled = true;
    handleCorrect(word, ms);
  } else if (right) {
    // got there on a retry — the same modest reward a fix has always paid,
    // not the full first-try reward (points / streak / a performed skill)
    $("#btn-submit").disabled = true;
    $("#btn-hint").disabled = true;
    rewardFix(word, "retried");
  } else if (session.tries === 1) {
    handleFirstMiss(word);
  } else if (session.tries === 2) {
    promptRetry(word, 1);
  } else {
    startMultipleChoice(word);
  }

  updateHud();
}

function markLetters(word, typed) {
  const len = Math.max(word.length, typed.length);
  const marks = [];
  for (let i = 0; i < len; i++) marks.push(typed[i] === word[i]);
  return marks;
}

function handleCorrect(word, ms) {
  session.correct++;
  session.streak++;
  session.bestStreak = Math.max(session.bestStreak, session.streak);

  // Asking for a clue costs nothing — taking one away from the child who needs
  // it most is exactly backwards. Working it out unaided is a *bonus* instead,
  // so the incentive points the same way without ever being a punishment.
  const solo = !session.usedHint;
  const streakBonus = Math.min(session.streak, 6) * 2;
  const points = 10 + streakBonus + (solo ? 2 : 0);
  session.score += points;

  let stars = 2;
  if (solo) stars += 1;
  const streakStar = session.streak > 0 && session.streak % 5 === 0;
  if (streakStar) stars += 3;
  session.stars += stars;
  Store.addStars(stars);

  sfx.correct();
  arena.gymnast.setExpression("excited");

  const skill = chooseSkill(session.sport, session.streak, session.lastSkillId);
  session.lastSkillId = skill.id;

  // every third one uses her name, so it feels personal without getting cloying
  const who = escapeHtml(playerName());
  const cheers = ["Perfect!", "Yes!", "Nailed it!", "Beautiful!", "That's it!", "Wow!", "Stuck the landing!"];
  const named = [`Perfect, ${who}!`, `Go ${who}!`, `${who}, that was beautiful!`, `Nice one, ${who}!`];
  const cheer =
    session.correct % 3 === 0
      ? named[Math.floor(Math.random() * named.length)]
      : cheers[Math.floor(Math.random() * cheers.length)];

  const why = [
    solo ? "+1 ⭐ for doing it all by yourself" : null,
    streakStar ? `+3 ⭐ for ${session.streak} in a row` : null
  ].filter(Boolean).join(" · ");

  showFeedback(
    "good",
    `<b>${cheer}</b> ${escapeHtml(word)} — ⭐ +${stars}, ${points} points.<br>
     ${why ? `<span class="why">${why}</span><br>` : ""}
     <span class="muted">${escapeHtml(skill.name)}${session.streak >= 3 ? ` · ${session.streak} in a row!` : ""}</span>
     <div class="row" style="margin-top:10px"><button class="btn small teal" id="btn-next">Next word →</button></div>`
  );
  $("#btn-next").addEventListener("click", advance);

  if (skill.difficulty >= 4) sfx.whoosh();
  arena.animator.play(skill).then(() => {
    if (!session || session.phase !== "reveal") return;
    sfx.crowd(1.1, Math.min(1.4, 0.6 + skill.difficulty * 0.16));
    if (skill.difficulty >= 3) burstConfetti(skill.difficulty >= 5 ? 40 : 22);
    arena.gymnast.setExpression("happy");
    setTimeout(advance, 550);
  });
}

/* The first miss is the one that resets the streak and dings the score — a
   retry that also misses (promptRetry) doesn't pile a second penalty on top. */
function handleFirstMiss(word) {
  session.wrong++;
  session.streak = 0;
  if (session.mode === "competition") session.score = Math.max(0, session.score - 2);
  promptRetry(word, 2);
}

/* Tries 1 and 2 land here on a miss. No full reveal — the letter boxes
   (already painted green/red by markLetters in submitAnswer) are the
   teaching moment, and she gets a genuine next attempt from memory. */
function promptRetry(word, triesLeft) {
  sfx.wrong();
  arena.gymnast.setExpression("oops");
  arena.animator.play(SKILL_BY_ID.wobble).then(() => arena.gymnast.setExpression("focused"));

  const who = escapeHtml(playerName());
  const kind = [
    "So close — check the highlighted letters.",
    `Good try, ${who}! A couple of letters need another look.`,
    "Almost! Green is right, red needs work.",
    `Nice effort, ${who} — try it once more.`
  ];

  showFeedback(
    "bad",
    `<b>${kind[Math.floor(Math.random() * kind.length)]}</b><br>
     <span class="muted">${triesLeft} ${triesLeft === 1 ? "try" : "tries"} left.</span>
     <div class="row" style="margin-top:10px">
       <button class="btn small ghost" id="btn-hear-letters">🔡 Hear it again</button>
       <button class="btn small ghost" id="btn-skip">Skip ahead →</button>
     </div>`
  );

  $("#btn-hear-letters").addEventListener("click", () => speaker.say(word));
  $("#btn-skip").addEventListener("click", () => {
    session.phase = "reveal";
    advance();
  });

  $("#spell-input").value = "";
  $("#spell-input").disabled = false;
  $("#btn-submit").disabled = false;
  $("#spell-input").classList.add("shake");
  setTimeout(() => $("#spell-input").classList.remove("shake"), 420);
  $("#spell-input").focus();
}

/* The 3rd miss — recognition instead of recall, as a last scaffold before
   the word simply moves on. */
function startMultipleChoice(word) {
  session.phase = "multipleChoice";

  sfx.wrong();
  arena.gymnast.setExpression("oops");
  arena.animator.play(SKILL_BY_ID.wobble).then(() => arena.gymnast.setExpression("focused"));

  $("#spell-form").style.display = "none";
  $("#btn-hint").disabled = true;

  const others = session.list.words.map((w) => w[0]).filter((w) => w !== word);
  const options = shuffle([word, ...shuffle(others).slice(0, 3)]);

  showFeedback("bad", `<b>Let's pick it together!</b><br><span class="muted">Tap the way you hear it spelled.</span>`);

  const box = $("#mc-choices");
  box.style.display = "";
  box.innerHTML = options
    .map((opt) => `<button class="mc-option" data-word="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`)
    .join("");
  $$(".mc-option", box).forEach((btn) => btn.addEventListener("click", () => pickChoice(word, btn)));

  setTimeout(() => speaker.say(word), 400);
}

function pickChoice(word, btnEl) {
  if (session.phase !== "multipleChoice") return;
  const box = $("#mc-choices");
  $$(".mc-option", box).forEach((b) => (b.disabled = true));

  const chosen = btnEl.dataset.word;
  const right = chosen === word;
  btnEl.classList.add(right ? "mc-right" : "mc-wrong");
  if (!right) {
    const correctBtn = box.querySelector(`.mc-option[data-word="${word}"]`);
    if (correctBtn) correctBtn.classList.add("mc-right");
  }

  speaker.cancel();
  if (right) {
    rewardFix(word, "multipleChoice");
  } else {
    Store.recordFixOutcome(word, "unresolved");
    arena.gymnast.setExpression("focused");
    speaker.spellOut(word);
    showFeedback(
      "bad",
      `<b>The word was <span class="answer">${escapeHtml(word)}</span></b><br>
       <span class="muted">You'll see it again soon.</span>
       <div class="row" style="margin-top:10px"><button class="btn small teal" id="btn-next">Next word →</button></div>`
    );
    $("#btn-next").addEventListener("click", advance);
    session.phase = "reveal";
    setTimeout(advance, 2200);
  }
  updateHud();
}

/* Shared "she got there in the end" reward — a retry (try 2/3) or a correct
   multiple-choice pick, never the full first-try reward. tier records *how*
   she got there, for the Word Detail tab's per-word breakdown. */
function rewardFix(word, tier) {
  Store.recordFixOutcome(word, tier);
  sfx.star();
  Store.addStars(1);
  session.stars += 1;
  // the dot for this word stops being "still learning" and becomes "learned"
  if (session.marks.length) session.marks[session.marks.length - 1] = "fixed";
  arena.gymnast.setExpression("happy");
  arena.animator.play(SKILL_BY_ID.salute);
  showFeedback(
    "good",
    `<b>Now you've got it!</b> ⭐ +1 for learning it.
     <div class="row" style="margin-top:10px"><button class="btn small teal" id="btn-next">Next word →</button></div>`
  );
  session.phase = "reveal";
  $("#btn-next").addEventListener("click", advance);
  setTimeout(advance, 1800);
}

function showFeedback(kind, html) {
  const el = $("#feedback");
  el.className = "feedback show " + kind;
  el.innerHTML = html;
}

function hideFeedback() {
  $("#feedback").className = "feedback";
  $("#feedback").innerHTML = "";
}

function announceSkill(skill) {
  if (!skill || !skill.name || skill.difficulty === 0) return;
  const el = $("#skill-name");
  el.textContent = skill.name + " " + "⭐".repeat(Math.max(1, skill.difficulty));
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
}

function burstConfetti(n, container) {
  const layer = container || $("#fx-layer");
  const colors = ["#f472b6", "#fbbf24", "#34d399", "#60a5fa", "#c084fc", "#fb7185"];
  for (let i = 0; i < n; i++) {
    const d = document.createElement("div");
    d.className = "confetti";
    d.style.left = Math.random() * 100 + "%";
    d.style.background = colors[Math.floor(Math.random() * colors.length)];
    d.style.animationDuration = 1.1 + Math.random() * 1.1 + "s";
    d.style.animationDelay = Math.random() * 0.3 + "s";
    layer.appendChild(d);
    setTimeout(() => d.remove(), 2600);
  }
}

/* ---- finishing ---- */

function judgeScores(summary) {
  const total = Math.max(1, summary.total);
  const acc = summary.correct / total;
  // words solved unaided, counted per word — the old version divided raw hint
  // *presses* by the word count, so two clues on one word could exceed 100%
  const hinted = summary.hintedWords != null ? summary.hintedWords : summary.hints;
  const soloRate = Math.max(0, Math.min(1, (total - hinted) / total));
  const streakFactor = Math.min(1, summary.bestStreak / total);
  // A bonus for solo work rather than a deduction for asking, so the score
  // never drops below what pure accuracy earned her. The floor comes down from
  // 3.2 to make room for it: bolting +0.5 onto the old formula pushed a 5-of-6
  // routine into gold, and gold should still mean a clean sweep.
  let base = 2.7 + acc * 6.0 + streakFactor * 0.8 + soloRate * 0.5;
  base = Math.max(1.5, Math.min(10, base));
  return [0, 1, 2].map((i) => {
    const jitter = (Math.random() - 0.5) * 0.5 - i * 0.02;
    return Math.max(1, Math.min(10, Math.round((base + jitter) * 10) / 10));
  });
}

function medalFor(score) {
  if (score >= 9.0) return { tier: "gold", icon: "🥇", title: "Gold Medal!" };
  if (score >= 8.0) return { tier: "silver", icon: "🥈", title: "Silver Medal!" };
  if (score >= 6.5) return { tier: "bronze", icon: "🥉", title: "Bronze Medal!" };
  return { tier: "ribbon", icon: "🎀", title: "Participation Ribbon" };
}

function finishSession() {
  if (!session) { showScreen("home"); return; }
  speaker.cancel();
  const s = session;
  const attempted = s.correct + s.wrong;

  if (attempted === 0) {
    session = null;
    showScreen("home");
    return;
  }

  const isComp = s.mode === "competition";
  const summary = {
    ts: Date.now(),
    mode: s.mode,
    sport: s.sport,
    listKey: s.listKey,
    listLabel: s.listLabel,
    total: attempted,
    correct: s.correct,
    hints: s.hints,
    hintedWords: s.hintedWords,
    bestStreak: s.bestStreak,
    ms: Date.now() - s.startTs,
    score: 0,
    medal: null
  };

  let judges = null;
  let medal = null;
  if (isComp) {
    judges = judgeScores(summary);
    const final = Math.round((judges.reduce((a, b) => a + b, 0) / judges.length) * 10) / 10;
    medal = medalFor(final);
    summary.score = final;
    summary.medal = medal.tier;
    const bonus = { gold: 25, silver: 15, bronze: 8, ribbon: 4 }[medal.tier];
    Store.addStars(bonus);
    s.stars += bonus;
  }

  // paid for finishing the first routine of the day, in either mode
  const daily = Store.claimDailyBonus();
  if (daily) {
    s.stars += daily;
    summary.dailyBonus = daily;
    summary.dayStreak = Store.data.visit.dayStreak;
  }

  Store.recordSession(summary);
  renderResults(s, summary, judges, medal);
  session = null;
  showScreen("results");
  Store.reconcileSync(); // fire-and-forget, see initRemoteView()'s comment
}

function renderResults(s, summary, judges, medal) {
  const acc = Math.round((summary.correct / summary.total) * 100);

  if (medal) {
    $("#res-medal").textContent = medal.icon;
    $("#res-title").textContent = `${playerName()} — ${medal.title}`;
    $("#res-score").textContent = summary.score.toFixed(1);
    $("#res-sub").textContent = `Final score · ${summary.correct} of ${summary.total} words · ${acc}% accuracy`;
  } else {
    $("#res-medal").textContent = acc >= 90 ? "🌟" : acc >= 70 ? "💪" : "🌱";
    $("#res-title").textContent = `Great practice, ${playerName()}!`;
    $("#res-score").textContent = acc + "%";
    $("#res-sub").textContent = `${summary.correct} of ${summary.total} words · best streak ${summary.bestStreak}`;
  }

  const jw = $("#res-judges");
  jw.innerHTML = "";
  if (judges) {
    const names = ["Judge 1", "Judge 2", "Judge 3"];
    judges.forEach((n, i) => {
      const d = document.createElement("div");
      d.className = "judge";
      d.innerHTML = `<div class="who">${names[i]}</div><div class="num">${n.toFixed(1)}</div>`;
      jw.appendChild(d);
      setTimeout(() => {
        d.classList.add("reveal");
        sfx.star();
      }, 260 + i * 320);
    });
    setTimeout(() => {
      sfx.fanfare(medal.tier);
      if (medal.tier === "gold") burstConfetti(70);
      else if (medal.tier === "silver") burstConfetti(30);
    }, 1350);
  } else {
    sfx.fanfare(acc >= 90 ? "silver" : "bronze");
  }

  $("#res-stars").textContent = s.stars;

  $("#res-daily").innerHTML = !summary.dailyBonus
    ? ""
    : summary.dayStreak > 1
    ? `<div class="welcome streaky" style="margin:10px 0 0">🔥 Day <b>${summary.dayStreak}</b> in a row —
       daily bonus <b>+${summary.dailyBonus} ⭐</b> included!</div>`
    : `<div class="welcome streaky" style="margin:10px 0 0">🔥 First routine of the day —
       daily bonus <b>+${summary.dailyBonus} ⭐</b> included! Come back tomorrow for more.</div>`;
  paintGoal($("#res-goal"));

  const recap = s.results
    .map(
      (r) => `<div class="recap-row ${r.right ? "good" : "bad"}">
        <span>${r.right ? "✅" : "📝"}</span>
        <span class="w">${escapeHtml(r.word)}</span>
        ${r.right ? "" : `<span class="typed">you wrote: ${escapeHtml(r.typed)}</span>`}
        ${r.hint ? '<span class="muted" style="font-size:13px">💡</span>' : ""}
      </div>`
    )
    .join("");
  const missed = s.results.filter((r) => !r.right).map((r) => r.word);
  $("#res-recap").innerHTML =
    `<h3>Your words</h3>${recap}` +
    (missed.length
      ? `<div class="notice warn" style="margin-top:12px">Words to practise again: <b>${missed.map(escapeHtml).join(", ")}</b></div>`
      : `<div class="notice" style="margin-top:12px">A clean sweep — every single word correct! 🎉</div>`);

  refreshHome();
}

/* ============================================================
   letter play (early-learner track — HANDOFF-EARLY-LEARNER.md)

   Deliberately its own session object and its own screen rather than a bent
   version of `session`/session.phase: that machinery is tightly wired around
   typing a whole word, and retrofitting letter-level recognition into it was
   more likely to break the existing flow than to save time building this.
   ============================================================ */

const LETTER_ROUND_LEN = 8;
const LETTER_LEVEL_LABEL = { upper: "Uppercase letters", lower: "Lowercase letters", sound: "Letter sounds" };

function currentLetterItem() {
  return LETTER_BY_ID[letterSession.queue[letterSession.index]];
}

function startLetterRound() {
  const ids = Store.selectLetterPoolForRound(LETTER_ROUND_LEN);
  letterSession = {
    level: Store.data.earlyLearner.level,
    queue: ids,
    index: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    missStreak: 0,
    bestStreak: 0,
    stars: 0,
    lastSkillId: null,
    results: [],
    firstTry: true
  };
  $("#letters-summary").style.display = "none";
  $("#letters-dots").innerHTML = "";
  lettersArena.gymnast.setLook(Store.data.look);
  showScreen("letters");
  sfx.whistle();
  setTimeout(nextLetterItem, 500);
}

function nextLetterItem() {
  if (!letterSession) return;
  if (letterSession.index >= letterSession.queue.length) {
    finishLetterRound();
    return;
  }
  letterSession.firstTry = true;
  $("#letters-stars").textContent = Store.data.stars;
  renderLetterChoices();
  speakLetterPrompt();
}

function renderLetterChoices() {
  const item = currentLetterItem();
  const level = letterSession.level;
  const count = chooseOptionCount(letterSession.streak, letterSession.missStreak);
  const distractors = shuffleLetters(LETTERS.filter((l) => l.id !== item.id)).slice(0, count - 1);
  const options = shuffleLetters([item, ...distractors]);
  const glyph = (l) => (level === "lower" ? l.lower : l.upper);

  $("#letters-feedback").textContent = "";
  $("#letters-choices").innerHTML = options
    .map((l) => `<button class="letter-choice" data-letter="${l.id}">${escapeHtml(glyph(l))}</button>`)
    .join("");
}

/* Sets the prompt text and, when speech is available, speaks it. Also the
   "hear it again" handler. When speech is missing or muted, the fallback
   is an on-screen flashcard of the target letter rather than flashed text
   describing it — a legitimate visual-matching version of the same task,
   the way revealWordBriefly() flashes a word for the spelling track. The
   "sound" level has no visual equivalent of a phoneme, so it falls back to
   the same flashcard rather than leaving her with no task at all. */
function speakLetterPrompt() {
  const item = currentLetterItem();
  const level = letterSession.level;

  if (!speaker.supported || !speaker.enabled) {
    const glyph = level === "lower" ? item.lower : item.upper;
    $("#letters-prompt").innerHTML =
      `Find this one: <span style="font-family:var(--font-letters)">${escapeHtml(glyph)}</span>`;
    return;
  }

  $("#letters-prompt").textContent =
    level === "sound" ? `Which letter starts "${item.clueWord}"?` : "Listen, then tap the letter!";
  const phrase =
    level === "sound"
      ? `Which letter makes the first sound in the word "${item.clueWord}"?`
      : `Find the letter ${item.upper}.`;
  speaker.cancel();
  speaker.say(phrase);
}

function updateLetterDots() {
  $("#letters-dots").innerHTML = letterSession.results
    .map((r) => `<i class="${r.firstTry ? "on" : "fixed"}"></i>`)
    .join("");
}

function letterCheer() {
  const cheers = ["Yes!", "You got it!", "Perfect!", "Great eyes!", "Woo hoo!"];
  return cheers[Math.floor(Math.random() * cheers.length)];
}

function pickLetter(letterId, btnEl) {
  if (!letterSession) return;
  const item = currentLetterItem();
  const right = letterId === item.id;
  const wasFirstTry = letterSession.firstTry;

  if (!right) {
    if (wasFirstTry) {
      Store.recordLetterAttempt(item.id, letterSession.level, false);
      letterSession.wrong++;
      letterSession.streak = 0;
      letterSession.missStreak++;
      letterSession.firstTry = false;
    }
    sfx.wrong();
    btnEl.classList.add("lc-wrong", "shake");
    // only the tapped button drops out — she keeps trying the rest in
    // place, a flatter loop than the spelling track's three-strikes climb
    btnEl.disabled = true;
    $("#letters-feedback").textContent = "Try another one!";
    return;
  }

  // correct — lock the whole board, this item is done
  $$(".letter-choice", $("#letters-choices")).forEach((b) => (b.disabled = true));

  if (wasFirstTry) {
    Store.recordLetterAttempt(item.id, letterSession.level, true);
    letterSession.correct++;
    letterSession.streak++;
    letterSession.missStreak = 0;
    letterSession.bestStreak = Math.max(letterSession.bestStreak, letterSession.streak);
  }
  letterSession.results.push({ id: item.id, firstTry: wasFirstTry });
  updateLetterDots();

  btnEl.classList.add("lc-right");
  sfx.star();
  letterSession.stars += 1;
  Store.addStars(1);
  $("#letters-stars").textContent = Store.data.stars;
  $("#letters-feedback").textContent = wasFirstTry ? letterCheer() : "Now you've got it! 🌟";

  // a full performance every few correct answers, not every single one —
  // constant applause would cheapen it, and a short round has little room
  // for a long wait between payoffs either
  const milestone = wasFirstTry && letterSession.streak > 0 && letterSession.streak % 4 === 0;
  if (milestone) {
    const pool = skillsForSport(Store.data.settings.sport).filter((s) => !s.travel && s.id !== "basketToss");
    const fresh = pool.filter((s) => s.id !== letterSession.lastSkillId);
    const from = fresh.length ? fresh : pool;
    const skill = from[Math.floor(Math.random() * from.length)];
    letterSession.lastSkillId = skill.id;
    sfx.whoosh();
    lettersArena.animator.play(skill).then(() => {
      burstConfetti(18, $(".letters-preview"));
      setTimeout(advanceLetterItem, 500);
    });
  } else {
    setTimeout(advanceLetterItem, wasFirstTry ? 650 : 950);
  }
}

function advanceLetterItem() {
  if (!letterSession) return;
  letterSession.index++;
  nextLetterItem();
}

function finishLetterRound() {
  if (!letterSession) return;
  speaker.cancel();
  const s = letterSession;
  Store.finishLetterRound();
  const daily = Store.claimDailyBonus();
  if (daily) s.stars += daily;

  const total = s.results.length;
  const acc = total ? s.correct / total : 0;
  const icon = acc >= 0.9 ? "🌟" : acc >= 0.6 ? "💪" : "🌱";
  const title = acc >= 0.9 ? "Amazing letter work" : acc >= 0.6 ? "Great practice" : "Nice try";

  $("#letters-prompt").textContent = "";
  $("#letters-choices").innerHTML = "";
  $("#letters-feedback").textContent = "";
  $("#letters-stars").textContent = Store.data.stars;
  $("#letters-summary").style.display = "";
  $("#letters-summary").innerHTML = `
    <div class="medal-big">${icon}</div>
    <h2>${escapeHtml(title)}, ${escapeHtml(playerName())}!</h2>
    <p class="muted">${s.correct} of ${total} found · best streak ${s.bestStreak}</p>
    <div class="row center"><span class="star-bank">⭐ +${s.stars} stars earned</span></div>
    ${daily ? `<div class="welcome streaky" style="margin-top:10px">🔥 Daily bonus +${daily} ⭐ included!</div>` : ""}
    <div class="row center" style="margin-top:16px">
      <button class="btn big" id="btn-letters-again">Again! 🔁</button>
      <button class="btn ghost" data-go="home">Home</button>
    </div>`;
  $("#btn-letters-again").addEventListener("click", startLetterRound);

  letterSession = null;
  refreshHome();
}

function wireLetters() {
  $("#letters-choices").addEventListener("click", (e) => {
    const b = e.target.closest(".letter-choice");
    if (!b || b.disabled || !letterSession) return;
    pickLetter(b.dataset.letter, b);
  });
  $("#btn-letters-say").addEventListener("click", () => {
    if (letterSession) speakLetterPrompt();
  });
}

/* ============================================================
   language play (pronoun case + th/f discrimination —
   HANDOFF-SPEECH-AND-LANGUAGE.md)

   A second branch off the explorer track, sharing one screen for both
   activities rather than two: picking a home tile already picks the
   activity, so there's no extra "which kind of question" step for her to
   navigate mid-screen, while the render/speak/pick/advance functions below
   branch on `languageSession.kind` instead of duplicating the whole flow —
   the two activities differ in content, not in the tap-to-choose mechanics
   underneath, which is exactly what startLetterRound()'s header comment
   already reasoned through for why this shouldn't bend the *spelling*
   track's session/phase machinery, one level up from here.

   Always exactly two choices, not chooseOptionCount()'s 2-4: unlike a
   26-letter alphabet, both of these tasks are a real binary (the right
   case or the wrong one; the th word or the f word), so a third option
   would just be a made-up distraction, not a fair harder step.
   ============================================================ */

const LANGUAGE_ROUND_LEN = 8;
const LANGUAGE_KIND_LABEL = { pronoun: "Which Word?", sound: "Th or F?" };

function buildLanguageQueue(kind) {
  if (kind === "pronoun") return Store.selectPronounPoolForRound(LANGUAGE_ROUND_LEN);
  // direction (which side of the pair is spoken) is resolved once per
  // appearance here, not baked into the content — see resolveSoundItem()
  return Store.selectSoundPoolForRound(LANGUAGE_ROUND_LEN).map((id) => resolveSoundItem(SOUND_PAIR_BY_ID[id]));
}

function currentLanguageItem() {
  const s = languageSession;
  return s.kind === "pronoun" ? PRONOUN_BY_ID[s.queue[s.index]] : s.queue[s.index];
}

function recordLanguageAttempt(item, wasRight) {
  if (languageSession.kind === "pronoun") Store.recordPronounAttempt(item.id, wasRight);
  else Store.recordSoundAttempt(item.pairId, wasRight);
}

function startLanguageRound(kind) {
  languageSession = {
    kind,
    queue: buildLanguageQueue(kind),
    index: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    missStreak: 0,
    bestStreak: 0,
    stars: 0,
    lastSkillId: null,
    results: [],
    firstTry: true
  };
  $("#language-summary").style.display = "none";
  $("#language-dots").innerHTML = "";
  $("#language-title").textContent = LANGUAGE_KIND_LABEL[kind];
  languageArena.gymnast.setLook(Store.data.look);
  showScreen("language");
  sfx.whistle();
  setTimeout(nextLanguageItem, 500);
}

function nextLanguageItem() {
  if (!languageSession) return;
  if (languageSession.index >= languageSession.queue.length) {
    finishLanguageRound();
    return;
  }
  languageSession.firstTry = true;
  $("#language-stars").textContent = Store.data.stars;
  renderLanguageChoices();
  speakLanguagePrompt();
}

function capitalizeWord(w) {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function renderLanguageChoices() {
  const s = languageSession;
  const item = currentLanguageItem();
  $("#language-feedback").textContent = "";

  if (s.kind === "pronoun") {
    const options = shuffleLanguageItems([
      { value: item.correct, label: capitalizeWord(item.correct) },
      { value: item.wrong, label: capitalizeWord(item.wrong) }
    ]);
    $("#language-choices").innerHTML = options
      .map((o) => `<button class="language-choice" data-value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</button>`)
      .join("");
  } else {
    const options = shuffleLanguageItems([
      { value: item.target, sound: item.targetSound },
      { value: item.distractor, sound: item.targetSound === "th" ? "f" : "th" }
    ]);
    $("#language-choices").innerHTML = options
      .map(
        (o) =>
          `<button class="language-choice sound" data-value="${escapeHtml(o.value)}">${mouthShapeIcon(o.sound)}<span>${escapeHtml(o.value)}</span></button>`
      )
      .join("");
  }
}

/* Fallback when speech is missing or muted mirrors speakLetterPrompt()'s own
   reasoning: an on-screen flashcard of the target is a legitimate visual
   version of the same task, not a lesser one. The pronoun sentence has no
   isolated-phoneme problem (see js/language.js's header), so it's spoken in
   full with an ordinary placeholder word for the blank. */
function speakLanguagePrompt() {
  const s = languageSession;
  const item = currentLanguageItem();

  if (s.kind === "pronoun") {
    if (!speaker.supported || !speaker.enabled) {
      $("#language-prompt").innerHTML = `${item.icon} ${escapeHtml(item.text)}`;
      return;
    }
    $("#language-prompt").textContent = item.text;
    speaker.cancel();
    speaker.say(spokenPronounPrompt(item));
    return;
  }

  if (!speaker.supported || !speaker.enabled) {
    $("#language-prompt").textContent = `Find this word: ${item.target}`;
    return;
  }
  $("#language-prompt").textContent = "Listen, then tap the matching word!";
  speaker.cancel();
  speaker.say(item.target);
}

function updateLanguageDots() {
  $("#language-dots").innerHTML = languageSession.results
    .map((r) => `<i class="${r.firstTry ? "on" : "fixed"}"></i>`)
    .join("");
}

function pickLanguageChoice(value, btnEl) {
  if (!languageSession) return;
  const s = languageSession;
  const item = currentLanguageItem();
  const correctValue = s.kind === "pronoun" ? item.correct : item.target;
  const right = value === correctValue;
  const wasFirstTry = s.firstTry;

  if (!right) {
    if (wasFirstTry) {
      recordLanguageAttempt(item, false);
      s.wrong++;
      s.streak = 0;
      s.missStreak++;
      s.firstTry = false;
    }
    sfx.wrong();
    btnEl.classList.add("lc-wrong", "shake");
    // same "only the tapped one drops out" softness as pickLetter() — with
    // only two choices this means the other one is now the only option
    // left, which is fine: it keeps her in the try, not stuck
    btnEl.disabled = true;
    $("#language-feedback").textContent = "Try the other one!";
    return;
  }

  $$(".language-choice", $("#language-choices")).forEach((b) => (b.disabled = true));

  if (wasFirstTry) {
    recordLanguageAttempt(item, true);
    s.correct++;
    s.streak++;
    s.missStreak = 0;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
  }
  s.results.push({ id: s.kind === "pronoun" ? item.id : item.pairId, firstTry: wasFirstTry });
  updateLanguageDots();

  btnEl.classList.add("lc-right");
  sfx.star();
  s.stars += 1;
  Store.addStars(1);
  $("#language-stars").textContent = Store.data.stars;
  $("#language-feedback").textContent = wasFirstTry ? letterCheer() : "Now you've got it! 🌟";

  // same reward cadence as Letter Play — every 4th correct pick in a row, not
  // every one — kept identical rather than invented fresh, since this is the
  // same age/attention band and that cadence was already deliberately tuned
  // for it (HANDOFF-EARLY-LEARNER.md §5)
  const milestone = wasFirstTry && s.streak > 0 && s.streak % 4 === 0;
  if (milestone) {
    const pool = skillsForSport(Store.data.settings.sport).filter((sk) => !sk.travel && sk.id !== "basketToss");
    const fresh = pool.filter((sk) => sk.id !== s.lastSkillId);
    const from = fresh.length ? fresh : pool;
    const skill = from[Math.floor(Math.random() * from.length)];
    s.lastSkillId = skill.id;
    sfx.whoosh();
    languageArena.animator.play(skill).then(() => {
      burstConfetti(18, $(".language-preview"));
      setTimeout(advanceLanguageItem, 500);
    });
  } else {
    setTimeout(advanceLanguageItem, wasFirstTry ? 650 : 950);
  }
}

function advanceLanguageItem() {
  if (!languageSession) return;
  languageSession.index++;
  nextLanguageItem();
}

function finishLanguageRound() {
  if (!languageSession) return;
  speaker.cancel();
  const s = languageSession;
  Store.finishLanguageRound(s.kind);
  const daily = Store.claimDailyBonus();
  if (daily) s.stars += daily;

  const total = s.results.length;
  const acc = total ? s.correct / total : 0;
  const icon = acc >= 0.9 ? "🌟" : acc >= 0.6 ? "💪" : "🌱";
  const title = acc >= 0.9 ? "Amazing listening" : acc >= 0.6 ? "Great practice" : "Nice try";

  $("#language-prompt").textContent = "";
  $("#language-choices").innerHTML = "";
  $("#language-feedback").textContent = "";
  $("#language-stars").textContent = Store.data.stars;
  $("#language-summary").style.display = "";
  $("#language-summary").innerHTML = `
    <div class="medal-big">${icon}</div>
    <h2>${escapeHtml(title)}, ${escapeHtml(playerName())}!</h2>
    <p class="muted">${s.correct} of ${total} found · best streak ${s.bestStreak}</p>
    <div class="row center"><span class="star-bank">⭐ +${s.stars} stars earned</span></div>
    ${daily ? `<div class="welcome streaky" style="margin-top:10px">🔥 Daily bonus +${daily} ⭐ included!</div>` : ""}
    <div class="row center" style="margin-top:16px">
      <button class="btn big" id="btn-language-again">Again! 🔁</button>
      <button class="btn ghost" data-go="home">Home</button>
    </div>`;
  $("#btn-language-again").addEventListener("click", () => startLanguageRound(s.kind));

  languageSession = null;
  refreshHome();
}

function wireLanguage() {
  $("#language-choices").addEventListener("click", (e) => {
    const b = e.target.closest(".language-choice");
    if (!b || b.disabled || !languageSession) return;
    pickLanguageChoice(b.dataset.value, b);
  });
  $("#btn-language-say").addEventListener("click", () => {
    if (languageSession) speakLanguagePrompt();
  });
}

/* ============================================================
   avatar studio
   ============================================================ */

/* An item she doesn't own yet is "tried on" first: the preview figure wears it
   but no stars are spent until she confirms. Only one item is on trial at a
   time, and the arena figure keeps showing what she actually owns. */
let studioPreview = null;

/* Which catalog category is currently visible. One tab is shown at a time so
   she isn't scanning all 9 slots' worth of items at once. */
let studioTab = "hair";
const SKIN_TAB = { slot: "skin", label: "Skin Tone", icon: "🧑" };

function studioLook() {
  if (!studioPreview) return Store.data.look;
  return Object.assign({}, Store.data.look, { [studioPreview.slot]: studioPreview.id });
}

function clearPreview() {
  studioPreview = null;
}

function wireStudio() {
  $("#studio-cats").addEventListener("click", (e) => {
    const t = e.target.closest(".cat-tab");
    if (!t) return;
    studioTab = t.dataset.slot;
    clearPreview();
    refreshStudio();
  });

  $("#studio-slots").addEventListener("click", (e) => {
    const b = e.target.closest(".item");
    if (!b) return;
    const { slot, id } = b.dataset;
    if (slot === "skin") return; // skin tones are free and handled separately

    if (Store.isOwned(slot, id)) {
      clearPreview();
      Store.setLook({ [slot]: id });
      arena.gymnast.setLook(Store.data.look);
      sfx.star();
      refreshStudio();
      return;
    }

    // locked: try it on rather than buying straight away
    studioPreview = { slot, id };
    sfx.star();
    refreshStudio();
  });

  $("#try-bar").addEventListener("click", (e) => {
    if (e.target.closest("#btn-try-cancel")) {
      clearPreview();
      refreshStudio();
      return;
    }
    if (e.target.closest("#btn-try-goal") && studioPreview) {
      Store.setGoal(studioPreview.slot, studioPreview.id);
      const item = CATALOG[studioPreview.slot].items.find((i) => i.id === studioPreview.id);
      sfx.star();
      toast(`Saving up for ${item.name}! 🎯`);
      refreshStudio();
      return;
    }
    if (!e.target.closest("#btn-try-buy") || !studioPreview) return;

    const { slot, id } = studioPreview;
    const res = Store.buy(slot, id);
    if (res.ok) {
      const g = Store.data.goal;
      if (g && g.slot === slot && g.id === id) Store.setGoal(null); // goal reached
      clearPreview();
      Store.setLook({ [slot]: id });
      arena.gymnast.setLook(Store.data.look);
      sfx.fanfare("bronze");
      burstStudioSparkle();
      toast(`Unlocked ${res.item.name}! ✨`);
    } else if (res.reason === "stars") {
      sfx.wrong();
      toast(`You need ${res.short} more ⭐ for that one.`);
    }
    refreshStudio();
  });

  $("#btn-preview-skill").addEventListener("click", () => {
    // travelling skills would walk her straight out of the cropped preview,
    // so the studio only demos the ones performed on the spot
    const sport = Store.data.settings.sport;
    const pool = skillsForSport(sport).filter((s) => !s.travel && s.id !== "basketToss");
    const fresh = pool.filter((s) => s.id !== studio.lastId);
    const skill = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length ? fresh.length : pool.length))];
    if (!skill) return;
    studio.lastId = skill.id;
    sfx.whoosh();
    studio.animator.play(skill);
  });
}

function burstStudioSparkle() {
  burstConfetti(24, $(".studio-preview"));
}

function renderTryBar() {
  const bar = $("#try-bar");
  if (!studioPreview) {
    bar.innerHTML = "";
    return;
  }
  const { slot, id } = studioPreview;
  const item = CATALOG[slot].items.find((i) => i.id === id);
  const short = item.cost - Store.data.stars;
  const canAfford = short <= 0;
  const g = Store.data.goal;
  const isGoal = g && g.slot === slot && g.id === id;
  bar.innerHTML = `
    <div class="try-bar">
      <div class="try-title">Trying on <b>${escapeHtml(item.name)}</b></div>
      <div class="try-sub">${
        canAfford
          ? `Costs ${item.cost} ⭐ — you'll have ${Store.data.stars - item.cost} ⭐ left.`
          : `Costs ${item.cost} ⭐ — you need ${short} more. Keep spelling!`
      }</div>
      <div class="row center" style="margin-top:8px">
        <button class="btn small gold" id="btn-try-buy" ${canAfford ? "" : "disabled"}>
          ${canAfford ? `Buy it — ${item.cost} ⭐` : `Need ${short} more ⭐`}
        </button>
        ${canAfford || isGoal ? "" : '<button class="btn small ghost" id="btn-try-goal">🎯 Save up for it</button>'}
        <button class="btn small ghost" id="btn-try-cancel">Take it off</button>
      </div>
      ${isGoal ? '<div class="try-sub" style="margin-top:6px">🎯 This is your goal — the bar on the home screen is tracking it.</div>' : ""}
    </div>`;
}

function refreshStudio() {
  studio.gymnast.setLook(studioLook());
  renderTryBar();
  $("#studio-stars").textContent = Store.data.stars;
  paintGoal($("#studio-goal"));
  const look = studioLook();
  const stars = Store.data.stars;

  const tabs = [SKIN_TAB, ...Object.keys(CATALOG).map((slot) => ({ slot, label: CATALOG[slot].label, icon: CATALOG[slot].icon }))];
  $("#studio-cats").innerHTML = tabs
    .map(
      (t) => `<button class="cat-tab" role="tab" data-slot="${t.slot}" aria-selected="${studioTab === t.slot}" title="${escapeHtml(t.label)}">
                <span class="cat-icon" aria-hidden="true">${t.icon}</span><span class="cat-label">${escapeHtml(t.label)}</span>
              </button>`
    )
    .join("");

  let items;
  if (studioTab === "skin") {
    items = SKIN_TONES.map(
      (t) => `<button class="item thumb" data-slot="skin" data-id="${t.id}" aria-pressed="${look.skin === t.id}" title="Skin tone">
                <span class="swatch big" style="background:${t.color}"></span></button>`
    ).join("");
  } else {
    const def = CATALOG[studioTab];
    items = def.items
      .map((item) => {
        const owned = Store.isOwned(studioTab, item.id);
        const affordable = !owned && stars >= item.cost;
        const trying = studioPreview && studioPreview.slot === studioTab && studioPreview.id === item.id;
        const cls = ["item", "thumb", owned ? "" : "locked", affordable ? "affordable" : "", trying ? "trying" : ""]
          .filter(Boolean)
          .join(" ");
        const art = item.swatch
          ? `<span class="swatch big" style="background:${item.swatch}"></span>`
          : item.main
          ? `<span class="swatch big" style="background:${item.main}"></span>`
          : buildThumbnail(studioTab, item.id, look);
        const tag = trying ? `<span class="cost">👀</span>` : owned ? "" : `<span class="cost">🔒${item.cost}⭐</span>`;
        const sportTag = item.sport && item.sport !== "any" ? { gym: " 🤸", cheer: " 📣", dance: " 💃" }[item.sport] || "" : "";
        return `<button class="${cls}" data-slot="${studioTab}" data-id="${item.id}"
                  aria-pressed="${look[studioTab] === item.id}"
                  title="${escapeHtml(item.name)}${sportTag} — ${owned ? "wear this" : "try it on, " + item.cost + " stars to keep"}">
                  ${art}<span class="thumb-name">${escapeHtml(item.name)}</span>${tag}</button>`;
      })
      .join("");
  }

  $("#studio-slots").innerHTML =
    `<div class="items thumb-grid">${items}</div>` +
    `<p class="muted" style="font-size:14px">Tap anything locked to try it on — stars are only spent when you press Buy.
     Earn stars by spelling words; competitions pay a medal bonus: 🥇 25 · 🥈 15 · 🥉 8 · 🎀 4.</p>`;
}

/* skin tone lives outside CATALOG, so handle it here too */
document.addEventListener("click", (e) => {
  const b = e.target.closest('.item[data-slot="skin"]');
  if (!b) return;
  Store.setLook({ skin: b.dataset.id });
  studio.gymnast.setLook(Store.data.look);
  arena.gymnast.setLook(Store.data.look);
  refreshStudio();
});

/* ============================================================
   grown-ups dashboard
   ============================================================ */

let editingListId = null;

function wireParents() {
  $(".tabs").addEventListener("click", (e) => {
    const t = e.target.closest(".tab");
    if (!t) return;
    $$(".tab").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
    $$(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + t.dataset.tab));
  });

  // Same delegated-once reasoning as the lists panel below.
  $("#tab-players").addEventListener("click", (e) => {
    const sw = e.target.closest("[data-switch]");
    const del = e.target.closest("[data-delplayer]");
    if (sw) {
      Store.switchProfile(sw.dataset.switch);
      applyProfileSettings();
      renderParents();
      refreshHome();
      toast(`Now playing as ${playerName()}.`);
    }
    if (del) {
      const p = Store.file.profiles[del.dataset.delplayer];
      if (!p) return;
      if (!confirm(`Delete ${p.name} and all of their progress? This cannot be undone.`)) return;
      Store.deleteProfile(p.id);
      applyProfileSettings();
      renderParents();
      refreshHome();
      toast(`Deleted ${p.name}.`);
    }
  });
  $("#tab-players").addEventListener("change", (e) => {
    const rn = e.target.closest("[data-rename]");
    if (!rn) return;
    Store.renameProfile(rn.dataset.rename, rn.value);
    applyProfileSettings();
    refreshHome();
    renderPlayersTab();
  });

  // Delegated once: renderListsTab replaces the panel's contents, so binding
  // inside it would stack a new listener on every render.
  $("#tab-lists").addEventListener("click", (e) => {
    const ed = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-del]");
    if (ed) {
      const l = Store.data.customLists.find((x) => x.id === ed.dataset.edit);
      if (!l) return;
      editingListId = l.id;
      $("#list-name").value = l.name;
      $("#list-words").value = l.words
        .map(([w, s]) => (s && !/^Can you spell /.test(s) ? `${w} | ${s}` : w))
        .join("\n");
      $("#list-form-title").textContent = "Editing: " + l.name;
      $("#list-words").dispatchEvent(new Event("input"));
      $("#list-name").scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (del) {
      const l = Store.data.customLists.find((x) => x.id === del.dataset.del);
      if (l && confirm(`Delete the list "${l.name}"?`)) {
        if (editingListId === l.id) editingListId = null;
        Store.deleteCustomList(l.id);
        renderListsTab();
        renderGradeChoices();
        toast("List deleted.");
      }
    }
  });
}

function renderParents() {
  if (remoteReadOnly) {
    // just the two views worth showing about someone else's progress,
    // read-only — no Focus/Lists/Players/Settings, nothing here should be
    // editable from a device that doesn't own this profile's local save
    renderProgressTab();
    renderWordsTab();
    return;
  }
  if (!parentsUnlocked) {
    renderGate();
    return;
  }
  renderProgressTab();
  renderFocusTab();
  renderWordsTab();
  renderListsTab();
  renderPlayersTab();
  renderSettingsTab();
}

/* Read-only summary of a profile that isn't the active one — same shape as
   the Progress tab's stat tiles and trouble list, but no pin controls: this
   is a peek, not an editing surface, and you shouldn't need to switch
   profiles just to see how a sibling is doing. */
function renderPeekContent(p) {
  const st = p.stats || { attempts: 0, correct: 0, sessions: [], words: {} };
  const acc = st.attempts ? st.correct / st.attempts : 0;
  const words = st.words || {};
  const trouble = Object.entries(words)
    .map(([word, s]) => ({ word, ...s, accuracy: s.seen ? s.right / s.seen : 0 }))
    .filter((r) => r.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong || a.word.localeCompare(b.word))
    .slice(0, 5);

  return `
    <div class="stat-grid" style="margin:10px 0">
      <div class="stat-box"><div class="k">Words attempted</div><div class="v">${st.attempts}</div></div>
      <div class="stat-box"><div class="k">Accuracy</div><div class="v">${pct(acc)}</div></div>
      <div class="stat-box"><div class="k">Sessions</div><div class="v">${(st.sessions || []).length}</div></div>
      <div class="stat-box"><div class="k">Stars</div><div class="v">${p.stars} ⭐</div></div>
    </div>
    ${
      trouble.length
        ? `<p class="muted" style="font-size:14px;margin-bottom:4px">Still practicing: ${trouble
            .map((r) => escapeHtml(r.word))
            .join(", ")}</p>`
        : `<p class="muted" style="font-size:14px">No misses recorded yet.</p>`
    }`;
}

function renderPlayersTab() {
  const rows = Store.profiles()
    .map((p) => {
      const st = p.stats || { attempts: 0, correct: 0, sessions: [] };
      const acc = st.attempts ? Math.round((st.correct / st.attempts) * 100) + "%" : "—";
      const active = p.id === Store.file.activeId;
      const only = Store.profiles().length <= 1;
      return `<tr>
        <td><input type="text" class="text-line" data-rename="${p.id}" value="${escapeHtml(p.name)}"
             maxlength="18" style="width:150px;font-size:15px;padding:6px 9px"></td>
        <td>${st.attempts}</td><td>${acc}</td><td>${(st.sessions || []).length}</td>
        <td>${p.stars} ⭐</td>
        <td>${active ? '<b style="color:var(--purple-deep)">playing</b>'
              : `<button class="btn small ghost" data-switch="${p.id}">Switch to</button>`}</td>
        <td>${active ? '<span class="muted">—</span>' : `<button class="btn small ghost" data-peek="${p.id}">Peek</button>`}</td>
        <td>${only ? '<span class="muted">—</span>'
              : `<button class="btn small ghost" data-delplayer="${p.id}">Delete</button>`}</td>
      </tr>
      <tr class="peek-row" id="peek-${p.id}" style="display:none"><td colspan="7"></td></tr>`;
    })
    .join("");

  $("#tab-players").innerHTML = `
    <p class="muted">Each player keeps their own stars, unlocked items, word history and settings.
       Edit a name to rename that player. "Peek" shows a profile's progress without switching to it.</p>
    <table class="data">
      <thead><tr><th>Name</th><th>Words</th><th>Accuracy</th><th>Sessions</th><th>Stars</th><th></th><th></th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="slider-row" style="margin-top:18px">
      <label for="new-player">Add player</label>
      <input type="text" class="text-line" id="new-player" maxlength="18" placeholder="Name" style="flex:1 1 180px">
      <button class="btn small teal" id="btn-add-player">＋ Add</button>
    </div>`;

  $("#btn-add-player").addEventListener("click", () => {
    const name = $("#new-player").value.trim();
    if (!name) return toast("Type a name first.");
    Store.createProfile(name);
    renderPlayersTab();
    toast(`Added ${name}.`);
  });

  $$("[data-peek]", $("#tab-players")).forEach((btn) =>
    btn.addEventListener("click", () => {
      const row = $("#peek-" + btn.dataset.peek);
      const open = row.style.display !== "none";
      if (open) {
        row.style.display = "none";
        return;
      }
      const p = Store.file.profiles[btn.dataset.peek];
      row.querySelector("td").innerHTML = renderPeekContent(p);
      row.style.display = "";
    })
  );
}

function renderGate() {
  const a = 3 + Math.floor(Math.random() * 9);
  const b = 4 + Math.floor(Math.random() * 9);
  $("#tab-progress").innerHTML = `
    <div class="notice">Quick check so little hands don't wander in here by accident.</div>
    <h3>What is ${a} × ${b}?</h3>
    <div class="row">
      <input type="text" class="text-line" id="gate-answer" inputmode="numeric" style="width:120px" aria-label="Answer">
      <button class="btn" id="gate-go">Unlock</button>
    </div>`;
  $("#tab-focus").innerHTML = "";
  $("#tab-words").innerHTML = "";
  $("#tab-lists").innerHTML = "";
  $("#tab-settings").innerHTML = "";
  const go = () => {
    if (Number($("#gate-answer").value.trim()) === a * b) {
      parentsUnlocked = true;
      renderParents();
    } else {
      $("#gate-answer").value = "";
      $("#gate-answer").focus();
      toast("Not quite — try again.");
    }
  };
  $("#gate-go").addEventListener("click", go);
  $("#gate-answer").addEventListener("keydown", (e) => {
    if (e.key === "Enter") go();
  });
  $("#gate-answer").focus();
}

function pct(n) {
  return Math.round(n * 100) + "%";
}

/* Monday-of-the-week timestamp, used to bucket sessions for the by-week
   rollup — local calendar, same reasoning as Store's dayKey(). */
function weekKey(ts) {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

/* Letters have no equivalent of Store.data.stats — the explorer track never
   touches it — so an explorer profile gets its own view here instead of a
   Progress tab full of zeroes. */
function renderLettersProgressTab() {
  const el = Store.data.earlyLearner;
  const lp = el.levelProgress[el.level] || { attempts: 0, right: 0 };
  const acc = lp.attempts ? lp.right / lp.attempts : 0;

  const rows = LETTERS.map((l) => {
    const s = el.letters[l.id];
    const a = s && s.seen ? s.right / s.seen : null;
    const cls = a == null ? "" : a >= 0.8 ? "" : a >= 0.5 ? "warn" : "bad";
    return `<tr>
      <td class="word">${l.upper}${l.lower}</td>
      <td>${s ? s.seen : 0}</td>
      <td style="width:26%"><div class="bar ${cls}"><i style="width:${a == null ? 0 : Math.round(a * 100)}%"></i></div></td>
      <td>${a == null ? "—" : pct(a)}</td>
    </tr>`;
  }).join("");

  const lang = Store.data.languagePlay;
  const pronounAcc = accuracyAcross(lang.pronoun.items);
  const soundAcc = accuracyAcross(lang.sound.pairs);

  $("#tab-progress").innerHTML = `
    <div class="stat-grid">
      <div class="stat-box"><div class="k">Current level</div>
        <div class="v" style="font-size:20px">${escapeHtml(LETTER_LEVEL_LABEL[el.level] || el.level)}</div>
        <div class="sub">${pct(acc)} at this level</div></div>
      <div class="stat-box"><div class="k">Rounds played</div><div class="v">${el.roundsCompleted}</div></div>
      <div class="stat-box"><div class="k">Stars earned</div><div class="v">${Store.data.starsAllTime}</div>
        <div class="sub">${Store.data.stars} unspent</div></div>
    </div>
    <p class="muted">Levels move forward on their own once she's had enough solid practice at one
      (roughly five rounds at 80%+ accuracy). A grown-up can override the level, or switch
      ${escapeHtml(playerName())} back to word spelling any time, from the Settings tab.</p>
    <h3 style="margin-top:20px">Letters</h3>
    <table class="data"><thead><tr><th>Letter</th><th>Times seen</th><th></th><th>Accuracy</th></tr></thead>
      <tbody>${rows}</tbody></table>

    <h3 style="margin-top:24px">Language Play</h3>
    <div class="stat-grid">
      <div class="stat-box"><div class="k">Which Word? (pronouns)</div>
        <div class="v" style="font-size:20px">${pronounAcc == null ? "—" : pct(pronounAcc)}</div>
        <div class="sub">${lang.pronoun.roundsCompleted} rounds played</div></div>
      <div class="stat-box"><div class="k">Th or F?</div>
        <div class="v" style="font-size:20px">${soundAcc == null ? "—" : pct(soundAcc)}</div>
        <div class="sub">${lang.sound.roundsCompleted} rounds played</div></div>
    </div>
    <p class="muted">Both of these are listening/tapping activities — they reinforce telling
      "she" apart from "her" and the "th" sound apart from "f", the same distinction her
      speech therapist's tactile cue targets. Neither one listens to or grades her own
      speech; there's no microphone anywhere in this app, so they can't tell you whether
      she still says "fermometer" out loud — only whether she can pick the right one when
      she hears it.</p>`;
}

/* Rolls up a per-item { seen, right } progress map into one overall
   accuracy, or null if nothing's been attempted yet — same shape
   renderLettersProgressTab() already uses per-letter, just totalled. */
function accuracyAcross(progressMap) {
  let seen = 0, right = 0;
  for (const id in progressMap) {
    seen += progressMap[id].seen;
    right += progressMap[id].right;
  }
  return seen ? right / seen : null;
}

function renderProgressTab() {
  if (Store.data.stage === "explorer") { renderLettersProgressTab(); return; }
  const st = Store.data.stats;
  const sessions = st.sessions.slice(-24);
  const acc = st.attempts ? st.correct / st.attempts : 0;
  const distinct = Object.keys(st.words).length;
  const mastered = Store.masteredWords().length;
  const trouble = Store.troubleWords(8);
  const totalMinutes = Math.round(st.sessions.reduce((a, s) => a + (s.ms || 0), 0) / 60000);

  const bars = sessions
    .map((s) => {
      const a = s.total ? s.correct / s.total : 0;
      const cls = a >= 0.9 ? "" : a >= 0.7 ? "low" : "bad";
      const h = Math.max(6, Math.round(a * 90));
      const when = new Date(s.ts).toLocaleDateString();
      return `<div class="col ${cls}" style="height:${h}px" title="${when} · ${s.correct}/${s.total} (${pct(a)}) · ${s.listLabel}"></div>`;
    })
    .join("");

  const troubleRows = trouble.length
    ? trouble
        .map((r) => {
          const a = r.accuracy;
          const cls = a >= 0.7 ? "warn" : "bad";
          return `<tr>
            <td class="word">${escapeHtml(r.word)}</td>
            <td>${r.wrong} miss${r.wrong === 1 ? "" : "es"}</td>
            <td>${r.seen} tries</td>
            <td style="width:26%"><div class="bar ${cls}"><i style="width:${Math.round(a * 100)}%"></i></div></td>
            <td>${pct(a)}</td>
            <td>${pinButtons(r.word)}</td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="6" class="muted">No misses recorded yet.</td></tr>`;

  // by-week rollup, computed on read from the same capped sessions array —
  // no new storage, just a coarser view than the last-24 bar chart above
  const weekMap = new Map();
  for (const s of st.sessions) {
    const wk = weekKey(s.ts);
    const w = weekMap.get(wk) || { correct: 0, total: 0, ts: s.ts };
    w.correct += s.correct || 0;
    w.total += s.total || 0;
    w.ts = Math.max(w.ts, s.ts);
    weekMap.set(wk, w);
  }
  const weeks = [...weekMap.values()].sort((a, b) => a.ts - b.ts).slice(-10);
  const weekBars = weeks
    .map((w) => {
      const a = w.total ? w.correct / w.total : 0;
      const cls = a >= 0.9 ? "" : a >= 0.7 ? "low" : "bad";
      const h = Math.max(6, Math.round(a * 90));
      const when = new Date(w.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return `<div class="col ${cls}" style="height:${h}px" title="Week of ${when} · ${w.correct}/${w.total} (${pct(a)})"></div>`;
    })
    .join("");

  const recent = st.sessions
    .slice(-8)
    .reverse()
    .map((s) => {
      const medal = { gold: "🥇", silver: "🥈", bronze: "🥉", ribbon: "🎀" }[s.medal] || "—";
      return `<tr>
        <td>${new Date(s.ts).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
        <td>${s.mode === "competition" ? "Competition" : "Practice"}</td>
        <td>${escapeHtml(s.listLabel || "")}</td>
        <td>${s.correct}/${s.total}</td>
        <td>${s.score ? s.score.toFixed(1) : "—"}</td>
        <td>${medal}</td>
      </tr>`;
    })
    .join("");

  $("#tab-progress").innerHTML = `
    <div class="stat-grid">
      <div class="stat-box"><div class="k">Words attempted</div><div class="v">${st.attempts}</div><div class="sub">${distinct} different words</div></div>
      <div class="stat-box"><div class="k">Overall accuracy</div><div class="v">${pct(acc)}</div><div class="sub">${st.correct} correct</div></div>
      <div class="stat-box"><div class="k">Mastered</div><div class="v">${mastered}</div><div class="sub">right every time, 2+ tries</div></div>
      <div class="stat-box"><div class="k">Best streak</div><div class="v">${Store.data.best.streak}</div><div class="sub">best score ${Store.data.best.score.toFixed(1)}</div></div>
      <div class="stat-box"><div class="k">Sessions</div><div class="v">${st.sessions.length}</div><div class="sub">about ${totalMinutes} min total</div></div>
      <div class="stat-box"><div class="k">Stars earned</div><div class="v">${Store.data.starsAllTime}</div><div class="sub">${Store.data.stars} unspent</div></div>
    </div>

    <h3>Accuracy over the last ${sessions.length || 0} sessions</h3>
    ${sessions.length ? `<div class="trend">${bars}</div>` : '<p class="muted">Play a session and this chart fills in.</p>'}

    ${
      weeks.length > 1
        ? `<h3 style="margin-top:24px">By week</h3><div class="trend">${weekBars}</div>`
        : ""
    }

    <h3 style="margin-top:24px">Still practicing</h3>
    <p class="muted" style="font-size:14px">⭐ practices a word more often, 💤 eases off it — pin from here or Word Detail.</p>
    <table class="data"><thead><tr><th>Word</th><th>Misses</th><th>Tries</th><th>Accuracy</th><th></th><th></th></tr></thead>
      <tbody>${troubleRows}</tbody></table>

    <h3 style="margin-top:24px">Recent sessions</h3>
    <table class="data"><thead><tr><th>When</th><th>Mode</th><th>List</th><th>Correct</th><th>Score</th><th></th></tr></thead>
      <tbody>${recent || '<tr><td colspan="6" class="muted">Nothing yet.</td></tr>'}</tbody></table>`;

  wirePinButtons($("#tab-progress"), () => {
    renderProgressTab();
    renderFocusTab();
    renderWordsTab();
  });
}

/* Shared boost/retire toggle used on both the Progress and Word Detail
   tables — pinning a word is always available wherever that word already
   shows up, rather than forcing a trip to the Focus tab. */
function pinButtons(word) {
  if (remoteReadOnly) return "";
  const mode = Store.data.prefs.pinned[word];
  return `<button class="btn pin" data-pin="boost" data-word="${escapeHtml(word)}" aria-pressed="${mode === "boost"}" title="Practice this word more">⭐</button>
          <button class="btn pin" data-pin="retire" data-word="${escapeHtml(word)}" aria-pressed="${mode === "retire"}" title="Ease off this word">💤</button>`;
}

// a few seconds' debounce so a burst of pin/unpin clicks or note edits
// doesn't fire a sync round-trip per keystroke — still fire-and-forget,
// still a no-op offline or with sync off
let _syncDebounceTimer = null;
function debouncedSync() {
  clearTimeout(_syncDebounceTimer);
  _syncDebounceTimer = setTimeout(() => Store.reconcileSync(), 3000);
}

function wirePinButtons(container, afterChange) {
  $$("[data-pin]", container).forEach((btn) =>
    btn.addEventListener("click", () => {
      const word = btn.dataset.word;
      const mode = btn.dataset.pin;
      const already = Store.data.prefs.pinned[word] === mode;
      Store.setPinned(word, already ? null : mode);
      afterChange();
      debouncedSync();
    })
  );
}

/* One place to see and undo everything currently steering practice — the
   review-mix slider and pins live here in Focus, but the pins themselves are
   set from the Progress and Word Detail tables, wherever a word already shows up. */
function renderFocusTab() {
  const prefs = Store.data.prefs;
  const pins = Object.entries(prefs.pinned);

  const pinRows = pins.length
    ? pins
        .map(
          ([word, mode]) => `<tr>
            <td class="word">${escapeHtml(word)}</td>
            <td>${mode === "boost" ? "⭐ Practice more" : "💤 Ease off"}</td>
            <td><button class="btn small ghost" data-unpin="${escapeHtml(word)}">Unpin</button></td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="3" class="muted">Nothing pinned yet — pin words from Progress or Word Detail.</td></tr>`;

  $("#tab-focus").innerHTML = `
    <div class="notice">This tab nudges which words come up more, or less, often. It never
      marks anything wrong — pinning a word just changes how often it's practiced.</div>

    <div class="field">
      <label for="focus-mix">How much of a routine should circle back to tricky/boosted words?</label>
      <input type="range" id="focus-mix" min="0" max="0.6" step="0.02" value="${prefs.reviewMix}" style="width:100%;max-width:340px">
      <span class="muted" id="focus-mix-val">${Math.round(prefs.reviewMix * 100)}% of each routine</span>
    </div>

    <div class="field" style="margin-top:18px">
      <label for="focus-note">Notes to yourself</label>
      <textarea id="focus-note" class="list-edit" placeholder="e.g. work on -tion endings this week">${escapeHtml(prefs.focusNote)}</textarea>
      <p class="muted" style="font-size:13px">This is just a note for you — it doesn't change which words she gets, it's not read by the game.</p>
    </div>

    <h3 style="margin-top:22px">Pinned words</h3>
    <table class="data"><thead><tr><th>Word</th><th>What it does</th><th></th></tr></thead>
      <tbody>${pinRows}</tbody></table>`;

  const mix = $("#focus-mix");
  mix.addEventListener("input", () => {
    $("#focus-mix-val").textContent = `${Math.round(Number(mix.value) * 100)}% of each routine`;
  });
  mix.addEventListener("change", () => {
    Store.setReviewMix(Number(mix.value));
    debouncedSync();
  });

  const note = $("#focus-note");
  note.addEventListener("change", () => {
    Store.setFocusNote(note.value);
    debouncedSync();
  });

  $$("[data-unpin]", $("#tab-focus")).forEach((btn) =>
    btn.addEventListener("click", () => {
      Store.setPinned(btn.dataset.unpin, null);
      renderFocusTab();
      renderProgressTab();
      renderWordsTab();
      toast(`Unpinned "${btn.dataset.unpin}".`);
    })
  );
}

function renderWordsTab() {
  const pinned = Store.data.prefs.pinned;
  const rows = Object.entries(Store.data.stats.words)
    .map(([word, s]) => ({
      word,
      ...s,
      accuracy: s.seen ? s.right / s.seen : 0,
      avgSec: s.seen ? s.totalMs / s.seen / 1000 : 0
    }))
    .sort((a, b) => b.wrong - a.wrong || b.seen - a.seen || a.word.localeCompare(b.word));

  // how she eventually got there, when the first try wasn't it — a quieter
  // read on difficulty than a bare right/wrong count
  const needed = (r) => {
    const bits = [];
    if (r.retried) bits.push(`<span title="Needed a retry">↻${r.retried}</span>`);
    if (r.multipleChoice) bits.push(`<span title="Needed multiple choice">❓${r.multipleChoice}</span>`);
    if (r.unresolved) bits.push(`<span title="Not yet, even with multiple choice">•${r.unresolved}</span>`);
    return bits.join(" ") || `<span class="muted">—</span>`;
  };

  $("#tab-words").innerHTML = `
    <div class="row" style="margin-bottom:12px">
      <input type="text" class="text-line" id="word-filter" placeholder="Filter words…" style="flex:1 1 200px">
      <label class="toggle"><input type="checkbox" id="word-pinned-only"> Pinned only</label>
      <span class="muted">${rows.length} words tracked</span>
    </div>
    <table class="data" id="word-table">
      <thead><tr><th>Word</th><th>Tries</th><th>Right</th><th>Wrong</th><th>Hints</th><th>Needed help</th><th>Avg time</th><th>Accuracy</th><th></th></tr></thead>
      <tbody>${
        rows.length
          ? rows
              .map(
                (r) => `<tr data-word="${escapeHtml(r.word)}" data-pinned="${Boolean(pinned[r.word])}">
                  <td class="word">${escapeHtml(r.word)}</td>
                  <td>${r.seen}</td><td>${r.right}</td><td>${r.wrong}</td><td>${r.hints || 0}</td>
                  <td>${needed(r)}</td>
                  <td>${r.avgSec.toFixed(1)}s</td>
                  <td style="width:18%"><div class="bar ${r.accuracy >= 0.9 ? "" : r.accuracy >= 0.6 ? "warn" : "bad"}">
                    <i style="width:${Math.round(r.accuracy * 100)}%"></i></div></td>
                  <td>${pinButtons(r.word)}</td>
                </tr>`
              )
              .join("")
          : '<tr><td colspan="9" class="muted">No words practised yet.</td></tr>'
      }</tbody>
    </table>`;

  const applyFilter = () => {
    const q = filter.value.trim().toLowerCase();
    const pinnedOnly = pinnedOnlyBox.checked;
    $$("#word-table tbody tr").forEach((tr) => {
      const w = (tr.dataset.word || "").toLowerCase();
      const matchesText = !q || w.indexOf(q) !== -1;
      const matchesPin = !pinnedOnly || tr.dataset.pinned === "true";
      tr.style.display = matchesText && matchesPin ? "" : "none";
    });
  };

  const filter = $("#word-filter");
  const pinnedOnlyBox = $("#word-pinned-only");
  if (filter) {
    filter.addEventListener("input", applyFilter);
    pinnedOnlyBox.addEventListener("change", applyFilter);
  }

  wirePinButtons($("#tab-words"), () => {
    renderWordsTab();
    renderProgressTab();
    renderFocusTab();
  });
}

function renderListsTab() {
  const lists = Store.data.customLists;
  const existing = lists.length
    ? lists
        .map(
          (l) => `<div class="custom-list-row">
            <b>${escapeHtml(l.name)}</b>
            <span class="muted">${l.words.length} words</span>
            <button class="btn small ghost" data-edit="${l.id}">Edit</button>
            <button class="btn small ghost" data-del="${l.id}">Delete</button>
          </div>`
        )
        .join("")
    : '<p class="muted">No custom lists yet. Paste her homework list below.</p>';

  $("#tab-lists").innerHTML = `
    <div class="notice">
      One word per line. To add the sentence she'll hear, put it after a pipe:<br>
      <code>because | I smiled because I landed it.</code><br>
      Without a sentence the game just says the word twice.
    </div>
    <h3>Your lists</h3>
    ${existing}
    <h3 style="margin-top:22px" id="list-form-title">Add a new list</h3>
    <div class="field">
      <label for="list-name">List name</label>
      <input type="text" class="text-line" id="list-name" placeholder="Week of Sept 8" style="width:100%;max-width:340px">
    </div>
    <div class="field">
      <label for="list-words">Words</label>
      <textarea class="list-edit" id="list-words" placeholder="beautiful | That was a beautiful routine.&#10;because&#10;straight"></textarea>
    </div>
    <div class="row">
      <button class="btn teal" id="list-save">Save list</button>
      <button class="btn ghost" id="list-clear">Clear</button>
      <span class="muted" id="list-count"></span>
    </div>`;

  const updateCount = () => {
    const n = parseWordList($("#list-words").value).length;
    $("#list-count").textContent = n ? `${n} words ready` : "";
  };
  $("#list-words").addEventListener("input", updateCount);

  $("#list-save").addEventListener("click", () => {
    const name = $("#list-name").value.trim() || "My List";
    const entries = parseWordList($("#list-words").value);
    if (!entries.length) {
      toast("Add at least one word first.");
      return;
    }
    if (editingListId) Store.updateCustomList(editingListId, name, entries);
    else Store.addCustomList(name, entries);
    editingListId = null;
    renderListsTab();
    renderGradeChoices();
    toast(`Saved "${name}" — ${entries.length} words.`);
  });

  $("#list-clear").addEventListener("click", () => {
    editingListId = null;
    $("#list-name").value = "";
    $("#list-words").value = "";
    $("#list-form-title").textContent = "Add a new list";
    updateCount();
  });
}

function renderSyncSection(sync) {
  if (sync.localOnly) {
    return `
      <p class="muted">${escapeHtml(playerName())} is set to play offline only — nothing about
         this profile leaves this device.</p>
      <div class="row">
        <button class="btn small teal" id="sync-enable">Turn sync back on</button>
      </div>
      <p class="muted" style="font-size:13px;margin-top:14px">Setting up a device that already has this profile's code?</p>
      <div class="row">
        <input type="text" class="text-line" id="sync-link-code" maxlength="6" placeholder="ABC123" style="width:140px;text-transform:uppercase">
        <button class="btn small ghost" id="sync-link">Link this device</button>
      </div>`;
  }

  const last = sync.lastSyncedAt
    ? new Date(sync.lastSyncedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "not yet";

  return `
    <p class="muted">Every profile syncs automatically — ${escapeHtml(playerName())}'s stars, avatar and
       progress follow her to any device that has this code. Keep it private: anyone with it can view
       or link this profile.</p>
    <div class="row">
      <span class="answer" id="sync-code-display">${escapeHtml(sync.code || "…")}</span>
      <button class="btn small ghost" id="sync-copy">Copy remote link</button>
    </div>
    <p class="muted" style="font-size:13px">Last synced: ${last}</p>
    <p class="muted" style="font-size:13px;margin-top:14px">On a new device? Enter this code there under "Link this device."</p>
    <div class="row" style="margin-top:8px">
      <button class="btn small ghost" id="sync-regenerate">Regenerate code</button>
      <button class="btn small ghost" id="sync-disable">Play offline only</button>
    </div>`;
}

function renderSettingsTab() {
  const s = Store.data.settings;
  const voices = speaker.listVoices();
  const preset = VOICE_PRESET_BY_ID[s.voicePreset] || VOICE_PRESET_BY_ID.coach;
  const currentPresetName = preset.name;
  const listOptions = GRADE_ORDER.map(
    (k) => `<option value="${k}" ${s.grade === k ? "selected" : ""}>${WORD_LISTS[k].label}</option>`
  )
    .concat(
      Store.data.customLists.map(
        (l) => `<option value="${l.id}" ${s.grade === l.id ? "selected" : ""}>${escapeHtml(l.name)}</option>`
      )
    )
    .join("");

  $("#tab-settings").innerHTML = `
    <div class="field">
      <label>Learning track</label>
      <div class="choices" style="max-width:440px">
        <button type="button" class="choice" id="stage-speller" aria-pressed="${Store.data.stage !== "explorer"}">
          <span class="emoji">🎀</span><b>Big Kid</b><small>Reading &amp; spelling words</small></button>
        <button type="button" class="choice" id="stage-explorer" aria-pressed="${Store.data.stage === "explorer"}">
          <span class="emoji">🔤</span><b>Little Learner</b><small>Letters &amp; sounds</small></button>
      </div>
      <p class="muted" style="font-size:13px;margin-top:6px">
        Switch any time — this only changes which games show up on ${escapeHtml(playerName())}'s home screen.</p>
    </div>
    ${
      Store.data.stage === "explorer"
        ? `<div class="field">
             <label>Letter level</label>
             <select class="select" id="set-letter-level">
               <option value="upper" ${Store.data.earlyLearner.level === "upper" ? "selected" : ""}>Uppercase letters</option>
               <option value="lower" ${Store.data.earlyLearner.level === "lower" ? "selected" : ""}>Lowercase letters</option>
               <option value="sound" ${Store.data.earlyLearner.level === "sound" ? "selected" : ""}>Letter sounds</option>
             </select>
             <p class="muted" style="font-size:13px;margin-top:6px">
               This normally moves forward by itself as she gets more of a level right — set it directly
               if she's ready for more, or needs a bit longer somewhere.</p>
           </div>`
        : ""
    }
    <div class="field">
      <label>Default word list</label>
      <select class="select" id="set-grade">${listOptions}</select>
    </div>
    <div class="field">
      <label>Default sport</label>
      <select class="select" id="set-sport">
        <option value="gym" ${s.sport === "gym" ? "selected" : ""}>Gymnastics</option>
        <option value="cheer" ${s.sport === "cheer" ? "selected" : ""}>Cheerleading</option>
        <option value="dance" ${s.sport === "dance" ? "selected" : ""}>Dance</option>
        <option value="both" ${s.sport === "both" ? "selected" : ""}>Mix of All Three</option>
      </select>
    </div>
    <div class="field">
      <label>Competition length</label>
      <select class="select" id="set-length">
        ${[6, 10, 16, 20].map((n) => `<option value="${n}" ${s.routineLength === n ? "selected" : ""}>${n} words</option>`).join("")}
      </select>
    </div>
    <div class="field">
      <label>Reading voice</label>
      <p class="muted" style="font-size:15px">
        Currently <b>${escapeHtml(currentPresetName)}</b>${s.voiceName ? ` · ${escapeHtml(s.voiceName)}` : ""}
        ${voices.length ? "" : " · <span>no voices loaded yet</span>"}
      </p>
      <div class="row">
        <button class="btn small" id="set-open-voice">🎤 Choose the coach's voice</button>
        <button class="btn small ghost" id="set-test-voice">🔊 Test</button>
      </div>
    </div>

    <div class="field">
      <label>Helpers</label>
      <label class="toggle"><input type="checkbox" id="set-speech" ${s.speech ? "checked" : ""}> Read words aloud</label>
      <label class="toggle" style="margin-top:8px"><input type="checkbox" id="set-autospeak" ${s.autoSpeak ? "checked" : ""}> Say each word automatically</label>
      <label class="toggle" style="margin-top:8px"><input type="checkbox" id="set-boxes" ${s.letterBoxes ? "checked" : ""}> Show a box for every letter <span class="muted">(reveals the word length)</span></label>
      <label class="toggle" style="margin-top:8px"><input type="checkbox" id="set-sfx" ${s.sfx ? "checked" : ""}> Sound effects and crowd</label>
    </div>

    <h3 style="margin-top:24px">Save file</h3>
    <p class="muted">Progress lives in this browser's local storage. Back it up before clearing browser data or moving to another device.</p>
    <div class="row">
      <button class="btn small ghost" id="set-export">⬇ Download backup</button>
      <button class="btn small ghost" id="set-import">⬆ Restore backup</button>
      <input type="file" id="set-import-file" accept="application/json" style="display:none">
    </div>

    <h3 style="margin-top:24px">Playing on other devices</h3>
    ${renderSyncSection(Store.data.sync)}

    <h3 style="margin-top:24px">Danger zone</h3>
    <div class="row">
      <button class="btn small ghost" id="set-reset-stats">Clear stats only</button>
      <button class="btn small" style="background:var(--red);box-shadow:0 4px 0 #991b1b" id="set-reset-all">Reset everything</button>
    </div>

    <p class="muted" style="font-size:12px;margin-top:24px">App version ${APP_VERSION}</p>`;

  const bind = (id, ev, fn) => {
    const el = $(id);
    if (el) el.addEventListener(ev, fn);
  };

  bind("#stage-speller", "click", () => {
    Store.setStage("speller");
    renderSettingsTab();
    refreshHome();
    toast(`${playerName()} is set to Big Kid mode.`);
  });
  bind("#stage-explorer", "click", () => {
    Store.setStage("explorer");
    renderSettingsTab();
    refreshHome();
    toast(`${playerName()} is set to Little Learner mode.`);
  });
  bind("#set-letter-level", "change", (e) => Store.setLetterLevel(e.target.value));

  bind("#set-grade", "change", (e) => Store.setSetting("grade", e.target.value));
  bind("#set-sport", "change", (e) => Store.setSetting("sport", e.target.value));
  bind("#set-length", "change", (e) => Store.setSetting("routineLength", Number(e.target.value)));
  bind("#set-open-voice", "click", () => showScreen("voice"));
  bind("#set-test-voice", "click", () => speaker.prompt("cartwheel", "She did a beautiful cartwheel."));
  bind("#set-speech", "change", (e) => {
    Store.setSetting("speech", e.target.checked);
    speaker.enabled = e.target.checked;
  });
  bind("#set-autospeak", "change", (e) => Store.setSetting("autoSpeak", e.target.checked));
  bind("#set-boxes", "change", (e) => Store.setSetting("letterBoxes", e.target.checked));
  bind("#set-sfx", "change", (e) => {
    Store.setSetting("sfx", e.target.checked);
    sfx.enabled = e.target.checked;
  });

  bind("#set-export", "click", () => {
    const blob = new Blob([Store.exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mila-spelling-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  bind("#set-import", "click", () => $("#set-import-file").click());
  bind("#set-import-file", "change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        Store.importJSON(String(reader.result));
        toast("Backup restored.");
        applyProfileSettings();
        renderParents();
        refreshHome();
      } catch (err) {
        toast("That file didn't look like a backup.");
      }
    };
    reader.readAsText(file);
  });

  bind("#sync-enable", "click", () => {
    Store.setLocalOnly(false);
    renderSettingsTab();
    toast("Sync turned back on.");
  });
  bind("#sync-regenerate", "click", () => {
    if (!confirm("The old code will stop working on any other linked device. Continue?")) return;
    Store.rotateSyncCode();
    renderSettingsTab();
    toast("New code generated.");
  });
  bind("#sync-disable", "click", () => {
    if (!confirm(`${playerName()}'s progress will stop leaving this device — any other linked device keeps whatever it last saw. Continue?`)) return;
    Store.setLocalOnly(true);
    renderSettingsTab();
    toast("Playing offline only now.");
  });
  bind("#sync-copy", "click", () => {
    const url = `${location.origin}${location.pathname}?code=${Store.data.sync.code}`;
    navigator.clipboard.writeText(url).then(
      () => toast("Remote link copied."),
      () => toast(url) // clipboard access denied — show it so it can be copied by hand
    );
  });
  bind("#sync-link", "click", async () => {
    const code = $("#sync-link-code").value.trim().toUpperCase();
    if (!code) return toast("Type a code first.");
    if (!confirm(`This replaces ${playerName()}'s local progress with whatever's synced under that code. Continue?`)) return;
    const ok = await Store.linkWithCode(code);
    if (ok) {
      applyProfileSettings();
      renderParents();
      refreshHome();
      toast("Linked! This device now shares that profile's progress.");
    } else {
      toast("Couldn't find that code — check it and try again.");
    }
  });

  bind("#set-reset-stats", "click", () => {
    if (!confirm("Clear all practice history? Stars and unlocked items are kept.")) return;
    Store.data.stats = { words: {}, sessions: [], attempts: 0, correct: 0 };
    Store.data.best = { score: 0, streak: 0 };
    Store.data.medals = { gold: 0, silver: 0, bronze: 0, ribbon: 0 };
    Store.save();
    renderParents();
    refreshHome();
    toast("Stats cleared.");
  });
  bind("#set-reset-all", "click", () => {
    if (!confirm(`Reset EVERYTHING for ${playerName()} — stats, stars, unlocked items and custom lists?\n\nOther players are not affected.`)) return;
    if (!confirm("Really sure? This cannot be undone.")) return;
    Store.reset();
    applyProfileSettings();
    renderParents();
    refreshHome();
    toast(`${playerName()}'s progress reset.`);
  });
}

/* ============================================================
   helpers
   ============================================================ */

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

document.addEventListener("DOMContentLoaded", init);
