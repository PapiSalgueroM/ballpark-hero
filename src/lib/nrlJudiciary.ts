import { hashLabel, rngFrom } from '@/lib/careerEngine';
import type { NrlManagerState, NrlMatchResult } from '@/lib/nrlManager';

export const NRL_JUDICIARY_CLEAR_CHANCE = 0.4;
export type NrlJudiciaryDecision = 'plea' | 'contest';
export interface NrlJudiciaryCase {
  round: number;
  playerId: string;
  decision?: NrlJudiciaryDecision;
  decidedRound?: number;
  settledAfterMatch?: true;
}
export interface NrlJudiciaryCarry { playerId: string; matches: 1 | 2 }
export interface NrlJudiciary {
  case?: NrlJudiciaryCase;
  carried?: NrlJudiciaryCarry;
}
type Season = Pick<NrlManagerState, 'year' | 'clubId' | 'seed' | 'results' | 'judiciary'>;
type Hearing = Pick<Season, 'year' | 'clubId' | 'seed'>;
type ClubResults = Pick<NrlManagerState, 'clubId' | 'results'>;

const fictionalPlayer = (id: string) => !id.startsWith('nrl-real-');
const isClubMatch = (match: NrlMatchResult, clubId: string) => match.homeId === clubId || match.awayId === clubId;
const rngFor = ({ year, clubId, seed }: Hearing, label: string) => rngFrom(hashLabel(`nrl-judiciary-v1|${seed}|${year}|${clubId}|${label}`));
const participants = (match: NrlMatchResult) => [...(match.playerScoring?.starters ?? []), ...(match.benchUsed ?? [])];

function caseForMatch(season: Season, match: NrlMatchResult): NrlJudiciaryCase | undefined {
  if (!isClubMatch(match, season.clubId)) return undefined;
  const players = participants(match).filter(fictionalPlayer);
  const rng = rngFor(season, `review|${match.round}`);
  if (!players.length || rng() >= 0.10) return undefined;
  return { round: match.round, playerId: players[Math.floor(rng() * players.length)] };
}

export function nrlJudiciaryCase({ judiciary }: Season): NrlJudiciaryCase | undefined {
  return judiciary?.case;
}

export function judiciaryNeedsResponse(season: Season): boolean {
  const review = nrlJudiciaryCase(season);
  return Boolean(review && !review.decision);
}

export function nrlJudiciaryPenalty(season: Hearing, review: NrlJudiciaryCase): 0 | 1 | 2 {
  return review.decision === 'plea' ? 1
    : review.decision === 'contest' && rngFor(season, `hearing|${review.round}|${review.playerId}`)() >= NRL_JUDICIARY_CLEAR_CHANCE ? 2 : 0;
}

export function nrlJudiciaryMatchesAfter(season: ClubResults, round: number): number {
  return season.results.filter(match => match.round > round && isClubMatch(match, season.clubId)).length;
}

export function nrlJudiciaryBannedBefore(season: Season, playerId: string, round: number): boolean {
  const results = season.results.filter(match => match.round < round);
  const { judiciary } = season;
  const review = judiciary?.case;
  const prior = review?.decidedRound !== undefined && (review.decidedRound < round
    || (review.decidedRound === round && !review.settledAfterMatch)) ? review : undefined;
  return nrlJudiciaryBans({ ...season, results, judiciary: { ...judiciary, case: prior } }).has(playerId);
}

export function nrlJudiciaryBans(season: Season): Map<string, 1 | 2> {
  const bans = new Map<string, 1 | 2>();
  if (!season.judiciary) return bans;
  const { carried, case: review } = season.judiciary;
  const remaining = (matches: number, issued: number) => matches - nrlJudiciaryMatchesAfter(season, issued);
  if (carried) {
    const count = remaining(carried.matches, 0);
    if (count === 1 || count === 2) bans.set(carried.playerId, count);
  }
  if (review?.decision && season.results.some(match => match.round === review.round && isClubMatch(match, season.clubId))) {
    const count = remaining(nrlJudiciaryPenalty(season, review), review.round);
    if (count === 1 || count === 2) bans.set(review.playerId, count);
  }
  return bans;
}

export function nrlNewJudiciaryCase(season: Season, newResults: NrlMatchResult[]): NrlJudiciaryCase | undefined {
  if (!season.judiciary || season.judiciary.case || nrlJudiciaryBans(season).size) return undefined;
  for (const match of newResults) {
    const review = caseForMatch(season, match);
    if (review) return review;
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNrlJudiciary(value: unknown): value is NrlJudiciary {
  if (!record(value) || Object.keys(value).length !== Number(value.case !== undefined) + Number(value.carried !== undefined)) return false;
  const { case: review, carried } = value;
  return (review === undefined || (record(review) && Object.keys(review).length === (review.decision === undefined ? 2 : 4 + Number(review.settledAfterMatch !== undefined))
    && typeof review.round === 'number' && Number.isInteger(review.round) && review.round > 0
    && typeof review.playerId === 'string' && fictionalPlayer(review.playerId)
    && (review.decision === undefined ? review.decidedRound === undefined && review.settledAfterMatch === undefined
      : (review.decision === 'plea' || review.decision === 'contest') && typeof review.decidedRound === 'number'
        && Number.isInteger(review.decidedRound) && review.decidedRound >= review.round
        && (review.settledAfterMatch === undefined || review.settledAfterMatch === true))))
    && (carried === undefined || (record(carried) && Object.keys(carried).length === 2 && typeof carried.playerId === 'string'
      && fictionalPlayer(carried.playerId) && (carried.matches === 1 || carried.matches === 2)));
}

export function validNrlJudiciary(season: Season & Pick<NrlManagerState, 'round' | 'phase'>): boolean {
  if (!season.judiciary) return true;
  const { case: review, carried } = season.judiciary;
  if (review?.decidedRound !== undefined && (review.decidedRound > season.round
    || (review.settledAfterMatch && (season.phase !== 'complete' || review.decidedRound !== season.round))
    || (review.decidedRound === review.round && (season.phase !== 'complete' || season.round !== review.round)))) return false;
  let carryLeft = carried?.matches ?? 0;
  let banLeft = 0;
  let issued = false;
  for (const match of season.results) {
    if (!isClubMatch(match, season.clubId)) continue;
    const played = participants(match);
    if (carryLeft) {
      if (played.includes(carried!.playerId)) return false;
      carryLeft--;
      continue;
    }
    if (issued) {
      if (!review?.decision || review.decidedRound! > match.round || (banLeft > 0 && played.includes(review.playerId))) return false;
      banLeft = Math.max(0, banLeft - 1);
      continue;
    }
    const expected = caseForMatch(season, match);
    if (expected) {
      if (review?.round !== expected.round || review.playerId !== expected.playerId) return false;
      issued = true;
      banLeft = nrlJudiciaryPenalty(season, review);
    }
  }
  return issued === Boolean(review);
}
