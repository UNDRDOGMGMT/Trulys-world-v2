import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageMeta from "@/components/PageMeta";
import { useIsPortrait } from "@/hooks/useIsPortrait";
import { shouldReduceMedia } from "@/lib/network";

/**
 * THE EX-BOYFRIEND MANSION — Trulyland's Haunted Mansion, reached from the park
 * directory. Three beats, the same shape as Corbin Bowl:
 *   gates  → the mansion from the street (living plate: fog, flickering windows)
 *   enter  → the push-in clip up the path and through the front door
 *   hall   → the portrait gallery. Every ex hangs on the wall, and when the
 *            lightning hits they show what they actually looked like.
 * Bare route (owns its own chrome).
 */

interface Ex {
  id: string;
  name: string;
  archetype: string;   // the red flag he is, in Boyfriend Island's taxonomy
  tag: string;
  species: string;     // the mythical classification on his record card
  habitat: string;
  call: string;        // what he sends at 3am
  diet: string;
  death: string;
  warning: string;
  epitaph: string;     // the one line under his portrait in the hall
}

/**
 * The residents. Each one is a red flag off Boyfriend Island's slice roster —
 * ghosted, crypto bro, "u up? 3AM", love-bomb — given a name, a species and a
 * cause of death. Same taxonomy, different building: out there you cut them
 * mid-air, in here they're already mounted on the wall.
 */
const EXES: Ex[] = [
  {
    id: "ex1",
    name: "Vinny Ash",
    archetype: "The Ghoster",
    tag: "the one in the band",
    species: "Vanitas absentia — the Vanishing Man",
    habitat: "green rooms, other people's couches, a van somewhere past Barstow",
    call: "a single 🖤 four days after the question",
    diet: "free drinks, your charger, the benefit of the doubt",
    death: "Walked out to take a call in 2023. The call is ongoing.",
    warning: "He isn't ignoring you. He's translucent. There is nothing there to answer.",
    epitaph: "Swore you were on the list. You were never on the list.",
  },
  {
    id: "ex2",
    name: "Chadwick Vale III",
    archetype: "The Crypto Bro",
    tag: "the one in the vest",
    species: "Portfolio spectralis — the Ledger Wraith",
    habitat: "rooftop bars, group chats named after animals, his mother's guest house",
    call: "\u201cnot financial advice but\u201d at 2:14am",
    diet: "seed rounds, oat milk, the last word",
    death: "Went all in. Stayed all in. Is still, technically, all in.",
    warning: "He will explain the chart. The chart is him. He is going down.",
    epitaph: "Split the check on your birthday. To the cent.",
  },
  {
    id: "ex3",
    name: "Dash Mulraney",
    archetype: "The 3AM Texter",
    tag: "the one with the board",
    species: "Noctis interrogans — the U-Up Wraith",
    habitat: "parking structures, the last hour of any night, never daylight",
    call: "\u201cu up\u201d \u2014 no punctuation, no follow-up, every full moon",
    diet: "attention after midnight, none before noon",
    death: "Asked once too often. Nobody was up. He wasn't either, after that.",
    warning: "He only exists between 2 and 4am. Do not confirm you are awake.",
    epitaph: "Left mid-set to go skate. Still skating, presumably.",
  },
  {
    id: "ex4",
    name: "DJ Kastle (Kyle)",
    archetype: "The Love-Bomber",
    tag: "the one with the headphones",
    species: "Cor displosum — the Bouquet Revenant",
    habitat: "the booth, your notifications, the first two weeks",
    call: "forty-one messages, a playlist, and a nickname you never agreed to",
    diet: "adoration, immediately, in bulk",
    death: "Gave everything in nine days and had nothing left on the tenth.",
    warning: "The flowers arrive before the questions do. That is the tell.",
    epitaph: "Died waiting for you to say you liked the edit.",
  },
];

type Phase = "gates" | "entering" | "hall";

