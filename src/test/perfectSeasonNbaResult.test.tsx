/* Round 784: the NBA Perfect Season result card prints the odds for the team
   the sim actually played, and the best record reaches both screens.

   The review of 2026-10-01 found nothing testing the page's wiring: the odds
   line was fed the rounded team overall (sim.overall), so a 94.5 printed a 95's
   odds (one run in 610 where the truth is about one in 1,200) and the 98.5
   ceiling team printed a 99's one in 5 against What's New's one in nine. This
   plays a whole run through the real page (six spins, six picks, the sim) with
   only the two archive reads mocked, and a squad whose raw overall is 94.52,
   so the rounded and the raw lines differ and only the raw one passes. */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from '@/pages/PerfectSeasonNba';
import { NBA_SLOTS, type NbaTeamSeasonEntry } from '@/lib/perfectSeasonNba';
import { teamOverall, type DraftablePlayer, type SpinSquad } from '@/lib/perfectSeason';
import { perfectOddsLine } from '@/lib/perfectSeasonOdds';

vi.mock('@/lib/perfectSeasonNba', async original => ({
  ...await original<typeof import('@/lib/perfectSeasonNba')>(),
  fetchTeamSeasonIndex: async () => INDEX,
  fetchSquad: async () => SQUAD,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, loading: false, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', async original => ({ ...await original<typeof import('@/lib/completions')>(), recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Fixture guest' }));
vi.mock('@/lib/badges', async original => ({ ...await original<typeof import('@/lib/badges')>(), getNewlyEarnedBadges: async () => [] }));

/* Generated players and clubs, never real ones. One player per slot, so each
   pick has exactly one place to go. */
const RATINGS: Record<string, number> = { PG: 95, SG: 94, SF: 95, PF: 94, C: 95, SIXTH: 94 };
const PLAYERS: DraftablePlayer[] = NBA_SLOTS.map((s, i) => ({
  playerId: `fx-${i}`, name: `Fixture Hooper ${s.key}`, rating: RATINGS[s.key], eligible: [s.key], detail: 'fixture season',
}));
const SQUAD: SpinSquad = { squadId: 'fx-squad', teamName: 'Fixture Lakeside Club', year: 2001, players: PLAYERS };
const INDEX: NbaTeamSeasonEntry[] = Array.from({ length: 24 }, (_, i) => ({ season: `${1980 + i}-${String((81 + i) % 100).padStart(2, '0')}`, team: 'FXL', teamName: 'Fixture Lakeside Club' }));
const RAW = teamOverall(NBA_SLOTS, Object.fromEntries(NBA_SLOTS.map((s, i) => [s.key, PLAYERS[i]])));

const frame = () => <HelmetProvider><MemoryRouter initialEntries={['/perfect-season-nba']}><Page /></MemoryRouter></HelmetProvider>;
type View = ReturnType<typeof render>;
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const press = (view: View, text: string | RegExp) => {
  const node = view.getAllByText(text).map(n => n.closest('button')).find(Boolean);
  expect(node, `no button for ${String(text)}`).toBeTruthy();
  fireEvent.click(node!);
};

async function playOneRun(view: View) {
  press(view, 'Classic');
  await tick(10);
  for (let i = 0; i < NBA_SLOTS.length; i++) {
    press(view, i === 0 ? /Spin the wheel/ : /Next spin/);
    await tick(1600);
    press(view, PLAYERS[i].name);
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

describe('NBA Perfect Season result card', () => {
  it('the fixture squad sits between two integers, so rounding would change the printed odds', () => {
    expect(RAW).toBeCloseTo(94.517, 2);
    expect(perfectOddsLine('nba', RAW)).not.toBe(perfectOddsLine('nba', Math.round(RAW)));
  });

  it('prints the odds for the raw overall the sim played, and a first run is a new best', async () => {
    const view = render(frame());
    expect(view.container.querySelector('[data-best-record]')).toBeNull();
    await playOneRun(view);
    const odds = view.container.querySelector('[data-perfect-odds]');
    expect(odds, 'the run went 82-0 or never finished, so the odds line never drew').not.toBeNull();
    expect(odds!.textContent).toBe(perfectOddsLine('nba', RAW));
    expect(odds!.textContent).toMatch(/^At 94\.5 overall an 82-0 season comes about one run in [\d,]+\./);
    expect(view.container.querySelector('[data-best-record]')?.textContent).toBe('New personal best.');
    const stored = JSON.parse(localStorage.getItem('perfect-season-nba-best')!);
    expect(stored.overall).toBe(95);
    expect(stored.mode).toBe('classic');
    expect(stored.wins + stored.losses).toBe(82);
  });

  it('shows a stored best on the mode screen and on the card, and a worse run leaves it alone', async () => {
    const best = { v: 1, wins: 81, losses: 1, overall: 99, date: '2026-09-30', mode: 'classic' };
    localStorage.setItem('perfect-season-nba-best', JSON.stringify(best));
    const view = render(frame());
    expect(view.container.querySelector('[data-best-record]')?.textContent).toBe('Your best so far: 81-1 at 99 OVR.');
    await playOneRun(view);
    expect(view.container.querySelector('[data-best-record]')?.textContent).toBe('Your best: 81-1 at 99 OVR.');
    expect(JSON.parse(localStorage.getItem('perfect-season-nba-best')!)).toEqual(best);
  });
});
