import { World, Ball, Segment, Flipper, sweepCircleSegment, closestOnSegment } from './engine.js';

let fails = 0;
const ok = (name, cond, extra='') => { console.log(`${cond?'  ok  ':'FAIL  '}${name}${extra?'  '+extra:''}`); if(!cond) fails++; };

// --- sweep unit tests -------------------------------------------------------
{
  const t = sweepCircleSegment({x:0,y:-100},{x:0,y:100}, 5, {x:-50,y:0},{x:50,y:0});
  ok('sweep detects a straight-on crossing', t !== null && Math.abs(t-0.475) < 0.02, `t=${t?.toFixed(3)}`);
}
{
  const t = sweepCircleSegment({x:200,y:-100},{x:200,y:100}, 5, {x:-50,y:0},{x:50,y:0});
  ok('sweep ignores a miss', t === null);
}
{ // the tunnelling case: a fast ball fully past a thin wall within one step
  const t = sweepCircleSegment({x:0,y:-40},{x:0,y:40}, 5, {x:-50,y:0},{x:50,y:0});
  ok('sweep catches a full pass-through', t !== null, `t=${t?.toFixed(3)}`);
}

// --- no-tunnel stress: fire balls at a wall at absurd speeds -----------------
{
  let escaped = 0, trials = 0;
  for (let speed = 200; speed <= 4000; speed += 50) {
    for (let ang = -1.2; ang <= 1.2; ang += 0.15) {
      trials++;
      const w = new World(400, 800);
      w.gravity = 0;
      w.segments.push(new Segment(-9000, 600, 9000, 600)); // wide, so a steep miss cannot leave the wall sideways
      const b = new Ball(200, 300);
      b.v = { x: Math.sin(ang) * speed, y: Math.cos(ang) * speed };
      w.balls.push(b);
      for (let i = 0; i < 240; i++) w.step(1/120);
      if (b.p.y > 600) escaped++;
    }
  }
  ok('ball never tunnels a wall (speed 200-4000)', escaped === 0, `${escaped}/${trials} escaped`);
}

// --- no-tunnel stress: through a MOVING flipper ------------------------------
{
  let escaped = 0, trials = 0;
  for (let speed = 400; speed <= 3000; speed += 100) {
    for (let off = -60; off <= 60; off += 10) {
      trials++;
      const w = new World(400, 800);
      w.gravity = 0;
      w.segments.push(new Segment(-200, 700, 600, 700));
      const f = new Flipper(200, 600, 90, 0.42, -0.42, 1);
      f.held = true;                        // snapping up as the ball arrives
      w.flippers.push(f);
      const b = new Ball(200 + off, 400);
      b.v = { x: 0, y: speed };
      w.balls.push(b);
      for (let i = 0; i < 200; i++) w.step(1/120);
      if (b.p.y > 700) escaped++;
    }
  }
  ok('ball never tunnels a moving flipper', escaped === 0, `${escaped}/${trials} escaped`);
}

// --- cradle: a held flipper must HOLD the ball, not leak it -----------------
{
  const w = new World(400, 800);
  w.segments.push(new Segment(60, 640, 60, 200));       // left wall to rest against
  const f = new Flipper(90, 620, 95, -0.5, -0.5, 1);    // held up, angled
  f.held = true;
  w.flippers.push(f);
  const b = new Ball(150, 400);
  w.balls.push(b);
  for (let i = 0; i < 600; i++) w.step(1/120);          // 5 seconds
  const rest = Math.hypot(b.v.x, b.v.y);
  ok('ball cradles on a held flipper', b.p.y < 700 && rest < 120, `y=${b.p.y.toFixed(0)} |v|=${rest.toFixed(0)}`);
}

// --- flip imparts real launch speed -----------------------------------------
{
  const w = new World(400, 800);
  w.gravity = 0;
  const f = new Flipper(120, 600, 95, 0.5, -0.5, 1);
  w.flippers.push(f);
  const b = new Ball(200, 640);            // resting on the flipper face
  w.balls.push(b);
  for (let i = 0; i < 10; i++) w.step(1/120);
  const before = Math.hypot(b.v.x, b.v.y);
  f.held = true;
  for (let i = 0; i < 30; i++) w.step(1/120);
  const after = Math.hypot(b.v.x, b.v.y);
  ok('flipping launches the ball', after > 300 && after > before + 200, `${before.toFixed(0)} -> ${after.toFixed(0)} px/s`);
}

// --- determinism: same inputs, same result ----------------------------------
{
  const run = () => {
    const w = new World(400, 800);
    w.segments.push(new Segment(0,780,400,780), new Segment(0,0,0,800), new Segment(400,0,400,800));
    const b = new Ball(180, 100); b.v = {x:130,y:40};
    w.balls.push(b);
    for (let i=0;i<2000;i++) w.step(1/120);
    return `${b.p.x.toFixed(6)},${b.p.y.toFixed(6)}`;
  };
  ok('simulation is deterministic', run() === run());
}

console.log(fails ? `\n${fails} FAILED` : '\nall physics tests passed');
process.exit(fails ? 1 : 0);
