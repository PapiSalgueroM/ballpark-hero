import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, reduceNrlCareer } from '@/lib/nrlCareer';
import { NRL_SAVE_KEY, nrlHoldableReserves } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

it('resumes the 60-minute score unchanged and records only a confirmed late tactic', () => {
  const half = reduceNrlCareer(createNrlCareer('broncos', 1), { type: 'startLive' });
  const fence = fenceKeyOf(NRL_SAVE_KEY);
  localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(half));
  localStorage.setItem(fence, '4');
  const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  const initial = show();
  const click = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));
  click(/^Play to 60 minutes$/);
  const mid = reduceNrlCareer(half, { type: 'reachMinute60', year: 2026, round: 1, tactic: 'balanced' });
  expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(JSON.stringify(mid));
  expect(localStorage.getItem(fence)).toBe('5');
  const score = screen.getByRole('list', { name: 'Score after 60 minutes' }).textContent;
  initial.unmount();
  show();
  expect(screen.getByRole('list', { name: 'Score after 60 minutes' }).textContent).toBe(score);
  click(/^Defence$/);
  expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(JSON.stringify(mid));
  expect(screen.getByRole('list', { name: 'Score after 60 minutes' }).textContent).toBe(score);
  click(/^Play final 20 minutes$/);
  const full = reduceNrlCareer(mid, { type: 'finishMinute60', year: 2026, round: 1, tactic: 'defense' });
  expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(JSON.stringify(full));
  expect(localStorage.getItem(fence)).toBe('6');
  expect(screen.getByText('60-minute tactic change: Defence.')).toBeVisible();
});

it('reopens a 60-minute save and uses the pending reserve only when play resumes', () => {
  const start = createNrlCareer('broncos', 1, 2026);
  const reserve = nrlHoldableReserves(start.season)[0];
  const starter = start.season.squad.find(player => player.id === start.season.lineup[reserve.role])!;
  const half = reduceNrlCareer(start, { type: 'startLive', hold: { year: 2026, round: 1, reserveId: reserve.id } });
  const mid = reduceNrlCareer(half, { type: 'reachMinute60', year: 2026, round: 1, tactic: 'balanced' });
  const fence = fenceKeyOf(NRL_SAVE_KEY);
  localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(mid));
  localStorage.setItem(fence, '4');
  render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);

  const choice = screen.getByRole('checkbox', { name: `Bring on ${reserve.name}` });
  expect(choice).not.toBeChecked();
  fireEvent.click(choice);
  expect(choice).toBeChecked();
  expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(JSON.stringify(mid));
  expect(localStorage.getItem(fence)).toBe('4');
  fireEvent.click(screen.getByRole('button', { name: 'Play final 20 minutes' }));
  const settled = reduceNrlCareer(mid, { type: 'finishMinute60', year: 2026, round: 1, tactic: 'balanced', reserveId: reserve.id });
  expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(JSON.stringify(settled));
  expect(localStorage.getItem(fence)).toBe('5');
  expect(screen.getByText(`${reserve.name} came on for ${starter.name} after 60 minutes.`)).toBeVisible();
});

it.each([
  [690, 'Field-goal setup produced a two-point kick in regulation.'],
  [20, 'No field goal in regulation after the setup.'],
] as const)('reopens the confirmed field-goal plan for seed %i in the saved report', (seed, label) => {
  const before = createNrlCareer('broncos', seed);
  const half = reduceNrlCareer(before, { type: 'startLive' });
  const mid = reduceNrlCareer(half, { type: 'reachMinute60', year: 2026, round: 1, tactic: 'balanced' });
  const fence = fenceKeyOf(NRL_SAVE_KEY);
  localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(mid));
  localStorage.setItem(fence, '4');
  const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  const view = show();
  const choice = screen.getByRole('checkbox', { name: 'Set up a field goal' });
  expect(choice).not.toBeChecked();
  fireEvent.click(choice);
  expect(choice).toBeChecked();
  const score60 = screen.getByRole('list', { name: 'Score after 60 minutes' }).textContent;
  expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(JSON.stringify(mid));
  expect(localStorage.getItem(fence)).toBe('4');
  view.unmount();
  show();
  expect(screen.getByRole('list', { name: 'Score after 60 minutes' }).textContent).toBe(score60);
  const reloaded = screen.getByRole('checkbox', { name: 'Set up a field goal' });
  expect(reloaded).not.toBeChecked();
  fireEvent.click(reloaded);
  fireEvent.click(screen.getByRole('button', { name: 'Play final 20 minutes' }));
  const expected = reduceNrlCareer(mid, { type: 'finishMinute60', year: 2026, round: 1, tactic: 'balanced', fieldGoalPlan: true });
  const bytes = JSON.stringify(expected);
  expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(bytes);
  expect(localStorage.getItem(fence)).toBe('5');
  const latest = within(screen.getByRole('region', { name: 'Full time' }));
  expect(latest.getByText(label)).toBeVisible();
  const fixtures = screen.getByText('Season fixtures', { exact: true });
  fireEvent.click(fixtures);
  const summary = within(fixtures.closest('details')!).getByText('Round 1 match report', { exact: true });
  const report = summary.closest('details')!;
  fireEvent.click(summary);
  fireEvent(report, new Event('toggle'));
  expect(within(report).getByText(label)).toBeVisible();
  expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(bytes);
});
