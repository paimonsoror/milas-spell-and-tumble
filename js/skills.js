/* Skills are keyframe data. Each frame is a partial pose at a normalised
   time t; anything left out snaps back to the neutral standing pose, which
   keeps the frames short and readable. The Animator tweens between them.

   Reminders about the rig's angles (see avatar.js):
     arm   0 = hanging down, 180 = straight overhead, -90 = forward
     leg   0 = straight down, negative = forward, positive = behind
     knee  positive = heel comes up behind
     torso negative = leaning forward
     py    negative = airborne
     sq    landing squash, 0..1 */

import { NEUTRAL_POSE, poseFrom } from "./avatar.js";

const EASINGS = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOutBack: (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2)
};

const SKILLS = [
  /* ---------------- gymnastics ---------------- */
  {
    id: "motionsGym",
    name: "Presentation & Salute",
    sport: "gym",
    difficulty: 1,
    dur: 1300,
    frames: [
      { t: 0, p: {} },
      { t: 0.2, p: { shL: 165, shR: 195, torso: 3, head: -4 } },
      { t: 0.45, p: { shL: 100, shR: -100, torso: 0 } },
      { t: 0.7, p: { shL: 20, shR: -20, hpL: 6, hpR: -14, knR: 12 } },
      { t: 1, p: { shL: 170, shR: 190, head: -6, torso: 2 } }
    ]
  },
  {
    id: "arabesque",
    name: "Arabesque Balance",
    sport: "gym",
    difficulty: 1,
    dur: 1700,
    frames: [
      { t: 0, p: {} },
      { t: 0.22, p: { torso: -20, shL: 120, shR: -110, hpL: 30, hpR: -8, py: -2 } },
      { t: 0.42, p: { torso: -38, shL: 100, shR: -96, hpL: 68, hpR: -4, knR: -6, py: -4, head: -18 } },
      { t: 0.58, p: { torso: -40, shL: 98, shR: -98, hpL: 72, hpR: -6, knR: -4, py: -5, head: -20 } },
      { t: 0.74, p: { torso: -36, shL: 102, shR: -94, hpL: 66, hpR: -2, py: -3, head: -16 } },
      { t: 0.9, p: { torso: -10, shL: 140, shR: 150, hpL: 20, hpR: -6 } },
      { t: 1, p: { shL: 170, shR: 190, head: -6 } }
    ]
  },
  {
    id: "cartwheel",
    name: "Cartwheel",
    sport: "gym",
    difficulty: 2,
    dur: 1600,
    travel: 112,
    frames: [
      { t: 0, p: { shL: 168, shR: 192 } },
      { t: 0.13, p: { px: 12, py: 7, torso: -18, shL: 196, shR: 202, hpR: -38, knR: 16, hpL: 20 } },
      { t: 0.3, p: { px: 32, py: -7, rot: 78, shL: 188, shR: 186, hpL: 44, hpR: -46, knL: -4 } },
      { t: 0.5, p: { px: 58, py: -19, rot: 172, shL: 184, shR: 184, hpL: 54, hpR: -56 } },
      { t: 0.7, p: { px: 84, py: -7, rot: 262, shL: 186, shR: 188, hpL: 42, hpR: -38 } },
      { t: 0.88, p: { px: 104, py: 5, rot: 334, torso: 12, shL: 200, shR: 196, hpL: -30, knL: 12, hpR: 26 } },
      { t: 1, p: { px: 112, py: 0, rot: 360, shL: 166, shR: 194, head: -6 } }
    ]
  },
  {
    id: "handstand",
    name: "Handstand Hold",
    sport: "gym",
    difficulty: 2,
    dur: 1900,
    frames: [
      { t: 0, p: { shL: 168, shR: 192 } },
      { t: 0.14, p: { py: 8, torso: -34, shL: 205, shR: 208, hpR: -40, knR: 18, hpL: 22 } },
      // hands reach the floor here: at rot 118 the palms sit 36 below the hip,
      // so py must put the hip 36 up. Without this she floats through horizontal.
      { t: 0.26, p: { py: 16, rot: 118, shL: 180, shR: 181, hpL: 44, hpR: -12, knL: 12 } },
      { t: 0.4, p: { py: -19, rot: 176, shL: 180, shR: 182, hpL: 8, hpR: -6, knL: 6 } },
      { t: 0.54, p: { py: -20, rot: 184, shL: 179, shR: 181, hpL: 3, hpR: -2, torso: 4 } },
      { t: 0.66, p: { py: -19, rot: 174, shL: 181, shR: 180, hpL: 6, hpR: -8, torso: -3 } },
      { t: 0.78, p: { py: 16, rot: 122, shL: 180, shR: 181, hpL: 46, hpR: -14, knL: 14 } },
      { t: 0.9, p: { py: 6, rot: 24, torso: -26, shL: 200, shR: 204, hpR: -34, knR: 14, hpL: 18 } },
      { t: 1, p: { shL: 168, shR: 192, head: -6 } }
    ]
  },
  {
    id: "splitLeap",
    name: "Split Leap",
    sport: "gym",
    difficulty: 2,
    dur: 1350,
    travel: 110,
    frames: [
      { t: 0, p: { shL: 30, shR: -30 } },
      { t: 0.15, p: { px: 12, py: 8, torso: -14, hpR: -42, knR: 22, hpL: 26, shL: 60, shR: -70 } },
      { t: 0.34, p: { px: 42, py: -34, torso: -6, hpR: -74, hpL: 58, shL: 140, shR: -128 } },
      { t: 0.5, p: { px: 64, py: -46, hpR: -94, hpL: 84, shL: 132, shR: -132, head: -8 } },
      { t: 0.7, p: { px: 88, py: -28, hpR: -62, hpL: 46, shL: 120, shR: -110 } },
      { t: 0.87, p: { px: 106, py: 9, sq: 0.42, hpR: -34, knR: 26, hpL: 22, shL: 40, shR: -40 } },
      { t: 1, p: { px: 110, py: 0, shL: 168, shR: 192, head: -6 } }
    ]
  },
  {
    id: "walkover",
    name: "Front Walkover",
    sport: "gym",
    difficulty: 3,
    dur: 1750,
    travel: 96,
    frames: [
      { t: 0, p: { shL: 168, shR: 192 } },
      { t: 0.14, p: { px: 10, py: 8, torso: -30, shL: 206, shR: 208, hpR: -36, knR: 14, hpL: 20 } },
      { t: 0.32, p: { px: 30, py: -12, rot: 96, shL: 186, shR: 184, hpL: 50, hpR: -28, knL: -10 } },
      { t: 0.5, p: { px: 50, py: -20, rot: 178, shL: 182, shR: 182, hpL: 38, hpR: -34, knR: 18 } },
      { t: 0.68, p: { px: 68, py: -12, rot: 246, torso: 14, shL: 190, shR: 192, hpL: -34, hpR: 30 } },
      { t: 0.86, p: { px: 86, py: 6, rot: 330, torso: 16, sq: 0.3, hpL: -32, knL: 14, hpR: 24 } },
      { t: 1, p: { px: 96, py: 0, rot: 360, shL: 166, shR: 194, head: -8 } }
    ]
  },
  {
    id: "handspring",
    name: "Back Handspring",
    sport: "gym",
    difficulty: 3,
    dur: 1550,
    travel: -104,
    frames: [
      { t: 0, p: { shL: -60, shR: -66 } },
      { t: 0.13, p: { py: 17, torso: -22, hpR: -34, knR: 54, hpL: -30, knL: 50, shL: 58, shR: 62 } },
      { t: 0.28, p: { px: -18, py: -18, rot: -44, torso: 10, shL: 200, shR: 206, hpL: 10, hpR: -6 } },
      { t: 0.46, p: { px: -44, py: -26, rot: -132, torso: 16, shL: 184, shR: 184, hpL: -18, hpR: -30 } },
      { t: 0.6, p: { px: -62, py: -19, rot: -180, shL: 180, shR: 180, hpL: -28, hpR: -40 } },
      { t: 0.78, p: { px: -84, py: -13, rot: -262, shL: 184, shR: 186, hpL: 30, hpR: 42 } },
      { t: 0.92, p: { px: -100, py: 8, rot: -340, sq: 0.5, torso: -14, hpL: -26, knL: 30, hpR: -20, knR: 26, shL: -56, shR: -62 } },
      { t: 1, p: { px: -104, py: 0, rot: -360, shL: 168, shR: 192, head: -6 } }
    ]
  },
  {
    id: "backTuck",
    name: "Back Tuck",
    sport: "gym",
    difficulty: 4,
    dur: 1450,
    travel: -26,
    frames: [
      { t: 0, p: { shL: 168, shR: 192 } },
      { t: 0.11, p: { py: 16, torso: -16, hpR: -30, knR: 52, hpL: -26, knL: 48, shL: -18, shR: -22 } },
      { t: 0.24, p: { px: -6, py: -52, rot: -46, shL: 190, shR: 196, hpL: -46, knL: 40, hpR: -52, knR: 44 } },
      { t: 0.44, p: { px: -14, py: -80, rot: -168, shL: -74, elL: -96, shR: -78, elR: -100, hpL: -108, knL: 118, hpR: -114, knR: 122, torso: -20 } },
      { t: 0.64, p: { px: -20, py: -62, rot: -278, shL: -70, elL: -90, shR: -74, elR: -94, hpL: -100, knL: 110, hpR: -106, knR: 114, torso: -16 } },
      { t: 0.84, p: { px: -24, py: -10, rot: -348, shL: 150, shR: 160, hpL: -20, knL: 26, hpR: -14, knR: 22 } },
      { t: 0.93, p: { px: -26, py: 9, rot: -360, sq: 0.55, torso: -12, hpL: -22, knL: 34, hpR: -18, knR: 30, shL: 60, shR: 64 } },
      { t: 1, p: { px: -26, py: 0, rot: -360, shL: 166, shR: 194, head: -8 } }
    ]
  },
  {
    id: "aerial",
    name: "Aerial (No Hands!)",
    sport: "gym",
    difficulty: 5,
    dur: 1550,
    travel: 118,
    frames: [
      { t: 0, p: { shL: 150, shR: 200 } },
      { t: 0.14, p: { px: 14, py: 6, torso: -26, shL: 190, shR: 200, hpR: -44, knR: 18, hpL: 26 } },
      { t: 0.32, p: { px: 40, py: -40, rot: 84, shL: 116, shR: -108, hpL: 62, hpR: -68 } },
      { t: 0.5, p: { px: 64, py: -54, rot: 176, shL: 108, shR: -104, hpL: 70, hpR: -74, head: -10 } },
      { t: 0.7, p: { px: 90, py: -34, rot: 268, shL: 120, shR: -112, hpL: 44, hpR: -40 } },
      { t: 0.88, p: { px: 110, py: 8, rot: 336, sq: 0.45, torso: 12, hpL: -30, knL: 16, hpR: 26 } },
      { t: 1, p: { px: 118, py: 0, rot: 360, shL: 164, shR: 196, head: -8 } }
    ]
  },

  /* ---------------- cheer ---------------- */
  {
    id: "motionsCheer",
    name: "Motion Sequence",
    sport: "cheer",
    difficulty: 1,
    dur: 1500,
    frames: [
      { t: 0, p: { shL: -78, elL: -18, shR: -84, elR: -18 } },
      { t: 0.16, p: { shL: 205, shR: 155, head: -6 }, ease: "easeOut" },
      { t: 0.33, p: { shL: 95, shR: -95 }, ease: "easeOut" },
      { t: 0.5, p: { shL: 24, shR: -24 }, ease: "easeOut" },
      { t: 0.66, p: { shL: 180, shR: 180 }, ease: "easeOut" },
      { t: 0.82, p: { shL: 92, elL: -78, shR: -92, elR: 78 }, ease: "easeOut" },
      { t: 1, p: { shL: 206, shR: 154, head: -8, py: -3 }, ease: "easeOutBack" }
    ]
  },
  {
    id: "pomShake",
    name: "Pom Shake",
    sport: "cheer",
    difficulty: 1,
    dur: 1300,
    frames: [
      { t: 0, p: { shL: 30, shR: -30 } },
      { t: 0.14, p: { py: -8, shL: 200, shR: 160, head: -8 }, ease: "easeOut" },
      { t: 0.26, p: { py: 2, shL: 186, shR: 174 } },
      { t: 0.38, p: { py: -9, shL: 208, shR: 152 }, ease: "easeOut" },
      { t: 0.5, p: { py: 2, shL: 190, shR: 170 } },
      { t: 0.62, p: { py: -9, shL: 96, shR: -96 }, ease: "easeOut" },
      { t: 0.74, p: { py: 2, shL: 84, shR: -84 } },
      { t: 0.87, p: { py: -10, shL: 100, shR: -100 }, ease: "easeOut" },
      { t: 1, p: { shL: 204, shR: 156, head: -6 }, ease: "easeOutBack" }
    ]
  },
  {
    id: "toeTouch",
    name: "Toe Touch",
    sport: "cheer",
    difficulty: 2,
    dur: 1150,
    frames: [
      { t: 0, p: { shL: 26, shR: -26 } },
      { t: 0.13, p: { py: 16, torso: -14, hpR: -26, knR: 46, hpL: -22, knL: 42, shL: 44, shR: 48 } },
      { t: 0.3, p: { py: -38, shL: 150, shR: -140, hpL: 20, hpR: -18 }, ease: "easeOut" },
      { t: 0.47, p: { py: -58, shL: 98, shR: -98, hpL: 126, hpR: -126, torso: -8, head: -10 } },
      { t: 0.64, p: { py: -34, shL: 110, shR: -104, hpL: 62, hpR: -58 } },
      { t: 0.85, p: { py: 10, sq: 0.5, torso: -12, hpL: -20, knL: 32, hpR: -16, knR: 28, shL: 24, shR: -24 } },
      { t: 1, p: { shL: 204, shR: 156, head: -8 }, ease: "easeOutBack" }
    ]
  },
  {
    id: "pikeJump",
    name: "Pike Jump",
    sport: "cheer",
    difficulty: 2,
    dur: 1150,
    frames: [
      { t: 0, p: { shL: 26, shR: -26 } },
      { t: 0.13, p: { py: 16, torso: -14, hpR: -28, knR: 48, hpL: -24, knL: 44, shL: 46, shR: 50 } },
      { t: 0.3, p: { py: -40, shL: 170, shR: 186, hpL: -40, hpR: -46 }, ease: "easeOut" },
      { t: 0.47, p: { py: -58, shL: -142, shR: -148, hpL: -118, hpR: -124, torso: -14, head: -6 } },
      { t: 0.64, p: { py: -34, shL: -100, shR: -106, hpL: -60, hpR: -66 } },
      { t: 0.85, p: { py: 10, sq: 0.5, torso: -12, hpL: -20, knL: 32, hpR: -16, knR: 28, shL: 24, shR: -24 } },
      { t: 1, p: { shL: 204, shR: 156, head: -8 }, ease: "easeOutBack" }
    ]
  },
  {
    id: "herkie",
    name: "Herkie",
    sport: "cheer",
    difficulty: 3,
    dur: 1200,
    frames: [
      { t: 0, p: { shL: 26, shR: -26 } },
      { t: 0.13, p: { py: 16, torso: -14, hpR: -28, knR: 48, hpL: -24, knL: 44, shL: 46, shR: 50 } },
      { t: 0.3, p: { py: -38, shL: 160, shR: -40, elR: -60, hpL: 40, hpR: -30 }, ease: "easeOut" },
      { t: 0.48, p: { py: -58, shL: 192, shR: -24, elR: -84, hpL: 124, knL: 0, hpR: -52, knR: 96, torso: 6, head: -12 } },
      { t: 0.65, p: { py: -34, shL: 170, shR: -30, elR: -70, hpL: 66, hpR: -40, knR: 60 } },
      { t: 0.85, p: { py: 10, sq: 0.5, torso: -12, hpL: -20, knL: 32, hpR: -16, knR: 28, shL: 24, shR: -24 } },
      { t: 1, p: { shL: 204, shR: 156, head: -8 }, ease: "easeOutBack" }
    ]
  },
  {
    id: "liberty",
    name: "Liberty",
    sport: "cheer",
    difficulty: 3,
    dur: 1750,
    frames: [
      { t: 0, p: { shL: 26, shR: -26 } },
      { t: 0.2, p: { py: -4, shL: 150, shR: -140, hpL: -30, knL: 60, hpR: -6 }, ease: "easeOut" },
      { t: 0.4, p: { py: -6, shL: 206, shR: 154, hpL: -58, knL: 112, hpR: -4, head: -8 } },
      { t: 0.56, p: { py: -6, shL: 208, shR: 152, hpL: -60, knL: 114, hpR: -7, torso: 3 } },
      { t: 0.72, p: { py: -5, shL: 204, shR: 156, hpL: -56, knL: 110, hpR: -2, torso: -3 } },
      { t: 0.88, p: { shL: 160, shR: -150, hpL: -20, knL: 40, hpR: -4 } },
      { t: 1, p: { shL: 204, shR: 156, head: -8 } }
    ]
  },
  {
    id: "basketToss",
    name: "Basket Toss",
    sport: "cheer",
    difficulty: 5,
    dur: 1900,
    frames: [
      { t: 0, p: { shL: 26, shR: -26 } },
      { t: 0.12, p: { py: 22, torso: -18, hpR: -34, knR: 60, hpL: -30, knL: 56, shL: 50, shR: 54 } },
      { t: 0.26, p: { py: -66, shL: 186, shR: 178, hpL: 6, hpR: -4 }, ease: "easeOut" },
      // capped so the arena's 1.2x zoom doesn't throw her head off the top edge
      { t: 0.42, p: { py: -105, shL: 180, shR: 180, hpL: 2, hpR: -2, head: -6 }, ease: "easeOut" },
      { t: 0.56, p: { py: -96, rot: -160, shL: -70, elL: -92, shR: -74, elR: -96, hpL: -104, knL: 112, hpR: -110, knR: 116, torso: -18 } },
      { t: 0.72, p: { py: -56, rot: -300, shL: 140, shR: 150, hpL: -40, knL: 46, hpR: -34, knR: 42 } },
      { t: 0.88, p: { py: 12, rot: -360, sq: 0.6, torso: -14, hpL: -24, knL: 36, hpR: -20, knR: 32, shL: 96, shR: -96 } },
      { t: 1, p: { py: 0, rot: -360, shL: 206, shR: 154, head: -10 }, ease: "easeOutBack" }
    ]
  },

  /* ---------------- dance ---------------- */
  {
    id: "curtsyBow",
    name: "Curtsy & Bow",
    sport: "dance",
    difficulty: 1,
    dur: 1400,
    frames: [
      { t: 0, p: { shL: 30, shR: -30 } },
      { t: 0.25, p: { shL: 95, shR: -95, torso: -4, head: -4 }, ease: "easeOut" },
      { t: 0.5, p: { torso: -32, shL: 60, shR: -60, hpR: 20, knR: 24, head: -16 } },
      { t: 0.75, p: { torso: -8, shL: 92, shR: -92, hpR: 4, head: -6 }, ease: "easeOut" },
      { t: 1, p: { shL: 170, shR: 190, head: -6 }, ease: "easeOutBack" }
    ]
  },
  {
    id: "chasse",
    name: "Chassé Glide",
    sport: "dance",
    difficulty: 1,
    dur: 1000,
    travel: 40,
    frames: [
      { t: 0, p: { shL: 30, shR: -30 } },
      { t: 0.15, p: { px: 5, py: 3, torso: -8, hpR: -20, knR: 10, hpL: 12, shL: 60, shR: -70 } },
      { t: 0.34, p: { px: 16, py: -14, torso: -4, hpR: -32, hpL: 24, shL: 120, shR: -110 } },
      { t: 0.5, p: { px: 24, py: -18, hpR: -38, hpL: 34, shL: 110, shR: -104, head: -6 } },
      { t: 0.7, p: { px: 32, py: -11, hpR: -26, hpL: 18, shL: 100, shR: -90 } },
      { t: 0.87, p: { px: 38, py: 4, sq: 0.3, hpR: -14, knR: 12, hpL: 8, shL: 42, shR: -42 } },
      { t: 1, p: { px: 40, py: 0, shL: 168, shR: 192, head: -6 } }
    ]
  },
  {
    id: "pirouetteTurn",
    name: "Pirouette Turn",
    sport: "dance",
    difficulty: 2,
    dur: 1500,
    // A true pirouette spins around a vertical axis, which this side-view rig
    // has no parameter for — `rot` only does in-plane (cartwheel-style)
    // rotation, so anything past a small wobble reads as tipping over rather
    // than spinning upright. Keep rot small; sell the turn with the passé
    // hold and relevé rise instead.
    frames: [
      { t: 0, p: { shL: 30, shR: -30 } },
      { t: 0.2, p: { py: -6, torso: -2, hpR: -8, knR: 42, shL: 168, shR: 192, head: -4 }, ease: "easeOut" },
      { t: 0.4, p: { py: -8, rot: 14, hpR: -6, knR: 46, shL: 168, shR: 192 } },
      { t: 0.6, p: { py: -8, rot: -10, hpR: -6, knR: 46, shL: 168, shR: 192, head: -6 } },
      { t: 0.8, p: { py: -4, rot: 4, sq: 0.15, hpR: -4, knR: 20, shL: 120, shR: -120 }, ease: "easeOut" },
      { t: 1, p: { rot: 0, shL: 170, shR: 190, head: -6 }, ease: "easeOutBack" }
    ]
  },
  {
    id: "jazzKick",
    name: "Jazz Kick",
    sport: "dance",
    difficulty: 2,
    dur: 1100,
    frames: [
      { t: 0, p: { shL: 26, shR: -26 } },
      { t: 0.16, p: { py: 8, torso: -6, hpR: -18, knR: 30, shL: 60, shR: -60 } },
      { t: 0.36, p: { py: -14, torso: -8, hpR: -118, knR: 6, shL: 150, shR: -140, head: -8 }, ease: "easeOut" },
      { t: 0.55, p: { py: -16, torso: -10, hpR: -126, shL: 98, shR: -98, head: -10 } },
      { t: 0.72, p: { py: -8, torso: -6, hpR: -70, knR: 18, shL: 110, shR: -104 } },
      { t: 0.88, p: { py: 6, sq: 0.35, torso: -8, hpR: -18, knR: 26, shL: 30, shR: -30 }, ease: "easeOut" },
      { t: 1, p: { shL: 204, shR: 156, head: -8 }, ease: "easeOutBack" }
    ]
  },
  {
    id: "grandJete",
    name: "Grand Jeté Leap",
    sport: "dance",
    difficulty: 3,
    dur: 1300,
    travel: 104,
    frames: [
      { t: 0, p: { shL: 30, shR: -30 } },
      { t: 0.15, p: { px: 10, py: 8, torso: -12, hpR: -40, knR: 20, hpL: 24, shL: 70, shR: -80 } },
      { t: 0.34, p: { px: 40, py: -40, torso: -6, hpR: -84, hpL: 68, shL: 150, shR: -138, head: -6 } },
      { t: 0.5, p: { px: 60, py: -52, hpR: -104, hpL: 96, shL: 160, shR: -150, head: -10 } },
      { t: 0.7, p: { px: 84, py: -32, hpR: -66, hpL: 50, shL: 130, shR: -120 } },
      { t: 0.87, p: { px: 100, py: 9, sq: 0.4, hpR: -32, knR: 24, hpL: 20, shL: 42, shR: -42 } },
      { t: 1, p: { px: 104, py: 0, shL: 168, shR: 192, head: -6 } }
    ]
  },
  {
    id: "attitudeTurn",
    name: "Attitude Turn",
    sport: "dance",
    difficulty: 4,
    dur: 1750,
    // Same rig constraint as pirouetteTurn: no vertical-axis spin is possible,
    // so this keeps liberty's passé-balance shape (attitude derrière — the
    // bent leg lifted behind rather than in front) and only wobbles `rot`
    // a little rather than carrying it through a fake 360.
    frames: [
      { t: 0, p: { shL: 26, shR: -26 } },
      { t: 0.16, p: { py: -4, torso: -4, shL: 150, shR: -140, hpL: 24, knL: 50, hpR: -4 }, ease: "easeOut" },
      { t: 0.34, p: { py: -6, rot: 16, torso: -6, shL: 206, shR: 154, hpL: 40, knL: 66, hpR: -4, head: -8 } },
      { t: 0.5, p: { py: -6, rot: -14, torso: -4, shL: 208, shR: 152, hpL: 42, knL: 68, hpR: -6 } },
      { t: 0.66, p: { py: -6, rot: 10, torso: -6, shL: 204, shR: 156, hpL: 40, knL: 66, hpR: -3, head: -8 } },
      { t: 0.84, p: { rot: 0, shL: 160, shR: -150, hpL: 16, knL: 32, hpR: -4 } },
      { t: 1, p: { shL: 204, shR: 156, head: -8 } }
    ]
  },
  {
    id: "fanKick",
    name: "Fan Kick",
    sport: "dance",
    difficulty: 5,
    dur: 1400,
    frames: [
      { t: 0, p: { shL: 26, shR: -26 } },
      { t: 0.14, p: { py: 18, torso: -16, hpR: -30, knR: 50, hpL: -26, knL: 46, shL: 48, shR: 52 } },
      { t: 0.3, p: { py: -42, torso: 4, shL: 168, shR: -30, elR: -66, hpL: 60, hpR: -32 }, ease: "easeOut" },
      { t: 0.46, p: { py: -64, torso: 8, shL: 198, shR: -20, elR: -90, hpL: 136, knL: 0, hpR: -54, knR: 100, head: -14 } },
      { t: 0.6, p: { py: -50, torso: 4, shL: 190, shR: -24, elR: -80, hpL: 100, hpR: -44, knR: 70 } },
      { t: 0.74, p: { py: -30, shL: 176, shR: -28, elR: -70, hpL: 60, hpR: -38, knR: 50 } },
      { t: 0.9, p: { py: 12, sq: 0.55, torso: -12, hpL: -20, knL: 32, hpR: -16, knR: 28, shL: 22, shR: -22 }, ease: "easeOut" },
      { t: 1, p: { shL: 204, shR: 156, head: -8 }, ease: "easeOutBack" }
    ]
  },

  /* ---------------- shared reactions ---------------- */
  {
    id: "salute",
    name: "Salute",
    sport: "any",
    difficulty: 0,
    dur: 900,
    frames: [
      { t: 0, p: {} },
      { t: 0.4, p: { shL: 168, shR: 192, py: -6, head: -8 }, ease: "easeOutBack" },
      { t: 1, p: { shL: 172, shR: 188, head: -6 } }
    ]
  },
  {
    id: "wobble",
    name: "Small Wobble",
    sport: "any",
    difficulty: 0,
    dur: 900,
    frames: [
      { t: 0, p: {} },
      { t: 0.25, p: { rot: 9, torso: -8, shL: 110, shR: -104, hpL: 16, hpR: -20, knR: 14 } },
      { t: 0.5, p: { rot: -7, torso: 6, shL: 96, shR: -118, hpL: -18, hpR: 14, knL: 12 } },
      { t: 0.72, p: { rot: 4, torso: -4, shL: 60, shR: -60 } },
      { t: 1, p: { shL: 14, shR: -14, head: 4 } }
    ]
  },
  {
    id: "bigFinish",
    name: "Big Finish",
    sport: "any",
    difficulty: 0,
    dur: 2100,
    frames: [
      { t: 0, p: {} },
      { t: 0.12, p: { py: 14, torso: -14, hpR: -26, knR: 44, hpL: -22, knL: 40, shL: 40, shR: 44 } },
      { t: 0.26, p: { py: -46, shL: 200, shR: 160, hpL: 30, hpR: -28 }, ease: "easeOut" },
      { t: 0.4, p: { py: -14, sq: 0.4, hpL: -18, knL: 26, hpR: -14, knR: 22 } },
      { t: 0.52, p: { py: -50, shL: 96, shR: -96, hpL: 34, hpR: -32 }, ease: "easeOut" },
      { t: 0.66, p: { py: 6, sq: 0.45, hpL: -20, knL: 30, hpR: -16, knR: 26 } },
      { t: 0.8, p: { py: -30, shL: 208, shR: 152, head: -12 }, ease: "easeOut" },
      { t: 1, p: { py: 0, shL: 205, shR: 155, head: -10 }, ease: "easeOutBack" }
    ]
  }
];

