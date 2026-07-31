import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageMeta from '@/components/PageMeta';
import { useMember } from '@/contexts/MemberContext';

const Account: React.FC = () => {
  const navigate = useNavigate();
  const { member, logOut } = useMember();

  // not signed in → the gate owns access; send them home
  if (!member) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-background text-center px-6">
        <span className="font-whimsy text-xl text-pink-light glitter-glow">✦ members only ✦</span>
        <button onClick={() => navigate('/')} className="btn-retro px-8 py-3 text-sm">✧ join truly’s world ✧</button>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Your Truly’s World — Members" description="Your Truly's World member account." />
      <main className="relative min-h-screen bg-background grain-overlay player-safe-bottom">
        {/* top bar */}
        <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <button onClick={() => navigate('/map')} className="font-display text-[11px] uppercase tracking-[0.14em] text-cream/85 hover:text-white bg-black/45 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm">← Map</button>
          <button onClick={() => { logOut(); window.location.assign('/'); }} className="font-display text-[11px] uppercase tracking-[0.14em] text-cream/70 hover:text-white bg-black/45 border border-white/15 rounded-full px-3 py-1.5 backdrop-blur-sm">Log out</button>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 pt-20 pb-10">
          {/* ── MEMBER CARD ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl border-2 border-pink/40 p-6 md:p-8 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.85)]"
            style={{ backgroundImage: "linear-gradient(150deg, rgba(43,10,40,0.86), rgba(12,4,26,0.92)), url('/member/card.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="pink-aura absolute -right-16 -top-16 opacity-40" aria-hidden />
            <span className="case-label text-[10px]">✦ Truly’s World Member ✦</span>
            <h1 className="chrome-text-pink font-display text-4xl md:text-5xl leading-none mt-2">{member.first} {member.last}</h1>
            <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-3">
              <div>
                <div className="font-display text-sm text-cream/85 break-all">{member.email}</div>
                <div className="case-label text-[9px] mt-1">member</div>
              </div>
              <div className="ml-auto text-right">
                <div className="font-whimsy text-[12px] text-cream/60">member since</div>
                <div className="font-display text-sm text-cream/85">{new Date(member.memberSince).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</div>
              </div>
            </div>
          </motion.div>

          {/* ── REWARDS & POINTS — COMING SOON ── */}
          <div className="mt-8 rounded-2xl border-2 border-pink/30 bg-gradient-to-br from-[#2a0a28]/60 to-[#12041a]/70 p-8 backdrop-blur-md text-center">
            <span className="case-label text-[10px]">✦ Rewards &amp; Points</span>
            <h2 className="chrome-text-pink font-display text-3xl md:text-4xl mt-2">Coming Soon</h2>
            <p className="font-whimsy text-sm text-pink-light/75 mt-2 max-w-prose mx-auto">
              Points, tiers, and member rewards are on the way — play the games, explore the world, and everything you earn will land right here.
            </p>
          </div>

          {/* ── EARLY ACCESS ── */}
          <div className="mt-8 rounded-2xl border-2 border-cheetah/40 bg-gradient-to-r from-[#241a06]/70 to-[#12041a]/70 p-6 backdrop-blur-md">
            <span className="case-label text-[10px] text-cheetah">★ Members Get In First</span>
            <h2 className="font-display text-2xl text-white mt-2">Early access to everything.</h2>
            <p className="font-whimsy text-sm text-pink-light/75 mt-1.5 max-w-prose">
              New drops, the <b className="text-pink-light">Dear Joshua</b> EP (8/21), show presales, and members-only exclusives land in your world before anyone else.
            </p>
            <button onClick={() => navigate('/map')} className="btn-retro shimmer-sweep mt-4 !text-sm">✦ Explore the map ✦</button>
          </div>
        </div>
      </main>
    </>
  );
};

export default Account;
