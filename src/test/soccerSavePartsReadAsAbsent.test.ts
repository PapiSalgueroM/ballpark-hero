/* Release AW closing pass, ruling C3: a save part that cannot be verified is read as ABSENT.
 *
 * Three parts of the Soccer Career save carry a receipt one level down: agentReview, internationalReturn and
 * farewellSeason. As they first merged, a part the reader could not verify (a wrong shape, another version
 * number, null, a receipt whose source season row no longer matches) closed its card for the rest of the
 * career: the eligibility function answered "could not be verified" and nothing ever wrote the part again.
 * The ruling: the reader never throws, the unverifiable part is read as if it were not there, and the next
 * honest write overwrites it. For the two once a season receipts that hands back one use in that season.
 * For the farewell the commitment is not in the part, it is the save's own isFinalSeason flag, which the
 * announcement sets with the plan: while that flag is true the card is not offered again, and the engine
 * plays the save exactly as it plays the same save with the part taken out.
 *
 * WHAT FAILS FIRST (on the head before the ruling's commit): every "is offered again" case of the three
 * parts, and the sentence check of the farewell cases with the flag set. The cases that only hold what the
 * engine already did (it plays the save as one with no part, the flag alone ends nothing, the journey is not
 * reachable) pass before and after: they are the fence around the change, not its proof.
 * The fixtures are the recorded save the other lane's three unit files use, shaped the way each of them
 * shapes it, so a case here stands on the same ground as theirs.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  acceptRetirementSuggestion, advanceProSeason, announceFarewellSeason, applyRehabChoice, choosePostRetirement,
  declineRetirementSuggestion, dismissBallonDor, dismissDebut, dismissNewspaper, dismissRivalryEvent,
  dismissSummary, dismissWorldCup, FALLBACK_CLUBS, manualRetire, retireFromInternational, type CareerState,
} from '@/lib/soccerCareerEngine';
import { agentReviewEligibility, changeCareerAgent, readAgentReview } from '@/lib/soccerAgentReview';
import {
  internationalReturnEligibility, makeInternationallyAvailable, readInternationalReturn,
} from '@/lib/soccerInternationalReturn';
import {
  announceSoccerFarewell, farewellEligibility, farewellSeasonComplete, readSoccerFarewell,
} from '@/lib/soccerCareerFarewell';

afterEach(() => vi.restoreAllMocks());
type Bag = Record<string, unknown>;
const clone = <T,>(value: T): T => structuredClone(value);
const bag = (value: unknown) => value as Bag;
function recorded(): CareerState {
  return clone(JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'))
    .saves.find((save: { id: string }) => save.id === 'ere').state as CareerState);
}
function agentCareer(): CareerState {
  const c = recorded(); c.age = 26; c.agentId = 'cousin';
  c.seasons[c.seasons.length - 1] = { ...c.seasons[c.seasons.length - 1], age: 26, year: 2028 };
  return c;
}
function cappedCareer(): CareerState {
  const c = recorded(); c.age = 34;
  c.seasons[c.seasons.length - 1] = { ...c.seasons[c.seasons.length - 1], age: 34, year: 2028 };
  c.internationalCareer = false; c.intStats = { ...c.intStats, isRetired: true, isCaptain: true };
  return c;
}
function veteran(): CareerState {
  const c = recorded(); c.playerName = 'Farewell Fixture'; c.age = 31; c.seasons[c.seasons.length - 1].age = 31;
  c.overall = 80; c.peakOverall = 80; c.phase = 'playing'; c.retired = false; c.retirementSuggested = true;
  c.matchFixBanned = 0; c.prisonSeasons = 0; c.corruptionHeat = 0; c.dirtyMoney = 0; c.pedActive = false;
  c.pedSeasonsRemaining = 0; c.pendingSummary = null; c.pendingNews = []; c.pendingRehab = null;
  c.pendingBallonDor = null; c.pendingWorldCup = null; c.pendingTournament = null; c.pendingRivalryEvent = null;
  c.intStats.debutYear = -1; c.rival = null; c.events = []; c.loan = null;
  return c;
}
function run<T>(seed: number, action: () => T): { value: T; draws: number[] } {
  let a = seed >>> 0;
  const draws: number[] = [];
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    draws.push(value); return value;
  });
  try { return { value: action(), draws }; } finally { random.mockRestore(); }
}
/** The four ways the ruling names for a part to be past verifying, each applied to an honest part. */
const DAMAGE: [string, (part: Bag, career: CareerState) => unknown][] = [
  ['a wrong shape', () => ({ version: 1 })],
  ['another version', part => ({ ...part, version: 2 })],
  ['null', () => null],
  ['a receipt whose source row no longer matches', (part, career) => {
    const index = (part.sourceCount as number) - 1;
    career.seasons[index] = { ...career.seasons[index], year: career.seasons[index].year - 1 };
    return part;
  }],
];
const SENTENCE = /verified/i;

