import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { players } from '@/data/players';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { fetchDartDraftPool } from '@/lib/dartDraft';
import { type MapHit, resolveMapThrow } from '@/lib/dartMap';
import DartDraft from '@/pages/DartDraft';

vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/lib/dartDraft', async original => ({
  ...await original<typeof import('@/lib/dartDraft')>(), fetchDartDraftPool: vi.fn(),
}));
vi.mock('@/lib/dartMap', async original => ({
  ...await original<typeof import('@/lib/dartMap')>(), resolveMapThrow: vi.fn(),
}));

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
