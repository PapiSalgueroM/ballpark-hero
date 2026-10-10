/* Round 1048: "📺 Week by week" on the real US career boards, in jsdom, with a
   seeded Math.random and a pinned clock.

   The promise under test: watching changes nothing. Two mounts from the same
   seed, one pressing "Play the" and one pressing "Week by week" and closing
   the overlay each time, must hold the same save bytes after every press.
   An always on control makes the entry's press draw one extra Math.random
   and the twin saves must then differ, so the comparison is known to see a
   moved draw. Also here: a held year shows its line and no button, a press
   that opens a contract talk or the market opens no overlay, the bare board
   (no host) plays and opens nothing, a sport with no Season Center bound
   renders no entry, and a season already played opens from "Watch again"
   without touching the save or the generator.

   The fix pass of 2026-10-08 added: the viewer is loaded BEFORE the season
   is played, so a chunk that cannot be loaded costs no season (with an
   always on control that plays first and must then show a season lost to
   the failed load), and the press never opens a line another tab saved for
   a different year.

   Release AN added: with storage full (every write of the save refused) the
   press still opens the season it played, handed over by the board, with an
   always on control that withholds the hand over and must then show the
   season played and no viewer, which is what a reviewer found where Rounds
   1048 and 1142 met. Every season the host is asked to show is written
   down, so "this tab's season, never the other tab's" is read off the
   request and not off the screen.

   Release AN, second half (Round 1084 joins): that same press must also SAY
   the save was refused (the board's notice and one toast) while the viewer
   opens, and Retry save, once the device takes writes again, must put the
   season he watched on the save without playing it again. Before the device
   refuses anything the notice is absent, so the check can fail. */
import fs from 'node:fs';
import path from 'node:path';
import type { ComponentType } from 'react';
import type { UsSeasonCentreRequest } from '@/components/us-career/season/UsSeasonCentreHost';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
/* Release AN, second half: the board says a refused save out loud since Round 1084 (toast.error and a notice
   with Retry save). This mock had no error on it, so the four storage full tests below died inside the board
   the moment the two rounds met in one tree. The words it is called with are written down.
   Release AN fix: error hands back the toast's number (its place in that list, from 1) and dismiss writes
   down the number it was given, so a test can say WHICH words were taken back and when. */
vi.mock('sonner', () => ({ toast: {
  success: () => undefined,
  /* Round 1144: what the toast was given besides its words (how long it stays, and the button on it) */
  error: (words: string, options?: ToastOptions) => { ctl.options.push(options ?? {}); return ctl.toasts.push(words); },
  dismiss: (id?: number) => { ctl.dismissed.push(id ?? -1); },
} }));
/* The control's switch: the real entry, its press followed by one extra draw when the switch is on. */
interface ToastOptions { duration?: number; action?: { label: string; onClick: (event: { preventDefault: () => void }) => void }; actionButtonStyle?: { height?: number; minWidth?: number } }
const ctl = vi.hoisted(() => ({ extraDraw: false, playFirst: false, noHandOver: false, opens: [] as { year: number; seasons: number }[], toasts: [] as string[], dismissed: [] as number[], options: [] as ToastOptions[] }));
vi.mock('@/components/us-career/season/UsSeasonCentreEntry', async importOriginal => {
  const original = await importOriginal<typeof import('@/components/us-career/season/UsSeasonCentreEntry')>();
  const host = await import('@/components/us-career/season/UsSeasonCentreHost');
  const { useContext } = await import('react');
  const Entry = original.UsSeasonCentreEntry;
  type P = Parameters<typeof Entry>[0];
  const Wrapped = (props: P) => {
    const centre = useContext(host.UsSeasonCentreOpen);
    /* the load first control: the OLD order, the season played before the viewer is asked for */
    const first = ctl.playFirst && centre ? { ...centre, ready: (from?: HTMLElement | null) => { props.onPlay(); return centre.ready(from); } } : centre;
    /* every season the host is asked to show is written down: its year and how many seasons its career holds */
    const api = first ? { ...first, open: (r: UsSeasonCentreRequest) => { ctl.opens.push({ year: r.row.year, seasons: r.career.seasons.length }); first.open(r); } } : first;
    return (
      <host.UsSeasonCentreOpen.Provider value={api}>
        {/* the hand over control: the board before Release AN, which gave the entry nothing but its Play */}
        <Entry {...props} played={ctl.noHandOver ? undefined : props.played} onPlay={() => { props.onPlay(); if (ctl.extraDraw) Math.random(); }} />
      </host.UsSeasonCentreOpen.Provider>
    );
  };
  return { ...original, UsSeasonCentreEntry: Wrapped };
});

