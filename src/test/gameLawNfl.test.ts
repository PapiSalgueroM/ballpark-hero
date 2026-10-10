/* Round 1221: the NFL's score law in its own home (src/lib/gameLaws/nflScore.ts
   and nfl.ts, with the keyed shuffle in src/lib/keyedShuffle.ts).

   The move itself is held to the byte by scripts/simUsSeasonCentre.mjs (its
   digest mode against scripts/data/usSeasonLawDigest.json, over 42,874 derived
   NFL games). This file holds what that digest cannot see: that there is ONE
   definition (the Season Center's number file hands back the law's own
   functions), the law's numbers against the two sourced ledger, the lines
   about a club against the Season Center's feed, the minute picker against a
   game recorded from the closure it replaced, and the two things that are new
   with the move (the law as a game outside the Season Center plays it:
   NFL_SCORE_LAW and NFL_STORY_LAW). The loops walk every value. */
import { describe, expect, it } from 'vitest';
import { keyedRng } from '@/lib/keyedRng';
import { shuffled } from '@/lib/keyedShuffle';
import { shuffled as coreShuffled, type SeasonEvent } from '@/lib/season/core';
import { NFL_SCORE_LAW, nflEdgeForShare, nflScore } from '@/lib/gameLaws/nflScore';
import { MAX_FG, NFL_GAME_MINUTES, NFL_STORY_LAW, nflClockLabel, nflClubLine, nflDriveCost, nflDrives, nflMinutePicker, nflTryWords } from '@/lib/gameLaws/nfl';
import * as seasonNfl from '@/lib/season/nfl';
import { NFL_CLOCK, NFL_SCORING } from '@/data/usLeagueShape';

const counted = (key: string) => { const r = keyedRng(key); const c = { n: 0, rng: () => { c.n += 1; return r(); } }; return c; };
const ev = (kind: string, side: 'us' | 'them', pts?: number, mine?: boolean): SeasonEvent => ({ min: 10, kind, side, ...(pts === undefined ? {} : { pts }), ...(mine ? { mine } : {}) });

describe('the keyed shuffle has one body', () => {
  it('is the same function from the season core and from its own file', () => {
    expect(coreShuffled).toBe(shuffled);
  });

  it('gives what the body in the season core gave before the move', () => {
    /* recorded 2026-10-10 from the function cut out of src/lib/season/core.ts at c367e8b7 (the commit before the move) */
    expect(shuffled([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], keyedRng('shuffle|1221'))).toEqual([1, 2, 3, 4, 6, 0, 5, 8, 9, 7]);
  });

  it('is a copy, a permutation, and one draw a place but the first', () => {
    for (let n = 0; n <= 40; n += 1) {
      const xs = Array.from({ length: n }, (_, i) => i * 3);
      const before = xs.slice();
      const c = counted(`shuffle|${n}`);
      const out = shuffled(xs, c.rng);
      expect(xs, `n ${n}`).toEqual(before);
      expect(out.slice().sort((a, b) => a - b), `n ${n}`).toEqual(before);
      expect(c.n, `n ${n}`).toBe(Math.max(0, n - 1));
    }
  });
});

describe('one definition of the law, and the Season Center reads it', () => {
  it('the number file hands back the law\'s own functions', () => {
    expect(seasonNfl.nflScore).toBe(nflScore);
    expect(seasonNfl.nflDrives).toBe(nflDrives);
    expect(seasonNfl.nflDriveCost).toBe(nflDriveCost);
    expect(seasonNfl.nflClockLabel).toBe(nflClockLabel);
    expect(seasonNfl.NFL_SEASON.view.clock).toBe(NFL_STORY_LAW.clock);
  });

  it('the bind scores and scales by the law', () => {
    for (let i = 1; i <= 99; i += 1) expect(seasonNfl.NFL_SEASON.strengthFor(i / 100), `share ${i}`).toBe(nflEdgeForShare(i / 100));
    for (let k = 0; k < 200; k += 1) {
      const edge = (k % 21) - 10;
      const home = k % 2 === 0;
      expect(seasonNfl.NFL_SEASON.score(edge, home, keyedRng(`bind|${k}`), undefined), `game ${k}`).toEqual(nflScore(edge, home, keyedRng(`bind|${k}`)));
    }
  });
});

