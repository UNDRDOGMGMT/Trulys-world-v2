import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageMeta from "@/components/PageMeta";

/**
 * Soft gate for the /world globe while it's still being designed. Clicking the
 * Globe lands here: "access denied — ask Truly for the password". The password
 * unlocks it (stored per-device) and renders the real World page. This is a
 * design-in-progress curtain, not security — the check is intentionally simple.
 */
// Any localhost build (dev server OR vite preview of dist) skips the curtain —
// the password only ever challenges real visitors on the deployed domain.
const IS_LOCAL =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);

const GLOBE_KEY = "tw-globe-unlock";
const GLOBE_PW = "trulysworldduh";

const GlobeGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(() => {
    if (IS_LOCAL) return true; // any local build: no password while building
    try { return localStorage.getItem(GLOBE_KEY) === "1"; } catch { return false; }
  });
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  if (unlocked) return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.trim().toLowerCase() === GLOBE_PW) {
      try { localStorage.setItem(GLOBE_KEY, "1"); } catch { /* ignore */ }
      setUnlocked(true);
    } else {
      setErr(true);
    }
  };

  return (
    <>
      <PageMeta title="The Globe — TRULYS WORLD" description="Truly's World — the globe. Coming soon." />
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#05010a] px-5">
        {/* the map, dimmed + blurred behind the curtain */}
        <div className="absolute inset-0 opacity-30"
             style={{ backgroundImage: "url(/world/maps/la-map-10.jpg)", backgroundSize: "cover", backgroundPosition: "center", filter: "blur(7px)" }}
             aria-hidden />
        <div className="absolute inset-0 bg-black/72" aria-hidden />

        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-sm rounded-2xl border-2 border-pink/40 bg-black/70 backdrop-blur-md px-7 py-8 text-center"
          style={{ boxShadow: "0 0 44px rgba(255,79,163,0.25)" }}
        >
          <div className="text-4xl mb-3" aria-hidden>🔒</div>
          <h1 className="font-display text-2xl text-pink-light glitter-glow mb-1">✦ Access Denied ✦</h1>
          <p className="font-whimsy text-cream/80 text-sm mb-6">Ask Truly for the password.</p>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <input
              type="password" value={pw} autoFocus aria-label="Globe password"
              onChange={(e) => { setPw(e.target.value); setErr(false); }}
              placeholder="password"
              className="w-full rounded-full border-2 border-pink/40 bg-black/45 px-4 py-2.5 text-center font-display text-sm tracking-[0.12em] text-cream placeholder:text-pink-light/45 outline-none focus:border-pink transition-colors"
            />
            <button type="submit" className="btn-retro shimmer-sweep text-sm py-2.5">✦ Enter ✦</button>
            <span className="min-h-[1rem] font-sans text-[12px]" style={{ color: "#ffb3d1" }}>
              {err ? "wrong password — ask Truly ♥" : ""}
            </span>
          </form>
          <button onClick={() => navigate("/map")}
            className="mt-2 font-whimsy text-[12px] text-pink-light/70 hover:text-white transition-colors">
            ← back to the map
          </button>
        </motion.div>
      </div>
    </>
  );
};

export default GlobeGate;
