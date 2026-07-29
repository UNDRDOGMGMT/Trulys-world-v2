import React from 'react';

const items = [
  '✧ Shadows — the new single ✧',
  '♥ Dear Joshua — the EP — Aug 21 ♥',
  '✦ New case files unlocking ✦',
  '♥ The map is alive ~ explore ♥',
];

const MarqueeStrip: React.FC = () => {
  const content = items.join('  ♥  ');
  return (
    <div className="w-full overflow-hidden bg-dark-surface py-2 border-y-2 border-pink/20 glitter-border" role="marquee" aria-label="Latest updates">
      <div className="marquee-track flex whitespace-nowrap">
        <span className="font-display text-sm text-cream tracking-wider uppercase px-4">
          {content}  ✦  {content}  ✦
        </span>
        <span className="font-display text-sm text-cream tracking-wider uppercase px-4" aria-hidden="true">
          {content}  ✦  {content}  ✦
        </span>
      </div>
    </div>
  );
};

export default MarqueeStrip;
