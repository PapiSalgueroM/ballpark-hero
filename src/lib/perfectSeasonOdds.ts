/**
 * Round 820: one honest odds card for all four Perfect Season games.
 *
 * Round 784 made the NBA page print the real odds of an 82-0 for the team you
 * drafted, after a player ran 1,312 seasons without one. Its review noted that
 * the NHL, MLB and NFL pages still sold "the perfect season" on numbers nobody
 * had measured. This module is the one place those numbers and the words
 * around them come from: a descriptor per sport (season length, the per game
 * chance the page's own sim plays, how the page talks), the closed form odds
 * of an unbeaten season, and the copy built from them. The pages, the guides'
 * harness (scripts/simPerfectSeasonOdds.mjs) and the result card all read it,
 * so the card cannot print odds the sim does not play.
 *
 * MEASURED 2026-10-01 through each page's own adapter (every wheel stop the
 * live tables give) and the real sims, 200,000 drafts and 200,000 seasons per
 * figure; the full table is in the harness header:
 *   NBA  best team the wheel can build 98.5, 82-0 one run in 9.5. Well played
 *        drafts median 87.9, where 82-0 comes about one run in 160 million.
 *   NHL  best 98.3, one run in 2.7. Median well played draft 86.8, about one
 *        run in 33,000; across the whole spread of drafts one run in 89.
 *   MLB  best 98.0, one run in 7. Median well played draft 78.8, averaging 95
 *        wins; across the spread no 162-0 in 200,000 (closed form one run in
 *        256 million) while 18 percent of seasons reach 116 wins.
 *   NFL  best 97.5, two runs in three. Median well played draft 81.9, about
 *        one run in 1,200; across the spread one run in 99.
 */
import {
  winProbability, WIN_MOMENTUM, GAME_CAP, type PerfectSeasonSportKey,
} from '@/lib/perfectSeason';
import { perGameChance } from '@/lib/perfectSeasonExpansion';

/**
 * The most wins by a big league team in one season: 116, by the 1906 Chicago
 * Cubs (116-36) and the 2001 Seattle Mariners (116-46). Sources, checked
 * 2026-10-01: ESPN, "What are the best records in modern MLB history?"
 * (2025-08-17, espn.com/mlb/story/_/id/45981858), and Sports Illustrated,
 * "Teams with the most wins in an MLB season" (2025-06-19,
 * si.com/mlb/teams-with-the-most-wins-in-an-mlb-season). Our own lahman_teams
 * table agrees (2001 SEA and 1906 CHN at 116, the top two rows, data to
 * 2021). Nobody has matched it since: the 2026 Brewers set their franchise
 * best at 103-59 (Wikipedia's and Baseball Reference's 2026 Brewers pages,
 * checked 2026-10-01).
 */
export const MLB_WINS_RECORD = 116;

export interface PerfectSeasonSportDef {
  key: PerfectSeasonSportKey;
  /** Regular season length the page sims. */
  games: number;
  /** "Spin the wheel of {history} history". */
  history: string;
  /** What the page calls the team you draft. */
  unit: 'roster' | 'lineup';
  /** The per game win chance the page's own sim plays, before momentum. */
  perGame: (overall: number) => number;
  /** Set where an unbeaten season is not a real target for any draft the
      wheel deals: the season the copy points at instead, in the sport's own
      terms. */
  greatSeason?: { wins: number; chase: string; longShot: string };
}

export const PERFECT_SEASON_SPORTS: Record<PerfectSeasonSportKey, PerfectSeasonSportDef> = {
  nba: { key: 'nba', games: 82, history: 'NBA', unit: 'roster', perGame: o => perGameChance('nba', o, 82) },
  nfl: { key: 'nfl', games: 17, history: 'NFL', unit: 'roster', perGame: o => perGameChance('nfl', o, 17) },
  nhl: { key: 'nhl', games: 82, history: 'hockey', unit: 'lineup', perGame: o => winProbability(o) },
  mlb: {
    key: 'mlb', games: 162, history: 'baseball', unit: 'lineup', perGame: o => winProbability(o),
    greatSeason: {
      wins: MLB_WINS_RECORD,
      chase: `chase ${MLB_WINS_RECORD} wins, the big league record`,
      longShot: `The real chase is ${MLB_WINS_RECORD} wins, the most any big league team has won in a season.`,
    },
  },
};

/**
 * The exact chance a season goes unbeaten at a given overall.
 *
 * The only path to a perfect season is every game won, and after a win the
 * momentum term is always WIN_MOMENTUM, so the probability is exact:
 *   p(first game) * p(every later game) ^ (games - 1)
 * with the same clamps both sims apply. scripts/simPerfectSeasonOdds.mjs
 * holds this against each sport's real sim over 200,000 seasons.
 */
