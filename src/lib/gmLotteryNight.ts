/* Round 1222: lottery night, as rows the one lottery presenter draws.

   Reads a SavedDraftOrder and nothing else: the draw is over by the time
   anything here runs, and a second look reads the same saved object, so no
   card can ever show a night that was not the one drawn. It decides the
   rows, their order and every word; src/components/lottery/LotteryReveal.tsx
   presents them. Clubs and slots only: nobody is quoted and nothing here is
   a person speaking.

   The numbers in the "?" are worked out from the table handed in, never
   typed, so a table that changes cannot leave a stale example behind. */
import type { GmLotteryRules } from './gmPicks';
import type { PlainOrderReason, SavedDraftOrder } from './gmDraftOrder';
import { lotteryFactsFromWeights, lotteryRevealPace, lotteryRuleLine } from './lotteryReveal';
import type { LotteryRevealRow } from './lotteryReveal';
import type { GmDraftOrderRules } from '@/data/gmDraftOrder/rules';

/** 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st, 22nd. */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  const unit = n % 10;
  return `${n}${unit === 1 ? 'st' : unit === 2 ? 'nd' : unit === 3 ? 'rd' : 'th'}`;
}

const places = (n: number) => `${n} ${n === 1 ? 'place' : 'places'}`;

/** Why no drawing was held, in words a card can show. */
export const PLAIN_ORDER_WORDS: Record<Exclude<PlainOrderReason, null>, string> = {
  'no-lottery': 'This league has no lottery. Round one is the standings, worst record first.',
  'thin-rule': 'No lottery was drawn: a rule it needs could not be confirmed twice. Round one is the standings, worst record first.',
  table: 'No lottery was drawn: the table on hand is not the one this rule was read against. Round one is the standings, worst record first.',
  'field-size': 'No lottery was drawn: the playoff field is not the size the table is for. Round one is the standings, worst record first.',
};

/** How many slots a night with no drawing shows from the top of the order. */
export const PLAIN_ORDER_ROWS = 8;

export interface LotteryNightView {
  /** In the order the tiles turn: the last lottery slot first, the first pick last. */
  rows: LotteryRevealRow[];
  headline: string;
  /** His club's slot in round one, or null when it is not in this order. */
  mineSlot: number | null;
  inLottery: boolean;
  /** False when no drawing was held: the card draws the order at once. */
  reveal: boolean;
  totalMs: number;
}

/** Lottery night for `myClub`. `labelOf` turns a club id into the text a tile shows. */
export function lotteryNight(saved: SavedDraftOrder, myClub: string, labelOf: (club: string) => string = c => c): LotteryNightView {
  const at = saved.first.indexOf(myClub);
  const mineSlot = at >= 0 ? at + 1 : null;
  if (!saved.lottery) {
    const shown = saved.first.slice(0, PLAIN_ORDER_ROWS).map((club, i) => ({ club, slot: i + 1 }));
    if (mineSlot !== null && mineSlot > shown.length) shown.push({ club: myClub, slot: mineSlot });
    const rows = shown.map(s => ({ slot: s.slot, label: labelOf(s.club), seed: s.slot, moved: 0, ...(s.club === myClub ? { mine: true as const } : {}) }));
    const why = PLAIN_ORDER_WORDS[saved.plain ?? 'no-lottery'];
    return {
      rows: rows.reverse(), mineSlot, inLottery: false, reveal: false, totalMs: 0,
      headline: mineSlot === null ? why : `${why} Your club's slot is ${ordinal(mineSlot)}.`,
    };
  }
  const seedOf = new Map(saved.lottery.field.map(f => [f.club, f.seed]));
  const rows: LotteryRevealRow[] = [];
  for (let slot = saved.lottery.field.length; slot >= 1; slot -= 1) {
    const club = saved.first[slot - 1];
    const seed = seedOf.get(club) ?? slot;
    rows.push({ slot, label: labelOf(club), seed, moved: seed - slot, ...(club === myClub ? { mine: true as const } : {}) });
  }
  const inLottery = seedOf.has(myClub);
  let headline = '';
  if (mineSlot !== null && inLottery) {
    const moved = (seedOf.get(myClub) ?? mineSlot) - mineSlot;
    if (moved > 0) headline = `Your club lands ${ordinal(mineSlot)}, up ${places(moved)}.`;
    else if (moved < 0) headline = `Your club lands ${ordinal(mineSlot)}, down ${places(-moved)}.`;
    else headline = `Your club stays ${ordinal(mineSlot)}.`;
  } else if (mineSlot !== null) {
    headline = `Your club is not in the lottery. Its round one slot is ${ordinal(mineSlot)}.`;
  }
  return { rows, headline, mineSlot, inLottery, reveal: true, totalMs: lotteryRevealPace(rows.length).totalMs };
}

