import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import { openMarketFreeAgency } from '@/lib/usCareerMarket';
import type { UsCareerSport } from '@/lib/usCareerSport';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  getCurrentPlayerName: () => 'Waiver Fixture',
}));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const waiverName = 'Request a waiver';

function fictionalCareer(sport: UsCareerSport, morale: number, contractYears: number) {
  const pos = sport.create.defaultPos;
  const career = sport.startCareer('Waiver Fixture', pos, sport.create.archetypes[pos][0], () => 0.6, defaultAppearance(), 'now');
  career.morale = morale;
  career.contractYears = contractYears;
  career.ovr = 85;
  career.role = 'starter';
  return career;
}

function mountSeason(sport: UsCareerSport, morale: number) {
  const career = fictionalCareer(sport, morale, 2);
  const saved = JSON.stringify({ c: career, phase: 'season', teamQuality: 80, coach: null });
  localStorage.setItem(sport.saveKey, saved);
  const view = render(<MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter>);
  expect(view.getByRole('button', { name: `Play the ${career.year} season` })).toBeTruthy();
  expect(localStorage.getItem(sport.saveKey)).toBe(saved);
  return view;
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('NBA My Career voluntary waiver', () => {
  it('offers the waiver request on an eligible unhappy NBA season hub', () => {
    const view = mountSeason(NBA_CAREER_SPORT, 54);
    expect(view.queryByRole('button', { name: waiverName }), 'NBA_WAIVER_REQUEST_MISSING_ELIGIBLE').not.toBeNull();
  });

  it('keeps the request off the NBA hub at morale 55', () => {
    const view = mountSeason(NBA_CAREER_SPORT, 55);
    expect(view.queryByRole('button', { name: waiverName })).toBeNull();
  });

  it('keeps the request off an unhappy NFL hub', () => {
    const view = mountSeason(NFL_CAREER_SPORT, 54);
    expect(view.queryByRole('button', { name: waiverName })).toBeNull();
  });

  it('restores ordinary NBA free agency with its incumbent offer', () => {
    const sport = NBA_CAREER_SPORT;
    const career = fictionalCareer(sport, 54, 0);
    const window = sport.buildFaWindow(career, 80, () => 0.6);
    expect(window.offers.filter(offer => offer.incumbent).map(offer => offer.team)).toEqual([career.team]);
    const contractTalk = openMarketFreeAgency(career, sport.slug, window);
    const saved = JSON.stringify({ c: career, phase: 'freeagency', teamQuality: 80, coach: null, contractTalk });
    localStorage.setItem(sport.saveKey, saved);
    const view = render(<MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter>);
    const market = view.container.querySelector('[data-fa-window]');
    expect(market?.querySelectorAll('[data-fa-offer]')).toHaveLength(window.offers.length);
    expect(market?.querySelector('[data-fa-offer="0"]')?.textContent).toContain('Your team');
    expect(view.queryByRole('button', { name: waiverName })).toBeNull();
    expect(localStorage.getItem(sport.saveKey)).toBe(saved);
  });
});
