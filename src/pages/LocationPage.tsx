import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { locations, type EmbedData, type LocationData, type EnvView, type EnvHotspot } from "@/data/locations";
import PageMeta from "@/components/PageMeta";
import Shape from "@/components/Shape";
import { useIsPortrait } from "@/hooks/useIsPortrait";
import { trackEvent } from "@/lib/analytics";
import TrulyList from "@/components/TrulyList";

/**
 * Instagram only allows framing an individual post/reel, via its /embed endpoint —
 * profile pages answer with X-Frame-Options: DENY and can never render in an
 * iframe. Normalise a post URL into the embeddable form; return null for a
 * profile so the caller can link out instead of framing a permanent blank box.
 */
const instagramEmbedUrl = (url: string): string | null => {
  const post = url.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  if (!post) return null;
  return `https://www.instagram.com/${post[1]}/${post[2]}/embed/`;
};

/** Link-out card for destinations that refuse to be framed (e.g. an IG profile). */
const LinkOut: React.FC<{ embed: EmbedData }> = ({ embed }) => {
  const handle = embed.url.replace(/\/+$/, "").split("/").pop();
  return (
    <a
      href={embed.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent("embed_linkout", { url: embed.url })}
      className="group flex items-center justify-between gap-4 rounded-xl border border-pink/25 bg-black/40 px-5 py-4 transition-colors hover:border-pink/60 hover:bg-black/60"
    >
      <span className="min-w-0">
        <span className="block font-display text-[10px] uppercase tracking-[0.25em] text-pink-light/70">
          ✦ Instagram
        </span>
        <span className="block truncate font-whimsy text-lg text-cream group-hover:text-white">
          @{handle}
        </span>
      </span>
      <span className="shrink-0 font-display text-[11px] uppercase tracking-[0.15em] text-pink-light transition-transform group-hover:translate-x-0.5">
        open →
      </span>
    </a>
  );
};

const Embed: React.FC<{ embed: EmbedData }> = ({ embed }) => {
  const height = embed.type === "spotify" ? 152 : embed.type === "soundcloud" ? 300 : 315;
  let src = embed.url;
  if (embed.type === "instagram") {
    const ig = instagramEmbedUrl(embed.url);
    if (!ig) return <LinkOut embed={embed} />;
    src = ig;
  }
  return (
    <div className="rounded-xl overflow-hidden border border-pink/20 bg-black/40">
      <iframe
        src={src}
        title={embed.title}
        width="100%"
        height={height}
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        style={{ border: 0, display: "block" }}
      />
    </div>
  );
};

/** LAX mailing-list capture — local only in the clean-room build (no backend). */
const MailingList: React.FC = () => (
  <TrulyList tone="plate" onDone={() => trackEvent("mailing_list_submit", { has_phone: true })} />
);

/**
 * Internal destinations that exist as routes today. A case file may point at a
 * room we haven't built yet — /shop, /press and /vault are all planned — and
 * those must render as "coming soon" rather than dropping a fan on the 404.
 * Add a path here the moment its route lands in App.tsx and the CTA lights up.
 */
const LIVE_ROUTES = new Set(["/", "/map", "/world", "/dear-joshua", "/cruise-night", "/do-not-disturb", "/trulys-pinball", "/trulys-map-pinball", "/sing", "/corbin-bowl", "/boutique", "/shadows", "/selects"]);

