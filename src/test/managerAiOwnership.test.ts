import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CareerState, MarketPlayer } from '@/lib/clubManager';

type Engine = typeof import('@/lib/clubManager');
type World = typeof import('@/lib/clubManagerWorldRoster');
let E: Engine, W: World, activeCase = '';
const CLOCK = '2026-10-14T00:00:00.000Z';
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const repeat = (count: number) => Array<number>(count).fill(.6);
function prerequisite(value: unknown, text: string): asserts value {
  expect(Boolean(value), 'fixture prerequisite: ' + text).toBe(true);
}
function frame<T>(label: string, input: unknown, values: readonly number[], action: () => T, exact = true): T {
  const before = copy(input), draws: { ordinal: number; value: number }[] = [];
  let output: T | undefined, error: unknown;
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    if (draws.length >= values.length) throw new Error('Fixture consumed an unlisted finite AI input at ' + label);
    const value = values[draws.length]; draws.push({ ordinal: draws.length + 1, value }); return value;
  });
  try { output = action(); } catch (caught) { error = caught; } finally {
    random.mockRestore();
    console.log('CM_AI_OWN_RECEIPT:' + JSON.stringify({ case: activeCase, label, clock: CLOCK, before,
      inputAfter: copy(input), output: output === undefined ? null : copy(output), error: error ? String(error) : null,
      draws, consumed: draws.length, provisioned: values.length, policy: exact ? 'exact' : 'bounded-repeat-0.6' }));
  }
  if (error) throw error;
  expect(copy(input), 'fixture prerequisite: actual API mutated its full input at ' + label).toEqual(before);
  if (exact) expect(draws.length, 'fixture prerequisite: exact vector was not fully consumed at ' + label).toBe(values.length);
  return output!;
}
function fresh(legacy = false): CareerState {
  // The actual public unseeded SeasonWorld constructor, not an edited seed or a minimal career.
  const state = frame('startCareer', null, repeat(8192), () => legacy
    ? E.startCareer('Everton', 'now', undefined, undefined, { yearsOn: 0, uclField: null, keepLeagueOverrides: false })
    : E.startCareer('Everton'), false);
  prerequisite(state.transferWindow !== null && state.squad.length < 30, 'actual constructor has an open window and squad room');
  return state;
}
function records(state: CareerState) {
  return frame('readWorldRoster', state, [], () => W.readWorldRoster(state))?.records ?? [];
}
function marketCard(state: CareerState, manual = false): MarketPlayer {
  const read = frame('selected-actual-market-source', state, [], () => {
    const market = E.buildMarket(state);
    const selected = market.find(card => card.position !== 'GK' && card.age < 27 && card.price >= 3 && card.price * 1.2 <= state.budget
      && (!manual || E.signingRefusal(state, card, card.price) === null)
      && E.oppRosterFor(state, card.club).filter(source => source.n === card.name && source.a === card.age).length === 1);
    return { selected, market, source: selected ? E.oppRosterFor(state, selected.club) : null };
  });
  prerequisite(read.selected, 'actual affordable market card has one name/age source; no search across input streams'); return read.selected;
}
function open(state: CareerState, card = marketCard(state)): CareerState {
  const next = frame('startNegotiation', state, [.6, .99, .6], () => E.startNegotiation(state, card));
  prerequisite(next?.negotiation?.status === 'open' && next.negotiation.phase === 'fee', 'actual negotiation opened'); return next;
}
function war(state: CareerState) {
  const started = open(state), amount = Math.round(started.negotiation!.theirAsk * .8 * 10) / 10;
  const bidding = frame('makeOffer-counter', started, [.6, .01, .5, .5], () => E.makeOffer(started, amount));
  prerequisite(bidding?.negotiation?.status === 'open' && bidding.negotiation.rivalBidder
    && bidding.negotiation.rivalOffer !== null && bidding.negotiation.rivalOffer > amount, 'real counter produced the bidder and higher offer');
  return { state: bidding, amount, card: bidding.negotiation.player, buyer: bidding.negotiation.rivalBidder, fee: bidding.negotiation.rivalOffer };
}
function canonicalReload(state: CareerState): CareerState {
  const saved = frame('saveCareer-first', state, [], () => ({ ok: E.saveCareer(state), raw: localStorage.getItem(E.SAVE_KEY) }));
  prerequisite(saved.ok && saved.raw, 'actual complete save wrote');
  const first = frame('loadCareer-first', null, [], () => E.loadCareer()); prerequisite(first, 'actual saved career loaded');
  const again = frame('saveCareer-second', first, [], () => ({ ok: E.saveCareer(first), raw: localStorage.getItem(E.SAVE_KEY) }));
  prerequisite(again.ok && again.raw, 'actual canonical save wrote');
  const second = frame('loadCareer-second', null, [], () => E.loadCareer()); prerequisite(second, 'actual canonical career loaded twice');
  expect(copy(second)).toEqual(copy(first)); expect(records(second)).toEqual(records(state)); return second;
}
function dealOwned(state: CareerState, name: string, from: string, buyer: string, carriedKey?: string): boolean {
  const hits = records(state).filter(record => record.origin.name === name && record.owner === buyer && record.status === 'owned');
  if (hits.length !== 1) return false;
  const hit = hits[0], year = (state.startYear ?? 2026) + state.season - 1;
  const canonical = JSON.stringify([state.eraId ?? 'now', from, name, hit.origin.position, year - hit.player.age, hit.origin.since]);
  return hit.origin.club === from && hit.key === canonical && hit.player.worldRosterKey === hit.key
    && (carriedKey === undefined || hit.key === carriedKey);
}
function assertCurrentOwner(before: CareerState, after: CareerState, card: MarketPlayer, buyer: string) {
  const old = records(before).filter(record => card.worldRosterKey ? record.key === card.worldRosterKey
    : record.origin.name === card.name && record.owner === card.club);
  const found = records(after).filter(record => record.origin.name === card.name && record.owner === buyer && record.status === 'owned');
  prerequisite(found.length === 1, 'owned Boolean passed with one real complete record'); const record = found[0];
  const year = (after.startYear ?? 2026) + after.season - 1;
  if (old.length === 1) { expect(record.key).toBe(old[0].key); expect(record.origin).toEqual(old[0].origin); }
  else expect(record.origin).toEqual({ club: card.club, name: card.name, position: card.position, birthYear: year - card.age, since: 0 });
  expect(record.key).toBe(JSON.stringify([after.eraId ?? 'now', record.origin.club, record.origin.name,
    record.origin.position, record.origin.birthYear, record.origin.since]));
  expect(record.year).toBe(year); expect(record.player).toMatchObject({ name: card.name, position: card.position,
    age: card.age, rating: card.rating, value: card.value, worldRosterKey: record.key });
  expect(frame('buyer-current-roster', after, [], () => E.oppRosterFor(after, buyer)).filter(player => player.worldRosterKey === record.key)).toHaveLength(1);
  expect(frame('seller-current-roster', after, [], () => E.oppRosterFor(after, card.club)).some(player => player.worldRosterKey === record.key
    || player.n === card.name && player.a === card.age && player.p === card.position)).toBe(false);
  canonicalReload(after);
}
function aiDeals(state: CareerState, previous: CareerState | null) {
  const previousLines = new Set((previous?.transferLog ?? []).map(line => JSON.stringify(line)));
  return (state.transferLog ?? []).filter(line => !previousLines.has(JSON.stringify(line)) && !line.loan
    && line.to !== state.clubName && line.from !== state.clubName);
}

