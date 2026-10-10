/* Round 1222: what a lottery reveal shows and when, for any game that has one.

   Two rounds wanted a lottery reveal on the same day: draft night in the four
   US My Careers and lottery night in the front offices. It is one presenter
   (src/components/lottery/LotteryReveal.tsx) and this is the half of it that
   decides, so a harness can hold the pace and the words without drawing
   anything. The same split as draftNight.ts and DraftNightCard.

   THIS FILE KNOWS NO SPORT, NO GM AND NO CAREER. It is handed rows somebody
   else's engine already drew and a table somebody else already sourced. It
   draws nothing, picks nothing and reads no clock.

   THE PACE IS A RULE. A reveal that holds a screen is a loading screen, so
   the whole run of any field, to the END of its last animation, fits inside
   LOTTERY_REVEAL_CEILING_MS with a quarter of it in hand, by construction:
   the step shrinks as the field grows. That is the house number draft night already answers to (5,000 ms,
   scripts/simDraftNight.mjs) and the reason is the same one draftNight.ts
   gives for its own step: a threshold sitting on top of the number it checks
   is a coin toss. */

/** One club's tile. Every number is final from the frame it appears. */
export interface LotteryRevealRow {
  /** The pick this club holds once the lottery is over. */
  slot: number;
  /** The club, as text. Never a badge. */
  label: string;
  /** Where its record put it before the draw, 1 the worst record. */
  seed: number;
  /** Places moved by the draw: seed minus slot. Above zero is up the order. */
  moved: number;
  /** The one club the person watching cares about. */
  mine?: boolean;
}

/** The longest a reveal may take, whatever the field. */
export const LOTTERY_REVEAL_CEILING_MS = 5000;
/** The share of the ceiling a run may use. The rest is headroom. */
export const LOTTERY_REVEAL_USE = 0.75;
/** The first tile waits this long, so the card is on screen before it moves. */
export const LOTTERY_REVEAL_LEAD_S = 0.2;
/** A small field does not rush: the gap between tiles is never longer than this. */
export const LOTTERY_REVEAL_MAX_STEP_S = 0.45;
/** How long one tile takes to turn, and how long the closing line takes to
    arrive. The presenter's CSS reads these two, so the pace below is the
    screen's own and not a number beside it. */
export const LOTTERY_REVEAL_TURN_S = 0.32;
export const LOTTERY_REVEAL_CLOSE_S = 0.3;

export interface LotteryRevealPace {
  /** Seconds before the first tile turns. */
  start: number;
  /** Seconds between tiles. */
  step: number;
  /** When the closing line STARTS to arrive, one step after the last tile starts, in ms. */
  closingMs: number;
  /** When every animation on the card is over: the last tile has turned and the closing line is in, in ms. */
  totalMs: number;
}

/** The pace of a run of `count` tiles. The step is cut to the hundredth of a
    second BELOW what would fill the allowed time once the last turn and the
    closing line's arrival are counted, so the END of a run can never round
    its way over it. */
export function lotteryRevealPace(count: number): LotteryRevealPace {
  const n = Math.max(1, Math.floor(Number.isFinite(count) ? count : 1));
  const allowed = (LOTTERY_REVEAL_CEILING_MS / 1000) * LOTTERY_REVEAL_USE;
  const tail = Math.max(LOTTERY_REVEAL_TURN_S, LOTTERY_REVEAL_CLOSE_S);
  const fit = Math.floor(((allowed - LOTTERY_REVEAL_LEAD_S - tail) / n) * 100) / 100;
  const step = Math.max(0.01, Math.min(LOTTERY_REVEAL_MAX_STEP_S, fit));
  const closing = LOTTERY_REVEAL_LEAD_S + n * step;
  const end = Math.max(LOTTERY_REVEAL_LEAD_S + (n - 1) * step + LOTTERY_REVEAL_TURN_S, closing + LOTTERY_REVEAL_CLOSE_S);
  return { start: LOTTERY_REVEAL_LEAD_S, step, closingMs: Math.round(closing * 1000), totalMs: Math.round(end * 1000) };
}

/** The rows a card may draw, in the order they were handed in (which is the
    order they turn over). A row with no club, no whole slot or a slot already
    taken is dropped, so a surprise shows a shorter card and never a crash or
    a club in two places. */
export function cleanLotteryRows(rows: readonly LotteryRevealRow[] | null | undefined): LotteryRevealRow[] {
  const out: LotteryRevealRow[] = [];
  const taken = new Set<number>();
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || typeof r !== 'object') continue;
    const label = typeof r.label === 'string' ? r.label.trim() : '';
    if (!label || !Number.isInteger(r.slot) || r.slot < 1 || taken.has(r.slot)) continue;
    taken.add(r.slot);
    const seed = Number.isInteger(r.seed) && r.seed >= 1 ? r.seed : r.slot;
    const moved = Number.isInteger(r.moved) ? r.moved : seed - r.slot;
    out.push({ slot: r.slot, label, seed, moved, ...(r.mine === true ? { mine: true } : {}) });
  }
  return out;
}

/** "Up 3", "Down 1", "Held". About a slot, never about a person. */
export function lotteryMoveWords(moved: number): string {
  if (moved > 0) return `Up ${moved}`;
  if (moved < 0) return `Down ${-moved}`;
  return 'Held';
}

export interface LotteryRuleFacts {
  /** How many clubs are in the lottery. */
  clubs: number;
  /** How many picks the draw decides. */
  drawn: number;
  /** The worst record's chance at the first pick, in percent. */
  worstPct: number;
  /** How many of the worst clubs share that chance. */
  worstShared: number;
}

/** The facts of a lottery straight off its table: one weight a club, worst
    record first, in whatever unit the table uses (percent, combinations). */
export function lotteryFactsFromWeights(weights: readonly number[], drawn: number): LotteryRuleFacts | null {
  const w = (Array.isArray(weights) ? weights : []).filter(x => Number.isFinite(x) && x >= 0);
  const total = w.reduce((a, b) => a + b, 0);
  if (w.length === 0 || total <= 0 || !Number.isInteger(drawn) || drawn < 1) return null;
  let shared = 1;
  while (shared < w.length && w[shared] === w[0]) shared += 1;
  return { clubs: w.length, drawn: Math.min(drawn, w.length), worstPct: Math.round((w[0] / total) * 1000) / 10, worstShared: shared };
}

/** The one line a card prints under its heading, built from the table and
    never typed, so it cannot drift from the draw it describes. */
export function lotteryRuleLine(f: LotteryRuleFacts | null): string {
  if (!f) return '';
  const picks = f.drawn === 1 ? 'the first pick is drawn' : `the top ${f.drawn} picks are drawn`;
  const best = f.worstShared > 1
    ? `The ${f.worstShared} worst records share the best chance at the first pick, ${f.worstPct}% each.`
    : `The worst record has the best chance at the first pick, ${f.worstPct}%.`;
  return `${f.clubs} clubs are in the lottery and ${picks}. ${best}`;
}
