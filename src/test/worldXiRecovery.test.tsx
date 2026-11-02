import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FORMATIONS } from '@/lib/squadShape';
import { countryQualifies, fitsSlot, suggestCountryPlayers } from '@/lib/worldXi';
import type { WorldXiData, WxPlayer } from '@/lib/worldXi';
import { selectWorldXiNationPool } from '@/lib/worldXiNationPools';
import type { Position } from '@/types/game';

const H = vi.hoisted(() => ({ fetch: vi.fn(), record: vi.fn() }));
vi.mock('@/lib/worldXi', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/worldXi')>(), fetchWorldXiPool: H.fetch }));
vi.mock('@/lib/completions', () => ({ recordCompletion: H.record, getCurrentPlayerName: () => 'Fixture Recovery Tester' }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => { throw new Error('Unexpected database read in fictional recovery fixture'); } },
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

const KEEPER = 'AAA Fixture Keeper';
const STRIKER = 'AAB Fixture Striker';
const SHARED = 'Fixture Shared Name';
const CLASSIC = Array.from({ length: 12 }, (_, index) => 'Fixture Country ' + String(index + 1).padStart(2, '0'));
const POSITIONS: Position[] = ['GK', 'GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST', 'CF'];
type View = ReturnType<typeof render>;
function row(name: string, country: string, position: Position, club: string, value = 1_000): WxPlayer {
  return { name, country, position, club, value, age: 25 };
}
function fixture(noAlternative = false, countOnly = false): WorldXiData {
  const byCountry = new Map<string, WxPlayer[]>();
  for (const country of CLASSIC) byCountry.set(country, Array.from({ length: 6 }, (_, cohort) => POSITIONS.map((position, index) => row(
    noAlternative && (position === 'ST' || position === 'CF') ? SHARED : `Fixture ${country} ${position} ${cohort}-${index}`,
    country, position, `Fixture ${country} Club ${cohort}-${index}`, 20_000 - cohort * 100 - index,
  ))).flat());
  byCountry.set(KEEPER, [row(SHARED, KEEPER, 'GK', 'Fixture Keeper Club')]);
  byCountry.set(STRIKER, [row(SHARED, STRIKER, 'ST', 'Fixture Striker Club')]);
  if (countOnly) byCountry.set(KEEPER, [
    row(SHARED, KEEPER, 'GK', 'Fixture Keeper Club'),
    row(SHARED, KEEPER, 'GK', 'Fixture Other Keeper Club'),
    ...Array.from({ length: 12 }, (_, index) => row('Fixture Wrong Striker ' + index, KEEPER, 'ST', 'Fixture Wrong Club ' + index)),
  ]);
  return { players: [...byCountry.values()].flat(), byCountry, countries: [...CLASSIC] };
}
beforeEach(() => {
  H.fetch.mockReset(); H.record.mockReset();
  vi.spyOn(Math, 'random').mockReturnValue(.999999);
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ matches: query === '(prefers-reduced-motion: reduce)', media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: () => false }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
async function mount(pool: WorldXiData): Promise<View> {
  expect(pool.players.length, 'WX_RECOVERY_REAL_DTO_FLOOR').toBeGreaterThanOrEqual(800);
  expect(pool.countries).toHaveLength(12);
  expect(pool.countries.every(country => countryQualifies(pool.byCountry.get(country)!)), 'WX_RECOVERY_REAL_CLASSIC_DEPTH').toBe(true);
  H.fetch.mockResolvedValue(pool);
  const view = render(<MemoryRouter initialEntries={['/world-xi']}><WorldXi /></MemoryRouter>);
  await view.findByRole('button', { name: /Draw my 11 nations/ });
  return view;
}
function prompt(view: View) {
  const node = view.queryByText(/^Name a player from /);
  expect(node, 'WX_RECOVERY_REAL_PROMPT').not.toBeNull();
  const match = node!.textContent!.match(/^Name a player from (.+) who can play (\w+)\./);
  expect(match, 'WX_RECOVERY_REAL_SLOT').not.toBeNull();
  return { text: node!.textContent!, country: match![1], label: match![2] };
}
function pick(view: View, player: WxPlayer) {
  fireEvent.change(view.getByRole('textbox', { name: 'Name a player for this slot' }), { target: { value: player.name } });
  const buttons = [...new Set(view.queryAllByText(player.name, { exact: true }).map(node => node.closest('button'))
    .filter((button): button is HTMLButtonElement => !!button && !!button.textContent?.includes(player.club)))];
  expect(buttons, 'WX_RECOVERY_REAL_SUGGESTION').toHaveLength(1);
  fireEvent.click(buttons[0]);
}
function filled(view: View) {
  const matches = [...view.container.querySelectorAll('span')].filter(node => /^Filled \d+\/11$/.test(node.textContent!.replace(/\s+/g, ' ').trim()));
  expect(matches, 'WX_RECOVERY_REAL_FILLED_COUNTER').toHaveLength(1);
  return matches[0].textContent!.replace(/\s+/g, ' ').trim();
}
function board(view: View) {
  const pitch = view.container.querySelector('[style*="aspect-ratio"]');
  expect(pitch, 'WX_RECOVERY_REAL_PITCH').not.toBeNull();
  return { pitch: pitch!.innerHTML, prompt: prompt(view), filled: filled(view),
    step: view.getByText(/^Slot \d+ of 11/).textContent,
    timer: view.getByText(/^\d+s$/).textContent,
    paid: view.getByRole('button', { name: 'Respin nation (0 left)' }).textContent,
    query: (view.getByRole('textbox', { name: 'Name a player for this slot' }) as HTMLInputElement).value };
}
async function emptyStriker(noAlternative: boolean) {
  const pool = fixture(noAlternative);
  expect(pool.players).toHaveLength(938);
  const selected = selectWorldXiNationPool(pool, 'expanded');
  const view = await mount(pool);
  fireEvent.click(view.getByRole('button', { name: 'None' }));
  fireEvent.click(view.getByRole('button', { name: /^90 seconds/ }));
  vi.useFakeTimers();
  fireEvent.click(view.getByRole('button', { name: /Draw my 11 nations/ }));
  expect(prompt(view)).toMatchObject({ country: KEEPER, label: 'GK' });
  const chosen = [pool.byCountry.get(KEEPER)![0]];
  pick(view, chosen[0]);
  for (let step = 1; step <= 8; step += 1) {
    const current = prompt(view), slot = FORMATIONS[0].slots[step];
    expect(current).toMatchObject({ country: CLASSIC[step - 1], label: slot.label });
    const player = pool.byCountry.get(current.country)!.find(player => fitsSlot(player, slot) && !chosen.some(old => old.name === player.name));
    expect(player, 'WX_RECOVERY_INTERVENING_REAL_FIT').toBeDefined();
    pick(view, player!); chosen.push(player!);
  }
  expect(prompt(view)).toMatchObject({ country: STRIKER, label: 'ST' });
  expect(filled(view)).toBe('Filled 9/11');
  expect(fitsSlot(pool.byCountry.get(STRIKER)![0], FORMATIONS[0].slots[9])).toBe(true);
  expect(suggestCountryPlayers(selected, STRIKER, SHARED, new Set(chosen.map(player => player.name)))).toEqual([]);
  fireEvent.change(view.getByRole('textbox', { name: 'Name a player for this slot' }), { target: { value: SHARED } });
  expect(view.queryAllByText(SHARED, { exact: true })).toHaveLength(0);
  expect(view.getByRole('button', { name: 'Respin nation (0 left)' })).toBeDisabled();
  act(() => { vi.advanceTimersByTime(3000); });
  expect(view.queryByText('87s')).not.toBeNull();
  expect(H.record).not.toHaveBeenCalled();
  return { view, pool, chosen };
}

describe('World XI stored spelling and unused-answer recovery', () => {
  it('WX_CURACAO: includes the literal stored spelling without rewriting players or identities', () => {
    const players = Array.from({ length: 8 }, (_, index) => row('Fixture Curacao Player ' + index, 'Curacao', POSITIONS[index], 'Fixture Curacao Club ' + index));
    const data: WorldXiData = { players, countries: ['Curacao'], byCountry: new Map([['Curacao', players]]) };
    const before = JSON.stringify({ players: data.players, countries: data.countries, byCountry: [...data.byCountry] });
    for (const player of players) Object.freeze(player);
    Object.freeze(players); Object.freeze(data.countries);
    const selected = selectWorldXiNationPool(data, '2026');
    expect(selected.countries.includes('Curaçao'), 'WORLD_XI_CURACAO_ALIAS_MISSING').toBe(true);
    expect(selected.players).toBe(players);
    expect(selected.byCountry.get('Curaçao')).toEqual(players);
    selected.byCountry.get('Curaçao')!.forEach((player, index) => expect(player).toBe(players[index]));
    expect(players.every(player => player.country === 'Curacao')).toBe(true);
    expect(selectWorldXiNationPool({ ...data, byCountry: new Map([['Congo', players], ['North Korea', players]]) }, '2026').countries).toEqual([]);
    expect(JSON.stringify({ players: data.players, countries: data.countries, byCountry: [...data.byCountry] })).toBe(before);
  });

  it('WX_UNUSED_COUNT: counts distinct fitting unused names independently of query and its result limit', async () => {
    const pool = fixture(false, true), view = await mount(pool);
    fireEvent.click(view.getByRole('button', { name: 'None' }));
    fireEvent.click(view.getByRole('button', { name: /Draw my 11 nations/ }));
    expect(prompt(view)).toMatchObject({ country: KEEPER, label: 'GK' });
    expect(view.queryByText('1 unused player name fits this slot.'), 'WORLD_XI_UNUSED_COUNT_MISSING').not.toBeNull();
    expect(view.queryByRole('button', { name: 'Replace empty nation (free)' })).toBeNull();
    fireEvent.change(view.getByRole('textbox', { name: 'Name a player for this slot' }), { target: { value: 'Fixture Wrong Striker' } });
    expect(view.queryAllByText(/^Fixture Wrong Striker \d+$/)).toHaveLength(8);
    expect(view.queryByText('1 unused player name fits this slot.')).not.toBeNull();
    expect(H.record).not.toHaveBeenCalled();
  });

  it('WX_FREE_RECOVERY: replaces only an exhausted active nation with no paid respins left', async () => {
    const { view, pool, chosen } = await emptyStriker(false);
    const button = view.queryByRole('button', { name: 'Replace empty nation (free)' });
    expect(button, 'WORLD_XI_FREE_RECOVERY_MISSING').not.toBeNull();
    expect(view.queryByText('0 unused player names fit this slot.')).not.toBeNull();
    const before = board(view), pitch = view.container.querySelector('[style*="aspect-ratio"]')!;
    const slotsBefore = [...pitch.querySelectorAll(':scope > div[style]')].map(node => node.innerHTML);
    expect(slotsBefore).toHaveLength(11);
    fireEvent.click(button!);
    const current = prompt(view), after = board(view);
    expect(CLASSIC.slice(9), 'WX_RECOVERY_REAL_UNUSED_COUNTRY').toContain(current.country);
    expect(current.label).toBe('ST');
    expect(after.filled).toBe(before.filled); expect(after.step).toBe(before.step); expect(after.paid).toBe(before.paid); expect(after.timer).toBe(before.timer);
    expect(after.query).toBe('');
    const slotsAfter = [...pitch.querySelectorAll(':scope > div[style]')].map(node => node.innerHTML);
    expect(slotsAfter.filter((_, index) => index !== 9)).toEqual(slotsBefore.filter((_, index) => index !== 9));
    expect(view.queryByRole('button', { name: 'Replace empty nation (free)' })).toBeNull();
    const player = pool.byCountry.get(current.country)!.find(player => fitsSlot(player, FORMATIONS[0].slots[9]) && !chosen.some(old => old.name === player.name));
    expect(player).toBeDefined(); pick(view, player!); chosen.push(player!);
    expect(prompt(view)).toMatchObject({ country: CLASSIC[8], label: 'LW' });
    expect(filled(view)).toBe('Filled 10/11');
    act(() => { vi.advanceTimersByTime(1000); }); expect(view.queryByText('86s')).not.toBeNull();
    expect(H.record).not.toHaveBeenCalled();
    const last = pool.byCountry.get(CLASSIC[8])!.find(player => fitsSlot(player, FORMATIONS[0].slots[10]) && !chosen.some(old => old.name === player.name));
    expect(last).toBeDefined(); pick(view, last!); chosen.push(last!);
    expect(view.queryByText('World XI complete!')).not.toBeNull();
    expect(H.record.mock.calls).toEqual([['/world-xi', 11, 'Fixture Recovery Tester']]);
    const expectedCountries = [KEEPER, ...CLASSIC.slice(0, 8), current.country, CLASSIC[8]];
    const resultRows = chosen.map((player, index) => {
      const resultRow = view.getByText(player.name, { exact: true }).parentElement!.parentElement!;
      expect(resultRow.children[0].textContent).toBe(FORMATIONS[0].slots[index].label);
      expect(resultRow.children[1].textContent, 'WX_RECOVERY_ALL_OTHER_ASSIGNED_COUNTRIES_HELD').toBe(expectedCountries[index]);
      expect(resultRow.children[2].children[0].textContent).toBe(player.name);
      expect(resultRow.children[2].children[1].textContent).toBe(player.club);
      return resultRow;
    });
    expect(new Set(resultRows).size).toBe(11);
  });

  it('WX_NO_ALTERNATIVE: explains a fully exhausted pool while holding squad budget and timer', async () => {
    const { view } = await emptyStriker(true);
    const button = view.queryByRole('button', { name: 'Replace empty nation (free)' });
    expect(button, 'WORLD_XI_EMPTY_REFUSAL_MISSING').not.toBeNull();
    const before = board(view); fireEvent.click(button!);
    expect(view.queryByText('No unused nation has a fitting player left. Your squad stays as it is.')).not.toBeNull();
    expect(board(view)).toEqual(before);
    expect(H.record).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1000); }); expect(view.queryByText('86s')).not.toBeNull();
  });

  it('WX_FOCUS: actual input focus prevents page movement after draw and the next pick', async () => {
    const pool = fixture(), view = await mount(pool), focus = vi.spyOn(HTMLElement.prototype, 'focus');
    fireEvent.click(view.getByRole('button', { name: /Draw my 11 nations/ }));
    const input = view.getByRole('textbox', { name: 'Name a player for this slot' });
    const check = () => {
      const calls = focus.mock.calls.filter((_, index) => focus.mock.contexts[index] === input);
      expect(calls.length > 0, 'WX_RECOVERY_ACTUAL_INPUT_FOCUS_FOUNDATION').toBe(true);
      expect(document.activeElement, 'WX_RECOVERY_NATIVE_ACTIVE_INPUT_FOUNDATION').toBe(input);
      expect(calls[calls.length - 1], 'WORLD_XI_FOCUS_OPTIONS_MISSING').toEqual([{ preventScroll: true }]);
    };
    check(); focus.mockClear(); pick(view, pool.byCountry.get(KEEPER)![0]); check();
    expect(H.record).not.toHaveBeenCalled();
  });
});
