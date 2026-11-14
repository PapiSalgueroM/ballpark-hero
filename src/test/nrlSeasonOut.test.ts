import { describe, expect, it } from 'vitest';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import {
  createNrlCareer, createNrlCustomCareer, nrlCareerCap, nrlCareerRecord, nrlMutualReleaseQuote, nrlOffseasonOpportunities, nrlSeasonOut, readNrlCareerSave,
  reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { nrlArchivedFinals } from '@/lib/nrlManager';

const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
function finish(start: NrlCareerState) {
  let state = start;
  for (let round = 0; round < 36 && state.season.phase !== 'complete'; round++) state = advance(state);
  expect(state.season.phase).toBe('complete');
  return state;
}
const reload = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const action = (state: NrlCareerState) => ({ year: state.season.year, clubId: state.season.clubId });
const leave = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'leaveClub', ...action(state) });
const wait = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'simulateSeasonOut', ...action(state) });

it.each([2026, 2027] as const)('advances an entire CPU season after leaving a %s club', year => {
  const start = createNrlCustomCareer('storm', 4, year, { name: 'River City', ground: 'River Ground', colour: 'teal' })!;
  const ended = finish(start);
  expect(wait(ended) === ended).toBe(true);
  const departed = leave(ended);
  expect(reduceNrlCareer(departed, { type: 'simulateSeasonOut', ...action(departed), year: year - 1 }) === departed).toBe(true);
  expect(nrlSeasonOut(departed)).toBeNull();
  const skipped = wait(departed);
  expect(skipped.satOutSeason).toBe(true);
  expect(wait(skipped)).toBe(skipped);
  expect(skipped.season).toBe(ended.season);
  expect(skipped.players).toBe(ended.players);
  expect(skipped.history).toBe(ended.history);
  expect(reload(skipped)).toEqual(skipped);
  const report = nrlSeasonOut(reload(skipped)!)!;
  expect(report.year).toBe(year + 1);
  expect(report.ladder).toHaveLength(nrlSeasonPlan(report.year).clubs.length);
  expect(nrlArchivedFinals(report.finals, report.year)?.championId).toBe(report.championId);
  expect(nrlSeasonOut(wait(departed))).toEqual(report);
  const vacancies = nrlOffseasonOpportunities(skipped);
  expect(vacancies.length).toBeGreaterThan(0);
  expect(vacancies.filter(job => job.reason === 'missed').every(job => report.ladder[job.rank - 1] === job.clubId)).toBe(true);
  const pick = { type: 'acceptVacancy' as const, ...action(skipped), destinationId: vacancies[0].clubId };
  expect(reduceNrlCareer(skipped, pick)).toBe(skipped);
  const next = reduceNrlCareer(skipped, { ...pick, joinYear: year + 2 });
  expect(next.season).toMatchObject({ year: year + 2, clubId: vacancies[0].clubId, round: 1, results: [] });
  expect(next.outOfWork).toBeUndefined();
  expect(next.satOutSeason).toBeUndefined();
  expect(next.customClub).toEqual(start.customClub);
  expect(next.history).toHaveLength(1);
  expect(next.history[0]).toMatchObject({ ...ended.history[0], rejoinedClubId: vacancies[0].clubId, seasonOut: { ladder: report.ladder, finals: report.finals } });
  expect(nrlCareerRecord(next.history)).toEqual(nrlCareerRecord(ended.history));
  expect(nrlCareerCap(next).available).toBeGreaterThanOrEqual(0);
  const currentIds = new Set(next.players.map(player => player.id));
  expect(next.players.some(player => player.contract?.startYear === year + 2)).toBe(true);
  expect(currentIds.size).toBe(next.players.length);
  expect(reload(next)).toEqual(next);
  expect(reload(advance(next))).toEqual(advance(next));
  expect(reload(finish(next))).toEqual(finish(next));
  const [prior] = next.history;
  expect(reload({ ...next, history: [{ ...prior, seasonOut: undefined }] })).toBeNull();
  expect(reload({ ...next, history: [{ ...prior, seasonOut: { ...prior.seasonOut!, ladder: [...report.ladder].reverse() } }] })).toBeNull();
  const retired = reduceNrlCareer(skipped, { type: 'retireCareer', ...action(skipped) });
  expect(retired.retired).toBe(true);
  expect(nrlOffseasonOpportunities(retired)).toEqual([]);
  expect(nrlSeasonOut(reload(retired)!)).toEqual({ ...report, vacancies: [] });
  expect(reload({ ...ended, satOutSeason: true })).toBeNull();
});

it('keeps prior squad and club obligations while every club is run by the computer', () => {
  const ended = finish(createNrlCareer('storm', 4));
  const releasedPlayer = ended.players.find(player => nrlMutualReleaseQuote(ended, player.id).ok)!;
  const release = reduceNrlCareer(ended, { type: 'agreeMutualRelease', ...action(ended), playerId: releasedPlayer.id });
  const prior = reduceNrlCareer(release, { type: 'setLeagueRecruitment', ...action(release), enabled: true });
  const departed = wait(leave(prior));
  const vacancy = nrlOffseasonOpportunities(departed)[0];
  const next = reduceNrlCareer(departed, { type: 'acceptVacancy', ...action(departed), destinationId: vacancy.clubId, joinYear: 2028 });
  const [receipt] = next.history;
  expect(receipt.finance?.mutualRelease?.playerId).toBe(releasedPlayer.id);
  expect(receipt.leagueRecruitment?.length).toBeGreaterThan(0);
  for (const deal of receipt.leagueRecruitment!) {
    expect(next.players.find(player => player.id === deal.playerId)?.contract).toMatchObject({
      clubId: deal.clubId, startYear: 2027, endYear: 2028, salary: deal.annualSalary,
    });
  }
  expect(reload(next)).toEqual(next);
  expect(reload({ ...next, history: [{ ...receipt, leagueRecruitment: receipt.leagueRecruitment!.map((row, index) =>
    index ? row : { ...row, annualSalary: row.annualSalary + 1 }) }] })).toBeNull();
});
