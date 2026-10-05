/**
 * Round 964 review: the world editor through the real page, tile to career.
 *
 * The engine, the hook and the editor screen each had a test, and none of
 * them rendered the page. A reviewer dropped the edit from the page's
 * confirmClub call (the one line that hands the edit to the career) and every
 * gate stayed green, so the whole feature could vanish in a merge of that
 * line. The same gap covered the edited team list and the "board wants" line
 * on the team step.
 *
 * This walks the page the way a player does: today's era, the World editor
 * tile, Celtic swapped with Brentford, England, the Premier League, Celtic,
 * take the job, skip the dugout. The team step must list Celtic and not
 * Brentford, Celtic's board line must ask to stay up, and the career saved
 * at the end must carry the edit and play Celtic in the Premier League.
 * No request leaves the test: fetch is stubbed to refuse and is never called.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClubManager from '@/pages/ClubManager';
import { registerLeagueOverrides } from '@/lib/clubManager';
import { swapClubs } from '@/lib/clubManagerWorldEdit';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));

const SAVE_KEY = 'dukb-club-manager-save';
const realFetch = globalThis.fetch;
const fetchSpy = vi.fn(() => Promise.reject(new Error('no network in this test')));

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); fetchSpy.mockClear(); globalThis.fetch = fetchSpy as unknown as typeof fetch; });
afterEach(() => { cleanup(); registerLeagueOverrides(null); globalThis.fetch = realFetch; });

const click = (el: HTMLElement) => fireEvent.click(el.closest('button') ?? el);

describe('Club Manager page: the world editor reaches the career', () => {
  it('starts Celtic in the Premier League after a swap made on the World editor tile', async () => {
    render(<MemoryRouter initialEntries={['/club-manager']}><ClubManager /></MemoryRouter>);

    /* Today's era, then the World editor tile on the nation step. */
    click((await screen.findAllByRole('button', { name: /2026/ }, { timeout: 30000 }))[0]);
    click(await screen.findByTestId('cm-world-editor-tile', {}, { timeout: 20000 }));

    /* The editor opens on Scotland, swapping into the Premier League. */
    click(await screen.findByLabelText('Move Celtic', {}, { timeout: 20000 }));
    click(await screen.findByLabelText('Swap Celtic with Brentford', {}, { timeout: 10000 }));
    click(await screen.findByText('Play this world (2 moved)', {}, { timeout: 10000 }));

    /* Back on the nations, the tile says the world is edited. */
    expect((await screen.findByTestId('cm-world-editor-tile', {}, { timeout: 10000 })).textContent).toMatch(/2 clubs moved/);
    click(await screen.findByText('England', {}, { timeout: 10000 }));
    click((await screen.findAllByRole('button', { name: /Premier League/ }, { timeout: 10000 }))[0]);

    /* The team step lists the edited Premier League, and the board judges
       Celtic against it. */
    const celtic = (await screen.findAllByRole('button', { name: /Celtic/ }, { timeout: 20000 }))[0];
    expect(screen.queryByRole('button', { name: /^Brentford/ })).toBe(null);
    expect(celtic.textContent).toMatch(/stay up|avoid relegation/i);
    click(celtic);
    click(await screen.findByText('Take the job', {}, { timeout: 10000 }));
    click(await screen.findByText('Skip: just manage', {}, { timeout: 20000 }));

    /* The career the page started carries the edit and plays it. */
    await waitFor(() => expect(localStorage.getItem(SAVE_KEY)).not.toBe(null), { timeout: 20000 });
    const save = JSON.parse(localStorage.getItem(SAVE_KEY)!);
    expect(save.clubName).toBe('Celtic');
    expect(save.leagueOverrides).toEqual(swapClubs(null, 'Celtic', 'Brentford'));
    expect([...save.leagueClubs].sort()).toEqual([...swapClubs(null, 'Celtic', 'Brentford')!.premier].sort());
    expect(fetchSpy).not.toHaveBeenCalled();
  }, 180000);
});
