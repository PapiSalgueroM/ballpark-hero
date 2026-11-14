import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer } from '@/lib/nrlCareer';
import { NRL_SAVE_KEY } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const raw = () => localStorage.getItem(NRL_SAVE_KEY);
const playerPicker = () => screen.getByRole('combobox', { name: 'Club captain' });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const fence = fenceKeyOf(NRL_SAVE_KEY);

function setup() {
  const state = createNrlCareer('broncos', 1);
  const player = state.season.squad.find(candidate => candidate.id === state.season.lineup.Hooker)!;
  localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(state));
  localStorage.setItem(fence, '4');
  const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  return { state, player, show };
}

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

it('saves a captain and shows the true match captain after a mobile-style reload', () => {
  const { player, show } = setup();
  const first = show();
  click('Squad');
  expect(playerPicker()).toHaveAccessibleDescription(/adds 1 defence/i);
  fireEvent.change(playerPicker(), { target: { value: player.id } });
  expect(localStorage.getItem(fence)).toBe('5');
  expect(readNrlCareerSave(raw())?.season.captainId).toBe(player.id);
  first.unmount();
  show();
  click('Squad');
  expect(playerPicker()).toHaveValue(player.id);
  click('Match centre');
  click('Play Live');
  click('Squad');
  expect(playerPicker()).toBeDisabled();
  click('Match centre');
  click('Play second half');
  expect(screen.getByText(`Club captain: ${player.name}.`)).toBeVisible();
  expect(readNrlCareerSave(raw())?.season.captainId).toBe(player.id);
});

it('preserves another tab’s match instead of saving a stale captain choice', () => {
  const { state, player, show } = setup();
  show();
  click('Squad');
  const saved = JSON.stringify(reduceNrlCareer(state, { type: 'startLive' }));
  localStorage.setItem(NRL_SAVE_KEY, saved);
  localStorage.setItem(fence, '5');
  fireEvent.change(playerPicker(), { target: { value: player.id } });
  expect(raw()).toBe(saved);
  expect(localStorage.getItem(fence)).toBe('5');
  expect(screen.getByText(/this season changed in another tab/i)).toBeVisible();
});

it('names the acting vice-captain at kickoff and in a reloaded match report', () => {
  const { state, player, show } = setup();
  const appointed = state.season.squad.find(candidate => candidate.id === state.season.lineup.Lock)!;
  const replacement = state.season.squad.find(candidate => candidate.role === 'Hooker' && candidate.id !== player.id)!;
  const view = show();
  click('Squad');
  fireEvent.change(playerPicker(), { target: { value: player.id } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Vice-captain' }), { target: { value: appointed.id } });
  fireEvent.change(screen.getByLabelText('Hooker', { exact: true }), { target: { value: replacement.id } });
  const chosen = readNrlCareerSave(raw())!;
  expect(chosen.season.captainId).toBe(player.id);
  expect(chosen.season.viceCaptainId).toBe(appointed.id);
  click('Match centre');
  expect(screen.getByText('Acting captain · ' + appointed.name)).toBeVisible();
  click('Quick Sim');
  expect(screen.getByText('Kickoff · ' + appointed.name + ' (vice-captain)')).toBeVisible();
  const settled = raw();
  view.unmount();
  show();
  expect(screen.getByText('Kickoff · ' + appointed.name + ' (vice-captain)')).toBeVisible();
  expect(raw()).toBe(settled);
});
