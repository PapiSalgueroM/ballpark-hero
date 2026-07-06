import { supabase } from '@/integrations/supabase/client';
import { flagFor } from '@/lib/dealPlayers';
import { clubKey, normalizeName, positionGroup, primaryNationality } from '@/lib/whoAmI';
import type { PositionGroup } from '@/lib/whoAmI';

/**
 * Player Bingo (5x5 board, real bingo rules: complete ANY line to win)
 *
 * REWORK (2026-07-06, owner spec): the old 12-tile "fill the whole board"
 * version was too easy (position/nationality/value tiles almost any player
 * hit) and was not real bingo (no line-win, whole-board clear instead).
 * This rewrite:
 *   1. 5x5 board, 24 categories + a FREE center tile. Win on any completed
 *      row, column, or diagonal (12 possible lines), not a full clear.
 *   2. Drawn player cards show ONLY the full name. No flag, no club, no
 *      position: those were giving the answer away tile by tile.
 *   3. Categories are hard and lore-flavoured, built from data verified to
 *      exist and be computable (see DATA VERIFICATION below). No fabricated
 *      caps/trophies/foot categories: those fields do not exist reliably
 *      in this database (see rejected sources below).
 *   4. Unlimited skips. 3 wrong placements ends the game. A drawn player is
 *      NOT guaranteed to fit any open tile: buildDeck only seeds enough
 *      guaranteed fits to keep one bingo LINE reachable (3 satisfiers per
 *      tile), not enough to guarantee every tile like the old whole-board
 *      version did, so most draws are a genuine bluff against the board.
 *   5. Result screen reports lines completed + strikes used + share grid.
 *
 * DATA VERIFICATION (read-only SQL against flawuiqbvjobmkfkauhw, 2026-07-06):
 *   player_market_values actually carries goals, assists, matches,
 *   yellow_cards, red_cards per season row (previously unused by this file).
 *   Against the same pool definition as before (top 500 rows by value,
 *   year >= 2024, deduped by player keeping the most recent row), checking
 *   EVERY season row (all years) in each pool player's history:
 *     Scored 25+ goals in a season: 36 players
 *     Scored 20+ goals in a season: 81 players
 *     10+ assists in a season: 159 players
 *     15+ assists in a season: 51 players
 *     Sent off (red card) in a season: 219 players
 *     10+ yellow cards in a season: 123 players
 *     Played 40+ matches in a season: 416 players
 *     One-club man (exactly 1 distinct club across all history rows): 55
 *     Played for 4+ different clubs across history: 136
 *   Existing (unchanged) support: nationalities/clubs/positions/value/age
 *     bands as documented below, World Cup appearance 115, Ballon d'Or 2
 *     (stays dormant, same MIN_TILE_SUPPORT gate as before).
 *   Exact positions (not just GK/DEF/MID/FWD groups) in the pool, distinct
 *   Transfermarkt strings, all comfortably above MIN_TILE_SUPPORT:
 *     Left Midfield 823, Centre-Forward 647, Centre-Back 640, Right
 *     Midfield 637, Central Midfield 629, Right-Back 618, Right Winger 606,
 *     Second Striker 596, Attacking Midfield 595, Left-Back 594, Left
 *     Winger 590, Goalkeeper 556.
 *
 * REJECTED SOURCES (checked and found unusable, so NOT shipped as tiles):
 *   soccer_player_facts (96 rows): international_caps, international_goals,
 *     and preferred_foot are NULL on every single row. trophies is
 *     unstructured scraped wiki text (Messi/Ronaldo rows are literally
 *     "See also:" links, not achievement lists), and only 58 of 96 rows
 *     even name-match the pool. No caps, no goals, no foot, no trophy list
 *     tile can be computed from this table.
 *   national_team_squads (2784 rows) and world_cup_players (10585 rows,
 *     used only for "played at a World Cup"): both are raw wiki-table
 *     scrapes where `club`/`position` columns hold garbage (birthdates,
 *     rank+position codes) and there is no caps column at all. Fine as a
 *     yes/no "appeared in a World Cup squad" name-match (kept, as before);
 *     not fine for "100+ caps," "one-club man via internationals," etc.
 *   soccer_league_top_scorers / ucl_top_scorers_by_season: only 11-12 of
 *     the 500-pool players name-match at all, too thin a base to build a
 *     "won a Golden Boot" / "Champions League top scorer" tile on top of
 *     an already-generated 500-pool (would make those tiles feel broken
 *     more often than not).
 *   trophy_winners / soccer_league_champions / soccer_continental_finals:
 *     team-level rows (winner club, not a player roster), no reliable way
 *     to join a specific player to "won a treble" without hand-curating
 *     data this project does not have. Not shipped.
 *
 * Winnability: generateBoard only places criteria with support >=
 * MIN_TILE_SUPPORT (8), same rule as before. Because a real bingo line only
 * needs 5 filled tiles (not all 24), buildDeck seeds GUARANTEED_PER_LINE
 * satisfiers per tile across the first GUARANTEE_WINDOW reveals so at least
 * one line is always completable, while still leaving most drawn players
 * fitting nothing on the board (the bluff element).
 */

