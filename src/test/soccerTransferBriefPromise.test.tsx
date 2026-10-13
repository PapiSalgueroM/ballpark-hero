/* Release AW, a seam git merged without a word.
 *
 * Since the season plan (Rounds 1197 to 1208) a club that broke its appearance promise always grants a
 * transfer request: requestTransfer draws its coin and then reads programmePromiseBroken. The agent brief
 * (Rounds 1235 to 1237) was cut from a tree older than that rule, and its own request path,
 * requestTransferDecision with a brief filed, carried a copy of the plain coin toss. On the merged head a
 * player with a broken promise would get a certain answer without a brief and a coin toss with one.
 *
 * These cases hold the rule on BOTH paths, through the engine's own functions and a real settled season:
 * a promise broken by a fit league shortfall, a refusing coin (0.9), and the request is still answered. The
 * last two cases are the other half: with the promise met, or with no plan at all, the coin still decides,
 * so the rule cannot be satisfied by granting everything.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AgentBrief from '@/components/soccer-career/AgentBrief';
import {
  acceptOffer, FALLBACK_CLUBS, initCareer, projectLeagueApps, repairCareer, requestTransferDecision,
  type CareerState,
} from '@/lib/soccerCareerEngine';
import { soccerTransferTerms } from '@/lib/soccerCareerContracts';
import { chooseProgramme, nextProgrammeYear, programmePromiseBroken, settleSoccerProgramme } from '@/lib/soccerCareerProgramme';
import { readTransferBrief, setTransferBrief, transferBriefResult } from '@/lib/soccerCareerTransferBrief';

const parent = FALLBACK_CLUBS.find(club => club.name === 'Real Madrid')!;
/* The first value is the request's coin: 0.9 is a refusal on a plain coin toss. The rest feed the offer. */
const REFUSING = [0.9, 0.1, 0.2, 0.3, 0.25, 0.3, 0.4];

/** A transfer window with no offer, after a second season at the club that held (or did not hold) a promise. */
function windowAfter(leagueApps: number, promise: boolean): CareerState {
  const overall = 77;
  const stats = { pace: overall, shooting: overall, passing: overall, dribbling: overall, defending: overall, physical: overall, reflexes: overall };
  const started = initCareer('Promise Tester', 'Brazil', 'ST', '2020s', stats, overall, 2026, FALLBACK_CLUBS, null, 99);
  const pro = repairCareer(acceptOffer(started, { club: parent, contractYears: 4, wage: 100000, transferFee: 0 }));
  const first = { ...started.seasons[0], year: 2027, age: 25, type: 'playing' as const, club: parent.name,
    clubCountry: parent.country, clubTier: parent.tier, apps: 32, leagueApps: 30, goals: 12, assists: 6, rating: 7.2,
    injury: null, injuryWeeks: 0, injurySevere: false };
  let state: CareerState = { ...pro, age: 26, overall, phase: 'playing', retired: false, loan: null, rival: null,
    transferSituation: null, seasons: [first] };
  if (promise) {
    state = chooseProgramme(state, 'promise', 'rotation');
    expect(state.programme?.plan?.choices.promise, 'the fixture really agreed the 18 appearance promise').toBe('rotation');
  }
  const second = { ...first, year: nextProgrammeYear(state)!, age: 26, apps: leagueApps + 2, leagueApps };
  state = { ...state, seasons: [...state.seasons, second] };
  settleSoccerProgramme(state, second);
  return { ...state, age: 27, phase: 'transfer_window', transferSituation: { type: 'no_interest' } };
}
function run<T>(action: () => T, values = REFUSING): { value: T; draws: number[] } {
  const draws: number[] = [];
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    const value = values[draws.length % values.length];
    draws.push(value);
    return value;
  });
  try { return { value: action(), draws }; } finally { random.mockRestore(); }
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
beforeEach(() => localStorage.clear());

