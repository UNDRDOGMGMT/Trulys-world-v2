import React, { useMemo, useRef, useLayoutEffect } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Pop-up-book 3D landmarks: illustrated aubergine "paper" facades with drawn
 * amber windows, a single magenta ink outline on every silhouette, and a strict
 * palette — nature/water/glass are the only lilac. One landmark per district,
 * shaped to be distinctly itself (Capitol tower, the Chateau, SoFi, the LAX
 * Theme Building, the Queen Mary…) so the globe previews the environment.
 */

const R = 1;
const DEG = Math.PI / 180;
export function toVec3(lat: number, lon: number, r = R): [number, number, number] {
  const phi = lat * DEG, theta = lon * DEG;
  return [r * Math.cos(phi) * Math.sin(theta), r * Math.sin(phi), r * Math.cos(phi) * Math.cos(theta)];
}

// ── LOCKED 4-COLOR PALETTE ──
export const PAL = {
  paper: "#22123a",  // aubergine facade
  dark: "#2c1a45",   // unlit window / shadow
  ink: "#ff4fa3",    // magenta outline — all built structure
  amber: "#ffcf7a",  // warm light — windows, signs, beacons
  lilac: "#9d8bff",  // cool accent — nature, water, glass ONLY
  hot: "#ff2d8f",    // deep accent — beacons
  white: "#ffe6f4",
};

// edges helper
function edgesOf(geo: THREE.BufferGeometry, a = 1) { return new THREE.EdgesGeometry(geo, a); }

// dark body + glowing magenta edge outline
const Ink: React.FC<{ geo: THREE.BufferGeometry; edge?: string; emis?: string; ei?: number }> = ({ geo, edge = PAL.ink, emis = "#180d24", ei = 0.25 }) => {
  const e = useMemo(() => edgesOf(geo, 20), [geo]);
  return (
    <group>
      <mesh geometry={geo}><meshStandardMaterial color={PAL.paper} emissive={emis} emissiveIntensity={ei + 0.35} roughness={0.95} /></mesh>
      <lineSegments geometry={e}><lineBasicMaterial color={edge} transparent opacity={0.4} toneMapped={false} /></lineSegments>
    </group>
  );
};

