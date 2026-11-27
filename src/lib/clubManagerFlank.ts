import { keyedRng } from '@/lib/keyedRng';
import { settleGoalReviews } from '@/lib/clubManagerVar';
import type { CMPlayer, LiveMatch, MyGoalLine, OppXiLine, PlayEvent, ScorerLine, XiSlot } from '@/lib/clubManager';

export interface FlankPlan { side: 'left' | 'right'; support: 'overlap' | 'hold' }
export interface FlankMove extends FlankPlan {
  receiver: string;
  passerGenerated?: true;
  receiverGenerated?: true;
  cover?: string;
  coverGenerated?: true;
  outcome: 'entry' | 'turnover' | 'recycle';
  covered: boolean;
  response?: true;
}

export interface FlankSegment {
  live: LiveMatch; from: number; to: number; pairs: XiSlot[]; play: PlayEvent[];
  mineAt: (minute: number) => CMPlayer[];
  theirsAt: (minute: number) => OppXiLine[] | null;
  oppStrength: number; reviewGoals: boolean; reviewKey: string;
}

export function isFlankPlan(value: unknown): value is FlankPlan {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Partial<FlankPlan>;
  return (plan.side === 'left' || plan.side === 'right') && (plan.support === 'overlap' || plan.support === 'hold');
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function nearSlot(pairs: XiSlot[], x: number, y: number, omit?: CMPlayer) {
  let nearest: XiSlot | null = null, distance = Infinity;
  for (const pair of pairs) {
    if (!pair.slot || pair.slot.allowed.includes('GK') || pair.p === omit) continue;
    const gap = Math.hypot(pair.slot.x - x, pair.slot.y - y);
    if (gap < distance) { nearest = pair; distance = gap; }
  }
  return { nearest, distance };
}

/** A shared opportunity clock lets a change of side or support compare the same passing windows. */
export function drawFlankPlay(input: FlankSegment) {
  const { live, from, to } = input, plan = live.flankPlan;
  const play: PlayEvent[] = [], mine: MyGoalLine[] = [], theirs: ScorerLine[] = [];
  if (!isFlankPlan(plan) || !Number.isInteger(live.flankDraw) || live.flankDraw! < 0 || live.flankDraw! > 0xffffffff) return { play, mine, theirs };
  const earlier = [...(live.h1Play ?? []), ...(live.h2Play ?? [])]
    .filter(e => e.flankMove?.outcome === 'entry').sort((a, b) => a.minute - b.minute || (a.plus ?? 0) - (b.plus ?? 0));
  let coveredSide: FlankPlan['side'] | undefined;
  let entries = 0;
  for (const e of earlier) {
    if (e.flankMove!.response) { coveredSide = e.flankMove!.side; entries = 0; }
    else entries = e.flankMove!.side === plan.side ? entries + 1 : 0;
  }
  const taken = new Set(input.play.filter(e => e.goal || e.kind === 'var').map(e => e.minute));
  const x = plan.side === 'left' ? 14 : 86;
  const overlap = plan.support === 'overlap';
  for (let bin = Math.floor(from / 6); bin * 6 < to; bin++) {
    const random = keyedRng('cm-flank/' + live.flankDraw + '/' + bin);
    const minute = bin * 6 + 1 + Math.floor(random() * 6);
    if (minute <= from || minute > to || taken.has(minute)) continue;
    const on = new Set(input.mineAt(minute).map(p => p.id));
    const pairs = input.pairs.filter(pair => on.has(pair.p.id));
    const back = nearSlot(pairs, x, 73), wide = nearSlot(pairs, x, 30, back.nearest?.p);
    if (!back.nearest || !wide.nearest) continue;
    const fullback = back.nearest.p, winger = wide.nearest.p;
    const properPair = back.nearest.slot!.allowed.includes(fullback.position) && wide.nearest.slot!.allowed.includes(winger.position);
    const fit = clamp(1 - (back.distance + wide.distance) / 115 - (properPair ? 0 : 0.25)
      - Math.max(0, 80 - (fullback.fitness + winger.fitness) / 2) / 120, 0.15, 1);
    const passer = overlap ? winger : fullback, receiver = overlap ? fullback : winger;
    const covered = coveredSide === plan.side;
    const completed = (overlap ? 0.49 + 0.28 * fit : 0.30 + 0.17 * fit) - (covered ? 0.17 : 0);
    const lost = (overlap ? 0.17 : 0.08) + (covered ? 0.08 : 0) + (1 - fit) * 0.10;
    const routeRoll = random(), chanceRoll = random(), finishRoll = random();
    const outcome = routeRoll < completed ? 'entry' : routeRoll >= 1 - lost ? 'turnover' : 'recycle';
    const response = outcome === 'entry' && !covered && ++entries === 3;
    if (response) { coveredSide = plan.side; entries = 0; }
    const cover = overlap ? nearSlot(pairs.filter(pair => pair.slot && pair.slot.y >= 55 && pair.p !== winger),
      plan.side === 'left' ? 33 : 67, 72, fullback).nearest?.p : fullback;
    const move: FlankMove = { ...plan, receiver: receiver.name, outcome, covered,
      ...(passer.generated ? { passerGenerated: true } : {}), ...(receiver.generated ? { receiverGenerated: true } : {}),
      ...(outcome === 'turnover' && cover ? { cover: cover.name, ...(cover.generated ? { coverGenerated: true } : {}) } : {}),
      ...(response ? { response: true } : {}) };
    play.push({ minute, kind: 'buildup', side: 'me', who: passer.name, flankMove: move });
    const opponent = input.theirsAt(minute);
    const attacks = opponent?.filter(p => p.p !== 'GK') ?? [];
    const outlet = [...attacks].sort((a, b) => {
      const rank = (p: OppXiLine) => p.r + (['ST', 'RW', 'LW', 'CF'].includes(p.p) ? 10 : 0);
      return rank(b) - rank(a);
    })[0];
    const counterQuality = clamp(((outlet?.r ?? input.oppStrength) - 55) / 35, 0.12, 1);
    const ourShot = outcome === 'entry' && chanceRoll < (overlap ? 0.30 : 0.18) + 0.10 * fit;
    const protection = cover ? clamp((cover.rating + cover.fitness - 130) / 55, 0, 1) : 0;
    const theirShot = outcome === 'turnover' && chanceRoll < (overlap ? 0.43 : 0.16) + 0.36 * counterQuality - 0.10 * protection;
    if (!ourShot && !theirShot) continue;
    const striker = nearSlot(pairs, 50, 19, passer).nearest?.p ?? receiver;
    const who = ourShot ? striker.name : outlet?.n ?? live.opponent + ' No. 9';
    const generated = ourShot ? striker.generated : outlet?.g ?? !outlet;
    const side = ourShot ? 'me' : 'opp';
    const rating = ourShot ? striker.rating : outlet?.r ?? input.oppStrength;
    const xg = Math.round(100 * clamp((ourShot ? 0.11 : overlap ? 0.16 : 0.10) + (rating - 72) * 0.002, 0.06, 0.25)) / 100;
    const goal = finishRoll < xg;
    if (goal) {
      const scorer = { minute, name: who, ...(ourShot ? { id: striker.id } : {}) };
      const review = input.reviewGoals ? settleGoalReviews([scorer], side, input.reviewKey) : null;
      if (review) play.push(...review.reviews);
      if (review && !review.goals.length) continue;
      if (ourShot) mine.push({ minute, name: who, id: striker.id });
      else theirs.push({ minute, name: who, ...(generated ? { gen: true } : {}) });
    }
    play.push({ minute, kind: 'shot', side, who, xg, on: goal || finishRoll < xg + 0.27,
      ...(goal ? { goal: true } : {}), ...(generated ? { whoGenerated: true } : {}), flankChance: ourShot ? 'entry' : 'counter' });
  }
  return { play, mine, theirs };
}
