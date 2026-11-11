import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it, vi } from 'vitest';
import { pickNamesake } from '@/lib/gridEngine';
import { buildGridPuzzle, fetchNbaGridData, MIN_POOL_SIZE, playerMatchesCell } from '@/lib/nbaGrid';
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

it('accepts Marcus Smart for Rockets and Lakers on the November 5 daily board', async () => {
  const before = { id: 557, player_name: 'Marcus Smart', teams: 'BOS,LAL,MEM,WAS', points: 7303, trb: 2348, ast: 3063, games: 695 };
  const migration = resolve(process.cwd(), 'supabase/migrations/20261110204100_nba_grid_smart_rockets.sql');
  const sql = existsSync(migration) ? readFileSync(migration, 'utf8') : '';
  const migratedTeams = sql.match(/^  set teams = '([^']+)'$/m)?.[1] ?? before.teams;
  const puzzle = buildGridPuzzle(20261105);
  const reportedCell = { row: puzzle.rows[0], col: puzzle.cols[1] };
  const unrelatedCell = { row: puzzle.rows[1], col: puzzle.cols[1] };
  expect(puzzle.id).toBe('grid-20261105');
  expect([reportedCell.row.id, reportedCell.col.id]).toEqual(['HOU', 'LAL']);
  expect([unrelatedCell.row.id, unrelatedCell.col.id]).toEqual(['NYK', 'LAL']);
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
  expect(corrected).toEqual({ ...original, franchises: new Set([...original.franchises, 'HOU']) });
});
