import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import type { BudgetBuilderState } from '@/hooks/useBudgetBuilder';
import type { Player } from '@/types/game';

const io = vi.hoisted(() => ({
  state: null as BudgetBuilderState | null, pool: [] as Player[], draws: [] as number[], fetches: [] as unknown[],
  other: [] as unknown[], completion: vi.fn(async () => {}), clipboard: vi.fn(async () => {}),
}));
vi.mock('@/hooks/useBudgetBuilder', async original => {
  const actual = await original<typeof import('@/hooks/useBudgetBuilder')>();
  return { ...actual, useBudgetBuilder: () => { const state = actual.useBudgetBuilder(); io.state = state; return state; } };
});
vi.mock('@/lib/squadDeal', async original => ({
  ...await original<typeof import('@/lib/squadDeal')>(),
  fetchSquadPool: async (...args: unknown[]) => { io.fetches.push(args); return io.pool; },
}));
vi.mock('@/lib/completions', () => ({ recordCompletion: io.completion, getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));

import { BudgetBuilderBoard } from '@/components/budget-builder/BudgetBuilderBoard';
import { FORMATIONS } from '@/lib/squadDeal';
import { dailyIndex } from '@/lib/dateUtils';

const TITLES = {
  before: 'BB_SCORE_BEFORE_FINAL itemizes earned points and an explicitly pending Final',
  boundary: 'BB_SCORE_SAVINGS keeps the exact floor at 199 200 and 201 million remaining',
  demand: 'BB_SCORE_DEMAND awards ten only when the completed XI meets its real daily demand',
  win: 'BB_SCORE_WIN displays the actual three-leg win bonus and exact total',
  draw: 'BB_SCORE_DRAW displays five for an actual drawn Final',
  loss: 'BB_SCORE_LOSS displays zero for an actual lost Final',
  replacement: 'BB_SCORE_REPLACEMENT previews a quality gain offset by losing a savings point',
  refund: 'BB_SCORE_REFUND uses the original signing refund and reconciles the committed total',
  reset: 'BB_SCORE_SERIES_RESET removes an old Final bonus from a replacement projection',
  quiet: 'BB_SCORE_PRESERVE keeps incomplete and complete preview inspection unscored and read only',
} as const;
type Key = keyof typeof TITLES;
type Points = { quality: number; savings: number; demand: number; series: string; total: number };
const pending = 'Pending (0 so far)';
const raw = { version: 1, scope: 'Actual BudgetBuilderBoard and useBudgetBuilder, real rating, daily criterion and three-leg simulation; only the fetched player pool and external completion/auth/badge boundaries are fictional or offline. No new real sports data.',
  caseTitles: Object.values(TITLES), cases: {} as Record<string, { title: string; frames: unknown[] }> };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const state = () => io.state!;
const normalDraw = () => { io.draws.push(0.5); return 0.5; };
const player = (name: string, position: Player['position'], marketValue: number): Player => ({
  name, position, marketValue, age: 22, nationality: 'Generated Nation', club: 'Generated club ' + name,
  league: 'Other', goals: 0, assists: 0, kitNumber: null, difficulty: 'easy',
});
const keeper = (value: number) => io.pool.find(p => p.name === 'Generated Keeper ' + value)!;
function xi(value: number) {
  return FORMATIONS[0].slots.map((_slot, index) => index === 0 ? keeper(value) : io.pool.find(p => p.name === 'Generated XI ' + index)!);
}
function storage() { return Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])); }
function capture(key: Key, label: string) {
  (raw.cases[key] ??= { title: TITLES[key], frames: [] }).frames.push(copy({
    label, inputPool: io.pool, state: state(), draws: io.draws, fetches: io.fetches, other: io.other,
    completion: io.completion.mock.calls, clipboard: io.clipboard.mock.calls, storage: storage(),
    html: document.body.innerHTML, text: document.body.textContent,
  }));
}
function heldState() {
  const { activeSlot: _active, candidates: _candidates, search: _search, ...held } = copy(state());
  return held;
}
async function flush() { await act(async () => { for (let index = 0; index < 12; index++) await Promise.resolve(); }); }
async function start() {
  cleanup(); io.state = null;
  const view = render(<BudgetBuilderBoard />); await flush();
  expect(view.queryByRole('button', { name: 'GK slot 1: empty' }), 'BB_SCORE_SETUP actual fetched market ready').not.toBeNull();
  expect(state().criterion.id, 'BB_SCORE_SETUP actual date selects the no-galactico demand').toBe('no-galactico');
  return view;
}
function preview(view: ReturnType<typeof render>, value: Player, index = 0) {
  const button = view.container.querySelector<HTMLButtonElement>('[data-budget-slot="' + index + '"]')!;
  expect(button, 'BB_SCORE_SETUP actual slot exists').not.toBeNull(); if (state().activeSlot !== index) fireEvent.click(button);
  fireEvent.change(view.getByRole('textbox'), { target: { value: value.name } });
  fireEvent.click(view.getByRole('button', { name: 'Preview signing ' + value.name + ' for $' + value.marketValue + 'M' }));
}
function sign(view: ReturnType<typeof render>, value: Player, index: number) {
  preview(view, value, index); fireEvent.click(view.getByRole('button', { name: 'Confirm signing' }));
}
async function filled(value = 200) {
  const view = await start();
  for (const [index, p] of xi(value).entries()) sign(view, p, index);
  await flush(); return view;
}
function field(region: HTMLElement, label: string): string | null {
  const term = within(region).queryByText(label, { selector: 'dt' });
  return term?.nextElementSibling?.tagName === 'DD' ? term.nextElementSibling.textContent?.trim() ?? null : null;
}
function points(region: HTMLElement | null): Points | null {
  if (!region) return null;
  const integer = (label: string) => {
    const text = field(region, label);
    return text !== null && /^[+-]?\d+(?: points?)?$/.test(text) ? parseInt(text, 10) : null;
  };
  return { quality: integer('Squad quality'), savings: integer('Savings'), demand: integer('Board demand'),
    series: field(region, 'Series outcome'), total: integer('Total') } as Points;
}
function overview() { return points(screen.queryByRole('region', { name: 'Score breakdown' })); }
function projection() {
  const region = screen.queryByRole('region', { name: 'Score impact after signing' });
  return region ? { ...points(region), change: field(region, 'Total change') } : null;
}
function check(key: Key, actual: Points | null, expected: Points) {
  expect(actual, TITLES[key] + ' accessible exact components').toEqual(expected);
  const bonus = expected.series === pending || expected.series === 'Loss (+0)' ? 0 : expected.series === 'Draw (+5)' ? 5 : 15;
  expect(actual!.quality + actual!.savings + actual!.demand + bonus, TITLES[key] + ' components sum exactly').toBe(actual!.total);
}
async function final(view: ReturnType<typeof render>, outcome: 'win' | 'draw' | 'loss', key: Key) {
  // Real poissonish draws produce one goal for the chosen side, no goals for the other,
  // one actual goal event, and no save event. Each leg uses 14 draws, or 11 for a 0-0.
  const user = outcome === 'win' ? [0, .99, .99, .99, .99] : Array(5).fill(.99);
  const ai = outcome === 'loss' ? [0, .99, .99, .99, .99] : Array(5).fill(.99);
  const leg = [...user, ...ai, ...(outcome === 'draw' ? [] : [0, .1, .2]), .99];
  const tape = [...leg, ...leg, ...leg]; let used = 0;
  vi.mocked(Math.random).mockImplementation(() => {
    if (used >= tape.length) throw new Error('BB_SCORE_SETUP actual series exceeded declared tape');
    const value = tape[used++]; io.draws.push(value); return value;
  });
  try { fireEvent.click(view.getByRole('button', { name: /Play the Final vs the Money XI/ })); await flush(); }
  finally { vi.mocked(Math.random).mockImplementation(normalDraw); }
  capture(key, 'actual-' + outcome + '-Final');
  expect(used, TITLES[key] + ' every declared simulation draw consumed').toBe(tape.length);
  expect(state().series?.outcome, TITLES[key] + ' actual outcome').toBe(outcome);
  expect(state().series?.legs.map(l => [l.userGoals, l.aiGoals]), TITLES[key] + ' actual three-leg scores')
    .toEqual(Array.from({ length: 3 }, () => outcome === 'win' ? [1, 0] : outcome === 'loss' ? [0, 1] : [0, 0]));
}
beforeEach(async () => {
  // Initialize React's one-time async-act scheduler before observing application draws.
  await act(async () => {});
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  const day = Array.from({ length: 20 }, (_, index) => new Date(Date.UTC(2026, 9, 1 + index, 16)).toISOString().slice(0, 10))
    .find(value => dailyIndex(value, 10) === 1);
  expect(day, 'BB_SCORE_SETUP real daily walk supplies the required demand').toBeDefined();
  vi.setSystemTime(new Date(day! + 'T16:00:00Z'));
  io.pool = [...FORMATIONS[0].slots.slice(1).map((slot, index) => player('Generated XI ' + (index + 1), slot.allowed[0], 60)),
    ...[40, 199, 200, 201, 400].map(value => player('Generated Keeper ' + value, 'GK', value))];
  io.draws = []; io.fetches = []; io.other = []; io.state = null; vi.clearAllMocks();
  vi.spyOn(Math, 'random').mockImplementation(normalDraw);
  vi.stubGlobal('fetch', vi.fn((url: unknown) => { io.other.push(String(url)); return Promise.reject(new Error('Undeclared Budget fixture transport')); }));
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: io.clipboard } });
  localStorage.clear(); sessionStorage.clear(); localStorage.setItem('budget-unrelated', 'held');
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
afterAll(() => {
  const destination = process.env.BB_SCORE_BREAKDOWN_RAW;
  if (!destination) return;
  if (!isAbsolute(destination)) throw new Error('BB_SCORE_BREAKDOWN_RAW must be absolute');
  mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' });
});

