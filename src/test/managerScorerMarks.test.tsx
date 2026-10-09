/* Round 1146: the mark after a goal, on every screen that lists a scorer.

   Round 1163 put (P) on the report card's two scorer lists and holds it there
   (managerPenaltyMarkers.test.tsx). This file holds the rest: the one function
   every surface reads, the report's timeline, and the live screen's goal line
   (the pill, the goal card and the list beside the pitch print the same runs).
   Every fixture name is invented; the marks are read off the flags the engine
   records, never inferred. */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { scorerLine, scorerMark } from '@/lib/clubManagerScorerLine';
import { timelineRows } from '@/lib/clubManagerMatchCentre';
import { MatchTimeline } from '@/components/club-manager/MatchTimeline';
import { goalSegs } from '@/components/club-manager/LiveSimScreen';
import type { MatchDetail, TimelineEvent } from '@/lib/clubManager';

vi.mock('@/components/game/VictoryMoment', () => ({ default: () => null }));
afterEach(cleanup);

const detail = (timeline: TimelineEvent[]): MatchDetail => ({
  stats: { possession: 50, shots: 4, oppShots: 4, onTarget: 2, oppOnTarget: 2, xg: 1, oppXg: 1, corners: 1, oppCorners: 1, fouls: 3, oppFouls: 3 },
  cards: [], injuries: [], subs: [], timeline, momentum: [0, 0, 0, 0, 0, 0, 0, 0, 0], myRatings: [], oppBest: null,
});

describe('the one function every scorer listing reads', () => {
  it('marks a penalty and nothing else', () => {
    expect(scorerMark({ penalty: true })).toBe(' (P)');
    expect(scorerMark({})).toBe('');
    expect(scorerMark({ penalty: false })).toBe('');
    /* a direct free kick is not from the spot */
    expect(scorerMark({ freeKick: true } as { penalty?: boolean })).toBe('');
  });

  it('prints the name, the minute as the scoreboard writes it, then the mark', () => {
    expect(scorerLine({ name: 'Spot taker', minute: 45, plus: 2, penalty: true })).toBe("Spot taker 45+2' (P)");
    expect(scorerLine({ name: 'Open play scorer', minute: 63 })).toBe("Open play scorer 63'");
    expect(scorerLine({ name: 'Late one', minute: 90, plus: 5 })).toBe("Late one 90+5'");
  });
});

describe('the report timeline', () => {
  const timeline: TimelineEvent[] = [
    { minute: 0, side: 'none', kind: 'kickoff', text: 'Kick off' },
    { minute: 20, side: 'me', kind: 'penalty', text: 'Spot taker' },
    { minute: 20, side: 'me', kind: 'goal', text: 'Spot taker', penalty: true },
    { minute: 31, side: 'me', kind: 'goal', text: 'Open play scorer (assist: Pass maker)' },
    { minute: 58, side: 'opp', kind: 'goal', text: 'Their free kick man', freeKick: true },
    { minute: 77, side: 'opp', kind: 'save', text: 'Their spot taker', penalty: true },
    { minute: 90, plus: 3, side: 'opp', kind: 'goal', text: 'Their spot taker', penalty: true },
  ];

  it('carries the mark on a goal from the spot, on either side, and on no other row', () => {
    const rows = timelineRows(detail(timeline), 'all');
    const goals = rows.filter(r => r.kind === 'goal');
    expect(goals.map(r => [r.side, r.name, r.clock, r.mark ?? ''])).toEqual([
      ['me', 'Spot taker', "20'", ' (P)'],
      ['me', 'Open play scorer', "31'", ''],
      ['opp', 'Their free kick man', "58'", ''],
      ['opp', 'Their spot taker', "90+3'", ' (P)'],
    ]);
    /* a saved penalty and the award row are not goals: neither is marked as one */
    expect(rows.filter(r => r.kind !== 'goal').every(r => r.mark === undefined)).toBe(true);
  });

  it('prints it after the name on the screen, in both views', () => {
    const { container, getByRole } = render(<MatchTimeline detail={detail(timeline)} clubName="Home Club" opponent="Away Club" />);
    const goalsOnScreen = () => [...container.querySelectorAll('[data-cm-tl="goal"] [data-cm-tl-entry]')].map(n => n.textContent);
    const want = ['⚽ Goal, penalty: Spot taker (P)', '⚽ Goal: Open play scorer 🅰️ Pass maker', '⚽ Goal, free kick: Their free kick man', '⚽ Goal, penalty: Their spot taker (P)'];
    expect(goalsOnScreen()).toEqual(want);
    const toggle = container.querySelector('[data-cm-tl-toggle]');
    if (toggle) { (toggle as HTMLButtonElement).click(); }
    expect(getByRole('list')).toBeTruthy();
    expect(goalsOnScreen()).toEqual(want);
    /* the saved penalty says so in words and wears no goal mark */
    expect(container.textContent).not.toContain('Penalty saved: Their spot taker (P)');
  });

  it('leaves a report written before the flag existed bare', () => {
    const old: TimelineEvent[] = [{ minute: 12, side: 'me', kind: 'goal', text: 'Legacy scorer' }, { minute: 120, side: 'me', kind: 'pens', text: 'Won the shootout' }];
    const rows = timelineRows(detail(old), 'all');
    expect(rows.every(r => r.mark === undefined)).toBe(true);
  });
});

describe('the live screen goal line', () => {
  const text = (segs: { t: string }[]) => segs.map(s => s.t).join('');

  it('ends on the minute and the mark, the way the report prints the same goal', () => {
    const who = { t: 'Spot taker' };
    const at = { minute: 90, plus: 4 };
    expect(text(goalSegs('GOAL! Penalty, ', who, at, { penalty: true }))).toBe("GOAL! Penalty, Spot taker 90+4' (P)");
    expect(text(goalSegs('GOAL! Penalty, ', who, at, { penalty: true })).endsWith(scorerLine({ name: who.t, ...at, penalty: true }))).toBe(true);
    expect(text(goalSegs('GOAL! ', { t: 'Open play scorer' }, { minute: 12 }, {}))).toBe("GOAL! Open play scorer 12'");
    expect(text(goalSegs('GOAL! Free kick, ', { t: 'Free kick man' }, { minute: 70 }, { penalty: undefined }))).toBe("GOAL! Free kick, Free kick man 70'");
  });

  it('keeps the minute as its own run, so the list beside the pitch can lead with it and keep the mark', () => {
    const segs = goalSegs('GOAL! Penalty, ', { t: 'Spot taker' }, { minute: 53 }, { penalty: true });
    /* the list prints the minute in front and drops that one run (LiveSimScreen, the banner effect) */
    expect(text(segs.filter(sg => sg.t !== " 53'"))).toBe('GOAL! Penalty, Spot taker (P)');
    /* a made up opponent keeps his tag on his own run */
    expect(goalSegs('GOAL! ', { t: 'Made up man', gen: true }, { minute: 9 }, {})[1]).toEqual({ t: 'Made up man', gen: true });
  });
});
