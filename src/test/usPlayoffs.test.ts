/* Round 1300: the playoff deriver's pure parts (src/lib/season/usPlayoffs.ts)
   and the lay it stands on (usPlayoffLay in src/lib/season/us.ts). The fleet
   proof is scripts/simUsPostseason.mjs; these are the small exact cases. */
import { describe, expect, it } from 'vitest';
import { keyedRng } from '@/lib/keyedRng';
import type { StatTotal } from '@/lib/season/core';
import { buildUsSeason, usPlayoffLay, usPlayoffPath, type UsRow } from '@/lib/season/us';
import {
  PO_TRIES, usCountWords, usPostProblems, usPostRow, usPostTotals, usPostseason, usPostseasonOrWhy, usSeriesOrder,
  type UsPostseason,
} from '@/lib/season/usPlayoffs';
import { NBA_SEASON } from '@/lib/season/nba';
import { NFL_SEASON } from '@/lib/season/nfl';
import { NBA_MISSED_PLAYOFFS, NBA_PLAYOFF_RESULTS, nbaTeamLabelOf } from '@/lib/nbaMyCareer';
import { NFL_PLAYOFF_RESULTS, nflTeamLabelOf } from '@/lib/nflMyCareer';
import { usPostseasonRounds } from '@/data/usPostseasonFormat';

const nbaRow = (over: Record<string, unknown> = {}): UsRow => ({
  year: 2030, team: 'BOS', age: 27, ovr: 88, games: 80, awards: [], teamResult: NBA_PLAYOFF_RESULTS[4], salary: 30,
  ppg: 25, rpg: 6.1, apg: 7.4, poGames: 22, poPpg: 26.3, poRpg: 5.8, poApg: 7.9, ...over,
} as UsRow);
const who = (name: string) => ({ name, pos: 'PG', eraId: undefined as string | undefined });
function nba(name: string, row: UsRow) {
  const b = buildUsSeason(NBA_SEASON, who(name), row, nbaTeamLabelOf);
  if (!b.ok) throw new Error(b.line);
  return b;
}
/** The whole total a saved mean is held to, typed here on its own (never the module's). */
const wholeOf = (mean: number, games: number) => Math.round((Math.round(mean * 10) * games) / 10);
const sumOf = (p: UsPostseason, key: string) => p.season.games.reduce((a, g) => a + (g.line[key] ?? 0), 0);

describe('usSeriesOrder', () => {
  /* every length the data file holds (a best of seven, one game), plus a best of five and a best of three */
  const shapes: [number, number][] = [];
  for (const sport of ['nba', 'nfl'] as const) for (const r of usPostseasonRounds(sport)) for (let g = r.series[0]; g <= r.series[1]; g += 1) shapes.push([r.series[0], g]);
  for (const [need, most] of [[3, 5], [2, 3]] as const) for (let g = need; g <= most; g += 1) shapes.push([need, g]);

  it('puts the clincher last and lets nobody clinch early, for every length and 200 seeds', () => {
    expect(shapes.length).toBeGreaterThanOrEqual(9);
    for (const [need, games] of shapes) for (const won of [true, false]) for (let seed = 0; seed < 200; seed += 1) {
      const order = usSeriesOrder(need, games, won, keyedRng(`order|${need}|${games}|${won}|${seed}`));
      expect(order.length).toBe(games);
      expect(order[games - 1]).toBe(won);
      let mine = 0; let theirs = 0;
      order.forEach((w, i) => {
        expect(mine < need && theirs < need, `need ${need}, ${games} games, seed ${seed}: decided before game ${i + 1}`).toBe(true);
        if (w) mine += 1; else theirs += 1;
      });
      expect(won ? mine : theirs).toBe(need);
      expect(won ? theirs : mine).toBe(games - need);
    }
  });

  it('is a real shuffle: over the seeds a seven game series is not always the same order', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 200; seed += 1) seen.add(usSeriesOrder(4, 7, true, keyedRng(`mix|${seed}`)).map(w => (w ? 'W' : 'L')).join(''));
    /* 20 orders exist (three wins among the first six games) */
    expect(seen.size).toBeGreaterThan(10);
  });

  it('refuses a length no series of that need can have', () => {
    const rng = keyedRng('none');
    expect(usSeriesOrder(4, 3, true, rng)).toEqual([]);
    expect(usSeriesOrder(4, 8, false, rng)).toEqual([]);
    expect(usSeriesOrder(1, 2, true, rng)).toEqual([]);
    expect(usSeriesOrder(0, 0, true, rng)).toEqual([]);
    expect(usSeriesOrder(4, 5.5, true, rng)).toEqual([]);
  });
});

