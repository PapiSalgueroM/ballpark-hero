import { shuffledRange } from '@/lib/dateUtils';
import { COMPETITIONS, fetchCompetitionRows, type ChampRow, type CompetitionDef } from '@/lib/champOrNot';

/**
 * Silverware Sort (Round 250): five teams from one competition, stack
 * them in order by how many titles they have won. Every count is derived
 * by counting rows in the audited champion tables (Rounds 232 to 246),
 * the same rows Champ or Not and the Record Books read, so the game can
 * never disagree with the rest of the site about a count.
 *
 * Two honesty rules make the ordering objective:
 *   1. Counts follow the site convention: a title is counted under the
 *      name the club wore at the time, so South Melbourne and Sydney are
 *      separate entries, same as the Record Books and Name Them All.
 *   2. A board only ever holds teams with pairwise DISTINCT counts, so
 *      there is exactly one right order and ties can never make a
 *      position a coin flip.
 *
 * The WNBA is excluded by measurement, not by opinion: its history has
 * only three distinct count values, which cannot fill a five-slot board.
 * The eligibility rule is data-driven, so if a future season creates a
 * fifth value the competition qualifies on its own; the harness pins the
 * eligible set so that promotion is a deliberate, reviewed change.
 *
 * simSilverwareSort.mjs proves a simulated year of boards honest.
 */

export const BOARD_SIZE = 5;
export const DAILY_BOARDS = 3;
export const ATTEMPTS = 2;

/** how each competition's title is spoken of on the card and reveal */
export const SORT_LABELS: Record<string, { title: string; noun: string }> = {
  sb: { title: 'Super Bowl wins', noun: 'Super Bowls' },
  nba: { title: 'NBA championships', noun: 'championships' },
  ws: { title: 'World Series titles', noun: 'titles' },
  cup: { title: 'Stanley Cups', noun: 'Cups' },
  wnba: { title: 'WNBA championships', noun: 'championships' },
  cfb: { title: 'college football national titles', noun: 'titles' },
  cbb: { title: "men's NCAA basketball titles", noun: 'titles' },
  epl: { title: 'English top-flight titles', noun: 'titles' },
  afl: { title: 'VFL/AFL premierships', noun: 'flags' },
  nrl: { title: 'top grade rugby league premierships', noun: 'premierships' },
};

export interface TeamCount {
  team: string;
  count: number;
}

export interface SortBoard {
  compKey: string;
  emoji: string;
  /** e.g. "Super Bowl wins" */
  title: string;
  /** e.g. "Super Bowls", for the reveal lines */
  noun: string;
  /** the answer: five teams with distinct counts, most titles first */
  teams: TeamCount[];
  /** display order of the tray, indices into teams, never the solution order */
  tray: number[];
}

export { COMPETITIONS, fetchCompetitionRows };
export type { ChampRow };

/** rows -> counts per team name, the site's counting convention */
export function aggregateCounts(rows: ChampRow[]): TeamCount[] {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.team, (m.get(r.team) ?? 0) + 1);
  return [...m.entries()].map(([team, count]) => ({ team, count }));
}

/** a competition qualifies when five strictly different counts exist */
export function isEligible(counts: TeamCount[]): boolean {
  return new Set(counts.map(c => c.count)).size >= BOARD_SIZE;
}

/**
 * One board for one competition. Deterministic per label. Greedy walk of
 * a seeded shuffle keeping the first team seen at each count value, so
 * every board has five pairwise-distinct counts and one right order.
 */
export function buildBoard(def: CompetitionDef, counts: TeamCount[], label: string): SortBoard | null {
  if (!isEligible(counts)) return null;
  const picked: TeamCount[] = [];
  const seenValues = new Set<number>();
  for (const i of shuffledRange(counts.length, `${label}:pick`)) {
    const c = counts[i];
    if (seenValues.has(c.count)) continue;
    seenValues.add(c.count);
    picked.push(c);
    if (picked.length === BOARD_SIZE) break;
  }
  if (picked.length < BOARD_SIZE) return null;
  picked.sort((a, b) => b.count - a.count);
  // The tray must never hand the player the solved order. A seeded
  // shuffle almost never does; when it does, rotate one step.
  let tray = shuffledRange(BOARD_SIZE, `${label}:tray`);
  if (tray.every((v, i) => v === i)) tray = [...tray.slice(1), tray[0]];
  const names = SORT_LABELS[def.key] ?? { title: 'titles', noun: 'titles' };
  return {
    compKey: def.key, emoji: def.emoji,
    title: names.title, noun: names.noun,
    teams: picked, tray,
  };
}

/**
 * The day's boards: eligible competitions shuffled, the first
 * DAILY_BOARDS of them, one board each, no competition twice.
 */
export function buildBoards(
  countsByKey: Map<string, TeamCount[]>,
  seedPrefix: string,
  count: number = DAILY_BOARDS,
): SortBoard[] {
  const eligible = COMPETITIONS.filter(c => isEligible(countsByKey.get(c.key) ?? []));
  if (eligible.length === 0) return [];
  const order = shuffledRange(eligible.length, `${seedPrefix}:comps`).map(i => eligible[i]);
  const out: SortBoard[] = [];
  for (let i = 0; i < order.length && out.length < count; i++) {
    const def = order[i];
    const b = buildBoard(def, countsByKey.get(def.key) ?? [], `${seedPrefix}:board${out.length}`);
    if (b) out.push(b);
  }
  return out;
}

/** greens for a submitted order: slot i is right iff it holds team i */
export function judge(slots: (number | null)[]): boolean[] {
  return slots.map((v, i) => v === i);
}
