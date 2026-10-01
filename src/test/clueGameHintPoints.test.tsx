import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { F1ConstructorBoard } from '@/components/f1-constructor/F1ConstructorBoard';
import { TennisPlayerBoard } from '@/components/tennis-player/TennisPlayerBoard';
import { GuessTheNationBoard } from '@/components/guess-the-nation/GuessTheNationBoard';
import { POINTS_BY_CLUE as constructorPoints } from '@/types/f1Constructor';
import { POINTS_BY_CLUE as tennisPoints } from '@/types/tennisPlayer';
import { POINTS_BY_CLUE as nationPoints } from '@/types/guessTheNation';
import { getDailyF1ConstructorPuzzle } from '@/data/f1Constructors';
import { recordCompletion } from '@/lib/completions';

const fixture = vi.hoisted(() => ({
  tennis: { id: 'fixture-tennis', player_name: 'Fixture Tennis Player', common_names: [], vibe_word: 'Generated vibe', nationality_era_hint: 'Generated nationality', tour_hint: 'Generated tour', slam_count_hint: 'Generated titles', slam_detail_hint: 'Generated details', famous_moment_hint: 'Generated moment' },
  nation: { id: 'fixture-nation', country_name: 'Fixture Nation', common_names: [], flag_emoji: '🌐', continent: 'Europe', difficulty: 'easy', season_focus: 'both', vibe_word: 'Generated vibe', continent_hint: 'Generated region', population_hint: 'Generated population', games_attended_hint: 'Generated attendance', total_medals_hint: 'Generated medals', best_sport_hint: 'Generated sport', famous_moment_hint: 'Generated moment', winter_history_hint: 'Generated winter', gold_medal_hint: 'Generated gold', flag_colors_hint: 'Generated colors', country_size_hint: 'Generated size', iconic_moment: 'Generated fixture only.' },
  inserts: [] as { table: string; value: unknown }[],
  clipboard: vi.fn(async (_text: string) => {}),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  let single = false;
  const reply = () => ({ data: table === 'tennis_daily' ? { player_id: fixture.tennis.id } : single ? fixture.tennis : table === 'tennis_players' ? [fixture.tennis] : [fixture.nation], error: null });
  type Query = { select: () => Query; eq: () => Query; order: () => Query; maybeSingle: () => Promise<ReturnType<typeof reply>>; single: () => Promise<ReturnType<typeof reply>>; then: (resolve: (value: ReturnType<typeof reply>) => unknown) => Promise<unknown>; insert: (value: unknown) => Promise<{ error: null }> };
  const query: Query = { select: () => query, eq: () => query, order: () => query, maybeSingle: () => { single = true; return Promise.resolve(reply()); }, single: () => { single = true; return Promise.resolve(reply()); }, then: (resolve: (value: ReturnType<typeof reply>) => unknown) => Promise.resolve(reply()).then(resolve), insert: (value: unknown) => { fixture.inserts.push({ table, value }); return Promise.resolve({ error: null }); } };
  return query;
} } }));
vi.mock('@/components/f1-constructor/F1ConstructorSearch', () => ({ F1ConstructorSearch: ({ onGuess, currentPuzzle }: { onGuess: (name: string) => void; currentPuzzle: { constructorName: string } }) => <div><button onClick={() => onGuess(currentPuzzle.constructorName)}>Fixture correct guess</button><button onClick={() => onGuess('Unknown generated answer')}>Fixture wrong guess</button></div> }));
vi.mock('@/components/tennis-player/TennisPlayerSearch', () => ({ TennisPlayerSearch: ({ onGuess }: { onGuess: (name: string) => void }) => <div><button onClick={() => onGuess(fixture.tennis.player_name)}>Fixture correct guess</button><button onClick={() => onGuess('Unknown generated answer')}>Fixture wrong guess</button></div> }));
vi.mock('@/components/guess-the-nation/NationSearch', () => ({ NationSearch: ({ onGuess }: { onGuess: (name: string) => void }) => <div><button onClick={() => onGuess(fixture.nation.country_name)}>Fixture correct guess</button><button onClick={() => onGuess('Unknown generated answer')}>Fixture wrong guess</button></div> }));
vi.mock('@/hooks/useScrollToGame', () => ({ useScrollToGame: () => ({ current: null }) }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'FixtureBaller', getLocalTodayCount: () => 0 }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

type Kind = 'constructor' | 'tennis' | 'nation';
function game(kind: Kind) {
  if (kind === 'constructor') return { Board: F1ConstructorBoard, points: constructorPoints, slug: 'f1-constructor', puzzleId: getDailyF1ConstructorPuzzle().id };
  if (kind === 'tennis') return { Board: TennisPlayerBoard, points: tennisPoints, slug: 'guess-tennis-player', puzzleId: fixture.tennis.id };
  return { Board: GuessTheNationBoard, points: nationPoints, slug: 'guess-the-nation', puzzleId: fixture.nation.id };
}
const click = (view: ReturnType<typeof render>, name: string | RegExp) => fireEvent.click(view.getByRole('button', { name }));
const tick = () => act(() => { vi.advanceTimersByTime(650); });
async function start(kind: Kind) {
  const spec = game(kind), view = render(<MemoryRouter><spec.Board /></MemoryRouter>);
  await act(async () => {});
  await act(async () => { click(view, /Daily Challenge/); });
  return { spec, view };
}
function saved(kind: Kind, clues: number, guesses: string[], score: number) {
  const spec = game(kind), raw = JSON.parse(localStorage.getItem(`${spec.slug}-daily-2026-10-01`)!);
  expect(raw).toEqual({ ...(kind === 'tennis' ? { puzzle: { id: fixture.tennis.id, player_name: fixture.tennis.player_name, common_names: [], clues: [fixture.tennis.vibe_word, fixture.tennis.nationality_era_hint, fixture.tennis.tour_hint, fixture.tennis.slam_count_hint, fixture.tennis.slam_detail_hint, fixture.tennis.famous_moment_hint] } } : { puzzleId: spec.puzzleId }), revealedClues: clues, guesses, gameStatus: 'won', score, v: 1, date: '2026-10-01' });
  expect(recordCompletion).toHaveBeenCalledExactlyOnceWith(`/${spec.slug}`, score, 'FixtureBaller', 0);
  if (kind !== 'constructor') expect(fixture.inserts).toEqual([{ table: kind === 'tennis' ? 'tennis_scores' : 'guess_nation_scores', value: { puzzle_date: '2026-10-01', clues_used: clues, score, guessed: true, mode: 'daily' } }]);
}

beforeEach(() => { localStorage.clear(); fixture.inserts.length = 0; vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-01T16:00:00Z')); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: fixture.clipboard } }); });
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); });

