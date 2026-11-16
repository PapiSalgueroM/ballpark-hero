import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, reduceNrlCareer } from '@/lib/nrlCareer';
import { nrlHalftimeInterchanges, NRL_SAVE_KEY } from '@/lib/nrlManager';
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

it('previews two distinct positions without saving, then shows both full-time outcomes after reload', () => {
  const initial = createNrlCareer('broncos', 76);
  const pending = reduceNrlCareer(initial, {
    type: 'startLive', hold: { year: 2026, round: 1, reserveId: 'nrl-broncos-2026-28' },
  });
  const half = JSON.stringify(pending);
  localStorage.setItem(NRL_SAVE_KEY, half);
  const fence = fenceKeyOf(NRL_SAVE_KEY);
  localStorage.setItem(fence, '4');
  const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  const view = show();
  fireEvent.click(screen.getByText('Halftime interchange', { exact: true }));
  const first = screen.getByRole('combobox', { name: 'Reserve to finish the match' });
  const options = nrlHalftimeInterchanges(pending.season);
  const rotating = options.find(choice => !choice.enteredAtHalf)!;
  const entering = options.find(choice => choice.enteredAtHalf)!;
  fireEvent.change(first, { target: { value: rotating.reserveId } });
  const second = screen.getByRole('combobox', { name: 'Second reserve to finish the match' });
  expect(Array.from((second as HTMLSelectElement).options).some(option => option.value === rotating.reserveId)).toBe(false);
  fireEvent.change(second, { target: { value: entering.reserveId } });
  fireEvent.change(first, { target: { value: entering.reserveId } });
  expect(second).toHaveValue('');
  fireEvent.change(first, { target: { value: rotating.reserveId } });
  fireEvent.change(second, { target: { value: entering.reserveId } });
  expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(half);
  expect(localStorage.getItem(fence)).toBe('4');
  fireEvent.click(screen.getByRole('button', { name: 'Play second half' }));
  const expected = reduceNrlCareer(pending, {
    type: 'finishLive', year: 2026, round: 1, tactic: 'balanced', interchange: rotating, secondInterchange: entering,
  });
  expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(JSON.stringify(expected));
  expect(localStorage.getItem(fence)).toBe('5');
  const verifyReport = () => {
    expect(screen.getByText(/came on for .* at half time\. Each played about 40 minutes/)).toBeVisible();
    expect(screen.getByText(/finished the match\. In regulation, they played about 53 minutes/)).toBeVisible();
  };
  verifyReport();
  view.unmount();
  show();
  verifyReport();
});

it('opts a new club career in and saves the selected injury replacement through the full-time report', () => {
  const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  const first = show();
  const seed = vi.spyOn(Math, 'random').mockReturnValue(4 / 0x1_0000_0000);
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Manage Brisbane Broncos' }));
  } finally {
    seed.mockRestore();
  }
  const raw = () => localStorage.getItem(NRL_SAVE_KEY)!;
  expect(JSON.parse(raw()).season).toMatchObject({ seed: 4, halftimeInjuryCover: true });
  first.unmount();

  const original = createNrlCareer('broncos', 4);
  const year = 2026, clubId = 'broncos', round = 1, playerId = 'nrl-broncos-2026-26';
  const marked = { ...original, season: { ...original.season, halftimeInjuryCover: true as const } };
  const named = reduceNrlCareer(marked, { type: 'selectBench', slot: 4, playerId });
  const open = reduceNrlCareer(named, { type: 'setOpenInterchange', year, clubId, round, enabled: true });
  const starter = open.season.squad.find(player => player.id === 'broncos-1-0')!;
  const reserve = open.season.squad.find(player => player.id === playerId)!;
  saveFence.release(NRL_SAVE_KEY);
  localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(open));
  const view = show();
  fireEvent.click(screen.getByRole('button', { name: 'Play Live' }));
  const half = raw();
  expect(screen.getByText(starter.name + ' came off with a knock.')).toBeVisible();
  view.unmount();
  saveFence.release(NRL_SAVE_KEY);
  const resumed = show();
  expect(raw()).toBe(half);
  const replacement = screen.getByRole('combobox', { name: 'Injury replacement' });
  expect(replacement).toHaveValue('broncos-1-1');
  fireEvent.change(replacement, { target: { value: reserve.id } });
  expect(raw()).toBe(half);
  fireEvent.click(screen.getByRole('button', { name: 'Play second half' }));

  const report = () => {
    expect(screen.getByText(starter.name + ' went off at half time with a knock and will miss 3 rounds.')).toBeVisible();
    expect(screen.getByText(reserve.name + ' came on for ' + starter.name + ' at half time. Each played about 40 minutes in regulation.')).toBeVisible();
  };
  report();
  const settled = raw();
  resumed.unmount();
  saveFence.release(NRL_SAVE_KEY);
  show();
  expect(raw()).toBe(settled);
  report();
});
