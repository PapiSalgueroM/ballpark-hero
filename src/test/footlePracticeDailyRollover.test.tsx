import { writeFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Footle from '@/pages/Footle';
import { dailyIndex, getDailyTier, getTodayET } from '@/lib/dateUtils';
import { FOOTLE_PRACTICE_KEY, parsePracticeRun } from '@/lib/footlePracticeRun';
import { FOOTLE_UNLIMITED_KEY, parseUnlimitedSession } from '@/lib/footleUnlimitedSession';
import { practicePlayers } from '@/test/fixtures/footlePracticePlayers';
import type { GuessResult, Player } from '@/types/game';

const boundary = vi.hoisted(() => ({ fetch: vi.fn(), completion: vi.fn() }));
vi.mock('@/lib/fetchFootlePlayerPool', () => ({ fetchFootlePlayerPool: () => boundary.fetch() }));
vi.mock('@/hooks/useGameCompletion', () => ({
  useGameCompletion: (...args: unknown[]) => boundary.completion(...args),
}));
vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ headerExtra, children }: { headerExtra: ReactNode; children: ReactNode }) =>
    <main>{headerExtra}{children}</main>,
}));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/game/PostGameStats', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));

const fixture = {
  rows: practicePlayers,
  oldAt: Date.parse('2026-11-08T04:59:59.000Z'),
  newAt: Date.parse('2026-11-08T05:00:01.000Z'),
  oldDay: '2026-11-07',
  newDay: '2026-11-08',
  oldTarget: 'Fixture hard F',
  newTarget: 'Fixture hard A',
  practiceDraw: 0.999,
  dailyGuesses: ['Fixture easy A', 'Fixture easy B'],
  unlimitedGuess: 'Fixture hard J',
};
const definitions = {
  rolloverCollision: {
    title: 'keeps the new Daily answer hidden when a saved practice run crosses Eastern midnight',
    marker: 'FOOTLE_PRACTICE_REVEALS_CURRENT_DAILY',
  },
  sameDayPractice: {
    title: 'restores a same-day practice run and keeps Daily and Unlimited progress separate',
    marker: null,
  },
};

type Mode = 'daily' | 'practice' | 'unlimited';
type View = ReturnType<typeof render>;
type Action = {
  label: string; at: number; kind: 'click' | 'input' | 'unmount'; target: string;
  status: 'performed' | 'unavailable' | 'disabled';
};
type Frame = {
  label: string; at: number; mode: Mode | null;
  practiceIndex: number | null; practiceProgress: string | null; practiceFeedback: string | null;
  unlimitedState: string | null; search: boolean; giveUp: boolean; confirm: boolean;
  storage: Record<string, string | null>; html: string;
};
type CaseKey = keyof typeof definitions;
type Case = {
  key: CaseKey; title: string; marker: string | null; frames: Frame[]; actions: Action[];
  poolLoads: { mount: string; status: 'requested' | 'released'; at: number; rows: number | null }[];
  completionCalls: { at: number; args: unknown[] }[];
  randomDraws: { label: string; values: number[] }[]; closed: boolean;
};
const raw = {
  schema: 'footle-practice-daily-rollover-v1',
  fixture,
  cases: {} as Partial<Record<CaseKey, Case>>,
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('footle-rules-seen', '1');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(fixture.oldAt);
  boundary.fetch.mockReset().mockImplementation(() => {
    throw new Error('Unexpected Footle player pool request');
  });
  boundary.completion.mockReset();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  const output = process.env.FOOTLE_PRACTICE_ROLLOVER_RAW;
  if (output) writeFileSync(output, JSON.stringify(raw) + '\n');
});

function openCase(key: CaseKey): Case {
  const packet: Case = {
    key, ...definitions[key], frames: [], actions: [], poolLoads: [],
    completionCalls: [], randomDraws: [], closed: false,
  };
  raw.cases[key] = packet;
  boundary.completion.mockImplementation((...args: unknown[]) => {
    packet.completionCalls.push({ at: Date.now(), args });
  });
  return packet;
}

