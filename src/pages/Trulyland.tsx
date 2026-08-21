import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageMeta from "@/components/PageMeta";
import { useIsPortrait } from "@/hooks/useIsPortrait";
import { shouldReduceMedia } from "@/lib/network";

/**
 * TRULYLAND — Truly's version of Disneyland, entered from the Disneyland pin in
 * the bottom-right of the map. The travel clip pushes you through the gate, so
 * this page opens mid-arch (scaled in, pink glare) and pulls back to the
 * straight-on POV of the castle: black and hot pink, held together by safety
 * pins. Phase 1 = the front-of-castle environment + the park directory.
 * Bare route (owns its own chrome).
 */

interface Attraction {
  name: string;
  sub: string;
  to?: string;   // already open elsewhere in the world
}
const ATTRACTIONS: Attraction[] = [
  { name: "Main St. of Broken Hearts", sub: "the parade route" },
  { name: "The Arcade", sub: "Corbin Bowl · the EP, one cabinet at a time", to: "/corbin-bowl/arcade" },
  { name: "The Picture Palace", sub: "the Vista · videos on the big screen", to: "/vista" },
  { name: "The Gift Shop", sub: "the boutique · merch", to: "/boutique" },
  { name: "The Mousetrap", sub: "there's a bootleg mouse loose in the park", to: "/mousetrap" },
  { name: "Heartbreak Mountain", sub: "the drop" },
  { name: "The Ex-Mansion", sub: "999 happy haunts, all of them boys", to: "/trulyland/ex-mansion" },
];

/**
 * Three beats, in order: you arrive above the park (bird's-eye), you drop in
 * (the descent clip), and you land in front of the castle, where the directory
 * takes you to everything else.
 */
type Stage = "aerial" | "diving" | "castle";

