import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { WorldXiData, WxPlayer } from '@/lib/worldXi';
import { playerRating } from '@/lib/squadShape';

const H = vi.hoisted(() => ({
  currentPool: vi.fn(),
  archiveRead: vi.fn(),
  archivePicks: vi.fn(),
}));

vi.mock('@/lib/worldXi', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/worldXi')>();
  return {
    ...actual,
    fetchWorldXiPool: H.currentPool,
    simulateWorldXiSeason: (players: WxPlayer[], formation: string) => {
      H.archivePicks(players.filter(player => player.country === 'Paraguay'));
      return actual.simulateWorldXiSeason(players, formation);
    },
  };
});
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture',
  supabase: { from: (table: string) => {
    const filters: Record<string, string | number> = {};
    const request = {
      select: () => request,
      eq: (key: string, value: string | number) => { filters[key] = value; return request; },
      gt: (key: string, value: number) => { filters[key] = value; return request; },
      order: () => request,
      then: (resolve: (result: unknown) => unknown) => Promise.resolve(H.archiveRead(table, filters)).then(resolve),
    };
    return request;
  } },
}));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Fixture' }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));

import WorldXi from '@/pages/WorldXi';

const positions = ['GK', 'RB', 'CB', 'LB', 'CM', 'CDM', 'CAM', 'RW', 'ST', 'LW'] as const;
const countries = ['Argentina', 'Belgium', 'Brazil', 'Colombia', 'Croatia', 'England', 'France', 'Germany', 'Italy', 'Japan', 'Mexico'];
const archiveRows = [
  { player_name: 'Gustavo Gómez', nationality: 'Paraguay', position: 'Centre-Back', club: 'Sociedade Esportiva Palmeiras', market_value_usd: 5_000_000, age: 31, year: 2025 },
  { player_name: 'Ramón Sosa', nationality: 'Paraguay', position: 'Second Striker', club: 'Nottingham Forest', market_value_usd: 13_000_000, age: 25, year: 2025 },
  { player_name: 'Gustavo Gómez', nationality: 'Argentina', position: 'Right Midfield', club: 'Fixture Argentine Club', market_value_usd: 1_000_000, age: 25, year: 2025 },
  { player_name: 'Paraguay CB Fixture', nationality: 'Paraguay', position: 'Centre-Back', club: 'Fixture Previous Club', market_value_usd: 25_000_000, age: 24, year: 2025 },
];

function pool(paraguaySlot: number): WorldXiData {
  const deck = [...countries];
  if (paraguaySlot >= 0) deck.splice(paraguaySlot, 0, 'Paraguay');
  const players = deck.flatMap(country => positions.map(position => ({
    name: `${country} ${position} Fixture`, country, position, club: 'Fixture Current Club', value: 2_000_000,
  })));
  return { countries: deck, players, byCountry: new Map(deck.map(country => [country, players.filter(player => player.country === country)])) };
}

async function setup(paraguaySlot: number) {
  const data = pool(paraguaySlot);
  H.currentPool.mockResolvedValue(data);
  const view = render(<MemoryRouter initialEntries={['/world-xi']}><WorldXi /></MemoryRouter>);
  const draw = await view.findByRole('button', { name: /Draw my 11 nations/ });
  expect(H.archiveRead).not.toHaveBeenCalled();
  fireEvent.click(draw);
  return { view, data };
}

type View = ReturnType<typeof render>;
function search(view: View, query: string) {
  const input = view.getByRole('textbox', { name: 'Name a player for this slot' });
  expect(input).toBeEnabled();
  fireEvent.change(input, { target: { value: query } });
}

function currentSlot(view: View) {
  const prompt = view.getByText(/^Name a player from /);
  return prompt.textContent!.match(/^Name a player from (.+) who can play (\w+)\./)!.slice(1);
}

function pickCurrentPlayer(view: View, data: WorldXiData) {
  const [nation, position] = currentSlot(view);
  const player = data.byCountry.get(nation)!.find(candidate => candidate.position === position)!;
  search(view, player.name);
  fireEvent.click(view.getByRole('button', { name: new RegExp(player.name) }));
}

