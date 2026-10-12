import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NbaPage from '@/pages/PerfectSeasonNba';
import { NBA_SLOTS } from '@/lib/perfectSeasonNba';

vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({
  default: ({ reportGameContext }: { reportGameContext: Record<string, unknown> }) => (
    <output data-testid="report-context">{JSON.stringify(reportGameContext)}</output>
  ),
}));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Fixture guest' }));
vi.mock('@/lib/perfectSeasonNba', async original => ({
  ...await original<typeof import('@/lib/perfectSeasonNba')>(),
  fetchTeamSeasonIndex: async () => [{ season: '2000-01', team: 'FX', teamName: 'Fixture Club' }],
  fetchSquad: async () => ({
    squadId: 'fixture-2001', teamName: 'Fixture Club', year: 2001,
    players: NBA_SLOTS.map(slot => ({
      playerId: `fixture-${slot.key}`, name: `Fixture Player ${slot.key}`, rating: 80,
      eligible: [slot.key], detail: 'fixture stat line',
    })),
  }),
}));

const context = () => JSON.parse(screen.getByTestId('report-context').textContent!);
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('NBA game state in reports', () => {
  it('follows the real mode, spin and draft rather than sending only the route', async () => {
    render(<NbaPage />);
    expect(context()).toMatchObject({ phase: 'mode-select', mode: 'classic', spins: 0, rerolls: 2, result: null });
    expect(context().picks).toEqual(NBA_SLOTS.map(slot => [slot.key, null]));
    fireEvent.click(screen.getByText('Classic').closest('button')!);
    await tick(10);
    expect(context().phase).toBe('spin');
    fireEvent.click(screen.getByRole('button', { name: 'Spin the wheel' }));
    await tick(1600);
    expect(context()).toMatchObject({ phase: 'draft', spins: 1, squad: 'fixture-2001' });
    fireEvent.click(screen.getByText('Fixture Player PG').closest('button')!);
    expect(context().picks).toContainEqual(['PG', 'fixture-PG']);
    expect(context().openSlots).not.toContain('PG');
    expect(context().phase).toBe('spin');
    expect(JSON.stringify(context()).length).toBeLessThan(1000);
  });
});
