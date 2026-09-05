import { useState, useCallback, useMemo, useEffect } from 'react';
import fallbackPuzzles from '@/data/transferPathPuzzles';
import type { TransferPathPuzzle, TransferPathRuleHint } from '@/data/transferPathPuzzles';
import { careerPlayers as fallbackPlayers } from '@/data/careerPlayers';
import type { CareerPlayer } from '@/types/career';
import { fetchTransferPathPuzzles } from '@/lib/fetchTransferPathPuzzles';
import { fetchCareerPlayers } from '@/lib/fetchCareerPlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { dateSeed, getTodayET } from '@/lib/dateUtils';
import {
  TRANSFER_PATH_RULES,
  isActivePlayer,
  playersUnderRule,
  puzzleUnderRule,
  type TransferPathRule,
} from '@/lib/transferPathModes';

export type TransferPathMode = 'daily' | 'unlimited';
export type { TransferPathRule };

/** Why a name was refused: already in the chain, no 2025-26 season on the
 *  career records under the active rule (which is what the records hold, not
 *  a claim that the man retired), or linked only through a club outside
 *  Europe under the Europe rule. No reason means the two never shared a club
 *  in the same season. */
export type TransferPathRefusal = 'duplicate' | 'retired' | 'outside-europe';

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
  /* Round 460: the special rules. `rule` is the one picked, `activeRule` the
     one in force: they differ only on a daily whose pair has no path under
     the picked rule, where the daily plays the everyday rule instead. */
  rule: TransferPathRule;
  activeRule: TransferPathRule;
  setRule: (rule: TransferPathRule) => void;
  /** The daily's rule is fixed once its chain has started, so a reload (which
   *  forgets the rule) can never show a chain the rule on screen would refuse. */
  ruleLocked: boolean;
  /** True when the picked rule cannot reach the daily; the board offers unlimited under it. */
  dailyRuleBlocked: boolean;
  /** Puzzles in the pool with a path under each rule. A rule at 0 cannot be picked. */
  ruleAvailability: Record<TransferPathRule, number>;
  /** The minimum under the rule in force, which is what the target card shows and what unlimited scores against. */
  optimal: number;
  /** The hint under the rule in force. */
  hint: string;
  addPlayer: (name: string) => { ok: boolean; club: string | null; reason?: TransferPathRefusal };
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

/** name -> Set of `club::season`, the key the link rule is judged on */
function clubSeasonsOf(players: CareerPlayer[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const p of players) {
    map.set(p.name, new Set(p.career.map(s => `${s.club}::${s.season}`)));
  }
  return map;
}

