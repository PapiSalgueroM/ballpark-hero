import { expect, it } from 'vitest';
import { createNrlCareer, nrlScheduledRotationOptions, readNrlCareerSave, reduceNrlCareer, runNrlFastForward, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlInjuries, nrlMatchdaySelection, nrlNextRound, nrlSavedLineupPreview, nrlStarterOptions, NRL_ROLES, repairMatchday } from '@/lib/nrlManager';

const timing = (state: NrlCareerState) => {
  const { year, clubId, round } = state.season;
  return { year, clubId, round };
};
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const restore = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const setup = () => {
  const original = createNrlCareer('storm', 4);
  const dates = timing(original);
  const first = reduceNrlCareer(original, { type: 'saveLineup', ...dates });
  const fullback = nrlStarterOptions(first.season, 'Fullback').find(player => player.id !== first.season.lineup.Fullback)!;
  const rotated = reduceNrlCareer(first, { type: 'selectStarter', role: 'Fullback', playerId: fullback.id });
  const saved = reduceNrlCareer(rotated, { type: 'saveLineup', ...dates, slot: 'rotation' });
  return reduceNrlCareer(saved, { type: 'applySavedLineup', previewKey: nrlSavedLineupPreview(saved.season, saved.savedLineup!)!.key });
};

it('opens the booked lineup once, settles the actual manual choices and restores the usual team', () => {
  const before = setup();
  const dates = timing(before);
  const booking = { type: 'scheduleRotation', ...dates, fixtureRound: 2 } as const;
  const planned = reduceNrlCareer(before, booking);
  expect(planned.scheduledRotation?.preset).toEqual(before.savedRotationLineup);
  expect(planned.season).toBe(before.season);
  expect(restore(planned)).toEqual(planned);
  expect(reduceNrlCareer(planned, booking)).toBe(planned);
  expect(reduceNrlCareer(planned, { type: 'cancelRotation', ...dates })).toEqual(before);
  expect(reduceNrlCareer(before, { ...booking, fixtureRound: 21 })).toBe(before);
  expect(nrlScheduledRotationOptions(before).map(fixture => fixture.round)).not.toContain(21);
  const replaced = reduceNrlCareer(planned, { type: 'saveLineup', ...dates, slot: 'rotation' });
  expect(replaced.savedRotationLineup).not.toEqual(before.savedRotationLineup);
  expect(replaced.scheduledRotation?.preset).toEqual(before.savedRotationLineup);

  const ordinary = advance(before);
  const arrived = advance(restore(replaced)!);
  const usual = nrlMatchdaySelection(ordinary.season)!;
  expect(arrived.scheduledRotation?.returnLineup).toEqual(usual);
  expect(arrived.season.results).toEqual(ordinary.season.results);
  expect(arrived.season.lineup.Fullback).toBe(before.savedRotationLineup!.lineup.Fullback);
  expect(nrlMatchdaySelection(reduceNrlCareer(arrived, { type: 'cancelRotation', ...timing(arrived) }).season)).toEqual(usual);

  const centre = nrlStarterOptions(arrived.season, 'Left Centre').find(player => player.id !== arrived.season.lineup['Left Centre'])!;
  const tweaked = reduceNrlCareer(arrived, { type: 'selectStarter', role: 'Left Centre', playerId: centre.id });
  const live = reduceNrlCareer(tweaked, { type: 'startLive' });
  expect(restore(live)).toEqual(live);
  expect(reduceNrlCareer(live, { type: 'cancelRotation', ...timing(live) })).toBe(live);
  const played = reduceNrlCareer(restore(live)!, { type: 'finishLive', ...timing(live), tactic: live.season.tactic });
  expect(played).toEqual(advance(tweaked));
  const result = played.season.results.find(match => match.round === 2 && match.playerScoring)!;
  expect(result.playerScoring?.starters).toEqual(NRL_ROLES.map(role => tweaked.season.lineup[role]));
  expect(played.scheduledRotation).toBeUndefined();
  expect(nrlMatchdaySelection(played.season)).toEqual(nrlMatchdaySelection(repairMatchday({ ...played.season, ...usual })));
  expect(restore(played)).toEqual(played);
});

