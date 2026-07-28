/* Jointed SVG gymnast.
   Geometry is local to the hips: hip = (0,0), head up at negative Y,
   feet at +54. Every joint is a <g> we rotate; 0 degrees always means
   "this segment points straight down". Positive degrees rotate clockwise
   on screen, so an arm at 180 is straight overhead. */

const RIG = {
  torsoLen: 34,
  neckY: -36,
  headY: -50,
  headR: 13,
  shoulderY: -30,
  shoulderX: 3,
  upperArm: 22,
  foreArm: 20,
  hipX: 6,
  thigh: 28,
  shin: 26,
  footLen: 10,
  floorFromHip: 54
};

/* ---------- customization catalog ---------- */

const SKIN_TONES = [
  { id: "s7", color: "#ffe8d6" },
  { id: "s1", color: "#f7d9c4" },
  { id: "s2", color: "#f0c49b" },
  { id: "s3", color: "#dda27c" },
  { id: "s4", color: "#c1805a" },
  { id: "s5", color: "#9c5f3d" },
  { id: "s8", color: "#8a5636" },
  { id: "s6", color: "#6f4229" }
];

const CATALOG = {
  hair: {
    label: "Hairstyle",
    icon: "💇",
    items: [
      { id: "ponytail", name: "Ponytail", cost: 0 },
      { id: "bun", name: "Top Bun", cost: 0 },
      { id: "buns", name: "Double Buns", cost: 15 },
      { id: "pigtails", name: "Pigtails", cost: 20 },
      { id: "spiky", name: "Spiky Short", cost: 20 },
      { id: "braids", name: "Braids", cost: 25 },
      { id: "sideSwept", name: "Side-Swept", cost: 30 },
      { id: "bob", name: "Bob Cut", cost: 30 },
      { id: "puff", name: "Curly Puff", cost: 35 },
      { id: "halfUp", name: "Half-Up", cost: 40 },
      { id: "long", name: "Long & Flowing", cost: 50 },
      { id: "waves", name: "Long Waves", cost: 65 }
    ]
  },
  hairColor: {
    label: "Hair Color",
    icon: "🎨",
    items: [
      { id: "brown", name: "Brown", cost: 0, swatch: "#6b4226" },
      { id: "blonde", name: "Blonde", cost: 0, swatch: "#e0b866" },
      { id: "black", name: "Black", cost: 0, swatch: "#2b2b33" },
      { id: "auburn", name: "Auburn", cost: 10, swatch: "#9c4a2a" },
      { id: "pink", name: "Bubblegum", cost: 30, swatch: "#ff7bb5" },
      { id: "purple", name: "Violet", cost: 40, swatch: "#a86bd8" },
      { id: "blue", name: "Ocean Blue", cost: 40, swatch: "#4fa8d8" },
      { id: "red", name: "Cherry Red", cost: 20, swatch: "#c23b3b" },
      { id: "silver", name: "Silver", cost: 25, swatch: "#c7cad1" },
      { id: "mint", name: "Mint", cost: 35, swatch: "#7de0c2" },
      { id: "lavender", name: "Lavender", cost: 35, swatch: "#c9b6f2" },
      { id: "copper", name: "Copper", cost: 25, swatch: "#c17a4a" },
      { id: "teal", name: "Teal", cost: 45, swatch: "#2f9e93" },
      { id: "sunset", name: "Sunset", cost: 85, swatch: "linear-gradient(90deg,#ff7bb5,#ff9d5c,#ffd166)" },
      { id: "rainbow", name: "Rainbow", cost: 90, swatch: "linear-gradient(90deg,#ff6b6b,#ffd166,#6bd88a,#4fa8d8,#a86bd8)" }
    ]
  },
  outfit: {
    label: "Uniform",
    icon: "👚",
    items: [
      { id: "leo", name: "Leotard", cost: 0, sport: "gym" },
      { id: "cheerA", name: "Cheer Uniform", cost: 0, sport: "cheer" },
      { id: "colorBlockLeo", name: "Color-Block Leotard", cost: 25, sport: "gym" },
      { id: "leoSparkle", name: "Sparkle Leotard", cost: 20, sport: "gym" },
      { id: "jazzUnitard", name: "Jazz Unitard", cost: 35, sport: "dance" },
      { id: "unitard", name: "Long-Sleeve Unitard", cost: 35, sport: "gym" },
      { id: "tutu", name: "Ballet Tutu", cost: 40, sport: "dance" },
      { id: "cheerLong", name: "Long-Sleeve Cheer", cost: 45, sport: "cheer" },
      { id: "cheerSparkle", name: "Sparkle Cheer", cost: 50, sport: "cheer" },
      { id: "cheerB", name: "Pleated Cheer Skirt", cost: 30, sport: "cheer" },
      { id: "unitardSparkle", name: "Sparkle Unitard", cost: 55, sport: "gym" },
      { id: "champion", name: "Champion Sequins", cost: 120, sport: "any" }
    ]
  },
  outfitColor: {
    label: "Uniform Color",
    icon: "🌈",
    items: [
      { id: "purple", name: "Purple", cost: 0, main: "#8b5cf6", accent: "#c4b5fd" },
      { id: "pink", name: "Hot Pink", cost: 0, main: "#ec4899", accent: "#fbcfe8" },
      { id: "teal", name: "Teal", cost: 10, main: "#14b8a6", accent: "#99f6e4" },
      { id: "red", name: "Fire Red", cost: 10, main: "#ef4444", accent: "#fecaca" },
      { id: "blue", name: "Royal Blue", cost: 20, main: "#3b82f6", accent: "#bfdbfe" },
      { id: "gold", name: "Gold", cost: 60, main: "#f59e0b", accent: "#fde68a" },
      { id: "mint", name: "Mint", cost: 15, main: "#2dd4a7", accent: "#bbf7e6" },
      { id: "lavender", name: "Lavender", cost: 15, main: "#a78bfa", accent: "#ddd6fe" },
      { id: "sky", name: "Sky Blue", cost: 15, main: "#38bdf8", accent: "#dbeafe" },
      { id: "coral", name: "Coral", cost: 25, main: "#fb7185", accent: "#fecdd3" },
      { id: "black", name: "Classic Black", cost: 30, main: "#27272a", accent: "#d4d4d8" },
      { id: "emerald", name: "Emerald", cost: 45, main: "#059669", accent: "#a7f3d0" },
      { id: "silver", name: "Silver", cost: 45, main: "#94a3b8", accent: "#e2e8f0" },
      { id: "roseGold", name: "Rose Gold", cost: 70, main: "#d88c8c", accent: "#fde3e3" },
      { id: "galaxy", name: "Galaxy", cost: 100, main: "#4c1d95", accent: "#f0abfc" }
    ]
  },
  bow: {
    label: "Bow",
    icon: "🎀",
    items: [
      { id: "none", name: "No Bow", cost: 0 },
      { id: "small", name: "Little Bow", cost: 0 },
      { id: "clip", name: "Barrette Clip", cost: 12 },
      { id: "headband", name: "Headband", cost: 18 },
      { id: "big", name: "Big Cheer Bow", cost: 20 },
      { id: "flower", name: "Flower Clip", cost: 25 },
      { id: "double", name: "Double Bows", cost: 40 },
      { id: "star", name: "Star Clip", cost: 45 },
      { id: "sparkle", name: "Sparkle Bow", cost: 55 },
      { id: "crown", name: "Tiara", cost: 110 }
    ]
  },
  hands: {
    label: "In Her Hands",
    icon: "🙌",
    items: [
      { id: "none", name: "Nothing", cost: 0 },
      { id: "wristbands", name: "Wristbands", cost: 15 },
      { id: "flowers", name: "Flower Bouquet", cost: 20 },
      { id: "pompoms", name: "Pom-Poms", cost: 25 },
      { id: "flags", name: "Cheer Flags", cost: 40 },
      { id: "fan", name: "Dance Fan", cost: 40 },
      { id: "ribbon", name: "Rhythmic Ribbon", cost: 70 },
      { id: "megaphone", name: "Megaphone", cost: 75 }
    ]
  },
  shoes: {
    label: "Feet",
    icon: "👟",
    items: [
      { id: "bare", name: "Barefoot", cost: 0 },
      { id: "socks", name: "Grip Socks", cost: 10 },
      { id: "stripedSocks", name: "Striped Socks", cost: 18 },
      { id: "sneakers", name: "Cheer Sneakers", cost: 25 },
      { id: "balletFlats", name: "Ballet Flats", cost: 30 },
      { id: "jazzShoes", name: "Jazz Shoes", cost: 35 },
      { id: "sparkle", name: "Sparkle Shoes", cost: 65 },
      { id: "rainbowSneakers", name: "Rainbow Sneakers", cost: 95 }
    ]
  },
  trail: {
    label: "Magic Trail",
    icon: "✨",
    items: [
      { id: "none", name: "None", cost: 0 },
      { id: "glitterDust", name: "Glitter Dust", cost: 20 },
      { id: "sparkles", name: "Sparkles", cost: 30 },
      { id: "bubbles", name: "Bubbles", cost: 35 },
      { id: "stars", name: "Stars", cost: 45 },
      { id: "hearts", name: "Hearts", cost: 45 },
      { id: "petals", name: "Flower Petals", cost: 45 },
      { id: "musicNotes", name: "Music Notes", cost: 60 },
      { id: "confetti", name: "Confetti", cost: 65 },
      { id: "rainbow", name: "Rainbow Streak", cost: 80 },
      { id: "fire", name: "Comet", cost: 150 }
    ]
  }
};

