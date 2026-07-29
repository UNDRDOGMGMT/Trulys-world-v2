import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUnlock } from "@/contexts/UnlockContext";
import SpiderHeart from "@/components/SpiderHeart";

/**
 * Fixed corner tracker for collected spider-hearts. Shows progress toward the
 * vault (requiredHearts) and celebrates when unlocked.
 */
const HeartsIndicator: React.FC = () => {
  const { heartsCollected, totalHearts, requiredHearts, isVaultUnlocked } = useUnlock();
  const count = heartsCollected.size;

  if (count === 0) return null;

  return (
    <motion.div
      className="fixed left-3 bottom-24 z-[90] flex items-center gap-2 px-3 py-2 rounded-full bg-dark-surface/90 backdrop-blur-sm border border-pink/25 glitter-border"
      initial={{ x: -60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <div className="flex items-center gap-1">
        {Array.from({ length: totalHearts }).map((_, i) => (
          <SpiderHeart key={i} size={13} collected={i >= count} />
        ))}
      </div>
      <span className="font-mono text-[10px] text-pink-light tabular-nums">
        {count}/{requiredHearts}
      </span>
      <AnimatePresence>
        {isVaultUnlocked && (
          <motion.span
            className="font-whimsy text-[11px] text-accent glitter-glow"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            ✦ unlocked
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default HeartsIndicator;
