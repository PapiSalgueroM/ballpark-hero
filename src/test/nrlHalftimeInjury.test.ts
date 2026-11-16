import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlHalftimeInterchanges, nrlInjuries, nrlMinute60Returns, nrlQuickInterchangeOptions } from '@/lib/nrlManager';

const clubId = 'broncos';
const injured = 'broncos-1-0';
const usual = 'broncos-1-1';
const alternate = 'nrl-broncos-2026-26';
const fixture = { year: 2026, clubId, round: 1 };
const knock = { playerId: injured, rounds: 3 };
const defaultCover = { starterId: injured, reserveId: usual };
const raw = (state: NrlCareerState) => JSON.stringify(state);
const restore = (state: NrlCareerState) => readNrlCareerSave(raw(state));
const start = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'startLive' });
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const match = (state: NrlCareerState) => state.season.results.find(result =>
  result.round === 1 && (result.homeId === clubId || result.awayId === clubId))!;

function kickoff() {
  const old = createNrlCareer(clubId, 4, 2026);
  return { ...old, season: { ...old.season, halftimeInjuryCover: true as const } };
}

function withOpenSlot() {
  const picked = reduceNrlCareer(kickoff(), { type: 'selectBench', slot: 4, playerId: alternate });
  return reduceNrlCareer(picked, { type: 'setOpenInterchange', ...fixture, enabled: true });
}