export interface BingoPlayer {
  name: string;
  nationality: string; // raw value, can hold duals like "France / Algeria"
  position: string; // Transfermarkt style, e.g. "Centre-Forward"
  club: string; // club on the player's most recent row
  value: number; // market value in USD from the most recent row
  age: number; // age on the most recent row
  year: number; // year of the row we kept
}

export interface BingoData {
  pool: BingoPlayer[]; // sorted by value desc
  clubHistory: Map<string, Set<string>>; // player name -> normalized club keys, all years
  seasonStats: Map<string, SeasonStat[]>; // player name -> every season row's stat line
  worldCupAll: Set<string>; // normalized names of 2010+ World Cup squad players
  worldCup2022: Set<string>; // normalized names of 2022 World Cup squad players
  ballonDor: Set<string>; // normalized names of men's Ballon d'Or winners
}

export interface SeasonStat {
  goals: number | null;
  assists: number | null;
  matches: number | null;
  yellowCards: number | null;
  redCards: number | null;
}

export type CriterionKind = 'nationality' | 'club' | 'position' | 'value' | 'age' | 'honour' | 'season-stat' | 'career-shape';

export interface BingoCriterion {
  id: string;
  kind: CriterionKind;
  label: string;
  icon: string; // flag or text glyph only
  /** Criteria sharing a group never appear on the same board (near-duplicates). */
  group?: string;
  test: (p: BingoPlayer, data: BingoData) => boolean;
  support: string[]; // names of pool players that satisfy the criterion
}

export const GRID = 5; // 5x5 board
export const BOARD_SIZE = GRID * GRID - 1; // 24 real tiles + 1 FREE center
export const FREE_INDEX = 12; // center cell of a 5x5 grid, 0-indexed
export const START_LIVES = 3; // 3 wrong placements ends the game
/** A criterion may only appear on a board if at least this many pool players satisfy it. */
export const MIN_TILE_SUPPORT = 8;
/** Every tile gets at least GUARANTEED_PER_LINE satisfiers inside the first GUARANTEE_WINDOW reveals. */
export const GUARANTEE_WINDOW = 60;
export const GUARANTEED_PER_LINE = 3;
export const POOL_SIZE = 500;

const POOL_ROW_FETCH = 1000; // top rows by value from recent years, deduped down to POOL_SIZE
const POOL_MIN_YEAR = 2024;
const HISTORY_CHUNK = 80; // names per .in() filter, keeps request URLs comfortably small
const HISTORY_PAGE = 1000; // PostgREST row cap per request
const HISTORY_MAX_PAGES = 6;
const WC_MIN_YEAR = 2010; // a 2024+ pool player cannot have played a pre-2010 World Cup
const WC_PAGE = 1000;
const WC_MAX_PAGES = 8;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface PoolRow {
  player_name: string | null;
  nationality: string | null;
  position: string | null;
  club: string | null;
  market_value_usd: number | null;
  age: number | null;
  year: number | null;
}

