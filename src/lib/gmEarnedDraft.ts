/* Round 1321: the earned draft night, the half every front office shares.

   Round 1222 put the order (gmDraftOrder.ts), the night behind a host
   (gmDraftNight.ts) and lottery night (gmLotteryNight.ts) on main. This file
   is what a board presses on that night: Continue, his pick and his staff's
   picks, each answering where the night now stands, plus the words the
   heading tile and the "?" carry. It knows no sport: a sport hands in its
   host, its labels and its own help blocks (the NBA's are in
   nbaEarnedDraft.ts), so the NHL, MLB and NFL bind this file instead of
   copying the NBA's (CLAUDE.md, one engine many sports).

   EVERY ANSWER SAYS `done` EXACTLY WHEN NO SLOT IS LEFT. A GM with no pick
   who presses Continue runs every slot to the end, so the board must finish
   the summer on `done`, from any of the three presses, never only after his
   own last pick.

   IT DRAWS NOTHING ITSELF: the host's `sign` is the only place a number is
   drawn, one a man, in slot order. */
import { advanceDraftNight, markLotterySeen, staffDraftNight, userDraftPick } from './gmDraftNight';
import type { GmDraftHost, GmDraftNight, RunStep } from './gmDraftNight';
import { nextSlot } from './gmDraftOrder';
import type { EarnedSlot, SavedDraftOrder } from './gmDraftOrder';
import { lotteryHelp, ordinal } from './gmLotteryNight';
import type { LotteryHelpBlock } from './gmLotteryNight';
import { runLottery } from './gmPicks';
import type { GmLotteryRules } from './gmPicks';
import type { GmDraftOrderRules } from '@/data/gmDraftOrder/rules';

/* What a sport's bind and its tests need from the lift, through this one file, so they never name a lift module. */
export { draftRunReveal, isGmDraftNight, markLotterySeen, openDraftNight } from './gmDraftNight';
export type { DraftRun, GmDraftHost, GmDraftNight, RunStep } from './gmDraftNight';
export { buildDraftOrder, draftRulesFor, draftSeasonKey, draftSlots, nextSlot, ownSlots, slotsLeftFor } from './gmDraftOrder';
export type { DraftClubRow, DraftSeason, EarnedSlot, SavedDraftOrder } from './gmDraftOrder';
export { lotteryNight, lotteryNightRule, ordinal } from './gmLotteryNight';
export type { LotteryHelpBlock, LotteryNightView } from './gmLotteryNight';
export type { GmDraftOrderRules } from '@/data/gmDraftOrder/rules';
export { movePicks, newLedger, pickKey } from './gmPicks';
export type { GmLotteryRules } from './gmPicks';

/** Where the night stands after a press. */
export interface EarnedDraftStep<P> {
  night: GmDraftNight;
  /** The class with the men just taken gone. */
  left: P[];
  /** Every pick made by this press, his own included, with true pick numbers. */
  steps: RunStep[];
  /** His slot, when the night stopped for him. */
  onClock: EarnedSlot | null;
  /** No slot is left: the draft is over and the board runs the summer. */
  done: boolean;
}

const stepOf = <P>(run: { night: GmDraftNight; left: P[]; steps: RunStep[]; onClock: EarnedSlot | null; done: boolean }, before: RunStep[] = []): EarnedDraftStep<P> => ({
  night: run.night, left: run.left, steps: [...before, ...run.steps], onClock: run.onClock, done: run.done,
});

/** "Continue to the draft": the lottery is watched, and every club ahead of him picks, to his next slot or the end. */
export function earnedContinue<L, P>(host: GmDraftHost<L, P>, league: L, night: GmDraftNight, me: string, left: P[]): EarnedDraftStep<P> {
  return stepOf(advanceDraftNight(host, league, markLotterySeen(night), me, left));
}

/** His pick, then every club up to his next slot or the end. Null, with nothing changed, unless his slot is on the
    clock, the man is still in the class and the marker is there (gmDraftNight's userDraftPick). */
export function earnedPick<L, P>(
  host: GmDraftHost<L, P>, league: L, night: GmDraftNight, me: string, left: P[], prospectId: string,
): (EarnedDraftStep<P> & { slot: EarnedSlot }) | null {
  const pick = userDraftPick(host, league, markLotterySeen(night), me, left, prospectId);
  if (!pick) return null;
  return { ...stepOf(advanceDraftNight(host, league, pick.night, me, pick.left), [pick.step]), slot: pick.slot };
}

/** "Let your staff make your picks": every slot of his left by the rivals' rule on his own read and need, and the
    draft to its end. The one way forward when his slot is on the clock and his pick cannot be made. */
export function earnedByStaff<L, P>(host: GmDraftHost<L, P>, league: L, night: GmDraftNight, me: string, left: P[]): EarnedDraftStep<P> {
  return stepOf(staffDraftNight(host, league, markLotterySeen(night), me, left));
}

/* ---------------------------------------------------------------------- */
/* The words                                                               */
/* ---------------------------------------------------------------------- */

