import { beforeEach, describe, expect, it, vi } from 'vitest';

const H = vi.hoisted(() => ({
  market: [] as Record<string, unknown>[],
  players: [] as Record<string, unknown>[],
  seasons: [] as Record<string, unknown>[],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from(table: string) {
      const request = {
        select: () => request,
        order: () => request,
        range: () => request,
        ilike: () => request,
        limit: () => request,
        then(resolve: (value: unknown) => unknown) {
          const rows = table === 'career_players' ? H.players : table === 'career_seasons' ? H.seasons : H.market;
          return Promise.resolve({ data: rows, error: null }).then(resolve);
        },
      };
      return request;
    },
  },
}));

import { BUILD_XI_VERIFIED_CLUB_ROWS } from '@/data/buildXiVerifiedClubRows';
import { clubPickVerifies } from '@/lib/buildXiDraft';
import { fetchCareerPool } from '@/lib/careerLadder';
import { searchPlayers, SOCCER_MARKET_VALUE_SOURCE } from '@/lib/playerSearch';

const ISAK = 'a0000001-0000-0000-0000-000000000060';
const RASHFORD = 'a0000001-0000-0000-0000-000000000024';

beforeEach(() => {
  H.market = [];
  H.players = [
    { id: ISAK, player_name: 'Alexander Isak', nationality: 'Sweden', position: 'ST' },
    { id: RASHFORD, player_name: 'Marcus Rashford', nationality: 'England', position: 'LW' },
  ];
  H.seasons = [
    { player_id: ISAK, season: '2024-2025', club: 'Newcastle', goals: 18, assists: 3, appearances: 25, market_value: 90, sort_order: 7 },
    { player_id: RASHFORD, season: '2024-2025', club: 'Aston Villa', goals: 4, assists: 3, appearances: 17, market_value: 40, sort_order: 9 },
  ];
});

describe('verified club picks in Build Your XI', () => {
  it.each([
    ['Benfica', 'SL Benfica', 'richard rios', 'Richard Ríos'],
    ['Manchester United', 'Manchester United', 'casemiro', 'Casemiro'],
  ])('finds and validates the missing all-time club pick for %s', async (team, club, query, player) => {
    const source = { ...SOCCER_MARKET_VALUE_SOURCE, fallbackRows: BUILD_XI_VERIFIED_CLUB_ROWS[team] };
    const { results } = await searchPlayers({ source, query });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ name: player, meta: { club, position: 'Defensive Midfield' } });
    expect(clubPickVerifies({ name: team, isNation: false }, 'CDM', { rawPosition: results[0].meta.position, club: results[0].meta.club })).toBe(true);
    expect(clubPickVerifies({ name: 'Chelsea', isNation: false }, 'CDM', { rawPosition: results[0].meta.position, club: results[0].meta.club })).toBe(false);
    expect((await searchPlayers({ source: SOCCER_MARKET_VALUE_SOURCE, query })).results).toEqual([]);
  });

  it('uses the table record when one becomes available for the same player', async () => {
    H.market = [{ ...BUILD_XI_VERIFIED_CLUB_ROWS.Benfica![0], market_value_usd: 12_000_000, year: 2026 }];
    const source = { ...SOCCER_MARKET_VALUE_SOURCE, fallbackRows: BUILD_XI_VERIFIED_CLUB_ROWS.Benfica };
    const { results } = await searchPlayers({ source, query: 'richard rios' });
    expect(results).toHaveLength(1);
    expect(results[0].meta).toMatchObject({ year: 2026, value: 12_000_000 });
  });
});

describe('Career Ladder verified completed seasons', () => {
  it('adds Liverpool and Barcelona and repairs Isak’s partial Newcastle figures', async () => {
    const result = await fetchCareerPool();
    expect(result?.find(player => player.id === ISAK)?.seasons).toMatchObject([
      { club: 'Newcastle', goals: 27, assists: 6, appearances: 42, marketValue: 90 },
      { season: '2025-2026', club: 'Liverpool', goals: 4, assists: 1, appearances: 22, marketValue: null },
    ]);
    expect(result?.find(player => player.id === RASHFORD)?.seasons.at(-1)).toMatchObject({
      season: '2025-2026', club: 'Barcelona', goals: 14, assists: 11, appearances: 49, marketValue: null,
    });
    expect(H.seasons[0].appearances).toBe(25);
  });

  it('leaves newly imported records in place without duplication', async () => {
    H.seasons[0] = { ...H.seasons[0], goals: 27, assists: 6, appearances: 42 };
    H.seasons.push({ player_id: ISAK, season: '2025-2026', club: 'Liverpool', goals: 4, assists: 1, appearances: 22, market_value: 120, sort_order: 8 });
    const result = await fetchCareerPool();
    const seasons = result?.find(player => player.id === ISAK)?.seasons;
    expect(seasons).toHaveLength(2);
    expect(seasons?.at(-1)?.marketValue).toBe(120);
  });
});
