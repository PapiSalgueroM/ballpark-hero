import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
  vi.restoreAllMocks();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

const fence = fenceKeyOf(NRL_SAVE_KEY);
const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
const fullTime = () => fireEvent.click(screen.getByRole('button', { name: 'Play second half' }));
const choose = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const saved = () => localStorage.getItem(NRL_SAVE_KEY);

it('previews without a save and shows the recorded talk in the result after reload', () => {
  const pending = reduceNrlCareer(createNrlCareer('broncos', 4), { type: 'startLive' });
  const pendingBytes = JSON.stringify(pending);
  localStorage.setItem(NRL_SAVE_KEY, pendingBytes);
  localStorage.setItem(fence, '4');
  const view = show();
  const choices = within(screen.getByRole('group', { name: 'Half-time team talk' }));
  expect(choices.getByRole('button', { name: 'No team talk' })).toHaveAttribute('aria-pressed', 'true');
  choose('Lift the tempo');
  expect(choices.getByRole('button', { name: 'Lift the tempo' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Second-half regulation: +3 attack, -1 defence.')).toBeVisible();
  expect(saved()).toBe(pendingBytes);
  expect(localStorage.getItem(fence)).toBe('4');
  fullTime();
  expect(screen.getByText('Half-time talk: Lift the tempo.')).toBeVisible();
  const expected = reduceNrlCareer(pending, { type: 'finishLive', year: 2026, round: 1, tactic: 'balanced', talk: 'liftTempo' });
  expect(saved()).toBe(JSON.stringify(expected));
  expect(localStorage.getItem(fence)).toBe('5');
  view.unmount();
  show();
  expect(screen.getByText('Half-time talk: Lift the tempo.')).toBeVisible();
});

it('does not overwrite a result committed by another tab and retries one unsaved result after quota failure', () => {
  const pending = reduceNrlCareer(createNrlCareer('bears', 7, 2027), { type: 'startLive' });
  const finish = { type: 'finishLive', year: 2027, round: 1, tactic: 'balanced' } as const;
  const pendingBytes = JSON.stringify(pending);
  localStorage.setItem(NRL_SAVE_KEY, pendingBytes);
  localStorage.setItem(fence, '4');
  const stale = show();
  choose('Reinforce the basics');
  const newer = JSON.stringify(reduceNrlCareer(pending, finish));
  localStorage.setItem(NRL_SAVE_KEY, newer);
  fullTime();
  expect(screen.getByRole('button', { name: 'Reload your season' })).toBeVisible();
  expect(saved()).toBe(newer);
  stale.unmount();
  saveFence.release(NRL_SAVE_KEY);

  localStorage.setItem(NRL_SAVE_KEY, pendingBytes);
  localStorage.setItem(fence, '4');
  show();
  choose('Reinforce the basics');
  const setItem = Storage.prototype.setItem;
  const quota = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    if (key === NRL_SAVE_KEY) throw new DOMException('Quota full', 'QuotaExceededError');
    setItem.call(this, key, value);
  });
  fullTime();
  expect(saved()).toBe(pendingBytes);
  expect(screen.getByText('Half-time talk: Reinforce the basics.')).toBeVisible();
  quota.mockRestore();
  choose('Retry save');
  expect(saved()).toBe(JSON.stringify(reduceNrlCareer(pending, { ...finish, talk: 'reinforceBasics' })));
  expect(localStorage.getItem(fence)).toBe('5');
});
