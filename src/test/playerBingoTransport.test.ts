// Fictional rows at a local Postgrest boundary test the actual loader and transforms.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCriteria, fetchBingoData } from '@/lib/playerBingo';

type Response = { data: unknown[] | null; error: unknown };
type Query = { table: string; calls: [string, unknown[]][]; signal?: AbortSignal; phase: string; settled: boolean; finish: (reply: Response) => void };
const transport = vi.hoisted(() => ({ queries: [] as Query[], defer: '', peak: { latest: 0, history: 0 }, active: { latest: 0, history: 0 } }));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://stub.invalid', SUPABASE_PUBLISHABLE_KEY: 'stub-anon-key',
  supabase: { from: (table: string) => {
    const query: Query = { table, calls: [], phase: '', settled: false, finish: () => {} };
    const chain = new Proxy({}, { get: (_target, method: string) => {
      if (method === 'then') return (ok: (reply: Response) => unknown, bad: (reason: unknown) => unknown) => {
        query.phase = table === 'world_cup_players' ? 'wc' : table === 'ballon_dor' ? 'awards' : query.calls.some(([name]) => name === 'range') ? 'history' : query.calls.some(([name]) => name === 'in') ? 'latest' : 'seed';
        transport.queries.push(query);
        if (query.phase === 'latest' || query.phase === 'history') {
          transport.active[query.phase]++;
          transport.peak[query.phase] = Math.max(transport.peak[query.phase], transport.active[query.phase]);
        }
        const promise = new Promise<Response>(resolve => {
          query.finish = reply => {
            if (query.settled) return;
            query.settled = true;
            if (query.phase === 'latest' || query.phase === 'history') transport.active[query.phase]--;
            query.signal?.removeEventListener('abort', onAbort);
            resolve(reply);
          };
          const onAbort = () => query.finish({ data: null, error: new Error('Fixture transport aborted') });
          query.signal?.addEventListener('abort', onAbort, { once: true });
          if (query.signal?.aborted) onAbort();
          else if (!transport.defer.split(',').includes(query.phase)) query.finish(answer(query));
        });
        return promise.then(ok, bad);
      };
      return (...args: unknown[]) => {
        query.calls.push([method, args]);
        if (method === 'abortSignal') query.signal = args[0] as AbortSignal;
        return chain;
      };
    } });
    return chain;
  } },
}));

const names = Array.from({ length: 280 }, (_, i) => `Fictional871-${String(i).padStart(3, '0')}`);
const indexOf = (name: string) => names.indexOf(name);
const row = (name: string, yearsAgo = 0) => ({ player_name: name, nationality: 'Fixture', position: 'Fixture', club: yearsAgo ? `Fixture History ${yearsAgo}` : 'Fixture Current', market_value_usd: 5_000_000 + indexOf(name), age: 24 - yearsAgo, year: 2026 - yearsAgo, goals: yearsAgo, assists: 2, matches: 3, yellow_cards: 4, red_cards: 0 });
const birthYearCases = [
  { id: 'jan1-boundary', age: 26, nationality: 'Fixture / Alternate', band: 'born-2000-to-2003', regression: true },
  { id: 'dec31-adjacent', age: 26, nationality: 'Fixture', band: 'born-1997-to-1999', regression: false },
  { id: 'jan27-snapshot-offset', age: 26, nationality: 'Fixture', band: 'born-2000-to-2003', regression: true },
  { id: 'legacy-middle', age: 25, nationality: 'Fixture', band: 'born-2000-to-2003', regression: false },
  { id: 'wrong-country', age: 26, nationality: 'Fixture / Alternate', band: 'born-1997-to-1999', regression: false },
  { id: 'conflicting-dob', age: 26, nationality: 'Fixture', band: 'born-1997-to-1999', regression: false },
  { id: 'invalid-dob', age: 26, nationality: 'Fixture', band: 'born-1997-to-1999', regression: false },
  { id: 'implausible-dob', age: 26, nationality: 'Fixture', band: 'born-1997-to-1999', regression: false },
  { id: 'legacy-oldest', age: 30, nationality: 'Fixture', band: 'age-29-plus', regression: false },
  { id: 'legacy-youngest', age: 21, nationality: 'Fixture', band: 'age-21-under', regression: false },
] as const;
const birthYearCasesByName = new Map(birthYearCases.map((fixture, index) => [names[index], fixture]));
const ageBands = [
  { id: 'age-29-plus', label: 'Born 1996 or earlier' },
  { id: 'born-1997-to-1999', label: 'Born 1997 to 1999' },
  { id: 'born-2000-to-2003', label: 'Born 2000 to 2003' },
  { id: 'age-21-under', label: 'Born 2004 or later' },
] as const;
let useBirthYearFixture = false;

