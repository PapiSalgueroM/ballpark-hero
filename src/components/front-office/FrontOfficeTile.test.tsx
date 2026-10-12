/**
 * Round 1307: the NFL front office's Game Day tile and Watch, on the real
 * board and real saves.
 *
 * Round 1305 made every score a football score and kept his games in the
 * save; its tests (FrontOfficeGameDay.test.tsx, FrontOfficeOnePress.test.tsx)
 * hold the press and are not repeated here. This file holds what a player
 * now SEES and the one rule Watch must never break:
 *   - the week box has a tile; after a press it shows the saved final of
 *     his game, with the league grid under it; a remount shows it again;
 *   - WATCH IS THE SAME PRESS: the save a watched week leaves is the save
 *     the played week leaves, byte for byte, the moment it is pressed and
 *     after full time. The watch state is never saved;
 *   - NO SPOILER: while he watches, the week, his record, the matchup, the
 *     Play label and the tile hold nothing of the result, the league grid
 *     is not drawn and both buttons are shut;
 *   - a reload or leaving the box in the middle of a watch shows the
 *     result, never a clock, and plays nothing twice;
 *   - reduced motion: Watch shows the result at once;
 *   - the final week has no Watch (its press goes to the recap);
 *   - a save from before the log shows the next game until its first
 *     press, and its chips then start at that week;
 *   - THE OWNER CARD IS ONE OF THE READERS: its pace line prints his wins,
 *     so read from the league after the press it is the result. Held on a
 *     save whose mandate is a number of wins, over six watched weeks;
 *   - HIS SEED IS COUNTED FROM 1: on a club that holds a seed the standing
 *     line is the engine's own seeding of the saved league, the sentence
 *     written out here and not taken from the lib that prints it.
 *
 * Negative controls: scripts/controlFrontOfficeBoard.mjs names this file's
 * controls (recordspoils, gridspoils, holdkept, tilenolog, pacespoils,
 * seedoff) beside the press's own.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { initLeague, simGame, conferenceOf, conferenceSeeds, REGULAR_WEEKS } from '@/lib/frontOffice';
import { readGmGameLog, type GmGameLog } from '@/lib/gmGameLog';
import { gameDayView, standingLine } from '@/lib/gmGameDayView';
import { NFL_GAME_DAY } from '@/lib/gameLaws/nflGameDay';
import { mandatePace } from '@/lib/foOwnerMandate';

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
const override = process.env.FO_BOARD_NFL;
const { default: Board } = (override
  ? await import(/* @vite-ignore */ override)
  : await import('@/components/front-office/FrontOfficeBoard')) as { default: ComponentType };

