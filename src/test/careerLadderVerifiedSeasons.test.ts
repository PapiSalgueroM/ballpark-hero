import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';

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
import { careerCellValue } from '@/lib/careerBoardCells';
import { fetchCareerPlayers } from '@/lib/fetchCareerPlayers';
import { clubSeasonsOf, shareClub } from '@/lib/transferPathGraph';
import { SoccerGridSearch } from '@/components/soccer-grid/SoccerGridSearch';

const ISAK = 'a0000001-0000-0000-0000-000000000060';
const RASHFORD = 'a0000001-0000-0000-0000-000000000024';
const LIVERPOOL = { player_id: ISAK, season: '2025-2026', club: 'Liverpool', goals: 18, assists: 4, appearances: 25, market_value: 120, sort_order: 8 };
const BARCELONA = { player_id: RASHFORD, season: '2025-2026', club: 'Barcelona', goals: 5, assists: 3, appearances: 18, market_value: 35, sort_order: 10 };
const UNITED = { player_id: RASHFORD, season: '2024-2025', club: 'Manchester United', goals: 7, assists: 3, appearances: 24, market_value: 0, sort_order: 8 };

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
      { season: '2024-2025', club: 'Manchester United', goals: 7, assists: 3, appearances: 24, marketValue: null },
      { season: '2024-2025', club: 'Aston Villa', goals: 4, assists: null, appearances: 17, marketValue: 40 },
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
    expect(rashford).toHaveLength(3);
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
    expect(pool?.find(player => player.id === RASHFORD)?.seasons.map(stint => stint.club)).toEqual(['Manchester United', 'Aston Villa', 'Other club']);
  });

  it('uses an existing United alias and preserves refreshed Villa totals without losing Barcelona', async () => {
    const villa = { ...rows.seasons[1], goals: 4, assists: 5, appearances: 17, sort_order: 10, market_value: 41 };
    rows.seasons = [rows.seasons[0], { ...UNITED, club: 'Man Utd', market_value: 46, sort_order: 9 }, villa];
    const pool = await fetchCareerPool();
    expect(pool?.find(player => player.id === RASHFORD)?.seasons).toMatchObject([
      { club: 'Man Utd', appearances: 24, assists: 3, marketValue: 46, sortOrder: 9 },
      { club: 'Aston Villa', appearances: 17, assists: 5, marketValue: 41, sortOrder: 10 },
      { club: 'Barcelona', appearances: 49, assists: null, sortOrder: 11 },
    ]);
  });

  it('supplies verified Career Quiz clues and ordered Transfer Path club spell links', async () => {
    rows.players.push({ id: 'test-teammate', player_name: 'Fixture Teammate', nationality: 'Portugal', position: 'CAM' });
    rows.seasons.push({ ...UNITED, player_id: 'test-teammate', goals: 0, assists: null, appearances: 1, sort_order: 0 });
    const shared = await fetchCareerPlayers();
    const rashford = shared.find(player => player.name === 'Marcus Rashford')!;
    expect(rashford.id).toBe(RASHFORD);
    expect(rashford.career.map(stint => stint.club)).toEqual(['Manchester United', 'Aston Villa', 'Barcelona']);
    expect(careerCellValue(rashford.career[0], 'assists')).toBe('3');
    expect(careerCellValue(rashford.career[1], 'appearances')).toBe('17');
    expect(careerCellValue(rashford.career[1], 'assists')).toBe('n/a');
    expect(careerCellValue(rashford.career[2], 'marketValue')).toBe('n/a');
    expect(careerCellValue(rashford.career[2], 'goals')).toBe('14');
    const keys = clubSeasonsOf(shared);
    expect(shareClub(keys, 'Marcus Rashford', 'Fixture Teammate')).toBe('Manchester United');
    expect(keys.get('Alexander Isak')?.exact.has('Liverpool::2025-2026')).toBe(true);
    expect(keys.get('Marcus Rashford')?.exact.has('Barcelona::2025-2026')).toBe(true);
  });

  it('admits verified spells under Transfer Path Active as well as Europe', async () => {
    const fallback = await fetchCareerPlayers();
    const active = clubSeasonsOf(fallback, 'active');
    expect(active.get('Alexander Isak')?.exact.has('Liverpool::2025-2026')).toBe(true);
    expect(active.get('Marcus Rashford')?.exact.has('Barcelona::2025-2026')).toBe(true);
    expect(clubSeasonsOf(fallback, 'europe').get('Alexander Isak')?.exact.has('Liverpool::2025-2026')).toBe(true);

    rows.seasons.push({ ...LIVERPOOL, goals: 4, assists: 1, appearances: 22, market_value: 110 });
    const imported = await fetchCareerPlayers();
    expect(clubSeasonsOf(imported, 'active').get('Alexander Isak')?.exact.has('Liverpool::2025-2026')).toBe(true);
  });

  it('keeps the Soccer Grid identity suggestions and selection intact', async () => {
    const shared = await fetchCareerPlayers();
    const players = shared.map(({ name, nationality, position }) => ({ name, nationality, position }));
    expect(players).toEqual(rows.players.map(({ player_name: name, nationality, position }) => ({ name, nationality, position })));
    const onSelect = vi.fn();
    render(createElement(SoccerGridSearch, { players, onSelect, disabled: false }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'isak' } });
    fireEvent.click(screen.getByRole('option', { name: /Alexander Isak/i }));
    expect(onSelect).toHaveBeenCalledWith('Alexander Isak');
  });
});
