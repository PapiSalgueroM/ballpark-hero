/* Round 1224: the told path of Game Day (src/lib/gmGameDay.ts) and what the
   NFL hands it (src/lib/gameLaws/nflGameDay.ts).

   Hand built games hold each shape and each deciding play to its rule; a law
   written for the test reaches the fail closed branches the NFL's law cannot;
   the NFL's law is then walked over every final it can tell. The save field
   is damaged one field at a time. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { decidingPlays, gameStory, makeGmLastGame, readGmLastGame, tellGame, type GameDayLaw, type GmLastGame } from '@/lib/gmGameDay';
import { GM_SCORE_CEILING, quickGame, type ToldGame } from '@/lib/gmGameScore';
import { NFL_COMEBACK, NFL_GAME_DAY, NFL_GAME_DAY_HELP, NFL_MAX_SCORE, NFL_QUARTERS, NFL_ROUT, nflShapeWords } from '@/lib/gameLaws/nflGameDay';
import { NFL_GAME_MINUTES, nflClockLabel } from '@/lib/gameLaws/nfl';
import { DRIVES, FG_A_DRIVE, NFL_SCORE_LAW, TD_A_GAME } from '@/lib/gameLaws/nflScore';
import { keyedRng } from '@/lib/keyedRng';
import { NFL_CLOCK } from '@/data/usLeagueShape';
import type { SeasonEvent } from '@/lib/season/core';

type Play = [min: number, side: 'us' | 'them', pts: number];
const plays = (list: Play[]): SeasonEvent[] => list.map(([min, side, pts]) => ({ min, kind: pts === 3 ? 'fg' : pts === 2 ? 'safety' : 'td', side, pts }));
/** A day law whose story is a fixed list (the home club is 'us'), on the NFL's clock and shape numbers. */
const fixed = (list: unknown): GameDayLaw => ({
  ...NFL_GAME_DAY,
  /* a list of [minute, side, points] is made into plays; anything else is handed over as it is (the damaged cases) */
  story: { ...NFL_GAME_DAY.story, events: () => (Array.isArray(list) && list.every(p => Array.isArray(p)) ? plays(list as Play[]) : list) as SeasonEvent[] | null },
});
const told = (homeScore: number, awayScore: number, key = 'k'): ToldGame => ({ key, home: 'AAA', away: 'BBB', homeScore, awayScore });
const mins = (es: SeasonEvent[]) => es.map(e => e.min);
/** Curly quotation marks and the two dashes, by code so no tool rewrites them. */
const NOT_PLAIN = new RegExp('[' + [0x201c, 0x201d, 0x2013, 0x2014].map(c => String.fromCharCode(c)).join('') + ']');

afterEach(() => { vi.restoreAllMocks(); });

describe('decidingPlays', () => {
  it('names the go ahead that stood, the score it answered and the last score of the winner', () => {
    /* 7-0, 7-7, 14-7, 14-14, 21-14 (the go ahead), 24-14, 24-17 */
    const es = plays([[5, 'us', 7], [12, 'them', 7], [20, 'us', 7], [28, 'them', 7], [38, 'us', 7], [50, 'us', 3], [57, 'them', 3]]);
    const d = decidingPlays(es, 'us')!;
    expect(d.goAhead.min).toBe(38);
    expect(mins(d.plays)).toEqual([28, 38, 50]);
    expect(d.first).toBe(false);
    expect(d.deficit).toBe(0);
  });

  it('is one play when the winner scored first, was never caught and never scored again', () => {
    const d = decidingPlays(plays([[9, 'them', 7], [44, 'us', 3]]), 'them')!;
    expect(mins(d.plays)).toEqual([9]);
    expect(d.first).toBe(true);
  });

  it('measures the deepest hole the winner was in', () => {
    const d = decidingPlays(plays([[3, 'them', 7], [10, 'them', 7], [20, 'them', 3], [30, 'us', 7], [40, 'us', 7], [58, 'us', 7]]), 'us')!;
    expect(d.deficit).toBe(17);
    expect(mins(d.plays)).toEqual([20, 58]);
  });

  it('answers null when the side named as the winner is not ahead at the end', () => {
    expect(decidingPlays(plays([[5, 'us', 7]]), 'them')).toBeNull();
    expect(decidingPlays(plays([[5, 'us', 7], [9, 'them', 7]]), 'us')).toBeNull();
    expect(decidingPlays([], 'us')).toBeNull();
  });

  it('leaves the game level or the loser ahead after play (2), on every final the NFL law can tell', () => {
    let seen = 0;
    for (let h = 0; h <= 45; h += 1) for (let a = 0; a <= 45; a += 1) {
      const s = h === a ? null : gameStory(NFL_GAME_DAY, told(h, a, `walk|${h}|${a}`), 'home');
      if (!s) continue;
      seen += 1;
      const win = h > a ? 'us' : 'them';
      const go = s.deciding.find(e => e.side === win)!;
      const before = s.game.events.filter(e => e.min < go.min);
      const lead = before.reduce((n, e) => n + (e.side === win ? e.pts! : -e.pts!), 0);
      expect(lead).toBeLessThanOrEqual(0);
      const after = s.game.events.filter(e => e.min >= go.min);
      let run = lead;
      for (const e of after) { run += e.side === win ? e.pts! : -e.pts!; expect(run).toBeGreaterThan(0); }
    }
    /* 46 by 46 finals less the 46 level ones, less every final with a side on 1 or 4 */
    expect(seen).toBe(46 * 45 - (4 * 45 - 2));
  });
});

