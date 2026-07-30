import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
} from "framer-motion";
import MarqueeStrip from "@/components/MarqueeStrip";
import Logo from "@/components/Logo";
import PageMeta from "@/components/PageMeta";
import { useUnlock } from "@/contexts/UnlockContext";
import { useMember } from "@/contexts/MemberContext";
import { useTravel, ASSET_KEY } from "@/contexts/TravelContext";
import { useIsPortrait } from "@/hooks/useIsPortrait";
import { playClick, startAmbient, stopAmbient } from "@/lib/audio";
import { trackEvent } from "@/lib/analytics";
import { shouldReduceMedia } from "@/lib/network";

// Higgsfield inked map — immersive full-bleed, geographically-truer LA.
// Landscape (desktop) + purpose-composed vertical portrait (mobile) assets.
// The detailed illustrated LA map (the look/feel that was live before the
// redesign). Landscape (desktop) + purpose-composed portrait (mobile).
const MAP_SRC = "/world/maps/la-map-10.jpg";
const MAP_W = 2752, MAP_H = 1536;
// Mobile gets a purpose-built PORTRAIT recomposition of the same art (same
// districts + neon-ink style, stacked vertically) so it fills a phone screen
// instead of showing a cropped slice of the landscape map.
const MAP_SRC_P = "/world/maps/la-map-portrait-2.jpg";
const MAP_W_P = 1280, MAP_H_P = 1714;

// District "cutout" radius — % of the clip-path diagonal reference box.
const DISTRICT_R = 13.5;

// Heart-shaped reveal for the hover "spotlight" cutout. Template heart in a 100-wide
// box (centered on its centroid ~50,44); heartClip() scales+translates it into the
// element's px space so the map is clipped to a heart around each waypoint.
const HEART_PTS: (string | number)[][] = [
  ["M", 50, 88],
  ["C", 12, 60, 0, 40, 0, 25],
  ["C", 0, 10, 12, 0, 25, 0],
  ["C", 38, 0, 47, 8, 50, 18],
  ["C", 53, 8, 62, 0, 75, 0],
  ["C", 88, 0, 100, 10, 100, 25],
  ["C", 100, 40, 88, 60, 50, 88],
  ["Z"],
];
const heartClip = (cx: number, cy: number, r: number) => {
  const s = r / 50; // template half-width is 50 units → r px
  const tx = (n: number) => (cx + (n - 50) * s).toFixed(1);
  const ty = (n: number) => (cy + (n - 44) * s).toFixed(1);
  const d = HEART_PTS.map((cmd) => {
    const c = cmd[0] as string;
    if (c === "Z") return "Z";
    const pairs: string[] = [];
    for (let i = 1; i < cmd.length; i += 2) pairs.push(`${tx(cmd[i] as number)} ${ty(cmd[i + 1] as number)}`);
    return c + pairs.join(" ");
  }).join(" ");
  return `path('${d}')`;
};

// The launch neighborhoods. x/y = % on the landscape map; xP/yP = % on the portrait map.
// labelBelowP: on the tighter portrait map, hang the label under the pin so
// neighboring labels don't collide (LC / WeHo / Hollywood cluster at the top).
interface Waypoint { id: string; name: string; blurb: string; x: number; y: number; xP: number; yP: number; labelBelowP?: boolean; }

// Heart-shaped waypoint marker — fill = currentColor, stroke/glow via style so it
// scales and lights up like the old dot did (on-brand for Truly's World hearts).
const HeartMark: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden fill="currentColor">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);
const WAYPOINTS: Waypoint[] = [
  // x/y = % on la-map-7 (landscape); xP/yP = % on la-map-6-v (portrait).
  { id: "malibu", name: "Malibu", blurb: "Downloads", x: 10, y: 30, xP: 7, yP: 22, labelBelowP: true },
  { id: "santa-monica", name: "Santa Monica", blurb: "Live / Sessions", x: 13, y: 62, xP: 11, yP: 51, labelBelowP: true },
  { id: "venice", name: "Venice", blurb: "Videos", x: 27, y: 71, xP: 14, yP: 62, labelBelowP: true },
  { id: "the-valley", name: "The Valley", blurb: "The EP Arcade", x: 38, y: 15, xP: 38, yP: 15 },
  { id: "laurel-canyon", name: "Laurel Canyon", blurb: "Songbook", x: 46, y: 31, xP: 43, yP: 24 },
  { id: "weho", name: "West Hollywood", blurb: "Merch", x: 40, y: 48, xP: 40, yP: 40, labelBelowP: true },
  { id: "beverly-hills", name: "Beverly Hills", blurb: "Press / EPK", x: 25, y: 43, xP: 28, yP: 37, labelBelowP: true },
  { id: "hollywood", name: "Hollywood", blurb: "Music / Releases", x: 51, y: 48, xP: 63, yP: 40 },
  { id: "koreatown", name: "Koreatown", blurb: "After Hours", x: 56, y: 59, xP: 50, yP: 62, labelBelowP: true },
  { id: "silverlake", name: "Silver Lake", blurb: "The Inner Circle", x: 70, y: 48, xP: 62, yP: 52 },
  { id: "dtla", name: "Downtown", blurb: "Cruise Night", x: 88, y: 52, xP: 82, yP: 60 },
  { id: "lax", name: "LAX", blurb: "Get the Drop", x: 44, y: 78, xP: 34, yP: 82, labelBelowP: true },
  { id: "inglewood", name: "Inglewood", blurb: "Dress-Up", x: 56, y: 81, xP: 55, yP: 82, labelBelowP: true },
  { id: "long-beach", name: "Long Beach", blurb: "B-Sides", x: 85, y: 90, xP: 82, yP: 92, labelBelowP: true },
];

// Future cities on the horizon — Truly's world keeps expanding. These distant
// glowing skylines are baked into the art; we mark them "coming soon" (no travel).
interface FuturePin { x: number; y: number; xP: number; yP: number; }
const FUTURE: FuturePin[] = [];

