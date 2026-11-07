import { writeFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SportsBingo from '@/pages/SportsBingo';

const seams = vi.hoisted(() => ({
  from: vi.fn(),
  recordCompletion: vi.fn(),
  auth: { user: null, profile: null, refreshProfile: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: seams.from } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => seams.auth }));
vi.mock('@/lib/completions', () => ({
  getCurrentPlayerName: () => 'Fixture Bingo Guest',
  recordCompletion: seams.recordCompletion,
}));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

const startTime = Date.UTC(2026, 10, 5, 16);
const seedDraw = 0.42;
const nextLabel = 'Done with this pack, open the next';
const positions = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
const rows = Array.from({ length: 120 }, (_, i) => ({
  player_name: 'Fixture Bingo Player ' + String(i).padStart(3, '0'),
  position: positions[i % positions.length],
  age: 19 + i % 17,
  nationality: 'Fixture Nation',
  club: 'Fixture Club ' + i % 6,
  market_value_usd: (120 - i) * 1_000_000,
  goals: i % 24,
  assists: i % 12,
}));
const fixtureNames = new Set(rows.map(row => row.player_name));

const query = [
  ['from', 'player_market_values'],
  ['select', 'player_name, position, age, nationality, club, market_value_usd, goals, assists'],
  ['eq', 'year', 2026],
  ['order', 'market_value_usd', { ascending: false }],
  ['order', 'player_name', { ascending: true }],
  ['limit', 1000],
];

const cases = {
  manualFirstTick: {
    title: 'gives a manually opened pack its own first full second',
    marker: 'SPORTS_BINGO_MANUAL_FIRST_TICK',
  },
  manualFullWindow: {
    title: 'keeps a manually opened pack available until its own full window expires',
    marker: 'SPORTS_BINGO_MANUAL_FULL_WINDOW',
  },
  automaticAndFinish: {
    title: 'advances two automatic windows and records a public Finish exactly once',
    marker: null,
  },
};
type CaseKey = keyof typeof cases;

type Query = { legs: unknown[][]; requestedAt: number; deliveredAt: number | null; rows: number };
type Action = {
  label: string;
  kind: 'mount' | 'deliver' | 'click' | 'tick' | 'unmount';
  value: string | number | null;
  before: number;
  after: number;
};
type Frame = ReturnType<typeof observe>;
type Case = {
  key: CaseKey;
  title: string;
  marker: string | null;
  frames: Frame[];
  actions: Action[];
  queries: Query[];
  completions: unknown[][];
  randomDraws: { at: number; value: number }[];
  closed: boolean;
};

const captured: Partial<Record<CaseKey, Case>> = {};

function words(el: Element | null | undefined) {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function readStorage(storage: Storage) {
  return Object.fromEntries(Object.keys(storage).sort().map(key => [key, storage.getItem(key)]));
}

function observe(label: string, root: HTMLElement | null, current: Case) {
  const buttons = Array.from(root?.querySelectorAll('button') ?? []);
  const next = buttons.find(b => words(b) === nextLabel || words(b) === 'Finish');
  const packBadge = Array.from(root?.querySelectorAll('span') ?? [])
    .map(words).find(text => /^Pack \d+ of \d+$/.test(text));
  const packMatch = packBadge?.match(/^Pack (\d+) of (\d+)$/);
  const clock = words(root?.querySelector('span.tabular-nums')).match(/^(\d+)s$/);
  const score = Array.from(root?.querySelectorAll('span') ?? [])
    .map(words).find(text => /^You \d+$/.test(text));
  const playing = next !== undefined && packMatch !== undefined && packMatch !== null;
  const result = root?.querySelector('[role="status"]');
  const ready = buttons.some(b => words(b.firstElementChild) === 'Unlimited');
  const failed = (root?.textContent ?? '').includes("Couldn't load the player pool right now.");
  const packList = next?.parentElement?.firstElementChild;
  const at = Date.now();
  return {
    label,
    at,
    elapsed: at - startTime,
    timers: vi.getTimerCount(),
    phase: !root?.childElementCount ? 'unmounted' : playing ? 'playing' : result ? 'done' : ready ? 'setup' : failed ? 'error' : 'boot',
    pack: packMatch ? Number(packMatch[1]) : null,
    totalPacks: packMatch ? Number(packMatch[2]) : null,
    seconds: clock ? Number(clock[1]) : null,
    score: score ? Number(score.slice(4)) : null,
    players: packList ? Array.from(packList.children, player => words(player.firstElementChild)) : [],
    squares: Array.from(root?.querySelectorAll<HTMLButtonElement>('.grid-cols-5 button') ?? [], b => ({
      text: words(b),
      disabled: b.disabled,
    })),
    next: next ? { text: words(next), disabled: next.disabled } : null,
    result: result ? { headline: words(result.querySelector('h2')), text: words(result) } : null,
    storage: { local: readStorage(localStorage), session: readStorage(sessionStorage) },
    html: root?.innerHTML ?? '',
    queryCount: current.queries.length,
    completionCount: seams.recordCompletion.mock.calls.length,
    randomCount: current.randomDraws.length,
  };
}

function installPool(current: Case) {
  let release: (() => void) | undefined;
  const response = new Promise<{ data: typeof rows; error: null }>(resolve => {
    release = () => {
      const call = current.queries[0];
      if (!call || current.queries.length !== 1 || call.deliveredAt !== null) throw new Error('No single pending pool read');
      call.deliveredAt = Date.now();
      call.rows = rows.length;
      resolve({ data: rows, error: null });
    };
  });
  seams.from.mockImplementation((...args: unknown[]) => {
    const call: Query = { legs: [['from', ...args]], requestedAt: Date.now(), deliveredAt: null, rows: 0 };
    current.queries.push(call);
    const append = (name: string, args: unknown[]) => {
      const actual = [name, ...args];
      const expected = query[call.legs.length];
      call.legs.push(actual);
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Unexpected Sports Bingo pool query');
    };
    if (current.queries.length !== 1 || JSON.stringify(call.legs[0]) !== JSON.stringify(query[0])) {
      throw new Error('Unexpected Sports Bingo pool source');
    }
    const chain = {
      select: (...args: unknown[]) => { append('select', args); return chain; },
      eq: (...args: unknown[]) => { append('eq', args); return chain; },
      order: (...args: unknown[]) => { append('order', args); return chain; },
      limit: (...args: unknown[]) => { append('limit', args); return response; },
    };
    return chain;
  });
  return () => {
    if (!release) throw new Error('Pool release unavailable');
    release();
  };
}

async function exercise(key: CaseKey, play: (controls: {
  tick: (label: string, ms: number) => Promise<void>;
  click: (label: string, name: string) => Promise<void>;
}) => Promise<void>) {
  const current: Case = {
    key, ...cases[key], frames: [], actions: [], queries: [], completions: [], randomDraws: [], closed: false,
  };
  captured[key] = current;
  const releasePool = installPool(current);
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    current.randomDraws.push({ at: Date.now(), value: seedDraw });
    return seedDraw;
  });
  let mounted: ReturnType<typeof render> | undefined;
  const snap = (label: string) => current.frames.push(observe(label, mounted?.container ?? null, current));
  const step = async (label: string, kind: Action['kind'], value: Action['value'], run: () => void) => {
    const before = Date.now();
    await act(async () => { run(); });
    current.actions.push({ label, kind, value, before, after: Date.now() });
    snap(label);
  };
  const tick = (label: string, ms: number) => step(label, 'tick', ms, () => { vi.advanceTimersByTime(ms); });
  const click = (label: string, name: string) => step(label, 'click', name, () => {
    if (!mounted) throw new Error('Sports Bingo is not mounted');
    const button = within(mounted.container).getByRole('button', { name });
    if (!(button instanceof HTMLButtonElement) || button.disabled) throw new Error('Expected enabled Sports Bingo control: ' + name);
    fireEvent.click(button);
  });
  try {
    await step('mounted', 'mount', null, () => { mounted = render(<SportsBingo />); });
    await step('ready', 'deliver', rows.length, releasePool);
    await click('opened', 'Unlimited A fresh random card and packs every run');
    await play({ tick, click });
  } finally {
    snap('before-unmount');
    if (mounted) await step('after-unmount', 'unmount', null, mounted.unmount);
    random.mockRestore();
    current.completions = seams.recordCompletion.mock.calls.map(args => [...args]);
    current.closed = Boolean(mounted && current.frames[current.frames.length - 1]?.phase === 'unmounted');
  }
  return current;
}