const DEFAULT_LOOK = {
  skin: "s2",
  hair: "ponytail",
  hairColor: "brown",
  outfit: "leo",
  outfitColor: "purple",
  bow: "small",
  hands: "none",
  shoes: "bare",
  trail: "none"
};

const NEUTRAL_POSE = {
  px: 0, py: 0, rot: 0, sq: 0,
  torso: 0, head: 0,
  shL: 10, elL: 0, shR: -10, elR: 0,
  hpL: 4, knL: 0, hpR: -4, knR: 0
};

function poseFrom(overrides) {
  return Object.assign({}, NEUTRAL_POSE, overrides || {});
}

/* ---------- shared markup builders ----------
   Hair, bow, and trail markup are string templates so both the live Gymnast
   rig (setLook, below) and the avatar-studio thumbnails (buildThumbnail) can
   draw identical art without the studio re-deriving its own copy that could
   drift from what the figure actually looks like. */

const HEAD_Y = RIG.headY - RIG.neckY; // head centre, in neck-local space

function hairMarkup(hairId, hairColor) {
  const hy = HEAD_Y;
  // The cap sits behind the face circle, so only a crescent of it shows —
  // that reads as a hairline no matter which style is on top of it.
  const cap = `<circle cx="0" cy="${hy - 3}" r="${RIG.headR + 2.5}" fill="${hairColor}"/>`;
  const fringe = `<path d="M -13,${hy - 3} a 13,11 0 0 1 26,0 q -6,4 -13,1 q -7,-3 -13,-1 Z" fill="${hairColor}"/>`;

  const styles = {
    ponytail: {
      back: cap + `<path d="M -7,${hy - 7} q -21,7 -19,27 q 11,-4 13,-15 q 3,-8 6,-12 Z" fill="${hairColor}"/>`,
      front: fringe
    },
    bun: {
      back: cap,
      front: fringe + `<circle cx="0" cy="${hy - RIG.headR - 7}" r="8" fill="${hairColor}"/>`
    },
    buns: {
      back: cap,
      front:
        fringe +
        `<circle cx="-12" cy="${hy - RIG.headR - 2}" r="7" fill="${hairColor}"/>` +
        `<circle cx="12" cy="${hy - RIG.headR - 2}" r="7" fill="${hairColor}"/>`
    },
    braids: {
      back:
        cap +
        `<path d="M -13,${hy - 1} q -9,15 -5,27" stroke="${hairColor}" stroke-width="7" fill="none" stroke-linecap="round"/>
         <path d="M 13,${hy - 1} q 9,15 5,27" stroke="${hairColor}" stroke-width="7" fill="none" stroke-linecap="round"/>`,
      front: fringe
    },
    puff: {
      back:
        cap +
        [[-13, -8, 9], [13, -8, 9], [0, -17, 11], [-10, -16, 8], [10, -16, 8], [-15, 1, 7], [15, 1, 7]]
          .map(([x, dy, r]) => `<circle cx="${x}" cy="${hy + dy}" r="${r}" fill="${hairColor}"/>`)
          .join(""),
      front: ""
    },
    long: {
      back: cap + `<path d="M -14,${hy - 3} q -11,27 -5,45 q 19,5 38,0 q 6,-18 -5,-45 Z" fill="${hairColor}"/>`,
      front: fringe
    },
    pigtails: {
      back:
        cap +
        `<path d="M -12,${hy - 1} q -16,6 -14,20 q 8,-3 10,-11 q 2,-6 4,-9 Z" fill="${hairColor}"/>` +
        `<path d="M 12,${hy - 1} q 16,6 14,20 q -8,-3 -10,-11 q -2,-6 -4,-9 Z" fill="${hairColor}"/>`,
      front: fringe
    },
    spiky: {
      back:
        cap +
        [[-13, -10], [13, -10], [0, -19], [-9, -17], [9, -17], [-16, -3], [16, -3]]
          .map(([x, dy]) => `<path d="M ${x - 3},${hy + dy + 6} L ${x},${hy + dy} L ${x + 3},${hy + dy + 6} Z" fill="${hairColor}"/>`)
          .join(""),
      front: ""
    },
    sideSwept: {
      back: cap + `<path d="M 10,${hy - 6} q 18,8 16,26 q -9,-4 -10,-13 q -2,-7 -6,-13 Z" fill="${hairColor}"/>`,
      front: fringe
    },
    bob: {
      back: cap + `<path d="M -15,${hy - 2} q -7,12 -3,20 q 17,5 34,0 q 4,-8 -3,-20 Z" fill="${hairColor}"/>`,
      front: fringe
    },
    halfUp: {
      back: cap + `<path d="M -14,${hy - 3} q -11,27 -5,45 q 19,5 38,0 q 6,-18 -5,-45 Z" fill="${hairColor}"/>`,
      front: fringe + `<circle cx="0" cy="${hy - RIG.headR - 6}" r="6" fill="${hairColor}"/>`
    },
    waves: {
      back:
        cap +
        `<path d="M -14,${hy - 3} q -11,27 -5,45 q 19,5 38,0 q 6,-18 -5,-45 Z" fill="${hairColor}"/>` +
        [[-17, 10], [-15, 24], [17, 14], [16, 30]]
          .map(([x, y]) => `<circle cx="${x}" cy="${hy + y}" r="5" fill="${hairColor}"/>`)
          .join(""),
      front: fringe
    }
  };
  return styles[hairId] || styles.ponytail;
}

