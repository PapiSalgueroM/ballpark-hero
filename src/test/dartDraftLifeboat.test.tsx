import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { players } from '@/data/players';
import { GEO_COUNTRIES } from '@/data/worldMapGeo';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { fetchDartDraftPool, simulateSeries } from '@/lib/dartDraft';
import { academyProspect, countryChoices, DART_SLOTS, type MapHit, resolveMapThrow } from '@/lib/dartMap';
import DartDraft from '@/pages/DartDraft';

vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => {
    let targeted = false;
    const query = {
      select: () => query, eq: () => query, order: () => query, range: () => query,
      in: (column: string) => { targeted ||= column === 'position'; return query; },
      then: (resolve: (data: unknown) => unknown) => Promise.resolve({
        data: targeted ? [] : [{
          player_name: 'Khvicha Kvaratskhelia', position: 'Left Winger', age: 24, nationality: 'Georgia',
          club: 'Paris Saint-Germain', market_value_usd: 97_000_000, goals: 13, assists: 5,
        }],
        error: null,
      }).then(resolve),
    };
    return query;
  } },
}));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/lib/dartDraft', async original => {
  const actual = await original<typeof import('@/lib/dartDraft')>();
  return { ...actual, fetchDartDraftPool: vi.fn(), simulateSeries: vi.fn(actual.simulateSeries) };
});
vi.mock('@/lib/dartMap', async original => {
  const actual = await original<typeof import('@/lib/dartMap')>();
  return { ...actual, resolveMapThrow: vi.fn(), countryChoices: vi.fn(actual.countryChoices) };
});

