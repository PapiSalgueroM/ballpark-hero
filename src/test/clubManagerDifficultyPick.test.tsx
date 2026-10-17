/**
 * Round 1501: the level, through the screens and the real hook.
 *
 * The Dugout step's Career options card offers three levels with Normal pressed, and both of its
 * buttons hand the choice on as the third argument (absent when Normal and No sacking off, so such a
 * career is exactly the one startCareer made). The Options panel shows the level read only. Through the
 * hook: a career started on Legend carries the key from day one, opens on the smaller cheque and wage
 * ceiling, and lists the market at the marked price; one started on Normal carries nothing.
 * scripts/simCmDifficulty.mjs holds the engine side with negative controls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, fireEvent, screen, waitFor, act } from '@testing-library/react';
import { CM_ROSTERS, CM_PARTIAL } from '@/data/clubManagerRosters';
import { marketForScreen, startCareer } from '@/lib/clubManager';
import { levelFrom, noSackFrom } from '@/lib/clubManagerStart';
import { CM_DIFFICULTY_DIALS } from '@/lib/clubManagerDifficulty';
import { ManagerForm } from '@/components/club-manager/ManagerForm';
import { StartOptionsScreen } from '@/components/club-manager/StartOptionsScreen';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
}));

const { useClubManager } = await import('@/hooks/useClubManager');

const CLUB: string = Object.keys(CM_ROSTERS).find(k => !CM_PARTIAL.includes(k)) ?? Object.keys(CM_ROSTERS)[0];

beforeEach(() => { localStorage.clear(); });

describe('the Dugout step', () => {
  it('offers three levels with Normal pressed, and Skip on Normal hands nothing on', () => {
    const onConfirm = vi.fn();
    render(<ManagerForm clubName="Test FC" defaultNation="England" onBack={() => {}} onConfirm={onConfirm} />);
    const tiles = screen.getAllByRole('radio');
    expect(tiles.map(t => t.textContent)).toEqual(['Normal', 'Hard', 'Legend']);
    expect(tiles.map(t => t.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
    for (const t of tiles) expect(t.className).toContain('min-h-[44px]');
    fireEvent.click(screen.getByText('Skip: just manage'));
    expect(onConfirm).toHaveBeenCalledWith(null, undefined, undefined);
  });

  it('Legend and No sacking ride on both buttons', () => {
    const onConfirm = vi.fn();
    render(<ManagerForm clubName="Test FC" defaultNation="England" onBack={() => {}} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Legend'));
    expect(screen.getByText('Legend').getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByText('Skip: just manage'));
    expect(onConfirm).toHaveBeenLastCalledWith(null, undefined, { level: 'legend' });
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByText('Skip: just manage'));
    expect(onConfirm).toHaveBeenLastCalledWith(null, undefined, { level: 'legend', noSack: true });
    fireEvent.change(screen.getByLabelText('Manager name'), { target: { value: 'Sam Calloway' } });
    fireEvent.click(screen.getByText('Take the job'));
    expect(onConfirm).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Sam Calloway' }), undefined, { level: 'legend', noSack: true });
    fireEvent.click(screen.getByText('Normal'));
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByText('Skip: just manage'));
    expect(onConfirm).toHaveBeenLastCalledWith(null, undefined, undefined);
  });
});

describe('the Options panel', () => {
  const noop = () => {};
  it('shows the level read only, with no way to change it', () => {
    const hard = { ...startCareer('Arsenal'), startOptions: { v: 1, currency: 'GBP', nationJobs: true, strictness: 3, difficulty: 'hard' } } as ReturnType<typeof startCareer>;
    render(<StartOptionsScreen career={hard} onCurrency={noop} onNationJobs={noop} onStrictness={noop} onNoSack={vi.fn()} />);
    const card = document.querySelector('[data-cm-level-option]');
    expect(card?.getAttribute('data-cm-level-option')).toBe('hard');
    expect(card?.textContent).toContain('Hard');
    expect(card?.textContent).toContain('Picked when this career began');
    expect(card?.querySelectorAll('button').length).toBe(0);
  });
});

describe('the hook', () => {
  it('a career started on Legend carries the key and the level from day one', async () => {
    const r = renderHook(() => useClubManager());
    await waitFor(() => expect(r.result.current.phase).toBe('clubSelect'));
    act(() => r.result.current.chooseClub(CLUB));
    act(() => r.result.current.confirmClub(undefined, undefined, undefined, null, { level: 'legend' }));
    expect(r.result.current.phase).toBe('hub');
    const c = r.result.current.career;
    expect(levelFrom(c)).toBe('legend');
    expect(noSackFrom(c)).toBeNull();
    const plain = startCareer(CLUB);
    expect(c.budget).toBe(Math.round(plain.budget * CM_DIFFICULTY_DIALS.legend.cheque * 10) / 10);
    const list = marketForScreen(c);
    const shown = r.result.current.market;
    expect(shown.length).toBe(list.length);
    expect(shown.every((mp, i) => mp.name === list[i].name && mp.price === Math.max(0.5, Math.round(list[i].price * CM_DIFFICULTY_DIALS.legend.mark * 10) / 10))).toBe(true);
  });

  it('a career started on Normal carries no key and lists the plain market', async () => {
    const r = renderHook(() => useClubManager());
    await waitFor(() => expect(r.result.current.phase).toBe('clubSelect'));
    act(() => r.result.current.chooseClub(CLUB));
    act(() => r.result.current.confirmClub(undefined, undefined, undefined, null, undefined));
    const c = r.result.current.career;
    expect(levelFrom(c)).toBe('normal');
    expect(c.startOptions === undefined || !('difficulty' in (c.startOptions as object))).toBe(true);
    expect(r.result.current.market).toEqual(marketForScreen(c));
  });
});
