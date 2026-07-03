import { supabase } from '@/integrations/supabase/client';
import { DraftablePlayer, SeasonSlot, SpinSquad } from '@/lib/perfectSeason';

/**
 * NHL adapter for the Perfect Season engine.
 *
 * Data notes (verified against the live tables on 2026-07-01):
 * - nhl_player_stats holds CAREER totals per skater (no per-season rows, no
 *   goalies). `teams` is a comma list of 3-letter franchise codes and
 *   `year_from` / `year_to` are text like "1979-80". So the wheel spins on
 *   franchise + decade, and a squad holds skaters whose careers touched that
 *   franchise and that decade.
 * - nhl_draft is the goalie source. Its import shifted columns: `player` is
 *   "Name (POS)", `nationality` is the drafting NHL team, `team` is the
 *   player's country, and rows are duplicated. With no goalie stats anywhere
 *   in the archive, goalie ratings come from draft pedigree (overall pick).
 */

export const NHL_SLOTS: SeasonSlot[] = [
  { key: 'C', label: 'Center', weight: 1 },
  { key: 'LW', label: 'Left Wing', weight: 1 },
  { key: 'RW', label: 'Right Wing', weight: 1 },
  { key: 'D', label: 'Defense', weight: 1 },
  { key: 'D2', label: 'Defense 2', weight: 1 },
  { key: 'G', label: 'Goalie', weight: 1.6 },
];

export const NHL_GAMES = 82;

const MIN_GAMES = 15;
const DECADES = [1960, 1970, 1980, 1990, 2000, 2010, 2020];
const MIN_SQUAD_SKATERS = 14;

/** Franchise codes as they appear in nhl_player_stats.teams, with a display
 *  name and the nickname used to match drafting teams in nhl_draft. */
const NHL_TEAMS: Record<string, { name: string; draftMatch: string }> = {
  ANA: { name: 'Anaheim Ducks', draftMatch: 'Ducks' },
  ARI: { name: 'Arizona Coyotes', draftMatch: 'Coyotes' },
  ATF: { name: 'Atlanta Flames', draftMatch: 'Atlanta Flames' },
  ATL: { name: 'Atlanta Thrashers', draftMatch: 'Thrashers' },
  BOS: { name: 'Boston Bruins', draftMatch: 'Bruins' },
  BUF: { name: 'Buffalo Sabres', draftMatch: 'Sabres' },
  CAR: { name: 'Carolina Hurricanes', draftMatch: 'Hurricanes' },
  CBH: { name: 'Chicago Black Hawks', draftMatch: 'hawks' },
  CBJ: { name: 'Columbus Blue Jackets', draftMatch: 'Blue Jackets' },
  CGS: { name: 'California Golden Seals', draftMatch: 'Seals' },
  CGY: { name: 'Calgary Flames', draftMatch: 'Calgary Flames' },
  CHI: { name: 'Chicago Blackhawks', draftMatch: 'hawks' },
  CLE: { name: 'Cleveland Barons', draftMatch: 'Barons' },
  CLR: { name: 'Colorado Rockies', draftMatch: 'Rockies' },
  COL: { name: 'Colorado Avalanche', draftMatch: 'Avalanche' },
  DAL: { name: 'Dallas Stars', draftMatch: 'Dallas Stars' },
  DET: { name: 'Detroit Red Wings', draftMatch: 'Red Wings' },
  EDM: { name: 'Edmonton Oilers', draftMatch: 'Oilers' },
  FLA: { name: 'Florida Panthers', draftMatch: 'Panthers' },
  HAR: { name: 'Hartford Whalers', draftMatch: 'Whalers' },
  KCS: { name: 'Kansas City Scouts', draftMatch: 'Scouts' },
  LAK: { name: 'Los Angeles Kings', draftMatch: 'Kings' },
  MDA: { name: 'Mighty Ducks of Anaheim', draftMatch: 'Ducks' },
  MIN: { name: 'Minnesota Wild', draftMatch: 'Wild' },
  MNS: { name: 'Minnesota North Stars', draftMatch: 'North Stars' },
  MTL: { name: 'Montreal Canadiens', draftMatch: 'Canadiens' },
  NJD: { name: 'New Jersey Devils', draftMatch: 'Devils' },
  NSH: { name: 'Nashville Predators', draftMatch: 'Predators' },
  NYI: { name: 'New York Islanders', draftMatch: 'Islanders' },
  NYR: { name: 'New York Rangers', draftMatch: 'Rangers' },
  OAK: { name: 'Oakland Seals', draftMatch: 'Seals' },
  OTT: { name: 'Ottawa Senators', draftMatch: 'Senators' },
  PHI: { name: 'Philadelphia Flyers', draftMatch: 'Flyers' },
  PHX: { name: 'Phoenix Coyotes', draftMatch: 'Coyotes' },
  PIT: { name: 'Pittsburgh Penguins', draftMatch: 'Penguins' },
  QUE: { name: 'Quebec Nordiques', draftMatch: 'Nordiques' },
  SEA: { name: 'Seattle Kraken', draftMatch: 'Kraken' },
  SJS: { name: 'San Jose Sharks', draftMatch: 'Sharks' },
  STL: { name: 'St. Louis Blues', draftMatch: 'Blues' },
  TBL: { name: 'Tampa Bay Lightning', draftMatch: 'Lightning' },
  TOR: { name: 'Toronto Maple Leafs', draftMatch: 'Maple Leafs' },
  UTA: { name: 'Utah Hockey Club', draftMatch: 'Utah' },
  VAN: { name: 'Vancouver Canucks', draftMatch: 'Canucks' },
  VEG: { name: 'Vegas Golden Knights', draftMatch: 'Golden Knights' },
  WIN: { name: 'Winnipeg Jets', draftMatch: 'Winnipeg Jets' },
  WPG: { name: 'Winnipeg Jets', draftMatch: 'Winnipeg Jets' },
  WSH: { name: 'Washington Capitals', draftMatch: 'Capitals' },
};

