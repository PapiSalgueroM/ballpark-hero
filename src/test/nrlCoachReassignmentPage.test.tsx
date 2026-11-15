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

const year = 2026, clubId = 'broncos', round = 7;
const fence = fenceKeyOf(NRL_SAVE_KEY);
const action = { type: 'reassignCoach', year, clubId, round } as const;
const raw = () => localStorage.getItem(NRL_SAVE_KEY);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const receipt = 'Quill Redfern moved to Defence in Round 7. Fee paid $60,000.';

function fixture() {
  let career = reduceNrlCareer(createNrlCareer(clubId, 5, year), { type: 'hireCoach', role: 'attack', year, round: 1 });
  while (career.season.round < round) career = reduceNrlCareer(career, { type: 'advance' });
  return reduceNrlCareer(career, { type: 'setTactic', tactic: 'defense' });
}

function mount() {
  return render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
}

function openFinances() {
  click('Club office');
  click('Finances');
  fireEvent.click(screen.getByText('Coaching staff', { selector: 'summary', exact: true }));
}

function preview() {
  const summary = screen.getByText('Review assistant reassignment', { selector: 'summary', exact: true });
  fireEvent.click(summary);
  return within(summary.closest('details')!);
}

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

it('previews the cost, saves the reassignment once and restores its receipt', () => {
  const initial = fixture();
  const opening = JSON.stringify(initial);
  localStorage.setItem(NRL_SAVE_KEY, opening);
  localStorage.setItem(fence, '4');
  const first = mount();
  openFinances();
  expect(screen.getByText('Quill Redfern · Attack assistant')).toBeVisible();
  const panel = preview();
  expect(panel.getByText(/^Move Quill Redfern to Defence for the rest of this season/)).toBeVisible();
  expect(panel.getByText(/^Pay \$60,000 from club cash/)).toBeVisible();
  expect(raw()).toBe(opening);
  expect(localStorage.getItem(fence)).toBe('4');

  click('Confirm assistant reassignment');
  const reassigned = reduceNrlCareer(initial, action);
  expect(raw()).toBe(JSON.stringify(reassigned));
  expect(localStorage.getItem(fence)).toBe('5');
  expect(screen.getByRole('heading', { name: /^Assistant reassignment$/ })).toHaveFocus();
  expect(screen.getByText(receipt)).toBeVisible();
  first.unmount();

  mount();
  openFinances();
  expect(screen.getByText('Quill Redfern · Defence assistant')).toBeVisible();
  expect(screen.getByText(receipt)).toBeVisible();
  expect(screen.queryByText('Review assistant reassignment')).toBeNull();
  expect(raw()).toBe(JSON.stringify(reassigned));
  expect(localStorage.getItem(fence)).toBe('5');
  click('Match centre');
  click('Quick Sim');
  expect(raw()).toBe(JSON.stringify(reduceNrlCareer(reassigned, { type: 'advance' })));
  expect(localStorage.getItem(fence)).toBe('6');
});

it('keeps a newer save if it changes while the reassignment preview is open', () => {
  const initial = fixture();
  localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(initial));
  localStorage.setItem(fence, '4');
  mount();
  openFinances();
  preview();
  const newer = JSON.stringify(reduceNrlCareer(initial, { type: 'advance' }));
  localStorage.setItem(NRL_SAVE_KEY, newer);
  click('Confirm assistant reassignment');
  expect(raw()).toBe(newer);
  expect(localStorage.getItem(fence)).toBe('4');
  expect(screen.getByRole('button', { name: 'Reload your season' })).toBeVisible();
  expect(screen.queryByText(receipt)).toBeNull();
});

it('retries a refused write without deducting the reassignment fee twice', () => {
  const initial = fixture();
  const opening = JSON.stringify(initial);
  localStorage.setItem(NRL_SAVE_KEY, opening);
  localStorage.setItem(fence, '4');
  mount();
  openFinances();
  preview();
  const write = Storage.prototype.setItem;
  const quota = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    if (key === NRL_SAVE_KEY) throw new DOMException('Quota full', 'QuotaExceededError');
    write.call(this, key, value);
  });
  click('Confirm assistant reassignment');
  expect(raw()).toBe(opening);
  expect(localStorage.getItem(fence)).toBe('4');
  quota.mockRestore();
  click('Retry save');
  expect(raw()).toBe(JSON.stringify(reduceNrlCareer(initial, action)));
  expect(localStorage.getItem(fence)).toBe('5');
  expect(screen.getByText(receipt)).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Retry save' })).toBeNull();
});
