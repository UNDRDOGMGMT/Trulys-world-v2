/* =============================================================================
   TRULY'S PINBALL — physics core
   -----------------------------------------------------------------------------
   Built and tuned standalone before any theming, per the build order. Inlined
   into trulys-pinball.html at ship time; kept as a module here so the physics
   can be unit-tested in node without a canvas.

   Design notes that matter:
   - Fixed 120Hz timestep with an accumulator, render interpolated. Flipper feel
     must be identical on 60Hz and 120Hz displays.
   - The ball is swept (continuous collision) against every segment each step.
     A 12px ball moving 900px/s covers 7.5px per 120Hz step, which is fine, but
     flipper TIPS move much faster than the ball — the swept test is what stops
     the ball tunnelling through a flipper that snaps up underneath it.
   - Flippers impart surface velocity (omega x r), which is what makes cradling,
     backhands and live catches possible. Without it pinball feels like pachinko.
============================================================================= */

export const V = {
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  mul: (a, s) => ({ x: a.x * s, y: a.y * s }),
  dot: (a, b) => a.x * b.x + a.y * b.y,
  len: (a) => Math.hypot(a.x, a.y),
  norm: (a) => { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; },
};

/** Closest point on segment ab to point p, plus the parametric t. */
export function closestOnSegment(p, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y;
  const d2 = abx * abx + aby * aby;
  if (d2 === 0) return { x: a.x, y: a.y, t: 0 };
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / d2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return { x: a.x + abx * t, y: a.y + aby * t, t };
}

/**
 * Swept circle vs segment. Returns the earliest fraction of the step at which a
 * circle of radius r travelling p0 -> p1 touches the segment, or null.
 *
 * Solved by sampling the separation along the sweep and bisecting the first
 * crossing. Sampling is O(SUB) and robust for segments of any orientation,
 * where the closed-form capsule solution has awkward degenerate cases at the
 * endpoints — and endpoints are exactly where flipper tips live.
 */
