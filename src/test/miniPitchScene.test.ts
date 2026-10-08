/* Round 1046: the little pitch's scene. Which side scored, when, and whether
   it was his come from the game's events; everything else is fixed places.
   These tests pin the places, the ring's rules at both edges of his time on
   the pitch, and that no figure is ever cut by the box. */
import { describe, expect, it } from 'vitest';
import { ACTION_SPAN } from '@/components/pitch-motion';
import { PITCH_WINDOW, goalEvent, goalFrame, goalScene, goalsOf, type PitchFig, type PitchGoal } from '@/components/season-centre/MiniPitch';
import type { SeasonEvent } from '@/lib/season/core';

const goal = (o: Partial<PitchGoal> = {}): PitchGoal => ({ key: '7|40|us|0', min: 40, side: 'us', mine: false, assist: false, ...o });
const ringed = (s: { mine: PitchFig[]; theirs: PitchFig[] }) => [...s.mine, ...s.theirs].filter(p => p.ring).map(p => p.key);

describe('the goals of a game', () => {
  const events: SeasonEvent[] = [
    { min: 12, kind: 'goal', side: 'them', pts: 1 },
    { min: 30, kind: 'yellow', side: 'us', mine: true },
    { min: 40, kind: 'assist', side: 'us', mine: true },
    { min: 40, kind: 'goal', side: 'us', pts: 1 },
    { min: 67, kind: 'goal', side: 'us', mine: true, pts: 1 },
    { min: 67, kind: 'goal', side: 'us', pts: 1 },
    { min: 88, kind: 'goal', side: 'them', pts: 1 },
  ];
  it('keeps only goals, in order, with whose they were', () => {
    expect(goalsOf(7, events)).toEqual([
      { key: '7|12|them|0', min: 12, side: 'them', mine: false, assist: false },
      { key: '7|40|us|0', min: 40, side: 'us', mine: false, assist: true },
      { key: '7|67|us|0', min: 67, side: 'us', mine: true, assist: false },
      { key: '7|67|us|1', min: 67, side: 'us', mine: false, assist: false },
      { key: '7|88|them|0', min: 88, side: 'them', mine: false, assist: false },
    ]);
  });
  it('gives the same keys to the same goals in a new array, whatever sits between them', () => {
    const again = [{ min: 5, kind: 'on', side: 'us', mine: true } as SeasonEvent, ...events.map(e => ({ ...e }))];
    expect(goalsOf(7, again).map(g => g.key)).toEqual(goalsOf(7, events).map(g => g.key));
  });
  it('does not call a goal against, or his own goal, an assist', () => {
    const odd: SeasonEvent[] = [{ min: 50, kind: 'assist', side: 'us', mine: true }, { min: 50, kind: 'goal', side: 'them', pts: 1 }, { min: 60, kind: 'assist', side: 'us', mine: true }, { min: 60, kind: 'goal', side: 'us', mine: true, pts: 1 }];
    expect(goalsOf(1, odd).map(g => g.assist)).toEqual([false, false]);
  });
});

describe('the scene of a goal', () => {
  it('his club scores at the top: four attackers, a keeper and two defenders, nobody named', () => {
    const s = goalScene(goal(), 'ATT', 1, 90);
    expect(s.mine.map(p => [p.key, p.x, p.y, p.keeper])).toEqual([['a0', 50, 28, false], ['a1', 34, 30, false], ['a2', 66, 29, false], ['a3', 50, 33, false]]);
    expect(s.theirs.map(p => [p.key, p.x, p.y, p.keeper])).toEqual([['k', 50, 7, true], ['d0', 42, 16, false], ['d1', 58, 15, false]]);
    expect(s.holderKey).toBe('a0');
    expect([...s.mine, ...s.theirs].every(p => p.name === undefined)).toBe(true);
  });
  it('they score at the bottom: the other set of places, his club defending', () => {
    const s = goalScene(goal({ side: 'them' }), 'DEF', 1, 90);
    expect(s.theirs.map(p => [p.key, p.x, p.y, p.keeper])).toEqual([['a0', 50, 72, false], ['a1', 34, 71, false], ['a2', 66, 71.5, false], ['a3', 58, 78, false]]);
    expect(s.mine.map(p => [p.key, p.x, p.y, p.keeper])).toEqual([['k', 50, 93, true], ['d0', 42, 84, false], ['d1', 58, 85, false]]);
  });
  it('before the first goal his club stands at the top, nobody ringed', () => {
    const s = goalScene(null, 'ATT', 1, 90);
    expect(s.mine).toHaveLength(4);
    expect(ringed(s)).toEqual([]);
    expect(goalFrame(null, 'ATT', 1, 90, 0).phase).toBe('idle');
  });
});

