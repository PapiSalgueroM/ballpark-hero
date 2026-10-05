/* Round 1011: every season's rating in the Soccer Career history.

   Mounts the real page on a CB save played through the real engine and on an
   old save (the overall stripped from its first seasons, plus a back line row
   from before Round 667 with no clean sheets drawn), and reads what a player
   sees: the rating chip and the OVR on each timeline row, the Ratings dialog
   with its dashes and its caption, and the season summary of a banned year,
   which used to print "Avg Rating: 0.0".

   Negative proof, run by hand on 2026-10-05: with `ovr: overall,` taken out of
   generateSeasonStats the OVR assertions below fail (see the round report). */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

import { fireEvent } from '@testing-library/react';
import * as E from '@/lib/soccerCareerEngine';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import SoccerCareer from '@/pages/SoccerCareer';

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** defenderCleanSheets' driver: a seeded career played until `proSeasons` pro
    seasons are on the record and it is back on the main screen. */
function playSeasons(position: string, seed: number, proSeasons: number): CareerState {
  const realRandom = Math.random;
  Math.random = seeded(seed);
  try {
    const clubs = E.FALLBACK_CLUBS;
    const st = (o: number) => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
    let s = E.initCareer('Test Rater', 'England', position, '2020s', st(72), 72, 2020, clubs, null, 85);
    const pro = () => s.seasons.filter(r => r.type !== 'youth').length;
    for (let guard = 0; guard < 400 && !(s.phase === 'playing' && pro() >= proSeasons); guard++) {
      switch (s.phase) {
        case 'youth': s = E.advanceYouthYear(s, clubs); break;
        case 'contract_offer': { const o = s.pendingOffers || []; s = o.length ? E.acceptOffer(s, o[0]) : { ...s, phase: 'playing' }; break; }
        case 'playing': s = E.advanceProSeason(s, clubs); break;
        case 'rehab_choice': s = E.applyRehabChoice(s, 1); break;
        case 'newspaper': s = E.dismissNewspaper(s); break;
        case 'season_summary': s = E.dismissSummary(s, clubs); break;
        case 'random_events': s = (s.pendingEvents && s.pendingEvents[0]) ? E.applyEventChoice(s, 0, clubs) : { ...s, pendingEvents: [], phase: 'playing' }; break;
        case 'moral_dilemma': s = E.dismissMoralDilemma(s, clubs); break;
        case 'social_media_action': s = E.dismissSocialMediaPhase(s, clubs); break;
        case 'red_card_appeal_result': s = E.dismissAppealResult(s, clubs); break;
        case 'international_debut': s = E.dismissDebut(s, clubs); break;
        case 'world_cup': s = E.dismissWorldCup(s, clubs); break;
        case 'rivalry_event': s = E.dismissRivalryEvent(s, clubs); break;
        case 'ballon_dor': s = E.dismissBallonDor(s, clubs); break;
        case 'transfer_window': s = E.stayAtClub(s); break;
        default: throw new Error(`the test driver has no move for phase ${s.phase}`);
      }
    }
    if (s.phase !== 'playing' || pro() < proSeasons) throw new Error(`the career never reached ${proSeasons} pro seasons on the main screen (phase ${s.phase}, ${pro()} pro seasons)`);
    return s;
  } finally {
    Math.random = realRandom;
  }
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  if (!('IntersectionObserver' in window)) {
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } });
  }
  if (!('ResizeObserver' in window)) {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  }
  window.scrollTo = (() => undefined) as typeof window.scrollTo;
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function mount(save: CareerState) {
  localStorage.setItem('soccerCareerSave', JSON.stringify(save));
  const view = render(<HelmetProvider><MemoryRouter><SoccerCareer /></MemoryRouter></HelmetProvider>);
  await act(async () => { await new Promise(r => setTimeout(r, 100)); });
  return view;
}
const playedRows = (c: CareerState) => c.seasons.filter(r => r.type === 'playing' && r.apps > 0);
const texts = (root: ParentNode, sel: string) => Array.from(root.querySelectorAll(sel)).map(el => (el.textContent ?? '').trim());

