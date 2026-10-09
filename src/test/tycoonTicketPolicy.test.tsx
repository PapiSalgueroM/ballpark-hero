import { recordCompletion, resetMocks } from './dailyReload/mocks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as engine from '@/lib/stadiumTycoon';
import type { TicketPolicy, TycoonState } from '@/lib/stadiumTycoon';
import { mountPage } from './dailyReload/harness';
import StadiumTycoon from '@/pages/StadiumTycoon';
import * as original from '../../scripts/fixtures/tycoon1080Baseline/stadiumTycoon';
import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';
import TicketPolicyCard from '@/components/tycoon/TicketPolicyCard';
import corpus from './fixtures/tycoonSaves.json';

type TicketTerms = { id: TicketPolicy; label: string; gate: number; demand: number; growth: number };
const helpFixture = vi.hoisted(() => ({
  rows: null as TicketTerms[] | null,
  clone: null as (() => TicketTerms[]) | null,
}));
vi.mock('@/lib/stadiumTycoon', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/stadiumTycoon')>();
  helpFixture.clone = () => real.TICKET_POLICIES.map(row => ({ ...row }));
  const terms = new Proxy([] as TicketTerms[], {
    get(_target, key) { return Reflect.get(helpFixture.rows ?? real.TICKET_POLICIES, key); },
    has(_target, key) { return key in (helpFixture.rows ?? real.TICKET_POLICIES); },
  });
  return { ...real, TICKET_POLICIES: terms };
});

