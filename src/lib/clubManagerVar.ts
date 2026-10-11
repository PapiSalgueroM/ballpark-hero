import { keyedRng } from '@/lib/keyedRng';
import { CM_VAR_RATES as CM_VAR_GAME_RATES, CM_VAR_COVERAGE, CM_VAR_KINDS } from '@/data/clubManagerVarRates';

/** Round 1218: the rates and the coverage are DERIVED from real football by scripts/genCmVarRates.mjs
 * (scripts/data/cmVarRates.json, cmVarCompetitions.json) and read from the generated module. No rate is typed here.
 * Review scope: https://www.theifab.com/laws/latest/video-assistant-referee-var-protocol/
 * https://www.uefa.com/running-competitions/refereeing/clear-line/factual-decisions/
 * Decisions are made before a chance commits, then saved with the match. */
export interface CmVarDecision {
  id: string;
  incident: 'goal' | 'penalty';
  decision: 'confirmed' | 'disallowed' | 'awarded';
  trigger?: { side: 'me' | 'opp'; who: string };
  /** 'ruled_out' since Round 1218: one publisher splits why goals are ruled out, so the card names no reason. */
  reason: 'offside' | 'attacking_foul' | 'handball' | 'ruled_out' | 'clear' | 'penalty_stands' | 'missed_foul';
}
export { CM_VAR_GAME_RATES, CM_VAR_KINDS };

/** Round 1303 (the lead's decision 2). The KINDS of review the engine can play: a goal ruled out, a penalty given.
 *  Which of them the GAME plays is data: scripts/data/cmVarRates.json (kinds, and what its owed entries hold),
 *  through the generator, as CM_VAR_KINDS. Turning a kind on is a line of that ledger, never an edit here. */
export type CmVarKind = 'goal' | 'penalty';
export const CM_VAR_ALL_KINDS: readonly CmVarKind[] = ['goal', 'penalty'];
/** What a caller hands kickOff. A LIST asks for those kinds and is saved with the match (the game asks with
 *  CM_VAR_KINDS, see cmVarGameAsk). `true` stages every kind the engine can play and saves no list: the tests
 *  and the harnesses ask that way, the game never does (scripts/simCmVar.mjs holds that at the source). */
export type CmVarAsk = boolean | readonly CmVarKind[];
export function cmVarKindsAsked(ask: CmVarAsk | undefined): CmVarKind[] {
  if (ask === true) return [...CM_VAR_ALL_KINDS];
  return ask ? CM_VAR_ALL_KINDS.filter(kind => ask.includes(kind)) : [];
}
/** The kinds a match in play reviews: the list it was kicked off with. A match with reviews and no list was
 *  kicked off with every kind staged (no save in the wild holds one: the switch was never on before the list). */
export function cmVarKindsOf(live: { varReviews?: true; varKinds?: readonly CmVarKind[] }): CmVarKind[] {
  if (!live.varReviews) return [];
  const saved = live.varKinds;
  return saved ? CM_VAR_ALL_KINDS.filter(kind => saved.includes(kind)) : [...CM_VAR_ALL_KINDS];
}
/** What the game itself asks kickOff for, at both places it kicks a match off: the kinds the ledger has on, and
 *  nothing at all while the switch is off or no kind is on. */
export function cmVarGameAsk(switchOn: boolean, kinds: readonly CmVarKind[] = CM_VAR_KINDS): { varReviews?: readonly CmVarKind[] } {
  return switchOn && kinds.length > 0 ? { varReviews: kinds } : {};
}

/** Round 1303 fix (owed goals-level, closed in the engine). The engine's goals are calibrated on goals that COUNTED,
 *  and real football's counted goals are already net of what reviews took away. So a match that reviews goals draws
 *  its goals a little more often, by exactly what its reviews rule out: those goals come ON TOP and goals a match
 *  stays where the engine without reviews has it. p is the chance a drawn goal is taken back (the review rate times
 *  the overturn rate); drawing 1 / (1 - p) times as often and taking back p of them leaves the same count
 *  (settleGoalReviews takes them back: with a review when a review can look at the goal, without one when it
 *  cannot). A match that does not review goals is not touched (the factor is exactly 1). */
export function cmVarGoalLift(kinds: readonly CmVarKind[]): number {
  if (!kinds.includes('goal')) return 1;
  return 1 / (1 - CM_VAR_GAME_RATES.goalReview * CM_VAR_GAME_RATES.overturn);
}

const CUP_STAGES = ['R16', 'QF', 'SF', 'F'], UCL_STAGES = ['group', 'R16', 'QF', 'SF', 'F'];
/** Does this competition use reviews at this stage in 2026-27? key is league:<id>, cup:<cup name> or ucl.
 *  A competition that is not in the generated coverage (no, unknown, never read) does not. */
export function cmVarCovers(key: string, stage?: string): boolean {
  const from = Object.prototype.hasOwnProperty.call(CM_VAR_COVERAGE, key) ? CM_VAR_COVERAGE[key] : null;
  if (!from) return false;
  if (from === 'all') return true;
  const order = key === 'ucl' ? UCL_STAGES : CUP_STAGES;
  const at = order.indexOf(stage ?? ''), first = order.indexOf(from);
  return at >= 0 && first >= 0 && at >= first;
}
type Goal = { name: string; minute: number; plus?: number; penalty?: boolean; freeKick?: boolean };
type ReviewLine = { minute: number; plus?: number; side: 'me' | 'opp'; kind: 'var'; who: string; review: CmVarDecision };

export function settleGoalReviews<T extends Goal>(goals: T[], side: 'me' | 'opp', matchKey: string): { goals: T[]; reviews: ReviewLine[] } {
  const accepted: T[] = [], reviews: ReviewLine[] = [];
  for (const goal of goals) {
    /* Round 1303 fix: a penalty or a direct free kick is not reviewed. A match that reviews goals draws every
       goal a little more often (cmVarGoalLift), so one of these is taken back as often as a review rules a goal
       out, with no review and no trace: only the goals a review can look at end up lifted. */
    if (goal.penalty || goal.freeKick) {
      if (keyedRng(`${matchKey}:${side}:${goal.minute}:${goal.plus ?? 0}:${goal.name}:lift`)() >= CM_VAR_GAME_RATES.goalReview * CM_VAR_GAME_RATES.overturn) accepted.push(goal);
      continue;
    }
    const id = `${matchKey}:${side}:${goal.minute}:${goal.plus ?? 0}:${goal.name}:goal`;
    const rng = keyedRng(id);
    if (rng() >= CM_VAR_GAME_RATES.goalReview) { accepted.push(goal); continue; }
    const overturned = rng() < CM_VAR_GAME_RATES.overturn;
    const review: CmVarDecision = { id, incident: 'goal', decision: overturned ? 'disallowed' : 'confirmed', reason: overturned ? 'ruled_out' : 'clear' };
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
  if (review.reason === 'ruled_out') return 'VAR: goal ruled out';
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
      penalty: true, on: scored || rng() < CM_VAR_GAME_RATES.penaltyOnTarget, goal: scored || undefined, xg: CM_VAR_GAME_RATES.penaltyScores, review };
    reviews.push({ minute: foul.minute, ...(foul.plus ? { plus: foul.plus } : {}), side, kind: 'var', who: taker.name, review });
    if (scored) goals.push({ side, ...taker, minute: foul.minute, ...(foul.plus ? { plus: foul.plus } : {}), penalty: true });
    awarded.add(side);
  }
  return { play, reviews, goals };
}