function frame(current: Case, label: string): Frame {
  const found = current.frames.find(row => row.label === label);
  if (!found) throw new Error('Missing Sports Bingo frame: ' + label);
  return found;
}

function expectHealthy(current: Case) {
  expect(current.closed).toBe(true);
  expect(current.queries).toEqual([{ legs: query, requestedAt: startTime, deliveredAt: startTime, rows: rows.length }]);
  expect(current.actions.map(action => action.label)).toEqual(current.frames.map(row => row.label).filter(label => label !== 'before-unmount'));
  expect(frame(current, 'mounted')).toMatchObject({ phase: 'boot', timers: 0, queryCount: 1 });
  expect(frame(current, 'ready')).toMatchObject({ phase: 'setup', timers: 0, queryCount: 1 });
  expect(frame(current, 'after-unmount')).toMatchObject({ phase: 'unmounted', html: '', timers: 0 });
  const opened = frame(current, 'opened');
  expect(opened).toMatchObject({ phase: 'playing', pack: 1, totalPacks: 10, seconds: 15, timers: 1, score: 0 });
  expect(opened.randomCount).toBeGreaterThan(frame(current, 'ready').randomCount);
  expect(opened.squares).toHaveLength(25);
  expect(opened.squares.filter(square => square.disabled)).toEqual([{ text: '🎁 Free', disabled: true }]);
  const playerPacks = new Map<number, string[]>();
  for (const row of current.frames) {
    expect(row.storage).toEqual({ local: {}, session: {} });
    expect(row.phase).not.toBe('error');
    if (row.phase !== 'playing') continue;
    expect(row.pack).not.toBeNull();
    expect(row).toMatchObject({ totalPacks: 10, timers: 1, score: 0, squares: opened.squares });
    expect(row.players).toHaveLength(5);
    expect(new Set(row.players).size).toBe(5);
    expect(row.players.every(name => fixtureNames.has(name))).toBe(true);
    expect(row.next).toEqual({ text: row.pack === 10 ? 'Finish' : nextLabel, disabled: false });
    const packNumber = row.pack!;
    if (playerPacks.has(packNumber)) expect(row.players).toEqual(playerPacks.get(packNumber));
    else playerPacks.set(packNumber, row.players);
  }
  const revealed = Array.from(playerPacks.values()).flat();
  expect(new Set(revealed).size).toBe(revealed.length);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(startTime);
  localStorage.clear();
  sessionStorage.clear();
  seams.from.mockReset();
  seams.recordCompletion.mockClear();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  const path = process.env.SPORTS_BINGO_PACK_CLOCK_RAW;
  if (path && Object.keys(captured).length === Object.keys(cases).length) {
    writeFileSync(path, JSON.stringify({
      schema: 'sports-bingo-pack-clock-v1', startTime, seedDraw, fixture: { rows, query }, cases: captured,
    }, null, 2) + '\n', { flag: 'wx' });
  }
});

