import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNavbar } from '@/components/game/GameNavbar';
import { ALL_GAMES } from '@/data/gameRegistry';
import { createChallengeLink, decodeSharedResult, MAX_SHARED_SCORE_LENGTH, SHARED_RESULT_PARAM } from '@/lib/sharedResult';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/useGameNavbarStats', () => ({ useGameNavbarStats: () => ({ gamesPlayedToday: 0, totalPointsToday: 0, dailyRank: null, currentStreak: 0, totalGames: 1, loading: false }) }));
vi.mock('@/hooks/useDailyLegend', () => ({ useDailyLegend: () => ({ showCelebration: false, streakDays: 0, dismissCelebration: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));

const gamePath = '/free-kick';
const gameName = ALL_GAMES.find(game => game.path === gamePath)!.label;
const writeText = vi.fn();
const encoded = (score: string) => `?${new URLSearchParams({ [SHARED_RESULT_PARAM]: score })}`;
function LocationReceipt() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}{location.hash}</output>;
}
const navbar = (url: string) => render(
  <MemoryRouter initialEntries={[url]}>
    <GameNavbar />
    <LocationReceipt />
  </MemoryRouter>,
);
const buttons = (props: Partial<Parameters<typeof ShareButtons>[0]> = {}) => render(
  <ShareButtons score="8/10" gameName={gameName} gamePath={gamePath} {...props} />,
);

beforeEach(() => {
  vi.clearAllMocks();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('public result challenge links', () => {
  it('copies only the public score and registered path, then displays that exact result', async () => {
    const privateText = 'FixtureOwner fixture-owner@example.invalid private-session private-save';
    localStorage.setItem('fixture-account', privateText);
    sessionStorage.setItem('fixture-session', privateText);
    const read = vi.spyOn(Storage.prototype, 'getItem');
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const view = buttons({ customText: privateText, emojiGrid: 'private-roster', gameName: 'private-alias' });
    const copy = view.getByRole('button', { name: 'Copy challenge' });
    expect(copy).toHaveClass('min-h-[44px]');
    fireEvent.click(copy);
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const link = writeText.mock.calls[0][0] as string;
    expect(link).toBe('https://douknowball.com/free-kick?shared-result=8%2F10');
    const url = new URL(link);
    expect(Array.from(url.searchParams.entries())).toEqual([[SHARED_RESULT_PARAM, '8/10']]);
    expect(link).not.toMatch(/FixtureOwner|example\.invalid|private-|username|session|save/);
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Challenge link copied!');
    cleanup();
    const target = navbar(`${url.pathname}${url.search}`);
    const card = target.getByRole('complementary', { name: 'Shared result' });
    expect(card).toHaveAttribute('data-no-prerender', '');
    expect(card).toHaveTextContent(`${gameName}: 8/10`);
    expect(card).toHaveTextContent('Play below and see how you do.');
    expect(card).not.toHaveTextContent(/verified|same puzzle|percentile|rank|private-alias/);
  });

  it('reports clipboard failure and restores the challenge action for a retry', async () => {
    writeText.mockRejectedValueOnce(new Error('Fixture clipboard unavailable'));
    const view = buttons();
    fireEvent.click(view.getByRole('button', { name: 'Copy challenge' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not copy challenge link'));
    expect(toast.success).not.toHaveBeenCalled();
    expect(view.getByRole('button', { name: 'Copy challenge' })).toBeEnabled();
    fireEvent.click(view.getByRole('button', { name: 'Copy challenge' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Challenge link copied!'));
    expect(writeText).toHaveBeenCalledTimes(2);
  });

  it('prevents repeat challenge copies while the clipboard operation is pending', async () => {
    let finish!: () => void;
    writeText.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    const view = buttons();
    const copy = view.getByRole('button', { name: 'Copy challenge' });
    fireEvent.click(copy);
    expect(copy).toBeDisabled();
    expect(copy).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(copy);
    expect(writeText).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    expect(copy).toBeEnabled();
    expect(copy).toHaveAttribute('aria-busy', 'false');
  });

  it('keeps the existing native custom-text override and default emoji payload unchanged', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    const custom = 'Fixture authored result\nCustom grid 🟩🟨\ndouknowball.com/free-kick';
    const view = buttons({ customText: custom, emojiGrid: '🟥🟥' });
    fireEvent.click(view.getByRole('button', { name: 'Share result' }));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: gameName, text: custom }));
    expect(writeText).not.toHaveBeenCalled();
    await waitFor(() => expect(view.getByRole('button', { name: 'Share result' })).toBeEnabled());
    view.rerender(<ShareButtons score="8/10" gameName={gameName} gamePath={gamePath} emojiGrid="🟩🟨" />);
    fireEvent.click(view.getByRole('button', { name: 'Share result' }));
    await waitFor(() => expect(share).toHaveBeenLastCalledWith({ title: gameName, text: `I scored 8/10 on ${gameName} at DoUKnowBall! Can you beat me?\n🟩🟨\ndouknowball.com/free-kick` }));
    expect(writeText).not.toHaveBeenCalled();
  });

  it('keeps score-card and social destination text separate from the new challenge URL', async () => {
    const custom = 'Fixture custom destination text\ndouknowball.com/free-kick';
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const view = buttons({ customText: custom, emojiGrid: '🟩🟨' });
    fireEvent.click(view.getByRole('button', { name: /Copy Score Card/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain(`🟩🟨\nScore: 8/10\ndouknowball.com/free-kick`);
    expect(writeText.mock.calls[0][0]).not.toContain(SHARED_RESULT_PARAM);
    fireEvent.click(view.getByRole('button', { name: 'Share on X' }));
    expect(open).toHaveBeenLastCalledWith(`https://twitter.com/intent/tweet?text=${encodeURIComponent(custom)}`, '_blank', 'noopener,noreferrer');
    fireEvent.click(view.getByRole('button', { name: 'Share on WhatsApp' }));
    expect(open).toHaveBeenLastCalledWith(`https://wa.me/?text=${encodeURIComponent(custom)}`, '_blank', 'noopener,noreferrer');
  });

  it('round-trips Unicode, percent signs and the full maximum-length score', () => {
    for (const score of ['8/10 🏀 • Καλή 50% 日本語', 'A'.repeat(MAX_SHARED_SCORE_LENGTH)]) {
      const url = new URL(createChallengeLink(gamePath, score)!);
      expect(decodeSharedResult(url.pathname, url.search)).toEqual({ gameName, score });
      const view = navbar(`${url.pathname}${url.search}`);
      expect(view.getByRole('complementary', { name: 'Shared result' })).toHaveTextContent(score);
      cleanup();
    }
  });

  it('renders markup-shaped input as literal text without creating injected elements', () => {
    const score = '<img src=x onerror=alert(1)><script>bad()</script>';
    const view = navbar(`${gamePath}${encoded(score)}`);
    const card = view.getByRole('complementary', { name: 'Shared result' });
    expect(card).toHaveTextContent(score);
    expect(card.querySelector('img, script')).toBeNull();
    expect(within(card).getAllByRole('button')).toHaveLength(1);
  });

  it('dismisses only its own parameter, preserves other values and hash, and returns focus', () => {
    const view = navbar(`${gamePath}?source=fixture&shared-result=8%2F10&mode=practice&source=second#rules`);
    const dismiss = view.getByRole('button', { name: 'Dismiss shared result' });
    expect(dismiss).toHaveClass('h-11', 'w-11');
    dismiss.focus();
    fireEvent.click(dismiss);
    expect(view.queryByRole('complementary', { name: 'Shared result' })).toBeNull();
    expect(view.getByTestId('location')).toHaveTextContent('/free-kick?source=fixture&mode=practice&source=second#rules');
    expect(view.getByRole('button', { name: 'Go back' })).toHaveFocus();
  });

  it('displays a registered game with a trailing slash and preserves that URL on dismissal', () => {
    const view = navbar(`${gamePath}/?shared-result=8%2F10&mode=practice#rules`);
    expect(view.getByRole('complementary', { name: 'Shared result' })).toHaveTextContent(`${gameName}: 8/10`);
    fireEvent.click(view.getByRole('button', { name: 'Dismiss shared result' }));
    expect(view.queryByRole('complementary', { name: 'Shared result' })).toBeNull();
    expect(view.getByTestId('location')).toHaveTextContent('/free-kick/?mode=practice#rules');
    expect(view.getByRole('button', { name: 'Go back' })).toHaveFocus();
  });

  it('does not show a challenge action for unknown paths or invalid source scores', () => {
    for (const props of [{ gamePath: '/fixture-unknown' }, { score: '' }, { score: 'A'.repeat(MAX_SHARED_SCORE_LENGTH + 1) }, { score: '8\n10' }, { score: '\ud800' }]) {
      const view = buttons(props);
      expect(view.queryByRole('button', { name: 'Copy challenge' })).toBeNull();
      expect(view.getByRole('button', { name: 'Share result' })).toBeEnabled();
      cleanup();
    }
  });

  it.each([
    ['absent', ''],
    ['empty', '?shared-result='],
    ['blank', '?shared-result=+++'],
    ['duplicate', '?shared-result=8&shared-result=9'],
    ['encoded duplicate', '?shared-result=8&%73hared-result=9'],
    ['oversized', encoded('A'.repeat(MAX_SHARED_SCORE_LENGTH + 1))],
    ['newline', '?shared-result=8%0A10'],
    ['null control', '?shared-result=8%0010'],
    ['C1 control', encoded('8\u008510')],
    ['bidi control', encoded('8\u202e10')],
    ['bad percent escape', '?shared-result=%ZZ'],
    ['bad UTF8', '?shared-result=%E0%A4'],
    ['unbounded encoded field', `?shared-result=${'%41'.repeat(MAX_SHARED_SCORE_LENGTH * 12)}`],
  ])('rejects the %s field without displaying a shared result', (_name, search) => {
    expect(decodeSharedResult(gamePath, search)).toBeNull();
    const view = navbar(`${gamePath}${search}`);
    expect(view.queryByRole('complementary', { name: 'Shared result' })).toBeNull();
  });

  it('rejects non-game and unknown paths even when the score is valid', () => {
    for (const path of ['/fixture-unknown', '/', '/profile', '/free-kick/extra']) {
      expect(createChallengeLink(path, '8/10')).toBeNull();
      expect(decodeSharedResult(path, encoded('8/10'))).toBeNull();
      const view = navbar(`${path}${encoded('8/10')}`);
      expect(view.queryByRole('complementary', { name: 'Shared result' })).toBeNull();
      cleanup();
    }
  });
});
