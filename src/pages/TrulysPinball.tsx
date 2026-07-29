import React, { useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/PageMeta";

/**
 * Truly's Pinball — Dear Joshua Edition. Self-contained in
 * public/trulys-pinball.html; mounted full-bleed in an iframe so its fixed-step
 * physics loop, multi-touch handling and WebAudio stay isolated from React.
 * Site chrome is bypassed for this route in App.tsx (BARE_PATHS).
 */
const TrulysPinball: React.FC = () => {
  const [ready, setReady] = useState(false);
  return (
    <>
      <PageMeta
        title="Truly's Pinball — Dear Joshua Edition — TRULYS WORLD"
        description="Six songs, six table features. Play the whole EP out on a fantasy-goth pinball table and mail the letter."
      />
      <div className="fixed inset-0 bg-[#14120F]">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-display text-sm uppercase tracking-[0.25em] text-pink-light animate-pulse glitter-glow">
              ✦ racking the table ✦
            </span>
          </div>
        )}
        <iframe
          src="/trulys-pinball.html"
          title="Truly's Pinball — Dear Joshua Edition"
          className={`w-full h-full border-0 block transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
          allow="autoplay"
          onLoad={() => setReady(true)}
        />
        <Link
          to="/location/lax"
          style={{ top: "max(0.5rem, env(safe-area-inset-top))", right: "max(0.5rem, env(safe-area-inset-right))" }}
          className="fixed z-[60] font-display text-[10px] uppercase tracking-[0.15em] text-white/70 hover:text-white bg-black/55 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors"
        >
          exit ✕
        </Link>
      </div>
    </>
  );
};

export default TrulysPinball;
