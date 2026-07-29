# Archived media

Orphaned assets moved out of `public/` by `scripts/archive-orphans.mjs` so they are not deployed.

To restore a file, move it back under `public/` at the same relative path (e.g. `_archive/media/world/anim/foo.mp4` → `public/world/anim/foo.mp4`).

Re-audit (dry-run): `node scripts/archive-orphans.mjs`
