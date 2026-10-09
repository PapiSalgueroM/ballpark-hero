/**
 * Round 850: Keep Playing plays the season, through the real page.
 *
 * THE BUG (audit QA847-14). Next Season ages the player and only then asks
 * whether he wants to retire. "Not Done Yet: Keep Playing" used to put the
 * phase back to playing and nothing else, so the year he had just aged into
 * was never played: no matches, no row, and the next Next Season aged him
 * again. A real career lost six seasons that way.
 *
 * WHAT THIS DOES. It mounts the REAL page on an engine-made save one season
 * short of the warning, presses Next Season in the action bar, reads the
 * warning card off the screen, presses Keep Playing, and then reads what the
 * page drew and saved. A save is picked only when the warning on the next
 * Next Season is certain from the save itself (first warning, 30 next
 * birthday, already at 75 or below or 10 off his peak, and none of the bans,
 * drug or corruption states that can stop the year before it), so the test
 * does not lean on where the random stream happens to sit.
 *
 * WHAT IT HOLDS:
 *   1. Next Season draws the warning with the new age and writes no row.
 *   2. Keep Playing keeps that age and plays that season: one new row at the
 *      age on the card, the year after the last one, and the page draws the
 *      season (the paper or the season summary for that year).
 *   3. The season after it is the next year: one more Next Season moves the
 *      age and the calendar on by one each.
 * A season that stops for a serious injury's rehab choice writes that year
 * too (the games before the injury, marked injured), so it counts the same.
 *
 * And the two other stops, for a save left sitting on them: a save on the
 * rehab choice or on the conviction paper, in the shape the pre-850 engine
 * wrote it (no row for that year) and in this engine's shape (the row already
 * there), is loaded into the real page, the button is pressed, and the year
 * must come out with exactly one row: never none, never two.
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

const SAVE_KEY = 'soccerCareerSave';
const WANT = 3;

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

/* The warning on the next Next Season is certain from the save alone. */
function warningIsCertain(s: CareerState): boolean {
  const next = s.age + 1;
  return s.phase === 'playing' && !s.retired && !s.retirementSuggested && next >= 30 && next < 45
    && (s.peakOverall - s.overall >= 10 || s.overall <= 75)
    && !(s.overall < 50 && next >= 33)
    && !s.pedActive && (s.matchFixBanned ?? 0) === 0 && (s.prisonSeasons ?? 0) === 0
    && (s.corruptionHeat ?? 0) < 60 && (s.dirtyMoney ?? 0) === 0;
}

/* An engine-made save one season short of the warning. */
const NATIONS = ['England', 'Brazil', 'France', 'Spain', 'Argentina', 'Germany'];
const POSITIONS = ['ST', 'CAM', 'CM', 'CB', 'LW', 'CDM'];
function makeSave(seed: number): CareerState | null {
  const clubs = E.FALLBACK_CLUBS;
  const o = 58 + (seed % 20);
  const st = { pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o };
  let s = E.initCareer(`Keep ${seed}`, NATIONS[seed % NATIONS.length], POSITIONS[seed % POSITIONS.length], '2020s', st, o, 2020, clubs, null);
  for (let guard = 0; guard < 800; guard++) {
    if (warningIsCertain(s)) return s;
    if (s.retired || s.retirementSuggested) return null;
    switch (s.phase) {
      case 'youth': s = E.advanceYouthYear(s, clubs); break;
      case 'playing': s = E.advanceProSeason(s, clubs); break;
      case 'contract_offer': { const offers = s.pendingOffers || []; s = offers.length ? E.acceptOffer(s, offers[0]) : { ...s, phase: 'playing' }; break; }
      case 'rehab_choice': s = E.applyRehabChoice(s, 1); break;
      case 'newspaper': s = E.dismissNewspaper(s); break;
      case 'season_summary': s = E.dismissSummary(s, clubs); break;
      case 'random_events': s = s.pendingEvents?.[0] ? E.applyEventChoice(s, 1, clubs) : { ...s, pendingEvents: [], phase: 'playing' }; break;
      case 'moral_dilemma': s = E.dismissMoralDilemma(s, clubs); break;
      case 'social_media_action': s = E.dismissSocialMediaPhase(s, clubs); break;
      case 'red_card_appeal_result': s = E.dismissAppealResult(s, clubs); break;
      case 'international_debut': s = E.dismissDebut(s, clubs); break;
      case 'world_cup': s = E.dismissWorldCup(s, clubs); break;
      case 'rivalry_event': s = E.dismissRivalryEvent(s, clubs); break;
      case 'ballon_dor': s = E.dismissBallonDor(s, clubs); break;
      case 'transfer_window': s = E.stayAtClub(s); break;
      default: return null;
    }
  }
  return null;
}

