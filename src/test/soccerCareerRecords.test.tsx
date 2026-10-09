import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { careerRecordBook } from '@/lib/soccerCareerRecords';
import CareerRecordsSheet from '@/components/soccer-career/CareerRecordsSheet';

function row(extra: Partial<SeasonRecord> = {}): SeasonRecord {
  return { year: 2026, age: 25, club: 'Test City', clubCountry: 'England', clubTier: 3,
    apps: 30, goals: 12, assists: 4, cleanSheets: 0, yellowCards: 2, redCards: 0, rating: 7.2,
    leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false,
    ballonDor: false, ballonDorRank: null, type: 'playing', intApps: 0, intGoals: 0,
    intAssists: 0, intRating: 0, tournament: null, tournamentResult: null, ...extra };
}
const source = (seasons: SeasonRecord[], position = 'ST') => ({ seasons, position });
const career = (seasons: SeasonRecord[]) => source(seasons) as CareerState;
afterEach(cleanup);

describe('Soccer Career record book', () => {
  it('counts only saved senior club stats and never academy or manager seasons', () => {
    const book = careerRecordBook(source([row({ type: 'youth', goals: 90 }), row(), row({ type: 'manager', goals: 99 }), row({ type: 'retired', goals: 99 }), row({ club: 'BANNED', clubTier: 99, clubCountry: '', apps: 0, goals: 0, assists: 0 })]));
    expect(book.totals).toEqual({ apps: 30, goals: 12, assists: 4, cleanSheets: 0 });
    expect(book.rows.map(r => r.index)).toEqual([1]);
  });
  it('keeps a return to the club separate from the first spell', () => {
    const book = careerRecordBook(source([row(), row({ year: 2027 }), row({ year: 2028, club: 'Other Town' }), row({ year: 2029 })]));
    expect(book.stints.map(s => [s.club, s.rows.length, s.apps])).toEqual([['Test City', 2, 60], ['Other Town', 1, 30], ['Test City', 1, 30]]);
    expect(book.totals.goals).toBe(48);
  });
  it('separates a loan from a permanent spell and preserves the parent', () => {
    const book = careerRecordBook(source([row({ onLoanFrom: 'Parent United' }), row({ year: 2027 })]));
    expect(book.stints).toHaveLength(2);
    expect(book.stints[0].parent).toBe('Parent United');
    expect(book.stints[1].parent).toBeNull();
  });
  it('does not merge years that the save does not hold', () => {
    const book = careerRecordBook(source([row(), row({ year: 2028 })]));
    expect(book.stints.map(s => s.firstYear)).toEqual([2026, 2028]);
  });
  it('uses actual records, keeps ties earliest and requires ten apps for rating', () => {
    const book = careerRecordBook(source([row({ goals: 58, rating: 8.4 }), row({ year: 2027, goals: 61, rating: 10, apps: 2 }), row({ year: 2028, goals: 61, rating: 8.4 })]));
    expect(book.bests.find(b => b.label === 'Most goals')).toMatchObject({ value: 61, index: 1, ties: 2 });
    expect(book.bests.find(b => b.label === 'Best season rating')).toMatchObject({ value: 8.4, index: 0, ties: 2 });
  });
  it('gives keepers clean-sheet records without inventing attacking records', () => {
    const book = careerRecordBook(source([row({ cleanSheets: 16 })], 'GK'));
    expect(book.bests.map(b => b.label)).toEqual(['Most appearances', 'Most clean sheets', 'Best season rating']);
    expect(book.bests[1].value).toBe(16);
  });
  it('handles no appearances without inventing a best season', () => {
    const book = careerRecordBook(source([row({ apps: 0, goals: 0, assists: 0, rating: 0 })]));
    expect(book.bests).toEqual([]);
    expect(book.totals.apps).toBe(0);
  });
  it('reads a save without adding records or changing frozen data', () => {
    const state = source([row(), row({ year: 2027, ovr: 83 })]);
    const before = JSON.stringify(state);
    expect(careerRecordBook(state)).toEqual(careerRecordBook(state));
    expect(JSON.stringify(state)).toBe(before);
  });
  it('opens the actual best season and leaves an old unknown overall unstated', () => {
    render(<CareerRecordsSheet career={career([row()])} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Most goals/ }));
    expect(screen.getByText('2026/27 · Test City')).toBeInTheDocument();
    expect(screen.queryByText(/OVR/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(screen.getByRole('button', { name: 'Club history' })).toBeInTheDocument();
  });
  it('drills into a club spell and shows the loan parent and played overall', () => {
    render(<CareerRecordsSheet career={career([row({ onLoanFrom: 'Parent United', ovr: 81 }), row({ year: 2027 })])} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Club history' }));
    fireEvent.click(screen.getByRole('button', { name: /loan from Parent United/ }));
    expect(screen.getByText('On loan from Parent United')).toBeInTheDocument();
    expect(screen.getByText('Rating 7.2 · OVR 81')).toBeInTheDocument();
  });
  it('keeps help, worked example, close and Escape reachable', () => {
    let closed = 0;
    render(<CareerRecordsSheet career={career([row()])} onClose={() => closed++} />);
    fireEvent.click(screen.getByRole('button', { name: 'Record book help' }));
    expect(screen.getByText(/Example: 12 goals/)).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(closed).toBe(1);
  });
  it('restores body scrolling when the sheet closes', () => {
    document.body.style.overflow = 'scroll';
    const shown = render(<CareerRecordsSheet career={career([row()])} onClose={() => {}} />);
    expect(document.body.style.overflow).toBe('hidden');
    shown.unmount();
    expect(document.body.style.overflow).toBe('scroll');
    document.body.style.overflow = '';
  });
});