const IDLE = {
  id: "idle",
  dur: 2600,
  loop: true,
  frames: [
    { t: 0, p: { py: 0, shL: 12, shR: -12, head: 0, torso: 0 } },
    { t: 0.25, p: { py: -3, shL: 16, shR: -15, head: -3, torso: 2, knL: 4 } },
    { t: 0.5, p: { py: 0, shL: 11, shR: -11, head: 0, torso: 0 } },
    { t: 0.75, p: { py: -2, shL: 14, shR: -17, head: 2, torso: -2, knR: 4 } },
    { t: 1, p: { py: 0, shL: 12, shR: -12, head: 0, torso: 0 } }
  ]
};

const SKILL_BY_ID = SKILLS.reduce((m, s) => ((m[s.id] = s), m), {});

function skillsForSport(sport) {
  return SKILLS.filter(
    (s) => s.difficulty > 0 && (s.sport === sport || (sport === "both" && s.sport !== "any"))
  );
}

/* Pick a skill whose difficulty suits the current streak, without repeating
   the last one if we can help it. */
function chooseSkill(sport, streak, lastId) {
  const pool = skillsForSport(sport);
  const ceiling = streak >= 9 ? 5 : streak >= 6 ? 4 : streak >= 4 ? 3 : streak >= 2 ? 2 : 1;
  let eligible = pool.filter((s) => s.difficulty <= ceiling);
  const top = eligible.filter((s) => s.difficulty >= Math.max(1, ceiling - 1));
  if (top.length) eligible = top;
  const fresh = eligible.filter((s) => s.id !== lastId);
  const from = fresh.length ? fresh : eligible;
  return from[Math.floor(Math.random() * from.length)];
}

