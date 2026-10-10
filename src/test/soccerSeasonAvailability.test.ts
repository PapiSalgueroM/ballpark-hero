import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FALLBACK_CLUBS, type CareerState, type SeasonRecord } from '@/lib/soccerCareerEngine';
import { buildSoccerSeasonCtx, SOCCER } from '@/lib/season/soccer';
import { deriveSeason, tableAt } from '@/lib/season/core';

afterEach(() => vi.restoreAllMocks());
const row: SeasonRecord = {
  year: 2007, age: 23, club: 'Bayern Munich', clubCountry: 'Germany', clubTier: 1,
  apps: 54, leagueApps: 35, goals: 33, assists: 22, cleanSheets: 0, yellowCards: 6, redCards: 0,
  rating: 9, ovr: 90, injury: null, injuryWeeks: 0, injurySevere: false,
  leagueTitle: true, leagueFinish: 1, leagueSize: 18, domesticCup: true, championsLeague: false,
  worldCup: false, ballonDor: true, ballonDorRank: 1, type: 'playing',
  intApps: 5, intGoals: 2, intAssists: 2, intRating: 8.3, tournament: null, tournamentResult: null,
  derbies: [{ rival: 'Dortmund', name: 'Der Klassiker', kind: 'rivalry', meetings: [
    { home: true, gf: 3, ga: 1, played: false, goals: 0 },
    { home: false, gf: 0, ga: 2, played: true, goals: 0 },
  ] }],
};
function fixture(saved = row) {
  const captured = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find((s: { id: string }) => s.id === 'ere').state;
  const career: CareerState = { ...captured, playerName: 'Agree 0.31', position: 'RW', currentClub: saved.club,
    currentClubCountry: saved.clubCountry, currentClubTier: saved.clubTier, currentLeague: 'Bundesliga',
    seasons: [saved], phone: undefined, leagueWorld: undefined };
  const ctx = buildSoccerSeasonCtx(career, FALLBACK_CLUBS, saved);
  return { career, ctx };
}
describe('saved soccer availability fits the actual calendar', () => {
  it('keeps a recorded missed derby out of a full-apps calendar without losing saved totals', () => {
    const { career, ctx } = fixture();
    const before = JSON.stringify({ career, row });
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('replay used the main RNG'); });
    const result = deriveSeason(SOCCER, row, ctx);
    expect(result).not.toBeNull();
    expect(result!.mode).toBe('table');
    expect(result!.games).toHaveLength(34);
    const played = result!.games.filter(game => game.played);
    expect(played).toHaveLength(33);
    expect(result!.bucket!.apps).toBe(21);
    expect(result!.games.filter(game => game.fixed).map(game => game.played).sort()).toEqual([false, true]);
    for (const [key, total] of [['goals', 33], ['assists', 22], ['yellow', 6], ['red', 0]] as const) {
      expect(played.reduce((sum, game) => sum + (game.line[key] ?? 0), 0) + (result!.bucket!.line[key] ?? 0)).toBe(total);
    }
    expect(tableAt(result!, result!.rounds.length)[0].slot).toBe(0);
    expect(JSON.stringify({ career, row })).toBe(before);
    expect(deriveSeason(SOCCER, row, ctx)).toEqual(result);
  });
  it('keeps an already feasible league target and its saved missed derby unchanged', () => {
    const saved = { ...row, leagueApps: 28 };
    const { ctx } = fixture(saved);
    const result = deriveSeason(SOCCER, saved, ctx)!;
    expect(result).not.toBeNull();
    expect(result.games.filter(game => game.played)).toHaveLength(28);
    expect(result.bucket!.apps).toBe(26);
    expect(result.games.filter(game => game.fixed).map(game => game.played).sort()).toEqual([false, true]);
  });
  it('keeps both saved played derbies and a full calendar when neither was missed', () => {
    const saved = { ...row, derbies: row.derbies!.map(derby => ({ ...derby, meetings: derby.meetings.map(game => ({ ...game, played: true })) })) };
    const { ctx } = fixture(saved);
    const result = deriveSeason(SOCCER, saved, ctx)!;
    expect(result).not.toBeNull();
    expect(result.games.filter(game => game.played)).toHaveLength(34);
    expect(result.bucket!.apps).toBe(20);
    expect(result.games.filter(game => game.fixed).every(game => game.played)).toBe(true);
  });
});