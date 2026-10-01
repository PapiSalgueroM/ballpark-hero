import { Children, type ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import GameSeoContent from '@/components/seo/GameSeoContent';
import F1Constructor from '@/pages/F1Constructor';
import { useF1Constructor } from '@/hooks/useF1Constructor';
import { loadGameContent } from '@/data/gameContent/loader';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/data/f1Constructors', () => {
  // Only the deal boundary is fictional. The hook, clue ladder and guide remain actual source.
  const puzzle = { id: 'fixture-team', constructorName: 'Fixture team', commonNames: ['Fixture team'], clues: ['Fixture vibe', 'Fixture country', 'Fixture era', 'Fixture championships', 'Fixture livery', 'Fixture driver'] };
  return { getDailyF1ConstructorPuzzle: () => puzzle, getRandomF1ConstructorPuzzle: () => puzzle, resolveF1Constructor: (name: string) => ({ id: name === 'Fixture team' ? puzzle.id : 'fixture-other' }) };
});

beforeEach(() => { localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('F1 constructor worked example agrees with actual scoring', () => {
  it('renders the championship example at the fourth-clue score with no prior wrong guesses', async () => {
    await loadGameContent('/f1-constructor');
    const view = render(<HelmetProvider><MemoryRouter initialEntries={['/f1-constructor']}><GameSeoContent pageHasOwnH1 title="Constructor guide" description="Fixture guide mount" /></MemoryRouter></HelmetProvider>);
    const { result } = renderHook(() => useF1Constructor());
    act(() => result.current.startGame('unlimited'));
    for (let clue = 1; clue < 4; clue += 1) act(() => result.current.revealHint());
    expect(result.current.gameState?.revealedClues).toBe(4);
    expect(result.current.gameState?.guesses).toEqual([]);
    expect(result.current.pointsForCurrentClue).toBe(400);
    act(() => result.current.makeGuess('Fixture team'));
    expect(result.current.gameState).toMatchObject({ revealedClues: 4, guesses: ['Fixture team'], gameStatus: 'won', score: 400 });
    const example = view.getByText(/^Holding out for the championship clue,/);
    expect(example).toBeVisible();
    expect(example.textContent).toBe(`Holding out for the championship clue, a count of 16 titles, would have confirmed it at ${result.current.gameState!.score}. Some clues are worth skipping.`);
    expect(view.getByText('Iconic plus Italy has one obvious owner. Ferrari on clue two banks 800 points.')).toBeVisible();
  });

  it('preserves independent earlier and later clue payouts through the unchanged hook', () => {
    for (const [clue, score] of [[1, 1000], [2, 800], [3, 600], [5, 200], [6, 100]]) {
      const { result, unmount } = renderHook(() => useF1Constructor());
      act(() => result.current.startGame('unlimited'));
      for (let hint = 1; hint < clue; hint += 1) act(() => result.current.revealHint());
      expect(result.current.gameState?.guesses).toEqual([]);
      expect(result.current.pointsForCurrentClue).toBe(score);
      act(() => result.current.makeGuess('Fixture team'));
      expect(result.current.gameState).toMatchObject({ revealedClues: clue, guesses: ['Fixture team'], gameStatus: 'won', score });
      unmount();
    }
    expect(localStorage.length).toBe(0);
  });

  it('keeps the unused McLaren example consistent without claiming that prop renders', () => {
    const children = Children.toArray(F1Constructor().props.children) as ReactElement<{ examples?: string[] }>[];
    const guide = children.find(child => child.type === GameSeoContent)!;
    expect(guide.props.examples).toContain("McLaren: 10× Constructors' Champion, Senna/Prost/Hamilton, Woking");
    expect(guide.props.examples).not.toContain("McLaren: 8× Constructors' Champion, Senna/Prost/Hamilton, Woking");
  });
});
