import { writeFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WhoAmI from '@/pages/WhoAmI';

const seams = vi.hoisted(() => ({ from: vi.fn(), recordCompletion: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: seams.from } }));
vi.mock('@/lib/completions', () => ({
  recordCompletion: seams.recordCompletion,
  getCurrentPlayerName: () => 'Fixture Guest',
}));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

const startTime = Date.UTC(2026, 10, 7, 16);
const poolSize = 52;
const seedDraw = 0;
const columns = 'player_name, nationality, position, club, market_value_usd, age, year, person_key';
const historyColumns = 'n:player_name, c:club, a:age, y:year, k:person_key';
const searchColumns = 'player_name, market_value_usd, year, club, nationality, position, age, person_key';
const nextYear = [2026, 2025];
const descending = { ascending: false };
const ascending = { ascending: true };
const table = 'player_market_values';
const fixture = { poolSize, seedDraw, columns, historyColumns, searchColumns, table, nextYear, debounceMs: 200 };
const resultText = {
  loss: 'Out of guesses',
  win: 'Found him in 1 guess',
  pending: 'Checking his season...',
  failed: "Couldn't pull up his season just then, so that one doesn't count. Pick him again.",
};
const cases = {
  abandonedResult: {
    title: 'keeps the confirmed Give up result when its exact guess settles late',
    marker: 'WHO_AM_I_ABANDONED_LOOKUP',
  },
  replayedRound: {
    title: 'does not let an old exact guess finish the new case',
    marker: 'WHO_AM_I_REPLAYED_LOOKUP',
  },
  keepPlaying: {
    title: 'settles a current exact guess after Keep playing',
    marker: null,
  },
};
type CaseKey = keyof typeof cases;
type Role = 'boot-current' | 'boot-carried' | 'boot-history' | 'search-direct' | 'search-prominence' | 'guess-current';
type Leg = unknown[];
type Row = Record<string, string | number>;
type Query = {
  role: Role;
  legs: Leg[];
  at: number;
  deliveredAt: number | null;
  rows: Row[] | null;
  signal: { abortedAtStart: boolean; aborted: boolean } | null;
};
type Action = {
  label: string;
  kind: 'mount' | 'click' | 'type' | 'tick' | 'select-option' | 'deliver' | 'unmount';
  value: string | number | null;
  before: number;
  after: number;
};
type Case = {
  key: CaseKey;
  title: string;
  marker: string | null;
  frames: ReturnType<typeof observe>[];
  actions: Action[];
  queries: Query[];
  completions: unknown[][];
  randomDraws: { at: number; value: number }[];
  closed: boolean;
};
const captured: Partial<Record<CaseKey, Case>> = {};

function players(key: CaseKey) {
  const prefix = { abandonedResult: 'Abandon', replayedRound: 'Replay', keepPlaying: 'Keep' }[key];
  return Array.from({ length: poolSize }, (_, i) => ({
    player_name: 'Fixture ' + prefix + ' ' + String(i).padStart(2, '0'),
    person_key: 'who-fixture-' + key + '-' + i,
    nationality: 'Fixture Nation',
    position: 'Centre-Forward',
    club: 'Fixture Club ' + (i % 4),
    market_value_usd: (poolSize - i) * 1_000_000,
    age: 20 + i % 10,
    year: 2026,
  }));
}

