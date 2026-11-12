import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WC2026_GROUPS } from '@/data/wc2026Results';
import { FORMATIONS } from '@/lib/squadShape';
import { countryQualifies, displayCountry, fitsSlot } from '@/lib/worldXi';
import type { WorldXiData, WxPlayer } from '@/lib/worldXi';

const H = vi.hoisted(() => ({
  fetch: vi.fn(),
  record: vi.fn(),
  share: vi.fn(),
}));

// Existing fetch transport and unrelated chrome only. The page, country draw,
// respin, suggestions, position rules and reduced-motion SlotReel remain real.
vi.mock('@/lib/worldXi', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/worldXi')>();
  return { ...actual, fetchWorldXiPool: H.fetch };
});
vi.mock('@/lib/completions', () => ({
  recordCompletion: H.record,
  getCurrentPlayerName: () => 'Fixture Nations Tester',
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => { throw new Error('Unexpected database read in the fictional nation-pool fixture'); } },
  SUPABASE_URL: 'http://stub',
  SUPABASE_PUBLISHABLE_KEY: 'stub',
}));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({
  default: (props: Record<string, unknown>) => { H.share(props); return null; },
}));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));

import WorldXi from '@/pages/WorldXi';

const SPARSE = 'AAA Fixture Keeper';
const OUTSIDE = 'AAA Fixture Outside';
const POSITIONS = ['GK', 'GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST', 'CF'] as const;
const CLASSIC = Array.from({ length: 12 }, (_, i) => `Fixture Country ${String(i + 1).padStart(2, '0')}`);

// Country labels come from the existing field, not a new participant list.
// These page flows omit spelling-alias cases; those need separate pure-helper tests.
function directFieldNames(): string[] {
  return WC2026_GROUPS.flatMap(group => group.teams)
    .filter(name => !['USA', 'South Korea', 'Bosnia & Herzegovina', 'Czech Republic', 'DR Congo', 'Turkey'].includes(name))
    .slice(0, 12);
}

function fictionalPlayers(country: string, keeperOnly = false): WxPlayer[] {
  // Six fictional cohorts keep the supplied DTO above the real 800-player floor.
  const positions = keeperOnly ? ['GK'] as const : Array.from({ length: 6 }, () => POSITIONS).flat();
  return positions.map((position, i) => ({
    name: `Fixture ${country} ${position} Player ${i + 1}`,
    country,
    position,
    club: `Fixture Club ${country} ${i + 1}`,
    value: 20_000_000 - i * 1_000,
    age: 25,
  }));
}

function sparsePool(): WorldXiData {
  const byCountry = new Map<string, WxPlayer[]>([
    [SPARSE, fictionalPlayers(SPARSE, true)],
    ...CLASSIC.map(country => [country, fictionalPlayers(country)] as [string, WxPlayer[]]),
  ]);
  return { players: [...byCountry.values()].flat(), byCountry, countries: [...CLASSIC] };
}

function tournamentPool(): WorldXiData {
  const countries = [OUTSIDE, ...directFieldNames()];
  const byCountry = new Map(countries.map(country => [country, fictionalPlayers(country)]));
  return { players: [...byCountry.values()].flat(), byCountry, countries };
}

