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
 *
 * 2026-07-08 ADDITIONS (owner: "add played with Messi, World Cup winner,
 * 10M+ Instagram followers, more obscure"), each verified read-only in SQL
 * against flawuiqbvjobmkfkauhw on 2026-07-08 with the exact pool definition
 * (top 1000 rows by value, year >= 2024, dedupe by name keeping the newest
 * row, top 500 kept; pool floor came out $32M):
 *   YEAR SEMANTICS (load-bearing for the two club-year tiles): a year-N row
 *   in player_market_values holds the club at the END of season N-1/N.
 *   Checked on known transfers: Haaland year 2023 = Man City (moved Jul 22),
 *   Bellingham year 2023 = Dortmund / 2024 = Real Madrid (moved Jun 23),
 *   Messi 2021 = Barcelona, 2022-2023 = PSG, 2024+ = Inter Miami,
 *   Ronaldo 2022 = Man United, 2023 = Al-Nassr (moved Jan 23). Club strings
 *   can hold mid-season moves as "Club A / Club B"; clubYears splits those.
 *   New tiles and their live support counts:
 *     'World Cup winner' (11): world_cup_players squad membership for the
 *       four champions the table covers (2010 Spain, 2014 Germany, 2018
 *       France, 2022 Argentina). Winner map is indisputable public record.
 *     'Played with Messi' (18): a season row at one of Messi's clubs in a
 *       year his own rows show him there (Barcelona 2005-2021, PSG
 *       2022-2023, Inter Miami 2024+) = teammates for at least part of
 *       that season. Messi himself is excluded.
 *     'Champions League winner' (62): a season row at the winning club in
 *       the season-end year of a 2011-2025 final. Squad members who did not
 *       play the final still count, matching how medals are credited.
 *     '10M+ Instagram followers' (15 in pool): static hand-checked list,
 *       every name comfortably above 10M (see INSTAGRAM_10M).
 *   STILL REJECTED (owner also floated these; the data cannot verify them):
 *     'Played in 4+ different leagues': player_market_values has NO league
 *       column (checked information_schema 2026-07-08), only club strings.
 *     'Left-footed': soccer_player_facts.preferred_foot is NULL on every
 *       row (documented above). No foot tile can be computed.
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
  clubYears: Map<string, ClubYear[]>; // player name -> (club key, season-end year) pairs, all years
  seasonStats: Map<string, SeasonStat[]>; // player name -> every season row's stat line
  worldCupAll: Set<string>; // normalized names of 2010+ World Cup squad players
  worldCup2022: Set<string>; // normalized names of 2022 World Cup squad players
  wcWinners: Set<string>; // normalized names of players in a winning squad (2010-2026)
  ballonDor: Set<string>; // normalized names of men's Ballon d'Or winners
}

/** One season row's club + year. Slash rows ("Club A / Club B") yield one entry per club. */
export interface ClubYear {
  key: string; // clubKey()-normalized club
  year: number;
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
  year: number | null;
  goals: number | null;
  assists: number | null;
  matches: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
}

/**
 * Career club sets, (club, year) pairs AND every season's stat line for every
 * pool player, from ALL years in the table. Local copy of the whoAmI pattern
 * (that helper is module-private there): names are chunked into .in() filters
 * and each chunk is paged in blocks of 1000 rows to respect the PostgREST cap.
 *
 * clubHistory keeps its original whole-string clubKey behaviour (the club
 * tiles' documented support counts were measured that way). clubYears, used
 * by the Messi/UCL tiles, splits mid-season "Club A / Club B" values so a
 * winter mover is credited at both clubs for that season.
 */
