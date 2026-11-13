import { describe, expect, it } from 'vitest';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, nrlBench, nrlInjuries, nrlNextRound, nrlStarterOptions, reduceNrlSeason } from '@/lib/nrlManager';

const clubId = nrlSeasonPlan(2026).draw[0][0][0];
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });

function injuryStart(forceUtility = false) {
  for (let seed = 1; seed <= 80; seed++) {
    let state = createNrlCareer(clubId, seed);
    const starters = new Set(Object.values(state.season.lineup));
    if (forceUtility) {
      const makeUtility = <T extends { id: string; role: string }>(player: T): T =>
        starters.has(player.id) ? player : { ...player, role: 'Fullback' };
      state = {
        ...state,
        players: state.players.map(player => player.contract?.clubId === clubId ? makeUtility(player) : player),
        season: { ...state.season, squad: state.season.squad.map(makeUtility) },
      };
    }
    const next = advance(state);
    const match = next.season.results.find(result => result.injury && starters.has(result.injury.playerId));
    if (!match?.injury) continue;
    const injured = state.season.squad.find(player => player.id === match.injury!.playerId)!;
    if (forceUtility && injured.role === 'Fullback') continue;
    return { state, next, injured, match };
  }
  throw new Error('No seeded starter knock found.');
}

function expectEligibleMatchday(state: NrlCareerState) {
  const injured = nrlInjuries(state.season);
  const named = [...Object.values(state.season.lineup), ...nrlBench(state.season)];
  expect(named).toHaveLength(19);
  expect(new Set(named).size).toBe(19);
  expect(named.every(id => !injured.has(id))).toBe(true);
}

describe('NRL Manager squad availability', () => {
  it('records a deterministic knock and names an eligible natural replacement', () => {
    const { state, next, injured, match } = injuryStart();
    expect(advance(state)).toEqual(next);
    const { injuryTracking, ...oldSeason } = state.season;
    const uninjuredModel = advance({ ...state, season: oldSeason });
    expect(next.season.results.map(({ injury, ...result }) => result)).toEqual(uninjuredModel.season.results);
    expect(next.season.squad).toEqual(uninjuredModel.season.squad);
    expect(nrlInjuries(next.season).get(injured.id)).toBe(match.injury!.rounds);
    const replacementId = next.season.lineup[injured.role];
    expect(replacementId).not.toBe(injured.id);
    expect(next.season.squad.find(player => player.id === replacementId)?.role).toBe(injured.role);
    expectEligibleMatchday(next);
    expect(nrlStarterOptions(next.season, injured.role).map(player => player.id)).not.toContain(injured.id);
    expect(reduceNrlCareer(next, { type: 'selectStarter', role: injured.role, playerId: injured.id })).toBe(next);
    expect(reduceNrlCareer(next, { type: 'selectBench', slot: 0, playerId: injured.id })).toBe(next);
    expect(readNrlCareerSave(JSON.stringify(next))).toEqual(next);
    expect(next.season.results.filter(result => result.injury)).toEqual([match]);
  });

  it('uses temporary utility cover if the only natural starter is hurt and never names someone twice', () => {
    const { state, next, injured } = injuryStart(true);
    expect(readNrlCareerSave(JSON.stringify(state))).toEqual(state);
    const utility = next.season.squad.find(player => player.id === next.season.lineup[injured.role])!;
    expect(utility.role).not.toBe(injured.role);
    expectEligibleMatchday(next);
    expect(readNrlCareerSave(JSON.stringify(next))).toEqual(next);
    const anotherStarter = Object.values(next.season.lineup).find(id => id !== utility.id)!;
    expect(reduceNrlCareer(next, { type: 'selectStarter', role: injured.role, playerId: anotherStarter })).toBe(next);

    let recovered = next;
    while (nrlInjuries(recovered.season).has(injured.id)) recovered = advance(recovered);
    expect(recovered.season.lineup[injured.role]).toBe(injured.id);
    expectEligibleMatchday(recovered);
  });

  it('counts a bye as recovery without creating a new knock', () => {
    const plan = nrlSeasonPlan(2026);
    const byeClub = plan.clubs.find(club => plan.draw[0].some(pair => pair.includes(club.id))
      && !plan.draw[1].some(pair => pair.includes(club.id)))!;
    let beforeBye: NrlCareerState | undefined;
    for (let seed = 1; seed <= 80 && !beforeBye; seed++) {
      const state = advance(createNrlCareer(byeClub.id, seed));
      if (nrlInjuries(state.season).size) beforeBye = state;
    }
    expect(beforeBye).toBeDefined();
    const state = beforeBye!;
    expect(nrlNextRound(state.season).clubStatus).toBe('bye');
    const after = advance(state);
    expect(after.season.results.slice(state.season.results.length).every(result => !result.injury)).toBe(true);
    for (const [id, remaining] of nrlInjuries(state.season)) {
      expect(nrlInjuries(after.season).get(id) ?? 0).toBe(remaining - 1);
    }
    expectEligibleMatchday(after);
    expect(readNrlCareerSave(JSON.stringify(after))).toEqual(after);
  });

  it('keeps existing v2 and v1 saves on their current injury-free season until rollover', () => {
    const { state } = injuryStart();
    const { injuryTracking, ...oldSeason } = state.season;
    const old = readNrlCareerSave(JSON.stringify({ ...state, season: oldSeason }))!;
    expect(old.season.injuryTracking).toBeUndefined();
    expect(nrlInjuries(advance(old).season).size).toBe(0);
    const v1 = createNrlSeason(clubId, old.season.seed);
    const migrated = readNrlCareerSave(JSON.stringify(v1))!;
    expect(advance(migrated).season.results).toEqual(reduceNrlSeason(v1, { type: 'advance' }).results);
    let finished = old;
    while (finished.season.phase !== 'complete') finished = advance(finished);
    expect(finished.season.results.every(result => !result.injury)).toBe(true);
    const next = reduceNrlCareer(finished, { type: 'startNextSeason' });
    expect(next.season.injuryTracking).toBe(true);
    expect(nrlInjuries(next.season).size).toBe(0);
  });

  it('rejects an invalid injury receipt and an injured player in a saved matchday', () => {
    const { next, injured, match } = injuryStart();
    const bad = (season: NrlCareerState['season']) => readNrlCareerSave(JSON.stringify({ ...next, season }));
    expect(bad({ ...next.season, lineup: { ...next.season.lineup, [injured.role]: injured.id } })).toBeNull();
    expect(bad({ ...next.season, bench: [injured.id, ...nrlBench(next.season).slice(1)] })).toBeNull();
    const results = next.season.results.map(result => result === match ? { ...result, injury: { playerId: injured.id, rounds: 5 } } : result);
    expect(bad({ ...next.season, results })).toBeNull();
  });
});
