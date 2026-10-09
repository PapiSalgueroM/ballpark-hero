/**
 * Round 819: a Soccer Career player actually gets the moral dilemmas.
 *
 * THE BUG. From the day the dilemmas were added (2026-03-29) the season close
 * ran: summary, then the social media screen (every season from 18), and the
 * social media screen's Continue went straight to the random events. The
 * dilemma roll only lived in the step BEFORE the social media screen, which
 * the social media screen always took first, so after 18 the roll never ran
 * and no player ever saw a dilemma, the four rival ones included.
 *
 * WHAT THIS DOES. It mounts the REAL page on a save at a given age and plays
 * it the way a player does: it presses the buttons on screen, Next Season in
 * the action bar and whatever the current screen offers, and it reads what is
 * drawn. The engine is only used to make the starting save, the way a player
 * comes back to a save they made earlier. Only the network, the recorder and
 * the toasts are stubbed.
 *
 * WHAT IT HOLDS, all of it read off the screen against the save:
 *   1. Every dilemma the engine offers (a new id on moralDilemmasTriggered)
 *      is drawn on screen, and drawn exactly once, in the same order.
 *   2. No season draws two of them.
 *   3. A player from 20 up sees some. Before this round the count was 0.
 *   4. Nothing below 20 (the engine's own age gate).
 *   5. (Round 819 review) The choice lands and the card's Continue keeps it:
 *      the button a player taps writes an outcome line into the save, and
 *      after Continue that line and the consequence fields are still what
 *      the choice left. Before this a Continue that threw the choice away
 *      passed every check here.
 * It prints a REACH line per start age with the counts, which
 * scripts/simCareerDilemmaReach.mjs reads and holds to its bands, and that
 * harness carries the negative controls (it points this file at a broken
 * copy of the engine through NO_DOUBLE_SWAP).
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
import { signThroughReview } from './signThroughReview';

/* eslint-disable @typescript-eslint/no-explicit-any */
const SAVE_KEY = 'soccerCareerSave';
const START_AGES = [17, 19, 24, 30];
const CAREERS = Number(process.env.DILEMMA_REACH_CAREERS || 6);
const SEASONS = Number(process.env.DILEMMA_REACH_SEASONS || 4);
const BASE_SEED = Number(process.env.DILEMMA_REACH_SEED || 819);

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

/* The starting save: the engine plays a career from 16 until the first
   season start at or past the age asked for. This is the save a player
   reloads, nothing more. Every screen is answered the way the page answers
   it, so a save made here is one the page could have made. */
const NATIONS = ['England', 'Brazil', 'France', 'Spain', 'Argentina', 'Germany'];
const POSITIONS = ['ST', 'CAM', 'CM', 'CB', 'LW', 'CDM'];
function makeSave(seed: number, startAge: number): CareerState | null {
  const clubs = E.FALLBACK_CLUBS;
  const o = 58 + (seed % 20);
  const st = { pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o };
  let s = E.initCareer(`Reach ${seed}`, NATIONS[seed % NATIONS.length], POSITIONS[seed % POSITIONS.length], '2020s', st, o, 2020, clubs, null, Math.max(o + 12, 80));
  for (let guard = 0; guard < 600; guard++) {
    if ((s.phase === 'playing' || s.phase === 'youth') && s.age >= startAge) return s;
    if (s.retired) return null;
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
      case 'transfer_window': {
        const sit: any = s.transferSituation;
        if (sit?.type === 'contract_expiry') { s = E.signExtension(s); break; }
        s = E.stayAtClub(s);
        break;
      }
      case 'retirement_suggestion': s = E.declineRetirementSuggestion(s, clubs); break;
      default: return null;
    }
  }
  return null;
}

/* What a player taps, by what is on screen. The screen of the moment is the
   first thing drawn in the reveal area (the first child of the right hand
   panel); the season button is in the action bar. Preferences are the
   browser walk's (playSoccerCareer), minus the moves that would end the
   career early, and with nothing preferred the screen's LAST button, because
   a card's own tiles come before its answers (a won tournament draws its
   tiles, then the speeches, and a tile opens a sub screen whose way out is
   Back). */
const PREFER = ['← Back', '💪 Not Done Yet', 'Stay', 'Sign', 'Review contract', 'Continue', 'Next', 'Accept', 'Confirm', 'Done', 'Close'];
const screenCard = (root: HTMLElement) => root.querySelector('div.space-y-3.order-1')?.firstElementChild?.firstElementChild as HTMLElement | null;
const dilemmaCard = (root: HTMLElement) => {
  const tag = Array.from(root.querySelectorAll('span')).find(s => (s.textContent ?? '').includes('MORAL DILEMMA'));
  return tag ? tag.closest('div.rounded-xl') as HTMLElement | null : null;
};