/* An engine-made save walked to a screen; null if he retires first. With
   `heat`, the corruption meter sits at the trial line from 22 on, so the
   engine runs the trial on its own roll (a state the dirty choices reach). */
function walkTo(seed: number, want: (s: CareerState) => boolean, heat: boolean): CareerState | null {
  const clubs = E.FALLBACK_CLUBS;
  const o = 58 + (seed % 20);
  const st = { pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o };
  let s = E.initCareer(`Stop ${seed}`, NATIONS[seed % NATIONS.length], POSITIONS[seed % POSITIONS.length], '2020s', st, o, 2020, clubs, null);
  for (let guard = 0; guard < 900; guard++) {
    if (want(s)) return s;
    if (s.retired) return null;
    if (heat && s.phase === 'playing' && s.age >= 22) s = { ...s, corruptionHeat: 95, dirtyMoney: Math.max(2, s.dirtyMoney ?? 0) };
    switch (s.phase) {
      case 'youth': s = E.advanceYouthYear(s, clubs); break;
      case 'playing': s = E.advanceProSeason(s, clubs); break;
      case 'contract_offer': { const offers = s.pendingOffers || []; s = offers.length ? E.acceptOffer(s, offers[0]) : { ...s, phase: 'playing' }; break; }
      case 'rehab_choice': s = E.applyRehabChoice(s, 1); break;
      case 'newspaper': s = E.dismissNewspaper(s); break;
      case 'season_summary': s = E.dismissSummary(s, clubs); break;
      case 'random_events': s = s.pendingEvents?.[0] ? E.applyEventChoice(s, 1, clubs) : { ...s, pendingEvents: [], phase: 'playing' }; break;
      case 'moral_dilemma': s = E.dismissMoralDilemma(s, clubs); break;
      case 'social_media_action': s = E.dismissSocialMediaPhase(s, clubs); break;
      case 'red_card_appeal_result': s = E.dismissAppealResult(s, clubs); break;
      case 'international_debut': s = E.dismissDebut(s, clubs); break;
      case 'world_cup': s = E.dismissWorldCup(s, clubs); break;
      case 'rivalry_event': s = E.dismissRivalryEvent(s, clubs); break;
      case 'ballon_dor': s = E.dismissBallonDor(s, clubs); break;
      case 'transfer_window': s = E.stayAtClub(s); break;
      case 'retirement_suggestion': s = E.acceptRetirementSuggestion(s); break;
      default: return null;
    }
  }
  return null;
}
const onConvictionPaper = (s: CareerState) => s.phase === 'newspaper' && !s.pendingSummary && (s.prisonSeasons ?? 0) > 0;

/* the screen of the moment and the buttons a player would press on it */
const PREFER = ['← Back', 'Stay', 'Sign', 'Review contract', 'Continue', 'Next', 'Accept', 'Confirm', 'Done', 'Close'];
const screenCard = (root: HTMLElement) => root.querySelector('div.space-y-3.order-1')?.firstElementChild?.firstElementChild as HTMLElement | null;
const buttonStarting = (root: HTMLElement, text: string) =>
  Array.from(root.querySelectorAll('button')).find(b => (b.textContent ?? '').trim().includes(text)) as HTMLButtonElement | undefined;
/* Round 1082: an offer is signed in the review dialog, not on the card. */
const press = async (b: HTMLElement) => { await act(async () => { fireEvent.click(b); }); await tick(); await signThroughReview(b, () => tick()); };
const nextSeasonButton = (root: HTMLElement) => root.querySelector('[data-career-action-bar] button') as HTMLButtonElement | null;