describe('agentReview: a part that cannot be verified is read as absent', () => {
  it.each(DAMAGE)('%s: the review is offered again and a new write succeeds', (_label, damage) => {
    const c = changeCareerAgent(agentCareer(), 'shark');
    expect(readAgentReview(c), 'the fixture holds an honest receipt').not.toBeNull();
    expect(agentReviewEligibility(c).available, 'which is used up for this season').toBe(false);
    c.seasons = [...c.seasons];
    bag(c).agentReview = damage(bag(c.agentReview), c);
    const before = clone(c), latest = c.seasons[c.seasons.length - 1];
    expect(readAgentReview(c)).toBeNull();
    const eligibility = agentReviewEligibility(c);
    expect(eligibility.reason).not.toMatch(SENTENCE);
    expect(eligibility.available).toBe(true);
    const next = changeCareerAgent(c, 'super');
    expect(next).not.toBe(c); expect(c, 'the input is not edited').toEqual(before);
    expect(readAgentReview(next)).toEqual({ version: 1, sourceCount: c.seasons.length, sourceYear: latest.year,
      sourceAge: latest.age, fromAgent: 'shark', toAgent: 'super' });
    expect(next.agentId).toBe('super');
    expect(agentReviewEligibility(next)).toEqual({ available: false, reason: 'You already reviewed your representation this season.' });
    expect(changeCareerAgent(next, 'cousin'), 'the new receipt holds the once a season rule').toBe(next);
  });
});

describe('internationalReturn: a part that cannot be verified is read as absent', () => {
  it.each(DAMAGE)('%s: the comeback is offered again and a new write succeeds', (_label, damage) => {
    const c = retireFromInternational(makeInternationallyAvailable(cappedCareer()));
    expect(readInternationalReturn(c), 'the fixture holds an honest receipt').not.toBeNull();
    expect(internationalReturnEligibility(c).available, 'which is used up for this season').toBe(false);
    c.seasons = [...c.seasons];
    bag(c).internationalReturn = damage(bag(c.internationalReturn), c);
    const before = clone(c), latest = c.seasons[c.seasons.length - 1];
    expect(readInternationalReturn(c)).toBeNull();
    const eligibility = internationalReturnEligibility(c);
    expect(eligibility.reason).not.toMatch(SENTENCE);
    expect(eligibility.available).toBe(true);
    const next = makeInternationallyAvailable(c);
    expect(next).not.toBe(c); expect(c, 'the input is not edited').toEqual(before);
    expect(readInternationalReturn(next)).toEqual({ version: 1, sourceCount: c.seasons.length, sourceYear: latest.year,
      sourceAge: latest.age, nationality: c.nationality, caps: c.intStats.caps });
    expect(next.internationalCareer).toBe(true); expect(next.intStats.isRetired).toBe(false);
    expect(internationalReturnEligibility(next)).toEqual({ available: false, reason: 'You already changed your international plans this season.' });
    expect(makeInternationallyAvailable(next), 'the new receipt holds the once a season rule').toBe(next);
  });
});

const FLAG_SENTENCE = 'Your final season is already announced.';
/** The same save with the part taken out: what "read as absent" means for the engine. */
function bare(career: CareerState): CareerState {
  const copy = clone(career); delete bag(copy).farewellSeason; return copy;
}
const fieldAside = (career: CareerState) => ({ ...career, farewellSeason: undefined });

