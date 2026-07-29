import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageMeta from "@/components/PageMeta";
import { useIsPortrait } from "@/hooks/useIsPortrait";

/**
 * Corbin Bowl — the ARCADE.
 * FLOW: land on a wide OVERVIEW (pink bay left, teal bay right). Pick a bay →
 * a Higgsfield camera PUSH-IN video plays (desktop) → arrive in that bay's WALL
 * scene. Each Truly cabinet is a HOTSPOT that lights up on hover; clicking
 * launches that game full-screen. "← arcade" returns to the overview.
 * MOBILE: dedicated 3:4 PORTRAIT scenes (overview + walls) with their own
 * hotspot rects; the transition is a quick fade (the 16:9 clips are desktop-only).
 */

const OVERVIEW = "/corbin/overview.jpg";
const OVERVIEW_P = "/corbin/overview-v.jpg";
// reverse push-out clips (wall → overview), indexed by wall. Desktop only.
const BACK_VIDEO = ["/corbin/back-pink.mp4", "/corbin/back-teal.mp4"];

interface Wall { img: string; imgP: string; tint: string; name: string; anchors: [string, string]; }
const WALLS: Wall[] = [
  { img: "/corbin/wall1-scene.jpg", imgP: "/corbin/wall1-scene-v.jpg", tint: "#ff4fa3", name: "the pink bay", anchors: ["Beat 'Em Up", "Super Claw"] },
  { img: "/corbin/wall2-scene.jpg", imgP: "/corbin/wall2-scene-v.jpg", tint: "#5fe3d4", name: "the teal bay", anchors: ["Survival Horror", "Top Shot Basketball"] },
];

// the two pickable bays. x/y/w/h = % on the 16:9 overview; *P = % on the 3:4 portrait overview.
interface Bay { wall: 0 | 1; tint: string; name: string; games: string; video: string; x: number; y: number; w: number; h: number; xP: number; yP: number; wP: number; hP: number; }
const BAYS: Bay[] = [
  { wall: 0, tint: "#ff4fa3", name: "THE PINK BAY", games: "Dear Joshua · Boy · Shadows",       video: "/corbin/enter-pink.mp4", x: 12, y: 14, w: 33, h: 76, xP: 5,  yP: 22, wP: 41, hP: 60 },
  { wall: 1, tint: "#5fe3d4", name: "THE TEAL BAY", games: "Fear the Reaper · You Two · Forever", video: "/corbin/enter-teal.mp4", x: 55, y: 14, w: 33, h: 76, xP: 54, yP: 22, wP: 41, hP: 60 },
];

interface Cab { song: string; game: string; route: string; wall: 0 | 1; x: number; y: number; w: number; h: number; xP: number; yP: number; wP: number; hP: number; }
// x/y/w/h = % on the 16:9 wall scene; *P = % on the 3:4 portrait wall scene.
const CABS: Cab[] = [
  { song: "DEAR JOSHUA",     game: "type her letter",     route: "/dear-joshua-game", wall: 0, x: 30.3, y: 27, w: 13.3, h: 47, xP: 7.4,  yP: 38, wP: 27.2, hP: 40 },
  { song: "BOY",             game: "say it to his face",  route: "/boy-game",         wall: 0, x: 45.5, y: 27, w: 15,   h: 47, xP: 34.8, yP: 38, wP: 30.5, hP: 40 },
  { song: "SHADOWS",         game: "do not disturb",      route: "/do-not-disturb",   wall: 0, x: 61.5, y: 27, w: 14.9, h: 47, xP: 63.7, yP: 38, wP: 30.5, hP: 40 },
  { song: "FEAR THE REAPER", game: "dodge the drops",     route: "/fear-the-reaper",  wall: 1, x: 28.8, y: 27, w: 14.5, h: 47, xP: 6.2,  yP: 38, wP: 29.6, hP: 40 },
  { song: "YOU TWO",         game: "slice the red flags", route: "/boyfriend-island", wall: 1, x: 45.5, y: 27, w: 13,   h: 47, xP: 36.7, yP: 38, wP: 26.6, hP: 40 },
  { song: "FOREVER",         game: "save truly",          route: "/save-truly",       wall: 1, x: 59.5, y: 27, w: 17,   h: 47, xP: 61.6, yP: 38, wP: 34.7, hP: 40 },
];