/* ---------------- the animator ---------------- */

const POSE_KEYS = Object.keys(NEUTRAL_POSE);

function resolveFrames(skill) {
  return skill.frames.map((f) => ({ t: f.t, p: poseFrom(f.p), ease: f.ease || "easeInOut" }));
}

function lerpPose(a, b, k) {
  const out = {};
  for (const key of POSE_KEYS) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}

class Animator {
  constructor(gymnast, arenaBounds) {
    this.g = gymnast;
    this.bounds = arenaBounds || { min: 90, max: 610 };
    this.baseX = gymnast.origin.x;
    this.raf = null;
    this.queue = [];
    this.current = null;
    this.onSkillStart = null;
    this.trailTick = 0;
    this._loop = this._loop.bind(this);
  }

  play(skill, opts) {
    return new Promise((resolve) => {
      this.queue.push({ skill, opts: opts || {}, resolve });
      // The idle animation loops forever and so never reaches the hand-off in
      // _loop; it has to be interrupted here or a queued skill never starts.
      if (!this.current || this.current.loop) this._next();
    });
  }

  /* Drops anything queued and returns to a breathing idle. */
  reset() {
    this.queue.length = 0;
    this.current = null;
    this.idle();
  }

  idle() {
    this.queue.length = 0;
    this.current = {
      frames: resolveFrames(IDLE),
      dur: IDLE.dur,
      loop: true,
      start: performance.now(),
      skill: IDLE,
      resolve: null
    };
    this._start();
  }

