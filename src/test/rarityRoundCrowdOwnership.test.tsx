import { writeFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const seams = vi.hoisted(() => ({
  completion: vi.fn(),
  transport: vi.fn<typeof fetch>(),
  backend: 'https://flawuiqbvjobmkfkauhw.supabase.co',
}));
vi.mock('@/integrations/supabase/client', async () => {
  const { PostgrestClient } = await import('@supabase/postgrest-js');
  return {
    supabase: new PostgrestClient(seams.backend + '/rest/v1', {
      fetch: (input, init) => seams.transport(input, init),
    }),
  };
});
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: seams.completion }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

const instant = '2026-11-12T17:00:00.000Z';
const debounceMs = 200;
const caseDefinitions = {
  oldWhileCurrentPending: {
    title: 'keeps the next crowd panel empty while its own read is pending',
    marker: 'RARITY_OLD_CROWD_WHILE_CURRENT_PENDING',
    deliveries: ['a', 'b'],
  },
  oldAfterCurrentSettled: {
    title: 'keeps the current crowd panel when the old category settles last',
    marker: 'RARITY_OLD_CROWD_AFTER_CURRENT_SETTLED',
    deliveries: ['b', 'a'],
  },
} as const;
type CaseKey = keyof typeof caseDefinitions;
type Side = 'a' | 'b';
type ReplyRow = Record<string, string | number>;
type Query = {
  role: string;
  method: string;
  url: string;
  query: [string, string][];
  body: string | null;
  receivedAt: number;
  deliveredAt: number | null;
  status: number;
  rows: ReplyRow[] | null;
};
type Action = {
  label: string;
  kind: 'mount' | 'type' | 'wait-debounce' | 'select-option' | 'click' | 'deliver' | 'unmount';
  value: string | number | null;
  before: number;
  after: number;
};
type Case = {
  key: CaseKey;
  title: string;
  marker: string;
  frames: ReturnType<typeof observe>[];
  actions: Action[];
  requests: Query[];
  unexpected: string[];
  completions: unknown[][];
  closed: boolean;
};

const names = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];
function pool(side: Side) {
  return names.map((name, index) => ({
    player_name: 'Fixture ' + side.toUpperCase() + ' ' + name,
    peak_value_usd: (names.length - index) * 10_000_000,
  }));
}
const fixtures = {
  a: {
    id: 'position-forward',
    position: 'Centre-Forward',
    prompt: 'Name a centre-forward',
    pool: pool('a'),
    answer: 'Fixture A Two',
    rank: 2,
    points: 80,
    crowd: ['Fixture A Six', ' fIXTURE a SIX ', 'Fixture A Five', 'Fixture B Six', 'Fixture Unlisted'],
  },
  b: {
    id: 'position-right-winger',
    position: 'Right Winger',
    prompt: 'Name a right winger',
    pool: pool('b'),
    answer: 'Fixture B Four',
    rank: 4,
    points: 40,
    crowd: ['Fixture B Six', ' fixture b SIX ', 'Fixture B Six', 'Fixture B Five', ' fIXTURE B FIVE ', 'Fixture A Six', 'Fixture Unlisted'],
  },
} as const;
const currentCrowd = [{ name: 'Fixture B Six', picks: 3 }, { name: 'Fixture B Five', picks: 2 }];
const captured: Partial<Record<CaseKey, Case>> = {};
const backend = seams.backend;
const prefix = '/rest/v1/';
const poolColumns = 'player_name,peak_value_usd';
const searchColumns = 'player_name,market_value_usd,year,club,nationality,position,age,person_key';
const searchOrder = 'market_value_usd.desc,year.desc,player_name.asc';

