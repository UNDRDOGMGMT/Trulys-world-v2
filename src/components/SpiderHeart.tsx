import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpiderHeartProps {
  size?: number;
  className?: string;
  onClick?: () => void;
  collected?: boolean;
}

const SpiderHeart: React.FC<SpiderHeartProps> = ({ size = 24, className = '', onClick, collected }) => {
  const [justCollected, setJustCollected] = useState(false);

  const handleClick = () => {
    if (collected || !onClick) return;
    setJustCollected(true);
    onClick();
    setTimeout(() => setJustCollected(false), 800);
  };

  const color = collected ? 'hsl(var(--muted-foreground))' : 'hsl(var(--accent))';
  const fillColor = collected ? 'hsl(var(--muted))' : 'none';

  return (
    <span className="relative inline-block">
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`inline-block ${collected ? 'opacity-40' : 'cursor-pointer'} ${className}`}
        onClick={handleClick}
        role={onClick ? 'button' : 'img'}
        aria-label="Spider heart"
        tabIndex={onClick && !collected ? 0 : undefined}
        onKeyDown={onClick && !collected ? (e) => { if (e.key === 'Enter') handleClick(); } : undefined}
        whileHover={!collected && onClick ? { scale: 1.2 } : undefined}
        whileTap={!collected && onClick ? { scale: 0.85 } : undefined}
      >
        <path
          d="M16 28 C16 28 4 20 4 12 C4 7 8 4 12 4 C14 4 16 6 16 6 C16 6 18 4 20 4 C24 4 28 7 28 12 C28 20 16 28 16 28Z"
          stroke={color}
          strokeWidth="1.5"
          fill={fillColor}
        />
        <line x1="16" y1="8" x2="16" y2="24" stroke={color} strokeWidth="0.5" opacity="0.6" />
        <line x1="8" y1="12" x2="24" y2="12" stroke={color} strokeWidth="0.5" opacity="0.6" />
        <line x1="7" y1="17" x2="25" y2="17" stroke={color} strokeWidth="0.5" opacity="0.6" />
        <line x1="10" y1="22" x2="22" y2="22" stroke={color} strokeWidth="0.5" opacity="0.6" />
        <circle cx="16" cy="15" r="1.5" fill={color} />
        <line x1="14.5" y1="14" x2="12" y2="12" stroke={color} strokeWidth="0.7" />
        <line x1="17.5" y1="14" x2="20" y2="12" stroke={color} strokeWidth="0.7" />
        <line x1="14.5" y1="16" x2="12" y2="18" stroke={color} strokeWidth="0.7" />
        <line x1="17.5" y1="16" x2="20" y2="18" stroke={color} strokeWidth="0.7" />
      </motion.svg>

      {/* Pulse ring on collect */}
      <AnimatePresence>
        {justCollected && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-accent pointer-events-none"
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ left: '50%', top: '50%', width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
          />
        )}
      </AnimatePresence>
    </span>
  );
};

export default SpiderHeart;
