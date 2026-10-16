import { describe, expect, it, vi } from 'vitest';
import type { CareerState, MarketPlayer } from '@/lib/clubManager';
import {
  SAVE_KEY, acceptBid, aiDealPlayer, buildMarket, doorRefusal, loadCareer, marketForScreen, recordAiDeals, saveCareer, startCareer, worldRosterFor, worldYear,
} from '@/lib/clubManager';
import { readWorldRoster } from '@/lib/clubManagerWorldRoster';

/* Round 1344 (the player report of 2026-10-16: a man another club bought vanished from the market and turned up at
   his old club the next season). In a career started since Release BC every deal between two other clubs is now
   written to the world ledger the moment it closes, so the man is at his buyer at once and stays there. These are
   the fast cases; scripts/simCmWorldMoves.mjs plays the fleets. PR269 (the other lane's Round 1367) proved the four
   writers that never told the ledger; its own unit test is run against this branch on a runner, never copied here. */

function withRoll<T>(value: number, action: () => T): T {
  const random = vi.spyOn(Math, 'random').mockReturnValue(value);
  try { return action(); } finally { random.mockRestore(); }
}

/** A deal line of the window between two clubs that are not mine. */
const aiLines = (s: CareerState) => (s.transferLog ?? []).filter(t => !t.loan && t.from !== s.clubName && t.to !== s.clubName
  && t.from !== 'a free transfer' && t.to !== 'a free transfer');

/** The market card the engine would show for a man of a club's world roster. */
function cardAt(s: CareerState, club: string, name: string): MarketPlayer {
  const p = worldRosterFor(s, club).find(x => x.n === name);
  if (!p) throw new Error(`${club} does not list ${name}`);
  return { name: p.n, club, position: p.p, age: p.a, rating: p.r, price: 1, value: p.v,
    ...(p.worldRosterKey ? { worldRosterKey: p.worldRosterKey, worldRosterSince: p.since, potential: p.potential } : {}) };
}

