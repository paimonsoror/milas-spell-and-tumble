// Barrel entry so tests/check.js can get at every non-DOM module's exports
// through a single esbuild bundle (globalName: "TestCore") instead of relying
// on classic-script global-scope concatenation, which stopped working once
// js/*.js became real ES modules. Deliberately the same 6 files check.js has
// always loaded — audio.js/app.js need a DOM and stay out of this harness.
export * from "../js/words.js";
export * from "../js/letters.js";
export * from "../js/language.js";
export * from "../js/avatar.js";
export * from "../js/skills.js";
export * from "../js/store.js";