export interface LotteryHelpBlock { heading: string; lines: string[] }

/** The worked example, every number computed from the table. */
export function lotteryExample(lottery: GmLotteryRules): string[] {
  const facts = lotteryFactsFromWeights(lottery.odds, lottery.draws);
  if (!facts) return [];
  const total = lottery.odds.reduce((a, b) => a + b, 0);
  const lastPct = Math.round((lottery.odds[lottery.odds.length - 1] / total) * 1000) / 10;
  const lines = [`The worst record's chance at the first pick is ${facts.worstPct}%. The best record in the lottery gets ${lastPct}%.`];
  if (lottery.maxClimb === null) {
    lines.push(`${facts.drawn === 1 ? 'One pick is' : `${facts.drawn} picks are`} drawn, so the worst record can be passed ${facts.drawn === 1 ? 'once' : `${facts.drawn} times`} at most and picks no lower than ${ordinal(facts.drawn + 1)}.`);
  } else {
    lines.push(`No club climbs more than ${places(lottery.maxClimb)}, so only the ${lottery.maxClimb + 1} worst records can win the first pick.`);
  }
  return lines;
}

/** What sits behind the "?": the league's rule, what is this game's own, and
    a worked example. `rules` is the rule set this build knows for the saved
    id, or null: an order drawn under a rule this build no longer carries
    degrades to the saved table's own words and never to another rule's. */
export function lotteryHelp(saved: SavedDraftOrder, rules: GmDraftOrderRules | null, lottery: GmLotteryRules | null): LotteryHelpBlock[] {
  const known = rules !== null && rules.id === saved.rulesId ? rules : null;
  const sameTable = lottery !== null && saved.lottery !== null && lottery.table === saved.lottery.table ? lottery : null;
  const blocks: LotteryHelpBlock[] = [];
  if (!saved.lottery) {
    blocks.push({ heading: 'Why there was no drawing', lines: [PLAIN_ORDER_WORDS[saved.plain ?? 'no-lottery']] });
  }
  if (!known) {
    if (saved.lottery) {
      const line = lotteryRuleLine(lotteryFactsFromWeights(saved.lottery.field.map(f => f.pct), Math.max(1, saved.lottery.wins.length)));
      blocks.push({
        heading: 'How this night was drawn',
        lines: [`It was drawn under an earlier rule of this game (${saved.rulesId}), on the table of ${saved.lottery.table}.`, line].filter(Boolean),
      });
    }
    return blocks;
  }
  const league = [...known.leagueSays];
  if (sameTable) league.unshift(lotteryRuleLine(lotteryFactsFromWeights(sameTable.odds, sameTable.draws)));
  league.push(known.real.to === null
    ? `The league has used this rule since its ${known.real.from} draft.`
    : `The league used this rule from its ${known.real.from} draft to its ${known.real.to} draft.`);
  blocks.push({ heading: "The league's rule", lines: league.filter(Boolean) });
  blocks.push({ heading: "This game's own", lines: [...known.gameSays, ...known.partial] });
  if (sameTable) blocks.push({ heading: 'A worked example', lines: lotteryExample(sameTable) });
  return blocks;
}
