// Bundles js/app.js (which imports everything else) into a single classic
// script the browser can load with a plain <script> tag — no `type="module"`
// needed, so this stays a drop-in replacement for the old 8-tag setup.
const { build } = require("esbuild");

build({
  entryPoints: ["js/app.js"],
  bundle: true,
  format: "iife",
  outfile: "dist/game.js",
  sourcemap: true,
  target: "es2020",
}).then(() => {
  console.log("Built dist/game.js");
}).catch(() => process.exit(1));
