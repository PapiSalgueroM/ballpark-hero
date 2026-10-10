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

/** Why no drawing was held, in words a card can show. Only the reason: how
    the order then runs is PLAIN_ORDER_LINE, said once and in one place. */
export const PLAIN_ORDER_WORDS: Record<Exclude<PlainOrderReason, null>, string> = {
  'no-lottery': 'This league has no lottery.',
  'thin-rule': 'No lottery was drawn: one of its rules could not be confirmed from two sources.',
  table: 'No lottery was drawn: the odds table in this game is not the one that rule was written for.',
  'field-size': 'No lottery was drawn: the playoff field is not the size the odds table is for.',
};

/** How round one runs when nothing is drawn. It is what buildDraftOrder does
    for every rule set: the clubs that missed come first whatever a playoff
    club's record, and it says nothing about the order AMONG playoff clubs,
    which is the league's own (by record, or by how far each went). */
export const PLAIN_ORDER_LINE = 'The clubs that missed the playoffs pick first, worst record first. The playoff clubs pick after them.';

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
  /** When the reveal is over on screen, in ms; 0 when there is none. */
  totalMs: number;
}

/** Lottery night for `myClub`. `labelOf` turns a club id into the text a tile shows.

    EVERY WORD HERE IS ABOUT THE CLUB'S OWN PICK, the one its record earned,
    because a saved order knows first owners and nothing about who holds a
    pick tonight. "Your club's own pick lands 3rd" stays true when he has
    traded that pick away; a bind that wants to say who USES it reads the
    night's slots, which this function is never handed. */
