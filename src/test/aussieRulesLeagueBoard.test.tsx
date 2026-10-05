import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AussieRulesLeagueBoard from '@/components/aussie-rules-manager/AussieRulesLeagueBoard';
import AussieRulesManager from '@/pages/AussieRulesManager';
import { clubOf, createLeague, draftPool, lastWeek, LEGACY_SAVE_KEY, picksLeft, readLeagueSave, reduceLeague, SAVE_KEY, type LeagueAction, type LeagueState } from '@/lib/aussieRulesLeague';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => <nav>Fixture navigation</nav> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

const COUNTER = { direct: 'control', pressure: 'direct', control: 'pressure' } as const;
const bot = (s: LeagueState): LeagueAction => s.phase === 'prepare' ? (s.match ? { type: 'prepare', choice: 'train' } : { type: 'simWeek' })
  : s.phase === 'quarter' || s.phase === 'break' ? { type: 'playMatch', tactic: COUNTER[clubOf(s, s.match!.homeId === s.myClub ? s.match!.awayId : s.match!.homeId)!.style] }
  : s.phase === 'draft' && s.draft!.at < s.draft!.order.length ? { type: 'draftAuto' } : { type: 'next' };
const until = (s: LeagueState, done: (s: LeagueState) => boolean) => { let state = s; for (let n = 0; !done(state) && n < 5000; n += 1) state = reduceLeague(state, bot(state)); return state; };
const saved = () => readLeagueSave(localStorage.getItem(SAVE_KEY))!;
const store = (state: LeagueState) => localStorage.setItem(SAVE_KEY, JSON.stringify(state));
const draw = () => render(<MemoryRouter><AussieRulesLeagueBoard /></MemoryRouter>);
const tile = (view: ReturnType<typeof render>, title: string) => fireEvent.click(view.getByText(title, { selector: 'div' }).closest('button')!);
const click = (view: ReturnType<typeof render>, selector: string) => { const el = view.container.querySelector<HTMLElement>(selector); expect(el, selector).not.toBeNull(); fireEvent.click(el!); };

