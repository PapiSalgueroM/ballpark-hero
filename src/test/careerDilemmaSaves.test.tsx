/**
 * Round 819 review: the saves a Soccer Career page can be sitting on when the
 * dilemmas start reaching players, loaded and played on through the page.
 *
 *   1. A save from before the round on the social media screen, mid close:
 *      it posts, presses Continue and carries on into the next season.
 *   2. A save waiting on a dilemma: the card is drawn, the choice lands, the
 *      decided card says what happened, and Continue keeps it.
 *   3. A save on a dilemma that was already decided, reloaded between the
 *      choice and Continue. Before Round 819 the card waited on a local
 *      "chosen" flag and drew nothing at all here, so the career could not
 *      move. scripts/simCareerDilemmaReach.mjs runs this file and its
 *      chosenflag control puts that card back to prove this case goes red.
 *   4. A match fixing ban: the banned season closes through the page with no
 *      appearances, and the season after it is played.
 */
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
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

/* eslint-disable @typescript-eslint/no-explicit-any */
const SAVE_KEY = 'soccerCareerSave';

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
const readSave = (): CareerState => JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');

/* A career played by the engine to the first fresh social media screen at
   21 or older (or to the first season start there, for the ban case), the
   way the page would have answered every screen before it. */
function playTo(seed: number, stop: (s: CareerState) => boolean): CareerState {
  const clubs = E.FALLBACK_CLUBS;
  const o = 70;
  const st = { pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o };
  let s = E.initCareer(`Saves ${seed}`, 'England', 'CM', '2020s', st, o, 2020, clubs, null, 88);
  for (let guard = 0; guard < 800; guard++) {
    if (stop(s)) return s;
    if (s.retired) break;
    switch (s.phase) {
      case 'youth': s = E.advanceYouthYear(s, clubs); break;
      case 'playing': s = E.advanceProSeason(s, clubs); break;
      case 'contract_offer': { const offers = s.pendingOffers || []; s = offers.length ? E.acceptOffer(s, offers[0]) : { ...s, phase: 'playing' }; break; }
      case 'rehab_choice': s = E.applyRehabChoice(s, 1); break;
      case 'newspaper': s = E.dismissNewspaper(s); break;
      case 'season_summary': s = E.dismissSummary(s, clubs); break;
      case 'random_events': s = s.pendingEvents?.[0] ? E.applyEventChoice(s, 0, clubs) : { ...s, pendingEvents: [], phase: 'playing' }; break;
      case 'moral_dilemma': s = s.pendingMoralDilemma ? E.applyMoralDilemmaChoice(s, 1) : E.dismissMoralDilemma(s, clubs); break;
      case 'social_media_action':
        if (!s.socialMediaActionUsedThisSeason) s = E.applySocialMediaAction(s, 'training_video');
        else if (s.pendingCoverAthleteEvent) s = E.handleCoverAthleteDecision(s, false);
        else s = E.dismissSocialMediaPhase(s, clubs);
        break;
      case 'red_card_appeal_result': s = E.dismissAppealResult(s, clubs); break;
      case 'international_debut': s = E.dismissDebut(s, clubs); break;
      case 'world_cup': s = E.dismissWorldCup(s, clubs); break;
      case 'rivalry_event': s = E.dismissRivalryEvent(s, clubs); break;
      case 'ballon_dor': s = E.dismissBallonDor(s, clubs); break;
      case 'transfer_window': s = (s.transferSituation as any)?.type === 'contract_expiry' ? E.signExtension(s) : E.stayAtClub(s); break;
      case 'retirement_suggestion': s = E.declineRetirementSuggestion(s); break;
      default: throw new Error(`no move for ${s.phase}`);
    }
  }
  throw new Error('the career never reached the save this test needs');
}
const freshSocial = (s: CareerState) => s.phase === 'social_media_action' && !s.socialMediaActionUsedThisSeason && s.age >= 21;
const seasonStart = (s: CareerState) => s.phase === 'playing' && s.age >= 22;

