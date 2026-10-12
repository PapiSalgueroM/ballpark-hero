/* Round 1307 review (lens RUN): is every fact on the tile's result face the save's own? Whole seasons through the
   real board; after every press the tile is read against the save the press wrote and the engine's own seeding.
   Prints TRUTH lines and fails when one fact disagrees. Never committed (copied into src on the runner). */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import type { ComponentType } from 'react';

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
let gen = lehmer(1307);
Math.random = () => gen();
await import('@/lib/entityIds');
const E: any = await import('@/lib/frontOffice');
const { openNflDesk }: any = await import('@/lib/nflGmDesk');
const { default: Board } = (await import('@/components/front-office/FrontOfficeBoard')) as { default: ComponentType };

const SAVE_KEY = 'front-office-save-v1';
const SEEDS = (process.env.TRUTH_SEEDS || '3,17,29,41,53,67').split(',').map(Number);
const q = (sel: string) => document.querySelector(sel);
const txt = (sel: string) => (q(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim();
const tick = async (ms = 0) => { await act(async () => { await new Promise(r => setTimeout(r, ms)); }); };
const playBtn = () => [...document.querySelectorAll('button')].find(b => /^Play Week \d+/.test((b.textContent ?? '').trim())) as HTMLButtonElement | undefined;
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`;
const nums = (sel: string) => [...document.querySelectorAll(`${sel} td`)].slice(1).map(td => Number(td.textContent));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('the tile against the save', () => {
  it('every fact on every result face is the save\'s own', async () => {
    const wrong: string[] = [];
    let results = 0, seeded = 0, outside = 0, topSeed = 0, away = 0, plays = 0;
    for (const seed of SEEDS) {
      const rng = lehmer(seed);
      const league: any = E.initLeague(rng);
      const ids = Object.keys(league.teams);
      const team = ids[(seed * 7) % ids.length];
      const save: any = { league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0, gm: openNflDesk(league, team) };
      cleanup();
      localStorage.clear();
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      gen = lehmer(seed * 13 + 1);
      render(<Board />);
      fireEvent.click(screen.getByText('This week'));
      for (let i = 0; i < 400 && !q('[data-gameday]'); i += 1) await tick(50);
      for (let w = 1; w < E.REGULAR_WEEKS; w += 1) {
        const b = playBtn();
        if (!b || b.disabled) { wrong.push(`${team} seed ${seed} week ${w}: no Play button`); break; }
        fireEvent.click(b);
        await tick(0);
        const s = JSON.parse(localStorage.getItem(SAVE_KEY)!);
        const games = s.gameLog?.games ?? [];
        const g = games[games.length - 1];
        const at = `${team} seed ${seed} week ${w}`;
        if (!g || g.where !== `w${w}`) { wrong.push(`${at}: the log's last game is ${g ? g.where : 'missing'}`); continue; }
        results += 1;
        const home = g.home === team, us = home ? g.homeScore : g.awayScore, them = home ? g.awayScore : g.homeScore, opp = home ? g.away : g.home;
        if (!home) away += 1;
        const seeds: string[] = E.conferenceSeeds(s.league.teams, E.conferenceOf(team));
        const k = seeds.indexOf(team);
        if (k >= 0) { seeded += 1; if (k === 0) topSeed += 1; } else outside += 1;
        const want = {
          final: `${g.winner === team ? 'W' : 'L'}${team} ${us}, ${opp} ${them}`,
          where: `Wk ${w} · ${home ? 'vs' : 'at'} ${opp}`,
          standing: k >= 0 ? `${E.conferenceOf(team)}: ${ordinal(k + 1)} seed of ${seeds.length} as it stands.` : `${E.conferenceOf(team)}: outside the ${seeds.length} seeds as it stands.`,
          record: `Record ${s.league.teams[team].wins}-${s.league.teams[team].losses}`,
          week: `Week ${w + 1}/17`,
        };
        const got = { final: txt('[data-gameday-final]'), where: txt('[data-gameday-where]'), standing: txt('[data-gameday-standing]'), record: txt('[data-record-chip]'), week: txt('[data-week-chip]') };
        if (got.final !== want.final) wrong.push(`${at}: final "${got.final}" for "${want.final}"`);
        if (got.where !== want.where) wrong.push(`${at}: where "${got.where}" for "${want.where}"`);
        if (got.standing !== want.standing) wrong.push(`${at}: standing "${got.standing}" for "${want.standing}"`);
        if (got.record !== want.record) wrong.push(`${at}: record "${got.record}" for "${want.record}"`);
        if (!got.week.includes(want.week)) wrong.push(`${at}: week "${got.week}" for "${want.week}"`);
        const lu = nums('[data-line-row="us"]'), lt = nums('[data-line-row="them"]');
        if (lu.length !== 5 || lt.length !== 5 || sum(lu.slice(0, 4)) !== us || lu[4] !== us || sum(lt.slice(0, 4)) !== them || lt[4] !== them) wrong.push(`${at}: line score ${lu.join(' ')} / ${lt.join(' ')} for a final of ${us}-${them}`);
        const chips = [...document.querySelectorAll('[data-gameday-chip]')].map(c => (c.textContent ?? '').replace(/\s+/g, ' ').trim());
        const wantChips = games.map((x: any) => { const h = x.home === team; return `Wk ${x.where.slice(1)}${x.winner === team ? 'W' : 'L'} ${h ? x.homeScore : x.awayScore}-${h ? x.awayScore : x.homeScore}`; });
        if (chips.join('|') !== wantChips.join('|')) wrong.push(`${at}: chips ${chips.join('|')} for ${wantChips.join('|')}`);
        const dec = [...document.querySelectorAll('[data-deciding] li')].map(li => (li.textContent ?? '').replace(/\s+/g, ' ').trim());
        plays += dec.length;
        if (dec.length < 1 || dec.length > 3) wrong.push(`${at}: ${dec.length} deciding plays`);
        if (document.querySelectorAll('[data-deciding] li[data-decided="true"]').length !== 1) console.log(`TRUTH-NOTE|${at}: ${document.querySelectorAll('[data-deciding] li[data-decided="true"]').length} plays marked as the one that decided it (of ${dec.length})`);
        if (txt('[data-gameday-shape]') === '') wrong.push(`${at}: no shape sentence`);
      }
    }
    cleanup();
    console.log(`TRUTH|${results} result faces read over ${SEEDS.length} seasons|seeded ${seeded} (top seed ${topSeed})|outside ${outside}|away games ${away}|deciding plays ${plays}|wrong ${wrong.length}`);
    for (const w of wrong.slice(0, 12)) console.log(`TRUTH-WRONG|${w}`);
    expect(results).toBeGreaterThan(60);
    expect(seeded).toBeGreaterThan(5);
    expect(wrong).toEqual([]);
  });
});
