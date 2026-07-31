import React, { useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/PageMeta";

/**
 * Boyfriend Island — the Fruit-Ninja red-flag slicer for "You Two Deserve Each
 * Other." Self-contained canvas game in public/boyfriend-island.html (Higgsfield
 * island backdrop in /island/*), mounted full-bleed in an iframe. Reached from the
 * little island moored off the south pole of the /world globe. BARE_PATHS route.
 */
const BoyfriendIsland: React.FC = () => {
  const [ready, setReady] = useState(false);
  return (
    <>
      <PageMeta
        title="Boyfriend Island — Slice the Red Flags — TRULYS WORLD"
        description="They keep tossing them up — BBLs, 'u up?' texts, gym selfies. Swipe to slice every red flag and spare the green ones, to 'You Two Deserve Each Other.'"
      />
      <div className="fixed inset-0 bg-[#150a22]">
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <span className="font-display text-sm uppercase tracking-[0.25em] text-pink-light animate-pulse glitter-glow">
              ✦ sharpening the read ✦
            </span>
          </div>
        )}
        <iframe
          src="/g/boyfriend-island.html"
          title="Boyfriend Island — slice the red flags"
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

export default BoyfriendIsland;
