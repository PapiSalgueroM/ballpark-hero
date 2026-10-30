/**
 * Round 1550: the NFL board fetches its GM career kit (nflCareerKit.ts) when a screen needs it, never with the
 * page, and a player sees nothing new but a holding box for the kit's moment.
 *
 * Every case starts a fresh module graph (vi.resetModules, then the board and its loader imported again), so
 * the kit has never been fetched when the board mounts: the page as a visitor first gets it. The other board
 * suites fetch it before they mount (they drive the rules, not the fetch); this one drives the fetch.
 *
 *   1  a season being played never asks for it, and the Career box reads the same before and after it;
 *   2  a career box opened asks for it: the box's header and the holding box, then the screen;
 *   3  the last week asks for it, its press buttons wait for it, and the one press then closes the season;
 *   4  a save that loads on the recap waits in a holding box, then draws the recap;
 *   5  a save that loads on the fired screen waits in a holding box, then draws the out of work screen;
 *   6  a fetch that fails says so, and Try again asks again and draws the screen.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import type { ComponentType } from 'react';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

/* eslint-disable @typescript-eslint/no-explicit-any */
const SAVE_KEY = 'front-office-save-v1';
const REAL_RANDOM = Math.random;
function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}

afterEach(() => { cleanup(); Math.random = REAL_RANDOM; localStorage.clear(); });

/** The board, its loader and the engine from one fresh module graph: the kit has never been fetched in it. */
async function fresh() {
  vi.resetModules();
  Math.random = lehmer(1550);
  const E = await import('@/lib/frontOffice');
  const { openNflDesk } = await import('@/lib/nflGmDesk');
  const loader = await import('@/components/front-office/nflCareerKitLoad');
  /* scripts/controlFrontOfficeBoard.mjs points this at a board with one thing broken (askalways, nowait, recapnever) */
  const override = process.env.FO_BOARD_NFL;
  const { default: Board } = (override
    ? await import(/* @vite-ignore */ override)
    : await import('@/components/front-office/FrontOfficeBoard')) as { default: ComponentType };
  return { E, openNflDesk, loader, Board };
}
type Fresh = Awaited<ReturnType<typeof fresh>>;

/** A desk on save of a fifteen man league on the morning of `week`, in `phase`. */
function saveAt(G: Fresh, week: number, phase: string, extra: Record<string, unknown> = {}) {
  const rng = lehmer(7);
  const league: any = G.E.initLeague(rng);
  const team = Object.keys(league.teams)[0];
  for (let w = 1; w < week; w += 1) { league.schedule[w - 1].forEach((g: any) => G.E.simGame(g, league.teams, rng)); league.week += 1; }
  const save: any = {
    league, myTeam: team, phase, titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0,
    gm: G.openNflDesk(league, team), ...extra,
  };
  return { save, team, league };
}

/** The hub box titled `title`, by its title line (the uppercase one), the way a player reads it. */
const boxButton = (title: string): HTMLButtonElement | undefined => Array.from(document.querySelectorAll('button')).find(b =>
  Array.from(b.querySelectorAll('div')).some(dv => (dv.textContent ?? '').trim() === title && dv.className.includes('uppercase')));
/** The text of the hub box titled `title` (its value and its sub), or null when there is no such box. */
const boxText = (title: string): string | null => {
  const box = boxButton(title);
  return box ? (box.textContent ?? '').trim() : null;
};
const tick = () => act(async () => { await new Promise(r => setTimeout(r, 30)); });