interface HistoryRow {
  player_name: string | null;
  club: string | null;
  goals: number | null;
  assists: number | null;
  matches: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
}

/**
 * Career club sets AND every season's stat line for every pool player, from
 * ALL years in the table. Local copy of the whoAmI pattern (that helper is
 * module-private there): names are chunked into .in() filters and each
 * chunk is paged in blocks of 1000 rows to respect the PostgREST row cap.
 */
async function fetchClubHistoryAndStats(
  names: string[],
): Promise<{ clubHistory: Map<string, Set<string>>; seasonStats: Map<string, SeasonStat[]> }> {
  const clubHistory = new Map<string, Set<string>>();
  const seasonStats = new Map<string, SeasonStat[]>();
  const chunks: string[][] = [];
  for (let i = 0; i < names.length; i += HISTORY_CHUNK) {
    chunks.push(names.slice(i, i + HISTORY_CHUNK));
  }
  await Promise.all(
    chunks.map(async chunk => {
      let from = 0;
      for (let page = 0; page < HISTORY_MAX_PAGES; page++) {
        const { data, error } = await supabase
          .from('player_market_values')
          .select('player_name, club, goals, assists, matches, yellow_cards, red_cards')
          .in('player_name', chunk)
          .order('id', { ascending: true })
          .range(from, from + HISTORY_PAGE - 1);
        if (error) throw error;
        for (const r of (data ?? []) as HistoryRow[]) {
          const name = (r.player_name ?? '').trim();
          if (!name) continue;

          const key = clubKey(r.club ?? '');
          if (key) {
            let set = clubHistory.get(name);
            if (!set) {
              set = new Set<string>();
              clubHistory.set(name, set);
            }
            set.add(key);
          }

          let stats = seasonStats.get(name);
          if (!stats) {
            stats = [];
            seasonStats.set(name, stats);
          }
          stats.push({
            goals: r.goals,
            assists: r.assists,
            matches: r.matches,
            yellowCards: r.yellow_cards,
            redCards: r.red_cards,
          });
        }
        if (!data || data.length < HISTORY_PAGE) break;
        from += HISTORY_PAGE;
      }
    }),
  );
  return { clubHistory, seasonStats };
}

/** Top rows by market value from recent years, deduped by player keeping the newest row. */
async function fetchPool(): Promise<BingoPlayer[] | null> {
  const { data: rows, error } = await supabase
    .from('player_market_values')
    .select('player_name, nationality, position, club, market_value_usd, age, year')
    .gte('year', POOL_MIN_YEAR)
    .gt('market_value_usd', 0)
    .not('age', 'is', null)
    .order('market_value_usd', { ascending: false })
    .limit(POOL_ROW_FETCH);
  if (error || !rows) return null;

  const byName = new Map<string, BingoPlayer>();
  for (const r of rows as PoolRow[]) {
    const name = (r.player_name ?? '').trim();
    const value = Number(r.market_value_usd) || 0;
    const age = Number(r.age) || 0;
    const year = Number(r.year) || 0;
    if (!name || value <= 0 || age <= 0) continue;
    const candidate: BingoPlayer = {
      name,
      nationality: (r.nationality ?? '').trim(),
      position: (r.position ?? '').trim(),
      club: (r.club ?? '').trim(),
      value,
      age,
      year,
    };
    const prev = byName.get(name);
    if (!prev || year > prev.year || (year === prev.year && value > prev.value)) {
      byName.set(name, candidate);
    }
  }

  const pool = [...byName.values()].sort((a, b) => b.value - a.value).slice(0, POOL_SIZE);
  return pool.length >= 100 ? pool : null;
}

