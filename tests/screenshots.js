/* Builds throwaway copies of index.html that drive themselves, so headless
   Edge can screenshot real game states. */
const fs = require("fs");
const root = require("path").join(__dirname, "..") + "/";
const html = fs.readFileSync(root + "index.html", "utf8").replace(/(href|src)="(css|js|dist)\//g, '$1="../$2/');

const preamble = `
  window.onerror=(m,src,l,c)=>{document.title='ERR '+m+' @line '+l;};
  // The headless frame clock is nearly stopped, so any CSS fade-in would be
  // captured at opacity 0. Kill animations outright for screenshots.
  const _st = document.createElement('style');
  _st.textContent = '*,*::before,*::after{animation:none !important;transition:none !important}';
  document.head.appendChild(_st);
  // app.js is bundled as an ES module now, so its top-level bindings aren't
  // page globals — window.__app is the explicit debug surface it exposes
  // for exactly this driver script (see js/app.js). Most of these are
  // stable for the page's whole lifetime (Store, arena, functions) and are
  // safe to destructure once here. session/letterSession are NOT — they get
  // reassigned wholesale by startSession()/startLetterRound(), so they stay
  // window.__app.session / window.__app.letterSession everywhere below
  // instead of being captured as a stale snapshot.
  const { Store, arena, sfx, speaker, SKILL_BY_ID, poseFrom, submitAnswer,
    showScreen, refreshHome, startSession, advance, startLetterRound,
    currentLetterItem, finishLetterRound, renderParents, announceSkill,
    setParentsUnlocked, startParagraphSession, advanceParaBlank } = window.__app;
  Store.reset();                       // driver pages share one file:// origin
  arena.gymnast.setLook(Store.data.look);
  sfx.enabled = false; speaker.enabled = false; speaker.supported = false;
  Store.data.settings.autoSpeak = false;
  const answer = (right) => {
    const s = window.__app.session;
    const w = s.queue[s.index % s.queue.length][0];
    document.querySelector('#spell-input').value = right ? w : w.slice(0, 2) + 'x' + w.slice(3);
    submitAnswer();
  };
  const freeze = () => { if (arena.animator.raf) cancelAnimationFrame(arena.animator.raf); };
`;

/* Headless virtual time barely advances performance.now() and fires almost no
   rAF, so the animator can never finish a skill and the normal auto-advance
   never fires. Drivers therefore call advance() themselves and pose the figure
   by hand for the arena shot. */
const drivers = {
  setup: `document.querySelector('[data-mode="competition"]').click();`,

  home: `
    Store.addStars(34);
    Store.setGoal('bow', 'big');
    Object.assign(Store.data.visit, { dayStreak: 4, bestDayStreak: 4, lastBonusDay: null });
    refreshHome();
    showScreen('home');`,

  "game-correct": `
    Store.addStars(6);
    startSession({ mode:'competition', sport:'gym', list:'g3', length:10 });
    setTimeout(() => {
      for (let i = 0; i < 3; i++) { answer(true); advance(); }
      answer(true);
      const sk = SKILL_BY_ID.cartwheel;                 // hold mid-cartwheel
      arena.gymnast.setPose(poseFrom(sk.frames[3].p));
      announceSkill(sk);
    }, 800);`,

  "game-wrong": `
    startSession({ mode:'practice', sport:'cheer', list:'g3', length:10 });
    setTimeout(() => { answer(true); advance(); answer(false); }, 800);`,

  // 3 misses in a row on the same word reaches the multiple-choice fallback
  "game-wrong-mc": `
    startSession({ mode:'practice', sport:'cheer', list:'g3', length:10 });
    setTimeout(() => { answer(false); answer(false); answer(false); }, 800);`,

  results: `
    startSession({ mode:'competition', sport:'both', list:'g3', length:6 });
    setTimeout(() => {
      for (let n = 0; n < 6 && window.__app.session; n++) { answer(n !== 2); advance(); }
    }, 800);`,

  /* The pattern moment (docs/HANDOFF-ELEVATION.md §6.1) on its worst-case
     input: `wrng` for `much` shares not one letter position with the answer,
     which is the exact case §4.6 caught the old "So close!" copy fumbling.
     The queue is overridden rather than fished for, so this always shows the
     same word and the same lesson. */
  "game-lesson": `
    startSession({ mode:'practice', sport:'gym', list:'g1', length:10 });
    setTimeout(() => {
      const s = window.__app.session;
      s.queue = [['much','I like gym so much.']];
      s.index = 0;
      document.querySelector('#spell-input').value = 'wrng';
      submitAnswer();
    }, 800);`,

  // the new story stage (§5.1) — scenery, story card and the active blank
  "story-play": `
    Store.addStars(12);
    startParagraphSession({ mode:'practice', sport:'gym', grade:'g2' });`,

  // and its retry card, which carries the same pattern lesson word mode does
  "story-lesson": `
    startParagraphSession({ mode:'practice', sport:'gym', grade:'g2' });
    setTimeout(() => {
      document.querySelector('#para-input').value = 'zzzz';
      document.querySelector('#btn-para-submit').click();
    }, 900);`,

  // the in-design confirm that replaced native confirm() (§4.4)
  "modal-confirm": `
    setParentsUnlocked(true);
    showScreen('parents'); renderParents();
    document.querySelector('.tab[data-tab="settings"]').click();
    setTimeout(() => document.querySelector('#set-reset-stats').click(), 200);`,

  voice: `showScreen('voice');`,

  welcome: `Store.firstRun = true; showScreen('profiles');`,

  profiles: `
    Store.renameProfile(Store.file.activeId, 'Mila');
    Store.addStars(120);
    Store.recordAttempt('cartwheel', true, 2000, false);
    Store.recordSession({ ts: Date.now(), mode:'competition', total:10, correct:9,
                          hints:0, bestStreak:6, ms:200000, score:9.2, medal:'gold', listLabel:'Grade 3' });
    const sib = Store.createProfile('Nora');
    Store.file.profiles[sib.id].stars = 15;
    Store.firstRun = false;
    showScreen('profiles');`,

  studio: `
    Store.addStars(70);
    ['hair.braids','hairColor.auburn','outfit.leoSparkle','outfitColor.teal','hands.pompoms','shoes.sneakers']
      .forEach(s => { const [slot,id] = s.split('.'); Store.buy(slot,id); Store.setLook({[slot]:id}); });
    Store.addStars(60);
    showScreen('studio');
    document.querySelector('.cat-tab[data-slot="bow"]').click();   // only the active tab's items exist in the DOM
    document.querySelector('.item[data-slot="bow"][data-id="sparkle"]').click();  // try-on state`,

  // trying on something she cannot afford yet, which is where the goal can be pinned
  "studio-saving": `
    Store.addStars(28);
    showScreen('studio');
    document.querySelector('.cat-tab[data-slot="bow"]').click();
    document.querySelector('.item[data-slot="bow"][data-id="crown"]').click();`,

  "explorer-home": `
    Store.setStage('explorer');
    refreshHome();
    showScreen('home');`,

  "letters-play": `
    Store.setStage('explorer');
    startLetterRound();`,

  "letters-tap-wrong": `
    Store.setStage('explorer');
    startLetterRound();
    setTimeout(() => {
      const item = currentLetterItem();
      const wrongBtn = document.querySelector('.letter-choice:not([data-letter="' + item.id + '"])');
      if (wrongBtn) wrongBtn.click();
    }, 900);`,

  "letters-summary": `
    Store.setStage('explorer');
    startLetterRound();
    setTimeout(() => {
      const ls = window.__app.letterSession;
      ls.results = ls.queue.map((id) => ({ id, firstTry: true }));
      ls.correct = ls.queue.length;
      ls.bestStreak = ls.queue.length;
      ls.stars = ls.queue.length;
      finishLetterRound();
    }, 900);`,

  "letters-parents": `
    Store.setStage('explorer');
    ['A','B','C','D','E'].forEach((id) => {
      for (let i = 0; i < 5; i++) Store.recordLetterAttempt(id, 'upper', i % 4 !== 0);
    });
    setParentsUnlocked(true);
    showScreen('parents'); renderParents();`,

  "letters-parents-settings": `
    Store.setStage('explorer');
    setParentsUnlocked(true);
    showScreen('parents'); renderParents();
    document.querySelector('.tab[data-tab="settings"]').click();`,

  parents: `
    const words = ['beautiful','because','straight','gymnast','ribbon','practice','favorite','balance','listen','medal'];
    words.forEach((w, i) => {
      for (let k = 0; k < 3 + (i % 3); k++) Store.recordAttempt(w, !(i % 3 === 0 && k < 2), 3000 + i * 400, k === 0 && i % 4 === 0);
    });
    for (let i = 0; i < 9; i++) Store.recordSession({
      ts: Date.now() - (9 - i) * 864e5, mode: i % 2 ? 'competition' : 'practice',
      sport: 'gym', listKey: 'g3', listLabel: 'Grade 3',
      total: 10, correct: 5 + (i % 6), hints: i % 3, bestStreak: 2 + (i % 5),
      ms: 240000, score: i % 2 ? 7 + (i % 4) * 0.6 : 0,
      medal: i % 2 ? ['bronze','silver','gold','ribbon'][i % 4] : null
    });
    setParentsUnlocked(true);
    showScreen('parents'); renderParents();`
};

fs.mkdirSync(root + "_debug", { recursive: true });
for (const [name, body] of Object.entries(drivers)) {
  const page = html.replace(
    "</body>",
    // the trailing newline matters: a `//` comment on the driver's last line
    // would otherwise swallow the closing braces and break the whole script
    `<script>window.addEventListener('load',()=>setTimeout(()=>{${preamble}\n${body}\n},60));</script>\n</body>`
  );
  fs.writeFileSync(`${root}_debug/auto-${name}.html`, page);
}
console.log("wrote " + Object.keys(drivers).length + " driver pages");