describe('usPostRow', () => {
  it('puts the saved playoff numbers under the regular keys of an NBA line', () => {
    const row = nbaRow();
    const po = usPostRow(NBA_SEASON, row, 'PG', 22)!;
    expect(po.games).toBe(22);
    expect([po.ppg, po.rpg, po.apg]).toEqual([26.3, 5.8, 7.9]);
    expect(po.awards).toEqual([]);
    /* the saved line itself is not touched */
    expect([row.games, row.ppg, row.rpg, row.apg]).toEqual([80, 25, 6.1, 7.4]);
  });

  it('answers null for a line with no playoff number, and never reads the NFL sentence', () => {
    expect(usPostRow(NBA_SEASON, nbaRow({ poPpg: undefined, poRpg: undefined, poApg: undefined }), 'PG', 5)).toBeNull();
    const nfl = { year: 2030, team: 'BUF', age: 27, ovr: 88, games: 17, awards: [], teamResult: NFL_PLAYOFF_RESULTS[1], salary: 30, passYds: 4310, passTd: 31, ints: 9, poGames: 2, poLine: '811 yds, 6 TD, 1 INT' } as UsRow;
    expect(usPostRow(NFL_SEASON, nfl, 'QB', 2)).toBeNull();
  });

  it('drops a stat field the save holds no playoff number for', () => {
    const po = usPostRow(NBA_SEASON, nbaRow({ poRpg: undefined }), 'PG', 22)!;
    expect('rpg' in po).toBe(false);
    expect(po.ppg).toBe(26.3);
  });
});

describe('usPostTotals', () => {
  const mean = (m: number, max = 60): StatTotal => ({ key: 'pts', kind: 'mean', mean: m, dp: 1, perGame: 'int', min: 0, max });

  it('keeps a sum and turns a mean of whole numbers into the nearest whole total, worked in tenths', () => {
    const sum: StatTotal = { key: 'passTd', kind: 'sum', total: 6, perGameCap: 6, teamFor: true, teamPoints: 7 };
    expect(usPostTotals([sum], 2)).toEqual([sum]);
    expect(usPostTotals([mean(24.5)], 5)).toEqual([{ key: 'pts', kind: 'sum', total: 123, perGameCap: 60, formPower: 0.5 }]);
    /* 2.3 times 5 is 11.499999999999998 as a float: the tenths make it 11.5, which rounds to 12 */
    expect(Math.round(2.3 * 5)).toBe(11);
    expect(usPostTotals([mean(2.3)], 5)![0]).toMatchObject({ total: 12 });
    expect(usPostTotals([mean(0)], 7)![0]).toMatchObject({ total: 0 });
  });

  it('answers null for a total the core cannot hold game by game', () => {
    expect(usPostTotals([{ key: 'cs', kind: 'count-of', total: 2, when: 'shutout' }], 5)).toBeNull();
    expect(usPostTotals([{ key: 'long', kind: 'max', max: 51 }], 5)).toBeNull();
    expect(usPostTotals([{ key: 'rating', kind: 'mean', mean: 7.1, dp: 1, perGame: 0.1, min: 0, max: 10 }], 5)).toBeNull();
    expect(usPostTotals([{ key: 'pts', kind: 'mean', mean: 20, dp: 0, perGame: 'int', min: 4, max: 50 }], 5)).toBeNull();
    expect(usPostTotals([mean(Number.NaN)], 5)).toBeNull();
    expect(usPostTotals([{ key: 'x', kind: 'sum', total: -1, perGameCap: 3 }], 5)).toBeNull();
    expect(usPostTotals([mean(20)], 0)).toBeNull();
  });

  it('from ten games up the whole total always averages back to the saved decimal (plain arithmetic)', () => {
    let checked = 0;
    for (let tenths = 0; tenths <= 450; tenths += 1) for (let games = 10; games <= 28; games += 1) {
      const total = wholeOf(tenths / 10, games);
      expect(Math.round((total / games) * 10), `${tenths / 10} over ${games}`).toBe(tenths);
      checked += 1;
    }
    expect(checked).toBe(451 * 19);
    /* and under ten games it cannot always: 24.5 over 5 is held as 123, which reads 24.6 */
    expect(Math.round((wholeOf(24.5, 5) / 5) * 10)).toBe(246);
  });
});

