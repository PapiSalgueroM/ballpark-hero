import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NrlCareerOffice from '@/components/nrl-manager/NrlCareerOffice';
import { NRL_LAST_YEAR } from '@/data/nrlManagerSeasons';
import { nrlBoardChallengeStatus } from '@/lib/nrlBoardTarget';
import {
  createNrlCareer, nrlCareerMarket, nrlCareerSquad, nrlContractOffer, nrlMutualReleaseQuote, readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, NRL_SAVE_KEY, reduceNrlSeason } from '@/lib/nrlManager';
import { NRL_SAVE_ENTRY, nrlCheckpointKey, restoreNrlCheckpoint, saveNrlCheckpoint } from '@/lib/nrlSaveSlots';
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
  it('shows a read-only external position brief and uses the existing shortlist', () => {
    const career = createNrlCareer('storm', 17);
    open(career);
    click('Recruitment');
    const before = raw();
    expect(screen.queryByRole('heading', { name: 'Fullback recruitment brief' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Position'), { target: { value: 'Fullback' } });
    const brief = screen.getByRole('region', { name: 'Fullback recruitment brief' });
    expect(within(brief).getByText(/one-season offer at the asking salary/)).toBeVisible();
    const targets = within(brief).getByRole('list', { name: 'External targets' });
    expect(within(targets).getAllByRole('listitem')).toHaveLength(3);
    expect(raw()).toBe(before);
    const mark = within(targets).getAllByRole('button', { name: /Shortlist/ })[0];
    fireEvent.click(mark);
    expect(mark).toHaveAttribute('aria-pressed', 'true');
    expect(readNrlCareerSave(raw())?.shortlist).toHaveLength(1);
    expect(JSON.parse(raw()!).season).toEqual(career.season);
  });

  it('previews and confirms one simulated release from Contracts without writing on cancel', () => {
    const player = nrlCareerSquad(completed).find(row => nrlMutualReleaseQuote(completed, row.id).ok)!;
    const view = open(completed);
    click('Contracts');
    const panel = screen.getByText('Negotiate an offseason release').closest('details')!;
    fireEvent.click(within(panel).getByText('Negotiate an offseason release'));
    const choose = () => fireEvent.change(within(panel).getByLabelText('Player to release'), { target: { value: player.id } });
    const before = raw();
    choose();
    expect(within(panel).getByText(/One-time settlement/)).toBeVisible();
    expect(within(panel).getByText(/after reserving a squad place/)).toBeVisible();
    expect(raw()).toBe(before);
    fireEvent.click(within(panel).getByRole('button', { name: 'Cancel release' }));
    expect(raw()).toBe(before);
    choose();
    fireEvent.click(within(panel).getByRole('button', { name: 'Confirm mutual release' }));
    expect(within(panel).getByText(/Release agreed/)).toHaveTextContent(player.name);
    expect(within(panel).getByText('Negotiate an offseason release')).toHaveFocus();
    const after = raw()!;
    expect(readNrlCareerSave(after)?.finance.mutualRelease?.playerId).toBe(player.id);
    view.unmount();
    open(after);
    click('Finances');
    expect(screen.getByText('Contract settlement')).toBeVisible();
    expect(raw()).toBe(after);
  });

  it('saves a mid-season application, reloads its pending state and accepts the settled summer offer', () => {
    let career = createNrlCareer('storm', 4);
    while (career.season.round < 14) career = advance(career);
    const view = open(career);
    const desk = screen.getByText('Summer job applications').closest('details')!;
    fireEvent.click(within(desk).getByText('Summer job applications'));
    expect(within(desk).getByText(/An opening can disappear/)).toBeVisible();
    fireEvent.click(within(desk).getByRole('button', { name: 'Apply to Perth Bears for 2027' }));
    expect(within(desk).getByText(/Application sent to Perth Bears/)).toBeVisible();
    expect(within(desk).getByText('Summer job applications')).toHaveFocus();
    const pending = raw()!;
    expect(JSON.parse(pending).summerApplication).toEqual({ clubId: 'bears', round: 14 });
    expect(JSON.parse(pending).season).toEqual(career.season);
    expect(saveNrlCheckpoint(NRL_SAVE_KEY, pending, null)).toBe('written');
    expect(localStorage.getItem(nrlCheckpointKey(NRL_SAVE_KEY))).toBe(pending);
    view.unmount();
    const resumed = open(pending);
    const panel = screen.getByText('Summer job applications').closest('details')!;
    fireEvent.click(within(panel).getByText('Summer job applications'));
    expect(within(panel).getByText(/Application sent to Perth Bears/)).toBeVisible();
    expect(within(panel).queryByRole('button', { name: /Apply to/ })).toBeNull();
    expect(raw()).toBe(pending);
    resumed.unmount();
    const finished = finish(readNrlCareerSave(pending)!);
    open(finished);
    expect(screen.getByText(/Bears offered you the job/)).toBeVisible();
    click('Accept offer and start 2027');
    const moved = readNrlCareerSave(raw());
    expect(moved?.season).toMatchObject({ year: 2027, clubId: 'bears' });
    expect(moved?.history[0].appointment).toEqual({ clubId: 'bears', reason: 'expansion' });
    expect(restoreNrlCheckpoint(NRL_SAVE_ENTRY, raw()!, pending)).toBe('written');
    expect(raw()).toBe(pending);
  });

  it('leaves newer career bytes in place when a projected application is submitted from an old tab', () => {
    let career = createNrlCareer('storm', 4);
    while (career.season.round < 14) career = advance(career);
    open(career);
    fireEvent.click(screen.getByText('Summer job applications'));
    const newer = JSON.stringify(advance(career));
    localStorage.setItem(NRL_SAVE_KEY, newer);
    click('Apply to Perth Bears for 2027');
    expect(raw()).toBe(newer);
    expect(button('Reload your season')).toBeVisible();
    expect(button('Apply to Perth Bears for 2027')).toBeDisabled();
  });

  it('previews and cancels suggested openings without writing before the existing club move', () => {
    const view = open(completed);
    const prior = raw();
    const chooser = () => within(screen.getByText('Change clubs for 2027').closest('details')!);
    const inspect = () => {
      fireEvent.click(screen.getByText('Change clubs for 2027'));
      expect(chooser().getByRole('heading', { name: 'Suggested openings' })).toBeVisible();
      expect(chooser().getByText(/Simulated suggestions based on/)).toBeVisible();
      expect(chooser().getByText(/Ladder place 8/)).toBeVisible();
      fireEvent.click(chooser().getByRole('button', { name: 'Consider Perth Bears' }));
      expect(chooser().getByLabelText('Club to manage')).toHaveValue('bears');
      expect(chooser().getByLabelText('Club to manage')).toHaveFocus();
    };
    expect(screen.getByText('Change clubs for 2027').closest('details')).not.toHaveAttribute('open');
    inspect();
    fireEvent.change(chooser().getByLabelText('Club to manage'), { target: { value: '' } });
    expect(chooser().queryByRole('button', { name: 'Start 2027 with Bears' })).toBeNull();
    expect(raw()).toBe(prior);
    expect(localStorage.getItem(fence)).toBe('4');
    view.unmount();
    open(completed);
    inspect();
    fireEvent.click(chooser().getByRole('button', { name: 'Start 2027 with Bears' }));
    expect(raw()).toBe(JSON.stringify(reduceNrlCareer(completed, {
      type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' },
    })));
    expect(localStorage.getItem(fence)).toBe('5');
  });

  it('leaves the newer save in place if another tab moves after an opening was selected', () => {
    open(completed);
    fireEvent.click(screen.getByText('Change clubs for 2027'));
    click('Consider Perth Bears');
    const newer = JSON.stringify(stay(completed));
    localStorage.setItem(NRL_SAVE_KEY, newer);
    localStorage.setItem(fence, '5');
    click('Start 2027 with Bears');
    expect(raw()).toBe(newer);
    expect(localStorage.getItem(fence)).toBe('5');
    expect(button('Reload your season')).toBeVisible();
    expect(button('Consider Perth Bears')).toBeDisabled();
  });

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
