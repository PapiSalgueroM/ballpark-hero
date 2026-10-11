import type { CareerState, SeasonRecord } from './soccerCareerEngine';
import { AGENTS } from './soccerCareerLife';

export interface SoccerAgentReview {
  version: 1;
  sourceCount: number;
  sourceYear: number;
  sourceAge: number;
  fromAgent: string;
  toAgent: string;
}

export interface AgentReviewEligibility {
  available: boolean;
  reason: string;
}

const receiptKeys = ['version', 'sourceCount', 'sourceYear', 'sourceAge', 'fromAgent', 'toAgent'];
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const reviewAge = (value: unknown): value is number => count(value) && value >= 19 && value <= 44;
const catalogAgent = (value: unknown) => typeof value === 'string' ? AGENTS.find(agent => agent.id === value) : undefined;

function seniorRow(value: unknown): value is SeasonRecord {
  return record(value) && value.type === 'playing' && count(value.year) && value.year > 0
    && reviewAge(value.age) && text(value.club) && count(value.clubTier) && value.clubTier >= 1 && value.clubTier <= 4;
}

/** The recorded year holds the review even after a move or a random agent change. */
export function readAgentReview(career: CareerState): SoccerAgentReview | null {
  if (!record(career) || !Array.isArray(career.seasons)) return null;
  const value: unknown = career.agentReview;
  if (!record(value) || Object.keys(value).length !== receiptKeys.length
    || receiptKeys.some(key => !Object.prototype.hasOwnProperty.call(value, key))) return null;
  if (value.version !== 1 || !count(value.sourceCount) || value.sourceCount < 1 || value.sourceCount > career.seasons.length
    || !count(value.sourceYear) || value.sourceYear < 1 || !reviewAge(value.sourceAge)
    || !catalogAgent(value.fromAgent) || !catalogAgent(value.toAgent) || value.fromAgent === value.toAgent) return null;
  const source = career.seasons[value.sourceCount - 1];
  const latest = career.seasons[career.seasons.length - 1];
  const elapsed = career.seasons.length - value.sourceCount;
  if (!seniorRow(source) || source.year !== value.sourceYear || source.age !== value.sourceAge
    || !record(latest) || !count(latest.year) || !count(latest.age)
    || latest.year !== source.year + elapsed || latest.age !== source.age + elapsed
    || !count(career.age) || career.age < latest.age) return null;
  return value as unknown as SoccerAgentReview;
}

export function agentReviewEligibility(career: CareerState): AgentReviewEligibility {
  const blocked = (reason: string): AgentReviewEligibility => ({ available: false, reason });
  if (!record(career) || career.phase !== 'playing' || career.retired !== false) {
    return blocked('Review your representation while continuing your playing career.');
  }
  if (!reviewAge(career.age)) return blocked('Agent reviews are available from age 19 to 44.');
  if (!Array.isArray(career.seasons) || !text(career.currentClub) || !count(career.currentClubTier)
    || career.currentClubTier < 1 || career.currentClubTier > 4 || !catalogAgent(career.agentId)
    || !Array.isArray(career.events) || !career.events.every(event => typeof event === 'string')) {
    return blocked('A senior club and an existing chosen agent are needed first.');
  }
  const latest = career.seasons[career.seasons.length - 1];
  if (!seniorRow(latest) || latest.age !== career.age) return blocked('Finish the current senior season first.');
  if (!Array.isArray(career.pendingEvents) || career.pendingEvents.length > 0
    || career.pendingSummary != null || career.pendingRehab != null || career.pendingBallonDor != null
    || career.pendingWorldCup != null || career.pendingTournament != null || career.pendingRivalryEvent != null) {
    return blocked('Finish the current season decisions and ceremonies first.');
  }
  const held = readAgentReview(career);
  if (Object.prototype.hasOwnProperty.call(career, 'agentReview') && !held) {
    return blocked('The saved agent review could not be verified.');
  }
  if (held && (career.seasons.length <= held.sourceCount || latest.year <= held.sourceYear)) {
    return blocked('You already reviewed your representation this season.');
  }
  return { available: true, reason: 'Your choice applies to future deals and income. Existing contracts stay the same.' };
}

export function changeCareerAgent(prev: CareerState, targetId: string): CareerState {
  if (!agentReviewEligibility(prev).available) return prev;
  const from = catalogAgent(prev.agentId);
  const to = catalogAgent(targetId);
  if (!from || !to || from.id === to.id) return prev;
  const source = prev.seasons[prev.seasons.length - 1];
  return {
    ...prev,
    agentId: to.id,
    agentReview: {
      version: 1, sourceCount: prev.seasons.length, sourceYear: source.year,
      sourceAge: source.age, fromAgent: from.id, toAgent: to.id,
    },
    events: [...prev.events, `Changed representation from ${from.name} to ${to.name}. Existing wages and contracts stay the same; future deals use your new agent's terms.`],
  };
}