function birthYearMarketRow(name: string, yearsAgo = 0) {
  const held = row(name, yearsAgo);
  const fixture = birthYearCasesByName.get(name);
  return fixture ? { ...held, age: fixture.age - yearsAgo, nationality: fixture.nationality } : held;
}

function squadRow(index: number, date_of_birth: string, nationality = 'Fixture', world_cup_year = 2022) {
  return { player_name: ' ' + names[index].toLowerCase() + ' ', world_cup_year, nationality, date_of_birth };
}

const firstSquadRows = [
  squadRow(0, '2000-01-01', ' fixture '),
  squadRow(1, '1999-12-31'),
  squadRow(4, '2000-01-27', 'Alternate'),
  squadRow(5, '2000-01-27'),
  squadRow(6, '2000-02-30'),
  squadRow(7, '2004-01-01'),
];
const birthYearSquadRows = [
  ...firstSquadRows,
  ...Array.from({ length: 1000 - firstSquadRows.length }, (_, index) => ({
    player_name: 'Fictional squad filler ' + index, world_cup_year: 2018, nationality: 'Fixture', date_of_birth: null,
  })),
  squadRow(0, '2000-01-01', 'Fixture', 2018),
  squadRow(2, '2000-01-27'),
  squadRow(5, '1999-12-31', 'Fixture', 2018),
];

function squadQuery(query: Query) {
  const columns = String(query.calls.find(([method]) => method === 'select')![1][0]).split(',').map(column => column.trim());
  const range = query.calls.find(([method]) => method === 'range')![1] as [number, number];
  return { columns, range };
}

function answer(query: Query): Response {
  if (query.phase === 'seed') return { data: names.map(player_name => ({ player_name })), error: null };
  if (query.phase === 'wc' && useBirthYearFixture) {
    const { columns, range: [from, to] } = squadQuery(query);
    const data = birthYearSquadRows.slice(from, to + 1).map(row => Object.fromEntries(
      columns.map(column => [column, row[column as keyof typeof row]]),
    ));
    return { data, error: null };
  }
  if (query.phase === 'wc' || query.phase === 'awards') return { data: [], error: null };
  const selected = query.calls.find(([method]) => method === 'in')![1][1] as string[];
  const marketRow = useBirthYearFixture ? birthYearMarketRow : row;
  if (query.phase === 'latest') return { data: selected.flatMap(name => [marketRow(name, 1), marketRow(name)]), error: null };
  const [from, to] = query.calls.find(([method]) => method === 'range')![1] as number[];
  return { data: selected.flatMap(name => Array.from({ length: 14 }, (_, i) => marketRow(name, i))).slice(from, to + 1), error: null };
}
async function flush() { for (let i = 0; i < 30; i++) await Promise.resolve(); }
async function drain() {
  for (let i = 0; i < 30; i++) {
    for (const query of transport.queries.filter(query => !query.settled)) query.finish(answer(query));
    await flush();
    if (!transport.queries.some(query => !query.settled)) break;
  }
}
beforeEach(() => { transport.queries = []; transport.defer = ''; transport.peak = { latest: 0, history: 0 }; transport.active = { latest: 0, history: 0 }; });

