import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, reduceNrlCareer } from '@/lib/nrlCareer';
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
