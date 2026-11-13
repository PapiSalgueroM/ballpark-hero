import { describe, expect, it } from 'vitest';
import { createNrlCareer, nrlAcademyReports, nrlReserveGradeCandidates, readNrlCareerSave, reduceNrlCareer, runNrlFastForward, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, nrlInjuries, nrlNextRound } from '@/lib/nrlManager';

const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const go = (state: NrlCareerState, through: number) => runNrlFastForward(state, {
  year: state.season.year, clubId: state.season.clubId, round: state.season.round, through,
});

function atRound(initial: NrlCareerState, round: number) {
  let state = initial;
  while (state.season.round < round) state = advance(state);
  return state;
}

function injuryFixture() {
  for (let seed = 1; seed <= 80; seed++) {
    const before = createNrlCareer('storm', seed);
    const after = advance(before);
    if (nrlInjuries(after.season).size && !advance(after).season.results.slice(after.season.results.length).some(result => result.injury)) return { before, after };
  }
  throw new Error('No matching new-injury fixture');
}

describe('NRL round fast-forward', () => {
  it('is byte-equivalent to repeated Quick Sim on a bye, with no extra save state', () => {
    const career = reduceNrlCareer(createNrlCareer('panthers', 16), { type: 'prepare', choice: 'recover' });
    expect(nrlNextRound(career.season).clubStatus).toBe('bye');
    const result = go(career, 2);
    expect(result.state.season.round).toBe(3);
    expect(JSON.stringify(result.state)).toBe(JSON.stringify(atRound(career, 3)));
    expect(readNrlCareerSave(JSON.stringify(result.state))).toEqual(result.state);
  });

  it('settles four 2027 rounds under the same tactic, payroll and market as Quick Sim', () => {
    const career = createNrlCareer('bears', 1, 2027);
    const hired = reduceNrlCareer(career, { type: 'hireCoach', role: 'defense', year: 2027, round: 1 });
    const ready = reduceNrlCareer(hired, { type: 'setTactic', tactic: 'defense' });
    const result = go(ready, 4);
    expect(result.stop).toBeNull();
    expect(JSON.stringify(result.state)).toBe(JSON.stringify(atRound(ready, 5)));
  });

  it('stops at a newly injured player without re-stopping on the same injury', () => {
    const { before, after } = injuryFixture();
    expect(go(before, 3)).toEqual({ state: after, stop: 'injury' });
    const resumed = go(after, 3);
    expect(resumed.state.season.round).toBeGreaterThan(after.season.round + 1);
    expect(JSON.stringify(resumed.state)).toBe(JSON.stringify(atRound(after, resumed.state.season.round)));
  });

  it('stops with a newly ready academy report and at a completed course', () => {
    const career = createNrlCareer('panthers', 16);
    const scouting = reduceNrlCareer(career, { type: 'scoutAcademy', role: 'Halfback' });
    const report = go(scouting, 4);
    expect(report).toEqual({ state: advance(scouting), stop: 'academy' });
    expect(nrlAcademyReports(report.state)[0].status).toBe('ready');
    for (let seed = 1; seed <= 80; seed++) {
      const start = createNrlCareer('panthers', seed);
      const player = nrlReserveGradeCandidates(start)[0];
      if (!player) continue;
      const reserve = reduceNrlCareer(start, {
        type: 'startReserveGrade', year: 2026, clubId: 'panthers', round: 1, playerId: player.id,
      });
      const almost = atRound(reserve, 4);
      const finished = advance(almost);
      if (finished.season.results.slice(almost.season.results.length).some(result => result.injury)) continue;
      expect(go(almost, 5)).toEqual({ state: finished, stop: 'development' });
      return;
    }
    throw new Error('No injury-free reserve completion fixture');
  });

  it('guards the summer application deadline, finals, stale requests, and a match at halftime', () => {
    const late = atRound(createNrlCareer('storm', 1), 21);
    const lastApplication = advance(late);
    expect(go(late, 24)).toEqual({ state: lastApplication, stop: 'applications' });
    expect(go(lastApplication, 24).state).toBe(lastApplication);
    const old = readNrlCareerSave(JSON.stringify(createNrlSeason('bears', 9, 2027)))!;
    const ending = atRound(old, 26);
    const finals = go(ending, 27);
    expect(finals).toEqual({ state: atRound(ending, 28), stop: 'finals' });
    expect(go(finals.state, 29).state).toBe(finals.state);
    const fresh = createNrlCareer('storm', 7);
    expect(runNrlFastForward(fresh, { year: 2026, clubId: 'storm', round: 2, through: 4 }).state).toBe(fresh);
    expect(go(fresh, 5).state).toBe(fresh);
    const live = reduceNrlCareer(fresh, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    expect(go(live, 3).state).toBe(live);
  });
});
