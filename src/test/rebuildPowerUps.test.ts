import { describe, expect, it } from 'vitest';
import * as deck from '@/lib/rebuildDeck';
import * as loop from '@/lib/rebuildLoop';
import { policyMove, THINKING } from '@/lib/rebuildPolicy';
import { applyMove, parseRebuildSave, restoreTable, toSave, type RebuildMove } from '@/lib/rebuildSave';
import * as table from '@/lib/rebuildTable';
import type { ClubTier, RebuildClub } from '@/lib/fetchRebuild';
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
const CLUBS: RebuildClub[] = squadsFixture.clubs.map(c => ({ club: c.club, tier: c.tier as ClubTier, squadSize: c.squad.length, squadValueM: 0 }));
const CLUB = CLUBS.find(c => c.tier === 'mid')!;
const market = deck.buildMarket(ROWS as never, CLUB.club, (n, c) => getEnrichment(n, c).league);
const squad = toSquad(squadsFixture.clubs.find(c => c.club === CLUB.club)!.squad as unknown as Row[]);

const fresh = (seed: number, version: deck.DeckVersion = 2) =>
  loop.createRun({ club: CLUB, clubs: CLUBS, squad, market, preset: 'none', seed, deck: version });
/** Plays the thinking policy until `stop` says so (or the run ends). */
function playUntil(s: RunState, stop: (s: RunState) => boolean): RunState {
  for (let i = 0; i < 800 && s.phase !== 'done' && !stop(s); i += 1) s = policyMove(s, THINKING).next;
  return s;
}
const give = (s: RunState, p: deck.PerkKind, n = 1): RunState => ({ ...s, perks: { ...s.perks, [p]: n } });

