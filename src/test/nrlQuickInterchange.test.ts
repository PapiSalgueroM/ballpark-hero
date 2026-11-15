import { expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, runNrlFastForward, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlQuickInterchangeOptions, nrlQuickInterchangeOutcome } from '@/lib/nrlManager';

const tick = ({ season }: NrlCareerState) => ({ year: season.year, clubId: season.clubId, round: season.round });
const open = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'setOpenInterchange', ...tick(state), enabled: true });
const quick = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const match = (state: NrlCareerState) => state.season.results.find(row => row.playerScoring)!;
const fixture = () => open(createNrlCareer('storm', 13));
const rule = (trigger: 'ahead' | 'behind') => ({ reserveId: 'storm-11-1', role: 'Left Second Row', trigger } as const);
const book = (state: NrlCareerState, trigger: 'ahead' | 'behind') => reduceNrlCareer(state, { type: 'setQuickInterchange', ...tick(state), plan: rule(trigger) });
const live = (state: NrlCareerState) => {
  const started = reduceNrlCareer(state, { type: 'startLive' });
  return reduceNrlCareer(started, { type: 'reachMinute60', year: 2026, round: 1, tactic: 'balanced' });
};

it('settles a Quick Sim rule exactly like the actual Live minute-60 interchange', () => {
  const starting = fixture();
  const option = nrlQuickInterchangeOptions(starting.season).find(row => row.reserveId === rule('ahead').reserveId);
  expect(option).toMatchObject({ role: rule('ahead').role });
  const booked = book(starting, 'ahead');
  expect(booked.season.quickInterchange).toEqual(rule('ahead'));
  expect(read(booked)).toEqual(booked);
  const settled = quick(read(booked)!);
  const expected = reduceNrlCareer(live(starting), { type: 'finishMinute60', year: 2026, round: 1, tactic: 'balanced',
    reserveId: rule('ahead').reserveId, reserveRole: rule('ahead').role });
  const receipt = match(settled);
  const { quickInterchange, ...standard } = receipt;
  expect(quickInterchange).toEqual(rule('ahead'));
  expect(standard).toEqual(match(expected));
  expect([receipt.homeScore, receipt.awayScore]).toEqual([30, 6]);
  expect(receipt.benchUsed?.at(-1)).toBe(rule('ahead').reserveId);
  expect(settled.players).toEqual(expected.players);
  const withoutSub = quick(starting);
  const fitness = (state: NrlCareerState, id: string) => state.season.squad.find(player => player.id === id)!.fitness;
  expect(fitness(withoutSub, rule('ahead').reserveId) - fitness(settled, rule('ahead').reserveId)).toBe(4);
  expect(fitness(settled, option!.starterId) - fitness(withoutSub, option!.starterId)).toBe(4);
  expect(settled.season.quickInterchange).toBeUndefined();
  expect(read(settled)).toEqual(settled);
});

it('saves a missed rule without using the reserve, preserves manual Live and clears a removed fourth slot', () => {
  const starting = fixture();
  const booked = book(starting, 'behind');
  const direct = reduceNrlCareer(live(starting), { type: 'finishMinute60', year: 2026, round: 1, tactic: 'balanced' });
  const { quickInterchange, ...actual } = match(quick(booked));
  expect(quickInterchange).toEqual(rule('behind'));
  expect(actual).toEqual(match(direct));
  expect(actual.minute60Interchange).toBeUndefined();
  expect(quick(booked).players).toEqual(direct.players);
  expect(read(quick(booked))).toEqual(quick(booked));
  const manual = reduceNrlCareer(live(booked), { type: 'finishMinute60', year: 2026, round: 1, tactic: 'balanced' });
  expect(manual).toEqual(direct);
  expect(reduceNrlCareer(booked, { type: 'setOpenInterchange', ...tick(booked), enabled: false }))
    .toEqual(reduceNrlCareer(starting, { type: 'setOpenInterchange', ...tick(starting), enabled: false }));
});

it('rejects stale rounds, unavailable initial choices and inconsistent saved use', () => {
  const starting = fixture();
  const plan = rule('ahead');
  expect(reduceNrlCareer(starting, { type: 'setQuickInterchange', ...tick(starting), round: 2, plan })).toBe(starting);
  expect(reduceNrlCareer(starting, { type: 'setQuickInterchange', ...tick(starting), plan: { ...plan, role: 'Hooker' } })).toBe(starting);
  const settled = quick(book(starting, 'ahead'));
  const altered = { ...settled, season: { ...settled.season, results: settled.season.results.map(row => row === match(settled)
    ? { ...row, quickInterchange: rule('behind') } : row) } };
  expect(read(altered)).toBeNull();
});

it('keeps a plan readable after the reserve leaves the bench and reports a missed legal substitution', () => {
  const booked = book(fixture(), 'ahead');
  const slot = booked.season.bench!.indexOf(rule('ahead').reserveId);
  const revised = reduceNrlCareer(booked, { type: 'selectBench', slot, playerId: 'storm-1-1' });
  expect(revised.season.bench).not.toContain(rule('ahead').reserveId);
  expect(revised.season.quickInterchange).toEqual(rule('ahead'));
  expect(read(revised)).toEqual(revised);
  const settled = quick(revised);
  const result = match(settled);
  expect(result.scorePeriods?.at60).toEqual([20, 0]);
  expect(nrlQuickInterchangeOutcome(result, 'storm')).toBe('unavailable');
  expect(result.benchUsed).toHaveLength(3);
  expect(result.benchUsed).not.toContain(rule('ahead').reserveId);
  expect(read(settled)).toEqual(settled);
});

it('uses the managed away score and applies the plan once during fast-forward', () => {
  const starting = open(createNrlCareer('bears', 5, 2027));
  const option = nrlQuickInterchangeOptions(starting.season).find(row => row.reserveId === 'bears-11-1')!;
  const { reserveId, role } = option;
  const booked = reduceNrlCareer(starting, { type: 'setQuickInterchange', ...tick(starting), plan: { reserveId, role, trigger: 'behind' } });
  const final = runNrlFastForward(read(booked)!, { ...tick(booked), through: 2 }).state;
  const result = match(final);
  expect(result.awayId).toBe('bears');
  expect(result.scorePeriods?.at60).toEqual([28, 10]);
  expect(nrlQuickInterchangeOutcome(result, 'bears')).toBe('used');
  expect(result.benchUsed?.at(-1)).toBe(reserveId);
  expect(final.season.results.filter(row => row.quickInterchange)).toHaveLength(1);
  expect(final.season.quickInterchange).toBeUndefined();
  expect(read(final)).toEqual(final);
});
