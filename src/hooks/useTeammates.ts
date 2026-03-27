import { useState, useCallback, useMemo } from 'react';
import { teammatesPairs } from '@/data/teammatesPairs';
import { TeammatesPair } from '@/types/teammates';
import { useGameCompletion } from '@/hooks/useGameCompletion';

const ROUNDS = 10;

function buildRound(): TeammatesPair[] {
  const easy = teammatesPairs.filter(p => p.difficulty === 1).sort(() => Math.random() - 0.5);
  const med = teammatesPairs.filter(p => p.difficulty === 2).sort(() => Math.random() - 0.5);
  const hard = teammatesPairs.filter(p => p.difficulty === 3).sort(() => Math.random() - 0.5);
  // 3 easy, 3 medium, 4 hard
  return [...easy.slice(0, 3), ...med.slice(0, 3), ...hard.slice(0, 4)];
}

export function useTeammates() {
  const [pairs, setPairs] = useState<TeammatesPair[]>(() => buildRound());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [gameOver, setGameOver] = useState(false);

  const currentPair = pairs[currentIdx] ?? null;

  const answer = useCallback((userSaysYes: boolean) => {
    if (answered || gameOver || !currentPair) return;
    const correct = userSaysYes === currentPair.answer;
    if (correct) setScore(s => s + 1);
    setLastCorrect(correct);
    setAnswered(true);
  }, [answered, gameOver, currentPair]);

  const nextQuestion = useCallback(() => {
    if (currentIdx + 1 >= ROUNDS) {
      setGameOver(true);
    } else {
      setCurrentIdx(i => i + 1);
      setAnswered(false);
      setLastCorrect(null);
    }
  }, [currentIdx]);

  const giveUp = useCallback(() => {
    if (gameOver) return;
    setGameOver(true);
  }, [gameOver]);

  const resetGame = useCallback(() => {
    setPairs(buildRound());
    setCurrentIdx(0);
    setScore(0);
    setAnswered(false);
    setLastCorrect(null);
    setGameOver(false);
  }, []);

  const shareText = useMemo(() => {
    if (!gameOver) return '';
    const emoji = score >= 8 ? '🔥' : score >= 5 ? '👍' : '😅';
    return `Teammates or Not? ${emoji} ${score}/${ROUNDS}\n\nhttps://douknowball.com/teammates`;
  }, [gameOver, score]);

  useGameCompletion('teammates', gameOver, score * 100);

  return {
    currentPair,
    currentIdx,
    totalRounds: ROUNDS,
    score,
    answered,
    lastCorrect,
    gameOver,
    answer,
    nextQuestion,
    giveUp,
    resetGame,
    shareText,
  };
}
