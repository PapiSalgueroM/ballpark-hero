import { expect, it } from 'vitest';
import { createNrlCareer, nrlCareerCap, nrlCareerMarket, nrlCareerSquad, nrlContractSwapOptions, nrlContractSwapPlayers,
  nrlTakeoverDiscovery, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { NRL_ROLES } from '@/lib/nrlManager';

const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const player = (state: NrlCareerState, id: string) => state.players.find(row => row.id === id)!;
function finish(state: NrlCareerState) {
  while (state.season.phase !== 'complete') state = reduceNrlCareer(state, { type: 'advance' });
  return state;
}

it.each([[2026, 'storm'], [2027, 'bears']] as const)(
  'swaps the actual two future contracts atomically and carries the newcomer into the %i squad',
  (year, clubId) => {
    const early = createNrlCareer(clubId, 4, year);
    expect(nrlContractSwapPlayers(early)).toEqual([]);
    const ended = finish(early);
    const matching = nrlContractSwapPlayers(ended).flatMap(outgoing => nrlContractSwapOptions(ended, outgoing.id));
    expect(matching.length).toBeGreaterThan(11);
    const pair = matching.find(({ outgoing, incoming }) =>
      !nrlTakeoverDiscovery(ended, outgoing.id).offers.some(offer => offer.clubId === incoming.contract?.clubId))!;
    expect(pair).toBeDefined();
    const { outgoing, incoming, toOwnClub, toRivalClub, capRoom } = pair;
    const action = { type: 'swapContracts', year, clubId, outgoingId: outgoing.id, incomingId: incoming.id } as const;
    const watched = nrlCareerMarket(ended).find(row => row.kind === 'rival')!.player.id;
    const listed = reduceNrlCareer(ended, { type: 'setShortlist', year, playerId: watched, saved: true });
    expect(listed.shortlist).toContain(watched);
    const traded = reduceNrlCareer(listed, action);
    expect(traded.season).toBe(listed.season);
    expect(traded.finance).toBe(listed.finance);
    expect(traded.history).toBe(listed.history);
    expect(traded.players.filter(row => ![outgoing.id, incoming.id].includes(row.id))).toEqual(
      listed.players.filter(row => ![outgoing.id, incoming.id].includes(row.id)));
    expect(player(traded, outgoing.id)).toEqual({ ...outgoing, contract: { ...outgoing.contract, endYear: year }, futureContract: toRivalClub });
    expect(player(traded, incoming.id)).toEqual({ ...incoming, contract: { ...incoming.contract, endYear: year }, futureContract: toOwnClub });
    expect(nrlCareerCap(traded, year + 1).available).toBe(capRoom);
    expect(traded.shortlist).toEqual(listed.shortlist);
    expect(nrlCareerMarket(traded).some(row => row.player.id === incoming.id)).toBe(false);
    expect(read(traded)).toEqual(traded);
    expect(reduceNrlCareer(early, action)).toBe(early);
    expect(reduceNrlCareer(traded, action)).toBe(traded);
    for (const tampered of [{ ...action, year: year - 1 }, { ...action, incomingId: outgoing.id }, { ...action, incomingId: 'missing' }]) {
      expect(reduceNrlCareer(ended, tampered)).toBe(ended);
    }

    const next = reduceNrlCareer(read(traded)!, { type: 'startNextSeason' });
    const squad = nrlCareerSquad(next);
    expect(next.season.year).toBe(year + 1);
    expect(squad).toHaveLength(30);
    expect(NRL_ROLES.every(role => squad.some(row => row.role === role))).toBe(true);
    expect(squad.find(row => row.id === incoming.id)?.contract).toEqual(toOwnClub);
    expect(squad.some(row => row.id === outgoing.id)).toBe(false);
    expect(player(next, outgoing.id).contract).toEqual(toRivalClub);
    expect(read(next)).toEqual(next);
  },
);

it('rechecks a genuinely changed cap before accepting a previously available swap', () => {
  const year = 2026, clubId = 'storm';
  const ended = finish(createNrlCareer(clubId, 4, year));
  const action = { type: 'swapContracts', year, clubId, outgoingId: 'storm-11-0', incomingId: 'nrl-broncos-2026-10' } as const;
  const approved = nrlContractSwapOptions(ended, action.outgoingId, action.incomingId)[0];
  expect(approved).toBeDefined();
  const cap = nrlCareerCap(ended, year + 1);
  expect(approved.capRoom).toBeLessThan(cap.available);
  const nearLimit = reduceNrlCareer(ended, { type: 'offerContract', playerId: 'storm-1-0', salary: cap.available + cap.minimumSalary, years: 1 });
  expect(nrlCareerCap(nearLimit, year + 1).available).toBe(0);
  expect(read(nearLimit)).toEqual(nearLimit);
  expect(nrlContractSwapOptions(nearLimit, action.outgoingId, action.incomingId)).toEqual([]);
  expect(reduceNrlCareer(nearLimit, action)).toBe(nearLimit);
});

it('can replace the only returning player at a position and uses the replacement in Round 1', () => {
  const year = 2026, clubId = 'storm';
  const ended = finish(createNrlCareer(clubId, 1, year));
  const action = { type: 'swapContracts', year, clubId, outgoingId: 'storm-2-0', incomingId: 'nrl-roosters-2026-14' } as const;
  expect(nrlCareerSquad(ended, year + 1).filter(row => row.role === 'Left Wing').map(row => row.id)).toEqual([action.outgoingId]);
  expect(nrlTakeoverDiscovery(ended, action.outgoingId).offers).toEqual([]);
  const pair = nrlContractSwapOptions(ended, action.outgoingId, action.incomingId)[0];
  expect(pair.incoming.role).toBe('Left Wing');
  expect(pair.capRoom - nrlCareerCap(ended, year + 1).available).toBe(801);
  const next = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'startNextSeason' });
  const normal = next(ended);
  const changed = next(reduceNrlCareer(ended, action));
  const selected = reduceNrlCareer(changed, { type: 'selectStarter', role: 'Left Wing', playerId: action.incomingId });
  const result = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' }).season.results.find(row => row.playerScoring)!;
  expect(result(selected).playerScoring?.starters).toContain(action.incomingId);
  expect([result(normal).homeScore, result(normal).awayScore]).toEqual([16, 17]);
  expect([result(selected).homeScore, result(selected).awayScore]).toEqual([22, 10]);
});
