import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { nbaConnectionsPuzzles } from '@/data/nbaConnectionsPuzzles';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { isSportConnectionsLog } from '@/lib/dailySaveShapes';
import { isSameConnectionsGroup } from '@/lib/connectionsSolvedMatch';
import { fetchNbaConnectionsPuzzles } from '@/lib/fetchNbaConnectionsPuzzles';
import { dailyIndex, getTodayET } from '@/lib/dateUtils';
import {
  emptyNbaDrafts, emptyNbaUnlimitedProgress, nbaDraftKey, nbaDraftScope, nbaUnlimitedPartition,
  parseNbaDrafts, parseNbaUnlimitedProgress, toggleNbaDraft,
  type NbaConnectionDrafts, type NbaUnlimitedProgress,
} from '@/lib/nbaConnectionDrafts';

/**
 * NBA Connections, direct port of useBaseballConnections (task #26).
 * Keep the connections hooks in lockstep if the mechanic changes.
 */
function isValidNbaPuzzle(p: { groups: { players: string[] }[] }): boolean {
  const all = p.groups.flatMap((g) => g.players);
  const unique = new Set(all);
  const expectedPerGroup = p.groups[0]?.players.length ?? 5;
  return p.groups.length === 4 && p.groups.every((g) => g.players.length === expectedPerGroup) && unique.size === p.groups.length * expectedPerGroup;
}

const validNbaPuzzles = nbaConnectionsPuzzles.filter(isValidNbaPuzzle);
const fallbackNbaPuzzles = validNbaPuzzles.length > 0 ? validNbaPuzzles : nbaConnectionsPuzzles;

export type NbaConnStatus = 'playing' | 'complete';

export type NbaConnMode = 'daily' | 'unlimited';

export interface SolvedGroup {
  theme: string;
  players: string[];
  difficulty: 'yellow' | 'green' | 'blue' | 'purple';
}

// Action events stored in the daily action log
type NbaConnAction =
  | { t: 'ok'; theme: string; players: string[]; diff: 'yellow' | 'green' | 'blue' | 'purple' }
  | { t: 'x' };

type Puzzle = (typeof fallbackNbaPuzzles)[number];

