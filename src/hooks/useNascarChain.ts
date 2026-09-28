import { useState, useCallback, useEffect, useRef } from 'react';
import { NascarChainState, NascarChainMode, getNascarChainMultiplier, getNascarEarnedBadge, NASCAR_CHAIN_STARTERS } from '@/types/nascarChain';
import { supabase } from '@/integrations/supabase/client';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import type { PlayerSourceConfig } from '@/lib/playerSearch';
import { toast } from 'sonner';
import { getTodayET } from '@/lib/dateUtils';
import { readChainDaily, writeChainDaily } from '@/lib/chainDaily';
import { markRestoredFinish } from '@/lib/restoredFinish';

const SLUG = 'nascar-chain';

/**
 * NASCAR driver pool for the shared PlayerAutocomplete input (see
 * src/components/game/PlayerAutocomplete.tsx and src/lib/playerSearch.ts).
 * Points at nascar_drivers (83 rows, verified via information_schema + row
 * count on flawuiqbvjobmkfkauhw, 2026-07-03), which is a real stats table
 * (years_active, total_wins, championships, etc.) and a bigger pool than the
 * 44-name static ALL_NASCAR_DRIVERS list in src/types/nascarChain.ts, so this
 * migration is a straightforward win in name coverage, unlike tennis_players
 * which is smaller than its static counterpart. total_wins is used as the
 * prominence column so more accomplished drivers surface first.
 */
export const NASCAR_DRIVER_SOURCE: PlayerSourceConfig = {
  table: 'nascar_drivers',
  nameColumn: 'driver_name',
  prominenceColumn: 'total_wins',
  metaColumns: {
    championships: 'championships',
    yearsActive: 'years_active',
  },
  ilikeLimit: 200,
  prominenceLimit: 1000,
};

function getDailyStarter(today: string): string {
  /* ROUND 366: ET, not UTC. Found by simDailyPoolOrder section 4 rather than
     by the audit, which did not reach these two. toISOString is UTC, so the
     daily starter rolled at 8pm ET while the completion filed against
     getEtDateString, putting the puzzle and the score on different days.
     Round 645 part three: the day comes in from the hook's mount pin, so the
     starter and the record it is filed under always name the same day. */
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = ((hash << 5) - hash + today.charCodeAt(i)) | 0;
  }
  return NASCAR_CHAIN_STARTERS[Math.abs(hash) % NASCAR_CHAIN_STARTERS.length];
}

function getRandomStarter(): string {
  return NASCAR_CHAIN_STARTERS[Math.floor(Math.random() * NASCAR_CHAIN_STARTERS.length)];
}

/* Round 645 part three: today's chain as it was left, rebuilt from the
   shared record (src/lib/chainDaily.ts). The score, the badge and the used
   names are derived from the links by the same rules makeGuess plays by. */
function restoreDaily(today: string): NascarChainState | null {
  const rec = readChainDaily(SLUG, today, getDailyStarter(today));
  if (!rec) return null;
  const chain = rec.links.map(l => (l.note !== undefined ? { driverName: l.name, connection: l.note } : { driverName: l.name }));
  const chainLength = chain.length - 1;
  const rawScore = chainLength * 100;
  return {
    currentDriver: chain[chain.length - 1].driverName,
    chain,
    score: Math.floor(rawScore * getNascarChainMultiplier(chainLength)),
    rawScore,
    gameStatus: rec.ended ? 'ended' : 'playing',
    usedDrivers: new Set(chain.map(l => l.driverName.toLowerCase())),
    mode: 'daily',
    ...(rec.ended ? { gameOverReason: rec.reason ?? '', earnedBadge: getNascarEarnedBadge(chainLength), leaderboardSaved: rec.leaderboard } : {}),
  };
}

