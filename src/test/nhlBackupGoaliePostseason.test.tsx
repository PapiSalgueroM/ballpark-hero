import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import { buildUsModel } from '@/components/us-career/season/UsSeasonCentre';
import { keyedRng } from '@/lib/keyedRng';
import { getNhlLifeEventsA } from '@/lib/nhlCareerLifeA';
import { NHL_CAREER_SPORT as sport } from '@/lib/nhlCareerSport';
import { nhlWaiverExempt } from '@/lib/nhlCareerWaivers';
import { NHL_ARCHETYPES, nhlCampBattle, simNhlSeason, startNhlCareer, type NhlCareerState } from '@/lib/nhlMyCareer';
import { NHL_SEASON } from '@/lib/season/nhl';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const teamQuality = 94;
const open = () => render(<MemoryRouter><NhlMyCareerBoard /></MemoryRouter>);

function fixture(seed: number, role: NhlCareerState['role'] = 'backup', year = 2026, pos: NhlCareerState['pos'] = 'G') {
  const rng = keyedRng('nhl-playoffs-pr' + seed);
  const c = startNhlCareer('Fixture Goaltender', pos, NHL_ARCHETYPES[pos][0], rng, null, year < 2025 ? 'y2006' : 'now');
  Object.assign(c, { team: 'TOR', year, ovr: 75, pot: 99, health: 97, age: 26, role, contractYears: 3 });
  delete c.rival;
  return { c, rng };
}

