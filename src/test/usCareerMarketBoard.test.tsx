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


// Fictional saved-state fixtures only, not real NBA player seasons or statistics.
function nbaSeasonTwenty(years: number, ovr = 85, allNbas = 0) {
  const sport = NBA_CAREER_SPORT, pos = sport.create.defaultPos;
  const c = sport.startCareer('Season Twenty Fixture', pos, sport.create.archetypes[pos][0], () => 0, defaultAppearance(), 'now');
  const firstYear = c.year, firstAge = c.age;
  c.contractYears = years; c.ovr = ovr; c.pot = Math.max(c.pot, ovr);
  c.role = 'starter'; c.health = 100; c.allNbas = allNbas; c.allStars = allNbas;
  c.seasons = Array.from({ length: 20 }, (_, index) => ({
    year: firstYear + index, team: c.team, age: firstAge + index, ovr,
    games: 82, ppg: 12, rpg: 4, apg: 3,
    awards: index < allNbas ? ['All-NBA'] : [],
    teamResult: 'Missed playoffs', salary: c.salary,
  }));
  c.year = firstYear + 20; c.age = firstAge + 20;
  c.earnings = Math.round(c.salary * 20 * 10) / 10; c.netWorth = c.earnings;
  delete c.rival;
  expect(c.age, 'NBA_20_FIXTURE_AGE').toBe(39);
  expect(c.seasons.length, 'NBA_20_FIXTURE_SEASONS').toBe(20);
  return c;
}
function storeNbaTwenty(c: ReturnType<typeof nbaSeasonTwenty>, phase: 'season' | 'retired' = 'season') {
  localStorage.setItem(NBA_CAREER_SPORT.saveKey, JSON.stringify({ c, phase, teamQuality: 80, coach: null }));
}
function savedNbaTwenty() {
  const raw = localStorage.getItem(NBA_CAREER_SPORT.saveKey);
  expect(raw, 'NBA_20_SAVED_CAREER').not.toBeNull();
  return JSON.parse(raw ?? 'null');
}
function playNbaTwenty() {
  const button = screen.queryByRole('button', { name: /^Play .*season/i });
  expect(button, 'NBA_20_PLAY_AVAILABLE').not.toBeNull();
  fireEvent.click(button!);
}

