import { getTodayET, dateSeed } from '@/lib/dateUtils';

/**
 * "Rank 'Em" (backlog: Order the List / Factle). Put five players in order by
 * a career stat, most to fewest. Deterministic — the ranking is a fixed set of
 * DB career totals, so NO answer-check backend is needed (safe while the AI
 * validators are quota-limited). Every value below was pulled from Supabase on
 * 2026-07-22 and confirmed strictly distinct (no ties -> unambiguous order).
 * Coverage note: nhl_player_stats truncates pre-1968 careers, so NHL rounds use
 * only players who debuted 1971 or later.
 */

export interface RankItem { name: string; value: number; }

export interface RankRound {
  id: string;
  sport: 'NBA' | 'NHL' | 'MLB';
  /** The challenge, e.g. "career points". */
  statLabel: string;
  /** Short unit shown next to the number on reveal, e.g. "pts". */
  unit: string;
  /** Items in the CORRECT order — highest value first. */
  items: RankItem[];
  /** INTERNAL editor note; never rendered. */
  source: string;
}

const R = (
  id: string,
  sport: RankRound['sport'],
  statLabel: string,
  unit: string,
  items: RankItem[],
  source: string,
): RankRound => ({ id, sport, statLabel, unit, items, source });

export const RANK_ROUNDS: RankRound[] = [
  R('nba-pts', 'NBA', 'career points', 'pts', [
    { name: 'Kobe Bryant', value: 33643 },
    { name: 'Dirk Nowitzki', value: 31560 },
    { name: "Shaquille O'Neal", value: 28596 },
    { name: 'Carmelo Anthony', value: 28289 },
    { name: 'Allen Iverson', value: 24368 },
  ], 'nba_player_stats.points'),
  R('nba-ast', 'NBA', 'career assists', 'ast', [
    { name: 'John Stockton', value: 15806 },
    { name: 'Chris Paul', value: 12552 },
    { name: 'Jason Kidd', value: 12091 },
    { name: 'Steve Nash', value: 10335 },
    { name: 'Magic Johnson', value: 10141 },
  ], 'nba_player_stats.ast'),
  R('nba-3pm', 'NBA', 'career three-pointers made', '3PM', [
    { name: 'Stephen Curry', value: 4242 },
    { name: 'James Harden', value: 3388 },
    { name: 'Ray Allen', value: 2973 },
    { name: 'Klay Thompson', value: 2895 },
    { name: 'Reggie Miller', value: 2560 },
  ], 'nba_player_stats.three_p'),
  R('nba-reb', 'NBA', 'career rebounds', 'reb', [
    { name: 'Tim Duncan', value: 15091 },
    { name: 'Karl Malone', value: 14968 },
    { name: 'Kevin Garnett', value: 14662 },
    { name: 'Dwight Howard', value: 14627 },
    { name: 'Pau Gasol', value: 11305 },
  ], 'nba_player_stats.trb'),
  R('nhl-pts', 'NHL', 'career points', 'pts', [
    { name: 'Wayne Gretzky', value: 2857 },
    { name: 'Jaromír Jágr', value: 1921 },
    { name: 'Mark Messier', value: 1887 },
    { name: 'Ron Francis', value: 1798 },
    { name: 'Mario Lemieux', value: 1723 },
  ], 'nhl_player_stats.points (all debuted >= 1971)'),
  R('nhl-goals', 'NHL', 'career goals', 'G', [
    { name: 'Alex Ovechkin', value: 928 },
    { name: 'Wayne Gretzky', value: 894 },
    { name: 'Jaromír Jágr', value: 766 },
    { name: 'Brett Hull', value: 741 },
    { name: 'Steve Yzerman', value: 692 },
  ], 'nhl_player_stats.goals (all debuted >= 1971)'),
  R('nhl-ast', 'NHL', 'career assists', 'A', [
    { name: 'Wayne Gretzky', value: 1963 },
    { name: 'Ron Francis', value: 1249 },
    { name: 'Mark Messier', value: 1193 },
    { name: 'Jaromír Jágr', value: 1155 },
    { name: 'Adam Oates', value: 1079 },
  ], 'nhl_player_stats.assists (all debuted >= 1971)'),
  R('mlb-hr', 'MLB', 'career home runs', 'HR', [
    { name: 'Barry Bonds', value: 762 },
    { name: 'Henry Aaron', value: 755 },
    { name: 'Babe Ruth', value: 714 },
    { name: 'Albert Pujols', value: 703 },
    { name: 'Willie Mays', value: 660 },
  ], 'mlb_batting_stats.hr'),
  R('nba-blk', 'NBA', 'career blocks', 'blk', [
    { name: 'Hakeem Olajuwon', value: 3830 },
    { name: 'Dikembe Mutombo', value: 3289 },
    { name: 'Kareem Abdul-Jabbar', value: 3189 },
    { name: 'Tim Duncan', value: 3020 },
    { name: 'David Robinson', value: 2954 },
  ], 'nba_player_stats.blk'),
  R('nba-stl', 'NBA', 'career steals', 'stl', [
    { name: 'John Stockton', value: 3265 },
    { name: 'Chris Paul', value: 2728 },
    { name: 'Jason Kidd', value: 2684 },
    { name: 'Michael Jordan', value: 2514 },
    { name: 'Gary Payton', value: 2445 },
  ], 'nba_player_stats.stl'),
  R('nba-gp', 'NBA', 'career games played', 'GP', [
    { name: 'Robert Parish', value: 1611 },
    { name: 'Kareem Abdul-Jabbar', value: 1560 },
    { name: 'Vince Carter', value: 1541 },
    { name: 'Dirk Nowitzki', value: 1522 },
    { name: 'Kevin Garnett', value: 1462 },
  ], 'nba_player_stats.games'),
  R('mlb-hits', 'MLB', 'career hits', 'H', [
    { name: 'Pete Rose', value: 4256 },
    { name: 'Ty Cobb', value: 4189 },
    { name: 'Henry Aaron', value: 3771 },
    { name: 'Stan Musial', value: 3630 },
    { name: 'Tris Speaker', value: 3514 },
  ], 'mlb_batting_stats.hits'),
  R('mlb-sb', 'MLB', 'career stolen bases', 'SB', [
    { name: 'Rickey Henderson', value: 1406 },
    { name: 'Lou Brock', value: 938 },
    { name: 'Ty Cobb', value: 897 },
    { name: 'Tim Raines', value: 808 },
    { name: 'Vince Coleman', value: 752 },
  ], 'mlb_batting_stats.sb'),
  R('nhl-gp', 'NHL', 'career games played', 'GP', [
    { name: 'Patrick Marleau', value: 1779 },
    { name: 'Mark Messier', value: 1756 },
    { name: 'Jaromír Jágr', value: 1733 },
    { name: 'Joe Thornton', value: 1714 },
    { name: 'Chris Chelios', value: 1651 },
  ], 'nhl_player_stats.games (all debuted >= 1971)'),
];

export const RANK_POINTS_PER_SLOT = 200; // 5 of 5 correct = 1000

export function getDailyRankRound(): RankRound {
  const seed = dateSeed(getTodayET());
  return RANK_ROUNDS[seed % RANK_ROUNDS.length];
}

export function getRandomRankRound(): RankRound {
  return RANK_ROUNDS[Math.floor(Math.random() * RANK_ROUNDS.length)];
}

/** Seeded shuffle so the initial scrambled order is stable across re-renders. */
export function scrambledNames(round: RankRound, seed: number): string[] {
  const names = round.items.map((it) => it.name);
  let s = seed >>> 0;
  for (let i = names.length - 1; i > 0; i--) {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const rnd = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    const j = Math.floor(rnd * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  const correct = round.items.map((it) => it.name);
  if (names.every((n, i) => n === correct[i])) names.reverse();
  return names;
}

/** Number of slots placed in the exact correct position (0-5). */
export function scoreRankGuess(order: string[], round: RankRound): number {
  return round.items.reduce((acc, it, i) => acc + (order[i] === it.name ? 1 : 0), 0);
}
