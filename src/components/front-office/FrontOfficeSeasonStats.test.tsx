/**
 * Round 1542: who scored, on the real NFL board with real saves.
 *   - a press from Week 1 opens the season's lines and records every game of the week; his games keep their credits
 *     under their keys, and the block in the save reads back whole;
 *   - THE RECORDER TAKES NO DRAW: the same presses with nflRecordWeek and nflRecordGame switched off draw the same
 *     numbers and write the same save once this round's keys are taken out;
 *   - a save from before season lines, in the middle of a season, loads, plays and writes no block;
 *   - a damaged block, history, card or first year is deleted from the STORED league at load, on the two restore
 *     paths that hand the stored save back to persist (an old recap save's draft, a bracket started again);
 *   - the final week names the awards once, and a reload on the recap does not name them again;
 *   - a winner's roster row carries the sim badge, and a card that does not read shows none.
 * It also prints the real persisted byte length after a whole season with lines and the desk on.
 * The fleet's identities, determinism and the awards over many seasons are scripts/simNflSeasonStats.mjs's.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ComponentType } from 'react';
import { initLeague, simGame, REGULAR_WEEKS, deepOverLimit, cutDownToMax } from '@/lib/frontOffice';
import { FO_DEPTH } from '@/data/frontOfficeDepth';
import { nflNewStats, readNflAwards, readNflStats } from '@/lib/nflSeasonStats';
import { openNflDesk } from '@/lib/nflGmDesk';

/* the recorder, switchable: off, the board runs exactly as it did before this round */
const mode = vi.hoisted(() => ({ off: false }));
vi.mock('@/lib/nflSeasonStats', async importOriginal => {
  const real = await importOriginal<typeof import('@/lib/nflSeasonStats')>();
  return {
    ...real,
    nflRecordWeek: (...a: Parameters<typeof real.nflRecordWeek>) => (mode.off ? 0 : real.nflRecordWeek(...a)),
    nflRecordGame: (...a: Parameters<typeof real.nflRecordGame>) => (mode.off ? false : real.nflRecordGame(...a)),
  };
});
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
/* Round 1550: the career kit is fetched when a screen needs it; these cases drive the season, so it is here first */
await (await import('@/components/front-office/nflCareerKitLoad')).loadNflCareerKit();

/** A fifteen man league on the morning of `week` (Week 1 is a season with nothing played), and his club. */
function leagueAt(week: number, deep = false) {
  const rng = lehmer(7);
  const league: any = deep ? initLeague(rng, { depth: FO_DEPTH }) : initLeague(rng);
  const team = Object.keys(league.teams)[0];
  for (let w = 1; w < week; w += 1) { league.schedule[w - 1].forEach((g: any) => simGame(g, league.teams, rng)); league.week += 1; }
  return { league, team };
}
const shape = (league: any, team: string, patch: Record<string, unknown> = {}) =>
  ({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0, ...patch });
const save = (s: unknown) => localStorage.setItem(SAVE_KEY, JSON.stringify(s));
const read = (): any => JSON.parse(localStorage.getItem(SAVE_KEY)!);
/** One press of a week from the hub or the week box. */
const press = (label: string) => {
  const tile = screen.queryByText('This week');
  if (tile) fireEvent.click(tile);
  fireEvent.click(screen.getByText(label));
};
/** The save with this round's keys taken out, and the engine's ids named by first appearance (its minter counts on
 *  across two boards of one test file). */
function stripped(s: any): string {
  const c = JSON.parse(JSON.stringify(s));
  delete c.league.stats;
  delete c.league.awards;
  const men = [...Object.values(c.league.teams as Record<string, any>).flatMap(t => [...t.players, ...(t.practice ?? [])]), ...c.league.freeAgents];
  for (const p of men) { delete p.awards; delete p.rookieSeason; }
  const ids = new Map<string, string>();
  return JSON.stringify(c).replace(/"(p[0-9a-z]+-\d+)"/g, (_m, id: string) => {
    if (!ids.has(id)) ids.set(id, `#${ids.size}`);
    return `"${ids.get(id)}"`;
  });
}
let draws = 0;
const seedRandom = (seed: number) => {
  const r = lehmer(seed);
  draws = 0;
  return vi.spyOn(Math, 'random').mockImplementation(() => { draws += 1; return r(); });
};