describe('Rebuild budget scout', () => {
  it('spends a Fresh List for distinct same-shirt deals at the actual asking price and keeps the bench', () => {
    const open = playUntil(fresh(23), r => !!r.deal && !r.war && r.deal.offers.length > 0);
    const slot = open.formation.slots[open.spun!];
    const player = open.deal!.offers[0];
    const current = { ...player, name: 'Fixture Current', marketValue: 6 };
    const bench = [{ ...player, name: 'Fixture Bench' }];
    const affordable = { ...player, name: 'Fixture Affordable', marketValue: 12 };
    const pool = [current, affordable, { ...affordable, nationality: 'Another' }, { ...player, name: 'Fixture Taken', marketValue: 7 },
      { ...player, name: 'Fixture Too Expensive', marketValue: 14 }, { ...player, name: 'Fixture Wrong Position', marketValue: 4,
        position: market.find(candidate => !slot.allowed.includes(candidate.position))!.position }];
    const run = { ...give(give(give(open, 'rescout'), 'discount'), 'noWar'), market: pool, deal: { offers: [current], bench },
      lost: { 'Fixture Taken': 0 }, extraFunds: open.extraFunds + 10 - loop.budgetOf(open), actions: 0 };

    expect(loop.canBudgetScout(run)).toBe(true);
    const next = loop.budgetScout(run);
    expect(next.deal).toEqual({ offers: [affordable], bench });
    expect(next.perks).toEqual({ ...run.perks, rescout: 0 });
    expect(next.actions).toBe(run.actions);
    expect(next.sold).toEqual(run.sold);
    expect(next.signed).toEqual(run.signed);
    expect(loop.budgetOf(next)).toBe(10);
    expect(loop.takeOffer(next, current.name)).toBe(next);
    const signed = loop.takeOffer(next, affordable.name);
    expect(signed.decided[run.spun!]).toEqual(affordable);
    expect(loop.budgetOf(signed)).toBe(0);
    expect(loop.budgetScout(next)).toBe(next);

    const noDiscount = give(run, 'discount', 0);
    expect(loop.canBudgetScout(noDiscount)).toBe(false);
    expect(loop.budgetScout(noDiscount)).toBe(noDiscount);
    for (const refused of [{ ...run, phase: 'manager' as const }, { ...run, spun: null }, { ...run, swapOpen: true },
      { ...run, extraFunds: run.extraFunds - 10 }, { ...run, war: { player, rivalIdx: 0, price: 10,
        leader: 'rival' as const, cap: 12, log: [], outcome: 'live' as const } }]) {
      expect(loop.canBudgetScout(refused)).toBe(false);
      expect(loop.budgetScout(refused)).toBe(refused);
    }
  });

  it('restores both the regular and budget scout after a genuine finance card opens the perk', () => {
    const data: table.TableData = { squads: new Map([[CLUB.club, squad]]), markets: new Map([[CLUB.club, market]]), preset: 'none' };
    let opened = table.pickClub(table.createTable(['human'], 23), CLUB, CLUBS);
    opened = table.openWindow(opened, data, CLUBS);
    const start = table.activeRun(opened)!;
    const finance = start.financeDeck.findIndex(card => card.perk === 'rescout');
    expect(finance).toBeGreaterThanOrEqual(0);
    const setup: RebuildMove[] = [{ k: 'finance', i: finance }, { k: 'toManager' }, { k: 'manager', id: deck.KEEP_MANAGER.id }, { k: 'spin' }];
    const play = (state: table.TableState, move: RebuildMove) => table.updateRun(state, run => applyMove(run, move));
    opened = setup.reduce(play, opened);
    if (!table.activeRun(opened)!.deal) {
      const sale: RebuildMove = { k: 'sell' };
      setup.push(sale);
      opened = play(opened, sale);
    }
    expect(table.activeRun(opened)!.perks.rescout).toBe(1);
    expect(table.activeRun(opened)!.deal).not.toBeNull();
    const legacy = { k: 'redeal' } as const;
    const budget = { k: 'budgetScout' } as const;
    const before = table.activeRun(opened)!;
    const outcomes = [legacy, budget].map(move => {
      const after = play(opened, move);
      const run = table.activeRun(after)!;
      expect(after).not.toBe(opened);
      const save = toSave({ table: after, moves: [[...setup, move]] }, 'none')!;
      const parsed = parseRebuildSave(JSON.stringify(save));
      expect(parsed).toEqual(save);
      expect(restoreTable(parsed!, CLUBS, data)).toEqual({ table: after, moves: [[...setup, move]] });
      return run;
    });
    expect(outcomes[0].deal).not.toEqual(outcomes[1].deal);
    expect(outcomes[1].deal!.bench).toEqual(before.deal!.bench);
    expect(outcomes[1].deal!.offers).toHaveLength(3);
    expect(outcomes[1].deal!.offers.every(player => loop.offerPrice(before, player) <= loop.budgetOf(before))).toBe(true);
  });

  it('keeps rival bidding on a budget offer even when the opening bid exceeds the cash', () => {
    const open = playUntil(fresh(23), r => !!r.deal && !r.war && r.deal.offers.length > 0);
    const player = open.deal!.offers[0];
    const prospect = Array.from({ length: 100 }, (_, i) => ({ ...player, name: `Fixture Rival Prospect ${i}`, marketValue: 40 }))
      .find(candidate => deck.isContested(candidate, open.seed));
    expect(prospect).toBeDefined();
    const run = { ...give(give(give(open, 'rescout'), 'discount', 0), 'noWar', 0), market: [prospect!],
      extraFunds: open.extraFunds + 40 - loop.budgetOf(open) };
    const next = loop.budgetScout(run);
    expect(next.deal!.offers).toEqual([prospect]);
    expect(loop.offerPrice(next, prospect!)).toBe(loop.budgetOf(next));
    const challenged = loop.takeOffer(next, prospect!.name);
    expect(challenged.war?.player).toBe(prospect);
    expect(challenged.war!.price).toBeGreaterThan(loop.budgetOf(challenged));
    expect(challenged.signed).toEqual(next.signed);
  });
});

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

  it('the peek is of the NEXT envelope: the first one to land after it', () => {
    const s = give(playUntil(fresh(11), r => r.phase === 'spin' && r.actions % 2 === 1), 'peek');
    const peeked = loop.usePeek(s);
    /* one envelope lands every second transfer move */
    expect(peeked.peeked).toBe(Math.floor(s.actions / 2) + 1);
    const first = playUntil(peeked, r => r.post.length > peeked.post.length);
    expect(first.post[first.post.length - 1]).toEqual(loop.peekedEnvelope(peeked));
    expect(first.peeked).toBeNull();
  });

  it('a peek is refused once no transfer move left can bring the envelope in', () => {
    const end = playUntil(fresh(11), r => loop.canBlowWhistle(r));
    const none = give(give(end, 'peek'), 'respin', 0);
    expect(loop.canPeek(none)).toBe(false);
    expect(loop.usePeek(none)).toBe(none);
    /* a second spin on a man you kept is a sale and a signing, so the envelope can still come */
    const keptSlot = Object.keys(end.decided).map(Number).find(i => end.decided[i] && end.baseXi[i]?.name === end.decided[i]!.name);
    expect(keptSlot).toBeDefined();
    expect(loop.canPeek(give(none, 'respin', 1))).toBe(true);
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

  it('the second spin refuses a man you bought or borrowed, and takes one you kept', () => {
    const s = give(playUntil(fresh(23), r => !!r.deal && !r.war && r.deal.offers.length > 0), 'loan');
    const slot = s.spun!;
    const man = [...s.deal!.offers].sort((a, b) => a.marketValue - b.marketValue)[0];
    const borrowed = give(loop.loanOffer(s, man.name), 'respin');
    expect(borrowed.decided[slot]?.name).toBe(man.name);
    expect(loop.canSecondSpin(borrowed, slot)).toBe(false);
    expect(loop.secondSpin(borrowed, slot)).toBe(borrowed);
    const end = give(playUntil(fresh(23), r => loop.canBlowWhistle(r)), 'respin');
    for (const i of Object.keys(end.decided).map(Number)) {
      const held = end.decided[i];
      const theirs = !!held && (end.signed.some(p => p.name === held.name) || end.loans.some(l => l.player.name === held.name));
      expect(loop.canSecondSpin(end, i)).toBe(!theirs);
      if (theirs) expect(loop.secondSpin(end, i)).toBe(end);
    }
  });

  it('a sale at the reckoning skips the man on loan', () => {
    let checked = 0;
    for (let seed = 1; seed < 400 && checked < 2; seed += 1) {
      const end = playUntil(fresh(seed), r => loop.canBlowWhistle(r));
      const xi = end.formation.slots.map((_, i) => end.decided[i] ?? null);
      const star = xi.filter((p): p is Player => !!p).sort((a, b) => b.marketValue - a.marketValue)[0];
      if (!star) continue;
      const loaned = { ...end, loans: [...end.loans, { player: star, fee: 1 }], perks: { ...end.perks, veto: 0 } };
      /* the big sale takes the most valuable man who is not on loan */
      const cards = loop.whistleDraw(loaned).cards;
      if (cards.some(c => c.kind === 'sellBest')) {
        const done = loop.blowWhistle(loaned);
        expect(done.reckoning!.xi.some(p => p?.name === star.name)).toBe(true);
        expect(done.reckoning!.notes.some(n => n.includes('was sold') && !n.includes(`(${star.name} was sold`))).toBe(true);
        checked += 1;
      }
      /* a forced sale for debt never takes him either */
      const broke = loop.blowWhistle({ ...loaned, extraFunds: loaned.extraFunds - 400 });
      expect(broke.reckoning!.swaps.length).toBeGreaterThan(0);
      expect(broke.reckoning!.swaps.some(sw => sw.outName === star.name)).toBe(false);
      expect(broke.reckoning!.xi.some(p => p?.name === star.name)).toBe(true);
    }
    expect(checked).toBe(2);
  });

  it('the pocket holds one veto at a time, because the whistle only takes one', () => {
    let landedOnOne = 0;
    for (let seed = 1; seed < 300 && landedOnOne === 0; seed += 1) {
      let s = give(playUntil(fresh(seed), r => r.phase === 'spin'), 'veto');
      for (let i = 0; i < 800 && s.phase !== 'done' && !s.verdict; i += 1) {
        const next = policyMove(s, THINKING).next;
        const ev = next.post.length > s.post.length ? next.post[next.post.length - 1] : null;
        if (ev?.perk === 'veto') landedOnOne += 1;
        expect(next.perks.veto).toBeLessThanOrEqual(1);
        s = next;
      }
    }
    expect(landedOnOne).toBeGreaterThan(0);
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
    /* the balance rule: the card is shuffled back in with itself, so it can come straight back */
    const cards = loop.whistleDraw(v).cards;
    expect(loop.vetoPool(v, k).map(c => c.id)).toEqual(deck.PUNISH_DECK.filter(c => c.id === cards[k].id || !cards.some(d => d.id === c.id)).map(c => c.id));
    expect(loop.vetoPool(v, k).map(c => c.id)).toContain(cards[k].id);
    const taken = loop.acceptVerdict(v);
    const plain = loop.blowWhistle({ ...v, verdict: false, perks: { ...v.perks, veto: 0 } });
    expect(taken.reckoning).toEqual(plain.reckoning);
  });
});