import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import MlbMyCareerBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { keyedRng } from '@/lib/keyedRng';
import { holdPendingSave } from '@/lib/safeStorage';
import { usSeasonHeldLine } from '@/data/usSeasonLengths';
import { resetCareerMomentsForTest } from '@/components/soccer-career/careerMoments';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
const flush = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
const OUTSIDE = '[data-season-centre-entry], section[data-career-practice], section[data-career-prospect-entry], [data-career-review-opener]';
const buttons = (root: ParentNode) => ([...root.querySelectorAll('button')] as HTMLButtonElement[]).filter(b => !b.disabled && !b.closest(OUTSIDE));
const playButton = () => buttons(document.body).find(b => /^Play the \d+ season$/.test(squash(b.textContent ?? '')));
const click = async (el: Element | null | undefined) => { if (!el) throw new Error('usSeasonCentreEntry.test: nothing to click'); fireEvent.click(el); await flush(); };
const q = (sel: string) => document.querySelector<HTMLElement>(sel);
/** The press loads the viewer before it plays: wait until the entry is no longer loading (the hub may be gone by then). */
const settled = async () => { await waitFor(() => expect(q('[data-season-centre-entry] [aria-busy="true"]')).toBeNull(), { timeout: 20000 }); await flush(); };
const pressWatch = async () => { await click(q('[data-week-by-week]')); await settled(); };

/** A career one press away from its first season, made with the binding's own calls on a keyed stream. */
function seedSave(sport: UsCareerSport, pos: string, seed: string, eraId = 'now', change?: (c: UsCareerCore) => void) {
  const rng = keyedRng(seed);
  const c = sport.startCareer('Week Watcher', pos, sport.create.archetypes[pos][0], rng, null as never, eraId);
  const tq = sport.rollTeamQuality(null, rng);
  sport.assignRole(c, tq, rng);
  change?.(c);
  localStorage.setItem(sport.saveKey, JSON.stringify({ c, phase: 'season', teamQuality: tq }));
}
const savedCareer = (sport: UsCareerSport): UsCareerCore => JSON.parse(localStorage.getItem(sport.saveKey)!).c;

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Answer whatever is on screen until the hub's Play button is back. `ext` picks the extension talk's answer. */
async function toHub(sport: UsCareerSport, ext: 'sign' | 'decline' = 'sign'): Promise<'hub' | 'retired'> {
  for (let i = 0; i < 90; i += 1) {
    if (savedCareer(sport).retired) return 'retired';
    const body = document.body;
    const dialog = body.querySelector('[role="alertdialog"]');
    const reveal = body.querySelector('[data-season-reveal]');
    const talk = body.querySelector('[data-extension-talk]');
    const market = body.querySelector('[data-fa-window]');
    if (dialog) { const b = buttons(dialog); await click(b[b.length - 1]); continue; }
    if (reveal) { const b = buttons(reveal); await click(b[b.length - 1]); continue; }
    if (talk) { const b = buttons(talk); await click(ext === 'sign' ? b[0] : b[b.length - 1]); continue; }
    if (market) { await click(buttons(market)[0]); continue; }
    if (playButton()) return 'hub';
    /* Round 1147: a decision's outcome card with many changes has a "Show all changes" toggle before its
       Continue; pressing the first button there only folds the list open and shut for ever */
    const outcome = body.querySelector('[data-career-decision-outcome]');
    if (outcome) { const b = buttons(outcome); await click(b[b.length - 1]); continue; }
    const all = buttons(body);
    if (!all.length) throw new Error(`usSeasonCentreEntry.test: lost on "${squash(body.textContent ?? '').slice(0, 160)}"`);
    await click(all[0]);
  }
  const shown = ['[role="alertdialog"]', '[data-season-reveal]', '[data-extension-talk]', '[data-fa-window]'].filter(sel => document.body.querySelector(sel)).join(', ') || 'none of the known screens';
  throw new Error(`usSeasonCentreEntry.test: never got back to the hub (on screen: ${shown}; buttons: ${buttons(document.body).slice(0, 6).map(b => squash(b.textContent ?? '').slice(0, 30)).join(' | ')}; it reads "${squash(document.body.textContent ?? '').slice(0, 300)}")`);
}

interface Arm { saves: string[]; opened: number; noOverlay: number; focusOnContinue: number }
/** Twelve presses of Play, or of Week by week with the overlay closed each time. */
async function runArm(Board: ComponentType, sport: UsCareerSport, pos: string, watch: boolean, presses = 12): Promise<Arm> {
  cleanup();
  localStorage.clear();
  resetCareerMomentsForTest();
  seedSave(sport, pos, `twin|${sport.slug}|${pos}`);
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(20261007));
  render(<MemoryRouter><Board /></MemoryRouter>);
  await flush();
  const out: Arm = { saves: [], opened: 0, noOverlay: 0, focusOnContinue: 0 };
  for (let n = 0; n < presses; n += 1) {
    if ((await toHub(sport)) === 'retired') break;
    if (!watch) await click(playButton());
    else {
      await pressWatch();
      if (q('[data-us-centre-cover]')) {
        await waitFor(() => expect(q('[data-season-centre]')).not.toBeNull(), { timeout: 4000 });
        out.opened += 1;
        await click(q('[data-centre-exit]'));
        expect(q('[data-us-centre-cover]')).toBeNull();
        expect(q('[data-season-reveal]')).not.toBeNull();
        if (document.activeElement === q('[data-season-reveal] button')) out.focusOnContinue += 1;
      } else out.noOverlay += 1;
    }
    out.saves.push(localStorage.getItem(sport.saveKey) ?? '');
  }
  vi.restoreAllMocks();
  return out;
}

