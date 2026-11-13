import { describe, expect, it } from 'vitest';
import { createNrlCareer, nrlOppositionReport, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, nrlNextRound, readNrlSave, reduceNrlSeason } from '@/lib/nrlManager';

const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });
const drills = (career: NrlCareerState) => {
  const { year, clubId, round } = career.season;
  return reduceNrlCareer(career, { type: 'prepare', choice: 'defensiveDrills', year, clubId, round });
};
const clear = (career: NrlCareerState) => {
  const { year, clubId, round } = career.season;
  return reduceNrlCareer(career, { type: 'prepare', choice: null, year, clubId, round });
};

const read = (career: NrlCareerState) => readNrlCareerSave(JSON.stringify(career));

const managedResult = (career: NrlCareerState, round: number) => career.season.results.find(match =>
  match.round === round && [match.homeId, match.awayId].includes(career.season.clubId))!;

const otherResults = (career: NrlCareerState) => career.season.results.filter(match =>
  ![match.homeId, match.awayId].includes(career.season.clubId));

describe('NRL defensive drills', () => {
  it.each([[2026, 'broncos'], [2027, 'bears']] as const)('matches the Train workload and gives a defence edge in %s', (year, clubId) => {
    const initial = createNrlCareer(clubId, 39, year);
    const base = nrlOppositionReport(initial)!;
    const trained = reduceNrlCareer(initial, { type: 'prepare', choice: 'train' });
    const defence = drills(initial);
    expect(defence.season.preparation).toBe('defensiveDrills');
    expect(read(defence)).toEqual(defence);
    const attackReport = nrlOppositionReport(trained)!;
    const defenceReport = nrlOppositionReport(defence)!;
    expect(defenceReport.attackEdge - base.attackEdge).toBeCloseTo(-0.72);
    expect(defenceReport.defenseEdge - base.defenseEdge).toBeCloseTo(6.28);
    expect(attackReport.attackEdge - defenceReport.attackEdge).toBeCloseTo(7);
    expect(defenceReport.defenseEdge - attackReport.defenseEdge).toBeCloseTo(7);
    const settled = advance(defence);
    expect(settled.season.preparation).toBeNull();
    expect(settled.season.squad.map(player => player.fitness)).toEqual(advance(trained).season.squad.map(player => player.fitness));
    expect(managedResult(settled, 1).injury).toEqual(managedResult(advance(trained), 1).injury);
    expect(otherResults(settled)).toEqual(otherResults(advance(initial)));
  });

  it('replays live halftime exactly and settles identically to Quick Sim with the same tactic', () => {
    const original = createNrlCareer('broncos', 16);
    const prepared = drills(original);
    const pending = reduceNrlCareer(prepared, { type: 'startLive' });
    expect(pending.season.live).toBeDefined();
    expect(pending.season.preparation).toBe('defensiveDrills');
    expect(clear(pending)).toBe(pending);
    expect(drills(pending)).toBe(pending);
    const restored = read(pending)!;
    expect(JSON.stringify(restored)).toBe(JSON.stringify(pending));
    const { year, round, tactic } = restored.season;
    const completed = reduceNrlCareer(restored, { type: 'finishLive', year, round, tactic });
    expect(JSON.stringify(completed)).toBe(JSON.stringify(advance(prepared)));
    expect(read(completed)).toEqual(completed);
  });

  it('clears pending preparation without changing save bytes and refuses stale actions', () => {
    const original = createNrlCareer('storm', 16);
    const raw = JSON.stringify(original);
    expect(clear(original)).toBe(original);
    expect(JSON.stringify(clear(drills(original)))).toBe(raw);
    for (const choice of ['train', 'recover'] as const) {
      expect(JSON.stringify(clear(reduceNrlCareer(original, { type: 'prepare', choice })))).toBe(raw);
    }
    const second = advance(original);
    const action = { type: 'prepare', choice: 'defensiveDrills', year: 2026, clubId: 'storm', round: 1 } as const;
    expect(reduceNrlCareer(second, action)).toBe(second);
    expect(reduceNrlCareer(original, { ...action, year: 2027 })).toBe(original);
    expect(reduceNrlCareer(original, { ...action, clubId: 'bears' })).toBe(original);
    const prepared = drills(original);
    expect(reduceNrlCareer(prepared, { ...action, choice: null, round: 2 })).toBe(prepared);
  });

  it('permits a playable final and refuses byes, eliminated or imported careers', () => {
    const bye = createNrlCareer('panthers', 16);
    expect(nrlNextRound(bye.season).clubStatus).toBe('bye');
    expect(drills(bye)).toBe(bye);
    expect(read({ ...bye, season: { ...bye.season, preparation: 'defensiveDrills' } })).toBeNull();
    const legacy = createNrlSeason('broncos', 16);
    const oldTraining = reduceNrlSeason(legacy, { type: 'prepare', choice: 'train' });
    expect(readNrlSave(JSON.stringify(oldTraining))).toEqual(oldTraining);
    expect(readNrlSave(JSON.stringify({ ...legacy, preparation: 'defensiveDrills' }))).toBeNull();
    const imported = readNrlCareerSave(JSON.stringify(legacy))!;
    expect(drills(imported)).toBe(imported);
    expect(read({ ...imported, season: { ...imported.season, preparation: 'defensiveDrills' } })).toBeNull();
    let career = createNrlCareer('storm', 39);
    while (career.season.phase === 'regular') career = advance(career);
    expect(nrlNextRound(career.season).clubMatch).toBeDefined();
    expect(read(drills(career))?.season.preparation).toBe('defensiveDrills');
    while (career.season.phase !== 'complete') {
      if (nrlNextRound(career.season).clubStatus === 'eliminated') expect(drills(career)).toBe(career);
      career = advance(career);
    }
    expect(drills(career)).toBe(career);
  });
});
