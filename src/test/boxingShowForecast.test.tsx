import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Booking, PromoterState, ShowPlan } from '@/lib/fightPromoter';

const mocks = vi.hoisted(() => ({ completion: vi.fn() }));
vi.mock('@/lib/completions', () => ({ recordCompletion: mocks.completion, getCurrentPlayerName: () => 'Cash fixture' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

const KEY = 'fight-promoter-save-v1';
const BASELINE = 'unchanged handover engine keeps its complete outcome and input';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const storage = () => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
const environment = () => ({ storage: storage(), writes: clone(vi.mocked(Storage.prototype.setItem).mock.calls),
  removes: clone(vi.mocked(Storage.prototype.removeItem).mock.calls), draws: vi.mocked(Math.random).mock.calls.length,
  completions: clone(mocks.completion.mock.calls), now: Date.now() });
function check(id: string, actual: unknown, expected: unknown, evidence: unknown = {}) {
  console.log('BOXING_FORECAST_RECORD|' + JSON.stringify({ id, actual, expected, evidence }));
  expect(actual, id).toEqual(expected);
}
function click(name: string | RegExp) {
  const node = screen.queryByRole('button', { name });
  check('actual action exists: ' + String(name), !!node, true);
  fireEvent.click(node!);
}
const moneyText = (n: number) => n.toFixed(3) + 'm';

async function fixture(reputation = 5) {
  const E = await import('@/lib/fightPromoter');
  const source = E.newPromoter('Cash fixture', 'boxing-cash-1086');
  // Explicit economic staging on actual generated fighters, not an earned career.
  const state: PromoterState = { ...clone(source), reputation, money: 10,
    pool: source.pool.map(f => ({ ...clone(f), age: 25, damage: 0, wins: 30, losses: 0, kos: 20 })) };
  const bookings: Booking[] = [], used = new Set<string>();
  for (const a of state.pool) {
    if (used.has(a.id)) continue;
    const b = state.pool.find(b => !used.has(b.id) && E.legalMatch(a, b));
    if (!b) continue;
    bookings.push({ aId: a.id, bId: b.id, rounds: 8, title: false }); used.add(a.id); used.add(b.id);
  }
  expect(bookings.length, 'Actual generated fixture supplies two disjoint legal pairs').toBeGreaterThanOrEqual(2);
  return { source, state, bookings: bookings.slice(0, 2), annotation: 'Actual newPromoter pool; cash/reputation/records/health explicitly staged for economic coverage.' };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
type EngineOutcome = NonNullable<ReturnType<typeof import('@/lib/fightPromoter')['runShow']>>;
async function outcome(state: PromoterState, plan: ShowPlan) {
  // Fresh modules match a real saved-load Board, whose generated-fighter counter starts at zero.
  // runShow itself mutates its input rngTick. Only this disposable clone is passed to it.
  vi.resetModules();
  const E = await import('@/lib/fightPromoter');
  const input = clone(state), before = clone(input), result = E.runShow(input, clone(plan));
  expect(result, 'The unchanged engine accepts the actual UI plan').not.toBeNull();
  return { result: result!, inputBefore: before, inputAfter: clone(input), plan: clone(plan) };
}
async function mount(state: PromoterState) {
  vi.resetModules();
  const Board = (await import('@/components/fight-promoter/FightPromoterBoard')).default;
  localStorage.setItem(KEY, JSON.stringify({ st: state }));
  const view = render(<Board />);
  return view;
}
function book(state: PromoterState, booking: Booking) {
  for (const id of [booking.aId, booking.bId]) {
    const fighter = state.pool.find(f => f.id === id)!;
    const buttons = screen.queryAllByRole('button').filter(node => !node.hasAttribute('disabled') && node.textContent?.startsWith(fighter.name));
    check('one actual fighter selection ' + id, buttons.length, 1, { fighter }); fireEvent.click(buttons[0]);
  }
}
function price(value: number) { fireEvent.change(screen.getByRole('slider', { name: /^Ticket price/ }), { target: { value: String(value) } }); }
function readForecast() {
  const panel = document.querySelector('[data-boxing-forecast]');
  const values = Object.fromEntries(['attendance', 'gate', 'purses', 'rent', 'profit', 'cash-after', 'guarantees', 'share'].map(key => {
    const node = panel?.querySelector(`[data-boxing-${key}]`);
    return [key, { value: node ? Number(node.getAttribute('data-value')) : null, text: node?.textContent ?? null }];
  }));
  return { values, status: panel?.querySelector('[role="status"]')?.textContent ?? null };
}
function expectedForecast(state: PromoterState, run: EngineOutcome, guarantees: number) {
  const r = run.result;
  return { values: {
    attendance: { value: r.attendance, text: `${r.attendance.toLocaleString('en-US')} of ${r.venue.capacity.toLocaleString('en-US')}` },
    gate: { value: r.gate, text: moneyText(r.gate) }, purses: { value: r.purses, text: moneyText(r.purses) },
    rent: { value: r.rent, text: moneyText(r.rent) },
    profit: { value: r.profit, text: `${r.profit < 0 ? 'Loss' : 'Profit'} ${moneyText(Math.abs(r.profit))}` },
    'cash-after': { value: run.state.money, text: moneyText(run.state.money) },
    guarantees: { value: guarantees, text: moneyText(guarantees) },
    share: { value: Math.round(r.gate * 0.58 * 1000) / 1000, text: moneyText(Math.round(r.gate * 0.58 * 1000) / 1000) },
  }, status: run.state.money < 0 ? 'This show would leave you below 0 and end the promotion.'
    : run.state.money === 0 ? 'This leaves exactly 0. Your promotion stays open, with no cash buffer.' : null };
}
async function guarantees(f: Fixture, bookings: Booking[]) {
  const E = await import('@/lib/fightPromoter');
  return Math.round(bookings.reduce((sum, b) => sum + E.purseFor(f.state.pool.find(p => p.id === b.aId)!, f.state.pool.find(p => p.id === b.bId)!, b.title), 0) * 1000) / 1000;
}
async function prepared(reputation = 5, seat = 220, venueId = 'hall') {
  const f = await fixture(reputation), plan: ShowPlan = { venueId, ticketPrice: seat / 1e6, bookings: [f.bookings[0]] };
  const guarantee = await guarantees(f, plan.bookings), oracle = await outcome(f.state, plan);
  return { f, plan, guarantee, oracle };
}
async function playCashCase(kind: 'guarantee' | 'share' | 'loss' | 'negative' | 'zero') {
  const c = await prepared(5, kind === 'share' ? 220 : 60);
  if (kind !== 'share') expect(c.oracle.result.result.profit, 'The real fixture is a loss').toBeLessThan(0);
  if (kind === 'loss') c.f.state.money = 1;
  if (kind === 'negative' || kind === 'zero') c.f.state.money = -c.oracle.result.result.profit - (kind === 'negative' ? .001 : 0);
  const oracle = await outcome(c.f.state, c.plan), before = clone(c.f.state);
  const view = await mount(c.f.state), mounted = environment();
  book(c.f.state, c.plan.bookings[0]); price(kind === 'share' ? 220 : 60);
  const observed = readForecast(), expected = expectedForecast(c.f.state, oracle.result, c.guarantee);
  check('actual engine cash forecast: ' + kind, observed, expected, { fixture: c.f, oracle });
  check('preview holds every byte and draw: ' + kind, environment(), mounted);
  check('fixture input held: ' + kind, c.f.state, before);
  if (kind === 'guarantee') expect(oracle.result.result.purses).toBe(c.guarantee);
  if (kind === 'share') expect(oracle.result.result.purses).toBeGreaterThan(c.guarantee);
  click('Put the show on');
  const saved = localStorage.getItem(KEY), actual = JSON.parse(saved!).st;
  check('full actual show and serialized save: ' + kind,
    { state: actual, bytes: saved, writes: vi.mocked(Storage.prototype.setItem).mock.calls.slice(mounted.writes.length),
      protected: Object.fromEntries(Object.entries(storage()).filter(([key]) => key !== KEY)), draws: environment().draws },
    { state: oracle.result.state, bytes: JSON.stringify({ st: oracle.result.state }), writes: [[KEY, JSON.stringify({ st: oracle.result.state })]],
      protected: Object.fromEntries(Object.entries(mounted.storage).filter(([key]) => key !== KEY)), draws: mounted.draws }, { oracle });
  check('completion follows the actual closed state: ' + kind, mocks.completion.mock.calls.length, kind === 'negative' ? 1 : 0);
  const after = environment(); view.unmount();
  const ReloadedBoard = (await import('@/components/fight-promoter/FightPromoterBoard')).default; render(<ReloadedBoard />);
  check('actual restored Board shows the saved promotion: ' + kind, {
    heading: !!screen.queryByRole('heading', { name: c.f.state.name }),
    show: !!screen.queryByText(`Show ${oracle.result.state.show}`),
    cash: !!screen.queryByText(moneyText(oracle.result.state.money)),
    closed: !!screen.queryByText('Out of the business'), forecast: !!document.querySelector('[data-boxing-forecast]'),
  }, { heading: true, show: true, cash: true, closed: kind === 'negative', forecast: false });
  check('reload holds result bytes without another payout: ' + kind, environment(), after);
}

beforeEach(() => {
  vi.resetModules(); localStorage.clear(); sessionStorage.clear(); mocks.completion.mockReset();
  // Opaque byte sentinels on actual unrelated keys; these are not claimed as loaded game worlds.
  localStorage.setItem('dukb-mma-promoter-v1', '{"keep":"opaque MMA sentinel"}');
  localStorage.setItem('fight-promoter-mode-v1', 'boxing'); localStorage.setItem('wonderkidFactoryV1', '{"keep":"opaque Academy sentinel"}');
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] }); vi.setSystemTime(1791374400000);
  vi.spyOn(Math, 'random').mockReturnValue(.37); vi.spyOn(Storage.prototype, 'setItem'); vi.spyOn(Storage.prototype, 'removeItem');
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it(BASELINE, async () => {
  const E = await import('@/lib/fightPromoter'), state = E.newPromoter('Baseline', 'baseline-1086');
  state.money = 3; state.reputation = 50;
  state.history = Array.from({ length: 10 }, (_, i) => ({ show: i + 1, venue: 'The Leisure Centre', attendance: 900, profit: .05, best: 'Fixture pair' }));
  const input = clone(state), before = environment(), actual = E.handOver(state);
  check(BASELINE, { actual, input: state, environment: environment() }, {
    actual: { ...input, money: 4.161, closed: true, exit: 'handed', handedFor: 1.161,
      log: ['After 10 shows you hand the promotion over for 1.161m.', ...input.log] }, input, environment: before,
  });
});
it('empty card offers no cash forecast and cannot run a show', async () => {
  const f = await fixture(); await mount(f.state); const before = environment();
  check('empty card has no invented forecast', { panel: !!document.querySelector('[data-boxing-forecast]'), disabled: screen.getByRole('button', { name: 'Put the show on' }).hasAttribute('disabled') }, { panel: false, disabled: true });
  fireEvent.click(screen.getByRole('button', { name: 'Put the show on' })); check('empty click holds all state', environment(), before);
});
it('guaranteed purses match the full actual show and reload', () => playCashCase('guarantee'));
it('the 58 percent share matches the full actual show and reload', () => playCashCase('share'));
it('a covered loss keeps the promotion open after the real show', () => playCashCase('loss'));
it('negative cash predicts the actual closed result exactly once', () => playCashCase('negative'));
it('exactly zero cash predicts the actual open result', () => playCashCase('zero'));

it('ticket changes use current real economics without writing or advancing', async () => {
  const c = await prepared(), rows = [];
  for (const seat of [60, 220, 600]) rows.push({ seat, oracle: await outcome(c.f.state, { ...c.plan, ticketPrice: seat / 1e6 }) });
  await mount(c.f.state); const before = environment(); book(c.f.state, c.plan.bookings[0]);
  for (const row of rows) {
    price(row.seat); check('current ticket ' + row.seat, readForecast(), expectedForecast(c.f.state, row.oracle.result, c.guarantee), { fixture: c.f, oracle: row.oracle });
  }
  check('ticket preview holds state and randomness', environment(), before);
});
it('venue changes use current capacity rent and gate without writing', async () => {
  const c = await prepared(100), rows = [];
  for (const venueId of ['hall', 'town', 'stadium']) rows.push({ venueId, oracle: await outcome(c.f.state, { ...c.plan, venueId }) });
  await mount(c.f.state); const before = environment(); book(c.f.state, c.plan.bookings[0]);
  for (const row of rows) {
    click(new RegExp('^' + row.oracle.result.result.venue.name));
    check('current venue ' + row.venueId, readForecast(), expectedForecast(c.f.state, row.oracle.result, c.guarantee), { fixture: c.f, oracle: row.oracle });
  }
  check('venue preview holds state and randomness', environment(), before);
});
it('adding and removing actual bouts updates the complete cash forecast', async () => {
  const c = await prepared(), bothPlan = { ...c.plan, bookings: c.f.bookings }, bothGuarantees = await guarantees(c.f, bothPlan.bookings);
  const both = await outcome(c.f.state, bothPlan);
  await mount(c.f.state); const before = environment(); book(c.f.state, c.f.bookings[0]); book(c.f.state, c.f.bookings[1]);
  check('two legal bouts cash', readForecast(), expectedForecast(c.f.state, both.result, bothGuarantees), { fixture: c.f, oracle: both });
  const title = screen.getByText("Tonight's card"), panel = title.parentElement!;
  const removers = within(panel).queryAllByRole('button').filter(node => node.textContent === '');
  check('actual two remove controls exist', removers.length, 2); fireEvent.click(removers[1]);
  check('removed bout cash', readForecast(), expectedForecast(c.f.state, c.oracle.result, c.guarantee), { oracle: c.oracle });
  fireEvent.click(within(panel).queryAllByRole('button').find(node => node.textContent === '')!);
  check('last removal removes forecast', !!document.querySelector('[data-boxing-forecast]'), false);
  check('card editing holds state and randomness', environment(), before);
});

async function help(close: 'Back' | 'Escape') {
  const c = await prepared(); await mount(c.f.state); book(c.f.state, c.plan.bookings[0]);
  const before = environment(), forecast = readForecast(), trigger = screen.getByRole('button', { name: 'Show cash rules' });
  trigger.focus(); fireEvent.click(trigger); await act(async () => { vi.advanceTimersByTime(0); });
  const dialog = screen.queryByRole('dialog', { name: 'How show cash works' });
  check('help opens with focused heading ' + close, { visible: !!dialog, focused: document.activeElement?.textContent }, { visible: true, focused: 'How show cash works' });
  const r = c.oracle.result.result;
  check('live worked example ' + close, document.querySelector('[data-boxing-cash-example]')?.textContent,
    `For this card: ${moneyText(r.gate)} gate, less ${moneyText(r.purses)} fighter pay and ${moneyText(r.rent)} room hire, gives a ${r.profit < 0 ? 'loss' : 'profit'} ${moneyText(Math.abs(r.profit))}. Your cash goes from ${moneyText(c.f.state.money)} to ${moneyText(c.oracle.result.state.money)}.`);
  if (close === 'Back') click('Back to card'); else fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  await act(async () => { vi.advanceTimersByTime(0); });
  check('help closes and restores the actual opener ' + close, { dialog: !!screen.queryByRole('dialog'), focused: document.activeElement === trigger, forecast: readForecast() }, { dialog: false, focused: true, forecast });
  check('help neither plays nor saves ' + close, environment(), before);
}
it('cash help Back returns focus and preserves the live card', () => help('Back'));
it('cash help Escape returns focus and preserves the live card', () => help('Escape'));

it('money display keeps three digits grouping signs and rounded guarantees', async () => {
  const Forecast = (await import('@/components/fight-promoter/BoxingShowForecast')).default;
  const props = { attendance: 12345, capacity: 16000, gate: .101, guaranteedPurses: .0506, rent: .006, money: 1000.123 };
  const before = environment(); render(<Forecast {...props} />);
  check('literal precision and grouping fixture', readForecast(), { values: {
    attendance: { value: 12345, text: '12,345 of 16,000' }, gate: { value: .101, text: '0.101m' },
    purses: { value: .059, text: '0.059m' }, rent: { value: .006, text: '0.006m' },
    profit: { value: .036, text: 'Profit 0.036m' }, 'cash-after': { value: 1000.159, text: '1,000.159m' },
    guarantees: { value: .051, text: '0.051m' }, share: { value: .059, text: '0.059m' },
  }, status: null }, { annotation: 'Explicit component precision inputs; not claimed as a generated career.', props });
  check('display is inert', environment(), before);
});
