/**
 * Round 957: the Idle Arena trophy room on the real page. A save from before
 * the round opens, the room tile opens the room, a perk takes two taps, and
 * what the card then says is what the engine applied.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import IdleArena from '@/pages/IdleArena';
import { SAVE_KEY, newState, loadSave, NIGHT_SHIFT_RATE, OFFLINE_RATE } from '@/lib/idleArena';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'http://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture' }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn() }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => <nav>Fixture navigation</nav> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const EPOCH = 1767225600000;

function seed(trophies: number) {
  /* the shape a save had before the round: no perks field at all */
  const old: Record<string, unknown> = { ...newState(EPOCH), trophies, lastTick: EPOCH };
  delete old.perks;
  localStorage.setItem(SAVE_KEY, JSON.stringify(old));
}

function mount() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/idle-arena']}>
        <IdleArena />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Date, 'now').mockImplementation(() => EPOCH);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Idle Arena trophy room', () => {
  it('spends trophies on a perk in two taps, and the card shows what was applied', () => {
    seed(30);
    mount();
    expect(screen.getByText('30 trophies, +150%')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Trophy room/ }));
    const spend = screen.getAllByRole('button', { name: 'Spend 3 trophies' });
    expect(spend).toHaveLength(4);
    /* Night Shift is the second card */
    act(() => { fireEvent.click(spend[1]); });
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Spend 3, lose 15%' })); });
    expect(screen.getByText('27 trophies, +135%')).toBeTruthy();
    expect(screen.getByText(`Now: Time away runs at ${Math.round(NIGHT_SHIFT_RATE[1] * 100)}% speed, not ${Math.round(OFFLINE_RATE * 100)}%`)).toBeTruthy();
    expect(screen.getByText('level 1 of 3, for a night away')).toBeTruthy();
    /* the save the page writes on leaving carries the level, and loads back */
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(loadSave(localStorage.getItem(SAVE_KEY), EPOCH)?.perks).toEqual({ nightShift: 1 });
  });

  it('keeps the trophies when the second tap is declined', () => {
    seed(30);
    mount();
    fireEvent.click(screen.getByRole('button', { name: /Trophy room/ }));
    act(() => { fireEvent.click(screen.getAllByRole('button', { name: 'Spend 3 trophies' })[0]); });
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Keep them' })); });
    expect(screen.getByText('30 trophies, +150%')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Spend 3 trophies' })).toHaveLength(4);
  });

  it('cannot spend what the cabinet does not hold', () => {
    seed(2);
    mount();
    fireEvent.click(screen.getByRole('button', { name: /Trophy room/ }));
    const locked = screen.getAllByRole('button', { name: 'Needs 3 trophies, you hold 2' });
    expect(locked).toHaveLength(4);
    for (const b of locked) expect((b as HTMLButtonElement).disabled).toBe(true);
  });
});
