import type { Player } from '@/types/game';
import type { FormationSlot, Ring, ThrowResult, Wedge } from '@/lib/dartDraft';

/**
 * DART MAP — the "Hit the Country, Pick a Player" world-map board
 * (owner brief 2026-07-10: replicate the YouTube format — darts thrown at a
 * world map; the country you hit is the nationality you must draft, and
 * circular bonus STICKERS placed over the map override the country when hit).
 *
 * The map is a stylized board-game world (viewBox 0 0 200 120): six
 * hand-drawn continent blobs plus named nation polygons for the football
 * heavyweights (Brazil and Argentina inside South America; England, France,
 * Spain, Italy, Germany and Portugal inside Europe). Aesthetics over
 * cartography — recognizable shapes, not survey data. Anything that hits no
 * polygon is ocean: LOST AT SEA, and the sea shows no mercy.
 *
 * Quality in map mode comes from WHERE you hit, not rings: every non-ocean
 * pull ranks the filtered pool by market value and draws randomly from the
 * TOP HALF. Stickers re-randomize every throw, so the juicy zones move.
 */

export const MAP_W = 200;
export const MAP_H = 120;

/* ---------------- Regions ---------------- */
export type MapRegionKind = 'nation' | 'region' | 'ocean';

export interface MapRegion {
  id: string;
  label: string;   // result-card label
  short: string;   // short label painted on the map
  kind: MapRegionKind;
  match?: string;  // exact nationality for kind 'nation'
  color: string;   // polygon fill + result-card accent
}

export const OCEAN_REGION: MapRegion = {
  id: 'ocean', label: 'Lost at Sea', short: 'OCEAN', kind: 'ocean', color: 'hsl(203 75% 62%)',
};

export const CONTINENT_REGIONS: MapRegion[] = [
  { id: 'northamerica', label: 'North America (CONCACAF)', short: 'N. AMERICA', kind: 'region', color: 'hsl(25 55% 46%)' },
  { id: 'southamerica', label: 'South America (CONMEBOL)', short: 'S. AMERICA', kind: 'region', color: 'hsl(95 40% 42%)' },
  { id: 'europe',       label: 'Europe (UEFA)',            short: 'EUROPE',     kind: 'region', color: 'hsl(210 48% 48%)' },
  { id: 'africa',       label: 'Africa (CAF)',             short: 'AFRICA',     kind: 'region', color: 'hsl(40 58% 46%)' },
  { id: 'asia',         label: 'Asia & Middle East (AFC)', short: 'ASIA',       kind: 'region', color: 'hsl(0 48% 48%)' },
  { id: 'oceania',      label: 'Oceania (OFC)',            short: 'OCEANIA',    kind: 'region', color: 'hsl(285 40% 50%)' },
];

export const NATION_REGIONS: MapRegion[] = [
  { id: 'brazil',    label: 'Brazil',    short: 'BRA', kind: 'nation', match: 'Brazil',    color: 'hsl(58 82% 52%)' },
  { id: 'argentina', label: 'Argentina', short: 'ARG', kind: 'nation', match: 'Argentina', color: 'hsl(197 72% 62%)' },
  { id: 'england',   label: 'England',   short: 'ENG', kind: 'nation', match: 'England',   color: 'hsl(350 72% 58%)' },
  { id: 'france',    label: 'France',    short: 'FRA', kind: 'nation', match: 'France',    color: 'hsl(228 72% 64%)' },
  { id: 'spain',     label: 'Spain',     short: 'ESP', kind: 'nation', match: 'Spain',     color: 'hsl(18 82% 56%)' },
  { id: 'italy',     label: 'Italy',     short: 'ITA', kind: 'nation', match: 'Italy',     color: 'hsl(145 55% 46%)' },
  { id: 'germany',   label: 'Germany',   short: 'GER', kind: 'nation', match: 'Germany',   color: 'hsl(45 82% 55%)' },
  { id: 'portugal',  label: 'Portugal',  short: 'POR', kind: 'nation', match: 'Portugal',  color: 'hsl(125 50% 46%)' },
];

const REGION_BY_ID: Record<string, MapRegion> = Object.fromEntries(
  [...CONTINENT_REGIONS, ...NATION_REGIONS, OCEAN_REGION].map(r => [r.id, r]),
);
export function mapRegion(id: string): MapRegion {
  return REGION_BY_ID[id] ?? OCEAN_REGION;
}

/* ---------------- Polygons (hand-authored board-game world) ---------------- */
export interface MapPoly {
  id: string;
  regionId: string;
  points: [number, number][];
}

