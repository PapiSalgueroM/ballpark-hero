import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getCareerTotals, initCareer, FALLBACK_CLUBS, type CareerState, type SeasonRecord } from '@/lib/soccerCareerEngine';
import { readCommunityShield, countCommunityShields, communityShieldWinningSeasons, type CommunityShieldResult } from '@/lib/soccerCareerExtraCups';
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

// Controlled career results, not real scores or qualification claims.
function savedShield(): SeasonRecord {
  const qualification: CommunityShieldResult['qualification'] = {
    version: 1, competition: 'community-shield', status: 'ready', qualifyingYear: 2026, eventYear: 2027, seed: 1141312389,
    leagueWinner: 'Arsenal', cupWinner: 'Newcastle',
    entrants: [{ club: 'Arsenal', via: 'league-winner' }, { club: 'Newcastle', via: 'fa-cup-winner' }],
    proof: { league: { kind: 'league-world-close', year: 2026 }, cup: { kind: 'phone-world', year: 2026 } },
  };
  const result: CommunityShieldResult = {
    version: 1, competition: 'community-shield', qualifyingYear: 2026, eventYear: 2027, seed: 1141312389,
    qualification, entrants: copy(qualification.entrants), minutes: 90, score: [1, 1], decidedBy: 'penalties', penalties: [5, 4], winner: 'Arsenal',
    player: { club: 'Arsenal', availability: 'available', selected: true, apps: 1, goals: 1, assists: 0, cleanSheets: 0, rating: 8, title: true },
  };
  return { ...copy(cupSeason), apps: cupSeason.apps + 1, goals: cupSeason.goals + 1,
    rating: Math.round((cupSeason.rating * cupSeason.apps + 8) / (cupSeason.apps + 1) * 10) / 10, extraCups: [result] };
}
function resultOf(row: SeasonRecord): CommunityShieldResult { return row.extraCups![0]; }
function benchWin(): SeasonRecord {
  const row = savedShield(), result = resultOf(row);
  Object.assign(row, { apps: cupSeason.apps, goals: cupSeason.goals, rating: cupSeason.rating });
  Object.assign(result.player, { selected: false, apps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: null, title: false });
  return row;
}
function unconfirmedAvailability(): SeasonRecord {
  const row = benchWin(); Object.assign(resultOf(row).player, { availability: 'unknown', reason: 'unresolved-rehab' }); return row;
}
function representedLoss(): SeasonRecord {
  const row = savedShield(), result = resultOf(row);
  row.club = 'Newcastle'; result.player.club = 'Newcastle'; result.player.title = false;
  return row;
}
function careerFor(rows: SeasonRecord[]): CareerState {
  const stats = { pace: 71, shooting: 71, passing: 71, dribbling: 71, defending: 71, physical: 71, reflexes: 71 };
  return { ...initCareer('Shield UI fixture', 'England', 'ST', '2020s', stats, 71, 2027, FALLBACK_CLUBS, null), seasons: rows, lastUCLResult: null };
}
const project = (row: SeasonRecord) => savedSeasonCompetitions({ lastUCLResult: null }, row).find(item => item.id === 'shield');

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Community Shield saved screen adapters', () => {
  it('SC_SHIELD_UI_RESULTS: keeps selected, bench and losing club results on their saved sides', () => {
    for (const [row, verdict, penalty, opponent, personal] of [
      [savedShield(), 'Club won', '5-4 on penalties', 'Newcastle', 1],
      [benchWin(), 'Club won', '5-4 on penalties', 'Newcastle', 0],
      [representedLoss(), 'Club lost', '4-5 on penalties', 'Arsenal', 0],
      [unconfirmedAvailability(), 'Club won', '5-4 on penalties', 'Newcastle', 0],
    ] as const) {
      expect(readCommunityShield(row), 'controlled result must pass the real reader before UI assertions').not.toBeNull();
      const before = JSON.stringify(row), shield = project(row);
      expect(shield?.result, 'SC_SHIELD_UI_RESULTS_VERDICT').toBe(verdict);
      expect(shield!.matches).toHaveLength(1);
      expect(shield!.matches[0]).toMatchObject({ opponent, goalsFor: 1, goalsAgainst: 1, neutral: true });
      expect(shield!.matches[0].home).toBeUndefined();
      expect(shield!.matches[0].note).toContain(penalty);
      expect(shield!.matches[0].note).toContain('Shootout kicks are separate');
      expect(countCommunityShields([row])).toBe(personal);
      if (resultOf(row).player.selected) expect(shield!.matches[0].playerGoals).toBe(1);
      else { expect(shield!.matches[0].playerGoals).toBeUndefined(); expect(shield!.matches[0].note).toContain('You did not play'); }
      if (resultOf(row).player.reason === 'unresolved-rehab') {
        expect(shield!.matches[0].note).toContain('Rehabilitation was still pending.');
        expect(shield!.matches[0].note).not.toContain('unresolved-rehab');
      }
      expect(JSON.stringify(row)).toBe(before);
    }
  });

  it('SC_SHIELD_UI_REFUSAL: reaches a represented zero-app match while refusing nonentrant invalid and duplicate titles', () => {
    const worldOnly = benchWin(), result = resultOf(worldOnly);
    worldOnly.club = 'Shield Fixture Town'; result.player.club = worldOnly.club; result.player.availability = 'unavailable'; result.player.reason = 'not-entrant';
    expect(readCommunityShield(worldOnly), 'controlled nonentrant record must remain a valid saved club result').not.toBeNull();
    expect(project(worldOnly), 'SC_SHIELD_UI_NONENTRANT_OMITTED').toBeUndefined();
    const invalid = savedShield(); resultOf(invalid).winner = 'Newcastle';
    expect(readCommunityShield(invalid)).toBeNull(); expect(project(invalid)).toBeUndefined();
    const row = savedShield(), duplicate = copy(row), career = { seasons: [row, duplicate] };
    const before = JSON.stringify(career);
    expect(communityShieldWinningSeasons(career.seasons)).toEqual([]);
    expect(countCommunityShields(career.seasons)).toBe(0);
    expect(trophyWins(career, 'shield'), 'SC_SHIELD_UI_DUPLICATE_CABINET').toEqual([]);
    expect(project(row)!.matches[0].note).not.toContain('You won a personal');
    expect(trophyWins({ seasons: [row] }, 'shield')[0]).toBe(row);
    expect(JSON.stringify(career)).toBe(before);
    const zero = benchWin();
    Object.assign(zero, { apps: 0, leagueApps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: 0,
      yellowCards: 0, redCards: 0, domesticCup: false, cupRun: undefined, injurySevere: true });
    expect(readCommunityShield(zero), 'zero-app represented fixture must pass the real result reader').not.toBeNull();
    const zeroCareer = careerFor([zero]), zeroBefore = JSON.stringify(zeroCareer);
    const view = render(<MemoryRouter><SoccerSeasonCentre career={zeroCareer} clubs={FALLBACK_CLUBS} row={null} mode="watch" onClose={() => {}} /></MemoryRouter>);
    const entry = screen.queryByRole('button', { name: /2027\/28.*Arsenal/ });
    expect(entry, 'SC_SHIELD_UI_ZERO_APP_ENTRY').not.toBeNull();
    expect(entry).not.toBeDisabled(); fireEvent.click(entry!);
    const gotIt = screen.queryByRole('button', { name: /Got it/ }); if (gotIt) fireEvent.click(gotIt);
    fireEvent.click(screen.getByRole('button', { name: 'Community Shield' }));
    const dialog = screen.getByRole('dialog', { name: 'Community Shield' });
    fireEvent.click(dialog.querySelector('[data-centre-cup-open="0"]')!);
    expect(dialog.querySelector('[data-centre-cup-score]'), 'SC_SHIELD_UI_ZERO_APP_SAVED_SCORE').toHaveTextContent('1-1');
    expect(screen.getByText(/You did not play/)).toBeVisible();
    expect(JSON.stringify(zeroCareer)).toBe(zeroBefore); view.unmount();
    const nonentrant = copy(zero);
    nonentrant.club = 'Shield Fixture Town';
    Object.assign(resultOf(nonentrant).player, { club: nonentrant.club, availability: 'unavailable', reason: 'not-entrant' });
    expect(readCommunityShield(nonentrant)).not.toBeNull();
    const legacyZero = copy(zero); delete legacyZero.extraCups;
    for (const omitted of [nonentrant, legacyZero]) {
      const unavailable = render(<MemoryRouter><SoccerSeasonCentre career={careerFor([omitted])} clubs={FALLBACK_CLUBS} row={null} mode="watch" onClose={() => {}} /></MemoryRouter>);
      expect(screen.queryByText(`2027/28 · ${omitted.club}`), 'SC_SHIELD_UI_ZERO_APP_ENTRY_STAYS_NARROW').toBeNull();
      unavailable.unmount();
    }
  });

  it('SC_SHIELD_UI_PANEL: shows an unused club win with its score, neutral venue and reopenable worked help', () => {
    const row = benchWin(), career = careerFor([row]), before = JSON.stringify(career), select = vi.fn(), close = vi.fn();
    expect(readCommunityShield(row)).not.toBeNull();
    const competitions = savedSeasonCompetitions(career, row), shield = competitions.find(item => item.id === 'shield')!;
    const view = render(<SeasonCompetitionPanel career={career} row={row} competition={shield} exitLabel="Back to your career" onClose={close}
      navigation={<CompetitionNavigation league="League" competitions={competitions} screen="shield" onSelect={select} />} />);
    expect(screen.getByRole('button', { name: 'Community Shield' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(view.container.querySelector('[data-centre-cup-open="0"]')!);
    expect(view.container.querySelector('[data-centre-cup-score]'), 'SC_SHIELD_UI_PANEL_SCORE').toHaveTextContent('1-1');
    expect(screen.getByText('Neutral ground')).toBeVisible();
    expect(screen.getByText(/You did not play/)).toBeVisible();
    expect(screen.queryByText(/^You scored/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'How saved competitions work' }));
    expect(screen.getByText(/Example: 1-1 and 5-4 on penalties stays a 1-1 match/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '‹ Back' }));
    expect(view.container.querySelector('[data-centre-cup-score]')).toHaveTextContent('1-1');
    fireEvent.click(screen.getByRole('button', { name: 'League' })); expect(select).toHaveBeenCalledExactlyOnceWith('league');
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' }); expect(close).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(career)).toBe(before);
  });

  it('SC_SHIELD_UI_CALENDAR: reveals the saved opening before game one then continues without changing the season', () => {
    const row = savedShield(), season = toySeason(TABLE_ROW), base = soccerShapedModel(TABLE_ROW, season), select = vi.fn();
    const model = { ...base, header: { ...base.header, club: row.club }, calendar: { games: cupCalendar([project(row)!], season.games.length), note: CUP_CALENDAR_NOTE, onCompetition: select } };
    const before = JSON.stringify(model.season), view = render(<MemoryRouter><SeasonCentre model={model} exitLabel="Back to your career" onClose={() => {}} /></MemoryRouter>);
    const gotIt = screen.queryByRole('button', { name: /Got it/ }); if (gotIt) fireEvent.click(gotIt);
    const opening = view.container.querySelector('[data-fixture-cup="shield:0"]')!, first = view.container.querySelector('[data-fixture-row="1"]')!;
    expect(opening, 'SC_SHIELD_UI_OPENING_FIXTURE').not.toBeNull();
    expect(opening.getAttribute('data-cup-after-league')).toBe('0');
    expect(opening.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '▶ Kick off' }));
    expect(view.container.querySelector('[data-centre-calendar-cup]')).toHaveAttribute('data-centre-calendar-cup', 'shield:0');
    expect(view.container.querySelector('[data-calendar-cup-score]')).toBeNull();
    expect(screen.getByText('Neutral ground')).toBeVisible();
    fireEvent.click(view.container.querySelector('[data-calendar-cup-reveal]')!);
    expect(view.container.querySelector('[data-calendar-cup-score]')).toHaveTextContent('1-1');
    expect(screen.getByText(/5-4 on penalties/)).toBeVisible();
    fireEvent.click(view.container.querySelector('[data-calendar-cup-competition]')!); expect(select).toHaveBeenCalledExactlyOnceWith('shield');
    fireEvent.click(view.container.querySelector('[data-calendar-cup-continue]')!);
    expect(view.container.querySelector('[data-centre-calendar-cup]')).toBeNull();
    expect(view.container.querySelector('[data-fixture-row="1"]')).toHaveAttribute('aria-current', 'true');
    expect(JSON.stringify(model.season)).toBe(before);
  });

  it('SC_SHIELD_UI_CABINET_DETAIL: keeps the original win row and shows the same saved match separately from season totals', () => {
    const row = savedShield(), career = careerFor([row]), before = JSON.stringify(career), close = vi.fn();
    expect(trophyWins(career, 'shield')[0]).toBe(row);
    const view = render(<TrophyCabinet career={career} category="shield" onClose={close} />);
    fireEvent.click(screen.getByRole('button', { name: 'View Community Shield, 2027/28, Arsenal' }));
    expect(view.container.querySelector('[data-trophy-shield-score]'), 'SC_SHIELD_UI_CABINET_SAVED_SCORE').toHaveTextContent('1-1');
    expect(view.container.querySelector('[data-trophy-shield-note]')).toHaveTextContent('5-4 on penalties');
    expect(screen.getByText('Your goals in this game: 1')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Club season totals' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Trophy cabinet help' }));
    expect(screen.getByText(/A personal Community Shield win needs a valid saved appearance/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Back to season' }));
    expect(view.container.querySelector('[data-trophy-shield-score]')).toHaveTextContent('1-1');
    fireEvent.click(screen.getByRole('button', { name: '‹ All wins' }));
    expect(screen.getByRole('button', { name: 'View Community Shield, 2027/28, Arsenal' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' }); expect(close).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(career)).toBe(before);
  });

  it('SC_SHIELD_UI_TOTALS: shows the separate personal title in career and legacy totals without changing other counters', () => {
    const row = savedShield(), career = careerFor([row]);
    Object.assign(career, { retired: true, phase: 'retired', legacy: { tier: 'SOLID PRO', score: 50, breakdown: [] } });
    const before = JSON.stringify(career), totals = getCareerTotals(career.seasons);
    expect(totals.communityShields).toBe(1); expect(totals.domesticCups).toBe(1); expect(totals.leagueTitles).toBe(0); expect(totals.championsLeagues).toBe(0);
    const view = render(<><CareerStatsCard career={career} totals={totals} /><LegacyCard career={career} totals={totals} onShare={() => {}} /></>);
    expect(view.container.querySelector('[data-career-stat="Trophies"]')?.firstElementChild, 'SC_SHIELD_UI_CAREER_TOTAL').toHaveTextContent('2');
    expect([...view.container.querySelectorAll('[data-beat="tile"]')].some(tile => tile.textContent === '2Trophies'), 'SC_SHIELD_UI_LEGACY_TOTAL').toBe(true);
    expect(JSON.stringify(career)).toBe(before);
  });
});