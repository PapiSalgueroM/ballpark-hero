/* Round 1083: real sale review/page/hook, retained complete outcomes and copied
 * faults. The wrapper retains every SALE_RECORD before its assertion runs. */
import { recordCompletion, resetMocks } from './dailyReload/mocks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { mountPage } from './dailyReload/harness';
import * as E from '@/lib/stadiumTycoon';
import * as original from '../../scripts/fixtures/tycoon1080Baseline/stadiumTycoon';
import { newFactory, serialize as serializeAcademy, SAVE_KEY as ACADEMY_KEY } from '@/lib/wonderkidFactory';
import { creditFullTimes, loadLedger, newLedger, REWARDS_KEY } from '@/lib/tycoonRewards';
import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';
import StadiumTycoon from '@/pages/StadiumTycoon';
import TycoonSaleReview from '@/components/tycoon/TycoonSaleReview';

const capture = vi.hoisted(() => ({ latest: null as unknown }));
vi.mock('@/hooks/useStadiumTycoon', async importOriginal => {
  const real = await importOriginal<typeof import('@/hooks/useStadiumTycoon')>();
  return { ...real, useStadiumTycoon: (...args: Parameters<typeof real.useStadiumTycoon>) => {
    const result = real.useStadiumTycoon(...args);
    capture.latest = result;
    return result;
  } };
});