function play(seed: number, role: NhlCareerState['role'] = 'backup', year = 2026, pos: NhlCareerState['pos'] = 'G') {
  const { c, rng } = fixture(seed, role, year, pos);
  if (role === 'backup') nhlCampBattle(c, teamQuality, () => 0.99);
  let draws = 0;
  const result = simNhlSeason(c, teamQuality, () => { draws++; return rng(); }, true);
  return { c, ...result, draws };
}

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('NHL backup goalie postseason starts', () => {
  it.each([
    { year: 2026, slate: 84, regularStarts: 22, playoffStarts: 6, wins: 3 },
    { year: 2012, slate: 48, regularStarts: 13, playoffStarts: 7, wins: 4 },
  ])('uses $regularStarts starts in the $slate-game season as the playoff workload', ({ year, slate, regularStarts, playoffStarts, wins }) => {
    const { c, line, notes, draws } = play(11, 'backup', year);
    expect(c.role).toBe('backup');
    expect(line).toMatchObject({
      slate, games: regularStarts, teamResult: 'WON THE STANLEY CUP', poGames: 26,
      poStarts: playoffStarts, poWins: wins, poSvpct: 0.926,
    });
    expect(c.cups).toBe(1);
    expect(draws).toBe(21);
    expect(notes).toContain(`📊 Playoffs: ${playoffStarts} starts in 26 team games, ${wins} wins, 0.926 SV%.`);
  });

  it('omits personal performance from a five-game series without any starts', () => {
    const { c, line, notes, draws } = play(123);
    expect(c.role).toBe('backup');
    expect(line).toMatchObject({ games: 15, teamResult: 'Lost in Round 1', poGames: 5, poStarts: 0 });
    expect(line).not.toHaveProperty('poWins');
    expect(line).not.toHaveProperty('poSvpct');
    expect(draws).toBe(18);
    expect(notes).toContain('📊 Playoffs: No starts in 5 team games.');
    expect(notes.some(note => /Playoff performer|You held up your end|well under your usual level/i.test(note))).toBe(false);
  });

  it('retains the starter and skater postseason lines and a legacy goalie review', () => {
    const starter = play(11, 'starter');
    expect(starter.line).toMatchObject({ games: 62, teamResult: 'WON THE STANLEY CUP', poGames: 26, poWins: 14, poSvpct: 0.926 });
    expect(starter.line).not.toHaveProperty('poStarts');
    expect(starter.draws).toBe(21);
    expect(starter.notes).toContain('📊 Playoffs: 26 games, 14 wins, 0.926 SV%.');
    const skater = play(11, 'backup', 2026, 'C');
    expect(skater.line).toMatchObject({ games: 82, teamResult: 'Lost the Cup Final', poGames: 21, poGoals: 9, poAssists: 8, poPoints: 17 });
    expect(skater.line).not.toHaveProperty('poStarts');
    expect(skater.draws).toBe(24);
    expect(sport.reviewStats(starter.line, 'G').postseason.map(({ label, value }) => [label, value])).toEqual([
      ['Games', '26'], ['Wins', '14'], ['Save percentage', '0.926'],
    ]);
  });

  it('uses the saved starts for personal stories and retains older save behavior', () => {
    const { c, line } = play(123);
    const prior = { ...line, year: 2025, games: 60, poGames: undefined, poStarts: undefined };
    const zero = { ...line, poGames: 5, poStarts: 0 };
    c.seasons = [prior, zero];
    expect(nhlWaiverExempt(c)).toBe(true);
    expect(getNhlLifeEventsA(c, () => 0.99).some(event => event.id === 'nhlA_broken_hand')).toBe(false);
    const legacy = { ...line, poStarts: undefined };
    c.seasons = [prior, legacy];
    expect(nhlWaiverExempt(c)).toBe(false);
    expect(getNhlLifeEventsA(c, () => 0.99).some(event => event.id === 'nhlA_broken_hand')).toBe(true);
  });

  it('holds the existing NHL Season Center schedule to the regular season', () => {
    const { c, line } = play(11);
    const row = { ...line };
    const prepared = NHL_SEASON.prepare(c, row, sport.teamLabelOf);
    expect(prepared).not.toBeNull();
    const { ctx, season } = prepared!;
    expect(season.games).toHaveLength(84);
    expect(season.games.filter(game => game.started)).toHaveLength(22);
    expect(NHL_SEASON.prepare(c, { ...line, poStarts: undefined, poWins: 14 }, sport.teamLabelOf)).toEqual(prepared);
    expect(buildUsModel(sport, NHL_SEASON, c, row, ctx, season, season.key).review.path).toBeUndefined();
  });

  it.each([
    { seed: 11, teamGames: 26, starts: 6, wins: 3, savePct: '0.926', note: '6 starts in 26 team games' },
    { seed: 2, teamGames: 5, starts: 1, wins: 0, savePct: '0.913', note: '1 start in 5 team games, 0 wins' },
    { seed: 123, teamGames: 5, starts: 0, wins: null, savePct: null, note: 'No starts in 5 team games' },
  ])('plays, saves, and reloads a backup goalie with $starts playoff starts', async ({ seed, teamGames, starts, wins, savePct, note }) => {
    const { c, rng } = fixture(seed);
    localStorage.setItem(sport.saveKey, JSON.stringify({ c, phase: 'season', teamQuality, coach: null }));
    const view = open();
    let campDraws = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => ++campDraws <= 2 ? 0.99 : rng());
    fireEvent.click(view.getByRole('button', { name: 'Play the 2026 season' }));
    const settled = localStorage.getItem(sport.saveKey)!;
    expect(JSON.parse(settled).c.seasons.at(-1)).toMatchObject({ poGames: teamGames, poStarts: starts });
    expect(within(view.container.querySelector('[data-season-reveal]')!).getByText(note, { exact: false })).toBeInTheDocument();
    view.unmount();

    const reloaded = open();
    fireEvent.click(await reloaded.findByRole('button', { name: /Career Log/ }));
    fireEvent.click(await reloaded.findByRole('button', { name: 'Review 2026 season' }));
    fireEvent.click(reloaded.getByRole('button', { name: 'Postseason' }));
    const stat = (label: string) => reloaded.container.querySelector(`[data-season-stat="${label}"] dd`)?.textContent;
    expect(stat('Team games')).toBe(String(teamGames));
    expect(stat('Starts')).toBe(String(starts));
    expect(stat('Wins')).toBe(wins === null ? undefined : String(wins));
    expect(stat('Save percentage')).toBe(savePct ?? undefined);
    expect(localStorage.getItem(sport.saveKey)).toBe(settled);
  });
});
