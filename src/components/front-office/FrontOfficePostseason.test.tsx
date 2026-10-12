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
 * abandonbracket, rebuiltkeeps, champopen, bracketnoedges, restround,
 * weekeighteen, playofftrades, roundspoils, holdround, recapnow,
 * bracketgrid, tiegame, and from the fix pass trustspoils, pressspoils,
 * donenow and tiewhere), which point this file at a copy of the board
 * through FO_BOARD_NFL.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { initLeague, simGame, REGULAR_WEEKS, DEEP_ROSTER_MAX, DEPTH_GROUPS } from '@/lib/frontOffice';
import { FO_TEAMS } from '@/data/frontOfficePlayers';
import { FO_DEPTH } from '@/data/frontOfficeDepth';
import { openNflDesk } from '@/lib/nflGmDesk';
import { addToGmGameLog, readGmGameLog, type GmGameLog } from '@/lib/gmGameLog';
import { nflIsRegular, nflTell, nflWhere } from '@/lib/frontOfficeGameDay';
import { NFL_POSTSEASON, nflPlayTie } from '@/lib/frontOfficePostseason';
import { BRACKET_REBUILT_LINES, bracketPairings, bracketWeek, openBracket, playBracketWeek, type GmBracketSave } from '@/lib/gmBracket';