function capture(packet: Case, view: View, label: string): Frame {
  const scope = view.container;
  const mode = scope.querySelector('[data-footle-mode][aria-pressed="true"]')
    ?.getAttribute('data-footle-mode') as Mode | null | undefined;
  const index = scope.querySelector('[data-footle-practice]')?.getAttribute('data-practice-index');
  const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!);
  const frame: Frame = {
    label, at: Date.now(), mode: mode ?? null,
    practiceIndex: index == null ? null : Number(index),
    practiceProgress: view.queryByTestId('practice-progress')?.textContent ?? null,
    practiceFeedback: scope.querySelector('[data-testid="practice-feedback"] [role="status"]')?.textContent ?? null,
    unlimitedState: scope.querySelector('[data-footle-unlimited]')?.getAttribute('data-unlimited-state') ?? null,
    search: view.queryByRole('combobox', { name: 'Search for a player' }) !== null,
    giveUp: view.queryByRole('button', { name: 'Give up' }) !== null,
    confirm: view.queryByRole('button', { name: 'Yes, reveal it' }) !== null,
    storage: Object.fromEntries(keys.sort().map(key => [key, localStorage.getItem(key)])),
    html: scope.innerHTML,
  };
  packet.frames.push(frame);
  return frame;
}

async function mount(packet: Case, label: string, ready: string): Promise<View> {
  let release: ((players: Player[]) => void) | undefined;
  boundary.fetch.mockImplementationOnce(() => new Promise<Player[]>(resolve => {
    packet.poolLoads.push({ mount: label, status: 'requested', at: Date.now(), rows: null });
    release = resolve;
  }));
  const view = render(<Footle />);
  capture(packet, view, label);
  expect(release).toBeTypeOf('function');
  await act(async () => {
    const rows = fixture.rows.map(row => ({ ...row }));
    packet.poolLoads.push({ mount: label, status: 'released', at: Date.now(), rows: rows.length });
    release!(rows);
  });
  capture(packet, view, ready);
  return view;
}

function click(packet: Case, label: string, target: string, element: HTMLElement | null, optional = false) {
  const status = !element ? 'unavailable'
    : element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true' ? 'disabled'
      : 'performed';
  packet.actions.push({ label, at: Date.now(), kind: 'click', target, status });
  if (!optional) expect(status, label).toBe('performed');
  if (status === 'performed') fireEvent.click(element!);
}

function modeButton(view: View, mode: Mode) {
  return view.container.querySelector<HTMLElement>('[data-footle-mode="' + mode + '"]');
}

function guess(packet: Case, view: View, label: string, name: string) {
  const input = view.getByRole('combobox', { name: 'Search for a player' });
  packet.actions.push({ label: label + '-input', at: Date.now(), kind: 'input', target: name, status: 'performed' });
  fireEvent.change(input, { target: { value: name } });
  const option = view.getAllByRole('option').find(node => node.firstElementChild?.textContent === name);
  click(packet, label + '-pick', name, option ?? null);
}

function forfeit(packet: Case, view: View, prefix: string, result: string, optional = false) {
  click(packet, prefix + '-open', 'Give up', view.queryByRole('button', { name: 'Give up' }), optional);
  capture(packet, view, prefix + '-open');
  click(packet, prefix + '-confirm', 'Yes, reveal it', view.queryByRole('button', { name: 'Yes, reveal it' }), optional);
  return capture(packet, view, result);
}

function withDraw(packet: Case, label: string, action: () => void) {
  const random = vi.spyOn(Math, 'random').mockReturnValue(fixture.practiceDraw);
  try {
    action();
  } finally {
    packet.randomDraws.push({ label, values: random.mock.results.map(result => result.value as number) });
    random.mockRestore();
  }
}

function unmount(packet: Case, view: View, label: string) {
  packet.actions.push({ label, at: Date.now(), kind: 'unmount', target: 'Footle', status: 'performed' });
  view.unmount();
  return capture(packet, view, label);
}

function closeCase(packet: Case, view: View) {
  const end = unmount(packet, view, 'after-teardown');
  packet.closed = true;
  expect(end.html).toBe('');
  expect(boundary.fetch).toHaveBeenCalledTimes(2);
  expect(packet.completionCalls.length).toBeGreaterThan(0);
  expect(packet.completionCalls.every(call => JSON.stringify(call.args) === '["footle",false,0]')).toBe(true);
}

const dailyKey = (day: string) => 'footle-daily-' + day;

