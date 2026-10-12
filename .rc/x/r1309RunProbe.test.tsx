/* Round 1309 adversarial review (runs lens), a runner side probe, never committed.
   P1: while he WATCHES the title game, nothing on the page may state its result (ruling 2f). The press closes the
   season at once (closeSeason: the presser, the trust, the titles), and the main board is what is drawn during the
   hold. So the press card and the owner card are read before the press, during the clock, and after full time.
   P2: "Your game" on a decided tie of his opens THAT tie's game, also when the two clubs met in the regular season. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { initLeague, simGame, REGULAR_WEEKS } from '@/lib/frontOffice';
import { addToGmGameLog, type GmGameLog } from '@/lib/gmGameLog';
import { nflTell, nflWhere } from '@/lib/frontOfficeGameDay';
import { NFL_POSTSEASON, nflPlayTie } from '@/lib/frontOfficePostseason';
import { bracketPairings, bracketWeek, openBracket, playBracketWeek } from '@/lib/gmBracket';
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
const SAVE_KEY = 'front-office-save-v1';
const REAL_RANDOM = Math.random;
afterEach(() => { cleanup(); Math.random = REAL_RANDOM; localStorage.clear(); });
const q = (sel: string) => document.querySelector(sel) as HTMLElement | null;
const textOf = (sel: string) => (q(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim();
const btn = (sel: string) => q(sel) as HTMLButtonElement;
const read = (): any => JSON.parse(localStorage.getItem(SAVE_KEY)!);
const counted = (seed: number) => { const r = lehmer(seed); Math.random = () => r(); };
const motion = () => { window.matchMedia = ((query: string) => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })) as any; };

function seasonOver(seed = 7) {
  const rng = lehmer(seed);
  const league: any = initLeague(rng);
  const played: any[][] = [];
  for (let w = 1; w <= REGULAR_WEEKS; w += 1) { played.push(league.schedule[w - 1].map((g: any) => simGame(g, league.teams, rng))); league.week += 1; }
  const seeds = NFL_POSTSEASON.seeds(league);
  return { league, played, seeds, format: NFL_POSTSEASON.formatFor(league.season)!, team: seeds[1] };
}
function regularLog(o: ReturnType<typeof seasonOver>, team: string): GmGameLog {
  let log: GmGameLog | null = null;
  for (let w = 1; w <= REGULAR_WEEKS; w += 1) {
    const g = o.played[w - 1].find((x: any) => x.home === team || x.away === team);
    if (!g) continue;
    const t = nflTell(g, o.league.teams, o.league.season, nflWhere(w));
    log = addToGmGameLog(log, o.league.season, t.last ? [t.last] : []);
  }
  return log!;
}
const shape = (league: any, team: string, patch: Record<string, unknown> = {}) =>
  ({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0, ...patch });
const MANDATE = (season: number) => ({ tier: 'title', text: 'Win the Super Bowl. Anything less is a failed season upstairs.', winFloor: 0, reqLevel: 4, season });

/** The bracket three rounds on with his club in the title game (the test file's titleGameSave), plus a mandate and trust. */
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
    const log = addToGmGameLog(regularLog(o, team), o.league.season, told.filter(g => g.home === team || g.away === team))!;
    localStorage.setItem(SAVE_KEY, JSON.stringify(shape(o.league, team, { playoffs: block, gameLog: log, mandate: MANDATE(o.league.season), trust: 60 })));
    return { o, team };
  }
  throw new Error('no stream put his club in the title game');
}

describe('P1: the title game watched gives nothing away', () => {
  it('the press card and the owner card are as they were until full time', async () => {
    motion();
    titleGameSave();
    const start = localStorage.getItem(SAVE_KEY)!;
    let clocked = false;
    let before = { press: '', owner: '' };
    for (let k = 51; k < 58 && !clocked; k += 1) {
      cleanup();
      localStorage.setItem(SAVE_KEY, start);
      counted(k);
      render(<Board />);
      fireEvent.click(screen.getByText('This week'));
      await waitFor(() => expect(q('[data-watch-round]')).not.toBeNull());
      before = { press: textOf('[data-gm-press]'), owner: textOf('[data-owner-mandate]') };
      fireEvent.click(btn('[data-watch-round]'));
      clocked = await waitFor(() => expect(q('[data-match-clock]')).not.toBeNull()).then(() => true, () => false);
    }
    expect(clocked, 'a title game with a clock').toBe(true);
    const s = read();
    const during = { press: textOf('[data-gm-press]'), owner: textOf('[data-owner-mandate]') };
    console.log(`PROBE P1 champion ${s.postseason?.champion} his ${s.myTeam} trust ${s.trust} phase ${s.phase}`);
    console.log(`PROBE P1 before: press="${before.press.slice(0, 160)}" owner="${before.owner.slice(0, 120)}"`);
    console.log(`PROBE P1 during the clock: press="${during.press.slice(0, 160)}" owner="${during.owner.slice(0, 120)}"`);
    console.log(`PROBE P1 verdict on screen during the clock: ${!!q('[data-verdict-reveal]')}`);
    expect(during.press, 'the press card during the title game clock').toBe(before.press);
    expect(during.owner, 'the owner card during the title game clock').toBe(before.owner);
  });
});

describe('P2: "Your game" opens that tie\'s game for every played tie of his, over seeds', () => {
  it('across leagues where his first opponent is a club he met in the regular season', async () => {
    motion();
    let looked = 0, rival = 0, wrong = 0;
    for (let seed = 1; seed <= 24 && rival < 4; seed += 1) {
      const o = seasonOver(seed);
      for (const team of o.seeds.slice(1, 7)) {
        const told: GmGameLog['games'] = [];
        const block = playBracketWeek(o.format, openBracket(o.format, o.league.season, o.seeds), nflPlayTie(o.league.teams, lehmer(3), o.league.season, undefined, told));
        const mine = told.filter(g => g.home === team || g.away === team);
        if (mine.length !== 1) continue;
        const g0 = mine[0];
        const reg = regularLog(o, team);
        const met = reg.games.some(g => (g.home === g0.home || g.away === g0.home) && (g.home === g0.away || g.away === g0.away));
        looked += 1;
        if (!met) continue;
        rival += 1;
        cleanup(); localStorage.clear();
        localStorage.setItem(SAVE_KEY, JSON.stringify(shape(o.league, team, { playoffs: block, gameLog: addToGmGameLog(reg, o.league.season, mine)! })));
        counted(5);
        render(<Board />);
        fireEvent.click(screen.getByText('This week'));
        await waitFor(() => expect(q('[data-bracket]')).not.toBeNull());
        const wk = q('[data-bracket-week="1"]'); if (wk) fireEvent.click(wk);
        const open = q('[data-bracket-mine="true"] [data-bracket-open]');
        if (!open) { console.log(`PROBE P2 seed ${seed} ${team}: no open button on his tie`); wrong += 1; continue; }
        fireEvent.click(open);
        await waitFor(() => expect(q('[data-gameday]')).not.toBeNull());
        const where = textOf('[data-gameday-where]');
        console.log(`PROBE P2 seed ${seed} ${team} vs ${g0.home === team ? g0.away : g0.home} (${g0.where}): the tile reads "${where.slice(0, 80)}"`);
        if (!where.includes(g0.where)) wrong += 1;
      }
    }
    console.log(`PROBE P2 looked ${looked}, rivals met in the regular season ${rival}, wrong game opened ${wrong}`);
    expect(rival, 'cases where the two clubs met in the regular season').toBeGreaterThan(0);
    expect(wrong).toBe(0);
  });
});
