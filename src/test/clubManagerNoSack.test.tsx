/**
 * Round 1342: No sacking, through the screens and the real hook.
 *
 * The Dugout step's Career options card starts off, and both of its buttons
 * hand the switch on as the third argument (absent when it is off, so a
 * career started without it is exactly the one startCareer made). The Options
 * panel asks once and switches it on with the second tap, and never offers it
 * to a manager who is sacked or out of work. Through the hook: a career
 * started with it carries the key from season 1, its match pings carry no
 * score, and turnOnNoSack is one way.
 * scripts/simCmNoSack.mjs holds the engine side (the floors, the fleet, the
 * dailies) with negative controls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, fireEvent, screen, waitFor, act } from '@testing-library/react';
import { CM_ROSTERS, CM_PARTIAL } from '@/data/clubManagerRosters';
import { startCareer } from '@/lib/clubManager';
import { noSackFrom, turnOnNoSack } from '@/lib/clubManagerStart';
import { ManagerForm } from '@/components/club-manager/ManagerForm';
import { StartOptionsScreen } from '@/components/club-manager/StartOptionsScreen';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
}));
import { recordActivity } from '@/lib/completions';

const { useClubManager } = await import('@/hooks/useClubManager');

const CLUB: string = Object.keys(CM_ROSTERS).find(k => !CM_PARTIAL.includes(k)) ?? Object.keys(CM_ROSTERS)[0];

beforeEach(() => {
  localStorage.clear();
  vi.mocked(recordActivity).mockClear();
});

describe('the Dugout step', () => {
  it('starts with No sacking off and Skip hands nothing on', () => {
    const onConfirm = vi.fn();
    render(<ManagerForm clubName="Test FC" defaultNation="England" onBack={() => {}} onConfirm={onConfirm} />);
    expect(screen.getByText('⚙️ Career options')).toBeTruthy();
    const sw = screen.getByRole('switch');
    expect(sw.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(screen.getByText('Skip: just manage'));
    expect(onConfirm).toHaveBeenCalledWith(null, undefined, undefined);
  });

  it('the switch rides on both buttons', () => {
    const onConfirm = vi.fn();
    render(<ManagerForm clubName="Test FC" defaultNation="England" onBack={() => {}} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByText('Skip: just manage'));
    expect(onConfirm).toHaveBeenLastCalledWith(null, undefined, { noSack: true });
    fireEvent.change(screen.getByLabelText('Manager name'), { target: { value: 'Sam Calloway' } });
    fireEvent.click(screen.getByText('Take the job'));
    expect(onConfirm).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Sam Calloway' }), undefined, { noSack: true });
  });
});

describe('the Options panel', () => {
  const noop = () => {};
  it('asks once, then switches it on with the second tap', () => {
    const onNoSack = vi.fn();
    const career = startCareer('Arsenal');
    render(<StartOptionsScreen career={career} onCurrency={noop} onNationJobs={noop} onStrictness={noop} onNoSack={onNoSack} />);
    fireEvent.click(screen.getByText('Turn on No sacking'));
    expect(onNoSack).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Yes, turn it on for good'));
    expect(onNoSack).toHaveBeenCalledTimes(1);
  });

  it('shows it as on, with no way off', () => {
    const on = turnOnNoSack(startCareer('Arsenal'));
    expect(on).not.toBeNull();
    render(<StartOptionsScreen career={on!} onCurrency={noop} onNationJobs={noop} onStrictness={noop} onNoSack={vi.fn()} />);
    expect(screen.getByText(/On for this career/)).toBeTruthy();
    expect(screen.queryByText('Turn on No sacking')).toBeNull();
  });

  /* Review of 2026-10-16: every other check switched on in season 1, where a stale constant reads the same. */
  it('switched on in a later season, says which one', () => {
    const on = turnOnNoSack({ ...startCareer('Arsenal'), season: 3 });
    expect(on).not.toBeNull();
    expect(noSackFrom(on!)).toBe(3);
    render(<StartOptionsScreen career={on!} onCurrency={noop} onNationJobs={noop} onStrictness={noop} onNoSack={vi.fn()} />);
    expect(screen.getByText(/On since season 3/)).toBeTruthy();
    expect(screen.queryByText(/On for this career/)).toBeNull();
  });

  it('is not offered to a sacked manager', () => {
    const sacked = { ...startCareer('Arsenal'), sacked: true };
    render(<StartOptionsScreen career={sacked} onCurrency={noop} onNationJobs={noop} onStrictness={noop} onNoSack={vi.fn()} />);
    expect(screen.queryByText('Turn on No sacking')).toBeNull();
    expect(screen.getByText(/back in a job/)).toBeTruthy();
  });
});

describe('the hook', () => {
  it('a career started with No sacking carries it and pings no score', async () => {
    const r = renderHook(() => useClubManager());
    await waitFor(() => expect(r.result.current.phase).toBe('clubSelect'));
    act(() => r.result.current.chooseClub(CLUB));
    act(() => r.result.current.confirmClub(undefined, undefined, undefined, null, { noSack: true }));
    expect(r.result.current.phase).toBe('hub');
    expect(noSackFrom(r.result.current.career)).toBe(1);
    for (let i = 0; i < 12 && r.result.current.phase !== 'matchResult'; i += 1) {
      const s = r.result.current;
      if (s.phase === 'halftime') act(() => s.secondHalf());
      else act(() => s.quickPlay());
    }
    expect(r.result.current.phase).toBe('matchResult');
    expect(recordActivity).toHaveBeenCalledWith('/club-manager');
    expect(vi.mocked(recordActivity).mock.calls.every(c => c.length === 1)).toBe(true);
  });

  it('turnOnNoSack switches a running career on once', async () => {
    const r = renderHook(() => useClubManager());
    await waitFor(() => expect(r.result.current.phase).toBe('clubSelect'));
    act(() => r.result.current.chooseClub(CLUB));
    act(() => r.result.current.confirmClub());
    expect(noSackFrom(r.result.current.career)).toBeNull();
    act(() => r.result.current.turnOnNoSack());
    expect(noSackFrom(r.result.current.career)).toBe(r.result.current.career.season);
    const after = r.result.current.career;
    act(() => r.result.current.turnOnNoSack());
    expect(r.result.current.career).toBe(after);
  });
});
