import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { locations } from "@/data/locations";
import { trackEvent } from "@/lib/analytics";
import { shouldReduceMedia } from "@/lib/network";
import { resolveVideoSrc } from "@/lib/videoSrc";
import { useHlsVideo } from "@/hooks/useHlsVideo";

/**
 * Cinematic "travel" between the map and a neighborhood — mirrors the production
 * site: clicking a city plays a full-screen {key}-wide push-in (HLS with MP4
 * fallback), then drops you into the neighborhood. Escape / SKIP / a 7.2s
 * fallback all complete it.
 */
interface TravelCtx {
  travelTo: (id: string) => void;
}
const Ctx = createContext<TravelCtx | null>(null);
export const useTravel = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTravel must be inside TravelProvider");
  return c;
};

// v2 hood id → travel-clip asset key (Hollywood's art is prefixed "hw").
// This is the *complete* set of hoods with a pulled {key}-wide.mp4 — an id that
// isn't here has no clip, so travelTo skips straight to the city rather than
// staging a 7.2s black screen waiting for a 404 to fire onEnded.
export const ASSET_KEY: Record<string, string> = {
  dtla: "dtla",
  silverlake: "silverlake",
  hollywood: "hw",
  weho: "weho",
  lax: "lax",
  "laurel-canyon": "lc",
  "santa-monica": "sm",
  venice: "ven",
  "beverly-hills": "bh",
  koreatown: "ktown",
  "the-valley": "val",
  malibu: "malibu",
  inglewood: "ing",
  "long-beach": "lb",
};

export const TravelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [clip, setClip] = useState<{ mp4: string; poster: string; name: string } | null>(null);
  const targetRef = useRef<string | null>(null);
  const doneRef = useRef(true);
  const fbRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vidRef = useRef<HTMLVideoElement | null>(null);

  const resolved = clip ? resolveVideoSrc(clip.mp4) : null;
  useHlsVideo(vidRef, resolved?.src ?? null, resolved?.fallback ?? null);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (fbRef.current) { clearTimeout(fbRef.current); fbRef.current = null; }
    const t = targetRef.current;
    if (t) navigate(`/location/${t}`); // city mounts under the overlay…
    setClip(null);                     // …then the overlay fades out (AnimatePresence exit)
  }, [navigate]);

  const travelTo = useCallback((id: string) => {
    const key = ASSET_KEY[id];
    trackEvent("travel", { location: id });
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // no clip, reduced motion, or Save-Data / slow network → go straight in
    if (!key || reduce || shouldReduceMedia()) { navigate(`/location/${id}`); return; }
    targetRef.current = id;
    doneRef.current = false;
    const name = locations.find((l) => l.id === id)?.name ?? id;
    setClip({ mp4: `/world/anim/${key}-wide.mp4`, poster: `/world/anim/${key}-wide-poster.jpg`, name });
    fbRef.current = setTimeout(finish, 7200);
  }, [navigate, finish]);

  // Escape to skip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && clip) finish(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clip, finish]);

  return (
    <Ctx.Provider value={{ travelTo }}>
      {children}
      <AnimatePresence>
        {clip && (
          <motion.div
            key="travel"
            className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <video
              ref={vidRef}
              poster={clip.poster}
              muted
              playsInline
              preload="auto"
              onEnded={finish}
              /* portrait phones: contain so the 16:9 push-in is fully framed (letterboxed)
                 instead of cropping ~70% of the width; desktop keeps the immersive cover */
              className="w-full h-full object-cover [@media(orientation:portrait)]:object-contain"
            />
            {/* cinematic edge darkening */}
            <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 220px rgba(0,0,0,0.75)" }} />

            {/* letterbox bars — slide in to frame the shot */}
            <motion.div
              className="absolute top-0 inset-x-0 bg-black pointer-events-none"
              initial={{ height: 0 }}
              animate={{ height: "7vh" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              aria-hidden
            />
            <motion.div
              className="absolute bottom-0 inset-x-0 bg-black pointer-events-none"
              initial={{ height: 0 }}
              animate={{ height: "7vh" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              aria-hidden
            />

            {/* now-entering title card */}
            <motion.div
              className="absolute inset-x-0 bottom-[11vh] flex flex-col items-center text-center pointer-events-none px-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.55, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="font-display text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-pink-light/90"
                style={{ textShadow: "0 0 10px rgba(255,79,163,0.7), 0 1px 3px rgba(0,0,0,0.9)" }}
              >
                ✦ now entering ✦
              </span>
              <span className="chrome-text-pink font-display text-3xl md:text-5xl mt-1.5 leading-none">
                {clip.name}
              </span>
            </motion.div>

            <button
              onClick={finish}
              style={{
                top: "max(1rem, calc(env(safe-area-inset-top) + 0.5rem))",
                right: "max(1rem, env(safe-area-inset-right))",
              }}
              className="absolute z-10 font-display text-[11px] uppercase tracking-[0.15em] text-cream/85 hover:text-white bg-black/55 border border-white/25 rounded-full px-4 py-1.5 backdrop-blur-sm transition-colors"
            >
              Skip ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
};