function requireDailyGuess(frame: Frame, day: string, target: string, guessName: string) {
  const bytes = frame.storage[dailyKey(day)];
  expect(typeof bytes).toBe('string');
  const saved = JSON.parse(bytes!) as { date: string; puzzleId: string; gameStatus: string; guesses: GuessResult[] };
  expect(saved).toMatchObject({ date: day, puzzleId: target, gameStatus: 'playing' });
  expect(saved.guesses.map(guess => [guess.playerName, guess.isCorrect])).toEqual([[guessName, false]]);
  expect(frame.mode).toBe('daily');
  expect(frame.search).toBe(true);
  expect(frame.giveUp).toBe(true);
  return bytes;
}

async function createRun(packet: Case) {
  expect(getTodayET()).toBe(fixture.oldDay);
  expect(getDailyTier(fixture.oldDay)).toBe('hard');
  const hard = fixture.rows.filter(player => player.difficulty === 'hard');
  expect(hard[dailyIndex(fixture.oldDay, hard.length)].name).toBe(fixture.oldTarget);
  expect(hard[dailyIndex(fixture.newDay, hard.length)].name).toBe(fixture.newTarget);
  const view = await mount(packet, 'old-pool-pending', 'old-ready');
  guess(packet, view, 'old-daily-guess', fixture.dailyGuesses[0]);
  const oldDaily = requireDailyGuess(capture(packet, view, 'old-daily-miss'), fixture.oldDay, fixture.oldTarget, fixture.dailyGuesses[0]);
  click(packet, 'practice-mode', 'practice', modeButton(view, 'practice'));
  capture(packet, view, 'practice-selected');
  click(packet, 'hard-tier', 'hard', view.getByRole('button', { name: 'hard' }));
  capture(packet, view, 'hard-selected');
  withDraw(packet, 'start-practice', () => click(packet, 'start-practice', 'Start run', view.getByRole('button', { name: 'Start run' })));
  const started = capture(packet, view, 'practice-started');
  const bytes = started.storage[FOOTLE_PRACTICE_KEY];
  expect(parsePracticeRun(bytes)).toMatchObject({
    active: true, tier: 'hard', index: 0,
    targets: ['Fixture hard A', 'Fixture hard B', 'Fixture hard C', 'Fixture hard D', 'Fixture hard E'],
    rounds: Array.from({ length: 5 }, () => ({ guesses: [], status: 'playing' })),
  });
  expect(started.mode).toBe('practice');
  expect(started.practiceProgress).toBe('Puzzle 1 of 5');
  expect(started.storage[dailyKey(fixture.oldDay)]).toBe(oldDaily);
  expect(started.storage[FOOTLE_UNLIMITED_KEY]).toBeUndefined();
  expect(unmount(packet, view, 'old-unmounted').storage[FOOTLE_PRACTICE_KEY]).toBe(bytes);
  return { practice: bytes, oldDaily };
}

it(definitions.rolloverCollision.title, async () => {
  const packet = openCase('rolloverCollision');
  const before = await createRun(packet);

  vi.setSystemTime(fixture.newAt);
  expect(getTodayET()).toBe(fixture.newDay);
  expect(getDailyTier(fixture.newDay)).toBe('hard');
  const view = await mount(packet, 'new-pool-pending', 'new-practice-restored');
  const restored = packet.frames[packet.frames.length - 1];
  expect(restored.mode).toBe('practice');
  expect(restored.storage[FOOTLE_PRACTICE_KEY]).toBe(before.practice);
  expect(restored.storage[dailyKey(fixture.newDay)]).toBeUndefined();
  expect(restored.storage[dailyKey(fixture.oldDay)]).toBeUndefined();

  click(packet, 'new-daily-mode', 'daily', modeButton(view, 'daily'));
  capture(packet, view, 'new-daily-open');
  guess(packet, view, 'new-daily-guess', fixture.dailyGuesses[1]);
  const newDaily = requireDailyGuess(capture(packet, view, 'new-daily-miss'), fixture.newDay, fixture.newTarget, fixture.dailyGuesses[1]);

  click(packet, 'resume-collision', 'practice', modeButton(view, 'practice'));
  const resumed = capture(packet, view, 'collision-resumed');
  expect(resumed.mode).toBe('practice');
  expect(resumed.storage[FOOTLE_PRACTICE_KEY]).toBe(before.practice);
  const attempted = forfeit(packet, view, 'collision-give-up', 'collision-give-up-settled', true);
  click(packet, 'return-new-daily', 'daily', modeButton(view, 'daily'));
  const returned = capture(packet, view, 'new-daily-returned');
  closeCase(packet, view);

  expect(requireDailyGuess(returned, fixture.newDay, fixture.newTarget, fixture.dailyGuesses[1])).toBe(newDaily);
  expect(returned.storage[dailyKey(fixture.oldDay)]).toBeUndefined();
  expect(returned.storage[FOOTLE_UNLIMITED_KEY]).toBeUndefined();
  const exposed = packet.frames
    .filter(frame => frame.at === fixture.newAt && frame.mode === 'practice' && frame.html.includes(fixture.newTarget))
    .map(frame => frame.label);
  expect({ exposed, practiceHeld: attempted.storage[FOOTLE_PRACTICE_KEY] === before.practice },
    definitions.rolloverCollision.marker).toEqual({ exposed: [], practiceHeld: true });
});