export interface TeamEraIndexEntry {
  abbr: string;
  teamName: string;
  draftMatch: string;
  eraStart: number;
  eraEnd: number;
  eraLabel: string;
}

/** One light query, cached by the page: every franchise-decade pair with
 *  enough skaters to draft from. Roughly 220 wheel entries. */
export async function fetchTeamEraIndex(): Promise<TeamEraIndexEntry[] | null> {
  try {
    const { data, error } = await supabase
      .from('nhl_player_stats' as any)
      .select('teams, year_from, year_to')
      .gte('games', MIN_GAMES)
      .limit(6000);
    if (error || !data) return null;

    const counts = new Map<string, number>();
    for (const r of data as any[]) {
      const yf = parseInt(String(r.year_from), 10);
      const yt = parseInt(String(r.year_to), 10);
      if (!Number.isFinite(yf) || !Number.isFinite(yt) || yf < 1900 || yt < yf) continue;
      const abbrs = String(r.teams ?? '')
        .split(',')
        .map(a => a.trim())
        .filter(a => NHL_TEAMS[a]);
      for (const abbr of new Set(abbrs)) {
        for (const dec of DECADES) {
          if (yf <= dec + 9 && yt >= dec) {
            const key = `${abbr}|${dec}`;
            counts.set(key, (counts.get(key) ?? 0) + 1);
          }
        }
      }
    }

    const entries: TeamEraIndexEntry[] = [];
    for (const [key, n] of counts) {
      if (n < MIN_SQUAD_SKATERS) continue;
      const [abbr, decStr] = key.split('|');
      const dec = Number(decStr);
      const team = NHL_TEAMS[abbr];
      entries.push({
        abbr,
        teamName: team.name,
        draftMatch: team.draftMatch,
        eraStart: dec,
        eraEnd: dec + 9,
        eraLabel: `${dec}s`,
      });
    }
    return entries.length >= 60 ? entries : null;
  } catch {
    return null;
  }
}