const Hotspot: React.FC<{ cab: Cab; tint: string; active: boolean; portrait: boolean; onPlay: () => void }> = ({ cab, tint, active, portrait, onPlay }) => {
  const [x, y, w, h] = portrait ? [cab.xP, cab.yP, cab.wP, cab.hP] : [cab.x, cab.y, cab.w, cab.h];
  return (
    <button onClick={onPlay} tabIndex={active ? 0 : -1} aria-label={`Play ${cab.song}`}
      className="group absolute z-20 focus:outline-none" style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}>
      <span className="absolute inset-[-2%] rounded-[12px] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100"
        style={{ boxShadow: `0 0 0 2px ${tint}, 0 0 30px 8px ${tint}`, background: `radial-gradient(ellipse at 50% 55%, ${tint}22, transparent 68%)` }} />
      <span className="pointer-events-none absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-[115%] flex-col items-center gap-1 whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100">
        <span className="rounded-full border bg-black/75 px-3 py-1 font-display text-[10px] uppercase tracking-[0.18em] text-white backdrop-blur-sm md:text-xs" style={{ borderColor: tint }}>{cab.song}</span>
        <span className="rounded-full px-2.5 py-0.5 font-display text-[9px] uppercase tracking-[0.22em]" style={{ background: tint, color: "#160a20" }}>▶ play · {cab.game}</span>
      </span>
    </button>
  );
};

