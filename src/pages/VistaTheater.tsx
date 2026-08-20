import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageMeta from "@/components/PageMeta";
import { useIsPortrait } from "@/hooks/useIsPortrait";

/**
 * The Vista Theatre — a cinematic walk-in built from real footage. Three
 * forward-dolly clips (Higgsfield image-to-video, each a wide→tight push of the
 * SAME scene so the camera truly travels without morphing): street push-in,
 * lobby glide, auditorium approach. Fade-to-black between the room changes; the
 * last clip ends exactly on the auditorium still where the music video lives.
 * Reached from Hollywood → The Vista.
 *
 * To go live, set VIDEO_ID to Truly's YouTube video id. Empty = "coming soon".
 */
const VIDEO_ID = "590TcADz1us";

// Walk-in clips, in order. (No in-theater push-in — we cut straight from the
// lobby to the seated view with the screen.)
const CLIPS = [
  "/world/theater/vista-walk-1.mp4", // street push-in
  "/world/theater/vista-walk-2.mp4", // lobby glide
];
// Destination still — the seated auditorium with the curtains open around the screen.
const AUDITORIUM = "/world/theater/vista-auditorium.jpg";
const AUDITORIUM_V = "/world/theater/vista-auditorium-v.jpg"; // 9:16 extension for phones

// Native pixel size of the auditorium still — the seated stage locks to this aspect
// so the screen overlay stays put on the art at any window size.
const AUD_W = 2752;
const AUD_H = 1536;
// The blank black screen rectangle inside the art (measured — perfectly centered),
// as % of the frame. The iframe fills this and sits cleanly inside the curtains.
const SCREEN = { leftPct: 31.2, topPct: 32.0, widthPct: 37.6, heightPct: 38.6 };

