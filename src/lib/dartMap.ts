import { supabase } from '@/integrations/supabase/client';
import { GEO_COUNTRIES, CONTINENT_VIEWS, WORLD_W, WORLD_H, type Continent, type GeoCountry } from '@/data/worldMapGeo';
// Round 358: the seam-aware path geometry moved to its own module so Soccer
// Conquest can draw the same basemap without importing this engine.
import { boundsOf, unwrappedRings, pathOf } from '@/lib/worldMapPaths';
export { pathOf } from '@/lib/worldMapPaths';
import { FORMATIONS, LEGENDS, POSITION_NORMALIZE, WC2026_NATIONS, normalizePosition, playerRating, type FormationSlot } from '@/lib/squadDeal';
import { getEnrichment } from '@/data/footleEnrichment';
import type { League, Player } from '@/types/game';

/**
 * DART DRAFT: WORLD MAP engine, v2.
 *
 * The "hit the country, pick a player" format, rebuilt on real
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
    if (b.area >= bestArea) continue;
    if (y < b.miny || y > b.maxy) continue;
    const rings = unwrappedRings(c);
    let hit = false;
    // Test the raw point plus both wrapped copies, so a dart in the Bering
    // Strait side of the seam still lands in the right country.
    for (const cx of [x, x + WORLD_W, x - WORLD_W]) {
      if (cx < b.minx || cx > b.maxx) continue;
      for (const ring of rings) {
        if (inRing(cx, y, ring)) { hit = true; break; }
      }
      if (hit) break;
    }
    if (hit) { best = c; bestArea = b.area; }
  }
  return best;
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
export type MapTopic = 'current' | 'wc2026' | 'alltime';

export const MAP_TOPICS: { id: MapTopic; label: string; emoji: string; desc: string }[] = [
  { id: 'current', label: 'Current Stars', emoji: '🌍', desc: 'Every nation is live. Hit anywhere with pros and draft them.' },
  { id: 'wc2026', label: 'World Cup 2026', emoji: '🏆', desc: 'Only the 48 qualified nations count. Everywhere else is a wasted dart.' },
  { id: 'alltime', label: 'All-Time', emoji: '🏛️', desc: 'Legends join every squad. Hit Brazil and Pele himself might answer.' },
];

/* ---------------- Bonus and hazard zones ---------------- */
export type ZoneKind = 'legend' | 'wonderkid' | 'wildcard' | 'mystery' | 'shark' | 'storm';

export interface Zone {
  kind: ZoneKind;
  x: number;
  y: number;
  r: number;
  label: string;
  emoji: string;
  bad?: boolean;
}

const ZONE_META: Record<ZoneKind, { label: string; emoji: string; bad?: boolean }> = {
  legend: { label: 'LEGEND', emoji: '👑' },
  wonderkid: { label: 'WONDERKID', emoji: '💎' },
  wildcard: { label: 'WILDCARD', emoji: '🃏' },
  mystery: { label: 'MYSTERY', emoji: '🎁' },
  shark: { label: 'SHARK', emoji: '🦈', bad: true },
  storm: { label: 'STORM', emoji: '🌪️', bad: true },
};

