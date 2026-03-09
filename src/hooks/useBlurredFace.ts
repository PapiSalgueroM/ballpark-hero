import { useState, useEffect, useCallback } from 'react';
import { BlurredFacePlayer, BlurredFaceGameStatus, BlurredFaceHint } from '@/types/blurredFace';
import { blurredFacePlayers } from '@/data/blurredFacePlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';

const MAX_GUESSES = 6;
const BLUR_LEVELS = [30, 24, 18, 12, 7, 3, 0]; // index = number of wrong guesses

const HINT_ORDER: { key: keyof BlurredFacePlayer | 'status'; label: string; icon: string }[] = [
  { key: 'status', label: 'Status', icon: '🏃' },
  { key: 'nationality', label: 'Nationality', icon: '🌍' },
  { key: 'position', label: 'Position', icon: '📍' },
  { key: 'club', label: 'Club', icon: '🏟️' },
  { key: 'age', label: 'Age', icon: '🎂' },
  { key: 'league', label: 'League', icon: '🏆' },
];

export function useBlurredFace() {
  const [targetPlayer, setTargetPlayer] = useState<BlurredFacePlayer | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [gameStatus, setGameStatus] = useState<BlurredFaceGameStatus>('loading');
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [revealedHints, setRevealedHints] = useState<BlurredFaceHint[]>([]);

  const blurAmount = BLUR_LEVELS[Math.min(wrongGuesses.length, BLUR_LEVELS.length - 1)];

  const fetchPlayerImage = useCallback(async (slug: string) => {
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`);
      const data = await res.json();
      const imgUrl = data.thumbnail?.source || data.originalimage?.source || '';
      if (imgUrl) {
        // Request a larger thumbnail by modifying the URL width
        const largerUrl = imgUrl.replace(/\/\d+px-/, '/400px-');
        setImageUrl(largerUrl);
      }
      setGameStatus('playing');
    } catch {
      setGameStatus('playing');
    }
  }, []);

  const startNewGame = useCallback(() => {
    const randomPlayer = blurredFacePlayers[Math.floor(Math.random() * blurredFacePlayers.length)];
    setTargetPlayer(randomPlayer);
    setWrongGuesses([]);
    setRevealedHints([]);
    setImageUrl('');
    setGameStatus('loading');
    fetchPlayerImage(randomPlayer.wikipediaSlug);
  }, [fetchPlayerImage]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const getHintValue = (player: BlurredFacePlayer, key: string): string => {
    if (key === 'status') return player.isActive ? '✅ Active Player' : '🔴 Retired Legend';
    if (key === 'age') {
      if (!player.isActive && player.age === 0) return 'Deceased';
      return player.isActive ? `${player.age} years old` : `${player.age} years old (retired)`;
    }
    return String(player[key as keyof BlurredFacePlayer]);
  };

  const makeGuess = useCallback((guessName: string) => {
    if (!targetPlayer || gameStatus !== 'playing') return;

    const normalizedGuess = guessName.trim().toLowerCase();
    const normalizedTarget = targetPlayer.name.toLowerCase();

    if (normalizedGuess === normalizedTarget) {
      setGameStatus('won');
      return;
    }

    // Wrong guess
    const newWrongGuesses = [...wrongGuesses, guessName];
    setWrongGuesses(newWrongGuesses);

    // Reveal next hint
    const hintIndex = newWrongGuesses.length - 1;
    if (hintIndex < HINT_ORDER.length) {
      const hintDef = HINT_ORDER[hintIndex];
      setRevealedHints(prev => [...prev, {
        label: hintDef.label,
        value: getHintValue(targetPlayer, hintDef.key),
        icon: hintDef.icon,
      }]);
    }

    // Check if max guesses reached
    if (newWrongGuesses.length >= MAX_GUESSES) {
      setGameStatus('lost');
    }
  }, [targetPlayer, gameStatus, wrongGuesses]);

  const giveUp = useCallback(() => {
    setGameStatus('gave-up');
  }, []);

  const completionScore = gameStatus === 'won' ? Math.max(100, (MAX_GUESSES - wrongGuesses.length) * 150) : 0;
  useGameCompletion('blurred-face', gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'gave-up', completionScore);

  return {
    targetPlayer,
    imageUrl,
    gameStatus,
    wrongGuesses,
    revealedHints,
    blurAmount,
    maxGuesses: MAX_GUESSES,
    makeGuess,
    giveUp,
    resetGame: startNewGame,
  };
}
