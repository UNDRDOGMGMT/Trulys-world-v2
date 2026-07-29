/**
 * Connection-aware media gating for travel clips / cine loops.
 * Save-Data or very slow effectiveType -> skip heavy video prefetch and playback.
 */
type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

function connection(): NetworkInformationLike | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
}

export function shouldReduceMedia(): boolean {
  const c = connection();
  if (!c) return false;
  if (c.saveData) return true;
  const t = c.effectiveType;
  return t === "slow-2g" || t === "2g";
}
