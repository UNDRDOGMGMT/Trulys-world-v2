import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMember } from '@/contexts/MemberContext';

/**
 * Session control. Members get a points chip (→ dashboard) + Log out. Guests
 * get "sign in", which opens /join (Gate: signup / login / passcode).
 */
const SessionChip: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => {
  const navigate = useNavigate();
  const { member, logOut } = useMember();
  const [signingOut, setSigningOut] = useState(false);

  const handleLogOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logOut();
      navigate('/', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  if (member) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`} style={style}>
        <button onClick={() => navigate('/account')} title={`${member.first} — ${member.points} pts`}
          className="btn-retro !text-[10px] !py-1 !px-3 shimmer-sweep">&#9830; {member.points.toLocaleString()}</button>
        <button
          type="button"
          disabled={signingOut}
          onClick={() => void handleLogOut()}
          className="font-display text-[10px] uppercase tracking-[0.14em] text-cream/60 hover:text-white bg-black/45 border border-white/15 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors disabled:opacity-50"
        >
          {signingOut ? '…' : 'log out'}
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => navigate('/join')}
      style={style}
      className={`font-display text-[10px] uppercase tracking-[0.14em] text-cream/75 hover:text-white bg-black/45 border border-pink/35 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors ${className}`}
    >
      &#10022; sign in
    </button>
  );
};

export default SessionChip;
