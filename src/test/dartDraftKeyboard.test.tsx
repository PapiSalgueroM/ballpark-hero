import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DartDraft from '@/pages/DartDraft';

const fixture = vi.hoisted(() => {
  const player = { id: 'fixture-gk', name: 'Fixture Keeper', nationality: 'England', club: 'Fixture Club', position: 'GK', marketValue: 10 };
  return {
    player,
    openHelp: vi.fn(),
    resolveThrow: vi.fn(() => ({ kind: 'country', country: { name: 'England', iso: 'GB' } })),
  };
});

vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({
  GameHelp: () => <button onClick={fixture.openHelp}>Help</button>,
}));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => null }));
vi.mock('@/lib/dartDraft', () => ({
  fetchDartDraftPool: async () => ({ current: [fixture.player], stormFloor: 0 }),
  dartPlayerRating: () => 80,
  squadRating: () => 80,
}));
vi.mock('@/lib/squadDeal', () => ({ LEGENDS: [], WC2026_NATIONS: new Set(), playerRating: () => 80 }));
vi.mock('@/data/worldMapGeo', () => ({ GEO_COUNTRIES: [], WORLD_H: 100, WORLD_W: 100 }));
vi.mock('@/lib/dartMap', () => ({
  DART_SLOTS: [{ label: 'GK', x: 10, y: 20 }, { label: 'CB', x: 30, y: 40 }],
  MAP_TOPICS: [{ id: 'current', label: 'Current', desc: 'Fixture' }],
  ROUND_VIEWS: ['world'],
  VIEW_LABEL: { world: 'World' },
  viewBoxOf: () => ({ x: 0, y: 0, w: 100, h: 100 }),
  rollZones: () => [],
  resolveMapThrow: fixture.resolveThrow,
  accuracyPoints: () => 40,
  countryChoices: async () => [{ player: fixture.player, outOfPosition: false }],
  dbNamesFor: () => ['England'],
}));

const button = (name: RegExp | string) => screen.getByRole<HTMLButtonElement>('button', { name });
const space = { code: 'Space', key: ' ' };

function pressSpace(target: HTMLElement) {
  if (target instanceof HTMLButtonElement) target.focus();
  expect(document.activeElement).toBe(target);
  const allowed = fireEvent.keyDown(target, space);
  fireEvent.keyUp(target, space);
  // jsdom dispatches the events but does not perform native button activation.
  if (allowed && target instanceof HTMLButtonElement) fireEvent.click(target);
  return allowed;
}

async function enterSquad() {
  await act(async () => { fireEvent.click(button(/Current/)); });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Dart Draft Space ownership', () => {
  it('allows Space to start a mode and choose a position', async () => {
    render(<DartDraft />);
    await act(async () => { expect(pressSpace(button(/Current/))).toBe(true); });
    expect(pressSpace(button(/GK/))).toBe(true);
    expect(button('LOCK LEFT-RIGHT')).toBeDefined();
  });

  it('uses fresh body Space for each axis and holds the second axis on repeat', async () => {
    render(<DartDraft />);
    await enterSquad();
    fireEvent.click(button(/GK/));

    expect(pressSpace(document.body)).toBe(false);
    expect(button('THROW')).toBeDefined();
    expect(fireEvent.keyDown(document.body, { ...space, repeat: true })).toBe(false);
    expect(fixture.resolveThrow).toHaveBeenCalledTimes(0);
    expect(pressSpace(document.body)).toBe(false);
    expect(fixture.resolveThrow).toHaveBeenCalledTimes(1);
    expect(pressSpace(document.body)).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(850); });

    expect(pressSpace(button(/Fixture Keeper/))).toBe(true);
    expect(button(/Fixture Keeper/).disabled).toBe(true);
    expect(button(/CB/).disabled).toBe(false);
  });

  it('leaves focused Help and aiming buttons to their own activation', async () => {
    render(<DartDraft />);
    await enterSquad();
    fireEvent.click(button(/GK/));

    expect(pressSpace(button('Help'))).toBe(true);
    expect(fixture.openHelp).toHaveBeenCalledTimes(1);
    expect(pressSpace(button('LOCK LEFT-RIGHT'))).toBe(true);
    expect(pressSpace(button('THROW'))).toBe(true);
    expect(fixture.resolveThrow).toHaveBeenCalledTimes(1);
  });
});