describe('Player Bingo bounded cancellable transport', () => {
  it('preserves query predicates row transforms and complete paged output', async () => {
    const data = await fetchBingoData();
    expect(data?.pool.map(player => player.name)).toEqual([...names].reverse());
    expect(data?.pool[0]).toEqual({ name: names[279], nationality: 'Fixture', position: 'Fixture', club: 'Fixture Current', value: 5_000_279, age: 24, year: 2026 });
    expect(transport.queries).toHaveLength(17);
    const seed = transport.queries.find(query => query.phase === 'seed')!;
    expect(seed.calls.filter(([method]) => method !== 'abortSignal')).toEqual([['select', ['player_name']], ['gte', ['year', 2024]], ['gt', ['market_value_usd', 0]], ['not', ['age', 'is', null]], ['order', ['market_value_usd', { ascending: false }]], ['limit', [1000]]]);
    const latest = transport.queries.filter(query => query.phase === 'latest');
    expect(latest.map(query => query.calls.find(([method]) => method === 'in')![1][1])).toEqual(Array.from({ length: 7 }, (_, i) => names.slice(i * 40, (i + 1) * 40)));
    for (const query of latest) expect(query.calls.filter(([method]) => method !== 'abortSignal')).toEqual([['select', ['player_name, nationality, position, club, market_value_usd, age, year']], ['in', ['player_name', names.slice(latest.indexOf(query) * 40, (latest.indexOf(query) + 1) * 40)]], ['gte', ['year', 2024]], ['gt', ['market_value_usd', 0]], ['not', ['age', 'is', null]], ['order', ['year', { ascending: false }]], ['limit', [1000]]]);
    const history = transport.queries.filter(query => query.phase === 'history');
    const groups = Array.from({ length: 4 }, (_, i) => [...names].reverse().slice(i * 80, (i + 1) * 80));
    for (const group of groups) {
      const pages = history.filter(query => JSON.stringify(query.calls.find(([method]) => method === 'in')![1][1]) === JSON.stringify(group));
      expect(pages.map(query => query.calls.find(([method]) => method === 'range')![1])).toEqual(group.length === 80 ? [[0, 999], [1000, 1999]] : [[0, 999]]);
      for (const query of pages) expect(query.calls.filter(([method]) => method !== 'abortSignal')).toEqual([['select', ['player_name, nationality, position, club, year, age, market_value_usd, goals, assists, matches, yellow_cards, red_cards']], ['in', ['player_name', group]], ['order', ['id', { ascending: true }]], ['range', query.calls.find(([method]) => method === 'range')![1]]]);
    }
    expect(transport.queries.find(query => query.phase === 'wc')!.calls.filter(([method]) => method !== 'abortSignal')).toEqual([['select', ['player_name, world_cup_year, nationality, date_of_birth']], ['gte', ['world_cup_year', 2010]], ['order', ['id', { ascending: true }]], ['range', [0, 999]]]);
    expect(transport.queries.find(query => query.phase === 'awards')!.calls.filter(([method]) => method !== 'abortSignal')).toEqual([['select', ['player_name, rank, award_type']]]);
    for (const player of data!.pool) {
      expect(data!.clubHistory.get(player.name)).toEqual(new Set(['fixture current', ...Array.from({ length: 13 }, (_, i) => `fixture history ${i + 1}`)]));
      expect(data!.clubYears.get(player.name)).toEqual(Array.from({ length: 14 }, (_, i) => ({ key: i ? `fixture history ${i}` : 'fixture current', year: 2026 - i })));
      expect(data!.seasonStats.get(player.name)).toEqual(Array.from({ length: 14 }, (_, i) => ({ goals: i, assists: 2, matches: 3, yellowCards: 4, redCards: 0 })));
    }
    expect(data!.worldCupAll.size + data!.worldCup2022.size + data!.wcWinners.size + data!.ballonDor.size).toBe(0);
  });

  it('limits latest-row chunk requests to three while preserving all seven chunks', async () => {
    transport.defer = 'latest'; const loading = fetchBingoData(); await flush();
    const initial = transport.queries.filter(query => query.phase === 'latest' && !query.settled).length;
    await drain(); const data = await loading;
    expect(initial).toBe(3); expect(transport.peak.latest).toBe(3);
    expect(transport.queries.filter(query => query.phase === 'latest')).toHaveLength(7);
    expect(data?.pool).toHaveLength(280);
  });

  it('limits paged history chunk requests to three without truncating seven pages', async () => {
    transport.defer = 'history'; const loading = fetchBingoData(); await flush();
    const initial = transport.queries.filter(query => query.phase === 'history' && !query.settled).length;
    await drain(); const data = await loading;
    expect(initial).toBe(3); expect(transport.peak.history).toBe(3);
    expect(transport.queries.filter(query => query.phase === 'history')).toHaveLength(7);
    expect(data?.seasonStats.size).toBe(280);
  });

  it('forwards one owned signal to every existing query kind', async () => {
    const caller = new AbortController(); await fetchBingoData(caller.signal);
    expect(transport.queries.every(query => query.signal instanceof AbortSignal)).toBe(true);
    expect(new Set(transport.queries.map(query => query.signal)).size).toBe(1);
    expect(new Set(transport.queries.map(query => query.phase))).toEqual(new Set(['seed', 'latest', 'history', 'wc', 'awards']));
    expect(caller.signal.aborted).toBe(false);
  });

  it('starts no reads when the caller already abandoned the load', async () => {
    const caller = new AbortController(); caller.abort();
    expect(await fetchBingoData(caller.signal)).toBeNull();
    expect(transport.queries).toHaveLength(0);
  });

  it('caller cancellation stops queued latest chunks and never starts history', async () => {
    transport.defer = 'latest'; const caller = new AbortController();
    const loading = fetchBingoData(caller.signal); await flush();
    caller.abort(); await flush();
    const outstanding = transport.queries.filter(query => !query.settled).length;
    await drain();
    expect(await loading).toBeNull();
    expect(outstanding).toBe(0);
    expect(transport.queries.filter(query => query.phase === 'latest')).toHaveLength(3);
    expect(transport.queries.filter(query => query.phase === 'history')).toHaveLength(0);
    expect(transport.queries.every(query => query.signal?.aborted)).toBe(true);
  });

  it('caller cancellation stops queued history chunks and further pagination', async () => {
    transport.defer = 'history'; const caller = new AbortController();
    const loading = fetchBingoData(caller.signal); await flush();
    caller.abort(); await flush();
    const outstanding = transport.queries.filter(query => !query.settled).length;
    await drain();
    expect(await loading).toBeNull();
    expect(outstanding).toBe(0);
    expect(transport.queries.filter(query => query.phase === 'history')).toHaveLength(3);
    expect(transport.queries.filter(query => query.phase === 'history').every(query => query.calls.find(([method]) => method === 'range')![1][0] === 0)).toBe(true);
  });

  it.each(['latest', 'history'])('a failed %s request aborts siblings and pending chunks without partial data', async phase => {
    transport.defer = phase;
    let settled = false; const loading = fetchBingoData().then(data => { settled = true; return data; }); await flush();
    transport.queries.find(query => query.phase === phase && !query.settled)!.finish({ data: null, error: new Error('Fixture read failed') });
    await flush(); const endedWithoutDraining = settled;
    const outstanding = transport.queries.filter(query => !query.settled).length;
    await drain(); const data = await loading;
    expect(endedWithoutDraining).toBe(true); expect(outstanding).toBe(0); expect(data).toBeNull();
    expect(transport.queries.filter(query => query.phase === phase)).toHaveLength(3);
    expect(transport.queries.every(query => query.signal?.aborted)).toBe(true);
  });

  it('a failed World Cup read cancels other initial pool requests immediately', async () => {
    transport.defer = 'latest,wc';
    let settled = false; const loading = fetchBingoData().then(data => { settled = true; return data; }); await flush();
    transport.queries.find(query => query.phase === 'wc')!.finish({ data: null, error: new Error('Fixture World Cup read failed') });
    await flush(); const endedWithoutDraining = settled;
    const outstanding = transport.queries.filter(query => !query.settled).length;
    await drain();
    expect(await loading).toBeNull(); expect(endedWithoutDraining).toBe(true); expect(outstanding).toBe(0);
    expect(transport.queries.every(query => query.signal?.aborted)).toBe(true);
  });

  it('a just-resolved latest chunk cannot start queued work after cancellation', async () => {
    transport.defer = 'latest'; const caller = new AbortController();
    const loading = fetchBingoData(caller.signal); await flush();
    const first = transport.queries.find(query => query.phase === 'latest')!;
    first.finish(answer(first)); caller.abort(); await drain();
    expect(await loading).toBeNull();
    expect(transport.queries.filter(query => query.phase === 'latest')).toHaveLength(3);
    expect(transport.queries.filter(query => query.phase === 'history')).toHaveLength(0);
  });
});