beforeEach(() => {
  ctl.extraDraw = false;
  ctl.playFirst = false;
  ctl.noHandOver = false;
  ctl.opens.length = 0;
  ctl.toasts.length = 0;
  ctl.dismissed.length = 0;
  ctl.options.length = 0;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T12:00:00Z'));
  localStorage.clear();
  resetCareerMomentsForTest();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

const BOUND: { name: string; Board: ComponentType; sport: UsCareerSport; pos: string }[] = [
  { name: 'NBA', Board: NbaMyCareerBoard, sport: NBA_CAREER_SPORT, pos: 'SG' },
  { name: 'NFL', Board: NflMyCareerBoard, sport: NFL_CAREER_SPORT, pos: 'QB' },
].filter(b => !!b.sport.loadSeasonCentre);

describe.each(BOUND)('$name My Career: watching changes nothing', ({ Board, sport, pos }) => {
  it('saves the same bytes after every press whether he presses Play or Week by week', async () => {
    /* a first mount in this process draws once for things the modules then keep (and loads the lazy
       chunks), so both arms are run after a throwaway mount and start from the same place */
    await runArm(Board, sport, pos, true, 2);
    const play = await runArm(Board, sport, pos, false);
    const watch = await runArm(Board, sport, pos, true);
    expect(play.saves).toHaveLength(12);
    expect(watch.saves).toEqual(play.saves);
    /* the overlay really opened, focus came back to the curtain, and a contract talk or the market opened nothing */
    expect(watch.opened).toBeGreaterThanOrEqual(8);
    expect(watch.focusOnContinue).toBe(watch.opened);
    expect(watch.noOverlay).toBeGreaterThan(0);
    expect(watch.opened + watch.noOverlay).toBe(12);
  }, 60000);

  it('CONTROL: one extra Math.random in the press makes the twin saves differ', async () => {
    /* the wrapped call is the entry's one call of the board's Play */
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/components/us-career/season/UsSeasonCentreEntry.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src.split('onPlay();')).toHaveLength(2);
    await runArm(Board, sport, pos, true, 2);
    const play = await runArm(Board, sport, pos, false, 4);
    ctl.extraDraw = true;
    const watch = await runArm(Board, sport, pos, true, 4);
    ctl.extraDraw = false;
    expect(watch.saves[0]).toBe(play.saves[0]);
    expect(watch.saves.slice(1)).not.toEqual(play.saves.slice(1));
  }, 60000);

  it('keeps Play the first button, and the entry never says "Play the"', async () => {
    seedSave(sport, pos, `order|${sport.slug}`);
    render(<MemoryRouter><Board /></MemoryRouter>);
    await flush();
    const play = playButton()!;
    const entry = q('[data-season-centre-entry]')!;
    expect(play.compareDocumentPosition(entry) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(entry.previousElementSibling).toBe(play);
    expect(entry.textContent).not.toMatch(/Play the/);
    expect(q('[data-week-by-week]')!.getAttribute('aria-label')).toContain('Week by week');
    expect([...document.querySelectorAll('button')].filter(b => /Play the/.test(b.textContent ?? ''))).toEqual([play]);
    expect(document.activeElement).not.toBe(q('[data-week-by-week]'));
    expect(q('[data-watch-last]')).toBeNull();
  });

  it('plays and opens nothing on the bare board, with no host around it', async () => {
    seedSave(sport, pos, `bare|${sport.slug}`);
    render(<MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter>);
    await flush();
    await pressWatch();
    expect(savedCareer(sport).seasons).toHaveLength(1);
    expect(q('[data-us-centre-cover]')).toBeNull();
    expect(q('[data-season-reveal]')).not.toBeNull();
    await toHub(sport);
    expect(q('[data-watch-last]')).toBeNull();
  });

  it('opens a season already played from Watch again, after a contract talk was answered with "play it out"', async () => {
    seedSave(sport, pos, `late|${sport.slug}`, 'now', c => { c.contractYears = 1; });
    const random = vi.spyOn(Math, 'random').mockImplementation(mulberry32(77));
    render(<MemoryRouter><Board /></MemoryRouter>);
    await flush();
    await pressWatch();
    expect(q('[data-extension-talk]')).not.toBeNull();
    expect(q('[data-us-centre-cover]')).toBeNull();
    expect(savedCareer(sport).seasons).toHaveLength(0);
    /* he plays the year out: the season runs with the usual curtain and no viewer */
    const talk = buttons(q('[data-extension-talk]')!);
    await click(talk[talk.length - 1]);
    expect(savedCareer(sport).seasons).toHaveLength(1);
    expect(q('[data-us-centre-cover]')).toBeNull();
    if ((await toHub(sport)) === 'retired') throw new Error('retired after one season');
    const again = q('[data-watch-last]')!;
    expect(again.textContent).toContain(`Watch the ${savedCareer(sport).seasons[0].year} season again`);
    expect(again.textContent).not.toMatch(/Play the/);
    const bytes = localStorage.getItem(sport.saveKey);
    const draws = random.mock.calls.length;
    await click(again);
    await settled();
    await waitFor(() => expect(q('[data-season-centre]')).not.toBeNull(), { timeout: 4000 });
    await click(q('[data-centre-exit]'));
    expect(q('[data-us-centre-cover]')).toBeNull();
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
    expect(random.mock.calls.length).toBe(draws);
    expect(document.activeElement).toBe(q('[data-watch-last]'));
  }, 30000);

  /** One press of Week by week while the sport's number file cannot be loaded (a tab left open across a release). */
  async function pressWithAFailedChunk(seed: string) {
    seedSave(sport, pos, `${seed}|${sport.slug}`);
    const load = vi.spyOn(sport as Required<Pick<UsCareerSport, 'loadSeasonCentre'>>, 'loadSeasonCentre')
      .mockImplementationOnce(() => Promise.reject(new Error('Failed to fetch dynamically imported module')));
    render(<MemoryRouter><Board /></MemoryRouter>);
    await flush();
    const bytes = localStorage.getItem(sport.saveKey);
    await click(q('[data-week-by-week]'));
    await waitFor(() => expect(q('[data-season-centre-failed]')).not.toBeNull(), { timeout: 20000 });
    expect(load).toHaveBeenCalledTimes(1);
    return bytes;
  }

  it('plays nothing when the viewer cannot be loaded: a failed chunk costs no season', async () => {
    const bytes = await pressWithAFailedChunk('stale');
    /* nothing was played: the save, the hub and the screen are where they were */
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
    expect(savedCareer(sport).seasons).toHaveLength(0);
    expect(q('[data-season-reveal]')).toBeNull();
    expect(q('[data-us-centre-cover]')).toBeNull();
    expect(playButton()).toBeDefined();
    expect(q('[data-season-centre-failed]')!.textContent).toContain('your season has not been played');
    /* Back closes the tile and gives the focus back to the button he pressed */
    await click([...q('[data-season-centre-failed]')!.querySelectorAll('button')].find(b => /Back to your season/.test(b.textContent ?? '')));
    expect(q('[data-season-centre-failed]')).toBeNull();
    expect(document.activeElement).toBe(q('[data-week-by-week]'));
    /* the next press finds its chunks, plays and opens as usual */
    await pressWatch();
    await waitFor(() => expect(q('[data-season-centre]')).not.toBeNull(), { timeout: 4000 });
    expect(savedCareer(sport).seasons).toHaveLength(1);
  }, 60000);

  /* Round 1144. A review of Release AN: the tile's Reload threw away a save the device had refused, under
     a line that said "Your career is safe". The save is retried once first; while it is still refused
     the page stays and the tile says why. (The season is played here with the tile up, which a script
     can do and a finger cannot: a player gets to this state by playing first and opening the viewer
     second, and what is held is the same either way, a tile over a board with a save waiting.) */
  it('the tile stays and says why when its Reload would lose a save the device refused', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    try {
      await pressWithAFailedChunk('held');
      const refusing = refuseTheSave();
      await click(playButton());
      expect(refusedNotice()).not.toBeNull();
      const tile = () => q('[data-season-centre-failed]')!;
      const pressReload = () => click([...tile().querySelectorAll('button')].find(b => /Reload/.test(b.textContent ?? '')));
      const tries = () => refusing.mock.calls.filter(c => c[0] === sport.saveKey).length;
      const before = tries();
      await pressReload();
      /* the save was tried once more, it is still refused, and the page was not reloaded */
      expect(tries()).toBe(before + 1);
      expect(reload).not.toHaveBeenCalled();
      expect(tile().textContent).toContain('has not been saved yet');
      expect(tile().textContent).not.toContain('Your career is safe');
      expect(refusedNotice()).not.toBeNull();
      expect(savedCareer(sport).seasons).toHaveLength(0);
      /* the device takes writes again: the same press saves first and reloads second */
      refusing.mockRestore();
      await pressReload();
      expect(savedCareer(sport).seasons).toHaveLength(1);
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  }, 60000);

  /* Round 1144 review: the order a player really meets. He played, the save was refused, and THEN he
     opened the viewer. The tile opened on "Your career is safe. Reload the page" and only told the truth
     after Reload had been pressed. (The waiting save is named to the seam here directly, standing in
     for the board's own: what the tile reads is the seam.) */
  it('says a save is waiting from the first moment, before Reload is pressed', async () => {
    const release = holdPendingSave(() => false);
    try {
      await pressWithAFailedChunk('waiting');
      const tile = q('[data-season-centre-failed]')!;
      expect(q('[data-season-centre-save-waiting]')).not.toBeNull();
      expect(tile.textContent).toContain('has not been saved yet');
      expect(tile.textContent).not.toContain('Your career is safe');
      expect(q('[data-season-centre-held-reload]')).toBeNull();
    } finally {
      release();
    }
  }, 60000);

  /* and offline nothing reloads, so nothing is held: the import is asked again and no line says the
     page "was not reloaded" */
  it('offline, the tile asks for the viewer again and does not say a reload was held', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    const retry = vi.fn(() => false);
    const release = holdPendingSave(retry);
    try {
      await pressWithAFailedChunk('offline');
      const online = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
      await click([...q('[data-season-centre-failed]')!.querySelectorAll('button')].find(b => /Reload/.test(b.textContent ?? '')));
      online.mockRestore();
      expect(reload).not.toHaveBeenCalled();
      expect(retry).not.toHaveBeenCalled();
      expect(q('[data-season-centre-held-reload]')).toBeNull();
    } finally {
      release();
      vi.unstubAllGlobals();
    }
  }, 60000);

  it('CONTROL: the old order (play, then load) loses a season to the same failed chunk', async () => {
    /* the needle: the entry asks for the viewer before its one call of Play */
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/components/us-career/season/UsSeasonCentreEntry.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src.split('await centre.ready(from)')).toHaveLength(3);
    expect(src.indexOf('await centre.ready(from)')).toBeLessThan(src.indexOf('onPlay();'));
    ctl.playFirst = true;
    const bytes = await pressWithAFailedChunk('stale-control');
    ctl.playFirst = false;
    /* the season is on the save and the viewer never came: exactly what the test above forbids */
    expect(localStorage.getItem(sport.saveKey)).not.toBe(bytes);
    expect(savedCareer(sport).seasons).toHaveLength(1);
    expect(q('[data-season-centre]')).toBeNull();
  }, 60000);

  /** From here on the browser refuses every write of this career's save, as a full storage does. */
  function refuseTheSave() {
    const real = Storage.prototype.setItem;
    return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === sport.saveKey) throw new Error('QuotaExceededError');
      real.call(this, k, v);
    });
  }
  /** Round 1084's notice for a save the device refused, with its Retry save button. */
  const refusedNotice = () => q('[data-us-career-save-error][data-save-operation="write"]');

  it('opens the season he just played when storage is full and the save was refused', async () => {
    seedSave(sport, pos, `full|${sport.slug}`);
    render(<MemoryRouter><Board /></MemoryRouter>);
    await flush();
    const stored = localStorage.getItem(sport.saveKey);
    const year = savedCareer(sport).year;
    /* while the device still takes the save nothing is said */
    expect(refusedNotice()).toBeNull();
    expect(ctl.toasts).toEqual([]);
    const refusing = refuseTheSave();
    await pressWatch();
    /* the save is where it was (no season on it), and the viewer is open on the one season this press played */
    expect(localStorage.getItem(sport.saveKey)).toBe(stored);
    expect(savedCareer(sport).seasons).toHaveLength(0);
    await waitFor(() => expect(q('[data-season-centre]')).not.toBeNull(), { timeout: 4000 });
    expect(q('[data-us-centre-cover]')).not.toBeNull();
    expect(ctl.opens).toEqual([{ year, seasons: 1 }]);
    /* Release AN, second half, where Round 1084 meets this press: the refused save is SAID, once, while the
       viewer opens over it. Neither round takes the other's promise away. */
    expect(refusedNotice()).not.toBeNull();
    expect(ctl.toasts).toHaveLength(1);
    /* and the words stay up for as long as the save is still refused */
    expect(ctl.dismissed).toEqual([]);
    /* closing it leaves the curtain of that same season, as on any other press */
    await click(q('[data-centre-exit]'));
    expect(q('[data-us-centre-cover]')).toBeNull();
    expect(q('[data-season-reveal]')).not.toBeNull();
    expect(localStorage.getItem(sport.saveKey)).toBe(stored);
    /* the notice is still up beside the curtain, and once the device takes writes again its Retry save puts
       the season he watched on the save: the same year, one season, nothing played a second time.
       DO NOT TRIM the next line: it is the only check anywhere that holds the notice on the season curtain,
       the screen a refused Play lands on. A review took withSaveStatus off the curtain's return in
       UsCareerBoard.tsx: the save retry tests and simUsCareerSaveRetry (all 23 controls) stayed green and
       this test alone went red. */
    expect(q('[data-season-reveal]')).not.toBeNull();
    expect(refusedNotice()).not.toBeNull();
    refusing.mockRestore();
    await click([...refusedNotice()!.querySelectorAll('button')].find(b => squash(b.textContent ?? '') === 'Retry save'));
    expect(refusedNotice()).toBeNull();
    expect(savedCareer(sport).seasons).toHaveLength(1);
    expect(savedCareer(sport).seasons[0].year).toBe(year);
    expect(ctl.opens).toEqual([{ year, seasons: 1 }]);
    expect(ctl.toasts).toHaveLength(1);
    /* Release AN fix: the save went through, so the toast that said it had not is taken back there and then
       (it used to stay up for the rest of its few seconds, beside a notice that had just gone), and it is
       that one toast, by its number, never a blanket dismiss */
    expect(ctl.dismissed).toEqual([1]);
  }, 30000);

  /* Round 1144. A review of Release AN: with the viewer open over a refused save the toast said "use
     Retry save" and the notice that holds that button was under the viewer's cover, out of reach until
     he closed it. The toast carries a Retry of its own now. It is called Retry, never Retry save, so
     the page has one button of each name (the other lane's driver finds the notice's by its exact
     name). A press keeps the toast: taking it back is the job of the save going through. */
  it('with the viewer open over a refused save, the toast carries a Retry that saves the season from there', async () => {
    seedSave(sport, pos, `full-toast|${sport.slug}`);
    render(<MemoryRouter><Board /></MemoryRouter>);
    await flush();
    const year = savedCareer(sport).year;
    const refusing = refuseTheSave();
    await pressWatch();
    await waitFor(() => expect(q('[data-season-centre]')).not.toBeNull(), { timeout: 4000 });
    expect(refusedNotice()).not.toBeNull();
    expect(ctl.toasts).toHaveLength(1);
    const action = ctl.options[0]?.action;
    expect(action?.label).toBe('Retry');
    /* long enough to read two sentences and press: sonner's own four seconds is not */
    expect(ctl.options[0]?.duration).toBeGreaterThanOrEqual(8000);
    /* and a thumb's room: a toast's button is 24 px tall as it comes */
    expect(ctl.options[0]?.actionButtonStyle?.height).toBeGreaterThanOrEqual(44);
    expect(ctl.options[0]?.actionButtonStyle?.minWidth).toBeGreaterThanOrEqual(44);
    /* still refused: the press tries the save again, once, and nothing is taken back */
    const tries = () => refusing.mock.calls.filter(c => c[0] === sport.saveKey).length;
    const before = tries();
    let kept = 0;
    await act(async () => { action!.onClick({ preventDefault: () => { kept += 1; } }); });
    expect(tries()).toBe(before + 1);
    expect(kept).toBe(1);
    expect(savedCareer(sport).seasons).toHaveLength(0);
    expect(refusedNotice()).not.toBeNull();
    expect(ctl.dismissed).toEqual([]);
    /* the device takes writes again: the same press, with the viewer still open, puts the season on the save */
    refusing.mockRestore();
    await act(async () => { action!.onClick({ preventDefault: () => { kept += 1; } }); });
    await flush();
    expect(savedCareer(sport).seasons).toHaveLength(1);
    expect(savedCareer(sport).seasons[0].year).toBe(year);
    expect(q('[data-season-centre]')).not.toBeNull();
    expect(refusedNotice()).toBeNull();
    /* and the toast is taken back by the save going through, as before, not by the press */
    expect(kept).toBe(2);
    expect(ctl.dismissed).toEqual([1]);
    expect(ctl.toasts).toHaveLength(1);
  }, 30000);

  it('CONTROL: without the board handing its career over, the same press plays the season and opens nothing', async () => {
    /* the needle: the entry asks the board for the played career exactly once, after its one call of Play */
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/components/us-career/season/UsSeasonCentreEntry.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src.split('at.played?.()')).toHaveLength(2);
    expect(src.indexOf('onPlay();')).toBeLessThan(src.indexOf('at.played?.()'));
    ctl.noHandOver = true;
    seedSave(sport, pos, `full|${sport.slug}`);
    render(<MemoryRouter><Board /></MemoryRouter>);
    await flush();
    refuseTheSave();
    await pressWatch();
    ctl.noHandOver = false;
    /* the season was played (the curtain is up) and no viewer came: what a reviewer found on a phone with full storage */
    expect(q('[data-season-reveal]')).not.toBeNull();
    expect(q('[data-us-centre-cover]')).toBeNull();
    expect(q('[data-season-centre]')).toBeNull();
    expect(ctl.opens).toEqual([]);
  }, 30000);

  it('never opens a line another tab saved: with his own write refused he watches the season this tab played', async () => {
    seedSave(sport, pos, `tab|${sport.slug}`);
    render(<MemoryRouter><Board /></MemoryRouter>);
    await flush();
    /* another tab has saved this career one season on, in a different year, and this tab's own write is refused */
    const other = JSON.parse(localStorage.getItem(sport.saveKey)!) as { c: UsCareerCore; teamQuality: number };
    const year = other.c.year;
    other.c.year = year + 3;
    const rng = keyedRng(`tab|other|${sport.slug}`);
    sport.campBattle(other.c as never, other.teamQuality, rng);
    sport.simSeason(other.c as never, other.teamQuality, rng);
    expect(other.c.seasons).toHaveLength(1);
    expect(other.c.seasons[0].year).toBe(year + 3);
    expect(other.c.seasons[0].games).toBeGreaterThan(0);
    localStorage.setItem(sport.saveKey, JSON.stringify(other));
    const stored = localStorage.getItem(sport.saveKey);
    refuseTheSave();
    await pressWatch();
    /* this tab played its own season in memory (the curtain is up under the viewer) and the stored line is
       still the other tab's. Since Release AN the viewer opens, on this tab's own season: the one line the
       host was asked for is the year he pressed for, never the other tab's year */
    expect(localStorage.getItem(sport.saveKey)).toBe(stored);
    expect(q('[data-season-reveal]')).not.toBeNull();
    await waitFor(() => expect(q('[data-season-centre]')).not.toBeNull(), { timeout: 4000 });
    expect(ctl.opens).toEqual([{ year, seasons: 1 }]);
    expect(ctl.opens.some(o => o.year === year + 3)).toBe(false);
    /* Release AN fix: he leaves with the save still refused. The toast told him to use Retry save, and there
       is no Retry save where he is going, so it leaves with the page (it used to follow him to Home and back) */
    expect(ctl.toasts).toHaveLength(1);
    expect(ctl.dismissed).toEqual([]);
    cleanup();
    expect(ctl.dismissed).toEqual([1]);
  }, 30000);

  it('CONTROL: before the hand over, that press with another tab\'s line on the save opened nothing at all', async () => {
    ctl.noHandOver = true;
    seedSave(sport, pos, `tab|${sport.slug}`);
    render(<MemoryRouter><Board /></MemoryRouter>);
    await flush();
    const other = JSON.parse(localStorage.getItem(sport.saveKey)!) as { c: UsCareerCore; teamQuality: number };
    other.c.year += 3;
    const rng = keyedRng(`tab|other|${sport.slug}`);
    sport.campBattle(other.c as never, other.teamQuality, rng);
    sport.simSeason(other.c as never, other.teamQuality, rng);
    localStorage.setItem(sport.saveKey, JSON.stringify(other));
    refuseTheSave();
    await pressWatch();
    ctl.noHandOver = false;
    /* the read back alone turns the other tab's line away (its year is not the year he pressed for) */
    expect(q('[data-season-reveal]')).not.toBeNull();
    expect(q('[data-us-centre-cover]')).toBeNull();
    expect(ctl.opens).toEqual([]);
  }, 30000);

  it('opens the viewer or the plain tile, never a throw, for a last line from an older build', async () => {
    seedSave(sport, pos, `old|${sport.slug}`);
    render(<MemoryRouter><Board /></MemoryRouter>);
    await flush();
    await click(playButton());
    await toHub(sport);
    cleanup();
    /* an older build's line: no playoff numbers, and a team result this engine never wrote */
    const save = JSON.parse(localStorage.getItem(sport.saveKey)!);
    const line = save.c.seasons[save.c.seasons.length - 1];
    delete line.poGames; delete line.poPpg; delete line.poRpg; delete line.poApg; delete line.poLine;
    line.teamResult = 'Made the playoffs';
    localStorage.setItem(sport.saveKey, JSON.stringify(save));
    render(<MemoryRouter><Board /></MemoryRouter>);
    await flush();
    await toHub(sport);
    await click(q('[data-watch-last]'));
    await settled();
    await waitFor(() => expect(q('[data-season-centre]')).not.toBeNull(), { timeout: 4000 });
    expect(q('[data-season-centre-failed]')).toBeNull();
  }, 30000);
});