describe('Sports Bingo solo pack clock ownership', () => {
  it(cases.manualFirstTick.title, async () => {
    const current = await exercise('manualFirstTick', async ({ tick, click }) => {
      await tick('old-phase-900', 900);
      await click('manual-open', nextLabel);
      await tick('old-first-tick', 100);
      await tick('new-age-999', 899);
      await tick('new-first-tick', 1);
    });
    expectHealthy(current);
    expect(frame(current, 'old-phase-900')).toMatchObject({ pack: 1, seconds: 15, elapsed: 900 });
    expect(frame(current, 'manual-open')).toMatchObject({ pack: 2, seconds: 15, elapsed: 900 });
    const probes = ['old-first-tick', 'new-age-999', 'new-first-tick'].map(label => frame(current, label));
    expect(probes.map(row => [row.pack, row.elapsed])).toEqual([[2, 1000], [2, 1899], [2, 1900]]);
    expect(current.completions).toEqual([]);
    expect(probes.map(row => row.seconds), cases.manualFirstTick.marker).toEqual([15, 15, 14]);
  });

  it(cases.manualFullWindow.title, async () => {
    const current = await exercise('manualFullWindow', async ({ tick, click }) => {
      await tick('old-phase-900', 900);
      await click('manual-open', nextLabel);
      await tick('old-expiry', 14100);
      await tick('new-age-14999', 899);
      await tick('new-expiry', 1);
    });
    expectHealthy(current);
    expect(frame(current, 'old-phase-900')).toMatchObject({ pack: 1, seconds: 15, elapsed: 900 });
    expect(frame(current, 'manual-open')).toMatchObject({ pack: 2, seconds: 15, elapsed: 900 });
    const probes = ['old-expiry', 'new-age-14999', 'new-expiry'].map(label => frame(current, label));
    expect(probes.map(row => row.elapsed)).toEqual([15000, 15899, 15900]);
    expect(current.completions).toEqual([]);
    expect(probes.map(row => [row.pack, row.seconds]), cases.manualFullWindow.marker).toEqual([[2, 1], [2, 1], [3, 15]]);
  });

  it(cases.automaticAndFinish.title, async () => {
    const current = await exercise('automaticAndFinish', async ({ tick, click }) => {
      await tick('first-age-14999', 14999);
      await tick('first-expiry', 1);
      await tick('second-age-14999', 14999);
      await tick('second-expiry', 1);
      for (let pack = 4; pack <= 10; pack += 1) await click('manual-open-' + pack, nextLabel);
      await click('finished', 'Finish');
      await tick('finished-plus-1000', 1000);
    });
    expectHealthy(current);
    for (const [label, pack, seconds, elapsed] of [
      ['first-age-14999', 1, 1, 14999], ['first-expiry', 2, 15, 15000],
      ['second-age-14999', 2, 1, 29999], ['second-expiry', 3, 15, 30000],
    ] as const) expect(frame(current, label)).toMatchObject({ pack, seconds, elapsed, completionCount: 0 });
    for (let pack = 4; pack <= 10; pack += 1) {
      expect(frame(current, 'manual-open-' + pack)).toMatchObject({ pack, seconds: 15, elapsed: 30000, completionCount: 0 });
    }
    const done = frame(current, 'finished');
    expect(done).toMatchObject({ phase: 'done', pack: null, seconds: null, next: null, timers: 0, completionCount: 1 });
    expect(done.result?.headline).toBe('The packs got away');
    expect(done.result?.text).toContain('0 of 24 squares, 0 lines');
    expect(frame(current, 'finished-plus-1000')).toMatchObject({ elapsed: 31000, html: done.html, timers: 0, completionCount: 1 });
    expect(current.completions).toEqual([['/sports-bingo', 0, 'Fixture Bingo Guest', 0]]);
  });
});
