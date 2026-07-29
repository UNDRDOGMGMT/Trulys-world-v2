import React, { useEffect, useMemo, useState } from 'react';

interface Star {
  id: number;
  x: number;      // % across screen
  y: number;      // % down screen
  size: number;   // px
  color: string;
  delay: number;  // s
  duration: number; // s
}

interface ShootingStar {
  id: number;
  startX: number;
  startY: number;
  angle: number;  // degrees, direction of travel
  length: number; // trail length in px
}

const STAR_COUNT = 120;
const PINK_TONES = ['#ffffff', '#ffcce0', '#ffb6d5', '#ff9ec7', '#ff7eb3', '#ffe6f2'];

// Generate deterministic starfield once
const buildStars = (): Star[] =>
  Array.from({ length: STAR_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 0.8 + Math.random() * 2.2,
    color: PINK_TONES[Math.floor(Math.random() * PINK_TONES.length)],
    delay: Math.random() * 4,
    duration: 1.8 + Math.random() * 3.5,
  }));

const Starfield: React.FC = () => {
  const stars = useMemo(buildStars, []);
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([]);

  useEffect(() => {
    // Fire a shooting star every 30 seconds, plus one soon after mount
    const spawn = () => {
      const angle = 200 + Math.random() * 40;       // heading down-left-ish
      setShootingStars((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          startX: Math.random() * 60 + 30,          // start in top-right quadrant
          startY: Math.random() * 40,
          angle,
          length: 180 + Math.random() * 120,
        },
      ]);
    };

    const firstTimeout = setTimeout(spawn, 3500);
    const interval = setInterval(spawn, 30000);
    return () => { clearTimeout(firstTimeout); clearInterval(interval); };
  }, []);

  // Remove shooting stars after their animation ends
  useEffect(() => {
    if (shootingStars.length === 0) return;
    const cleanup = setTimeout(() => {
      setShootingStars((prev) => prev.slice(-3));    // keep max 3
    }, 2500);
    return () => clearTimeout(cleanup);
  }, [shootingStars]);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 9993 }}
      aria-hidden="true"
    >
      {stars.map((s) => (
        <span
          key={s.id}
          className="absolute rounded-full star-twinkle"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            background: s.color,
            boxShadow: `0 0 ${s.size * 3}px ${s.color}`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}

      {shootingStars.map((ss) => {
        const rad = (ss.angle * Math.PI) / 180;
        const dx = Math.cos(rad) * 120;     // travel distance in vw units
        const dy = Math.sin(rad) * 120;
        return (
          <span
            key={ss.id}
            className="absolute shooting-star"
            style={
              {
                left: `${ss.startX}%`,
                top: `${ss.startY}%`,
                transform: `rotate(${ss.angle}deg)`,
                width: ss.length,
                ['--travel-x' as string]: `${dx}vw`,
                ['--travel-y' as string]: `${dy}vh`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
};

export default Starfield;