// ── neon-WATERCOLOR facade: soft aubergine wash with color bleeds + softly
//    glowing window dabs. No hard outlines (painterly, not Tron). ──
const _fac: Record<string, THREE.CanvasTexture> = {};
export function facadeTex(key = "a"): THREE.CanvasTexture {
  if (_fac[key]) return _fac[key];
  const W = 128, H = 256;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#231437"; g.fillRect(0, 0, W, H);
  // soft watercolor washes bleeding through the paper
  const washes: [string, number][] = [["120,60,150", 0.16], ["70,55,150", 0.14], ["150,55,110", 0.13], ["90,45,120", 0.15]];
  for (const [col, al] of washes) for (let i = 0; i < 3; i++) {
    const x = Math.random() * W, y = Math.random() * H, r = 45 + Math.random() * 70;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${col},${al})`); grad.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
  }
  // softly glowing window dabs (radial, feathered — not hard rectangles)
  const cols = 4, rows = 10, mL = 20, mT = 20;
  const sx = (W - 2 * mL) / cols, sy = (H - 2 * mT) / rows;
  for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
    if (Math.random() < 0.42) continue;
    const x = mL + col * sx + sx / 2, y = mT + r * sy + sy / 2, rad = 11;
    const warm = Math.random() < 0.82 ? "255,207,122" : "255,158,194";
    const grad = g.createRadialGradient(x, y, 0.5, x, y, rad);
    grad.addColorStop(0, `rgba(${warm},0.95)`); grad.addColorStop(0.45, `rgba(${warm},0.4)`); grad.addColorStop(1, `rgba(${warm},0)`);
    g.fillStyle = grad; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  _fac[key] = t; return t;
}

const PopBuilding: React.FC<{ w?: number; h?: number; d?: number; x?: number; z?: number; rot?: number; edge?: string; crown?: boolean }> = ({
  w = 0.7, h = 1, d = 0.7, x = 0, z = 0, rot = 0, edge = PAL.ink, crown = false,
}) => {
  const geo = useMemo(() => new THREE.BoxGeometry(w, h, d), [w, h, d]);
  const e = useMemo(() => edgesOf(geo), [geo]);
  const tex = useMemo(() => {
    const t = facadeTex(["a", "b", "c"][Math.floor(Math.random() * 3)]).clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(1, Math.round(w * 1.8)), Math.max(1, Math.round(h * 1.5)));
    return t;
  }, [w, h]);
  void e; void edge;
  return (
    <group position={[x, h / 2, z]} rotation={[0, rot, 0]}>
      <mesh geometry={geo}><meshStandardMaterial map={tex} emissiveMap={tex} emissive={"#ffffff"} emissiveIntensity={0.65} roughness={0.95} /></mesh>
      {crown && <>
        <mesh position={[0, h / 2 + 0.3, 0]}><cylinderGeometry args={[0.012, 0.012, 0.6, 5]} /><meshBasicMaterial color={PAL.amber} transparent opacity={0.85} toneMapped={false} /></mesh>
        <mesh position={[0, h / 2 + 0.62, 0]}><sphereGeometry args={[0.045, 8, 8]} /><meshBasicMaterial color={PAL.hot} toneMapped={false} /></mesh>
      </>}
    </group>
  );
};

// windowed cylinder wall (glass floor band)
const _wcol = (() => {
  const c = document.createElement("canvas"); c.width = 48; c.height = 24;
  const g = c.getContext("2d")!; g.fillStyle = PAL.paper; g.fillRect(0, 0, 48, 24);
  for (let x = 0; x < 8; x++) { g.fillStyle = Math.random() > 0.3 ? PAL.amber : PAL.dark; g.fillRect(2 + x * 6, 6, 4, 12); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();
const WinCyl: React.FC<{ r: number; h: number; y: number; seg?: number }> = ({ r, h, y, seg = 30 }) => {
  const wt = useMemo(() => { const t = _wcol.clone(); t.needsUpdate = true; t.repeat.set(Math.max(2, Math.round(r * 8)), 1); return t; }, [r]);
  return (
    <mesh position={[0, y, 0]}>
      <cylinderGeometry args={[r, r, h, seg, 1, true]} />
      <meshStandardMaterial map={wt} emissiveMap={wt} emissive={"#ffffff"} emissiveIntensity={0.6} roughness={0.8} side={THREE.DoubleSide} />
    </mesh>
  );
};

const InkCyl: React.FC<{ rt?: number; rb?: number; h?: number; y?: number; x?: number; z?: number; edge?: string; seg?: number }> = ({
  rt = 0.5, rb = 0.5, h = 0.3, y = 0, x = 0, z = 0, edge = PAL.ink, seg = 24,
}) => {
  const geo = useMemo(() => new THREE.CylinderGeometry(rt, rb, h, seg), [rt, rb, h, seg]);
  return <group position={[x, y, z]}><Ink geo={geo} edge={edge} /></group>;
};

const InkCone: React.FC<{ r?: number; h?: number; y?: number; x?: number; z?: number; rot?: number; edge?: string; seg?: number }> = ({
  r = 0.4, h = 0.6, y = 0, x = 0, z = 0, rot = 0, edge = PAL.ink, seg = 4,
}) => {
  const geo = useMemo(() => new THREE.ConeGeometry(r, h, seg), [r, h, seg]);
  return <group position={[x, y, z]} rotation={[0, rot, 0]}><Ink geo={geo} edge={edge} /></group>;
};

// thin structural bar (no windows)
const Bar: React.FC<{ w?: number; h?: number; d?: number; x?: number; y?: number; z?: number; c?: string }> = ({ w = 0.1, h = 1, d = 0.1, x = 0, y = 0, z = 0, c = PAL.ink }) => (
  <mesh position={[x, y, z]}><boxGeometry args={[w, h, d]} /><meshBasicMaterial color={c} toneMapped={false} /></mesh>
);

// flat water patch — a feathered lilac-to-pink glow that melts into the globe's
// painted ocean. (Was a hard lilac disc + rim, which read from orbit as random
// grey circles stamped on the planet.)
const waterGlowTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const gr = g.createRadialGradient(64, 64, 6, 64, 64, 64);
    gr.addColorStop(0, "rgba(157,139,255,0.42)");
    gr.addColorStop(0.5, "rgba(255,79,163,0.20)");
    gr.addColorStop(1, "rgba(255,79,163,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    t = new THREE.CanvasTexture(c);
    return t;
  };
})();
const Water: React.FC<{ r?: number; x?: number; z?: number; ring?: boolean; scale?: [number, number] }> = ({ r = 1.2, x = 0, z = 0, ring = true, scale = [1, 1] }) => {
  void ring; // kept for call-site compat; the glow has no rim by design
  return (
    <group position={[x, 0.018, z]} scale={[scale[0], 1, scale[1]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[r * 2.9, r * 2.9]} />
        <meshBasicMaterial map={waterGlowTex()} transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};

const Palm: React.FC<{ x?: number; z?: number; s?: number }> = ({ x = 0, z = 0, s = 1 }) => (
  <group position={[x, 0, z]} scale={s}>
    <mesh position={[0, 0.55, 0]}><cylinderGeometry args={[0.04, 0.07, 1.1, 6]} /><meshStandardMaterial color={PAL.paper} emissive={PAL.amber} emissiveIntensity={0.25} /></mesh>
    {[0, 1, 2, 3, 4].map((k) => (
      <mesh key={k} position={[Math.cos((k / 5) * 6.28) * 0.22, 1.12, Math.sin((k / 5) * 6.28) * 0.22]} rotation={[0.6, (k / 5) * 6.28, 0]}>
        <coneGeometry args={[0.06, 0.5, 4]} /><meshStandardMaterial color="#241633" emissive={PAL.lilac} emissiveIntensity={0.7} />
      </mesh>
    ))}
  </group>
);

const Pine: React.FC<{ x?: number; z?: number; s?: number }> = ({ x = 0, z = 0, s = 1 }) => {
  const geo = useMemo(() => new THREE.ConeGeometry(0.32, 1.05, 7), []);
  const e = useMemo(() => edgesOf(geo, 40), [geo]);
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh geometry={geo} position={[0, 0.5, 0]}><meshStandardMaterial color="#1c1230" emissive={PAL.lilac} emissiveIntensity={0.45} /></mesh>
      <lineSegments geometry={e} position={[0, 0.5, 0]}><lineBasicMaterial color={PAL.lilac} transparent opacity={0.4} toneMapped={false} /></lineSegments>
    </group>
  );
};

const Sign: React.FC<{ x?: number; z?: number; h?: number }> = ({ x = 0, z = 0, h = 1.6 }) => {
  const geo = useMemo(() => new THREE.BoxGeometry(0.7, 0.46, 0.05), []);
  const e = useMemo(() => edgesOf(geo), [geo]);
  return (
    <group position={[x, 0, z]}>
      <Bar w={0.02} h={h} d={0.02} y={h * 0.5} c={PAL.ink} />
      <group position={[0, h + 0.28, 0]}>
        <mesh geometry={geo}><meshStandardMaterial color={PAL.paper} emissive={PAL.amber} emissiveIntensity={1.2} /></mesh>
        <lineSegments geometry={e}><lineBasicMaterial color={PAL.ink} transparent opacity={0.45} toneMapped={false} /></lineSegments>
      </group>
    </group>
  );
};

// blinking beacon
const Beacon: React.FC<{ y: number; color?: string }> = ({ y, color = PAL.hot }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const m = ref.current; if (!m) return;
    const b = 0.5 + 0.5 * Math.sin(s.clock.elapsedTime * 3.2);
    (m.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.65 * b;
    m.scale.setScalar(0.8 + 0.6 * b);
  });
  return <mesh ref={ref} position={[0, y, 0]}><sphereGeometry args={[0.06, 12, 12]} /><meshBasicMaterial color={color} transparent toneMapped={false} /></mesh>;
};

// ── LANDMARKS ──

// HOLLYWOOD — Capitol Records: circular stack of record-fins, needle + beacon
const RecordTower: React.FC = () => {
  const floors = 9;
  const finGeo = useMemo(() => new THREE.CylinderGeometry(0.56, 0.56, 0.035, 30), []);
  const finEdges = useMemo(() => edgesOf(finGeo, 40), [finGeo]);
  const lobbyEdges = useMemo(() => edgesOf(new THREE.CylinderGeometry(0.6, 0.6, 0.34, 30), 40), []);
  const top = 0.5 + floors * 0.2;
  return (
    <group>
      <InkCyl rt={0.92} rb={0.96} h={0.12} y={0.06} edge={PAL.ink} seg={30} />
      <WinCyl r={0.6} h={0.34} y={0.29} />
      <lineSegments geometry={lobbyEdges} position={[0, 0.29, 0]}><lineBasicMaterial color={PAL.ink} transparent opacity={0.45} toneMapped={false} /></lineSegments>
      {Array.from({ length: floors }).map((_, k) => {
        const y0 = 0.5 + k * 0.2;
        return (
          <group key={k}>
            <WinCyl r={0.46} h={0.15} y={y0 + 0.075} />
            <mesh geometry={finGeo} position={[0, y0 + 0.165, 0]}><meshStandardMaterial color={PAL.paper} emissive="#180d24" emissiveIntensity={0.25} /></mesh>
            <lineSegments geometry={finEdges} position={[0, y0 + 0.165, 0]}><lineBasicMaterial color={PAL.ink} transparent opacity={0.45} toneMapped={false} /></lineSegments>
          </group>
        );
      })}
      <InkCyl rt={0.4} rb={0.46} h={0.12} y={top + 0.06} edge={PAL.ink} seg={30} />
      <Bar w={0.022} h={1.2} d={0.022} y={top + 0.7} c={PAL.white} />
      <Beacon y={top + 1.35} />
    </group>
  );
};

// DTLA — skyline cluster, tallest with tapered spire crown
const Skyline: React.FC = () => {
  const towers = [
    { x: 0, h: 2.6, w: 0.5, taper: true }, { x: -0.7, h: 1.8, w: 0.5 }, { x: 0.7, h: 2.1, w: 0.5 },
    { x: -1.3, h: 1.3, w: 0.45 }, { x: 1.35, h: 1.6, w: 0.45 },
    { x: 0.2, h: 1.1, w: 0.4, z: 0.9 }, { x: -0.5, h: 1.0, w: 0.4, z: 0.9 },
  ];
  return (
    <group>
      {towers.map((t, k) => (
        <group key={k}>
          <PopBuilding x={t.x} z={(t as any).z ?? 0} w={t.w} d={t.w} h={t.h} edge={k === 0 ? PAL.lilac : PAL.ink} crown={t.h > 2 && !t.taper} />
          {t.taper && <InkCone x={t.x} y={t.h + 0.2} r={t.w * 0.7} h={0.4} seg={4} edge={PAL.lilac} />}
        </group>
      ))}
    </group>
  );
};

// WEHO — the Chateau: château body + pitched gables + corner turret + signs
const Chateau: React.FC = () => (
  <group>
    <PopBuilding w={0.75} h={2.1} d={0.75} edge={PAL.ink} />
    <InkCone r={0.62} h={0.6} y={2.4} seg={4} rot={Math.PI / 4} edge={PAL.ink} />
    {/* corner turret */}
    <group position={[0.42, 0, 0.42]}>
      <InkCyl rt={0.16} rb={0.16} h={2.4} y={1.2} edge={PAL.ink} seg={10} />
      <InkCone r={0.22} h={0.4} y={2.6} seg={10} edge={PAL.ink} />
    </group>
    <Sign x={-1.05} z={0.2} h={1.9} />
    <Sign x={1.05} z={-0.2} h={1.4} />
  </group>
);

// SILVER LAKE — reservoir + shoreline + Micheltorena tiled stairs + houses
const Reservoir: React.FC = () => (
  <group>
    <Water r={1.25} scale={[1, 0.8]} />
    {/* tiled stairs */}
    <group position={[-1.35, 0, 0.4]}>
      {Array.from({ length: 6 }).map((_, k) => (
        <mesh key={k} position={[0, 0.06 + k * 0.09, -k * 0.12]}><boxGeometry args={[0.5, 0.06, 0.12]} /><meshStandardMaterial color={PAL.paper} emissive={PAL.amber} emissiveIntensity={0.6} /></mesh>
      ))}
    </group>
    <PopBuilding x={1.5} z={-0.4} w={0.4} h={0.7} d={0.4} />
    <Pine x={1.55} z={0.6} s={0.8} />
  </group>
);

// LAUREL CANYON — canyon cabin + pines
const Cabin: React.FC = () => (
  <group>
    <PopBuilding w={0.9} h={0.8} d={0.8} edge={PAL.ink} />
    <InkCone r={0.72} h={0.55} y={1.05} seg={4} rot={Math.PI / 4} edge={PAL.ink} />
    <Pine x={-0.95} z={0.3} /><Pine x={0.95} z={-0.4} s={0.85} /><Pine x={0.6} z={0.85} s={0.7} />
  </group>
);

// THE VALLEY — flat orthogonal street-grid of low buildings + 2 mid-rises
const ValleyGrid: React.FC = () => (
  <group>
    {Array.from({ length: 16 }).map((_, k) => {
      const gx = (k % 4) - 1.5, gz = Math.floor(k / 4) - 1.5;
      const mid = k === 5 || k === 10;
      return <PopBuilding key={k} x={gx * 0.62} z={gz * 0.62} w={0.42} h={mid ? 1.1 : 0.3 + (k % 3) * 0.16} d={0.42} edge={PAL.ink} crown={mid} />;
    })}
  </group>
);

// INGLEWOOD — SoFi oval canopy over a lilac field
const Stadium: React.FC = () => (
  <group>
    <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.25, 0.85, 1]}><circleGeometry args={[1, 40]} /><meshStandardMaterial color="#25093a" emissive={PAL.hot} emissiveIntensity={0.22} /></mesh>
    {/* bowl */}
    <mesh position={[0, 0.24, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.25, 0.85, 1]}><torusGeometry args={[1.05, 0.24, 10, 48]} /><meshStandardMaterial color={PAL.paper} emissive="#180d24" emissiveIntensity={0.3} /></mesh>
    {/* oval canopy ring (roof) */}
    <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.35, 0.95, 1]}><torusGeometry args={[1.1, 0.05, 8, 56]} /><meshBasicMaterial color={PAL.ink} toneMapped={false} /></mesh>
    <PopBuilding x={-2.0} z={0.3} w={0.4} h={0.6} d={0.4} />
  </group>
);

// LAX — the Theme Building: crossed parabolic arches + central saucer + runway
const Ufo: React.FC = () => (
  <group>
    <mesh position={[0.4, 0.03, 0]}><boxGeometry args={[2.8, 0.06, 0.5]} /><meshStandardMaterial color={PAL.paper} emissive={PAL.amber} emissiveIntensity={0.35} /></mesh>
    <group position={[-0.9, 0, 0]}>
      {/* two crossed arches */}
      <mesh rotation={[0, 0, 0]}><torusGeometry args={[0.9, 0.05, 8, 24, Math.PI]} /><meshBasicMaterial color={PAL.ink} toneMapped={false} /></mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.9, 0.05, 8, 24, Math.PI]} /><meshBasicMaterial color={PAL.ink} toneMapped={false} /></mesh>
      {/* central saucer disc */}
      <group position={[0, 0.92, 0]}>
        <mesh scale={[1, 0.34, 1]}><sphereGeometry args={[0.5, 24, 14]} /><meshStandardMaterial color={PAL.paper} emissive="#180d24" emissiveIntensity={0.3} /></mesh>
        <mesh scale={[1, 0.34, 1]}><sphereGeometry args={[0.5, 20, 12]} /><meshBasicMaterial color={PAL.lilac} wireframe toneMapped={false} /></mesh>
        {Array.from({ length: 8 }).map((_, k) => (
          <mesh key={k} position={[Math.cos((k / 8) * 6.28) * 0.44, -0.04, Math.sin((k / 8) * 6.28) * 0.44]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color={PAL.amber} toneMapped={false} /></mesh>
        ))}
        <Beacon y={0.28} color={PAL.hot} />
      </group>
    </group>
    {/* control tower */}
    <group position={[1.3, 0, 0.35]}>
      <Bar w={0.06} h={1.2} d={0.06} y={0.6} c={PAL.ink} />
      <group position={[0, 1.2, 0]}><InkBoxLite w={0.3} h={0.22} d={0.3} edge={PAL.amber} /></group>
    </group>
  </group>
);

// BEVERLY HILLS — low mansions + palms + a pool
const Mansions: React.FC = () => (
  <group>
    <PopBuilding w={1.15} h={0.6} d={0.75} />
    <PopBuilding x={-1.2} z={0.3} w={0.9} h={0.5} d={0.6} />
    <PopBuilding x={1.2} z={-0.2} w={0.85} h={0.55} d={0.6} edge={PAL.lilac} />
    <Water r={0.4} x={0} z={0.9} scale={[1.4, 0.7]} />
    <Palm x={-0.6} z={0.9} s={0.9} /><Palm x={0.7} z={0.8} s={0.9} /><Palm x={0} z={-0.9} s={0.8} />
  </group>
);

// VENICE — the "VENICE" archway + canal + boardwalk
const Boardwalk: React.FC = () => (
  <group>
    <Water r={0.6} x={0} z={0.9} scale={[3, 0.5]} />
    <mesh position={[0, 0.09, 0]}><boxGeometry args={[2.6, 0.16, 0.7]} /><meshStandardMaterial color={PAL.paper} emissive={PAL.amber} emissiveIntensity={0.35} /></mesh>
    {/* VENICE arch */}
    <group>
      <Bar w={0.05} h={1.0} d={0.05} x={-0.5} y={0.5} c={PAL.ink} />
      <Bar w={0.05} h={1.0} d={0.05} x={0.5} y={0.5} c={PAL.ink} />
      <Bar w={1.05} h={0.16} d={0.05} y={1.05} c={PAL.amber} />
    </group>
    <PopBuilding x={-1.05} w={0.5} h={0.7} d={0.5} />
    <PopBuilding x={1.05} w={0.5} h={0.6} d={0.5} />
    <Palm x={-1.5} z={0.4} s={0.9} /><Palm x={1.5} z={0.4} s={0.9} />
  </group>
);

// MALIBU — stilted cliff house over a wave
const BeachHouse: React.FC = () => (
  <group>
    <Water r={0.9} z={0.9} scale={[1.6, 0.7]} ring={false} />
    {[[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.3], [0.4, 0.3]].map((p, k) => (
      <Bar key={k} w={0.05} h={0.7} d={0.05} x={p[0]} y={0.35} z={p[1]} c={PAL.ink} />
    ))}
    <group position={[0, 0.55, 0]}><PopBuilding w={1.1} h={0.5} d={0.8} /></group>
    <InkCone r={0.75} h={0.32} y={1.28} seg={4} rot={Math.PI / 4} edge={PAL.ink} />
    <Palm x={-0.95} z={0.5} /><Palm x={0.95} z={-0.4} s={0.85} />
  </group>
);

// LONG BEACH — gantry crane + the Queen Mary + water
const Port: React.FC = () => (
  <group>
    <Water r={1.0} z={0.7} scale={[2.4, 0.8]} ring={false} />
    {/* Queen Mary */}
    <group position={[0.3, 0, 0.6]}>
      <mesh position={[0, 0.22, 0]}><boxGeometry args={[1.8, 0.34, 0.5]} /><meshStandardMaterial color={PAL.paper} emissive={PAL.amber} emissiveIntensity={0.45} /></mesh>
      <lineSegments geometry={useMemo(() => edgesOf(new THREE.BoxGeometry(1.8, 0.34, 0.5)), [])} position={[0, 0.22, 0]}><lineBasicMaterial color={PAL.ink} transparent opacity={0.45} toneMapped={false} /></lineSegments>
      <mesh position={[-0.45, 0.5, 0]}><boxGeometry args={[1.0, 0.22, 0.42]} /><meshStandardMaterial color={PAL.paper} emissive={PAL.amber} emissiveIntensity={0.5} /></mesh>
      {[-0.55, -0.2, 0.15].map((fx, k) => (
        <group key={k}><InkCyl rt={0.09} rb={0.11} h={0.4} y={0.82} x={fx} seg={12} edge={PAL.ink} /></group>
      ))}
    </group>
    {/* gantry crane */}
    <group position={[-1.2, 0, -0.2]}>
      <Bar w={0.06} h={1.8} d={0.06} y={0.9} c={PAL.ink} />
      <Bar w={1.2} h={0.06} d={0.06} x={0.5} y={1.75} c={PAL.lilac} />
      <Bar w={0.03} h={0.9} d={0.03} x={1.0} y={1.3} c={PAL.amber} />
    </group>
  </group>
);

// KOREATOWN — dense mid-rises + vertical neon signs
const Midrise: React.FC = () => (
  <group>
    <PopBuilding w={0.6} h={1.5} d={0.6} crown />
    <PopBuilding x={-0.78} z={0.2} w={0.55} h={1.1} d={0.55} />
    <PopBuilding x={0.78} z={-0.1} w={0.55} h={1.3} d={0.55} edge={PAL.lilac} />
    <Sign x={0} z={0.78} h={1.7} />
    <Sign x={-0.98} z={-0.5} h={1.2} />
  </group>
);

// tiny lite box (no windows) for small caps like the control-tower cab
const InkBoxLite: React.FC<{ w: number; h: number; d: number; edge?: string }> = ({ w, h, d, edge = PAL.ink }) => {
  const geo = useMemo(() => new THREE.BoxGeometry(w, h, d), [w, h, d]);
  return <Ink geo={geo} edge={edge} emis={PAL.amber} ei={0.8} />;
};

// SANTA MONICA — pier on pilings over water + round Ferris wheel
const FerrisWheel: React.FC = () => (
  <group position={[0.2, 0, 0]}>
    <Water r={1.0} x={-0.2} z={0} scale={[3, 1.3]} ring={false} />
    {/* pier deck + pilings */}
    <group position={[-1.0, 0, 0]}>
      <mesh position={[0, 0.38, 0]}><boxGeometry args={[2.3, 0.12, 0.7]} /><meshStandardMaterial color={PAL.paper} emissive={PAL.amber} emissiveIntensity={0.4} /></mesh>
      {[-0.9, -0.3, 0.3, 0.9].map((px, k) => (
        <React.Fragment key={k}><Bar w={0.05} h={0.35} d={0.05} x={px} y={0.17} z={0.25} c={PAL.ink} /><Bar w={0.05} h={0.35} d={0.05} x={px} y={0.17} z={-0.25} c={PAL.ink} /></React.Fragment>
      ))}
    </group>
    {/* wheel */}
    <group position={[0.5, 1.4, 0]}>
      <mesh><torusGeometry args={[0.95, 0.04, 12, 56]} /><meshBasicMaterial color={PAL.ink} toneMapped={false} /></mesh>
      {Array.from({ length: 12 }).map((_, k) => (
        <mesh key={k} rotation={[0, 0, (k / 12) * 6.28]}><boxGeometry args={[1.9, 0.012, 0.012]} /><meshBasicMaterial color={PAL.lilac} toneMapped={false} /></mesh>
      ))}
      {Array.from({ length: 12 }).map((_, k) => (
        <mesh key={"c" + k} position={[Math.cos((k / 12) * 6.28) * 0.95, Math.sin((k / 12) * 6.28) * 0.95, 0]}><sphereGeometry args={[0.06, 8, 8]} /><meshBasicMaterial color={PAL.amber} toneMapped={false} /></mesh>
      ))}
      <mesh><sphereGeometry args={[0.09, 10, 10]} /><meshBasicMaterial color={PAL.white} toneMapped={false} /></mesh>
    </group>
    <Bar w={0.05} h={1.5} d={0.05} x={0.5} y={0.75} c={PAL.ink} />
  </group>
);

// ── CONTENT PANELS — a canvas painter for letters + billboard copy (so signs
//    can carry real content, not blank yellow). Redraws once webfonts load. ──
const _panels: Record<string, THREE.CanvasTexture> = {};
function makePanel(key: string, draw: (g: CanvasRenderingContext2D, W: number, H: number) => void, w = 256, h = 128): THREE.CanvasTexture {
  if (_panels[key]) return _panels[key];
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  const run = () => { g.clearRect(0, 0, w, h); draw(g, w, h); };
  run();
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  const fr = (document as any).fonts?.ready;
  if (fr) fr.then(() => { run(); t.needsUpdate = true; });
  _panels[key] = t; return t;
}
function letterTexture(ch: string): THREE.CanvasTexture {
  return makePanel("L" + ch, (g, W, H) => {
    g.fillStyle = "#170c22"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#fff3e0"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `bold ${Math.floor(H * 0.72)}px Griffy, "Trebuchet MS", sans-serif`;
    g.fillText(ch, W / 2, H * 0.54);
  }, 128, 200);
}
function copyTexture(text: string): THREE.CanvasTexture {
  return makePanel("C" + text, (g, W, H) => {
    g.fillStyle = PAL.paper; g.fillRect(0, 0, W, H);
    g.strokeStyle = PAL.ink; g.lineWidth = 7; g.strokeRect(4, 4, W - 8, H - 8);
    g.fillStyle = PAL.amber; g.textAlign = "center"; g.textBaseline = "middle";
    const words = text.split(" ");
    const two = words.length > 1 && text.length > 9;
    const fs = two ? 40 : text.length > 8 ? 44 : 56;
    g.font = `bold ${fs}px Griffy, "Trebuchet MS", sans-serif`;
    if (two) {
      const mid = Math.ceil(words.length / 2);
      g.fillText(words.slice(0, mid).join(" "), W / 2, H / 2 - fs * 0.55);
      g.fillText(words.slice(mid).join(" "), W / 2, H / 2 + fs * 0.55);
    } else g.fillText(text, W / 2, H / 2);
  }, 256, 128);
}

// stylized mountain the Hollywood sign sits on
// A soft rounded storybook hill — the letters perch on its slope. Was a 6-sided
// cone that read as a raw navy polyhedron; now a smooth lilac dome matching the
// surface's painted hills, with a couple of drawn contour rings.
const Mountain: React.FC<{ x?: number; z?: number; r?: number; h?: number }> = ({ x = 0, z = 0, r = 2.6, h = 1.7 }) => {
  const geo = useMemo(() => {
    // top half of a squashed sphere = a soft mound
    const g = new THREE.SphereGeometry(r, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(1, h / r, 1);
    return g;
  }, [r, h]);
  const rings = useMemo(() => [0.62, 0.34].map((f) => {
    const rg = new THREE.TorusGeometry(r * f, 0.012, 6, 40);
    rg.rotateX(Math.PI / 2);
    return rg;
  }), [r]);
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={geo}>
        <meshStandardMaterial color="#2a1240" emissive={PAL.hot} emissiveIntensity={0.10} roughness={1} flatShading={false} />
      </mesh>
      {rings.map((rg, i) => (
        <mesh key={i} geometry={rg} position={[0, h * (i === 0 ? 0.30 : 0.58), 0]}>
          <meshBasicMaterial color={PAL.ink} transparent opacity={0.35} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

// one glowing sign letter on a post
const LetterBoard: React.FC<{ ch: string; x: number; y: number; z: number; rot?: number }> = ({ ch, x, y, z, rot = 0 }) => {
  const tex = useMemo(() => letterTexture(ch), [ch]);
  return (
    <group position={[x, y, z]} rotation={[rot, 0, 0]}>
      <mesh position={[0, 0.28, 0]}><planeGeometry args={[0.32, 0.56]} /><meshStandardMaterial map={tex} emissiveMap={tex} emissive={"#ffffff"} emissiveIntensity={0.55} side={THREE.DoubleSide} /></mesh>
      <Bar w={0.02} h={0.28} d={0.02} x={-0.09} y={0.14} c={PAL.ink} />
      <Bar w={0.02} h={0.28} d={0.02} x={0.09} y={0.14} c={PAL.ink} />
    </group>
  );
};

// a content billboard (text now; image-ready)
const Billboard: React.FC<{ text: string; x?: number; z?: number; h?: number; rot?: number }> = ({ text, x = 0, z = 0, h = 1.1, rot = 0 }) => {
  const tex = useMemo(() => copyTexture(text), [text]);
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <Bar w={0.03} h={h} d={0.03} x={-0.35} y={h / 2} c={PAL.ink} />
      <Bar w={0.03} h={h} d={0.03} x={0.35} y={h / 2} c={PAL.ink} />
      <mesh position={[0, h + 0.25, 0]}><planeGeometry args={[0.92, 0.5]} /><meshStandardMaterial map={tex} emissiveMap={tex} emissive={"#ffffff"} emissiveIntensity={0.8} side={THREE.DoubleSide} /></mesh>
    </group>
  );
};

// the Chinese/Dolby Theatre — tiered pagoda roof
const Pagoda: React.FC<{ x?: number; z?: number }> = ({ x = 0, z = 0 }) => (
  <group position={[x, 0, z]}>
    <PopBuilding w={0.95} h={0.6} d={0.75} />
    <InkCone r={0.78} h={0.24} y={0.74} seg={4} rot={Math.PI / 4} edge={PAL.ink} />
    <InkCone r={0.54} h={0.22} y={0.96} seg={4} rot={Math.PI / 4} edge={PAL.ink} />
    <Bar w={0.03} h={0.3} d={0.03} y={1.2} c={PAL.amber} />
  </group>
);

// HOLLYWOOD neighborhood — sign on the mountain + Capitol tower + theatre + boulevard
const HollywoodHood: React.FC = () => (
  <group>
    <Mountain x={0} z={-1.75} r={1.75} h={0.9} />
    {"HOLLYWOOD".split("").map((ch, k) => (
      <LetterBoard key={k} ch={ch} x={(k - 4) * 0.34} y={0.42} z={-1.05} rot={-0.32} />
    ))}
    <RecordTower />
    <Pagoda x={1.9} z={0.7} />
    <PopBuilding x={-1.7} z={0.9} w={0.6} h={0.95} d={0.6} />
    <PopBuilding x={-1.05} z={1.55} w={0.55} h={0.7} d={0.55} />
    <PopBuilding x={0.95} z={1.7} w={0.6} h={0.85} d={0.6} />
    <Billboard text="TRULY YOUNG" x={-1.75} z={1.7} h={1.0} rot={0.4} />
    <Billboard text="SHADOWS" x={1.35} z={2.0} h={0.85} rot={-0.5} />
  </group>
);

// ── extra signature pieces for the dioramas ──
const Dome: React.FC<{ x?: number; z?: number; r?: number; c?: string }> = ({ x = 0, z = 0, r = 0.5, c = PAL.ink }) => (
  <group position={[x, 0, z]}>
    <mesh><sphereGeometry args={[r, 18, 10, 0, 6.28, 0, 1.57]} /><meshStandardMaterial color={PAL.paper} emissive={PAL.amber} emissiveIntensity={0.55} /></mesh>
    <mesh><sphereGeometry args={[r, 18, 10, 0, 6.28, 0, 1.57]} /><meshBasicMaterial color={c} wireframe toneMapped={false} /></mesh>
  </group>
);
const Hotel: React.FC<{ x?: number; z?: number }> = ({ x = 0, z = 0 }) => (
  <group position={[x, 0, z]}>
    <PopBuilding w={1.3} h={0.75} d={0.7} edge={PAL.hot} />
    <Palm x={-0.75} z={0.55} /><Palm x={0.75} z={0.55} />
  </group>
);
const DecoTower: React.FC<{ x?: number; z?: number }> = ({ x = 0, z = 0 }) => (
  <group position={[x, 0, z]}>
    <PopBuilding w={0.7} h={1.0} d={0.7} />
    <group position={[0, 1.0, 0]}><PopBuilding w={0.5} h={0.6} d={0.5} /></group>
    <group position={[0, 1.6, 0]}><PopBuilding w={0.3} h={0.4} d={0.3} crown /></group>
  </group>
);
const Soundstage: React.FC<{ x?: number; z?: number }> = ({ x = 0, z = 0 }) => (
  <group position={[x, 0, z]}>
    <PopBuilding w={1.4} h={0.5} d={1.0} />
    <group position={[1.0, 0, 0.6]}>
      {[[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].map((p, k) => <Bar key={k} w={0.03} h={0.6} d={0.03} x={p[0]} y={0.3} z={p[1]} c={PAL.ink} />)}
      <group position={[0, 0.72, 0]}><InkCyl rt={0.22} rb={0.22} h={0.25} seg={10} edge={PAL.ink} /></group>
      <InkCone r={0.24} h={0.18} y={0.95} seg={10} edge={PAL.ink} />
    </group>
  </group>
);
const DisneyHall: React.FC<{ x?: number; z?: number }> = ({ x = 0, z = 0 }) => (
  <group position={[x, 0, z]}>
    {[[-0.3, 0, 0.3], [0.1, 0.2, -0.2], [0.36, -0.1, 0.16]].map((p, k) => (
      <mesh key={k} position={[p[0], 0.42, p[2]]} rotation={[0.25 * p[1], k * 0.7, 0.5]}>
        <boxGeometry args={[0.55, 0.85, 0.08]} /><meshStandardMaterial color="#2a2140" emissive={PAL.lilac} emissiveIntensity={0.7} metalness={0.5} roughness={0.35} />
      </mesh>
    ))}
  </group>
);

/* ── CUTE CUTOUTS ──────────────────────────────────────────────────────────
   Higgsfield-illustrated Truly's World building cutouts (transparent PNGs) that
   stand upright on the diorama and YAW to face the viewer, so each cute façade
   stays readable however the planet is spun — a little pop-up-book block. This
   is the "code lays out, Higgsfield draws" pass, starting with Downtown. */
const BUILD = "/world/buildings/";
const _camLocal = new THREE.Vector3();
const Cutout: React.FC<{ src: string; h: number; aspect: number; x?: number; z?: number; glow?: number }> = ({ src, h, aspect, x = 0, z = 0, glow = 0.55 }) => {
  const tex = useLoader(THREE.TextureLoader, BUILD + src);
  const ref = useRef<THREE.Mesh>(null);
  const w = h * aspect;
  useFrame(({ camera }) => {
    const m = ref.current; if (!m || !m.parent) return;
    _camLocal.copy(camera.position); m.parent.worldToLocal(_camLocal);
    m.rotation.y = Math.atan2(_camLocal.x - x, _camLocal.z - z);   // yaw toward camera, stay upright
  });
  return (
    <mesh ref={ref} position={[x, h / 2, z]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} emissiveMap={tex} emissive={"#ffffff"} emissiveIntensity={glow*1.35}
        transparent alphaTest={0.42} side={THREE.DoubleSide} roughness={0.9} depthWrite />
    </mesh>
  );
};

// ── CUTE ON-BRAND CHARMS: spider-hearts (with little eyes) + bats that float
//    and bob over every diorama, yawing to face the viewer. The signature motifs
//    of Truly's World, so each district reads as HERS, not just a generic city. ──
function charmTex(key: string, draw: (g: CanvasRenderingContext2D, S: number) => void): THREE.CanvasTexture {
  if (_panels["CH" + key]) return _panels["CH" + key];
  const S = 128; const c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d")!; draw(g, S);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; _panels["CH" + key] = t; return t;
}
function heartPath(g: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  g.beginPath();
  g.moveTo(cx, cy + s * 0.72);
  g.bezierCurveTo(cx - s * 1.1, cy - s * 0.3, cx - s * 0.55, cy - s * 0.98, cx, cy - s * 0.3);
  g.bezierCurveTo(cx + s * 0.55, cy - s * 0.98, cx + s * 1.1, cy - s * 0.3, cx, cy + s * 0.72);
  g.closePath();
}
const spiderHeartTex = () => charmTex("spiderheart", (g, S) => {
  const cx = S / 2, cy = S * 0.46, s = S * 0.24;
  g.strokeStyle = "#ff2d8f"; g.lineWidth = 3; g.lineCap = "round";
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const y = cy - s * 0.15 + i * s * 0.26;
    g.beginPath(); g.moveTo(cx + side * s * 0.3, y);
    g.lineTo(cx + side * s * 0.95, y - s * 0.25 + i * s * 0.13);
    g.lineTo(cx + side * s * 1.3, y + s * 0.12 + i * s * 0.14); g.stroke();
  }
  heartPath(g, cx, cy, s);
  g.fillStyle = "#ff4fa3"; g.shadowColor = "#ff2d8f"; g.shadowBlur = 15; g.fill();
  g.shadowBlur = 0; g.lineWidth = 2.5; g.strokeStyle = "#ffe6f4"; g.stroke();
  g.fillStyle = "#170c22";
  g.beginPath(); g.arc(cx - s * 0.26, cy - s * 0.02, s * 0.1, 0, 6.28); g.fill();
  g.beginPath(); g.arc(cx + s * 0.26, cy - s * 0.02, s * 0.1, 0, 6.28); g.fill();
});
const batTex = () => charmTex("bat", (g, S) => {
  const cx = S / 2, cy = S / 2; g.fillStyle = "#2a1633";
  g.beginPath(); g.moveTo(cx, cy);
  g.quadraticCurveTo(cx - S * 0.17, cy - S * 0.18, cx - S * 0.33, cy - S * 0.05);
  g.quadraticCurveTo(cx - S * 0.25, cy + S * 0.02, cx - S * 0.35, cy + S * 0.13);
  g.quadraticCurveTo(cx - S * 0.15, cy + S * 0.05, cx, cy + S * 0.13);
  g.quadraticCurveTo(cx + S * 0.15, cy + S * 0.05, cx + S * 0.35, cy + S * 0.13);
  g.quadraticCurveTo(cx + S * 0.25, cy + S * 0.02, cx + S * 0.33, cy - S * 0.05);
  g.quadraticCurveTo(cx + S * 0.17, cy - S * 0.18, cx, cy);
  g.closePath(); g.fill();
  g.beginPath(); g.moveTo(cx - S * 0.05, cy - S * 0.03); g.lineTo(cx - S * 0.08, cy - S * 0.14); g.lineTo(cx - S * 0.01, cy - S * 0.05); g.fill();
  g.beginPath(); g.moveTo(cx + S * 0.05, cy - S * 0.03); g.lineTo(cx + S * 0.08, cy - S * 0.14); g.lineTo(cx + S * 0.01, cy - S * 0.05); g.fill();
});
const Charm: React.FC<{ tex: THREE.CanvasTexture; x?: number; y?: number; z?: number; s?: number; bob?: number }> = ({ tex, x = 0, y = 1.4, z = 0, s = 0.5, bob = 0.14 }) => {
  const ref = useRef<THREE.Group>(null);
  const ph = useMemo(() => Math.random() * 6.28, []);
  useFrame(({ camera, clock }) => {
    const gp = ref.current; if (!gp || !gp.parent) return;
    _camLocal.copy(camera.position); gp.parent.worldToLocal(_camLocal);
    gp.rotation.y = Math.atan2(_camLocal.x - x, _camLocal.z - z);
    gp.position.y = y + Math.sin(clock.elapsedTime * 1.5 + ph) * bob;
  });
  return (
    <group ref={ref} position={[x, y, z]}>
      <mesh><planeGeometry args={[s, s]} /><meshBasicMaterial map={tex} transparent alphaTest={0.04} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>
    </group>
  );
};
const HoodCharms: React.FC = () => {
  const sh = useMemo(spiderHeartTex, []); const bt = useMemo(batTex, []);
  return (
    <>
      <Charm tex={sh} x={-1.7} y={2.3} z={-0.4} s={0.72} />
      <Charm tex={bt} x={1.6} y={2.7} z={0.3} s={0.62} bob={0.22} />
      <Charm tex={sh} x={0.9} y={1.95} z={1.5} s={0.5} bob={0.1} />
    </>
  );
};

// ── neighborhood dioramas (each = its own identifiable landmarks) ──
// DOWNTOWN — cute Truly's World pop-up block: the Capitol tower, an art-deco
// theatre, Disney Hall, an apartment high-rise and a neon hotel, on a pink haze.
const DtlaHood: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.1, 0.002, 0.2]}>
      <circleGeometry args={[2.7, 44]} /><meshBasicMaterial color={PAL.hot} transparent opacity={0.07} toneMapped={false} />
    </mesh>
    <Cutout src="dt-apartment.png" h={2.25} aspect={0.383} x={-1.35} z={-0.55} />
    <Cutout src="dt-capitol.png"   h={1.95} aspect={0.546} x={-0.15} z={-0.7} glow={0.62} />
    <Cutout src="dt-hotel.png"     h={1.3}  aspect={0.718} x={1.55}  z={-0.05} />
    <Cutout src="dt-theatre.png"   h={1.35} aspect={0.736} x={-1.05} z={0.95} glow={0.7} />
    <Cutout src="dt-disney.png"    h={0.98} aspect={1.427} x={0.7}   z={0.9} />
    <Billboard text="DEAR JOSHUA" x={-2.0} z={1.75} h={1.0} rot={0.35} />
    <Billboard text="DOWNTOWN" x={2.3} z={1.6} h={0.95} rot={-0.35} />
    <Palm x={0.35} z={1.7} /><Palm x={2.05} z={0.35} />
  </group>
);
const WehoHood: React.FC = () => (<group><Chateau /><Billboard text="TRULY YOUNG" x={1.75} z={1.4} h={1.0} rot={-0.4} /><Billboard text="WEHO" x={-2.1} z={0.4} h={0.9} rot={0.4} /><PopBuilding x={-1.5} z={1.3} w={0.6} h={0.7} d={0.6} /><PopBuilding x={-0.6} z={1.8} w={0.55} h={0.6} d={0.55} /></group>);
const SantaMonicaHood: React.FC = () => (<group><FerrisWheel /><Billboard text="SANTA MONICA" x={-1.5} z={-0.9} h={1.0} rot={0.5} /><PopBuilding x={1.5} z={0.9} w={0.6} h={0.7} d={0.6} /></group>);
const VeniceHood: React.FC = () => (<group><Boardwalk /><Billboard text="VENICE" x={0} z={-1.3} h={1.1} /><Palm x={-1.8} z={-0.4} /><Palm x={1.8} z={-0.4} /></group>);
const SilverlakeHood: React.FC = () => (<group><Reservoir /><Billboard text="SILVER LAKE" x={0} z={-1.7} h={1.0} /><PopBuilding x={-1.8} z={1.0} w={0.55} h={0.9} d={0.55} /><PopBuilding x={1.7} z={1.1} w={0.55} h={0.7} d={0.55} /><Sign x={0} z={1.7} h={1.3} /></group>);
const InglewoodHood: React.FC = () => (<group><Stadium /><Dome x={2.5} z={0.3} r={0.6} c={PAL.hot} /><PopBuilding x={0.2} z={-2.2} w={0.5} h={0.7} d={0.5} /><Billboard text="FOREVER" x={-2.0} z={-1.4} h={1.0} rot={0.4} /><Billboard text="INGLEWOOD" x={2.2} z={1.6} h={0.95} rot={-0.4} /></group>);
const LaxHood: React.FC = () => (<group><Ufo /><Billboard text="LAX" x={0} z={1.7} h={0.95} /><PopBuilding x={-2.2} z={-1.0} w={1.2} h={0.3} d={0.5} rot={0.3} /><PopBuilding x={2.2} z={-1.0} w={1.2} h={0.3} d={0.5} rot={-0.3} /></group>);
const MalibuHood: React.FC = () => (<group><BeachHouse /><group position={[1.9, 0, 0.2]} scale={0.85}><BeachHouse /></group><mesh position={[-1.6, 0.14, 1.3]}><boxGeometry args={[0.24, 0.1, 1.4]} /><meshStandardMaterial color={PAL.paper} emissive={PAL.amber} emissiveIntensity={0.4} /></mesh><Billboard text="MALIBU" x={0.2} z={-1.5} h={0.95} /></group>);
const LongBeachHood: React.FC = () => (<group><Port /><Dome x={2.3} z={0.9} r={0.55} c={PAL.lilac} /><Billboard text="FEAR THE REAPER" x={-2.1} z={1.3} h={1.1} rot={0.4} /><Billboard text="LONG BEACH" x={2.3} z={-1.2} h={0.95} rot={-0.35} /></group>);
const BeverlyHillsHood: React.FC = () => (<group><Mansions /><Hotel x={-2.1} z={0.6} /><Billboard text="RODEO DR" x={1.9} z={1.2} h={0.9} rot={-0.4} /><Billboard text="BEVERLY HILLS" x={-0.1} z={-1.8} h={1.0} /></group>);
const KoreatownHood: React.FC = () => (<group><Midrise /><DecoTower x={-1.8} z={0.6} /><Sign x={1.7} z={0.9} h={1.6} /><Sign x={1.0} z={1.6} h={1.2} /><Billboard text="BOY" x={-1.9} z={1.7} h={1.3} rot={0.5} /><Billboard text="KOREATOWN" x={0.1} z={-1.9} h={1.0} /></group>);
const LaurelHood: React.FC = () => (<group><Cabin /><Billboard text="LAUREL CANYON" x={-0.1} z={1.7} h={0.95} /><PopBuilding x={-1.9} z={0.8} w={0.6} h={0.6} d={0.6} /><Pine x={1.9} z={0.5} /><Pine x={2.2} z={-0.3} s={0.8} /></group>);
const ValleyHood: React.FC = () => (<group><ValleyGrid /><Soundstage x={0} z={2.5} /><Billboard text="STUDIOS" x={-2.1} z={1.9} h={1.0} rot={0.4} /><Billboard text="THE VALLEY" x={2.1} z={2.0} h={1.0} rot={-0.4} /></group>);

// BOYFRIEND ISLAND — the BROKEN HEART, built like a real island. Two heart
// halves split by a jagged crack, each stacked as land-over-beach: a wider
// bone-pink sand layer peeks out around the violet terrain (mottled canvas
// texture), and a feathered glow decal melts the shore into the whirlpool.
const HEART_PTS: [number, number][] = (() => {
  const p: [number, number][] = [];
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    p.push([x / 15, y / 15]);
  }
  return p;
})();
// one half of the heart (right if side>0), closed with a JAGGED seam = the break
function halfHeart(side: number): THREE.Shape {
  const sh = new THREE.Shape();
  const arc = side > 0 ? HEART_PTS.slice(0, 61) : HEART_PTS.slice(60);
  arc.forEach(([x, y], k) => (k === 0 ? sh.moveTo(x, y) : sh.lineTo(x, y)));
  const a = arc[arc.length - 1], b = arc[0], N = 8;
  for (let k = 1; k <= N; k++) {
    const f = k / N;
    sh.lineTo(side * (0.02 + (k % 2) * 0.08), a[1] + (b[1] - a[1]) * f);
  }
  sh.closePath();
  return sh;
}
const heartHalfGeo = (side: number, spread: number, depth: number, bevel: number) => {
  const g = new THREE.ExtrudeGeometry(halfHeart(side), {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 1.6, bevelSegments: 2,
  });
  g.rotateX(-Math.PI / 2);              // lay flat; heart point faces +z
  g.scale(spread, 1, spread);
  return g;
};
// mottled violet terrain — blotches + a few warm window-dots, in map colors
const isleTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#241536"; g.fillRect(0, 0, 128, 128);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 60; i++) {                 // vegetation blotches
      g.fillStyle = i % 3 ? "#2d1a45" : "#1c0f2c";
      g.beginPath(); g.ellipse(rnd() * 128, rnd() * 128, 4 + rnd() * 10, 3 + rnd() * 7, rnd() * 3, 0, 6.28); g.fill();
    }
    for (let i = 0; i < 26; i++) {                 // pink & amber glints
      g.fillStyle = i % 2 ? "rgba(255,79,163,0.5)" : "rgba(255,207,122,0.45)";
      g.beginPath(); g.arc(rnd() * 128, rnd() * 128, 0.9 + rnd() * 1.1, 0, 6.28); g.fill();
    }
    t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(0.55, 0.55);
    return t;
  };
})();
const shoreGlowTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
    grad.addColorStop(0, "rgba(255,79,163,0.55)");
    grad.addColorStop(0.45, "rgba(255,45,143,0.22)");
    grad.addColorStop(1, "rgba(255,45,143,0)");
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    t = new THREE.CanvasTexture(c);
    return t;
  };
})();
const IsleHalf: React.FC<{ side: number }> = ({ side }) => {
  const sand = useMemo(() => heartHalfGeo(side, 1.9, 0.06, 0.1), [side]);
  const land = useMemo(() => heartHalfGeo(side, 1.7, 0.2, 0.05), [side]);
  const edge = useMemo(() => edgesOf(land, 30), [land]);
  const tex = useMemo(isleTex, []);
  return (
    <group position={[side * 0.16, 0, 0]}>
      {/* the beach — a wider bone-pink shelf under the land */}
      <mesh geometry={sand} position={[0, -0.03, 0]}>
        <meshStandardMaterial color="#f2cfe0" emissive="#ff9ecb" emissiveIntensity={0.22} roughness={1} />
      </mesh>
      {/* the land — mottled violet terrain */}
      <mesh geometry={land} position={[0, 0.05, 0]}>
        <meshStandardMaterial map={tex} color="#ffffff" emissive={PAL.ink} emissiveIntensity={0.08} roughness={0.95} />
      </mesh>
      <lineSegments geometry={edge} position={[0, 0.05, 0]}>
        <lineBasicMaterial color={PAL.hot} transparent opacity={0.5} toneMapped={false} />
      </lineSegments>
    </group>
  );
};
const BoyfriendIslandHood: React.FC = () => {
  const arch = useMemo(() => new THREE.TorusGeometry(0.5, 0.085, 12, 26), []);
  const glow = useMemo(shoreGlowTex, []);
  return (
    <group>
      {/* feathered shoreline glow, melting into the whirlpool — no disc, no rim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <planeGeometry args={[8.5, 8.5]} />
        <meshBasicMaterial map={glow} transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* the broken heart — two halves, jagged crack between */}
      <IsleHalf side={1} />
      <IsleHalf side={-1} />
      {/* palms on the two lobes (lobes sit toward -z) */}
      <Palm x={-0.95} z={-1.15} s={1.15} /><Palm x={1.0} z={-1.15} s={1.15} /><Palm x={0} z={1.0} s={0.9} />
      {/* tiki cabana on the right lobe */}
      <group position={[0.95, 0.22, -0.65]}>
        <PopBuilding w={0.5} h={0.36} d={0.5} edge={PAL.hot} />
        <InkCone r={0.46} h={0.3} y={0.56} seg={4} rot={Math.PI / 4} edge={PAL.amber} />
      </group>
      {/* neon heart-arch over the crack + blinking beacon — the lore carrier */}
      <group position={[0, 1.3, -0.35]}><mesh geometry={arch} rotation={[0, 0, Math.PI]}><meshBasicMaterial color={PAL.hot} toneMapped={false} /></mesh></group>
      <Beacon y={1.3} color={PAL.hot} />
      <Sign x={1.45} z={0.75} h={0.9} />
    </group>
  );
};

// TRULYLAND — her Disneyland. The black-and-pink fairytale castle from the
// park page rebuilt in 3D: a keep with four turrets and a tall spire, pink
// cone roofs, flags, a glowing gate, and TRULYLAND over the boulevard.
const Turret: React.FC<{ x?: number; z?: number; r?: number; h?: number }> = ({ x = 0, z = 0, r = 0.2, h = 0.85 }) => (
  <group position={[x, 0, z]}>
    <InkCyl rt={r} rb={r * 1.18} h={h} y={h / 2} seg={10} edge={PAL.ink} />
    <InkCone r={r * 1.55} h={0.52} y={h + 0.26} seg={10} edge={PAL.hot} />
    <Bar w={0.018} h={0.22} d={0.018} x={0} y={h + 0.6} z={0} c={PAL.hot} />
    <mesh position={[0.075, h + 0.65, 0]}><planeGeometry args={[0.15, 0.09]} /><meshBasicMaterial color={PAL.hot} side={THREE.DoubleSide} toneMapped={false} /></mesh>
  </group>
);
const TrulylandHood: React.FC = () => (
  <group>
    {/* the keep */}
    <PopBuilding w={1.35} h={0.8} d={0.95} />
    {/* four corner turrets + the tall centre spire */}
    <Turret x={-0.62} z={-0.42} /><Turret x={0.62} z={-0.42} />
    <Turret x={-0.62} z={0.42} /><Turret x={0.62} z={0.42} />
    <Turret x={0} z={-0.1} r={0.26} h={1.55} />
    {/* glowing gate arch on the front face */}
    <mesh position={[0, 0.3, 0.49]}><planeGeometry args={[0.34, 0.6]} /><meshBasicMaterial color={PAL.hot} toneMapped={false} /></mesh>
    <mesh position={[0, 0.6, 0.49]} rotation={[0, 0, 0]}><circleGeometry args={[0.17, 20, 0, Math.PI]} /><meshBasicMaterial color={PAL.hot} toneMapped={false} /></mesh>
    {/* heart beacon over the spire */}
    <Beacon y={2.65} color={PAL.hot} />
    {/* park boulevard: palms + the marquee */}
    <Palm x={-1.5} z={1.25} s={0.95} /><Palm x={1.5} z={1.25} s={0.95} />
    <Billboard text="TRULYLAND" x={0} z={1.95} h={1.05} />
    <Billboard text="OPEN ALL NIGHT" x={2.1} z={0.6} h={0.85} rot={-0.45} />
  </group>
);

const GEO: Record<string, { node: React.ReactNode; scale: number }> = {
  trulyland: { node: <TrulylandHood />, scale: 0.06 },
  "boyfriend-island": { node: <BoyfriendIslandHood />, scale: 0.055 },
  hollywood: { node: <HollywoodHood />, scale: 0.06 },
  dtla: { node: <DtlaHood />, scale: 0.082 },
  "beverly-hills": { node: <BeverlyHillsHood />, scale: 0.056 },
  koreatown: { node: <KoreatownHood />, scale: 0.056 },
  weho: { node: <WehoHood />, scale: 0.056 },
  "santa-monica": { node: <SantaMonicaHood />, scale: 0.056 },
  venice: { node: <VeniceHood />, scale: 0.056 },
  silverlake: { node: <SilverlakeHood />, scale: 0.056 },
  "laurel-canyon": { node: <LaurelHood />, scale: 0.056 },
  "the-valley": { node: <ValleyHood />, scale: 0.05 },
  malibu: { node: <MalibuHood />, scale: 0.056 },
  inglewood: { node: <InglewoodHood />, scale: 0.05 },
  lax: { node: <LaxHood />, scale: 0.05 },
  "long-beach": { node: <LongBeachHood />, scale: 0.056 },
};

const UP = new THREE.Vector3(0, 1, 0);

// even point on a sphere (golden-spiral)
export function fibDir(i: number, n: number): THREE.Vector3 {
  const g = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - ((i + 0.5) / n) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const th = g * i;
  return new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).normalize();
}
export function fibLatLon(i: number, n: number): { lat: number; lon: number } {
  const d = fibDir(i, n);
  return { lat: Math.asin(d.y) * 180 / Math.PI, lon: Math.atan2(d.x, d.z) * 180 / Math.PI };
}

// ── PROCEDURAL INSTANCED CITY — thousands of small pop-up buildings packed into
//    clusters across the whole globe (dense around districts) for 3D coverage. ──
function buildCity(districts: { lat: number; lon: number }[], clusters: number) {
  const dummy = new THREE.Object3D();
  const mats: THREE.Matrix4[] = [];
  const centers: { dir: THREE.Vector3; dense: boolean }[] = [];
  for (let i = 0; i < clusters; i++) centers.push({ dir: fibDir(i, clusters), dense: false });
  districts.forEach((d) => centers.push({ dir: new THREE.Vector3(...toVec3(d.lat, d.lon, 1)).normalize(), dense: true }));
  for (const c of centers) {
    const d0 = c.dir;
    const n = c.dense ? 95 : 40 + Math.floor(Math.random() * 45);
    const t1 = new THREE.Vector3().crossVectors(d0, Math.abs(d0.y) < 0.85 ? UP : new THREE.Vector3(1, 0, 0)).normalize();
    const t2 = new THREE.Vector3().crossVectors(d0, t1).normalize();
    const spread = c.dense ? 0.17 : 0.14;
    for (let k = 0; k < n; k++) {
      const a = (Math.random() * 2 - 1) * spread, b = (Math.random() * 2 - 1) * spread;
      if (a * a + b * b > spread * spread) continue;
      const dir = d0.clone().addScaledVector(t1, a).addScaledVector(t2, b).normalize();
      const h = 0.012 + Math.pow(Math.random(), 2) * (c.dense ? 0.085 : 0.05);
      const w = 0.013 + Math.random() * 0.015;
      dummy.position.copy(dir).multiplyScalar(R + h / 2 - 0.004);
      dummy.quaternion.setFromUnitVectors(UP, dir);
      dummy.rotateY(Math.random() * Math.PI);
      dummy.scale.set(w, h, w);
      dummy.updateMatrix();
      mats.push(dummy.matrix.clone());
    }
  }
  return mats;
}

export const CityFill: React.FC<{ districts: { lat: number; lon: number }[]; clusters?: number }> = ({ districts, clusters = 52 }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const tex = useMemo(() => facadeTex("fill"), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color("#ffe0c0"), emissiveIntensity: 0.65, roughness: 0.95 }), [tex]);
  const mats = useMemo(() => buildCity(districts, clusters), [districts, clusters]);
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return;
    for (let i = 0; i < mats.length; i++) m.setMatrixAt(i, mats[i]);
    m.instanceMatrix.needsUpdate = true;
  }, [mats]);
  return <instancedMesh ref={ref} args={[geo, mat, mats.length]} frustumCulled={false} />;
};

export const DistrictLandmark: React.FC<{
  id: string; lat: number; lon: number; active: boolean;
  onSelect: (id: string) => void; onHover: (id: string | null) => void;
}> = ({ id, lat, lon, active, onSelect, onHover }) => {
  const g = GEO[id];
  const { pos, quat } = useMemo(() => {
    const p = new THREE.Vector3(...toVec3(lat, lon, R - 0.005));
    const q = new THREE.Quaternion().setFromUnitVectors(UP, p.clone().normalize());
    return { pos: p, quat: q };
  }, [lat, lon]);
  if (!g) return null;
  return (
    <group
      position={pos}
      quaternion={quat}
      scale={(active ? 1.1 : 1) * g.scale}
      onClick={(e) => { e.stopPropagation(); onSelect(id); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover(id); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { onHover(null); document.body.style.cursor = "auto"; }}
    >
      {g.node}
      <HoodCharms />
    </group>
  );
};