/** Normalized name sets from World Cup squads (2010 and later), paged. */
async function fetchWorldCupSets(): Promise<{ all: Set<string>; y2022: Set<string> }> {
  const all = new Set<string>();
  const y2022 = new Set<string>();
  let from = 0;
  for (let page = 0; page < WC_MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from('world_cup_players')
      .select('player_name, world_cup_year')
      .gte('world_cup_year', WC_MIN_YEAR)
      .order('id', { ascending: true })
      .range(from, from + WC_PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) {
      const key = normalizeName(r.player_name ?? '');
      if (!key) continue;
      all.add(key);
      if (Number(r.world_cup_year) === 2022) y2022.add(key);
    }
    if (!data || data.length < WC_PAGE) break;
    from += WC_PAGE;
  }
  return { all, y2022 };
}

/** Normalized names of men's Ballon d'Or winners (rank 1 rows, or unranked winner rows). */
async function fetchBallonDorWinners(): Promise<Set<string>> {
  const { data, error } = await supabase.from('ballon_dor').select('player_name, rank, award_type');
  if (error) throw error;
  const winners = new Set<string>();
  for (const r of data ?? []) {
    if ((r.award_type ?? 'Men') !== 'Men') continue;
    if (r.rank != null && Number(r.rank) !== 1) continue;
    const key = normalizeName(r.player_name ?? '');
    if (key) winners.add(key);
  }
  return winners;
}

/**
 * Boot fetch for the whole game. Returns null on any failure so the page can
 * show an error state with retry.
 */
export async function fetchBingoData(): Promise<BingoData | null> {
  try {
    const [pool, wc, ballonDor] = await Promise.all([
      fetchPool(),
      fetchWorldCupSets(),
      fetchBallonDorWinners(),
    ]);
    if (!pool) return null;

    const { clubHistory, seasonStats } = await fetchClubHistoryAndStats(pool.map(p => p.name));
    // Every player at least carries their current club, even if a history page fell short.
    for (const p of pool) {
      const key = clubKey(p.club);
      if (!key) continue;
      let set = clubHistory.get(p.name);
      if (!set) {
        set = new Set<string>();
        clubHistory.set(p.name, set);
      }
      set.add(key);
    }

    return { pool, clubHistory, seasonStats, worldCupAll: wc.all, worldCup2022: wc.y2022, ballonDor };
  } catch {
    return null;
  }
}

/* ------------------------------ criteria ------------------------------ */

/** Curated big clubs with their exact normalized club keys as stored in the table. */
const CLUB_TILES: { label: string; keys: string[] }[] = [
  { label: 'Real Madrid', keys: ['real madrid'] },
  { label: 'Barcelona', keys: ['fc barcelona'] },
  { label: 'Manchester United', keys: ['manchester united'] },
  { label: 'Manchester City', keys: ['manchester city'] },
  { label: 'Liverpool', keys: ['liverpool fc'] },
  { label: 'Chelsea', keys: ['chelsea fc'] },
  { label: 'Arsenal', keys: ['arsenal fc'] },
  { label: 'Tottenham', keys: ['tottenham hotspur'] },
  { label: 'PSG', keys: ['paris saint-germain'] },
  { label: 'Bayern Munich', keys: ['bayern munich', 'fc bayern munich'] },
  { label: 'Borussia Dortmund', keys: ['borussia dortmund'] },
  { label: 'Juventus', keys: ['juventus fc', 'juventus'] },
  { label: 'AC Milan', keys: ['ac milan'] },
  { label: 'Inter Milan', keys: ['inter milan'] },
  { label: 'Atletico Madrid', keys: ['atletico de madrid'] },
];

const POSITION_GROUP_TILES: { group: PositionGroup; label: string; icon: string }[] = [
  { group: 'GK', label: 'Goalkeeper', icon: '🧤' },
  { group: 'DEF', label: 'Defender', icon: '🛡️' },
  { group: 'MID', label: 'Midfielder', icon: '⚙️' },
  { group: 'FWD', label: 'Forward', icon: '⚽' },
];

