/**
 * Round 681: the Higher or Lower daily, one deal for all nine sports (AFL,
 * college football, F1, golf, hockey, MLB, NBA, NFL, tennis).
 * docs/design/POINTS-ECONOMY-V2.md section 7.2, "the close call deal".
 *
 * WHY THE DEAL CHANGED. The daily used to pair athletes straight off a
 * shuffle, so a pair could be 42,000 points against 18,000, and once the
 * first athlete's number is on screen a player who knows nobody can call a
 * big number "lower" and a small one "higher" and be right most days. The
 * knowledge line would then have to sit above that player, and there would
 * be little room left for knowing the athletes.
 *
 * THE CLOSE CALL. Each of the ten rounds shows one athlete's number (the left
 * card) and asks about a second (the right card):
 *   - a seeded coin decides whether the second athlete is higher or lower;
 *   - the second athlete then comes from the CLOSE_CALL_BAND nearest distinct
 *     values on that side, so the two numbers are near each other;
 *   - an athlete is only ever shown when the band has somebody on BOTH sides,
 *     so the coin can always be honoured and the top or bottom number of a
 *     pool never gives the answer away.
 * So calling "higher" under the pool's median and "lower" over it (medianCall)
 * is a coin, and so is every other way of playing without knowing the
 * athletes. The two athletes of a pair never share a number, so the daily has
 * no ties, and nobody appears twice in a day. The NFL deals each round from
 * one of its stat categories, in an order drawn for the day.
 *
 * The board goes to src/lib/choiceDaily.ts, which lines it on the day's own
 * key and redraws a day with no room above its line. The score is the one
 * every sport already shares (src/lib/higherLowerScore.ts). The unlimited
 * mode keeps its own pairs; only the daily is ranked.
 *
 * Pure: no clock, no storage, no Math.random.
 */
import { dailyDraw, shuffledRange } from '@/lib/dateUtils';
import { HIGHER_LOWER_DAILY_ROUNDS } from '@/lib/higherLowerScore';
import { dealDaily, type ChoiceBoard, type LinedBoard } from '@/lib/choiceDaily';

/** How many distinct values on each side of the shown one the second athlete may come from. */
export const CLOSE_CALL_BAND = 3;

/**
 * The option keys in screen order. The left card is the shown athlete, so
 * tapping it says the second athlete is lower; the right card says higher.
 */
export const CLOSE_CALL_KEYS = ['lower', 'higher'] as const;

/** One sport's pools and how to read an athlete. */
export interface CloseCallSource<T> {
  /** One pool for most sports; the NFL's stat categories, each its own pool. */
  readonly pools: readonly (readonly T[])[];
  readonly valueOf: (athlete: T, pool: number) => number;
  readonly nameOf: (athlete: T) => string;
}

export interface CloseCall<T> {
  /** The athlete whose number is on screen, listed first. */
  readonly shown: T;
  /** The athlete to call, listed second. */
  readonly hidden: T;
  /** The pool the pair came from. */
  readonly pool: number;
}

function median(values: readonly number[]): number {
  const s = [...values].sort((a, b) => a - b);
  if (s.length === 0) return NaN;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * The day's ten close calls under one salt, or null when a pool has no
 * athlete with the band filled on both sides.
 */
export function dealCloseCalls<T>(
  src: CloseCallSource<T>,
  salt: string,
  rounds: number = HIGHER_LOWER_DAILY_ROUNDS,
): CloseCall<T>[] | null {
  if (src.pools.length === 0) return null;
  const order = shuffledRange(src.pools.length, `${salt}:pools`);
  const used = new Set<string>();
  const out: CloseCall<T>[] = [];
  for (let r = 0; r < rounds; r++) {
    const p = order[r % order.length];
    const valueOf = (a: T) => src.valueOf(a, p);
    const pool = src.pools[p].filter(a => Number.isFinite(valueOf(a)) && !used.has(src.nameOf(a)));
    const distinct = [...new Set(pool.map(valueOf))].sort((a, b) => a - b);
    const rank = new Map(distinct.map((v, i) => [v, i]));
    const last = distinct.length - 1;
    const eligible = pool.filter(a => {
      const at = rank.get(valueOf(a)) ?? -1;
      return at > 0 && at < last;
    });
    if (eligible.length === 0) return null;
    const shown = eligible[dailyDraw(eligible.length, `${salt}:r${r}:shown`)];
    const at = rank.get(valueOf(shown)) as number;
    const aboveValues = new Set(distinct.slice(at + 1, at + 1 + CLOSE_CALL_BAND));
    const belowValues = new Set(distinct.slice(Math.max(0, at - CLOSE_CALL_BAND), at));
    const above = pool.filter(a => aboveValues.has(valueOf(a)));
    const below = pool.filter(a => belowValues.has(valueOf(a)));
    const higher = dailyDraw(2, `${salt}:r${r}:side`) === 0;
    const partners = higher ? above : below;
    const hidden = partners[dailyDraw(partners.length, `${salt}:r${r}:partner`)];
    used.add(src.nameOf(shown));
    used.add(src.nameOf(hidden));
    out.push({ shown, hidden, pool: p });
  }
  return out;
}

/** The close calls as a choice board, the shown number measured from its pool's median. */
export function closeCallBoard<T>(src: CloseCallSource<T>, calls: readonly CloseCall<T>[]): ChoiceBoard {
  const medians = src.pools.map((pool, p) => median(pool.map(a => src.valueOf(a, p)).filter(Number.isFinite)));
  return {
    scoring: 'streak',
    items: calls.map(c => {
      const shown = src.valueOf(c.shown, c.pool);
      return {
        keys: CLOSE_CALL_KEYS,
        answer: src.valueOf(c.hidden, c.pool) > shown ? 1 : 0,
        shownFromMedian: shown - medians[c.pool],
      };
    }),
  };
}

/** The salt of a day's deal and of its redraws. */
export function closeCallSalt(slug: string, day: string, redraw: number): string {
  return redraw === 0 ? `${slug}:${day}` : `${slug}:${day}#${redraw}`;
}

/** A sport's daily: its ten close calls and the board lined for the day. Null only when a pool cannot deal. */
export function higherLowerDaily<T>(
  slug: string,
  src: CloseCallSource<T>,
  day: string,
): { calls: CloseCall<T>[]; board: LinedBoard } | null {
  const dealt = dealDaily(slug, k => {
    const salt = closeCallSalt(slug, day, k);
    const calls = dealCloseCalls(src, salt);
    return calls ? { salt, deal: calls, board: closeCallBoard(src, calls) } : null;
  });
  return dealt ? { calls: dealt.deal, board: dealt.board } : null;
}
