import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMember } from '@/contexts/MemberContext';
import { GATE_KEY } from '@/lib/gate';

/**
 * Session control. Members get a points chip (→ dashboard) + Log out. Anyone
 * who's unlocked but NOT a member (e.g. entered with the backstage passcode)
 * gets "sign in", which drops them back to the gate so they can make an account.
 */
const SessionChip: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => {
  const navigate = useNavigate();
  const { member, logOut } = useMember();

  const reGate = () => {
    try { localStorage.removeItem(GATE_KEY); } catch { /* ignore */ }
    window.location.assign('/');
  };

  if (member) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`} style={style}>
        <button onClick={() => navigate('/account')} title={`${member.first} — ${member.points} pts`}
          className="btn-retro !text-[10px] !py-1 !px-3 shimmer-sweep">&#9830; {member.points.toLocaleString()}</button>
        <button onClick={() => { logOut(); window.location.assign('/'); }}
          className="font-display text-[10px] uppercase tracking-[0.14em] text-cream/60 hover:text-white bg-black/45 border border-white/15 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors">
          log out
        </button>
      </div>
    );
  }
  return (
    <button onClick={reGate} style={style}
      className={`font-display text-[10px] uppercase tracking-[0.14em] text-cream/75 hover:text-white bg-black/45 border border-pink/35 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors ${className}`}>
      &#10022; sign in
    </button>
  );
};

export default SessionChip;