describe('who wears the ring', () => {
  it('the striker on his goal, the man beside the striker on his assist', () => {
    expect(ringed(goalScene(goal({ mine: true }), 'ATT', 1, 90))).toEqual(['a0']);
    expect(ringed(goalScene(goal({ mine: true }), 'DEF', 1, 90))).toEqual(['a0']);
    expect(ringed(goalScene(goal({ assist: true }), 'DEF', 1, 90))).toEqual(['a3']);
  });
  it('on a team mate\'s goal, an attacker is in the picture and a defender or a keeper is not', () => {
    expect(ringed(goalScene(goal(), 'ATT', 1, 90))).toEqual(['a3']);
    expect(ringed(goalScene(goal(), 'DEF', 1, 90))).toEqual([]);
    expect(ringed(goalScene(goal(), 'GK', 1, 90))).toEqual([]);
  });
  it('on a goal against, the keeper or the first defender, and never an attacker', () => {
    expect(ringed(goalScene(goal({ side: 'them' }), 'GK', 1, 90))).toEqual(['k']);
    expect(ringed(goalScene(goal({ side: 'them' }), 'DEF', 1, 90))).toEqual(['d0']);
    expect(ringed(goalScene(goal({ side: 'them' }), 'ATT', 1, 90))).toEqual([]);
  });
  it('nobody when he was not on the pitch in that minute, both edges inside', () => {
    const g = goal({ mine: true, min: 60 });
    expect(ringed(goalScene(g, 'ATT', 60, 90))).toEqual(['a0']);
    expect(ringed(goalScene(g, 'ATT', 61, 90))).toEqual([]);
    expect(ringed(goalScene(g, 'ATT', 1, 60))).toEqual(['a0']);
    expect(ringed(goalScene(g, 'ATT', 1, 59))).toEqual([]);
    /* sent off in the 60th: his window ends at 59, so the goal conceded in the 60th is not on him */
    expect(ringed(goalScene(goal({ side: 'them', min: 60 }), 'DEF', 1, 59))).toEqual([]);
    expect(ringed(goalScene(g, null, 1, 90))).toEqual([]);
  });
  it('never more than one figure', () => {
    for (const side of ['us', 'them'] as const) for (const mine of [true, false]) for (const assist of [true, false]) for (const role of ['GK', 'DEF', 'ATT', null] as const) {
      expect(ringed(goalScene(goal({ side, mine: mine && side === 'us', assist: assist && side === 'us' }), role, 1, 90)).length).toBeLessThanOrEqual(1);
    }
  });
});

describe('a goal, frame by frame', () => {
  it('plants, flies, lands in the right net, and the last frame stays', () => {
    const mine = goal({ mine: true });
    expect(goalFrame(mine, 'ATT', 1, 90, 0).phase).toBe('plant');
    expect(goalFrame(mine, 'ATT', 1, 90, 0.5).phase).toBe('flight');
    const end = goalFrame(mine, 'ATT', 1, 90, ACTION_SPAN);
    expect(end.phase).toBe('net');
    expect(end.net).toBe('opp');
    expect(goalFrame(mine, 'ATT', 1, 90, 99)).toEqual(end);
    expect(goalFrame(goal({ side: 'them' }), 'ATT', 1, 90, ACTION_SPAN).net).toBe('me');
    expect(end.ball.y).toBeLessThan(3);
    expect(goalFrame(goal({ side: 'them' }), 'ATT', 1, 90, ACTION_SPAN).ball.y).toBeGreaterThan(97);
  });
  it('the scorer is the first attacker, never a keeper, and he keeps his ring through the move', () => {
    for (const side of ['us', 'them'] as const) for (let t = 0; t <= ACTION_SPAN + 0.001; t += 0.05) {
      const f = goalFrame(goal({ side, mine: side === 'us' }), 'ATT', 1, 90, t);
      const attackers = side === 'us' ? f.mine : f.theirs;
      const striker = attackers.find(p => p.key === 'a0')!;
      expect(striker.keeper).toBe(false);
      if (t < 0.2) expect(f.holderKey).toBe('a0');
      expect(ringed(f)).toEqual(side === 'us' ? ['a0'] : []);
    }
  });
  it('the event the pitch part reads names a side, a minute and nobody', () => {
    expect(goalEvent(goal({ min: 67, side: 'them' }))).toEqual({ minute: 67, side: 'opp', kind: 'goal', text: '' });
    expect(goalEvent(goal({ min: 12 }))).toEqual({ minute: 12, side: 'me', kind: 'goal', text: '' });
  });
  it('no figure and no ball leaves the box at any frame, on a 320 phone, a 390 phone and the desktop stage', () => {
    /* a figure is drawn 24 px above its spot and 8 px below, 12 px either side; the box shows PITCH_WINDOW of a 3 by 4 pitch */
    let worst = Infinity;
    for (const width of [296, 366, 448]) {
      const H = width * 4 / 3;
      for (const side of ['us', 'them'] as const) for (const minute of [40, 41]) {
        const [top, bottom] = side === 'us' ? [0, PITCH_WINDOW * H] : [(1 - PITCH_WINDOW) * H, H];
        for (let t = 0; t <= ACTION_SPAN + 0.001; t += 0.025) {
          const f = goalFrame(goal({ side, min: minute, mine: side === 'us' }), 'GK', 1, 90, t);
          for (const p of [...f.mine, ...f.theirs]) {
            const y = p.y / 100 * H, x = p.x / 100 * width;
            const room = Math.min(y - 24 - top, bottom - (y + 8), x - 12, width - 12 - x);
            worst = Math.min(worst, room);
            expect(room, `${side} at ${t.toFixed(3)}s, ${p.key}, box ${width}`).toBeGreaterThanOrEqual(0);
          }
          const by = f.ball.y / 100 * H;
          expect(by >= top && by <= bottom, `ball ${side} at ${t.toFixed(3)}s, box ${width}`).toBe(true);
        }
      }
    }
    /* the tightest figure still has room (measured 3.6 px on the 320 phone: the keeper's head at the top) */
    expect(worst).toBeGreaterThanOrEqual(1);
  });
});
