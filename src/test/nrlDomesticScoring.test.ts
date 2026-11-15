import { describe, expect, it } from 'vitest';
import { createNrlCareer, nrlSeasonOut, readNrlCareerSave, reduceNrlCareer, runNrlFastForward, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, nrlNextRound } from '@/lib/nrlManager';
import { nrlSeasonCanCredit, sameNrlCareer } from '@/lib/nrlSaveSlots';

const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state))!;
const mark = (state: NrlCareerState): NrlCareerState => ({
  ...state, season: { ...state.season, domesticScoringModel: 'league-2026' },
});
const score = (state: NrlCareerState) => {
  const match = state.season.results.find(result => result.playerScoring)!;
  return [match.homeScore, match.awayScore];
};
const dates = ({ season }: NrlCareerState) => ({ year: season.year, clubId: season.clubId, round: season.round });

describe('NRL domestic regulation scoring', () => {
  it('changes managed and rival matches with the same seed and settles resumed Live like Quick Sim', () => {
    const usual = createNrlCareer('bears', 3, 2027);
    const modern = mark(usual);
    const control = advance(usual);
    const quick = advance(modern);
    expect(score(control)).toEqual([24, 28]);
    expect(score(quick)).toEqual([30, 28]);
    const rival = (state: NrlCareerState) => state.season.results.find(row => row.homeId === 'cowboys' && row.awayId === 'eels')!;
    expect(rival(control)).toMatchObject({ homeScore: 46, awayScore: 0 });
    expect(rival(quick)).toMatchObject({ homeScore: 46, awayScore: 18 });
    expect(read(quick)).toEqual(quick);
    expect(read(modern)).toEqual(modern);
    expect(sameNrlCareer(usual, modern)).toBe(false);
    expect(sameNrlCareer(usual, read(usual))).toBe(true);
    const originalReplay = { career: '2027:bears:3', through: 2027 };
    expect(nrlSeasonCanCredit(usual, originalReplay)).toBe(false);
    expect(nrlSeasonCanCredit(modern, originalReplay)).toBe(true);

    for (const starting of [usual, modern]) {
      const { year, round, tactic } = starting.season;
      const half = reduceNrlCareer(starting, { type: 'startLive' });
      const at60 = reduceNrlCareer(read(half), { type: 'reachMinute60', year, round, tactic });
      expect(at60.season.live?.minute60).toBeDefined();
      const held = read(at60);
      expect(JSON.stringify(held)).toBe(JSON.stringify(at60));
      const final = reduceNrlCareer(held, { type: 'finishMinute60', year, round, tactic });
      expect(JSON.stringify(final, (key, value) => key === 'at60' ? undefined : value)).toBe(JSON.stringify(advance(starting)));
    }
    const fast = runNrlFastForward(modern, { ...dates(modern), through: 2 }).state;
    expect(fast.season.round).toBeGreaterThan(1);
    expect(fast).toEqual(fast.season.round === 2 ? quick : advance(quick));
  });

  it('keeps finals equal from the same bracket and carries the model through rollover and a season out', () => {
    let usual = createNrlCareer('storm', 4);
    while (usual.season.phase === 'regular') usual = advance(usual);
    let modern = mark(usual);
    while (usual.season.phase !== 'complete') {
      usual = advance(usual);
      modern = advance(modern);
      expect(modern).toEqual(mark(usual));
    }
    const next = reduceNrlCareer(modern, { type: 'startNextSeason' });
    expect(next.season.domesticScoringModel).toBe('league-2026');
    expect(read(next)).toEqual(next);
    const wait = (state: NrlCareerState) => reduceNrlCareer(reduceNrlCareer(state, {
      type: 'leaveClub', ...dates(state),
    }), { type: 'simulateSeasonOut', ...dates(state) });
    const unmarkedOut = nrlSeasonOut(wait(usual))!;
    const markedOut = wait(modern);
    const report = nrlSeasonOut(read(markedOut))!;
    expect(report.leagueLadder).not.toEqual(unmarkedOut.leagueLadder);
    expect(report.vacancies.length).toBeGreaterThan(0);
    const picked = reduceNrlCareer(markedOut, { type: 'acceptVacancy', ...dates(markedOut),
      joinYear: 2028, destinationId: report.vacancies[0].clubId });
    expect(picked.season).toMatchObject({ year: 2028, domesticScoringModel: 'league-2026' });
    expect(read(picked)).toEqual(picked);
  });

  it('rejects unsupported scoring identifiers and keeps imported v1 careers on their original model', () => {
    const rawLegacy = createNrlSeason('bears', 16, 2027);
    const legacy = readNrlCareerSave(JSON.stringify(rawLegacy))!;
    expect(legacy.legacySeason).toBe(true);
    expect(legacy.season.domesticScoringModel).toBeUndefined();
    expect(readNrlCareerSave(JSON.stringify(mark(legacy)))).toBeNull();
    expect(readNrlCareerSave(JSON.stringify({ ...rawLegacy, domesticScoringModel: 'league-2026' }))).toBeNull();
    const old = createNrlCareer('bears', 16, 2027);
    expect(readNrlCareerSave(JSON.stringify({ ...old, season: { ...old.season, domesticScoringModel: 'unknown' } }))).toBeNull();
    expect(nrlNextRound(old.season).clubMatch).toBeTruthy();
  });
});
