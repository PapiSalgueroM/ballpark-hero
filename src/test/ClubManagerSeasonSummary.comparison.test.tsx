import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ClubManagerSeasonSummary from '@/components/club-manager/ClubManagerSeasonSummary';
import { finishSeason, startCareer, type SeasonRecord } from '@/lib/clubManager';

afterEach(cleanup);

function showSeason(points: number, prior: Partial<SeasonRecord> | null = {}) {
  const { state, summary } = finishSeason(startCareer('OB'));
  const current = { ...state.history[0], season: 3, position: 4, points };
  const previous = { ...current, season: 2, position: 6, points: 51, ...prior };
  const history = prior ? [previous, current] : [current];
  render(<ClubManagerSeasonSummary
    sm={{ ...summary, season: current.season, position: current.position, points }}
    c={{ ...state, season: current.season, history }}
    g={{ nextSeason: vi.fn(), startNew: vi.fn() }}
  />);
}

describe('Club Manager season comparison', () => {
  it.each([
    [57, '+6 pts this season'],
    [47, '-4 pts this season'],
    [51, 'Same points this season'],
  ] as const)('compares a completed season worth %d points with the previous season', (points, delta) => {
    showSeason(points);
    expect(screen.getByText('Last season (S2)').parentElement).toHaveTextContent('Last season (S2) · #6 · 51 pts · ' + delta);
  });

  const incomparable: [string, Partial<SeasonRecord> | null][] = [
    ['the first recorded season', null],
    ['a gap in the history', { season: 1 }],
    ['a different club', { club: 'Another club' }],
    ['a different league', { leagueId: 'another-league' }],
    ['a different league size', { leagueSize: 24 }],
    ['an old record without league metadata', { leagueId: undefined, leagueSize: undefined }],
  ];

  it.each(incomparable)('skips the comparison for %s', (_name, prior) => {
    showSeason(57, prior);
    expect(screen.queryByText(/^Last season/)).toBeNull();
  });
});
