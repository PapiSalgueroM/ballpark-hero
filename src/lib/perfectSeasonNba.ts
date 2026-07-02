import { supabase } from '@/integrations/supabase/client';
import { DraftablePlayer, SeasonSlot, SpinSquad } from '@/lib/perfectSeason';

/**
 * NBA adapter for the Perfect Season engine.
 *
 * Data notes (verified against bref_nba_player_seasons on 2026-07-01):
 * - One row per player-team-season, 1949-50 through 2024-25 (30,462 rows).
 * - Every stat column is a SEASON TOTAL, and `games` / `games_started` are
 *   null on all rows. Minutes stand in for availability: the wheel index
 *   wants 1000+ minute rotation players, squads accept 500+ (roughly a
 *   20 game bench stint).
 * - Minutes are null before 1951-52, which quietly excludes the two earliest
 *   seasons that never tracked them.
 * - Traded players get one row per team plus a combined '2TM'/'3TM'/'4TM'/
 *   '5TM' row; combined rows never belong to a squad.
 * - `position` is a single value (PG/SG/SF/PF/C) on nearly every row, but
 *   parsing also handles combos like 'PG-SG' and bare 'G'/'F' just in case.
 */

export const NBA_SLOTS: SeasonSlot[] = [
  { key: 'PG', label: 'Point Guard', weight: 1 },
  { key: 'SG', label: 'Shooting Guard', weight: 1 },
  { key: 'SF', label: 'Small Forward', weight: 1 },
  { key: 'PF', label: 'Power Forward', weight: 1 },
  { key: 'C', label: 'Center', weight: 1 },
  { key: 'SIXTH', label: 'Sixth Man', weight: 0.8 },
];

export const NBA_GAMES = 82;

const MIN_INDEX_MINUTES = 1000; // rotation regular over a season
const MIN_SQUAD_MINUTES = 500;  // roughly 20 games of real run
const MIN_INDEX_PLAYERS = 6;
const MIN_SQUAD_PLAYERS = 7;
const INDEX_PAGE = 1000;        // PostgREST caps rows per request
const INDEX_PAGES = 15;         // 15k budget covers the ~13.5k qualifying rows

const COMBINED_ROWS = new Set(['2TM', '3TM', '4TM', '5TM']);

/** Basketball Reference team codes seen in the live table, by era. */
const TEAM_NAMES: Record<string, string> = {
  AND: 'Anderson Packers',
  ATL: 'Atlanta Hawks',
  BAL: 'Baltimore Bullets',
  BLB: 'Baltimore Bullets',
  BOS: 'Boston Celtics',
  BRK: 'Brooklyn Nets',
  BUF: 'Buffalo Braves',
  CAP: 'Capital Bullets',
  CHA: 'Charlotte Bobcats',
  CHH: 'Charlotte Hornets',
  CHI: 'Chicago Bulls',
  CHO: 'Charlotte Hornets',
  CHP: 'Chicago Packers',
  CHS: 'Chicago Stags',
  CHZ: 'Chicago Zephyrs',
  CIN: 'Cincinnati Royals',
  CLE: 'Cleveland Cavaliers',
  DAL: 'Dallas Mavericks',
  DEN: 'Denver Nuggets',
  DET: 'Detroit Pistons',
  DNN: 'Denver Nuggets',
  FTW: 'Fort Wayne Pistons',
  GSW: 'Golden State Warriors',
  HOU: 'Houston Rockets',
  IND: 'Indiana Pacers',
  INO: 'Indianapolis Olympians',
  KCK: 'Kansas City Kings',
  KCO: 'Kansas City-Omaha Kings',
  LAC: 'Los Angeles Clippers',
  LAL: 'Los Angeles Lakers',
  MEM: 'Memphis Grizzlies',
  MIA: 'Miami Heat',
  MIL: 'Milwaukee Bucks',
  MIN: 'Minnesota Timberwolves',
  MLH: 'Milwaukee Hawks',
  MNL: 'Minneapolis Lakers',
  NJN: 'New Jersey Nets',
  NOH: 'New Orleans Hornets',
  NOJ: 'New Orleans Jazz',
  NOK: 'New Orleans/Oklahoma City Hornets',
  NOP: 'New Orleans Pelicans',
  NYK: 'New York Knicks',
  NYN: 'New York Nets',
  OKC: 'Oklahoma City Thunder',
  ORL: 'Orlando Magic',
  PHI: 'Philadelphia 76ers',
  PHO: 'Phoenix Suns',
  PHW: 'Philadelphia Warriors',
  POR: 'Portland Trail Blazers',
  ROC: 'Rochester Royals',
  SAC: 'Sacramento Kings',
  SAS: 'San Antonio Spurs',
  SDC: 'San Diego Clippers',
  SDR: 'San Diego Rockets',
  SEA: 'Seattle SuperSonics',
  SFW: 'San Francisco Warriors',
  SHE: 'Sheboygan Red Skins',
  STB: 'St. Louis Bombers',
  STL: 'St. Louis Hawks',
  SYR: 'Syracuse Nationals',
  TOR: 'Toronto Raptors',
  TRI: 'Tri-Cities Blackhawks',
  UTA: 'Utah Jazz',
  VAN: 'Vancouver Grizzlies',
  WAS: 'Washington Wizards',
  WAT: 'Waterloo Hawks',
  WSB: 'Washington Bullets',
  WSC: 'Washington Capitols',
};

