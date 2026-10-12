/* Round 1307 review (lens RUN): a fleet of whole regular seasons through the REAL board, written so the same
   file runs on the base's src and on the head's src and prints one line a press:
     FLEET|kind|desk|seed|week N|sha1 of the raw save|draws taken from Math.random by that press
   FLEET_MODE=play   every week by the Play button (weeks 1 to 17, the last one goes to the recap)
   FLEET_MODE=watch  every week by the Watch button where there is one, then Results (head only)
   FLEET_MODE=load   the saves the BASE wrote after its week 8 press are loaded and played from week 9
   Math.random is seeded again before every press (seed * 1000 + week), so a press is the same press whatever
   was drawn before it; the save is cumulative, so one moved byte in week 3 moves every line after it.
   Never committed: it is copied into src on the runner by fleet.sh and removed again. */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import type { ComponentType } from 'react';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));
vi.setConfig({ testTimeout: 1_500_000 });

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
let draws = 0;
let gen = lehmer(1305);
Math.random = () => { draws += 1; return gen(); };
/* the ids' epoch is the seeded generator's first two draws on both trees */
await import('@/lib/entityIds');
const E: any = await import('@/lib/frontOffice');
const { FO_DEPTH }: any = await import('@/data/frontOfficeDepth');
const { openNflDesk }: any = await import('@/lib/nflGmDesk');
const { default: Board } = (await import('@/components/front-office/FrontOfficeBoard')) as { default: ComponentType };

const SAVE_KEY = 'front-office-save-v1';
const MODE = process.env.FLEET_MODE || 'play';
const DUMP = process.env.FLEET_DUMP || '';
const DUMP_WRITE = process.env.FLEET_DUMP_WRITE === '1';
const OUT = process.env.FLEET_OUT || '';
const SEEDS = (process.env.FLEET_SEEDS || '3,17,29').split(',').map(Number);
const KINDS = ['fifteen', 'deep'] as const;
const WEEKS: number = E.REGULAR_WEEKS;

const sha = (s: string) => createHash('sha1').update(s).digest('hex');
const raw = () => localStorage.getItem(SAVE_KEY) ?? '';
const q = (sel: string) => document.querySelector(sel);
const txt = (sel: string) => (q(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim();
const face = () => q('[data-gameday]')?.getAttribute('data-gameday-face') ?? 'none';
const tick = async (ms = 0) => { await act(async () => { await new Promise(r => setTimeout(r, ms)); }); };
const playBtn = () => [...document.querySelectorAll('button')].find(b => /^Play (Week \d+|the final week)/.test((b.textContent ?? '').trim())) as HTMLButtonElement | undefined;
const pace = () => { const m = (document.body.textContent ?? '').match(/\d+ wins (keeps the mandate on pace|is behind the \d+-win ask)\./); return m ? m[0] : '(none)'; };

function freshSave(kind: string, desk: boolean, seed: number): string {
  const rng = lehmer(seed);
  const league: any = kind === 'deep' ? E.initLeague(rng, { depth: FO_DEPTH }) : E.initLeague(rng);
  const ids = Object.keys(league.teams);
  const team = ids[seed % ids.length];
  const save: any = {
    league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0, trust: 60,
    mandate: { tier: 'respect', text: 'Win eight. Upstairs wants a team worth the ticket.', winFloor: 8, reqLevel: 0, season: league.season },
  };
  if (desk) save.gm = openNflDesk(league, team);
  return JSON.stringify(save);
}

const lines: string[] = [];
const say = (l: string) => { lines.push(l); console.log(l); };

async function season(tag: string, start: string, fromWeek: number, seed: number) {
  cleanup();
  localStorage.clear();
  localStorage.setItem(SAVE_KEY, start);
  render(<Board />);
  fireEvent.click(screen.getByText('This week'));
  await tick(50);
  /* on the head the tile's chunk is on its way: let it land before the first press */
  if (q('[data-gameday-box]')) for (let i = 0; i < 400 && !q('[data-gameday]'); i += 1) await tick(50);
  for (let w = fromWeek; w <= WEEKS; w += 1) {
    const b = playBtn();
    if (!b || b.disabled) { say(`FLEET|${tag}|week ${w}|NO PLAY BUTTON (${b ? `disabled: ${(b.textContent ?? '').trim()}` : 'missing'})`); break; }
    const watch = MODE === 'watch' ? (q('[data-watch-week]') as HTMLButtonElement | null) : null;
    gen = lehmer(seed * 1000 + w);
    draws = 0;
    if (watch && !watch.disabled) {
      const before = { pace: pace(), record: txt('[data-record-chip]'), week: txt('[data-week-chip]') };
      fireEvent.click(watch);
      const pressed = raw();
      const pressDraws = draws;
      for (let i = 0; i < 100 && face() !== 'watch' && face() !== 'result'; i += 1) await tick(20);
      const during = { face: face(), pace: pace(), record: txt('[data-record-chip]'), week: txt('[data-week-chip]'), play: playBtn()?.disabled, text: (playBtn()?.textContent ?? '').trim() };
      const results = q('[data-gameday-speed="Results"]') as HTMLButtonElement | null;
      if (results) fireEvent.click(results);
      for (let i = 0; i < 200 && face() !== 'result'; i += 1) await tick(20);
      await tick(0);
      say(`FLEET|${tag}|week ${w}|${sha(raw())}|draws ${pressDraws}`);
      say(`WATCH|${tag}|week ${w}|face ${during.face}|held ${during.pace === before.pace && during.record === before.record && during.week === before.week && during.play === true ? 'yes' : 'NO'}|pace "${before.pace}" then "${during.pace}" then "${pace()}"|record "${before.record}" then "${during.record}" then "${txt('[data-record-chip]')}"|play label "${during.text}"|saved at full time ${raw() === pressed ? 'nothing' : 'SOMETHING'}|draws in the watch ${draws - pressDraws}|end face ${face()}`);
    } else {
      fireEvent.click(b);
      const pressDraws = draws;
      await tick(0);
      say(`FLEET|${tag}|week ${w}|${sha(raw())}|draws ${pressDraws}`);
      if (draws !== pressDraws) say(`LATE|${tag}|week ${w}|${draws - pressDraws} draw(s) after the press returned`);
    }
    if (w === 8 && DUMP && DUMP_WRITE) fs.writeFileSync(path.join(DUMP, `${tag.split('|').join('_').split(' ').join('')}.json`), raw());
  }
  say(`END|${tag}|phase ${(JSON.parse(raw() || '{}') as any).phase}|log ${((JSON.parse(raw() || '{}') as any).gameLog?.games ?? []).length} game(s)|save ${raw().length} bytes`);
}

describe(`fleet, mode ${MODE}`, () => {
  it('plays every season of the fleet and prints one line a press', async () => {
    for (const kind of KINDS) for (const desk of [false, true]) for (const seed of SEEDS) {
      const tag = `${kind}|desk ${desk ? 'on' : 'off'}|${seed}`;
      const file = path.join(DUMP, `${tag.split('|').join('_').split(' ').join('')}.json`);
      if (MODE === 'load') {
        if (!fs.existsSync(file)) { say(`FLEET|${tag}|NO DUMP ${file}`); continue; }
        await season(tag, fs.readFileSync(file, 'utf8'), 9, seed);
      } else {
        gen = lehmer(seed);
        await season(tag, freshSave(kind, desk, seed), 1, seed);
      }
    }
    cleanup();
    if (OUT) fs.writeFileSync(OUT, `${lines.join('\n')}\n`);
    expect(lines.filter(l => l.startsWith('FLEET|')).length).toBeGreaterThan(0);
  });
});