describe('the law\'s numbers against the ledger', () => {
  it('a game is the ledger\'s four quarters of 15 minutes, and the clock says so', () => {
    expect(NFL_GAME_MINUTES).toBe(NFL_CLOCK.quarters * NFL_CLOCK.minutes);
    expect(NFL_STORY_LAW.clock.length).toBe(NFL_GAME_MINUTES);
    expect(NFL_STORY_LAW.clock.label).toBe(nflClockLabel);
    expect({ ...NFL_STORY_LAW.clock, label: null }).toEqual({ length: 60, label: null, start: 'Kickoff.', end: 'Final', endShort: 'FINAL', labelClass: 'w-14' });
    expect([0, 1, 15, 16, 45, 46, 60].map(nflClockLabel)).toEqual(['Q1 15:00', 'Q1 14:00', 'Q1 0:00', 'Q2 14:00', 'Q3 0:00', 'Q4 14:00', 'Q4 0:00']);
  });

  it('every drive of every list is worth what the ledger says a scoring play is worth', () => {
    const tdWorth = [NFL_SCORING.touchdown, NFL_SCORING.touchdown + NFL_SCORING.kickAfter, NFL_SCORING.touchdown + NFL_SCORING.twoPointTry];
    for (let points = 0; points <= 70; points += 1) {
      const d = nflDrives(points, 0, null, keyedRng(`drives|${points}`));
      if (points === 1 || points === 4) { expect(d, `points ${points}`).toBeNull(); continue; }
      expect(d, `points ${points}`).not.toBeNull();
      if (!d) continue;
      for (const t of d.tds) expect(tdWorth, `points ${points}`).toContain(t);
      expect(d.fgs, `points ${points}`).toBeLessThanOrEqual(MAX_FG);
      expect(d.safeties, `points ${points}`).toBeLessThanOrEqual(1);
      expect(d.tds.reduce((a, v) => a + v, 0) + NFL_SCORING.fieldGoal * d.fgs + NFL_SCORING.safety * d.safeties, `points ${points}`).toBe(points);
    }
  });
});

describe('nflEdgeForShare', () => {
  it('is level at a half, mirrors itself, rises with the share and stops at 2 and 98 in 100', () => {
    expect(nflEdgeForShare(0.5)).toBe(0);
    let last = -Infinity;
    for (let i = 2; i <= 98; i += 1) {
      const e = nflEdgeForShare(i / 100);
      expect(e, `share ${i}`).toBeGreaterThan(last);
      expect(e + nflEdgeForShare(1 - i / 100), `share ${i}`).toBeCloseTo(0, 9);
      last = e;
    }
    expect(nflEdgeForShare(0)).toBe(nflEdgeForShare(0.02));
    expect(nflEdgeForShare(1)).toBe(nflEdgeForShare(0.98));
  });
});

describe('NFL_SCORE_LAW: the law for a game outside the Season Center', () => {
  it('is nflScore at home with the venue unit taken off the edge for that share of wins', () => {
    for (const p of [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95]) {
      for (let k = 0; k < 60; k += 1) {
        expect(NFL_SCORE_LAW.score(p, keyedRng(`law|${p}|${k}`)), `pHome ${p} game ${k}`).toEqual(nflScore(nflEdgeForShare(p) - 1, true, keyedRng(`law|${p}|${k}`)));
      }
    }
  });

  it('never ends level, stays under the cap, and the home side wins about as often as it was told to', () => {
    /* Measured 2026-10-10 on these three streams: 892, 2,108 and 3,276 home wins of 4,000 (0.223, 0.527, 0.819).
       Eight other streams a cell sat between 0.2105 and 0.2290, 0.5148 and 0.5397, 0.8080 and 0.8275. The law
       leans to the home side by two or three games in 100 (a level game is broken its way), which is the Season
       Center's own law and not this round's to change, so the band is 0.06 either side of the share asked for. */
    const shares: number[] = [];
    for (const p of [0.2, 0.5, 0.8]) {
      const rng = keyedRng(`law|3|${p}`);
      let wins = 0;
      for (let i = 0; i < 4000; i += 1) {
        const [home, away] = NFL_SCORE_LAW.score(p, rng);
        expect(home).not.toBe(away);
        expect(Number.isInteger(home) && Number.isInteger(away) && home >= 0 && away >= 0 && home <= 69 && away <= 69, `${home}-${away}`).toBe(true);
        if (home > away) wins += 1;
      }
      shares.push(wins / 4000);
      expect(Math.abs(wins / 4000 - p), `pHome ${p}: ${wins} of 4000`).toBeLessThan(0.06);
    }
    expect(shares[0]).toBeLessThan(shares[1]);
    expect(shares[1]).toBeLessThan(shares[2]);
  });
});

