/**
 * Round 681: the choice dailies on the knowledge line, one engine for all of
 * them. docs/design/POINTS-ECONOMY-V2.md sections 7.1 and 7.2.
 *
 * A choice daily is fixed items with fixed options: Champ or Not's ten true
 * or false claims, Who'd They Beat's ten and Ball IQ's twelve four option
 * questions, Face Off's ten pairs, and the nine Higher or Lower dailies' ten
 * close calls. Each game deals its day its own way and hands the deal here as
 * a ChoiceBoard: for every item, the option keys in screen order and which
 * one is right. Everything after that is shared:
 *
 *   choiceMoves  the board as the naive policies play it
 *                (src/lib/naivePolicies.ts): the options in screen order,
 *                the answer revealed after every pick (so counter has
 *                something to count), and on a Higher or Lower day the shown
 *                value against its pool's median (medianCall)
 *   dealDaily    the day's board with its line: every naive policy the family
 *                table files for the game (src/data/pointsFamilies.ts) walked
 *                exactly on the day's own key, the oracle's perfect, and the
 *                line lineFor sets from them. A deal with no room above its
 *                line is never handed out; the game's next redraw is
 *   pointsFor    the day's points, which the result card shows and the
 *                recorder sends
 *
 * Every item's answer is drawn on its own, never balanced, so neither a
 * constant answer nor counting what has come up can learn anything, and the
 * line set on the day's own key holds the top listed option, a constant
 * answer and counting to exactly 0. scripts/simKnowledgeLine.mjs section 2
 * plays every daily of 2026 and 2027 through these moves and holds all of it.
 *
 * Pure: no clock, no storage, no Math.random.
 */
import { expectedResult, hasRoom, pointsAnswer, type PointsAnswer } from '@/lib/knowledgeLine';
import { measureBoard, type Moves } from '@/lib/naivePolicies';
import { higherLowerStep } from '@/lib/higherLowerScore';
import { pointsRuleFor } from '@/data/pointsFamilies';

/** One item as the screen lists it. */
export interface ChoiceItem {
  /** The option keys in screen order: what counter counts ('true', '0', 'higher'). */
  readonly keys: readonly string[];
  /** The index of the right option. */
  readonly answer: number;
  /**
   * A Higher or Lower close call: the value on screen measured from the
   * median of the pool it was drawn from, so medianCall, which calls higher
   * under the median, reads its sign.
   */
  readonly shownFromMedian?: number;
}

/**
 * How a day is scored: 'right' counts right answers; 'streak' is the Higher
 * or Lower score, 10 a right answer and 5 more for every round of the run it
 * extends (src/lib/higherLowerScore.ts).
 */
export type ChoiceScoring = 'right' | 'streak';

export interface ChoiceBoard {
  readonly items: readonly ChoiceItem[];
  readonly scoring: ChoiceScoring;
}

/** A dealt board with its line: what pointsFor and the result card read. */
export interface LinedBoard extends ChoiceBoard {
  /** The salt the line was measured under. */
  readonly salt: string;
  readonly line: number;
  readonly perfect: number;
  /** The line's grid: 1 right answer, or 5 on the streak score, which moves in fives. */
  readonly step: number;
  /** What random averages on this board, in the game's own number. */
  readonly guessing: number;
  /** The unit the card words the result in. */
  readonly unit: 'right' | 'score';
}

interface ChoiceState {
  readonly i: number;
  readonly score: number;
  /** Rounds right in a row, for the streak score. */
  readonly run: number;
}

/** The streak score moves in fives, so its line sits on that grid. */
export const STREAK_STEP = 5;

/** A board as naivePolicies' moves. */
export function choiceMoves(board: ChoiceBoard): Moves<ChoiceState> {
  const items = board.items;
  const moves: Moves<ChoiceState> = {
    start: () => ({ i: 0, score: 0, run: 0 }),
    options: s => items[s.i].keys.map(key => ({ key })),
    play: (s, index) => {
      const right = index === items[s.i].answer;
      if (board.scoring === 'streak') {
        const next = higherLowerStep(s.score, s.run, right);
        return { i: s.i + 1, score: next.score, run: next.run };
      }
      return { i: s.i + 1, score: s.score + (right ? 1 : 0), run: 0 };
    },
    done: s => s.i >= items.length,
    result: s => s.score,
    best: s => items[s.i].answer,
    /* The answers so far depend on how far the day has got and nothing
       else, so a state is its place, its score and its run. */
    revealed: s => items.slice(0, s.i).map(it => it.keys[it.answer]),
    key: s => `${s.i}|${s.score}|${s.run}`,
  };
  if (items.length > 0 && items.every(it => typeof it.shownFromMedian === 'number')) {
    return { ...moves, shownValue: s => items[s.i].shownFromMedian as number, poolMedian: 0 };
  }
  return moves;
}

/** A board lined on the naive policies the family table files for `slug`. */
export function lineBoard(slug: string, board: ChoiceBoard, salt: string): LinedBoard {
  const rule = pointsRuleFor(slug);
  if (!rule) throw new Error(`${slug} is filed in no family in src/data/pointsFamilies.ts`);
  const step = board.scoring === 'streak' ? STREAK_STEP : 1;
  const { outcomes, perfect, line } = measureBoard(choiceMoves(board), rule.naive, salt, step);
  const random = outcomes.find(o => o.policy === 'random');
  return {
    ...board,
    salt,
    line,
    perfect,
    step,
    guessing: random ? expectedResult(random) : NaN,
    unit: board.scoring === 'streak' ? 'score' : 'right',
  };
}

/** One deal a game hands in: the board, the salt it was drawn under, and the game's own deal. */
export interface DealtChoice<T> {
  readonly salt: string;
  readonly board: ChoiceBoard;
  readonly deal: T;
}

/** A day's redraws before the last one is dealt anyway. The fence proves no day of 2026 or 2027 needs more than a few. */
export const MAX_REDRAWS = 20;

/**
 * The day's deal with its line. `dealAt(0)` is the game's own deal for the
 * day; `dealAt(k)` the k-th redraw, taken only when every deal before it left
 * no room above its line (the spec: "a daily never deals one"). Null when the
 * game cannot deal at all.
 */
export function dealDaily<T>(
  slug: string,
  dealAt: (redraw: number) => DealtChoice<T> | null,
): { deal: T; board: LinedBoard; redraw: number } | null {
  let last: { deal: T; board: LinedBoard; redraw: number } | null = null;
  for (let k = 0; k < MAX_REDRAWS; k++) {
    const dealt = dealAt(k);
    if (!dealt) break;
    const board = lineBoard(slug, dealt.board, dealt.salt);
    last = { deal: dealt.deal, board, redraw: k };
    if (hasRoom(board, board.line)) return last;
  }
  return last;
}

/**
 * The day's points for a result on a board: what the result card shows and
 * the recorder sends. With no board (not dealt yet, or a free run) it is 0.
 */
export function pointsFor(board: LinedBoard | null | undefined, result: number): PointsAnswer {
  if (!board) return pointsAnswer(0, 0, 0, 'right');
  return pointsAnswer(result, board.line, board.perfect, board.unit);
}
