import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NrlCareerOffice from '@/components/nrl-manager/NrlCareerOffice';
import { NRL_LAST_YEAR } from '@/data/nrlManagerSeasons';
import { nrlBoardChallengeStatus } from '@/lib/nrlBoardTarget';
import {
  createNrlCareer, nrlCareerMarket, nrlCareerSquad, nrlContractOffer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, NRL_SAVE_KEY, reduceNrlSeason } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const raw = () => localStorage.getItem(NRL_SAVE_KEY);
const fence = fenceKeyOf(NRL_SAVE_KEY);
const button = (name: string) => screen.getByRole('button', { name });
const click = (name: string) => fireEvent.click(button(name));
const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });
const stay = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'startNextSeason' });
const finish = (career: NrlCareerState) => {
  while (career.season.phase !== 'complete') career = advance(career);
  return career;
};
const desk = () => screen.getByText('Deals ending this season', { exact: true }).closest('details')!;
const row = (name: string) => within(within(desk()).getByText(name, { exact: true }).closest('li')!);

const completed = finish(createNrlCareer('storm', 4));
const outgoingId = 'storm-2-0';
const withMove = finish(reduceNrlCareer(createNrlCareer('storm', 4), {
  type: 'arrangeTakeover', year: 2026, clubId: 'storm', playerId: outgoingId, destinationId: 'raiders',
}));
const renewal = nrlCareerMarket(withMove).find(entry => entry.kind === 'renewal'
  && entry.startYear === 2027 && nrlContractOffer(withMove, entry.player.id, entry.askingSalary, 2).ok)!;
const offer = { type: 'offerContract', playerId: renewal.player.id, salary: renewal.askingSalary, years: 2 } as const;
const signed = reduceNrlCareer(withMove, offer);

function open(career: NrlCareerState | string) {
  localStorage.setItem(NRL_SAVE_KEY, typeof career === 'string' ? career : JSON.stringify(career));
  localStorage.setItem(fence, '4');
  const view = render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  click('Club office');
  click('Season review');
  return view;
}

function expand() {
  desk().open = true;
}

