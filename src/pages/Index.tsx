import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useUnlock } from "@/contexts/UnlockContext";
import { useMember } from "@/contexts/MemberContext";
import { useIsPortrait } from "@/hooks/useIsPortrait";
import MarqueeStrip from "@/components/MarqueeStrip";
import CountdownTimer from "@/components/CountdownTimer";
import Logo from "@/components/Logo";
import SessionChip from "@/components/SessionChip";
import Shape from "@/components/Shape";
import HandDrawnFrame from "@/components/HandDrawnFrame";
import PageMeta from "@/components/PageMeta";
import SocialLinks from "@/components/SocialLinks";

// Tonight's drop. After midnight ET the countdown renders nothing and the
// OUT NOW button carries the block.
const EP_RELEASE = new Date("2026-08-21T00:00:00-04:00");
const EP_OUT = Date.now() >= EP_RELEASE.getTime();

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.6 } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.4 } },
} as const;

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { soundOn, setSoundOn, reduceMotion, setReduceMotion } = useUnlock();
  const { member } = useMember();
  const isPortrait = useIsPortrait();
  const [mapReady, setMapReady] = useState(false);

  return (
    <>
      <PageMeta
        title="TRULYS WORLD — Enter the Map"
        description="Truly Young's world is a map of Los Angeles. Shadows out now, Dear Joshua — the EP — out August 21, and one LA show on August 8."
      />
      <motion.main
        variants={reduceMotion ? undefined : pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="relative min-h-screen flex flex-col bg-background grain-overlay overflow-hidden"
      >
        {/* The map itself, dim + slowly drifting — her world, glimpsed before you enter.
            Also warms the browser cache for /map. */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
          <img
            src={isPortrait ? "/world/maps/la-map-6-v.jpg" : "/world/maps/la-map-7.jpg"}
            alt=""
            onLoad={() => setMapReady(true)}
            className={`absolute inset-0 w-full h-full object-cover ${reduceMotion ? "" : "bg-drift"} transition-opacity duration-[1600ms] ease-out ${mapReady ? "opacity-30" : "opacity-0"}`}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 42%, rgba(7,2,12,0.15) 0%, rgba(7,2,12,0.6) 55%, rgba(7,2,12,0.92) 100%)",
            }}
          />
        </div>

        <div className="relative z-10">
          <MarqueeStrip />
        </div>

        {/* session control — dashboard + log out for members, "sign in" otherwise */}
        <SessionChip className="absolute right-3 z-20"
          style={{ top: "max(2.7rem, calc(env(safe-area-inset-top) + 2.1rem))" }} />

        {/* Decorative shapes */}
        <Shape name="sparkle" size={80} rotate={-12} opacity={0.55} float
          className="absolute left-[8%] top-[18%] z-[5]" />
        <Shape name="sparkle" size={55} rotate={22} opacity={0.45} float
          className="absolute right-[10%] top-[14%] z-[5]" />
        <Shape name="heart" size={38} rotate={-8} opacity={0.4} float
          className="absolute right-[22%] top-[45%] z-[5]" />
        <Shape name="heart" size={28} rotate={12} opacity={0.35}
          className="absolute left-[18%] top-[62%] z-[5]" />

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center py-12">
          <motion.div
            className="relative mb-2"
            initial={reduceMotion ? undefined : { y: 30, opacity: 0, scale: 0.96 }}
            animate={reduceMotion ? undefined : { y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* soft aura behind the logo */}
            <div className="pink-aura absolute -inset-x-24 -inset-y-14" aria-hidden />
            <Logo size="xl" variant="stacked" className="relative" />
          </motion.div>

          <motion.p
            className="font-display text-sm tracking-[0.2em] uppercase text-muted-foreground mb-2 glitter-glow"
            initial={reduceMotion ? undefined : { y: 20, opacity: 0 }}
            animate={reduceMotion ? undefined : { y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            ♥ Her World Is a Map ♥
          </motion.p>

          <motion.div
            className="stamp-text text-xs mb-8"
            initial={reduceMotion ? undefined : { scale: 0, rotate: -15 }}
            animate={reduceMotion ? undefined : { scale: 1, rotate: -3 }}
            transition={{ delay: 0.6, duration: 0.4, type: "spring", stiffness: 200 }}
          >
            ✦ Shadows — Out Now ✦
          </motion.div>

          <motion.div
            className="relative mb-10 px-8"
            initial={reduceMotion ? undefined : { y: 20, opacity: 0 }}
            animate={reduceMotion ? undefined : { y: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.4 }}
          >
            <HandDrawnFrame strokeWidth={2} wobble={5} hearts animated shape="oval" />
            <motion.button
              onClick={() => navigate("/map")}
              className="btn-retro shimmer-sweep text-lg px-14 py-4 relative z-10"
              aria-label="Enter the map"
              whileHover={reduceMotion ? undefined : { scale: 1.05 }}
              whileTap={reduceMotion ? undefined : { scale: 0.95 }}
            >
              <span>&#10047;</span> ENTER <span>&#10047;</span>
            </motion.button>
          </motion.div>

          {/* the free-account pitch — front and center for logged-out visitors */}
          {!member && (
            <motion.div
              className="mb-8 flex flex-col items-center"
              initial={reduceMotion ? undefined : { opacity: 0, y: 14 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <motion.button
                onClick={() => navigate("/join")}
                className="btn-retro shimmer-sweep text-base px-10 py-3 relative"
                style={{ boxShadow: "0 0 22px rgba(255,79,163,0.55), 0 0 50px rgba(255,79,163,0.25)" }}
                animate={reduceMotion ? undefined : { scale: [1, 1.035, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                whileHover={reduceMotion ? undefined : { scale: 1.06 }}
                whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                aria-label="Sign up for a free account"
              >
                ♥ SIGN UP FREE ♥
              </motion.button>
              <p className="font-whimsy text-[12px] text-pink-light/85 mt-2">
                a free account unlocks the games, the EP rooms &amp; the vault
              </p>
            </motion.div>
          )}

          <motion.div
            className="mb-8 flex flex-col items-center gap-2"
            initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.5 }}
          >
            <CountdownTimer targetDate={EP_RELEASE} label="Dear Joshua — the EP — Drops In" />
            <button
              onClick={() => navigate("/dear-joshua")}
              className="btn-retro shimmer-sweep text-[13px] px-6 py-2 mt-1"
            >
              <span>&#10047;</span> {EP_OUT ? "Dear Joshua — OUT NOW" : "Dear Joshua — out 8.21"} <span>&#10047;</span>
            </button>
            <button
              onClick={() => navigate("/shadows")}
              className="font-whimsy text-[13px] text-pink-light hover:text-white glitter-glow transition-colors"
            >
              ✧ Shadows — out now →
            </button>
            <button
              onClick={() => navigate("/karaoke")}
              className="font-whimsy text-[13px] text-pink-light hover:text-white glitter-glow transition-colors"
            >
              ♪ sing it yourself →
            </button>
          </motion.div>

          {/* her links — every platform, one tap */}
          <SocialLinks reduceMotion={reduceMotion} className="mb-8" />

          {/* Toggles */}
          <motion.div
            className="flex gap-6 items-center text-[11px] font-display uppercase tracking-wider text-muted-foreground"
            initial={reduceMotion ? undefined : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <button
              onClick={() => setSoundOn(!soundOn)}
              className="hover:text-pink-light transition-colors"
            >
              {soundOn ? "♪ Sound On" : "♪ Sound Off"}
            </button>
            <button
              onClick={() => setReduceMotion(!reduceMotion)}
              className="hover:text-pink-light transition-colors"
            >
              {reduceMotion ? "✧ Motion Off" : "✧ Motion On"}
            </button>
          </motion.div>
        </div>
      </motion.main>
    </>
  );
};

export default Index;
