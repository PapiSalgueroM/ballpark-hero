import { describe, expect, it } from 'vitest';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import {
  createNrlCareer, nrlCareerCap, nrlCareerFinance, nrlCareerMarket, nrlCareerSquad, nrlContractCounteroffer, nrlContractOffer,
  readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, nrlLadder, NRL_ROLES, reduceNrlSeason } from '@/lib/nrlManager';

const finish = (initial: NrlCareerState) => {
  let state = initial;
  while (state.season.phase !== 'complete') state = reduceNrlCareer(state, { type: 'advance' });
  return state;
};
const next = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'startNextSeason' });

describe('NRL Manager career', () => {
  it.each([2026, 2027] as const)('migrates %i draft saves without changing played matches or the next match', year => {
    let v1 = createNrlSeason('panthers', 620, year);
    for (let round = 0; round < 10; round++) v1 = reduceNrlSeason(v1, { type: 'advance' });
    v1 = reduceNrlSeason(v1, { type: 'setTactic', tactic: 'defense' });
    v1 = reduceNrlSeason(v1, { type: 'prepare', choice: 'train' });
    const raw = JSON.stringify(v1);
    const state = readNrlCareerSave(raw)!;
    expect(state.version).toBe(2);
    expect(state.openingYear).toBe(year);
    expect(state.season).toMatchObject({ ...v1, squad: expect.arrayContaining(v1.squad) });
    expect(state.season.squad).toHaveLength(30);
    expect(nrlCareerFinance(state).fromRound).toBe(v1.round);
    expect(reduceNrlCareer(state, { type: 'advance' }).season.results)
      .toEqual(reduceNrlSeason(v1, { type: 'advance' }).results);
    expect(readNrlCareerSave(raw)).toEqual(state);
    expect(readNrlCareerSave(JSON.stringify(state))).toEqual(state);
  });

  it('opens a migrated completed year for offseason and rolls through both expansion years', () => {
    let v1 = createNrlSeason('panthers', 41);
    while (v1.phase !== 'complete') v1 = reduceNrlSeason(v1, { type: 'advance' });
    let state = readNrlCareerSave(JSON.stringify(v1))!;
    expect(state.season.results).toEqual(v1.results);
    expect(state.history[0]).toMatchObject({ year: 2026, championId: v1.championId, finance: null });
    state = next(state);
    expect(nrlLadder(state.season)).toHaveLength(18);
    expect(nrlLadder(state.season).some(row => row.clubId === 'bears')).toBe(true);
    expect(next(state)).toBe(state);
    state = next(finish(state));
    expect(state.season.year).toBe(2028);
    expect(nrlLadder(state.season).some(row => row.clubId === 'chiefs')).toBe(true);
    expect(state.history.map(row => row.year)).toEqual([2026, 2027]);
    state = finish(state);
    expect(state.season.results).toHaveLength(237);
    expect(readNrlCareerSave(JSON.stringify(state))).toEqual(state);
  });

  it('reserves next-year cap and does not move a rival signing before rollover', () => {
    const state = createNrlCareer('panthers', 77, 2027);
    const entry = nrlCareerMarket(state).find(item => item.kind === 'rival')!;
    const before = nrlCareerCap(state, entry.startYear);
    const exact = before.available + before.minimumSalary;
    expect(nrlContractOffer(state, entry.player.id, exact + 1, 1)).toMatchObject({ ok: false });
    const action = { type: 'offerContract' as const, playerId: entry.player.id, salary: exact, years: 1 };
    const signed = reduceNrlCareer(state, action);
    expect(signed).not.toBe(state);
    expect(nrlCareerCap(signed, entry.startYear).available).toBe(0);
    expect(nrlCareerSquad(signed).map(player => player.id)).not.toContain(entry.player.id);
    expect(signed.players.find(player => player.id === entry.player.id)!.contract).toEqual(entry.player.contract);
    expect(reduceNrlCareer(signed, action)).toBe(signed);
    const arrived = next(finish(signed));
    expect(nrlCareerSquad(arrived).find(player => player.id === entry.player.id)?.contract)
      .toMatchObject({ clubId: 'panthers', salary: exact });
    expect(nrlCareerCap(arrived).slots).toBe(30);
    expect(nrlCareerCap(arrived).available).toBe(0);
    for (const role of NRL_ROLES) expect(arrived.season.lineup[role]).toBeTruthy();
  });

  it('round-trips a shortlist and clears a target after accepting its offer', () => {
    const state = createNrlCareer('storm', 17);
    const raw = JSON.stringify(state);
    expect(state.shortlist).toBeUndefined();
    expect(JSON.stringify(readNrlCareerSave(raw))).toBe(raw);

    const entry = nrlCareerMarket(state).find(item => item.kind === 'rival'
      && nrlContractOffer(state, item.player.id, item.askingSalary, 1).ok)!;
    const mark = { type: 'setShortlist' as const, playerId: entry.player.id, year: state.season.year, saved: true };
    const saved = reduceNrlCareer(state, mark);
    expect(saved.shortlist).toEqual([entry.player.id]);
    expect(JSON.stringify(readNrlCareerSave(JSON.stringify(saved)))).toBe(JSON.stringify(saved));
    expect(reduceNrlCareer(saved, mark)).toBe(saved);
    const remove = { ...mark, saved: false };
    expect(reduceNrlCareer(state, remove)).toBe(state);
    expect(JSON.stringify(reduceNrlCareer(saved, remove))).toBe(raw);

    const offer = { type: 'offerContract' as const, playerId: entry.player.id, salary: entry.askingSalary, years: 1 };
    expect(reduceNrlCareer(saved, { ...offer, salary: 0 })).toBe(saved);
    const signed = reduceNrlCareer(saved, offer);
    expect(signed).not.toBe(saved);
    expect(signed.shortlist).toBeUndefined();
    expect(JSON.stringify(signed)).toBe(JSON.stringify(reduceNrlCareer(state, offer)));
  });

  it('renews a contracted player without charging the extension to the current year', () => {
    const state = createNrlCareer('bears', 14, 2027);
    const entry = nrlCareerMarket(state).find(item => item.kind === 'renewal' && item.player.contract!.endYear > 2027)!;
    const offer = nrlContractOffer(state, entry.player.id, entry.askingSalary, 2);
    expect(offer).toMatchObject({ ok: true, contract: { startYear: entry.player.contract!.endYear + 1 } });
    const signed = reduceNrlCareer(state, { type: 'offerContract', playerId: entry.player.id, salary: entry.askingSalary, years: 2 });
    expect(nrlCareerCap(signed)).toEqual(nrlCareerCap(state));
    expect(nrlCareerCap(signed, entry.startYear + 1).committed - nrlCareerCap(state, entry.startYear + 1).committed).toBe(entry.askingSalary);
    expect(readNrlCareerSave(JSON.stringify(signed))).toEqual(signed);
  });

  it('closes recruiting at the modeled retirement age', () => {
    const state = createNrlCareer('bears', 29, 2027);
    const entry = nrlCareerMarket(state).find(item => item.kind === 'renewal')!;
    const veteran = { ...entry.player, age: 36 };
    const older = { ...state, players: state.players.map(player => player.id === veteran.id ? veteran : player) };
    expect(nrlCareerMarket(older).some(item => item.player.id === veteran.id)).toBe(false);
    expect(nrlContractOffer(older, veteran.id, entry.askingSalary, 2)).toMatchObject({ ok: false });
  });

  it.each([
    ['storm-2-0', 610_000, 579_500, 2029, 'renewal'],
    ['nrl-broncos-2026-0', 585_000, 555_750, 2027, 'rival'],
    ['nrl-market-2026-0-0', 255_000, 242_250, 2027, 'freeAgent'],
  ] as const)('reserves future cap when %s accepts an exact three-season counteroffer', (playerId, ask, salary, startYear, kind) => {
    const state = createNrlCareer('storm', 17);
    const market = nrlCareerMarket(state).find(entry => entry.player.id === playerId)!;
    expect(market).toMatchObject({ askingSalary: ask, kind });
    const listed = kind === 'renewal' ? state : reduceNrlCareer(state, { type: 'setShortlist', playerId, year: 2026, saved: true });
    const raw = JSON.stringify(listed);
    const contract = { clubId: 'storm', startYear, endYear: startYear + 2, salary };
    const bid = ask - 50_000;
    expect(nrlContractOffer(listed, playerId, salary, 3)).toMatchObject({ ok: false });
    expect(reduceNrlCareer(listed, { type: 'offerContract', playerId, salary, years: 3 })).toBe(listed);
    expect(nrlContractCounteroffer(listed, playerId, bid)).toEqual({ ok: true, contract });
    expect(JSON.stringify(listed)).toBe(raw);

    const accept = { type: 'acceptCounteroffer', playerId, year: 2026, offeredSalary: bid, contract } as const;
    expect(reduceNrlCareer(listed, { ...accept, contract: { ...contract, salary: salary - 1 } })).toBe(listed);
    expect(reduceNrlCareer(listed, { ...accept, contract: { ...contract, endYear: startYear + 1 } })).toBe(listed);
    expect(reduceNrlCareer(listed, { ...accept, contract: { ...contract, clubId: 'broncos' } })).toBe(listed);
    expect(reduceNrlCareer(listed, { ...accept, offeredSalary: ask })).toBe(listed);
    expect(reduceNrlCareer(listed, { ...accept, year: 2027 })).toBe(listed);

    const signed = reduceNrlCareer(listed, accept);
    expect(signed.players.find(player => player.id === playerId)).toMatchObject({ contract: market.player.contract, futureContract: contract });
    expect(signed.shortlist).toBeUndefined();
    expect(signed.season).toBe(listed.season);
    expect(signed.finance).toBe(listed.finance);
    for (let year = startYear; year <= startYear + 2; year++) {
      expect(nrlCareerCap(signed, year).committed - nrlCareerCap(listed, year).committed).toBe(salary);
    }
    expect(readNrlCareerSave(JSON.stringify(signed))).toEqual(signed);
    expect(reduceNrlCareer(signed, accept)).toBe(signed);
    if (startYear === 2027) expect(nrlCareerSquad(next(finish(signed))).find(player => player.id === playerId)?.contract).toEqual(contract);
  });

  it('refuses counteroffers below the modeled minimum, without a genuine discount, or after a competing cap commitment', () => {
    const state = createNrlCareer('storm', 17);
    const playerId = 'nrl-broncos-2026-0';
    const offeredSalary = 535_000;
    const contract = { clubId: 'storm', startYear: 2027, endYear: 2029, salary: 555_750 };
    const accept = { type: 'acceptCounteroffer', playerId, year: 2026, offeredSalary, contract } as const;
    const cap = nrlCareerCap(state, 2027);
    const committed = reduceNrlCareer(state, { type: 'offerContract', playerId: 'nrl-market-2026-0-0', salary: cap.available + cap.minimumSalary, years: 1 });
    expect(committed).not.toBe(state);
    expect(nrlContractCounteroffer(state, playerId, cap.minimumSalary - 1)).toMatchObject({ ok: false });
    expect(nrlContractCounteroffer(state, 'nrl-market-2026-11-1', cap.minimumSalary)).toMatchObject({ ok: false });
    expect(nrlContractCounteroffer(state, playerId, 580_000)).toEqual({ ok: true, contract: { ...contract, salary: 580_000 } });
    const cappedLater = reduceNrlCareer(state, {
      type: 'offerContract', playerId: 'storm-2-0', salary: nrlCareerCap(state, 2029).available + cap.minimumSalary, years: 1,
    });
    expect(cappedLater).not.toBe(state);
    expect(nrlContractCounteroffer(cappedLater, playerId, offeredSalary)).toEqual({ ok: false, reason: 'This offer exceeds the 2029 salary cap.' });
    expect(reduceNrlCareer(cappedLater, accept)).toBe(cappedLater);
    expect(nrlContractCounteroffer(committed, playerId, offeredSalary)).toEqual({ ok: false, reason: 'This offer exceeds the 2027 salary cap.' });
    expect(reduceNrlCareer(committed, accept)).toBe(committed);
    const live = reduceNrlCareer(state, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    expect(nrlContractCounteroffer(live, playerId, offeredSalary)).toMatchObject({ ok: false });
    expect(reduceNrlCareer(live, accept)).toBe(live);
    const retired = { ...finish(state), retired: true } as const;
    expect(nrlContractCounteroffer(retired, playerId, offeredSalary)).toMatchObject({ ok: false });
    expect(reduceNrlCareer(retired, accept)).toBe(retired);
    const imported = readNrlCareerSave(JSON.stringify(createNrlSeason('storm', 17)))!;
    expect(nrlContractCounteroffer(imported, playerId, offeredSalary)).toMatchObject({ ok: false });
    expect(reduceNrlCareer(imported, accept)).toBe(imported);
  });

  it('reconciles yearly cash and rejects corrupted roster, fixture and ledger data', () => {
    const initial = createNrlCareer('panthers', 7, 2026);
    const complete = finish(initial);
    const ledger = nrlCareerFinance(complete);
    expect(ledger.wagesPaid).toBe(nrlCareerCap(initial).committed);
    expect(ledger.centralFunding).toBe(nrlCareerCap(initial).cap);
    expect(ledger.gateReceipts).toBeGreaterThan(0);
    expect(ledger.cash).toBe(ledger.openingCash + ledger.centralFunding + ledger.gateReceipts - ledger.wagesPaid - ledger.operatingCosts);
    expect(complete.history[0].finance).toEqual(ledger);
    expect(nrlCareerFinance(next(complete)).openingCash).toBe(ledger.cash);
    expect(readNrlCareerSave(JSON.stringify({ ...complete, finance: { ...complete.finance, wagesPaid: -1 } }))).toBeNull();
    expect(readNrlCareerSave(JSON.stringify({ ...complete, players: [...complete.players, complete.players[0]] }))).toBeNull();
    const badResults = [...complete.season.results];
    badResults[0] = { ...badResults[0], awayScore: 999 };
    expect(readNrlCareerSave(JSON.stringify({ ...complete, season: { ...complete.season, results: badResults } }))).toBeNull();
  });

  it('uses the finalized 2026 and 2027 base caps and minimum salaries', () => {
    expect(nrlSeasonPlan(2026)).toMatchObject({ cap: 11_550_000, minimumSalary: 140_000, projected: false });
    expect(nrlSeasonPlan(2027)).toMatchObject({ cap: 11_700_000, minimumSalary: 145_000, projected: false });
    expect(nrlSeasonPlan(2028)).toMatchObject({ cap: 11_700_000, minimumSalary: 145_000, projected: true });
  });

  it('builds a stable balanced 19-club draw beyond the selectable opening years', () => {
    const season = nrlSeasonPlan(2028);
    expect(season.draw).toHaveLength(27);
    expect(season.draw.flat()).toHaveLength(228);
    const opponents = new Map(season.clubs.map(club => [club.id, new Set<string>()]));
    const home = new Map(season.clubs.map(club => [club.id, 0]));
    for (const round of season.draw) {
      expect(new Set(round.flat()).size).toBe(round.length * 2);
      for (const [a, b] of round) {
        opponents.get(a)!.add(b);
        opponents.get(b)!.add(a);
        home.set(a, home.get(a)! + 1);
      }
    }
    expect([...home.values()].every(count => count === 12)).toBe(true);
    expect([...opponents.values()].every(set => set.size === 18)).toBe(true);
    expect(nrlSeasonPlan(2029).draw).not.toEqual(season.draw);
  });
});
