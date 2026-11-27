import { describe, expect, it } from 'vitest';
import { playClosing, readClosing, startClosing, type ClosingCall, type ClosingState } from '@/lib/nbaClosingTime';

const opener: ClosingCall[] = ['rim', 'shoot', 'deny-rim', 'corner', 'shoot', 'deny-corner', 'hold'];
const lead: ClosingCall[] = ['deny-corner', 'hold'];
const comeback: ClosingCall[] = ['foul', 'timeout', 'corner', 'shoot', 'deny-rim'];
const sweep: ClosingCall[] = [...opener, 'next', ...lead, 'next', ...comeback];

function play(from: ClosingState, calls: ClosingCall[]) {
  return calls.reduce((s, call) => {
    const next = playClosing(s, call);
    expect(next, call).not.toBeNull();
    return next!;
  }, from);
}

describe('NBA Closing Time', () => {
  it('plays both ends in three different endings, restoring the exact ball, coverage and clocks after every decision', () => {
    const expected = play(startClosing(), sweep);
    expect(expected.receipts).toEqual([
      { game: 0, home: 99, away: 96, result: 'Win' },
      { game: 1, home: 88, away: 86, result: 'Win' },
      { game: 2, home: 104, away: 103, result: 'Win' },
    ]);
    for (let n = 0; n <= sweep.length; n++) {
      const save = readClosing(JSON.stringify(sweep.slice(0, n)))!;
      expect(save.state).toEqual(play(startClosing(), sweep.slice(0, n)));
      expect(play(save.state, sweep.slice(n))).toEqual(expected);
    }
    expect(playClosing(expected, 'next')).toBeNull();
  });

  it('a quick two creates a second trip, and the same draw can finish tied or with a loss', () => {
    const tied = play(startClosing(), ['rim', 'shoot', 'deny-rim']);
    expect(tied).toMatchObject({ home: 96, away: 96, clock: 23, side: 'offense' });
    expect(play(tied, ['hold']).receipts[0].result).toBe('Overtime earned');
    expect(play(tied, ['corner', 'shoot', 'deny-corner', 'hold']).receipts[0].result).toBe('Win');
    expect(play(startClosing(), ['hold', 'shoot', 'deny-rim']).receipts[0]).toMatchObject({ home: 94, away: 96, result: 'Loss' });
  });

  it('covering different targets changes an actual three on the same possession', () => {
    const start = startClosing(1);
    const stop = play(start, ['deny-corner']), basket = play(start, ['deny-rim']);
    expect(stop.clock).toBe(basket.clock);
    expect(stop.home).toBe(basket.home);
    expect(stop.away).toBe(86);
    expect(basket.away).toBe(89);
    expect(play(stop, ['hold']).receipts[0].result).toBe('Win');
    expect(play(basket, ['hold']).receipts[0].result).toBe('Loss');
  });

  it('a four-second trap forces a turnover only when the opponent lacks a passing outlet', () => {
    const isolated = play(startClosing(), ['rim', 'shoot']);
    const steal = play(isolated, ['trap']);
    expect(steal).toMatchObject({ home: 96, away: 96, clock: 26, side: 'offense' });
    expect(play(isolated, ['deny-rim']).clock).toBe(23);
    const supported = startClosing(1);
    const beaten = play(supported, ['trap']);
    expect(beaten).toMatchObject({ home: 88, away: 89, clock: 17, side: 'offense' });
    expect(play(supported, ['deny-corner']).away).toBe(86);
  });

  it('requires a real timeout and a made shot to reverse the seven-second deficit', () => {
    const start = startClosing(2);
    expect(play(start, ['deny-rim']).receipts[0]).toMatchObject({ home: 101, away: 102, result: 'Loss' });
    const foul = play(start, ['foul']);
    expect(foul).toMatchObject({ home: 101, away: 103, clock: 5, shotClock: 5 });
    const timeout = play(foul, ['timeout']);
    expect(timeout).toMatchObject({ clock: 5, shotClock: 5, timeout: false });
    expect(playClosing(timeout, 'timeout')).toBeNull();
    expect(play(foul, ['corner']).receipts[0]).toMatchObject({ home: 101, away: 103, result: 'Loss' });
    expect(play(timeout, ['corner', 'shoot', 'deny-rim']).receipts[0]).toMatchObject({ home: 104, away: 103, result: 'Win' });
  });

  it('draws help on a covered pass, enforces the shot clock and rejects impossible saved possessions', () => {
    const swung = play(startClosing(), ['corner']);
    expect(swung).toMatchObject({ ball: 'corner', open: 'wing', clock: 33, shotClock: 18 });
    expect(play(swung, ['wing', 'shoot']).home).toBe(97);
    expect(play(swung, ['shoot']).home).toBe(94);
    const violation = play(startClosing(), ['hold', 'corner', 'wing']);
    expect(violation).toMatchObject({ clock: 15, side: 'defense', home: 94, away: 96 });
    expect(violation.log[violation.log.length - 1]).toMatch(/Shot clock expired/);
    for (const raw of ['{}', 'null', 'false', '[0]', '["hold",{}]', '["timeout","timeout"]', '["deny-rim"]', '["next"]', JSON.stringify([...sweep, 'next'])]) {
      expect(readClosing(raw)).toBeNull();
    }
  });
});
