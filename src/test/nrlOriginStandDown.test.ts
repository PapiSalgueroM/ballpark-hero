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