function installPool(current: Case, rows: ReturnType<typeof players>) {
  const first = rows[0];
  const from = ['from', table];
  const bootOrders = [['order', 'market_value_usd', descending], ['order', 'player_name', ascending], ['order', 'id', ascending]];
  const searchOrders = [['order', 'market_value_usd', descending], ['order', 'year', descending], ['order', 'player_name', ascending]];
  const range = ['range', 0, 999];
  const expected: { role: Role; legs: Leg[]; rows: Row[] }[] = [
    {
      role: 'boot-current',
      legs: [from, ['select', columns], ['eq', 'year', 2026], ['gt', 'market_value_usd', 0], ['gt', 'age', 0], ...bootOrders, range],
      rows,
    },
    {
      role: 'boot-carried',
      legs: [from, ['select', columns], ['eq', 'year', 2025], ['gte', 'market_value_usd', 0], ['gt', 'age', 0], ...bootOrders, range],
      rows: [],
    },
    {
      role: 'boot-history',
      legs: [from, ['select', historyColumns], ['in', 'player_name', rows.map(row => row.player_name)], ['order', 'id', ascending], range],
      rows: rows.map(row => ({ n: row.player_name, c: row.club, a: row.age, y: row.year, k: row.person_key })),
    },
    {
      role: 'search-direct',
      legs: [from, ['select', searchColumns], ['ilike', 'name_folded', '%' + first.player_name.toLowerCase() + '%'], ...searchOrders, ['limit', 200], ['abortSignal']],
      rows: [first],
    },
    {
      role: 'search-prominence',
      legs: [from, ['select', searchColumns], ...searchOrders, ['limit', 1000], ['abortSignal']],
      rows: [first],
    },
    {
      role: 'guess-current',
      legs: [from, ['select', columns], ['eq', 'person_key', first.person_key], ['in', 'year', nextYear], ['order', 'year', descending], ['order', 'market_value_usd', descending], ['limit', 1]],
      rows: [first],
    },
  ];
  type Reply = { data: Row[]; error: null };
  let release: (() => void) | undefined;
  let unexpected = 0;
  seams.from.mockImplementation((...args: unknown[]) => {
    const legs: Leg[] = [['from', ...args]];
    let signal: AbortSignal | undefined;
    let dispatched = false;
    const add = (method: string, values: unknown[]) => { legs.push([method, ...values]); };
    const builder = {
      select: (...values: unknown[]) => { add('select', values); return builder; },
      eq: (...values: unknown[]) => { add('eq', values); return builder; },
      gt: (...values: unknown[]) => { add('gt', values); return builder; },
      gte: (...values: unknown[]) => { add('gte', values); return builder; },
      in: (...values: unknown[]) => { add('in', values); return builder; },
      order: (...values: unknown[]) => { add('order', values); return builder; },
      ilike: (...values: unknown[]) => { add('ilike', values); return builder; },
      range: (...values: unknown[]) => { add('range', values); return builder; },
      limit: (...values: unknown[]) => { add('limit', values); return builder; },
      abortSignal: (value: AbortSignal) => { signal = value; add('abortSignal', []); return builder; },
      then: (resolve: (value: Reply) => unknown, reject: (reason: unknown) => unknown) => {
        const pin = expected[current.queries.length];
        const record = signal ? { abortedAtStart: signal.aborted, aborted: signal.aborted } : null;
        if (dispatched || !pin || JSON.stringify(legs) !== JSON.stringify(pin.legs) || Boolean(signal) !== pin.role.startsWith('search-') || record?.abortedAtStart) {
          unexpected += 1;
          return Promise.reject(new Error('Unexpected Who Am I SDK read: ' + JSON.stringify(legs))).then(resolve, reject);
        }
        dispatched = true;
        const query: Query = { role: pin.role, legs, at: Date.now(), deliveredAt: null, rows: null, signal: record };
        current.queries.push(query);
        signal?.addEventListener('abort', () => { if (record) record.aborted = true; }, { once: true });
        const reply = new Promise<Reply>(deliver => {
          const settle = () => {
            query.deliveredAt = Date.now();
            query.rows = pin.rows;
            deliver({ data: pin.rows, error: null });
          };
          if (pin.role === 'guess-current') release = settle;
          else settle();
        });
        return reply.then(resolve, reject);
      },
    };
    return builder;
  });
  return {
    release: () => {
      if (!release) throw new Error('No pending current-player SDK reply');
      const deliver = release;
      release = undefined;
      deliver();
    },
    verify: () => {
      expect(unexpected).toBe(0);
      expect(seams.from.mock.calls).toEqual(expected.map(() => [table]));
      expect(current.queries.map(query => [query.role, query.legs, query.rows])).toEqual(expected.map(pin => [pin.role, pin.legs, pin.rows]));
      expect(current.queries.every(query => query.deliveredAt !== null && query.deliveredAt >= query.at)).toBe(true);
      expect(current.queries.filter(query => query.signal).map(query => query.signal?.abortedAtStart)).toEqual([false, false]);
    },
  };
}

