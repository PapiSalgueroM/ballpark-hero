import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LineupBuilder from '@/pages/LineupBuilder';
import { BUILD_XI_DRAFT_KEY } from '@/lib/buildXiDraft';
import { searchPlayers } from '@/lib/playerSearch';

vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/integrations/supabase/client', () => ({}));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/data/lineupTeams', async importOriginal => {
  const real = await importOriginal<typeof import('@/data/lineupTeams')>();
  return {
    ...real,
    getRandomTeamAssignments: (count: number) => ['Real Madrid', ...real.clubs.filter(club => club !== 'Real Madrid')]
      .slice(0, count).map(name => ({ name, isNation: false })),
  };
});
vi.mock('@/lib/playerSearch', async importOriginal => {
  const real = await importOriginal<typeof import('@/lib/playerSearch')>();
  return {
    ...real,
    searchPlayers: vi.fn(async () => ({ error: null, results: [{
      key: 'fixture keeper', name: 'Fixture Keeper', rawName: 'Fixture Keeper', matchRank: 0, prominence: 100,
      meta: { club: 'Real Madrid', position: 'Goalkeeper' },
    }] })),
  };
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('Build Your XI quick position picker', () => {
  it.each(['pitch', 'position picker'])('keeps the new slot when a player switches with the %s during a check', async control => {
    let finishHistory!: (response: Response) => void;
    const fetchHistory = vi.fn(() => new Promise<Response>(resolve => { finishHistory = resolve; }));
    vi.stubGlobal('fetch', fetchHistory);
    vi.mocked(searchPlayers).mockResolvedValueOnce({ error: null, results: [{
      key: 'fixture fullback', name: 'Fixture Fullback', rawName: 'Fixture Fullback', matchRank: 0, prominence: 100,
      meta: { club: 'Real Madrid', position: 'Right-Back' },
    }] });
    localStorage.setItem('lineup-rules-seen', '1');
    render(<LineupBuilder />);
    fireEvent.click(screen.getByRole('button', { name: /^4-3-3/ }));
    const picker = screen.getByRole('combobox', { name: 'Position to fill' });
    fireEvent.click(screen.getByRole('button', { name: 'LB' }));
    const search = screen.getByRole('combobox', { name: /Search a Real Madrid player/ });
    fireEvent.change(search, { target: { value: 'Fullback' } });
    await screen.findByRole('option', { name: /Fixture Fullback/ });
    fireEvent.keyDown(search, { key: 'Enter' });
    await waitFor(() => expect(fetchHistory).toHaveBeenCalledTimes(1));
    if (control === 'pitch') fireEvent.click(screen.getByRole('button', { name: 'GK' }));
    else {
      expect(picker).toBeEnabled();
      fireEvent.change(picker, { target: { value: '0' } });
    }
    fireEvent.change(search, { target: { value: 'Keeper' } });
    await act(async () => { finishHistory(new Response('[]')); });
    expect(picker).toHaveValue('0');
    expect(search).toHaveValue('Keeper');
    expect(JSON.parse(localStorage.getItem(BUILD_XI_DRAFT_KEY)!).slots).toEqual([]);
    await screen.findByRole('option', { name: /Fixture Keeper/ });
    fireEvent.keyDown(search, { key: 'Enter' });
    await waitFor(() => expect(screen.getByRole('button', { name: /GK Fixture Keeper/ })).toBeDisabled());
    expect(JSON.parse(localStorage.getItem(BUILD_XI_DRAFT_KEY)!).slots).toHaveLength(1);
  });

  it('keeps first pick local to the assignment, distinguishes open roles, and restores the saved lineup', async () => {
    localStorage.setItem('lineup-rules-seen', '1');
    const mounted = render(<LineupBuilder />);
    fireEvent.click(screen.getByRole('button', { name: /^4-3-3/ }));

    const picker = screen.getByRole('combobox', { name: 'Position to fill' });
    expect(within(picker).getByRole('option', { name: 'CB 1' })).toBeInTheDocument();
    expect(within(picker).getByRole('option', { name: 'CB 2' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Search a Real Madrid player/ })).toBeNull();

    picker.focus();
    fireEvent.change(picker, { target: { value: '2' } });
    expect(picker).toHaveFocus();
    fireEvent.change(picker, { target: { value: '3' } });
    expect(picker).toHaveValue('3');
    fireEvent.change(picker, { target: { value: '0' } });
    const search = screen.getByRole('combobox', { name: /Search a Real Madrid player/ });
    search.focus();
    fireEvent.change(search, { target: { value: 'Fixture' } });
    await screen.findByRole('option', { name: /Fixture Keeper/ });
    fireEvent.keyDown(search, { key: 'Enter' });

    await waitFor(() => expect(picker).toHaveValue(''));
    expect(picker).toHaveFocus();
    expect(within(picker).queryByRole('option', { name: 'GK' })).toBeNull();
    expect(screen.getByRole('button', { name: /GK Fixture Keeper/ })).toBeDisabled();

    const saved = JSON.parse(localStorage.getItem(BUILD_XI_DRAFT_KEY)!);
    expect(saved.slots[0]).toMatchObject([0, { playerName: 'Fixture Keeper', assignedTeam: 'Real Madrid' }]);
    mounted.unmount();
    render(<LineupBuilder />);
    const restored = screen.getByRole('combobox', { name: 'Position to fill' });
    expect(within(restored).queryByRole('option', { name: 'GK' })).toBeNull();
    expect(screen.getByRole('button', { name: /GK Fixture Keeper/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'LB' }));
    expect(restored).toHaveValue('1');
  });
});
