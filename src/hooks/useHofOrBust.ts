import { useState, useCallback, useMemo, useEffect } from 'react';
import { getTodayET } from '@/lib/dateUtils';
import hofPlayers, { type HofPlayer } from '@/data/hofPlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { supabase } from '@/integrations/supabase/client';

function getDateSeed(): number {
  return dateSeedOf(getTodayET());
}

/** The seed a date deals from. Exported for simFreePoints, which walks a year
 *  of dates through the daily draw. */
export function dateSeedOf(d: string): number {
  let hash = 0;
  for (let i = 0; i < d.length; i++) {
    hash = (hash << 5) - hash + d.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export type HofMode = 'daily' | 'unlimited';

export interface HofState {
  player: HofPlayer;
  hintsRevealed: number;
  status: 'voting' | 'revealed';
  userVote: 'hof' | 'bust' | null;
  score: number;
  mode: HofMode;
  communityVotes: { hof: number; bust: number } | null;
  vote: (v: 'hof' | 'bust') => void;
  revealHint: () => void;
  switchToUnlimited: () => void;
  nextPuzzle: () => void;
  unlimitedIndex: number;
}

const STORAGE_PREFIX = 'hof-or-bust-';
const BASE_SCORE = 1000;
const HINT_COST = 100;

function getDailyPlayer(): HofPlayer {
  return dailyHofPlayer(getDateSeed());
}

/**
 * Round 645: the daily player for a seed. A borderline player has no right
 * call, so either vote was scored correct and paid the full 1000: on the six
 * borderline days of every twenty six, any click took the cap. The daily now
 * steps forward to the next player with a verdict, so every other day keeps
 * exactly the player it always dealt. Unlimited still deals everyone, and
 * records nothing.
 */
export function dailyHofPlayer(seed: number): HofPlayer {
  const n = hofPlayers.length;
  for (let k = 0; k < n; k += 1) {
    const p = hofPlayers[(seed + k) % n];
    if (p.verdict !== 'borderline') return p;
  }
  return hofPlayers[seed % n];
}

/** Round 645: one vote's score, the rule the board has always used: the right
 *  call pays the base less the hints bought, a wrong call pays 0, and a
 *  borderline player (which only unlimited deals now) takes either call. */
export function hofVoteScore(player: HofPlayer, v: 'hof' | 'bust', hintsRevealed: number): number {
  const correctVote = player.verdict === 'borderline' ? true : v === (player.verdict === 'hof' ? 'hof' : 'bust');
  return correctVote ? Math.max(0, BASE_SCORE - hintsRevealed * HINT_COST) : 0;
}

function loadDailyState() {
  const today = getTodayET();
  const key = `${STORAGE_PREFIX}daily-${today}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as { userVote: 'hof' | 'bust'; hintsRevealed: number; score: number };
  } catch { /* ignore */ }
  return null;
}

function saveDailyState(userVote: string, hintsRevealed: number, score: number) {
  const today = getTodayET();
  const key = `${STORAGE_PREFIX}daily-${today}`;
  localStorage.setItem(key, JSON.stringify({ userVote, hintsRevealed, score }));
}

export function useHofOrBust(): HofState {
  const dailyPlayer = useMemo(() => getDailyPlayer(), []);
  const saved = useMemo(() => loadDailyState(), []);

  const [mode, setMode] = useState<HofMode>('daily');
  const [unlimitedIndex, setUnlimitedIndex] = useState(0);
  const [hintsRevealed, setHintsRevealed] = useState(saved?.hintsRevealed ?? 0);
  const [userVote, setUserVote] = useState<'hof' | 'bust' | null>(saved?.userVote ?? null);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [communityVotes, setCommunityVotes] = useState<{ hof: number; bust: number } | null>(null);

  const unlimitedPlayer = useMemo(() => {
    const seed = getDateSeed() + unlimitedIndex + 1;
    return hofPlayers[seed % hofPlayers.length];
  }, [unlimitedIndex]);

  const player = mode === 'daily' ? dailyPlayer : unlimitedPlayer;
  const status: 'voting' | 'revealed' = userVote ? 'revealed' : 'voting';
  const isComplete = status === 'revealed';

  useGameCompletion('hof-or-bust', isComplete && mode === 'daily', score, userVote ? 1 : 0);

  // Fetch community votes when revealed
  useEffect(() => {
    if (!isComplete) { setCommunityVotes(null); return; }
    const fetchVotes = async () => {
      try {
        const { data } = await supabase
          .from('hof_votes')
          .select('vote')
          .eq('player_id', player.id);
        if (data) {
          const hof = data.filter(d => d.vote === 'hof').length;
          const bust = data.filter(d => d.vote === 'bust').length;
          setCommunityVotes({ hof, bust });
        }
      } catch { /* silent */ }
    };
    fetchVotes();
  }, [isComplete, player.id]);

  const vote = useCallback((v: 'hof' | 'bust') => {
    if (userVote) return;
    setUserVote(v);

    // Determine score: correct vote = base - hint costs, wrong = 0
    const s = hofVoteScore(player, v, hintsRevealed);
    setScore(s);

    if (mode === 'daily') saveDailyState(v, hintsRevealed, s);

    // Store community vote
    supabase.from('hof_votes').insert({ player_id: player.id, vote: v }).then();
  }, [userVote, player, hintsRevealed, mode]);

  const revealHint = useCallback(() => {
    if (hintsRevealed < player.hints.length && !userVote) {
      setHintsRevealed(h => h + 1);
    }
  }, [hintsRevealed, player.hints.length, userVote]);

  const switchToUnlimited = useCallback(() => {
    setMode('unlimited');
    setHintsRevealed(0);
    setUserVote(null);
    setScore(0);
    setCommunityVotes(null);
    setUnlimitedIndex(0);
  }, []);

  const nextPuzzle = useCallback(() => {
    setUnlimitedIndex(i => i + 1);
    setHintsRevealed(0);
    setUserVote(null);
    setScore(0);
    setCommunityVotes(null);
  }, []);

  return {
    player, hintsRevealed, status, userVote, score, mode,
    communityVotes, vote, revealHint, switchToUnlimited, nextPuzzle, unlimitedIndex,
  };
}