// Ambient decoration — twinkling stars in the sky, drifting sparkles over the city.
// Deterministic positions (% of the map box) so they lock to the art.
const TWINKLES = [
  { x: 12, y: 14, d: 0 }, { x: 22, y: 9, d: 0.6 }, { x: 34, y: 20, d: 1.2 },
  { x: 44, y: 11, d: 0.3 }, { x: 58, y: 16, d: 1.5 }, { x: 66, y: 8, d: 0.9 },
  { x: 74, y: 22, d: 0.4 }, { x: 83, y: 12, d: 1.1 }, { x: 90, y: 26, d: 0.7 },
  { x: 17, y: 28, d: 1.8 }, { x: 50, y: 24, d: 2.1 }, { x: 28, y: 6, d: 1.4 },
];
const SPARKLES = [
  { x: 20, y: 60, g: "✦", d: 0, dur: 8 }, { x: 41, y: 72, g: "♥", d: 2.5, dur: 9.5 },
  { x: 62, y: 55, g: "✦", d: 1.2, dur: 7.5 }, { x: 78, y: 67, g: "✧", d: 3.6, dur: 10 },
  { x: 52, y: 42, g: "♥", d: 4.6, dur: 8.6 }, { x: 33, y: 50, g: "✦", d: 6, dur: 9 },
];
// Occasional shooting stars across the night sky (start %, stagger, loop length).
const SHOOTING = [
  { x: 16, y: 9, d: 1.5, dur: 12 }, { x: 60, y: 6, d: 6.5, dur: 15 }, { x: 40, y: 15, d: 10, dur: 18 },
];
// City lights flickering on — warm windows + pink neon on the buildings. x/y =
// landscape (la-map-10), xP/yP = portrait (la-map-portrait-2), so they sit on the
// towers on both maps. Clustered on Downtown, Koreatown, Silver Lake + WeHo/Holly.
const GLIMMERS = [
  // Downtown towers
  { x: 86, y: 55, xP: 80, yP: 58, c: "#ffcf7a", d: 0 },
  { x: 90, y: 60, xP: 84, yP: 61, c: "#ff7bbd", d: 1.1 },
  { x: 83, y: 62, xP: 77, yP: 60, c: "#ffcf7a", d: 2.0 },
  { x: 88, y: 50, xP: 82, yP: 55, c: "#ff7bbd", d: 1.3 },
  { x: 92, y: 58, xP: 86, yP: 63, c: "#ffcf7a", d: 0.8 },
  // Koreatown
  { x: 54, y: 60, xP: 48, yP: 61, c: "#ff7bbd", d: 0.6 },
  { x: 57, y: 57, xP: 52, yP: 59, c: "#ffcf7a", d: 2.4 },
  { x: 51, y: 63, xP: 45, yP: 63, c: "#ff7bbd", d: 1.7 },
  { x: 62, y: 62, xP: 52, yP: 64, c: "#ffcf7a", d: 0.5 },
  // Silver Lake edge
  { x: 64, y: 53, xP: 62, yP: 50, c: "#ff7bbd", d: 0.9 },
  { x: 71, y: 55, xP: 63, yP: 55, c: "#ffcf7a", d: 1.9 },
  // WeHo / Hollywood / Rodeo buildings
  { x: 45, y: 51, xP: 45, yP: 42, c: "#ffcf7a", d: 0.3 },
  { x: 48, y: 47, xP: 58, yP: 40, c: "#ff7bbd", d: 2.2 },
  { x: 39, y: 53, xP: 35, yP: 44, c: "#ff7bbd", d: 1.4 },
  { x: 35, y: 48, xP: 30, yP: 41, c: "#ffcf7a", d: 2.6 },
  { x: 42, y: 50, xP: 40, yP: 43, c: "#ff7bbd", d: 1.0 },
];
// Water glints twinkling on the ocean. x/y = landscape ocean (bottom-left swirl),
// xP/yP = portrait ocean (left side). Cool white so they read as light on water.
const WATER = [
  { x: 5, y: 74, xP: 6, yP: 44, d: 0 }, { x: 8, y: 82, xP: 4, yP: 56, d: 1.3 },
  { x: 4, y: 88, xP: 8, yP: 66, d: 2.1 }, { x: 11, y: 90, xP: 5, yP: 74, d: 0.7 },
  { x: 7, y: 78, xP: 3, yP: 82, d: 1.8 }, { x: 3, y: 84, xP: 9, yP: 88, d: 2.6 },
  { x: 9, y: 86, xP: 4, yP: 50, d: 1.0 }, { x: 13, y: 92, xP: 7, yP: 92, d: 0.4 },
];

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5 } },
  exit: { opacity: 0, transition: { duration: 0.3 } },
} as const;

// hood id → travel-clip asset key (mirrors TravelContext)