// Continents: 10-20 vertices each, drawn clockwise on the 200x120 canvas.
export const CONTINENT_POLYS: MapPoly[] = [
  { id: 'northamerica', regionId: 'northamerica', points: [
    [8, 20], [16, 12], [34, 10], [50, 14], [56, 20], [57, 30], [53, 38], [55, 44],
    [50, 42], [52, 48], [57, 54], [54, 57], [46, 50], [40, 44], [33, 36], [27, 26], [12, 26],
  ] },
  { id: 'southamerica', regionId: 'southamerica', points: [
    [58, 57], [64, 54.5], [71, 56], [77, 59], [83, 64], [81, 71], [76, 78], [71, 84],
    [68, 90], [65, 98], [61.5, 96], [60.5, 88], [58.5, 77], [56.5, 67], [55.5, 60],
  ] },
  { id: 'europe', regionId: 'europe', points: [
    [93, 36], [92.5, 30], [96, 27.5], [99.5, 25], [103.5, 23], [106.5, 19.5], [106, 13],
    [111, 8.5], [116.5, 10.5], [113.5, 18], [118, 20.5], [127, 18.5], [128, 26],
    [124, 30.5], [119.5, 33], [115, 36], [110, 34], [105, 34.5], [97, 35.5],
  ] },
  { id: 'africa', regionId: 'africa', points: [
    [95, 44], [104, 42.5], [113, 43.5], [118.5, 42], [120, 46.5], [123.5, 51], [129, 53],
    [124.5, 56.5], [120.5, 62], [118, 72], [114.5, 80], [111, 84.5], [106.5, 82.5],
    [104.5, 74], [103, 64], [104.5, 57.5], [98, 55.5], [93.5, 52.5], [90.5, 49.5], [92.5, 46.5],
  ] },
  { id: 'asia', regionId: 'asia', points: [
    [129.5, 17], [145, 9.5], [166, 8.5], [180, 13], [181, 20], [172, 28], [167, 35],
    [161, 45], [155, 51], [157, 58], [152.5, 53], [148, 46], [139.5, 55], [135.5, 46],
    [130.5, 44], [129.5, 51], [121.5, 52], [121, 41.5], [125.5, 34], [130.5, 27.5],
  ] },
  { id: 'oceania', regionId: 'oceania', points: [
    [162.5, 76], [169, 72.5], [175.5, 70.5], [178, 76.5], [183, 79.5], [184.5, 84.5],
    [179.5, 88.5], [170.5, 88], [163, 84], [160.5, 79.5],
  ] },
];

// Islands that belong to a continent region (hit = that region).
export const ISLAND_POLYS: MapPoly[] = [
  { id: 'japan',      regionId: 'asia',    points: [[182.5, 29.5], [185.8, 32.5], [184.8, 38.5], [181.3, 35.5]] },
  { id: 'indonesia',  regionId: 'asia',    points: [[160, 60], [168, 61.5], [174, 64], [170, 66.5], [162, 64.5], [157.5, 61.5]] },
  { id: 'newzealand', regionId: 'oceania', points: [[190, 86], [193.5, 88.5], [196, 93.5], [192.5, 92], [190.5, 89]] },
];

// Nation polygons sit ON TOP of (and are checked before) their continents, so
// peninsulas that poke past the continent outline (Italy's boot, the England
// island) still resolve to the nation.
export const NATION_POLYS: MapPoly[] = [
  { id: 'brazil', regionId: 'brazil', points: [
    [63.5, 58.5], [71, 57.5], [77, 60], [81.5, 64.5], [79.5, 70.5], [75, 77], [70.5, 81.5], [67.5, 77], [66, 70], [62.5, 63.5],
  ] },
  { id: 'argentina', regionId: 'argentina', points: [
    [63.5, 83], [70, 84.5], [67.5, 89], [66, 93.5], [64.3, 96.8], [62.8, 93], [62.5, 87.5], [62.8, 84],
  ] },
  { id: 'england', regionId: 'england', points: [
    [96.6, 24.2], [96.1, 21.2], [97.7, 18.9], [100, 19.6], [99.7, 22.6], [98.6, 24.7],
  ] },
  { id: 'france', regionId: 'france', points: [
    [96.6, 27.6], [99.7, 25.3], [102.9, 23.8], [105.5, 27.4], [104.6, 33.6], [100.8, 30.7],
  ] },
  { id: 'spain', regionId: 'spain', points: [
    [95.8, 35.3], [95.5, 30.2], [96.4, 28.2], [100.3, 30.8], [100.9, 33], [97.4, 35.2],
  ] },
  { id: 'italy', regionId: 'italy', points: [
    [106.4, 30.5], [110.3, 30], [109.6, 33.2], [112.6, 36.8], [114.7, 39.2], [112.8, 39.8],
    [110.7, 42.9], [109.1, 41.9], [109.6, 39.2], [107.9, 36.2], [106.9, 33.2],
  ] },
  { id: 'germany', regionId: 'germany', points: [
    [103.6, 23.5], [106.4, 19.9], [109.9, 21.3], [110.7, 26.7], [106, 27.1],
  ] },
  { id: 'portugal', regionId: 'portugal', points: [
    [93.2, 35.4], [92.9, 30.9], [95.1, 30.3], [95.7, 33], [95.3, 35.2],
  ] },
];

