import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import type { UsCareerSport } from '@/lib/usCareerSport';
import { acknowledgeMarketWheel, declineMarketExtension, openMarketExtension, openMarketFreeAgency, pushMarketFreeAgency } from '@/lib/usCareerMarket';
const SPORTS: [string, () => UsCareerSport][] = [['nfl', () => NFL_CAREER_SPORT], ['nba', () => NBA_CAREER_SPORT], ['mlb', () => MLB_CAREER_SPORT], ['nhl', () => NHL_CAREER_SPORT]];
function makeCareer(sport: UsCareerSport, years: number) {
  const pos = sport.create.defaultPos;
  const c = sport.startCareer('Saved Market', pos, sport.create.archetypes[pos][0], () => 0.6, defaultAppearance(), 'now');
  c.contractYears = years; c.ovr = 85; c.role = 'starter'; return c;
}
const mount = (sport: UsCareerSport) => render(<MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter>);
beforeEach(() => { localStorage.clear(); vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() }))); vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('US market on the saved board', () => {
  it.each(SPORTS)('%s restores the exact opening extension without a draw or save write', (_slug, binding) => {
    const sport = binding(), c = makeCareer(sport, 1), t = openMarketExtension(c, sport.slug, sport.buildExtension(c, () => 0.6));
    const bytes = JSON.stringify({ c, phase: 'extension', teamQuality: 80, coach: null, contractTalk: t });
    localStorage.setItem(sport.saveKey, bytes);
    const rng = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Restore redrew'); });
    const view = mount(sport); expect(view.container.querySelector('[data-extension-talk]')).not.toBeNull();
    expect(view.container.querySelector('[data-ext-salary]')?.getAttribute('data-ext-salary')).toBe(String(t.kind === 'extension' ? t.talk.offer?.salary : ''));
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes); expect(rng).not.toHaveBeenCalled();
  });
  it.each(SPORTS)('%s restores pending freeagency reveal, acknowledges once and keeps spent offers across reload', (_slug, binding) => {
    const sport = binding(), c = makeCareer(sport, 0);
    const opened = openMarketFreeAgency(c, sport.slug, sport.buildFaWindow(c, 80, () => 0.6));
    const pushed = pushMarketFreeAgency(opened, 0, sport.faPushArgs(c, () => 0.99));
    const bytes = JSON.stringify({ c, phase: 'freeagency', teamQuality: 80, coach: null, contractTalk: pushed });
    localStorage.setItem(sport.saveKey, bytes);
    const rng = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Restore redrew'); });
    const view = mount(sport); expect(view.container.querySelector('[data-market-wheel]')).not.toBeNull();
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
    fireEvent.click(screen.getByRole('button', { name: 'Skip animation' }));
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
    fireEvent.click(screen.getByRole('button', { name: 'Continue to the offers' }));
    const expected = JSON.stringify({ c, phase: 'freeagency', teamQuality: 80, coach: null, contractTalk: acknowledgeMarketWheel(pushed) });
    expect(localStorage.getItem(sport.saveKey)).toBe(expected);
    expect((view.container.querySelector('[data-fa-push="0"]') as HTMLButtonElement).disabled).toBe(true);
    view.unmount(); const reloaded = mount(sport);
    expect(reloaded.container.querySelector('[data-fa-window]')).not.toBeNull();
    expect(reloaded.container.querySelector('[data-market-wheel]')).toBeNull();
    expect(localStorage.getItem(sport.saveKey)).toBe(expected); expect(rng).not.toHaveBeenCalled();
  });
  it('a stale talk is dropped alone and the whole underlying career remains on the hub', () => {
    const sport = NFL_CAREER_SPORT, c = makeCareer(sport, 1);
    const talk = openMarketExtension(c, sport.slug, sport.buildExtension(c, () => 0.6)); talk.context.year--;
    const bytes = JSON.stringify({ c, phase: 'extension', teamQuality: 80, coach: null, contractTalk: talk });
    localStorage.setItem(sport.saveKey, bytes); const view = mount(sport);
    expect(view.container.querySelector('[data-extension-talk]')).toBeNull(); expect(view.container.querySelector('[data-market-wheel]')).toBeNull();
    expect(screen.getByRole('button', { name: /^Play .*season/i })).toBeTruthy(); expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
  });
  it('a saved extension decline returns to the hub and does not open another talk on load', () => {
    const sport = NFL_CAREER_SPORT, c = makeCareer(sport, 1);
    const talk = declineMarketExtension(openMarketExtension(c, sport.slug, sport.buildExtension(c, () => 0.6)));
    const bytes = JSON.stringify({ c, phase: 'season', teamQuality: 80, coach: null, contractTalk: talk });
    localStorage.setItem(sport.saveKey, bytes); const view = mount(sport);
    expect(view.container.querySelector('[data-extension-talk]')).toBeNull(); expect(screen.getByRole('button', { name: /^Play .*season/i })).toBeTruthy();
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
  });
});