function bowMarkup(bowId, oc) {
  const hy = HEAD_Y;
  const bowY = hy - RIG.headR - 2;
  // Rounded loops rather than triangles — triangles on top of a head read
  // as animal ears at this size.
  const loops = (fill, stroke) =>
    `<path d="M 0,0 C -9,-13 -22,-11 -20,0 C -22,11 -9,13 0,0 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>
     <path d="M 0,0 C 9,-13 22,-11 20,0 C 22,11 9,13 0,0 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>`;

  const bows = {
    none: "",
    small: `<g transform="translate(10,${bowY + 5}) scale(.5)">${loops(oc.accent, oc.main)}<ellipse rx="4.5" ry="5.5" fill="${oc.main}"/></g>`,
    big: `<g transform="translate(0,${bowY}) scale(.92)">${loops(oc.main, oc.accent)}<ellipse rx="4.5" ry="5.5" fill="${oc.accent}"/></g>`,
    sparkle: `<g transform="translate(0,${bowY})">${loops(oc.main, "#fff")}<ellipse rx="5" ry="6" fill="#fff"/>
           <g class="gy-shimmer"><circle cx="-13" cy="-4" r="1.7" fill="#fff"/><circle cx="13" cy="5" r="1.7" fill="#fff"/><circle cx="-11" cy="6" r="1.3" fill="#fff"/><circle cx="12" cy="-6" r="1.3" fill="#fff"/></g></g>`,
    crown: `<g transform="translate(0,${bowY + 5})"><path d="M -13,4 L -13,-4 L -6.5,2 L 0,-8 L 6.5,2 L 13,-4 L 13,4 Z" fill="#fcd34d" stroke="#b45309" stroke-width="1"/>
           <circle cx="0" cy="-9" r="2.4" fill="#f472b6"/><circle cx="-9" cy="-2" r="1.8" fill="#60a5fa"/><circle cx="9" cy="-2" r="1.8" fill="#60a5fa"/></g>`,
    headband: `<path d="M -13,${hy - 2} a 13,10 0 0 1 26,0" stroke="${oc.main}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    flower: `<g transform="translate(9,${bowY + 4})">
           ${[0, 72, 144, 216, 288].map((a) => `<g transform="rotate(${a})"><ellipse cx="0" cy="-6" rx="3.2" ry="5.5" fill="${oc.accent}"/></g>`).join("")}
           <circle r="3" fill="${oc.main}"/></g>`,
    star: `<g transform="translate(0,${bowY + 3}) scale(1.8)">
           <path d="M 0,-6 L 1.8,-1.8 L 6,0 L 1.8,1.8 L 0,6 L -1.8,1.8 L -6,0 L -1.8,-1.8 Z" fill="${oc.main}" stroke="${oc.accent}" stroke-width="0.8"/></g>`,
    double: `<g transform="translate(9,${bowY + 5}) scale(.42)">${loops(oc.accent, oc.main)}<ellipse rx="4.5" ry="5.5" fill="${oc.main}"/></g>
           <g transform="translate(-9,${bowY + 5}) scale(.42)">${loops(oc.accent, oc.main)}<ellipse rx="4.5" ry="5.5" fill="${oc.main}"/></g>`,
    clip: `<rect x="-9" y="${bowY - 2}" width="18" height="5" rx="2.5" fill="${oc.main}" stroke="${oc.accent}" stroke-width="1"/>`
  };
  return bows[bowId] || "";
}

const TRAIL_SHAPES = {
  sparkles: (x, y) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#ffffff" stroke="#e4d9fb" stroke-width=".6"/>`,
  stars: (x, y) => `<path transform="translate(${x},${y})" d="M 0,-6 L 1.8,-1.8 L 6,0 L 1.8,1.8 L 0,6 L -1.8,1.8 L -6,0 L -1.8,-1.8 Z" fill="#fde68a"/>`,
  hearts: (x, y) => `<path transform="translate(${x},${y})" d="M 0,4 C -6,-1 -5,-6 -2,-6 C 0,-6 0,-4 0,-4 C 0,-4 0,-6 2,-6 C 5,-6 6,-1 0,4 Z" fill="#fb7185"/>`,
  rainbow: (x, y, i) => `<circle cx="${x}" cy="${y}" r="4" fill="${["#ff6b6b", "#ffd166", "#6bd88a"][i % 3]}"/>`,
  fire: (x, y, i) => `<circle cx="${x}" cy="${y}" r="${3 + (i % 2) * 1.5}" fill="${["#f97316", "#fbbf24"][i % 2]}"/>`,
  glitterDust: (x, y, i) => `<circle cx="${x}" cy="${y}" r="${1.6 + (i % 2) * 0.6}" fill="#fde68a"/>`,
  bubbles: (x, y, i) => `<circle cx="${x}" cy="${y}" r="${3 + (i % 3)}" fill="#bae6fd" opacity=".7" stroke="#7dd3fc" stroke-width=".6"/>`,
  confetti: (x, y, i) => `<rect x="${x - 2.5}" y="${y - 2}" width="5" height="4" transform="rotate(${i * 47},${x},${y})" fill="${["#ff6b6b", "#4fa8d8", "#6bd88a", "#ffd166"][i % 4]}"/>`,
  musicNotes: (x, y) => `<g transform="translate(${x},${y})"><circle cx="-2" cy="4" r="2.6" fill="#a78bfa"/><line x1="0.4" y1="4" x2="0.4" y2="-6" stroke="#a78bfa" stroke-width="1.3"/><path d="M 0.4,-6 Q 5,-6 5,-2" stroke="#a78bfa" stroke-width="1.3" fill="none"/></g>`,
  petals: (x, y, i) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="2.6" fill="${i % 2 ? "#fbcfe8" : "#ffffff"}" transform="rotate(${i * 35},${x},${y})"/>`
};

// Static 3-dot preview matching the particle shapes Animator._spawnTrail
// (skills.js) draws for each trail id, so the studio thumbnail matches what
// actually spawns behind her during a skill.
function trailMarkup(trailId) {
  const draw = TRAIL_SHAPES[trailId];
  if (!draw) return `<circle cx="0" cy="0" r="3" fill="#e4d9fb"/>`;
  return [[-10, 6], [0, -6], [10, 6]].map(([x, y], i) => draw(x, y, i)).join("");
}

function gradientDefs(rainbowId, galaxyId) {
  let out = "";
  if (rainbowId) {
    out += `<linearGradient id="${rainbowId}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ff6b6b"/><stop offset="25%" stop-color="#ffd166"/>
      <stop offset="50%" stop-color="#6bd88a"/><stop offset="75%" stop-color="#4fa8d8"/>
      <stop offset="100%" stop-color="#a86bd8"/></linearGradient>`;
  }
  if (galaxyId) {
    out += `<linearGradient id="${galaxyId}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e1b4b"/><stop offset="55%" stop-color="#6d28d9"/>
      <stop offset="100%" stop-color="#f0abfc"/></linearGradient>`;
  }
  return out;
}

const prefersReducedMotion = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

let thumbSeq = 0;

/* Small static SVG previews for the avatar studio. Deliberately not live
   Gymnast instances — HANDOFF-UI.md §5.1 flags ~45 live rigs on one screen
   as too heavy, so thumbnails reuse the same markup builders setLook() calls
   instead of animating a full figure per catalog item. */
function buildThumbnail(slot, itemId, look) {
  const uid = "th" + ++thumbSeq;
  const skin = (SKIN_TONES.find((s) => s.id === look.skin) || SKIN_TONES[1]).color;
  const hairColorItem = CATALOG.hairColor.items.find((i) => i.id === look.hairColor) || CATALOG.hairColor.items[0];
  const hairColor = look.hairColor === "rainbow" ? `url(#${uid}-rb)` : hairColorItem.swatch;
  const oc = CATALOG.outfitColor.items.find((i) => i.id === look.outfitColor) || CATALOG.outfitColor.items[0];
  const main = look.outfitColor === "galaxy" ? `url(#${uid}-gx)` : oc.main;
  const defs = gradientDefs(look.hairColor === "rainbow" ? uid + "-rb" : "", look.outfitColor === "galaxy" ? uid + "-gx" : "");

  if (slot === "hair" || slot === "bow") {
    const hairMk = hairMarkup(slot === "hair" ? itemId : look.hair, hairColor);
    const bowSvg = bowMarkup(slot === "bow" ? itemId : look.bow, oc);
    return `<svg viewBox="-30 -34 60 64" class="thumb-svg" aria-hidden="true"><defs>${defs}</defs>
      ${hairMk.back}
      <circle cx="0" cy="${HEAD_Y}" r="${RIG.headR}" fill="${skin}"/>
      ${hairMk.front}${bowSvg}
    </svg>`;
  }

  if (slot === "outfit") {
    const isCheer = itemId === "cheerA" || itemId === "cheerB" || itemId === "cheerLong" || itemId === "cheerSparkle";
    const sleeved = itemId === "unitard" || itemId === "unitardSparkle" || itemId === "jazzUnitard" || itemId === "cheerLong";
    const isTutu = itemId === "tutu";
    const colorBlock = itemId === "colorBlockLeo";
    const trim = isCheer || itemId === "champion";
    const sparkly = itemId === "leoSparkle" || itemId === "champion" || itemId === "unitardSparkle" || itemId === "cheerSparkle";
    const sequins = sparkly
      ? [[-5, -22], [4, -16], [-3, -8], [6, -26], [0, -1], [-7, -14], [7, -5]]
          .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="${oc.accent}" opacity=".95"/>`)
          .join("")
      : "";
    const bodyPath = `M -11,2 C -13,-14 -10,-28 -8,${RIG.shoulderY} L 8,${RIG.shoulderY} C 10,-28 13,-14 11,2 Z`;
    const skirtPath = isTutu
      ? "M -15,-4 Q -24,10 -20,16 Q 0,22 20,16 Q 24,10 15,-4 Z"
      : "M -13,-4 L 13,-4 L 19,14 L -19,14 Z";
    const body = colorBlock
      ? `<path fill="${main}" d="${bodyPath}"/><clipPath id="${uid}-cb"><rect x="-16" y="-13" width="32" height="18"/></clipPath><path fill="${oc.accent}" clip-path="url(#${uid}-cb)" d="${bodyPath}"/>`
      : `<path fill="${main}" stroke="${oc.accent}" stroke-width="${sparkly ? 2 : 0}" d="${bodyPath}"/>`;
    return `<svg viewBox="-24 -34 48 56" class="thumb-svg" aria-hidden="true"><defs>${defs}</defs>
      ${body}
      ${
        sleeved
          ? `<path d="M -13,${RIG.shoulderY} L -4,${RIG.shoulderY} L -4,${RIG.shoulderY + 14} L -13,${RIG.shoulderY + 14} Z" fill="${main}"/>
             <path d="M 13,${RIG.shoulderY} L 4,${RIG.shoulderY} L 4,${RIG.shoulderY + 14} L 13,${RIG.shoulderY + 14} Z" fill="${main}"/>`
          : ""
      }
      ${isCheer || isTutu ? `<path fill="${oc.accent}" stroke="${main}" d="${skirtPath}"/>` : ""}
      ${trim ? `<path stroke="${oc.accent}" d="M -11,-6 L 11,-6"/>` : ""}
      ${sequins}
    </svg>`;
  }

  if (slot === "hands") {
    const wantPom = itemId === "pompoms";
    const wantBand = itemId === "wristbands";
    const wantRibbon = itemId === "ribbon";
    const wantFlowerHand = itemId === "flowers";
    const wantFlag = itemId === "flags";
    const wantFan = itemId === "fan";
    const wantMegaphone = itemId === "megaphone";
    const pompomMarkup = wantPom
      ? [[0, 0, 6], [-5, -4, 5], [5, -4, 5], [-5, 4, 5], [5, 4, 5], [0, 7, 4.5]]
          .map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 2 ? oc.accent : oc.main}" opacity=".95"/>`)
          .join("")
      : "";
    const flowerMarkup = wantFlowerHand
      ? `<ellipse cx="-4" cy="-8" rx="3" ry="4.5" fill="${oc.accent}"/><ellipse cx="4" cy="-8" rx="3" ry="4.5" fill="${oc.accent}"/><ellipse cx="0" cy="-13" rx="3" ry="4.5" fill="${oc.accent}"/><circle cx="0" cy="-8" r="2.5" fill="${oc.main}"/>`
      : "";
    return `<svg viewBox="-24 -20 48 44" class="thumb-svg" aria-hidden="true"><defs>${defs}</defs>
      <line x1="0" y1="-16" x2="0" y2="0" stroke="${skin}" stroke-width="9" stroke-linecap="round"/>
      <circle cx="0" cy="4" r="4.5" fill="${skin}"/>
      ${wantBand ? `<rect x="-5" y="-8" width="10" height="5" rx="2" fill="${oc.main}"/>` : ""}
      ${wantRibbon ? `<path d="M 0,4 Q 12,0 18,10 T 30,8" stroke="${oc.accent}" stroke-width="2" fill="none"/>` : ""}
      ${wantFlag ? `<line x1="0" y1="-2" x2="0" y2="-18" stroke="#94a3b8" stroke-width="1.5"/><path d="M 0,-18 L 12,-13 L 0,-8 Z" fill="${oc.main}"/>` : ""}
      ${wantFan ? `<path d="M 0,0 L -10,-14 A 14,14 0 0 1 10,-14 Z" fill="${oc.accent}" stroke="${oc.main}"/>` : ""}
      ${wantMegaphone ? `<path d="M 0,-2 L 6,-4 L 17,-13 L 15,-19 L 4,-11 L 0,-6 Z" fill="${oc.main}"/>` : ""}
      ${pompomMarkup}${flowerMarkup}
    </svg>`;
  }

  if (slot === "shoes") {
    const wantRainbowShoe = itemId === "rainbowSneakers";
    const extraDefs = wantRainbowShoe ? gradientDefs(`${uid}-shoerb`, "") : "";
    const lineShoeColor = { socks: "#f1f5f9", sneakers: "#ffffff", rainbowSneakers: `url(#${uid}-shoerb)` }[itemId];
    const showLine = itemId === "socks" || itemId === "sneakers" || itemId === "rainbowSneakers";
    const wantFlat = itemId === "balletFlats";
    const wantJazz = itemId === "jazzShoes";
    const wantStripe = itemId === "stripedSocks";
    const stripeMarkup = wantStripe
      ? `<rect x="0" y="-8" width="9" height="3" fill="${oc.main}"/><rect x="0" y="-4" width="9" height="3" fill="${oc.accent}"/><rect x="0" y="0" width="9" height="3" fill="${oc.main}"/>`
      : "";
    return `<svg viewBox="-16 -18 32 36" class="thumb-svg" aria-hidden="true"><defs>${defs}${extraDefs}</defs>
      <line x1="0" y1="-18" x2="0" y2="0" stroke="${skin}" stroke-width="9" stroke-linecap="round"/>
      ${showLine ? `<line x1="0" y1="0" x2="10" y2="0" stroke="${lineShoeColor}" stroke-width="8" stroke-linecap="round"/>` : ""}
      ${itemId === "sparkle" ? `<circle cx="4" cy="0" r="7" fill="${oc.accent}"/>` : ""}
      ${itemId === "bare" ? `<circle cx="4" cy="0" r="5" fill="${skin}"/>` : ""}
      ${wantFlat ? `<ellipse cx="5" cy="0" rx="7" ry="3" fill="#f8f3ee" stroke="#d8b48c"/><line x1="2" y1="-6" x2="2" y2="0" stroke="#d8b48c" stroke-width="1.5"/>` : ""}
      ${wantJazz ? `<rect x="0" y="-2" width="11" height="4" rx="2" fill="#d8b48c"/>` : ""}
      ${stripeMarkup}
    </svg>`;
  }

  if (slot === "trail") {
    return `<svg viewBox="-20 -14 40 28" class="thumb-svg" aria-hidden="true">${trailMarkup(itemId)}</svg>`;
  }

  return "";
}

