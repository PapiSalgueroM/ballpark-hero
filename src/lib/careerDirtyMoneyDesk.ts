/* Round 1500: the dirty money desk's own half of the rule (src/lib/careerDirtyMoney.ts holds the rest).

   What only the desk needs lives here, so it loads with the desk's lazy chunk and not with the four pages: the
   words each way's button prints (wayLines, previewDirty) and the desk's apply on a copy (dealWithDirtyMoney). The
   numbers, the apply, the draw and the card's wash stay in careerDirtyMoney.ts, which the four corruption decks and
   the board need at first load; this file adds no rule of its own, it only words and runs that module's numbers.
   The review of Round 1500 measured about 2.7K gzipped added to every first load of the four pages, most of it this
   text; it is imported by src/components/us-career/DirtyMoneyDesk.tsx (lazy), the tests and the harnesses only. */
import {
  CAUGHT_FANBASE, CAUGHT_MORALE, WASH_HEAT, applyDirtyNumbers, canDealWithDirtyMoney, dirtyResultLine, moneyText as m,
  seasonsOut as sitOut, washIsCaught, wayNumbers, type DirtyMoneyHost, type DirtyNumbers, type DirtyWay,
} from '@/lib/careerDirtyMoney';

/* What every suspension the engines start at a season end takes (nbaMyCareer.ts 926 to 927 and its three copies),
   the same numbers a caught wash takes at once. */
const startCost = (starts: number) => (starts <= 0 ? '' : `, fanbase -${CAUGHT_FANBASE} and morale -${CAUGHT_MORALE} ${starts === 1 ? 'when it starts' : 'each time one starts'}`);

/** The lines a way's button prints, built only from its numbers. */
export function wayLines(n: DirtyNumbers, heatNow: number): string[] {
  const banLine = n.bannedAfter > 0 ? [`At this heat you still sit out ${sitOut(n.bannedAfter)} to a suspension${startCost(n.startsAfter)}`] : [];
  if (n.way === 'clean') {
    return [
      n.fine > 0
        ? `Pay back all ${m(n.amount)} plus a ${m(n.fine)} fine${n.fineIsAll ? ', all the clean money you have' : ''}`
        : `Pay back all ${m(n.amount)}. You have no clean money for the fine`,
      n.heat < 0 ? `Heat ${n.heat}` : heatNow >= 100 ? 'At the top of the meter nothing cools the heat' : 'Too little to cool the heat',
      n.karma > 0 ? `Karma +${n.karma}` : 'Karma stays where it is',
      ...banLine,
    ];
  }
  if (n.way === 'give') {
    return [
      `All ${m(n.amount)} goes to charity. You keep none of it`,
      n.karma > 0 ? `Karma +${n.karma}` : 'Karma stays where it is',
      'Heat stays where it is',
      ...banLine,
    ];
  }
  if (n.way === 'wash') {
    const washed = n.keep > 0 ? `${m(n.keep)} comes out as clean money` : 'too little of it to come out as clean money';
    return [
      n.heat >= WASH_HEAT ? `Heat +${n.heat} now` : n.heat > 0 ? 'Heat goes to the top of the meter now' : 'Heat is already at the top of the meter',
      `${n.caughtPct} percent chance you are caught`,
      `Not caught: ${washed}${n.bannedAfter > 0 ? `, and at this heat you still sit out ${sitOut(n.bannedAfter)} to a suspension${startCost(n.startsAfter)}` : ''}`,
      `Caught: all ${m(n.amount)} is seized, fanbase -${n.caughtFanbase}, morale -${n.caughtMorale}, and you sit out ${sitOut(n.bannedIfCaught)}${n.startsIfCaught > 0 ? `, the next suspension costing fanbase -${CAUGHT_FANBASE} and morale -${CAUGHT_MORALE} again` : ''}`,
    ];
  }
  return [
    'Nothing changes now',
    heatNow > 0 ? 'It keeps burning: heat climbs every season you hold it' : 'Nobody is looking yet, but once the heat starts it climbs every season you hold it',
    ...(n.burnsToBan ? [`At this heat the next season end suspends you, takes all of it, and costs fanbase -${CAUGHT_FANBASE} and morale -${CAUGHT_MORALE}`] : []),
  ];
}

export interface DirtyPreview extends DirtyNumbers { lines: string[] }

/** What a way's button prints before you choose: every number it will apply, rounded as printed. */
export function previewDirty(c: DirtyMoneyHost, way: DirtyWay): DirtyPreview {
  const n = wayNumbers(c, way);
  return { ...n, lines: wayLines(n, c.heat ?? 0) };
}

/** The desk: deals with all the dirty money one way, on a copy. Keep it quiet, a career with none, and a retired
 *  career come back unchanged with no line. */
export function dealWithDirtyMoney<C extends DirtyMoneyHost>(prev: C, way: DirtyWay): { state: C; line: string; caught: boolean | null } {
  if (way === 'quiet' || !canDealWithDirtyMoney(prev)) return { state: prev, line: '', caught: null };
  const n = wayNumbers(prev, way);
  const caught = way === 'wash' ? washIsCaught(prev, n.caughtPct ?? 0) : false;
  const state = { ...prev };
  applyDirtyNumbers(state, n, caught);
  const line = way === 'wash' && !caught ? `You washed it through cash businesses. ${dirtyResultLine(n, caught)}` : dirtyResultLine(n, caught);
  return { state, line, caught: way === 'wash' ? caught : null };
}
