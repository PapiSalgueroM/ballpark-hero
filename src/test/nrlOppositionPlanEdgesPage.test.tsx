import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, nrlOppositionReport, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, NRL_SAVE_KEY, type NrlAttackPlan } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const fence = fenceKeyOf(NRL_SAVE_KEY);
const raw = () => localStorage.getItem(NRL_SAVE_KEY);
const format = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 1, signDisplay: 'exceptZero' });
const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
function open(bytes: string) {
  localStorage.setItem(NRL_SAVE_KEY, bytes);
  localStorage.setItem(fence, '6');
  return show();
}
function openDetails(label: RegExp) {
  const summary = screen.getByText(label);
  const details = summary.closest('details')!;
  fireEvent.click(summary);
  fireEvent(details, new Event('toggle'));
  return within(details);
}
function pick(career: NrlCareerState, attackPlan: NrlAttackPlan) {
  const { clubId, round, year } = career.season;
  return reduceNrlCareer(career, { type: 'setAttackPlan', clubId, round, year, attackPlan });
}

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

it.each([
  ['broncos', 1, 2026],
  ['bears', 17, 2027],
] as const)('shows exact available kickoff edges and preserves the signed counter outcome for %s', (clubId, seed, year) => {
  const initial = reduceNrlCareer(createNrlCareer(clubId, seed, year), { type: 'prepare', choice: 'defensiveDrills', year, clubId, round: 1 });
  const bytes = JSON.stringify(initial);
  const mounted = open(bytes);
  const report = openDetails(/^Opposition report$/);
  const comparison = report.getByRole('table', { name: 'Attack plan comparison' });
  const rows = within(comparison).getAllByRole('row').slice(1);
  const choices = [
    ['standard', 'Standard'], ['middle', 'Through the middle'], ['wide', 'Shift wide'], ['counter', 'Counter opponent'],
  ] as const;
  expect(rows).toHaveLength(choices.length);
  choices.forEach(([plan, label], index) => {
    const expected = nrlOppositionReport(pick(initial, plan))!;
    const row = within(rows[index]);
    const [attack, defence] = row.getAllByRole('cell');
    expect(row.getByRole('rowheader')).toHaveTextContent(label);
    expect(attack).toHaveTextContent(format.format(expected.attackEdge));
    expect(defence).toHaveTextContent(format.format(expected.defenseEdge));
    expect(Boolean(row.queryByText('Current'))).toBe(plan === 'standard');
  });
  const standard = nrlOppositionReport(initial)!;
  const counter = pick(initial, 'counter');
  const counterEdges = nrlOppositionReport(counter)!;
  expect(counterEdges.attackEdge).not.toBe(standard.attackEdge);
  expect(counterEdges.defenseEdge).not.toBe(standard.defenseEdge);
  expect(raw()).toBe(bytes);
  expect(localStorage.getItem(fence)).toBe('6');

  const controls = openDetails(/^Attack plan$/);
  fireEvent.click(controls.getByRole('button', { name: /Counter opponent/ }));
  expect(raw()).toBe(JSON.stringify(counter));
  expect(localStorage.getItem(fence)).toBe('7');
  mounted.unmount();
  show();
  const reloaded = openDetails(/^Opposition report$/);
  const selectedRow = within(reloaded.getByRole('table', { name: 'Attack plan comparison' })).getByRole('row', { name: /Counter opponent Current/ });
  expect(selectedRow).toHaveTextContent(format.format(counterEdges.attackEdge));
  expect(selectedRow).toHaveTextContent(format.format(counterEdges.defenseEdge));
  fireEvent.click(screen.getByRole('button', { name: 'Quick Sim' }));
  const saved = readNrlCareerSave(raw())!;
  expect(saved).toEqual(reduceNrlCareer(counter, { type: 'advance' }));
  expect(saved.season.results.find(row => row.homeId === clubId || row.awayId === clubId)?.counterStyle).toBe(counterEdges.style);
  expect(screen.getByText(/^Counter plan:/)).toBeVisible();
});

it('keeps legacy opposition edges without offering unsupported plans', () => {
  const bytes = JSON.stringify(createNrlSeason('broncos', 16));
  open(bytes);
  const report = openDetails(/^Opposition report$/);
  expect(report.getByText('Your attack edge')).toBeVisible();
  expect(report.queryByRole('table', { name: 'Attack plan comparison' })).not.toBeInTheDocument();
  expect(raw()).toBe(bytes);
  expect(localStorage.getItem(fence)).toBe('6');
});
