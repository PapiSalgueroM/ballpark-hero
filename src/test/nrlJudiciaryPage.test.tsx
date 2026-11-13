import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer } from '@/lib/nrlCareer';
import { nrlJudiciaryCase } from '@/lib/nrlJudiciary';
import { NRL_SAVE_KEY, nrlNextRound } from '@/lib/nrlManager';
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
function open() {
  return render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
}
function pendingCareer() {
  let career = createNrlCareer('storm', 1, 2026, false, true);
  for (let n = 0; n < 31; n++) {
    career = reduceNrlCareer(career, { type: 'advance' });
    if (nrlJudiciaryCase(career.season) && nrlNextRound(career.season).clubMatch) return career;
  }
  throw new Error('No pending judiciary fixture');
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

describe('NRL Judiciary challenge controls', () => {
  it('opens only by explicit generated-squad choice and cannot be combined with named snapshots', () => {
    open();
    const choice = screen.getByRole('checkbox', { name: /Judiciary challenge/ });
    expect(choice).not.toBeChecked();
    fireEvent.click(choice);
    const names = screen.getByRole('checkbox', { name: /2026 opening matchday names/ });
    fireEvent.click(names);
    expect(choice).toBeDisabled();
    expect(choice).not.toBeChecked();
    fireEvent.click(names);
    fireEvent.click(choice);
    click('Manage Melbourne Storm');
    expect(readNrlCareerSave(raw())?.season.judiciary).toEqual({});
  });

  it('blocks kickoff until the pending case is answered, then retries a quota-refused plea', () => {
    const initial = pendingCareer();
    const bytes = JSON.stringify(initial);
    localStorage.setItem(NRL_SAVE_KEY, bytes);
    localStorage.setItem(fence, '4');
    const view = open();
    expect(screen.getByRole('button', { name: 'Quick Sim' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Play Live' })).toBeDisabled();
    const review = screen.getByRole('region', { name: 'Judiciary review' });
    expect(within(review).getByText(/40% chance/)).toBeVisible();
    expect(raw()).toBe(bytes);
    const setItem = Storage.prototype.setItem;
    const quota = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === NRL_SAVE_KEY) throw new DOMException('Quota full', 'QuotaExceededError');
      setItem.call(this, key, value);
    });
    click('Take the early plea');
    expect(raw()).toBe(bytes);
    expect(screen.getByText(/1 club match left/)).toBeVisible();
    expect(within(review).getByRole('status')).toHaveFocus();
    quota.mockRestore();
    click('Retry save');
    const paid = raw()!;
    expect(readNrlCareerSave(paid)?.season.judiciary?.case?.decision).toBe('plea');
    view.unmount();
    open();
    expect(screen.getByText(/1 club match left/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Quick Sim' })).toBeEnabled();
  });

  it('preserves a competing hearing decision and offers reload to the stale tab', () => {
    const initial = pendingCareer();
    localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(initial));
    localStorage.setItem(fence, '4');
    open();
    const { year, clubId } = initial.season;
    const caseRound = nrlJudiciaryCase(initial.season)!.round;
    const newer = JSON.stringify(reduceNrlCareer(initial, { type: 'resolveJudiciary', year, clubId, caseRound, decision: 'contest' }));
    localStorage.setItem(NRL_SAVE_KEY, newer);
    click('Take the early plea');
    expect(raw()).toBe(newer);
    expect(localStorage.getItem(fence)).toBe('4');
    expect(screen.getByRole('button', { name: 'Reload your season' })).toBeVisible();
  });

  it('lets the season review resolve a Grand Final charge before the next season', () => {
    let career = createNrlCareer('storm', 336, 2026, false, true);
    while (career.season.phase !== 'complete') career = reduceNrlCareer(career, { type: 'advance' });
    localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(career));
    localStorage.setItem(fence, '4');
    open();
    click('Review this season');
    expect(screen.getByRole('button', { name: 'Start 2027' })).toBeDisabled();
    click('Take the early plea');
    const review = screen.getByRole('region', { name: 'Judiciary review' });
    expect(within(review).getByRole('status')).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Start 2027' })).toBeEnabled();
  });
});
