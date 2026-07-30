import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageMeta from "@/components/PageMeta";
import TrulyList from "@/components/TrulyList";
import { useIsPortrait } from "@/hooks/useIsPortrait";
import {
  shopifyConfigured, fetchProducts, createCheckout,
  type Product, type Variant, type ZoneId,
} from "@/lib/shopify";
import { audit } from "@/lib/audit";
/**
 * TRULY'S WORLD — the West Hollywood boutique.
 *
 * A vintage record shop you walk INTO rather than a product grid: the street,
 * then the room (the real wordmark burning in neon on the back wall), then the
 * three corners — the racks, the record bar, the counter. Each corner is its own
 * illustrated angle with that corner's goods on a rail beneath it.
 *
 * Shopify is the backend (src/lib/shopify.ts). With no credentials the same UI
 * runs the bundled demo catalog and the pre-launch reserve flow, so the room is
 * always browsable.
 */

type View = "street" | "room" | ZoneId;

interface Zone {
  id: ZoneId; label: string; kicker: string; tint: string;
  /** hotspot rect as % of the viewport — landscape, then the portrait plate */
  x: number; y: number; w: number; h: number;
  xP: number; yP: number; wP: number; hP: number;
}

// Rects measured off public/shop/room.jpg (rail left, crates right, case front)
// and the taller room-v.jpg recompose.
const ZONES: Zone[] = [
  { id: "racks",   label: "The Racks",      kicker: "wear it out",     tint: "#ff4fa3",
    x: 0,  y: 18, w: 27, h: 68,   xP: 2,  yP: 32, wP: 30, hP: 32 },
  { id: "records", label: "The Record Bar", kicker: "drop the needle",  tint: "#b07bff",
    x: 62, y: 20, w: 30, h: 50,   xP: 56, yP: 24, wP: 44, hP: 30 },
  { id: "counter", label: "The Counter",    kicker: "small treasures", tint: "#ffcf7a",
    x: 58, y: 66, w: 42, h: 30,   xP: 16, yP: 64, wP: 76, hP: 24 },
];

const ZONE_ART: Record<ZoneId, { land: string; port: string; blurb: string }> = {
  racks:   { land: "/shop/racks.jpg",   port: "/shop/racks-v.jpg",
             blurb: "Brass rail, mismatched hangers, everything cut boxy and washed soft." },
  records: { land: "/shop/records.jpg", port: "/shop/records-v.jpg",
             blurb: "Flip the crates. The turntable's on — headphones are on the hook." },
  counter: { land: "/shop/counter.jpg", port: "/shop/counter-v.jpg",
             blurb: "Under the glass: charms, pins, gloss. Everything gets a ribbon." },
};

/* ---------- demo catalog (stands in until Shopify credentials are set) ---------- */
const SIZES = ["XS", "S", "M", "L", "XL"];
const sized = (price: number): Variant[] =>
  SIZES.map((s) => ({ id: `demo:${s}`, title: s, price, available: true }));
const one = (price: number): Variant[] =>
  [{ id: "demo:one", title: "One size", price, available: true }];

