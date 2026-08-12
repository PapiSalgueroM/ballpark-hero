import { useState, useCallback, useMemo, useEffect } from 'react';
import fallbackPuzzles from '@/data/transferPathPuzzles';
import type { TransferPathPuzzle } from '@/data/transferPathPuzzles';
import { careerPlayers as fallbackPlayers } from '@/data/careerPlayers';
import type { CareerPlayer } from '@/types/career';
import { fetchTransferPathPuzzles } from '@/lib/fetchTransferPathPuzzles';
import { fetchCareerPlayers } from '@/lib/fetchCareerPlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';

export type TransferPathMode = 'daily' | 'unlimited';

type TransferAction =
  | { t: 'step'; player: string; club: string }
  | { t: 'won' }
  | { t: 'give' };

export interface RevealStep {
  player: string;
  /** Club shared with the PREVIOUS player in the path; null for the start. */
  club: string | null;
}

export interface TransferPathState {
  puzzle: TransferPathPuzzle;
  chain: string[];
  connections: (string | null)[];
  status: 'building' | 'won' | 'gaveup';
  score: number;
  mode: TransferPathMode;
  unlimitedIndex: number;
  isLoading: boolean;
  isLoadingPool: boolean;
  addPlayer: (name: string) => { ok: boolean; club: string | null };
  /** Owner 2026-08-05: players can surrender and see a real connecting path. */
  giveUp: () => void;
  /** Shortest valid path A -> B through the temporal-teammate graph, computed
   *  on surrender. Null while playing or if no path exists in the pool. */
  revealPath: RevealStep[] | null;
  switchToUnlimited: () => void;
  nextPuzzle: () => void;
  getAllPlayerNames: () => string[];
  getPlayerNationality: (name: string) => string;
  getPlayerClubs: (name: string) => Set<string>;
}

