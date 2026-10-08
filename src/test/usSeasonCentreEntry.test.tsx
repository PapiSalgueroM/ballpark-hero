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
   a different year. */
import fs from 'node:fs';
import path from 'node:path';
import type { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));
/* The control's switch: the real entry, its press followed by one extra draw when the switch is on. */
const ctl = vi.hoisted(() => ({ extraDraw: false, playFirst: false }));
vi.mock('@/components/us-career/season/UsSeasonCentreEntry', async importOriginal => {
  const original = await importOriginal<typeof import('@/components/us-career/season/UsSeasonCentreEntry')>();
  const host = await import('@/components/us-career/season/UsSeasonCentreHost');
  const { useContext } = await import('react');
  const Entry = original.UsSeasonCentreEntry;
  type P = Parameters<typeof Entry>[0];
  const Wrapped = (props: P) => {
    const centre = useContext(host.UsSeasonCentreOpen);
    /* the load first control: the OLD order, the season played before the viewer is asked for */
    const api = ctl.playFirst && centre ? { ...centre, ready: (from?: HTMLElement | null) => { props.onPlay(); return centre.ready(from); } } : centre;
    return (
      <host.UsSeasonCentreOpen.Provider value={api}>
        <Entry {...props} onPlay={() => { props.onPlay(); if (ctl.extraDraw) Math.random(); }} />
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
    const all = buttons(body);
    if (!all.length) throw new Error(`usSeasonCentreEntry.test: lost on "${squash(body.textContent ?? '').slice(0, 160)}"`);
    await click(all[0]);
  }
  throw new Error('usSeasonCentreEntry.test: never got back to the hub');
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

  it('never opens a line another tab saved: the saved line must be the year he pressed for', async () => {
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
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === sport.saveKey) throw new Error('QuotaExceededError');
      real.call(this, k, v);
    });
    await pressWatch();
    /* this tab played its own season in memory (the curtain is up), the stored line is the other tab's, and nothing opens */
    expect(localStorage.getItem(sport.saveKey)).toBe(stored);
    expect(q('[data-season-reveal]')).not.toBeNull();
    expect(q('[data-us-centre-cover]')).toBeNull();
    expect(q('[data-season-centre]')).toBeNull();
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
