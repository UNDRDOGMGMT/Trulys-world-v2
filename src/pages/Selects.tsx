import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageMeta from "@/components/PageMeta";

/**
 * Dear Joshua · Selects — the Silver Lake "inner circle" photo board.
 * A Pinterest-style masonry wall of the Dear Joshua selects (shot by Amber
 * Asaly), free to download. Images + dims come from /selects/manifest.json so
 * the board is data-driven — drop new frames in public/selects and rebuild.
 */

interface Shot { src: string; w: number; h: number; }
const AMBER_IG = "https://www.instagram.com/amberasaly/";

const Selects: React.FC = () => {
  const navigate = useNavigate();
  const [shots, setShots] = useState<Shot[]>([]);
  const [lightbox, setLightbox] = useState<Shot | null>(null);

  useEffect(() => {
    fetch("/selects/manifest.json").then((r) => (r.ok ? r.json() : [])).then(setShots).catch(() => setShots([]));
  }, []);

  const download = (src: string) => {
    const a = document.createElement("a");
    a.href = src;
    a.download = src.split("/").pop() || "dear-joshua.jpg";
    document.body.appendChild(a); a.click(); a.remove();
  };

  return (
    <>
      <PageMeta
        title="Dear Joshua · Selects — Photos by Amber Asaly — TRULYS WORLD"
        description="The Dear Joshua photo board, shot by Amber Asaly. Free to download."
      />
      <main className="relative min-h-[100dvh] w-full bg-[#0a0510] text-white grain-overlay">
        {/* header */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b-2 border-pink/20 bg-[#0a0510]/90 px-4 py-3 backdrop-blur-md"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <button
            onClick={() => navigate("/location/silverlake")}
            className="shrink-0 font-display text-[10px] uppercase tracking-[0.16em] text-pink-light/85 hover:text-white bg-black/40 border border-pink/30 rounded-full px-3.5 py-1.5 transition-colors"
          >
            ← Silver Lake
          </button>
          <div className="min-w-0 text-center">
            <h1 className="chrome-text-pink font-display text-lg md:text-2xl leading-none">Dear Joshua · Selects</h1>
            <a
              href={AMBER_IG} target="_blank" rel="noopener noreferrer"
              className="font-whimsy text-[11px] md:text-xs text-pink-light/80 hover:text-white transition-colors"
            >
              ✦ photos by Amber Asaly · @amberasaly →
            </a>
          </div>
          <span className="shrink-0 w-[86px] hidden sm:block" aria-hidden />
        </header>

        <p className="px-5 pt-4 text-center font-whimsy text-[12px] text-white/50">
          tap any photo to download
        </p>

        {/* masonry board */}
        <div className="px-3 py-4 md:px-6">
          {shots.length === 0 ? (
            <p className="py-20 text-center font-whimsy text-sm text-white/40">loading the board…</p>
          ) : (
            <div className="mx-auto max-w-6xl [column-gap:12px] [column-count:2] md:[column-count:3] lg:[column-count:4]">
              {shots.map((s, i) => (
                <motion.figure
                  key={s.src}
                  className="group relative mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-pink/20 bg-black/30"
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "120px" }}
                  transition={{ duration: 0.4, delay: (i % 8) * 0.03 }}
                >
                  <button onClick={() => setLightbox(s)} className="block w-full" aria-label="View photo">
                    <img
                      src={s.src} alt={`Dear Joshua select ${i + 1}`} loading="lazy" draggable={false}
                      width={s.w} height={s.h}
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      style={{ aspectRatio: `${s.w} / ${s.h}` }}
                    />
                  </button>
                  {/* download affordance */}
                  <div className="pointer-events-none absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/55 via-transparent to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); download(s.src); }}
                      className="pointer-events-auto rounded-full border border-pink/50 bg-black/70 px-3 py-1.5 font-display text-[10px] uppercase tracking-wider text-pink-light hover:text-white hover:border-pink transition-colors backdrop-blur-sm"
                    >
                      ↓ save
                    </button>
                  </div>
                </motion.figure>
              ))}
            </div>
          )}
        </div>

        {/* footer credit */}
        <footer className="border-t border-pink/15 px-5 py-8 text-center">
          <p className="font-display text-[11px] uppercase tracking-[0.2em] text-white/45">Dear Joshua — the EP</p>
          <a href={AMBER_IG} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block font-whimsy text-sm text-pink-light hover:text-white transition-colors">
            photography by Amber Asaly · @amberasaly →
          </a>
        </footer>

        {/* lightbox */}
        {lightbox && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => setLightbox(null)}
          >
            <img src={lightbox.src} alt="Dear Joshua select" className="max-h-[86dvh] max-w-full rounded-xl object-contain" style={{ aspectRatio: `${lightbox.w} / ${lightbox.h}` }} onClick={(e) => e.stopPropagation()} />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 p-5" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
              <button onClick={(e) => { e.stopPropagation(); download(lightbox.src); }} className="btn-retro shimmer-sweep !text-sm !px-6 !py-2.5">↓ Save Photo</button>
              <button onClick={() => setLightbox(null)} className="rounded-full border border-white/30 bg-black/50 px-5 py-2.5 font-display text-[11px] uppercase tracking-wider text-white/80 hover:text-white">close ✕</button>
            </div>
            <a href={AMBER_IG} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="absolute left-1/2 top-4 -translate-x-1/2 font-whimsy text-[11px] text-pink-light/80 hover:text-white">© Amber Asaly · @amberasaly</a>
          </motion.div>
        )}
      </main>
    </>
  );
};

export default Selects;
