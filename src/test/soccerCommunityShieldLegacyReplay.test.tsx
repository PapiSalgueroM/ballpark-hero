import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FALLBACK_CLUBS, initCareer, type CareerState, type SeasonRecord } from '@/lib/soccerCareerEngine';
import { communityShieldSeasonStats, countCommunityShields, readCommunityShield, type CommunityShieldResult } from '@/lib/soccerCareerExtraCups';
import { deriveSeason } from '@/lib/season/core';
import { SOCCER, buildSoccerSeasonCtx, soccerSeasonKey } from '@/lib/season/soccer';
import SoccerSeasonCentre, { type SoccerSeasonCentreProps } from '@/components/soccer-career/SoccerSeasonCentre';
import { cupSeason } from './fixtures/soccerSeasonCompetitions1173';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'http://stub', SUPABASE_PUBLISHABLE_KEY: 'stub' }));
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
type ProofResult = CommunityShieldResult & { annualRating?: number };

// Controlled career and match DTOs from the qualified screen fixture, not real results.
function fixture(): { annual: SeasonRecord; row: SeasonRecord; career: CareerState } {
  const annual: SeasonRecord = { ...copy(cupSeason), leagueTitle: true, leagueFinish: 1, leagueSize: 20 };
  const qualification: CommunityShieldResult['qualification'] = {
    version: 1, competition: 'community-shield', status: 'ready', qualifyingYear: 2026, eventYear: 2027, seed: 1141312389,
    leagueWinner: 'Arsenal', cupWinner: 'Newcastle',
    entrants: [{ club: 'Arsenal', via: 'league-winner' }, { club: 'Newcastle', via: 'fa-cup-winner' }],
    proof: { league: { kind: 'league-world-close', year: 2026 }, cup: { kind: 'phone-world', year: 2026 } },
  };
  const result: ProofResult = {
    version: 1, competition: 'community-shield', qualifyingYear: 2026, eventYear: 2027, seed: 1141312389,
    qualification, entrants: copy(qualification.entrants), minutes: 90, score: [1, 1], decidedBy: 'penalties', penalties: [5, 4], winner: 'Arsenal',
    player: { club: 'Arsenal', availability: 'available', selected: true, apps: 1, goals: 1, assists: 0, cleanSheets: 0, rating: 8, title: true },
    annualRating: annual.rating,
  };
  const row: SeasonRecord = { ...copy(annual), ...communityShieldSeasonStats(annual, result), extraCups: [result] };
  const stats = { pace: 71, shooting: 71, passing: 71, dribbling: 71, defending: 71, physical: 71, reflexes: 71 };
  const career: CareerState = { ...initCareer('Legacy Shield fixture', 'England', 'ST', '2020s', stats, 71, 2027, FALLBACK_CLUBS, null), seasons: [row], lastUCLResult: null };
  return { annual, row, career };
}
// JSDOM fixture adapter for its declared reduced-motion setting, using the production .cm-rise final-state rule.
function mount(career: CareerState, row: SeasonRecord, onCareer: SoccerSeasonCentreProps['onCareer']) {
  return render(<MemoryRouter><SoccerSeasonCentre career={career} clubs={FALLBACK_CLUBS} row={row} mode="watch" onClose={() => {}} onCareer={onCareer} /><style>{'.cm-rise { animation: none; opacity: 1; transform: none; visibility: visible; }'}</style></MemoryRouter>);
}
function acknowledge(view: ReturnType<typeof render>) {
  const help = view.container.querySelector<HTMLElement>('[data-season-help]');
  if (help) fireEvent.click(within(help).getByRole('button', { name: 'Got it' }));
}

