import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CareerState, CMPlayer, Formation } from '@/lib/clubManager';
import type { Position } from '@/types/game';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn() }));
type Engine = typeof import('@/lib/clubManager');
type Api = ReturnType<typeof import('@/hooks/useClubManager').useClubManager>;
let draws: number[], next: () => number;
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const POSITIONS: Position[] = ['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CM', 'RW', 'ST', 'LW'];
const ORDINARY = ['p0', 'starter-rb', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];
const ROTATED = ['p0', 'fresh-rb', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];
function stream(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function raw(name: string, value: unknown) {
  if (!process.env.CM_FRESH_XI_RAW) return;
  mkdirSync(process.env.CM_FRESH_XI_RAW, { recursive: true });
  writeFileSync(join(process.env.CM_FRESH_XI_RAW, name + '.json'), JSON.stringify({ case: name, observations: value }, null, 2) + '\n');
}
// The existing export accepts the future optional mode structurally, so old code reaches an outcome assertion.
const pickFresh = (E: Engine, squad: CMPlayer[], formation: Formation) =>
  (E.autoPickXI as (s: CMPlayer[], f: Formation, fresh?: boolean) => (string | null)[])(squad, formation, true);

async function fixture() {
  const E = await import('@/lib/clubManager');
  const made = E.startCareer('Rotation Borough', E.DEFAULT_ERA_ID, {
    name: 'Rotation Borough', stadium: 'Rotation Park', budgetTier: 'mid', quality: 70,
    leagueId: E.leagueOf('Auckland FC').id, replacedClub: 'Auckland FC',
    crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#ffffff', initials: 'RB' },
  });
  expect(E.FORMATIONS[0].slots.map(s => s.label), 'SETUP canonical eleven-slot shape').toEqual(POSITIONS);
  const template = made.squad[0];
  const player = (id: string, position: Position, rating = 70, fitness = 100): CMPlayer => ({
    ...template, id, name: 'Rotation Player ' + id, position, rating, fitness, morale: 68,
    age: 25, potential: rating, injuryWeeks: 0, suspendedMatches: 0, contractYears: 5,
    apps: 0, seasonGoals: 0, seasonAssists: 0, seasonYellows: 0, seasonReds: 0,
    cleanSheets: 0, ratingSum: 0, secondaryPositions: undefined, retraining: undefined,
    transferStatus: 'blocked', lastTen: [],
  });
  const squad = POSITIONS.map((position, i) => player('p' + i, position));
  squad[1] = player('starter-rb', 'RB', 90, 60);
  squad.push(player('fresh-rb', 'RB', 88, 85));
  const c: CareerState = { ...made, squad, formationIndex: 0, xiIds: [...ORDINARY],
    form: [], training: { intensity: 'normal', focus: 'balanced' },
    xiDuties: Array(11).fill(null), budget: 1000 };
  c.customShape = { v: 1, formationIndex: 0, points: E.FORMATIONS[0].slots.map(s => ({ x: s.x, y: Math.max(6, s.y - 3) })) };
  expect(E.nextFixture(c).kind, 'SETUP real custom-club fixture available').toBe('match');
  expect(c.calendar[c.week].night, 'SETUP first fixture charges an ordinary week').toBeFalsy();
  return { E, c, player, formation: E.FORMATIONS[0] };
}

beforeEach(() => {
  draws = []; next = stream(0x19040031);
  vi.spyOn(Math, 'random').mockImplementation(() => { const value = next(); draws.push(value); return value; });
  vi.spyOn(Date, 'now').mockReturnValue(1793793600000);
  Element.prototype.scrollIntoView = vi.fn();
  localStorage.clear(); sessionStorage.clear();
});
afterEach(async () => {
  cleanup();
  const { saveFence } = await import('@/lib/saveFence');
  const E = await import('@/lib/clubManager');
  saveFence.release(E.SAVE_KEY); vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear();
});

async function mountTactics(c: CareerState, E: Engine) {
  const { saveFence } = await import('@/lib/saveFence');
  const { useClubManager } = await import('@/hooks/useClubManager');
  const { TacticsScreen } = await import('@/components/club-manager/TacticsScreen');
  saveFence.release(E.SAVE_KEY);
  expect(E.saveCareer(c), 'SETUP actual career save accepts fixture').toBe(true);
  let current: Api | null = null;
  function Harness() {
    const g = useClubManager(); current = g;
    if (g.phase !== 'hub' || !g.career) return <p>{g.phase}</p>;
    return <TacticsScreen career={g.career} onFormation={g.setFormationIndex} onMentality={g.setMentality}
      onSlot={g.setXiSlot} onSwap={g.swapXiSlots} onAutoPick={g.autoPick} onDuty={g.setSlotDuty}
      onSetPiece={g.assignSetPiece} onAutoSetPieces={g.autoPickSetPieces} onShootoutOrder={g.setShootoutOrder}
      onCustomShape={g.setCustomShape} />;
  }
  const view = render(<Harness />);
  const read = (): Api => { if (!current) throw new Error('Real hook not mounted'); return current; };
  await waitFor(() => expect(read().phase).toBe('resume'), { timeout: 10000 });
  act(() => read().resume());
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Auto Pick' })).not.toBeNull());
  return { view, read };
}

describe('Club Manager fresh XI', () => {
  it('prioritizes eighty-fit eligible players without crossing availability or position rules', async () => {
    const { E, player, formation } = await fixture();
    const one = { ...formation, slots: [formation.slots[1]] };
    const injured = { ...player('injured', 'RB', 99, 100), injuryWeeks: 1 };
    const banned = { ...player('banned', 'RB', 99, 100), suspendedMatches: 1 };
    const learned = { ...player('learned', 'CM', 75, 80), secondaryPositions: ['RB'] as Position[] };
    const rows = [
      [player('tired', 'RB', 99, 79), player('ready', 'RB', 70, 80)],
      [player('best-ready', 'RB', 81, 80), player('fitter', 'RB', 80, 100)],
      [player('natural', 'RB', 70, 79), player('wrong-line', 'ST', 99, 100)],
      [injured, banned, player('legal', 'RB', 70, 79)],
      [player('primary', 'RB', 95, 79), learned],
    ];
    const before = JSON.stringify(rows), at = draws.length;
    const actual = rows.map(squad => pickFresh(E, squad, one));
    raw('policy', { actual, before, after: JSON.stringify(rows), drawDelta: draws.length - at });
    expect(JSON.stringify(rows), 'Selection never edits actual ratings or fitness').toBe(before);
    expect(draws.length - at, 'Selection consumes no global draws').toBe(0);
    expect(actual, 'CM_FRESH_XI_POLICY').toEqual([['ready'], ['best-ready'], ['natural'], ['legal'], ['learned']]);
  });

  it('rests the tired starter through the actual kickoff and charged match week', async () => {
    const { E, c, formation } = await fixture();
    const before = JSON.stringify(c), at = draws.length;
    const rotated = { ...copy(c), xiIds: pickFresh(E, c.squad, formation) };
    const drawDelta = draws.length - at;
    function play(input: CareerState) {
      next = stream(740031); const start = draws.length;
      const result = E.playNextEntry(input, { skipHalftime: true, noCoach: true });
      const tape = draws.slice(start);
      return { result, tape, nextDraw: next() };
    }
    const ordinary = play(c), fresh = play(rotated);
    const find = (state: CareerState, id: string) => state.squad.find(p => p.id === id)!;
    const summary = (arm: typeof fresh) => ({ kind: arm.result.kind, week: arm.result.state.week,
      starter: find(arm.result.state, 'starter-rb'), reserve: find(arm.result.state, 'fresh-rb'),
      report: arm.result.report, tape: arm.tape, nextDraw: arm.nextDraw });
    raw('recovery', { ids: rotated.xiIds, ordinary: summary(ordinary), fresh: summary(fresh),
      ordinaryStrength: E.matchStrengthNow(c), freshStrength: E.matchStrengthNow(rotated), selectionDraws: drawDelta });
    expect(JSON.stringify(c), 'Playing either arm never mutates its source save').toBe(before);
    expect(drawDelta, 'Selection itself consumes no draws').toBe(0);
    expect([ordinary.result.kind, fresh.result.kind], 'Both arms play the real complete fixture').toEqual(['match', 'match']);
    expect([ordinary.result.state.week, fresh.result.state.week]).toEqual([c.week + 1, c.week + 1]);
    expect(rotated.xiIds, 'CM_FRESH_XI_RECOVERY').toEqual(ROTATED);
    expect(find(fresh.result.state, 'starter-rb').fitness, 'CM_FRESH_XI_RECOVERY').toBe(92);
    expect(find(ordinary.result.state, 'starter-rb').fitness).toBeGreaterThanOrEqual(64);
    expect(find(ordinary.result.state, 'starter-rb').fitness).toBeLessThanOrEqual(72);
    expect(find(ordinary.result.state, 'fresh-rb').fitness).toBe(100);
    expect(find(fresh.result.state, 'fresh-rb').fitness).toBeGreaterThanOrEqual(72);
    expect(find(fresh.result.state, 'fresh-rb').fitness).toBeLessThanOrEqual(80);
    // Two fewer rating points and twenty-five more fitness points on one man: (25 * .14 - 2) / 11.
    expect(E.matchStrengthNow(rotated) - E.matchStrengthNow(c), 'CM_FRESH_XI_RECOVERY').toBeCloseTo(1.5 / 11, 10);
  });

  it('offers Fresh XI through the real tactics hook and preserves it through save reload', async () => {
    const { E, c } = await fixture();
    const f = await mountTactics(c, E), before = copy(f.read().career!), at = draws.length;
    const button = screen.queryByRole('button', { name: 'Fresh XI' });
    raw('saved-action', { offered: !!button, beforeIds: before.xiIds });
    expect(button !== null, 'CM_FRESH_XI_SAVED_ACTION').toBe(true);
    if (!button) return;
    fireEvent.click(button);
    await waitFor(() => expect(f.read().career!.xiIds, 'CM_FRESH_XI_SAVED_ACTION').toEqual(ROTATED));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(E.SAVE_KEY)!).xiIds).toEqual(ROTATED));
    const after = copy(f.read().career!), saved = localStorage.getItem(E.SAVE_KEY)!;
    const drawDelta = draws.length - at;
    const loaded = E.loadCareer()!;
    raw('saved-action', { offered: true, before, after, saved: JSON.parse(saved), loaded, drawDelta });
    expect({ ...after, xiIds: before.xiIds }, 'Only the chosen eleven changes').toStrictEqual(before);
    expect(loaded.xiIds, 'CM_FRESH_XI_SAVED_ACTION').toEqual(ROTATED);
    expect(loaded.customShape).toStrictEqual(before.customShape);
    expect(drawDelta, 'The actual rotation action draws nothing').toBe(0);
    expect(screen.getByText(/80\+/).textContent, 'The threshold and fallback are explained').toMatch(/fit|fitness|available/i);
    f.view.unmount();
  });

  it('keeps ordinary Auto Pick rating-first with no new draws or state edits', async () => {
    const { E, c, formation } = await fixture(), before = JSON.stringify(c), at = draws.length;
    const picked = E.autoPickXI(c.squad, formation);
    expect(picked).toEqual(ORDINARY);
    expect(JSON.stringify(c)).toBe(before); expect(draws.length - at).toBe(0);
    const f = await mountTactics(c, E), actionBefore = copy(f.read().career!), actionDraws = draws.length;
    fireEvent.click(screen.getByRole('button', { name: 'Auto Pick' }));
    await waitFor(() => expect(f.read().career!.xiIds).toEqual(ORDINARY));
    raw('ordinary', { picked, career: f.read().career, drawDelta: draws.length - actionDraws });
    expect(f.read().career).toStrictEqual(actionBefore);
    expect(draws.length - actionDraws).toBe(0);
    f.view.unmount();
  });

  it('fills a short squad once each and leaves only genuinely empty slots', async () => {
    const { E, player, formation } = await fixture();
    const squad = [player('keeper', 'GK', 70, 79), player('back', 'RB', 70, 79), player('forward', 'ST', 70, 79)];
    const before = JSON.stringify(squad), at = draws.length;
    const selected = pickFresh(E, squad, formation);
    raw('short-squad', { selected, before, after: JSON.stringify(squad), drawDelta: draws.length - at });
    expect(selected).toEqual(['keeper', 'back', 'forward', null, null, null, null, null, null, null, null]);
    expect(new Set(selected.filter(Boolean)).size).toBe(3);
    expect(JSON.stringify(squad)).toBe(before); expect(draws.length - at).toBe(0);
  });
});
