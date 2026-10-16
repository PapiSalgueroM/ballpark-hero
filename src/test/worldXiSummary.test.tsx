import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { WxPlayer, WorldXiData } from '@/lib/worldXi';
import { playerRating } from '@/lib/squadShape';

const H = vi.hoisted(() => {
  const countries = ['Argentina', 'Belgium', 'Brazil', 'Colombia', 'Croatia', 'England', 'France', 'Germany', 'Italy', 'Japan', 'Mexico'];
  const positions = ['GK', 'RB', 'CB', 'LB', 'CM', 'CDM', 'CAM', 'RW', 'ST', 'LW'] as const;
  const values = [500000, 5000000, 15000000, 40000000, 80000000, 200000000, 0, 1000000, 3000000, 10000000, 60000000];
  const pool = () => {
    const players = countries.flatMap((country, index) => ['Linked', 'Solo'].flatMap(kind => positions.map(position => ({
      name: `${kind} ${position} Tester ${index + 1}`, country, position,
      club: kind === 'Linked' && index < 3 ? 'Fixture United' : `${kind} Club ${index + 1}`,
      value: values[index], age: index === 1 ? undefined : index === 2 ? 37 : 25,
    }))));
    return { players, countries: [...countries], byCountry: new Map(countries.map(country => [country, players.filter(p => p.country === country)])) };
  };
  return { pool, simulate: vi.fn() };
});

// The page, card curve, chemistry and season simulation are real. Only transport
// and unrelated chrome are replaced. Every player and club in this pool is fictional.
vi.mock('@/lib/worldXi', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/worldXi')>();
  return { ...actual, fetchWorldXiPool: () => Promise.resolve(H.pool()), simulateWorldXiSeason: H.simulate };
});
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Fixture Tester' }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => { throw new Error('Unexpected database read in the fictional page fixture'); } },
  SUPABASE_URL: 'http://stub', SUPABASE_PUBLISHABLE_KEY: 'stub',
}));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));

import WorldXi from '@/pages/WorldXi';

