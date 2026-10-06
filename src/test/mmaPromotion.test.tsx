import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import MmaPromotionBoard from '@/components/fight-promoter/MmaPromotionBoard';
import FightPromoterModes from '@/components/fight-promoter/FightPromoterModes';
import FightPromoterBoard from '@/components/fight-promoter/FightPromoterBoard';
import {
  DIVISIONS, MMA_VENUES, MMA_PRICES, MMA_REST_COST, advanceMmaMonth, closeMmaPromotion, legalMmaBout, loadMmaPromotion, mmaPromotionScore,
  mmaRankings, newMmaPromotion, projectMmaEvent, runMmaEvent, signMmaFighter, validateMmaPlan,
  type MmaPromotion, type MmaPlan,
} from '@/lib/mmaPromotion';
import { HANDOVER_MIN_SHOWS, handOver, newPromoter, promoterVerdict } from '@/lib/fightPromoter';
import { recordCompletion } from '@/lib/completions';

const KEY = 'dukb-mma-promoter-v1', BOXING_KEY = 'fight-promoter-save-v1';
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const fresh = (seed = 'qa-world') => newMmaPromotion('QA promotion', seed);
function planFor(state: MmaPromotion, title = false): MmaPlan {
  const [a, b] = mmaRankings(state, 'light').filter(f => f.contract > 0 && f.recoveryUntil <= state.month);
  expect(a && b, 'Fixture has two available contracted fighters').toBeTruthy();
  return { venueId: MMA_VENUES[0].id, ticketPrice: 50, bookings: [{ aId: a.id, bId: b.id, title }] };
}
function receipt(state = fresh()) {
  const plan = planFor(state); const event = runMmaEvent(state, plan);
  expect(event, 'Legal fixture produces an event').not.toBeNull(); return { state, plan, event: event! };
}
function save(state: MmaPromotion, plan = planFor(state), view = 'card', resultIndex: number | null = null) {
  return JSON.stringify({ version: 1, state, plan, view: view === 'card' ? 'dashboard' : view, resultIndex });
}
const current = () => JSON.parse(localStorage.getItem(KEY)!).state as MmaPromotion;
function click(name: string | RegExp) {
  const action = screen.queryByRole('button', { name }); expect(action, `Actual ${name} action exists`).not.toBeNull(); fireEvent.click(action!);
}
function select(name: string, value: string) { fireEvent.change(screen.getByLabelText(name, { exact: true }), { target: { value } }); }
function mount(state?: MmaPromotion, plan?: MmaPlan, view = 'dashboard', resultIndex: number | null = null) {
  if (state) localStorage.setItem(KEY, save(state, plan ?? planFor(state), view, resultIndex));
  const mounted = render(<MemoryRouter><MmaPromotionBoard /></MemoryRouter>);
  if (view === 'card') click('Book card'); return mounted;
}
function addThroughUi(state: MmaPromotion) {
  click('Book card'); click('Choose fighters'); click('Light');
  const [a, b] = mmaRankings(state, 'light').filter(f => f.contract > 0 && f.recoveryUntil <= state.month);
  select('Blue corner', a.id); select('Red corner', b.id); click('Add bout'); return { a, b };
}
function lastEventWorld() {
  let state = fresh('final-event'); const ids = state.fighters.filter(f => f.division === 'light' && f.contract > 0).map(f => f.id);
  while (state.event < 12) {
    for (const id of ids) if (state.fighters.find(f => f.id === id)!.contract <= 1) state = signMmaFighter(state, id)!;
    for (let rest = 0; rest < 4 && mmaRankings(state, 'light').filter(f => f.recoveryUntil <= state.month).length < 2; rest++) state = advanceMmaMonth(state);
    state = runMmaEvent(state, planFor(state))!.state;
  }
  for (const id of ids) if (state.fighters.find(f => f.id === id)!.contract <= 1) state = signMmaFighter(state, id)!;
  for (let rest = 0; rest < 4 && mmaRankings(state, 'light').filter(f => f.recoveryUntil <= state.month).length < 2; rest++) state = advanceMmaMonth(state);
  expect(loadMmaPromotion(state), 'The final-event fixture was earned through actual play').toEqual(state); return state;
}
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('MMA promotion outcomes', () => {
  it('creates the same fictional world from the same seed with four contracts per division', () => {
    const state = fresh(); expect(fresh()).toEqual(state); expect(fresh('other-world').fighters).not.toEqual(state.fighters);
    expect(state.fighters).toHaveLength(24); expect(new Set(state.fighters.map(f => f.id)).size).toBe(24);
    for (const division of ['light', 'middle', 'heavy'] as const) {
      expect(state.fighters.filter(f => f.division === division)).toHaveLength(8);
      expect(state.fighters.filter(f => f.division === division && f.contract === 3)).toHaveLength(4);
    }
    expect(DIVISIONS).toHaveLength(3); expect(state.event).toBe(1); expect(state.history).toEqual([]);
  });
  it('rejects self cross division free and recovering fighters without changing the world', () => {
    const state = fresh(), plan = planFor(state), bout = plan.bookings[0], before = JSON.stringify(state);
    const other = state.fighters.find(f => f.division !== 'light')!, free = state.fighters.find(f => f.division === 'light' && f.contract === 0)!;
    for (const bad of [{ ...bout, bId: bout.aId }, { ...bout, bId: other.id }, { ...bout, bId: free.id }, { ...bout, bId: 'missing' }]) {
      expect(legalMmaBout(state, bad)).not.toBeNull(); expect(runMmaEvent(state, { ...plan, bookings: [bad] })).toBeNull();
    }
    const injured = copy(state); injured.fighters.find(f => f.id === bout.bId)!.recoveryUntil = state.month + 3;
    expect(legalMmaBout(injured, bout)).not.toBeNull(); expect(JSON.stringify(state)).toBe(before);
  });
  it('rejects empty repeated and oversized cards before any payout', () => {
    const state = fresh(), plan = planFor(state), before = JSON.stringify(state);
    for (const bookings of [[], [plan.bookings[0], plan.bookings[0]], Array.from({ length: 4 }, () => plan.bookings[0])]) {
      const bad = { ...plan, bookings }; expect(validateMmaPlan(state, bad)).not.toBeNull(); expect(runMmaEvent(state, bad)).toBeNull();
    }
    expect(JSON.stringify(state)).toBe(before);
  });
  it('rejects invalid venues prices and unaffordable guarantees', () => {
    const state = fresh(), plan = planFor(state);
    for (const patch of [{ venueId: 'missing' }, { ticketPrice: 0 }, { ticketPrice: -1 }, { ticketPrice: Number.NaN }, { ticketPrice: 10001 }]) {
      expect(runMmaEvent(state, { ...plan, ...patch })).toBeNull();
    }
    const poor = { ...state, cash: 0 }; expect(validateMmaPlan(poor, plan)).not.toBeNull(); expect(runMmaEvent(poor, plan)).toBeNull();
    expect(projectMmaEvent(state, { ...plan, ticketPrice: 25 })!.attendance).toBeGreaterThan(projectMmaEvent(state, { ...plan, ticketPrice: 80 })!.attendance);
    const crowded = fresh(); crowded.reputation = 100; crowded.fighters.forEach(f => { f.fanbase = 600; });
    const crowdedCard = { ...planFor(crowded), bookings: (['light', 'middle', 'heavy'] as const).map(division => {
      const [a, b] = mmaRankings(crowded, division); return { aId: a.id, bId: b.id, title: true };
    }) };
    const bestProfit = (world: MmaPromotion, card: MmaPlan, venueId: string) => Math.max(...MMA_PRICES.map(ticketPrice => projectMmaEvent(world, { ...card, venueId, ticketPrice })!.profit));
    expect(bestProfit(crowded, crowdedCard, 'grand'), 'A crowded strong card benefits from the larger venue at its best legal price').toBeGreaterThan(bestProfit(crowded, crowdedCard, 'arena'));
    const quiet = fresh(); quiet.reputation = 60; quiet.fighters.forEach(f => { f.fanbase = 160; });
    expect(bestProfit(quiet, planFor(quiet), 'club'), 'A low-demand card benefits from the affordable smaller venue').toBeGreaterThan(bestProfit(quiet, planFor(quiet), 'grand'));
  });
  it('reconciles attendance gate purses rent profit and actual cash in the saved receipt', () => {
    const { state, plan, event } = receipt(); const result = event.result, projection = projectMmaEvent(state, plan)!;
    expect(result.gate).toBe(result.attendance * plan.ticketPrice); expect(result.attendance).toBeLessThanOrEqual(projection.venue.capacity);
    expect(result.rent).toBe(MMA_VENUES.find(v => v.id === plan.venueId)!.rent);
    expect(result.profit).toBe(result.gate - result.purses - result.rent);
    expect(result.cashBefore).toBe(state.cash); expect(result.cashAfter).toBe(state.cash + result.profit); expect(event.state.cash).toBe(result.cashAfter);
    expect(event.state.history[event.state.history.length - 1]).toEqual(result); expect(event.state.event).toBe(state.event + 1);
  });
  it('applies each actual winner record contract ranking and recovery exactly once', () => {
    const { state, event } = receipt(); const bout = event.result.bouts[0];
    for (const id of [bout.aId, bout.bId]) {
      const before = state.fighters.find(f => f.id === id)!, after = event.state.fighters.find(f => f.id === id)!;
      expect(after.wins).toBe(before.wins + Number(id === bout.winnerId)); expect(after.losses).toBe(before.losses + Number(id === bout.loserId));
      expect(after.contract).toBe(before.contract - 1); expect(after.recoveryUntil).toBeGreaterThan(state.month);
      if (id === bout.winnerId) expect(after.rankingPoints).toBeGreaterThan(before.rankingPoints);
    }
    const idle = state.fighters.find(f => ![bout.aId, bout.bId].includes(f.id))!; expect(event.state.fighters.find(f => f.id === idle.id)).toEqual(idle);
    expect(state.fighters.find(f => f.id === bout.winnerId)!.wins).toBeLessThan(event.state.fighters.find(f => f.id === bout.winnerId)!.wins);
    expect(bout.scheduledRounds).toBe(3); expect(bout.round).toBeGreaterThanOrEqual(1); expect(bout.round).toBeLessThanOrEqual(3);
  });
  it('allows eligible title fights and transfers the occupied belt to the actual winner', () => {
    let transfer: NonNullable<ReturnType<typeof runMmaEvent>> | null = null;
    for (let seed = 0; seed < 40 && !transfer; seed++) {
      const state = fresh(`belt-transfer-${seed}`), plan = planFor(state, true), bout = plan.bookings[0]; state.champions.light = bout.aId;
      const omitted = { ...bout, aId: mmaRankings(state, 'light')[2].id }; expect(legalMmaBout(state, omitted)).not.toBeNull();
      const a = state.fighters.find(f => f.id === bout.aId)!, b = state.fighters.find(f => f.id === bout.bId)!;
      Object.assign(a, { striking: 10, grappling: 10, cardio: 10 }); Object.assign(b, { striking: 99, grappling: 99, cardio: 99 });
      const event = runMmaEvent(state, plan)!; if (event.result.bouts[0].winnerId === b.id) transfer = event;
    }
    expect(transfer, 'An actual challenger win is reached within the bounded seeded set').not.toBeNull();
    expect(transfer!.result.bouts[0].scheduledRounds).toBe(5); expect(transfer!.state.champions.light).toBe(transfer!.result.bouts[0].winnerId);
  });
  it('vacates expired champions and renews eligible contracts for the stated signing bonus', () => {
    const state = fresh(), plan = planFor(state, true); const pair = state.fighters.filter(f => [plan.bookings[0].aId, plan.bookings[0].bId].includes(f.id));
    pair.forEach(f => { f.contract = 1; }); state.champions.light = pair[0].id;
    const event = runMmaEvent(state, plan)!; expect(event.state.champions.light).toBeNull();
    const expired = event.state.fighters.find(f => f.id === event.result.bouts[0].winnerId)!; expect(expired.contract).toBe(0);
    expect(mmaRankings(event.state, 'light').some(f => f.id === expired.id)).toBe(false);
    const renewed = signMmaFighter(event.state, expired.id)!; expect(renewed).not.toBeNull();
    expect(renewed.cash).toBe(event.state.cash - expired.signingBonus); expect(renewed.fighters.find(f => f.id === expired.id)!.contract).toBe(3);
    expect(signMmaFighter({ ...event.state, cash: 0 }, expired.id)).toBeNull();
  });
  it('rests a month for overhead and clears recovery without changing records or contracts', () => {
    const { event } = receipt(); const state = event.state, before = JSON.stringify(state), rested = advanceMmaMonth(state);
    expect(rested.month).toBe(state.month + 1); expect(rested.event).toBe(state.event); expect(rested.cash).toBe(state.cash - MMA_REST_COST);
    expect(rested.fighters.map(f => [f.id, f.wins, f.losses, f.contract])).toEqual(state.fighters.map(f => [f.id, f.wins, f.losses, f.contract]));
    expect(rested.history).toEqual(state.history); expect(JSON.stringify(state)).toBe(before);
    const bout = event.result.bouts[0]; let healed = rested; for (let i = 0; i < 6; i++) healed = advanceMmaMonth(healed);
    expect(legalMmaBout(healed, { aId: bout.aId, bId: bout.bId, title: false })).toBeNull();
  });
  it('loads only structurally valid worlds and receipts without sanitizing forged outcomes', () => {
    const { event } = receipt(), state = event.state; expect(loadMmaPromotion(copy(state))).toEqual(state);
    const variants: unknown[] = [null, [], {}, { ...state, version: 2 }, { ...state, cash: Infinity }, { ...state, month: -1 }];
    const duplicate = copy(state); duplicate.fighters[1].id = duplicate.fighters[0].id; variants.push(duplicate);
    const wrongRecord = copy(state); wrongRecord.fighters[0].wins = -1; variants.push(wrongRecord);
    const wrongCash = copy(state); wrongCash.history[0].cashAfter += 1; variants.push(wrongCash);
    const wrongWinner = copy(state); wrongWinner.history[0].bouts[0].winnerId = 'missing'; variants.push(wrongWinner);
    for (const malformed of variants) expect(loadMmaPromotion(malformed)).toBeNull();
    expect(loadMmaPromotion(copy(fresh()))).toEqual(fresh());
  });
  it('gives stronger attributes more wins across paired seeds and reaches real submissions', () => {
    let strongWins = 0, weakWins = 0, submissions = 0, decisions = 0, knockouts = 0;
    for (let seed = 0; seed < 240; seed++) {
      const state = fresh(`balance-${seed}`), plan = planFor(state);
      const [a, b] = [state.fighters.find(f => f.id === plan.bookings[0].aId)!, state.fighters.find(f => f.id === plan.bookings[0].bId)!];
      Object.assign(a, { striking: 95, grappling: 95, cardio: 95 }); Object.assign(b, { striking: 30, grappling: 30, cardio: 30 });
      if (seed % 2) [plan.bookings[0].aId, plan.bookings[0].bId] = [plan.bookings[0].bId, plan.bookings[0].aId];
      const result = runMmaEvent(state, plan)!.result.bouts[0]; strongWins += Number(result.winnerId === a.id); weakWins += Number(result.winnerId === b.id);
      const grapplers = fresh(`methods-${seed}`), grapplingPlan = planFor(grapplers);
      for (const f of grapplers.fighters.filter(f => [grapplingPlan.bookings[0].aId, grapplingPlan.bookings[0].bId].includes(f.id))) Object.assign(f, { striking: 60, grappling: 90, cardio: 75, style: 'Grappler' });
      const method = runMmaEvent(grapplers, grapplingPlan)!.result.bouts[0].method;
      submissions += Number(method === 'Submission'); decisions += Number(method === 'Decision'); knockouts += Number(method === 'KO/TKO');
    }
    expect(strongWins, 'Stronger attributes win more of the paired seeded bouts').toBeGreaterThan(weakWins);
    expect(submissions, 'Generated MMA grapplers can finish by submission').toBeGreaterThan(0);
    expect(decisions).toBeGreaterThan(0); expect(knockouts).toBeGreaterThan(0);
    console.log(JSON.stringify({ seededBouts: 480, strongWins, weakWins, submissions, decisions, knockouts }));
  });
  it('scores reputation profitable events and filled belts in bounded legacy units', () => {
    const state = fresh(); state.reputation = 60; const { event } = receipt(); state.history = [copy(event.result)]; state.history[0].profit = 100;
    state.champions.light = mmaRankings(state, 'light')[0].id;
    expect(mmaPromotionScore(state)).toBe(Math.round(60 * .5 + 1 / 12 * 30 + 1 / 3 * 20));
    const stronger = copy(state); stronger.reputation = 90; expect(mmaPromotionScore(stronger)).toBeGreaterThan(mmaPromotionScore(state));
    expect(mmaPromotionScore({ ...state, reputation: 100, history: Array.from({ length: 12 }, () => state.history[0]), champions: { light: state.champions.light, middle: mmaRankings(state, 'middle')[0].id, heavy: mmaRankings(state, 'heavy')[0].id } })).toBe(100);
  });
  it('books and removes actual fighters through the card controls before spending cash', () => {
    const state = fresh(); mount(state, { ...planFor(state), bookings: [] }); const before = JSON.stringify(current());
    addThroughUi(state); expect(document.querySelectorAll('[data-mma-booking]')).toHaveLength(1);
    click(/Remove bout/); expect(document.querySelectorAll('[data-mma-booking]')).toHaveLength(0);
    expect(JSON.stringify(current())).toBe(before); expect(screen.getByRole('button', { name: 'Run event' })).toBeDisabled(); expect(recordCompletion).not.toHaveBeenCalled();
  });
  it('runs a mounted event once and reloads its exact financial receipt without another record', () => {
    const state = fresh(), plan = planFor(state), expected = runMmaEvent(state, plan)!; const view = mount(state, plan, 'card');
    const run = screen.getByRole('button', { name: 'Run event' }); act(() => { fireEvent.click(run); fireEvent.click(run); });
    expect(current()).toEqual(expected.state); expect(current().history).toHaveLength(1);
    for (const key of ['gate', 'purses', 'rent', 'profit'] as const) expect(Number(document.querySelector(`[data-mma-receipt-value="${key}"]`)?.getAttribute('data-value'))).toBe(expected.result[key]);
    expect(document.querySelector('[data-mma-bout-winner]')?.getAttribute('data-mma-bout-winner')).toBe(expected.result.bouts[0].winnerId);
    const bytes = localStorage.getItem(KEY); view.unmount(); const writes = vi.spyOn(Storage.prototype, 'setItem'); mount();
    expect(document.querySelector('[data-mma-receipt]')).not.toBeNull(); expect(localStorage.getItem(KEY)).toBe(bytes); expect(writes).not.toHaveBeenCalled(); expect(recordCompletion).not.toHaveBeenCalled();
  });
  it('opens rules rankings and contracts and returns focus to each dashboard opener', () => {
    const state = fresh(); mount(state, { ...planFor(state), bookings: [] });
    for (const name of ['Rankings', 'Fighters']) {
      const opener = screen.getByRole('button', { name }); fireEvent.click(opener); expect(document.querySelector('[data-mma-screen]')?.getAttribute('data-mma-screen')).toBe(name.toLowerCase());
      click('Back to dashboard'); expect(document.activeElement).toBe(screen.getByRole('button', { name }));
    }
    click('MMA rules'); expect(screen.getByRole('dialog')).toBeTruthy(); expect(screen.getByRole('dialog').textContent).toMatch(/[Ee]xample/);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(current()).toEqual(state);
  });
  it('explains malformed and blocked saves while allowing a fresh playable world', () => {
    localStorage.setItem(KEY, '{broken'); let view = mount(); expect(document.body.textContent).toContain('Your MMA save could not be read.'); expect(screen.getByRole('button', { name: 'Start promotion' })).toBeTruthy();
    view.unmount(); localStorage.clear(); const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    view = mount(); fireEvent.change(screen.getByLabelText('Promotion name'), { target: { value: 'Memory promotion' } }); click('Start promotion');
    expect(screen.getByRole('button', { name: 'Book card' })).toBeTruthy(); expect(document.body.textContent).toContain('Saving is blocked in this browser.'); expect(write).toHaveBeenCalled(); view.unmount();
  });
  it('records the twelfth event legacy once and never pays again when restored closed', () => {
    const state = lastEventWorld(), plan = planFor(state); let view = mount(state, plan, 'card'); click('Run event');
    expect(current().closed).toBe(true); expect(current().history).toHaveLength(12); expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(vi.mocked(recordCompletion).mock.calls[0].slice(0, 2)).toEqual(['/fight-promoter', mmaPromotionScore(current())]);
    const bytes = localStorage.getItem(KEY); view.unmount(); view = mount(); expect(current().closed).toBe(true); expect(localStorage.getItem(KEY)).toBe(bytes);
    expect(recordCompletion).toHaveBeenCalledTimes(1); view.unmount();
  });
  it('rejects unpaid contracts and free recovery months while replaying real paid actions', () => {
    const state = fresh(), free = state.fighters.find(f => f.contract === 0)!;
    const signed = signMmaFighter(state, free.id)!; const rested = advanceMmaMonth(signed); expect(loadMmaPromotion(copy(rested))).toEqual(rested);
    const freeContract = copy(state); freeContract.fighters.find(f => f.id === free.id)!.contract = 3;
    const freeRest = copy(state); freeRest.month += 100;
    for (const tampered of [freeContract, freeRest, { ...rested, cash: signed.cash }, { ...rested, actions: state.actions }]) expect(loadMmaPromotion(tampered)).toBeNull();
    expect(loadMmaPromotion({ ...state, actions: Array.from({ length: 501 }, () => ({ kind: 'rest' })) })).toBeNull();
  });
  it('ends earned MMA progress once preserves a later boxing finish and awards no zero event completion', () => {
    const state = receipt().event.state; let view = mount(state, { ...planFor(state), bookings: [] }); click('End promotion'); click('Yes, close promotion');
    expect(current()).toEqual(closeMmaPromotion(state)); expect(current().history).toHaveLength(1); expect(recordCompletion).toHaveBeenCalledTimes(1);
    view.unmount(); view = mount(); expect(current().closed).toBe(true); expect(recordCompletion).toHaveBeenCalledTimes(1); view.unmount();
    const boxing = newPromoter('Old earned boxing', 'boxing-finish'); boxing.history = Array.from({ length: HANDOVER_MIN_SHOWS }, (_, i) => ({ show: i + 1, venue: 'The Leisure Centre', attendance: 800, profit: .05, best: boxing.pool[0].name }));
    boxing.show = HANDOVER_MIN_SHOWS + 1; const expected = handOver(boxing)!;
    localStorage.setItem(BOXING_KEY, JSON.stringify({ st: boxing })); view = render(<MemoryRouter><FightPromoterBoard /></MemoryRouter>);
    click('Hand over'); click(/^Yes, hand over for/); expect(recordCompletion).toHaveBeenCalledTimes(2);
    expect(vi.mocked(recordCompletion).mock.calls[1].slice(0, 2)).toEqual(['/fight-promoter', promoterVerdict(expected).score]); view.unmount();
    localStorage.clear(); vi.mocked(recordCompletion).mockClear(); let empty = fresh('empty-low-cash'); while (empty.cash >= 6000) empty = advanceMmaMonth(empty);
    view = mount(empty, { ...planFor(empty), bookings: [] }); click('End promotion'); click('Yes, close promotion');
    expect(current().closed).toBe(true); expect(current().history).toEqual([]); expect(recordCompletion).not.toHaveBeenCalled(); expect(loadMmaPromotion(current())).toEqual(current()); view.unmount();
  });
  it('keeps boxing save bytes when opening either promotion mode', () => {
    const old = JSON.stringify({ st: newPromoter('Old saved boxing', 'boxing-baseline') }); localStorage.setItem(BOXING_KEY, old);
    render(<MemoryRouter><FightPromoterModes /></MemoryRouter>); expect(screen.queryByText('Old saved boxing')).not.toBeNull();
    expect(localStorage.getItem(BOXING_KEY)).toBe(old); click('Change sport'); click('MMA'); expect(screen.queryByRole('button', { name: 'Start promotion' })).not.toBeNull();
    expect(localStorage.getItem(BOXING_KEY)).toBe(old); expect(recordCompletion).not.toHaveBeenCalled();
  });
});