describe('usCountWords', () => {
  it('says every count of a best of seven, a best of five and a best of three', () => {
    for (const need of [4, 3, 2]) for (let mine = 0; mine <= need; mine += 1) for (let theirs = 0; theirs <= need; theirs += 1) {
      if (mine === need && theirs === need) continue;
      const over = mine === need ? 'won' as const : theirs === need ? 'lost' as const : null;
      const words = usCountWords({ mine, theirs, over }, need);
      const want = over === 'won' ? `You win the series ${mine}-${theirs}`
        : over === 'lost' ? `You lose the series ${mine}-${theirs}`
          : mine === theirs ? `Series level ${mine}-${theirs}`
            : mine > theirs ? `You lead ${mine}-${theirs}` : `You trail ${mine}-${theirs}`;
      expect(words).toBe(want);
      for (const banned of [String.fromCharCode(0x2013), String.fromCharCode(0x2014), String.fromCharCode(34)]) expect(words.includes(banned)).toBe(false);
    }
    expect(usCountWords({ mine: 2, theirs: 1, over: null }, 4)).toBe('You lead 2-1');
    expect(usCountWords({ mine: 1, theirs: 1, over: null }, 4)).toBe('Series level 1-1');
    expect(usCountWords({ mine: 1, theirs: 2, over: null }, 4)).toBe('You trail 1-2');
    expect(usCountWords({ mine: 4, theirs: 2, over: 'won' }, 4)).toBe('You win the series 4-2');
    expect(usCountWords({ mine: 2, theirs: 4, over: 'lost' }, 4)).toBe('You lose the series 2-4');
  });

  it('says a one game round without a series score', () => {
    expect(usCountWords({ mine: 1, theirs: 0, over: 'won' }, 1)).toBe('You win');
    expect(usCountWords({ mine: 0, theirs: 1, over: 'lost' }, 1)).toBe('You are out');
  });
});

