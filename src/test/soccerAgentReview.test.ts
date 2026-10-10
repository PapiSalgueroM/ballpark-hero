import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  acceptLoan, acceptOffer, advanceProSeason, applyEventChoice, applyMoralDilemmaChoice,
  dismissAppealResult, dismissBallonDor, dismissDebut, dismissMoralDilemma, dismissNewspaper,
  dismissRivalryEvent, dismissSocialMediaPhase, dismissSummary, dismissWorldCup, FALLBACK_CLUBS,
  stayAtClub, type CareerState,
} from '@/lib/soccerCareerEngine';
import { AGENTS, getLifeEvents } from '@/lib/soccerCareerLife';
import { agentReviewEligibility, changeCareerAgent, readAgentReview } from '@/lib/soccerAgentReview';

afterEach(() => vi.restoreAllMocks());
const clone = <T,>(value: T): T => structuredClone(value);
function career(age = 26): CareerState {
  const recorded = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'))
    .saves.find((save: { id: string }) => save.id === 'ere').state as CareerState;
  const c = clone(recorded);
  c.age = age;
  c.agentId = 'cousin';
  c.seasons[c.seasons.length - 1] = { ...c.seasons[c.seasons.length - 1], age, year: 2028 };
  return c;
}
function seeded<T>(seed: number, action: () => T): { value: T; draws: number[] } {
  let state = seed >>> 0;
  const draws: number[] = [];
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1791302400000);
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    state = (state + 0x6d2b79f5) | 0;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
    const draw = ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    draws.push(draw);
    return draw;
  });
  try { return { value: action(), draws }; } finally { random.mockRestore(); clock.mockRestore(); }
}
function strongCareer(): CareerState {
  const c = career();
  for (const key of ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'] as const) c[key] = 85;
  c.overall = c.peakOverall = 85;
  c.retirementSuggested = true;
  return c;
}
function finishRecordedYear(input: CareerState): CareerState | null {
  let c = input;
  const count = c.seasons.length;
  for (let step = 0; step < 30 && c.phase !== 'playing'; step++) {
    switch (c.phase) {
      case 'newspaper': c = dismissNewspaper(c); break;
      case 'season_summary': c = dismissSummary(c, FALLBACK_CLUBS); break;
      case 'ballon_dor': c = dismissBallonDor(c, FALLBACK_CLUBS); break;
      case 'world_cup': c = dismissWorldCup(c, FALLBACK_CLUBS); break;
      case 'international_debut': c = dismissDebut(c, FALLBACK_CLUBS); break;
      case 'rivalry_event': c = dismissRivalryEvent(c, FALLBACK_CLUBS); break;
      case 'social_media_action': c = dismissSocialMediaPhase(c, FALLBACK_CLUBS); break;
      case 'random_events': c = applyEventChoice(c, 0, FALLBACK_CLUBS); break;
      case 'moral_dilemma': c = dismissMoralDilemma(applyMoralDilemmaChoice(c, 1), FALLBACK_CLUBS); break;
      case 'red_card_appeal_result': c = dismissAppealResult(c, FALLBACK_CLUBS); break;
      case 'transfer_window': c = stayAtClub(c); break;
      case 'contract_offer': if (!c.pendingOffers.length) return null; c = acceptOffer(c, c.pendingOffers[0]); break;
      default: return null;
    }
    expect(c.seasons).toHaveLength(count);
  }
  return c.phase === 'playing' ? c : null;
}

describe('Soccer Career deliberate agent review', () => {
  it.each(AGENTS.map(agent => agent.id))('changes only the chosen agent, strict receipt and one honest event for %s', id => {
    const c = career();
    if (id === 'cousin') c.agentId = 'self';
    const before = clone(c);
    const from = AGENTS.find(agent => agent.id === c.agentId)!;
    const to = AGENTS.find(agent => agent.id === id)!;
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Agent review drew randomness'); });
    expect(readAgentReview(c)).toBeNull();
    expect(agentReviewEligibility(c).available).toBe(true);
    const actual = changeCareerAgent(c, id);
    const receipt = { version: 1, sourceCount: c.seasons.length, sourceYear: 2028, sourceAge: 26, fromAgent: from.id, toAgent: to.id };
    expect(actual).toEqual({ ...before, agentId: id, agentReview: receipt,
      events: [...before.events, `Changed representation from ${from.name} to ${to.name}. Existing wages and contracts stay the same; future deals use your new agent's terms.`] });
    expect(c).toEqual(before);
    expect(actual.seasons).toBe(c.seasons);
    expect(actual.pendingOffers).toBe(c.pendingOffers);
    expect(actual.intStats).toBe(c.intStats);
    expect(readAgentReview(actual)).toEqual(receipt);
    expect(changeCareerAgent(actual, 'super')).toBe(actual);
  });

  it.each([19, 26, 34, 44])('allows a settled senior career at age %i', age => {
    expect(agentReviewEligibility(career(age)).available).toBe(true);
  });

  it.each([18, 45, 26.5, NaN, Infinity])('holds the whole save at unavailable age %s', age => {
    const c = career(age);
    const before = clone(c);
    expect(agentReviewEligibility(c).available).toBe(false);
    expect(changeCareerAgent(c, 'shark')).toBe(c);
    expect(c).toEqual(before);
  });

  it.each([undefined, null, '', 'unknown', 'constructor'])('does not bypass the first identity choice for legacy agent %s', agent => {
    const c = career(); c.agentId = agent;
    const before = clone(c);
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Legacy read drew randomness'); });
    expect(agentReviewEligibility(c).available).toBe(false);
    expect(readAgentReview(c)).toBeNull();
    expect(changeCareerAgent(c, 'self')).toBe(c);
    expect(c).toEqual(before);
  });

  const invalid: [string, (c: CareerState) => void][] = [
    ['retired', c => { c.retired = true; }],
    ['not playing', c => { c.phase = 'transfer_window'; }],
    ['no recorded season', c => { c.seasons = []; }],
    ['latest youth season', c => { c.seasons[c.seasons.length - 1].type = 'youth'; }],
    ['latest retired season', c => { c.seasons[c.seasons.length - 1].type = 'retired'; }],
    ['pending age', c => { c.age++; }],
    ['missing year', c => { c.seasons[c.seasons.length - 1].year = 0; }],
    ['fractional year', c => { c.seasons[c.seasons.length - 1].year = 2028.5; }],
    ['missing recorded club', c => { c.seasons[c.seasons.length - 1].club = ''; }],
    ['non-senior recorded tier', c => { c.seasons[c.seasons.length - 1].clubTier = 6; }],
    ['interruption marker', c => { Object.assign(c.seasons[c.seasons.length - 1], { club: 'BANNED', clubTier: 99, apps: 0 }); }],
    ['missing current club', c => { c.currentClub = ' '; }],
    ['non-senior current tier', c => { c.currentClubTier = 99; }],
    ['fractional current tier', c => { c.currentClubTier = 1.5; }],
    ['nonfinite current tier', c => { c.currentClubTier = Infinity; }],
    ['malformed events', c => { (c as unknown as Record<string, unknown>).events = null; }],
    ['non-text event', c => { (c as unknown as Record<string, unknown>).events = [5]; }],
    ['missing pending event container', c => { (c as unknown as Record<string, unknown>).pendingEvents = undefined; }],
  ];
  it.each(invalid)('keeps %s completely unchanged', (_, alter) => {
    const c = career(); alter(c);
    const before = clone(c);
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Invalid review drew randomness'); });
    expect(agentReviewEligibility(c).available).toBe(false);
    expect(changeCareerAgent(c, 'shark')).toBe(c);
    expect(c).toEqual(before);
  });

  it.each(['pendingSummary', 'pendingRehab', 'pendingBallonDor', 'pendingWorldCup', 'pendingTournament', 'pendingRivalryEvent', 'pendingEvents'] as const)
    ('waits for the actual %s queue without changing the save', key => {
      const c = career();
      (c as unknown as Record<string, unknown>)[key] = key === 'pendingEvents' ? [{ id: 1 }] : { year: 2028 };
      const before = clone(c);
      expect(agentReviewEligibility(c).available).toBe(false);
      expect(changeCareerAgent(c, 'shark')).toBe(c);
      expect(c).toEqual(before);
    });

  it('reads an absent receipt without writing a field and permits recorded zero appearances', () => {
    const c = career();
    c.seasons[c.seasons.length - 1].apps = 0;
    c.pendingNews = [{ newspaper: 'Recorded paper', headline: 'Finished year', body: 'Saved presentation history', type: 'positive' }];
    const before = clone(c);
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Reading drew randomness'); });
    expect(readAgentReview(c)).toBeNull();
    expect(agentReviewEligibility(c).available).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(c, 'agentReview')).toBe(false);
    expect(c).toEqual(before);
  });

  it.each(['cousin', 'unknown', '', undefined, null])('does not consume the review for invalid or unchanged target %s', target => {
    const c = career();
    const before = clone(c);
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Invalid target drew randomness'); });
    expect(changeCareerAgent(c, target as string)).toBe(c);
    expect(c).toEqual(before);
    expect(agentReviewEligibility(c).available).toBe(true);
    expect(changeCareerAgent(c, 'shark').agentReview?.toAgent).toBe('shark');
  });

  const malformed: [string, (value: Record<string, unknown>) => void][] = [
    ['version', value => { value.version = 2; }],
    ['zero count', value => { value.sourceCount = 0; }],
    ['future count', value => { value.sourceCount = 99; }],
    ['fractional count', value => { value.sourceCount = 1.5; }],
    ['year', value => { value.sourceYear = 2029; }],
    ['age', value => { value.sourceAge = 27; }],
    ['nonfinite age', value => { value.sourceAge = Infinity; }],
    ['missing source key', value => { delete value.sourceYear; }],
    ['extra key', value => { value.club = 'Twente'; }],
    ['unknown former agent', value => { value.fromAgent = 'unknown'; }],
    ['unknown new agent', value => { value.toAgent = 'unknown'; }],
    ['same identities', value => { value.fromAgent = 'shark'; }],
  ];
  it.each(malformed)('fails closed and preserves a malformed %s receipt', (_, alter) => {
    const c = changeCareerAgent(career(), 'shark');
    alter(c.agentReview as unknown as Record<string, unknown>);
    const before = clone(c);
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Malformed review drew randomness'); });
    expect(readAgentReview(c)).toBeNull();
    expect(agentReviewEligibility(c).available).toBe(false);
    expect(changeCareerAgent(c, 'super')).toBe(c);
    expect(c).toEqual(before);
  });

  it.each([{ payload: null }, { payload: undefined }, { payload: [] }, { payload: 'unknown' }])('holds an explicitly malformed optional payload $payload', ({ payload }) => {
    const c = career();
    (c as unknown as Record<string, unknown>).agentReview = payload;
    const before = clone(c);
    expect(readAgentReview(c)).toBeNull();
    expect(agentReviewEligibility(c).available).toBe(false);
    expect(changeCareerAgent(c, 'shark')).toBe(c);
    expect(c).toEqual(before);
  });

  it.each(['reload', 'transfer', 'loan', 'rating and position'])('holds the recorded-year limit after %s', kind => {
    const reviewed = changeCareerAgent(career(), 'shark');
    const receipt = clone(reviewed.agentReview);
    const club = FALLBACK_CLUBS.find(value => value.name === 'Arsenal')!;
    let c = clone(reviewed);
    if (kind === 'reload') c = JSON.parse(JSON.stringify(c)) as CareerState;
    if (kind === 'transfer') c = acceptOffer(c, { club, wage: 80000, contractYears: 3, transferFee: 2 });
    if (kind === 'loan') c = acceptLoan(c, { club, wage: c.weeklyWage, contractYears: 1, transferFee: 0, isLoan: true });
    if (kind === 'rating and position') { c.overall++; c.position = 'ST'; }
    const before = clone(c);
    expect(readAgentReview(c)).toEqual(receipt);
    expect(agentReviewEligibility(c).available).toBe(false);
    expect(changeCareerAgent(c, 'super')).toBe(c);
    expect(c).toEqual(before);
  });

  it('keeps the same-year limit after the actual legacy agent dismissal event', () => {
    const reviewed = changeCareerAgent(career(), 'shark');
    const roll = vi.spyOn(Math, 'random').mockReturnValue(0);
    const events = getLifeEvents(clone(reviewed));
    roll.mockRestore();
    const event = events.find(value => value.id === 207);
    expect(event).toBeDefined();
    const changed = event!.choices[1].apply(clone(reviewed));
    expect(changed.agentId).toBe('self');
    expect(readAgentReview(changed)).toEqual(reviewed.agentReview);
    expect(agentReviewEligibility(changed).available).toBe(false);
    expect(changeCareerAgent(changed, 'cousin')).toBe(changed);
  });

  it.each(['year gap', 'age gap', 'count gap', 'current age behind'])('rejects contradictory later history: %s', kind => {
    const c = changeCareerAgent(career(), 'shark');
    const last = c.seasons[c.seasons.length - 1];
    c.seasons.push({ ...last, year: 2029, age: 27 }); c.age = 27;
    if (kind === 'year gap') c.seasons[c.seasons.length - 1].year++;
    if (kind === 'age gap') c.seasons[c.seasons.length - 1].age++;
    if (kind === 'count gap') c.seasons.push({ ...c.seasons[c.seasons.length - 1] });
    if (kind === 'current age behind') c.age = 26;
    const before = clone(c);
    expect(readAgentReview(c)).toBeNull();
    expect(changeCareerAgent(c, 'super')).toBe(c);
    expect(c).toEqual(before);
  });

  it.each(AGENTS.map(agent => agent.id))('uses the existing same-offer wage and transfer-cut equations for %s', id => {
    const c = career(); if (id === 'cousin') c.agentId = 'self';
    const selected = changeCareerAgent(c, id);
    const agent = AGENTS.find(value => value.id === id)!;
    const club = FALLBACK_CLUBS.find(value => value.name === 'Arsenal')!;
    const offer = { club, wage: 12345, transferFee: 7.35, contractYears: 3 };
    const before = clone(selected);
    const actual = seeded(71, () => acceptOffer(clone(selected), offer));
    expect(actual.value.weeklyWage).toBe(Math.round(offer.wage * agent.wageMult));
    expect(actual.value.agentFeesPaid).toBe(Math.round((selected.agentFeesPaid + Math.round(offer.transferFee * agent.transferCut * 100) / 100) * 100) / 100);
    expect(actual.value.netWorth).toBe(selected.netWorth);
    expect(actual.value.totalEarnings).toBe(selected.totalEarnings);
    expect(actual.draws).toEqual([]);
    expect(selected).toEqual(before);
  });

  it.each(AGENTS.map(agent => agent.id))('uses actual later-year gross-income commissions with inert receipt bytes for %s', id => {
    const c = strongCareer(); if (id === 'cousin') c.agentId = 'self';
    const agent = AGENTS.find(value => value.id === id)!;
    const reviewed = changeCareerAgent(c, id);
    const withoutReceipt = clone(reviewed); delete withoutReceipt.agentReview;
    const actual = seeded(101, () => advanceProSeason(clone(reviewed), FALLBACK_CLUBS));
    const originalRule = seeded(101, () => advanceProSeason(clone(withoutReceipt), FALLBACK_CLUBS));
    expect(actual.value).toEqual({ ...originalRule.value, agentReview: reviewed.agentReview });
    expect(actual.draws).toEqual(originalRule.draws);
    expect(actual.value.seasons).toHaveLength(reviewed.seasons.length + 1);
    const grossIncome = reviewed.weeklyWage * 52 / 1_000_000 + actual.value.sponsorshipIncome;
    const cut = Math.round(grossIncome * agent.incomeCut * 100) / 100;
    expect(actual.value.agentFeesPaid).toBe(Math.round((reviewed.agentFeesPaid + cut) * 100) / 100);
    expect(actual.value.seasons[actual.value.seasons.length - 1].year).toBe(2029);
  });

  it('unlocks only after one genuine recorded year and all its actual callbacks', () => {
    const reviewed = changeCareerAgent(strongCareer(), 'shark');
    let completed: CareerState | null = null;
    for (let seed = 1; seed <= 20 && !completed; seed++) {
      const candidate = seeded(seed, () => finishRecordedYear(advanceProSeason(clone(reviewed), FALLBACK_CLUBS))).value;
      if (candidate && agentReviewEligibility(candidate).available) completed = candidate;
    }
    expect(completed).not.toBeNull();
    const c = completed!;
    expect(c.seasons).toHaveLength(reviewed.seasons.length + 1);
    expect(c.seasons[c.seasons.length - 1]).toMatchObject({ year: 2029, age: 27, type: 'playing' });
    expect(readAgentReview(c)).toEqual(reviewed.agentReview);
    const target = c.agentId === 'super' ? 'self' : 'super';
    const actual = seeded(91, () => changeCareerAgent(c, target));
    expect(actual.draws).toEqual([]);
    expect(actual.value.agentReview).toMatchObject({ sourceCount: c.seasons.length, sourceYear: 2029, sourceAge: 27, fromAgent: c.agentId, toAgent: target });
    expect(actual.value.seasons).toBe(c.seasons);
  });
});
