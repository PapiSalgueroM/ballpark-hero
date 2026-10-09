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
import { availableSpeeches, givenSpeechOf, type GivenSpeech } from '@/lib/careerAwardsNight';
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
  return saveWhere(won ? 1 : 2, s => {
    const rank = s.pendingBallonDor?.playerRank ?? null;
    return won ? rank === 1 : rank !== null && rank > 1;
  }, null, `no ${won ? 'won' : 'lost'} ceremony in 59 seeded careers`);
}

/* Round 1023: the same walk, stopped on a tournament the player won. */
function saveOnTournamentWin(): CareerState {
  return saveWhere(3, null, s => s.pendingTournament?.myResult === 'Winner', 'no won tournament in 59 seeded careers');
}

function saveWhere(
  salt: number,
  onCeremony: ((s: CareerState) => boolean) | null,
  onTournament: ((s: CareerState) => boolean) | null,
  none: string,
): CareerState {
  const clubs = E.FALLBACK_CLUBS;
  const real = Math.random;
  try {
    for (let seed = 1; seed < 60; seed++) {
      Math.random = seeded(seed * 834 + salt);
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
          case 'world_cup':
            if (onTournament?.(s)) return s;
            s = E.dismissWorldCup(s, clubs);
            break;
          case 'rivalry_event': s = E.dismissRivalryEvent(s, clubs); break;
          case 'ballon_dor': {
            if (onCeremony?.(s)) return s;
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
  throw new Error(none);
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
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));
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
  it.each([true, false])('keeps the actual %s ballot out of newspaper, summary, timeline and cabinet until its list', async won => {
    const start = saveOnCeremony(won);
    const ballot = JSON.stringify(start.pendingBallonDor);
    const last = start.seasons[start.seasons.length - 1];
    const priorWins = E.getCareerTotals(start.seasons.slice(0, -1)).ballonDors;
    const pending = { ...start, phase: 'newspaper' as const, pendingSummary: last, bdorSnubFuel: true,
      pendingNews: [{ newspaper: 'The Daily Sport', type: 'negative' as const, headline: "ROBBED! Misses Out On Ballon d'Or AGAIN", body: 'Still no golden ball.' }] };
    localStorage.setItem(SAVE_KEY, JSON.stringify(pending));
    const view = mount(<SoccerCareer />);
    await tick(60);
    expect(view.container.textContent).not.toMatch(/ROBBED|Misses Out|BALLON D'OR WINNER/);
    const tile = view.container.querySelector('[data-trophy-category="ballon"]')!;
    expect(tile.getAttribute('aria-label')).toContain(`Ballon d'Or: ${priorWins}.`);
    const timeline = view.container.querySelector(`[data-timeline-season="${last.year}"]`)!;
    expect(timeline.textContent).not.toContain('🏅');
    expect(JSON.stringify(readSave()!.pendingBallonDor)).toBe(ballot);
    fireEvent.click(view.getByRole('button', { name: /Continue to Season Summary/ }));
    await tick(60);
    const summary = view.getByRole('heading', { name: 'Season Summary' }).parentElement!.parentElement!;
    expect(summary.textContent).not.toContain("Ballon d'Or");
    expect(tile.getAttribute('aria-label')).toContain(`Ballon d'Or: ${priorWins}.`);
    expect(JSON.stringify(readSave()!.pendingBallonDor)).toBe(ballot);
    fireEvent.click(Array.from(summary.querySelectorAll('button')).find(b => b.textContent?.startsWith('Continue'))!);
    await tick(60);
    const card = view.container.querySelector('[data-award-night="ballon_dor"]')!;
    expect(card.querySelectorAll('[data-award-rank]')).toHaveLength(start.pendingBallonDor!.nominees.length);
    expect(card.getAttribute('data-award-result')).toBe('revealed');
    const after = readSave()!.pendingBallonDor!;
    expect(after.revealed).toBe(true);
    expect(JSON.stringify({ ...after, revealed: undefined })).toBe(ballot);
    expect(view.container.querySelector('[data-trophy-category="ballon"]')!.getAttribute('aria-label')).toContain(`Ballon d'Or: ${priorWins + (won ? 1 : 0)}.`);
  });
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

/* Round 1023: the title winner's speech stays on the tournament card. It used
   to clear the card and move on in the same tap, so the player never saw what
   his speech did. */
const METER_KEYS = ['popularity', 'morale', 'integrityBonus', 'rivalryIntensity', 'socialMediaFollowers', 'marketValue'] as const;
/** What the meters say moved between two saves, in the card's words. */
const movedBetween = (a: CareerState, b: CareerState) => {
  const meters = E.SOCCER_BALLON_DOR.meters;
  return METER_KEYS
    .map(k => ({ k, d: Math.round((meters[k].read(b) - meters[k].read(a)) * 100) / 100 }))
    .filter(x => x.d !== 0)
    .map(({ k, d }) => `${meters[k].label} ${meters[k].show ? meters[k].show!(d) : `${d >= 0 ? '+' : ''}${d}`}`)
    .join(', ');
};
const tournamentCard = (root: HTMLElement) => root.querySelector('[data-intl-moment]') as HTMLElement | null;

describe('Soccer Career: the tournament winner\'s speech', () => {
  it('stays on the card, shows what it really moved, a second tap does nothing, Continue leaves', async () => {
    /* Popularity 95, so the cap cuts the speech's +18 and the card has to say
       what landed rather than what was asked. */
    const start: CareerState = { ...saveOnTournamentWin(), popularity: 95 };
    expect(start.phase).toBe('world_cup');
    expect(E.worldCupSpeechOpen(start)).toBe(true);
    localStorage.setItem(SAVE_KEY, JSON.stringify(start));
    let v = mount(<SoccerCareer />);
    await tick(60);
    let card = tournamentCard(v.container);
    expect(card, 'the won tournament is on screen').not.toBeNull();
    for (const o of E.SOCCER_WORLD_CUP_SPEECHES) expect(buttons(card!).some(b => (b.textContent ?? '').includes(o.label)), o.id).toBe(true);
    expect(hasContinue(card!), 'no Continue before the speech').toBe(false);

    const kids = E.SOCCER_WORLD_CUP_SPEECHES.find(o => o.id === 'for_the_country')!;
    await act(async () => { fireEvent.click(buttons(card!).find(b => (b.textContent ?? '').includes(kids.label))!); });
    await tick();
    const after = readSave()!;
    expect(after.phase, 'the card stays up').toBe('world_cup');
    expect(after.pendingTournament?.myResult).toBe('Winner');
    const spoken = after.pendingTournament!.speech!;
    expect(spoken.id).toBe('for_the_country');
    expect(after.popularity, 'the cap cut the step').toBe(100);
    /* the moved line is the before and after of the meters, nothing else */
    expect(spoken.moved).toBe(movedBetween(start, after));
    expect(spoken.moved).toContain('Popularity +5');
    /* Round 1023 review: followers are counted in millions, so +3 is "+3M" */
    expect(spoken.moved).toContain('Followers +3M');
    expect(after.events.length).toBe(start.events.length + 1);
    expect(after.events[after.events.length - 1]).toBe(kids.line(after, 'sure'));
    card = tournamentCard(v.container);
    const shown = card!.textContent ?? '';
    expect(shown).toContain(spoken.line);
    expect(shown).toContain(spoken.moved);
    expect(hasContinue(card!)).toBe(true);
    for (const o of E.SOCCER_WORLD_CUP_SPEECHES) expect(shown).not.toContain(o.label);

    /* a second tap does nothing: the engine hands the same save back */
    expect(E.worldCupSpeechOpen(after)).toBe(false);
    expect(E.giveWorldCupSpeech(after, 'quiet_lap')).toBe(after);
    expect(E.giveWorldCupSpeech(after, 'for_the_country')).toBe(after);

    /* the save written after the speech loads as it was */
    v.unmount();
    v = mount(<SoccerCareer />);
    await tick(60);
    card = tournamentCard(v.container);
    expect(card!.textContent ?? '').toContain(spoken.moved);
    for (const o of E.SOCCER_WORLD_CUP_SPEECHES) expect(card!.textContent ?? '').not.toContain(o.label);
    const cont = buttons(card!).find(b => (b.textContent ?? '').trim().startsWith('Continue'))!;
    await act(async () => { fireEvent.click(cont); });
    await tick();
    const next = readSave()!;
    expect(next.pendingTournament ?? null).toBeNull();
    expect(next.phase).not.toBe('world_cup');
    expect(next.popularity).toBe(after.popularity);
    v.unmount();
  }, 120_000);

  it('a pre Round 124 World Cup save gets the same speech, once, and a corrupt speech reads as none', () => {
    const won = saveOnTournamentWin();
    const t = won.pendingTournament!;
    const legacy: CareerState = {
      ...won, pendingTournament: null,
      pendingWorldCup: { year: t.year, nation: t.nation, matches: [], playerApps: 7, playerGoals: 4, playerAssists: 2, playerAvgRating: 7.9, result: 'Winner', bestPlayer: false },
    };
    expect(E.worldCupSpeechOpen(legacy)).toBe(true);
    const after = E.giveWorldCupSpeech(legacy, 'shirt_to_the_fans');
    expect(after.phase).toBe('world_cup');
    expect(after.pendingWorldCup?.speech?.moved).toBe(movedBetween(legacy, after));
    expect(E.giveWorldCupSpeech(after, 'quiet_lap')).toBe(after);
    const corrupt = { ...legacy, pendingWorldCup: { ...legacy.pendingWorldCup!, speech: 7 as unknown as GivenSpeech } };
    expect(givenSpeechOf(corrupt.pendingWorldCup)).toBeNull();
    expect(E.worldCupSpeechOpen(corrupt)).toBe(true);
    const lost: CareerState = { ...won, pendingTournament: { ...t, myResult: 'Runner-up' } };
    expect(E.worldCupSpeechOpen(lost)).toBe(false);
    expect(E.giveWorldCupSpeech(lost, 'quiet_lap')).toBe(lost);
  });
});
