import { useState, useCallback, useMemo } from 'react';
import { getTodayET } from '@/lib/dateUtils';
import { nflCareerPlayers } from '@/data/nflCareerPlayers';
import { NFLCareerPlayer } from '@/types/nflCareer';
import { ensureAnswerInOptions } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { normalizeName } from '@/lib/playerSearch';
import { toast } from 'sonner';

const TOTAL_CLUES = 6;

function getDailyIndex(day: string): number {
  // Round 52: seed off the ET calendar like every other daily on the site.
  return parseInt(day.replace(/-/g, ''), 10) % nflCareerPlayers.length;
}

/* Round 52: the daily locks once finished. Refreshing used to hand out the
   same daily again with a clean slate. */
interface NflDailySave { date: string; status: 'won' | 'lost'; cluesRevealed: number; guesses: string[] }
const DAILY_KEY = 'nfl-career-daily';

function loadDailySave(day: string): NflDailySave | null {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as NflDailySave;
    return s.date === day ? s : null;
  } catch { return null; }
}

function persistDaily(date: string, status: 'won' | 'lost', cluesRevealed: number, guesses: string[]) {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify({ date, status, cluesRevealed, guesses } satisfies NflDailySave));
  } catch { /* private mode: daily just won't lock */ }
}

/* Round 643 review: what a finished daily records. A win scores by the clues
   it took; a loss or a give up scores 0, as every sibling Career Path does
   (the NBA, NHL and baseball ones record 0 unless the daily was solved). It
   used to record the clue score whatever the outcome, so giving up at the
   first clue recorded 6, the same as the best possible solve. */
function dailyScoreOf(status: 'won' | 'lost', cluesRevealed: number): number {
  return status === 'won' ? Math.max(1, TOTAL_CLUES + 1 - cluesRevealed) : 0;
}

export type NflCareerMode = 'daily' | 'unlimited';