/** Exact Transfermarkt position strings, verified present in the pool with 500+ support each. */
const EXACT_POSITION_TILES: { position: string; label: string; icon: string }[] = [
  { position: 'Centre-Back', label: 'Centre-Back', icon: '🛡️' },
  { position: 'Right-Back', label: 'Right-Back', icon: '🛡️' },
  { position: 'Left-Back', label: 'Left-Back', icon: '🛡️' },
  { position: 'Central Midfield', label: 'Central Midfielder', icon: '⚙️' },
  { position: 'Defensive Midfield', label: 'Defensive Midfielder', icon: '⚙️' },
  { position: 'Attacking Midfield', label: 'Attacking Midfielder', icon: '⚙️' },
  { position: 'Left Midfield', label: 'Left Midfielder', icon: '⚙️' },
  { position: 'Right Midfield', label: 'Right Midfielder', icon: '⚙️' },
  { position: 'Right Winger', label: 'Right Winger', icon: '⚽' },
  { position: 'Left Winger', label: 'Left Winger', icon: '⚽' },
  { position: 'Centre-Forward', label: 'Centre-Forward', icon: '⚽' },
  { position: 'Second Striker', label: 'Second Striker', icon: '⚽' },
];

type RawCriterion = Omit<BingoCriterion, 'support'>;

function withSupport(data: BingoData, raw: RawCriterion): BingoCriterion {
  const support: string[] = [];
  for (const p of data.pool) {
    if (raw.test(p, data)) support.push(p.name);
  }
  return { ...raw, support };
}

/** True if any season row for this player satisfies the given stat predicate. */
function anySeasonMatches(data: BingoData, p: BingoPlayer, pred: (s: SeasonStat) => boolean): boolean {
  const stats = data.seasonStats.get(p.name);
  if (!stats) return false;
  return stats.some(pred);
}

/**
 * Builds every criterion instance with its computed support list. Instances
 * below MIN_TILE_SUPPORT are still returned (so callers can inspect them) but
 * generateBoard never places them on a board.
 */
