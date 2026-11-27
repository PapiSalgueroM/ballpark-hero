import type { CMPlayer, CornerRoutine, MyGoalLine, PlayEvent } from './clubManager';
import { settleGoalReviews } from './clubManagerVar';
import { keyedRng } from './keyedRng';

export interface CornerDelivery {
  id: string;
  kind: CornerRoutine['kind'];
  takerId: string;
  targetId: string;
  target: string;
  takerGenerated?: true;
  targetGenerated?: true;
  read: boolean;
  outcome: 'cleared' | 'recycled' | 'shot' | 'disallowed';
}

/** The input corners were awarded by the match. A routine can originate a new chance only at its own corner. */
export function resolveCornerDeliveries(
  routine: CornerRoutine, assignedTaker: string | null | undefined, play: PlayEvent[],
  earlier: PlayEvent[], mineAt: (minute: number) => CMPlayer[], fixtureKey: string, reviewGoals: boolean,
): { plays: PlayEvent[]; goals: MyGoalLine[] } {
  const plays: PlayEvent[] = [], goals: MyGoalLine[] = [];
  if (routine.takerId !== assignedTaker || routine.takerId === routine.targetId ||
      !['left', 'right'].includes(routine.flag) || !['far-post', 'short'].includes(routine.kind)) return { plays, goals };
  const occupied = new Set(play.filter(e => e.goal || e.kind === 'var').map(e => e.minute));
  let attempts = earlier.filter(e => e.cornerDelivery?.kind === routine.kind && e.flank === routine.flag).length;
  for (const corner of play) {
    if (corner.kind !== 'corner' || corner.side !== 'me' || corner.flank !== routine.flag) continue;
    const on = mineAt(corner.minute), taker = on.find(p => p.id === routine.takerId), target = on.find(p => p.id === routine.targetId);
    // The assignment and both IDs are checked at delivery. A replacement with the same name cannot inherit it.
    if (!taker || !target || corner.who !== taker.name) continue;
    const id = fixtureKey + '/corner/' + corner.minute + '/' + attempts;
    const random = keyedRng(id);
    const read = attempts > 0;
    attempts++;
    const far = routine.kind === 'far-post';
    const finisher = far ? target : taker;
    const fitness = (taker.fitness + target.fitness) / 200;
    const quality = Math.max(0, Math.min(1, ((taker.rating + target.rating) / 2 - 55) / 35));
    const clearance = (far ? 0.51 : 0.23) + (read ? 0.14 : 0) - 0.06 * quality;
    const shotChance = (far ? 0.34 : 0.20) * (0.65 + 0.2 * quality + 0.15 * fitness) * (read ? 0.64 : 1);
    const deliveryRoll = random();
    const outcome = !occupied.has(corner.minute) && deliveryRoll < shotChance ? 'shot'
      : deliveryRoll > 1 - clearance ? 'cleared' : 'recycled';
    const delivery: CornerDelivery = { id, kind: routine.kind, takerId: taker.id, targetId: target.id, target: target.name, read, outcome,
      ...(taker.generated ? { takerGenerated: true } : {}), ...(target.generated ? { targetGenerated: true } : {}) };
    corner.cornerDelivery = delivery;
    if (outcome !== 'shot') continue;

    const xg = Math.round(100 * Math.max(0.06, Math.min(0.22, (far ? 0.095 : 0.15) + (finisher.rating - 72) * 0.0015))) / 100;
    const finish = random(), goal = finish < xg;
    if (goal) {
      const scorer: MyGoalLine = { id: finisher.id, name: finisher.name, minute: corner.minute, cornerChance: id };
      const review = reviewGoals ? settleGoalReviews([scorer], 'me', id) : null;
      occupied.add(corner.minute);
      if (review) plays.push(...review.reviews.map(e => ({ ...e, cornerChance: id })));
      if (review && !review.goals.length) { delivery.outcome = 'disallowed'; continue; }
      goals.push(scorer);
    }
    plays.push({ kind: 'shot', side: 'me', who: finisher.name, minute: corner.minute, cornerChance: id, xg, on: goal || finish < xg + 0.27,
      ...(finisher.generated ? { whoGenerated: true } : {}), ...(goal ? { goal: true } : {}) });
  }
  return { plays, goals };
}