const MapHub: React.FC = () => {
  const { soundOn } = useUnlock();
  const { travelTo } = useTravel();
  const navigate = useNavigate();
  const isPortrait = useIsPortrait();
  const { member } = useMember();
  const reduceMotion = useReducedMotion();
  const [mapReady, setMapReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);   // mobile hamburger nav
  const [active, setActive] = useState<string | null>(null);       // hovered (desktop) / selected (touch)
  const [diving, setDiving] = useState<Waypoint | null>(null);     // mid dive-in zoom
  const prefetched = useRef<Set<string>>(new Set());
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapSrc = isPortrait ? MAP_SRC_P : MAP_SRC;
  const mapW = isPortrait ? MAP_W_P : MAP_W;
  const mapH = isPortrait ? MAP_H_P : MAP_H;

  const coords = (wp: Waypoint) => ({ x: isPortrait ? wp.xP : wp.x, y: isPortrait ? wp.yP : wp.y });

  // ── Dev-only pin PLACEMENT tool (gated by ?place=1) ─────────────────────
  // Drag each pin on the live map; it emits an updated WAYPOINTS array for the
  // CURRENT orientation (landscape x/y vs portrait xP/yP), preserving the other
  // pair. Never renders for fans. Do landscape + portrait as two passes.
  const placeMode = useMemo(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("place") === "1",
    []
  );
  const stageRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<Record<string, { x: number; y: number }>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // wipe edits on orientation flip so landscape numbers never leak onto the portrait map
  useEffect(() => { if (placeMode) setPlaced({}); }, [isPortrait, placeMode]);

  const onHandleDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragId(id);
  };
  const onHandleMove = (e: React.PointerEvent, id: string) => {
    if (dragId !== id || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
    setPlaced((p) => ({ ...p, [id]: { x: +x.toFixed(1), y: +y.toFixed(1) } }));
  };
  const onHandleUp = () => setDragId(null);

  const emitWaypoints = () => {
    const rows = WAYPOINTS.map((wp) => {
      const cur = placed[wp.id];
      const x = !isPortrait && cur ? cur.x : wp.x;
      const y = !isPortrait && cur ? cur.y : wp.y;
      const xP = isPortrait && cur ? cur.x : wp.xP;
      const yP = isPortrait && cur ? cur.y : wp.yP;
      const extra = wp.labelBelowP ? ", labelBelowP: true" : "";
      return `  { id: ${JSON.stringify(wp.id)}, name: ${JSON.stringify(wp.name)}, blurb: ${JSON.stringify(wp.blurb)}, x: ${x}, y: ${y}, xP: ${xP}, yP: ${yP}${extra} },`;
    });
    return "const WAYPOINTS: Waypoint[] = [\n" + rows.join("\n") + "\n];";
  };
  const copyWaypoints = () => {
    navigator.clipboard.writeText(emitWaypoints()).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  };

  useEffect(() => {
    if (soundOn) startAmbient();
    else stopAmbient();
    return () => stopAmbient();
  }, [soundOn]);

  const areaRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // ── Pan + zoom explorable world ─────────────────────────────────────────
  // The extended map is bigger than the screen; drag to roam, wheel/pinch to
  // zoom, preset cameras glide to a region. Pins stay locked as % of the box.
  const AR = mapW / mapH;
  const [vp, setVp] = useState({ w: 1, h: 1 });
  useEffect(() => {
    const el = areaRef.current; if (!el) return;
    const measure = () => setVp({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(measure); ro.observe(el); measure();
    return () => ro.disconnect();
  }, []);
  const boxW = Math.max(vp.w, vp.h * AR);
  const boxH = Math.max(vp.h, vp.w / AR);
  const Z_MIN = 1, Z_MAX = 2.8, Z_START = 1.35;
  const fitZoom = Math.min(vp.w / boxW, vp.h / boxH); // < 1: whole map visible (place mode)
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);
  const zoom = useMotionValue(Z_START);
  const invZoom = useTransform(zoom, (z) => 1 / z);   // keep pins/labels screen-constant
  const zoomRef = useRef(Z_START);
  useEffect(() => zoom.on("change", (v) => (zoomRef.current = v)), [zoom]);

  const clampPan = (z = zoomRef.current) => {
    const mxp = Math.max(0, (boxW * z - vp.w) / 2);
    const myp = Math.max(0, (boxH * z - vp.h) / 2);
    panX.set(Math.max(-mxp, Math.min(mxp, panX.get())));
    panY.set(Math.max(-myp, Math.min(myp, panY.get())));
  };
  // Center map point (fx,fy in %) at zoom z, clamped so no gaps show.
  const frameTo = (fx: number, fy: number, z: number, animated = true) => {
    const mxp = Math.max(0, (boxW * z - vp.w) / 2);
    const myp = Math.max(0, (boxH * z - vp.h) / 2);
    const tx = Math.max(-mxp, Math.min(mxp, -((fx / 100) - 0.5) * boxW * z));
    const ty = Math.max(-myp, Math.min(myp, -((fy / 100) - 0.5) * boxH * z));
    const opts = { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const };
    if (animated) { animate(zoom, z, opts); animate(panX, tx, opts); animate(panY, ty, opts); }
    else { zoom.set(z); panX.set(tx); panY.set(ty); }
  };

  // ── Unified pointer input: 1 finger/mouse = pan (+ momentum), 2 = pinch-zoom.
  //    Tap-vs-drag is tracked (didPan) so pins still dive on a clean tap. ──
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const didPan = useRef(false);
  const vel = useRef<{ x: number; y: number; t: number }>({ x: 0, y: 0, t: 0 });
  const momRaf = useRef<number | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number }>({ t: 0, x: 0, y: 0 });

  // screen point → offset from the map-area center (the transform origin)
  const relCenter = (cx: number, cy: number) => {
    const el = areaRef.current; if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: cx - (r.left + r.width / 2), y: cy - (r.top + r.height / 2) };
  };
  // Zoom to z1 while keeping the map point under screen-rel point `p` pinned.
  const zoomAt = (z1: number, p: { x: number; y: number }, animated = false) => {
    const z0 = zoomRef.current;
    const nz = Math.max(Z_MIN, Math.min(Z_MAX, z1));
    if (nz === z0 && !animated) return;
    const k = 1 - nz / z0;
    const nx = panX.get() + (p.x - panX.get()) * k;
    const ny = panY.get() + (p.y - panY.get()) * k;
    if (animated) {
      const o = { duration: 0.34, ease: [0.16, 1, 0.3, 1] as const };
      animate(zoom, nz, o); animate(panX, nx, o); animate(panY, ny, o);
    } else { zoom.set(nz); panX.set(nx); panY.set(ny); }
    clampPan(nz);
  };
  const stopMomentum = () => { if (momRaf.current != null) { cancelAnimationFrame(momRaf.current); momRaf.current = null; } };

  const onWorldPointerDown = (e: React.PointerEvent) => {
    if (placeMode || diving) return;
    // If the press started on a waypoint pin, let the pin's own click handler run
    // (it dives into the district). Capturing the pointer here would make the
    // browser swallow that click, so pins would never respond to a tap.
    if ((e.target as HTMLElement).closest?.("[data-tw-pin]")) { didPan.current = false; return; }
    stopMomentum();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      dragRef.current = null;
      return;
    }
    // double-tap (touch) → zoom toward the point
    const now = performance.now();
    if (now - lastTap.current.t < 300 && Math.hypot(e.clientX - lastTap.current.x, e.clientY - lastTap.current.y) < 30) {
      const zoomedIn = zoomRef.current > (Z_START + Z_MAX) / 2;
      zoomAt(zoomedIn ? Z_START : Math.min(Z_MAX, zoomRef.current * 1.8), relCenter(e.clientX, e.clientY), true);
      lastTap.current.t = 0; didPan.current = true; // swallow the follow-up tap
      return;
    }
    lastTap.current = { t: now, x: e.clientX, y: e.clientY };
    dragRef.current = { x: e.clientX, y: e.clientY }; didPan.current = false;
    vel.current = { x: 0, y: 0, t: now };
  };
  const onWorldPointerMove = (e: React.PointerEvent) => {
    if (placeMode || diving || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
      panX.set(panX.get() + (midX - pinch.current.cx));   // follow two-finger drag
      panY.set(panY.get() + (midY - pinch.current.cy));
      zoomAt(zoomRef.current * (dist / (pinch.current.dist || dist)), relCenter(midX, midY));
      pinch.current = { dist, cx: midX, cy: midY };
      didPan.current = true;
      return;
    }
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x, dy = e.clientY - dragRef.current.y;
    if (!didPan.current && Math.hypot(dx, dy) < 5) return;
    didPan.current = true;
    dragRef.current = { x: e.clientX, y: e.clientY };
    panX.set(panX.get() + dx); panY.set(panY.get() + dy); clampPan();
    const now = performance.now(), dt = now - vel.current.t;
    if (dt > 0) vel.current = { x: dx / dt, y: dy / dt, t: now };
  };
  const onWorldPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      dragRef.current = { x: p.x, y: p.y };
    } else if (pointers.current.size === 0) {
      dragRef.current = null;
      // fling — decay the last velocity into an inertial glide
      if (!placeMode && (Math.abs(vel.current.x) > 0.06 || Math.abs(vel.current.y) > 0.06)) {
        let vx = vel.current.x * 16, vy = vel.current.y * 16;
        const step = () => {
          vx *= 0.92; vy *= 0.92;
          panX.set(panX.get() + vx); panY.set(panY.get() + vy); clampPan();
          momRaf.current = Math.hypot(vx, vy) > 0.4 ? requestAnimationFrame(step) : null;
        };
        momRaf.current = requestAnimationFrame(step);
      }
    }
  };
  const onWorldWheel = (e: React.WheelEvent) => {
    if (placeMode) return;
    stopMomentum();
    zoomAt(zoomRef.current * (1 - e.deltaY * 0.0012), relCenter(e.clientX, e.clientY));
  };
  const onWorldDoubleClick = (e: React.MouseEvent) => {
    if (placeMode || diving) return;
    const zoomedIn = zoomRef.current > (Z_START + Z_MAX) / 2;
    zoomAt(zoomedIn ? Z_START : Math.min(Z_MAX, zoomRef.current * 1.8), relCenter(e.clientX, e.clientY), true);
  };
  const nudgeZoom = (dir: 1 | -1) => {
    stopMomentum();
    zoomAt(zoomRef.current * (dir > 0 ? 1.35 : 1 / 1.35), { x: 0, y: 0 }, true);
  };
  // Portrait (mobile) opens fully zoomed out so the whole vertical map reads;
  // landscape opens a touch zoomed in on the heart of the map.
  const START_Z = isPortrait ? Z_MIN : Z_START;
  const START_FY = isPortrait ? 50 : 48;
  const resetView = () => { stopMomentum(); frameTo(50, START_FY, START_Z, true); };

  // Start focused near the heart of the map; re-center when the box resizes.
  useEffect(() => {
    if (placeMode) { frameTo(50, 50, Math.max(fitZoom, 0.01), false); }
    else if (vp.w > 1) { frameTo(50, START_FY, START_Z, false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp.w, vp.h, placeMode]);

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    if (momRaf.current != null) cancelAnimationFrame(momRaf.current);
    if (clearTimer.current) clearTimeout(clearTimer.current);
    if (diveTimer.current) clearTimeout(diveTimer.current);
  }, []);

  // Escape clears the selection (dive/travel Escape is handled by TravelContext)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setActive(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Warm the travel clip on hover/touch intent via <link rel="prefetch"> so the
  // browser can cache without a full fetch() into memory. Skip on Save-Data / 2g.
  const prefetchClip = (id: string) => {
    if (prefetched.current.has(id) || shouldReduceMedia()) return;
    prefetched.current.add(id);
    const key = ASSET_KEY[id];
    if (!key) return; // no travel clip for this hood — nothing to warm
    const href = `/world/anim/${key}-wide.mp4`;
    if (document.querySelector(`link[data-tw-prefetch="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "video";
    link.href = href;
    link.setAttribute("data-tw-prefetch", href);
    document.head.appendChild(link);
  };

  // ── Selection (lift + card) ──
  const holdActive = (id: string) => {
    if (clearTimer.current) { clearTimeout(clearTimer.current); clearTimer.current = null; }
    setActive(id);
    prefetchClip(id);
  };
  const clearSoon = () => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setActive(null), 150);
  };

  // ── Dive-in: zoom the whole map into the district, then travel ──
  const dive = (wp: Waypoint) => {
    if (diving) return;
    if (soundOn) playClick();
    trackEvent("waypoint_click", { location: wp.id });
    prefetchClip(wp.id);
    if (reduceMotion) { travelTo(wp.id); return; } // instant — TravelContext also skips the clip
    setDiving(wp);
    const c = coords(wp);
    frameTo(c.x, c.y, Z_MAX, true);   // push the camera into the district, then travel
    diveTimer.current = setTimeout(() => travelTo(wp.id), 560);
  };

  // Pin behavior: a clean tap/click always dives into the district. The didPan
  // guard already rejects pan-drags, so there's no need for a two-tap arm step
  // (that made touch users tap twice — the first tap looked like a no-op).
  const onPinActivate = (wp: Waypoint) => {
    if (placeMode) return;                       // placement tool owns the pins
    if (didPan.current) { didPan.current = false; return; } // was a pan-drag, not a tap
    dive(wp);
  };

  const activeWp = WAYPOINTS.find((w) => w.id === active) ?? null;
  const litId = diving?.id ?? active;
  const spotlightOn = litId != null;
  const dc = diving ? coords(diving) : null;   // dive-veil focal point

  return (
    <>
      <PageMeta
        title="The Map — TRULYS WORLD"
        description="Truly Young's world is a map of Los Angeles. Shadows out now, Dear Joshua — the EP — out August 21, one LA show August 8. Explore every neighborhood."
      />
      <motion.div
        className="h-screen [height:100dvh] bg-background flex flex-col"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <MarqueeStrip />

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between gap-2 px-3 py-3 sm:px-4 border-b-2 border-pink/20 bg-card glitter-border">
          <button onClick={() => navigate("/")} aria-label="Home" className="shrink-0">
            <Logo size={isPortrait ? "sm" : "md"} />
          </button>
          <nav className="hidden sm:flex items-center gap-1.5 sm:gap-2" aria-label="Main navigation">
            <button onClick={() => navigate("/world")} className="btn-retro !text-[10px] !py-1 !px-3" aria-label="Truly's World — the globe">
              &#9673; GLOBE
            </button>
            <button onClick={() => navigate("/shadows")} className="btn-retro !text-[10px] !py-1 !px-3" aria-label="Shadows">
              &#10022; SHADOWS
            </button>
            {member && (
              <button onClick={() => navigate("/account")} aria-label="Your member dashboard"
                className="btn-retro !text-[10px] !py-1 !px-3 shimmer-sweep"
                title={`${member.first} — ${member.points} pts`}>
                &#9830; {member.points.toLocaleString()}
              </button>
            )}
            <span className="case-label hidden md:inline">THE MAP</span>
          </nav>
          {/* mobile: hamburger — the map owns the screen; nav lives in the menu */}
          <button onClick={() => setMenuOpen(true)} aria-label="Menu"
            className="sm:hidden flex h-9 w-9 items-center justify-center rounded-full border border-pink/40 bg-black/50 text-cream/90 backdrop-blur-sm">
            <span className="flex flex-col gap-[3px]" aria-hidden>
              <span className="block h-[2px] w-4 bg-current" />
              <span className="block h-[2px] w-4 bg-current" />
              <span className="block h-[2px] w-4 bg-current" />
            </span>
          </button>
        </header>

        {/* mobile menu overlay */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div className="fixed inset-0 z-[120] sm:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
              <motion.nav
                className="absolute right-0 top-0 h-full w-[74%] max-w-[300px] bg-card border-l-2 border-pink/30 glitter-border flex flex-col gap-2 p-5"
                style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                aria-label="Menu"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="case-label text-[10px]">✦ Truly’s World ✦</span>
                  <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="h-8 w-8 rounded-full border border-white/20 text-cream/80 text-lg leading-none">✕</button>
                </div>
                {[
                  { label: "◉ The Globe", to: "/world" },
                  { label: "✦ Shadows", to: "/shadows" },
                  { label: "♪ Sing", to: "/sing" },
                  ...(member ? [{ label: `♦ Your World · ${member.points.toLocaleString()} pts`, to: "/account" }] : []),
                ].map((it) => (
                  <button key={it.to} onClick={() => { setMenuOpen(false); navigate(it.to); }}
                    className="w-full text-left rounded-xl border border-pink/25 bg-black/30 px-4 py-3 font-display text-sm uppercase tracking-[0.12em] text-cream/90 hover:border-pink/60 hover:bg-pink/10 transition-colors">
                    {it.label}
                  </button>
                ))}
                <p className="mt-auto font-whimsy text-[11px] text-pink-light/50">drag · pinch · tap an island to dive in ✦</p>
              </motion.nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map area — box is fit to the image aspect so waypoint % coords stay locked to the art */}
        <div
          ref={areaRef}
          className="relative flex-1 overflow-hidden flex items-center justify-center"
          style={{
            background: "radial-gradient(ellipse at center, #2a0a28 0%, #14041a 60%, #07020c 100%)",
            containerType: "size",
            touchAction: "none",
            cursor: placeMode ? "default" : dragRef.current ? "grabbing" : "grab",
          }}
          onPointerDown={onWorldPointerDown}
          onPointerMove={onWorldPointerMove}
          onPointerUp={onWorldPointerUp}
          onPointerCancel={onWorldPointerUp}
          onPointerLeave={onWorldPointerUp}
          onWheel={onWorldWheel}
          onDoubleClick={onWorldDoubleClick}
        >
          {/* ambient bleed — the map art itself, blurred + dimmed, fills the letterbox gutters */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <img
              src={mapSrc}
              alt=""
              className={`w-full h-full object-cover scale-110 blur-xl transition-opacity duration-[1200ms] ${mapReady ? "opacity-35" : "opacity-0"}`}
              draggable={false}
            />
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(7,2,12,0.75) 100%)" }} />
          </div>

          {/* Camera controls — zoom (hidden in place mode) */}
          {!placeMode && (
            <>
              <div className="pointer-events-none absolute right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-1.5">
                <button onClick={() => nudgeZoom(1)} aria-label="Zoom in" className="pointer-events-auto h-9 w-9 rounded-full border border-pink/30 bg-black/55 font-display text-lg leading-none text-cream/90 backdrop-blur-sm hover:text-white hover:border-pink/60 transition-colors">+</button>
                <button onClick={() => nudgeZoom(-1)} aria-label="Zoom out" className="pointer-events-auto h-9 w-9 rounded-full border border-pink/30 bg-black/55 font-display text-lg leading-none text-cream/90 backdrop-blur-sm hover:text-white hover:border-pink/60 transition-colors">−</button>
                <button onClick={resetView} aria-label="Reset view" title="Reset view" className="pointer-events-auto h-9 w-9 rounded-full border border-pink/30 bg-black/55 font-display text-[13px] leading-none text-cream/90 backdrop-blur-sm hover:text-white hover:border-pink/60 transition-colors">⟳</button>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center">
                <span className="rounded-full bg-black/45 px-3 py-1 font-whimsy text-[11px] text-pink-light/80 backdrop-blur-sm">drag · pinch · double-tap to zoom ✦</span>
              </div>
            </>
          )}

          {/* World frame — pan (x/y) + zoom (scale) camera over the extended map.
              Cover-sized so it always fills the viewport at zoom 1; pins are % of it. */}
          <motion.div
            ref={stageRef}
            className="relative"
            style={{
              // Size the stage from the SAME measured cover dims the pan/clamp math
              // uses (boxW/boxH). Container-query units drifted from these on mobile,
              // which let the map pan off into empty gutters and broke drag/pinch.
              width: `${boxW}px`,
              height: `${boxH}px`,
              x: panX,
              y: panY,
              scale: zoom,
              transformOrigin: "50% 50%",
            }}
          >
            {/* Content layer — the world camera (pan/zoom) drives the push-in now */}
            <motion.div
              className="absolute inset-0"
              style={{ pointerEvents: diving ? "none" : "auto" }}
            >
              {/* base map */}
              <img
                src={mapSrc}
                alt="Truly Young's illustrated map of Los Angeles — neighborhoods glowing"
                className={`absolute inset-0 w-full h-full object-cover select-none transition-all duration-[900ms] ease-out ${mapReady ? "opacity-100 scale-100" : "opacity-0 scale-[1.03]"}`}
                loading="eager"
                draggable={false}
                onLoad={() => setMapReady(true)}
                onClick={() => setActive(null)}
              />

              {/* ── ALWAYS-ON LIFE ─────────────────────────────────────────
                  Energy pulse flowing through the neon grid — a brightened
                  copy of the map, screen-blended, revealed by a soft band
                  that sweeps across on a loop. Makes the roads feel powered. */}
              {mapReady && !reduceMotion && (
                <div className="map-energy absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen", opacity: 0.7 }} aria-hidden>
                  <img
                    src={mapSrc}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: "brightness(1.9) saturate(1.5) contrast(1.05)" }}
                  />
                </div>
              )}

              {/* Twinkling stars in the sky */}
              {mapReady && (
                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }} aria-hidden>
                  {TWINKLES.map((t, i) => (
                    <span
                      key={i}
                      className="map-twinkle absolute rounded-full"
                      style={{
                        left: `${t.x}%`, top: `${t.y}%`,
                        width: i % 3 === 0 ? 3 : 2, height: i % 3 === 0 ? 3 : 2,
                        background: i % 2 ? "#ffd9ec" : "#ffffff",
                        boxShadow: "0 0 5px rgba(255,190,225,0.9)",
                        animationDelay: `${t.d}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Shooting stars — an occasional streak across the night sky */}
              {mapReady && !reduceMotion && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }} aria-hidden>
                  {SHOOTING.map((s, i) => (
                    <span
                      key={`shoot-${i}`}
                      className="map-shooting absolute"
                      style={{
                        left: `${s.x}%`, top: `${s.y}%`,
                        width: 92, height: 2, borderRadius: 2,
                        background: "linear-gradient(90deg, transparent 0%, rgba(255,220,245,0.10) 45%, #ffffff 100%)",
                        boxShadow: "0 0 7px 1px rgba(255,235,250,0.85)",
                        transformOrigin: "right center",
                        animationDelay: `${s.d}s`, animationDuration: `${s.dur}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* City lights flickering on — warm windows + pink neon coming alive */}
              {mapReady && (
                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }} aria-hidden>
                  {GLIMMERS.map((g, i) => (
                    <span
                      key={`glimmer-${i}`}
                      className={reduceMotion ? "absolute rounded-full" : "map-glimmer absolute rounded-full"}
                      style={{
                        left: `${isPortrait ? g.xP : g.x}%`, top: `${isPortrait ? g.yP : g.y}%`,
                        width: i % 2 ? 3 : 4, height: i % 2 ? 3 : 4,
                        background: g.c,
                        boxShadow: `0 0 6px 1px ${g.c}, 0 0 13px 2px ${g.c}88`,
                        mixBlendMode: "screen",
                        animationDelay: `${g.d}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* ── Placed FX: spider, ocean, moon, Hollywood spotlight ── */}
              {mapReady && (() => {
                const P = isPortrait;
                // feature centers (% of the map box) per orientation
                const spider = P ? { x: 14, y: 6 } : { x: 14, y: 8 };
                const moon = P ? { x: 67, y: 5, s: 7 } : { x: 60, y: 6, s: 6 };
                const holly = P ? { x: 71, y: 26, w: 24, h: 12 } : { x: 53, y: 25, w: 20, h: 9 };
                return (
                  <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 4 }} aria-hidden>
                    {/* Spider — gentle dangle on its thread */}
                    <div className="absolute" style={{ left: `${spider.x}%`, top: `${spider.y}%`, transform: "translate(-50%,0)" }}>
                      <div className={reduceMotion ? "" : "map-spider"}>
                        <svg width="34" height="30" viewBox="0 0 34 30" style={{ filter: "drop-shadow(0 0 3px rgba(210,150,230,0.5))" }}>
                          <g stroke="#c98fd8" strokeWidth="1.4" fill="none" strokeLinecap="round">
                            <path d="M17 0 L17 11" />
                            <path d="M17 15 C 9 10, 4 13, 1 9 M17 15 C 10 14, 5 18, 2 16 M17 15 C 25 10, 30 13, 33 9 M17 15 C 24 14, 29 18, 32 16" />
                          </g>
                          <ellipse cx="17" cy="14.5" rx="3.2" ry="2.6" fill="#3a1f45" stroke="#c98fd8" strokeWidth="1" />
                          <ellipse cx="17" cy="18.5" rx="4" ry="4.4" fill="#3a1f45" stroke="#c98fd8" strokeWidth="1" />
                        </svg>
                      </div>
                    </div>

                    {/* Moon — breathing halo */}
                    <div className={reduceMotion ? "absolute" : "map-moon absolute"} style={{ left: `${moon.x}%`, top: `${moon.y}%`, width: `${moon.s}%`, aspectRatio: "1", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,235,250,0.5) 0%, rgba(255,190,235,0.28) 45%, transparent 72%)", mixBlendMode: "screen" }} />

                    {/* Hollywood sign — sweeping searchlight */}
                    <div className="absolute overflow-hidden" style={{ left: `${holly.x}%`, top: `${holly.y}%`, width: `${holly.w}%`, height: `${holly.h}%`, transform: "translate(-50%,-50%)" }}>
                      <div className={reduceMotion ? "absolute" : "map-spotlight absolute"} style={{ left: "50%", top: "50%", width: "60%", height: "260%", background: "radial-gradient(ellipse 40% 50% at 50% 50%, rgba(255,246,214,0.55) 0%, rgba(255,240,190,0.18) 40%, transparent 70%)", mixBlendMode: "screen" }} />
                    </div>
                  </div>
                );
              })()}

              {/* Ocean — water glints twinkling on the waves */}
              {mapReady && (
                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }} aria-hidden>
                  {WATER.map((w, i) => (
                    <span key={`water-${i}`}
                      className={reduceMotion ? "absolute rounded-full" : "map-water absolute rounded-full"}
                      style={{
                        left: `${isPortrait ? w.xP : w.x}%`, top: `${isPortrait ? w.yP : w.y}%`,
                        width: i % 2 ? 2 : 3, height: i % 2 ? 2 : 3,
                        background: "#dff2ff",
                        boxShadow: "0 0 5px 1px rgba(200,225,255,0.85)",
                        mixBlendMode: "screen",
                        animationDelay: `${w.d}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* District beacons — every neighborhood breathes a soft light */}
              {mapReady && (
                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }} aria-hidden>
                  {WAYPOINTS.map((wp, i) => {
                    const { x, y } = coords(wp);
                    const on = litId === wp.id;
                    return (
                      <span
                        key={`beacon-${wp.id}`}
                        className={reduceMotion ? "absolute" : "map-beacon absolute"}
                        style={{
                          left: `${x}%`, top: `${y}%`,
                          width: "17%", aspectRatio: "1",
                          transform: "translate(-50%, -50%)",
                          background: "radial-gradient(circle, rgba(255,79,163,0.6) 0%, rgba(255,79,163,0.18) 42%, transparent 70%)",
                          mixBlendMode: "screen",
                          animationDelay: `${i * 0.5}s`,
                          opacity: on ? 0.95 : undefined,
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* Sparkles drifting up over the city */}
              {mapReady && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 6 }} aria-hidden>
                  {SPARKLES.map((s, i) => (
                    <span
                      key={i}
                      className={reduceMotion ? "absolute font-whimsy" : "map-sparkle absolute font-whimsy"}
                      style={{
                        left: `${s.x}%`, top: `${s.y}%`,
                        fontSize: i % 2 ? 13 : 16,
                        color: s.g === "♥" ? "#ff7bbd" : "#ffe3f1",
                        textShadow: "0 0 8px rgba(255,79,163,0.9)",
                        animationDelay: `${s.d}s`,
                        animationDuration: `${s.dur}s`,
                      }}
                    >
                      {s.g}
                    </span>
                  ))}
                </div>
              )}

              {/* whisper-soft atmosphere — just enough depth at the corners to seat the
                  pins, without reading as a frame (immersive, borderless) */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at center, transparent 68%, rgba(12,4,14,0.28) 100%)" }}
              />

              {/* spotlight scrim — dims the rest of the city while a district is lit */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  zIndex: 4,
                  background: "rgba(5,1,10,0.66)",
                  opacity: spotlightOn ? 1 : 0,
                  transition: "opacity 0.45s ease",
                }}
                aria-hidden
              />

              {/* district cutouts — the SAME map, clipped to a circle around each hood.
                  On hover/select the copy lifts: brighter, saturated, scaled from its own
                  center, wrapped in a magenta drop-shadow (filter on the wrapper follows
                  the clip shape). Pixel-perfect because it's the identical image box. */}
              {WAYPOINTS.map((wp) => {
                const { x, y } = coords(wp);
                const on = litId === wp.id;
                return (
                  <div
                    key={`lift-${wp.id}`}
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      zIndex: 5,
                      opacity: on ? 1 : 0,
                      filter: on
                        ? "drop-shadow(0 0 14px rgba(255,79,163,0.7)) drop-shadow(0 10px 38px rgba(255,79,163,0.38))"
                        : "none",
                      transition: "opacity 0.4s ease, filter 0.4s ease",
                    }}
                  >
                    <img
                      src={mapSrc}
                      alt=""
                      draggable={false}
                      className="absolute inset-0 w-full h-full object-cover select-none"
                      style={{
                        clipPath: heartClip(
                          (x / 100) * boxW,
                          (y / 100) * boxH,
                          (DISTRICT_R / 100) * (Math.hypot(boxW, boxH) / Math.SQRT2),
                        ),
                        transform: on && !reduceMotion ? "scale(1.11)" : "scale(1)",
                        transformOrigin: `${x}% ${y}%`,
                        filter: on ? "brightness(1.5) saturate(1.4) contrast(1.05)" : "brightness(1) saturate(1)",
                        transition: "transform 0.5s cubic-bezier(0.22,1,0.36,1), filter 0.4s ease",
                      }}
                    />
                  </div>
                );
              })}

              {/* Waypoints */}
              {WAYPOINTS.map((wp, i) => {
                const { x, y } = coords(wp);
                const on = litId === wp.id;
                return (
                  <motion.button
                    key={wp.id}
                    data-tw-pin
                    className="absolute z-10 group flex items-center justify-center -translate-x-1/2 -translate-y-1/2 min-w-[48px] min-h-[48px] p-2"
                    style={{ left: `${x}%`, top: `${y}%`, touchAction: "manipulation" }}
                    onClick={() => onPinActivate(wp)}
                    onPointerEnter={(e) => { prefetchClip(wp.id); if (e.pointerType === "mouse") holdActive(wp.id); }}
                    onPointerLeave={(e) => { if (e.pointerType === "mouse") clearSoon(); }}
                    onFocus={() => holdActive(wp.id)}
                    onBlur={clearSoon}
                    onTouchStart={() => prefetchClip(wp.id)}
                    aria-label={`${wp.name} — ${wp.blurb}. Dive in.`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
                  >
                    {/* counter-scaled so pins stay a constant screen size at any zoom */}
                    <motion.div
                      className={`flex ${isPortrait && wp.labelBelowP ? "flex-col-reverse" : "flex-col"} items-center transition-transform duration-200 group-hover:scale-110 group-active:scale-95`}
                      style={{ scale: invZoom }}
                    >
                      {/* label */}
                      <span
                        className="my-1 whitespace-nowrap font-sans font-extrabold uppercase text-[10px] md:text-[13px] tracking-[0.12em] text-[#ffe3f1]"
                        style={{
                          textShadow: on
                            ? "0 0 8px rgba(255,79,163,1), 0 0 20px rgba(255,79,163,0.8), 0 1px 2px rgba(0,0,0,0.9)"
                            : "0 0 6px rgba(255,79,163,0.9), 0 0 14px rgba(255,79,163,0.6), 0 1px 2px rgba(0,0,0,0.9)",
                        }}
                      >
                        {wp.name}
                      </span>
                      {/* pin marker — heart */}
                      <span className="relative flex items-center justify-center" style={{ color: "#ff4fa3" }}>
                        <HeartMark className="absolute w-5 h-5 animate-ping" style={{ opacity: 0.4 }} />
                        <HeartMark
                          className="relative w-4 h-4 transition-transform duration-300"
                          style={{
                            stroke: "rgba(255,255,255,0.75)",
                            strokeWidth: 1.2,
                            filter: on
                              ? "drop-shadow(0 0 6px #ff4fa3) drop-shadow(0 0 16px #ff4fa3) drop-shadow(0 1px 1px rgba(0,0,0,0.9))"
                              : "drop-shadow(0 0 5px #ff4fa3) drop-shadow(0 0 11px rgba(255,79,163,0.7)) drop-shadow(0 1px 1px rgba(0,0,0,0.8))",
                            transform: on ? "scale(1.3)" : "scale(1)",
                          }}
                        />
                      </span>
                    </motion.div>
                  </motion.button>
                );
              })}

              {/* ── PLACEMENT HANDLES (dev, ?place=1) — drag to reposition ── */}
              {placeMode && WAYPOINTS.map((wp) => {
                const c = placed[wp.id] ?? coords(wp);
                const dragging = dragId === wp.id;
                return (
                  <div
                    key={`place-${wp.id}`}
                    className="absolute z-40 -translate-x-1/2 -translate-y-1/2 touch-none"
                    style={{ left: `${c.x}%`, top: `${c.y}%`, cursor: dragging ? "grabbing" : "grab" }}
                    onPointerDown={(e) => onHandleDown(e, wp.id)}
                    onPointerMove={(e) => onHandleMove(e, wp.id)}
                    onPointerUp={onHandleUp}
                  >
                    <div
                      className="h-5 w-5 rounded-full border-2 border-white"
                      style={{ background: dragging ? "#22d3ee" : "rgba(34,211,238,0.85)", boxShadow: "0 0 10px #22d3ee, 0 0 2px #000" }}
                    />
                    <div className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/85 px-1.5 py-0.5 font-mono text-[9px] leading-tight text-cyan-200">
                      {wp.name}<br />{c.x}, {c.y}
                    </div>
                  </div>
                );
              })}

              {/* Future cities — distant horizon skylines, locked. A nod to the rest
                  of Truly's world opening up later. Non-travel; just teases. */}
              {WAYPOINTS.length > 0 && FUTURE.map((f, i) => {
                const x = isPortrait ? f.xP : f.x;
                const y = isPortrait ? f.yP : f.y;
                return (
                  <div
                    key={`future-${i}`}
                    className="absolute z-[9] group/f -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                    style={{ left: `${x}%`, top: `${y}%` }}
                    aria-hidden
                  >
                    <span className="map-twinkle block w-1.5 h-1.5 rounded-full bg-[#ffd9ec]" style={{ boxShadow: "0 0 6px rgba(255,190,225,0.9)", animationDelay: `${i * 0.9}s` }} />
                    <span className="mt-1 opacity-60 group-hover/f:opacity-100 transition-opacity whitespace-nowrap font-display text-[8px] md:text-[9px] uppercase tracking-[0.18em] text-pink-light/70">
                      soon ✦
                    </span>
                  </div>
                );
              })}

              {/* Selection card — name + blurb + dive-in, anchored near the lit district */}
              <AnimatePresence>
                {activeWp && !diving && (() => {
                  const { x, y } = coords(activeWp);
                  const tx = x <= 22 ? "12px" : x >= 78 ? "calc(-100% - 12px)" : "-50%";
                  const below = y < 55;
                  const ty = below ? "46px" : "calc(-100% - 46px)";
                  return (
                    <motion.div
                      key={activeWp.id}
                      className="absolute z-20"
                      style={{ left: `${x}%`, top: `${y}%`, pointerEvents: "none" }}
                      initial={{ opacity: 0, y: below ? -6 : 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: below ? -4 : 4, scale: 0.97 }}
                      transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
                    >
                      <div
                        className="pointer-events-auto"
                        style={{ transform: `translate(${tx}, ${ty})` }}
                        onPointerEnter={(e) => { if (e.pointerType === "mouse") holdActive(activeWp.id); }}
                        onPointerLeave={(e) => { if (e.pointerType === "mouse") clearSoon(); }}
                      >
                        <div
                          className="w-[186px] md:w-[210px] rounded-2xl border-2 border-pink/40 bg-[#0b0410]/85 backdrop-blur-md px-4 pt-3 pb-2.5"
                          style={{ boxShadow: "0 0 22px rgba(255,79,163,0.35), 0 8px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)" }}
                        >
                          <div className="font-display text-[17px] md:text-[19px] leading-tight chrome-text-pink">{activeWp.name}</div>
                          <div className="font-whimsy text-[11px] md:text-xs text-pink-light/90 mt-0.5">{activeWp.blurb}</div>
                          <button
                            className="mt-2 -mx-1.5 px-1.5 min-h-[44px] w-[calc(100%+12px)] flex items-center justify-between font-display text-[12px] uppercase tracking-[0.18em] text-[#ffb6d5] hover:text-white focus-visible:text-white transition-colors border-t border-pink/25"
                            onClick={() => dive(activeWp)}
                            aria-label={`Dive into ${activeWp.name}`}
                          >
                            <span>dive in</span>
                            <span aria-hidden className="text-[15px]">→</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              {/* Dive veil — the city rushes toward you and the edges fall to black */}
              <AnimatePresence>
                {diving && dc && (
                  <motion.div
                    key="dive-veil"
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      zIndex: 30,
                      background: `radial-gradient(circle at ${dc.x}% ${dc.y}%, rgba(255,79,163,0.28) 0%, rgba(10,2,14,0.75) 42%, #07020c 85%)`,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.92 }}
                    transition={{ duration: 0.55, ease: "easeIn" }}
                    aria-hidden
                  />
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>

        {/* Mobile list */}
      </motion.div>

      {/* PLACEMENT CONTROL PANEL (dev, ?place=1) */}
      {placeMode && (
        <div className="fixed left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2 rounded-full border border-cyan-400/50 bg-black/90 px-3 py-2 backdrop-blur-sm" style={{ top: "max(4.5rem, calc(env(safe-area-inset-top) + 4rem))" }}>
          <span className="font-mono text-[11px] text-cyan-200">
            PLACE · {isPortrait ? "PORTRAIT (xP/yP)" : "LANDSCAPE (x/y)"} · drag pins
          </span>
          <button onClick={copyWaypoints} className="rounded-full bg-cyan-400 px-3 py-1 font-mono text-[11px] font-bold text-black transition-colors hover:bg-cyan-300">
            {copied ? "copied ✓" : "copy array"}
          </button>
          <button onClick={() => setPlaced({})} className="rounded-full border border-white/30 px-3 py-1 font-mono text-[11px] text-white/80 hover:text-white">
            reset
          </button>
        </div>
      )}
    </>
  );
};

export default MapHub;
