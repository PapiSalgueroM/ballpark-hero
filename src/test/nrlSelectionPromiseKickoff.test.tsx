import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, nrlCareerMarket, nrlSelectionPromise, readNrlCareerSave, reduceNrlCareer } from '@/lib/nrlCareer';
import { NRL_SAVE_KEY, nrlUnavailable } from '@/lib/nrlManager';
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
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
const rotation = () => within(screen.getByText('Hold one reserve for later', { exact: true }).closest('details')!);
const note = () => within(rotation().getByRole('region', { name: 'Selection promise' }));
const cases = [
  { year: 2026, clubId: 'broncos', seed: 31, round: 7, player: 'Arlo Dawson', playerId: 'broncos-2-1', asking: 375000, lower: 356250 },
  { year: 2027, clubId: 'bears', seed: 64, round: 6, player: 'Tama Dawson', playerId: 'bears-11-1', asking: 334676, lower: 317943 },
] as const;

function openLate(year: 2026 | 2027, clubId: string, seed: number, round: number, playerId: string) {
  const initial = reduceNrlCareer(createNrlCareer(clubId, seed, year), { type: 'makeSelectionPromise', year, clubId, round: 1, playerId });
  expect(initial.selectionPromise?.playerId).toBe(playerId);
  let career = initial;
  for (let step = 1; step < round; step++) career = reduceNrlCareer(career, { type: 'advance' });
  localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(career));
  localStorage.setItem(fence, '4');
  const view = show();
  return { career, initial, view };
}

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

it.each(['quick', 'on', 'off'] as const)('previews the promise then settles the true %s outcome', mode => {
  const { year, clubId, seed, round, player, playerId, asking, lower } = cases[mode === 'quick' ? 0 : 1];
  const { career, view } = openLate(year, clubId, seed, round, playerId);
  const bytes = JSON.stringify(career);
  expect(nrlSelectionPromise(career)).toMatchObject({ appearances: 3, eligible: 5, status: 'pending' });
  expect(nrlCareerMarket(career).find(row => row.player.id === playerId)?.askingSalary).toBe(asking);
  const toggle = rotation().getByText('Hold one reserve for later');
  expect(toggle.closest('details')).not.toHaveAttribute('open');
  fireEvent.click(toggle);
  expect(note().getByText(player)).toBeVisible();
  expect(note().getByText('3 of 4 appearances in 5 of 6 eligible matches')).toBeVisible();
  expect(note().getByText('Quick Sim: In rotation')).toBeVisible();
  if (mode !== 'quick') {
    fireEvent.change(rotation().getByLabelText('Opening rotation'), { target: { value: playerId } });
    expect(note().getByText('Live: Held for later')).toBeVisible();
    expect(note().getByText(/An eligible match still counts toward the promise window/)).toBeVisible();
  }
  expect(raw()).toBe(bytes);
  expect(localStorage.getItem(fence)).toBe('4');
  if (mode === 'quick') click('Quick Sim');
  else {
    click('Play Live');
    if (mode === 'on') {
      const swap = screen.getByLabelText('Reserve to finish the match');
      fireEvent.click(swap.closest('details')!.querySelector('summary')!);
      fireEvent.change(swap, { target: { value: playerId } });
    }
    click('Play second half');
  }
  const settled = readNrlCareerSave(raw())!;
  const miss = mode === 'off';
  expect(nrlSelectionPromise(settled)).toMatchObject({ appearances: miss ? 3 : 4, eligible: 6, status: miss ? 'missed' : 'kept' });
  expect(nrlCareerMarket(settled).find(row => row.player.id === playerId)?.askingSalary).toBe(miss ? asking : lower);
  const result = settled.season.results.find(match => match.round === round && (match.homeId === clubId || match.awayId === clubId))!;
  expect(result.benchUsed?.includes(playerId)).toBe(!miss);
  const settledBytes = raw();
  view.unmount();
  show();
  click('Club office');
  click('Contracts');
  const summary = screen.getByText('Selection promise', { selector: 'summary span' });
  fireEvent.click(summary);
  expect(within(summary.closest('details')!).getByRole('status')).toHaveTextContent(miss ? 'Promise missed' : 'Promise kept');
  expect(raw()).toBe(settledBytes);
  expect(localStorage.getItem(fence)).toBe(mode === 'quick' ? '5' : '6');
});

it('shows unavailability without consuming an eligible chance', () => {
  const playerId = 'broncos-5-1';
  const { career } = openLate(2026, 'broncos', 55, 7, playerId);
  const progress = nrlSelectionPromise(career);
  expect(progress).toMatchObject({ appearances: 2, eligible: 5, status: 'pending' });
  expect(nrlUnavailable(career.season).has(playerId)).toBe(true);
  fireEvent.click(rotation().getByText('Hold one reserve for later'));
  expect(note().getByText('Levi Nairn')).toBeVisible();
  expect(note().getByText('Unavailable for this match. It will not count toward the promise window.')).toBeVisible();
  click('Quick Sim');
  expect(nrlSelectionPromise(readNrlCareerSave(raw())!)).toEqual(progress);
});

it('keeps the early promise out of the kickoff drawer and byes out of the window', () => {
  const opening = createNrlCareer('panthers', 2);
  const playerId = nrlCareerMarket(opening).find(row => row.kind === 'renewal' && row.startYear === 2027)!.player.id;
  const { initial } = openLate(2026, 'panthers', 2, 1, playerId);
  expect(screen.queryByRole('region', { name: 'Selection promise' })).not.toBeInTheDocument();
  click('Simulate bye round');
  const afterBye = readNrlCareerSave(raw())!;
  expect(nrlSelectionPromise(afterBye)).toEqual(nrlSelectionPromise(initial));
  fireEvent.click(rotation().getByText('Hold one reserve for later'));
  expect(rotation().queryByRole('region', { name: 'Selection promise' })).not.toBeInTheDocument();
});