describe('Actual three-game hint copy and unchanged outcomes', () => {
  for (const kind of ['constructor', 'tennis', 'nation'] as const) {
    it(`${kind} advertises every original hint transition and exact count`, async () => {
      const { spec, view } = await start(kind);
      for (let clue = 1; clue < spec.points.length; clue++) {
        const hint = view.getByRole('button', { name: /Hint/ });
        expect(hint).toHaveTextContent(kind === 'nation' ? `Hint (-${spec.points[clue - 1] - spec.points[clue]} pts)` : `Hint (${spec.points[clue]} pts next)`);
        fireEvent.click(hint);
        expect(view.getByText(`${clue} hint${clue > 1 ? 's' : ''} used`)).toHaveTextContent(new RegExp(`^${clue} hints? used$`));
        expect(view.queryByText(/used \(-/)).toBeNull();
        expect(recordCompletion).not.toHaveBeenCalled(); expect(fixture.inserts).toEqual([]);
        const raw = JSON.parse(localStorage.getItem(`${spec.slug}-daily-2026-10-01`)!);
        expect(raw.revealedClues).toBe(clue + 1); expect(raw.guesses).toEqual([]); expect(raw.gameStatus).toBe('playing');
      }
      expect(view.queryByRole('button', { name: /Hint/ })).toBeNull();
      click(view, 'Fixture correct guess');
      const answer = kind === 'constructor' ? getDailyF1ConstructorPuzzle().constructorName : kind === 'tennis' ? fixture.tennis.player_name : fixture.nation.country_name;
      saved(kind, spec.points.length, kind === 'nation' ? [] : [answer], spec.points[spec.points.length - 1]);
      if (kind === 'tennis') for (const label of ['Vibe', 'Nationality & Era', 'Tour', 'Grand Slam Wins', 'Slams Won', 'Famous Moment']) expect(view.getByText(label, { exact: true })).toBeVisible();
    });

    it(`${kind} counts mixed misses and hints without a false flat penalty`, async () => {
      const { spec, view } = await start(kind);
      click(view, 'Fixture wrong guess'); tick(); click(view, /Hint/); click(view, 'Fixture wrong guess'); tick(); click(view, /Hint/);
      expect(view.getByText(/hints used/)).toHaveTextContent(/^2 hints used$/); expect(view.queryByText(/used \(-/)).toBeNull();
      const pending = JSON.parse(localStorage.getItem(`${spec.slug}-daily-2026-10-01`)!); expect(pending.revealedClues).toBe(5); expect(pending.guesses).toEqual(['Unknown generated answer', 'Unknown generated answer']);
      click(view, 'Fixture correct guess');
      const answer = kind === 'constructor' ? getDailyF1ConstructorPuzzle().constructorName : kind === 'tennis' ? fixture.tennis.player_name : fixture.nation.country_name;
      saved(kind, 5, ['Unknown generated answer', 'Unknown generated answer', ...(kind === 'nation' ? [] : [answer])], spec.points[4]);
      click(view, /Copy Score Card/);
      const name = kind === 'constructor' ? 'Guess The F1 Constructor' : kind === 'tennis' ? 'Guess The Tennis Player' : 'Guess The Nation';
      const emoji = kind === 'constructor' ? '🏎️' : kind === 'tennis' ? '🎾' : '🌍';
      const result = kind === 'nation' ? `I guessed today's Nation in 5 clues on DoUKnowBall!\nScore: ${spec.points[4]} 🌍` : `I guessed today's ${kind === 'constructor' ? 'F1 Constructor' : 'Tennis Player'} in 5 clues!\nScore: ${spec.points[4]} ${emoji}`;
      expect(fixture.clipboard).toHaveBeenCalledExactlyOnceWith(`${kind === 'constructor' ? '🏗️' : emoji} ${name}: Oct 1, 2026${kind === 'nation' ? `\nGuessed Fixture Nation for ${spec.points[4]} points` : ''}\nScore: ${result}\ndouknowball.com/${spec.slug}`);
      tick(); expect(recordCompletion).toHaveBeenCalledTimes(1);
    });
  }

  it('nation clears the previous round hint count through the existing Back to modes action', async () => {
    const { view } = await start('nation'); click(view, /Hint/); click(view, /Hint/); click(view, 'Fixture correct guess');
    const completed = localStorage.getItem('guess-the-nation-daily-2026-10-01');
    click(view, 'Back to modes'); await act(async () => { click(view, '🔄 Unlimited'); }); click(view, /Hint/);
    expect(view.getByText(/hint.*used/)).toHaveTextContent(/^1 hint used$/);
    expect(localStorage.getItem('guess-the-nation-daily-2026-10-01')).toBe(completed);
    click(view, 'Fixture correct guess');
    expect(recordCompletion).toHaveBeenCalledTimes(2); expect(vi.mocked(recordCompletion).mock.calls[1]).toEqual(['/guess-the-nation', 1100, 'FixtureBaller', 0]);
  });

  it('holds independent original no-hint payouts and exact saves across all three games', async () => {
    expect(constructorPoints).toEqual([1000, 800, 600, 400, 200, 100]); expect(tennisPoints).toEqual(constructorPoints); expect(nationPoints).toEqual([1200, 1100, 1000, 850, 700, 550, 400, 250, 150, 100, 50, 0]);
    for (const kind of ['constructor', 'tennis', 'nation'] as const) {
      localStorage.clear(); fixture.inserts.length = 0; vi.clearAllMocks();
      const { spec, view } = await start(kind); click(view, 'Fixture correct guess');
      const answer = kind === 'constructor' ? getDailyF1ConstructorPuzzle().constructorName : kind === 'tennis' ? fixture.tennis.player_name : fixture.nation.country_name;
      saved(kind, 1, kind === 'nation' ? [] : [answer], spec.points[0]); tick(); view.unmount();
    }
  });
});
