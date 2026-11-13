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
