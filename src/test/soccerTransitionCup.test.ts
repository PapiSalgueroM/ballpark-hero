import { describe, expect, it } from 'vitest';
import { NEXT_TIE, coverDistance, currentCounter, playCupMove, readCup, replayCup, startCup } from '@/lib/soccerTransitionCup';

const quarterAttack = [1, 3, 4];
const kept = [...quarterAttack, 13, 12];
const spent = [...quarterAttack, 14, 12];
const semiAttack = [1, 0, 1, 4];
const finalAttack = [1, 0, 4, 3, 4];
const winningDraw = [...kept, NEXT_TIE, ...semiAttack, 11, 12, NEXT_TIE, ...finalAttack, 18, 13];

describe('Transition Cup', () => {
  it('plays the entire fixed draw and reopens every decision, including a finished cup', () => {
    const end = replayCup(winningDraw)!;
    expect(end.phase).toBe('result');
    expect(end.receipts).toEqual([0, 1, 2].map(round => ({ round, scored: true, conceded: false, advanced: true })));
    expect(end.recovery).toBe(true);
    for (let i = 0; i <= winningDraw.length; i++) {
      const path = winningDraw.slice(0, i);
      const read = readCup(JSON.stringify(path));
      expect(read).toEqual(path);
      expect(replayCup(read!)).toEqual(replayCup(path));
      expect(replayCup([...read!, ...winningDraw.slice(i)])).toEqual(end);
    }
    expect(playCupMove(end, NEXT_TIE)).toBeNull();
  });

  it('a recovery conserved in one tie buys an interception unavailable in the next', () => {
    const suffix = [NEXT_TIE, ...semiAttack, 10, 11];
    const fresh = replayCup([...kept, ...suffix])!, tired = replayCup([...spent, ...suffix])!;
    expect(fresh.receipts).toEqual(tired.receipts);
    expect(fresh.defender).toBe(tired.defender);
    expect(currentCounter(fresh)).toEqual(currentCounter(tired));
    expect(coverDistance(fresh.defender, 17)).toBe(2);
    expect(playCupMove(fresh, 17)?.receipts[1]).toEqual({ round: 1, scored: true, conceded: false, advanced: true });
    expect(playCupMove(tired, 17)).toBeNull();
    const available = Array.from({ length: 25 }, (_, i) => playCupMove(tired, i)).filter(Boolean);
    expect(available).toHaveLength(5);
    expect(available.every(next => next!.phase === 'tiebreak')).toBe(true);
  });

  it.each([
    [[3, 13, 12], false],
    [[...quarterAttack, 14, 14, 14, 14], true],
  ] as const)('plays a decisive counter for a level score without awarding a goal for an interception', (path, scored) => {
    const tied = replayCup(path)!;
    expect(tied.phase).toBe('tiebreak');
    expect(tied.receipts).toEqual([]);
    const won = replayCup([...path, 10, 11])!, lost = replayCup([...path, 10, 10, 10])!;
    expect(won.receipts[0]).toEqual({ round: 0, scored, conceded: scored, decidingStop: true, advanced: true });
    expect(lost.receipts[0]).toEqual({ round: 0, scored, conceded: scored, decidingStop: false, advanced: false });
    expect(playCupMove(won, NEXT_TIE)?.round).toBe(1);
    expect(playCupMove(lost, NEXT_TIE)).toBeNull();
  });

  it('refuses impossible passes, diagonal one-step moves, skipped ties and fabricated result records', () => {
    expect(playCupMove(startCup(), NEXT_TIE)).toBeNull();
    const reply = replayCup(quarterAttack)!;
    expect(coverDistance(14, 8)).toBe(2);
    expect(playCupMove(reply, 8)?.recovery).toBe(false);
    expect(playCupMove(reply, 5)).toBeNull();
    for (const raw of [null, '{', '{}', '[-1]', '[1.5]', '[false]', '[25]', '[0]', JSON.stringify([...winningDraw, 25]), JSON.stringify(Array(46).fill(1))]) {
      expect(readCup(raw)).toBeNull();
    }
  });
});
