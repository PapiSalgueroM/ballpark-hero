import { describe, expect, it, vi } from 'vitest';
import { CM_WORLD_ROSTERS } from '@/data/clubManagerWorldRosters';
import type { CareerState, MarketPlayer, ProjectedPlayer } from '@/lib/clubManager';
import {
  SAVE_KEY, aiDealPlayer, loadCareer, makeOffer, recordAiDeals, saveCareer, startCareer, startNegotiation, walkAway, worldRosterFor,
} from '@/lib/clubManager';
import { readWorldRoster } from '@/lib/clubManagerWorldRoster';

/* Round 1344, the review of 2026-10-16 (the read review's major C, the run review's M4; the critic's binding
   corrections 5 and 8). The skip and the rival's guard test the ledger's own write, not the lookup: a man the lookup
   finds can still be one the write refuses, and then nothing may say he moved. No real club holds two men of one
   name and one age (src/data/clubManagerRosters.ts has none), so this file adds made up men to three real clubs'
   2026-27 bakes before anything reads them (the world list is shared by this file only, vitest runs each test file
   in its own module graph). Their names say what they are, and they never leave this file.
   Rule 1, recordActualRosterTransfer: the seller's projected roster holds two men of his name and age, in two
   positions; the lookup takes his position and finds one, the write counts both and refuses.
   Rule 2, recordWorldRosterTransfer: a man with no ledger key shares his name and birth year with a record the
   ledger already holds for a man of another club; the write takes them for one man and refuses. */
const TWIN = 'Namesake Twin Testcase', PAIR = 'Namesake Pair Testcase';
CM_WORLD_ROSTERS['Kilmarnock'].push({ n: TWIN, p: 'CB', a: 24, v: 5, r: 62 }, { n: TWIN, p: 'ST', a: 24, v: 5, r: 62 });
CM_WORLD_ROSTERS['Motherwell'].push({ n: PAIR, p: 'CM', a: 25, v: 5, r: 62 });
CM_WORLD_ROSTERS['St Mirren'].push({ n: PAIR, p: 'CM', a: 25, v: 5, r: 62 });

function withRoll<T>(value: number, action: () => T): T {
  const random = vi.spyOn(Math, 'random').mockReturnValue(value);
  try { return action(); } finally { random.mockRestore(); }
}
/** Math.random fed a fixed list (the last value repeats), and how many draws were taken. */
function onVector<T>(values: number[], action: () => T): { value: T; taken: number } {
  let taken = 0;
  const random = vi.spyOn(Math, 'random').mockImplementation(() => values[Math.min(taken++, values.length - 1)]);
  try { return { value: action(), taken }; } finally { random.mockRestore(); }
}
const cardOf = (club: string, p: ProjectedPlayer): MarketPlayer => ({ name: p.n, club, position: p.p, age: p.a, rating: p.r, price: 6, value: p.v,
  ...(p.worldRosterKey ? { worldRosterKey: p.worldRosterKey, worldRosterSince: p.since, potential: p.potential } : {}) });

/** PR269's vectors open a bidding war on the card; then the hijack and the walk away on [.01] must publish nothing. */
function rivalCannotClose(s: CareerState, card: MarketPlayer) {
  const st: CareerState = { ...s, budget: 9999, wageCap: 9999, negotiation: null };
  const started = onVector([0.6, 0.99, 0.6], () => startNegotiation(st, card)).value;
  expect(started?.negotiation?.status).toBe('open');
  const amount = Math.round(started!.negotiation!.theirAsk * 0.8 * 10) / 10;
  const war = onVector([0.6, 0.01, 0.5, 0.5], () => makeOffer(started!, amount)).value!;
  expect(war.negotiation?.rivalBidder).toBeTruthy();
  const hijack = onVector([0.01], () => makeOffer(war, amount));
  expect(hijack.taken).toBe(1);
  expect(hijack.value?.negotiation?.status).toBe('open');
  const walk = onVector([0.01], () => walkAway(war));
  expect(walk.taken).toBe(1);
  expect(walk.value.negotiation).toBeNull();
  for (const after of [hijack.value!, walk.value]) {
    expect(after.transferLog).toEqual(war.transferLog);
    expect(after.goneNames).toEqual(war.goneNames);
    expect(after.aiHeadlines).toEqual(war.aiHeadlines);
    expect(after.worldRoster).toEqual(war.worldRoster);
  }
}

