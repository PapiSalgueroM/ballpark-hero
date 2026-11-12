import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerHistoryRow, type NrlCareerState } from '@/lib/nrlCareer';
import { NRL_SAVE_KEY } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const bytes = JSON.stringify;
const fence = fenceKeyOf(NRL_SAVE_KEY);
const raw = () => localStorage.getItem(NRL_SAVE_KEY);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

function finish(career: NrlCareerState) {
  for (let tick = 0; tick < 40 && career.season.phase !== 'complete'; tick++) career = reduceNrlCareer(career, { type: 'advance' });
  expect(career.season.phase).toBe('complete');
  return career;
}

function open(save: string) {
  localStorage.setItem(NRL_SAVE_KEY, save);
  localStorage.setItem(fence, '4');
  return render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
}

function verifyScorers({ year, scoring }: NrlCareerHistoryRow) {
  expect(scoring!.length).toBeGreaterThan(2);
  const summary = screen.getByText(year + ' player scoring', { exact: true });
  const details = summary.closest('details')!;
  expect(details).not.toHaveAttribute('open');
  fireEvent.click(summary);
  const table = within(details).getByRole('table', { name: year + ' recorded club scoring' });
  const rows = within(table).getAllByRole('row');
  expect(rows).toHaveLength(scoring!.length + 1);
  const headers = ['Player', 'Tries', 'Conversions', 'Penalty goals', 'One-point field goals', 'Two-point field goals', 'Points'];
  headers.forEach(name => expect(within(rows[0]).getByRole('columnheader', { name })).toBeVisible());
  const actual = rows.slice(1).map(row => [
    within(row).getByRole('rowheader').textContent,
    ...within(row).getAllByRole('cell').map(cell => Number(cell.textContent)),
  ]);
  expect(actual).toEqual(scoring!.map(([, name, tries, conversions, penalties, fieldGoals, longFieldGoals]) =>
    [name, tries, conversions, penalties, fieldGoals, longFieldGoals, 4 * tries + 2 * conversions + 2 * penalties + fieldGoals + 2 * longFieldGoals]));
}

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

describe('NRL archived club scoring', () => {
  it('shows every recorded scorer before and after actual rollover without changing storage', () => {
    const complete = finish(createNrlCareer('storm', 4));
    const original = bytes(complete);
    open(original);
    click('Review this season');
    verifyScorers(complete.history[0]);
    expect(raw()).toBe(original);
    expect(localStorage.getItem(fence)).toBe('4');

    click('Start 2027');
    const rolled = raw()!;
    click('Club office');
    click('Season review');
    verifyScorers(complete.history[0]);
    expect(raw()).toBe(rolled);
    expect(localStorage.getItem(fence)).toBe('5');
  });

  it('keeps both clubs’ scoring rows browsable after retirement', () => {
    const complete = finish(createNrlCareer('storm', 4));
    const perth = reduceNrlCareer(complete, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } });
    const second = finish(perth);
    const retired = reduceNrlCareer(second, { type: 'retireCareer', year: 2027, clubId: 'bears' });
    const original = bytes(retired);
    open(original);
    expect(screen.getByRole('heading', { name: 'Season review' })).toBeVisible();
    verifyScorers(retired.history[0]);
    verifyScorers(retired.history[1]);
    expect(raw()).toBe(original);
    expect(localStorage.getItem(fence)).toBe('4');
  });

  it('explains unavailable archived scoring in an older save', () => {
    const complete = finish(createNrlCareer('storm', 4));
    const rolled = reduceNrlCareer(complete, { type: 'startNextSeason' });
    const { scoring, ...older } = rolled.history[0];
    expect(scoring?.length).toBeGreaterThan(0);
    const original = bytes({ ...rolled, history: [older] });
    expect(bytes(readNrlCareerSave(original))).toBe(original);
    open(original);
    click('Club office');
    click('Season review');
    expect(screen.getByText('Player scoring is unavailable for this saved season.')).toBeVisible();
    expect(screen.queryByText('2026 player scoring', { exact: true })).not.toBeInTheDocument();
    expect(raw()).toBe(original);
    expect(localStorage.getItem(fence)).toBe('4');
  });
});
