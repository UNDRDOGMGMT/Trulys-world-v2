import React, { useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/PageMeta";

/**
 * Truly's Pinball — Welcome to the Map. A classic keep-it-in-play pinball
 * reskinned as the neon-noir Truly's World LA map. Self-contained in
 * public/trulys-map-pinball.html (Matter.js); mounted full-bleed in an iframe.
 * Site chrome is bypassed for this route in App.tsx (BARE_PATHS).
 */
const TrulysMapPinball: React.FC = () => {
  const [ready, setReady] = useState(false);
  return (
    <>
      <PageMeta
        title="Truly's Pinball — Welcome to the Map — TRULYS WORLD"
        description="Keep the ball alive on the Truly's World map. Light all five landmarks for the jackpot."
      />
      <div className="fixed inset-0 bg-[#1a0d22]">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-display text-sm uppercase tracking-[0.25em] text-pink-light animate-pulse glitter-glow">
              ✦ loading the map ✦
            </span>
          </div>
        )}
        <iframe
          src="/g/trulys-map-pinball.html"
          title="Truly's Pinball — Welcome to the Map"
          className={`w-full h-full border-0 block transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
          allow="autoplay"
          onLoad={() => setReady(true)}
        />
        <Link
          to="/world"
          style={{ top: "max(0.5rem, env(safe-area-inset-top))", right: "max(0.5rem, env(safe-area-inset-right))" }}
          className="fixed z-[60] font-display text-[10px] uppercase tracking-[0.15em] text-white/70 hover:text-white bg-black/55 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors"
        >
          exit ✕
        </Link>
      </div>
    </>
  );
};

export default TrulysMapPinball;