describe('farewellSeason: a plan that cannot be verified is read as absent, and the commitment is the flag', () => {
  it.each(DAMAGE)('flag off, %s: the card is offered again like to any eligible player, and a new announcement overwrites the part', (_label, damage) => {
    const c = clone(announceSoccerFarewell(veteran()));
    c.isFinalSeason = false;
    bag(c).farewellSeason = damage(bag(c.farewellSeason), c);
    const before = clone(c), latest = c.seasons[c.seasons.length - 1];
    expect(readSoccerFarewell(c)).toBeNull();
    const eligibility = farewellEligibility(c);
    expect(eligibility.reason).not.toMatch(SENTENCE);
    expect(eligibility).toMatchObject({ eligible: true, year: latest.year + 1 });
    const next = announceSoccerFarewell(c);
    expect(next).not.toBe(c); expect(c, 'the input is not edited').toEqual(before);
    expect(readSoccerFarewell(next)).toEqual({ version: 1, year: latest.year + 1, sourceCount: c.seasons.length,
      sourceYear: latest.year, sourceAge: latest.age, announcedAge: c.age, club: c.currentClub, sourcePhase: 'playing' });
    expect(next.isFinalSeason).toBe(true);
    expect(announceSoccerFarewell(next), 'one announcement, as before').toBe(next);
  });

  it.each(DAMAGE)('flag set by the announcement, %s: read as absent, not offered again, and played as the save with no part', (_label, damage) => {
    const c = clone(announceSoccerFarewell(veteran()));
    expect(c.isFinalSeason, 'the announcement set the flag with the plan').toBe(true);
    bag(c).farewellSeason = damage(bag(c.farewellSeason), c);
    const before = clone(c);
    expect(readSoccerFarewell(c)).toBeNull();
    expect(farewellSeasonComplete(c)).toBe(false);
    const eligibility = farewellEligibility(c);
    expect(eligibility.reason).not.toMatch(SENTENCE);
    expect(eligibility).toEqual({ eligible: false, year: null, reason: FLAG_SENTENCE });
    expect(announceSoccerFarewell(c)).toBe(c);
    expect(announceFarewellSeason(c, FALLBACK_CLUBS)).toBe(c);
    const held = run(41, () => advanceProSeason(clone(c), FALLBACK_CLUBS));
    const plain = run(41, () => advanceProSeason(bare(c), FALLBACK_CLUBS));
    expect(held.draws).toEqual(plain.draws);
    expect(fieldAside(held.value)).toEqual(fieldAside(plain.value));
    expect(held.value.farewellSeason, 'the saved field is neither rewritten nor deleted').toEqual(before.farewellSeason);
    expect(held.value.isFinalSeason).toBe(true);
    expect(c, 'the input is not edited').toEqual(before);
  });

  it('the flag alone ends nothing: with no readable plan the summary of that year does not retire the player', () => {
    const c = clone(announceSoccerFarewell(veteran()));
    bag(c).farewellSeason = { ...bag(c.farewellSeason), version: 2 };
    const summary = { ...c, phase: 'season_summary' as const };
    const held = run(7, () => dismissSummary(clone(summary), FALLBACK_CLUBS));
    const plain = run(7, () => dismissSummary(bare(summary), FALLBACK_CLUBS));
    expect(held.draws).toEqual(plain.draws);
    expect(fieldAside(held.value)).toEqual(fieldAside(plain.value));
    expect(held.value.retired).toBe(false);
    expect(held.value.isFinalSeason).toBe(true);
  });
});

/** The other lane's own way to the end of a farewell year: the summary, then whatever ceremony is queued. */
function finish(state: CareerState): CareerState {
  if (state.phase === 'rehab_choice') state = applyRehabChoice(state, 1);
  if (state.phase === 'newspaper') state = dismissNewspaper(state);
  expect(state.phase).toBe('season_summary');
  state = dismissSummary(state, FALLBACK_CLUBS);
  for (let i = 0; i < 6 && !state.retired; i++) {
    if (state.phase === 'ballon_dor') state = dismissBallonDor(state, FALLBACK_CLUBS);
    else if (state.phase === 'international_debut') state = dismissDebut(state, FALLBACK_CLUBS);
    else if (state.phase === 'world_cup') state = dismissWorldCup(state, FALLBACK_CLUBS);
    else if (state.phase === 'rivalry_event') state = dismissRivalryEvent(state, FALLBACK_CLUBS);
    else throw new Error(`Farewell escaped to ${state.phase}`);
  }
  return state;
}

