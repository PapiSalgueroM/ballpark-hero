import { expect, it } from 'vitest';
import {
  createNrlCareer, nrlOppositionReport, readNrlCareerSave, reduceNrlCareer, runNrlFastForward, type NrlCareerState,
} from '@/lib/nrlCareer';
import { nrlClubOriginAbsences, nrlNextRound, nrlUnavailable } from '@/lib/nrlManager';
import { nrlOriginEligibility } from '@/lib/nrlOrigin';

const next = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
function toRound(initial: NrlCareerState, round: number) {
  let state = initial;
  while (state.season.round < round) {
    const played = next(state);
    if (played === state) throw new Error('The club season did not advance');
    state = played;
  }
  return state;
}
const newCareer = (clubId: string, seed: number): NrlCareerState => ({
  ...createNrlCareer(clubId, seed, 2026), originClubCalendar: true,
});
const teamSheet = (state: NrlCareerState) => [...Object.values(state.season.lineup), ...(state.season.bench ?? [])];

it('keeps both clubs’ Round 12 stand-downs through a half-time reload and the real match report', () => {
  const standard = toRound(createNrlCareer('broncos', 4, 2026), 12);
  const called = toRound(newCareer('broncos', 4), 12);
  const fixture = nrlNextRound(called.season).clubMatch!;
  expect([fixture.homeId, fixture.awayId].sort()).toEqual(['broncos', 'bulldogs']);
  expect(called.season.originStandDown?.map(row => row.round)).toEqual([12]);
  const mine = nrlClubOriginAbsences(called.season);
  const theirs = nrlClubOriginAbsences(called.season, 'bulldogs');
  expect(mine).toContain('broncos-7-0');
  expect(theirs).toContain('nrl-bulldogs-2026-12');
  expect(teamSheet(standard)).toContain('broncos-7-0');
  expect(teamSheet(called)).toHaveLength(19);
  expect(new Set(teamSheet(called)).size).toBe(19);
  expect(teamSheet(called).some(id => mine.includes(id))).toBe(false);
  expect(mine.every(id => nrlUnavailable(called.season).has(id))).toBe(true);
  expect(read(called)).toEqual(called);

  // The mirror explicitly removes the rival players from its ordinary rating input.
  const { originStandDown: _standDown, ...ordinarySeason } = called.season;
  const withoutRivals = { ...standard, season: ordinarySeason, players: standard.players.filter(player => !theirs.includes(player.id)) };
  expect(nrlOppositionReport(called)?.matchups).toEqual(nrlOppositionReport(withoutRivals)?.matchups);
  expect(nrlOppositionReport(called)?.matchups).not.toEqual(nrlOppositionReport({ ...standard, season: ordinarySeason })?.matchups);

  const live = reduceNrlCareer(read(called)!, { type: 'startLive' });
  expect(live.season.live).toBeDefined();
  const reopened = read(live);
  expect(reopened).toEqual(live);
  const afterLive = reduceNrlCareer(reopened!, { type: 'finishLive', year: 2026, round: 12, tactic: live.season.tactic });
  const quick = next(called);
  const played = quick.season.results.find(match => match.round === 12 && match.playerScoring)!;
  expect(played.playerScoring!.starters.some(id => mine.includes(id))).toBe(false);
  expect(played.benchUsed?.some(id => mine.includes(id)) ?? false).toBe(false);
  expect(afterLive.season.results).toEqual(quick.season.results);
  expect(nrlClubOriginAbsences(quick.season)).toEqual([]);
  expect(read(quick)).toEqual(quick);
  const invalid = { ...called, season: { ...called.season, lineup: standard.season.lineup, bench: standard.season.bench } };
  expect(read(invalid)).toBeNull();
});

it('records all three 2026 camps once and leaves a bye, markerless saves and future years on their own paths', () => {
  const opening = newCareer('storm', 17);
  const bye = toRound(opening, 12);
  const ordinary = toRound(createNrlCareer('storm', 17, 2026), 12);
  expect(nrlNextRound(bye.season).clubStatus).toBe('bye');
  expect(bye.season.originStandDown?.[0].clubs.storm).toContain('storm-1-0');
  expect(nrlClubOriginAbsences(bye.season)).toEqual([]);
  expect(bye.season.lineup).toEqual(ordinary.season.lineup);
  expect(next(read(bye)!).season.results.some(match => match.round === 12 && match.playerScoring)).toBe(false);
  const later = toRound(read(bye)!, 19);
  expect(later.season.originStandDown?.map(row => row.round)).toEqual([12, 15, 18]);
  expect(read(later)).toEqual(later);
  expect(toRound(ordinary, 19).season.originStandDown).toBeUndefined();
  expect(toRound(createNrlCareer('bears', 5, 2027), 19).season.originStandDown).toBeUndefined();

  const at11 = toRound(newCareer('broncos', 4), 11);
  const faster = runNrlFastForward(at11, { clubId: 'broncos', year: 2026, round: 11, through: 12 });
  expect(faster.stop).toBe('origin-stand-down');
  expect(faster.state.season.round).toBe(12);
});

