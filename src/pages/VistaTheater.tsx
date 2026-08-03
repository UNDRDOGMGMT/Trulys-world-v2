import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageMeta from "@/components/PageMeta";

/**
 * The Vista Theatre — a cinematic walk-in built from real footage: the camera
 * travels off the street through the lobby and into the auditorium (two Higgsfield
 * image-to-video clips whose end frames match the next scene, so the joins are
 * seamless), then rests on the auditorium still where the music video plays.
 * Reached from Hollywood → The Vista.
 *
 * To go live, set VIDEO_ID to Truly's YouTube video id. Empty = "coming soon".
 */
const VIDEO_ID = "";

// Walk-in clips, in order. Each ends on the next scene's first frame.
const CLIPS = [
  "/world/theater/vista-walk-1.mp4", // street → lobby
  "/world/theater/vista-walk-2.mp4", // lobby → auditorium
];
// Destination still (matches the last clip's final frame) — where the screen lives.
const AUDITORIUM = "/world/theater/vista-auditorium.jpg";

// The blank black screen rectangle inside the auditorium art, as % of the frame.
// The iframe fills this exactly; YouTube letterboxes internally against black, so
// it blends with the screen and the video reads as a perfect fit.
const SCREEN = { leftPct: 35.9, topPct: 34.4, widthPct: 30.0, heightPct: 30.2 };
const THEATER_ZOOM = 1.6;
const SCREEN_ORIGIN = `${SCREEN.leftPct + SCREEN.widthPct / 2}% ${SCREEN.topPct + SCREEN.heightPct / 2}%`;

const VistaTheater: React.FC = () => {
  const navigate = useNavigate();
  // phase 0..CLIPS.length-1 = playing that clip; phase === CLIPS.length = seated in the theater
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fading, setFading] = useState(false); // dip-to-black between beats
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

  // advance to the next beat through a short black dip (like a dark doorway),
  // so the scene change never morphs on screen
  const goTo = useCallback((next: number) => {
    setFading(true);
    window.setTimeout(() => { setPhase(next); setFading(false); }, 420);
  }, []);

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
            onEnded={() => { if (phase === i) goTo(i + 1); }}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: !seated && phase === i ? 1 : 0, zIndex: !seated && phase === i ? 1 : 0 }}
          />
        ))}

        {/* forward-motion vignette over the footage */}
        {!seated && (
          <div className="pointer-events-none absolute inset-0 z-[2]"
               style={{ boxShadow: "inset 0 0 180px 40px rgba(0,0,0,0.6)" }} />
        )}

        {/* SEATED — auditorium still, zoomed toward the screen, with the video */}
        <AnimatePresence>
          {seated && (
            <motion.div
              className="absolute inset-0 z-[3]"
              style={{ transformOrigin: SCREEN_ORIGIN }}
              initial={{ scale: 1.0, opacity: 0 }}
              animate={{ scale: THEATER_ZOOM, opacity: 1 }}
              transition={{ scale: { duration: 1.4, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.5 } }}
            >
              <img src={AUDITORIUM} alt="" className="h-full w-full object-cover" draggable={false} />
              <div className="pointer-events-none absolute inset-0"
                   style={{ boxShadow: "inset 0 0 180px 40px rgba(0,0,0,0.6)" }} />

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
                transition={{ delay: 0.9, duration: 0.7 }}
              >
                {!VIDEO_ID ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <span className="font-display text-[clamp(8px,1vw,12px)] uppercase tracking-[0.24em] text-pink-light/85">Music Video</span>
                    <span className="font-whimsy text-[clamp(9px,1.3vw,15px)] text-pink-light/55">coming soon ♥</span>
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
                    className="group absolute inset-0 flex flex-col items-center justify-center gap-1.5"
                    aria-label="Play the music video"
                  >
                    <span className="flex h-[24%] min-h-[30px] aspect-square items-center justify-center rounded-full border-2 border-pink/70 bg-black/40 text-pink-light backdrop-blur-sm transition-transform group-hover:scale-110">
                      <span className="translate-x-[1px] text-[clamp(11px,2vw,20px)] leading-none">▶</span>
                    </span>
                    <span className="font-display text-[clamp(6px,0.8vw,9px)] uppercase tracking-[0.22em] text-pink-light/90">Play the music video</span>
                  </button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* dip-to-black between beats (hides the scene change) */}
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
