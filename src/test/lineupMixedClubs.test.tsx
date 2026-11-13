import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clubs, nations, clubYearClubs, CLUB_TABLE_NAMES, clubTableNames, getRandomTeamAssignments } from '@/data/lineupTeams';
import { clubPickVerifies, useLineupBuilder } from '@/hooks/useLineupBuilder';
import type { PlayerEntity, PlayerSourceConfig } from '@/lib/playerSearch';
import LineupBuilder from '@/pages/LineupBuilder';

const live = vi.hoisted(() => ({ game: null as ReturnType<typeof useLineupBuilder> | null }));
vi.mock('@/hooks/useLineupBuilder', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useLineupBuilder')>('@/hooks/useLineupBuilder');
  return { ...actual, useLineupBuilder: () => { const game = actual.useLineupBuilder(); live.game = game; return game; } };
});
// Only the Page's optional nation-ranking read is an empty transport fixture.
// Preserve actual client constants/members and refuse every other SDK read.
vi.mock('@/integrations/supabase/client', async () => {
  const actual = await vi.importActual<typeof import('@/integrations/supabase/client')>('@/integrations/supabase/client');
  return { ...actual, supabase: new Proxy(actual.supabase, {
    get(target, key, receiver) {
      if (key !== 'from') return Reflect.get(target, key, receiver);
      return (table: string) => {
        expect(table).toBe('national_team_squads');
        return { select: (columns: string) => {
          expect(columns).toBe('player_name');
          return { eq: (column: string, country: string) => {
            expect(column).toBe('country'); expect(country).toBe('Brazil');
            return { limit: async (count: number) => {
              expect(count).toBe(400); return { data: [], error: null };
            } };
          } };
        } };
      };
    },
  }) };
});
// External completion and unrelated shell only. The Page, Hook, pitch, spinner,
// position rules, local record admission and validator client stay real.
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children, headerExtra }: { children: ReactNode; headerExtra?: ReactNode }) => <main>{headerExtra}{children}</main> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
// Explicit fictional transport input, not a real player/roster assertion. This
// exercises the actual Page onSelect and Hook authority, not the search UI.
vi.mock('@/components/game/PlayerAutocomplete', () => ({
  PlayerAutocomplete: ({ onSelect, searchOptions, disabled }: { onSelect: (row: PlayerEntity) => unknown; searchOptions: { source: PlayerSourceConfig }; disabled?: boolean }) => {
    const row: PlayerEntity = { key: 'qa-fixture-keeper', name: 'QA Fixture Keeper', rawName: 'QA Fixture Keeper', meta: { club: 'CR Flamengo', position: 'Goalkeeper', year: 2026, age: 24, value: 100000 }, matchRank: 0, prominence: 100000 };
    return <button type="button" disabled={disabled} aria-label="Select fictional goalkeeper" data-club-filter={JSON.stringify(searchOptions.source.filters?.find(filter => filter.column === 'club'))} onClick={() => { void onSelect(row); }}>Select fictional goalkeeper</button>;
  },
}));

