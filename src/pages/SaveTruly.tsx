import React, { useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/PageMeta";

/**
 * Save Truly — Hollywood's Donkey-Kong climb. Her ex Josh has her up on the
 * marquee scaffold and throws his whole personality down at you. Self-contained
 * in public/save-truly.html, mounted full-bleed in an iframe. Site chrome
 * bypassed for this route in App.tsx (BARE_PATHS).
 */
const SaveTruly: React.FC = () => {
  const [ready, setReady] = useState(false);
  return (
    <>
      <PageMeta
        title="Save Truly — TRULYS WORLD"
        description="Her ex Josh dragged her up the Hollywood Blvd scaffold. Climb the girders, jump the red flags, grab the heart record and get her down."
      />
      <div className="fixed inset-0 bg-[#08040f]">
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <span className="font-display text-sm uppercase tracking-[0.25em] text-pink-light animate-pulse glitter-glow">
              ✦ raising the scaffold ✦
            </span>
          </div>
        )}
        <iframe
          src="/save-truly.html"
          title="Save Truly — climb the scaffold"
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

export default SaveTruly;
