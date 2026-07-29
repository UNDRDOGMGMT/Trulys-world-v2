/**
 * Truly's World member rewards. Point thresholds are demo values — retune freely.
 * `kind` drives the badge/label; `art` is an optional Higgsfield image.
 */
export type RewardKind = 'merch' | 'ticket' | 'exclusive' | 'drop';

export interface Reward {
  id: string;
  kind: RewardKind;
  name: string;
  detail: string;
  cost: number;        // points to redeem
}

export const REWARDS: Reward[] = [
  { id: 'sticker-pack', kind: 'merch',     name: 'Heart-Arrow Sticker Pack', detail: 'Die-cut Truly’s World stickers, mailed to you.', cost: 250 },
  { id: 'dj-download',  kind: 'exclusive', name: 'Dear Joshua — Early Listen', detail: 'Stream the EP 24 hrs before it drops.',        cost: 500 },
  { id: 'poster',       kind: 'merch',     name: 'Sunset Strip Billboard Poster', detail: '18×24 print of the neon-noir Strip.',     cost: 800 },
  { id: 'shadows-tee',  kind: 'merch',     name: 'Shadows Tee', detail: 'Glitter-flock Shadows shirt from The Store.',                cost: 1200 },
  { id: 'presale',      kind: 'ticket',    name: 'Show Presale Access', detail: 'First crack at tickets to the 8/8 live show.',       cost: 1500 },
  { id: 'signed-vinyl', kind: 'drop',      name: 'Signed Dear Joshua Vinyl', detail: 'Hand-signed pressing — limited members drop.',   cost: 2500 },
  { id: 'meet-greet',   kind: 'ticket',    name: 'Meet & Greet + Guest List', detail: '+1 to the list and a backstage hello.',        cost: 4000 },
  { id: 'inner-drop',   kind: 'exclusive', name: 'Inner Circle Mystery Box', detail: 'Members-only unreleased merch + demos.',        cost: 6000 },
];

export const KIND_LABEL: Record<RewardKind, string> = {
  merch: 'Merch', ticket: 'Tickets', exclusive: 'Exclusive', drop: 'Limited Drop',
};
export const KIND_ICON: Record<RewardKind, string> = {
  merch: '✶', ticket: '✦', exclusive: '♥', drop: '★',
};