const LEGACY_CLUBS = [
  'Real Madrid', 'Barcelona', 'Manchester City', 'Liverpool', 'Bayern Munich',
  'PSG', 'Chelsea', 'Arsenal', 'Manchester United', 'Juventus',
  'AC Milan', 'Inter Milan', 'Borussia Dortmund', 'Atlético Madrid', 'Tottenham',
  'Napoli', 'Benfica', 'Porto', 'Ajax', 'Bayer Leverkusen',
  'Roma', 'Sevilla', 'Sporting CP', 'Newcastle', 'Aston Villa',
  'West Ham', 'Marseille', 'Lyon', 'Celtic', 'Galatasaray',
];
const LEGACY_NATIONS = [
  'Argentina', 'France', 'Brazil', 'England', 'Belgium',
  'Croatia', 'Netherlands', 'Portugal', 'Spain', 'Italy',
  'Germany', 'Uruguay', 'Colombia', 'USA', 'Mexico',
  'Senegal', 'Japan', 'South Korea', 'Nigeria', 'Denmark',
  'Switzerland', 'Morocco', 'Serbia', 'Poland', 'Cameroon',
];
const LEGACY_ALIASES: Record<string, string[]> = {
  'Real Madrid': ['Real Madrid'],
  'Barcelona': ['FC Barcelona'],
  'Manchester City': ['Manchester City'],
  'Liverpool': ['Liverpool FC'],
  'Bayern Munich': ['Bayern Munich', 'FC Bayern Munich'],
  'PSG': ['Paris Saint-Germain'],
  'Chelsea': ['Chelsea FC'],
  'Arsenal': ['Arsenal FC'],
  'Manchester United': ['Manchester United'],
  'Juventus': ['Juventus FC', 'Juventus'],
  'AC Milan': ['AC Milan'],
  'Inter Milan': ['Inter Milan'],
  'Borussia Dortmund': ['Borussia Dortmund'],
  'Atlético Madrid': ['Atlético de Madrid'],
  'Tottenham': ['Tottenham Hotspur'],
  'Napoli': ['SSC Napoli', 'Napoli'],
  'Benfica': ['SL Benfica'],
  'Porto': ['FC Porto'],
  'Ajax': ['Ajax Amsterdam'],
  'Bayer Leverkusen': ['Bayer 04 Leverkusen'],
  'Roma': ['AS Roma', 'Roma'],
  'Sevilla': ['Sevilla FC', 'Sevilla'],
  'Sporting CP': ['Sporting CP'],
  'Newcastle': ['Newcastle United'],
  'Aston Villa': ['Aston Villa'],
  'West Ham': ['West Ham United'],
  'Marseille': ['Olympique Marseille'],
  'Lyon': ['Olympique Lyon'],
  'Celtic': ['Celtic FC'],
  'Galatasaray': ['Galatasaray'],
};
const ADDED_CLUBS = {
  Brighton: 'Brighton & Hove Albion',
  Bournemouth: 'AFC Bournemouth',
  Brentford: 'Brentford FC',
  'Crystal Palace': 'Crystal Palace',
  Everton: 'Everton FC',
  Fulham: 'Fulham FC',
  'Leeds United': 'Leeds United',
  'Nottingham Forest': 'Nottingham Forest',
  'Real Betis': 'Real Betis Balompié',
  Villarreal: 'Villarreal CF',
  'Real Sociedad': 'Real Sociedad',
  'Celta Vigo': 'Celta de Vigo',
  Lazio: 'SS Lazio',
  Fiorentina: 'ACF Fiorentina',
  Bologna: 'Bologna FC 1909',
  Udinese: 'Udinese Calcio',
  Stuttgart: 'VfB Stuttgart',
  Mönchengladbach: 'Borussia Mönchengladbach',
  Freiburg: 'SC Freiburg',
  Lille: 'LOSC Lille',
  Rennes: 'Stade Rennais FC',
  Nice: 'OGC Nice',
  Feyenoord: 'Feyenoord Rotterdam',
  'AZ Alkmaar': 'AZ Alkmaar',
  Rangers: 'Rangers FC',
  Fenerbahçe: 'Fenerbahce',
  Beşiktaş: 'Besiktas JK',
  Flamengo: 'CR Flamengo',
  Palmeiras: 'Sociedade Esportiva Palmeiras',
  'Club América': 'CF América',
} as const;

const flat = (label: string) => label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ').trim();

beforeEach(() => {
  localStorage.clear(); localStorage.setItem('lineup-rules-seen', '1'); live.game = null;
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ valid: false, unverified: true, reason: 'Explicit offline test transport' }), { status: 503, headers: { 'Content-Type': 'application/json' } })));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); live.game = null; });

const game = () => { expect(live.game).not.toBeNull(); return live.game!; };
const openHook = () => { const view = renderHook(() => useLineupBuilder()); act(() => view.result.current.selectFormation('4-3-3')); return view; };

