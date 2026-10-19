/**
 * Round 1513 review (read lens, major 1): a sacked manager had no way to his
 * save points, nor did the season end or the retired screen. Each now carries
 * a Save points button that opens the hub tile's own screen in place, for the
 * slot the page holds. Rendered on the engine's own careers.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import ClubManagerSeasonSummary, { SackedCareerSummary } from '@/components/club-manager/ClubManagerSeasonSummary';
import ClubManagerFarewell from '@/components/club-manager/ClubManagerFarewell';
import { finishSeason, startCareer } from '@/lib/clubManager';
import { retireCareer } from '@/lib/clubManagerRetire';
import { createPoint } from '@/lib/cmSavePoints';

afterEach(() => { cleanup(); localStorage.clear(); });

describe('the save points button off the hub', () => {
  it('opens the save points screen on the sacked screen, with the slot\'s points listed', async () => {
    const c = { ...startCareer('Everton'), sacked: true };
    expect(createPoint(1, c, 'Before the derby').ok).toBe(true);
    const pointsSlot = vi.fn(() => 1);
    const v = render(<SackedCareerSummary c={c} g={{ startNew: vi.fn(), takeJob: vi.fn(), waitAWeek: vi.fn(), pointsSlot }} />);
    expect(pointsSlot).not.toHaveBeenCalled();
    expect(v.queryByTestId('cm-points')).toBeNull();
    fireEvent.click(v.getByTestId('cm-points-door'));
    expect(await v.findByTestId('cm-points')).toBeTruthy();
    expect(v.getAllByTestId('cm-point-title').map(e => e.textContent)).toEqual(['Before the derby']);
    expect(v.getByTestId('cm-point-restore')).toBeTruthy();
    fireEvent.click(v.getByTestId('cm-points-door'));
    expect(v.queryByTestId('cm-points')).toBeNull();
  });

  it('says to reload when the page no longer holds the slot, and opens nothing', () => {
    const c = { ...startCareer('Everton'), sacked: true };
    const v = render(<SackedCareerSummary c={c} g={{ startNew: vi.fn(), takeJob: vi.fn(), waitAWeek: vi.fn(), pointsSlot: () => null }} />);
    fireEvent.click(v.getByTestId('cm-points-door'));
    expect(v.getByText('Reload the page to use your save points.')).toBeTruthy();
    expect(v.queryByTestId('cm-points')).toBeNull();
  });

  it('is on the season end and the retired screens too', async () => {
    const { state, summary } = finishSeason(startCareer('Everton'));
    const end = render(<ClubManagerSeasonSummary sm={summary} c={{ ...state, pendingSummary: summary }} g={{ nextSeason: vi.fn(), startNew: vi.fn(), pointsSlot: () => 0 }} />);
    fireEvent.click(end.getByTestId('cm-points-door'));
    expect(await end.findByTestId('cm-points')).toBeTruthy();
    cleanup();
    const gone = retireCareer(startCareer('Everton'))!;
    const fare = render(<ClubManagerFarewell c={gone} g={{ startNew: vi.fn(), showSlots: vi.fn(), pointsSlot: () => 2 }} />);
    fireEvent.click(fare.getByTestId('cm-points-door'));
    expect(await fare.findByTestId('cm-points')).toBeTruthy();
  });

  it('shows no button where the page passes no slot (the summaries rendered on their own)', () => {
    const c = { ...startCareer('Everton'), sacked: true };
    const v = render(<SackedCareerSummary c={c} g={{ startNew: vi.fn(), takeJob: vi.fn(), waitAWeek: vi.fn() }} />);
    expect(v.queryByTestId('cm-points-door')).toBeNull();
  });
});
