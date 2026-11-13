import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recordCompletion } from '@/lib/completions';
import { useSoccerPerfectSeason } from '@/hooks/useSoccerPerfectSeason';
import { getStorageTrouble, settlePendingSaves } from '@/lib/safeStorage';
import { applySoccerAction, createSoccerRun, deriveSoccerRun, SOCCER_PS_VERSION } from '@/lib/soccerPerfectSeason';
import SoccerPerfectSeason from '@/pages/SoccerPerfectSeason';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn() }));
vi.mock('@/lib/dateUtils', () => ({ getTodayET: () => '2026-11-12' }));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/lib/safeStorage', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/safeStorage')>(),
  getStorageTrouble: vi.fn(() => null),
}));

const dailyKey = `dukb-soccer-perfect-season-${SOCCER_PS_VERSION}-daily`;
const unlimitedKey = `dukb-soccer-perfect-season-${SOCCER_PS_VERSION}-unlimited`;

function pickBestXI(game: { result: { current: ReturnType<typeof useSoccerPerfectSeason> } }) {
  while (game.result.current.view?.best) {
    const choice = game.result.current.view.best;
    act(() => game.result.current.choosePlayer(choice.playerId, choice.slot));
  }
}

function refuseWrites(saveKey: string, shouldRefuse: (run: { revealed: number; completionRecorded: boolean }) => boolean) {
  const setItem = Storage.prototype.setItem;
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    if (key === saveKey && shouldRefuse(JSON.parse(value))) {
      throw new DOMException('Storage full', 'QuotaExceededError');
    }
    setItem.call(this, key, value);
  });
}

