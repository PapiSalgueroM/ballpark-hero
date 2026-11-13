import { describe, expect, it, vi } from 'vitest';
import {
  SAVE_KEY, acceptBid, eraPlayableClubs, generateIncomingBids, loadCareer, playableClubs, rejectBid,
  saveCareer, setTransferStatus, startCareer, worldLeagueDefs,
  type CareerState,
} from '@/lib/clubManager';
import { ensureEraRosters } from '@/lib/clubManagerEras';

function listedCareer(value: number, era = 'now'): CareerState {
  const state = startCareer(era === 'now' ? 'Newcastle United' : 'Newcastle', era);
  const player = {
    ...state.squad[0], name: 'Test Forward', rating: 89, value,
    contractYears: 3, releaseClause: undefined, wantsOut: false,
  };
  state.squad = state.squad.map((other, index) => index === 0 ? player : {
    ...other, transferStatus: 'blocked' as const, releaseClause: undefined,
  });
  return setTransferStatus(state, player.id, 'listed')!;
}

function worldBuyers(state: CareerState) {
  return worldLeagueDefs(state).flatMap(league => (state.eraId === 'era2010'
    ? eraPlayableClubs(state.eraId, league.id) : playableClubs(league.id)).slice(0, 8))
    .filter(club => club.name !== state.clubName);
}

function withDraws<T>(draws: number[], action: () => T): T {
  const random = vi.spyOn(Math, 'random').mockImplementation(() => draws.shift() ?? 0);
  try {
    return action();
  } finally {
    random.mockRestore();
  }
}

function makeBids(state: CareerState, draws: number[], topUp = false) {
  return withDraws(draws, () => {
    generateIncomingBids(state, topUp);
    return state.incomingBids ?? [];
  });
}

describe('Club Manager listed player bids', () => {
  it('keeps the £153m offer and picks a buyer that can afford it', () => {
    const state = listedCareer(200);
    const buyers = worldBuyers(state);
    const smallBuyer = buyers.findIndex(club => club.name === 'Incheon United');
    expect(buyers[smallBuyer]?.budget).toBe(8);
    const bids = makeBids(state, [0, (smallBuyer + 0.5) / buyers.length, 0.99, 0]);
    expect(bids).toHaveLength(1);
    expect(bids[0]).toMatchObject({ offer: 153, fromListing: true });
    expect(buyers.find(club => club.name === bids[0].club)?.budget).toBeGreaterThanOrEqual(153);
  });

  it('uses two distinct affordable clubs for a contested offer', () => {
    const state = listedCareer(150);
    const buyers = worldBuyers(state);
    const [bid] = makeBids(state, [0, 0.99, 0, 0.99, 0]);
    expect(bid.offer).toBe(141.8);
    expect(bid.rival).toBeDefined();
    expect(bid.rival).not.toBe(bid.club);
    for (const name of [bid.club, bid.rival]) {
      expect(buyers.find(club => club.name === name)?.budget).toBeGreaterThanOrEqual(bid.offer);
    }
  });

  it.each([[205, 156.8], [250, 191.3]])('makes an ordinary offer on a £%im player when the premium has too few buyers', (value, offer) => {
    const state = listedCareer(value);
    const bids = makeBids(state, [0, 0, 0, 0, 0]);
    expect(bids).toHaveLength(1);
    expect(bids[0].offer).toBe(offer);
    expect(bids[0].rival).toBeUndefined();
    expect(worldBuyers(state).find(club => club.name === bids[0].club)?.budget).toBeGreaterThanOrEqual(offer);
  });

  it('skips an unaffordable draw and can bid on a later top-up', () => {
    const state = listedCareer(270);
    expect(makeBids(state, [0, 0, 0.99, 0])).toEqual([]);
    expect(state.squad[0].transferStatus).toBe('listed');
    state.squad[0].value = 200;
    expect(makeBids(state, [0, 0, 0.99, 0], true)).toHaveLength(1);
  });

  it('uses the historical budget and accepts an offer exactly at that budget', async () => {
    await ensureEraRosters('era2010');
    const state = listedCareer(50, 'era2010');
    const buyers = worldBuyers(state);
    const limit = Math.max(...buyers.map(club => club.budget));
    state.squad[0].value = limit / 0.9;
    const [bid] = makeBids(state, [0, 0, 0.99, 0.5]);
    expect(bid.offer).toBe(limit);
    expect(buyers.find(club => club.name === bid.club)?.budget).toBe(limit);
  });

  it('keeps an open offer already in the save during a top-up', () => {
    const state = listedCareer(200);
    const existing = {
      playerId: state.squad[0].id, playerName: state.squad[0].name,
      club: 'Incheon United', offer: 153, status: 'open' as const, fromListing: true,
    };
    state.incomingBids = [existing];
    expect(makeBids(state, [0], true)).toEqual([existing]);
    const accepted = acceptBid(state, existing.playerId);
    expect(accepted?.squad.some(player => player.id === existing.playerId)).toBe(false);
    expect(accepted?.budget).toBeCloseTo(state.budget + existing.offer);
  });

  it.each([false, true])('declines instead of raising a £191.3m bid above its buyer budget (unlisted: %s)', unlist => {
    const state = listedCareer(250);
    const [bid] = makeBids(state, [0, 0, 0, 0, 0]);
    expect(bid).toMatchObject({ club: 'Real Madrid', offer: 191.3 });
    const beforeSave = unlist ? setTransferStatus(state, bid.playerId, null)! : state;
    try {
      expect(saveCareer(beforeSave)).toBe(true);
      const loaded = loadCareer();
      expect(loaded?.incomingBids).toEqual([bid]);
      expect(loaded?.squad.find(player => player.id === bid.playerId)?.transferStatus).toBe(unlist ? undefined : 'listed');
      const declined = withDraws([0], () => rejectBid(loaded!, bid.playerId));
      expect(declined.incomingBids).toEqual([]);
    } finally {
      localStorage.removeItem(SAVE_KEY);
    }
  });

  it.each([['Barcelona', undefined], ['Arsenal', 'Arsenal']])('checks the rival budget on an affordable counteroffer (%s)', (rival, expectedRival) => {
    const state = listedCareer(150);
    const player = state.squad[0];
    state.incomingBids = [{
      playerId: player.id, playerName: player.name, club: 'Real Madrid', rival,
      offer: 141.8, status: 'open', fromListing: true,
    }];
    const [counter] = withDraws([0], () => rejectBid(state, player.id)).incomingBids ?? [];
    expect(counter).toMatchObject({ club: 'Real Madrid', offer: 163.1, status: 'improved' });
    expect(counter.rival).toBe(expectedRival);
  });

  it('keeps the old counteroffer rule for an unlisted player who requested a transfer', () => {
    const state = listedCareer(200);
    const player = state.squad[0];
    const unlisted = setTransferStatus(state, player.id, null)!;
    unlisted.squad[0].wantsOut = true;
    const buyers = worldBuyers(unlisted);
    const smallBuyer = buyers.findIndex(club => club.name === 'Incheon United');
    const [bid] = makeBids(unlisted, [0, (smallBuyer + 0.5) / buyers.length, 0]);
    expect(bid).toMatchObject({ club: 'Incheon United', fromListing: true });
    const [counter] = withDraws([0], () => rejectBid(unlisted, player.id)).incomingBids ?? [];
    expect(counter.status).toBe('improved');
    expect(counter.offer).toBeGreaterThan(bid.offer);
  });
});