/* Same walker as careerDilemmaReach.test.tsx: the action bar on a season
   start, the first choice on a dilemma card, otherwise the screen's own
   buttons by preference, else its last one. */
const PREFER = ['← Back', '💪 Not Done Yet', 'Stay', 'Sign', 'Continue', 'Next', 'Accept', 'Confirm', 'Done', 'Close'];
const screenCard = (root: HTMLElement) => root.querySelector('div.space-y-3.order-1')?.firstElementChild?.firstElementChild as HTMLElement | null;
const dilemmaCard = (root: HTMLElement) => {
  const tag = Array.from(root.querySelectorAll('span')).find(s => (s.textContent ?? '').includes('MORAL DILEMMA'));
  return tag ? tag.closest('div.rounded-xl') as HTMLElement | null : null;
};
const decidedCard = (root: HTMLElement) => {
  const h = Array.from(root.querySelectorAll('h3')).find(x => (x.textContent ?? '').trim() === 'Decision Made');
  return h ? h.closest('div.rounded-xl') as HTMLElement | null : null;
};
async function press(el: HTMLElement) { await act(async () => { fireEvent.click(el); }); await tick(); }
async function stepOnce(root: HTMLElement): Promise<string> {
  const s = readSave();
  let target: HTMLButtonElement | undefined;
  if (s.phase === 'playing' || s.phase === 'youth') {
    target = root.querySelector('[data-career-action-bar] button') as HTMLButtonElement | undefined;
  } else {
    const card = dilemmaCard(root);
    const choices = card ? Array.from(card.querySelectorAll('button')) : [];
    if (choices.length > 0) target = choices[0] as HTMLButtonElement;
    else {
      const area = screenCard(root);
      const usable = area ? Array.from(area.querySelectorAll('button')).filter(b => !b.disabled && (b.textContent ?? '').trim()) : [];
      for (const p of PREFER) { target = usable.find(b => (b.textContent ?? '').trim().startsWith(p)) as HTMLButtonElement | undefined; if (target) break; }
      if (!target) target = usable[usable.length - 1] as HTMLButtonElement | undefined;
    }
  }
  if (!target) throw new Error(`dead end: phase ${s.phase} at ${s.age} draws no button a player can press`);
  await press(target);
  return s.phase;
}
/* Walk until a condition on the save holds, or fail loudly. */
async function walkUntil(root: HTMLElement, done: (s: CareerState) => boolean, what: string, limit = 160) {
  for (let i = 0; i < limit; i++) {
    if (done(readSave())) return;
    await stepOnce(root);
  }
  throw new Error(`never got to ${what}; stuck on phase ${readSave().phase}`);
}

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
  Math.random = seeded(819);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); Math.random = realRandom; });
afterAll(async () => { await new Promise(r => setTimeout(r, 1500)); });

const HOTEL = () => E.MORAL_DILEMMAS.find(d => d.id === 'haunted_hotel')!;
/* "Sleep in the team bus": popularity +10, nothing random, nothing the
   transfer window after it can touch. */
const BUS = 2;

