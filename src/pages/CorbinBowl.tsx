import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageMeta from "@/components/PageMeta";
import { useIsPortrait } from "@/hooks/useIsPortrait";

/**
 * Corbin Bowl — the EP-preview arcade venue, entered from the Valley (it's on
 * Ventura Blvd). This is the EXTERIOR / entry (phase 1): a full-bleed neon-noir
 * establishing shot of the redesigned Corbin Bowl, with an ENTER that will lead
 * inside to the lanes and the arcade cabinets. Bare route (own chrome).
 */
const CorbinBowl: React.FC = () => {
  const navigate = useNavigate();
  const isPortrait = useIsPortrait();
  const [entering, setEntering] = useState(false);

  const enter = () => {
    if (entering) return;
    setEntering(true);
    // the doors open, then we step inside (interior — next)
    setTimeout(() => navigate("/corbin-bowl/inside"), 1150);
  };

  return (
    <>
      <PageMeta
        title="Corbin Bowl — The Dear Joshua Arcade — TRULYS WORLD"
        description="Corbin Bowl — every Dear Joshua track as a playable arcade game."
      />
      <div className="fixed inset-0 overflow-hidden bg-[#1a0a24]">
        {/* establishing shot — slow neon drift, brightening as you step in */}
        <motion.div
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: `url('${isPortrait ? "/corbin/exterior-v.jpg" : "/corbin/exterior.jpg"}')` }}
          initial={{ scale: 1.06 }}
          animate={entering ? { scale: 1.4, filter: "brightness(1.5)" } : { scale: 1.12 }}
          transition={entering ? { duration: 1.15, ease: [0.5, 0, 0.75, 0] } : { duration: 18, ease: "linear" }}
        />
        {/* neon flicker + vignette */}
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 42%, transparent 46%, rgba(8,3,16,0.72) 100%)" }} />
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 30% 26%, rgba(255,79,163,0.14), transparent 42%)" }}
          animate={{ opacity: [0.7, 1, 0.55, 0.9, 0.7] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />
        {/* bottom scrim so the tagline + button read over the wet street */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[36vh]" style={{ background: "linear-gradient(180deg, transparent, rgba(8,3,16,0.9))" }} />

        {/* doors-opening flash on enter */}
        <motion.div
          className="pointer-events-none absolute inset-0 bg-[#ffd9a8]"
          initial={{ opacity: 0 }}
          animate={{ opacity: entering ? [0, 0, 0.85] : 0 }}
          transition={{ duration: 1.15, times: [0, 0.7, 1] }}
        />

        {/* content */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-end pb-[5vh] px-6 text-center"
          animate={{ opacity: entering ? 0 : 1 }}
          transition={{ duration: 0.5 }}
        >
          <span className="font-display text-[10px] md:text-xs uppercase tracking-[0.42em] text-amber-200 mb-2.5"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.9), 0 0 14px rgba(255,207,122,0.6)" }}>
            ✦ Ventura Blvd · the Dear Joshua arcade ✦
          </span>
          <p className="font-whimsy text-cream text-sm md:text-base max-w-md mb-5 leading-relaxed"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.95)" }}>
            Six songs. Six machines. The whole EP is inside, one cabinet at a time — push the doors open.
          </p>
          <button
            onClick={enter}
            className="btn-retro shimmer-sweep !text-base md:!text-lg !px-9 !py-3.5 animate-pulse"
          >
            ✦ STEP INSIDE ✦
          </button>
        </motion.div>

        {/* back to the Valley */}
        <button
          onClick={() => navigate("/location/the-valley")}
          style={{ top: "max(0.75rem, env(safe-area-inset-top))", left: "max(0.75rem, env(safe-area-inset-left))" }}
          className="fixed z-20 font-display text-[10px] uppercase tracking-[0.15em] text-white/70 hover:text-white bg-black/50 border border-white/20 rounded-full px-3.5 py-1.5 backdrop-blur-sm transition-colors"
        >
          ← the valley
        </button>
      </div>
    </>
  );
};

export default CorbinBowl;
