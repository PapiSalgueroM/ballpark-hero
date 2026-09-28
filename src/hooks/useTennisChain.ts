import { useState, useCallback, useEffect, useRef } from 'react';
import { TennisChainState, TennisChainMode, getTennisChainMultiplier, getTennisEarnedBadge, TENNIS_CHAIN_STARTERS } from '@/types/tennisChain';
import { supabase } from '@/integrations/supabase/client';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import type { PlayerSourceConfig } from '@/lib/playerSearch';
import { toast } from 'sonner';
import { getTodayET } from '@/lib/dateUtils';
import { readChainDaily, writeChainDaily } from '@/lib/chainDaily';
import { markRestoredFinish } from '@/lib/restoredFinish';

const SLUG = 'tennis-chain';

/**
 * Tennis player pool for the shared PlayerAutocomplete input (see
 * src/components/game/PlayerAutocomplete.tsx and src/lib/playerSearch.ts).
 * Points at tennis_players (40 rows, verified via information_schema +
 * row count on flawuiqbvjobmkfkauhw, 2026-07-03). This table is a curated
 * subset of the names in src/types/tennisChain.ts's ALL_TENNIS_PLAYERS list
 * (96 names) used only for the starter/timeline copy, not for search, so the
 * autocomplete's live pool here is intentionally the DB table rather than
 * that static array. Nickname matching ("Rafa", "Fed", "Nole") that the old
 * TENNIS_PLAYER_ALIASES map provided client-side is not reproduced here:
 * searchPlayers() only matches against nameColumn (player_name), not the
 * common_names array, since PlayerSourceConfig has no alias-list concept.
 * Fact-checking of a submitted name still happens entirely in makeGuess()
 * below via the tennis-chain-validate edge function, unchanged by this.
 */
export const TENNIS_PLAYER_SOURCE: PlayerSourceConfig = {
  table: 'tennis_players',
  nameColumn: 'player_name',
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
  return TENNIS_CHAIN_STARTERS[Math.abs(hash) % TENNIS_CHAIN_STARTERS.length];
}

function getRandomStarter(): string {
  return TENNIS_CHAIN_STARTERS[Math.floor(Math.random() * TENNIS_CHAIN_STARTERS.length)];
}

/* Round 645 part three: today's chain as it was left, rebuilt from the
   shared record (src/lib/chainDaily.ts). The score, the badge and the used
   names are derived from the links by the same rules makeGuess plays by. */
function restoreDaily(today: string): TennisChainState | null {
  const rec = readChainDaily(SLUG, today, getDailyStarter(today));
  if (!rec) return null;
  const chain = rec.links.map(l => (l.note !== undefined ? { playerName: l.name, slamConnection: l.note } : { playerName: l.name }));
  const chainLength = chain.length - 1;
  const rawScore = chainLength * 100;
  return {
    currentPlayer: chain[chain.length - 1].playerName,
    chain,
    score: Math.floor(rawScore * getTennisChainMultiplier(chainLength)),
    rawScore,
    gameStatus: rec.ended ? 'ended' : 'playing',
    usedPlayers: new Set(chain.map(l => l.playerName.toLowerCase())),
    mode: 'daily',
    ...(rec.ended ? { gameOverReason: rec.reason ?? '', earnedBadge: getTennisEarnedBadge(chainLength) } : {}),
  };
}

export function useTennisChain() {
  /* Round 428's rule: the day is pinned at mount, so a session that crosses
     midnight ET keeps dealing and filing the day it started on. */
  const todayStr = useRef(getTodayET()).current;
  const [gameState, setGameState] = useState<TennisChainState | null>(null);
  const [validating, setValidating] = useState(false);

  const startGame = useCallback((mode: TennisChainMode) => {
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
      currentPlayer: starter,
      chain: [{ playerName: starter }],
      score: 0,
      rawScore: 0,
      gameStatus: 'playing',
      usedPlayers: new Set([starter.toLowerCase()]),
      mode,
    });
  }, [todayStr]);

  const makeGuess = useCallback(async (guessedName: string) => {
    if (!gameState || gameState.gameStatus !== 'playing' || validating) return;

    const normalizedGuess = guessedName.toLowerCase();

    if (gameState.usedPlayers.has(normalizedGuess)) {
      const chainLength = gameState.chain.length - 1;
      setGameState(prev => prev ? ({
        ...prev,
        gameStatus: 'ended',
        gameOverReason: `You already used ${guessedName} in this chain!`,
        earnedBadge: getTennisEarnedBadge(chainLength),
      }) : null);
      return;
    }

    setValidating(true);

    try {
      const { data, error } = await supabase.functions.invoke('tennis-chain-validate', {
        body: {
          currentPlayer: gameState.currentPlayer,
          guessedPlayer: guessedName,
        },
      });

      if (error) throw error;

      if (data.valid) {
        const fullName = data.fullName || guessedName;
        const slamConnection = data.connection || '';
        
        const newChain = [...gameState.chain];
        newChain[newChain.length - 1] = {
          ...newChain[newChain.length - 1],
          slamConnection,
        };
        newChain.push({ playerName: fullName });

        const newRawScore = gameState.rawScore + 100;
        const chainLength = newChain.length - 1;
        const multiplier = getTennisChainMultiplier(chainLength);
        const newScore = Math.floor(newRawScore * multiplier);

        setGameState(prev => prev ? ({
          ...prev,
          currentPlayer: fullName,
          chain: newChain,
          score: newScore,
          rawScore: newRawScore,
          usedPlayers: new Set([...prev.usedPlayers, fullName.toLowerCase()]),
        }) : null);
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
        setGameState(prev => prev ? ({
          ...prev,
          gameStatus: 'ended',
          gameOverReason: data.reason || 'Incorrect! That player did not beat them at a Grand Slam.',
          earnedBadge: getTennisEarnedBadge(chainLength),
        }) : null);
      }
    } catch {
      // FAIL CLOSED: a network failure is not a wrong answer, don't accept
      // an unverified guess (that farms score) and don't end the game.
      // Leave the chain untouched and ask the player to retry.
      toast.error("Couldn't verify that guess right now, please try again.");
    } finally {
      setValidating(false);
    }
  }, [gameState, validating]);

  const giveUp = useCallback(() => {
    if (!gameState) return;
    const chainLength = gameState.chain.length - 1;
    setGameState(prev => prev ? ({
      ...prev,
      gameStatus: 'ended',
      gameOverReason: 'You gave up!',
      earnedBadge: getTennisEarnedBadge(chainLength),
    }) : null);
  }, [gameState]);

  const resetGame = useCallback(() => {
    setGameState(null);
  }, []);

  /* Round 645 part three: the daily chain is filed on every link and on the
     end, so a refresh brings it back where it was instead of dealing the same
     starter again with the answers known. */
  useEffect(() => {
    if (!gameState || gameState.mode !== 'daily') return;
    writeChainDaily(SLUG, todayStr, {
      links: gameState.chain.map(l => (l.slamConnection !== undefined ? { name: l.playerName, note: l.slamConnection } : { name: l.playerName })),
      ended: gameState.gameStatus === 'ended',
      reason: gameState.gameOverReason ?? null,
      correctAnswer: null,
    });
  }, [gameState, todayStr]);

  useGameCompletion('tennis-chain', gameState?.gameStatus === 'ended', gameState?.score ?? 0);

  return { gameState, startGame, makeGuess, giveUp, resetGame, validating };
}
