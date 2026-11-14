import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlCareerCap, nrlCareerSquad, nrlContractApproach, nrlTakeoverOffers, readNrlCareerSave, reduceNrlCareer,
  runNrlFastForward, type NrlCareerState,
} from '@/lib/nrlCareer';

const raw = JSON.stringify;
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const player = (state: NrlCareerState, id: string) => state.players.find(candidate => candidate.id === id)!;
const listing = (state: NrlCareerState, playerId: string, permission = true) => reduceNrlCareer(state, {
  type: 'inviteContractApproach', playerId, permission, year: state.season.year, clubId: state.season.clubId, round: state.season.round,
});
const respond = (state: NrlCareerState, decision: 'accept' | 'decline', destinationId = nrlContractApproach(state)?.destinationId ?? '') =>
  reduceNrlCareer(state, {
    type: 'answerContractApproach', year: state.season.year, clubId: state.season.clubId, listedRound: state.contractApproach!.listedRound,
    playerId: state.contractApproach!.playerId, destinationId, decision,
  });

describe('NRL rival contract approaches', () => {
  it.each([[2026, 'storm'], [2027, 'bears']] as const)('makes one %i offer with explicit permission and the same Quick Sim and Live outcome', (year, clubId) => {
    const initial = createNrlCareer(clubId, 4, year);
    const candidate = nrlCareerSquad(initial).find(member => nrlTakeoverOffers(initial, member.id).length > 0)!;
    expect(listing(initial, candidate.id, false)).toBe(initial);
    const listed = listing(initial, candidate.id);
    expect(nrlContractApproach(listed)?.status).toBe('waiting');
    expect(listing(listed, candidate.id)).toBe(listed);
    expect(raw(readNrlCareerSave(raw(listed)))).toBe(raw(listed));
    const replied = advance(listed);
    const reply = nrlContractApproach(replied)!;
    expect(reply.status).toBe('offered');
    expect(reply.deadline).toBe(3);
    expect(reply.contract).toEqual(nrlTakeoverOffers(replied, candidate.id).find(offer => offer.clubId === reply.destinationId));
    const { contractApproach: _receipt, ...without } = replied;
    expect(raw(without)).toBe(raw(advance(initial)));
    const live = reduceNrlCareer(listed, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    const settled = reduceNrlCareer(live, { type: 'finishLive', year, round: 1, tactic: 'balanced' });
    expect(raw(settled)).toBe(raw(replied));
    expect(runNrlFastForward(listed, { year, clubId, round: 1, through: 4 })).toEqual({ state: replied, stop: 'contract-approach' });
    expect(respond(replied, 'accept', clubId)).toBe(replied);
    const accepted = respond(replied, 'accept');
    expect(nrlContractApproach(accepted)?.status).toBe('accepted');
    expect(accepted.season).toBe(replied.season);
    expect(accepted.finance).toBe(replied.finance);
    expect(nrlCareerCap(accepted)).toEqual(nrlCareerCap(replied));
    expect(player(accepted, candidate.id).contract).toEqual({ ...candidate.contract, endYear: year });
    expect(player(accepted, candidate.id).futureContract).toEqual(reply.contract);
    expect(nrlCareerCap(accepted, year + 1).available - nrlCareerCap(replied, year + 1).available)
      .toBe(candidate.contract!.salary - nrlCareerCap(replied, year + 1).minimumSalary);
    expect(raw(readNrlCareerSave(raw(accepted)))).toBe(raw(accepted));
    let complete = accepted;
    while (complete.season.phase !== 'complete') complete = advance(complete);
    const moved = reduceNrlCareer(complete, { type: 'startNextSeason', move: { fromYear: year, clubId: reply.destinationId! } });
    expect(moved.contractApproach).toBeUndefined();
    expect(nrlCareerSquad(moved).find(member => member.id === candidate.id)?.contract).toEqual(reply.contract);
    expect(moved.players.filter(member => member.id === candidate.id)).toHaveLength(1);
    expect(raw(readNrlCareerSave(raw(moved)))).toBe(raw(moved));
  });

  it('closes a declined or expired offer for the year and refuses a buyer whose remaining cap room changed', () => {
    const start = createNrlCareer('storm', 4, 2026);
    const playerId = 'storm-3-1';
    const replied = advance(listing(start, playerId));
    const offer = nrlContractApproach(replied)!;
    const declined = respond(replied, 'decline');
    expect(nrlContractApproach(declined)?.status).toBe('declined');
    expect(listing(declined, playerId)).toBe(declined);
    expect(respond(declined, 'accept')).toBe(declined);
    const expired = advance(advance(replied));
    expect(nrlContractApproach(expired)?.status).toBe('expired');
    expect(respond(expired, 'accept')).toBe(expired);
    expect(raw(readNrlCareerSave(raw(expired)))).toBe(raw(expired));

    const buyer = offer.destinationId!;
    const cap = nrlCareerCap({ ...replied, season: { ...replied.season, clubId: buyer } }, 2028);
    const incumbent = replied.players.find(member => member.contract?.clubId === buyer && member.contract.endYear === 2027)!;
    const filled = { ...replied, players: replied.players.map(member => member === incumbent ? {
      ...member, futureContract: { clubId: buyer, startYear: 2028, endYear: 2028, salary: cap.available + cap.minimumSalary },
    } : member) };
    expect(nrlContractApproach(filled)).toMatchObject({ status: 'offered', destinationId: buyer, contract: null });
    expect(respond(filled, 'accept')).toBe(filled);
    expect(raw(readNrlCareerSave(raw(filled)))).toBe(raw(filled));
  });

  it('settles after a bye and leaves an existing manual offseason move intact', () => {
    const initial = createNrlCareer('panthers', 16);
    const candidate = nrlCareerSquad(initial).find(member => nrlTakeoverOffers(initial, member.id).length > 0)!;
    const listed = listing(initial, candidate.id);
    expect(runNrlFastForward(listed, { year: 2026, clubId: 'panthers', round: 1, through: 4 }).stop).toBe('contract-approach');
    const offer = nrlTakeoverOffers(listed, candidate.id)[0];
    const manual = reduceNrlCareer(listed, {
      type: 'arrangeTakeover', year: 2026, clubId: 'panthers', playerId: candidate.id, destinationId: offer.clubId,
    });
    const settled = advance(manual);
    expect(nrlContractApproach(settled)?.status).toBe('no-offer');
    expect(player(settled, candidate.id).futureContract).toEqual(offer);
    expect(raw(readNrlCareerSave(raw(settled)))).toBe(raw(settled));
  });

  it('ends the last offer at the finals boundary without modifying the player', () => {
    const playerId = 'storm-3-1';
    let state = createNrlCareer('storm', 4);
    while (state.season.round < 25) state = advance(state);
    const listed = listing(state, playerId);
    const reply = advance(listed);
    expect(nrlContractApproach(reply)?.status).toBe('offered');
    expect(nrlContractApproach(reply)?.deadline).toBe(27);
    expect(listing(advance(state), playerId)).toEqual(advance(state));
    const finals = advance(advance(reply));
    expect(finals.season.phase).toBe('finals');
    expect(nrlContractApproach(finals)?.status).toBe('expired');
    expect(player(finals, playerId).contract).toEqual(player(state, playerId).contract);
    expect(raw(readNrlCareerSave(raw(finals)))).toBe(raw(finals));
  });

  it.each([
    [2026, 'storm', 'storm-2-0', 'nrl-storm-2026-27', 410000, 'dragons', 256034],
    [2027, 'bears', 'bears-2-0', 'nrl-bears-2027-27', 356127, 'tigers', 259124],
  ] as const)('protects the only returning winger, then accepts a real approach after renewing cover in %i', (
    year, clubId, id, coverId, salary, buyer, capGain,
  ) => {
    const initial = createNrlCareer(clubId, 1, year);
    const outgoing = player(initial, id);
    expect(nrlCareerSquad(initial, year + 1).filter(row => row.role === outgoing.role)).toEqual([outgoing]);
    expect(listing(initial, id)).toBe(initial);
    expect(initial.contractApproach).toBeUndefined();
    const historical = { ...initial, contractApproach: { playerId: id, listedRound: 1, endYear: outgoing.contract!.endYear } };
    expect(nrlContractApproach(readNrlCareerSave(raw(historical))!)?.status).toBe('waiting');
    const oldNoOffer = advance(historical);
    expect(nrlContractApproach(readNrlCareerSave(raw(oldNoOffer))!)?.status).toBe('no-offer');
    const renewed = reduceNrlCareer(initial, { type: 'offerContract', playerId: coverId, years: 1, salary });
    expect(renewed).not.toBe(initial);
    const offered = advance(listing(renewed, id));
    expect(nrlContractApproach(offered)).toMatchObject({ status: 'offered', destinationId: buyer });
    const accepted = respond(offered, 'accept');
    expect(nrlContractApproach(accepted)?.status).toBe('accepted');
    expect(nrlCareerCap(accepted, year + 1).available - nrlCareerCap(offered, year + 1).available).toBe(capGain);
    expect(nrlCareerSquad(accepted, year + 1).filter(row => row.role === outgoing.role).map(row => row.id)).toEqual([coverId]);
    expect(raw(readNrlCareerSave(raw(accepted)))).toBe(raw(accepted));
  });
});
