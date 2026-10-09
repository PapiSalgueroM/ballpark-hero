/* Round 1046: which seasons can be watched again, and the list that offers
   them. The rule is the critic's C1: the save keeps one year of the league's
   world, so a table season he did not win replays the same only while that
   world is still its year. */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { seasonReplays, seasonStable } from '@/components/soccer-career/SoccerSeasonCentre';
import { SeasonPicker, type PickerRow } from '@/components/season-centre/SeasonPicker';

describe('which seasons replay', () => {
  it('a results only season always does', () => {
    expect(seasonStable('results', null)).toBe(true);
    expect(seasonStable('results', 7)).toBe(true);
    expect(seasonReplays('results', 7, null, 2001)).toBe(true);
    expect(seasonReplays('results', undefined, 2030, 2001)).toBe(true);
  });
  it('a title season always does', () => {
    expect(seasonStable('table', 1)).toBe(true);
    expect(seasonReplays('table', 1, undefined, 2001)).toBe(true);
    expect(seasonReplays('table', 1, 2030, 2001)).toBe(true);
  });
  it('a table season he did not win does only while the save holds that year', () => {
    expect(seasonStable('table', 4)).toBe(false);
    expect(seasonStable('table', null)).toBe(false);
    expect(seasonReplays('table', 4, 2001, 2001)).toBe(true);
    expect(seasonReplays('table', 4, 2002, 2001)).toBe(false);
    expect(seasonReplays('table', 4, null, 2001)).toBe(false);
    expect(seasonReplays('table', 4, undefined, 2001)).toBe(false);
    expect(seasonReplays('table', 20, 2000, 2001)).toBe(false);
  });
});

describe('the season picker', () => {
  const rows: PickerRow[] = [
    { id: '3', label: '2031/32 · Arsenal', sub: '1st of 20 · 34 apps · 12 goals', chip: '🏆' },
    { id: '2', label: '2030/31 · Arsenal', sub: '4th of 20 · 30 apps · 9 goals', locked: 'Cannot be replayed yet.' },
    { id: '0', label: '2028/29 · Lyon', sub: '22 apps · 3 goals' },
  ];
  const html = renderToStaticMarkup(<SeasonPicker title="Season replays" rows={rows} exitLabel="Back to your career" onPick={() => {}} onClose={() => {}} />);
  it('is a dialog with one way back', () => {
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="Season replays"');
    expect(html.match(/data-picker-exit/g)).toHaveLength(1);
    expect(html).toContain('Back to your career');
  });
  it('draws a season that replays as a button, in the order given', () => {
    const ids = [...html.matchAll(/<button[^>]*data-replay-row="(\d+)"/g)].map(m => m[1]);
    expect(ids).toEqual(['3', '0']);
    expect(html).toContain('1st of 20 · 34 apps · 12 goals');
    expect(html).toContain('🏆');
  });
  it('draws a locked season as a plain tile with its reason, never a button', () => {
    expect(html).toMatch(/<div[^>]*data-replay-locked="2"/);
    expect(html).not.toMatch(/<button[^>]*data-replay-locked/);
    expect(html).toContain('Cannot be replayed yet.');
    expect(html).not.toContain('4th of 20 · 30 apps · 9 goals');
  });
  it('keeps the list in its own scroll box', () => {
    expect(html).toMatch(/<ul[^>]*class="[^"]*max-h-\[60vh\][^"]*overflow-y-auto[^"]*overscroll-contain[^"]*"[^>]*data-picker-list/);
  });
});
