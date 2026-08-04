import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageMeta from "@/components/PageMeta";
import Logo from "@/components/Logo";
import { supabase, supabaseConfigured } from "@/lib/supabase";

/**
 * RSVP for the Aug 8 LA show. Public (no login). Each submission is emailed to
 * hi@trulys.world via Web3Forms AND saved to the Supabase `rsvps` table. Truly's
 * team approves manually and replies with the confirmation + location.
 *
 * Setup: set VITE_WEB3FORMS_KEY to the free access key issued for hi@trulys.world
 * (web3forms.com → enter hi@trulys.world → paste the key it emails you).
 */
const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined;
const EVENT_LABEL = "Truly Young — Live · August 8 · Los Angeles";

const Rsvp: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState("0");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!name.trim() || !email.trim()) { setErr("Name and email are required ♥"); return; }
    setBusy(true);
    try {
      const guestsN = Math.max(0, Math.min(10, parseInt(guests, 10) || 0));
      let emailOk = false;
      let dbOk = false;

      // 1) email hi@trulys.world (Web3Forms). Use FormData (a "simple" request) so
      // the browser skips the JSON preflight that their endpoint rejects with CORS.
      if (WEB3FORMS_KEY) {
        try {
          const fd = new FormData();
          fd.append("access_key", WEB3FORMS_KEY);
          fd.append("subject", `New RSVP — Aug 8 LA — ${name.trim()}`);
          fd.append("from_name", "Truly's World RSVP");
          fd.append("replyto", email.trim());
          fd.append("Event", EVENT_LABEL);
          fd.append("Name", name.trim());
          fd.append("Email", email.trim());
          fd.append("Guests (plus)", String(guestsN));
          fd.append("Phone / IG", contact.trim() || "—");
          fd.append("Note", note.trim() || "—");
          fd.append("botcheck", "");
          const r = await fetch("https://api.web3forms.com/submit", { method: "POST", body: fd });
          const j = await r.json().catch(() => null);
          emailOk = !!(j && j.success);
        } catch { /* fall back to the DB record */ }
      }

      // 2) durable record for the approval list
      if (supabaseConfigured) {
        try {
          const { error } = await supabase.from("rsvps").insert({
            name: name.trim(),
            email: email.trim(),
            guests: guestsN,
            contact: contact.trim(),
            note: note.trim(),
            event: "aug-8-la",
          });
          dbOk = !error;
        } catch { /* fall back to the email */ }
      }

      // succeed if EITHER path captured the RSVP
      if (!emailOk && !dbOk) throw new Error("Couldn't send your RSVP — please try again in a moment.");
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something glitched — try again in a sec.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageMeta title="RSVP — Truly Young Live · Aug 8" description="RSVP for Truly Young's LA show on August 8. Location revealed on approval." />
      <main className="relative min-h-[100dvh] w-full bg-background grain-overlay flex flex-col items-center px-5 py-10">
        <div className="pink-aura absolute left-1/2 top-24 -translate-x-1/2 h-72 w-72" aria-hidden />

        <button onClick={() => navigate("/")} aria-label="Home" className="relative z-10 mb-6">
          <Logo size="md" />
        </button>

        <motion.div
          className="relative z-10 w-full max-w-md rounded-3xl border-2 border-pink/30 bg-black/55 backdrop-blur-md glitter-border px-6 py-8"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        >
          {done ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3" aria-hidden>💌</div>
              <h1 className="chrome-text-pink font-display text-3xl leading-none mb-3">You're on the list</h1>
              <p className="font-body text-sm text-cream/80 leading-snug">
                RSVPs are approved by hand. If you're in, we'll email you the confirmation and the
                location before the show. Keep an eye on your inbox ♥
              </p>
              <button onClick={() => navigate("/map")} className="btn-retro shimmer-sweep mt-7 text-sm">
                ✦ Explore Truly's World ✦
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <span className="case-label text-[10px]">✦ The Show ✦</span>
                <h1 className="chrome-text-pink font-display text-3xl md:text-4xl leading-none mt-3">RSVP</h1>
                <p className="font-whimsy text-pink-light text-sm mt-3">
                  Truly Young — live in LA · August 8
                </p>
                <p className="font-body text-[12px] text-cream/60 mt-1">
                  Limited capacity · location revealed on approval
                </p>
              </div>

              <form onSubmit={submit} className="flex flex-col gap-3">
                <Field label="Name" value={name} onChange={setName} placeholder="Your name" required />
                <Field label="Email" value={email} onChange={setEmail} placeholder="you@email.com" type="email" required />
                <div className="flex flex-col gap-1">
                  <label className="font-display text-[10px] uppercase tracking-[0.18em] text-pink-light/80">Bringing anyone?</label>
                  <select
                    value={guests} onChange={(e) => setGuests(e.target.value)}
                    className="w-full rounded-xl border-2 border-pink/30 bg-black/45 px-3.5 py-2.5 font-body text-sm text-cream outline-none focus:border-pink transition-colors"
                  >
                    <option value="0">Just me</option>
                    <option value="1">+1 guest</option>
                    <option value="2">+2 guests</option>
                    <option value="3">+3 guests</option>
                  </select>
                </div>
                <Field label="Phone or IG (optional)" value={contact} onChange={setContact} placeholder="@handle or number" />
                <Field label="Note (optional)" value={note} onChange={setNote} placeholder="anything you want us to know" />

                <span className="min-h-[1rem] text-center font-body text-[12px]" style={{ color: "#ffb3d1" }}>
                  {err || ""}
                </span>

                <button type="submit" disabled={busy} className="btn-retro shimmer-sweep text-sm py-3 disabled:opacity-60">
                  {busy ? "Sending…" : "✦ Request RSVP ✦"}
                </button>
                <p className="text-center font-body text-[11px] text-cream/45 mt-1">
                  Requests are reviewed by hand — approval + location come by email.
                </p>
              </form>
            </>
          )}
        </motion.div>
      </main>
    </>
  );
};

const Field: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}> = ({ label, value, onChange, placeholder, type = "text", required }) => (
  <div className="flex flex-col gap-1">
    <label className="font-display text-[10px] uppercase tracking-[0.18em] text-pink-light/80">
      {label}{required && <span className="text-pink"> *</span>}
    </label>
    <input
      type={type} value={value} required={required} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border-2 border-pink/30 bg-black/45 px-3.5 py-2.5 font-body text-sm text-cream placeholder:text-pink-light/35 outline-none focus:border-pink transition-colors"
    />
  </div>
);

export default Rsvp;
