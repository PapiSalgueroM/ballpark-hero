import { supabase } from '@/integrations/supabase/client';
import { GEO_COUNTRIES, CONTINENT_VIEWS, WORLD_W, WORLD_H, type Continent, type GeoCountry } from '@/data/worldMapGeo';
import { FORMATIONS, LEGENDS, WC2026_NATIONS, normalizePosition, playerRating, type FormationSlot } from '@/lib/squadDeal';
import { getEnrichment } from '@/data/footleEnrichment';
import type { Player } from '@/types/game';

/**
 * DART DRAFT: WORLD MAP engine, v2.
 *
 * The box2box "Hit the Country, Pick a Player" format, rebuilt on real
 * geography: Natural Earth country boundaries projected once at build time
 * (src/data/worldMapGeo.ts). You call a position, throw a timed dart, and
 * wherever it sticks, that nation hands you its best available players at
 * that position, pulled live from the market-value table. Bonus zones float
 * over open ocean. Continent rounds zoom the camera in for precision throws.
 */

/* ---------------- Views (camera boxes) ---------------- */
export type MapView = 'world' | Continent;

export interface ViewBox { x: number; y: number; w: number; h: number }

export const VIEW_LABEL: Record<MapView, string> = {
  world: 'World Map',
  europe: 'Europe',
  samerica: 'South America',
  namerica: 'North & Central America',
  africa: 'Africa',
  asia: 'Asia & Oceania',
};

export function viewBoxOf(view: MapView): ViewBox {
  if (view === 'world') return { x: 0, y: 0, w: WORLD_W, h: WORLD_H };
  return CONTINENT_VIEWS[view];
}

/** Camera per throw. Roughly half the rounds are precision continent rounds. */
export const ROUND_VIEWS: MapView[] = [
  'world', 'europe', 'samerica', 'world', 'africa',
  'namerica', 'world', 'europe', 'asia', 'samerica', 'world',
];

/* ---------------- Slots ---------------- */
/** 4-3-3, same slot semantics as Squad Deal (allowed positions per slot). */
export const DART_SLOTS: FormationSlot[] = FORMATIONS[0].slots;

/* ---------------- Country lookup ---------------- */
interface Bounds { minx: number; miny: number; maxx: number; maxy: number; area: number }

const boundsCache = new Map<string, Bounds>();

function boundsOf(c: GeoCountry): Bounds {
  let b = boundsCache.get(c.iso);
  if (b) return b;
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  for (const ring of c.rings) {
    for (const [x, y] of ring) {
      if (x < minx) minx = x;
      if (x > maxx) maxx = x;
      if (y < miny) miny = y;
      if (y > maxy) maxy = y;
    }
  }
  b = { minx, miny, maxx, maxy, area: (maxx - minx) * (maxy - miny) };
  boundsCache.set(c.iso, b);
  return b;
}