beforeEach(() => {
  H.currentPool.mockReset();
  H.archivePicks.mockClear();
  H.archiveRead.mockReset().mockReturnValue({ data: archiveRows, error: null });
  vi.spyOn(Math, 'random').mockReturnValue(0.999999);
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('World XI Paraguay archive', () => {
  it.each([
    { index: 2, slot: 'CB', query: 'gustavo gomez', name: 'Gustavo Gómez', club: 'Sociedade Esportiva Palmeiras', wrong: 'Ramón Sosa', position: 'CB', age: 31, value: 5_000_000 },
    { index: 9, slot: 'ST', query: 'ramon sosa', name: 'Ramón Sosa', club: 'Nottingham Forest', wrong: 'Gustavo Gómez', position: 'CF', age: 25, value: 13_000_000 },
  ])('accepts $name from the archived rows at $slot', async ({ index, slot, query, name, club, wrong, position, age, value }) => {
    const { view, data } = await setup(index);
    for (let step = 0; step < index; step++) pickCurrentPlayer(view, data);
    expect(currentSlot(view)).toEqual(['Paraguay', slot]);
    search(view, 'Paraguay CB Fixture');
    expect(view.getByRole('button', { name: /Paraguay CB Fixture.*Fixture Current Club/ })).toBeEnabled();
    search(view, wrong);
    fireEvent.click(await view.findByRole('button', { name: new RegExp(wrong) }));
    expect(view.getByText(/Try a different player/)).toBeInTheDocument();
    search(view, query);
    const pick = await view.findByRole('button', { name: new RegExp(`${name}.*2025.*${club}`) });
    expect(view.queryByText('Fixture Argentine Club')).toBeNull();
    expect(H.archiveRead).toHaveBeenCalledExactlyOnceWith('player_market_values', { year: 2025, nationality: 'Paraguay', market_value_usd: 0 });
    fireEvent.click(pick);
    expect(view.getByText(/^Name a player from /)).not.toHaveTextContent('from Paraguay');
    for (let step = index + 1; step < 11; step++) pickCurrentPlayer(view, data);
    fireEvent.click(view.getByRole('button', { name: /Simulate Season/ }));
    expect(H.archivePicks).toHaveBeenCalledExactlyOnceWith([
      { name, country: 'Paraguay', position, club, age, value, archiveYear: 2025 },
    ]);
    const overall = playerRating({ marketValue: value / 1_000_000, age } as Parameters<typeof playerRating>[0]);
    expect(view.getByLabelText(`Overall for ${name}`)).toHaveTextContent(`${overall} OVR`);
  });

  it('never requests the archive for a draw without Paraguay', async () => {
    const { view } = await setup(-1);
    expect(view.getByText(/^Name a player from Argentina/)).toBeInTheDocument();
    expect(H.archiveRead).not.toHaveBeenCalled();
  });

  it('fetches once when a respin first adds Paraguay and reuses it on replay', async () => {
    const { view } = await setup(11);
    expect(view.getByText(/^Name a player from Argentina/)).toBeInTheDocument();
    expect(H.archiveRead).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('button', { name: /Respin nation/ }));
    expect(view.getByText(/^Name a player from Paraguay/)).toBeInTheDocument();
    await waitFor(() => expect(H.archiveRead).toHaveBeenCalledTimes(1));
    fireEvent.click(view.getByRole('button', { name: 'Give up' }));
    fireEvent.click(view.getByRole('button', { name: /Play again/ }));
    fireEvent.click(view.getByRole('button', { name: /Draw my 11 nations/ }));
    fireEvent.click(view.getByRole('button', { name: /Respin nation/ }));
    expect(view.getByText(/^Name a player from Paraguay/)).toBeInTheDocument();
    expect(H.archiveRead).toHaveBeenCalledTimes(1);
  });

  it('keeps current Paraguay picks available during a delayed or failed archive request', async () => {
    let settle: (value: unknown) => void = () => undefined;
    H.archiveRead.mockReturnValue(new Promise(resolve => { settle = resolve; }));
    const { view } = await setup(0);
    expect(currentSlot(view)).toEqual(['Paraguay', 'GK']);
    search(view, 'gustavo gomez');
    expect(view.getByRole('status')).toHaveTextContent('Checking more Paraguay players');
    search(view, 'Paraguay GK Fixture');
    expect(view.getByRole('button', { name: /Paraguay GK Fixture/ })).toBeEnabled();
    await act(async () => settle({ data: null, error: { message: 'Fixture unavailable' } }));
    search(view, 'gustavo gomez');
    expect(view.getByText(/Extra Paraguay records are unavailable/)).toBeInTheDocument();
    search(view, 'Paraguay GK Fixture');
    fireEvent.click(view.getByRole('button', { name: /Paraguay GK Fixture/ }));
    expect(view.getByText(/^Name a player from /)).not.toHaveTextContent('from Paraguay');
    expect(H.archiveRead).toHaveBeenCalledTimes(1);
  });
});
