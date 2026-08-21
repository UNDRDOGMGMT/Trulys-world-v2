import hollywoodBg from '@/assets/locations/hollywood.webp';
import hollywood2Bg from '@/assets/locations/hollywood-2.jpg';
import dtlaBg from '@/assets/locations/dtla.webp';
import beverlyHillsBg from '@/assets/locations/beverly-hills.webp';
import echoParkBg from '@/assets/locations/echo-park.webp';
import silverlakeBg from '@/assets/locations/silverlake.webp';
import koreatownBg from '@/assets/locations/koreatown.webp';
import wehoBg from '@/assets/locations/weho.webp';
import longBeachBg from '@/assets/locations/long-beach.webp';
import laurelCanyonHillsBg from '@/assets/locations/laurel-canyon.webp';
import malibuBg from '@/assets/locations/malibu.webp';
import chateauBg from '@/assets/locations/chateau.jpg';
import chateauBalconyBg from '@/assets/locations/chateau-balcony.jpg';
import santaMonicaBg from '@/assets/locations/santa-monica.webp';
import veniceBg from '@/assets/locations/venice.webp';
import theValleyBg from '@/assets/locations/the-valley.webp';
import laxBg from '@/assets/locations/lax.webp';
import laurelCanyonBg from '@/assets/locations/laurel-canyon.jpg';
import santaMonica2Bg from '@/assets/locations/santa-monica-2.jpg';

export interface EmbedData {
  type: 'spotify' | 'youtube' | 'soundcloud' | 'instagram';
  url: string;
  title: string;
}

export interface ExtraItem {
  label: string;
  href?: string;
}

/** A clickable region on an establishing view that switches to another POV. */
export interface EnvHotspot {
  /** Position as % of the view image. */
  x: number;
  y: number;
  /** id of the view to switch to. */
  to: string;
  label: string;
}

/** A single point-of-view within a neighborhood. */
export interface EnvView {
  id: string;
  label: string;
  /** Still image (also the video poster). */
  src: string;
  /** Portrait (mobile) version of the still — shown on portrait screens. */
  srcPortrait?: string;
  /** Ambient cinemagraph loop for this POV. */
  video?: string;
  /** Clickable regions (usually only on the establishing shot) that change the POV. */
  hotspots?: EnvHotspot[];
  /** Optional launch action for this POV (e.g. start the Cruise Night game from Street Level).
   *  `shop: true` marks a non-game destination (e.g. The Store) so it's never framed as an arcade game. */
  action?: { label: string; to: string; shop?: boolean; download?: boolean };
}

/** An explorable neighborhood: opens on `start`, click hotspots to change POV. */
export interface Environment {
  /** id of the establishing view you land on. */
  start: string;
  views: EnvView[];
}

export interface LocationData {
  id: string;
  name: string;
  neighborhood: string;
  caseLabel: string;
  /** Hotspot position as % of map width / height, for the landscape map asset */
  x: number;
  y: number;
  /** Optional overrides for the portrait map asset — defaults to x/y when omitted */
  xPortrait?: number;
  yPortrait?: number;
  headline: string;
  body: string;
  cta: { label: string; href?: string };
  extras?: ExtraItem[];
  backgroundImage?: string;
  embeds?: EmbedData[];
  /** Pulled inked environment assets (launch hoods) — triggers the designed-out neighborhood layout. */
  environment?: Environment;
  /** Show a ribbon label pill next to the hotspot (for locations without a baked-in label on the map) */
  showLabel?: boolean;
}

