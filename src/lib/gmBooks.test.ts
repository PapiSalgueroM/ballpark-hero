import { describe, expect, it } from 'vitest';
import {
  GM_BOOKS_SPORTS, buyFacility, closeGmSeason, facilityFundsK, gmBooksOf, isValidGmBooks, ledgerBalances,
  marketTierFromPayrolls, newGmBooks, notePlayoffHomeGame, noteTax, opsBudgetFor, opsFreeK,
  projectGmBooks, setGmTicketTier, tickGmBooks, toK, type GmBooks, type GmBooksContext,
} from '@/lib/gmBooks';
import {
  effectValueAt, facilitiesOf, facilityCostLadder, isValidFacilities, newFacilities,
  rolloverFacilities, startUpgrade, tickFacilities, upkeepPerPeriod, type MarketTier,
} from '@/lib/gmFacilities';
import { GM_FACILITY_PACKS, NBA_FACILITY_PACK } from '@/data/gmFacilities/packs';

const nba = GM_BOOKS_SPORTS.nba;
const CAP = 165;

function ctxFor(tier: MarketTier, fac = newFacilities(NBA_FACILITY_PACK, tier)): GmBooksContext {
  return { sport: nba, cap: CAP, payroll: 150, deadMoney: 2, facilities: { pack: NBA_FACILITY_PACK, state: fac } };
}

/** A regular season of the same results for any tier: two home games a round. */
function playSeason(b: GmBooks, ctx: GmBooksContext, form: string[]): GmBooks {
  let books = b;
  for (let r = 0; r < nba.periods; r++) books = tickGmBooks(books, ctx, form.slice(0, r + 1), 2);
  return books;
}

describe('gmFacilities', () => {
  it('every effect is neutral at level 1 and moves at every step, in every pack', () => {
    for (const pack of Object.values(GM_FACILITY_PACKS)) {
      for (const def of pack.facilities) {
        for (const e of def.effects) {
          expect(effectValueAt(e, 1)).toBe(e.neutral);
          for (let l = 2; l <= pack.maxLevel; l++) expect(effectValueAt(e, l)).not.toBe(effectValueAt(e, l - 1));
        }
        expect(facilityCostLadder(pack, def.id)).toHaveLength(pack.maxLevel - 1);
      }
    }
  });

  it('an upgrade is paid at the start, takes its build time, and only one runs at a time', () => {
    const f = newFacilities(NBA_FACILITY_PACK, 3);
    const started = startUpgrade(NBA_FACILITY_PACK, f, 'medical', 100);
    expect(started).not.toBeNull();
    const s = started!.state;
    expect(s.levels.medical).toBe(f.levels.medical);
    expect(s.seasonSpend).toBe(started!.cost);
    expect(startUpgrade(NBA_FACILITY_PACK, s, 'training', 100)).toBeNull();
    let cur = s;
    const periods = s.build!.periodsLeft;
    for (let i = 0; i < periods - 1; i++) cur = tickFacilities(NBA_FACILITY_PACK, cur).state;
    expect(cur.levels.medical).toBe(f.levels.medical);
    const done = tickFacilities(NBA_FACILITY_PACK, cur);
    expect(done.state.levels.medical).toBe(f.levels.medical + 1);
    expect(done.state.build).toBeNull();
    expect(done.line).toMatch(/open at level/);
  });

  it('the summer finishes a build and resets the spend; a move hands back nothing', () => {
    const f = startUpgrade(NBA_FACILITY_PACK, newFacilities(NBA_FACILITY_PACK, 2), 'scouting', 100)!.state;
    const kept = rolloverFacilities(NBA_FACILITY_PACK, f, false)!;
    expect(kept.build).toBeNull();
    expect(kept.levels.scouting).toBe(f.levels.scouting + 1);
    expect(kept.seasonSpend).toBe(0);
    expect(rolloverFacilities(NBA_FACILITY_PACK, f, true)).toBeUndefined();
  });

  it('a mangled block resets alone to the day one levels', () => {
    expect(isValidFacilities(NBA_FACILITY_PACK, { v: 1, pack: 'nba', levels: { training: 11 } })).toBe(false);
    expect(facilitiesOf(NBA_FACILITY_PACK, 'junk', 1)).toEqual(newFacilities(NBA_FACILITY_PACK, 1));
  });

  it('every seat in every pack opens neutral: level 1 everywhere and no upkeep, whatever the market', () => {
    for (const pack of Object.values(GM_FACILITY_PACKS)) {
      for (const tier of [1, 2, 3] as MarketTier[]) {
        const f = newFacilities(pack, tier);
        expect(Object.values(f.levels).every(l => l === 1)).toBe(true);
        expect(upkeepPerPeriod(pack, f)).toBe(0);
      }
    }
  });

  it('a block saved before a building was added keeps its levels and opens the new one at level 1', () => {
    const saved = { v: 1, pack: 'nba', levels: { training: 4, medical: 3, analytics: 2 }, build: null, seasonSpend: 0 };
    const f = facilitiesOf(NBA_FACILITY_PACK, saved, 1);
    expect(f.levels).toEqual({ training: 4, medical: 3, analytics: 2, scouting: 1 });
  });
});

