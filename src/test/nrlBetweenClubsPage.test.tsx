import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ARM_MS } from '@/components/club-manager/RetireDoor';
import * as nrlCareer from '@/lib/nrlCareer';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { NRL_SAVE_KEY } from '@/lib/nrlManager';
import { NRL_SAVE_SLOTS } from '@/lib/nrlSaveSlots';
import { saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Guest' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));

const raw = () => localStorage.getItem(NRL_SAVE_KEY);
const saved = () => readNrlCareerSave(raw());
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const click = (name: string | RegExp) => fireEvent.click(button(name));
const arm = () => act(() => vi.advanceTimersByTime(ARM_MS));
const open = (query = '') => render(<MemoryRouter initialEntries={['/nrl-team-manager' + query]}><NrlTeamManager /></MemoryRouter>);
const finish = (initial: NrlCareerState) => {
  let career = initial;
  for (let round = 0; round < 35 && career.season.phase !== 'complete'; round++) career = reduceNrlCareer(career, { type: 'advance' });
  expect(career.season.phase).toBe('complete');
  return career;
};
const boardDecision = () => finish(reduceNrlCareer(finish(createNrlCareer('storm', 62, 2026, true)), { type: 'startNextSeason' }));

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(finish(createNrlCareer('storm', 4))));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  NRL_SAVE_SLOTS.forEach(entry => saveFence.release(entry.saveKey));
});

function review() {
  click('Club office');
  click('Season review');
}

function leave() {
  click('Leave club');
  arm();
  click('Yes, leave club');
}

