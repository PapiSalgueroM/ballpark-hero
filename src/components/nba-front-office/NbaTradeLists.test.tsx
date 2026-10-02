/**
 * Round 851 (QA847-08): the NBA trade screens used to show only the top eight
 * of a thirteen man roster, in all three lists (the Trade Finder, the manual
 * "You send" column and the partner's "You get" column). This test renders the
 * real board over a saved league and proves:
 *   1. every list carries every man on the roster, in rating order;
 *   2. a deal built around the ninth to thirteenth man goes through the
 *      engine's own evaluation (findTrades for the Trade Finder, openTalks for
 *      the phone call), not a shortcut, and nothing is accepted on its own.
 * Control: put the old `.slice(0, 8)` back on any of the three lists and the
 * count check for that list goes red.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { initNbaLeague } from '@/lib/nbaFrontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));
/* the engine's own evaluators, wrapped so the test can see who they were asked about */
vi.mock('@/lib/tradeFinder', async (orig) => {
  const real = await orig<typeof import('@/lib/tradeFinder')>();
  return { ...real, findTrades: vi.fn(real.findTrades) };
});
vi.mock('@/lib/foTradeTalks', async (orig) => {
  const real = await orig<typeof import('@/lib/foTradeTalks')>();
  return { ...real, openTalks: vi.fn(real.openTalks) };
});

import { findTrades } from '@/lib/tradeFinder';
import { openTalks } from '@/lib/foTradeTalks';
import NbaFrontOfficeBoard from '@/components/nba-front-office/NbaFrontOfficeBoard';

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const SAVE_KEY = 'nba-front-office-save-v1';
const byOvr = (ps: any[]) => [...ps].sort((a, b) => b.ovr - a.ovr);
const list = (attr: string) => document.querySelector(`[${attr}]`) as HTMLElement;
const names = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('button')).map(b => b.textContent ?? '').filter(t => /\(.+\)/.test(t));

describe('NBA Front Office: every man on the roster can be traded', () => {
  let restore: (() => void) | null = null;
  beforeEach(() => {
    localStorage.clear();
    const spy = vi.spyOn(Math, 'random').mockImplementation(lehmer(11));
    restore = () => spy.mockRestore();
    vi.mocked(findTrades).mockClear();
    vi.mocked(openTalks).mockClear();
  });
  afterEach(() => { cleanup(); restore?.(); });

  const setup = () => {
    const league = initNbaLeague(lehmer(7));
    const abbrs = Object.keys(league.teams);
    const [team, partner] = abbrs;
    /* A fresh league deals ten a side; the audit's clubs carried thirteen by
       the time it looked. Sign three men from the pool onto each side so both
       rosters are thirteen deep, the shape a live save reaches. */
    for (const a of [team, partner]) {
      while (league.teams[a].players.length < 13) league.teams[a].players.push(league.freeAgents.shift()!);
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 }));
    render(<NbaFrontOfficeBoard />);
    fireEvent.click(screen.getByText('Trades'));
    return { league, team, partner, mine: byOvr(league.teams[team].players), theirs: byOvr(league.teams[partner].players) };
  };

  it('the Trade Finder, the send list and the partner list each show the whole roster', () => {
    const { mine, theirs, partner } = setup();
    expect(mine.length).toBeGreaterThanOrEqual(13);
    expect(names(list('data-trade-shop-list'))).toEqual(mine.map(p => `${p.name} (${p.pos})${p.ovr}`));
    fireEvent.click(screen.getAllByText(partner).find(el => el.tagName === 'BUTTON')!);
    expect(names(list('data-trade-send-list'))).toEqual(mine.map(p => `${p.name} (${p.pos})${p.ovr}`));
    const getRows = list('data-trade-get-list').querySelectorAll('[data-trade-row]');
    expect(Array.from(getRows).map(r => r.getAttribute('data-trade-row'))).toEqual(theirs.map(p => p.id));
  });

  it('the lists scroll inside their card instead of stretching the page', () => {
    const { partner } = setup();
    expect(list('data-trade-shop-list').className).toMatch(/max-h-\S+ .*overflow-y-auto|overflow-y-auto.*max-h-/);
    fireEvent.click(screen.getAllByText(partner).find(el => el.tagName === 'BUTTON')!);
    for (const a of ['data-trade-send-list', 'data-trade-get-list']) {
      expect(list(a).className).toContain('overflow-y-auto');
      expect(list(a).className).toMatch(/max-h-/);
    }
  });

  it('shopping the 13th man asks the real trade finder about him', () => {
    const { mine } = setup();
    const last = mine[mine.length - 1];
    const shop = list('data-trade-shop-list');
    fireEvent.click(within(shop).getByText(`${last.name} (${last.pos})`));
    fireEvent.click(screen.getByText('Shop him around the league'));
    expect(vi.mocked(findTrades)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(findTrades).mock.calls[0][2]).toBe(last.id);
  });

  it('a call built on the 9th to 13th men goes through the same talks engine and accepts nothing by itself', () => {
    const { mine, theirs, partner } = setup();
    fireEvent.click(screen.getAllByText(partner).find(el => el.tagName === 'BUTTON')!);
    const send = list('data-trade-send-list');
    const piece = mine[mine.length - 1];
    fireEvent.click(within(send).getByText(`${piece.name} (${piece.pos})`));
    /* the deepest man on their list who is open for talks */
    const want = [...theirs.slice(8)].reverse().find(p => {
      const row = document.querySelector(`[data-trade-row="${p.id}"]`) as HTMLElement;
      return !(within(row).getByText('Open talks') as HTMLButtonElement).disabled;
    })!;
    expect(want, 'no man from 9 to 13 on their list is open for talks').toBeTruthy();
    const before = localStorage.getItem(SAVE_KEY);
    fireEvent.click(within(document.querySelector(`[data-trade-row="${want.id}"]`) as HTMLElement).getByText('Open talks'));
    expect(vi.mocked(openTalks)).toHaveBeenCalledTimes(1);
    const args = vi.mocked(openTalks).mock.calls[0][0] as any;
    expect(args.mine.id).toBe(piece.id);
    expect(args.want.id).toBe(want.id);
    const card = document.querySelector('[data-trade-talks]') as HTMLElement;
    expect(within(card).getByText(piece.name)).toBeTruthy();
    /* talks are open, nothing has moved: the save is untouched */
    expect(localStorage.getItem(SAVE_KEY)).toBe(before);
  });
});