export const locations: LocationData[] = [
  {
    id: 'hollywood',
    name: 'Hollywood',
    neighborhood: 'Music / Releases',
    caseLabel: '✦ TRULYS WORLD ✦',
    x: 50, y: 17,
    xPortrait: 50, yPortrait: 27,
    showLabel: true,
    headline: 'SHADOWS — OUT NOW',
    body: "Shadows out now. Dear Joshua — the EP — out August 21. One LA show August 8, location TBA.",
    cta: { label: 'LISTEN / SAVE', href: 'https://open.spotify.com/artist/6Hqu0lCYGK2QO1vp4rwDMS' },
    extras: [
      { label: '✦ RSVP for the LA show · Aug 8 →', href: '/rsvp' },
      { label: 'FOLLOW ON SPOTIFY →', href: 'https://open.spotify.com/artist/6Hqu0lCYGK2QO1vp4rwDMS' },
    ],
    backgroundImage: '/world/maps/hw-aerial.jpg',
    environment: {
      start: 'aerial',
      views: [
        { id: 'aerial', label: 'Hollywood Blvd', src: '/world/maps/hw-aerial.jpg', srcPortrait: '/world/maps/hw-aerial-v9.jpg', video: '/world/anim/hw-aerial-cine.mp4', hotspots: [
          { x: 17, y: 40, to: 'vista', label: 'The Vista' },
          { x: 46, y: 78, to: 'boulevard', label: 'The Boulevard' },
          { x: 85, y: 62, to: 'closeup', label: 'The Theatre' },
        ] },
        { id: 'boulevard', label: 'The Boulevard', src: '/world/maps/hw-street.jpg', srcPortrait: '/world/maps/hw-street-v9.jpg', video: '/world/anim/hw-street-cine.mp4', action: { label: 'Save Truly', to: '/save-truly' } },
        { id: 'vista', label: 'The Vista', src: '/world/theater/vista-exterior-wide.jpg', srcPortrait: '/world/theater/vista-exterior-v9.jpg', action: { label: 'Enter the Vista', to: '/vista' } },
        { id: 'closeup', label: 'The Theatre', src: '/world/maps/hw-c3.jpg', srcPortrait: '/world/maps/hw-c3-v9.jpg', video: '/world/anim/hw-c3-cine.mp4' },
      ],
    },
    embeds: [
      { type: 'spotify', url: 'https://open.spotify.com/embed/artist/6Hqu0lCYGK2QO1vp4rwDMS?utm_source=generator', title: 'Truly Young on Spotify' },
    ],
  },
  {
    id: 'dtla',
    name: 'DTLA',
    neighborhood: 'Cruise Night',
    caseLabel: '✦ TRULYS WORLD ✦',
    x: 70, y: 50,
    xPortrait: 76, yPortrait: 60,
    showLabel: true,
    headline: 'CRUISE NIGHT.',
    body: "A driving game through the city.",
    cta: { label: '▶ DRIVE CRUISE NIGHT', href: '/cruise-night' },
    extras: [
      { label: '◆ downtown · the valley · the beach' },
      { label: '◆ arrow keys or touch — sound optional' },
    ],
    backgroundImage: '/cruise/hero.png',
    environment: {
      start: 'aerial',
      views: [
        { id: 'aerial', label: 'Downtown', src: '/world/maps/dtla-aerial.jpg', srcPortrait: '/world/maps/dtla-aerial-v9.jpg', video: '/world/anim/dtla-aerial-cine.mp4', hotspots: [
          { x: 80, y: 60, to: 'arts', label: 'Arts District' },
          { x: 47, y: 58, to: 'rooftops', label: 'Rooftops' },
          { x: 18, y: 68, to: 'street', label: 'Street Level' },
        ] },
        { id: 'arts', label: 'Arts District', src: '/world/maps/dtla-arts.jpg', srcPortrait: '/world/maps/dtla-arts-v9.jpg', video: '/world/anim/dtla-arts-cine.mp4' },
        { id: 'rooftops', label: 'Rooftops', src: '/world/maps/dtla-c1-2.jpg', srcPortrait: '/world/maps/dtla-c1-2-v9.jpg', video: '/world/anim/dtla-roof-cine-2.mp4', action: { label: 'Type Her Letter', to: '/dear-joshua-game' } },
        { id: 'street', label: 'Street Level', src: '/world/maps/dtla-street-2.jpg', srcPortrait: '/world/maps/dtla-street-2-v9.jpg', video: '/world/anim/dtla-street-2.mp4', action: { label: 'Cruise Night', to: '/cruise-night' } },
      ],
    },
  },
  {
    id: 'beverly-hills',
    name: 'Beverly Hills',
    neighborhood: 'Press / EPK',
    caseLabel: '✦ TRULYS WORLD ✦',
    x: 30, y: 42,
    xPortrait: 38, yPortrait: 44,
    showLabel: true,
    headline: 'PRESS & EPK.',
    body: "Bio, photos, and links for press and partners.",
    cta: { label: 'FOLLOW ON INSTAGRAM →', href: 'https://www.instagram.com/trulyoung' },
    backgroundImage: '/world/maps/bh-aerial-3.jpg',
    environment: {
      start: 'aerial',
      views: [
        { id: 'aerial', label: 'The Flats', src: '/world/maps/bh-aerial-3.jpg', srcPortrait: '/world/maps/bh-aerial-v9b.jpg', video: '/world/anim/bh-aerial-cine-2.mp4', hotspots: [
          { x: 26, y: 62, to: 'rodeo', label: 'Rodeo Drive' },
          { x: 76, y: 52, to: 'detail', label: 'The Gardens' },
        ] },
        { id: 'rodeo', label: 'Rodeo Drive', src: '/world/maps/bh-rodeo-3.jpg', srcPortrait: '/world/maps/bh-rodeo-v9b.jpg' },
        { id: 'detail', label: 'The Gardens', src: '/world/maps/bh-c1.jpg', srcPortrait: '/world/maps/bh-c1-v9.jpg' },
      ],
    },
  },
  {
    id: 'koreatown',
    name: 'Koreatown',
    neighborhood: 'Karaoke',
    caseLabel: '✦ TRULYS WORLD ✦',
    x: 50, y: 58,
    xPortrait: 58, yPortrait: 48,
    showLabel: true,
    headline: 'KARAOKE',
    body: "Sing along to Dear Joshua.",
    cta: { label: 'FOLLOW FOR DROPS', href: 'https://www.instagram.com/trulyoung' },
    backgroundImage: '/world/maps/ktown-aerial.jpg',
    environment: {
      start: 'aerial',
      views: [
        { id: 'aerial', label: 'The Rooftops', src: '/world/maps/ktown-aerial.jpg', srcPortrait: '/world/maps/ktown-aerial-v9.jpg', video: '/world/anim/ktown-aerial-cine.mp4', hotspots: [
          { x: 76, y: 52, to: 'night', label: 'After Hours' },
        ] },
        { id: 'night', label: 'After Hours', src: '/world/maps/ktown-night.jpg', srcPortrait: '/world/maps/ktown-night-v9.jpg', action: { label: '♪ Sing Karaoke', to: '/karaoke' } },
      ],
    },
  },
  {
    id: 'weho',
    name: 'West Hollywood',
    neighborhood: 'Merch',
    caseLabel: '✦ TRULYS WORLD ✦',
    x: 25, y: 35,
    xPortrait: 32, yPortrait: 38,
    headline: 'MERCH',
    body: "Truly’s World merch — new drops soon.",
    cta: { label: 'ENTER THE STORE', href: '/boutique' },
    backgroundImage: '/world/maps/weho-aerial.jpg',
    environment: {
      start: 'aerial',
      views: [
        { id: 'aerial', label: 'Sunset Strip', src: '/world/maps/weho-aerial.jpg', srcPortrait: '/world/maps/weho-aerial-v9.jpg', hotspots: [
          { x: 38, y: 34, to: 'chateau', label: 'The Chateau' },
          { x: 62, y: 66, to: 'street', label: 'The Strip' },
        ] },
        { id: 'chateau', label: 'The Chateau', src: '/world/maps/weho-chateau-facade.jpg', srcPortrait: '/world/maps/weho-chateau-facade-v9.jpg', action: { label: 'Do Not Disturb', to: '/do-not-disturb' } },
        { id: 'street', label: 'The Strip', src: '/world/maps/weho-street.jpg', srcPortrait: '/world/maps/weho-street-v9.jpg' },
        { id: 'store', label: 'The Stores', src: '/shop/exterior-2.jpg', srcPortrait: '/shop/exterior-2-v.jpg', action: { label: 'The Boutique & The Record Shop', to: '/boutique', shop: true } },
      ],
    },
  },
  {
    id: 'santa-monica',
    name: 'Santa Monica',
    neighborhood: 'Live / Sessions',
    caseLabel: '✦ TRULYS WORLD ✦',
    x: 10, y: 50,
    xPortrait: 17, yPortrait: 43,
    headline: 'LIVING ROOM SESSIONS',
    body: "Live sessions on YouTube.",
    cta: { label: 'WATCH ON YOUTUBE', href: 'https://www.youtube.com/watch?v=E4UoxDHn5-o' },
    backgroundImage: '/world/maps/sm-aerial-3.jpg',
    environment: {
      start: 'aerial',
      views: [
        { id: 'aerial', label: 'The Coastline', src: '/world/maps/sm-aerial-3.jpg', srcPortrait: '/world/maps/sm-aerial-v9b.jpg', video: '/world/anim/sm-aerial-cine-2.mp4', hotspots: [
          { x: 42, y: 53, to: 'wheel', label: 'The Ferris Wheel' },
          { x: 26, y: 63, to: 'pier', label: 'The Pier' },
          { x: 66, y: 38, to: 'waterline', label: 'The Waterline' },
        ] },
        { id: 'pier', label: 'The Pier', src: '/world/maps/sm-pier-2.jpg', srcPortrait: '/world/maps/sm-pier-2-v9.jpg' },
        { id: 'wheel', label: 'The Ferris Wheel', src: '/world/maps/sm-c1.jpg', srcPortrait: '/world/maps/sm-c1-v9.jpg', video: '/world/anim/sm-loop.mp4' },
        { id: 'arcade', label: 'The Arcade', src: '/world/maps/sm-c2.jpg', srcPortrait: '/world/maps/sm-c2-v9.jpg' },
        { id: 'waterline', label: 'The Waterline', src: '/world/maps/sm-c3.jpg', srcPortrait: '/world/maps/sm-c3-v9.jpg' },
      ],
    },
    embeds: [
      { type: 'youtube', url: 'https://www.youtube.com/embed/E4UoxDHn5-o?si=AEMe_YKF85q6Tlqw', title: 'Living Room Session' },
    ],
  },
  {
    id: 'venice',
    name: 'Venice',
    neighborhood: 'Videos',
    caseLabel: '✦ TRULYS WORLD ✦',
    x: 30, y: 65,
    xPortrait: 22, yPortrait: 58,
    headline: 'VIDEOS',
    body: "Music videos — coming soon.",
    cta: { label: 'FOLLOW ON INSTAGRAM →', href: 'https://www.instagram.com/trulyoung' },
    backgroundImage: '/world/maps/ven-canals-2.jpg',
    environment: {
      start: 'canals',
      views: [
        { id: 'canals', label: 'The Canals', src: '/world/maps/ven-canals-2.jpg', srcPortrait: '/world/maps/ven-canals-2-v9.jpg', video: '/world/anim/ven-canals-cine-2.mp4', hotspots: [
          { x: 28, y: 42, to: 'boardwalk', label: 'The Boardwalk' },
          { x: 12, y: 30, to: 'abbot', label: 'Abbot Kinney' },
          { x: 68, y: 48, to: 'detail', label: 'Canal Detail' },
        ] },
        { id: 'boardwalk', label: 'The Boardwalk', src: '/world/maps/ven-boardwalk-2.jpg', srcPortrait: '/world/maps/ven-boardwalk-2-v9.jpg' },
        { id: 'abbot', label: 'Abbot Kinney', src: '/world/maps/ven-abbot.jpg', srcPortrait: '/world/maps/ven-abbot-v9.jpg' },
        { id: 'detail', label: 'Canal Detail', src: '/world/maps/ven-c1.jpg', srcPortrait: '/world/maps/ven-c1-v9.jpg' },
      ],
    },
  },
  {
    id: 'silverlake',
    name: 'Silverlake / Echo Park',
    neighborhood: 'Community',
    caseLabel: '✦ TRULYS WORLD ✦',
    x: 55, y: 38,
    xPortrait: 76, yPortrait: 44,
    headline: 'COMMUNITY',
    body: "Covers and edits on Discord.",
    cta: { label: 'JOIN DISCORD', href: 'https://discord.com/invite/HxJqex8aE' },
    extras: [
      { label: 'Submit a cover or edit →', href: 'https://discord.com/invite/HxJqex8aE' },
      { label: 'Follow on Instagram →', href: 'https://www.instagram.com/trulyoung' },
    ],
    backgroundImage: '/world/maps/silverlake-aerial.jpg',
    environment: {
      start: 'aerial',
      views: [
        { id: 'aerial', label: 'The Reservoir', src: '/world/maps/silverlake-aerial.jpg', srcPortrait: '/world/maps/silverlake-aerial-v9.jpg', video: '/world/anim/silverlake-aerial-cine.mp4', action: { label: 'Download The Dear Joshua Campaign', to: '/selects', download: true }, hotspots: [
          { x: 14, y: 42, to: 'stairs', label: 'The Stairs' },
          { x: 55, y: 84, to: 'eastside', label: 'The Eastside' },
          { x: 86, y: 66, to: 'closeup', label: 'Close-up' },
        ] },
        { id: 'eastside', label: 'The Eastside', src: '/world/maps/silverlake-street.jpg', srcPortrait: '/world/maps/silverlake-street-v9.jpg', action: { label: 'Boy — Say It To His Face', to: '/boy-game' } },
        { id: 'stairs', label: 'The Stairs', src: '/world/maps/silverlake-stairs-2.jpg', srcPortrait: '/world/maps/silverlake-stairs-2-v9.jpg', action: { label: 'Fear The Reaper', to: '/fear-the-reaper' } },
        { id: 'closeup', label: 'Close-up', src: '/world/maps/silverlake-c3.jpg', srcPortrait: '/world/maps/silverlake-c3-v9.jpg' },
      ],
    },
    embeds: [
      { type: 'instagram', url: 'https://www.instagram.com/trulyoung', title: '@trulyoung on Instagram' },
    ],
  },
  {
    id: 'laurel-canyon',
    name: 'Laurel Canyon',
    neighborhood: 'Music',
    caseLabel: '✦ TRULYS WORLD ✦',
    x: 55, y: 18,
    xPortrait: 72, yPortrait: 22,
    showLabel: true,
    headline: 'LISTEN',
    body: "Truly’s music on Spotify.",
    cta: { label: 'LISTEN ON SPOTIFY', href: 'https://open.spotify.com/artist/6Hqu0lCYGK2QO1vp4rwDMS' },
    backgroundImage: laurelCanyonHillsBg,
    environment: {
      start: 'ventura',
      views: [
        { id: 'ventura', label: 'Ventura Blvd', src: '/world/maps/lc-ventura-2.jpg', srcPortrait: '/world/maps/lc-ventura-2-v9.jpg', video: '/world/anim/lc-ventura-loop-2.mp4', hotspots: [
          { x: 52, y: 44, to: 'canyon', label: 'Up the Canyon' },
          { x: 74, y: 56, to: 'cabin', label: 'The Cabin' },
        ] },
        { id: 'canyon', label: 'Laurel Canyon', src: '/world/maps/lc-canyon.jpg', srcPortrait: '/world/maps/lc-canyon-v9.jpg' },
        { id: 'cabin', label: 'The Cabin', src: '/world/anim/lc-poster.jpg', srcPortrait: '/world/maps/lc-poster-v9.jpg' },
      ],
    },
  },
  {
    id: 'the-valley',
    name: 'The Valley',
    neighborhood: 'The EP Arcade',
    caseLabel: '✦ TRULYS WORLD ✦',
    x: 85, y: 24,
    xPortrait: 50, yPortrait: 12,
    headline: 'PLAY THE EP.',
    body: "Every Dear Joshua track as a game. EP out August 21.",
    cta: { label: '🎳 CORBIN BOWL — THE EP ARCADE', href: '/corbin-bowl' },
    backgroundImage: '/world/maps/val-aerial.jpg',
    environment: {
      start: 'aerial',
      views: [
        { id: 'aerial', label: 'The Grid', src: '/world/maps/val-aerial.jpg', srcPortrait: '/world/maps/val-aerial-v9.jpg', video: '/world/anim/val-aerial-cine.mp4', hotspots: [
          { x: 55, y: 60, to: 'street', label: 'Ventura Blvd' },
          { x: 38, y: 78, to: 'pool', label: 'The Backyard' },
          { x: 82, y: 52, to: 'detail', label: 'The Flamingo' },
        ] },
        { id: 'street', label: 'Ventura Blvd', src: '/world/maps/val-street-2.jpg', srcPortrait: '/world/maps/val-street-2-v9.jpg', action: { label: '🎳 Corbin Bowl — the EP Arcade', to: '/corbin-bowl' } },
        { id: 'pool', label: 'The Backyard', src: '/world/maps/val-pool.jpg', srcPortrait: '/world/maps/val-pool-v9.jpg' },
        { id: 'detail', label: 'The Flamingo', src: '/world/maps/val-c3.jpg', srcPortrait: '/world/maps/val-c3-v9.jpg' },
      ],
    },
  },
  {
    id: 'malibu',
    name: 'Malibu',
    neighborhood: 'Downloads / Wallpapers',
    caseLabel: '✦ TRULYS WORLD ✦',
    x: 14, y: 33,
    xPortrait: 14, yPortrait: 30,
    showLabel: true,
    headline: 'DOWNLOADS.',
    body: "Wallpapers, icons, and photos.",
    cta: { label: 'DOWNLOAD THE DEAR JOSHUA CAMPAIGN →', href: '/selects' },
    extras: [
      { label: 'Tap any photo to save it.' },
    ],
    backgroundImage: '/world/maps/malibu-cliffs-3.jpg',
    environment: {
      start: 'cliffs',
      views: [
        { id: 'cliffs', label: 'The Cliffs', src: '/world/maps/malibu-cliffs-3.jpg', srcPortrait: '/world/maps/malibu-cliffs-v9b.jpg', video: '/world/anim/malibu-cliffs-cine-2.mp4', hotspots: [
          { x: 46, y: 70, to: 'pch', label: 'PCH' },
          { x: 16, y: 46, to: 'pier', label: 'The Pier' },
          { x: 60, y: 44, to: 'detail', label: 'The Horizon' },
        ] },
        { id: 'pch', label: 'PCH', src: '/world/maps/malibu-pch-3.jpg', srcPortrait: '/world/maps/malibu-pch-v9b.jpg' },
        { id: 'pier', label: 'The Pier', src: '/world/maps/malibu-pier-2.jpg', srcPortrait: '/world/maps/malibu-pier-2-v9.jpg' },
        { id: 'detail', label: 'The Horizon', src: '/world/maps/malibu-c1-3.jpg', srcPortrait: '/world/maps/malibu-c1-v9b.jpg' },
      ],
    },
  },
  {
    id: 'inglewood',
    name: 'Inglewood',
    neighborhood: 'Dress-Up',
    caseLabel: '✦ TRULYS WORLD ✦',
    x: 45, y: 82,
    xPortrait: 42, yPortrait: 60,
    showLabel: true,
    headline: 'DRESS UP',
    body: "A dress-up game.",
    cta: { label: 'SHOP THE LOOKS →', href: '/boutique' },
    backgroundImage: '/world/maps/ing-sofi.jpg',
    environment: {
      start: 'sofi',
      views: [
        { id: 'sofi', label: 'The Stadium', src: '/world/maps/ing-sofi.jpg', srcPortrait: '/world/maps/ing-sofi-v9.jpg', video: '/world/anim/ing-sofi-cine.mp4', hotspots: [
          { x: 42, y: 52, to: 'forum', label: 'The Forum' },
          { x: 80, y: 60, to: 'street', label: 'The Strip' },
          { x: 14, y: 42, to: 'detail', label: 'City Lights' },
        ] },
        { id: 'forum', label: 'The Forum', src: '/world/maps/ing-forum.jpg', srcPortrait: '/world/maps/ing-forum-v9.jpg' },
        { id: 'street', label: 'The Strip', src: '/world/maps/ing-street.jpg', srcPortrait: '/world/maps/ing-street-v9.jpg' },
        { id: 'detail', label: 'City Lights', src: '/world/maps/ing-c1.jpg', srcPortrait: '/world/maps/ing-c1-v9.jpg' },
      ],
    },
  },
  {
    id: 'lax',
    name: 'LAX',
    neighborhood: 'Mailing List / SMS',
    caseLabel: '✦ TRULYS WORLD ✦',
    x: 38, y: 92,
    xPortrait: 40, yPortrait: 76,
    showLabel: true,
    headline: 'MAILING LIST',
    body: "Sign up for release news.",
    cta: { label: '🕹 TRULY\'S PINBALL — DEAR JOSHUA EDITION', href: '/trulys-pinball' },
    backgroundImage: '/world/maps/lax-arrivals-2.jpg',
    environment: {
      start: 'arrivals',
      views: [
        { id: 'arrivals', label: 'Arrivals', src: '/world/maps/lax-arrivals-2.jpg', srcPortrait: '/world/maps/lax-arrivals-2-v9.jpg', hotspots: [
          { x: 78, y: 60, to: 'interior', label: 'Interior' },
          { x: 92, y: 38, to: 'window', label: 'Window Seat' },
          { x: 18, y: 42, to: 'approach', label: 'Approach' },
        ] },
        { id: 'interior', label: 'Interior', src: '/world/maps/lax-ufo-interior.jpg', srcPortrait: '/world/maps/lax-ufo-interior-v9.jpg', video: '/world/anim/lax-ufo-interior-cine.mp4' },
        { id: 'window', label: 'Window Seat', src: '/world/maps/lax-ufo-window.jpg', srcPortrait: '/world/maps/lax-ufo-window-v9.jpg', video: '/world/anim/lax-ufo-window-cine.mp4' },
        { id: 'approach', label: 'Approach', src: '/world/maps/lax-approach.jpg', srcPortrait: '/world/maps/lax-approach-v9.jpg' },
      ],
    },
  },
  {
    id: 'long-beach',
    name: 'Long Beach',
    neighborhood: 'B-Sides / SoundCloud',
    caseLabel: '✦ TRULYS WORLD ✦',
    x: 75, y: 88,
    xPortrait: 52, yPortrait: 92,
    headline: 'B-SIDES.',
    body: "Demos and alternates on SoundCloud.",
    cta: { label: 'LISTEN ON SOUNDCLOUD →', href: 'https://soundcloud.com/trulyoung' },
    backgroundImage: '/world/maps/lb-aerial.jpg',
    environment: {
      start: 'aerial',
      views: [
        { id: 'aerial', label: 'The Harbor', src: '/world/maps/lb-aerial.jpg', srcPortrait: '/world/maps/lb-aerial-v9.jpg', video: '/world/anim/lb-aerial-cine.mp4', hotspots: [
          { x: 48, y: 45, to: 'ship', label: 'The Queen Mary' },
          { x: 14, y: 60, to: 'port', label: 'The Port' },
          { x: 80, y: 52, to: 'light', label: 'The Lighthouse' },
        ] },
        { id: 'ship', label: 'The Queen Mary', src: '/world/maps/lb-ship.jpg', srcPortrait: '/world/maps/lb-ship-v9.jpg' },
        { id: 'port', label: 'The Port', src: '/world/maps/lb-port.jpg', srcPortrait: '/world/maps/lb-port-v9.jpg' },
        { id: 'light', label: 'The Lighthouse', src: '/world/maps/lb-light.jpg', srcPortrait: '/world/maps/lb-light-v9.jpg' },
      ],
    },
    embeds: [
      { type: 'soundcloud', url: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/trulyoung&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true', title: 'Truly on SoundCloud' },
    ],
  },
];
