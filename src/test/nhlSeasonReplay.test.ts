import { describe, expect, it } from 'vitest';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { NHL_SEASON } from '@/lib/season/nhl';
import { keyedRng } from '@/lib/keyedRng';

function fixture(pos: 'C' | 'D' | 'G', year = 2026, era: 'now' | 'y2006' = 'now', team = 'TOR', sample = 0) {
  const rng = keyedRng('hockey-season-replay|' + pos + '|' + year + '|' + sample);
  const sport = NHL_CAREER_SPORT;
  const career = sport.startCareer('Fixture Skater', pos, sport.create.archetypes[pos][0], rng, null as never, era);
  Object.assign(career, { year, team, role: sample % 3 === 1 ? 'backup' : 'starter', health: 95 - sample * 4, ovr: 82 });
  if (pos === 'G' && sample % 3 === 2) career.goalieTandem = { year, team };
  const { line } = sport.simSeason(career, 80, rng, true);
  return { career, line };
}

function open(pos: 'C' | 'D' | 'G', year = 2026, era: 'now' | 'y2006' = 'now', team = 'TOR') {
  const { career, line } = fixture(pos, year, era, team);
  const before = JSON.stringify({ career, line });
  const a = NHL_SEASON.prepare(career, { ...line }, NHL_CAREER_SPORT.teamLabelOf);
  expect(a).not.toBeNull();
  expect(NHL_SEASON.prepare(career, { ...line }, NHL_CAREER_SPORT.teamLabelOf)).toEqual(a);
  expect(JSON.stringify({ career, line })).toBe(before);
  return { ...a!, line, career };
}

describe('NHL My Career regular-season replay', () => {
  it('fits the actual skater totals to a coherent 84-game, 42-home schedule', () => {
    const { season, line, ctx } = open('C');
    const games = season.games;
    expect(games).toHaveLength(84);
    expect(games.filter(game => game.home)).toHaveLength(42);
    expect(games.filter(game => game.played)).toHaveLength(line.games);
    expect(games.reduce((sum, game) => sum + (game.line.goals ?? 0), 0)).toBe(line.goals);
    expect(games.reduce((sum, game) => sum + (game.line.assists ?? 0), 0)).toBe(line.assists);
    expect(games.reduce((sum, game) => sum + (game.line.points ?? 0), 0)).toBe(line.points);
    expect(new Set(games.map(game => game.opp)).size).toBe(31);
    for (let id = 1; id < 32; id++) {
      const series = games.filter(game => game.opp === id);
      const homes = series.filter(game => game.home).length;
      if (id <= ctx.divSlots) expect([series.length, homes]).toEqual([4, 2]);
      else if (id <= ctx.confSlots) expect(series.length === 3 && (homes === 1 || homes === 2)).toBe(true);
      else expect([series.length, homes]).toEqual([2, 1]);
    }
    for (const game of games) {
      expect(game.us).not.toBe(game.them);
      expect((game.line.goals ?? 0) + (game.line.assists ?? 0)).toBeLessThanOrEqual(game.us);
      expect(game.events.filter(event => event.side === 'us').reduce((sum, event) => sum + (event.pts ?? 0), 0)).toBe(game.us);
      expect(game.events.filter(event => event.side === 'them').reduce((sum, event) => sum + (event.pts ?? 0), 0)).toBe(game.them);
    }
  });

  it('matches saved goalie starts, wins and weighted save percentage', () => {
    const { season, line } = open('G');
    const starts = season.games.filter(game => game.started);
    expect(starts).toHaveLength(line.games);
    expect(starts.filter(game => game.line.goalieWin === 1)).toHaveLength(line.wins!);
    expect(starts.every(game => game.line.goalieWin === Number(game.us > game.them))).toBe(true);
    const shots = starts.reduce((sum, game) => sum + game.line.shots, 0);
    const saves = starts.reduce((sum, game) => sum + game.line.saves, 0);
    expect(Math.round(saves / shots * 1000) / 1000).toBe(line.svpct);
    expect(starts.every(game => game.line.shots - game.line.saves === game.them)).toBe(true);
    expect(season.games.filter(game => !game.started).every(game => game.line.shots === undefined)).toBe(true);
  });

  it.each([[2012, 48], [2019, 70], [2020, 56]] as const)('uses a saved %i schedule of %i games without inventing opponents', (year, length) => {
    const { season, ctx } = open('D', year, 'y2006');
    expect(season.games).toHaveLength(length);
    expect(ctx.shape).toBe(null);
    expect(season.labels.slice(1).every(label => !label.named)).toBe(true);
  });

  it('keeps a pre-84-game save on the original 82-game calendar', () => {
    const { career, line } = fixture('C');
    const saved = { ...line, slate: undefined, games: Math.min(82, line.games) };
    const replay = NHL_SEASON.prepare(career, saved, NHL_CAREER_SPORT.teamLabelOf);
    expect(replay?.season.games).toHaveLength(82);
    expect(replay?.ctx.shape).toBe(null);
  });

  it('fits the goalie’s real save from shortest, longest and pandemic schedules', () => {
    let tested = 0;
    let tandem = 0;
    for (const year of [2006, 2012, 2019, 2020, 2025, 2026, 2030]) {
      for (let seed = 0; seed < 18; seed++) {
        const { career, line } = fixture('G', year, year < 2025 ? 'y2006' : 'now', 'TOR', seed);
        const prepared = NHL_SEASON.prepare(career, { ...line }, NHL_CAREER_SPORT.teamLabelOf);
        expect(prepared, `goalie ${year}/${seed}`).not.toBeNull();
        const starts = prepared!.season.games.filter(game => game.started);
        expect(starts).toHaveLength(line.games);
        const shots = starts.reduce((sum, game) => sum + game.line.shots, 0);
        const saves = starts.reduce((sum, game) => sum + game.line.saves, 0);
        expect(Math.round(saves / shots * 1000) / 1000).toBe(line.svpct);
        expect(starts.filter(game => game.line.goalieWin === 1)).toHaveLength(line.wins!);
        if (line.tandemStarts !== undefined) {
          expect(starts.length).toBeLessThanOrEqual(line.tandemStarts);
          tandem++;
        }
        tested++;
      }
    }
    expect(tested).toBe(126);
    expect(tandem).toBe(42);
  });

  it('holds an inconsistent save rather than fabricating additional appearances', () => {
    const { career, line } = fixture('G');
    expect(NHL_SEASON.prepare(career, { ...line, wins: line.games + 1 }, NHL_CAREER_SPORT.teamLabelOf)).toBeNull();
    expect(NHL_SEASON.prepare(career, { ...line, slate: '84' }, NHL_CAREER_SPORT.teamLabelOf)).toBeNull();
  });
});
