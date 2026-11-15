import { describe, expect, it, vi } from 'vitest';
import {
  acceptLoan, acceptOffer, advanceProSeason, advanceYouthYear, applyRehabChoice, calcOverall, FALLBACK_CLUBS, initCareer, manualRetire, repairCareer,
  signExtension, stayAtClub,
  type CareerState,
} from '@/lib/soccerCareerEngine';
import { announceSoccerFarewell, farewellSeasonComplete } from '@/lib/soccerCareerFarewell';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import { mulberry32 } from '@/lib/leagueCore';

function seeded<T>(seed: number, run: () => T): T {
  const random = vi.spyOn(Math, 'random').mockImplementation(mulberry32(seed));
  try { return run(); } finally { random.mockRestore(); }
}

function signedCareer(inSeason = false): CareerState {
  const clubs = FALLBACK_CLUBS;
  const signed = seeded(166, () => {
    const academy = initCareer('Fixture Prospect', 'England', 'ST', '2020', {
      pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60, reflexes: 60,
    }, 60, 2020, clubs);
    const offered = advanceYouthYear(academy, clubs, inSeason);
    return acceptOffer(offered, offered.pendingOffers[0]);
  });
  expect(signed.phase).toBe('playing');
  return signed;
}

function injuredCareer(): CareerState {
  const signed = signedCareer();
  const clubs = FALLBACK_CLUBS;
  const career = seeded(13, () => advanceProSeason(signed, clubs));
  expect(career.phase).toBe('rehab_choice');
  expect(career.pendingRehab?.name).toBe('ACL rupture');
  return career;
}

function load(career: CareerState) {
  const parsed = parseSoccerCareerSave(serializeSoccerCareerSave(career));
  expect(isSoccerCareerSave(parsed)).toBe(true);
  return repairCareer(parsed as CareerState);
}

