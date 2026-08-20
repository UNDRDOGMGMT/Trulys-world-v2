import React, { useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/PageMeta";

/**
 * THE MOUSETRAP — the back-alley attraction at TRULYLAND. Trulyland's
 * unlicensed mascot has been tagging the castle; you build a Rube Goldberg
 * trap out of the junk in the alley and drop a birdcage on him.
 *
 * Self-contained in public/g/mousetrap.html (matter-js physics, canvas render),
 * mounted full-bleed in an iframe. Site chrome bypassed for this route in
 * App.tsx (BARE_PATHS). Assets live in public/mousetrap/.
 */
const Mousetrap: React.FC = () => {
  const [ready, setReady] = useState(false);
  return (
    <>
      <PageMeta
        title="THE MOUSETRAP — TRULYLAND — TRULYS WORLD"
        description="There's a bootleg mouse loose in Trulyland. Build the trap out of what's in the alley, crank it, and drop the cage on him. Nine acts."
        path="/mousetrap"
      />
      <div className="fixed inset-0 bg-[#0c000f]">
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <span className="font-display text-sm uppercase tracking-[0.25em] text-pink-light animate-pulse glitter-glow">
              ✦ setting the trap ✦
            </span>
          </div>
        )}
        <iframe
          src="/g/mousetrap.html"
          title="The Mousetrap — build the trap, drop the cage"
          className={`w-full h-full border-0 block transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
          allow="autoplay"
          onLoad={() => setReady(true)}
        />
        <Link
          to="/trulyland"
          style={{ top: "max(0.5rem, env(safe-area-inset-top))", right: "max(0.5rem, env(safe-area-inset-right))" }}
          className="fixed z-[60] font-display text-[10px] uppercase tracking-[0.15em] text-white/70 hover:text-white bg-black/55 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors"
        >
          exit ✕
        </Link>
      </div>
    </>
  );
};

export default Mousetrap;