beforeEach(() => {
  H.fetch.mockReset();
  H.record.mockReset();
  H.share.mockReset();
  // Identity shuffles make the keeper-only country the first revealed slot.
  // The existing hardest-first draw still assigns all ten outfield slots first.
  vi.spyOn(Math, 'random').mockReturnValue(0.999999);
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: () => false,
  }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

type View = ReturnType<typeof render>;

async function mount(pool: WorldXiData): Promise<View> {
  H.fetch.mockResolvedValue(pool);
  const view = render(<MemoryRouter initialEntries={['/world-xi']}><WorldXi /></MemoryRouter>);
  await view.findByRole('button', { name: /Draw my 11 nations/ });
  return view;
}

function nationCount(view: View): number {
  const line = view.queryByText(/^\d+ nations are in the draw\./);
  expect(line !== null, 'WORLD_XI_COUNT_FOUNDATION: the existing setup nation count must be present').toBe(true);
  return Number(line!.textContent!.match(/^\d+/)![0]);
}

function prompt(view: View): { country: string; label: string } {
  const node = view.queryByText(/^Name a player from /);
  expect(node !== null, 'WORLD_XI_DRAW_FOUNDATION: the real draw must reach a nation and slot').toBe(true);
  const match = node!.textContent!.match(/^Name a player from (.+) who can play (\w+)\./);
  expect(match !== null, 'WORLD_XI_PROMPT_FOUNDATION: the real page must expose its current slot').toBe(true);
  return { country: match![1], label: match![2] };
}

function finish(view: View, pool: WorldXiData, allowed?: Set<string>): WxPlayer[] {
  const selected: WxPlayer[] = [];
  for (let step = 0; step < 11; step++) {
    const current = prompt(view);
    if (allowed) expect(allowed.has(current.country), 'WORLD_XI_2026_DRAW: every actual drawn nation must remain in the selected field').toBe(true);
    const slot = FORMATIONS[0].slots.find(item => item.label === current.label);
    expect(slot !== undefined, 'WORLD_XI_SLOT_FOUNDATION: use the actual default formation slot').toBe(true);
    const player = pool.players.find(item =>
      displayCountry(item.country) === current.country &&
      !selected.some(picked => picked.name === item.name) &&
      fitsSlot(item, slot!));
    expect(player !== undefined, 'WORLD_XI_PLAYER_FOUNDATION: a real position-rule witness must fill this fictional slot').toBe(true);
    fireEvent.change(view.getByRole('textbox', { name: 'Name a player for this slot' }), { target: { value: player!.name } });
    const choices = [...new Set(view.queryAllByText(player!.name, { exact: true })
      .map(node => node.closest('button'))
      .filter((button): button is HTMLButtonElement => button !== null))];
    expect(choices.length, 'WORLD_XI_SUGGESTION_FOUNDATION: choose the real matching suggestion').toBe(1);
    fireEvent.click(choices[0]);
    selected.push(player!);
  }
  expect(view.queryByText('World XI complete!') !== null, 'WORLD_XI_COMPLETE: the real page must complete all eleven picks').toBe(true);
  expect(new Set(selected.map(player => player.country)).size, 'WORLD_XI_DISTINCT: the actual completed draw needs eleven distinct nations').toBe(11);
  return selected;
}

function lastShare(): { gamePath: string; score: string; emojiGrid: string } {
  const props = H.share.mock.calls.at(-1)?.[0];
  expect(props !== undefined, 'WORLD_XI_SHARE_FOUNDATION: the actual result must supply its share props').toBe(true);
  return props;
}

describe('World XI nation pools on the real page', () => {
  it('expands the default deck and completes a real draw with a goalkeeper-only nation', async () => {
    const pool = sparsePool();
    expect(pool.countries.length, 'fixture keeps the real boot minimum of twelve strict countries').toBe(12);
    expect(pool.players.length, 'fixture also exceeds the real 800-player pool floor').toBeGreaterThanOrEqual(800);
    expect(pool.countries.every(country => countryQualifies(pool.byCountry.get(country)!)), 'fixture strict countries satisfy the existing real depth rule').toBe(true);
    expect(countryQualifies(pool.byCountry.get(SPARSE)!), 'fixture sparse country deliberately fails the existing whole-squad depth rule').toBe(false);
    const view = await mount(pool);
    expect(nationCount(view), 'WORLD_XI_EXPANDED_DEFAULT: the actual default deck must include the goalkeeper-only nation').toBe(13);
    fireEvent.click(view.getByRole('button', { name: /Draw my 11 nations/ }));
    expect(prompt(view), 'WORLD_XI_SPARSE_GK: the actual hardest-first draw must assign the sole-position nation to goal').toEqual({ country: SPARSE, label: 'GK' });
    const selected = finish(view, pool);
    expect(selected.filter(player => player.country === SPARSE).map(player => player.position), 'WORLD_XI_SPARSE_PICK: the completed XI must include its actual goalkeeper witness').toEqual(['GK']);
    expect(H.record.mock.calls, 'WORLD_XI_COMPLETION: preserve the existing once-only completion contract').toEqual([['/world-xi', 11, 'Fixture Nations Tester']]);
    const share = lastShare();
    expect(share.gamePath).toBe('/world-xi');
    expect(share.score).toBe('11/11');
    expect(share.emojiGrid, 'WORLD_XI_EXPANDED_SHARE: the result must identify the selected nation pool').toContain('Expanded');
  });

  it('keeps the 2026 nation pool through respin, result, share and replay', async () => {
    const fieldNames = directFieldNames();
    expect(new Set(fieldNames).size, 'fixture uses twelve distinct existing field identifiers').toBe(12);
    const field = new Set(fieldNames.map(displayCountry));
    expect(field.has(OUTSIDE), 'fixture outside nation must not occur in the existing field').toBe(false);
    const pool = tournamentPool();
    expect(pool.countries.every(country => countryQualifies(pool.byCountry.get(country)!)), 'fixture starts with thirteen strict-qualified country buckets').toBe(true);
    const view = await mount(pool);
    const selectors = view.queryAllByRole('button', { name: /^2026 Nations/ });
    expect(selectors.length, 'WORLD_XI_2026_MODE: the actual setup needs the tournament-nation selector').toBe(1);
    fireEvent.click(selectors[0]);
    expect(selectors[0]).toHaveAttribute('aria-pressed', 'true');
    expect(nationCount(view), 'WORLD_XI_2026_POOL: count only the loaded participating nations').toBe(12);
    fireEvent.click(view.getByRole('button', { name: /Draw my 11 nations/ }));
    const before = prompt(view);
    expect(field.has(before.country), 'WORLD_XI_2026_INITIAL: the actual first draw must exclude the outside nation').toBe(true);
    fireEvent.click(view.getByRole('button', { name: /^Respin nation \(3 left\)$/ }));
    const after = prompt(view);
    expect(after.label).toBe(before.label);
    expect(after.country, 'WORLD_XI_2026_RESPIN_CHANGED: the actual spare in-field nation must replace the current draw').not.toBe(before.country);
    expect(field.has(after.country), 'WORLD_XI_2026_RESPIN: a respin must stay in the selected field').toBe(true);
    expect(view.queryByRole('button', { name: /^Respin nation \(2 left\)$/ }) !== null).toBe(true);
    finish(view, pool, field);
    expect(H.record.mock.calls, 'WORLD_XI_2026_COMPLETION: preserve the original score and once-only recording').toEqual([['/world-xi', 11, 'Fixture Nations Tester']]);
    const share = lastShare();
    expect(share.gamePath).toBe('/world-xi');
    expect(share.score).toBe('11/11');
    expect(share.emojiGrid, 'WORLD_XI_2026_SHARE: actual result/share text must identify 2026 Nations').toContain('2026 Nations');
    fireEvent.click(view.getByRole('button', { name: /Play again/ }));
    expect(nationCount(view), 'WORLD_XI_2026_REPLAY: returning to setup must retain the selected field').toBe(12);
    expect(view.getByRole('button', { name: /^2026 Nations/ })).toHaveAttribute('aria-pressed', 'true');
    expect(H.record).toHaveBeenCalledTimes(1);
    fireEvent.click(view.getByRole('button', { name: /Draw my 11 nations/ }));
    expect(field.has(prompt(view).country), 'WORLD_XI_2026_RESTART: the next real draw must still use the selected field').toBe(true);
  });
});
