/* Reviewer sc-engine, Release AW: the real page on a save whose new field is damaged. Runner only, never committed. */
import { Component, type ReactNode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/completions', async original => ({
  ...(await original<Record<string, unknown>>()),
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(), getCurrentPlayerName: () => 'Tile Tester',
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn(), loading: false }) }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('sonner', () => ({ toast: Object.assign(() => undefined, { success: vi.fn(), error: vi.fn(), info: vi.fn(), message: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => {
  const chain = (): unknown => new Proxy(() => undefined, {
    get(_target, prop) {
      if (prop === 'then') return (ok: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null, count: 0 }).then(ok);
      if (typeof prop === 'symbol') return undefined;
      return () => chain();
    },
    apply() { return chain(); },
  });
  return { supabase: { from: () => chain(), rpc: () => chain(), functions: { invoke: async () => ({ data: null, error: null }) } },
    SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key' };
});
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/PostGameStats', () => ({ default: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/components/soccer-career/AppearanceBuilder', () => ({ default: () => null }));
vi.mock('@/components/soccer-career/PlayerAvatar', () => ({ default: () => null }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => <select value={value} onChange={event => onValueChange(event.target.value)}>{children}</select>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectGroup: ({ children }: any) => <>{children}</>,
  SelectLabel: () => null, SelectTrigger: () => null, SelectValue: () => null,
}));

import * as E from '@/lib/soccerCareerEngine';
import { isSoccerCareerSave } from '@/lib/soccerCareerSave';
import SoccerCareer from '@/pages/SoccerCareer';

const KEY = 'soccerCareerSave';
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p>TEST: route crashed</p> : this.props.children; }
}
function veteran(phase: 'playing' | 'transfer_window'): E.CareerState {
  const career = E.initCareer('Tile Tester', 'England', 'CM', '2020-24',
    { pace: 78, shooting: 78, passing: 78, dribbling: 78, defending: 78, physical: 78, reflexes: 78 }, 78, 2020, E.FALLBACK_CLUBS, null, 88);
  const club = E.FALLBACK_CLUBS.find(candidate => candidate.name === 'Arsenal')!;
  career.age = 31; career.currentClub = club.name; career.currentClubCountry = club.country;
  career.currentClubTier = club.tier; career.currentClubColor = club.color; career.currentLeague = club.league;
  career.contractYearsLeft = 3; career.weeklyWage = 45000; career.marketValue = 50; career.agentId = 'cousin';
  career.phase = phase; career.transferSituation = phase === 'transfer_window' ? { type: 'no_interest' } : null;
  career.pendingLoanOffers = null; career.internationalCareer = false;
  career.intStats = { ...career.intStats, caps: 12, isRetired: true };
  career.seasons = [{ ...career.seasons[0], year: 2026, age: 31, club: club.name, clubCountry: club.country,
    clubTier: club.tier, type: 'playing', apps: 32, leagueApps: 28, goals: 8, assists: 11, rating: 7.2, ovr: 78 }];
  return copy(E.repairCareer(career));
}
function mount(saved: unknown) {
  localStorage.setItem(KEY, JSON.stringify(saved));
  return render(<HelmetProvider><MemoryRouter><Boundary><SoccerCareer /></Boundary></MemoryRouter></HelmetProvider>);
}
const FIELDS = ['transferBrief', 'farewellSeason', 'internationalReturn', 'agentReview'] as const;
const VALUES: Record<string, unknown> = { nul: null, zero: 0, text: 'x', list: [], empty: {}, v2: { version: 2 }, v1bare: { version: 1 },
  wrong: { version: 1, priority: 'minutes', context: null, result: 7, year: 'a', sourceCount: -1, club: '' } };

beforeEach(() => { localStorage.clear(); vi.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('the fixtures really reach the four new cards (so no crash below is not an empty statement)', () => {
  it('a healthy veteran between seasons shows the farewell, agent review and comeback cards', () => {
    const view = mount(veteran('playing'));
    expect(view.queryByText('TEST: route crashed')).toBeNull();
    expect(view.container.querySelector('[data-farewell-plan]')).not.toBeNull();
    expect(view.container.querySelector('[data-agent-review-open]')).not.toBeNull();
    expect(view.container.querySelector('[data-international-return-open]')).not.toBeNull();
  });
  it('a healthy veteran in a quiet transfer window shows the brief', () => {
    const view = mount(veteran('transfer_window'));
    expect(view.queryByText('TEST: route crashed')).toBeNull();
    expect(view.container.querySelector('[data-transfer-brief-selection]')).not.toBeNull();
    expect(view.container.querySelector('[data-request-transfer]')).not.toBeNull();
  });
});

describe.each(['playing', 'transfer_window'] as const)('a damaged new field on a %s save', phase => {
  for (const field of FIELDS) for (const [name, value] of Object.entries(VALUES)) {
    it(`${field} = ${name}: the save is still a save, the page opens on it and nothing crashes`, () => {
      const saved = { ...veteran(phase), [field]: value };
      expect(isSoccerCareerSave(saved), 'the damaged save is not thrown away as invalid').toBe(true);
      const view = mount(saved);
      expect(view.queryByText('TEST: route crashed')).toBeNull();
      expect(view.queryByText('Create Your Player'), 'the career is not replaced by the creation screen').toBeNull();
      expect(view.container.textContent).toContain('Arsenal');
      const other = FIELDS.filter(f => f !== field);
      if (phase === 'playing') {
        if (other.includes('farewellSeason')) expect(view.container.querySelector('[data-farewell-plan]'), 'the farewell card is untouched by another field').not.toBeNull();
        if (other.includes('agentReview')) expect(view.container.querySelector('[data-agent-review-open]'), 'the agent card is untouched by another field').not.toBeNull();
        if (other.includes('internationalReturn')) expect(view.container.querySelector('[data-international-return-open]'), 'the comeback card is untouched by another field').not.toBeNull();
      } else {
        expect(view.container.querySelector('[data-request-transfer]'), 'the plain request is still offered').not.toBeNull();
      }
    });
  }
});
