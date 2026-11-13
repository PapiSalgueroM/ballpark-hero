import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlBoardRecruitmentIncome, nrlBoardRecruitmentQuote, nrlCareerCap, nrlCareerFinance,
  nrlCareerMarket, nrlContractCounteroffer, nrlContractOffer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, NRL_ROLES, nrlRegularRounds, type NrlRole } from '@/lib/nrlManager';

const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const reload = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const quote = nrlBoardRecruitmentQuote;
const accept = (state: NrlCareerState, role: NrlRole = quote(state).role!) => reduceNrlCareer(state, {
  type: 'acceptBoardRecruitment', year: state.season.year, clubId: state.season.clubId, role,
});
const sign = (state: NrlCareerState, playerId: string, salary: number) => reduceNrlCareer(state, {
  type: 'offerContract', playerId, salary, years: 1,
});
function until(state: NrlCareerState, done: (state: NrlCareerState) => boolean) {
  while (!done(state)) state = advance(state);
  return state;
}
const last = (state: NrlCareerState) => until(state, ({ season }) => season.round === nrlRegularRounds(season.year));

describe('NRL Board recruitment brief', () => {
  it.each([[2026, 'storm'], [2027, 'bears']] as const)('offers a real cap-legal role and pays the %s club once at regular-season close', (year, club) => {
    const initial = createNrlCareer(club, 39, year);
    const { role, targets, bonus, reason } = quote(initial);
    expect(role).toBeDefined();
    expect(reason).toBeNull();
    expect(bonus).toBe(100_000);
    expect(targets.length).toBeGreaterThanOrEqual(2);
    expect(targets.every(entry => entry.kind !== 'renewal' && entry.player.role === role
      && nrlContractOffer(initial, entry.player.id, entry.askingSalary, 1).ok)).toBe(true);
    const selected = accept(initial, role!);
    expect(selected.finance.boardRecruitment).toEqual({ role });
    expect(selected.season).toBe(initial.season);
    expect(nrlCareerCap(selected, year + 1)).toEqual(nrlCareerCap(initial, year + 1));
    expect(accept(selected)).toBe(selected);
    expect(reload(selected)).toStrictEqual(selected);
    const { player, askingSalary } = targets[0];
    const signed = sign(selected, player.id, askingSalary);
    const ordinary = sign(initial, player.id, askingSalary);
    expect(signed.finance.boardRecruitment).toMatchObject({ signed: { id: player.id, name: player.name } });
    expect(nrlBoardRecruitmentIncome(signed.finance)).toBe(0);
    expect(nrlCareerFinance(signed).cash).toBe(nrlCareerFinance(ordinary).cash);
    expect(reload(signed)).toStrictEqual(signed);
    const before = last(signed);
    const paid = advance(before);
    const ordinaryPaid = advance(last(ordinary));
    expect(paid.season).toEqual(ordinaryPaid.season);
    expect(nrlBoardRecruitmentIncome(paid.finance)).toBe(100_000);
    expect(nrlCareerFinance(paid).cash - nrlCareerFinance(ordinaryPaid).cash).toBe(100_000);
    expect(reload(paid)).toStrictEqual(paid);
    expect(nrlBoardRecruitmentIncome(advance(paid).finance)).toBe(100_000);
    const complete = until(paid, ({ season }) => season.phase === 'complete');
    const next = reduceNrlCareer(complete, { type: 'startNextSeason' });
    expect(next.finance.boardRecruitment).toBeUndefined();
    expect(next.history[0].finance?.boardRecruitment).toEqual(complete.finance.boardRecruitment);
    expect(JSON.stringify(reload(next))).toBe(JSON.stringify(next));
    const destination = year === 2026 ? 'bears' : 'storm';
    const moved = reduceNrlCareer(complete, { type: 'startNextSeason', move: { fromYear: year, clubId: destination } });
    expect(moved.season.clubId).toBe(destination);
    expect(moved.finance.openingCash).toBe(2_500_000);
    expect(moved.finance.boardRecruitment).toBeUndefined();
    expect(moved.history[0].finance?.boardRecruitment).toEqual(complete.finance.boardRecruitment);
    expect(JSON.stringify(reload(moved))).toBe(JSON.stringify(moved));
  });

  it('requires acceptance, refuses stale actions and records a miss without paying later signings', () => {
    const initial = createNrlCareer('storm', 39);
    const { role, targets } = quote(initial);
    const target = targets[0];
    const second = advance(initial);
    expect(accept(second, role!)).toBe(second);
    expect(quote(second).role).toBeUndefined();
    const live = reduceNrlCareer(initial, { type: 'startLive' });
    expect(accept(live, role!)).toBe(live);
    const legacy = readNrlCareerSave(JSON.stringify(createNrlSeason('storm', 39)))!;
    expect(accept(legacy, role!)).toBe(legacy);
    expect(reduceNrlCareer(initial, { type: 'acceptBoardRecruitment', year: 2027, clubId: 'storm', role: role! })).toBe(initial);
    expect(reduceNrlCareer(initial, { type: 'acceptBoardRecruitment', year: 2026, clubId: 'bears', role: role! })).toBe(initial);
    const presigned = sign(initial, target.player.id, target.askingSalary);
    expect(presigned.finance.boardRecruitment).toBeUndefined();
    expect(accept(presigned, role!)).toBe(presigned);

    const chosen = accept(initial);
    const own = nrlCareerMarket(chosen).find(entry => entry.kind === 'renewal' && entry.player.role === role
      && nrlContractOffer(chosen, entry.player.id, entry.askingSalary, 1).ok)!;
    const renewed = sign(chosen, own.player.id, own.askingSalary);
    expect(renewed.finance.boardRecruitment).toEqual({ role });
    const scouted = advance(reduceNrlCareer(renewed, { type: 'scoutAcademy', role: role! }));
    const promoted = reduceNrlCareer(scouted, { type: 'promoteAcademy', playerId: `nrl-prospect-storm-2026-${NRL_ROLES.indexOf(role!)}` });
    expect(promoted).not.toBe(scouted);
    expect(promoted.finance.boardRecruitment).toEqual({ role });
    const end = advance(last(promoted));
    const late = sign(end, target.player.id, target.askingSalary);
    expect(late).not.toBe(end);
    expect(late.finance.boardRecruitment).toEqual({ role });
    expect(nrlBoardRecruitmentIncome(late.finance)).toBe(0);
    expect(reload(late)).toStrictEqual(late);
    const signedAnotherRole = nrlCareerMarket(chosen).find(entry => entry.kind !== 'renewal' && entry.player.role !== role
      && nrlContractOffer(chosen, entry.player.id, entry.askingSalary, 1).ok)!;
    expect(sign(chosen, signedAnotherRole.player.id, signedAnotherRole.askingSalary).finance.boardRecruitment).toEqual({ role });
  });

  it('credits an accepted counteroffer and rejects false or premature payment records', () => {
    const initial = accept(createNrlCareer('storm', 39));
    const { role, targets } = quote(initial);
    const available = targets.find(entry => nrlContractCounteroffer(initial, entry.player.id, entry.askingSalary - 1).ok)!;
    const offeredSalary = available.askingSalary - 1;
    const counter = nrlContractCounteroffer(initial, available.player.id, offeredSalary);
    if (!counter.ok) throw new Error('No test counteroffer');
    const signed = reduceNrlCareer(initial, { type: 'acceptCounteroffer', playerId: available.player.id,
      year: 2026, offeredSalary, contract: counter.contract });
    const objective = signed.finance.boardRecruitment!;
    expect(objective.signed?.id).toBe(available.player.id);
    const forged = (boardRecruitment: typeof objective) => reload({ ...signed, finance: { ...signed.finance, boardRecruitment } });
    expect(forged({ ...objective, paid: true })).toBeNull();
    expect(forged({ ...objective, role: role === 'Fullback' ? 'Lock' : 'Fullback' })).toBeNull();
    expect(forged({ ...objective, signed: { ...objective.signed!, id: 'nonexistent', name: 'Nobody' } })).toBeNull();
    expect(forged({ ...objective, signed: { ...objective.signed!, salary: objective.signed!.salary + 1 } })).toBeNull();
    const paid = advance(last(signed));
    expect(reload({ ...paid, finance: { ...paid.finance, boardRecruitment: objective } })).toBeNull();
  });
});
