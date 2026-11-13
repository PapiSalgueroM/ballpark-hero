// The squad and market names are verified. The other market fields are fixture values.
import { describe, expect, it, vi } from 'vitest';
import { buildCriteria, fetchBingoData, type BingoData } from '@/lib/playerBingo';

type WorldCupRow = { player_name: string; nationality: string; world_cup_year: number };
type Reply = { data: unknown[]; error: null };
const transport = vi.hoisted(() => ({ worldCupRows: [] as WorldCupRow[] }));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://stub.invalid',
  SUPABASE_PUBLISHABLE_KEY: 'stub-anon-key',
  supabase: { from: (table: string) => {
    const calls = new Map<string, unknown[]>();
    const query = new Proxy({}, { get: (_target, method: string) => {
      if (method === 'then') return (resolve: (reply: Reply) => unknown) =>
        Promise.resolve({ data: fixtureRows(table, calls), error: null }).then(resolve);
      return (...args: unknown[]) => {
        calls.set(method, args);
        return query;
      };
    } });
    return query;
  } },
}));

const recorded = { player_name: 'Andy Robertson', nationality: 'Scotland', world_cup_year: 2026 };
const sonSquadName = 'Son Heung-min';
const sonMarketName = 'Heung-min Son';
const names = ['Andrew Robertson', ...Array.from({ length: 100 }, (_, i) => `Fictional1352-${i}`), sonMarketName];

function fixtureRows(table: string, calls: Map<string, unknown[]>): unknown[] {
  if (table === 'world_cup_players') return transport.worldCupRows;
  if (table === 'ballon_dor' || calls.has('range')) return [];
  const selected = calls.get('in');
  if (!selected) return names.map(player_name => ({ player_name }));
  return (selected[1] as string[]).map(player_name => ({
    player_name, nationality: player_name === 'Andrew Robertson' ? 'Scotland' : player_name === sonMarketName ? 'South Korea' : 'Fixture',
    position: '', club: '', market_value_usd: 1, age: 25, year: 2026,
  }));
}

async function loaded() {
  const data = await fetchBingoData();
  expect(data, 'the complete fixture should load before any identity assertion').not.toBeNull();
  return data!;
}

const criterion = (data: BingoData, id: string) => buildCriteria(data).find(item => item.id === id)!;

describe('Player Bingo Son World Cup name order', () => {
  it('matches the recorded Son and Heung-min orders in both participation tiles', async () => {
    const korea = { player_name: sonSquadName, nationality: 'South Korea', world_cup_year: 2022 };
    transport.worldCupRows = [recorded, { ...korea, nationality: 'Fixture' }];
    const control = await loaded();

    transport.worldCupRows = [recorded, korea];
    const data = await loaded();
    const son = data.pool.find(player => player.name === sonMarketName)!;
    expect(son?.nationality).toBe('South Korea');
    expect(data.pool).toEqual(control.pool);
    const participationTiles = ['wc-any', 'wc-2022'];
    expect(participationTiles.map(id => criterion(data, id).test(son, data)), 'both tiles accept the recorded market name')
      .toEqual([true, true]);
    for (const id of participationTiles) {
      const tile = criterion(data, id);
      expect(tile.test({ ...son, name: sonSquadName }, data)).toBe(true);
      const previous = criterion(control, id);
      expect(previous.test(son, control)).toBe(false);
      expect(tile.support.filter(name => name !== sonMarketName)).toEqual(previous.support);
      expect(tile.support).toContain(sonMarketName);
    }
    expect(data.wcWinners).toEqual(control.wcWinners);
    expect(buildCriteria(data).filter(tile => !['wc-any', 'wc-2022'].includes(tile.id)).map(tile => [tile.id, tile.support]))
      .toEqual(buildCriteria(control).filter(tile => !['wc-any', 'wc-2022'].includes(tile.id)).map(tile => [tile.id, tile.support]));
  });

  it('keeps the South Korea order bridge out of the 2022 and winner tiles for a 2026 row', async () => {
    transport.worldCupRows = [
      { player_name: sonSquadName, nationality: 'South Korea', world_cup_year: 2026 },
      { player_name: names[1], nationality: 'Argentina', world_cup_year: 2022 },
    ];
    const data = await loaded();
    const son = data.pool.find(player => player.name === sonMarketName)!;
    expect(criterion(data, 'wc-any').test(son, data)).toBe(true);
    expect(criterion(data, 'wc-2022').test(son, data)).toBe(false);
    expect(criterion(data, 'wc-winner').test(son, data)).toBe(false);
    expect(data.wcWinners).toEqual(new Set(['fictional1352-0']));
  });

  it('preserves exact recorded keys for an unverified country or a different name', async () => {
    transport.worldCupRows = [
      { player_name: sonSquadName, nationality: 'Japan', world_cup_year: 2022 },
      { player_name: sonSquadName, nationality: '', world_cup_year: 2022 },
      { player_name: 'Son Heungmin', nationality: 'South Korea', world_cup_year: 2022 },
    ];
    const data = await loaded();
    const son = data.pool.find(player => player.name === sonMarketName)!;
    expect(criterion(data, 'wc-any').test(son, data)).toBe(false);
    expect(criterion(data, 'wc-2022').test(son, data)).toBe(false);
    expect(data.worldCup2022).toEqual(new Set(['son heung-min', 'son heungmin']));
    expect(data.wcWinners.size).toBe(0);
  });
});
