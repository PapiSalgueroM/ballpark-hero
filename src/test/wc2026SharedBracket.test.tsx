import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import WorldCupPredictor from '@/pages/WorldCupPredictor';
import KnockoutBracket from '@/components/world-cup-predictor/KnockoutBracket';
import { WC2026_GROUPS, WC2026_KNOCKOUT } from '@/data/wc2026Results';

const service = vi.hoisted(() => ({
  bracket: null as unknown,
  recordCompletion: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        single: async () => table === 'saved_brackets'
          ? { data: service.bracket, error: null }
          : { data: { display_name: 'Shared Fixture' }, error: null },
      };
      return query;
    },
  },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/lib/completions', () => ({ recordCompletion: service.recordCompletion, getCurrentPlayerName: () => '' }));

const personal = {
  'wc2026-predictions': JSON.stringify({ 'A-0': { homeGoals: 1, awayGoals: 2 } }),
  'wc2026-show-bracket': 'false',
  'wc2026-selected-thirds': '[]',
  'wc2026-playoff-picks': JSON.stringify({ stored: 'Qatar' }),
  'wc2026-knockout': JSON.stringify({ 'r32-0': 'Germany' }),
  'wc2026-knockout-signature': 'personal seeds',
  'wc2026-awards': JSON.stringify({ goldenBoot: 'Messi', goldenGlove: '', goldenBall: '' }),
  'wc2026-crowned': JSON.stringify(['Germany']),
};

beforeEach(() => {
  localStorage.clear();
  for (const [key, value] of Object.entries(personal)) localStorage.setItem(key, value);
  service.bracket = null;
  service.recordCompletion.mockClear();
});

const saved = () => Object.fromEntries(Object.keys(personal).map(key => [key, localStorage.getItem(key)]));

it('opens a shared link and returns to the viewer’s own saved scores and awards', async () => {
  service.bracket = {
    user_id: 'fixture-owner',
    bracket_data: {
      predictions: { 'A-0': { homeGoals: 7, awayGoals: 0 } },
      selectedThirds: [],
      playoffPicks: {},
      awards: { goldenBoot: 'Mbappé' },
    },
  };

  const shared = render(<MemoryRouter initialEntries={['/world-cup-bracket?bracket=fixture']}><WorldCupPredictor /></MemoryRouter>);
  await screen.findByRole('link', { name: 'Make Your Own' });
  const sharedScore = shared.container.querySelector('input[type="number"]');
  expect(sharedScore).toHaveValue(7);
  expect(sharedScore).toHaveAttribute('readonly');
  expect(saved()).toEqual(personal);
  expect(screen.getByRole('button', { name: /Golden Boot.*Mbappé/ })).toBeDisabled();
  shared.unmount();

  const own = render(<MemoryRouter initialEntries={['/world-cup-bracket']}><WorldCupPredictor /></MemoryRouter>);
  expect(own.container.querySelector('input[type="number"]')).toHaveValue(1);
  expect(screen.getByRole('button', { name: /Golden Boot.*Messi/ })).toBeEnabled();
  expect(service.recordCompletion).not.toHaveBeenCalled();
});

it('reads a shared knockout without clearing or replacing the personal knockout', async () => {
  const seeds = Object.fromEntries(WC2026_GROUPS.map(({ letter, teams }) => [
    letter, { first: teams[0], second: teams[1], third: teams[2], thirdPts: 0, thirdGD: 0, thirdGF: 0 },
  ]));
  const thirds = WC2026_GROUPS.filter(g => g.thirdQualified).map(g => ({ team: g.teams[2], group: g.letter }));
  const picks: Record<string, string> = {};
  for (const round of ['r32', 'r16', 'qf', 'sf', 'tp', 'f']) {
    WC2026_KNOCKOUT.filter(match => match.round === round).forEach((match, index) => { picks[`${round}-${index}`] = match.winner; });
  }

  const champion = vi.fn();
  render(<KnockoutBracket seeds={seeds} bestThirds={thirds} sharedPicks={picks} onChampionChange={champion} />);
  expect(saved()).toEqual(personal);
  await waitFor(() => expect(champion).toHaveBeenCalledWith('Spain'));
});

it('offers a route back to the personal bracket when a share is unavailable', async () => {
  render(<MemoryRouter initialEntries={['/world-cup-bracket?bracket=missing']}><WorldCupPredictor /></MemoryRouter>);
  await screen.findByText("Couldn't open this shared bracket.");
  expect(screen.getByRole('link', { name: 'Make Your Own' })).toHaveAttribute('href', '/world-cup-bracket');
  expect(saved()).toEqual(personal);
});
