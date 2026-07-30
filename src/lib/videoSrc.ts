/**
 * Map progressive MP4 paths under /world/anim to self-hosted HLS masters.
 * Encode with: npm run encode:hls
 */

export function hlsUrlFromMp4(mp4Path: string): string {
  const base = mp4Path.split("/").pop()?.replace(/\.mp4$/i, "") ?? "";
  return `/hls/${base}/master.m3u8`;
}

export function isHlsUrl(src: string): boolean {
  return /\.m3u8($|\?)/i.test(src);
}

/** Prefer HLS master; callers keep mp4Path for fallback on attach failure. */
export function resolveVideoSrc(mp4Path: string): { src: string; fallback: string } {
  return { src: hlsUrlFromMp4(mp4Path), fallback: mp4Path };
}