const DEMO: Product[] = [
  { id: "d1", handle: "heart-arrow-tee", zone: "racks", name: "Heart-Arrow Tee", price: 38,
    blurb: "Boxy vintage-wash cotton, the heart-and-arrow crest on the chest.", variants: sized(38) },
  { id: "d2", handle: "dear-joshua-tee", zone: "racks", name: "Dear Joshua Tee", price: 38,
    blurb: "Black tee, the tracklist inked down the back like a letter.", variants: sized(38) },
  { id: "d3", handle: "shadows-hoodie", zone: "racks", name: "Shadows Hoodie", price: 72, tag: "new",
    blurb: "Heavyweight black hoodie — “only, only, in the shadows” on the cuff.", variants: sized(72) },
  { id: "d4", handle: "tw-zip", zone: "racks", name: "Truly's World Zip", price: 78,
    blurb: "Pink zip-up, glitter-flock wordmark, heart-arrow pull tab.", variants: sized(78) },
  { id: "d5", handle: "sindrome-baby-tee", zone: "racks", name: "Imposter Sindrome Baby Tee", price: 36,
    blurb: "Cropped ribbed baby tee in cream — the imprint crest, small.", variants: sized(36) },
  { id: "d6", handle: "slip-dress", zone: "racks", name: "Slip Dress", price: 96, tag: "limited",
    blurb: "Blush satin slip, cut from the one hanging in the window.", variants: sized(96) },

  { id: "d7", handle: "dj-vinyl", zone: "records", name: "Dear Joshua — Pink Vinyl", price: 32, tag: "pre-order",
    blurb: "180g translucent pink. Ships with the drop.", variants: one(32) },
  { id: "d8", handle: "dj-heart-7", zone: "records", name: "Heart-Shaped 7″", price: 28, tag: "limited",
    blurb: "The heart-cut single. Plays properly. Mostly.", variants: one(28) },
  { id: "d9", handle: "dj-cassette", zone: "records", name: "Dear Joshua Cassette", price: 25, tag: "signed",
    blurb: "Pink shell, hand-signed insert, one per order.", variants: one(25) },
  { id: "d10", handle: "tour-poster", zone: "records", name: "Tour Poster (Foil)", price: 28,
    blurb: "Foil-stamped and numbered. The map, the way she drew it.", variants: one(28) },

  { id: "d11", handle: "heart-arrow-pendant", zone: "counter", name: "Heart-Arrow Pendant", price: 48, tag: "limited",
    blurb: "The signature heart, pierced, on a fine chain.", variants: one(48) },
  { id: "d12", handle: "spider-heart-hoops", zone: "counter", name: "Spider-Heart Hoops", price: 34,
    blurb: "Pink enamel hoops with the little spider-heart charm.", variants: one(34) },
  { id: "d13", handle: "shadows-gloss", zone: "counter", name: "Shadows Lip Gloss", price: 22,
    blurb: "Sheer plum high-shine. Wear it where he can't reach you.", variants: one(22) },
  { id: "d14", handle: "pin-set", zone: "counter", name: "Boyfriend Island Pin Set", price: 18,
    blurb: "Three enamel pins — broken heart, tiki, palm.", variants: one(18) },
  { id: "d15", handle: "sticker-sheet", zone: "counter", name: "Sticker Sheet", price: 12,
    blurb: "Die-cut glitter stickers — the whole world in miniature.", variants: one(12) },
  { id: "d16", handle: "tw-tote", zone: "counter", name: "Truly's World Tote", price: 30,
    blurb: "Heavy canvas, screen-printed wordmark. Carries the whole EP.", variants: one(30) },
];

interface Line {
  key: string; variantId: string; name: string; variant: string; price: number; qty: number;
}
const BAG_KEY = "tw-shop-bag";
const money = (n: number) => `$${n.toFixed(0)}`;

/** Stand-in card art until real per-SKU flat-lay photography lands. */
const GLYPH: Record<ZoneId, string[]> = {
  racks: ["♥", "✦", "☾", "✧", "★", "❀"],
  records: ["◉", "♡", "⊞", "▣"],
  counter: ["♥", "✦", "☾", "⚑", "✷", "⬚"],
};

