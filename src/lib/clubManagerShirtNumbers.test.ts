import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCareer, loanOutPlayer, playNextEntry, recallLoanedPlayer, releasePlayer, SAVE_KEY, saveCareer,
  startCareer, startNextSeason, type CareerState, type CMPlayer } from '@/lib/clubManager';
import { assignShirtNumber } from '@/lib/clubManagerShirtNumbers';
import { squadNumbers } from '@/lib/clubManagerLivePresentation';
import { saveFence } from '@/lib/saveFence';

function career(): CareerState {
  return startCareer('Arsenal');
}

function withNumber(state: CareerState, player: CMPlayer, number: number, swapWith?: string): CareerState {
  const next = assignShirtNumber(state, player.id, number, swapWith);
  expect(next).not.toBeNull();
  return next!;
}

describe('Club Manager shirt numbers', () => {
  beforeEach(() => {
    saveFence.release(SAVE_KEY);
    localStorage.clear();
    vi.spyOn(Math, 'random').mockReturnValue(0.6);
  });
  afterEach(() => { vi.restoreAllMocks(); saveFence.release(SAVE_KEY); });

  it('assigns any squad member, persists it and swaps only after the current holder is confirmed', () => {
    const before = career();
    const [starter, reserve] = [before.squad.find(p => before.xiIds.includes(p.id))!, before.squad.find(p => !before.xiIds.includes(p.id))!];
    expect(before.squad.every(p => p.shirtNumber === undefined)).toBe(true);
    const first = withNumber(before, starter, 8);
    expect(assignShirtNumber(first, reserve.id, 8)).toBeNull();
    expect(assignShirtNumber(first, reserve.id, 8, 'wrong-player')).toBeNull();
    const second = withNumber(first, reserve, 99);
    const next = withNumber(second, reserve, 8, starter.id);
    expect(next.squad.find(p => p.id === starter.id)?.shirtNumber).toBe(99);
    expect(next.squad.find(p => p.id === reserve.id)?.shirtNumber).toBe(8);
    expect(second.squad.find(p => p.id === reserve.id)?.shirtNumber).toBe(99);
    expect(next.xiIds).toEqual(before.xiIds);
    expect(next.week).toBe(before.week);
    expect(saveCareer(next)).toBe(true);
    expect(loadCareer()?.squad).toEqual(next.squad);
    const cleared = assignShirtNumber(next, reserve.id, null);
    expect(cleared?.squad.find(p => p.id === reserve.id)?.shirtNumber).toBeUndefined();
  });

  it('keeps legacy match numbers by slot, and honours assigned ones without collisions', () => {
    const before = career();
    const kickoff = playNextEntry(before);
    const live = kickoff.state.live!;
    expect(live.startXi).toHaveLength(11);
    const startId = live.startXi[0];
    expect(squadNumbers(before, live).get(startId)).toBe(1);
    const reserve = before.squad.find(p => !live.startXi.includes(p.id))!;
    const withReserve = withNumber(before, reserve, 1);
    const numbers = squadNumbers(withReserve, live);
    expect(numbers.get(reserve.id)).toBe(1);
    expect(numbers.size).toBe(before.squad.length);
    expect(new Set(numbers.values()).size).toBe(numbers.size);
    expect(assignShirtNumber(kickoff.state, reserve.id, 77)).toBeNull();
  });

  it('rejects invalid numbers, stale confirmations and players outside the squad', () => {
    const before = career();
    for (const number of [0, 100, 1.5, NaN]) expect(assignShirtNumber(before, before.squad[0].id, number)).toBeNull();
    expect(assignShirtNumber(before, 'unknown', 22)).toBeNull();
    expect(assignShirtNumber(before, before.squad[0].id, 22, before.squad[1].id)).toBeNull();
  });

  it('reserves a number during a loan, frees it after release and keeps it across a season at the same club', () => {
    const before = career();
    const player = before.squad.find(p => p.position !== 'GK' && (p.contractYears ?? 0) > 1 && p.age < 24)!;
    const other = before.squad.find(p => player.id !== p.id)!;
    const numbered = withNumber(before, player, 19);
    const loaned = loanOutPlayer(numbered, player.id, 'Brentford')!;
    expect(loaned.loanedOut?.[0]?.player.shirtNumber).toBe(19);
    expect(assignShirtNumber(loaned, other.id, 19, player.id)).toBeNull();
    expect(recallLoanedPlayer(loaned, player.id)?.squad.find(p => p.id === player.id)?.shirtNumber).toBe(19);
    const sameClub = startNextSeason(numbered);
    expect(sameClub.squad.find(p => p.id === player.id)?.shirtNumber).toBe(19);
    const moved = startNextSeason(numbered, 'Brentford');
    expect(moved.clubName).toBe('Brentford');
    expect(moved.squad.every(p => p.shirtNumber === undefined)).toBe(true);
    const released = releasePlayer(numbered, player.id)!;
    expect(withNumber(released, other, 19).squad.find(p => p.id === other.id)?.shirtNumber).toBe(19);
  });
});