async function fetchClubHistoryAndStats(
  names: string[],
): Promise<{
  clubHistory: Map<string, Set<string>>;
  clubYears: Map<string, ClubYear[]>;
  seasonStats: Map<string, SeasonStat[]>;
}> {
  const clubHistory = new Map<string, Set<string>>();
  const clubYears = new Map<string, ClubYear[]>();
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
          .select('player_name, club, year, goals, assists, matches, yellow_cards, red_cards')
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

          const year = Number(r.year) || 0;
          if (year > 0) {
            let pairs = clubYears.get(name);
            if (!pairs) {
              pairs = [];
              clubYears.set(name, pairs);
            }
            for (const part of (r.club ?? '').split('/')) {
              const partKey = clubKey(part);
              if (partKey && !pairs.some(e => e.key === partKey && e.year === year)) {
                pairs.push({ key: partKey, year });
              }
            }
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
  return { clubHistory, clubYears, seasonStats };
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

/**
 * FIFA World Cup champions covered by the squads table (2010 and later).
 * Indisputable public record: Spain won 2010 (Johannesburg), Germany 2014
 * (Rio), France 2018 (Moscow), Argentina 2022 (Lusail), and Spain again in
 * 2026 (New Jersey, 1-0 over Argentina). The nationality column in
 * world_cup_players holds the squad's country as a plain name (verified in
 * SQL 2026-07-08: 23/23/23/26 distinct players per winner; the 26-man Spain
 * 2026 squad was inserted 2026-08-13, names verified across three sources).
 * Round 83: without the 2026 entry here, Cubarsí and co. were not counting
 * as World Cup winners on the bingo board, exactly as a player reported.
 */
const WORLD_CUP_WINNERS_2010_2026: Record<number, string> = {
  2010: 'Spain',
  2014: 'Germany',
  2018: 'France',
  2022: 'Argentina',
  2026: 'Spain',
};

/** Normalized name sets from World Cup squads (2010 and later), paged. */
async function fetchWorldCupSets(): Promise<{ all: Set<string>; y2022: Set<string>; winners: Set<string> }> {
  const all = new Set<string>();
  const y2022 = new Set<string>();
  const winners = new Set<string>();
  let from = 0;
  for (let page = 0; page < WC_MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from('world_cup_players')
      .select('player_name, world_cup_year, nationality')
      .gte('world_cup_year', WC_MIN_YEAR)
      .order('id', { ascending: true })
      .range(from, from + WC_PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) {
      const key = normalizeName(r.player_name ?? '');
      if (!key) continue;
      all.add(key);
      const year = Number(r.world_cup_year);
      if (year === 2022) y2022.add(key);
      if (WORLD_CUP_WINNERS_2010_2026[year] === (r.nationality ?? '').trim()) winners.add(key);
    }
    if (!data || data.length < WC_PAGE) break;
    from += WC_PAGE;
  }
  return { all, y2022, winners };
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

    const { clubHistory, clubYears, seasonStats } = await fetchClubHistoryAndStats(pool.map(p => p.name));
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

    return {
      pool,
      clubHistory,
      clubYears,
      seasonStats,
      worldCupAll: wc.all,
      worldCup2022: wc.y2022,
      wcWinners: wc.winners,
      ballonDor,
    };
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

/**
 * Messi's clubs mapped onto this table's year convention (a year-N row holds
 * the club at the END of season N-1/N; see the header verification block).
 * First-team debut October 2004 => Barcelona season rows 2005-2021 (left
 * August 2021), PSG 2022-2023 (August 2021 to June 2023), Inter Miami 2024+
 * (joined July 2023). A pool player with a season row at one of these clubs
 * inside the span shared a dressing room with Messi for at least part of
 * that season. SQL-verified support in the live pool: 18 players.
 */
const MESSI_CLUB_SPANS: { key: string; from: number; to: number }[] = [
  { key: 'fc barcelona', from: 2005, to: 2021 },
  { key: 'paris saint-germain', from: 2022, to: 2023 },
  { key: 'inter miami cf', from: 2024, to: 9999 },
];

/**
 * UEFA Champions League winners 2011-2025 as (clubKey, season-end year)
 * pairs, matching the year convention above. Indisputable public record:
 * 2011 + 2015 Barcelona, 2012 + 2021 Chelsea, 2013 + 2020 Bayern (both club
 * spellings in the table are listed), 2014/2016/2017/2018/2022/2024 Real
 * Madrid, 2019 Liverpool, 2023 Manchester City, 2025 PSG. A year-N row at
 * the winning club = in that club's squad when the final was won; squad
 * members who did not play the final still count, matching how winners'
 * medals are commonly credited. SQL-verified support in the live pool: 62.
 */
const UCL_WINNER_PAIRS: { keys: string[]; years: number[] }[] = [
  { keys: ['fc barcelona'], years: [2011, 2015] },
  { keys: ['chelsea fc'], years: [2012, 2021] },
  { keys: ['bayern munich', 'fc bayern munich'], years: [2013, 2020] },
  { keys: ['real madrid'], years: [2014, 2016, 2017, 2018, 2022, 2024] },
  { keys: ['liverpool fc'], years: [2019] },
  { keys: ['manchester city'], years: [2023] },
  { keys: ['paris saint-germain'], years: [2025] },
];
const UCL_WINNER_KEYS: Set<string> = new Set(
  UCL_WINNER_PAIRS.flatMap(p => p.keys.flatMap(k => p.years.map(y => `${k}|${y}`))),
);

/**
 * Players with 10M+ followers on their public verified Instagram accounts.
 * Hand-checked July 2026 and deliberately conservative: every name here is
 * COMFORTABLY above 10M (most are several multiples of it, e.g. Ronaldo and
 * Messi are in the hundreds of millions), so ordinary follower drift cannot
 * silently falsify the tile. Borderline ~10M accounts (Saka, Pedri, Foden,
 * Raphinha...) are intentionally left out rather than guessed. Names are
 * stored as normalizeName() output; both orderings of Son are included
 * because the table stores "Heung-min Son". 15 of these are in the current
 * pool (SQL-verified 2026-07-08), clearing MIN_TILE_SUPPORT.
 */
const INSTAGRAM_10M: Set<string> = new Set(
  [
    'Cristiano Ronaldo', 'Lionel Messi', 'Neymar', 'Kylian Mbappé', 'Karim Benzema',
    'Mohamed Salah', 'Vinicius Junior', 'Erling Haaland', 'Jude Bellingham',
    'Robert Lewandowski', 'Toni Kroos', 'Luka Modric', 'Sergio Ramos', 'Luis Suárez',
    'Paul Pogba', 'Antoine Griezmann', 'Kevin De Bruyne', 'Harry Kane',
    'Marcus Rashford', 'Heung-min Son', 'Son Heung-min', 'Casemiro',
    'Zlatan Ibrahimovic', 'Gareth Bale', 'James Rodríguez', 'Achraf Hakimi',
    'Lamine Yamal', 'Rodrygo', 'Ousmane Dembélé', 'Ángel Di María', 'Eden Hazard',
    'Mesut Özil', 'Marcelo', 'David De Gea', 'Philippe Coutinho', 'Radamel Falcao',
  ].map(normalizeName),
);

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
  // World Cup WINNER (2010 Spain / 2014 Germany / 2018 France / 2022
  // Argentina squad member). Shares the 'wc' group so it never sits on a
  // board next to the near-duplicate "played at a World Cup" tiles.
  out.push(
    withSupport(data, {
      id: 'wc-winner',
      kind: 'honour',
      group: 'wc',
      label: 'World Cup winner',
      icon: '🥇',
      test: (p, d) => d.wcWinners.has(normalizeName(p.name)),
    }),
  );
  // Champions League winner via (club, season-end year) rows against the
  // verified 2011-2025 winner pairs. See UCL_WINNER_PAIRS for method.
  out.push(
    withSupport(data, {
      id: 'ucl-winner',
      kind: 'honour',
      label: 'Champions League winner',
      icon: '🏆',
      test: (p, d) => {
        const rows = d.clubYears.get(p.name);
        return !!rows && rows.some(r => UCL_WINNER_KEYS.has(`${r.key}|${r.year}`));
      },
    }),
  );
  // 10M+ Instagram followers, static hand-checked list (see INSTAGRAM_10M).
  out.push(
    withSupport(data, {
      id: 'ig-10m',
      kind: 'honour',
      label: '10M+ Instagram followers',
      icon: '📸',
      test: p => INSTAGRAM_10M.has(normalizeName(p.name)),
    }),
  );
  // Played WITH Messi: a season row at one of Messi's clubs during his
  // verified span there (see MESSI_CLUB_SPANS). Messi never matches himself.
  out.push(
    withSupport(data, {
      id: 'messi-teammate',
      kind: 'club',
      label: 'Played with Messi',
      icon: '🐐',
      test: (p, d) => {
        if (normalizeName(p.name) === 'lionel messi') return false;
        const rows = d.clubYears.get(p.name);
        return (
          !!rows &&
          rows.some(r =>
            MESSI_CLUB_SPANS.some(s => r.key === s.key && r.year >= s.from && r.year <= s.to),
          )
        );
      },
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

/** How many tiles of each kind a board aims for (sums to BOARD_SIZE, 24).
 * 2026-07-08: honour 1 -> 2 (WC winner / UCL winner / Instagram tiles joined
 * the bucket) paid for by nationality 6 -> 5, keeping the sum at 24. */
const BOARD_QUOTAS: { kind: CriterionKind; count: number }[] = [
  { kind: 'nationality', count: 5 },
  { kind: 'club', count: 4 },
  { kind: 'position', count: 5 },
  { kind: 'value', count: 2 },
  { kind: 'age', count: 2 },
  { kind: 'honour', count: 2 },
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
