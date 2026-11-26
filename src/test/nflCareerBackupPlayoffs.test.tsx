import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import { buildUsModel } from '@/components/us-career/season/UsSeasonCentre';
import { keyedRng } from '@/lib/keyedRng';
import { nflSeasonBeats } from '@/lib/nflCareerInbox';
import { NFL_CAREER_SPORT as sport } from '@/lib/nflCareerSport';
import { NFL_PLAYOFF_RESULTS, nflCampBattle, simSeason, type CareerState } from '@/lib/nflMyCareer';
import { deriveSeasonOrWhy } from '@/lib/season/core';
import { NFL_SEASON } from '@/lib/season/nfl';
import { buildUsSeason } from '@/lib/season/us';
import { usPostseasonOrWhy } from '@/lib/season/usPlayoffs';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const teamQuality = 87;
const open = () => render(<MemoryRouter><NflMyCareerBoard /></MemoryRouter>);
const read = () => JSON.parse(localStorage.getItem(sport.saveKey)!).c as CareerState;

function fixture(role: CareerState['role'], pos: CareerState['pos'] = 'QB', era = 'now') {
  const c = sport.startCareer('Fixture Quarterback', pos, sport.create.archetypes[pos][0], keyedRng('backup-postseason-proof'), null, era);
  return { ...c, role, ovr: 78, pot: 88, age: 25, health: 100, contractYears: 3 };
}

