import { describe, expect, it, vi } from 'vitest';
import type { UsCareerCore } from '@/lib/usCareerSport';
import type { UsSport } from '@/lib/usCareerToCoach';
import { pushExtension, type ExtensionTalk } from '@/lib/usCareerExtension';
import { pushFaOffer, type FaWindow, type FaOffer } from '@/lib/usCareerFreeAgency';
import { acknowledgeMarketWheel, declineMarketExtension, extensionMarketProbabilities, freeAgencyMarketProbabilities,
  marketOfferComparison, marketWheelPosition, openMarketExtension, openMarketFreeAgency, pushMarketExtension,
  pushMarketFreeAgency, restoreMarketTalk, type UsCareerMarketTalk } from '@/lib/usCareerMarket';

const career = (patch: Partial<UsCareerCore> = {}): UsCareerCore => ({ name: 'Market Test', pos: 'QB', team: 'AAA', year: 2026,
  age: 27, ovr: 85, morale: 70, pot: 90, fanbase: 50, health: 90, salary: 10, contractYears: 1, seasons: [], retired: false,
  draftPick: 5, earnings: 20, ...patch });
const extension = (): ExtensionTalk => ({ team: 'AAA', label: 'Test incumbent', market: 12,
  offer: { salary: 10, years: 2, mood: 'fair', line: 'Simulated offer.' }, pushed: false, pulled: false, note: 'Opening offer.' });
const offer = (team: string, salary: number, years: number, quality: number, incumbent = false): FaOffer => ({
  team, label: 'Test ' + team, salary, years, quality, incumbent, pushed: false, gone: false,
  tier: quality >= 86 ? 'contender' : quality >= 74 ? 'playoff' : 'rebuild', pitch: 'Simulated offer.',
});
const windowOf = (): FaWindow => ({ note: 'Saved market.', offers: [offer('AAA', 8, 3, 74, true), offer('BBB', 12, 2, 65), offer('CCC', 10, 4, 90)] });
const tape = (values: number[]) => { const draws: number[] = []; return { draws, rng: () => {
  const n = values[draws.length]; if (n === undefined) throw new Error('Unexpected draw'); draws.push(n); return n;
} }; };
const pushArgs = (ovr: number, rng: () => number) => ({ ovr, age: 27, accolades: 0, cliffAge: 32, rng });
const clone = <T,>(v: T): T => structuredClone(v);

