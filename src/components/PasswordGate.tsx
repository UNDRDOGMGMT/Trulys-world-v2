import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

/**
 * Reusable password curtain for "hold it back until launch" surfaces (the globe,
 * the EP player). Same password everywhere, but each gate keeps its own unlock
 * key so unlocking one surface doesn't reveal the others. Not security — a soft
 * curtain while something is still being held.
 */
const DEFAULT_PW = "trulysworldduh";

type Props = {
  storageKey: string;
  children: React.ReactNode;
  password?: string;
  title?: string;
  subtitle?: string;
  lockIcon?: string;
  /** full-screen curtain vs. an inline card that fills its container */
  fullscreen?: boolean;
  backTo?: string;
  backLabel?: string;
  bgImage?: string;
};

const PasswordGate: React.FC<Props> = ({
  storageKey,
  children,
  password = DEFAULT_PW,
  title = "✦ Access Denied ✦",
  subtitle = "Ask Truly for the password.",
  lockIcon = "🔒",
  fullscreen = false,
  backTo,
  backLabel = "← back to the map",
  bgImage,
}) => {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(() => {
    if (import.meta.env.DEV) return true; // localhost: never gate while building
    try { return localStorage.getItem(storageKey) === "1"; } catch { return false; }
  });
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  if (unlocked) return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.trim().toLowerCase() === password.toLowerCase()) {
      try { localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
      setUnlocked(true);
    } else {
      setErr(true);
    }
  };

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-sm rounded-2xl border-2 border-pink/40 bg-black/70 backdrop-blur-md px-7 py-8 text-center"
      style={{ boxShadow: "0 0 44px rgba(255,79,163,0.25)" }}
    >
      <div className="text-4xl mb-3" aria-hidden>{lockIcon}</div>
      <h2 className="font-display text-2xl text-pink-light glitter-glow mb-1">{title}</h2>
      <p className="font-whimsy text-cream/80 text-sm mb-6">{subtitle}</p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="password" value={pw} autoFocus aria-label="Password"
          onChange={(e) => { setPw(e.target.value); setErr(false); }}
          placeholder="password"
          className="w-full rounded-full border-2 border-pink/40 bg-black/45 px-4 py-2.5 text-center font-display text-sm tracking-[0.12em] text-cream placeholder:text-pink-light/45 outline-none focus:border-pink transition-colors"
        />
        <button type="submit" className="btn-retro shimmer-sweep text-sm py-2.5">✦ Enter ✦</button>
        <span className="min-h-[1rem] font-sans text-[12px]" style={{ color: "#ffb3d1" }}>
          {err ? "wrong password — ask Truly ♥" : ""}
        </span>
      </form>
      {backTo && (
        <button onClick={() => navigate(backTo)}
          className="mt-2 font-whimsy text-[12px] text-pink-light/70 hover:text-white transition-colors">
          {backLabel}
        </button>
      )}
    </motion.div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#05010a] px-5">
        {bgImage && (
          <div className="absolute inset-0 opacity-30"
               style={{ backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(7px)" }}
               aria-hidden />
        )}
        <div className="absolute inset-0 bg-black/72" aria-hidden />
        {card}
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-2xl border-2 border-pink/20 bg-black/40 px-5 py-12 min-h-[420px]">
      <div className="absolute inset-0 bg-gradient-to-b from-pink/10 to-transparent" aria-hidden />
      {card}
    </div>
  );
};

export default PasswordGate;