function play(c: CareerState, wildCardOnly = false) {
  nflCampBattle(c, teamQuality, () => 0.21);
  let draws = 0;
  const { line, notes } = simSeason(c, teamQuality, () => ++draws === 10 && wildCardOnly ? 0.99 : 0.21, true);
  return { line, notes, draws };
}

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('NFL backup quarterback postseason appearances', () => {
  it('uses the backup QB exposure for passing totals and preserves the team title', () => {
    const starter = fixture('starter'), backup = fixture('backup');
    const full = play(starter), relief = play(backup);
    expect(starter.role).toBe('starter');
    expect(backup.role).toBe('backup');
    expect(full.line).toMatchObject({ games: 17, teamResult: NFL_PLAYOFF_RESULTS[4], poGames: 4, poLine: '926 yds, 6 TD, 2 INT' });
    expect(full.line).not.toHaveProperty('poPlayerGames');
    expect(relief.line).toMatchObject({ games: 4, teamResult: full.line.teamResult, poGames: 4, poPlayerGames: 1, poLine: '232 yds, 2 TD, 1 INT' });
    expect(backup.rings).toBe(starter.rings);
    expect(backup.rings).toBe(1);
    expect([full.draws, relief.draws]).toEqual([28, 27]);
    expect(relief.notes).toContain('📊 You played 1 of the team’s 4 games in the playoffs. 232 yds, 2 TD, 1 INT.');
  });

  it.each([
    { wildCard: false, teamGames: 4, apps: 1, box: '232 yds, 2 TD, 1 INT' },
    { wildCard: true, teamGames: 1, apps: 0, box: null },
  ])('keeps the $teamGames-game team path separate from player appearances', ({ wildCard, teamGames, apps, box }) => {
    const c = fixture('backup');
    const { line, notes, draws } = play(c, wildCard);
    expect(line).toMatchObject({ poGames: teamGames, poPlayerGames: apps, teamResult: NFL_PLAYOFF_RESULTS[wildCard ? 0 : 4] });
    expect(draws).toBe(wildCard ? 24 : 27);
    if (wildCard) {
      expect(line.poLine).toBeUndefined();
      expect(notes).toContain('📊 You didn’t appear in the team’s 1 game in the playoffs.');
      expect(notes).not.toEqual(expect.arrayContaining([expect.stringMatching(/January football suited you|You held up your end|well under your usual level/)]));
    }
    expect(nflSeasonBeats(c)).toContain('playoffs');
    expect(sport.reviewStats(line, 'QB').postseason.map(({ label, value }) => [label, value])).toEqual([
      ['Team games', String(teamGames)], ['Appearances', String(apps)],
      ...(box ? [['Passing yards', '232'], ['Passing touchdowns', '2'], ['Interceptions thrown', '1']] : []),
    ]);

    const saved = JSON.parse(JSON.stringify(line));
    const prepared = buildUsSeason(NFL_SEASON, c, saved, sport.teamLabelOf);
    if (prepared.ok === false) throw new Error(prepared.line);
    const derived = deriveSeasonOrWhy(prepared.sport, saved, prepared.ctx);
    if (typeof derived === 'string') throw new Error(derived);
    expect(usPostseasonOrWhy(NFL_SEASON, saved, prepared.ctx, prepared.key)).toBe('numbers');
    const path = buildUsModel(sport, NFL_SEASON, c, saved, prepared.ctx, derived, prepared.key).review.path;
    expect(path?.steps).toHaveLength(teamGames);
    const legacy = { ...saved };
    delete legacy.poPlayerGames;
    const legacyPath = buildUsModel(sport, NFL_SEASON, c, legacy, prepared.ctx, derived, prepared.key).review.path;
    expect(path?.steps).toEqual(legacyPath?.steps);
    expect(path?.line).toBe(wildCard ? 'Your playoffs: 1 team game, 0 appearances' : 'Your playoffs: 4 team games, 1 appearance, 232 yds, 2 TD, 1 INT');
  });

  it('holds a starter, a backup at another position, and a saved postseason without an appearance field', () => {
    const starter = fixture('starter');
    const before = structuredClone(starter);
    delete before.role;
    // Direct simulations treat an absent role as a starter, as older saves did.
    expect(simSeason(before, teamQuality, () => 0.21, true)).toEqual(simSeason(starter, teamQuality, () => 0.21, true));
    const wr = fixture('backup', 'WR');
    const { line } = play(wr);
    expect(wr.role).toBe('backup');
    expect(line.poGames).toBe(4);
    expect(line.poLine).toBeTruthy();
    expect(line).not.toHaveProperty('poPlayerGames');
    expect(sport.reviewStats(line, 'WR').postseason[0]).toMatchObject({ label: 'Team games', value: '4' });
    const legacy = { ...starter.seasons.at(-1)!, games: 4 };
    delete legacy.poStats;
    expect(sport.reviewStats(legacy, 'QB').postseason.map(({ label, value }) => [label, value])).toEqual([
      ['Team games', '4'], ['Performance', '926 yds, 6 TD, 2 INT'],
    ]);
  });

  it.each([false, true])('plays, saves, and reopens the backup QB postseason (wild card only: %s)', async wildCard => {
    const c = fixture('backup');
    delete c.rival;
    localStorage.setItem(sport.saveKey, JSON.stringify({ c, phase: 'season', teamQuality, coach: null }));
    const view = open();
    let draws = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => ++draws === 12 && wildCard ? 0.99 : 0.21);
    fireEvent.click(view.getByRole('button', { name: 'Play the ' + c.year + ' season' }));
    const settled = localStorage.getItem(sport.saveKey)!;
    const teamGames = wildCard ? 1 : 4;
    const apps = wildCard ? 0 : 1;
    expect(read().seasons.at(-1)).toMatchObject({ poGames: teamGames, poPlayerGames: apps });
    expect(read().seasons.at(-1)?.poLine).toBe(wildCard ? undefined : '232 yds, 2 TD, 1 INT');
    const note = wildCard ? /You didn’t appear in the team’s 1 game/ : /You played 1 of the team’s 4 games/;
    expect(within(view.container.querySelector('[data-season-reveal]')!).getByText(note)).toBeInTheDocument();
    view.unmount();

    const reloaded = open();
    fireEvent.click(await reloaded.findByRole('button', { name: /Career Log/ }));
    fireEvent.click(await reloaded.findByRole('button', { name: 'Review ' + c.year + ' season' }));
    fireEvent.click(reloaded.getByRole('button', { name: 'Postseason' }));
    const stat = (label: string) => reloaded.container.querySelector(`[data-season-stat="${label}"] dd`);
    expect(stat('Team games')).toHaveTextContent(String(teamGames));
    expect(stat('Appearances')).toHaveTextContent(String(apps));
    if (wildCard) expect(stat('Passing yards')).toBeNull();
    else {
      expect(stat('Passing yards')).toHaveTextContent('232');
      expect(stat('Passing touchdowns')).toHaveTextContent('2');
      expect(stat('Interceptions thrown')).toHaveTextContent('1');
    }
    expect(localStorage.getItem(sport.saveKey)).toBe(settled);
  });
});