describe('NBA season twenty contract paths on the saved board', () => {
  it('opens and signs an expired deal before playing season twenty-one', () => {
    const c = nbaSeasonTwenty(0); storeNbaTwenty(c);
    vi.spyOn(Math, 'random').mockReturnValue(0.6);
    const view = mount(NBA_CAREER_SPORT);
    expect(view.container.querySelector('[data-fa-window]')).toBeNull();
    playNbaTwenty();
    expect(view.container.querySelector('[data-fa-window]'), 'NBA_20_FREE_AGENCY').not.toBeNull();
    expect(view.container.querySelector('[data-extension-talk]')).toBeNull();
    const saved = savedNbaTwenty();
    expect(saved.phase).toBe('freeagency'); expect(saved.c.seasons).toEqual(c.seasons);
    expect(saved.c.year).toBe(c.year); expect(saved.c.contractYears).toBe(0);
    expect(saved.contractTalk?.kind).toBe('freeagency');
    const window = saved.contractTalk.window as ReturnType<typeof NBA_CAREER_SPORT.buildFaWindow>;
    expect(window.offers.length, 'NBA_20_LIVE_OFFERS').toBeGreaterThanOrEqual(2);
    expect(window.offers[0].incumbent).toBe(true); expect(window.offers[0].gone).toBe(false);
    expect(window.offers.some(offer => !offer.incumbent && !offer.gone)).toBe(true);
    expect(view.container.querySelectorAll('[data-fa-sign]').length).toBe(window.offers.length);
    const sign = view.container.querySelector<HTMLButtonElement>('[data-fa-sign="0"]');
    expect(sign, 'NBA_20_SIGN_AVAILABLE').not.toBeNull();
    expect(sign?.disabled, 'NBA_20_SIGN_ENABLED').toBe(false); fireEvent.click(sign!);
    const signed = savedNbaTwenty(), offer = window.offers[0];
    expect(view.container.querySelector('[data-fa-window]'), 'NBA_20_SIGN_CLOSED_WINDOW').toBeNull();
    expect(signed.phase, 'NBA_20_SIGNED_HUB').toBe('season');
    expect(signed.c.team).toBe(offer.team); expect(signed.c.salary).toBe(offer.salary);
    expect(signed.c.contractYears).toBe(offer.years);
    expect(signed.c.seasons).toEqual(c.seasons); expect(signed.c.year).toBe(c.year);
  });

  it('offers the remaining-year extension before playing season twenty-one', () => {
    const c = nbaSeasonTwenty(1, 99, 6); storeNbaTwenty(c);
    vi.spyOn(Math, 'random').mockReturnValue(0.6);
    const view = mount(NBA_CAREER_SPORT); playNbaTwenty();
    expect(view.container.querySelector('[data-extension-talk]'), 'NBA_20_FINAL_YEAR_TALK').not.toBeNull();
    expect(view.container.querySelector('[data-fa-window]')).toBeNull();
    expect(view.container.querySelector('[data-ext-sign]'), 'NBA_20_EXTENSION_OFFER').not.toBeNull();
    const saved = savedNbaTwenty();
    expect(saved.phase).toBe('extension'); expect(saved.contractTalk?.kind).toBe('extension');
    expect(saved.contractTalk.talk.offer, 'NBA_20_EXTENSION_TERMS').not.toBeNull();
    expect(saved.c.contractYears).toBe(1); expect(saved.c.year).toBe(c.year);
    expect(saved.c.seasons).toEqual(c.seasons);
  });

  it('plays the final season with two years remaining without opening a market', () => {
    const c = nbaSeasonTwenty(2); storeNbaTwenty(c);
    vi.spyOn(Math, 'random').mockReturnValue(0.6);
    const view = mount(NBA_CAREER_SPORT); playNbaTwenty();
    const saved = savedNbaTwenty();
    expect(view.container.querySelector('[data-extension-talk]')).toBeNull();
    expect(view.container.querySelector('[data-fa-window]')).toBeNull();
    expect(saved.c.seasons.length, 'NBA_20_NEXT_SEASON_PLAYED').toBe(21);
    expect(saved.c.seasons.slice(0, 20)).toEqual(c.seasons);
    expect(saved.c.year).toBe(c.year + 1); expect(saved.c.contractYears).toBe(1);
    expect(saved.c.age).toBeLessThan(41); expect(saved.c.ovr).toBeGreaterThan(66);
    expect(saved.c.retired, 'NBA_20_EXISTING_RETIREMENT_BOUNDARY').toBe(true);
    expect(saved.phase).toBe('retired');
  });

  it('plays season twenty-one when the final-year extension has no offer', () => {
    const c = nbaSeasonTwenty(1, 80); storeNbaTwenty(c);
    vi.spyOn(Math, 'random').mockReturnValue(0.6);
    const view = mount(NBA_CAREER_SPORT); playNbaTwenty();
    expect(view.container.querySelector('[data-extension-talk]'), 'NBA_20_NULL_EXTENSION_TALK').not.toBeNull();
    expect(savedNbaTwenty().contractTalk.talk.offer, 'NBA_20_NULL_EXTENSION_FOUNDATION').toBeNull();
    expect(view.container.querySelector('[data-ext-sign]')).toBeNull();
    const continueButton = screen.queryByRole('button', { name: 'Play the year out' });
    expect(continueButton, 'NBA_20_NULL_EXTENSION_CONTINUE').not.toBeNull();
    fireEvent.click(continueButton!);
    const saved = savedNbaTwenty();
    expect(saved.c.seasons.length, 'NBA_20_NULL_EXTENSION_CONTINUED').toBe(21);
    expect(saved.c.seasons.slice(0, 20)).toEqual(c.seasons);
    expect(saved.c.year).toBe(c.year + 1); expect(saved.c.contractYears).toBe(0);
    expect(saved.c.retired).toBe(true); expect(saved.phase).toBe('retired');
    expect(view.container.querySelector('[data-extension-talk]')).toBeNull();
  });

  it('restores the exact late-career offers on reload without drawing or playing', () => {
    const c = nbaSeasonTwenty(0); storeNbaTwenty(c);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.6);
    const first = mount(NBA_CAREER_SPORT); playNbaTwenty();
    expect(first.container.querySelector('[data-fa-window]'), 'NBA_20_RELOAD_OPENING').not.toBeNull();
    const raw = localStorage.getItem(NBA_CAREER_SPORT.saveKey), before = savedNbaTwenty();
    expect(before.phase).toBe('freeagency'); expect(before.c.seasons).toEqual(c.seasons);
    first.unmount(); random.mockClear();
    const reloaded = mount(NBA_CAREER_SPORT);
    expect(reloaded.container.querySelector('[data-fa-window]'), 'NBA_20_RELOAD_WINDOW').not.toBeNull();
    expect(reloaded.container.querySelectorAll('[data-fa-sign]').length).toBe(before.contractTalk.window.offers.length);
    expect(localStorage.getItem(NBA_CAREER_SPORT.saveKey), 'NBA_20_RELOAD_EXACT_SAVE').toBe(raw);
    expect(savedNbaTwenty().contractTalk).toEqual(before.contractTalk);
    expect(random, 'NBA_20_RELOAD_NO_REDRAW').not.toHaveBeenCalled();
  });

  it('keeps an already retired season-twenty save out of contract talks', () => {
    const c = nbaSeasonTwenty(0); c.retired = true; c.retirement = { retiredYear: c.year - 1 };
    storeNbaTwenty(c, 'retired');
    const raw = localStorage.getItem(NBA_CAREER_SPORT.saveKey);
    const view = mount(NBA_CAREER_SPORT);
    expect(screen.queryByRole('button', { name: 'Review seasons' }), 'NBA_20_RETIRED_SCREEN').not.toBeNull();
    expect(view.container.querySelector('[data-fa-window]')).toBeNull();
    expect(view.container.querySelector('[data-extension-talk]')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Play .*season/i })).toBeNull();
    expect(savedNbaTwenty().c.seasons.length).toBe(20);
    expect(localStorage.getItem(NBA_CAREER_SPORT.saveKey), 'NBA_20_RETIRED_SAVE_HELD').toBe(raw);
  });
});
