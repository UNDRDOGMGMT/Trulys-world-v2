import React, { useRef, useState } from "react";
import { useIsPortrait } from "@/hooks/useIsPortrait";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import CountdownTimer from "@/components/CountdownTimer";
import TrulyList from "@/components/TrulyList";
import PageMeta from "@/components/PageMeta";

// Shadows. The whole gated world counts down to this drop.
// 12:00am ET, July 31 2026 (matches the arm-gate LAUNCH + landing countdown).
const SHADOWS_RELEASE = new Date("2026-07-31T00:00:00-04:00");
// Same master the Chateau (Do Not Disturb) game + karaoke use.
const SHADOWS_SRC = "/audio/04-shadows.mp3";

const Shadows: React.FC = () => {
  const isPortrait = useIsPortrait();
  const navigate = useNavigate();
  const [notify, setNotify] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(0);
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  return (
    <>
      <PageMeta
        title="SHADOWS — TRULYS WORLD"
        description="Shadows by Truly Young — out now."
      />
      <main className="relative min-h-[100dvh] w-full overflow-hidden bg-[#0a0510] text-white grain-overlay">
        {/* full-bleed hero */}
        <div className="absolute inset-0 z-0" aria-hidden>
          <motion.img
            src={isPortrait ? "/shadows/hero-v.jpg" : "/shadows/hero.jpg"}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ scale: 1.12, opacity: 0 }}
            animate={{ scale: 1.0, opacity: 1 }}
            transition={{ duration: 2.2, ease: "easeOut" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 40%, rgba(10,5,16,0.15) 0%, rgba(10,5,16,0.6) 60%, rgba(10,5,16,0.94) 100%)",
            }}
          />
        </div>

        {/* nav */}
        <div
          className="relative z-20 flex items-center justify-between px-4 py-4 md:px-8"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <button
            onClick={() => navigate("/map")}
            className="font-display text-[11px] uppercase tracking-[0.18em] text-pink-light hover:text-white bg-black/40 border border-pink/30 rounded-full px-4 py-2 backdrop-blur-sm transition-colors"
          >
            ← the map
          </button>
        </div>

        {/* hero content */}
        <div className="relative z-10 flex flex-col items-center text-center px-5 pb-16 pt-[8vh] md:pt-[12vh]">
          <motion.p
            className="font-display text-xs md:text-sm uppercase tracking-[0.35em] text-pink-light mb-4 glitter-glow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            ✦ Out July 31 ✦
          </motion.p>

          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="pink-aura absolute -inset-x-16 -inset-y-8" aria-hidden />
            <h1
              className="relative font-display chrome-text-pink leading-none"
              style={{ fontSize: "clamp(3.5rem, 15vw, 10rem)" }}
            >
              Shadows
            </h1>
          </motion.div>

          <motion.p
            className="font-whimsy text-sm md:text-base text-pink-light/85 mt-4 max-w-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.7 }}
          >
            he's only, only, only, only, in the shadows.
          </motion.p>

          <motion.div
            className="mt-9"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.6 }}
          >
            <CountdownTimer targetDate={SHADOWS_RELEASE} label="Shadows Drops In" />
          </motion.div>

          {/* CTAs */}
          <motion.div
            className="mt-10 flex flex-col items-center gap-4 w-full max-w-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.15, duration: 0.6 }}
          >
            {!notify ? (
              <button onClick={() => setNotify(true)} className="btn-retro shimmer-sweep text-base px-10 py-3.5">
                <span>&#10047;</span> Get Release Updates <span>&#10047;</span>
              </button>
            ) : (
              <div className="w-full rounded-2xl border-2 border-pink/25 bg-black/45 backdrop-blur-sm p-4 glitter-border">
                <p className="font-display text-[10px] uppercase tracking-wider text-pink-light mb-3">
                  ♥ first to hear it
                </p>
                <TrulyList tone="dark" />
              </div>
            )}

            {/* embedded Shadows master — play a first listen right here */}
            <audio
              ref={audioRef}
              src={SHADOWS_SRC}
              preload="none"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => { setPlaying(false); setProg(0); }}
              onTimeUpdate={(e) => {
                const a = e.currentTarget;
                setProg(a.duration ? (a.currentTime / a.duration) * 100 : 0);
              }}
            />
            <div className="w-full max-w-xs flex flex-col items-center gap-2.5">
              <button
                onClick={toggle}
                className="btn-retro shimmer-sweep text-sm px-8 py-2.5 flex items-center gap-2"
                aria-label={playing ? "Pause Shadows" : "Play Shadows"}
              >
                <span className="text-base leading-none">{playing ? "❚❚" : "►"}</span>
                {playing ? "Pause" : "First Listen"}
              </button>
              <div className="w-full h-[3px] rounded-full bg-white/15 overflow-hidden">
                <div className="h-full bg-pink shadow-[0_0_8px_rgba(255,79,163,0.6)]" style={{ width: `${prog}%` }} />
              </div>
              <p className="font-whimsy text-[11px] text-white/40">Listen to Shadows</p>
            </div>
          </motion.div>
        </div>
      </main>
    </>
  );
};

export default Shadows;
