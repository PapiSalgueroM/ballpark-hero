import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, nrlAwayRecoveryQuote, readNrlCareerSave, reduceNrlCareer } from '@/lib/nrlCareer';
import { NRL_SAVE_KEY } from '@/lib/nrlManager';
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

function setup() {
  const state = reduceNrlCareer(createNrlCareer('broncos', 1), { type: 'prepare', choice: 'train' });
  const player = state.season.squad.find(candidate => candidate.id === state.season.lineup.Halfback)!;
  const fence = fenceKeyOf(NRL_SAVE_KEY);
  localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(state));
  localStorage.setItem(fence, '4');
  const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  return { state, player, fence, show };
}

function playerPicker() {
  const control = screen.getByText(/^Individual recovery/i, { selector: 'span' }).closest('details');
  control?.setAttribute('open', '');
  return screen.getByRole('combobox', { name: /player on lighter training/i });
}

it('shows the fitness preview, restores selection on reload and reports actual completion', () => {
  const { state, player, fence, show } = setup();
  const initial = show();
  fireEvent.change(playerPicker(), { target: { value: player.id } });
  const action = { type: 'setIndividualRecovery', year: 2026, round: 1, clubId: 'broncos', playerId: player.id } as const;
  const planned = reduceNrlCareer(state, action);
  expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(JSON.stringify(planned));
  expect(localStorage.getItem(fence)).toBe('5');
  expect(screen.getByText(/96% with team training, 100% with individual recovery/i)).toBeInTheDocument();
  initial.unmount();
  show();
  expect(playerPicker()).toHaveValue(player.id);
  fireEvent.click(screen.getByRole('button', { name: /quick sim/i }));
  expect(screen.getByText(new RegExp(`${player.name} took individual recovery`, 'i'))).toBeVisible();
  expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(JSON.stringify(reduceNrlCareer(planned, { type: 'advance' })));
});

it('retains the other tab’s match when an old page tries to queue recovery', () => {
  const { state, player, fence, show } = setup();
  show();
  const live = reduceNrlCareer(state, { type: 'startLive' });
  const bytes = JSON.stringify(live);
  localStorage.setItem(NRL_SAVE_KEY, bytes);
  localStorage.setItem(fence, '5');
  fireEvent.change(playerPicker(), { target: { value: player.id } });
  expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(bytes);
  expect(localStorage.getItem(fence)).toBe('5');
  expect(screen.getByText(/this season changed in another tab/i)).toBeVisible();
});

it('quotes and saves one paid away recovery session before playing', () => {
  let before = createNrlCareer('broncos', 1, 2026);
  while (before.season.round < 4) before = reduceNrlCareer(before, { type: 'advance' });
  const bytes = JSON.stringify(before);
  const fence = fenceKeyOf(NRL_SAVE_KEY);
  localStorage.setItem(NRL_SAVE_KEY, bytes);
  localStorage.setItem(fence, '4');
  const draw = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  const first = draw();
  const panel = () => within(screen.getByRole('region', { name: 'Away recovery session' }));
  const quote = nrlAwayRecoveryQuote(before)!;
  expect(panel().getByText(`Average starter fitness at kickoff ${quote.normalFitness}% → ${quote.bookedFitness}%`)).toBeVisible();
  fireEvent.click(panel().getByRole('button', { name: /Book for/ }));
  const booked = reduceNrlCareer(before, { type: 'bookAwayRecovery', year: 2026, clubId: 'broncos', round: 4 });
  expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(JSON.stringify(booked));
  expect(localStorage.getItem(fence)).toBe('5');
  first.unmount();
  draw();
  expect(panel().getByText(/Booked for this match/)).toBeVisible();
  expect(panel().queryByRole('button')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Quick Sim' }));
  expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(JSON.stringify(reduceNrlCareer(booked, { type: 'advance' })));
  expect(localStorage.getItem(fence)).toBe('6');
});

it('keeps the better fit starter in the away recovery lineup preview after reload', () => {
  let before = createNrlCareer('bulldogs', 11);
  while (before.season.round < 6) before = reduceNrlCareer(before, { type: 'advance' });
  localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(before));
  localStorage.setItem(fenceKeyOf(NRL_SAVE_KEY), '4');
  const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
  const proposal = () => {
    const summary = screen.getByText('Suggest a fit lineup');
    fireEvent.click(summary);
    return within(summary.closest('details')!);
  };

  const first = show();
  click('Squad');
  expect(proposal().getByText('Arlo Forde → Callum Rowan')).toBeVisible();
  click('Match centre');
  const recovery = within(screen.getByRole('region', { name: 'Away recovery session' }));
  fireEvent.click(recovery.getByRole('button', { name: /Book for/ }));
  const booked = localStorage.getItem(NRL_SAVE_KEY);
  first.unmount();

  show();
  click('Squad');
  const updated = proposal();
  expect(updated.queryByText('Arlo Forde → Callum Rowan')).not.toBeInTheDocument();
  expect(updated.getByText('Coby Marlow → Keanu Rourke')).toBeVisible();
  expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(booked);
  fireEvent.click(updated.getByRole('button', { name: 'Apply fit lineup' }));
  const applied = readNrlCareerSave(localStorage.getItem(NRL_SAVE_KEY))!;
  expect(applied.season.lineup).toMatchObject({ Fullback: 'nrl-bulldogs-2026-26', Lock: 'bulldogs-13-0' });
  click('Match centre');
  click('Quick Sim');
  const played = readNrlCareerSave(localStorage.getItem(NRL_SAVE_KEY))!;
  const match = played.season.results.find(row => row.round === 6 && row.awayId === 'bulldogs')!;
  expect(match.playerScoring!.starters).toContain('bulldogs-13-0');
  expect(match.playerScoring!.starters).not.toContain('bulldogs-13-1');
});