describe('Soccer Career rehab save recovery', () => {
  it('spends the injured season once while the active contract and rehab carry across reload', () => {
    const before = signedCareer(true);
    const paid = seeded(13, () => advanceProSeason(before, FALLBACK_CLUBS, true));
    expect(paid.seasons.at(-1)).toMatchObject({ year: 2022, apps: 19, injury: 'ACL rupture' });
    expect(paid).toMatchObject({ phase: 'rehab_choice', contractYearsLeft: 4, weeklyWage: before.weeklyWage });
    const after = load(seeded(166, () => applyRehabChoice(load(paid), 1, FALLBACK_CLUBS)));
    expect(after).toMatchObject({ phase: 'playing', contractYearsLeft: 4, weeklyWage: before.weeklyWage, currentClub: before.currentClub });
    expect(after.seasons).toHaveLength(before.seasons.length + 1);
    expect(after.seriousInjuries?.at(-1)).toMatchObject({ path: 'plan', year: 2022 });
    expect(stayAtClub(after)).toMatchObject({ contractYearsLeft: 4, weeklyWage: before.weeklyWage });
  });

  it.each([[0, 'rushed'], [1, 'plan'], [2, 'specialist']] as const)(
    'opens ordinary expiry only after the %s rehab choice and keeps the played year once',
    (choice, path) => {
      const before = { ...signedCareer(true), contractYearsLeft: 1, netWorth: 3 };
      const healthy = seeded(166, () => advanceProSeason(before, FALLBACK_CLUBS, true));
      const paid = load(seeded(13, () => advanceProSeason(before, FALLBACK_CLUBS, true)));
      expect(healthy.contractYearsLeft).toBe(0);
      expect(paid).toMatchObject({ phase: 'rehab_choice', contractYearsLeft: 0, weeklyWage: before.weeklyWage, transferSituation: null });
      expect(paid.pendingRehab?.name).toBe('ACL rupture');
      const offered = load(seeded(166, () => applyRehabChoice(paid, choice, FALLBACK_CLUBS)));
      expect(offered).toMatchObject({ phase: 'transfer_window', contractYearsLeft: 0, weeklyWage: before.weeklyWage, pendingRehab: null });
      expect(offered.seasons).toHaveLength(before.seasons.length + 1);
      expect(offered.seriousInjuries).toMatchObject([{ path, year: 2022 }]);
      expect(offered.transferSituation?.type).toBe('contract_expiry');
      if (offered.transferSituation?.type !== 'contract_expiry') throw new Error('Expected contract expiry offers');
      expect(offered.transferSituation.offers.length).toBeGreaterThan(0);
      expect(offered.transferSituation.offers.every(offer => offer.transferFee === 0)).toBe(true);
      expect(applyRehabChoice(offered, choice, FALLBACK_CLUBS)).toBe(offered);

      const extended = seeded(166, () => signExtension(offered));
      expect(extended.phase).toBe('playing');
      expect(extended.contractYearsLeft).toBeGreaterThan(0);
      expect(extended.weeklyWage).toBe(Math.round(before.weeklyWage * 1.15));
      const free = offered.transferSituation.offers[0];
      const moved = seeded(166, () => acceptOffer(offered, free));
      expect(moved).toMatchObject({ phase: 'playing', currentClub: free.club.name, contractYearsLeft: free.contractYears, weeklyWage: free.wage });
      expect(moved.seasons).toEqual(offered.seasons);
    },
  );

  it('keeps the recorded terms of older pending and completed rehab saves', () => {
    const before = { ...signedCareer(true), contractYearsLeft: 1 };
    const injured = seeded(13, () => advanceProSeason(before, FALLBACK_CLUBS, true));
    const legacy = load({ ...injured, contractYearsLeft: 1, pendingRehab: {
      name: 'ACL rupture', weeks: injured.pendingRehab!.weeks, year: 2022, specialistCost: null,
    } });
    expect(legacy.contractYearsLeft).toBe(1);
    const after = seeded(166, () => applyRehabChoice(legacy, 1, FALLBACK_CLUBS));
    expect(after).toMatchObject({ phase: 'playing', contractYearsLeft: 1, weeklyWage: before.weeklyWage, transferSituation: null });
    expect(load(after)).toEqual(after);
    expect(after.seasons).toHaveLength(before.seasons.length + 1);
    expect(after.seriousInjuries).toHaveLength(1);
  });

  it('takes an expired parent-club contract back from loan after rehab', () => {
    const before = { ...signedCareer(true), contractYearsLeft: 1 };
    const club = FALLBACK_CLUBS.find(row => row.name === 'Twente')!;
    const loan = acceptLoan(before, { club, contractYears: 1, wage: before.weeklyWage, transferFee: 0, isLoan: true });
    const paid = load(seeded(13, () => advanceProSeason(loan, FALLBACK_CLUBS, true)));
    expect(paid).toMatchObject({ phase: 'rehab_choice', contractYearsLeft: 0, currentClub: 'Twente', weeklyWage: before.weeklyWage });
    expect(paid.seasons.at(-1)).toMatchObject({ club: 'Twente', onLoanFrom: before.currentClub });
    const after = load(seeded(166, () => applyRehabChoice(paid, 1, FALLBACK_CLUBS)));
    expect(after).toMatchObject({ phase: 'transfer_window', contractYearsLeft: 0, loan: null,
      currentClub: before.currentClub, currentLeague: before.currentLeague, weeklyWage: before.weeklyWage });
    expect(after.transferSituation?.type).toBe('contract_expiry');
    expect(after.seasons.at(-1)).toMatchObject({ club: 'Twente', onLoanFrom: before.currentClub });
  });

  it.each([undefined, null])('reopens a rehab save with no choice payload (%s) and can play its next season', missing => {
    const normal = load(injuredCareer());
    const saved = { ...normal, pendingRehab: missing };
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Save recovery drew randomness'); });
    let recovered;
    try { recovered = load(saved); } finally { random.mockRestore(); }
    expect(recovered.phase).toBe('playing');
    expect(serializeSoccerCareerSave(recovered)).toBe(serializeSoccerCareerSave({ ...saved, phase: 'playing' }));
    expect(load(recovered)).toEqual(recovered);
    const next = seeded(166, () => advanceProSeason(recovered, FALLBACK_CLUBS));
    expect(next.seasons.length).toBe(recovered.seasons.length + 1);
  });

  it.each([
    [0, 7, 5, 2, 'rushed'],
    [0, 166, 2, 0, 'rushed'],
    [1, 166, 2, 1, 'plan'],
    [2, 166, 1, 0, 'specialist'],
  ] as const)('carries the actual injury recovery into the save for choice %s and roll %s', (choice, seed, paceLoss, physicalLoss, path) => {
    const injured = load(injuredCareer());
    const before = { ...injured, netWorth: 2, pendingRehab: { ...injured.pendingRehab!, specialistCost: 0.8 } };
    const season = before.seasons.at(-1)!;
    const after = seeded(seed, () => applyRehabChoice(before, choice));

    expect(after.seriousInjuries?.at(-1)?.path).toBe(path);
    expect(after.pace).toBe(before.pace - paceLoss);
    expect(after.physical).toBe(before.physical - physicalLoss);
    expect(after.overall).toBe(calcOverall(after, after.position));
    expect(after.seasons.at(-1)).toEqual({ ...season, rehabOverall: [before.overall, after.overall] });
    expect(season.rehabOverall).toBeUndefined();
    expect(after.seasons.slice(0, -1)).toEqual(before.seasons.slice(0, -1));
    expect(load(after)).toEqual(after);

    const next = seeded(166, () => advanceProSeason(load(after), FALLBACK_CLUBS, true));
    expect(next.seasons.at(-1)?.ratingPath?.[0]).toBe(after.overall);
    expect(next.seasons.at(-2)?.rehabOverall).toEqual([before.overall, after.overall]);
  });

  it('preserves a healthy pending choice and a finished career', () => {
    const valid = load(injuredCareer());
    expect(valid.phase).toBe('rehab_choice');
    expect(valid.pendingRehab?.name).toBe('ACL rupture');
    expect(load(valid)).toEqual(valid);
    const retired = load(manualRetire({ ...valid, pendingRehab: null }));
    expect(retired.retired).toBe(true);
    expect(load({ ...retired, phase: 'rehab_choice' })).toEqual(retired);
  });

  it('preserves a completed farewell instead of opening an extra playing year', () => {
    const valid = load(injuredCareer());
    const last = { ...valid.seasons.at(-1)!, age: 31 };
    const source: CareerState = { ...valid, phase: 'playing', age: 31, overall: 80,
      pendingRehab: null, seasons: [...valid.seasons.slice(0, -1), last] };
    const announced = announceSoccerFarewell(source);
    const interrupted: CareerState = { ...announced, phase: 'rehab_choice', age: 32,
      seasons: [...announced.seasons, { ...last, year: last.year + 1, age: 32 }] };
    expect(farewellSeasonComplete(interrupted)).toBe(true);
    expect(load(interrupted)).toEqual(interrupted);
  });
});