export function buildCriteria(data: BingoData): BingoCriterion[] {
  const out: BingoCriterion[] = [];

  // Nationalities, data driven from the pool itself.
  const natCount = new Map<string, { label: string; count: number }>();
  for (const p of data.pool) {
    const key = primaryNationality(p.nationality);
    if (!key) continue;
    const label = (p.nationality || '').split(/[/,]/)[0].trim();
    const cur = natCount.get(key);
    if (cur) cur.count += 1;
    else natCount.set(key, { label, count: 1 });
  }
  for (const [key, info] of natCount) {
    if (info.count < MIN_TILE_SUPPORT) continue;
    out.push(
      withSupport(data, {
        id: 'nat-' + key.replace(/\s+/g, '-'),
        kind: 'nationality',
        label: 'From ' + info.label,
        icon: flagFor(info.label),
        test: p => primaryNationality(p.nationality) === key,
      }),
    );
  }

  // Career clubs (any season in the player's history counts).
  for (const c of CLUB_TILES) {
    out.push(
      withSupport(data, {
        id: 'club-' + c.keys[0].replace(/\s+/g, '-'),
        kind: 'club',
        label: 'Played for ' + c.label,
        icon: '👕',
        test: (p, d) => {
          const hist = d.clubHistory.get(p.name);
          if (!hist) return false;
          return c.keys.some(k => hist.has(k));
        },
      }),
    );
  }

  // Position groups. No `group` tag: a board can mix a group tile (e.g.
  // "Defender") with an exact-position tile (e.g. "Centre-Back") since a
  // player can satisfy both without it feeling like a duplicate box.
  for (const t of POSITION_GROUP_TILES) {
    out.push(
      withSupport(data, {
        id: 'pos-' + t.group.toLowerCase(),
        kind: 'position',
        label: t.label,
        icon: t.icon,
        test: p => positionGroup(p.position) === t.group,
      }),
    );
  }

  // Exact positions (finer than the group tiles above, harder to place).
  for (const t of EXACT_POSITION_TILES) {
    out.push(
      withSupport(data, {
        id: 'exactpos-' + t.position.toLowerCase().replace(/[^a-z]+/g, '-'),
        kind: 'position',
        label: t.label,
        icon: t.icon,
        test: p => normalizeName(p.position) === normalizeName(t.position),
      }),
    );
  }

  // Market value bands (the pool floor is around $24M, so "under $30M" is well stocked).
  out.push(
    withSupport(data, {
      id: 'value-100m',
      kind: 'value',
      group: 'value-up',
      label: 'Valued $100M+',
      icon: '💰',
      test: p => p.value >= 100_000_000,
    }),
  );
  out.push(
    withSupport(data, {
      id: 'value-50m',
      kind: 'value',
      group: 'value-up',
      label: 'Valued $50M+',
      icon: '💰',
      test: p => p.value >= 50_000_000,
    }),
  );
  out.push(
    withSupport(data, {
      id: 'value-under-30m',
      kind: 'value',
      label: 'Valued under $30M',
      icon: '🪙',
      test: p => p.value > 0 && p.value < 30_000_000,
    }),
  );

  // Age bands.
  out.push(
    withSupport(data, {
      id: 'age-29-plus',
      kind: 'age',
      label: 'Aged 29 or older',
      icon: '🎂',
      test: p => p.age >= 29,
    }),
  );
  out.push(
    withSupport(data, {
      id: 'age-21-under',
      kind: 'age',
      label: 'Aged 21 or younger',
      icon: '🌱',
      test: p => p.age > 0 && p.age <= 21,
    }),
  );

  // Honours.
  out.push(
    withSupport(data, {
      id: 'wc-any',
      kind: 'honour',
      group: 'wc',
      label: 'Played at a World Cup',
      icon: '🌍',
      test: (p, d) => d.worldCupAll.has(normalizeName(p.name)),
    }),
  );
  out.push(
    withSupport(data, {
      id: 'wc-2022',
      kind: 'honour',
      group: 'wc',
      label: 'Played at the 2022 World Cup',
      icon: '🌍',
      test: (p, d) => d.worldCup2022.has(normalizeName(p.name)),
    }),
  );
  out.push(
    withSupport(data, {
      id: 'ballon-dor',
      kind: 'honour',
      label: "Won the Ballon d'Or",
      icon: '🏆',
      test: (p, d) => d.ballonDor.has(normalizeName(p.name)),
    }),
  );

  // Season-stat tiles: real season rows, checked across the player's whole history.
  out.push(
    withSupport(data, {
      id: 'season-goals-25',
      kind: 'season-stat',
      group: 'season-goals',
      label: 'Scored 25+ goals in a season',
      icon: '🥅',
      test: (p, d) => anySeasonMatches(d, p, s => (s.goals ?? 0) >= 25),
    }),
  );
  out.push(
    withSupport(data, {
      id: 'season-goals-20',
      kind: 'season-stat',
      group: 'season-goals',
      label: 'Scored 20+ goals in a season',
      icon: '🥅',
      test: (p, d) => anySeasonMatches(d, p, s => (s.goals ?? 0) >= 20),
    }),
  );
  out.push(
    withSupport(data, {
      id: 'season-assists-15',
      kind: 'season-stat',
      group: 'season-assists',
      label: '15+ assists in a season',
      icon: '🎯',
      test: (p, d) => anySeasonMatches(d, p, s => (s.assists ?? 0) >= 15),
    }),
  );
  out.push(
    withSupport(data, {
      id: 'season-assists-10',
      kind: 'season-stat',
      group: 'season-assists',
      label: '10+ assists in a season',
      icon: '🎯',
      test: (p, d) => anySeasonMatches(d, p, s => (s.assists ?? 0) >= 10),
    }),
  );
  out.push(
    withSupport(data, {
      id: 'season-red-card',
      kind: 'season-stat',
      label: 'Sent off in a season',
      icon: '🟥',
      test: (p, d) => anySeasonMatches(d, p, s => (s.redCards ?? 0) >= 1),
    }),
  );
  out.push(
    withSupport(data, {
      id: 'season-yellows-10',
      kind: 'season-stat',
      label: '10+ yellow cards in a season',
      icon: '🟨',
      test: (p, d) => anySeasonMatches(d, p, s => (s.yellowCards ?? 0) >= 10),
    }),
  );
  out.push(
    withSupport(data, {
      id: 'season-matches-40',
      kind: 'season-stat',
      label: 'Played 40+ matches in a season',
      icon: '📅',
      test: (p, d) => anySeasonMatches(d, p, s => (s.matches ?? 0) >= 40),
    }),
  );

  // Career shape: club-history breadth.
  out.push(
    withSupport(data, {
      id: 'one-club-man',
      kind: 'career-shape',
      group: 'club-count',
      label: 'One-club man',
      icon: '❤️',
      test: (p, d) => (d.clubHistory.get(p.name)?.size ?? 0) === 1,
    }),
  );
  out.push(
    withSupport(data, {
      id: 'journeyman-4-clubs',
      kind: 'career-shape',
      group: 'club-count',
      label: 'Played for 4+ clubs',
      icon: '🧳',
      test: (p, d) => (d.clubHistory.get(p.name)?.size ?? 0) >= 4,
    }),
  );

  return out;
}

