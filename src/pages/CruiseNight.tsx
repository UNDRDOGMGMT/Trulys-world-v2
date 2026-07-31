import React, { useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/PageMeta";

/**
 * Cruise Night — the DTLA case file's late-night driving game.
 * The game is a self-contained canvas app in public/cruise-night.html; we mount
 * it full-bleed in an iframe so its own input/audio/rAF loop stays isolated from
 * the React app. Site chrome (starfield, persistent player) is bypassed for this
 * route in App.tsx so the game owns the whole viewport.
 */
const CruiseNight: React.FC = () => {
  const [ready, setReady] = useState(false);
  return (
    <>
      <PageMeta
        title="Cruise Night — TRULYS WORLD"
        description="Cruise Night — a driving game through Los Angeles."
      />
      <div className="fixed inset-0 bg-black">
        {/* loading state — visible until the game boots */}
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <span className="font-display text-sm uppercase tracking-[0.25em] text-pink-light animate-pulse glitter-glow">
              ✦ starting the engine ✦
            </span>
          </div>
        )}
        <iframe
          src="/g/cruise-night.html"
          title="Cruise Night — a Truly Young late-nite drive"
          className={`w-full h-full border-0 block transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
          allow="autoplay"
          onLoad={() => setReady(true)}
        />
        <Link
          to="/location/dtla"
          style={{ top: "max(0.5rem, env(safe-area-inset-top))", left: "max(0.5rem, env(safe-area-inset-left))" }}
          className="fixed z-[60] font-display text-[10px] uppercase tracking-[0.15em] text-white/70 hover:text-white bg-black/55 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors"
        >
          ← exit
        </Link>
      </div>
    </>
  );
};

export default CruiseNight;
