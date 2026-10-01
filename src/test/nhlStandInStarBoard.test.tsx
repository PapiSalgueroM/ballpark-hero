/**
 * Round 830 review: a stand in rating wears its star on every list.
 *
 * 97 men start on a flat 68 because they had no full 2025-26 NHL season to
 * rate. The Roster box marked them, but a man keeps the mark when he walks
 * into the free agent pool or sits on another club, and the market and the
 * trade screens printed a bare 68 as though his stats had produced it. The
 * trade screens also showed only the top 8 of a 23 man roster, which hid
 * the depth a GM most wants to move. Renders the real board on a seeded
 * full roster league.
 */
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Board from '@/components/nhl-front-office/NhlFrontOfficeBoard';
import { initNhlFullLeague, type NhlLeague } from '@/lib/nhlFrontOffice';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));

const KEY = 'nhl-front-office-save-v1';
function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const saved = (league: NhlLeague) => ({ league, myTeam: 'BOS', phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0, mandate: null, trust: 60, fired: false, pressTilt: 0, seasonTradeLine: null, postseason: null });

beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); vi.spyOn(Math, 'random').mockImplementation(lehmer(11)); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('NHL Front Office: stand in ratings on every list', () => {
  it('the market and the trade screens star a stand in, and the trade lists carry the whole roster', async () => {
    const league = initNhlFullLeague(lehmer(5));
    /* a stand in from Anaheim walks into the pool, as an expiring man does in the summer */
    const ana = league.teams.ANA;
    const walker = ana.players.find(p => p.partial)!;
    ana.players = ana.players.filter(p => p !== walker);
    league.freeAgents.push({ ...walker, years: 1 });
    const stillThere = ana.players.find(p => p.partial)!;
    expect(walker.ovr).toBe(68);
    localStorage.setItem(KEY, JSON.stringify(saved(league)));
    const view = render(<Board />);

    fireEvent.click(await view.findByRole('button', { name: /^💼\s*Free agency/ }));
    const faRow = view.container.querySelector<HTMLElement>(`[data-fa-row="${walker.id}"]`)!;
    expect(within(faRow).getByText('68*')).toBeTruthy();
    expect(view.container.querySelector('[data-partial-note]')).toHaveTextContent('Stand in rating');

    fireEvent.click(view.getByRole('button', { name: /Hub/ }));
    fireEvent.click(view.getByRole('button', { name: /^🤝\s*Trades/ }));
    /* the Trade Finder offers every man on the club to shop, not the top 8 */
    expect(view.container.querySelector('[data-trade-shop-list]')!.querySelectorAll('button')).toHaveLength(league.teams.BOS.players.length);
    fireEvent.click(view.getByRole('button', { name: 'ANA' }));
    expect(view.container.querySelector('[data-trade-send-list]')!.querySelectorAll('button')).toHaveLength(league.teams.BOS.players.length);
    expect(view.container.querySelector('[data-trade-get-list]')!.querySelectorAll('[data-trade-row]')).toHaveLength(ana.players.length);
    const row = view.container.querySelector<HTMLElement>(`[data-trade-row="${stillThere.id}"]`)!;
    expect(row).toHaveTextContent(`${stillThere.name} (${stillThere.pos}) 68*`);
  });
});
