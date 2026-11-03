import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { getCareerTotals, initCareer, FALLBACK_CLUBS, type CareerState, type SeasonRecord } from '@/lib/soccerCareerEngine';
import {
  readCommunityShield, countCommunityShields, readGermanSupercup, countGermanSupercups,
  germanSupercupWinningSeasons, type CommunityShieldResult, type GermanSupercupResult,
} from '@/lib/soccerCareerExtraCups';
import { savedSeasonCompetitions } from '@/lib/soccerSeasonCompetitions';
import { cupCalendar, CUP_CALENDAR_NOTE } from '@/lib/soccerSeasonCalendar';
import TrophyCabinet, { trophyWins } from '@/components/soccer-career/TrophyCabinet';
import SeasonCompetitionPanel, { CompetitionNavigation } from '@/components/soccer-career/SeasonCompetitionPanel';
import SoccerSeasonCentre from '@/components/soccer-career/SoccerSeasonCentre';
import { SeasonCentre } from '@/components/season-centre/SeasonCentre';
import { CareerStatsCard, LegacyCard } from '@/pages/SoccerCareer';
import { cupSeason } from './fixtures/soccerSeasonCompetitions1173';
import { TABLE_ROW, soccerShapedModel, toySeason } from './fixtures/seasonCentreToy';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'http://stub', SUPABASE_PUBLISHABLE_KEY: 'stub' }));
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// Complete fictional saved results. No real match, natural qualification, transfer or selection is claimed.
function englishResult(club = 'Bayern Munich'): CommunityShieldResult {
  const qualification: CommunityShieldResult['qualification'] = {
    version: 1, competition: 'community-shield', status: 'ready', qualifyingYear: 2026, eventYear: 2027, seed: 1141312389,
    leagueWinner: 'Arsenal', cupWinner: 'Newcastle',
    entrants: [{ club: 'Arsenal', via: 'league-winner' }, { club: 'Newcastle', via: 'fa-cup-winner' }],
    proof: { league: { kind: 'league-world-close', year: 2026 }, cup: { kind: 'phone-world', year: 2026 } },
  };
  return { version: 1, competition: 'community-shield', qualifyingYear: 2026, eventYear: 2027, seed: 1141312389,
    qualification, entrants: copy(qualification.entrants), minutes: 90, score: [2, 1], decidedBy: 'normal-time', winner: 'Arsenal',
    player: { club, availability: 'unavailable', reason: 'not-entrant', selected: false,
      apps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: null, title: false } };
}
function savedGerman(): SeasonRecord {
  const qualification: GermanSupercupResult['qualification'] = {
    version: 1, competition: 'german-supercup', status: 'ready', qualifyingYear: 2026, eventYear: 2027, seed: 1141312389,
    leagueWinner: 'Bayern Munich', cupWinner: 'Dortmund',
    entrants: [{ club: 'Bayern Munich', via: 'league-winner' }, { club: 'Dortmund', via: 'dfb-pokal-winner' }],
    proof: { league: { kind: 'league-world-close', year: 2026 }, cup: { kind: 'phone-world', year: 2026 } },
  };
  const result: GermanSupercupResult = {
    version: 1, competition: 'german-supercup', qualifyingYear: 2026, eventYear: 2027, seed: 1141312389,
    qualification, entrants: copy(qualification.entrants), minutes: 90, score: [1, 1],
    decidedBy: 'penalties', penalties: [4, 3], winner: 'Bayern Munich', annualRating: 7.2,
    player: { club: 'Bayern Munich', availability: 'available', selected: true, apps: 1, goals: 1,
      assists: 0, cleanSheets: 0, rating: 8, title: true },
  };
  return { ...copy(cupSeason), club: 'Bayern Munich', clubCountry: 'Germany', clubTier: 1,
    domesticCup: false, cupRun: undefined, apps: 43, goals: 15, rating: 7.2,
    germanSupercup: result, extraCups: [englishResult()] };
}
function benchGerman(): SeasonRecord {
  const row = savedGerman();
  Object.assign(row, { apps: 42, goals: 14, rating: 7.2 });
  Object.assign(row.germanSupercup!.player, { selected: false, apps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: null, title: false });
  delete row.germanSupercup!.annualRating;
  return row;
}
function losingGerman(): SeasonRecord {
  const row = savedGerman();
  row.club = 'Dortmund'; row.clubTier = 2;
  row.germanSupercup!.player.club = row.club; row.germanSupercup!.player.title = false;
  row.extraCups![0].player.club = row.club;
  return row;
}
function careerFor(rows: SeasonRecord[]): CareerState {
  const stats = { pace: 71, shooting: 71, passing: 71, dribbling: 71, defending: 71, physical: 71, reflexes: 71 };
  return { ...initCareer('German Supercup UI fixture', 'Germany', 'ST', '2020s', stats, 71, 2027, FALLBACK_CLUBS, null),
    seasons: rows, lastUCLResult: null };
}
const project = (row: SeasonRecord) => savedSeasonCompetitions({ lastUCLResult: null }, row).find(item => item.id === 'german-supercup');