const ROUND_WORDS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];
const roundWord = (round: number): string => ROUND_WORDS[round - 1] ?? `round ${round} pick`;
/** A club's possessive: the Nuggets', the Jazz's. */
const whose = (label: string): string => (label.endsWith('s') ? `${label}'` : `${label}'s`);
const list = (items: string[]): string => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

/** The heading tile's lines AFTER the lottery, read off the night's slots. `labelOf` answers a club as it sits in a
    sentence ("the Nuggets"); nothing here assumes how wide a tile is. */
export function earnedDraftHeading(night: GmDraftNight, me: string, labelOf: (club: string) => string): string[] {
  const lines: string[] = [];
  const mine = night.slots.filter(s => s.holder === me);
  lines.push(mine.length ? `You pick ${list(mine.map(s => ordinal(s.overall)))}.` : 'You hold no pick tonight.');
  for (const s of night.slots) {
    if (s.kind !== 'std') continue;
    if (s.orig === me && s.holder !== me) lines.push(`Your club's own ${roundWord(s.round)}, ${ordinal(s.overall)}, is ${whose(labelOf(s.holder))} tonight.`);
    else if (s.holder === me && s.orig !== me) lines.push(`You hold ${whose(labelOf(s.orig))} ${roundWord(s.round)}, ${ordinal(s.overall)}.`);
  }
  for (const s of mine) {
    if (s.origUnknown) lines.push(`Your ${ordinal(s.overall)} came from a save that never wrote down whose pick it first was, so its place is a guess.`);
  }
  const next = nextSlot(night.slots, night.made);
  if (next && next.holder === me) lines.push(`You are on the clock at ${next.overall}.`);
  else if (!next) lines.push('Every pick of the draft is in.');
  return lines;
}

const tenth = (n: number): number => Math.round(n * 10) / 10;

/** Where his club's own first could land and where it did, from the saved field and draws: computed, never typed.
    Null when no lottery was drawn or his club was not in it. */
export function lotteryRangeLine(order: SavedDraftOrder, me: string, lottery: GmLotteryRules | null): string | null {
  const field = order.lottery?.field ?? [];
  const seed = field.find(f => f.club === me)?.seed;
  const landed = order.first.indexOf(me) + 1;
  if (!order.lottery || seed === undefined || landed < 1) return null;
  const draws = order.lottery.wins.length;
  const climb = lottery && lottery.table === order.lottery.table ? lottery.maxClimb : null;
  const lo = climb === null ? 1 : Math.max(1, seed - climb);
  const hi = Math.min(field.length, seed + draws);
  return `Your club's own pick was seeded ${ordinal(seed)}: it could land anywhere from ${ordinal(lo)} to ${ordinal(hi)}, and it landed ${ordinal(landed)}.`;
}

/** The chances at the first pick, worst record first, from the table the night was drawn on. Null when the night
    was not drawn on the table handed in. */
export function lotteryChancesLine(order: SavedDraftOrder, lottery: GmLotteryRules | null): string | null {
  if (!order.lottery || !lottery || lottery.table !== order.lottery.table || lottery.odds.length !== order.lottery.field.length) return null;
  const total = lottery.odds.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  return `By the table, the chances at the first pick, worst record first: ${lottery.odds.map(o => `${tenth((o / total) * 100)}%`).join(', ')}.`;
}

/* ---------------------------------------------------------------------- */
/* The chances before the draw (Round 1540)                                */
/* ---------------------------------------------------------------------- */

/** The most ordered runs of winners lotteryOdds walks. A table past it answers null and its line is left out:
    fourteen clubs and four draws is 24,024 runs, sixteen and two is 240, eighteen and six would be over thirteen
    million. */
export const LOTTERY_ODDS_BUDGET = 100_000;

/** Every lottery club's chance at each place, from the field the night was drawn on. */
export interface LotteryOdds {
  draws: number;
  /** In seed order. `slot[k]` is the chance the club's own first lands at pick k + 1. */
  clubs: { club: string; seed: number; slot: number[] }[];
}

/** The exact chance of every club's own first landing at every place, BY THE LIFT'S OWN DRAW: every ordered run of
    winners is weighted by the product of each winner's share of the clubs not yet drawn, and its order comes from
    runLottery itself, fed a scripted stream that lands each draw on the intended club. No copy of the placement
    rule (the cap on a climb included) and no random number. Null when the night was not drawn on this table, when
    a scripted run drew a club it did not mean, or past LOTTERY_ODDS_BUDGET. */