describe('Build Your XI expanded Mixed club catalogue', () => {
  it('deals sixty clubs and the unchanged twenty five nations through the public helper', () => {
    const all = getRandomTeamAssignments(200), clubNames = all.filter(team => !team.isNation).map(team => team.name);
    expect(clubNames, 'MISSING_MIXED_CLUB_CATALOGUE').toHaveLength(60);
    expect([...clubNames].sort()).toEqual([...LEGACY_CLUBS, ...Object.keys(ADDED_CLUBS)].sort());
    expect(all.filter(team => team.isNation).map(team => team.name).sort()).toEqual([...LEGACY_NATIONS].sort());
    expect(all).toHaveLength(85); expect(new Set(all.map(team => team.name)).size).toBe(85);
    for (const [name, club] of Object.entries(ADDED_CLUBS)) {
      expect(clubTableNames(name)).toEqual([club]);
      const team = { name, isNation: false };
      expect(clubPickVerifies(team, 'GK', { club, rawPosition: 'Goalkeeper' })).toBe(true);
      expect(clubPickVerifies(team, 'GK', { club: 'FC Barcelona', rawPosition: 'Goalkeeper' })).toBe(false);
    }
    for (const [name, club] of [
      ['Rangers', 'Queens Park Rangers'],
      ['Club América', 'CD América de Cali'],
      ['Nottingham Forest', 'Forest Green Rovers'],
      ['Palmeiras', 'SE Palmeiras'],
      ['Flamengo', 'CR Flamengo U20'],
    ]) {
      expect(clubPickVerifies({ name, isNation: false }, 'GK', { club, rawPosition: 'Goalkeeper' })).toBe(false);
    }
  });

  it.each([['Flamengo', 0.633], ['Palmeiras', 0.646]] as const)('rerolls the real Mixed hook into %s', (label, roll) => {
    const { result } = openHook();
    expect(result.current.teamAssignments.map(team => team.name)).toEqual(LEGACY_CLUBS.slice(0, 11));
    vi.mocked(Math.random).mockReturnValue(roll);
    act(() => result.current.rerollTeam());
    expect(result.current.currentTeam?.name, 'MISSING_MIXED_REROLL_CLUB').toBe(label);
    expect(result.current.currentTeam?.isNation).toBe(false);
    expect(new Set(result.current.teamAssignments.map(team => team.name)).size).toBe(11);
    expect(result.current.filledCount).toBe(0);
  });

  it('plays an added club goalkeeper through the actual Page and local record path', async () => {
    render(<MemoryRouter><LineupBuilder /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^4-3-3\b/ }));
    vi.mocked(Math.random).mockReturnValue(0.633);
    fireEvent.click(screen.getByTitle('Reroll: get a different team'));
    expect(game().currentTeam?.name, 'MISSING_NEW_CLUB_RECORD_PATH').toBe('Flamengo');
    act(() => game().finishSpin());
    expect(screen.getByText('Flamengo', { exact: true })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'GK' }));
    const select = screen.getByRole('button', { name: 'Select fictional goalkeeper' });
    expect(JSON.parse(select.getAttribute('data-club-filter')!)).toEqual({ column: 'club', op: 'in', value: ['CR Flamengo'] });
    fireEvent.click(select);
    await waitFor(() => expect(game().filledCount, 'MISSING_NEW_CLUB_RECORD_PATH').toBe(1));
    expect(game().filledSlots.get(0)?.pick?.club).toBe('CR Flamengo');
    expect(game().filledSlots.get(0)?.role).toBe('GK');
    expect(game().filledSlots.get(0)?.playerName).toBe('QA Fixture Keeper');
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText('1/11')).toBeVisible();
  });

  it('preserves the original thirty clubs twenty five nations and every legacy alias', () => {
    expect(clubs).toEqual(LEGACY_CLUBS); expect(nations).toEqual(LEGACY_NATIONS);
    expect(clubs).toHaveLength(30); expect(nations).toHaveLength(25);
    for (const [label, stored] of Object.entries(LEGACY_ALIASES)) expect(CLUB_TABLE_NAMES[label]).toEqual(stored);
    expect(Object.values(LEGACY_ALIASES).flat()).toHaveLength(35);
    expect(clubYearClubs).toEqual(LEGACY_CLUBS.filter(name => name !== 'Arsenal'));

    const { result } = renderHook(() => useLineupBuilder());
    act(() => result.current.selectFormation('4-3-3', { mode: 'club-year', year: 2010 }));
    const initial = result.current.teamAssignments;
    expect(initial.map(team => team.name)).toEqual(clubYearClubs.slice(0, 11));
    act(() => result.current.rerollTeam());
    expect(result.current.draftChoice).toEqual({ mode: 'club-year', year: 2010 });
    expect(result.current.teamAssignments.slice(1)).toEqual(initial.slice(1));
    expect(clubYearClubs).toContain(result.current.currentTeam?.name);
    expect(result.current.currentTeam?.name).not.toBe(initial[0].name);
  });

  it('keeps all staged edge club keys aligned with the exact client aliases', () => {
    const source = readFileSync(resolve('supabase/functions/validate-player/index.ts'), 'utf8');
    const block = source.match(/^const CLUB_STRINGS: Record<string, string\[\]> = (\{[\s\S]*?\r?\n\});/m)?.[1];
    expect(block, 'EDGE_CLUB_MAP_MISSING').toBeDefined();
    const edge = JSON.parse(block!.replace(/,\s*\}$/, '}')) as Record<string, string[]>;
    expect(edge.flamengo).toEqual(['CR Flamengo']);
    expect(edge.palmeiras).toEqual(['Sociedade Esportiva Palmeiras']);
    const expected = Object.fromEntries(Object.entries(CLUB_TABLE_NAMES).map(([label, stored]) => [flat(label), stored]));
    expect(Object.keys(expected)).toHaveLength(60);
    expect(edge).toEqual(expected);
  });

  it('keeps goalkeeper and unverified answer refusals from filling a slot', async () => {
    const first = openHook();
    act(() => first.result.current.selectPosition(5));
    await act(async () => { await first.result.current.submitPlayer('QA Fixture Keeper', { club: 'Real Madrid', rawName: 'QA Fixture Keeper', rawPosition: 'Goalkeeper' }); });
    expect(first.result.current.filledCount).toBe(0); expect(first.result.current.validationError).toBeTruthy();
    expect(first.result.current.currentTeam?.name).toBe('Real Madrid'); expect(first.result.current.isValidating).toBe(false);
    expect(vi.mocked(fetch).mock.calls.some(call => String(call[0]).includes('/functions/v1/validate-player'))).toBe(false);
    first.unmount(); vi.mocked(fetch).mockClear();
    const second = openHook(); act(() => second.result.current.selectPosition(0));
    await act(async () => { await second.result.current.submitPlayer('QA Unverified Name'); });
    expect(second.result.current.filledCount).toBe(0); expect(second.result.current.validationError).toBeTruthy();
    expect(second.result.current.currentTeam?.name).toBe('Real Madrid'); expect(second.result.current.selectedPositionIndex).toBe(0);
    expect(second.result.current.isValidating).toBe(false);
    expect(vi.mocked(fetch).mock.calls.some(call => String(call[0]).includes('/functions/v1/validate-player'))).toBe(true);
  });
});