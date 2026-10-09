import { keyedRng } from '@/lib/keyedRng';

/** Simplified game simulation, not a claim about a league's VAR coverage or rates.
 * Review scope: https://www.theifab.com/laws/latest/video-assistant-referee-var-protocol/
 * https://www.uefa.com/running-competitions/refereeing/clear-line/factual-decisions/
 * Decisions are made before a chance commits, then saved with the match. */
export interface CmVarDecision {
  id: string;
  incident: 'goal' | 'penalty';
  decision: 'confirmed' | 'disallowed' | 'awarded';
  trigger?: { side: 'me' | 'opp'; who: string };
  reason: 'offside' | 'attacking_foul' | 'handball' | 'clear' | 'penalty_stands' | 'missed_foul';
}
export const CM_VAR_GAME_RATES = { goalReview: 0.16, overturn: 0.32, penaltyReview: 0.45, missedFoulReview: 0.015, penaltyScores: 0.74 } as const;
type Goal = { name: string; minute: number; plus?: number; penalty?: boolean; freeKick?: boolean };
type ReviewLine = { minute: number; plus?: number; side: 'me' | 'opp'; kind: 'var'; who: string; review: CmVarDecision };

export function settleGoalReviews<T extends Goal>(goals: T[], side: 'me' | 'opp', matchKey: string): { goals: T[]; reviews: ReviewLine[] } {
  const accepted: T[] = [], reviews: ReviewLine[] = [];
  for (const goal of goals) {
    if (goal.penalty || goal.freeKick) { accepted.push(goal); continue; }
    const id = `${matchKey}:${side}:${goal.minute}:${goal.plus ?? 0}:${goal.name}:goal`;
    const rng = keyedRng(id);
    if (rng() >= CM_VAR_GAME_RATES.goalReview) { accepted.push(goal); continue; }
    const overturned = rng() < CM_VAR_GAME_RATES.overturn;
    const reasons = ['offside', 'attacking_foul', 'handball'] as const;
    const review: CmVarDecision = { id, incident: 'goal', decision: overturned ? 'disallowed' : 'confirmed', reason: overturned ? reasons[Math.floor(rng() * reasons.length)] : 'clear' };
    reviews.push({ minute: goal.minute, ...(goal.plus ? { plus: goal.plus } : {}), side, kind: 'var', who: goal.name, review });
    if (!overturned) accepted.push(goal);
  }
  return { goals: accepted, reviews };
}

/** Only actual penalty shots qualify. A confirmed review never creates a second shot or goal. */
export function penaltyReviews(play: { kind: string; penalty?: boolean; minute: number; plus?: number; side: 'me' | 'opp'; who: string; review?: CmVarDecision }[], matchKey: string): ReviewLine[] {
  return play.flatMap(shot => {
    if (shot.kind !== 'shot' || !shot.penalty || shot.review) return [];
    const id = `${matchKey}:${shot.side}:${shot.minute}:${shot.plus ?? 0}:${shot.who}:penalty`;
    if (keyedRng(id)() >= CM_VAR_GAME_RATES.penaltyReview) return [];
    return [{ minute: shot.minute, ...(shot.plus ? { plus: shot.plus } : {}), side: shot.side, kind: 'var' as const, who: shot.who,
      review: { id, incident: 'penalty' as const, decision: 'confirmed' as const, reason: 'penalty_stands' as const } }];
  });
}

export function cmVarLabel(review: CmVarDecision): string {
  if (review.incident === 'penalty') return review.decision === 'awarded' ? 'VAR: penalty awarded' : 'VAR: penalty confirmed';
  if (review.decision === 'confirmed') return 'VAR: goal confirmed';
  const reason = review.reason === 'offside' ? 'offside' : review.reason === 'handball' ? 'attacking handball' : 'attacking foul';
  return `VAR: goal ruled out, ${reason}`;
}

type FeedLine = { kind: string; minute: number; plus?: number; side: string; text: string; review?: CmVarDecision };
/** The accepted shot waits for its own saved review, never for a different incident. */
export function cmVarEventWaiting(event: FeedLine, feed: FeedLine[], settled: ReadonlySet<string>): boolean {
  if (event.kind !== 'goal' && event.kind !== 'save' && event.kind !== 'shot') return false;
  return feed.some(line => line.kind === 'var' && (line.review?.decision === 'confirmed' || line.review?.decision === 'awarded') && !settled.has(line.review.id)
    && line.side === event.side && line.minute === event.minute && (line.plus ?? 0) === (event.plus ?? 0) && line.text === event.text);
}

