/**
 * Perfect Season: themed daily challenge rotation + result signing (R6 Wave 13).
 *
 * Additive only. A page that never imports this file behaves exactly as
 * before. Themes constrain the daily wheel-index pool (filter runs against
 * the same index entries fetchTeamSeasonIndex/fetchTeamEraIndex already
 * return, so no new queries or sim changes are needed) and are purely a
 * daily-mode flavor layer: Classic and Hard modes never see them.
 *
 * Each theme's `filter` takes the loosely-typed index entry each sport's
 * page already has in hand (TeamSeasonIndexEntry for MLB, TeamEraIndexEntry
 * for NHL, NbaTeamSeasonEntry for NBA, TeamSeasonEntry for NFL) and returns
 * whether that wheel stop is in-theme. Filters read only fields verified to
 * exist on the live adapters (see perfectSeasonMlb.ts / Nhl.ts / Nba.ts /
 * Nfl.ts): year/yearid, era start/end, season string, team abbr/name.
 */

import { dateSeed } from '@/lib/dateUtils';

export type PerfectSeasonThemeSport = 'mlb' | 'nhl' | 'nba' | 'nfl';

/** Minimal shape every sport's wheel-index entry satisfies, used for
 *  filtering only. Sport-specific fields are optional so one interface
 *  covers all four adapters without importing their page-only types.
 *  Field names are copied exactly from each adapter's index entry
 *  (perfectSeasonMlb/Nhl/Nba/Nfl.ts) rather than normalized, so a filter
 *  reads the same field name the real data uses. */
export interface ThemeableEntry {
  yearid?: number;       // MLB TeamSeasonIndexEntry.yearid
  year?: number;         // NFL TeamSeasonEntry.year
  eraStart?: number;     // NHL TeamEraIndexEntry.eraStart (decade start)
  eraEnd?: number;       // NHL TeamEraIndexEntry.eraEnd (decade end)
  season?: string;       // NBA NbaTeamSeasonEntry.season ("1987-88")
  abbr?: string;         // NHL TeamEraIndexEntry.abbr / NFL TeamSeasonEntry.abbr
  teamid?: string;       // MLB TeamSeasonIndexEntry.teamid
  team?: string;         // NBA NbaTeamSeasonEntry.team
  name?: string;         // MLB TeamSeasonIndexEntry.name / NFL TeamSeasonEntry.name
  teamName?: string;     // NHL TeamEraIndexEntry.teamName / NBA NbaTeamSeasonEntry.teamName
}

export interface PerfectSeasonTheme {
  id: string;
  label: string;
  description: string;
  filter: (entry: ThemeableEntry) => boolean;
}