beforeEach(() => {
  localStorage.clear(); vi.useRealTimers();
  vi.stubGlobal('matchMedia', (query: string) => ({ media: query, matches: true, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('scrollTo', vi.fn());
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Community Shield legacy league replay boundary', () => {
  it('SC_SHIELD_LEGACY_VISIBLE: keeps the old saved cup inspectable while refusing unproved league games', async () => {
    const { annual, row: current, career: currentCareer } = fixture(), onCareer = vi.fn();
    expect(readCommunityShield(current), 'proof-bearing controlled opening passes the actual reader').not.toBeNull();
    const annualKey = soccerSeasonKey(currentCareer.playerName, annual);
    expect(annualKey, 'known annual fixture has a saved-fields key').not.toBeNull();
    expect(soccerSeasonKey(currentCareer.playerName, current), 'SC_SHIELD_LEGACY_FOUNDATION: verified forward merge preserves the annual key').toBe(annualKey);
    expect(deriveSeason(SOCCER, current, buildSoccerSeasonCtx(currentCareer, FALLBACK_CLUBS, current)), 'the proof-bearing control actually derives a season').not.toBeNull();
    const currentBefore = JSON.stringify(currentCareer), control = mount(currentCareer, current, onCareer);
    acknowledge(control);
    await waitFor(() => expect(control.container.querySelector('[data-season-centre]'), 'the actual proof-bearing Centre mounts').not.toBeNull());
    expect(control.container.querySelector('[data-centre-league-unavailable]')).toBeNull();
    expect(screen.getByRole('button', { name: '▶ Kick off' })).toBeVisible();
    expect(JSON.stringify(currentCareer)).toBe(currentBefore); control.unmount();

    const legacy = copy(current), result = legacy.extraCups![0] as ProofResult;
    delete result.annualRating;
    expect({ ...result, annualRating: annual.rating }, 'only the new rating receipt is absent from the legacy match').toEqual(current.extraCups![0]);
    const career = { ...copy(currentCareer), seasons: [legacy] }, before = JSON.stringify(career);
    expect(readCommunityShield(legacy), 'missing replay metadata does not erase a valid saved match').not.toBeNull();
    expect(countCommunityShields(career.seasons), 'a valid saved personal win still counts').toBe(1);
    expect(soccerSeasonKey(career.playerName, legacy), 'SC_SHIELD_LEGACY_KEY_MISSING: no annual proof means no generic league key').toBeNull();
    localStorage.clear();
    const view = mount(career, legacy, onCareer); acknowledge(view);
    const unavailable = view.container.querySelector('[data-centre-league-unavailable]');
    expect(unavailable, 'SC_SHIELD_LEGACY_PANEL_MISSING: the real Centre explains unavailable league replay').not.toBeNull();
    expect(unavailable).toHaveTextContent('This season cannot be shown match by match.');
    expect(screen.queryByRole('button', { name: '▶ Kick off' })).toBeNull();
    expect(view.container.querySelector('[data-fixture-cup]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Community Shield' }));
    const panel = screen.getByRole('dialog', { name: 'Community Shield' });
    const game = panel.querySelector('[data-centre-cup-open="0"]');
    expect(game, 'SC_SHIELD_LEGACY_GAME_MISSING: the actual saved game remains reachable').not.toBeNull(); fireEvent.click(game!);
    expect(panel.querySelector('[data-centre-cup-score]'), 'SC_SHIELD_LEGACY_SCORE_MISSING: the saved score remains visible').toHaveTextContent('1-1');
    expect(within(panel).getByText('Neutral ground')).toBeVisible();
    expect(within(panel).getByText(/5-4 on penalties/)).toBeVisible();
    expect(within(panel).getByText('You scored 1')).toBeVisible();
    fireEvent.click(view.container.querySelector('[data-centre-competition="league"]')!);
    expect(view.container.querySelector('[data-centre-league-unavailable]')).not.toBeNull();
    expect(screen.queryByRole('button', { name: '▶ Kick off' })).toBeNull();
    expect(JSON.stringify(career), 'inspection and Back preserve every saved field').toBe(before);
    expect(onCareer, 'inspection performs no career update').not.toHaveBeenCalled();
  });
});