const Trulyland: React.FC = () => {
  const navigate = useNavigate();
  const isPortrait = useIsPortrait();
  const [stage, setStage] = useState<Stage>("aerial");
  const [open, setOpen] = useState(false);       // park directory
  const [ambient, setAmbient] = useState(false); // the living plate has decoded
  const diveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The still is always painted; the ambient loop (flags, neon flicker, glitter,
  // fog) fades in over it once it can play. Reduced motion / Save-Data keeps the
  // still and never fetches the loop.
  const still = isPortrait ? "/park/castle-v.jpg" : "/park/castle.jpg";
  const loop = isPortrait ? "/park/castle-loop-v.mp4" : "/park/castle-loop.mp4";
  const aerial = isPortrait ? "/park/aerial-v.jpg" : "/park/aerial.jpg";
  const motionOK = useMemo(
    () => !shouldReduceMedia() && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // Drop out of the sky onto the castle. Without the clip (reduced motion,
  // Save-Data) you just land.
  const dive = useCallback(() => {
    if (stage !== "aerial") return;
    if (!motionOK) { setStage("castle"); return; }
    setStage("diving");
    diveTimer.current = setTimeout(() => setStage("castle"), 7000);   // fallback if the clip stalls
  }, [stage, motionOK]);
  const land = useCallback(() => {
    if (diveTimer.current) { clearTimeout(diveTimer.current); diveTimer.current = null; }
    setStage("castle");
  }, []);
  useEffect(() => () => { if (diveTimer.current) clearTimeout(diveTimer.current); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && stage === "diving") land(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, land]);

  return (
    <>
      <PageMeta
        title="TRULYLAND — the park that's held together with safety pins — TRULYS WORLD"
        description="Truly's version of Disneyland. Black and pink, safety-pinned, open all night."
        path="/trulyland"
      />
      <div className="fixed inset-0 overflow-hidden bg-[#12000f]">
        {/* ── BEAT 1 — the park from above ── */}
        <AnimatePresence>
          {stage === "aerial" && (
            <motion.button
              key="aerial"
              onClick={dive}
              className="absolute inset-0 z-20 cursor-pointer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              aria-label="Zoom in on Trulyland"
            >
              <motion.div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${aerial}')` }}
                initial={{ scale: 1.02 }}
                animate={{ scale: 1.09 }}
                transition={{ duration: 26, ease: "linear" }}
              />
              <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 46%, transparent 44%, rgba(12,0,15,0.8) 100%)" }} />
              <div className="scanlines pointer-events-none absolute inset-0 opacity-25" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34vh]" style={{ background: "linear-gradient(180deg, transparent, rgba(12,0,15,0.92))" }} />

              <motion.div
                className="absolute inset-0 flex flex-col items-center justify-end px-6 pb-[7vh] text-center"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              >
                <span
                  className="mb-2 font-display text-[10px] uppercase tracking-[0.42em] text-pink-light md:text-xs"
                  style={{ textShadow: "0 2px 10px rgba(0,0,0,0.9), 0 0 16px rgba(255,79,163,0.75)" }}
                >
                  ✦ now approaching ✦
                </span>
                <h1 className="chrome-text-pink font-display text-4xl leading-none md:text-6xl" style={{ textShadow: "0 0 26px rgba(255,79,163,0.55)" }}>
                  TRULYLAND
                </h1>
                <p className="mb-5 mt-3 max-w-md font-whimsy text-sm leading-relaxed text-cream md:text-base" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.95)" }}>
                  The whole park, lit up and running all night. Drop in on the castle.
                </p>
                <span className="btn-retro shimmer-sweep !px-9 !py-3.5 !text-base md:!text-lg">✦ ZOOM IN ✦</span>
              </motion.div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── BEAT 2 — the drop ── */}
        <AnimatePresence>
          {stage === "diving" && (
            <motion.div
              key="dive"
              className="absolute inset-0 z-30 flex items-center justify-center bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <video
                src="/park/aerial-dive.mp4"
                poster={aerial}
                autoPlay muted playsInline preload="auto"
                onEnded={land}
                className="h-full w-full object-cover [@media(orientation:portrait)]:object-contain"
              />
              <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 220px rgba(0,0,0,0.75)" }} />
              <motion.div className="pointer-events-none absolute inset-x-0 top-0 bg-black" initial={{ height: 0 }} animate={{ height: "7vh" }} exit={{ height: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
              <motion.div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black" initial={{ height: 0 }} animate={{ height: "7vh" }} exit={{ height: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
              <button
                onClick={land}
                style={{ top: "max(1rem, calc(env(safe-area-inset-top) + 0.5rem))", right: "max(1rem, env(safe-area-inset-right))" }}
                className="absolute z-10 rounded-full border border-white/25 bg-black/55 px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.15em] text-cream/85 backdrop-blur-sm transition-colors hover:text-white"
              >
                Skip ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── BEAT 3 — on the ground, in front of the castle ── */}
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.18, filter: "brightness(1.35)" }}
          animate={{ scale: 1.06, filter: "brightness(1)" }}
          transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${still}')` }} />
          {motionOK && (
            <motion.video
              key={loop}
              src={loop}
              poster={still}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              onCanPlay={() => setAmbient(true)}
              className="absolute inset-0 h-full w-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: ambient ? 1 : 0 }}
              transition={{ duration: 1.1 }}
              aria-hidden
            />
          )}
        </motion.div>

        {/* stepping-through-the-gate glare, burning off on arrival */}
        <motion.div
          className="pointer-events-none absolute inset-0 bg-[#ff8ed0]"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />

        {/* neon breathing off the castle + vignette */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 62%, rgba(255,79,163,0.20), transparent 46%)" }}
          animate={{ opacity: [0.65, 1, 0.7, 0.95, 0.65] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 42%, rgba(12,0,15,0.78) 100%)" }}
        />
        <div className="scanlines pointer-events-none absolute inset-0 opacity-30" />

        {/* drifting glitter */}
        {[
          { x: 14, d: 0, dur: 11 }, { x: 29, d: 3.2, dur: 13 }, { x: 44, d: 1.4, dur: 10 },
          { x: 58, d: 5.1, dur: 12.5 }, { x: 72, d: 2.3, dur: 11.5 }, { x: 88, d: 4.4, dur: 14 },
        ].map((s, i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute select-none text-pink-light/70"
            style={{ left: `${s.x}%`, bottom: "-6%", fontSize: i % 2 ? "13px" : "18px" }}
            animate={{ y: ["0vh", "-108vh"], opacity: [0, 0.9, 0], rotate: [0, 160] }}
            transition={{ duration: s.dur, delay: s.d, repeat: Infinity, ease: "linear" }}
            aria-hidden
          >
            {i % 3 === 0 ? "♥" : i % 3 === 1 ? "✦" : "✧"}
          </motion.span>
        ))}

        {/* bottom scrim so the marquee reads over the wet plaza */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[42vh]"
          style={{ background: "linear-gradient(180deg, transparent, rgba(12,0,15,0.92))" }}
        />

        {/* ── the marquee ── */}
        <AnimatePresence>
          {!open && stage === "castle" && (
            <motion.div
              key="marquee"
              className="absolute inset-0 flex flex-col items-center justify-end px-6 pb-[6vh] text-center"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ delay: 1.1, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="mb-2 font-display text-[10px] uppercase tracking-[0.42em] text-pink-light md:text-xs"
                style={{ textShadow: "0 2px 10px rgba(0,0,0,0.9), 0 0 16px rgba(255,79,163,0.75)" }}
              >
                ✦ the happiest place she ever ruined ✦
              </span>
              <h1
                className="chrome-text-pink font-display text-4xl leading-none md:text-6xl"
                style={{ textShadow: "0 0 26px rgba(255,79,163,0.55)" }}
              >
                TRULYLAND
              </h1>
              <p
                className="mb-5 mt-3 max-w-md font-whimsy text-sm leading-relaxed text-cream md:text-base"
                style={{ textShadow: "0 2px 8px rgba(0,0,0,0.95)" }}
              >
                Black castle, pink neon, safety pins holding the whole thing together.
                It stays open all night — nobody checks your ticket.
              </p>
              <button onClick={() => setOpen(true)} className="btn-retro shimmer-sweep !px-9 !py-3.5 !text-base md:!text-lg">
                ✦ ENTER THE PARK ✦
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── the park directory ── */}
        <AnimatePresence>
          {open && stage === "castle" && (
            <motion.div
              key="directory"
              className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto px-5 py-[8vh]"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="w-full max-w-2xl rounded-2xl border border-pink-light/35 bg-black/70 p-5 backdrop-blur-md md:p-7">
                <div className="mb-5 text-center">
                  <span
                    className="font-display text-[10px] uppercase tracking-[0.4em] text-pink-light"
                    style={{ textShadow: "0 0 14px rgba(255,79,163,0.8)" }}
                  >
                    ✦ park directory ✦
                  </span>
                </div>
                <ul className="grid gap-2.5 sm:grid-cols-2">
                  {ATTRACTIONS.map((a) => {
                    const live = Boolean(a.to);
                    return (
                      <li key={a.name}>
                        <button
                          onClick={() => a.to && navigate(a.to)}
                          disabled={!live}
                          className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                            live
                              ? "cursor-pointer border-pink-light/45 bg-pink-light/[0.07] hover:bg-pink-light/[0.16]"
                              : "cursor-default border-white/10 bg-white/[0.03]"
                          }`}
                        >
                          <span
                            className={`block font-display text-sm uppercase tracking-[0.12em] md:text-base ${live ? "text-[#ffe3f1]" : "text-white/45"}`}
                            style={live ? { textShadow: "0 0 10px rgba(255,79,163,0.55)" } : undefined}
                          >
                            {a.name}
                          </span>
                          <span className={`mt-0.5 block font-whimsy text-[11px] md:text-xs ${live ? "text-cream/80" : "text-white/35"}`}>
                            {a.sub}
                          </span>
                          <span
                            className={`mt-1.5 inline-block font-display text-[9px] uppercase tracking-[0.24em] ${live ? "text-pink-light" : "text-white/30"}`}
                          >
                            {live ? "open now →" : "opening soon"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-5 text-center">
                  <button
                    onClick={() => setOpen(false)}
                    className="font-display text-[10px] uppercase tracking-[0.2em] text-white/60 transition-colors hover:text-white"
                  >
                    ← back to the gates
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* back to the map */}
        <button
          onClick={() => (stage === "castle" ? setStage("aerial") : navigate("/map"))}
          style={{ top: "max(0.75rem, env(safe-area-inset-top))", left: "max(0.75rem, env(safe-area-inset-left))" }}
          className="fixed z-20 rounded-full border border-white/20 bg-black/50 px-3.5 py-1.5 font-display text-[10px] uppercase tracking-[0.15em] text-white/70 backdrop-blur-sm transition-colors hover:text-white"
        >
          {stage === "castle" ? "↑ the whole park" : "← the map"}
        </button>
      </div>
    </>
  );
};

export default Trulyland;
