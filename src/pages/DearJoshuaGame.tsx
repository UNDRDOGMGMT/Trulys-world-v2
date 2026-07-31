import React, { useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/PageMeta";

/**
 * Dear Joshua — the typewriter lyric typing game. Self-contained in
 * public/dear-joshua-game.html; mounted full-bleed in an iframe so its own
 * keyboard input / WebAudio / timing loop stay isolated from the React app.
 * Site chrome is bypassed for this route in App.tsx (BARE_PATHS).
 */
const DearJoshuaGame: React.FC = () => {
  const [ready, setReady] = useState(false);
  return (
    <>
      <PageMeta
        title="Dear Joshua — Type Her Letter — TRULYS WORLD"
        description="Type Truly Young's letter to Joshua as the song rolls. Twenty mistakes and the ribbon runs out of ink — the only way to hear it all is to type it clean."
      />
      <div className="fixed inset-0 bg-[#0a0412]">
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <span className="font-display text-sm uppercase tracking-[0.25em] text-pink-light animate-pulse glitter-glow">
              ✦ loading the ribbon ✦
            </span>
          </div>
        )}
        <iframe
          src="/g/dear-joshua-game.html"
          title="Dear Joshua — type her letter"
          className={`w-full h-full border-0 block transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
          allow="autoplay"
          onLoad={() => setReady(true)}
        />
        <Link
          to="/dear-joshua"
          style={{ top: "max(0.5rem, env(safe-area-inset-top))", right: "max(0.5rem, env(safe-area-inset-right))" }}
          className="fixed z-[60] font-display text-[10px] uppercase tracking-[0.15em] text-white/70 hover:text-white bg-black/55 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors"
        >
          exit ✕
        </Link>
      </div>
    </>
  );
};

export default DearJoshuaGame;
