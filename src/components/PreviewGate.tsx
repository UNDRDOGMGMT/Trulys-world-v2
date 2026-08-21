import React, { useState } from "react";

/**
 * Approval-link curtain. Vercel preview URLs (*.vercel.app) get a simple
 * password prompt so builds can be shared for sign-off without being public.
 * The real domain (trulys.world) and localhost never see this — it is a
 * sharing courtesy, not security.
 */
const PREVIEW_PW = "undrdog";
const KEY = "tw-preview-ok";
const IS_PREVIEW_HOST =
  typeof window !== "undefined" && window.location.hostname.endsWith(".vercel.app");

const PreviewGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ok, setOk] = useState(() => {
    if (!IS_PREVIEW_HOST) return true;
    try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; }
  });
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  if (ok) return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.trim().toLowerCase() === PREVIEW_PW) {
      try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
      setOk(true);
    } else {
      setErr(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-[#05010a] px-5">
      <div className="w-full max-w-sm rounded-2xl border-2 border-pink/40 bg-black/70 px-7 py-8 text-center"
           style={{ boxShadow: "0 0 44px rgba(255,79,163,0.25)" }}>
        <div className="text-3xl mb-3" aria-hidden>🕷️</div>
        <h1 className="font-display text-xl text-pink-light mb-1">✦ Preview Build ✦</h1>
        <p className="font-whimsy text-cream/80 text-sm mb-6">For approval only.</p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="password" value={pw} autoFocus aria-label="Preview password"
            onChange={(e) => { setPw(e.target.value); setErr(false); }}
            placeholder="password"
            className="w-full rounded-full border-2 border-pink/40 bg-black/45 px-4 py-2.5 text-center font-display text-sm tracking-[0.12em] text-cream placeholder:text-pink-light/45 outline-none focus:border-pink transition-colors"
          />
          <button type="submit" className="btn-retro shimmer-sweep text-sm py-2.5">✦ Enter ✦</button>
          <span className="min-h-[1rem] font-sans text-[12px]" style={{ color: "#ffb3d1" }}>
            {err ? "wrong password ♥" : ""}
          </span>
        </form>
      </div>
    </div>
  );
};

export default PreviewGate;