// JSDOM reduced-motion adapter: the exact production .cm-rise final-state declarations, after the actual styles.
// This proves reduced-motion functionality, not CSS animation, native focus geometry or browser visuals.
function mount(children: ReactNode) {
  return render(<MemoryRouter>{children}<style>{'.cm-rise { animation: none; opacity: 1; transform: none; visibility: visible; }'}</style></MemoryRouter>);
}
function acknowledge() {
  const gotIt = screen.queryByRole('button', { name: 'Got it' });
  if (gotIt) fireEvent.click(gotIt);
}
beforeEach(() => {
  localStorage.clear(); vi.useRealTimers();
  vi.stubGlobal('matchMedia', (query: string) => ({ media: query, matches: true, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('scrollTo', vi.fn());
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('German Supercup saved screen adapters', () => {
  it('SC_GERMAN_UI_RESULTS: preserves saved sides participation and the separate English world result', () => {
    const unknown = benchGerman(); unknown.germanSupercup!.player.availability = 'unknown'; unknown.germanSupercup!.player.reason = 'unresolved-rehab';
    const alias = savedGerman(); alias.club = '  BAYERN MUNICH '; alias.germanSupercup!.player.club = alias.club; alias.extraCups![0].player.club = alias.club;
    for (const [row, verdict, penalties, opponent, personal] of [
      [savedGerman(), 'Club won', '4-3 on penalties', 'Dortmund', 1],
      [benchGerman(), 'Club won', '4-3 on penalties', 'Dortmund', 0],
      [losingGerman(), 'Club lost', '3-4 on penalties', 'Bayern Munich', 0],
      [unknown, 'Club won', '4-3 on penalties', 'Dortmund', 0],
      [alias, 'Club won', '4-3 on penalties', 'Dortmund', 1],
    ] as const) {
      expect(readGermanSupercup(row), 'the complete controlled German result must pass the actual strict reader').not.toBeNull();
      expect(readCommunityShield(row), 'the separate English nonentrant record stays valid').not.toBeNull();
      const before = JSON.stringify(row), english = JSON.stringify(row.extraCups), result = project(row);
      expect(result?.result, 'SC_GERMAN_UI_SAVED_SIDE').toBe(verdict);
      expect(result!.matches).toHaveLength(1);
      expect(result!.matches[0]).toMatchObject({ opponent, goalsFor: 1, goalsAgainst: 1 });
      expect(result!.matches[0].home).toBeUndefined(); expect(result!.matches[0].neutral).toBeUndefined();
      expect(result!.matches[0].note).toContain(penalties);
      expect(result!.matches[0].note).toContain('Shootout kicks are separate');
      expect(countGermanSupercups([row])).toBe(personal); expect(countCommunityShields([row])).toBe(0);
      expect(savedSeasonCompetitions({ lastUCLResult: null }, row).some(item => item.id === 'shield')).toBe(false);
      if (row.germanSupercup!.player.selected) expect(result!.matches[0].playerGoals).toBe(1);
      else { expect(result!.matches[0].playerGoals).toBeUndefined(); expect(result!.matches[0].note).toContain('You did not play'); }
      if (row.germanSupercup!.player.reason === 'unresolved-rehab') expect(result!.matches[0].note).toContain('Rehabilitation was still pending.');
      expect(JSON.stringify(row.extraCups)).toBe(english); expect(JSON.stringify(row)).toBe(before);
    }
  });

  it('SC_GERMAN_UI_REFUSAL: omits invalid and nonentrant records and shares duplicate-edition trophy decisions', () => {
    const invalid = savedGerman(); invalid.germanSupercup!.winner = 'Dortmund';
    expect(readGermanSupercup(invalid)).toBeNull(); expect(project(invalid)).toBeUndefined();
    const nonentrant = benchGerman(); nonentrant.club = 'Arsenal'; nonentrant.clubCountry = 'England';
    nonentrant.germanSupercup!.player.club = nonentrant.club; nonentrant.extraCups![0].player.club = nonentrant.club;
    expect(readGermanSupercup(nonentrant)).toBeNull(); expect(project(nonentrant)).toBeUndefined();
    const row = savedGerman(), career = { seasons: [row, copy(row)] }, before = JSON.stringify(career);
    expect(germanSupercupWinningSeasons(career.seasons)).toEqual([]);
    expect(countGermanSupercups(career.seasons)).toBe(0);
    expect(trophyWins(career, 'german-supercup'), 'SC_GERMAN_UI_SHARED_DUPLICATE_POLICY').toEqual([]);
    expect(project(row)).toBeDefined();
    expect(trophyWins({ seasons: [row] }, 'german-supercup')).toEqual([row]);
    expect(JSON.stringify(career)).toBe(before);
  });

  it('SC_GERMAN_UI_ZERO_APPS: reaches a represented bench match through the real replay picker without league games', () => {
    const row = benchGerman();
    Object.assign(row, { apps: 0, leagueApps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: 0,
      yellowCards: 0, redCards: 0, injurySevere: true });
    expect(readGermanSupercup(row), 'the represented zero-app result must pass before mounting').not.toBeNull();
    const career = careerFor([row]), before = JSON.stringify(career), close = vi.fn();
    const view = mount(<SoccerSeasonCentre career={career} clubs={FALLBACK_CLUBS} row={null} mode="watch" onClose={close} />);
    const entry = screen.queryByRole('button', { name: /2027\/28.*Bayern Munich/ });
    expect(entry, 'SC_GERMAN_UI_ZERO_APP_ENTRY').not.toBeNull(); expect(entry).not.toBeDisabled();
    fireEvent.click(entry!); acknowledge();
    expect(view.container.querySelector('[data-centre-league-unavailable]')).not.toBeNull();
    expect(screen.queryByRole('button', { name: '▶ Kick off' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'German Supercup' }));
    fireEvent.click(view.container.querySelector('[data-centre-cup-open="0"]')!);
    expect(view.container.querySelector('[data-centre-cup-score]'), 'SC_GERMAN_UI_ZERO_APP_SAVED_SCORE').toHaveTextContent('1-1');
    expect(screen.getByText('Venue not recorded')).toBeVisible();
    expect(screen.getByText(/You did not play/)).toBeVisible(); expect(screen.queryByText(/^You scored/)).toBeNull();
    expect(countGermanSupercups(career.seasons)).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Back to your career' })); expect(close).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(career)).toBe(before); view.unmount();
    const legacy = copy(row); delete legacy.germanSupercup;
    const omitted = mount(<SoccerSeasonCentre career={careerFor([legacy])} clubs={FALLBACK_CLUBS} row={null} mode="watch" onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: /2027\/28.*Bayern Munich/ }), 'SC_GERMAN_UI_ZERO_APP_ENTRY_STAYS_NARROW').toBeNull();
    omitted.unmount();
  });

  it('SC_GERMAN_UI_PANEL: shows the saved match with unknown venue and keeps Help and Back functional', () => {
    const row = benchGerman(), career = careerFor([row]), before = JSON.stringify(career), select = vi.fn(), close = vi.fn();
    const competitions = savedSeasonCompetitions(career, row), german = project(row)!;
    expect(readGermanSupercup(row)).not.toBeNull(); expect(german).toBeDefined();
    const view = mount(<SeasonCompetitionPanel career={career} row={row} competition={german} exitLabel="Back to your career" onClose={close}
      navigation={<CompetitionNavigation league="League" competitions={competitions} screen="german-supercup" onSelect={select} />} />);
    expect(screen.getByRole('button', { name: 'German Supercup' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Saved opening match')).toBeVisible();
    fireEvent.click(view.container.querySelector('[data-centre-cup-open="0"]')!);
    expect(view.container.querySelector('[data-centre-cup-score]')).toHaveTextContent('1-1');
    expect(screen.getByText('Venue not recorded')).toBeVisible(); expect(screen.queryByText('Neutral ground')).toBeNull();
    expect(screen.getByText(/4-3 on penalties/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'How saved competitions work' }));
    expect(screen.getByText(/Pick a competition, then a game/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '‹ Back' }));
    expect(view.container.querySelector('[data-centre-cup-score]')).toHaveTextContent('1-1');
    fireEvent.click(screen.getByRole('button', { name: 'League' })); expect(select).toHaveBeenCalledExactlyOnceWith('league');
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' }); expect(close).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(career)).toBe(before);
  });

  it('SC_GERMAN_UI_CALENDAR: reveals one distinct unknown-venue opener before league one then continues', () => {
    // Existing toy league is only the shared-view fixture; this is not a naturally derived German league claim.
    const row = savedGerman(), season = toySeason(TABLE_ROW), base = soccerShapedModel(TABLE_ROW, season), select = vi.fn();
    const model = { ...base, header: { ...base.header, club: row.club }, calendar: { games: cupCalendar([project(row)!], season.games.length), note: CUP_CALENDAR_NOTE, onCompetition: select } };
    const before = JSON.stringify(model.season), view = mount(<SeasonCentre model={model} exitLabel="Back to your career" onClose={() => {}} />);
    acknowledge();
    const opening = view.container.querySelector('[data-fixture-cup="german-supercup:0"]'), first = view.container.querySelector('[data-fixture-row="1"]');
    expect(opening, 'SC_GERMAN_UI_OPENING_FIXTURE').not.toBeNull(); expect(first).not.toBeNull();
    expect(opening).toHaveAttribute('data-cup-after-league', '0');
    expect(opening!.compareDocumentPosition(first!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '▶ Kick off' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '▶ Kick off' }));
    expect(view.container.querySelector('[data-centre-calendar-cup]')).toHaveAttribute('data-centre-calendar-cup', 'german-supercup:0');
    expect(screen.getByText(/Your saved Supercup opener/)).toBeVisible();
    expect(screen.getByText('Venue not recorded')).toBeVisible(); expect(screen.queryByText('Neutral ground')).toBeNull();
    expect(view.container.querySelector('[data-calendar-cup-score]')).toBeNull();
    fireEvent.click(view.container.querySelector('[data-calendar-cup-reveal]')!);
    expect(view.container.querySelector('[data-calendar-cup-score]')).toHaveTextContent('1-1');
    expect(screen.getByText(/4-3 on penalties/)).toBeVisible(); expect(screen.getByText('You scored 1. Already included in your season totals.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open German Supercup' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Open German Supercup bracket' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open German Supercup' }));
    expect(select).toHaveBeenCalledExactlyOnceWith('german-supercup');
    fireEvent.click(view.container.querySelector('[data-calendar-cup-continue]')!);
    expect(view.container.querySelector('[data-centre-calendar-cup]')).toBeNull();
    expect(view.container.querySelector('[data-fixture-row="1"]')).toHaveAttribute('aria-current', 'true');
    expect(JSON.stringify(model.season)).toBe(before);
  });

  it('SC_GERMAN_UI_CABINET_DETAIL: shows saved penalties and contribution separately and restores the winning tile after Back', () => {
    const row = savedGerman(), career = careerFor([row]), before = JSON.stringify(career), close = vi.fn();
    expect(trophyWins(career, 'german-supercup')[0]).toBe(row);
    const view = mount(<TrophyCabinet career={career} category="german-supercup" onClose={close} />);
    fireEvent.click(screen.getByRole('button', { name: 'View German Supercup, 2027/28, Bayern Munich' }));
    expect(view.container.querySelector('[data-trophy-german-supercup-score]'), 'SC_GERMAN_UI_CABINET_SAVED_SCORE').toHaveTextContent('1-1');
    expect(view.container.querySelector('[data-trophy-german-supercup-note]')).toHaveTextContent('4-3 on penalties');
    expect(screen.getByText('Your goals in this game: 1')).toBeVisible();
    expect(screen.getByText('Venue not recorded')).toBeVisible(); expect(screen.queryByText('Neutral ground')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Club season totals' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Trophy cabinet help' }));
    expect(screen.getByText(/Only wins in your saved seasons count/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Back to season' }));
    expect(view.container.querySelector('[data-trophy-german-supercup-score]')).toHaveTextContent('1-1');
    fireEvent.click(screen.getByRole('button', { name: '‹ All wins' }));
    expect(screen.getByRole('button', { name: 'View German Supercup, 2027/28, Bayern Munich' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' }); expect(close).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(career)).toBe(before);
  });

  it('SC_GERMAN_UI_TOTALS: adds the German title to existing career and legacy displays while retaining English counts', () => {
    const german = savedGerman(), english = copy(cupSeason), played = englishResult('Arsenal');
    english.year = 2028; english.apps = 43; english.goals = 15; english.rating = 7.2;
    played.eventYear = 2028; played.qualifyingYear = 2027; played.qualification.eventYear = 2028; played.qualification.qualifyingYear = 2027;
    played.qualification.proof.league.year = 2027; played.qualification.proof.cup.year = 2027;
    played.player = { club: 'Arsenal', availability: 'available', selected: true, apps: 1, goals: 1, assists: 0, cleanSheets: 0, rating: 8, title: true };
    played.annualRating = 7.2; english.extraCups = [played];
    expect(readCommunityShield(english), 'the separate fictional English edition is complete').not.toBeNull();
    const career = careerFor([german, english]);
    Object.assign(career, { retired: true, phase: 'retired', legacy: { tier: 'SOLID PRO', score: 50, breakdown: [] } });
    const before = JSON.stringify(career), totals = getCareerTotals(career.seasons);
    expect(totals.germanSupercups).toBe(1); expect(totals.communityShields).toBe(1); expect(totals.domesticCups).toBe(1);
    const view = mount(<><CareerStatsCard career={career} totals={totals} /><LegacyCard career={career} totals={totals} onShare={() => {}} /></>);
    expect(view.container.querySelector('[data-career-stat="Trophies"]')?.firstElementChild, 'SC_GERMAN_UI_CAREER_TOTAL').toHaveTextContent('3');
    expect([...view.container.querySelectorAll('[data-beat="tile"]')].some(tile => tile.textContent === '3Trophies'), 'SC_GERMAN_UI_LEGACY_TOTAL').toBe(true);
    expect(JSON.stringify(career)).toBe(before);
  });
});
