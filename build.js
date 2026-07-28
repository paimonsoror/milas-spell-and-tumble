// Bundles js/app.js (which imports everything else) into a single classic
// script the browser can load with a plain <script> tag — no `type="module"`
// needed, so this stays a drop-in replacement for the old 8-tag setup.
const { build } = require("esbuild");
const sharp = require("sharp");
const fs = require("fs");

const ICON_SIZES = [
  { size: 192, file: "dist/icons/icon-192.png" },
  { size: 512, file: "dist/icons/icon-512.png" },
  { size: 180, file: "dist/icons/icon-180.png" } // the fixed size Apple's apple-touch-icon expects
];

async function main() {
  await build({
    entryPoints: ["js/app.js"],
    bundle: true,
    format: "iife",
    outfile: "dist/game.js",
    sourcemap: true,
    target: "es2020"
  });
  console.log("Built dist/game.js");

  fs.mkdirSync("dist/icons", { recursive: true });
  const svg = fs.readFileSync("assets/icon.svg");
  for (const { size, file } of ICON_SIZES) {
    await sharp(svg).resize(size, size).png().toFile(file);
  }
  console.log(`Built ${ICON_SIZES.length} icons in dist/icons/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