function installTransport(current: Case) {
  const expected: { role: string; method: string; table: string; query: Record<string, string>;
    body: object | null; rows: ReplyRow[] | null; hold?: Side }[] = [];
  for (const side of ['a', 'b'] as const) {
    const fixture = fixtures[side];
    const searchRow = {
      player_name: fixture.answer,
      market_value_usd: fixture.pool[fixture.rank - 1].peak_value_usd,
      year: 2026,
      club: 'Fixture Club ' + side.toUpperCase(),
      nationality: 'Fixture Nation',
      position: fixture.position,
      age: 24,
      person_key: 'rarity-fixture-' + side,
    };
    const position = 'eq.' + fixture.position;
    const common = { select: searchColumns, position, order: searchOrder };
    expected.push(
      { role: side + '-pool', method: 'GET', table: 'player_position_peaks',
        query: { select: poolColumns, position, order: 'peak_value_usd.desc,player_name.asc', offset: '0', limit: '1000' },
        body: null, rows: fixture.pool },
      { role: side + '-search-direct', method: 'GET', table: 'player_market_values',
        query: { ...common, name_folded: 'ilike.%' + fixture.answer.toLowerCase() + '%', limit: '200' },
        body: null, rows: [searchRow] },
      { role: side + '-search-prominence', method: 'GET', table: 'player_market_values',
        query: { ...common, limit: '1000' }, body: null, rows: [searchRow] },
      { role: side + '-insert', method: 'POST', table: 'rarity_round_guesses',
        query: {}, body: { category_key: fixture.id, answer: fixture.answer }, rows: null },
      { role: side + '-crowd', method: 'GET', table: 'rarity_round_guesses',
        query: { select: 'answer', category_key: 'eq.' + fixture.id, order: 'created_at.desc', limit: '400' },
        body: null, rows: fixture.crowd.map(answer => ({ answer })), hold: side },
    );
  }
  const gates = new Map<Side, () => void>();
  const seen = new Set<string>();
  seams.transport.mockImplementation(async (input, init) => {
    if (typeof input !== 'string' || !init?.method || (init.body != null && typeof init.body !== 'string')) {
      current.unexpected.push('Unexpected Rarity Round SDK fetch arguments');
      throw new Error('Unexpected Rarity Round SDK fetch arguments');
    }
    const url = new URL(input);
    const query = [...url.searchParams];
    const method = init.method;
    const body = typeof init.body === 'string' ? init.body : null;
    const pin = expected.find(entry =>
      entry.method === method && url.origin === backend && url.pathname === prefix + entry.table &&
      JSON.stringify([...query].sort()) === JSON.stringify(Object.entries(entry.query).sort()) &&
      body === (entry.body === null ? null : JSON.stringify(entry.body)),
    );
    if (!pin || seen.has(pin.role)) {
      const failure = 'Unexpected Rarity Round SDK request ' + method + ' ' + url.pathname + ' ' + JSON.stringify(query);
      current.unexpected.push(failure);
      throw new Error(failure);
    }
    seen.add(pin.role);
    const receipt: Query = {
      role: pin.role, method: method, url: input, query, body, receivedAt: Date.now(),
      deliveredAt: null, status: pin.rows === null ? 201 : 200, rows: null,
    };
    current.requests.push(receipt);
    return new Promise<Response>(resolve => {
      const deliver = () => {
        receipt.deliveredAt = Date.now();
        receipt.rows = pin.rows;
        resolve(new Response(pin.rows === null ? null : JSON.stringify(pin.rows), {
          status: receipt.status,
          headers: { 'content-type': 'application/json' },
        }));
      };
      if (pin.hold) gates.set(pin.hold, deliver);
      else deliver();
    });
  });
  function release(side: Side) {
    const deliver = gates.get(side);
    if (!deliver) throw new Error('No held Rarity Round crowd request for ' + side);
    gates.delete(side);
    deliver();
  }
  return {
    pending: () => [...gates.keys()],
    release,
    drain: () => { for (const side of gates.keys()) release(side); },
    expectedRoles: expected.map(entry => entry.role),
  };
}