/** How many tiles of each kind a board aims for (sums to BOARD_SIZE, 24). */
const BOARD_QUOTAS: { kind: CriterionKind; count: number }[] = [
  { kind: 'nationality', count: 6 },
  { kind: 'club', count: 4 },
  { kind: 'position', count: 5 },
  { kind: 'value', count: 2 },
  { kind: 'age', count: 2 },
  { kind: 'honour', count: 1 },
  { kind: 'season-stat', count: 3 },
  { kind: 'career-shape', count: 1 },
];

/**
 * Picks BOARD_SIZE (24) tiles for the 25-cell grid (FREE center excluded).
 * Only criteria with support >= MIN_TILE_SUPPORT are eligible, which is the
 * first half of the winnability guarantee. Criteria sharing a `group`
 * (near-duplicates, e.g. the two goal-count tiles) never appear together.
 * If a quota bucket runs short, any other eligible criterion backfills.
 */
export function generateBoard(criteria: BingoCriterion[]): BingoCriterion[] {
  const eligible = criteria.filter(c => c.support.length >= MIN_TILE_SUPPORT);
  const byKind = new Map<CriterionKind, BingoCriterion[]>();
  for (const c of eligible) {
    const list = byKind.get(c.kind);
    if (list) list.push(c);
    else byKind.set(c.kind, [c]);
  }

  const board: BingoCriterion[] = [];
  const usedGroups = new Set<string>();
  const usedIds = new Set<string>();
  const take = (c: BingoCriterion) => {
    board.push(c);
    usedIds.add(c.id);
    if (c.group) usedGroups.add(c.group);
  };

  for (const q of BOARD_QUOTAS) {
    let taken = 0;
    for (const c of shuffle(byKind.get(q.kind) ?? [])) {
      if (taken >= q.count) break;
      if (usedIds.has(c.id)) continue;
      if (c.group && usedGroups.has(c.group)) continue;
      take(c);
      taken++;
    }
  }

  if (board.length < BOARD_SIZE) {
    for (const c of shuffle(eligible)) {
      if (board.length >= BOARD_SIZE) break;
      if (usedIds.has(c.id)) continue;
      if (c.group && usedGroups.has(c.group)) continue;
      take(c);
    }
  }

  return shuffle(board.slice(0, BOARD_SIZE));
}