describe('usPlayoffLay', () => {
  it('holds the path as numbers: the same rounds, the same opponents, the same scores', () => {
    for (const [i, po] of [[0, 5], [1, 11], [2, 17], [3, 23], [4, 22]] as const) for (const name of ['Lay One', 'Lay Two', 'Lay Three']) {
      const row = nbaRow({ teamResult: NBA_PLAYOFF_RESULTS[i], poGames: po });
      const b = nba(name, row);
      const lay = usPlayoffLay(NBA_SEASON, row, b.ctx, b.key)!;
      const path = usPlayoffPath(NBA_SEASON, row, b.ctx, b.key)!;
      expect(lay.series.length).toBe(Math.min(4, i + 1));
      expect(lay.champion).toBe(i === 4);
      expect(lay.series.reduce((a, s) => a + s.games!, 0)).toBe(po);
      lay.series.forEach((s, r) => {
        expect([s.need, s.most]).toEqual([4, 7]);
        expect(s.games!).toBeGreaterThanOrEqual(4);
        expect(s.games!).toBeLessThanOrEqual(7);
        expect(s.won).toBe(r < lay.series.length - 1 || i === 4);
        expect(s.slot).not.toBeNull();
        expect(s.opp).toBe(b.ctx.names[s.slot!]);
        /* his own conference until the last round of the bracket, the other one there */
        expect(s.slot! <= b.ctx.confSlots).toBe(r < 3);
        expect(path.steps[r]).toEqual({ round: s.round, opp: s.opp, won: s.won, score: s.won ? `4-${s.games! - 4}` : `${s.games! - 4}-4` });
      });
    }
  });

  it('lays nothing out for a count that is absent or does not fit, and the path keeps its rounds', () => {
    for (const po of [undefined, 3, 8, 5.5]) {
      const row = nbaRow({ teamResult: NBA_PLAYOFF_RESULTS[0], poGames: po });
      const b = nba('Lay Four', row);
      const lay = usPlayoffLay(NBA_SEASON, row, b.ctx, b.key)!;
      expect(lay.series.map(s => s.games)).toEqual([null]);
      expect(usPlayoffPath(NBA_SEASON, row, b.ctx, b.key)!.steps.map(s => s.score)).toEqual([null]);
    }
    const missed = nbaRow({ teamResult: NBA_MISSED_PLAYOFFS, poGames: 0 });
    const b = nba('Lay Five', missed);
    expect(usPlayoffLay(NBA_SEASON, missed, b.ctx, b.key)).toBeNull();
  });

  it('reads a one game round as one game, and refuses a count that is not the rounds played', () => {
    const base = { year: 2030, team: 'BUF', age: 27, ovr: 88, games: 17, awards: [], salary: 30, passYds: 4310, passTd: 31, ints: 9, poLine: '811 yds, 6 TD, 1 INT' };
    const row = { ...base, teamResult: NFL_PLAYOFF_RESULTS[2], poGames: 3 } as UsRow;
    const b = buildUsSeason(NFL_SEASON, { name: 'Lay Six', pos: 'QB', eraId: undefined }, row, nflTeamLabelOf);
    if (!b.ok) throw new Error(b.line);
    const lay = usPlayoffLay(NFL_SEASON, row, b.ctx, b.key)!;
    expect(lay.series.map(s => [s.need, s.most, s.games, s.won])).toEqual([[1, 1, 1, true], [1, 1, 1, true], [1, 1, 1, false]]);
    expect(usPlayoffPath(NFL_SEASON, row, b.ctx, b.key)!.steps.map(s => s.score)).toEqual([null, null, null]);
    const none = { ...row, poGames: undefined } as UsRow;
    expect(usPlayoffLay(NFL_SEASON, none, b.ctx, b.key)!.series.map(s => s.games)).toEqual([null, null, null]);
    const wrong = { ...row, poGames: 2 } as UsRow;
    expect(usPlayoffLay(NFL_SEASON, wrong, b.ctx, b.key)).toBeNull();
    expect(usPlayoffPath(NFL_SEASON, wrong, b.ctx, b.key)).toBeNull();
    /* today's NFL line holds a sentence and no number: nothing is laid out game by game */
    expect(usPostseasonOrWhy(NFL_SEASON, row, b.ctx, b.key)).toBe('numbers');
    expect(usPostseason(NFL_SEASON, row, b.ctx, b.key)).toBeNull();
  });
});

/* every depth, runs under ten games and of ten or more, six careers each */
const RUNS: [result: number, poGames: number][] = [[0, 4], [0, 5], [0, 7], [1, 9], [1, 13], [2, 14], [2, 20], [3, 18], [3, 26], [4, 16], [4, 22], [4, 28]];
const NAMES = ['Post One', 'Post Two', 'Post Three', 'Post Four', 'Post Five', 'Post Six'];