beforeEach(async () => {
  localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date(CLOCK));
  E = (process.env.CM_AI_E ? await import(/* @vite-ignore */ process.env.CM_AI_E) : await import('@/lib/clubManager')) as Engine;
  W = (process.env.CM_AI_W ? await import(/* @vite-ignore */ process.env.CM_AI_W) : await import('@/lib/clubManagerWorldRoster')) as World;
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Manager AI completed-deal ownership', () => {
  it('missing actual makeOffer hijack records its buyer', () => {
    activeCase = 'missing actual makeOffer hijack records its buyer'; const prepared = war(fresh());
    const next = frame('makeOffer-hijack', prepared.state, [.01], () => E.makeOffer(prepared.state, prepared.amount));
    prerequisite(next?.negotiation?.status === 'hijacked', 'actual rival closed the deal');
    expect(dealOwned(next, prepared.card.name, prepared.card.club, prepared.buyer, prepared.card.worldRosterKey), 'actual makeOffer AI buyer ownership is missing').toBe(true);
    expect(next.budget).toBe(prepared.state.budget); expect(next.squad).toEqual(prepared.state.squad);
    expect(next.transferLog!.slice(-1)[0]).toEqual({ name: prepared.card.name, from: prepared.card.club,
      to: prepared.buyer, fee: prepared.fee, season: next.season, week: next.week });
    assertCurrentOwner(prepared.state, next, prepared.card, prepared.buyer);
  });
  it('missing actual walkAway records its rival buyer', () => {
    activeCase = 'missing actual walkAway records its rival buyer'; const prepared = war(fresh());
    const next = frame('walkAway-rival-close', prepared.state, [.01], () => E.walkAway(prepared.state));
    prerequisite(next.negotiation === null && next.goneNames.includes(prepared.card.name), 'actual walk away let the rival close');
    expect(dealOwned(next, prepared.card.name, prepared.card.club, prepared.buyer, prepared.card.worldRosterKey), 'actual walkAway AI buyer ownership is missing').toBe(true);
    expect(next.budget).toBe(prepared.state.budget); expect(next.squad).toEqual(prepared.state.squad);
    expect(next.transferLog!.slice(-1)[0]).toEqual({ name: prepared.card.name, from: prepared.card.club,
      to: prepared.buyer, fee: prepared.fee, season: next.season, week: next.week });
    assertCurrentOwner(prepared.state, next, prepared.card, prepared.buyer);
  });
  it('missing actual January window records its completed buyers', () => {
    activeCase = 'missing actual January window records its completed buyers'; let current = frame('startCareer', null, repeat(8192), () => E.startCareer('Manchester City'), false), previous: CareerState | null = null;
    let opened = false;
    for (let step = 0; step < 96; step++) {
      const before = current, result = frame('playNextEntry:' + (step + 1), before, repeat(16384),
        () => E.playNextEntry(before, { skipHalftime: true, noCoach: true }), false);
      current = result.state;
      if (result.kind === 'window') { previous = before; opened = true; break; }
      prerequisite(result.kind !== 'seasonOver' && !current.sacked, 'actual career reaches January before a terminal state');
    }
    prerequisite(opened && previous && current.transferWindow === 'january', 'actual calendar opened January inside96 entries');
    const deals = aiDeals(current, previous); prerequisite(deals.length > 0, 'actual January announced completed AI deals');
    expect(deals.every(deal => dealOwned(current, deal.name, deal.from, deal.to)), 'actual January AI buyer ownership is missing').toBe(true);
    for (const deal of deals) {
      const candidates = frame('January-source-before-deal', previous, [], () => E.oppRosterFor(previous!, deal.from)).filter(player => player.n === deal.name);
      prerequisite(candidates.length === 1, 'announced January source has one actual identity'); const player = candidates[0];
      assertCurrentOwner(previous!, current, { name: player.n, club: deal.from, position: player.p, age: player.a,
        rating: player.r, value: player.v, price: deal.fee, worldRosterKey: player.worldRosterKey }, deal.to);
    }
  }, 120000);
  it('missing actual fresh constructor records its completed buyers after seed', () => {
    activeCase = 'missing actual fresh constructor records its completed buyers after seed'; const state = fresh();
    prerequisite(E.worldSeedOf(state) !== undefined && E.yearsOn(state) === 0, 'real fresh constructor assigned its own seed at year0');
    const deals = aiDeals(state, null); prerequisite(deals.length > 0, 'actual constructor announced completed AI deals');
    expect(deals.every(deal => dealOwned(state, deal.name, deal.from, deal.to)), 'actual fresh-constructor AI buyer ownership is missing').toBe(true);
    // A read-only projection oracle at the proven year0 boundary, never a state used by a gameplay action.
    const projected = copy(state); delete projected.worldRoster;
    for (const deal of deals) {
      const candidates = frame('constructor-original-y0-source', projected, [], () => E.oppRosterFor(projected, deal.from)).filter(player => player.n === deal.name);
      prerequisite(candidates.length === 1, 'actual year0 source has one identity'); const player = candidates[0];
      assertCurrentOwner(projected, state, { name: player.n, club: deal.from, position: player.p, age: player.a,
        rating: player.r, value: player.v, price: deal.fee }, deal.to);
    }
  });
  it('preservation unclosed rival offer keeps ownership and original news', () => {
    activeCase = 'preservation unclosed rival offer keeps ownership and original news'; const prepared = war(fresh());
    const next = frame('makeOffer-rival-not-closed', prepared.state, [.99], () => E.makeOffer(prepared.state, prepared.amount));
    prerequisite(next?.negotiation?.status === 'open', 'actual rival stayed open');
    const untouched = copy(next), expected = copy(prepared.state); delete (untouched as Partial<CareerState>).negotiation;
    delete (expected as Partial<CareerState>).negotiation; expect(untouched).toEqual(expected);
    expect(next.negotiation.rivalBidder).toBe(prepared.buyer); expect(next.negotiation.rivalOffer).toBe(prepared.fee);
    expect(next.negotiation.stage).toBe(prepared.state.negotiation!.stage + 1); expect(next.negotiation.myOffer).toBe(prepared.amount);
  });
  it('preservation no-rival walkAway keeps ownership without draws', () => {
    activeCase = 'preservation no-rival walkAway keeps ownership without draws'; const state = open(fresh());
    prerequisite(!state.negotiation!.rivalBidder, 'actual opening has no rival');
    const next = frame('walkAway-no-rival', state, [], () => E.walkAway(state));
    expect(copy(next)).toEqual({ ...copy(state), negotiation: null });
  });
  it('preservation actual manual purchase keeps complete recorded identity', () => {
    activeCase = 'preservation actual manual purchase keeps complete recorded identity'; const state = fresh(), card = marketCard(state, true);
    const next = frame('buyPlayer', state, [], () => E.buyPlayer(state, card)); prerequisite(next, 'actual affordable manual signing succeeded');
    const bought = next.squad.find(player => player.name === card.name); prerequisite(bought?.worldRosterKey, 'actual manual signing has its certified key');
    const owned = records(next).filter(record => record.key === bought.worldRosterKey); expect(owned).toHaveLength(1);
    expect(owned[0].owner).toBe(state.clubName); expect(copy(owned[0].player)).toEqual(copy(bought));
    expect(next.budget).toBe(Math.round((state.budget - card.price) * 10) / 10); canonicalReload(next);
  });
  it('preservation actual unseeded world keeps legacy ownership behavior', () => {
    activeCase = 'preservation actual unseeded world keeps legacy ownership behavior'; const initial = fresh(true);
    expect(E.worldSeedOf(initial)).toBeUndefined(); expect(initial.worldRoster).toBeUndefined();
    const prepared = war(initial), next = frame('legacy-walkAway-rival-close', prepared.state, [.01], () => E.walkAway(prepared.state));
    expect(next.negotiation).toBeNull(); expect(next.goneNames).toContain(prepared.card.name);
    expect(next.worldRoster).toBeUndefined(); expect(E.worldSeedOf(next)).toBeUndefined(); expect(next.budget).toBe(prepared.state.budget);
    canonicalReload(next);
  });
});