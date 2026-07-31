import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageMeta from "@/components/PageMeta";
import Logo from "@/components/Logo";
import MarqueeStrip from "@/components/MarqueeStrip";
import Shape from "@/components/Shape";
import EPPlayer from "@/components/EPPlayer";
import PasswordGate from "@/components/PasswordGate";
import frontCover from "@/assets/dear-joshua-front.webp";
import backCover from "@/assets/dear-joshua-back.webp";

const DearJoshua: React.FC = () => {
  const navigate = useNavigate();
  const [flipped, setFlipped] = useState(false);

  return (
    <>
      <PageMeta
        title="Dear Joshua — the EP — TRULYS WORLD"
        description="Truly Young's debut EP Dear Joshua — out August 21, 2026. Shadows out now."
      />

      <motion.main
        className="relative min-h-screen bg-background grain-overlay player-safe-bottom"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.3 } }}
        transition={{ duration: 0.5 }}
      >
        <MarqueeStrip />

        <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b-2 border-pink/20 bg-card glitter-border">
          <button onClick={() => navigate("/")} aria-label="Home">
            <Logo size="md" />
          </button>
          <button onClick={() => navigate("/map")} className="btn-retro !text-[10px] !py-1 !px-3">
            ✦ Map
          </button>
        </header>

        <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
          {/* Hero */}
          <div className="text-center mb-8">
            <span className="case-label text-[10px]">✦ The EP ✦</span>
            <h1 className="chrome-text-pink font-display text-4xl md:text-6xl mt-4 leading-none">
              DEAR JOSHUA
            </h1>
            <p className="font-whimsy text-pink-light text-sm mt-3">
              The debut EP — out August 21. Shadows out now.
            </p>
          </div>

          {/* Cover — a real 3D sleeve flip between front & back */}
          <div className="flex justify-center mb-6" style={{ perspective: "1100px" }}>
            <motion.button
              onClick={() => setFlipped((f) => !f)}
              className="relative w-56 h-56 md:w-64 md:h-64"
              style={{ transformStyle: "preserve-3d" }}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.7, ease: [0.32, 0.72, 0.05, 1] }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label="Flip cover art"
            >
              {/* front face */}
              <div
                className="absolute inset-0 rounded-xl overflow-hidden border-2 border-pink/25 shadow-[0_0_30px_rgba(255,105,180,0.2)]"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                <img src={frontCover} alt="Dear Joshua front cover" className="w-full h-full object-cover" />
                <span className="absolute bottom-2 right-2 font-display text-[9px] uppercase tracking-wider text-cream bg-black/60 px-2 py-1 rounded-full">
                  Tap to flip ↻
                </span>
              </div>
              {/* back face */}
              <div
                className="absolute inset-0 rounded-xl overflow-hidden border-2 border-pink/25 shadow-[0_0_30px_rgba(255,105,180,0.2)]"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <img src={backCover} alt="Dear Joshua back cover" className="w-full h-full object-cover" />
                <span className="absolute bottom-2 right-2 font-display text-[9px] uppercase tracking-wider text-cream bg-black/60 px-2 py-1 rounded-full">
                  Back ↺
                </span>
              </div>
              <Shape name="heart" size={30} rotate={-10} opacity={0.55} float className="absolute -left-3 -top-3" />
            </motion.button>
          </div>

          {/* Dynamic audio-reactive player — held behind a password until the EP drops */}
          <PasswordGate
            storageKey="tw-player-unlock"
            lockIcon="🎧"
            title="Dear Joshua — Aug 21"
            subtitle="The player unlocks on release. Ask Truly for the password."
          >
            <EPPlayer />
          </PasswordGate>

          {/* Type-along lyric game — type her letter to Joshua */}
          <div className="mt-10 flex flex-col items-center gap-3">
            <span className="case-label text-[10px]">✦ Play the title track ✦</span>
            <button
              onClick={() => navigate("/dear-joshua-game")}
              className="btn-retro shimmer-sweep"
            >
              ✦ TYPE HER LETTER ✦
            </button>
            <span className="font-whimsy text-pink-light/70 text-xs text-center max-w-xs">
              type the lyrics as the song rolls — 32 mistakes and the ribbon runs out of ink
            </span>
          </div>

          <p className="text-center font-display text-[11px] uppercase tracking-wider text-muted-foreground mt-10">
            ✦ Dear Joshua — the EP — Aug 21, 2026 ✦
          </p>
        </div>
      </motion.main>
    </>
  );
};

export default DearJoshua;
