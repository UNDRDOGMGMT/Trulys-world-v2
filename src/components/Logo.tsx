import React from 'react';
import twLogo from '@/assets/tw-logo.png';
import twLogoStacked from '@/assets/tw-logo-stacked.png';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'wide' | 'stacked';
}

const sizeMap: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'h-6',
  md: 'h-10',
  lg: 'h-20',
  xl: 'h-32 md:h-44',
};

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', variant = 'wide' }) => (
  <img
    src={variant === 'stacked' ? twLogoStacked : twLogo}
    alt="Trulys World"
    className={`${sizeMap[size]} w-auto object-contain ${className}`}
    style={{
      filter:
        'drop-shadow(0 0 8px rgba(255,105,180,0.5)) drop-shadow(0 0 20px rgba(255,105,180,0.25)) drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
    }}
  />
);

export default Logo;