describe('usPostseason, the NBA', () => {
  it('lays every run out game by game, on the saved playoff line to the unit', () => {
    let laid = 0;
    for (const [i, po] of RUNS) for (const name of NAMES) {
      const row = nbaRow({ teamResult: NBA_PLAYOFF_RESULTS[i], poGames: po, poPpg: 24.5, poRpg: 6.3, poApg: 5.7 });
      const b = nba(name, row);
      const why = usPostseasonOrWhy(NBA_SEASON, row, b.ctx, b.key);
      expect(typeof why, `${name}, result ${i}, ${po} games: ${String(why)}`).toBe('object');
      const p = why as UsPostseason;
      const lay = usPlayoffLay(NBA_SEASON, row, b.ctx, b.key)!;
      laid += 1;
      const games = p.season.games;
      expect(games.length).toBe(po);
      expect(games.map(g => g.md)).toEqual(Array.from({ length: po }, (_, k) => k + 1));
      expect(games.every(g => g.played && g.us !== g.them && (g.line.pts ?? 0) < g.us)).toBe(true);
      /* the sum rule */
      expect(sumOf(p, 'pts')).toBe(wholeOf(24.5, po));
      expect(sumOf(p, 'reb')).toBe(wholeOf(6.3, po));
      expect(sumOf(p, 'ast')).toBe(wholeOf(5.7, po));
      expect(p.held).toEqual([['pts', wholeOf(24.5, po)], ['reb', wholeOf(6.3, po)], ['ast', wholeOf(5.7, po)]]);
      /* the series are the lay's, each one over at its last game and not before */
      expect(p.series.length).toBe(lay.series.length);
      p.series.forEach((sr, r) => {
        const own = games.slice(sr.from - 1, sr.to);
        expect(own.length).toBe(lay.series[r].games);
        expect(own.every(g => g.opp === r + 1)).toBe(true);
        const mine = own.filter(g => g.us > g.them).length;
        expect([mine, own.length - mine]).toEqual(sr.won ? [4, own.length - 4] : [own.length - 4, 4]);
        expect(own[own.length - 1].us > own[own.length - 1].them).toBe(sr.won);
        expect(p.season.labels[r + 1].name).toBe(lay.series[r].opp);
        const last = p.at[sr.to - 1];
        expect([last.mine, last.theirs, last.over]).toEqual(sr.won ? [4, own.length - 4, 'won'] : [own.length - 4, 4, 'lost']);
        expect(p.at.slice(sr.from - 1, sr.to - 1).every(a => a.over === null)).toBe(true);
      });
      /* the run ends as the save says: a champion wins his last game, anyone else loses his */
      expect(games[po - 1].us > games[po - 1].them).toBe(i === 4);
      expect(p.champion).toBe(i === 4);
      /* no venue is claimed, and the run is not scored as all home games: his side is first in every other game */
      expect(games.filter(g => g.home).length).toBe(Math.ceil(po / 2));
      expect(p.season.labels[0].name).toBe(b.ctx.teamLabel);
      expect(p.key).toBe(`${b.key}|pog|${p.try}`);
      expect(p.try).toBeGreaterThanOrEqual(0);
      expect(p.try).toBeLessThan(PO_TRIES);
      expect(usPostProblems(p, lay, row, p.held)).toEqual([]);
    }
    expect(laid).toBe(RUNS.length * NAMES.length);
  });

  it('is the same twice and from a JSON round trip of the row, and leaves the path alone', () => {
    for (const [i, po] of RUNS.slice(0, 6)) {
      const row = nbaRow({ teamResult: NBA_PLAYOFF_RESULTS[i], poGames: po });
      const b = nba('Post Twice', row);
      const before = JSON.stringify(usPlayoffPath(NBA_SEASON, row, b.ctx, b.key));
      const one = JSON.stringify(usPostseason(NBA_SEASON, row, b.ctx, b.key));
      const again = JSON.parse(JSON.stringify(row)) as UsRow;
      const b2 = nba('Post Twice', again);
      expect(b2.key).toBe(b.key);
      expect(JSON.stringify(usPostseason(NBA_SEASON, again, b2.ctx, b2.key))).toBe(one);
      expect(JSON.stringify(usPostseason(NBA_SEASON, row, b.ctx, b.key))).toBe(one);
      expect(one).not.toBe('null');
      expect(JSON.stringify(usPlayoffPath(NBA_SEASON, row, b.ctx, b.key))).toBe(before);
    }
  });

  it('fails closed, each case for its own reason, and never with a made up game', () => {
    const run = nbaRow({ teamResult: NBA_PLAYOFF_RESULTS[1], poGames: 11 });
    const b = nba('Post Closed', run);
    const why = (row: UsRow) => usPostseasonOrWhy(NBA_SEASON, row, b.ctx, b.key);
    expect(typeof why(run)).toBe('object');
    expect(why({ ...run, teamResult: NBA_MISSED_PLAYOFFS })).toBe('lay');
    expect(why({ ...run, teamResult: 'A result the engine never wrote' })).toBe('lay');
    expect(why({ ...run, poGames: undefined })).toBe('fit');
    expect(why({ ...run, poGames: 7 })).toBe('fit');
    expect(why({ ...run, poGames: 15 })).toBe('fit');
    /* a season the format file does not hold, and one played to another format */
    expect(why({ ...run, year: 2002 })).toBe('format');
    expect(why({ ...run, year: 2019 })).toBe('format');
    expect(why({ ...run, poPpg: undefined, poRpg: undefined, poApg: undefined })).toBe('numbers');
    expect(why({ ...run, poPpg: -3 })).toBe('totals');
    for (const row of [{ ...run, teamResult: NBA_MISSED_PLAYOFFS }, { ...run, poGames: 7 }, { ...run, year: 2019 }, { ...run, poPpg: undefined, poRpg: undefined, poApg: undefined }]) {
      expect(usPostseason(NBA_SEASON, row as UsRow, b.ctx, b.key)).toBeNull();
    }
  });

  it('has an agreement list that fires: a point too many, a game dropped, a clincher turned, a level game', () => {
    const row = nbaRow({ teamResult: NBA_PLAYOFF_RESULTS[1], poGames: 11 });
    const b = nba('Post Broken', row);
    const p = usPostseason(NBA_SEASON, row, b.ctx, b.key)!;
    const lay = usPlayoffLay(NBA_SEASON, row, b.ctx, b.key)!;
    const copy = (): UsPostseason => JSON.parse(JSON.stringify(p));
    expect(usPostProblems(copy(), lay, row, p.held)).toEqual([]);
    const point = copy(); point.season.games[2].line.pts += 1;
    expect(usPostProblems(point, lay, row, p.held).some(x => x.startsWith('pts '))).toBe(true);
    const dropped = copy(); dropped.season.games.pop();
    expect(usPostProblems(dropped, lay, row, p.held).some(x => x.startsWith('games '))).toBe(true);
    const turned = copy(); const g = turned.season.games[turned.series[0].to - 1]; [g.us, g.them] = [g.them, g.us];
    expect(usPostProblems(turned, lay, row, p.held).some(x => x.includes('the count is wrong') || x.includes('goes on after'))).toBe(true);
    const level = copy(); level.season.games[0].them = level.season.games[0].us;
    expect(usPostProblems(level, lay, row, p.held).some(x => x.includes('level'))).toBe(true);
  });
});

