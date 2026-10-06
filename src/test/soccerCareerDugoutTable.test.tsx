/**
 * Round 1029: the dugout's final table on the real page.
 *
 * The manager season names only clubs of his own league now, holds the rest
 * of the league as unnamed positions, and a table with no rival it can name
 * says where he finished instead. These mount the real Soccer Career page on
 * a saved manager career and read what a player sees:
 *   1. an Arsenal season heads its table with the Premier League, and every
 *      row is a Premier League club or "another club", never Boca;
 *   2. a job whose league the game barely knows (RB Salzburg) shows the
 *      sentence, with no table rows;
 *   3. a season saved before this round (no league, no unnamed rows) still
 *      draws its table exactly as it did;
 *   4. (review fix) a verified league whose five kept rows name nobody still
 *      draws the table, as the game knew clubs elsewhere in it;
 *   5. (review fix) a named league whose size is not verified shows the
 *      order only, with no position, points or record.
 * The mocks are careerStory.test.tsx's, so nothing reaches the network.
 */
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

vi.mock('@/lib/completions', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
  getCurrentPlayerName: () => 'Tester',
}));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined, loading: false }),
}));
vi.mock('sonner', () => {
  const toast = Object.assign(() => undefined, { success: () => undefined, error: () => undefined, info: () => undefined, message: () => undefined });
  return { toast, Toaster: () => null };
});
vi.mock('@/integrations/supabase/client', () => {
  const chain = (): unknown => new Proxy(() => undefined, {
    get(_t, prop) {
      if (prop === 'then') {
        return (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null, count: 0 }).then(ok, bad);
      }
      if (typeof prop === 'symbol') return undefined;
      return () => chain();
    },
    apply() { return chain(); },
  });
  const supabase = {
    from: () => chain(),
    rpc: () => chain(),
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      getUser: () => Promise.resolve({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => undefined,
  };
  return { supabase, SUPABASE_URL: 'http://stub', SUPABASE_PUBLISHABLE_KEY: 'stub' };
});
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));

import * as E from '@/lib/soccerCareerEngine';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { finishZone } from '@/lib/soccerCareerLeague';
import SoccerCareer from '@/pages/SoccerCareer';

const SAVE_KEY = 'soccerCareerSave';
const clubs = E.FALLBACK_CLUBS;
const leagueOf = new Map(clubs.map(c => [c.name, c.league]));

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const tick = (ms = 5) => act(async () => { await new Promise(r => setTimeout(r, ms)); });
const mount = (el: JSX.Element) => render(<HelmetProvider><MemoryRouter>{el}</MemoryRouter></HelmetProvider>);

/** A retired pro in the dugout at `club`, one season played. A career of the
 *  current era, so the dugout plays seasons after the list's own (2026-27);
 *  `startYear` 1990 puts the dugout in the past. */
function dugout(club: string, tier: number, league?: string, startYear = 2025): CareerState {
  const real = Math.random;
  Math.random = seeded(1029);
  try {
    const st = { pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80, reflexes: 80 };
    let s = E.initCareer('Gaffer', 'England', 'ST', startYear === 1990 ? '1990-94' : '2025', st, 80, startYear, clubs, null, 88);
    while (s.phase === 'youth') s = E.advanceYouthYear(s, clubs);
    s = E.acceptOffer(s, { club: clubs.find(c => c.tier === 2) ?? clubs[0], contractYears: 3, wage: 90000, transferFee: 0 });
    s = E.choosePostRetirement({ ...s, retired: true, phase: 'post_retirement' }, 'manager', clubs);
    s = { ...s, managerState: { ...s.managerState!, club, clubTier: tier, league } };
    return E.advanceManagerSeason(s, clubs);
  } finally {
    Math.random = real;
  }
}

/** The final table block as the player sees it. */
async function finalTable(s: CareerState) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  const v = mount(<SoccerCareer />);
  await tick(60);
  const label = Array.from(v.container.querySelectorAll('span')).find(n => n.textContent?.startsWith('Final table'));
  const box = label?.closest('div')?.parentElement ?? null;
  const rows = box ? Array.from(box.querySelectorAll('.cm-tick-in span.truncate')).map(n => n.textContent ?? '') : [];
  return { label: label?.textContent ?? null, rows, text: box?.textContent ?? '' };
}