const shark = { kind: 'zone', zone: { kind: 'shark', x: 12, y: 12, r: 12, label: 'SHARK', emoji: '🦈', bad: true } } satisfies MapHit;
const wildcard = { kind: 'zone', zone: { kind: 'wildcard', x: 12, y: 12, r: 12, label: 'WILDCARD', emoji: '🃏' } } satisfies MapHit;
const ocean = { kind: 'ocean' } satisfies MapHit;
const button = (name: string | RegExp) => screen.getByRole('button', { name });
async function throwDart(hit: MapHit) {
  vi.mocked(resolveMapThrow).mockReturnValueOnce(hit);
  fireEvent.click(button('LOCK LEFT-RIGHT'));
  fireEvent.click(button('THROW'));
  await act(async () => { vi.advanceTimersByTime(850); });
}
const pickSlot = () => fireEvent.click(screen.getAllByRole('button', { name: / throw$/ })[0]);
async function start() {
  render(<DartDraft />);
  fireEvent.click(button(/Current Stars/));
  await act(async () => {});
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  vi.mocked(fetchDartDraftPool).mockResolvedValue({ current: players, legends: [], stormFloor: 1 });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('spends the shared lifeboat on a Shark and keeps the rerolled card in the score', async () => {
  await start();
  pickSlot();
  await throwDart(shark);
  const original = button(/Shark Bait/);
  expect(original).toHaveTextContent('40');
  const lifeboat = button('Lifeboat re-throw');
  await act(async () => { fireEvent.click(lifeboat); fireEvent.click(original); });
  expect(screen.getByText(/GK.*Throw 1\/11/)).toBeVisible();
  expect(screen.queryByRole('button', { name: /Shark Bait/ })).toBeNull();
  await throwDart(wildcard);
  expect(screen.getByRole('heading', { name: /WILDCARD ZONE/ })).toBeVisible();
  const offer = within(screen.getByRole('group', { name: 'Draft offers' })).getAllByRole('button')[0];
  const kept = offer.querySelector('div.font-bold')!.textContent!;
  fireEvent.click(offer);
  expect(button(new RegExp(kept))).toBeDisabled();
  for (let index = 1; index < 11; index++) {
    pickSlot();
    await throwDart(ocean);
    expect(screen.queryByRole('button', { name: 'Lifeboat re-throw' })).toBeNull();
    fireEvent.click(button('Take the 40-rated trialist'));
  }
  const grade = screen.getByRole('heading', { name: /Grade.* XI/ });
  expect(grade).toBeVisible();
  expect(screen.getByText(kept, { exact: true })).toBeVisible();
  expect(screen.getByText('Accuracy', { exact: false })).toHaveTextContent('40');
  const total = screen.getByText('Total', { exact: false }).querySelector('b')?.textContent;
  expect(Number(total)).toBeGreaterThan(40);
  expect(vi.mocked(useGameCompletion).mock.lastCall).toEqual(['dart-draft', true, Number(total), 1]);
});

it('retains the original Shark trialist and leaves the single use for a later ocean throw', async () => {
  await start();
  pickSlot();
  await throwDart(shark);
  fireEvent.click(button(/Shark Bait/));
  expect(button(/Shark Bait/)).toBeDisabled();
  pickSlot();
  await throwDart(ocean);
  fireEvent.click(button('Lifeboat re-throw'));
  await throwDart(shark);
  expect(screen.queryByRole('button', { name: 'Lifeboat re-throw' })).toBeNull();
  expect(button(/Shark Bait/)).toBeVisible();
  expect(vi.mocked(useGameCompletion).mock.lastCall).toEqual(['dart-draft', false, 0, 0]);
});

it('quotes the Georgia right-back pick at its actual XI rating and keeps the settled grade and showdown', async () => {
  await start();
  const actual = await vi.importActual<typeof import('@/lib/dartMap')>('@/lib/dartMap');
  const georgia = GEO_COUNTRIES.find(country => country.iso === 'ge')!;
  fireEvent.click(button('RB throw'));
  await throwDart(actual.resolveMapThrow(georgia.cx, georgia.cy, actual.rollZones(actual.ROUND_VIEWS[0], 0, 13579)));
  const offer = button(/Khvicha Kvaratskhelia/);
  expect(offer).toHaveTextContent('OUT OF POSITION');
  expect.soft(within(offer).queryByText('81', { exact: true })).toBeInTheDocument();
  fireEvent.click(offer);
  expect.soft(within(button(/RB Khvicha Kvaratskhelia/)).queryByText('81', { exact: true })).toBeInTheDocument();
  expect(screen.getByText('XI', { exact: false, selector: 'span' })).toHaveTextContent('XI 81');

  const remaining = DART_SLOTS.filter(slot => slot.label !== 'RB');
  const countries = GEO_COUNTRIES.filter(country => country.iso !== 'ge').slice(0, remaining.length);
  for (const [index, slot] of remaining.entries()) {
    pickSlot();
    const country = countries[index];
    const filler = academyProspect(country, slot, index === 0 ? 80 : 88);
    vi.mocked(countryChoices).mockResolvedValueOnce([{ player: filler, outOfPosition: false }]);
    await throwDart({ kind: 'country', country });
    const selectFiller = button(new RegExp(filler.name));
    if (index < remaining.length - 1) {
      fireEvent.click(selectFiller);
      continue;
    }
    let seed = 1042;
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 4294967296;
    });
    try {
      fireEvent.click(selectFiller);
      expect(random).toHaveBeenCalledTimes(83);
    } finally {
      random.mockRestore();
    }
  }

  expect(screen.getByRole('heading', { name: /Grade D.*XI 54/ })).toBeVisible();
  expect.soft(screen.getByText('Khvicha Kvaratskhelia', { exact: true }).parentElement).toHaveTextContent('81');
  const rb = DART_SLOTS.findIndex(slot => slot.label === 'RB');
  const simPlayer = vi.mocked(simulateSeries).mock.calls[0][0][rb]!;
  expect(simPlayer).toMatchObject({ name: 'Khvicha Kvaratskhelia', marketValue: 32, position: 'LW', nationality: 'Georgia', league: 'Ligue 1' });
  expect(simPlayer.fixedOverall).toBeUndefined();
  const series = vi.mocked(simulateSeries).mock.results[0].value;
  expect(series.legs.map(({ userGoals, aiGoals }) => [userGoals, aiGoals])).toEqual([[0, 4], [0, 3], [1, 3]]);
  expect(series.legs[2].events).toContainEqual({
    minute: 77, text: 'Khvicha Kvaratskhelia curls one in from the edge of the box!', side: 'user',
  });
  expect(vi.mocked(useGameCompletion).mock.lastCall).toEqual(['dart-draft', true, 648, 11]);
});
