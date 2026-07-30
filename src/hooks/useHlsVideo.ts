import { useEffect } from "react";
import type { RefObject } from "react";
import { isHlsUrl } from "@/lib/videoSrc";

/**
 * Attach HLS (native Safari) or hls.js to a <video>, with MP4 fallback.
 * Non-HLS src values are assigned directly. Null/empty src clears the element.
 */
export function useHlsVideo(
  videoRef: RefObject<HTMLVideoElement | null>,
  src: string | null | undefined,
  fallbackMp4?: string | null,
) {
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (!src) {
      el.pause();
      el.removeAttribute("src");
      el.load();
      return;
    }

    let destroyed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let hls: any = null;

    const playSafe = () => {
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    const useMp4 = (url: string) => {
      el.src = url;
      el.load();
      playSafe();
    };

    if (!isHlsUrl(src)) {
      useMp4(src);
      return () => {
        destroyed = true;
        el.pause();
        el.removeAttribute("src");
        el.load();
      };
    }

    const native = el.canPlayType("application/vnd.apple.mpegurl");
    if (native) {
      el.src = src;
      el.load();
      playSafe();
      return () => {
        destroyed = true;
        el.pause();
        el.removeAttribute("src");
        el.load();
      };
    }

    let cancelled = false;
    (async () => {
      try {
        const mod = await import("hls.js");
        const Hls = mod.default;
        if (cancelled || destroyed || !videoRef.current) return;
        if (!Hls.isSupported()) {
          if (fallbackMp4) useMp4(fallbackMp4);
          return;
        }
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferLength: 10,
        });
        hls.loadSource(src);
        hls.attachMedia(el);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!cancelled && !destroyed) playSafe();
        });
        hls.on(Hls.Events.ERROR, (_: unknown, data: { fatal?: boolean }) => {
          if (!data?.fatal || cancelled || destroyed) return;
          if (fallbackMp4) {
            try { hls.destroy(); } catch { /* ignore */ }
            hls = null;
            useMp4(fallbackMp4);
          }
        });
      } catch {
        if (!cancelled && !destroyed && fallbackMp4) useMp4(fallbackMp4);
      }
    })();

    return () => {
      cancelled = true;
      destroyed = true;
      if (hls) {
        try { hls.destroy(); } catch { /* ignore */ }
        hls = null;
      }
      el.pause();
      el.removeAttribute("src");
      el.load();
    };
  }, [videoRef, src, fallbackMp4]);
}
