import React from 'react';

interface HandDrawnFrameProps {
  className?: string;
  /** Border line weight in px */
  strokeWidth?: number;
  /** Hand-drawn wobble amount (0 = perfectly crisp, higher = more sketchy) */
  wobble?: number;
  /** Pink tone — defaults to match player-shape.png */
  color?: string;
  /** Show heart charms on left & right */
  hearts?: boolean;
  /** When true, animates the squiggle's turbulence seed so it breathes */
  animated?: boolean;
  /** Shape of the frame */
  shape?: 'rounded-rect' | 'oval';
}

/**
 * Stretchy hand-drawn frame:
 *  - Pink wavy rounded-rect outline (stretches to any aspect)
 *  - Fixed-size heart charms positioned on the sides
 *  - Small dots beyond the hearts (like the banner graphic)
 */
const HandDrawnFrame: React.FC<HandDrawnFrameProps> = ({
  className = '',
  strokeWidth = 3,
  wobble = 3,
  color = '#ffcce0',
  hearts = true,
  animated = false,
  shape = 'rounded-rect',
}) => {
  // Unique filter id so multiple instances don't conflict
  const filterId = React.useId();

  const heartPath =
    'M50,82 C30,65,5,48,5,28 C5,13,18,3,32,3 C40,3,48,8,50,16 C52,8,60,3,68,3 C82,3,95,13,95,28 C95,48,70,65,50,82Z';

  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      {/* Stretchy wavy outline */}
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        style={{
          filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 14px rgba(255,105,180,0.25))`,
        }}
      >
        <defs>
          <filter id={`rough-${filterId}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.013" numOctaves="1" seed="4">
              {animated && (
                <animate attributeName="seed" values="1;4;7;2;9;3;6;1" dur="2s" repeatCount="indefinite" />
              )}
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale={wobble * 4} />
          </filter>
        </defs>
        {/* Main outline — stretches to fit any aspect ratio */}
        {shape === 'oval' ? (
          <ellipse
            cx="500"
            cy="500"
            rx={500 - strokeWidth * 3}
            ry={500 - strokeWidth * 3}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth * 2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            filter={`url(#rough-${filterId})`}
            opacity="0.9"
          />
        ) : (
          <rect
            x={strokeWidth * 2}
            y={strokeWidth * 2}
            width={1000 - strokeWidth * 4}
            height={1000 - strokeWidth * 4}
            rx="60"
            ry="60"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth * 2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            filter={`url(#rough-${filterId})`}
            opacity="0.9"
          />
        )}
      </svg>

      {hearts && (
        <>
          {/* Left heart charm */}
          <svg
            viewBox="0 0 100 100"
            className="absolute"
            style={{
              left: '-22px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 28,
              height: 28,
              filter: `drop-shadow(0 0 5px ${color}) drop-shadow(0 0 10px rgba(255,105,180,0.3))`,
            }}
          >
            <path d={heartPath} fill={color} opacity="0.95" />
          </svg>
          {/* Left tiny dot */}
          <div
            className="absolute rounded-full"
            style={{
              left: '-40px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 6,
              height: 6,
              background: color,
              boxShadow: `0 0 6px ${color}`,
            }}
          />

          {/* Right heart charm */}
          <svg
            viewBox="0 0 100 100"
            className="absolute"
            style={{
              right: '-22px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 28,
              height: 28,
              filter: `drop-shadow(0 0 5px ${color}) drop-shadow(0 0 10px rgba(255,105,180,0.3))`,
            }}
          >
            <path d={heartPath} fill={color} opacity="0.95" />
          </svg>
          {/* Right tiny dot */}
          <div
            className="absolute rounded-full"
            style={{
              right: '-40px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 6,
              height: 6,
              background: color,
              boxShadow: `0 0 6px ${color}`,
            }}
          />
        </>
      )}
    </div>
  );
};

export default HandDrawnFrame;
