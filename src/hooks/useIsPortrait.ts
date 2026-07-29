import { useEffect, useState } from "react";

/** True when the viewport is portrait (mobile). Reactive to orientation change. */
export function useIsPortrait(): boolean {
  const [portrait, setPortrait] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia("(orientation: portrait)").matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const onChange = (e: MediaQueryListEvent) => setPortrait(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return portrait;
}
