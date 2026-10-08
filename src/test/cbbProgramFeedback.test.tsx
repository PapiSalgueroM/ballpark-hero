import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CbbProgramBoard } from '@/components/cbb-program/CbbProgramBoard';
import { recordCompletion } from '@/lib/completions';
import { POINTS_BY_CLUE } from '@/types/cbbProgram';
import styles from '@/components/cbb-program/CbbProgramFeedback.module.css';
import { formatNumber } from '@/lib/formatNumber';

const fixture = vi.hoisted(() => ({
  puzzle: { id: 'fiction-school', school_name: 'Fixture School', common_names: ['Fixture School'], clues: ['Generated first clue', 'Generated second clue', 'Generated third clue', 'Generated fourth clue', 'Generated fifth clue', 'Generated sixth clue'] },
  clipboard: vi.fn(async (_text: string) => {}), insert: vi.fn(async (_value: unknown) => ({})), daily: true,
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  const row = { id: fixture.puzzle.id, school_name: fixture.puzzle.school_name, common_names: fixture.puzzle.common_names, vibe_word: fixture.puzzle.clues[0], region_hint: fixture.puzzle.clues[1], conference_hint: fixture.puzzle.clues[2], tournament_hint: fixture.puzzle.clues[3], championships_hint: fixture.puzzle.clues[4], mascot_hint: fixture.puzzle.clues[5] };
  if (table === 'cbb_scores') return { insert: fixture.insert };
  if (table === 'cbb_daily') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: fixture.daily ? { program_id: row.id } : null }) }) }) };
  if (table === 'cbb_programs') return { select: () => ({ order: async () => ({ data: [row], error: null }), eq: () => ({ single: async () => ({ data: row }) }) }) };
  throw new Error('Unexpected table');
} } }));
vi.mock('@/components/cbb-program/CbbProgramSearch', () => ({ CbbProgramSearch: ({ onGuess }: { onGuess: (name: string) => void }) => <div><button onClick={() => onGuess('Fixture School')}>Fixture correct guess</button><button onClick={() => onGuess('Fixture Other')}>Fixture wrong guess</button></div> }));
vi.mock('@/hooks/useScrollToGame', () => ({ useScrollToGame: () => ({ current: null }) }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'FixtureBaller' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const board = () => <MemoryRouter><CbbProgramBoard /></MemoryRouter>;
const mount = async () => { const view = render(board()); await act(async () => {}); return view; };
const click = (view: ReturnType<typeof render>, name: string | RegExp) => fireEvent.click(view.getByRole('button', { name }));
const start = async (view: ReturnType<typeof render>, daily = false) => { await act(async () => { click(view, daily ? /Daily Challenge/ : /Unlimited Mode/); }); };
const correct = (view: ReturnType<typeof render>) => click(view, 'Fixture correct guess');
const wrong = (view: ReturnType<typeof render>) => click(view, 'Fixture wrong guess');
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const cue = (view: ReturnType<typeof render>) => view.container.querySelector<HTMLElement>('[data-cbb-program-feedback]');
const result = (view: ReturnType<typeof render>) => view.container.querySelector<HTMLElement>('[data-cbb-program-result]');
const saved = () => JSON.parse(localStorage.getItem('guess-cbb-team-daily-2026-10-01')!);
const exactSaved = (clues: number, guesses: string[], status: string, score: number) => ({ puzzle: fixture.puzzle, revealedClues: clues, guesses, gameStatus: status, score, v: 1, date: '2026-10-01' });

beforeEach(() => {
  fixture.daily = true; localStorage.clear(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: fixture.clipboard } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('actual CBB program committed feedback', () => {
  it('never calls a committed first-clue win wrong at the old delayed boundary', async () => {
    const view = await mount(); await start(view, true); correct(view);
    tick(50); expect(view.queryByText('Wrong guess! Try again...')).toBeNull();
    expect(view.getByText('1,000 pts')).toBeVisible(); expect(cue(view)).toHaveAttribute('data-cbb-program-feedback', 'correct');
    expect(result(view)).toHaveAttribute('data-cbb-program-result', 'won'); expect(result(view)).toHaveClass(styles.won);
    expect(cue(view)).toHaveTextContent('Correct guess. Program found.');
    expect(saved()).toEqual(exactSaved(1, ['Fixture School'], 'won', 1000)); expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-cbb-team', 1000, 'FixtureBaller', 0);
    tick(550); expect(cue(view)).toBeNull(); expect(result(view)).toBeNull(); expect(view.getByText('1,000 pts')).toBeVisible();
  });

  it('cues each actual repeated wrong append while preserving stable clues and the 600 win', async () => {
    const view = await mount(); await start(view, true); const nodes = [...view.container.querySelectorAll('[data-cbb-program-clue]')];
    const action = view.getByRole('button', { name: 'Fixture wrong guess' }); wrong(view);
    const first = cue(view); expect(first).toHaveAttribute('data-cbb-program-feedback', 'wrong'); expect(first).toHaveClass(styles.reply);
    expect(view.getByText(/Clue 2\/6/)).toBeVisible(); tick(600); expect(cue(view)).toBeNull(); wrong(view);
    expect(cue(view)).toHaveAttribute('data-cbb-program-feedback', 'wrong'); expect(cue(view)).not.toBe(first);
    expect(view.getByRole('button', { name: 'Fixture wrong guess' })).toBe(action);
    expect(saved()).toEqual(exactSaved(3, ['Fixture Other', 'Fixture Other'], 'playing', 0));
    correct(view); expect(cue(view)).toHaveAttribute('data-cbb-program-feedback', 'correct'); expect(view.getByText('600 pts')).toBeVisible();
    [...view.container.querySelectorAll('[data-cbb-program-clue]')].forEach((node, i) => expect(node).toBe(nodes[i]));
    expect(saved()).toEqual(exactSaved(3, ['Fixture Other', 'Fixture Other', 'Fixture School'], 'won', 600));
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-cbb-team', 600, 'FixtureBaller', 0);
  });

  it('keeps unchanged clones and empty initial state quiet without restarting a live cue', async () => {
    const view = await mount(); expect(cue(view)).toBeNull(); await start(view);
    expect(cue(view)).toBeNull(); wrong(view); const reply = cue(view); tick(300); view.rerender(board()); expect(cue(view)).toBe(reply);
    tick(300); expect(cue(view)).toBeNull(); view.rerender(board()); tick(50); expect(cue(view)).toBeNull();
    expect(recordCompletion).not.toHaveBeenCalled(); expect(fixture.insert).not.toHaveBeenCalled(); expect(localStorage.length).toBe(0);
  });

  it('restores completed and partial dailies quietly without paying a restored finish', async () => {
    localStorage.setItem('guess-cbb-team-daily-2026-10-01', JSON.stringify(exactSaved(3, ['Fixture Other', 'Fixture Other', 'Fixture School'], 'won', 600)));
    const raw = localStorage.getItem('guess-cbb-team-daily-2026-10-01'), view = await mount(); await start(view, true); tick(800);
    expect(view.getByText('600 pts')).toBeVisible(); expect(cue(view)).toBeNull(); expect(result(view)).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
    expect(localStorage.getItem('guess-cbb-team-daily-2026-10-01')).toBe(raw); view.unmount();
    localStorage.setItem('guess-cbb-team-daily-2026-10-01', JSON.stringify(exactSaved(2, ['Fixture Other'], 'playing', 0)));
    const partial = await mount(); await start(partial, true); expect(cue(partial)).toBeNull();
    const activeRaw = localStorage.getItem('guess-cbb-team-daily-2026-10-01');
    click(partial, 'How to Play'); expect(partial.getByRole('dialog', { name: 'How to Play' })).toBeVisible();
    click(partial, 'Close'); expect(partial.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem('guess-cbb-team-daily-2026-10-01')).toBe(activeRaw);
    expect(saved()).toEqual(exactSaved(2, ['Fixture Other'], 'playing', 0));
    expect(recordCompletion).not.toHaveBeenCalled(); expect(fixture.insert).not.toHaveBeenCalled();
    expect(partial.getByText(/Clue 2\/6/)).toBeVisible(); correct(partial);
    expect(partial.getByText('800 pts')).toBeVisible(); expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-cbb-team', 800, 'FixtureBaller', 0);
  });

  it('reports the exhausted last miss truthfully and preserves exact zero-score loss', async () => {
    const view = await mount(); await start(view, true); for (let i = 0; i < 6; i++) wrong(view);
    expect(cue(view)).toHaveAttribute('data-cbb-program-feedback', 'wrong'); expect(cue(view)).toHaveTextContent('Wrong guess. The answer is below.');
    expect(view.queryByText('Wrong guess! Try again...')).toBeNull(); expect(result(view)).toHaveClass(styles.lost);
    expect(view.getByText('It was Fixture School')).toBeVisible(); expect(saved()).toEqual(exactSaved(6, Array(6).fill('Fixture Other'), 'lost', 0));
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-cbb-team', 0, 'FixtureBaller', 0);
    expect(fixture.insert).toHaveBeenCalledExactlyOnceWith({ puzzle_date: '2026-10-01', clues_used: 6, score: 0, guessed: false, mode: 'daily' }); tick(600); expect(cue(view)).toBeNull(); expect(result(view)).toBeNull();
  });

  it('clears reset and unmount timers rather than leaking delayed wrong work', async () => {
    const view = await mount(); await start(view); correct(view); expect(vi.getTimerCount()).toBe(1); click(view, 'Play Again');
    expect(vi.getTimerCount()).toBe(0); tick(800); await start(view); expect(cue(view)).toBeNull(); wrong(view); expect(vi.getTimerCount()).toBe(1);
    view.unmount(); expect(vi.getTimerCount()).toBe(0); tick(800);
  });

  it('keeps immediate give-up separate from an active wrong cue and preserves zero-guess give-up', async () => {
    const view = await mount(); await start(view, true); wrong(view); tick(100); expect(cue(view)).toHaveAttribute('data-cbb-program-feedback', 'wrong');
    click(view, /^🏳️ Give Up$/); expect(cue(view)).toBeNull(); expect(result(view)).toBeNull();
    expect(fixture.insert).not.toHaveBeenCalled(); expect(saved()).toEqual(exactSaved(2, ['Fixture Other'], 'lost', 0));
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-cbb-team', 0, 'FixtureBaller', 0); view.unmount();
    localStorage.clear(); vi.mocked(recordCompletion).mockClear(); const fresh = await mount(); await start(fresh);
    click(fresh, /^🏳️ Give Up$/); expect(cue(fresh)).toBeNull(); expect(result(fresh)).toBeNull(); expect(fixture.insert).not.toHaveBeenCalled();
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-cbb-team', 0, 'FixtureBaller', 0);
  });

  it('binds complete previous-guess text to the owned wrapping rule', async () => {
    const view = await mount(); await start(view); wrong(view);
    const name = view.getByText('Fixture Other'); expect(name).toHaveClass(styles.guessName); expect(name.textContent).toBe('Fixture Other');
    const css = readFileSync(process.env.CBB_PROGRAM_FEEDBACK_CSS || path.resolve('src/components/cbb-program/CbbProgramFeedback.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/\.guessName\s*\{\s*min-width:\s*0;\s*max-width:\s*100%;\s*overflow-wrap:\s*anywhere;/);
  });

  it('binds finite once-only cues with a static reduced-motion override', async () => {
    const css = readFileSync(process.env.CBB_PROGRAM_FEEDBACK_CSS || path.resolve('src/components/cbb-program/CbbProgramFeedback.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/\.reply\s*\{\s*animation:\s*programReply 420ms ease-out 1;/);
    expect(css).toMatch(/\.won\s*\{\s*animation:\s*programWon 420ms ease-out 1;/); expect(css).toMatch(/\.lost\s*\{\s*animation:\s*programLost 420ms ease-out 1;/);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.reply,\s*\.won,\s*\.lost\s*\{\s*animation:\s*none;/);
    const view = await mount(); await start(view); wrong(view); expect(cue(view)).toHaveClass(styles.reply);
  });

  it('holds independent original six-clue points exact saves full shares and once completion', async () => {
    expect(POINTS_BY_CLUE).toEqual([1000, 800, 600, 400, 200, 100]);
    for (let misses = 0; misses < 6; misses++) {
      fixture.daily = misses % 2 === 0;
      localStorage.clear(); vi.mocked(recordCompletion).mockClear(); fixture.clipboard.mockClear(); fixture.insert.mockClear(); const view = await mount(); await start(view, true);
      for (let i = 0; i < misses; i++) wrong(view); correct(view); const clues = misses + 1, score = [1000, 800, 600, 400, 200, 100][misses];
      expect(view.getByText(`${formatNumber(score)} pts`)).toBeVisible(); expect(saved()).toEqual(exactSaved(clues, [...Array(misses).fill('Fixture Other'), 'Fixture School'], 'won', score));
      expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-cbb-team', score, 'FixtureBaller', 0);
      expect(fixture.insert).toHaveBeenCalledExactlyOnceWith({ puzzle_date: '2026-10-01', clues_used: clues, score, guessed: true, mode: 'daily' });
      ['Vibe', 'Region & State', 'Conference', 'Tournament History', 'Championships', 'Mascot'].forEach(label => expect(view.getByText(label)).toBeVisible());
      fixture.puzzle.clues.forEach(clue => expect(view.getByText(clue)).toBeVisible());
      await act(async () => { click(view, '📋 Copy Score Card'); });
      expect(fixture.clipboard).toHaveBeenCalledExactlyOnceWith(`🏀 Guess The CBB Program: Oct 1, 2026\nScore: I guessed today's College Basketball Program in ${clues} clue${clues > 1 ? 's' : ''}!\nScore: ${score} 🏀\ndouknowball.com/guess-cbb-team`);
      view.rerender(board()); tick(800); expect(recordCompletion).toHaveBeenCalledTimes(1); view.unmount();
    }
  });
});