export function perfectSeasonOdds(sport: PerfectSeasonSportKey, overall: number): number {
  const def = PERFECT_SEASON_SPORTS[sport];
  const p = def.perGame(overall);
  const first = Math.min(GAME_CAP, p);
  const later = Math.min(GAME_CAP, p + WIN_MOMENTUM);
  return first * Math.pow(later, def.games - 1);
}

/** Where the line stops calling an unbeaten season a long shot. */
export const REAL_SHOT_ODDS = 1 / 1000;

/** The lowest whole overall at which an unbeaten season is at least one run
    in 1,000, or null when no overall gets there. The copy names this number,
    so it can never drift from the curve. */
export function realShotFrom(sport: PerfectSeasonSportKey): number | null {
  for (let o = 40; o <= 99; o += 1) {
    if (perfectSeasonOdds(sport, o) >= REAL_SHOT_ODDS) return o;
  }
  return null;
}

/** "an 82-0", "an 89", "a 17-0", "a 95", "a 116": the article follows how the number is said. */
export function withArticle(said: string): string {
  return `${/^(8|11(?!\d)|18(?!\d))/.test(said) ? 'an' : 'a'} ${said}`;
}

/** "7 runs in 10", "one run in 5", "one run in 620", "one run in 33,000",
    "one run in 12 million". Better than even odds read as runs in ten, since
    "one run in 1" would say always (a 98 NFL roster goes 17-0 seven runs in ten). */
export function formatOneIn(odds: number): string {
  if (!(odds > 0)) return 'never';
  if (odds > 0.5) return `${Math.min(9, Math.round(odds * 10))} runs in 10`;
  const n = 1 / odds;
  if (n < 10) return `one run in ${Math.round(n)}`;
  if (n < 1e6) {
    const digits = Math.floor(Math.log10(n)) - 1;
    const unit = Math.pow(10, digits);
    return `one run in ${(Math.round(n / unit) * unit).toLocaleString('en-US')}`;
  }
  if (n < 1e9) return `one run in ${Math.round(n / 1e6)} million`;
  if (n < 1e12) return `one run in ${Math.round(n / 1e9)} billion`;
  return 'one run in more than a trillion';
}

/** What the result line says when an unbeaten season is a long shot. */
export function longShotLine(sport: PerfectSeasonSportKey): string {
  const def = PERFECT_SEASON_SPORTS[sport];
  if (def.greatSeason) return def.greatSeason.longShot;
  const from = realShotFrom(sport);
  if (from === null) return 'The chase is the win total; no roster this wheel deals gets unbeaten into range.';
  return `The chase is the win total; ${withArticle(String(from))} plus ${def.unit} is where unbeaten starts to be a real shot.`;
}

/** The line under the page title: the real chase, in the same words on every sport. */
export function perfectSeasonTagline(sport: PerfectSeasonSportKey): string {
  const def = PERFECT_SEASON_SPORTS[sport];
  const record = `${def.games}-0`;
  const start = `Spin the wheel of ${def.history} history, draft one player per stop, and`;
  if (def.greatSeason) {
    return `${start} ${def.greatSeason.chase}. A perfect ${record} needs a ${def.unit} the wheel almost never deals, and the odds are printed on every result.`;
  }
  const from = realShotFrom(sport);
  const takes = from === null ? `${record} is out of reach in this sim` : `${record} takes ${withArticle(String(from))} plus ${def.unit} and a lucky sim`;
  return `${start} chase the best record you can. ${takes}, and the odds are printed on every result.`;
}

/** The honest line under a final record: what an unbeaten season costs at
    this overall, and what it takes to be in the conversation. Pass the RAW
    overall the sim played, never a rounded one: the odds are steep enough
    that rounding 94.5 up to 95 halves them and 98.52 up to 99 doubles them,
    so they are worked out on the raw value and the line prints it to one
    decimal (an integer prints bare). */
export function perfectOddsLine(sport: PerfectSeasonSportKey, overall: number): string {
  const ovr = String(Math.round(overall * 10) / 10);
  const odds = perfectSeasonOdds(sport, overall);
  const record = withArticle(`${PERFECT_SEASON_SPORTS[sport].games}-0`);
  const lead = `At ${ovr} overall ${record} season comes about ${formatOneIn(odds)}.`;
  if (odds >= 1 / 20) return `${lead} You are in the conversation.`;
  if (odds >= REAL_SHOT_ODDS) return `${lead} Rare, not impossible.`;
  return `${lead} ${longShotLine(sport)}`;
}
