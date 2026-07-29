/* =============================================================================
   TRULY'S PINBALL — table geometry, modes, and game state
   -----------------------------------------------------------------------------
   Internal playfield space is 900 x 1600 (9:16). Everything is authored in that
   space and scaled to the canvas at draw time, so the table plays identically at
   any size. Inlined into trulys-pinball.html at ship time.
============================================================================= */
import { World, Ball, Segment, Flipper, Bumper } from './engine.js';

export const TW = 900, TH = 1600;

/* --- the six tracks, in locked order ------------------------------------- */
export const TRACKS = [
  { key: 'dear_joshua', n: 1, title: 'Dear Joshua',                short: 'DEAR JOSHUA' },
  { key: 'reaper',      n: 2, title: 'Fear the Reaper',            short: 'FEAR THE REAPER' },
  { key: 'forever',     n: 3, title: 'Forever',                    short: 'FOREVER' },
  { key: 'shadows',     n: 4, title: 'Shadows',                    short: 'SHADOWS' },
  { key: 'boy',         n: 5, title: 'Boy',                        short: 'BOY' },
  { key: 'you_two',     n: 6, title: 'You Two Deserve Each Other', short: 'YOU TWO' },
];

export const DRAIN_LINES = [
  'read at 2:47am.',
  'left on delivered.',
  'the table won this round…',
  'even legends drain.',
];

export const BOY_LINES = [
  'blocked.', 'seen.', '“u up?” — no.', 'unsaved his number.',
  'the receipts are filed.', 'archived, not deleted.',
];

export const FOREVER_LINES = ['again.', 'again.', "we've been here before.", 'and again.', 'still here.'];

/**
 * Build the table. Returns the world plus every named feature the game layer
 * needs to light, test, or draw.
 *
 * Geometry note: orbits and ramps are modelled the way real machines work —
 * the ball enters a mouth, is CAPTURED, routed along a habitrail, and released
 * at the exit. Trying to simulate a genuine enclosed lane in 2D top-down needs
 * walls so tight the ball jitters between them; capture-and-route is both more
 * stable and more faithful to how a ramp shot actually feels.
 */
export function buildTable() {
  const w = new World(TW, TH);
  const L = 46, R = 758;              // playfield walls; 758..900 is the plunger lane
  const wall = { bounce: 0.36, friction: 0.03 };

  // ---- outer shell --------------------------------------------------------
  w.segments.push(
    new Segment(L, 200, L, 1180, wall),                 // left wall
    new Segment(R, 250, R, 1180, wall),                 // right wall (inner)
    new Segment(L, 200, 210, 66, wall),                 // top-left shoulder
    new Segment(210, 66, 560, 66, wall),                // top
    new Segment(560, 66, R, 250, wall),                 // top-right shoulder
    new Segment(R, 250, 836, 250, wall),                // plunger lane roof
    new Segment(836, 250, 836, 1520, wall),             // plunger outer wall
    new Segment(R, 300, R, 1520, wall),                 // plunger inner wall
  );

  // ---- lower funnel: inlanes, outlanes, drain ------------------------------
  // left outlane / inlane split
  w.segments.push(
    new Segment(L, 1180, 150, 1330, wall),              // left outlane floor
    new Segment(196, 1150, 196, 1320, wall),            // outlane/inlane divider
    new Segment(246, 1180, 300, 1330, wall),            // inlane feed to flipper
    new Segment(R, 1180, 750 - 140, 1330, wall),        // right outlane floor
    new Segment(704, 1150, 704, 1320, wall),            // right divider
    new Segment(654, 1180, 600, 1330, wall),            // right inlane feed
  );

  // slingshots — kickers above each flipper
  const sling = { bounce: 0.5, friction: 0.02, kick: 300 };
  const slingL = new Segment(246, 1180, 330, 1300, { ...sling, id: 'sling_l' });
  const slingR = new Segment(654, 1180, 570, 1300, { ...sling, id: 'sling_r' });
  w.segments.push(slingL, slingR);

  // ---- flippers -----------------------------------------------------------
  // rest ~30 degrees down, up ~30 degrees above horizontal
  const fL = new Flipper(330, 1372, 132, 0.52, -0.44, 1);
  const fR = new Flipper(570, 1372, 132, Math.PI - 0.52, Math.PI + 0.44, -1);
  w.flippers.push(fL, fR);

  // ---- pop bumpers: the BOY cluster ---------------------------------------
  const bumpers = [
    new Bumper(556, 612, 46, { id: 'boy_cap' }),
    new Bumper(662, 700, 46, { id: 'boy_phone' }),
    new Bumper(556, 790, 46, { id: 'boy_flag' }),
  ];
  w.bumpers.push(...bumpers);

  // posts that keep the ball out of dead corners
  w.segments.push(
    new Segment(196, 980, 246, 1060, wall),
    new Segment(704, 980, 654, 1060, wall),
  );

  /* --- triggers -------------------------------------------------------------
     Circular zones tested against the ball centre each frame. `once` zones
     re-arm only after the ball leaves. */
  const triggers = [
    { id: 'orbit_l_in',  x: 120, y: 900, r: 52 },
    { id: 'orbit_l_top', x: 250, y: 140, r: 60 },
    { id: 'orbit_r_in',  x: 690, y: 900, r: 52 },
    { id: 'orbit_r_top', x: 540, y: 140, r: 60 },
    { id: 'skill',       x: 797, y: 330, r: 42 },
  ];

  /* --- shots: capture-and-route features ---------------------------------- */
  const shots = [
    { id: 'ramp_him',  x: 372, y: 470, r: 46, exit: { x: 250, y: 1100 }, vel: { x: -40, y: 190 }, dwell: 0.55 },
    { id: 'ramp_her',  x: 528, y: 470, r: 46, exit: { x: 650, y: 1100 }, vel: { x: 40,  y: 190 }, dwell: 0.55 },
    { id: 'scoop',     x: 268, y: 700, r: 50, exit: { x: 268, y: 640 }, vel: { x: 30, y: -300 }, dwell: 1.1 },
    { id: 'mailbox',   x: 402, y: 300, r: 44, exit: { x: 402, y: 380 }, vel: { x: 0, y: 240 }, dwell: 1.4 },
  ];

  // ---- JOSHUA standup target bank -----------------------------------------
  const letters = 'JOSHUA'.split('').map((ch, i) => ({
    ch, lit: false,
    x: 190 + i * 84, y: 196, w: 54, h: 22,
  }));

  // the drop target guarding the mailbox
  const dropTarget = { x: 402, y: 352, w: 108, h: 20, up: false, hits: 0 };

  return { world: w, flippers: { L: fL, R: fR }, bumpers, triggers, shots, letters, dropTarget,
           bounds: { L, R }, slings: { L: slingL, R: slingR } };
}

/* --- scoring -------------------------------------------------------------- */
export const SCORE = {
  bumper: 120, sling: 60, orbit: 2500, ramp: 3200, scoop: 5000,
  letter: 1500, skill: 12000, jackpot: 25000, mode_bank: 40000, wizard: 150000,
};