function words(node: Node | null | undefined) {
  return node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function observe(label: string, current: Case) {
  const main = document.querySelector('main#dukb-main');
  const spans = [...main?.querySelectorAll('span') ?? []].map(words);
  const paragraphs = [...main?.querySelectorAll('p') ?? []];
  const rank = paragraphs.find(node => /^Ranked \d+ of \d+ by fame in this category$/.test(words(node)));
  const crowdHeading = paragraphs.find(node => words(node).endsWith('What everyone else picked'));
  const crowd = crowdHeading?.parentElement;
  const combo = main?.querySelector<HTMLInputElement>('input[role=combobox]');
  const list = combo && document.getElementById(combo.getAttribute('aria-controls') ?? '');
  const buttons = [...main?.querySelectorAll('button') ?? []];
  const lock = buttons.find(button => words(button) === 'Lock in answer');
  const store = (area: Storage) => Object.fromEntries(Object.keys(area).sort().map(key => [key, area.getItem(key)]));
  return {
    label, at: Date.now(), phase: !main ? 'unmounted' : rank ? 'revealed' : combo ? 'playing' : 'other',
    round: spans.find(value => /^Round \d+ of \d+$/.test(value)) ?? null,
    prompt: paragraphs.map(words).find(value => value === fixtures.a.prompt || value === fixtures.b.prompt) ?? null,
    subtotal: spans.find(value => value.includes('Rarity Round score so far:')) ?? null,
    result: rank ? {
      answer: words(rank.previousElementSibling), rank: words(rank), points: Number(words(rank.nextElementSibling)),
      pointsLabel: words(rank.nextElementSibling?.nextElementSibling),
    } : null,
    crowd: crowd ? [...crowd.children].slice(1).map(row => {
      const [name, picks] = [...row.querySelectorAll('span')].map(words);
      return { name: (name ?? '').replace(/^\d+\.\s*/, ''), picks: Number.parseInt(picks ?? '', 10) };
    }) : null,
    next: buttons.some(button => !button.disabled && words(button) === 'Next round'),
    input: combo?.value ?? null,
    lockEnabled: !!lock && !lock.disabled,
    options: list ? [...list.querySelectorAll('[role=option]')].map(node => words(node.firstElementChild)) : [],
    requests: current.requests.map(query => ({ role: query.role, delivered: query.deliveredAt !== null })),
    timers: vi.getTimerCount(),
    storage: { local: store(localStorage), session: store(sessionStorage) },
    html: document.body.innerHTML,
  };
}

function frame(current: Case, label: string) {
  const found = current.frames.find(row => row.label === label);
  if (!found) throw new Error('Missing Rarity Round frame ' + label);
  return found;
}

function assertReveal(value: ReturnType<typeof observe>, side: Side) {
  const fixture = fixtures[side];
  expect(value).toMatchObject({
    phase: 'revealed',
    round: 'Round ' + (side === 'a' ? '1' : '2') + ' of 5',
    prompt: fixture.prompt,
    subtotal: '· Rarity Round score so far: ' + (side === 'a' ? '80' : '120'),
    result: {
      answer: fixture.answer,
      rank: 'Ranked ' + fixture.rank + ' of 6 by fame in this category',
      points: fixture.points,
      pointsLabel: 'points (lower is better)',
    },
    next: true,
    input: null,
  });
}

async function exercise(key: CaseKey) {
  const { title, marker, deliveries } = caseDefinitions[key];
  const current: Case = {
    key, title, marker, frames: [], actions: [], requests: [], unexpected: [], completions: [], closed: false,
  };
  captured[key] = current;
  const transport = installTransport(current);
  const main = () => within(within(document.body).getByRole('main'));
  const snap = (label: string) => current.frames.push(observe(label, current));
  async function step(label: string, kind: Action['kind'], value: Action['value'], action: () => void) {
    const before = Date.now();
    await act(async () => { action(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    current.actions.push({ label, kind, value, before, after: Date.now() });
    snap(label);
  }
  const click = (label: string, name: string) => step(label, 'click', name, () => {
    const button = main().getByRole('button', { name });
    if (!(button instanceof HTMLButtonElement) || button.disabled) throw new Error('Unavailable public Rarity Round control ' + name);
    fireEvent.click(button);
  });
  async function submit(side: Side) {
    const fixture = fixtures[side];
    await step(side + '-typed', 'type', fixture.answer, () => {
      const box = main().getByRole('combobox', { name: 'Search for a player...' });
      box.focus();
      fireEvent.change(box, { target: { value: fixture.answer } });
    });
    await step(side + '-searched', 'wait-debounce', debounceMs, () => { vi.advanceTimersByTime(debounceMs); });
    await step(side + '-selected', 'select-option', fixture.answer, () => {
      const options = main().getAllByRole('option');
      if (options.length !== 1 || words(options[0].firstElementChild) !== fixture.answer) {
        throw new Error('Unavailable unique Rarity Round option ' + fixture.answer);
      }
      fireEvent.click(options[0]);
    });
    await click(side + '-revealed-held', 'Lock in answer');
  }
  try {
    const { default: RarityRound } = await import('@/pages/RarityRound');
    await step('mounted-a', 'mount', null, () => {
      render(<MemoryRouter initialEntries={['/rarity-round']}><RarityRound /></MemoryRouter>);
    });
    await submit('a');
    await click('b-playing', 'Next round');
    await submit('b');
    for (const side of deliveries) {
      await step('deliver-' + side, 'deliver', fixtures[side].id, () => transport.release(side));
    }
  } finally {
    snap('before-unmount');
    await step('after-unmount', 'unmount', null, () => {
      cleanup();
      transport.drain();
    });
    current.completions = seams.completion.mock.calls.map(args => [...args]);
    const end = frame(current, 'after-unmount');
    current.closed = end.phase === 'unmounted' && end.html === '' && end.timers === 0 && transport.pending().length === 0;
  }

  expect(current.closed).toBe(true);
  expect(current.unexpected).toEqual([]);
  expect(current.requests.map(row => row.role).sort()).toEqual([...transport.expectedRoles].sort());
  expect(current.requests.every(row => row.deliveredAt !== null && row.deliveredAt >= row.receivedAt)).toBe(true);
  for (const side of ['a', 'b'] as const) {
    const insert = current.requests.find(row => row.role === side + '-insert');
    const crowd = current.requests.find(row => row.role === side + '-crowd');
    const capturedAtReveal = frame(current, side + '-revealed-held').requests;
    expect(capturedAtReveal).toContainEqual({ role: side + '-insert', delivered: true });
    expect(capturedAtReveal).toContainEqual({ role: side + '-crowd', delivered: false });
    expect(insert?.deliveredAt).not.toBeNull();
    expect(crowd?.receivedAt).toBeGreaterThanOrEqual(insert?.deliveredAt ?? Infinity);
    expect(frame(current, side + '-searched').options).toEqual([fixtures[side].answer]);
    expect(frame(current, side + '-selected')).toMatchObject({ input: fixtures[side].answer, lockEnabled: true });
  }
  expect(frame(current, 'mounted-a')).toMatchObject({ phase: 'playing', round: 'Round 1 of 5', prompt: fixtures.a.prompt });
  expect(frame(current, 'b-playing')).toMatchObject({
    phase: 'playing', round: 'Round 2 of 5', prompt: fixtures.b.prompt, subtotal: '· Rarity Round score so far: 80', crowd: null,
  });
  assertReveal(frame(current, 'a-revealed-held'), 'a');
  expect(frame(current, 'a-revealed-held').crowd).toBeNull();
  for (const label of ['b-revealed-held', 'deliver-a', 'deliver-b']) assertReveal(frame(current, label), 'b');
  const bReveal = frame(current, 'b-revealed-held');
  expect(bReveal.crowd).toBeNull();
  expect(bReveal.requests.filter(row => !row.delivered).map(row => row.role)).toEqual(['a-crowd', 'b-crowd']);
  const first = frame(current, 'deliver-' + deliveries[0]);
  expect(first.requests.filter(row => !row.delivered).map(row => row.role)).toEqual([deliveries[1] + '-crowd']);
  expect(frame(current, 'deliver-b').crowd).toEqual(currentCrowd);
  expect(current.completions.every(([slug, done]) => slug === 'rarity-round' && done === false)).toBe(true);
  expect(current.completions[current.completions.length - 1]).toEqual(['rarity-round', false, 80, 2]);
  expect(frame(current, 'before-unmount').requests.every(row => row.delivered)).toBe(true);
  expect(frame(current, 'before-unmount').storage).toEqual(frame(current, 'mounted-a').storage);
  return current;
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date(instant));
  localStorage.clear();
  sessionStorage.clear();
  seams.completion.mockClear();
  seams.transport.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  const output = process.env.RARITY_ROUND_CROWD_OWNERSHIP_RAW;
  if (output && captured.oldWhileCurrentPending && captured.oldAfterCurrentSettled) {
    writeFileSync(output, JSON.stringify({
      schema: 'rarity-round-crowd-ownership-v1', instant, debounceMs, fixtures,
      cases: {
        oldWhileCurrentPending: captured.oldWhileCurrentPending,
        oldAfterCurrentSettled: captured.oldAfterCurrentSettled,
      },
    }, null, 2) + '\n', { flag: 'wx' });
  }
});

describe('Rarity Round crowd response ownership', () => {
  it(caseDefinitions.oldWhileCurrentPending.title, async () => {
    const current = await exercise('oldWhileCurrentPending');
    expect(frame(current, 'deliver-a').crowd, current.marker).toBeNull();
  });

  it(caseDefinitions.oldAfterCurrentSettled.title, async () => {
    const current = await exercise('oldAfterCurrentSettled');
    expect(frame(current, 'deliver-a').crowd, current.marker).toEqual(currentCrowd);
  });
});
