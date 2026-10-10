import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDartDraftPool } from '@/lib/dartDraft';
import { countryChoices, fetchCountryPool, legendChoices, variedChoices, wildcardChoices, wonderkidChoices } from '@/lib/dartMap';
import { LEGENDS, type FormationSlot } from '@/lib/squadDeal';
import type { GeoCountry } from '@/data/worldMapGeo';
import type { Player } from '@/types/game';

type Row = { id: number; year: number; player_name: string; position: string; age: number | null; nationality: string; club: string; market_value_usd: number; goals: number; assists: number };
type QueryState = { year?: number; nationals?: string[]; positions?: string[]; ageRequired?: boolean; from: number; to: number; limit?: number; orders: string[] };
const source = vi.hoisted(() => ({ rows: [] as Row[], calls: [] as QueryState[], failBroad: false, errorFrom: Infinity }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  if (table !== 'player_market_values') throw new Error(`Unexpected table ${table}`);
  const state: QueryState = { from: 0, to: 999, orders: [] };
  const query: any = {
    select: () => query,
    eq: (column: string, value: number) => { if (column === 'year') state.year = value; return query; },
    not: (column: string) => { if (column === 'age') state.ageRequired = true; return query; },
    in: (column: string, values: string[]) => { if (column === 'nationality') state.nationals = values; if (column === 'position') state.positions = values; return query; },
    order: (column: string) => { state.orders.push(column); return query; },
    range: (from: number, to: number) => { state.from = from; state.to = to; return query; },
    limit: (value: number) => { state.limit = value; return query; },
    then: (resolve: (value: { data: Row[] | null; error: Error | null }) => unknown, reject?: (error: unknown) => unknown) => {
      source.calls.push({ ...state, orders: [...state.orders] });
      const failure = state.from >= source.errorFrom || (source.failBroad && state.nationals && !state.positions);
      const rows = source.rows.filter(row => (state.year === undefined || row.year === state.year) && (!state.ageRequired || row.age !== null) && (!state.nationals || state.nationals.includes(row.nationality)) && (!state.positions || state.positions.includes(row.position)))
        .sort((a, b) => b.market_value_usd - a.market_value_usd || a.player_name.localeCompare(b.player_name) || a.id - b.id)
        .slice(state.from, state.to + 1);
      const data = state.limit === undefined ? rows : rows.slice(0, state.limit);
      return Promise.resolve(failure ? { data: null, error: new Error('Fixture read failed') } : { data, error: null }).then(resolve, reject);
    },
  };
  return query;
} } }));

const slot: FormationSlot = { label: 'CM', allowed: ['CM', 'CAM', 'CDM'], x: 50, y: 50 };
const country = (iso: string, name: string): GeoCountry => ({ iso, name, continent: 'europe', cx: 1, cy: 1, rings: [] });
const row = (index: number, nation = 'Fixture Nation'): Row => ({ id: index, year: 2026, player_name: `Fixture Player ${String(index).padStart(4, '0')}`, position: 'Central Midfield', age: 20, nationality: nation, club: 'Fixture Club', market_value_usd: (3000 - index) * 1000000, goals: index % 7, assists: index % 5 });
const player = (index: number, value = Math.max(1, 120 - index * 8)): Player => ({ name: `Fixture Pro ${index}`, nationality: 'Fixture Nation', club: 'Fixture Club', league: 'Other', position: 'CM', age: 20, marketValue: value, goals: 0, assists: 0, kitNumber: null, difficulty: 'easy' });
const names = (choices: ReturnType<typeof variedChoices>) => choices.map(choice => choice.player.name);
beforeEach(() => { source.rows = []; source.calls = []; source.failBroad = false; source.errorFrom = Infinity; });
afterEach(() => { vi.restoreAllMocks(); });