describe('NFL front office: the GM career kit loads when it is needed', () => {
  it('a season being played never asks for it, and the Career box reads the same before and after it', async () => {
    const G = await fresh();
    const { save } = saveAt(G, 5, 'hub', { seasonsPlayed: 3, titles: 1 });
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    const first = render(<G.Board />);
    await tick();
    const before = boxText('Career');
    const level = boxText('GM level');
    expect(before, 'the hub draws the Career box without the kit').toBeTruthy();
    expect(level, 'the hub draws the GM level box without the kit').toBeTruthy();
    expect(before).toContain('Season 4');
    fireEvent.click(screen.getByText('This week'));
    await tick();
    expect(G.loader.nflCareerKitState(), 'a season being played fetched the kit').toBe('idle');
    /* Round 1561 (fix): the week is played, not only looked at. The press waits for the kit on the last week alone
       (useGmCareerKit's waits), so a reloaded save in the middle of a season plays its week with the kit away
       (controlFrontOfficeBoard waitsalways makes it wait on every week). */
    const weekPress = Array.from(document.querySelectorAll('button')).find(b => (b.textContent ?? '').trim().startsWith('Play Week'));
    expect(weekPress, 'the week box draws a Play Week press').toBeTruthy();
    expect(weekPress!.disabled, 'a week in the middle of the season waits for the kit').toBe(false);
    fireEvent.click(weekPress!);
    await tick();
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).league.week, 'Play Week did not play the week').toBe(6);
    expect(G.loader.nflCareerKitState(), 'playing a week fetched the kit').toBe('idle');
    first.unmount();
    /* the same save, the kit on the page: the box is read off the kit's own record (the league through the adapter) */
    await G.loader.loadNflCareerKit();
    render(<G.Board />);
    await tick();
    expect(boxText('Career'), 'the Career box reads differently once the kit is here').toBe(before);
    expect(boxText('GM level')).toBe(level);
  });

  it('a career box opened asks for it: the box header and the holding box, then the screen', async () => {
    const G = await fresh();
    const { save } = saveAt(G, 5, 'hub');
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    render(<G.Board />);
    await tick();
    expect(G.loader.nflCareerKitState()).toBe('idle');
    const box = boxButton('GM level');
    expect(box, 'no GM level box on the hub').toBeTruthy();
    fireEvent.click(box!);
    const panel = document.querySelector('[data-gm-desk="panel"]');
    expect(panel?.getAttribute('data-gm-panel')).toBe('xp');
    expect(panel?.querySelector('[data-gm-panel-loading]'), 'no holding box while the kit is on its way').toBeTruthy();
    expect(G.loader.nflCareerKitState()).toBe('loading');
    await waitFor(() => expect(document.querySelector('[data-gm-xp-desk]')).toBeTruthy(), { timeout: 20000 });
    expect(G.loader.nflCareerKitState()).toBe('ready');
    expect(document.querySelectorAll('[data-gm-desk="panel"]').length, 'the screen did not take the holding box place').toBe(1);
  });

  it('the last week asks for it, its press buttons wait for it, and the one press then closes the season', async () => {
    const G = await fresh();
    const { save, team } = saveAt(G, 17, 'hub');
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    render(<G.Board />);
    expect(G.loader.nflCareerKitState(), 'the last week did not ask for the kit').not.toBe('idle');
    fireEvent.click(screen.getByText('This week'));
    const press = () => screen.getByText('Play the final week + playoffs').closest('button') as HTMLButtonElement;
    if (G.loader.nflCareerKitState() === 'loading') expect(press().disabled, 'the press does not wait for the kit').toBe(true);
    await waitFor(() => expect(press().disabled).toBe(false), { timeout: 20000 });
    fireEvent.click(press());
    const after = JSON.parse(localStorage.getItem(SAVE_KEY)!);
    expect(['recap', 'fired']).toContain(after.phase);
    expect(after.seasonsPlayed).toBe(1);
    expect(after.league.champions.some((c: any) => c.season === save.league.season), 'the season did not close').toBe(true);
    expect(after.gm.blocks.seat?.career?.stints?.[0]?.team, 'the close did not write his record').toBe(team);
  });

  it('a save that loads on the recap waits in a holding box, then draws the recap', async () => {
    const G = await fresh();
    const { save, league } = saveAt(G, 17, 'recap');
    const champion = Object.keys(league.teams)[1];
    league.champions.push({ season: league.season, team: champion });
    save.seasonsPlayed = 1;
    save.postseason = { rounds: [], champion, gradeLine: null };
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    render(<G.Board />);
    expect(document.querySelector('[data-gm-panel-loading]'), 'no holding box on a recap without the kit').toBeTruthy();
    expect(screen.queryByText(new RegExp(`win the ${league.season} title`))).toBeNull();
    await waitFor(() => expect(screen.getByText(new RegExp(`win the ${league.season} title`))).toBeTruthy(), { timeout: 20000 });
    expect(document.querySelector('[data-gm-panel-loading]')).toBeNull();
  });

  it('a save that loads on the fired screen waits in a holding box, then draws the out of work screen', async () => {
    const G = await fresh();
    const { save, league } = saveAt(G, 17, 'fired');
    const champion = Object.keys(league.teams)[1];
    league.champions.push({ season: league.season, team: champion });
    Object.assign(save, { seasonsPlayed: 1, fired: true, trust: 0, postseason: { rounds: [], champion, gradeLine: null } });
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    render(<G.Board />);
    expect(document.querySelector('[data-gm-panel-loading]'), 'no holding box on the fired screen without the kit').toBeTruthy();
    expect(document.querySelector('[data-gm-out-of-work]')).toBeNull();
    await waitFor(() => expect(document.querySelector('[data-gm-out-of-work]')).toBeTruthy(), { timeout: 20000 });
    expect(document.querySelector('[data-gm-panel-loading]')).toBeNull();
  });

  it('a fetch that fails says so and asks again on Try again', async () => {
    vi.resetModules();
    let offline = true;
    vi.doMock('@/components/front-office/nflCareerKit', async importOriginal => {
      if (offline) throw new Error('offline');
      return importOriginal();
    });
    try {
      Math.random = lehmer(1550);
      const E = await import('@/lib/frontOffice');
      const { openNflDesk } = await import('@/lib/nflGmDesk');
      const loader = await import('@/components/front-office/nflCareerKitLoad');
      const { default: Board } = (await import('@/components/front-office/FrontOfficeBoard')) as { default: ComponentType };
      const G = { E, openNflDesk, loader, Board } as Fresh;
      const { save } = saveAt(G, 17, 'fired');
      Object.assign(save, { seasonsPlayed: 1, fired: true, trust: 0 });
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      render(<G.Board />);
      await waitFor(() => expect(document.querySelector('[data-career-kit-failed]')).toBeTruthy(), { timeout: 20000 });
      expect(screen.getByText("That screen didn't load. Check your connection and try again.")).toBeTruthy();
      expect(G.loader.nflCareerKitState(), 'a failed fetch is forgotten, so the next ask tries again').toBe('idle');
      offline = false;
      vi.resetModules(); /* the module graph forgets the failed import; the board's loader keeps its own state */
      fireEvent.click(screen.getByText('Try again'));
      await waitFor(() => expect(document.querySelector('[data-gm-out-of-work]')).toBeTruthy(), { timeout: 20000 });
      expect(document.querySelector('[data-career-kit-failed]')).toBeNull();
    } finally {
      vi.doUnmock('@/components/front-office/nflCareerKit');
    }
  });
});