export function sweepCircleSegment(p0, p1, r, a, b, SUB = 8) {
  const gap = (t) => {
    const p = { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
    const c = closestOnSegment(p, a, b);
    return Math.hypot(p.x - c.x, p.y - c.y) - r;
  };
  let g0 = gap(0);
  if (g0 <= 0) return 0;                    // already overlapping at step start
  let prevT = 0, prevG = g0;
  for (let i = 1; i <= SUB; i++) {
    const t = i / SUB, g = gap(t);
    if (g <= 0) {
      let lo = prevT, hi = t;               // bisect the crossing
      for (let k = 0; k < 12; k++) {
        const mid = (lo + hi) / 2;
        if (gap(mid) <= 0) hi = mid; else lo = mid;
      }
      return hi;
    }
    prevT = t; prevG = g;
  }
  return null;
}

export class Ball {
  constructor(x, y, r = 11) {
    this.p = { x, y };
    this.v = { x: 0, y: 0 };
    this.r = r;
    this.alive = true;
    this.trail = [];
  }
}

/** A static wall. `bounce` 0..1, `friction` bleeds tangential speed. */
export class Segment {
  constructor(ax, ay, bx, by, opts = {}) {
    this.a = { x: ax, y: ay };
    this.b = { x: bx, y: by };
    this.bounce = opts.bounce ?? 0.42;
    this.friction = opts.friction ?? 0.02;
    this.kick = opts.kick ?? 0;        // slingshots: extra impulse along the normal
    this.id = opts.id ?? null;
    this.onHit = opts.onHit ?? null;
  }
}

/**
 * A flipper is a rotating capsule: a segment from pivot outward, thick.
 * `dir` is +1 for a flipper that swings clockwise when raised (the right one).
 */
export class Flipper {
  constructor(px, py, length, restAngle, upAngle, dir, thickness = 9) {
    this.pivot = { x: px, y: py };
    this.len = length;
    this.rest = restAngle;
    this.up = upAngle;
    this.dir = dir;
    this.thickness = thickness;
    this.angle = restAngle;
    this.omega = 0;
    this.held = false;
    this.speed = 22;                   // radians/sec — snappy but catchable
  }
  tip() {
    return { x: this.pivot.x + Math.cos(this.angle) * this.len,
             y: this.pivot.y + Math.sin(this.angle) * this.len };
  }
  step(dt) {
    const target = this.held ? this.up : this.rest;
    const prev = this.angle;
    const diff = target - this.angle;
    const max = this.speed * dt;
    this.angle += Math.abs(diff) <= max ? diff : Math.sign(diff) * max;
    this.omega = (this.angle - prev) / dt;
  }
}

export class Bumper {
  constructor(x, y, r, opts = {}) {
    this.p = { x, y };
    this.r = r;
    this.kick = opts.kick ?? 430;
    this.id = opts.id ?? null;
    this.lit = 0;
  }
}

export class World {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.segments = [];
    this.bumpers = [];
    this.flippers = [];
    this.balls = [];
    this.gravity = 1180;               // px/s^2 — tuned for a ~30-60s ball
    this.drag = 0.0016;
    this.maxSpeed = 1750;
    this.events = [];                  // drained by the game layer each frame
  }

  emit(type, data) { this.events.push({ type, data }); }

  /** One fixed physics step. dt is always the same value — never variable. */
  step(dt) {
    for (const f of this.flippers) f.step(dt);

    for (const ball of this.balls) {
      if (!ball.alive) continue;

      ball.v.y += this.gravity * dt;
      const sp = Math.hypot(ball.v.x, ball.v.y);
      if (sp > this.maxSpeed) { ball.v.x *= this.maxSpeed / sp; ball.v.y *= this.maxSpeed / sp; }
      ball.v.x *= 1 - this.drag; ball.v.y *= 1 - this.drag;

      // Move in sub-steps, resolving the EARLIEST contact each time, so a ball
      // squeezed between a flipper and a wall can't pop through either.
      let remaining = dt;
      for (let iter = 0; iter < 4 && remaining > 1e-6; iter++) {
        const p0 = { x: ball.p.x, y: ball.p.y };
        const p1 = { x: p0.x + ball.v.x * remaining, y: p0.y + ball.v.y * remaining };

        let best = null;

        for (const s of this.segments) {
          const t = sweepCircleSegment(p0, p1, ball.r, s.a, s.b);
          if (t !== null && (!best || t < best.t)) best = { t, kind: 'seg', obj: s };
        }
        for (const f of this.flippers) {
          const seg = { a: f.pivot, b: f.tip() };
          const t = sweepCircleSegment(p0, p1, ball.r + f.thickness, seg.a, seg.b);
          if (t !== null && (!best || t < best.t)) best = { t, kind: 'flip', obj: f };
        }
        for (const b of this.bumpers) {
          const t = sweepCircleCircle(p0, p1, ball.r, b.p, b.r);
          if (t !== null && (!best || t < best.t)) best = { t, kind: 'bump', obj: b };
        }

        if (!best) { ball.p = p1; break; }

        const tt = Math.max(0, best.t - 1e-4);
        ball.p = { x: p0.x + (p1.x - p0.x) * tt, y: p0.y + (p1.y - p0.y) * tt };
        remaining *= 1 - tt;

        if (best.kind === 'seg') this.resolveSegment(ball, best.obj);
        else if (best.kind === 'flip') this.resolveFlipper(ball, best.obj);
        else this.resolveBumper(ball, best.obj);
      }
    }
  }

  resolveSegment(ball, s) {
    const c = closestOnSegment(ball.p, s.a, s.b);
    let n = { x: ball.p.x - c.x, y: ball.p.y - c.y };
    let nl = Math.hypot(n.x, n.y);
    if (nl < 1e-6) {                    // dead centre: use the segment normal
      const d = V.norm(V.sub(s.b, s.a));
      n = { x: -d.y, y: d.x }; nl = 1;
    }
    n = { x: n.x / nl, y: n.y / nl };
    ball.p.x = c.x + n.x * (ball.r + 0.01);
    ball.p.y = c.y + n.y * (ball.r + 0.01);

    const vn = V.dot(ball.v, n);
    if (vn < 0) {
      const tang = { x: ball.v.x - vn * n.x, y: ball.v.y - vn * n.y };
      ball.v.x = tang.x * (1 - s.friction) - vn * s.bounce * n.x;
      ball.v.y = tang.y * (1 - s.friction) - vn * s.bounce * n.y;
    }
    if (s.kick) { ball.v.x += n.x * s.kick; ball.v.y += n.y * s.kick; }
    if (s.id) this.emit('segment', { id: s.id, ball });
    if (s.onHit) s.onHit(ball);
  }

  /**
   * The flipper is the whole game. Beyond a normal bounce we add the surface
   * velocity at the contact point (omega x r) — that is what launches the ball,
   * lets a held flipper hold it still (cradle), and makes backhands possible.
   */
  resolveFlipper(ball, f) {
    const seg = { a: f.pivot, b: f.tip() };
    const c = closestOnSegment(ball.p, seg.a, seg.b);
    let n = { x: ball.p.x - c.x, y: ball.p.y - c.y };
    let nl = Math.hypot(n.x, n.y);
    if (nl < 1e-6) { n = { x: 0, y: -1 }; nl = 1; }
    n = { x: n.x / nl, y: n.y / nl };
    const R = ball.r + f.thickness;
    ball.p.x = c.x + n.x * (R + 0.01);
    ball.p.y = c.y + n.y * (R + 0.01);

    // surface velocity at the contact point
    const rv = { x: c.x - f.pivot.x, y: c.y - f.pivot.y };
    const surf = { x: -f.omega * rv.y, y: f.omega * rv.x };

    const rel = { x: ball.v.x - surf.x, y: ball.v.y - surf.y };
    const vn = V.dot(rel, n);
    if (vn < 0) {
      const bounce = f.omega !== 0 ? 0.52 : 0.30;   // a moving flipper snaps; a still one deadens
      const tang = { x: rel.x - vn * n.x, y: rel.y - vn * n.y };
      const out = { x: tang.x * 0.94 - vn * bounce * n.x, y: tang.y * 0.94 - vn * bounce * n.y };
      ball.v.x = out.x + surf.x;
      ball.v.y = out.y + surf.y;
    } else {
      // resting contact — inherit the flipper so a cradle actually holds
      ball.v.x += surf.x * 0.5; ball.v.y += surf.y * 0.5;
    }
    this.emit('flipper', { ball, f });
  }

  resolveBumper(ball, b) {
    const n = V.norm(V.sub(ball.p, b.p));
    ball.p.x = b.p.x + n.x * (b.r + ball.r + 0.01);
    ball.p.y = b.p.y + n.y * (b.r + ball.r + 0.01);
    const vn = V.dot(ball.v, n);
    if (vn < 0) { ball.v.x -= 1.6 * vn * n.x; ball.v.y -= 1.6 * vn * n.y; }
    ball.v.x += n.x * b.kick; ball.v.y += n.y * b.kick;
    const sp = Math.hypot(ball.v.x, ball.v.y);
    if (sp > 1000) { ball.v.x *= 1000 / sp; ball.v.y *= 1000 / sp; }
    b.lit = 1;
    this.emit('bumper', { id: b.id, ball, b });
  }
}

/** Swept circle vs static circle — exact quadratic. */
export function sweepCircleCircle(p0, p1, r, c, cr) {
  const d = { x: p1.x - p0.x, y: p1.y - p0.y };
  const f = { x: p0.x - c.x, y: p0.y - c.y };
  const R = r + cr;
  const a = d.x * d.x + d.y * d.y;
  if (a < 1e-12) return (f.x * f.x + f.y * f.y <= R * R) ? 0 : null;
  const b = 2 * (f.x * d.x + f.y * d.y);
  const cc = f.x * f.x + f.y * f.y - R * R;
  if (cc <= 0) return 0;
  const disc = b * b - 4 * a * cc;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return (t >= 0 && t <= 1) ? t : null;
}
