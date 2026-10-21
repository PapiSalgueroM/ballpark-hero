import { Component, type ReactNode } from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/completions', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(),
  getCurrentPlayerName: () => 'Retire Tester',
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn(), loading: false }) }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('sonner', () => ({ toast: Object.assign(() => undefined, { success: vi.fn(), error: vi.fn(), info: vi.fn(), message: vi.fn(), loading: vi.fn(), dismiss: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => {
  const chain = (): unknown => new Proxy(() => undefined, {
    get(_target, prop) {
      if (prop === 'then') return (ok: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null, count: 0 }).then(ok);
      if (typeof prop === 'symbol') return undefined;
      return () => chain();
    },
    apply() { return chain(); },
  });
  return {
    supabase: { from: () => chain(), rpc: () => chain(), functions: { invoke: async () => ({ data: null, error: null }) } },
    SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key',
  };
});
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/PostGameStats', () => ({ default: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: ({ score }: { score: string }) => <p data-testid="share-score">{score}</p> }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/components/soccer-career/AppearanceBuilder', () => ({ default: () => null }));
vi.mock('@/components/soccer-career/PlayerAvatar', () => ({ default: () => null }));

import * as E from '@/lib/soccerCareerEngine';
import { parseSoccerCareerSave } from '@/lib/soccerCareerSave';
import SoccerCareer from '@/pages/SoccerCareer';

/* Round 1519: "i retired at 26 no injury no choice". The page with its real engine and save, a generated
   player driven to 25 and 26, the network and presentation only children stubbed. */
type Career = E.CareerState;
const KEY = 'soccerCareerSave';
const realRandom = Math.random;
const read = (): Career => parseSoccerCareerSave(localStorage.getItem(KEY)!) as Career;
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function seed(n: number) {
  let s = n | 0;
  Math.random = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* A chance wheel the last card spun opens over the page on load until it is closed; these saves have seen it. */
function seen(s: Career): Career {
  const out = { ...s };
  delete out.chanceWheel;
  return out;
}
/* The page's own presses, the last answer on every card, Stay at every window, until Next Season at `age`. */
function careerAt(age: number): Career {
  const clubs = E.FALLBACK_CLUBS;
  seed(15191519);
  const stats = { pace: 66, shooting: 66, passing: 66, dribbling: 66, defending: 66, physical: 66, reflexes: 66 };
  let s = E.initCareer('Retire Tester', 'England', 'CM', '2020s', stats, 66, 2025, clubs, null);
  for (let guard = 0; guard < 1500 && !(s.phase === 'playing' && s.age === age); guard++) {
    if (s.retired) throw new Error(`the fixture retired at ${s.age}`);
    switch (s.phase) {
      case 'youth': s = E.advanceYouthYear(s, clubs); break;
      case 'contract_offer': s = s.pendingOffers.length ? E.acceptOffer(s, s.pendingOffers[s.pendingOffers.length - 1]) : { ...s, phase: 'playing' }; break;
      case 'playing': s = E.advanceProSeason(s, clubs); break;
      case 'newspaper': s = E.dismissNewspaper(s); break;
      case 'season_summary': s = E.dismissSummary(s, clubs); break;
      case 'random_events': s = s.pendingEvents[0] ? E.applyEventChoice(s, s.pendingEvents[0].choices.length - 1, clubs) : { ...s, phase: 'playing' }; break;
      case 'moral_dilemma': s = s.pendingMoralDilemma ? E.applyMoralDilemmaChoice(s, s.pendingMoralDilemma.choices.length - 1) : E.dismissMoralDilemma(s, clubs); break;
      case 'social_media_action': s = E.dismissSocialMediaPhase(s, clubs); break;
      case 'red_card_appeal_result': s = E.dismissAppealResult(s, clubs); break;
      case 'international_debut': s = E.dismissDebut(s, clubs); break;
      case 'world_cup': s = E.dismissWorldCup(s, clubs); break;
      case 'rivalry_event': s = E.dismissRivalryEvent(s, clubs); break;
      case 'ballon_dor': s = E.dismissBallonDor(s, clubs); break;
      case 'rehab_choice': s = E.applyRehabChoice(s, 1); break;
      case 'transfer_window': s = E.stayAtClub(s); break;
      default: throw new Error(`unhandled phase ${s.phase}`);
    }
  }
  if (!(s.phase === 'playing' && s.age === age)) throw new Error(`never stood on Next Season at ${age}`);
  Math.random = realRandom;
  return seen(s);
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p>TEST: route crashed</p> : this.props.children; }
}
function mount(raw: string) {
  localStorage.setItem(KEY, raw);
  return render(<HelmetProvider><MemoryRouter><Boundary><SoccerCareer /></Boundary></MemoryRouter></HelmetProvider>);
}
function playable(view: ReturnType<typeof render>) {
  expect(view.queryByText('TEST: route crashed')).toBeNull();
  expect(view.queryByText('Create Your Player')).toBeNull();
  expect(view.container.textContent).toContain('Retire Tester');
}
const button = (view: ReturnType<typeof render>, name: RegExp) => view.getAllByRole('button', { name })[0];
const ended = (s: Career) => s.retired || ['retirement_ceremony', 'post_retirement', 'retired'].includes(s.phase);

let fixtures: { at25: Career; at26: Career } | null = null;
const fx = () => (fixtures ??= { at25: careerAt(25), at26: careerAt(26) });
const retireButton = (view: ReturnType<typeof render>) => {
  const found = Array.from(view.container.querySelectorAll('button')).find(b => b.textContent?.trim() === '🚪 Retire');
  expect(found).toBeInstanceOf(HTMLButtonElement);
  return found!;
};
async function continueThrough(view: ReturnType<typeof render>) {
  for (let i = 0; i < 4 && ['newspaper', 'season_summary'].includes(read().phase); i++) {
    const before = localStorage.getItem(KEY);
    fireEvent.click(button(view, /^Continue/));
    await waitFor(() => expect(localStorage.getItem(KEY)).not.toBe(before));
  }
}

beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  window.scrollTo = () => undefined;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); Math.random = realRandom; });