describe('gameStory: the shape of a game, first match wins', () => {
  const shapeOf = (list: Play[], h: number, a: number) => gameStory(fixed(list), told(h, a), 'home')?.shape;
  it('rout: the margin is the number or more, whatever else happened', () => {
    expect(shapeOf([[50, 'us', 7], [52, 'us', 7], [55, 'us', 7]], NFL_ROUT, 0)).toBe('rout');
  });
  it('comeback: the winner was that far behind', () => {
    expect(shapeOf([[5, 'them', 7], [9, 'them', 3], [20, 'us', 7], [50, 'us', 7]], 14, NFL_COMEBACK)).toBe('comeback');
  });
  it('late: the go ahead that stood came in the last period', () => {
    expect(shapeOf([[5, 'them', 7], [20, 'us', 7], [46, 'us', 3]], 10, 7)).toBe('late');
  });
  it('wire: the winner scored first and was never level or behind again', () => {
    expect(shapeOf([[5, 'us', 7], [20, 'them', 3], [40, 'us', 3]], 10, 3)).toBe('wire');
  });
  it('trade: anything else', () => {
    expect(shapeOf([[5, 'them', 3], [20, 'us', 7], [40, 'us', 3]], 10, 3)).toBe('trade');
  });
  it('one under each number is not that shape', () => {
    expect(shapeOf([[5, 'us', 7], [20, 'us', 7], [40, 'us', 6]], NFL_ROUT - 1, 0)).toBe('wire');
    expect(shapeOf([[5, 'them', 6], [9, 'them', 3], [20, 'us', 7], [40, 'us', 7]], 14, NFL_COMEBACK - 1)).toBe('trade');
  });
});