describe('Soccer Career shows every season\'s rating in the history', () => {
  it('a CB timeline row carries the stored rating, the overall it was played at and clean sheets', async () => {
    const career = playSeasons('CB', 1011, 5);
    const played = playedRows(career);
    expect(played.length).toBeGreaterThanOrEqual(4);
    const view = await mount(career);
    expect(texts(view.container, '[data-season-rating]')).toEqual(played.map(r => r.rating.toFixed(1)));
    const ovrs = Array.from(view.container.querySelectorAll('[data-season-ovr]')).map(el => Number(el.getAttribute('data-season-ovr')));
    /* every season played on this engine is stamped, with the overall it was played at */
    expect(ovrs).toEqual(played.map(r => r.ovr));
    expect(ovrs.every(n => Number.isInteger(n) && n >= 1 && n <= 99)).toBe(true);
    for (const r of played) expect(view.container.textContent).toContain(`${r.apps}A · ${r.cleanSheets}CS · ${r.goals}G`);
    view.unmount();
  });

  it('an old save shows real ratings, a dash for the overall it never kept, and a blank for clean sheets never drawn', async () => {
    const career = playSeasons('CB', 1012, 6);
    const played = playedRows(career);
    expect(played.length).toBeGreaterThanOrEqual(5);
    const OLD = 3;
    const oldYears = new Set(played.slice(0, OLD).map(r => r.year));
    const firstOld = played[0].year;
    /* the first three played seasons as a save from before Round 1011 left
       them, and the very first as one from before Round 667 (no clean sheets drawn) */
    const seasons: SeasonRecord[] = career.seasons.map(r => {
      if (r.type !== 'playing' || !oldYears.has(r.year)) return r;
      const { ovr: _drop, ...rest } = r;
      return r.year === firstOld ? { ...rest, cleanSheets: 0 } : rest;
    });
    const save = { ...career, seasons };
    const view = await mount(save);
    expect(view.container.querySelectorAll('[data-season-rating]').length).toBe(played.length);
    expect(view.container.querySelectorAll('[data-season-ovr]').length).toBe(played.length - OLD);
    expect(view.container.querySelector('[aria-label="Clean sheets not recorded"]')).not.toBeNull();

    const open = view.container.querySelector('[data-open-season-ratings]');
    expect(open, 'no Ratings button beside Career Story').not.toBeNull();
    await act(async () => { fireEvent.click(open as Element); });
    const dialog = view.container.querySelector('[data-season-ratings="dialog"]');
    expect(dialog, 'the Ratings dialog did not open').not.toBeNull();
    const rows = Array.from((dialog as Element).querySelectorAll('[data-season-ratings-row]'));
    const playingRows = seasons.filter(r => r.type === 'playing');
    expect(rows.length).toBe(playingRows.length);
    rows.forEach((tr, i) => {
      const raw = playingRows[i];
      const ovrCell = tr.querySelector('[data-ratings-ovr]') as Element;
      const ratingCell = tr.querySelector('[data-ratings-rating]') as Element;
      if (raw.apps > 0) expect(ratingCell.textContent).toBe(raw.rating.toFixed(1));
      if (oldYears.has(raw.year)) {
        expect(ovrCell.textContent).toBe('-');
        expect(ovrCell.querySelector('[aria-label="not recorded"]')).not.toBeNull();
      } else if (raw.apps > 0) {
        expect(ovrCell.textContent).toBe(String(raw.ovr));
      }
      const cs = tr.querySelector('[data-ratings-stat="Clean sheets"]') as Element;
      if (raw.year === firstOld) expect(cs.textContent).toBe('-');
      else if (raw.apps > 0 || raw.ovr) expect(cs.textContent).toBe(String(raw.cleanSheets));
    });
    const caption = (dialog as Element).querySelector('[data-ovr-tracked-from]');
    expect(caption?.getAttribute('data-ovr-tracked-from')).toBe(String(played[OLD].year));
    expect(caption?.textContent).toContain(String(played[OLD].year));
    expect((dialog as Element).textContent).not.toContain('0.0');
    view.unmount();
  });

  it('a banned season summary says there is no rating instead of 0.0, and a played one shows the overall', async () => {
    const career = playSeasons('ST', 1013, 3);
    const last = career.seasons[career.seasons.length - 1];
    const banned: SeasonRecord = {
      year: last.year + 1, age: career.age, club: 'BANNED', clubCountry: '', clubTier: 99,
      apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, rating: 0,
      leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, type: 'playing',
      intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null,
    };
    let view = await mount({ ...career, seasons: [...career.seasons, banned], phase: 'season_summary', pendingSummary: banned });
    const line = view.container.querySelector('[data-summary-rating]');
    expect(line, 'the season summary did not render').not.toBeNull();
    expect((line as Element).textContent).toContain('Avg Rating: -');
    expect((line as Element).textContent).not.toContain('0.0');
    expect(view.container.querySelector('[data-summary-ovr]')).toBeNull();
    view.unmount();
    cleanup();

    const lastPlayed = playedRows(career).slice(-1)[0];
    view = await mount({ ...career, phase: 'season_summary', pendingSummary: lastPlayed });
    const shown = view.container.querySelector('[data-summary-rating]');
    expect(shown?.textContent).toContain(`Avg Rating: ${lastPlayed.rating.toFixed(1)}`);
    expect(view.container.querySelector('[data-summary-ovr]')?.textContent).toContain(`Played at OVR ${lastPlayed.ovr}`);
    view.unmount();
  });
});