/**
 * Era normalization (2026-07-03, #93/94): forwardRating/defenseRating read
 * career points-per-game with no adjustment for league scoring level, so a
 * point-per-game player in the 1980s (league averaged ~7.8 goals/game, the
 * highest-scoring era the NHL has had) rated identically to a point-per-game
 * player in the 2000s dead-puck era (league averaged ~5.1 goals/game, the
 * lowest). The second season is clearly the harder one to produce in.
 * NHL_DECADE_MULT holds each wheel-stop decade's league goals/game against a
 * ~5.8 modern (2010s-2020s) baseline, clamped to +-5% per the spec:
 *   2000s dead-puck era -> skaters get the full +5% boost.
 *   1970s-1990s (expansion through pre-lockout) -> a conservative -5% trim,
 *     since offense ran ahead of the modern baseline for most of that span.
 *   1960s and 2020s sit close enough to baseline for a small, real trim/no
 *     change rather than the full clamp.
 * A squad's wheel stop is one franchise-decade, but nhl_player_stats only
 * has career totals (see file header), so the decade of the SPIN is what
 * gets normalized, treating career ppg as that era's rate. Same reasoning
 * applies to defensemen; goalieRating is untouched since it is pedigree-
 * based (draft position), not a scoring-rate stat this bias applies to.
 */
const NHL_DECADE_MULT: Record<number, number> = {
  1960: 0.97, 1970: 0.95, 1980: 0.95, 1990: 0.95, 2000: 1.05, 2010: 1.05, 2020: 0.97,
};
function decadeMult(eraStart: number): number {
  return NHL_DECADE_MULT[eraStart] ?? 1.0;
}

/** 40-99 from career points per game. Tuned so Gretzky, Lemieux, Crosby and
 *  McDavid pin 99 while checking-line forwards land in the 40s and 50s. */
function forwardRating(ppg: number, eraStart: number): number {
  const base = 40 + (ppg - 0.15) * 58;
  return Math.round(Math.min(99, Math.max(40, base * decadeMult(eraStart))));
}

/** Defensemen score less, so they get a friendlier curve plus a small
 *  plus-minus bonus that rewards the shutdown types. */
function defenseRating(ppg: number, pmPerGame: number, eraStart: number): number {
  const pmBonus = Math.min(6, Math.max(0, pmPerGame * 18));
  const base = 42 + (ppg - 0.05) * 62 + pmBonus;
  return Math.round(Math.min(99, Math.max(40, base * decadeMult(eraStart))));
}

/** The archive has no goalie stats at all, so goalies rate on draft pedigree:
 *  first overall lands at 96, late rounds fade toward 44. */
function goalieRating(round: number, pick: number): number {
  const overall = Math.max(pick, (round - 1) * 15 + 1);
  return Math.round(Math.min(96, Math.max(44, 96 - 8 * Math.log(overall))));
}

function skaterEligible(position: string): string[] {
  switch (position) {
    case 'C': return ['C'];
    case 'LW': return ['LW'];
    case 'RW': return ['RW'];
    case 'W': return ['LW', 'RW'];
    case 'F': return ['C', 'LW', 'RW'];
    case 'D': return ['D', 'D2'];
    default: return [];
  }
}