const CorbinArcade: React.FC = () => {
  const navigate = useNavigate();
  const isP = useIsPortrait();
  const [mode, setMode] = useState<"overview" | "wall">("overview");
  const [view, setView] = useState<0 | 1>(0);
  const [trans, setTrans] = useState<null | 0 | 1>(null);
  const [backing, setBacking] = useState<null | 0 | 1>(null);   // reverse push-out playing
  const [launch, setLaunch] = useState<string | null>(null);
  const vidRef = useRef<HTMLVideoElement>(null);
  const backRef = useRef<HTMLVideoElement>(null);
  const busy = trans !== null || backing !== null;

  const play = (route: string) => { if (launch) return; setLaunch(route); setTimeout(() => navigate(route), 560); };

  const enterBay = (wall: 0 | 1) => {
    if (busy) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion:reduce)").matches;
    if (reduce || isP) { setView(wall); setMode("wall"); return; }   // mobile / reduced-motion: straight in (video is desktop 16:9)
    setTrans(wall);
  };
  const backToArcade = () => {
    if (busy) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion:reduce)").matches;
    if (reduce || isP) { setMode("overview"); return; }
    setBacking(view);   // play the reverse push-out, then land on the overview
  };

  useEffect(() => {
    if (trans === null) return;
    const v = vidRef.current;
    let done = false;
    const finish = () => { if (done) return; done = true; setView(trans); setMode("wall"); setTrans(null); };
    if (!v) { finish(); return; }
    v.currentTime = 0;
    const p = v.play();
    if (p && (p as Promise<void>).catch) (p as Promise<void>).catch(finish);
    v.onended = finish;
    const fb = setTimeout(finish, 5200);
    return () => { clearTimeout(fb); v.onended = null; };
  }, [trans]);

  useEffect(() => {
    if (backing === null) return;
    const v = backRef.current;
    let done = false;
    const finish = () => { if (done) return; done = true; setMode("overview"); setBacking(null); };
    if (!v) { finish(); return; }
    v.currentTime = 0;
    const p = v.play();
    if (p && (p as Promise<void>).catch) (p as Promise<void>).catch(finish);
    v.onended = finish;
    const fb = setTimeout(finish, 5200);
    return () => { clearTimeout(fb); v.onended = null; };
  }, [backing]);

  const overImg = isP ? OVERVIEW_P : OVERVIEW;
  const bleed = mode === "overview" ? overImg : (isP ? WALLS[view].imgP : WALLS[view].img);
  // stage aspect: 3:4 on portrait phones, 16:9 otherwise
  const stage = isP ? { width: "min(100vw, 75vh)", height: "min(133.34vw, 100vh)" } : { width: "min(100vw, 177.78vh)", height: "min(56.25vw, 100vh)" };

  return (
    <>
      <PageMeta
        title="Corbin Bowl Arcade — Play the Dear Joshua EP — TRULYS WORLD"
        description="Step into the Corbin Bowl arcade. Pick a bay, walk in, and tap a cabinet — every Dear Joshua song is playable."
      />
      <div className="fixed inset-0 overflow-hidden bg-[#0d0612] select-none">
        <div className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl opacity-40" style={{ backgroundImage: `url('${bleed}')` }} />

        <div className="absolute inset-0 m-auto" style={stage}>
          {/* OVERVIEW */}
          <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-500" style={{ backgroundImage: `url('${overImg}')`, opacity: mode === "overview" && !busy ? 1 : 0, pointerEvents: mode === "overview" && !busy ? "auto" : "none" }}>
            {BAYS.map((bay) => {
              const [x, y, w, h] = isP ? [bay.xP, bay.yP, bay.wP, bay.hP] : [bay.x, bay.y, bay.w, bay.h];
              return (
                <button key={bay.wall} onClick={() => enterBay(bay.wall)} aria-label={`Enter ${bay.name}`}
                  className="group absolute z-20 focus:outline-none" style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}>
                  <span className="absolute inset-0 rounded-[14px] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100"
                    style={{ boxShadow: `inset 0 0 0 2px ${bay.tint}, 0 0 40px 6px ${bay.tint}66`, background: `radial-gradient(ellipse at center, ${bay.tint}1f, transparent 70%)` }} />
                  <span className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100">
                    <span className="rounded-full border bg-black/75 px-4 py-1.5 font-display text-xs uppercase tracking-[0.2em] text-white backdrop-blur-sm md:text-sm" style={{ borderColor: bay.tint }}>{bay.name}</span>
                    <span className="rounded-full px-3 py-1 font-display text-[9px] uppercase tracking-[0.16em] md:text-[10px]" style={{ background: bay.tint, color: "#160a20" }}>▶ walk in</span>
                    <span className="font-whimsy text-[11px] text-white/85">{bay.games}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* WALL scenes */}
          {WALLS.map((w, i) => (
            <div key={w.img} className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
              style={{ backgroundImage: `url('${isP ? w.imgP : w.img}')`, opacity: mode === "wall" && view === i && trans === null ? 1 : 0, pointerEvents: mode === "wall" && view === i && !busy ? "auto" : "none" }}>
              {CABS.filter((c) => c.wall === i).map((cab) => (
                <Hotspot key={cab.route} cab={cab} tint={w.tint} portrait={isP} active={mode === "wall" && view === i && !busy} onPlay={() => play(cab.route)} />
              ))}
            </div>
          ))}

          {/* TRANSITION videos (desktop only): push-in on enter, pull-out on back */}
          <video ref={vidRef} src={trans !== null ? BAYS[trans].video : undefined} muted playsInline preload="metadata"
            className="absolute inset-0 h-full w-full object-cover" style={{ zIndex: 30, opacity: trans !== null ? 1 : 0, pointerEvents: "none" }} />
          <video ref={backRef} src={backing !== null ? BACK_VIDEO[backing] : undefined} muted playsInline preload="metadata"
            className="absolute inset-0 h-full w-full object-cover" style={{ zIndex: 30, opacity: backing !== null ? 1 : 0, pointerEvents: "none" }} />

          <div className="scanlines pointer-events-none absolute inset-0 opacity-15" style={{ zIndex: 31 }} />
        </div>

        {/* top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center px-16 pt-[max(0.9rem,env(safe-area-inset-top))]"
          style={{ background: "linear-gradient(180deg, rgba(10,4,20,0.9), transparent)" }}>
          <span className="font-display text-[9px] md:text-[11px] uppercase tracking-[0.28em] md:tracking-[0.36em] text-amber-200/90 text-center" style={{ textShadow: "0 0 12px rgba(255,207,122,0.6)" }}>
            {isP ? "the Dear Joshua arcade" : "✦ Corbin Bowl · the Dear Joshua arcade ✦"}
          </span>
          {mode === "overview" && (
            <>
              <h1 className="chrome-text-pink font-display text-2xl md:text-4xl leading-none mt-0.5 mb-0.5">PICK YOUR BAY</h1>
              <span className="font-whimsy text-pink-light/75 text-[11px]">{isP ? "tap a bay to walk in" : "pink bay ← · → teal bay · walk into a room"}</span>
            </>
          )}
        </div>

        {/* wall hint at bottom */}
        {mode === "wall" && !busy && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-3">
            <span className="rounded-full border bg-black/55 px-4 py-1.5 text-center font-whimsy text-[11px] backdrop-blur-sm" style={{ borderColor: `${WALLS[view].tint}66`, color: `${WALLS[view].tint}dd` }}>
              {WALLS[view].name} · tap a glowing cabinet
            </span>
          </div>
        )}

        <motion.div className="pointer-events-none absolute inset-0 z-50 bg-black" initial={{ opacity: 0 }} animate={{ opacity: launch ? 1 : 0 }} transition={{ duration: 0.5 }} />

        <button
          onClick={() => (mode === "wall" ? backToArcade() : navigate("/corbin-bowl/inside"))}
          style={{ top: "max(0.75rem, env(safe-area-inset-top))", left: "max(0.75rem, env(safe-area-inset-left))" }}
          className="fixed z-40 rounded-full border border-white/20 bg-black/55 px-3.5 py-1.5 font-display text-[10px] uppercase tracking-[0.15em] text-white/75 backdrop-blur-sm transition-colors hover:text-white"
        >
          {mode === "wall" ? "← arcade" : "← lobby"}
        </button>
      </div>
    </>
  );
};

export default CorbinArcade;