describe('Soccer Career: saves on the dilemma screens load and carry on', () => {
  it('a save from before 819 on the social media screen posts, continues and plays the next season', async () => {
    const start = playTo(8191, freshSocial);
    const json = JSON.parse(JSON.stringify(start));
    delete json.pendingRivalMove;
    localStorage.setItem(SAVE_KEY, JSON.stringify(json));
    const v = mount(<SoccerCareer />);
    await tick(60);
    const seasons0 = start.seasons.length;
    await walkUntil(v.container, s => s.phase === 'playing', 'the next season start');
    await walkUntil(v.container, s => s.seasons.length > seasons0, 'a played season');
    expect(readSave().seasons.length).toBe(seasons0 + 1);
  }, 120_000);

  it('a save waiting on a dilemma: the choice lands, the card says what happened, Continue keeps it', async () => {
    const base = playTo(8192, freshSocial);
    const waiting: CareerState = { ...base, socialMediaActionUsedThisSeason: true, phase: 'moral_dilemma', pendingMoralDilemma: HOTEL(), moralDilemmasTriggered: [...base.moralDilemmasTriggered, 'haunted_hotel'] };
    localStorage.setItem(SAVE_KEY, JSON.stringify(waiting));
    const v = mount(<SoccerCareer />);
    await tick(60);
    const card = dilemmaCard(v.container);
    expect(card, 'the dilemma card is drawn').not.toBeNull();
    expect(card!.textContent).toContain(HOTEL().title);
    await press(Array.from(card!.querySelectorAll('button'))[BUS] as HTMLElement);
    const decided = readSave();
    expect(decided.phase).toBe('moral_dilemma');
    expect(decided.pendingMoralDilemma).toBeNull();
    expect(decided.popularity).toBe(Math.min(100, waiting.popularity + 10));
    const line = decided.events[decided.events.length - 1];
    expect(line).toContain('team bus');
    const shown = decidedCard(v.container);
    expect(shown, 'the decided card is drawn').not.toBeNull();
    expect(shown!.querySelector('[data-dilemma-outcome]')?.textContent ?? '').toContain('team bus');
    const cont = Array.from(shown!.querySelectorAll('button')).find(b => (b.textContent ?? '').includes('Continue'));
    expect(cont, 'the decided card has a Continue').toBeTruthy();
    await press(cont!);
    const after = readSave();
    expect(after.phase).not.toBe('moral_dilemma');
    expect(after.popularity).toBe(decided.popularity);
    expect(after.events).toContain(line);
  }, 120_000);

  it('a decided dilemma reloaded before Continue draws its card, continues and plays on', async () => {
    const base = playTo(8193, freshSocial);
    const waiting: CareerState = { ...base, socialMediaActionUsedThisSeason: true, phase: 'moral_dilemma', pendingMoralDilemma: HOTEL(), moralDilemmasTriggered: [...base.moralDilemmasTriggered, 'haunted_hotel'] };
    const decided = E.applyMoralDilemmaChoice(waiting, BUS);
    expect(decided.phase).toBe('moral_dilemma');
    expect(decided.pendingMoralDilemma).toBeNull();
    localStorage.setItem(SAVE_KEY, JSON.stringify(decided));
    const v = mount(<SoccerCareer />);
    await tick(60);
    const shown = decidedCard(v.container);
    expect(shown, 'a reloaded decided dilemma still draws its card (the pre 819 card drew nothing)').not.toBeNull();
    expect(shown!.querySelector('[data-dilemma-outcome]')?.textContent ?? '').toContain('team bus');
    const cont = Array.from(shown!.querySelectorAll('button')).find(b => (b.textContent ?? '').includes('Continue'));
    expect(cont, 'the decided card has a Continue').toBeTruthy();
    await press(cont!);
    expect(readSave().phase).not.toBe('moral_dilemma');
    expect(readSave().popularity).toBe(decided.popularity);
    const seasons0 = decided.seasons.length;
    await walkUntil(v.container, s => s.seasons.length > seasons0, 'a played season');
  }, 120_000);

  it('a match fixing ban closes its season through the page and the next one is played', async () => {
    const start = playTo(8194, seasonStart);
    const banned: CareerState = { ...start, matchFixBanned: 2 };
    localStorage.setItem(SAVE_KEY, JSON.stringify(banned));
    const v = mount(<SoccerCareer />);
    await tick(60);
    const seasons0 = banned.seasons.length;
    await walkUntil(v.container, s => s.seasons.length > seasons0, 'the banned season');
    const out = readSave().seasons[seasons0];
    expect(out.club).toBe('BANNED');
    expect(out.apps).toBe(0);
    await walkUntil(v.container, s => s.phase === 'playing', 'the season after the ban');
    expect(readSave().matchFixBanned).toBe(1);
    await walkUntil(v.container, s => s.seasons.length > seasons0 + 1, 'the season after the ban, played');
    const next = readSave().seasons[seasons0 + 1];
    expect(next.club).not.toBe('BANNED');
    expect(readSave().matchFixBanned).toBe(0);
  }, 120_000);
});
