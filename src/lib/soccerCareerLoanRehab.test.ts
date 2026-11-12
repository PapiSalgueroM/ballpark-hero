import { afterEach, expect, it, vi } from 'vitest';
import { mulberry32 } from '@/lib/leagueCore';
import {
  acceptLoan, acceptOffer, advanceProSeason, advanceYouthYear, applyEventChoice,
  applyRehabChoice, dismissBallonDor, dismissNewspaper, dismissSocialMediaPhase,
  dismissSummary, FALLBACK_CLUBS, initCareer, stayAtClub,
} from '@/lib/soccerCareerEngine';

const clubs = FALLBACK_CLUBS;
const stats = { pace: 62, shooting: 62, passing: 62, dribbling: 62, defending: 62, physical: 62, reflexes: 62 };

afterEach(() => vi.restoreAllMocks());

function seed(value: number) {
  return vi.spyOn(Math, 'random').mockImplementation(mulberry32(value)).mockClear();
}

function firstWindow() {
  seed(1);
  let career = initCareer('Loan Recovery Test', 'England', 'CM', '2020s', stats, 62, 2022, clubs, null, 83, null, null, 'Arsenal');
  career = advanceYouthYear(career, clubs);
  const contract = career.pendingOffers.find(offer => offer.club.name === 'Arsenal')!;
  expect(contract.isHomegrown).toBe(true);
  career = acceptOffer(career, contract);
  career = advanceProSeason(career, clubs);
  career = dismissNewspaper(career);
  career = dismissSummary(career, clubs);
  career = dismissBallonDor(career, clubs);
  career = dismissSocialMediaPhase(career, clubs);
  for (let i = 0; i < 8 && career.phase === 'random_events'; i++) career = applyEventChoice(career, 0, clubs);
  expect(career.phase).toBe('transfer_window');
  return career;
}

function offeredLoan() {
  const window = firstWindow();
  const offer = window.pendingLoanOffers![0];
  expect([offer.club.name, offer.contractYears, offer.wage]).toEqual(['Sporting CP', 1, window.weeklyWage]);
  return acceptLoan(window, offer);
}

it('returns the injured loanee to the parent before the next season', () => {
  const loan = offeredLoan();
  const seasonDraws = seed(43);
  const injury = advanceProSeason(loan, clubs);
  const row = injury.seasons.at(-1)!;
  expect(injury.phase).toBe('rehab_choice');
  expect(injury.pendingRehab?.name).toBe('Ruptured quad');
  expect([row.year, row.club, row.apps, row.onLoanFrom]).toEqual([2025, 'Sporting CP', 27, 'Arsenal']);
  expect(seasonDraws).toHaveBeenCalledTimes(18);
  const stored = JSON.parse(JSON.stringify(injury));
  const rehabDraws = seed(123);

  const back = applyRehabChoice(stored, 1, clubs);
  expect(back.phase).toBe('playing');
  expect(back.loan).toBeNull();
  expect([back.currentClub, back.currentClubCountry, back.currentClubTier, back.currentLeague, back.currentClubColor])
    .toEqual(['Arsenal', 'England', 1, 'Premier League', '#EF0107']);
  expect(back.seasons).toEqual(injury.seasons);
  expect([back.age, back.weeklyWage, back.contractYearsLeft, back.pace, back.physical, back.netWorth])
    .toEqual([injury.age, injury.weeklyWage, injury.contractYearsLeft, injury.pace - 2, injury.physical - 1, injury.netWorth]);
  expect(back.seriousInjuries?.at(-1)).toMatchObject({ year: 2025, path: 'plan', setback: false });
  expect(back.events.filter(line => line.includes('Loan over. Back at Arsenal'))).toHaveLength(1);
  expect(rehabDraws).not.toHaveBeenCalled();

  seed(1);
  const next = advanceProSeason(back, clubs).seasons.at(-1)!;
  expect([next.year, next.club, next.onLoanFrom]).toEqual([2026, 'Arsenal', undefined]);
});

it('completes the parent return after an old pending rehab save records its missing injury year', () => {
  const loan = offeredLoan();
  seed(43);
  const injury = advanceProSeason(structuredClone(loan), clubs);
  const legacy = { ...loan, age: injury.age, phase: injury.phase, pendingRehab: injury.pendingRehab };
  expect(legacy.seasons.at(-1)?.year).toBe(2024);
  seed(123);
  const back = applyRehabChoice(legacy, 1);

  expect([back.phase, back.currentClub, back.loan]).toEqual(['playing', 'Arsenal', null]);
  expect(back.seasons).toHaveLength(legacy.seasons.length + 1);
  expect(back.seasons.at(-1)).toMatchObject({ year: 2025, club: 'Sporting CP', apps: 0, onLoanFrom: 'Arsenal', injurySevere: true });
  expect(back.seriousInjuries?.at(-1)).toMatchObject({ year: 2025, path: 'plan' });
});

it('preserves the healthy loan return, history and seeded draws', () => {
  const loan = offeredLoan();
  const draws = seed(1);
  const back = advanceProSeason(loan, clubs);

  expect([back.currentClub, back.loan, back.age, back.weeklyWage, back.contractYearsLeft])
    .toEqual(['Arsenal', null, 19, loan.weeklyWage, loan.contractYearsLeft - 1]);
  expect(back.seasons.at(-1)).toMatchObject({ year: 2025, club: 'Sporting CP', apps: 36, goals: 7, onLoanFrom: 'Arsenal' });
  expect(back.events).toContain('🔙 Loan over. Back at Arsenal, and the pecking order has not moved much: about 8 to 18 league games unless something changes.');
  expect(draws).toHaveBeenCalledTimes(158);
});

it('leaves a home-club rehab at home with its original recovery', () => {
  const home = stayAtClub(firstWindow());
  seed(6);
  const injury = advanceProSeason(home, clubs);
  expect(injury.phase).toBe('rehab_choice');
  const draws = seed(123);
  const back = applyRehabChoice(injury, 1, clubs);

  expect([back.phase, back.currentClub, back.loan]).toEqual(['playing', 'Arsenal', null]);
  expect(back.seasons.at(-1)).toMatchObject({ year: 2025, club: 'Arsenal', apps: 6, injurySevere: true });
  expect([back.age, back.weeklyWage, back.contractYearsLeft, back.pace, back.physical, back.morale])
    .toEqual([injury.age, injury.weeklyWage, injury.contractYearsLeft, injury.pace - 2, injury.physical - 1, injury.morale]);
  expect(back.events.some(line => line.includes('Loan over'))).toBe(false);
  expect(draws).not.toHaveBeenCalled();
});
