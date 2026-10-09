import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { FALLBACK_CLUBS, type CareerState, type SeasonRecord } from '@/lib/soccerCareerEngine';
import { savedClubCampaign, savedSeasonCompetitions } from '@/lib/soccerSeasonCompetitions';
import SeasonCompetitionPanel, { CompetitionNavigation } from '@/components/soccer-career/SeasonCompetitionPanel';
import SoccerSeasonCentre from '@/components/soccer-career/SoccerSeasonCentre';
import { MatchClock } from '@/components/season-centre/MatchClock';
import { deriveSeason } from '@/lib/season/core';
import { buildSoccerSeasonCtx, SOCCER } from '@/lib/season/soccer';
import { soccerCardLine } from '@/lib/soccerDiscipline';
import { RESULTS_ROW, SOCCER_SHAPED, toySeason } from './fixtures/seasonCentreToy';
import { clubCampaign, competitionCareer, cupSeason, firstStageCampaign, neutralFinalCampaign, twoLegFinalCampaign, twoLegFinalSeason } from './fixtures/soccerSeasonCompetitions1173';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
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
    expect(cup.matches[3].result).toBe('Winners');
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

  it('shows both saved continental final legs, grounds and aggregate in the existing panel', () => {
    const row = { ...twoLegFinalSeason, clubCupRun: structuredClone(twoLegFinalCampaign) };
    const before = JSON.stringify(row);
    const career = { ...competitionCareer, retired: false } as CareerState;
    const club = savedSeasonCompetitions(career, row)[0];
    expect(club.name).toBe('CAF Champions League');
    expect(club.result).toBe('Winners');
    expect(club.matches.map(m => [m.round, m.opponent, m.goalsFor, m.goalsAgainst, m.home, m.playerGoals, m.note])).toEqual([
      ['Final, leg 1', 'Wydad', 2, 1, true, 1, undefined], ['Final, leg 2', 'Wydad', 1, 1, false, 0, '3-2 on aggregate'],
    ]);
    expect(savedSeasonCompetitions({ lastUCLResult: twoLegFinalCampaign }, twoLegFinalSeason)[0]).toEqual(club);
    render(<SeasonCompetitionPanel career={career} row={row} competition={club} navigation={null} exitLabel="Back to your career" onClose={() => {}} />);
    fireEvent.click(document.querySelector('[data-centre-cup-open="0"]')!);
    expect(screen.getByRole('heading', { name: 'Final, leg 1' })).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(document.querySelector('[data-centre-cup-score]')?.textContent).toBe('2-1');
    fireEvent.click(screen.getByRole('button', { name: '› Next game' }));
    expect(screen.getByRole('heading', { name: 'Final, leg 2' })).toBeInTheDocument();
    expect(screen.getByText('Away')).toBeInTheDocument();
    expect(document.querySelector('[data-centre-cup-score]')?.textContent).toBe('1-1');
    expect(screen.getByText('3-2 on aggregate')).toBeInTheDocument();
    expect(JSON.stringify(row)).toBe(before);
  });

  it('keeps a neutral single-match Champions League final without a leg or away label', () => {
    const row = { ...cupSeason, domesticCup: false, cupRun: undefined, clubCupRun: structuredClone(neutralFinalCampaign) };
    const before = JSON.stringify(row);
    const career = { lastUCLResult: null, retired: false } as CareerState;
    const club = savedSeasonCompetitions(career, row)[0];
    expect(club.matches.map(m => [m.round, m.opponent, m.goalsFor, m.goalsAgainst, m.home, m.playerGoals])).toEqual([
      ['Final', 'Barcelona', 2, 0, undefined, 1],
    ]);
    render(<SeasonCompetitionPanel career={career} row={row} competition={club} navigation={null} exitLabel="Back to your career" onClose={() => {}} />);
    fireEvent.click(document.querySelector('[data-centre-cup-open="0"]')!);
    expect(screen.getByRole('heading', { name: 'Final' })).toBeInTheDocument();
    expect(document.querySelector('[data-centre-cup-score]')?.textContent).toBe('2-0');
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.queryByText('Away')).not.toBeInTheDocument();
    expect(JSON.stringify(row)).toBe(before);
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

function centreCareer(row: SeasonRecord, extra: Partial<CareerState> = {}): CareerState {
  return {
    playerName: 'Competition fixture', position: 'ST', seasons: [row], awards: [], events: [],
    overall: 85, age: row.age, currentClub: row.club, currentClubCountry: row.clubCountry,
    currentClubTier: row.clubTier, currentClubColor: '#ef4444', phase: 'season_summary',
    pendingSummary: row, pendingBallonDor: null, lastUCLResult: clubCampaign,
    phone: { world: { year: row.year, leagues: {}, ucl: '' } }, ...extra,
  } as unknown as CareerState;
}

describe('Soccer Career competition navigation keeps the actual league view', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('seasonCentre:help', '1');
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }));
  });

  it('freezes and resumes the same live clock, pause state and completed review across cup tabs', () => {
    let now = 0, nextFrame = 0;
    const frames = new Map<number, FrameRequestCallback>();
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    const tick = () => act(() => { now += 250; const work = [...frames.values()]; frames.clear(); work.forEach(callback => callback(now)); });
    const row = { ...cupSeason, yellowCards: 4, redCards: 2, suspensionMatches: 1 };
    const career = centreCareer(row);
    const bytes = JSON.stringify(career);
    const view = render(<MemoryRouter><SoccerSeasonCentre career={career} clubs={FALLBACK_CLUBS} row={row} mode="watch" offer={false} onClose={() => {}} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Kick off/ }));
    const clock = view.container.querySelector('[data-match-clock]')!;
    for (let i = 0; i < 8; i++) tick();
    const minute = Number(clock.getAttribute('data-minute'));
    expect(minute).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'FA Cup' }));
    expect(view.container.querySelector('[data-match-clock]')).toBe(clock);
    expect(clock.closest('[data-season-centre]')).toHaveAttribute('aria-hidden', 'true');
    for (let i = 0; i < 8; i++) tick();
    expect(Number(clock.getAttribute('data-minute'))).toBe(minute);
    fireEvent.click(screen.getByRole('button', { name: 'Premier League' }));
    expect(view.container.querySelector('[data-match-clock]')).toBe(clock);
    expect(Number(clock.getAttribute('data-minute'))).toBe(minute);
    tick();
    expect(Number(clock.getAttribute('data-minute'))).toBeGreaterThan(minute);
    fireEvent.click(screen.getByRole('button', { name: /Pause/ }));
    fireEvent.click(screen.getByRole('button', { name: 'FA Cup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Premier League' }));
    expect(screen.getByRole('button', { name: /Resume/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Results' }));
    fireEvent.click(screen.getByRole('button', { name: /Sim the rest/ }));
    const review = view.container.querySelector('[data-review]');
    expect(review).not.toBeNull();
    expect(review?.textContent).toContain('Discipline: 🟨 4 yellow cards · 🟥 2 red cards in all competitions.');
    expect(review?.textContent).toContain('1 club match missed through suspension.');
    const bucket = deriveSeason(SOCCER, row, buildSoccerSeasonCtx(career, FALLBACK_CLUBS, row))!.bucket!;
    const bucketCards = soccerCardLine(bucket.line.yellow ?? 0, bucket.line.red ?? 0);
    expect(bucketCards).not.toBe('');
    expect(view.container.querySelector('[data-review-bucket]')?.textContent).toContain(bucketCards);
    fireEvent.click(screen.getByRole('button', { name: 'FA Cup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Premier League' }));
    expect(view.container.querySelector('[data-kickoff]')).toBeNull();
    expect(view.container.querySelector('[data-review]')).toBe(review);
    expect(screen.getByRole('button', { name: 'Premier League' })).toHaveFocus();
    expect(JSON.stringify(career)).toBe(bytes);
    view.unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it.each([null, 70])('a hidden instant clock does not deliver full time or a moment hold (%s)', holdAt => {
    const fullTime = vi.fn(), hold = vi.fn();
    const props = { game: toySeason(RESULTS_ROW).games[0], clock: SOCCER_SHAPED.clock, usName: 'Fixture club', themName: 'Fixture opponent',
      speed: 'results' as const, paused: false, reduced: true, onFullTime: fullTime, onHold: hold, holdAt };
    const view = render(<MatchClock {...props} active={false} />);
    expect(fullTime).not.toHaveBeenCalled();
    expect(hold).not.toHaveBeenCalled();
    view.rerender(<MatchClock {...props} active />);
    expect(holdAt === null ? fullTime : hold).toHaveBeenCalledTimes(1);
    view.rerender(<MatchClock {...props} active={false} />);
    view.rerender(<MatchClock {...props} active />);
    expect(holdAt === null ? fullTime : hold).toHaveBeenCalledTimes(1);
  });

  it('opens an old saved campaign without drawing a league table against a later world', () => {
    const row = { ...cupSeason, leagueFinish: 7, leagueSize: 20, clubCupRun: structuredClone(clubCampaign) };
    const later = { ...row, year: 2028, club: 'Chelsea', cupRun: undefined, clubCupRun: undefined, domesticCup: false };
    const career = centreCareer(row, { seasons: [row, later], currentClub: 'Chelsea',
      phone: { world: { year: 2028, leagues: {}, ucl: '' } } as CareerState['phone'], lastUCLResult: null });
    const bytes = JSON.stringify(career);
    const view = render(<MemoryRouter><SoccerSeasonCentre career={career} clubs={FALLBACK_CLUBS} row={null} mode="watch" offer={false} onClose={() => {}} /></MemoryRouter>);
    expect(view.container.querySelector('[data-replay-locked="0"]')).toBeNull();
    fireEvent.click(view.container.querySelector('[data-replay-row="0"]')!);
    expect(view.container.querySelector('[data-centre-league-unavailable]')).not.toBeNull();
    expect(view.container.querySelector('[data-match-clock]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Champions League' }));
    fireEvent.click(view.container.querySelector('[data-centre-cup-open="1"]')!);
    expect(screen.getByText('Arsenal vs Barcelona')).toBeInTheDocument();
    expect(view.container.querySelector('[data-centre-cup-score]')?.textContent).toBe('0-2');
    expect(screen.getByText('2-3 on aggregate')).toBeInTheDocument();
    expect(JSON.stringify(career)).toBe(bytes);
  });

  it('labels the current squad with its current club and upcoming year on an old replay', () => {
    const career = centreCareer(cupSeason, { currentClub: 'Chelsea', seasons: [cupSeason, { ...cupSeason, year: 2029, club: 'Chelsea' }], retired: false });
    const view = render(<SeasonCompetitionPanel career={career} row={cupSeason} competition={null} navigation={null} exitLabel="Back to your career" onClose={() => {}} />);
    expect(view.container.querySelector('[data-centre-competition-context]')?.textContent).toBe('Chelsea · Current squad · 2030/31');
    expect(view.container.querySelector('[data-centre-competition-context]')?.textContent).not.toContain('2027');
    expect(view.container.querySelector('[data-squad-tile]')).not.toBeNull();
  });
});
