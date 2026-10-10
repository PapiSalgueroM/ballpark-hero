import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import TrophyCabinet, { TrophyClubCampaign } from '@/components/soccer-career/TrophyCabinet';
import type { CareerState, SeasonRecord, UCLResult } from '@/lib/soccerCareerEngine';
import { cupSeason, neutralFinalCampaign, twoLegFinalCampaign, twoLegFinalSeason } from './fixtures/soccerSeasonCompetitions1173';

// Fictional saved career outcomes, not historical match results.
const campaign = (): UCLResult => ({
  seasonYear: 2027, club: 'Arsenal', qualified: true, competition: 'Champions League',
  result: 'Winners', playerGoals: 4, isTopScorer: false,
  firstStage: { kind: 'leaguePhase', through: true, stages: [{
    label: 'League phase', position: 1, of: 36, footnote: 'Saved test stage',
    myRow: { club: 'Arsenal', w: 1, d: 1, l: 0, gf: 3, ga: 1, pts: 4 },
    games: [
      { matchday: 1, opponent: 'Juventus', home: true, goalsFor: 2, goalsAgainst: 0, playerGoals: 1 },
      { matchday: 2, opponent: 'Dortmund', home: false, goalsFor: 1, goalsAgainst: 1, playerGoals: 0 },
    ],
  }] },
  matches: [
    { round: 'QF', opponent: 'Barcelona', leg: 1, home: true, goalsFor: 1, goalsAgainst: 0, playerGoals: 1, won: true },
    { round: 'QF', opponent: 'Barcelona', leg: 2, home: false, goalsFor: 1, goalsAgainst: 2, playerGoals: 0, won: true, aggFor: 2, aggAgainst: 2, decidedBy: 'awayGoals' },
    { round: 'SF', opponent: 'Inter Milan', leg: 1, home: false, goalsFor: 1, goalsAgainst: 1, playerGoals: 0, won: true },
    { round: 'SF', opponent: 'Inter Milan', leg: 2, home: true, goalsFor: 2, goalsAgainst: 1, playerGoals: 1, won: true, aggFor: 3, aggAgainst: 2, decidedBy: 'extraTime', afterExtraTime: true, etFor: 1, etAgainst: 0 },
    { round: 'Final', opponent: 'Liverpool', leg: 1, home: false, goalsFor: 2, goalsAgainst: 2, playerGoals: 1, won: true, decidedBy: 'penalties', afterExtraTime: true, etFor: 1, etAgainst: 1, pensFor: 5, pensAgainst: 4 },
  ],
});
const rowWith = (run: UCLResult | undefined = campaign(), changes: Partial<SeasonRecord> = {}): SeasonRecord => ({
  ...cupSeason, domesticCup: false, cupRun: undefined, championsLeague: true, goals: 27, clubCupRun: run, ...changes,
});
const careerWith = (rows: SeasonRecord[], latest: UCLResult | null = null): CareerState => ({
  playerName: 'Campaign Tester', nationality: 'England', position: 'ST', currentClub: 'Chelsea', seasons: rows,
  awards: [], lastUCLResult: latest,
} as CareerState);
const field = (scope: Element, name: string) => scope.querySelector(`[data-trophy-campaign-${name}]`)?.textContent ?? null;
const open = (container: HTMLElement, year = 2027) => fireEvent.click(container.querySelector(`[data-trophy-win="${year}"]`)!);
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.body.style.overflow = ''; document.body.style.paddingRight = ''; });

