/* Review probe (review-read of Round 1309), NOT committed and NOT run by the read lens.
   Place at src/components/front-office/r1309TitleWatchSpoil.test.tsx on a runner (send as an extra file) and run:
     node_modules/.bin/vitest run src/components/front-office/r1309TitleWatchSpoil.test.tsx --testTimeout=300000
   Claim it tests: while he WATCHES the title game (hold set, the recap correctly held back), the hub render still
   draws the season close's press card (FrontOfficeBoard.tsx: `{presser && <GmPressCard .../>}` on the hub render)
   and the owner card's trust after the grade (closeSeason calls setTrust at the press). Expected on e505ec9e: RED
   (a press card or a moved trust while the clock runs). Built from FrontOfficePostseason.test.tsx's own helpers. */
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

/* eslint-disable @typescript-eslint/no-explicit-any */
const SAVE_KEY = 'front-office-save-v1';
const REAL_RANDOM = Math.random;
afterEach(() => { cleanup(); Math.random = REAL_RANDOM; localStorage.clear(); });
function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const q = (sel: string) => document.querySelector(sel);
const textOf = (sel: string) => (q(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim();
const counted = (seed: number) => { const r = lehmer(seed); Math.random = () => r(); };
const motion = () => { (window as any).matchMedia = (query: string) => ({ matches: false, media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }); };

function seasonOver() {
  const rng = lehmer(7);
  const league: any = initLeague(rng);
  const played: any[][] = [];
  for (let w = 1; w <= REGULAR_WEEKS; w += 1) { played.push(league.schedule[w - 1].map((g: any) => simGame(g, league.teams, rng))); league.week += 1; }
  return { league, played, seeds: NFL_POSTSEASON.seeds(league), format: NFL_POSTSEASON.formatFor(league.season)! };
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
/* the save in the title game, his club made strong for the title game too (so a title, so the podium card) */
function titleGameSave() {
  for (let k = 1; k <= 12; k += 1) {
    const o = seasonOver();
    const team = o.seeds[0];
    const club = o.league.teams[team];
    for (const p of club.players) p.ovr = 99;
    club.defense = 99;
    const told: GmGameLog['games'] = [];
    const play = nflPlayTie(o.league.teams, lehmer(k), o.league.season, undefined, told);
    let block = openBracket(o.format, o.league.season, o.seeds);
    for (let w = 0; w < 3; w += 1) block = playBracketWeek(o.format, block, play);
    const week = bracketWeek(o.format, block);
    const final = week === null ? null : bracketPairings(o.format, block, week);
    if (!final || !final.some(p => p.homeId === team || p.awayId === team)) continue;
    const log = addToGmGameLog(regularLog(o, team), o.league.season, told.filter(g => g.home === team || g.away === team))!;
    localStorage.setItem(SAVE_KEY, JSON.stringify({ league: o.league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0, playoffs: block, gameLog: log }));
    return;
  }
  throw new Error('no stream put his club in the title game');
}

describe('review probe: the title game watched gives nothing away', () => {
  it('no press card and no moved trust while the clock runs', async () => {
    motion();
    titleGameSave();
    const start = localStorage.getItem(SAVE_KEY)!;
    let clocked = false;
    let trustBefore = '';
    for (let k = 51; k < 58 && !clocked; k += 1) {
      cleanup();
      localStorage.setItem(SAVE_KEY, start);
      counted(k);
      render(<Board />);
      fireEvent.click(screen.getByText('This week'));
      await waitFor(() => expect(q('[data-bracket]')).not.toBeNull());
      trustBefore = textOf('[data-owner-mandate]');
      expect(q('[data-gm-press]'), 'no press card before the press').toBeNull();
      fireEvent.click(q('[data-watch-round]') as HTMLElement);
      clocked = await waitFor(() => expect(q('[data-match-clock]')).not.toBeNull()).then(() => true, () => false);
    }
    expect(clocked).toBe(true);
    expect(q('[data-verdict-reveal]'), 'the recap waits (the builder\'s own check)').toBeNull();
    const card = textOf('[data-gm-press]');
    console.log(`PROBE|press card while watching: "${card.slice(0, 120)}"`);
    console.log(`PROBE|owner card before: "${trustBefore.slice(0, 60)}" while watching: "${textOf('[data-owner-mandate]').slice(0, 60)}"`);
    expect(q('[data-gm-press]'), 'a press card (the podium or the scrum) is drawn while he watches the title game').toBeNull();
    expect(textOf('[data-owner-mandate]'), 'the owner card shows the graded trust while he watches').toBe(trustBefore);
  });
});
