import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageMeta from "@/components/PageMeta";

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
const VIDEO_ID = "";

// Walk-in clips, in order.
const CLIPS = [
  "/world/theater/vista-walk-1.mp4", // street push-in
  "/world/theater/vista-walk-2.mp4", // lobby glide
  "/world/theater/vista-walk-3.mp4", // auditorium approach
];
// Destination still — the exact frame clip 3 ends on. Holds the screen.
const AUDITORIUM = "/world/theater/vista-auditorium-tight.jpg";

// The blank black screen rectangle inside the tight auditorium still, as % of
// the frame. The iframe fills this exactly; YouTube letterboxes internally
// against black, so it blends and the video reads as a perfect fit.
const SCREEN = { leftPct: 26.0, topPct: 25.8, widthPct: 48.0, heightPct: 48.3 };

const VistaTheater: React.FC = () => {
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

        {/* SEATED — auditorium still (the clip's final frame) with the video screen */}
        <AnimatePresence>
          {seated && (
            <motion.div
              className="absolute inset-0 z-[3]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <img src={AUDITORIUM} alt="" className="h-full w-full object-cover" draggable={false} />
              <div className="pointer-events-none absolute inset-0"
                   style={{ boxShadow: "inset 0 0 180px 40px rgba(0,0,0,0.5)" }} />

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
                ) : playing ? (
                  <iframe
                    className="absolute inset-0 h-full w-full"
                    src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                    title="Music Video"
                    allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
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
      </main>
    </>
  );
};

export default VistaTheater;
