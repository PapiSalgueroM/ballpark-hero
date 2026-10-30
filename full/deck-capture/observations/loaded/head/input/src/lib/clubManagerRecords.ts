/* Round 1343: the highest scoring game on a manager's record.

   The match with the most goals in it, both sides together, as it ended: extra
   time counts, a shootout's kicks never do (the score the book keeps is the
   night's own). A tie keeps the first such game: only strictly more goals
   replaces it, the same `>` the biggest win uses.

   The engine writes it at the whistle through noteHighestScoring, beside the
   biggest win and the worst defeat. A save from before this round has no
   stored record, so highestScoringOf works it out from the head to head book,
   which holds every match the manager played until it is trimmed: the last 300
   by SAVE_CAPS, and six per opponent by leanCareer on every parked slot. When
   the book no longer holds every match, `missed` says how many it lost.

   Stored value: absent means never counted, so it is derived from the book.
   null means counted from here with no game yet, so it is never derived (a
   later handover can write null so the previous manager's games are not pulled
   back in). This round never writes null.

   Types only from the engine, so this file adds no cycle and no weight beyond
   these few functions. The words live in the components. */
import type { CareerState, FormResult, H2HEntry } from '@/lib/clubManager';

export interface ScoringGame {
  opp: string;
  /** Always from the manager's side first, the head to head convention. */
  score: string;
  res: FormResult;
  season: number;
  /** Only on a record the engine wrote at the whistle. */
  club?: string;
  /** The fixture's label, only on a record the engine wrote at the whistle. */
  comp?: string;
  /** How many of the manager's matches the record could not see, when above 0. */
  missed?: number;
}

/** "5-4" is 9. Anything that is not two whole numbers of zero or more is -1, so a damaged row never wins. */
export function goalsIn(score: string): number {
  const m = /^(\d+)-(\d+)$/.exec(typeof score === 'string' ? score : '');
  return m ? Number(m[1]) + Number(m[2]) : -1;
}

const withMissed = (g: ScoringGame, missed: number): ScoringGame => {
  const { missed: _old, ...rest } = g;
  return missed > 0 ? { ...rest, missed } : rest;
};

/** The first row with the most goals, oldest to newest. `missed` is played minus the book when above 0.
 *  null when no row holds a readable score. */
export function highestFromBook(book: readonly H2HEntry[] | undefined, played: number): ScoringGame | null {
  const rows = Array.isArray(book) ? book : [];
  let best: H2HEntry | null = null;
  let bestGoals = -1;
  for (const r of rows) {
    const g = goalsIn(r?.score);
    if (g > bestGoals) { best = r; bestGoals = g; }
  }
  if (!best || bestGoals < 0) return null;
  return withMissed({ opp: best.opp, score: best.score, res: best.res, season: best.season }, Math.max(0, played - rows.length));
}

/** The engine's one call, after the match is in the book and counted. The record before this match is the
 *  stored one, or the book's answer for every row but the last (this match's) over played minus one. */
export function noteHighestScoring(state: CareerState, game: ScoringGame): void {
  const stats = state.careerStats;
  const stored = stats.highestScoring;
  let prev: ScoringGame | null;
  let missed: number;
  if (stored !== undefined) {
    prev = stored;
    missed = Math.max(0, stored?.missed ?? 0);
  } else {
    const before = (state.h2h ?? []).slice(0, -1);
    const playedBefore = Math.max(0, stats.played - 1);
    prev = highestFromBook(before, playedBefore);
    missed = Math.max(0, playedBefore - before.length);
  }
  const best = !prev || goalsIn(game.score) > goalsIn(prev.score) ? game : prev;
  stats.highestScoring = withMissed(best, missed);
}

/** What the panel and the farewell print: the stored record, else the book's answer. Writes nothing. */
export function highestScoringOf(c: Pick<CareerState, 'careerStats' | 'h2h'>): ScoringGame | null {
  const stored = c.careerStats?.highestScoring;
  if (stored !== undefined) return stored;
  return highestFromBook(c.h2h, c.careerStats?.played ?? 0);
}

/** How the score reads. The word comes from the score; res is used only on a level score, where a W or an L
 *  means a single leg tie settled on penalties. A row whose res contradicts its score (an old book can hold a
 *  second leg lost on the night and logged W) gets no word: 'plain'. */
export function scoringOutcome(g: Pick<ScoringGame, 'score' | 'res'>): 'win' | 'loss' | 'draw' | 'pensWon' | 'pensLost' | 'plain' {
  const m = /^(\d+)-(\d+)$/.exec(g.score);
  if (!m) return 'plain';
  const a = Number(m[1]), b = Number(m[2]);
  if (a === b) return g.res === 'W' ? 'pensWon' : g.res === 'L' ? 'pensLost' : 'draw';
  if (a > b) return g.res === 'W' ? 'win' : 'plain';
  return g.res === 'L' ? 'loss' : 'plain';
}

/** A level score with res W or L: the single leg shootout case. */
export function onPenalties(g: Pick<ScoringGame, 'score' | 'res'>): boolean {
  const o = scoringOutcome(g);
  return o === 'pensWon' || o === 'pensLost';
}
