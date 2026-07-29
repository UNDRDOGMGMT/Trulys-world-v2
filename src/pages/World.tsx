import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Stars, Sparkles, useTexture } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { motion } from "framer-motion";
import Logo from "@/components/Logo";
import PageMeta from "@/components/PageMeta";
import { DistrictLandmark, facadeTex } from "./worldLandmarks";
import cityData from "@/data/city.json";
import palmData from "@/data/palms.json";

/**
 * TRULY'S WORLD — the neighborhoods rendered as a dynamic 3D planet.
 * A neon-inked "mini-LA" globe (Higgsfield texture) you can drag-spin;
 * every original sub-city is a glowing pin that dives into its case file.
 * Standalone /world route — coexists with the flat /map.
 */

const CLOUD_TEX = "/world/maps/world-clouds.jpg";
const MOON_TEX = "/world/moon-face.png";

interface Pin { id: string; name: string; lat: number; lon: number; }
// The 14 districts in their LA-accurate RELATIVE geography (coast west, Downtown
// east, Valley north over the hills, LAX/Inglewood/Long Beach south), scaled to
// cover a wide region of the globe — matched to the zone control map.
// Placed to sit on their actual features in the illustrated LA map (world-la.jpg),
// which is offset so LA faces the camera (tex.offset.x = 0.25 in PlanetMesh).
const PINS: Pin[] = [
  { id: "malibu",        name: "Malibu",        lat: 1.8,   lon: -126 },
  { id: "santa-monica",  name: "Santa Monica",  lat: -5.4,  lon: -54 },
  { id: "venice",        name: "Venice",        lat: -28.8, lon: -36 },
  { id: "lax",           name: "LAX",           lat: -43.2, lon: 0 },
  { id: "beverly-hills", name: "Beverly Hills", lat: 5.4,   lon: -36 },
  { id: "weho",          name: "West Hollywood",lat: 18,    lon: -18 },
  { id: "hollywood",     name: "Hollywood",     lat: 18,    lon: 21.6 },
  { id: "laurel-canyon", name: "Laurel Canyon", lat: 36,    lon: 0 },
  { id: "the-valley",    name: "The Valley",    lat: 61.2,  lon: -21.6 },
  { id: "silverlake",    name: "Silver Lake",   lat: 18,    lon: 36 },
  { id: "koreatown",     name: "Koreatown",     lat: 0,     lon: 7.2 },
  { id: "dtla",          name: "Downtown",      lat: 10.8,  lon: 57.6 },
  { id: "inglewood",     name: "Inglewood",     lat: -18,   lon: 28.8 },
  { id: "long-beach",    name: "Long Beach",    lat: -14.4, lon: 79.2 },
  // a little world of its own, moored off the south pole
  { id: "boyfriend-island", name: "Boyfriend Island", lat: -55, lon: 18 },
];

const R = 1;
const DEG = Math.PI / 180;
// lat/lon (deg) → position on a sphere of radius r
function toVec3(lat: number, lon: number, r = R): [number, number, number] {
  const phi = lat * DEG;
  const theta = lon * DEG;
  return [
    r * Math.cos(phi) * Math.sin(theta),
    r * Math.sin(phi),
    r * Math.cos(phi) * Math.cos(theta),
  ];
}

// Fresnel rim glow — the planet's magenta atmosphere
const Atmosphere: React.FC = () => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { c: { value: new THREE.Color("#ff4fa3") } },
        vertexShader:
          "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader:
          "uniform vec3 c; varying vec3 vN; void main(){ float i = pow(0.62 - dot(vN, vec3(0.0,0.0,1.0)), 4.2); gl_FragColor = vec4(c,1.0) * clamp(i,0.0,1.0) * 0.6; }",
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    []
  );
  return (
    <mesh scale={1.13}>
      <sphereGeometry args={[R, 64, 64]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
};

// One cohesive illustrated LA map (Higgsfield), wrapped on the sphere. Ocean is
// drawn all around the island so poles + seam land in open water — no stretch,
// no fade. Offset in x so the LA continent faces the camera by default.
const LA_TEX = "/world/maps/world-la.jpg";
const PlanetMesh: React.FC<{ small: boolean }> = ({ small }) => {
  const tex = useTexture(LA_TEX);
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.offset.x = 0.25;
  }, [tex]);
  const seg = small ? 96 : 160;
  return (
    <mesh>
      <sphereGeometry args={[R, seg, seg]} />
      <meshStandardMaterial map={tex} emissiveMap={tex} emissive={"#ffffff"} emissiveIntensity={0.55} roughness={0.85} metalness={0} />
    </mesh>
  );
};