let restoreRandom: (() => void) | null = null;
beforeEach(() => {
  localStorage.clear();
  mode.off = false;
  const spy = seedRandom(11);
  restoreRandom = () => spy.mockRestore();
});
afterEach(() => { cleanup(); restoreRandom?.(); });

describe('NFL front office: who scored, the press and the save', () => {
  it('three presses from Week 1 record every game of each week, his games keep their credits, and the block reads back whole', () => {
    const { league, team } = leagueAt(1);
    save(shape(league, team));
    render(<Board />);
    for (const w of [1, 2, 3]) press(`Play Week ${w}`);
    const s = read();
    expect(s.league.week).toBe(4);
    const st = s.league.stats;
    expect(st.season).toBe(league.season);
    expect(readNflStats(st), 'the saved block reads whole').not.toBeNull();
    /* every club played three games, and every line is a man of the pool (at most twelve a club) */
    for (const t of Object.keys(s.league.teams)) expect(st.teams[t].g).toBe(3);
    const perClub = Object.values(st.lines as Record<string, any>).reduce((m: Record<string, number>, l: any) => ({ ...m, [l.team]: (m[l.team] ?? 0) + 1 }), {});
    expect(Math.max(...Object.values(perClub))).toBeLessThanOrEqual(12);
    /* his three games, by the keys his log holds */
    const keys = s.gameLog.games.map((g: any) => g.key);
    expect(keys).toHaveLength(3);
    for (const k of keys) expect(Object.keys(st.plays)).toContain(k);
    expect(Object.keys(st.plays)).toHaveLength(3);
  });

  it('the recorder takes no draw: with it switched off the same presses draw the same numbers and save the same league', () => {
    const { league, team } = leagueAt(1);
    const json = JSON.stringify(shape(league, team, { gm: openNflDesk(league, team) }));
    const run = (off: boolean) => {
      cleanup();
      localStorage.clear();
      restoreRandom?.();
      const spy = seedRandom(23);
      restoreRandom = () => spy.mockRestore();
      mode.off = off;
      localStorage.setItem(SAVE_KEY, json);
      render(<Board />);
      for (const w of [1, 2, 3, 4]) press(`Play Week ${w}`);
      return { s: read(), draws };
    };
    const on = run(false);
    const off = run(true);
    expect(on.s.league.stats, 'the recorder ran').toBeTruthy();
    expect(off.s.league.stats, 'and was off').toBeUndefined();
    expect(on.draws).toBe(off.draws);
    expect(stripped(on.s)).toBe(stripped(off.s));
  });

  it('a save from before season lines, at Week 5, loads, plays on and writes no block until its next Week 1', () => {
    const { league, team } = leagueAt(5);
    save(shape(league, team));
    render(<Board />);
    press('Play Week 5');
    press('Play Week 6');
    const s = read();
    expect(s.league.week).toBe(7);
    expect('stats' in s.league).toBe(false);
    expect('awards' in s.league).toBe(false);
  });
});