describe('usPostseason, sport neutral', () => {
  it('lays out an NFL line that holds playoff numbers under the same naming rule, through the NFL bind', () => {
    /* No engine saves these fields yet (the NFL saves a sentence): the numbers below are typed for this test
       under the rule a later round will save them by ("po" plus the field), to show nothing here is the NBA's. */
    let laid = 0;
    for (const name of ['Field One', 'Field Two', 'Field Three', 'Field Four', 'Field Five', 'Field Six', 'Field Seven', 'Field Eight']) {
      const row = {
        year: 2030, team: 'BUF', age: 27, ovr: 88, games: 17, awards: [], teamResult: NFL_PLAYOFF_RESULTS[1], salary: 30,
        passYds: 4310, passTd: 31, ints: 9, poGames: 2, poPassYds: 540, poPassTd: 4, poInts: 1,
      } as UsRow;
      const b = buildUsSeason(NFL_SEASON, { name, pos: 'QB', eraId: undefined }, row, nflTeamLabelOf);
      if (!b.ok) throw new Error(b.line);
      const p = usPostseason(NFL_SEASON, row, b.ctx, b.key);
      if (!p) continue;
      laid += 1;
      expect(p.season.games.length).toBe(2);
      expect(sumOf(p, 'passTd')).toBe(4);
      expect(sumOf(p, 'passYds')).toBe(540);
      expect(sumOf(p, 'ints')).toBe(1);
      expect(p.season.games.map(g => g.us > g.them)).toEqual([true, false]);
      expect(p.season.games.every(g => g.us !== g.them && 7 * (g.line.passTd ?? 0) <= g.us)).toBe(true);
      expect(p.series.map(s => [s.need, s.most, s.from, s.to, s.won])).toEqual([[1, 1, 1, 1, true], [1, 1, 2, 2, false]]);
    }
    expect(laid).toBeGreaterThan(0);
  });
});
