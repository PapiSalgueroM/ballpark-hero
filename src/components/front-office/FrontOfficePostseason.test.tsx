/**
 * Round 1309: the NFL front office's playoffs on the board, a round at a time.
 *
 * The board is rendered on saves the engine and the bracket machine make
 * (src/lib/gmBracket.ts, src/lib/frontOfficePostseason.ts), so every case
 * reads the real board, its load, its save and its buttons.
 *
 * THE SAVE IN THE BRACKET. A hub save at Week 18 holds its bracket under the
 * key `playoffs`; outside the playoffs the key is absent. The load asks first
 * (src/lib/gmPostseason.ts) and repairs second: a sound bracket comes back as
 * it is and nothing is drawn on the way; one that does not read is started
 * again unplayed, the feed says so, and the log keeps its regular season and
 * drops its playoff games in the same load; a hub save past the last week
 * with nothing to play opens on the save error screen. Every save the board
 * writes in the playoffs holds the bracket (a signing is one), and neither
 * Abandon nor a new franchise carries it over.
 *
 * Negative controls: scripts/controlFrontOfficeBoard.mjs (noplayoffs,
 * abandonbracket, rebuiltkeeps, champopen), which point this file at a copy
 * of the board through FO_BOARD_NFL.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { initLeague, simGame, REGULAR_WEEKS, DEEP_ROSTER_MAX } from '@/lib/frontOffice';
import { FO_TEAMS } from '@/data/frontOfficePlayers';
import { addToGmGameLog, readGmGameLog, type GmGameLog } from '@/lib/gmGameLog';
import { nflIsRegular, nflTell, nflWhere } from '@/lib/frontOfficeGameDay';
import { NFL_POSTSEASON, nflPlayTie } from '@/lib/frontOfficePostseason';
import { BRACKET_REBUILT_LINES, openBracket, playBracketWeek, type GmBracketSave } from '@/lib/gmBracket';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));
vi.setConfig({ testTimeout: 300_000 });

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const SAVE_KEY = 'front-office-save-v1';
const REAL_RANDOM = Math.random;
const override = process.env.FO_BOARD_NFL;
const { default: Board } = (override
  ? await import(/* @vite-ignore */ override)
  : await import('@/components/front-office/FrontOfficeBoard')) as { default: ComponentType };

afterEach(() => { cleanup(); Math.random = REAL_RANDOM; localStorage.clear(); });

/** A fifteen man league with its regular season played (the morning after Week 17: week 18), its bracket's format and seeds. */
function seasonOver() {
  const rng = lehmer(7);
  const league: any = initLeague(rng);
  for (let w = 1; w <= REGULAR_WEEKS; w += 1) { league.schedule[w - 1].forEach((g: any) => simGame(g, league.teams, rng)); league.week += 1; }
  const seeds = NFL_POSTSEASON.seeds(league);
  return { league, seeds, format: NFL_POSTSEASON.formatFor(league.season)!, team: seeds[1] };
}
/** His regular season told the way the board tells a week (the key is the season, the week, the clubs and the engine's score). */
function regularLog(league: any, team: string): GmGameLog {
  let log: GmGameLog | null = null;
  for (let w = 1; w <= REGULAR_WEEKS; w += 1) {
    const g = league.schedule[w - 1].find((x: any) => x.home === team || x.away === team);
    if (!g) continue;
    const t = nflTell(g, league.teams, league.season, nflWhere(w));
    log = addToGmGameLog(log, league.season, t.last ? [t.last] : []);
  }
  return log!;
}
/** The bracket with its first round played through the NFL's bind, and the log with his game of it. */
function afterRound(o: ReturnType<typeof seasonOver>, log: GmGameLog) {
  const told: GmGameLog['games'] = [];
  const block = playBracketWeek(o.format, openBracket(o.format, o.league.season, o.seeds), nflPlayTie(o.league.teams, lehmer(3), o.league.season, undefined, told));
  return { block, log: addToGmGameLog(log, o.league.season, told.filter(g => g.home === o.team || g.away === o.team))! };
}
const shape = (league: any, team: string, patch: Record<string, unknown> = {}) =>
  ({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0, ...patch });
const save = (s: unknown) => localStorage.setItem(SAVE_KEY, JSON.stringify(s));
const read = (): any => JSON.parse(localStorage.getItem(SAVE_KEY)!);
const logOf = (s: any): GmGameLog | null => readGmGameLog(s.gameLog, id => Object.prototype.hasOwnProperty.call(s.league.teams, id), s.league.season, s.myTeam);
const counted = (seed: number) => { const r = lehmer(seed); const c = { n: 0 }; Math.random = () => { c.n += 1; return r(); }; return c; };
const errorScreen = () => screen.queryByText('Delete unusable save');
/** One free agent signed through the Free agency box (a save the board writes for a reason that is not the bracket). */
function signOne() {
  fireEvent.click(screen.getByText('Free agency'));
  const sign = [...document.querySelectorAll('[data-fa-row] button')].find(b => b.textContent === 'Sign' && !(b as HTMLButtonElement).disabled) as HTMLElement;
  expect(sign, 'a free agent he can sign').toBeTruthy();
  fireEvent.click(sign);
  fireEvent.click(screen.getByText('Hub'));
}

