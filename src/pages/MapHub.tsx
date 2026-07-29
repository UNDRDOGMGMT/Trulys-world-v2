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

// Higgsfield inked map — immersive full-bleed, geographically-truer LA.
// Landscape (desktop) + purpose-composed vertical portrait (mobile) assets.
const MAP_SRC = "/world/maps/la-map-7.jpg";     // extended explorable world (outpainted)
const MAP_W = 2752, MAP_H = 1536;
const MAP_SRC_P = "/world/maps/la-map-6-v.jpg";
const MAP_W_P = 896, MAP_H_P = 1200;

// District "cutout" radius — % of the clip-path diagonal reference box.
const DISTRICT_R = 13.5;

// The launch neighborhoods. x/y = % on the landscape map; xP/yP = % on the portrait map.
// labelBelowP: on the tighter portrait map, hang the label under the pin so
// neighboring labels don't collide (LC / WeHo / Hollywood cluster at the top).
interface Waypoint { id: string; name: string; blurb: string; x: number; y: number; xP: number; yP: number; labelBelowP?: boolean; }
const WAYPOINTS: Waypoint[] = [
  // landscape x/y = % on the extended world map (la-map-7); first-pass placement,
  // fine-tune live with /map?place=1. Portrait xP/yP still on the old portrait map.
  { id: "laurel-canyon", name: "Laurel Canyon", blurb: "Songbook", x: 52, y: 21, xP: 20, yP: 30 },
  { id: "weho", name: "West Hollywood", blurb: "Merch", x: 37, y: 41, xP: 22, yP: 62, labelBelowP: true },
  { id: "hollywood", name: "Hollywood", blurb: "Music / Releases", x: 50, y: 47, xP: 46, yP: 47 },
  { id: "silverlake", name: "Silver Lake", blurb: "The Inner Circle", x: 72, y: 40, xP: 63, yP: 39 },
  { id: "dtla", name: "Downtown", blurb: "Cruise Night", x: 88, y: 52, xP: 74, yP: 52 },
  { id: "lax", name: "LAX", blurb: "Get the Drop", x: 49, y: 56, xP: 60, yP: 79, labelBelowP: true },
  { id: "santa-monica", name: "Santa Monica", blurb: "Live / Sessions", x: 14, y: 45, xP: 27, yP: 80, labelBelowP: true },
  { id: "venice", name: "Venice", blurb: "Videos", x: 20, y: 63, xP: 16, yP: 90, labelBelowP: true },
  { id: "malibu", name: "Malibu", blurb: "Downloads", x: 5, y: 38, xP: 9, yP: 70, labelBelowP: true },
  { id: "beverly-hills", name: "Beverly Hills", blurb: "Press / EPK", x: 31, y: 50, xP: 15, yP: 54, labelBelowP: true },
  { id: "koreatown", name: "Koreatown", blurb: "After Hours", x: 52, y: 58, xP: 52, yP: 66, labelBelowP: true },
  { id: "the-valley", name: "The Valley", blurb: "The Lore", x: 33, y: 20, xP: 50, yP: 14 },
  { id: "inglewood", name: "Inglewood", blurb: "Dress-Up", x: 57, y: 70, xP: 46, yP: 72, labelBelowP: true },
  { id: "long-beach", name: "Long Beach", blurb: "Raw Archive", x: 84, y: 78, xP: 62, yP: 88, labelBelowP: true },
];

