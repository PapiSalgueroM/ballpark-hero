/* Round 1309, a runner side probe (never committed): the saves this tree's NFL board writes, for the OTHER build to
   load (r1309Load.test.tsx). Run on the round's head and on its base (Round 1308's head bb051ee0). Each row is
   [name, the raw save, whether the save is in the bracket]. On the head it also writes the saves only the round can
   make: one in the bracket after a round, and the recap reached through the bracket. */
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import { initLeague, simGame } from '@/lib/frontOffice';
import Board from '@/components/front-office/FrontOfficeBoard';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));
vi.setConfig({ testTimeout: 600_000 });

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
/* eslint-disable @typescript-eslint/no-explicit-any */
const KEY = 'front-office-save-v1';
const head = fs.readFileSync('src/components/front-office/FrontOfficeBoard.tsx', 'utf8').includes('pressPlayoffs');
function morningOf(week: number) {
  const rng = lehmer(7);
  const league: any = initLeague(rng);
  for (let w = 1; w < week; w += 1) { league.schedule[w - 1].forEach((g: any) => simGame(g, league.teams, rng)); league.week += 1; }
  return JSON.stringify({ league, myTeam: Object.keys(league.teams)[0], phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
}
const press = (label: string) => fireEvent.click(screen.getByText(label));

it(`writes the saves of this tree's board (${head ? 'the round' : 'the base'})`, () => {
  Math.random = lehmer(11);
  const out: [string, string, boolean][] = [];
  const run = (name: string, start: string, steps: (() => void)[], inBracket: boolean) => {
    cleanup();
    localStorage.clear();
    localStorage.setItem(KEY, start);
    render(<Board />);
    press('This week');
    for (const s of steps) s();
    out.push([name, localStorage.getItem(KEY)!, inBracket]);
  };
  run('mid season, after Week 9', morningOf(9), [() => press('Play Week 9')], false);
  run('the morning of Week 17, after Week 16', morningOf(16), [() => press('Play Week 16')], false);
  run('the recap, through the old button', morningOf(17), [() => press('Play the final week + playoffs')], false);
  if (head) {
    const round = () => fireEvent.click(document.querySelector('[data-press="round"]')!);
    run('in the bracket, after one round', morningOf(17), [() => press('Play Week 17'), round], true);
    run('the recap, through the bracket', morningOf(17), [() => press('Play Week 17'), round, round, round, round], false);
  }
  for (const [name, raw] of out) console.log(`R1309 wrote "${name}": phase ${JSON.parse(raw).phase}, week ${JSON.parse(raw).league.week}, bracket ${'playoffs' in JSON.parse(raw)}, ${raw.length} bytes`);
  expect(out.length).toBe(head ? 5 : 3);
  fs.writeFileSync(process.env.R1309_SAVES_OUT!, JSON.stringify(out));
});
