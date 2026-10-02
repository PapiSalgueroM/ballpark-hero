/**
 * Round 832 review: the picker waits for a past season's squads.
 *
 * Picking a past era fetches its squads while the nation step is on screen.
 * On a slow connection the player can be on the league step before they
 * land, and every step past the nations reads them, so those steps hold on a
 * loading line until they arrive. Nothing committed checked that: with the
 * wait taken out (waitingForEra forced false) every gate stayed green, and in
 * a real browser with the 2010-11 chunk held back four seconds the page threw
 * "the era2010 squads are not loaded yet" the moment England was tapped.
 *
 * This renders the real page with the 2010-11 bake held behind a gate: the
 * league step shows the loading line and nothing throws; released, the
 * league step draws with its strongest sides. No request leaves the test:
 * fetch is stubbed to refuse and must never be called.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));

const realFetch = globalThis.fetch;
const fetchSpy = vi.fn(() => Promise.reject(new Error('no network in this test')));

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); fetchSpy.mockClear(); globalThis.fetch = fetchSpy as unknown as typeof fetch; });
afterEach(() => { globalThis.fetch = realFetch; vi.doUnmock('@/data/clubManagerEra2010'); });

describe('Club Manager picker: a past season waits for its squads', () => {
  it('holds the league step on a loading line until the 2010-11 squads land, then draws it', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>(r => { release = r; });
    vi.resetModules();
    vi.doMock('@/data/clubManagerEra2010', async () => {
      await gate;
      return await vi.importActual<typeof import('@/data/clubManagerEra2010')>('@/data/clubManagerEra2010');
    });
    const { default: ClubManager } = await import('@/pages/ClubManager');
    render(<MemoryRouter initialEntries={['/club-manager']}><ClubManager /></MemoryRouter>);

    const eraTile = await screen.findByText('2010-11', {}, { timeout: 20000 });
    fireEvent.click(eraTile.closest('button')!);
    const england = await screen.findByText('England', {}, { timeout: 10000 });
    fireEvent.click(england.closest('button')!);

    expect(await screen.findByText(/Loading the 2010-11 squads/, {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.queryByText(/Strongest sides/)).toBe(null);

    release();
    await waitFor(() => expect(screen.getByText(/Strongest sides/)).toBeTruthy(), { timeout: 20000 });
    expect(screen.queryByText(/Loading the 2010-11 squads/)).toBe(null);
    expect(screen.getAllByText('Premier League').length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  }, 60000);
});
