import { useState, useCallback, useMemo, useEffect } from 'react';
import { dailyIndex, getTodayET } from '@/lib/dateUtils';
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

/**
 * Round 646: the most a Hall of Fame or Bust daily can record, a right vote
 * with no hint: BASE_SCORE, 1000 (every hint costs HINT_COST, see
 * hofVoteScore). game_score_caps holds it for hof-or-bust
 * (scripts/simCapsAreCeilings.mjs).
 */
export const HOF_OR_BUST_CEILING = BASE_SCORE;

/**
 * Round 645: the players the daily deals, every one with a verdict. A
 * borderline player has no right call, so either vote was scored correct and
 * paid the full 1000: on the six borderline days of every twenty six, any
 * click took the cap. Unlimited still deals everyone.
 */
const VERDICT_PLAYERS = hofPlayers.filter(p => p.verdict !== 'borderline');

/**
 * Round 645: the daily player for an ET date. The first cut stepped a
 * borderline day forward to the next player in the list, and consecutive
 * dates hash to consecutive seeds, so the step landed on the next day's own
 * player: 79 dailies of 2026 dealt yesterday's player again, today's answer
 * handed to anyone who played yesterday. The daily walks the verdict players
 * with the shared dailyIndex now (src/lib/dateUtils.ts), which shows each of
 * them once per cycle and never the same one two days running, cycle
 * boundaries included. simFreePoints walks a year of dates through this.
 */
export function dailyHofPlayer(date: string): HofPlayer {
  return VERDICT_PLAYERS[dailyIndex(date, VERDICT_PLAYERS.length)];
}

/** The player a saved daily vote was cast on. A save names its player since
 *  Round 645; one without a name was cast before the daily draw changed, on
 *  the player the old draw dealt that date, so it is restored against that
 *  player and never against a new one it was not cast on. */
function savedDailyPlayer(saved: DailySave | null, date: string): HofPlayer | null {
  if (!saved) return null;
  if (saved.playerId) return hofPlayers.find(p => p.id === saved.playerId) ?? null;
  return hofPlayers[dateSeedOf(date) % hofPlayers.length];
}

/** Round 645: one vote's score, the rule the board has always used: the right
 *  call pays the base less the hints bought, a wrong call pays 0, and a
 *  borderline player (which only unlimited deals now) takes either call. */
export function hofVoteScore(player: HofPlayer, v: 'hof' | 'bust', hintsRevealed: number): number {
  const correctVote = player.verdict === 'borderline' ? true : v === (player.verdict === 'hof' ? 'hof' : 'bust');
  return correctVote ? Math.max(0, BASE_SCORE - hintsRevealed * HINT_COST) : 0;
}

interface DailySave {
  userVote: 'hof' | 'bust';
  hintsRevealed: number;
  score: number;
  /** Round 645: the player the vote was cast on. */
  playerId?: string;
}

function loadDailyState(): DailySave | null {
  const today = getTodayET();
  const key = `${STORAGE_PREFIX}daily-${today}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as DailySave;
  } catch { /* ignore */ }
  return null;
}

function saveDailyState(userVote: string, hintsRevealed: number, score: number, playerId: string) {
  const today = getTodayET();
  const key = `${STORAGE_PREFIX}daily-${today}`;
  localStorage.setItem(key, JSON.stringify({ userVote, hintsRevealed, score, playerId }));
}

export function useHofOrBust(): HofState {
  const saved = useMemo(() => loadDailyState(), []);
  const dailyPlayer = useMemo(() => {
    const today = getTodayET();
    return savedDailyPlayer(saved, today) ?? dailyHofPlayer(today);
  }, [saved]);

  const [mode, setMode] = useState<HofMode>('daily');
  const [unlimitedIndex, setUnlimitedIndex] = useState(0);
  const [hintsRevealed, setHintsRevealed] = useState(saved?.hintsRevealed ?? 0);
  const [userVote, setUserVote] = useState<'hof' | 'bust' | null>(saved?.userVote ?? null);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [communityVotes, setCommunityVotes] = useState<{ hof: number; bust: number } | null>(null);

  /* Round 645: unlimited walks everyone but today's daily player, so its
     first card is never the answer to the daily it follows. */
  const unlimitedPlayer = useMemo(() => {
    const others = hofPlayers.filter(p => p.id !== dailyPlayer.id);
    return others[(getDateSeed() + unlimitedIndex) % others.length];
  }, [unlimitedIndex, dailyPlayer]);

  const player = mode === 'daily' ? dailyPlayer : unlimitedPlayer;
  const status: 'voting' | 'revealed' = userVote ? 'revealed' : 'voting';
  const isComplete = status === 'revealed';

  useGameCompletion('hof-or-bust', isComplete, score, userVote ? 1 : 0, mode === 'daily');

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

    if (mode === 'daily') saveDailyState(v, hintsRevealed, s, player.id);

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