describe('the journey of ruling C3: announce a farewell, play the year, retire, then carry on', () => {
  /* Whether it can be reached in natural play. Every step the page can press once the farewell year has ended
     in retirement is tried on the real engine: Keep playing (declineRetirementSuggestion), Next Season, Retire,
     the suggestion's Retire, a second announcement, and the three dismissals that write a season row. */
  const CARRY_ON: [string, (career: CareerState) => CareerState][] = [
    ['Keep playing', career => declineRetirementSuggestion(career, FALLBACK_CLUBS)],
    ['Next Season', career => advanceProSeason(career, FALLBACK_CLUBS)],
    ['Retire', career => manualRetire(career)],
    ['the suggestion accepted', career => acceptRetirementSuggestion(career)],
    ['a second announcement', career => announceFarewellSeason(career, FALLBACK_CLUBS)],
    ['a rehab choice', career => applyRehabChoice(career, 1)],
    ['a newspaper', career => dismissNewspaper(career)],
    ['a summary', career => dismissSummary(career, FALLBACK_CLUBS)],
  ];

  it('is NOT reachable: after a farewell retirement no step adds a season row, so the plan stays readable for good', () => {
    const state = announceSoccerFarewell(veteran());
    const plan = readSoccerFarewell(state)!;
    const played = run(41, () => advanceProSeason(clone(state), FALLBACK_CLUBS)).value;
    expect(farewellSeasonComplete(played), 'the announced year was played').toBe(true);
    const ended = run(17, () => finish(played)).value;
    expect(ended.retired).toBe(true); expect(ended.phase).toBe('retirement_ceremony');
    expect(ended.seasons).toHaveLength(plan.sourceCount + 1);
    expect(readSoccerFarewell(ended)).toEqual(plan);
    expect(ended.isFinalSeason, 'nothing in the engine ever clears the flag').toBe(true);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('a refused step drew'); });
    for (const [name, step] of CARRY_ON) expect(step(ended), name).toBe(ended);
    random.mockRestore();
    for (const choice of ['retire', 'pundit', 'manager'] as const) {
      const after = run(5, () => choosePostRetirement(clone(ended), choice, FALLBACK_CLUBS)).value;
      expect(after.seasons, `life after football as ${choice} writes no season row`).toEqual(ended.seasons);
      expect(readSoccerFarewell(after)).toEqual(plan);
      expect(farewellEligibility(after).eligible).toBe(false);
    }
  });

  it('built by hand (a row past the farewell year on a career that plays on): the plan is read as absent and the flag decides', () => {
    const state = announceSoccerFarewell(veteran());
    const plan = readSoccerFarewell(state)!;
    const played = run(41, () => advanceProSeason(clone(state), FALLBACK_CLUBS)).value;
    const last = played.seasons[played.seasons.length - 1];
    const carried: CareerState = { ...clone(played), retired: false, phase: 'playing', age: last.age + 1,
      pendingSummary: null, pendingNews: [], pendingRehab: null, pendingBallonDor: null, pendingWorldCup: null,
      pendingTournament: null, pendingRivalryEvent: null,
      seasons: [...clone(played.seasons), { ...clone(last), year: last.year + 1, age: last.age + 1, type: 'playing' }] };
    expect(carried.seasons).toHaveLength(plan.sourceCount + 2);
    expect(readSoccerFarewell(carried), 'never thrown on, read as absent').toBeNull();
    expect(carried.farewellSeason, 'and left in the save as it was').toEqual(plan);
    expect(carried.isFinalSeason, 'as the engine leaves it: nothing clears the flag').toBe(true);
    expect(farewellEligibility(carried)).toEqual({ eligible: false, year: null, reason: FLAG_SENTENCE });
    const cleared = { ...carried, isFinalSeason: false };
    expect(farewellEligibility(cleared)).toMatchObject({ eligible: true, year: last.year + 2 });
    const again = announceSoccerFarewell(cleared);
    expect(readSoccerFarewell(again)).toMatchObject({ version: 1, year: last.year + 2, sourceCount: plan.sourceCount + 2 });
    expect(again.isFinalSeason).toBe(true);
  });
});
