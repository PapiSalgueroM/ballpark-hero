import { describe, expect, it } from 'vitest';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { MLB_SEASON } from '@/lib/season/mlb';
import { buildUsSeason, type UsRow } from '@/lib/season/us';
import { deriveSeason, type DerivedGame } from '@/lib/season/core';
import { pitchingOpportunities, placeMlbPitching } from '@/lib/season/mlbPitching';
import { keyedRng } from '@/lib/keyedRng';

function fixture(pos: 'SP' | 'RP', kind: 'setup' | 'closer' | null, seed = 0, ovr = 84, health = 96, quality = 82) {
  const rng = keyedRng('pitch-replay|' + pos + '|' + kind + '|' + seed);
  const sport = MLB_CAREER_SPORT;
  const archetypes = sport.create.archetypes[pos];
  const career = sport.startCareer('Fixture Pitcher', pos, archetypes.find(value => value.id === kind) ?? archetypes[0], rng, null as never, 'now');
  Object.assign(career, { team: 'SEA', role: 'starter', ovr, health, year: 2026 });
  const { line } = sport.simSeason(career, quality, rng, true);
  return { career, line };
}

function replay(career: ReturnType<typeof fixture>['career'], row: UsRow) {
  const built = buildUsSeason(MLB_SEASON, career, row, MLB_CAREER_SPORT.teamLabelOf);
  expect(built.ok).toBe(true);
  if (!built.ok) throw new Error('Pitching season is held');
  return deriveSeason(built.sport, row, built.ctx);
}

describe('MLB My Career pitching fixture reports', () => {
  it.each([
    ['SP', null],
    ['RP', 'setup'],
    ['RP', 'closer'],
  ] as const)('keeps each saved %s regular-season total in compatible game reports (%s)', (pos, kind) => {
    const { career, line } = fixture(pos, kind);
    if (kind === 'setup') expect(line.holds).toBeGreaterThan(line.saves!);
    if (kind === 'closer') expect(line.saves).toBeGreaterThan(line.holds!);
    const save = JSON.stringify(career);
    const result = replay(career, { ...line });
    expect(result).not.toBeNull();
    expect(replay(career, { ...line })).toEqual(result);
    expect(JSON.stringify(career)).toBe(save);
    expect(result!.games).toHaveLength(162);
    const appearances = result!.games.filter(game => game.played);
    expect(appearances).toHaveLength(line.games);
    expect(appearances.filter(game => game.started)).toHaveLength(pos === 'SP' ? line.games : 0);
    for (const key of ['wins', 'lossesP', 'so', 'saves', 'holds'] as const) {
      if (line[key] === undefined) expect(appearances.every(game => game.line[key] === undefined)).toBe(true);
      else expect(appearances.reduce((total, game) => total + game.line[key], 0)).toBe(line[key]);
    }
    for (const game of appearances) {
      if (game.line.wins || game.line.saves) expect(game.us).toBeGreaterThan(game.them);
      if (game.line.lossesP) expect(game.them).toBeGreaterThan(game.us);
      if (game.line.saves) expect(pitchingOpportunities(game).save).toBe(true);
      if (game.line.holds) expect(pitchingOpportunities(game).hold).toBe(true);
      expect(Number(!!game.line.wins) + Number(!!game.line.saves) + Number(!!game.line.holds)).toBeLessThanOrEqual(1);
      expect(game.line).not.toHaveProperty('era');
      expect(game.line).not.toHaveProperty('outs');
    }
    for (const game of result!.games) {
      expect(game.events.filter(e => e.side === 'us').reduce((total, e) => total + (e.pts ?? 0), 0)).toBe(game.us);
      expect(game.events.filter(e => e.side === 'them').reduce((total, e) => total + (e.pts ?? 0), 0)).toBe(game.them);
    }
  });

  it('rules out a shutout hold and distinguishes a walk-off from an away save', () => {
    const game = (home: boolean, us: [number, number], them: [number, number]): DerivedGame => ({
      md: 1, opp: 1, home, played: true, started: false, fixed: false, us: us[1], them: them[1], line: {},
      events: [
        ...(us[1] ? [{ side: 'us' as const, min: us[0], pts: us[1], kind: 'inning' }] : []),
        ...(them[1] ? [{ side: 'them' as const, min: them[0], pts: them[1], kind: 'inning' }] : []),
      ],
    });
    expect(pitchingOpportunities(game(false, [1, 0], [2, 6]))).toMatchObject({ save: false, hold: false });
    expect(pitchingOpportunities(game(true, [9, 1], [1, 0]))).toMatchObject({ save: false, hold: false });
    expect(pitchingOpportunities(game(false, [9, 1], [1, 0]))).toMatchObject({ save: true, hold: false });
    expect(pitchingOpportunities(game(false, [5, 2], [9, 4]))).toEqual({ save: false, hold: true, holdLoss: true });
    const walkoff = game(true, [9, 1], [1, 0]);
    const { line } = fixture('RP', 'closer');
    expect(placeMlbPitching([walkoff], { ...line, games: 1, wins: 0, lossesP: 0, saves: 1, holds: 0, so: 2 }, 'RP', keyedRng('walkoff'))).toBe(true);
    expect(walkoff.line).toEqual({ so: 2 });
  });

  it('keeps old missing bullpen fields missing and omits incompatible game decisions', () => {
    const { career, line } = fixture('RP', 'setup');
    const old = replay(career, { ...line, seasonRating: undefined, saves: undefined, holds: undefined });
    expect(old).not.toBeNull();
    expect(old!.games.filter(game => game.played).every(game => game.line.holds === undefined && game.line.saves === undefined)).toBe(true);
    const incompatible = replay(career, { ...line, wins: line.games, saves: line.games });
    const appearances = incompatible!.games.filter(game => game.played);
    expect(appearances).toHaveLength(line.games);
    expect(appearances.reduce((total, game) => total + game.line.so, 0)).toBe(line.so);
    expect(appearances.every(game => game.line.wins === undefined && game.line.saves === undefined)).toBe(true);
  });

  it('replays actual engine rows across ratings, health and team strength', () => {
    const roles = [['SP', null], ['RP', 'setup'], ['RP', 'closer']] as const;
    for (const [pos, kind] of roles) {
      for (let i = 0; i < 40; i++) {
        const { career, line } = fixture(pos, kind, i, 49 + (i * 7) % 50, 38 + (i * 11) % 63, 43 + (i * 9) % 53);
        const season = replay(career, { ...line });
        expect(season, JSON.stringify({ pos, kind, i, line })).not.toBeNull();
        expect(season!.games.filter(game => game.played)).toHaveLength(line.games);
      }
    }
  });
});