function shufflePlayers(players: string[], seed: number): string[] {
  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (seed * (i + 1) + 13) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function useNbaConnections() {
  // ---- MODE ----------------------------------------------------------------
  const [mode, setMode] = useState<NbaConnMode>('daily');

  // ---- SUPABASE POOL -------------------------------------------------------
  // Cloud is source of truth (nba_connections_puzzles); the hardcoded
  // fallbackNbaPuzzles is the offline/error fallback. Mirrors useConnections.
  const [puzzlePool, setPuzzlePool] = useState<Puzzle[]>(fallbackNbaPuzzles);
  const [isLoadingPool, setIsLoadingPool] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchNbaConnectionsPuzzles().then((pool) => {
      if (cancelled) return;
      if (pool.length > 0) setPuzzlePool(pool as Puzzle[]);
      const loadedPool = pool.length > 0 ? pool : fallbackNbaPuzzles;
      try {
        const raw = localStorage.getItem(nbaDraftKey('unlimited'));
        heldUnlimitedBytes.current = raw;
        const savedIndex = loadedPool.findIndex(candidate => {
          const names = candidate.groups.flatMap(group => group.players);
          return parseNbaDrafts(raw, nbaDraftScope('unlimited', candidate.id, ''), names, names) !== null;
        });
        if (savedIndex >= 0) {
          setUnlimitedIndex(savedIndex);
          const progress = parseNbaUnlimitedProgress(raw, loadedPool[savedIndex]);
          unlimitedProgressRef.current = progress;
          setUnlimitedProgress(progress);
        }
      } catch { /* No valid notes: retain the ordinary random draw. */ }
      setIsLoadingPool(false);
    });
    return () => { cancelled = true; };
  }, []);

  const todaysPuzzle = useMemo(
    () => (puzzlePool.length > 0 ? puzzlePool[dailyIndex(getTodayET(), puzzlePool.length)] : null),
    [puzzlePool],
  );

  // ---- DAILY ---------------------------------------------------------------
  const {
    puzzle: dailyPuzzle,
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
    reset: resetDailyHook,
    todayStr,
    takeNewerSave,
  } = useDailyPuzzle<Puzzle, NbaConnAction>({
    gameSlug: 'nba-connections',
    puzzles: fallbackNbaPuzzles,
    supabasePuzzle: todaysPuzzle,
    getPuzzleId: (p) => p.id,
    maxGuesses: 999, // ends via isWon / isLost only
    isWon: (g, puzzle) => g.filter(a => a.t === 'ok').length >= puzzle.groups.length,
    isLost: (g) => 4 - g.filter(a => a.t === 'x').length <= 0,
    deserializeGuesses: (raw) => raw as NbaConnAction[],
    isValidGuesses: isSportConnectionsLog,
  });

  // Derived daily state
  const dailySolvedGroups: SolvedGroup[] = dailyActions
    .filter((a): a is Extract<NbaConnAction, { t: 'ok' }> => a.t === 'ok')
    .map(a => ({ theme: a.theme, players: a.players, difficulty: a.diff }));
  const dailyLives = 4 - dailyActions.filter(a => a.t === 'x').length;

  // Auto-reveal remaining groups when lives hit 0 (mirrors original behavior)
  const dailySolvedGroupsFinal = useMemo(() => {
    if (dailyLives > 0 || !dailyPuzzle) return dailySolvedGroups;
    const remaining = dailyPuzzle.groups.filter(
      g => !dailySolvedGroups.some(s => isSameConnectionsGroup(s, g))
    );
    return [
      ...dailySolvedGroups,
      ...remaining.map(g => ({ theme: g.theme, players: g.players, difficulty: g.difficulty })),
    ];
  }, [dailyLives, dailySolvedGroups, dailyPuzzle]);

  // ---- UNLIMITED -----------------------------------------------------------
  const [unlimitedIndex, setUnlimitedIndex] = useState(
    () => Math.floor(Math.random() * fallbackNbaPuzzles.length)
  );
  const unlimitedPuzzle = puzzlePool[unlimitedIndex % puzzlePool.length];
  const [unlimitedProgress, setUnlimitedProgress] = useState(emptyNbaUnlimitedProgress);
  const unlimitedProgressRef = useRef(unlimitedProgress);
  const heldUnlimitedBytes = useRef<string | null>(null);
  const [unlimitedMoved, setUnlimitedMoved] = useState(false);
  const unlimitedLives = unlimitedProgress.lives;
  const unlimitedSolvedGroupsFinal = useMemo(() => {
    const found = unlimitedProgress.found.map(index => unlimitedPuzzle.groups[index]);
    if (unlimitedProgress.lives > 0) return found;
    return [...found, ...unlimitedPuzzle.groups.filter((_, index) => !unlimitedProgress.found.includes(index))];
  }, [unlimitedProgress, unlimitedPuzzle]);

  // ---- ACTIVE VALUES -------------------------------------------------------
  const puzzle       = mode === 'daily' ? dailyPuzzle : unlimitedPuzzle;
  const solvedGroups = mode === 'daily' ? dailySolvedGroupsFinal : unlimitedSolvedGroupsFinal;
  /* Round 425: groups the PLAYER actually found. solvedGroups above is
     padded with the unsolved groups when the last life goes, so the board can
     reveal them, which made every loss report 4/4 on screen and on the share
     card. Part two moved the unlimited padding into unlimitedRevealed, so
     this count is honest in both modes. */
  const foundGroups = mode === 'daily' ? dailySolvedGroups.length : unlimitedProgress.found.length;
  const lives        = mode === 'daily' ? dailyLives : unlimitedLives;
  const gameStatus: NbaConnStatus = mode === 'daily'
    ? (rawDailyStatus !== 'playing' ? 'complete' : 'playing')
    : (unlimitedProgress.found.length === unlimitedPuzzle.groups.length || unlimitedLives <= 0 ? 'complete' : 'playing');

  // ---- SHUFFLED PLAYERS (deterministic by puzzle.id) ----------------------
  const allPlayers = useMemo(() => {
    if (!puzzle) return [];
    const seen = new Set<string>();
    const players = puzzle.groups.flatMap(g => g.players).filter(p => {
      if (seen.has(p)) return false;
      seen.add(p);
      return true;
    });
    const seed = puzzle.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return shufflePlayers(players, seed);
  }, [puzzle]);

  const solvedPlayerNames = useMemo(
    () => new Set(solvedGroups.flatMap(g => g.players)),
    [solvedGroups]
  );

  const remainingPlayers = useMemo(
    () => allPlayers.filter(p => !solvedPlayerNames.has(p)),
    [allPlayers, solvedPlayerNames]
  );

  // ---- SHARED LOCAL STATE --------------------------------------------------
  const scope = puzzle ? nbaDraftScope(mode, puzzle.id, todayStr) : '';
  const roster = puzzle?.groups.flatMap(group => group.players) ?? [];
  const rosterSignature = JSON.stringify([...roster].sort());
  const remainingSignature = JSON.stringify([...remainingPlayers].sort());
  const [drafts, setDrafts] = useState<NbaConnectionDrafts | null>(null);
  const draftsRef = useRef<NbaConnectionDrafts | null>(null);
  const submittedRef = useRef('');
  const [notice, setNotice] = useState({ id: 0, text: '' });
  const [notesWarning, setNotesWarning] = useState(false);
  const loadingGame = isLoadingPool || (mode === 'daily' && isLoading);
  const notesReady = !loadingGame && drafts?.scope === scope && JSON.stringify(drafts.roster) === rosterSignature
    && drafts.groups.every(group => group.every(name => remainingPlayers.includes(name)));
  const selected = notesReady ? drafts.groups[drafts.active] : [];

  useEffect(() => {
    if (loadingGame || !puzzle) return;
    if (draftsRef.current?.scope === scope && JSON.stringify(draftsRef.current.roster) === rosterSignature) {
      const next = { ...draftsRef.current, groups: draftsRef.current.groups.map(group => group.filter(name => remainingPlayers.includes(name))) };
      draftsRef.current = next; setDrafts(next);
      return;
    }
    let loaded: NbaConnectionDrafts | null = null;
    try {
      const raw = mode === 'unlimited' ? heldUnlimitedBytes.current : localStorage.getItem(nbaDraftKey(mode));
      loaded = parseNbaDrafts(raw, scope, roster, remainingPlayers);
    }
    catch { setNotesWarning(true); }
    const next = loaded ?? emptyNbaDrafts(scope, roster);
    draftsRef.current = next; setDrafts(next); submittedRef.current = '';
    setNotice(previous => ({ id: previous.id, text: '' }));
    // Only actual player edits write notes. Loading never overwrites saved bytes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingGame, scope, rosterSignature, remainingSignature]);

  const writeDrafts = useCallback((next: NbaConnectionDrafts, played?: { puzzle: Puzzle; progress: NbaUnlimitedProgress }) => {
    const changedGroups = JSON.stringify(next.groups) !== JSON.stringify(draftsRef.current?.groups);
    const key = nbaDraftKey(mode);
    let save = JSON.stringify(next);
    if (mode === 'unlimited') {
      try {
        if (localStorage.getItem(key) !== heldUnlimitedBytes.current) {
          setUnlimitedMoved(true);
          return false;
        }
      } catch { /* Keep playing in memory if browser storage is blocked. */ }
      const previous = unlimitedProgressRef.current;
      const progress = played?.progress ?? (changedGroups && previous.rejected ? { ...previous, rejected: null } : previous);
      unlimitedProgressRef.current = progress;
      setUnlimitedProgress(progress);
      save = JSON.stringify({ ...next, progress: { ...progress, partition: nbaUnlimitedPartition(played?.puzzle ?? unlimitedPuzzle) } });
    }
    if (changedGroups) submittedRef.current = '';
    draftsRef.current = next; setDrafts(next);
    try {
      localStorage.setItem(key, save);
      if (mode === 'unlimited') heldUnlimitedBytes.current = save;
      setNotesWarning(false);
    }
    catch { setNotesWarning(true); }
    return true;
  }, [mode, unlimitedPuzzle]);

  const selectDraft = useCallback((active: number) => {
    const current = draftsRef.current;
    if (!notesReady || !current || gameStatus !== 'playing' || !Number.isInteger(active) || active < 0 || active > 3) return;
    writeDrafts({ ...current, active });
  }, [notesReady, gameStatus, writeDrafts]);
  const [shakeWrong, setShakeWrong] = useState(false);
  /* Round 503: the shake timer is held so it can be cleared. The 600ms
     timeout used to be fire and forget, so an unmount mid shake (a route
     change, a test teardown) set state on a component that no longer
     existed, and the full vitest run printed "window is not defined"
     whenever the callback landed after jsdom was torn down. A second wrong
     guess inside the window replaces the first timer, so the shake always
     ends 600ms after the LAST miss rather than the first. */
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (shakeTimer.current !== null) clearTimeout(shakeTimer.current);
  }, []);

  // ---- CALLBACKS -----------------------------------------------------------
  const switchMode = useCallback((newMode: NbaConnMode) => {
    setMode(newMode);
  }, []);

  const togglePlayer = useCallback((name: string) => {
    const current = draftsRef.current;
    if (!notesReady || !current || current.scope !== scope || gameStatus !== 'playing' || !remainingPlayers.includes(name)) return;
    const next = toggleNbaDraft(current, name);
    if (next !== current) writeDrafts(next);
  }, [notesReady, scope, gameStatus, remainingPlayers, writeDrafts]);

  const submitSelection = useCallback(() => {
    const current = draftsRef.current;
    const selected = current?.groups[current.active] ?? [];
    if (!notesReady || current?.scope !== scope || selected.length !== 5 || gameStatus !== 'playing' || !puzzle
      || selected.some(name => !remainingPlayers.includes(name))) return;
    const submission = JSON.stringify([scope, [...selected].sort()]);
    if (submittedRef.current === submission) return;
    const previous = unlimitedProgressRef.current;
    if (mode === 'unlimited' && previous.rejected?.every(name => selected.includes(name))) return;
    if (mode === 'daily' && takeNewerSave()) return;
    submittedRef.current = submission;

    const match = puzzle.groups.find(g =>
      !solvedGroups.some(s => isSameConnectionsGroup(s, g)) &&
      g.players.length === 5 &&
      selected.every(p => g.players.includes(p)) &&
      g.players.every(p => selected.includes(p))
    );

    if (match) {
      const nextDrafts = { ...current, groups: current.groups.map(group => group.filter(name => !match.players.includes(name))) };
      if (mode === 'daily') {
        addDailyAction({ t: 'ok', theme: match.theme, players: match.players, diff: match.difficulty });
        writeDrafts(nextDrafts);
      } else if (!writeDrafts(nextDrafts, { puzzle, progress: {
          ...previous, found: [...previous.found, puzzle.groups.indexOf(match)], rejected: null,
        } })) {
        submittedRef.current = '';
        return;
      }
      setNotice(previous => ({ id: previous.id + 1, text: `Locked: ${match.theme}. Those five are solved.` }));
    } else {
      if (mode === 'daily') {
        addDailyAction({ t: 'x' });
      } else if (!writeDrafts(current, { puzzle, progress: { ...previous, lives: previous.lives - 1, rejected: [...selected].sort() } })) {
        submittedRef.current = '';
        return;
      }
      setShakeWrong(true);
      setNotice(previous => ({ id: previous.id + 1, text: 'Not a group. One life used. Your draft stays here to revise.' }));
      if (shakeTimer.current !== null) clearTimeout(shakeTimer.current);
      shakeTimer.current = setTimeout(() => {
        shakeTimer.current = null;
        setShakeWrong(false);
      }, 600);
    }
  }, [mode, notesReady, scope, remainingPlayers, gameStatus, puzzle, solvedGroups, addDailyAction, takeNewerSave, writeDrafts]);

  const deselectAll = useCallback(() => {
    const current = draftsRef.current;
    if (!notesReady || !current || gameStatus !== 'playing') return;
    writeDrafts({ ...current, groups: current.groups.map((group, index) => index === current.active ? [] : group) });
  }, [notesReady, gameStatus, writeDrafts]);

  const resetGame = useCallback(() => {
    submittedRef.current = '';
    if (mode === 'daily') {
      resetDailyHook();
      if (puzzle) writeDrafts(emptyNbaDrafts(scope, roster));
    } else {
      const currentIndex = unlimitedIndex % puzzlePool.length;
      const offset = puzzlePool.length > 1 ? 1 + Math.floor(Math.random() * (puzzlePool.length - 1)) : 0;
      const nextIndex = (currentIndex + offset) % puzzlePool.length;
      const nextPuzzle = puzzlePool[nextIndex];
      if (!writeDrafts(
        emptyNbaDrafts(nbaDraftScope('unlimited', nextPuzzle.id, todayStr), nextPuzzle.groups.flatMap(group => group.players)),
        { puzzle: nextPuzzle, progress: emptyNbaUnlimitedProgress },
      )) return;
      setUnlimitedIndex(nextIndex);
    }
    setNotice(previous => ({ id: previous.id, text: '' }));
  }, [mode, resetDailyHook, puzzlePool, unlimitedIndex, puzzle, scope, roster, todayStr, writeDrafts]);

  // ---- COMPLETION ----------------------------------------------------------
  const dailyWon = rawDailyStatus === 'won';
  const completionScore = dailyWon ? (dailyLives * 250) : 0;
  useGameCompletion('nba-connections', rawDailyStatus !== 'playing', completionScore);

  return {
    mode,
    switchMode,
    puzzle,
    remainingPlayers,
    selected,
    drafts: notesReady ? drafts : null,
    selectDraft,
    notice,
    notesWarning,
    unlimitedMoved: mode === 'unlimited' && unlimitedMoved,
    canSubmit: notesReady && selected.length === 5 && submittedRef.current !== JSON.stringify([scope, [...selected].sort()])
      && (mode !== 'unlimited' || !unlimitedProgress.rejected?.every(name => selected.includes(name))),
    togglePlayer,
    submitSelection,
    deselectAll,
    solvedGroups,
    foundGroups,
    lives,
    gameStatus,
    shakeWrong,
    resetGame,
    isLoading: !notesReady,
    isLoadingPool,
  };
}