interface Showing { title: string; age: number; season: number }
interface Offer { id: string; title: string; age: number }

/* What a choice leaves behind. Morale is left out: the transfer window the
   Continue opens can take 12 off it for a freeze out, which is that screen's
   doing, not the dilemma's. */
const fingerprint = (x: CareerState) => JSON.stringify([x.popularity, x.netWorth, x.integrityBonus, x.matchFixBanned, x.pedActive, x.divingActive,
  x.sponsorBonus ?? 0, x.mafiaStage ?? 0, x.rivalryIntensity ?? null, x.statBoostNextSeason ?? null, x.agentId ?? null]);

async function playOne(seed: number, startAge: number) {
  const realRandom = Math.random;
  Math.random = seeded(seed * 7919 + startAge);
  const offers: Offer[] = [];
  const shows: Showing[] = [];
  const kept: string[] = [];
  let seasonsClosed = 0;
  const closedAt: number[] = [];
  let v: ReturnType<typeof mount> | null = null;
  try {
    const start = makeSave(seed, startAge);
    if (!start) return null;
    localStorage.setItem(SAVE_KEY, JSON.stringify(start));
    v = mount(<SoccerCareer />);
    await tick(60);
    const root = v.container;
    let known = (start.moralDilemmasTriggered || []).length;
    let lastSeasons = start.seasons.length;
    let onScreen: string | null = null;
    let endedBy = 'steps';
    const titleOf = (id: string) => E.MORAL_DILEMMAS.find(d => d.id === id)?.title ?? id;
    /* 5: set when a choice button is pressed, read on the next screen; then
       set when the decided card's Continue is pressed, read after it. */
    let chose: { title: string; events: number } | null = null;
    let decided: { title: string; line: string; fp: string } | null = null;
    let continued = false;
    for (let step = 0; step < 400; step++) {
      const s = readSave();
      if (!s) throw new Error('the page holds no save');
      if (chose) {
        const ev = s.events || [];
        if (ev.length <= chose.events) kept.push(`"${chose.title}" at ${s.age}: the choice wrote no outcome into the save`);
        else decided = { title: chose.title, line: ev[ev.length - 1], fp: fingerprint(s) };
        chose = null;
      }
      if (continued) {
        if (decided && (!(s.events || []).includes(decided.line) || fingerprint(s) !== decided.fp)) {
          kept.push(`"${decided.title}" at ${s.age}: Continue lost what the choice did`);
        }
        decided = null;
        continued = false;
      }
      /* A season closes when a new season record lands. */
      if (s.seasons.length > lastSeasons) { seasonsClosed += s.seasons.length - lastSeasons; closedAt.push(s.age); lastSeasons = s.seasons.length; }
      const trig = s.moralDilemmasTriggered || [];
      for (; known < trig.length; known++) offers.push({ id: trig[known], title: titleOf(trig[known]), age: s.age });
      const card = dilemmaCard(root);
      const title = card?.querySelector('h3')?.textContent?.trim() ?? null;
      const choiceButtons = card ? Array.from(card.querySelectorAll('button')) : [];
      const isChoiceCard = !!title && choiceButtons.length > 0 && title !== 'Decision Made';
      if (isChoiceCard && onScreen !== title) shows.push({ title: title!, age: s.age, season: s.seasons.length });
      onScreen = isChoiceCard ? title : null;
      if (s.retired) { endedBy = `retired at ${s.age}`; break; }
      if ((s.phase === 'playing' || s.phase === 'youth') && seasonsClosed >= SEASONS) { endedBy = 'seasons'; break; }

      let target: HTMLButtonElement | undefined;
      if (s.phase === 'playing' || s.phase === 'youth') {
        target = root.querySelector('[data-career-action-bar] button') as HTMLButtonElement | undefined;
      } else if (isChoiceCard) {
        target = choiceButtons[seed % choiceButtons.length] as HTMLButtonElement;
        chose = { title: title!, events: (s.events || []).length };
      } else {
        if (s.phase === 'moral_dilemma' && decided) continued = true;
        const area = screenCard(root);
        const usable = area ? Array.from(area.querySelectorAll('button')).filter(b => !b.disabled && (b.textContent ?? '').trim()) : [];
        for (const p of PREFER) { target = usable.find(b => (b.textContent ?? '').trim().startsWith(p)); if (target) break; }
        if (!target) target = usable[usable.length - 1];
      }
      if (!target) throw new Error(`dead end: phase ${s.phase} at ${s.age} draws no button a player can press`);
      endedBy = `steps (phase ${s.phase} at ${s.age}, pressing "${(target.textContent ?? '').trim().slice(0, 40)}")`;
      await act(async () => { fireEvent.click(target!); });
      await tick();
      /* Round 1082: an offer is signed in the review dialog, not on the card. */
      await signThroughReview(target!, () => tick());
    }
    return { offers, shows, kept, seasonsClosed, closedAt, endedBy, startPhase: start.phase };
  } finally {
    v?.unmount();
    Math.random = realRandom;
  }
}

