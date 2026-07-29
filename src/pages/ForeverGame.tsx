import React, { useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/PageMeta";

/**
 * Forever — Hollywood's Two Truths and a Lie quiz. Self-contained in
 * public/forever-game.html, mounted full-bleed in an iframe. Site chrome
 * bypassed for this route in App.tsx (BARE_PATHS).
 */
const ForeverGame: React.FC = () => {
  const [ready, setReady] = useState(false);
  return (
    <>
      <PageMeta
        title="Forever — Two Truths & a Lie — TRULYS WORLD"
        description="Ten rounds down Sunset. Three statements about Truly, one is a lie — spot it. Forever plays you through. How well do you know her?"
      />
      <div className="fixed inset-0 bg-[#150a22]">
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <span className="font-display text-sm uppercase tracking-[0.25em] text-pink-light animate-pulse glitter-glow">
              ✦ rolling out the carpet ✦
            </span>
          </div>
        )}
        <iframe
          src="/forever-game.html"
          title="Forever — two truths and a lie"
          className={`w-full h-full border-0 block transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
          allow="autoplay"
          onLoad={() => setReady(true)}
        />
        <Link
          to="/location/hollywood"
          style={{ top: "max(0.5rem, env(safe-area-inset-top))", right: "max(0.5rem, env(safe-area-inset-right))" }}
          className="fixed z-[60] font-display text-[10px] uppercase tracking-[0.15em] text-white/70 hover:text-white bg-black/55 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors"
        >
          exit ✕
        </Link>
      </div>
    </>
  );
};

export default ForeverGame;