describe('NFL front office: who scored, the load and the close', () => {
  /** This round's four keys, damaged: a block, a history, a man's card and a man's first year. */
  const damage = (league: any, team: string) => {
    league.stats = { season: league.season, lines: 5 };
    league.awards = 'x';
    league.teams[team].players[0].awards = [7];
    league.teams[team].players[1].rookieSeason = 'soon';
  };
  const clean = (s: any, team: string) => !('stats' in s.league) && !('awards' in s.league)
    && !('awards' in s.league.teams[team].players[0]) && !('rookieSeason' in s.league.teams[team].players[1]);

  it('a damaged block is deleted from the stored league on the draft restore of an old recap save', () => {
    const { league, team } = leagueAt(REGULAR_WEEKS);
    damage(league, team);
    save(shape(league, team, { phase: 'recap', seasonsPlayed: 1 }));
    render(<Board />);
    const s = read();
    expect(s.phase).toBe('draft');
    expect(clean(s, team), 'the restore wrote the save back without this round\'s damaged keys').toBe(true);
  });

  it('and on a bracket started again', () => {
    const { league, team } = leagueAt(REGULAR_WEEKS + 1);
    damage(league, team);
    save(shape(league, team));
    render(<Board />);
    const s = read();
    expect(s.playoffs, 'the bracket was started again and saved at load').toBeTruthy();
    expect(clean(s, team)).toBe(true);
  });

  it('the final week names the awards once, writes them on the cards, and a reload on the recap names nothing again', () => {
    const { league, team } = leagueAt(REGULAR_WEEKS);
    league.stats = nflNewStats(league.season); /* as if the block had opened at Week 1 */
    save(shape(league, team));
    const first = render(<Board />);
    press('Play the final week + playoffs');
    const s = read();
    expect(s.phase).toBe('recap');
    const history = readNflAwards(s.league.awards)!;
    expect(history).toHaveLength(1);
    expect(history[0].season).toBe(league.season);
    const mvp = history[0].mvp!;
    const card = (x: any) => [...Object.values(x.league.teams as Record<string, any>).flatMap(t => [...t.players, ...(t.practice ?? [])]), ...x.league.freeAgents].find(p => p.id === mvp.id);
    expect(card(s).awards).toEqual([`${league.season} MVP`]);
    first.unmount();
    render(<Board />);
    const again = read();
    expect(again.league.awards).toHaveLength(1);
    expect(card(again).awards).toEqual([`${league.season} MVP`]);
  });

  it('a winner\'s roster row carries the sim badge, and a card that does not read shows none', () => {
    const { league, team } = leagueAt(3);
    const [a, b] = league.teams[team].players;
    a.awards = [`${league.season - 2} MVP`, `${league.season - 1} Offensive Rookie of the Year`, `${league.season - 1} MVP`];
    b.awards = [7];
    save(shape(league, team));
    render(<Board />);
    fireEvent.click(screen.getByText('Roster'));
    const badges = [...document.querySelectorAll('[data-award-badge]')];
    expect(badges).toHaveLength(1);
    expect(badges[0].textContent).toContain(`Sim ${league.season - 1} MVP, Sim ${league.season - 1} Offensive Rookie of the Year +1 more`);
    expect(badges[0].getAttribute('title')).toContain("This save's sim awards, not real NFL ones");
    expect(badges[0].closest(`[data-roster-row="${a.id}"]`)).toBeTruthy();
  });

  it('a whole season on full rosters with lines and the desk on: the save it writes, measured', () => {
    const { league, team } = leagueAt(1, true);
    if (deepOverLimit(league.teams[team]) > 0) cutDownToMax(league.teams[team], league.freeAgents);
    save(shape(league, team, { gm: openNflDesk(league, team) }));
    const opening = localStorage.getItem(SAVE_KEY)!.length;
    render(<Board />);
    for (let w = 1; w < REGULAR_WEEKS; w += 1) press(`Play Week ${w}`);
    const before = localStorage.getItem(SAVE_KEY)!.length;
    press('Play the final week + playoffs');
    const s = read();
    expect(s.phase).toBe('recap');
    const bytes = localStorage.getItem(SAVE_KEY)!.length;
    const block = JSON.stringify(s.league.stats).length;
    const lines = Object.keys(s.league.stats.lines).length;
    const without = JSON.stringify({ ...s, league: { ...s.league, stats: undefined, awards: undefined } }).length;
    /* printed for the lead (the NFL save budget is simNflFullRosters.mjs's 700K): never asserted against it here */
    console.log(`MEASURED: the persisted save on full rosters with the desk on: ${opening} characters at Week 1, ${before} after Week 16, ${bytes} on the recap (${without} without the block and the history); the block ${block}, ${lines} lines, the history ${JSON.stringify(s.league.awards).length}`);
    expect(s.league.stats.teams[team].g).toBe(REGULAR_WEEKS);
    expect(readNflStats(s.league.stats)).not.toBeNull();
  });
});
