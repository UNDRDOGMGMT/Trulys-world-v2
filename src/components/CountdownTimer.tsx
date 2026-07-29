import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CountdownTimerProps {
  targetDate: Date;
  label: string;
  onComplete?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(target: Date): TimeLeft | null {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const Digit: React.FC<{ value: number; label: string }> = ({ value, label }) => {
  const display = String(value).padStart(2, '0');
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative overflow-hidden bg-dark-surface border-2 border-pink/25 rounded-xl px-3 py-2 min-w-[48px] shadow-[0_0_10px_rgba(255,105,180,0.1)] glitter-border">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={display}
            className="block font-mono text-2xl md:text-3xl font-bold text-cream text-center tabular-nums glitter-glow"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {display}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="font-display text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
};

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate, label, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => getTimeLeft(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      const tl = getTimeLeft(targetDate);
      setTimeLeft(tl);
      if (!tl) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  if (!timeLeft) {
    return (
      <div className="text-center">
        <div className="stamp-text text-sm !rotate-0">✦ Out Now ✦</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="case-label text-[10px]">{label}</span>
      <div className="flex items-center gap-2">
        <Digit value={timeLeft.days} label="Days" />
        <span className="font-display text-xl text-muted-foreground mt-[-16px]">:</span>
        <Digit value={timeLeft.hours} label="Hrs" />
        <span className="font-display text-xl text-muted-foreground mt-[-16px]">:</span>
        <Digit value={timeLeft.minutes} label="Min" />
        <span className="font-display text-xl text-muted-foreground mt-[-16px]">:</span>
        <Digit value={timeLeft.seconds} label="Sec" />
      </div>
    </div>
  );
};

export default CountdownTimer;