describe('gmBooks', () => {
  it('a season balances to the thousand: income less costs is the change in the kitty', () => {
    let b = newGmBooks(nba, 2, 60, CAP);
    const ctx = ctxFor(2);
    b = playSeason(b, ctx, ['W', 'L', 'W', 'W', 'L']);
    b = notePlayoffHomeGame(b, ctx);
    b = noteTax(b, 7.25);
    const { books, closed } = closeGmSeason(b, 70, CAP);
    expect(ledgerBalances(closed)).toBe(true);
    expect(closed.result).toBe(books.kitty - closed.kittyAtOpen);
    expect(closed.tax).toBe(7250);
    expect(closed.periods).toBe(nba.periods);
    expect(books.season.kittyAtOpen).toBe(books.kitty);
  });

  it('a bigger market earns more at equal results', () => {
    const form = ['W', 'W', 'L', 'W', 'L', 'W'];
    const income = (tier: MarketTier) => closeGmSeason(playSeason(newGmBooks(nba, tier, 60, CAP), ctxFor(tier), form), 60, CAP).closed.income;
    expect(income(1)).toBeGreaterThan(income(2));
    expect(income(2)).toBeGreaterThan(income(3));
  });

  it('the projection at the opening tip is the regular season the ticks then book', () => {
    const ctx = { ...ctxFor(2), facilities: undefined };
    const b = newGmBooks(nba, 2, 60, CAP);
    const p = projectGmBooks(b, ctx);
    const closed = closeGmSeason(playSeason(b, ctx, []), 60, CAP).closed;
    expect(toK(p.incomeProjected)).toBe(closed.income);
    expect(toK(p.spendProjected)).toBe(closed.spend);
  });

  it('market tier comes from the opening payrolls', () => {
    const all = [100, 110, 120, 130, 140, 150];
    expect(marketTierFromPayrolls(150, all)).toBe(1);
    expect(marketTierFromPayrolls(125, all)).toBe(2);
    expect(marketTierFromPayrolls(100, all)).toBe(3);
  });

  it('trust moves the operations budget, and the price moves trust once a season, never by flicking it', () => {
    expect(opsBudgetFor(2, 100, CAP)).toBeGreaterThan(opsBudgetFor(2, 60, CAP));
    expect(opsBudgetFor(2, 60, CAP)).toBeGreaterThan(opsBudgetFor(2, 0, CAP));
    const b = newGmBooks(nba, 2, 60, CAP);
    expect(setGmTicketTier(b, 0).line).toMatch(/Ownership/);
    expect(setGmTicketTier(b, 1).line).toBeNull();
    let flicked = b;
    for (let i = 0; i < 40; i++) flicked = setGmTicketTier(flicked, i % 2 === 0 ? 2 : 1).books;
    expect(flicked.ticketTier).toBe(1);
    expect(closeGmSeason(flicked, 60, CAP).trust).toBe(60);
    expect(closeGmSeason(setGmTicketTier(flicked, 2).books, 60, CAP).trust).toBe(61);
    expect(closeGmSeason(setGmTicketTier(flicked, 0).books, 1, CAP).trust).toBe(1);
    expect(closeGmSeason(setGmTicketTier(flicked, 0).books, 30, CAP).trust).toBe(29);
  });

  it('the operations budget carries to the $k, an overrun as a debt, and next season is set from the trust', () => {
    const b = { ...newGmBooks(nba, 2, 60, CAP), opsCarry: 500 };
    const played = playSeason(b, { ...ctxFor(2), facilities: undefined }, []);
    const spent = played.season.staff + played.season.scouting;
    const { books } = closeGmSeason(played, 80, 170);
    expect(books.opsCarry).toBe(b.opsBudget + 500 - spent);
    expect(books.opsBudget).toBe(opsBudgetFor(2, 80, 170));
    const over = closeGmSeason({ ...played, opsCarry: -b.opsBudget }, 60, CAP).books;
    expect(over.opsCarry).toBeLessThan(0);
    expect(isValidGmBooks(over)).toBe(true);
  });

  it('a building is paid from the operations budget and booked as facilities spend', () => {
    const b = newGmBooks(nba, 1, 60, CAP);
    const ctx = ctxFor(1);
    const free = opsFreeK(b, ctx);
    const bought = buyFacility(b, ctx, 'analytics');
    expect(bought).not.toBeNull();
    const spent = bought!.books.season.facilities;
    expect(spent).toBeGreaterThan(0);
    expect(opsFreeK(bought!.books, { ...ctx, facilities: { pack: NBA_FACILITY_PACK, state: bought!.facilities } })).toBeLessThanOrEqual(free - spent);
    expect(bought!.books.kitty).toBe(-spent);
  });

  it('a building may cost only what is left once its own upkeep for the rest of the season is kept back', () => {
    const b = newGmBooks(nba, 1, 60, CAP);
    const ctx = ctxFor(1);
    const forTraining = facilityFundsK(b, ctx, 'training');
    expect(forTraining).toBeLessThan(opsFreeK(b, ctx));
    expect(forTraining).toBeGreaterThan(0);
  });

  it('a corrupt books block resets alone', () => {
    const b = newGmBooks(nba, 3, 60, CAP);
    expect(isValidGmBooks(b)).toBe(true);
    expect(isValidGmBooks({ ...b, kitty: 1.5 })).toBe(false);
    expect(gmBooksOf({ ...b, season: null }, nba, 3, 60, CAP)).toEqual(newGmBooks(nba, 3, 60, CAP));
  });
});
