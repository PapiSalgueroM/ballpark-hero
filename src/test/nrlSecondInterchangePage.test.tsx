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