describe('NFL front office: a save in the playoffs', () => {
  it('loads with its bracket, draws nothing on the way, and every save after it holds the bracket', () => {
    const o = seasonOver();
    const { block, log } = afterRound(o, regularLog(o.league, o.team));
    save(shape(o.league, o.team, { playoffs: block, gameLog: log }));
    const draws = counted(11);
    const first = render(<Board />);
    expect(errorScreen()).toBeNull();
    expect(draws.n, 'a mount in the playoffs draws nothing').toBe(0);
    signOne();
    expect(read().playoffs, 'the signing saved the bracket with it').toEqual(block);
    expect(read().gameLog).toEqual(log);
    first.unmount();
    const again = counted(12);
    render(<Board />);
    expect(errorScreen()).toBeNull();
    expect(again.n, 'nor does a remount').toBe(0);
    expect(read().playoffs).toEqual(block);
  });

  it('a bracket that does not read is started again unplayed: the feed says so, and the log keeps its regular season and drops its playoff games', () => {
    const o = seasonOver();
    const regular = regularLog(o.league, o.team);
    const { block, log } = afterRound(o, regular);
    expect(log.games.length, 'the case holds a playoff game of his').toBe(regular.games.length + 1);
    const doctored: GmBracketSave = JSON.parse(JSON.stringify(block));
    const g0 = doctored.played[0];
    g0.games[0].winner = g0.games[0].winner === g0.home ? g0.away : g0.home;
    save(shape(o.league, o.team, { playoffs: doctored, gameLog: log }));
    const draws = counted(11);
    render(<Board />);
    expect(errorScreen()).toBeNull();
    expect(draws.n).toBe(0);
    expect(document.body.textContent).toContain(BRACKET_REBUILT_LINES.seeds);
    const after = read();
    expect(after.playoffs, 'started again from its own seeds, unplayed').toEqual(openBracket(o.format, o.league.season, o.seeds));
    const kept = logOf(after);
    expect(kept, 'the log still reads').not.toBeNull();
    expect(kept!.games.every(nflIsRegular), 'no playoff game of a bracket that is gone').toBe(true);
    expect(kept!.games).toEqual(regular.games);
  });

  it.each([
    ['no bracket on it', (o: ReturnType<typeof seasonOver>) => shape(o.league, o.team)],
    ['a bracket, but its season already has a champion', (o: ReturnType<typeof seasonOver>) => {
      const league = { ...o.league, champions: [...o.league.champions, { season: o.league.season, team: o.seeds[0] }] };
      return shape(league, o.team, { playoffs: openBracket(o.format, o.league.season, o.seeds) });
    }],
    ['a bracket of a season no bracket can be made for', (o: ReturnType<typeof seasonOver>) => {
      const block = { ...openBracket(o.format, 2019, o.seeds) };
      return shape({ ...o.league, season: 2019 }, o.team, { playoffs: block });
    }],
  ])('a hub save past the last week with %s opens on the save error screen, and nothing is written', (_what, make) => {
    const o = seasonOver();
    save(make(o));
    const before = localStorage.getItem(SAVE_KEY);
    render(<Board />);
    expect(errorScreen(), 'the save error screen with its delete button').not.toBeNull();
    expect(localStorage.getItem(SAVE_KEY)).toBe(before);
  });

  it('a bracket on a save outside the playoffs is not read, and the next save drops it', () => {
    const o = seasonOver();
    const rng = lehmer(7);
    const league: any = initLeague(rng);
    for (let w = 1; w < 10; w += 1) { league.schedule[w - 1].forEach((g: any) => simGame(g, league.teams, rng)); league.week += 1; }
    save(shape(league, o.team, { playoffs: openBracket(o.format, league.season, o.seeds) }));
    render(<Board />);
    expect(errorScreen()).toBeNull();
    fireEvent.click(screen.getByText('This week'));
    fireEvent.click(screen.getByText('Play Week 10'));
    expect(read().league.week).toBe(11);
    expect('playoffs' in read(), 'a bracket outside the playoffs is never written back').toBe(false);
  });
});

describe('NFL front office: the bracket does not follow a GM into his next franchise', () => {
  it('abandon in the playoffs and start again: the new save holds no bracket, and Play Week 1 plays Week 1', async () => {
    const o = seasonOver();
    const { block, log } = afterRound(o, regularLog(o.league, o.team));
    save(shape(o.league, o.team, { playoffs: block, gameLog: log }));
    const first = render(<Board />);
    fireEvent.click(screen.getByText('Abandon franchise and restart'));
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    const next = FO_TEAMS.find(t => t.abbr !== o.team)!;
    fireEvent.click(screen.getByText(`${next.city} ${next.name}`));
    await waitFor(() => expect(localStorage.getItem(SAVE_KEY)).not.toBeNull(), { timeout: 60_000 });
    expect(read().league.week).toBe(1);
    expect('playoffs' in read(), 'a new franchise holds no bracket').toBe(false);
    first.unmount();
    render(<Board />);
    if (read().league.teams[next.abbr].players.length > DEEP_ROSTER_MAX) {
      fireEvent.click(screen.getByText('Roster'));
      while (read().league.teams[next.abbr].players.length > DEEP_ROSTER_MAX) {
        const group = [...document.querySelectorAll('[data-roster-group]')].find(b => /DB|LB|WR/.test(b.getAttribute('data-roster-group') ?? '')) as HTMLElement;
        fireEvent.click(group);
        const rows = [...document.querySelectorAll('[data-roster-row]')] as HTMLElement[];
        fireEvent.click(rows[rows.length - 1].querySelector('button')!);
        fireEvent.click(screen.getByText('Cut him'));
        fireEvent.click(screen.getByText('Groups'));
      }
      fireEvent.click(screen.getByText('Hub'));
    }
    fireEvent.click(screen.getByText('This week'));
    fireEvent.click(screen.getByText('Play Week 1'));
    expect(read().league.week, 'Week 1 was played as Week 1').toBe(2);
    expect('playoffs' in read()).toBe(false);
  });
});