beforeEach(() => { localStorage.clear(); vi.spyOn(Math, 'random').mockReturnValue(0.25); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('AussieRulesLeagueBoard', () => {
  it('opens the hub from the 18 club menu, and every box opens a panel with a way back', () => {
    const view = draw();
    expect(view.container.querySelectorAll('[data-arl-club]')).toHaveLength(18);
    click(view, '[data-arl-club="club-03"]');
    expect(saved().myClub).toBe('club-03');
    for (const title of ['Next match', 'Ladder', 'Squad', 'Club']) {
      tile(view, title);
      fireEvent.click(view.getByRole('button', { name: /Hub/ }));
    }
    tile(view, 'Ladder');
    expect(view.container.querySelectorAll('[data-arl-ladder]')).toHaveLength(18);
  });

  it('plays a round in three taps: prepare, the whole match, next', () => {
    store(createLeague(12, 'club-05')!);
    const view = draw();
    tile(view, 'Next match');
    const before = saved();
    click(view, '[data-arl-prepare="train"]');
    click(view, '[data-arl-playmatch]');
    const played = reduceLeague(reduceLeague(before, { type: 'prepare', choice: 'train' }), { type: 'playMatch', tactic: 'control' });
    expect(saved()).toEqual(played);
    expect(view.container.querySelector('[data-arl-result]')).not.toBeNull();
    click(view, '[data-arl-next]');
    expect(saved().round).toBe(1);
    expect(saved().phase).toBe('prepare');
  });

  it('shows the finals tile and the bracket once the finals start', () => {
    const state = until(createLeague(3, 'club-01')!, s => s.stage === 'finals');
    store(state);
    const view = draw();
    tile(view, 'Finals');
    expect(view.container.querySelectorAll('[data-arl-final]').length).toBe(state.finals!.ties.length);
    expect(state.finals!.ties.length).toBeGreaterThan(0);
  });

  it('lifts the cup with the Grand Final score when you win the flag', () => {
    const state = until(createLeague(1, 'club-00')!, s => s.phase === 'seasonOver');
    expect(state.history[0].premier).toBe('club-00');
    store(state);
    const view = draw();
    const moment = view.container.querySelector('[data-victory-moment]');
    expect(moment).not.toBeNull();
    const gf = state.history[0].gf;
    expect(within(moment as HTMLElement).getByText(/Premiers!/).closest('p')!.textContent).toContain(`${gf.homeScore.goals}.${gf.homeScore.behinds} (${gf.homeScore.total})`);
  });

  it('shows the premiership on the hub when you wrap up the season from the match panel', () => {
    const state = until(createLeague(1, 'club-00')!, s => s.stage === 'finals' && s.phase === 'report' && s.week === lastWeek(s.format));
    store(state);
    const view = draw();
    tile(view, 'Next match');
    click(view, '[data-arl-next]');
    expect(saved().phase).toBe('seasonOver');
    expect(view.container.querySelector('[data-victory-moment]')).not.toBeNull();
    expect(view.queryByText(/starts after the summer and the draft/)).toBeNull();
  });

  it('refuses a draft pick that would leave your list short of rucks, and says why', () => {
    let state = until(createLeague(9, 'club-11')!, s => s.phase === 'summer');
    state = { ...state, clubs: state.clubs.map(club => club.id !== 'club-11' ? club : { ...club, players: club.players.map((p, i) => p.role === 'ruck' && i % 4 !== 0 ? { ...p, age: 40 } : p) }) };
    state = reduceLeague(state, { type: 'next' });
    for (let n = 0; picksLeft(state, 'club-11') > 1 && n < 40; n += 1) state = reduceLeague(state, { type: 'pick', prospectId: draftPool(state).find(p => p.role === 'forward')!.id });
    expect(picksLeft(state, 'club-11')).toBe(1);
    store(state);
    const view = draw();
    tile(view, 'Draft');
    const wrong = draftPool(state).find(p => p.role !== 'ruck')!;
    click(view, `[data-arl-prospect="${wrong.id}"]`);
    expect(view.container.querySelector('[data-arl-refusal]')!.textContent).toMatch(/ruck/);
    expect(saved()).toEqual(state);
  });

  it('starts season two after the draft', () => {
    const state = until(createLeague(4, 'club-08')!, s => s.phase === 'draft' && s.draft!.at >= s.draft!.order.length);
    store(state);
    const view = draw();
    tile(view, 'Draft');
    click(view, '[data-arl-next]');
    expect(saved().season).toBe(2);
    expect(view.container.querySelector('[data-arl-season="2"]')).not.toBeNull();
    expect(view.queryByText(/The draft runs in the summer/)).toBeNull();
    expect(view.getByText('Next match', { selector: 'div' })).toBeTruthy();
  });

  it('opens an unfinished ten round season on the old board, and its new season goes to the full season menu', () => {
    localStorage.setItem(LEGACY_SAVE_KEY, JSON.stringify({ version: 1, seed: 1234567, clubId: 'club-0', actions: [] }));
    const view = render(<MemoryRouter><AussieRulesManager /></MemoryRouter>);
    const rules = view.queryByRole('dialog');
    if (rules) fireEvent.click(within(rules).getByRole('button', { name: "Let's Play!" }));
    expect(view.container.querySelector('[data-arm-legacy]')).not.toBeNull();
    expect(view.container.querySelector('[data-arm-phase="prepare"]')).not.toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'New season' }));
    fireEvent.click(view.getByRole('button', { name: 'Start a new season' }));
    expect(view.container.querySelectorAll('[data-arl-club]')).toHaveLength(18);
    expect(view.container.querySelector('[data-arm-legacy]')).toBeNull();
  });
});