/* ---------- the figure ---------- */

let avatarSeq = 0;

class Gymnast {
  constructor(svgEl, opts) {
    this.svg = svgEl;
    this.opts = opts || {};
    this.uid = "gy" + (++avatarSeq);
    this.look = Object.assign({}, DEFAULT_LOOK);
    this.pose = poseFrom();
    this.expression = "happy";
    // where the hips sit on the stage when standing, in viewBox units
    this.origin = { x: (opts && opts.x) || 350, y: (opts && opts.y) || 266 };
    this.facing = 1;
    this._build();
    this.setLook(this.look);
    this.setPose(this.pose);
    this._blinking = false;
    this._scheduleBlink();
  }

  _build() {
    const R = RIG;
    const u = this.uid;
    const o = this.opts;
    const zoom = o.zoom || 1;
    const zx = o.zoomX != null ? o.zoomX : this.origin.x;
    const zy = o.zoomY != null ? o.zoomY : this.origin.y + R.floorFromHip;
    const limb = (len, cls) =>
      `<line class="${cls}" x1="0" y1="0" x2="0" y2="${len}" />`;

    this.svg.innerHTML = `
      <defs>
        <radialGradient id="${u}-sparkle" cx="50%" cy="50%">
          <stop offset="0%" stop-color="#fff" stop-opacity="1"/>
          <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="${u}-rainbow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ff6b6b"/>
          <stop offset="25%" stop-color="#ffd166"/>
          <stop offset="50%" stop-color="#6bd88a"/>
          <stop offset="75%" stop-color="#4fa8d8"/>
          <stop offset="100%" stop-color="#a86bd8"/>
        </linearGradient>
        <linearGradient id="${u}-galaxy" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1e1b4b"/>
          <stop offset="55%" stop-color="#6d28d9"/>
          <stop offset="100%" stop-color="#f0abfc"/>
        </linearGradient>
        <linearGradient id="${u}-colorblock" x1="0" y1="0" x2="0" y2="1">
          <stop class="gy-cb-1" offset="50%" stop-color="#8b5cf6"/>
          <stop class="gy-cb-2" offset="50%" stop-color="#c4b5fd"/>
        </linearGradient>
      </defs>

      <!-- Zoom pivots on the floor centre, so scaling makes her bigger without
           lifting her off the mat or shifting where she stands. -->
      <g class="gy-zoom" transform="translate(${zx},${zy}) scale(${zoom}) translate(${-zx},${-zy})">
      <g class="gy-trail"></g>

      <g class="gy-root">
        <!-- legs are siblings of the torso so a torso lean doesn't drag them -->
        <g class="gy-hip gy-hip-l" transform="translate(${-R.hipX},0)">
          ${limb(R.thigh, "gy-limb gy-leg gy-back")}
          <g class="gy-knee gy-knee-l" transform="translate(0,${R.thigh})">
            ${limb(R.shin, "gy-limb gy-leg gy-back")}
            <g class="gy-foot gy-foot-l" transform="translate(0,${R.shin})">
              <line class="gy-shoe gy-back" x1="0" y1="0" x2="${R.footLen}" y2="0"/>
              <circle class="gy-sparkleshoe gy-back" cx="4" cy="0" r="4"/>
              <g class="gy-flatshoe gy-back"><ellipse cx="5" cy="0" rx="7" ry="3"/><line x1="2" y1="-6" x2="2" y2="0" stroke-width="1.5"/></g>
              <rect class="gy-jazzshoe gy-back" x="0" y="-2" width="11" height="4" rx="2"/>
              <g class="gy-stripesock gy-back"></g>
            </g>
          </g>
        </g>

        <g class="gy-hip gy-hip-r" transform="translate(${R.hipX},0)">
          ${limb(R.thigh, "gy-limb gy-leg")}
          <g class="gy-knee gy-knee-r" transform="translate(0,${R.thigh})">
            ${limb(R.shin, "gy-limb gy-leg")}
            <g class="gy-foot gy-foot-r" transform="translate(0,${R.shin})">
              <line class="gy-shoe" x1="0" y1="0" x2="${R.footLen}" y2="0"/>
              <circle class="gy-sparkleshoe" cx="4" cy="0" r="4"/>
              <g class="gy-flatshoe"><ellipse cx="5" cy="0" rx="7" ry="3"/><line x1="2" y1="-6" x2="2" y2="0" stroke-width="1.5"/></g>
              <rect class="gy-jazzshoe" x="0" y="-2" width="11" height="4" rx="2"/>
              <g class="gy-stripesock"></g>
            </g>
          </g>
        </g>

        <g class="gy-torso">
          <!-- body -->
          <path class="gy-outfit-body" d="M -11,2 C -13,-14 -10,-28 -8,${R.shoulderY}
                 L 8,${R.shoulderY} C 10,-28 13,-14 11,2 Z"/>
          <path class="gy-outfit-skirt" d="M -13,-4 L 13,-4 L 19,14 L -19,14 Z"/>
          <path class="gy-outfit-trim" d="M -11,-6 L 11,-6"/>
          <g class="gy-sequins"></g>

          <!-- arms -->
          <g class="gy-sh gy-sh-l" transform="translate(${-R.shoulderX},${R.shoulderY})">
            ${limb(R.upperArm, "gy-limb gy-arm gy-back")}
            <path class="gy-sleeve gy-back" d="M -4,0 L 4,0 L 4,14 L -4,14 Z"/>
            <g class="gy-el gy-el-l" transform="translate(0,${R.upperArm})">
              ${limb(R.foreArm, "gy-limb gy-arm gy-back")}
              <g class="gy-hand gy-hand-l" transform="translate(0,${R.foreArm})">
                <circle class="gy-palm gy-back" r="4.5"/>
                <rect class="gy-wristband gy-back" x="-5" y="-8" width="10" height="5" rx="2"/>
                <g class="gy-pompom gy-back"></g>
                <g class="gy-flowerhand gy-back"></g>
                <g class="gy-flag gy-back">
                  <line x1="0" y1="-2" x2="0" y2="-18" stroke="#94a3b8" stroke-width="1.5"/>
                  <path class="gy-flag-fill" d="M 0,-18 L -12,-13 L 0,-8 Z"/>
                </g>
                <path class="gy-fan gy-back" d="M 0,0 L -10,-14 A 14,14 0 0 1 10,-14 Z"/>
              </g>
            </g>
          </g>

          <g class="gy-sh gy-sh-r" transform="translate(${R.shoulderX},${R.shoulderY})">
            ${limb(R.upperArm, "gy-limb gy-arm")}
            <path class="gy-sleeve" d="M -4,0 L 4,0 L 4,14 L -4,14 Z"/>
            <g class="gy-el gy-el-r" transform="translate(0,${R.upperArm})">
              ${limb(R.foreArm, "gy-limb gy-arm")}
              <g class="gy-hand gy-hand-r" transform="translate(0,${R.foreArm})">
                <circle class="gy-palm" r="4.5"/>
                <rect class="gy-wristband" x="-5" y="-8" width="10" height="5" rx="2"/>
                <g class="gy-pompom"></g>
                <path class="gy-ribbon" d="M 0,0 Q 22,-8 34,6 T 68,2"/>
                <g class="gy-flowerhand"></g>
                <g class="gy-flag">
                  <line x1="0" y1="-2" x2="0" y2="-18" stroke="#94a3b8" stroke-width="1.5"/>
                  <path class="gy-flag-fill" d="M 0,-18 L 12,-13 L 0,-8 Z"/>
                </g>
                <path class="gy-fan" d="M 0,0 L -10,-14 A 14,14 0 0 1 10,-14 Z"/>
                <path class="gy-megaphone" d="M 0,-2 L 6,-4 L 17,-13 L 15,-19 L 4,-11 L 0,-6 Z"/>
              </g>
            </g>
          </g>

          <!-- head -->
          <g class="gy-neck" transform="translate(0,${R.neckY})">
            <g class="gy-head">
              <g class="gy-hair-back"></g>
              <circle class="gy-face" cx="0" cy="${R.headY - R.neckY}" r="${R.headR}"/>
              <g class="gy-hair-front"></g>
              <g class="gy-features"></g>
              <g class="gy-bow"></g>
            </g>
          </g>
        </g>
      </g>
      </g>
    `;

    const q = (s) => this.svg.querySelector(s);
    this.n = {
      root: q(".gy-root"),
      torso: q(".gy-torso"),
      neck: q(".gy-neck"),
      head: q(".gy-head"),
      shL: q(".gy-sh-l"), elL: q(".gy-el-l"),
      shR: q(".gy-sh-r"), elR: q(".gy-el-r"),
      hpL: q(".gy-hip-l"), knL: q(".gy-knee-l"),
      hpR: q(".gy-hip-r"), knR: q(".gy-knee-r"),
      footL: q(".gy-foot-l"), footR: q(".gy-foot-r"),
      hairBack: q(".gy-hair-back"),
      hairFront: q(".gy-hair-front"),
      features: q(".gy-features"),
      bow: q(".gy-bow"),
      trail: q(".gy-trail"),
      sequins: q(".gy-sequins"),
      body: q(".gy-outfit-body"),
      skirt: q(".gy-outfit-skirt"),
      trim: q(".gy-outfit-trim")
    };
    this.n.pompoms = Array.from(this.svg.querySelectorAll(".gy-pompom"));
    this.n.sleeves = Array.from(this.svg.querySelectorAll(".gy-sleeve"));
    this.n.palms = Array.from(this.svg.querySelectorAll(".gy-palm"));
    this.n.wristbands = Array.from(this.svg.querySelectorAll(".gy-wristband"));
    this.n.shoes = Array.from(this.svg.querySelectorAll(".gy-shoe"));
    this.n.sparkleShoes = Array.from(this.svg.querySelectorAll(".gy-sparkleshoe"));
    this.n.ribbon = q(".gy-ribbon");
    this.n.limbs = Array.from(this.svg.querySelectorAll(".gy-limb"));
    this.n.face = q(".gy-face");
    this.n.flowerHands = Array.from(this.svg.querySelectorAll(".gy-flowerhand"));
    this.n.flags = Array.from(this.svg.querySelectorAll(".gy-flag"));
    this.n.flagFills = Array.from(this.svg.querySelectorAll(".gy-flag-fill"));
    this.n.fans = Array.from(this.svg.querySelectorAll(".gy-fan"));
    this.n.megaphone = q(".gy-megaphone");
    this.n.flatShoes = Array.from(this.svg.querySelectorAll(".gy-flatshoe"));
    this.n.jazzShoes = Array.from(this.svg.querySelectorAll(".gy-jazzshoe"));
    this.n.stripeSocks = Array.from(this.svg.querySelectorAll(".gy-stripesock"));
    this.n.cbStop1 = q(".gy-cb-1");
    this.n.cbStop2 = q(".gy-cb-2");
  }

