import { useState, useMemo, useCallback, useEffect } from 'react';
import { collegeGridPuzzles } from '@/data/collegeGridPuzzles';
import { CellState, FootballGridGameStatus, GridAttribute, GridPuzzle } from '@/types/footballGrid';
import { supabase } from '@/integrations/supabase/client';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { toast } from 'sonner';
import { rarityPercent } from '@/lib/gridRarity';
import { normalizeGridName } from '@/lib/gridEngine';
import {
  CRITERIA_LABELS,
  fetchCollegeGridData,
  judgeCollegeCell,
  judgeLabel,
  labelOf,
  type CollegeGridData,
  type CollegeGridEntry,
} from '@/lib/collegeGrid';

/**
 * College Grid, judged in memory against its answer key (Round 611), in the
 * shape of useFootballGrid.
 *
 * Until this round every guess went to an AI validator that runs out of its
 * free allowance for most of the US day, and a guess it could not confirm
 * was never counted, so a board could be neither won nor lost. Now the key
 * (public.college_grid_players) is fetched once and every guess is judged
 * here by judgeCollegeCell, which answers yes, no or unknown:
 *   yes      measure rarity, insert the selection, add the correct pick.
 *   no       add a miss. A no only comes from a complete fact in the key.
 *   unknown  a toast naming what the records hold, and no guess is spent.
 * A name the key does not carry, or a player already on the board, gets a
 * toast and costs nothing either.
 *
 * BOARD ID ON EVERY ACTION. useDailyPuzzle restores a save by date and pool
 * index, and a regenerated pool reuses the same indexes, so a save written
 * against an old board on release day would come back on the new one. Every
 * action carries the board id (it rides inside the guess objects, so the
 * saved shape and its schema version do not change), and a restored log
 * with any action whose id is missing or different is cleared with reset()
 * before the board is shown.
 */

type GridAction =
  | { t: 'ok'; cellIndex: number; playerName: string; rarity: number; board: string }
  | { t: 'x'; board: string };

const GUESS_LIMIT = 15;

/** Group codes to the board's own position words, read off the vocabulary. */
const GROUP_WORDS = new Map(
  CRITERIA_LABELS.filter((l) => l.kind === 'position').map((l) => [l.group as string, l.label]),
);

/** What the records hold on a player for the labels of a cell they could not settle. */
function onRecord(entry: CollegeGridEntry, attrs: GridAttribute[]): string {
  const facts: string[] = [];
  let namesake = false;
  for (const attr of attrs) {
    if (judgeLabel(entry, attr) !== 'unknown') continue;
    const l = labelOf(attr);
    if (!l) {
      facts.push(`Nothing on record can check ${attr.label}.`);
    } else if (l.kind === 'college') {
      facts.push(entry.colleges.length > 0 ? `Schools on record: ${entry.colleges.join(', ')}.` : 'No school on record.');
    } else if (l.kind === 'position') {
      facts.push(entry.groups.size > 0 ? `Position on record: ${[...entry.groups].map((g) => GROUP_WORDS.get(g) ?? g).join(', ')}.` : 'No position on record.');
      namesake = namesake || entry.identityOpen;
    } else if (l.kind === 'heisman') {
      facts.push('A Heisman winner on record has the same last name.');
    } else {
      if (entry.bestPick !== null) {
        facts.push(l.kind === 'firstRound' && entry.firstRound === null
          ? `Picked No. ${entry.bestPick}, round not on record.`
          : `Picked No. ${entry.bestPick}.`);
      } else {
        facts.push(entry.undrafted ? 'Not drafted.' : 'No draft pick on record.');
      }
      namesake = namesake || entry.identityOpen;
    }
  }
  if (namesake) facts.push('Another player on record shares his name.');
  return [...new Set(facts)].join(' ');
}