it('retains explicitly coached workload for available club players during a stand-down', () => {
  const state = toRound(newCareer('broncos', 4), 12);
  const automatic = nrlClubOriginAbsences(state.season);
  let opened = reduceNrlCareer(state, { type: 'startOrigin', year: 2026, side: 'qld', clubWorkload: true, fullPool: true });
  expect(opened.origin).toBeDefined();
  const eligible = state.season.squad.filter(player => !automatic.includes(player.id)
    && nrlOriginEligibility(player.id) === 'qld' && nrlUnavailable(state.season).has(player.id) === false);
  const available = eligible.find(player => !Object.values(opened.origin!.selection.starters).includes(player.id)
    && !opened.origin!.selection.bench.includes(player.id))!;
  expect(available).toBeDefined();
  const selected = reduceNrlCareer(opened, {
    type: 'selectOriginStarter', year: 2026, side: 'qld', game: 1, playerId: available.id, role: available.role,
  });
  expect(selected).not.toBe(opened);
  opened = selected;
  expect(Object.values(opened.origin!.selection.starters).some(id => automatic.includes(id))).toBe(true);
  const action = { type: 'playOriginMatch', year: 2026, side: 'qld', game: 1 } as const;
  const played = reduceNrlCareer(read(opened)!, action);
  const charged = played.origin!.matches[0].clubLoad!.players;
  expect(charged.map(([id]) => id)).toContain(available.id);
  expect(charged.some(([id]) => automatic.includes(id))).toBe(false);
  expect(played.season.squad.find(player => player.id === available.id)?.fitness).toBe(available.fitness - 8);
  expect(played.season.originStandDown).toEqual(state.season.originStandDown);
  const reopened = read(played);
  expect(reopened).toEqual(played);
  expect(reduceNrlCareer(reopened!, action)).toBe(reopened);
});

const withRecovery = (state: NrlCareerState): NrlCareerState => ({ ...state, originClubRecovery: true });
const rest = (state: NrlCareerState, playerId: string | null) => reduceNrlCareer(state, {
  type: 'restOriginPlayer', year: state.season.year, clubId: state.season.clubId, round: state.season.round, playerId,
});
const fitnessOf = (state: NrlCareerState, playerId: string) => state.season.squad.find(player => player.id === playerId)!.fitness;

it('rests one Origin returnee for the next club fixture and records the choice in Quick Sim and Live', () => {
  const camp = toRound(newCareer('broncos', 4), 12);
  const ordinary = next(camp);
  const recovered = next(withRecovery(camp));
  const playerId = 'broncos-7-0';
  expect(recovered.season.round).toBe(13);
  expect(fitnessOf(recovered, playerId)).toBe(fitnessOf(ordinary, playerId) - 8);
  expect(nrlUnavailable(recovered.season).has(playerId)).toBe(false);
  const backedUp = reduceNrlCareer(recovered, { type: 'selectStarter', role: 'Halfback', playerId });
  expect(teamSheet(backedUp)).toContain(playerId);

  const rested = rest(backedUp, playerId);
  expect(rested.season.originRestId).toBe(playerId);
  expect(rest(rested, playerId)).toBe(rested);
  expect(rest(ordinary, playerId)).toBe(ordinary);
  expect(rest(camp, playerId)).toBe(camp);
  expect(teamSheet(rested)).toHaveLength(19);
  expect(teamSheet(rested)).not.toContain(playerId);
  expect(nrlUnavailable(rested.season).has(playerId)).toBe(true);
  expect(read(rested)).toEqual(rested);
  expect(nrlUnavailable(rest(rested, null).season).has(playerId)).toBe(false);
  expect(read({ ...rested, originClubRecovery: undefined })).toBeNull();

  const quick = next(read(rested)!);
  const played = quick.season.results.find(match => match.round === 13 && match.playerScoring)!;
  expect(played.originRestId).toBe(playerId);
  expect(played.playerScoring!.starters).not.toContain(playerId);
  expect(played.benchUsed ?? []).not.toContain(playerId);
  expect(quick.season.originRestId).toBeUndefined();
  expect(nrlUnavailable(quick.season).has(playerId)).toBe(false);
  expect(fitnessOf(quick, playerId)).toBeGreaterThan(fitnessOf(next(backedUp), playerId));
  expect(read(quick)).toEqual(quick);
  expect(rest(quick, playerId)).toBe(quick);

  const live = reduceNrlCareer(rested, { type: 'startLive' });
  expect(read(live)).toEqual(live);
  expect(rest(live, null)).toBe(live);
  expect(reduceNrlCareer(read(live)!, { type: 'finishLive', year: 2026, round: 13, tactic: live.season.tactic })).toEqual(quick);

  const fast = runNrlFastForward(withRecovery(camp), { year: 2026, clubId: 'broncos', round: 12, through: 14 });
  expect(fast.stop).toBe('origin-recovery');
  expect(fast.state).toEqual(recovered);
});

