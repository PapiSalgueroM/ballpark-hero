/* Round 784, widened to all four sports in Round 820: every Perfect Season
   result card prints the odds for the team the sim actually played, the hero
   says the real chase, and the best record reaches both screens.

   The review of 2026-10-01 found nothing testing the NBA page's wiring: the
   odds line was fed the rounded team overall (sim.overall), so a 94.5 printed
   a 95's odds. Round 820 moved the odds card, the best record and the hero
   line into one shared module, hook and component, so this plays a whole run
   through each real page (one spin and one pick per slot, then the sim) with
   only the two archive reads mocked, and a squad whose raw overall sits
   between two integers, so the rounded and the raw lines differ and only the
   raw one passes. */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import type { ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NbaPage from '@/pages/PerfectSeasonNba';
import NhlPage from '@/pages/PerfectSeasonNhl';
import MlbPage from '@/pages/PerfectSeasonMlb';
import NflPage from '@/pages/PerfectSeasonNfl';
import { NBA_SLOTS } from '@/lib/perfectSeasonNba';
import { NHL_SLOTS } from '@/lib/perfectSeasonNhl';
import { MLB_SLOTS } from '@/lib/perfectSeasonMlb';
import { NFL_SLOTS } from '@/lib/perfectSeasonNfl';
import {
  teamOverall, type DraftablePlayer, type PerfectSeasonSportKey, type SeasonSlot, type SpinSquad,
} from '@/lib/perfectSeason';
import { PERFECT_SEASON_SPORTS, perfectOddsLine, perfectSeasonTagline } from '@/lib/perfectSeasonOdds';

vi.mock('@/lib/perfectSeasonNba', async original => ({
  ...await original<typeof import('@/lib/perfectSeasonNba')>(),
  fetchTeamSeasonIndex: async () => FIX.nba.index,
  fetchSquad: async () => FIX.nba.squad,
}));
vi.mock('@/lib/perfectSeasonNhl', async original => ({
  ...await original<typeof import('@/lib/perfectSeasonNhl')>(),
  fetchTeamEraIndex: async () => FIX.nhl.index,
  fetchSquad: async () => FIX.nhl.squad,
}));
vi.mock('@/lib/perfectSeasonMlb', async original => ({
  ...await original<typeof import('@/lib/perfectSeasonMlb')>(),
  fetchTeamSeasonIndex: async () => FIX.mlb.index,
  fetchSquad: async () => FIX.mlb.squad,
}));
vi.mock('@/lib/perfectSeasonNfl', async original => ({
  ...await original<typeof import('@/lib/perfectSeasonNfl')>(),
  fetchTeamSeasonIndex: async () => FIX.nfl.index,
  fetchSquad: async () => FIX.nfl.squad,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, loading: false, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', async original => ({ ...await original<typeof import('@/lib/completions')>(), recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Fixture guest' }));
vi.mock('@/lib/badges', async original => ({ ...await original<typeof import('@/lib/badges')>(), getNewlyEarnedBadges: async () => [] }));

/* Generated players and clubs, never real ones. One player per slot, so each
   pick has exactly one place to go; every slot rates `base` except one that
   rates one higher, which puts the raw overall between two integers. */
interface Fixture { slots: SeasonSlot[]; players: DraftablePlayer[]; squad: SpinSquad; index: unknown[]; raw: number; }
function fixture(slots: SeasonSlot[], base: number, bump: string, index: unknown[]): Fixture {
  const players: DraftablePlayer[] = slots.map((s, i) => ({
    playerId: `fx-${i}`, name: `Fixture Player ${s.key}`, rating: s.key === bump ? base + 1 : base, eligible: [s.key], detail: 'fixture season',
  }));
  const squad: SpinSquad = { squadId: 'fx-squad', teamName: 'Fixture Lakeside Club', year: 2001, players };
  const raw = teamOverall(slots, Object.fromEntries(slots.map((s, i) => [s.key, players[i]])));
  return { slots, players, squad, index, raw };
}
const FIX: Record<PerfectSeasonSportKey, Fixture> = {
  /* Round 784's squad: five 95s and 94s, a raw 94.52. */
  nba: (() => {
    const RATINGS: Record<string, number> = { PG: 95, SG: 94, SF: 95, PF: 94, C: 95, SIXTH: 94 };
    const players: DraftablePlayer[] = NBA_SLOTS.map((s, i) => ({ playerId: `fx-${i}`, name: `Fixture Hooper ${s.key}`, rating: RATINGS[s.key], eligible: [s.key], detail: 'fixture season' }));
    const index = Array.from({ length: 24 }, (_, i) => ({ season: `${1980 + i}-${String((81 + i) % 100).padStart(2, '0')}`, team: 'FXL', teamName: 'Fixture Lakeside Club' }));
    return { slots: NBA_SLOTS, players, squad: { squadId: 'fx-squad', teamName: 'Fixture Lakeside Club', year: 2001, players }, index, raw: teamOverall(NBA_SLOTS, Object.fromEntries(NBA_SLOTS.map((s, i) => [s.key, players[i]]))) };
  })(),
  /* 88 everywhere, an 89 in goal: a raw 88.24, where 82-0 is a long shot. */
  nhl: fixture(NHL_SLOTS, 88, 'G', Array.from({ length: 80 }, (_, i) => ({ abbr: 'FXL', teamName: 'Fixture Lakeside Club', draftMatch: 'Lakeside', eraStart: 1960 + (i % 7) * 10, eraEnd: 1969 + (i % 7) * 10, eraLabel: `${1960 + (i % 7) * 10}s` }))),
  /* 88 everywhere, an 89 starter: a raw 88.14, where the real chase is 116 wins. */
  mlb: fixture(MLB_SLOTS, 88, 'SP', Array.from({ length: 600 }, (_, i) => ({ yearid: 1901 + (i % 60), teamid: 'FXL', name: 'Fixture Lakeside Club', w: 81, l: 81 }))),
  /* 82 everywhere, an 83 quarterback: a raw 82.2. */
  nfl: fixture(NFL_SLOTS, 82, 'QB', Array.from({ length: 450 }, (_, i) => ({ year: 1999 + (i % 26), abbr: 'FXL', name: 'Fixture Lakeside Club' }))),
};

const PAGES: Record<PerfectSeasonSportKey, ComponentType> = { nba: NbaPage, nhl: NhlPage, mlb: MlbPage, nfl: NflPage };
const ROUTES: Record<PerfectSeasonSportKey, string> = { nba: '/perfect-season-nba', nhl: '/perfect-season-nhl', mlb: '/perfect-season-mlb', nfl: '/perfect-season-nfl' };

type View = ReturnType<typeof render>;
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const press = (view: View, text: string | RegExp) => {
  const node = view.getAllByText(text).map(n => n.closest('button')).find(Boolean);
  expect(node, `no button for ${String(text)}`).toBeTruthy();
  fireEvent.click(node!);
};

async function playOneRun(view: View, fx: Fixture) {
  press(view, 'Classic');
  await tick(10);
  for (let i = 0; i < fx.slots.length; i++) {
    press(view, i === 0 ? /Spin the wheel/ : /Next spin/);
    await tick(1600);
    press(view, fx.players[i].name);
    await tick(10);
  }
  await tick(10);
  press(view, /Skip to result/);
  await tick(50);
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe.each(['nba', 'nhl', 'mlb', 'nfl'] as PerfectSeasonSportKey[])('%s Perfect Season result card', sport => {
  const fx = FIX[sport];
  const Page = PAGES[sport];
  const games = PERFECT_SEASON_SPORTS[sport].games;
  const frame = () => <HelmetProvider><MemoryRouter initialEntries={[ROUTES[sport]]}><Page /></MemoryRouter></HelmetProvider>;

  it('the fixture squad sits between two integers, so rounding would change the printed odds', () => {
    expect(Math.round(fx.raw * 10) / 10).not.toBe(Math.round(fx.raw));
    expect(perfectOddsLine(sport, fx.raw)).not.toBe(perfectOddsLine(sport, Math.round(fx.raw)));
  });

  it('says the real chase under the title, never the perfect season it cannot promise', () => {
    const view = render(frame());
    expect(view.container.textContent).toContain(perfectSeasonTagline(sport));
    expect(view.container.textContent).not.toMatch(/chase the perfect season|chase perfection/i);
  });

  it('prints the odds for the raw overall the sim played, and a first run is a new best', async () => {
    const view = render(frame());
    expect(view.container.querySelector('[data-best-record]')).toBeNull();
    await playOneRun(view, fx);
    const odds = view.container.querySelector('[data-perfect-odds]');
    expect(odds, 'the run went unbeaten or never finished, so the odds line never drew').not.toBeNull();
    expect(odds!.textContent).toBe(perfectOddsLine(sport, fx.raw));
    expect(odds!.textContent!.startsWith(`At ${Math.round(fx.raw * 10) / 10} overall `)).toBe(true);
    expect(view.container.querySelector('[data-best-record]')?.textContent).toBe('New personal best.');
    const stored = JSON.parse(localStorage.getItem(`perfect-season-${sport}-best`)!);
    expect(stored.overall).toBe(Math.round(fx.raw));
    expect(stored.mode).toBe('classic');
    expect(stored.wins + stored.losses).toBe(games);
  });

  it('shows a stored best on the mode screen and on the card, and a worse run leaves it alone', async () => {
    const best = { v: 1, wins: games - 1, losses: 1, overall: 99, date: '2026-09-30', mode: 'classic' };
    localStorage.setItem(`perfect-season-${sport}-best`, JSON.stringify(best));
    const view = render(frame());
    expect(view.container.querySelector('[data-best-record]')?.textContent).toBe(`Your best so far: ${games - 1}-1 at 99 OVR.`);
    await playOneRun(view, fx);
    expect(view.container.querySelector('[data-best-record]')?.textContent).toBe(`Your best: ${games - 1}-1 at 99 OVR.`);
    expect(JSON.parse(localStorage.getItem(`perfect-season-${sport}-best`)!)).toEqual(best);
  });
});