describe('Round 1519: no career ends at 26 without the player', () => {
  it('Next Season at 25, the summary and its Continue, then a reload: the career plays on at 26', async () => {
    const view = mount(JSON.stringify(fx().at25)); playable(view);
    seed(1519001);
    fireEvent.click(view.container.querySelector('[data-career-action-bar] button')!);
    await waitFor(() => expect(read().age).toBe(26));
    expect(ended(read())).toBe(false);
    await continueThrough(view);
    expect(ended(read())).toBe(false);
    expect(view.queryByRole('button', { name: /Share Legacy/ })).toBeNull();
    view.unmount();
    const again = mount(localStorage.getItem(KEY)!); playable(again);
    expect(ended(read())).toBe(false); expect(read().age).toBe(26);
    expect(again.queryByRole('button', { name: /Share Legacy/ })).toBeNull();
  });
  it('the Retire dialog: Cancel keeps the career, Confirm ends it on the send off with its choices', () => {
    const view = mount(JSON.stringify(fx().at26)); playable(view);
    fireEvent.click(retireButton(view));
    expect(view.getByRole('dialog', { name: 'Retire?' })).toBeVisible();
    fireEvent.click(view.getByRole('button', { name: 'Cancel' }));
    expect(view.queryByRole('dialog', { name: 'Retire?' })).toBeNull();
    expect(read().retired).toBe(false); expect(read().phase).toBe('playing');
    fireEvent.click(retireButton(view));
    fireEvent.click(view.getByRole('button', { name: 'Confirm Retirement' }));
    expect(read().retired).toBe(true); expect(read().phase).toBe('retirement_ceremony'); expect(read().age).toBe(26);
    expect(view.container.textContent).toContain('retires at age 26');
    expect(view.container.querySelector('[data-retirement-reason]')).toBeNull();
    for (const name of [/Retire and Enjoy Life/, /Become a Manager/, /Become a TV Pundit/]) expect(button(view, name)).toBeVisible();
  });
  it('a stray retired flag on the summary at 26 plays on after Continue', async () => {
    seed(1519002);
    let s = E.advanceProSeason(copy(fx().at25), E.FALLBACK_CLUBS);
    if (s.phase === 'newspaper') s = E.dismissNewspaper(s);
    expect(s.phase).toBe('season_summary'); expect(s.age).toBe(26);
    const view = mount(JSON.stringify({ ...seen(s), retired: true })); playable(view);
    await continueThrough(view);
    expect(ended(read())).toBe(false);
    expect(view.queryByRole('button', { name: /Share Legacy/ })).toBeNull();
  });
  it('a real retirement whose phase was lost opens its send off with the choices', () => {
    const real = E.manualRetire(copy(fx().at26));
    const lost = { ...real, phase: 'season_summary', pendingSummary: real.seasons[real.seasons.length - 1] };
    const view = mount(JSON.stringify(lost)); playable(view);
    expect(view.container.textContent).toContain('retires at age 26');
    expect(view.container.querySelector('[data-retirement-reason]')).toBeNull();
    expect(button(view, /Retire and Enjoy Life/)).toBeVisible();
  });
  it('a retired screen with nothing behind it goes back to Next Season', () => {
    const view = mount(JSON.stringify({ ...copy(fx().at26), phase: 'retired' })); playable(view);
    expect(view.queryByRole('button', { name: /Share Legacy/ })).toBeNull();
    expect(button(view, /Next Season/)).toBeVisible();
  });
  it('a forced retirement says why on the send off', () => {
    seed(1519003);
    const stats = { pace: 40, shooting: 40, passing: 40, dribbling: 40, defending: 40, physical: 40, reflexes: 40 };
    const forced = E.advanceProSeason({ ...copy(fx().at26), ...stats, overall: 40, age: 32 }, E.FALLBACK_CLUBS);
    expect(forced.phase).toBe('retirement_ceremony');
    const view = mount(JSON.stringify(forced)); playable(view);
    expect(view.container.querySelector('[data-retirement-reason]')?.textContent).toMatch(/^Forced out at 33: overall \d+, the body could not keep up\.$/);
  });
});
