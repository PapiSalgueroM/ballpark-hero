import type { CMPlayer, MyGoalLine, OppXiLine, PlayEvent, ScorerLine } from './clubManager';
import { settleGoalReviews } from './clubManagerVar';
import { keyedRng } from './keyedRng';

export interface ReturnPressOrder { version: 1; target: string; wingerId: string }
export interface ReturnPressEvent {
  id: string;
  wingerId: string;
  winger: string;
  wingerGenerated?: true;
  targetGenerated?: true;
  outlet: string;
  outletGenerated?: true;
  outcome: 'direct' | 'won' | 'bypassed';
  effort: 0 | 1;
  spent?: 0 | 1;
  tired: boolean;
}

function outletFor(on: OppXiLine[], target: OppXiLine, direct: boolean): OppXiLine | undefined {
  const left = target.p === 'LB' || target.p === 'LWB';
  const roles = direct ? [left ? 'LW' : 'RW', 'ST', 'CF', left ? 'LM' : 'RM']
    : [left ? 'LM' : 'RM', left ? 'LW' : 'RW', 'CM', 'CDM', 'CAM'];
  const others = on.filter(p => p.n !== target.n && p.p !== 'GK');
  return roles.map(role => others.find(p => p.p === role)).find(Boolean) ?? (direct ? others[0] : undefined);
}

/** The throw is already on the match clock. Only the short receiver's attempted return starts a chase. */
export function drawReturnPress(
  order: ReturnPressOrder, events: PlayEvent[], earlier: PlayEvent[], mineAt: (minute: number) => CMPlayer[],
  theirsAt: (minute: number) => OppXiLine[], fixture: string, reviewGoals: boolean, tempo: -1 | 0 | 1 = 0,
) {
  const play: PlayEvent[] = [], mine: MyGoalLine[] = [], theirs: ScorerLine[] = [];
  const occupied = new Set(events.filter(e => e.kind === 'shot' || e.kind === 'var').map(e => e.minute));
  const efforts = earlier.filter(e => e.kind === 'throwin' && e.side === 'opp' && e.returnPress?.wingerId === order.wingerId && e.returnPress.effort === 1);
  const ordinals = new Map<number, number>();
  for (const e of events) {
    if (e.kind !== 'throwin' || e.side !== 'opp') continue;
    const ordinal = ordinals.get(e.minute) ?? 0;
    ordinals.set(e.minute, ordinal + 1);
    if (e.who !== order.target) continue;
    const there = theirsAt(e.minute), matching = there.filter(p => p.n === order.target);
    const target = matching[0], winger = mineAt(e.minute).find(p => p.id === order.wingerId);
    if (matching.length !== 1 || !['LB', 'LWB', 'RB', 'RWB'].includes(target.p) || !winger) continue;
    const id = [fixture, 'return', target.n, e.minute, ordinal].join('/');
    const random = keyedRng(id);
    const short = outletFor(there, target, false);
    const direct = random() < 0.30 + 0.15 * tempo || !short;
    const outlet = direct ? outletFor(there, target, true) : short;
    if (!outlet) continue;
    // Consecutive jumps take more out of the press. A spell without a jump allows recovery.
    const recent = efforts.filter(row => e.minute - row.minute < 15).length;
    const energy = winger.fitness - e.minute * 0.23 - efforts.length - 5 * recent;
    const tired = energy < 62;
    const winChance = Math.min(0.72, Math.max(0.22, 0.56 + (winger.rating - target.r) * 0.007 + (energy - 72) * 0.007));
    const outcome = direct ? 'direct' : random() < winChance ? 'won' : 'bypassed';
    e.returnPress = { id, wingerId: winger.id, winger: winger.name, outlet: outlet.n, outcome, tired, effort: direct ? 0 : 1,
      ...(winger.generated ? { wingerGenerated: true } : {}), ...(target.g ? { targetGenerated: true } : {}), ...(outlet.g ? { outletGenerated: true } : {}) };
    if (direct) continue;
    efforts.push(e);
    if (occupied.has(e.minute) || random() >= (outcome === 'won' ? 0.33 : 0.28)) continue;
    occupied.add(e.minute);
    const won = outcome === 'won', side = won ? 'me' : 'opp', who = won ? winger.name : outlet.n;
    const xg = Math.round(100 * Math.min(0.22, Math.max(0.07, (won ? 0.14 : 0.12) + ((won ? winger.rating : outlet.r) - 73) * 0.002))) / 100;
    const finish = random(), goal = finish < xg;
    if (goal) {
      const scorer = { name: who, minute: e.minute, pressChance: id };
      const review = reviewGoals ? settleGoalReviews([scorer], side, id) : null;
      if (review) play.push(...review.reviews.map(row => ({ ...row, pressChance: id })));
      if (review && !review.goals.length) continue;
      if (won) mine.push({ ...scorer, id: winger.id });
      else theirs.push({ ...scorer, assist: target.n, ...(outlet.g ? { gen: true } : {}) });
    }
    play.push({ kind: 'shot', side, who, minute: e.minute, pressChance: id, xg, on: goal || finish < xg + 0.29,
      ...(goal ? { goal: true } : {}), ...((won ? winger.generated : outlet.g) ? { whoGenerated: true } : {}) });
  }
  return { play, mine, theirs };
}