function inRing(x: number, y: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function countryAt(x: number, y: number): GeoCountry | null {
  // Small countries first so enclaves (Lesotho inside South Africa) win.
  let best: GeoCountry | null = null;
  let bestArea = Infinity;
  for (const c of GEO_COUNTRIES) {
    const b = boundsOf(c);
    if (x < b.minx || x > b.maxx || y < b.miny || y > b.maxy) continue;
    if (b.area >= bestArea) continue;
    for (const ring of c.rings) {
      if (inRing(x, y, ring)) { best = c; bestArea = b.area; break; }
    }
  }
  return best;
}

const pathCache = new Map<string, string>();

export function pathOf(c: GeoCountry): string {
  let p = pathCache.get(c.iso);
  if (p) return p;
  p = c.rings
    .map(ring => 'M' + ring.map(pt => `${pt[0]},${pt[1]}`).join('L') + 'Z')
    .join('');
  pathCache.set(c.iso, p);
  return p;
}

/* ---------------- DB nationality names per country ---------------- */
/** Spellings used by player_market_values.nationality where they differ from map names. */
const ISO_DB_NAMES: Record<string, string[]> = {
  gb: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
  cz: ['Czech Republic', 'Czechia'],
  tr: ['Türkiye', 'Turkey'],
  ci: ["Cote d'Ivoire", 'Ivory Coast'],
  ba: ['Bosnia-Herzegovina', 'Bosnia & Herzegovina'],
  kr: ['Korea, South', 'South Korea'],
  kp: ['Korea, North'],
  us: ['United States'],
  gm: ['The Gambia', 'Gambia'],
  cd: ['DR Congo'],
  cg: ['Congo'],
  mk: ['North Macedonia'],
  ae: ['United Arab Emirates'],
  ie: ['Ireland'],
  nl: ['Netherlands'],
  ch: ['Switzerland'],
  za: ['South Africa'],
  sa: ['Saudi Arabia'],
  nz: ['New Zealand'],
  cv: ['Cape Verde'],
  cw: ['Curacao'],
  gw: ['Guinea-Bissau'],
  bf: ['Burkina Faso'],
  sl: ['Sierra Leone'],
  sv: ['El Salvador'],
  do: ['Dominican Republic'],
  tt: ['Trinidad and Tobago'],
  gq: ['Equatorial Guinea'],
};

export function dbNamesFor(c: GeoCountry): string[] {
  return ISO_DB_NAMES[c.iso] ?? [c.name];
}

export function isWcNation(c: GeoCountry): boolean {
  return dbNamesFor(c).some(n => WC2026_NATIONS.has(n));
}

/* ---------------- Topics ---------------- */
export type MapTopic = 'current' | 'wc2026';

export const MAP_TOPICS: { id: MapTopic; label: string; emoji: string; desc: string }[] = [
  { id: 'current', label: 'Current Stars', emoji: '🌍', desc: 'Every nation is live. Hit anywhere with pros and draft them.' },
  { id: 'wc2026', label: 'World Cup 2026', emoji: '🏆', desc: 'Only the 48 qualified nations count. Everywhere else is a wasted dart.' },
];

/* ---------------- Bonus zones ---------------- */
export type ZoneKind = 'legend' | 'wonderkid' | 'wildcard';

export interface Zone {
  kind: ZoneKind;
  x: number;
  y: number;
  r: number;
  label: string;
  emoji: string;
}

const ZONE_META: Record<ZoneKind, { label: string; emoji: string }> = {
  legend: { label: 'LEGEND', emoji: '👑' },
  wonderkid: { label: 'WONDERKID', emoji: '💎' },
  wildcard: { label: 'WILDCARD', emoji: '🃏' },
};

/** Which bonus zones float on each throw (index 0-10). */
const ZONE_SCHEDULE: ZoneKind[][] = [
  [], ['legend'], ['wildcard'], ['wonderkid'], [],
  ['legend'], ['wildcard'], [], ['wonderkid', 'legend'], [], ['wildcard'],
];

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Place this throw's bonus zones over open water inside the camera box. */
export function rollZones(view: MapView, throwIndex: number, seed: number): Zone[] {
  const kinds = ZONE_SCHEDULE[throwIndex % ZONE_SCHEDULE.length];
  if (kinds.length === 0) return [];
  const box = viewBoxOf(view);
  const rnd = mulberry(seed * 7919 + throwIndex * 131);
  const r = Math.max(11, Math.min(26, box.w * 0.04));
  const zones: Zone[] = [];
  for (const kind of kinds) {
    let placed = false;
    for (let tries = 0; tries < 40 && !placed; tries++) {
      const x = box.x + box.w * (0.08 + 0.84 * rnd());
      const y = box.y + box.h * (0.08 + 0.84 * rnd());
      if (countryAt(x, y) !== null) continue;
      if (zones.some(z => Math.hypot(z.x - x, z.y - y) < r * 2.6)) continue;
      zones.push({ kind, x, y, r, ...ZONE_META[kind] });
      placed = true;
    }
  }
  return zones;
}

/* ---------------- Throw resolution ---------------- */
export type MapHit =
  | { kind: 'zone'; zone: Zone }
  | { kind: 'country'; country: GeoCountry }
  | { kind: 'ocean' };

export function resolveMapThrow(x: number, y: number, zones: Zone[]): MapHit {
  for (const z of zones) {
    if (Math.hypot(z.x - x, z.y - y) <= z.r) return { kind: 'zone', zone: z };
  }
  const country = countryAt(x, y);
  if (country) return { kind: 'country', country };
  return { kind: 'ocean' };
}

/** Smaller targets pay more. Range roughly 12 (Russia) to 55 (tiny nations). */
export function accuracyPoints(hit: MapHit): number {
  if (hit.kind === 'zone') return 40;
  if (hit.kind === 'ocean') return 0;
  const b = boundsOf(hit.country);
  return Math.max(12, Math.min(55, Math.round(9000 / Math.sqrt(b.area + 60))));
}

/* ---------------- Draft choices ---------------- */
export interface DraftChoice {
  player: Player;
  outOfPosition: boolean;
}

interface MarketRow {
  player_name: string;
  position: string | null;
  age: number | null;
  nationality: string;
  club: string | null;
  market_value_usd: number | null;
  goals: number | null;
  assists: number | null;
}

function rowToPlayer(row: MarketRow): Player | null {
  const pos = normalizePosition(row.position ?? '');
  if (!pos || !row.player_name) return null;
  return {
    name: row.player_name,
    club: row.club ?? 'Unknown',
    nationality: row.nationality,
    league: getEnrichment(row.player_name, row.club ?? '').league,
    goals: row.goals ?? 0,
    assists: row.assists ?? 0,
    position: pos,
    kitNumber: 0,
    age: row.age ?? 0,
    marketValue: Math.max(1, Math.round((row.market_value_usd ?? 1_000_000) / 1_000_000)),
    difficulty: 'easy',
  };
}

const countryPoolCache = new Map<string, Player[]>();

/** Every 2026-valued pro of a nation, best first. Cached per country per session. */
export async function fetchCountryPool(country: GeoCountry): Promise<Player[]> {
  const cached = countryPoolCache.get(country.iso);
  if (cached) return cached;
  try {
    const names = dbNamesFor(country);
    const { data, error } = await supabase
      .from('player_market_values')
      .select('player_name, position, age, nationality, club, market_value_usd, goals, assists')
      .eq('year', 2026)
      .in('nationality', names)
      .order('market_value_usd', { ascending: false })
      .limit(90);
    if (error || !data) return [];
    const seen = new Set<string>();
    const pool: Player[] = [];
    for (const row of data as MarketRow[]) {
      const p = rowToPlayer(row);
      if (!p || seen.has(p.name)) continue;
      seen.add(p.name);
      pool.push(p);
    }
    countryPoolCache.set(country.iso, pool);
    return pool;
  } catch {
    return [];
  }
}

const fitsSlot = (p: Player, slot: FormationSlot) => slot.allowed.includes(p.position);

/**
 * What the hit country offers for the called position. Top 8 at the position;
 * if the nation has pros but none at the position, its 5 best players step in
 * out of position (rated with a penalty by the UI). Empty pool = no pros at
 * all, the page handles the lifeboat.
 */
export async function countryChoices(
  country: GeoCountry,
  slot: FormationSlot,
  usedNames: Set<string>,
): Promise<DraftChoice[]> {
  const pool = await fetchCountryPool(country);
  const fresh = pool.filter(p => !usedNames.has(p.name));
  const atPos = fresh.filter(p => fitsSlot(p, slot)).slice(0, 8);
  if (atPos.length > 0) return atPos.map(player => ({ player, outOfPosition: false }));
  return fresh.slice(0, 5).map(player => ({ player, outOfPosition: true }));
}

export function legendChoices(slot: FormationSlot, usedNames: Set<string>): DraftChoice[] {
  return LEGENDS
    .filter(p => !usedNames.has(p.name) && fitsSlot(p, slot))
    .sort((a, b) => playerRating(b) - playerRating(a))
    .slice(0, 8)
    .map(player => ({ player, outOfPosition: false }));
}

export function wonderkidChoices(prefetch: Player[], slot: FormationSlot, usedNames: Set<string>): DraftChoice[] {
  return prefetch
    .filter(p => !usedNames.has(p.name) && fitsSlot(p, slot) && p.age > 0 && p.age <= 21)
    .slice(0, 8)
    .map(player => ({ player, outOfPosition: false }));
}

export function wildcardChoices(prefetch: Player[], slot: FormationSlot, usedNames: Set<string>): DraftChoice[] {
  return prefetch
    .filter(p => !usedNames.has(p.name) && fitsSlot(p, slot))
    .slice(0, 10)
    .map(player => ({ player, outOfPosition: false }));
}

/** Cheapest fitting pro in the prefetch pool: the LOST AT SEA consolation. */
export function journeyman(prefetch: Player[], slot: FormationSlot, usedNames: Set<string>): Player | null {
  const fits = prefetch.filter(p => !usedNames.has(p.name) && fitsSlot(p, slot));
  return fits.length ? fits[fits.length - 1] : null;
}

/** The Machine drafts its XI from the same prefetch pool, tier-random. */
export function machineMapDraft(prefetch: Player[]): (Player | null)[] {
  const used = new Set<string>();
  return DART_SLOTS.map(slot => {
    const fits = prefetch.filter(p => !used.has(p.name) && fitsSlot(p, slot));
    if (fits.length === 0) return null;
    const cut = Math.max(1, Math.min(40, Math.floor(fits.length * 0.5)));
    const pick = fits[Math.floor(Math.random() * cut)];
    used.add(pick.name);
    return pick;
  });
}

/* ---------------- Country display colors ---------------- */
const CONT_HUE: Record<Continent, number> = {
  europe: 213, samerica: 152, namerica: 268, africa: 32, asia: 348,
};

function isoHash(iso: string): number {
  let h = 0;
  for (let i = 0; i < iso.length; i++) h = (h * 31 + iso.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function countryFill(c: GeoCountry, opts: { locked?: boolean; drafted?: boolean } = {}): string {
  if (opts.locked) return 'hsl(222 12% 15%)';
  const hue = CONT_HUE[c.continent];
  const light = 26 + (isoHash(c.iso) % 10);
  if (opts.drafted) return `hsl(${hue} 18% ${Math.max(16, light - 10)}%)`;
  return `hsl(${hue} 42% ${light}%)`;
}
