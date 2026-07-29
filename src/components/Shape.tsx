import React from 'react';
import shape1 from '@/assets/ty-shape-1.png';
import shape3 from '@/assets/ty-shape-3.png';

type ShapeName = 'sparkle' | 'heart';

const SHAPE_SRC: Record<ShapeName, string> = {
  sparkle: shape1,   // 4-point sparkle with heart tips
  heart: shape3,     // hand-drawn heart
};

interface ShapeProps {
  name: ShapeName;
  size?: number | string;
  rotate?: number;
  opacity?: number;
  className?: string;
  /** Pink glow behind the shape */
  glow?: boolean;
  /** Optional floating animation */
  float?: boolean;
}

const Shape: React.FC<ShapeProps> = ({
  name,
  size = 40,
  rotate = 0,
  opacity = 1,
  className = '',
  glow = true,
  float = false,
}) => {
  const style: React.CSSProperties = {
    width: typeof size === 'number' ? `${size}px` : size,
    height: typeof size === 'number' ? `${size}px` : size,
    transform: `rotate(${rotate}deg)`,
    opacity,
    filter: glow
      ? 'drop-shadow(0 0 6px rgba(255,182,213,0.5)) drop-shadow(0 0 14px rgba(255,105,180,0.3))'
      : 'none',
  };

  return (
    <img
      src={SHAPE_SRC[name]}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      className={`pointer-events-none select-none ${float ? 'shape-float' : ''} ${className}`}
      style={style}
    />
  );
};

export default Shape;
