import { describe, expect, it } from 'vitest';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, nrlBench, NRL_BENCH_SIZE, NRL_MAX_BENCH_USED, reduceNrlSeason } from '@/lib/nrlManager';

const matchClub = nrlSeasonPlan(2026).draw[0][0][0];
const fresh = () => createNrlCareer(matchClub, 116, 2026);
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });

function expectMatchday(state: NrlCareerState) {
  const { squad, lineup } = state.season;
  const bench = nrlBench(state.season);
  expect(bench).toHaveLength(NRL_BENCH_SIZE);
  const matchday = [...Object.values(lineup), ...bench];
  expect(new Set(matchday).size).toBe(19);
  expect(matchday.every(id => squad.some(player => player.id === id))).toBe(true);
}

describe('NRL Manager interchange', () => {
  it('chooses six reserves, rejects ineligible IDs and swaps two named slots without duplication', () => {
    const state = fresh();
    expectMatchday(state);
    const bench = nrlBench(state.season);
    const starter = Object.values(state.season.lineup)[0];
    expect(reduceNrlCareer(state, { type: 'selectBench', slot: 0, playerId: starter })).toBe(state);
    expect(reduceNrlCareer(state, { type: 'selectBench', slot: 0, playerId: 'unknown' })).toBe(state);
    expect(reduceNrlCareer(state, { type: 'selectBench', slot: NRL_BENCH_SIZE, playerId: bench[0] })).toBe(state);
    expect(reduceNrlCareer(state, { type: 'selectBench', slot: 0, playerId: bench[0] })).toBe(state);
    const swapped = reduceNrlCareer(state, { type: 'selectBench', slot: 0, playerId: bench[1] });
    expect(nrlBench(swapped.season)).toEqual([bench[1], bench[0], ...bench.slice(2)]);
    expectMatchday(swapped);
    expect(readNrlCareerSave(JSON.stringify(swapped))).toEqual(swapped);
  });

  it('moves the former starter into the promoted reserve’s bench slot', () => {
    const state = fresh();
    const bench = nrlBench(state.season);
    const player = state.season.squad.find(candidate => candidate.id === bench[2])!;
    const oldStarter = state.season.lineup[player.role];
    const promoted = reduceNrlCareer(state, { type: 'selectStarter', role: player.role, playerId: player.id });
    expect(promoted.season.lineup[player.role]).toBe(player.id);
    expect(nrlBench(promoted.season)[2]).toBe(oldStarter);
    expectMatchday(promoted);
    expect(readNrlCareerSave(JSON.stringify(promoted))).toEqual(promoted);
  });

  it('records at most four reserves, spends only their fitness and gives relieved starters a break', () => {
    const state = fresh();
    const bench = nrlBench(state.season);
    const played = advance(state);
    const own = played.season.results.find(match => [match.homeId, match.awayId].includes(matchClub))!;
    expect(own.benchUsed).toEqual(bench.slice(0, NRL_MAX_BENCH_USED));
    expect(own.benchUsed).toHaveLength(4);
    const relief = new Set<string>(own.benchUsed!.map(id => state.season.squad.find(player => player.id === id)!.role));
    for (const id of bench) {
      const player = played.season.squad.find(candidate => candidate.id === id)!;
      expect(player.fitness).toBe(own.benchUsed!.includes(id) ? 92 : 100);
    }
    for (const [role, id] of Object.entries(state.season.lineup)) {
      expect(played.season.squad.find(candidate => candidate.id === id)!.fitness).toBe(relief.has(role) ? 89 : 85);
    }
    expect(played.season.results.filter(match => match.benchUsed)).toEqual([own]);

    const swapped = reduceNrlCareer(played, { type: 'selectBench', slot: 0, playerId: bench[5] });
    expect(readNrlCareerSave(JSON.stringify(swapped))?.season.results).toEqual(played.season.results);
    const duplicate = { ...swapped, season: { ...swapped.season, bench: Array(6).fill(bench[0]) } };
    expect(readNrlCareerSave(JSON.stringify(duplicate))).toBeNull();
    const badMatch = { ...own, benchUsed: [...own.benchUsed!, bench[5]] };
    const badResults = played.season.results.map(match => match === own ? badMatch : match);
    expect(readNrlCareerSave(JSON.stringify({ ...played, season: { ...played.season, results: badResults } }))).toBeNull();
  });

  it('skips a duplicate position and uses a later reserve in bench order', () => {
    let state = fresh();
    const { squad, lineup } = state.season;
    const starters = new Set(Object.values(lineup));
    const reserves = squad.filter(player => !starters.has(player.id));
    const first = reserves.find(player => reserves.some(other => other.id !== player.id && other.role === player.role))!;
    const duplicate = reserves.find(player => player.id !== first.id && player.role === first.role)!;
    const later = nrlBench(state.season).filter(id => squad.find(player => player.id === id)?.role !== first.role).slice(0, 4);
    const named = [first.id, duplicate.id, ...later];
    named.forEach((playerId, slot) => { state = reduceNrlCareer(state, { type: 'selectBench', slot, playerId }); });
    expect(nrlBench(state.season)).toEqual(named);
    const played = advance(state);
    const own = played.season.results.find(match => [match.homeId, match.awayId].includes(matchClub))!;
    expect(own.benchUsed).toEqual([first.id, ...later.slice(0, 3)]);
    expect(played.season.squad.find(player => player.id === duplicate.id)?.fitness).toBe(100);
  });

  it('includes bench ratings in match outcomes without changing other fixtures', () => {
    let betterBenchPoints = 0;
    let weakerBenchPoints = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const season = createNrlCareer(matchClub, seed, 2026).season;
      const used = new Set(nrlBench(season).slice(0, 4));
      const withRatings = (rating: number) => reduceNrlSeason({
        ...season,
        squad: season.squad.map(player => used.has(player.id) ? { ...player, rating } : player),
      }, { type: 'advance' }).results;
      const better = withRatings(90);
      const weaker = withRatings(55);
      betterBenchPoints += better[0].homeScore - better[0].awayScore;
      weakerBenchPoints += weaker[0].homeScore - weaker[0].awayScore;
      expect(better.slice(1)).toEqual(weaker.slice(1));
    }
    expect(betterBenchPoints).toBeGreaterThan(weakerBenchPoints);
  });

  it('fills an old v2 bench without changing historical results and rebuilds a legal 19 at rollover', () => {
    const initial = fresh();
    const { bench, injuryTracking, kickerId, ...oldSeason } = initial.season;
    const state = advance({ ...initial, season: oldSeason });
    const { results } = state.season;
    const raw = JSON.stringify(state);
    let migrated = readNrlCareerSave(raw)!;
    expect(migrated.season.results).toEqual(results);
    expect(nrlBench(migrated.season)).toEqual(nrlBench(readNrlCareerSave(raw)!.season));
    expectMatchday(migrated);
    while (migrated.season.phase !== 'complete') migrated = advance(migrated);
    const next = reduceNrlCareer(migrated, { type: 'startNextSeason' });
    expect(next.season.year).toBe(2027);
    expectMatchday(next);
    expect(readNrlCareerSave(JSON.stringify(next))).toEqual(next);
  });

  it('retains exact v1 scores and starter fitness and leaves a bye bench fresh', () => {
    const v1 = createNrlSeason(matchClub, 116);
    const imported = readNrlCareerSave(JSON.stringify(v1))!;
    expectMatchday(imported);
    const old = reduceNrlSeason(v1, { type: 'advance' });
    const bench = nrlBench(imported.season);
    const edited = reduceNrlCareer(imported, { type: 'selectBench', slot: 0, playerId: bench[1] });
    const now = advance(edited);
    expect(nrlBench(now.season)).toEqual([bench[1], bench[0], ...bench.slice(2)]);
    expect(now.season.results).toEqual(old.results);
    expect(now.season.squad.slice(0, v1.squad.length)).toEqual(old.squad);

    const plan = nrlSeasonPlan(2026);
    const round1 = new Set(plan.draw[0].flat());
    const byeClub = plan.clubs.find(club => !round1.has(club.id))!;
    const bye = advance(createNrlCareer(byeClub.id, 116, 2026));
    expect(bye.season.results.every(match => !match.benchUsed)).toBe(true);
    expect(bye.season.squad.every(player => player.fitness === 100)).toBe(true);
  });
});
