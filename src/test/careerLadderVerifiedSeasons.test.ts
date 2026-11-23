import { beforeEach, describe, expect, it, vi } from 'vitest';

const rows = vi.hoisted(() => ({ players: [] as Record<string, unknown>[], seasons: [] as Record<string, unknown>[] }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from(table: string) {
      const request = {
        select: () => request,
        order: () => request,
        range: () => request,
        then(resolve: (value: unknown) => unknown) {
          const data = table === 'career_players' ? rows.players : rows.seasons;
          return Promise.resolve({ data, error: null }).then(resolve);
        },
      };
      return request;
    },
  },
}));

import { fetchCareerPool } from '@/lib/careerLadder';

const ISAK = 'a0000001-0000-0000-0000-000000000060';
const RASHFORD = 'a0000001-0000-0000-0000-000000000024';
const LIVERPOOL = { player_id: ISAK, season: '2025-2026', club: 'Liverpool', goals: 18, assists: 4, appearances: 25, market_value: 120, sort_order: 8 };
const BARCELONA = { player_id: RASHFORD, season: '2025-2026', club: 'Barcelona', goals: 5, assists: 3, appearances: 18, market_value: 35, sort_order: 10 };

beforeEach(() => {
  rows.players = [
    { id: ISAK, player_name: 'Alexander Isak', nationality: 'Sweden', position: 'ST' },
    { id: RASHFORD, player_name: 'Marcus Rashford', nationality: 'England', position: 'LW' },
  ];
  rows.seasons = [
    { player_id: ISAK, season: '2024-2025', club: 'Newcastle', goals: 18, assists: 3, appearances: 25, market_value: 90, sort_order: 7 },
    { player_id: RASHFORD, season: '2024-2025', club: 'Aston Villa', goals: 7, assists: 3, appearances: 24, market_value: 40, sort_order: 9 },
  ];
});

describe('Career Ladder verified completed seasons', () => {
  it('adds each missing 2025/26 stint and corrects the partial Newcastle season', async () => {
    const pool = await fetchCareerPool();
    expect(pool?.find(player => player.id === ISAK)?.seasons).toMatchObject([
      { club: 'Newcastle', goals: 27, assists: 6, appearances: 42, marketValue: 90 },
      { season: '2025-2026', club: 'Liverpool', goals: 4, assists: 1, appearances: 22, marketValue: null, sortOrder: 8 },
    ]);
    expect(pool?.find(player => player.id === RASHFORD)?.seasons).toMatchObject([
      { club: 'Aston Villa', goals: 7, assists: 3, appearances: 24, marketValue: 40 },
      { season: '2025-2026', club: 'Barcelona', goals: 14, assists: null, appearances: 49, marketValue: null, sortOrder: 10 },
    ]);
    expect(rows.seasons[0].appearances).toBe(25);
  });

  it('replaces the exact stale rows already present in the seed without duplicating either season', async () => {
    rows.seasons.push(LIVERPOOL, BARCELONA);
    const pool = await fetchCareerPool();
    const isak = pool?.find(player => player.id === ISAK)?.seasons;
    const rashford = pool?.find(player => player.id === RASHFORD)?.seasons;
    expect(isak).toHaveLength(2);
    expect(rashford).toHaveLength(2);
    expect(isak?.at(-1)).toMatchObject({ club: 'Liverpool', goals: 4, assists: 1, appearances: 22, marketValue: 120 });
    expect(rashford?.at(-1)).toMatchObject({ club: 'Barcelona', goals: 14, assists: null, appearances: 49, marketValue: 35 });
    expect(rows.seasons.slice(2)).toEqual([LIVERPOOL, BARCELONA]);
  });

  it('keeps independently refreshed feed records and market values', async () => {
    rows.seasons[0] = { ...rows.seasons[0], goals: 27, assists: 6, appearances: 42, market_value: 95 };
    rows.seasons.push({ ...LIVERPOOL, goals: 4, assists: 1, appearances: 22, market_value: 110 });
    rows.seasons.push({ ...BARCELONA, goals: 14, assists: 11, appearances: 49, market_value: 41 });
    const pool = await fetchCareerPool();
    expect(pool?.find(player => player.id === ISAK)?.seasons).toMatchObject([
      { club: 'Newcastle', goals: 27, assists: 6, appearances: 42, marketValue: 95 },
      { club: 'Liverpool', goals: 4, assists: 1, appearances: 22, marketValue: 110 },
    ]);
    expect(pool?.find(player => player.id === RASHFORD)?.seasons.at(-1)).toMatchObject({
      club: 'Barcelona', goals: 14, assists: 11, appearances: 49, marketValue: 41,
    });
  });

  it('adds nothing over an occupied season or when the expected prior stint is absent', async () => {
    rows.seasons[0] = { ...rows.seasons[0], club: 'Other club' };
    rows.seasons.push({ ...BARCELONA, club: 'Other club' });
    const pool = await fetchCareerPool();
    expect(pool?.find(player => player.id === ISAK)?.seasons.map(stint => stint.club)).toEqual(['Other club']);
    expect(pool?.find(player => player.id === RASHFORD)?.seasons.map(stint => stint.club)).toEqual(['Aston Villa', 'Other club']);
  });
});