describe('Round 1344 review: a namesake the ledger refuses is never moved, by a window or a rival', () => {
  it('rule 1: two men of one name and age at the seller; the lookup finds one by position, the write refuses him', () => {
    const s = withRoll(0.6, () => startCareer('Everton'));
    const twins = worldRosterFor(s, 'Kilmarnock').filter(p => p.n === TWIN);
    expect(twins.map(p => p.p).sort()).toEqual(['CB', 'ST']);
    expect(twins.every(p => p.worldRosterKey === undefined)).toBe(true);
    const card = cardOf('Kilmarnock', twins.find(p => p.p === 'ST')!);
    expect(aiDealPlayer(s, card)).toMatchObject({ name: TWIN, position: 'ST', age: 24 });
    expect(recordAiDeals(s, [{ mp: card, to: 'Arsenal', fee: 6 }])).toBe(s);
    rivalCannotClose(s, card);
  });

  it('rule 2: a keyless man sharing his name and birth year with a ledger record of another club; the write refuses him', () => {
    const s = withRoll(0.6, () => startCareer('Everton'));
    const first = cardOf('Motherwell', worldRosterFor(s, 'Motherwell').find(p => p.n === PAIR)!);
    const moved = recordAiDeals(s, [{ mp: first, to: 'Arsenal', fee: 6 }]);
    expect(moved).not.toBe(s);
    expect((readWorldRoster(moved)?.records ?? []).filter(r => r.player.name === PAIR).map(r => r.owner)).toEqual(['Arsenal']);
    const second = cardOf('St Mirren', worldRosterFor(moved, 'St Mirren').find(p => p.n === PAIR)!);
    expect(second.worldRosterKey).toBeUndefined();
    expect(aiDealPlayer(moved, second)).toMatchObject({ name: PAIR, age: 25 });
    expect(recordAiDeals(moved, [{ mp: second, to: 'Chelsea', fee: 6 }])).toBe(moved);
    rivalCannotClose(moved, second);
  });
});

describe('Round 1344 review: the repair on load (the critic\'s correction 8, the run review\'s minor m1)', () => {
  it('a save whose ledger holds a damaged record still opens, its log as it was', () => {
    const s = withRoll(0.6, () => startCareer('Everton'));
    const damaged = { ...s, worldRoster: { version: 1, eraId: 'now', records: [{ key: 7, origin: null, owner: 3, status: 'owned', year: 'x', player: null }] } };
    localStorage.clear();
    localStorage.setItem(SAVE_KEY, JSON.stringify(damaged));
    const back = loadCareer();
    expect(back).not.toBeNull();
    expect(back!.clubName).toBe('Everton');
    expect(back!.transferLog).toEqual(s.transferLog);
    localStorage.clear();
  });

  it('a deal line of an earlier season is never mended, even with its name on goneNames', () => {
    const s = withRoll(0.6, () => startCareer('Everton'));
    const line = (s.transferLog ?? []).find(t => !t.loan && t.from !== s.clubName && t.to !== s.clubName)!;
    const later: CareerState = { ...s, season: s.season + 1, goneNames: [line.name] };
    delete later.worldRoster;
    localStorage.clear();
    expect(saveCareer(later)).toBe(true);
    const back = loadCareer();
    expect(back).not.toBeNull();
    expect((readWorldRoster(back!)?.records ?? []).some(r => r.player.name === line.name)).toBe(false);
    localStorage.clear();
  });
});