export function useNascarChain() {
  /* Round 428's rule: the day is pinned at mount, so a session that crosses
     midnight ET keeps dealing and filing the day it started on. */
  const todayStr = useRef(getTodayET()).current;
  const [gameState, setGameState] = useState<NascarChainState | null>(null);
  const [validating, setValidating] = useState(false);
  /* Round 645 part three fix: read by giveUp, which must refuse while a guess
     is out being verified. A ref, so the refusal never reads a stale render. */
  const validatingRef = useRef(false);

  const startGame = useCallback((mode: NascarChainMode) => {
    /* Round 645 part three: today's daily is dealt once. A finished chain
       comes back finished (and is not a new finish, so it says so before it
       is set), and one left part way comes back on the link it was left on. */
    if (mode === 'daily') {
      const saved = restoreDaily(todayStr);
      if (saved) {
        if (saved.gameStatus === 'ended') markRestoredFinish(SLUG);
        setGameState(saved);
        return;
      }
    }
    const starter = mode === 'daily' ? getDailyStarter(todayStr) : getRandomStarter();
    setGameState({
      currentDriver: starter,
      chain: [{ driverName: starter }],
      score: 0,
      rawScore: 0,
      gameStatus: 'playing',
      usedDrivers: new Set([starter.toLowerCase()]),
      mode,
    });
  }, [todayStr]);

  const makeGuess = useCallback(async (guessedName: string) => {
    if (!gameState || gameState.gameStatus !== 'playing' || validating) return;

    const normalizedGuess = guessedName.toLowerCase();

    if (gameState.usedDrivers.has(normalizedGuess)) {
      const chainLength = gameState.chain.length - 1;
      setGameState(prev => prev ? ({
        ...prev,
        gameStatus: 'ended',
        gameOverReason: `You already used ${guessedName} in this chain!`,
        earnedBadge: getNascarEarnedBadge(chainLength),
      }) : null);
      return;
    }

    setValidating(true);
    validatingRef.current = true;
    /* Round 645 part three fix: a verdict belongs to the chain it was asked
       about. If that chain has ended or been replaced by the time the answer
       comes back, the answer is dropped, so it can never change a finish the
       recorder has already been handed. */
    const askedOn = gameState.chain;
    const stillAsked = (prev: NascarChainState | null): prev is NascarChainState =>
      !!prev && prev.gameStatus === 'playing' && prev.chain === askedOn;

    try {
      const { data, error } = await supabase.functions.invoke('nascar-chain-validate', {
        body: {
          currentDriver: gameState.currentDriver,
          guessedDriver: guessedName,
        },
      });

      if (error) throw error;

      if (data.valid) {
        const fullName = data.fullName || guessedName;
        const connection = data.connection || '';

        const newChain = [...gameState.chain];
        newChain[newChain.length - 1] = {
          ...newChain[newChain.length - 1],
          connection,
        };
        newChain.push({ driverName: fullName });

        const newRawScore = gameState.rawScore + 100;
        const chainLength = newChain.length - 1;
        const multiplier = getNascarChainMultiplier(chainLength);
        const newScore = Math.floor(newRawScore * multiplier);

        setGameState(prev => {
          if (!stillAsked(prev)) return prev;
          /* Round 645 part three fix: the used check runs again on the name
             the validator settled on, which can differ from the one picked
             (an alias it folded). A chain never holds one driver twice, the
             rule the daily record is read back by. */
          if (prev.usedDrivers.has(fullName.toLowerCase())) {
            return {
              ...prev,
              gameStatus: 'ended',
              gameOverReason: `You already used ${fullName} in this chain!`,
              earnedBadge: getNascarEarnedBadge(prev.chain.length - 1),
            };
          }
          return {
            ...prev,
            currentDriver: fullName,
            chain: newChain,
            score: newScore,
            rawScore: newRawScore,
            usedDrivers: new Set([...prev.usedDrivers, fullName.toLowerCase()]),
          };
        });
      } else if (data.unverified) {
        /* ROUND 500: A DEFERRAL IS NOT A WRONG ANSWER, AND THIS BRANCH IS WHERE
           IT WAS BEING TURNED INTO ONE.
           The catch below already carries the right rule and the right comment,
           but it only runs on a THROWN error. Every infrastructure failure in
           the validator answers HTTP 200 with {valid:false}, so it sailed past
           the catch, landed in the else, ended the run and filed the score
           through useGameCompletion. The validator's own text said "so this
           cannot be counted" and then the client counted it.
           Same treatment as the catch: say so, leave the chain untouched, burn
           nothing. */
        toast.error(data.reason || "Couldn't verify that guess right now, please try again.");
      } else {
        const chainLength = gameState.chain.length - 1;
        setGameState(prev => (stillAsked(prev) ? {
          ...prev,
          gameStatus: 'ended',
          gameOverReason: data.reason || 'Incorrect! That driver did not beat them to the Cup title.',
          earnedBadge: getNascarEarnedBadge(chainLength),
        } : prev));
      }
    } catch {
      // FAIL CLOSED: a network failure is not a wrong answer, don't accept
      // an unverified guess (that farms score) and don't end the game.
      // Leave the chain untouched and ask the player to retry.
      toast.error("Couldn't verify that guess right now, please try again.");
    } finally {
      validatingRef.current = false;
      setValidating(false);
    }
  }, [gameState, validating]);

  const giveUp = useCallback(() => {
    /* Round 645 part three fix: not while a guess is out being verified. The
       board shuts the button for the same window; this is the rule itself. */
    if (!gameState || validatingRef.current) return;
    const chainLength = gameState.chain.length - 1;
    setGameState(prev => prev ? ({
      ...prev,
      gameStatus: 'ended',
      gameOverReason: 'You gave up!',
      earnedBadge: getNascarEarnedBadge(chainLength),
    }) : null);
  }, [gameState]);

  /* Round 645 part three fix: today's nickname row is on the leaderboard, so
     the finished daily, reloaded, does not offer the form a second time. */
  const markLeaderboardSaved = useCallback(() => {
    setGameState(prev => (prev && prev.gameStatus === 'ended' ? { ...prev, leaderboardSaved: true } : prev));
  }, []);

  const resetGame = useCallback(() => setGameState(null), []);

  /* Round 645 part three: the daily chain is filed on every link and on the
     end, so a refresh brings it back where it was instead of dealing the same
     starter again with the answers known. */
  useEffect(() => {
    if (!gameState || gameState.mode !== 'daily') return;
    writeChainDaily(SLUG, todayStr, {
      links: gameState.chain.map(l => (l.connection !== undefined ? { name: l.driverName, note: l.connection } : { name: l.driverName })),
      ended: gameState.gameStatus === 'ended',
      reason: gameState.gameOverReason ?? null,
      correctAnswer: null,
      leaderboard: gameState.leaderboardSaved === true,
    });
  }, [gameState, todayStr]);

  useGameCompletion('nascar-chain', gameState?.gameStatus === 'ended', gameState?.score ?? 0);

  return { gameState, startGame, makeGuess, giveUp, resetGame, validating, markLeaderboardSaved };
}