it('BINGO_SQUAD_BIRTH_YEAR_BAND uses a reliable squad birth date for the correct age tile', async () => {
  useBirthYearFixture = true;
  let data: Awaited<ReturnType<typeof fetchBingoData>>;
  try {
    data = await fetchBingoData();
  } finally {
    useBirthYearFixture = false;
  }
  if (!data) throw new Error('Fictional Player Bingo data was unavailable');
  const criteria = buildCriteria(data);
  const bands = ageBands.map(({ id }) => {
    const matches = criteria.filter(criterion => criterion.id === id);
    expect(matches).toHaveLength(1);
    return matches[0];
  });
  const rows = birthYearCases.map((fixture, index) => {
    const name = names[index];
    const player = data.pool.find(candidate => candidate.name === name);
    if (!player) throw new Error('Fictional Player Bingo player was unavailable: ' + name);
    return {
      id: fixture.id, name, age: player.age, year: player.year, nationality: player.nationality,
      matches: bands.map(criterion => criterion.test(player, data)),
      support: bands.map(criterion => criterion.support.includes(name)),
    };
  });
  const worldCup = transport.queries.filter(query => query.phase === 'wc').map(squadQuery);
  const raw = {
    schema: 'player-bingo-squad-birth-year-band-v1',
    poolSize: data.pool.length,
    bands: bands.map(({ id, label }) => ({ id, label })),
    worldCup,
    rows,
  };

  expect(data.pool.map(player => player.name)).toEqual([...names].reverse());
  expect(raw.bands).toEqual(ageBands);
  expect(transport.queries).toHaveLength(18);
  expect(worldCup.map(query => query.range)).toEqual([[0, 999], [1000, 1999]]);
  expect(rows.map(({ name, age, year, nationality }) => [name, age, year, nationality])).toEqual(
    birthYearCases.map((fixture, index) => [names[index], fixture.age, 2026, fixture.nationality]),
  );
  expect(bands.map(criterion => criterion.support.filter(name => !birthYearCasesByName.has(name)))).toEqual([
    [], [], names.slice(birthYearCases.length).reverse(), [],
  ]);
  const membership = (regression: boolean) => rows.filter((_, index) => birthYearCases[index].regression === regression)
    .map(({ id, matches, support }) => ({ id, matches, support }));
  const expected = (regression: boolean) => birthYearCases.filter(fixture => fixture.regression === regression)
    .map(fixture => {
      const mask = ageBands.map(({ id }) => id === fixture.band);
      return { id: fixture.id, matches: mask, support: mask };
    });
  expect(membership(false), 'BINGO_SQUAD_BIRTH_YEAR_BAND: adjacent years and ambiguous squad records must keep their expected bands').toEqual(expected(false));
  expect(membership(true), 'BINGO_SQUAD_BIRTH_YEAR_BAND: compatible 2000 dates must move both eligibility and support').toEqual(expected(true));
});