describe('Dart Draft wider existing pools and varied picks', () => {
  it('keeps the strongest three and varies five without replacement beyond the old best eight', () => {
    const pool = Array.from({ length: 18 }, (_, index) => player(index, index < 3 ? [240, 120, 60][index] : 30 - index));
    const before = JSON.stringify(pool);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const first = variedChoices(pool, slot, new Set());
    vi.mocked(Math.random).mockReturnValue(0.999999);
    const second = variedChoices(pool, slot, new Set());
    expect(names(first).slice(0, 3)).toEqual(['Fixture Pro 0', 'Fixture Pro 1', 'Fixture Pro 2']);
    expect(names(second).slice(0, 3)).toEqual(names(first).slice(0, 3));
    expect(names(second).slice(3)).not.toEqual(names(first).slice(3));
    expect(names(second)).toContain('Fixture Pro 17');
    for (const choices of [first, second]) {
      expect(choices).toHaveLength(8); expect(new Set(names(choices)).size).toBe(8);
      expect(choices.every(choice => pool.includes(choice.player) && !choice.outOfPosition)).toBe(true);
    }
    expect(JSON.stringify(pool)).toBe(before);
  });

  it('keeps used names and wrong positions out while preserving distinct accented names', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    const used = player(0, 240);
    const pool = [used, { ...player(1), name: used.name.toUpperCase() }, { ...player(2), position: 'GK' as const }, { ...player(3), name: 'Fixture Écho' }, { ...player(4), name: 'Fixture Echo' }];
    const picks = variedChoices(pool, slot, new Set([used.name.toLowerCase()]));
    expect(names(picks)).toEqual(['Fixture Écho', 'Fixture Echo']);
    expect(picks.every(pick => slot.allowed.includes(pick.player.position))).toBe(true);
    expect(variedChoices([], slot, new Set())).toEqual([]);
  });

  it('uses the same compact variety policy for bonus slots and leaves the shared legends intact', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    const pool = Array.from({ length: 18 }, (_, index) => player(index));
    pool.push({ ...player(99, 240), age: 32 });
    const before = JSON.stringify(LEGENDS);
    const wonderkids = wonderkidChoices(pool, slot, new Set(['Fixture Pro 0']));
    expect(wonderkids).toHaveLength(8); expect(names(wonderkids)).toContain('Fixture Pro 17');
    expect(wonderkids.every(pick => pick.player.age <= 21 && pick.player.name !== 'Fixture Pro 0')).toBe(true);
    expect(wildcardChoices(pool, slot, new Set())).toHaveLength(8);
    const legends = legendChoices(slot, new Set([LEGENDS.find(value => slot.allowed.includes(value.position))!.name]));
    expect(legends).toHaveLength(8); expect(new Set(names(legends)).size).toBe(8);
    expect(legends.every(pick => LEGENDS.includes(pick.player) && slot.allowed.includes(pick.player.position))).toBe(true);
    expect(JSON.stringify(LEGENDS)).toBe(before);
  });

  it('pages global 2026 rows past 900 and 1000 while excluding other years and unknown positions', async () => {
    source.rows = Array.from({ length: 2105 }, (_, index) => row(index));
    source.rows.push({ ...row(5000), player_name: 'Fixture old season', year: 2025 }, { ...row(5001), player_name: 'Fixture missing position', position: 'Unknown' }, { ...row(5002), player_name: 'Fixture missing age', age: null });
    const result = await fetchDartDraftPool();
    expect(result.current).toHaveLength(2105); expect(result.current.at(-1)?.name).toBe('Fixture Player 2104');
    expect(result.current.some(value => value.name.includes('missing') || value.name.includes('old season'))).toBe(false);
    expect(result.legends).toBe(LEGENDS);
    expect(source.calls.map(call => call.from)).toEqual([0, 1000, 2000]);
    expect(source.calls.every(call => call.year === 2026 && call.orders.join(',') === 'market_value_usd,player_name,id')).toBe(true);
  });

  it('pages a country beyond 120 and 1000 and keeps nationality and era in the actual choice path', async () => {
    const nation = country('fixture-wide', 'Fixture Wide Nation');
    source.rows = Array.from({ length: 1305 }, (_, index) => row(index, nation.name));
    source.rows.push({ ...row(9000, 'Fixture foreign nation'), market_value_usd: 9999999999 }, { ...row(9001, nation.name), year: 2024, market_value_usd: 9999999999 });
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    const pool = await fetchCountryPool(nation);
    expect(pool).toHaveLength(1305); expect(pool.at(-1)?.name).toBe('Fixture Player 1304');
    const picks = await countryChoices(nation, slot, new Set(['Fixture Player 0000']));
    expect(picks).toHaveLength(8); expect(names(picks)).toContain('Fixture Player 1304');
    expect(picks.every(pick => pick.player.nationality === nation.name && pick.player.name !== 'Fixture Player 0000' && slot.allowed.includes(pick.player.position))).toBe(true);
    expect(source.calls.every(call => call.year === 2026 && call.nationals?.join() === nation.name && call.orders.at(-1) === 'id')).toBe(true);
  });

  it('pages the targeted position fallback beyond 12 after an unavailable country read', async () => {
    const nation = country('fixture-target', 'Fixture Target Nation');
    source.rows = Array.from({ length: 1025 }, (_, index) => row(index, nation.name)); source.failBroad = true;
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    const picks = await countryChoices(nation, slot, new Set());
    expect(picks).toHaveLength(8); expect(names(picks)).toContain('Fixture Player 1024');
    expect(picks.every(pick => pick.player.nationality === nation.name && slot.allowed.includes(pick.player.position) && !pick.outOfPosition)).toBe(true);
    const targeted = source.calls.filter(call => call.positions);
    expect(targeted.map(call => call.from)).toEqual([0, 1000]);
    expect(targeted.every(call => call.year === 2026 && call.nationals?.join() === nation.name && call.orders.at(-1) === 'id')).toBe(true);
  });

  it('fails closed rather than returning a partial global or country pool after a later page fails', async () => {
    source.rows = Array.from({ length: 1500 }, (_, index) => row(index, 'Fixture Fail Nation')); source.errorFrom = 1000;
    expect((await fetchDartDraftPool()).current).toEqual([]);
    expect(await fetchCountryPool(country('fixture-fail', 'Fixture Fail Nation'))).toEqual([]);
    expect(source.calls.filter(call => call.from === 1000)).toHaveLength(6);
  });
});