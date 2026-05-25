import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BlurredFacePlayer, BlurredFaceGameStatus, BlurredFaceHint } from '@/types/blurredFace';
import { blurredFacePlayers } from '@/data/blurredFacePlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';

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

export type BlurredFaceMode = 'daily' | 'unlimited';

type BFAction =
  | { t: 'wrong'; name: string }
  | { t: 'won'; name: string }
  | { t: 'give' };

function getHintValue(player: BlurredFacePlayer, key: string): string {
  if (key === 'status') return player.isActive ? '✅ Active Player' : '🔴 Retired Legend';
  if (key === 'age') {
    if (!player.isActive && player.age === 0) return 'Deceased';
    return player.isActive ? `${player.age} years old` : `${player.age} years old (retired)`;
  }
  return String(player[key as keyof BlurredFacePlayer]);
}

function buildHints(player: BlurredFacePlayer, wrongCount: number): BlurredFaceHint[] {
  return Array.from({ length: Math.min(wrongCount, HINT_ORDER.length) }, (_, idx) => {
    const hintDef = HINT_ORDER[idx];
    return { label: hintDef.label, value: getHintValue(player, hintDef.key), icon: hintDef.icon };
  });
}

export function useBlurredFace() {
  const [mode, setMode] = useState<BlurredFaceMode>('daily');
  const switchMode = useCallback((m: BlurredFaceMode) => setMode(m), []);

  // ── Daily ──────────────────────────────────────────────────────────────────
  const {
    puzzle: dailyPuzzle,
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading: dailyLoading,
  } = useDailyPuzzle<BlurredFacePlayer, BFAction>({
    gameSlug: 'blurred-face',
    puzzles: blurredFacePlayers,
    maxGuesses: 999,
    isWon: (g) => g.some((a) => a.t === 'won'),
    isLost: (g) =>
      g.some((a) => a.t === 'give') || g.filter((a) => a.t === 'wrong').length >= MAX_GUESSES,
    deserializeGuesses: (raw) => raw as BFAction[],
  });

  const dailyWrongGuesses = useMemo(
    () => dailyActions.filter((a): a is { t: 'wrong'; name: string } => a.t === 'wrong').map((a) => a.name),
    [dailyActions],
  );

  const dailyGameStatus: BlurredFaceGameStatus = useMemo(() => {
    if (rawDailyStatus === 'playing') return 'playing';
    if (rawDailyStatus === 'won') return 'won';
    if (dailyActions.some((a) => a.t === 'give')) return 'gave-up';
    return 'lost';
  }, [rawDailyStatus, dailyActions]);

  // ── Unlimited ──────────────────────────────────────────────────────────────
  const [unlimitedPlayer, setUnlimitedPlayer] = useState<BlurredFacePlayer>(
    () => blurredFacePlayers[Math.floor(Math.random() * blurredFacePlayers.length)],
  );
  const [unlimitedStatus, setUnlimitedStatus] = useState<BlurredFaceGameStatus>('loading');
  const [unlimitedWrongGuesses, setUnlimitedWrongGuesses] = useState<string[]>([]);
  const [unlimitedRevealedHints, setUnlimitedRevealedHints] = useState<BlurredFaceHint[]>([]);

  // ── Image fetching ─────────────────────────────────────────────────────────
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageLoading, setImageLoading] = useState(true);

  const fetchImage = useCallback(async (slug: string) => {
    setImageLoading(true);
    setImageUrl('');
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`,
      );
      const data = await res.json();
      const imgUrl = data.thumbnail?.source || data.originalimage?.source || '';
      if (imgUrl) setImageUrl(imgUrl.replace(/\/\d+px-/, '/400px-'));
    } catch { /* silent */ }
    setImageLoading(false);
  }, []);

  // Track which slug we've already fetched to avoid duplicate requests
  const fetchedSlugRef = useRef<string | null>(null);

  useEffect(() => {
    const activePlayer = mode === 'daily' ? dailyPuzzle : unlimitedPlayer;
    const waitingForDaily = mode === 'daily' && dailyLoading;
    if (!activePlayer || waitingForDaily) return;
    if (fetchedSlugRef.current === activePlayer.wikipediaSlug) return;
    fetchedSlugRef.current = activePlayer.wikipediaSlug;
    fetchImage(activePlayer.wikipediaSlug);
  }, [mode, dailyPuzzle, unlimitedPlayer, dailyLoading, fetchImage]);

  // ── Active (mode-dependent) values ────────────────────────────────────────
  const activePlayer = mode === 'daily' ? (dailyPuzzle ?? null) : unlimitedPlayer;

  const gameStatus: BlurredFaceGameStatus = useMemo(() => {
    if (mode === 'daily') {
      if (dailyLoading || imageLoading) return 'loading';
      return dailyGameStatus;
    }
    return unlimitedStatus;
  }, [mode, dailyLoading, imageLoading, dailyGameStatus, unlimitedStatus]);

  const wrongGuesses = mode === 'daily' ? dailyWrongGuesses : unlimitedWrongGuesses;

  const revealedHints: BlurredFaceHint[] = useMemo(() => {
    if (mode === 'daily') {
      if (!dailyPuzzle) return [];
      return buildHints(dailyPuzzle, dailyWrongGuesses.length);
    }
    return unlimitedRevealedHints;
  }, [mode, dailyPuzzle, dailyWrongGuesses, unlimitedRevealedHints]);

  const blurAmount = BLUR_LEVELS[Math.min(wrongGuesses.length, BLUR_LEVELS.length - 1)];

  // ── Actions ────────────────────────────────────────────────────────────────
  const makeGuess = useCallback((guessName: string) => {
    if (!activePlayer || gameStatus !== 'playing') return;

    const normalized = guessName.trim().toLowerCase();
    const target = activePlayer.name.toLowerCase();

    if (normalized === target) {
      if (mode === 'daily') {
        addDailyAction({ t: 'won', name: guessName });
      } else {
        setUnlimitedStatus('won');
      }
      return;
    }

    // Wrong guess
    if (mode === 'daily') {
      addDailyAction({ t: 'wrong', name: guessName });
    } else {
      const newWrong = [...unlimitedWrongGuesses, guessName];
      setUnlimitedWrongGuesses(newWrong);

      const hintIdx = newWrong.length - 1;
      if (hintIdx < HINT_ORDER.length) {
        const hintDef = HINT_ORDER[hintIdx];
        setUnlimitedRevealedHints((prev) => [
          ...prev,
          { label: hintDef.label, value: getHintValue(activePlayer, hintDef.key), icon: hintDef.icon },
        ]);
      }

      if (newWrong.length >= MAX_GUESSES) {
        setUnlimitedStatus('lost');
      }
    }
  }, [mode, activePlayer, gameStatus, addDailyAction, unlimitedWrongGuesses]);

  const giveUp = useCallback(() => {
    if (gameStatus !== 'playing') return;
    if (mode === 'daily') {
      addDailyAction({ t: 'give' });
    } else {
      setUnlimitedStatus('gave-up');
    }
  }, [mode, gameStatus, addDailyAction]);

  const resetGame = useCallback(() => {
    if (mode !== 'unlimited') return;
    const next = blurredFacePlayers[Math.floor(Math.random() * blurredFacePlayers.length)];
    setUnlimitedPlayer(next);
    setUnlimitedWrongGuesses([]);
    setUnlimitedRevealedHints([]);
    setUnlimitedStatus('loading');
    // fetchImage fires via the useEffect when unlimitedPlayer changes
  }, [mode]);

  // ── Game completion ────────────────────────────────────────────────────────
  const dailyScore = rawDailyStatus === 'won'
    ? Math.max(100, (MAX_GUESSES - dailyWrongGuesses.length) * 150)
    : 0;

  useGameCompletion(
    'blurred-face',
    rawDailyStatus !== 'playing',
    dailyScore,
  );

  return {
    mode, switchMode,
    targetPlayer: activePlayer,
    imageUrl,
    gameStatus,
    wrongGuesses,
    revealedHints,
    blurAmount,
    maxGuesses: MAX_GUESSES,
    makeGuess,
    giveUp,
    resetGame,
    isLoading: dailyLoading || (mode === 'daily' && imageLoading),
  };
}
