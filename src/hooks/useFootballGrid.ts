import { useState, useMemo, useCallback, useEffect } from 'react';
import { CellState, FootballGridGameStatus, GridAttribute, GridPuzzle } from '@/types/footballGrid';
import { supabase } from '@/integrations/supabase/client';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { toast } from 'sonner';
import { rarityPercent } from '@/lib/gridRarity';
import { dateSeed, getTodayET } from '@/lib/dateUtils';
import { normalizeGridName, type GridCategory } from '@/lib/gridEngine';
import { buildGridPuzzle, fetchNflGridData, playerMatchesCell, type NflGridData } from '@/lib/nflGrid';

/**
 * The NFL grid, on the shared engine (Round 406, phase 3 of
 * docs/designs/NFL-GRID-ENGINE-DESIGN.md).
 *
 * Until this round the board came from a hand authored pool of 72 puzzles
 * walked on a 72 day cycle, and every guess went to an edge function that
 * asked a free tier AI, which Round 378 measured running out of quota for
 * the rest of the day. Now the board is built from the date seed by
 * src/lib/nflGrid.ts (never repeating, same board for everyone) and every
 * guess is judged in memory against the answer key in nfl_grid_players
 * (22,008 careers from 1970, every rule written on the key file). Rarity,
 * the guess budget, the unlimited toggle, the daily save and the completion
 * are exactly what they were.
 *
 * The daily board is not drawn from a pool, so useDailyPuzzle receives it as
 * supabasePuzzle (its runtime puzzle door, the one the soccer grid uses) and
 * an empty module level array as the fallback its contract requires.
 */

type GridAction =
  | { t: 'ok'; cellIndex: number; playerName: string; rarity: number }
  | { t: 'x' };

const GUESS_LIMIT = 15;

/** The board the page renders, with the engine's categories kept beside the labels for matching. */
export interface DailyBoard extends GridPuzzle {
  engine: { rows: GridCategory[]; cols: GridCategory[] };
}

const NO_POOL: DailyBoard[] = [];

function attributeOf(c: GridCategory): GridAttribute {
  if (c.kind === 'franchise') return { label: `Played for ${c.label}`, type: 'team' };
  if (c.id.startsWith('pos:')) return { label: c.label, type: 'position' };
  if (c.id === 'sb') return { label: c.label, type: 'superbowl' };
  return { label: c.label, type: 'draft' };
}

/** Today's board from the date seed: the same nine questions for everyone on the same Eastern date. */
export function dailyBoardFor(todayStr: string): DailyBoard {
  const built = buildGridPuzzle(dateSeed(todayStr));
  return {
    id: built.id,
    rows: built.rows.map(attributeOf),
    cols: built.cols.map(attributeOf),
    engine: { rows: built.rows, cols: built.cols },
  };
}