it(definitions.sameDayPractice.title, async () => {
  const packet = openCase('sameDayPractice');
  const before = await createRun(packet);
  const view = await mount(packet, 'same-day-pool-pending', 'same-day-practice-restored');
  const restored = packet.frames[packet.frames.length - 1];
  expect(restored.mode).toBe('practice');
  expect(restored.storage[FOOTLE_PRACTICE_KEY]).toBe(before.practice);

  const result = forfeit(packet, view, 'same-day-give-up', 'same-day-practice-result');
  expect(result.practiceFeedback).toBe('The answer was ' + fixture.newTarget);
  expect(parsePracticeRun(result.storage[FOOTLE_PRACTICE_KEY])?.rounds[0]).toEqual({ guesses: [], status: 'lost' });
  click(packet, 'next-practice', 'Next puzzle', view.getByTestId('practice-next'));
  const advanced = capture(packet, view, 'same-day-practice-advanced');
  expect(advanced.practiceProgress).toBe('Puzzle 2 of 5');

  withDraw(packet, 'open-unlimited', () => click(packet, 'open-unlimited', 'unlimited', modeButton(view, 'unlimited')));
  const opened = capture(packet, view, 'unlimited-open');
  expect(opened.unlimitedState).toBe('playing');
  expect(parseUnlimitedSession(opened.storage[FOOTLE_UNLIMITED_KEY])?.decks.easy?.current).toEqual({
    target: 'Fixture easy J', guesses: [], status: 'playing',
  });
  guess(packet, view, 'unlimited-guess', fixture.unlimitedGuess);
  const unlimited = capture(packet, view, 'unlimited-miss');
  const unlimitedBytes = unlimited.storage[FOOTLE_UNLIMITED_KEY];
  expect(parseUnlimitedSession(unlimitedBytes)?.decks.easy?.current).toEqual({
    target: 'Fixture easy J', guesses: [fixture.unlimitedGuess], status: 'playing',
  });

  click(packet, 'return-old-daily', 'daily', modeButton(view, 'daily'));
  const daily = capture(packet, view, 'same-day-daily-returned');
  click(packet, 'resume-unlimited', 'unlimited', modeButton(view, 'unlimited'));
  const resumed = capture(packet, view, 'unlimited-restored');
  closeCase(packet, view);

  expect(requireDailyGuess(daily, fixture.oldDay, fixture.oldTarget, fixture.dailyGuesses[0])).toBe(before.oldDaily);
  expect(resumed.storage[dailyKey(fixture.oldDay)]).toBe(before.oldDaily);
  expect(resumed.storage[dailyKey(fixture.newDay)]).toBeUndefined();
  expect(resumed.storage[FOOTLE_UNLIMITED_KEY]).toBe(unlimitedBytes);
  const savedPractice = parsePracticeRun(advanced.storage[FOOTLE_PRACTICE_KEY]);
  expect(savedPractice).toMatchObject({
    active: true, index: 1, rounds: [
      { guesses: [], status: 'lost' },
      ...Array.from({ length: 4 }, () => ({ guesses: [], status: 'playing' })),
    ],
  });
  expect(savedPractice?.targets).toEqual(parsePracticeRun(before.practice)?.targets);
  expect(resumed.storage[FOOTLE_PRACTICE_KEY]).toBe(JSON.stringify({ ...savedPractice, active: false }));
});
