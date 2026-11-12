import { describe, expect, it, vi } from 'vitest';
import { buildMlbPlayoffReplay } from '@/lib/season/mlbPlayoffReplay';
import { buildUsSeason, usPlayoffLay, type UsRow } from '@/lib/season/us';
import { MLB_SEASON } from '@/lib/season/mlb';
import { NBA_SEASON } from '@/lib/season/nba';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';

function row(overrides: Record<string, unknown> = {}): UsRow {
  return { year: 2030, team: 'BOS', age: 27, ovr: 80, games: 140, awards: [], salary: 1,
    avg: 0.287, hr: 24, rbi: 81, doubles: 27, sb: 12, obp: 0.35,
    teamResult: 'Lost the Division Series', poGames: 7, poLine: '9 for 28 (.321), 2 HR', ...overrides } as UsRow;
}

function prepared(saved: UsRow) {
  const built = buildUsSeason(MLB_SEASON, { name: 'Replay Prospect', pos: 'CF', eraId: 'now' }, saved, MLB_CAREER_SPORT.teamLabelOf);
  if (built.ok === false) throw new Error('The model fixture needs an actual supported MLB context');
  return built;
}

describe('MLB playoff W/L layout', () => {
  it('covers every modern finish and game count without duplicating a game or clinching early', () => {
    let layouts = 0;
    for (const [result, teamResult] of MLB_SEASON.results.entries()) {
      const rounds = MLB_SEASON.series!.slice(0, Math.min(MLB_SEASON.rounds.length, result + 1));
      const least = rounds.reduce((total, series) => total + series[0], 0);
      const most = rounds.reduce((total, series) => total + series[1], 0);
      for (let poGames = least; poGames <= most; poGames += 1) {
        const saved = row({ teamResult, poGames });
        const built = prepared(saved);
        const canonical = usPlayoffLay(MLB_SEASON, saved, built.ctx, built.key)!;
        const replay = buildMlbPlayoffReplay(MLB_SEASON, saved, built.ctx, built.key)!;
        expect(replay.games).toHaveLength(poGames);
        const identities = replay.games.map(game => `${game.series}:${game.no}`);
        expect(new Set(identities).size).toBe(poGames);
        expect(identities).toEqual(canonical.series.flatMap((series, index) => Array.from({ length: series.games! }, (_, no) => `${index}:${no + 1}`)));
        for (const [index, series] of canonical.series.entries()) {
          let mine = 0; let theirs = 0;
          for (const game of replay.games.filter(game => game.series === index)) {
            expect(mine).toBeLessThan(series.need);
            expect(theirs).toBeLessThan(series.need);
            if (game.won) mine += 1; else theirs += 1;
            expect([game.mine, game.theirs]).toEqual([mine, theirs]);
            expect(game.round).toBe(series.round);
          }
          expect(series.won ? mine : theirs).toBe(series.need);
          expect(series.won ? theirs : mine).toBe(series.games! - series.need);
        }
        expect(replay.finish).toBe(teamResult);
        layouts += 1;
      }
    }
    expect(layouts).toBe(33);
  });

  it('repeats the same layout without touching saved input or Math.random', () => {
    const saved = row();
    const before = JSON.stringify(saved);
    const built = prepared(saved);
    Object.freeze(saved);
    const random = vi.spyOn(Math, 'random');
    try {
      const first = buildMlbPlayoffReplay(MLB_SEASON, saved, built.ctx, built.key);
      expect(buildMlbPlayoffReplay(MLB_SEASON, saved, built.ctx, built.key)).toEqual(first);
      expect(JSON.stringify(saved)).toBe(before);
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });

  it('refuses absent, fractional and impossible team game counts', () => {
    for (const poGames of [undefined, 0, 1, 6.5, Number.POSITIVE_INFINITY]) {
      const saved = row({ poGames });
      const built = prepared(saved);
      expect(buildMlbPlayoffReplay(MLB_SEASON, saved, built.ctx, built.key)).toBeNull();
    }
  });

  it('refuses a missed postseason, an unknown finish, an older format and a different sport', () => {
    for (const overrides of [{ teamResult: MLB_SEASON.missed }, { teamResult: 'Unrecorded finish' }, { year: 2021 }]) {
      const saved = row(overrides);
      const built = prepared(row());
      expect(buildMlbPlayoffReplay(MLB_SEASON, saved, built.ctx, built.key)).toBeNull();
    }
    const saved = row();
    const built = prepared(saved);
    expect(buildMlbPlayoffReplay(NBA_SEASON, saved, built.ctx, built.key)).toBeNull();
  });

  it('makes no per-game score, player-stat or venue claim', () => {
    const saved = row();
    const built = prepared(saved);
    const replay = buildMlbPlayoffReplay(MLB_SEASON, saved, built.ctx, built.key)!;
    for (const game of replay.games) for (const field of ['us', 'them', 'home', 'opponent', 'line', 'ab', 'h', 'hr']) {
      expect(Object.prototype.hasOwnProperty.call(game, field), field).toBe(false);
    }
  });

  it('keeps an opaque saved aggregate verbatim without using it to invent game stats', () => {
    const saved = row();
    const built = prepared(saved);
    const first = buildMlbPlayoffReplay(MLB_SEASON, saved, built.ctx, built.key)!;
    const other = buildMlbPlayoffReplay(MLB_SEASON, { ...saved, poLine: 'A saved aggregate only' }, built.ctx, built.key)!;
    expect(other.line).toBe('A saved aggregate only');
    expect(other.games).toEqual(first.games);
    expect(buildMlbPlayoffReplay(MLB_SEASON, { ...saved, poLine: undefined }, built.ctx, built.key)!.line).toBeNull();
  });
});
