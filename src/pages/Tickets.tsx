import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageMeta from "@/components/PageMeta";

/**
 * Concert Tickets — the Aug 8 show venue (a Truly's-World render of the real
 * Sunset Blvd stage). Public; the RSVP button routes to the /rsvp form.
 */
const VENUE = "/world/theater/venue-sunset.jpg";

const Tickets: React.FC = () => {
  const navigate = useNavigate();
  return (
    <>
      <PageMeta title="Concert Tickets — Truly Young Live · Aug 8" description="Truly Young live on Sunset Blvd — August 8, 8PM. RSVP for the show." />
      <main className="fixed inset-0 overflow-hidden bg-black text-white select-none">
        {/* venue */}
        <motion.img
          src={VENUE} alt="" draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ scale: 1.06, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
        {/* legibility gradient */}
        <div className="pointer-events-none absolute inset-0"
             style={{ background: "linear-gradient(to top, rgba(5,1,10,0.92) 0%, rgba(5,1,10,0.35) 42%, rgba(5,1,10,0.15) 70%, rgba(5,1,10,0.45) 100%)" }} />

        {/* content */}
        <motion.div
          className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] text-center"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7 }}
        >
          <span className="case-label text-[10px]">✦ Concert Tickets ✦</span>
          <h1 className="chrome-text-pink font-display text-4xl md:text-6xl leading-none mt-3">
            TRULY YOUNG — LIVE
          </h1>
          <p className="font-whimsy text-pink-light text-base md:text-lg mt-3">
            August 8 · 8PM · Sunset Blvd
          </p>
          <p className="font-body text-[12.5px] text-cream/60 mt-1 max-w-xs">
            Live in concert for the very first time · limited capacity
          </p>

          <button
            onClick={() => navigate("/rsvp")}
            className="btn-retro shimmer-sweep mt-6 text-base px-12 py-3.5"
          >
            <span>&#10047;</span> RSVP <span>&#10047;</span>
          </button>
          <p className="font-body text-[11px] text-pink-light/70 mt-3">
            Anyone under 18 must be accompanied by a parent or legal guardian.
          </p>
          <p className="font-body text-[11px] text-cream/45 mt-1">
            Approved confirmations + venue address emailed later this week.
          </p>
        </motion.div>

        {/* back */}
        <button
          onClick={() => navigate("/map")}
          className="absolute left-3 z-20 rounded-full border border-pink/40 bg-black/50 px-3.5 py-1.5 font-display text-[10px] uppercase tracking-[0.16em] text-pink-light/85 backdrop-blur-sm hover:text-white"
          style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          ← The Map
        </button>
      </main>
    </>
  );
};

export default Tickets;