/** NBA season string "1987-88" -> starting year 1987. */
function nbaStartYear(season?: string): number | null {
  if (!season) return null;
  const y = Number(season.slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

// ---------------------------------------------------------------------------
// MLB themes. Fields verified against fetchTeamSeasonIndex in
// perfectSeasonMlb.ts: TeamSeasonIndexEntry { yearid, teamid, name, w, l }.
// Wheel index is every team season 1901+ with 100+ games played.
// ---------------------------------------------------------------------------
const MLB_THEMES: PerfectSeasonTheme[] = [
  {
    id: 'expansion-era',
    label: 'Expansion Era',
    description: 'Only team-seasons from 1961-1976, when the American and National Leagues doubled in size.',
    filter: (e) => !!e.yearid && e.yearid >= 1961 && e.yearid <= 1976,
  },
  {
    id: 'steroid-era',
    label: 'Steroid Era Sluggers',
    description: 'Only team-seasons from 1994-2004, baseball\'s high-offense era.',
    filter: (e) => !!e.yearid && e.yearid >= 1994 && e.yearid <= 2004,
  },
  {
    id: 'deadball-era',
    label: 'Dead-Ball Era',
    description: 'Only team-seasons from 1901-1919, before the home run took over the game.',
    filter: (e) => !!e.yearid && e.yearid >= 1901 && e.yearid <= 1919,
  },
  {
    id: 'wildcard-era',
    label: 'Wild Card Era',
    description: 'Only team-seasons from 1995 onward, since the wild card format began.',
    filter: (e) => !!e.yearid && e.yearid >= 1995,
  },
  {
    id: 'nineties',
    label: '90s Baseball',
    description: 'Only team-seasons from the 1990s.',
    filter: (e) => !!e.yearid && e.yearid >= 1990 && e.yearid <= 1999,
  },
  {
    id: 'two-thousands',
    label: '2000s Baseball',
    description: 'Only team-seasons from the 2000s.',
    filter: (e) => !!e.yearid && e.yearid >= 2000 && e.yearid <= 2009,
  },
  {
    id: 'modern-era',
    label: 'Modern Era',
    description: 'Only team-seasons from 2015 to today.',
    filter: (e) => !!e.yearid && e.yearid >= 2015,
  },
  {
    id: 'sixties-seventies',
    label: 'Sixties and Seventies',
    description: 'Only team-seasons from 1960-1979.',
    filter: (e) => !!e.yearid && e.yearid >= 1960 && e.yearid <= 1979,
  },
];

// ---------------------------------------------------------------------------
// NHL themes. Fields verified against fetchTeamEraIndex in
// perfectSeasonNhl.ts: TeamEraIndexEntry { abbr, teamName, eraStart, eraEnd,
// eraLabel }. Wheel index is franchise-decade pairs from the 1960s onward
// (DECADES = [1960..2020] in perfectSeasonNhl.ts), so no theme below reaches
// further back than that.
// ---------------------------------------------------------------------------
const NHL_THEMES: PerfectSeasonTheme[] = [
  {
    id: 'original-six-era',
    label: 'Original Six Era',
    description: 'Only the six franchises that played every season from 1942-1967: Bruins, Blackhawks, Red Wings, Canadiens, Rangers, and Maple Leafs.',
    filter: (e) =>
      !!e.abbr && ['BOS', 'CHI', 'DET', 'MTL', 'NYR', 'TOR'].includes(e.abbr),
  },
  {
    id: 'eighties-firewagon',
    label: 'Firewagon Hockey',
    description: 'Only the 1980s, hockey\'s highest-scoring decade.',
    filter: (e) => e.eraStart === 1980,
  },
  {
    id: 'dead-puck-era',
    label: 'Dead Puck Era',
    description: 'Only the 2000s, the NHL\'s lowest-scoring modern decade.',
    filter: (e) => e.eraStart === 2000,
  },
  {
    id: 'nineties-expansion',
    label: '90s Expansion Wave',
    description: 'Only the 1990s, when the league grew from 21 to 28 teams.',
    filter: (e) => e.eraStart === 1990,
  },
  {
    id: 'salary-cap-era',
    label: 'Salary Cap Era',
    description: 'Only the 2010s and 2020s, since the post-lockout cap era began.',
    filter: (e) => e.eraStart === 2010 || e.eraStart === 2020,
  },
  {
    id: 'seventies-expansion',
    label: '70s Expansion Era',
    description: 'Only the 1970s, when the WHA war forced rapid NHL expansion.',
    filter: (e) => e.eraStart === 1970,
  },
  {
    id: 'canadian-six',
    label: 'Canadian Franchises',
    description: 'Only Canadian franchises: Maple Leafs, Canadiens, Canucks, Flames, Oilers, Senators, Jets.',
    filter: (e) =>
      !!e.abbr && ['TOR', 'MTL', 'VAN', 'CGY', 'EDM', 'OTT', 'WPG', 'WIN', 'QUE'].includes(e.abbr),
  },
];

// ---------------------------------------------------------------------------
// NBA themes. Fields verified against fetchTeamSeasonIndex in
// perfectSeasonNba.ts: NbaTeamSeasonEntry { season, team, teamName }. Index
// spans 1951-52 (minutes tracking start) through 2024-25.
// ---------------------------------------------------------------------------
const NBA_THEMES: PerfectSeasonTheme[] = [
  {
    id: 'eighties-dynasties',
    label: '80s Dynasties',
    description: 'Only team-seasons from the 1980s, the Celtics-Lakers rivalry decade.',
    filter: (e) => { const y = nbaStartYear(e.season); return y !== null && y >= 1980 && y <= 1989; },
  },
  {
    id: 'nineties-bulls-era',
    label: '90s Basketball',
    description: 'Only team-seasons from the 1990s.',
    filter: (e) => { const y = nbaStartYear(e.season); return y !== null && y >= 1990 && y <= 1999; },
  },
  {
    id: 'showtime-lakers-era',
    label: 'Showtime Era',
    description: 'Only team-seasons from 1979-1991, the fast-break Showtime years.',
    filter: (e) => { const y = nbaStartYear(e.season); return y !== null && y >= 1979 && y <= 1991; },
  },
  {
    id: 'three-point-boom',
    label: 'Three-Point Boom',
    description: 'Only team-seasons from 2015 onward, since the analytics-driven three-point surge.',
    filter: (e) => { const y = nbaStartYear(e.season); return y !== null && y >= 2015; },
  },
  {
    id: 'two-thousands-nba',
    label: '2000s Basketball',
    description: 'Only team-seasons from the 2000s.',
    filter: (e) => { const y = nbaStartYear(e.season); return y !== null && y >= 2000 && y <= 2009; },
  },
  {
    id: 'seventies-nba',
    label: '70s Basketball',
    description: 'Only team-seasons from the 1970s.',
    filter: (e) => { const y = nbaStartYear(e.season); return y !== null && y >= 1970 && y <= 1979; },
  },
  {
    id: 'golden-era-classic',
    label: 'Golden Era Classics',
    description: 'Only team-seasons from the 1950s and 1960s.',
    filter: (e) => { const y = nbaStartYear(e.season); return y !== null && y >= 1951 && y <= 1969; },
  },
];

// ---------------------------------------------------------------------------
// NFL themes. Fields verified against fetchTeamSeasonIndex in
// perfectSeasonNfl.ts: TeamSeasonEntry { year, abbr, name }. Index spans
// 1999-2024 (nflfastr data era, see NFL_ERA_MULT buckets in that file).
// ---------------------------------------------------------------------------
const NFL_THEMES: PerfectSeasonTheme[] = [
  {
    id: 'iron-curtain-defenses',
    label: 'Iron Curtain Defenses',
    description: 'Only team-seasons from 1999-2003, before the 2004 illegal-contact crackdown opened up coverage.',
    filter: (e) => !!e.year && e.year >= 1999 && e.year <= 2003,
  },
  {
    id: 'spread-offense-era',
    label: 'Spread Offense Era',
    description: 'Only team-seasons from 2018 onward, the RPO and spread-formation years.',
    filter: (e) => !!e.year && e.year >= 2018,
  },
  {
    id: 'two-thousands-nfl',
    label: '2000s Football',
    description: 'Only team-seasons from the 2000s.',
    filter: (e) => !!e.year && e.year >= 2000 && e.year <= 2009,
  },
  {
    id: 'twenty-tens',
    label: '2010s Football',
    description: 'Only team-seasons from the 2010s.',
    filter: (e) => !!e.year && e.year >= 2010 && e.year <= 2019,
  },
  {
    id: 'modern-nfl',
    label: 'Modern NFL',
    description: 'Only team-seasons from 2015 to today.',
    filter: (e) => !!e.year && e.year >= 2015,
  },
  {
    id: 'post-crackdown-era',
    label: 'Post-Crackdown Passing',
    description: 'Only team-seasons from 2004-2017, after coverage rules opened the passing game.',
    filter: (e) => !!e.year && e.year >= 2004 && e.year <= 2017,
  },
];

const THEMES_BY_SPORT: Record<PerfectSeasonThemeSport, PerfectSeasonTheme[]> = {
  mlb: MLB_THEMES,
  nhl: NHL_THEMES,
  nba: NBA_THEMES,
  nfl: NFL_THEMES,
};

/** All catalogued themes for a sport, before any per-day pool-size check. */
export function themesForSport(sport: PerfectSeasonThemeSport): PerfectSeasonTheme[] {
  return THEMES_BY_SPORT[sport];
}

/**
 * Deterministic theme pick for a given sport + ET date string. Same date +
 * sport => same theme for every player, matching the existing dailySportSeed
 * convention (dateSeed() drives the index, no extra RNG needed since we only
 * need a stable index, not a stream).
 *
 * Callers must pass the sport's current wheel index (whatever
 * fetchTeamSeasonIndex/fetchTeamEraIndex already returned) so this can drop
 * any theme that would leave fewer than MIN_THEME_POOL valid choices before
 * picking, per the spec's "exclude if fewer than 4 valid choices" rule.
 * Falls back to null (no theme, full pool) if every catalogued theme fails
 * that check for the current data, so daily mode always remains playable.
 */
const MIN_THEME_POOL = 4;

export function getDailyTheme(
  sport: PerfectSeasonThemeSport,
  dateStr: string,
  index: ThemeableEntry[],
): PerfectSeasonTheme | null {
  const all = THEMES_BY_SPORT[sport];
  if (!all || all.length === 0 || !index || index.length === 0) return null;

  const eligible = all.filter(t => index.filter(t.filter).length >= MIN_THEME_POOL);
  if (eligible.length === 0) return null;

  // Distinct seed from perfectSeason.ts's dailySportSeed: themes rotate on
  // their own cycle so a sport's daily theme doesn't shift in lockstep with
  // its wheel-spin seed.
  const seed = dateSeed(dateStr) + sport.length * 7919;
  const idx = Math.abs(seed) % eligible.length;
  return eligible[idx];
}

/** Filters a sport's wheel index down to one theme's valid pool. */
export function applyTheme<T extends ThemeableEntry>(index: T[], theme: PerfectSeasonTheme | null): T[] {
  if (!theme) return index;
  return index.filter(theme.filter);
}

// ---------------------------------------------------------------------------
// Result signing (R6 Wave 13, item 2). Pure function, no crypto import: a
// simple base36 hash over (dateStr, sport, outcome) so a shared daily result
// carries a short tag that is at least tamper-evident for casual screenshot
// sharing (not a security control, just a "did you actually get this"
// credibility marker per the retention-pass spec).
// ---------------------------------------------------------------------------

/**
 * Deterministic short checksum from date + sport + outcome. Same inputs
 * always produce the same 4-character base36 tag; changing any input
 * (including the win-loss record) changes the tag.
 */
export function resultChecksum(dateStr: string, sport: PerfectSeasonThemeSport, outcome: string): string {
  const input = `${dateStr}|${sport}|${outcome}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // keep as signed 32-bit integer
  }
  // Unsigned before base36 so the tag never carries a leading minus sign.
  const positive = hash >>> 0;
  return positive.toString(36).slice(0, 4).padStart(4, '0');
}

const SPORT_TAGS: Record<PerfectSeasonThemeSport, string> = {
  mlb: 'MLB',
  nhl: 'NHL',
  nba: 'NBA',
  nfl: 'NFL',
};

/**
 * Compact verification line appended to a completed daily run's share text.
 * Format: "Verified: PS-NHL 2026-07-04 firewagon 82-0 #k3x9". `themeId`
 * is omitted from the line (falls back to "classic") when no theme applied,
 * so non-themed daily runs (or sports where every theme got excluded for
 * the day per MIN_THEME_POOL) still produce a valid tag.
 */
export function buildVerificationLine(
  sport: PerfectSeasonThemeSport,
  dateStr: string,
  themeId: string | null,
  wins: number,
  losses: number,
): string {
  const outcome = `${wins}-${losses}`;
  const checksum = resultChecksum(dateStr, sport, outcome);
  const themeTag = themeId ?? 'classic';
  return `Verified: PS-${SPORT_TAGS[sport]} ${dateStr} ${themeTag} ${outcome} #${checksum}`;
}
