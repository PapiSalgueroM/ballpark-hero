/**
 * Round 1561: the NHL board fetches its GM career kit (nhlCareerKit.ts) when a screen needs it, never with the page,
 * the NFL board's rule (src/components/front-office/FrontOfficeLazyDesk.test.tsx) on the shared hook
 * (src/components/front-office-shared/useGmCareerKit.ts). A sibling file, not a parameterised NFL one (critic 2 of
 * brief 1559: a second board's copy of the same titles would disarm the NFL controls).
 *
 * Every case starts a fresh module graph (vi.resetModules, then the board and its loader imported again), so the kit
 * has never been fetched when the board mounts: the page as a visitor first gets it.
 *
 *   1  a season being played never asks for it, and the Career box reads the same before and after it;
 *   2  a career box opened asks for it: the box's header and the holding box, then the screen;
 *   3  the last round asks for it, its press waits for it, and the press then closes the season;
 *   4  a save that loads on the recap waits in a holding box, then draws the recap;
 *   5  a save that loads on the fired screen waits in a holding box, then draws the out of work screen;
 *   6  a fetch that fails says so, and Try again asks again and draws the screen;
 *   7  (critic 16 of brief 1559) a desk off save on the last round whose fetch fails: the retry card, storage byte
 *      equal, and after one retry the press closes the season to the same save as a press with the kit already here.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import type { ComponentType } from 'react';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

/* eslint-disable @typescript-eslint/no-explicit-any */
const SAVE_KEY = 'nhl-front-office-save-v1';
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
  Math.random = lehmer(1561);
  const E = await import('@/lib/nhlFrontOffice');
  const { openNhlDesk } = await import('@/lib/nhlGmDesk');
  const loader = await import('@/components/nhl-front-office/nhlCareerKitLoad');
  /* scripts/controlFrontOfficeBoard.mjs points this at a board with one thing broken (nhl askalways, nowait, recapnever) */
  const override = process.env.FO_BOARD_NHL;
  const { default: Board } = (override
    ? await import(/* @vite-ignore */ override)
    : await import('@/components/nhl-front-office/NhlFrontOfficeBoard')) as { default: ComponentType };
  return { E, openNhlDesk, loader: loader.nhlCareerKitLoader, Board };
}
type Fresh = Awaited<ReturnType<typeof fresh>>;

/** A save of a seeded league on the morning of `round`, in `phase`, the desk on unless `extra` says otherwise. */
function saveAt(G: Fresh, round: number, phase: string, extra: Record<string, unknown> = {}) {
  const rng = lehmer(7);
  const league: any = G.E.initNhlLeague(rng);
  const team = Object.keys(league.teams)[0];
  for (let r = 1; r < round; r += 1) { G.E.simNhlRound(league, team, rng); league.round += 1; }
  const save: any = {
    league, myTeam: team, phase, titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0,
    gm: G.openNhlDesk(league, team), ...extra,
  };
  return { save, team, league };
}

/** The hub box titled `title`, by its title line (the uppercase one), the way a player reads it. */
const boxButton = (title: string): HTMLButtonElement | undefined => Array.from(document.querySelectorAll('button')).find(b =>
  Array.from(b.querySelectorAll('div')).some(dv => (dv.textContent ?? '').trim() === title && dv.className.includes('uppercase')));
const boxText = (title: string): string | null => {
  const box = boxButton(title);
  return box ? (box.textContent ?? '').trim() : null;
};
const tick = () => act(async () => { await new Promise(r => setTimeout(r, 30)); });
const FINAL = 'Final stretch + playoffs';
const press = () => screen.getByText(FINAL).closest('button') as HTMLButtonElement;

