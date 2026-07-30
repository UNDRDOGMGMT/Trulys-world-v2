/**
 * Encode travel + neighborhood cine MP4s to self-hosted HLS (2-ladder VOD).
 *
 * Usage:
 *   node scripts/encode-hls.mjs          # skip existing masters
 *   node scripts/encode-hls.mjs --force  # re-encode all
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ANIM = path.join(ROOT, "public", "world", "anim");
const OUT = path.join(ROOT, "public", "hls");
const FORCE = process.argv.includes("--force");

const ASSET_KEYS = [
  "dtla", "silverlake", "hw", "weho", "lax", "lc", "sm", "ven",
  "bh", "ktown", "val", "malibu", "ing", "lb",
];

/** Cine/loop paths referenced from locations.ts (basename under world/anim). */
const CINE_FILES = [
  "hw-aerial-cine.mp4",
  "hw-street-cine.mp4",
  "hw-c3-cine.mp4",
  "dtla-aerial-cine.mp4",
  "dtla-arts-cine.mp4",
  "dtla-roof-cine.mp4",
  "dtla-street-2.mp4",
  "bh-aerial-cine.mp4",
  "ktown-aerial-cine.mp4",
  "sm-aerial-cine.mp4",
  "sm-loop.mp4",
  "ven-canals-cine.mp4",
  "silverlake-aerial-cine.mp4",
  "lc-ventura-loop.mp4",
  "val-aerial-cine.mp4",
  "malibu-cliffs-cine.mp4",
  "ing-sofi-cine.mp4",
  "lax-ufo-interior-cine.mp4",
  "lax-ufo-window-cine.mp4",
  "lb-aerial-cine.mp4",
];

function findFfmpeg() {
  const r = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (r.status === 0) return "ffmpeg";
  const guess = [
    path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Packages"),
  ];
  // Fallback: search common winget install layout is fragile; require PATH.
  console.error("ffmpeg not found on PATH. Install Gyan.FFmpeg and restart the shell.");
  process.exit(1);
}

const FFMPEG = findFfmpeg();

function collectInputs() {
  const files = [];
  for (const key of ASSET_KEYS) {
    files.push(path.join(ANIM, `${key}-wide.mp4`));
  }
  for (const name of CINE_FILES) {
    files.push(path.join(ANIM, name));
  }
  return [...new Set(files)].filter((f) => {
    if (!fs.existsSync(f)) {
      console.warn(`SKIP missing: ${path.relative(ROOT, f)}`);
      return false;
    }
    return true;
  });
}

/**
 * Two-ladder fMP4 HLS: v0 ~480p/800k, v1 ~720p/1800k, 2s segments.
 * Video-only (an=-1) — travel/cine are ambient muted loops.
 */
function encodeOne(src) {
  const base = path.basename(src, path.extname(src));
  const dest = path.join(OUT, base);
  const master = path.join(dest, "master.m3u8");
  if (!FORCE && fs.existsSync(master)) {
    console.log(`EXISTS ${base}`);
    return { base, skipped: true };
  }

  fs.mkdirSync(path.join(dest, "v0"), { recursive: true });
  fs.mkdirSync(path.join(dest, "v1"), { recursive: true });

  const filter =
    "[0:v]split=2[v0][v1];" +
    "[v0]scale=w=min(854\\,iw):h=-2:force_original_aspect_ratio=decrease:force_divisible_by=2[v0out];" +
    "[v1]scale=w=min(1280\\,iw):h=-2:force_original_aspect_ratio=decrease:force_divisible_by=2[v1out]";

  const args = [
    "-y",
    "-i", src,
    "-filter_complex", filter,
    "-map", "[v0out]",
    "-c:v:0", "libx264",
    "-b:v:0", "800k",
    "-maxrate:v:0", "1000k",
    "-bufsize:v:0", "1600k",
    "-preset", "veryfast",
    "-profile:v:0", "main",
    "-g", "48",
    "-keyint_min", "48",
    "-sc_threshold", "0",
    "-an",
    "-map", "[v1out]",
    "-c:v:1", "libx264",
    "-b:v:1", "1800k",
    "-maxrate:v:1", "2200k",
    "-bufsize:v:1", "3600k",
    "-preset", "veryfast",
    "-profile:v:1", "main",
    "-g", "48",
    "-keyint_min", "48",
    "-sc_threshold", "0",
    "-an",
    "-f", "hls",
    "-hls_time", "2",
    "-hls_playlist_type", "vod",
    "-hls_segment_type", "fmp4",
    "-hls_flags", "independent_segments",
    "-master_pl_name", "master.m3u8",
    "-var_stream_map", "v:0 v:1",
    "-hls_fmp4_init_filename", path.join(dest, "v%v", "init.mp4"),
    "-hls_segment_filename", path.join(dest, "v%v", "seg_%03d.m4s"),
    path.join(dest, "v%v", "prog.m3u8"),
  ];

  console.log(`ENCODE ${base} …`);
  const r = spawnSync(FFMPEG, args, { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stderr?.slice(-2000) || r.stdout);
    throw new Error(`ffmpeg failed for ${base}`);
  }
  if (!fs.existsSync(master)) {
    throw new Error(`master.m3u8 missing after encode: ${base}`);
  }
  // ffmpeg on Windows emits backslash / absolute paths in playlists — browsers need relative /.
  for (const f of walkM3u8(dest)) {
    let text = fs.readFileSync(f, "utf8");
    text = text.replace(/\\/g, "/");
    // Collapse absolute EXT-X-MAP URIs to basename (e.g. init.mp4 next to prog.m3u8)
    text = text.replace(/#EXT-X-MAP:URI="[^"]*[\/]([^"\/]+)"/g, '#EXT-X-MAP:URI="$1"');
    fs.writeFileSync(f, text);
  }
  const init0 = path.join(dest, "v0", "init.mp4");
  const init1 = path.join(dest, "v1", "init.mp4");
  if (!fs.existsSync(init0) || !fs.existsSync(init1)) {
    throw new Error(`init.mp4 missing after encode: ${base}`);
  }
  return { base, skipped: false };
}

function walkM3u8(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkM3u8(full, out);
    else if (ent.name.endsWith(".m3u8")) out.push(full);
  }
  return out;
}

const inputs = collectInputs();
console.log(`Encoding ${inputs.length} clips → ${path.relative(ROOT, OUT)}`);
let done = 0;
let skipped = 0;
for (const src of inputs) {
  const r = encodeOne(src);
  if (r.skipped) skipped++;
  else done++;
}
console.log(`Done. encoded=${done} skipped=${skipped}`);
