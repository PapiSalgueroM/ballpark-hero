/* Round 1305, a runner side proof (never committed), part one, run on the round's HEAD: play the real board and
   write the saves it makes to the file named by R1305_SAVES. Part two (r1305BaseLoads.test.tsx) loads them with the
   board and the validator of the build before the round. */
import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import { initLeague, simGame, REGULAR_WEEKS } from '@/lib/frontOffice';
import { openNflDesk } from '@/lib/nflGmDesk';
import Board from '@/components/front-office/FrontOfficeBoard';

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
const KEY = 'front-office-save-v1';
function leagueAt(week: number, strong = false) {
  const rng = lehmer(7);
  const league: any = initLeague(rng);
  const team = Object.keys(league.teams)[0];
  if (strong) { for (const p of league.teams[team].players) p.ovr = 99; league.teams[team].defense = 99; }
  for (let w = 1; w < week; w += 1) { league.schedule[w - 1].forEach((g: any) => simGame(g, league.teams, rng)); league.week += 1; }
  return { league, team };
}
const shape = (league: any, team: string, patch: Record<string, unknown> = {}) =>
  ({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0, ...patch });

let restore: (() => void) | null = null;
beforeEach(() => { localStorage.clear(); const spy = vi.spyOn(Math, 'random').mockImplementation(lehmer(11)); restore = () => spy.mockRestore(); });
afterEach(() => { cleanup(); restore?.(); });

it('the round\'s board writes three saves that hold a log', () => {
  const out: [string, string][] = [];
  const press = (name: string, s: unknown, button: string) => {
    cleanup();
    localStorage.clear();
    localStorage.setItem(KEY, JSON.stringify(s));
    render(<Board />);
    fireEvent.click(screen.getByText('This week'));
    fireEvent.click(screen.getByText(button));
    const raw = localStorage.getItem(KEY)!;
    expect(JSON.parse(raw).gameLog?.games?.length, name).toBeGreaterThanOrEqual(1);
    out.push([name, raw]);
  };
  const a = leagueAt(6);
  press('a hub save after Week 6, the GM desk off', shape(a.league, a.team), 'Play Week 6');
  const b = leagueAt(6);
  press('a hub save after Week 6, the GM desk on', shape(b.league, b.team, { gm: openNflDesk(b.league, b.team) }), 'Play Week 6');
  const c = leagueAt(REGULAR_WEEKS, true);
  press('a recap save after the one press finish', shape(c.league, c.team), 'Play the final week + playoffs');
  fs.writeFileSync(process.env.R1305_SAVES!, JSON.stringify(out));
  console.log(`R1305 wrote ${out.length} saves: ${out.map(([n, r]) => `${n} (${r.length} bytes, ${JSON.parse(r).gameLog.games.length} games in the log)`).join('; ')}`);
});

it('prints the bytes of a save before and after one full season, with and without the log', async () => {
  const { FO_DEPTH } = await import('@/data/frontOfficeDepth');
  for (const kind of ['fifteen', 'deep']) {
    cleanup();
    localStorage.clear();
    const rng = lehmer(7);
    const league: any = kind === 'deep' ? initLeague(rng, { depth: FO_DEPTH }) : initLeague(rng);
    const team = Object.keys(league.teams)[0];
    const start = JSON.stringify(shape(league, team, { gm: openNflDesk(league, team) }));
    localStorage.setItem(KEY, start);
    render(<Board />);
    fireEvent.click(screen.getByText('This week'));
    for (let w = 1; w < REGULAR_WEEKS; w += 1) fireEvent.click(screen.getByText(`Play Week ${w}`));
    const before = localStorage.getItem(KEY)!;
    fireEvent.click(screen.getByText('Play the final week + playoffs'));
    const after = localStorage.getItem(KEY)!;
    const bare = (raw: string) => { const o = JSON.parse(raw); delete o.gameLog; return JSON.stringify(o).length; };
    const n = (raw: string) => JSON.parse(raw).gameLog.games.length;
    console.log(`R1305 SAVE BYTES ${kind} league, desk on: at the start ${start.length}; after sixteen weeks ${before.length} (${before.length - bare(before)} of it the log, ${n(before)} games); at the recap ${after.length} (${after.length - bare(after)} of it the log, ${n(after)} games)`);
    expect(n(before)).toBe(REGULAR_WEEKS - 1);
  }
});