beforeEach(() => {
  localStorage.clear();
  try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* jsdom */ }
  /* Release AQ (Round 1172): the Ballon d'Or night draws Continue only after its ranked list has come in,
     about three seconds of real timers a ceremony. This walk plays as a visitor who asked for less motion,
     the card's still form, where the list and Continue are drawn at once. The timed list has its own tests
     (src/test/soccerAwardReveal.test.tsx). The same stub as src/test/careerAwardsNightCard.test.tsx. */
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));
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

describe('Soccer Career: the moral dilemmas reach the player through the page', () => {
  const all: { startAge: number; offers: Offer[]; shows: Showing[]; seasonsClosed: number }[] = [];

  for (const startAge of START_AGES) {
    it(`reach: careers picked up at ${startAge}`, async () => {
      let offers = 0, shows = 0, seasons = 0, played = 0, adult = 0, adultShows = 0;
      const problems: string[] = [];
      for (let c = 0; c < CAREERS; c++) {
        const seed = BASE_SEED + c * 101 + startAge;
        const r = await playOne(seed, startAge);
        if (!r) continue;
        played += 1;
        all.push({ startAge, ...r });
        offers += r.offers.length;
        shows += r.shows.length;
        seasons += r.seasonsClosed;
        adult += r.closedAt.filter(a => a >= 20).length;
        adultShows += r.shows.filter(x => x.age >= 20).length;
        if (r.endedBy.startsWith('steps')) problems.push(`seed ${seed}: the walk ran out of steps after ${r.seasonsClosed} seasons, a screen it cannot leave`);
        if (r.endedBy !== 'seasons') console.log(`SHORT start=${startAge} seed=${seed} startPhase=${r.startPhase} seasons=${r.seasonsClosed} ended=${r.endedBy}`);
        /* 1. every offer drawn, exactly once, in order */
        const offered = r.offers.map(o => o.title).join(' | ');
        const drawn = r.shows.map(x => x.title).join(' | ');
        if (offered !== drawn) problems.push(`seed ${seed}: offered [${offered}] but drawn [${drawn}]`);
        /* 2. never two in one season */
        const perSeason = new Map<number, number>();
        for (const x of r.shows) perSeason.set(x.season, (perSeason.get(x.season) || 0) + 1);
        for (const [season, n] of perSeason) if (n > 1) problems.push(`seed ${seed}: ${n} dilemmas drawn in season ${season}`);
        /* 4. nothing below 20 */
        for (const x of r.shows) if (x.age < 20) problems.push(`seed ${seed}: "${x.title}" drawn at ${x.age}, under the engine's age gate of 20`);
        /* 5. the choice lands and Continue keeps it */
        for (const k of r.kept) problems.push(`seed ${seed}: ${k}`);
      }
      console.log(`REACH start=${startAge} careers=${played} seasons=${seasons} adultSeasons=${adult} offers=${offers} shows=${shows} adultShows=${adultShows}`);
      expect(played, 'careers that reached the start age').toBeGreaterThan(0);
      expect(problems, problems.join('\n')).toEqual([]);
    }, 240_000);
  }

  it('reach: a player from 20 up sees dilemmas on screen', () => {
    const adultShows = all.reduce((n, r) => n + r.shows.filter(x => x.age >= 20).length, 0);
    const adultOffers = all.reduce((n, r) => n + r.offers.filter(x => x.age >= 20).length, 0);
    console.log(`REACH total adultOffers=${adultOffers} adultShows=${adultShows}`);
    expect(adultShows, 'dilemmas drawn on screen for a player aged 20 or more').toBeGreaterThan(0);
  });
});
