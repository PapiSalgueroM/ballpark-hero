/**
 * Round 834: the Ballon d'Or ceremony card, through the real page.
 *
 * The winner's speech had no buttons from Round 54 until this round, and the
 * card promised "Legacy +20" for a win and "Legacy +5" for a podium while the
 * night moved market value and popularity. This mounts the REAL Soccer Career
 * page on a save sitting on a ceremony, the way a player comes back to one,
 * and presses what is on screen. The engine only makes the starting save:
 * seeded careers are played until a ceremony the player won, or one he lost,
 * comes up. Only the network, the recorder and the toasts are stubbed.
 *
 * WHAT IT HOLDS, read off the screen and the save:
 *   1. A won ceremony offers the speeches this save may give in place of
 *      Continue; one pick moves exactly that speech, writes one line, keeps it
 *      on the night, and the card then shows the line and what it moved with
 *      Continue and no speech left to give. Reloading the save there shows
 *      the same, and Continue leaves the ceremony.
 *   2. A lost ceremony offers no speech, just Continue, and says nothing
 *      about legacy.
 *   3. An old save holding a won ceremony that is not the season just played
 *      is not offered a speech for that past win.
 * scripts/simCareerAwardsNight.mjs section 6 carries the negative controls
 * for the same rules at the engine and card level.
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
import { availableSpeeches } from '@/lib/careerAwardsNight';
import { localizeMoney } from '@/lib/soccerCurrency';
import SoccerCareer from '@/pages/SoccerCareer';

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
const readSave = (): CareerState | null => {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { return null; }
};

/* Plays seeded careers with the engine, answering every screen the way the
   page does, until a ceremony of the kind asked for is on screen. */
function saveOnCeremony(won: boolean): CareerState {
  const clubs = E.FALLBACK_CLUBS;
  const real = Math.random;
  try {
    for (let seed = 1; seed < 60; seed++) {
      Math.random = seeded(seed * 834 + (won ? 1 : 2));
      const o = 76 + (seed % 6);
      const st = { pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o };
      let s = E.initCareer(`Night ${seed}`, 'Brazil', 'ST', '2020s', st, o, 2020, clubs, null, 95);
      for (let guard = 0; guard < 500 && !s.retired; guard++) {
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
            if (s.pendingCoverAthleteEvent) s = E.handleCoverAthleteDecision(s, false);
            else s = E.dismissSocialMediaPhase(s, clubs);
            break;
          case 'red_card_appeal_result': s = E.dismissAppealResult(s, clubs); break;
          case 'international_debut': s = E.dismissDebut(s, clubs); break;
          case 'world_cup': s = E.dismissWorldCup(s, clubs); break;
          case 'rivalry_event': s = E.dismissRivalryEvent(s, clubs); break;
          case 'ballon_dor': {
            const rank = s.pendingBallonDor?.playerRank ?? null;
            if (won ? rank === 1 : rank !== null && rank > 1) return s;
            s = E.dismissBallonDor(s, clubs);
            break;
          }
          case 'transfer_window': s = s.transferSituation?.type === 'contract_expiry' ? E.signExtension(s) : E.stayAtClub(s); break;
          case 'retirement_suggestion': s = E.declineRetirementSuggestion(s, clubs); break;
          default: guard = 500;
        }
      }
    }
  } finally {
    Math.random = real;
  }
  throw new Error(`no ${won ? 'won' : 'lost'} ceremony in 59 seeded careers`);
}