describe('saved US contract market', () => {
  it.each(['nfl', 'nba', 'mlb', 'nhl'] as UsSport[])('restore accepts complete %s extension and market snapshots without mutation', sport => {
    const c = career(), faCareer = career({ contractYears: 0 });
    const ext = openMarketExtension(c, sport, extension()), fa = openMarketFreeAgency(faCareer, sport, windowOf());
    const before = clone({ c, faCareer, ext, fa });
    expect(restoreMarketTalk(ext, c, sport)).toBe(ext);
    expect(restoreMarketTalk(fa, faCareer, sport)).toBe(fa);
    expect({ c, faCareer, ext, fa }).toEqual(before);
  });
  it.each([undefined, null, false, [], {}, { kind: 'freeagency' }])('restore drops absent or incomplete data alone (%j)', value => {
    const c = career(), before = clone(c);
    expect(restoreMarketTalk(value, c, 'nfl')).toBeNull(); expect(c).toEqual(before);
  });
  it.each([
    ['sport', career(), 'nba' as UsSport], ['year', career({ year: 2027 }), 'nfl' as UsSport],
    ['team', career({ team: 'BBB' }), 'nfl' as UsSport], ['contract', career({ contractYears: 2 }), 'nfl' as UsSport],
    ['salary', career({ salary: 11 }), 'nfl' as UsSport], ['retired', career({ retired: true }), 'nfl' as UsSport],
  ] as const)('restore rejects stale %s binding without repairing the career', (_label, c, sport) => {
    const before = clone(c); expect(restoreMarketTalk(openMarketExtension(career(), 'nfl', extension()), c, sport)).toBeNull(); expect(c).toEqual(before);
  });
  it.each([
    { offer: { salary: NaN, years: 2, mood: 'fair', line: 'Offer.' } }, { offer: { salary: 10, years: 0, mood: 'fair', line: 'Offer.' } },
    { pulled: true, pushed: false }, { offer: undefined }, { offer: [] },
  ])('restore rejects malformed extension terms (%j)', patch => {
    const saved = openMarketExtension(career(), 'nfl', { ...extension(), ...patch } as unknown as ExtensionTalk);
    expect(restoreMarketTalk(saved, career(), 'nfl')).toBeNull();
  });
  it.each(['duplicate', 'no-incumbent', 'gone-incumbent', 'bad-quality', 'bad-years', 'gone-unpushed'] as const)('restore rejects malformed %s market', kind => {
    const w = windowOf();
    if (kind === 'duplicate') w.offers[1].team = 'AAA';
    if (kind === 'no-incumbent') w.offers[0].incumbent = false;
    if (kind === 'gone-incumbent') { w.offers[0].pushed = true; w.offers[0].gone = true; }
    if (kind === 'bad-quality') w.offers[1].quality = Infinity;
    if (kind === 'bad-years') w.offers[1].years = 1.5;
    if (kind === 'gone-unpushed') w.offers[1].gone = true;
    expect(restoreMarketTalk(openMarketFreeAgency(career({ contractYears: 0 }), 'nfl', w), career({ contractYears: 0 }), 'nfl')).toBeNull();
  });
  it('restore preserves a no-offer extension and a same-year declined marker', () => {
    const c = career(), t = extension(); t.offer = null;
    const saved = declineMarketExtension(openMarketExtension(c, 'nfl', t));
    expect(restoreMarketTalk(saved, c, 'nfl')).toBe(saved);
    expect(declineMarketExtension(saved)).toBe(saved);
    expect(restoreMarketTalk(saved, career({ year: 2027 }), 'nfl')).toBeNull();
  });
  it('farewell rejects extension talks and longer market contracts', () => {
    const c = career({ retirement: { farewellYear: 2026 } });
    expect(restoreMarketTalk(openMarketExtension(c, 'nfl', extension()), c, 'nfl')).toBeNull();
    const fa = career({ contractYears: 0, retirement: { farewellYear: 2026 } });
    expect(restoreMarketTalk(openMarketFreeAgency(fa, 'nfl', windowOf()), fa, 'nfl')).toBeNull();
    const w = windowOf(); w.offers.forEach(o => { o.years = 1; });
    expect(restoreMarketTalk(openMarketFreeAgency(fa, 'nfl', w), fa, 'nfl')).not.toBeNull();
    const next = pushMarketFreeAgency(openMarketFreeAgency(fa, 'nfl', w), 1, { ...pushArgs(95, tape([0.1, 0.5]).rng), maxYears: 1 });
    expect(next.kind === 'freeagency' && next.window.offers.every(o => o.years === 1)).toBe(true);
    expect(next.wheel?.draws).toEqual([0.1, 0.5]);
  });
  it.each([
    [94, [0.99, 0.2, 0.1], 'raised'], [85, [0.2, 0.2], 'raised'],
    [83, [0.99], 'held'], [70, [0.1], 'withdrawn'], [70, [0.8], 'held'],
  ] as const)('extension replay holds complete original terms and draws at OVR %s', (ovr, values, result) => {
    const original = tape([...values]), captured = tape([...values]), t = extension();
    const saved = openMarketExtension(career(), 'nfl', t), before = clone(saved);
    const expected = pushExtension(t, pushArgs(ovr, original.rng));
    const actual = pushMarketExtension(saved, pushArgs(ovr, captured.rng));
    expect(actual.kind).toBe('extension');
    if (actual.kind !== 'extension') throw new Error('Wrong kind');
    expect(actual.talk).toEqual(expected); expect(actual.reply).toBe(expected.note);
    expect(captured.draws).toEqual(original.draws); expect(actual.wheel?.draws).toEqual(original.draws);
    expect(actual.wheel?.result).toBe(result); expect(saved).toEqual(before);
    expect(restoreMarketTalk(clone(actual), career(), 'nfl')).toEqual(actual);
  });
  it.each([
    [1, [0.1, 0.2, 0.1], 'raised'], [1, [0.99, 0.1], 'withdrawn'], [1, [0.99, 0.9], 'held'], [0, [0.99], 'held'],
  ] as const)('freeagency replay holds complete original terms and draws for offer %s', (index, values, result) => {
    const original = tape([...values]), captured = tape([...values]), w = windowOf(), c = career({ contractYears: 0 });
    const saved = openMarketFreeAgency(c, 'nfl', w), before = clone(saved);
    const expected = pushFaOffer(w, index, pushArgs(85, original.rng));
    const actual = pushMarketFreeAgency(saved, index, pushArgs(85, captured.rng));
    if (actual.kind !== 'freeagency') throw new Error('Wrong kind');
    expect(actual.window).toEqual(expected.window); expect(actual.reply).toBe(expected.line);
    expect(captured.draws).toEqual(original.draws); expect(actual.wheel?.draws).toEqual(original.draws);
    expect(actual.wheel?.result).toBe(result); expect(saved).toEqual(before);
    expect(restoreMarketTalk(clone(actual), c, 'nfl')).toEqual(actual);
  });
  it('probabilities describe exact extension branches including guaranteed success', () => {
    expect(extensionMarketProbabilities(pushArgs(94, () => 0))).toEqual({ raised: 1, held: 0, withdrawn: 0 });
    expect(extensionMarketProbabilities(pushArgs(83, () => 0))).toEqual({ raised: 0.55, held: 0.44999999999999996, withdrawn: 0 });
    expect(extensionMarketProbabilities(pushArgs(70, () => 0))).toEqual({ raised: 0, held: 0.7, withdrawn: 0.3 });
  });
  it('probabilities include the conditional freeagency withdrawal and protect the incumbent', () => {
    const args = pushArgs(85, () => 0), w = windowOf();
    const outsider = freeAgencyMarketProbabilities(w, 1, args), own = freeAgencyMarketProbabilities(w, 0, args);
    expect(outsider.raised).toBeCloseTo(0.46); expect(outsider.withdrawn).toBeCloseTo(0.27); expect(outsider.held).toBeCloseTo(0.27);
    expect(own.withdrawn).toBe(0); expect(own.held).toBeCloseTo(0.54);
    expect(freeAgencyMarketProbabilities({ ...w, offers: [w.offers[1]] }, 0, args).withdrawn).toBe(0);
  });
  it('push and acknowledgment consume once, with no read or reveal draw', () => {
    const rng = vi.fn(() => 0.99), c = career({ contractYears: 0 });
    const first = pushMarketFreeAgency(openMarketFreeAgency(c, 'nfl', windowOf()), 0, pushArgs(85, rng));
    expect(rng).toHaveBeenCalledTimes(1);
    expect(pushMarketFreeAgency(first, 0, pushArgs(85, rng))).toBe(first);
    expect(pushMarketFreeAgency(first, 1, pushArgs(85, rng))).toBe(first);
    const readGuard = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Unexpected read draw'); });
    try {
      const seen = acknowledgeMarketWheel(first), before = clone(first);
      expect(seen).toEqual({ ...first, wheel: { ...first.wheel!, seen: true } });
      expect(first).toEqual(before); expect(acknowledgeMarketWheel(seen)).toBe(seen);
      expect(restoreMarketTalk(clone(seen), c, 'nfl')).toEqual(seen);
      const p = marketWheelPosition(first.wheel!); expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThan(1);
    } finally { readGuard.mockRestore(); }
  });
  it('extension refuses a repeat push after acknowledgment or decline', () => {
    const rng = vi.fn(() => 0.9), saved = pushMarketExtension(openMarketExtension(career(), 'nfl', extension()), pushArgs(70, rng));
    const seen = acknowledgeMarketWheel(saved);
    expect(pushMarketExtension(seen, pushArgs(70, rng))).toBe(seen);
    const declined = declineMarketExtension(openMarketExtension(career(), 'nfl', extension()));
    expect(pushMarketExtension(declined, pushArgs(70, rng))).toBe(declined); expect(rng).toHaveBeenCalledTimes(1);
  });
  it.each(['probability', 'result', 'draw', 'index', 'label'] as const)('restore refuses malformed saved wheel %s', field => {
    const saved = pushMarketFreeAgency(openMarketFreeAgency(career({ contractYears: 0 }), 'nfl', windowOf()), 1, pushArgs(85, tape([0.99, 0.1]).rng));
    const bad = clone(saved); if (!bad.wheel) throw new Error('No wheel');
    if (field === 'probability') bad.wheel.probabilities.raised = -1;
    if (field === 'result') bad.wheel.result = 'raised';
    if (field === 'draw') bad.wheel.draws = [NaN];
    if (field === 'index') bad.wheel.offerIndex = 0;
    if (field === 'label') bad.wheel.label = 'Wrong target';
    expect(restoreMarketTalk(bad, career({ contractYears: 0 }), 'nfl')).toBeNull();
  });
  it('accepted branch is recorded honestly even if historical money rounds to the same salary', () => {
    const t = extension(); t.offer!.salary = 0.1;
    const result = pushMarketExtension(openMarketExtension(career(), 'nfl', t), pushArgs(94, tape([0.9, 0.1, 0.9]).rng));
    expect(result.wheel?.result).toBe('raised');
    expect(result.kind === 'extension' && result.talk.offer?.salary).toBe(0.1);
  });
  it.each([
    ['annual', [1, 2, 0]], ['total', [2, 0, 1]], ['years', [2, 0, 1]], ['roster', [2, 0, 1]],
  ] as const)('comparison sorts %s as a read-only view with original indices', (priority, order) => {
    const w = windowOf(), before = clone(w);
    expect(marketOfferComparison(w, priority).map(r => r.index)).toEqual(order); expect(w).toEqual(before);
  });
  it('comparison omits withdrawn offers and keeps tied original ordering', () => {
    const w = windowOf(); w.offers[1].pushed = true; w.offers[1].gone = true; w.offers[0].salary = w.offers[2].salary;
    expect(marketOfferComparison(w, 'annual').map(r => r.index)).toEqual([0, 2]);
  });
});