describe('recorded club trophy campaigns', () => {
  it('shows every first-stage game and knockout leg in saved order with exact scores and player goals', () => {
    const row = rowWith();
    const view = render(<TrophyCabinet career={careerWith([row])} category="ucl" onClose={vi.fn()} />);
    open(view.container);
    const scope = view.getByRole('region', { name: 'Saved club cup campaign' });
    expect(field(scope, 'name')).toBe('Champions League');
    expect(field(scope, 'result')).toBe('Winners');
    const games = [...scope.querySelectorAll('[data-trophy-campaign-match]')];
    expect(games.map(game => [field(game, 'round'), field(game, 'opponent'), field(game, 'score'), field(game, 'home'), field(game, 'player-goals')])).toEqual([
      ['League phase, game 1', 'Juventus', '2-0', 'Home', 'Your goals in this game: 1'],
      ['League phase, game 2', 'Dortmund', '1-1', 'Away', 'Your goals in this game: 0'],
      ['Quarter-final, leg 1', 'Barcelona', '1-0', 'Home', 'Your goals in this game: 1'],
      ['Quarter-final, leg 2', 'Barcelona', '1-2', 'Away', 'Your goals in this game: 0'],
      ['Semi-final, leg 1', 'Inter Milan', '1-1', 'Away', 'Your goals in this game: 0'],
      ['Semi-final, leg 2', 'Inter Milan', '2-1', 'Home', 'Your goals in this game: 1'],
      ['Final', 'Liverpool', '2-2', null, 'Your goals in this game: 1'],
    ]);
    expect(games.map(game => game.getAttribute('data-trophy-campaign-match'))).toEqual(['0', '1', '2', '3', '4', '5', '6']);
  });

  it('keeps away-goals, aggregate, extra-time goals and penalties separate from the saved match score', () => {
    const row = rowWith();
    const view = render(<TrophyClubCampaign career={careerWith([row])} row={row} />);
    const games = view.container.querySelectorAll('[data-trophy-campaign-match]');
    expect(field(games[3], 'note')).toBe('2-2 on aggregate · Settled on away goals');
    expect(field(games[5], 'score')).toBe('2-1');
    expect(field(games[5], 'note')).toBe('3-2 on aggregate · After extra time');
    expect(field(games[5], 'extra-time')).toBe('Goals in extra time: 1-0 (included in the score).');
    expect(field(games[6], 'score')).toBe('2-2');
    expect(field(games[6], 'note')).toBe('5-4 on penalties');
    expect(field(games[6], 'extra-time')).toBe('Goals in extra time: 1-1 (included in the score).');
  });

  it('separates season totals, campaign goals and goals in individual games', () => {
    const row = rowWith();
    const view = render(<TrophyCabinet career={careerWith([row])} category="ucl" onClose={vi.fn()} />);
    open(view.container);
    const seasonTotals = view.getByRole('region', { name: 'Club season totals' });
    expect(within(seasonTotals).getByText('Goals', { selector: 'dt' }).nextElementSibling?.textContent).toBe('27');
    expect(view.getByText('Your saved campaign goals: 4')).toBeVisible();
    expect(view.container.querySelectorAll('[data-trophy-campaign-player-goals]')).toHaveLength(7);
    expect(view.getByText("Saved simulated campaign. Scores are from Arsenal's side.")).toBeVisible();
  });

  it('reads a season-owned campaign instead of a newer campaign from another club', () => {
    const run = campaign();
    const row = rowWith(run);
    const latest = { ...campaign(), club: 'Chelsea', seasonYear: 2029, competition: 'Newer cup', matches: [{ ...run.matches[0], opponent: 'Newest opponent' }] };
    const view = render(<TrophyClubCampaign career={careerWith([row], latest)} row={row} />);
    expect(view.queryByText('Newer cup')).toBeNull();
    expect(view.queryByText('Newest opponent')).toBeNull();
    expect(view.getByText('Champions League')).toBeVisible();
    expect(view.container.querySelectorAll('[data-trophy-campaign-match]')).toHaveLength(7);
  });

  it('uses the latest campaign only when its saved club and year match the selected old row', () => {
    const row = rowWith(undefined, { clubCupRun: undefined });
    const view = render(<TrophyClubCampaign career={careerWith([row], campaign())} row={row} />);
    expect(view.container.querySelectorAll('[data-trophy-campaign-match]')).toHaveLength(7);
    expect(view.queryByText('Club cup match details were not kept for this season.')).toBeNull();
  });

  it.each(['unanchored', 'year', 'club', 'invalid', 'invalid-stage'] as const)('keeps %s campaigns missing instead of inventing or borrowing games', reason => {
    const run = campaign();
    if (reason === 'unanchored') { delete run.seasonYear; delete run.club; }
    if (reason === 'year') run.seasonYear = 2028;
    if (reason === 'club') run.club = 'Chelsea';
    if (reason === 'invalid') run.matches[0].goalsFor = -1;
    if (reason === 'invalid-stage') run.firstStage!.stages[0].games[0].goalsFor = NaN;
    const invalidOwnedRun = reason === 'invalid' || reason === 'invalid-stage';
    const row = rowWith(undefined, { clubCupRun: invalidOwnedRun ? run : undefined });
    const view = render(<TrophyClubCampaign career={careerWith([row], invalidOwnedRun ? campaign() : run)} row={row} />);
    expect(view.getByText('Club cup match details were not kept for this season.')).toBeVisible();
    expect(view.container.querySelectorAll('[data-trophy-campaign-match]')).toHaveLength(0);
    expect(view.queryByText('Juventus')).toBeNull();
    expect(view.container.querySelector('[data-trophy-campaign-goals]')).toBeNull();
  });

  it('keeps an old trophy flag without guessing a competition name or final', () => {
    const row = rowWith(undefined, { year: 1994, clubCupRun: undefined });
    const view = render(<TrophyCabinet career={careerWith([row], campaign())} category="ucl" onClose={vi.fn()} />);
    open(view.container, 1994);
    expect(view.getByRole('heading', { name: 'European club title' })).toBeVisible();
    expect(view.getByText('European club cup')).toBeVisible();
    expect(view.getByText('Club cup match details were not kept for this season.')).toBeVisible();
    expect(view.queryByText('Champions League')).toBeNull();
    expect(view.container.querySelectorAll('[data-trophy-campaign-match]')).toHaveLength(0);
  });

  it('shows both saved non-European final legs and the retained simulation note', () => {
    const run = { ...twoLegFinalCampaign, simplified: 'Saved fictional format note.' };
    const row = { ...twoLegFinalSeason, clubCupTitle: 'CAF Champions League', clubCupRun: run };
    const view = render(<TrophyCabinet career={careerWith([row])} category="club" onClose={vi.fn()} />);
    open(view.container);
    const games = view.container.querySelectorAll('[data-trophy-campaign-match]');
    expect([...games].map(game => [field(game, 'round'), field(game, 'score'), field(game, 'home')])).toEqual([
      ['Final, leg 1', '2-1', 'Home'], ['Final, leg 2', '1-1', 'Away'],
    ]);
    expect(field(games[1], 'note')).toBe('3-2 on aggregate');
    expect(view.getByText('Saved fictional format note.')).toBeVisible();
  });

  it('leaves a single neutral final without a forged home or away label', () => {
    const row = rowWith(structuredClone(neutralFinalCampaign));
    const view = render(<TrophyClubCampaign career={careerWith([row])} row={row} />);
    const game = view.container.querySelector('[data-trophy-campaign-match]')!;
    expect(field(game, 'round')).toBe('Final');
    expect(field(game, 'score')).toBe('2-0');
    expect(field(game, 'home')).toBeNull();
    expect(view.queryByText('Home')).toBeNull();
    expect(view.queryByText('Away')).toBeNull();
  });

  it('marks missing penalty numbers and keeps invalid optional extra-time counts out of the display', () => {
    const run = campaign();
    const final = run.matches[run.matches.length - 1];
    delete final.pensFor;
    delete final.pensAgainst;
    final.etFor = -1;
    final.etAgainst = 0.5;
    const row = rowWith(run);
    const view = render(<TrophyClubCampaign career={careerWith([row])} row={row} />);
    const game = view.container.querySelector('[data-trophy-campaign-match="6"]')!;
    expect(field(game, 'score')).toBe('2-2');
    expect(field(game, 'note')).toBe('Settled on penalties. Penalty score not recorded.');
    expect(field(game, 'extra-time')).toBe('After extra time');
    expect(view.queryByText(/Goals in extra time: -1/)).toBeNull();
  });

  it('restores the original picked win and list scroll through detail and reopenable help', () => {
    const rows = Array.from({ length: 24 }, (_, index) => rowWith(undefined, { year: 2000 + index, clubCupRun: undefined }));
    const view = render(<TrophyCabinet career={careerWith(rows)} category="ucl" onClose={vi.fn()} />);
    const scroll = view.container.querySelector<HTMLElement>('[data-trophy-scroll]')!;
    scroll.scrollTop = 312;
    open(view.container, 2001);
    expect(scroll.scrollTop).toBe(0);
    fireEvent.click(view.getByRole('button', { name: 'Trophy cabinet help' }));
    expect(view.getByText(/Example: 27 season goals can include 3 in this cup/)).toBeVisible();
    fireEvent.click(view.getByRole('button', { name: 'Back to wins' }));
    expect(view.getByRole('heading', { name: 'European club title' })).toHaveFocus();
    fireEvent.click(view.getByRole('button', { name: '‹ All wins' }));
    expect(scroll.scrollTop).toBe(312);
    expect(view.container.querySelector('[data-trophy-win="2001"]')).toHaveFocus();
    const help = view.getByRole('button', { name: 'Trophy cabinet help' });
    fireEvent.click(help);
    fireEvent.click(view.getByRole('button', { name: 'Back to wins' }));
    expect(help).toHaveFocus();
    expect(scroll.scrollTop).toBe(312);
  });

  it('keeps the full career bytes and saved row references unchanged through all cabinet actions', () => {
    const run = campaign();
    for (const game of run.matches) Object.freeze(game);
    Object.freeze(run.matches);
    Object.freeze(run.firstStage!.stages[0].games);
    Object.freeze(run);
    const row = Object.freeze(rowWith(run));
    const source = careerWith([row], { ...campaign(), seasonYear: 2030, club: 'Chelsea' });
    Object.freeze(source.seasons);
    const before = JSON.stringify(source);
    const view = render(<TrophyCabinet career={source} category="ucl" onClose={vi.fn()} />);
    open(view.container);
    fireEvent.click(view.getByRole('button', { name: 'Trophy cabinet help' }));
    fireEvent.click(view.getByRole('button', { name: 'Back to wins' }));
    fireEvent.click(view.getByRole('button', { name: '‹ All wins' }));
    expect(source.seasons[0]).toBe(row);
    expect(row.clubCupRun).toBe(run);
    expect(JSON.stringify(source)).toBe(before);
  });

  it('does not fill in a final when a named anchored campaign kept no games', () => {
    const run = campaign();
    delete run.firstStage;
    run.matches = [];
    run.playerGoals = 0;
    const row = rowWith(run);
    const view = render(<TrophyClubCampaign career={careerWith([row])} row={row} />);
    expect(view.getByText('Champions League')).toBeVisible();
    expect(view.getByText('Winners')).toBeVisible();
    expect(view.getByText('Your saved campaign goals: 0')).toBeVisible();
    expect(view.getByText('Club cup match details were not kept for this season.')).toBeVisible();
    expect(view.container.querySelectorAll('[data-trophy-campaign-match]')).toHaveLength(0);
    expect(view.queryByText('Final')).toBeNull();
  });
  it('leaves domestic trophy details on their existing saved cup route', () => {
    const row = { ...cupSeason, domesticCup: true, clubCupRun: campaign() };
    const view = render(<TrophyCabinet career={careerWith([row])} category="domestic" onClose={vi.fn()} />);
    open(view.container);
    expect(view.getByRole('heading', { name: 'FA Cup' })).toBeVisible();
    expect(view.getByText('Final: beat Newcastle 1-1, 5-4 on penalties')).toBeVisible();
    expect(view.container.querySelector('[data-trophy-campaign]')).toBeNull();
  });
});