function shareClub(keys: Map<string, Set<string>>, a: string, b: string): string | null {
  const csA = keys.get(a);
  const csB = keys.get(b);
  if (!csA || !csB) return null;
  for (const key of csA) {
    if (csB.has(key)) return key.split('::')[0]; // club name of a shared season
  }
  return null;
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

  /* ROUND 365: today's puzzle, computed from whichever pool is currently
     loaded. Depends on puzzlePool, so when the 902 row fetch replaces the 21
     entry fallback this recomputes and the daily moves to the live pool, which
     is the pool whose hints and minimums match the live career graph the game
     validates against. Same date seed formula as every other daily on the site
     (see dateUtils), and the same shape useSoccerGrid uses. */
  const todaysPuzzle = useMemo(() => {
    const seed = dateSeed(getTodayET());
    return puzzlePool.length > 0 ? puzzlePool[seed % puzzlePool.length] : null;
  }, [puzzlePool]);

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
    /* ROUND 365: fallbackPuzzles, not puzzlePool, and the real selection goes
       through supabasePuzzle. useDailyPuzzle deliberately leaves `puzzles` out
       of its selection memo's deps and says in a comment that it expects a
       stable module-level array. puzzlePool is STATE: it starts as the 21 entry
       fallback and becomes the 902 row live pool when the fetch lands. Passing
       it here broke that contract silently, because the memo never re-ran, so
       the daily was always drawn from those 21 and 881 puzzles could never
       appear. useSoccerGrid is the hook that gets this right and its comment
       explains the same rule.
       THE HALF THAT MATTERED MORE: both pools are fetched, but only playerPool
       was consumed, so the served puzzle was a FALLBACK puzzle validated
       against LIVE careers. The fallback file's own header says its minimums
       and hints are derived from the fallback player pool, that the live table
       carries its own hints "which differ where the pools differ", and that the
       fallback is served only when the table cannot be read. All of that was
       false in production. It is the Round 294 hint versus rule mismatch
       arriving by a different route. */
    puzzles: fallbackPuzzles,
    supabasePuzzle: todaysPuzzle,
    getPuzzleId: (p) => p.id,
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

  // ── Rule state (Round 460) ─────────────────────────────────────────────────
  // A special rule is a filter on the graph, never a change to the link rule.
  // The daily record shape is untouched: the rule is not stored, so the
  // daily's rule locks once its chain has started, and the daily score keeps
  // counting steps against the everyday minimum (the shared leaderboard
  // compares everyone on the same puzzle). Unlimited scores against the
  // rule's own minimum.
  const [rule, setRuleState] = useState<TransferPathRule>('classic');

  const ruleAvailability = useMemo(() => {
    const counts = { classic: 0, active: 0, europe: 0 } as Record<TransferPathRule, number>;
    for (const p of puzzlePool) for (const r of TRANSFER_PATH_RULES) if (puzzleUnderRule(p, r)) counts[r] += 1;
    return counts;
  }, [puzzlePool]);

  const dailyRuleHint: TransferPathRuleHint | null = useMemo(
    () => (dailyPuzzle ? puzzleUnderRule(dailyPuzzle, rule) : null),
    [dailyPuzzle, rule],
  );
  const dailyRuleBlocked = mode === 'daily' && rule !== 'classic' && dailyRuleHint === null;
  const activeRule: TransferPathRule = dailyRuleBlocked ? 'classic' : rule;
  const ruleLocked = mode === 'daily' && dailyActions.length > 0;

  // ── Career graph, memoized over the pool the rule leaves in play ──────────
  // TEMPORAL teammates only (owner 2026-07-10: "Ronaldo never played with
  // Mbappé", both wore Real Madrid white, six years apart). A connection now
  // requires the SAME club in the SAME season, not just the same club ever.
  const rulePlayers = useMemo(() => playersUnderRule(playerPool, activeRule), [playerPool, activeRule]);

  const playerToClubs = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const p of playerPool) {
      map.set(p.name, new Set(p.career.map(s => s.club)));
    }
    return map;
  }, [playerPool]);

  /* The everyday graph, kept beside the rule graph so a refusal can say why:
     a name the rule removed, or a link the rule does not allow. */
  const everydayClubSeasons = useMemo(() => clubSeasonsOf(playerPool), [playerPool]);
  const activeNames = useMemo(
    () => new Set(playerPool.filter(isActivePlayer).map(p => p.name)),
    [playerPool],
  );

  const playerToClubSeasons = useMemo(() => clubSeasonsOf(rulePlayers), [rulePlayers]);

  const playersShareClub = useMemo(
    () => (a: string, b: string): string | null => shareClub(playerToClubSeasons, a, b),
    [playerToClubSeasons],
  );

  // club::season -> players who were there. Powers the give-up path search.
  const seasonIndex = useMemo(() => {
    const idx = new Map<string, string[]>();
    for (const p of rulePlayers) {
      for (const s of p.career) {
        const k = `${s.club}::${s.season}`;
        const arr = idx.get(k);
        if (arr) arr.push(p.name);
        else idx.set(k, [p.name]);
      }
    }
    return idx;
  }, [rulePlayers]);

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

  // ── Unlimited, direct useState ────────────────────────────────────────────
  /* Unlimited draws only from the puzzles that have a path under the picked
     rule, so a rule can never deal a pair it cannot connect (Round 294's
     failure, a hint into a refusal, by another door). */
  const rulePool = useMemo(
    () => puzzlePool.filter(p => puzzleUnderRule(p, rule) !== null),
    [puzzlePool, rule],
  );
  const [unlimitedIndex, setUnlimitedIndex] = useState(0);
  const [unlimitedChain, setUnlimitedChain] = useState<string[]>(
    () => [fallbackPuzzles[0].playerA],
  );
  const [unlimitedConnections, setUnlimitedConnections] = useState<(string | null)[]>([null]);
  const [unlimitedScore, setUnlimitedScore] = useState(0);
  const [unlimitedStatus, setUnlimitedStatus] = useState<'building' | 'won' | 'gaveup'>('building');

  const unlimitedPuzzle = useMemo(() => {
    const pool = rulePool.length > 0 ? rulePool : puzzlePool;
    const idx = (unlimitedIndex + 1) % pool.length;
    return pool[idx];
  }, [unlimitedIndex, rulePool, puzzlePool]);

  // ── Active (mode-dependent) values ────────────────────────────────────────
  const puzzle = mode === 'daily' ? (dailyPuzzle ?? puzzlePool[0]) : unlimitedPuzzle;
  const chain = mode === 'daily' ? dailyChain : unlimitedChain;
  const connections = mode === 'daily' ? dailyConnections : unlimitedConnections;
  const status = mode === 'daily' ? dailyStatus : unlimitedStatus;
  const score = mode === 'daily' ? dailyScore : unlimitedScore;

  /* The minimum and hint under the rule in force. On the daily the everyday
     pair is the fallback (the rule is blocked or classic); in unlimited the
     pool is already filtered, so the rule's pair is always there. */
  const inForce: TransferPathRuleHint = useMemo(() => {
    const under = puzzleUnderRule(puzzle, activeRule);
    return under ?? { minSteps: puzzle.minSteps, hint: puzzle.hint };
  }, [puzzle, activeRule]);
  const optimal = inForce.minSteps;
  const hint = inForce.hint;

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
  const addPlayer = useCallback((name: string): { ok: boolean; club: string | null; reason?: TransferPathRefusal } => {
    if (status !== 'building') return { ok: false, club: null };

    if (chain.some(player => player.toLowerCase() === name.toLowerCase())) {
      return { ok: false, club: null, reason: 'duplicate' };
    }

    const lastInChain = chain[chain.length - 1];
    const sharedClub = playersShareClub(lastInChain, name);
    if (!sharedClub) {
      if (activeRule === 'active' && everydayClubSeasons.has(name) && !activeNames.has(name)) {
        return { ok: false, club: null, reason: 'retired' };
      }
      if (activeRule === 'europe' && shareClub(everydayClubSeasons, lastInChain, name)) {
        return { ok: false, club: null, reason: 'outside-europe' };
      }
      return { ok: false, club: null };
    }

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
        setUnlimitedScore(Math.max(0, 1000 - Math.max(0, steps - optimal) * 100));
        setUnlimitedStatus('won');
      }
    }

    return { ok: true, club: sharedClub };
  }, [mode, status, chain, connections, puzzle, optimal, activeRule, playersShareClub, everydayClubSeasons, activeNames, addDailyAction]);

  // ── unlimited resets ───────────────────────────────────────────────────────
  const startUnlimited = useCallback((index: number, pool: TransferPathPuzzle[]) => {
    const source = pool.length > 0 ? pool : puzzlePool;
    const p = source[(index + 1) % source.length];
    setUnlimitedIndex(index);
    setUnlimitedChain([p.playerA]);
    setUnlimitedConnections([null]);
    setUnlimitedScore(0);
    setUnlimitedStatus('building');
  }, [puzzlePool]);

  // ── switchToUnlimited ──────────────────────────────────────────────────────
  const switchToUnlimited = useCallback(() => {
    setMode('unlimited');
    startUnlimited(0, rulePool);
  }, [rulePool, startUnlimited]);

  // ── nextPuzzle ─────────────────────────────────────────────────────────────
  const nextPuzzle = useCallback(() => {
    startUnlimited(unlimitedIndex + 1, rulePool);
  }, [unlimitedIndex, rulePool, startUnlimited]);

  // ── setRule ────────────────────────────────────────────────────────────────
  const setRule = useCallback((next: TransferPathRule) => {
    if (next === rule) return;
    if (ruleAvailability[next] === 0) return;
    if (ruleLocked) return;
    setRuleState(next);
    if (mode === 'unlimited') {
      startUnlimited(0, puzzlePool.filter(p => puzzleUnderRule(p, next) !== null));
    }
  }, [rule, ruleAvailability, ruleLocked, mode, puzzlePool, startUnlimited]);

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
    rule,
    activeRule,
    setRule,
    ruleLocked,
    dailyRuleBlocked,
    ruleAvailability,
    optimal,
    hint,
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
