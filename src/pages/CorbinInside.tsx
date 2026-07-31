import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageMeta from "@/components/PageMeta";
import { useIsPortrait } from "@/hooks/useIsPortrait";

/**
 * Corbin Bowl — the interior lobby / lanes. You step in from the doors; the
 * lanes glow off to the side and a neon-lit walkway leads back to the ARCADE.
 * Higgsfield interior establishing shot. Bare route.
 */
const CorbinInside: React.FC = () => {
  const navigate = useNavigate();
  const isPortrait = useIsPortrait();
  return (
    <>
      <PageMeta
        title="Corbin Bowl — Inside — TRULYS WORLD"
        description="Inside Corbin Bowl — the Dear Joshua arcade."
      />
      <div className="fixed inset-0 overflow-hidden bg-[#150a22]">
        <motion.div
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: `url('${isPortrait ? "/corbin/interior-v.jpg" : "/corbin/interior.jpg"}')` }}
          initial={{ scale: 1.08 }} animate={{ scale: 1.14 }} transition={{ duration: 20, ease: "linear" }}
        />
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 44%, transparent 44%, rgba(8,3,16,0.72) 100%)" }} />
        <div className="scanlines pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38vh]" style={{ background: "linear-gradient(180deg, transparent, rgba(8,3,16,0.92))" }} />

        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-end pb-[6vh] px-6 text-center"
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}
        >
          <span className="font-display text-[10px] md:text-xs uppercase tracking-[0.4em] text-amber-200 mb-2.5"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.9), 0 0 14px rgba(255,207,122,0.6)" }}>
            ✦ welcome to Corbin Bowl ✦
          </span>
          <p className="font-whimsy text-cream text-sm md:text-base max-w-md mb-5 leading-relaxed" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.95)" }}>
            The lanes are glowing and the neon's humming. The whole EP is racked up in the arcade — down the walkway.
          </p>
          <button onClick={() => navigate("/corbin-bowl/arcade")} className="btn-retro shimmer-sweep !text-base md:!text-lg !px-9 !py-3.5 animate-pulse">
            ✦ ENTER THE ARCADE ✦
          </button>
        </motion.div>

        <button
          onClick={() => navigate("/corbin-bowl")}
          style={{ top: "max(0.75rem, env(safe-area-inset-top))", left: "max(0.75rem, env(safe-area-inset-left))" }}
          className="fixed z-20 font-display text-[10px] uppercase tracking-[0.15em] text-white/70 hover:text-white bg-black/50 border border-white/20 rounded-full px-3.5 py-1.5 backdrop-blur-sm transition-colors"
        >
          ← outside
        </button>
      </div>
    </>
  );
};

export default CorbinInside;
