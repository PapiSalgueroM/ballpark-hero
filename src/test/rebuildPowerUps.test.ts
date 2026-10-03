import { describe, expect, it } from 'vitest';
import * as deck from '@/lib/rebuildDeck';
import * as loop from '@/lib/rebuildLoop';
import { policyMove, THINKING } from '@/lib/rebuildPolicy';
import type { RunState } from '@/lib/rebuildLoop';
import { normalizePosition } from '@/lib/squadDeal';
import { getEnrichment } from '@/data/footleEnrichment';
import type { Player } from '@/types/game';
import squadsFixture from '../../scripts/data/rebuildSquads.json';
import marketFixture from '../../scripts/data/rebuildMarket.json';

/* Round 980: the five new power ups as pure functions, on the baked pool the
   Rebuild harnesses use. scripts/simRebuildLoop.mjs section 10 measures what
   each is worth over 792 seeded runs; this file pins the rules one at a time. */

type Row = [string, string, number, number];
const toSquad = (rows: Row[]): Player[] => rows.flatMap(([name, rawPos, age, usd]) => {
  const position = normalizePosition(rawPos || '');
  if (!position) return [];
  return [{
    name, position, age, club: 'x', nationality: 'Unknown', league: 'Other', goals: 0, assists: 0, kitNumber: null,
    difficulty: 'easy', marketValue: Math.max(1, Math.round((usd || 1_000_000) / 1_000_000)),
  } as unknown as Player];
});
const ROWS = (marketFixture.rows as unknown[][]).map(([player_name, position, age, nationality, club, market_value_usd]) => ({ player_name, position, age, nationality, club, market_value_usd }));
const CLUBS = squadsFixture.clubs.map(c => ({ club: c.club, tier: c.tier, squadSize: c.squad.length, squadValueM: 0 }));
const CLUB = CLUBS.find(c => c.tier === 'mid')!;
const market = deck.buildMarket(ROWS as never, CLUB.club, (n, c) => getEnrichment(n, c).league);
const squad = toSquad(squadsFixture.clubs.find(c => c.club === CLUB.club)!.squad as unknown as Row[]);

const fresh = (seed: number, version: deck.DeckVersion = 2) =>
  loop.createRun({ club: CLUB as never, clubs: CLUBS as never, squad, market, preset: 'none', seed, deck: version });
/** Plays the thinking policy until `stop` says so (or the run ends). */
function playUntil(s: RunState, stop: (s: RunState) => boolean): RunState {
  for (let i = 0; i < 800 && s.phase !== 'done' && !stop(s); i += 1) s = policyMove(s, THINKING).next;
  return s;
}
const give = (s: RunState, p: deck.PerkKind, n = 1): RunState => ({ ...s, perks: { ...s.perks, [p]: n } });

describe('Rebuild power ups (Round 980)', () => {
  it('deck 1 never deals a new perk, deck 2 holds all five', () => {
    const NEW = ['respin', 'veto', 'swap', 'loan', 'peek'];
    expect(deck.fortuneDeckFor(7, 1).some(c => c.perk && NEW.includes(c.perk))).toBe(false);
    expect(new Set(deck.fortuneDeckFor(7, 2).filter(c => c.perk && NEW.includes(c.perk)).map(c => c.perk)).size).toBe(5);
    expect(deck.fortuneDeckFor(7, 1)).toHaveLength(15);
    expect(deck.fortuneDeckFor(7, 2)).toHaveLength(20);
  });

  it('a sneak peek shows exactly the envelope that lands', () => {
    const s = give(playUntil(fresh(11), r => r.phase === 'spin'), 'peek');
    const peeked = loop.usePeek(s);
    const shown = loop.peekedEnvelope(peeked)!;
    expect(peeked.perks.peek).toBe(0);
    const landed = playUntil(peeked, r => r.peeked === null);
    expect(landed.post[landed.post.length - 1]).toEqual(shown);
  });

  it('a loan costs 40 percent, is not a signing, and nobody can sell him', () => {
    const s = give(playUntil(fresh(23), r => !!r.deal && !r.war && r.deal.offers.length > 0), 'loan');
    const man = [...s.deal!.offers].sort((a, b) => a.marketValue - b.marketValue)[0];
    const after = loop.loanOffer(s, man.name);
    expect(after.loans).toEqual([{ player: man, fee: Math.max(1, Math.round(man.marketValue * 0.4)) }]);
    expect(after.signed.some(p => p.name === man.name)).toBe(false);
    expect(loop.budgetOf(after)).toBe(loop.budgetOf(s) - after.loans[0].fee + (after.extraFunds - s.extraFunds));
    expect(loop.isOnLoan(after, man.name)).toBe(true);
  });

  it('a part exchange called off keeps the man and spends the perk', () => {
    const s = give(playUntil(fresh(31), r => r.spun !== null && !r.deal && !!r.baseXi[r.spun]), 'swap');
    const open = loop.partExchange(s);
    expect(open.swapOpen).toBe(true);
    expect(open.sold).toEqual(s.sold);
    const back = loop.keep(open);
    expect(back.decided[s.spun!]?.name).toBe(s.baseXi[s.spun!]!.name);
    expect(back.perks.swap).toBe(0);
    expect(loop.promote(open, open.deal!.bench[0]?.name ?? 'nobody')).toBe(open);
  });

  it('a veto shuffles the card back with the undealt ones, and taking the cards changes nothing', () => {
    let hit: RunState | null = null;
    for (let seed = 1; seed < 400 && !hit; seed += 1) {
      const s = give(playUntil(fresh(seed), r => loop.canBlowWhistle(r)), 'veto');
      const v = loop.blowWhistle(s);
      if (v.verdict) hit = v;
    }
    expect(hit).not.toBeNull();
    const v = hit!;
    const k = loop.whistleDraw(v).cards.findIndex(c => c.kind !== 'safe');
    const out = loop.vetoCard(v, k);
    expect(out.reckoning!.vetoed).toBe(k);
    expect(loop.vetoPool(v, k).map(c => c.id)).toContain(out.reckoning!.redrawn!.id);
    const taken = loop.acceptVerdict(v);
    const plain = loop.blowWhistle({ ...v, verdict: false, perks: { ...v.perks, veto: 0 } });
    expect(taken.reckoning).toEqual(plain.reckoning);
  });
});
