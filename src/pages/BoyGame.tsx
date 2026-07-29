import React, { useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/PageMeta";

/**
 * Boy — Silver Lake street verbal-assault game. Self-contained in public/boy-game.html
 * (Higgsfield art assets in /boy/*), mounted full-bleed in an iframe. Site chrome
 * bypassed for this route in App.tsx (BARE_PATHS).
 */
const BoyGame: React.FC = () => {
  const [ready, setReady] = useState(false);
  return (
    <>
      <PageMeta
        title="Boy — Turn Him Into One — TRULYS WORLD"
        description="Punch-Out at the arena. He walked in a man — dodge his swings, land combos, and shrink him down to a crying little boy while Truly's own lyrics fly at him."
      />
      <div className="fixed inset-0 bg-[#150a22]">
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <span className="font-display text-sm uppercase tracking-[0.25em] text-pink-light animate-pulse glitter-glow">
              ✦ lacing the gloves ✦
            </span>
          </div>
        )}
        <iframe
          src="/boy-game.html?v=joshua2"
          title="Boy — turn him into one"
          className={`w-full h-full border-0 block transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
          allow="autoplay"
          onLoad={() => setReady(true)}
        />
        <Link
          to="/location/silverlake"
          style={{ top: "max(0.5rem, env(safe-area-inset-top))", right: "max(0.5rem, env(safe-area-inset-right))" }}
          className="fixed z-[60] font-display text-[10px] uppercase tracking-[0.15em] text-white/70 hover:text-white bg-black/55 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors"
        >
          exit ✕
        </Link>
      </div>
    </>
  );
};

export default BoyGame;