/** The brief's rules as a player first reads them (the storage is empty, so the rules come before the choices). */
async function rulesText(career: CareerState): Promise<string> {
  render(<AgentBrief career={career} clubs={FALLBACK_CLUBS} onCareer={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Set transfer priority' }));
  await screen.findByRole('dialog', { name: 'Your transfer brief' });
  return document.querySelector('[data-transfer-brief-help]')?.textContent ?? '';
}

describe('The brief tells the player the chance that is really used', () => {
  it('a player whose club broke its promise is told the request gets a response, not a coin toss', async () => {
    const text = await rulesText(windowAfter(17, true));
    expect(text).toContain('Your club broke its appearance promise, so this request gets a response for sure.');
    expect(text).not.toContain('50%');
  });
  it('every other player still reads the 50 percent rule', async () => {
    expect(await rulesText(windowAfter(30, true))).toContain('The response chance stays 50%.');
    cleanup();
    const text = await rulesText(windowAfter(17, false));
    expect(text).toContain('The response chance stays 50%.');
    expect(text).not.toContain('broke its appearance promise');
  });
});

describe('A broken appearance promise grants the transfer request, with or without an agent brief', () => {
  it('the fixture is a real broken promise: 17 league games against 18 promised, fit all year', () => {
    const state = windowAfter(17, true);
    expect(state.programme?.receipts.slice(-1)[0]?.promise).toBe('broken');
    expect(programmePromiseBroken(state)).toBe(true);
    expect(programmePromiseBroken(windowAfter(30, true))).toBe(false);
    expect(programmePromiseBroken(windowAfter(17, false))).toBe(false);
  });

  it('without a brief a refusing coin still brings the request an answer', () => {
    const state = windowAfter(17, true);
    const { value, draws } = run(() => requestTransferDecision(state, FALLBACK_CLUBS));
    expect(draws[0]).toBe(0.9);
    expect(value.phase).toBe('transfer_window');
    expect(value.transferSituation?.type).toBe('request_result');
    expect(value.transferSituation && 'offer' in value.transferSituation ? value.transferSituation.offer : null).not.toBeNull();
  });

  for (const priority of ['minutes', 'level', 'home'] as const) {
    it(`with the ${priority} brief filed a refusing coin still brings the request an answer`, () => {
      const filed = setTransferBrief(windowAfter(17, true), priority);
      expect(readTransferBrief(filed, projectLeagueApps)?.priority, 'the brief is really filed for this window').toBe(priority);
      expect(programmePromiseBroken(filed)).toBe(true);
      const { value, draws } = run(() => requestTransferDecision(filed, FALLBACK_CLUBS));
      /* The coin is drawn first, as the plain request draws it, and is then overruled by the broken promise. */
      expect(draws[0]).toBe(0.9);
      const result = transferBriefResult(value, projectLeagueApps);
      expect(result, 'the request stored its one answer').not.toBeNull();
      expect(result?.status).not.toBe('no_interest');
      expect(['offered', 'no_match']).toContain(result?.status);
    });
  }

  it('with the promise met the coin still decides the brief: a refusing coin is a refusal', () => {
    const filed = setTransferBrief(windowAfter(30, true), 'level');
    expect(readTransferBrief(filed, projectLeagueApps)?.priority).toBe('level');
    const { value, draws } = run(() => requestTransferDecision(filed, FALLBACK_CLUBS));
    expect(draws).toEqual([0.9]);
    expect(transferBriefResult(value, projectLeagueApps)?.status).toBe('no_interest');
  });

  it('with no plan at all the coin still decides, on both paths', () => {
    const plain = windowAfter(17, false);
    const refused = run(() => requestTransferDecision(plain, FALLBACK_CLUBS));
    expect(refused.draws).toEqual([0.9]);
    expect(refused.value.phase).toBe('playing');
    expect(refused.value.transferSituation).toBeNull();
    const filed = setTransferBrief(plain, 'level');
    const answered = run(() => requestTransferDecision(filed, FALLBACK_CLUBS));
    expect(answered.draws).toEqual([0.9]);
    expect(transferBriefResult(answered.value, projectLeagueApps)?.status).toBe('no_interest');
  });
});

/* Release AW fix pass, review sc-engine finding 2: nothing held the other seam of the same function.
 *
 * Since Rounds 1262 to 1264 a new club's wage follows age and form from 30 (soccerTransferTerms). The brief's
 * request path makes its own offer, one function below the plain request's, and the merge hands it the
 * player's seasons so that an offer that answers a brief gets the same terms. A mutation that handed it no
 * seasons (a veteran's form never reaches the quote) survived every test and harness of the tree. These
 * cases hold it through the engine's own functions: one request, one tape of draws, and players who differ
 * only in their age or in the rating of the season just played.
 */
const ACCEPTING = [0.1, 0.1, 0.2, 0.3, 0.25, 0.3, 0.4];
/** The window of windowAfter with the level brief filed, for a player of overall 82 of the given age and form. */
function briefWindow(age: number, lastRating: number): CareerState {
  const base = windowAfter(30, false);
  const count = base.seasons.length;
  const seasons = base.seasons.map((row, index) => ({ ...row, age: age - count + index, rating: index === count - 1 ? lastRating : row.rating }));
  const filed = setTransferBrief({ ...base, age, overall: 82, seasons }, 'level');
  expect(readTransferBrief(filed, projectLeagueApps)?.priority, 'the brief is really filed for this window').toBe('level');
  return filed;
}
function briefOffer(state: CareerState) {
  const { value, draws } = run(() => requestTransferDecision(state, FALLBACK_CLUBS), ACCEPTING);
  const result = transferBriefResult(value, projectLeagueApps);
  expect(result?.status, 'an accepting coin and a club that fits: the brief is answered with an offer').toBe('offered');
  return { offer: result!.offer!, draws };
}

describe('An offer that answers a brief follows age and form, like every other new club offer', () => {
  it('a 34 year old after a 6.4 season is offered 80 percent of what his 29 year old twin is offered', () => {
    const veteran = briefWindow(34, 6.4);
    const old = briefOffer(veteran), young = briefOffer(briefWindow(29, 6.4));
    /* A real twin: the same draws pick the same club and the same years, and under 30 the drawn wage stands. */
    expect(old.draws).toEqual(young.draws);
    expect(old.offer.club.name).toBe(young.offer.club.name);
    expect(old.offer.contractYears).toBe(young.offer.contractYears);
    const drawn = young.offer.wage;
    expect(drawn).toBeGreaterThanOrEqual(80000);
    expect(old.offer.wage).toBe(soccerTransferTerms(veteran, drawn, young.offer.contractYears).wage);
    expect(old.offer.wage).toBe(Math.round(drawn * 0.8));
  });

  it('the same veteran after a 7.2 season keeps the drawn wage: it is his own last season the quote reads', () => {
    const drawn = briefOffer(briefWindow(29, 6.4)).offer.wage;
    expect(briefOffer(briefWindow(34, 7.2)).offer.wage).toBe(drawn);
    expect(briefOffer(briefWindow(29, 7.2)).offer.wage).toBe(drawn);
  });
});