it('lets a club bye take the recovery week before the rest decision', () => {
  // Find a scheduled bye immediately after the first camp with an actual call-up.
  const candidates = ['broncos', 'bulldogs', 'cowboys', 'dolphins', 'dragons', 'eels', 'knights',
    'panthers', 'rabbitohs', 'raiders', 'roosters', 'sea-eagles', 'sharks', 'storm', 'titans', 'warriors', 'wests-tigers'];
  let pair: { camp: NrlCareerState; playerId: string } | undefined;
  for (const clubId of candidates) {
    const camp = toRound(newCareer(clubId, 4), 12);
    const playerId = camp.season.originStandDown?.[0].clubs[clubId]?.[0];
    if (playerId && nrlNextRound(next(camp).season).clubStatus === 'bye') {
      pair = { camp, playerId };
      break;
    }
  }
  expect(pair).toBeDefined();
  const { camp, playerId } = pair!;
  const bye = next(withRecovery(camp));
  const ordinaryBye = next(camp);
  expect(fitnessOf(bye, playerId)).toBe(fitnessOf(ordinaryBye, playerId) - 8);
  expect(rest(bye, playerId)).toBe(bye);
  const returning = next(bye);
  expect(nrlNextRound(returning.season).clubMatch).toBeTruthy();
  expect(fitnessOf(returning, playerId)).toBeGreaterThan(fitnessOf(bye, playerId));
  expect(rest(returning, playerId).season.originRestId).toBe(playerId);
});

it('counts the same Origin game once when using the coached series workload before or after club camp', () => {
  const start = { type: 'startOrigin', year: 2026, side: 'qld', clubWorkload: true, fullPool: true } as const;
  const match = { type: 'playOriginMatch', year: 2026, side: 'qld', game: 1 } as const;
  const entered = toRound(withRecovery(newCareer('broncos', 4)), 11);
  const early = reduceNrlCareer(reduceNrlCareer(entered, start), match);
  const camp = toRound(early, 12);
  const charged = new Set(early.origin!.matches[0].clubLoad!.players.map(([id]) => id));
  const called = camp.season.originStandDown![0].clubs.broncos;
  const alreadyCharged = called.find(id => charged.has(id))!;
  const onlyAutomatic = called.find(id => !charged.has(id))!;
  expect(alreadyCharged).toBeDefined();
  expect(onlyAutomatic).toBeDefined();
  const returning = next(camp);
  const comparison = next({ ...camp, originClubRecovery: undefined });
  expect(fitnessOf(returning, alreadyCharged)).toBe(fitnessOf(comparison, alreadyCharged));
  expect(fitnessOf(returning, onlyAutomatic)).toBe(fitnessOf(comparison, onlyAutomatic) - 8);

  const late = toRound(withRecovery(newCareer('broncos', 4)), 13);
  const lateMatch = reduceNrlCareer(reduceNrlCareer(late, start), match);
  const automatic = late.season.originStandDown![0].clubs.broncos;
  const returningStarter = Object.values(lateMatch.origin!.selection.starters).find(id => automatic.includes(id))!;
  expect(returningStarter).toBeDefined();
  expect(fitnessOf(lateMatch, returningStarter)).toBe(fitnessOf(late, returningStarter));
  expect(lateMatch.origin!.matches[0].clubLoad?.players.some(([id]) => automatic.includes(id)) ?? false).toBe(false);
  expect(read(lateMatch)).toEqual(lateMatch);
});
