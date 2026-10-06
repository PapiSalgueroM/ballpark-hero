/**
 * Round 1038: the US summer on the real board, all four bindings.
 *
 * Every offseason now deals up to three cards (src/lib/usCareerSummer.ts) and
 * saves them, so a reload opens on the card it left. These tests mount the
 * shared board with each real binding and a save built by the real engines:
 *   - a mid-summer save opens on ids[at], with its place in the summer shown
 *   - answering advances, the receipt's Continue opens the next card, and the
 *     last answer ends the summer and rolls team quality exactly once
 *   - unmount and mount again return the same card, word for word
 *   - a card the career has moved past is skipped
 *   - a broken summer, ledger or salt is dropped alone
 *   - a save from before this round (phase 'event', no summer) opens on the hub
 *     and is not written
 *   - a double tap applies one card
 *   - the one card knob writes nothing onto the career
 *
 * Control: scripts/simUsCareerSummer.mjs runs this file a second time with the
 * board aliased to a copy whose summer restore is switched off
 * (SIM_CONTROL=noresume), and the resume tests must then fail.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import { answerSummerCard, dealSummer, startSummer, summerCardAt } from '@/lib/usCareerSummer';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';

const SPORTS: [string, () => UsCareerSport][] = [
  ['nfl', () => NFL_CAREER_SPORT], ['nba', () => NBA_CAREER_SPORT],
  ['mlb', () => MLB_CAREER_SPORT], ['nhl', () => NHL_CAREER_SPORT],
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** A career three seasons in, played by the real engine, standing at the end
 *  of its last season with nothing else waiting on the board. */
function playedCareer(sport: UsCareerSport, seed: number): { c: UsCareerCore; tq: number } {
  for (let s = seed; s < seed + 300; s += 1) {
    const rng = mulberry32(s);
    const pos = sport.create.defaultPos;
    const c = sport.startCareer(`Summer ${sport.label} ${s}`, pos, sport.create.archetypes[pos][0], rng, defaultAppearance(), 'now');
    c.summerSalt = 'fixture';
    let tq = sport.rollTeamQuality(null, rng);
    sport.assignRole(c, tq, rng);
    for (let y = 0; y < 3; y += 1) {
      sport.campBattle(c, tq, rng);
      sport.simSeason(c, tq, rng);
      sport.progress(c, rng);
      tq = sport.rollTeamQuality(tq, rng);
    }
    c.pendingRivalryEvent = null;
    c.pendingRivalryChoice = null;
    c.contractYears = Math.max(c.contractYears, 2);
    if (sport.shouldRetire(c) || (c.suspendedSeasons ?? 0) > 0) continue;
    /* The summer must deal at least two cards for the walk to have somewhere to go. */
    const probe = copy(c);
    dealSummer(probe, sport);
    if ((probe.summer?.ids.length ?? 0) < 2) continue;
    return { c, tq };
  }
  throw new Error(`${sport.label}: no fixture career dealt a two card summer in 300 seeds`);
}

const save = (sport: UsCareerSport, c: UsCareerCore, tq: number, phase = 'event') =>
  localStorage.setItem(sport.saveKey, JSON.stringify({ c, phase, teamQuality: tq, coach: null }));
const read = (sport: UsCareerSport) => JSON.parse(localStorage.getItem(sport.saveKey)!);
const mount = (sport: UsCareerSport) => render(<MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter>);
const shownCard = () => document.querySelector('[data-career-event]');
const summerStep = () => document.querySelector('[data-career-summer-step]')?.getAttribute('data-career-summer-step') ?? null;
const option = (i: number) => document.querySelector<HTMLButtonElement>(`[data-career-decision-option="${i}"]`)!;
const receipt = () => document.querySelector('[data-career-decision-outcome]');
const continueReceipt = () => fireEvent.click(document.querySelector<HTMLButtonElement>('[data-decision-continue]')!);

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(1038));
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe.each(SPORTS)('%s summer on the board', (_slug, getSport) => {
  it('a mid-summer save opens on ids[at] and shows its place in the summer', () => {
    const sport = getSport();
    /* A career whose card 2 is still there after card 1 is answered (an
       answer can move the career past it, which the skip test covers). */
    let found: { c: UsCareerCore; tq: number } | null = null;
    for (let seed = 11; seed < 400 && !found; seed += 7) {
      const { c, tq } = playedCareer(sport, seed);
      dealSummer(c, sport);
      answerSummerCard(c, sport, summerCardAt(c, sport, 0)!, 0, mulberry32(5));
      if (c.summer) found = { c, tq };
    }
    expect(found, 'some career keeps its summer open after card 1').not.toBeNull();
    const { c, tq } = found!;
    save(sport, c, tq);
    mount(sport);
    expect(shownCard()?.getAttribute('data-career-event')).toBe(c.summer!.ids[c.summer!.at]);
    expect(summerStep()).toBe(String(c.summer!.at + 1));
    expect(shownCard()?.textContent).toContain(`Offseason, card ${c.summer!.at + 1} of ${c.summer!.ids.length}`);
  });

  it('answering advances, Continue opens the next card, and the last answer rolls team quality once', () => {
    const sport = getSport();
    const { c, tq } = playedCareer(sport, 21);
    dealSummer(c, sport);
    const ids = [...c.summer!.ids];
    save(sport, c, tq);
    mount(sport);
    expect(shownCard()?.getAttribute('data-career-event')).toBe(ids[0]);
    const rolls = vi.spyOn(sport, 'rollTeamQuality');
    for (let i = 0; i < ids.length; i += 1) {
      const atBefore = read(sport).c.summer?.at;
      expect(atBefore, `card ${i + 1} is where the save stands`).toBe(i);
      fireEvent.click(option(0));
      expect(receipt(), `card ${i + 1} shows its receipt`).not.toBeNull();
      const after = read(sport);
      if (i < ids.length - 1) {
        expect(after.phase).toBe('event');
        expect(after.c.summer.at).toBe(i + 1);
        expect(rolls).not.toHaveBeenCalled();
        continueReceipt();
        expect(shownCard()?.getAttribute('data-career-event')).toBe(ids[i + 1]);
      } else {
        expect(after.phase).toBe('season');
        expect(after.c.summer).toBeUndefined();
        expect(rolls).toHaveBeenCalledTimes(1);
        continueReceipt();
        expect(shownCard()).toBeNull();
      }
    }
  });

  it('unmount and mount again return the same card, word for word', () => {
    const sport = getSport();
    const { c, tq } = playedCareer(sport, 31);
    dealSummer(c, sport);
    save(sport, c, tq);
    mount(sport);
    const firstText = shownCard()?.textContent;
    const firstId = shownCard()?.getAttribute('data-career-event');
    cleanup();
    mount(sport);
    expect(shownCard()?.getAttribute('data-career-event')).toBe(firstId);
    expect(shownCard()?.textContent).toBe(firstText);
    fireEvent.click(option(0));
    continueReceipt();
    const secondText = shownCard()?.textContent;
    const secondId = shownCard()?.getAttribute('data-career-event');
    expect(secondId).not.toBe(firstId);
    cleanup();
    mount(sport);
    expect(shownCard()?.getAttribute('data-career-event')).toBe(secondId);
    expect(shownCard()?.textContent).toBe(secondText);
  });

  it('a card the career has moved past is skipped', () => {
    const sport = getSport();
    const { c, tq } = playedCareer(sport, 41);
    dealSummer(c, sport);
    const ids = [...c.summer!.ids];
    c.summer = { year: c.summer!.year, ids: ['card_that_left_the_deck', ids[1]], at: 0 };
    save(sport, c, tq);
    mount(sport);
    expect(shownCard()?.getAttribute('data-career-event')).toBe(ids[1]);
    expect(summerStep()).toBe('2');
  });
});