  /* ---------- looks ---------- */

  setLook(look) {
    this.look = Object.assign({}, this.look, look);
    const L = this.look;
    const skin = (SKIN_TONES.find((s) => s.id === L.skin) || SKIN_TONES[1]).color;
    const hairItem = CATALOG.hairColor.items.find((i) => i.id === L.hairColor) || CATALOG.hairColor.items[0];
    const hairColor = L.hairColor === "rainbow" ? `url(#${this.uid}-rainbow)` : hairItem.swatch;
    const oc = CATALOG.outfitColor.items.find((i) => i.id === L.outfitColor) || CATALOG.outfitColor.items[0];
    const main = L.outfitColor === "galaxy" ? `url(#${this.uid}-galaxy)` : oc.main;

    this.n.limbs.forEach((el) => el.setAttribute("stroke", skin));
    this.n.palms.forEach((el) => el.setAttribute("fill", skin));
    this.n.face.setAttribute("fill", skin);

    // uniform ------------------------------------------------------
    const isCheer = L.outfit === "cheerA" || L.outfit === "cheerB" || L.outfit === "cheerLong" || L.outfit === "cheerSparkle";
    const sleeved = L.outfit === "unitard" || L.outfit === "unitardSparkle" || L.outfit === "jazzUnitard" || L.outfit === "cheerLong";
    const isTutu = L.outfit === "tutu";
    const sparkly = L.outfit === "leoSparkle" || L.outfit === "champion" || L.outfit === "unitardSparkle" || L.outfit === "cheerSparkle";
    const colorBlock = L.outfit === "colorBlockLeo";
    if (colorBlock) {
      this.n.cbStop1.setAttribute("stop-color", main);
      this.n.cbStop2.setAttribute("stop-color", oc.accent);
    }
    this.n.body.setAttribute("fill", colorBlock ? `url(#${this.uid}-colorblock)` : main);
    this.n.skirt.setAttribute(
      "d",
      isTutu ? "M -15,-4 Q -24,10 -20,16 Q 0,22 20,16 Q 24,10 15,-4 Z" : "M -13,-4 L 13,-4 L 19,14 L -19,14 Z"
    );
    this.n.skirt.setAttribute("fill", isCheer || isTutu ? oc.accent : "none");
    this.n.skirt.setAttribute("stroke", isCheer || isTutu ? main : "none");
    this.n.skirt.style.display = isCheer || isTutu ? "" : "none";
    this.n.trim.setAttribute("stroke", oc.accent);
    this.n.trim.style.display = isCheer || L.outfit === "champion" ? "" : "none";
    this.n.sleeves.forEach((el) => {
      el.style.display = sleeved ? "" : "none";
      el.setAttribute("fill", main);
    });

    // gymnast leotards get a leg-line; cheer gets shorts under the skirt
    this.n.body.setAttribute("stroke", oc.accent);
    this.n.body.setAttribute("stroke-width", sparkly ? 2 : 0);

    this.n.sequins.innerHTML = "";
    if (sparkly) {
      const spots = [[-5, -22], [4, -16], [-3, -8], [6, -26], [0, -1], [-7, -14], [7, -5]];
      this.n.sequins.innerHTML = spots
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="${oc.accent}" opacity=".95"/>`)
        .join("");
      if (L.outfit === "champion") this.n.sequins.classList.add("gy-shimmer");
      else this.n.sequins.classList.remove("gy-shimmer");
    }

    // hair + bow -----------------------------------------------------
    const hairMk = hairMarkup(L.hair, hairColor);
    this.n.hairBack.innerHTML = hairMk.back;
    this.n.hairFront.innerHTML = hairMk.front;
    this.n.bow.innerHTML = bowMarkup(L.bow, oc);

    // hands --------------------------------------------------------
    const wantPom = L.hands === "pompoms";
    const wantBand = L.hands === "wristbands";
    const wantRibbon = L.hands === "ribbon";
    const wantFlowerHand = L.hands === "flowers";
    const wantFlag = L.hands === "flags";
    const wantFan = L.hands === "fan";
    const wantMegaphone = L.hands === "megaphone";
    this.n.wristbands.forEach((el) => {
      el.style.display = wantBand ? "" : "none";
      el.setAttribute("fill", oc.main);
    });
    this.n.pompoms.forEach((el) => {
      el.style.display = wantPom ? "" : "none";
      el.innerHTML = wantPom ? this._pompomMarkup(oc) : "";
    });
    this.n.ribbon.style.display = wantRibbon ? "" : "none";
    this.n.ribbon.setAttribute("stroke", oc.accent);
    this.n.flowerHands.forEach((el) => {
      el.style.display = wantFlowerHand ? "" : "none";
      el.innerHTML = wantFlowerHand ? this._flowerHandMarkup(oc) : "";
    });
    this.n.flags.forEach((el) => {
      el.style.display = wantFlag ? "" : "none";
    });
    this.n.flagFills.forEach((el) => el.setAttribute("fill", oc.main));
    this.n.fans.forEach((el) => {
      el.style.display = wantFan ? "" : "none";
      el.setAttribute("fill", oc.accent);
      el.setAttribute("stroke", oc.main);
    });
    this.n.megaphone.style.display = wantMegaphone ? "" : "none";
    this.n.megaphone.setAttribute("fill", oc.main);

    // feet ---------------------------------------------------------
    const lineShoeColor = { socks: "#f1f5f9", sneakers: "#ffffff", rainbowSneakers: `url(#${this.uid}-rainbow)` }[L.shoes];
    const showLine = L.shoes === "socks" || L.shoes === "sneakers" || L.shoes === "rainbowSneakers";
    this.n.shoes.forEach((el) => {
      el.style.display = showLine ? "" : "none";
      el.setAttribute("stroke", lineShoeColor || "none");
    });
    this.n.sparkleShoes.forEach((el) => {
      el.style.display = L.shoes === "sparkle" ? "" : "none";
      el.setAttribute("fill", oc.accent);
    });
    const wantFlat = L.shoes === "balletFlats";
    const wantJazz = L.shoes === "jazzShoes";
    const wantStripe = L.shoes === "stripedSocks";
    this.n.flatShoes.forEach((el) => {
      el.style.display = wantFlat ? "" : "none";
      el.setAttribute("fill", "#f8f3ee");
      el.setAttribute("stroke", "#d8b48c");
    });
    this.n.jazzShoes.forEach((el) => {
      el.style.display = wantJazz ? "" : "none";
      el.setAttribute("fill", "#d8b48c");
    });
    this.n.stripeSocks.forEach((el) => {
      el.style.display = wantStripe ? "" : "none";
      el.innerHTML = wantStripe
        ? `<rect x="0" y="-8" width="9" height="3" fill="${oc.main}"/><rect x="0" y="-4" width="9" height="3" fill="${oc.accent}"/><rect x="0" y="0" width="9" height="3" fill="${oc.main}"/>`
        : "";
    });

    this.setExpression(this.expression);
  }

  _pompomMarkup(oc) {
    const pts = [[0, 0, 6], [-5, -4, 5], [5, -4, 5], [-5, 4, 5], [5, 4, 5], [0, 7, 4.5]];
    return pts
      .map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 2 ? oc.accent : oc.main}" opacity=".95"/>`)
      .join("");
  }

  _flowerHandMarkup(oc) {
    const petal = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="3" ry="4.5" fill="${oc.accent}"/>`;
    return petal(-4, -8) + petal(4, -8) + petal(0, -13) + `<circle cx="0" cy="-8" r="2.5" fill="${oc.main}"/>`;
  }

  /* Eyes, brows and mouth are built separately (rather than one fused look
     string per expression) so blinking can swap just the eyes in and out
     without disturbing whatever brows/mouth the current expression drew —
     see _scheduleBlink(). */
  _eyeMarkup(x, kind) {
    const hy = RIG.headY - RIG.neckY;
    if (kind === "shut") return `<path d="M ${x - 3},${hy - 2} q 3,3 6,0" stroke="#3b2b20" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    if (kind === "wide") return `<circle cx="${x}" cy="${hy - 2}" r="2.6" fill="#3b2b20"/><circle cx="${x + 0.9}" cy="${hy - 3}" r=".9" fill="#fff"/>`;
    return `<circle cx="${x}" cy="${hy - 2}" r="2" fill="#3b2b20"/><circle cx="${x + 0.7}" cy="${hy - 2.7}" r=".7" fill="#fff"/>`;
  }

  _browMarkup(name) {
    const hy = RIG.headY - RIG.neckY;
    // A straight brow reads as neutral/focused; tilting the outer end up or
    // down is the cheapest way to turn the same 13-unit head into "curious",
    // "concentrating" or "delighted" without redrawing the eyes.
    const brow = (x, tiltOuterUp, y) =>
      `<path d="M ${x - 3.4},${y} L ${x + 3.4},${y - tiltOuterUp * (x > 0 ? 1 : -1)}" stroke="#5b4636" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    const sets = {
      happy: brow(-5, 1, hy - 7.5) + brow(5, 1, hy - 7.5),
      focused: brow(-5, -0.8, hy - 7) + brow(5, -0.8, hy - 7),
      excited: brow(-5, 2.2, hy - 9) + brow(5, 2.2, hy - 9),
      oops: brow(-5, -1.6, hy - 7) + brow(5, -1.6, hy - 7),
      proud: brow(-5, 1.6, hy - 8.5) + brow(5, 1.6, hy - 8.5)
    };
    return sets[name] || sets.happy;
  }

  _mouthMarkup(name) {
    const hy = RIG.headY - RIG.neckY;
    const mouths = {
      happy: `<path d="M -4.5,${hy + 5} q 4.5,4 9,0" stroke="#b4553f" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
      focused: `<path d="M -4,${hy + 5} l 8,0" stroke="#b4553f" stroke-width="1.8" stroke-linecap="round"/>`,
      excited: `<ellipse cx="0" cy="${hy + 6}" rx="4.5" ry="3.6" fill="#b4553f"/>`,
      oops: `<path d="M -4,${hy + 6} q 4,-3 8,0" stroke="#b4553f" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
      // a closed, confident grin — for the results podium and studio unlocks,
      // distinct from "excited"'s open-mouth surprise
      proud: `<path d="M -5,${hy + 4.5} q 5,5.5 10,0" stroke="#b4553f" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
    };
    return mouths[name] || mouths.happy;
  }