describe('NRL halftime injury cover', () => {
  it('shows the seeded knock at halftime and settles the same legal default in Quick Sim', () => {
    const pending = start(kickoff());
    expect(pending.season.live?.halftimeInjury).toEqual(knock);
    expect(restore(pending)).toEqual(pending);
    const action = { type: 'finishLive', ...fixture, tactic: pending.season.tactic } as const;
    const settled = reduceNrlCareer(restore(pending)!, action);
    const quick = advance(kickoff());
    expect(raw(settled)).toBe(raw(quick));
    const result = match(settled);
    expect(result).toMatchObject({ injury: knock, halftimeInjury: true, halftimeInterchange: defaultCover });
    expect(result.benchUsed).toHaveLength(4);
    expect(settled.season.lineup.Fullback).not.toBe(injured);
    expect(nrlInjuries(settled.season).get(injured)).toBe(3);
    expect(restore(settled)).toEqual(settled);
  });

  it('uses the one open place on either named fullback and bars the injured starter from returning', () => {
    const saved = withOpenSlot();
    const pending = start(saved);
    expect(pending.season.live?.halftimeInjury).toEqual(knock);
    const legal = nrlHalftimeInterchanges(pending.season);
    expect(legal.filter(option => option.starterId === injured).map(option => option.reserveId)).toEqual([usual, alternate]);
    const play = { type: 'reachMinute60', ...fixture, tactic: pending.season.tactic } as const;
    const wrongRole = legal.find(option => option.starterId !== injured)!;
    expect(reduceNrlCareer(pending, { ...play, interchange: wrongRole })).toBe(pending);
    const chosen = { starterId: injured, reserveId: alternate };
    const pause = reduceNrlCareer(pending, { ...play, interchange: chosen });
    expect(pause.season.live?.minute60?.interchange).toEqual(chosen);
    expect(restore(pause)).toEqual(pause);
    expect(restore({ ...pause, season: { ...pause.season, live: { ...pause.season.live!,
      minute60: { ...pause.season.live!.minute60!, interchange: undefined } } } })).toBeNull();
    expect(nrlMinute60Returns(pause.season).some(option => option.starterId === injured)).toBe(false);
    const finish = { type: 'finishMinute60', ...fixture, tactic: pause.season.tactic } as const;
    expect(reduceNrlCareer(pause, { ...finish, returnStarterId: injured })).toBe(pause);
    const settled = reduceNrlCareer(pause, finish);
    const result = match(settled);
    expect(result.halftimeInterchange).toEqual({ ...chosen, enteredAtHalf: true });
    expect(result.benchUsed).toHaveLength(4);
    expect(result.benchUsed?.at(-1)).toBe(alternate);
    expect(result.benchUsed).not.toContain(usual);
    expect(restore(settled)).toEqual(settled);
    expect(restore({ ...settled, season: { ...settled.season, results: settled.season.results.map(item => item === result
      ? { ...result, minute60Return: chosen } : item) } })).toBeNull();
  });

  it('gives injury cover the open place ahead of a conditional Quick Sim interchange', () => {
    const open = withOpenSlot();
    const option = nrlQuickInterchangeOptions(open.season).find(row => row.role !== 'Fullback')!;
    expect(option).toBeDefined();
    const planned = reduceNrlCareer(open, { type: 'setQuickInterchange', ...fixture,
      plan: { reserveId: option.reserveId, role: option.role, trigger: 'ahead' } });
    expect(planned.season.quickInterchange).toBeDefined();
    const half = start(planned);
    const live = reduceNrlCareer(half, { type: 'finishLive', ...fixture, tactic: half.season.tactic });
    const quick = advance(planned);
    expect(raw(live)).toBe(raw(quick));
    expect(match(quick)).toMatchObject({ halftimeInjury: true, halftimeInterchange: { ...defaultCover, enteredAtHalf: true } });
    expect(match(quick).quickInterchange).toBeUndefined();
    expect(restore(quick)).toEqual(quick);
  });

  it('honors a legal planned Quick Sim change after keeping a rotating injury cover', () => {
    const old = createNrlCareer(clubId, 23, 2026);
    const marked = { ...old, season: { ...old.season, halftimeInjuryCover: true as const } };
    const open = reduceNrlCareer(marked, { type: 'setOpenInterchange', ...fixture, enabled: true });
    const option = nrlQuickInterchangeOptions(open.season).find(row => row.role !== 'Left Wing')!;
    expect(option).toBeDefined();
    const plan = { reserveId: option.reserveId, role: option.role, trigger: 'ahead' as const };
    const planned = reduceNrlCareer(open, { type: 'setQuickInterchange', ...fixture, plan });
    const quick = advance(planned);
    const result = match(quick);
    expect(result).toMatchObject({ halftimeInjury: true, halftimeInterchange: { starterId: 'broncos-2-0' }, quickInterchange: plan });
    expect(result.halftimeInterchange?.enteredAtHalf).toBeUndefined();
    expect(result.minute60Interchange).toMatchObject({ reserveId: plan.reserveId });
    expect(result.benchUsed).toHaveLength(4);
    expect(restore(quick)).toEqual(quick);
  });

  it('applies medical facilities once to the seeded injury in either match mode', () => {
    const upgraded = reduceNrlCareer(kickoff(), { type: 'upgradeMedical', level: 2 });
    expect(upgraded.finance.medicalUpgrades?.at(-1)?.level).toBe(2);
    const half = start(upgraded);
    const injury = { ...knock, rounds: 2 };
    expect(half.season.live?.halftimeInjury).toEqual(injury);
    expect(restore(half)).toEqual(half);
    const settled = reduceNrlCareer(half, { type: 'finishLive', ...fixture, tactic: half.season.tactic });
    expect(match(settled).injury).toEqual(injury);
    expect(raw(settled)).toBe(raw(advance(upgraded)));
    expect(nrlInjuries(settled.season).get(injured)).toBe(2);
  });

  it('settles the old knock without adding a bench spot when nobody can take over at the break', () => {
    const uncovered = reduceNrlCareer(kickoff(), { type: 'selectBench', slot: 3, playerId: 'broncos-4-1' });
    const half = start(uncovered);
    expect(half.season.live).toBeDefined();
    expect(half.season.live?.halftimeInjury).toBeUndefined();
    const settled = reduceNrlCareer(half, { type: 'finishLive', ...fixture, tactic: half.season.tactic });
    expect(match(settled).injury).toEqual(knock);
    expect(match(settled)).not.toHaveProperty('halftimeInterchange');
    expect(raw(settled)).toBe(raw(advance(uncovered)));
    expect(restore(settled)).toEqual(settled);
  });

  it('keeps the original save and settling path for the same seed without the new rule', () => {
    const old = createNrlCareer(clubId, 4, 2026);
    const pending = start(old);
    expect(pending.season.live?.halftimeInjury).toBeUndefined();
    expect(restore(pending)).toEqual(pending);
    const settled = advance(old);
    expect(match(settled).injury).toEqual(knock);
    expect(match(settled)).not.toHaveProperty('halftimeInterchange');
    expect(restore(settled)).toEqual(settled);
  });
});