export function useFootballGrid() {
  const [unlimited, setUnlimited] = useState<boolean>(() => {
    try { return localStorage.getItem('football-grid-unlimited') === '1'; } catch { return false; }
  });

  const toggleUnlimited = useCallback(() => {
    setUnlimited((prev) => {
      const next = !prev;
      try { localStorage.setItem('football-grid-unlimited', next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }, []);

  /* The answer key, fetched once. null while loading; an error card when
     it cannot load, because a grid with no way to judge a guess is not a
     game. */
  const [gridData, setGridData] = useState<NflGridData | null>(null);
  const [dataError, setDataError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetchNflGridData().then((d) => {
      if (cancelled) return;
      if (d) setGridData(d); else setDataError(true);
    });
    return () => { cancelled = true; };
  }, []);

  const todayStr = useMemo(() => getTodayET(), []);
  const board = useMemo(() => dailyBoardFor(todayStr), [todayStr]);

  const {
    puzzle: dailyPuzzle,
    guesses: dailyActions,
    addGuess: addDailyGuess,
    gameStatus: rawDailyStatus,
    isLoading: dailyLoading,
  } = useDailyPuzzle<DailyBoard, GridAction>({
    gameSlug: 'football-grid',
    puzzles: NO_POOL,
    supabasePuzzle: board,
    getPuzzleId: (p) => p.id,
    maxGuesses: unlimited ? Infinity : GUESS_LIMIT,
    isWon: (g) => g.filter((a) => a.t === 'ok').length >= 9,
    deserializeGuesses: (raw) => raw as GridAction[],
  });

  const puzzle = dailyPuzzle ?? board;
  const isLoading = dailyLoading || (!gridData && !dataError);

  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [wrongFlash, setWrongFlash] = useState<{ cellIndex: number; playerName: string } | null>(null);

  const correctActions = useMemo(
    () => dailyActions.filter((a): a is { t: 'ok'; cellIndex: number; playerName: string; rarity: number } => a.t === 'ok'),
    [dailyActions],
  );

  const cells = useMemo<CellState[]>(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const ok = correctActions.find((a) => a.cellIndex === i);
        if (ok) return { index: i, playerName: ok.playerName, status: 'correct' as const, rarity: ok.rarity };
        if (wrongFlash?.cellIndex === i)
          return { index: i, playerName: wrongFlash.playerName, status: 'wrong' as const, rarity: null };
        return { index: i, playerName: null, status: 'empty' as const, rarity: null };
      }),
    [correctActions, wrongFlash],
  );

  const correctCount = correctActions.length;
  const guessesLeft = unlimited ? null : Math.max(0, GUESS_LIMIT - dailyActions.length);
  const gameStatus: FootballGridGameStatus = rawDailyStatus !== 'playing' ? 'complete' : 'playing';

  const rarityScore = useMemo(() => {
    if (correctActions.length === 0) return null;
    const avg = correctActions.reduce((sum, a) => sum + Math.min(a.rarity, 100), 0) / correctActions.length;
    return Math.round(avg);
  }, [correctActions]);

  const getRowCol = useCallback(
    (cellIndex: number) => {
      const row = Math.floor(cellIndex / 3);
      const col = cellIndex % 3;
      return { row, col, rowAttr: puzzle.rows[row], colAttr: puzzle.cols[col] };
    },
    [puzzle],
  );

  const fetchRarity = useCallback(
    async (puzzleId: string, cellIndex: number, playerName: string): Promise<number> => {
      try {
        const { count: totalCount } = await supabase
          .from('football_grid_selections')
          .select('*', { count: 'exact', head: true })
          .eq('puzzle_id', puzzleId)
          .eq('cell_index', cellIndex);
        const { count: playerCount } = await supabase
          .from('football_grid_selections')
          .select('*', { count: 'exact', head: true })
          .eq('puzzle_id', puzzleId)
          .eq('cell_index', cellIndex)
          .eq('player_name', playerName.toLowerCase());
        return rarityPercent(totalCount ?? 0, playerCount ?? 0);
      } catch {
        return 50;
      }
    },
    [],
  );

  const submitGuess = useCallback(
    async (playerName: string) => {
      if (activeCell === null || gameStatus !== 'playing' || validating || !gridData) return;
      if (cells[activeCell].status === 'correct') return;

      /* Judged here, against the key: no network round trip, no quota. The
         search box offers the key's own display names, so a miss here is a
         typed name the key does not carry, and it costs nothing. */
      const player = gridData.byNormalizedName.get(normalizeGridName(playerName));
      if (!player) {
        toast.error('Pick a player from the suggestions.');
        return;
      }
      if (cells.some((c) => c.status === 'correct' && c.playerName === player.name)) {
        toast.error(`${player.name} is already on your board.`);
        return;
      }

      setValidating(true);
      const { row, col } = getRowCol(activeCell);
      const capturedCell = activeCell;
      const fits = playerMatchesCell(player, { row: puzzle.engine.rows[row], col: puzzle.engine.cols[col] });

      try {
        if (fits) {
          /* Round 401: measure the crowd BEFORE this row joins it. The
             formula adds the player's own row itself; inserting first counted
             it twice (a first pick read 100 instead of the unicorn 101). */
          const rarity = await fetchRarity(puzzle.id, capturedCell, player.name);
          await supabase.from('football_grid_selections').insert({
            puzzle_id: puzzle.id,
            cell_index: capturedCell,
            player_name: player.name.toLowerCase(),
          });
          addDailyGuess({ t: 'ok', cellIndex: capturedCell, playerName: player.name, rarity });
        } else {
          setWrongFlash({ cellIndex: capturedCell, playerName: player.name });
          setTimeout(() => setWrongFlash(null), 1500);
          addDailyGuess({ t: 'x' });
        }
      } catch {
        /* The verdict is already in hand; only the rarity write can fail,
           and a correct pick still counts without its crowd number. */
        if (fits) addDailyGuess({ t: 'ok', cellIndex: capturedCell, playerName: player.name, rarity: 50 });
      } finally {
        setValidating(false);
        setActiveCell(null);
      }
    },
    [activeCell, gameStatus, validating, gridData, cells, puzzle, getRowCol, fetchRarity, addDailyGuess],
  );

  useGameCompletion('football-grid', rawDailyStatus !== 'playing', correctCount * 100);

  return {
    puzzle, cells, activeCell, setActiveCell, submitGuess,
    validating, gameStatus, guessesLeft, correctCount, rarityScore, getRowCol, isLoading, dataError,
    unlimited, toggleUnlimited,
  };
}