export function useCollegeGrid() {
  /* The answer key, fetched once. null while loading; an error card when it
     cannot load, because a grid with no way to judge a guess is not a game. */
  const [gridData, setGridData] = useState<CollegeGridData | null>(null);
  const [dataError, setDataError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetchCollegeGridData().then((d) => {
      if (cancelled) return;
      if (d) setGridData(d); else setDataError(true);
    });
    return () => { cancelled = true; };
  }, []);

  const {
    puzzle: dailyPuzzle,
    guesses: dailyActions,
    addGuess: addDailyGuess,
    gameStatus: rawDailyStatus,
    isLoading: dailyLoading,
    reset,
  } = useDailyPuzzle<GridPuzzle, GridAction>({
    gameSlug: 'college-grid',
    puzzles: collegeGridPuzzles,
    maxGuesses: GUESS_LIMIT,
    isWon: (g) => g.filter((a) => a.t === 'ok').length >= 9,
    deserializeGuesses: (raw) => raw as GridAction[],
  });

  const puzzle = dailyPuzzle ?? collegeGridPuzzles[0];

  /* A restored log from another board (or from before actions carried a
     board id) is cleared before play; until then the board stays hidden. */
  const staleLog = !dailyLoading && dailyActions.some((a) => a.board !== puzzle.id);
  useEffect(() => {
    if (staleLog) reset();
  }, [staleLog, reset]);

  const isLoading = dailyLoading || staleLog || (!gridData && !dataError);

  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [wrongFlash, setWrongFlash] = useState<{ cellIndex: number; playerName: string } | null>(null);

  const correctActions = useMemo(
    () => dailyActions.filter((a): a is Extract<GridAction, { t: 'ok' }> => a.t === 'ok'),
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
  const guessesLeft = Math.max(0, GUESS_LIMIT - dailyActions.length);
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
          .from('college_grid_selections')
          .select('*', { count: 'exact', head: true })
          .eq('puzzle_id', puzzleId)
          .eq('cell_index', cellIndex);
        const { count: playerCount } = await supabase
          .from('college_grid_selections')
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
      if (activeCell === null || gameStatus !== 'playing' || validating || !gridData || staleLog) return;
      if (cells[activeCell].status === 'correct') return;

      /* The search box offers the key's own display names, so a miss here is
         a typed name the key does not carry, and it costs nothing. */
      const player = gridData.byNormalizedName.get(normalizeGridName(playerName));
      if (!player) {
        toast.error('Pick a player from the suggestions.');
        return;
      }
      if (cells.some((c) => c.status === 'correct' && c.playerName === player.name)) {
        toast.error(`${player.name} is already on your board.`);
        return;
      }

      const { rowAttr, colAttr } = getRowCol(activeCell);
      const verdict = judgeCollegeCell(player, rowAttr, colAttr);
      if (verdict === 'unknown') {
        /* The records cannot settle this cell for him either way, so the
           guess is not spent; say what they do hold. */
        const held = onRecord(player, [rowAttr, colAttr]);
        toast(`No guess used. The records can't settle ${player.name} for this cell.`, held ? { description: held } : undefined);
        return;
      }

      setValidating(true);
      const capturedCell = activeCell;
      const board = puzzle.id;

      try {
        if (verdict === 'yes') {
          /* Round 401: measure the crowd BEFORE this row joins it. The
             formula adds the player's own row itself; inserting first counted
             it twice (a first pick read 100 instead of the unicorn 101). */
          const rarity = await fetchRarity(board, capturedCell, player.name);
          await supabase.from('college_grid_selections').insert({
            puzzle_id: board,
            cell_index: capturedCell,
            player_name: player.name.toLowerCase(),
          });
          addDailyGuess({ t: 'ok', cellIndex: capturedCell, playerName: player.name, rarity, board });
        } else {
          setWrongFlash({ cellIndex: capturedCell, playerName: player.name });
          setTimeout(() => setWrongFlash(null), 1500);
          addDailyGuess({ t: 'x', board });
        }
      } catch {
        /* The verdict is already in hand; only the rarity write can fail,
           and a correct pick still counts without its crowd number. */
        if (verdict === 'yes') addDailyGuess({ t: 'ok', cellIndex: capturedCell, playerName: player.name, rarity: 50, board });
      } finally {
        setValidating(false);
        setActiveCell(null);
      }
    },
    [activeCell, gameStatus, validating, gridData, staleLog, cells, puzzle, getRowCol, fetchRarity, addDailyGuess],
  );

  useGameCompletion('college-grid', rawDailyStatus !== 'playing', correctCount * 100);

  return {
    puzzle, cells, activeCell, setActiveCell, submitGuess,
    validating, gameStatus, guessesLeft, correctCount, rarityScore, getRowCol, isLoading, dataError,
  };
}