beforeEach(async () => {
  const actual = await vi.importActual<typeof import('@/lib/worldXi')>('@/lib/worldXi');
  H.simulate.mockReset().mockImplementation(actual.simulateWorldXiSeason);
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
    matches: query === '(prefers-reduced-motion: reduce)', media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: () => false,
  }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

type View = ReturnType<typeof render>;
async function mount() {
  const view = render(<MemoryRouter initialEntries={['/world-xi']}><WorldXi /></MemoryRouter>);
  await view.findByRole('button', { name: /Draw my 11 nations/ });
  return view;
}
async function complete(view: View, kind = 'Linked') {
  fireEvent.click(view.getByRole('button', { name: /Draw my 11 nations/ }));
  const pool = H.pool() as WorldXiData, chosen: WxPlayer[] = [];
  for (let step = 0; step < 11; step++) {
    const prompt = view.getByText(/^Name a player from /).textContent!;
    const match = prompt.match(/^Name a player from (.+) who can play (\w+)\./);
    expect(match, 'the real page must expose its active nation and slot').not.toBeNull();
    const player = pool.players.find(p => p.country === match![1] && p.position === match![2] && p.name.startsWith(kind))!;
    expect(player, 'the fictional pool must fill the real requested slot').toBeTruthy();
    fireEvent.change(view.getByRole('textbox', { name: 'Name a player for this slot' }), { target: { value: player.name } });
    fireEvent.click(view.getByRole('button', { name: new RegExp(player.name) }));
    chosen.push(player);
  }
  expect(view.getByText('World XI complete!')).toBeTruthy();
  return chosen;
}
function simulate(view: View) {
  fireEvent.click(view.getByRole('button', { name: /Simulate Season/ }));
  expect(view.getByText('Season Report')).toBeTruthy();
}

describe('World XI ratings and club chemistry display', () => {
  it('shows the exact card overall for every player after simulation', async () => {
    const view = await mount(), chosen = await complete(view);
    expect(view.queryByLabelText(`Overall for ${chosen[0].name}`)).toBeNull();
    simulate(view);
    for (const player of chosen) {
      const overall = view.queryByLabelText(`Overall for ${player.name}`);
      expect(overall, 'WORLD_XI_OVR: every simulated pick needs its card overall').not.toBeNull();
      const rating = playerRating({ marketValue: Math.max(1, player.value / 1000000), age: player.age ?? 27 } as Parameters<typeof playerRating>[0]);
      expect(overall).toHaveTextContent(`${rating} OVR`);
    }
    expect(view.getByText(/OVR is the card rating used for this simulation/)).toBeTruthy();
  });

  it('shows the actual shared-club pairs behind the chemistry count', async () => {
    const view = await mount(); await complete(view); simulate(view);
    const button = view.queryByRole('button', { name: /Club chemistry: 3 links/ });
    expect(button, 'WORLD_XI_CLUB_LINKS: the existing club links need an inspectable summary').not.toBeNull();
    fireEvent.click(button!);
    const detail = view.getByRole('region', { name: 'Club chemistry details' });
    const linked = H.simulate.mock.calls[0][0].filter((p: WxPlayer) => p.club === 'Fixture United') as WxPlayer[];
    expect(linked).toHaveLength(3);
    const pairs = linked.flatMap((a, i) => linked.slice(i + 1).map(b => `${a.name} + ${b.name}`));
    expect(within(detail).getAllByRole('listitem')).toHaveLength(3);
    for (const pair of pairs) expect(within(detail).getByText(pair, { exact: false })).toBeTruthy();
    expect(within(detail).getAllByText('Fixture United')).toHaveLength(3);
    expect(within(detail).getByText(/These links do not change the season sim/)).toBeTruthy();
    fireEvent.click(within(detail).getByRole('button', { name: 'Back' }));
    expect(view.queryByRole('region', { name: 'Club chemistry details' })).toBeNull();
  });

  it('shows zero shared clubs and clears the old detail on replay', async () => {
    const view = await mount(); await complete(view); simulate(view);
    const button = view.queryByRole('button', { name: /Club chemistry: 3 links/ });
    expect(button, 'WORLD_XI_ZERO_LINKS: club detail must open before its replay reset is checked').not.toBeNull();
    fireEvent.click(button!);
    expect(view.getByRole('region', { name: 'Club chemistry details' })).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: /Play again/ }));
    expect(view.queryByRole('region', { name: 'Club chemistry details' })).toBeNull();
    await complete(view, 'Solo'); simulate(view);
    expect(view.getByRole('button', { name: /Club chemistry: 0 links/ })).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: /Club chemistry: 0 links/ }));
    const detail = view.getByRole('region', { name: 'Club chemistry details' });
    expect(within(detail).getByText('No shared clubs in this XI.')).toBeTruthy();
    expect(within(detail).queryAllByRole('listitem')).toHaveLength(0);
    expect(within(detail).queryByText('Fixture United')).toBeNull();
  });

  it('keeps the real season inputs and match average distinct from card overall', async () => {
    const view = await mount(), chosen = await complete(view); simulate(view);
    expect(H.simulate).toHaveBeenCalledTimes(1);
    const args = H.simulate.mock.calls[0];
    expect(args).toHaveLength(2); expect(args[1]).toBe('4-3-3');
    expect((args[0] as WxPlayer[]).map(p => p.name).sort()).toEqual(chosen.map(p => p.name).sort());
    const report = H.simulate.mock.results[0].value;
    expect(report.fit).toBeUndefined();
    expect(report.squadRating).toBe(Math.round(chosen.reduce((sum, p) => sum + playerRating({ marketValue: Math.max(1, p.value / 1000000), age: p.age ?? 27 } as Parameters<typeof playerRating>[0]), 0) / 11));
    fireEvent.click(view.getByRole('button', { name: 'Player stats' }));
    expect(view.getByText(/Avg is the sim's match rating out of 10/)).toBeTruthy();
    for (const player of report.playerStats) expect(view.getAllByText(player.avgRating.toFixed(1), { exact: false }).length).toBeGreaterThan(0);
  });
});
