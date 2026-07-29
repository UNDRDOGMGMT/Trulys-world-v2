# truly-world-v2

Clean-room rebuild of **Truly Young's** interactive site — *"her world is a map."*
Fresh Vite + React + TS + Tailwind scaffold, no Supabase / admin / analytics /
PWA / Lovable cruft. Reuses the assets + LA-map concept from the production
build (`~/Downloads/Trulys World`, live at www.trulys.world).

## Concept
An illustrated map of Los Angeles at midnight. Every neighborhood is a **case
file** — click a hotspot to open a window with Truly's music, videos, merch,
mailing list, or lore. Collect hidden spider-hearts to unlock the vault. The
*Dear Joshua* EP lives at `/dear-joshua` as six "rooms."

## Routes
- `/`             landing — enter the map
- `/map`          interactive LA map hub (portrait + landscape assets)
- `/location/:id` case-file window per neighborhood
- `/dear-joshua`  the EP as six rooms, playable teasers

## Dev
```
npm install
npm run dev      # http://localhost:8080
npm run build
```

## Deliberately dropped vs. production
Supabase client + migrations, admin/pulse dashboards, Vercel/Clarity analytics
(replaced by a no-op `trackEvent` stub in `src/lib/analytics.ts`), the password
gate, PWA/service worker, Sentry, and the ~90 shadcn UI primitives. Mini-games
(dress-up, heart-pop, etc.) and the standalone Vault page are not ported yet —
easy to add back on top of this base.