describe('a held year, a banned year, and the sports with no Season Center', () => {
  it('shows the held line and no button in a year whose real length is not the one the career plays', async () => {
    /* an NBA throwback career moved to 2011 by hand: 2011-12 had 66 games */
    seedSave(NBA_CAREER_SPORT, 'SG', 'held', 'y2004', c => { c.year = 2011; });
    render(<MemoryRouter><NbaMyCareerBoard /></MemoryRouter>);
    await flush();
    expect(q('[data-season-centre-held]')!.textContent).toBe(usSeasonHeldLine('nba', 2011));
    expect(q('[data-week-by-week]')).toBeNull();
    expect(playButton()).toBeDefined();
  });
  it('holds an NFL throwback career until 2021: the held line and no button in 2005', async () => {
    /* Round 1147 on Round 1104: the 2005 throwback plays the real 16 games, and the week by week view is built for 17 */
    seedSave(NFL_CAREER_SPORT, 'QB', 'held-nfl', 'y2005');
    render(<MemoryRouter><NflMyCareerBoard /></MemoryRouter>);
    await flush();
    expect(savedCareer(NFL_CAREER_SPORT).year).toBe(2005);
    expect(q('[data-season-centre-held]')!.textContent).toBe(usSeasonHeldLine('nfl', 2005));
    expect(q('[data-season-centre-held]')!.textContent).toContain('starts with the 2021 season');
    expect(q('[data-week-by-week]')).toBeNull();
    expect(playButton()).toBeDefined();
  });
  /* Release AP (Round 1104 meets Round 1147): since 1104 every throwback season before 2021 is a held year,
     so "the last season he played is held" is the everyday case there, and nothing pinned what the hub
     offers then. A throwback career set down in 2020 (by hand: a player gets there in sixteen seasons) is
     played across the line: 2020 (held), 2021 (open), and the hub of 2022 (held). The 2022 hub is the
     arm that proves the 2021 one could have shown the link: there it must be on screen. */
  it('never offers Watch again for a held season, and offers it for the open one after it', async () => {
    const sport = NFL_CAREER_SPORT;
    /** One Play of the season on screen, back to the hub; false when that keyed career cannot carry the test. */
    const playOn = async (year: number) => {
      await click(playButton());
      if ((await toHub(sport)) === 'retired') return false;
      const c = savedCareer(sport);
      const line = c.seasons[c.seasons.length - 1];
      return line.year === year && line.games > 0 && line.teamResult !== 'SUSPENDED' && (c.suspendedSeasons ?? 0) === 0;
    };
    let walked = false;
    for (let n = 0; n < 8 && !walked; n += 1) {
      cleanup();
      localStorage.clear();
      resetCareerMomentsForTest();
      vi.restoreAllMocks();
      seedSave(sport, 'QB', `held-last|${n}`, 'y2005', c => { c.year = 2020; });
      vi.spyOn(Math, 'random').mockImplementation(mulberry32(1104 + n));
      render(<MemoryRouter><NflMyCareerBoard /></MemoryRouter>);
      await flush();
      /* 2020: held, and nothing played yet */
      expect(q('[data-season-centre-held]')!.textContent).toBe(usSeasonHeldLine('nfl', 2020));
      expect(q('[data-watch-last]')).toBeNull();
      if (!(await playOn(2020))) continue;
      /* the hub of 2021: this year opens, and the 16 game 2020 season is not offered again */
      expect(savedCareer(sport).year).toBe(2021);
      expect(savedCareer(sport).seasons[0].games).toBeLessThanOrEqual(16);
      expect(usSeasonHeldLine('nfl', 2021)).toBeNull();
      expect(q('[data-week-by-week]')).not.toBeNull();
      expect(q('[data-season-centre-held]')).toBeNull();
      expect(q('[data-watch-last]')).toBeNull();
      if (!(await playOn(2021))) continue;
      /* the hub of 2022: this year is held, and the open 2021 season IS offered again */
      expect(savedCareer(sport).year).toBe(2022);
      expect(q('[data-season-centre-held]')!.textContent).toBe(usSeasonHeldLine('nfl', 2022));
      expect(q('[data-week-by-week]')).toBeNull();
      expect(q('[data-watch-last]')!.textContent).toContain('Watch the 2021 season again');
      walked = true;
    }
    expect(walked, 'no keyed career of eight played 2020 and 2021 in full view').toBe(true);
  }, 60000);
  /* Round 1212: the held function is handed who is asking (his position and his club of that season), so a
     binding can hold a position or a club the view cannot show yet. The NBA and NFL bindings take the year
     alone and ignore the rest: the three tests above are that proof. */
  it('hands the held function his position and his club, and shows its line with no button', async () => {
    const asked: unknown[] = [];
    const HOLDS_POS: UsCareerSport = {
      ...NBA_CAREER_SPORT,
      seasonCentreHeld: (year, eraId, who) => { asked.push([year, eraId, who]); return who?.pos === 'SG' ? '📺 No week by week for this position yet.' : null; },
    };
    seedSave(NBA_CAREER_SPORT, 'SG', 'held-pos');
    render(<MemoryRouter><UsCareerBoard sport={HOLDS_POS} /></MemoryRouter>);
    await flush();
    const c = savedCareer(NBA_CAREER_SPORT);
    expect(q('[data-season-centre-held]')!.textContent).toBe('📺 No week by week for this position yet.');
    expect(q('[data-week-by-week]')).toBeNull();
    expect(playButton()).toBeDefined();
    expect(asked[0]).toEqual([c.year, c.eraId, { pos: 'SG', team: c.team }]);
  });
  it('holds one club and not another through the same function', async () => {
    seedSave(NBA_CAREER_SPORT, 'SG', 'held-club');
    const club = savedCareer(NBA_CAREER_SPORT).team;
    const holds = (team: string): UsCareerSport => ({ ...NBA_CAREER_SPORT, seasonCentreHeld: (_y, _e, who) => (who?.team === team ? '📺 No week by week for this club this season.' : null) });
    render(<MemoryRouter><UsCareerBoard sport={holds(club)} /></MemoryRouter>);
    await flush();
    expect(q('[data-season-centre-held]')!.textContent).toBe('📺 No week by week for this club this season.');
    expect(q('[data-week-by-week]')).toBeNull();
    cleanup();
    render(<MemoryRouter><UsCareerBoard sport={holds(`${club}-other`)} /></MemoryRouter>);
    await flush();
    expect(q('[data-season-centre-held]')).toBeNull();
    expect(q('[data-week-by-week]')).not.toBeNull();
  });
  it('has the NBA and the NFL both bound, so neither arm above can drop out through its own filter', () => {
    expect(BOUND.map(b => b.name)).toEqual(['NBA', 'NFL']);
  });
  it('says there is nothing to watch in a banned year', async () => {
    seedSave(NBA_CAREER_SPORT, 'SG', 'banned', 'now', c => { c.suspendedSeasons = 1; });
    render(<MemoryRouter><NbaMyCareerBoard /></MemoryRouter>);
    await flush();
    expect(q('[data-season-centre-held]')!.textContent).toContain('you are suspended');
    expect(q('[data-week-by-week]')).toBeNull();
  });
  const UNBOUND: [string, ComponentType, UsCareerSport, string][] = ([
    ['NFL', NflMyCareerBoard, NFL_CAREER_SPORT, 'QB'],
    ['MLB', MlbMyCareerBoard, MLB_CAREER_SPORT, MLB_CAREER_SPORT.create.defaultPos],
    ['NHL', NhlMyCareerBoard, NHL_CAREER_SPORT, NHL_CAREER_SPORT.create.defaultPos],
  ] as [string, ComponentType, UsCareerSport, string][]).filter(x => !x[2].loadSeasonCentre);
  it.each(UNBOUND)('%s My Career renders no entry at all', async (_name, Board, sport, pos) => {
    seedSave(sport, pos, `none|${sport.slug}`);
    render(<MemoryRouter><Board /></MemoryRouter>);
    await flush();
    expect(playButton()).toBeDefined();
    expect(q('[data-season-centre-entry]')).toBeNull();
  });
  it('still has MLB and the NHL unbound (they are number files for a later round)', () => {
    expect(MLB_CAREER_SPORT.loadSeasonCentre).toBeUndefined();
    expect(NHL_CAREER_SPORT.loadSeasonCentre).toBeUndefined();
  });
});