  _eyeKind(name) {
    if (name === "oops") return "shut";
    if (name === "excited" || name === "proud") return "wide";
    return "dot";
  }

  _renderFeatures(name, eyeOverride) {
    const hy = RIG.headY - RIG.neckY;
    const kind = eyeOverride || this._eyeKind(name);
    const blush = `<circle cx="-9" cy="${hy + 3}" r="3" fill="#f9a8d4" opacity=".55"/><circle cx="9" cy="${hy + 3}" r="3" fill="#f9a8d4" opacity=".55"/>`;
    const sparkle = name === "proud" ? `<path d="M -14,${hy - 6} l 1.6,3.4 3.4,1.6 -3.4,1.6 -1.6,3.4 -1.6,-3.4 -3.4,-1.6 3.4,-1.6 Z" fill="#fde68a"/>` : "";
    return (
      blush +
      this._browMarkup(name) +
      this._eyeMarkup(-5, kind) +
      this._eyeMarkup(5, kind) +
      this._mouthMarkup(name) +
      sparkle
    );
  }

  setExpression(name) {
    this.expression = name;
    this.n.features.innerHTML = this._renderFeatures(name);
  }

  /* A held expression with no blinking reads as a painting, not a character.
     This is a plain setTimeout loop, not a rAF tick, since a blink is a single
     20ms swap rather than something that needs per-frame interpolation. */
  _scheduleBlink() {
    const delay = 2600 + Math.random() * 3200;
    this._blinkTimer = setTimeout(() => {
      if (!prefersReducedMotion() && this.n && this.n.features) {
        this.n.features.innerHTML = this._renderFeatures(this.expression, "shut");
        setTimeout(() => {
          if (this.n && this.n.features) this.n.features.innerHTML = this._renderFeatures(this.expression);
        }, 130);
      }
      this._scheduleBlink();
    }, delay);
  }

