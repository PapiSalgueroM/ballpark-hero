import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { savedClubCampaign, savedSeasonCompetitions } from '@/lib/soccerSeasonCompetitions';
import SeasonCompetitionPanel, { CompetitionNavigation } from '@/components/soccer-career/SeasonCompetitionPanel';
import { clubCampaign, competitionCareer, cupSeason, firstStageCampaign } from './fixtures/soccerSeasonCompetitions1173';

afterEach(cleanup);
describe('saved Soccer Career competitions', () => {
  it('copies the named cup, known scores and penalties without inventing early fixtures or grounds', () => {
    const before = JSON.stringify(cupSeason);
    const cup = savedSeasonCompetitions(competitionCareer, cupSeason)[0];
    expect(cup.name).toBe('FA Cup');
    expect(cup.result).toBe('Winners');
    expect(cup.matches.map(m => m.opponent)).toEqual([null, 'Chelsea', 'Liverpool', 'Newcastle']);
    expect(cup.matches.map(m => [m.goalsFor, m.goalsAgainst])).toEqual([[null, null], [2, 1], [1, 0], [1, 1]]);
    expect(cup.matches.every(m => m.home === undefined)).toBe(true);
    expect(cup.matches[3].note).toBe('5-4 on penalties');
    expect(JSON.stringify(cupSeason)).toBe(before);
  });

  it('keeps European legs and the deciding aggregate on their saved scores', () => {
    const club = savedSeasonCompetitions(competitionCareer, cupSeason)[1];
    expect(club.name).toBe('Champions League');
    expect(club.matches.map(m => [m.opponent, m.goalsFor, m.goalsAgainst, m.home])).toEqual([
      ['Barcelona', 2, 1, true], ['Barcelona', 0, 2, false],
    ]);
    expect(club.matches[0].note).toBeUndefined();
    expect(club.matches[1].note).toBe('2-3 on aggregate');
    expect(club.matches[1].result).toBe('Out');
  });

  it('refuses an unanchored result and a different year or club', () => {
    expect(savedClubCampaign({ lastUCLResult: { ...clubCampaign, seasonYear: undefined, club: undefined } }, cupSeason)).toBeNull();
    expect(savedClubCampaign(competitionCareer, { ...cupSeason, year: 2026 })).toBeNull();
    expect(savedClubCampaign(competitionCareer, { ...cupSeason, club: 'Chelsea' })).toBeNull();
  });

  it('keeps the actual saved group or league-phase nights when there were no knockouts', () => {
    const club = savedSeasonCompetitions({ lastUCLResult: firstStageCampaign }, cupSeason)[1];
    expect(club.result).toBe('League Phase');
    expect(club.matches.map(m => [m.round, m.opponent, m.goalsFor, m.goalsAgainst])).toEqual([
      ['League phase, game 1', 'Juventus', 0, 1], ['League phase, game 2', 'Dortmund', 1, 1],
    ]);
  });

  it('reads a season-owned snapshot after the latest club campaign has changed', () => {
    const row = { ...cupSeason, clubCupRun: structuredClone(clubCampaign) };
    const career = { lastUCLResult: { ...clubCampaign, seasonYear: 2028, club: 'Chelsea' } };
    expect(savedClubCampaign(career, row)).toEqual(clubCampaign);
    expect(savedClubCampaign(career, row)).not.toBe(career.lastUCLResult);
    expect(savedSeasonCompetitions(career, row)[1].matches[0].goalsFor).toBe(2);
  });

  it('does not add a competition to an old row without participation evidence', () => {
    const row = { ...cupSeason, cupRun: undefined, domesticCup: false };
    expect(savedSeasonCompetitions({ lastUCLResult: null }, row)).toEqual([]);
    const won = savedSeasonCompetitions({ lastUCLResult: null }, { ...row, clubCupTitle: 'Saved club cup' });
    expect(won).toMatchObject([{ name: 'Saved club cup', result: 'Winners', matches: [] }]);
    expect(savedSeasonCompetitions({ lastUCLResult: null }, { ...row, championsLeague: true })[0].name).toBe('European club cup');
  });

  it('shows missing cup final scores instead of borrowing a score from another stage', () => {
    const row = { ...cupSeason, cupRun: { ...cupSeason.cupRun!, final: undefined } };
    const final = savedSeasonCompetitions({ lastUCLResult: null }, row)[0].matches[3];
    expect([final.goalsFor, final.goalsAgainst]).toEqual([null, null]);
  });

  it('opens the recorded score tile, returns to the compact grid and writes no save', () => {
    const before = JSON.stringify(cupSeason);
    const competition = savedSeasonCompetitions(competitionCareer, cupSeason)[0];
    render(<SeasonCompetitionPanel career={{ ...competitionCareer, retired: false } as CareerState} row={cupSeason} competition={competition}
      navigation={null} exitLabel="Back to your career" onClose={() => {}} />);
    fireEvent.click(document.querySelector('[data-centre-cup-open="1"]')!);
    expect(screen.getByText('Arsenal vs Chelsea')).toBeInTheDocument();
    expect(document.querySelector('[data-centre-cup-score]')?.textContent).toBe('2-1');
    expect(document.querySelector('[data-centre-cup-game] h3')).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '‹ All games' }));
    expect(document.querySelectorAll('[data-centre-cup-open]')).toHaveLength(4);
    expect(JSON.stringify(cupSeason)).toBe(before);
  });

  it('the switcher names recorded competitions and identifies the squad as current', () => {
    render(<CompetitionNavigation league="Premier League" competitions={savedSeasonCompetitions(competitionCareer, cupSeason)} screen="league" onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'FA Cup' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Champions League' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Current squad' })).toBeInTheDocument();
  });
});