describe('Soccer Career: the dugout table is his own league (Round 1029)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());
  afterAll(() => localStorage.clear());

  it('an Arsenal season names Premier League clubs and nobody from abroad', async () => {
    const s = dugout('Arsenal', 1);
    const t = await finalTable(s);
    expect(t.label).toBe('Final table · Premier League');
    expect(t.rows.length).toBe(5);
    for (const name of t.rows) {
      if (name === 'another club') continue;
      expect(leagueOf.get(name), name).toBe('Premier League');
    }
    expect(t.rows).toContain('Arsenal');
    expect(t.text.split('Cup run')[0]).not.toMatch(/Boca|Flamengo/);
  });

  it('a league the game barely knows says where he finished instead of drawing rows', async () => {
    const s = dugout('RB Salzburg', 3, 'Austrian Bundesliga');
    const row = s.managerState!.seasonResults[s.managerState!.seasonResults.length - 1];
    const t = await finalTable(s);
    expect(t.label).toBe('Final table · Austrian Bundesliga');
    expect(t.rows).toEqual([]);
    expect(t.text).toContain("We don't know enough Austrian Bundesliga clubs by name to draw the table.");
    /* the Austrian Bundesliga's size is not verified, so no position at all */
    expect(t.text).toContain(`You finished ${finishZone(row.playerPos!, row.leagueSize!)}.`);
    expect(t.text.split('Cup run')[0]).not.toMatch(/\d(st|nd|rd|th)\b| points|\d+W \d+D/);
  });

  it('a verified league whose five rows happen to name nobody still draws its table', async () => {
    const s = dugout('Bayern Munich', 1);
    const ms = s.managerState!;
    const last = ms.seasonResults[ms.seasonResults.length - 1];
    const blank = (pos: number, pts: number) => ({ club: '', pts, pos, unnamed: true });
    const row = { ...last, league: 'Bundesliga', sizeVerified: true, leagueSize: 18, knownRivals: 7, playerPos: 9, playerPts: 50,
      table: [blank(1, 80), blank(2, 75), blank(3, 70), blank(4, 66), { club: 'Bayern Munich', pts: 50, pos: 9, you: true }] };
    const t = await finalTable({ ...s, managerState: { ...ms, seasonResults: [...ms.seasonResults.slice(0, -1), row] } });
    expect(t.text).not.toContain("We don't know enough");
    expect(t.rows).toEqual(['another club', 'another club', 'another club', 'another club', 'Bayern Munich']);
  });

  it('a named league of unknown size shows the order only, never a place or a points total', async () => {
    const s = dugout('Atlanta United', 3);
    const last = s.managerState!.seasonResults[s.managerState!.seasonResults.length - 1];
    expect(last.league).toBe('MLS');
    expect(last.sizeVerified).toBeFalsy();
    expect(last.knownRivals).toBeGreaterThan(0);
    const t = await finalTable(s);
    expect(t.label).toBe('Final table · MLS');
    expect(t.rows.length).toBe(5);
    expect(t.text).toContain("The order only: we don't know how many clubs the MLS has.");
    expect(t.text.split('Cup run')[0]).not.toMatch(/\d+ pts|\d+W \d+D/);
    expect(last.result).not.toMatch(/\d(st|nd|rd|th)\b|points/);
  });

  it('a season saved before this round still draws its table', async () => {
    const s = dugout('Arsenal', 1);
    const ms = s.managerState!;
    const last = ms.seasonResults[ms.seasonResults.length - 1];
    const old = { year: last.year, club: 'Arsenal', tier: 1, result: 'Finished 2nd of 20 on 80 points.', trophy: false,
      table: [{ club: 'Boca Juniors', pts: 84, pos: 1 }, { club: 'Arsenal', pts: 80, pos: 2, you: true },
        { club: 'Ajax', pts: 75, pos: 3 }, { club: 'Flamengo', pts: 70, pos: 4 }, { club: 'Bayern Munich', pts: 66, pos: 5 }],
      playerPos: 2, playerPts: 80, leagueSize: 20, record: '25W 5D 8L', cup: 'out in the 4th round' };
    const t = await finalTable({ ...s, managerState: { ...ms, league: undefined, seasonResults: [old] } });
    expect(t.label).toBe('Final table');
    expect(t.rows).toEqual(['Boca Juniors', 'Arsenal', 'Ajax', 'Flamengo', 'Bayern Munich']);
  });

  it('a season before the list\'s own names nobody and no league, and says why', async () => {
    const s = dugout('Arsenal', 1, undefined, 1990);
    const last = s.managerState!.seasonResults[s.managerState!.seasonResults.length - 1];
    expect(s.seasons[s.seasons.length - 1].year).toBeLessThan(2025);
    expect(last.league).toBe('Premier League');
    expect(last.lineupUnknown).toBe(true);
    expect(last.knownRivals).toBe(0);
    expect(last.table!.filter(r => !r.you).every(r => r.unnamed && !r.club)).toBe(true);
    const t = await finalTable(s);
    /* the game holds today's label for Arsenal, not the league of that year */
    expect(t.label).toBe('Final table');
    expect(t.rows).toEqual([]);
    expect(t.text).toContain("We don't know who was in the league that year, so the rest of the field is counted, not named.");
    expect(t.text).not.toContain("We don't know enough");
    expect(`${t.text} ${last.result}`).not.toMatch(/Premier League|Championship/);
  });
});
