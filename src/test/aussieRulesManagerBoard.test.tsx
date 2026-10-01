import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AussieRulesManagerBoard from '@/components/aussie-rules-manager/AussieRulesManagerBoard';
import AussieRulesManager from '@/pages/AussieRulesManager';
import { clubById, createManager, ladderFor, playerById, readManagerSave, reduceManager, SAVE_KEY, type ManagerAction, type ManagerState } from '@/lib/aussieRulesManager';
import { recordCompletion } from '@/lib/completions';
import styles from '@/components/aussie-rules-manager/AussieRulesManagerBoard.module.css';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => <nav>Fixture navigation</nav> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

const SEED = Math.floor(.314159 * 4294967295) + 1;
const saved = () => readManagerSave(localStorage.getItem(SAVE_KEY))!;
const phase = (view: ReturnType<typeof render>) => view.container.querySelector('[data-arm-phase]')!;
const click = (view: ReturnType<typeof render>, selector: string) => {
  const button = view.container.querySelector<HTMLButtonElement>(selector); expect(button, `actual ${selector} control exists`).not.toBeNull();
  fireEvent.click(button!);
};
const tab = (view: ReturnType<typeof render>, name: string) => fireEvent.click(view.getByRole('button', { name }));
const draw = () => render(<AussieRulesManagerBoard />);
const start = (view = draw()) => { click(view, '[data-arm-club="club-0"]'); return view; };
const exactScore = (view: ReturnType<typeof render>, state: ManagerState) => {
  const text = view.container.querySelector('[data-arm-score]')!.textContent!;
  for (const value of [state.match!.homeScore, state.match!.awayScore]) expect(text).toContain(`${value.goals}.${value.behinds} (${value.total})`);
};
function advance(view: ReturnType<typeof render>, action: ManagerAction, selector: string, current = saved().state) {
  const expected = reduceManager(current, action); expect(expected).not.toBe(current); click(view, selector);
  expect(saved().state).toEqual(expected); return expected;
}
function season(view: ReturnType<typeof render>, state = saved().state, stored = true) {
  while (state.phase !== 'complete') {
    const action: ManagerAction = state.phase === 'prepare' ? { type: 'prepare', choice: state.round % 2 ? 'rest' : 'train' }
      : state.phase === 'quarter' ? { type: 'play', tactic: state.match!.quarter % 2 ? 'pressure' : 'direct' } : { type: 'next' };
    const selector = action.type === 'prepare' ? `[data-arm-prepare="${action.choice}"]` : action.type === 'play' ? `[data-arm-tactic="${action.tactic}"]` : '[data-arm-next]';
    state = reduceManager(state, action); click(view, selector);
    expect(phase(view)).toHaveAttribute('data-arm-phase', state.phase);
    if (stored) expect(saved().state).toEqual(state);
    if (state.match) exactScore(view, state);
  }
  return state;
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] }); localStorage.clear(); vi.clearAllMocks();
  vi.spyOn(Math, 'random').mockReturnValue(.314159);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('actual Aussie Rules Manager Board', () => {
  it('shows real shared rules and the worked example before any season starts, with reusable help', () => {
    const view = render(<MemoryRouter initialEntries={['/aussie-rules-manager']}><AussieRulesManager /></MemoryRouter>);
    const rules = view.getByRole('dialog', { name: 'How to Play Aussie Rules Manager' });
    expect(within(rules).getByText(/12 goals and 8 behinds make 80/)).toBeVisible();
    expect(within(rules).getByRole('link', { name: '2026 Laws' })).toHaveAttribute('href', expect.stringContaining('Laws-of-Australian-Football'));
    expect(localStorage.getItem(SAVE_KEY)).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
    fireEvent.click(within(rules).getByRole('button', { name: "Let's Play!" }));
    expect(view.container.querySelectorAll('[data-arm-club]')).toHaveLength(6);
    expect(view.getByText(/Six fictional clubs and generated players/)).toBeVisible();
    fireEvent.click(view.getByRole('button', { name: 'How to play' })); expect(view.getByRole('dialog')).toBeVisible();
  });

  it('starts the exact generated squad and focuses the surviving round heading without scoring', () => {
    const view = start(), expected = createManager(SEED, 'club-0')!;
    expect(saved().state).toEqual(expected); expect(view.getByRole('heading', { name: 'Round 1: preparation' })).toHaveFocus();
    expect(expected.starters).toHaveLength(18); expect(expected.bench).toHaveLength(5); expect(new Set([...expected.starters, ...expected.bench]).size).toBe(23);
    expect(view.container.querySelector('[data-arm-feedback]')).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('targets only eligible original starter candidates and commits an exact bench exchange with stable slot focus', () => {
    const view = start(), state = saved().state, original = JSON.stringify(state), outgoing = playerById(state, state.starters[0])!;
    tab(view, 'Squad'); click(view, '[data-arm-slot="starter-0"]'); expect(view.getByRole('button', { name: 'Back to squad' })).toHaveFocus();
    const expectedIds = clubById(state, state.clubId)!.players.filter(player => player.id !== outgoing.id && !state.starters.includes(player.id) && player.role === outgoing.role).map(player => player.id);
    expect([...view.container.querySelectorAll<HTMLElement>('[data-arm-candidate]')].map(el => el.dataset.armCandidate)).toEqual(expectedIds);
    const incomingId = state.bench.find(id => playerById(state, id)!.role === outgoing.role)!;
    const starters = [...state.starters], bench = [...state.bench]; starters[0] = incomingId; bench[bench.indexOf(incomingId)] = outgoing.id;
    click(view, `[data-arm-candidate="${incomingId}"]`);
    expect(saved().state).toEqual(reduceManager(state, { type: 'lineup', starters, bench })); expect(JSON.stringify(state)).toBe(original);
    expect(view.container.querySelector('[data-arm-slot="starter-0"]')).toHaveFocus();
    expect(view.container.querySelector('[data-arm-slot="starter-0"]')).toHaveTextContent(playerById(state, incomingId)!.name);
  });

  it('chooses an unused interchange player and cancels another picker without save or selection changes', () => {
    const view = start(), state = saved().state; tab(view, 'Squad'); click(view, '[data-arm-slot="bench-0"]');
    const incomingId = clubById(state, state.clubId)!.players.find(player => !state.starters.includes(player.id) && !state.bench.includes(player.id))!.id;
    const bench = [...state.bench]; bench[0] = incomingId; click(view, `[data-arm-candidate="${incomingId}"]`);
    expect(saved().state).toEqual(reduceManager(state, { type: 'lineup', starters: state.starters, bench }));
    const raw = localStorage.getItem(SAVE_KEY); click(view, '[data-arm-slot="bench-1"]'); tab(view, 'Back to squad');
    expect(localStorage.getItem(SAVE_KEY)).toBe(raw); expect(view.container.querySelector('[data-arm-slot="bench-1"]')).toHaveFocus();
  });

  it('passes exact training and non-first tactic choices through the real reducer and displays event-derived points', () => {
    const view = start(); const prepared = advance(view, { type: 'prepare', choice: 'train' }, '[data-arm-prepare="train"]');
    expect(clubById(prepared, prepared.clubId)!.players.every(player => player.prep === 8 && player.fatigue === 8)).toBe(true);
    const played = advance(view, { type: 'play', tactic: 'pressure' }, '[data-arm-tactic="pressure"]'); exactScore(view, played);
    const events = played.match!.events; expect(events.length).toBeGreaterThan(0);
    for (const id of [played.match!.homeId, played.match!.awayId]) {
      const value = id === played.match!.homeId ? played.match!.homeScore : played.match!.awayScore;
      expect(value.total).toBe(events.filter(event => event.clubId === id).reduce((sum, event) => sum + event.points, 0));
    }
    expect(saved().save.actions).toEqual([{ type: 'prepare', choice: 'train' }, { type: 'play', tactic: 'pressure' }]);
  });

  it('offers only same-role break swaps, commits original IDs and stops at the five-change game limit', () => {
    const view = start(); advance(view, { type: 'prepare', choice: 'rest' }, '[data-arm-prepare="rest"]'); advance(view, { type: 'play', tactic: 'direct' }, '[data-arm-tactic="direct"]');
    for (let index = 0; index < 5; index++) {
      const state = saved().state, out = view.getByRole('combobox', { name: 'Off the field' }) as HTMLSelectElement, incoming = view.getByRole('combobox', { name: 'On the field' }) as HTMLSelectElement;
      expect([...incoming.options].every(option => playerById(state, option.value)!.role === playerById(state, out.value)!.role)).toBe(true);
      advance(view, { type: 'swap', outId: out.value, inId: incoming.value }, '[data-arm-swap]');
    }
    const raw = localStorage.getItem(SAVE_KEY); expect(view.container.querySelector('[data-arm-swap]')).toBeDisabled(); click(view, '[data-arm-swap]'); expect(localStorage.getItem(SAVE_KEY)).toBe(raw);
    const next = advance(view, { type: 'next' }, '[data-arm-next]'); expect(next.swapsThisBreak).toBe(0); expect(next.phase).toBe('quarter');
  });

  it('finishes all ten real rounds with exact ladder and one undefined-score completion, then restores quietly', () => {
    const view = start(), complete = season(view), rows = ladderFor(complete);
    expect(complete.results).toHaveLength(30); expect(rows.every(row => row.played === 10)).toBe(true);
    expect(view.container.querySelector('[data-arm-winner]')).toHaveTextContent(clubById(complete, rows[0].clubId)!.name);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/aussie-rules-manager', undefined, null, 0);
    tab(view, 'Ladder'); for (const row of rows) expect(view.container.querySelector(`[data-arm-ladder="${row.clubId}"]`)).toHaveTextContent(row.percentage.toFixed(1));
    const raw = localStorage.getItem(SAVE_KEY); view.unmount(); const restored = draw();
    expect(phase(restored)).toHaveAttribute('data-arm-phase', 'complete'); expect(restored.container.querySelector('[data-arm-feedback]')).toBeNull();
    expect(localStorage.getItem(SAVE_KEY)).toBe(raw); expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('cues only a committed quarter, retains its node on clones, clears finite feedback and resumes exact break state', () => {
    const view = start(); advance(view, { type: 'prepare', choice: 'rest' }, '[data-arm-prepare="rest"]'); const played = advance(view, { type: 'play', tactic: 'control' }, '[data-arm-tactic="control"]');
    const feedback = view.container.querySelector('[data-arm-feedback]')!; expect(feedback).toHaveClass(styles.committed); expect(feedback).toHaveTextContent('Quarter 1 complete');
    const raw = localStorage.getItem(SAVE_KEY); view.rerender(<AussieRulesManagerBoard />); expect(view.container.querySelector('[data-arm-feedback]')).toBe(feedback); expect(localStorage.getItem(SAVE_KEY)).toBe(raw);
    act(() => vi.advanceTimersByTime(450)); expect(view.container.querySelector('[data-arm-feedback]')).toBeNull(); view.unmount();
    const restored = draw(); expect(saved().state).toEqual(played); expect(restored.container.querySelector('[data-arm-feedback]')).toBeNull(); exactScore(restored, played);
  });

  it('keeps the actual season playable and finishes once when storage refuses every write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage refused'); });
    const view = start(); expect(view.getByText(/could not save it/)).toBeVisible();
    const complete = season(view, createManager(SEED, 'club-0')!, false); expect(complete.results).toHaveLength(30);
    expect(localStorage.getItem(SAVE_KEY)).toBeNull(); expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/aussie-rules-manager', undefined, null, 0);
  });

  it('requires confirmation before replacing a season and restores focus on both cancel and the new club menu', () => {
    const view = start(), raw = localStorage.getItem(SAVE_KEY); tab(view, 'New season'); expect(localStorage.getItem(SAVE_KEY)).toBe(raw);
    tab(view, 'Keep this season'); expect(view.getByRole('button', { name: 'New season' })).toHaveFocus(); expect(localStorage.getItem(SAVE_KEY)).toBe(raw);
    tab(view, 'New season'); tab(view, 'Start a new season'); expect(phase(view)).toHaveAttribute('data-arm-phase', 'menu'); expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    expect(view.container.querySelector('[data-arm-club="club-0"]')).toHaveFocus(); expect(recordCompletion).not.toHaveBeenCalled();
  });
});
