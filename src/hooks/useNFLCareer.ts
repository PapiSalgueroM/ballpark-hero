import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { getTodayET } from '@/lib/dateUtils';
import { nflCareerPlayers } from '@/data/nflCareerPlayers';
import { NFLCareerPlayer } from '@/types/nflCareer';
import { ensureAnswerInOptions } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { normalizeName } from '@/lib/playerSearch';
import { markRestoredFinish } from '@/lib/restoredFinish';
import { toast } from 'sonner';

const TOTAL_CLUES = 6;

function getDailyIndex(day: string): number {
  // Round 52: seed off the ET calendar like every other daily on the site.
  return parseInt(day.replace(/-/g, ''), 10) % nflCareerPlayers.length;
}

type RoundStatus = 'playing' | 'won' | 'lost';
interface NflRound { status: RoundStatus; cluesRevealed: number; guesses: string[]; requestedClues?: number }
type NflDailySave = (NflRound & { date: string }) & (
  { status: 'playing'; player: string } | { status: 'won' | 'lost' }
);
const DAILY_KEY = 'nfl-career-daily';
const freshRound: NflRound = { status: 'playing', cluesRevealed: 1, guesses: [] };

function parseDailySave(raw: string | null): NflDailySave | null {
  try {
    if (!raw || raw.length > 4096) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.date)
      || !Number.isInteger(s.cluesRevealed) || s.cluesRevealed < 1 || s.cluesRevealed > TOTAL_CLUES
      || !Array.isArray(s.guesses) || s.guesses.length > TOTAL_CLUES
      || !s.guesses.every((name: unknown) => typeof name === 'string' && name.trim().length > 0)) return null;
    const requested = s.requestedClues === undefined ? 0 : s.requestedClues;
    if (!Number.isInteger(requested) || requested < 0 || requested >= s.cluesRevealed) return null;
    if (s.status === 'won' || s.status === 'lost') return s;
    if (s.status !== 'playing' || s.guesses.length + requested !== s.cluesRevealed - 1) return null;
    const player = nflCareerPlayers[getDailyIndex(s.date)];
    const guesses = s.guesses.map(normalizeName);
    return player?.name === s.player && !guesses.includes(normalizeName(player.name))
      && new Set(guesses).size === guesses.length ? s : null;
  } catch { return null; }
}

function loadDailyBytes(): string | null {
  try { return localStorage.getItem(DAILY_KEY); }
  catch { return null; }
}

