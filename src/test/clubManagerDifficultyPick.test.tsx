/**
 * Round 1501: the level, through the screens and the real hook.
 *
 * The Dugout step's Career options card offers three levels with Normal pressed, and both of its
 * buttons hand the choice on as the third argument (absent when Normal and No sacking off, so such a
 * career is exactly the one startCareer made). The Options panel shows the level read only. Through the
 * hook: a career started on Legend carries the key from day one, opens on the smaller cheque and wage
 * ceiling, and lists the market at the marked price; one started on Normal carries nothing.
 * Round 1512: five levels (Very Easy, Easy, Medium, Hard, Impossible; the saved ids of Medium and
 * Impossible are still 'normal' and 'legend'), and Options changes the level between matches, with a
 * second tap before a change that stops the leaderboards.
 * scripts/simCmDifficulty.mjs holds the engine side with negative controls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, fireEvent, screen, waitFor, act } from '@testing-library/react';
import { CM_ROSTERS, CM_PARTIAL } from '@/data/clubManagerRosters';
import { loadCareer, marketForScreen, startCareer } from '@/lib/clubManager';
import { easyFrom, levelFrom, noSackFrom } from '@/lib/clubManagerStart';
import { recordActivity } from '@/lib/completions';
import { CM_DIFFICULTY_DIALS } from '@/lib/clubManagerDifficulty';
import { ManagerForm } from '@/components/club-manager/ManagerForm';
import { DifficultyOption, StartOptionsScreen } from '@/components/club-manager/StartOptionsScreen';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
}));

const { useClubManager } = await import('@/hooks/useClubManager');

const CLUB: string = Object.keys(CM_ROSTERS).find(k => !CM_PARTIAL.includes(k)) ?? Object.keys(CM_ROSTERS)[0];

beforeEach(() => { localStorage.clear(); });

describe('the Dugout step', () => {
  it('offers five levels with Medium pressed, and Skip on Medium hands nothing on', () => {
    const onConfirm = vi.fn();
    render(<ManagerForm clubName="Test FC" defaultNation="England" onBack={() => {}} onConfirm={onConfirm} />);
    const tiles = screen.getAllByRole('radio');
    /* Round 1512: five levels, easiest first; Medium is the old Normal and Impossible the old Legend. */
    expect(tiles.map(t => t.textContent)).toEqual(['Very Easy', 'Easy', 'Medium', 'Hard', 'Impossible']);
    expect(tiles.map(t => t.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true', 'false', 'false']);
    for (const t of tiles) expect(t.className).toContain('min-h-[44px]');
    fireEvent.click(screen.getByText('Skip: just manage'));
    expect(onConfirm).toHaveBeenCalledWith(null, undefined, undefined);
  });

  it('Impossible and No sacking ride on both buttons', () => {
    const onConfirm = vi.fn();
    render(<ManagerForm clubName="Test FC" defaultNation="England" onBack={() => {}} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Impossible'));
    expect(screen.getByText('Impossible').getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByText('Skip: just manage'));
    expect(onConfirm).toHaveBeenLastCalledWith(null, undefined, { level: 'legend' });
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByText('Skip: just manage'));
    expect(onConfirm).toHaveBeenLastCalledWith(null, undefined, { level: 'legend', noSack: true });
    fireEvent.change(screen.getByLabelText('Manager name'), { target: { value: 'Sam Calloway' } });
    fireEvent.click(screen.getByText('Take the job'));
    expect(onConfirm).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Sam Calloway' }), undefined, { level: 'legend', noSack: true });
    fireEvent.click(screen.getByText('Medium'));
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByText('Skip: just manage'));
    expect(onConfirm).toHaveBeenLastCalledWith(null, undefined, undefined);
  });

  it('Easy and Very Easy say plainly that the career posts no leaderboard scores', () => {
    const onConfirm = vi.fn();
    render(<ManagerForm clubName="Test FC" defaultNation="England" onBack={() => {}} onConfirm={onConfirm} />);
    const shown = () => Array.from(document.querySelectorAll('[data-cm-level-blurb] p')).find(p => p.getAttribute('aria-hidden') !== 'true')?.textContent ?? '';
    expect(shown()).toContain('change it any time in Options');
    fireEvent.click(screen.getByText('Very Easy'));
    expect(shown()).toContain('no leaderboard scores');
    fireEvent.click(screen.getByText('Skip: just manage'));
    expect(onConfirm).toHaveBeenLastCalledWith(null, undefined, { level: 'veryeasy' });
  });
});

