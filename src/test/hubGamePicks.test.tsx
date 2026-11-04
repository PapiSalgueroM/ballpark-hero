import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import Index from '@/pages/Index';
import HubExperience from '@/components/hub/HubExperience';
import { categoriesByTitle } from '@/data/gameRegistry';
import { hubFor } from '@/lib/sportHub';
import { GAME_PICKS_KEY, GAME_PICKS_STORAGE_WARNING, useGamePicks } from '@/hooks/useGamePicks';
const network = vi.hoisted(() => ({ recordCompletion: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture' }));
vi.mock('sonner', () => ({ toast: { warning: vi.fn() } }));
vi.mock('@/lib/completions', () => ({ getCurrentPlayerName: () => 'Fixture', getLocalTodayCount: () => 0, recordCompletion: network.recordCompletion }));
vi.mock('@/hooks/useStreaks', () => ({ useStreaks: () => ({ globalCurrentStreak: 0 }) }));
vi.mock('@/hooks/useMostPlayed', () => ({ useMostPlayed: () => ({ entries: [], loading: false }) }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/components/game/StreakReminder', () => ({ StreakReminder: () => null }));
vi.mock('@/components/home/FeaturedStage', () => ({ FeaturedStage: () => null }));
vi.mock('@/components/home/ContinueRow', () => ({ ContinueRow: () => null }));
vi.mock('@/components/home/DailyRail', () => ({ DailyRail: () => null }));
vi.mock('@/components/home/JustShipped', () => ({ JustShipped: () => null }));
vi.mock('@/components/home/HomeAbout', () => ({ HomeAbout: () => null }));
vi.mock('@/components/home/PollOfTheDay', () => ({ PollOfTheDay: () => null }));
const fixtures = [
  { route: '/soccer', game: '/soccer-career', label: 'Soccer Career' },
  { route: '/pro-basketball', game: '/nba-my-career', label: 'NBA My Career' },
  { route: '/pro-football', game: '/nfl-my-career', label: 'NFL My Career' },
];
const held = { soccerCareerSave: '{"currentClub":"Fixture club","age":24}', 'nba-my-career-save-v1': '{"c":{"team":"Fixture hoops","year":2026}}', 'pin-unrelated': 'held' };
const bytes = () => Object.fromEntries(Object.keys(localStorage).filter(k => k !== GAME_PICKS_KEY).sort().map(k => [k, localStorage.getItem(k)]));
function Hub() {
  const location = useLocation(), hub = hubFor(location.pathname)!;
  return <HubExperience hub={hub} games={categoriesByTitle(...hub.titles).flatMap(c => c.games)} />;
}
function Address() {
  const location = useLocation(), navigate = useNavigate();
  return <><output data-testid="address">{location.pathname + location.search}</output><Link to="/">Home fixture link</Link><button onClick={() => navigate(-1)}>Fixture history back</button></>;
}
async function mount(route: string) {
  const view = render(<MemoryRouter initialEntries={[route]}><Address /><Routes><Route path="/" element={<Index />} />{fixtures.map(f => <Route key={f.route} path={f.route} element={<Hub />} />)}</Routes></MemoryRouter>);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); }); return view;
}
function keep(name: string, value: unknown) {
  if (!process.env.HUB_GAME_PICKS_RAW) return;
  mkdirSync(process.env.HUB_GAME_PICKS_RAW, { recursive: true });
  writeFileSync(path.join(process.env.HUB_GAME_PICKS_RAW, name + '.json'), JSON.stringify(value, null, 2) + '\n');
}
const paths = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll('[data-home-picks] a[data-game-pick-link]')].map(a => a.getAttribute('href'));
beforeEach(() => {
  localStorage.clear(); network.recordCompletion.mockReset();
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Picks tests must stay offline'); }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  const reset = renderHook(() => useGamePicks()); act(() => { reset.result.current.toggle('/footle'); }); reset.unmount();
  localStorage.clear(); for (const [key, value] of Object.entries(held)) localStorage.setItem(key, value);
  localStorage.setItem(GAME_PICKS_KEY, '["/footle"]');
});
afterEach(() => { cleanup(); expect(network.recordCompletion).not.toHaveBeenCalled(); expect(globalThis.fetch).not.toHaveBeenCalled(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Sport hub picks and Home', () => {
  for (const f of fixtures) it('pins from ' + f.route + ' and restores the exact Home destination', async () => {
    const url = f.route + '?filter=sim&q=Career&from=pin-test', view = await mount(url), before = bytes();
    const button = view.queryByRole('button', { name: 'Pin ' + f.label });
    keep(f.route.slice(1), { before, pinPresent: button !== null });
    expect(button, 'HUB_PICK_BUTTON').not.toBeNull(); expect(button!.closest('a')).toBeNull();
    button!.focus(); fireEvent.click(button!);
    expect(view.getByTestId('address').textContent).toBe(url);
    expect(button).toHaveAttribute('aria-pressed', 'true'); expect(document.activeElement).toBe(button);
    expect(JSON.parse(localStorage.getItem(GAME_PICKS_KEY)!)).toEqual(['/footle', f.game]); expect(bytes()).toEqual(before);
    fireEvent.click(view.getByRole('link', { name: 'Home fixture link' }));
    await act(async () => { await Promise.resolve(); });
    expect(paths(view)).toEqual(['/footle', f.game]);
    expect(view.container.querySelector('[data-home-picks] a[href="' + f.game + '"]')).not.toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Fixture history back' }));
    expect(view.getByTestId('address').textContent).toBe(url);
    expect(view.getByRole('button', { name: 'Unpin ' + f.label })).toHaveAttribute('aria-pressed', 'true');
    expect(bytes()).toEqual(before);
    keep(f.route.slice(1) + '-result', { picks: JSON.parse(localStorage.getItem(GAME_PICKS_KEY)!), protected: bytes(), address: view.getByTestId('address').textContent });
    view.unmount(); const restored = await mount(f.route);
    expect(restored.getByRole('button', { name: 'Unpin ' + f.label })).toHaveAttribute('aria-pressed', 'true');
  });
  it('unpins only the selected hub game and keeps the existing Home pick', async () => {
    localStorage.setItem(GAME_PICKS_KEY, '["/footle","/soccer-career"]');
    const view = await mount('/soccer'), before = bytes(), control = view.queryByRole('button', { name: 'Unpin Soccer Career' });
    keep('unpin', { present: control !== null, before });
    expect(control, 'HUB_UNPIN_CONTROL').not.toBeNull(); fireEvent.click(control!);
    expect(JSON.parse(localStorage.getItem(GAME_PICKS_KEY)!)).toEqual(['/footle']); expect(bytes()).toEqual(before);
    fireEvent.click(view.getByRole('link', { name: 'Home fixture link' })); await act(async () => { await Promise.resolve(); });
    expect(paths(view)).toEqual(['/footle']); expect(view.getByTestId('address').textContent).toBe('/');
  });
  it('uses the existing honest this-visit warning when a hub pin cannot be saved', async () => {
    const view = await mount('/soccer'), before = bytes(), control = view.queryByRole('button', { name: 'Pin Soccer Career' });
    keep('blocked', { present: control !== null, before });
    expect(control, 'HUB_PICK_FAILED_STORAGE_CONTROL').not.toBeNull();
    const original = Storage.prototype.setItem;
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) { if (key === GAME_PICKS_KEY) throw new Error('QuotaExceededError'); original.call(this, key, value); });
    fireEvent.click(control!);
    expect(view.getByRole('button', { name: 'Unpin Soccer Career' })).toHaveAttribute('aria-pressed', 'true');
    expect(view.getByText(GAME_PICKS_STORAGE_WARNING)).toHaveAttribute('role', 'status');
    expect(localStorage.getItem(GAME_PICKS_KEY)).toBe('["/footle"]'); expect(bytes()).toEqual(before);
    write.mockRestore(); fireEvent.click(view.getByRole('button', { name: 'Unpin Soccer Career' }));
    expect(JSON.parse(localStorage.getItem(GAME_PICKS_KEY)!)).toEqual(['/footle']);
  });
});
