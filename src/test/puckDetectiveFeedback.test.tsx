import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import PuckDetective from '@/pages/PuckDetective';
import { buildPuckPool, buildShareGrid, evaluateGuess, pickDailyMystery, type PuckDetectivePlayer } from '@/lib/puckDetective';
import { normalizeName, type PlayerEntity, type SearchPlayersOptions } from '@/lib/playerSearch';
import { recordCompletion } from '@/lib/completions';
import { getStreakState } from '@/lib/streaks';
import { consumeRestoredFinish } from '@/lib/restoredFinish';
import styles from '@/pages/PuckDetective.module.css';

const sink = vi.hoisted(() => ({ rows: [] as unknown[], session: vi.fn(async () => ({ data: { session: null } })) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => ({ insert: (row: unknown) => { sink.rows.push(row); return Promise.resolve({ error: null }); } }),
  auth: { getSession: sink.session },
} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/lib/puckDetective', async original => ({ ...await original<typeof import('@/lib/puckDetective')>(), fetchPuckDetectivePool: vi.fn(async () => pool) }));
vi.mock('@/lib/playerSearch', async original => {
  const actual = await original<typeof import('@/lib/playerSearch')>();
  return { ...actual, searchPlayers: vi.fn(async (options: SearchPlayersOptions) => ({ error: null, results:
    options.query === 'unknown' ? [entity({ ...pool[0], name: 'Fixture Unknown' })] :
    options.query === 'duplicate' ? [entity(misses[0])] :
    pool.filter(p => actual.normalizeName(p.name).includes(actual.normalizeName(options.query)) && !options.exclude?.has(actual.normalizeName(p.name))).map(entity),
  })) };
});
vi.mock('@/lib/completions', async original => {
  const actual = await original<typeof import('@/lib/completions')>();
  return { ...actual, recordCompletion: vi.fn(actual.recordCompletion) };
});
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => <nav>Fixture navigation</nav> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));

let pool: PuckDetectivePlayer[];
let secret: PuckDetectivePlayer;
let misses: PuckDetectivePlayer[];
const entity = (p: PuckDetectivePlayer): PlayerEntity => ({ key: normalizeName(p.name), name: p.name, rawName: p.name,
  meta: { position: p.position, team: p.team }, matchRank: 0, prominence: p.playerId });
const clipboard = vi.fn(async (_text: string) => {});
const element = () => <MemoryRouter initialEntries={['/puck-detective']}><HelmetProvider><PuckDetective /></HelmetProvider></MemoryRouter>;
const start = async () => {
  const view = render(element()); await act(async () => {}); view.getByRole('combobox'); return view;
};
const card = (view: ReturnType<typeof render>, p: PuckDetectivePlayer) => view.container.querySelector<HTMLElement>(`[data-puck-guess="${p.playerId}"]`)!;
const cues = (view: ReturnType<typeof render>) => view.container.querySelectorAll('[data-puck-cue]');
const search = async (view: ReturnType<typeof render>, query: string) => {
  const input = view.getByRole('combobox'); act(() => input.focus()); fireEvent.change(input, { target: { value: query } });
  await act(async () => { vi.advanceTimersByTime(210); }); view.getByRole('option');
  return input;
};
const guess = async (view: ReturnType<typeof render>, p: PuckDetectivePlayer, pointer = false) => {
  const input = await search(view, p.name); const option = view.getByRole('option');
  if (pointer) fireEvent.pointerDown(option);
  else { fireEvent.keyDown(input, { key: 'ArrowDown' }); fireEvent.keyDown(input, { key: 'Enter' }); }
  return card(view, p);
};
const clock = () => vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
const settle = async () => { await act(async () => { vi.advanceTimersByTime(700); }); };
const giveUp = (view: ReturnType<typeof render>) => {
  fireEvent.click(view.getByRole('button', { name: 'Give up' })); fireEvent.click(view.getByRole('button', { name: 'Yes, reveal it' }));
};
const saveKey = 'puck-detective-daily-2026-10-01';