function persistDaily(date: string, { status, cluesRevealed, guesses, requestedClues }: NflRound): string | null {
  const save = { date, status, cluesRevealed, guesses, ...(requestedClues ? { requestedClues } : {}) };
  const raw = JSON.stringify(status === 'playing' ? { ...save, player: nflCareerPlayers[getDailyIndex(date)].name } : save);
  try { localStorage.setItem(DAILY_KEY, raw); return raw; }
  catch { return null; }
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
  const [initialBytes] = useState(loadDailyBytes);
  const [initialRound] = useState(() => {
    const saved = parseDailySave(initialBytes);
    return saved?.date === dealtDay ? saved : freshRound;
  });
  const dailyRef = useRef({ day: dealtDay, round: initialRound, bytes: initialBytes });
  const [targetPlayer, setTargetPlayer] = useState<NFLCareerPlayer>(() => nflCareerPlayers[getDailyIndex(dealtDay)]);
  const [round, setRound] = useState(initialRound);
  const roundRef = useRef<NflRound>(initialRound);
  const droppingDailyAction = useRef(false);
  const { status: gameStatus, cluesRevealed, guesses: guessHistory } = round;
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
    return initialRound.status === 'playing' ? null : {
      date: dealtDay, score: dailyScoreOf(initialRound.status, initialRound.cluesRevealed),
    };
  });
  const applyRound = useCallback((next: NflRound) => {
    roundRef.current = next;
    setRound(next);
  }, []);
  const [saveWarning, setSaveWarning] = useState(false);
  const saveRound = useCallback((day: string, next: NflRound) => {
    const raw = persistDaily(day, next);
    dailyRef.current = { day, round: next, bytes: raw ?? dailyRef.current.bytes };
    setSaveWarning(raw === null);
  }, []);
  const commitRound = useCallback((next: NflRound) => {
    applyRound(next);
    if (mode !== 'daily') return;
    saveRound(dailyRef.current.day, next);
    if (next.status !== 'playing') setDailyFinish({ date: dealtDay, score: dailyScoreOf(next.status, next.cluesRevealed) });
  }, [applyRound, dealtDay, mode, saveRound]);
  const dailyDone = dailyFinish !== null && dailyFinish.date === dealtDay;

  const openDaily = useCallback((day: string, next: NflRound, bytes: string | null) => {
    if (next.status !== 'playing' && dailyRef.current.round.status === 'playing') {
      markRestoredFinish('nfl-career');
    }
    dailyRef.current = { day, round: next, bytes };
    setDailyFinish(next.status === 'playing' ? null : { date: day, score: dailyScoreOf(next.status, next.cluesRevealed) });
    setDealtDay(day);
    setTargetPlayer(nflCareerPlayers[getDailyIndex(day)]);
    applyRound(next);
  }, [applyRound]);

  const takeNewerDaily = useCallback(() => {
    if (droppingDailyAction.current) return true;
    const raw = loadDailyBytes();
    const current = dailyRef.current;
    if (raw === current.bytes) return false;
    const saved = parseDailySave(raw);
    if (!saved || saved.date < current.day || saved.date > getTodayET()) return false;
    if (saved.date === current.day && saved.status === 'playing'
      && (current.round.status !== 'playing' || saved.cluesRevealed < current.round.cluesRevealed)) return false;
    openDaily(saved.date, saved, raw);
    droppingDailyAction.current = true;
    setSaveWarning(false);
    return true;
  }, [openDaily]);

  useEffect(() => { droppingDailyAction.current = false; }, [round]);

  const retrySave = useCallback(() => {
    if (!saveWarning || mode !== 'daily' || takeNewerDaily()) return;
    const { day, round } = dailyRef.current;
    saveRound(day, round);
  }, [saveWarning, mode, takeNewerDaily, saveRound]);

  useEffect(() => {
    if (mode !== 'daily') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === DAILY_KEY) takeNewerDaily();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [mode, takeNewerDaily]);

  const dealRound = useCallback((player: NFLCareerPlayer) => {
    setTargetPlayer(player);
    applyRound(freshRound);
  }, [applyRound]);

  const randomPlayer = useCallback((excludeName?: string): NFLCareerPlayer => {
    const pool = nflCareerPlayers.filter(p => p.name !== excludeName);
    return pool[Math.floor(Math.random() * pool.length)] ?? nflCareerPlayers[0];
  }, []);

  const switchMode = useCallback((m: NflCareerMode) => {
    setMode(m);
    if (m === 'daily') {
      const day = getTodayET();
      const raw = loadDailyBytes();
      const saved = parseDailySave(raw);
      const current = dailyRef.current;
      const keepCurrent = current.day === day && (raw === current.bytes || saved?.date !== day
        || (saved.status === 'playing' && (current.round.status !== 'playing' || saved.cluesRevealed < current.round.cluesRevealed)));
      openDaily(day, keepCurrent ? current.round : saved?.date === day ? saved : freshRound, raw);
      if (!keepCurrent) setSaveWarning(false);
    } else {
      dealRound(randomPlayer());
    }
  }, [dealRound, randomPlayer, openDaily]);

  /* Round 643: from the daily this is the result screen's "Play Unlimited",
     and it used to deal a random player while staying in daily mode, so
     solving him recorded under the daily again and overwrote today's save
     with his result. It really leaves the daily now. */
  const nextUnlimited = useCallback(() => {
    setMode('unlimited');
    dealRound(randomPlayer(targetPlayer.name));
  }, [dealRound, randomPlayer, targetPlayer]);

  const score = useMemo(() => Math.max(1, TOTAL_CLUES + 1 - cluesRevealed), [cluesRevealed]);

  const { clues, nextClueLabel } = useMemo(() => {
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
    return { clues: all.slice(start, cluesRevealed), nextClueLabel: all[cluesRevealed]?.label };
  }, [targetPlayer, cluesRevealed, hard]);

  const makeGuess = useCallback((name: string) => {
    if (mode === 'daily' && takeNewerDaily()) return;
    const current = roundRef.current;
    if (current !== round || current.status !== 'playing') return;
    const trimmed = name.trim();
    const normalized = normalizeName(trimmed);
    if (!normalized || current.guesses.some(guess => normalizeName(guess) === normalized)) return;
    const guesses = [...current.guesses, trimmed];
    const clues = current.cluesRevealed;
    if (normalized === normalizeName(targetPlayer.name)) {
      commitRound({ ...current, status: 'won', guesses });
      toast.success(`🎉 Correct! You scored ${dailyScoreOf('won', clues)} points!`);
      return;
    }

    toast.error(`❌ Not ${trimmed}`);

    if (clues >= TOTAL_CLUES) {
      commitRound({ ...current, status: 'lost', guesses });
      toast.error(`The player was ${targetPlayer.name}`);
    } else {
      commitRound({ ...current, cluesRevealed: clues + 1, guesses });
    }
  }, [targetPlayer, mode, round, commitRound, takeNewerDaily]);

  const requestClue = useCallback(() => {
    if (mode === 'daily' && takeNewerDaily()) return;
    if (roundRef.current !== round || round.status !== 'playing' || round.cluesRevealed >= TOTAL_CLUES) return;
    commitRound({ ...round, cluesRevealed: round.cluesRevealed + 1, requestedClues: (round.requestedClues ?? 0) + 1 });
  }, [mode, round, commitRound, takeNewerDaily]);

  const giveUp = useCallback(() => {
    if (mode === 'daily' && takeNewerDaily()) return;
    const current = roundRef.current;
    if (current.status !== 'playing') return;
    commitRound({ ...current, status: 'lost' });
  }, [mode, commitRound, takeNewerDaily]);

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
    nextClueLabel,
    cluesRevealed,
    totalClues: TOTAL_CLUES,
    score,
    gameStatus,
    guessHistory,
    saveWarning: mode === 'daily' && saveWarning,
    retrySave,
    excludedNames,
    makeGuess,
    requestClue,
    giveUp,
    resetGame,
    shareText,
    playerNames,
  };
}