const ctaIsLive = (href?: string) => {
  if (!href) return false;
  if (!href.startsWith("/")) return true; // external — off to Spotify/YouTube/etc
  const path = href.split(/[?#]/)[0];
  if (path.startsWith("/location/")) return locations.some((l) => l.id === path.slice(10));
  return LIVE_ROUTES.has(path);
};

/** Shared case-file body: extras, mailing list, embeds, CTA. Used by both layouts. */
const CaseDetails: React.FC<{ loc: LocationData }> = ({ loc }) => {
  const navigate = useNavigate();
  const isInternal = loc.cta.href?.startsWith("/");
  const ctaLive = ctaIsLive(loc.cta.href);
  const showMailingList = loc.id === "lax";
  return (
    <>
      {loc.extras && loc.extras.length > 0 && (
        <ul className="space-y-1.5 mb-6">
          {loc.extras.map((ex, i) => (
            <li key={i} className="font-whimsy text-pink-light text-sm">
              {ex.href ? (
                <a href={ex.href} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors underline decoration-pink/40">
                  {ex.label}
                </a>
              ) : (
                ex.label
              )}
            </li>
          ))}
        </ul>
      )}

      {showMailingList && <div className="mb-6"><MailingList /></div>}

      {loc.embeds && loc.embeds.length > 0 && (
        <div className="space-y-4 mb-6">
          {loc.embeds.map((embed, i) => (
            <Embed key={i} embed={embed} />
          ))}
        </div>
      )}

      {/* LAX carries the mailing-list block instead of a CTA, but it also owns
          the pinball table — so a live route still gets its button there. */}
      {(!showMailingList || ctaLive) && loc.cta.href && ctaLive && (
        isInternal ? (
          <button
            onClick={() => { trackEvent("location_cta", { location: loc.id }); navigate(loc.cta.href!); }}
            className="btn-retro shimmer-sweep"
          >
            ✦ {loc.cta.label} ✦
          </button>
        ) : (
          <a
            href={loc.cta.href}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackEvent("location_cta", { location: loc.id })}
            className="btn-retro shimmer-sweep"
          >
            ✦ {loc.cta.label} ✦
          </a>
        )
      )}
      {!showMailingList && !ctaLive && (
        <div className="flex flex-col gap-1.5">
          <span className="font-whimsy text-pink-light/70 text-sm">✧ {loc.cta.label} — coming soon</span>
          <a
            href="https://www.instagram.com/trulyoung"
            target="_blank"
            rel="noreferrer"
            onClick={() => trackEvent("location_cta_soon", { location: loc.id })}
            className="font-whimsy text-pink-light text-sm hover:text-accent transition-colors underline decoration-pink/40 w-fit"
          >
            follow for the drop →
          </a>
        </div>
      )}
    </>
  );
};

/** A glowing clickable region on the establishing shot. */
const Hotspot: React.FC<{ h: EnvHotspot; onClick: () => void; index: number }> = ({ h, onClick, index }) => (
  <motion.button
    className="absolute z-20 group flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
    style={{ left: `${h.x}%`, top: `${h.y}%`, touchAction: "manipulation" }}
    onClick={onClick}
    aria-label={`Look closer: ${h.label}`}
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay: 0.4 + index * 0.12, type: "spring", stiffness: 220, damping: 15 }}
    whileHover={{ scale: 1.12 }}
    whileTap={{ scale: 0.94 }}
  >
    <span className="relative flex items-center justify-center mb-1">
      <span className="absolute w-8 h-8 rounded-full bg-[#ff4fa3]/30 animate-ping" />
      <span
        className="relative w-4 h-4 rounded-full bg-[#ff4fa3] border border-white/70"
        style={{ boxShadow: "0 0 8px #ff4fa3, 0 0 20px #ff4fa3" }}
      />
    </span>
    <span
      className="whitespace-nowrap font-display text-[10px] md:text-[11px] uppercase tracking-[0.12em] text-cream bg-black/55 px-2.5 py-1 rounded-full border border-pink/25 opacity-90 group-hover:opacity-100 transition-opacity"
      style={{ textShadow: "0 0 6px rgba(255,79,163,0.6)" }}
    >
      {h.label}
    </span>
  </motion.button>
);

const LocationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isPortrait = useIsPortrait();
  const loc = locations.find((l) => l.id === id);
  const env = loc?.environment;

  // Current point-of-view within the neighborhood (starts on the establishing shot).
  const [viewId, setViewId] = useState<string>(env?.start ?? "");
  useEffect(() => { if (env) setViewId(env.start); }, [id, env]);

  // Warm every POV still for this hood so switching views crossfades instantly
  // instead of popping in as the image streams.
  useEffect(() => {
    if (!env) return;
    env.views.forEach((v) => {
      const img = new Image();
      img.src = isPortrait && v.srcPortrait ? v.srcPortrait : v.src;
    });
  }, [env, isPortrait]);

  if (!loc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background grain-overlay text-center px-4">
        <PageMeta title="Case File Not Found — TRULYS WORLD" />
        <p className="font-display text-xl text-cream">✦ That case file is sealed ✦</p>
        <Link to="/map" className="btn-retro !text-xs">← Back to the Map</Link>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXPLORABLE ANIMATED ENVIRONMENT — land on the establishing shot, click a
  // glowing region to change POV. Content slots into the panel below.
  // ─────────────────────────────────────────────────────────────────────────
  if (env) {
    const view: EnvView = env.views.find((v) => v.id === viewId) ?? env.views[0];
    const startView = env.views.find((v) => v.id === env.start) ?? env.views[0];
    const isStart = view.id === env.start;
    const changeView = (to: string) => { trackEvent("pov_change", { location: loc.id, to }); setViewId(to); };
    // every POV in this hood that launches a game/experience — each surfaced as an
    // always-visible callout (a hood can host more than one, e.g. DTLA = Cruise
    // Night + Dear Joshua), so none stay hidden behind a POV you have to find.
    const gameViews = env.views.filter((v) => v.action && !v.action.shop);

    return (
      <>
        <PageMeta title={`${loc.name} — Truly Young`} description={`${loc.caseLabel}. ${loc.headline}`} />
        <motion.main
          className="relative min-h-screen player-safe-bottom bg-[#07020c]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          transition={{ duration: 0.5 }}
        >
          {/* HERO — interactive living environment, full viewport so it bleeds off every edge */}
          <div className="relative h-[100dvh] min-h-[520px] w-full overflow-hidden">
            {/* crossfading POV — kept slightly over-scaled so any framed art bleeds past the edges */}
            <AnimatePresence mode="popLayout">
              <motion.div
                key={view.id}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.14 }}
                animate={{ opacity: 1, scale: 1.06 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              >
                <img src={isPortrait && view.srcPortrait ? view.srcPortrait : view.src} alt={`${loc.name} — ${view.label}`} className="absolute inset-0 w-full h-full object-cover" />
                {view.video && !(isPortrait && view.srcPortrait) && (
                  <video
                    className="absolute inset-0 w-full h-full object-cover"
                    poster={view.src}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    aria-hidden
                  >
                    <source src={view.video} type="video/mp4" />
                  </video>
                )}
              </motion.div>
            </AnimatePresence>

            {/* legibility scrim */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(to bottom, rgba(7,2,12,0.45) 0%, rgba(7,2,12,0.05) 30%, rgba(7,2,12,0.35) 62%, #07020c 100%)" }}
            />

            {/* hotspots — desktop only (they're tuned to the landscape art); on mobile the POV buttons handle it */}
            {!isPortrait && view.hotspots?.map((h, i) => (
              <Hotspot key={h.to} h={h} index={i} onClick={() => changeView(h.to)} />
            ))}

            {/* top bar */}
            <div
              className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3"
              style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/map")}
                  className="font-display text-[11px] uppercase tracking-[0.14em] text-cream/85 hover:text-white bg-black/45 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors"
                >
                  ← Map
                </button>
                {!isStart && (
                  <button
                    onClick={() => changeView(env.start)}
                    className="font-display text-[11px] uppercase tracking-[0.14em] text-cream/85 hover:text-white bg-black/45 border border-pink/30 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors"
                  >
                    ⤺ {startView.label}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* desktop surfaces every game up top; on portrait these crowd the
                    status bar, so mobile reaches each game via its POV + the big
                    action CTA in the hero. Keep just the EP shortcut. */}
                {!isPortrait && gameViews.map((gv) => (
                  <button
                    key={gv.id}
                    onClick={() => { trackEvent("game_launch", { location: loc.id, to: gv.action!.to }); navigate(gv.action!.to); }}
                    className="btn-retro !text-[10px] !py-1 !px-3 shimmer-sweep animate-pulse"
                  >
                    ▶ {gv.action!.label}
                  </button>
                ))}
              </div>
            </div>

            {/* title / current POV */}
            <div
              className="absolute bottom-0 inset-x-0 z-10 px-5 md:px-8 max-w-4xl mx-auto"
              style={{ paddingBottom: "calc(76px + env(safe-area-inset-bottom, 0px))" }}
            >
              {/* portrait: POV pills live in the hero so you can explore without scrolling */}
              {isPortrait && env.views.length > 1 && (
                <motion.div
                  className="flex flex-wrap gap-2 pb-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                >
                  {env.views.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => changeView(v.id)}
                      className={`shrink-0 font-display text-[10px] uppercase tracking-[0.1em] px-3 py-1.5 rounded-full border backdrop-blur-sm transition-colors ${
                        v.id === view.id
                          ? "bg-accent/30 border-pink text-white shadow-[0_0_14px_rgba(255,79,163,0.4)]"
                          : "bg-black/45 border-pink/25 text-cream/80"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </motion.div>
              )}
              <AnimatePresence mode="wait">
                <motion.div
                  key={view.id}
                  initial={{ y: 18, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <span className="case-label text-[10px]">{isStart ? loc.caseLabel : `${loc.name} · ${view.label}`}</span>
                  <h1 className="chrome-text-pink font-display text-[2rem] sm:text-4xl md:text-7xl mt-2 md:mt-3 leading-[0.95]">
                    {isStart ? loc.name : view.label}
                  </h1>
                  <p className="font-whimsy text-pink-light text-sm md:text-base mt-2">
                    {isStart ? (isPortrait ? "✦ pick a view ✦" : "✦ tap a glowing spot to look closer ✦") : loc.neighborhood}
                  </p>
                  {view.action && (
                    <motion.button
                      onClick={() => { trackEvent("pov_action", { location: loc.id, to: view.action!.to }); navigate(view.action!.to); }}
                      className="btn-retro shimmer-sweep mt-5 !text-sm"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.25, type: "spring", stiffness: 240, damping: 16 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      {view.action.shop ? "✦" : "▶"} {view.action.label}
                    </motion.button>
                  )}
                  {/* scroll cue — there's a story below the fold */}
                  <span className="scroll-cue block mt-3 text-pink-light/60 text-sm leading-none" aria-hidden>▾</span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* CONTENT + POV NAV */}
          <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
            {/* reliable POV switcher (works on every device) */}
            <div className="flex flex-wrap gap-2 mb-7">
              {env.views.map((v) => (
                <button
                  key={v.id}
                  onClick={() => changeView(v.id)}
                  className={`font-display text-[11px] uppercase tracking-[0.12em] px-3.5 py-2 rounded-full border transition-colors ${
                    v.id === view.id
                      ? "bg-accent/20 border-pink text-cream"
                      : "bg-black/30 border-pink/20 text-muted-foreground hover:text-pink-light hover:border-pink/40"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* game / experience launchers — always visible in this hood, one per game */}
            {gameViews.map((gv) => (
              <button
                key={gv.id}
                onClick={() => { trackEvent("game_launch", { location: loc.id, to: gv.action!.to }); navigate(gv.action!.to); }}
                className="w-full mb-4 flex items-center justify-between gap-3 rounded-2xl border-2 border-pink/40 bg-gradient-to-r from-[#2a0a28]/80 to-[#12041a]/80 backdrop-blur-md px-5 py-4 text-left transition-all hover:border-pink hover:shadow-[0_0_28px_rgba(255,79,163,0.35)] group"
              >
                <span>
                  <span className="block case-label text-[9px] mb-1">✦ Arcade ✦</span>
                  <span className="block chrome-text-pink font-display text-xl md:text-2xl leading-none">{gv.action!.label}</span>
                  <span className="block font-whimsy text-pink-light/80 text-xs mt-1">a game inside {gv.label}</span>
                </span>
                <span className="btn-retro !text-sm shrink-0 group-hover:scale-105 transition-transform">▶ Play</span>
              </button>
            ))}

            {/* content panel — whatever content goes in slots here */}
            <div className="relative rounded-2xl border-2 border-pink/20 bg-[#0b0714]/80 backdrop-blur-md p-6 md:p-8 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
              <Shape name="sparkle" size={38} rotate={-12} opacity={0.4} float className="absolute right-3 -top-4 z-[2]" />
              <h2 className="chrome-text-pink font-display text-2xl md:text-3xl mb-4 leading-tight">{loc.headline}</h2>
              <p className="font-sans text-cream/85 text-sm md:text-base whitespace-pre-line leading-relaxed mb-6">{loc.body}</p>
              <CaseDetails loc={loc} />
            </div>
          </div>
        </motion.main>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DEFAULT CASE-FILE WINDOW (hoods without pulled environment art yet)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <PageMeta title={`${loc.name} — Truly Young`} description={`${loc.caseLabel}. ${loc.headline}`} />
      <motion.main
        className="relative min-h-screen bg-background grain-overlay player-safe-bottom"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.3 } }}
        transition={{ duration: 0.5 }}
      >
        {loc.backgroundImage && (
          <div className="fixed inset-0 z-0 pointer-events-none">
            <img src={loc.backgroundImage} alt="" aria-hidden className="w-full h-full object-cover opacity-25" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
          </div>
        )}

        <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate("/map")}
            className="font-display text-[11px] uppercase tracking-wider text-muted-foreground hover:text-pink-light transition-colors mb-4"
          >
            ← Back to the Map
          </button>

          <motion.div
            className="retro-window"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 140, damping: 18 }}
          >
            <div className="retro-window-title">
              <span>{loc.caseLabel}</span>
              <button
                onClick={() => navigate("/map")}
                className="text-pink-light hover:text-accent transition-colors text-lg leading-none"
                aria-label="Close case file"
              >
                ✕
              </button>
            </div>

            <div className="relative p-6 md:p-8">
              <Shape name="sparkle" size={40} rotate={-12} opacity={0.4} float className="absolute right-4 top-4 z-[2]" />
              <span className="case-label text-[10px]">{loc.neighborhood}</span>
              <h1 className="chrome-text-pink font-display text-3xl md:text-4xl mt-4 mb-4 leading-tight">{loc.headline}</h1>
              <p className="font-sans text-cream/85 text-sm md:text-base whitespace-pre-line leading-relaxed mb-6">{loc.body}</p>
              <CaseDetails loc={loc} />
            </div>
          </motion.div>
        </div>
      </motion.main>
    </>
  );
};

export default LocationPage;
