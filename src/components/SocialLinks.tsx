import React from "react";
import { motion } from "framer-motion";
import { trackEvent } from "@/lib/analytics";

/**
 * Her links, link-in-bio style — one tap out to every platform, on the front
 * page so nobody has to hunt for them.
 *
 * ⚠️ Every href here was verified live against the platform (Spotify artist id,
 * Apple Music artist id, IG handle, YouTube channel whose latest upload is the
 * "shadows" official video). TIKTOK_URL is the one we could not confirm from
 * outside — drop her handle in and the row lights up automatically.
 */
const TIKTOK_URL: string | null = null;

interface SocialLink {
  id: string;
  label: string;
  handle: string;
  href: string | null;
  icon: React.ReactNode;
}

const Icon: React.FC<{ d: string; viewBox?: string }> = ({ d, viewBox = "0 0 24 24" }) => (
  <svg viewBox={viewBox} className="h-[18px] w-[18px] shrink-0" fill="currentColor" aria-hidden>
    <path d={d} />
  </svg>
);

const LINKS: SocialLink[] = [
  {
    id: "spotify",
    label: "Spotify",
    handle: "Truly Young",
    href: "https://open.spotify.com/artist/6Hqu0lCYGK2QO1vp4rwDMS",
    icon: (
      <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.586 14.424a.623.623 0 0 1-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.623.623 0 1 1-.277-1.215c3.809-.871 7.077-.496 9.712 1.115a.623.623 0 0 1 .207.857zm1.223-2.722a.78.78 0 0 1-1.072.257c-2.688-1.652-6.786-2.131-9.965-1.166a.78.78 0 0 1-.452-1.492c3.632-1.102 8.147-.568 11.232 1.329a.78.78 0 0 1 .257 1.072zm.105-2.835c-3.223-1.914-8.54-2.09-11.617-1.156a.935.935 0 1 1-.542-1.79c3.532-1.072 9.404-.865 13.115 1.338a.935.935 0 1 1-.956 1.608z" />
    ),
  },
  {
    id: "apple-music",
    label: "Apple Music",
    handle: "Truly Young",
    href: "https://music.apple.com/us/artist/truly-young/1148428722",
    icon: (
      <Icon d="M17.1 12.9c-.02-2.26 1.84-3.34 1.93-3.4-1.05-1.54-2.69-1.75-3.27-1.77-1.39-.14-2.72.82-3.43.82-.71 0-1.8-.8-2.96-.78-1.52.02-2.92.88-3.7 2.24-1.58 2.74-.4 6.8 1.13 9.02.75 1.09 1.64 2.31 2.81 2.27 1.13-.05 1.56-.73 2.92-.73 1.36 0 1.75.73 2.94.71 1.21-.02 1.98-1.11 2.72-2.2.86-1.26 1.21-2.48 1.23-2.55-.03-.01-2.36-.91-2.38-3.6l.06-.03zM14.94 5.9c.62-.76 1.04-1.8.93-2.85-.9.04-1.98.6-2.62 1.35-.58.67-1.08 1.74-.95 2.76 1 .08 2.02-.51 2.64-1.26z" />
    ),
  },
  {
    id: "instagram",
    label: "Instagram",
    handle: "@trulyoung",
    href: "https://www.instagram.com/trulyoung",
    icon: (
      <Icon d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.19a6.65 6.65 0 1 0 0 13.3 6.65 6.65 0 0 0 0-13.3zm0 10.97a4.32 4.32 0 1 1 0-8.64 4.32 4.32 0 0 1 0 8.64zm8.46-11.23a1.55 1.55 0 1 1-3.1 0 1.55 1.55 0 0 1 3.1 0z" />
    ),
  },
  {
    id: "tiktok",
    label: "TikTok",
    handle: "@trulyoung",
    href: TIKTOK_URL,
    icon: (
      <Icon d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .77-5.06V9.7a5.67 5.67 0 0 0-.77-.05A5.67 5.67 0 1 0 15.54 15.3V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.28 4.28 0 0 1-3.24-1.48z" />
    ),
  },
  {
    id: "youtube",
    label: "YouTube",
    handle: "@trulyyoung",
    href: "https://www.youtube.com/@trulyyoung",
    icon: (
      <Icon d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2C0 8.09 0 12 0 12s0 3.91.5 5.8a3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14c.5-1.89.5-5.8.5-5.8s0-3.91-.5-5.8zM9.55 15.57V8.43L15.82 12l-6.27 3.57z" />
    ),
  },
];

const SocialLinks: React.FC<{ reduceMotion?: boolean; className?: string }> = ({
  reduceMotion,
  className = "",
}) => (
  <motion.nav
    className={`flex w-full max-w-[19rem] flex-col gap-2 sm:max-w-[21rem] ${className}`}
    initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
    animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
    transition={{ delay: 0.95, duration: 0.5 }}
    aria-label="Truly Young on streaming and social"
  >
    <span className="mb-0.5 text-center font-display text-[10px] uppercase tracking-[0.34em] text-pink-light/80 glitter-glow">
      ✦ find her everywhere ✦
    </span>

    {LINKS.map((l) =>
      l.href ? (
        <a
          key={l.id}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackEvent("social_link", { platform: l.id })}
          className="group flex items-center gap-3 rounded-full border border-pink-light/35 bg-black/45 px-4 py-2.5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-[1px] hover:border-pink-light/80 hover:bg-pink-light/10"
          style={{ boxShadow: "0 0 18px rgba(255,79,163,0.12)" }}
        >
          <span className="text-pink-light transition-colors group-hover:text-white">{l.icon}</span>
          <span className="flex-1 text-left">
            <span className="block font-display text-[12px] uppercase tracking-[0.16em] text-[#ffe3f1]">
              {l.label}
            </span>
            <span className="block font-whimsy text-[11px] leading-none text-pink-light/70">{l.handle}</span>
          </span>
          <span className="font-display text-[11px] text-pink-light/60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-pink-light">
            →
          </span>
        </a>
      ) : (
        <div
          key={l.id}
          className="flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2.5"
        >
          <span className="text-white/35">{l.icon}</span>
          <span className="flex-1 text-left">
            <span className="block font-display text-[12px] uppercase tracking-[0.16em] text-white/45">
              {l.label}
            </span>
            <span className="block font-whimsy text-[11px] leading-none text-white/30">linking soon</span>
          </span>
        </div>
      )
    )}
  </motion.nav>
);

export default SocialLinks;
