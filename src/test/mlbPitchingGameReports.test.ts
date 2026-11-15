import { describe, expect, it } from 'vitest';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { MLB_SEASON } from '@/lib/season/mlb';
import { buildUsSeason, type UsRow } from '@/lib/season/us';
import { deriveSeason } from '@/lib/season/core';
import { keyedRng } from '@/lib/keyedRng';

function fixture(pos: 'SP' | 'RP', kind: 'setup' | 'closer' | null, seed = 0, ovr = 84, health = 96, quality = 82) {
  const rng = keyedRng('pitch-replay|' + pos + '|' + kind + '|' + seed);
  const sport = MLB_CAREER_SPORT;
  const career = sport.startCareer('Fixture Pitcher', pos, sport.create.archetypes[pos][0], rng, null as never, 'now');
  Object.assign(career, { team: 'SEA', role: 'starter', ovr, health, year: 2026 });
  if (kind) career.bullpenAssignment = { year: career.year, team: career.team, role: kind };
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
      expect(Number(!!game.line.wins) + Number(!!game.line.saves) + Number(!!game.line.holds)).toBeLessThanOrEqual(1);
      expect(game.line).not.toHaveProperty('era');
      expect(game.line).not.toHaveProperty('outs');
    }
    for (const game of result!.games) {
      expect(game.events.filter(e => e.side === 'us').reduce((total, e) => total + (e.pts ?? 0), 0)).toBe(game.us);
      expect(game.events.filter(e => e.side === 'them').reduce((total, e) => total + (e.pts ?? 0), 0)).toBe(game.them);
    }
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