export function lotteryNight(saved: SavedDraftOrder, myClub: string, labelOf: (club: string) => string = c => c): LotteryNightView {
  const at = saved.first.indexOf(myClub);
  const mineSlot = at >= 0 ? at + 1 : null;
  if (!saved.lottery) {
    const shown = saved.first.slice(0, PLAIN_ORDER_ROWS).map((club, i) => ({ club, slot: i + 1 }));
    if (mineSlot !== null && mineSlot > shown.length) shown.push({ club: myClub, slot: mineSlot });
    const rows = shown.map(s => ({ slot: s.slot, label: labelOf(s.club), seed: s.slot, moved: 0, ...(s.club === myClub ? { mine: true as const } : {}) }));
    return {
      rows: rows.reverse(), mineSlot, inLottery: false, reveal: false, totalMs: 0,
      headline: mineSlot === null ? '' : `Your club's own pick is ${ordinal(mineSlot)} in round one.`,
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
    if (moved > 0) headline = `Your club's own pick lands ${ordinal(mineSlot)}, up ${places(moved)}.`;
    else if (moved < 0) headline = `Your club's own pick lands ${ordinal(mineSlot)}, down ${places(-moved)}.`;
    else headline = `Your club's own pick stays ${ordinal(mineSlot)}.`;
  } else if (mineSlot !== null) {
    headline = `Your club is not in the lottery. Its own round one pick is ${ordinal(mineSlot)}.`;
  }
  return { rows, headline, mineSlot, inLottery, reveal: true, totalMs: lotteryRevealPace(rows.length).totalMs };
}

const tenth = (n: number) => Math.round(n * 10) / 10;

/** The table this build carries, when it is the one the night was drawn on: same name, same field. */
function tableOf(saved: SavedDraftOrder, lottery: GmLotteryRules | null): GmLotteryRules | null {
  const night = saved.lottery;
  return night !== null && lottery !== null && lottery.table === night.table && lottery.odds.length === night.field.length ? lottery : null;
}

/** The chances THE NIGHT WAS DRAWN ON, off the saved field: the worst record's, the best lottery record's, the
    best of all and how many clubs held it. Level clubs share theirs, so these are not always the table's. */
function nightChances(saved: SavedDraftOrder): { clubs: number; drawn: number; first: number; last: number; best: number; holders: number } | null {
  const field = saved.lottery?.field ?? [];
  const total = field.reduce((sum, f) => sum + f.pct, 0);
  if (field.length === 0 || total <= 0) return null;
  const top = Math.max(...field.map(f => f.pct));
  return {
    clubs: field.length, drawn: Math.max(1, saved.lottery?.wins.length ?? 1),
    first: tenth((field[0].pct / total) * 100), last: tenth((field[field.length - 1].pct / total) * 100),
    best: tenth((top / total) * 100), holders: field.filter(x => Math.abs(x.pct - top) < 1e-9).length,
  };
}

/** The one line under the card's heading, TRUE OF THE NIGHT IT SITS ON.
    The table's line (the words every lottery card of the site prints) says
    four things: how many clubs are in it, how many picks are drawn, the
    worst record's chance and how many clubs share that chance. When all four
    are true of the saved night, that line is printed. When level clubs
    shared their chances at the top (the 3rd and 4th worst records level are
    drawn on 13.3 and 13.2, so three clubs do NOT hold 14 each), or the night
    was drawn on a table this build no longer carries, the line is built from
    the night's own chances. An order nobody drew gets the reason. `lottery`
    is the table on the pick rules in use, or null. */
export function lotteryNightRule(saved: SavedDraftOrder, lottery: GmLotteryRules | null): string {
  if (!saved.lottery) return PLAIN_ORDER_WORDS[saved.plain ?? 'no-lottery'];
  const table = tableOf(saved, lottery);
  const says = table ? lotteryFactsFromWeights(table.odds, table.draws) : null;
  const was = lotteryFactsFromWeights(saved.lottery.field.map(x => x.pct), Math.max(1, saved.lottery.wins.length));
  if (says && was && says.clubs === was.clubs && says.drawn === was.drawn && says.worstPct === was.worstPct && says.worstShared === was.worstShared) {
    return lotteryRuleLine(says);
  }
  const n = nightChances(saved);
  if (!n) return '';
  const picks = n.drawn === 1 ? 'the first pick is drawn' : `the top ${n.drawn} picks are drawn`;
  const best = n.holders > 1
    ? `On this night ${n.holders} clubs shared the best chance at the first pick, ${n.best}% each.`
    : `On this night the best chance at the first pick was ${n.best}%.`;
  return `${n.clubs} clubs are in the lottery and ${picks}. ${best}`;
}

export interface LotteryHelpBlock { heading: string; lines: string[] }

/** The worked example, every number computed from the table. It says "by the
    table" because it is the table's rule and not any one night: a night where
    level clubs shared their chances was drawn on other numbers. */
export function lotteryExample(lottery: GmLotteryRules): string[] {
  const facts = lotteryFactsFromWeights(lottery.odds, lottery.draws);
  if (!facts) return [];
  const total = lottery.odds.reduce((a, b) => a + b, 0);
  const lastPct = Math.round((lottery.odds[lottery.odds.length - 1] / total) * 1000) / 10;
  const lines = [`By the table, the worst record's chance at the first pick is ${facts.worstPct}%. The best record in the lottery gets ${lastPct}%.`];
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
  const sameTable = tableOf(saved, lottery);
  const blocks: LotteryHelpBlock[] = [];
  /* NOTHING HERE REPEATS THE LINE UNDER THE HEADING (lotteryNightRule): the
     card shows that line and this panel at the same time. */
  if (!saved.lottery) blocks.push({ heading: 'How round one is ordered', lines: [PLAIN_ORDER_LINE] });
  if (!known) {
    /* No rule id on the card: an id is this code's name for a rule, not a word for a player. */
    if (saved.lottery) {
      blocks.push({ heading: 'How this night was drawn', lines: [`It was drawn under an earlier rule of this game, on the odds table of ${saved.lottery.table}.`] });
    }
    return blocks;
  }
  const league = [...known.leagueSays];
  league.push(known.real.to === null
    ? `The league has used this rule since its ${known.real.from} draft.`
    : `The league used this rule from its ${known.real.from} draft to its ${known.real.to} draft.`);
  blocks.push({ heading: "The league's rule", lines: league.filter(Boolean) });
  blocks.push({ heading: "This game's own", lines: [...known.gameSays, ...known.partial] });
  if (sameTable) {
    const example = lotteryExample(sameTable);
    /* The example is the table's. When the night's own two numbers are not the table's, say what they were. Why they
       differ is said only when the saved order shows it: a drawing among lottery clubs. */
    const says = lotteryFactsFromWeights(sameTable.odds, sameTable.draws);
    const total = sameTable.odds.reduce((a, b) => a + b, 0);
    const tableLast = tenth((sameTable.odds[sameTable.odds.length - 1] / total) * 100);
    const n = nightChances(saved);
    if (says && n && (n.first !== says.worstPct || n.last !== tableLast)) {
      const inField = new Set(saved.lottery?.field.map(x => x.club) ?? []);
      const shared = saved.level.some(group => group.every(club => inField.has(club)));
      example.push(`${shared ? 'On this night clubs level on record shared their chances, so' : 'This night was drawn on its own chances:'} the worst record's chance was ${n.first}% and the best record in the lottery had ${n.last}%.`);
    }
    blocks.push({ heading: 'A worked example', lines: example });
  }
  return blocks;
}