// Future cities on the horizon — Truly's world keeps expanding. These distant
// glowing skylines are baked into the art; we mark them "coming soon" (no travel).
interface FuturePin { x: number; y: number; xP: number; yP: number; }
const FUTURE: FuturePin[] = [
  { x: 22, y: 14, xP: 30, yP: 8 },
  { x: 87, y: 13, xP: 68, yP: 9 },
];

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
  const [active, setActive] = useState<string | null>(null);       // hovered (desktop) / selected (touch)
  const [diving, setDiving] = useState<Waypoint | null>(null);     // mid dive-in zoom
  const prefetched = useRef<Set<string>>(new Set());
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapSrc = isPortrait ? MAP_SRC_P : MAP_SRC;
  const mapW = isPortrait ? MAP_W_P : MAP_W;
  const mapH = isPortrait ? MAP_H_P : MAP_H;

  // hover-capable (mouse/trackpad) vs touch — decides one-tap vs select-then-dive
  const canHover = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches,
    []
  );

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

  // pointer pan (drag anywhere) — tap vs drag tracked so pins still dive
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const didPan = useRef(false);
  const onWorldPointerDown = (e: React.PointerEvent) => {
    if (placeMode || diving) return;
    dragRef.current = { x: e.clientX, y: e.clientY }; didPan.current = false;
  };
  const onWorldPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || placeMode || diving) return;
    const dx = e.clientX - dragRef.current.x, dy = e.clientY - dragRef.current.y;
    if (!didPan.current && Math.hypot(dx, dy) < 5) return;
    didPan.current = true;
    dragRef.current = { x: e.clientX, y: e.clientY };
    panX.set(panX.get() + dx); panY.set(panY.get() + dy); clampPan();
  };
  const onWorldPointerUp = () => { dragRef.current = null; };
  const onWorldWheel = (e: React.WheelEvent) => {
    if (placeMode) return;
    const z = Math.max(Z_MIN, Math.min(Z_MAX, zoomRef.current * (1 - e.deltaY * 0.0012)));
    zoom.set(z); clampPan(z);
  };
  const nudgeZoom = (dir: 1 | -1) => {
    const z = Math.max(Z_MIN, Math.min(Z_MAX, zoomRef.current * (dir > 0 ? 1.3 : 1 / 1.3)));
    animate(zoom, z, { duration: 0.3 }); clampPan(z);
  };
  // Preset cameras — glide to a region of the world.
  const CAMS: { label: string; fx: number; fy: number; z: number }[] = [
    { label: "Wide", fx: 50, fy: 48, z: 1 },
    { label: "Coast", fx: 15, fy: 52, z: 1.7 },
    { label: "Hills", fx: 46, fy: 24, z: 1.7 },
    { label: "Downtown", fx: 85, fy: 55, z: 1.8 },
  ];

  // Start focused near the heart of the map; re-center when the box resizes.
  useEffect(() => {
    if (placeMode) { frameTo(50, 50, Math.max(fitZoom, 0.01), false); }
    else if (vp.w > 1) { frameTo(50, 48, Z_START, false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp.w, vp.h, placeMode]);

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    if (clearTimer.current) clearTimeout(clearTimer.current);
    if (diveTimer.current) clearTimeout(diveTimer.current);
  }, []);

  // Escape clears the selection (dive/travel Escape is handled by TravelContext)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setActive(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Warm the travel clip the moment intent is shown (hover / touch) so the
  // cinematic push-in starts instantly instead of buffering. Clips are ~600KB.
  const prefetchClip = (id: string) => {
    if (prefetched.current.has(id)) return;
    prefetched.current.add(id);
    const key = ASSET_KEY[id];
    if (!key) return; // no travel clip for this hood — nothing to warm
    fetch(`/world/anim/${key}-wide.mp4`, { cache: "force-cache" }).catch(() => {});
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

  // Pin behavior: desktop = hover already lifted, click dives.
  // Touch = first tap selects+lifts (card shows "dive in"), second tap dives.
  const onPinActivate = (wp: Waypoint) => {
    if (placeMode) return;                       // placement tool owns the pins
    if (didPan.current) { didPan.current = false; return; } // was a pan-drag, not a tap
    if (canHover || active === wp.id) dive(wp);
    else holdActive(wp.id);
  };

  const activeWp = WAYPOINTS.find((w) => w.id === active) ?? null;
  const litId = diving?.id ?? active;
  const spotlightOn = litId != null;
  const dc = diving ? coords(diving) : null;   // dive-veil focal point

  return (
    <>
      <PageMeta
        title="The Map — TRULYS WORLD"
        description="Truly Young's world is a map of Los Angeles. Six neighborhoods, six case files. Downtown, Silver Lake, Hollywood, West Hollywood, Laurel Canyon, LAX."
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
          <nav className="flex items-center gap-1.5 sm:gap-2" aria-label="Main navigation">
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
            {/* SING pulled from the top bar for now — karaoke lives in Koreatown (After Hours). Relaunch here later. */}
            <span className="case-label hidden md:inline">THE MAP</span>
          </nav>
        </header>

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
          onPointerLeave={onWorldPointerUp}
          onWheel={onWorldWheel}
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

          {/* Camera controls — preset regions + zoom (hidden in place mode) */}
          {!placeMode && (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-3">
                <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-pink/30 bg-black/55 px-1.5 py-1 backdrop-blur-sm">
                  {CAMS.map((c) => (
                    <button key={c.label} onClick={() => frameTo(c.fx, c.fy, c.z)}
                      className="rounded-full px-3 py-1 font-display text-[10px] uppercase tracking-[0.14em] text-cream/80 hover:text-white hover:bg-pink/25 transition-colors">
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pointer-events-none absolute right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-1.5">
                <button onClick={() => nudgeZoom(1)} aria-label="Zoom in" className="pointer-events-auto h-9 w-9 rounded-full border border-pink/30 bg-black/55 font-display text-lg leading-none text-cream/90 backdrop-blur-sm hover:text-white hover:border-pink/60 transition-colors">+</button>
                <button onClick={() => nudgeZoom(-1)} aria-label="Zoom out" className="pointer-events-auto h-9 w-9 rounded-full border border-pink/30 bg-black/55 font-display text-lg leading-none text-cream/90 backdrop-blur-sm hover:text-white hover:border-pink/60 transition-colors">−</button>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center">
                <span className="rounded-full bg-black/45 px-3 py-1 font-whimsy text-[11px] text-pink-light/80 backdrop-blur-sm">drag to explore · scroll to zoom ✦</span>
              </div>
            </>
          )}

          {/* World frame — pan (x/y) + zoom (scale) camera over the extended map.
              Cover-sized so it always fills the viewport at zoom 1; pins are % of it. */}
          <motion.div
            ref={stageRef}
            className="relative"
            style={{
              width: `max(100cqw, calc(100cqh * ${mapW} / ${mapH}))`,
              height: `max(100cqh, calc(100cqw * ${mapH} / ${mapW}))`,
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
                        clipPath: `circle(${DISTRICT_R}% at ${x}% ${y}%)`,
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
                      {/* pin marker */}
                      <span className="relative flex items-center justify-center">
                        <span className="absolute w-6 h-6 rounded-full bg-[#ff4fa3]/40 animate-ping" />
                        <span
                          className="relative w-3.5 h-3.5 rounded-full bg-[#ff4fa3] border border-white/70 transition-transform duration-300"
                          style={{
                            boxShadow: on
                              ? "0 0 10px #ff4fa3, 0 0 24px #ff4fa3, 0 0 44px rgba(255,79,163,0.8)"
                              : "0 0 8px #ff4fa3, 0 0 18px #ff4fa3, 0 0 30px rgba(255,79,163,0.6)",
                            transform: on ? "scale(1.25)" : "scale(1)",
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
        <div className="md:hidden relative z-10 bg-card border-t-2 border-pink/20 glitter-border flex-shrink-0 max-h-[36dvh] overflow-y-auto">
          <div className="px-4 py-3">
            <span className="case-label">✦ Neighborhoods ✦</span>
          </div>
          <div className="divide-y divide-border">
            {WAYPOINTS.map((wp) => {
              const on = active === wp.id;
              return (
                <button
                  key={wp.id}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all duration-200 ${on ? "bg-accent/15" : "hover:bg-accent/10 active:bg-accent/15"}`}
                  onClick={() => dive(wp)}
                  onTouchStart={() => { prefetchClip(wp.id); holdActive(wp.id); }}
                  onPointerEnter={(e) => { prefetchClip(wp.id); if (e.pointerType === "mouse") holdActive(wp.id); }}
                  onPointerLeave={(e) => { if (e.pointerType === "mouse") clearSoon(); }}
                  aria-label={`${wp.name} — ${wp.blurb}. Dive in.`}
                >
                  {/* pin dot — matches the map waypoints */}
                  <span
                    className="w-2.5 h-2.5 shrink-0 rounded-full bg-[#ff4fa3] border border-white/60"
                    style={{ boxShadow: on ? "0 0 8px #ff4fa3, 0 0 18px rgba(255,79,163,0.8)" : "0 0 6px #ff4fa3, 0 0 14px rgba(255,79,163,0.5)" }}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <span className="block font-display text-base text-foreground leading-tight truncate">{wp.name}</span>
                    <span className="block font-whimsy text-xs text-pink-light/80 truncate">{wp.blurb}</span>
                  </div>
                  <span className="font-display text-[11px] uppercase tracking-[0.12em] text-accent shrink-0">Dive in →</span>
                </button>
              );
            })}
          </div>
        </div>
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