function words(node: Element | null | undefined) {
  return (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function store(storage: Storage) {
  return Object.fromEntries(Object.keys(storage).sort().map(key => [key, storage.getItem(key)]));
}

function observe(label: string, current: Case) {
  const main = document.querySelector('main#dukb-main');
  const dialog = document.querySelector('[role="dialog"]');
  const text = main?.textContent ?? '';
  const spans = Array.from(main?.querySelectorAll('span') ?? [], words);
  const guess = spans.find(value => /^Guess \d+ of \d+$/.test(value)) ?? null;
  const remaining = spans.find(value => /^\d+ left$/.test(value)) ?? null;
  const heading = Array.from(main?.querySelectorAll('h2') ?? []).find(node => /^Out of guesses$|^Found him in \d+ guesses?$/.test(words(node)));
  const headline = heading ? words(heading) : null;
  const revealed = heading?.parentElement?.querySelector('div.text-xl.font-bold.text-foreground');
  const history = Array.from(main?.querySelectorAll('span.font-semibold.text-foreground.text-sm.truncate.flex-1') ?? [], words);
  const input = main?.querySelector<HTMLInputElement>('input[role="combobox"]');
  const buttons = Array.from(main?.querySelectorAll('button') ?? [], words);
  const phase = !main ? 'unmounted' : dialog ? 'help' : headline ? headline === resultText.loss ? 'lost' : 'won'
    : guess ? 'playing' : buttons.some(value => value.includes('Casual')) ? 'mode' : 'boot';
  return {
    label,
    at: Date.now(),
    timers: vi.getTimerCount(),
    phase,
    guess,
    remaining,
    checking: text.includes(resultText.pending),
    lookupFailed: text.includes(resultText.failed),
    headline,
    revealedName: revealed ? words(revealed) : null,
    history,
    combobox: input ? { value: input.value, disabled: input.disabled, expanded: input.getAttribute('aria-expanded') } : null,
    options: Array.from(main?.querySelectorAll('button[role="option"]') ?? [], node => ({
      name: words(node.firstElementChild),
      selected: node.getAttribute('aria-selected'),
      html: node.outerHTML,
    })),
    confirmation: {
      giveUp: buttons.includes('Give up'),
      yes: buttons.includes('Yes, reveal it'),
      keep: buttons.includes('Keep playing'),
    },
    storage: { local: store(localStorage), session: store(sessionStorage) },
    html: document.body.innerHTML,
    queryCount: current.queries.length,
    completionCount: seams.recordCompletion.mock.calls.length,
    randomCount: current.randomDraws.length,
  };
}

async function exercise(key: CaseKey) {
  const current: Case = {
    key, ...cases[key], frames: [], actions: [], queries: [], completions: [], randomDraws: [], closed: false,
  };
  captured[key] = current;
  const rows = players(key);
  const transport = installPool(current, rows);
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    current.randomDraws.push({ at: Date.now(), value: seedDraw });
    return seedDraw;
  });
  const snap = (label: string) => current.frames.push(observe(label, current));
  const step = async (label: string, kind: Action['kind'], value: Action['value'], run: () => void) => {
    const before = Date.now();
    await act(async () => { run(); });
    await act(async () => { vi.advanceTimersByTime(1); });
    current.actions.push({ label, kind, value, before, after: Date.now() });
    snap(label);
  };
  const click = (label: string, value: string, name: string | RegExp = value) => step(label, 'click', value, () => {
    const button = within(document.body).getByRole('button', { name });
    if (!(button instanceof HTMLButtonElement) || button.disabled) throw new Error('Unavailable public Who Am I control: ' + value);
    fireEvent.click(button);
  });
  try {
    await step('mounted-help', 'mount', null, () => {
      render(<MemoryRouter initialEntries={['/who-am-i']}><WhoAmI /></MemoryRouter>);
    });
    await click('help-dismissed', "Let's Play!");
    await click('case-a-started', 'Casual', /Casual/);
    await step('case-a-typed', 'type', rows[0].player_name, () => {
      const input = within(document.body).getByRole('combobox');
      input.focus();
      fireEvent.change(input, { target: { value: rows[0].player_name } });
    });
    await step('case-a-searched', 'tick', fixture.debounceMs, () => { vi.advanceTimersByTime(fixture.debounceMs); });
    await step('case-a-guess-pending', 'select-option', rows[0].player_name, () => {
      const options = within(document.body).getAllByRole('option');
      const option = options.find(node => words(node.firstElementChild) === rows[0].player_name);
      if (!(option instanceof HTMLButtonElement) || option.disabled) throw new Error('Unavailable actual Who Am I fixture option');
      fireEvent.click(option);
    });
    await click('give-up-open', 'Give up');
    if (key === 'keepPlaying') {
      await click('kept-playing', 'Keep playing');
    } else {
      await click('case-a-given-up', 'Yes, reveal it');
      if (key === 'replayedRound') await click('case-b-started', 'Play again');
    }
    await step('old-guess-delivered', 'deliver', rows[0].person_key, () => {
      vi.advanceTimersByTime(1);
      transport.release();
    });
  } finally {
    snap('before-unmount');
    await step('after-unmount', 'unmount', null, cleanup);
    random.mockRestore();
    current.completions = seams.recordCompletion.mock.calls.map(args => [...args]);
    const end = current.frames[current.frames.length - 1];
    current.closed = end.phase === 'unmounted' && end.html === '';
  }
  transport.verify();
  expect(current.closed).toBe(true);
  expect(frame(current, 'after-unmount')).toMatchObject({ phase: 'unmounted', timers: 0, html: '' });
  expect(frame(current, 'mounted-help')).toMatchObject({ phase: 'help', queryCount: 3 });
  expect(frame(current, 'help-dismissed')).toMatchObject({ phase: 'mode', queryCount: 3 });
  expect(frame(current, 'case-a-started')).toMatchObject({ phase: 'playing', guess: 'Guess 1 of 25', remaining: '25 left', history: [], completionCount: 0 });
  expect(frame(current, 'case-a-searched').options.map(option => option.name)).toEqual([rows[0].player_name]);
  expect(frame(current, 'case-a-guess-pending')).toMatchObject({ phase: 'playing', checking: true, history: [], queryCount: 6, completionCount: 0 });
  expect(frame(current, 'give-up-open')).toMatchObject({ phase: 'playing', checking: true, confirmation: { giveUp: false, yes: true, keep: true } });
  expect(current.queries[5].deliveredAt).toBeGreaterThan(frame(current, 'give-up-open').at);
  expect(current.randomDraws.every(draw => draw.value === seedDraw)).toBe(true);
  expect(frame(current, 'case-a-started').randomCount).toBeGreaterThan(frame(current, 'help-dismissed').randomCount);
  for (const row of current.frames) {
    expect(row.storage).toEqual({ local: { 'rules-gate-seen:/who-am-i': '1' }, session: {} });
    expect(row.lookupFailed).toBe(false);
  }
  if (key !== 'keepPlaying') {
    expect(frame(current, 'case-a-given-up')).toMatchObject({ phase: 'lost', headline: resultText.loss, revealedName: rows[0].player_name, history: [], completionCount: 1 });
  }
  return { current, rows };
}

