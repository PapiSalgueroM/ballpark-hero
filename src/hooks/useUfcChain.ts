import { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, GameMode, WeightClass, ChainLink, UfcFighter, getChainLengthMultiplier, getEarnedBadge } from '@/types/ufcChain';
import { UFC_FIGHTERS, getFightersWhoBeat, getFightResult, getRandomStartingFighter, getDailyStartingFighter, getHallOfFamers, getFightersByWeightClass } from '@/data/ufcChainData';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET } from '@/lib/dateUtils';
import { readChainDaily, writeChainDaily } from '@/lib/chainDaily';
import { markRestoredFinish } from '@/lib/restoredFinish';

const CHAMPIONSHIP_BONUS = 50;
const SLUG = 'ufc-chain';

/* Round 645 part three: today's chain as it was left, rebuilt from the
   shared record (src/lib/chainDaily.ts). Every link is looked up in the
   bundled fight results and must really have beaten the one before it, and
   the bonus, the score and the badge are derived by the same rules makeGuess
   plays by, so the record carries names and nothing a player could inflate. */
function restoreDaily(today: string): GameState | null {
  const rec = readChainDaily(SLUG, today, getDailyStartingFighter(today).name);
  if (!rec) return null;
  const fighters: UfcFighter[] = [];
  for (const l of rec.links) {
    const f = UFC_FIGHTERS.find(x => x.name === l.name);
    if (!f) return null;
    fighters.push(f);
  }
  const chain: ChainLink[] = [];
  let rawScore = 0;
  for (let i = 0; i < fighters.length; i += 1) {
    if (i === 0) { chain.push({ fighter: fighters[0] }); continue; }
    const fight = getFightResult(fighters[i].name, fighters[i - 1].name);
    if (!fight) return null;
    const bonusPoints = fight.wasChampionshipFight ? CHAMPIONSHIP_BONUS : 0;
    chain[i - 1].defeatedBy = fighters[i];
    chain.push({ fighter: fighters[i], bonusPoints });
    rawScore += 100 + bonusPoints;
  }
  let correctAnswer: UfcFighter | undefined;
  if (rec.correctAnswer !== null) {
    correctAnswer = UFC_FIGHTERS.find(x => x.name === rec.correctAnswer);
    if (!correctAnswer) return null;
  }
  const chainLength = chain.length - 1;
  return {
    currentFighter: fighters[fighters.length - 1],
    chain,
    score: Math.floor(rawScore * getChainLengthMultiplier(chainLength)),
    rawScore,
    gameStatus: rec.ended ? 'ended' : 'playing',
    usedFighters: new Set(fighters.map(f => f.name)),
    mode: 'daily',
    ...(rec.ended ? { gameOverReason: rec.reason ?? '', correctAnswer, earnedBadge: getEarnedBadge(chainLength) } : {}),
  };
}

