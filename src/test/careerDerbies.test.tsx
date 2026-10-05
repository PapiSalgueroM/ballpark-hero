/**
 * Round 1012: club derbies on the real Soccer Career page.
 *
 * The engine and the rules are measured in scripts/simCareerDerbies.mjs; this
 * file mounts the real page on a real save and checks what a player sees:
 *   1. A season that played a derby: the summary card lists it, the timeline
 *      carries the W-D-L chip, and the Career Stats card the career line.
 *   2. The same save with every derby stripped, which is what a save from
 *      before this round looks like: none of it shows, and no Derby Hero.
 * Mocks as in careerStory.test.tsx: nothing here reaches the network.
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
vi.mock('@/components/game/PostGameStats', () => ({ default: () => null }));

import * as E from '@/lib/soccerCareerEngine';
import type { CareerState } from '@/lib/soccerCareerEngine';
import SoccerCareer from '@/pages/SoccerCareer';
import { readSeasonDerbies, derbyRecord } from '@/lib/soccerCareerDerby';

/* eslint-disable @typescript-eslint/no-explicit-any */
const SAVE_KEY = 'soccerCareerSave';
const clubs = E.FALLBACK_CLUBS;

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

/* One answer per screen, careerStory.test.tsx's walk. */
function step(s: CareerState): CareerState {
  switch (s.phase) {
    case 'youth': return E.advanceYouthYear(s, clubs);
    case 'playing': return E.advanceProSeason(s, clubs);
    case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? E.acceptOffer(s, o[0]) : { ...s, phase: 'playing' }; }
    case 'rehab_choice': return E.applyRehabChoice(s, 1);
    case 'newspaper': return E.dismissNewspaper(s);
    case 'season_summary': return E.dismissSummary(s, clubs);
    case 'random_events': return s.pendingEvents?.[0] ? E.applyEventChoice(s, 0, clubs) : { ...s, pendingEvents: [], phase: 'playing' };
    case 'moral_dilemma': return s.pendingMoralDilemma ? E.applyMoralDilemmaChoice(s, 1) : E.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return E.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return E.dismissAppealResult(s, clubs);
    case 'international_debut': return E.dismissDebut(s, clubs);
    case 'world_cup': return E.dismissWorldCup(s, clubs);
    case 'rivalry_event': return E.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return E.dismissBallonDor(s, clubs);
    case 'transfer_window': return (s.transferSituation as any)?.type === 'contract_expiry' ? E.signExtension(s) : E.stayAtClub(s);
    case 'retirement_suggestion': return E.declineRetirementSuggestion(s, clubs);
    default: throw new Error(`no move for ${s.phase}`);
  }
}

/* An English career at a Premier League club, walked until a season summary
   shows a derby he played in. Seeded, so it is the same save every run. */
function derbySummarySave(): CareerState {
  for (let seed = 1012; seed < 1062; seed++) {
    Math.random = seeded(seed);
    const st = { pace: 72, shooting: 72, passing: 72, dribbling: 72, defending: 72, physical: 72, reflexes: 72 };
    let s = E.initCareer(`Derby ${seed}`, 'England', 'ST', '2020s', st, 72, 2020, clubs, null, 88);
    for (let guard = 0; guard < 400 && !s.retired; guard++) {
      if (s.phase === 'season_summary' && s.pendingSummary && derbyRecord(readSeasonDerbies(s.pendingSummary)).played > 0) return s;
      s = step(s);
    }
  }
  throw new Error('no seed reached a derby season summary');
}
const strip = (s: CareerState): CareerState => JSON.parse(JSON.stringify(s, (k, v) => (k === 'derbies' ? undefined : v)));

const realRandom = Math.random;
beforeEach(() => {
  localStorage.clear();
  try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* jsdom */ }
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
afterEach(() => { cleanup(); vi.unstubAllGlobals(); Math.random = realRandom; });
afterAll(async () => { await new Promise(r => setTimeout(r, 1500)); });

describe('Soccer Career: derbies on the real page', () => {
  it('a derby season shows in the summary, the timeline and the career stats', async () => {
    const s = derbySummarySave();
    Math.random = realRandom;
    const ds = readSeasonDerbies(s.pendingSummary);
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    const v = mount(<SoccerCareer />);
    await tick(60);
    const lines = v.container.querySelector('[data-season-derbies]');
    expect(lines, 'the summary card lists the derbies').not.toBeNull();
    expect(lines!.textContent).toContain(ds[0].rival);
    expect(lines!.textContent).toContain('\u{1F525}');
    const r = derbyRecord(ds);
    const chips = Array.from(v.container.querySelectorAll('[data-derby-chip]')).map(c => c.getAttribute('data-derby-chip'));
    expect(chips, 'the timeline carries the latest season\'s chip').toContain(`${r.w}-${r.d}-${r.l}`);
    expect(v.container.querySelector('[data-career-derbies]')?.textContent ?? '').toContain('Derbies:');
  }, 120_000);

  it('a save from before the round shows no derby at all', async () => {
    const s = strip(derbySummarySave());
    Math.random = realRandom;
    expect(s.seasons.some(x => 'derbies' in x)).toBe(false);
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    const v = mount(<SoccerCareer />);
    await tick(60);
    expect(v.container.querySelector('[data-season-derbies]')).toBeNull();
    expect(v.container.querySelector('[data-derby-chip]')).toBeNull();
    expect(v.container.querySelector('[data-career-derbies]')).toBeNull();
    expect(v.container.textContent ?? '').not.toContain('Derby Hero');
    expect(v.container.textContent ?? '').not.toContain('Derbies:');
  }, 120_000);
});