describe('NHL front office: the GM career kit loads when it is needed', () => {
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
    fireEvent.click(screen.getByText('Play'));
    await tick();
    expect(G.loader.state(), 'a season being played fetched the kit').toBe('idle');
    /* Round 1561 (fix): the round is played, not only looked at. The press waits for the kit on the last round alone
       (useGmCareerKit's waits), so a reloaded save in the middle of a season plays its round with the kit away
       (controlFrontOfficeBoard nhl-waitsalways makes it wait on every round). */
    const roundPress = Array.from(document.querySelectorAll('button')).find(b => (b.textContent ?? '').trim() === 'Play Round 5');
    expect(roundPress, 'the Play box draws Play Round 5').toBeTruthy();
    expect(roundPress!.disabled, 'a round in the middle of the season waits for the kit').toBe(false);
    fireEvent.click(roundPress!);
    await tick();
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).league.round, 'Play Round 5 did not play the round').toBe(6);
    expect(G.loader.state(), 'playing a round fetched the kit').toBe('idle');
    first.unmount();
    /* the same save, the kit on the page: the box is read off the kit's own record (the league through the adapter) */
    await G.loader.load();
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
    expect(G.loader.state()).toBe('idle');
    const box = boxButton('GM level');
    expect(box, 'no GM level box on the hub').toBeTruthy();
    fireEvent.click(box!);
    const panel = document.querySelector('[data-gm-desk="panel"]');
    expect(panel?.getAttribute('data-gm-panel')).toBe('xp');
    expect(panel?.querySelector('[data-gm-panel-loading]'), 'no holding box while the kit is on its way').toBeTruthy();
    expect(G.loader.state()).toBe('loading');
    await waitFor(() => expect(document.querySelector('[data-gm-xp-desk]')).toBeTruthy(), { timeout: 20000 });
    expect(G.loader.state()).toBe('ready');
    expect(document.querySelectorAll('[data-gm-desk="panel"]').length, 'the screen did not take the holding box place').toBe(1);
  });

  it('the last round asks for it, its press waits for it, and the press then closes the season', async () => {
    const G = await fresh();
    const { save, team } = saveAt(G, 20, 'hub');
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    render(<G.Board />);
    expect(G.loader.state(), 'the last round did not ask for the kit').not.toBe('idle');
    fireEvent.click(screen.getByText('Play'));
    if (G.loader.state() === 'loading') expect(press().disabled, 'the press does not wait for the kit').toBe(true);
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
    const { save, league } = saveAt(G, 20, 'recap');
    const champion = Object.keys(league.teams)[1];
    league.champions.push({ season: league.season, team: champion });
    save.seasonsPlayed = 1;
    save.postseason = { series: [], champion, gradeLine: null };
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    render(<G.Board />);
    const headline = new RegExp(`lift the ${league.season + 1} Stanley Cup`);
    expect(document.querySelector('[data-gm-panel-loading]'), 'no holding box on a recap without the kit').toBeTruthy();
    expect(screen.queryByText(headline)).toBeNull();
    await waitFor(() => expect(screen.getByText(headline)).toBeTruthy(), { timeout: 20000 });
    expect(document.querySelector('[data-gm-panel-loading]')).toBeNull();
  });

  it('a save that loads on the fired screen waits in a holding box, then draws the out of work screen', async () => {
    const G = await fresh();
    const { save, league } = saveAt(G, 20, 'fired');
    const champion = Object.keys(league.teams)[1];
    league.champions.push({ season: league.season, team: champion });
    Object.assign(save, { seasonsPlayed: 1, fired: true, trust: 0, postseason: { series: [], champion, gradeLine: null } });
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    render(<G.Board />);
    expect(document.querySelector('[data-gm-panel-loading]'), 'no holding box on the fired screen without the kit').toBeTruthy();
    expect(document.querySelector('[data-gm-out-of-work]')).toBeNull();
    await waitFor(() => expect(document.querySelector('[data-gm-out-of-work]')).toBeTruthy(), { timeout: 20000 });
    expect(document.querySelector('[data-gm-panel-loading]')).toBeNull();
  });

  /** The board and loader in a fresh graph whose kit import fails while `net.offline` is set. */
  async function offlineBoard(net: { offline: boolean }) {
    vi.resetModules();
    vi.doMock('@/components/nhl-front-office/nhlCareerKit', async importOriginal => {
      if (net.offline) throw new Error('offline');
      return importOriginal();
    });
    Math.random = lehmer(1561);
    const E = await import('@/lib/nhlFrontOffice');
    const { openNhlDesk } = await import('@/lib/nhlGmDesk');
    const loader = await import('@/components/nhl-front-office/nhlCareerKitLoad');
    /* the control's copy here too, so nhl-nowait reaches critic 16's case (a press that never waits writes nothing
       while the kit is missing, and draws no retry card) */
    const override = process.env.FO_BOARD_NHL;
    const { default: Board } = (override
      ? await import(/* @vite-ignore */ override)
      : await import('@/components/nhl-front-office/NhlFrontOfficeBoard')) as { default: ComponentType };
    return { E, openNhlDesk, loader: loader.nhlCareerKitLoader, Board } as Fresh;
  }

  it('a fetch that fails says so and asks again on Try again', async () => {
    const net = { offline: true };
    try {
      const G = await offlineBoard(net);
      const { save } = saveAt(G, 20, 'fired');
      Object.assign(save, { seasonsPlayed: 1, fired: true, trust: 0 });
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      render(<G.Board />);
      await waitFor(() => expect(document.querySelector('[data-career-kit-failed]')).toBeTruthy(), { timeout: 20000 });
      expect(screen.getByText("That screen didn't load. Check your connection and try again.")).toBeTruthy();
      expect(G.loader.state(), 'a failed fetch is forgotten, so the next ask tries again').toBe('idle');
      net.offline = false;
      vi.resetModules(); /* the module graph forgets the failed import; the board's loader keeps its own state */
      fireEvent.click(screen.getByText('Try again'));
      await waitFor(() => expect(document.querySelector('[data-gm-out-of-work]')).toBeTruthy(), { timeout: 20000 });
      expect(document.querySelector('[data-career-kit-failed]')).toBeNull();
    } finally {
      vi.doUnmock('@/components/nhl-front-office/nhlCareerKit');
    }
  });

  it('a desk off save on the last round whose fetch fails: the retry card, nothing written, then one retry closes the season as a press with the kit here', async () => {
    /* A: the fetch fails, then one retry */
    const net = { offline: true };
    let closedA = '';
    let raw = '';
    try {
      const G = await offlineBoard(net);
      const { save } = saveAt(G, 20, 'hub');
      delete save.gm;
      raw = JSON.stringify(save);
      localStorage.setItem(SAVE_KEY, raw);
      render(<G.Board />);
      fireEvent.click(screen.getByText('Play'));
      await waitFor(() => expect(document.querySelector('[data-career-kit-failed]')).toBeTruthy(), { timeout: 20000 });
      expect(press().disabled, 'the press waits while the kit is missing').toBe(true);
      fireEvent.click(press());
      expect(localStorage.getItem(SAVE_KEY), 'a failed fetch writes nothing').toBe(raw);
      net.offline = false;
      vi.resetModules();
      fireEvent.click(screen.getByText('Try again'));
      await waitFor(() => expect(press().disabled).toBe(false), { timeout: 20000 });
      expect(document.querySelector('[data-career-kit-failed]')).toBeNull();
      Math.random = lehmer(99);
      fireEvent.click(press());
      closedA = localStorage.getItem(SAVE_KEY)!;
    } finally {
      vi.doUnmock('@/components/nhl-front-office/nhlCareerKit');
    }
    cleanup();
    localStorage.clear();
    /* B: the same save, the kit fetched before the board mounts */
    const G = await fresh();
    await G.loader.load();
    localStorage.setItem(SAVE_KEY, raw);
    render(<G.Board />);
    fireEvent.click(screen.getByText('Play'));
    await waitFor(() => expect(press().disabled).toBe(false), { timeout: 20000 });
    Math.random = lehmer(99);
    fireEvent.click(press());
    const closedB = localStorage.getItem(SAVE_KEY)!;
    const a = JSON.parse(closedA), b = JSON.parse(closedB);
    expect(a.seasonsPlayed, 'the retried press did not close the season').toBe(1);
    expect(a.gm, 'a desk off save stays desk off').toBeUndefined();
    expect(closedA, 'the retried close is not the close with the kit already here').toBe(closedB);
    expect(b.phase === 'recap' || b.phase === 'fired').toBe(true);
  });
});
