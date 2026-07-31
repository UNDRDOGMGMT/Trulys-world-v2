import React, { useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/PageMeta";

/**
 * Fear The Reaper — Silver Lake's Donkey-Kong-style dodge game. Self-contained
 * canvas app in public/fear-the-reaper.html, mounted full-bleed in an iframe so
 * its own input / WebAudio / rAF loop stay isolated. Site chrome bypassed for
 * this route in App.tsx (BARE_PATHS).
 */
const FearTheReaper: React.FC = () => {
  const [ready, setReady] = useState(false);
  return (
    <>
      <PageMeta
        title="Fear The Reaper — Dodge Her — TRULYS WORLD"
        description="The Reaper drops everything he's got on the beat from the Silver Lake stairs. Weave left and right, dodge close for bonus, survive the whole song."
      />
      <div className="fixed inset-0 bg-[#0a0412]">
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <span className="font-display text-sm uppercase tracking-[0.25em] text-pink-light animate-pulse glitter-glow">
              ✦ he's sharpening the scythe ✦
            </span>
          </div>
        )}
        <iframe
          src="/g/fear-the-reaper.html"
          title="Fear The Reaper — dodge her"
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

export default FearTheReaper;
