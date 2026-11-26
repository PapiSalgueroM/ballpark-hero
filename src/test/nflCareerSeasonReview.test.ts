import { describe, expect, it } from 'vitest';
import { ARCHETYPES, simSeason, startCareer, type CareerPos, type SeasonLine } from '@/lib/nflMyCareer';
import { keyedRng } from '@/lib/keyedRng';
import { nflSeasonReview } from '@/lib/usCareerSeasonReview';

const playoffFields = {
  QB: ['Passing yards', 'Passing touchdowns', 'Interceptions thrown'], RB: ['Rushing yards', 'Rushing touchdowns'],
  WR: ['Receptions', 'Receiving yards'], TE: ['Receptions', 'Receiving yards'], K: ['Field goals made', 'Field goals attempted'],
  LB: ['Tackles', 'Sacks'], EDGE: ['Tackles', 'Sacks'], CB: ['Tackles', 'Passes defended'],
};
const missed: SeasonLine = { year: 2027, age: 23, team: 'DAL', ovr: 76, games: 17, awards: [], teamResult: 'Missed the playoffs', salary: 1 };

describe('NFL Career Log saved season totals', () => {
  it.each(Object.keys(playoffFields) as CareerPos[])('reopens the exact recorded %s playoff box from the simulated season', pos => {
    const c = startCareer('Test player', pos, ARCHETYPES[pos][0], keyedRng('nfl-career-log'));
    c.role = 'starter';
    const { line } = simSeason(c, 87, () => 0.21, true);
    const saved = JSON.stringify(c.seasons.at(-1));
    expect(line.poStats).toBeDefined();
    const result = nflSeasonReview(JSON.parse(saved), pos).postseason;
    expect(result.map(r => r.label)).toEqual(['Team games', ...playoffFields[pos]]);
    const broadcast = (line.poLine!.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
    expect(result.slice(1).map(row => row.numeric?.raw)).toEqual(broadcast);
    expect(result.some(r => r.label === 'Appearances')).toBe(false);
    expect(JSON.stringify(c.seasons.at(-1))).toBe(saved);
  });

  it('shows previously hidden defensive totals, recorded zeros and actual dual-threat back production', () => {
    const read = (line: SeasonLine, pos: CareerPos) => Object.fromEntries(nflSeasonReview(line, pos).regular.map(r => [r.label, r.value]));
    expect(read({ ...missed, forcedFum: 0, sacks: 5.5 }, 'LB')).toMatchObject({ 'Forced fumbles': '0', Sacks: '5.5' });
    expect(read({ ...missed, forcedFum: 2 }, 'CB')).toMatchObject({ 'Forced fumbles': '2' });
    expect(read({ ...missed, passDef: 3 }, 'EDGE')).toMatchObject({ 'Passes defended': '3' });
    expect(read(missed, 'EDGE')).not.toHaveProperty('Passes defended');
    expect(read({ ...missed, rushYds: 400, recYds: 280 }, 'RB')).toMatchObject({ 'Yards from scrimmage': '680' });
    expect(read({ ...missed, rushYds: 400 }, 'RB')).not.toHaveProperty('Yards from scrimmage');
  });

  it('distinguishes missing the playoffs, absent legacy data and a signed player who never appeared', () => {
    const read = (s: SeasonLine) => nflSeasonReview(s, 'QB').postseason.map(r => [r.label, r.value]);
    expect(read(missed)).toEqual([['Postseason', 'Your team missed the playoffs']]);
    expect(read({ ...missed, teamResult: 'SUSPENDED' })).toEqual([['Postseason', 'Not played during this suspended season']]);
    expect(read({ ...missed, teamResult: '' })).toEqual([['Team games', 'Not recorded'], ['Performance', 'Not recorded']]);
    const old = { ...missed, teamResult: 'Lost in the Wild Card round', poGames: 1, poLine: '216 yds, 0 TD, 1 INT' };
    expect(read(old)).toEqual([['Team games', '1'], ['Performance', old.poLine]]);
    expect(read({ ...old, poStats: { passYds: 216 } })).toEqual(read(old));
    expect(read({ ...old, poPlayerGames: 0, poLine: undefined })).toEqual([['Team games', '1'], ['Appearances', '0']]);
    expect(read({ ...old, poStats: { passYds: 216, passTd: 0, ints: 1 } })).toEqual([
      ['Team games', '1'], ['Passing yards', '216'], ['Passing touchdowns', '0'], ['Interceptions thrown', '1'],
    ]);
  });
});