const LAND_POLYS: MapPoly[] = [...CONTINENT_POLYS, ...ISLAND_POLYS, ...NATION_POLYS];

/* ---------------- Point-in-polygon (ray casting) ---------------- */
export function pointInPoly(x: number, y: number, pts: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1];
    const xj = pts[j][0], yj = pts[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function isLand(x: number, y: number): boolean {
  return LAND_POLYS.some(poly => pointInPoly(x, y, poly.points));
}

/* ---------------- Nationality -> region mapping ----------------
   Footballing confederations, not raw geography: all of UEFA maps to
   'europe' (so an Anatolia hit is the asia region, but Turkish PLAYERS are
   drafted by europe hits), CONMEBOL -> southamerica, CONCACAF ->
   northamerica, CAF -> africa, AFC + Middle East -> asia, OFC -> oceania.
   Covers the nationalities present in the top-600 market-value pool, with
   spelling variants the data uses. Unmapped nationalities stay draftable via
   nation polygons, stickers, ocean picks and the world fallback. */
const REGION_NATIONALITIES: Record<string, string[]> = {
  europe: [
    'England', 'Scotland', 'Wales', 'Northern Ireland', 'Ireland', 'Republic of Ireland',
    'France', 'Spain', 'Portugal', 'Italy', 'Germany', 'Netherlands', 'Belgium',
    'Croatia', 'Serbia', 'Bosnia-Herzegovina', 'Bosnia and Herzegovina', 'Slovenia',
    'Slovakia', 'Czechia', 'Czech Republic', 'Poland', 'Ukraine', 'Russia', 'Hungary',
    'Romania', 'Bulgaria', 'Greece', 'Turkey', 'T\u00fcrkiye', 'Switzerland', 'Austria',
    'Denmark', 'Sweden', 'Norway', 'Finland', 'Iceland', 'Albania', 'Kosovo',
    'North Macedonia', 'Macedonia', 'Montenegro', 'Georgia', 'Armenia', 'Azerbaijan',
    'Luxembourg', 'Cyprus', 'Malta', 'Belarus', 'Lithuania', 'Latvia', 'Estonia',
    'Moldova', 'Soviet Union',
  ],
  southamerica: [
    'Argentina', 'Brazil', 'Uruguay', 'Colombia', 'Chile', 'Ecuador', 'Paraguay',
    'Peru', 'Bolivia', 'Venezuela',
  ],
  northamerica: [
    'United States', 'USA', 'Mexico', 'Canada', 'Costa Rica', 'Panama', 'Jamaica',
    'Honduras', 'Guatemala', 'El Salvador', 'Haiti', 'Curacao', 'Cura\u00e7ao',
    'Trinidad and Tobago', 'Dominican Republic', 'Suriname', 'Cuba', 'Puerto Rico',
  ],
  africa: [
    'Morocco', 'Senegal', 'Nigeria', 'Ghana', 'Egypt', 'Algeria', 'Tunisia', 'Cameroon',
    'Ivory Coast', "Cote d'Ivoire", "C\u00f4te d'Ivoire", 'Mali', 'Burkina Faso',
    'DR Congo', 'Congo', 'Guinea', 'Guinea-Bissau', 'Gambia', 'The Gambia', 'Zambia',
    'Zimbabwe', 'South Africa', 'Angola', 'Mozambique', 'Cape Verde', 'Cabo Verde',
    'Togo', 'Benin', 'Gabon', 'Kenya', 'Uganda', 'Tanzania', 'Ethiopia', 'Libya',
    'Sudan', 'Equatorial Guinea', 'Sierra Leone', 'Niger', 'Madagascar', 'Comoros',
    'Mauritania', 'Rwanda', 'Burundi', 'Central African Republic',
  ],
  asia: [
    'Japan', 'South Korea', 'Korea, South', 'Korea South', 'North Korea', 'Korea, North',
    'China', 'China PR', 'Iran', 'Iraq', 'Saudi Arabia', 'Qatar', 'United Arab Emirates',
    'Jordan', 'Lebanon', 'Syria', 'Israel', 'Palestine', 'Uzbekistan', 'Kazakhstan',
    'Tajikistan', 'Kyrgyzstan', 'Turkmenistan', 'India', 'Indonesia', 'Thailand',
    'Vietnam', 'Philippines', 'Malaysia', 'Singapore', 'Bahrain', 'Kuwait', 'Oman',
    'Yemen', 'Afghanistan',
  ],
  oceania: ['Australia', 'New Zealand', 'Fiji', 'Papua New Guinea', 'New Caledonia', 'Tahiti'],
};

const NATIONALITY_REGION: Record<string, string> = {};
for (const [regionId, nations] of Object.entries(REGION_NATIONALITIES)) {
  for (const n of nations) NATIONALITY_REGION[n] = regionId;
}

export function regionForNationality(nationality: string): string | null {
  return NATIONALITY_REGION[nationality] ?? null;
}

/* ---------------- Stickers (bonus zones, re-rolled every throw) ---------------- */
export interface StickerDef {
  id: string;
  label: string;  // short, ALL CAPS — painted inside the circle
  emoji: string;
  color: string;
  pool: 'current' | 'legends';
  filter: (p: Player) => boolean;
}

export const STICKERS: StickerDef[] = [
  { id: 'vet35',       label: '35+ VETERAN',   emoji: '\ud83d\udc74', color: 'hsl(35 85% 55%)',  pool: 'current', filter: p => p.age >= 35 },
  { id: 'u21',         label: 'U21 WONDERKID', emoji: '\ud83d\udc23', color: 'hsl(150 70% 45%)', pool: 'current', filter: p => p.age > 0 && p.age <= 21 },
  { id: 'goldenboot',  label: 'GOLDEN BOOT',   emoji: '\ud83e\udd47', color: 'hsl(28 90% 52%)',  pool: 'current', filter: p => p.goals >= 200 },
  { id: 'assistking',  label: 'ASSIST KING',   emoji: '\ud83c\udd70\ufe0f', color: 'hsl(200 80% 55%)', pool: 'current', filter: p => p.assists >= 100 },
  { id: 'bigmoney',    label: '\u00a3100M+ CLUB', emoji: '\ud83d\udcb0', color: 'hsl(120 60% 45%)', pool: 'current', filter: p => p.marketValue >= 100 },
  { id: 'bargain',     label: 'BARGAIN BIN',   emoji: '\ud83d\uded2', color: 'hsl(0 0% 62%)',    pool: 'current', filter: p => p.marketValue <= 15 },
  { id: 'legends',     label: 'LEGENDS',       emoji: '\ud83d\udc51', color: 'hsl(48 95% 52%)',  pool: 'legends', filter: () => true },
  { id: 'engonly',     label: 'ENGLAND ONLY',  emoji: '\ud83e\udd81', color: 'hsl(350 70% 52%)', pool: 'current', filter: p => p.nationality === 'England' },
  { id: 'braonly',     label: 'BRAZIL ONLY',   emoji: '\ud83c\udde7\ud83c\uddf7', color: 'hsl(58 80% 48%)',  pool: 'current', filter: p => p.nationality === 'Brazil' },
  { id: 'fraonly',     label: 'FRANCE ONLY',   emoji: '\ud83c\uddeb\ud83c\uddf7', color: 'hsl(228 70% 60%)', pool: 'current', filter: p => p.nationality === 'France' },
  { id: 'prime',       label: 'PRIME TIME',    emoji: '\ud83d\udd25', color: 'hsl(15 85% 55%)',  pool: 'current', filter: p => p.age >= 25 && p.age <= 29 },
  { id: 'goalmachine', label: 'GOAL MACHINE',  emoji: '\u26bd',        color: 'hsl(280 60% 58%)', pool: 'current', filter: p => p.goals >= 100 },
];

export interface PlacedSticker {
  def: StickerDef;
  x: number;
  y: number;
  r: number;
}

/** 3-4 random sticker types dropped over land, non-overlapping, per throw. */
export function rollStickers(): PlacedSticker[] {
  const count = 3 + (Math.random() < 0.5 ? 1 : 0);
  const defs = [...STICKERS].sort(() => Math.random() - 0.5).slice(0, count);
  const placed: PlacedSticker[] = [];
  for (const def of defs) {
    const r = 7 + Math.random() * 3;
    for (let attempt = 0; attempt < 80; attempt++) {
      const x = r + Math.random() * (MAP_W - 2 * r);
      const y = r + Math.random() * (MAP_H - 2 * r);
      if (!isLand(x, y)) continue;
      if (placed.some(s => Math.hypot(s.x - x, s.y - y) < s.r + r + 2)) continue;
      placed.push({ def, x, y, r });
      break;
    }
  }
  return placed;
}

/* ---------------- Hit resolution ---------------- */
export type MapHit =
  | { kind: 'sticker'; sticker: StickerDef }
  | { kind: 'region'; region: MapRegion };

/** Stickers override nations override continents; open water is the ocean. */
export function resolveMapHit(x: number, y: number, stickers: PlacedSticker[]): MapHit {
  for (const s of stickers) {
    if (Math.hypot(x - s.x, y - s.y) <= s.r) return { kind: 'sticker', sticker: s.def };
  }
  for (const poly of NATION_POLYS) {
    if (pointInPoly(x, y, poly.points)) return { kind: 'region', region: mapRegion(poly.regionId) };
  }
  for (const poly of [...CONTINENT_POLYS, ...ISLAND_POLYS]) {
    if (pointInPoly(x, y, poly.points)) return { kind: 'region', region: mapRegion(poly.regionId) };
  }
  return { kind: 'region', region: OCEAN_REGION };
}

/* ---------------- Player draw ---------------- */
export const MAP_POINTS = { sticker: 40, nation: 25, region: 20, fallback: 20, ocean: 2 } as const;

/** ThrowResult.wedge stand-in so the result card / log stay shape-compatible. */
function wedgeForHit(hit: MapHit): Wedge {
  if (hit.kind === 'sticker') {
    const s = hit.sticker;
    return {
      id: 'sticker-' + s.id, label: s.emoji + ' ' + s.label + ' sticker', short: s.label,
      kind: s.id === 'legends' ? 'legends' : 'world', color: s.color, darkColor: s.color,
    };
  }
  const r = hit.region;
  return {
    id: 'map-' + r.id, label: r.label, short: r.short,
    kind: r.kind === 'nation' ? 'nation' : 'world', match: r.match, color: r.color, darkColor: r.color,
  };
}

/**
 * The map's verdict. Sticker/nation/continent filters the pool (plus the
 * slot's allowed positions); quality is positional, not ring-based: rank by
 * market value and draw randomly from the TOP HALF. Empty pool -> the world
 * steps in (usedWorldFallback). Ocean -> the single worst player who can
 * play the slot, for a pity 2 points. Ring codes keep the classic-log shape:
 * sticker hits log as T1 (they count as sharp hits), everything else T2,
 * ocean as MISS.
 */
export function drawFromMap(
  current: Player[],
  legends: Player[],
  hit: MapHit,
  slot: FormationSlot,
  usedNames: Set<string>,
): ThrowResult {
  const fits = (p: Player) => slot.allowed.includes(p.position) && !usedNames.has(p.name);
  const wedge = wedgeForHit(hit);

  if (hit.kind === 'region' && hit.region.kind === 'ocean') {
    const pool = current.filter(fits).sort((a, b) => a.marketValue - b.marketValue);
    return { wedge, ring: 'MISS', player: pool[0] ?? null, points: MAP_POINTS.ocean, usedWorldFallback: false };
  }

  let base: Player[];
  if (hit.kind === 'sticker') {
    const s = hit.sticker;
    base = (s.pool === 'legends' ? legends : current).filter(s.filter);
  } else {
    const region = hit.region;
    if (region.kind === 'nation') {
      const nat = region.match;
      base = current.filter(p => p.nationality === nat);
    } else {
      base = current.filter(p => regionForNationality(p.nationality) === region.id);
    }
  }

  let ring: Ring = hit.kind === 'sticker' ? 'T1' : 'T2';
  let points: number = hit.kind === 'sticker'
    ? MAP_POINTS.sticker
    : hit.region.kind === 'nation' ? MAP_POINTS.nation : MAP_POINTS.region;

  let pool = base.filter(fits);
  let usedWorldFallback = false;
  if (pool.length === 0) {
    pool = current.filter(fits);
    usedWorldFallback = true;
    ring = 'T2';
    points = MAP_POINTS.fallback;
    if (pool.length === 0) return { wedge, ring, player: null, points: 0, usedWorldFallback };
  }

  const sorted = [...pool].sort((a, b) => b.marketValue - a.marketValue);
  const topHalf = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
  const player = topHalf[Math.floor(Math.random() * topHalf.length)];
  return { wedge, ring, player, points, usedWorldFallback };
}
