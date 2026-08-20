import React from 'react';

// The EP line flips itself at midnight ET on release night — no manual edit.
const EP_RELEASE = Date.parse('2026-08-21T00:00:00-04:00');
const epOut = Date.now() >= EP_RELEASE;
const items = [
  '\u2727 Shadows \u2014 out now \u2727',
  epOut ? '\u2665 Dear Joshua \u2014 the EP \u2014 OUT NOW \u2665' : '\u2665 Dear Joshua \u2014 the EP \u2014 out at midnight \u2665',
  '\u2726 Trulyland \u2014 now open \u2726',
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
