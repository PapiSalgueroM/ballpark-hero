import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer } from '@/lib/nrlCareer';
import { createNrlSeason, nrlBench, NRL_SAVE_KEY, reduceNrlSeason } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const fenceKey = fenceKeyOf(NRL_SAVE_KEY);
const advance = (career: ReturnType<typeof createNrlCareer>) => reduceNrlCareer(career, { type: 'advance' });
const initialCareer = () => createNrlCareer('storm', 4);
const managed = (match: { homeId: string; awayId: string }) => [match.homeId, match.awayId].includes('storm');
const read = () => localStorage.getItem(NRL_SAVE_KEY);

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
});

function openStats(raw: string) {
  localStorage.setItem(NRL_SAVE_KEY, raw);
  localStorage.setItem(fenceKey, '7');
  render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Squad' }));
  const toggle = screen.getByText('Season player stats', { exact: true });
  const details = toggle.closest('details')!;
  expect(details).not.toHaveAttribute('open');
  fireEvent.click(toggle);
  expect(details).toHaveAttribute('open');
  return within(details);
}

function playerNumbers(scope: ReturnType<typeof within>, name: string) {
  const row = scope.getByRole('rowheader', { name, exact: true }).closest('tr')!;
  return within(row).getAllByRole('cell').map(cell => Number(cell.textContent));
}

function totals(scope: ReturnType<typeof within>) {
  const sums = [0, 0, 0, 0, 0];
  for (const row of scope.getAllByRole('row').slice(1)) {
    within(row).getAllByRole('cell').forEach((cell, index) => { sums[index] += Number(cell.textContent); });
  }
  return sums;
}

describe('NRL season player stats', () => {
  it('counts a scoreless starter and a used reserve while keeping unused named reserves at zero', () => {
    const initial = initialCareer();
    const career = advance(initial);
    const match = career.season.results.find(managed)!;
    const report = match.playerScoring!;
    const scoreless = report.starters.find(id => report.lines.every(line => line.playerId !== id))!;
    const reserve = match.benchUsed![0];
    const unused = nrlBench(initial.season).find(id => !match.benchUsed!.includes(id))!;
    const names = new Map(career.season.squad.map(player => [player.id, player.name]));
    const raw = JSON.stringify(career);
    const stats = openStats(raw);
    const table = within(stats.getByRole('table', { name: '2026 squad stats' }));
    expect(playerNumbers(table, names.get(scoreless)!)).toEqual([1, 1, 0, 0, 0]);
    expect(playerNumbers(table, names.get(reserve)!).slice(0, 3)).toEqual([1, 0, 1]);
    expect(playerNumbers(table, names.get(unused)!)).toEqual([0, 0, 0, 0, 0]);
    expect(totals(table)).toEqual([13 + match.benchUsed!.length, 13, match.benchUsed!.length, match.homeScoring.tries, match.homeScore]);
    expect(read()).toBe(raw);
    expect(localStorage.getItem(fenceKey)).toBe('7');
  });

  it('reconciles regular and finals totals separately and preserves the finished career', () => {
    let career = initialCareer();
    while (career.season.phase !== 'complete') career = advance(career);
    const own = career.season.results.filter(managed);
    const regular = own.filter(match => !match.finalsRound);
    const finals = own.filter(match => match.finalsRound);
    expect(finals.length).toBeGreaterThan(0);
    const expected = (matches: typeof own) => {
      const used = matches.reduce((sum, match) => sum + (match.benchUsed?.length ?? 0), 0);
      const tries = matches.reduce((sum, match) => sum + (match.homeId === 'storm' ? match.homeScoring : match.awayScoring).tries, 0);
      const points = matches.reduce((sum, match) => sum + (match.homeId === 'storm' ? match.homeScore : match.awayScore), 0);
      return [13 * matches.length + used, 13 * matches.length, used, tries, points];
    };
    const raw = JSON.stringify(career);
    expect(readNrlCareerSave(raw)).toEqual(career);
    const stats = openStats(raw);
    const table = within(stats.getByRole('table', { name: '2026 squad stats' }));
    const scope = stats.getByRole('combobox', { name: 'Match scope' });
    expect(totals(table)).toEqual(expected(own));
    fireEvent.change(scope, { target: { value: 'regular' } });
    expect(totals(table)).toEqual(expected(regular));
    fireEvent.change(scope, { target: { value: 'finals' } });
    expect(totals(table)).toEqual(expected(finals));
    expect(read()).toBe(raw);
    expect(localStorage.getItem(fenceKey)).toBe('7');
  });

  it.each(['v1', 'v2'])('explains the missing coverage on an untracked %s season with played matches', version => {
    const initial = initialCareer();
    const { kickerId: _kicker, ...oldSeason } = initial.season;
    const raw = JSON.stringify(version === 'v1' ? reduceNrlSeason(createNrlSeason('storm', 4), { type: 'advance' })
      : advance({ ...initial, season: oldSeason }));
    const career = readNrlCareerSave(raw)!;
    expect(career.season.results.filter(managed)).toHaveLength(1);
    const stats = openStats(raw);
    expect(stats.getByText('Player match records are unavailable for this saved season. Tracking starts next season.')).toBeVisible();
    expect(stats.queryByRole('table')).not.toBeInTheDocument();
    expect(read()).toBe(raw);
    expect(localStorage.getItem(fenceKey)).toBe('7');
  });

  it('shows an empty new season after rollover instead of carrying last year’s appearances forward', () => {
    let career = initialCareer();
    while (career.season.phase !== 'complete') career = advance(career);
    const next = reduceNrlCareer(career, { type: 'startNextSeason' });
    expect(next.season.year).toBe(2027);
    const raw = JSON.stringify(next);
    const stats = openStats(raw);
    expect(stats.getByText('Player stats appear after your first match.')).toBeVisible();
    expect(stats.queryByRole('table')).not.toBeInTheDocument();
    expect(read()).toBe(raw);
  });
});
