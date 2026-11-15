import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  answerMessage, benchFor, changeLive, loadCareer, playNextEntry, resumeMatch, startCareer, startSecondHalf,
  type CareerState,
} from './clubManager';

function fixture() {
  const career = startCareer('Everton');
  const out = career.squad.find(player => player.position !== 'GK' && career.xiIds.includes(player.id))!;
  const reserve = benchFor(career, out.id).find(player => player.position === out.position)!;
  career.inbox = [{
    id: 'fixture-start-request', playerId: reserve.id, playerName: reserve.name, kind: 'startMe', week: career.week,
    text: 'The player is asking for a place in the starting lineup.',
    options: [{ label: 'Promise him a start', effect: 'promise' }],
  }];
  const promised = answerMessage(career, 'fixture-start-request', 0);
  expect(promised.promisedStarts).toEqual([reserve.id]);
  return { promised, outId: out.id, reserveId: reserve.id };
}

function reload(career: CareerState) {
  const saved = loadCareer(JSON.stringify(career));
  expect(saved).not.toBeNull();
  return saved!;
}

function kickOff(career: CareerState) {
  const match = playNextEntry(reload(career));
  expect(match.kind).toBe('halftime');
  return match.state;
}

function brokenPromise(career: CareerState, playerId: string) {
  return career.inbox?.find(message => message.playerId === playerId && message.text.includes('You promised '));
}

describe('Club Manager promises to start a player', () => {
  beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0.62));
  afterEach(() => vi.restoreAllMocks());

  it('records a broken promise after an 89th-minute appearance and a reload', () => {
    const { promised, outId, reserveId } = fixture();
    const firstHalf = kickOff(promised);
    expect(firstHalf.live?.startXi).not.toContain(reserveId);
    const secondHalf = startSecondHalf(firstHalf)!;
    const cameo = changeLive(secondHalf, 89, { kind: 'sub', outId, inId: reserveId });
    expect(cameo?.live?.subs?.at(-1)).toMatchObject({ minute: 89, onId: reserveId });
    const saved = reload(cameo!);
    expect(saved.promisedStarts).toEqual([reserveId]);
    const result = resumeMatch(saved);
    const control = resumeMatch({ ...saved, promisedStarts: [] });
    expect(result.kind).toBe('match');
    expect(control.kind).toBe('match');
    if (result.kind !== 'match' || control.kind !== 'match') throw new Error('The match did not settle');
    expect(result.report.detail?.subs).toContainEqual(expect.objectContaining({ minute: 89 }));
    expect([result.report.homeGoals, result.report.awayGoals]).toEqual([control.report.homeGoals, control.report.awayGoals]);
    const settled = result.state;
    const played = settled.squad.find(player => player.id === reserveId)!;
    const minutesCredit = played.lastTen?.at(-1);
    expect(minutesCredit).toBeGreaterThan(0);
    expect(minutesCredit).toBeLessThan(1);
    expect(settled.promisedStarts).toEqual([]);
    expect(brokenPromise(settled, reserveId)?.resolved).toBe('He will remember this.');
    expect(played.morale).toBeLessThan(control.state.squad.find(player => player.id === reserveId)!.morale - 10);
    expect(brokenPromise(reload(settled), reserveId)?.resolved).toBe('He will remember this.');
  });

  it('honors the promise when the player is in the actual starting eleven', () => {
    const { promised, outId, reserveId } = fixture();
    const picked = { ...promised, xiIds: promised.xiIds.map(id => id === outId ? reserveId : id) };
    const match = kickOff(picked);
    expect(match.live?.startXi).toContain(reserveId);
    const settled = resumeMatch(match).state;
    expect(settled.squad.find(player => player.id === reserveId)?.lastTen?.at(-1)).toBe(1);
    expect(settled.promisedStarts).toEqual([]);
    expect(brokenPromise(settled, reserveId)).toBeUndefined();
  });

  it.each(['injuryWeeks', 'suspendedMatches'] as const)('keeps the promise pending when %s makes the player unavailable at kickoff', unavailable => {
    const { promised, reserveId } = fixture();
    const unavailableCareer = { ...promised, squad: promised.squad.map(player => player.id === reserveId ? { ...player, [unavailable]: 2 } : player) };
    const match = kickOff(unavailableCareer);
    expect(match.live?.startXi).not.toContain(reserveId);
    expect(benchFor(match).some(player => player.id === reserveId)).toBe(false);
    const settled = reload(resumeMatch(match).state);
    expect(settled.promisedStarts).toEqual([reserveId]);
    expect(brokenPromise(settled, reserveId)).toBeUndefined();
  });
});