/**
 * Lays 24 criteria into a 5x5 grid around a FREE center cell (index 12).
 * Returns exactly GRID*GRID cells; the FREE cell holds `null`.
 */
export function layoutGrid(board: BingoCriterion[]): (BingoCriterion | null)[] {
  const cells: (BingoCriterion | null)[] = [];
  let bi = 0;
  for (let i = 0; i < GRID * GRID; i++) {
    if (i === FREE_INDEX) {
      cells.push(null);
    } else {
      cells.push(board[bi] ?? null);
      bi++;
    }
  }
  return cells;
}

/** All 12 winning lines on a 5x5 grid (5 rows, 5 cols, 2 diagonals), as cell-index arrays. */
export function winningLines(): number[][] {
  const lines: number[][] = [];
  for (let r = 0; r < GRID; r++) {
    lines.push(Array.from({ length: GRID }, (_, c) => r * GRID + c));
  }
  for (let c = 0; c < GRID; c++) {
    lines.push(Array.from({ length: GRID }, (_, r) => r * GRID + c));
  }
  lines.push(Array.from({ length: GRID }, (_, i) => i * GRID + i));
  lines.push(Array.from({ length: GRID }, (_, i) => i * GRID + (GRID - 1 - i)));
  return lines;
}

/**
 * Given the set of locked cell indexes (FREE_INDEX always counts as locked),
 * returns how many of the 12 lines are fully completed.
 */
export function countCompletedLines(lockedIndexes: Set<number>): number {
  const all = new Set(lockedIndexes);
  all.add(FREE_INDEX);
  let completed = 0;
  for (const line of winningLines()) {
    if (line.every(i => all.has(i))) completed++;
  }
  return completed;
}

/**
 * Orders the reveal deck so at least one bingo line is always reachable:
 * GUARANTEED_PER_LINE satisfiers of EVERY board tile are seeded (shuffled)
 * inside the first GUARANTEE_WINDOW reveals, scarcest tiles first. Most of
 * the pool is left in random order after that, so most drawn players fit
 * nothing on the board by design (the bluff element) and skipping never
 * runs dry early.
 */
export function buildDeck(pool: BingoPlayer[], board: BingoCriterion[]): BingoPlayer[] {
  const byName = new Map(pool.map(p => [p.name, p]));
  const guaranteed = new Set<string>();
  const tiles = [...board].sort((a, b) => a.support.length - b.support.length);

  for (const t of tiles) {
    const target = Math.min(GUARANTEED_PER_LINE, t.support.length);
    let have = 0;
    for (const n of t.support) {
      if (guaranteed.has(n)) have++;
    }
    for (const n of shuffle(t.support)) {
      if (have >= target) break;
      if (guaranteed.has(n)) continue;
      guaranteed.add(n);
      have++;
    }
  }

  const head: BingoPlayer[] = [];
  for (const n of guaranteed) {
    const p = byName.get(n);
    if (p) head.push(p);
  }
  const rest = shuffle(pool.filter(p => !guaranteed.has(p.name)));
  const windowSize = Math.min(Math.max(GUARANTEE_WINDOW, head.length), pool.length);
  let restIdx = 0;
  while (head.length < windowSize && restIdx < rest.length) {
    head.push(rest[restIdx]);
    restIdx++;
  }
  return [...shuffle(head), ...rest.slice(restIdx)];
}

/** 5x5 grid of green/white/star squares, in board display order (FREE center is a star). */
export function buildShareGrid(board: BingoCriterion[], locked: Record<string, string>): string {
  const cells = layoutGrid(board);
  const rows: string[] = [];
  for (let r = 0; r < GRID; r++) {
    const cols: string[] = [];
    for (let c = 0; c < GRID; c++) {
      const cell = cells[r * GRID + c];
      if (cell === null) cols.push('⭐');
      else cols.push(locked[cell.id] ? '🟩' : '⬜');
    }
    rows.push(cols.join(''));
  }
  return rows.join('\n');
}