/* the finish the board reports on every render (the fix pass's title watch test reads it) */
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: (_slug: string, done: boolean) => { ((globalThis as any).__foDone ??= []).push(done); } }));
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
function seasonOver(seed = 7) {
  const rng = lehmer(seed);
  const league: any = initLeague(rng);
  /* simGame hands back the played game and leaves the schedule's row as it was (the board keeps no result there) */
  const played: any[][] = [];
  for (let w = 1; w <= REGULAR_WEEKS; w += 1) { played.push(league.schedule[w - 1].map((g: any) => simGame(g, league.teams, rng))); league.week += 1; }
  const seeds = NFL_POSTSEASON.seeds(league);
  return { league, played, seeds, format: NFL_POSTSEASON.formatFor(league.season)!, team: seeds[1] };
}
/** His regular season told the way the board tells a week (the key is the season, the week, the clubs and the engine's score). */
function regularLog(o: ReturnType<typeof seasonOver>): GmGameLog {
  const { league, team } = o;
  let log: GmGameLog | null = null;
  for (let w = 1; w <= REGULAR_WEEKS; w += 1) {
    const g = o.played[w - 1].find((x: any) => x.home === team || x.away === team);
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
    const { block, log } = afterRound(o, regularLog(o));
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
    const regular = regularLog(o);
    const { block, log } = afterRound(o, regular);
    expect(regular.games, 'his seventeen regular season games').toHaveLength(17);
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
    const { block, log } = afterRound(o, regularLog(o));
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

/* ───────────── Round 1309 (b2): the presses ─────────────
   THE BRACKET PATH IS THE ONE PRESS PATH. The twelve saves of
   FrontOfficeOnePress.test.tsx (both league kinds, the GM desk off and on, an
   ordinary season, a title and a firing), built here the same way from the
   same seeds in a fresh module graph with fixed ids: the old button's one
   press, "Play Week 17" then a press a round, and "Play Week 17" then "Sim
   the rest" must leave the SAME SAVE, string for string (the league with
   every record, the champion, the told rounds, the log with its keys, the
   trust, the mandate, the desk), after the same number of draws. With the
   desk on, the edges reach the told scores, so a bracket played without them
   is red here on a told score (control bracketnoedges). */
type Kind = 'fifteen' | 'deep';
type Ending = 'ordinary' | 'title' | 'fired';
const useRandom = (fn: () => number) => { Math.random = fn; };

async function freshGame() {
  vi.resetModules();
  useRandom(lehmer(1305));
  await import('@/lib/entityIds');
  const E = await import('@/lib/frontOffice');
  const { FO_DEPTH } = await import('@/data/frontOfficeDepth');
  const { openNflDesk } = await import('@/lib/nflGmDesk');
  const { default: B } = (override
    ? await import(/* @vite-ignore */ override)
    : await import('@/components/front-office/FrontOfficeBoard')) as { default: ComponentType };
  return { E, FO_DEPTH, openNflDesk, Board: B };
}
/** FrontOfficeOnePress.test.tsx's save on the morning of the final week, made the same way. */
function finalWeekSave(G: Awaited<ReturnType<typeof freshGame>>, kind: Kind, desk: boolean, ending: Ending) {
  const rng = lehmer(7);
  const league: any = kind === 'deep' ? G.E.initLeague(rng, { depth: G.FO_DEPTH }) : G.E.initLeague(rng);
  const team = Object.keys(league.teams)[0];
  if (ending === 'title') { for (const p of league.teams[team].players) p.ovr = 99; league.teams[team].defense = 99; }
  for (let w = 1; w < G.E.REGULAR_WEEKS; w += 1) { league.schedule[w - 1].forEach((g: any) => G.E.simGame(g, league.teams, rng)); league.week += 1; }
  const s: any = { league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 };
  if (ending === 'fired') {
    s.trust = 5;
    s.mandate = { tier: 'title', text: 'Win the Super Bowl. Anything less is a failed season upstairs.', winFloor: 0, reqLevel: 4, season: league.season };
    for (const p of league.teams[team].players) p.ovr = 60;
    league.teams[team].defense = 60;
  }
  if (desk) s.gm = G.openNflDesk(league, team);
  return { save: s, team };
}
const pressOn = (sel: string) => { const b = document.querySelector(sel) as HTMLButtonElement | null; expect(b, `the button ${sel}`).toBeTruthy(); fireEvent.click(b!); };
type Path = 'one' | 'rounds' | 'rest';
/** One run from the morning of Week 17 to the recap: the save it leaves and the draws it took. `restAfter`: the round presses before "Sim the rest". */
async function runPath(kind: Kind, desk: boolean, ending: Ending, seed: number, path: Path, restAfter = 0) {
  cleanup();
  localStorage.clear();
  const G = await freshGame();
  const made = finalWeekSave(G, kind, desk, ending);
  localStorage.setItem(SAVE_KEY, JSON.stringify(made.save));
  const draws = counted(seed);
  const view = render(<G.Board />);
  fireEvent.click(screen.getByText('This week'));
  let presses = 0;
  if (path === 'one') fireEvent.click(screen.getByText('Play the final week + playoffs'));
  else {
    fireEvent.click(screen.getByText('Play Week 17'));
    const opened = read();
    expect([opened.league.week, opened.phase, opened.seasonsPlayed, 'playoffs' in opened], '"Play Week 17" opens the bracket and closes nothing').toEqual([18, 'hub', 0, true]);
    expect(opened.league.champions.some((c: any) => c.season === opened.league.season)).toBe(false);
    for (; presses < restAfter && 'playoffs' in read(); presses += 1) pressOn('[data-press="round"]');
    if (path === 'rest') pressOn('[data-press="rest"]');
    else for (; presses < 8 && 'playoffs' in read(); presses += 1) pressOn('[data-press="round"]');
  }
  const raw = localStorage.getItem(SAVE_KEY)!;
  view.unmount();
  return { raw, draws: draws.n, team: made.team, presses };
}
const tookOf = (s: any, team: string): Ending => (s.fired ? 'fired' : s.postseason?.champion === team ? 'title' : 'ordinary');

for (const kind of ['fifteen', 'deep'] as Kind[]) {
  for (const desk of [false, true]) {
    describe(`NFL front office, ${kind} league, GM desk ${desk ? 'on' : 'off'}: the bracket a round at a time is the one press`, () => {
      for (const ending of ['ordinary', 'title', 'fired'] as Ending[]) {
        it(`${ending}: "Play Week 17" then a press a round, and then "Sim the rest", leave the one press save after the same draws`, async () => {
          let seed = 11;
          let one = await runPath(kind, desk, ending, seed, 'one');
          for (; ending === 'title' && tookOf(JSON.parse(one.raw), one.team) !== 'title' && seed < 18;) one = await runPath(kind, desk, ending, (seed += 1), 'one');
          const base = JSON.parse(one.raw);
          expect(tookOf(base, one.team), `the case takes the ${ending} ending`).toBe(ending);
          const rounds = await runPath(kind, desk, ending, seed, 'rounds');
          expect(rounds.presses, 'four rounds, a press each').toBe(4);
          const rest = await runPath(kind, desk, ending, seed, 'rest');
          for (const [what, run] of [['a press a round', rounds], ['Sim the rest', rest]] as const) {
            const s = JSON.parse(run.raw);
            expect('playoffs' in s, `${what}: no bracket on the closed season`).toBe(false);
            expect(s.league.week).toBe(17);
            expect(s.league.champions.filter((c: any) => c.season === s.league.season)).toHaveLength(1);
            expect(Object.values(s.league.teams).every((t: any) => t.wins + t.losses === 17), `${what}: every club on 17 games`).toBe(true);
            expect(s.gameLog, `${what}: the log, every entry with its key`).toEqual(base.gameLog);
            expect(run.raw, `${what}: the save, string for string`).toBe(one.raw);
            expect(run.draws, `${what}: the draws`).toBe(one.draws);
          }
        });
      }
    });
  }
}

describe('NFL front office: Sim the rest from any round', () => {
  it('after one, two or three rounds a press, "Sim the rest" leaves the one press save after the same draws', async () => {
    const one = await runPath('fifteen', true, 'ordinary', 11, 'one');
    for (const k of [1, 2, 3]) {
      const r = await runPath('fifteen', true, 'ordinary', 11, 'rest', k);
      expect(r.presses, `${k} rounds pressed first`).toBe(k);
      expect(r.raw, `Sim the rest after ${k}`).toBe(one.raw);
      expect(r.draws).toBe(one.draws);
    }
  });
});

describe('NFL front office: a club over the roster limit cannot press a round', () => {
  it('the round and the rest are shut, and a press on them plays nothing', async () => {
    const G = await freshGame();
    const made = finalWeekSave(G, 'deep', false, 'ordinary');
    localStorage.setItem(SAVE_KEY, JSON.stringify(made.save));
    const first = render(<G.Board />);
    fireEvent.click(screen.getByText('This week'));
    fireEvent.click(screen.getByText('Play Week 17'));
    first.unmount();
    const s = read();
    const club = s.league.teams[s.myTeam];
    while (club.players.length <= DEEP_ROSTER_MAX) club.players.push(s.league.freeAgents.shift());
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    const before = localStorage.getItem(SAVE_KEY);
    render(<G.Board />);
    fireEvent.click(screen.getByText('This week'));
    for (const press of ['round', 'rest']) {
      const b = document.querySelector(`[data-press="${press}"]`) as HTMLButtonElement;
      expect(b.disabled, `${press} is shut over the limit`).toBe(true);
      fireEvent.click(b);
    }
    expect(localStorage.getItem(SAVE_KEY), 'nothing was played').toBe(before);
  });
});

/* ───────────── Round 1309 (b3): every reader of Week 18 ─────────────
   In the bracket the league sits at week 18, the engine's own "18 =
   playoffs". Nothing on the page may read that as an eighteenth week of a
   seventeen week season: not the chip, the week box's line, the old button,
   a hurt man's weeks, the roster limit's deadline, nor the hub's two boxes.
   And trades are shut for every GM while the bracket is open (control
   playofftrades in scripts/controlFrontOfficeBoard.mjs). */
const text = () => document.body.textContent ?? '';
/** The bracket save after one round (his game of it in the log), with `edit` applied to the league first. */
function inBracket(edit: (league: any, team: string) => void = () => undefined) {
  const o = seasonOver();
  const { block, log } = afterRound(o, regularLog(o));
  edit(o.league, o.team);
  save(shape(o.league, o.team, { playoffs: block, gameLog: log }));
  return { o, log };
}

describe('NFL front office: Week 18 reads as the playoffs', () => {
  it('the chip, the week box line and its buttons: no Week 18 of 17, no bye line, no old button', () => {
    const { o, log } = inBracket();
    /* the AFC's second seed played the Wild Card round: through, his next game is a Divisional one; out, he has none */
    const through = log.games[log.games.length - 1].winner === o.team;
    render(<Board />);
    expect(errorScreen()).toBeNull();
    const chip = document.querySelector('[data-week-chip]')!.textContent ?? '';
    expect(chip, 'the chip').toContain('Playoffs');
    expect(chip).not.toMatch(/Week \d+\/\d+/);
    fireEvent.click(screen.getByText('This week'));
    expect(document.querySelector('[data-week-matchup]')!.textContent, 'his round, by its name')
      .toBe(through ? 'Your game: the AFC Divisional.' : 'No game for you this round. The playoffs play on.');
    expect(text()).not.toContain('Bye week for you. The league plays on.');
    expect(screen.queryByText('Play the final week + playoffs'), 'the old button is for Week 17 only').toBeNull();
    expect(screen.queryByText(/^Play Week/), 'no week to play').toBeNull();
    expect(screen.getByText(through ? 'Play the AFC Divisional' : 'Play the next round')).toBeTruthy();
  });

  it('"Play Week 17" turns the chip to Playoffs and takes the old button away', () => {
    const rng = lehmer(7);
    const league: any = initLeague(rng);
    for (let w = 1; w < REGULAR_WEEKS; w += 1) { league.schedule[w - 1].forEach((g: any) => simGame(g, league.teams, rng)); league.week += 1; }
    save(shape(league, Object.keys(league.teams)[0]));
    render(<Board />);
    fireEvent.click(screen.getByText('This week'));
    expect(document.querySelector('[data-week-chip]')!.textContent).toContain(`Week ${REGULAR_WEEKS}/${REGULAR_WEEKS}`);
    fireEvent.click(screen.getByText(`Play Week ${REGULAR_WEEKS}`));
    expect(read().league.week).toBe(REGULAR_WEEKS + 1);
    expect(document.querySelector('[data-week-chip]')!.textContent).toContain('Playoffs');
    expect(text()).not.toMatch(/Week 18|Bye week for you/);
    expect(screen.queryByText('Play the final week + playoffs')).toBeNull();
  });

  it('a club with no game this round says so, never that it has a bye week', () => {
    const o = seasonOver();
    save(shape(o.league, o.seeds[0], { playoffs: openBracket(o.format, o.league.season, o.seeds) }));
    render(<Board />);
    fireEvent.click(screen.getByText('This week'));
    expect(document.querySelector('[data-week-matchup]')!.textContent, 'the top seed sits out the first round').toBe('No game for you this round. The playoffs play on.');
    expect(text()).not.toContain('Bye week for you');
    expect(screen.getByText('Play the next round')).toBeTruthy();
  });

  it('a hurt man is out for the playoffs, on the roster and on the depth chart, never out a count of weeks', () => {
    let hurt: any = null;
    inBracket((league, team) => { hurt = league.teams[team].players.find((p: any) => DEPTH_GROUPS.includes(p.pos)); hurt.out = 2; });
    render(<Board />);
    fireEvent.click(screen.getByText('Roster'));
    expect(text(), 'the roster row').toContain(`${hurt.name} (out for the playoffs)`);
    expect(text()).not.toMatch(/\(out \d+w\)/);
    fireEvent.click(document.querySelector('[data-depth-open]') as HTMLElement);
    fireEvent.click(document.querySelector(`[data-depth-group="${hurt.pos}"]`) as HTMLElement);
    expect(text(), 'the depth chart row').toContain(`${hurt.name} (out for the playoffs)`);
    expect(text()).not.toMatch(/\(out \d+w\)/);
  });

  it('over the roster limit, the men must go before the next round, not before Week 18', () => {
    const o = seasonOver();
    const rng = lehmer(7);
    const league: any = initLeague(rng, { depth: FO_DEPTH });
    for (let w = 1; w <= REGULAR_WEEKS; w += 1) { league.schedule[w - 1].forEach((g: any) => simGame(g, league.teams, rng)); league.week += 1; }
    const seeds = NFL_POSTSEASON.seeds(league);
    const club = league.teams[seeds[1]];
    while (club.players.length <= DEEP_ROSTER_MAX) club.players.push(league.freeAgents.shift());
    save(shape(league, seeds[1], { playoffs: openBracket(o.format, league.season, seeds) }));
    render(<Board />);
    fireEvent.click(screen.getByText('Roster'));
    expect(document.querySelector('[data-over-limit]')!.textContent).toContain('before the next round.');
    expect(text()).not.toContain('before Week 18');
  });

  it('the hub: the play box reads Postseason with his last playoff result, the table says the regular season is over, and no box counts weeks left', () => {
    const { o, log } = inBracket();
    render(<Board />);
    const g = log.games[log.games.length - 1];
    expect(nflIsRegular(g), 'the last game of the log is his playoff game').toBe(false);
    const won = g.winner === o.team;
    const us = g.home === o.team ? g.homeScore : g.awayScore;
    const them = g.home === o.team ? g.awayScore : g.homeScore;
    expect(text()).toContain('Postseason');
    expect(text(), 'his last result, read from the log on a fresh mount').toContain(`Last out: ${won ? 'won' : 'lost'} ${us}-${them}`);
    expect(text()).toContain('The regular season is over.');
    expect(text()).not.toMatch(/\b0 weeks to play|\b0 to play/);
  });

  it.each([[false], [true]])('a trade is refused in the bracket (GM desk on: %s), and nothing is traded', (desk) => {
    let piece: any = null;
    inBracket((league, team) => { piece = [...league.teams[team].players].sort((a: any, b: any) => b.ovr - a.ovr)[0]; });
    if (desk) { const s = read(); s.gm = openNflDesk(s.league, s.myTeam); save(s); }
    render(<Board />);
    expect(errorScreen()).toBeNull();
    fireEvent.click(screen.getByText('Trades'));
    fireEvent.click(screen.getAllByText(`${piece.name} (${piece.pos})`)[0]);
    const before = localStorage.getItem(SAVE_KEY);
    fireEvent.click(screen.getByText('Shop him around the league'));
    /* with the desk on, the deadline's own line refuses it first (Week 18 is past it); with it off, the playoffs' line */
    expect(text(), 'the refusal').toContain(desk ? '🔒 ' : '🔒 Trades are shut for the playoffs.');
    expect(text(), 'no offers were asked for').not.toContain('Nobody bit');
    expect(text()).not.toMatch(/[A-Z]{2,3} offer: /);
    expect(localStorage.getItem(SAVE_KEY), 'nothing was saved').toBe(before);
  });
});

/* ───────────── Round 1309 (c): the mount ─────────────
   ONE BOX, TWO FACES. In the playoffs the Game Day box shows the bracket
   card, or his game on the tile when a press logged one of his or he opened
   one ("Your game" on a decided tie of his); the row under the box holds the
   back chip on both faces, so the box never moves. No league grid in the
   bracket and no standing line on the tile (the bracket says where he
   stands). WATCH IN THE BRACKET is Round 1307's rule: the same press, the
   page as it stood before it until full time (the round's name, the line,
   the buttons shut, the bracket not drawn), and the title game's recap waits
   for the clock. Controls in scripts/controlFrontOfficeBoard.mjs:
   roundspoils, holdround, recapnow, bracketgrid. */
const q = (sel: string) => document.querySelector(sel);
const textOf = (sel: string) => (q(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim();
const btn = (sel: string) => { const b = q(sel) as HTMLButtonElement | null; expect(b, `the button ${sel}`).toBeTruthy(); return b!; };
const face = () => q('[data-gameday-box]')!.getAttribute('data-box-face');
/** A media query that never matches: full motion, and under sm (the Round 1307 tile test's own stand in) */
const motion = () => { (window as any).matchMedia = (query: string) => ({ matches: false, media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }); };
/** An unplayed bracket on the morning after Week 17, for the club at `at` of the frozen seeds (1: the AFC's second
 *  seed, who plays the Wild Card; 0: the top seed, who has the bye). `strong`: his club made good enough to win. */
function bracketSave(at: number, strong = false) {
  const o = seasonOver();
  const team = o.seeds[at];
  if (strong) { for (const p of o.league.teams[team].players) p.ovr = 99; o.league.teams[team].defense = 99; }
  const log = regularLog({ ...o, team });
  save(shape(o.league, team, { playoffs: openBracket(o.format, o.league.season, o.seeds), gameLog: log }));
  return { o, team, log };
}
const openBox = async () => {
  fireEvent.click(screen.getByText('This week'));
  await waitFor(() => expect(q('[data-bracket]')).not.toBeNull());
};

describe('NFL front office: one box, two faces in the playoffs', () => {
  it('a round he plays opens his game on the box with the back chip; the chip shows the bracket, and "Your game" opens that game', async () => {
    motion();
    const { team } = bracketSave(1, true);
    counted(21);
    render(<Board />);
    await openBox();
    expect(face()).toBe('bracket');
    expect(q('[data-bracket-back]'), 'no back chip on the bracket').toBeNull();
    expect(q('[data-bracket-row]'), 'the row under the box is there on both faces').not.toBeNull();
    const boxClass = q('[data-gameday-box]')!.className;
    for (const round of ['AFC Wild Card', 'AFC Divisional']) {
      fireEvent.click(btn('[data-press="round"]'));
      await waitFor(() => expect(q('[data-gameday]')).not.toBeNull());
      expect(face()).toBe('game');
      const last = logOf(read())!.games.at(-1)!;
      expect([last.where, last.winner], 'his game of the round, and he won it').toEqual([round, team]);
      expect(textOf('[data-gameday-where]')).toContain(round);
      expect(q('[data-gameday-standing]'), 'no standing line in the bracket').toBeNull();
      expect(q('div.grid.max-h-56'), 'no league grid in the bracket').toBeNull();
      expect(q('[data-gameday-box]')!.className).toBe(boxClass);
      expect(btn('[data-bracket-back]').disabled).toBe(false);
    }
    fireEvent.click(btn('[data-bracket-back]'));
    await waitFor(() => expect(q('[data-bracket]')).not.toBeNull());
    expect(face()).toBe('bracket');
    /* the Wild Card's week, and his game of it: the box opens THAT game, not the last one he played */
    fireEvent.click(btn('[data-bracket-week="1"]'));
    fireEvent.click(btn('[data-bracket-mine="true"] [data-bracket-open]'));
    await waitFor(() => expect(q('[data-gameday]')).not.toBeNull());
    expect(textOf('[data-gameday-where]')).toContain('AFC Wild Card');
    expect(q('[data-gameday-box]')!.className).toBe(boxClass);
  });

  it('a round he does not play (his bye) shows the bracket, and the log takes nothing', async () => {
    motion();
    const { log } = bracketSave(0);
    counted(22);
    render(<Board />);
    await openBox();
    expect(screen.queryByText('Watch your game'), 'no game of his to watch this round').toBeNull();
    fireEvent.click(btn('[data-press="round"]'));
    await waitFor(() => expect(q('[data-bracket]')).not.toBeNull());
    expect(face()).toBe('bracket');
    expect(read().playoffs.played.length, 'the round was played').toBeGreaterThan(0);
    expect(logOf(read())!.games).toEqual(log.games);
  });

  /* The fix pass (the review's mutant tiewhere: with the round dropped from the search, "Your game" opened the first
     game between the two clubs, a regular season one, and every test above stayed green: their ties were between
     clubs that never met before the playoffs). Leagues of other seeds, the first round played through the NFL's bind. */
  it('"Your game" on a tie against a club he met in the regular season opens the playoff game, not the regular one', async () => {
    motion();
    let met = 0;
    for (let seed = 1; seed <= 24 && met < 3; seed += 1) {
      const o = seasonOver(seed);
      for (const team of o.seeds.slice(1, 7)) {
        if (met >= 3) break;
        const told: GmGameLog['games'] = [];
        const block = playBracketWeek(o.format, openBracket(o.format, o.league.season, o.seeds), nflPlayTie(o.league.teams, lehmer(3), o.league.season, undefined, told));
        const mine = told.filter(g => g.home === team || g.away === team);
        const reg = regularLog({ ...o, team });
        if (mine.length !== 1) continue;
        const both = (g: { home: string; away: string }) => [g.home, g.away].includes(mine[0].home) && [g.home, g.away].includes(mine[0].away);
        if (!reg.games.some(both)) continue;
        met += 1;
        cleanup();
        localStorage.clear();
        save(shape(o.league, team, { playoffs: block, gameLog: addToGmGameLog(reg, o.league.season, mine)! }));
        counted(5);
        render(<Board />);
        await openBox();
        fireEvent.click(btn('[data-bracket-week="1"]'));
        fireEvent.click(btn('[data-bracket-mine="true"] [data-bracket-open]'));
        await waitFor(() => expect(q('[data-gameday]')).not.toBeNull());
        expect(textOf('[data-gameday-where]'), `seed ${seed}, ${team}: his ${mine[0].where} game`).toContain(mine[0].where);
      }
    }
    expect(met, 'ties against a club he met in the regular season, in leagues of 24 seeds').toBe(3);
  });
});

/** The bracket three rounds on, with his club in the title game; the log holds his games of it. His club is made
 *  strong for those three rounds only and saved with its own ratings, so the title game the board plays is an
 *  ordinary one (a blowout above the law's top score has no clock, and its watch ends at once: the tile's rule). */
function titleGameSave() {
  for (let k = 1; k <= 12; k += 1) {
    const o = seasonOver();
    const team = o.seeds[0];
    const club = o.league.teams[team];
    const own = { ovr: club.players.map((p: any) => p.ovr), defense: club.defense };
    for (const p of club.players) p.ovr = 99;
    club.defense = 99;
    const told: GmGameLog['games'] = [];
    const play = nflPlayTie(o.league.teams, lehmer(k), o.league.season, undefined, told);
    let block = openBracket(o.format, o.league.season, o.seeds);
    for (let w = 0; w < 3; w += 1) block = playBracketWeek(o.format, block, play);
    club.players.forEach((p: any, i: number) => { p.ovr = own.ovr[i]; });
    club.defense = own.defense;
    const week = bracketWeek(o.format, block);
    const final = week === null ? null : bracketPairings(o.format, block, week);
    if (!final || !final.some(p => p.homeId === team || p.awayId === team)) continue;
    const log = addToGmGameLog(regularLog({ ...o, team }), o.league.season, told.filter(g => g.home === team || g.away === team))!;
    save(shape(o.league, team, { playoffs: block, gameLog: log }));
    return { o, team };
  }
  throw new Error('no stream of the twelve put his club in the title game');
}

describe('NFL front office: Watch in the playoffs', () => {
  it('WATCH YOUR GAME is the same press and gives nothing away: the page is the round before it until full time', async () => {
    motion();
    bracketSave(1);
    const start = localStorage.getItem(SAVE_KEY)!;
    counted(31);
    render(<Board />);
    await openBox();
    fireEvent.click(btn('[data-press="round"]'));
    const played = localStorage.getItem(SAVE_KEY)!;
    cleanup();
    localStorage.setItem(SAVE_KEY, start);
    counted(31);
    render(<Board />);
    await openBox();
    const before = { line: textOf('[data-week-matchup]'), round: textOf('[data-press="round"]'), chip: textOf('[data-week-chip]') };
    expect(before.round).toBe('Play the AFC Wild Card');
    fireEvent.click(btn('[data-watch-round]'));
    expect(localStorage.getItem(SAVE_KEY), 'the watched round saved what the played round saved').toBe(played);
    await waitFor(() => expect(q('[data-match-clock]')).not.toBeNull());
    expect(face()).toBe('game');
    expect([textOf('[data-week-matchup]'), textOf('[data-press="round"]'), textOf('[data-week-chip]')]).toEqual([before.line, before.round, before.chip]);
    for (const sel of ['[data-press="round"]', '[data-watch-round]', '[data-press="rest"]', '[data-bracket-back]']) expect(btn(sel).disabled, `${sel} is shut while he watches`).toBe(true);
    expect(q('[data-bracket]'), 'the bracket and its place line are not drawn while he watches').toBeNull();
    for (const sel of ['[data-gameday-final]', '[data-line-score]', '[data-gameday-chips]']) expect(q(sel)).toBeNull();
    expect(document.body.textContent).not.toMatch(/Out in the|Champions|AFC Divisional/);
    fireEvent.click(q('[data-gameday-speed="Results"]')!);
    await waitFor(() => expect(q('[data-gameday-final]')).not.toBeNull());
    expect(textOf('[data-press="round"]'), 'full time moves the page on').not.toBe(before.round);
    expect(btn('[data-press="rest"]').disabled).toBe(false);
    expect(btn('[data-bracket-back]').disabled).toBe(false);
    expect(localStorage.getItem(SAVE_KEY), 'full time saved nothing').toBe(played);
  });

  it('"Watch Week 17" is "Play Week 17" on the clock: Week 17 until full time, then his game on the box, the bracket behind the chip, and no league grid', async () => {
    motion();
    const rng = lehmer(7);
    const league: any = initLeague(rng);
    for (let w = 1; w < REGULAR_WEEKS; w += 1) { league.schedule[w - 1].forEach((g: any) => simGame(g, league.teams, rng)); league.week += 1; }
    const start = JSON.stringify(shape(league, Object.keys(league.teams)[0]));
    localStorage.setItem(SAVE_KEY, start);
    counted(41);
    render(<Board />);
    fireEvent.click(screen.getByText('This week'));
    fireEvent.click(btn('[data-press="week"]'));
    const played = localStorage.getItem(SAVE_KEY)!;
    expect(JSON.parse(played).league.week).toBe(REGULAR_WEEKS + 1);
    cleanup();
    localStorage.setItem(SAVE_KEY, start);
    counted(41);
    render(<Board />);
    fireEvent.click(screen.getByText('This week'));
    fireEvent.click(btn('[data-watch-week]'));
    expect(localStorage.getItem(SAVE_KEY), 'the watched press saved what the played press saved').toBe(played);
    await waitFor(() => expect(q('[data-match-clock]')).not.toBeNull());
    expect(textOf('[data-week-chip]')).toContain(`Week ${REGULAR_WEEKS}/${REGULAR_WEEKS}`);
    for (const sel of ['[data-press="week"]', '[data-watch-week]', '[data-press="old"]', '[data-bracket-back]']) expect(btn(sel).disabled, `${sel} is shut while he watches`).toBe(true);
    expect(q('[data-bracket]')).toBeNull();
    fireEvent.click(q('[data-gameday-speed="Results"]')!);
    await waitFor(() => expect(q('[data-gameday-final]')).not.toBeNull());
    expect(textOf('[data-week-chip]')).toContain('Playoffs');
    expect(face()).toBe('game');
    expect(q('div.grid.max-h-56'), 'no league grid in the bracket, Week 17 played or not').toBeNull();
    fireEvent.click(btn('[data-bracket-back]'));
    await waitFor(() => expect(q('[data-bracket]')).not.toBeNull());
    expect(localStorage.getItem(SAVE_KEY), 'full time and the chip saved nothing').toBe(played);
  });

  it('the title game watched: the recap waits for full time, and then it comes', async () => {
    motion();
    titleGameSave();
    const start = localStorage.getItem(SAVE_KEY)!;
    /* the first stream whose title game the law tells on the clock (a final it will not tell has no clock: the tile's rule) */
    let clocked = false;
    for (let k = 51; k < 58 && !clocked; k += 1) {
      cleanup();
      localStorage.setItem(SAVE_KEY, start);
      counted(k);
      render(<Board />);
      await openBox();
      fireEvent.click(btn('[data-watch-round]'));
      clocked = await waitFor(() => expect(q('[data-match-clock]')).not.toBeNull()).then(() => true, () => false);
    }
    expect(clocked, 'a title game with a clock, in seven streams').toBe(true);
    const s = read();
    expect([s.phase, 'playoffs' in s, s.league.week], 'the press closed the season in the save').toEqual(['recap', false, REGULAR_WEEKS]);
    expect(q('[data-verdict-reveal]'), 'no recap while he watches').toBeNull();
    expect(textOf('[data-week-chip]')).toContain('Playoffs');
    fireEvent.click(q('[data-gameday-speed="Results"]')!);
    await waitFor(() => expect(q('[data-verdict-reveal]')).not.toBeNull());
  });

  /* The fix pass (the review's major): the press closes the season, which grades the trust, calls the press room and
     records the finish. A title mandate and trust 60 make a title (the podium) and a loss (the scrum) both move them. */
  it('the title game watched, won and lost: the press card, the owner card and the finish are as they were until full time', async () => {
    motion();
    titleGameSave();
    const base = read();
    const start = JSON.stringify({ ...base, trust: 60, mandate: { tier: 'title', text: 'Win the Super Bowl. Anything less is a failed season upstairs.', winFloor: 0, reqLevel: 4, season: base.league.season } });
    const done: boolean[] = ((globalThis as any).__foDone ??= []);
    const seen: string[] = [];
    /* streams far apart: the first draw of the press decides the final, and the first draws of small neighbouring
       Lehmer seeds all lie near 0 (seeds 51 to 90 gave forty home wins on r1309-fx1) */
    for (let k = 1; k <= 40 && seen.length < 2; k += 1) {
      cleanup();
      localStorage.setItem(SAVE_KEY, start);
      counted(k * 104729);
      render(<Board />);
      await openBox();
      const before = { press: textOf('[data-gm-press]'), owner: textOf('[data-owner-mandate]') };
      expect(before.owner).toContain('Trust 60');
      done.length = 0;
      fireEvent.click(btn('[data-watch-round]'));
      const clocked = await waitFor(() => expect(q('[data-match-clock]')).not.toBeNull()).then(() => true, () => false);
      const s = read();
      const how = s.postseason?.champion === s.myTeam ? 'won' : 'lost';
      if (!clocked || seen.includes(how)) continue;
      seen.push(how);
      /* the save is the closed season, so what the screen shows is held and not merely unchanged */
      expect([s.phase, s.trust === 60], `${how}: the press closed the season and graded the trust`).toEqual(['recap', false]);
      expect(textOf('[data-gm-press]'), `${how}: the press card while he watches`).toBe(before.press);
      expect(textOf('[data-owner-mandate]'), `${how}: the owner card while he watches`).toBe(before.owner);
      expect(done.includes(true), `${how}: no finish is recorded while he watches`).toBe(false);
      fireEvent.click(q('[data-gameday-speed="Results"]')!);
      await waitFor(() => expect(q('[data-verdict-reveal]')).not.toBeNull());
      expect(textOf('[data-gm-press]'), `${how}: full time calls the room`).toMatch(how === 'won' ? /The podium/ : /The accountability scrum/);
      expect(done.at(-1), `${how}: full time records a title, and only a title`).toBe(how === 'won');
    }
    expect(seen.sort(), 'a title game won and one lost, each with a clock, in forty streams').toEqual(['lost', 'won']);
  });
});