export interface NbaTeamSeasonEntry {
  season: string;   // '1987-88'
  team: string;     // 'CHI'
  teamName: string; // 'Chicago Bulls'
}

function endYear(season: string): number {
  const start = Number(season.slice(0, 4));
  return Number.isFinite(start) ? start + 1 : 0;
}

/**
 * Wheel index, cached by the page: every team season with at least six
 * 1000+ minute players (about 1,600 entries, 1951-52 to today). The table
 * has no team-level rollup, so this pages through the rotation-player rows
 * in parallel and groups them client side. Pages are ordered by id
 * descending so a future data refresh overflows the oldest rows first.
 */
export async function fetchTeamSeasonIndex(): Promise<NbaTeamSeasonEntry[] | null> {
  try {
    const pages = await Promise.all(
      Array.from({ length: INDEX_PAGES }, (_, i) =>
        supabase
          .from('bref_nba_player_seasons' as any)
          .select('season, team')
          .gte('minutes', MIN_INDEX_MINUTES)
          .order('id', { ascending: false })
          .range(i * INDEX_PAGE, (i + 1) * INDEX_PAGE - 1)
      )
    );

    const counts = new Map<string, number>();
    for (const page of pages) {
      if (page.error || !page.data) continue;
      for (const r of page.data as any[]) {
        const season = typeof r.season === 'string' ? r.season : '';
        const team = typeof r.team === 'string' ? r.team : '';
        if (!season || !team || COMBINED_ROWS.has(team)) continue;
        const key = `${season}|${team}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    const entries: NbaTeamSeasonEntry[] = [];
    for (const [key, n] of counts) {
      if (n < MIN_INDEX_PLAYERS) continue;
      const [season, team] = key.split('|');
      entries.push({ season, team, teamName: TEAM_NAMES[team] ?? team });
    }
    return entries.length >= 300 ? entries : null;
  } catch {
    return null;
  }
}

/**
 * 40-99 from the season stat line. Production per 36 minutes
 * (points + 1.2 assists + 1.1 rebounds, season totals over season minutes)
 * gets a small discount for short benches, then runs through a logistic
 * curve. Verified against the live table: 1961-62 Wilt 99, 2023-24 Jokic 98,
 * 2015-16 Curry 97, 1987-88 Jordan 96, 2012-13 LeBron 95, while end of
 * bench guards like 1987-88 Rory Sparrow land at 56.
 */
function playerRating(pts: number, trb: number, ast: number, minutes: number): number {
  if (minutes < 300) return 40;
  const per36 = ((pts + 1.2 * ast + 1.1 * trb) / minutes) * 36;
  const volume = 0.75 + 0.25 * Math.min(1, minutes / 2200);
  const eff = per36 * volume;
  const rating = 40 + 59 / (1 + Math.exp((23.5 - eff) / 7));
  return Math.round(Math.min(99, Math.max(40, rating)));
}

/** Normalize a bref position string into slot keys. 'PG-SG' fills both
 *  guard spots; bare 'G' or 'F' splits into its two modern slots. */
function positionSlots(raw: unknown): string[] {
  const out: string[] = [];
  const add = (s: string) => {
    if (!out.includes(s)) out.push(s);
  };
  for (const token of String(raw ?? '').toUpperCase().split(/[-/,]/)) {
    const t = token.trim();
    if (t === 'PG' || t === 'SG' || t === 'SF' || t === 'PF' || t === 'C') add(t);
    else if (t === 'G') { add('PG'); add('SG'); }
    else if (t === 'F') { add('SF'); add('PF'); }
  }
  return out;
}

/** Full draftable squad for one team season wheel stop. */
export async function fetchSquad(entry: NbaTeamSeasonEntry): Promise<SpinSquad | null> {
  try {
    const { data, error } = await supabase
      .from('bref_nba_player_seasons' as any)
      .select('id, player_name, position, minutes, pts, trb, ast')
      .eq('season', entry.season)
      .eq('team', entry.team)
      .gte('minutes', MIN_SQUAD_MINUTES)
      .order('minutes', { ascending: false })
      .limit(20);
    if (error || !data) return null;

    const players: DraftablePlayer[] = [];
    const seen = new Set<string>();
    for (const raw of data as any[]) {
      const name = String(raw.player_name ?? '').trim();
      const minutes = Number(raw.minutes) || 0;
      if (!name || minutes < MIN_SQUAD_MINUTES || seen.has(name)) continue;
      seen.add(name);
      const pts = Number(raw.pts) || 0;
      const trb = Number(raw.trb) || 0;
      const ast = Number(raw.ast) || 0;
      players.push({
        playerId: raw.id != null ? String(raw.id) : `${entry.team}-${entry.season}-${name}`,
        name,
        rating: playerRating(pts, trb, ast, minutes),
        eligible: [...positionSlots(raw.position), 'SIXTH'],
        detail: `${Math.round(pts)} PTS · ${Math.round(trb)} REB · ${Math.round(ast)} AST`,
      });
    }
    if (players.length < MIN_SQUAD_PLAYERS) return null;

    players.sort((a, b) => b.rating - a.rating);
    return {
      squadId: `${entry.team}-${entry.season}`,
      teamName: entry.teamName,
      year: endYear(entry.season),
      players,
    };
  } catch {
    return null;
  }
}