export function useNFLCareer() {
  // Owner 2026-08-05: "it shouldn't be just a daily thing but also unlimited."
  // Daily stays date-seeded; unlimited deals random players back to back
  // without the old full-page reload.
  const [mode, setMode] = useState<NflCareerMode>('daily');
  /* Round 643 review: the day of the daily on the board, set when it is
     dealt (at mount and on the Daily tab) and never read off the clock
     again. The player is dealt from it, and the save and the record are
     stamped with it: stamped at finish time instead, a daily dealt before
     midnight and solved after was saved as the next day's, and the next
     day's real daily then loaded as already solved with the wrong guesses. */
  const [dealtDay, setDealtDay] = useState<string>(getTodayET);
  const [targetPlayer, setTargetPlayer] = useState<NFLCareerPlayer>(() => nflCareerPlayers[getDailyIndex(dealtDay)]);
  const [cluesRevealed, setCluesRevealed] = useState(() => loadDailySave(dealtDay)?.cluesRevealed ?? 1); // start with 1 clue
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>(() => loadDailySave(dealtDay)?.status ?? 'playing');
  const [guessHistory, setGuessHistory] = useState<string[]>(() => loadDailySave(dealtDay)?.guesses ?? []);
  const [hard, setHard] = useState(false);
  /* Round 643: the daily's finish, on its own, whatever mode is on screen.
     The completion hook used to read the shared gameStatus behind a mode
     check, so the Daily tab after Unlimited flipped it false then true over a
     daily already recorded and paid it again. Restored in the initializer, so
     a finished daily mounts complete and records nothing. Round 643 review:
     it carries the day it belongs to and the score it records, so a new day
     dealt in the same tab records its own daily, and the score is the daily's
     own, never the clue count of whatever is on screen. */
  const [dailyFinish, setDailyFinish] = useState<{ date: string; score: number } | null>(() => {
    const s = loadDailySave(dealtDay);
    return s ? { date: s.date, score: dailyScoreOf(s.status, s.cluesRevealed) } : null;
  });
  const finishDaily = useCallback((status: 'won' | 'lost', clues: number, guesses: string[]) => {
    persistDaily(dealtDay, status, clues, guesses);
    setDailyFinish({ date: dealtDay, score: dailyScoreOf(status, clues) });
  }, [dealtDay]);
  const dailyDone = dailyFinish !== null && dailyFinish.date === dealtDay;

  const dealRound = useCallback((player: NFLCareerPlayer) => {
    setTargetPlayer(player);
    setCluesRevealed(1);
    setGameStatus('playing');
    setGuessHistory([]);
  }, []);

  const randomPlayer = useCallback((excludeName?: string): NFLCareerPlayer => {
    const pool = nflCareerPlayers.filter(p => p.name !== excludeName);
    return pool[Math.floor(Math.random() * pool.length)] ?? nflCareerPlayers[0];
  }, []);

  const switchMode = useCallback((m: NflCareerMode) => {
    setMode(m);
    if (m === 'daily') {
      const day = getTodayET();
      const saved = loadDailySave(day);
      setDealtDay(day);
      setTargetPlayer(nflCareerPlayers[getDailyIndex(day)]);
      setCluesRevealed(saved?.cluesRevealed ?? 1);
      setGameStatus(saved?.status ?? 'playing');
      setGuessHistory(saved?.guesses ?? []);
    } else {
      dealRound(randomPlayer());
    }
  }, [dealRound, randomPlayer]);

  /* Round 643: from the daily this is the result screen's "Play Unlimited",
     and it used to deal a random player while staying in daily mode, so
     solving him recorded under the daily again and overwrote today's save
     with his result. It really leaves the daily now. */
  const nextUnlimited = useCallback(() => {
    setMode('unlimited');
    dealRound(randomPlayer(targetPlayer.name));
  }, [dealRound, randomPlayer, targetPlayer]);

  const score = useMemo(() => Math.max(1, TOTAL_CLUES + 1 - cluesRevealed), [cluesRevealed]);

  const clues = useMemo(() => {
    const all = [
      { label: 'Draft', value: `Round ${targetPlayer.draftRound}, ${targetPlayer.draftYear}` },
      { label: 'College', value: targetPlayer.college },
      { label: 'First Team', value: targetPlayer.firstTeam },
      { label: 'Career Stat', value: targetPlayer.careerStat },
      { label: 'Teams', value: targetPlayer.teams.join(' → ') },
      { label: 'Jersey #', value: `#${targetPlayer.jerseyNumbers}` },
    ];
    // HARD (task #12): hide the easiest leading clues (display-only).
    const start = hard ? Math.min(2, Math.max(0, cluesRevealed - 1)) : 0;
    return all.slice(start, cluesRevealed);
  }, [targetPlayer, cluesRevealed, hard]);

  const makeGuess = useCallback((name: string) => {
    if (gameStatus !== 'playing') return;
    const trimmed = name.trim();
    if (!trimmed) return;

    setGuessHistory(prev => [...prev, trimmed]);

    if (trimmed.toLowerCase() === targetPlayer.name.toLowerCase()) {
      setGameStatus('won');
      if (mode === 'daily') finishDaily('won', cluesRevealed, [...guessHistory, trimmed]);
      toast.success(`🎉 Correct! You scored ${Math.max(1, TOTAL_CLUES + 1 - cluesRevealed)} points!`);
      return;
    }

    toast.error(`❌ Not ${trimmed}`);

    if (cluesRevealed >= TOTAL_CLUES) {
      setGameStatus('lost');
      if (mode === 'daily') finishDaily('lost', cluesRevealed, [...guessHistory, trimmed]);
      toast.error(`The player was ${targetPlayer.name}`);
    } else {
      setCluesRevealed(prev => prev + 1);
    }
  }, [gameStatus, targetPlayer, cluesRevealed, mode, guessHistory, finishDaily]);

  const giveUp = useCallback(() => {
    if (gameStatus !== 'playing') return;
    setGameStatus('lost');
    if (mode === 'daily') finishDaily('lost', cluesRevealed, guessHistory);
  }, [gameStatus, mode, cluesRevealed, guessHistory, finishDaily]);

  const resetGame = useCallback(() => {
    // In unlimited: deal the next random player in place. From the daily:
    // hop into unlimited with a fresh player, no page reload.
    if (mode === 'unlimited') nextUnlimited();
    else switchMode('unlimited');
  }, [mode, nextUnlimited, switchMode]);

  const shareText = useMemo(() => {
    if (gameStatus === 'playing') return '';
    const boxes = Array.from({ length: TOTAL_CLUES }, (_, i) => {
      if (gameStatus === 'won' && i === cluesRevealed - 1) return '🟩';
      if (i < cluesRevealed) return '⬛';
      return '⬜';
    }).join('');
    if (gameStatus === 'won') {
      return `NFL Career Path ${boxes} got it in ${cluesRevealed}!\n\nhttps://douknowball.com/nfl-career`;
    }
    return `NFL Career Path ${boxes} couldn't get it 😞\n\nhttps://douknowball.com/nfl-career`;
  }, [gameStatus, cluesRevealed]);

  const playerNames = useMemo(() => ensureAnswerInOptions(nflCareerPlayers.map(p => p.name), targetPlayer.name), [targetPlayer]);

  // Normalized guesses so far, so the autocomplete can exclude players the
  // user already tried (matching normalizeName's accent/case-insensitive
  // rules used throughout the search layer).
  const excludedNames = useMemo(() => new Set(guessHistory.map(normalizeName)), [guessHistory]);

  useGameCompletion('nfl-career', dailyDone, dailyDone ? dailyFinish.score : 0);

  const toggleHard = useCallback(() => setHard(h => !h), []);

  return {
    mode, switchMode, nextUnlimited,
    hard, toggleHard,
    targetPlayer,
    clues,
    cluesRevealed,
    totalClues: TOTAL_CLUES,
    score,
    gameStatus,
    guessHistory,
    excludedNames,
    makeGuess,
    giveUp,
    resetGame,
    shareText,
    playerNames,
  };
}
