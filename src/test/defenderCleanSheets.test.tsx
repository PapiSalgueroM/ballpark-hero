/* Round 784: a defender's clean sheets reach the career totals and the
   Career Stats tile, not only the season rows.

   A player reported on 2026-09-23 that clean sheets "get stuck at zero for the
   entire career even as a defender". Round 667 widened the season draw to the
   back line and scripts/simCareerCleanSheets.mjs holds the season rows, but
   nothing checked the two places the player actually reads: the career totals
   and the Career Stats tile on the main career screen. This plays seeded
   careers as a CB, an LB and an RB through the real engine, then mounts the
   real page on that save and reads the tile.

   On the pre 667 engine (the pro gate back on the keeper alone) every case
   below fails: the totals are 0 and the tile prints 0. */
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

import * as E from '@/lib/soccerCareerEngine';
import type { CareerState } from '@/lib/soccerCareerEngine';
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

/** One seeded career in `position`, played until `proSeasons` pro seasons are on
    the record and the career is back on the main screen. */
function playSeasons(position: string, seed: number, proSeasons: number): CareerState {
  const realRandom = Math.random;
  Math.random = seeded(seed);
  try {
    const clubs = E.FALLBACK_CLUBS;
    const st = (o: number) => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
    let s = E.initCareer('Test Defender', 'England', position, '2020s', st(72), 72, 2020, clubs, null, 85);
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

/** The number the Career Stats tile prints over `label`, or null when the tile has no such cell. */
function careerStatsCell(root: HTMLElement, label: string): number | null {
  const heading = Array.from(root.querySelectorAll('span')).find(el => (el.textContent ?? '').trim() === 'Career Stats');
  const tile = heading?.parentElement;
  if (!tile) return null;
  const labelEl = Array.from(tile.querySelectorAll('div')).find(el => el.children.length === 0 && (el.textContent ?? '').trim() === label);
  const value = labelEl?.previousElementSibling?.textContent;
  return value == null ? null : Number(value.trim());
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

const SEASONS = 5;

describe('a defender keeps clean sheets in his career totals and on the Career Stats tile', () => {
  for (const [position, seed] of [['CB', 784], ['LB', 785], ['RB', 786]] as const) {
    it(`${position}: ${SEASONS} seeded pro seasons add up to clean sheets, and the tile prints the same number`, async () => {
      const career = playSeasons(position, seed, SEASONS);
      const pro = career.seasons.filter(r => r.type !== 'youth');
      const totals = E.getCareerTotals(career.seasons);
      const summed = career.seasons.reduce((n, r) => n + (r.cleanSheets || 0), 0);
      const apps = pro.reduce((n, r) => n + (r.apps || 0), 0);
      console.log(`${position}: ${pro.length} pro seasons, ${apps} apps, ${totals.cleanSheets} clean sheets (${pro.map(r => r.cleanSheets).join(', ')})`);

      expect(totals.cleanSheets).toBe(summed);
      expect(totals.cleanSheets).toBeGreaterThan(0);
      /* Not one lucky season: at least two of the pro seasons with games in them kept a clean sheet. */
      expect(pro.filter(r => (r.cleanSheets || 0) > 0).length).toBeGreaterThanOrEqual(2);

      localStorage.setItem('soccerCareerSave', JSON.stringify(career));
      const view = render(<HelmetProvider><MemoryRouter><SoccerCareer /></MemoryRouter></HelmetProvider>);
      await act(async () => { await new Promise(r => setTimeout(r, 100)); });
      const shown = careerStatsCell(view.container, 'Clean Sheets');
      expect(shown, 'the Career Stats tile has no Clean Sheets cell for a defender').not.toBeNull();
      expect(shown).toBe(totals.cleanSheets);
      view.unmount();
    });
  }
});