// Animated water — a thin shell just above the surface that draws soft drifting
// lilac-white caustic glints, masked to the ocean only (world-ocean-mask.png,
// white = sea). Uses the SAME tex.offset.x = 0.25 as the surface so it aligns.
const OCEAN_MASK_TEX = "/world/maps/world-ocean-mask.png";
const AnimatedOcean: React.FC<{ small: boolean }> = ({ small }) => {
  const mask = useTexture(OCEAN_MASK_TEX);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const mat = useMemo(() => {
    mask.wrapS = THREE.RepeatWrapping;
    mask.wrapT = THREE.ClampToEdgeWrapping;
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { mask: { value: mask }, time: { value: 0 } },
      vertexShader:
        "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: `
        uniform sampler2D mask; uniform float time; varying vec2 vUv;
        void main(){
          float m = texture2D(mask, vec2(fract(vUv.x + 0.25), vUv.y)).r; // 1 sea, 0 land
          if(m < 0.04) discard;
          vec2 p = vUv * vec2(64.0, 32.0);
          float w = sin(p.x + time*0.55) * sin(p.y - time*0.42);
          w += 0.6 * sin(p.x*0.5 - time*0.31 + p.y*0.7);
          w += 0.35 * sin(p.y*1.7 + time*0.24);
          float gl = smoothstep(0.5, 1.0, w*0.5 + 0.5);
          vec3 col = mix(vec3(0.42,0.38,0.72), vec3(0.86,0.82,1.0), gl);
          gl_FragColor = vec4(col, m * gl * 0.20);
        }`,
    });
  }, [mask]);
  useFrame((_, dt) => { if (matRef.current) matRef.current.uniforms.time.value += dt; });
  const seg = small ? 64 : 96;
  return (
    <mesh scale={1.004}>
      <sphereGeometry args={[R, seg, seg]} />
      <primitive object={mat} ref={matRef} attach="material" />
    </mesh>
  );
};

const CityPin: React.FC<{
  pin: Pin;
  active: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}> = ({ pin, active, onHover, onSelect }) => {
  // float the marker/label clear above the 3D landmark that sits on this spot
  const pos = toVec3(pin.lat, pin.lon, R + 0.13);
  const labelPos = toVec3(pin.lat, pin.lon, R + 0.21);
  // breathing halo — gentle when idle, brighter + faster on hover — so pins
  // read as alive & clickable and the eye is drawn to the cities.
  const haloRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock, camera }) => {
    const m = haloRef.current; if (!m) return;
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * (active ? 4.2 : 2.0));
    const base = active ? 1.5 : 1.0;
    m.scale.setScalar(base * (0.85 + 0.4 * pulse));
    (m.material as THREE.MeshBasicMaterial).opacity = (active ? 0.6 : 0.3) * (0.55 + 0.45 * pulse);
    m.quaternion.copy(camera.quaternion); // billboard toward camera
  });
  return (
    <group>
      {/* pulsing halo ring */}
      <mesh ref={haloRef} position={pos}>
        <ringGeometry args={[0.02, 0.03, 28]} />
        <meshBasicMaterial color="#ff8ec8" transparent opacity={0.3} toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* glowing surface dot */}
      <mesh
        position={pos}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(pin.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(pin.id);
        }}
      >
        <sphereGeometry args={[active ? 0.02 : 0.012, 16, 16]} />
        <meshBasicMaterial color={active ? "#ffffff" : "#ff8ec8"} toneMapped={false} />
      </mesh>
      {/* label — occluded when it rotates behind the globe */}
      <Html
        position={labelPos}
        center
        occlude
        distanceFactor={2.4}
        style={{ pointerEvents: "auto", transition: "opacity 0.2s" }}
      >
        <button
          onMouseEnter={() => onHover(pin.id)}
          onMouseLeave={() => onHover(null)}
          onClick={() => onSelect(pin.id)}
          className="select-none whitespace-nowrap font-sans font-extrabold uppercase tracking-[0.12em] transition-all"
          style={{
            fontSize: active ? 15 : 12,
            color: active ? "#ffffff" : "#ffd9ec",
            textShadow: active
              ? "0 0 10px rgba(255,79,163,1), 0 0 22px rgba(255,79,163,0.8), 0 1px 2px #000"
              : "0 0 6px rgba(255,79,163,0.9), 0 1px 2px rgba(0,0,0,0.9)",
            cursor: "pointer",
            background: "none",
            border: "none",
            padding: "4px 6px",
          }}
        >
          {pin.name}
        </button>
      </Html>
    </group>
  );
};

// Slowly-drifting cloud shell above the planet
const Clouds: React.FC = () => {
  const tex = useTexture(CLOUD_TEX);
  const ref = useRef<THREE.Mesh>(null);
  useMemo(() => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; }, [tex]);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.012; });
  return (
    <mesh ref={ref} scale={1.035}>
      <sphereGeometry args={[R, 48, 48]} />
      <meshBasicMaterial map={tex} transparent opacity={0.42} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

// Crescent-moon character — drifts and is only visible part of the time
const Moon: React.FC = () => {
  const tex = useTexture(MOON_TEX);
  const ref = useRef<THREE.Sprite>(null);
  useFrame((state) => {
    const s = ref.current; if (!s) return;
    const t = state.clock.elapsedTime;
    // slow orbit drift up in the sky
    const a = t * 0.03;
    // drift across the upper sky, clear of the corner UI
    s.position.set(0.35 + Math.sin(a) * 0.7, 1.75 + Math.cos(a * 0.7) * 0.22, -0.8);
    // appear only ~a quarter of each ~44s cycle
    const cyc = (t % 44) / 44;
    const op = Math.max(0, 1 - Math.abs(cyc - 0.22) / 0.14);
    (s.material as THREE.SpriteMaterial).opacity = op * op;
  });
  return (
    <sprite ref={ref} scale={[0.95, 1.0, 1]}>
      <spriteMaterial map={tex} transparent opacity={0} depthWrite={false} toneMapped={false} />
    </sprite>
  );
};

// Flies the camera down toward the chosen district before we enter it.
const DiveController: React.FC<{ target: Pin | null }> = ({ target }) => {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as any;
  const endPos = useRef(new THREE.Vector3());
  useFrame(() => {
    if (!target || !controls) return;
    const P = new THREE.Vector3(...toVec3(target.lat, target.lon, R));
    const n = P.clone().normalize();
    endPos.current.copy(n).multiplyScalar(R + 0.36);
    camera.position.lerp(endPos.current, 0.11);
    controls.target.lerp(P, 0.13);
    controls.update();
  });
  return null;
};

/**
 * CityFabric — the continuity layer, built like a game asset system rather than one
 * box stamped N times. Buildings come from city_gen.py (the SAME warped LA road
 * network that draws the streets, SAME globe lon/lat space) so each rises out of its
 * own block, oriented to its street. Variety on two axes so they don't all look the
 * same: SILHOUETTE (kind = box / pitched-roof house / tower-with-beacon / wide block)
 * and NEON GLOW (per-instance colour tints the window light). A handful of
 * InstancedMeshes draw the whole city. The 14 dioramas are the heroes on top.
 */
interface B { lat: number; lon: number; rot: number; w: number; d: number; h: number; k: number; c: number; }
const CITY = cityData as B[];
const UP3 = new THREE.Vector3(0, 1, 0);

// neon accents the windows/roofs glow in — amber, magenta, hot-pink, lilac, pale-gold
const NEON: [number, number, number][] = [
  [1.0, 0.80, 0.47], [1.0, 0.35, 0.68], [1.0, 0.18, 0.55], [0.66, 0.58, 1.0], [1.0, 0.88, 0.59],
];

const normalOf = (lat: number, lon: number) => {
  const phi = lat * DEG, th = lon * DEG;
  return new THREE.Vector3(Math.cos(phi) * Math.sin(th), Math.sin(phi), Math.cos(phi) * Math.cos(th));
};

// Inject a per-instance tint that multiplies the EMISSIVE (window glow), so one
// InstancedMesh can glow in many neon colours. three's instanceColor only tints
// diffuse; we want the light itself coloured, hence the custom attribute.
const tintMaterial = (tex: THREE.Texture) => {
  const mat = new THREE.MeshStandardMaterial({
    map: tex, emissiveMap: tex, emissive: new THREE.Color("#ffffff"),
    emissiveIntensity: 1.5, color: new THREE.Color("#4a2c66"), roughness: 0.85,
  });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = "attribute vec3 aTint;\nvarying vec3 vTint;\n" +
      sh.vertexShader.replace("void main() {", "void main() {\n  vTint = aTint;");
    sh.fragmentShader = "varying vec3 vTint;\n" +
      sh.fragmentShader.replace(
        "vec3 totalEmissiveRadiance = emissive;",
        "vec3 totalEmissiveRadiance = emissive * vTint;");
  };
  return mat;
};

const CityFabric: React.FC<{ small: boolean }> = ({ small }) => {
  const list = useMemo(() => {
    // Keep every tower (they read as skyline heroes) but thin the small filler
    // so the 14 diorama landmarks stand out instead of drowning in box clutter.
    // Desktop keeps ~half the filler; phones keep ~a third.
    const keep = small ? 3 : 2;
    return CITY.filter((b, i) => b.k === 2 || i % keep === 0);
  }, [small]);

  const bodies = useMemo(() => list, [list]);
  const houses = useMemo(() => list.filter((b) => b.k === 1), [list]);
  const towers = useMemo(() => list.filter((b) => b.k === 2), [list]);

  const facade = useMemo(() => { const t = facadeTex("a").clone(); t.needsUpdate = true; return t; }, []);
  const bodyMat = useMemo(() => tintMaterial(facade), [facade]);
  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), []);
  const roofGeo = useMemo(() => new THREE.ConeGeometry(0.72, 1, 4).rotateY(Math.PI / 4), []);
  const beadGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);

  // building bodies (all kinds) — windows glow in each one's neon colour
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  React.useLayoutEffect(() => {
    const mesh = bodyRef.current; if (!mesh) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), spin = new THREE.Quaternion(),
      seat = new THREE.Quaternion(), scl = new THREE.Vector3();
    const tint = new Float32Array(bodies.length * 3);
    bodies.forEach((b, i) => {
      const pos = normalOf(b.lat, b.lon);
      seat.setFromUnitVectors(UP3, pos);
      spin.setFromAxisAngle(UP3, b.rot);
      q.copy(seat).multiply(spin);
      scl.set(b.w, b.h, b.d);
      m.compose(pos, q, scl);
      mesh.setMatrixAt(i, m);
      const col = NEON[b.c]; tint[i * 3] = col[0]; tint[i * 3 + 1] = col[1]; tint[i * 3 + 2] = col[2];
    });
    mesh.geometry.setAttribute("aTint", new THREE.InstancedBufferAttribute(tint, 3));
    mesh.instanceMatrix.needsUpdate = true; mesh.count = bodies.length;
  }, [bodies]);

  // pitched roofs sit on the little houses — solid neon, no windows
  const roofRef = useRef<THREE.InstancedMesh>(null);
  React.useLayoutEffect(() => {
    const mesh = roofRef.current; if (!mesh) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), spin = new THREE.Quaternion(),
      seat = new THREE.Quaternion(), scl = new THREE.Vector3(), top = new THREE.Vector3();
    houses.forEach((b, i) => {
      const pos = normalOf(b.lat, b.lon);
      seat.setFromUnitVectors(UP3, pos); spin.setFromAxisAngle(UP3, b.rot);
      q.copy(seat).multiply(spin);
      top.copy(pos).multiplyScalar(1 + b.h);            // sit on the roofline
      // cone radius is 0.72, so 0.72*scale must match the box half-width (0.5*w)
      scl.set(b.w * 0.7, b.w * 0.85, b.d * 0.7);
      m.compose(top, q, scl); mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, new THREE.Color(...NEON[b.c]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.count = houses.length;
  }, [houses]);

  // glowing beacons crown the towers
  const beadRef = useRef<THREE.InstancedMesh>(null);
  React.useLayoutEffect(() => {
    const mesh = beadRef.current; if (!mesh) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), scl = new THREE.Vector3(), top = new THREE.Vector3();
    towers.forEach((b, i) => {
      const pos = normalOf(b.lat, b.lon);
      top.copy(pos).multiplyScalar(1 + b.h + 0.006);
      const r = Math.max(b.w, b.d) * 0.5;
      scl.set(r, r, r);
      m.compose(top, q, scl); mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, new THREE.Color(...NEON[b.c]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.count = towers.length;
  }, [towers]);

  return (
    <>
      <instancedMesh ref={bodyRef} args={[boxGeo, bodyMat, bodies.length]} frustumCulled={false} />
      {houses.length > 0 && (
        <instancedMesh ref={roofRef} args={[roofGeo, undefined, houses.length]} frustumCulled={false}>
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      )}
      {towers.length > 0 && (
        <instancedMesh ref={beadRef} args={[beadGeo, undefined, towers.length]} frustumCulled={false}>
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      )}
    </>
  );
};

// 3D palm trees along the coast (positions from the shoreline in palms.json).
// Stylized inked look: dark aubergine trunk + drooping lilac neon fronds.
const PALMS = palmData as { lat: number; lon: number }[];
const PalmModel: React.FC = () => {
  const fronds = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    fronds.push(
      <mesh key={i} position={[0, 0.052, 0]} rotation={[0, a, -0.95]}>
        <coneGeometry args={[0.004, 0.032, 4]} />
        <meshStandardMaterial color="#5b4da0" emissive="#9d8bff" emissiveIntensity={0.55} roughness={0.8} />
      </mesh>
    );
  }
  return (
    <group>
      <mesh position={[0, 0.026, 0]}>
        <cylinderGeometry args={[0.0016, 0.004, 0.052, 6]} />
        <meshStandardMaterial color="#2a1830" roughness={0.9} />
      </mesh>
      {/* little coconut crown */}
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.006, 8, 8]} />
        <meshStandardMaterial color="#231436" roughness={0.9} />
      </mesh>
      {fronds}
    </group>
  );
};
const Palms: React.FC<{ small: boolean }> = ({ small }) => {
  const s = small ? 0.9 : 1.15; // storybook-scale so the palms actually read
  return (
    <>
      {PALMS.map((p, i) => {
        const pos = toVec3(p.lat, p.lon, R);
        const norm = new THREE.Vector3(...pos).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(UP3, norm);
        // slight per-palm lean + heading variety
        const lean = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (((i * 53) % 20) - 10) * DEG);
        const spin = new THREE.Quaternion().setFromAxisAngle(UP3, ((i * 41) % 360) * DEG);
        quat.multiply(spin).multiply(lean);
        return <group key={i} position={pos} quaternion={quat} scale={s}><PalmModel /></group>;
      })}
    </>
  );
};

const Globe: React.FC<{ onSelect: (id: string) => void; small: boolean }> = ({ onSelect, small }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <>
      {/* soft ambient + warm key + cool rim so the neon 3D landmarks read as forms */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 2.5, 3]} intensity={1.3} color={"#ffe3f1"} />
      <directionalLight position={[-3, -1, -2]} intensity={0.6} color={"#8a4dff"} />
      <Suspense fallback={null}>
        <PlanetMesh small={small} />
        <AnimatedOcean small={small} />
        <CityFabric small={small} />
        <Palms small={small} />
        <Clouds />
        <Moon />
      </Suspense>
      <Atmosphere />
      {PINS.map((p) => (
        <DistrictLandmark key={"lm-" + p.id} id={p.id} lat={p.lat} lon={p.lon} active={hovered === p.id} onHover={setHovered} onSelect={onSelect} />
      ))}
      {PINS.map((p) => (
        <CityPin key={p.id} pin={p} active={hovered === p.id} onHover={setHovered} onSelect={onSelect} />
      ))}
      <Stars radius={80} depth={40} count={2500} factor={3} saturation={0} fade speed={0.6} />
      {/* on-brand drifting sparkles — a little magic in the space around her world */}
      <Sparkles count={small ? 26 : 46} scale={[7, 5, 7]} size={3.2} speed={0.35} opacity={0.7} color="#ffd9ec" />
      <Sparkles count={small ? 12 : 20} scale={[5, 4, 5]} size={5} speed={0.22} opacity={0.5} color="#ff8ec8" />
      <EffectComposer>
        <Bloom intensity={0.34} luminanceThreshold={0.62} luminanceSmoothing={0.22} mipmapBlur radius={0.5} />
      </EffectComposer>
    </>
  );
};

const World: React.FC = () => {
  const navigate = useNavigate();
  const [selecting, setSelecting] = useState<string | null>(null);
  const [dive, setDive] = useState<Pin | null>(null);
  const busy = useRef(false);
  // Frame the planet differently on phones so it's centered, not top-heavy.
  // Track viewport so rotating a phone / resizing re-frames instead of staying
  // stuck at the mount-time layout.
  const [isSmall, setIsSmall] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsSmall(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const camZ = isSmall ? 3.75 : 3.15;
  const targetY = isSmall ? 0.05 : 0.28;

  // Click a city → the camera flies down toward it, veil rises, then we enter.
  const onSelect = (id: string) => {
    if (busy.current) return;
    busy.current = true;
    setDive(PINS.find((p) => p.id === id) ?? null);
    setSelecting(id);
    document.body.style.cursor = "auto";
    // Boyfriend Island is a game, not a case-file district
    const dest = id === "boyfriend-island" ? "/boyfriend-island" : `/location/${id}`;
    setTimeout(() => navigate(dest), 850);
  };

  return (
    <>
      <PageMeta
        title="The Planet — TRULYS WORLD"
        description="Spin Truly Young's world. Every Los Angeles neighborhood is a glowing city on the planet — Hollywood, Venice, Malibu, Downtown, the Valley and more. Drag to explore, tap a city to enter."
      />
      <div
        className="fixed inset-0 overflow-hidden"
        style={{ background: "radial-gradient(ellipse at 50% 45%, #2a0a28 0%, #12041a 55%, #05010a 100%)" }}
      >
        <Canvas
          camera={{ position: [0, isSmall ? 0.12 : 0.2, camZ], fov: 42 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          <Globe onSelect={onSelect} small={isSmall} />
          <DiveController target={dive} />
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom={!dive}
            enableRotate={!dive}
            target={[0, targetY, 0]}
            minDistance={dive ? 0.15 : 2.3}
            maxDistance={4.6}
            minPolarAngle={0.02}
            maxPolarAngle={3.1}
            autoRotate={!dive}
            autoRotateSpeed={0.55}
            rotateSpeed={0.6}
            enableDamping
            dampingFactor={0.08}
          />
        </Canvas>

        {/* dive veil */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(circle at center, rgba(255,79,163,0.25), #05010a 70%)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: selecting ? 0.97 : 0 }}
          transition={{ duration: 0.45, delay: selecting ? 0.32 : 0 }}
        />

        {/* chrome overlay */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 md:p-6">
          <header className="flex items-center justify-between">
            <button className="pointer-events-auto" onClick={() => navigate("/")} aria-label="Home">
              <Logo size="md" />
            </button>
            <button
              onClick={() => navigate("/map")}
              className="pointer-events-auto font-display text-[11px] md:text-xs uppercase tracking-[0.18em] text-pink-light hover:text-white bg-black/40 border border-pink/30 rounded-full px-4 py-2 backdrop-blur-sm transition-colors"
            >
              flat map →
            </button>
          </header>

          <div className="flex flex-col items-center text-center gap-1 pb-2">
            <motion.h1
              className="font-display text-2xl md:text-4xl chrome-text-pink"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
            >
              Truly&rsquo;s World
            </motion.h1>
            <motion.p
              className="font-whimsy text-[11px] md:text-sm text-pink-light/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.8 }}
            >
              ✦ drag to spin the planet · tap a city to enter ✦
            </motion.p>
          </div>
        </div>
      </div>
    </>
  );
};

export default World;
