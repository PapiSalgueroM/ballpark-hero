import { useState, useCallback, useEffect, useMemo } from 'react';
import { HigherLowerPlayer } from '@/types/higherLower';
import { higherLowerPlayers } from '@/data/higherLowerPlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { makeFirstDraw } from '@/lib/firstDraw';

type StatKey = 'appearances' | 'goals' | 'assists' | 'trophies' | 'internationalCaps';

const STAT_LABELS: Record<StatKey, string> = {
  appearances: 'Appearances',
  goals: 'Goals',
  assists: 'Assists',
  trophies: 'Trophies',
  internationalCaps: 'Int\'l Caps',
};

function getRandomPlayer(exclude: string[], currentPlayer?: HigherLowerPlayer): HigherLowerPlayer {
  const available = higherLowerPlayers.filter(p => !exclude.includes(p.name));
  if (available.length === 0) {
    return higherLowerPlayers[Math.floor(Math.random() * higherLowerPlayers.length)];
  }

  // If we have a current player, ensure at least one stat where current >= next
  if (currentPlayer) {
    const statKeys: (keyof HigherLowerPlayer['stats'])[] = ['appearances', 'goals', 'assists', 'trophies', 'internationalCaps'];
    const valid = available.filter(p =>
      statKeys.some(stat => currentPlayer.stats[stat] >= p.stats[stat])
    );
    if (valid.length > 0) {
      return valid[Math.floor(Math.random() * valid.length)];
    }
  }

  return available[Math.floor(Math.random() * available.length)];
}

function getStreakReaction(streak: number): { emoji: string; message: string } {
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  if (streak === 0) return { emoji: '😬', message: pick([
    "Zero on the board. We all start somewhere.",
    "Not a single one. The comeback begins now.",
    "Rough start. Shake it off and run it back.",
  ]) };
  if (streak <= 2) return { emoji: '😐', message: pick([
    "A couple in the bag. Warm-up is over.",
    "Just getting loose. Let's see a real streak.",
    "Baby steps. Go again and cook.",
  ]) };
  if (streak <= 5) return { emoji: '🙂', message: pick([
    "Solid start. You've clearly watched a game or two.",
    "Respectable. Double digits are right there.",
    "Decent. Now push it and don't blink.",
  ]) };
  if (streak <= 10) return { emoji: '😊', message: pick([
    "Now we're talking. You know your stuff.",
    "Clean run. The homework shows.",
    "Double digits in sight. Real knowledge on display.",
  ]) };
  if (streak <= 19) return { emoji: '🔥', message: pick([
    "On fire. The football brain is strong.",
    "Locked in. This is a proper streak.",
    "You're cooking. Do not stop now.",
  ]) };
  if (streak <= 29) return { emoji: '🌟', message: pick([
    "Incredible run. You're a walking stat sheet.",
    "Elite. Most people tapped out 20 ago.",
    "Seriously impressive. Keep it rolling.",
  ]) };
  return { emoji: '🏆', message: pick([
    "Legendary. Bow to the football genius.",
    "Untouchable. Are you even human?",
    "Hall of Fame stuff. Screenshot this one.",
  ]) };
}

/**
 * Round 421's rule, applied to the opening pair: a random pick that seeds
 * React state is drawn ONCE PER MOUNT, not once per render attempt, because
 * React may begin a render, throw it away and start again, and the retry
 * draws again. Here that showed up in the saved page: the prerenderer seeds
 * Math.random identically on every sample so a random pick freezes the same
 * way in every build, which only holds while the draws happen in the same
 * ORDER, and a second run of these two initialisers moved every draw after
 * them. /higher-lower shipped two frozen names in its snapshot and was
 * rewritten and re-dated by a build that changed nothing, and lastmod is the
 * only re-crawl lever this site has.
 *
 * The PAIR is drawn together and held together, which is the bit the memo
 * could not do one call at a time: the second player is chosen against the
 * first (never the same man, and at least one stat where the first is not
 * behind), so two independent memos could hold two picks that were never
 * chosen for each other.
 */
const firstPair = makeFirstDraw(() => {
  const first = getRandomPlayer([]);
  return { first, second: getRandomPlayer([first.name], first) };
});

export function useHigherLower() {
  const [currentPlayer, setCurrentPlayer] = useState<HigherLowerPlayer>(() => firstPair.get().first);
  const [nextPlayer, setNextPlayer] = useState<HigherLowerPlayer>(() => firstPair.get().second);
  /* The release is the effect itself, not a cleanup: the pick is held only
     from the first render attempt to the commit that used it. */
  useEffect(firstPair.release, []);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [gameStatus, setGameStatus] = useState<'playing' | 'lost'>('playing');
  const [lastChoice, setLastChoice] = useState<{ stat: StatKey; correct: boolean } | null>(null);
  const [revealedStats, setRevealedStats] = useState(false);

  const statLabels = STAT_LABELS;

  const chooseStat = useCallback((stat: StatKey) => {
    if (gameStatus !== 'playing' || revealedStats) return;

    const currentVal = currentPlayer.stats[stat];
    const nextVal = nextPlayer.stats[stat];
    const isCorrect = currentVal >= nextVal;

    setRevealedStats(true);
    setLastChoice({ stat, correct: isCorrect });

    if (isCorrect) {
      setTimeout(() => {

        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > bestStreak) setBestStreak(newStreak);
        // Shift: next becomes current, pick new next
        const usedNames = [nextPlayer.name];
        const newNext = getRandomPlayer(usedNames, nextPlayer);
        setCurrentPlayer(nextPlayer);
        setNextPlayer(newNext);
        setRevealedStats(false);
        setLastChoice(null);
      }, 3000);
    } else {
      setTimeout(() => {
        setGameStatus('lost');
      }, 3000);
    }
  }, [gameStatus, currentPlayer, nextPlayer, streak, bestStreak, revealedStats]);

  const giveUp = useCallback(() => {
    if (gameStatus !== 'playing') return;
    setGameStatus('lost');
  }, [gameStatus]);

  const resetGame = useCallback(() => {
    const p1 = getRandomPlayer([]);
    const p2 = getRandomPlayer([p1.name], p1);
    setCurrentPlayer(p1);
    setNextPlayer(p2);
    setStreak(0);
    setGameStatus('playing');
    setLastChoice(null);
    setRevealedStats(false);
  }, []);

  const streakReaction = useMemo(() => getStreakReaction(streak), [streak]);
  const lossReaction = useMemo(() => getStreakReaction(streak), [streak]);

  useGameCompletion('higher-lower', gameStatus === 'lost', streak * 100);

  return {
    currentPlayer,
    nextPlayer,
    streak,
    bestStreak,
    gameStatus,
    lastChoice,
    revealedStats,
    chooseStat,
    giveUp,
    resetGame,
    streakReaction,
    lossReaction,
    statLabels,
  };
}