function editRenewal() {
  expand();
  fireEvent.click(row(renewal.player.name).getByRole('button', { name: 'Extend for ' + renewal.player.name }));
  return row(renewal.player.name);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

describe('NRL season review for expiring deals', () => {
  const requestCounteroffer = (editor: ReturnType<typeof within>) => {
    fireEvent.change(editor.getByRole('spinbutton', { name: 'Annual salary (AUD)' }), { target: { value: String(renewal.askingSalary - 50_000) } });
    expect(editor.getByRole('button', { name: 'Agree contract' })).toBeDisabled();
    fireEvent.click(editor.getByRole('button', { name: 'Request counteroffer' }));
    return editor.getByRole('button', { name: 'Accept counteroffer' });
  };

  it('shows the three-season trade before writing and saves only an accepted counteroffer', () => {
    open(withMove);
    const editor = editRenewal();
    const ask = renewal.askingSalary;
    const before = raw();
    const proposal = () => {
      const accept = requestCounteroffer(editor);
      expect(editor.getByText(/lower annual salary.*three seasons/i)).toBeVisible();
      expect(raw()).toBe(before);
      expect(localStorage.getItem(fence)).toBe('4');
      return accept;
    };
    proposal();
    fireEvent.click(editor.getByRole('button', { name: 'Decline counteroffer' }));
    expect(editor.queryByRole('button', { name: 'Accept counteroffer' })).toBeNull();
    expect(raw()).toBe(before);
    fireEvent.click(proposal());
    expect(editor.getByText('Renewed')).toBeVisible();
    expect(localStorage.getItem(fence)).toBe('5');
    const agreed = readNrlCareerSave(raw()!)!.players.find(player => player.id === renewal.player.id)!.futureContract;
    expect(agreed).toEqual({ clubId: 'storm', startYear: 2027, endYear: 2029, salary: Math.ceil(ask * 95 / 100) });
    click('Start 2027');
    expect(nrlCareerSquad(readNrlCareerSave(raw()!)!).find(player => player.id === renewal.player.id)?.contract).toEqual(agreed);
    expect(localStorage.getItem(fence)).toBe('6');
  });

  it('keeps a competing save and recovers a quota-refused counteroffer through the existing retry', () => {
    const first = open(withMove);
    const accept = requestCounteroffer(editRenewal());
    const newer = JSON.stringify(stay(withMove));
    localStorage.setItem(NRL_SAVE_KEY, newer);
    fireEvent.click(accept);
    expect(raw()).toBe(newer);
    expect(localStorage.getItem(fence)).toBe('4');
    expect(button('Reload your season')).toBeVisible();
    first.unmount();

    open(withMove);
    const pending = requestCounteroffer(editRenewal());
    const setItem = Storage.prototype.setItem;
    const quota = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === NRL_SAVE_KEY) throw new DOMException('Quota full', 'QuotaExceededError');
      setItem.call(this, key, value);
    });
    fireEvent.click(pending);
    expect(raw()).toBe(JSON.stringify(withMove));
    expect(localStorage.getItem(fence)).toBe('4');
    quota.mockRestore();
    click('Retry save');
    expect(localStorage.getItem(fence)).toBe('5');
    expect(readNrlCareerSave(raw()!)!.players.find(player => player.id === renewal.player.id)!.futureContract)
      .toEqual({ clubId: 'storm', startYear: 2027, endYear: 2029, salary: Math.ceil(renewal.askingSalary * 95 / 100) });
  });

  it('shows only current expiries and reuses the exact capped offer and rollover', () => {
    const unsigned = nrlCareerSquad(withMove).filter(player => player.contract?.endYear === 2026 && !player.futureContract);
    open(withMove);
    expect(desk()).not.toHaveAttribute('open');
    expect(desk().querySelector('summary')).toHaveTextContent(unsigned.length + ' unsigned');
    expect(button('Start 2027')).toBeEnabled();
    const before = raw();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    expand();
    expect(row(withMove.players.find(player => player.id === outgoingId)!.name).getByText('Agreed elsewhere')).toBeVisible();
    expect(within(desk()).getByText(/Unsigned deals end/)).toBeVisible();
    expect(within(desk()).getByRole('list').children).toHaveLength(unsigned.length + 1);
    desk().open = false;
    expect(setItem).not.toHaveBeenCalled();
    expect(raw()).toBe(before);
    expect(localStorage.getItem(fence)).toBe('4');

    const editor = editRenewal();
    const salary = editor.getByRole('spinbutton', { name: 'Annual salary (AUD)' });
    fireEvent.change(salary, { target: { value: '99999999' } });
    expect(editor.getByRole('button', { name: 'Agree contract' })).toBeDisabled();
    expect(editor.getByText(/exceeds the 2027 salary cap/)).toBeVisible();
    fireEvent.change(salary, { target: { value: String(renewal.askingSalary) } });
    fireEvent.click(editor.getByRole('button', { name: 'Agree contract' }));
    expect(row(renewal.player.name).getByText('Renewed')).toBeVisible();
    expect(desk().querySelector('summary')).toHaveTextContent((unsigned.length - 1) + ' unsigned');
    expect(raw()).toBe(JSON.stringify(signed));
    expect(localStorage.getItem(fence)).toBe('5');
    click('Start 2027');
    expect(raw()).toBe(JSON.stringify(stay(signed)));
    expect(localStorage.getItem(fence)).toBe('6');
  });

  it('leaves ordinary club moves and mandatory board moves on their existing path', () => {
    const ordinary = open(completed);
    expect(desk()).not.toHaveAttribute('open');
    const choose = () => fireEvent.change(screen.getByLabelText('Club to manage'), { target: { value: 'bears' } });
    choose();
    click('Start 2027 with Bears');
    expect(raw()).toBe(JSON.stringify(reduceNrlCareer(completed, {
      type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' },
    })));
    ordinary.unmount();

    const required = finish(stay(finish(createNrlCareer('storm', 62, 2026, true))));
    expect(nrlBoardChallengeStatus(required)).toBe('must-move');
    open(required);
    expect(desk()).not.toHaveAttribute('open');
    expect(screen.queryByRole('button', { name: 'Start 2028' })).toBeNull();
    choose();
    click('Start 2028 with Bears');
    expect(raw()).toBe(JSON.stringify(reduceNrlCareer(required, {
      type: 'startNextSeason', move: { fromYear: 2027, clubId: 'bears' },
    })));
  });

  it('keeps an unfinished, retired or terminal career free of rollover actions', () => {
    const playing = open(createNrlCareer('storm', 4));
    expect(screen.queryByText('Deals ending this season')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Start 2027' })).toBeNull();
    playing.unmount();
    const retired = open({ ...completed, retired: true });
    expect(screen.queryByText('Deals ending this season')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Start 2027' })).toBeNull();
    retired.unmount();
    render(<NrlCareerOffice career={{ ...completed, season: { ...completed.season, year: NRL_LAST_YEAR } }}
      screen="history" disabled={false} onAction={() => false} />);
    expect(screen.queryByText('Deals ending this season')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Start 10000' })).toBeNull();
  });

  it('uses the same extension and expiry rules after a completed v1 season', () => {
    let season = createNrlSeason('storm', 4);
    while (season.phase !== 'complete') season = reduceNrlSeason(season, { type: 'advance' });
    const original = JSON.stringify(season);
    const imported = readNrlCareerSave(original)!;
    expect(imported.legacySeason).toBe(true);
    const eligible = nrlCareerMarket(imported).filter(entry => entry.kind === 'renewal' && entry.startYear === 2027
      && nrlContractOffer(imported, entry.player.id, entry.askingSalary, 2).ok);
    expect(eligible.length).toBeGreaterThan(1);
    const [renew, expire] = eligible;
    open(original);
    expand();
    expect(row(renew.player.name).getByText('Unsigned', { exact: true })).toBeVisible();
    expect(raw()).toBe(original);
    fireEvent.click(row(renew.player.name).getByRole('button', { name: 'Extend for ' + renew.player.name }));
    fireEvent.click(row(renew.player.name).getByRole('button', { name: 'Agree contract' }));
    const signed = reduceNrlCareer(imported, { type: 'offerContract', playerId: renew.player.id, salary: renew.askingSalary, years: 2 });
    expect(raw()).toBe(JSON.stringify(signed));
    click('Start 2027');
    const next = readNrlCareerSave(raw())!;
    const squad = nrlCareerSquad(next);
    expect(raw()).toBe(JSON.stringify(stay(signed)));
    expect(next.legacySeason).toBe(false);
    expect(squad).toHaveLength(30);
    expect(squad.find(player => player.id === renew.player.id)?.contract).toEqual({
      clubId: 'storm', startYear: 2027, endYear: 2028, salary: renew.askingSalary,
    });
    expect(squad.some(player => player.id === expire.player.id)).toBe(false);
  });

  it('refuses stale renewal writes and retries a quota failure through the existing save', () => {
    const first = open(withMove);
    const editor = editRenewal();
    const newer = JSON.stringify(stay(withMove));
    localStorage.setItem(NRL_SAVE_KEY, newer);
    fireEvent.click(editor.getByRole('button', { name: 'Agree contract' }));
    expect(raw()).toBe(newer);
    expect(button('Reload your season')).toBeVisible();
    expect(button('Start 2027')).toBeDisabled();
    first.unmount();

    open(withMove);
    const pending = editRenewal();
    const setItem = Storage.prototype.setItem;
    const quota = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === NRL_SAVE_KEY) throw new DOMException('Quota full', 'QuotaExceededError');
      setItem.call(this, key, value);
    });
    fireEvent.click(pending.getByRole('button', { name: 'Agree contract' }));
    expect(readNrlCareerSave(raw())).toEqual(withMove);
    expect(localStorage.getItem(fence)).toBe('4');
    quota.mockRestore();
    click('Retry save');
    expect(raw()).toBe(JSON.stringify(signed));
    expect(localStorage.getItem(fence)).toBe('5');
  });
});
