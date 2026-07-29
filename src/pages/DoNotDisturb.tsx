import React, { useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/PageMeta";

/**
 * Do Not Disturb — the West Hollywood / Chateau Marmont whack-a-mole.
 * Self-contained canvas game in public/do-not-disturb.html, mounted full-bleed
 * in an iframe. Site chrome is bypassed for this route in App.tsx.
 */
const DoNotDisturb: React.FC = () => {
  const [ready, setReady] = useState(false);
  return (
    <>
      <PageMeta
        title="Do Not Disturb — TRULYS WORLD"
        description="A night above Sunset at the Chateau Marmont. Keep the paparazzi and the bad exes out — never the cat."
      />
      <div className="fixed inset-0 bg-black">
        {/* loading state — visible until the game boots */}
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <span className="font-display text-sm uppercase tracking-[0.25em] text-pink-light animate-pulse glitter-glow">
              ✦ checking in ✦
            </span>
          </div>
        )}
        <iframe
          src="/do-not-disturb.html"
          title="Do Not Disturb — a Truly Young night at the Chateau"
          className={`w-full h-full border-0 block transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
          allow="autoplay"
          onLoad={() => setReady(true)}
        />
        <Link
          to="/location/weho"
          style={{ top: "max(0.5rem, env(safe-area-inset-top))", left: "max(0.5rem, env(safe-area-inset-left))" }}
          className="fixed z-[60] font-display text-[10px] uppercase tracking-[0.15em] text-white/70 hover:text-white bg-black/55 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors"
        >
          ← exit
        </Link>
      </div>
    </>
  );
};

export default DoNotDisturb;
