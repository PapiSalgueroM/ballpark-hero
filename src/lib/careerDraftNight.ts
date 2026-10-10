/* Round 1220: draft night in the four US My Careers, as rows to watch.

   The road to the draft ended on one card, although the engine had already
   built the whole order (and the NBA lottery) to find the club that holds the
   pick. This file turns that finished order and the SAVED outcome into the
   few rows a night needs: the picks that come off the board ahead of yours,
   then your name, or the last pick without it.

   IT SHOWS, IT NEVER DRAWS. There is no draw in this file and no clock. The
   order is preDraftOrder(desc, seed), the same pure call preDraftRunDraft
   made, and the witness for the last row is the outcome the save already
   holds. If the two disagree it FAILS CLOSED: null, and the card shows the
   result block it always showed. scripts/simCareerPreDraft.mjs section 13
   holds all of it, and its control `nightdraw` shows a draw here goes red.

   WHY THIS IS NOT src/lib/draftNight.ts (Round 515, the front offices'
   night): those rows are a player name and a scouted grade, and the road
   names no other prospect, ever. A pick ahead of yours is a number and a
   club: there is no field here a name could go in. The conventions are the
   same (rows final from the frame they appear, a bounded run, nothing that
   blocks), and the lottery tile is the one shared presenter
   (src/components/motion/LotteryReveal.tsx).

   A draft is long: MLB in the 2004 era is 1,500 picks. So the board is a
   window, never a ticker: at most eight rows, in every sport and era. */

import { preDraftOrder, preDraftProjection } from './careerPreDraft';
import type { PreDraftDescriptor, PreDraftProjection, PreDraftState } from './careerPreDraft';

/** Picks shown from the top of the draft when no lottery tile has shown them. */
export const CAREER_NIGHT_HEAD = 3;
/** Picks shown right before yours. */
export const CAREER_NIGHT_TAIL = 3;

export type CareerNightRow =
  | { kind: 'pick'; pick: number; round: number; team: string }
  | { kind: 'gap'; from: number; to: number; rounds: [number, number] }
  | { kind: 'you'; pick: number; round: number; pickInRound: number; team: string }
  | { kind: 'unpicked'; lastPick: number; team: string };

/** One drawn pick of the lottery. seed 1 is the worst record. */
export interface CareerNightLotteryRow { slot: number; team: string; seed: number }

export interface CareerNight {
  projection: PreDraftProjection;
  /** The drawn picks, the last one first so the first pick turns over last.
   *  Empty where the sport and era have no lottery in this game. */
  lottery: CareerNightLotteryRow[];
  /** The board, top to bottom. The last row is `you` or `unpicked`. */
  board: CareerNightRow[];
}

export function buildCareerDraftNight(desc: PreDraftDescriptor, s: PreDraftState): CareerNight | null {
  const d = s.draft;
  if (s.phase !== 'done' || !d) return null;
  const o = preDraftOrder(desc, s.seed);
  const teams = desc.teamIds();
  const total = o.order.length;
  const roundOf = (pick: number) => Math.ceil(pick / teams.length);
  /* Fail closed: a saved club that is not the holder of the saved pick in
     today's order means the order formula moved under an old save, and a
     night built from it would show a club he did not join. */
  if (d.pick === null) {
    if (!teams.includes(d.team)) return null;
  } else if (!Number.isInteger(d.pick) || d.pick < 1 || d.pick > total
    || o.order[d.pick - 1] !== d.team
    || d.round !== roundOf(d.pick) || d.pickInRound !== d.pick - (roundOf(d.pick) - 1) * teams.length) return null;

  const lottery: CareerNightLotteryRow[] = [];
  const drawn = desc.lottery ? o.lotteryWinners.length : 0;
  for (let slot = drawn; slot >= 1; slot -= 1) {
    const team = o.lotteryWinners[slot - 1];
    lottery.push({ slot, team, seed: o.standings.indexOf(team) + 1 });
  }

  const board: CareerNightRow[] = [];
  const pickRow = (pick: number): CareerNightRow => ({ kind: 'pick', pick, round: roundOf(pick), team: o.order[pick - 1] });
  /* The picks called before the row that ends the night. The lottery tile
     has already shown the drawn picks, so the board starts after them and
     never shows one pick twice. */
  const start = drawn + 1;
  const end = d.pick === null ? total : d.pick - 1;
  const head = drawn ? 0 : CAREER_NIGHT_HEAD;
  const tail = d.pick === null ? 1 : CAREER_NIGHT_TAIL;
  const span = end - start + 1;
  /* Few enough to show them all: a gap of one pick is just that pick. */
  if (span <= head + tail + 1) {
    for (let pick = start; pick <= end; pick += 1) board.push(pickRow(pick));
  } else {
    for (let pick = start; pick < start + head; pick += 1) board.push(pickRow(pick));
    const from = start + head, to = end - tail;
    board.push({ kind: 'gap', from, to, rounds: [roundOf(from), roundOf(to)] });
    for (let pick = end - tail + 1; pick <= end; pick += 1) board.push(pickRow(pick));
  }
  board.push(d.pick === null
    ? { kind: 'unpicked', lastPick: total, team: d.team }
    : { kind: 'you', pick: d.pick, round: d.round as number, pickInRound: d.pickInRound as number, team: d.team });
  return { projection: preDraftProjection(desc, s), lottery, board };
}

/* The words, built from the numbers so a line can never say something the
   rows do not show. */

/** What the scouts say before the draft ("have") and what the night's
 *  heading recalls ("had"). */
export function careerNightProjectionLine(p: PreDraftProjection, tense: 'have' | 'had'): string {
  if (p.lo > p.total) return `The scouts ${tense} you outside the ${p.total} picks of this draft.`;
  if (p.hi > p.total) return `The scouts ${tense} you between pick ${p.lo} and undrafted. This draft has ${p.total} picks.`;
  if (p.lo === p.hi) return `The scouts ${tense} you at pick ${p.lo} of ${p.total}.`;
  return `The scouts ${tense} you between pick ${p.lo} and pick ${p.hi} of ${p.total}.`;
}

export function careerNightGapLine(row: Extract<CareerNightRow, { kind: 'gap' }>): string {
  const picks = `Picks ${row.from} to ${row.to} come off the board`;
  return row.rounds[0] === row.rounds[1] ? `${picks}.` : `${picks}, round ${row.rounds[0]} into round ${row.rounds[1]}.`;
}

/** The last row, as one sentence: what a screen reader hears when it lands. */
export function careerNightResultLine(row: CareerNightRow, teamLabel: (id: string) => string): string {
  if (row.kind === 'you') return `Round ${row.round}, pick ${row.pickInRound}, ${row.pick} overall. ${teamLabel(row.team)} take you.`;
  if (row.kind === 'unpicked') return `Pick ${row.lastPick} is the last one, and your name was not called. Your first club: ${teamLabel(row.team)}.`;
  return '';
}
