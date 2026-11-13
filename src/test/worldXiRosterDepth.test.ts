import { beforeEach, describe, expect, it, vi } from 'vitest';

const H = vi.hoisted(() => ({
  current: [] as Record<string, unknown>[],
  previous: [] as Record<string, unknown>[],
  fault: null as null | { year: number; from: number; kind: 'error' | 'null' },
  verified: { data: [] as Record<string, unknown>[] | null, error: null as null | { message: string } },
}));

vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://stub.invalid', SUPABASE_PUBLISHABLE_KEY: 'stub-anon-key',
  supabase: {
    from(table: string) {
      if (!['player_market_values', 'player_verified_positions'].includes(table)) throw new Error(`Unexpected table ${table}`);
      let year: number | undefined;
      let start = 0;
      let end: number | undefined;
      let cap: number | undefined;
      let positive = false;
      const orders: { key: string; ascending: boolean }[] = [];
      const request = {
        select: () => request,
        eq(key: string, value: number) {
          if (key !== 'year') throw new Error(`Unexpected equality ${key}`);
          year = value;
          return request;
        },
        gt(key: string, value: number) {
          if (key !== 'market_value_usd' || value !== 0) throw new Error('Unexpected positive-value filter');
          positive = true;
          return request;
        },
        order(key: string, options: { ascending: boolean }) {
          orders.push({ key, ascending: options.ascending });
          return request;
        },
        range(from: number, to: number) { start = from; end = to; return request; },
        limit(value: number) { cap = value; return request; },
        then(ok: (value: unknown) => unknown, bad?: (reason: unknown) => unknown) {
          if (table === 'player_verified_positions') return Promise.resolve(H.verified).then(ok, bad);
          if (year !== 2025 && year !== 2026) throw new Error(`Unexpected snapshot year ${year}`);
          if (H.fault?.year === year && H.fault.from === start) {
            const failure = H.fault.kind === 'error'
              ? { data: null, error: { message: 'Fixture page failure' } }
              : { data: null, error: null };
            return Promise.resolve(failure).then(ok, bad);
          }
          let rows = [...(year === 2026 ? H.current : H.previous)];
          if (positive) rows = rows.filter(row => Number(row.market_value_usd) > 0);
          rows.sort((a, b) => {
            for (const order of orders) {
              const av = a[order.key] as number | string;
              const bv = b[order.key] as number | string;
              if (av === bv) continue;
              return (av < bv ? -1 : 1) * (order.ascending ? 1 : -1);
            }
            return 0;
          });
          rows = rows.slice(start, end === undefined ? undefined : end + 1);
          if (cap !== undefined) rows = rows.slice(0, cap);
          return Promise.resolve({ data: rows, error: null }).then(ok, bad);
        },
      };
      return request;
    },
  },
}));

import { fetchWorldXiPool, fitsSlot, suggestCountryPlayers, type WxPlayer } from '@/lib/worldXi';

// Every name, country other than Paraguay, club, age and value below is a fictional test sentinel.
const roles = ['Goalkeeper', 'Goalkeeper', 'Centre-Back', 'Centre-Back', 'Right-Back', 'Defensive Midfield', 'Central Midfield', 'Attacking Midfield', 'Centre-Forward', 'Centre-Forward'];
function row(id: number, name: string, year: number, patch: Record<string, unknown> = {}): Record<string, unknown> {
  return { id, player_name: name, nationality: 'Paraguay', position: 'Centre-Back', club: 'Fixture Archive Club', market_value_usd: 5_000_000, year, age: 25, ...patch };
}
function ordinaryCurrent() {
  return Array.from({ length: 960 }, (_, i) => row(i + 1, `Fixture current ${i}`, 2026, {
    nationality: `Fixture Nation ${Math.floor(i / 60)}`, position: roles[i % roles.length], club: 'Fixture Current Club',
  }));
}
function previousFillers(count: number, value = 20_000_000) {
  return Array.from({ length: count }, (_, i) => row(200_000 + i, `Fixture previous ${i}`, 2025, { market_value_usd: value }));
}
const lowSentinel = () => row(900_001, 'Fixture low ranked defender', 2025);

beforeEach(() => {
  H.current = ordinaryCurrent();
  H.previous = [];
  H.fault = null;
  H.verified = { data: [], error: null };
});