export function cmVarPlayWaiting(play: { kind: string; goal?: boolean; on?: boolean; minute: number; plus?: number; side: string; who: string }, feed: FeedLine[], settled: ReadonlySet<string>): boolean {
  return cmVarEventWaiting({ ...play, kind: play.kind === 'shot' ? play.goal ? 'goal' : play.on ? 'save' : 'shot' : play.kind, text: play.who }, feed, settled);
}

export function cmVarCanAnnounce(event: FeedLine, feed: FeedLine[], settled: ReadonlySet<string>): boolean {
  if (event.kind === 'var' && event.review) return settled.has(event.review.id);
  return !cmVarEventWaiting(event, feed, settled);
}

/** First-half added time is already played when a saved second half opens. */
export function cmVarPlayedReviewIds(feed: FeedLine[], minute: number, stage: string): Set<string> {
  const rank = stage === 'first' ? 0 : stage === 'second' ? 1 : stage === 'extra' ? 2 : stage === 'done' ? 3 : 1;
  return new Set(feed.filter(event => {
    const period = event.minute <= 45 ? 0 : event.minute <= 90 ? 1 : 2;
    return event.kind === 'var' && event.review && (period < rank || (period === rank && event.minute + (event.plus ?? 0) < minute));
  }).map(event => event.review!.id));
}

type PenaltyPlay = { kind: string; minute: number; plus?: number; side: 'me' | 'opp'; who: string; goal?: boolean; on?: boolean; penalty?: boolean; xg?: number; review?: CmVarDecision };
/** A missed defensive foul can earn a penalty. It replaces an existing non-goal
 * chance, so reviews cannot create an arbitrary extra volume of shots. The game
 * resolves the actual kick here, once; score and credit then read that kick. */
export function awardReviewedPenalties<T extends PenaltyPlay>(input: T[], matchKey: string,
  takerAt: (side: 'me' | 'opp', minute: number) => { id?: string; name: string } | null,
  reserved: { minute: number; plus?: number }[] = [],
): { play: T[]; reviews: ReviewLine[]; goals: { side: 'me' | 'opp'; id?: string; name: string; minute: number; plus?: number; penalty: true }[] } {
  const play = input.map(event => ({ ...event })), reviews: ReviewLine[] = [], goals: { side: 'me' | 'opp'; id?: string; name: string; minute: number; plus?: number; penalty: true }[] = [];
  const awarded = new Set<string>();
  for (const foul of play.filter(e => e.kind === 'foul')) {
    const side = foul.side === 'me' ? 'opp' : 'me';
    if (awarded.has(side) || reserved.some(e => e.minute === foul.minute && (e.plus ?? 0) === (foul.plus ?? 0))) continue;
    const id = `${matchKey}:${foul.side}:${foul.minute}:${foul.plus ?? 0}:${foul.who}:missed-penalty`;
    const rng = keyedRng(id);
    if (rng() >= CM_VAR_GAME_RATES.missedFoulReview) continue;
    const index = play.findIndex(e => e.kind === 'shot' && e.side === side && !e.goal && !e.penalty && !e.review);
    const taker = takerAt(side, foul.minute);
    if (index < 0 || !taker) continue;
    const scored = rng() < CM_VAR_GAME_RATES.penaltyScores;
    const review: CmVarDecision = { id, incident: 'penalty', decision: 'awarded', reason: 'missed_foul', trigger: { side: foul.side, who: foul.who } };
    play[index] = { ...play[index], minute: foul.minute, plus: foul.plus, who: taker.name,
      penalty: true, on: scored || rng() < 0.70, goal: scored || undefined, xg: 0.76, review };
    reviews.push({ minute: foul.minute, ...(foul.plus ? { plus: foul.plus } : {}), side, kind: 'var', who: taker.name, review });
    if (scored) goals.push({ side, ...taker, minute: foul.minute, ...(foul.plus ? { plus: foul.plus } : {}), penalty: true });
    awarded.add(side);
  }
  return { play, reviews, goals };
}
