import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerAction, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, nrlNextRound, type NrlTactic } from '@/lib/nrlManager';

const open = (seed: number) => createNrlCareer('broncos', seed, 2026);
const quick = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const start = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'startLive' });
const finish = (state: NrlCareerState, tactic: NrlTactic = state.season.tactic) =>
  reduceNrlCareer(state, { type: 'finishLive', year: state.season.year, round: state.season.round, tactic });
const managedResult = (state: NrlCareerState, round: number) => state.season.results.find(match =>
  match.round === round && (match.homeId === state.season.clubId || match.awayId === state.season.clubId))!;

describe('NRL Manager live matches', () => {
  it('persists halftime without settling anything and finishes the same round only once', () => {
    const prepared = reduceNrlCareer(open(4), { type: 'prepare', choice: 'train' });
    const pending = start(prepared);
    expect(pending?.season?.live?.fixture).toEqual(nrlNextRound(prepared.season).clubMatch);
    const { live, ...matchday } = pending.season;
    expect({ ...pending, season: matchday }).toStrictEqual(prepared);
    expect(live!.homeScoring.tries + live!.awayScoring.tries).toBeGreaterThan(0);
    const saved = JSON.stringify(pending);
    const restored = readNrlCareerSave(saved)!;
    expect(JSON.stringify(restored)).toBe(saved);
    const finishAction = { type: 'finishLive', year: restored.season.year, round: restored.season.round, tactic: 'balanced' } as const;
    const completed = reduceNrlCareer(restored, finishAction);
    expect(JSON.stringify(completed)).toBe(JSON.stringify(quick(prepared)));
    expect(reduceNrlCareer(completed, finishAction)).toBe(completed);
    expect(readNrlCareerSave(JSON.stringify(completed))).toStrictEqual(completed);
  });

  it('locks the kickoff squad, preparation and other actions until full time', () => {
    const pending = start(open(4));
    expect(pending?.season?.live).toBeDefined();
    const { year, round, lineup, bench } = pending.season;
    const blocked: NrlCareerAction[] = [
      { type: 'startLive' }, { type: 'advance' }, { type: 'prepare', choice: 'recover' },
      { type: 'setTactic', tactic: 'attack' }, { type: 'setKicker', playerId: lineup.Fullback },
      { type: 'selectStarter', role: 'Fullback', playerId: pending.season.squad.find(player => player.role === 'Fullback' && player.id !== lineup.Fullback)!.id },
      { type: 'selectBench', slot: 0, playerId: bench![1] },
      { type: 'scoutAcademy', role: 'Hooker' }, { type: 'startNextSeason' },
      { type: 'finishLive', year, round: round + 1, tactic: 'attack' },
      { type: 'finishLive', year: year + 1, round, tactic: 'attack' },
    ];
    for (const action of blocked) expect(reduceNrlCareer(pending, action)).toBe(pending);
  });

  it('makes the halftime tactic change the remaining tries under the same initial rolls', () => {
    let attackDifference = 0;
    let defenseDifference = 0;
    for (let seed = 1; seed <= 36; seed++) {
      const initial = open(seed);
      const live = start(initial);
      expect(live?.season?.live).toBeDefined();
      const half = live.season.live!;
      const keep = managedResult(finish(live), 1);
      const attack = managedResult(finish(live, 'attack'), 1);
      const defense = managedResult(finish(live, 'defense'), 1);
      if (keep.extraTime || attack.extraTime || defense.extraTime) continue;
      expect(attack.homeScoring.tries).toBeGreaterThanOrEqual(keep.homeScoring.tries);
      expect(defense.awayScoring.tries).toBeLessThanOrEqual(keep.awayScoring.tries);
      attackDifference += attack.homeScoring.tries - keep.homeScoring.tries;
      defenseDifference += keep.awayScoring.tries - defense.awayScoring.tries;
      for (const result of [keep, attack, defense]) {
        for (const field of ['tries', 'conversions', 'penalties'] as const) {
          expect(result.homeScoring[field]).toBeGreaterThanOrEqual(half.homeScoring[field]);
          expect(result.awayScoring[field]).toBeGreaterThanOrEqual(half.awayScoring[field]);
        }
      }
      const completed = finish(live, 'attack');
      expect(completed.season.tactic).toBe(initial.season.tactic);
      const otherFixtures = (state: NrlCareerState) => state.season.results.filter(result =>
        result.homeId !== state.season.clubId && result.awayId !== state.season.clubId);
      expect(otherFixtures(completed)).toEqual(otherFixtures(quick(initial)));
      expect(finish(readNrlCareerSave(JSON.stringify(live))!, 'attack')).toStrictEqual(completed);
    }
    expect(attackDifference).toBeGreaterThan(0);
    expect(defenseDifference).toBeGreaterThan(0);
  });

  it('keeps complete Quick Sim parity through byes, finals, and extra time when the tactic stays', () => {
    let restRounds = 0;
    let finals = 0;
    let finalsExtraTime = 0;
    for (let seed = 1; seed <= 16; seed++) {
      let state = open(seed);
      while (state.season.phase !== 'complete') {
        const { round } = state.season;
        const simulated = quick(state);
        const pending = start(state);
        if (nrlNextRound(state.season).clubMatch) {
          expect(pending?.season?.live).toBeDefined();
          expect(JSON.stringify(finish(pending))).toBe(JSON.stringify(simulated));
          if (state.season.phase === 'finals') {
            finals++;
            if (managedResult(simulated, round).extraTime) finalsExtraTime++;
          }
        } else {
          expect(pending).toBe(state);
          restRounds++;
        }
        state = simulated;
      }
    }
    expect(restRounds).toBeGreaterThan(0);
    expect(finals).toBeGreaterThan(0);
    expect(finalsExtraTime).toBeGreaterThan(0);
  }, 15_000);

  it('rejects invalid halftime receipts and keeps existing legacy seasons on Quick Sim', () => {
    const pending = start(open(4));
    expect(pending?.season?.live).toBeDefined();
    const live = pending.season.live!;
    const edit = (changed: typeof live) => readNrlCareerSave(JSON.stringify({
      ...pending, season: { ...pending.season, live: changed },
    }));
    expect(edit({ ...live, fixture: { ...live.fixture, round: live.fixture.round + 1 } })).toBeNull();
    expect(edit({ ...live, homeScoring: { ...live.homeScoring, tries: live.homeScoring.tries + 1 } })).toBeNull();
    expect(edit({ ...live, awayScoring: { ...live.awayScoring, fieldGoals: 1 } })).toBeNull();
    const migrated = readNrlCareerSave(JSON.stringify(createNrlSeason('broncos', 4)))!;
    expect(start(migrated)).toBe(migrated);
    const { kickerId, ...season } = open(4).season;
    const earlierV2 = readNrlCareerSave(JSON.stringify({ ...open(4), season }))!;
    expect(start(earlierV2)).toBe(earlierV2);
    expect(quick(earlierV2).season.results).toHaveLength(nrlNextRound(earlierV2.season).fixtures.length);
  });
});