/** The ceremony card on screen: the rounded card holding the award title. */
const ceremony = (root: HTMLElement) => {
  const h = Array.from(root.querySelectorAll('h3')).find(x => /BALLON D'OR/i.test(x.textContent ?? ''));
  return h ? (h.closest('div.rounded-xl') as HTMLElement | null) : null;
};
const buttons = (el: HTMLElement) => Array.from(el.querySelectorAll('button'));
const hasContinue = (el: HTMLElement) => buttons(el).some(b => (b.textContent ?? '').trim().startsWith('Continue'));

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
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
afterAll(async () => { await new Promise(r => setTimeout(r, 1500)); });

describe('Soccer Career: the Ballon d\'Or ceremony card', () => {
  it('a win offers the speech once, then shows what it did, and Continue leaves', async () => {
    const start = saveOnCeremony(true);
    expect(E.bdorSpeechOpen(start)).toBe(true);
    localStorage.setItem(SAVE_KEY, JSON.stringify(start));
    let v = mount(<SoccerCareer />);
    await tick(60);
    let card = ceremony(v.container);
    expect(card, 'the won ceremony is on screen').not.toBeNull();
    const text = card!.textContent ?? '';
    expect(text).toContain('The golden ball is yours. The speech:');
    /* The line is what the night measured, not its steps: a winner near the
       popularity cap gets less than +20, or none, and the card says so. */
    const moved = start.pendingBallonDor!.moved;
    expect(moved, 'the won night carries what it measurably moved').toBeTypeOf('string');
    expect(moved).toContain('Market Value');
    expect(text).toContain(localizeMoney(E.SOCCER_BALLON_DOR.copy.winnerLine(moved)));
    expect(text).not.toContain('Legacy');
    const offered = availableSpeeches(E.SOCCER_BDOR_SPEECHES, start);
    for (const o of offered) expect(buttons(card!).some(b => (b.textContent ?? '').includes(o.label)), o.id).toBe(true);
    for (const o of E.SOCCER_BDOR_SPEECHES.filter(x => !offered.includes(x))) expect(text).not.toContain(o.label);
    expect(hasContinue(card!), 'no Continue before the speech').toBe(false);
    /* The speech is the result, so it waits for the headline: hidden and
       unclickable through the countdown, not on screen from the first frame. */
    const prompt = Array.from(card!.querySelectorAll('p')).find(p => (p.textContent ?? '').includes('The golden ball is yours'))!;
    expect(prompt.closest('.cm-rise-gated'), 'the speech arrives with the headline').not.toBeNull();

    const tears = E.SOCCER_BDOR_SPEECHES.find(o => o.id === 'tears')!;
    const button = buttons(card!).find(b => (b.textContent ?? '').includes(tears.label))!;
    await act(async () => { fireEvent.click(button); });
    await tick();
    const after = readSave()!;
    expect(after.phase).toBe('ballon_dor');
    expect(after.pendingBallonDor?.speech?.id).toBe('tears');
    const line = tears.line(after, 'sure');
    expect(after.events.filter(e => e === line)).toHaveLength(1);
    expect(after.events.length).toBe(start.events.length + 1);
    expect(after.popularity).toBe(Math.min(100, start.popularity + 10));
    expect(after.morale).toBe(Math.min(100, start.morale + 8));
    card = ceremony(v.container);
    const shown = card!.textContent ?? '';
    expect(shown).toContain(line);
    expect(shown).toContain(after.pendingBallonDor!.speech!.moved);
    expect(hasContinue(card!)).toBe(true);
    for (const o of E.SOCCER_BDOR_SPEECHES) expect(shown).not.toContain(o.label);

    /* the save written on the ceremony after the speech loads as it was */
    v.unmount();
    v = mount(<SoccerCareer />);
    await tick(60);
    card = ceremony(v.container);
    expect(card!.textContent ?? '').toContain(line);
    for (const o of E.SOCCER_BDOR_SPEECHES) expect(card!.textContent ?? '').not.toContain(o.label);
    const cont = buttons(card!).find(b => (b.textContent ?? '').trim().startsWith('Continue'))!;
    await act(async () => { fireEvent.click(cont); });
    await tick();
    const next = readSave()!;
    expect(next.pendingBallonDor).toBeNull();
    expect(next.phase).not.toBe('ballon_dor');
    expect(next.popularity).toBe(after.popularity);
    v.unmount();
  }, 120_000);

  it('a lost ceremony offers no speech, just Continue', async () => {
    const start = saveOnCeremony(false);
    expect(E.bdorSpeechOpen(start)).toBe(false);
    localStorage.setItem(SAVE_KEY, JSON.stringify(start));
    const v = mount(<SoccerCareer />);
    await tick(60);
    const card = ceremony(v.container);
    expect(card, 'the lost ceremony is on screen').not.toBeNull();
    const text = card!.textContent ?? '';
    expect(text).not.toContain('The golden ball is yours');
    for (const o of E.SOCCER_BDOR_SPEECHES) expect(text).not.toContain(o.label);
    expect(text).not.toContain('Legacy');
    const rank = start.pendingBallonDor!.playerRank!;
    if (rank <= 3) expect(text).toContain(E.SOCCER_BALLON_DOR.copy.podiumLine(rank, start.pendingBallonDor!.moved));
    expect(hasContinue(card!)).toBe(true);
    const cont = buttons(card!).find(b => (b.textContent ?? '').trim().startsWith('Continue'))!;
    await act(async () => { fireEvent.click(cont); });
    await tick();
    const next = readSave()!;
    expect(next.pendingBallonDor).toBeNull();
    expect(next.events.length).toBeGreaterThanOrEqual(start.events.length);
    v.unmount();
  }, 120_000);

  it('an old save holding a ceremony from a past season is not offered a speech for it', async () => {
    const won = saveOnCeremony(true);
    const stale: CareerState = { ...won, pendingBallonDor: { ...won.pendingBallonDor!, year: won.pendingBallonDor!.year - 1 } };
    expect(E.bdorSpeechOpen(stale)).toBe(false);
    expect(E.giveBdorSpeech(stale, 'tears')).toBe(stale);
    localStorage.setItem(SAVE_KEY, JSON.stringify(stale));
    const v = mount(<SoccerCareer />);
    await tick(60);
    const card = ceremony(v.container);
    expect(card).not.toBeNull();
    for (const o of E.SOCCER_BDOR_SPEECHES) expect(card!.textContent ?? '').not.toContain(o.label);
    expect(hasContinue(card!)).toBe(true);
    v.unmount();
  }, 120_000);
});