const EPOCH = 1767225600000;
const BASELINE = 'independent purchase preserves original engine accounting';
let elapsed = 0, frameId = 0, randomState = 1083, draws = 0;
let refuse = false;
const frames = new Map<number, FrameRequestCallback>();
type Write = { key: string; value: string; refused: boolean };
let writes: Write[] = [];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const g = () => capture.latest as ReturnType<typeof useStadiumTycoon>;
function rnd() {
  randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
  draws += 1;
  return randomState / 4294967296;
}
function rng() { return { state: randomState, draws }; }
function storage() {
  return Object.fromEntries(Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).sort().map(key => [key, localStorage.getItem(key)]));
}
function protectedBytes() {
  return Object.fromEntries([ACADEMY_KEY, REWARDS_KEY, 'sale-review-unrelated'].map(key => [key, localStorage.getItem(key)]));
}
function snapshot() {
  return { now: Date.now(), elapsed, state: capture.latest ? clone(g().state) : null, rng: rng(), storage: storage(), writes: clone(writes), completions: clone(recordCompletion.mock.calls) };
}
function check(id: string, actual: unknown, expected: unknown, evidence: unknown = snapshot()) {
  console.log(`SALE_RECORD|${JSON.stringify({ id, actual, expected, evidence })}`);
  expect(actual, id).toEqual(expected);
}
function button(name: string) {
  const found = screen.queryByRole('button', { name });
  check(`button:${name}`, Boolean(found), true);
  return found!;
}
function click(name: string) { fireEvent.click(button(name)); }
function reviewOpen() { return Boolean(document.querySelector('[data-tycoon-sale-review]')); }
function terms() {
  return Object.fromEntries(['award', 'starting-cash', 'rep-current', 'rep-next'].map(key => [key,
    Number(document.querySelector(`[data-sale-${key}]`)?.getAttribute(`data-sale-${key}`) ?? NaN)]));
}
function expectedTerms(state: E.TycoonState) {
  return { award: E.pointsForSale(state), 'starting-cash': E.startingMoneyOf(state), 'rep-current': E.repMult(state), 'rep-next': E.repMult({ ...state, rep: state.rep + 1 }) };
}
function ready(division = 2): E.TycoonState {
  const state = E.newTycoon(EPOCH);
  Object.assign(state, {
    rep: 1, money: 6000, lifetime: 28_000_000, fanbase: 350,
    minute: 20, matchSec: 0.4, goalsFor: 2, goalsAgainst: 1, streak: 3,
    totalGoals: 43, totalWins: 12, totalTaps: 50, totalMatches: 18, matchNo: 18,
    clubName: 'Pinecrest Rovers', leagueTitles: 2, bestDivision: division,
    legacyPoints: 20, legacyPerks: { rolling: 1, roots: 1 },
    claimed: ['win1'], ach: ['aw10'], boostLeftSec: 12, goldenKind: 'frenzy', goldenLeftSec: 8,
    levels: { ...state.levels, tickets: 2, stands: 8, squad: 4 }, staffLevels: { steward: 2 },
    league: E.newLeague(1, division, 0, 'Pinecrest Rovers', 18), ticketPolicy: 'premium',
  });
  return state;
}
function seed(state = ready()) {
  localStorage.setItem(E.TYCOON_SAVE_KEY, E.serializeTycoon(state, EPOCH));
  localStorage.setItem(ACADEMY_KEY, serializeAcademy(newFactory(EPOCH, 1083)));
  const rewards = creditFullTimes(newLedger(1083), [
    { totalMatches: 1, result: 'win', away: false, position: 1, division: 0 },
    { totalMatches: 2, result: 'win', away: false, position: 1, division: 0 },
  ]);
  localStorage.setItem(REWARDS_KEY, JSON.stringify(rewards));
  localStorage.setItem('sale-review-unrelated', '{"keep":"exact bytes"}');
  writes = [];
}
function resetRig() {
  refuse = false;
  cleanup();
  vi.clearAllTimers();
  elapsed = 0; frameId = 0; randomState = 1083; draws = 0;
  frames.clear(); capture.latest = null;
  localStorage.clear(); resetMocks(); writes = [];
}
function step(ms: number) {
  for (let i = 0; i < Math.round(ms / 16); i += 1) {
    act(() => {
      elapsed += 16;
      vi.advanceTimersByTime(16);
      const due = [...frames.values()]; frames.clear();
      for (const callback of due) callback(elapsed);
    });
  }
}
function HookReview() {
  const game = useStadiumTycoon();
  return <TycoonSaleReview state={game.state} onSell={game.doPrestige} />;
}
function mount(state = ready(), page = true) {
  seed(state);
  const expectedLedger = JSON.parse(localStorage.getItem(REWARDS_KEY)!);
  const view = page ? mountPage(<StadiumTycoon />, '/stadium-tycoon') : render(<HookReview />);
  check('mounted earned gear remains owned', { ledger: loadLedger(), ownsGear: (loadLedger().gearUnlocked?.length ?? 0) > 0 },
    { ledger: expectedLedger, ownsGear: true }, { fixture: 'Actual creditFullTimes reducer over two explicitly staged title transactions', after: snapshot() });
  return view;
}
function hide() { window.dispatchEvent(new Event('pagehide')); }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.spyOn(Date, 'now').mockImplementation(() => EPOCH + elapsed);
  vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
  vi.spyOn(Math, 'random').mockImplementation(rnd);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frameId += 1; frames.set(frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  const setItem = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    const denied = refuse && key === E.TYCOON_SAVE_KEY;
    writes.push({ key, value, refused: denied });
    if (denied) throw new DOMException('Storage full', 'QuotaExceededError');
    setItem.call(this, key, value);
  });
  resetRig();
});
afterEach(() => {
  refuse = false; cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Tycoon sell up review', () => {
  it(BASELINE, () => {
    const initial = E.newTycoon(EPOCH), before = clone(initial);
    const actual = E.buy(initial, 'tickets');
    check(BASELINE, { actual, input: initial, cost: E.costOf(initial, 'tickets') },
      { actual: original.buy(original.newTycoon(EPOCH), 'tickets'), input: before, cost: 25 });
  });

  it('actual page opens review without selling or writing progress', () => {
    mount();
    const before = snapshot();
    click('Review selling up');
    check('page opens without sale', { open: reviewOpen(), state: g().state, storage: storage(), rng: rng(), writes },
      { open: true, state: before.state, storage: before.storage, rng: before.rng, writes: before.writes }, { before, after: snapshot() });
    check('page live terms', terms(), expectedTerms(g().state));
    check('no completion from review', recordCompletion.mock.calls, []);
  });

  it('review terms follow promoted ground perks reputation and current state', () => {
    const onSell = vi.fn(() => true), first = ready(0);
    const view = render(<TycoonSaleReview state={first} onSell={onSell} />);
    click('Review selling up');
    for (const state of [first, { ...ready(4), rep: 3, legacyPoints: 31, legacyPerks: { rolling: 2 } }]) {
      const input = clone(state), before = snapshot();
      view.rerender(<TycoonSaleReview state={state} onSell={onSell} />);
      check('updated terms', terms(), expectedTerms(state), { input, before, after: snapshot() });
      click('Sell up help');
      const text = document.querySelector('[data-sale-help]')?.textContent ?? '';
      check('worked example follows current balance', text.includes(`from ${E.legacyPointsOf(state)} to ${E.legacyPointsOf(state) + E.pointsForSale(state)}`), true, { text, state });
      click('Back to sale review');
      check('term rendering preserves inputs and global streams', { state, storage: storage(), rng: rng(), sold: onSell.mock.calls.length },
        { state: input, storage: before.storage, rng: before.rng, sold: 0 });
    }
    const resetText = document.querySelector('[data-sale-resets]')?.textContent ?? '';
    check('reset disclosure matches fresh ground', ['earnings reset to 0', `Fans return to ${E.newTycoon(EPOCH).fanbase}`, 'staff start at level 0', E.DIVISIONS[0].name, 'Standard'].every(text => resetText.includes(text)), true, { resetText });
    const keeps = document.querySelector('[data-sale-keeps]')?.textContent ?? '';
    check('retained Academy and career disclosure', ['club name', 'legacy points and perks', 'badges', 'league titles', 'Academy players', 'first team, gems and gear'].every(text => keeps.includes(text)), true, { keeps });
  });

  it('cancel help escape and close preserve equal-clock page simulation', () => {
    for (const exit of ['Back', 'Escape', 'Close', 'Help']) {
      resetRig(); mount(); step(208);
      const baseStart = snapshot(); step(1872); act(hide); const baseline = snapshot();
      resetRig(); mount(); step(208);
      const reviewStart = snapshot(); click('Review selling up');
      if (exit === 'Help') click('Sell up help');
      step(1872);
      if (exit === 'Help') { click('Back to sale review'); click('Back'); }
      else if (exit === 'Escape') fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape', code: 'Escape' });
      else click(exit);
      act(hide);
      const actual = snapshot();
      check(`cancel:${exit}`, { state: actual.state, storage: actual.storage, rng: actual.rng, open: reviewOpen(), completions: actual.completions },
        { state: baseline.state, storage: baseline.storage, rng: baseline.rng, open: false, completions: baseline.completions }, { baseStart, reviewStart, baseline, actual });
      check(`clock continues:${exit}`, g().state.minute > reviewStart.state!.minute || (g().state.matchSec ?? 0) > (reviewStart.state!.matchSec ?? 0), true);
    }
  });

  it('actual promotion and perk purchase refresh the open review', () => {
    const state = ready(0);
    for (let i = 0; i < E.leagueShape(0).matchdays - 1; i += 1) {
      state.minute = 89; state.goalsFor = 8; state.goalsAgainst = 0;
      E.playMinute(state, () => 0.99, [], { pay: false });
    }
    state.minute = 89; state.matchSec = 1.3; state.goalsFor = 8; state.goalsAgainst = 0;
    mount(state, false); click('Review selling up');
    const before = snapshot(), oldAward = E.pointsForSale(g().state);
    step(416);
    check('actual tick promoted the planted final match', E.divisionIndex(g().state), 1, { fixture: 'Actual engine table from explicitly staged 8-0 final-minute scores, then actual live tick resolves the final match', before, after: snapshot() });
    check('promotion updates open sale award', terms().award, oldAward + 1);
    act(() => g().doLegacyPerk('rolling'));
    check('perk purchase updates open cash term', terms(), expectedTerms(g().state));
    check('rolling perk actually purchased', E.perkLevelOf(g().state, 'rolling'), 2);
  });

  it('final page confirmation matches complete current engine result and save', () => {
    mount(); click('Review selling up'); step(416);
    const before = snapshot(), state = clone(g().state), other = protectedBytes();
    const expected = E.prestige(state, Date.now()), expectedRaw = E.serializeTycoon(expected, Date.now());
    click('Sell and restart');
    check('complete page sale', { state: g().state, raw: localStorage.getItem(E.TYCOON_SAVE_KEY), protected: protectedBytes(), rng: rng(), open: reviewOpen() },
      { state: expected, raw: expectedRaw, protected: other, rng: before.rng, open: false }, { before, expected, after: snapshot() });
    check('sale does not submit score or completion', recordCompletion.mock.calls, []);
  });

  it('same-task latest ref sale and pagehide survive exact reload', () => {
    const view = mount(ready(), false);
    const before = snapshot();
    const tapped = E.tap(clone(g().state));
    const expected = E.prestige(tapped, Date.now());
    let sold: boolean;
    act(() => { g().doTap(50, 50); sold = g().doPrestige(); hide(); });
    const raw = localStorage.getItem(E.TYCOON_SAVE_KEY);
    check('same task tap sale hide', { sold: sold!, state: g().state, raw }, { sold: true, state: expected, raw: E.serializeTycoon(expected, Date.now()) }, { before, after: snapshot() });
    view.unmount();
    render(<HookReview />);
    check('exact sold ground reload', g().state, E.deserializeTycoon(raw, Date.now()), { raw, after: snapshot() });
  });

  it('refused sale preserves latest ref state and old durable bytes', () => {
    mount(ready(), false); click('Review selling up');
    const before = snapshot(), other = protectedBytes(), expected = E.tap(clone(g().state));
    refuse = true;
    act(() => { g().doTap(50, 50); fireEvent.click(button('Sell and restart')); });
    const failed = snapshot();
    check('failed transaction holds latest unsaved state', { state: g().state, raw: localStorage.getItem(E.TYCOON_SAVE_KEY), protected: protectedBytes(), open: reviewOpen(), alert: Boolean(document.querySelector('[data-sale-save-error]')) },
      { state: expected, raw: before.storage[E.TYCOON_SAVE_KEY], protected: other, open: true, alert: true }, { before, failed });
    act(hide);
    check('ref remains the old latest ground on hide refusal', writes[writes.length - 1], { key: E.TYCOON_SAVE_KEY, value: E.serializeTycoon(expected, Date.now()), refused: true }, { failed, after: snapshot() });
  });

  it('retry after running ticks sells latest terms and clears failure', () => {
    mount(ready(), false); click('Review selling up');
    refuse = true; click('Sell and restart');
    const failed = snapshot(); step(416);
    check('failed ground keeps running', g().state.money !== failed.state!.money, true, { failed, running: snapshot() });
    refuse = false;
    act(() => g().doLegacyPerk('rolling'));
    const before = snapshot(), expected = E.prestige(clone(g().state), Date.now());
    check('retry shows latest terms', terms(), expectedTerms(g().state));
    click('Sell and restart');
    check('retry commits latest complete ground', { state: g().state, raw: localStorage.getItem(E.TYCOON_SAVE_KEY), open: reviewOpen(), alert: Boolean(document.querySelector('[data-sale-save-error]')) },
      { state: expected, raw: E.serializeTycoon(expected, Date.now()), open: false, alert: false }, { failed, before, after: snapshot() });
  });

  it('failed sale can be cancelled and reopened without a transaction', () => {
    mount(ready(), false); click('Review selling up'); refuse = true; click('Sell and restart');
    const before = snapshot();
    click('Back'); click('Review selling up');
    check('reopen clears only failure notice', { state: g().state, storage: storage(), writes, open: reviewOpen(), alert: Boolean(document.querySelector('[data-sale-save-error]')) },
      { state: before.state, storage: before.storage, writes: before.writes, open: true, alert: false }, { before, after: snapshot() });
  });

  it('ineligible review and hook cannot sell or write', () => {
    mount(E.newTycoon(EPOCH), false); click('Review selling up');
    const before = snapshot(), confirm = button('Sell and restart');
    check('ineligible confirm disabled', (confirm as HTMLButtonElement).disabled, true);
    fireEvent.click(confirm);
    let result: boolean;
    act(() => { result = g().doPrestige(); });
    check('ineligible hook has no effects', { result: result!, state: g().state, storage: storage(), writes },
      { result: false, state: before.state, storage: before.storage, writes: before.writes }, { before, after: snapshot() });
  });

  it('successful confirmation guards a second same-task activation', () => {
    const onSell = vi.fn(() => true);
    render(<TycoonSaleReview state={ready()} onSell={onSell} />); click('Review selling up');
    const confirm = button('Sell and restart');
    act(() => { fireEvent.click(confirm); fireEvent.click(confirm); });
    check('single callback confirmation', onSell.mock.calls.length, 1);
  });
});