const Boutique: React.FC = () => {
  const navigate = useNavigate();
  const isP = useIsPortrait();
  const [view, setView] = useState<View>("street");
  const [catalog, setCatalog] = useState<Product[]>(DEMO);
  const [live, setLive] = useState(false);
  const [detail, setDetail] = useState<Product | null>(null);
  const [variant, setVariant] = useState<Variant | null>(null);
  const [bag, setBag] = useState<Line[]>(() => {
    try { return JSON.parse(localStorage.getItem(BAG_KEY) || "[]"); } catch { return []; }
  });
  const [bagOpen, setBagOpen] = useState(false);
  const [reserve, setReserve] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastT = useRef<number>();

  useEffect(() => {
    try { localStorage.setItem(BAG_KEY, JSON.stringify(bag)); } catch { /* storage full */ }
  }, [bag]);

  // Live products when Shopify is wired; the demo room stays browsable otherwise.
  useEffect(() => {
    if (!shopifyConfigured) return;
    let ok = true;
    fetchProducts()
      .then((p) => { if (ok && p.length) { setCatalog(p); setLive(true); } })
      .catch(() => { /* keep the demo catalog */ });
    return () => { ok = false; };
  }, []);

  // Warm the next plate so walking through the shop never shows a blank frame.
  useEffect(() => {
    const srcs = view === "street"
      ? [isP ? "/shop/room-v.jpg" : "/shop/room.jpg"]
      : Object.values(ZONE_ART).map((z) => (isP ? z.port : z.land));
    srcs.forEach((s) => { const i = new Image(); i.src = s; });
  }, [view, isP]);

  const say = useCallback((m: string) => {
    setToast(m);
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast(null), 1900);
  }, []);

  const bagCount = bag.reduce((n, l) => n + l.qty, 0);
  const subtotal = bag.reduce((n, l) => n + l.price * l.qty, 0);

  const openDetail = (p: Product) => {
    setDetail(p);
    setVariant(p.variants.find((v) => v.available) || p.variants[0] || null);
  };

  const addToBag = () => {
    if (!detail || !variant) return;
    const key = `${detail.id}::${variant.id}`;
    setBag((b) => {
      const i = b.findIndex((l) => l.key === key);
      if (i >= 0) { const c = [...b]; c[i] = { ...c[i], qty: c[i].qty + 1 }; return c; }
      return [...b, { key, variantId: variant.id, name: detail.name,
                      variant: variant.title, price: variant.price, qty: 1 }];
    });
    say(`${detail.name} — in the bag`);
    setDetail(null);
  };
  const setQty = (key: string, d: number) =>
    setBag((b) => b.flatMap((l) => (l.key === key ? (l.qty + d <= 0 ? [] : [{ ...l, qty: l.qty + d }]) : [l])));

  const checkout = async () => {
    if (!live) {
      audit('boutique.reserve', {
        lines: bag.map((l) => ({ variantId: l.variantId, qty: l.qty, name: l.name })),
        subtotal: bag.reduce((s, l) => s + l.price * l.qty, 0),
      });
      setReserve(true);
      return;
    }
    setBusy(true);
    try {
      const url = await createCheckout(bag.map((l) => ({ variantId: l.variantId, qty: l.qty })));
      audit('boutique.checkout', {
        lines: bag.map((l) => ({ variantId: l.variantId, qty: l.qty, name: l.name })),
        ok: true,
      });
      window.location.href = url;
    } catch {
      audit('boutique.checkout', { ok: false });
      setBusy(false);
      say("checkout hiccuped — try again");
    }
  };

  const zone: ZoneId | null = view === "street" || view === "room" ? null : view;
  const zoneMeta = zone ? ZONES.find((z) => z.id === zone)! : null;
  const plate =
    view === "street" ? (isP ? "/shop/exterior-v.jpg" : "/shop/exterior.jpg")
    : view === "room" ? (isP ? "/shop/room-v.jpg" : "/shop/room.jpg")
    : (isP ? ZONE_ART[view].port : ZONE_ART[view].land);

  return (
    <>
      <PageMeta
        title="The Store — TRULYS WORLD"
        description="The Store — Truly's World's vintage record shop on a West Hollywood side street. Push the door, flip the crates, take something home."
      />
      <div className="fixed inset-0 overflow-hidden bg-[#0c0618] text-[#f2ead8] select-none">
        {/* ---------- the room itself ---------- */}
        <AnimatePresence mode="wait">
          <motion.div
            key={plate}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: view === "street" ? 1 : 1.07 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <img src={plate} alt="" className="w-full h-full object-cover" draggable={false} />
            <div className="absolute inset-0 pointer-events-none"
                 style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 48%, rgba(8,4,16,.78) 100%)" }} />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 pointer-events-none opacity-[.26] mix-blend-overlay"
             style={{ background: "repeating-linear-gradient(180deg,transparent 0 2px,rgba(0,0,0,.5) 3px)" }} />

        {/* ---------- street: the door ---------- */}
        {view === "street" && (
          <motion.div className="absolute inset-0 flex flex-col items-center justify-end pb-[9vh] px-6 text-center"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7 }}>
            <div className="absolute inset-x-0 bottom-0 h-[62%] pointer-events-none"
                 style={{ background: "linear-gradient(to top, #0c0618 6%, rgba(12,6,24,.92) 34%, rgba(12,6,24,.55) 62%, transparent 100%)" }} />
            <div className="relative">
            <div className="font-mono text-[10px] tracking-[0.34em] uppercase text-[#b07bff] mb-3">
              West Hollywood · open late
            </div>
            <h1 className="font-display text-[clamp(2.2rem,7vw,4.5rem)] leading-[0.95] text-[#ff4fa3]"
                style={{ textShadow: "0 0 30px rgba(255,79,163,.55)" }}>
              THE STORE
            </h1>
            <p className="font-mono text-[clamp(11px,1.6vw,14px)] text-[#d3c4ea] max-w-[38ch] leading-relaxed mt-3">
              Her shop is a room, not a website. Push the door.
            </p>
            <button onClick={() => setView("room")}
              className="mt-6 font-display text-sm sm:text-base tracking-[0.12em] text-[#2a1730] bg-[#ffcf7a] rounded-full px-9 py-3.5
                         shadow-[0_0_28px_rgba(255,207,122,.5)] hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(255,207,122,.85)] transition-all">
              ▸ step inside
            </button>
            </div>
          </motion.div>
        )}

        {/* ---------- room: pick a corner ---------- */}
        {view === "room" && (
          <>
            {ZONES.map((z, i) => {
              const r = isP
                ? { left: `${z.xP}%`, top: `${z.yP}%`, width: `${z.wP}%`, height: `${z.hP}%` }
                : { left: `${z.x}%`,  top: `${z.y}%`,  width: `${z.w}%`,  height: `${z.h}%` };
              return (
                <motion.button key={z.id} onClick={() => setView(z.id)} aria-label={z.label}
                  className="absolute group" style={r}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.1 }}>
                  <span className="absolute inset-[6%] rounded-[22px] border-2 border-transparent opacity-0
                                   group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300"
                        style={{ borderColor: z.tint, boxShadow: `0 0 34px ${z.tint}55, inset 0 0 40px ${z.tint}22` }} />
                  <span className="absolute left-1/2 -translate-x-1/2 bottom-[8%] whitespace-nowrap
                                   opacity-75 group-hover:opacity-100 transition-opacity">
                    <span className="block font-display text-[clamp(13px,1.7vw,19px)] tracking-[0.08em]"
                          style={{ color: z.tint, textShadow: `0 0 18px ${z.tint}aa, 0 2px 10px rgba(6,3,12,.95), 0 0 3px rgba(6,3,12,.9)` }}>{z.label}</span>
                    <span className="block font-mono text-[9px] tracking-[0.24em] uppercase text-[#e6dcf5]"
                          style={{ textShadow: "0 2px 8px rgba(6,3,12,.95)" }}>{z.kicker}</span>
                  </span>
                </motion.button>
              );
            })}
            <motion.div className="absolute left-1/2 -translate-x-1/2 bottom-[1.6vh] font-mono text-[10px]
                                   tracking-[0.26em] uppercase text-[#8a7ba8] pointer-events-none"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              pick a corner
            </motion.div>
          </>
        )}

        {/* ---------- a corner: the goods on a rail ---------- */}
        {zone && zoneMeta && (
          <motion.div className="absolute inset-x-0 bottom-0 z-20"
            initial={{ y: "40%", opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}>
            <div className="px-4 sm:px-8 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-16"
                 style={{ background: "linear-gradient(to top, #0c0618 34%, rgba(12,6,24,.94) 62%, rgba(12,6,24,.6) 82%, transparent 100%)" }}>
              <div className="flex items-end justify-between gap-4 mb-3 max-w-6xl mx-auto">
                <div>
                  <h2 className="font-display text-[clamp(1.2rem,3vw,2rem)] leading-none"
                      style={{ color: zoneMeta.tint, textShadow: "0 2px 12px rgba(6,3,12,.95)" }}>
                    {zoneMeta.label}
                  </h2>
                  <p className="font-mono text-[11px] text-[#a898c4] mt-1 max-w-[46ch]">{ZONE_ART[zone].blurb}</p>
                </div>
                <span className="shrink-0 font-mono text-[10px] tracking-[0.2em] uppercase text-[#7a6b96]">
                  {catalog.filter((p) => p.zone === zone).length} pieces
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 max-w-6xl mx-auto snap-x
                              [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {catalog.filter((p) => p.zone === zone).map((p, i) => (
                  <button key={p.id} onClick={() => openDetail(p)}
                    className="snap-start shrink-0 w-[43vw] sm:w-[210px] text-left group">
                    <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-white/12
                                    bg-[#1a1030] group-hover:border-white/35 transition-colors">
                      {p.image ? (
                        <img src={p.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[42px]"
                             style={{ background: `radial-gradient(circle at 50% 40%, ${zoneMeta.tint}33, #150a22 72%)`,
                                      color: zoneMeta.tint }}>
                          {GLYPH[zone][i % GLYPH[zone].length]}
                        </div>
                      )}
                      {p.tag && (
                        <span className="absolute top-2 left-2 font-mono text-[8px] tracking-[0.18em] uppercase
                                         px-2 py-1 rounded-full bg-black/65 text-[#ffcf7a] border border-[#ffcf7a55]">
                          {p.tag}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <span className="font-display text-[13px] leading-tight text-[#f2ead8] truncate">{p.name}</span>
                      <span className="font-mono text-[12px] text-[#ffcf7a] shrink-0">{money(p.price)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ---------- chrome ---------- */}
        <div className="absolute top-0 inset-x-0 z-30 flex items-start justify-between p-3 sm:p-5"
             style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
          <button
            onClick={() => (view === "street" ? navigate("/location/weho") : setView(view === "room" ? "street" : "room"))}
            className="font-mono text-[10px] tracking-[0.18em] uppercase text-white/70 hover:text-white
                       border border-white/20 rounded-full px-3.5 py-2 bg-black/45 backdrop-blur-sm transition-colors">
            {view === "street" ? "← weho" : view === "room" ? "← the street" : "← the room"}
          </button>
          <button onClick={() => setBagOpen(true)}
            className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#2a1730] bg-[#ffcf7a]
                       rounded-full px-4 py-2 shadow-[0_0_20px_rgba(255,207,122,.45)]">
            bag{bagCount > 0 && <span className="ml-1">· {bagCount}</span>}
          </button>
        </div>

        {/* ---------- product sheet ---------- */}
        <AnimatePresence>
          {detail && (
            <motion.div className="absolute inset-0 z-40 flex items-end sm:items-center justify-center sm:p-6"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px]" onClick={() => setDetail(null)} />
              <motion.div className="relative w-full sm:max-w-md bg-[#150a22] border border-white/15
                                     rounded-t-3xl sm:rounded-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
                initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: "spring", damping: 26 }}>
                <div className="font-mono text-[9px] tracking-[0.3em] uppercase text-[#b07bff]">
                  {ZONES.find((z) => z.id === detail.zone)?.label}
                </div>
                <h3 className="font-display text-2xl mt-1 text-[#ff4fa3]">{detail.name}</h3>
                <p className="font-mono text-[12px] text-[#d3c4ea] leading-relaxed mt-2">{detail.blurb}</p>
                {detail.variants.length > 1 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {detail.variants.map((v) => (
                      <button key={v.id} disabled={!v.available} onClick={() => setVariant(v)}
                        className={`font-mono text-[11px] px-3 py-1.5 rounded-full border transition-colors
                          ${variant?.id === v.id ? "border-[#ff4fa3] text-[#ff4fa3] bg-[#ff4fa314]"
                                                 : "border-white/20 text-white/70 hover:border-white/45"}
                          ${!v.available ? "opacity-35 line-through cursor-not-allowed" : ""}`}>
                        {v.title}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-6">
                  <span className="font-mono text-xl text-[#ffcf7a]">{money(variant?.price ?? detail.price)}</span>
                  <button onClick={addToBag} disabled={!variant?.available}
                    className="font-display text-sm tracking-[0.1em] text-[#2a1730] bg-[#ffcf7a] rounded-full px-7 py-3
                               shadow-[0_0_22px_rgba(255,207,122,.45)] disabled:opacity-40">
                    add to bag
                  </button>
                </div>
                <button onClick={() => setDetail(null)} aria-label="close"
                  className="absolute top-4 right-5 text-white/50 hover:text-white text-lg leading-none">✕</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- bag ---------- */}
        <AnimatePresence>
          {bagOpen && (
            <motion.div className="absolute inset-0 z-50 flex justify-end"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px]" onClick={() => setBagOpen(false)} />
              <motion.aside className="relative w-full sm:w-[400px] h-full bg-[#150a22] border-l border-white/15 flex flex-col"
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28 }}>
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                  <h3 className="font-display text-xl text-[#ff4fa3]">Your bag</h3>
                  <button onClick={() => setBagOpen(false)} aria-label="close" className="text-white/50 hover:text-white text-lg">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {bag.length === 0 && (
                    <p className="font-mono text-[12px] text-[#8a7ba8]">Nothing yet. The racks are on your left.</p>
                  )}
                  {bag.map((l) => (
                    <div key={l.key} className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="font-display text-[14px] text-[#f2ead8]">{l.name}</div>
                        <div className="font-mono text-[10px] text-[#8a7ba8] uppercase tracking-[0.16em]">{l.variant}</div>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[12px]">
                        <button onClick={() => setQty(l.key, -1)} aria-label="less"
                          className="w-6 h-6 rounded-full border border-white/20 hover:border-white/50">−</button>
                        <span className="w-4 text-center">{l.qty}</span>
                        <button onClick={() => setQty(l.key, 1)} aria-label="more"
                          className="w-6 h-6 rounded-full border border-white/20 hover:border-white/50">+</button>
                      </div>
                      <div className="font-mono text-[12px] text-[#ffcf7a] w-12 text-right">{money(l.price * l.qty)}</div>
                    </div>
                  ))}
                </div>
                <div className="p-5 border-t border-white/10 space-y-3"
                     style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}>
                  <div className="flex justify-between items-baseline font-mono text-[13px]">
                    <span className="text-[#8a7ba8] uppercase tracking-[0.18em] text-[10px]">Subtotal</span>
                    <span className="text-[#ffcf7a]">{money(subtotal)}</span>
                  </div>
                  <button onClick={checkout} disabled={bag.length === 0 || busy}
                    className="w-full font-display text-sm tracking-[0.1em] text-[#2a1730] bg-[#ffcf7a] rounded-full py-3.5
                               shadow-[0_0_22px_rgba(255,207,122,.45)] disabled:opacity-35">
                    {busy ? "opening checkout…" : live ? "checkout" : "reserve your bag"}
                  </button>
                  <p className="font-mono text-[9px] text-[#7a6b96] text-center leading-relaxed">
                    {live ? "Secure checkout on Shopify." : "The Store opens with the EP — reserve now and we'll hold it."}
                  </p>
                </div>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- pre-launch reserve ---------- */}
        <AnimatePresence>
          {reserve && (
            <motion.div className="absolute inset-0 z-[60] flex items-center justify-center p-6 overflow-y-auto"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setReserve(false)} />
              <div className="relative w-full max-w-sm bg-[#150a22] border border-white/15 rounded-3xl p-7 text-center my-auto">
                <h3 className="font-display text-2xl text-[#ff4fa3]">Held for you</h3>
                <p className="font-mono text-[12px] text-[#d3c4ea] mt-2 leading-relaxed">
                  {bagCount} {bagCount === 1 ? "piece" : "pieces"} · {money(subtotal)}. Leave your email and you get
                  the door code the hour the shop opens.
                </p>
                <div className="mt-5"><TrulyList /></div>
                <button onClick={() => setReserve(false)}
                  className="mt-4 font-mono text-[10px] tracking-[0.18em] uppercase text-white/50 hover:text-white">
                  keep browsing
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- toast ---------- */}
        <AnimatePresence>
          {toast && (
            <motion.div className="absolute left-1/2 -translate-x-1/2 bottom-[16vh] z-[70] pointer-events-none
                                   font-mono text-[11px] px-4 py-2 rounded-full bg-black/75 border border-[#ff4fa355] text-[#ff9ccb]"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default Boutique;