export function useUfcChain() {
  /* Round 428's rule: the day is pinned at mount, so a session that crosses
     midnight ET keeps dealing and filing the day it started on. */
  const todayStr = useRef(getTodayET()).current;
  const [gameState, setGameState] = useState<GameState | null>(null);

  const startGame = useCallback((mode: GameMode, weightClass?: WeightClass) => {
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

    let startingFighter;

    if (mode === 'daily') {
      startingFighter = getDailyStartingFighter(todayStr);
    } else if (mode === 'hall-of-fame') {
      startingFighter = getRandomStartingFighter({ hallOfFameOnly: true });
    } else if (mode === 'weight-class' && weightClass) {
      startingFighter = getRandomStartingFighter({ weightClass });
    } else {
      startingFighter = getRandomStartingFighter();
    }

    setGameState({
      currentFighter: startingFighter,
      chain: [{ fighter: startingFighter }],
      score: 0,
      rawScore: 0,
      gameStatus: 'playing',
      usedFighters: new Set([startingFighter.name]),
      mode,
      selectedWeightClass: weightClass,
    });
  }, [todayStr]);

  const makeGuess = useCallback((guessedFighterName: string) => {
    if (!gameState || gameState.gameStatus !== 'playing') return;

    const guessedFighter = UFC_FIGHTERS.find(f => f.name === guessedFighterName);
    if (!guessedFighter) return;

    // Validate fighter for mode
    if (gameState.mode === 'hall-of-fame' && !guessedFighter.isHallOfFamer) {
      return; // Invalid selection for mode
    }
    if (gameState.mode === 'weight-class' && gameState.selectedWeightClass && 
        guessedFighter.weightClass !== gameState.selectedWeightClass) {
      return; // Invalid selection for mode
    }

    // Check if fighter already used
    if (gameState.usedFighters.has(guessedFighterName)) {
      const chainLength = gameState.chain.length - 1;
      setGameState(prev => prev ? ({
        ...prev,
        gameStatus: 'ended',
        gameOverReason: `You already used ${guessedFighterName} in this chain!`,
        earnedBadge: getEarnedBadge(chainLength),
      }) : null);
      return;
    }

    // Check if the guessed fighter actually beat the current fighter
    const weightClassFilter = gameState.mode === 'weight-class' ? gameState.selectedWeightClass : undefined;
    const validOpponents = getFightersWhoBeat(gameState.currentFighter.name, weightClassFilter);
    
    // For hall of fame mode, filter to only HOF fighters
    const filteredOpponents = gameState.mode === 'hall-of-fame' 
      ? validOpponents.filter(f => f.isHallOfFamer)
      : validOpponents;
    
    const isCorrect = filteredOpponents.some(f => f.name === guessedFighterName);

    if (isCorrect) {
      // Calculate bonus points
      let bonusPoints = 0;
      const fightResult = getFightResult(guessedFighterName, gameState.currentFighter.name);
      if (fightResult?.wasChampionshipFight) {
        bonusPoints += CHAMPIONSHIP_BONUS;
      }

      // Extend chain
      const newChain = [...gameState.chain];
      newChain[newChain.length - 1].defeatedBy = guessedFighter;
      newChain.push({ fighter: guessedFighter, bonusPoints });

      const newRawScore = gameState.rawScore + 100 + bonusPoints;
      const chainLength = newChain.length - 1;
      const multiplier = getChainLengthMultiplier(chainLength);
      const newScore = Math.floor(newRawScore * multiplier);

      setGameState(prev => prev ? ({
        ...prev,
        currentFighter: guessedFighter,
        chain: newChain,
        score: newScore,
        rawScore: newRawScore,
        usedFighters: new Set([...prev.usedFighters, guessedFighterName]),
      }) : null);
    } else {
      // Wrong guess - end game
      const chainLength = gameState.chain.length - 1;
      setGameState(prev => prev ? ({
        ...prev,
        gameStatus: 'ended',
        gameOverReason: 'Incorrect guess!',
        correctAnswer: filteredOpponents[0],
        earnedBadge: getEarnedBadge(chainLength),
      }) : null);
    }
  }, [gameState]);

  const giveUp = useCallback(() => {
    if (!gameState) return;
    
    const weightClassFilter = gameState.mode === 'weight-class' ? gameState.selectedWeightClass : undefined;
    let validOpponents = getFightersWhoBeat(gameState.currentFighter.name, weightClassFilter);
    
    if (gameState.mode === 'hall-of-fame') {
      validOpponents = validOpponents.filter(f => f.isHallOfFamer);
    }
    
    const chainLength = gameState.chain.length - 1;
    setGameState(prev => prev ? ({
      ...prev,
      gameStatus: 'ended',
      gameOverReason: 'You gave up!',
      correctAnswer: validOpponents[0],
      earnedBadge: getEarnedBadge(chainLength),
    }) : null);
  }, [gameState]);

  const resetGame = useCallback(() => {
    setGameState(null);
  }, []);

  const getAvailableFighters = useCallback(() => {
    if (!gameState) return UFC_FIGHTERS;
    
    if (gameState.mode === 'hall-of-fame') {
      return getHallOfFamers();
    }
    if (gameState.mode === 'weight-class' && gameState.selectedWeightClass) {
      return getFightersByWeightClass(gameState.selectedWeightClass);
    }
    return UFC_FIGHTERS;
  }, [gameState]);

  /* Round 645 part three: the daily chain is filed on every link and on the
     end, so a refresh brings it back where it was instead of dealing the same
     fighter again with the answers known. */
  useEffect(() => {
    if (!gameState || gameState.mode !== 'daily') return;
    writeChainDaily(SLUG, todayStr, {
      links: gameState.chain.map(l => ({ name: l.fighter.name })),
      ended: gameState.gameStatus === 'ended',
      reason: gameState.gameOverReason ?? null,
      correctAnswer: gameState.correctAnswer?.name ?? null,
    });
  }, [gameState, todayStr]);

  useGameCompletion('ufc-chain', gameState?.gameStatus === 'ended', gameState?.score ?? 0);

  return {
    gameState,
    startGame,
    makeGuess,
    giveUp,
    resetGame,
    getAvailableFighters,
  };
}