describe.each(SPORTS)('%s summer saves', (_slug, getSport) => {
  it('a broken summer, ledger or salt is dropped alone, and the next summer starts clean', () => {
    const sport = getSport();
    const { c, tq } = playedCareer(sport, 51);
    const broken = copy(c) as UsCareerCore & Record<string, unknown>;
    broken.summer = { year: 'soon', ids: 7, at: -1 } as unknown as UsCareerCore['summer'];
    broken.eventLastFired = { kept: 2020, dropped: 'yesterday', alsoDropped: null } as unknown as Record<string, number>;
    broken.summerSalt = 42 as unknown as string;
    save(sport, broken, tq, 'event');
    const bytes = localStorage.getItem(sport.saveKey);
    mount(sport);
    expect(shownCard(), 'a broken summer opens on the hub').toBeNull();
    expect(document.body.textContent).toContain(`Play the ${c.year} season`);
    expect(localStorage.getItem(sport.saveKey), 'opening writes nothing').toBe(bytes);
    fireEvent.click([...document.querySelectorAll('button')].find(b => b.textContent?.includes(`Play the ${c.year} season`))!);
    const after = read(sport);
    expect(after.c.name).toBe(c.name);
    expect(after.c.eventLastFired.kept).toBe(2020);
    expect(Object.keys(after.c.eventLastFired)).not.toContain('dropped');
    expect(Object.keys(after.c.eventLastFired)).not.toContain('alsoDropped');
    expect(after.c.summerSalt).toBeUndefined();
    if (after.phase === 'event') expect(after.c.summer.year).toBe(after.c.seasons[after.c.seasons.length - 1].year);
  });

  it('a save from before this round opens on the hub and is not written', () => {
    const sport = getSport();
    const { c, tq } = playedCareer(sport, 61);
    delete c.summerSalt;
    save(sport, c, tq, 'event');
    const bytes = localStorage.getItem(sport.saveKey);
    mount(sport);
    expect(shownCard()).toBeNull();
    expect(document.body.textContent).toContain(`Play the ${c.year} season`);
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
  });

  it('a double tap applies one card', () => {
    const sport = getSport();
    const { c, tq } = playedCareer(sport, 71);
    dealSummer(c, sport);
    save(sport, c, tq);
    const counted = (taps: number) => {
      localStorage.clear();
      save(sport, copy(c), tq);
      let draws = 0;
      const base = mulberry32(99);
      vi.mocked(Math.random).mockImplementation(() => { draws += 1; return base(); });
      mount(sport);
      draws = 0;
      const button = option(0);
      act(() => { for (let t = 0; t < taps; t += 1) button.click(); });
      const result = { draws, save: localStorage.getItem(sport.saveKey) };
      cleanup();
      return result;
    };
    const once = counted(1);
    const twice = counted(2);
    expect(twice.draws).toBe(once.draws);
    expect(twice.save).toBe(once.save);
    expect(JSON.parse(twice.save!).c.summer.at).toBe(1);
  });
});

describe.each(SPORTS)('%s one card knob', (_slug, getSport) => {
  it('deals the old card and writes nothing onto the career', () => {
    const sport = getSport();
    const knob: UsCareerSport = { ...sport, summer: { cards: 1, cooldowns: false, fallbackCooldown: 1 } };
    const { c } = playedCareer(sport, 81);
    const a = copy(c), b = copy(c);
    const viaSummer = startSummer(a, knob, mulberry32(7));
    const direct = sport.drawEvent(b, mulberry32(7));
    expect(viaSummer?.id).toBe(direct.id);
    expect(JSON.stringify(a)).toBe(JSON.stringify(c));
  });
});
