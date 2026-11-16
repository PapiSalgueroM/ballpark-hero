import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AussieRulesLeagueBoard from '@/components/aussie-rules-manager/AussieRulesLeagueBoard';
import AussieRulesManager from '@/pages/AussieRulesManager';
import { clubOf, clubShort, createLeague, draftPool, lastWeek, LEGACY_SAVE_KEY, opponentPlays, picksLeft, readLeagueSave, reduceLeague, SAVE_KEY, summerDelistCandidates, type LeagueAction, type LeagueState } from '@/lib/aussieRulesLeague';
import { effectiveSkill, TACTICS } from '@/lib/aussieRulesManager';

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
  it('names a short injury in full time, reloads it and keeps the player out of selection', () => {
    const start = createLeague(1, 'club-04', 'afl2026', true)!;
    store(start);
    const first = draw();
    tile(first, 'Next match');
    click(first, '[data-arl-prepare="rest"]');
    click(first, '[data-arl-playmatch]');
    const report = saved();
    const id = report.injuries!.report.find(player => start.starters.includes(player))!;
    const name = clubOf(start, start.myClub)!.players.find(player => player.id === id)!.name;
    const fullTime = first.getByRole('region', { name: 'Match injuries' });
    expect(fullTime).toHaveTextContent(name);
    expect(fullTime).toHaveTextContent('Misses 2 matches');
    const bytes = localStorage.getItem(SAVE_KEY);
    first.unmount();
    const resumed = draw();
    tile(resumed, 'Next match');
    expect(resumed.getByRole('region', { name: 'Match injuries' })).toHaveTextContent(name);
    expect(localStorage.getItem(SAVE_KEY)).toBe(bytes);

    click(resumed, '[data-arl-next]');
    expect(resumed.getByRole('region', { name: 'Injury list' })).toHaveTextContent(name);
    fireEvent.click(resumed.getByRole('button', { name: /Hub/ }));
    tile(resumed, 'Squad');
    expect(resumed.container.querySelector('[data-arl-injury="' + id + '"]')).toHaveTextContent('Misses 2 matches');
    click(resumed, '[data-arl-slot="' + start.starters.indexOf(id) + '"]');
    expect(resumed.container.querySelector('[data-arl-candidate="' + id + '"]')).toBeNull();
  });

  it.each(['applied', 'skipped'] as const)('books and reloads a named half-time interchange with a %s receipt', outcome => {
    store(createLeague(1, 'club-04', 'afl2026')!);
    const first = draw();
    tile(first, 'Next match');
    const plan = within(first.getByRole('region', { name: 'Plan a half-time interchange' }));
    fireEvent.change(plan.getByRole('combobox', { name: 'Off the field' }), { target: { value: 'p-153' } });
    fireEvent.change(plan.getByRole('combobox', { name: 'On the field' }), { target: { value: 'p-144' } });
    fireEvent.click(plan.getByRole('button', { name: 'Book half-time interchange' }));
    const bytes = localStorage.getItem(SAVE_KEY);
    expect(saved().halftimeInterchange).toEqual({ outId: 'p-153', inId: 'p-144', outcome: 'planned' });
    first.unmount();
    const resumed = draw();
    tile(resumed, 'Next match');
    expect(localStorage.getItem(SAVE_KEY)).toBe(bytes);
    expect(resumed.getByText(/Booked for half time.*Dellan Marlfen.*Irvane Coldholm/)).toBeVisible();
    click(resumed, '[data-arl-prepare="rest"]');
    if (outcome === 'skipped') {
      for (let i = 0; i < 3; i++) click(resumed, '[data-arl-play]');
      expect(saved().match?.quarter).toBe(2);
      fireEvent.change(resumed.getByRole('combobox', { name: 'Off the field' }), { target: { value: 'p-153' } });
      fireEvent.change(resumed.getByRole('combobox', { name: 'On the field' }), { target: { value: 'p-144' } });
      click(resumed, '[data-arl-swap]');
    }
    click(resumed, '[data-arl-playmatch]');
    const receipt = resumed.container.querySelector('[data-arl-halftime-interchange]');
    expect(receipt).toBeVisible();
    expect(receipt).toHaveTextContent(outcome === 'applied' ? /Half-time interchange made.*Dellan Marlfen.*Irvane Coldholm/ :
      /Half-time interchange skipped.*Dellan Marlfen.*Irvane Coldholm.*no longer available/);
    expect(saved().halftimeInterchange?.outcome).toBe(outcome);
  });

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

  it('keeps a chosen player through the match, next round, and a reload from the Squad panel', () => {
    store(createLeague(1, 'club-00', 'afl2026')!);
    const view = draw();
    tile(view, 'Squad');
    click(view, '[data-arl-slot="0"]');
    click(view, '[data-arl-candidate="p-3"]');
    const keep = view.getByRole('button', { name: 'Keep this matchday 23' });
    keep.focus();
    fireEvent.click(keep);
    expect(view.getByRole('button', { name: 'Use automatic selection' })).toHaveFocus();
    fireEvent.click(view.getByRole('button', { name: /Hub/ }));
    tile(view, 'Next match');
    click(view, '[data-arl-prepare="rest"]');
    click(view, '[data-arl-playmatch]');
    click(view, '[data-arl-next]');
    expect(saved().round).toBe(1);
    expect(saved().starters[0]).toBe('p-3');
    const bytes = localStorage.getItem(SAVE_KEY);
    view.unmount();
    const restored = draw();
    expect(localStorage.getItem(SAVE_KEY)).toBe(bytes);
    tile(restored, 'Squad');
    expect(restored.getByRole('button', { name: 'Use automatic selection' })).toBeVisible();
    fireEvent.click(restored.getByRole('button', { name: 'Use automatic selection' }));
    expect(saved().starters).not.toContain('p-3');
  });

  it.each([0, 64])('previews actual starting strength and fatigue from a starter fatigue of %i', fatigue => {
    const state = createLeague(12, 'club-05')!;
    const starterIds = new Set(state.starters);
    clubOf(state, state.myClub)!.players.forEach(player => { if (starterIds.has(player.id)) player.fatigue = fatigue; });
    store(state);
    const bytes = localStorage.getItem(SAVE_KEY);
    const view = draw();
    tile(view, 'Next match');
    const previews = (['train', 'rest'] as const).map(choice => {
      const expected = reduceLeague(state, { type: 'prepare', choice });
      const starters = clubOf(expected, state.myClub)!.players.filter(player => starterIds.has(player.id));
      const strength = starters.reduce((sum, player) => sum + effectiveSkill(player), 0) / starters.length;
      const averageFatigue = starters.reduce((sum, player) => sum + player.fatigue, 0) / starters.length;
      const option = view.container.querySelector<HTMLElement>(`[data-arl-prepare="${choice}"]`)!;
      expect(within(option).getByText(`Starting strength ${strength.toFixed(1)} · Avg fatigue ${Math.round(averageFatigue)}`)).toBeVisible();
      return strength;
    });
    expect(previews[0] > previews[1]).toBe(fatigue === 0);
    expect(localStorage.getItem(SAVE_KEY)).toBe(bytes);
    click(view, '[data-arl-prepare="rest"]');
    expect(saved()).toEqual(reduceLeague(state, { type: 'prepare', choice: 'rest' }));
  });

  it('shows skill movement in the exact full-time report and after reload', () => {
    const opening = createLeague(12, 'club-05')!;
    const changed = until(opening, s => s.stage === 'homeAway' && s.phase === 'report' && s.ratingReview?.round === s.round);
    expect(changed.ratingReview!.changes.length).toBeGreaterThan(0);
    store(changed);
    const bytes = localStorage.getItem(SAVE_KEY);
    const view = draw();
    tile(view, 'Next match');
    const report = view.getByRole('region', { name: 'Skill changes this round' });
    const players = clubOf(changed, changed.myClub)!.players;
    expect(within(report).getAllByRole('listitem', { hidden: true }).map(row => row.textContent)).toEqual(
      changed.ratingReview!.changes.map(([id, change]) => {
        const player = players.find(p => p.id === id)!;
        return `${player.name} · ${player.skill - change} → ${player.skill} skill`;
      }),
    );
    expect(localStorage.getItem(SAVE_KEY)).toBe(bytes);
    view.unmount();
    const reopened = draw();
    tile(reopened, 'Next match');
    expect(reopened.getByRole('region', { name: 'Skill changes this round' }).textContent).toBe(report.textContent);
    expect(localStorage.getItem(SAVE_KEY)).toBe(bytes);
  });

  it('keeps an older skill review out of the current round and finals report', () => {
    const opening = createLeague(12, 'club-05')!;
    const later = until(opening, s => s.stage === 'homeAway' && s.phase === 'report'
      && !!s.ratingReview && s.ratingReview.round < s.round);
    expect(later.ratingReview!.round).toBeLessThan(later.round);
    store(later);
    const view = draw();
    tile(view, 'Next match');
    expect(within(view.getByRole('region', { name: 'Skill changes this round' })).getByText('No skill changes were recorded for this round.')).toBeTruthy();
    view.unmount();
    const finals = until(later, s => s.stage === 'finals' && s.phase === 'report');
    expect(finals.ratingReview).toBeDefined();
    store(finals);
    const finalView = draw();
    tile(finalView, 'Next match');
    expect(finalView.queryByRole('region', { name: 'Skill changes this round' })).toBeNull();
  });

  it('reopens the winning or losing score and exact archived skills after later rounds, distinguishing no change from a legacy gap', () => {
    const opening = createLeague(12, 'club-05')!;
    const legacy = until(opening, state => state.round === 2 && state.phase === 'prepare');
    delete legacy.skillReviews;
    const changed = until(legacy, state => state.stage === 'homeAway' && state.phase === 'report' && state.ratingReview?.round === state.round);
    const receipt = changed.skillReviews!.find(row => row.round === changed.round)!;
    expect(receipt.changes.length).toBeGreaterThan(0);
    const late = until(reduceLeague(changed, { type: 'next' }), state => state.stage === 'homeAway' && state.phase === 'report');
    store(late);
    const bytes = localStorage.getItem(SAVE_KEY);
    const mine = changed.results.find(game => game.round === changed.round && (game.homeId === changed.myClub || game.awayId === changed.myClub))!;
    const score = (value: typeof mine.homeScore) => `${value.goals}.${value.behinds} (${value.total})`;
    const squad = clubOf(changed, changed.myClub)!.players;
    const expected = receipt.changes.map(([id, before, after]) => `${squad.find(player => player.id === id)!.name} · ${before} → ${after} skill`);
    let view = draw();
    tile(view, 'Next match');
    const archive = () => within(view.getByRole('region', { name: 'Completed match reports' }));
    const open = () => fireEvent.click(archive().getByText('Completed match reports'));
    const pick = (round: number) => fireEvent.change(archive().getByRole('combobox', { name: 'Played round' }), { target: { value: String(round) } });
    open();
    pick(changed.round);
    expect(archive().getByText(`${clubShort(changed, mine.homeId)} ${score(mine.homeScore)} v ${clubShort(changed, mine.awayId)} ${score(mine.awayScore)}`)).toBeInTheDocument();
    expect(archive().getAllByRole('listitem').map(row => row.textContent)).toEqual(expected);
    pick(2);
    expect(archive().getByText('No skill changes this round.')).toBeInTheDocument();
    pick(1);
    expect(archive().getByText('Skill changes are unavailable for this round.')).toBeInTheDocument();
    expect(localStorage.getItem(SAVE_KEY)).toBe(bytes);
    view.unmount();
    view = draw();
    tile(view, 'Next match');
    open();
    pick(changed.round);
    expect(archive().getAllByRole('listitem').map(row => row.textContent)).toEqual(expected);
    expect(localStorage.getItem(SAVE_KEY)).toBe(bytes);
  });

  it('shows the read before a quarter and what the opponent really played after it', () => {
    const opponent = (s: LeagueState) => clubOf(s, s.match!.homeId === s.myClub ? s.match!.awayId : s.match!.homeId)!;
    const switched = (s: LeagueState) => opponentPlays(s.seed, s.season, s.match!, opponent(s).style) !== opponent(s).style;
    let start = createLeague(12, 'club-05')!;
    for (let seed = 13; !switched(start) && seed < 80; seed += 1) start = createLeague(seed, 'club-05')!;
    expect(switched(start)).toBe(true);
    store(start);
    const view = draw();
    tile(view, 'Next match');
    click(view, '[data-arl-prepare="train"]');
    const label = (id: string) => TACTICS.find(value => value.id === id)!.label;
    expect(view.getByText(/Opponent read:/).textContent).toContain(`Opponent read: ${label(opponent(start).style)}, their usual style`);
    click(view, '[data-arl-play]');
    expect(saved().phase).toBe('break');
    expect(view.getByText(/Opponent read:/).textContent).toContain(`Last quarter they played ${label(opponentPlays(start.seed, start.season, start.match!, opponent(start).style))}.`);
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
    const state = until(createLeague(3, 'club-00')!, s => s.phase === 'seasonOver');
    expect(state.history[0].premier).toBe('club-00');
    store(state);
    const view = draw();
    const moment = view.container.querySelector('[data-victory-moment]');
    expect(moment).not.toBeNull();
    const gf = state.history[0].gf;
    expect(within(moment as HTMLElement).getByText(/Premiers!/).closest('p')!.textContent).toContain(`${gf.homeScore.goals}.${gf.homeScore.behinds} (${gf.homeScore.total})`);
  });

  it('shows the premiership on the hub when you wrap up the season from the match panel', () => {
    const state = until(createLeague(3, 'club-00')!, s => s.stage === 'finals' && s.phase === 'report' && s.week === lastWeek(s.format));
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

  it('previews and saves one delisting from Summer before opening the draft', () => {
    const state = until(createLeague(16, 'club-04', 'afl2026')!, s => s.phase === 'summer');
    const player = summerDelistCandidates(state).find(candidate => candidate.role === 'ruck')!;
    const bytes = JSON.stringify(state);
    store(state);
    const view = draw();
    fireEvent.click(view.getByText('Delist a player', { exact: true }));
    const confirm = view.getByRole('button', { name: 'Confirm delisting' });
    expect(confirm).toBeDisabled();
    fireEvent.change(view.getByLabelText('Returning player'), { target: { value: player.id } });
    expect(view.getByText('Draft picks increase from 9 to 10.')).toBeVisible();
    expect(view.getByText('Draft role needs: 1 ruck.')).toBeVisible();
    expect(localStorage.getItem(SAVE_KEY)).toBe(bytes);
    fireEvent.click(confirm);
    const receipt = player.name + ' will leave when the draft opens. Your draft gets one extra pick.';
    expect(view.getByText(receipt)).toBeVisible();
    expect(saved().history[0].delisted?.playerId).toBe(player.id);
    expect(saved().draft).toBeNull();

    view.unmount();
    const reopened = draw();
    expect(reopened.getByText(receipt)).toBeVisible();
    expect(reopened.queryByRole('button', { name: 'Confirm delisting' })).toBeNull();
    fireEvent.click(reopened.getByRole('button', { name: 'Open the draft' }));
    expect(saved().phase).toBe('draft');
    expect(picksLeft(saved(), state.myClub)).toBe(10);
    expect(clubOf(saved(), state.myClub)!.players.some(candidate => candidate.id === player.id)).toBe(false);
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

  it('previews and carries a legal kept 23 across the draft and reload', () => {
    const initial = createLeague(1, 'club-00', 'afl2026')!;
    const chosen = reduceLeague(initial, { type: 'lineup', starters: ['p-0', ...initial.starters.slice(1)], bench: initial.bench });
    const summer = until(reduceLeague(chosen, { type: 'keepLineup' }), state => state.phase === 'summer');
    const delisted = reduceLeague(summer, { type: 'delist', season: 1, playerId: 'p-22' });
    const ready = until(delisted, state => state.phase === 'draft' && state.draft!.at === state.draft!.order.length);
    const expected = reduceLeague(ready, { type: 'carryLineup', clubId: ready.myClub, season: 1 });
    const ruck = expected.preferredLineup!.starters.find(slot => slot.role === 'ruck')!;
    const name = clubOf(expected, expected.myClub)!.players.find(player => player.id === ruck.id)!.name;
    const bytes = JSON.stringify(ready);
    store(ready);
    const first = draw();
    tile(first, 'Draft');
    const preview = (view: ReturnType<typeof draw>) => {
      const summary = view.getByText('Preview previous matchday 23', { exact: true });
      fireEvent.click(summary);
      return within(summary.closest('details')!);
    };
    const panel = preview(first);
    expect(panel.getByText(/Elwen Pellwick/)).toBeVisible();
    expect(panel.getByText(new RegExp(name + ' \\(replacement\\)'))).toBeVisible();
    expect(panel.queryByText(/Faelan Pellwick/)).toBeNull();
    expect(first.getByRole('button', { name: /^Start season 2$/ })).toBeVisible();
    expect(localStorage.getItem(SAVE_KEY)).toBe(bytes);
    first.unmount();

    const second = draw();
    tile(second, 'Draft');
    fireEvent.click(preview(second).getByRole('button', { name: 'Start season 2 with previous 23' }));
    expect(saved()).toEqual(expected);
    second.unmount();
    const restored = draw();
    tile(restored, 'Squad');
    expect(restored.getByText('Use automatic selection', { exact: true })).toBeVisible();
    expect(restored.container.querySelector('option[value="p-22"]')).toBeNull();
    expect(saved().starters).toContain('p-0');
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
