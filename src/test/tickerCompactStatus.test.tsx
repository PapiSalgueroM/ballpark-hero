import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { TopTicker } from '@/components/layout/TopTicker';
import type { LiveScoreRow } from '@/lib/liveScores';

const checkedAt = Date.parse('2026-11-13T18:00:00Z');
const match: LiveScoreRow = {
  id: 'match', sport: 'soccer', league: 'Premier League',
  home: 'Arsenal', away: 'Chelsea', home_score: 12, away_score: 10,
  status_short: '', status_long: 'Live', live: true, finished: false,
  start_at: new Date(checkedAt - 3600_000).toISOString(), updated_at: new Date(checkedAt).toISOString(),
};

afterEach(() => { cleanup(); localStorage.clear(); });

function readScore(status: string, live = true) {
  render(<MemoryRouter><TopTicker scores={[{ ...match, status_long: status, live, finished: !live }]} checkedAt={checkedAt} /></MemoryRouter>);
  return screen.getByRole('link', { name: `Arsenal 12 v Chelsea 10, ${live ? status : 'Final'}` });
}

describe('compact Home ticker status', () => {
  it.each([
    ['Live', 'Live', 'Live'],
    ['First Half', '1H', 'First Half'],
    ['International Friendly, Second Half, Match Temporarily Under Review', '2H', '2nd Half'],
    ['Half-Time', 'HT', 'Half-Time'],
    ['Extra Time', 'ET', 'Extra Time'],
    ['Penalties', 'PENS', 'Penalties'],
    ['Match Temporarily Under Review', 'Live', 'Live'],
  ])('renders %s in a compact slot and keeps the full accessible status', (status, narrow, phone) => {
    const link = readScore(status);
    const short = link.querySelector('[data-ticker-compact-status]');
    expect(short).toHaveTextContent(narrow);
    expect(short?.parentElement?.parentElement).toHaveClass('max-[359px]:shrink-0');
    expect(short?.parentElement?.parentElement).toHaveClass('max-[359px]:tracking-normal');
    expect(link.querySelector('.min-\\[360px\\]\\:inline')).toHaveTextContent(phone);
    expect(link.querySelector('.min-\\[480px\\]\\:inline:last-child')).toBeTruthy();
    expect(within(link).getByText('12')).toBeInTheDocument();
    expect(within(link).getByText('10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Follow Chelsea or Arsenal' })).toBeInTheDocument();
  });

  it('keeps completed matches on the regular status path', () => {
    const link = readScore('Final', false);
    expect(link.querySelector('[data-ticker-compact-status]')).toBeNull();
    expect(within(link).getAllByText('Final')).toHaveLength(2);
  });
});
