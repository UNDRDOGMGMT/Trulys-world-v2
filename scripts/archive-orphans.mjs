/**
 * Safe orphan media auditor / archiver.
 * Collects literal refs from src + public HTML/JSON, expands ASSET_KEY travel
 * templates, diffs against public/{world/anim,corbin,audio,boutique}, and moves
 * only unmatched files to repo-root _archive/media/ (not deployed).
 *
 * Usage:
 *   node scripts/archive-orphans.mjs          # dry-run (list only)
 *   node scripts/archive-orphans.mjs --apply  # move orphans
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const APPLY = process.argv.includes("--apply");

const ASSET_KEYS = [
  "dtla", "silverlake", "hw", "weho", "lax", "lc", "sm", "ven",
  "bh", "ktown", "val", "malibu", "ing", "lb",
];

const SCAN_DIRS = [
  path.join(ROOT, "public", "world", "anim"),
  path.join(ROOT, "public", "corbin"),
  path.join(ROOT, "public", "audio"),
  path.join(ROOT, "public", "boutique"),
];

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

function collectTextFiles(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "dist" || ent.name === "_archive") continue;
      collectTextFiles(full, exts, out);
    } else if (exts.has(path.extname(ent.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

const keep = new Set();

// Dynamic travel templates
for (const key of ASSET_KEYS) {
  keep.add(`/world/anim/${key}-wide.mp4`);
  keep.add(`/world/anim/${key}-wide-poster.jpg`);
}

// Literal path refs in source + public HTML/JSON
const textFiles = [
  ...collectTextFiles(path.join(ROOT, "src"), new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".css"])),
  ...collectTextFiles(path.join(ROOT, "public"), new Set([".html", ".json", ".js", ".css"])),
];

const PATH_RE = /["'`](\/(?:world|corbin|audio|boutique|shop|gate|brand|shadows|island|sing)[^"'`\s]*)["'`]/g;

for (const file of textFiles) {
  const text = fs.readFileSync(file, "utf8");
  let m;
  while ((m = PATH_RE.exec(text))) {
    keep.add(m[1].split("?")[0]);
  }
}

// Also catch unquoted src=/… in HTML attributes sometimes written without quotes — already covered by PATH_RE for quoted.
// Karaoke / relative audio in HTML: /audio/...

const candidates = SCAN_DIRS.flatMap((d) => walkFiles(d));
const orphans = [];
const kept = [];

for (const full of candidates) {
  const rel = "/" + path.relative(path.join(ROOT, "public"), full).split(path.sep).join("/");
  if (keep.has(rel)) kept.push(rel);
  else orphans.push({ full, rel });
}

console.log(`Keep-set size: ${keep.size}`);
console.log(`Candidates: ${candidates.length}`);
console.log(`Kept: ${kept.length}`);
console.log(`Orphans: ${orphans.length}`);
console.log(APPLY ? "\nAPPLYING moves…\n" : "\nDRY-RUN (pass --apply to move)\n");

for (const { full, rel } of orphans.sort((a, b) => a.rel.localeCompare(b.rel))) {
  const dest = path.join(ROOT, "_archive", "media", rel.replace(/^\//, ""));
  console.log(`${APPLY ? "MOVE" : "ORPHAN"} ${rel}`);
  if (APPLY) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(full, dest);
  }
}

if (APPLY) {
  // Remove empty dirs under scanned roots
  for (const dir of SCAN_DIRS) {
    pruneEmpty(dir);
  }
  console.log(`\nMoved ${orphans.length} files to _archive/media/`);
}

function pruneEmpty(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) pruneEmpty(path.join(dir, ent.name));
  }
  if (fs.readdirSync(dir).length === 0 && path.basename(dir) !== "public") {
    // don't remove the scan roots themselves if emptied — boutique may go away entirely which is fine
    try {
      fs.rmdirSync(dir);
    } catch { /* ignore */ }
  }
}
