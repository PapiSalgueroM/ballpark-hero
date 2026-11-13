import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlCareerCap, nrlCareerFinance, nrlCareerMarket, nrlCareerSquad,
  nrlMutualReleaseQuote, nrlTakeoverOffers, nrlTakeoverPlayers, readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, reduceNrlSeason } from '@/lib/nrlManager';

const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const release = (state: NrlCareerState, playerId: string, year = state.season.year) => reduceNrlCareer(state, {
  type: 'agreeMutualRelease', year, clubId: state.season.clubId, playerId,
});
function finish(state: NrlCareerState) {
  while (state.season.phase !== 'complete') state = advance(state);
  return state;
}

describe('NRL negotiated offseason release', () => {
  it.each([[2026, 'storm'], [2027, 'bears']] as const)(
    'pays one modeled settlement from the %i outgoing club without changing its current-season squad, match record or wages',
    (year, club) => {
      const initial = createNrlCareer(club, 4, year);
      const completed = finish(initial);
      const players = nrlCareerSquad(completed);
      const player = players.find(row => nrlMutualReleaseQuote(completed, row.id).ok)!;
      const quote = nrlMutualReleaseQuote(completed, player.id);
      expect(quote).toEqual({
        ok: true, settlement: Math.ceil(player.contract!.salary / 2),
        capGain: player.contract!.salary - nrlCareerCap(completed, year + 1).minimumSalary,
      });
      expect(release(initial, player.id)).toBe(initial);
      expect(release(completed, player.id, year - 1)).toBe(completed);
      const agreed = release(completed, player.id);
      expect(agreed.season).toBe(completed.season);
      expect(nrlCareerSquad(agreed).map(row => row.id)).toEqual(players.map(row => row.id));
      expect(nrlCareerCap(agreed)).toEqual(nrlCareerCap(completed));
      expect(nrlCareerCap(agreed, year + 1).available).toBe(nrlCareerCap(completed, year + 1).available + (quote.ok ? quote.capGain : 0));
      expect(nrlCareerFinance(agreed).wagesPaid).toBe(nrlCareerFinance(completed).wagesPaid);
      expect(nrlCareerFinance(agreed).cash).toBe(nrlCareerFinance(completed).cash - (quote.ok ? quote.settlement : 0));
      expect(agreed.history[0].finance).toEqual(nrlCareerFinance(agreed));
      expect(nrlCareerMarket(agreed).some(row => row.player.id === player.id)).toBe(false);
      expect(read(agreed)).toEqual(agreed);
      expect(release(agreed, player.id)).toBe(agreed);
      expect(release(agreed, players.find(row => row.id !== player.id)!.id)).toBe(agreed);
      const signed = agreed.players.find(row => row.id === player.id)!;
      expect(signed.contract?.endYear).toBe(year);
      const joined = reduceNrlCareer(agreed, { type: 'startNextSeason' });
      expect(joined.finance.openingCash).toBe(nrlCareerFinance(agreed).cash);
      expect(nrlCareerSquad(joined)).toHaveLength(30);
      expect(nrlCareerSquad(joined).some(row => row.id === player.id)).toBe(false);
      expect(joined.players.find(row => row.id === player.id)).toBeDefined();
      expect(read(joined)).toEqual(joined);
    },
  );

  it('rejects another club, an uncovered position, a renewal, longer terms, a legacy season and insufficient cash', () => {
    const completed = finish(createNrlCareer('storm', 4));
    const squad = nrlCareerSquad(completed);
    const player = squad.find(row => nrlMutualReleaseQuote(completed, row.id).ok)!;
    const noCoverage = { ...completed, players: completed.players.map(row => row.id !== player.id && row.role === player.role
      && row.contract?.clubId === 'storm' ? { ...row, contract: { ...row.contract, endYear: 2026 }, futureContract: null } : row) };
    expect(nrlMutualReleaseQuote(noCoverage, player.id)).toMatchObject({ ok: false, reason: /another player signed/ });
    const lowCash = { ...completed, finance: { ...completed.finance, openingCash: -10_000_000 } };
    expect(nrlMutualReleaseQuote(lowCash, player.id)).toMatchObject({ ok: false, reason: /cannot cover/ });
    const lengthy = squad.find(row => row.contract?.endYear === 2028)!;
    expect(release(completed, lengthy.id)).toBe(completed);
    const rival = completed.players.find(row => row.contract?.clubId === 'raiders')!;
    expect(release(completed, rival.id)).toBe(completed);
    const booked = { ...completed, players: completed.players.map(row => row.id === player.id
      ? { ...row, futureContract: { ...player.contract!, startYear: 2028, endYear: 2028 } } : row) };
    expect(release(booked, player.id)).toBe(booked);
    const retired = reduceNrlCareer(completed, { type: 'retireCareer', year: 2026, clubId: 'storm' });
    expect(release(retired, player.id)).toBe(retired);
    let old = createNrlSeason('storm', 4);
    while (old.phase !== 'complete') old = reduceNrlSeason(old, { type: 'advance' });
    const imported = readNrlCareerSave(JSON.stringify(old))!;
    expect(release(imported, player.id)).toBe(imported);
  });

  it('keeps the settlement with the outgoing club when the manager moves and rejects a forged amount', () => {
    const completed = finish(createNrlCareer('storm', 4));
    const player = nrlTakeoverPlayers(completed).find(row => nrlMutualReleaseQuote(completed, row.id).ok)!;
    const agreed = release(completed, player.id);
    const { finance, history } = agreed;
    const spoofed = { ...finance, mutualRelease: { ...finance.mutualRelease!, annualSalary: finance.mutualRelease!.annualSalary - 1 } };
    expect(read({ ...agreed, finance: spoofed, history: [{ ...history[0], finance: nrlCareerFinance({ finance: spoofed }) }] })).toBeNull();
    const move = { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } } as const;
    const perth = reduceNrlCareer(agreed, move);
    const manual = reduceNrlCareer(completed, move);
    expect(perth.finance).toEqual(manual.finance);
    expect(perth.history[0].finance?.mutualRelease?.playerId).toBe(player.id);
    const next = finish(perth);
    const returned = reduceNrlCareer(next, { type: 'startNextSeason', move: { fromYear: 2027, clubId: 'storm' } });
    expect(returned.finance.openingCash).toBe(nrlCareerFinance(agreed).cash);
    expect(read(returned)).toEqual(returned);
  });

  it('protects the remaining signed player at the released position from a conflicting takeover', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const complete = finish(createNrlCareer('storm', seed));
      const next = nrlCareerSquad(complete, 2027);
      for (const player of next) {
        const cover = next.filter(teammate => teammate.role === player.role && teammate.id !== player.id);
        if (cover.length !== 1 || !nrlMutualReleaseQuote(complete, player.id).ok) continue;
        const [offer] = nrlTakeoverOffers(complete, cover[0].id);
        if (!offer) continue;
        const released = release(complete, player.id);
        expect(nrlTakeoverOffers(released, cover[0].id)).toEqual([]);
        expect(reduceNrlCareer(released, { type: 'arrangeTakeover', year: 2026, clubId: 'storm', playerId: cover[0].id,
          destinationId: offer.clubId })).toBe(released);
        expect(read(released)).toEqual(released);
        return;
      }
    }
    throw new Error('No suitable existing takeover in the fixture range');
  });
});
