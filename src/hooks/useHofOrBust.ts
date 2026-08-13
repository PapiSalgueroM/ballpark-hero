import { useState, useCallback, useMemo, useEffect } from 'react';
import { getTodayET } from '@/lib/dateUtils';
import hofPlayers, { type HofPlayer } from '@/data/hofPlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { supabase } from '@/integrations/supabase/client';

function getDateSeed(): number {
  const d = getTodayET();
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
  const idx = getDateSeed() % hofPlayers.length;
  return hofPlayers[idx];
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
    const correctVote = player.verdict === 'borderline' ? true : v === (player.verdict === 'hof' ? 'hof' : 'bust');
    const s = correctVote ? Math.max(0, BASE_SCORE - hintsRevealed * HINT_COST) : 0;
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