const EPOCH = 1767225600000;
const policies: TicketPolicy[] = ['community', 'standard', 'premium'];
let elapsed = 0;
let frame: FrameRequestCallback | null = null;
let latest: ReturnType<typeof useStadiumTycoon>;
function Probe() {
  latest = useStadiumTycoon();
  return <TicketPolicyCard state={latest.state} onSelect={latest.doSetTicketPolicy} saveFailed={latest.ticketSaveFailed} onRetrySave={latest.retryTicketSave} />;
}
function stream(seed: number) {
  let value = seed >>> 0;
  const out = { draws: 0, next: () => {
    out.draws += 1;
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  } };
  return out;
}
function advance(ms: number) {
  for (let i = 0; i < ms / 16; i += 1) {
    elapsed += 16;
    const cb = frame;
    frame = null;
    act(() => cb?.(elapsed));
  }
}
function visibility(visible: boolean) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: visible ? 'visible' : 'hidden' });
  act(() => document.dispatchEvent(new Event('visibilitychange')));
}
function chosen(policy: TicketPolicy, state = engine.newTycoon(EPOCH)) {
  return engine.setTicketPolicy(state, policy);
}
function equalMetrics(container: HTMLElement, state: TycoonState) {
  const expected = engine.ticketEconomy(state);
  const keys = { crowd: expected.crowd, gate: expected.gatePerSec, concessions: expected.concessionsPerSec, other: expected.otherPerSec, total: expected.totalPerSec, growth: expected.growthPerSec };
  for (const [key, value] of Object.entries(keys)) {
    expect(Number(container.querySelector(`[data-ticket-value="${key}"]`)?.getAttribute('data-value')), key).toBe(value);
  }
}
beforeEach(() => {
  helpFixture.rows = null;
  elapsed = 0;
  frame = null;
  localStorage.clear();
  resetMocks();
  vi.spyOn(Date, 'now').mockImplementation(() => EPOCH + elapsed);
  vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
  vi.spyOn(Math, 'random').mockImplementation(stream(1080).next);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frame = cb; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { frame = null; });
  visibility(true);
});
afterEach(() => {
  try { cleanup(); } finally {
    helpFixture.rows = null;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});

describe('Stadium ticket policy', () => {
  it('independent upgrade purchase keeps original cost and money accounting', () => {
    const initial = engine.newTycoon(EPOCH);
    expect(engine.costOf(initial, 'tickets')).toBe(25);
    const bought = engine.buy(initial, 'tickets');
    expect(bought.money).toBe(15);
    expect(bought.levels.tickets).toBe(1);
    expect(bought).toEqual(original.buy(original.newTycoon(EPOCH), 'tickets'));
  });

  it('Standard keeps exact original trajectories events and random draws', () => {
    for (const seed of [1, 29, 901, 8117]) {
      let live = engine.newTycoon(EPOCH);
      let old = original.newTycoon(EPOCH);
      const a = stream(seed), b = stream(seed);
      for (let i = 0; i < 1800; i += 1) {
        if (i % 5 === 0) { live = engine.tap(live); old = original.tap(old); }
        if (i % 37 === 0) { live = engine.buy(live, 'tickets'); old = original.buy(old, 'tickets'); }
        if (i % 61 === 0) { live = engine.buy(live, 'lights'); old = original.buy(old, 'lights'); }
        if (i % 97 === 0) { live = engine.activateBoost(live); old = original.activateBoost(old); }
        const current = engine.tick(live, 0.208, a.next), baseline = original.tick(old, 0.208, b.next);
        expect(current).toEqual(baseline);
        live = current.state; old = baseline.state;
      }
      expect(a.draws).toBe(b.draws);
      expect(a.draws).toBeGreaterThan(0);
      expect(engine.serializeTycoon(live, EPOCH)).toBe(original.serializeTycoon(old, EPOCH));
      expect(engine.offlineEarnings(live, EPOCH + 36_000_000)).toBe(original.offlineEarnings(old, EPOCH + 36_000_000));
    }
  });

  it('existing save corpus keeps the exact original normalized shape', () => {
    for (const entry of corpus.entries.filter(row => row.key === 'stadium')) {
      expect(engine.deserializeTycoon(entry.raw, corpus.now), entry.name).toEqual(original.deserializeTycoon(entry.raw, corpus.now));
    }
    expect(engine.serializeTycoon(engine.newTycoon(EPOCH), EPOCH)).toBe(original.serializeTycoon(original.newTycoon(EPOCH), EPOCH));
  });

  it('policy migration accepts only supported values and remains readable by the old loader', () => {
    for (const invalid of ['standard', 'luxury', '', 7, null, {}, ['premium']]) {
      const loaded = engine.deserializeTycoon(JSON.stringify({ ...engine.newTycoon(EPOCH), ticketPolicy: invalid }), EPOCH)!;
      expect(loaded).not.toHaveProperty('ticketPolicy');
      expect(engine.ticketPolicyOf(loaded)).toBe('standard');
    }
    for (const policy of policies) {
      const raw = engine.serializeTycoon(chosen(policy), EPOCH);
      const loaded = engine.deserializeTycoon(raw, EPOCH)!;
      expect(engine.ticketPolicyOf(loaded)).toBe(policy);
      const oldLoaded = original.deserializeTycoon(raw, EPOCH)!;
      const { ticketPolicy: _ignored, ...oldFields } = oldLoaded as TycoonState;
      expect(oldFields).toEqual(original.deserializeTycoon(original.serializeTycoon(original.newTycoon(EPOCH), EPOCH), EPOCH));
    }
  });

  it('actual tick earnings and crowd follow the offered gate and finite demand', () => {
    const expected = { standard: [90, 4.5], community: [90, 3.825], premium: [67, 4.1875] };
    for (const policy of policies) {
      const state = chosen(policy);
      const [crowd, rate] = expected[policy];
      expect(engine.attendance(state)).toBe(crowd);
      expect(engine.incomePerSec(state)).toBeCloseTo(rate, 12);
      const next = engine.tick(state, 1, () => 0.99).state;
      expect(next.money - state.money).toBeCloseTo(rate, 12);
      expect(next.lifetime - state.lifetime).toBeCloseTo(rate, 12);
      for (const fans of [0, 1.9, 90.9, 120, 240, 10_000]) {
        const count = engine.attendance({ ...state, fanbase: fans });
        expect(count).toBeLessThanOrEqual(Math.min(engine.capacity(state), Math.floor(fans)));
        expect(Number.isInteger(count)).toBe(true);
      }
    }
  });

  it('parking and payroll never receive the gate multiplier and concessions use actual crowd', () => {
    const state = { ...engine.newTycoon(EPOCH), fanbase: 200, levels: { ...engine.newTycoon(EPOCH).levels, tickets: 3, snacks: 4, shop: 2, parking: 2 }, staffLevels: { steward: 3 } };
    const other = engine.ticketEconomy(state).otherPerSec;
    for (const policy of policies) {
      const active = chosen(policy, state), row = engine.ticketEconomy(active);
      expect(row.otherPerSec).toBe(other);
      const noOther = { ...active, levels: { ...active.levels, parking: 0 }, staffLevels: {} };
      expect(engine.incomePerSec(active) - engine.incomePerSec(noOther)).toBeCloseTo(other, 12);
      expect(row.concessionsPerSec).toBeCloseTo(row.crowd * (4 * 0.009 + 2 * 0.016), 12);
      expect(row.gatePerSec + row.concessionsPerSec + row.otherPerSec).toBeCloseTo(row.totalPerSec, 12);
    }
  });

  it('supporter growth changes once and preserves capacity pressure and legacy roots', () => {
    for (const fans of [90, 360]) {
      const state = { ...engine.newTycoon(EPOCH), fanbase: fans, levels: { ...engine.newTycoon(EPOCH).levels, lights: 3, academy: 2 }, legacyPerks: { roots: 2 }, streak: 2 };
      const standard = original.fanGrowthPerSec(state);
      for (const [policy, multiplier] of [['community', 1.5], ['standard', 1], ['premium', 0.75]] as const) {
        const active = chosen(policy, state);
        expect(engine.fanGrowthPerSec(active)).toBe(standard * multiplier);
        expect(engine.tick(active, 0.2, () => 0.99).state.fanbase - fans).toBeCloseTo(standard * multiplier * 0.2, 12);
      }
    }
  });

  it('switches conserve existing money clocks bonuses and all unrelated state', () => {
    const state = { ...engine.newTycoon(EPOCH), money: 932.25, lifetime: 4001, matchSec: 0.9, minute: 47, goalsFor: 2 };
    for (const policy of policies) {
      const active = chosen(policy, state);
      const { ticketPolicy: _ignored, ...rest } = active;
      expect(rest).toEqual(state);
      expect(engine.setTicketPolicy(active, 'standard')).toEqual(state);
      const expectedTap = Math.max(1, Math.round(engine.incomePerSec(active) * 0.7));
      expect(engine.tap(active).money - active.money).toBe(expectedTap);
      expect(engine.goalBonus(active)).toBe(Math.round(engine.attendance(active) * 0.6));
    }
  });

  it('all offers keep the same actual scorelines league results and match draw counts', () => {
    const results = policies.map(policy => {
      let state = chosen(policy);
      const random = stream(81120);
      const scores: unknown[] = [];
      for (let i = 0; i < 1800; i += 1) {
        const next = engine.tick(state, 0.7, random.next);
        state = next.state;
        scores.push([state.minute, state.goalsFor, state.goalsAgainst, state.totalGoals, state.totalWins, state.totalMatches, state.league]);
      }
      return { scores, draws: random.draws };
    });
    expect(results[0]).toEqual(results[1]);
    expect(results[2]).toEqual(results[1]);
  });

  it('offline uses the saved offer once with unchanged caps and no live boosts or fan growth', () => {
    for (const policy of policies) {
      const active = { ...chosen(policy), boostLeftSec: 50, goldenKind: 'frenzy' as const, goldenLeftSec: 60 };
      const idle = engine.incomePerSec({ ...active, boostLeftSec: 0, goldenLeftSec: 0, goldenKind: null });
      expect(engine.offlineEarnings(active, EPOCH + 29_000)).toBe(0);
      expect(engine.offlineEarnings(active, EPOCH + 10 * 3600_000)).toBe(Math.round(idle * 8 * 3600 * 0.5));
      expect(engine.offlineEarnings({ ...active, legacyPerks: { away: 2 } }, EPOCH + 24 * 3600_000)).toBe(Math.round(idle * 12 * 3600 * 0.8));
      expect(active.fanbase).toBe(90);
    }
  });

  it('serialized offers continue identical earnings and matches after restore', () => {
    for (const policy of policies) {
      let a = engine.deserializeTycoon(engine.serializeTycoon(chosen(policy), EPOCH), EPOCH)!;
      const first = stream(72);
      for (let i = 0; i < 35; i += 1) a = engine.tick(a, 0.208, first.next).state;
      let b = engine.deserializeTycoon(engine.serializeTycoon(a, EPOCH), EPOCH)!;
      const left = stream(73), right = stream(73);
      for (let i = 0; i < 700; i += 1) {
        a = engine.tick(a, 0.208, left.next).state;
        b = engine.tick(b, 0.208, right.next).state;
      }
      expect(a).toEqual(b);
      expect(left.draws).toBe(right.draws);
    }
  });

  it('a new ground resets the offer without changing the original prestige award', () => {
    const standard = { ...engine.newTycoon(EPOCH), lifetime: 1e12, money: 1e9 };
    for (const policy of policies) {
      const next = engine.prestige(chosen(policy, standard), EPOCH);
      expect(next.rep).toBe(1);
      expect(next).not.toHaveProperty('ticketPolicy');
      expect(next).toEqual(original.prestige(standard, EPOCH));
    }
  });

  it('mounted choices drive actual hook rates and every displayed accounting line', () => {
    const seed = engine.newTycoon(EPOCH);
    localStorage.setItem(engine.TYCOON_SAVE_KEY, engine.serializeTycoon({ ...seed, levels: { ...seed.levels, snacks: 2, shop: 1, parking: 1 }, staffLevels: { steward: 1 } }, EPOCH));
    const { container } = render(<Probe />);
    for (const policy of policies) {
      const label = policy[0].toUpperCase() + policy.slice(1);
      const button = screen.queryByRole('button', { name: label });
      expect(button).not.toBeNull();
      fireEvent.click(button!);
      expect(engine.ticketPolicyOf(latest.state)).toBe(policy);
      expect(button).toHaveAttribute('aria-pressed', 'true');
      equalMetrics(container, latest.state);
      const before = latest.state.money;
      const rate = engine.incomePerSec(latest.state);
      advance(208);
      expect(latest.state.money - before).toBeCloseTo(rate * 0.208, 10);
      equalMetrics(container, latest.state);
    }
  });

  it('rules describe the actual finite example and selected tradeoffs before play', () => {
    render(<Probe />);
    expect(screen.getByText(/Trade gate money for supporter growth/)).toBeInTheDocument();
    expect(screen.getByText(/Example, a new 120-seat ground/)).toHaveTextContent('90 supporters pay $4.50/sec on Standard. Premium draws 67 and pays $4.19/sec. With 240 supporters, both fill 120 seats: Standard pays $6.00/sec and Premium $7.50/sec.');
    fireEvent.click(screen.getByRole('button', { name: 'Community' }));
    expect(screen.queryByText('15% less gate money per fan. Supporters grow 50% faster.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Premium' }));
    expect(screen.getByText(/75% of supporters want to attend/)).toBeInTheDocument();
  });

  it('rules modal keeps distinct Premium gate demand and growth cells separate', () => {
    const capture: Record<string, unknown> = {};
    const readSentence = () => {
      const dialog = screen.getByRole('dialog', { name: 'How Stadium Tycoon works' });
      const paragraphs = [...dialog.querySelectorAll('[data-tycoon-rules] p')]
        .map(node => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
        .filter(text => text.startsWith('The Ticket offer tile sets your matchday price, and switching is free at any time.'));
      expect(paragraphs).toHaveLength(1);
      const sentences = [...paragraphs[0].matchAll(/Premium adds (\d+)% to the gate money each fan pays, but only (\d+)% of your supporters turn up and they grow (\d+)% slower\./g)];
      expect(sentences).toHaveLength(1);
      return { paragraph: paragraphs[0], sentence: sentences[0][0], values: sentences[0].slice(1).map(Number) };
    };
    try {
      capture.engineBefore = engine.ticketEconomy(chosen('premium'));
      mountPage(<StadiumTycoon />, '/stadium-tycoon');
      const normal = readSentence();
      capture.normal = normal;
      expect(normal.sentence).toBe('Premium adds 25% to the gate money each fan pays, but only 75% of your supporters turn up and they grow 25% slower.');
      cleanup();
      localStorage.clear();

      helpFixture.rows = helpFixture.clone!();
      const premium = helpFixture.rows.find(row => row.id === 'premium');
      expect(premium).toBeDefined();
      premium!.growth = 0.60;
      capture.distinctTerms = { ...premium! };
      const percentages = [Math.round((premium!.gate - 1) * 100), Math.round(premium!.demand * 100), Math.round((1 - premium!.growth) * 100)];
      capture.fixturePercentages = percentages;
      expect(percentages).toEqual([25, 75, 40]);
      expect(new Set(percentages).size).toBe(3);
      capture.engineAfter = engine.ticketEconomy(chosen('premium'));
      expect(capture.engineAfter).toEqual(capture.engineBefore);
      mountPage(<StadiumTycoon />, '/stadium-tycoon');
      const distinct = readSentence();
      capture.distinct = distinct;
      expect(distinct.sentence).toBe('Premium adds 25% to the gate money each fan pays, but only 75% of your supporters turn up and they grow 40% slower.');
    } finally {
      try { cleanup(); } finally {
        helpFixture.rows = null;
        capture.restoredTerms = { ...engine.TICKET_POLICIES.find(row => row.id === 'premium') };
        console.log(`TICKET_HELP_BINDINGS|${JSON.stringify(capture)}`);
      }
    }
  });

  it('a changed offer marks one unscored session while viewing and repeated choices stay quiet', () => {
    render(<Probe />);
    fireEvent.click(screen.getByRole('button', { name: 'Standard' }));
    expect(recordCompletion).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Community' }));
    fireEvent.click(screen.getByRole('button', { name: 'Community' }));
    fireEvent.click(screen.getByRole('button', { name: 'Premium' }));
    fireEvent.click(screen.getByRole('button', { name: 'Standard' }));
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(recordCompletion).toHaveBeenCalledWith('/stadium-tycoon');
    act(() => latest.doBuy('tickets'));
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('selection saves immediately and restores the same offer without resetting progress', () => {
    const mounted = render(<Probe />);
    advance(1600);
    const before = latest.state;
    fireEvent.click(screen.getByRole('button', { name: 'Premium' }));
    const saved = JSON.parse(localStorage.getItem(engine.TYCOON_SAVE_KEY)!);
    expect(saved).not.toBeNull();
    expect(saved.ticketPolicy).toBe('premium');
    expect(saved.money).toBe(before.money);
    expect(saved.minute).toBe(before.minute);
    mounted.unmount();
    render(<Probe />);
    expect(engine.ticketPolicyOf(latest.state)).toBe('premium');
    expect(latest.state.money).toBe(before.money);
    expect(latest.state.minute).toBe(before.minute);
  });

  it('refused save retains old bytes and explicit retry writes the latest live state', () => {
    render(<Probe />);
    fireEvent.click(screen.getByRole('button', { name: 'Standard' }));
    const old = localStorage.getItem(engine.TYCOON_SAVE_KEY);
    const writer = Storage.prototype.setItem;
    let blocked = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(key, value) {
      if (key === engine.TYCOON_SAVE_KEY && blocked) throw new DOMException('Quota full', 'QuotaExceededError');
      return writer.call(this, key, value);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Community' }));
    expect(engine.ticketPolicyOf(latest.state)).toBe('community');
    expect(localStorage.getItem(engine.TYCOON_SAVE_KEY)).toBe(old);
    expect(screen.queryByRole('alert')).not.toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('not saved on this device');
    advance(2200);
    act(() => latest.doTap(30, 40));
    const current = latest.state;
    blocked = false;
    const retry = screen.queryByRole('button', { name: 'Retry save' });
    expect(retry).not.toBeNull();
    fireEvent.click(retry!);
    expect(JSON.parse(localStorage.getItem(engine.TYCOON_SAVE_KEY)!)).toEqual(JSON.parse(engine.serializeTycoon(current, Date.now())));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('autosave recovers failure and hide settlement pays the chosen saved rate only once', () => {
    const mounted = render(<Probe />);
    fireEvent.click(screen.getByRole('button', { name: 'Premium' }));
    const writer = Storage.prototype.setItem;
    let blocked = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(key, value) {
      if (key === engine.TYCOON_SAVE_KEY && blocked) throw new Error('blocked');
      return writer.call(this, key, value);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Community' }));
    expect(latest.ticketSaveFailed).toBe(true);
    blocked = false;
    advance(5200);
    expect(latest.ticketSaveFailed).toBe(false);
    visibility(false);
    const hidden = latest.state;
    const snapshot = JSON.parse(localStorage.getItem(engine.TYCOON_SAVE_KEY)!);
    elapsed += 300_000;
    visibility(true);
    const expected = engine.offlineEarnings({ ...hidden, savedAt: snapshot.savedAt }, Date.now());
    expect(latest.awayPay).toBeCloseTo(expected, 0);
    expect(latest.state.fanbase).toBe(hidden.fanbase);
    const balance = latest.state.money;
    mounted.unmount();
    render(<Probe />);
    expect(latest.state.money).toBe(balance);
    expect(engine.ticketPolicyOf(latest.state)).toBe('community');
  });

  it('hide banks the latest offer and earned money before the next autosave', () => {
    render(<Probe />);
    fireEvent.click(screen.getByRole('button', { name: 'Premium' }));
    const before = localStorage.getItem(engine.TYCOON_SAVE_KEY);
    advance(208);
    visibility(false);
    expect(localStorage.getItem(engine.TYCOON_SAVE_KEY)).not.toBe(before);
    expect(JSON.parse(localStorage.getItem(engine.TYCOON_SAVE_KEY)!)).toEqual(JSON.parse(engine.serializeTycoon(latest.state, Date.now())));
  });

  it('records finite early expanding and mature policy outcomes from actual clocks', () => {
    const measurements: unknown[] = [];
    for (const regime of ['early', 'expanding', 'mature']) {
      for (let seed = 1; seed <= 24; seed += 1) {
        for (const policy of policies) {
          let state = chosen(policy);
          if (regime !== 'early') state = { ...state, fanbase: regime === 'mature' ? 1000 : 90, levels: { ...state.levels, stands: 10, lights: 5, academy: 3 } };
          const start = engine.ticketEconomy(state), random = stream(seed * 104729);
          let passive = 0;
          const seconds = regime === 'expanding' ? 600 : 60;
          for (let step = 0; step < seconds * 5; step += 1) {
            passive += engine.incomePerSec(state) * 0.2;
            state = engine.tick(state, 0.2, random.next).state;
          }
          expect(Number.isFinite(state.money)).toBe(true);
          expect(passive).toBeGreaterThan(0);
          expect(engine.attendance(state)).toBeLessThanOrEqual(engine.capacity(state));
          measurements.push({ regime, seed, policy, seconds, passive, money: state.money, supporters: state.fanbase, start, end: engine.ticketEconomy(state), draws: random.draws });
        }
      }
    }
    console.log(`TICKET_MEASUREMENTS|${JSON.stringify(measurements)}`);
  });
});