interface Run { seed: number; problems: string[]; skipped: string | null }

async function playOne(seed: number): Promise<Run | null> {
  const realRandom = Math.random;
  Math.random = seeded(seed * 7919 + 850);
  const problems: string[] = [];
  let v: ReturnType<typeof mount> | null = null;
  try {
    const start = makeSave(seed);
    if (!start) return null;
    localStorage.setItem(SAVE_KEY, JSON.stringify(start));
    v = mount(<SoccerCareer />);
    await tick(60);
    const root = v.container;

    /* 1. Next Season draws the warning */
    const go = nextSeasonButton(root);
    if (!go) return { seed, problems: ['no Next Season button on a playing save'], skipped: null };
    await press(go);
    const warned = readSave()!;
    const text = root.textContent ?? '';
    if (warned.phase !== 'retirement_suggestion') problems.push(`Next Season at ${start.age} went to ${warned.phase}, not the warning`);
    if (!text.includes('YOUR BODY IS SHOWING SIGNS OF WEAR')) problems.push('the warning card is not on screen');
    if (!text.includes(`At age ${start.age + 1}`)) problems.push(`the warning does not say age ${start.age + 1}`);
    if (warned.age !== start.age + 1) problems.push(`the warning came at ${warned.age}, expected ${start.age + 1}`);
    if (warned.seasons.length !== start.seasons.length) problems.push('the warning wrote a row before anybody answered it');

    /* 2. Keep Playing plays that season */
    const keep = buttonStarting(root, 'Not Done Yet: Keep Playing');
    if (!keep) return { seed, problems: [...problems, 'no Keep Playing button on the warning'], skipped: null };
    await press(keep);
    const played = readSave()!;
    if (played.age !== warned.age) problems.push(`Keep Playing moved the age ${warned.age} to ${played.age}`);
    const row = played.seasons[played.seasons.length - 1];
    /* a season that stops for a serious injury still writes that year, marked */
    if (played.phase === 'rehab_choice' && !row.injurySevere) problems.push(`the injury stop at ${warned.age} wrote a row with no injury on it`);
    const lastYear = start.seasons[start.seasons.length - 1].year;
    if (played.seasons.length !== start.seasons.length + 1) problems.push(`Keep Playing wrote ${played.seasons.length - start.seasons.length} rows, expected 1`);
    if (row.age !== warned.age || row.year !== lastYear + 1 || row.type !== 'playing') {
      problems.push(`the row Keep Playing wrote is age ${row.age} year ${row.year} ${row.type}, expected age ${warned.age} year ${lastYear + 1} playing`);
    }
    const drawn = root.textContent ?? '';
    const drawsSeason = played.phase === 'newspaper'
      || (played.phase === 'season_summary' && drawn.includes('Season Summary') && drawn.includes(`${row.year}/`))
      || (played.phase === 'rehab_choice' && drawn.includes('How do you want to come back?'));
    if (!drawsSeason) problems.push(`after Keep Playing the page is on ${played.phase}, not the season it played`);
    if (drawn.includes('YOUR BODY IS SHOWING SIGNS OF WEAR')) problems.push('the warning is still on screen after Keep Playing');

    /* 3. walk the close of that season, then the next Next Season is the next year */
    for (let step = 0; step < 80; step++) {
      const s = readSave()!;
      if (s.phase === 'playing' || s.retired) break;
      if (s.phase === 'retirement_suggestion') { problems.push('a second warning came before the season closed'); break; }
      const area = screenCard(root);
      const usable = area ? Array.from(area.querySelectorAll('button')).filter(b => !b.disabled && (b.textContent ?? '').trim()) : [];
      let target: HTMLButtonElement | undefined;
      for (const p of PREFER) { target = usable.find(b => (b.textContent ?? '').trim().startsWith(p)); if (target) break; }
      if (!target) target = usable[usable.length - 1];
      if (!target) { problems.push(`dead end on ${s.phase} after Keep Playing`); break; }
      await press(target);
    }
    const closed = readSave()!;
    if (closed.phase === 'playing' && !closed.retired) {
      const again = nextSeasonButton(root);
      if (!again) problems.push('no Next Season button after the season closed');
      else {
        await press(again);
        const after = readSave()!;
        if (after.age !== closed.age + 1) problems.push(`the next Next Season went ${closed.age} to ${after.age}`);
        if (after.seasons.length > closed.seasons.length) {
          const r2 = after.seasons[after.seasons.length - 1];
          if (r2.year !== row.year + 1 || r2.age !== closed.age + 1) problems.push(`the next row is age ${r2.age} year ${r2.year}, expected age ${closed.age + 1} year ${row.year + 1}`);
        }
      }
    }
    return { seed, problems, skipped: null };
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

describe('Soccer Career: Keep Playing plays the season through the page', () => {
  it('the warning, Keep Playing, and the season that follows', async () => {
    const problems: string[] = [];
    let checked = 0;
    for (let seed = 850; seed < 850 + 40 && checked < WANT; seed++) {
      const r = await playOne(seed);
      if (!r) continue;
      if (r.skipped) { console.log(`KEEP seed=${seed} skipped: ${r.skipped}`); continue; }
      checked += 1;
      console.log(`KEEP seed=${seed} problems=${r.problems.length}`);
      for (const p of r.problems) problems.push(`seed ${seed}: ${p}`);
    }
    expect(checked, 'careers driven through the warning and Keep Playing').toBe(WANT);
    expect(problems, problems.join('\n')).toEqual([]);
  }, 240_000);

  it('a save left on the rehab choice or the conviction paper gets that year once', async () => {
    const problems: string[] = [];
    const seen = { rehab: 0, conviction: 0 };
    /* load a save into the real page, press one button, read what it saved */
    const pressOn = async (save: CareerState, label: string): Promise<CareerState | null> => {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      const v = mount(<SoccerCareer />);
      try {
        await tick(60);
        const b = buttonStarting(v.container, label);
        if (!b) return null;
        await press(b);
        return readSave();
      } finally { v.unmount(); }
    };
    const realRandom = Math.random;
    try {
      for (let seed = 900; seed < 960 && (seen.rehab < 2 || seen.conviction < 2); seed++) {
        for (const kind of ['rehab', 'conviction'] as const) {
          if (seen[kind] >= 2) continue;
          Math.random = seeded(seed * 7919 + (kind === 'rehab' ? 851 : 852));
          const now = kind === 'rehab'
            ? walkTo(seed, s => s.phase === 'rehab_choice', false)
            : walkTo(seed, onConvictionPaper, true);
          if (!now) continue;
          seen[kind] += 1;
          const age = now.age;
          /* the pre-850 engine stopped in exactly this state minus the year's
             row (scripts/simCareerKeepPlaying.mjs holds that byte for byte) */
          const shapes: [string, CareerState][] = [['pre-850', { ...now, seasons: now.seasons.slice(0, -1) }], ['this round', now]];
          for (const [shape, save] of shapes) {
            const out = await pressOn(save, kind === 'rehab' ? "Follow the club's plan" : 'Continue to Season Summary');
            if (!out) { problems.push(`seed ${seed}: no button on the ${kind} screen of a ${shape} save`); continue; }
            const year = out.seasons.filter(r => r.age === age);
            if (year.length !== 1) problems.push(`seed ${seed}: a ${shape} save on the ${kind} screen at ${age} came out with ${year.length} rows for that year`);
            else if (kind === 'conviction' && year[0].club !== 'CONVICTED') problems.push(`seed ${seed}: the trial year at ${age} reads ${year[0].club}`);
            else if (kind === 'rehab' && !year[0].injurySevere) problems.push(`seed ${seed}: the injury year at ${age} carries no injury`);
            if (out.phase !== 'playing') problems.push(`seed ${seed}: a ${shape} save on the ${kind} screen went to ${out.phase}, not back to Next Season`);
          }
          console.log(`STOP seed=${seed} ${kind} at ${age}`);
        }
      }
    } finally { Math.random = realRandom; }
    expect(seen, 'saves walked to each screen').toEqual({ rehab: 2, conviction: 2 });
    expect(problems, problems.join('\n')).toEqual([]);
  }, 240_000);
});
