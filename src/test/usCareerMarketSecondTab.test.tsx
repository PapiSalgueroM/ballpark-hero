/* Release AX fix pass (the engine review, findings 1 and 3): one push in every tab, and the push is on the save.
 *
 * The board reads the save once, on load. Two tabs on one saved talk therefore each held the talk unpushed, and
 * the second one pushed again on fresh draws and wrote over the save. Measured by the reviewer in a real browser:
 * withdrawn in tab A, then held with the offer back on the table from tab B. Two boards mounted on one
 * localStorage are two tabs for this purpose: each has its own memory and they share the save.
 *
 * What is held, in all four sports:
 *   - the push is written to the save the moment it is made, before the wheel is spun or skipped (finding 3: this
 *     rested on the board recording alone);
 *   - a push in the second tab draws nothing and writes nothing, and that tab takes the saved wheel;
 *   - a Sign in the second tab signs nothing while the saved wheel is unseen;
 *   - a tab whose own write was refused (the save is BEHIND it) is not thrown back to the older saved talk.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import type { UsCareerSport } from '@/lib/usCareerSport';
import { openMarketExtension, openMarketFreeAgency } from '@/lib/usCareerMarket';

const SPORTS: [string, () => UsCareerSport][] = [['nfl', () => NFL_CAREER_SPORT], ['nba', () => NBA_CAREER_SPORT], ['mlb', () => MLB_CAREER_SPORT], ['nhl', () => NHL_CAREER_SPORT]];
function makeCareer(sport: UsCareerSport, years: number) {
  const pos = sport.create.defaultPos;
  const c = sport.startCareer('Two Tabs', pos, sport.create.archetypes[pos][0], () => 0.6, defaultAppearance(), 'now');
  c.contractYears = years; c.ovr = 85; c.role = 'starter'; return c;
}
const mount = (sport: UsCareerSport) => render(<MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter>);
const q = <T extends Element = HTMLElement>(view: { container: HTMLElement }, sel: string) => view.container.querySelector<T>(sel);
const talkOn = (sport: UsCareerSport) => JSON.parse(localStorage.getItem(sport.saveKey) ?? 'null')?.contractTalk;
/** Math.random as a counter: every draw is counted and answers the given number. */
function countDraws(answer: number) {
  const seen = { n: 0 };
  vi.spyOn(Math, 'random').mockImplementation(() => { seen.n += 1; return answer; });
  return seen;
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('a saved contract talk in two tabs', () => {
  it.each(SPORTS)('%s free agency: the second tab cannot push again, and takes the saved wheel', (_slug, binding) => {
    const sport = binding(), c = makeCareer(sport, 0);
    const opened = openMarketFreeAgency(c, sport.slug, sport.buildFaWindow(c, 80, () => 0.6));
    localStorage.setItem(sport.saveKey, JSON.stringify({ c, phase: 'freeagency', teamQuality: 80, coach: null, contractTalk: opened }));
    const a = mount(sport), b = mount(sport);
    expect(q(a, '[data-fa-push="0"]')).not.toBeNull();
    expect(q(b, '[data-fa-push="0"]')).not.toBeNull();

    const first = countDraws(0.99);
    fireEvent.click(q(a, '[data-fa-push="0"]')!);
    expect(first.n).toBeGreaterThan(0);
    /* the push is on the save at once, with its result, before the wheel is spun or skipped */
    const saved = talkOn(sport);
    expect(saved.window.offers[0].pushed).toBe(true);
    expect(saved.wheel.seen).toBe(false);
    expect(saved.wheel.draws.length).toBe(first.n);
    expect(q(a, '[data-market-wheel]')).not.toBeNull();
    const bytes = localStorage.getItem(sport.saveKey);

    /* tab B still shows the window as it loaded it; its push must draw nothing and write nothing */
    expect(q(b, '[data-market-wheel]')).toBeNull();
    const second = countDraws(0.01);
    fireEvent.click(q(b, '[data-fa-push="0"]')!);
    expect(second.n).toBe(0);
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
    expect(q(b, '[data-market-wheel]')).not.toBeNull();

    /* tab B sees the one saved result and then holds a spent push like any reloaded tab */
    fireEvent.click(q(b, '[data-market-skip]')!);
    expect(q(b, '[data-market-wheel]')!.getAttribute('data-market-result')).toBe(saved.wheel.result);
    fireEvent.click(q(b, '[data-market-continue]')!);
    expect(q<HTMLButtonElement>(b, '[data-fa-push="0"]')!.disabled).toBe(true);
    expect(second.n).toBe(0);
  });

  it.each(SPORTS)('%s extension: the second tab cannot push again and cannot sign past the saved wheel', (_slug, binding) => {
    const sport = binding(), c = makeCareer(sport, 1);
    /* a club that makes no offer leaves nothing to push, so the first draw that brings an offer is taken */
    const opened = [0.6, 0.1, 0.9, 0.3, 0.75, 0.45].map(n => openMarketExtension(c, sport.slug, sport.buildExtension(c, () => n)))
      .find(t => t.kind === 'extension' && t.talk.offer);
    if (!opened || opened.kind !== 'extension') throw new Error(`${sport.slug}: the fixture career got no extension offer on six draws, so there is nothing to push`);
    localStorage.setItem(sport.saveKey, JSON.stringify({ c, phase: 'extension', teamQuality: 80, coach: null, contractTalk: opened }));
    const a = mount(sport), b = mount(sport);
    expect(q(b, '[data-ext-push]')).not.toBeNull();

    const first = countDraws(0.99);
    fireEvent.click(q(a, '[data-ext-push]')!);
    const saved = talkOn(sport);
    expect(saved.talk.pushed).toBe(true);
    expect(saved.wheel.seen).toBe(false);
    expect(first.n).toBe(saved.wheel.draws.length);
    const bytes = localStorage.getItem(sport.saveKey);

    const second = countDraws(0.01);
    /* Sign on the stale copy: nothing is signed (the deal still has its one year and the talk is still saved) */
    if (q(b, '[data-ext-sign]')) fireEvent.click(q(b, '[data-ext-sign]')!);
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
    expect(q(b, '[data-market-wheel]')).not.toBeNull();
    /* and a push on whatever tab B shows now draws nothing */
    if (q(b, '[data-ext-push]')) fireEvent.click(q(b, '[data-ext-push]')!);
    expect(second.n).toBe(0);
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
  });

  it.each(SPORTS)('%s: a tab whose own write was refused is not thrown back to the older saved talk', (_slug, binding) => {
    const sport = binding(), c = makeCareer(sport, 0);
    const opened = openMarketFreeAgency(c, sport.slug, sport.buildFaWindow(c, 80, () => 0.6));
    const before = JSON.stringify({ c, phase: 'freeagency', teamQuality: 80, coach: null, contractTalk: opened });
    localStorage.setItem(sport.saveKey, before);
    const a = mount(sport);
    /* from here every write of the career is refused: the save stays the unpushed window, behind the tab */
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function refuse(this: Storage, key: string, value: string) {
      if (key === sport.saveKey) throw new DOMException('full', 'QuotaExceededError');
      return real.call(this, key, value);
    });
    countDraws(0.99);
    fireEvent.click(q(a, '[data-fa-push="0"]')!);
    expect(localStorage.getItem(sport.saveKey)).toBe(before);
    expect(q(a, '[data-market-wheel]')).not.toBeNull();
    fireEvent.click(q(a, '[data-market-skip]')!);
    fireEvent.click(q(a, '[data-market-continue]')!);
    /* the tab keeps ITS talk: the push stays spent on screen, and Sign still signs */
    expect(q<HTMLButtonElement>(a, '[data-fa-push="0"]')!.disabled).toBe(true);
    fireEvent.click(q(a, '[data-fa-sign="0"]')!);
    expect(q(a, '[data-fa-window]')).toBeNull();
    expect(q(a, '[data-market-wheel]')).toBeNull();
  });
});
