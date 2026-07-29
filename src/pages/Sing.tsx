import React, { useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/PageMeta";

/**
 * SING — Dear Joshua karaoke. The full 6-track karaoke game (tap-sync timing,
 * mic scoring, ranks) lives self-contained in public/sing.html and fetches
 * /karaoke-config.json. Mounted full-bleed in an iframe; site chrome bypassed
 * in App.tsx (BARE_PATHS).
 */
const Sing: React.FC = () => {
  const [ready, setReady] = useState(false);
  return (
    <>
      <PageMeta
        title="SING — Dear Joshua Karaoke — TRULYS WORLD"
        description="Sing all six Dear Joshua tracks. Mic scoring, live lyrics, ranks from LURKER to DEAR JOSHUA."
      />
      <div className="fixed inset-0 bg-[#0d0b0e]">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-display text-sm uppercase tracking-[0.25em] text-pink-light animate-pulse glitter-glow">
              ✦ warming up the mic ✦
            </span>
          </div>
        )}
        <iframe
          src="/sing.html"
          title="SING — Dear Joshua Karaoke"
          className={`w-full h-full border-0 block transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
          allow="microphone; autoplay"
          onLoad={() => setReady(true)}
        />
        <Link
          to="/"
          style={{ top: "max(0.5rem, env(safe-area-inset-top))", right: "max(0.5rem, env(safe-area-inset-right))" }}
          className="fixed z-[60] font-display text-[10px] uppercase tracking-[0.15em] text-white/70 hover:text-white bg-black/55 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors"
        >
          exit ✕
        </Link>
      </div>
    </>
  );
};

export default Sing;
