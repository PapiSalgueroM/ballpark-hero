import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Leaderboard from '@/pages/Leaderboard';
import { getLocalTodayCount, recordCompletion } from '@/lib/completions';
import { getStreakState } from '@/lib/streaks';

const backend = vi.hoisted(() => ({ insert: vi.fn(), rpc: vi.fn(), getSession: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ insert: backend.insert }),
    rpc: backend.rpc,
    auth: { getSession: backend.getSession },
  },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile: null }) }));

const view = () => render(<HelmetProvider><MemoryRouter><Leaderboard /></MemoryRouter></HelmetProvider>);
const guidance = () => within(screen.getByRole('heading', { name: 'How the world leaderboard works' }).closest('section')!);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('dukb-guest-handle', 'EligibilityFixtureGuest');
  vi.clearAllMocks();
  backend.insert.mockResolvedValue({ error: null });
  backend.getSession.mockResolvedValue({ data: { session: null } });
  backend.rpc.mockResolvedValue({ data: [], error: null });
});
afterEach(() => cleanup());

describe('World Leaderboard explains its actual score eligibility', () => {
  it('an unscored finish records a play and streak without adding points or a score field', async () => {
    recordCompletion('/deadline-day', undefined);
    expect(backend.insert).toHaveBeenCalledExactlyOnceWith({ game: 'deadline-day', player_name: 'EligibilityFixtureGuest' });
    expect(getStreakState()).toMatchObject({ totalPlays: 1, totalPoints: 0, global: { current: 1 } });
    expect(getStreakState().perGame['deadline-day'].current).toBe(1);
    expect(getLocalTodayCount()).toBe(1);
    await waitFor(() => expect(backend.getSession).toHaveBeenCalledOnce());
    expect(backend.rpc).not.toHaveBeenCalled();
  });

  it('a positive finish preserves the score, guest handle and existing local accounting', async () => {
    recordCompletion('/soccer-grid', 60);
    expect(backend.insert).toHaveBeenCalledExactlyOnceWith({ game: 'soccer-grid', score: 60, player_name: 'EligibilityFixtureGuest' });
    expect(getStreakState()).toMatchObject({ totalPlays: 1, totalPoints: 60, global: { current: 1 } });
    expect(getLocalTodayCount()).toBe(1);
    await waitFor(() => expect(backend.getSession).toHaveBeenCalledOnce());
    expect(backend.rpc).not.toHaveBeenCalled();
  });

  it('a zero-score finish still records the play without turning zero into positive points', () => {
    recordCompletion('/soccer-grid', 0);
    expect(backend.insert).toHaveBeenCalledExactlyOnceWith({ game: 'soccer-grid', score: 0, player_name: 'EligibilityFixtureGuest' });
    expect(getStreakState()).toMatchObject({ totalPlays: 1, totalPoints: 0 });
    expect(getLocalTodayCount()).toBe(1);
  });

  it('rendered guidance matches an actual unscored finish and qualifies ranked participation', async () => {
    recordCompletion('/deadline-day', undefined);
    view();
    await screen.findByText('No points today');
    expect(backend.insert.mock.calls[0][0]).not.toHaveProperty('score');
    expect(getStreakState()).toMatchObject({ totalPlays: 1, totalPoints: 0 });
    expect(guidance().getByText(/positive ranked score/)).toBeInTheDocument();
    expect(guidance().getByText(/without a ranked score.*plays and streaks.*no leaderboard points/)).toBeInTheDocument();
    expect(guidance().queryByText(/finish a game and you are on it/)).not.toBeInTheDocument();
    expect(guidance().getByRole('heading', { name: 'How ranked games earn points' })).toBeInTheDocument();
    expect(screen.getByText(/Scored games share one board/)).toBeInTheDocument();
    expect(guidance().getByRole('link', { name: 'Soccer Grid' })).toHaveAttribute('href', '/soccer-grid');
  });

  it('actual metadata describes scored games and retains guest access and its canonical', async () => {
    view();
    await waitFor(() => {
      const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content');
      expect(description).toMatch(/ranked scores/);
      expect(description).toMatch(/without an account/);
      expect(description).not.toMatch(/every game/);
    });
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://douknowball.com/leaderboard');
    expect(document.head.querySelector('meta[property="og:description"]')?.getAttribute('content')).toMatch(/ranked scores/);
  });

  it.each(['Today', 'All-Time'])('an empty %s rank asks for a positive score while keeping genuine empty results', async window => {
    view();
    if (window === 'All-Time') fireEvent.mouseDown(screen.getByRole('tab', { name: window }));
    const panel = await screen.findByRole('tabpanel', { name: window });
    expect(within(panel).getByText(window === 'Today' ? 'No points today' : 'No points yet')).toBeInTheDocument();
    expect(within(panel).getByText(/positive ranked score.*EligibilityFixtureGuest/)).toBeInTheDocument();
    expect(within(panel).getByText(window === 'Today' ? 'No scores yet today. Be the first!' : 'No scores yet. Be the first!')).toBeInTheDocument();
    expect(backend.rpc).toHaveBeenCalledWith('global_rank', { p_player: 'EligibilityFixtureGuest', p_period: window === 'Today' ? 'today' : 'alltime', p_games: null });
  });

  it('a failed board still reports failure and retries the same guest window before showing empty results', async () => {
    backend.rpc.mockImplementation((name: string, args: { p_period: string }) => Promise.resolve(
      name === 'global_leaderboard' && args.p_period === 'today'
        ? { data: null, error: { code: '57014' } }
        : { data: [], error: null }
    ));
    view();
    await screen.findByText('That board did not load. It is us, not you.');
    expect(screen.queryByText('No scores yet today. Be the first!')).not.toBeInTheDocument();
    expect(screen.queryByText(/positive ranked score.*EligibilityFixtureGuest/)).not.toBeInTheDocument();
    backend.rpc.mockResolvedValue({ data: [], error: null });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('No scores yet today. Be the first!');
    expect(backend.rpc.mock.calls.filter(([name, args]) => name === 'global_leaderboard' && args.p_period === 'today')).toHaveLength(2);
    expect(backend.rpc.mock.calls.filter(([name, args]) => name === 'global_rank' && args.p_period === 'today')).toHaveLength(2);
  });
});