describe('Budget Builder earned score breakdown', () => {
  it(TITLES.before, async () => {
    await filled(); capture('before', 'complete-before-Final');
    // Ten 60M age-22 players rate85 and the 200M keeper rates91: rounded XI86.
    expect([state().teamRating, state().remaining, state().criterionMet, state().finalScore], TITLES.before).toEqual([86, 200, true, 97]);
    check('before', overview(), { quality: 86, savings: 1, demand: 10, series: pending, total: 97 });
    expect(state().series).toBeNull(); expect(io.completion).not.toHaveBeenCalled(); expect(io.draws).toEqual([]);
  });
  it(TITLES.boundary, async () => {
    const observed = [];
    for (const value of [199, 200, 201]) { await filled(value); capture('boundary', 'keeper-' + value); observed.push({ remaining: state().remaining, score: state().finalScore, components: overview() }); }
    expect(observed, TITLES.boundary).toEqual([
      { remaining: 201, score: 97, components: { quality: 86, savings: 1, demand: 10, series: pending, total: 97 } },
      { remaining: 200, score: 97, components: { quality: 86, savings: 1, demand: 10, series: pending, total: 97 } },
      { remaining: 199, score: 96, components: { quality: 86, savings: 0, demand: 10, series: pending, total: 96 } },
    ]);
  });
  it(TITLES.demand, async () => {
    const observed = [];
    for (const value of [200, 400]) { await filled(value); capture('demand', 'keeper-' + value); observed.push({ met: state().criterionMet, score: state().finalScore, components: overview() }); }
    expect(observed, TITLES.demand).toEqual([
      { met: true, score: 97, components: { quality: 86, savings: 1, demand: 10, series: pending, total: 97 } },
      { met: false, score: 86, components: { quality: 86, savings: 0, demand: 0, series: pending, total: 86 } },
    ]);
  });
  for (const [outcome, bonus] of [['win', 15], ['draw', 5], ['loss', 0]] as const) it(TITLES[outcome], async () => {
    const view = await filled(); await final(view, outcome, outcome);
    check(outcome, overview(), { quality: 86, savings: 1, demand: 10, series: outcome === 'win' ? 'Win (+15)' : outcome === 'draw' ? 'Draw (+5)' : 'Loss (+0)', total: 97 + bonus });
    expect(state().finalScore, TITLES[outcome]).toBe(97 + bonus);
    expect(io.completion, TITLES[outcome] + ' unchanged completion').toHaveBeenCalledExactlyOnceWith('/budget-builder', 97 + bonus, null, 86);
    expect(io.other).toEqual([]);
  });
  it(TITLES.replacement, async () => {
    const view = await filled(40), before = heldState(), beforeDraws = copy(io.draws), beforeStorage = storage();
    preview(view, keeper(201)); capture('replacement', 'quality-up-savings-down-before-commit');
    expect(projection(), TITLES.replacement).toEqual({ quality: 86, savings: 0, demand: 10, series: pending, total: 96, change: '+0' });
    expect([state().teamRating, state().remaining, state().finalScore], TITLES.replacement).toEqual([85, 360, 96]);
    expect(heldState()).toEqual(before); expect(io.draws).toEqual(beforeDraws); expect(storage()).toEqual(beforeStorage); expect(io.completion).not.toHaveBeenCalled();
  });
  it(TITLES.refund, async () => {
    const view = await filled(201); preview(view, keeper(199)); const projected = projection(); capture('refund', 'before-refunded-replacement');
    fireEvent.click(view.getByRole('button', { name: 'Confirm signing' })); await flush(); capture('refund', 'refunded-replacement-committed');
    expect(projected, TITLES.refund).toEqual({ quality: 86, savings: 1, demand: 10, series: pending, total: 97, change: '+1' });
    expect([state().spent, state().remaining, state().finalScore], TITLES.refund).toEqual([799, 201, 97]);
    expect(state().squad[0]).toBe(keeper(199)); check('refund', overview(), { quality: 86, savings: 1, demand: 10, series: pending, total: 97 }); expect(io.completion).not.toHaveBeenCalled();
  });
  it(TITLES.reset, async () => {
    const view = await filled(); await final(view, 'win', 'reset'); preview(view, keeper(199)); const projected = projection(); capture('reset', 'old-win-replacement-projection');
    fireEvent.click(view.getByRole('button', { name: 'Confirm signing' })); await flush(); capture('reset', 'new-XI-awaits-new-Final');
    expect(projected, TITLES.reset).toEqual({ quality: 86, savings: 1, demand: 10, series: pending, total: 97, change: '-15' });
    expect(state().series).toBeNull(); expect(state().finalScore, TITLES.reset).toBe(97);
    check('reset', overview(), { quality: 86, savings: 1, demand: 10, series: pending, total: 97 }); expect(io.completion).toHaveBeenCalledTimes(1);
  });
  it(TITLES.quiet, async () => {
    const view = await start();
    for (let index = 0; index < 10; index++) sign(view, xi(200)[index], index);
    await flush(); capture('quiet', 'ten-signed-no-earned-score'); expect([state().complete, state().finalScore]).toEqual([false, 0]);
    const before = heldState(), beforeStorage = storage(), beforeDraws = copy(io.draws);
    preview(view, xi(200)[10], 10); capture('quiet', 'last-slot-preview-only'); fireEvent.click(view.getByRole('button', { name: 'Cancel preview' }));
    view.rerender(<BudgetBuilderBoard />); await flush(); capture('quiet', 'partial-preview-cancelled');
    expect(heldState(), TITLES.quiet).toEqual(before); expect(storage()).toEqual(beforeStorage); expect(io.draws).toEqual(beforeDraws); expect(io.completion).not.toHaveBeenCalled();
    sign(view, xi(200)[10], 10); await flush(); const complete = heldState(), draws = copy(io.draws);
    preview(view, keeper(201)); fireEvent.click(view.getByRole('button', { name: 'Cancel preview' })); view.rerender(<BudgetBuilderBoard />); await flush(); capture('quiet', 'complete-preview-cancelled-no-Final');
    expect(heldState(), TITLES.quiet).toEqual(complete); expect(state().finalScore).toBe(97); expect(state().series).toBeNull(); expect(io.draws).toEqual(draws); expect(io.completion).not.toHaveBeenCalled(); expect(io.other).toEqual([]);
  });
});
