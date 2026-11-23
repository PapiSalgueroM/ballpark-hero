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

import { fetchWorldXiPool, fitsSlot, suggestCountryPlayers, worldXiPlayerKey, type WxPlayer } from '@/lib/worldXi';
import { FORMATIONS } from '@/lib/squadShape';

// Pool fillers use fictional players. Individual regression cases carry their own rows.
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

  it('offers Brazil and Spain separate Rafinha cards from their 2025 records', async () => {
    H.previous = [
      row(76_721, 'Rafinha', 2025, { nationality: 'Brazil', position: 'Attacking Midfield', club: 'Retired', market_value_usd: 2_000_000, age: 31 }),
      row(164_780, 'Rafinha', 2025, { nationality: 'Spain', position: 'Second Striker', club: "Inter Club d'Escaldes", market_value_usd: 1_000_000, age: 27 }),
    ];
    const data = await fetchWorldXiPool();
    expect(data).not.toBeNull();
    const brazil = suggestCountryPlayers(data!, 'Brazil', 'Rafinha')[0];
    const spain = suggestCountryPlayers(data!, 'Spain', 'Rafinha')[0];
    expect(brazil).toEqual({ name: 'Rafinha', country: 'Brazil', position: 'CAM', club: 'Without Club', value: 2_000_000, age: 31 });
    expect(spain).toEqual({ name: 'Rafinha', country: 'Spain', position: 'CF', club: "Inter Club d'Escaldes", value: 1_000_000, age: 27 });
    expect(suggestCountryPlayers(data!, 'Brazil', 'Rafinha', new Set([worldXiPlayerKey(spain)]))).toEqual([brazil]);
    expect(suggestCountryPlayers(data!, 'Spain', 'Rafinha', new Set([worldXiPlayerKey(brazil)]))).toEqual([spain]);
  });

  it.each([
    [2026, 'Brazil', 'Attacking Midfield', 31, 2_000_000],
    [2025, 'Fixture Country', 'Attacking Midfield', 31, 2_000_000],
    [2025, 'Brazil', 'CAM', 31, 2_000_000],
    [2025, 'Brazil', 'Attacking Midfield', 32, 2_000_000],
    [2025, 'Brazil', 'Attacking Midfield', 31, 3_000_000],
  ] as const)('preserves status on a different Rafinha source row %#', async (year, nationality, position, age, value) => {
    const other = row(300_001, 'Rafinha', year, { nationality, position, club: 'Retired', age, market_value_usd: value });
    (year === 2025 ? H.previous : H.current).push(other);
    const data = await fetchWorldXiPool();
    expect(suggestCountryPlayers(data!, nationality, 'Rafinha')[0]?.club).toBe('Retired');
  });

  it('keeps the dated Sibir card and drops the stale age-21 Salyut card for the same player', async () => {
    H.previous = [
      row(122337, 'Nikolay Boyarkin', 2025, { nationality: 'Russia', position: 'Left Midfield', club: 'Salyut Belgorod', age: 21, market_value_usd: 1_000_000 }),
      row(123000, 'Fixture tied midfielder', 2025, { nationality: 'Russia', position: 'Left Midfield', market_value_usd: 1_000_000 }),
      row(125551, 'Nikolay Boyarkin', 2025, { nationality: 'Russia', position: 'Left Midfield', club: 'Sibir Novosibirsk', age: 23, market_value_usd: 1_000_000 }),
    ];
    const data = await fetchWorldXiPool();
    expect(suggestCountryPlayers(data!, 'Russia', 'Nikolay Boyarkin')).toEqual([
      { name: 'Nikolay Boyarkin', country: 'Russia', position: 'LM', club: 'Sibir Novosibirsk', value: 1_000_000, age: 23 },
    ]);
    expect(data!.byCountry.get('Russia')?.map(player => player.name)).toEqual(['Nikolay Boyarkin', 'Fixture tied midfielder']);
  });

  it('keeps the free-agent card and drops the stale Charlotte card from the 2025 pool', async () => {
    H.previous = [
      row(122396, 'Avionne Flanagan', 2025, { nationality: 'United States', position: 'Left Midfield', club: 'Charlotte Independence', age: 23, market_value_usd: 1_000_000 }),
      row(125553, 'Avionne Flanagan', 2025, { nationality: 'United States', position: 'Left Midfield', club: 'Without Club', age: 25, market_value_usd: 1_000_000 }),
    ];
    const data = await fetchWorldXiPool();
    expect(suggestCountryPlayers(data!, 'United States', 'Avionne Flanagan')).toEqual([
      { name: 'Avionne Flanagan', country: 'United States', position: 'LM', club: 'Without Club', value: 1_000_000, age: 25 },
    ]);
  });

  it.each([
    { label: 'excludes both stale rows', corrected: undefined },
    { label: 'keeps the corrected 2025 club', corrected: { year: 2025, club: 'Inter San Carlos', age: 25 } },
    { label: 'keeps the correctly dated 2026 club', corrected: { year: 2026, club: 'Santa Ana FC', age: 26 } },
  ])('$label for Christian Flores', async ({ corrected }) => {
    H.previous = [
      row(122400, 'Christian Flores', 2025, { nationality: 'Venezuela', position: 'Left Midfield', club: 'Estudiantes de Mérida', age: 34, market_value_usd: 1_000_000 }),
      row(164921, 'Christian Flores', 2025, { nationality: 'Cuba', position: 'Second Striker', club: 'Santa Ana FC', age: 25, market_value_usd: 1_000_000 }),
    ];
    if (corrected) {
      const source = corrected.year === 2026 ? H.current : H.previous;
      source.push(row(200_000, 'Christian Flores', corrected.year, {
        nationality: 'Cuba', position: 'Second Striker', club: corrected.club, age: corrected.age,
      }));
    }
    const data = await fetchWorldXiPool();
    expect(suggestCountryPlayers(data!, 'Venezuela', 'Christian Flores')).toEqual([]);
    expect(suggestCountryPlayers(data!, 'Cuba', 'Christian Flores')).toEqual(corrected ? [
      expect.objectContaining({ club: corrected.club, position: 'CF', age: corrected.age }),
    ] : []);
  });

  it.each([
    { name: 'Juan Cruz', country: 'Spain', cards: [
      { id: 30256, club: 'CA Osasuna', role: 'Left-Back', position: 'LB', slotLabel: 'LB', age: 32, value: 2_000_000 },
      { id: 99819, club: 'CD Leganés', role: 'Left Winger', position: 'LW', slotLabel: 'LW', age: 24, value: 5_000_000 },
    ] },
    { name: 'Matteo Cortesi', country: 'Italy', cards: [
      { id: 164736, club: 'AC Carpi', role: 'Second Striker', position: 'CF', slotLabel: 'ST', age: 26, value: 1_000_000 },
      { id: 165136, club: 'AC Crema 1908', role: 'Second Striker', position: 'CF', slotLabel: 'ST', age: 27, value: 1_000_000 },
    ] },
    { name: 'Mattia Gagliardi', country: 'Italy', cards: [
      { id: 164998, club: 'Ascoli Calcio', role: 'Second Striker', position: 'CF', slotLabel: 'ST', age: 20, value: 1_000_000 },
      { id: 165131, club: 'Scafatese Calcio 1922', role: 'Second Striker', position: 'CF', slotLabel: 'ST', age: 31, value: 1_000_000 },
    ] },
  ])('offers both $name cards for individual picks from the same country', async ({ name, country, cards }) => {
    H.previous = cards.map(({ id, club, role, age, value }) =>
      row(id, name, 2025, { nationality: country, club, position: role, age, market_value_usd: value }));
    const data = await fetchWorldXiPool();
    const options = suggestCountryPlayers(data!, country, name);
    expect(options).toHaveLength(2);
    const formation = FORMATIONS.find(shape => shape.name === '4-3-3')!;
    for (const { club, position, slotLabel, age, value } of cards) {
      const option = options.find(player => player.club === club)!;
      expect(option).toMatchObject({ name, country, position, club, age, value });
      expect(fitsSlot(option, formation.slots.find(slot => slot.label === slotLabel)!)).toBe(true);
    }
  });

  it.each([
    { nationality: 'Fixture Other Country' },
    { position: 'Goalkeeper' },
    { club: 'Fixture Other Club' },
    { age: 23 },
  ])('keeps a changed same-name row outside the stale record boundary %#', async difference => {
    H.previous = [row(300_000, 'Nikolay Boyarkin', 2025, {
      nationality: 'Russia', position: 'Left Midfield', club: 'Salyut Belgorod', age: 21, ...difference,
    })];
    const data = await fetchWorldXiPool();
    expect(data?.players.filter(player => player.name === 'Nikolay Boyarkin')).toHaveLength(1);
  });

  it('keeps verified cross-country namesakes from both dated snapshots', async () => {
    // Exact market rows 24289, 162897, 100079 and 46020. The two extra rows are controls.
    H.current.push(
      row(162897, 'Alan Franco', 2026, { nationality: 'Ecuador', position: 'Central Midfield', club: 'Clube Atlético Mineiro', age: 27 }),
      row(46020, 'José Luis Rodríguez', 2026, { nationality: 'Uruguay', position: 'Right-Back', club: 'Clube de Regatas Vasco da Gama', market_value_usd: 2_000_000, age: 28 }),
    );
    H.previous = [
      row(24289, 'Alan Franco', 2025, { nationality: 'Argentina', club: 'São Paulo Futebol Clube', age: 28 }),
      row(100079, 'José Luis Rodríguez', 2025, { nationality: 'Panama', position: 'Left Winger', club: 'FC Juárez', market_value_usd: 2_000_000, age: 26 }),
      row(200_001, 'Alan Franco', 2025, { nationality: 'Argentina', position: 'Goalkeeper', market_value_usd: 90_000_000 }),
      row(200_002, 'José Luis Rodríguez', 2025, { nationality: 'Fixture Other Country', position: 'Left Winger', market_value_usd: 90_000_000 }),
    ];
    const data = await fetchWorldXiPool();
    expect(data).not.toBeNull();
    for (const [name, country, position, club, value, age] of [
      ['Alan Franco', 'Argentina', 'CB', 'São Paulo Futebol Clube', 5_000_000, 28],
      ['Alan Franco', 'Ecuador', 'CM', 'Clube Atlético Mineiro', 5_000_000, 27],
      ['José Luis Rodríguez', 'Panama', 'LW', 'FC Juárez', 2_000_000, 26],
      ['José Luis Rodríguez', 'Uruguay', 'RB', 'Clube de Regatas Vasco da Gama', 2_000_000, 28],
    ] as const) {
      const found = suggestCountryPlayers(data!, country, name);
      expect(found, country).toHaveLength(1);
      expect(found[0]).toMatchObject({ name, country, position, club, value, age });
      expect(fitsSlot(found[0], { label: position, allowed: [position], x: 50, y: 50 })).toBe(true);
      expect(fitsSlot(found[0], { label: 'GK', allowed: ['GK'], x: 50, y: 50 })).toBe(false);
    }
    expect(suggestCountryPlayers(data!, 'Fixture Other Country', 'José Luis Rodríguez')).toEqual([]);
  });

  it('keeps one card for a verified namesake when the same identity has two dated rows', async () => {
    // Synthetic newer update to the existing 2025 Argentina identity.
    H.current.push(
      row(200_001, 'Alan Franco', 2026, { nationality: 'Argentina', club: 'Fixture Later Club', age: 29 }),
      row(162897, 'Alan Franco', 2026, { nationality: 'Ecuador', position: 'Central Midfield', club: 'Clube Atlético Mineiro', age: 27 }),
    );
    H.previous = [row(24289, 'Alan Franco', 2025, { nationality: 'Argentina', club: 'São Paulo Futebol Clube', age: 28, market_value_usd: 90_000_000 })];
    const data = await fetchWorldXiPool();
    expect(data).not.toBeNull();
    expect(suggestCountryPlayers(data!, 'Argentina', 'Alan Franco')).toEqual([
      expect.objectContaining({ club: 'Fixture Later Club', age: 29, value: 5_000_000, position: 'CB' }),
    ]);
    expect(suggestCountryPlayers(data!, 'Ecuador', 'Alan Franco')).toHaveLength(1);
  });

  it('keeps original newest-name deduplication for an unverified country change', async () => {
    H.current.push(row(200_001, 'Fixture Dual National', 2026, { nationality: 'Fixture New Nation' }));
    H.previous.push(row(200_002, 'Fixture Dual National', 2025, { nationality: 'Fixture Old Nation' }));
    const data = await fetchWorldXiPool();
    expect(data?.players.filter(player => player.name === 'Fixture Dual National').map(player => player.country)).toEqual(['Fixture New Nation']);
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