describe('the lines about a club', () => {
  it('reads as the Season Center has always read them', () => {
    expect(nflClubLine(ev('td', 'us', 7), 'Bills')).toBe('🏈 Touchdown, Bills.');
    expect(nflClubLine(ev('td', 'us', 6), 'Bills')).toBe('🏈 Touchdown, Bills. The kick after is no good.');
    expect(nflClubLine(ev('td', 'us', 6), 'Bills', true)).toBe('🏈 Touchdown, Bills. The two point try is no good.');
    expect(nflClubLine(ev('td', 'us', 8), 'Bills')).toBe('🏈 Touchdown, Bills. The two point try is good.');
    expect(nflClubLine(ev('fg', 'them', 3), 'Chiefs')).toBe('🥅 Field goal, Chiefs.');
    expect(nflClubLine(ev('safety', 'them', 2), 'Chiefs')).toBe('Safety, Chiefs.');
    expect([undefined, 0, 2, 3, 7].map(pts => nflTryWords(pts))).toEqual(['', '', '', '', '']);
  });

  it('is the Season Center\'s own line for every club kind, value, side and kicker flag', () => {
    for (const side of ['us', 'them'] as const) for (const kicker of [false, true]) {
      const club = side === 'us' ? 'Chiefs' : 'Bills';
      for (const [kind, values] of [['td', [6, 7, 8]], ['fg', [3]], ['safety', [2]]] as const) {
        for (const pts of values) {
          const e = ev(kind, side, pts);
          expect(seasonNfl.nflEventWords(e, 'Chiefs', 'Bills', kicker), `${kind} ${pts} ${side} ${kicker}`).toBe(nflClubLine(e, club, kicker && side === 'us'));
          expect(nflClubLine(e, club).length, `${kind} ${pts}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('says nothing for a line that is about him and not about a club', () => {
    for (const kind of ['td-pass', 'td-rush', 'td-rec', 'miss', 'int', 'sack', 'pick', 'ff', 'hot', '']) expect(nflClubLine(ev(kind, 'us', 7, true), 'Bills'), kind).toBe('');
    /* and his own field goal is his line in the Season Center, never the club's */
    expect(seasonNfl.nflEventWords(ev('fg', 'us', 3, true), 'Chiefs', 'Bills')).not.toBe(nflClubLine(ev('fg', 'us', 3), 'Chiefs'));
    expect(NFL_STORY_LAW.line(ev('td', 'us', 6), 'Bills')).toBe('🏈 Touchdown, Bills. The kick after is no good.');
  });
});

describe('nflMinutePicker', () => {
  it('gives the minutes the closure inside the Season Center gave, call for call', () => {
    /* Recorded 2026-10-10 from the closure cut out of src/lib/season/nfl.ts at c367e8b7 (the commit before the
       move), on keyedRng('pick|7'): 36 lines of one game, the side each call named (null: a moment of his own)
       and the minute it was given. The late lines are the fall back to any free minute. 62,271 calls over
       4,000 such games gave the same minutes from both, and left the stream on the same draw. */
    const recorded: [('us' | 'them' | null), number][] = [
      ['us', 21], ['us', 34], ['us', 38], ['us', 11], ['us', 29], [null, 4], ['us', 59], ['us', 56], ['us', 17], [null, 24], [null, 53], ['us', 48],
      ['us', 51], ['them', 8], ['them', 41], ['them', 26], ['them', 13], [null, 15], [null, 46], ['them', 36], ['them', 32], ['them', 44], ['them', 19], ['them', 18],
      ['us', 20], ['them', 2], ['us', 6], ['us', 60], ['us', 33], ['them', 9], [null, 3], [null, 50], ['them', 35], ['us', 7], ['us', 37], [null, 10],
    ];
    const minute = nflMinutePicker(keyedRng('pick|7'));
    expect(recorded.map(([side]) => minute(side ?? undefined))).toEqual(recorded.map(([, m]) => m));
  });

  it('never gives two lines of a game one minute, and fills the whole hour before it would', () => {
    for (let k = 0; k < 300; k += 1) {
      const minute = nflMinutePicker(keyedRng(`hour|${k}`));
      const got = Array.from({ length: NFL_GAME_MINUTES }, (_, i) => minute(i % 3 === 0 ? 'us' : i % 3 === 1 ? 'them' : undefined));
      expect(got.slice().sort((a, b) => a - b), `game ${k}`).toEqual(Array.from({ length: NFL_GAME_MINUTES }, (_, i) => i + 1));
    }
  });

  it('where the hour has room, keeps lines out of back to back minutes and a side\'s drives three minutes apart', () => {
    let lines = 0;
    for (let k = 0; k < 2000; k += 1) {
      const minute = nflMinutePicker(keyedRng(`room|${k}`));
      const sides = ['us', 'us', 'us', 'them', 'them', undefined] as const;
      const got = sides.map(side => ({ side, min: minute(side) }));
      for (let i = 0; i < got.length; i += 1) for (let j = i + 1; j < got.length; j += 1) {
        const gap = Math.abs(got[i].min - got[j].min);
        expect(gap, `game ${k}: minutes ${got[i].min} and ${got[j].min}`).toBeGreaterThanOrEqual(2);
        if (got[i].side !== undefined && got[i].side === got[j].side) expect(gap, `game ${k}: one side at ${got[i].min} and ${got[j].min}`).toBeGreaterThanOrEqual(3);
      }
      lines += got.length;
    }
    expect(lines).toBe(12000);
  });

  it('takes one draw for a line that lands on a free minute', () => {
    const c = counted('first');
    nflMinutePicker(c.rng)('us');
    expect(c.n).toBe(1);
  });
});

describe('NFL_STORY_LAW.events: the scoring plays of a final', () => {
  it('for every final from 0-0 to 70-70: both sides add up, in minute order, one line a minute, club lines only', () => {
    const worth: Record<string, number[]> = {
      td: [NFL_SCORING.touchdown, NFL_SCORING.touchdown + NFL_SCORING.kickAfter, NFL_SCORING.touchdown + NFL_SCORING.twoPointTry],
      fg: [NFL_SCORING.fieldGoal], safety: [NFL_SCORING.safety],
    };
    const bad: string[] = [];
    let told = 0;
    let none = 0;
    for (let home = 0; home <= 70; home += 1) for (let away = 0; away <= 70; away += 1) {
      const list = NFL_STORY_LAW.events(home, away, keyedRng(`ev|${home}|${away}`));
      const noList = [home, away].some(v => v === 1 || v === 4);
      if (list === null || noList) { if ((list === null) !== noList) bad.push(`${home}-${away}: ${list === null ? 'no list' : 'a list for a score no drives make'}`); none += 1; continue; }
      told += 1;
      const sum = (side: 'us' | 'them') => list.filter(e => e.side === side).reduce((a, e) => a + (e.pts ?? 0), 0);
      if (sum('us') !== home || sum('them') !== away) bad.push(`${home}-${away}: the lines make ${sum('us')}-${sum('them')}`);
      if (list.some((e, i) => i > 0 && e.min <= list[i - 1].min)) bad.push(`${home}-${away}: not in minute order, or two lines on one minute`);
      if (list.some(e => !Number.isInteger(e.min) || e.min < 1 || e.min > NFL_GAME_MINUTES)) bad.push(`${home}-${away}: a minute off the clock`);
      if (list.some(e => !(worth[e.kind] ?? []).includes(e.pts ?? -1) || e.mine !== undefined)) bad.push(`${home}-${away}: a line that is not a club's scoring play`);
      if (list.some(e => NFL_STORY_LAW.line(e, 'Bills') === '')) bad.push(`${home}-${away}: a play with no line`);
    }
    expect(bad).toEqual([]);
    expect([told, none]).toEqual([4761, 280]);
  });

  it('tells one final one way for one key, and another key another way', () => {
    /* a pin of the new function's own output, recorded 2026-10-10 on the move commit (nothing older exists to hold it to) */
    expect(NFL_STORY_LAW.events(24, 17, keyedRng('ev|sample'))).toEqual([
      { min: 20, kind: 'fg', side: 'us', pts: 3 }, { min: 24, kind: 'td', side: 'us', pts: 7 }, { min: 27, kind: 'td', side: 'us', pts: 7 },
      { min: 34, kind: 'td', side: 'them', pts: 7 }, { min: 40, kind: 'td', side: 'us', pts: 7 }, { min: 45, kind: 'fg', side: 'them', pts: 3 },
      { min: 49, kind: 'td', side: 'them', pts: 7 },
    ]);
    expect(NFL_STORY_LAW.events(24, 17, keyedRng('ev|sample'))).toEqual(NFL_STORY_LAW.events(24, 17, keyedRng('ev|sample')));
    const other = new Set(Array.from({ length: 40 }, (_, k) => JSON.stringify(NFL_STORY_LAW.events(24, 17, keyedRng(`ev|other|${k}`)))));
    expect(other.size).toBeGreaterThan(30);
  });
});
