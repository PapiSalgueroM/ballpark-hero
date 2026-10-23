import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CareerState, CMPlayer } from '@/lib/clubManager';

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-23T16:00:00Z'));
  let seed = 1457301;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = seed * 16807 % 2147483647;
    return (seed - 1) / 2147483646;
  });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.useRealTimers();
  localStorage.clear(); sessionStorage.clear();
});

async function fixture(contractYears = 1, wantsOut = false, unknown = false) {
  const E = await import('@/lib/clubManager');
  const R = await import('@/lib/clubManagerVeteranRetirement');
  const L = await import('@/lib/clubManagerVeteranLedger');
  const { saveFence } = await import('@/lib/saveFence');
  const UI = await import('@/components/club-manager/VeteranRetirementCard');
  saveFence.release(E.SAVE_KEY);
  const base = E.startCareer('Everton'), donor = base.squad.find(p => !p.onLoan);
  if (!donor) throw new Error('VETERAN_CARD_FIXTURE: actual owned donor missing');
  // Fictional policy donor. This is not a claim about a real player's plans.
  const veteran: CMPlayer = {
    ...donor, id: 'fictional-card-veteran', name: 'Fictional Card Veteran', generated: true,
    worldRosterKey: undefined, worldRosterSince: undefined, age: 38,
    position: 'GK', rating: 40, potential: 40, value: 0.2, wage: 3,
    contractYears, wantsOut, role: 'rotation', lastTen: [1, 0, 1, 0],
    onLoan: undefined, injuryWeeks: 0, suspendedMatches: 0, isYouth: false, academyGrad: false,
  };
  const input: CareerState = { ...base, budget: 500, live: null, pendingMove: null,
    squad: base.squad.map(p => p.id === donor.id ? veteran : p),
    week: base.calendar.length, pendingSummary: null };
  // Synthetic completed calendar, then the real summary operation, not a played season.
  const review = E.finishSeason(input);
  expect(review.state.pendingSummary, 'VETERAN_CARD_REAL_REVIEW_FOUNDATION').toEqual(review.summary);
  expect(review.state.week).toBe(review.state.calendar.length);
  let career = review.state;
  if (unknown) career = { ...career, veteranReviews: { v: 99, reviews: [], future: 'held' } };
  expect(L.veteranReviewOpen(career), 'VETERAN_CARD_CURRENT_REVIEW_FOUNDATION').toBe(true);
  expect(E.saveCareer(career), 'VETERAN_CARD_INITIAL_ACTUAL_SAVE').toBe(true);
  expect(localStorage.getItem(E.SAVE_KEY), 'VETERAN_CARD_REAL_RAW_PRESENT').not.toBeNull();
  return { E, R, L, Card: UI.VeteranRetirementCard, veteran, career };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;

// Explicit controlled parent using the real policy and writer, not the production hook.
function mount(g: Fixture, gate?: Promise<void>, publish = true) {
  let current = g.career, calls = 0;
  function Host() {
    const [career, setCareer] = useState(g.career);
    current = career;
    const review = async (id: string): Promise<boolean> => {
      calls++;
      if (gate) await gate;
      const candidate = g.R.applyVeteranRetirement(career, id);
      if (!candidate || !g.E.saveCareer(candidate)) return false;
      if (publish) setCareer(candidate);
      return true;
    };
    return <g.Card career={career} onReview={review} />;
  }
  const view = render(<Host />);
  return { ...view, current: () => current, calls: () => calls };
}
async function open(g: Fixture) {
  fireEvent.click(screen.getByRole('button', { name: 'Veteran talks' }));
  fireEvent.change(screen.getByLabelText('Veteran to review'), { target: { value: g.veteran.id } });
  await act(async () => {});
}
async function ask() {
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ask for one more season' })); });
}
function currentDecision(g: Fixture, career: CareerState) {
  const player = career.squad.find(p => p.id === g.veteran.id);
  const identity = player && g.L.veteranIdentity(career, player, g.E.worldYear(career));
  const ledger = g.L.readVeteranReviews(career.veteranReviews);
  return identity && ledger?.reviews.find(row => row.club === career.clubName
    && row.season === career.season && g.L.sameVeteranIdentity(row.identity, identity));
}

describe('Veteran retirement card with actual career policy and saves', { timeout: 120000 }, () => {
  it('shows actual unchanged role and renewal terms, publishes the paid result and restores Back focus', async () => {
    const g = await fixture(), view = mount(g);
    const preview = g.R.previewVeteranRetirement(g.career, g.veteran.id);
    expect(preview.kind, 'VETERAN_CARD_ACTUAL_OFFER_FOUNDATION').toBe('offer');
    if (preview.kind !== 'offer' || !preview.renewal) throw new Error('VETERAN_CARD_FIXTURE: real renewal missing');
    const expected = g.R.applyVeteranRetirement(g.career, g.veteran.id);
    if (!expected) throw new Error('VETERAN_CARD_FIXTURE: real paid candidate missing');
    await open(g);
    expect(screen.getByText('Current role: ' + g.E.ROLE_INFO[g.E.roleOf(g.veteran)].label)).toBeInTheDocument();
    expect(screen.getByTestId('veteran-renewal-fee').textContent,
      'VETERAN_CARD_REAL_FEE_DISPLAY').toBe(g.E.money(preview.renewal.fee, g.career));
    expect(screen.getByTestId('veteran-renewal-wage').textContent).toBe(g.E.money(preview.renewal.wage / 1000, g.career) + '/week');
    expect(screen.getByTestId('veteran-renewal-years').textContent).toBe(String(preview.renewal.years));
    expect(screen.getByText(/Example: a fictional 36 year old/)).toBeInTheDocument();
    const rules = screen.getByRole('button', { name: 'Veteran talk rules' });
    fireEvent.click(rules); expect(screen.queryByText(/Example: a fictional 36 year old/)).toBeNull();
    fireEvent.click(rules); expect(screen.getByText(/Example: a fictional 36 year old/)).toBeInTheDocument();
    expect(screen.queryByText('Agreed', { exact: true }), 'VETERAN_CARD_NO_PREVIEW_SUCCESS').toBeNull();
    await ask();
    expect(currentDecision(g, view.current())?.decision, 'VETERAN_CARD_REAL_SAVED_LEDGER').toBe('agreed');
    expect(screen.getByText('Agreed', { exact: true })).toBeInTheDocument();
    expect(view.current().budget, 'VETERAN_CARD_ACTUAL_RENEWAL_BUDGET').toBe(expected.budget);
    expect(view.current().squad.find(p => p.id === g.veteran.id)?.role).toBe(g.E.roleOf(g.veteran));
    expect(g.E.loadCareer()?.veteranReviews).toEqual(view.current().veteranReviews);
    fireEvent.click(screen.getByRole('button', { name: 'Back to season review' }));
    await act(async () => {});
    expect(document.activeElement, 'VETERAN_CARD_BACK_FOCUS').toBe(screen.getByRole('button', { name: 'Veteran talks' }));
    view.unmount();
    const covered = await fixture(3), coveredView = mount(covered);
    expect(covered.R.previewVeteranRetirement(covered.career, covered.veteran.id)).toMatchObject({ kind: 'offer', renewal: null });
    await open(covered);
    expect(screen.getByText('Your current contract already covers next summer.')).toBeInTheDocument();
    expect(screen.queryByTestId('veteran-renewal-fee')).toBeNull();
    expect(coveredView.calls()).toBe(0);
  });

  it('keeps raw and published career on real quota refusal, then retries the same season successfully', async () => {
    const g = await fixture(), view = mount(g), before = localStorage.getItem(g.E.SAVE_KEY);
    const memory = JSON.stringify(g.career), native = Storage.prototype.setItem;
    let refused = 0;
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === g.E.SAVE_KEY) { refused++; throw new DOMException('Quota fixture', 'QuotaExceededError'); }
      return native.call(this, key, value);
    });
    await open(g); await ask();
    expect(refused > 0, 'VETERAN_CARD_REAL_QUOTA_WAS_REACHED').toBe(true);
    expect(localStorage.getItem(g.E.SAVE_KEY), 'VETERAN_CARD_QUOTA_RAW_HELD').toBe(before);
    expect(JSON.stringify(view.current()), 'VETERAN_CARD_QUOTA_MEMORY_HELD').toBe(memory);
    expect(screen.getByRole('alert').textContent).toBe('That talk was not saved. Try again from the current season review.');
    expect(screen.queryByText('Agreed', { exact: true })).toBeNull();
    storage.mockRestore(); await ask();
    expect(view.calls()).toBe(2);
    expect(currentDecision(g, view.current())?.decision, 'VETERAN_CARD_REAL_RETRY_SAVED').toBe('agreed');
    expect(localStorage.getItem(g.E.SAVE_KEY)).not.toBe(before);
    expect(g.E.loadCareer()?.veteranReviews).toEqual(view.current().veteranReviews);
  });

  it('records an actual wants-out decline with no renewal fee or role change', async () => {
    const g = await fixture(1, true), view = mount(g), before = g.career.budget;
    expect(g.R.previewVeteranRetirement(g.career, g.veteran.id)).toMatchObject({ kind: 'offer', decision: 'declined', renewal: null });
    await open(g);
    expect(screen.queryByText('Declined', { exact: true }), 'VETERAN_CARD_NO_PREVIEW_DECLINE').toBeNull();
    await ask();
    expect(currentDecision(g, view.current())?.decision).toBe('declined');
    expect(screen.getByText('Declined', { exact: true })).toBeInTheDocument();
    expect(view.current().budget, 'VETERAN_CARD_DECLINE_NO_FEE').toBe(before);
    expect(view.current().squad.find(p => p.id === g.veteran.id)?.role).toBe(g.E.roleOf(g.veteran));
  });

  it('blocks an unknown saved ledger without a callback or raw repair', async () => {
    const g = await fixture(1, false, true), view = mount(g);
    const before = localStorage.getItem(g.E.SAVE_KEY), memory = JSON.stringify(g.career);
    expect(g.R.previewVeteranRetirement(g.career, g.veteran.id).kind).toBe('blocked');
    await open(g);
    const button = screen.getByRole('button', { name: 'Ask for one more season' });
    expect(button.hasAttribute('disabled'), 'VETERAN_CARD_UNKNOWN_BLOCKS_BUTTON').toBe(true);
    await ask();
    expect(view.calls(), 'VETERAN_CARD_UNKNOWN_NEVER_CALLS_WRITER').toBe(0);
    expect(JSON.stringify(view.current())).toBe(memory);
    expect(localStorage.getItem(g.E.SAVE_KEY)).toBe(before);
    expect(screen.queryByText('Agreed', { exact: true })).toBeNull();
  });

  it('blocks duplicate taps and never invents success from true without published career props', async () => {
    const g = await fixture();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const view = mount(g, gate, false);
    await open(g);
    const button = screen.getByRole('button', { name: 'Ask for one more season' });
    act(() => { fireEvent.click(button); fireEvent.click(button); });
    expect(view.calls(), 'VETERAN_CARD_BUSY_ONE_CALLBACK').toBe(1);
    expect(button.hasAttribute('disabled')).toBe(true);
    await act(async () => { release(); await gate; });
    expect(g.L.readVeteranReviews(g.E.loadCareer()?.veteranReviews)?.reviews[0]?.decision,
      'VETERAN_CARD_DELAY_REAL_WRITE_FOUNDATION').toBe('agreed');
    expect(currentDecision(g, view.current()), 'VETERAN_CARD_UNPUBLISHED_PROPS_HAVE_NO_RESULT').toBeUndefined();
    expect(screen.queryByText('Agreed', { exact: true }), 'VETERAN_CARD_TRUE_IS_NOT_PUBLISHED_SUCCESS').toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Waiting for the saved season review.');
    expect(screen.getByRole('button', { name: 'Ask for one more season' }).hasAttribute('disabled')).toBe(true);
  });
});