beforeEach(() => {
  vi.clearAllMocks(); sink.rows = []; localStorage.clear(); localStorage.setItem('dukb-guest-handle', 'FixtureBaller');
  localStorage.setItem('rules-gate-seen:/puck-detective', '1'); consumeRestoredFinish('puck-detective');
  vi.useRealTimers(); vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] }); vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0);
  pool = Array.from({ length: 30 }, (_, i) => ({ playerId: 1000 + i, name: `Fixture Skater ${String(i).padStart(2, '0')}`,
    position: 'C', group: 'forward', team: 'FIX', country: 'CAN', age: 30, jerseyNumber: 50, careerPoints: [500, 100, 10][i % 3] }));
  secret = pickDailyMystery(pool); misses = pool.filter(p => p.playerId !== secret.playerId);
  Object.assign(misses[0], { name: 'Fixture Exceptionally Long Full Skater Name For Guess History', position: 'L', team: 'OTHER', country: 'USA', age: 25, jerseyNumber: 70 });
  Object.assign(misses[1], { position: 'D', group: 'defense', age: 35, jerseyNumber: null });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: clipboard } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Puck Detective committed guess feedback', () => {
  it('preserves real helper tiers, numeric directions, pool filtering and untouched boot outcomes', async () => {
    const view = await start();
    expect(evaluateGuess(misses[0], secret)).toEqual({ team: 'none', position: 'close', country: 'none', ageDirection: 'higher', jerseyDirection: 'lower' });
    expect(evaluateGuess(misses[1], secret)).toEqual({ team: 'exact', position: 'none', country: 'exact', ageDirection: 'lower', jerseyDirection: 'match' });
    expect(buildPuckPool('easy', pool)).toHaveLength(10); expect(buildPuckPool('hard', pool)).toHaveLength(10);
    expect(cues(view)).toHaveLength(0); expect(recordCompletion).not.toHaveBeenCalled(); expect(sink.rows).toEqual([]);
    expect(getStreakState().totalPlays).toBe(0); expect(localStorage.getItem(saveKey)).toBeNull();
  });

  it('reveals exactly accepted original guesses with truthful attribute labels and stable older cards', async () => {
    const view = await start(); const first = await guess(view, misses[0], true);
    expect(first).toHaveAttribute('data-puck-cue', 'clues'); expect(first).toHaveClass(styles.guessCue);
    expect(first.querySelector('[data-puck-attribute="team"]')).toHaveAttribute('aria-label', 'Team: OTHER, no match');
    expect(first.querySelector('[data-puck-attribute="position"]')).toHaveAttribute('aria-label', 'Position: Left Wing, same position group');
    expect(first.querySelector('[data-puck-attribute="age"]')).toHaveAttribute('aria-label', 'Age: 25, mystery number is higher');
    expect(first.querySelector('[data-puck-attribute="jersey"]')).toHaveAttribute('aria-label', 'Jersey: 70, mystery number is lower');
    expect(within(first).getByRole('status')).toHaveTextContent(`Guess 1: ${misses[0].name}. Clues revealed.`);
    const second = await guess(view, misses[1]); expect(card(view, misses[0])).toBe(first);
    expect(first).not.toHaveAttribute('data-puck-cue'); expect(second).toHaveAttribute('data-puck-cue', 'clues');
    expect(second.querySelector('[data-puck-attribute="jersey"]')).toHaveAttribute('aria-label', 'Jersey: ?, number unknown');
    expect(first).toHaveTextContent('#1'); expect(second).toHaveTextContent('#2');
    expect(JSON.parse(localStorage.getItem(saveKey)!)).toMatchObject({ guesses: [{ playerId: misses[0].playerId }, { playerId: misses[1].playerId }], gameStatus: 'playing' });
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('keeps unknown and duplicate selections quiet without another saved guess', async () => {
    const view = await start(); clock(); await guess(view, misses[0]); await settle(); const raw = localStorage.getItem(saveKey);
    const input = await search(view, 'unknown'); fireEvent.keyDown(input, { key: 'ArrowDown' }); fireEvent.keyDown(input, { key: 'Enter' });
    expect(cues(view)).toHaveLength(0); expect(localStorage.getItem(saveKey)).toBe(raw);
    await search(view, 'duplicate'); fireEvent.keyDown(input, { key: 'ArrowDown' }); fireEvent.keyDown(input, { key: 'Enter' });
    expect(cues(view)).toHaveLength(0); expect(localStorage.getItem(saveKey)).toBe(raw); expect(input).toHaveValue('');
    expect(recordCompletion).not.toHaveBeenCalled(); expect(view.container.querySelectorAll('[data-puck-guess]')).toHaveLength(1);
  });

  it('keeps live clones stable and clears finite cues and owned timers without replay', async () => {
    const view = await start(); clock(); const first = await guess(view, misses[0]); const receipt = within(first).getByRole('status');
    await act(async () => { vi.advanceTimersByTime(150); }); view.rerender(element());
    expect(card(view, misses[0])).toBe(first); expect(within(first).getByRole('status')).toBe(receipt); expect(first).toHaveClass(styles.guessCue);
    await settle(); expect(first).not.toHaveClass(styles.guessCue); expect(cues(view)).toHaveLength(0);
    view.rerender(element()); expect(cues(view)).toHaveLength(0);
    const schedule = vi.spyOn(window, 'setTimeout'); const cancel = vi.spyOn(window, 'clearTimeout');
    await guess(view, misses[1]);
    const ownTimerIndex = schedule.mock.calls.findIndex(call => call[1] === 600);
    expect(ownTimerIndex).toBeGreaterThanOrEqual(0); const ownTimer = schedule.mock.results[ownTimerIndex].value;
    view.unmount(); expect(cancel).toHaveBeenCalledWith(ownTimer);
  });

  it('restores partial and finished original daily histories quietly without recording them again', async () => {
    localStorage.setItem(saveKey, JSON.stringify({ v: 1, date: '2026-10-01', puzzleIndex: 0, guesses: [{ playerId: misses[0].playerId }], gameStatus: 'playing' }));
    const view = await start(); expect(card(view, misses[0])).toHaveTextContent(misses[0].name); expect(cues(view)).toHaveLength(0); view.unmount();
    localStorage.setItem(saveKey, JSON.stringify({ v: 1, date: '2026-10-01', puzzleIndex: 0, guesses: [{ playerId: secret.playerId }], gameStatus: 'won' }));
    const restored = render(element()); await act(async () => {}); restored.getByRole('heading', { name: 'Case closed!' });
    expect(cues(restored)).toHaveLength(0); expect(recordCompletion).not.toHaveBeenCalled(); restored.rerender(element()); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('keeps mode changes difficulty resets and new rounds quiet while preserving unlimited streak and best', async () => {
    const view = await start(); clock(); await guess(view, misses[0]);
    fireEvent.click(view.getByRole('button', { name: '∞ Unlimited' })); expect(cues(view)).toHaveLength(0);
    fireEvent.click(view.getByRole('button', { name: '📅 Daily' })); expect(cues(view)).toHaveLength(0);
    fireEvent.click(view.getByRole('button', { name: '∞ Unlimited' }));
    await guess(view, pool[0]); expect(view.getByRole('heading', { name: 'Case closed!' })).toBeVisible();
    expect(localStorage.getItem('puck-detective-best-v1')).toBe('1'); expect(recordCompletion).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('button', { name: 'New player' })); expect(cues(view)).toHaveLength(0); expect(view.getByRole('combobox')).toHaveValue('');
    fireEvent.click(view.getByRole('button', { name: 'hard' })); expect(cues(view)).toHaveLength(0); expect(localStorage.getItem('puck-detective-difficulty')).toBe('hard');
    expect(view.container.querySelectorAll('[data-puck-guess]')).toHaveLength(0);
    await guess(view, buildPuckPool('hard', pool)[0]); expect(localStorage.getItem('puck-detective-best-v1')).toBe('2');
    expect(recordCompletion).not.toHaveBeenCalled(); expect(sink.rows).toEqual([]);
  });

  it('preserves exact daily win score original share grid and one real completion through mode toggles and reload', async () => {
    const view = await start(); await guess(view, misses[0]); await guess(view, misses[1]); await guess(view, secret);
    expect(card(view, secret)).toHaveAttribute('data-puck-cue', 'correct');
    expect(view.getByRole('heading', { name: 'Case closed!' })).toBeVisible();
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/puck-detective', 60, 'FixtureBaller', 0);
    expect(sink.rows).toEqual([{ game: 'puck-detective', score: 60, player_name: 'FixtureBaller' }]);
    expect(getStreakState()).toMatchObject({ totalPlays: 1, totalPoints: 60 });
    const grid = buildShareGrid([misses[0], misses[1], secret].map(player => ({ player, feedback: evaluateGuess(player, secret), isCorrect: player.playerId === secret.playerId })));
    expect(grid).toBe('🟥🟨🟥🟨🟨\n🟩🟥🟩🟨🟩\n🟩🟩🟩🟩🟩');
    await act(async () => fireEvent.click(view.getByRole('button', { name: '📋 Copy Score Card' })));
    expect(clipboard).toHaveBeenCalledTimes(1); expect(clipboard.mock.calls[0][0]).toContain(grid); expect(clipboard.mock.calls[0][0]).toContain('3/8');
    fireEvent.click(view.getByRole('button', { name: '∞ Unlimited' })); fireEvent.click(view.getByRole('button', { name: '📅 Daily' }));
    expect(recordCompletion).toHaveBeenCalledTimes(1); expect(cues(view)).toHaveLength(0); const raw = localStorage.getItem(saveKey); view.unmount();
    const reload = render(element()); await act(async () => {}); reload.getByRole('heading', { name: 'Case closed!' });
    expect(recordCompletion).toHaveBeenCalledTimes(1); expect(localStorage.getItem(saveKey)).toBe(raw); expect(cues(reload)).toHaveLength(0);
  });

  it('preserves eight-guess loss and give-up zero outcomes without a fake guess or extra finish', async () => {
    const view = await start(); for (const p of misses.slice(0, 8)) await guess(view, p);
    expect(view.getByRole('heading', { name: 'Out of guesses' })).toBeVisible(); expect(cues(view)).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(saveKey)!)).toMatchObject({ guesses: misses.slice(0, 8).map(p => ({ playerId: p.playerId })), gameStatus: 'lost' });
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/puck-detective', 0, 'FixtureBaller', 0); expect(view.queryByRole('combobox')).toBeNull();
    view.rerender(element()); expect(recordCompletion).toHaveBeenCalledTimes(1); view.unmount(); localStorage.removeItem(saveKey); vi.mocked(recordCompletion).mockClear();
    const fresh = await start(); giveUp(fresh); expect(fresh.container.querySelectorAll('[data-puck-guess]')).toHaveLength(0); expect(cues(fresh)).toHaveLength(0);
    expect(localStorage.getItem('puck-detective-giveup-2026-10-01')).toBe('1'); expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/puck-detective', 0, 'FixtureBaller', 0);
  });

  it('retains full guess text scoped wrapping and reachable owned control sizes', async () => {
    const view = await start(); const row = await guess(view, misses[0]); const name = within(row).getByText(misses[0].name);
    expect(name).toHaveClass(styles.fullName); expect(name).not.toHaveClass('truncate');
    for (const label of ['📅 Daily', '∞ Unlimited']) expect(view.getByRole('button', { name: label })).toHaveClass('min-h-[44px]');
    fireEvent.click(view.getByRole('button', { name: '∞ Unlimited' }));
    for (const label of ['easy', 'normal', 'hard']) expect(view.getByRole('button', { name: label })).toHaveClass('min-h-[44px]');
  });

  it('binds finite real cue declarations and static reduced motion to the accepted row', async () => {
    const css = readFileSync(process.env.PUCK_DETECTIVE_CSS || path.resolve('src/pages/PuckDetective.module.css'), 'utf8');
    const style = document.createElement('style');
    style.textContent = css.split('.guessCue').join(`.${styles.guessCue}`).split('.attributeCue').join(`.${styles.attributeCue}`);
    document.head.append(style);
    try {
      const view = await start(); const row = await guess(view, misses[0]);
      expect(getComputedStyle(row).animation).toBe('guessReveal 420ms ease-out 1');
      expect(getComputedStyle(row.querySelector('[data-puck-attribute]')!.parentElement!).animation).toBe('attributeReveal 360ms ease-out 1');
      const quiet = [...style.sheet!.cssRules].find(rule => 'conditionText' in rule && rule.conditionText === '(prefers-reduced-motion: reduce)') as CSSMediaRule;
      expect(quiet).toBeDefined(); expect((quiet.cssRules[0] as CSSStyleRule).style.animation).toBe('none');
      expect((quiet.cssRules[0] as CSSStyleRule).selectorText).toContain(styles.guessCue);
      expect((quiet.cssRules[0] as CSSStyleRule).selectorText).toContain(styles.attributeCue);
    } finally { style.remove(); }
  });
});