export function lotteryOdds(order: SavedDraftOrder, lottery: GmLotteryRules | null): LotteryOdds | null {
  if (!order.lottery || !lottery || lottery.table !== order.lottery.table || lottery.odds.length !== order.lottery.field.length) return null;
  const field = order.lottery.field;
  const pool = field.map(f => f.club);
  const pct = field.map(f => (f.pct > 0 ? f.pct : 0));
  const live = pct.map((p, i) => (p > 0 ? i : -1)).filter(i => i >= 0);
  const draws = Math.min(lottery.draws, live.length);
  let runs = 1;
  for (let d = 0; d < draws; d += 1) runs *= live.length - d;
  if (draws < 1 || runs > LOTTERY_ODDS_BUDGET) return null;
  const at = new Map(pool.map((club, i) => [club, i]));
  const slot = pool.map(() => pool.map(() => 0));
  const rules: GmLotteryRules = { ...lottery, odds: pct };
  const taken = pool.map(() => false);
  const seq: number[] = [];
  /* answers[d] is what the stream hands draw d + 1: the undrawn weight before the intended club plus half its own,
     over the undrawn total, so runLottery's walk over the undrawn clubs in pool order stops on that club. */
  const answers: number[] = [];
  let ok = true;
  const walk = (chance: number): void => {
    if (!ok) return;
    if (seq.length === draws) {
      let k = 0;
      const run = runLottery(pool, rules, () => answers[k++] ?? 0);
      if (run.wins.length !== draws || run.wins.some((w, d) => w.club !== pool[seq[d]])) { ok = false; return; }
      run.order.forEach((club, place) => { slot[at.get(club)!][place] += chance; });
      return;
    }
    let rest = 0;
    for (const i of live) if (!taken[i]) rest += pct[i];
    let before = 0;
    for (const i of live) {
      if (taken[i]) continue;
      taken[i] = true;
      seq.push(i);
      answers.push((before + pct[i] / 2) / rest);
      walk(chance * (pct[i] / rest));
      answers.pop();
      seq.pop();
      taken[i] = false;
      before += pct[i];
    }
  };
  walk(1);
  if (!ok) return null;
  return { draws, clubs: field.map((f, i) => ({ club: f.club, seed: f.seed, slot: slot[i] })) };
}

const NUMBER_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const percent = (p: number): string => `${(Math.round(p * 1000) / 10).toFixed(1)}%`;

/** One club's figures: the chance at the first pick, at a pick the draws hand out, and the latest place it can land. */
function chanceFigures(odds: LotteryOdds, club: string): { seed: number; first: string; top: string | null; latest: number } | null {
  const row = odds.clubs.find(c => c.club === club);
  if (!row) return null;
  const top = odds.draws > 1 && odds.draws <= NUMBER_WORDS.length
    ? `${percent(row.slot.slice(0, odds.draws).reduce((a, b) => a + b, 0))} at a top ${NUMBER_WORDS[odds.draws - 1]} pick`
    : null;
  let latest = 0;
  row.slot.forEach((p, k) => { if (p > 1e-12) latest = k + 1; });
  return { seed: row.seed, first: percent(row.slot[0] ?? 0), top, latest };
}

/** The heading's lines BEFORE the draw: where his club goes in and its chances, who uses his own first if he traded
    it, and the chances of each lottery first he holds from another club, in seed order. Read off the field, the
    table and who holds whose first (each slot's round, kind, orig and holder), never off where a slot landed, so
    the lines cannot give the draw away. Empty when no lottery was drawn or the chances cannot be worked out. */
export function lotteryChancesBefore(
  order: SavedDraftOrder, slots: EarnedSlot[], me: string, lottery: GmLotteryRules | null, labelOf: (club: string) => string,
): string[] {
  const odds = lotteryOdds(order, lottery);
  if (!odds || !order.lottery) return [];
  const field = order.lottery.field;
  const firstOf = (orig: string) => slots.find(s => s.round === 1 && s.kind === 'std' && s.orig === orig);
  const lines: string[] = [];
  const mine = chanceFigures(odds, me);
  if (mine) {
    const top = mine.top ? ` and ${mine.top}` : '';
    lines.push(`Your club goes in seeded ${ordinal(mine.seed)} of ${field.length}. By the table it has a ${mine.first} chance at the first pick${top}, and it picks no later than ${ordinal(mine.latest)}.`);
    const own = firstOf(me);
    if (own && own.holder !== me) lines.push(`That pick is ${whose(labelOf(own.holder))} tonight, wherever it lands.`);
  } else {
    lines.push('Your club made the playoffs, so its own first is not in the lottery.');
  }
  for (const f of field) {
    if (f.club === me || firstOf(f.club)?.holder !== me) continue;
    const held = chanceFigures(odds, f.club);
    if (!held) continue;
    const top = held.top ? `, ${held.top}` : '';
    lines.push(`You also hold ${whose(labelOf(f.club))} first: seeded ${ordinal(held.seed)}, ${held.first} at the first pick${top}, no later than ${ordinal(held.latest)}.`);
  }
  return lines;
}

/** What sits behind the heading's "?": the lottery's own blocks (gmLotteryNight's lotteryHelp), the chances line,
    then the blocks the sport hands in, in its own words. */
export function earnedDraftHelp(night: GmDraftNight, rules: GmDraftOrderRules | null, lottery: GmLotteryRules | null, own: LotteryHelpBlock[]): LotteryHelpBlock[] {
  const blocks = lotteryHelp(night.order, rules, lottery).map(b => ({ heading: b.heading, lines: [...b.lines] }));
  const chances = lotteryChancesLine(night.order, lottery);
  if (chances) blocks.push({ heading: 'The chances', lines: [chances] });
  return [...blocks, ...own.filter(b => b.lines.length > 0).map(b => ({ heading: b.heading, lines: [...b.lines] }))];
}