/** Which zones float on each throw (index 0-10). Gold pays out, red punishes. */
const ZONE_SCHEDULE: ZoneKind[][] = [
  [], ['legend'], ['shark'], ['wonderkid'], ['storm'],
  ['legend', 'shark'], ['wildcard'], ['mystery'], ['wonderkid', 'storm'],
  ['legend', 'mystery'], ['wildcard', 'shark'],
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
  if (hit.kind === 'zone') return hit.zone.bad ? 0 : 40;
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
      .limit(120);
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

/** Raw DB position strings that normalize into this slot's allowed positions. */
function rawPositionsFor(slot: FormationSlot): string[] {
  return Object.keys(POSITION_NORMALIZE).filter(k => slot.allowed.includes(POSITION_NORMALIZE[k]));
}

/* ---------------- Generated fillers (honest fakes, clearly labeled) ---------------- */
const FILLER_LEAGUE = 'MLS' as League; // never shown; excluded from chemistry by fixedOverall

const filler = (name: string, nationality: string, slot: FormationSlot, overall: number): Player => ({
  name,
  club: 'Youth Academy',
  nationality,
  league: FILLER_LEAGUE,
  goals: 0,
  assists: 0,
  position: slot.allowed[0],
  kitNumber: 0,
  age: 18,
  marketValue: 1,
  difficulty: 'easy',
  fixedOverall: overall,
});

const SLOT_ROLE: Partial<Record<string, string>> = {
  GK: 'Keeper', CB: 'Defender', RB: 'Right Back', LB: 'Left Back',
  CM: 'Midfielder', CDM: 'Midfielder', CAM: 'Playmaker',
  RW: 'Winger', LW: 'Winger', RM: 'Winger', LM: 'Winger', RWB: 'Wing Back', LWB: 'Wing Back',
  ST: 'Striker', CF: 'Striker',
};

/** Ocean and shark consolation: a flat 40 overall trialist, no exceptions. */
export function oceanTrialist(slot: FormationSlot, source: 'ocean' | 'shark' | 'blocked' = 'ocean'): Player {
  const role = SLOT_ROLE[slot.allowed[0]] ?? 'Player';
  const name =
    source === 'shark' ? `Shark Bait ${role}` :
    source === 'blocked' ? `Wasted Dart ${role}` :
    `Open Trials ${role}`;
  return filler(name, source === 'shark' ? '🦈' : '🌊', slot, 40);
}

/**
 * A nation with pros but nobody at your position still fields a full squad:
 * you get its academy prospect at the slot, rated 40 to 52 by how deep the
 * country's pro pool runs. Never a fake real-person, always labeled Academy.
 */
export function academyProspect(country: GeoCountry, slot: FormationSlot, poolSize: number): Player {
  const role = SLOT_ROLE[slot.allowed[0]] ?? 'Player';
  const overall = 40 + Math.min(12, Math.floor(poolSize / 8));
  return filler(`${country.name} Academy ${role}`, dbNamesFor(country)[0], slot, overall);
}

const positionQueryCache = new Map<string, Player[]>();

/** Targeted per-position fetch so deep countries never hide their keepers. */
async function fetchCountryAtPosition(country: GeoCountry, slot: FormationSlot): Promise<Player[]> {
  const key = `${country.iso}:${slot.allowed.join('/')}`;
  const cached = positionQueryCache.get(key);
  if (cached) return cached;
  try {
    const { data, error } = await supabase
      .from('player_market_values')
      .select('player_name, position, age, nationality, club, market_value_usd, goals, assists')
      .eq('year', 2026)
      .in('nationality', dbNamesFor(country))
      .in('position', rawPositionsFor(slot))
      .order('market_value_usd', { ascending: false })
      .limit(12);
    if (error || !data) return [];
    const seen = new Set<string>();
    const pool: Player[] = [];
    for (const row of data as MarketRow[]) {
      const p = rowToPlayer(row);
      if (!p || seen.has(p.name)) continue;
      seen.add(p.name);
      pool.push(p);
    }
    positionQueryCache.set(key, pool);
    return pool;
  } catch {
    return [];
  }
}

/** All-time topic: the country's legends who play the slot, best first. */
function countryLegends(country: GeoCountry, slot: FormationSlot, usedNames: Set<string>): Player[] {
  const names = new Set(dbNamesFor(country));
  if (country.iso === 'ru') names.add('Soviet Union');
  if (country.iso === 'cz') names.add('Czechoslovakia');
  return LEGENDS
    .filter(p => names.has(p.nationality) && fitsSlot(p, slot) && !usedNames.has(p.name))
    .sort((a, b) => playerRating(b) - playerRating(a));
}

/**
 * What the hit country offers for the called position. Real players at the
 * position always surface (general pool first, then a targeted position
 * query). A nation with pros but nobody at the slot hands you its academy
 * prospect plus its best players out of position. A nation with no pros at
 * all still gives you the academy kid. Choices are never empty.
 */
export async function countryChoices(
  country: GeoCountry,
  slot: FormationSlot,
  usedNames: Set<string>,
  opts: { alltime?: boolean } = {},
): Promise<DraftChoice[]> {
  const pool = await fetchCountryPool(country);
  const fresh = pool.filter(p => !usedNames.has(p.name));
  const legends = opts.alltime ? countryLegends(country, slot, usedNames) : [];
  let atPos = fresh.filter(p => fitsSlot(p, slot));
  if (atPos.length === 0) {
    const targeted = await fetchCountryAtPosition(country, slot);
    atPos = targeted.filter(p => !usedNames.has(p.name));
  }
  if (legends.length > 0 || atPos.length > 0) {
    const merged = [...legends, ...atPos]
      .sort((a, b) => playerRating(b) - playerRating(a))
      .slice(0, 8);
    return merged.map(player => ({ player, outOfPosition: false }));
  }
  const prospect: DraftChoice = { player: academyProspect(country, slot, pool.length), outOfPosition: false };
  const backups = fresh.slice(0, 4).map(player => ({ player, outOfPosition: true }));
  return [prospect, ...backups];
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

/** Storm zone: blown into the bargain bin. Five picks from the cheap end of the pool. */
export function stormChoices(prefetch: Player[], slot: FormationSlot, usedNames: Set<string>): DraftChoice[] {
  const fits = prefetch.filter(p => !usedNames.has(p.name) && fitsSlot(p, slot));
  if (fits.length === 0) return [];
  const bin = fits.slice(-Math.min(20, fits.length));
  const step = Math.max(1, Math.floor(bin.length / 5));
  const picks: Player[] = [];
  for (let i = bin.length - 1; i >= 0 && picks.length < 5; i -= step) picks.push(bin[i]);
  return picks.map(player => ({ player, outOfPosition: false }));
}

/** Mystery zone: three random fitting players from anywhere in the pool. Could be anyone. */
export function mysteryChoices(prefetch: Player[], slot: FormationSlot, usedNames: Set<string>): DraftChoice[] {
  const fits = prefetch.filter(p => !usedNames.has(p.name) && fitsSlot(p, slot));
  if (fits.length === 0) return [];
  const picks = new Set<number>();
  while (picks.size < Math.min(3, fits.length)) picks.add(Math.floor(Math.random() * fits.length));
  return [...picks].map(i => ({ player: fits[i], outOfPosition: false }));
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
  const light = 28 + (isoHash(c.iso) % 7);
  if (opts.drafted) return `hsl(${hue} 16% ${Math.max(16, light - 11)}%)`;
  return `hsl(${hue} 38% ${light}%)`;
}