describe('the Options panel', () => {
  const noop = () => {};
  const at = (difficulty?: string, easySince?: number) => ({
    ...startCareer('Arsenal'),
    startOptions: { v: 1, currency: 'GBP', nationJobs: true, strictness: 3, ...(difficulty ? { difficulty } : {}), ...(easySince ? { easySince } : {}) },
  } as ReturnType<typeof startCareer>);
  const tile = (id: string) => document.querySelector(`[data-cm-level-choice="${id}"]`) as HTMLElement;

  it('shows the five levels with the current one pressed, says when a change counts, and Hard is one tap', () => {
    const onDifficulty = vi.fn();
    render(<StartOptionsScreen career={at('hard')} onCurrency={noop} onNationJobs={noop} onStrictness={noop} onNoSack={vi.fn()} onDifficulty={onDifficulty} />);
    const card = document.querySelector('[data-cm-level-option]');
    expect(card?.getAttribute('data-cm-level-option')).toBe('hard');
    const tiles = Array.from(card!.querySelectorAll('[data-cm-level-choice]'));
    expect(tiles.map(t => t.textContent)).toEqual(['Very Easy', 'Easy', 'Medium', 'Hard', 'Impossible']);
    expect(tiles.map(t => t.getAttribute('aria-checked'))).toEqual(['false', 'false', 'false', 'true', 'false']);
    expect(card?.textContent).toContain('counts from your next match');
    expect(card?.textContent).toContain('nothing you have already played changes');
    fireEvent.click(tile('hard'));
    expect(onDifficulty).not.toHaveBeenCalled();
    fireEvent.click(tile('legend'));
    expect(onDifficulty).toHaveBeenLastCalledWith('legend');
    fireEvent.click(tile('normal'));
    expect(onDifficulty).toHaveBeenLastCalledWith('normal');
  });

  it('going easy on a career that still posts scores asks for a second tap first', () => {
    const onDifficulty = vi.fn();
    render(<StartOptionsScreen career={at()} onCurrency={noop} onNationJobs={noop} onStrictness={noop} onNoSack={vi.fn()} onDifficulty={onDifficulty} />);
    expect(document.querySelector('[data-cm-level-scores]')?.getAttribute('data-cm-level-scores')).toBe('on');
    fireEvent.click(tile('easy'));
    expect(onDifficulty).not.toHaveBeenCalled();
    expect(tile('easy').getAttribute('data-cm-level-armed')).toBe('yes');
    fireEvent.click(tile('veryeasy'));
    expect(onDifficulty).not.toHaveBeenCalled();
    fireEvent.click(tile('veryeasy'));
    expect(onDifficulty).toHaveBeenLastCalledWith('veryeasy');
  });

  it('a career that already went easy changes in one tap and says it posts no scores', () => {
    const onDifficulty = vi.fn();
    render(<StartOptionsScreen career={at('legend', 2)} onCurrency={noop} onNationJobs={noop} onStrictness={noop} onNoSack={vi.fn()} onDifficulty={onDifficulty} />);
    const line = document.querySelector('[data-cm-level-scores]');
    expect(line?.getAttribute('data-cm-level-scores')).toBe('off');
    expect(line?.textContent).toContain('season 2');
    fireEvent.click(tile('easy'));
    expect(onDifficulty).toHaveBeenLastCalledWith('easy');
  });

  /* Review of 2026-10-19: the sacked screen has no Options tile, so it renders this row on its own. */
  it('the row on its own, for a sacked manager, changes the level in one tap', () => {
    const onDifficulty = vi.fn();
    render(<DifficultyOption career={{ ...at('legend'), sacked: true }} onDifficulty={onDifficulty} />);
    expect(document.querySelector('[data-cm-level-option]')?.getAttribute('data-cm-level-option')).toBe('legend');
    fireEvent.click(tile('hard'));
    expect(onDifficulty).toHaveBeenLastCalledWith('hard');
  });

  /* Review of 2026-10-19: setDifficulty refuses while a match is paused, so the tiles must not look live. */
  it('with a match paused at halftime the tiles are off and the row says why', () => {
    const onDifficulty = vi.fn();
    const live = { ...at(), live: {} } as unknown as ReturnType<typeof at>;
    render(<DifficultyOption career={live} onDifficulty={onDifficulty} />);
    expect((tile('hard') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(tile('hard'));
    expect(onDifficulty).not.toHaveBeenCalled();
    expect(document.querySelector('[data-cm-level-paused]')?.textContent).toContain('finish it first');
  });

  /* Review of 2026-10-19: No sacking posts no score at any level, and the row must not say Medium does. */
  it('on a No sacking career the scores line says none post, at any level', () => {
    const career = { ...at(), startOptions: { ...at().startOptions, noSack: 1 } } as ReturnType<typeof at>;
    render(<DifficultyOption career={career} onDifficulty={vi.fn()} />);
    const line = document.querySelector('[data-cm-level-scores]');
    expect(line?.getAttribute('data-cm-level-scores')).toBe('off');
    expect(line?.textContent).toContain('No sacking is on');
    expect(line?.textContent).not.toContain('Impossible post leaderboard scores');
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

  it('Round 1512: a career started on Easy pings no score, and a change mid career moves only the level and is saved', async () => {
    const r = renderHook(() => useClubManager());
    await waitFor(() => expect(r.result.current.phase).toBe('clubSelect'));
    act(() => r.result.current.chooseClub(CLUB));
    act(() => r.result.current.confirmClub(undefined, undefined, undefined, null, { level: 'easy' }));
    expect(levelFrom(r.result.current.career)).toBe('easy');
    expect(easyFrom(r.result.current.career)).toBe(r.result.current.career.season);
    for (let i = 0; i < 12 && r.result.current.phase !== 'matchResult'; i += 1) {
      const s = r.result.current;
      if (s.phase === 'halftime') act(() => s.secondHalf());
      else act(() => s.quickPlay());
    }
    expect(r.result.current.phase).toBe('matchResult');
    expect(vi.mocked(recordActivity)).toHaveBeenCalledWith('/club-manager');
    expect(vi.mocked(recordActivity).mock.calls.every(c => c.length === 1)).toBe(true);
    const before = r.result.current.career;
    act(() => r.result.current.setDifficulty('legend'));
    const after = r.result.current.career;
    expect(levelFrom(after)).toBe('legend');
    expect(easyFrom(after)).toBe(easyFrom(before));
    expect(JSON.stringify({ ...after, startOptions: null })).toBe(JSON.stringify({ ...before, startOptions: null }));
    const { difficulty: _a, ...restAfter } = after.startOptions as unknown as Record<string, unknown>;
    const { difficulty: _b, ...restBefore } = before.startOptions as unknown as Record<string, unknown>;
    expect(restAfter).toEqual(restBefore);
    /* The same level again changes nothing, not even the object. */
    act(() => r.result.current.setDifficulty('legend'));
    expect(r.result.current.career).toBe(after);
    const saved = loadCareer();
    expect(saved && levelFrom(saved)).toBe('legend');
    expect(saved && easyFrom(saved)).toBe(easyFrom(before));
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
