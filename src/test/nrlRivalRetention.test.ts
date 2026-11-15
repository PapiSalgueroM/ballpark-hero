import { expect, it } from 'vitest';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import {
  createNrlCareer, nrlCareerCap, nrlCareerMarket, nrlContractOffer, nrlLeagueRecruitmentPreview,
  nrlOffseasonClubs, nrlSeasonOut, readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { NRL_ROLES } from '@/lib/nrlManager';

const start = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'startNextSeason' });
const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const asClub = (state: NrlCareerState, clubId: string): NrlCareerState => ({
  ...state, season: { ...state.season, clubId },
});
const contract = (state: NrlCareerState, id: string) => state.players.find(player => player.id === id)?.contract;

function finish(state: NrlCareerState) {
  while (state.season.phase !== 'complete') state = reduceNrlCareer(state, { type: 'advance' });
  return state;
}

const cases = [
  [2026, 'storm', 'dolphins', 'nrl-dolphins-2026-9'],
  [2027, 'bears', 'warriors', 'nrl-warriors-2027-0'],
] as const;

it.each(cases)('renews a rival key player in %i while every active contract survives', (year, clubId, rivalId, keyId) => {
  const complete = finish(createNrlCareer(clubId, 4, year));
  const expiring = nrlCareerMarket(asClub(complete, rivalId)).find(({ player }) => player.id === keyId)!;
  expect(expiring.kind).toBe('renewal');
  expect(expiring.player.contract?.endYear).toBe(year);
  expect(complete.players.some(player => player.id !== keyId && player.contract?.clubId === rivalId
    && player.contract.endYear === year)).toBe(true);
  const saved = read(complete)!;
  const next = start(saved);
  expect(contract(next, keyId)).toEqual({
    clubId: rivalId, salary: expiring.askingSalary, startYear: year + 1, endYear: year + 1,
  });
  for (const player of complete.players.filter(player => player.contract && player.contract.endYear > year)) {
    expect(contract(next, player.id)).toEqual(player.contract);
  }
  for (const { id } of nrlSeasonPlan(year + 1).clubs) {
    const squad = next.players.filter(player => player.contract?.clubId === id);
    expect(squad).toHaveLength(30);
    expect(new Set(squad.map(player => player.role))).toEqual(new Set(NRL_ROLES));
    expect(nrlCareerCap(asClub(next, id)).available).toBeGreaterThanOrEqual(0);
  }
  expect(start(complete)).toEqual(next);
  expect(read(next)).toEqual(next);
});

it('keeps the rival renewal at one year when the optional external recruitment deals are applied', () => {
  const complete = finish(createNrlCareer('storm', 4));
  const keyId = 'nrl-dolphins-2026-9';
  const withRecruitment = reduceNrlCareer(complete, { type: 'setLeagueRecruitment', year: 2026, clubId: 'storm', enabled: true });
  const preview = nrlLeagueRecruitmentPreview(withRecruitment)!;
  expect(preview.length).toBeGreaterThan(0);
  expect(preview.some(deal => deal.playerId === keyId)).toBe(false);
  const next = start(withRecruitment);
  expect(next.history.at(-1)?.leagueRecruitment).toEqual(preview);
  expect(contract(next, keyId)).toMatchObject({ clubId: 'dolphins', endYear: 2027 });
  expect(read(next)).toEqual(next);
});

it('keeps an existing commitment at a full rival cap and leaves the key player available to another club', () => {
  const complete = finish(createNrlCareer('storm', 4));
  const rival = asClub(complete, 'dolphins');
  const { available, minimumSalary } = nrlCareerCap(rival, 2027);
  const committedId = 'nrl-dolphins-2026-12';
  const quote = nrlContractOffer(rival, committedId, available + minimumSalary, 1);
  expect(quote.ok).toBe(true);
  if (!quote.ok) return;
  const constrained = read({
    ...complete,
    players: complete.players.map(player => player.id === committedId ? { ...player, futureContract: quote.contract } : player),
  })!;
  expect(nrlCareerCap(asClub(constrained, 'dolphins'), 2027).available).toBe(0);
  const next = start(constrained);
  expect(contract(next, committedId)).toEqual(quote.contract);
  expect(contract(next, 'nrl-dolphins-2026-9')?.clubId).toBe('broncos');
  expect(nrlCareerCap(asClub(next, 'dolphins')).available).toBe(0);
  expect(read(next)).toEqual(next);
});

it('honors a pre-agreed arrival and still settles the preview exactly when taking over a rival club', () => {
  const complete = finish(createNrlCareer('storm', 4));
  const keyId = 'nrl-dolphins-2026-9';
  const target = nrlCareerMarket(complete).find(({ player }) => player.id === keyId)!;
  const agreed = reduceNrlCareer(complete, { type: 'offerContract', playerId: keyId, salary: target.askingSalary, years: 2 });
  expect(agreed).not.toBe(complete);
  const future = agreed.players.find(player => player.id === keyId)?.futureContract;
  expect(future).toMatchObject({ clubId: 'storm', startYear: 2027, endYear: 2028 });
  expect(contract(start(read(agreed)!), keyId)).toEqual(future);

  const destination = 'dolphins';
  expect(nrlOffseasonClubs(agreed).some(club => club.id === destination)).toBe(true);
  const move = { type: 'startNextSeason', move: { fromYear: 2026, clubId: destination } } as const;
  expect(contract(reduceNrlCareer(complete, move), keyId)?.clubId).toBe('broncos');
  const withRecruitment = reduceNrlCareer(agreed, { type: 'setLeagueRecruitment', year: 2026, clubId: 'storm', enabled: true });
  const preview = nrlLeagueRecruitmentPreview(withRecruitment, destination)!;
  expect(preview.every(deal => !['storm', destination].includes(deal.clubId))).toBe(true);
  const next = reduceNrlCareer(read(withRecruitment)!, move);
  expect(next.season.clubId).toBe(destination);
  expect(next.history.at(-1)?.leagueRecruitment).toEqual(preview);
  expect(contract(next, keyId)).toEqual(future);
  expect(read(next)).toEqual(next);
});

it('lets the former club renew a player during an unattended season and saves those results at re-entry', () => {
  const year = 2027, clubId = 'bears', destinationId = 'sea-eagles';
  const complete = finish(createNrlCareer(clubId, 4, year));
  const departed = reduceNrlCareer(complete, { type: 'leaveClub', year, clubId });
  expect(departed.outOfWork).toBe(true);
  const skipped = read(reduceNrlCareer(departed, { type: 'simulateSeasonOut', year, clubId }))!;
  expect(skipped.satOutSeason).toBe(true);
  const report = nrlSeasonOut(skipped)!;
  expect(report.vacancies.some(job => job.clubId === destinationId)).toBe(true);
  expect(report.leagueLadder.find(row => row[0] === clubId)).toEqual(['bears', 7, 0, 434, 621]);
  const next = reduceNrlCareer(skipped, { type: 'acceptVacancy', year, clubId, destinationId, joinYear: 2029 });
  expect(next.season).toMatchObject({ year: 2029, clubId: destinationId, round: 1 });
  expect(next.history.at(-1)?.seasonOut?.leagueLadder).toEqual(report.leagueLadder);
  for (const player of complete.players.filter(player => player.contract && player.contract.endYear >= 2029)) {
    expect(contract(next, player.id)).toEqual(player.contract);
  }
  expect(read(next)).toEqual(next);
});
