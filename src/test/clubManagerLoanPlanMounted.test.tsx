import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CM_PARTIAL, SAVE_KEY, loanOutFee, loanOutPlayer, loanOutRefusal, loadCareer,
  recallLoanedPlayer, saveCareer, startCareer,
} from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import { TransferScreen } from '@/components/club-manager/TransferScreen';
import { useClubManager } from '@/hooks/useClubManager';
import type { ClubManagerGame } from '@/hooks/useClubManager';
import { SLOTS_INDEX_KEY } from '@/lib/clubManagerSlots';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn() }));
type Request = { playerId: string; hostClub: string; source: 'standard' | 'bid'; token: string };
type PlanApi = ClubManagerGame & {
  agreeLoanPlan?: (request: Request) => boolean;
  reviewLoanPlan?: (playerId: string) => boolean;
  recallPlannedLoanee?: (playerId: string, recordId: string) => boolean;
};
let api: PlanApi;
let plannedRecallCalls = 0;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const stream = (initial: number) => {
  let seed = initial;
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
};
function fixture() { return startCareer('Everton'); }
function eligible(c: CareerState) {
  const player = c.squad.find(p => p.position !== 'GK' && loanOutRefusal(c, p.id) === null);
  expect(player).toBeTruthy();
  return player!;
}
function Harness() {
  const g = useClubManager() as PlanApi; api = g;
  if (!g.career) return <p>Opening career</p>;
  const plans = { onAgreeLoanPlan: g.agreeLoanPlan, onReviewLoanPlan: g.reviewLoanPlan,
    onRecallLoanPlan: g.recallPlannedLoanee ? (id: string, recordId: string) => {
      plannedRecallCalls += 1; return g.recallPlannedLoanee!(id, recordId);
    } : undefined };
  return <TransferScreen career={g.career} market={g.market}
    onNegotiate={g.negotiate} onOffer={g.offer} onWalk={g.walk} onDismissNegotiation={g.dismissNegotiation}
    onClause={g.clause} onLoan={g.loan} onAcceptBid={g.acceptIncomingBid}
    onRejectBid={g.rejectIncomingBid} onSetStatus={g.setStatus} onLoanOut={g.loanOut}
    onProposeTerms={g.proposeTerms} onBuyLoanee={g.buyLoanee} onEndLoanEarly={g.endLoanEarly}
    onRecallLoanee={g.recallLoanee} deskNote={g.deskNote} onClearNote={g.clearDeskNote} {...plans} />;
}
async function mountCareer(c: CareerState) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(c));
  const view = render(<Harness />);
  await waitFor(() => expect(api.phase).toBe('resume'));
  act(() => api.resume());
  await waitFor(() => expect(api.phase).toBe('hub'));
  return view;
}
async function openPlan() {
  fireEvent.click(screen.getByRole('button', { name: /^Sell/ }));
  fireEvent.click(await screen.findByRole('button', { name: /^Loan plan/ }));
}
/** waitAWeek is the unemployment action. This drives the actual club calendar and its report. */
async function advanceCalendarEntry() {
  const before = api.career!.week;
  await act(async () => { api.quickPlay(); });
  await waitFor(() => expect(api.career!.week).toBeGreaterThan(before));
  if (api.phase === 'matchResult') act(() => api.continueFromReport());
  await waitFor(() => expect(api.phase).toBe('hub'));
  expect(api.career!.wilderness).toBeFalsy();
}
function selectStandard(playerId: string, hostClub = 'Ajax') {
  fireEvent.change(screen.getByLabelText('Loan plan player'), { target: { value: playerId } });
  fireEvent.change(screen.getByLabelText('Loan plan host'), { target: { value: hostClub } });
  fireEvent.click(screen.getByRole('button', { name: 'Preview terms' }));
}
function confirm() { fireEvent.click(screen.getByRole('button', { name: 'Confirm loan plan' })); }
function planOf(c: CareerState) {
  return (c.loanedOut?.[0] as { development?: { id: string; review?: { week: number; ratingChange: number } } } | undefined)?.development;
}
beforeEach(() => {
  localStorage.clear(); plannedRecallCalls = 0;
  vi.spyOn(Math, 'random').mockImplementation(stream(1079));
  vi.spyOn(Date, 'now').mockReturnValue(1791360000000);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });

describe('Loan plan through the actual transfer screen and saved hook', () => {
  it('keeps a default explicit-host loan free of plan metadata and additional random draws', () => {
    const c = fixture(), p = eligible(c);
    const run = () => {
      const values: number[] = [], rng = stream(731);
      vi.mocked(Math.random).mockImplementation(() => { const value = rng(); values.push(value); return value; });
      const next = loanOutPlayer(clone(c), p.id, 'Ajax', loanOutFee(p))!;
      return { next, values };
    };
    const a = run();
    expect(a.values).toEqual([]);
    expect(a.next.loanedOut).toHaveLength(1);
    expect(planOf(a.next)).toBeUndefined();
    expect(saveCareer(a.next)).toBe(true);
    expect(planOf(loadCareer()!)).toBeUndefined();
  });

  it('shows rules and a worked example before confirmation, and cancel saves nothing', async () => {
    await mountCareer(fixture()); const before = JSON.stringify(api.career), disk = localStorage.getItem(SAVE_KEY);
    await openPlan();
    expect(screen.getByTestId('loan-plan-rules')).toHaveTextContent('For example');
    expect(screen.getByTestId('loan-plan-rules')).toHaveTextContent('does not add a growth bonus');
    expect(screen.queryByRole('button', { name: 'Confirm loan plan' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back from loan plan' }));
    expect(screen.queryByTestId('loan-plan-body')).toBeNull();
    expect(JSON.stringify(api.career)).toBe(before); expect(localStorage.getItem(SAVE_KEY)).toBe(disk);
    fireEvent.click(await screen.findByRole('button', { name: /^Loan plan/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Loan plan rules' }));
    expect(screen.queryByTestId('loan-plan-rules')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Loan plan rules' }));
    expect(screen.getByTestId('loan-plan-rules')).toBeVisible();
  });

  it('confirms the real standard loan terms and restores the plan after actual unmount/reload', async () => {
    const view = await mountCareer(fixture()), p = eligible(api.career!), before = api.career!;
    const expectedFee = loanOutFee(p);
    await openPlan(); selectStandard(p.id);
    expect(screen.getByTestId('loan-plan-preview')).toHaveTextContent('Projected opportunity');
    confirm();
    await waitFor(() => expect(planOf(api.career!)).toBeTruthy());
    expect(api.career!.budget).toBe(Math.round((before.budget + expectedFee) * 10) / 10);
    expect(api.career!.loanedOut![0]).toMatchObject({ club: 'Ajax', fee: expectedFee });
    await waitFor(() => expect(JSON.parse(localStorage.getItem(SAVE_KEY)!)).toEqual(api.career));
    const record = clone(planOf(api.career!)); view.unmount();
    const reopened = render(<Harness />);
    await waitFor(() => expect(api.phase).toBe('resume')); act(() => api.resume());
    await openPlan();
    expect(planOf(api.career!)).toEqual(record);
    expect(screen.getByTestId('loan-plan-active')).toHaveTextContent(p.name);
    reopened.unmount();
  });

  it('uses the actual existing incoming loan bid price and removes that accepted bid', async () => {
    const c = fixture(), p = eligible(c), fee = loanOutFee(p);
    c.incomingBids = [{ playerId: p.id, playerName: p.name, club: 'Ajax', offer: fee, status: 'open', loan: true }];
    await mountCareer(c); await openPlan();
    fireEvent.change(screen.getByLabelText('Loan plan player'), { target: { value: p.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Use current loan offer' })); confirm();
    await waitFor(() => expect(planOf(api.career!)).toBeTruthy());
    expect(api.career!.loanedOut![0].fee).toBe(fee);
    expect(api.career!.incomingBids?.some(b => b.playerId === p.id)).toBe(false);
    expect(api.career!.budget).toBe(Math.round((c.budget + fee) * 10) / 10);
  });

  it('rejects a displayed bid after the real bid has been withdrawn', async () => {
    const c = fixture(), p = eligible(c);
    c.incomingBids = [{ playerId: p.id, playerName: p.name, club: 'Ajax', offer: loanOutFee(p), status: 'open', loan: true }];
    await mountCareer(c); await openPlan();
    fireEvent.change(screen.getByLabelText('Loan plan player'), { target: { value: p.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Use current loan offer' }));
    act(() => api.rejectIncomingBid(p.id));
    const before = JSON.stringify(api.career); confirm();
    expect(JSON.stringify(api.career)).toBe(before); expect(planOf(api.career!)).toBeUndefined();
    expect(screen.getByRole('status')).toHaveTextContent('changed');
  });

  it('shows unknown host data honestly and refuses an opt-in record on a partial host', async () => {
    const c = fixture(), p = eligible(c);
    await mountCareer(c); await openPlan();
    const select = screen.getByLabelText('Loan plan host') as HTMLSelectElement;
    const host = [...select.options].map(option => option.value).find(club => CM_PARTIAL.includes(club));
    expect(host).toBeTruthy();
    selectStandard(p.id, host!);
    expect(screen.getByRole('status')).toHaveTextContent('coverage is thin');
    expect(screen.getByRole('status')).toHaveAttribute('data-cm-partial', 'CM_PARTIAL');
    expect(screen.queryByRole('button', { name: 'Confirm loan plan' })).toBeNull();
    expect(planOf(api.career!)).toBeUndefined();
  });

  it('saves a real weekly review without inventing host minutes or changing the player rating', async () => {
    await mountCareer(fixture()); const p = eligible(api.career!);
    await openPlan(); selectStandard(p.id); confirm();
    await waitFor(() => expect(planOf(api.career!)).toBeTruthy());
    const rating = api.career!.loanedOut![0].player.rating;
    await advanceCalendarEntry();
    await waitFor(() => expect(api.career!.week).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Review loan plan' }));
    await waitFor(() => expect(planOf(api.career!)!.review).toBeTruthy());
    expect(api.career!.loanedOut![0].player.rating).toBe(rating);
    expect(planOf(api.career!)!.review!.ratingChange).toBe(0);
    await waitFor(() => expect(JSON.parse(localStorage.getItem(SAVE_KEY)!)).toEqual(api.career));
    expect(screen.getByTestId('loan-plan-active')).not.toHaveTextContent('minutes played');
  });

  it('recalls through the existing engine, pays its fee and retains the one-loan season stamp', async () => {
    await mountCareer(fixture()); const p = eligible(api.career!);
    await openPlan(); selectStandard(p.id); confirm();
    await waitFor(() => expect(planOf(api.career!)).toBeTruthy());
    const fee = api.career!.loanedOut![0].recallFee!, budget = api.career!.budget;
    fireEvent.click(screen.getByRole('button', { name: 'Recall planned player' }));
    await waitFor(() => expect(api.career!.loanedOut).toHaveLength(0));
    expect(api.career!.budget).toBe(Math.round((budget - fee) * 10) / 10);
    const returned = api.career!.squad.find(x => x.name === p.name)!;
    expect(returned.loanOutSeason).toBe(api.career!.season);
    expect(loanOutRefusal(api.career!, returned.id)).toContain('once this season');
    expect(screen.getByTestId('loan-plan-history')).toHaveTextContent('recalled');
    await waitFor(() => expect(JSON.parse(localStorage.getItem(SAVE_KEY)!)).toEqual(api.career));
  });

  it('refuses all plan mutations after another manager slot becomes active', async () => {
    await mountCareer(fixture()); const p = eligible(api.career!);
    await openPlan(); selectStandard(p.id);
    const before = api.career, disk = localStorage.getItem(SAVE_KEY);
    localStorage.setItem(SLOTS_INDEX_KEY, JSON.stringify({ active: 2 }));
    confirm();
    expect(api.career).toBe(before); expect(localStorage.getItem(SAVE_KEY)).toBe(disk);
    expect(planOf(api.career!)).toBeUndefined();
  });

  it('does not commit a loan in memory when actual persistence fails', async () => {
    await mountCareer(fixture()); const p = eligible(api.career!);
    await openPlan(); selectStandard(p.id);
    const before = JSON.stringify(api.career), disk = localStorage.getItem(SAVE_KEY);
    const setter = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    try {
      confirm();
      expect(JSON.stringify(api.career)).toBe(before); expect(localStorage.getItem(SAVE_KEY)).toBe(disk);
      expect(api.saveFailed).toBe(true); expect(planOf(api.career!)).toBeUndefined();
    } finally { setter.mockRestore(); }
  });

  it('rejects a real displayed quote after the saved date advances', async () => {
    await mountCareer(fixture()); const p = eligible(api.career!);
    await openPlan(); selectStandard(p.id);
    const element = screen.getByTestId('loan-plan-preview');
    const request: Request = { playerId: element.getAttribute('data-player')!, hostClub: element.getAttribute('data-host')!,
      source: element.getAttribute('data-source') as Request['source'], token: element.getAttribute('data-token')! };
    const week = api.career!.week; await advanceCalendarEntry();
    await waitFor(() => expect(api.career!.week).toBeGreaterThan(week));
    expect(api.career!.transferWindow).not.toBeNull();
    const before = JSON.stringify(api.career), disk = localStorage.getItem(SAVE_KEY);
    act(() => expect(api.agreeLoanPlan!(request)).toBe(false));
    expect(JSON.stringify(api.career)).toBe(before); expect(localStorage.getItem(SAVE_KEY)).toBe(disk);
  });

  it('refuses confirmation after an actual window close even with its old displayed token', async () => {
    const c = fixture(); c.windowWeeksLeft = 1;
    await mountCareer(c); const p = eligible(api.career!);
    await openPlan(); selectStandard(p.id);
    const element = screen.getByTestId('loan-plan-preview');
    const request: Request = { playerId: element.getAttribute('data-player')!, hostClub: element.getAttribute('data-host')!,
      source: element.getAttribute('data-source') as Request['source'], token: element.getAttribute('data-token')! };
    await advanceCalendarEntry();
    await waitFor(() => expect(api.career!.transferWindow).toBeNull());
    expect(screen.getByRole('button', { name: 'Confirm loan plan' })).toBeDisabled();
    const before = JSON.stringify(api.career), disk = localStorage.getItem(SAVE_KEY);
    act(() => expect(api.agreeLoanPlan!(request)).toBe(false));
    expect(JSON.stringify(api.career)).toBe(before); expect(localStorage.getItem(SAVE_KEY)).toBe(disk);
  });

  it('keeps an unsupported saved plan unavailable and refuses plan review or recall', async () => {
    const c = fixture(), p = eligible(c), old = loanOutPlayer(c, p.id, 'Ajax')!;
    (old.loanedOut![0] as unknown as { development: unknown }).development = { version: 2 };
    await mountCareer(old); await openPlan();
    expect(screen.getByTestId('loan-plan-active')).toHaveTextContent('unavailable');
    expect(screen.queryByRole('button', { name: 'Review loan plan' })).toBeNull();
    const before = JSON.stringify(api.career), disk = localStorage.getItem(SAVE_KEY);
    act(() => {
      expect(api.reviewLoanPlan!(p.id)).toBe(false);
      expect(api.recallPlannedLoanee!(p.id, 'unsupported')).toBe(false);
    });
    expect(JSON.stringify(api.career)).toBe(before); expect(localStorage.getItem(SAVE_KEY)).toBe(disk);
  });


  it('keeps actual legacy recall available for malformed optional plan metadata', async () => {
    const c = fixture(), p = eligible(c), old = loanOutPlayer(c, p.id, 'Ajax')!;
    (old.loanedOut![0] as unknown as { development: unknown }).development = { version: 2 };
    await mountCareer(old);
    fireEvent.click(screen.getByRole('button', { name: /^Sell/ }));
    const before = clone(api.career!), fee = before.loanedOut![0].recallFee!;
    const expected = recallLoanedPlayer(clone(before), p.id)!;
    expect(expected).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Recall ·/ }));
    await waitFor(() => expect(api.career!.loanedOut).toHaveLength(0));
    expect(plannedRecallCalls).toBe(0);
    expect(api.career!.budget).toBe(Math.round((before.budget - fee) * 10) / 10);
    expect(api.career).toEqual(expected);
    await waitFor(() => expect(JSON.parse(localStorage.getItem(SAVE_KEY)!)).toEqual(api.career));
  });

});
