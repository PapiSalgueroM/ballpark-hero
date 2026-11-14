import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { NationsLeagueHistory } from '@/components/soccer-career/NationsLeagueCampaign';
import TrophyCabinet from '@/components/soccer-career/TrophyCabinet';
import { advanceProSeason, FALLBACK_CLUBS, getCareerTotals, initCareer, repairCareer } from '@/lib/soccerCareerEngine';
import { isSoccerCareerSave } from '@/lib/soccerCareerSave';
import { nationsLeagueCampaign, readNationsLeagueCampaign, wonNationsLeague } from '@/lib/soccerNationsLeague';
import { keyedRng } from '@/lib/keyedRng';

const form = { overall: 97, lastRating: 8, lastGoals: 28, position: 'ST', age: 26, isCaptain: false };
function career() {
  const club = FALLBACK_CLUBS.find(row => row.name === 'Arsenal')!;
  const attrs = { pace: 96, shooting: 96, passing: 96, dribbling: 96, defending: 96, physical: 96, reflexes: 96 };
  const state = initCareer('Career Prospect', 'England', 'ST', '2026', attrs, 96, 2026, FALLBACK_CLUBS);
  Object.assign(state, {
    phase: 'playing', age: 23, overall: 96, internationalCareer: true, contractYearsLeft: 4,
    currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier, currentClubColor: club.color, currentLeague: club.league,
  });
  state.seasons.push({ ...state.seasons[0], year: 2027, age: 23, club: club.name, clubCountry: club.country, clubTier: club.tier,
    type: 'playing', apps: 38, leagueApps: 32, rating: 8, goals: 24 });
  return state;
}

afterEach(() => vi.restoreAllMocks());

describe('Soccer Career Nations League season integration', () => {
  it('records a separate campaign alongside the Euros and reconciles saved caps and goals', () => {
    const start = career();
    vi.spyOn(Math, 'random').mockImplementation(keyedRng('senior season 2028'));
    const played = advanceProSeason(start, FALLBACK_CLUBS, true);
    const season = played.seasons.at(-1)!;
    const campaign = readNationsLeagueCampaign(season)!;
    expect([season.year, campaign.year, campaign.nation, campaign.selected]).toEqual([2028, 2028, 'England', true]);
    expect(campaign.apps).toBeGreaterThanOrEqual(6);
    expect(played.lastTournament?.name).toContain('Euro');
    const summer = played.lastTournament!;
    expect(season.intApps - campaign.apps - summer.playerApps).toBeGreaterThanOrEqual(1);
    expect(season.intApps - campaign.apps - summer.playerApps).toBeLessThanOrEqual(5);
    expect(played.intStats.caps - start.intStats.caps).toBe(season.intApps);
    expect(played.intStats.goals - start.intStats.goals).toBe(season.intGoals);
    expect(played.intStats.assists - start.intStats.assists).toBe(season.intAssists);
    expect(isSoccerCareerSave(played)).toBe(true);
    expect(readNationsLeagueCampaign(repairCareer(JSON.parse(JSON.stringify(played))).seasons.at(-1)!)).toEqual(campaign);
    expect(readNationsLeagueCampaign(start.seasons.at(-1)!)).toBeUndefined();
  });

  it('shows a saved report and awards a personal trophy only for a winning campaign with a cap', () => {
    const initial = career();
    const seeds = Array.from({ length: 80 }, (_, i) => `trophy fixture ${i}`);
    const winning = seeds.map(seed => nationsLeagueCampaign(2028, seed, 'France', form)!).find(campaign => campaign.result === 'Winner')!;
    expect(winning).toBeDefined();
    const won = { ...initial.seasons.at(-1)!, year: 2028, nationsLeague: winning };
    const noApps = { ...won, nationsLeague: { ...winning, apps: 0, matches: winning.matches.map(({ player: _line, ...match }) => match) } };
    expect(wonNationsLeague(won)).toBe(true);
    expect(wonNationsLeague(noApps)).toBe(false);
    expect(getCareerTotals([won]).nationsLeagues).toBe(1);
    expect(getCareerTotals([noApps]).nationsLeagues).toBe(0);
    const history = render(<NationsLeagueHistory campaigns={[winning]} />);
    fireEvent.click(screen.getByText('Nations League', { exact: true }));
    fireEvent.click(screen.getByText('2028/29 · Winner'));
    const report = screen.getByRole('region', { name: 'Nations League campaign' });
    expect(within(report).getByRole('table', { name: /Nations League Group/ })).toBeVisible();
    expect(within(report).getByRole('list', { name: 'Nations League matches' }).children).toHaveLength(winning.matches.length);
    history.unmount();
    render(<TrophyCabinet career={{ ...initial, seasons: [won] }} category="nations-league" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /View Nations League, 2028/ }));
    expect(screen.getByText('Simulated champion: France')).toBeVisible();
  });
});