const ExMansion: React.FC = () => {
  const navigate = useNavigate();
  const isPortrait = useIsPortrait();
  const [phase, setPhase] = useState<Phase>("gates");
  const [ambient, setAmbient] = useState(false);
  const [hallAmbient, setHallAmbient] = useState(false);
  const [held, setHeld] = useState<string | null>(null);   // portrait held open by the visitor
  const [strike, setStrike] = useState(false);             // lightning — every ex shows their true face
  const [open, setOpen] = useState<Ex | null>(null);        // the dossier window, open on one ex
  const [rotted, setRotted] = useState(false);             // his rot clip has played out
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const motionOK = useMemo(
    () => !shouldReduceMedia() && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const enter = useCallback(() => {
    if (phase !== "gates") return;
    if (!motionOK) { setPhase("hall"); return; }
    setPhase("entering");
    enterTimer.current = setTimeout(() => setPhase("hall"), 7000);   // fallback if the clip stalls
  }, [phase, motionOK]);

  const arrive = useCallback(() => {
    if (enterTimer.current) { clearTimeout(enterTimer.current); enterTimer.current = null; }
    setPhase("hall");
  }, []);

  useEffect(() => () => { if (enterTimer.current) clearTimeout(enterTimer.current); }, []);

  // ── The dossier ──────────────────────────────────────────────────────
  // Tap an ex and his record opens: the painting rots him down to bone while
  // you read what he actually was. Filed the same way Boyfriend Island files
  // them — every one of these is a red flag with a name.
  const openEx = useCallback((ex: Ex) => {
    setHeld(null);
    setRotted(false);
    setOpen(ex);
  }, []);
  const closeEx = useCallback(() => { setOpen(null); setRotted(false); }, []);

  // Escape closes the dossier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && open) closeEx(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeEx]);

  // Lightning in the hall: every ~9s the room flashes and all four portraits
  // drop the act for a beat.
  useEffect(() => {
    if (phase !== "hall" || !motionOK || open) return;
    const tick = setInterval(() => {
      setStrike(true);
      setTimeout(() => setStrike(false), 1500);
    }, 9000);
    return () => clearInterval(tick);
  }, [phase, motionOK, open]);

  const exteriorStill = isPortrait ? "/park/mansion/exterior-v.jpg" : "/park/mansion/exterior.jpg";
  const hallStill = isPortrait ? "/park/mansion/hall-v.jpg" : "/park/mansion/hall.jpg";

  return (
    <>
      <PageMeta
        title="The Ex-Boyfriend Mansion — TRULYLAND — TRULYS WORLD"
        description="999 happy haunts, all of them boys. Trulyland's haunted mansion."
        path="/trulyland/ex-mansion"
      />
      <div className="fixed inset-0 overflow-hidden bg-[#0d0010]">
        {/* ─────────── GATES ─────────── */}
        {phase !== "hall" && (
          <motion.div
            className="absolute inset-0"
            animate={{ scale: phase === "entering" ? 1.12 : 1.04, opacity: phase === "entering" ? 0 : 1 }}
            transition={{ duration: phase === "entering" ? 0.6 : 22, ease: phase === "entering" ? "easeIn" : "linear" }}
          >
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${exteriorStill}')` }} />
            {motionOK && !isPortrait && (
              <motion.video
                src="/park/mansion/exterior-loop.mp4"
                poster={exteriorStill}
                autoPlay muted loop playsInline preload="auto"
                onCanPlay={() => setAmbient(true)}
                className="absolute inset-0 h-full w-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: ambient ? 1 : 0 }}
                transition={{ duration: 1.1 }}
                aria-hidden
              />
            )}
          </motion.div>
        )}

        {/* ─────────── HALL ─────────── */}
        {phase === "hall" && (
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1.25, opacity: 0 }}
            animate={{ scale: 1.02, opacity: 1 }}
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${hallStill}')` }} />
            {motionOK && !isPortrait && (
              <motion.video
                src="/park/mansion/hall-loop.mp4"
                poster={hallStill}
                autoPlay muted loop playsInline preload="auto"
                onCanPlay={() => setHallAmbient(true)}
                className="absolute inset-0 h-full w-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: hallAmbient ? 1 : 0 }}
                transition={{ duration: 1.2 }}
                aria-hidden
              />
            )}
            {/* pull the room back so the portraits read on top of it */}
            <div className="absolute inset-0 bg-[#12000f]/70" />
          </motion.div>
        )}

        {/* vignette + scanlines, both beats */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 40%, rgba(9,0,12,0.85) 100%)" }}
        />
        <div className="scanlines pointer-events-none absolute inset-0 opacity-30" />

        {/* lightning flash */}
        <motion.div
          className="pointer-events-none absolute inset-0 bg-[#ffd7ee]"
          animate={{ opacity: strike ? [0, 0.5, 0.05, 0.35, 0] : 0 }}
          transition={{ duration: 1.5, times: [0, 0.06, 0.16, 0.24, 1] }}
        />

        {/* ─────────── the walk up the path ─────────── */}
        <AnimatePresence>
          {phase === "entering" && (
            <motion.div
              key="walk"
              className="absolute inset-0 z-30 flex items-center justify-center bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <video
                src="/park/mansion/travel-wide.mp4"
                poster="/park/mansion/travel-wide-poster.jpg"
                autoPlay muted playsInline preload="auto"
                onEnded={arrive}
                className="h-full w-full object-cover [@media(orientation:portrait)]:object-contain"
              />
              <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 220px rgba(0,0,0,0.8)" }} />
              <motion.div className="pointer-events-none absolute inset-x-0 top-0 bg-black" initial={{ height: 0 }} animate={{ height: "7vh" }} exit={{ height: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
              <motion.div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black" initial={{ height: 0 }} animate={{ height: "7vh" }} exit={{ height: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
              <motion.div
                className="pointer-events-none absolute inset-x-0 bottom-[11vh] flex flex-col items-center px-6 text-center"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.55, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="font-display text-[10px] uppercase tracking-[0.3em] text-pink-light/90 md:text-[11px]" style={{ textShadow: "0 0 10px rgba(255,79,163,0.7)" }}>
                  ✦ now entering ✦
                </span>
                <span className="chrome-text-pink mt-1.5 font-display text-2xl leading-none md:text-4xl">
                  THE EX-BOYFRIEND MANSION
                </span>
              </motion.div>
              <button
                onClick={arrive}
                style={{ top: "max(1rem, calc(env(safe-area-inset-top) + 0.5rem))", right: "max(1rem, env(safe-area-inset-right))" }}
                className="absolute z-10 rounded-full border border-white/25 bg-black/55 px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.15em] text-cream/85 backdrop-blur-sm transition-colors hover:text-white"
              >
                Skip ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─────────── the marquee at the gates ─────────── */}
        <AnimatePresence>
          {phase === "gates" && (
            <motion.div
              key="gates-copy"
              className="absolute inset-0 flex flex-col items-center justify-end px-6 pb-[6vh] text-center"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.35, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="mb-2 font-display text-[10px] uppercase tracking-[0.42em] text-pink-light md:text-xs"
                style={{ textShadow: "0 2px 10px rgba(0,0,0,0.9), 0 0 16px rgba(255,79,163,0.75)" }}
              >
                ✦ 999 happy haunts · all of them boys ✦
              </span>
              <h1 className="chrome-text-pink font-display text-3xl leading-none md:text-5xl" style={{ textShadow: "0 0 26px rgba(255,79,163,0.55)" }}>
                THE EX-BOYFRIEND MANSION
              </h1>
              <p
                className="mb-5 mt-3 max-w-md font-whimsy text-sm leading-relaxed text-cream md:text-base"
                style={{ textShadow: "0 2px 8px rgba(0,0,0,0.95)" }}
              >
                They all still live here. They all still think you're coming back.
                There's always room for one more — that's the problem.
              </p>
              <button onClick={enter} className="btn-retro shimmer-sweep !px-9 !py-3.5 !text-base md:!text-lg">
                ✦ RING THE BELL ✦
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─────────── the portrait gallery ─────────── */}
        <AnimatePresence>
          {phase === "hall" && (
            <motion.div
              key="hall-copy"
              className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-y-auto px-4 py-[9vh]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.9 }}
            >
              <span
                className="mb-1 font-display text-[10px] uppercase tracking-[0.42em] text-pink-light md:text-xs"
                style={{ textShadow: "0 0 16px rgba(255,79,163,0.8)" }}
              >
                ✦ the portrait hall ✦
              </span>
              <p className="mb-5 max-w-sm text-center font-whimsy text-[13px] leading-relaxed text-cream/90 md:text-sm" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.95)" }}>
                Tap a portrait to pull his record. Hover, or wait for the lightning, to see him properly.
              </p>

              <div className="grid w-full max-w-4xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                {EXES.map((ex, i) => {
                  const shown = strike || held === ex.id;
                  return (
                    <motion.button
                      key={ex.id}
                      className="group text-left"
                      initial={{ opacity: 0, y: 22 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1 + i * 0.12, duration: 0.6 }}
                      onClick={() => openEx(ex)}
                      onPointerEnter={(e) => { if (e.pointerType === "mouse") setHeld(ex.id); }}
                      onPointerLeave={() => setHeld((h) => (h === ex.id ? null : h))}
                      onFocus={() => setHeld(ex.id)}
                      onBlur={() => setHeld((h) => (h === ex.id ? null : h))}
                      aria-label={`${ex.name} — ${ex.tag}. Open his record.`}
                    >
                      <motion.div
                        className="relative aspect-[3/4] w-full overflow-hidden rounded-[3px]"
                        style={{ boxShadow: "0 18px 40px rgba(0,0,0,0.75)" }}
                        animate={shown ? { rotate: [0, -0.8, 0.8, -0.4, 0] } : { rotate: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <img src={`/park/mansion/${ex.id}.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                        <motion.img
                          src={`/park/mansion/${ex.id}-ghost.jpg`}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          animate={{ opacity: shown ? 1 : 0 }}
                          transition={{ duration: 0.22 }}
                          loading="lazy"
                        />
                        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 30%, transparent 45%, rgba(6,0,10,0.6) 100%)" }} />
                      </motion.div>
                      <div className="mt-2 px-0.5">
                        <span className="block font-display text-[11px] uppercase tracking-[0.14em] text-[#ffe3f1] md:text-xs" style={{ textShadow: "0 0 10px rgba(255,79,163,0.5)" }}>
                          {ex.name}
                        </span>
                        <span className="block font-whimsy text-[11px] text-pink-light/85">{ex.tag}</span>
                        <span className="mt-0.5 block font-whimsy text-[11px] leading-snug text-cream/60">{ex.epitaph}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <p className="mt-6 text-center font-display text-[9px] uppercase tracking-[0.3em] text-white/40">
                ✦ the séance room · opening soon ✦
              </p>

              <button
                onClick={() => navigate("/trulyland")}
                className="btn-retro mt-5 !px-7 !py-2.5 !text-xs"
              >
                ← back to the park
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─────────── the record window ─────────── */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="dossier"
              className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#08000c]/90 px-3 py-[4vh] backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              onClick={closeEx}
            >
              <motion.div
                className="relative grid w-full max-w-5xl items-start gap-4 md:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] md:gap-6"
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* the painting, rotting him down to bone */}
                <div className="relative">
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[3px]" style={{ boxShadow: "0 26px 60px rgba(0,0,0,0.85)" }}>
                    {motionOK ? (
                      <video
                        key={`${open.id}-rot`}
                        src={`/park/mansion/${open.id}-rot.mp4`}
                        poster={`/park/mansion/${open.id}.jpg`}
                        autoPlay muted playsInline preload="auto"
                        onEnded={() => setRotted(true)}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <img src={`/park/mansion/${open.id}-ghost.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    )}
                    <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 30%, transparent 55%, rgba(6,0,10,0.5) 100%)" }} />
                  </div>
                  {motionOK && (
                    <button
                      onClick={(e) => {
                        const v = (e.currentTarget.parentElement?.querySelector("video") as HTMLVideoElement | null);
                        if (v) { v.currentTime = 0; void v.play(); setRotted(false); }
                      }}
                      className="mt-2 w-full font-display text-[9px] uppercase tracking-[0.28em] text-pink-light/75 transition-colors hover:text-pink-light"
                    >
                      {rotted ? "⟲ watch him go again" : "…decomposing"}
                    </button>
                  )}
                </div>

                {/* his record — inked on the mansion's own stationery. The
                    card art stretches to the text so nothing ever runs past the
                    printed rule. */}
                <div
                  className="relative w-full"
                  style={{
                    backgroundImage: "url('/park/mansion/card.jpg')",
                    backgroundSize: "100% 100%",
                    backgroundRepeat: "no-repeat",
                    filter: "drop-shadow(0 26px 60px rgba(0,0,0,0.8))",
                    padding: "15% 18% 16% 19.5%",
                  }}
                >
                  <div className="flex h-full flex-col text-[#230617]">
                    <span className="font-display text-[7px] uppercase tracking-[0.28em] text-[#8c1550] md:text-[8.5px]">
                      resident no. {String(EXES.findIndex((e) => e.id === open.id) + 1).padStart(3, "0")} of 999
                    </span>
                    <h2 className="font-display text-[15px] leading-tight md:text-xl">{open.name}</h2>
                    <span className="mb-2 block font-whimsy text-[10.5px] leading-tight text-[#6d1240] md:text-[12px]">
                      {open.archetype} · {open.tag}
                    </span>

                    <dl className="space-y-1.5">
                      {[
                        ["species", open.species],
                        ["habitat", open.habitat],
                        ["call", open.call],
                        ["diet", open.diet],
                        ["cause of death", open.death],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <dt className="font-display text-[6.5px] uppercase tracking-[0.24em] text-[#8a1148] md:text-[8px]">{k}</dt>
                          <dd className="font-whimsy text-[10.5px] leading-tight md:text-[12.5px]">{v}</dd>
                        </div>
                      ))}
                    </dl>

                    <p className="mt-2 font-whimsy text-[10.5px] italic leading-tight md:text-[12.5px]">
                      {open.warning}
                    </p>

                    <div className="mt-3 max-w-[72%]">
                      <span className="block font-display text-[6.5px] uppercase tracking-[0.22em] text-[#8c1550]/85 md:text-[7.5px]">
                        filed under: red flag
                      </span>
                      <button
                        onClick={() => navigate("/boyfriend-island")}
                        className="mt-0.5 font-display text-[7px] uppercase tracking-[0.18em] text-[#8c1550] underline-offset-2 transition-opacity hover:underline hover:opacity-70 md:text-[8.5px]"
                      >
                        cut one loose on the island →
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={closeEx}
                  className="absolute -top-3 right-0 z-10 rounded-full border border-white/25 bg-black/70 px-4 py-1.5 font-display text-[10px] uppercase tracking-[0.15em] text-cream/85 backdrop-blur-sm transition-colors hover:text-white md:-top-4"
                >
                  close the file ✕
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* corner exit */}
        <button
          onClick={() => navigate(phase === "hall" ? "/trulyland" : "/trulyland")}
          style={{ top: "max(0.75rem, env(safe-area-inset-top))", left: "max(0.75rem, env(safe-area-inset-left))" }}
          className="fixed z-40 rounded-full border border-white/20 bg-black/50 px-3.5 py-1.5 font-display text-[10px] uppercase tracking-[0.15em] text-white/70 backdrop-blur-sm transition-colors hover:text-white"
        >
          ← trulyland
        </button>
      </div>
    </>
  );
};

export default ExMansion;