describe('Soccer Perfect Season saves', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(getStorageTrouble).mockReturnValue(null);
  });
  afterEach(() => vi.restoreAllMocks());

  it('resumes both modes and records only the first live finish after restoring a partial season', () => {
    const first = renderHook(() => useSoccerPerfectSeason());
    act(() => first.result.current.startDaily());
    act(() => first.result.current.reroll());
    pickBestXI(first);
    act(() => first.result.current.revealNext());
    const daily = first.result.current.run;
    expect(first.result.current.view?.record.wins).toBe(1);

    act(() => first.result.current.startUnlimited());
    const unlimited = first.result.current.run;
    expect(unlimited?.seed).not.toBe(daily?.seed);
    first.unmount();

    const restored = renderHook(() => useSoccerPerfectSeason());
    act(() => restored.result.current.resumeUnlimited());
    expect(restored.result.current.run).toEqual(unlimited);
    act(() => restored.result.current.resumeDaily());
    expect(restored.result.current.run).toEqual(daily);
    expect(restored.result.current.view?.record.wins).toBe(1);
    expect(recordCompletion).toHaveBeenCalledTimes(0);

    act(() => restored.result.current.finishSeason());
    act(() => restored.result.current.finishSeason());
    expect(restored.result.current.view?.record).toMatchObject({ wins: 38, points: 114, perfect: true });
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/soccer-perfect-season', 100);
    restored.unmount();

    const finished = renderHook(() => useSoccerPerfectSeason());
    act(() => finished.result.current.startDaily());
    expect(finished.result.current.view?.record.wins).toBe(38);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('keeps a newer draft from another mounted copy when an older copy acts', () => {
    const first = renderHook(() => useSoccerPerfectSeason());
    act(() => first.result.current.startDaily());
    const second = renderHook(() => useSoccerPerfectSeason());
    act(() => second.result.current.resumeDaily());

    const pick = first.result.current.view!.best!;
    act(() => first.result.current.choosePlayer(pick.playerId, pick.slot));
    act(() => second.result.current.reroll());
    expect(second.result.current.run).toEqual(first.result.current.run);
    expect(second.result.current.view?.picks[pick.slot]?.playerId).toBe(pick.playerId);
    expect(second.result.current.view?.rerollsLeft).toBe(2);

    act(() => second.result.current.reroll());
    expect(second.result.current.view?.turn).toBe(1);
    expect(second.result.current.view?.rerollsLeft).toBe(1);
  });

  it('reuses a result that a second mounted copy has already finished', () => {
    const first = renderHook(() => useSoccerPerfectSeason());
    act(() => first.result.current.startDaily());
    pickBestXI(first);
    const second = renderHook(() => useSoccerPerfectSeason());
    act(() => second.result.current.resumeDaily());
    act(() => first.result.current.finishSeason());
    act(() => second.result.current.revealNext());
    expect(second.result.current.run).toEqual(first.result.current.run);
    expect(second.result.current.view?.finished).toBe(true);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('waits for a durable terminal write and retries the same result exactly once', () => {
    const game = renderHook(() => useSoccerPerfectSeason());
    act(() => game.result.current.startDaily());
    pickBestXI(game);
    const draft = localStorage.getItem(dailyKey);
    expect(draft).toBe(JSON.stringify(game.result.current.run));
    const refused = refuseWrites(dailyKey, run => run.completionRecorded);

    act(() => game.result.current.finishSeason());
    expect(game.result.current.view?.finished).toBe(true);
    expect(localStorage.getItem(dailyKey)).toBe(draft);
    expect(recordCompletion).not.toHaveBeenCalled();
    expect(game.result.current.canRetrySave).toBe(true);
    const result = JSON.stringify(game.result.current.run);

    act(() => expect(game.result.current.retrySave()).toBe(false));
    act(() => expect(settlePendingSaves()).toBe(false));
    expect(localStorage.getItem(dailyKey)).toBe(draft);
    expect(recordCompletion).not.toHaveBeenCalled();
    refused.mockRestore();

    act(() => game.result.current.backToMenu());
    act(() => expect(game.result.current.retrySave()).toBe(true));
    expect(game.result.current.run).toBeNull();
    expect(game.result.current.canRetrySave).toBe(false);
    expect(localStorage.getItem(dailyKey)).toBe(result);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/soccer-perfect-season', 100);
    act(() => game.result.current.retrySave());
    game.unmount();

    const restored = renderHook(() => useSoccerPerfectSeason());
    act(() => restored.result.current.resumeDaily());
    expect(JSON.stringify(restored.result.current.run)).toBe(result);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('adopts another tab’s stored finish without writing it again or submitting twice', () => {
    const first = renderHook(() => useSoccerPerfectSeason());
    act(() => first.result.current.startDaily());
    pickBestXI(first);
    const second = renderHook(() => useSoccerPerfectSeason());
    act(() => second.result.current.resumeDaily());
    const refused = refuseWrites(dailyKey, run => run.completionRecorded);
    act(() => first.result.current.finishSeason());
    expect(recordCompletion).not.toHaveBeenCalled();
    refused.mockRestore();

    act(() => second.result.current.finishSeason());
    const stored = localStorage.getItem(dailyKey);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    act(() => first.result.current.retrySave());
    expect(write).not.toHaveBeenCalled();
    expect(JSON.stringify(first.result.current.run)).toBe(stored);
    expect(first.result.current.canRetrySave).toBe(false);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('keeps a newer Unlimited draw when a tab retries its old result', () => {
    const first = renderHook(() => useSoccerPerfectSeason());
    act(() => first.result.current.startUnlimited());
    pickBestXI(first);
    const second = renderHook(() => useSoccerPerfectSeason());
    const refused = refuseWrites(unlimitedKey, run => run.completionRecorded);
    act(() => first.result.current.finishSeason());
    refused.mockRestore();
    expect(first.result.current.canRetrySave).toBe(true);

    act(() => second.result.current.startUnlimited());
    const newer = localStorage.getItem(unlimitedKey);
    act(() => first.result.current.retrySave());
    expect(JSON.stringify(first.result.current.run)).toBe(newer);
    expect(localStorage.getItem(unlimitedKey)).toBe(newer);
    expect(first.result.current.canRetrySave).toBe(false);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('does not replace a newer match revealed after an earlier write was refused', () => {
    const first = renderHook(() => useSoccerPerfectSeason());
    act(() => first.result.current.startDaily());
    pickBestXI(first);
    const second = renderHook(() => useSoccerPerfectSeason());
    act(() => second.result.current.resumeDaily());
    const refused = refuseWrites(dailyKey, run => run.revealed === 1);
    act(() => first.result.current.revealNext());
    expect(first.result.current.storageNotice).toBe(true);
    refused.mockRestore();
    act(() => second.result.current.revealNext());
    act(() => second.result.current.revealNext());
    const newer = localStorage.getItem(dailyKey);

    act(() => first.result.current.finishSeason());
    expect(JSON.stringify(first.result.current.run)).toBe(newer);
    expect(first.result.current.run?.revealed).toBe(2);
    expect(localStorage.getItem(dailyKey)).toBe(newer);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('keeps a cleared save cleared when another tab retries a previous result', () => {
    const game = renderHook(() => useSoccerPerfectSeason());
    act(() => game.result.current.startDaily());
    pickBestXI(game);
    const refused = refuseWrites(dailyKey, run => run.completionRecorded);
    act(() => game.result.current.finishSeason());
    refused.mockRestore();
    localStorage.removeItem(dailyKey);

    act(() => game.result.current.retrySave());
    expect(game.result.current.run).toBeNull();
    expect(game.result.current.canRetrySave).toBe(false);
    expect(localStorage.getItem(dailyKey)).toBeNull();
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('does not submit when storage can only keep results for this visit', () => {
    vi.mocked(getStorageTrouble).mockReturnValue('blocked');
    const game = renderHook(() => useSoccerPerfectSeason());
    act(() => game.result.current.startDaily());
    pickBestXI(game);
    const draft = localStorage.getItem(dailyKey);

    act(() => game.result.current.finishSeason());
    act(() => expect(game.result.current.retrySave()).toBe(false));
    expect(game.result.current.view?.finished).toBe(true);
    expect(game.result.current.canRetrySave).toBe(true);
    expect(localStorage.getItem(dailyKey)).toBe(draft);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('shows Retry save after the final Next match and removes it once the result is stored', () => {
    let partial = createSoccerRun('daily', '2026-11-12');
    let pick = deriveSoccerRun(partial).best;
    while (pick) {
      partial = applySoccerAction(partial, { type: 'pick', ...pick })!;
      pick = deriveSoccerRun(partial).best;
    }
    partial.revealed = 37;
    localStorage.setItem(dailyKey, JSON.stringify(partial));
    const refused = refuseWrites(dailyKey, run => run.completionRecorded);
    render(<SoccerPerfectSeason />);
    fireEvent.click(screen.getByRole('button', { name: /Resume Daily/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Next match' }));
    expect(screen.getByText('Your result could not be saved. Retry to submit your score.')).toBeVisible();
    expect(within(screen.getByRole('list', { name: 'Match results' })).getAllByRole('listitem')).toHaveLength(38);
    expect(recordCompletion).not.toHaveBeenCalled();

    refused.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    expect(screen.queryByRole('button', { name: 'Retry save' })).toBeNull();
    expect(localStorage.getItem(dailyKey)).toBe(JSON.stringify({ ...partial, revealed: 38, completionRecorded: true }));
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/soccer-perfect-season', 100);
  });
});