/** A fifteen man league on the morning of `week`, with the club the GM runs. */
function leagueAt(week: number) {
  const rng = lehmer(7);
  const league: any = initLeague(rng);
  const team = Object.keys(league.teams)[0];
  for (let w = 1; w < week; w += 1) { league.schedule[w - 1].forEach((g: any) => simGame(g, league.teams, rng)); league.week += 1; }
  return { league, team };
}
const shape = (league: any, team: string) => ({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
const save = (s: unknown) => localStorage.setItem(SAVE_KEY, JSON.stringify(s));
const raw = () => localStorage.getItem(SAVE_KEY)!;
const read = (): any => JSON.parse(raw());
const logOf = (s: any): GmGameLog | null => readGmGameLog(s.gameLog, id => Object.prototype.hasOwnProperty.call(s.league.teams, id), s.league.season, s.myTeam);
const q = (sel: string) => document.querySelector(sel);
const text = (sel: string) => (q(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim();
const button = (label: string) => screen.getByText(label).closest('button') as HTMLButtonElement;
const reduce = (on: boolean) => { (window as any).matchMedia = (query: string) => ({ matches: on && /reduce/.test(query), media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }); };
/** The week box opened and the tile's chunk landed. */
const openWeek = async () => {
  fireEvent.click(screen.getByText('This week'));
  await waitFor(() => expect(q('[data-gameday]')).not.toBeNull());
};
/** The final of a logged game as the tile prints it. */
const finalOf = (s: any) => {
  const games = logOf(s)!.games;
  const v = gameDayView(NFL_GAME_DAY, games[games.length - 1], s.myTeam, id => id);
  return { v, text: `${v.won ? 'W' : 'L'}${v.us} ${v.final.us}, ${v.them} ${v.final.them}` };
};
const record = (s: any) => `${s.league.teams[s.myTeam].wins}-${s.league.teams[s.myTeam].losses}`;

let restoreRandom: (() => void) | null = null;
const seed = () => { restoreRandom?.(); const spy = vi.spyOn(Math, 'random').mockImplementation(lehmer(11)); restoreRandom = () => spy.mockRestore(); };
beforeEach(() => { localStorage.clear(); reduce(false); seed(); });
afterEach(() => { cleanup(); restoreRandom?.(); restoreRandom = null; });

describe('NFL front office: the Game Day tile', () => {
  it('the week box holds a tile: the next game before a press, his saved final after it, and again after a remount', async () => {
    const { league, team } = leagueAt(6);
    save(shape(league, team));
    render(<Board />);
    await openWeek();
    expect(q('[data-gameday-box] [data-gameday]')!.getAttribute('data-gameday-face')).toBe('next');
    expect(text('[data-gameday-next]')).toMatch(/^Next up: (at|home to) \w+\.$/);
    expect(button('Play Week 6').disabled).toBe(false);
    expect(button('Watch Week 6').disabled).toBe(false);
    const boxClass = q('[data-gameday-box]')!.className;
    fireEvent.click(button('Play Week 6'));
    const s = read();
    expect(logOf(s)!.games).toHaveLength(1);
    const { v, text: final } = finalOf(s);
    await waitFor(() => expect(q('[data-gameday]')!.getAttribute('data-gameday-face')).toBe('result'));
    expect(text('[data-gameday-final]')).toBe(final);
    expect(text('[data-gameday-where]')).toBe(`Wk 6 · ${v.home ? 'vs' : 'at'} ${v.them}`);
    /* where he stands is the engine's own seeding of the league as saved */
    const seeds = conferenceSeeds(s.league.teams, conferenceOf(team));
    expect(text('[data-gameday-standing]')).toBe(standingLine({ table: conferenceOf(team), seed: seeds.includes(team) ? seeds.indexOf(team) + 1 : null, seeds: 7 }));
    /* the league grid is under the tile, inside the one wrapper the reveal holds, and the box did not change */
    expect(document.querySelectorAll('div.grid.max-h-56 > div')).toHaveLength(16);
    expect(q('[data-gameday-box]')!.parentElement!.contains(q('div.grid.max-h-56'))).toBe(true);
    expect(q('[data-gameday-box]')!.className).toBe(boxClass);
    expect(text('[data-record-chip]')).toBe(`Record ${record(s)}`);
    expect(text('[data-week-chip]')).toContain('Week 7/17');
    /* a remount: the grid is gone (it was never saved), the tile reads the log */
    cleanup();
    render(<Board />);
    await openWeek();
    await waitFor(() => expect(text('[data-gameday-final]')).toBe(final));
    expect(q('div.grid.max-h-56')).toBeNull();
    expect(raw()).toBe(JSON.stringify(s));
  });

  it('WATCH IS THE SAME PRESS and gives nothing away: the page is the week before it until full time, and the save is the played week\'s', async () => {
    const { league, team } = leagueAt(6);
    const start = JSON.stringify(shape(league, team));
    /* the same week PLAYED, from the same save and the same draws */
    localStorage.setItem(SAVE_KEY, start);
    render(<Board />);
    await openWeek();
    fireEvent.click(button('Play Week 6'));
    const played = raw();
    cleanup();
    /* and WATCHED */
    seed();
    localStorage.setItem(SAVE_KEY, start);
    render(<Board />);
    await openWeek();
    const before = { week: text('[data-week-chip]'), record: text('[data-record-chip]'), matchup: text('[data-week-matchup]') };
    expect(before.week).toContain('Week 6/17');
    fireEvent.click(button('Watch Week 6'));
    expect(raw(), 'the watched press saved what the played press saved').toBe(played);
    const s = read();
    const { v, text: final } = finalOf(s);
    await waitFor(() => expect(q('[data-gameday]')!.getAttribute('data-gameday-face')).toBe('watch'));
    /* the five readers of the league are the week before the press */
    expect(text('[data-week-chip]')).toBe(before.week);
    expect(text('[data-record-chip]')).toBe(before.record);
    expect(text('[data-record-chip]')).not.toBe(`Record ${record(s)}`);
    expect(text('[data-week-matchup]')).toBe(before.matchup);
    expect(button('Play Week 6').disabled).toBe(true);
    expect(button('Watch Week 6').disabled).toBe(true);
    expect(screen.queryByText('Play Week 7')).toBeNull();
    /* nothing of the result: no grid, no result face, and no text on the page holds the final */
    expect(q('div.grid.max-h-56')).toBeNull();
    for (const sel of ['[data-gameday-final]', '[data-line-score]', '[data-gameday-standing]', '[data-gameday-chips]']) expect(q(sel)).toBeNull();
    expect(q('[data-match-clock]')).not.toBeNull();
    const page = document.body.textContent ?? '';
    expect(page).not.toContain(`${v.us} ${v.final.us}, ${v.them} ${v.final.them}`);
    expect(page).not.toContain(`${v.home ? v.us : v.them} ${v.home ? v.final.us : v.final.them}`);
    expect(page).not.toContain(`Record ${record(s)}`);
    /* Results is the sim to the end: the page moves on and shows what the save has held all along */
    fireEvent.click(q('[data-gameday-speed="Results"]')!);
    await waitFor(() => expect(q('[data-gameday]')!.getAttribute('data-gameday-face')).toBe('result'));
    expect(text('[data-gameday-final]')).toBe(final);
    expect(text('[data-week-chip]')).toContain('Week 7/17');
    expect(text('[data-record-chip]')).toBe(`Record ${record(s)}`);
    expect(document.querySelectorAll('div.grid.max-h-56 > div')).toHaveLength(16);
    expect(button('Play Week 7').disabled).toBe(false);
    expect(button('Watch Week 7').disabled).toBe(false);
    expect(raw(), 'full time saved nothing').toBe(played);
  });

  it('a reload in the middle of a watch shows the result, never a clock, and plays nothing twice', async () => {
    const { league, team } = leagueAt(6);
    save(shape(league, team));
    render(<Board />);
    await openWeek();
    fireEvent.click(button('Watch Week 6'));
    await waitFor(() => expect(q('[data-match-clock]')).not.toBeNull());
    const mid = raw();
    cleanup();
    render(<Board />);
    await openWeek();
    await waitFor(() => expect(q('[data-gameday]')!.getAttribute('data-gameday-face')).toBe('result'));
    expect(q('[data-match-clock]')).toBeNull();
    expect(text('[data-gameday-final]')).toBe(finalOf(JSON.parse(mid)).text);
    expect(text('[data-week-chip]')).toContain('Week 7/17');
    expect(button('Play Week 7').disabled).toBe(false);
    expect(raw()).toBe(mid);
    expect(logOf(read())!.games.map(g => g.where)).toEqual(['w6']);
  });

  it('leaving the week box in the middle of a watch ends it: back in the box the result is there and both buttons are open', async () => {
    const { league, team } = leagueAt(6);
    save(shape(league, team));
    render(<Board />);
    await openWeek();
    fireEvent.click(button('Watch Week 6'));
    await waitFor(() => expect(q('[data-match-clock]')).not.toBeNull());
    fireEvent.click(button('Hub'));
    await waitFor(() => expect(q('[data-week-box]')).toBeNull());
    await openWeek();
    await waitFor(() => expect(q('[data-gameday]')!.getAttribute('data-gameday-face')).toBe('result'));
    expect(q('[data-match-clock]')).toBeNull();
    expect(button('Play Week 7').disabled).toBe(false);
    expect(button('Watch Week 7').disabled).toBe(false);
    expect(logOf(read())!.games.map(g => g.where)).toEqual(['w6']);
  });

  it('reduced motion: Watch shows the result at once, with no clock', async () => {
    reduce(true);
    const { league, team } = leagueAt(6);
    save(shape(league, team));
    render(<Board />);
    await openWeek();
    fireEvent.click(button('Watch Week 6'));
    const s = read();
    await waitFor(() => expect(text('[data-gameday-final]')).toBe(finalOf(s).text));
    expect(q('[data-match-clock]')).toBeNull();
    await waitFor(() => expect(text('[data-week-chip]')).toContain('Week 7/17'));
    expect(document.querySelectorAll('div.grid.max-h-56 > div')).toHaveLength(16);
    expect(button('Play Week 7').disabled).toBe(false);
  });

  it('the final week has no Watch: its press goes to the recap', async () => {
    const { league, team } = leagueAt(REGULAR_WEEKS);
    save(shape(league, team));
    render(<Board />);
    await openWeek();
    expect(screen.getByText('Play the final week + playoffs')).toBeTruthy();
    expect(q('[data-watch-week]')).toBeNull();
    expect(screen.queryByText(/^Watch Week/)).toBeNull();
    /* and the tile does not offer what the week box does not: no "watch it", no result promised in the box */
    expect(q('[data-gameday]')!.getAttribute('data-gameday-face')).toBe('next');
    expect(text('[data-gameday-next-note]')).toBe('No Watch on this one. The final week runs straight into the playoffs.');
    expect(text('[data-week-box]')).not.toMatch(/watch it|lands here/i);
  });

  it('NO SPOILER ON THE OWNER CARD: while he watches, its pace line is the one of before the press, and at full time the saved league\'s', async () => {
    const { league, team } = leagueAt(6);
    /* a mandate that is a number of wins, so the pace line prints his wins (the other kinds only say in or out) */
    const mandate = { tier: 'rebuild', text: 'Rebuild honestly: 6 wins keeps the project on schedule upstairs.', winFloor: 6, reqLevel: 0, season: league.season };
    save({ ...shape(league, team), mandate });
    render(<Board />);
    await openWeek();
    const PACE = /\d+ wins (keeps the mandate on pace|is behind the 6-win ask)\./;
    const paceOf = (s: any) => mandatePace(mandate as any, s.league.teams[team].wins, (s.league.week - 1) / REGULAR_WEEKS, false).line;
    let moved = 0;
    for (let week = 6; week < 12; week += 1) {
      const before = text('[data-owner-mandate]');
      expect(before, `week ${week}: the owner card shows a pace line before the press`).toMatch(PACE);
      expect(before).toContain(paceOf(read()));
      fireEvent.click(button(`Watch Week ${week}`));
      const s = read();
      expect(s.league.week).toBe(week + 1);
      await waitFor(() => expect(q('[data-gameday]')!.getAttribute('data-gameday-face')).toBe('watch'));
      expect(text('[data-owner-mandate]'), `week ${week}: the owner card while the game is watched`).toBe(before);
      fireEvent.click(q('[data-gameday-speed="Results"]')!);
      await waitFor(() => expect(q('[data-gameday]')!.getAttribute('data-gameday-face')).toBe('result'));
      const after = text('[data-owner-mandate]');
      expect(after, `week ${week}: the owner card at full time`).toContain(paceOf(s));
      if (after !== before) moved += 1;
    }
    /* not a comparison of a line with itself: at full time it moved, so held back it was the result */
    expect(moved, 'weeks of six whose pace line moved at full time').toBeGreaterThan(0);
  });

  it('HIS SEED IS COUNTED FROM 1: on a club that holds a seed the standing line is the engine\'s own seeding of the saved league', async () => {
    const { league } = leagueAt(12);
    /* the club that tops the AFC on the morning of Week 12 */
    const team = conferenceSeeds(league.teams, 'AFC')[0];
    save(shape(league, team));
    render(<Board />);
    await openWeek();
    const NTH = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];
    const seen: string[] = [];
    for (let week = 12; week < 15; week += 1) {
      fireEvent.click(button(`Play Week ${week}`));
      const s = read();
      const seeds = conferenceSeeds(s.league.teams, 'AFC');
      expect(seeds).toHaveLength(7);
      const k = seeds.indexOf(team);
      await waitFor(() => expect(text('[data-gameday-where]')).toMatch(new RegExp(`^Wk ${week} `)));
      expect(text('[data-gameday-standing]'), `after Week ${week}, the engine seeds him ${k + 1}`).toBe(k >= 0 ? `AFC: ${NTH[k]} seed of 7 as it stands.` : 'AFC: outside the 7 seeds as it stands.');
      if (k >= 0) seen.push(NTH[k]);
    }
    /* the case this test exists for was looked at: a seed, and so a number counted from 1 */
    expect(seen.length, `presses of three after which he held a seed (${seen.join(', ')})`).toBeGreaterThan(0);
  });

  it('a save from before the log shows the next game, and after its first press the chips start at that week', async () => {
    const { league, team } = leagueAt(9);
    save(shape(league, team));
    render(<Board />);
    await openWeek();
    expect(q('[data-gameday]')!.getAttribute('data-gameday-face')).toBe('next');
    expect(q('[data-gameday-chip]')).toBeNull();
    fireEvent.click(button('Play Week 9'));
    await waitFor(() => expect(q('[data-gameday]')!.getAttribute('data-gameday-face')).toBe('result'));
    fireEvent.click(button('Play Week 10'));
    await waitFor(() => expect(document.querySelectorAll('[data-gameday-chip]')).toHaveLength(2));
    expect([...document.querySelectorAll('[data-gameday-chip]')].map(c => c.getAttribute('data-gameday-chip'))).toEqual(['w9', 'w10']);
    /* the tile prints no record of its own: the only record on the page is the league's */
    const s = read();
    expect(text('[data-record-chip]')).toBe(`Record ${record(s)}`);
    expect(text('[data-gameday-box]')).not.toMatch(/\brecord\b/i);
    expect(text('[data-gameday-final]')).toBe(finalOf(s).text);
  });
});
