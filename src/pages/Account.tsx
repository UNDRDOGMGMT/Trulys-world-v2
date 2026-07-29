import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageMeta from '@/components/PageMeta';
import { useMember, tierFor, TIERS } from '@/contexts/MemberContext';
import { REWARDS, KIND_LABEL, KIND_ICON, type Reward } from '@/data/rewards';

const rel = (t: number) => {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const Account: React.FC = () => {
  const navigate = useNavigate();
  const { member, logOut, redeem } = useMember();

  // not signed in → the gate owns access; send them home
  if (!member) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-background text-center px-6">
        <span className="font-whimsy text-xl text-pink-light glitter-glow">✦ members only ✦</span>
        <button onClick={() => navigate('/')} className="btn-retro px-8 py-3 text-sm">✧ join truly’s world ✧</button>
      </div>
    );
  }

  const { tier, next, toNext, pct } = tierFor(member.points);

  const RewardCard: React.FC<{ r: Reward }> = ({ r }) => {
    const unlocked = member.points >= r.cost;
    const done = member.redeemed.includes(r.id);
    return (
      <div className={`relative rounded-2xl border-2 p-4 backdrop-blur-md transition-all ${
        done ? 'border-cheetah/70 bg-cheetah/5'
        : unlocked ? 'border-pink/60 bg-gradient-to-br from-[#2a0a28]/70 to-[#12041a]/70 hover:shadow-[0_0_26px_rgba(255,79,163,0.3)]'
        : 'border-white/10 bg-black/40'}`}>
        <div className="flex items-center justify-between">
          <span className="case-label text-[9px]">{KIND_ICON[r.kind]} {KIND_LABEL[r.kind]}</span>
          <span className={`font-display text-xs ${unlocked ? 'text-cheetah' : 'text-cream/40'}`}>{r.cost.toLocaleString()} pts</span>
        </div>
        <h3 className={`font-display text-lg leading-tight mt-2 ${unlocked ? 'chrome-text-pink' : 'text-cream/55'}`}>{r.name}</h3>
        <p className="font-whimsy text-[12px] text-pink-light/70 mt-1 leading-snug">{r.detail}</p>
        <div className="mt-3">
          {done ? (
            <span className="inline-block rounded-full border border-cheetah/60 bg-cheetah/10 px-3 py-1 font-display text-[10px] uppercase tracking-[0.15em] text-cheetah">✓ redeemed — check your email</span>
          ) : unlocked ? (
            <button onClick={() => redeem(r.id)} className="btn-retro !text-[11px] !py-1.5 !px-4 shimmer-sweep">✦ Redeem</button>
          ) : (
            <span className="font-whimsy text-[11px] text-cream/40">{(r.cost - member.points).toLocaleString()} pts to unlock</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <PageMeta title="Your Truly’s World — Members" description="Your points, tier, and member rewards in Truly's World." />
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
            <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
              <div>
                <div className="font-display text-5xl md:text-6xl leading-none text-white" style={{ textShadow: '0 0 22px rgba(255,79,163,0.55)' }}>{member.points.toLocaleString()}</div>
                <div className="case-label text-[9px] mt-1">points</div>
              </div>
              <div>
                <div className="font-display text-2xl md:text-3xl leading-none text-pink-light">{tier.name}</div>
                <div className="font-whimsy text-[12px] text-pink-light/70 mt-1">{tier.blurb}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="font-whimsy text-[12px] text-cream/60">member since</div>
                <div className="font-display text-sm text-cream/85">{new Date(member.memberSince).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</div>
              </div>
            </div>
            {/* tier progress */}
            <div className="mt-5">
              <div className="flex justify-between font-display text-[10px] uppercase tracking-[0.14em] text-cream/60 mb-1.5">
                <span>{tier.name}</span>
                <span>{next ? `${toNext.toLocaleString()} pts → ${next.name}` : 'Top tier ♥'}</span>
              </div>
              <div className="h-2.5 rounded-full bg-black/50 border border-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-accent to-pink" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </motion.div>

          {/* ── TIERS STRIP ── */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TIERS.map((t) => (
              <div key={t.key} className={`rounded-xl border px-3 py-2.5 text-center ${t.key === tier.key ? 'border-pink bg-pink/10' : 'border-white/10 bg-black/30'}`}>
                <div className={`font-display text-sm ${t.key === tier.key ? 'chrome-text-pink' : 'text-cream/70'}`}>{t.name}</div>
                <div className="font-whimsy text-[10px] text-cream/45 mt-0.5">{t.min.toLocaleString()}+ pts</div>
              </div>
            ))}
          </div>

          {/* ── REWARDS ── */}
          <div className="mt-10">
            <h2 className="chrome-text-pink font-display text-2xl md:text-3xl">✦ Rewards</h2>
            <p className="font-whimsy text-sm text-pink-light/70 mt-1">Play the games, rack up points, cash them in for merch, tickets & drops.</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {REWARDS.map((r) => <RewardCard key={r.id} r={r} />)}
            </div>
          </div>

          {/* ── EARLY ACCESS ── */}
          <div className="mt-10 rounded-2xl border-2 border-cheetah/40 bg-gradient-to-r from-[#241a06]/70 to-[#12041a]/70 p-6 backdrop-blur-md">
            <span className="case-label text-[10px] text-cheetah">★ Members Get In First</span>
            <h2 className="font-display text-2xl text-white mt-2">Early access to everything.</h2>
            <p className="font-whimsy text-sm text-pink-light/75 mt-1.5 max-w-prose">
              New drops, the <b className="text-pink-light">Dear Joshua</b> EP (8/21), show presales, and members-only exclusives land in your world before anyone else. Keep playing to climb tiers and unlock more.
            </p>
            <button onClick={() => navigate('/map')} className="btn-retro shimmer-sweep mt-4 !text-sm">✦ Go earn points ✦</button>
          </div>

          {/* ── GAMEPLAY LOG ── */}
          <div className="mt-10">
            <h2 className="chrome-text-pink font-display text-2xl md:text-3xl">✦ Your Activity</h2>
            <div className="mt-3 rounded-2xl border-2 border-pink/20 bg-[#0b0714]/80 backdrop-blur-md divide-y divide-white/5">
              {member.plays.length === 0 ? (
                <p className="font-whimsy text-sm text-cream/50 px-5 py-6 text-center">Play a game to start earning ✦</p>
              ) : member.plays.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="font-display text-sm text-cream/90">{p.label}</div>
                    <div className="font-whimsy text-[11px] text-cream/40">{rel(p.at)}</div>
                  </div>
                  <div className="font-display text-pink-light text-sm shrink-0">+{p.points}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default Account;