describe('Round 1344: deals between two other clubs reach the world ledger', () => {
  it('a new career records its opening window: every man is at his buyer and gone from his seller', () => {
    const s = withRoll(0.6, () => startCareer('Everton'));
    expect(s.worldSeed).toBeDefined();
    const lines = aiLines(s);
    expect(lines.length).toBeGreaterThan(0);
    const records = readWorldRoster(s)?.records ?? [];
    for (const line of lines) {
      const owned = records.filter(r => r.status === 'owned' && r.owner === line.to && r.player.name === line.name);
      expect(owned, `${line.name} to ${line.to}`).toHaveLength(1);
      expect(owned[0].origin.club).toBe(line.from);
      expect(worldRosterFor(s, line.to).some(p => p.worldRosterKey === owned[0].key)).toBe(true);
      expect(worldRosterFor(s, line.from).some(p => p.worldRosterKey === owned[0].key
        || p.n === owned[0].origin.name && worldYear(s) - p.a === owned[0].origin.birthYear)).toBe(false);
    }
  });

  it('aiDealPlayer hands back the ledger payload of a man the ledger holds, and the projection\'s man otherwise', () => {
    const s = withRoll(0.6, () => startCareer('Everton'));
    const line = aiLines(s)[0];
    const record = (readWorldRoster(s)?.records ?? []).find(r => r.owner === line.to && r.player.name === line.name)!;
    const carried = withRoll(0.6, () => aiDealPlayer(s, cardAt(s, line.to, line.name)));
    expect(carried).toEqual(record.player);
    const fresh = buildMarket(s).find(p => p.club !== line.to && p.club !== line.from && !p.generated)!;
    const baked = withRoll(0.6, () => aiDealPlayer(s, fresh));
    expect(baked).toMatchObject({ name: fresh.name, position: fresh.position, age: fresh.age, rating: fresh.rating, value: fresh.value });
    expect(baked?.wage).toBeUndefined();
    expect(aiDealPlayer(s, { ...fresh, name: `${fresh.name} Nobody`, worldRosterKey: undefined })).toBeNull();
  });

  it('a man I sold is never taken by an AI club while my buyer holds him (the lead\'s ruling 3)', () => {
    const s0 = withRoll(0.6, () => ({ ...startCareer('Everton'), budget: 9999, wageCap: 9999, transferWindow: 'summer' as const }));
    const man = [...s0.squad].filter(p => !p.onLoan && p.position !== 'GK' && !p.isYouth).sort((a, b) => b.rating - a.rating)[1];
    const buyer = buildMarket(s0).find(p => p.club !== s0.clubName)!.club;
    const bid = { playerId: man.id, playerName: man.name, club: buyer, offer: 30, status: 'open' as const };
    const sold = withRoll(0.6, () => acceptBid({ ...s0, incomingBids: [...(s0.incomingBids ?? []), bid] }, man.id));
    expect(sold).not.toBeNull();
    const record = (readWorldRoster(sold!)?.records ?? []).find(r => r.owner === buyer && r.player.name === man.name)!;
    expect(record.player.wage).toBeDefined();
    expect(aiDealPlayer(sold!, cardAt(sold!, buyer, man.name))).toBeNull();
  });

  it('the screen\'s market lists a man another club bought this season at his new club, and every door says why not yet', () => {
    const s = withRoll(0.6, () => startCareer('Everton'));
    expect(s.transferWindow).toBe('summer');
    const line = aiLines(s)[0];
    const row = marketForScreen(s).find(p => p.name === line.name && p.club === line.to);
    expect(row?.joinedThisSeason).toBe(true);
    expect(buildMarket(s).some(p => p.name === line.name)).toBe(false);
    const sentence = `${line.name} only joined ${line.to} this season. They will not sell him on until next summer.`;
    expect(doorRefusal(s, row!, 'talk')).toBe(sentence);
    expect(doorRefusal({ ...s, budget: 9999 }, row!, 'buy')).toBe(sentence);
    expect(doorRefusal({ ...s, transferWindow: null }, row!, 'talk')).toBe('The transfer window is shut.');
    expect(doorRefusal({ ...s, transferWindow: 'january' }, row!, 'talk')).toBe(sentence.replace('next summer', 'the summer'));
    const none: CareerState = { ...s };
    delete none.worldRoster;
    expect(marketForScreen(none)).toEqual(buildMarket(none));
    expect(marketForScreen(none).some(p => p.joinedThisSeason)).toBe(false);
  });

  it('a seeded save missing this season\'s moves is mended when it opens, once, and a damaged line never costs the save', () => {
    const s = withRoll(0.6, () => startCareer('Everton'));
    const lines = aiLines(s);
    const missing: CareerState = { ...s };
    delete missing.worldRoster;   // what an engine from before the round wrote: the news, goneNames, no ledger
    localStorage.clear();
    expect(saveCareer(missing)).toBe(true);
    const mended = loadCareer()!;
    expect(mended).not.toBeNull();
    for (const line of lines) {
      expect((readWorldRoster(mended)?.records ?? []).some(r => r.status === 'owned' && r.owner === line.to && r.player.name === line.name), line.name).toBe(true);
    }
    expect(saveCareer(mended)).toBe(true);
    const first = localStorage.getItem(SAVE_KEY);
    expect(saveCareer(loadCareer()!)).toBe(true);
    expect(localStorage.getItem(SAVE_KEY)).toBe(first);
    const damaged = { ...missing, transferLog: [...(missing.transferLog ?? []), { name: 42, from: null, to: 7, fee: 'x', season: s.season, week: 1 }] } as unknown as CareerState;
    localStorage.clear();
    expect(saveCareer(damaged)).toBe(true);
    expect(loadCareer()).not.toBeNull();
    localStorage.clear();
  });

  it('recordAiDeals takes no draw, and hands an unseeded career back as the same object', () => {
    const s = withRoll(0.6, () => startCareer('Everton'));
    const taken = new Set(s.goneNames);
    const mp = buildMarket(s).find(p => !taken.has(p.name) && !p.generated)!;
    const to = buildMarket(s).find(p => p.club !== mp.club)!.club;
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('recordAiDeals drew a random number'); });
    try {
      const next = recordAiDeals(s, [{ mp, to, fee: 1 }]);
      expect(next).not.toBe(s);
      expect((readWorldRoster(next)?.records ?? []).some(r => r.owner === to && r.player.name === mp.name)).toBe(true);
      const unseeded = { ...s, worldSeed: undefined };
      expect(recordAiDeals(unseeded, [{ mp, to, fee: 1 }])).toBe(unseeded);
      expect(recordAiDeals(s, [])).toBe(s);
    } finally { random.mockRestore(); }
  });
});