  /* ---------- posing ---------- */

  setPose(p) {
    this.pose = p;
    const n = this.n;
    const sq = p.sq || 0;
    const sx = 1 + 0.18 * sq;
    const sy = 1 - 0.18 * sq;
    const facing = this.facing === -1 ? -1 : 1;

    // px and rot are mirrored so a skill authored facing right also reads
    // correctly when she travels the other way across the floor.
    n.root.setAttribute(
      "transform",
      `translate(${this.origin.x + p.px * facing},${this.origin.y + p.py}) ` +
        `rotate(${p.rot * facing}) scale(${facing * sx},${sy})`
    );
    n.torso.setAttribute("transform", `rotate(${p.torso})`);
    n.head.setAttribute("transform", `rotate(${p.head})`);

    const jt = (node, x, y, deg) => node.setAttribute("transform", `translate(${x},${y}) rotate(${deg})`);
    jt(n.shL, -RIG.shoulderX, RIG.shoulderY, p.shL);
    jt(n.shR, RIG.shoulderX, RIG.shoulderY, p.shR);
    jt(n.elL, 0, RIG.upperArm, p.elL);
    jt(n.elR, 0, RIG.upperArm, p.elR);
    jt(n.hpL, -RIG.hipX, 0, p.hpL);
    jt(n.hpR, RIG.hipX, 0, p.hpR);
    jt(n.knL, 0, RIG.thigh, p.knL);
    jt(n.knR, 0, RIG.thigh, p.knR);

    // feet counter-rotate so they stay roughly flat to the floor
    const legAngleL = p.rot + p.hpL + p.knL;
    const legAngleR = p.rot + p.hpR + p.knR;
    n.footL.setAttribute("transform", `translate(0,${RIG.shin}) rotate(${-legAngleL + 90})`);
    n.footR.setAttribute("transform", `translate(0,${RIG.shin}) rotate(${-legAngleR + 90})`);
  }

  setFacing(dir) {
    this.facing = dir;
    this.setPose(this.pose);
  }
}

export {
  RIG, SKIN_TONES, CATALOG, DEFAULT_LOOK, NEUTRAL_POSE, poseFrom, HEAD_Y,
  hairMarkup, bowMarkup, TRAIL_SHAPES, trailMarkup, gradientDefs,
  prefersReducedMotion, thumbSeq, buildThumbnail, avatarSeq, Gymnast
};