describe('NRL between clubs in a saved career', () => {
  it('explains the two board misses and takes the confirmed departure through the settled job market', () => {
    const ended = boardDecision();
    const before = JSON.stringify(ended);
    localStorage.setItem(NRL_SAVE_KEY, before);
    const view = open();
    review();
    const decision = within(screen.getByRole('region', { name: 'Board decision' }));
    expect(decision.getByRole('list', { name: 'Missed board targets' })).toHaveTextContent('2026 · Ladder place 7 · Finish in the top four');
    expect(decision.getByRole('list', { name: 'Missed board targets' })).toHaveTextContent('2027 · Ladder place 11 · Reach the finals');
    const vacancies = decision.getByRole('list', { name: 'Simulated vacancies' });
    expect(within(vacancies).getAllByRole('listitem').map(row => row.textContent))
      .toEqual(['PNG Chiefs · New club', 'Newcastle Knights · Finished 18', 'South Sydney Rabbitohs · Finished 13']);
    expect(screen.queryByRole('button', { name: 'Start 2028' })).toBeNull();
    fireEvent.click(decision.getByRole('button', { name: 'Open job market' }));
    click('Yes, open job market');
    expect(raw()).toBe(before);
    click('Back to season review');
    expect(raw()).toBe(before);
    fireEvent.click(decision.getByRole('button', { name: 'Open job market' }));
    arm();
    click('Yes, open job market');
    const departed = reduceNrlCareer(ended, { type: 'leaveClub', year: 2027, clubId: 'storm' });
    expect(saved()).toEqual(departed);
    view.unmount();
    open();
    expect(saved()).toEqual(departed);
    click('Take job at Newcastle Knights');
    expect(saved()).toEqual(reduceNrlCareer(departed, { type: 'acceptVacancy', year: 2027, clubId: 'storm', destinationId: 'knights' }));
  });

  it('offers a settled club job above the market and records the existing appointment', () => {
    const offered = reduceNrlCareer(boardDecision(), { type: 'applyForOffseasonJob', year: 2027, clubId: 'storm', destinationId: 'chiefs' });
    localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(offered));
    open();
    review();
    const decision = within(screen.getByRole('region', { name: 'Board decision' }));
    const accept = decision.getByRole('button', { name: 'Accept offer and start 2028' });
    const market = decision.getByRole('button', { name: 'Open job market' });
    expect(accept.compareDocumentPosition(market) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(decision.getByText('Chiefs offered you the job.')).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Accept offer and start 2028' })).toHaveLength(1);
    fireEvent.click(market);
    expect(decision.getByText('Your existing application or offer closes.')).toBeVisible();
    click('Back to season review');
    expect(saved()).toEqual(offered);
    fireEvent.click(accept);
    expect(saved()).toEqual(reduceNrlCareer(offered, { type: 'acceptOffseasonJob', year: 2027, clubId: 'storm', destinationId: 'chiefs' }));
    expect(saved()?.history.at(-1)?.appointment).toEqual({ clubId: 'chiefs', reason: 'expansion' });
  });

  it('keeps the direct club picker available if the board has no simulated vacancies', () => {
    localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(boardDecision()));
    vi.spyOn(nrlCareer, 'nrlOffseasonOpportunities').mockReturnValue([]);
    open();
    review();
    const decision = within(screen.getByRole('region', { name: 'Board decision' }));
    expect(decision.getByText('No simulated vacancies. You can choose a club directly below.')).toBeVisible();
    expect(decision.queryByRole('button', { name: 'Open job market' })).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Club to manage' })).toBeVisible();
  });

  it('asks before leaving, reopens to the job market, and records a new job', () => {
    const before = raw();
    const first = open();
    review();
    click('Leave club');
    click('Yes, leave club');
    expect(raw()).toBe(before);
    click('Stay at club');
    expect(raw()).toBe(before);
    leave();
    expect(saved()?.outOfWork).toBe(true);
    expect(screen.getByRole('heading', { name: 'Out of work' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Match centre' })).not.toBeInTheDocument();
    const afterLeave = raw();
    first.unmount();
    const slots = open('?view=saves');
    expect(screen.getByText('Started in 2026 · 2026 season · Out of work')).toBeInTheDocument();
    slots.unmount();
    open();
    expect(raw()).toBe(afterLeave);
    expect(screen.getByRole('heading', { name: 'Out of work' })).toBeInTheDocument();
    click('Take job at Perth Bears');
    expect(saved()?.season).toMatchObject({ year: 2027, clubId: 'bears', round: 1 });
    expect(saved()?.history[0].rejoinedClubId).toBe('bears');
    expect(screen.queryByRole('heading', { name: 'Out of work' })).not.toBeInTheDocument();
    review();
    expect(screen.getByText(/Left the club and joined Perth/)).toBeInTheDocument();
  });

  it('keeps the departure pending when storage is full, then persists it on retry', () => {
    const before = raw();
    open();
    review();
    const setItem = Storage.prototype.setItem;
    const full = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === NRL_SAVE_KEY) throw new DOMException('Storage full', 'QuotaExceededError');
      setItem.call(this, key, value);
    });
    leave();
    expect(screen.getByRole('heading', { name: 'Out of work' })).toBeInTheDocument();
    expect(screen.getByText(/could not save your progress/i)).toBeInTheDocument();
    expect(button('Take job at Perth Bears')).toBeDisabled();
    expect(raw()).toBe(before);
    full.mockRestore();
    click('Retry save');
    expect(saved()?.outOfWork).toBe(true);
    expect(button('Take job at Perth Bears')).toBeEnabled();

    const unemployed = raw();
    const retryHire = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === NRL_SAVE_KEY) throw new DOMException('Storage full', 'QuotaExceededError');
      setItem.call(this, key, value);
    });
    click('Take job at Perth Bears');
    expect(raw()).toBe(unemployed);
    expect(button('Retry save')).toBeVisible();
    retryHire.mockRestore();
    click('Retry save');
    expect(saved()?.season).toMatchObject({ year: 2027, clubId: 'bears', round: 1 });
    expect(saved()?.history[0].rejoinedClubId).toBe('bears');
  });

  it('does not overwrite a newer slot when the job market is stale', () => {
    open();
    review();
    const ended = saved()!;
    leave();
    const newer = JSON.stringify(reduceNrlCareer(ended, { type: 'startNextSeason' }));
    localStorage.setItem(NRL_SAVE_KEY, newer);
    click('Take job at Perth Bears');
    expect(raw()).toBe(newer);
    expect(button('Reload your season')).toBeVisible();
  });

  it('can retire from the saved job market and reopen the completed career', () => {
    const first = open();
    review();
    leave();
    click('Retire from management');
    arm();
    click('Yes, retire');
    expect(saved()).toMatchObject({ outOfWork: true, retired: true });
    expect(screen.queryByRole('button', { name: 'Take job at Perth Bears' })).not.toBeInTheDocument();
    expect(screen.getByText('Retired after the 2026 season.')).toBeInTheDocument();
    first.unmount();
    open();
    expect(screen.getByText('Retired after the 2026 season.')).toBeInTheDocument();
  });

  it('confirms a season away and reopens to the simulated ladder and later hiring window', () => {
    const first = open();
    review();
    leave();
    const before = raw();
    click('Sit out 2027');
    click('Yes, simulate 2027');
    expect(raw()).toBe(before);
    click('Keep current vacancies');
    click('Sit out 2027');
    arm();
    click('Yes, simulate 2027');
    expect(saved()?.satOutSeason).toBe(true);
    expect(screen.getByText(/2027 was simulated while you were out of work/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sit out 2028' })).not.toBeInTheDocument();
    first.unmount();
    open();
    expect(screen.getByRole('heading', { name: '2028 job market' })).toBeInTheDocument();
    click('Take job at PNG Chiefs');
    expect(saved()?.season).toMatchObject({ year: 2028, clubId: 'chiefs', round: 1 });
    expect(saved()?.history).toHaveLength(1);
    review();
    expect(screen.getByText(/Left the club and joined PNG Chiefs through the job market for 2028/)).toBeInTheDocument();
    expect(screen.getByText(/2027 season out of work/)).toBeInTheDocument();
  });
});
