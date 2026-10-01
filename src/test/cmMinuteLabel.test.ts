/**
 * Round 781: the Club Manager clock with the referee's board in it.
 *
 * A player's report asked for goals in stoppage time (90+5) and in extra
 * time. A line in the board carries the period's last minute and how far
 * into the board it fell, so these three helpers are the whole reading:
 * minuteLabel prints it the way a scoreboard does, clockOrder sorts the
 * board after the minute it extends, and playedBy says whether a line has
 * happened by a clock position. The live banner, the timeline and the
 * report all print through minuteLabel, so a bad label here is a bad label
 * on every screen.
 */
import { describe, it, expect } from 'vitest';
import { minuteLabel, clockOrder, playedBy } from '@/lib/clubManagerClock';
import { cardsAndSubsAt, type CommittedLines } from '@/lib/clubManagerMatchCentre';

describe('minuteLabel', () => {
  it('prints a minute in regular time as the minute', () => {
    expect(minuteLabel({ minute: 63 })).toBe("63'");
    expect(minuteLabel({ minute: 1 })).toBe("1'");
    expect(minuteLabel({ minute: 45 })).toBe("45'");
    expect(minuteLabel({ minute: 90 })).toBe("90'");
  });

  it('prints a line in the board as the period end plus the board minute', () => {
    expect(minuteLabel({ minute: 45, plus: 2 })).toBe("45+2'");
    expect(minuteLabel({ minute: 90, plus: 5 })).toBe("90+5'");
    expect(minuteLabel({ minute: 120, plus: 1 })).toBe("120+1'");
  });

  it('prints extra time minutes as their own minutes, never as 90 plus', () => {
    expect(minuteLabel({ minute: 91 })).toBe("91'");
    expect(minuteLabel({ minute: 104 })).toBe("104'");
    expect(minuteLabel({ minute: 120 })).toBe("120'");
  });

  it('treats a plus of zero, or none at all (an old save), as regular time', () => {
    expect(minuteLabel({ minute: 90, plus: 0 })).toBe("90'");
    expect(minuteLabel({ minute: 90, plus: undefined })).toBe("90'");
  });
});

describe('clockOrder', () => {
  it('puts the board after the minute it extends and before the next period', () => {
    const lines = [
      { minute: 91 }, { minute: 90, plus: 3 }, { minute: 46 }, { minute: 45, plus: 1 },
      { minute: 90 }, { minute: 45 }, { minute: 90, plus: 1 }, { minute: 44 },
    ];
    expect([...lines].sort(clockOrder).map(minuteLabel)).toEqual([
      "44'", "45'", "45+1'", "46'", "90'", "90+1'", "90+3'", "91'",
    ]);
  });
});

describe('playedBy', () => {
  const goals = [{ minute: 89 }, { minute: 90 }, { minute: 90, plus: 2 }, { minute: 90, plus: 4 }];

  it('with no plus counts the whole minute, board included, as the report does', () => {
    expect(goals.filter(playedBy(90)).length).toBe(4);
    expect(goals.filter(playedBy(89)).length).toBe(1);
  });

  it('with a plus counts only what the clock has reached inside the board', () => {
    expect(goals.filter(playedBy(90, 0)).length).toBe(2);
    expect(goals.filter(playedBy(90, 2)).length).toBe(3);
    expect(goals.filter(playedBy(90, 3)).length).toBe(3);
    expect(goals.filter(playedBy(90, 4)).length).toBe(4);
  });
});

describe('cardsAndSubsAt reads the board the same way', () => {
  const lines: CommittedLines = {
    cards: [
      { name: 'A', minute: 30, kind: 'yellow' },
      { name: 'B', minute: 90, plus: 3, kind: 'yellow' },
    ],
    oppCards: [],
    subs: [{ off: 'C', on: 'D', minute: 90, plus: 1 }],
    oppSubs: [],
  };

  it('a booking at 90+3 has not happened at 90+2, and has at 90+3 and at the whistle', () => {
    expect(cardsAndSubsAt(lines, 90, 2).yellows).toBe(1);
    expect(cardsAndSubsAt(lines, 90, 3).yellows).toBe(2);
    expect(cardsAndSubsAt(lines, 90).yellows).toBe(2);
  });

  it('a change at 90+1 counts from 90+1 on', () => {
    expect(cardsAndSubsAt(lines, 90, 0).subs).toBe(0);
    expect(cardsAndSubsAt(lines, 90, 1).subs).toBe(1);
  });
});
