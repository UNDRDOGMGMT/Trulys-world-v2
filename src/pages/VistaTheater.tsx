import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageMeta from "@/components/PageMeta";

/**
 * The Vista Theatre interior — a cinematic walk-in that dollies from the street,
 * through the lobby, down the hall, and into the auditorium, where the music
 * video plays fitted to the screen. Reached from Hollywood → The Vista.
 *
 * To go live, set VIDEO_ID to Truly's YouTube video id (the part after `v=` /
 * `youtu.be/`). Empty string shows a "coming soon" screen.
 */
const VIDEO_ID = "";

type Scene = { id: string; src: string; ms: number; caption?: string };

// The walk-in. Each still is shot in one-point perspective so a slow forward
// scale reads as walking through it. Last scene (auditorium) is the destination.
const SCENES: Scene[] = [
  { id: "exterior", src: "/world/maps/hw-vista.jpg",            ms: 1700, caption: "The Vista" },
  { id: "lobby",    src: "/world/theater/vista-lobby.jpg",      ms: 2400 },
  { id: "hall",     src: "/world/theater/vista-hall.jpg",       ms: 2400 },
  { id: "theater",  src: "/world/theater/vista-auditorium.jpg", ms: 0 },
];

// The blank black screen rectangle inside the auditorium art, as % of the frame.
// The iframe fills this exactly; YouTube letterboxes internally against black,
// so it blends with the screen and the video reads as a perfect fit.
const SCREEN = { leftPct: 35.9, topPct: 34.4, widthPct: 30.0, heightPct: 30.2 };

const VistaTheater: React.FC = () => {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const atTheater = idx >= SCENES.length - 1;
  const scene = SCENES[idx];

  // auto-advance through the walk-in until we arrive in the auditorium
  useEffect(() => {
    if (atTheater) return;
    timer.current = setTimeout(() => setIdx((i) => Math.min(i + 1, SCENES.length - 1)), scene.ms);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [idx, atTheater, scene.ms]);

  const skip = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setIdx(SCENES.length - 1);
  }, []);

  // preload the interior stills so the walk-in never flashes empty
  useEffect(() => {
    SCENES.forEach((s) => { const im = new Image(); im.src = s.src; });
  }, []);

  return (
    <>
      <PageMeta title="The Vista — TRULYS WORLD" description="Inside the Vista Theatre. The music video, on the big screen." />
      <main className="fixed inset-0 overflow-hidden bg-black text-white select-none">
        {/* the moving image */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={scene.id}
            className="absolute inset-0"
            initial={{ scale: idx === 0 ? 1.02 : 1.12, opacity: 0 }}
            animate={{ scale: atTheater ? 1.0 : 1.22, opacity: 1 }}
            exit={{ scale: 1.38, opacity: 0 }}
            transition={{
              scale: { duration: atTheater ? 1.1 : scene.ms / 1000, ease: atTheater ? [0.16, 1, 0.3, 1] : "linear" },
              opacity: { duration: 0.6, ease: "easeOut" },
            }}
          >
            <img src={scene.src} alt="" className="h-full w-full object-cover" draggable={false} />
            {/* forward-motion vignette */}
            <div className="pointer-events-none absolute inset-0"
                 style={{ boxShadow: "inset 0 0 180px 40px rgba(0,0,0,0.65)" }} />
          </motion.div>
        </AnimatePresence>

        {/* THEATER SCREEN — the video fitted to the auditorium's blank screen */}
        {atTheater && (
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
                <span className="font-display text-[clamp(8px,1.2vw,13px)] uppercase tracking-[0.24em] text-pink-light/85">Music Video</span>
                <span className="font-whimsy text-[clamp(9px,1.5vw,16px)] text-pink-light/55">coming soon ♥</span>
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
                <span className="flex h-[26%] min-h-[34px] aspect-square items-center justify-center rounded-full border-2 border-pink/70 bg-black/40 text-pink-light backdrop-blur-sm transition-transform group-hover:scale-110">
                  <span className="translate-x-[1px] text-[clamp(12px,2.6vw,22px)] leading-none">▶</span>
                </span>
                <span className="font-display text-[clamp(7px,1vw,10px)] uppercase tracking-[0.22em] text-pink-light/90">Play the music video</span>
              </button>
            )}
          </motion.div>
        )}

        {/* house-lights dim when the film rolls (screen sits above this at z-20) */}
        {atTheater && playing && (
          <div className="pointer-events-none absolute inset-0 z-10 bg-black/55 transition-opacity duration-1000" />
        )}

        {/* back */}
        <button
          onClick={() => navigate("/location/hollywood")}
          className="absolute left-3 top-3 z-30 rounded-full border border-pink/40 bg-black/50 px-3.5 py-1.5 font-display text-[10px] uppercase tracking-[0.16em] text-pink-light/85 backdrop-blur-sm hover:text-white"
          style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          ← Hollywood
        </button>

        {/* skip the walk-in */}
        {!atTheater && (
          <button
            onClick={skip}
            className="absolute bottom-4 right-4 z-30 rounded-full border border-white/25 bg-black/50 px-4 py-2 font-display text-[10px] uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm hover:text-white"
          >
            Skip to seats ⏭
          </button>
        )}

        {/* opening caption */}
        <AnimatePresence>
          {scene.caption && !atTheater && (
            <motion.div
              key={`cap-${scene.id}`}
              className="pointer-events-none absolute inset-x-0 bottom-[12%] flex justify-center"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="font-display text-lg tracking-[0.2em] uppercase chrome-text-pink">{scene.caption}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
};

export default VistaTheater;