  _next() {
    const job = this.queue.shift();
    if (!job) {
      this.idle();
      return;
    }
    const skill = job.skill;

    // Travelling skills alternate direction so she paces the floor instead of
    // teleporting back to the middle.
    if (skill.travel) {
      const next = this.g.origin.x + skill.travel * this.g.facing;
      if (next < this.bounds.min || next > this.bounds.max) this.g.setFacing(-this.g.facing);
    }

    this.current = {
      frames: resolveFrames(skill),
      dur: skill.dur,
      loop: false,
      start: performance.now(),
      skill,
      resolve: job.resolve,
      opts: job.opts
    };
    if (this.onSkillStart) this.onSkillStart(skill);
    this._start();
  }

  _start() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this._loop);
  }

  _loop(now) {
    const c = this.current;
    if (!c) return;
    let t = (now - c.start) / c.dur;

    if (t >= 1) {
      if (c.loop) {
        c.start = now;
        t = 0;
      } else {
        this.g.setPose(c.frames[c.frames.length - 1].p);
        if (c.skill.travel) this.g.origin.x += c.skill.travel * this.g.facing;
        const done = c.resolve;
        this.current = null;
        if (done) done();
        this._next();
        return;
      }
    }

    const fr = c.frames;
    let i = 0;
    while (i < fr.length - 2 && t > fr[i + 1].t) i++;
    const a = fr[i];
    const b = fr[i + 1];
    const span = Math.max(0.0001, b.t - a.t);
    const local = Math.min(1, Math.max(0, (t - a.t) / span));
    const eased = (EASINGS[b.ease] || EASINGS.easeInOut)(local);
    this.g.setPose(lerpPose(a.p, b.p, eased));

    if (!c.loop && this.g.look.trail !== "none" && now - this.trailTick > 55) {
      this.trailTick = now;
      this._spawnTrail();
    }

    this.raf = requestAnimationFrame(this._loop);
  }

  _spawnTrail() {
    const g = this.g;
    const kind = g.look.trail;
    const x = g.origin.x + g.pose.px * g.facing + (Math.random() * 18 - 9);
    const y = g.origin.y + g.pose.py - 22 + (Math.random() * 26 - 13);
    const ns = "http://www.w3.org/2000/svg";
    let el;

    if (kind === "stars") {
      el = document.createElementNS(ns, "path");
      el.setAttribute("d", "M 0,-6 L 1.8,-1.8 L 6,0 L 1.8,1.8 L 0,6 L -1.8,1.8 L -6,0 L -1.8,-1.8 Z");
      el.setAttribute("fill", "#fde68a");
    } else if (kind === "hearts") {
      el = document.createElementNS(ns, "path");
      el.setAttribute("d", "M 0,4 C -6,-1 -5,-6 -2,-6 C 0,-6 0,-4 0,-4 C 0,-4 0,-6 2,-6 C 5,-6 6,-1 0,4 Z");
      el.setAttribute("fill", "#fb7185");
    } else if (kind === "rainbow") {
      el = document.createElementNS(ns, "circle");
      el.setAttribute("r", 5);
      el.setAttribute("fill", ["#ff6b6b", "#ffd166", "#6bd88a", "#4fa8d8", "#a86bd8"][Math.floor(Math.random() * 5)]);
    } else if (kind === "fire") {
      el = document.createElementNS(ns, "circle");
      el.setAttribute("r", 4 + Math.random() * 4);
      el.setAttribute("fill", ["#f97316", "#fbbf24", "#fef3c7"][Math.floor(Math.random() * 3)]);
    } else if (kind === "glitterDust") {
      el = document.createElementNS(ns, "circle");
      el.setAttribute("r", 1.6 + Math.random() * 1.2);
      el.setAttribute("fill", "#fde68a");
    } else if (kind === "bubbles") {
      el = document.createElementNS(ns, "circle");
      el.setAttribute("r", 3 + Math.random() * 3);
      el.setAttribute("fill", "#bae6fd");
      el.setAttribute("opacity", ".7");
      el.setAttribute("stroke", "#7dd3fc");
      el.setAttribute("stroke-width", ".6");
    } else if (kind === "confetti") {
      el = document.createElementNS(ns, "rect");
      el.setAttribute("x", -2.5);
      el.setAttribute("y", -2);
      el.setAttribute("width", 5);
      el.setAttribute("height", 4);
      el.setAttribute("fill", ["#ff6b6b", "#4fa8d8", "#6bd88a", "#ffd166"][Math.floor(Math.random() * 4)]);
    } else if (kind === "musicNotes") {
      el = document.createElementNS(ns, "g");
      el.innerHTML =
        '<circle cx="-2" cy="4" r="2.6" fill="#a78bfa"/><line x1="0.4" y1="4" x2="0.4" y2="-6" stroke="#a78bfa" stroke-width="1.3"/><path d="M 0.4,-6 Q 5,-6 5,-2" stroke="#a78bfa" stroke-width="1.3" fill="none"/>';
    } else if (kind === "petals") {
      el = document.createElementNS(ns, "ellipse");
      el.setAttribute("rx", 4);
      el.setAttribute("ry", 2.6);
      el.setAttribute("fill", Math.random() < 0.5 ? "#fbcfe8" : "#ffffff");
    } else {
      el = document.createElementNS(ns, "circle");
      el.setAttribute("r", 3.2);
      el.setAttribute("fill", "#ffffff");
    }

    el.setAttribute("transform", `translate(${x},${y}) rotate(${Math.random() * 360})`);
    el.setAttribute("class", "gy-particle");
    g.n.trail.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }
}

export { EASINGS, SKILLS, IDLE, SKILL_BY_ID, skillsForSport, chooseSkill, POSE_KEYS, resolveFrames, lerpPose, Animator };
