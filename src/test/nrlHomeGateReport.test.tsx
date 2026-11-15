import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, nrlHomeGateReport, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, NRL_SAVE_KEY, reduceNrlSeason } from '@/lib/nrlManager';
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

const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });
const report = (career: NrlCareerState, round: number) => nrlHomeGateReport(career, career.season.results.find(
  match => match.round === round && (match.homeId === career.season.clubId || match.awayId === career.season.clubId))!);

function atReview(attendance = false) {
  const year = 2026, clubId = 'storm';
  let career = reduceNrlCareer(createNrlCareer(clubId, 4, year), { type: 'setTicketTier', year, round: 1, tier: 'value' });
  if (attendance) career = reduceNrlCareer(career, { type: 'setSupporterAttendance', year, clubId, enabled: true });
  while (career.season.round < 14) career = advance(career);
  return reduceNrlCareer(career, { type: 'reviewTicketTier', year, clubId, round: 14, tier: 'premium' });
}

it.each([false, true])('reconciles every saved home gate with the book, with supporter attendance %s', attendance => {
  const first = atReview(attendance);
  const past = report(first, 1);
  expect(past?.tier).toBe('value');
  expect(past?.priceChange).toBeUndefined();
  const played = advance(first);
  expect(report(played, 14)).toEqual({
    tier: 'premium', amount: played.finance.gateReceipts - first.finance.gateReceipts,
    priceChange: attendance ? 28_000 : 40_000,
  });
  let completed = played;
  while (completed.season.phase !== 'complete') completed = advance(completed);
  const saved = JSON.stringify(completed);
  const loaded = readNrlCareerSave(saved)!;
  expect(JSON.stringify(loaded)).toBe(saved);
  const receipts = loaded.season.results.map(match => nrlHomeGateReport(loaded, match));
  const homeCount = loaded.season.results.filter(match => match.homeId === 'storm' && match.tieId !== 'GF').length;
  expect(receipts.filter(Boolean)).toHaveLength(homeCount);
  expect(receipts.reduce((sum, receipt) => sum + (receipt?.amount ?? 0), 0)).toBe(loaded.finance.gateReceipts);
  expect(report(loaded, 1)).toEqual(past);
  expect(report(loaded, 13)).toBeNull();
  expect(report(loaded, 20)?.priceChange).toBe(attendance ? -54_000 : -42_000);
  expect(report(loaded, 30)?.priceChange).toBe(attendance ? 60_000 : 72_000);
  expect(report(loaded, 31)).toBeNull();
});

it('only shows paid gates from the first round of a legacy finance book', () => {
  const old = reduceNrlSeason(createNrlSeason('storm', 4), { type: 'advance' });
  const imported = readNrlCareerSave(JSON.stringify(old))!;
  expect(imported.legacySeason).toBe(true);
  expect(imported.finance.fromRound).toBe(2);
  expect(report(imported, 1)).toBeNull();
  const career = advance(imported);
  expect(career.finance.gateReceipts).toBe(270_000);
  expect(report(career, 2)).toEqual({ tier: 'standard', amount: 270_000 });
  expect(report(career, 1)).toBeNull();
});

it('shows the credited gate and ticket review difference in both match reports', () => {
  const career = atReview();
  localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(career));
  localStorage.setItem(fenceKeyOf(NRL_SAVE_KEY), '4');
  const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  const view = show();
  fireEvent.click(screen.getByRole('button', { name: 'Quick Sim' }));
  const receipt = 'Gate receipts $288,000 · Premium ticket prices';
  const difference = '+$40,000 compared with opening prices.';
  expect(screen.getByText(receipt)).toBeVisible();
  expect(screen.getByText(difference)).toBeVisible();

  view.unmount();
  show();
  fireEvent.click(screen.getByText('Season fixtures', { exact: true }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Fixtures to show' }), { target: { value: '14' } });
  const summary = screen.getByText('Round 14 match report', { exact: true });
  const saved = summary.closest('details')!;
  fireEvent.click(summary);
  fireEvent(saved, new Event('toggle'));
  const details = within(saved);
  expect(details.getByText(receipt)).toBeVisible();
  expect(details.getByText(difference)).toBeVisible();
});
