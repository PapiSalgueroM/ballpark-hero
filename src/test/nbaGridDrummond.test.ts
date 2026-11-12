import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it, vi } from 'vitest';
import { pickNamesake } from '@/lib/gridEngine';
import { fetchNbaGridData, FRANCHISE_POOL, MIN_POOL_SIZE, playerMatchesCell } from '@/lib/nbaGrid';
import { normalizeName } from '@/lib/playerSearch';

const fixture = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const query = {
        select: () => query,
        not: () => query,
        order: () => query,
        range: async (lo: number, hi: number) => ({
          data: table === 'nba_player_stats' ? fixture.rows.slice(lo, hi + 1) : null,
          error: null,
        }),
      };
      return query;
    },
  },
  SUPABASE_URL: 'https://offline.invalid',
  SUPABASE_PUBLISHABLE_KEY: 'offline',
}));

it('accepts Andre Drummond for Detroit and New York with the verified membership', async () => {
  const before = { id: 268, player_name: 'Andre Drummond', teams: 'BRK,CHI,CLE,DET,LAL,PHI', points: 11674, trb: 11485, ast: 1183, games: 965 };
  const migration = resolve(process.cwd(), 'supabase/migrations/20261110204000_nba_grid_drummond_knicks.sql');
  const sql = existsSync(migration) ? readFileSync(migration, 'utf8') : '';
  const migratedTeams = sql.match(/^  set teams = '([^']+)'$/m)?.[1] ?? before.teams;
  const franchise = (id: string) => FRANCHISE_POOL.find(category => category.id === id)!;
  const reportedCell = { row: franchise('DET'), col: franchise('NYK') };
  const unrelatedCell = { row: franchise('DET'), col: franchise('BOS') };
  const filler = Array.from({ length: MIN_POOL_SIZE - 1 }, (_, index) => ({
    ...before, id: index + 1000, player_name: `Fixture player ${index}`, teams: 'CHI',
  }));

  const loadPlayer = async (teams: string) => {
    fixture.rows = [{ ...before, teams }, ...filler];
    const data = await fetchNbaGridData();
    return pickNamesake(data?.byNormalizedName.get(normalizeName(before.player_name)), player => playerMatchesCell(player, reportedCell))!;
  };

  const original = await loadPlayer(before.teams);
  expect(playerMatchesCell(original, reportedCell), 'original database row rejects the reported cell').toBe(false);

  const corrected = await loadPlayer(migratedTeams);
  expect(playerMatchesCell(corrected, reportedCell), 'corrected database row accepts the reported cell').toBe(true);
  expect(playerMatchesCell(corrected, unrelatedCell)).toBe(false);
  expect(corrected).toEqual({ ...original, franchises: new Set([...original.franchises, 'NYK']) });
});