const VistaTheater: React.FC = () => {
  const isPortrait = useIsPortrait();
  const navigate = useNavigate();
  // phase 0..CLIPS.length-1 = playing that clip; phase === CLIPS.length = seated
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fading, setFading] = useState(false); // dip-to-black between room changes
  const vids = useRef<(HTMLVideoElement | null)[]>([]);

  const seated = phase >= CLIPS.length;

  // drive playback: play the active clip, pause the rest
  useEffect(() => {
    vids.current.forEach((v, i) => {
      if (!v) return;
      if (i === phase) { v.currentTime = 0; v.play().catch(() => {}); }
      else v.pause();
    });
  }, [phase]);

  // close the full-screen player on Escape
  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPlaying(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  // advance through a short black dip (a dark doorway) so room changes never cut hard
  const goTo = useCallback((next: number) => {
    setFading(true);
    window.setTimeout(() => { setPhase(next); setFading(false); }, 420);
  }, []);

  // when a clip ends, dip to black into the next room (or into the seated still)
  const onClipEnd = useCallback((i: number) => {
    if (i === phase) goTo(i + 1);
  }, [phase, goTo]);

  const skip = useCallback(() => goTo(CLIPS.length), [goTo]);

  return (
    <>
      <PageMeta title="The Vista — TRULYS WORLD" description="Inside the Vista Theatre. The music video, on the big screen." />
      <main className="fixed inset-0 overflow-hidden bg-black text-white select-none">
        {/* WALK-IN CLIPS — stacked; the active one is visible + playing */}
        {CLIPS.map((src, i) => (
          <video
            key={src}
            ref={(el) => { vids.current[i] = el; }}
            src={src}
            muted
            playsInline
            preload="auto"
            onEnded={() => onClipEnd(i)}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: !seated && phase === i ? 1 : 0, zIndex: !seated && phase === i ? 1 : 0 }}
          />
        ))}

        {/* forward-motion vignette over the footage */}
        {!seated && (
          <div className="pointer-events-none absolute inset-0 z-[2]"
               style={{ boxShadow: "inset 0 0 180px 40px rgba(0,0,0,0.55)" }} />
        )}

        {/* SEATED — auditorium still (the clip's final frame) with the video screen.
            The still is locked to its own aspect ratio (letterboxed) so the screen
            overlay always lands exactly on the art's screen at any window size, and
            the screen rect stays true 16:9 so the player fills it with no crop. */}
        <AnimatePresence>
          {seated && (
            <motion.div
              className="absolute inset-0 z-[3] flex items-center justify-center bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div
                className="relative"
                style={{
                  width: `min(100vw, calc(100dvh * ${AUD_W} / ${AUD_H}))`,
                  height: `min(100dvh, calc(100vw * ${AUD_H} / ${AUD_W}))`,
                }}
              >
                <img src={isPortrait ? AUDITORIUM_V : AUDITORIUM} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
                <div className="pointer-events-none absolute inset-0"
                     style={{ boxShadow: "inset 0 0 140px 30px rgba(0,0,0,0.5)" }} />

                {/* house-lights dim when the film rolls (screen sits above at z-20) */}
                {playing && <div className="pointer-events-none absolute inset-0 z-10 bg-black/55" />}

                {/* THEATER SCREEN — the video fitted to the auditorium's blank screen */}
                <motion.div
                  data-screen
                  className="absolute z-20 overflow-hidden bg-black"
                  style={{
                    left: `${SCREEN.leftPct}%`, top: `${SCREEN.topPct}%`,
                    width: `${SCREEN.widthPct}%`, height: `${SCREEN.heightPct}%`,
                    boxShadow: playing ? "0 0 60px 14px rgba(255,79,163,0.4)" : "none",
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.7 }}
                >
                  {!VIDEO_ID ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                      <span className="font-display text-[clamp(9px,1.1vw,14px)] uppercase tracking-[0.24em] text-pink-light/85">Music Video</span>
                      <span className="font-whimsy text-[clamp(10px,1.5vw,17px)] text-pink-light/55">coming soon ♥</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setPlaying(true)}
                      className="group absolute inset-0 flex flex-col items-center justify-center gap-2"
                      aria-label="Play the music video"
                    >
                      <span className="flex h-[22%] min-h-[36px] aspect-square items-center justify-center rounded-full border-2 border-pink/70 bg-black/40 text-pink-light backdrop-blur-sm transition-transform group-hover:scale-110">
                        <span className="translate-x-[1px] text-[clamp(14px,2vw,24px)] leading-none">▶</span>
                      </span>
                      <span className="font-display text-[clamp(7px,0.85vw,10px)] uppercase tracking-[0.22em] text-pink-light/90">Play the music video</span>
                    </button>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* dip-to-black between rooms (hides the scene change) */}
        <div
          className="pointer-events-none absolute inset-0 z-40 bg-black transition-opacity duration-[400ms] ease-in-out"
          style={{ opacity: fading ? 1 : 0 }}
        />

        {/* back */}
        <button
          onClick={() => navigate("/location/hollywood")}
          className="absolute left-3 z-30 rounded-full border border-pink/40 bg-black/50 px-3.5 py-1.5 font-display text-[10px] uppercase tracking-[0.16em] text-pink-light/85 backdrop-blur-sm hover:text-white"
          style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          ← Hollywood
        </button>

        {/* skip the walk-in */}
        {!seated && (
          <button
            onClick={skip}
            className="absolute bottom-4 right-4 z-30 rounded-full border border-white/25 bg-black/50 px-4 py-2 font-display text-[10px] uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm hover:text-white"
          >
            Skip to seats ⏭
          </button>
        )}

        {/* FULL-SCREEN PLAYER — opens on tap so the video is big + watchable on any
            device (native YouTube controls = reliable playback on web AND mobile). */}
        <AnimatePresence>
          {playing && VIDEO_ID && (
            <motion.div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm px-3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setPlaying(false)}
            >
              <div
                className="relative w-full"
                style={{ maxWidth: "min(100vw, calc(100dvh * 16 / 9), 1100px)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative w-full overflow-hidden rounded-lg bg-black"
                     style={{ aspectRatio: "16 / 9", boxShadow: "0 0 70px 10px rgba(255,79,163,0.35)" }}>
                  <iframe
                    className="absolute inset-0 h-full w-full"
                    src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
                    title="Music Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              </div>
              <button
                onClick={() => setPlaying(false)}
                aria-label="Close video"
                className="absolute right-4 z-[61] flex h-10 w-10 items-center justify-center rounded-full border border-pink/50 bg-black/60 text-lg text-pink-light backdrop-blur-sm hover:text-white"
                style={{ top: "max(1rem, env(safe-area-inset-top))" }}
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
};

export default VistaTheater;
