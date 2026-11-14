import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, readNrlCareerSave } from '@/lib/nrlCareer';
import { createNrlSeason, NRL_ROLES, NRL_SAVE_KEY, nrlHoldableReserves, reduceNrlSeason } from '@/lib/nrlManager';
import { nrlScorePoints } from '@/lib/nrlPlayerScoring';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const fenceKey = fenceKeyOf(NRL_SAVE_KEY);
const getSave = () => localStorage.getItem(NRL_SAVE_KEY);
const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
const open = (bytes: string) => {
  localStorage.setItem(NRL_SAVE_KEY, bytes);
  localStorage.setItem(fenceKey, '4');
  return show();
};

function openSavedReport() {
  const fixtures = screen.getByText('Season fixtures', { exact: true });
  fireEvent.click(fixtures);
  const summary = within(fixtures.closest('details')!).getByText('Round 1 match report', { exact: true });
  const report = summary.closest('details')!;
  fireEvent.click(summary);
  fireEvent(report, new Event('toggle'));
  return within(report);
}

function verifyTeamSheet(report: ReturnType<typeof within>, bytes: string) {
  const career = readNrlCareerSave(bytes)!;
  const { clubId, results, squad } = career.season;
  const result = results.find(match => match.homeId === clubId || match.awayId === clubId)!;
  const receipt = result.playerScoring!;
  const clubScore = result.homeId === clubId ? result.homeScore : result.awayScore;
  const fence = localStorage.getItem(fenceKey);
  const summary = report.getByText('Matchday team sheet', { exact: true });
  const details = summary.closest('details')!;
  expect(details).not.toHaveAttribute('open');
  expect(within(details).queryByRole('list')).not.toBeInTheDocument();
  fireEvent.click(summary);
  fireEvent(details, new Event('toggle'));
  expect(details).toHaveAttribute('open');
  const view = within(details);
  const starters = within(view.getByRole('list', { name: 'Starting 13' })).getAllByRole('listitem');
  const reserves = within(view.getByRole('list', { name: 'Reserves used' })).getAllByRole('listitem');
  expect(starters.map(row => row.getAttribute('data-nrl-team-sheet-player'))).toEqual(receipt.starters);
  expect(reserves.map(row => row.getAttribute('data-nrl-team-sheet-player'))).toEqual(result.benchUsed);
  expect(starters.some(row => row.textContent?.includes('0 pts'))).toBe(true);
  let total = 0;
  [...starters, ...reserves].forEach((row, index) => {
    const id = row.getAttribute('data-nrl-team-sheet-player');
    const player = squad.find(player => player.id === id)!;
    const scoring = receipt.lines.find(line => line.playerId === id);
    const points = scoring ? nrlScorePoints(scoring) : 0;
    total += points;
    expect(within(row).getByText(player.name, { exact: true })).toBeVisible();
    expect(within(row).getByText(`${points} pts`, { exact: true })).toBeVisible();
    if (index < NRL_ROLES.length) expect(row).toHaveTextContent(NRL_ROLES[index]);
    expect(Boolean(within(row).queryByText('Goal kicker', { exact: true }))).toBe(id === receipt.kickerId);
  });
  expect(total).toBe(clubScore);
  expect(getSave()).toBe(bytes);
  expect(localStorage.getItem(fenceKey)).toBe(fence);
}

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

it('lists the exact 2026 Quick Sim starters and reserves on latest and saved reports', () => {
  const initial = createNrlCareer('broncos', 1, 2026);
  const page = open(JSON.stringify(initial));
  expect(screen.queryByText('Matchday team sheet')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Quick Sim' }));
  const bytes = getSave()!;
  verifyTeamSheet(within(screen.getByRole('region', { name: 'Round 1 results' })), bytes);
  page.unmount();
  show();
  verifyTeamSheet(openSavedReport(), bytes);
});

it.each([false, true])('records only live participants when the held reserve was brought on (%s)', entered => {
  const initial = createNrlCareer('bears', 17, 2027);
  const reserve = nrlHoldableReserves(initial.season)[0];
  const page = open(JSON.stringify(initial));
  fireEvent.click(screen.getByText('Hold one reserve for later', { exact: true }));
  fireEvent.change(screen.getByLabelText('Opening rotation'), { target: { value: reserve.id } });
  fireEvent.click(screen.getByRole('button', { name: 'Play Live' }));
  expect(screen.queryByText('Matchday team sheet')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Play to 60 minutes' }));
  if (entered) fireEvent.change(screen.getByRole('combobox', { name: 'Reserve to bring on' }), { target: { value: reserve.id } });
  fireEvent.click(screen.getByRole('button', { name: 'Play final 20 minutes' }));
  const bytes = getSave()!;
  const result = readNrlCareerSave(bytes)!.season.results.find(match => match.homeId === 'bears' || match.awayId === 'bears')!;
  expect(result.benchUsed?.includes(reserve.id)).toBe(entered);
  expect(result.minute60Interchange?.reserveId).toBe(entered ? reserve.id : undefined);
  verifyTeamSheet(within(screen.getByRole('region', { name: 'Full time' })), bytes);
  page.unmount();
  show();
  verifyTeamSheet(openSavedReport(), bytes);
});

it('keeps the score in legacy match reports without a saved player sheet', () => {
  const legacy = reduceNrlSeason(createNrlSeason('storm', 17), { type: 'advance' });
  const match = legacy.results.find(match => match.homeId === 'storm' || match.awayId === 'storm')!;
  expect(match.playerScoring).toBeUndefined();
  const bytes = JSON.stringify(legacy);
  open(bytes);
  const score = new RegExp(String(match.homeScore) + '\\s*' + String.fromCharCode(0x2013) + '\\s*' + match.awayScore);
  const latest = within(screen.getByRole('region', { name: 'Round 1 results' }));
  expect(latest.getByRole('status')).toHaveTextContent(score);
  expect(latest.queryByText('Matchday team sheet')).not.toBeInTheDocument();
  const report = openSavedReport();
  expect(report.getByText(score)).toBeVisible();
  expect(report.queryByText('Matchday team sheet')).not.toBeInTheDocument();
  expect(getSave()).toBe(bytes);
  expect(localStorage.getItem(fenceKey)).toBe('4');
});
