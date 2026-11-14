import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlBenchRotation, nrlCanOpenInterchange, nrlMinute60Interchanges, nrlNextRound, NRL_ROLES, reduceNrlSeason } from '@/lib/nrlManager';

const tick = ({ season }: NrlCareerState) => ({ year: season.year, clubId: season.clubId, round: season.round });
const open = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'setOpenInterchange', ...tick(state), enabled: true });
const quick = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const restored = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const settled = (state: NrlCareerState) => state.season.results.find(match => match.playerScoring)!;

describe('NRL open interchange', () => {
  it.each([[2026, 'broncos'], [2027, 'bears']] as const)('uses three automatic reserves in Quick Sim and saves the actual match %s', (year, clubId) => {
    const first = createNrlCareer(clubId, 16, year);
    const expected = [...nrlBenchRotation(first.season)];
    expect(expected).toHaveLength(4);
    const [starterId, reserve] = expected[3];
    const withPlan = open(first);
    expect(withPlan.season.openInterchange).toBe(true);
    expect(withPlan.season.bench).toBe(first.season.bench);
    expect([...nrlBenchRotation(withPlan.season)]).toEqual(expected.slice(0,3));
    expect(restored(withPlan)).toEqual(withPlan);
    const before = quick(first), after = quick(withPlan);
    expect(settled(after).benchUsed).toEqual(expected.slice(0,3).map(([, player]) => player.id));
    expect(settled(after).openInterchange).toBe(true);
    expect(after.season.openInterchange).toBeUndefined();
    const fitness = (state: NrlCareerState, id: string) => state.season.squad.find(player => player.id === id)!.fitness;
    expect(fitness(after, reserve.id) - fitness(before, reserve.id)).toBe(8);
    expect(fitness(before, starterId) - fitness(after, starterId)).toBe(4);
    expect(restored(after)).toEqual(after);
    const forged = { ...before, season: { ...before.season, results: before.season.results.map(match =>
      match.playerScoring ? { ...match, openInterchange: true as const } : match) } };
    expect(restored(forged)).toBeNull();
    expect(reduceNrlCareer(after, { type: 'setOpenInterchange', ...tick(first), enabled: true })).toBe(after);
    expect(reduceNrlCareer(withPlan, { type: 'setOpenInterchange', ...tick(first), enabled: false })).toEqual(first);
  });

  it('keeps the choice open until minute 60 and uses the right one of the available reserves', () => {
    const first = createNrlCareer('broncos', 16);
    const ordinary = reduceNrlCareer(first, { type: 'startLive' });
    const withPlan = open(first);
    const live = reduceNrlCareer(withPlan, { type: 'startLive' });
    const choice = { year: first.season.year, round: first.season.round, tactic: first.season.tactic };
    const paused = reduceNrlCareer(restored(live)!, { type: 'reachMinute60', ...choice });
    const defaultPaused = reduceNrlCareer(ordinary, { type: 'reachMinute60', ...choice });
    expect(nrlMinute60Interchanges(defaultPaused.season)).toEqual([]);
    const options = nrlMinute60Interchanges(paused.season);
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(restored(paused)).toEqual(paused);
    expect(reduceNrlCareer(paused, { type: 'setOpenInterchange', ...tick(first), enabled: false })).toBe(paused);
    for (const option of [options[0], options.at(-1)!]) {
      const result = reduceNrlCareer(restored(paused)!, { type: 'finishMinute60', ...choice, reserveId: option.reserveId });
      expect(settled(result).minute60Interchange).toEqual({ reserveId: option.reserveId, starterId: option.starterId });
      expect(settled(result).benchUsed?.at(-1)).toBe(option.reserveId);
      expect(settled(result).benchUsed).toHaveLength(4);
      expect(restored(result)).toEqual(result);
    }
    expect(reduceNrlCareer(live, { type: 'finishLive', ...choice })).toEqual(quick(withPlan));
  });

  it('keeps the held reserve as an option without reducing the opening below three', () => {
    const first = open(createNrlCareer('broncos', 16));
    const reserve = [...nrlBenchRotation(first.season).values()][0];
    const action = { type: 'startLive', hold: { year: 2026, round: 1, reserveId: reserve.id } } as const;
    const live = reduceNrlCareer(first, action);
    expect(live.season.live?.heldReserveId).toBe(reserve.id);
    expect(nrlBenchRotation(live.season, reserve.id).size).toBe(3);
    expect(restored(live)).toEqual(live);
    const choice = { year: first.season.year, round: first.season.round, tactic: first.season.tactic };
    const kept = reduceNrlCareer(live, { type: 'reachMinute60', ...choice,
      interchange: { starterId: first.season.lineup[reserve.role], reserveId: reserve.id } });
    expect(kept.season.live?.minute60).toBeDefined();
    expect(nrlMinute60Interchanges(kept.season)).toHaveLength(0);
    const result = reduceNrlCareer(kept, { type: 'finishMinute60', ...choice });
    expect(settled(result).benchUsed).toHaveLength(4);
    expect(settled(result).openInterchange).toBe(true);
    expect(restored(result)).toEqual(result);
    const bye = createNrlCareer('panthers', 16);
    expect(nrlNextRound(bye.season).clubStatus).toBe('bye');
    expect(open(bye)).toBe(bye);
    expect(restored({ ...bye, season: { ...bye.season, openInterchange: true } })).toBeNull();
  });

  it('uses the chosen late player in the score engine for a deterministic match', () => {
    const original = open(createNrlCareer('storm', 13));
    const { year, round, tactic } = original.season;
    const kickoff = reduceNrlCareer(original, { type: 'startLive' });
    const paused = reduceNrlCareer(kickoff, { type: 'reachMinute60', year, round, tactic });
    const finish = { type: 'finishMinute60', year, round, tactic } as const;
    const idle = settled(reduceNrlCareer(paused, finish));
    const changed = settled(reduceNrlCareer(paused, { ...finish, reserveId: 'storm-11-1' }));
    expect([idle.homeScore, idle.awayScore]).toEqual([36, 6]);
    expect([changed.homeScore, changed.awayScore]).toEqual([30, 6]);
    expect(changed.scorePeriods?.at60).toEqual(idle.scorePeriods?.at60);
  });

  it('refuses either toggle in a restored live phase at both reducer entry points', () => {
    const original = createNrlCareer('broncos', 16);
    const { year, round, tactic } = original.season;
    const start = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'startLive' });
    const midway = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'reachMinute60', year, round, tactic });
    for (const first of [start(original), start(open(original))]) {
      for (const phase of [first, midway(first)]) {
        const locked = restored(phase)!;
        for (const enabled of [true, false]) {
          const action = { type: 'setOpenInterchange', ...tick(original), enabled } as const;
          expect(reduceNrlCareer(locked, action)).toBe(locked);
          expect(reduceNrlSeason(locked.season, action)).toBe(locked.season);
        }
      }
    }
  });

  it('continues to allow clearing after a bench change makes the plan redundant', () => {
    const planned = open(createNrlCareer('broncos', 16));
    const starters = new Set(Object.values(planned.season.lineup));
    const wellCovered = NRL_ROLES.filter(role => planned.season.squad.filter(player => !starters.has(player.id) && player.role === role).length > 1).slice(0, 3);
    const bench = planned.season.squad.filter(player => !starters.has(player.id) && wellCovered.includes(player.role)).slice(0, 6);
    expect(bench).toHaveLength(6);
    const reduced = bench.reduce((state, player, slot) => reduceNrlCareer(state, { type: 'selectBench', slot, playerId: player.id }), planned);
    expect(nrlCanOpenInterchange(reduced.season)).toBe(false);
    expect(restored(reduced)).toEqual(reduced);
    const unset = reduceNrlCareer(reduced, { type: 'setOpenInterchange', ...tick(planned), enabled: false });
    expect(unset.season.openInterchange).toBeUndefined();
    expect(nrlBenchRotation(unset.season)).toEqual(nrlBenchRotation(reduced.season));
  });
});