describe('World XI recent snapshot depth', () => {
  it('finds a prior-year country player below the old top-1000 value cutoff', async () => {
    H.previous = [...previousFillers(1100), lowSentinel()];
    const data = await fetchWorldXiPool();
    expect(data, 'the complete recent snapshot remains playable').not.toBeNull();
    const found = suggestCountryPlayers(data!, 'Paraguay', 'fixture low');
    expect(found.map(player => player.name), 'a known older-snapshot player must remain guessable').toContain('Fixture low ranked defender');
    expect(found[0]).toMatchObject({ club: 'Fixture Archive Club', value: 5_000_000, position: 'CB', age: 25 });
    expect(fitsSlot(found[0], { label: 'CB', allowed: ['CB'], x: 50, y: 50 })).toBe(true);
    expect(fitsSlot(found[0], { label: 'GK', allowed: ['GK'], x: 50, y: 50 })).toBe(false);
  });

  it('keeps a tied-value prior-year player outside the first thousand returned rows', async () => {
    H.previous = [...previousFillers(1000, 13_000_000), row(900_002, 'Fixture tied boundary winger', 2025, { market_value_usd: 13_000_000, position: 'Left Winger' })];
    const data = await fetchWorldXiPool();
    expect(data).not.toBeNull();
    expect(suggestCountryPlayers(data!, 'Paraguay', 'fixture tied').map(player => player.name)).toEqual(['Fixture tied boundary winger']);
  });

  it('keeps the newer snapshot even when its prior-year value is higher', async () => {
    H.current.push(row(960_001, 'Fixture newest identity', 2026, { club: 'Fixture New Club', market_value_usd: 2_000_000, age: 26 }));
    H.previous = [row(200_001, 'Fixture newest identity', 2025, { market_value_usd: 90_000_000, age: 25 })];
    const data = await fetchWorldXiPool();
    expect(data).not.toBeNull();
    expect(data!.players.filter(player => player.name === 'Fixture newest identity')).toEqual([
      { name: 'Fixture newest identity', country: 'Paraguay', position: 'CB', club: 'Fixture New Club', value: 2_000_000, age: 26 },
    ]);
  });

  it('preserves same-year namesakes at different clubs', async () => {
    H.current.push(row(960_001, 'Fixture shared name', 2026, { club: 'Fixture North', market_value_usd: 2_000_000 }));
    H.current.push(row(960_002, 'Fixture shared name', 2026, { club: 'Fixture South', market_value_usd: 3_000_000 }));
    H.previous = [row(200_001, 'Fixture shared name', 2025, { club: 'Fixture Older', market_value_usd: 90_000_000 })];
    const data = await fetchWorldXiPool();
    expect(data).not.toBeNull();
    expect(data!.players.filter(player => player.name === 'Fixture shared name').map(player => player.club).sort()).toEqual(['Fixture North', 'Fixture South']);
  });

  it('rejects a failed current-snapshot page instead of silently using the other pages', async () => {
    H.fault = { year: 2026, from: 1000, kind: 'error' };
    expect(await fetchWorldXiPool()).toBeNull();
  });

  it('rejects a failed prior-snapshot page even when the current pool clears its floor', async () => {
    H.fault = { year: 2025, from: 0, kind: 'error' };
    expect(await fetchWorldXiPool()).toBeNull();
  });

  it('rejects a null current-snapshot page without a transport error', async () => {
    H.fault = { year: 2026, from: 1000, kind: 'null' };
    expect(await fetchWorldXiPool()).toBeNull();
  });

  it('rejects a null prior-snapshot page without a transport error', async () => {
    H.fault = { year: 2025, from: 0, kind: 'null' };
    expect(await fetchWorldXiPool()).toBeNull();
  });

  it('rejects an unproven complete current snapshot when its last supported page is full', async () => {
    H.current.push(...Array.from({ length: 7041 }, (_, i) => row(300_000 + i, `Fixture current tail ${i}`, 2026)));
    expect(H.current).toHaveLength(8001);
    expect(await fetchWorldXiPool()).toBeNull();
  });

  it('rejects an unproven complete prior snapshot when its last supported page is full', async () => {
    H.previous = previousFillers(8001);
    expect(await fetchWorldXiPool()).toBeNull();
  });

  it('keeps optional verified-position failure from blocking primary position play', async () => {
    H.verified = { data: null, error: { message: 'Fixture optional history failure' } };
    const data = await fetchWorldXiPool();
    expect(data).not.toBeNull();
    const keeper = data!.players.find(player => player.position === 'GK') as WxPlayer;
    expect(fitsSlot(keeper, { label: 'GK', allowed: ['GK'], x: 50, y: 50 })).toBe(true);
    expect(fitsSlot(keeper, { label: 'CB', allowed: ['CB'], x: 50, y: 50 })).toBe(false);
  });

  it('preserves source row fields and does not manufacture a later club or value', async () => {
    H.previous = [lowSentinel()];
    const beforeCurrent = H.current.map(source => ({ ...source }));
    const beforePrevious = H.previous.map(source => ({ ...source }));
    const data = await fetchWorldXiPool();
    expect(data).not.toBeNull();
    expect(data!.players.find(player => player.name === 'Fixture low ranked defender')).toMatchObject({ club: 'Fixture Archive Club', value: 5_000_000, age: 25 });
    expect(H.current).toEqual(beforeCurrent);
    expect(H.previous).toEqual(beforePrevious);
  });
});
