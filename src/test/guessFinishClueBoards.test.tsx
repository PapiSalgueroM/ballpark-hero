import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType } from 'react';
import { CbbProgramBoard } from '@/components/cbb-program/CbbProgramBoard';
import { F1ConstructorBoard } from '@/components/f1-constructor/F1ConstructorBoard';
import { TennisPlayerBoard } from '@/components/tennis-player/TennisPlayerBoard';
import { NascarDriverBoard } from '@/components/nascar-driver/NascarDriverBoard';
import { recordCompletion } from '@/lib/completions';

/**
 * Round 953 review fix: the four clue boards the F1 driver test does not
 * cover (CBB program, F1 constructor, tennis player, NASCAR driver) are
 * mounted and played, so each board's own wiring of the shared moment is
 * checked: the pill against the board's own "pts" line and the score it
 * filed, a loss at 0 against the 0 it filed, and the live flag against a
 * reload. Every name, clue and row below is a synthetic fixture.
 */
const fixture = vi.hoisted(() => ({
  clues: ['Generated first clue', 'Generated second clue', 'Generated third clue', 'Generated fourth clue', 'Generated fifth clue', 'Generated sixth clue'],
  cbb: { id: 'fixture-school', school_name: 'Fixture School', common_names: ['Fixture School'], vibe_word: 'Generated vibe', region_hint: 'Generated region', conference_hint: 'Generated conference', tournament_hint: 'Generated tournament', championships_hint: 'Generated titles', mascot_hint: 'Generated mascot' },
  tennis: { id: 'fixture-tennis', player_name: 'Fixture Tennis Player', common_names: [], vibe_word: 'Generated vibe', nationality_era_hint: 'Generated nationality', tour_hint: 'Generated tour', slam_count_hint: 'Generated titles', slam_detail_hint: 'Generated details', famous_moment_hint: 'Generated moment' },
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  let single = false;
  const reply = () => {
    if (table === 'cbb_daily') return { data: { program_id: fixture.cbb.id }, error: null };
    if (table === 'tennis_daily') return { data: { player_id: fixture.tennis.id }, error: null };
    const row = table === 'cbb_programs' ? fixture.cbb : fixture.tennis;
    return { data: single ? row : [row], error: null };
  };
  type Reply = ReturnType<typeof reply>;
  type Query = { select: () => Query; eq: () => Query; order: () => Query; limit: () => Query; maybeSingle: () => Promise<Reply>; single: () => Promise<Reply>; then: (done: (value: Reply) => unknown) => Promise<unknown>; insert: () => Promise<{ error: null }> };
  const query: Query = { select: () => query, eq: () => query, order: () => query, limit: () => query, maybeSingle: () => { single = true; return Promise.resolve(reply()); }, single: () => { single = true; return Promise.resolve(reply()); }, then: done => Promise.resolve(reply()).then(done), insert: async () => ({ error: null }) };
  return query;
} } }));
vi.mock('@/data/f1Constructors', () => {
  const puzzle = { id: 'fixture-team', constructorName: 'Fixture Team', commonNames: ['Fixture Team'], clues: fixture.clues };
  return { getDailyF1ConstructorPuzzle: () => puzzle, getRandomF1ConstructorPuzzle: () => puzzle, resolveF1Constructor: (name: string) => ({ id: name === 'Fixture Team' ? puzzle.id : 'fixture-other' }) };
});
vi.mock('@/data/nascarDrivers.json', () => ({ default: { drivers: [{ id: 'fixture-racer', driver_name: 'Fixture Racer', common_names: ['Fixture Racer'], clue_labels: ['Fixture profile', 'Fixture era', 'Fixture team', 'Fixture starts', 'Fixture finish', 'Fixture achievement'], clues: fixture.clues }] } }));
vi.mock('@/components/cbb-program/CbbProgramSearch', () => ({ CbbProgramSearch: ({ onGuess }: { onGuess: (name: string) => void }) => <div><button onClick={() => onGuess('Fixture School')}>Fixture correct guess</button><button onClick={() => onGuess('Fixture Other')}>Fixture wrong guess</button></div> }));
vi.mock('@/components/f1-constructor/F1ConstructorSearch', () => ({ F1ConstructorSearch: ({ onGuess }: { onGuess: (name: string) => void }) => <div><button onClick={() => onGuess('Fixture Team')}>Fixture correct guess</button><button onClick={() => onGuess('Fixture Other')}>Fixture wrong guess</button></div> }));
vi.mock('@/components/tennis-player/TennisPlayerSearch', () => ({ TennisPlayerSearch: ({ onGuess }: { onGuess: (name: string) => void }) => <div><button onClick={() => onGuess('Fixture Tennis Player')}>Fixture correct guess</button><button onClick={() => onGuess('Fixture Other')}>Fixture wrong guess</button></div> }));
vi.mock('@/components/nascar-driver/NascarDriverSearch', () => ({ NascarDriverSearch: ({ onGuess }: { onGuess: (name: string) => void }) => <div><button onClick={() => onGuess('Fixture Racer')}>Fixture correct guess</button><button onClick={() => onGuess('Fixture Other')}>Fixture wrong guess</button></div> }));
vi.mock('@/components/cbb-program/CbbProgramHowToPlay', () => ({ CbbProgramHowToPlay: () => null }));
vi.mock('@/components/f1-constructor/F1ConstructorHowToPlay', () => ({ F1ConstructorHowToPlay: () => null }));
vi.mock('@/components/tennis-player/TennisPlayerHowToPlay', () => ({ TennisPlayerHowToPlay: () => null }));
vi.mock('@/components/nascar-driver/NascarDriverHowToPlay', () => ({ NascarDriverHowToPlay: () => null }));
vi.mock('@/hooks/useScrollToGame', () => ({ useScrollToGame: () => ({ current: null }) }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'FixtureBaller' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

type View = ReturnType<typeof render>;
const boards: { label: string; Board: ComponentType }[] = [
  { label: 'CBB Program', Board: CbbProgramBoard },
  { label: 'F1 Constructor', Board: F1ConstructorBoard },
  { label: 'Tennis Player', Board: TennisPlayerBoard },
  { label: 'NASCAR Driver', Board: NascarDriverBoard },
];

const q = (view: View, selector: string) => view.container.querySelector<HTMLElement>(selector);
const pill = (view: View) => q(view, '[data-result-score]')?.textContent;
const live = (view: View) => q(view, '[data-guess-finish]')?.getAttribute('data-guess-finish');
const confetti = (view: View) => view.container.querySelectorAll('.cm-confetti').length;
const filedScore = () => vi.mocked(recordCompletion).mock.calls.at(-1)?.[1];
const click = async (view: View, name: string | RegExp) => { await act(async () => { fireEvent.click(view.getAllByRole('button', { name })[0]); }); };
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

async function open(Board: ComponentType, mode: RegExp) {
  const view = render(<MemoryRouter><Board /></MemoryRouter>);
  await act(async () => {});
  await click(view, mode);
  return view;
}
async function miss(view: View) { await click(view, 'Fixture wrong guess'); tick(650); }

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-01T16:00:00Z')); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

for (const { label, Board } of boards) describe(label, () => {
  it(`${label}: a live win after a miss shows the board's own points, the ones it filed`, async () => {
    const view = await open(Board, /Unlimited Mode/);
    await miss(view);
    await click(view, 'Fixture correct guess');
    const line = view.getByText(/ pts$/, { selector: 'span' }).textContent!.replace(' pts', '');
    expect(q(view, '[data-result-moment]')).toHaveAttribute('data-result-moment', 'win');
    expect(pill(view)).toBe(line);
    expect(filedScore()).toBe(Number(line));
    expect(Number(line)).toBeGreaterThan(0);
    expect(live(view)).toBe('live');
    expect(confetti(view)).toBe(28);
  });

  it(`${label}: a live loss after a miss shows 0, the 0 the board filed, and no confetti`, async () => {
    const view = await open(Board, /Unlimited Mode/);
    await miss(view);
    await click(view, /Give Up$/);
    if (view.queryByRole('button', { name: 'Yes, Give Up' })) await click(view, 'Yes, Give Up');
    expect(q(view, '[data-result-moment]')).toHaveAttribute('data-result-moment', 'loss');
    expect(pill(view)).toBe('0');
    expect(filedScore()).toBe(0);
    expect(live(view)).toBe('live');
    expect(confetti(view)).toBe(0);
  });

  it(`${label}: a daily plays live once and comes back settled on a reload, same pill`, async () => {
    const first = await open(Board, /Daily Challenge/);
    await click(first, 'Fixture correct guess');
    expect(live(first)).toBe('live');
    const scored = pill(first);
    first.unmount();
    const again = await open(Board, /Daily Challenge/);
    expect(q(again, '[data-result-moment]')).toHaveAttribute('data-result-moment', 'win');
    expect(live(again)).toBe('restored');
    expect(pill(again)).toBe(scored);
    expect(confetti(again)).toBe(0);
  });
});