/** Full draftable squad for one franchise-decade wheel stop. */
export async function fetchSquad(entry: TeamEraIndexEntry): Promise<SpinSquad | null> {
  try {
    const skaterCols = 'player_name, games, goals, assists, points, plus_minus, position, year_from, year_to';
    const [fwd, def, gol] = await Promise.all([
      supabase.from('nhl_player_stats' as any)
        .select(skaterCols)
        .like('teams', `%${entry.abbr}%`)
        .gte('games', MIN_GAMES)
        .in('position', ['C', 'LW', 'RW', 'F', 'W'])
        .lte('year_from', String(entry.eraEnd))
        .gte('year_to', String(entry.eraStart))
        .order('points', { ascending: false })
        .limit(24),
      supabase.from('nhl_player_stats' as any)
        .select(skaterCols)
        .like('teams', `%${entry.abbr}%`)
        .gte('games', MIN_GAMES)
        .eq('position', 'D')
        .lte('year_from', String(entry.eraEnd))
        .gte('year_to', String(entry.eraStart))
        .order('points', { ascending: false })
        .limit(12),
      supabase.from('nhl_draft' as any)
        .select('year, round, pick, player, nationality, team')
        .ilike('nationality', `%${entry.draftMatch}%`)
        .gte('year', entry.eraStart)
        .lte('year', entry.eraEnd)
        .order('round', { ascending: true })
        .order('pick', { ascending: true })
        .limit(500),
    ]);
    if (fwd.error || def.error) return null;

    const players = new Map<string, DraftablePlayer>();

    const addSkater = (raw: any) => {
      const name = String(raw.player_name ?? '').trim();
      const games = Number(raw.games) || 0;
      if (!name || games < MIN_GAMES || players.has(name)) return;
      const yf = parseInt(String(raw.year_from), 10);
      const yt = parseInt(String(raw.year_to), 10);
      if (!Number.isFinite(yf) || !Number.isFinite(yt)) return;
      if (yf > entry.eraEnd || yt < entry.eraStart) return;
      const eligible = skaterEligible(String(raw.position ?? '').trim());
      if (eligible.length === 0) return;
      const points = Number(raw.points) || 0;
      const goals = Number(raw.goals) || 0;
      const assists = Number(raw.assists) || 0;
      const pm = Number(raw.plus_minus) || 0;
      const ppg = points / games;
      const rating = eligible[0] === 'D'
        ? defenseRating(ppg, pm / games, entry.eraStart)
        : forwardRating(ppg, entry.eraStart);
      players.set(name, {
        playerId: name,
        name,
        rating,
        eligible,
        detail: `${goals} G · ${assists} A · ${games} GP`,
      });
    };

    for (const raw of (fwd.data ?? []) as any[]) addSkater(raw);
    for (const raw of (def.data ?? []) as any[]) addSkater(raw);

    // Goalies from the draft archive. Shifted columns: `player` is
    // "Name (POS)", `nationality` is the drafting team, `team` is the country.
    const goalies: DraftablePlayer[] = [];
    const seenGoalies = new Set<string>();
    for (const raw of (gol.data ?? []) as any[]) {
      const label = String(raw.player ?? '');
      const m = /\(\s*([A-Za-z/ .]+?)\s*\)\s*$/.exec(label);
      if (!m || m[1].replace(/[\s.]/g, '').toUpperCase() !== 'G') continue;
      const name = label.slice(0, m.index).trim();
      const round = Number(raw.round);
      const pick = Number(raw.pick);
      if (!name || seenGoalies.has(name) || !Number.isFinite(round) || !Number.isFinite(pick)) continue;
      seenGoalies.add(name);
      const country = String(raw.team ?? '').trim();
      goalies.push({
        playerId: `${name}-${raw.year}`,
        name,
        rating: goalieRating(round, pick),
        eligible: ['G'],
        detail: `${raw.year} draft · R${round} P${pick}${country ? ` · ${country}` : ''}`,
      });
    }
    goalies.sort((a, b) => b.rating - a.rating);
    for (const g of goalies.slice(0, 6)) {
      if (!players.has(g.name)) players.set(g.name, g);
    }

    if (players.size < 8) return null;

    const list = [...players.values()].sort((a, b) => b.rating - a.rating);
    return {
      squadId: `${entry.abbr}-${entry.eraStart}`,
      teamName: `${entry.teamName} (${entry.eraLabel})`,
      year: entry.eraStart,
      players: list,
    };
  } catch {
    return null;
  }
}