export function useTransferPath(): TransferPathState {
  // ── Pool state + dual fetch ────────────────────────────────────────────────
  const [puzzlePool, setPuzzlePool] = useState<TransferPathPuzzle[]>(fallbackPuzzles);
  const [playerPool, setPlayerPool] = useState<CareerPlayer[]>(fallbackPlayers);
  const [isLoadingPool, setIsLoadingPool] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchTransferPathPuzzles(), fetchCareerPlayers()]).then(([puzzles, players]) => {
      if (cancelled) return;
      if (puzzles.length > 0) setPuzzlePool(puzzles);
      if (players.length > 0) setPlayerPool(players);
      setIsLoadingPool(false);
    });
    return () => { cancelled = true; };
  }, []);

  // ── Career graph, memoized over playerPool ────────────────────────────────
  // TEMPORAL teammates only (owner 2026-07-10: "Ronaldo never played with
  // Mbappé", both wore Real Madrid white, six years apart). A connection now
  // requires the SAME club in the SAME season, not just the same club ever.
  const playerToClubs = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const p of playerPool) {
      map.set(p.name, new Set(p.career.map(s => s.club)));
    }
    return map;
  }, [playerPool]);

  const playerToClubSeasons = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const p of playerPool) {
      map.set(p.name, new Set(p.career.map(s => `${s.club}::${s.season}`)));
    }
    return map;
  }, [playerPool]);

  const playersShareClub = useMemo(
    () => (a: string, b: string): string | null => {
      const csA = playerToClubSeasons.get(a);
      const csB = playerToClubSeasons.get(b);
      if (!csA || !csB) return null;
      for (const key of csA) {
        if (csB.has(key)) return key.split('::')[0]; // club name of a shared season
      }
      return null;
    },
    [playerToClubSeasons],
  );

  // club::season -> players who were there. Powers the give-up path search.
  const seasonIndex = useMemo(() => {
    const idx = new Map<string, string[]>();
    for (const p of playerPool) {
      for (const s of p.career) {
        const k = `${s.club}::${s.season}`;
        const arr = idx.get(k);
        if (arr) arr.push(p.name);
        else idx.set(k, [p.name]);
      }
    }
    return idx;
  }, [playerPool]);

  /** BFS shortest path through the temporal-teammate graph. */
  const findPath = useMemo(
    () => (from: string, to: string): RevealStep[] | null => {
      if (!playerToClubSeasons.has(from) || !playerToClubSeasons.has(to)) return null;
      if (from === to) return [{ player: from, club: null }];
      const prev = new Map<string, { via: string; club: string }>();
      const seen = new Set<string>([from]);
      const queue: string[] = [from];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        const keys = playerToClubSeasons.get(cur);
        if (!keys) continue;
        for (const key of keys) {
          const club = key.split('::')[0];
          for (const nb of seasonIndex.get(key) ?? []) {
            if (seen.has(nb)) continue;
            seen.add(nb);
            prev.set(nb, { via: cur, club });
            if (nb === to) {
              const path: RevealStep[] = [];
              let at: string | null = to;
              while (at) {
                const pr = prev.get(at);
                path.unshift({ player: at, club: pr ? pr.club : null });
                at = pr ? pr.via : null;
              }
              return path;
            }
            queue.push(nb);
          }
        }
      }
      return null;
    },
    [playerToClubSeasons, seasonIndex],
  );

  // Helpers returned to board, closures over playerPool / playerToClubs
  const getAllPlayerNames = useMemo(
    () => () => playerPool.map(p => p.name),
    [playerPool],
  );
  const getPlayerNationality = useMemo(
    () => (name: string) => playerPool.find(p => p.name === name)?.nationality ?? '',
    [playerPool],
  );
  const getPlayerClubs = useMemo(
    () => (name: string): Set<string> => playerToClubs.get(name) ?? new Set(),
    [playerToClubs],
  );

  // ── Mode state ─────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<TransferPathMode>('daily');

  // ── Daily, useDailyPuzzle ─────────────────────────────────────────────────
  const {
    puzzle: dailyPuzzle,
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
  } = useDailyPuzzle<TransferPathPuzzle, TransferAction>({
    gameSlug: 'transfer-path',
    puzzles: puzzlePool,
    maxGuesses: 999,
    isWon: (actions) => actions.some(a => a.t === 'won'),
    isLost: () => false,
    deserializeGuesses: (raw) => raw as TransferAction[],
  });

  // Derive chain / connections / status / score from stored actions
  const dailySteps = useMemo(
    () => dailyActions.filter((a): a is { t: 'step'; player: string; club: string } => a.t === 'step'),
    [dailyActions],
  );
  const dailyChain = useMemo(
    () => [dailyPuzzle?.playerA ?? '', ...dailySteps.map(s => s.player)],
    [dailyPuzzle, dailySteps],
  );
  const dailyConnections = useMemo(
    () => [null, ...dailySteps.map(s => s.club)] as (string | null)[],
    [dailySteps],
  );
  const dailyGaveUp = useMemo(() => dailyActions.some(a => a.t === 'give'), [dailyActions]);
  const dailyStatus: 'building' | 'won' | 'gaveup' =
    rawDailyStatus === 'won' ? 'won' : dailyGaveUp ? 'gaveup' : 'building';
  const dailyScore = useMemo(() => {
    if (dailyStatus !== 'won') return 0;
    const steps = dailyChain.length - 1;
    const extra = Math.max(0, steps - (dailyPuzzle?.minSteps ?? 0));
    return Math.max(0, 1000 - extra * 100);
  }, [dailyStatus, dailyChain, dailyPuzzle]);

  // ── Unlimited, direct useState ────────────────────────────────────────────
  const [unlimitedIndex, setUnlimitedIndex] = useState(0);
  const [unlimitedChain, setUnlimitedChain] = useState<string[]>(
    () => [fallbackPuzzles[0].playerA],
  );
  const [unlimitedConnections, setUnlimitedConnections] = useState<(string | null)[]>([null]);
  const [unlimitedScore, setUnlimitedScore] = useState(0);
  const [unlimitedStatus, setUnlimitedStatus] = useState<'building' | 'won' | 'gaveup'>('building');

  const unlimitedPuzzle = useMemo(() => {
    const idx = (unlimitedIndex + 1) % puzzlePool.length;
    return puzzlePool[idx];
  }, [unlimitedIndex, puzzlePool]);

  // ── Active (mode-dependent) values ────────────────────────────────────────
  const puzzle = mode === 'daily' ? (dailyPuzzle ?? puzzlePool[0]) : unlimitedPuzzle;
  const chain = mode === 'daily' ? dailyChain : unlimitedChain;
  const connections = mode === 'daily' ? dailyConnections : unlimitedConnections;
  const status = mode === 'daily' ? dailyStatus : unlimitedStatus;
  const score = mode === 'daily' ? dailyScore : unlimitedScore;

  // ── useGameCompletion ──────────────────────────────────────────────────────
  // A surrendered daily still counts as "played today" (score 0, no win).
  const isComplete = mode === 'daily' && (status === 'won' || status === 'gaveup');
  useGameCompletion('transfer-path', isComplete, status === 'won' ? score : 0, status === 'won' ? 1 : 0);

  // ── giveUp + reveal ────────────────────────────────────────────────────────
  const giveUp = useCallback(() => {
    if (status !== 'building') return;
    if (mode === 'daily') addDailyAction({ t: 'give' });
    else setUnlimitedStatus('gaveup');
  }, [status, mode, addDailyAction]);

  const revealPath = useMemo(
    () => (status === 'gaveup' ? findPath(puzzle.playerA, puzzle.playerB) : null),
    [status, puzzle, findPath],
  );

  // ── addPlayer ──────────────────────────────────────────────────────────────
  const addPlayer = useCallback((name: string): { ok: boolean; club: string | null } => {
    if (status !== 'building') return { ok: false, club: null };

    const lastInChain = chain[chain.length - 1];
    const sharedClub = playersShareClub(lastInChain, name);
    if (!sharedClub) return { ok: false, club: null };

    if (mode === 'daily') {
      addDailyAction({ t: 'step', player: name, club: sharedClub });
      if (name === puzzle.playerB) {
        addDailyAction({ t: 'won' });
      } else {
        const finalClub = playersShareClub(name, puzzle.playerB);
        if (finalClub) {
          addDailyAction({ t: 'step', player: puzzle.playerB, club: finalClub });
          addDailyAction({ t: 'won' });
        }
      }
    } else {
      const newChain = [...chain, name];
      const newConn = [...connections, sharedClub];
      let finalChain = newChain;
      let finalConn = newConn;
      let won = name === puzzle.playerB;
      if (!won) {
        const finalClub = playersShareClub(name, puzzle.playerB);
        if (finalClub) {
          finalChain = [...newChain, puzzle.playerB];
          finalConn = [...newConn, finalClub];
          won = true;
        }
      }
      setUnlimitedChain(finalChain);
      setUnlimitedConnections(finalConn);
      if (won) {
        const steps = finalChain.length - 1;
        setUnlimitedScore(Math.max(0, 1000 - Math.max(0, steps - puzzle.minSteps) * 100));
        setUnlimitedStatus('won');
      }
    }

    return { ok: true, club: sharedClub };
  }, [mode, status, chain, connections, puzzle, playersShareClub, addDailyAction]);

  // ── switchToUnlimited ──────────────────────────────────────────────────────
  const switchToUnlimited = useCallback(() => {
    setMode('unlimited');
    setUnlimitedIndex(0);
    const p = puzzlePool[1 % puzzlePool.length];
    setUnlimitedChain([p.playerA]);
    setUnlimitedConnections([null]);
    setUnlimitedScore(0);
    setUnlimitedStatus('building');
  }, [puzzlePool]);

  // ── nextPuzzle ─────────────────────────────────────────────────────────────
  const nextPuzzle = useCallback(() => {
    const nextIdx = unlimitedIndex + 1;
    setUnlimitedIndex(nextIdx);
    const p = puzzlePool[(nextIdx + 1) % puzzlePool.length];
    setUnlimitedChain([p.playerA]);
    setUnlimitedConnections([null]);
    setUnlimitedScore(0);
    setUnlimitedStatus('building');
  }, [unlimitedIndex, puzzlePool]);

  return {
    puzzle,
    chain,
    connections,
    status,
    score,
    mode,
    unlimitedIndex,
    isLoading,
    isLoadingPool,
    addPlayer,
    giveUp,
    revealPath,
    switchToUnlimited,
    nextPuzzle,
    getAllPlayerNames,
    getPlayerNationality,
    getPlayerClubs,
  };
}
