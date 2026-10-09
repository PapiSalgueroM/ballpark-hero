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
import { cardSegs, goalCardCount, goalScorerSeg, goalSegs } from '@/components/club-manager/LiveSimScreen';
import { MatchReportCard } from '@/components/club-manager/MatchReportCard';
import { liveFeed } from '@/lib/clubManager';
import type { CareerState, LiveMatch, MatchDetail, MatchWeekReport, TimelineEvent } from '@/lib/clubManager';

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

describe('an own goal, on every listing (Round 1146)', () => {
  const text = (segs: { t: string }[]) => segs.map(s => s.t).join('');

  it('is marked (O.G) by the one function, and the own goal decides if a line ever said both', () => {
    expect(scorerMark({ og: true })).toBe(' (O.G)');
    expect(scorerMark({ og: true, penalty: true })).toBe(' (O.G)');
    expect(scorerLine({ name: 'Their centre back', minute: 63, og: true })).toBe("Their centre back 63' (O.G)");
    expect(scorerLine({ name: 'My left back', minute: 90, plus: 2, og: true })).toBe("My left back 90+2' (O.G)");
  });

  it('sits on the report card under the club that got the goal, with the man who put it in and nobody else', () => {
    const report: MatchWeekReport = {
      competition: 'league', compLabel: 'League', home: 'Home Club', away: 'Away Club',
      homeGoals: 2, awayGoals: 1, won: true, drawn: false, decidedBy: 'regular',
      myScorers: [{ name: 'Their centre back', minute: 63, og: true }, { name: 'My striker', minute: 70, assist: 'My winger' }],
      oppScorers: [{ name: 'My left back', minute: 80, og: true, drawn: 'Their striker' }],
      events: [], trophyWon: null, myPosition: 4, confidence: 60, confidenceDelta: 0, otherResults: [],
    };
    const { container } = render(<MatchReportCard report={report} clubName="Home Club" onContinue={() => {}} />);
    const rows = [...container.querySelectorAll('p')].filter(p => (p.textContent ?? '').startsWith('⚽'));
    expect(rows.map(p => p.textContent)).toEqual(["⚽ Their centre back 63' (O.G)", "⚽ My striker 70' · 🅰️ My winger", "⚽ My left back 80' (O.G)"]);
    /* the column a line sits in is the club that got the goal */
    expect(rows[0].parentElement!.firstElementChild!.textContent).toBe('Home Club');
    expect(rows[2].parentElement!.firstElementChild!.textContent).toBe('Away Club');
    /* the man the goal was first drawn for is kept for the engine and never printed */
    expect(container.textContent).not.toContain('Their striker');
  });

  it('wears the mark on the timeline, outside the clipped name, and tags a made up man off the side he plays for', () => {
    const d = detail([
      { minute: 10, side: 'me', kind: 'goal', text: 'Made up back', og: true },
      { minute: 50, side: 'opp', kind: 'goal', text: 'My left back', og: true },
    ]);
    d.oppXi = [{ n: 'Made up back', p: 'CB', r: 70, g: true }];
    const rows = timelineRows(d, 'key');
    expect(rows.map(r => [r.side, r.label, r.name, r.mark, !!r.gen])).toEqual([
      ['me', 'Goal', 'Made up back', ' (O.G)', true],
      ['opp', 'Goal', 'My left back', ' (O.G)', false],
    ]);
    const { container } = render(<MatchTimeline detail={d} clubName="Home Club" opponent="Away Club" />);
    const entries = [...container.querySelectorAll('[data-cm-tl="goal"] [data-cm-tl-entry]')].map(n => n.textContent ?? '');
    expect(entries[0].startsWith('⚽ Goal: Made up back (O.G)')).toBe(true);
    expect(entries[1]).toBe('⚽ Goal: My left back (O.G)');
    /* The mark is its own piece, beside the span that clips, never inside it: on a phone the column is 119 px and
       the ellipsis has to eat the name, not the mark (the round's review saw a row end in a dangling "(..."). */
    const marks = [...container.querySelectorAll('[data-cm-tl="goal"] [data-cm-tl-mark]')];
    expect(marks.map(n => n.textContent)).toEqual([' (O.G)', ' (O.G)']);
    for (const mark of marks) {
      expect(mark.closest('.truncate')).toBeNull();
      expect(mark.className).toContain('shrink-0');
      expect(mark.parentElement!.querySelector('.truncate')!.textContent).not.toContain('(O.G)');
    }
  });

  it('is fed to the live screen as the man who put it in, for the side that got the goal', () => {
    const live = {
      startXi: [], onPitch: [], subsUsed: 0, week: 0, myGoals: 1, oppGoals: 1,
      h1My: [{ id: 'm9', name: 'My striker', minute: 10, og: { n: 'Their centre back' } }, { id: 'm9', name: 'My striker', minute: 30, penalty: true }],
      h1Opp: [{ name: 'My left back', minute: 20, og: true, drawn: 'Their striker' }],
    } as unknown as LiveMatch;
    const goals = liveFeed(live).filter(e => e.kind === 'goal');
    expect(goals.map(e => [e.side, e.text, e.minute, !!e.og, !!e.penalty])).toEqual([
      ['me', 'Their centre back', 10, true, false],
      ['opp', 'My left back', 20, true, false],
      ['me', 'My striker', 30, false, true],
    ]);
    /* the line the pill, the card and the list print */
    expect(text(goalSegs('GOAL! Own goal, ', { t: goals[0].text }, goals[0], { og: goals[0].og }))).toBe("GOAL! Own goal, Their centre back 10' (O.G)");
    /* an own goal is nobody's goal: its card counts nothing, and it never counts toward another man's */
    const career = { squad: [{ name: 'My striker', seasonGoals: 4 }, { name: 'My left back', seasonGoals: 0 }] } as unknown as CareerState;
    expect(goalCardCount(career, goals, goals[0])).toEqual({ nth: 1, season: null });
    expect(goalCardCount(career, goals, goals[1])).toEqual({ nth: 1, season: null });
    expect(goalCardCount(career, goals, goals[2])).toEqual({ nth: 1, season: 5 });
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
    const want = ['⚽ Goal: Spot taker (P)', '⚽ Goal: Open play scorer 🅰️ Pass maker', '⚽ Goal, free kick: Their free kick man', '⚽ Goal: Their spot taker (P)'];
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

/* Round 1146, the review's fixes: the goal card holds 296 px of text at every width, and the long form of a
   marked goal did not fit an ordinary name with its minute and mark, so the ellipsis ate the mark. */
describe('the goal card line', () => {
  const text = (segs: { t: string }[]) => segs.map(s => s.t).join('');

  it('drops the words the mark already says, and only for a goal that wears a mark', () => {
    expect(text(cardSegs(goalSegs('GOAL! Own goal, ', { t: 'Their centre back' }, { minute: 12 }, { og: true })))).toBe("GOAL! Their centre back 12' (O.G)");
    expect(text(cardSegs(goalSegs('GOAL! Penalty, ', { t: 'Spot taker' }, { minute: 45, plus: 3 }, { penalty: true })))).toBe("GOAL! Spot taker 45+3' (P)");
    /* no mark, nothing dropped: a free kick still says so in words, an open play goal reads as it did */
    expect(text(cardSegs(goalSegs('GOAL! Free kick, ', { t: 'Free kick man' }, { minute: 70 }, {})))).toBe("GOAL! Free kick, Free kick man 70'");
    expect(text(cardSegs(goalSegs('GOAL! ', { t: 'Open play scorer' }, { minute: 12 }, {})))).toBe("GOAL! Open play scorer 12'");
  });

  it('keeps the scorer as the second run with his tag, so the card can let the name alone give way', () => {
    const segs = cardSegs(goalSegs('GOAL! Own goal, ', { t: 'Made up back', gen: true }, { minute: 5 }, { og: true }));
    expect(segs.map(sg => sg.t)).toEqual(['GOAL! ', 'Made up back', " 5'", ' (O.G)']);
    expect(segs[1]).toEqual({ t: 'Made up back', gen: true });
  });

  it('looks the man behind an own goal up on the side he plays for, which is the other one', () => {
    const asked: [string, string][] = [];
    const named = (side: 'me' | 'opp', name: string) => { asked.push([side, name]); return { t: name, ...(side === 'opp' ? { gen: true } : {}) }; };
    const who = { t: 'The man it was drawn for' };
    /* a goal for me that one of theirs put in: he is looked up among THEIRS, where a made up man is tagged */
    expect(goalScorerSeg({ og: true, text: 'Their made up back' }, 'me', who, named)).toEqual({ t: 'Their made up back', gen: true });
    /* a goal for them that one of mine put in: looked up among mine */
    expect(goalScorerSeg({ og: true, text: 'My left back' }, 'opp', who, named)).toEqual({ t: 'My left back' });
    expect(asked).toEqual([['opp', 'Their made up back'], ['me', 'My left back']]);
    /* an ordinary goal is not looked up again: the line keeps the scorer it had */
    expect(goalScorerSeg({ text: 'Open play scorer' }, 'me', who, named)).toBe(who);
    expect(asked.length).toBe(2);
  });
});

describe('a made up man behind an own goal', () => {
  it('wears MADE UP on the report card, beside his line, and a real man does not', () => {
    const report: MatchWeekReport = {
      competition: 'league', compLabel: 'League', home: 'Home Club', away: 'Away Club',
      homeGoals: 2, awayGoals: 0, won: true, drawn: false, decidedBy: 'regular',
      myScorers: [{ name: 'Made up back', minute: 12, og: true, gen: true }, { name: 'Their centre back', minute: 63, og: true }],
      oppScorers: [],
      events: [], trophyWon: null, myPosition: 4, confidence: 60, confidenceDelta: 0, otherResults: [],
    };
    const { container } = render(<MatchReportCard report={report} clubName="Home Club" onContinue={() => {}} />);
    const rows = [...container.querySelectorAll('p')].filter(p => (p.textContent ?? '').startsWith('⚽'));
    expect(rows.map(p => p.textContent)).toEqual(["⚽ Made up back 12' (O.G)MADE UP", "⚽ Their centre back 63' (O.G)"]);
  });
});