describe('gameStory, with the NFL law', () => {
  it('adds up by side and by quarter, mirrors for the away club, and tells the same story twice without Math.random', () => {
    const spy = vi.spyOn(Math, 'random');
    for (let i = 0; i < 300; i += 1) {
      const g = quickGame(NFL_SCORE_LAW, { key: `2026|w${1 + (i % 17)}|AAA|BBB|${i}`, home: 'AAA', away: 'BBB', decided: { homeWon: i % 3 !== 0, pHome: 0.2 + (i % 7) * 0.1 } })!;
      const h = gameStory(NFL_GAME_DAY, g, 'home', 4)!;
      const a = gameStory(NFL_GAME_DAY, g, 'away', 4)!;
      expect(h).not.toBeNull();
      expect([h.game.us, h.game.them, h.game.home, h.game.md]).toEqual([g.homeScore, g.awayScore, true, 4]);
      expect([a.game.us, a.game.them, a.game.home]).toEqual([g.awayScore, g.homeScore, false]);
      for (const s of [h, a]) {
        expect(s.periods.us.length).toBe(NFL_QUARTERS);
        expect(s.periods.us.reduce((x, y) => x + y, 0)).toBe(s.game.us);
        expect(s.periods.them.reduce((x, y) => x + y, 0)).toBe(s.game.them);
        expect(s.deciding.length).toBeGreaterThanOrEqual(1);
        expect(s.deciding.length).toBeLessThanOrEqual(3);
        for (const d of s.deciding) expect(s.game.events).toContain(d);
        expect(mins(s.game.events)).toEqual([...mins(s.game.events)].sort((x, y) => x - y));
      }
      expect(a.periods).toEqual({ us: h.periods.them, them: h.periods.us });
      expect(a.shape).toBe(h.shape);
      expect(mins(a.deciding)).toEqual(mins(h.deciding));
      expect(a.game.events.map(e => e.side)).toEqual(h.game.events.map(e => (e.side === 'us' ? 'them' : 'us')));
      expect(gameStory(NFL_GAME_DAY, JSON.parse(JSON.stringify(g)), 'home', 4)).toEqual(h);
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it('cuts the hour where the clock label does, and as the ledger says', () => {
    expect(NFL_QUARTERS).toBe(NFL_CLOCK.quarters);
    expect(NFL_QUARTERS * NFL_CLOCK.minutes).toBe(NFL_GAME_MINUTES);
    for (let m = 0; m <= NFL_GAME_MINUTES; m += 1) {
      expect(nflClockLabel(m).startsWith(`${NFL_GAME_DAY.periods.name(NFL_GAME_DAY.periods.of(m))} `), `minute ${m}`).toBe(true);
    }
  });

  it('says each shape in one sentence that names the winner, with the numbers the law holds', () => {
    for (const shape of ['rout', 'comeback', 'late', 'wire', 'trade'] as const) {
      const words = NFL_GAME_DAY.shape.say(shape, 'Bills', 'Jets');
      expect(words.startsWith('Bills ')).toBe(true);
      expect(words).not.toMatch(NOT_PLAIN);
      expect(words).not.toContain(String.fromCharCode(34));
    }
    expect(nflShapeWords('rout', 'A', 'B')).toContain(String(NFL_ROUT));
    expect(nflShapeWords('comeback', 'A', 'B')).toContain(String(NFL_COMEBACK));
    expect(nflShapeWords('trade', 'A', 'B')).toContain('B');
  });

  it('carries a "?" that marks the clock thin and whose worked example is a game the rules tell that way', () => {
    const all = [NFL_GAME_DAY_HELP.title, ...NFL_GAME_DAY_HELP.intro, NFL_GAME_DAY_HELP.controls, NFL_GAME_DAY_HELP.footnote, ...NFL_GAME_DAY_HELP.examples.flatMap(e => [e.head, e.body])];
    for (const line of all) expect(line).not.toMatch(NOT_PLAIN);
    expect(NFL_GAME_DAY_HELP.intro.find(l => l.includes('four quarters'))).toMatch(/thin/);
    expect(NFL_GAME_DAY_HELP.intro.join(' ')).toContain(`${NFL_ROUT} or more`);
    expect(NFL_GAME_DAY_HELP.intro.join(' ')).toContain(`${NFL_COMEBACK} or more`);
    /* the example: 7, 7, 7, 3 against 7, 7, 0, 3, level at 14 at the half, decided by a touchdown in the third quarter */
    const s = gameStory(fixed([[5, 'us', 7], [12, 'them', 7], [20, 'them', 7], [28, 'us', 7], [38, 'us', 7], [50, 'us', 3], [57, 'them', 3]]), told(24, 17), 'home')!;
    expect(s.periods).toEqual({ us: [7, 7, 7, 3], them: [7, 7, 0, 3] });
    expect(NFL_GAME_DAY_HELP.examples[0].body).toContain('7, 7, 7 and 3');
    expect(NFL_GAME_DAY_HELP.examples[0].body).toContain('7, 7, 0 and 3');
    const go = s.deciding.find(e => e.side === 'us')!;
    expect([go.kind, NFL_GAME_DAY.periods.name(NFL_GAME_DAY.periods.of(go.min))]).toEqual(['td', 'Q3']);
  });
});

describe('gameStory fails closed', () => {
  it('for a final with no winner, a final no drive list makes, and a told game that does not read as one', () => {
    expect(gameStory(NFL_GAME_DAY, told(14, 14), 'home')).toBeNull();
    expect(gameStory(NFL_GAME_DAY, told(4, 0), 'home')).toBeNull();
    expect(gameStory(NFL_GAME_DAY, told(7, 1), 'away')).toBeNull();
    for (const bad of [null, { ...told(7, 3), key: 9 }, told(7.5, 3), told(-7, 3), told(Number.NaN, 3)]) expect(gameStory(NFL_GAME_DAY, bad as never, 'home')).toBeNull();
  });

  it('for a list that is not the final, one damaged thing at a time', () => {
    const sound: Play[] = [[5, 'us', 7], [20, 'them', 3]];
    expect(gameStory(fixed(sound), told(7, 3), 'home')).not.toBeNull();
    expect(gameStory(fixed(null), told(7, 3), 'home')).toBeNull();
    expect(gameStory(fixed('x'), told(7, 3), 'home')).toBeNull();
    expect(gameStory(fixed(sound), told(10, 3), 'home')).toBeNull();
    expect(gameStory(fixed(sound), told(7, 6), 'home')).toBeNull();
    expect(gameStory(fixed([[5, 'us', 7], [NFL_GAME_MINUTES + 1, 'them', 3]]), told(7, 3), 'home')).toBeNull();
    expect(gameStory(fixed([[-1, 'us', 7], [20, 'them', 3]]), told(7, 3), 'home')).toBeNull();
    expect(gameStory(fixed([[Number.NaN, 'us', 7], [20, 'them', 3]]), told(7, 3), 'home')).toBeNull();
    expect(gameStory(fixed([[5, 'us', 7.5], [20, 'them', 3]]), told(7, 3), 'home')).toBeNull();
    expect(gameStory(fixed([[5, 'ours', 7], [20, 'them', 3]]), told(7, 3), 'home')).toBeNull();
    expect(gameStory(fixed([null, [20, 'them', 3]].map(p => (p ? { min: p[0], side: p[1], pts: p[2], kind: 'x' } : null))), told(7, 3), 'home')).toBeNull();
    const badPeriods: GameDayLaw = { ...fixed(sound), periods: { ...NFL_GAME_DAY.periods, of: () => NFL_QUARTERS } };
    expect(gameStory(badPeriods, told(7, 3), 'home')).toBeNull();
  });

  it('for a final above the ceiling, without ever asking the law', () => {
    /* a law that would tell anything, and counts how often it is asked */
    let asked = 0;
    const anything: GameDayLaw = { ...NFL_GAME_DAY, maxScore: Number.POSITIVE_INFINITY, story: { ...NFL_GAME_DAY.story, events: (h, a, rng) => { asked += 1; return NFL_GAME_DAY.story.events(h, a, rng); } } };
    expect(gameStory(anything, told(GM_SCORE_CEILING, 17), 'home')).not.toBeNull();
    expect(asked).toBe(1);
    /* 1000 first: with no ceiling the NFL's story law answers it at once with a list (a fast red), where 250000 threw and 1e21 never came back */
    for (const big of [GM_SCORE_CEILING + 1, 250000, 1e21, Number.MAX_SAFE_INTEGER, Number.MAX_VALUE]) {
      expect(gameStory(anything, told(big, 17), 'home'), `home on ${big}`).toBeNull();
      expect(gameStory(anything, told(17, big), 'away'), `away on ${big}`).toBeNull();
      expect(gameStory(NFL_GAME_DAY, told(big, 17), 'home'), `the NFL, home on ${big}`).toBeNull();
    }
    expect(asked).toBe(1);
  });

  it('for a final above what the sport says its score law can give, and for a sport that says nothing', () => {
    expect(NFL_GAME_DAY.maxScore).toBe(NFL_MAX_SCORE);
    expect(NFL_MAX_SCORE).toBe(7 * DRIVES + 3);
    expect(gameStory(NFL_GAME_DAY, told(NFL_MAX_SCORE, 0), 'home')).not.toBeNull();
    expect(gameStory(NFL_GAME_DAY, told(0, NFL_MAX_SCORE), 'home')).not.toBeNull();
    expect(gameStory(NFL_GAME_DAY, told(NFL_MAX_SCORE + 1, 0), 'home')).toBeNull();
    expect(gameStory(NFL_GAME_DAY, told(0, NFL_MAX_SCORE + 1), 'away')).toBeNull();
    for (const none of [undefined, Number.NaN, null, '73']) expect(gameStory({ ...NFL_GAME_DAY, maxScore: none as never }, told(7, 3), 'home'), String(none)).toBeNull();
  });

  it('never has to refuse a final of the NFL score law: no side of one is above the number', () => {
    /* every drive a touchdown but each side's last, a field goal: 66 each, and the three a level game adds. The law's own top. */
    let i = 0;
    const top = NFL_SCORE_LAW.score(0.5, () => { i += 1; return i % DRIVES === 0 ? TD_A_GAME / DRIVES + FG_A_DRIVE / 2 : 0; });
    expect(top).toEqual([69, 66]);
    expect(gameStory(NFL_GAME_DAY, told(top[0], top[1]), 'home')).not.toBeNull();
    for (let k = 0; k < 4000; k += 1) {
      const [h, a] = NFL_SCORE_LAW.score(0.02 + (k % 49) * 0.02, keyedRng(`ceiling|${k}`));
      expect(h <= NFL_MAX_SCORE && a <= NFL_MAX_SCORE, `${h}-${a}`).toBe(true);
    }
  });
});

describe('tellGame: one law, two paths', () => {
  it('tells the final the quick path gives, and a story of that final', () => {
    for (let i = 0; i < 200; i += 1) {
      const f = { key: `2027|w${1 + (i % 17)}|AAA|BBB|${i}`, home: 'AAA', away: 'BBB', decided: { homeWon: i % 2 === 0, pHome: 0.1 + (i % 9) * 0.1 } };
      const quick = quickGame(NFL_SCORE_LAW, f)!;
      const t = tellGame(NFL_SCORE_LAW, NFL_GAME_DAY, f, i % 2 ? 'away' : 'home')!;
      expect(t.told).toEqual(quick);
      expect(quick.homeScore > quick.awayScore).toBe(f.decided.homeWon);
      const s = t.story!;
      expect(s).not.toBeNull();
      expect(s.game.home ? [s.game.us, s.game.them] : [s.game.them, s.game.us]).toEqual([quick.homeScore, quick.awayScore]);
    }
  });

  it('refuses exactly when the quick path does', () => {
    const level = { id: 'level', score: (): [number, number] => [14, 14] };
    expect(tellGame(level, NFL_GAME_DAY, { key: 'k', home: 'AAA', away: 'BBB', decided: { homeWon: true, pHome: 0.5 } }, 'home')).toBeNull();
  });
});

describe('the save field: the last told game', () => {
  const isClub = (id: string) => id === 'AAA' || id === 'BBB';
  const sound: GmLastGame = { v: 1, key: '2026|w6|AAA|BBB|23-20', where: 'w6', home: 'AAA', away: 'BBB', homeScore: 27, awayScore: 24, winner: 'AAA' };

  it('is made from a told game and read back as it was, through JSON', () => {
    const made = makeGmLastGame(told(27, 24, sound.key), 'w6');
    expect(made).toEqual(sound);
    const back = readGmLastGame(JSON.parse(JSON.stringify(made)), isClub)!;
    expect(back).toEqual(sound);
    expect(gameStory(NFL_GAME_DAY, back, 'home')).toEqual(gameStory(NFL_GAME_DAY, told(27, 24, sound.key), 'home'));
    expect(makeGmLastGame(told(20, 20), 'w6')).toBeNull();
  });

  it('hands back a fresh object of the known fields only', () => {
    const dirty = { ...sound, extra: 'x', line: { tds: 3 } };
    const back = readGmLastGame(dirty, isClub)!;
    expect(back).toEqual(sound);
    expect(back).not.toBe(dirty);
  });

  it('answers null for every field damaged, one at a time, and never throws', () => {
    const damage: Record<string, unknown[]> = {
      v: [undefined, 0, 2, '1', null],
      key: [undefined, '', 7, null, {}],
      where: [undefined, '', 6, null],
      home: [undefined, '', 'ZZZ', 'BBB', 3, null],
      away: [undefined, '', 'ZZZ', 'AAA', 3, null],
      homeScore: [undefined, '27', 27.5, -1, Number.NaN, Number.POSITIVE_INFINITY, 24, null],
      awayScore: [undefined, '24', 24.5, -1, Number.NaN, 27, 30, null],
      winner: [undefined, '', 'BBB', 'ZZZ', 1, null],
    };
    let cases = 0;
    for (const [field, values] of Object.entries(damage)) {
      for (const v of values) {
        const bad: Record<string, unknown> = { ...sound, [field]: v };
        if (v === undefined) delete bad[field];
        expect(readGmLastGame(bad, isClub), `${field} = ${String(v)}`).toBeNull();
        cases += 1;
      }
    }
    expect(cases).toBe(48);
    /* a score above the ceiling, on the winner's side, so nothing else about the block is wrong: with no ceiling these were read,
       and the story of the block then threw (250000) or never came back (1e21) */
    const top = { ...sound, homeScore: GM_SCORE_CEILING };
    expect(readGmLastGame(top, isClub)).toEqual(top);
    for (const big of [GM_SCORE_CEILING + 1, 250000, 1e21, Number.MAX_SAFE_INTEGER, Number.MAX_VALUE]) {
      expect(readGmLastGame({ ...sound, homeScore: big }, isClub), `home on ${big}`).toBeNull();
      expect(readGmLastGame({ ...sound, awayScore: big, winner: 'BBB' }, isClub), `away on ${big}`).toBeNull();
      expect(readGmLastGame(JSON.parse(JSON.stringify({ ...sound, homeScore: big })), isClub), `home on ${big}, through JSON`).toBeNull();
    }
    const thrower = Object.defineProperty({ ...sound }, 'home', { get() { throw new Error('boom'); } });
    for (const v of [undefined, null, 0, 'x', [], [sound], () => sound, thrower]) expect(readGmLastGame(v, isClub)).toBeNull();
    expect(readGmLastGame(sound, () => { throw new Error('boom'); })).toBeNull();
    expect(readGmLastGame(sound, (() => 1) as never)).toBeNull();
  });
});