function frame(current: Case, label: string) {
  const found = current.frames.find(value => value.label === label);
  if (!found) throw new Error('Missing Who Am I frame: ' + label);
  return found;
}

function outcome(value: ReturnType<typeof observe>) {
  const { phase, headline, revealedName, guess, remaining, checking, history, completionCount } = value;
  return { phase, headline, revealedName, guess, remaining, checking, history, completionCount };
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(startTime);
  seams.from.mockReset();
  seams.recordCompletion.mockClear();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.restoreAllMocks();
  vi.useRealTimers();
  const path = process.env.WHO_AM_I_LOOKUP_OWNERSHIP_RAW;
  if (path && Object.keys(captured).length === Object.keys(cases).length) {
    writeFileSync(path, JSON.stringify({
      schema: 'who-am-i-lookup-ownership-v1', startTime, fixture,
      cases: {
        abandonedResult: captured.abandonedResult,
        replayedRound: captured.replayedRound,
        keepPlaying: captured.keepPlaying,
      },
    }, null, 2) + '\n', { flag: 'wx' });
  }
});

describe('Who Am I guess lookup ownership', () => {
  it(cases.keepPlaying.title, async () => {
    const { current, rows } = await exercise('keepPlaying');
    expect(frame(current, 'kept-playing')).toMatchObject({ phase: 'playing', checking: true, history: [], completionCount: 0, confirmation: { giveUp: true, yes: false, keep: false } });
    expect(frame(current, 'old-guess-delivered')).toMatchObject({ phase: 'won', headline: resultText.win, revealedName: rows[0].player_name, checking: false, history: [rows[0].player_name], completionCount: 1 });
    expect(current.completions).toEqual([['/who-am-i', undefined, 'Fixture Guest']]);
  });

  it(cases.abandonedResult.title, async () => {
    const { current } = await exercise('abandonedResult');
    const abandoned = frame(current, 'case-a-given-up');
    const after = frame(current, 'old-guess-delivered');
    expect(current.completions).toEqual([['/who-am-i', undefined, 'Fixture Guest']]);
    expect(outcome(after), cases.abandonedResult.marker).toEqual(outcome(abandoned));
  });

  it(cases.replayedRound.title, async () => {
    const { current } = await exercise('replayedRound');
    const replay = frame(current, 'case-b-started');
    const after = frame(current, 'old-guess-delivered');
    expect(replay).toMatchObject({ phase: 'playing', guess: 'Guess 1 of 25', remaining: '25 left', history: [], completionCount: 1 });
    expect(replay.randomCount).toBeGreaterThan(frame(current, 'case-a-given-up').randomCount);
    expect(current.queries[5].deliveredAt).toBeGreaterThan(replay.at);
    expect(outcome(after), cases.replayedRound.marker).toEqual({ ...outcome(replay), checking: false });
    expect(current.completions).toEqual([['/who-am-i', undefined, 'Fixture Guest']]);
  });
});