it('repairs a new injury at the booked round and does not use a changed opponent', () => {
  const base = createNrlCareer('broncos', 16);
  const dates = timing(base);
  const victim = base.season.lineup['Prop 10'];
  const first = reduceNrlCareer(base, { type: 'setKicker', playerId: victim });
  const ordered = reduceNrlCareer(first, { type: 'saveLineup', ...dates, slot: 'rotation' });
  const booked = reduceNrlCareer(ordered, { type: 'scheduleRotation', ...dates, fixtureRound: 2 });
  const due = advance(booked);
  expect(nrlInjuries(due.season).has(victim)).toBe(true);
  expect(due.scheduledRotation?.preset.kickerId).toBe(victim);
  expect(due.season.lineup['Prop 10']).not.toBe(victim);
  expect(due.season.kickerId).toBe(due.season.lineup.Halfback);
  expect(restore(due)).toEqual(due);
  const { fixture } = booked.scheduledRotation!;
  const home = fixture.homeId === dates.clubId;
  const originalOpponent = home ? fixture.awayId : fixture.homeId;
  const replacement = originalOpponent === 'storm' ? 'sharks' : 'storm';
  const shifted = { ...fixture, homeId: home ? dates.clubId : replacement, awayId: home ? replacement : dates.clubId };
  const changed = { ...booked, scheduledRotation: { ...booked.scheduledRotation!, fixture: shifted } };
  expect(restore(changed)).toEqual(changed);
  expect(advance(restore(changed)!)).toEqual(advance(ordered));
  expect(restore({ ...due, scheduledRotation: { ...due.scheduledRotation!, fixture: shifted } })).toBeNull();
});

it('uses the booked side in Fast-forward and keeps a plan pending over a bye', () => {
  const before = setup();
  const dates = timing(before);
  const fast = reduceNrlCareer(before, { type: 'scheduleRotation', ...dates, fixtureRound: 2 });
  const simulated = runNrlFastForward(fast, { ...dates, through: 2 });
  const report = simulated.state.season.results.find(match => match.round === 2 && match.playerScoring)!;
  expect(report.playerScoring?.starters[0]).toBe(before.savedRotationLineup!.lineup.Fullback);
  expect(simulated.state.scheduledRotation).toBeUndefined();

  let pending = reduceNrlCareer(before, { type: 'scheduleRotation', ...dates, fixtureRound: 22 });
  while (pending.season.round < 21) pending = advance(pending);
  expect(nrlNextRound(pending.season).clubStatus).toBe('bye');
  expect(pending.scheduledRotation?.returnLineup).toBeUndefined();
  expect(restore(pending)).toEqual(pending);
  const active = advance(pending);
  expect(active.scheduledRotation?.fixture.round).toBe(22);
  expect(active.scheduledRotation?.returnLineup).toBeDefined();
});

it('restores the usual lineup when the round after rotation is a bye', () => {
  const before = setup();
  let state = reduceNrlCareer(before, { type: 'scheduleRotation', ...timing(before), fixtureRound: 20 });
  while (state.season.round < 20) state = advance(state);
  const usual = state.scheduledRotation!.returnLineup!;
  expect(usual).toBeDefined();
  const rested = advance(state);
  expect(nrlNextRound(rested.season).clubStatus).toBe('bye');
  expect(rested.scheduledRotation).toBeUndefined();
  const repaired = repairMatchday({ ...rested.season, ...usual });
  expect(rested.season.lineup).toEqual(repaired.lineup);
  expect(rested.season.bench).toEqual(repaired.bench);
  expect(rested.season.kickerId).toBe(repaired.kickerId);
  expect(restore(rested)).toEqual(rested);
});
